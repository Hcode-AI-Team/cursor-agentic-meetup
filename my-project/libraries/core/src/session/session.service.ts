import { getLocaleText } from '@hed-hog/api-locale';
import { PaginationDTO, PaginationService } from '@hed-hog/api-pagination';
import { PrismaService } from '@hed-hog/api-prisma';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, forwardRef, HttpException, HttpStatus, Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { SecurityService } from '../security/security.service';
import { SettingService } from '../setting/setting.service';
import { TokenService } from '../token/token.service';
import { UserService } from '../user/user.service';

type GeoIpResult = {
    ip: string;
    country?: string;
    region?: string;
    city?: string;
    lat?: number;
    lon?: number;
    isp?: string;
    raw?: any;
};

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SecurityService))
    private security: SecurityService,
    @Inject(forwardRef(() => SettingService))
    private readonly setting: SettingService,
    @Inject(forwardRef(() => TokenService))
    private readonly token: TokenService,
    @Inject(forwardRef(() => HttpService))
    private readonly http: HttpService,
    @Inject(forwardRef(() => UserService))
    private readonly user: UserService,
    @Inject(forwardRef(() => PaginationService))
    private readonly paginationService: PaginationService,
  ) { }

  async create(locale: string, userId: number, ipAddress: string, userAgent: string, browserId?: string | null) {
    if (!userId) {
      throw new BadRequestException(getLocaleText('session.userIdRequired', locale, 'User ID is required to create a session.'));
    }

    if (!ipAddress) {
      throw new BadRequestException(getLocaleText('session.ipAddressRequired', locale, 'IP address is required to create a session.'));
    }

    if (!userAgent) {
      throw new BadRequestException(getLocaleText('session.userAgentRequired', locale, 'User agent is required to create a session.'));
    }

    const settings = await this.setting.getSettingValues([
      'refresh-token-expiration-minutes',
      'max-concurrent-sessions'
    ]);
    const token = await this.token.createOpaqueToken();
    const hash = this.security.hashWithPepper(token)
    const maxSessions = Number(settings['max-concurrent-sessions']) || 0;

    if (maxSessions > 0) {
      await this.enforceSessionLimit(userId, maxSessions, false, browserId);
    }

    const session = await this.prisma.user_session.create({
      data: {
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: new Date(Date.now() + ((settings['refresh-token-expiration-minutes'] || 43200) * 60 * 1000)),
        hash,
        browser_id: browserId ?? null,
      },
    });

    return { token, session };
  }

  async refresh(locale: string, refreshToken: string, ipAddress: string, userAgent: string, browserId?: string | null) {
    if (!refreshToken) {
      throw new UnauthorizedException(getLocaleText('accessDenied', locale, 'Access denied.'));
    }

    const hash = this.security.hashWithPepper(refreshToken);

    const rawSession = await this.prisma.user_session.findFirst({
      where: { hash },
      select: { id: true, user_id: true, ip_address: true, user_agent: true, revoked_at: true, expires_at: true, browser_id: true },
    });

    if (!rawSession) {
      this.logger.warn(`[SessionRefresh] Refresh rejected: hash prefix ${hash.slice(0, 8)} not found in DB`);
      throw new UnauthorizedException(getLocaleText('accessDenied', locale, 'Access denied.'));
    }

    if (rawSession.revoked_at !== null) {
      this.logger.warn(`[SessionRefresh] Refresh rejected: sessionId=${rawSession.id} userId=${rawSession.user_id} revoked_at=${rawSession.revoked_at.toISOString()} hash prefix ${hash.slice(0, 8)}`);
      throw new UnauthorizedException(getLocaleText('accessDenied', locale, 'Access denied.'));
    }

    if (rawSession.expires_at <= new Date()) {
      this.logger.warn(`[SessionRefresh] Refresh rejected: sessionId=${rawSession.id} userId=${rawSession.user_id} expired expires_at=${rawSession.expires_at.toISOString()} hash prefix ${hash.slice(0, 8)}`);
      throw new UnauthorizedException(getLocaleText('accessDenied', locale, 'Access denied.'));
    }

    const session = {
      id: rawSession.id,
      user_id: rawSession.user_id,
      ip_address: rawSession.ip_address,
      user_agent: rawSession.user_agent,
      browser_id: rawSession.browser_id,
    };

    const settings = await this.setting.getSettingValues([
      'refresh-token-expiration-minutes',
      'max-concurrent-sessions',
    ]);

    const maxSessions = Number(settings['max-concurrent-sessions']) || 0;
    if (maxSessions > 0) {
      await this.enforceSessionLimit(session.user_id, maxSessions, true, browserId);
    }

    const nextRefreshToken = await this.token.createOpaqueToken();
    const nextHash = this.security.hashWithPepper(nextRefreshToken);
    const expiresAt = new Date(Date.now() + ((settings['refresh-token-expiration-minutes'] || 43200) * 60 * 1000));
    const nextIpAddress = ipAddress?.trim() || session.ip_address || 'unknown';
    const nextUserAgent = userAgent?.trim() || session.user_agent || 'unknown';

    this.logger.debug(`[SessionRefresh] Starting rotation userId=${session.user_id} oldSessionId=${session.id} ip=${nextIpAddress}`);
    const txStart = Date.now();

    const { updateResult, newSession } = await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.user_session.updateMany({
        where: {
          id: session.id,
          revoked_at: null,
        },
        data: {
          revoked_at: new Date(),
        },
      });

      const newSession = await tx.user_session.create({
        data: {
          user_id: session.user_id,
          ip_address: nextIpAddress,
          user_agent: nextUserAgent,
          expires_at: expiresAt,
          hash: nextHash,
          browser_id: session.browser_id ?? browserId ?? null,
        },
      });

      return { updateResult, newSession };
    });

    if (updateResult.count === 0) {
      this.logger.warn(`[SessionRefresh] Race condition detected: userId=${session.user_id} oldSessionId=${session.id} already rotated by another request (durationMs=${Date.now() - txStart})`);
      throw new UnauthorizedException(getLocaleText('accessDenied', locale, 'Access denied.'));
    }

    this.logger.debug(`[SessionRefresh] Rotation successful userId=${session.user_id} oldSessionId=${session.id} newSessionId=${newSession.id} durationMs=${Date.now() - txStart}`);

    return {
      token: nextRefreshToken,
      session: newSession,
    };
  }

  async deleteRefreshTokenCookie(res, refreshToken: string) {
    await this.token.removeRefreshTokenCookie(res);

    if (!refreshToken) {
      return { count: 0, userId: null };
    }

    const hash = this.security.hashWithPepper(refreshToken);
    const session = await this.prisma.user_session.findFirst({
      where: {
        revoked_at: null,
        hash,
      },
      select: {
        user_id: true,
      },
    });

    const result = await this.prisma.user_session.updateMany({
      where: {
        revoked_at: null,
        hash,
      },
      data: {
        revoked_at: new Date(),
      },
    });

    return {
      count: result.count,
      userId: session?.user_id ?? null,
    };
  }

  async getUserSessions(paginationParams: PaginationDTO, userId: number, locale: string) {

    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      throw new BadRequestException(getLocaleText('session.userNotFound', locale, 'User not found.'));
    }

    try {
      const paginate = await this.paginationService.paginatePrismaModel(this.prisma.user_session, {
        ...paginationParams,
        where: { user_id: userId },
      });

      const itemsWithLocation = await Promise.all(
        paginate.data.map(async (s) => {
          const ip = s.ip_address || s.ip || null;
          let location: GeoIpResult | null = null;
          if (ip && ip !== '127.0.0.1' && ip !== '::1') {
            try {
              location = await this.fetchGeoByIp(ip);
            } catch {
              location = { ip, raw: null };
            }
          } else if (ip) {
            location = { ip: '127.0.0.1', country: 'Localhost', region: '', city: '' };
          }
          return { ...s, location };
        })
      );

      return {
        data: itemsWithLocation,
        total: paginate.total || 0,
        lastPage: Math.ceil((paginate.total || 0) / (paginate.pageSize || 1)),
        page: paginate.page ?? 1,
        pageSize: paginate.pageSize ?? paginationParams.pageSize ?? 10,
      };
    } catch (err) {
      throw new HttpException(
        getLocaleText('session.errorFetchingSessions', locale, 'Error fetching user sessions'),
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  async getUserSessionsActive(paginationParams: PaginationDTO, userId: number, locale: string) {

    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      throw new BadRequestException(getLocaleText('session.userNotFound', locale, 'User not found.'));
    }

    try {
      const paginate = await this.paginationService.paginatePrismaModel(this.prisma.user_session, {
        ...paginationParams,
        where: { user_id: userId, revoked_at: null, expires_at: { gt: new Date() } },
      });

      const itemsWithLocation = await Promise.all(
        paginate.data.map(async (s) => {
          const ip = s.ip_address || s.ip || null;
          let location: GeoIpResult | null = null;
          if (ip && ip !== '127.0.0.1' && ip !== '::1') {
            try {
              location = await this.fetchGeoByIp(ip);
            } catch {
              location = { ip, raw: null };
            }
          } else if (ip) {
            location = { ip: '127.0.0.1', country: 'Localhost', region: '', city: '' };
          }
          return { ...s, location };
        })
      );

      return {
        data: itemsWithLocation,
        total: paginate.total || 0,
        lastPage: Math.ceil((paginate.total || 0) / (paginate.pageSize || 1)),
        page: paginate.page ?? 1,
        pageSize: paginate.pageSize ?? paginationParams.pageSize ?? 10,
      };
    } catch (err) {
      throw new HttpException(
        getLocaleText('session.errorFetchingSessions', locale, 'Error fetching user sessions'),
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  private async fetchGeoByIp(ip: string): Promise<GeoIpResult> {
    const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,lat,lon,isp,message`;
    const response = await firstValueFrom(this.http.get(url));
    const data = response.data;
    if (data?.status !== 'success') {
        return { ip, raw: data };
    }
    return {
        ip,
        country: data.country,
        region: data.regionName,
        city: data.city,
        lat: data.lat,
        lon: data.lon,
        isp: data.isp,
        raw: data,
    };
  }

  private async markRevokedByFilter(userId: number, filter: Record<string, any>, activity: string) {
    await this.user.registerUserActivity(userId, activity);
    return this.prisma.user_session.updateMany({
      where: { user_id: userId, ...filter },
      data: { revoked_at: new Date() },
    });
  }

  async revokeAllOtherSessions(userId: number, sessionId: number) {
    const latestSession = await this.prisma.user_session.findUnique({
      where: { 
        id: sessionId
      },
      select: { id: true },
    });

    if (!latestSession) { return { count: 0 } }
    return this.markRevokedByFilter(userId, { 
      NOT: { id: latestSession.id },
      revoked_at: null
    }, 'revokeAllOtherSessions');
  }

  async revokeAllSessions(userId: number) {
    return this.markRevokedByFilter(userId, { revoked_at: null }, 'revokeAllSessions');
  }

  async revokeUserSession(userId: number, sessionId: number, locale: string){
    const session = await this.prisma.user_session.findFirst({
      where: {
        id: sessionId,
        user_id: userId
      }
    });

    if (!session) {
      throw new NotFoundException(
        getLocaleText('session.notFound', locale, 'Session not found or does not belong to user')
      );
    }

    await this.user.registerUserActivity(userId, "revokeSession");
    
    return this.prisma.user_session.update({
      where: {
        id: sessionId
      }, 
      data: {
        revoked_at: new Date()
      }
    })
  }

  /**
   * Enforce maximum concurrent sessions limit for a user.
   * Sessions from the same browser (same browser_id) count as a single slot.
   * Sessions without a browser_id each count as their own slot (legacy/unknown clients).
   *
   * @param userId - The user ID to check
   * @param maxSessions - Maximum number of concurrent browser slots allowed
   * @param isRotation - When true, the calling flow is replacing an existing session (refresh),
   *   not adding a new one, so no extra slot needs to be freed.
   * @param currentBrowserId - The browser_id of the session being created/refreshed.
   */
  private async enforceSessionLimit(userId: number, maxSessions: number, isRotation = false, currentBrowserId?: string | null): Promise<void> {
    const activeSessions = await this.prisma.user_session.findMany({
      where: {
        user_id: userId,
        revoked_at: null,
        expires_at: { gt: new Date() }
      },
      orderBy: { created_at: 'asc' },
      select: { id: true, browser_id: true }
    });

    // Group sessions into browser slots. Sessions sharing a browser_id = 1 slot.
    // Sessions with null browser_id each count as their own slot (legacy clients).
    // Map insertion order is preserved, and since activeSessions is ordered created_at asc,
    // the oldest slot is always first.
    type Slot = { ids: number[] };
    const slotMap = new Map<string, Slot>();
    for (const s of activeSessions) {
      const key = s.browser_id ?? `__null_${s.id}`;
      if (!slotMap.has(key)) slotMap.set(key, { ids: [] });
      slotMap.get(key)!.ids.push(s.id);
    }

    const slots = Array.from(slotMap.values());
    const currentSlotCount = slots.length;

    // A new browser slot is created only when:
    // - it's not a rotation (rotation keeps the same slot), AND
    // - the current browser doesn't already have an active slot
    const currentBrowserHasSlot = Boolean(currentBrowserId && slotMap.has(currentBrowserId));
    const isNewSlot = !isRotation && !currentBrowserHasSlot;

    const slotsToRevoke = currentSlotCount - maxSessions + (isNewSlot ? 1 : 0);
    this.logger.debug(`[SessionLimit] userId=${userId} slots=${currentSlotCount} maxSessions=${maxSessions} isRotation=${isRotation} browserId=${currentBrowserId ?? 'null'} newSlot=${isNewSlot} toRevoke=${Math.max(0, slotsToRevoke)}`);

    if (slotsToRevoke > 0) {
      const sessionIdsToRevoke: number[] = [];
      for (let i = 0; i < slotsToRevoke; i++) {
        sessionIdsToRevoke.push(...slots[i].ids);
      }
      this.logger.warn(`[SessionLimit] Revoking ${slotsToRevoke} oldest browser slot(s) for userId=${userId}: sessions [${sessionIdsToRevoke.join(',')}]`);
      await this.prisma.user_session.updateMany({
        where: { id: { in: sessionIdsToRevoke } },
        data: { revoked_at: new Date() }
      });
    }
  }

}