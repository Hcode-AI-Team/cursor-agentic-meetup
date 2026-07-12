import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { LocaleService } from './locale.service';

const makeDeps = () => {
  const prisma = {
    createInsensitiveSearch: jest.fn().mockReturnValue([{ name: { contains: 'x' } }]),
    locale: { create: jest.fn() },
  };
  const pagination = { paginate: jest.fn().mockResolvedValue({ data: [] }) };
  return { prisma, pagination };
};

const makeService = (deps = makeDeps()) => ({
  service: new LocaleService(deps.prisma as any, deps.pagination as any),
  deps,
});

describe('LocaleService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('não define where.enabled quando enabled indefinido', async () => {
      const { service, deps } = makeService();
      await service.findAll({ page: 1, pageSize: 10 } as any);
      const opts = deps.pagination.paginate.mock.calls[0][2];
      expect(opts.where).not.toHaveProperty('enabled');
      expect(opts.where.OR).toBeDefined();
    });

    it('mapeia enabled="true" para boolean true', async () => {
      const { service, deps } = makeService();
      await service.findAll({ page: 1, pageSize: 10 } as any, undefined, 'true');
      const opts = deps.pagination.paginate.mock.calls[0][2];
      expect(opts.where.enabled).toBe(true);
    });

    it('mapeia enabled="false" para boolean false', async () => {
      const { service, deps } = makeService();
      await service.findAll({ page: 1, pageSize: 10 } as any, undefined, 'false');
      const opts = deps.pagination.paginate.mock.calls[0][2];
      expect(opts.where.enabled).toBe(false);
    });

    it('usa search explícito sobre paginationDto.search', async () => {
      const { service, deps } = makeService();
      await service.findAll({ page: 1, pageSize: 10, search: 'dto' } as any, 'explicit');
      const params = deps.prisma.createInsensitiveSearch.mock.calls[0][1];
      expect(params.search).toBe('explicit');
    });

    it('cai para paginationDto.search quando search ausente', async () => {
      const { service, deps } = makeService();
      await service.findAll({ page: 1, pageSize: 10, search: 'dto' } as any);
      const params = deps.prisma.createInsensitiveSearch.mock.calls[0][1];
      expect(params.search).toBe('dto');
    });
  });

  describe('create', () => {
    it('aplica defaults region=null e enabled=true', async () => {
      const { service, deps } = makeService();
      deps.prisma.locale.create.mockResolvedValue({ id: 1 });
      await service.create({ name: 'Portuguese', code: 'pt' } as any);
      expect(deps.prisma.locale.create).toHaveBeenCalledWith({
        data: { name: 'Portuguese', code: 'pt', region: null, enabled: true },
      });
    });

    it('respeita region e enabled fornecidos', async () => {
      const { service, deps } = makeService();
      deps.prisma.locale.create.mockResolvedValue({ id: 2 });
      await service.create({ name: 'X', code: 'x', region: 'BR', enabled: false } as any);
      expect(deps.prisma.locale.create).toHaveBeenCalledWith({
        data: { name: 'X', code: 'x', region: 'BR', enabled: false },
      });
    });
  });
});
