import { registerIntegrationConfigTransformer } from '@hed-hog/api-prisma';
import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';
import { SecurityService } from '../security/security.service';
import { getSensitiveConfigKeys } from './integration-profile.secrets';

/** Prefixo de envelope dos segredos cifrados em repouso. */
export const ENC_ENVELOPE_PREFIX = 'enc.v1.';

/** Placeholder devolvido à UI no lugar de um segredo armazenado. */
export const SECRET_MASK = '********';

type Config = Record<string, unknown> | null | undefined;

/**
 * Cifra/decifra os segredos dos Perfis de Integração em repouso.
 *
 * - Escrita: `encryptConfig` cifra (envelope `enc.v1.`) as chaves sensíveis do provider.
 * - Leitura: um middleware Prisma `$use` (registrado em onModuleInit) decifra
 *   `integration_profile.config` de forma transparente em toda leitura/resultado, então os
 *   ~25 consumidores que leem o perfil direto via Prisma não mudam.
 * - UI: `maskConfig` esconde segredos; `mergeKeepingStoredSecrets` implementa
 *   "deixe em branco para manter".
 *
 * Valores legados sem o prefixo passam intactos (sem janela de quebra antes do backfill).
 */
@Injectable()
export class IntegrationCredentialCryptoService implements OnModuleInit {
  private readonly logger = new Logger(IntegrationCredentialCryptoService.name);

  constructor(
    @Inject(forwardRef(() => SecurityService))
    private readonly securityService: SecurityService,
  ) {}

  onModuleInit() {
    // Registra a decifra transparente de integration_profile.config (query extension
    // no PrismaService). A partir daqui, toda leitura do perfil devolve config decifrado.
    registerIntegrationConfigTransformer((config) => this.decryptConfig(config));
    this.logger.log(
      'Integration credential decryption registered (integration_profile.config).',
    );
  }

  private isEnveloped(value: unknown): value is string {
    return typeof value === 'string' && value.startsWith(ENC_ENVELOPE_PREFIX);
  }

  /** Cifra um valor único com envelope (idempotente). */
  encryptValue(value: string): string {
    if (this.isEnveloped(value)) return value;
    return ENC_ENVELOPE_PREFIX + this.securityService.encrypt(value);
  }

  /** Decifra um valor com envelope; valores sem envelope passam intactos. */
  decryptValue(value: unknown): unknown {
    if (!this.isEnveloped(value)) return value;
    try {
      return this.securityService.decrypt(value.slice(ENC_ENVELOPE_PREFIX.length));
    } catch (err) {
      // Não derruba a query: loga e devolve como veio (ex.: ENCRYPTION_SECRET trocado).
      this.logger.error(
        `Failed to decrypt integration secret: ${err instanceof Error ? err.message : String(err)}`,
      );
      return value;
    }
  }

  /** Cifra as chaves sensíveis do provider no config (idempotente, ignora vazios). */
  encryptConfig(providerSlug: string, config: Config): Config {
    if (!config) return config;
    const keys = getSensitiveConfigKeys(providerSlug);
    if (keys.length === 0) return config;
    const out: Record<string, unknown> = { ...config };
    for (const key of keys) {
      const value = out[key];
      if (typeof value === 'string' && value.length > 0) {
        out[key] = this.encryptValue(value);
      }
    }
    return out;
  }

  /** Decifra qualquer valor com envelope no config (não precisa do provider slug). */
  decryptConfig(config: Config): Config {
    if (!config) return config;
    let changed = false;
    const out: Record<string, unknown> = { ...config };
    for (const [key, value] of Object.entries(out)) {
      if (this.isEnveloped(value)) {
        out[key] = this.decryptValue(value);
        changed = true;
      }
    }
    return changed ? out : config;
  }

  /** Mascara os segredos do provider para resposta à UI (não envia o valor real). */
  maskConfig(
    providerSlug: string,
    config: Config,
    placeholder = SECRET_MASK,
  ): Config {
    if (!config) return config;
    const keys = getSensitiveConfigKeys(providerSlug);
    if (keys.length === 0) return config;
    const out: Record<string, unknown> = { ...config };
    for (const key of keys) {
      const value = out[key];
      if (typeof value === 'string' && value.length > 0) {
        out[key] = placeholder;
      }
    }
    return out;
  }

  /**
   * "Deixe em branco para manter": para cada chave sensível, se o valor recebido está
   * vazio ou é o placeholder de máscara, herda o valor já armazenado (decifrado).
   */
  mergeKeepingStoredSecrets(
    providerSlug: string,
    incoming: Config,
    storedDecrypted: Config,
  ): Config {
    const merged: Record<string, unknown> = { ...(incoming ?? {}) };
    const stored = storedDecrypted ?? {};
    for (const key of getSensitiveConfigKeys(providerSlug)) {
      const value = merged[key];
      const isBlank =
        value === undefined ||
        value === null ||
        value === '' ||
        value === SECRET_MASK;
      if (isBlank && typeof stored[key] === 'string') {
        merged[key] = stored[key];
      }
    }
    return merged;
  }
}
