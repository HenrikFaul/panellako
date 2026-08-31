import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  loadControlCenterAuditPage,
  parseAuditPageParameters,
} from '@/lib/superadmin/control-center-server';
import { adminJson } from '@/lib/superadmin/http';
import { requirePlatformRead } from '@/lib/superadmin/operator-authority';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authority = await requirePlatformRead('platform.audit.read');
  if (!authority.ok) return adminJson({ error: authority.errorCode }, authority.status);

  const parameters = parseAuditPageParameters(request.nextUrl.searchParams);
  if (!parameters.ok) return adminJson({ error: 'Invalid request' }, 400);

  try {
    const result = await loadControlCenterAuditPage(
      createAdminClient(),
      parameters.limit,
      parameters.cursor,
    );
    if (!result.available) return adminJson({ error: 'Audit data unavailable' }, 503);
    return adminJson(result.data);
  } catch {
    return adminJson({ error: 'Audit data unavailable' }, 503);
  }
}
