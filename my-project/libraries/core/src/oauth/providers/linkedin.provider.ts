import { PrismaService } from '@hed-hog/api-prisma';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { buildOAuthConfigFromIntegration } from '../../integration-profile/integration-profile.utils';
import { SettingService } from '../../setting/setting.service';
import { BaseOAuthProvider } from './abstract.provider';

@Injectable()
export class LinkedinProvider extends BaseOAuthProvider {

  constructor(
    http: HttpService,
    @Inject(forwardRef(() => SettingService))
    private readonly setting: SettingService,
    private readonly prisma: PrismaService,
  ) {
    super(http);
  }

  getProviderType() {
    return 'LINKEDIN';
  }

  private async loadConfig() {
    const settings = await this.setting.getSettingValues([
      'oauth-linkedin-profile-id',
      'url',
    ]);
    const profileSlug = String(settings['oauth-linkedin-profile-id'] ?? '').trim();
    if (!profileSlug) throw new BadRequestException('LinkedIn OAuth profile not configured.');

    const profile = await this.prisma.integration_profile.findUnique({
      where: { slug: profileSlug },
      include: { integration_provider: { select: { slug: true } } },
    });
    if (!profile) throw new BadRequestException('LinkedIn OAuth profile not found.');

    const { clientId, clientSecret } = buildOAuthConfigFromIntegration(
      profile.integration_provider.slug,
      profile.config,
    );
    return { clientId, clientSecret, baseUrl: String(settings['url'] ?? '') };
  }

  async getAuthUrl(callbackPath: string) {
    const { clientId, baseUrl } = await this.loadConfig();
    const settings = await this.setting.getSettingValues(['oauth-linkedin-scopes']);
    const scopes: string[] = settings['oauth-linkedin-scopes'] ?? ['openid', 'profile', 'email'];
    const redirectURI = new URL(callbackPath, baseUrl).toString();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectURI,
      response_type: 'code',
      scope: scopes.join(' '),
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  }

  async getProfile(code: string, _type?: string, redirectUri?: string) {
    const { clientId, clientSecret, baseUrl } = await this.loadConfig();

    // Single, flow-less callback per provider (the flow travels in the OAuth state).
    const resolvedRedirectUri =
      redirectUri?.trim() || `${baseUrl}/callback/linkedin`;

    const token = await this.fetchToken({
      code,
      url: 'https://www.linkedin.com/oauth/v2/accessToken',
      clientId,
      clientSecret,
      redirectUri: resolvedRedirectUri,
    });

    // "Sign In with LinkedIn using OpenID Connect": a single OIDC userinfo call
    // replaces the legacy /v2/me + /v2/emailAddress two-request dance.
    const profile = await this.fetchProfile(
      token.access_token,
      'https://api.linkedin.com/v2/userinfo',
    );

    return {
      id: profile.sub,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      oauth_tokens: {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_in: token.expires_in,
        token_type: token.token_type,
      },
    };
  }
}
