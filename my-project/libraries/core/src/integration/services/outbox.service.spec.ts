import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { OutboxService } from './outbox.service';
import { OutboxEventStatus } from '../types';

const makeDeps = () => {
  const prisma = {
    outbox_event: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  return { prisma };
};

const makeService = (deps = makeDeps()) => ({
  service: new OutboxService(deps.prisma as any),
  deps,
});

const record = (over: any = {}) => ({
  id: 1,
  event_name: 'person.created',
  source_module: 'crm',
  aggregate_type: 'person',
  aggregate_id: '10',
  payload: { foo: 'bar' },
  status: OutboxEventStatus.PENDING,
  attempt_count: 0,
  last_error: null,
  available_at: new Date('2026-01-01'),
  processed_at: null,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
  ...over,
});

describe('OutboxService', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

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
      const result = (service as any).toDomainEvent(record({ id: 3 }));
      expect(result).toMatchObject({
        id: '3',
        eventName: 'person.created',
        sourceModule: 'crm',
        aggregateType: 'person',
        aggregateId: '10',
        payload: { foo: 'bar' },
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
      const availableAt = new Date('2026-02-01');
      expect(
        (service as any).toDatabaseUpdate({
          attemptCount: 2,
          lastError: 'e',
          availableAt,
          processedAt: null,
        }),
      ).toEqual({
        attempt_count: 2,
        last_error: 'e',
        available_at: availableAt,
        processed_at: null,
      });
    });
  });

  describe('createEvent', () => {
    it('cria com status PENDING e attempt_count 0 usando prisma padrão', async () => {
      const { service, deps } = makeService();
      deps.prisma.outbox_event.create.mockResolvedValue(record({ id: 5 }));

      const result = await service.createEvent({
        eventName: 'person.created',
        sourceModule: 'crm',
        aggregateType: 'person',
        aggregateId: '10',
        payload: { foo: 'bar' },
      });

      expect(deps.prisma.outbox_event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event_name: 'person.created',
          source_module: 'crm',
          aggregate_type: 'person',
          aggregate_id: '10',
          payload: { foo: 'bar' },
          status: OutboxEventStatus.PENDING,
          attempt_count: 0,
        }),
      });
      expect(result.id).toBe('5');
    });

    it('usa persistenceClient alternativo (ex.: dentro de uma transação) quando fornecido', async () => {
      const { service } = makeService();
      const altClient = {
        outbox_event: {
          create: jest.fn<any>().mockResolvedValue(record({ id: 9 })),
        },
      };

      const result = await service.createEvent(
        {
          eventName: 'x',
          sourceModule: 'crm',
          aggregateType: 'person',
          aggregateId: '1',
          payload: {},
        },
        altClient as any,
      );

      expect(altClient.outbox_event.create).toHaveBeenCalled();
      expect(result.id).toBe('9');
    });
  });

  describe('findPendingAndLock', () => {
    it('retorna [] quando não há linhas pendentes', async () => {
      const { service, deps } = makeService();
      const tx = {
        $queryRaw: jest.fn<any>().mockResolvedValue([]),
        $executeRaw: jest.fn(),
      };
      deps.prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

      const result = await service.findPendingAndLock(10, 5000);

      expect(result).toEqual([]);
      expect(tx.$executeRaw).not.toHaveBeenCalled();
    });

    it('bloqueia linhas encontradas e marca como PROCESSING', async () => {
      const { service, deps } = makeService();
      const rows = [record({ id: 1 }), record({ id: 2 })];
      const tx = {
        $queryRaw: jest.fn<any>().mockResolvedValue(rows),
        $executeRaw: jest.fn(),
      };
      deps.prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

      const result = await service.findPendingAndLock(10, 5000);

      expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(OutboxEventStatus.PROCESSING);
      expect(result[1].status).toBe(OutboxEventStatus.PROCESSING);
    });
  });

  describe('updateStatus', () => {
    it('atualiza status e campos parciais', async () => {
      const { service, deps } = makeService();
      deps.prisma.outbox_event.update.mockResolvedValue(
        record({ status: OutboxEventStatus.PROCESSED }),
      );

      const result = await service.updateStatus(1, OutboxEventStatus.PROCESSED, {
        attemptCount: 1,
      });

      expect(deps.prisma.outbox_event.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          status: OutboxEventStatus.PROCESSED,
          attempt_count: 1,
        }),
      });
      expect(result.status).toBe(OutboxEventStatus.PROCESSED);
    });

    it('converte eventId string para número no where', async () => {
      const { service, deps } = makeService();
      deps.prisma.outbox_event.update.mockResolvedValue(record());

      await service.updateStatus('42', OutboxEventStatus.PENDING);

      expect(deps.prisma.outbox_event.update).toHaveBeenCalledWith({
        where: { id: 42 },
        data: { status: OutboxEventStatus.PENDING },
      });
    });
  });

  describe('markProcessing', () => {
    it('define availableAt com base no leaseMs', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
      const { service, deps } = makeService();
      deps.prisma.outbox_event.update.mockResolvedValue(
        record({ status: OutboxEventStatus.PROCESSING }),
      );

      await service.markProcessing(1, 5000);

      const arg = deps.prisma.outbox_event.update.mock.calls[0][0];
      expect(arg.data.status).toBe(OutboxEventStatus.PROCESSING);
      expect(arg.data.available_at).toEqual(new Date('2026-01-01T00:00:05Z'));
    });
  });

  describe('incrementAttempt', () => {
    it('lança quando registro não existe', async () => {
      const { service, deps } = makeService();
      deps.prisma.outbox_event.findUnique.mockResolvedValue(null);
      await expect(service.incrementAttempt(1)).rejects.toThrow('not found');
    });

    it('incrementa attempt_count e mantém status atual, registrando erro', async () => {
      const { service, deps } = makeService();
      deps.prisma.outbox_event.findUnique.mockResolvedValue(
        record({ attempt_count: 2, status: OutboxEventStatus.PROCESSING }),
      );
      deps.prisma.outbox_event.update.mockResolvedValue(record());

      await service.incrementAttempt(1, 'boom');

      const arg = deps.prisma.outbox_event.update.mock.calls[0][0];
      expect(arg.data.status).toBe(OutboxEventStatus.PROCESSING);
      expect(arg.data.attempt_count).toBe(3);
      expect(arg.data.last_error).toBe('boom');
    });

    it('usa null como last_error quando erro não é informado', async () => {
      const { service, deps } = makeService();
      deps.prisma.outbox_event.findUnique.mockResolvedValue(
        record({ attempt_count: 0, status: OutboxEventStatus.PENDING }),
      );
      deps.prisma.outbox_event.update.mockResolvedValue(record());

      await service.incrementAttempt(1);

      const arg = deps.prisma.outbox_event.update.mock.calls[0][0];
      expect(arg.data.last_error).toBeNull();
    });
  });

  describe('getById', () => {
    it('retorna null quando ausente', async () => {
      const { service, deps } = makeService();
      deps.prisma.outbox_event.findUnique.mockResolvedValue(null);
      await expect(service.getById(1)).resolves.toBeNull();
    });

    it('retorna evento mapeado quando existe', async () => {
      const { service, deps } = makeService();
      deps.prisma.outbox_event.findUnique.mockResolvedValue(record({ id: 4 }));
      await expect(service.getById(4)).resolves.toMatchObject({ id: '4' });
    });
  });

  describe('countByStatus', () => {
    it('conta por status', async () => {
      const { service, deps } = makeService();
      deps.prisma.outbox_event.count.mockResolvedValue(7);

      await expect(service.countByStatus(OutboxEventStatus.PENDING)).resolves.toBe(7);
      expect(deps.prisma.outbox_event.count).toHaveBeenCalledWith({
        where: { status: OutboxEventStatus.PENDING },
      });
    });
  });
});
