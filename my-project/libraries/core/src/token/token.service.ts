import { getLocaleText } from "@hed-hog/api-locale";
import { PrismaService } from "@hed-hog/api-prisma";
import { ForbiddenException, forwardRef, Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { SecurityService } from "../security/security.service";
import { SettingService } from "../setting/setting.service";

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => JwtService))
    private readonly jwt: JwtService,
    @Inject(forwardRef(() => SecurityService))
    private readonly security: SecurityService,
    @Inject(forwardRef(() => SettingService))
    private readonly setting: SettingService,
  ) { }

  async verify(locale: string, token: string) {
    try {

      const payload = await this.jwt.verifyAsync(token, {
        secret: this.security.getJwtSecret(),
      });

      // Verify session is not revoked (only if prisma is available)
      if (payload.sessionId && this.prisma) {
        try {
          const session = await this.prisma.user_session.findUnique({
            where: { id: payload.sessionId },
            select: { revoked_at: true, expires_at: true }
          });

          if (!session) {
            this.logger.warn(`[TokenVerify] sessionId=${payload.sessionId} userId=${payload.sub} not found in DB`);
            throw new UnauthorizedException(
              getLocaleText('sessionRevoked', locale, 'Session has been revoked.')
            );
          }

          if (session.revoked_at !== null) {
            this.logger.warn(`[TokenVerify] sessionId=${payload.sessionId} userId=${payload.sub} revoked_at=${session.revoked_at.toISOString()}`);
            throw new UnauthorizedException(
              getLocaleText('sessionRevoked', locale, 'Session has been revoked.')
            );
          }

          if (session.expires_at <= new Date()) {
            this.logger.debug(`[TokenVerify] sessionId=${payload.sessionId} userId=${payload.sub} expired_at=${session.expires_at.toISOString()}`);
            throw new UnauthorizedException(
              getLocaleText('sessionRevoked', locale, 'Session has been revoked.')
            );
          }
        } catch (sessionError) {
          // If it's an Unauthorized error from revoked session, rethrow it
          if (sessionError instanceof UnauthorizedException) {
            throw sessionError;
          }
          // DB error: log but allow auth to continue to avoid blocking on transient DB issues
          this.logger.error(`[TokenVerify] DB error validating sessionId=${payload.sessionId} userId=${payload.sub}: ${(sessionError as any)?.message}`);
        }
      }

      return payload;
    } catch (error) {
      const errName = (error as any)?.name ?? 'UnknownError';
      const errMsg = (error as any)?.message ?? '';
      // Token expirado é um evento rotineiro (cliente renova automaticamente); não polui o log.
      if (!(error instanceof UnauthorizedException) && errName !== 'TokenExpiredError') {
        this.logger.debug(`[TokenVerify] JWT error=${errName}: ${errMsg}`);
      }
      // Return 401 for JWT errors (expired, invalid, etc.)
      throw new UnauthorizedException(
        errMsg || getLocaleText('accessDenied', locale, 'Access denied.')
      );
    }
  }

  async createAccessToken(payload: Record<string, any>) {
    return this.jwt.signAsync(payload, {
      secret: this.security.getJwtSecret(),
    });
  }

  async createOpaqueToken(size = 64) {
    return this.security.randomOpaque(size);
  }

  private normalizeCookieDomain(value?: string | null) {
    const normalized = value?.trim();

    if (!normalized) {
      return undefined;
    }

    const host = normalized
      .replace(/^https?:\/\//i, '')
      .split('/')[0]
      .split(':')[0]
      .trim();

    if (!host || host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      return undefined;
    }

    return host;
  }

  private async getCookieDomain() {
    const explicitDomain = this.normalizeCookieDomain(process.env.COOKIE_DOMAIN);

    if (explicitDomain) {
      return explicitDomain;
    }

    const settings = await this.setting.getSettingValues([
      'api-url'
    ]);

    return this.normalizeCookieDomain(settings['api-url']);
  }

  async removeRefreshTokenCookie(res): Promise<void> {

    const domain = await this.getCookieDomain();
    const isLocalhost = !domain || domain === 'localhost';
    const cookieOptions: any = {
      httpOnly: true,
      sameSite: isLocalhost ? 'lax' : 'none',
    };
    if (!isLocalhost) {
      cookieOptions.secure = true;
      cookieOptions.domain = domain;
    }
    res.clearCookie('rt', cookieOptions);
  }

  async setRefreshTokenCookie(locale: string, res, token: string, expires_at: Date): Promise<void> {
    const domain = await this.getCookieDomain();
    const isLocalhost = !domain || domain === 'localhost';
    const maxAge = expires_at.getTime() - Date.now();
    const cookieOptions: any = {
      httpOnly: true,
      sameSite: isLocalhost ? 'lax' : 'none',
      maxAge,
    };
    if (!isLocalhost) {
      cookieOptions.secure = true;
      cookieOptions.domain = domain;
    }
    res.cookie('rt', token, cookieOptions);

  }

  async createMfaChallengeToken(payload: { userId: number; ipAddress: string; userAgent: string; email: string }) {
    return this.jwt.signAsync(payload, {
      secret: this.security.getJwtSecret(),
      expiresIn: '10m', 
    });
  }

  async verifyMfaChallengeToken(token: string): Promise<{ userId: number; ipAddress: string; userAgent: string; email: string }> {
    try {
      const payload = await this.jwt.verifyAsync(token, { 
        secret: this.security.getJwtSecret() 
      });
      return {
        userId: payload.userId,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
        email: payload.email
      };
    } catch (error) {
      throw new ForbiddenException('Invalid or expired MFA token');
    }
  }

  async decodeExpiredToken(token: string): Promise<any> {
    try {
      return await this.jwt.verifyAsync(token, {
        secret: this.security.getJwtSecret(),
        ignoreExpiration: true,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}