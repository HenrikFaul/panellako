import 'server-only';

import { createHash } from 'node:crypto';

const MAX_DEPTH = 12;
const MAX_ARRAY_ITEMS = 2_000;
const MAX_OBJECT_KEYS = 2_000;
const MAX_STRING_LENGTH = 200_000;

function canonicalize(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) throw new Error('ADMIN_PAYLOAD_TOO_DEEP');

  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) throw new Error('ADMIN_PAYLOAD_TOO_LARGE');
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('ADMIN_PAYLOAD_INVALID_NUMBER');
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) throw new Error('ADMIN_PAYLOAD_TOO_LARGE');
    return value.map(item => canonicalize(item, depth + 1));
  }
  if (typeof value !== 'object') throw new Error('ADMIN_PAYLOAD_INVALID_TYPE');

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > MAX_OBJECT_KEYS) throw new Error('ADMIN_PAYLOAD_TOO_LARGE');
  entries.sort(([left], [right]) => left.localeCompare(right, 'en'));

  const result: Record<string, unknown> = {};
  for (const [key, nested] of entries) {
    if (!key || key.length > 160 || nested === undefined) {
      throw new Error('ADMIN_PAYLOAD_INVALID_KEY');
    }
    result[key] = canonicalize(nested, depth + 1);
  }
  return result;
}

export function canonicalAdminPayload(value: unknown): string {
  return JSON.stringify(canonicalize(value, 0));
}

export function adminPayloadDigest(value: unknown): string {
  return `sha256:${createHash('sha256').update(canonicalAdminPayload(value), 'utf8').digest('hex')}`;
}

export function isSha256Digest(value: unknown): value is string {
  return typeof value === 'string' && /^sha256:[0-9a-f]{64}$/.test(value);
}
