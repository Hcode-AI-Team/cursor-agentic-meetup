import { Injectable, Logger } from '@nestjs/common';
import { InboxEventStatus, OutboxEventStatus } from '../types';
import { EventSubscriberRegistry } from './event-subscriber.registry';
import { InboxService } from './inbox.service';
import { IntegrationLinkService } from './integration-link.service';
import { IntegrationSettingsService } from './integration-settings.service';
import { OutboxService } from './outbox.service';

@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(
    private readonly outboxService: OutboxService,
    private readonly inboxService: InboxService,
    private readonly linkService: IntegrationLinkService,
    private readonly registry: EventSubscriberRegistry,
    private readonly integrationSettingsService: IntegrationSettingsService,
  ) {}

  /**
   * Process a batch of pending events
   * Called in a loop or by scheduled job
   */
  async processBatch(options?: { batchSizeOverride?: number }): Promise<number> {
    const settings = await this.integrationSettingsService.getRuntimeSettings();
    const batchSize = options?.batchSizeOverride ?? settings.batchSize;
    const leaseMs = settings.processingLeaseMs;

    // Atomically claim pending events — prevents duplicate processing across replicas
    const events = await this.outboxService.findPendingAndLock(batchSize, leaseMs);

    if (events.length === 0) {
      return 0;
    }

    this.logger.debug(
      `[outbox:batch] processing ${events.length} event(s): ${events.map((e) => `${e.id}(${e.eventName})`).join(', ')}`,
    );

    let processedCount = 0;

    for (const event of events) {
      try {
        // Get handlers for this event
        const handlers = this.registry.getHandlers(event.eventName);

        if (handlers.length === 0) {
          this.logger.warn(
            `[outbox:batch] no handlers registered for eventName=${event.eventName} eventId=${event.id} — marking as processed and skipping`,
          );
          // Mark as processed even though no handlers
          await this.outboxService.updateStatus(
            event.id,
            OutboxEventStatus.PROCESSED,
            {
              processedAt: new Date(),
            },
          );
          processedCount++;
          continue;
        }

        // Execute each handler
        let anyFailed = false;
        for (const handlerDef of handlers) {
          const inboxEvent = await this.inboxService.getOrCreate(
            event.id,
            handlerDef.consumerName,
          );

          // Skip if already processed
          if (inboxEvent.status === InboxEventStatus.PROCESSED) {
            this.logger.debug(
              `Event ${event.id} already processed by ${handlerDef.consumerName}`,
            );
            continue;
          }

          await this.inboxService.markProcessing(inboxEvent.id);

          this.logger.debug(
            `[outbox:batch] running handler=${handlerDef.consumerName} eventId=${event.id}`,
          );

          try {
            // Execute handler
            await handlerDef.handler(
              {
                outboxEventId: event.id,
                eventName: event.eventName,
                sourceModule: event.sourceModule,
                aggregateType: event.aggregateType,
                aggregateId: event.aggregateId,
                payload: event.payload,
                timestamp: event.createdAt,
              },
              {
                logger: this.logger,
                inboxService: this.inboxService,
                linkService: this.linkService,
              },
            );

            // Mark as processed
            await this.inboxService.markProcessed(inboxEvent.id);
            this.logger.debug(
              `Handler ${handlerDef.consumerName} processed event ${event.id}`,
            );
          } catch (error) {
            anyFailed = true;
            this.logger.error(
              `[outbox:batch] handler=${handlerDef.consumerName} failed for eventId=${event.id}: ${error instanceof Error ? error.message : String(error)}`,
              error,
            );
            await this.inboxService.markFailed(
              inboxEvent.id,
              error instanceof Error ? error.message : String(error),
            );
          }
        }

        // Update outbox event status based on handler results
        if (!anyFailed) {
          await this.outboxService.updateStatus(
            event.id,
            OutboxEventStatus.PROCESSED,
            {
              processedAt: new Date(),
            },
          );
          processedCount++;
        } else {
          // At least one handler failed, retry logic applies
          await this.handleEventFailure(event.id);
        }
      } catch (error) {
        this.logger.error(`Error processing event ${event.id}:`, error);
        await this.handleEventFailure(event.id);
      }
    }

    return processedCount;
  }

  /**
   * Handle event that failed to process
   */
  private async handleEventFailure(eventId: string): Promise<void> {
    const settings = await this.integrationSettingsService.getRuntimeSettings();
    const maxAttempts = settings.maxAttempts;
    const retryBaseDelayMs = settings.retryBaseDelayMs;
    const deadLetterEnabled = settings.deadLetterEnabled;

    const event = await this.outboxService.getById(eventId);
    if (!event) {
      return;
    }

    const nextAttemptCount = event.attemptCount + 1;

    if (nextAttemptCount >= maxAttempts) {
      if (deadLetterEnabled) {
        this.logger.warn(
          `Event ${eventId} moved to dead letter after ${maxAttempts} attempts`,
        );
        await this.outboxService.updateStatus(
          eventId,
          OutboxEventStatus.DEAD_LETTER,
          {
            attemptCount: nextAttemptCount,
          },
        );
      } else {
        this.logger.warn(
          `Event ${eventId} failed after ${maxAttempts} attempts (dead letter disabled)`,
        );
        await this.outboxService.updateStatus(
          eventId,
          OutboxEventStatus.FAILED,
          {
            attemptCount: nextAttemptCount,
          },
        );
      }
    } else {
      // Calculate exponential backoff
      const delayMs = retryBaseDelayMs * Math.pow(2, event.attemptCount);
      const availableAt = new Date(Date.now() + delayMs);

      this.logger.debug(
        `Retrying event ${eventId} in ${delayMs}ms (attempt ${nextAttemptCount}/${maxAttempts})`,
      );

      await this.outboxService.updateStatus(
        eventId,
        OutboxEventStatus.PENDING,
        {
          attemptCount: nextAttemptCount,
          availableAt,
        },
      );
    }
  }

  /**
   * Process all pending events at startup (drain)
   */
  async startupDrain(): Promise<number> {
    const settings = await this.integrationSettingsService.getRuntimeSettings();
    const drainBatchSize = settings.startupDrainBatchSize;

    this.logger.log(`Starting outbox drain with batch size: ${drainBatchSize}`);

    let totalProcessed = 0;

    // Keep processing until no more events
    let processed = 1;
    while (processed > 0) {
      processed = await this.processBatch({
        batchSizeOverride: drainBatchSize,
      });
      totalProcessed += processed;

      // Small delay to prevent overwhelming the system
      if (processed > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    this.logger.log(`Startup drain completed. Processed ${totalProcessed} events`);
    return totalProcessed;
  }

  /**
   * Get processor statistics
   */
  async getStats() {
    const pendingCount = await this.outboxService.countByStatus(
      OutboxEventStatus.PENDING,
    );
    const processingCount = await this.outboxService.countByStatus(
      OutboxEventStatus.PROCESSING,
    );
    const processedCount = await this.outboxService.countByStatus(
      OutboxEventStatus.PROCESSED,
    );
    const failedCount = await this.outboxService.countByStatus(
      OutboxEventStatus.FAILED,
    );
    const deadLetterCount = await this.outboxService.countByStatus(
      OutboxEventStatus.DEAD_LETTER,
    );

    return {
      pending: pendingCount,
      processing: processingCount,
      processed: processedCount,
      failed: failedCount,
      dead_letter: deadLetterCount,
      total:
        pendingCount +
        processingCount +
        processedCount +
        failedCount +
        deadLetterCount,
      handlerCount: this.registry.getHandlerCount(),
    };
  }
}
