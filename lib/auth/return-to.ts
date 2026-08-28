const DEFAULT_RETURN_TO = '/app';
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const ENCODED_PATH_SEPARATOR_OR_CONTROL = /%(?:0[0-9a-f]|1[0-9a-f]|7f|2f|5c)/i;

function normalizeSafeRelativePath(value: string): string | null {
  if (
    value.length === 0 ||
    value.length > 2048 ||
    value !== value.trim() ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    CONTROL_CHARACTERS.test(value) ||
    ENCODED_PATH_SEPARATOR_OR_CONTROL.test(value)
  ) {
    return null;
  }

  try {
    const base = new URL('https://panellako.invalid');
    const parsed = new URL(value, base);

    if (parsed.origin !== base.origin || parsed.username || parsed.password) {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

/**
 * Accepts only same-origin, root-relative application destinations.
 *
 * The result is safe to combine with a trusted origin for an auth redirect.
 * Absolute URLs, protocol-relative URLs, backslashes and encoded path
 * separators/control characters fail closed to the supplied safe fallback.
 */
export function sanitizeReturnTo(
  value: string | null | undefined,
  fallback = DEFAULT_RETURN_TO,
): string {
  const safeFallback = normalizeSafeRelativePath(fallback) ?? DEFAULT_RETURN_TO;

  if (typeof value !== 'string') {
    return safeFallback;
  }

  return normalizeSafeRelativePath(value) ?? safeFallback;
}
