import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

const speakeasyVerify = jest.fn();
jest.mock('speakeasy', () => ({
  totp: { verify: (...args: any[]) => speakeasyVerify(...args) },
}));

import { AuthService } from './auth.service';

const makeDeps = () => {
  const prisma = {
    user: { update: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
    user_credential: { findFirst: jest.fn(), updateMany: jest.fn() },
    user_identifier: { findFirst: jest.fn(), findMany: jest.fn() },
    user_identifier_challenge: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user_mfa: { create: jest.fn(), findMany: jest.fn() },
    user_mfa_challenge: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    user_mfa_webauthn: { update: jest.fn() },
    user_recovery_code: { delete: jest.fn() },
    role: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const mail = { sendTemplatedMail: jest.fn().mockResolvedValue(undefined) };
  const setting = { getSettingValues: jest.fn() };
  const security = {
    generateCode: jest.fn(),
    hashWithPepper: jest.fn(),
    validatePassword: jest.fn(),
    hashArgon2: jest.fn(),
    verifyArgon2: jest.fn(),
  };
  const token = {
    createAccessToken: jest.fn(),
    verify: jest.fn(),
    decodeExpiredToken: jest.fn(),
    createMfaChallengeToken: jest.fn(),
    verifyMfaChallengeToken: jest.fn(),
    setRefreshTokenCookie: jest.fn(),
  };
  const session = {
    create: jest.fn(),
    refresh: jest.fn(),
    deleteRefreshTokenCookie: jest.fn(),
  };
  const user = {
    findUserByEmail: jest.fn(),
    findUserById: jest.fn(),
    registerUserActivity: jest.fn(),
  };
  const challenge = {
    sendMfaCodeToMultipleEmails: jest.fn(),
    sendMfaCodeByEmail: jest.fn(),
    forgotEmail: jest.fn(),
    verifyCodePassword: jest.fn(),
    verifyMfaEmailCode: jest.fn(),
  };
  return { prisma, mail, setting, security, token, session, user, challenge };
};

const makeService = (deps = makeDeps()) => ({
  service: new AuthService(
    deps.prisma as any,
    deps.mail as any,
    deps.setting as any,
    deps.security as any,
    deps.token as any,
    deps.session as any,
    deps.user as any,
    deps.challenge as any,
  ),
  deps,
});

describe('AuthService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('getAuthenticationPayload', () => {
    it('cria sessão, gera accessToken e atualiza last_login_at', async () => {
      const { service, deps } = makeService();
      deps.session.create.mockResolvedValue({
        token: 'refresh-token',
        session: { id: 5, expires_at: new Date('2026-01-02') },
      });
      deps.token.createAccessToken.mockResolvedValue('access-token');

      const result = await service.getAuthenticationPayload('pt-BR', 1, '1.2.3.4', 'UA', 'browser-1');

      expect(deps.session.create).toHaveBeenCalledWith('pt-BR', 1, '1.2.3.4', 'UA', 'browser-1');
      expect(deps.prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { last_login_at: expect.any(Date) },
      });
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        session: { id: 5, expires_at: new Date('2026-01-02') },
      });
    });
  });

  describe('hasPendingPasswordReset / getRequiresPasswordResetByUserId', () => {
    it('detecta reset pendente via credenciais do usuário', () => {
      const { service } = makeService();
      const withReset = {
        user_credential: [
          { type: 'password', requires_reset: true, revoked_at: null },
        ],
      };
      const withoutReset = {
        user_credential: [
          { type: 'password', requires_reset: false, revoked_at: null },
        ],
      };
      const revoked = {
        user_credential: [
          { type: 'password', requires_reset: true, revoked_at: new Date() },
        ],
      };

      expect((service as any).hasPendingPasswordReset(withReset)).toBe(true);
      expect((service as any).hasPendingPasswordReset(withoutReset)).toBe(false);
      expect((service as any).hasPendingPasswordReset(revoked)).toBe(false);
      expect((service as any).hasPendingPasswordReset(null)).toBe(false);
    });

    it('consulta o prisma para detectar reset pendente por userId', async () => {
      const { service, deps } = makeService();
      deps.prisma.user_credential.findFirst.mockResolvedValue({ id: 9 });
      await expect(
        (service as any).getRequiresPasswordResetByUserId(1),
      ).resolves.toBe(true);

      deps.prisma.user_credential.findFirst.mockResolvedValue(null);
      await expect(
        (service as any).getRequiresPasswordResetByUserId(1),
      ).resolves.toBe(false);
    });
  });

  describe('loginWithEmailAndPassword', () => {
    it('lança quando o usuário não existe', async () => {
      const { service, deps } = makeService();
      deps.user.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.loginWithEmailAndPassword({}, 'pt-BR', '1.1.1.1', 'UA', {
          email: 'a@b.com',
          password: 'x',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('lança quando a senha é inválida', async () => {
      const { service, deps } = makeService();
      deps.user.findUserByEmail.mockResolvedValue({
        id: 1,
        user_credential: [{ type: 'password' }],
        user_identifier: [],
      });
      deps.security.validatePassword.mockResolvedValue(false);

      await expect(
        service.loginWithEmailAndPassword({}, 'pt-BR', '1.1.1.1', 'UA', {
          email: 'a@b.com',
          password: 'wrong',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('retorna requiresMfa quando existem métodos MFA verificados, enviando código para emails MFA', async () => {
      const { service, deps } = makeService();
      deps.user.findUserByEmail.mockResolvedValue({
        id: 1,
        user_credential: [{ type: 'password' }],
        user_identifier: [{ type: 'email', value: 'a@b.com', verified_at: new Date() }],
      });
      deps.security.validatePassword.mockResolvedValue(true);
      deps.prisma.user_mfa.findMany.mockResolvedValue([
        {
          id: 10,
          type: 'email',
          user_mfa_email: [{ email: 'mfa@b.com' }],
          user_mfa_totp: [],
        },
      ]);
      deps.token.createMfaChallengeToken.mockResolvedValue('mfa-token');

      const result = await service.loginWithEmailAndPassword({}, 'pt-BR', '1.1.1.1', 'UA', {
        email: 'a@b.com',
        password: 'right',
      } as any);

      expect(deps.challenge.sendMfaCodeToMultipleEmails).toHaveBeenCalledWith(
        'pt-BR',
        1,
        ['mfa@b.com'],
      );
      expect(result).toEqual({
        requiresMfa: true,
        mfaToken: 'mfa-token',
        mfaMethods: [{ type: 'email', id: 10 }],
      });
    });

    it('exige MFA por setting quando não há métodos MFA configurados', async () => {
      const { service, deps } = makeService();
      deps.user.findUserByEmail.mockResolvedValue({
        id: 1,
        user_credential: [{ type: 'password' }],
        user_identifier: [{ type: 'email', value: 'a@b.com', verified_at: new Date() }],
      });
      deps.security.validatePassword.mockResolvedValue(true);
      deps.prisma.user_mfa.findMany.mockResolvedValue([]);
      deps.setting.getSettingValues.mockResolvedValue({
        'require-mfa': true,
        'require-email-verification': false,
      });
      deps.security.generateCode.mockReturnValue('123456');
      deps.security.hashWithPepper.mockReturnValue('hash');
      deps.prisma.user_identifier.findFirst.mockResolvedValue({ id: 3 });
      deps.prisma.user_identifier_challenge.create.mockResolvedValue({ id: 4 });
      deps.prisma.user_mfa.create.mockResolvedValue({
        user_mfa_challenge: [{ id: 5 }],
      });
      deps.token.createAccessToken.mockResolvedValue('token-x');

      const result = await service.loginWithEmailAndPassword({}, 'pt-BR', '1.1.1.1', 'UA', {
        email: 'a@b.com',
        password: 'right',
      } as any);

      expect(result).toEqual({ requiresMfa: true, token: 'token-x' });
    });

    it('exige verificação de email quando setting ativo e identifier não verificado', async () => {
      const { service, deps } = makeService();
      deps.user.findUserByEmail.mockResolvedValue({
        id: 1,
        user_credential: [{ type: 'password' }],
        user_identifier: [{ type: 'email', value: 'a@b.com', verified_at: null }],
      });
      deps.security.validatePassword.mockResolvedValue(true);
      deps.prisma.user_mfa.findMany.mockResolvedValue([]);
      deps.setting.getSettingValues.mockResolvedValue({
        'require-mfa': false,
        'require-email-verification': true,
      });
      deps.security.generateCode.mockReturnValue('123456');
      deps.security.hashWithPepper.mockReturnValue('hash');
      deps.prisma.user_identifier.findFirst.mockResolvedValue({ id: 3 });
      deps.prisma.user_identifier_challenge.create.mockResolvedValue({ id: 4 });
      deps.token.createAccessToken.mockResolvedValue('token-y');

      const result = await service.loginWithEmailAndPassword({}, 'pt-BR', '1.1.1.1', 'UA', {
        email: 'a@b.com',
        password: 'right',
      } as any);

      expect(result).toEqual({ requiresEmailVerification: true, token: 'token-y' });
    });

    it('efetua login completo quando nenhuma verificação adicional é exigida', async () => {
      const { service, deps } = makeService();
      const user = {
        id: 1,
        name: 'John',
        user_credential: [{ type: 'password' }],
        user_identifier: [{ type: 'email', value: 'a@b.com', verified_at: new Date() }],
      };
      deps.user.findUserByEmail.mockResolvedValue(user);
      deps.security.validatePassword.mockResolvedValue(true);
      deps.prisma.user_mfa.findMany.mockResolvedValue([]);
      deps.setting.getSettingValues.mockResolvedValue({
        'require-mfa': false,
        'require-email-verification': false,
      });
      deps.prisma.user_identifier.findMany.mockResolvedValue([{ value: 'a@b.com' }]);
      deps.session.create.mockResolvedValue({
        token: 'refresh-1',
        session: { id: 1, expires_at: new Date('2026-01-02') },
      });
      deps.token.createAccessToken.mockResolvedValue('access-1');

      const result = await service.loginWithEmailAndPassword({}, 'pt-BR', '1.1.1.1', 'UA', {
        email: 'a@b.com',
        password: 'right',
      } as any);

      expect(deps.user.registerUserActivity).toHaveBeenCalledWith(1, 'login');
      expect(deps.token.setRefreshTokenCookie).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        requiresPasswordReset: false,
      });
    });

    it('lança quando o login não possui identificador de email', async () => {
      const { service, deps } = makeService();
      deps.user.findUserByEmail.mockResolvedValue({
        id: 1,
        user_credential: [{ type: 'password' }],
        user_identifier: [],
      });
      deps.security.validatePassword.mockResolvedValue(true);
      deps.prisma.user_mfa.findMany.mockResolvedValue([]);
      deps.setting.getSettingValues.mockResolvedValue({
        'require-mfa': false,
        'require-email-verification': false,
      });
      deps.prisma.user_identifier.findMany.mockResolvedValue([]);

      await expect(
        service.loginWithEmailAndPassword({}, 'pt-BR', '1.1.1.1', 'UA', {
          email: 'a@b.com',
          password: 'right',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyRoles / verifyUser', () => {
    it('verifyRoles delega para prisma.role.findMany', async () => {
      const { service, deps } = makeService();
      deps.prisma.role.findMany.mockResolvedValue([{ slug: 'admin' }]);
      await expect(service.verifyRoles('pt-BR', 1)).resolves.toEqual([{ slug: 'admin' }]);
    });

    it('verifyUser remove user_credential e adiciona requires_password_reset', async () => {
      const { service, deps } = makeService();
      deps.user.findUserById.mockResolvedValue({
        id: 1,
        name: 'John',
        user_credential: [{ type: 'password', requires_reset: true, revoked_at: null }],
      });

      const result = await service.verifyUser('pt-BR', 1);

      expect(result).not.toHaveProperty('user_credential');
      expect(result.requires_password_reset).toBe(true);
    });
  });

  describe('refreshAccessToken', () => {
    it('lança Unauthorized quando não há refreshToken', async () => {
      const { service } = makeService();
      await expect(
        service.refreshAccessToken('pt-BR', '', '1.1.1.1', 'UA'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('renova o token com sucesso', async () => {
      const { service, deps } = makeService();
      deps.session.refresh.mockResolvedValue({
        session: { id: 2, user_id: 9 },
        token: 'new-refresh',
      });
      deps.user.findUserById.mockResolvedValue({ id: 9 });
      deps.token.createAccessToken.mockResolvedValue('new-access');

      const result = await service.refreshAccessToken('pt-BR', 'old-refresh', '1.1.1.1', 'UA');

      expect(result).toEqual({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        session: { id: 2, user_id: 9 },
      });
    });
  });

  describe('forgotPassword / logout', () => {
    it('registra atividade e dispara forgotEmail quando usuário existe', async () => {
      const { service, deps } = makeService();
      deps.user.findUserByEmail.mockResolvedValue({ id: 3 });

      const result = await service.forgotPassword('pt-BR', { email: 'a@b.com', app: 'admin' } as any);

      expect(deps.user.registerUserActivity).toHaveBeenCalledWith(3, 'forgotPassword');
      expect(deps.challenge.forgotEmail).toHaveBeenCalledWith('pt-BR', 'a@b.com', 'admin');
      expect(result).toEqual({ success: true });
    });

    it('não registra atividade quando usuário não existe, mas ainda dispara forgotEmail', async () => {
      const { service, deps } = makeService();
      deps.user.findUserByEmail.mockResolvedValue(null);

      await service.forgotPassword('pt-BR', { email: 'a@b.com', app: 'admin' } as any);

      expect(deps.user.registerUserActivity).not.toHaveBeenCalled();
      expect(deps.challenge.forgotEmail).toHaveBeenCalled();
    });

    it('logout usa req.auth.sub quando presente e registra logout', async () => {
      const { service, deps } = makeService();
      deps.session.deleteRefreshTokenCookie.mockResolvedValue({ userId: 99 });

      const result = await service.logout({}, { auth: { sub: 5 } }, 'token');

      expect(deps.user.registerUserActivity).toHaveBeenCalledWith(5, 'logout');
      expect(result).toEqual({ success: true });
    });

    it('logout usa userId retornado da sessão quando req.auth ausente', async () => {
      const { service, deps } = makeService();
      deps.session.deleteRefreshTokenCookie.mockResolvedValue({ userId: 77 });

      await service.logout({}, {}, 'token');

      expect(deps.user.registerUserActivity).toHaveBeenCalledWith(77, 'logout');
    });

    it('logout não registra atividade quando nenhum userId é resolvido', async () => {
      const { service, deps } = makeService();
      deps.session.deleteRefreshTokenCookie.mockResolvedValue(null);

      await service.logout({}, {}, 'token');

      expect(deps.user.registerUserActivity).not.toHaveBeenCalled();
    });
  });

  describe('verifyMfaCode', () => {
    it('lança quando usuário não é encontrado', async () => {
      const { service, deps } = makeService();
      deps.token.verifyMfaChallengeToken.mockResolvedValue({ userId: 1 });
      deps.prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyMfaCode('pt-BR', 'mfa-token', '123456', '1.1.1.1', 'UA', 'totp'),
      ).rejects.toThrow(BadRequestException);
    });

    it('valida com sucesso via totp e retorna tokens com requiresPasswordReset', async () => {
      const { service, deps } = makeService();
      deps.token.verifyMfaChallengeToken.mockResolvedValue({ userId: 1, email: 'a@b.com' });
      deps.prisma.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'John',
        user_mfa: [
          { type: 'totp', user_mfa_totp: [{ secret: 'BASE32SECRET' }] },
        ],
        user_recovery_code: [],
      });
      deps.setting.getSettingValues.mockResolvedValue({});
      speakeasyVerify.mockReturnValue(true);
      deps.session.create.mockResolvedValue({
        token: 'refresh-2',
        session: { id: 2, expires_at: new Date('2026-01-02') },
      });
      deps.token.createAccessToken.mockResolvedValue('access-2');
      deps.prisma.user_credential.findFirst.mockResolvedValue({ id: 1 });

      const result = await service.verifyMfaCode('pt-BR', 'mfa-token', '123456', '1.1.1.1', 'UA', 'totp');

      expect(speakeasyVerify).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
        session: { id: 2, expires_at: new Date('2026-01-02') },
        requiresPasswordReset: true,
      });
    });

    it('lança BadRequest quando o código totp é inválido', async () => {
      const { service, deps } = makeService();
      deps.token.verifyMfaChallengeToken.mockResolvedValue({ userId: 1, email: 'a@b.com' });
      deps.prisma.user.findUnique.mockResolvedValue({
        id: 1,
        user_mfa: [{ type: 'totp', user_mfa_totp: [{ secret: 'SECRET' }] }],
        user_recovery_code: [],
      });
      deps.setting.getSettingValues.mockResolvedValue({});
      speakeasyVerify.mockReturnValue(false);

      await expect(
        service.verifyMfaCode('pt-BR', 'mfa-token', '000000', '1.1.1.1', 'UA', 'totp'),
      ).rejects.toThrow(BadRequestException);
    });

    it('valida com sucesso via email', async () => {
      const { service, deps } = makeService();
      deps.token.verifyMfaChallengeToken.mockResolvedValue({ userId: 1, email: 'a@b.com' });
      deps.prisma.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'John',
        user_mfa: [{ type: 'email' }],
        user_recovery_code: [],
      });
      deps.setting.getSettingValues.mockResolvedValue({});
      deps.challenge.verifyMfaEmailCode.mockResolvedValue(true);
      deps.session.create.mockResolvedValue({
        token: 'refresh-3',
        session: { id: 3, expires_at: new Date('2026-01-02') },
      });
      deps.token.createAccessToken.mockResolvedValue('access-3');
      deps.prisma.user_credential.findFirst.mockResolvedValue(null);

      const result = await service.verifyMfaCode('pt-BR', 'mfa-token', '123456', '1.1.1.1', 'UA', 'email');

      expect(deps.challenge.verifyMfaEmailCode).toHaveBeenCalledWith('pt-BR', 1, '123456');
      expect(result.requiresPasswordReset).toBe(false);
    });

    it('valida com sucesso via recovery code e o consome (delete)', async () => {
      const { service, deps } = makeService();
      deps.token.verifyMfaChallengeToken.mockResolvedValue({ userId: 1, email: 'a@b.com' });
      deps.prisma.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'John',
        user_mfa: [],
        user_recovery_code: [{ id: 8, hash: 'hashed' }],
      });
      deps.setting.getSettingValues.mockResolvedValue({});
      deps.security.verifyArgon2.mockResolvedValue(true);
      deps.session.create.mockResolvedValue({
        token: 'refresh-4',
        session: { id: 4, expires_at: new Date('2026-01-02') },
      });
      deps.token.createAccessToken.mockResolvedValue('access-4');
      deps.prisma.user_credential.findFirst.mockResolvedValue(null);

      await service.verifyMfaCode('pt-BR', 'mfa-token', 'recovery-code', '1.1.1.1', 'UA', 'recovery');

      expect(deps.prisma.user_recovery_code.delete).toHaveBeenCalledWith({ where: { id: 8 } });
    });

    it('lança BadRequest quando o recovery code é inválido', async () => {
      const { service, deps } = makeService();
      deps.token.verifyMfaChallengeToken.mockResolvedValue({ userId: 1, email: 'a@b.com' });
      deps.prisma.user.findUnique.mockResolvedValue({
        id: 1,
        user_mfa: [],
        user_recovery_code: [{ id: 8, hash: 'hashed' }],
      });
      deps.setting.getSettingValues.mockResolvedValue({});
      deps.security.verifyArgon2.mockResolvedValue(false);

      await expect(
        service.verifyMfaCode('pt-BR', 'mfa-token', 'bad-code', '1.1.1.1', 'UA', 'recovery'),
      ).rejects.toThrow(BadRequestException);
    });

    it('sem methodType tenta totp e cai para email quando totp falha', async () => {
      const { service, deps } = makeService();
      deps.token.verifyMfaChallengeToken.mockResolvedValue({ userId: 1, email: 'a@b.com' });
      deps.prisma.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'John',
        user_mfa: [
          { type: 'totp', user_mfa_totp: [{ secret: 'SECRET' }] },
          { type: 'email' },
        ],
        user_recovery_code: [],
      });
      deps.setting.getSettingValues.mockResolvedValue({});
      speakeasyVerify.mockReturnValue(false);
      deps.challenge.verifyMfaEmailCode.mockResolvedValue(true);
      deps.session.create.mockResolvedValue({
        token: 'refresh-5',
        session: { id: 5, expires_at: new Date('2026-01-02') },
      });
      deps.token.createAccessToken.mockResolvedValue('access-5');
      deps.prisma.user_credential.findFirst.mockResolvedValue(null);

      const result = await service.verifyMfaCode('pt-BR', 'mfa-token', '123456', '1.1.1.1', 'UA');

      expect(deps.challenge.verifyMfaEmailCode).toHaveBeenCalled();
      expect(result.accessToken).toBe('access-5');
    });
  });

  describe('verifyMfaRecoveryCode', () => {
    it('lança quando usuário não é encontrado', async () => {
      const { service, deps } = makeService();
      deps.token.verifyMfaChallengeToken.mockResolvedValue({ userId: 1 });
      deps.prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyMfaRecoveryCode('pt-BR', 'mfa-token', 'code', '1.1.1.1', 'UA'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lança quando o código não confere com nenhum recovery code', async () => {
      const { service, deps } = makeService();
      deps.token.verifyMfaChallengeToken.mockResolvedValue({ userId: 1 });
      deps.prisma.user.findUnique.mockResolvedValue({
        id: 1,
        user_recovery_code: [{ id: 1, hash: 'a' }],
      });
      deps.security.verifyArgon2.mockResolvedValue(false);

      await expect(
        service.verifyMfaRecoveryCode('pt-BR', 'mfa-token', 'bad', '1.1.1.1', 'UA'),
      ).rejects.toThrow(BadRequestException);
    });

    it('consome o recovery code e retorna tokens quando válido', async () => {
      const { service, deps } = makeService();
      deps.token.verifyMfaChallengeToken.mockResolvedValue({ userId: 1 });
      deps.prisma.user.findUnique.mockResolvedValue({
        id: 1,
        user_recovery_code: [{ id: 1, hash: 'a' }],
      });
      deps.security.verifyArgon2.mockResolvedValue(true);
      deps.session.create.mockResolvedValue({
        token: 'refresh-6',
        session: { id: 6, expires_at: new Date('2026-01-02') },
      });
      deps.token.createAccessToken.mockResolvedValue('access-6');
      deps.prisma.user_credential.findFirst.mockResolvedValue(null);

      const result = await service.verifyMfaRecoveryCode('pt-BR', 'mfa-token', 'good', '1.1.1.1', 'UA');

      expect(deps.prisma.user_recovery_code.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result.accessToken).toBe('access-6');
    });
  });

  describe('resendMfaCode', () => {
    it('lança quando não há mfa de email verificado', async () => {
      const { service, deps } = makeService();
      deps.token.verifyMfaChallengeToken.mockResolvedValue({ userId: 1 });
      deps.prisma.user_mfa.findMany.mockResolvedValue([]);

      await expect(service.resendMfaCode('pt-BR', 'mfa-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lança quando o método de email não possui user_mfa_email', async () => {
      const { service, deps } = makeService();
      deps.token.verifyMfaChallengeToken.mockResolvedValue({ userId: 1 });
      deps.prisma.user_mfa.findMany.mockResolvedValue([{ user_mfa_email: [] }]);

      await expect(service.resendMfaCode('pt-BR', 'mfa-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('reenvia o código quando há mfa de email configurado', async () => {
      const { service, deps } = makeService();
      deps.token.verifyMfaChallengeToken.mockResolvedValue({ userId: 1 });
      deps.prisma.user_mfa.findMany.mockResolvedValue([
        { user_mfa_email: [{ email: 'a@b.com' }] },
      ]);

      const result = await service.resendMfaCode('pt-BR', 'mfa-token');

      expect(deps.challenge.sendMfaCodeByEmail).toHaveBeenCalledWith('pt-BR', 1, 'a@b.com');
      expect(result).toEqual({ success: true, hasEmailMfa: true });
    });
  });

  describe('requiresMfaForLogin / requiresEmailVerificationForLogin', () => {
    const settings = () => ({
      'mfa-email-code-length': 6,
      'mfa-challenge-expiration-minutes': 15,
    });

    it('lança NotFound quando o identifier de email não existe (MFA)', async () => {
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue(settings());
      deps.security.generateCode.mockReturnValue('123456');
      deps.security.hashWithPepper.mockReturnValue('hash');
      deps.prisma.user_identifier.findFirst.mockResolvedValue(null);

      await expect(
        service.requiresMfaForLogin('pt-BR', 'a@b.com', { id: 1, name: 'John' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('cria challenge, mfa e envia email, retornando token', async () => {
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue(settings());
      deps.security.generateCode.mockReturnValue('123456');
      deps.security.hashWithPepper.mockReturnValue('hash');
      deps.prisma.user_identifier.findFirst.mockResolvedValue({ id: 2 });
      deps.prisma.user_identifier_challenge.create.mockResolvedValue({ id: 3 });
      deps.prisma.user_mfa.create.mockResolvedValue({ user_mfa_challenge: [{ id: 4 }] });
      deps.token.createAccessToken.mockResolvedValue('mfa-tok');

      const result = await service.requiresMfaForLogin('pt-BR', 'a@b.com', { id: 1, name: 'John' });

      expect(deps.mail.sendTemplatedMail).toHaveBeenCalled();
      expect(result).toEqual({ requiresMfa: true, token: 'mfa-tok' });
    });

    it('lança NotFound quando o identifier de email não existe (verificação de email)', async () => {
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue(settings());
      deps.security.generateCode.mockReturnValue('123456');
      deps.security.hashWithPepper.mockReturnValue('hash');
      deps.prisma.user_identifier.findFirst.mockResolvedValue(null);

      await expect(
        service.requiresEmailVerificationForLogin('pt-BR', 'a@b.com', { id: 1, name: 'John' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('cria challenge e envia email de verificação, retornando token', async () => {
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue(settings());
      deps.security.generateCode.mockReturnValue('123456');
      deps.security.hashWithPepper.mockReturnValue('hash');
      deps.prisma.user_identifier.findFirst.mockResolvedValue({ id: 2 });
      deps.prisma.user_identifier_challenge.create.mockResolvedValue({ id: 3 });
      deps.token.createAccessToken.mockResolvedValue('verify-tok');

      const result = await service.requiresEmailVerificationForLogin('pt-BR', 'a@b.com', {
        id: 1,
        name: 'John',
      });

      expect(result).toEqual({ requiresEmailVerification: true, token: 'verify-tok' });
    });
  });

  describe('emailVerificationLoginResend', () => {
    it('reenvia a verificação usando o payload do token válido', async () => {
      const { service, deps } = makeService();
      deps.token.verify.mockResolvedValue({ challengeIdentifierId: 1, email: 'a@b.com' });
      deps.prisma.user_identifier_challenge.findUnique.mockResolvedValue({
        user_identifier: { user_id: 9 },
      });
      deps.user.findUserById.mockResolvedValue({ id: 9, name: 'John' });
      deps.setting.getSettingValues.mockResolvedValue({
        'mfa-email-code-length': 6,
        'mfa-challenge-expiration-minutes': 15,
      });
      deps.security.generateCode.mockReturnValue('123456');
      deps.security.hashWithPepper.mockReturnValue('hash');
      deps.prisma.user_identifier.findFirst.mockResolvedValue({ id: 2 });
      deps.prisma.user_identifier_challenge.create.mockResolvedValue({ id: 3 });
      deps.token.createAccessToken.mockResolvedValue('resend-tok');

      const result = await service.emailVerificationLoginResend('pt-BR', 'tok');

      expect(result).toEqual({ requiresEmailVerification: true, token: 'resend-tok' });
    });

    it('lança quando o challenge do token não existe', async () => {
      const { service, deps } = makeService();
      deps.token.verify.mockResolvedValue({ challengeIdentifierId: 1, email: 'a@b.com' });
      deps.prisma.user_identifier_challenge.findUnique.mockResolvedValue(null);

      await expect(service.emailVerificationLoginResend('pt-BR', 'tok')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('gera um novo token e tenta novamente quando o token expirou', async () => {
      const { service, deps } = makeService();
      deps.token.verify
        .mockRejectedValueOnce(Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' }))
        .mockResolvedValueOnce({ challengeIdentifierId: 1, email: 'a@b.com' });
      deps.token.decodeExpiredToken.mockResolvedValue({
        challengeIdentifierId: 1,
        email: 'a@b.com',
      });
      deps.token.createAccessToken.mockResolvedValueOnce('new-tok').mockResolvedValueOnce('resend-tok-2');
      deps.prisma.user_identifier_challenge.findUnique.mockResolvedValue({
        user_identifier: { user_id: 9 },
      });
      deps.user.findUserById.mockResolvedValue({ id: 9, name: 'John' });
      deps.setting.getSettingValues.mockResolvedValue({
        'mfa-email-code-length': 6,
        'mfa-challenge-expiration-minutes': 15,
      });
      deps.security.generateCode.mockReturnValue('123456');
      deps.security.hashWithPepper.mockReturnValue('hash');
      deps.prisma.user_identifier.findFirst.mockResolvedValue({ id: 2 });
      deps.prisma.user_identifier_challenge.create.mockResolvedValue({ id: 3 });

      const result = await service.emailVerificationLoginResend('pt-BR', 'expired-tok');

      expect(deps.token.decodeExpiredToken).toHaveBeenCalledWith('expired-tok');
      expect(result).toEqual({ requiresEmailVerification: true, token: 'resend-tok-2' });
    });

    it('propaga outros erros não relacionados a expiração', async () => {
      const { service, deps } = makeService();
      deps.token.verify.mockRejectedValue(new Error('unexpected'));

      await expect(service.emailVerificationLoginResend('pt-BR', 'tok')).rejects.toThrow(
        'unexpected',
      );
    });
  });

  describe('emailVerificationLogin', () => {
    it('lança quando o challenge não existe', async () => {
      const { service, deps } = makeService();
      deps.token.verify.mockResolvedValue({ challengeIdentifierId: 1 });
      deps.prisma.user_identifier_challenge.findUnique.mockResolvedValue(null);

      await expect(
        service.emailVerificationLogin('pt-BR', 'tok', '123456', '1.1.1.1', 'UA', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('lança quando o código informado é inválido', async () => {
      const { service, deps } = makeService();
      deps.token.verify.mockResolvedValue({ challengeIdentifierId: 1 });
      deps.prisma.user_identifier_challenge.findUnique.mockResolvedValue({
        hash: 'expected-hash',
        user_identifier_id: 2,
        user_identifier: { user_id: 9 },
      });
      deps.security.hashWithPepper.mockReturnValue('other-hash');

      await expect(
        service.emailVerificationLogin('pt-BR', 'tok', '000000', '1.1.1.1', 'UA', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('verifica o código, marca como verificado e efetua login', async () => {
      const { service, deps } = makeService();
      deps.token.verify.mockResolvedValue({ challengeIdentifierId: 1 });
      deps.prisma.user_identifier_challenge.findUnique.mockResolvedValue({
        hash: 'matching-hash',
        user_identifier_id: 2,
        user_identifier: { user_id: 9 },
      });
      deps.security.hashWithPepper.mockReturnValue('matching-hash');
      deps.prisma.$transaction.mockImplementation(async (cb: any) =>
        cb({
          user_identifier_challenge: { update: jest.fn() },
          user_identifier: { update: jest.fn() },
        }),
      );
      const user = {
        id: 9,
        name: 'John',
        user_identifier: [{ type: 'email', value: 'a@b.com' }],
      };
      deps.user.findUserById.mockResolvedValue(user);
      deps.prisma.user_identifier.findMany.mockResolvedValue([{ value: 'a@b.com' }]);
      deps.session.create.mockResolvedValue({
        token: 'refresh-7',
        session: { id: 7, expires_at: new Date('2026-01-02') },
      });
      deps.token.createAccessToken.mockResolvedValue('access-7');
      deps.prisma.user_credential.findFirst.mockResolvedValue(null);

      const result = await service.emailVerificationLogin('pt-BR', 'tok', '123456', '1.1.1.1', 'UA', {});

      expect(deps.prisma.user_identifier_challenge.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { attempts: { increment: 1 } } }),
      );
      expect(result.accessToken).toBe('access-7');
    });
  });

  describe('forgotResetPassword', () => {
    it('atualiza a senha, envia confirmação e retorna nova sessão', async () => {
      const { service, deps } = makeService();
      deps.challenge.verifyCodePassword.mockResolvedValue({
        user_identifier: {
          user_id: 1,
          value: 'a@b.com',
          id: 2,
          user: { name: 'John' },
        },
      });
      deps.security.hashArgon2.mockResolvedValue('new-hash');
      deps.session.create.mockResolvedValue({
        token: 'refresh-8',
        session: { id: 8, expires_at: new Date('2026-01-02') },
      });
      deps.token.createAccessToken.mockResolvedValue('access-8');

      const result = await service.forgotResetPassword('pt-BR', 'newpass', 'code', '1.1.1.1', 'UA');

      expect(deps.prisma.user_credential.updateMany).toHaveBeenCalledWith({
        where: { type: 'password', user_id: 1 },
        data: { hash: 'new-hash', requires_reset: false },
      });
      expect(deps.user.registerUserActivity).toHaveBeenCalledWith(2, 'resetPassword');
      expect(result.accessToken).toBe('access-8');
    });
  });
});
