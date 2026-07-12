export interface OAuthProvider {
  getAuthUrl(callbackPath: string): Promise<string>;
  getProfile(code: string, type?: string, redirectUri?: string): Promise<any>;
  getProviderType(): string;
}
