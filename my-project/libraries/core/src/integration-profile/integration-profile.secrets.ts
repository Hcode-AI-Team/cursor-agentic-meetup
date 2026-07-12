/**
 * Mapa AUTORITATIVO das chaves sensíveis (segredos) por provider de integração.
 *
 * SEGURANÇA-CRÍTICO: este mapa é a fonte única de verdade do que é cifrado em repouso
 * (integration-credential-crypto.service) e mascarado na exportação/UI. Qualquer chave
 * esquecida aqui NÃO será cifrada. Deve ser mantido em sincronia com os campos
 * `type: 'password'` do form do admin (PROVIDER_FIELDS em
 * apps/admin/src/app/(app)/(libraries)/core/integration/profiles/page.tsx).
 *
 * Não usar heurística por nome de chave: campos públicos como `site_key`, `public_key` e
 * `access_key_id` contêm "key" mas NÃO são segredos.
 */
export const INTEGRATION_SECRET_KEYS: Record<string, string[]> = {
  // Email
  smtp: ['password'],
  gmail: ['client_secret', 'refresh_token'],
  ses: ['secret_access_key'],
  // Mensageria
  'evolution-api': ['token'],
  'whatsapp-official': ['access_token'],
  // Storage
  s3: ['secret_access_key'],
  gcs: ['key_file_json'],
  'azure-blob': ['key'],
  's3-compatible': ['secret_access_key'],
  // IA
  openai: ['api_key'],
  gemini: ['api_key'],
  claude: ['api_key'],
  // OAuth
  'google-oauth': ['client_secret'],
  'github-oauth': ['client_secret'],
  'microsoft-oauth': ['client_secret'],
  'facebook-oauth': ['client_secret'],
  'microsoft-entra-id-oauth': ['client_secret'],
  // Apple has no static client_secret — the private_key signs a short-lived JWT
  // client_secret at request time (see AppleProvider), so private_key is the secret.
  'apple-oauth': ['private_key'],
  'linkedin-oauth': ['client_secret'],
  // Pagamento
  stripe: ['secret_key', 'webhook_secret'],
  mercado_pago: ['access_token', 'webhook_secret'],
  // Captcha
  recaptcha: ['secret_key'],
  'cloudflare-turnstile': ['secret_key'],
  altcha: ['hmac_key'],
  // Infraestrutura (autoscaling)
  digitalocean: ['api_token'],
  kubernetes: ['token', 'ca_cert'],
};

/** Chaves sensíveis de um provider (vazio se desconhecido). */
export function getSensitiveConfigKeys(providerSlug: string): string[] {
  return INTEGRATION_SECRET_KEYS[providerSlug.toLowerCase()] ?? [];
}
