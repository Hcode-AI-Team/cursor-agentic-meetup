/**
 * Event status throughout the integration lifecycle
 */
export enum OutboxEventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  DEAD_LETTER = 'dead_letter',
}

/**
 * Inbox event processing status per consumer
 */
export enum InboxEventStatus {
  RECEIVED = 'received',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

/**
 * Type of link between entities from different modules
 */
export enum LinkType {
  REFERENCE = 'reference',
  CASCADE = 'cascade',
  AGGREGATE_ROOT = 'aggregate_root',
}

/**
 * Domain event interface that is published and processed
 */
export interface DomainEvent {
  outboxEventId?: string;
  eventName: string;
  sourceModule: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, any>;
  timestamp: Date;
}

/**
 * Outbox event record from database
 */
export interface OutboxEvent {
  id: string;
  eventName: string;
  sourceModule: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, any>;
  status: OutboxEventStatus;
  attemptCount: number;
  lastError: string | null;
  availableAt: Date;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Inbox event record from database for idempotency tracking
 */
export interface InboxEvent {
  id: string;
  outboxEventId: string;
  consumerName: string;
  status: InboxEventStatus;
  attemptCount: number;
  lastError: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Integration link between entities across modules
 */
export interface IntegrationLink {
  id: string;
  sourceModule: string;
  sourceEntityType: string;
  sourceEntityId: string;
  targetModule: string;
  targetEntityType: string;
  targetEntityId: string;
  linkType: LinkType;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}
