import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChallengeService } from './challenge.service';

const makeDeps = () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    user_mfa: { create: jest.fn(), findFirst: jest.fn() },
    user_mfa_challenge: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    user_identifier: { findFirst: jest.fn() },
    user_identifier_challenge: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  const security = {
    hashWithPepper: jest.fn((v: string) => `hash(${v})`),
  };
  const setting = {
    getSettingValues: jest.fn().mockResolvedValue({}),
  };
  const token = {
    createOpaqueToken: jest.fn().mockResolvedValue('tok'),
  };
  const mail = {
    sendTemplatedMail: jest.fn().mockResolvedValue(undefined),
  };
  return { prisma, security, setting, token, mail };
};

const makeService = (deps = makeDeps()) => ({
  service: new ChallengeService(
    deps.prisma as any,
    deps.security as any,
    deps.setting as any,
    deps.token as any,
    deps.mail as any,
  ),
  deps,
});

describe('ChallengeService', () => {
  let getRandomValuesSpy: any;

  beforeEach(() => {
    // Estabiliza a geração de código: cada byte = 7 → dígito '7'.
    getRandomValuesSpy = jest
      .spyOn(globalThis.crypto, 'getRandomValues')
      .mockImplementation((arr: any) => {
        arr.fill(7);
        return arr;
      });
    jest.useFakeTimers().setSystemTime(new Date('2026-01-15T12:00:00Z'));
  });

  afterEach(() => {
    getRandomValuesSpy.mockRestore();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('resolveAppUrl', () => {
    const call = (settings: any, app?: string) =>
      (makeService().service as any).resolveAppUrl(settings, app);

    it('retorna a URL do app correspondente (key=value)', () => {
      const settings = {
        'app-urls': ['admin=https://admin.com', 'training = https://train.com'],
        url: 'https://default.com',
      };
      expect(call(settings, 'admin')).toBe('https://admin.com');
    });

    it('faz trim de chave e valor', () => {
      const settings = {
        'app-urls': ['training = https://train.com'],
        url: 'https://default.com',
      };
      expect(call(settings, 'training')).toBe('https://train.com');
    });

    it('cai para settings.url quando app não encontrado', () => {
      const settings = {
        'app-urls': ['admin=https://admin.com'],
        url: 'https://default.com',
      };
      expect(call(settings, 'unknown')).toBe('https://default.com');
    });

    it('cai para settings.url quando app não informado', () => {
      const settings = { 'app-urls': [], url: 'https://default.com' };
      expect(call(settings)).toBe('https://default.com');
    });

    it('trata app-urls não-array como vazio', () => {
      const settings = { 'app-urls': 'x', url: 'https://default.com' };
      expect(call(settings, 'admin')).toBe('https://default.com');
    });
  });

  describe('forgotEmail', () => {
    it('lança BadRequest (rate limit) quando há 3+ challenges abertos', async () => {
      const { service, deps } = makeService();
      deps.prisma.user_identifier_challenge.count.mockResolvedValue(3);
      await expect(
        service.forgotEmail('en', 'a@b.com'),
      ).rejects.toThrow(BadRequestException);
      expect(deps.prisma.user_identifier.findFirst).not.toHaveBeenCalled();
    });

    it('lança BadRequest quando usuário não encontrado', async () => {
      const { service, deps } = makeService();
      deps.prisma.user_identifier_challenge.count.mockResolvedValue(0);
      deps.prisma.user_identifier.findFirst.mockResolvedValue(null);
      await expect(
        service.forgotEmail('en', 'a@b.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('cria challenge e envia email com link base64', async () => {
      const { service, deps } = makeService();
      deps.prisma.user_identifier_challenge.count.mockResolvedValue(0);
      deps.prisma.user_identifier.findFirst.mockResolvedValue({
        id: 10,
        user: { name: 'Bob' },
      });
      deps.setting.getSettingValues.mockResolvedValue({
        'mfa-challenge-expiration-minutes': 15,
        url: 'https://app.com',
        'app-urls': [],
      });
      deps.prisma.user_identifier_challenge.create.mockResolvedValue({ id: 1 });

      const result = await service.forgotEmail('en', 'a@b.com');

      expect(result).toEqual({ id: 1 });
      const base64 = Buffer.from('tok').toString('base64');
      expect(deps.mail.sendTemplatedMail).toHaveBeenCalledWith(
        'en',
        expect.objectContaining({
          email: 'a@b.com',
          slug: 'auth-forget-password',
          variables: expect.objectContaining({
            link: `https://app.com/reset-password?token=${base64}`,
            name: 'Bob',
          }),
        }),
      );
    });
  });

  describe('verifyCodePassword', () => {
    it('retorna challenge quando válido', async () => {
      const { service, deps } = makeService();
      const challenge = { id: 1, user_identifier: { user: { id: 2 } } };
      deps.prisma.user_identifier_challenge.findFirst.mockResolvedValue(
        challenge,
      );
      await expect(
        service.verifyCodePassword('en', '123456'),
      ).resolves.toBe(challenge);
      expect(deps.security.hashWithPepper).toHaveBeenCalledWith('123456');
    });

    it('lança BadRequest quando challenge inválido/expirado', async () => {
      const { service, deps } = makeService();
      deps.prisma.user_identifier_challenge.findFirst.mockResolvedValue(null);
      await expect(
        service.verifyCodePassword('en', '000000'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyMfaEmailCode', () => {
    it('retorna false quando challenge não encontrado', async () => {
      const { service, deps } = makeService();
      deps.prisma.user_mfa_challenge.findFirst.mockResolvedValue(null);
      await expect(
        service.verifyMfaEmailCode('en', 1, '123456'),
      ).resolves.toBe(false);
      expect(deps.prisma.user_mfa_challenge.delete).not.toHaveBeenCalled();
    });

    it('deleta o challenge e retorna true quando válido', async () => {
      const { service, deps } = makeService();
      deps.prisma.user_mfa_challenge.findFirst.mockResolvedValue({ id: 9 });
      deps.prisma.user_mfa_challenge.delete.mockResolvedValue({ id: 9 });
      await expect(
        service.verifyMfaEmailCode('en', 1, '123456'),
      ).resolves.toBe(true);
      expect(deps.prisma.user_mfa_challenge.delete).toHaveBeenCalledWith({
        where: { id: 9 },
      });
    });
  });

  describe('verifyCode', () => {
    it('lança BadRequest quando hash não bate com providedHash', async () => {
      const { service } = makeService();
      // hashWithPepper('123456') => 'hash(123456)' !== 'other'
      await expect(
        service.verifyCode('en', 1, '123456', 'other'),
      ).rejects.toThrow(BadRequestException);
    });

    it('retorna success quando sem name/email e hash confere', async () => {
      const { service } = makeService();
      await expect(
        service.verifyCode('en', 1, '123456', 'hash(123456)'),
      ).resolves.toEqual({ success: true });
    });

    it('cria user_mfa quando name e email presentes', async () => {
      const { service, deps } = makeService();
      deps.prisma.user_mfa.create.mockResolvedValue({ id: 3, user_id: 1 });
      await expect(
        service.verifyCode('en', 1, '123456', 'hash(123456)', 'Nome', 'e@x.com'),
      ).resolves.toMatchObject({ id: 3 });
      expect(deps.prisma.user_mfa.create).toHaveBeenCalled();
    });
  });

  describe('verifyMfaEmail', () => {
    it('lança NotFound quando usuário não existe', async () => {
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue({});
      deps.prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.verifyMfaEmail('en', 1, 'a@b.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('gera código, cria challenge e retorna challengeId', async () => {
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue({
        'mfa-email-code-length': 6,
        'mfa-challenge-expiration-minutes': 15,
      });
      deps.prisma.user.findUnique.mockResolvedValue({ name: 'Bob' });
      deps.prisma.user_mfa.create.mockResolvedValue({
        id: 3,
        user_mfa_challenge: [{ id: 42 }],
      });

      const result = await service.verifyMfaEmail('en', 1, 'a@b.com');

      expect(result).toEqual({ challengeId: 42 });
      // código estabilizado: cada byte 7 -> '7' repetido 6x
      expect(deps.mail.sendTemplatedMail).toHaveBeenCalledWith(
        'en',
        expect.objectContaining({
          slug: 'auth-email-verification-code',
          variables: expect.objectContaining({ code: '777777', name: 'Bob' }),
        }),
      );
    });
  });

  describe('sendMfaCodeToMultipleEmails', () => {
    it('retorna success sem enviar quando lista vazia', async () => {
      const { service, deps } = makeService();
      await expect(
        service.sendMfaCodeToMultipleEmails('en', 1, []),
      ).resolves.toEqual({ success: true });
      expect(deps.prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('lança BadRequest quando usuário não existe', async () => {
      const { service, deps } = makeService();
      deps.prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.sendMfaCodeToMultipleEmails('en', 1, ['a@b.com']),
      ).rejects.toThrow(BadRequestException);
    });

    it('envia para cada email usando mfa existente', async () => {
      const { service, deps } = makeService();
      deps.prisma.user.findUnique.mockResolvedValue({ name: 'Bob' });
      deps.setting.getSettingValues.mockResolvedValue({
        'mfa-email-code-length': 6,
        'mfa-challenge-expiration-minutes': 15,
      });
      deps.prisma.user_mfa.findFirst.mockResolvedValue({ id: 5 });
      deps.prisma.user_mfa_challenge.create.mockResolvedValue({ id: 1 });

      await service.sendMfaCodeToMultipleEmails('en', 1, ['a@b.com', 'c@d.com']);

      expect(deps.mail.sendTemplatedMail).toHaveBeenCalledTimes(2);
      const createArg = deps.prisma.user_mfa_challenge.create.mock.calls[0][0];
      expect(createArg.data.user_mfa).toEqual({ connect: { id: 5 } });
    });
  });

  describe('sendMfaCodeByEmail', () => {
    it('lança BadRequest quando usuário não existe', async () => {
      const { service, deps } = makeService();
      deps.prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.sendMfaCodeByEmail('en', 1, 'a@b.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('cria user_mfa quando não existe (branch create)', async () => {
      const { service, deps } = makeService();
      deps.prisma.user.findUnique.mockResolvedValue({ name: 'Bob' });
      deps.setting.getSettingValues.mockResolvedValue({
        'mfa-email-code-length': 6,
        'mfa-challenge-expiration-minutes': 15,
      });
      deps.prisma.user_mfa.findFirst.mockResolvedValue(null);
      deps.prisma.user_mfa_challenge.create.mockResolvedValue({ id: 1 });

      await service.sendMfaCodeByEmail('en', 1, 'a@b.com');

      const createArg = deps.prisma.user_mfa_challenge.create.mock.calls[0][0];
      expect(createArg.data.user_mfa.create).toMatchObject({
        name: 'Bob',
        type: 'email',
      });
    });
  });
});
