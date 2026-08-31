import { NextRequest } from 'next/server';
import { readBoundedJson, BoundedJsonError } from '@/lib/http/bounded-json';
import {
  getPlatformAuthorityContext,
  platformAuthorityErrorCode,
} from '@/lib/superadmin/operator-authority';
import {
  adminJson,
  hasJsonContentType,
  isSameOriginAdminRequest,
  normalizeAdminReason,
} from '@/lib/superadmin/http';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 4 * 1024;

export async function GET() {
  const context = await getPlatformAuthorityContext();
  if (!context.authenticated) return adminJson({ error: 'AUTH_REQUIRED' }, 401);
  return adminJson({ context });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginAdminRequest(request)) return adminJson({ error: 'ORIGIN_NOT_ALLOWED' }, 403);
  if (!hasJsonContentType(request)) return adminJson({ error: 'UNSUPPORTED_MEDIA_TYPE' }, 415);

  const context = await getPlatformAuthorityContext();
  if (!context.authenticated) return adminJson({ error: 'AUTH_REQUIRED' }, 401);
  if (context.mode !== 'bootstrap' || !context.canBootstrap || !context.operatorProfileId) {
    return adminJson({ error: 'PLATFORM_BOOTSTRAP_NOT_ALLOWED' }, 403);
  }
  if (context.assuranceLevel !== 'aal2') {
    return adminJson({
      error: 'MFA_STEP_UP_REQUIRED',
      stepUpHref: '/account/security?next=%2Fsuperadmin',
    }, 428);
  }

  let body: unknown;
  try {
    body = await readBoundedJson(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof BoundedJsonError && error.code === 'REQUEST_TOO_LARGE') {
      return adminJson({ error: 'REQUEST_TOO_LARGE' }, 413);
    }
    return adminJson({ error: 'INVALID_JSON' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return adminJson({ error: 'INVALID_BOOTSTRAP_REQUEST' }, 400);
  }
  const record = body as Record<string, unknown>;
  if (Object.keys(record).some(key => key !== 'reason')) {
    return adminJson({ error: 'INVALID_BOOTSTRAP_REQUEST' }, 400);
  }
  const reason = normalizeAdminReason(record.reason, 10, 1_000);
  if (!reason) return adminJson({ error: 'BOOTSTRAP_REASON_REQUIRED' }, 400);

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('bootstrap_first_platform_operator', {
      p_profile_id: context.operatorProfileId,
      p_role_key: 'PLATFORM_ADMIN',
      p_reason: reason,
    });
    if (error) {
      return adminJson({ error: platformAuthorityErrorCode(error, 'PLATFORM_BOOTSTRAP_FAILED') }, 409);
    }
    return adminJson({ ok: true, result: data });
  } catch {
    return adminJson({ error: 'PLATFORM_AUTHORITY_UNAVAILABLE' }, 503);
  }
}
