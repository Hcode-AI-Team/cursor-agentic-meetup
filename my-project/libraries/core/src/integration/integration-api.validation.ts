import { strict as assert } from 'assert';
import { DomainEventPublisher } from './services/domain-event.publisher';
import { EventSubscriberRegistry } from './services/event-subscriber.registry';
import { InboxService } from './services/inbox.service';
import { IntegrationLinkService } from './services/integration-link.service';
import { LinkType } from './types';

async function validatePublisher(): Promise<void> {
  const createdEvent = {
    id: 'evt-1',
    eventName: 'operations.project.billing_ready',
    sourceModule: 'operations',
    aggregateType: 'project',
    aggregateId: 'prj-1',
    payload: { projectId: 'prj-1' },
    status: 'pending',
    attemptCount: 0,
    lastError: null,
    availableAt: new Date(),
    processedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const outboxService = {
    createEvent: async () => createdEvent,
  };

  let notified = 0;
  const notifier = {
    notifyEventWritten: () => {
      notified += 1;
    },
  };

  const publisher = new DomainEventPublisher(
    outboxService as any,
    notifier as any,
  );

  const result = await publisher.publishEvent({
    eventName: 'operations.project.billing_ready',
    sourceModule: 'operations',
    aggregateType: 'project',
    aggregateId: 'prj-1',
    payload: { projectId: 'prj-1' },
  });

  assert.equal(result.id, 'evt-1');
  assert.equal(notified, 1);
}

async function validateRegistry(): Promise<void> {
  const registry = new EventSubscriberRegistry();

  registry.subscribe(
    'operations.contract.payable_generated',
    'consumer-low',
    async () => undefined,
    1,
  );
  registry.subscribe(
    'operations.contract.payable_generated',
    'consumer-high',
    async () => undefined,
    10,
  );

  const handlers = registry.getHandlers('operations.contract.payable_generated');
  assert.equal(handlers.length, 2);
  const firstHandler = handlers[0];
  assert.ok(firstHandler);
  assert.equal(firstHandler.consumerName, 'consumer-high');
}

async function validateLinks(): Promise<void> {
  const link = {
    id: 'link-1',
    sourceModule: 'operations',
    sourceEntityType: 'project',
    sourceEntityId: 'prj-1',
    targetModule: 'finance',
    targetEntityType: 'payable',
    targetEntityId: 'pay-1',
    linkType: LinkType.REFERENCE,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const prisma = {
    integrationLink: {
      create: async () => link,
      findMany: async () => [link],
    },
  };

  const service = new IntegrationLinkService(prisma as any);
  const created = await service.createLink({
    sourceModule: 'operations',
    sourceEntityType: 'project',
    sourceEntityId: 'prj-1',
    targetModule: 'finance',
    targetEntityType: 'payable',
    targetEntityId: 'pay-1',
    linkType: LinkType.REFERENCE,
  });

  const outbound = await service.findOutbound('operations', 'project', 'prj-1');
  assert.equal(created.id, 'link-1');
  assert.equal(outbound.length, 1);
}

async function validateInboxIdempotency(): Promise<void> {
  const existing = {
    id: 1,
    outbox_event_id: 1,
    consumer_name: 'finance-module',
    status: 'processed',
    attempt_count: 1,
    last_error: null,
    processed_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const prisma = {
    inbox_event: {
      findFirst: async () => existing,
      create: async () => {
        throw new Error('create should not be called for existing inbox item');
      },
    },
  };

  const inbox = new InboxService(prisma as any);
  const result = await inbox.getOrCreate('1', 'finance-module');
  assert.equal(result.id, '1');
}

async function main(): Promise<void> {
  await validatePublisher();
  await validateRegistry();
  await validateLinks();
  await validateInboxIdempotency();
  // eslint-disable-next-line no-console
  console.log('Integration API validation passed');
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Integration API validation failed', error);
  process.exit(1);
});
