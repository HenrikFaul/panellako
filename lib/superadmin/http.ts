import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

export const PLATFORM_ADMIN_PRIVATE_CACHE = 'private, no-store';
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function adminJson(
  body: unknown,
  status = 200,
  headers?: HeadersInit,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': PLATFORM_ADMIN_PRIVATE_CACHE,
      ...headers,
    },
  });
}

export function isSameOriginAdminRequest(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    || request.headers.get('host')?.trim();
  const fetchSite = request.headers.get('sec-fetch-site');
  if (!origin || !host || (fetchSite && fetchSite !== 'same-origin')) return false;

  try {
    const parsed = new URL(origin);
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:')
      && !parsed.username
      && !parsed.password
      && parsed.host.toLowerCase() === host.toLowerCase()
    );
  } catch {
    return false;
  }
}

export function hasJsonContentType(request: NextRequest): boolean {
  return request.headers.get('content-type')?.toLowerCase().startsWith('application/json') === true;
}

export function normalizeAdminReason(
  value: unknown,
  minimumLength = 10,
  maximumLength = 1_000,
): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length >= minimumLength && normalized.length <= maximumLength
    ? normalized
    : null;
}
