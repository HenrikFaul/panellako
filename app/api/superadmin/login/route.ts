import { createHash, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSuperadminCreds, setSuperadminSession } from '@/lib/superadmin-auth';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 8 * 1024;
const LOGIN_RATE_LIMIT = 5;
const LOGIN_RATE_WINDOW_MS = 15 * 60_000;

interface RateEntry {
  count: number;
  resetAt: number;
}

const loginRateLimits = new Map<string, RateEntry>();

function json(body: Record<string, unknown>, status = 200, headers?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, private',
      ...headers,
    },
  });
}

function requestKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
}

function consumeLoginRateLimit(key: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const current = loginRateLimits.get(key);

  if (!current || current.resetAt <= now) {
    loginRateLimits.set(key, { count: 1, resetAt: now + LOGIN_RATE_WINDOW_MS });
  } else if (current.count >= LOGIN_RATE_LIMIT) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  } else {
    current.count += 1;
  }

  if (loginRateLimits.size > 500) {
    for (const [entryKey, entry] of loginRateLimits) {
      if (entry.resetAt <= now) loginRateLimits.delete(entryKey);
    }
  }

  return { allowed: true, retryAfter: 0 };
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host')?.trim()
    || request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const fetchSite = request.headers.get('sec-fetch-site');
  if (!origin || !host || (fetchSite && fetchSite !== 'same-origin')) return false;

  try {
    const parsed = new URL(origin);
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      !parsed.username &&
      !parsed.password &&
      parsed.host.toLowerCase() === host.toLowerCase()
    );
  } catch {
    return false;
  }
}

async function readBoundedBody(request: NextRequest): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function safeStringEqual(left: string, right: string): boolean {
  const leftDigest = createHash('sha256').update(left, 'utf8').digest();
  const rightDigest = createHash('sha256').update(right, 'utf8').digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return json({ error: 'A kérés nem engedélyezett.' }, 403);
  }

  const key = requestKey(request);
  const rate = consumeLoginRateLimit(key);
  if (!rate.allowed) {
    return json(
      { error: 'Túl sok bejelentkezési kísérlet. Próbáld újra később.' },
      429,
      { 'Retry-After': String(rate.retryAfter) },
    );
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: 'A kérés túl nagy.' }, 413);
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'Érvénytelen kérés.' }, 415);
  }

  let rawBody: string | null;
  try {
    rawBody = await readBoundedBody(request);
  } catch {
    return json({ error: 'Érvénytelen kérés.' }, 400);
  }
  if (rawBody === null) {
    return json({ error: 'A kérés túl nagy.' }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Érvénytelen kérés.' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'Érvénytelen kérés.' }, 400);
  }

  const raw = body as Record<string, unknown>;
  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  const password = typeof raw.password === 'string' ? raw.password : '';
  if (!email || email.length > 320 || !password || password.length > 1024) {
    return json({ error: 'Hibás email vagy jelszó.' }, 401);
  }

  let creds: ReturnType<typeof getSuperadminCreds>;
  try {
    creds = getSuperadminCreds();
  } catch {
    return json({ error: 'A superadmin belépés nincs megfelelően konfigurálva.' }, 503);
  }

  if (!safeStringEqual(email, creds.email) || !safeStringEqual(password, creds.password)) {
    return json({ error: 'Hibás email vagy jelszó.' }, 401);
  }

  try {
    await setSuperadminSession(creds.email);
  } catch {
    return json({ error: 'A superadmin belépés nincs megfelelően konfigurálva.' }, 503);
  }

  loginRateLimits.delete(key);
  return json({ ok: true });
}
