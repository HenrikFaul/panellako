import { sanitizeReturnTo } from './return-to';

export const MFA_STEP_UP_REQUIRED = 'MFA_STEP_UP_REQUIRED';

const MAX_ERROR_TEXT_LENGTH = 8_192;
const MAX_QR_SVG_LENGTH = 512_000;
const MFA_STEP_UP_TOKEN = /(?:^|[^A-Z0-9_])MFA_STEP_UP_REQUIRED(?:$|[^A-Z0-9_])/;
const MFA_ERROR_FIELDS = [
  'error_code',
  'code',
  'message',
  'details',
  'hint',
  'error',
  'data',
  'cause',
] as const;

const UNSAFE_SVG_CONTENT = /<(?:script|foreignObject|iframe|object|embed)\b|\bon[a-z]+\s*=|\b(?:href|xlink:href)\s*=|\burl\s*\(/i;

function findMfaStepUpCode(
  value: unknown,
  depth: number,
  visited: Set<object>,
): string | null {
  if (depth > 4 || value === null || value === undefined) return null;

  if (typeof value === 'string') {
    const text = value.trim();
    if (text === MFA_STEP_UP_REQUIRED) return MFA_STEP_UP_REQUIRED;
    if (text.length === 0 || text.length > MAX_ERROR_TEXT_LENGTH) return null;

    if (MFA_STEP_UP_TOKEN.test(text)) {
      try {
        return findMfaStepUpCode(JSON.parse(text), depth + 1, visited)
          ?? MFA_STEP_UP_REQUIRED;
      } catch {
        return MFA_STEP_UP_REQUIRED;
      }
    }

    return null;
  }

  if (typeof value !== 'object' || visited.has(value)) return null;
  visited.add(value);

  if (Array.isArray(value)) {
    for (const entry of value) {
      const match = findMfaStepUpCode(entry, depth + 1, visited);
      if (match) return match;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const field of MFA_ERROR_FIELDS) {
    const match = findMfaStepUpCode(record[field], depth + 1, visited);
    if (match) return match;
  }

  return null;
}

/**
 * Supabase/PostgREST can surface an RPC exception as JSON in `message`,
 * `details`, or a nested error object. This parser deliberately recognizes
 * only the explicit step-up code and never exposes raw database error text.
 */
export function isMfaStepUpRequired(error: unknown): boolean {
  return findMfaStepUpCode(error, 0, new Set<object>()) === MFA_STEP_UP_REQUIRED;
}

export function buildMfaStepUpHref(returnTo: string | null | undefined): string {
  const safeReturnTo = sanitizeReturnTo(returnTo);
  return `/account/security?next=${encodeURIComponent(safeReturnTo)}`;
}

export function normalizeTotpCode(value: string): string {
  return value.replace(/[\s-]/g, '');
}

export function isValidTotpCode(value: string): boolean {
  return /^\d{6}$/.test(normalizeTotpCode(value));
}

function decodeBase64(value: string): string | null {
  try {
    const binary = globalThis.atob(value);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function extractSvg(qrCode: string): string | null {
  const input = qrCode.trim();
  if (input.length === 0 || input.length > MAX_QR_SVG_LENGTH) return null;

  if (!input.toLowerCase().startsWith('data:')) return input;

  const separatorIndex = input.indexOf(',');
  if (separatorIndex < 0) return null;

  const metadata = input.slice(0, separatorIndex).toLowerCase();
  const payload = input.slice(separatorIndex + 1);
  const allowedMetadata = new Set([
    'data:image/svg+xml',
    'data:image/svg+xml;utf-8',
    'data:image/svg+xml;charset=utf-8',
    'data:image/svg+xml;base64',
  ]);

  if (!allowedMetadata.has(metadata)) return null;

  if (metadata.endsWith(';base64')) return decodeBase64(payload);

  try {
    return decodeURIComponent(payload);
  } catch {
    return null;
  }
}

/**
 * Converts Supabase's raw SVG or SVG data URL to a local, percent-encoded data
 * URL. It rejects active SVG constructs and never sends the TOTP secret to an
 * image service or another origin.
 */
export function toSafeMfaQrDataUrl(qrCode: string): string | null {
  const svg = extractSvg(qrCode)?.trim();
  if (!svg || svg.length > MAX_QR_SVG_LENGTH) return null;
  if (!/^(?:<\?xml[^>]*>\s*)?<svg(?:\s|>)/i.test(svg)) return null;
  if (UNSAFE_SVG_CONTENT.test(svg)) return null;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
