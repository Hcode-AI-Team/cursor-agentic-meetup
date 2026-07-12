import { Prisma, PrismaService } from '@hed-hog/api-prisma';
import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
    OAuthCallbackAlreadyProcessedError,
    OAuthCallbackInProgressError,
    OAuthProviderException,
} from './oauth.errors';

@Injectable()
export class OAuthCallbackCoordinatorService {
  private readonly logger = new Logger(OAuthCallbackCoordinatorService.name);
  private readonly completedCallbacks = new Map<string, number>();
  private readonly completedTtlMs = 10 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  async execute<T>(callbackKey: string, callback: () => Promise<T>): Promise<T> {
    this.pruneCompletedCallbacks();

    if (this.isCompleted(callbackKey)) {
      throw new OAuthCallbackAlreadyProcessedError();
    }

    try {
      if (this.prisma.isPostgres()) {
        return await this.executeWithPostgresLock(callbackKey, callback);
      }

      if (this.prisma.isMysql()) {
        return await this.executeWithMysqlLock(callbackKey, callback);
      }

      this.logger.warn(
        `OAuth callback coordination is running without distributed lock support for provider ${this.prisma.getProvider()}.`,
      );

      const result = await callback();
      this.markCompleted(callbackKey);
      return result;
    } catch (error) {
      if (this.shouldMarkCompleted(error)) {
        this.markCompleted(callbackKey);
      }

      throw error;
    }
  }

  private async executeWithPostgresLock<T>(
    callbackKey: string,
    callback: () => Promise<T>,
  ): Promise<T> {
    const lockKey = this.toSignedBigInt(callbackKey);

    return this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<Array<{ locked: boolean }>>`
          SELECT pg_try_advisory_xact_lock(${lockKey}) AS locked
        `;

        if (!rows[0]?.locked) {
          throw new OAuthCallbackInProgressError();
        }

        const result = await callback();
        this.markCompleted(callbackKey);
        return result;
      },
      {
        maxWait: 5_000,
        timeout: 60_000,
      },
    );
  }

  private async executeWithMysqlLock<T>(
    callbackKey: string,
    callback: () => Promise<T>,
  ): Promise<T> {
    const lockName = this.toMysqlLockName(callbackKey);

    return this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<Array<{ locked: 0 | 1 | null }>>(Prisma.sql`
          SELECT GET_LOCK(${lockName}, 0) AS locked
        `);

        if (rows[0]?.locked !== 1) {
          throw new OAuthCallbackInProgressError();
        }

        try {
          const result = await callback();
          this.markCompleted(callbackKey);
          return result;
        } finally {
          await tx.$queryRaw(Prisma.sql`
            SELECT RELEASE_LOCK(${lockName}) AS released
          `);
        }
      },
      {
        maxWait: 5_000,
        timeout: 60_000,
      },
    );
  }

  private shouldMarkCompleted(error: unknown) {
    return (
      error instanceof OAuthCallbackAlreadyProcessedError ||
      (error instanceof OAuthProviderException &&
        error.reason === 'callback_consumed')
    );
  }

  private isCompleted(callbackKey: string) {
    const expiresAt = this.completedCallbacks.get(callbackKey);
    if (!expiresAt) {
      return false;
    }

    if (expiresAt <= Date.now()) {
      this.completedCallbacks.delete(callbackKey);
      return false;
    }

    return true;
  }

  private markCompleted(callbackKey: string) {
    this.completedCallbacks.set(callbackKey, Date.now() + this.completedTtlMs);
  }

  private pruneCompletedCallbacks() {
    const now = Date.now();
    for (const [callbackKey, expiresAt] of this.completedCallbacks.entries()) {
      if (expiresAt <= now) {
        this.completedCallbacks.delete(callbackKey);
      }
    }
  }

  private toSignedBigInt(callbackKey: string) {
    const hex = createHash('sha256').update(callbackKey).digest('hex').slice(0, 16);
    const unsigned = BigInt(`0x${hex}`);
    const signedBoundary = BigInt(1) << BigInt(63);
    return unsigned >= signedBoundary
      ? unsigned - (BigInt(1) << BigInt(64))
      : unsigned;
  }

  private toMysqlLockName(callbackKey: string) {
    const suffix = createHash('sha256').update(callbackKey).digest('hex').slice(0, 48);
    return `oauth:${suffix}`;
  }
}