import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OAuthService } from './oauth.service';
import {
  OAuthCallbackAlreadyProcessedError,
  OAuthCallbackInProgressError,
  OAuthProviderException,
} from './oauth.errors';

const makeProvider = (type: string) => ({
  getProviderType: () => type,
  getAuthUrl: jest.fn(),
  getProfile: jest.fn(),
});

const makeDeps = () => {
  const google = makeProvider('GOOGLE');
  const facebook = makeProvider('FACEBOOK');
  const microsoft = makeProvider('MICROSOFT');
  const github = makeProvider('GITHUB');
  const microsoftEntraId = makeProvider('MICROSOFT_ENTRA_ID');
  const apple = makeProvider('APPLE');
  const linkedin = makeProvider('LINKEDIN');
  const callbackCoordinator = { execute: jest.fn() };
  const auth = { getAuthenticationPayload: jest.fn() };
  const file = { upload: jest.fn() };
  const mail = { sendTemplatedMail: jest.fn() };
  const security = {
    hashSha256: jest.fn().mockReturnValue('HASH'),
    randomOpaque: jest.fn().mockReturnValue('TOK'),
    signHmacSha256: jest.fn().mockReturnValue('SIG'),
    verifyHmacSha256: jest.fn().mockReturnValue(true),
  };
  const prisma = {
    $executeRaw: jest.fn(),
    oauth_mobile_state_token: { findFirst: jest.fn() },
  };
  const token = { setRefreshTokenCookie: jest.fn() };
  const setting = { getSettingValues: jest.fn().mockResolvedValue({}) };
  const user = { registerUserActivity: jest.fn() };
  return {
    google, facebook, microsoft, github, microsoftEntraId, apple, linkedin,
    callbackCoordinator, auth, file, mail, security, prisma, token, setting, user,
  };
};

const makeService = (deps = makeDeps()) => ({
  service: new OAuthService(
    deps.google as any,
    deps.facebook as any,
    deps.microsoft as any,
    deps.github as any,
    deps.microsoftEntraId as any,
    deps.apple as any,
    deps.linkedin as any,
    deps.callbackCoordinator as any,
    deps.auth as any,
    deps.file as any,
    deps.mail as any,
    deps.security as any,
    deps.prisma as any,
    deps.token as any,
    deps.setting as any,
    deps.user as any,
  ),
  deps,
});

describe('OAuthService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('getProvider', () => {
    it('resolve provider por chave uppercase', () => {
      const { service, deps } = makeService();
      expect((service as any).getProvider('google')).toBe(deps.google);
    });
    it('lança para provider não suportado', () => {
      const { service } = makeService();
      expect(() => (service as any).getProvider('unknown')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('isProviderEnabled', () => {
    it('false quando slug desconhecido', async () => {
      const { service } = makeService();
      await expect(service.isProviderEnabled('nope' as any)).resolves.toBe(false);
    });
    it('true quando setting boolean true', async () => {
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue({ 'oauth-google-enabled': true });
      await expect(service.isProviderEnabled('google' as any)).resolves.toBe(true);
    });
    it('true quando setting string "true"', async () => {
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue({ 'oauth-google-enabled': 'true' });
      await expect(service.isProviderEnabled('google' as any)).resolves.toBe(true);
    });
    it('false quando setting desligado', async () => {
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue({ 'oauth-google-enabled': false });
      await expect(service.isProviderEnabled('google' as any)).resolves.toBe(false);
    });
  });

  describe('getWebAuthUrl', () => {
    it('assina o app iniciador e o fluxo no state', async () => {
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue({ 'oauth-google-enabled': true });
      deps.google.getAuthUrl.mockResolvedValue(
        'https://accounts.google.com/o/oauth2/v2/auth?client_id=x',
      );

      const url = await service.getWebAuthUrl('google' as any, 'login', 'training');

      expect(url).toContain('state=hhweb.training.login.SIG');
    });

    it('usa o sentinel "self" no state quando redirectApp ausente', async () => {
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue({ 'oauth-google-enabled': true });
      deps.google.getAuthUrl.mockResolvedValue('https://accounts.google.com/auth?client_id=x');

      const url = await service.getWebAuthUrl('google' as any, 'register');

      expect(url).toContain('state=hhweb.self.register.SIG');
    });

    it('cai para "self" quando redirectApp tem formato inválido', async () => {
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue({ 'oauth-google-enabled': true });
      deps.google.getAuthUrl.mockResolvedValue('https://accounts.google.com/auth?client_id=x');

      const url = await service.getWebAuthUrl('google' as any, 'login', 'app inválido!!');

      expect(url).toContain('state=hhweb.self.login.SIG');
    });
  });

  describe('resolveWebForward', () => {
    it('resolve app e flow do state assinado válido', async () => {
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue({
        'app-urls': ['training=http://localhost:3001'],
      });

      await expect(
        service.resolveWebForward('hhweb.training.login.SIG'),
      ).resolves.toEqual({ origin: 'http://localhost:3001', flow: 'login' });
    });

    it('retorna null para state que não é hhweb', async () => {
      const { service } = makeService();
      await expect(service.resolveWebForward('login')).resolves.toBeNull();
    });

    it('retorna null quando a assinatura é inválida', async () => {
      const { service, deps } = makeService();
      deps.security.verifyHmacSha256.mockReturnValue(false);
      await expect(
        service.resolveWebForward('hhweb.training.login.SIG'),
      ).resolves.toBeNull();
    });
  });

  describe('getProviderScopes', () => {
    it('vazio quando provider sem slug', async () => {
      const { service } = makeService();
      await expect((service as any).getProviderScopes('nope')).resolves.toBe('');
    });
    it('junta array por vírgula', async () => {
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue({
        'oauth-google-scopes': ['a', 'b'],
      });
      await expect((service as any).getProviderScopes('google')).resolves.toBe('a,b');
    });
    it('retorna string bruta', async () => {
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue({ 'oauth-google-scopes': 'x' });
      await expect((service as any).getProviderScopes('google')).resolves.toBe('x');
    });
  });

  describe('buildCallbackKey', () => {
    it('formata provider:type:hash', () => {
      const { service, deps } = makeService();
      expect((service as any).buildCallbackKey('Google', 'login', 'code')).toBe(
        'google:login:HASH',
      );
      expect(deps.security.hashSha256).toHaveBeenCalledWith('code');
    });
  });

  describe('summarizeUserAgent', () => {
    let service: OAuthService;
    beforeEach(() => {
      service = makeService().service;
    });
    const call = (v?: string) => (service as any).summarizeUserAgent(v);

    it('n/a quando ausente', () => {
      expect(call(undefined)).toBe('n/a');
    });
    it('mantém curto', () => {
      expect(call('short')).toBe('short');
    });
    it('trunca > 120 chars', () => {
      const long = 'a'.repeat(200);
      const result = call(long);
      expect(result.endsWith('...')).toBe(true);
      expect(result).toHaveLength(120);
    });
  });

  describe('formatAuthResponse', () => {
    let service: OAuthService;
    beforeEach(() => {
      service = makeService().service;
    });

    it('inclui refresh quando solicitado', () => {
      expect((service as any).formatAuthResponse('a', 'r', true)).toEqual({
        accessToken: 'a',
        refreshToken: 'r',
      });
    });
    it('omite refresh por padrão', () => {
      expect((service as any).formatAuthResponse('a', 'r')).toEqual({
        accessToken: 'a',
      });
    });
  });

  describe('resolveProfileScopes', () => {
    it('usa oauth_scopes do profile quando string', () => {
      const { service } = makeService();
      expect(
        (service as any).resolveProfileScopes('google', { oauth_scopes: 's1' }),
      ).toBe('s1');
    });
    it('cai para settings quando ausente', async () => {
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue({ 'oauth-google-scopes': 's2' });
      await expect(
        (service as any).resolveProfileScopes('google', {}),
      ).resolves.toBe('s2');
    });
  });

  describe('mapCallbackError', () => {
    let service: OAuthService;
    beforeEach(() => {
      service = makeService().service;
    });
    const map = (err: unknown) =>
      (service as any).mapCallbackError('en', 'google', 'login', err);

    it('repassa exceções HTTP conhecidas', () => {
      const err = new BadRequestException('x');
      expect(map(err)).toBe(err);
    });
    it('mapeia AlreadyProcessed para BadRequest', () => {
      expect(map(new OAuthCallbackAlreadyProcessedError())).toBeInstanceOf(
        BadRequestException,
      );
    });
    it('mapeia InProgress para Conflict', () => {
      expect(map(new OAuthCallbackInProgressError())).toBeInstanceOf(
        ConflictException,
      );
    });
    it('mapeia OAuthProviderException invalid_callback para BadRequest', () => {
      expect(
        map(new OAuthProviderException('google', 'invalid_callback', 'msg')),
      ).toBeInstanceOf(BadRequestException);
    });
    it('mapeia OAuthProviderException upstream para ServiceUnavailable', () => {
      expect(
        map(new OAuthProviderException('google', 'upstream_failure', 'msg', 500)),
      ).toBeInstanceOf(ServiceUnavailableException);
    });
    it('mapeia erro genérico para ServiceUnavailable', () => {
      expect(map(new Error('boom'))).toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('consumeMobileState', () => {
    it('false sem state ou não-hhmob', async () => {
      const { service } = makeService();
      await expect((service as any).consumeMobileState(undefined, 'google', 'app://x')).resolves.toBe(false);
      await expect((service as any).consumeMobileState('plain', 'google', 'app://x')).resolves.toBe(false);
    });
    it('false quando partes faltando', async () => {
      const { service } = makeService();
      await expect((service as any).consumeMobileState('hhmob.tok', 'google', 'app://x')).resolves.toBe(false);
    });
    it('false quando flow inválido', async () => {
      const { service } = makeService();
      await expect((service as any).consumeMobileState('hhmob.tok.sig.badflow', 'google', 'app://x')).resolves.toBe(false);
    });
    it('false quando assinatura inválida', async () => {
      const { service, deps } = makeService();
      deps.security.verifyHmacSha256.mockReturnValue(false);
      await expect((service as any).consumeMobileState('hhmob.tok.sig.login', 'google', 'app://x')).resolves.toBe(false);
    });
    it('true quando consome linha no banco', async () => {
      const { service, deps } = makeService();
      deps.prisma.$executeRaw.mockResolvedValue(1);
      await expect((service as any).consumeMobileState('hhmob.tok.sig.login', 'google', 'app://x')).resolves.toBe(true);
    });
    it('false quando nenhuma linha consumida', async () => {
      const { service, deps } = makeService();
      deps.prisma.$executeRaw.mockResolvedValue(0);
      await expect((service as any).consumeMobileState('hhmob.tok.sig.login', 'google', 'app://x')).resolves.toBe(false);
    });
  });

  describe('getMobileAuthUrl', () => {
    it('lança para redirect URI inválido', async () => {
      const { service } = makeService();
      await expect(
        service.getMobileAuthUrl('google' as any, 'not-a-uri'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
