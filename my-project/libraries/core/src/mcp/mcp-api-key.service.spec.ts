import { NotFoundException } from '@nestjs/common';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { McpApiKeyService } from './mcp-api-key.service';

const makeService = () => {
  const prisma = {
    mcp_api_key: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const security = {
    randomOpaque: jest.fn(() => 'abcdefghijklmnopqrstuvwxyz0123456789'),
    hashWithPepper: jest.fn((v: string) => `hash(${v})`),
  };
  const pagination = {
    paginatePrismaModel: jest.fn(),
  };
  const service = new McpApiKeyService(prisma as any, security as any, pagination as any);
  return { service, prisma, security, pagination };
};

describe('McpApiKeyService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('pagina apenas as chaves ativas do usuário e devolve o resultado', async () => {
      const { service, prisma, pagination } = makeService();
      const paginated = { data: [], total: 0 };
      pagination.paginatePrismaModel.mockResolvedValue(paginated);

      const result = await service.list(42, { page: 1, pageSize: 10 } as any);

      expect(result).toBe(paginated);
      expect(pagination.paginatePrismaModel).toHaveBeenCalledWith(
        prisma.mcp_api_key,
        expect.objectContaining({
          page: 1,
          pageSize: 10,
          where: { user_id: 42, revoked_at: null },
          orderBy: { created_at: 'desc' },
        }),
      );
    });
  });

  describe('create', () => {
    it('usa o prefixo mcp por padrão e monta hash/prefixo do token', async () => {
      const { service, prisma, security } = makeService();
      prisma.mcp_api_key.create.mockResolvedValue({
        id: 1,
        name: 'my key',
        type: 'mcp',
        token_prefix: 'hedhog_mcp_abcde',
        created_at: new Date('2026-01-01'),
      });

      const result = await service.create(7, 'my key');

      const rawToken = 'hedhog_mcp_abcdefghijklmnopqrstuvwxyz0123456789';
      expect(security.randomOpaque).toHaveBeenCalledWith(36);
      expect(security.hashWithPepper).toHaveBeenCalledWith(rawToken);
      expect(prisma.mcp_api_key.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            user_id: 7,
            name: 'my key',
            type: 'mcp',
            token_hash: `hash(${rawToken})`,
            token_prefix: 'hedhog_mcp_abcde',
          },
        }),
      );
      // O rawToken (em claro) só é devolvido uma vez, na criação.
      expect(result.rawToken).toBe(rawToken);
      expect(result.id).toBe(1);
    });

    it('usa o prefixo api quando type = api', async () => {
      const { service, prisma } = makeService();
      prisma.mcp_api_key.create.mockResolvedValue({ id: 2 });

      const result = await service.create(7, 'api key', 'api');

      expect(result.rawToken).toBe('hedhog_api_abcdefghijklmnopqrstuvwxyz0123456789');
      expect(prisma.mcp_api_key.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'api', token_prefix: 'hedhog_api_abcde' }),
        }),
      );
    });
  });

  describe('revoke', () => {
    it('lança NotFoundException quando a chave não existe para o usuário', async () => {
      const { service, prisma } = makeService();
      prisma.mcp_api_key.findFirst.mockResolvedValue(null);

      await expect(service.revoke(7, 99)).rejects.toThrow(NotFoundException);
      expect(prisma.mcp_api_key.update).not.toHaveBeenCalled();
    });

    it('marca revoked_at e retorna success quando a chave existe', async () => {
      const { service, prisma } = makeService();
      prisma.mcp_api_key.findFirst.mockResolvedValue({ id: 5, user_id: 7 });
      prisma.mcp_api_key.update.mockResolvedValue({});

      const result = await service.revoke(7, 5);

      expect(prisma.mcp_api_key.findFirst).toHaveBeenCalledWith({
        where: { id: 5, user_id: 7 },
      });
      expect(prisma.mcp_api_key.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: expect.objectContaining({ revoked_at: expect.any(Date) }),
        }),
      );
      expect(result).toEqual({ success: true });
    });
  });
});
