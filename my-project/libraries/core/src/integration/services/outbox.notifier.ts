import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

/**
 * In-memory notifier for signaling new outbox events
 * Provides immediate wakeup to the processor without database polling
 * NOT the source of truth; database outbox is the authoritative queue
 */
@Injectable()
export class OutboxNotifier {
  private readonly emitter = new EventEmitter();
  private readonly EVENT_WRITTEN = 'outbox:event:written';

  /**
   * Subscribe to outbox event notifications
   */
  subscribe(listener: () => void): void {
    this.emitter.on(this.EVENT_WRITTEN, listener);
  }

  /**
   * Unsubscribe from outbox event notifications
   */
  unsubscribe(listener: () => void): void {
    this.emitter.removeListener(this.EVENT_WRITTEN, listener);
  }

  /**
   * Emit notification that a new event was written to outbox
   */
  notifyEventWritten(): void {
    this.emitter.emit(this.EVENT_WRITTEN);
  }

  /**
   * Get current number of subscribers
   */
  getSubscriberCount(): number {
    return this.emitter.listenerCount(this.EVENT_WRITTEN);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.emitter.removeAllListeners(this.EVENT_WRITTEN);
  }
}
