# Core Integration Module

Learn more about the HedHog Framework at **[hedhog.com](https://hedhog.com)**.

A reusable, event-driven cross-module integration foundation for the HedHog platform.

## Overview

The **integration** module provides:

- **Durable Outbox**: Database-backed event queue with automatic retry and exponential backoff
- **Idempotent Inbox**: Per-consumer tracking ensures handlers never process the same event twice
- **Entity Integration Links**: Generic mappings between entities across different modules
- **Event Subscriber Registry**: Global registry for modules to register event handlers
- **Settings-Driven Configuration**: All timeouts, retry logic, and batch sizes configurable via SettingService
- **Hybrid Processing Strategy**: Database as source of truth + in-memory notifier for immediate wakeup

## Architecture

```
Module A (Finance) → publishEvent() → DomainEventPublisher
                                            ↓
                                      OutboxService (write to DB)
                                            ↓
                                      OutboxNotifier (wake up processor)
                                            ↓
                                      OutboxProcessorJob (hybrid loop)
                                            ↓
                    ┌───────────────────────────────────────────┐
                    ↓                                           ↓
             Fetch pending events              ExecuteHandlers
                    ↓                                           ↓
             Lock with lease time        Get handlers from registry
                    ↓                                           ↓
          Mark as processing         For each registered handler:
                    ↓                                           ↓
         Track inbox per consumer    1. Get/create InboxEvent
                    ↓                2. Mark as processing
          Execute handler code        3. Call handler function
                    ↓                4. Mark as processed (or failed)
         Handle failures:             5. Create IntegrationLinks
      - Retry with backoff               (as side effects)
      - Dead letter after max
      - Update outbox status

Module B (Operations) ← Subscribes via registry, receives events, creates links
```

## Database Schema

### `outbox_event` Table

Stores domain events for cross-module integration.

```sql
CREATE TABLE outbox_event (
  id UUID PRIMARY KEY,
  event_name VARCHAR(255) NOT NULL,
  source_module VARCHAR(127) NOT NULL,
  aggregate_type VARCHAR(127) NOT NULL,
  aggregate_id VARCHAR(36) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(63) NOT NULL, -- pending | processing | processed | failed | dead_letter
  attempt_count INT DEFAULT 0,
  last_error VARCHAR(1023),
  available_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for efficient polling
CREATE INDEX idx_outbox_event_status_available_at 
  ON outbox_event(status, available_at);
CREATE INDEX idx_outbox_event_source 
  ON outbox_event(source_module, aggregate_type, aggregate_id);
CREATE INDEX idx_outbox_event_created_at 
  ON outbox_event(created_at);
```

### `inbox_event` Table

Per-consumer idempotency tracking to ensure exactly-once processing semantics.

```sql
CREATE TABLE inbox_event (
  id UUID PRIMARY KEY,
  outbox_event_id UUID NOT NULL REFERENCES outbox_event(id) ON DELETE CASCADE,
  consumer_name VARCHAR(255) NOT NULL,
  status VARCHAR(63) NOT NULL, -- received | processing | processed | failed | skipped
  attempt_count INT DEFAULT 0,
  last_error VARCHAR(1023),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Unique constraint ensures idempotency
CREATE UNIQUE INDEX idx_inbox_event_idempotency 
  ON inbox_event(outbox_event_id, consumer_name);
CREATE INDEX idx_inbox_event_status 
  ON inbox_event(status);
```

### `integration_link` Table

Generic mappings between entities across modules (no direct foreign keys).

```sql
CREATE TABLE integration_link (
  id UUID PRIMARY KEY,
  source_module VARCHAR(127) NOT NULL,
  source_entity_type VARCHAR(127) NOT NULL,
  source_entity_id VARCHAR(36) NOT NULL,
  target_module VARCHAR(127) NOT NULL,
  target_entity_type VARCHAR(127) NOT NULL,
  target_entity_id VARCHAR(36) NOT NULL,
  link_type VARCHAR(63) NOT NULL, -- reference | cascade | aggregate_root
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Efficient lookups
CREATE INDEX idx_integration_link_source 
  ON integration_link(source_module, source_entity_type, source_entity_id);
CREATE INDEX idx_integration_link_target 
  ON integration_link(target_module, target_entity_type, target_entity_id);
CREATE INDEX idx_integration_link_type 
  ON integration_link(link_type);
```

## Core Services

### `DomainEventPublisher`

Entry point for modules to publish events.

```typescript
@Injectable()
export class DomainEventPublisher {
  async publishEvent(
    eventName: string,
    sourceModule: string,
    aggregateType: string,
    aggregateId: string,
    payload?: Record<string, any>,
  ): Promise<void>
  
  async publishEvents(events: DomainEvent[]): Promise<void>
}
```

**Usage:**
```typescript
@Injectable()
export class InvoiceService {
  constructor(
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async createInvoice(data: any): Promise<Invoice> {
    const invoice = await this.prisma.invoice.create({ data });
    
    await this.eventPublisher.publishEvent(
      'invoice.created',
      'finance',
      'Invoice',
      invoice.id,
      { amount: invoice.amount },
    );
    
    return invoice;
  }
}
```

### `IntegrationDeveloperApiService`

Single developer-facing facade for publishing events, subscribing handlers, and managing links.

```typescript
@Injectable()
export class OperationsBillingIntegration {
  constructor(private readonly integrationApi: IntegrationDeveloperApiService) {}

  async publishProjectReady(projectId: string): Promise<void> {
    await this.integrationApi.publishEvent({
      eventName: 'operations.project.billing_ready',
      sourceModule: 'operations',
      aggregateType: 'project',
      aggregateId: projectId,
      payload: { projectId },
      metadata: { producer: 'operations' },
    });
  }

  onModuleInit(): void {
    this.integrationApi.subscribe({
      eventName: 'operations.contract.payable_generated',
      consumerName: 'operations-finance-handler',
      priority: 10,
      handler: async (event, context) => {
        context.logger.log(`Received ${event.eventName} for ${event.aggregateId}`);
      },
    });
  }
}
```

### `EventSubscriberRegistry`

Global registry for handler registration.

```typescript
@Injectable()
export class EventSubscriberRegistry {
  registerHandler(definition: SubscriberDefinition): void
  getHandlers(eventName: string): SubscriberDefinition[]
  hasHandlers(eventName: string): boolean
  getEventNames(): string[]
  getHandlerCount(): number
  clear(): void
}
```

**Usage:**
```typescript
@Injectable()
export class OperationsEventHandlers implements OnModuleInit {
  constructor(private readonly registry: EventSubscriberRegistry) {}

  onModuleInit(): void {
    this.registry.registerHandler({
      eventName: 'invoice.created',
      consumerName: 'operations-module',
      priority: 10,
      handler: async (event, context) => {
        // Handle event
      },
    });
  }
}
```

### `InboxService`

Tracks per-consumer processing for idempotency.

```typescript
@Injectable()
export class InboxService {
  async getOrCreate(
    outboxEventId: string,
    consumerName: string,
  ): Promise<InboxEvent>
  
  async markProcessing(inboxEventId: string): Promise<InboxEvent>
  async markProcessed(inboxEventId: string): Promise<InboxEvent>
  async markFailed(inboxEventId: string, error: string): Promise<InboxEvent>
  async markSkipped(inboxEventId: string): Promise<InboxEvent>
  async isProcessed(
    outboxEventId: string,
    consumerName: string,
  ): Promise<boolean>
}
```

### `IntegrationLinkService`

Create and query cross-module entity relationships.

```typescript
@Injectable()
export class IntegrationLinkService {
  async createLink(dto: CreateIntegrationLinkDto): Promise<IntegrationLink>
  async findOutbound(
    sourceModule: string,
    sourceEntityType: string,
    sourceEntityId: string,
  ): Promise<IntegrationLink[]>
  async findInbound(
    targetModule: string,
    targetEntityType: string,
    targetEntityId: string,
  ): Promise<IntegrationLink[]>
  async findByLinkType(linkType: LinkType): Promise<IntegrationLink[]>
  async findBidirectional(...): Promise<IntegrationLink | null>
}
```

The facade `IntegrationDeveloperApiService` also provides link methods:

- `createLink(dto, persistenceClient?)`
- `findLinksBySource({ module, entityType, entityId })`
- `findLinksByTarget({ module, entityType, entityId })`
- `findLinksByType(linkType)`

### `OutboxProcessor`

Processes pending events, executes handlers, and manages retries.

```typescript
@Injectable()
export class OutboxProcessor {
  async processBatch(): Promise<number>          // Process one batch
  async startupDrain(): Promise<number>          // Drain on startup
  async getStats(): Promise<ProcessorStats>
}
```

## Settings Configuration

All integration settings are registered in `setting_group.yaml` under the `integration` group:

| Setting Key | Type | Default | Purpose |
|---|---|---|---|
| `core.integration.outbox.enabled` | boolean | `true` | Enable/disable outbox system |
| `core.integration.outbox.processor.enabled` | boolean | `true` | Enable/disable processor job |
| `core.integration.outbox.startupDrainEnabled` | boolean | `true` | Run drain on startup |
| `core.integration.outbox.pollingIntervalMs` | number | `5000` | Poll interval when processing |
| `core.integration.outbox.idlePollingIntervalMs` | number | `30000` | Poll interval when idle |
| `core.integration.outbox.batchSize` | number | `10` | Events per batch |
| `core.integration.outbox.maxAttempts` | number | `3` | Retry attempts |
| `core.integration.outbox.processingLeaseMs` | number | `30000` | Lock duration |
| `core.integration.outbox.retryBaseDelayMs` | number | `1000` | Base delay for backoff |
| `core.integration.outbox.deadLetterEnabled` | boolean | `true` | Move failed events to dead letter |
| `core.integration.outbox.startupDrainBatchSize` | number | `50` | Batch size for startup drain |

## Event Handler Contract

```typescript
export type EventHandler = (
  event: DomainEvent,
  context: SubscriberContext,
) => Promise<void>

export interface DomainEvent {
  eventName: string
  sourceModule: string
  aggregateType: string
  aggregateId: string
  payload: Record<string, any>
  timestamp: Date
}

export interface SubscriberContext {
  logger: Logger                  // NestJS Logger
  inboxService: InboxService      // Mark as processed/failed
  linkService: IntegrationLinkService  // Create links
}
```

## Failure Handling & Retry Logic

1. Handler executes; if exception thrown → marked as failed
2. Exponential backoff: delay = `retryBaseDelayMs` × 2^(attemptCount)
3. After `maxAttempts`, event moves to `dead_letter` status
4. Processing lease prevents stuck events: if not updated within `processingLeaseMs`, available for reprocessing
5. Startup drain recovers all pending events on app restart

## Idempotency

The inbox table with unique constraint on `(outboxEventId, consumerName)` ensures:

- Same handler never processes same event twice
- Crashes during processing don't cause duplicates
- Replay is safe (read-only handlers preferred)

**Important**: Applications must still make handlers idempotent in logic:
- Operations should be repeatable without side effects
- Or: check for existence before creating
- Or: use database-level constraints (unique, upsert)

## Performance Considerations

- **Polling Interval**: Tune based on event volume and latency requirements
- **Batch Size**: Larger batches reduce DB queries but block longer
- **Processing Lease**: Must exceed typical handler execution time
- **Dead Letter Threshold**: Balance between retries and operational alerts
- **Indexes**: Already defined for common query patterns

## Testing

See [USAGE_EXAMPLE.md](./USAGE_EXAMPLE.md) for examples of how to:
- Publish events from one module
- Register handlers in another module
- Query integration links
- Test idempotency

## Future Enhancements

- Event schema registry and versioning
- Distributed tracing / correlation IDs
- Event replay / time-travel features
- Saga orchestration (choreography → orchestration)
- Webhook / external event ingestion
- Dead letter queue UI dashboard
- Metrics and observability
