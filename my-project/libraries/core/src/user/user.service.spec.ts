import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';

const makeDeps = () => {
  const prismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    role: { findUnique: jest.fn(), findMany: jest.fn() },
    role_user: { findFirst: jest.fn(), create: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
    user_credential: { updateMany: jest.fn(), create: jest.fn() },
    user_activity: { create: jest.fn() },
    user_change_log: { create: jest.fn() },
    user_identifier: { findFirst: jest.fn() },
    file: { delete: jest.fn() },
    $transaction: jest.fn(),
  };
  const paginationService = { paginatePrismaModel: jest.fn() };
  const security = { hashArgon2: jest.fn().mockResolvedValue('hashed') };
  const challenge = { verifyEmail: jest.fn() };
  const file = { upload: jest.fn(), delete: jest.fn(), getBuffer: jest.fn() };
  const integrationApi = { publishEvent: jest.fn().mockResolvedValue(undefined) };
  const settingService = { getSettingValues: jest.fn().mockResolvedValue({}) };
  return {
    prismaService,
    paginationService,
    security,
    challenge,
    file,
    integrationApi,
    settingService,
  };
};

const makeService = (deps = makeDeps()) => ({
  service: new UserService(
    deps.prismaService as any,
    deps.paginationService as any,
    deps.security as any,
    deps.challenge as any,
    deps.file as any,
    deps.integrationApi as any,
    deps.settingService as any,
  ),
  deps,
});

describe('UserService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('registerUserActivity', () => {
    it('ignora ids inválidos', async () => {
      const { service, deps } = makeService();
      await expect(service.registerUserActivity(null, 'x')).resolves.toBeNull();
      await expect(service.registerUserActivity(0, 'x')).resolves.toBeNull();
      await expect(service.registerUserActivity(-1, 'x')).resolves.toBeNull();
      await expect(service.registerUserActivity(1.5, 'x')).resolves.toBeNull();
      expect(deps.prismaService.user_activity.create).not.toHaveBeenCalled();
    });

    it('registra atividade para id válido', async () => {
      const { service, deps } = makeService();
      deps.prismaService.user_activity.create.mockResolvedValue({ id: 1 });
      await service.registerUserActivity(5, 'login');
      expect(deps.prismaService.user_activity.create).toHaveBeenCalledWith({
        data: { user_id: 5, action: 'login' },
      });
    });
  });

  describe('generateRandomPassword', () => {
    const allChars =
      'abcdefghijkmnopqrstuvwxyz' +
      'ABCDEFGHJKLMNPQRSTUVWXYZ' +
      '23456789' +
      '@#$%&*!?-_+';

    it('gera senha do tamanho padrão (16)', () => {
      const { service } = makeService();
      const pwd = (service as any).generateRandomPassword();
      expect(pwd).toHaveLength(16);
      for (const ch of pwd) expect(allChars).toContain(ch);
    });

    it('respeita tamanho customizado', () => {
      const { service } = makeService();
      expect((service as any).generateRandomPassword(24)).toHaveLength(24);
    });
  });

  describe('mapRolesWithAssignment', () => {
    it('marca atribuídas e resolve locale com fallback', () => {
      const { service } = makeService();
      const allRoles = [
        {
          id: 1,
          slug: 'admin',
          role_locale: [
            { locale: { code: 'en' }, name: 'Admin', description: 'A' },
            { locale: { code: 'pt' }, name: 'Adm', description: 'Ap' },
          ],
        },
        {
          id: 2,
          slug: 'user',
          role_locale: [{ locale: { code: 'fr' }, name: 'Utilisateur', description: 'U' }],
        },
      ];
      const userRoles = [{ role_id: 1 }];
      const result = (service as any).mapRolesWithAssignment('pt', allRoles, userRoles);
      expect(result[0]).toMatchObject({ id: 1, name: 'Adm', isAssigned: true });
      // role 2 não tem locale 'pt' -> fallback para o primeiro
      expect(result[1]).toMatchObject({ id: 2, name: 'Utilisateur', isAssigned: false });
    });
  });

  describe('findUserById', () => {
    it('lança NotFound quando ausente', async () => {
      const { service, deps } = makeService();
      deps.prismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.findUserById('en', 9)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findUserByEmail', () => {
    it('normaliza email (minúsculas + trim)', async () => {
      const { service, deps } = makeService();
      deps.prismaService.user.findFirst.mockResolvedValue(null);
      await service.findUserByEmail('en', '  User@Example.COM  ');
      const where = deps.prismaService.user.findFirst.mock.calls[0][0].where;
      expect(where.user_identifier.some.value).toBe('user@example.com');
    });
  });

  describe('delete', () => {
    it('lança BadRequest sem ids', async () => {
      const { service } = makeService();
      await expect(service.delete('en', { ids: [] } as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lança NotFound quando algum id não existe', async () => {
      const { service, deps } = makeService();
      deps.prismaService.user.findMany.mockResolvedValue([{ id: 1 }]);
      await expect(service.delete('en', { ids: [1, 2] } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('remove usuários e publica evento', async () => {
      const { service, deps } = makeService();
      deps.prismaService.user.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      deps.prismaService.user.deleteMany.mockResolvedValue({ count: 2 });
      const result = await service.delete('en', { ids: [1, 2] } as any);
      expect(result).toEqual({ count: 2 });
      expect(deps.integrationApi.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'core.user.deleted' }),
      );
    });
  });

  describe('update', () => {
    it('registra mudança quando nome altera', async () => {
      const { service, deps } = makeService();
      deps.prismaService.user.findUnique.mockResolvedValue({ id: 1, name: 'Old' });
      deps.prismaService.user.update.mockResolvedValue({ id: 1, name: 'New' });
      deps.prismaService.user_change_log.create.mockResolvedValue({ id: 1 });
      await service.update('en', 1, { name: 'New' } as any, 9);
      expect(deps.prismaService.user_change_log.create).toHaveBeenCalled();
    });

    it('não registra mudança quando nome igual', async () => {
      const { service, deps } = makeService();
      deps.prismaService.user.findUnique.mockResolvedValue({ id: 1, name: 'Same' });
      deps.prismaService.user.update.mockResolvedValue({ id: 1, name: 'Same' });
      await service.update('en', 1, { name: 'Same' } as any);
      expect(deps.prismaService.user_change_log.create).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('cria credencial quando nenhuma existe (count 0)', async () => {
      const { service, deps } = makeService();
      deps.prismaService.user.findUnique.mockResolvedValue({ id: 1 });
      deps.prismaService.user_credential.updateMany.mockResolvedValue({ count: 0 });
      deps.prismaService.user_credential.create.mockResolvedValue({ id: 1 });
      deps.prismaService.user_activity.create.mockResolvedValue({ id: 1 });
      deps.prismaService.user_change_log.create.mockResolvedValue({ id: 1 });

      const result = await service.resetPassword('en', 1, { password: 'MyPass1!' } as any);
      expect(deps.prismaService.user_credential.create).toHaveBeenCalled();
      expect(result).toEqual({ password: 'MyPass1!', requiresReset: true });
    });

    it('gera senha aleatória quando não informada', async () => {
      const { service, deps } = makeService();
      deps.prismaService.user.findUnique.mockResolvedValue({ id: 1 });
      deps.prismaService.user_credential.updateMany.mockResolvedValue({ count: 1 });
      deps.prismaService.user_activity.create.mockResolvedValue({ id: 1 });
      deps.prismaService.user_change_log.create.mockResolvedValue({ id: 1 });

      const result = await service.resetPassword('en', 1, {} as any);
      expect(result.password).toHaveLength(16);
      expect(result.requiresReset).toBe(true);
    });
  });

  describe('recordUserChange', () => {
    it('serializa before/after e trata undefined como null', async () => {
      const { service, deps } = makeService();
      deps.prismaService.user_change_log.create.mockResolvedValue({ id: 1 });
      await (service as any).recordUserChange({
        targetUserId: 1,
        action: 'update',
        beforeData: { a: 1 },
      });
      const data = deps.prismaService.user_change_log.create.mock.calls[0][0].data;
      expect(data.before_data).toBe('{"a":1}');
      expect(data.after_data).toBeNull();
      expect(data.actor_user_id).toBeNull();
    });

    it('retorna null em erro do prisma', async () => {
      const { service, deps } = makeService();
      deps.prismaService.user_change_log.create.mockRejectedValue(new Error('x'));
      await expect(
        (service as any).recordUserChange({ targetUserId: 1, action: 'update' }),
      ).resolves.toBeNull();
    });
  });

  describe('listUserActivities', () => {
    it('mapeia atividades com createdAt ISO', async () => {
      const { service, deps } = makeService();
      deps.prismaService.user.findUnique.mockResolvedValue({ id: 1 });
      deps.paginationService.paginatePrismaModel.mockResolvedValue({
        data: [{ id: 7, action: 'login', created_at: new Date('2026-01-01T00:00:00Z') }],
        total: 1,
      });
      const result = await service.listUserActivities('en', 1, {});
      expect(result.data[0]).toEqual({
        id: '7',
        action: 'login',
        createdAt: '2026-01-01T00:00:00.000Z',
      });
    });
  });
});
