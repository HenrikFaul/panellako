import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { readBoundedJson, BoundedJsonError } from '@/lib/http/bounded-json';
import { MAP_THEME_IDS, type MapThemeId } from '@/lib/map-theme';
import {
  adminJson,
  hasJsonContentType,
  isSameOriginAdminRequest,
  normalizeAdminReason,
  UUID_PATTERN,
} from '@/lib/superadmin/http';
import {
  getDatabasePlatformPayloadDigest,
  hasPlatformCapability,
  platformAuthorityErrorCode,
  requirePlatformMutation,
  requirePlatformRead,
} from '@/lib/superadmin/operator-authority';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 8 * 1024;
const ALLOWED_SETTING_KEYS = ['map_theme', 'bkk_rate_limits'] as const;
type AllowedSettingKey = (typeof ALLOWED_SETTING_KEYS)[number];

interface BkkRateLimits {
  cell_delay_ms: number;
  retry_max: number;
  retry_wait_ms: number;
  cells_per_run: number;
}

function finiteInteger(value: unknown, minimum: number, maximum: number): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value < minimum || value > maximum) return null;
  return value;
}

function validateSetting(input: unknown): {
  key: AllowedSettingKey;
  value: Record<string, unknown>;
  reason: string;
  idempotencyKey: string;
} | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  if (Object.keys(record).some(key => !['key', 'value', 'reason', 'idempotencyKey'].includes(key))) return null;
  const reason = normalizeAdminReason(record.reason);
  const idempotencyKey = typeof record.idempotencyKey === 'string' ? record.idempotencyKey.trim().toLowerCase() : '';
  if (!reason || !UUID_PATTERN.test(idempotencyKey)) return null;
  if (record.key === 'map_theme') {
    if (!record.value || typeof record.value !== 'object' || Array.isArray(record.value)) return null;
    const id = (record.value as Record<string, unknown>).id;
    if (typeof id !== 'string' || !MAP_THEME_IDS.includes(id as MapThemeId)) return null;
    return { key: 'map_theme', value: { id }, reason, idempotencyKey };
  }

  if (record.key === 'bkk_rate_limits') {
    if (!record.value || typeof record.value !== 'object' || Array.isArray(record.value)) return null;
    const value = record.value as Record<string, unknown>;
    const normalized: BkkRateLimits = {
      cell_delay_ms: finiteInteger(value.cell_delay_ms, 1_000, 120_000) ?? -1,
      retry_max: finiteInteger(value.retry_max, 0, 10) ?? -1,
      retry_wait_ms: finiteInteger(value.retry_wait_ms, 1_000, 600_000) ?? -1,
      cells_per_run: finiteInteger(value.cells_per_run, 0, 3) ?? -1,
    };
    if (Object.values(normalized).some(item => item < 0)) return null;
    return { key: 'bkk_rate_limits', value: { ...normalized }, reason, idempotencyKey };
  }

  return null;
}

export async function GET() {
  const authority = await requirePlatformRead('platform.settings.read');
  const mayManage = hasPlatformCapability(authority.context, 'platform.settings.manage');
  if (!authority.ok && !mayManage) {
    return adminJson({ error: authority.errorCode }, authority.status);
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('platform_settings')
      .select('key, value, updated_at')
      .in('key', [...ALLOWED_SETTING_KEYS])
      .order('key');
    if (error) return adminJson({ error: 'SETTINGS_UNAVAILABLE' }, 503);
    return adminJson({ settings: data ?? [] });
  } catch {
    return adminJson({ error: 'SETTINGS_UNAVAILABLE' }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  const authority = await requirePlatformMutation('platform.settings.manage');
  if (!authority.ok) {
    return adminJson({
      error: authority.errorCode,
      ...(authority.stepUpHref ? { stepUpHref: authority.stepUpHref } : {}),
    }, authority.status);
  }
  if (!isSameOriginAdminRequest(request)) return adminJson({ error: 'ADMIN_SAME_ORIGIN_REQUIRED' }, 403);
  if (!hasJsonContentType(request)) return adminJson({ error: 'ADMIN_JSON_REQUIRED' }, 415);

  let body: unknown;
  try {
    body = await readBoundedJson(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof BoundedJsonError && error.code === 'REQUEST_TOO_LARGE') {
      return adminJson({ error: 'REQUEST_TOO_LARGE' }, 413);
    }
    return adminJson({ error: 'INVALID_JSON' }, 400);
  }

  const setting = validateSetting(body);
  if (!setting) return adminJson({ error: 'PLATFORM_SETTING_INPUT_INVALID' }, 400);

  try {
    const supabase = createClient();
    const digest = await getDatabasePlatformPayloadDigest(supabase, {
      key: setting.key,
      value: setting.value,
    });
    if (!digest.digest) {
      return adminJson({ error: digest.errorCode ?? 'PLATFORM_DIGEST_UNAVAILABLE' }, 503);
    }
    const { data, error } = await supabase.rpc('update_platform_setting', {
      p_key: setting.key,
      p_value: setting.value,
      p_reason: setting.reason,
      p_idempotency_key: setting.idempotencyKey,
      p_expected_payload_digest: digest.digest,
    });
    if (error) {
      const errorCode = platformAuthorityErrorCode(error, 'PLATFORM_SETTING_UPDATE_FAILED');
      const status = errorCode === 'MFA_STEP_UP_REQUIRED'
        ? 428
        : errorCode === 'PLATFORM_SETTING_NO_CHANGE' || errorCode === 'IDEMPOTENCY_PAYLOAD_MISMATCH' || errorCode === 'PLATFORM_PAYLOAD_DIGEST_MISMATCH'
          ? 409
          : errorCode === 'PLATFORM_SETTING_INPUT_INVALID'
            ? 400
            : errorCode === 'PLATFORM_OPERATOR_REQUIRED' || errorCode === 'PLATFORM_CAPABILITY_DENIED'
              ? 403
              : 503;
      return adminJson({
        error: errorCode,
        ...(errorCode === 'MFA_STEP_UP_REQUIRED'
          ? { stepUpHref: '/account/security?next=%2Fsuperadmin' }
          : {}),
      }, status);
    }
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.outcome !== 'updated' || data.key !== setting.key) {
      return adminJson({ error: 'PLATFORM_SETTING_UPDATE_FAILED' }, 502);
    }
    return adminJson({
      ok: true,
      key: setting.key,
      value: setting.value,
      replayed: data.replayed === true,
    });
  } catch {
    return adminJson({ error: 'PLATFORM_SETTING_UPDATE_FAILED' }, 503);
  }
}
