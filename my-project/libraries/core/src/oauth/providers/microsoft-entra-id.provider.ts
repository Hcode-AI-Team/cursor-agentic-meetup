import { PrismaService } from '@hed-hog/api-prisma';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { buildOAuthConfigFromIntegration } from '../../integration-profile/integration-profile.utils';
import { SettingService } from '../../setting/setting.service';
import { BaseOAuthProvider } from './abstract.provider';

@Injectable()
export class MicrosoftEntraIdProvider extends BaseOAuthProvider {
  private readonly logger = new Logger(MicrosoftEntraIdProvider.name);

  constructor(
    http: HttpService,
    @Inject(forwardRef(() => SettingService))
    private readonly setting: SettingService,
    private readonly prisma: PrismaService,
  ) {
    super(http);
  }

  private normalizeBaseUrl(url: string) {
    return String(url).trim().replace(/\/+$/, '');
  }

  private buildRedirectUri(baseUrl: string, callbackPath: string) {
    const normalizedBaseUrl = this.normalizeBaseUrl(baseUrl);
    const normalizedCallbackPath = callbackPath.startsWith('/')
      ? callbackPath
      : `/${callbackPath}`;

    return new URL(normalizedCallbackPath, `${normalizedBaseUrl}/`).toString();
  }

  getProviderType() {
    return 'MICROSOFT-ENTRA-ID';
  }

  private async loadConfig() {
    const settings = await this.setting.getSettingValues([
      'oauth-microsoft-entra-id-profile-id',
      'url',
    ]);
    const profileSlug = String(settings['oauth-microsoft-entra-id-profile-id'] ?? '').trim();
    if (!profileSlug) throw new BadRequestException('Microsoft Entra ID OAuth profile not configured.');

    const profile = await this.prisma.integration_profile.findUnique({
      where: { slug: profileSlug },
      include: { integration_provider: { select: { slug: true } } },
    });
    if (!profile) throw new BadRequestException('Microsoft Entra ID OAuth profile not found.');

    const { clientId, clientSecret, tenantId } = buildOAuthConfigFromIntegration(
      profile.integration_provider.slug,
      profile.config,
    );
    if (!tenantId) {
      throw new BadRequestException('Microsoft Entra ID OAuth profile is missing tenant_id.');
    }
    return { clientId, clientSecret, tenantId, baseUrl: String(settings['url'] ?? '') };
  }

  async getAuthUrl(callbackPath: string) {
    const { clientId, tenantId, baseUrl } = await this.loadConfig();
    const settings = await this.setting.getSettingValues(['oauth-microsoft-entra-id-scopes']);
    const baseScopes: string[] = settings['oauth-microsoft-entra-id-scopes'] ?? ['openid', 'profile', 'email'];
    const scopes = baseScopes.includes('offline_access')
      ? baseScopes
      : [...baseScopes, 'offline_access'];

    const redirectURI = this.buildRedirectUri(baseUrl, callbackPath);
    const isConnectFlow = callbackPath.includes('/connect');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectURI,
      response_type: 'code',
      scope: scopes.join(' '),
      response_mode: 'query',
    });

    this.logger.log(
      `OAuth auth URL requested: provider=MICROSOFT-ENTRA-ID redirectUri=${redirectURI} hasOfflineAccess=${scopes.includes('offline_access') ? 'yes' : 'no'} connectFlow=${isConnectFlow ? 'yes' : 'no'} tenantConfigured=${tenantId ? 'yes' : 'no'}`,
    );

    if (isConnectFlow) {
      params.set('prompt', 'consent');
    }

    return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async getProfile(code: string, type: string, redirectUri?: string): Promise<any> {
    let resolvedRedirectUri = '';

    try {
      const { clientId, clientSecret, tenantId, baseUrl } = await this.loadConfig();
      const settings = await this.setting.getSettingValues(['oauth-microsoft-entra-id-scopes']);
      const scopes: string[] = settings['oauth-microsoft-entra-id-scopes'] ?? [];
      resolvedRedirectUri =
        redirectUri?.trim() || this.buildRedirectUri(baseUrl, '/callback/microsoft-entra-id');

      this.logger.log(
        `OAuth token exchange started: provider=MICROSOFT-ENTRA-ID type=${type} redirectUri=${resolvedRedirectUri} hasCode=${code ? 'yes' : 'no'} codeLength=${code?.length ?? 0}`,
      );

      const token = await this.fetchToken({
        code,
        url: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        clientId,
        clientSecret,
        redirectUri: resolvedRedirectUri,
      });

      const profile = await this.fetchProfile(
        token.access_token,
        'https://graph.microsoft.com/v1.0/me',
      );

      this.logger.log(
        `OAuth profile fetched: provider=MICROSOFT-ENTRA-ID type=${type} profileIdPresent=${profile?.id ? 'yes' : 'no'} emailPresent=${profile?.mail || profile?.userPrincipalName ? 'yes' : 'no'}`,
      );

      const pictureUrl = 'https://graph.microsoft.com/v1.0/me/photo/$value';
      return {
        id: profile.id,
        email: profile.mail || profile.userPrincipalName,
        name: profile.displayName,
        picture: pictureUrl,
        oauth_scopes: scopes.join(','),
        oauth_tokens: {
          access_token: token.access_token,
          refresh_token: token.refresh_token,
          expires_in: token.expires_in,
          token_type: token.token_type,
        },
      };
    } catch (error: any) {
      const mappedError = this.mapProviderError('Microsoft Entra ID', error);

      this.logger.warn(
        `OAuth callback failed: provider=MICROSOFT-ENTRA-ID status=${mappedError.status ?? 'unknown'} error=${mappedError.providerError ?? 'unknown'} providerCode=${mappedError.providerErrorCode ?? 'n/a'} reason=${mappedError.reason} redirectUri=${resolvedRedirectUri || 'unresolved'}`,
      );

      throw mappedError;
    }
  }
}
