import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DashboardCoreService } from './dashboard-core.service';

const makeService = (prisma: any = {}, setting: any = {}) =>
  new DashboardCoreService(prisma as any, setting as any);

describe('DashboardCoreService helpers puros', () => {
  let service: DashboardCoreService;

  beforeEach(() => {
    service = makeService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('calculateChange', () => {
    it('retorna 0 quando previous e current são 0', () => {
      expect(service.calculateChange(0, 0)).toBe(0);
    });

    it('retorna 100 quando previous é 0 e current > 0', () => {
      expect(service.calculateChange(50, 0)).toBe(100);
    });

    it('calcula variação percentual com uma casa decimal', () => {
      expect(service.calculateChange(150, 100)).toBe(50);
      expect(service.calculateChange(110, 100)).toBe(10);
      expect(service.calculateChange(133, 100)).toBe(33);
    });

    it('arredonda para uma casa decimal', () => {
      // (1/3)*100 = 33.333... => 33.3
      expect(service.calculateChange(4, 3)).toBe(33.3);
    });

    it('retorna valores negativos quando há queda', () => {
      expect(service.calculateChange(50, 100)).toBe(-50);
    });
  });

  describe('userHasRequiredRolesForDashboard', () => {
    const call = (reqs: number[][], roles: number[]) =>
      (service as any).userHasRequiredRolesForDashboard(reqs, roles);

    it('retorna true quando não há requisitos de componente', () => {
      expect(call([], [1, 2])).toBe(true);
      expect(call([], [])).toBe(true);
    });

    it('sem roles do usuário, exige que todos os componentes não peçam roles', () => {
      expect(call([[], []], [])).toBe(true);
      expect(call([[], [5]], [])).toBe(false);
    });

    it('usuário com role satisfaz componente quando há interseção', () => {
      expect(call([[5, 6]], [6])).toBe(true);
    });

    it('componente sem requisitos é sempre satisfeito', () => {
      expect(call([[], [3]], [3])).toBe(true);
    });

    it('falha quando algum componente não tem interseção de roles', () => {
      expect(call([[3], [99]], [3])).toBe(false);
    });
  });

  describe('hasConfigValue', () => {
    const call = (v: unknown) => (service as any).hasConfigValue(v);

    it('array vazio é falso; array com item é verdadeiro', () => {
      expect(call([])).toBe(false);
      expect(call([1])).toBe(true);
    });

    it('string vazia/branca é falso; string com conteúdo é verdadeiro', () => {
      expect(call('')).toBe(false);
      expect(call('   ')).toBe(false);
      expect(call('x')).toBe(true);
    });

    it('null/undefined são falsos; números/booleans são verdadeiros', () => {
      expect(call(null)).toBe(false);
      expect(call(undefined)).toBe(false);
      expect(call(0)).toBe(true);
      expect(call(false)).toBe(true);
    });
  });

  describe('toNullableString', () => {
    const call = (v: unknown) => (service as any).toNullableString(v);

    it('retorna string trimada quando não vazia', () => {
      expect(call('  hi  ')).toBe('hi');
    });

    it('retorna null para string vazia/branca', () => {
      expect(call('   ')).toBeNull();
    });

    it('retorna null para null/undefined', () => {
      expect(call(null)).toBeNull();
      expect(call(undefined)).toBeNull();
    });

    it('converte não-strings via String()', () => {
      expect(call(42)).toBe('42');
      expect(call(true)).toBe('true');
    });
  });

  describe('toNullableUppercaseString', () => {
    const call = (v: unknown) => (service as any).toNullableUppercaseString(v);

    it('faz uppercase de string válida', () => {
      expect(call(' smtp ')).toBe('SMTP');
    });

    it('retorna null para vazio', () => {
      expect(call('  ')).toBeNull();
      expect(call(null)).toBeNull();
    });
  });

  describe('normalizeProviderList', () => {
    const call = (v: unknown) => (service as any).normalizeProviderList(v);

    it('retorna [] quando não é array', () => {
      expect(call(undefined)).toEqual([]);
      expect(call('x')).toEqual([]);
    });

    it('faz lowercase de cada provider', () => {
      expect(call(['Google', 'GITHUB'])).toEqual(['google', 'github']);
    });
  });

  describe('getMissingSettingKeys', () => {
    const call = (settings: Record<string, unknown>, keys: string[]) =>
      (service as any).getMissingSettingKeys(settings, keys);

    it('retorna apenas as chaves ausentes/vazias', () => {
      const settings = { a: 'x', b: '', c: null, d: 'y' };
      expect(call(settings, ['a', 'b', 'c', 'd'])).toEqual(['b', 'c']);
    });

    it('retorna [] quando todas presentes', () => {
      expect(call({ a: '1', b: '2' }, ['a', 'b'])).toEqual([]);
    });
  });

  describe('slugifyDashboardName', () => {
    const call = (v: string) => (service as any).slugifyDashboardName(v);

    it('remove diacríticos e normaliza para slug', () => {
      expect(call('Relatório de Vendas')).toBe('relatorio-de-vendas');
    });

    it('remove hifens das bordas', () => {
      expect(call('  --Hello World!!  ')).toBe('hello-world');
    });

    it('gera fallback quando resultado vazio', () => {
      const result = call('!!!');
      expect(result).toMatch(/^dashboard-\d+$/);
    });
  });

  describe('buildUniqueDashboardSlug', () => {
    it('retorna o baseSlug quando não há colisão', async () => {
      const prisma = { dashboard: { findFirst: jest.fn().mockResolvedValue(null) } };
      const svc = makeService(prisma);
      await expect(
        (svc as any).buildUniqueDashboardSlug('vendas'),
      ).resolves.toBe('vendas');
    });

    it('adiciona sufixo incremental em colisões', async () => {
      const findFirst = jest
        .fn()
        .mockResolvedValueOnce({ id: 1 }) // 'vendas' existe
        .mockResolvedValueOnce({ id: 2 }) // 'vendas-2' existe
        .mockResolvedValueOnce(null); // 'vendas-3' livre
      const svc = makeService({ dashboard: { findFirst } });
      await expect(
        (svc as any).buildUniqueDashboardSlug('vendas'),
      ).resolves.toBe('vendas-3');
      expect(findFirst).toHaveBeenCalledTimes(3);
    });
  });
});
