import { Injectable } from '@nestjs/common';
import {
    DomainEvent,
    EventHandler,
    IntegrationLink,
    LinkType,
    OutboxEvent,
    SubscriberDefinition,
} from '../types';
import {
    DomainEventPublisher,
    PublishDomainEventInput,
    PublishDomainEventOptions,
} from './domain-event.publisher';
import { EventSubscriberRegistry } from './event-subscriber.registry';
import {
    CreateIntegrationLinkDto,
    IntegrationLinkPersistenceClient,
    IntegrationLinkService,
} from './integration-link.service';

export interface IntegrationSubscriptionInput {
  eventName: string;
  consumerName: string;
  handler: EventHandler;
  priority?: number;
}

export interface IntegrationLinkQuery {
  module: string;
  entityType: string;
  entityId: string;
}

@Injectable()
export class IntegrationDeveloperApiService {
  constructor(
    private readonly publisher: DomainEventPublisher,
    private readonly subscriberRegistry: EventSubscriberRegistry,
    private readonly linkService: IntegrationLinkService,
  ) {}

  async publishEvent(
    input: PublishDomainEventInput,
    options?: PublishDomainEventOptions,
  ): Promise<OutboxEvent> {
    return this.publisher.publishEvent(input, options);
  }

  async publishEvents(
    events: Array<DomainEvent | PublishDomainEventInput>,
    options?: PublishDomainEventOptions,
  ): Promise<OutboxEvent[]> {
    return this.publisher.publishEvents(events, options);
  }

  subscribe(input: IntegrationSubscriptionInput): void {
    this.subscriberRegistry.subscribe(
      input.eventName,
      input.consumerName,
      input.handler,
      input.priority || 0,
    );
  }

  subscribeMany(definitions: SubscriberDefinition[]): void {
    this.subscriberRegistry.subscribeMany(definitions);
  }

  async createLink(
    dto: CreateIntegrationLinkDto,
    persistenceClient?: IntegrationLinkPersistenceClient,
  ): Promise<IntegrationLink> {
    return this.linkService.createLink(dto, persistenceClient);
  }

  async findLinksBySource(query: IntegrationLinkQuery): Promise<IntegrationLink[]> {
    return this.linkService.findOutbound(
      query.module,
      query.entityType,
      query.entityId,
    );
  }

  async findLinksByTarget(query: IntegrationLinkQuery): Promise<IntegrationLink[]> {
    return this.linkService.findInbound(
      query.module,
      query.entityType,
      query.entityId,
    );
  }

  async findLinksByType(linkType: LinkType): Promise<IntegrationLink[]> {
    return this.linkService.findByLinkType(linkType);
  }
}
