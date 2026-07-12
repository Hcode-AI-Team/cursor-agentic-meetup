import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { NotificationService } from './notification.service';

const makeDeps = () => {
  const prisma = {
    notification: {
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    $executeRaw: jest.fn().mockResolvedValue(0),
    $executeRawUnsafe: jest.fn().mockResolvedValue(0),
  };
  const pagination = { paginate: jest.fn().mockResolvedValue({ data: [] }) };
  const eventEmitter = { emitAsync: jest.fn().mockResolvedValue([]) };
  return { prisma, pagination, eventEmitter };
};

const makeService = (deps = makeDeps()) => ({
  service: new NotificationService(
    deps.prisma as any,
    deps.pagination as any,
    deps.eventEmitter as any,
  ),
  deps,
});

describe('NotificationService', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('isActiveAsyncNotification', () => {
    let service: NotificationService;
    beforeEach(() => {
      service = makeService().service;
    });
    const call = (n: any) => (service as any).isActiveAsyncNotification(n);

    it('true quando progresso em andamento e não finalizado', () => {
      expect(call({ progress: 50, finished_at: null })).toBe(true);
    });
    it('false quando progress null', () => {
      expect(call({ progress: null, finished_at: null })).toBe(false);
    });
    it('false quando progress >= 100', () => {
      expect(call({ progress: 100, finished_at: null })).toBe(false);
    });
    it('false quando já finalizado', () => {
      expect(call({ progress: 50, finished_at: new Date() })).toBe(false);
    });
  });

  describe('assertOwnership', () => {
    it('lança NotFound quando não existe', async () => {
      const { service, deps } = makeService();
      deps.prisma.notification.findUnique.mockResolvedValue(null);
      await expect((service as any).assertOwnership(1, 5)).rejects.toThrow(
        NotFoundException,
      );
    });
    it('lança Forbidden quando dono diverge', async () => {
      const { service, deps } = makeService();
      deps.prisma.notification.findUnique.mockResolvedValue({ user_id: 2 });
      await expect((service as any).assertOwnership(1, 5)).rejects.toThrow(
        ForbiddenException,
      );
    });
    it('retorna notificação do dono', async () => {
      const { service, deps } = makeService();
      deps.prisma.notification.findUnique.mockResolvedValue({ user_id: 1 });
      await expect((service as any).assertOwnership(1, 5)).resolves.toMatchObject(
        { user_id: 1 },
      );
    });
  });

  describe('unreadCount', () => {
    it('retorna contagem de não lidas', async () => {
      const { service, deps } = makeService();
      deps.prisma.notification.count.mockResolvedValue(3);
      await expect(service.unreadCount(1)).resolves.toEqual({ count: 3 });
    });
  });

  describe('markRead', () => {
    it('remove quando auto_remove e não ativa', async () => {
      const { service, deps } = makeService();
      deps.prisma.notification.findUnique.mockResolvedValue({
        user_id: 1,
        auto_remove: true,
        progress: null,
        finished_at: null,
      });
      deps.prisma.notification.delete.mockResolvedValue({ id: 5 });
      await service.markRead(1, 5);
      expect(deps.prisma.notification.delete).toHaveBeenCalledWith({
        where: { id: 5 },
      });
    });

    it('rejeita remover async ativa auto_remove', async () => {
      const { service, deps } = makeService();
      deps.prisma.notification.findUnique.mockResolvedValue({
        user_id: 1,
        auto_remove: true,
        progress: 40,
        finished_at: null,
      });
      await expect(service.markRead(1, 5)).rejects.toThrow(BadRequestException);
    });

    it('marca como lida quando não auto_remove', async () => {
      const { service, deps } = makeService();
      deps.prisma.notification.findUnique.mockResolvedValue({
        user_id: 1,
        auto_remove: false,
        progress: null,
        finished_at: null,
      });
      deps.prisma.notification.update.mockResolvedValue({ id: 5, status: 'read' });
      await service.markRead(1, 5);
      expect(deps.prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { status: 'read' },
      });
    });
  });

  describe('delete', () => {
    it('rejeita async ativa', async () => {
      const { service, deps } = makeService();
      deps.prisma.notification.findUnique.mockResolvedValue({
        user_id: 1,
        progress: 40,
        finished_at: null,
      });
      await expect(service.delete(1, 5)).rejects.toThrow(BadRequestException);
    });

    it('remove notificação normal', async () => {
      const { service, deps } = makeService();
      deps.prisma.notification.findUnique.mockResolvedValue({
        user_id: 1,
        progress: null,
        finished_at: null,
      });
      deps.prisma.notification.delete.mockResolvedValue({ id: 5 });
      await expect(service.delete(1, 5)).resolves.toEqual({ id: 5 });
    });
  });

  describe('create', () => {
    it('aplica defaults (info/url/auto_remove false)', async () => {
      const { service, deps } = makeService();
      deps.prisma.notification.create.mockResolvedValue({ id: 9 });
      await service.create({ user_id: 1, title: 't', body: 'b' } as any);
      const arg = deps.prisma.notification.create.mock.calls[0][0];
      expect(arg.data.type).toBe('info');
      expect(arg.data.action_type).toBe('url');
      expect(arg.data.auto_remove).toBe(false);
    });
  });

  describe('updateProgress', () => {
    it('finaliza com sucesso quando progress >= 100', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
      const { service, deps } = makeService();
      deps.prisma.notification.findUnique.mockResolvedValue({ user_id: 1 });
      deps.prisma.notification.update.mockResolvedValue({ id: 5 });
      await service.updateProgress(1, 5, { progress: 100 } as any);
      const data = deps.prisma.notification.update.mock.calls[0][0].data;
      expect(data.type).toBe('success');
      expect(data.finished_at).toBeInstanceOf(Date);
    });

    it('marca erro quando finaliza com success=false', async () => {
      const { service, deps } = makeService();
      deps.prisma.notification.findUnique.mockResolvedValue({ user_id: 1 });
      deps.prisma.notification.update.mockResolvedValue({ id: 5 });
      await service.updateProgress(1, 5, { progress: 100, success: false } as any);
      expect(deps.prisma.notification.update.mock.calls[0][0].data.type).toBe(
        'error',
      );
    });

    it('não finaliza quando progress < 100', async () => {
      const { service, deps } = makeService();
      deps.prisma.notification.findUnique.mockResolvedValue({ user_id: 1 });
      deps.prisma.notification.update.mockResolvedValue({ id: 5 });
      await service.updateProgress(1, 5, { progress: 30 } as any);
      const data = deps.prisma.notification.update.mock.calls[0][0].data;
      expect(data.type).toBeUndefined();
      expect(data.finished_at).toBeUndefined();
    });
  });

  describe('markAllRead / deleteAll', () => {
    it('markAllRead limpa auto_remove e marca restantes como lidas', async () => {
      const { service, deps } = makeService();
      deps.prisma.notification.deleteMany.mockResolvedValue({ count: 1 });
      deps.prisma.notification.updateMany.mockResolvedValue({ count: 2 });
      await expect(service.markAllRead(1)).resolves.toEqual({ count: 2 });
    });

    it('deleteAll remove concluídas', async () => {
      const { service, deps } = makeService();
      deps.prisma.notification.deleteMany.mockResolvedValue({ count: 4 });
      await expect(service.deleteAll(1)).resolves.toEqual({ count: 4 });
    });
  });

  describe('broadcastNotificationEvent', () => {
    it('engole erro do $executeRaw', async () => {
      const { service, deps } = makeService();
      deps.prisma.$executeRaw.mockRejectedValue(new Error('down'));
      await expect(
        (service as any).broadcastNotificationEvent(1, { type: 'notification.updated' }),
      ).resolves.toBeUndefined();
    });

    it('emite evento local para o usuário', async () => {
      const { service } = makeService();
      const received: any[] = [];
      (service as any).notificationEvents.on('notification:7', (e: any) =>
        received.push(e),
      );
      await (service as any).broadcastNotificationEvent(7, {
        type: 'notification.created',
      });
      expect(received).toHaveLength(1);
    });
  });

  describe('handleClusterNotification', () => {
    it('ignora canal diferente', () => {
      const { service } = makeService();
      const spy = jest.spyOn(service as any, 'emitLocalNotificationEvent');
      (service as any).handleClusterNotification({ channel: 'other', payload: '{}' });
      expect(spy).not.toHaveBeenCalled();
    });

    it('ignora mensagem da própria instância', () => {
      const { service } = makeService();
      const instanceId = (service as any).instanceId;
      const spy = jest.spyOn(service as any, 'emitLocalNotificationEvent');
      (service as any).handleClusterNotification({
        channel: 'notification_events',
        payload: JSON.stringify({ originInstanceId: instanceId, userId: 1 }),
      });
      expect(spy).not.toHaveBeenCalled();
    });

    it('reemite evento de outra instância', () => {
      const { service } = makeService();
      const spy = jest.spyOn(service as any, 'emitLocalNotificationEvent');
      (service as any).handleClusterNotification({
        channel: 'notification_events',
        payload: JSON.stringify({
          originInstanceId: 'other',
          userId: 3,
          type: 'notification.updated',
        }),
      });
      expect(spy).toHaveBeenCalledWith(3, expect.objectContaining({
        type: 'notification.updated',
      }));
    });

    it('ignora payload inválido', () => {
      const { service } = makeService();
      const spy = jest.spyOn(service as any, 'emitLocalNotificationEvent');
      (service as any).handleClusterNotification({
        channel: 'notification_events',
        payload: 'not-json',
      });
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('getEventKey', () => {
    it('formata chave por usuário', () => {
      const { service } = makeService();
      expect((service as any).getEventKey(42)).toBe('notification:42');
    });
  });
});
