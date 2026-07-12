import { Injectable } from '@nestjs/common';
import { DomainEvent, OutboxEvent } from '../types';
import { OutboxNotifier } from './outbox.notifier';
import { OutboxEventPersistenceClient, OutboxService } from './outbox.service';

export interface PublishDomainEventInput {
  eventName: string;
  sourceModule: string;
  aggregateType: string;
  aggregateId: string;
  payload?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface PublishDomainEventOptions {
  persistenceClient?: OutboxEventPersistenceClient;
}

@Injectable()
export class DomainEventPublisher {
  constructor(
    private readonly outboxService: OutboxService,
    private readonly outboxNotifier: OutboxNotifier,
  ) {}

  /**
   * Publish a domain event
   * Writes to durable outbox and notifies processor for immediate wakeup
   */
  async publishEvent(
    input: PublishDomainEventInput,
    options?: PublishDomainEventOptions,
  ): Promise<OutboxEvent>;

  async publishEvent(
    eventName: string,
    sourceModule: string,
    aggregateType: string,
    aggregateId: string,
    payload?: Record<string, any>,
    metadata?: Record<string, any>,
    options?: PublishDomainEventOptions,
  ): Promise<OutboxEvent>;

  async publishEvent(
    eventOrName: PublishDomainEventInput | string,
    sourceModuleOrOptions?: string | PublishDomainEventOptions,
    aggregateType?: string,
    aggregateId?: string,
    payload?: Record<string, any>,
    metadata?: Record<string, any>,
    options?: PublishDomainEventOptions,
  ): Promise<OutboxEvent> {
    const payloadData = payload || {};
    const input =
      typeof eventOrName === 'string'
        ? {
            eventName: eventOrName,
            sourceModule: sourceModuleOrOptions as string,
            aggregateType: aggregateType as string,
            aggregateId: aggregateId as string,
            payload: payloadData,
            metadata,
          }
        : eventOrName;

    const publishOptions =
      typeof eventOrName === 'string'
        ? options
        : (sourceModuleOrOptions as PublishDomainEventOptions | undefined);

    const persistedPayload = this.enrichPayloadWithMetadata(
      input.payload || {},
      input.metadata,
    );

    // Write to outbox (durable, authoritative)
    const outboxEvent = await this.outboxService.createEvent(
      {
        eventName: input.eventName,
        sourceModule: input.sourceModule,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        payload: persistedPayload,
      },
      publishOptions?.persistenceClient,
    );

    // Notify processor for immediate wakeup (best-effort, not guaranteed)
    this.outboxNotifier.notifyEventWritten();

    return outboxEvent;
  }

  /**
   * Publish multiple events in sequence
   */
  async publishEvents(
    events: Array<DomainEvent | PublishDomainEventInput>,
    options?: PublishDomainEventOptions,
  ): Promise<OutboxEvent[]> {
    const published: OutboxEvent[] = [];

    for (const event of events) {
      published.push(
        await this.publishEvent(
          {
            eventName: event.eventName,
            sourceModule: event.sourceModule,
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            payload: event.payload,
            metadata: (event as PublishDomainEventInput).metadata,
          },
          options,
        ),
      );
    }

    return published;
  }

  private enrichPayloadWithMetadata(
    payload: Record<string, any>,
    metadata?: Record<string, any>,
  ): Record<string, any> {
    if (!metadata) {
      return payload;
    }

    return {
      ...payload,
      _integrationMeta: metadata,
    };
  }
}
