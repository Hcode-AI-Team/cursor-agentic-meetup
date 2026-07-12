import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionService } from './session.service';

const makeDeps = () => {
  const prisma = {
    user_session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const security = {
    hashWithPepper: jest.fn((v: string) => `hash(${v})`),
  };
  const setting = {
    getSettingValues: jest.fn().mockResolvedValue({}),
  };
  const token = {
    createOpaqueToken: jest.fn().mockResolvedValue('opaque'),
    removeRefreshTokenCookie: jest.fn().mockResolvedValue(undefined),
  };
  const http = { get: jest.fn() };
  const user = { registerUserActivity: jest.fn().mockResolvedValue(undefined) };
  const paginationService = { paginatePrismaModel: jest.fn() };
  return { prisma, security, setting, token, http, user, paginationService };
};

const makeService = (deps = makeDeps()) => ({
  service: new SessionService(
    deps.prisma as any,
    deps.security as any,
    deps.setting as any,
    deps.token as any,
    deps.http as any,
    deps.user as any,
    deps.paginationService as any,
  ),
  deps,
});

describe('SessionService', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('create - validações', () => {
    it('lança BadRequest sem userId', async () => {
      const { service } = makeService();
      await expect(
        service.create('en', 0 as any, '1.2.3.4', 'ua'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequest sem ipAddress', async () => {
      const { service } = makeService();
      await expect(service.create('en', 1, '', 'ua')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lança BadRequest sem userAgent', async () => {
      const { service } = makeService();
      await expect(service.create('en', 1, '1.2.3.4', '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cria sessão com expiração default (43200 min) quando setting ausente', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-15T12:00:00Z'));
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue({});
      deps.prisma.user_session.create.mockResolvedValue({ id: 1 });

      const result = await service.create('en', 5, '1.2.3.4', 'ua', 'br-1');

      expect(result.token).toBe('opaque');
      const createArg = deps.prisma.user_session.create.mock.calls[0][0];
      expect(createArg.data.hash).toBe('hash(opaque)');
      expect(createArg.data.browser_id).toBe('br-1');
      const expected = new Date(
        Date.parse('2026-01-15T12:00:00Z') + 43200 * 60 * 1000,
      );
      expect(createArg.data.expires_at.getTime()).toBe(expected.getTime());
    });

    it('aciona enforceSessionLimit quando max-concurrent-sessions > 0', async () => {
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue({
        'max-concurrent-sessions': 2,
      });
      deps.prisma.user_session.findMany.mockResolvedValue([]);
      deps.prisma.user_session.create.mockResolvedValue({ id: 1 });

      await service.create('en', 5, '1.2.3.4', 'ua');

      expect(deps.prisma.user_session.findMany).toHaveBeenCalled();
    });
  });

  describe('enforceSessionLimit', () => {
    const run = (
      deps: ReturnType<typeof makeDeps>,
      service: SessionService,
      sessions: Array<{ id: number; browser_id: string | null }>,
      maxSessions: number,
      isRotation: boolean,
      currentBrowserId?: string | null,
    ) => {
      deps.prisma.user_session.findMany.mockResolvedValue(sessions);
      return (service as any).enforceSessionLimit(
        7,
        maxSessions,
        isRotation,
        currentBrowserId,
      );
    };

    it('não revoga quando abaixo do limite', async () => {
      const { service, deps } = makeService();
      await run(
        deps,
        service,
        [{ id: 1, browser_id: 'a' }],
        3,
        false,
        'b',
      );
      expect(deps.prisma.user_session.updateMany).not.toHaveBeenCalled();
    });

    it('agrupa sessões do mesmo browser em um único slot', async () => {
      const { service, deps } = makeService();
      await run(
        deps,
        service,
        [
          { id: 1, browser_id: 'a' },
          { id: 2, browser_id: 'a' },
        ],
        1,
        false,
        'a', // browser já tem slot -> isNewSlot false, currentSlotCount=1, revoke=1-1+0=0
      );
      expect(deps.prisma.user_session.updateMany).not.toHaveBeenCalled();
    });

    it('cada browser_id null conta como slot próprio', async () => {
      const { service, deps } = makeService();
      await run(
        deps,
        service,
        [
          { id: 1, browser_id: null },
          { id: 2, browser_id: null },
        ],
        1,
        false,
        null, // novo slot: currentSlotCount=2, revoke=2-1+1=2 -> revoga ambos
      );
      expect(deps.prisma.user_session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: [1, 2] } },
        }),
      );
    });

    it('revoga o slot mais antigo quando novo browser excede o limite', async () => {
      const { service, deps } = makeService();
      await run(
        deps,
        service,
        [
          { id: 1, browser_id: 'old' },
          { id: 2, browser_id: 'mid' },
        ],
        2,
        false,
        'new', // currentSlotCount=2, isNewSlot true, revoke=2-2+1=1 -> revoga slot 0 (id 1)
      );
      expect(deps.prisma.user_session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: [1] } } }),
      );
    });

    it('rotação não abre novo slot', async () => {
      const { service, deps } = makeService();
      await run(
        deps,
        service,
        [
          { id: 1, browser_id: 'a' },
          { id: 2, browser_id: 'b' },
        ],
        2,
        true, // rotation: isNewSlot false, revoke=2-2+0=0
        'c',
      );
      expect(deps.prisma.user_session.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('lança Unauthorized sem refreshToken', async () => {
      const { service } = makeService();
      await expect(
        service.refresh('en', '', '1.2.3.4', 'ua'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança Unauthorized quando hash não encontrado', async () => {
      const { service, deps } = makeService();
      deps.prisma.user_session.findFirst.mockResolvedValue(null);
      await expect(
        service.refresh('en', 'tok', '1.2.3.4', 'ua'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança Unauthorized quando sessão revogada', async () => {
      const { service, deps } = makeService();
      deps.prisma.user_session.findFirst.mockResolvedValue({
        id: 1,
        user_id: 5,
        revoked_at: new Date(),
        expires_at: new Date(Date.now() + 100000),
      });
      await expect(
        service.refresh('en', 'tok', '1.2.3.4', 'ua'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança Unauthorized quando sessão expirada', async () => {
      const { service, deps } = makeService();
      deps.prisma.user_session.findFirst.mockResolvedValue({
        id: 1,
        user_id: 5,
        revoked_at: null,
        expires_at: new Date(Date.now() - 1000),
      });
      await expect(
        service.refresh('en', 'tok', '1.2.3.4', 'ua'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança Unauthorized em corrida (updateResult.count === 0)', async () => {
      const { service, deps } = makeService();
      deps.prisma.user_session.findFirst.mockResolvedValue({
        id: 1,
        user_id: 5,
        ip_address: '9.9.9.9',
        user_agent: 'old-ua',
        revoked_at: null,
        expires_at: new Date(Date.now() + 100000),
        browser_id: 'br',
      });
      const tx = {
        user_session: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          create: jest.fn().mockResolvedValue({ id: 2 }),
        },
      };
      deps.prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

      await expect(
        service.refresh('en', 'tok', '1.2.3.4', 'ua'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rotaciona sessão e usa fallback de ip/ua quando vazios', async () => {
      const { service, deps } = makeService();
      deps.prisma.user_session.findFirst.mockResolvedValue({
        id: 1,
        user_id: 5,
        ip_address: '9.9.9.9',
        user_agent: 'old-ua',
        revoked_at: null,
        expires_at: new Date(Date.now() + 100000),
        browser_id: 'br',
      });
      const tx = {
        user_session: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn().mockResolvedValue({ id: 2 }),
        },
      };
      deps.prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

      const result = await service.refresh('en', 'tok', '   ', '');

      expect(result.token).toBe('opaque');
      expect(result.session).toEqual({ id: 2 });
      const createArg = tx.user_session.create.mock.calls[0][0];
      expect(createArg.data.ip_address).toBe('9.9.9.9');
      expect(createArg.data.user_agent).toBe('old-ua');
      expect(createArg.data.browser_id).toBe('br');
    });
  });

  describe('getUserSessions - paginação', () => {
    it('lança BadRequest quando usuário não existe', async () => {
      const { service, deps } = makeService();
      deps.prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.getUserSessions({ page: 1, pageSize: 10 } as any, 1, 'en'),
      ).rejects.toThrow(BadRequestException);
    });

    it('calcula lastPage e trata IP localhost', async () => {
      const { service, deps } = makeService();
      deps.prisma.user.findUnique.mockResolvedValue({ id: 1 });
      deps.paginationService.paginatePrismaModel.mockResolvedValue({
        data: [{ id: 1, ip_address: '127.0.0.1' }],
        total: 25,
        page: 1,
        pageSize: 10,
      });

      const result = await service.getUserSessions(
        { page: 1, pageSize: 10 } as any,
        1,
        'en',
      );

      expect(result.lastPage).toBe(3); // ceil(25/10)
      expect(result.total).toBe(25);
      expect(result.data[0].location).toEqual({
        ip: '127.0.0.1',
        country: 'Localhost',
        region: '',
        city: '',
      });
    });
  });

  describe('revokeUserSession', () => {
    it('lança NotFound quando sessão não pertence ao usuário', async () => {
      const { service, deps } = makeService();
      deps.prisma.user_session.findFirst.mockResolvedValue(null);
      await expect(
        service.revokeUserSession(1, 99, 'en'),
      ).rejects.toThrow('Session not found or does not belong to user');
    });

    it('revoga sessão existente e registra atividade', async () => {
      const { service, deps } = makeService();
      deps.prisma.user_session.findFirst.mockResolvedValue({ id: 5 });
      deps.prisma.user_session.update.mockResolvedValue({ id: 5 });

      await service.revokeUserSession(1, 5, 'en');

      expect(deps.user.registerUserActivity).toHaveBeenCalledWith(
        1,
        'revokeSession',
      );
      expect(deps.prisma.user_session.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5 } }),
      );
    });
  });
});
