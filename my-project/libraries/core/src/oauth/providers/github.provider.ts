import { PrismaService } from '@hed-hog/api-prisma';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { buildOAuthConfigFromIntegration } from '../../integration-profile/integration-profile.utils';
import { SettingService } from '../../setting/setting.service';
import { BaseOAuthProvider } from './abstract.provider';

@Injectable()
export class GithubProvider extends BaseOAuthProvider {

  private isAbsoluteCallbackPath(value: string) {
    return /^[a-z][a-z\d+.-]*:/i.test(String(value || '').trim());
  }

  constructor(
    http: HttpService,
    @Inject(forwardRef(() => SettingService))
    private readonly setting: SettingService,
    private readonly prisma: PrismaService,
  ) {
    super(http);
  }

  getProviderType() {
    return 'GITHUB';
  }

  private async loadConfig() {
    const settings = await this.setting.getSettingValues([
      'oauth-github-profile-id',
      'api-url',
    ]);
    const profileSlug = String(settings['oauth-github-profile-id'] ?? '').trim();
    if (!profileSlug) throw new BadRequestException('GitHub OAuth profile not configured.');

    const profile = await this.prisma.integration_profile.findUnique({
      where: { slug: profileSlug },
      include: { integration_provider: { select: { slug: true } } },
    });
    if (!profile) throw new BadRequestException('GitHub OAuth profile not found.');

    const { clientId, clientSecret } = buildOAuthConfigFromIntegration(
      profile.integration_provider.slug,
      profile.config,
    );
    return { clientId, clientSecret, apiUrl: String(settings['api-url'] ?? '') };
  }

  async getAuthUrl(callbackPath: string) {
    const { clientId, apiUrl } = await this.loadConfig();
    const settings = await this.setting.getSettingValues(['oauth-github-scopes']);
    const scopes: string[] = settings['oauth-github-scopes'] ?? ['read:user', 'user:email'];

    const fixedCallbackPath = '/oauth/github/callback';
    const redirectURI = this.isAbsoluteCallbackPath(callbackPath)
      ? callbackPath
      : new URL(fixedCallbackPath, apiUrl).toString();
    const type = this.isAbsoluteCallbackPath(callbackPath)
      ? 'login'
      : callbackPath.split('/').pop() || 'login';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectURI,
      scope: scopes.join(' '),
      allow_signup: 'true',
      state: type,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async getProfile(code: string, _type?: string, redirectUri?: string) {
    const { clientId, clientSecret, apiUrl } = await this.loadConfig();

    const fixedCallbackPath = '/oauth/github/callback';
    const redirectURI = redirectUri?.trim()
      ? redirectUri.trim()
      : new URL(fixedCallbackPath, apiUrl.replace(':3200', ':3100')).toString();
    const tokenResponse = await this.http.axiosRef.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectURI,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

    const { access_token, error, error_description } = tokenResponse.data;
    if (error || !access_token) {
      throw new Error(
        `GitHub OAuth error: ${error_description || error || 'No access token received'}`,
      );
    }

    const profileResponse = await this.http.axiosRef.get(
      'https://api.github.com/user',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
    );

    const profile = profileResponse.data;
    let email = profile.email;
    if (!email) {
      const emailResponse = await this.http.axiosRef.get(
        'https://api.github.com/user/emails',
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      );
      const primaryEmail = emailResponse.data.find(
        (e: any) => e.primary && e.verified,
      );
      email = primaryEmail?.email || null;
    }

    return {
      id: profile.id.toString(),
      email,
      name: profile.name || profile.login,
      picture: profile.avatar_url,
      oauth_tokens: {
        access_token: access_token,
        refresh_token: access_token,
        expires_in: null,
        token_type: 'bearer',
      },
    };
  }
}
