import { NextResponse } from 'next/server';
import { clearSuperadminSession } from '@/lib/superadmin-auth';

export async function POST() {
  await clearSuperadminSession();
  return NextResponse.json({ ok: true });
}
