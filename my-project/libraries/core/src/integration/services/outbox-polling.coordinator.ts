import { Injectable, Logger } from '@nestjs/common';
import { IntegrationSettingsService } from './integration-settings.service';
import { OutboxNotifier } from './outbox.notifier';
import { OutboxProcessor } from './outbox.processor';

/**
 * Hybrid polling coordinator
 * Manages the adaptive polling strategy: immediate reactions + periodic checks
 * Uses in-memory notifications for immediate wakeup + configurable polling intervals
 */
@Injectable()
export class OutboxPollingCoordinator {
  private readonly logger = new Logger(OutboxPollingCoordinator.name);
  private processingLoopRunning = false;
  private processingLoopPromise: Promise<void> | null = null;
  private immediateWakeupTriggered = false;
  private shouldStopLoop = false;
  private _currentTimeout: ReturnType<typeof setTimeout> | null = null;
  private _resolveDelay: (() => void) | null = null;

  constructor(
    private readonly processor: OutboxProcessor,
    private readonly notifier: OutboxNotifier,
    private readonly integrationSettingsService: IntegrationSettingsService,
  ) {}

  /**
   * Start the hybrid processing loop
   * Reacts to notifications immediately, polls periodically
   */
  async startProcessingLoop(): Promise<void> {
    if (this.processingLoopRunning) {
      this.logger.warn('Processing loop already running');
      return;
    }

    this.processingLoopRunning = true;
    this.shouldStopLoop = false;
    this.logger.log('Starting outbox hybrid processing loop');

    this.processingLoopPromise = this.runProcessingLoop();
  }

  /**
   * Stop the processing loop gracefully
   */
  async stopProcessingLoop(): Promise<void> {
    if (!this.processingLoopRunning) {
      return;
    }

    this.logger.log('Stopping outbox processing loop');
    this.shouldStopLoop = true;

    if (this.processingLoopPromise) {
      await this.processingLoopPromise;
    }

    this.processingLoopRunning = false;
  }

  /**
   * Trigger immediate processing from notifier
   */
  triggerImmediateProcessing(): void {
    this.immediateWakeupTriggered = true;
    if (this._currentTimeout !== null) {
      clearTimeout(this._currentTimeout);
      this._currentTimeout = null;
      this.logger.debug('[outbox:wakeup] delay interrupted by new event notification');
    }
    if (this._resolveDelay) {
      this._resolveDelay();
      this._resolveDelay = null;
    }
  }

  /**
   * Check if loop is currently running
   */
  isRunning(): boolean {
    return this.processingLoopRunning;
  }

  /**
   * Main processing loop - runs continuously
   */
  private async runProcessingLoop(): Promise<void> {
    // Subscribe to notifications
    const immediateWakeupListener = () => {
      this.triggerImmediateProcessing();
    };
    this.notifier.subscribe(immediateWakeupListener);

    try {
      while (!this.shouldStopLoop) {
        const settings = await this.integrationSettingsService.getRuntimeSettings();
        const isEnabled = settings.outboxEnabled;
        const processorEnabled = settings.outboxProcessorEnabled;

        if (!isEnabled || !processorEnabled) {
          this.logger.debug(
            `[outbox:loop] processor disabled (outboxEnabled=${isEnabled} processorEnabled=${processorEnabled}), sleeping ${settings.idlePollingIntervalMs}ms`,
          );
          await this.delay(settings.idlePollingIntervalMs);
          continue;
        }

        // Check if we should process immediately (woken by notification)
        const shouldProcessImmediately = this.immediateWakeupTriggered;
        this.immediateWakeupTriggered = false;

        // Process batch
        const processedCount = await this.processor.processBatch();

        // Determine next polling interval
        let nextDelayMs: number;

        if (shouldProcessImmediately && processedCount > 0) {
          // We processed items from immediate wakeup - use active polling interval
          nextDelayMs = settings.pollingIntervalMs;
          this.logger.debug(
            `Processed ${processedCount} events from immediate wakeup, next poll in ${nextDelayMs}ms`,
          );
        } else if (processedCount > 0) {
          // Processed items from periodic polling - use active interval
          nextDelayMs = settings.pollingIntervalMs;
          this.logger.debug(
            `Processed ${processedCount} events, next poll in ${nextDelayMs}ms`,
          );
        } else {
          // No items processed - use idle interval
          nextDelayMs = settings.idlePollingIntervalMs;
        }

        // Wait for next poll, but be ready for immediate wakeup
        await this.delay(nextDelayMs);
      }
    } finally {
      // Cleanup: unsubscribe from notifications
      this.notifier.unsubscribe(immediateWakeupListener);
      this.logger.log('Processing loop stopped');
    }
  }

  /**
   * Utility: delay with cancellation support
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this._resolveDelay = resolve;
      this._currentTimeout = setTimeout(resolve, ms);
    });
  }
}
