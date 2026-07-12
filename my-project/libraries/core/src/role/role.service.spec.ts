import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RoleService } from './role.service';

const makeDeps = () => {
  const prismaService = {
    role: { findUnique: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
    role_user: { deleteMany: jest.fn(), createMany: jest.fn() },
    role_screen: { deleteMany: jest.fn(), createMany: jest.fn() },
    role_route: { deleteMany: jest.fn(), createMany: jest.fn() },
    role_menu: { deleteMany: jest.fn(), createMany: jest.fn() },
    $queryRaw: jest.fn(),
  };
  const paginationService = { paginate: jest.fn().mockResolvedValue({ data: [] }) };
  const localeService = { getByCode: jest.fn() };
  const integrationApi = { publishEvent: jest.fn().mockResolvedValue(undefined) };
  return { prismaService, paginationService, localeService, integrationApi };
};

const makeService = (deps = makeDeps()) => ({
  service: new RoleService(
    deps.prismaService as any,
    deps.paginationService as any,
    deps.localeService as any,
    deps.integrationApi as any,
  ),
  deps,
});

describe('RoleService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('updateUsers', () => {
    it('recria vínculos de usuários', async () => {
      const { service, deps } = makeService();
      deps.prismaService.role_user.createMany.mockResolvedValue({ count: 2 });
      const result = await service.updateUsers(3, { ids: [1, 2] } as any);
      expect(deps.prismaService.role_user.deleteMany).toHaveBeenCalledWith({
        where: { role_id: 3 },
      });
      expect(deps.prismaService.role_user.createMany).toHaveBeenCalledWith({
        data: [
          { role_id: 3, user_id: 1 },
          { role_id: 3, user_id: 2 },
        ],
        skipDuplicates: true,
      });
      expect(result).toEqual({ count: 2 });
    });
  });

  describe('listRoutes', () => {
    it('busca contains por padrão', async () => {
      const { service, deps } = makeService();
      await service.listRoutes(1, {} as any, 'abc');
      const opts = deps.paginationService.paginate.mock.calls[0][2];
      expect(opts.where.url).toEqual({ contains: 'abc' });
    });

    it('busca startsWith / endsWith', async () => {
      const { service, deps } = makeService();
      await service.listRoutes(1, {} as any, 'abc', 'startsWith');
      expect(
        deps.paginationService.paginate.mock.calls[0][2].where.url,
      ).toEqual({ startsWith: 'abc' });

      await service.listRoutes(1, {} as any, 'abc', 'endsWith');
      expect(
        deps.paginationService.paginate.mock.calls[1][2].where.url,
      ).toEqual({ endsWith: 'abc' });
    });

    it('filtra método específico mas ignora "all"', async () => {
      const { service, deps } = makeService();
      await service.listRoutes(1, {} as any, undefined, undefined, 'POST');
      expect(deps.paginationService.paginate.mock.calls[0][2].where.method).toBe(
        'POST',
      );

      await service.listRoutes(1, {} as any, undefined, undefined, 'all');
      expect(
        deps.paginationService.paginate.mock.calls[1][2].where,
      ).not.toHaveProperty('method');
    });
  });

  describe('get', () => {
    it('lança NotFound quando role ausente', async () => {
      const { service, deps } = makeService();
      deps.prismaService.role.findUnique.mockResolvedValue(null);
      await expect(service.get(9)).rejects.toThrow(NotFoundException);
    });

    it('reduz role_locale em mapa por código', async () => {
      const { service, deps } = makeService();
      deps.prismaService.role.findUnique.mockResolvedValue({
        id: 1,
        slug: 'admin',
        role_locale: [
          { name: 'Admin', description: 'd', locale: { code: 'en' } },
          { name: 'Adm', description: 'dp', locale: { code: 'pt' } },
        ],
      });
      const result = await service.get(1);
      expect(result.locale).toEqual({
        en: { name: 'Admin', description: 'd' },
        pt: { name: 'Adm', description: 'dp' },
      });
    });
  });

  describe('list', () => {
    it('lança quando locale inexistente', async () => {
      const { service, deps } = makeService();
      deps.localeService.getByCode.mockResolvedValue(null);
      await expect(
        service.list({ search: '', take: 10, skip: 0 }, 'zz'),
      ).rejects.toThrow('not found');
    });

    it('calcula paginação e normaliza available_locales', async () => {
      const { service, deps } = makeService();
      deps.localeService.getByCode.mockResolvedValue({ id: 1 });
      deps.prismaService.$queryRaw.mockResolvedValue([
        { role_id: 1, available_locales: null },
      ]);
      deps.prismaService.role.count.mockResolvedValue(25);

      const result = await service.list({ search: '', take: 10, skip: 0 }, 'en');

      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.lastPage).toBe(3);
      expect(result.prev).toBeNull();
      expect(result.next).toBe(2);
      expect(result.data[0].available_locales).toEqual([]);
    });

    it('usa branch de busca quando search preenchido', async () => {
      const { service, deps } = makeService();
      deps.localeService.getByCode.mockResolvedValue({ id: 1 });
      deps.prismaService.$queryRaw.mockResolvedValue([]);
      deps.prismaService.role.count.mockResolvedValue(0);

      const result = await service.list({ search: 'adm', take: 10, skip: 10 }, 'en');
      expect(result.page).toBe(2);
      expect(result.lastPage).toBe(1);
      expect(result.next).toBeNull();
    });
  });

  describe('delete', () => {
    it('lança BadRequest sem ids', async () => {
      const { service } = makeService();
      await expect(service.delete({ ids: null } as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lança NotFound quando algum id não existe', async () => {
      const { service, deps } = makeService();
      deps.prismaService.role.findMany.mockResolvedValue([{ id: 1 }]);
      await expect(service.delete({ ids: [1, 2] } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('remove roles e publica evento', async () => {
      const { service, deps } = makeService();
      deps.prismaService.role.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      deps.prismaService.role.deleteMany.mockResolvedValue({ count: 2 });
      const result = await service.delete({ ids: [1, 2] } as any);
      expect(result).toEqual({ count: 2 });
      expect(deps.integrationApi.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'core.role.deleted' }),
      );
    });
  });
});
