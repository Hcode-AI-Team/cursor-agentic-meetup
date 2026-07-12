import { BadRequestException } from '@nestjs/common';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('@hed-hog/api-locale', () => ({
  getLocaleText: (_key: string, _locale: string, fallback: string) => fallback,
}));

jest.mock('argon2', () => ({
  __esModule: true,
  hash: jest.fn(),
  verify: jest.fn(),
}));

import * as argon2 from 'argon2';
import { SecurityService } from './security.service';

const makeService = (env: Record<string, string | undefined> = {}) => {
  const configService = {
    get: jest.fn((key: string) => env[key]),
  };
  const service = new SecurityService(configService as any);
  return { service, configService };
};

describe('SecurityService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getValueWithPepper', () => {
    it('uses the explicit pepper when provided', () => {
      const { service, configService } = makeService();
      expect(service.getValueWithPepper('value', 'PEP')).toBe('valuePEP');
      expect(configService.get).not.toHaveBeenCalled();
    });

    it('falls back to the configured PEPPER', () => {
      const { service } = makeService({ PEPPER: 'secret-pepper' });
      expect(service.getValueWithPepper('value')).toBe('valuesecret-pepper');
    });
  });

  describe('getJwtSecret', () => {
    it('reads JWT_SECRET from config', () => {
      const { service } = makeService({ JWT_SECRET: 'jwt-secret' });
      expect(service.getJwtSecret()).toBe('jwt-secret');
    });
  });

  describe('hashSha256', () => {
    it('is deterministic and emits url-safe base64 without padding', () => {
      const { service } = makeService();
      const a = service.hashSha256('hello');
      const b = service.hashSha256('hello');
      const c = service.hashSha256('world');
      expect(a).toBe(b);
      expect(a).not.toBe(c);
      expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('hashWithPepper', () => {
    it('peppers the value before hashing', () => {
      const { service } = makeService({ PEPPER: 'p' });
      const expected = service.hashSha256('valuep');
      expect(service.hashWithPepper('value')).toBe(expected);
    });
  });

  describe('signHmacSha256 / verifyHmacSha256', () => {
    it('verifies a signature produced with the default JWT secret', () => {
      const { service } = makeService({ JWT_SECRET: 'jwt-secret' });
      const sig = service.signHmacSha256('payload');
      expect(service.verifyHmacSha256('payload', sig)).toBe(true);
    });

    it('rejects a tampered signature', () => {
      const { service } = makeService({ JWT_SECRET: 'jwt-secret' });
      const sig = service.signHmacSha256('payload');
      expect(service.verifyHmacSha256('other-payload', sig)).toBe(false);
    });

    it('rejects an empty signature without throwing', () => {
      const { service } = makeService({ JWT_SECRET: 'jwt-secret' });
      expect(service.verifyHmacSha256('payload', '')).toBe(false);
    });

    it('honors an explicit signing secret', () => {
      const { service } = makeService({ JWT_SECRET: 'jwt-secret' });
      const sig = service.signHmacSha256('payload', 'other-secret');
      expect(service.verifyHmacSha256('payload', sig, 'other-secret')).toBe(true);
      // wrong secret -> mismatch
      expect(service.verifyHmacSha256('payload', sig)).toBe(false);
    });

    it('returns false on a length mismatch instead of throwing', () => {
      const { service } = makeService({ JWT_SECRET: 'jwt-secret' });
      expect(service.verifyHmacSha256('payload', 'short')).toBe(false);
    });
  });

  describe('encrypt / decrypt', () => {
    it('round-trips using an explicit secret', () => {
      const { service } = makeService();
      const cipher = service.encrypt('super secret', 'the-key');
      expect(cipher.split(':')).toHaveLength(4);
      expect(service.decrypt(cipher, 'the-key')).toBe('super secret');
    });

    it('round-trips using the configured ENCRYPTION_SECRET', () => {
      const { service } = makeService({ ENCRYPTION_SECRET: 'env-key' });
      const cipher = service.encrypt('payload');
      expect(service.decrypt(cipher)).toBe('payload');
    });

    it('throws when no encryption secret is configured', () => {
      const { service } = makeService();
      expect(() => service.encrypt('payload')).toThrow(
        'ENCRYPTION_SECRET is not configured.',
      );
    });

    it('throws on a malformed ciphertext', () => {
      const { service } = makeService();
      expect(() => service.decrypt('not-valid', 'the-key')).toThrow(
        /Failed to decrypt value/,
      );
    });

    it('throws when decrypting with the wrong secret', () => {
      const { service } = makeService();
      const cipher = service.encrypt('payload', 'right-key');
      expect(() => service.decrypt(cipher, 'wrong-key')).toThrow(
        /Failed to decrypt value/,
      );
    });
  });

  describe('validatePassword', () => {
    it('returns true when one of the credentials verifies', async () => {
      const { service } = makeService({ PEPPER: 'p' });
      (argon2.verify as jest.Mock)
        .mockResolvedValueOnce(false as never)
        .mockResolvedValueOnce(true as never);

      const result = await service.validatePassword(
        'en',
        [{ hash: 'h1' }, { hash: 'h2' }],
        'pw',
      );

      expect(result).toBe(true);
      expect(argon2.verify).toHaveBeenCalledWith('h1', 'pwp');
    });

    it('returns false when no credential verifies', async () => {
      const { service } = makeService();
      (argon2.verify as jest.Mock).mockResolvedValue(false as never);

      const result = await service.validatePassword('en', [{ hash: 'h1' }], 'pw');

      expect(result).toBe(false);
    });

    it('throws BadRequestException when verification errors', async () => {
      const { service } = makeService();
      (argon2.verify as jest.Mock).mockRejectedValue(new Error('boom') as never);

      await expect(
        service.validatePassword('en', [{ hash: 'h1' }], 'pw'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyArgon2', () => {
    it('returns true when argon2 verifies', async () => {
      const { service } = makeService();
      (argon2.verify as jest.Mock).mockResolvedValue(true as never);
      await expect(service.verifyArgon2('v', 'hash')).resolves.toBe(true);
    });

    it('returns false when argon2 throws', async () => {
      const { service } = makeService();
      (argon2.verify as jest.Mock).mockRejectedValue(new Error('bad') as never);
      await expect(service.verifyArgon2('v', 'hash')).resolves.toBe(false);
    });
  });

  describe('hashArgon2', () => {
    it('hashes the peppered value', async () => {
      const { service } = makeService({ PEPPER: 'p' });
      (argon2.hash as jest.Mock).mockResolvedValue('hashed' as never);
      const result = await service.hashArgon2('value');
      expect(result).toBe('hashed');
      expect(argon2.hash).toHaveBeenCalledWith('valuep');
    });
  });

  describe('generateCode', () => {
    it('produces a numeric code of the requested length', () => {
      const { service } = makeService();
      const code = service.generateCode(8);
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[0-9]+$/);
    });

    it('defaults to length 6 when given a falsy length', () => {
      const { service } = makeService();
      expect(service.generateCode(0)).toHaveLength(6);
    });
  });

  describe('randomOpaque', () => {
    it('produces distinct url-safe tokens', () => {
      const { service } = makeService();
      const a = service.randomOpaque();
      const b = service.randomOpaque();
      expect(a).not.toBe(b);
      expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });
});
