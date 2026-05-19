import { NextResponse } from 'next/server';
import { clearSuperadminSession } from '@/lib/superadmin-auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  await clearSuperadminSession();
  return NextResponse.json({ ok: true });
}
