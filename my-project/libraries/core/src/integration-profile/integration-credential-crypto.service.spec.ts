import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const registerIntegrationConfigTransformer = jest.fn();

jest.mock('@hed-hog/api-prisma', () => ({
  registerIntegrationConfigTransformer: (...args: any[]) =>
    registerIntegrationConfigTransformer(...args),
}));

import {
  IntegrationCredentialCryptoService,
  ENC_ENVELOPE_PREFIX,
  SECRET_MASK,
} from './integration-credential-crypto.service';

// Cifra reversível determinística (hex) usada como stub do SecurityService.
const makeSecurity = () => ({
  encrypt: jest.fn((value: string) => Buffer.from(value, 'utf8').toString('hex')),
  decrypt: jest.fn((value: string) => Buffer.from(value, 'hex').toString('utf8')),
});

const makeService = (security = makeSecurity()) => {
  const service = new IntegrationCredentialCryptoService(security as any);
  return { service, security };
};

describe('IntegrationCredentialCryptoService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('registra o transformer de decifra transparente', () => {
      const { service } = makeService();
      service.onModuleInit();
      expect(registerIntegrationConfigTransformer).toHaveBeenCalledTimes(1);
      expect(registerIntegrationConfigTransformer).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it('o transformer registrado delega para decryptConfig', () => {
      const { service } = makeService();
      const spy = jest
        .spyOn(service, 'decryptConfig')
        .mockReturnValue({ ok: true } as any);
      service.onModuleInit();
      const transformer = registerIntegrationConfigTransformer.mock
        .calls[0][0] as (c: any) => any;
      const out = transformer({ some: 'config' });
      expect(spy).toHaveBeenCalledWith({ some: 'config' });
      expect(out).toEqual({ ok: true });
    });
  });

  describe('isEnveloped', () => {
    it('true apenas para strings com o prefixo do envelope', () => {
      const { service } = makeService();
      const isEnveloped = (v: unknown) => (service as any).isEnveloped(v);
      expect(isEnveloped(`${ENC_ENVELOPE_PREFIX}abc`)).toBe(true);
      expect(isEnveloped('abc')).toBe(false);
      expect(isEnveloped(123)).toBe(false);
      expect(isEnveloped(null)).toBe(false);
      expect(isEnveloped(undefined)).toBe(false);
      expect(isEnveloped({})).toBe(false);
    });
  });

  describe('encryptValue', () => {
    it('cifra um valor simples com o envelope', () => {
      const { service, security } = makeService();
      const out = service.encryptValue('hello');
      expect(out.startsWith(ENC_ENVELOPE_PREFIX)).toBe(true);
      expect(security.encrypt).toHaveBeenCalledWith('hello');
      expect(out).toBe(ENC_ENVELOPE_PREFIX + Buffer.from('hello').toString('hex'));
    });

    it('é idempotente: não recifra um valor já com envelope', () => {
      const { service, security } = makeService();
      const already = `${ENC_ENVELOPE_PREFIX}deadbeef`;
      expect(service.encryptValue(already)).toBe(already);
      expect(security.encrypt).not.toHaveBeenCalled();
    });
  });

  describe('decryptValue', () => {
    it('decifra um valor com envelope', () => {
      const { service, security } = makeService();
      const enveloped = ENC_ENVELOPE_PREFIX + Buffer.from('secret').toString('hex');
      expect(service.decryptValue(enveloped)).toBe('secret');
      expect(security.decrypt).toHaveBeenCalledWith(
        Buffer.from('secret').toString('hex'),
      );
    });

    it('passa valores sem envelope intactos (legado)', () => {
      const { service, security } = makeService();
      expect(service.decryptValue('plain-legacy')).toBe('plain-legacy');
      expect(service.decryptValue(42)).toBe(42);
      expect(service.decryptValue(null)).toBe(null);
      expect(security.decrypt).not.toHaveBeenCalled();
    });

    it('em erro de decifra loga e devolve o valor como veio (não derruba a query)', () => {
      const security = makeSecurity();
      security.decrypt.mockImplementation(() => {
        throw new Error('ENCRYPTION_SECRET trocado');
      });
      const { service } = makeService(security);
      const enveloped = `${ENC_ENVELOPE_PREFIX}whatever`;
      const errSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => undefined);
      expect(service.decryptValue(enveloped)).toBe(enveloped);
      expect(errSpy).toHaveBeenCalled();
    });
  });

  describe('round-trip', () => {
    it('encryptValue -> decryptValue devolve o valor original', () => {
      const { service } = makeService();
      const original = 'sk-live-1234567890';
      expect(service.decryptValue(service.encryptValue(original))).toBe(original);
    });
  });

  describe('encryptConfig', () => {
    it('cifra apenas as chaves sensíveis do provider', () => {
      const { service } = makeService();
      const out = service.encryptConfig('stripe', {
        secret_key: 'sk_test',
        webhook_secret: 'whsec',
        public_key: 'pk_test',
      }) as Record<string, string>;
      expect(out.secret_key.startsWith(ENC_ENVELOPE_PREFIX)).toBe(true);
      expect(out.webhook_secret.startsWith(ENC_ENVELOPE_PREFIX)).toBe(true);
      // Campo público não é tocado.
      expect(out.public_key).toBe('pk_test');
    });

    it('ignora valores vazios e não-string', () => {
      const { service } = makeService();
      const out = service.encryptConfig('smtp', {
        password: '',
      }) as Record<string, string>;
      expect(out.password).toBe('');
    });

    it('provider desconhecido retorna o config inalterado (mesma referência)', () => {
      const { service } = makeService();
      const config = { api_key: 'abc' };
      expect(service.encryptConfig('does-not-exist', config)).toBe(config);
    });

    it('é case-insensitive no slug do provider', () => {
      const { service } = makeService();
      const out = service.encryptConfig('OpenAI', {
        api_key: 'sk-abc',
      }) as Record<string, string>;
      expect(out.api_key.startsWith(ENC_ENVELOPE_PREFIX)).toBe(true);
    });

    it('config null/undefined passa intacto', () => {
      const { service } = makeService();
      expect(service.encryptConfig('stripe', null)).toBeNull();
      expect(service.encryptConfig('stripe', undefined)).toBeUndefined();
    });

    it('é idempotente sobre valores já cifrados', () => {
      const { service } = makeService();
      const once = service.encryptConfig('openai', { api_key: 'sk-abc' }) as any;
      const twice = service.encryptConfig('openai', once) as any;
      expect(twice.api_key).toBe(once.api_key);
    });
  });

  describe('decryptConfig', () => {
    it('decifra as chaves com envelope e devolve novo objeto', () => {
      const { service } = makeService();
      const encrypted = service.encryptConfig('openai', {
        api_key: 'sk-secret',
        base_url: 'https://api',
      }) as any;
      const decrypted = service.decryptConfig(encrypted) as Record<string, string>;
      expect(decrypted.api_key).toBe('sk-secret');
      expect(decrypted.base_url).toBe('https://api');
      expect(decrypted).not.toBe(encrypted);
    });

    it('retorna a mesma referência quando nada mudou', () => {
      const { service } = makeService();
      const config = { public: 'value', other: 1 };
      expect(service.decryptConfig(config)).toBe(config);
    });

    it('config null passa intacto', () => {
      const { service } = makeService();
      expect(service.decryptConfig(null)).toBeNull();
    });
  });

  describe('maskConfig', () => {
    it('mascara os segredos do provider com o placeholder padrão', () => {
      const { service } = makeService();
      const out = service.maskConfig('stripe', {
        secret_key: 'sk_test',
        public_key: 'pk_test',
      }) as Record<string, string>;
      expect(out.secret_key).toBe(SECRET_MASK);
      expect(out.public_key).toBe('pk_test');
    });

    it('aceita placeholder customizado e ignora vazios', () => {
      const { service } = makeService();
      const out = service.maskConfig(
        'stripe',
        { secret_key: 'sk', webhook_secret: '' },
        'REDACTED',
      ) as Record<string, string>;
      expect(out.secret_key).toBe('REDACTED');
      expect(out.webhook_secret).toBe('');
    });

    it('provider sem segredos retorna o config inalterado', () => {
      const { service } = makeService();
      const config = { foo: 'bar' };
      expect(service.maskConfig('unknown', config)).toBe(config);
    });

    it('config null passa intacto', () => {
      const { service } = makeService();
      expect(service.maskConfig('stripe', null)).toBeNull();
    });
  });

  describe('mergeKeepingStoredSecrets', () => {
    it('herda o segredo armazenado quando o recebido é o placeholder de máscara', () => {
      const { service } = makeService();
      const merged = service.mergeKeepingStoredSecrets(
        'stripe',
        { secret_key: SECRET_MASK, webhook_secret: SECRET_MASK },
        { secret_key: 'stored_sk', webhook_secret: 'stored_whsec' },
      ) as Record<string, string>;
      expect(merged.secret_key).toBe('stored_sk');
      expect(merged.webhook_secret).toBe('stored_whsec');
    });

    it('herda quando o recebido está vazio/undefined/null', () => {
      const { service } = makeService();
      const merged = service.mergeKeepingStoredSecrets(
        'mercado_pago',
        { access_token: '', webhook_secret: undefined },
        { access_token: 'stored_at', webhook_secret: 'stored_ws' },
      ) as Record<string, string>;
      expect(merged.access_token).toBe('stored_at');
      expect(merged.webhook_secret).toBe('stored_ws');
    });

    it('mantém o valor recebido quando o usuário informou um novo segredo', () => {
      const { service } = makeService();
      const merged = service.mergeKeepingStoredSecrets(
        'openai',
        { api_key: 'new-key' },
        { api_key: 'old-key' },
      ) as Record<string, string>;
      expect(merged.api_key).toBe('new-key');
    });

    it('não herda quando não há valor armazenado (mantém blank)', () => {
      const { service } = makeService();
      const merged = service.mergeKeepingStoredSecrets(
        'openai',
        { api_key: SECRET_MASK },
        {},
      ) as Record<string, string>;
      expect(merged.api_key).toBe(SECRET_MASK);
    });

    it('lida com incoming/stored ausentes sem quebrar', () => {
      const { service } = makeService();
      const merged = service.mergeKeepingStoredSecrets(
        'openai',
        null,
        null,
      ) as Record<string, string>;
      expect(merged).toEqual({});
    });
  });
});
