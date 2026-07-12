import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { resolveWebAuthnOrigin } from './webauthn-origin';

describe('resolveWebAuthnOrigin', () => {
  const originalEnv = process.env.CORS_ALLOWED_ORIGINS;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CORS_ALLOWED_ORIGINS;
    } else {
      process.env.CORS_ALLOWED_ORIGINS = originalEnv;
    }
  });

  it('usa fallback padrão quando não há origins configuradas', () => {
    delete process.env.CORS_ALLOWED_ORIGINS;
    const result = resolveWebAuthnOrigin();
    expect(result).toEqual({
      rpID: 'localhost',
      expectedOrigin: 'http://localhost:3200',
    });
  });

  it('retorna o request origin quando está na allowlist', () => {
    process.env.CORS_ALLOWED_ORIGINS =
      'https://admin.example.com,https://training.example.com';
    const result = resolveWebAuthnOrigin('https://training.example.com');
    expect(result).toEqual({
      rpID: 'training.example.com',
      expectedOrigin: 'https://training.example.com',
    });
  });

  it('normaliza trailing slash do request origin antes de comparar', () => {
    process.env.CORS_ALLOWED_ORIGINS = 'https://admin.example.com';
    const result = resolveWebAuthnOrigin('https://admin.example.com/');
    expect(result.expectedOrigin).toBe('https://admin.example.com');
  });

  it('cai para o primeiro origin permitido quando request origin não está na lista', () => {
    process.env.CORS_ALLOWED_ORIGINS =
      'https://first.example.com;https://second.example.com';
    const result = resolveWebAuthnOrigin('https://unknown.example.com');
    expect(result.expectedOrigin).toBe('https://first.example.com');
    expect(result.rpID).toBe('first.example.com');
  });

  it('cai para o primeiro origin permitido quando request origin é inválido', () => {
    process.env.CORS_ALLOWED_ORIGINS = 'https://first.example.com';
    const result = resolveWebAuthnOrigin('not-a-url');
    expect(result.expectedOrigin).toBe('https://first.example.com');
  });

  it('ignora entradas vazias/inválidas ao construir a allowlist', () => {
    process.env.CORS_ALLOWED_ORIGINS =
      '\n , ; not-a-url ; https://valid.example.com';
    const result = resolveWebAuthnOrigin('https://valid.example.com');
    expect(result.expectedOrigin).toBe('https://valid.example.com');
  });

  it('usa fallback quando request origin é null e allowlist vazia', () => {
    process.env.CORS_ALLOWED_ORIGINS = '';
    const result = resolveWebAuthnOrigin(null);
    expect(result.expectedOrigin).toBe('http://localhost:3200');
  });

  it('extrai o origin de uma URL com path e porta', () => {
    process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:3001/app/login';
    const result = resolveWebAuthnOrigin('http://localhost:3001');
    expect(result.expectedOrigin).toBe('http://localhost:3001');
    expect(result.rpID).toBe('localhost');
  });
});
