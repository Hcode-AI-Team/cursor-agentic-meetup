import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { SettingService } from './setting.service';

const makeDeps = () => {
  const prisma = {
    setting: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    setting_user: { findMany: jest.fn() },
    user: { findUnique: jest.fn() },
    $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn(),
  };
  const pagination = { paginate: jest.fn() };
  const locale = { getEnables: jest.fn().mockResolvedValue([]) };
  const integrationApi = { publishEvents: jest.fn().mockResolvedValue(undefined) };
  return { prisma, pagination, locale, integrationApi };
};

const makeService = (deps = makeDeps()) => ({
  service: new SettingService(
    deps.prisma as any,
    deps.pagination as any,
    deps.locale as any,
    deps.integrationApi as any,
  ),
  deps,
});

describe('SettingService', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('setValueFormattedByType', () => {
    let service: SettingService;
    beforeEach(() => {
      service = makeService().service;
    });

    it('coage boolean para "true"/"false"', () => {
      expect(service.setValueFormattedByType('boolean', true)).toBe('true');
      expect(service.setValueFormattedByType('boolean', 'true')).toBe('true');
      expect(service.setValueFormattedByType('boolean', false)).toBe('false');
      expect(service.setValueFormattedByType('boolean', 'no')).toBe('false');
    });

    it('number: vazio/null vira ""', () => {
      expect(service.setValueFormattedByType('number', '')).toBe('');
      expect(service.setValueFormattedByType('number', null)).toBe('');
      expect(service.setValueFormattedByType('number', undefined)).toBe('');
      expect(service.setValueFormattedByType('number', '   ')).toBe('');
    });

    it('number: converte valor válido e lança em inválido', () => {
      expect(service.setValueFormattedByType('number', '42')).toBe('42');
      expect(service.setValueFormattedByType('number', 3.5)).toBe('3.5');
      expect(() => service.setValueFormattedByType('number', 'abc')).toThrow(
        BadRequestException,
      );
    });

    it('array/json: serializa objeto, mantém string', () => {
      expect(service.setValueFormattedByType('json', { a: 1 })).toBe('{"a":1}');
      expect(service.setValueFormattedByType('array', [1, 2])).toBe('[1,2]');
      expect(service.setValueFormattedByType('json', '{"x":1}')).toBe('{"x":1}');
    });

    it('default: retorna valor sem alteração', () => {
      expect(service.setValueFormattedByType('string', 'hello')).toBe('hello');
    });
  });

  describe('getValueFormattedByType', () => {
    let service: SettingService;
    beforeEach(() => {
      service = makeService().service;
    });

    it('espelha regras de boolean/number/json', () => {
      expect(service.getValueFormattedByType('boolean', 'true')).toBe('true');
      expect(service.getValueFormattedByType('number', '7')).toBe('7');
      expect(service.getValueFormattedByType('number', '')).toBe('');
      expect(service.getValueFormattedByType('json', { b: 2 })).toBe('{"b":2}');
      expect(service.getValueFormattedByType('other', 'x')).toBe('x');
      expect(() => service.getValueFormattedByType('number', 'NaNzz')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('parseVersionValue', () => {
    it('trata number/bigint/string/desconhecido', () => {
      const { service } = makeService();
      const p = (v: unknown) => (service as any).parseVersionValue(v);
      expect(p(5)).toBe(5);
      expect(p(BigInt(9))).toBe(9);
      expect(p('12')).toBe(12);
      expect(p(null)).toBe(0);
      expect(p({})).toBe(0);
    });
  });

  describe('normalizeValueForComparison', () => {
    let service: SettingService;
    beforeEach(() => {
      service = makeService().service;
    });
    const call = (v: any) => (service as any).normalizeValueForComparison(v);

    it('undefined vira sentinela, null permanece null', () => {
      expect(call(undefined)).toBe('__undefined__');
      expect(call(null)).toBeNull();
    });

    it('faz trim de strings', () => {
      expect(call('  hi  ')).toBe('hi');
    });

    it('serializa objeto e cai em String em circular', () => {
      expect(call({ a: 1 })).toBe('{"a":1}');
      const circular: any = {};
      circular.self = circular;
      expect(call(circular)).toBe('[object Object]');
    });
  });

  describe('isValueDefined', () => {
    let service: SettingService;
    beforeEach(() => {
      service = makeService().service;
    });
    const call = (v: any) => (service as any).isValueDefined(v);

    it('false para undefined/null/vazio', () => {
      expect(call(undefined)).toBe(false);
      expect(call(null)).toBe(false);
      expect(call('   ')).toBe(false);
      expect(call([])).toBe(false);
    });

    it('true para conteúdo', () => {
      expect(call('x')).toBe(true);
      expect(call([1])).toBe(true);
      expect(call(0)).toBe(true);
      expect(call(true)).toBe(true);
    });
  });

  describe('setCache / clearCache', () => {
    it('mescla e limpa o cache', () => {
      const { service } = makeService();
      service.setCache({ a: 1 });
      service.setCache({ b: 2 });
      expect((service as any).cachedSettings).toEqual({ a: 1, b: 2 });
      service.clearCache();
      expect((service as any).cachedSettings).toEqual({});
    });
  });

  describe('getSettingValues', () => {
    it('coage valores por tipo', async () => {
      const { service, deps } = makeService();
      deps.prisma.setting.findMany.mockResolvedValue([
        { id: 1, slug: 'flag', type: 'boolean', value: 'true', user_override: false },
        { id: 2, slug: 'count', type: 'number', value: '10', user_override: false },
        { id: 3, slug: 'list', type: 'json', value: '{"a":1}', user_override: false },
        { id: 4, slug: 'name', type: 'string', value: 'hh', user_override: false },
      ]);

      const result = await service.getSettingValues(['flag', 'count', 'list', 'name']);

      expect(result).toEqual({
        flag: true,
        count: 10,
        list: { a: 1 },
        name: 'hh',
      });
    });

    it('json inválido cai em string bruta', async () => {
      const { service, deps } = makeService();
      deps.prisma.setting.findMany.mockResolvedValue([
        { id: 1, slug: 'bad', type: 'json', value: 'not-json', user_override: false },
      ]);
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await service.getSettingValues('bad');

      expect(result.bad).toBe('not-json');
      errSpy.mockRestore();
    });

    it('serve do cache sem reconsultar quando slug já cacheado', async () => {
      const { service, deps } = makeService();
      deps.prisma.setting.findMany.mockResolvedValue([
        { id: 1, slug: 'flag', type: 'boolean', value: 'true', user_override: false },
      ]);

      await service.getSettingValues('flag');
      const second = await service.getSettingValues('flag');

      expect(second).toEqual({ flag: true });
      expect(deps.prisma.setting.findMany).toHaveBeenCalledTimes(1);
    });

    it('aplica override do usuário sem cachear', async () => {
      const { service, deps } = makeService();
      deps.prisma.setting.findMany.mockResolvedValue([
        { id: 7, slug: 'theme', type: 'string', value: 'light', user_override: true },
      ]);
      deps.prisma.setting_user.findMany.mockResolvedValue([
        { setting_id: 7, value: 'dark' },
      ]);

      const result = await service.getSettingValues('theme', 99);

      expect(result.theme).toBe('dark');
      expect(deps.prisma.setting_user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ user_id: 99 }),
        }),
      );
    });
  });

  describe('getEffectiveSettings', () => {
    it('coage overrides do usuário conforme tipo global', async () => {
      const { service } = makeService();
      jest.spyOn(service, 'getSystemSettings').mockResolvedValue({
        locales: [],
        setting: {
          flag: true,
          count: 5,
          obj: { a: 1 },
          name: 'x',
        },
      });
      jest.spyOn(service, 'getUserSettings').mockResolvedValue([
        { setting: { slug: 'flag' }, value: 'false' },
        { setting: { slug: 'count' }, value: '9' },
        { setting: { slug: 'count' }, value: null },
        { setting: { slug: 'obj' }, value: '{"b":2}' },
        { setting: { slug: 'name' }, value: 'y' },
        { setting: { slug: null }, value: 'ignored' },
      ] as any);

      const { setting } = await service.getEffectiveSettings(1);

      expect(setting.flag).toBe(false);
      expect(setting.count).toBe(9);
      expect(setting.obj).toEqual({ b: 2 });
      expect(setting.name).toBe('y');
    });

    it('mantém valor global quando número override é NaN', async () => {
      const { service } = makeService();
      jest.spyOn(service, 'getSystemSettings').mockResolvedValue({
        locales: [],
        setting: { count: 5 },
      });
      jest.spyOn(service, 'getUserSettings').mockResolvedValue([
        { setting: { slug: 'count' }, value: 'abc' },
      ] as any);

      const { setting } = await service.getEffectiveSettings(1);
      expect(setting.count).toBe('abc');
    });
  });

  describe('emitSettingChangedEvents', () => {
    it('não publica quando valor não muda', async () => {
      const { service, deps } = makeService();
      await (service as any).emitSettingChangedEvents([
        { slug: 's', oldValue: 'a', newValue: 'a', source: 'test' },
      ]);
      expect(deps.integrationApi.publishEvents).not.toHaveBeenCalled();
    });

    it('publica evento quando valor muda', async () => {
      const { service, deps } = makeService();
      await (service as any).emitSettingChangedEvents([
        { settingId: 3, slug: 's', type: 'string', oldValue: 'a', newValue: 'b', source: 'test' },
      ]);
      expect(deps.integrationApi.publishEvents).toHaveBeenCalledWith([
        expect.objectContaining({
          eventName: 'core.setting.changed',
          aggregateId: '3',
          payload: expect.objectContaining({ slug: 's', hasValue: true }),
        }),
      ]);
    });

    it('engole erro de publishEvents', async () => {
      const { service, deps } = makeService();
      deps.integrationApi.publishEvents.mockRejectedValue(new Error('boom'));
      await expect(
        (service as any).emitSettingChangedEvents([
          { slug: 's', oldValue: 'a', newValue: 'b', source: 'test' },
        ]),
      ).resolves.toBeUndefined();
    });
  });
});
