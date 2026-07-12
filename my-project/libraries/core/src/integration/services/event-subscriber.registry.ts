import { Injectable } from '@nestjs/common';
import { EventHandler, SubscriberDefinition } from '../types';

@Injectable()
export class EventSubscriberRegistry {
  private readonly subscribers = new Map<string, SubscriberDefinition[]>();

  /**
   * Register a subscriber for an event
   */
  registerHandler(definition: SubscriberDefinition): void {
    const { eventName } = definition;

    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, []);
    }

    this.subscribers.get(eventName)!.push(definition);

    // Sort by priority (higher priority first)
    const handlers = this.subscribers.get(eventName)!;
    handlers.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Ergonomic registration for module services.
   */
  subscribe(
    eventName: string,
    consumerName: string,
    handler: EventHandler,
    priority = 0,
  ): void {
    this.registerHandler({
      eventName,
      consumerName,
      handler,
      priority,
    });
  }

  /**
   * Register multiple handlers in one call.
   */
  subscribeMany(definitions: SubscriberDefinition[]): void {
    for (const definition of definitions) {
      this.registerHandler(definition);
    }
  }

  /**
   * Get all handlers for an event, sorted by priority
   */
  getHandlers(eventName: string): SubscriberDefinition[] {
    return this.subscribers.get(eventName) || [];
  }

  /**
   * Check if event has any handlers
   */
  hasHandlers(eventName: string): boolean {
    return this.subscribers.has(eventName) && this.subscribers.get(eventName)!.length > 0;
  }

  /**
   * Get all registered event names
   */
  getEventNames(): string[] {
    return Array.from(this.subscribers.keys());
  }

  /**
   * Get total count of all registered handlers
   */
  getHandlerCount(): number {
    let count = 0;
    for (const handlers of this.subscribers.values()) {
      count += handlers.length;
    }
    return count;
  }

  /**
   * Remove all handlers whose consumerName starts with the given prefix.
   * Used to clean up subscriptions for a specific agent before re-registering.
   */
  removeByConsumerPrefix(prefix: string): void {
    for (const [eventName, handlers] of this.subscribers.entries()) {
      const filtered = handlers.filter((h) => !h.consumerName.startsWith(prefix));
      if (filtered.length === 0) {
        this.subscribers.delete(eventName);
      } else {
        this.subscribers.set(eventName, filtered);
      }
    }
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clear(): void {
    this.subscribers.clear();
  }
}
