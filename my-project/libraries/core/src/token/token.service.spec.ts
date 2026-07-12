import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from './token.service';

const makeDeps = () => {
  const jwt = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };
  const security = {
    getJwtSecret: jest.fn().mockReturnValue('secret'),
    randomOpaque: jest.fn().mockReturnValue('opaque-token'),
  };
  const setting = {
    getSettingValues: jest.fn().mockResolvedValue({}),
  };
  const prisma = {
    user_session: { findUnique: jest.fn() },
  };
  return { jwt, security, setting, prisma };
};

const makeService = (deps = makeDeps()) => ({
  service: new TokenService(
    deps.prisma as any,
    deps.jwt as any,
    deps.security as any,
    deps.setting as any,
  ),
  deps,
});

describe('TokenService', () => {
  const originalCookieDomain = process.env.COOKIE_DOMAIN;

  afterEach(() => {
    jest.clearAllMocks();
    if (originalCookieDomain === undefined) {
      delete process.env.COOKIE_DOMAIN;
    } else {
      process.env.COOKIE_DOMAIN = originalCookieDomain;
    }
  });

  describe('normalizeCookieDomain', () => {
    let service: TokenService;
    beforeEach(() => {
      service = makeService().service;
    });
    const call = (v?: string | null) =>
      (service as any).normalizeCookieDomain(v);

    it('retorna undefined para vazio/null/branco', () => {
      expect(call(undefined)).toBeUndefined();
      expect(call(null)).toBeUndefined();
      expect(call('   ')).toBeUndefined();
    });

    it('remove protocolo, path e porta', () => {
      expect(call('https://app.example.com:3200/login')).toBe(
        'app.example.com',
      );
      expect(call('http://app.example.com')).toBe('app.example.com');
    });

    it('retorna undefined para localhost', () => {
      expect(call('http://localhost:3200')).toBeUndefined();
      expect(call('localhost')).toBeUndefined();
    });

    it('retorna undefined para IPv4', () => {
      expect(call('http://127.0.0.1:3000')).toBeUndefined();
      expect(call('192.168.0.10')).toBeUndefined();
    });

    it('retorna host válido para domínio real', () => {
      expect(call('example.com')).toBe('example.com');
    });
  });

  describe('getCookieDomain', () => {
    it('prioriza COOKIE_DOMAIN do env', async () => {
      process.env.COOKIE_DOMAIN = 'https://env.example.com/';
      const { service, deps } = makeService();
      await expect((service as any).getCookieDomain()).resolves.toBe(
        'env.example.com',
      );
      expect(deps.setting.getSettingValues).not.toHaveBeenCalled();
    });

    it('cai para setting api-url quando env ausente/inválido', async () => {
      delete process.env.COOKIE_DOMAIN;
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue({
        'api-url': 'https://api.example.com',
      });
      await expect((service as any).getCookieDomain()).resolves.toBe(
        'api.example.com',
      );
      expect(deps.setting.getSettingValues).toHaveBeenCalledWith(['api-url']);
    });

    it('retorna undefined quando env é localhost e setting vazio', async () => {
      process.env.COOKIE_DOMAIN = 'localhost';
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue({ 'api-url': '' });
      await expect((service as any).getCookieDomain()).resolves.toBeUndefined();
    });
  });

  describe('setRefreshTokenCookie', () => {
    it('usa sameSite lax sem secure/domain em localhost', async () => {
      delete process.env.COOKIE_DOMAIN;
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue({});
      const res = { cookie: jest.fn() };
      const expires = new Date(Date.now() + 60000);

      await service.setRefreshTokenCookie('en', res, 'tok', expires);

      const [name, token, opts] = res.cookie.mock.calls[0];
      expect(name).toBe('rt');
      expect(token).toBe('tok');
      expect(opts.sameSite).toBe('lax');
      expect(opts.secure).toBeUndefined();
      expect(opts.domain).toBeUndefined();
      expect(opts.httpOnly).toBe(true);
      expect(opts.maxAge).toBeGreaterThan(0);
    });

    it('usa sameSite none + secure + domain quando há domínio', async () => {
      process.env.COOKIE_DOMAIN = 'app.example.com';
      const { service } = makeService();
      const res = { cookie: jest.fn() };
      const expires = new Date(Date.now() + 60000);

      await service.setRefreshTokenCookie('en', res, 'tok', expires);

      const opts = res.cookie.mock.calls[0][2];
      expect(opts.sameSite).toBe('none');
      expect(opts.secure).toBe(true);
      expect(opts.domain).toBe('app.example.com');
    });
  });

  describe('removeRefreshTokenCookie', () => {
    it('limpa cookie com opções de localhost', async () => {
      delete process.env.COOKIE_DOMAIN;
      const { service, deps } = makeService();
      deps.setting.getSettingValues.mockResolvedValue({});
      const res = { clearCookie: jest.fn() };

      await service.removeRefreshTokenCookie(res);

      const [name, opts] = res.clearCookie.mock.calls[0];
      expect(name).toBe('rt');
      expect(opts.sameSite).toBe('lax');
      expect(opts.secure).toBeUndefined();
    });

    it('limpa cookie com domain em produção', async () => {
      process.env.COOKIE_DOMAIN = 'app.example.com';
      const { service } = makeService();
      const res = { clearCookie: jest.fn() };

      await service.removeRefreshTokenCookie(res);

      const opts = res.clearCookie.mock.calls[0][1];
      expect(opts.secure).toBe(true);
      expect(opts.domain).toBe('app.example.com');
    });
  });

  describe('verify', () => {
    it('retorna payload sem sessionId', async () => {
      const { service, deps } = makeService();
      deps.jwt.verifyAsync.mockResolvedValue({ sub: 1 });
      await expect(service.verify('en', 'tok')).resolves.toEqual({ sub: 1 });
      expect(deps.prisma.user_session.findUnique).not.toHaveBeenCalled();
    });

    it('retorna payload quando sessão ativa', async () => {
      const { service, deps } = makeService();
      deps.jwt.verifyAsync.mockResolvedValue({ sub: 1, sessionId: 9 });
      deps.prisma.user_session.findUnique.mockResolvedValue({
        revoked_at: null,
        expires_at: new Date(Date.now() + 100000),
      });
      await expect(service.verify('en', 'tok')).resolves.toMatchObject({
        sessionId: 9,
      });
    });

    it('lança UnauthorizedException quando sessão não existe', async () => {
      const { service, deps } = makeService();
      deps.jwt.verifyAsync.mockResolvedValue({ sub: 1, sessionId: 9 });
      deps.prisma.user_session.findUnique.mockResolvedValue(null);
      await expect(service.verify('en', 'tok')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lança UnauthorizedException quando sessão revogada', async () => {
      const { service, deps } = makeService();
      deps.jwt.verifyAsync.mockResolvedValue({ sub: 1, sessionId: 9 });
      deps.prisma.user_session.findUnique.mockResolvedValue({
        revoked_at: new Date(),
        expires_at: new Date(Date.now() + 100000),
      });
      await expect(service.verify('en', 'tok')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lança UnauthorizedException quando sessão expirada', async () => {
      const { service, deps } = makeService();
      deps.jwt.verifyAsync.mockResolvedValue({ sub: 1, sessionId: 9 });
      deps.prisma.user_session.findUnique.mockResolvedValue({
        revoked_at: null,
        expires_at: new Date(Date.now() - 1000),
      });
      await expect(service.verify('en', 'tok')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('engole erro transitório de DB e retorna payload', async () => {
      const { service, deps } = makeService();
      deps.jwt.verifyAsync.mockResolvedValue({ sub: 1, sessionId: 9 });
      deps.prisma.user_session.findUnique.mockRejectedValue(
        new Error('connection reset'),
      );
      await expect(service.verify('en', 'tok')).resolves.toMatchObject({
        sub: 1,
      });
    });

    it('converte erro de JWT em UnauthorizedException', async () => {
      const { service, deps } = makeService();
      const jwtError: any = new Error('jwt malformed');
      jwtError.name = 'JsonWebTokenError';
      deps.jwt.verifyAsync.mockRejectedValue(jwtError);
      await expect(service.verify('en', 'tok')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('trata TokenExpiredError como 401', async () => {
      const { service, deps } = makeService();
      const jwtError: any = new Error('jwt expired');
      jwtError.name = 'TokenExpiredError';
      deps.jwt.verifyAsync.mockRejectedValue(jwtError);
      await expect(service.verify('en', 'tok')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('token helpers', () => {
    it('createAccessToken assina com o segredo', async () => {
      const { service, deps } = makeService();
      deps.jwt.signAsync.mockResolvedValue('signed');
      await expect(service.createAccessToken({ sub: 1 })).resolves.toBe(
        'signed',
      );
      expect(deps.jwt.signAsync).toHaveBeenCalledWith(
        { sub: 1 },
        { secret: 'secret' },
      );
    });

    it('createOpaqueToken delega ao security', async () => {
      const { service, deps } = makeService();
      await expect(service.createOpaqueToken(32)).resolves.toBe('opaque-token');
      expect(deps.security.randomOpaque).toHaveBeenCalledWith(32);
    });

    it('createMfaChallengeToken assina com expiração de 10m', async () => {
      const { service, deps } = makeService();
      deps.jwt.signAsync.mockResolvedValue('mfa-tok');
      const payload = {
        userId: 1,
        ipAddress: '1.2.3.4',
        userAgent: 'ua',
        email: 'a@b.com',
      };
      await expect(service.createMfaChallengeToken(payload)).resolves.toBe(
        'mfa-tok',
      );
      expect(deps.jwt.signAsync).toHaveBeenCalledWith(
        payload,
        expect.objectContaining({ secret: 'secret', expiresIn: '10m' }),
      );
    });

    it('verifyMfaChallengeToken retorna campos do payload', async () => {
      const { service, deps } = makeService();
      deps.jwt.verifyAsync.mockResolvedValue({
        userId: 5,
        ipAddress: '9.9.9.9',
        userAgent: 'ua',
        email: 'x@y.com',
        extra: 'ignored',
      });
      await expect(service.verifyMfaChallengeToken('tok')).resolves.toEqual({
        userId: 5,
        ipAddress: '9.9.9.9',
        userAgent: 'ua',
        email: 'x@y.com',
      });
    });

    it('verifyMfaChallengeToken lança ForbiddenException em token inválido', async () => {
      const { service, deps } = makeService();
      deps.jwt.verifyAsync.mockRejectedValue(new Error('bad'));
      await expect(service.verifyMfaChallengeToken('tok')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('decodeExpiredToken ignora expiração', async () => {
      const { service, deps } = makeService();
      deps.jwt.verifyAsync.mockResolvedValue({ sub: 7 });
      await expect(service.decodeExpiredToken('tok')).resolves.toEqual({
        sub: 7,
      });
      expect(deps.jwt.verifyAsync).toHaveBeenCalledWith(
        'tok',
        expect.objectContaining({ ignoreExpiration: true }),
      );
    });

    it('decodeExpiredToken lança UnauthorizedException em token inválido', async () => {
      const { service, deps } = makeService();
      deps.jwt.verifyAsync.mockRejectedValue(new Error('bad'));
      await expect(service.decodeExpiredToken('tok')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
