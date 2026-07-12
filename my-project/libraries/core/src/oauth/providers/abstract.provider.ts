import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { OAuthProvider } from '../interfaces/OAuthProvider';
import { OAuthProviderException } from '../oauth.errors';

export abstract class BaseOAuthProvider implements OAuthProvider {
  constructor(protected readonly http: HttpService) {}

  abstract getAuthUrl(callbackPath: string): Promise<string>;
  abstract getProfile(code: string, type?: string, redirectUri?: string): Promise<any>;
  abstract getProviderType(): string;

  protected async fetchToken({
    code,
    url,
    clientId,
    clientSecret,
    redirectUri,
  }: {
    code: string;
    url: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }) {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code,
    }).toString();

    const response = await lastValueFrom(
      this.http.post(url, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );

    return response.data;
  }

  protected async fetchProfile(accessToken: string, url: string) {
    const response = await lastValueFrom(
      this.http.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    return response.data;
  }

  protected mapProviderError(provider: string, error: any) {
    const providerError = this.extractProviderError(error);
    const providerErrorCode = this.extractProviderErrorCode(error);
    const status = error?.response?.status;

    if (this.isConsumedAuthorizationCodeError(error)) {
      return new OAuthProviderException(
        provider,
        'callback_consumed',
        'OAuth callback is no longer valid. Start the sign-in flow again.',
        status,
        providerError,
        providerErrorCode,
      );
    }

    if (this.isInvalidAuthorizationCodeError(error)) {
      return new OAuthProviderException(
        provider,
        'invalid_callback',
        'OAuth callback is invalid or expired. Start the sign-in flow again.',
        status,
        providerError,
        providerErrorCode,
      );
    }

    return new OAuthProviderException(
      provider,
      'upstream_failure',
      `Unable to complete ${provider} OAuth authentication.`,
      status,
      providerError,
      providerErrorCode,
    );
  }

  protected extractProviderError(error: any) {
    return error?.response?.data?.error || error?.code || 'unknown_error';
  }

  protected extractProviderErrorCode(error: any) {
    const description = String(error?.response?.data?.error_description || '');
    const match = description.match(/AADSTS\d+/i);
    return match?.[0] || undefined;
  }

  protected isConsumedAuthorizationCodeError(error: any) {
    const providerError = this.extractProviderError(error);
    const description = String(error?.response?.data?.error_description || '');

    return (
      providerError === 'invalid_grant' &&
      /(AADSTS54005|already redeemed|already been redeemed|authorization code was already redeemed)/i.test(
        description,
      )
    );
  }

  protected isInvalidAuthorizationCodeError(error: any) {
    return this.extractProviderError(error) === 'invalid_grant';
  }
}
