import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { IntegrationSettingsService } from './integration-settings.service';
import { OutboxPollingCoordinator } from './outbox-polling.coordinator';
import { OutboxNotifier } from './outbox.notifier';
import { OutboxProcessor } from './outbox.processor';

/**
 * Hybrid background job for outbox processing
 * Combines startup recovery, immediate notification reactions, and periodic polling
 */
@Injectable()
export class OutboxProcessorJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxProcessorJob.name);

  constructor(
    private readonly processor: OutboxProcessor,
    private readonly notifier: OutboxNotifier,
    private readonly coordinator: OutboxPollingCoordinator,
    private readonly integrationSettingsService: IntegrationSettingsService,
  ) {}

  /**
   * Called when module initializes
   * 1. Drain pending events from startup
   * 2. Start hybrid processing loop
   */
  async onModuleInit(): Promise<void> {
    const settings = await this.integrationSettingsService.getRuntimeSettings();
    const isEnabled = settings.outboxEnabled;
    if (!isEnabled) {
      this.logger.debug('Outbox integration disabled in settings');
      return;
    }

    // Step 1: Startup drain
    const startupDrainEnabled = settings.startupDrainEnabled;

    if (startupDrainEnabled) {
      this.logger.log('Starting outbox startup drain...');
      try {
        const processed = await this.processor.startupDrain();
        this.logger.log(
          `Outbox startup drain completed: ${processed} events`,
        );
      } catch (error) {
        this.logger.error('Outbox startup drain failed:', error);
      }
    }

    // Step 2: Start hybrid processing loop
    const processorEnabled = settings.outboxProcessorEnabled;

    if (processorEnabled) {
      this.logger.log('Starting outbox hybrid processing loop');
      try {
        await this.coordinator.startProcessingLoop();
      } catch (error) {
        this.logger.error('Failed to start outbox processing loop:', error);
      }
    } else {
      this.logger.debug('Outbox processor disabled in settings');
    }
  }

  /**
   * Called when module is destroyed
   * Gracefully stop the processing loop
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down outbox processing');
    try {
      await this.coordinator.stopProcessingLoop();
    } catch (error) {
      this.logger.error(
        'Error stopping outbox processing loop:',
        error,
      );
    }
  }

  /**
   * Get current processing statistics
   * Useful for health checks and monitoring
   */
  async getStats() {
    const stats = await this.processor.getStats();
    return {
      ...stats,
      pollingLoopRunning: this.coordinator.isRunning(),
    };
  }
}
