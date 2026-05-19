import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'pl_superadmin_session';
const SESSION_TTL_SEC = 60 * 60 * 8; // 8h

function getSecret(): string {
  return process.env.SUPERADMIN_SESSION_SECRET || process.env.CRON_SECRET || 'panellako-superadmin-fallback-secret';
}

export function getSuperadminCreds() {
  return {
    email: process.env.SUPERADMIN_EMAIL ?? 'superadmin@panellako.hu',
    password: process.env.SUPERADMIN_PASSWORD ?? 'panellakosuperadmin11#',
  };
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

function encodeSession(email: string, expSec: number): string {
  const payload = `${email}|${expSec}`;
  return `${payload}|${sign(payload)}`;
}

function decodeSession(raw: string): { email: string; expSec: number } | null {
  const [email, expStr, sig] = raw.split('|');
  if (!email || !expStr || !sig) return null;

  const payload = `${email}|${expStr}`;
  const expectedSig = sign(payload);

  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const expSec = Number(expStr);
  if (!Number.isFinite(expSec) || expSec < Math.floor(Date.now() / 1000)) return null;

  return { email, expSec };
}

export async function setSuperadminSession(email: string): Promise<void> {
  const expSec = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const token = encodeSession(email, expSec);
  const store = await cookies();

  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SEC,
  });
}

export async function clearSuperadminSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
}

export async function isSuperadminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return false;
  return decodeSession(raw) !== null;
}
