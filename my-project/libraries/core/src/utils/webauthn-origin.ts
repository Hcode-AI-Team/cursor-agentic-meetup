function normalizeOrigin(value?: string | null): string | null {
  const trimmed = String(value ?? '').trim().replace(/\/+$/, '');
  if (!trimmed) return null;

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

function getAllowedOrigins(): string[] {
  return (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(/[\n,;]+/)
    .map((url) => normalizeOrigin(url))
    .filter((url): url is string => Boolean(url));
}

/**
 * WebAuthn binds a credential to the exact origin (scheme + host + port) used
 * during registration/authentication. With multiple frontends (e.g. admin on
 * :3200, training on :3001) sharing the same backend, the relying party origin
 * must follow the requesting browser, not a single hardcoded CORS entry.
 */
export function resolveWebAuthnOrigin(requestOrigin?: string | null): {
  rpID: string;
  expectedOrigin: string;
} {
  const allowedOrigins = getAllowedOrigins();
  const normalizedRequestOrigin = normalizeOrigin(requestOrigin);

  const expectedOrigin =
    (normalizedRequestOrigin && allowedOrigins.includes(normalizedRequestOrigin)
      ? normalizedRequestOrigin
      : allowedOrigins[0]) ?? 'http://localhost:3200';

  return { rpID: new URL(expectedOrigin).hostname, expectedOrigin };
}
