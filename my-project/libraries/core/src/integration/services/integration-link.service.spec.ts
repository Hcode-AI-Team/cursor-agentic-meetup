import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { IntegrationLinkService } from './integration-link.service';
import { LinkType } from '../types';

const makeDelegate = () => ({
  create: jest.fn(),
  findMany: jest.fn(),
  findFirst: jest.fn(),
  findUnique: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
});

describe('IntegrationLinkService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('resolvePersistence', () => {
    it('prioriza integration_link (snake) do prisma', () => {
      const snake = makeDelegate();
      const service = new IntegrationLinkService({ integration_link: snake } as any);
      const { delegate, useSnakeCase } = (service as any).resolvePersistence();
      expect(delegate).toBe(snake);
      expect(useSnakeCase).toBe(true);
    });

    it('usa integrationLink (camel) quando snake ausente', () => {
      const camel = makeDelegate();
      const service = new IntegrationLinkService({ integrationLink: camel } as any);
      const { delegate, useSnakeCase } = (service as any).resolvePersistence();
      expect(delegate).toBe(camel);
      expect(useSnakeCase).toBe(false);
    });

    it('lança quando não há delegate', () => {
      const service = new IntegrationLinkService({} as any);
      expect(() => (service as any).resolvePersistence()).toThrow(
        'Integration link delegate is not available on the Prisma client.',
      );
    });

    it('aceita client de persistência explícito', () => {
      const explicit = makeDelegate();
      const service = new IntegrationLinkService({} as any);
      const { delegate } = (service as any).resolvePersistence({
        integration_link: explicit,
      });
      expect(delegate).toBe(explicit);
    });
  });

  describe('toDomainLink', () => {
    let service: IntegrationLinkService;
    beforeEach(() => {
      service = new IntegrationLinkService({} as any);
    });

    it('mapeia colunas snake_case', () => {
      const now = new Date('2026-01-01T00:00:00Z');
      const result = (service as any).toDomainLink({
        id: 5,
        source_module: 'crm',
        source_entity_type: 'person',
        source_entity_id: '1',
        target_module: 'finance',
        target_entity_type: 'invoice',
        target_entity_id: '2',
        link_type: LinkType.CASCADE,
        metadata: { k: 'v' },
        created_at: now,
        updated_at: now,
      });
      expect(result).toMatchObject({
        id: '5',
        sourceModule: 'crm',
        targetEntityId: '2',
        linkType: LinkType.CASCADE,
        metadata: { k: 'v' },
      });
    });

    it('usa defaults quando faltam campos', () => {
      const result = (service as any).toDomainLink({ id: 9 });
      expect(result.sourceModule).toBe('');
      expect(result.linkType).toBe(LinkType.REFERENCE);
      expect(result.metadata).toBeNull();
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('toDatabaseId', () => {
    let service: IntegrationLinkService;
    beforeEach(() => {
      service = new IntegrationLinkService({} as any);
    });

    it('mantém number', () => {
      expect((service as any).toDatabaseId(7)).toBe(7);
    });
    it('converte string numérica', () => {
      expect((service as any).toDatabaseId('42')).toBe(42);
    });
    it('mantém string não numérica', () => {
      expect((service as any).toDatabaseId('abc')).toBe('abc');
    });
  });

  describe('createLink', () => {
    it('usa data snake_case', async () => {
      const delegate = makeDelegate();
      delegate.create.mockResolvedValue({ id: 1 });
      const service = new IntegrationLinkService({ integration_link: delegate } as any);
      await service.createLink({
        sourceModule: 'a',
        sourceEntityType: 'b',
        sourceEntityId: 'c',
        targetModule: 'd',
        targetEntityType: 'e',
        targetEntityId: 'f',
        linkType: LinkType.REFERENCE,
      });
      expect(delegate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          source_module: 'a',
          target_entity_id: 'f',
          link_type: LinkType.REFERENCE,
          metadata: null,
        }),
      });
    });

    it('usa data camelCase', async () => {
      const delegate = makeDelegate();
      delegate.create.mockResolvedValue({ id: 1 });
      const service = new IntegrationLinkService({ integrationLink: delegate } as any);
      await service.createLink({
        sourceModule: 'a',
        sourceEntityType: 'b',
        sourceEntityId: 'c',
        targetModule: 'd',
        targetEntityType: 'e',
        targetEntityId: 'f',
        linkType: LinkType.REFERENCE,
        metadata: { x: 1 },
      });
      expect(delegate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sourceModule: 'a',
          metadata: { x: 1 },
        }),
      });
    });
  });

  describe('consultas', () => {
    it('findOutbound monta where snake', async () => {
      const delegate = makeDelegate();
      delegate.findMany.mockResolvedValue([]);
      const service = new IntegrationLinkService({ integration_link: delegate } as any);
      await service.findOutbound('m', 't', 'i');
      expect(delegate.findMany).toHaveBeenCalledWith({
        where: { source_module: 'm', source_entity_type: 't', source_entity_id: 'i' },
      });
    });

    it('findInbound monta where camel', async () => {
      const delegate = makeDelegate();
      delegate.findMany.mockResolvedValue([]);
      const service = new IntegrationLinkService({ integrationLink: delegate } as any);
      await service.findInbound('m', 't', 'i');
      expect(delegate.findMany).toHaveBeenCalledWith({
        where: { targetModule: 'm', targetEntityType: 't', targetEntityId: 'i' },
      });
    });

    it('findByLinkType filtra por tipo', async () => {
      const delegate = makeDelegate();
      delegate.findMany.mockResolvedValue([]);
      const service = new IntegrationLinkService({ integration_link: delegate } as any);
      await service.findByLinkType(LinkType.CASCADE);
      expect(delegate.findMany).toHaveBeenCalledWith({
        where: { link_type: LinkType.CASCADE },
      });
    });

    it('getById retorna null quando ausente', async () => {
      const delegate = makeDelegate();
      delegate.findUnique.mockResolvedValue(null);
      const service = new IntegrationLinkService({ integration_link: delegate } as any);
      await expect(service.getById('1')).resolves.toBeNull();
    });

    it('getById mapeia para domínio', async () => {
      const delegate = makeDelegate();
      delegate.findUnique.mockResolvedValue({ id: 3, source_module: 'x' });
      const service = new IntegrationLinkService({ integration_link: delegate } as any);
      const result = await service.getById('3');
      expect(result).toMatchObject({ id: '3', sourceModule: 'x' });
    });

    it('countFromModule delega count', async () => {
      const delegate = makeDelegate();
      delegate.count.mockResolvedValue(4);
      const service = new IntegrationLinkService({ integration_link: delegate } as any);
      await expect(service.countFromModule('crm')).resolves.toBe(4);
      expect(delegate.count).toHaveBeenCalledWith({ where: { source_module: 'crm' } });
    });

    it('deleteLink mapeia registro removido', async () => {
      const delegate = makeDelegate();
      delegate.delete.mockResolvedValue({ id: 8 });
      const service = new IntegrationLinkService({ integration_link: delegate } as any);
      const result = await service.deleteLink('8');
      expect(delegate.delete).toHaveBeenCalledWith({ where: { id: 8 } });
      expect(result.id).toBe('8');
    });
  });
});
