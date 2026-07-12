import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('@hed-hog/api-prisma', () => ({
  __esModule: true,
  PrismaService: class {},
  Prisma: {
    sql: (...args: any[]) => ({ __sql: args }),
    raw: (v: string) => ({ __raw: v }),
  },
}));

jest.mock('@hed-hog/api-pagination', () => ({
  __esModule: true,
  PaginationService: class {},
}));

jest.mock('geoip-lite', () => ({
  __esModule: true,
  lookup: jest.fn(),
}));

jest.mock('ua-parser-js', () => ({
  __esModule: true,
  UAParser: jest.fn(),
}));

import * as geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';
import { AccessLogService } from './access-log.service';

const mockLookup = geoip.lookup as unknown as jest.Mock;
const mockUAParser = UAParser as unknown as jest.Mock;

const makeService = () => {
  const prisma = {
    access_log: { create: jest.fn() },
    $executeRaw: jest.fn(),
  };
  const pagination = {
    paginate: jest.fn(),
  };
  const service = new AccessLogService(prisma as any, pagination as any);
  return { service, prisma, pagination };
};

describe('AccessLogService', () => {
  beforeEach(() => {
    mockUAParser.mockImplementation(() => ({
      getResult: () => ({
        browser: { name: 'Chrome', version: '120' },
        os: { name: 'Windows', version: '11' },
      }),
    }));
    mockLookup.mockReturnValue({ country: 'BR', city: 'Sao Paulo' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordHttp', () => {
    it('persiste o log HTTP com os campos mapeados', () => {
      const { service, prisma } = makeService();
      prisma.access_log.create.mockResolvedValue({});

      service.recordHttp({
        userId: 3,
        ip: '1.2.3.4',
        userAgent: 'UA',
        method: 'GET',
        path: '/api/x',
      });

      expect(prisma.access_log.create).toHaveBeenCalledWith({
        data: {
          user_id: 3,
          ip: '1.2.3.4',
          user_agent: 'UA',
          method: 'GET',
          path: '/api/x',
        },
      });
    });

    it('usa null para campos opcionais ausentes', () => {
      const { service, prisma } = makeService();
      prisma.access_log.create.mockResolvedValue({});

      service.recordHttp({ method: 'POST', path: '/x' });

      expect(prisma.access_log.create).toHaveBeenCalledWith({
        data: { user_id: null, ip: null, user_agent: null, method: 'POST', path: '/x' },
      });
    });

    it('não propaga erro de persistência (loga warn)', async () => {
      const { service, prisma } = makeService();
      prisma.access_log.create.mockRejectedValue(new Error('db down'));
      const warnSpy = jest
        .spyOn((service as any).logger, 'warn')
        .mockImplementation(() => undefined);

      expect(() => service.recordHttp({ method: 'GET', path: '/x' })).not.toThrow();
      await new Promise((r) => process.nextTick(r));

      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('recordMcp', () => {
    it('persiste o log MCP com tool e prompt', () => {
      const { service, prisma } = makeService();
      prisma.access_log.create.mockResolvedValue({});

      service.recordMcp({ userId: 9, mcpTool: 'search', mcpPrompt: 'q' });

      expect(prisma.access_log.create).toHaveBeenCalledWith({
        data: { user_id: 9, mcp_tool: 'search', mcp_prompt: 'q' },
      });
    });
  });

  describe('list', () => {
    const paginateResult = (data: any[]) => ({ data, total: data.length, page: 1 });

    it('sem filtros usa where vazio e mantém orderBy/include', async () => {
      const { service, pagination } = makeService();
      pagination.paginate.mockResolvedValue(paginateResult([]));

      await service.list({});

      const [, , opts] = pagination.paginate.mock.calls[0];
      expect(opts.where).toEqual({});
      expect(opts.orderBy).toEqual({ created_at: 'desc' });
      expect(opts.include.user.select).toMatchObject({ id: true, name: true });
    });

    it('filtra por userId', async () => {
      const { service, pagination } = makeService();
      pagination.paginate.mockResolvedValue(paginateResult([]));

      await service.list({ userId: 5 });

      expect(pagination.paginate.mock.calls[0][2].where).toMatchObject({ user_id: 5 });
    });

    it('filtra por userSearch com contains insensitive', async () => {
      const { service, pagination } = makeService();
      pagination.paginate.mockResolvedValue(paginateResult([]));

      await service.list({ userSearch: 'ana' });

      expect(pagination.paginate.mock.calls[0][2].where.user).toEqual({
        OR: [{ name: { contains: 'ana', mode: 'insensitive' } }],
      });
    });

    it('monta o range de datas com fim de dia em createdAtTo', async () => {
      const { service, pagination } = makeService();
      pagination.paginate.mockResolvedValue(paginateResult([]));

      await service.list({ createdAtFrom: '2026-01-01', createdAtTo: '2026-01-31' });

      const where = pagination.paginate.mock.calls[0][2].where;
      expect(where.created_at.gte).toEqual(new Date('2026-01-01'));
      const lte: Date = where.created_at.lte;
      expect(lte.getHours()).toBe(23);
      expect(lte.getMinutes()).toBe(59);
      expect(lte.getSeconds()).toBe(59);
      expect(lte.getMilliseconds()).toBe(999);
    });

    it('type=http filtra method not null; type=mcp filtra mcp_tool not null', async () => {
      const { service, pagination } = makeService();
      pagination.paginate.mockResolvedValue(paginateResult([]));

      await service.list({ type: 'http' });
      expect(pagination.paginate.mock.calls[0][2].where).toMatchObject({
        method: { not: null },
      });

      await service.list({ type: 'mcp' });
      expect(pagination.paginate.mock.calls[1][2].where).toMatchObject({
        mcp_tool: { not: null },
      });
    });

    it('enriquece cada log com dados de user-agent e geoip', async () => {
      const { service, pagination } = makeService();
      pagination.paginate.mockResolvedValue(
        paginateResult([{ id: 1, user_agent: 'UA', ip: '8.8.8.8' }]),
      );

      const result = await service.list({});

      expect(result.data[0]).toMatchObject({
        browser_name: 'Chrome',
        browser_version: '120',
        os_name: 'Windows',
        os_version: '11',
        country: 'BR',
        city: 'Sao Paulo',
      });
    });

    it('usa null quando não há user_agent nem ip', async () => {
      const { service, pagination } = makeService();
      pagination.paginate.mockResolvedValue(
        paginateResult([{ id: 2, user_agent: null, ip: null }]),
      );

      const result = await service.list({});

      expect(result.data[0]).toMatchObject({
        browser_name: null,
        os_name: null,
        country: null,
        city: null,
      });
      expect(mockUAParser).not.toHaveBeenCalled();
      expect(mockLookup).not.toHaveBeenCalled();
    });
  });

  describe('clearOld', () => {
    it('executa o DELETE em lote via $executeRaw', async () => {
      const { service, prisma } = makeService();
      prisma.$executeRaw.mockResolvedValue(1);

      await service.clearOld(30, 500);

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });
});
