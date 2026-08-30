import { NextRequest, NextResponse } from 'next/server';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  loadControlCenterAuditPage,
  parseAuditPageParameters,
} from '@/lib/superadmin/control-center-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function json(body: object, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!(await isSuperadminAuthenticated())) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const parameters = parseAuditPageParameters(request.nextUrl.searchParams);
  if (!parameters.ok) return json({ error: 'Invalid request' }, 400);

  try {
    const result = await loadControlCenterAuditPage(
      createAdminClient(),
      parameters.limit,
      parameters.cursor,
    );
    if (!result.available) return json({ error: 'Audit data unavailable' }, 503);
    return json(result.data);
  } catch {
    return json({ error: 'Audit data unavailable' }, 503);
  }
}
