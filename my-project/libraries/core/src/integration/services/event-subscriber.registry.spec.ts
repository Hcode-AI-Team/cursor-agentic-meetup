import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EventSubscriberRegistry } from './event-subscriber.registry';
import { SubscriberDefinition } from '../types';

const makeDef = (
  overrides: Partial<SubscriberDefinition> & { eventName: string },
): SubscriberDefinition => ({
  consumerName: 'consumer',
  handler: jest.fn() as any,
  ...overrides,
});

describe('EventSubscriberRegistry', () => {
  let registry: EventSubscriberRegistry;

  beforeEach(() => {
    registry = new EventSubscriberRegistry();
  });

  describe('registerHandler / getHandlers', () => {
    it('cria a lista e retorna o handler registrado', () => {
      const def = makeDef({ eventName: 'user.created' });
      registry.registerHandler(def);
      expect(registry.getHandlers('user.created')).toEqual([def]);
    });

    it('ordena por prioridade (maior primeiro)', () => {
      registry.registerHandler(
        makeDef({ eventName: 'e', consumerName: 'low', priority: 1 }),
      );
      registry.registerHandler(
        makeDef({ eventName: 'e', consumerName: 'high', priority: 10 }),
      );
      registry.registerHandler(
        makeDef({ eventName: 'e', consumerName: 'mid', priority: 5 }),
      );

      const names = registry.getHandlers('e').map((h) => h.consumerName);
      expect(names).toEqual(['high', 'mid', 'low']);
    });

    it('trata prioridade ausente como 0', () => {
      registry.registerHandler(
        makeDef({ eventName: 'e', consumerName: 'no-prio' }),
      );
      registry.registerHandler(
        makeDef({ eventName: 'e', consumerName: 'prio', priority: 3 }),
      );
      const names = registry.getHandlers('e').map((h) => h.consumerName);
      expect(names).toEqual(['prio', 'no-prio']);
    });

    it('retorna array vazio para evento desconhecido', () => {
      expect(registry.getHandlers('nope')).toEqual([]);
    });
  });

  describe('subscribe / subscribeMany', () => {
    it('subscribe registra com prioridade default 0', () => {
      const handler = jest.fn() as any;
      registry.subscribe('e', 'c', handler);
      const handlers = registry.getHandlers('e');
      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toMatchObject({
        eventName: 'e',
        consumerName: 'c',
        priority: 0,
      });
    });

    it('subscribeMany registra todos', () => {
      registry.subscribeMany([
        makeDef({ eventName: 'a' }),
        makeDef({ eventName: 'b' }),
        makeDef({ eventName: 'a', consumerName: 'other' }),
      ]);
      expect(registry.getHandlers('a')).toHaveLength(2);
      expect(registry.getHandlers('b')).toHaveLength(1);
    });
  });

  describe('hasHandlers', () => {
    it('retorna true quando há handlers', () => {
      registry.subscribe('e', 'c', jest.fn() as any);
      expect(registry.hasHandlers('e')).toBe(true);
    });

    it('retorna false para evento inexistente', () => {
      expect(registry.hasHandlers('missing')).toBe(false);
    });
  });

  describe('getEventNames / getHandlerCount', () => {
    it('retorna nomes de eventos registrados', () => {
      registry.subscribe('a', 'c', jest.fn() as any);
      registry.subscribe('b', 'c', jest.fn() as any);
      expect(registry.getEventNames().sort()).toEqual(['a', 'b']);
    });

    it('conta todos os handlers em todos os eventos', () => {
      registry.subscribe('a', 'c1', jest.fn() as any);
      registry.subscribe('a', 'c2', jest.fn() as any);
      registry.subscribe('b', 'c3', jest.fn() as any);
      expect(registry.getHandlerCount()).toBe(3);
    });

    it('conta zero quando vazio', () => {
      expect(registry.getHandlerCount()).toBe(0);
    });
  });

  describe('removeByConsumerPrefix', () => {
    it('remove apenas handlers com o prefixo e apaga eventos que ficam vazios', () => {
      registry.subscribe('a', 'agent:x', jest.fn() as any);
      registry.subscribe('a', 'other', jest.fn() as any);
      registry.subscribe('b', 'agent:y', jest.fn() as any);

      registry.removeByConsumerPrefix('agent:');

      expect(registry.getHandlers('a').map((h) => h.consumerName)).toEqual([
        'other',
      ]);
      expect(registry.hasHandlers('b')).toBe(false);
      expect(registry.getEventNames()).toEqual(['a']);
    });

    it('não altera nada quando nenhum consumer casa com o prefixo', () => {
      registry.subscribe('a', 'keep', jest.fn() as any);
      registry.removeByConsumerPrefix('none:');
      expect(registry.getHandlerCount()).toBe(1);
    });
  });

  describe('clear', () => {
    it('remove todos os handlers', () => {
      registry.subscribe('a', 'c', jest.fn() as any);
      registry.subscribe('b', 'c', jest.fn() as any);
      registry.clear();
      expect(registry.getHandlerCount()).toBe(0);
      expect(registry.getEventNames()).toEqual([]);
    });
  });
});
