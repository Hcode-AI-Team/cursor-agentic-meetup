import { describe, it, expect, afterEach } from '@jest/globals';
import { OAuthCallbackCoordinatorService } from './oauth-callback-coordinator.service';
import {
  OAuthCallbackAlreadyProcessedError,
  OAuthCallbackInProgressError,
  OAuthProviderException,
} from './oauth.errors';

const makeService = (prisma: any) => new OAuthCallbackCoordinatorService(prisma as any);

const noLockPrisma = (overrides: any = {}) => ({
  isPostgres: jest.fn().mockReturnValue(false),
  isMysql: jest.fn().mockReturnValue(false),
  getProvider: jest.fn().mockReturnValue('sqlite'),
  ...overrides,
});

describe('OAuthCallbackCoordinatorService', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('execute (no distributed lock provider)', () => {
    it('runs the callback and marks the key completed', async () => {
      const service = makeService(noLockPrisma());
      const callback = jest.fn().mockResolvedValue('ok');

      await expect(service.execute('key-a', callback)).resolves.toBe('ok');
      expect(callback).toHaveBeenCalledTimes(1);
      expect((service as any).isCompleted('key-a')).toBe(true);
    });

    it('rejects a second call with the same key as already processed', async () => {
      const service = makeService(noLockPrisma());
      await service.execute('key-b', jest.fn().mockResolvedValue(1));

      await expect(
        service.execute('key-b', jest.fn().mockResolvedValue(2)),
      ).rejects.toThrow(OAuthCallbackAlreadyProcessedError);
    });

    it('does not mark completed when the callback throws a generic error', async () => {
      const service = makeService(noLockPrisma());
      await expect(
        service.execute('key-c', jest.fn().mockRejectedValue(new Error('boom'))),
      ).rejects.toThrow('boom');
      expect((service as any).isCompleted('key-c')).toBe(false);
    });

    it('marks completed when the callback throws a callback_consumed provider error', async () => {
      const service = makeService(noLockPrisma());
      const err = new OAuthProviderException('google', 'callback_consumed', 'consumed');
      await expect(service.execute('key-d', jest.fn().mockRejectedValue(err))).rejects.toBe(err);
      expect((service as any).isCompleted('key-d')).toBe(true);
    });
  });

  describe('execute (postgres advisory lock)', () => {
    it('acquires the advisory lock and runs the callback', async () => {
      const tx = { $queryRaw: jest.fn().mockResolvedValue([{ locked: true }]) };
      const prisma = {
        isPostgres: jest.fn().mockReturnValue(true),
        isMysql: jest.fn().mockReturnValue(false),
        getProvider: jest.fn().mockReturnValue('postgresql'),
        $transaction: jest.fn(async (cb: any) => cb(tx)),
      };
      const service = makeService(prisma);
      const callback = jest.fn().mockResolvedValue('done');

      await expect(service.execute('pg-key', callback)).resolves.toBe('done');
      expect(callback).toHaveBeenCalledTimes(1);
      expect((service as any).isCompleted('pg-key')).toBe(true);
    });

    it('throws InProgress and does not run the callback when the lock is held', async () => {
      const tx = { $queryRaw: jest.fn().mockResolvedValue([{ locked: false }]) };
      const prisma = {
        isPostgres: jest.fn().mockReturnValue(true),
        isMysql: jest.fn().mockReturnValue(false),
        getProvider: jest.fn().mockReturnValue('postgresql'),
        $transaction: jest.fn(async (cb: any) => cb(tx)),
      };
      const service = makeService(prisma);
      const callback = jest.fn();

      await expect(service.execute('pg-busy', callback)).rejects.toThrow(OAuthCallbackInProgressError);
      expect(callback).not.toHaveBeenCalled();
      expect((service as any).isCompleted('pg-busy')).toBe(false);
    });
  });

  describe('completed-callback bookkeeping', () => {
    it('expires completed entries after the TTL window', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      const service = makeService(noLockPrisma());

      (service as any).markCompleted('ttl-key');
      expect((service as any).isCompleted('ttl-key')).toBe(true);

      // Advance beyond the 10 minute TTL.
      jest.setSystemTime(new Date('2026-01-01T00:11:00.000Z'));
      expect((service as any).isCompleted('ttl-key')).toBe(false);
    });

    it('prunes expired entries from the internal map', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      const service = makeService(noLockPrisma());
      (service as any).markCompleted('old');

      jest.setSystemTime(new Date('2026-01-01T00:11:00.000Z'));
      (service as any).markCompleted('fresh');
      (service as any).pruneCompletedCallbacks();

      expect((service as any).completedCallbacks.has('old')).toBe(false);
      expect((service as any).completedCallbacks.has('fresh')).toBe(true);
    });
  });

  describe('shouldMarkCompleted', () => {
    it('is true for already-processed and callback_consumed errors only', () => {
      const service = makeService(noLockPrisma());
      expect((service as any).shouldMarkCompleted(new OAuthCallbackAlreadyProcessedError())).toBe(true);
      expect(
        (service as any).shouldMarkCompleted(
          new OAuthProviderException('g', 'callback_consumed', 'x'),
        ),
      ).toBe(true);
      expect(
        (service as any).shouldMarkCompleted(
          new OAuthProviderException('g', 'upstream_failure', 'x'),
        ),
      ).toBe(false);
      expect((service as any).shouldMarkCompleted(new Error('other'))).toBe(false);
    });
  });

  describe('lock key derivation', () => {
    it('derives a deterministic signed bigint within int64 bounds', () => {
      const service = makeService(noLockPrisma());
      const a = (service as any).toSignedBigInt('same');
      const b = (service as any).toSignedBigInt('same');
      expect(a).toBe(b);
      expect(typeof a).toBe('bigint');
      expect(a >= -(BigInt(1) << BigInt(63))).toBe(true);
      expect(a < BigInt(1) << BigInt(63)).toBe(true);
      expect((service as any).toSignedBigInt('other')).not.toBe(a);
    });

    it('derives a prefixed 48-char mysql lock name', () => {
      const service = makeService(noLockPrisma());
      const name = (service as any).toMysqlLockName('key');
      expect(name.startsWith('oauth:')).toBe(true);
      expect(name.slice('oauth:'.length)).toHaveLength(48);
    });
  });
});
