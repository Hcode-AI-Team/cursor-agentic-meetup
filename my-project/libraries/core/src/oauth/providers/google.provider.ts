import { PrismaService } from '@hed-hog/api-prisma';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { buildOAuthConfigFromIntegration } from '../../integration-profile/integration-profile.utils';
import { SettingService } from '../../setting/setting.service';
import { BaseOAuthProvider } from './abstract.provider';

@Injectable()
export class GoogleProvider extends BaseOAuthProvider {

  constructor(
    http: HttpService,
    @Inject(forwardRef(() => SettingService))
    private readonly setting: SettingService,
    private readonly prisma: PrismaService,
  ) {
    super(http);
  }

  getProviderType() {
    return 'GOOGLE';
  }

  private async loadConfig() {
    const settings = await this.setting.getSettingValues([
      'oauth-google-profile-id',
      'url',
    ]);
    const profileSlug = String(settings['oauth-google-profile-id'] ?? '').trim();
    if (!profileSlug) throw new BadRequestException('Google OAuth profile not configured.');

    const profile = await this.prisma.integration_profile.findUnique({
      where: { slug: profileSlug },
      include: { integration_provider: { select: { slug: true } } },
    });
    if (!profile) throw new BadRequestException('Google OAuth profile not found.');

    const { clientId, clientSecret } = buildOAuthConfigFromIntegration(
      profile.integration_provider.slug,
      profile.config,
    );
    return { clientId, clientSecret, baseUrl: String(settings['url'] ?? '') };
  }

  async getAuthUrl(callbackPath: string) {
    const { clientId, baseUrl } = await this.loadConfig();
    const settings = await this.setting.getSettingValues(['oauth-google-scopes']);
    const scopes: string[] = settings['oauth-google-scopes'] ?? ['email', 'profile'];
    const redirectURI = new URL(callbackPath, baseUrl).toString();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectURI,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async getProfile(code: string, _type?: string, redirectUri?: string) {
    const { clientId, clientSecret, baseUrl } = await this.loadConfig();

    // Single, flow-less callback per provider (the flow travels in the OAuth state).
    const resolvedRedirectUri =
      redirectUri?.trim() || `${baseUrl}/callback/google`;

    const token = await this.fetchToken({
      code,
      url: 'https://oauth2.googleapis.com/token',
      clientId,
      clientSecret,
      redirectUri: resolvedRedirectUri,
    });

    const basicProfile = await this.fetchProfile(
      token.access_token,
      'https://www.googleapis.com/oauth2/v2/userinfo',
    );

    const peopleProfile = await this.getGoogleProfileFromAccessToken(
      token.access_token,
    );

    return {
      ...basicProfile,
      gender: peopleProfile.gender,
      birthday: peopleProfile.birthday,
      oauth_tokens: {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_in: token.expires_in,
        token_type: token.token_type,
      },
    };
  }

  private async getGoogleProfileFromAccessToken(accessToken: string) {
    const url =
      'https://people.googleapis.com/v1/people/me?personFields=genders,birthdays';

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Google People API error: ${res.statusText}`);
    }

    const data: any = await res.json();

    const gender =
      data.genders?.find((g: any) => g.metadata?.primary)?.value ??
      data.genders?.[0]?.value ??
      null;

    const b =
      data.birthdays?.find((x: any) => x.metadata?.primary) ??
      data.birthdays?.[0];

    const date = b?.date
      ? { day: b.date.day, month: b.date.month, year: b.date.year ?? null }
      : null;

    return { gender, birthday: date, raw: data };
  }
}
