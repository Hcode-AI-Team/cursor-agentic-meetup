import { getLocaleText } from '@hed-hog/api-locale';
import { Prisma, PrismaService, user_account_provider_52222e2ecb_enum } from '@hed-hog/api-prisma';
import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
    ServiceUnavailableException,
    forwardRef
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { FileService } from '../file/file.service';
import { MailService } from '../mail/mail.service';
import { SecurityService } from '../security/security.service';
import { SettingService } from '../setting/setting.service';
import { TokenService } from '../token/token.service';
import { USER_AVATAR_UPLOAD_DESTINATION } from '../user/constants/user.constants';
import { UserService } from '../user/user.service';
import { OAuthProvider } from './interfaces/OAuthProvider';
import { OAuthCallbackCoordinatorService } from './oauth-callback-coordinator.service';
import {
    OAuthCallbackAlreadyProcessedError,
    OAuthCallbackInProgressError,
    OAuthProviderException,
} from './oauth.errors';
import { AppleProvider } from './providers/apple.provider';
import { FacebookProvider } from './providers/facebook.provider';
import { GithubProvider } from './providers/github.provider';
import { GoogleProvider } from './providers/google.provider';
import { LinkedinProvider } from './providers/linkedin.provider';
import { MicrosoftEntraIdProvider } from './providers/microsoft-entra-id.provider';
import { MicrosoftProvider } from './providers/microsoft.provider';

type HandleCallbackProps = {
  locale: string;
  ipAddress: string; 
  userAgent: string;
  res: Response;
  provider: user_account_provider_52222e2ecb_enum;
  code?: string;
  type: 'login' | 'register' | 'connect' | 'disconnect';
  userId?: number;
  email?: string;
  redirectUri?: string;
  state?: string;
  includeRefreshTokenInBody?: boolean;
  /** Origin header of the request that hit the callback (used to bind web hub flows). */
  requestOrigin?: string;
  /** Referer header, used as a fallback when the Origin header is absent. */
  requestReferer?: string;
};

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  private providers: Map<string, OAuthProvider> = new Map();
  private readonly mobileOAuthStateTtlMs = 10 * 60 * 1000;
  /** Sentinel app in the web state meaning "the OAuth hub handles this locally". */
  private static readonly WEB_STATE_SELF_APP = 'self';

  constructor(
    google: GoogleProvider,
    facebook: FacebookProvider,
    microsoft: MicrosoftProvider,
    github: GithubProvider,
    microsoftEntraId: MicrosoftEntraIdProvider,
    apple: AppleProvider,
    linkedin: LinkedinProvider,
    private readonly callbackCoordinator: OAuthCallbackCoordinatorService,
    @Inject(forwardRef(() => AuthService))
    private readonly auth: AuthService,
    private readonly file: FileService,
    private readonly mail: MailService,
    private readonly security: SecurityService,
    private readonly prisma: PrismaService,
    private readonly token: TokenService,
    private readonly setting: SettingService,
    @Inject(forwardRef(() => UserService))
    private readonly user: UserService,
  ) {
    this.providers.set(google.getProviderType(), google);
    this.providers.set(facebook.getProviderType(), facebook);
    this.providers.set(microsoft.getProviderType(), microsoft);
    this.providers.set(github.getProviderType(), github);
    this.providers.set(microsoftEntraId.getProviderType(), microsoftEntraId);
    this.providers.set(apple.getProviderType(), apple);
    this.providers.set(linkedin.getProviderType(), linkedin);
  }

  async getAuthUrl(provider: user_account_provider_52222e2ecb_enum, callbackPath: string) {
    const enabled = await this.isProviderEnabled(provider);
    if (!enabled) {
      throw new BadRequestException(`OAuth provider ${provider} is not enabled.`);
    }
    return this.getProvider(provider).getAuthUrl(callbackPath);
  }

  async getMobileAuthUrl(
    provider: user_account_provider_52222e2ecb_enum,
    redirectUri: string,
  ) {
    const sanitizedRedirectUri = String(redirectUri || '').trim();
    if (!/^[a-z][a-z\d+.-]*:/i.test(sanitizedRedirectUri)) {
      throw new BadRequestException('Invalid mobile redirect URI.');
    }

    // Flow-less callback to match the single registered redirect URI and the
    // flow-less token exchange in each provider's getProfile.
    const callbackPath = `/callback/${String(provider)}`;
    const authUrl = await this.getAuthUrl(provider, callbackPath);
    const flow = 'login';
    const { token, signature } = await this.issueMobileState(
      provider,
      sanitizedRedirectUri,
      flow,
    );
    const url = new URL(authUrl);
    url.searchParams.set('state', `hhmob.${token}.${signature}.${flow}`);

    return url.toString();
  }

  /**
   * Builds a provider auth URL for a browser (web) flow that may be initiated by an
   * app other than the OAuth hub (the app configured in the `url` setting).
   *
   * When `redirectApp` resolves to a known origin (via the `app-urls` setting), a
   * signed `state` (`hhweb.<app>.<flow>.<sig>`) is attached so the hub can forward
   * the callback back to the initiating app and the backend can bind the code
   * exchange to that origin. Without a resolvable `redirectApp`, the URL is returned
   * unchanged — identical to the legacy hub-only behavior.
   */
  async getWebAuthUrl(
    provider: user_account_provider_52222e2ecb_enum,
    flow: 'login' | 'register' | 'connect',
    redirectApp?: string,
  ) {
    // Single, flow-less callback per provider: the flow (and the initiating app)
    // travel in the signed state, so only ONE redirect URI needs to be registered
    // per provider in its OAuth console.
    const callbackPath = `/callback/${String(provider)}`;
    const authUrl = await this.getAuthUrl(provider, callbackPath);

    // Always carry the flow. `self` means "the hub handles it locally"; a resolvable
    // app key means the hub forwards the callback back to that app (origin-bound).
    const app = this.sanitizeAppKey(redirectApp) ?? OAuthService.WEB_STATE_SELF_APP;

    const url = new URL(authUrl);
    url.searchParams.set('state', this.buildWebState(app, flow));
    return url.toString();
  }

  /**
   * Resolves how the GitHub backend bounce should forward the browser. GitHub only
   * supports a single registered callback URL (the API), so the provider always
   * lands on the backend; this maps the signed web state to the initiating app's
   * origin. Returns null for legacy hub-only flows (state carries just the flow).
   */
  async resolveWebForward(
    state?: string,
  ): Promise<{ origin: string | null; flow: 'login' | 'register' | 'connect' } | null> {
    const web = this.parseWebState(state);
    if (!web) {
      return null;
    }
    return { origin: await this.resolveAppOrigin(web.app), flow: web.flow };
  }

  private sanitizeAppKey(app?: string): string | null {
    const value = String(app ?? '').trim().toLowerCase();
    return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(value) ? value : null;
  }

  private buildWebState(app: string, flow: 'login' | 'register' | 'connect') {
    const signature = this.security.signHmacSha256(`oauth-web-state:${app}:${flow}`);
    return `hhweb.${app}.${flow}.${signature}`;
  }

  /** Parses and verifies a signed web-hub state. Returns null when invalid. */
  private parseWebState(
    state?: string,
  ): { app: string; flow: 'login' | 'register' | 'connect' } | null {
    if (!state || !state.startsWith('hhweb.')) {
      return null;
    }

    const parts = state.split('.');
    if (parts.length !== 4) {
      return null;
    }

    const [, app, flow, signature] = parts;
    if (!app || !flow || !signature) {
      return null;
    }

    if (flow !== 'login' && flow !== 'register' && flow !== 'connect') {
      return null;
    }

    if (!this.security.verifyHmacSha256(`oauth-web-state:${app}:${flow}`, signature)) {
      return null;
    }

    return { app, flow };
  }

  /** Resolves an app key to its configured base origin via the `app-urls` setting. */
  private async resolveAppOrigin(app: string): Promise<string | null> {
    const settings = await this.setting.getSettingValues(['app-urls']);
    const appUrls: string[] = Array.isArray(settings['app-urls']) ? settings['app-urls'] : [];
    const entry = appUrls.find((item) => item.split('=')[0]?.trim() === app);
    if (!entry) {
      return null;
    }
    const value = entry.slice(entry.indexOf('=') + 1).trim();
    return value || null;
  }

  private normalizeOrigin(value?: string): string | null {
    if (!value) {
      return null;
    }
    try {
      return new URL(value).origin.toLowerCase();
    } catch {
      return null;
    }
  }

  async handleCallback({
    res,
    locale,
    ipAddress,
    userAgent,
    provider,
    code,
    type,
    userId,
    email,
    redirectUri,
    state,
    includeRefreshTokenInBody,
    requestOrigin,
    requestReferer,
  }: HandleCallbackProps) {
    try {
      this.logger.log(
        `OAuth callback received: provider=${provider} type=${type} locale=${locale} ip=${ipAddress || 'n/a'} hasCode=${code ? 'yes' : 'no'} codeLength=${code?.length ?? 0} userAgent="${this.summarizeUserAgent(userAgent)}"`,
      );

      if (type === 'disconnect') {
        return this.handleDisconnect(res, locale, ipAddress, userAgent, provider, email);
      }

      if (!code) {
        throw new BadRequestException(
          getLocaleText(
            'oauth.callback.codeRequired',
            locale,
            'Authorization code is required to complete OAuth authentication.',
          ),
        );
      }

      // Web hub flow: an app other than the OAuth hub started the flow and the hub
      // forwarded the code here. Bind the code exchange to the initiating app's
      // origin so a leaked/forwarded code cannot be redeemed from another origin.
      const webState = this.parseWebState(state);
      if (webState && (type === 'login' || type === 'register')) {
        const expectedOrigin = this.normalizeOrigin(
          await this.resolveAppOrigin(webState.app),
        );
        // Only bind cross-app forwards (the app resolves to a configured origin).
        // The hub's own flow (app "self") resolves to nothing and runs locally.
        if (expectedOrigin) {
          const boundOrigin =
            this.normalizeOrigin(requestOrigin) ??
            this.normalizeOrigin(requestReferer);

          if (!boundOrigin || expectedOrigin !== boundOrigin) {
            throw new BadRequestException(
              getLocaleText(
                'oauth.callback.invalidState',
                locale,
                'OAuth callback origin is invalid. Start the sign-in flow again.',
              ),
            );
          }
        }
      }

      if (
        redirectUri &&
        !(await this.consumeMobileState(state, provider, redirectUri))
      ) {
        throw new BadRequestException(
          getLocaleText(
            'oauth.callback.invalidState',
            locale,
            'OAuth callback state is invalid or expired. Start the sign-in flow again.',
          ),
        );
      }

      // Mobile browser flow: Microsoft redirected to backend callback with hhmob state.
      // Complete auth here and redirect the browser to the mobile app URI with tokens.
      if (state?.startsWith('hhmob.') && !redirectUri) {
        const mobileRedirectUri = await this.lookupMobileRedirectUri(state, provider);
        if (!mobileRedirectUri) {
          throw new BadRequestException(
            getLocaleText(
              'oauth.callback.invalidState',
              locale,
              'OAuth callback state is invalid or expired. Start the sign-in flow again.',
            ),
          );
        }

        const callbackKey = this.buildCallbackKey(provider, type, code);
        const tokens = (await this.callbackCoordinator.execute(callbackKey, async () => {
          const profile = await this.getProvider(provider).getProfile(code, type);
          return this.finalizeCallback({
            res,
            locale,
            ipAddress,
            userAgent,
            provider,
            type,
            profile,
            userId,
            includeRefreshTokenInBody: true,
          });
        })) as { accessToken: string; refreshToken?: string };

        const params = new URLSearchParams({ accessToken: tokens.accessToken });
        if (tokens.refreshToken) params.set('refreshToken', tokens.refreshToken);

        this.logger.log(
          `OAuth mobile browser callback completed: provider=${provider} type=${type}`,
        );
        (res as any).redirect(`${mobileRedirectUri}?${params.toString()}`);
        return;
      }

      const callbackKey = this.buildCallbackKey(provider, type, code);

      return await this.callbackCoordinator.execute(callbackKey, async () => {
        const profile = await this.getProvider(provider).getProfile(code, type, redirectUri);
        const result = await this.finalizeCallback({
          res,
          locale,
          ipAddress,
          userAgent,
          provider,
          type,
          profile,
          userId,
          includeRefreshTokenInBody,
        });

        this.logger.log(
          `OAuth callback completed: provider=${provider} type=${type} profileEmailPresent=${profile?.email ? 'yes' : 'no'} userId=${userId ?? 'n/a'}`,
        );

        return result;
      });
    } catch (error) {
      this.logger.warn(
        `OAuth callback failed before response mapping: provider=${provider} type=${type} message=${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw this.mapCallbackError(locale, provider, type, error);
    }
  }

  private getProvider(provider: user_account_provider_52222e2ecb_enum) {
    const prov = this.providers.get(String(provider).toUpperCase());
    if (!prov)
      throw new BadRequestException(`Provider ${provider} não suportado`);
    return prov;
  }

  private static readonly PROVIDER_SCOPE_SLUGS: Record<string, string> = {
    google: 'oauth-google-scopes',
    facebook: 'oauth-facebook-scopes',
    github: 'oauth-github-scopes',
    microsoft: 'oauth-microsoft-scopes',
    'microsoft-entra-id': 'oauth-microsoft-entra-id-scopes',
    microsoft_entra_id: 'oauth-microsoft-entra-id-scopes',
    apple: 'oauth-apple-scopes',
    linkedin: 'oauth-linkedin-scopes',
  };

  private static readonly PROVIDER_ENABLED_SLUGS: Record<string, string> = {
    google: 'oauth-google-enabled',
    facebook: 'oauth-facebook-enabled',
    github: 'oauth-github-enabled',
    microsoft: 'oauth-microsoft-enabled',
    'microsoft-entra-id': 'oauth-microsoft-entra-id-enabled',
    microsoft_entra_id: 'oauth-microsoft-entra-id-enabled',
    apple: 'oauth-apple-enabled',
    linkedin: 'oauth-linkedin-enabled',
  };

  async isProviderEnabled(provider: user_account_provider_52222e2ecb_enum): Promise<boolean> {
    const slug = OAuthService.PROVIDER_ENABLED_SLUGS[String(provider).toLowerCase()];
    if (!slug) return false;
    const settings = await this.setting.getSettingValues([slug]);
    return settings[slug] === true || settings[slug] === 'true';
  }

  private async getProviderScopes(provider: user_account_provider_52222e2ecb_enum) {
    const settingKey = OAuthService.PROVIDER_SCOPE_SLUGS[String(provider).toLowerCase()];
    if (!settingKey) return '';
    const settings = await this.setting.getSettingValues([settingKey]);
    const scopes = settings[settingKey];
    return Array.isArray(scopes) ? scopes.join(',') : String(scopes ?? '');
  }

  private buildCallbackKey(
    provider: user_account_provider_52222e2ecb_enum,
    type: HandleCallbackProps['type'],
    code: string,
  ) {
    return `${String(provider).toLowerCase()}:${type}:${this.security.hashSha256(code)}`;
  }

  private summarizeUserAgent(userAgent?: string) {
    if (!userAgent) {
      return 'n/a';
    }

    return userAgent.length > 120
      ? `${userAgent.slice(0, 117)}...`
      : userAgent;
  }

  private async issueMobileState(
    provider: user_account_provider_52222e2ecb_enum,
    redirectUri: string,
    flow: 'login' | 'register' | 'connect',
  ) {
    const token = this.security.randomOpaque(24);
    const signature = this.security.signHmacSha256(`oauth-mobile-state:${token}`);
    const tokenHash = this.security.hashSha256(token);
    const expiresAt = new Date(Date.now() + this.mobileOAuthStateTtlMs);

    await this.prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO oauth_mobile_state_token (
          token_hash,
          provider,
          redirect_uri,
          flow_type,
          expires_at,
          created_at
        ) VALUES (
          ${tokenHash},
          ${String(provider).toLowerCase()},
          ${redirectUri},
          ${flow},
          ${expiresAt},
          NOW()
        )
      `,
    );

    return { token, signature };
  }

  private async consumeMobileState(
    encodedState: string | undefined,
    provider: user_account_provider_52222e2ecb_enum,
    redirectUri: string,
  ) {
    if (!encodedState || !encodedState.startsWith('hhmob.')) {
      return false;
    }

    const parts = encodedState.split('.');
    const stateToken = parts[1];
    const signature = parts[2];
    const flow = parts[3] as 'login' | 'register' | 'connect' | undefined;

    if (!stateToken || !signature || !flow) {
      return false;
    }

    if (!['login', 'register', 'connect'].includes(flow)) {
      return false;
    }

    const hasValidSignature = this.security.verifyHmacSha256(
      `oauth-mobile-state:${stateToken}`,
      signature,
    );
    if (!hasValidSignature) {
      return false;
    }

    const tokenHash = this.security.hashSha256(stateToken);
    const consumedRows = await this.prisma.$executeRaw(
      Prisma.sql`
        UPDATE oauth_mobile_state_token
        SET consumed_at = NOW()
        WHERE token_hash = ${tokenHash}
          AND provider = ${String(provider).toLowerCase()}
          AND redirect_uri = ${redirectUri}
          AND flow_type = ${flow}
          AND expires_at > NOW()
          AND consumed_at IS NULL
      `,
    );

    return Number(consumedRows) > 0;
  }

  private async lookupMobileRedirectUri(
    encodedState: string,
    provider: user_account_provider_52222e2ecb_enum,
  ): Promise<string | null> {
    if (!encodedState?.startsWith('hhmob.')) return null;

    const parts = encodedState.split('.');
    const stateToken = parts[1];
    const signature = parts[2];

    if (!stateToken || !signature) return null;

    const hasValidSignature = this.security.verifyHmacSha256(
      `oauth-mobile-state:${stateToken}`,
      signature,
    );
    if (!hasValidSignature) return null;

    const tokenHash = this.security.hashSha256(stateToken);
    const record = await this.prisma.oauth_mobile_state_token.findFirst({
      where: {
        token_hash: tokenHash,
        provider: String(provider).toLowerCase(),
        expires_at: { gt: new Date() },
        consumed_at: null,
      },
      select: { redirect_uri: true },
    });

    return record?.redirect_uri ?? null;
  }

  private async finalizeCallback({
    res,
    locale,
    ipAddress,
    userAgent,
    provider,
    type,
    profile,
    userId,
    includeRefreshTokenInBody,
  }: Omit<HandleCallbackProps, 'code' | 'email' | 'redirectUri' | 'state'> & { profile: any }) {
    switch (type) {
      case 'login':
        return this.handleLogin(res, locale, ipAddress, userAgent, provider, profile, includeRefreshTokenInBody);
      case 'register':
        return this.handleRegister(res, locale, ipAddress, userAgent, provider, profile, includeRefreshTokenInBody);
      case 'connect':
        return this.handleConnect(res, locale, ipAddress, userAgent, provider, profile, userId, includeRefreshTokenInBody);
      default:
        throw new BadRequestException(
          getLocaleText('oauth.callback.invalidType', locale, 'Unsupported OAuth callback type.'),
        );
    }
  }

  private formatAuthResponse(
    accessToken: string,
    refreshToken: string,
    includeRefreshTokenInBody?: boolean,
  ) {
    if (includeRefreshTokenInBody) {
      return { accessToken, refreshToken };
    }

    return { accessToken };
  }

  private resolveProfileScopes(provider: user_account_provider_52222e2ecb_enum, profile: any) {
    if (typeof profile?.oauth_scopes === 'string') {
      return profile.oauth_scopes;
    }

    return this.getProviderScopes(provider);
  }

  private mapCallbackError(
    locale: string,
    provider: user_account_provider_52222e2ecb_enum,
    type: HandleCallbackProps['type'],
    error: unknown,
  ) {
    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException ||
      error instanceof NotFoundException ||
      error instanceof ServiceUnavailableException
    ) {
      return error;
    }

    if (error instanceof OAuthCallbackAlreadyProcessedError) {
      return new BadRequestException(
        getLocaleText(
          'oauth.callback.alreadyProcessed',
          locale,
          'This OAuth callback has already been processed. Start the sign-in flow again.',
        ),
      );
    }

    if (error instanceof OAuthCallbackInProgressError) {
      return new ConflictException(
        getLocaleText(
          'oauth.callback.inProgress',
          locale,
          'This OAuth callback is already being processed. Wait a moment and try again.',
        ),
      );
    }

    if (error instanceof OAuthProviderException) {
      if (error.reason === 'callback_consumed' || error.reason === 'invalid_callback') {
        return new BadRequestException(getLocaleText('oauth.callback.invalid', locale, error.message));
      }

      this.logger.warn(
        `OAuth callback upstream failure: provider=${provider} type=${type} status=${error.status ?? 'unknown'} reason=${error.reason} providerError=${error.providerError ?? 'unknown'} providerCode=${error.providerErrorCode ?? 'n/a'}`,
      );

      return new ServiceUnavailableException(
        getLocaleText(
          'oauth.callback.unavailable',
          locale,
          'Unable to complete OAuth authentication right now. Please try again.',
        ),
      );
    }

    this.logger.error(
      `Unexpected OAuth callback failure: provider=${provider} type=${type} error=${error instanceof Error ? error.message : 'unknown'}`,
    );

    return new ServiceUnavailableException(
      getLocaleText(
        'oauth.callback.unavailable',
        locale,
        'Unable to complete OAuth authentication right now. Please try again.',
      ),
    );
  }

  private async handleLogin(res: Response, locale: string, ipAddress: string, userAgent: string, provider: user_account_provider_52222e2ecb_enum, profile: any, includeRefreshTokenInBody?: boolean) {
    const userAccount = await this.prisma.user_account.findFirst({
      where: {
        provider: String(provider).toLowerCase().replace(/-/g, '_') as user_account_provider_52222e2ecb_enum,
        email: profile.email,
      },
      include: {
        user: true,
      },
    });

    if (!userAccount) {
      const userIdentifier = await this.prisma.user_identifier.findFirst({
        where: {
          type: 'email',
          value: profile.email,
          enabled: true
        },
        include: { user: true },
      });

      if (userIdentifier) {
        return this.handleConnect(res, locale, ipAddress, userAgent, provider, profile, userIdentifier.user_id);
      } else {
        return this.handleRegister(res, locale, ipAddress, userAgent, provider, profile);
      }
    } else {
      if (profile.oauth_tokens?.refresh_token) {
        const encryptedRefreshToken = this.security.encrypt(profile.oauth_tokens.refresh_token);
        const scopes = await this.resolveProfileScopes(provider, profile);
        await this.prisma.user_account.update({
          where: { id: userAccount.id },
          data: {
            refresh_token: Buffer.from(encryptedRefreshToken),
            token_expires_at: profile.oauth_tokens.expires_in
              ? new Date(Date.now() + profile.oauth_tokens.expires_in * 1000)
              : null,
            scopes,
          },
        });
      }

      const { accessToken, refreshToken, session } = await this.auth.getAuthenticationPayload(
        locale,
        userAccount.user_id,
        ipAddress,
        userAgent
      );

      await this.token.setRefreshTokenCookie(locale, res, refreshToken, session.expires_at);
      return this.formatAuthResponse(accessToken, refreshToken, includeRefreshTokenInBody);
    }
  }

  private async handleRegister(res: Response, locale: string, ipAddress: string, userAgent: string, provider: user_account_provider_52222e2ecb_enum, profile: any, includeRefreshTokenInBody?: boolean) {
    const existingUser = await this.prisma.user_identifier.findFirst({
      where: {
        type: 'email',
        value: profile.email,
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'Este email já está sendo usado. Entre em sua conta e utilize a opção "Conectar".',
      );
    }

    const encryptedRefreshToken = profile.oauth_tokens.refresh_token ? this.security.encrypt(profile.oauth_tokens.refresh_token) : null;
    const scopes = await this.resolveProfileScopes(provider, profile);

    const settings = await this.setting.getSettingValues([
      'oauth-role-assignment',
    ]);

    const roles = settings['oauth-role-assignment'] || [];

    const roleIds = this.prisma.role.findMany({
      where: { 
        slug: { in: roles }        
       },
       select: { id: true }
    });

    const user = await this.prisma.user.create({
      data: {
        name: profile.name,
        role_user: {
          create: (await roleIds).map((role) => ({ role_id: role.id })),
        },
        user_identifier: {
          create: {
            type: 'email',
            value: profile.email,
            verified_at: new Date(),
            enabled: true
          },
        },
        user_account: {
          create: {
            provider: String(provider).toLowerCase().replace(/-/g, '_') as user_account_provider_52222e2ecb_enum,
            provider_user_id: profile.id,
            email: profile.email,
            refresh_token: encryptedRefreshToken ? Buffer.from(encryptedRefreshToken) : null,
            token_expires_at: profile.oauth_tokens?.expires_in
              ? new Date(Date.now() + profile.oauth_tokens.expires_in * 1000)
              : null,
            scopes,
          },
        },
      },
    });

    await this.mail.sendTemplatedMail(locale, {
      email: profile.email,
      slug: 'auth-sign-up',
      variables: { name: profile.name },
    });

    const pictureURL = profile.picture?.data?.url || profile.picture;
    if (pictureURL) {
      const photoId = await this.downloadAndSaveProfilePicture(
        pictureURL,
        user.id,
        profile.oauth_tokens?.access_token,
      );

      await this.prisma.user.update({
        where: { id: user.id },
        data: { photo_id: photoId },
      });
    }

    await this.user.registerUserActivity(user.id, 'oauth-register');
    const { accessToken, refreshToken, session } = await this.auth.getAuthenticationPayload(
      locale,
      user.id,
      ipAddress,
      userAgent
    );
    await this.token.setRefreshTokenCookie(locale, res, refreshToken, session.expires_at);
    return this.formatAuthResponse(accessToken, refreshToken, includeRefreshTokenInBody);
  }

  private async handleConnect(
    res: Response, 
    locale: string, 
    ipAddress: string, 
    userAgent: string,
    provider: user_account_provider_52222e2ecb_enum,
    profile: any,
    userId: number,
    includeRefreshTokenInBody?: boolean,
  ) {
    const existingAccount = await this.prisma.user_account.findFirst({
      where: {
        user_id: userId,
        provider: String(provider).toLowerCase().replace(/-/g, '_') as user_account_provider_52222e2ecb_enum,
      },
    });

    if (existingAccount) {
      throw new BadRequestException(`Usuário já conectado com o ${provider}.`);
    }

    const encryptedRefreshToken = profile.oauth_tokens.refresh_token ? this.security.encrypt(profile.oauth_tokens.refresh_token) : null;
    const scopes = await this.resolveProfileScopes(provider, profile);
    await this.prisma.user_account.create({
      data: {
        user_id: userId,
        provider: String(provider).toLowerCase().replace(/-/g, '_') as user_account_provider_52222e2ecb_enum,
        provider_user_id: profile.id,
        email: profile.email,
        refresh_token: encryptedRefreshToken ? Buffer.from(encryptedRefreshToken) : null,
        token_expires_at: profile.oauth_tokens?.expires_in
          ? new Date(Date.now() + profile.oauth_tokens.expires_in * 1000)
          : null,
        scopes,
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const updateData: any = {};
    const pictureURL = profile.picture?.data?.url || profile.picture;
    if (pictureURL) {
      const photoId = await this.downloadAndSaveProfilePicture(
        pictureURL,
        userId,
        profile.oauth_tokens?.access_token,
      );
      if (photoId) {
        updateData.photo_id = photoId;
      }
    }

    if (profile.name && profile.name.length > (user.name?.length || 0)) {
      updateData.name = profile.name;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }

    await this.user.registerUserActivity(userId, 'oauth-connect');
    const { accessToken, refreshToken, session } = await this.auth.getAuthenticationPayload(locale, user.id, ipAddress, userAgent);
    await this.token.setRefreshTokenCookie(locale, res, refreshToken, session.expires_at);
    return this.formatAuthResponse(accessToken, refreshToken, includeRefreshTokenInBody);
  }

  private async handleDisconnect(res: Response, locale: string, ipAddress: string, userAgent: string, provider: user_account_provider_52222e2ecb_enum, email: string) {
    const userAccount = await this.prisma.user_account.findFirst({
      where: {
        email,
        provider: String(provider).toLowerCase().replace(/-/g, '_') as user_account_provider_52222e2ecb_enum,
      },
      include: { user: true }
    });

    if (!userAccount) {
      throw new NotFoundException(`Usuário não conectado ao ${provider}.`);
    }

    await this.prisma.user_account.delete({
      where: { id: userAccount.id },
    });

    await this.user.registerUserActivity(userAccount.user.id, 'oauth-disconnect');
    const { accessToken, refreshToken, session } = await this.auth.getAuthenticationPayload(locale, userAccount.user.id, ipAddress, userAgent);
    await this.token.setRefreshTokenCookie(locale, res, refreshToken, session.expires_at);
    return { accessToken };
  }

  private async downloadAndSaveProfilePicture(
    url: string,
    userId: number,
    accessToken?: string,
  ) {
    if (!url) return null;

    const headers: any = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      console.warn(`Failed to download profile picture from ${url}: ${response.statusText}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    const file = {
      originalname: `profile_${userId}.jpg`,
      mimetype: response.headers.get('content-type') || 'image/jpeg',
      buffer,
      size: buffer.length,
    } as any;

    const savedFile = await this.file.upload(USER_AVATAR_UPLOAD_DESTINATION, file);
    return savedFile.id;
  }
}
