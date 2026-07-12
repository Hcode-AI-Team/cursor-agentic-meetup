import { PrismaService } from '@hed-hog/api-prisma';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { buildOAuthConfigFromIntegration } from '../../integration-profile/integration-profile.utils';
import { SettingService } from '../../setting/setting.service';
import { BaseOAuthProvider } from './abstract.provider';

const APPLE_TOKEN_AUDIENCE = 'https://appleid.apple.com';
// Apple accepts client_secret JWTs valid for up to 6 months; a short TTL is enough
// since a fresh one is signed on every token exchange (no caching/rotation needed).
const CLIENT_SECRET_TTL_SECONDS = 5 * 60;

@Injectable()
export class AppleProvider extends BaseOAuthProvider {

  constructor(
    http: HttpService,
    @Inject(forwardRef(() => SettingService))
    private readonly setting: SettingService,
    private readonly prisma: PrismaService,
  ) {
    super(http);
  }

  getProviderType() {
    return 'APPLE';
  }

  private async loadConfig() {
    const settings = await this.setting.getSettingValues([
      'oauth-apple-profile-id',
      'api-url',
    ]);
    const profileSlug = String(settings['oauth-apple-profile-id'] ?? '').trim();
    if (!profileSlug) throw new BadRequestException('Apple OAuth profile not configured.');

    const profile = await this.prisma.integration_profile.findUnique({
      where: { slug: profileSlug },
      include: { integration_provider: { select: { slug: true } } },
    });
    if (!profile) throw new BadRequestException('Apple OAuth profile not found.');

    const { clientId, teamId, keyId, privateKey } = buildOAuthConfigFromIntegration(
      profile.integration_provider.slug,
      profile.config,
    );
    if (!teamId || !keyId || !privateKey) {
      throw new BadRequestException(
        'Apple OAuth profile is missing team_id, key_id or private_key.',
      );
    }

    return {
      clientId,
      teamId,
      keyId,
      privateKey: this.normalizePrivateKey(privateKey),
      apiUrl: String(settings['api-url'] ?? ''),
    };
  }

  /** Accepts keys pasted with literal "\n" escapes, in addition to real line breaks. */
  private normalizePrivateKey(raw: string): string {
    const trimmed = raw.trim();
    return trimmed.includes('\\n') ? trimmed.replace(/\\n/g, '\n') : trimmed;
  }

  /**
   * Apple has no static client_secret: it must be a short-lived ES256 JWT signed
   * with the private key tied to keyId, issued by teamId, for clientId (the
   * Services ID). Built fresh per token exchange.
   */
  private buildClientSecret(
    clientId: string,
    teamId: string,
    keyId: string,
    privateKey: string,
  ): string {
    const now = Math.floor(Date.now() / 1000);
    return jwt.sign(
      {
        iss: teamId,
        iat: now,
        exp: now + CLIENT_SECRET_TTL_SECONDS,
        aud: APPLE_TOKEN_AUDIENCE,
        sub: clientId,
      },
      privateKey,
      { algorithm: 'ES256', keyid: keyId },
    );
  }

  async getAuthUrl(_callbackPath: string) {
    const { clientId, apiUrl } = await this.loadConfig();
    const settings = await this.setting.getSettingValues(['oauth-apple-scopes']);
    const scopes: string[] = settings['oauth-apple-scopes'] ?? ['name', 'email'];

    // Apple only supports a single registered "Return URL" per app, at the backend
    // (mirrors GitHub): the flow (login/register/connect) and initiating app travel
    // in the signed OAuth state, never the path (see OAuthService.getWebAuthUrl).
    const redirectURI = new URL('/oauth/apple/callback', apiUrl).toString();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectURI,
      response_type: 'code',
      scope: scopes.join(' '),
    });

    // Apple mandates response_mode=form_post whenever `scope` is requested: the
    // browser POSTs code/state to redirect_uri instead of a GET redirect. The
    // dedicated POST /oauth/apple/callback route bounces it back to a GET so the
    // rest of the pipeline (hub forwarding, code exchange) is identical to every
    // other provider.
    if (scopes.length > 0) {
      params.set('response_mode', 'form_post');
    }

    return `https://appleid.apple.com/auth/authorize?${params}`;
  }

  async getProfile(code: string, _type?: string, redirectUri?: string) {
    const { clientId, teamId, keyId, privateKey, apiUrl } = await this.loadConfig();

    const resolvedRedirectUri =
      redirectUri?.trim() || new URL('/oauth/apple/callback', apiUrl).toString();

    const clientSecret = this.buildClientSecret(clientId, teamId, keyId, privateKey);

    const token = await this.fetchToken({
      code,
      url: 'https://appleid.apple.com/auth/token',
      clientId,
      clientSecret,
      redirectUri: resolvedRedirectUri,
    });

    // Apple has no profile REST endpoint: identity comes from the id_token JWT,
    // delivered directly by Apple over this authenticated server-to-server call
    // (never client-supplied), so decoding the payload without re-verifying the
    // signature carries the same trust level as the TLS channel itself.
    const claims = this.decodeIdTokenPayload(token.id_token);
    const email = claims.email ? String(claims.email) : null;

    return {
      id: String(claims.sub ?? ''),
      email,
      // Apple only sends the user's name once, in the initial form_post body —
      // not reachable from this GET-based hub bounce. Fall back to the email
      // local-part so account creation (user.name is required) still works.
      name: email ? email.split('@')[0] : 'Apple User',
      picture: null,
      oauth_tokens: {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_in: token.expires_in,
        token_type: token.token_type,
      },
    };
  }

  private decodeIdTokenPayload(idToken: string): Record<string, unknown> {
    const segments = String(idToken ?? '').split('.');
    if (segments.length < 2) {
      throw new BadRequestException('Apple OAuth response is missing a valid identity token.');
    }
    try {
      const payload = Buffer.from(segments[1], 'base64url').toString('utf8');
      return JSON.parse(payload);
    } catch {
      throw new BadRequestException('Unable to decode Apple identity token.');
    }
  }
}
