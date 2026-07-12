import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { McpAuthGuard } from './mcp-auth.guard';

const makeContext = (request: any) => ({
  switchToHttp: () => ({ getRequest: () => request }),
});

const makeDeps = () => {
  const tokenService = { verify: jest.fn() };
  const prisma = { mcp_api_key: { findFirst: jest.fn(), update: jest.fn() } };
  const security = { hashWithPepper: jest.fn().mockReturnValue('hash') };
  return { tokenService, prisma, security };
};

const makeService = (deps = makeDeps()) => ({
  guard: new McpAuthGuard(
    deps.tokenService as any,
    deps.prisma as any,
    deps.security as any,
  ),
  deps,
});

describe('McpAuthGuard', () => {
  afterEach(() => jest.clearAllMocks());

  it('nega sem token', async () => {
    const { guard } = makeService();
    await expect(
      guard.canActivate(makeContext({ headers: {} }) as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('verifica token JWT normal', async () => {
    const { guard, deps } = makeService();
    deps.tokenService.verify.mockResolvedValue({ sub: 4 });
    const request: any = { headers: { authorization: 'Bearer tok' } };
    await expect(guard.canActivate(makeContext(request) as any)).resolves.toBe(
      true,
    );
    expect(request.auth).toEqual({ sub: 4 });
  });

  it('autentica com api key mcp válida', async () => {
    const { guard, deps } = makeService();
    deps.prisma.mcp_api_key.findFirst.mockResolvedValue({
      id: 1,
      user_id: 8,
      expires_at: null,
    });
    deps.prisma.mcp_api_key.update.mockResolvedValue({});
    const request: any = {
      headers: { authorization: 'Bearer hedhog_mcp_x' },
    };
    await expect(guard.canActivate(makeContext(request) as any)).resolves.toBe(
      true,
    );
    expect(request.auth).toEqual({ sub: 8, sessionId: null });
  });

  it('nega api key mcp inexistente', async () => {
    const { guard, deps } = makeService();
    deps.prisma.mcp_api_key.findFirst.mockResolvedValue(null);
    const request: any = {
      headers: { authorization: 'Bearer hedhog_mcp_x' },
    };
    await expect(guard.canActivate(makeContext(request) as any)).rejects.toThrow(
      'MCP: Invalid API key',
    );
  });

  it('nega api key mcp expirada', async () => {
    const { guard, deps } = makeService();
    deps.prisma.mcp_api_key.findFirst.mockResolvedValue({
      id: 1,
      user_id: 8,
      expires_at: new Date(Date.now() - 1000),
    });
    const request: any = {
      headers: { authorization: 'Bearer hedhog_mcp_x' },
    };
    await expect(guard.canActivate(makeContext(request) as any)).rejects.toThrow(
      'MCP: API key expired',
    );
  });
});
