import { Logger } from '@nestjs/common';
import { DomainEvent } from './event.types';

/**
 * Context passed to event handlers
 */
export interface SubscriberContext {
  logger: Logger;
  inboxService: any; // To be injected at runtime
  linkService: any; // To be injected at runtime
}

/**
 * Event handler function signature
 */
export type EventHandler = (
  event: DomainEvent,
  context: SubscriberContext,
) => Promise<void>;

/**
 * Event subscriber definition
 */
export interface SubscriberDefinition {
  eventName: string;
  consumerName: string;
  priority?: number;
  handler: EventHandler;
}

/**
 * Subscription registry entry
 */
export interface SubscriptionEntry {
  definition: SubscriberDefinition;
  handler: EventHandler;
}
