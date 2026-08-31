import { NextRequest } from 'next/server';
import { BoundedJsonError, readBoundedJson } from '@/lib/http/bounded-json';
import {
  adminJson,
  hasJsonContentType,
  isSameOriginAdminRequest,
  normalizeAdminReason,
  UUID_PATTERN,
} from '@/lib/superadmin/http';
import {
  platformAuthorityErrorCode,
  requirePlatformMutation,
} from '@/lib/superadmin/operator-authority';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MAXIMUM_BODY_BYTES = 12 * 1024;
const MINIMUM_TRIAL_DATE = Date.parse('2000-01-01T00:00:00.000Z');
const TRIAL_DATE_FUTURE_LIMIT_MS = 365 * 86_400_000;
const BODY_FIELDS = new Set([
  'free_trial_start',
  'free_trial_days',
  'free_trial_never_expires',
  'reason',
  'idempotencyKey',
]);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function onlyAllowedKeys(value: UnknownRecord, keys: Set<string>): boolean {
  return Object.keys(value).every(key => keys.has(key));
}

function canonicalTrialStart(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length > 48) return undefined;
  const timestamp = Date.parse(value);
  const latest = Date.now() + TRIAL_DATE_FUTURE_LIMIT_MS;
  if (!Number.isFinite(timestamp) || timestamp < MINIMUM_TRIAL_DATE || timestamp > latest) return undefined;
  return new Date(timestamp).toISOString();
}

function statusForError(errorCode: string): number {
  if (errorCode === 'AUTH_REQUIRED') return 401;
  if (errorCode === 'MFA_STEP_UP_REQUIRED') return 428;
  if (errorCode === 'PLATFORM_USER_NOT_FOUND') return 404;
  if (errorCode === 'PLATFORM_USER_TRIAL_NO_CHANGE' || errorCode === 'IDEMPOTENCY_PAYLOAD_MISMATCH') return 409;
  if (errorCode === 'PLATFORM_USER_TRIAL_INPUT_INVALID' || errorCode === 'IDEMPOTENCY_KEY_REQUIRED') return 400;
  if (errorCode === 'PLATFORM_OPERATOR_REQUIRED' || errorCode === 'PLATFORM_CAPABILITY_DENIED') return 403;
  return 503;
}

function normalizeTrialResult(data: unknown, profileId: string): UnknownRecord | null {
  if (!isRecord(data) || data.outcome !== 'updated' || data.profile_id !== profileId || !isRecord(data.trial)) {
    return null;
  }
  const trialStart = data.trial.free_trial_start === null
    ? null
    : canonicalTrialStart(data.trial.free_trial_start);
  if (
    trialStart === undefined
    || typeof data.trial.free_trial_days !== 'number'
    || !Number.isInteger(data.trial.free_trial_days)
    || data.trial.free_trial_days < 1
    || data.trial.free_trial_days > 3_650
    || typeof data.trial.free_trial_never_expires !== 'boolean'
  ) {
    return null;
  }
  return {
    free_trial_start: trialStart,
    free_trial_days: data.trial.free_trial_days,
    free_trial_never_expires: data.trial.free_trial_never_expires,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authority = await requirePlatformMutation('platform.users.manage_trial');
  if (!authority.ok) {
    return adminJson({
      error: authority.errorCode,
      ...(authority.stepUpHref ? { stepUpHref: authority.stepUpHref } : {}),
    }, authority.status);
  }
  if (!isSameOriginAdminRequest(request)) return adminJson({ error: 'ADMIN_SAME_ORIGIN_REQUIRED' }, 403);
  if (!hasJsonContentType(request)) return adminJson({ error: 'ADMIN_JSON_REQUIRED' }, 415);

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return adminJson({ error: 'PLATFORM_USER_ID_INVALID' }, 400);

  let body: unknown;
  try {
    body = await readBoundedJson(request, MAXIMUM_BODY_BYTES);
  } catch (error) {
    if (error instanceof BoundedJsonError) {
      return adminJson({ error: error.code }, error.code === 'REQUEST_TOO_LARGE' ? 413 : 400);
    }
    return adminJson({ error: 'INVALID_JSON' }, 400);
  }

  if (!isRecord(body) || !onlyAllowedKeys(body, BODY_FIELDS)) {
    return adminJson({ error: 'PLATFORM_USER_TRIAL_INPUT_INVALID' }, 400);
  }
  const trialStart = canonicalTrialStart(body.free_trial_start);
  const reason = normalizeAdminReason(body.reason);
  if (
    trialStart === undefined
    || typeof body.free_trial_days !== 'number'
    || !Number.isInteger(body.free_trial_days)
    || body.free_trial_days < 1
    || body.free_trial_days > 3_650
    || typeof body.free_trial_never_expires !== 'boolean'
    || !reason
    || typeof body.idempotencyKey !== 'string'
    || !UUID_PATTERN.test(body.idempotencyKey)
  ) {
    return adminJson({ error: 'PLATFORM_USER_TRIAL_INPUT_INVALID' }, 400);
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('update_platform_user_trial', {
      p_profile_id: id,
      p_free_trial_start: trialStart,
      p_free_trial_days: body.free_trial_days,
      p_free_trial_never_expires: body.free_trial_never_expires,
      p_reason: reason,
      p_idempotency_key: body.idempotencyKey,
    });
    if (error) {
      const errorCode = platformAuthorityErrorCode(error, 'PLATFORM_USER_TRIAL_UPDATE_FAILED');
      return adminJson({
        error: errorCode,
        ...(errorCode === 'MFA_STEP_UP_REQUIRED'
          ? { stepUpHref: '/account/security?next=%2Fsuperadmin' }
          : {}),
      }, statusForError(errorCode));
    }

    const trial = normalizeTrialResult(data, id);
    if (!trial) return adminJson({ error: 'PLATFORM_USER_TRIAL_UPDATE_FAILED' }, 502);
    return adminJson({
      ok: true,
      outcome: 'updated',
      replayed: isRecord(data) && data.replayed === true,
      profileId: id,
      trial,
    });
  } catch {
    return adminJson({ error: 'PLATFORM_USER_TRIAL_UPDATE_FAILED' }, 503);
  }
}
