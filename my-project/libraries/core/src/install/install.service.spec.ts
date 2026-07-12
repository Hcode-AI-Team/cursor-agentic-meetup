import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { InstallService } from './install.service';

const makeDeps = () => {
  const security = {
    randomOpaque: jest.fn().mockReturnValue('rnd'),
    hashArgon2: jest.fn().mockResolvedValue('hashed'),
  };
  const prisma = {
    setting: { findFirst: jest.fn() },
    user: { count: jest.fn() },
    $transaction: jest.fn(),
  };
  const configService = { get: jest.fn() };
  const settingService = { clearCache: jest.fn() };
  return { security, prisma, configService, settingService };
};

const makeService = (deps = makeDeps()) => ({
  service: new InstallService(
    deps.security as any,
    deps.prisma as any,
    deps.configService as any,
    deps.settingService as any,
  ),
  deps,
});

describe('InstallService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('normalizeUrl', () => {
    let service: InstallService;
    beforeEach(() => {
      service = makeService().service;
    });
    const call = (v: string) => (service as any).normalizeUrl(v);

    it('faz trim e remove barra final', () => {
      expect(call('  http://x.com/  ')).toBe('http://x.com');
      expect(call('http://x.com')).toBe('http://x.com');
      expect(call('http://x.com/path/')).toBe('http://x.com/path');
    });
  });

  describe('base64Encode', () => {
    it('codifica string em base64', () => {
      const { service } = makeService();
      expect((service as any).base64Encode('hello')).toBe(
        Buffer.from('hello').toString('base64'),
      );
    });
  });

  describe('parseEnv', () => {
    let service: InstallService;
    beforeEach(() => {
      service = makeService().service;
    });
    const call = (v: string) => (service as any).parseEnv(v);

    it('ignora comentários e linhas sem "="', () => {
      const result = call('# comment\nFOO=bar\ngarbage\nBAZ=1');
      expect(result).toEqual({ FOO: 'bar', BAZ: '1' });
    });

    it('remove aspas envolventes e desescapa aspas internas', () => {
      const result = call('A="hello world"\nB="a\\"b"');
      expect(result.A).toBe('hello world');
      expect(result.B).toBe('a"b');
    });

    it('preserva "=" no valor', () => {
      const result = call('URL=postgres://u:p@h/db?x=1');
      expect(result.URL).toBe('postgres://u:p@h/db?x=1');
    });
  });

  describe('checkInstallation', () => {
    it('true quando setting installed=true (sem contar usuários)', async () => {
      const { service, deps } = makeService();
      deps.prisma.setting.findFirst.mockResolvedValue({ value: 'true' });
      await expect((service as any).checkInstallation()).resolves.toBe(true);
      expect(deps.prisma.user.count).not.toHaveBeenCalled();
    });

    it('true quando existem usuários', async () => {
      const { service, deps } = makeService();
      deps.prisma.setting.findFirst.mockResolvedValue(null);
      deps.prisma.user.count.mockResolvedValue(2);
      await expect((service as any).checkInstallation()).resolves.toBe(true);
    });

    it('false quando não instalado e sem usuários', async () => {
      const { service, deps } = makeService();
      deps.prisma.setting.findFirst.mockResolvedValue({ value: 'false' });
      deps.prisma.user.count.mockResolvedValue(0);
      await expect((service as any).checkInstallation()).resolves.toBe(false);
    });
  });

  describe('check', () => {
    it('retorna estado de instalação', async () => {
      const { service, deps } = makeService();
      deps.prisma.setting.findFirst.mockResolvedValue({ value: 'true' });
      await expect(service.check()).resolves.toEqual({
        success: true,
        installed: true,
      });
    });
  });

  describe('install', () => {
    it('lança BadRequest quando já instalado', async () => {
      const { service, deps } = makeService();
      deps.prisma.setting.findFirst.mockResolvedValue({ value: 'true' });
      await expect(
        service.install({
          adminUrl: 'http://a',
          apiUrl: 'http://b',
          appName: 'App',
          email: 'e@x.com',
          password: 'pw',
          slogan: 's',
          userName: 'u',
        } as any),
      ).rejects.toThrow(BadRequestException);
      expect(deps.prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
