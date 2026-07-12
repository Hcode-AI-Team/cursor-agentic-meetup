import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { InboxService } from './inbox.service';
import { InboxEventStatus } from '../types';

const makeDeps = () => {
  const prisma = {
    inbox_event: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };
  return { prisma };
};

const makeService = (deps = makeDeps()) => ({
  service: new InboxService(deps.prisma as any),
  deps,
});

const record = (over: any = {}) => ({
  id: 1,
  outbox_event_id: 10,
  consumer_name: 'crm',
  status: InboxEventStatus.RECEIVED,
  attempt_count: 0,
  last_error: null,
  processed_at: null,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
  ...over,
});

describe('InboxService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('toDatabaseId', () => {
    it('mantém number e converte string', () => {
      const { service } = makeService();
      expect((service as any).toDatabaseId(5)).toBe(5);
      expect((service as any).toDatabaseId('12')).toBe(12);
    });
  });

  describe('toDomainEvent', () => {
    it('mapeia colunas para camelCase', () => {
      const { service } = makeService();
      const result = (service as any).toDomainEvent(record({ id: 3, outbox_event_id: 99 }));
      expect(result).toMatchObject({
        id: '3',
        outboxEventId: '99',
        consumerName: 'crm',
        attemptCount: 0,
      });
    });
  });

  describe('toDatabaseUpdate', () => {
    it('retorna undefined sem partial', () => {
      const { service } = makeService();
      expect((service as any).toDatabaseUpdate()).toBeUndefined();
    });
    it('mapeia campos parciais', () => {
      const { service } = makeService();
      expect(
        (service as any).toDatabaseUpdate({ attemptCount: 2, lastError: 'e', processedAt: null }),
      ).toEqual({ attempt_count: 2, last_error: 'e', processed_at: null });
    });
  });

  describe('getOrCreate (idempotência)', () => {
    it('retorna existente sem criar', async () => {
      const { service, deps } = makeService();
      deps.prisma.inbox_event.findFirst.mockResolvedValue(record({ id: 7 }));
      const result = await service.getOrCreate(10, 'crm');
      expect(result.id).toBe('7');
      expect(deps.prisma.inbox_event.create).not.toHaveBeenCalled();
    });

    it('cria quando não existe com status RECEIVED', async () => {
      const { service, deps } = makeService();
      deps.prisma.inbox_event.findFirst.mockResolvedValue(null);
      deps.prisma.inbox_event.create.mockResolvedValue(record({ id: 8 }));
      await service.getOrCreate('10', 'crm');
      expect(deps.prisma.inbox_event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          outbox_event_id: 10,
          consumer_name: 'crm',
          status: InboxEventStatus.RECEIVED,
          attempt_count: 0,
        }),
      });
    });
  });

  describe('markProcessed', () => {
    it('define processed_at e status PROCESSED', async () => {
      const { service, deps } = makeService();
      deps.prisma.inbox_event.update.mockResolvedValue(record({ status: InboxEventStatus.PROCESSED }));
      await service.markProcessed(1);
      const arg = deps.prisma.inbox_event.update.mock.calls[0][0];
      expect(arg.data.status).toBe(InboxEventStatus.PROCESSED);
      expect(arg.data.processed_at).toBeInstanceOf(Date);
    });
  });

  describe('markFailed', () => {
    it('lança quando registro não existe', async () => {
      const { service, deps } = makeService();
      deps.prisma.inbox_event.findUnique.mockResolvedValue(null);
      await expect(service.markFailed(1, 'boom')).rejects.toThrow('not found');
    });

    it('incrementa tentativa e registra erro', async () => {
      const { service, deps } = makeService();
      deps.prisma.inbox_event.findUnique.mockResolvedValue(record({ attempt_count: 2 }));
      deps.prisma.inbox_event.update.mockResolvedValue(record({ status: InboxEventStatus.FAILED }));
      await service.markFailed(1, 'boom');
      const arg = deps.prisma.inbox_event.update.mock.calls[0][0];
      expect(arg.data.status).toBe(InboxEventStatus.FAILED);
      expect(arg.data.attempt_count).toBe(3);
      expect(arg.data.last_error).toBe('boom');
    });
  });

  describe('incrementAttempt', () => {
    it('lança quando registro não existe', async () => {
      const { service, deps } = makeService();
      deps.prisma.inbox_event.findUnique.mockResolvedValue(null);
      await expect(service.incrementAttempt(1)).rejects.toThrow('not found');
    });

    it('mantém status e incrementa tentativa', async () => {
      const { service, deps } = makeService();
      deps.prisma.inbox_event.findUnique.mockResolvedValue(record({ attempt_count: 5, status: InboxEventStatus.PROCESSING }));
      deps.prisma.inbox_event.update.mockResolvedValue(record());
      await service.incrementAttempt(1);
      const arg = deps.prisma.inbox_event.update.mock.calls[0][0];
      expect(arg.data.status).toBe(InboxEventStatus.PROCESSING);
      expect(arg.data.attempt_count).toBe(6);
    });
  });

  describe('isProcessed', () => {
    it('true apenas quando status PROCESSED', async () => {
      const { service, deps } = makeService();
      deps.prisma.inbox_event.findFirst.mockResolvedValue(record({ status: InboxEventStatus.PROCESSED }));
      await expect(service.isProcessed(10, 'crm')).resolves.toBe(true);
    });
    it('false quando outro status', async () => {
      const { service, deps } = makeService();
      deps.prisma.inbox_event.findFirst.mockResolvedValue(record({ status: InboxEventStatus.FAILED }));
      await expect(service.isProcessed(10, 'crm')).resolves.toBe(false);
    });
    it('false quando não existe', async () => {
      const { service, deps } = makeService();
      deps.prisma.inbox_event.findFirst.mockResolvedValue(null);
      await expect(service.isProcessed(10, 'crm')).resolves.toBe(false);
    });
  });

  describe('getById / countUnprocessed', () => {
    it('getById retorna null quando ausente', async () => {
      const { service, deps } = makeService();
      deps.prisma.inbox_event.findUnique.mockResolvedValue(null);
      await expect(service.getById(1)).resolves.toBeNull();
    });

    it('countUnprocessed exclui PROCESSED e SKIPPED', async () => {
      const { service, deps } = makeService();
      deps.prisma.inbox_event.count.mockResolvedValue(4);
      await service.countUnprocessed('crm');
      expect(deps.prisma.inbox_event.count).toHaveBeenCalledWith({
        where: {
          consumer_name: 'crm',
          status: { notIn: [InboxEventStatus.PROCESSED, InboxEventStatus.SKIPPED] },
        },
      });
    });
  });
});
