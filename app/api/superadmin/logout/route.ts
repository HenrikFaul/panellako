import { NextRequest } from 'next/server';
import { clearSuperadminSession, getLegacySuperadminSession } from '@/lib/superadmin-auth';
import { adminJson, isSameOriginAdminRequest } from '@/lib/superadmin/http';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isSameOriginAdminRequest(request)) return adminJson({ error: 'ORIGIN_NOT_ALLOWED' }, 403);

  const legacySession = await getLegacySuperadminSession();
  let namedLogoutFailed = false;
  try {
    const { error } = await createClient().auth.signOut();
    namedLogoutFailed = Boolean(error);
  } catch {
    namedLogoutFailed = true;
  }
  await clearSuperadminSession();
  return namedLogoutFailed && !legacySession
    ? adminJson({ error: 'PLATFORM_LOGOUT_INCOMPLETE' }, 503)
    : adminJson({ ok: true });
}
