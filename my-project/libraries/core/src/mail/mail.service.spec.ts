import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { MailService } from './mail.service';

const makeDeps = () => {
  const prismaService = {
    mail: {
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    mail_locale: { deleteMany: jest.fn(), createMany: jest.fn() },
    mail_var: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    locale: { findMany: jest.fn() },
  };
  const mailMainService = { send: jest.fn(), setConfig: jest.fn() };
  const localeService = {};
  const setting = { getSettingValues: jest.fn(), setValue: jest.fn() };
  const integrationApi = { subscribe: jest.fn() };
  return { prismaService, mailMainService, localeService, setting, integrationApi };
};

const makeService = (deps = makeDeps()) => ({
  service: new MailService(
    deps.prismaService as any,
    deps.mailMainService as any,
    deps.localeService as any,
    deps.setting as any,
    deps.integrationApi as any,
  ),
  deps,
});

describe('MailService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('interpolateTemplate', () => {
    const call = (src: string, data: any) =>
      (makeService().service as any).interpolateTemplate(src, data);

    it('interpola variáveis handlebars', () => {
      expect(call('Hello {{name}}', { name: 'Bob' })).toBe('Hello Bob');
    });

    it('converte quebras de linha em <br/>', () => {
      expect(call('Line1\nLine2', {})).toBe('Line1<br/>Line2');
      expect(call('A\r\nB', {})).toBe('A<br/>B');
    });

    it('lança BadRequestException em sintaxe inválida', () => {
      expect(() => call('{{#if foo}}sem fechar', {})).toThrow(
        BadRequestException,
      );
    });
  });

  describe('isSettingEnabled', () => {
    const call = (v: unknown) =>
      (makeService().service as any).isSettingEnabled(v);

    it('reconhece true booleano e string "true"', () => {
      expect(call(true)).toBe(true);
      expect(call('true')).toBe(true);
    });

    it('rejeita outros valores', () => {
      expect(call(false)).toBe(false);
      expect(call('false')).toBe(false);
      expect(call('1')).toBe(false);
      expect(call(undefined)).toBe(false);
      expect(call(null)).toBe(false);
    });
  });

  describe('isMailConfigSlug', () => {
    const call = (v: string) =>
      (makeService().service as any).isMailConfigSlug(v);

    it('reconhece o slug de config de email', () => {
      expect(call('mail-integration-profile-id')).toBe(true);
    });

    it('rejeita outros slugs', () => {
      expect(call('other-setting')).toBe(false);
    });
  });

  describe('onModuleInit', () => {
    it('registra o subscriber de core.setting.changed', () => {
      const { service, deps } = makeService();
      service.onModuleInit();
      expect(deps.integrationApi.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'core.setting.changed',
          consumerName: 'core.mail-config-validator',
        }),
      );
    });
  });

  describe('create', () => {
    it('lança BadRequest quando slug já existe', async () => {
      const { service, deps } = makeService();
      deps.prismaService.mail.findUnique.mockResolvedValue({ id: 1 });
      await expect(
        service.create({ slug: 'dup' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('cria template quando slug é novo', async () => {
      const { service, deps } = makeService();
      deps.prismaService.mail.findUnique.mockResolvedValue(null);
      deps.prismaService.mail.create.mockResolvedValue({ id: 2, slug: 'novo' });
      await expect(
        service.create({ slug: 'novo' } as any),
      ).resolves.toMatchObject({ id: 2 });
    });
  });

  describe('delete', () => {
    it('lança BadRequest quando ids ausente', async () => {
      const { service } = makeService();
      await expect(service.delete({} as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deleta pelos ids fornecidos', async () => {
      const { service, deps } = makeService();
      deps.prismaService.mail.deleteMany.mockResolvedValue({ count: 2 });
      await expect(service.delete({ ids: [1, 2] } as any)).resolves.toEqual({
        count: 2,
      });
      expect(deps.prismaService.mail.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
      });
    });
  });

  describe('importTemplates', () => {
    it('retorna conflitos por slug quando overwrite=false', async () => {
      const { service, deps } = makeService();
      deps.prismaService.mail.findUnique.mockResolvedValue({ id: 5 });
      const result = await service.importTemplates({
        overwrite: false,
        data: [{ slug: 'welcome', translations: [], variables: [] }],
      } as any);
      expect(result).toEqual({ conflicts: ['welcome'] });
    });

    it('cria template novo quando não existe', async () => {
      const { service, deps } = makeService();
      // 1a checagem de conflito: null; 2a checagem dentro do loop: null
      deps.prismaService.mail.findUnique.mockResolvedValue(null);
      deps.prismaService.locale.findMany.mockResolvedValue([
        { code: 'en', id: 1 },
      ]);
      deps.prismaService.mail.create.mockResolvedValue({ id: 10 });

      const result = await service.importTemplates({
        overwrite: false,
        data: [
          {
            slug: 'welcome',
            translations: [{ code: 'en', subject: 'Hi', body: 'Body' }],
            variables: ['name'],
          },
        ],
      } as any);

      expect(result).toEqual({
        success: true,
        imported: 1,
        templates: [10],
      });
      expect(deps.prismaService.mail.create).toHaveBeenCalled();
    });

    it('sobrescreve template existente quando overwrite=true', async () => {
      const { service, deps } = makeService();
      deps.prismaService.mail.findUnique.mockResolvedValue({ id: 7 });
      deps.prismaService.locale.findMany.mockResolvedValue([
        { code: 'en', id: 1 },
      ]);
      deps.prismaService.mail_locale.deleteMany.mockResolvedValue({});
      deps.prismaService.mail_var.deleteMany.mockResolvedValue({});
      deps.prismaService.mail_locale.createMany.mockResolvedValue({});
      deps.prismaService.mail_var.createMany.mockResolvedValue({});

      const result = await service.importTemplates({
        overwrite: true,
        data: [
          {
            slug: 'welcome',
            translations: [{ code: 'en', subject: 'Hi', body: 'Body' }],
            variables: ['name'],
          },
        ],
      } as any);

      expect(result).toEqual({
        success: true,
        imported: 1,
        templates: [7],
      });
      expect(deps.prismaService.mail_locale.deleteMany).toHaveBeenCalledWith({
        where: { mail_id: 7 },
      });
      expect(deps.prismaService.mail_locale.createMany).toHaveBeenCalled();
      expect(deps.prismaService.mail.create).not.toHaveBeenCalled();
    });

    it('lança BadRequest quando ocorre erro ao importar', async () => {
      const { service, deps } = makeService();
      deps.prismaService.mail.findUnique.mockResolvedValue(null);
      deps.prismaService.locale.findMany.mockRejectedValue(
        new Error('db down'),
      );
      await expect(
        service.importTemplates({
          overwrite: true,
          data: [{ slug: 'welcome', translations: [], variables: [] }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('sendTemplatedMail', () => {
    it('aborta silenciosamente quando mail não configurado', async () => {
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue({
        'configured-mail': 'false',
      });
      await expect(
        service.sendTemplatedMail('en', {
          email: 'a@b.com',
          slug: 's',
          variables: {},
        } as any),
      ).resolves.toBeUndefined();
      expect(deps.mailMainService.send).not.toHaveBeenCalled();
    });
  });
});
