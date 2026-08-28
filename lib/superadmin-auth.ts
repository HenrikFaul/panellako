import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'pl_superadmin_session';
const SESSION_VERSION = 'v2';
const SESSION_TTL_SEC = 60 * 60; // 1h absolute session for the high-risk platform console
const CLOCK_SKEW_SEC = 60;

function getSecret(): string {
  const secret = process.env.SUPERADMIN_SESSION_SECRET;
  if (!secret?.trim()) {
    throw new Error('SUPERADMIN_SESSION_SECRET env var must be set');
  }
  return secret;
}

export function getSuperadminCreds() {
  // Validate the complete auth configuration together. Login must never run
  // with credentials configured but a missing, unrelated session secret.
  getSecret();
  const email    = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!email || !/^[^|\s@]+@[^|\s@]+\.[^|\s@]+$/.test(email) || !password) {
    throw new Error('SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD env vars must be set');
  }
  return { email, password };
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

function encodeSession(email: string, issuedAtSec: number, expSec: number): string {
  const payload = `${SESSION_VERSION}|${email}|${issuedAtSec}|${expSec}`;
  return `${payload}|${sign(payload)}`;
}

function decodeSession(raw: string): { email: string; issuedAtSec: number; expSec: number } | null {
  const parts = raw.split('|');
  if (parts.length !== 5) return null;
  const [version, rawEmail, issuedAtStr, expStr, sig] = parts;
  if (version !== SESSION_VERSION || !rawEmail || !issuedAtStr || !expStr || !sig) return null;
  if (!/^[0-9a-f]{64}$/i.test(sig)) return null;

  const email = rawEmail.trim().toLowerCase();
  const payload = `${version}|${rawEmail}|${issuedAtStr}|${expStr}`;
  const expectedSig = sign(payload);

  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expectedSig, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const issuedAtSec = Number(issuedAtStr);
  const expSec = Number(expStr);
  const nowSec = Math.floor(Date.now() / 1000);
  if (
    !Number.isSafeInteger(issuedAtSec) ||
    !Number.isSafeInteger(expSec) ||
    expSec - issuedAtSec !== SESSION_TTL_SEC ||
    issuedAtSec > nowSec + CLOCK_SKEW_SEC ||
    issuedAtSec < nowSec - SESSION_TTL_SEC - CLOCK_SKEW_SEC ||
    expSec <= nowSec
  ) {
    return null;
  }

  return { email, issuedAtSec, expSec };
}

export async function setSuperadminSession(email: string): Promise<void> {
  const configured = getSuperadminCreds();
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== configured.email) {
    throw new Error('Superadmin session actor does not match configuration');
  }

  const issuedAtSec = Math.floor(Date.now() / 1000);
  const expSec = issuedAtSec + SESSION_TTL_SEC;
  const token = encodeSession(configured.email, issuedAtSec, expSec);
  const store = await cookies();

  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SEC,
  });
}

export async function clearSuperadminSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
}

export async function isSuperadminAuthenticated(): Promise<boolean> {
  try {
    const configured = getSuperadminCreds();
    const store = await cookies();
    const raw = store.get(COOKIE_NAME)?.value;
    if (!raw) return false;
    const session = decodeSession(raw);
    return session !== null && session.email === configured.email;
  } catch {
    return false;
  }
}
