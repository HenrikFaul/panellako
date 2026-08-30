import { NextResponse } from 'next/server';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';
import { getControlCenterSnapshot } from '@/lib/superadmin/control-center-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function json(body: object, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function GET(): Promise<NextResponse> {
  if (!(await isSuperadminAuthenticated())) {
    return json({ error: 'Unauthorized' }, 401);
  }

  return json(await getControlCenterSnapshot());
}
