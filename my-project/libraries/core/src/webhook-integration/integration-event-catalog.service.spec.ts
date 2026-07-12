import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IntegrationEventCatalogService } from './integration-event-catalog.service';

const makeDeps = () => {
  const catalog = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  };
  const prisma = {
    integration_event_catalog: catalog,
    createInsensitiveSearch: jest.fn().mockReturnValue([]),
  };
  const pagination = { paginate: jest.fn().mockResolvedValue({ data: [] }) };
  return { prisma, pagination, catalog };
};

const makeService = (deps = makeDeps()) => ({
  service: new IntegrationEventCatalogService(deps.prisma as any, deps.pagination as any),
  deps,
});

describe('IntegrationEventCatalogService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('normalize', () => {
    let service: IntegrationEventCatalogService;
    beforeEach(() => {
      service = makeService().service;
    });
    const call = (data: any, partial?: boolean) =>
      (service as any).normalize(data, partial);

    it('faz trim e default status active', () => {
      const result = call({ slug: '  s  ', name: ' N ', module: ' m ' });
      expect(result).toEqual({
        slug: 's',
        name: 'N',
        module: 'm',
        description: null,
        status: 'active',
      });
    });

    it('status inactive é preservado', () => {
      expect(call({ status: 'inactive' }).status).toBe('inactive');
    });

    it('description string vira trim ou null', () => {
      expect(call({ description: '  hi  ' }).description).toBe('hi');
      expect(call({ description: '   ' }).description).toBeNull();
    });

    it('partial pula description undefined mas mantém slug/name/module vazios', () => {
      const result = call({ slug: 'x' }, true);
      expect(result).toEqual({ slug: 'x', name: '', module: '', status: 'active' });
      expect(result).not.toHaveProperty('description');
    });
  });

  describe('get', () => {
    it('lança NotFound quando não existe', async () => {
      const { service, deps } = makeService();
      deps.catalog.findUnique.mockResolvedValue(null);
      await expect(service.get(1)).rejects.toThrow(NotFoundException);
    });

    it('retorna registro existente', async () => {
      const { service, deps } = makeService();
      deps.catalog.findUnique.mockResolvedValue({ id: 1, slug: 's' });
      await expect(service.get(1)).resolves.toMatchObject({ id: 1 });
    });
  });

  describe('create', () => {
    it('lança BadRequest quando slug já existe', async () => {
      const { service, deps } = makeService();
      deps.catalog.findUnique.mockResolvedValue({ id: 1 });
      await expect(service.create({ slug: 'dup' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cria com dados normalizados quando slug livre', async () => {
      const { service, deps } = makeService();
      deps.catalog.findUnique.mockResolvedValue(null);
      deps.catalog.create.mockResolvedValue({ id: 2 });
      await service.create({ slug: ' new ', name: 'N', module: 'm' });
      expect(deps.catalog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ slug: 'new', status: 'active' }),
      });
    });
  });

  describe('update', () => {
    it('checa disponibilidade só quando slug muda', async () => {
      const { service, deps } = makeService();
      deps.catalog.findUnique
        .mockResolvedValueOnce({ id: 1, slug: 'old' }) // get()
        .mockResolvedValueOnce(null); // ensureSlugAvailable
      deps.catalog.update.mockResolvedValue({ id: 1 });
      await service.update(1, { slug: 'new' });
      expect(deps.catalog.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ slug: 'new' }),
      });
    });

    it('não checa disponibilidade quando slug igual', async () => {
      const { service, deps } = makeService();
      deps.catalog.findUnique.mockResolvedValue({ id: 1, slug: 'same' });
      deps.catalog.update.mockResolvedValue({ id: 1 });
      await service.update(1, { slug: 'same', name: 'X' });
      expect(deps.catalog.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('lança BadRequest sem ids', async () => {
      const { service } = makeService();
      await expect(service.delete({ ids: [] } as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('remove por ids', async () => {
      const { service, deps } = makeService();
      deps.catalog.deleteMany.mockResolvedValue({ count: 2 });
      await service.delete({ ids: [1, 2] } as any);
      expect(deps.catalog.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
      });
    });
  });

  describe('options', () => {
    it('lista apenas ativos', async () => {
      const { service, deps } = makeService();
      deps.catalog.findMany.mockResolvedValue([{ id: 1 }]);
      await service.options();
      expect(deps.catalog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'active' } }),
      );
    });
  });
});
