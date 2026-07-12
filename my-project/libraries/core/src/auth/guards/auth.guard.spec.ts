import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { IS_PUBLIC_KEY, WITH_NO_ROLE, WITH_ROLE } from '@hed-hog/api';
import { ALLOW_MCP_TOKEN } from '../../mcp/decorators/allow-mcp-token.decorator';
import { AuthGuard } from './auth.guard';

const makeContext = (request: any) => ({
  getHandler: () => 'handler',
  getClass: () => 'class',
  switchToHttp: () => ({ getRequest: () => request }),
});

const makeDeps = () => {
  const token = { verify: jest.fn() };
  const reflector = { getAllAndOverride: jest.fn() };
  const prisma = { mcp_api_key: { findFirst: jest.fn(), update: jest.fn() } };
  const security = { hashWithPepper: jest.fn().mockReturnValue('hash') };
  return { token, reflector, prisma, security };
};

const makeService = (deps = makeDeps()) => ({
  guard: new AuthGuard(
    deps.token as any,
    deps.reflector as any,
    deps.prisma as any,
    deps.security as any,
  ),
  deps,
});

const setMeta = (
  reflector: any,
  meta: {
    public?: boolean;
    withRole?: boolean;
    withNoRole?: boolean;
    allowMcpToken?: boolean;
  },
) => {
  reflector.getAllAndOverride.mockImplementation((key: any) => {
    if (key === IS_PUBLIC_KEY) return meta.public;
    if (key === WITH_ROLE) return meta.withRole;
    if (key === WITH_NO_ROLE) return meta.withNoRole;
    if (key === ALLOW_MCP_TOKEN) return meta.allowMcpToken;
    return undefined;
  });
};

describe('AuthGuard', () => {
  afterEach(() => jest.clearAllMocks());

  describe('sem token', () => {
    it('permite rota pública', async () => {
      const { guard, deps } = makeService();
      setMeta(deps.reflector, { public: true });
      const ctx = makeContext({ headers: {} });
      await expect(guard.canActivate(ctx as any)).resolves.toBe(true);
    });

    it('nega quando withRole exige autenticação', async () => {
      const { guard, deps } = makeService();
      setMeta(deps.reflector, { withRole: true });
      const ctx = makeContext({ headers: {}, method: 'GET', url: '/x' });
      await expect(guard.canActivate(ctx as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('nega quando withNoRole exige autenticação', async () => {
      const { guard, deps } = makeService();
      setMeta(deps.reflector, { withNoRole: true });
      const ctx = makeContext({ headers: {}, method: 'GET', url: '/x' });
      await expect(guard.canActivate(ctx as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('nega por padrão sem decorator', async () => {
      const { guard, deps } = makeService();
      setMeta(deps.reflector, {});
      const ctx = makeContext({ headers: {}, method: 'GET', url: '/x' });
      await expect(guard.canActivate(ctx as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('com token Bearer', () => {
    it('anexa payload quando verify resolve', async () => {
      const { guard, deps } = makeService();
      setMeta(deps.reflector, {});
      deps.token.verify.mockResolvedValue({ sub: 5 });
      const request: any = { headers: { authorization: 'Bearer tok' } };
      await expect(guard.canActivate(makeContext(request) as any)).resolves.toBe(
        true,
      );
      expect(request.auth).toEqual({ sub: 5 });
    });

    it('permite quando verify falha mas rota é pública', async () => {
      const { guard, deps } = makeService();
      setMeta(deps.reflector, { public: true });
      deps.token.verify.mockRejectedValue(new Error('bad'));
      const request: any = { headers: { authorization: 'Bearer tok' } };
      await expect(guard.canActivate(makeContext(request) as any)).resolves.toBe(
        true,
      );
    });

    it('nega quando verify falha e rota não é pública', async () => {
      const { guard, deps } = makeService();
      setMeta(deps.reflector, {});
      deps.token.verify.mockRejectedValue(new Error('invalid token'));
      const request: any = {
        headers: { authorization: 'Bearer tok' },
        method: 'GET',
        url: '/x',
      };
      await expect(guard.canActivate(makeContext(request) as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('api key (hedhog_api_)', () => {
    it('autentica com api key válida', async () => {
      const { guard, deps } = makeService();
      setMeta(deps.reflector, {});
      deps.prisma.mcp_api_key.findFirst.mockResolvedValue({
        id: 1,
        user_id: 9,
        expires_at: null,
      });
      deps.prisma.mcp_api_key.update.mockResolvedValue({});
      const request: any = {
        headers: { authorization: 'Bearer hedhog_api_secret' },
      };
      await expect(guard.canActivate(makeContext(request) as any)).resolves.toBe(
        true,
      );
      expect(request.auth).toEqual({ sub: 9, sessionId: null });
    });

    it('nega api key inexistente', async () => {
      const { guard, deps } = makeService();
      setMeta(deps.reflector, {});
      deps.prisma.mcp_api_key.findFirst.mockResolvedValue(null);
      const request: any = {
        headers: { authorization: 'Bearer hedhog_api_x' },
      };
      await expect(guard.canActivate(makeContext(request) as any)).rejects.toThrow(
        'Invalid API key',
      );
    });

    it('nega api key expirada', async () => {
      const { guard, deps } = makeService();
      setMeta(deps.reflector, {});
      deps.prisma.mcp_api_key.findFirst.mockResolvedValue({
        id: 1,
        user_id: 9,
        expires_at: new Date(Date.now() - 1000),
      });
      const request: any = {
        headers: { authorization: 'Bearer hedhog_api_x' },
      };
      await expect(guard.canActivate(makeContext(request) as any)).rejects.toThrow(
        'API key expired',
      );
    });

    it('api key inválida em rota pública retorna true', async () => {
      const { guard, deps } = makeService();
      setMeta(deps.reflector, { public: true });
      deps.prisma.mcp_api_key.findFirst.mockResolvedValue(null);
      const request: any = {
        headers: { authorization: 'Bearer hedhog_api_x' },
      };
      await expect(guard.canActivate(makeContext(request) as any)).resolves.toBe(
        true,
      );
    });
  });

  describe('mcp token (hedhog_mcp_)', () => {
    it('defere para o McpAuthGuard quando a rota permite (allowMcpToken)', async () => {
      const { guard, deps } = makeService();
      setMeta(deps.reflector, { allowMcpToken: true });
      const request: any = {
        headers: { authorization: 'Bearer hedhog_mcp_x' },
      };
      await expect(guard.canActivate(makeContext(request) as any)).resolves.toBe(
        true,
      );
      expect(deps.token.verify).not.toHaveBeenCalled();
      expect(deps.prisma.mcp_api_key.findFirst).not.toHaveBeenCalled();
      expect(request.auth).toBeUndefined();
    });

    it('nega em rota sem allowMcpToken, sem tentar validar como JWT', async () => {
      const { guard, deps } = makeService();
      setMeta(deps.reflector, {});
      const request: any = {
        headers: { authorization: 'Bearer hedhog_mcp_x' },
        method: 'GET',
        url: '/profile',
      };
      await expect(guard.canActivate(makeContext(request) as any)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(deps.token.verify).not.toHaveBeenCalled();
    });

    it('permite em rota pública sem allowMcpToken', async () => {
      const { guard, deps } = makeService();
      setMeta(deps.reflector, { public: true });
      const request: any = {
        headers: { authorization: 'Bearer hedhog_mcp_x' },
      };
      await expect(guard.canActivate(makeContext(request) as any)).resolves.toBe(
        true,
      );
    });
  });
});
