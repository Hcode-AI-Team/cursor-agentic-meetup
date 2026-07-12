import { createHash, randomBytes, randomUUID } from 'crypto';
import * as Handlebars from 'handlebars';

export function createPublicUuid() {
  return randomUUID();
}

export function createPlainToken() {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function renderTemplate(source: unknown, context: Record<string, any>) {
  if (source === undefined || source === null) {
    return source;
  }

  if (typeof source === 'string') {
    return Handlebars.compile(source)(context);
  }

  if (Array.isArray(source)) {
    return source.map((item) => renderTemplate(item, context));
  }

  if (typeof source === 'object') {
    return Object.fromEntries(
      Object.entries(source as Record<string, unknown>).map(([key, value]) => [
        key,
        renderTemplate(value, context),
      ]),
    );
  }

  return source;
}

export function summarizePayload(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  try {
    const serialized = JSON.stringify(value);
    if (serialized.length <= 4000) {
      return value as any;
    }

    return {
      truncated: true,
      preview: serialized.slice(0, 4000),
    };
  } catch {
    return {
      unsupported: true,
    };
  }
}

const SENSITIVE_KEY_PATTERN =
  /(token|authorization|apikey|api_key|password|secret|credential|passwd)/i;

function maskString(value: string) {
  if (!value) {
    return value;
  }

  if (/^Bearer\s+/i.test(value)) {
    return 'Bearer [REDACTED]';
  }

  if (value.length <= 8) {
    return '[REDACTED]';
  }

  return `${value.slice(0, 3)}***${value.slice(-2)}`;
}

export function sanitizeSensitiveData(
  value: unknown,
  keyPath = '',
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      sanitizeSensitiveData(item, `${keyPath}[${index}]`),
    );
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => {
        const nextPath = keyPath ? `${keyPath}.${key}` : key;
        if (SENSITIVE_KEY_PATTERN.test(key)) {
          if (typeof child === 'string') {
            return [key, maskString(child)];
          }

          return [key, '[REDACTED]'];
        }

        return [key, sanitizeSensitiveData(child, nextPath)];
      }),
    );
  }

  if (typeof value === 'string' && SENSITIVE_KEY_PATTERN.test(keyPath)) {
    return maskString(value);
  }

  return value;
}

export function normalizeJsonObject(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    return JSON.parse(trimmed);
  }

  return value;
}

