import { PrismaService } from '@hed-hog/api-prisma';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { buildOAuthConfigFromIntegration } from '../../integration-profile/integration-profile.utils';
import { SettingService } from '../../setting/setting.service';
import { BaseOAuthProvider } from './abstract.provider';

@Injectable()
export class MicrosoftProvider extends BaseOAuthProvider {

  constructor(
    http: HttpService,
    @Inject(forwardRef(() => SettingService))
    private readonly setting: SettingService,
    private readonly prisma: PrismaService,
  ) {
    super(http);
  }

  getProviderType() {
    return 'MICROSOFT';
  }

  private async loadConfig() {
    const settings = await this.setting.getSettingValues([
      'oauth-microsoft-profile-id',
      'url',
    ]);
    const profileSlug = String(settings['oauth-microsoft-profile-id'] ?? '').trim();
    if (!profileSlug) throw new BadRequestException('Microsoft OAuth profile not configured.');

    const profile = await this.prisma.integration_profile.findUnique({
      where: { slug: profileSlug },
      include: { integration_provider: { select: { slug: true } } },
    });
    if (!profile) throw new BadRequestException('Microsoft OAuth profile not found.');

    const { clientId, clientSecret, tenantId } = buildOAuthConfigFromIntegration(
      profile.integration_provider.slug,
      profile.config,
    );
    return { clientId, clientSecret, tenantId, baseUrl: String(settings['url'] ?? '') };
  }

  async getAuthUrl(callbackPath: string) {
    const { clientId, baseUrl } = await this.loadConfig();
    const settings = await this.setting.getSettingValues(['oauth-microsoft-scopes']);
    const scopes: string[] = settings['oauth-microsoft-scopes'] ?? ['openid', 'profile', 'email'];
    const redirectURI = new URL(callbackPath, baseUrl).toString();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectURI,
      response_type: 'code',
      scope: scopes.join(' '),
      response_mode: 'query',
      prompt: 'consent',
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
  }

  async getProfile(code: string, _type?: string, redirectUri?: string): Promise<any> {
    const { clientId, clientSecret, baseUrl } = await this.loadConfig();

    // Single, flow-less callback per provider (the flow travels in the OAuth state).
    const resolvedRedirectUri =
      redirectUri?.trim() || `${baseUrl}/callback/microsoft`;

    const token = await this.fetchToken({
      code,
      url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      clientId,
      clientSecret,
      redirectUri: resolvedRedirectUri,
    });

    const profile = await this.fetchProfile(
      token.access_token,
      'https://graph.microsoft.com/v1.0/me',
    );

    const pictureUrl = 'https://graph.microsoft.com/v1.0/me/photo/$value';
    return {
      id: profile.id,
      email: profile.mail || profile.userPrincipalName,
      name: profile.displayName,
      picture: pictureUrl,
      oauth_tokens: {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_in: token.expires_in,
        token_type: token.token_type,
      },
    };
  }
}
