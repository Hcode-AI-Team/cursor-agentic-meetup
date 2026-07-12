import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { McpPermissionGuard } from './mcp-permission.guard';

const makeContext = (request: any) => ({
  switchToHttp: () => ({ getRequest: () => request }),
});

const makeService = () => {
  const prisma = { route: { count: jest.fn() } };
  return { guard: new McpPermissionGuard(prisma as any), prisma };
};

describe('McpPermissionGuard', () => {
  afterEach(() => jest.clearAllMocks());

  it('permite métodos não-POST', async () => {
    const { guard } = makeService();
    await expect(
      guard.canActivate(makeContext({ method: 'GET' }) as any),
    ).resolves.toBe(true);
  });

  it('permite POST sem tools/call (ex.: tools/list)', async () => {
    const { guard, prisma } = makeService();
    await expect(
      guard.canActivate(
        makeContext({ method: 'POST', body: { method: 'tools/list' } }) as any,
      ),
    ).resolves.toBe(true);
    expect(prisma.route.count).not.toHaveBeenCalled();
  });

  it('permite tools/call quando usuário tem permissão', async () => {
    const { guard, prisma } = makeService();
    prisma.route.count.mockResolvedValue(1);
    const request = {
      method: 'POST',
      body: { method: 'tools/call', params: { name: 'my_tool' } },
      auth: { sub: 2 },
    };
    await expect(guard.canActivate(makeContext(request) as any)).resolves.toBe(
      true,
    );
    expect(prisma.route.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tool_name: 'my_tool' }),
      }),
    );
  });

  it('nega tools/call sem permissão', async () => {
    const { guard, prisma } = makeService();
    prisma.route.count.mockResolvedValue(0);
    const request = {
      method: 'POST',
      body: { method: 'tools/call', params: { name: 'secret_tool' } },
      auth: { sub: 2 },
    };
    await expect(guard.canActivate(makeContext(request) as any)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
