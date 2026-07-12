import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { MenuService } from './menu.service';

const makeService = (prisma: any) =>
  new MenuService(prisma as any, {} as any);

describe('MenuService.ensureValidParent', () => {
  let prisma: any;
  let service: MenuService;

  beforeEach(() => {
    prisma = {
      menu: { findUnique: jest.fn() },
    };
    service = makeService(prisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const call = (
    locale: string,
    currentMenuId: number | null,
    parentId?: number | null,
  ) => (service as any).ensureValidParent(locale, currentMenuId, parentId);

  it('retorna sem consultar quando parentId é null/undefined', async () => {
    await expect(call('en', 5, null)).resolves.toBeUndefined();
    await expect(call('en', 5, undefined)).resolves.toBeUndefined();
    expect(prisma.menu.findUnique).not.toHaveBeenCalled();
  });

  it('lança BadRequestException quando parent não existe', async () => {
    prisma.menu.findUnique.mockResolvedValue(null);
    await expect(call('en', 5, 99)).rejects.toThrow(BadRequestException);
  });

  it('lança quando parentId é igual ao próprio menu', async () => {
    prisma.menu.findUnique.mockResolvedValue({ id: 5, menu_id: null });
    await expect(call('en', 5, 5)).rejects.toThrow(BadRequestException);
  });

  it('retorna quando currentMenuId é null (criação) e parent existe', async () => {
    prisma.menu.findUnique.mockResolvedValue({ id: 10, menu_id: null });
    await expect(call('en', null, 10)).resolves.toBeUndefined();
    // apenas a busca inicial do parent
    expect(prisma.menu.findUnique).toHaveBeenCalledTimes(1);
  });

  it('aceita mover para um parent de raiz distinto (sem ciclo)', async () => {
    // parent 10 tem pai 20, e 20 é raiz. currentMenu é 5, não aparece na cadeia.
    prisma.menu.findUnique
      .mockResolvedValueOnce({ id: 10, menu_id: 20 }) // parent inicial
      .mockResolvedValueOnce({ id: 20, menu_id: null }); // sobe até raiz
    await expect(call('en', 5, 10)).resolves.toBeUndefined();
  });

  it('detecta ciclo quando o parent é descendente do menu atual', async () => {
    // currentMenu = 5; parent = 10 cujo ancestral é 5 → mover 5 para dentro de 10 formaria ciclo
    prisma.menu.findUnique
      .mockResolvedValueOnce({ id: 10, menu_id: 5 }) // parent inicial, pai é o próprio menu 5
      .mockResolvedValueOnce({ id: 5, menu_id: null });
    await expect(call('en', 5, 10)).rejects.toThrow(BadRequestException);
  });

  it('detecta ciclo mais profundo na cadeia de ancestrais', async () => {
    // 5 é o atual; cadeia: parent 10 -> 11 -> 5 (ciclo)
    prisma.menu.findUnique
      .mockResolvedValueOnce({ id: 10, menu_id: 11 })
      .mockResolvedValueOnce({ id: 11, menu_id: 5 })
      .mockResolvedValueOnce({ id: 5, menu_id: null });
    await expect(call('en', 5, 10)).rejects.toThrow(BadRequestException);
  });
});
