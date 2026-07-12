import { BadRequestException } from '@nestjs/common';
import { EnumProvider } from '../file/provider/provider.enum';

type Cfg = Record<string, unknown>;

export function buildMailConfigFromIntegration(
  providerSlug: string,
  config: unknown,
): any {
  const cfg = (config as Cfg) ?? {};

  switch (providerSlug.toLowerCase()) {
    case 'smtp':
      return {
        global: true,
        type: 'SMTP' as const,
        host: String(cfg.host ?? ''),
        port: Number(cfg.port ?? 587),
        secure: Boolean(cfg.secure),
        username: String(cfg.username ?? ''),
        password: String(cfg.password ?? ''),
      };
    case 'gmail':
      return {
        global: true,
        type: 'GMAIL' as const,
        clientId: String(cfg.client_id ?? ''),
        clientSecret: String(cfg.client_secret ?? ''),
        refreshToken: String(cfg.refresh_token ?? ''),
        from: String(cfg.from_email ?? ''),
      };
    case 'ses':
      return {
        global: true,
        type: 'SES' as const,
        region: String(cfg.region ?? ''),
        accessKeyId: String(cfg.access_key_id ?? ''),
        secretAccessKey: String(cfg.secret_access_key ?? ''),
        from: String(cfg.from_email ?? ''),
      };
    default:
      throw new BadRequestException(`Unsupported mail provider: ${providerSlug}`);
  }
}

export function getFromAddress(config: unknown): string {
  const cfg = (config as Cfg) ?? {};
  const fromEmail = String(cfg.from_email ?? '');
  const fromName = String(cfg.from_name ?? '');
  return fromName ? `${fromName} <${fromEmail}>` : fromEmail;
}

export function getReplyToAddress(config: unknown): string | undefined {
  const cfg = (config as Cfg) ?? {};
  const replyToEmail = String(cfg.reply_to_email ?? '').trim();
  if (!replyToEmail) return undefined;
  const replyToName = String(cfg.reply_to_name ?? '').trim();
  return replyToName ? `${replyToName} <${replyToEmail}>` : replyToEmail;
}

// ─── Storage utilities ────────────────────────────────────────────────────────

/**
 * Maps an integration_profile config JSON to the flat settings dict that the
 * existing provider classes (S3Provider, AzureProvider, etc.) expect.
 *
 * integration_provider slugs → EnumProvider:
 *   local, s3, gcs       → same
 *   azure-blob           → abs
 *   s3-compatible        → spaces
 */
export function buildStorageConfigFromIntegration(
  providerSlug: string,
  config: unknown,
): Record<string, string> {
  const cfg = (config as Cfg) ?? {};

  switch (providerSlug.toLowerCase()) {
    case 'local':
      return {
        'storage-local-path': String(cfg.base_path ?? 'storage'),
      };
    case 's3':
      return {
        'storage-s3-key': String(cfg.access_key_id ?? ''),
        'storage-s3-secret': String(cfg.secret_access_key ?? ''),
        'storage-s3-region': String(cfg.region ?? 'us-east-1'),
        'storage-s3-bucket': String(cfg.bucket ?? ''),
      };
    case 'gcs':
      return {
        'storage-gcs-keyfile': String(cfg.key_file_json ?? ''),
        'storage-gcs-bucket': String(cfg.bucket ?? ''),
      };
    case 'azure-blob':
      return {
        'storage-abs-account': String(cfg.account ?? ''),
        'storage-abs-key': String(cfg.key ?? ''),
        'storage-abs-container': String(cfg.container ?? ''),
      };
    case 's3-compatible':
      return {
        'storage-spaces-key': String(cfg.access_key_id ?? ''),
        'storage-spaces-secret': String(cfg.secret_access_key ?? ''),
        'storage-spaces-region': String(cfg.region ?? ''),
        'storage-spaces-bucket': String(cfg.bucket ?? ''),
        'storage-spaces-cdn': String(cfg.endpoint ?? ''),
      };
    default:
      throw new BadRequestException(`Unsupported storage provider: ${providerSlug}`);
  }
}

/** Maps integration_provider slug to EnumProvider. */
export function resolveStorageEnumProvider(providerSlug: string): EnumProvider {
  switch (providerSlug.toLowerCase()) {
    case 'local': return EnumProvider.LOCAL;
    case 's3': return EnumProvider.S3;
    case 'gcs': return EnumProvider.GCS;
    case 'azure-blob': return EnumProvider.AZURE;
    case 's3-compatible': return EnumProvider.SPACES;
    default:
      throw new BadRequestException(`Unsupported storage provider: ${providerSlug}`);
  }
}

/** Maps integration_provider slug to the slug used in the file_provider table. */
export function resolveFileProviderSlug(providerSlug: string): string {
  switch (providerSlug.toLowerCase()) {
    case 'azure-blob': return 'abs';
    case 's3-compatible': return 'spaces';
    default: return providerSlug.toLowerCase();
  }
}

// ─── AI utilities ─────────────────────────────────────────────────────────────

// ─── OAuth utilities ──────────────────────────────────────────────────────────

/** Maps an integration_profile config JSON to OAuth client credentials. */
export function buildOAuthConfigFromIntegration(
  _providerSlug: string,
  config: unknown,
): {
  clientId: string;
  clientSecret: string;
  tenantId?: string;
  /** Apple Developer Team ID (Sign in with Apple). */
  teamId?: string;
  /** Key ID of the .p8 private key registered for Sign in with Apple. */
  keyId?: string;
  /** EC private key (PEM, .p8 contents) used to sign Apple's client_secret JWT. */
  privateKey?: string;
} {
  const cfg = (config as Cfg) ?? {};
  return {
    clientId: String(cfg.client_id ?? ''),
    clientSecret: String(cfg.client_secret ?? ''),
    ...(cfg.tenant_id ? { tenantId: String(cfg.tenant_id) } : {}),
    ...(cfg.team_id ? { teamId: String(cfg.team_id) } : {}),
    ...(cfg.key_id ? { keyId: String(cfg.key_id) } : {}),
    ...(cfg.private_key ? { privateKey: String(cfg.private_key) } : {}),
  };
}

// ─── Infrastructure utilities ──────────────────────────────────────────────────

export type DigitalOceanConfig = {
  apiToken: string;
  clusterId: string;
  region: string;
  videoNodePoolId: string;
  videoNodePoolName: string;
};

/** Maps an integration_profile config JSON to the DigitalOcean API credentials/targets. */
export function buildDigitalOceanConfigFromIntegration(
  providerSlug: string,
  config: unknown,
): DigitalOceanConfig {
  if (providerSlug.toLowerCase() !== 'digitalocean') {
    throw new BadRequestException(
      `Unsupported infrastructure provider: ${providerSlug}`,
    );
  }
  const cfg = (config as Cfg) ?? {};
  return {
    apiToken: String(cfg.api_token ?? ''),
    clusterId: String(cfg.cluster_id ?? ''),
    region: String(cfg.region ?? ''),
    videoNodePoolId: String(cfg.video_node_pool_id ?? ''),
    videoNodePoolName: String(cfg.video_node_pool_name ?? ''),
  };
}

export type KubernetesConfig = {
  apiServer: string;
  token: string;
  caCert: string;
  namespace: string;
};

/** Maps an integration_profile config JSON to read-only Kubernetes API access (opcional). */
export function buildKubernetesConfigFromIntegration(
  providerSlug: string,
  config: unknown,
): KubernetesConfig {
  if (providerSlug.toLowerCase() !== 'kubernetes') {
    throw new BadRequestException(
      `Unsupported infrastructure provider: ${providerSlug}`,
    );
  }
  const cfg = (config as Cfg) ?? {};
  return {
    apiServer: String(cfg.api_server ?? ''),
    token: String(cfg.token ?? ''),
    caCert: String(cfg.ca_cert ?? ''),
    namespace: String(cfg.namespace ?? 'hcode'),
  };
}

// ─── AI utilities ─────────────────────────────────────────────────────────────

/** Maps an integration_profile config JSON to the API key and optional org needed by AI providers. */
export function buildAiConfigFromIntegration(
  providerSlug: string,
  config: unknown,
): { apiKey: string; organization?: string } {
  const cfg = (config as Cfg) ?? {};
  switch (providerSlug.toLowerCase()) {
    case 'openai':
      return {
        apiKey: String(cfg.api_key ?? ''),
        ...(cfg.organization ? { organization: String(cfg.organization) } : {}),
      };
    case 'gemini':
    case 'claude':
      return { apiKey: String(cfg.api_key ?? '') };
    default:
      throw new BadRequestException(`Unsupported AI provider: ${providerSlug}`);
  }
}
