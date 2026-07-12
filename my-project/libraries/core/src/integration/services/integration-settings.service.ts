import { Injectable, Logger } from '@nestjs/common';
import { SettingService } from '../../setting/setting.service';

export interface IntegrationRuntimeSettings {
  outboxEnabled: boolean;
  outboxProcessorEnabled: boolean;
  startupDrainEnabled: boolean;
  pollingIntervalMs: number;
  idlePollingIntervalMs: number;
  batchSize: number;
  startupDrainBatchSize: number;
  maxAttempts: number;
  processingLeaseMs: number;
  retryBaseDelayMs: number;
  deadLetterEnabled: boolean;
}

@Injectable()
export class IntegrationSettingsService {
  private readonly logger = new Logger(IntegrationSettingsService.name);

  constructor(private readonly settingService: SettingService) {}

  async getRuntimeSettings(): Promise<IntegrationRuntimeSettings> {
    const values = await this.settingService.getSettingValues([
      'outbox-enabled',
      'outbox-processor-enabled',
      'outbox-startup-drain-enabled',
      'outbox-polling-interval-ms',
      'outbox-idle-polling-interval-ms',
      'outbox-batch-size',
      'outbox-startup-drain-batch-size',
      'outbox-max-attempts',
      'outbox-processing-lease-ms',
      'outbox-retry-base-delay-ms',
      'outbox-dead-letter-enabled',
    ]);

    const pollingIntervalMs = this.getPositiveInt(
      values['outbox-polling-interval-ms'],
      5000,
      100,
      'outbox-polling-interval-ms',
    );

    let idlePollingIntervalMs = this.getPositiveInt(
      values['outbox-idle-polling-interval-ms'],
      30000,
      100,
      'outbox-idle-polling-interval-ms',
    );

    if (idlePollingIntervalMs < pollingIntervalMs) {
      this.logger.warn(
        `Setting outbox-idle-polling-interval-ms (${idlePollingIntervalMs}) is lower than outbox-polling-interval-ms (${pollingIntervalMs}). Using ${pollingIntervalMs}.`,
      );
      idlePollingIntervalMs = pollingIntervalMs;
    }

    return {
      outboxEnabled: this.getBoolean(values['outbox-enabled'], true),
      outboxProcessorEnabled: this.getBoolean(
        values['outbox-processor-enabled'],
        true,
      ),
      startupDrainEnabled: this.getBoolean(
        values['outbox-startup-drain-enabled'],
        true,
      ),
      pollingIntervalMs,
      idlePollingIntervalMs,
      batchSize: this.getPositiveInt(values['outbox-batch-size'], 10, 1, 'outbox-batch-size'),
      startupDrainBatchSize: this.getPositiveInt(
        values['outbox-startup-drain-batch-size'],
        50,
        1,
        'outbox-startup-drain-batch-size',
      ),
      maxAttempts: this.getPositiveInt(values['outbox-max-attempts'], 3, 1, 'outbox-max-attempts'),
      processingLeaseMs: this.getPositiveInt(
        values['outbox-processing-lease-ms'],
        30000,
        1000,
        'outbox-processing-lease-ms',
      ),
      retryBaseDelayMs: this.getPositiveInt(
        values['outbox-retry-base-delay-ms'],
        1000,
        100,
        'outbox-retry-base-delay-ms',
      ),
      deadLetterEnabled: this.getBoolean(values['outbox-dead-letter-enabled'], true),
    };
  }

  private getPositiveInt(
    value: unknown,
    fallback: number,
    min: number,
    slug: string,
  ): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min) {
      this.logger.warn(
        `Invalid ${slug} setting value (${String(value)}). Using fallback ${fallback}.`,
      );
      return fallback;
    }

    return Math.floor(parsed);
  }

  private getBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (value === 'true' || value === '1') {
      return true;
    }

    if (value === 'false' || value === '0') {
      return false;
    }

    return fallback;
  }
}
