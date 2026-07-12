import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  ForbiddenException,
  RequestMethod,
  UnauthorizedException,
} from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY, WITH_NO_ROLE, WITH_ROLE } from '@hed-hog/api';
import { RoleGuard } from './role.guard';

const CTRL = 'CTRL';
const HANDLER = 'HANDLER';

const makeContext = (request: any) => ({
  getHandler: () => HANDLER,
  getClass: () => CTRL,
  switchToHttp: () => ({ getRequest: () => request }),
});

const makeDeps = () => {
  const reflector = { getAllAndOverride: jest.fn(), get: jest.fn() };
  const prisma = {
    route: { count: jest.fn() },
    user_credential: { findFirst: jest.fn() },
  };
  return { reflector, prisma };
};

const makeService = (deps = makeDeps()) => ({
  guard: new RoleGuard(deps.reflector as any, deps.prisma as any),
  deps,
});

const setMeta = (
  reflector: any,
  meta: { public?: boolean; withRole?: boolean; withNoRole?: boolean },
) => {
  reflector.getAllAndOverride.mockImplementation((key: any) => {
    if (key === IS_PUBLIC_KEY) return meta.public;
    if (key === WITH_ROLE) return meta.withRole;
    if (key === WITH_NO_ROLE) return meta.withNoRole;
    return undefined;
  });
};

const setPath = (
  reflector: any,
  controllerPath: string,
  methodPath: string,
  method: RequestMethod,
) => {
  reflector.get.mockImplementation((key: any, target: any) => {
    if (key === 'path') return target === CTRL ? controllerPath : methodPath;
    if (key === METHOD_METADATA) return method;
    return undefined;
  });
};

describe('RoleGuard', () => {
  afterEach(() => jest.clearAllMocks());

  it('permite rota pública', async () => {
    const { guard, deps } = makeService();
    setMeta(deps.reflector, { public: true });
    await expect(
      guard.canActivate(makeContext({ headers: {} }) as any),
    ).resolves.toBe(true);
  });

  it('permite withNoRole', async () => {
    const { guard, deps } = makeService();
    setMeta(deps.reflector, { withNoRole: true });
    await expect(
      guard.canActivate(makeContext({ headers: {} }) as any),
    ).resolves.toBe(true);
  });

  it('permite quando não há withRole', async () => {
    const { guard, deps } = makeService();
    setMeta(deps.reflector, {});
    await expect(
      guard.canActivate(makeContext({ headers: {} }) as any),
    ).resolves.toBe(true);
  });

  it('nega sem token quando withRole', async () => {
    const { guard, deps } = makeService();
    setMeta(deps.reflector, { withRole: true });
    setPath(deps.reflector, 'user', 'list', RequestMethod.GET);
    const request = { headers: {} };
    await expect(guard.canActivate(makeContext(request) as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('permite quando rota autorizada e sem reset pendente', async () => {
    const { guard, deps } = makeService();
    setMeta(deps.reflector, { withRole: true });
    setPath(deps.reflector, 'user', '', RequestMethod.GET);
    deps.prisma.route.count.mockResolvedValue(1);
    deps.prisma.user_credential.findFirst.mockResolvedValue(null);
    const request = {
      headers: { authorization: 'Bearer tok' },
      auth: { sub: 3 },
    };
    await expect(guard.canActivate(makeContext(request) as any)).resolves.toBe(
      true,
    );
    expect(deps.prisma.route.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ url: '/user' }) }),
    );
  });

  it('nega (Forbidden) quando rota não autorizada', async () => {
    const { guard, deps } = makeService();
    setMeta(deps.reflector, { withRole: true });
    setPath(deps.reflector, 'user', 'secret', RequestMethod.POST);
    deps.prisma.route.count.mockResolvedValue(0);
    const request = {
      headers: { authorization: 'Bearer tok' },
      auth: { sub: 3 },
    };
    await expect(guard.canActivate(makeContext(request) as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('nega quando há reset de senha pendente em rota não permitida', async () => {
    const { guard, deps } = makeService();
    setMeta(deps.reflector, { withRole: true });
    setPath(deps.reflector, 'user', 'list', RequestMethod.GET);
    deps.prisma.route.count.mockResolvedValue(1);
    deps.prisma.user_credential.findFirst.mockResolvedValue({ id: 1 });
    const request = {
      headers: { authorization: 'Bearer tok' },
      auth: { sub: 3 },
    };
    await expect(guard.canActivate(makeContext(request) as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('permite reset pendente em rota liberada (PUT /profile/change-password)', async () => {
    const { guard, deps } = makeService();
    setMeta(deps.reflector, { withRole: true });
    setPath(deps.reflector, 'profile', 'change-password', RequestMethod.PUT);
    deps.prisma.route.count.mockResolvedValue(1);
    deps.prisma.user_credential.findFirst.mockResolvedValue({ id: 1 });
    const request = {
      headers: { authorization: 'Bearer tok' },
      auth: { sub: 3 },
    };
    await expect(guard.canActivate(makeContext(request) as any)).resolves.toBe(
      true,
    );
  });
});
