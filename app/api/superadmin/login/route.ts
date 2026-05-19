import { NextRequest, NextResponse } from 'next/server';
import { getSuperadminCreds, setSuperadminSession } from '@/lib/superadmin-auth';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json() as { email?: string; password?: string };
  const creds = getSuperadminCreds();

  if (email !== creds.email || password !== creds.password) {
    return NextResponse.json({ error: 'Hibás email vagy jelszó.' }, { status: 401 });
  }

  await setSuperadminSession(creds.email);
  return NextResponse.json({ ok: true });
}
