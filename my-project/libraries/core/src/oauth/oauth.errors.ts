export type OAuthProviderFailureReason =
  | 'callback_consumed'
  | 'invalid_callback'
  | 'upstream_failure';

export class OAuthProviderException extends Error {
  constructor(
    public readonly provider: string,
    public readonly reason: OAuthProviderFailureReason,
    message: string,
    public readonly status?: number,
    public readonly providerError?: string,
    public readonly providerErrorCode?: string,
  ) {
    super(message);
    this.name = 'OAuthProviderException';
  }
}

export class OAuthCallbackAlreadyProcessedError extends Error {
  constructor() {
    super('OAuth callback already processed.');
    this.name = 'OAuthCallbackAlreadyProcessedError';
  }
}

export class OAuthCallbackInProgressError extends Error {
  constructor() {
    super('OAuth callback is already in progress.');
    this.name = 'OAuthCallbackInProgressError';
  }
}