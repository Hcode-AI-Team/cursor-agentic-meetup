import { PrismaService } from '@hed-hog/api-prisma';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { buildOAuthConfigFromIntegration } from '../../integration-profile/integration-profile.utils';
import { SettingService } from '../../setting/setting.service';
import { BaseOAuthProvider } from './abstract.provider';

@Injectable()
export class FacebookProvider extends BaseOAuthProvider {

  constructor(
    http: HttpService,
    @Inject(forwardRef(() => SettingService))
    private readonly setting: SettingService,
    private readonly prisma: PrismaService,
  ) {
    super(http);
  }

  getProviderType() {
    return 'FACEBOOK';
  }

  private async loadConfig() {
    const settings = await this.setting.getSettingValues([
      'oauth-facebook-profile-id',
      'url',
    ]);
    const profileSlug = String(settings['oauth-facebook-profile-id'] ?? '').trim();
    if (!profileSlug) throw new BadRequestException('Facebook OAuth profile not configured.');

    const profile = await this.prisma.integration_profile.findUnique({
      where: { slug: profileSlug },
      include: { integration_provider: { select: { slug: true } } },
    });
    if (!profile) throw new BadRequestException('Facebook OAuth profile not found.');

    const { clientId, clientSecret } = buildOAuthConfigFromIntegration(
      profile.integration_provider.slug,
      profile.config,
    );
    return { clientId, clientSecret, baseUrl: String(settings['url'] ?? '') };
  }

  async getAuthUrl(callbackPath: string) {
    const { clientId, baseUrl } = await this.loadConfig();
    const settings = await this.setting.getSettingValues(['oauth-facebook-scopes']);
    const scopes: string[] = settings['oauth-facebook-scopes'] ?? ['email'];
    const redirectURI = new URL(callbackPath, baseUrl).toString();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectURI,
      response_type: 'code',
      scope: scopes.join(','),
      auth_type: 'rerequest',
    });

    return `https://www.facebook.com/v17.0/dialog/oauth?${params}`;
  }

  async getProfile(code: string, _type?: string, redirectUri?: string): Promise<any> {
    const { clientId, clientSecret, baseUrl } = await this.loadConfig();

    // Single, flow-less callback per provider (the flow travels in the OAuth state).
    const resolvedRedirectUri =
      redirectUri?.trim() || `${baseUrl}/callback/facebook`;

    const token = await this.fetchToken({
      code,
      url: 'https://graph.facebook.com/v17.0/oauth/access_token',
      clientId,
      clientSecret,
      redirectUri: resolvedRedirectUri,
    });
    const profile = await this.fetchProfile(
      token.access_token,
      'https://graph.facebook.com/me?fields=id,name,email,gender,birthday,picture',
    );
    return {
      ...profile,
      oauth_tokens: {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_in: token.expires_in,
        token_type: token.token_type,
      },
    };
  }
}
