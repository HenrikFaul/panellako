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
  getDatabasePlatformPayloadDigest,
  platformAuthorityErrorCode,
  requirePlatformMutation,
} from '@/lib/superadmin/operator-authority';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MAXIMUM_BODY_BYTES = 12 * 1024;
const OUTER_FIELDS = new Set(['patch', 'reason', 'idempotencyKey']);
const PATCH_FIELDS = new Set([
  'name',
  'description',
  'module',
  'route_path',
  'menu_path',
  'tier',
  'enabled',
  'sort_order',
]);
const MODULE_PATTERN = /^[a-z][a-z0-9_-]{0,99}$/;
const VALID_TIERS = new Set(['trial', 'alap', 'pro']);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function onlyAllowedKeys(value: UnknownRecord, keys: Set<string>): boolean {
  return Object.keys(value).every(key => keys.has(key));
}

function normalizeNullableText(value: unknown, maximum: number, requireSlash = false): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length > maximum || (requireSlash && !value.startsWith('/'))) {
    return undefined;
  }
  return value;
}

function normalizeFeaturePatch(value: unknown): UnknownRecord | null {
  if (!isRecord(value) || Object.keys(value).length === 0 || !onlyAllowedKeys(value, PATCH_FIELDS)) return null;
  const patch: UnknownRecord = {};

  if ('name' in value) {
    if (typeof value.name !== 'string') return null;
    const name = value.name.trim();
    if (name.length < 1 || name.length > 200) return null;
    patch.name = name;
  }
  if ('description' in value) {
    const description = normalizeNullableText(value.description, 500);
    if (description === undefined) return null;
    patch.description = description;
  }
  if ('module' in value) {
    if (typeof value.module !== 'string' || !MODULE_PATTERN.test(value.module)) return null;
    patch.module = value.module;
  }
  if ('route_path' in value) {
    const routePath = normalizeNullableText(value.route_path, 300, true);
    if (routePath === undefined) return null;
    patch.route_path = routePath;
  }
  if ('menu_path' in value) {
    const menuPath = normalizeNullableText(value.menu_path, 300);
    if (menuPath === undefined) return null;
    patch.menu_path = menuPath;
  }
  if ('tier' in value) {
    if (typeof value.tier !== 'string' || !VALID_TIERS.has(value.tier)) return null;
    patch.tier = value.tier;
  }
  if ('enabled' in value) {
    if (typeof value.enabled !== 'boolean') return null;
    patch.enabled = value.enabled;
  }
  if ('sort_order' in value) {
    if (
      typeof value.sort_order !== 'number'
      || !Number.isInteger(value.sort_order)
      || value.sort_order < -100_000
      || value.sort_order > 100_000
    ) return null;
    patch.sort_order = value.sort_order;
  }

  return patch;
}

function statusForError(errorCode: string): number {
  if (errorCode === 'AUTH_REQUIRED') return 401;
  if (errorCode === 'MFA_STEP_UP_REQUIRED') return 428;
  if (errorCode === 'PLATFORM_FEATURE_NOT_FOUND') return 404;
  if (
    errorCode === 'PLATFORM_FEATURE_NO_CHANGE'
    || errorCode === 'IDEMPOTENCY_PAYLOAD_MISMATCH'
    || errorCode === 'PLATFORM_PAYLOAD_DIGEST_MISMATCH'
  ) return 409;
  if (errorCode === 'PLATFORM_FEATURE_INPUT_INVALID' || errorCode === 'IDEMPOTENCY_KEY_REQUIRED') return 400;
  if (errorCode === 'PLATFORM_OPERATOR_REQUIRED' || errorCode === 'PLATFORM_CAPABILITY_DENIED') return 403;
  return 503;
}

function normalizeFeatureResult(data: unknown, featureId: string): UnknownRecord | null {
  if (!isRecord(data) || data.outcome !== 'updated' || data.feature_id !== featureId || !isRecord(data.feature)) {
    return null;
  }
  for (const field of PATCH_FIELDS) {
    if (!(field in data.feature)) return null;
  }
  return normalizeFeaturePatch(data.feature);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authority = await requirePlatformMutation('platform.features.manage');
  if (!authority.ok) {
    return adminJson({
      error: authority.errorCode,
      ...(authority.stepUpHref ? { stepUpHref: authority.stepUpHref } : {}),
    }, authority.status);
  }
  if (!isSameOriginAdminRequest(request)) return adminJson({ error: 'ADMIN_SAME_ORIGIN_REQUIRED' }, 403);
  if (!hasJsonContentType(request)) return adminJson({ error: 'ADMIN_JSON_REQUIRED' }, 415);

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return adminJson({ error: 'PLATFORM_FEATURE_ID_INVALID' }, 400);

  let body: unknown;
  try {
    body = await readBoundedJson(request, MAXIMUM_BODY_BYTES);
  } catch (error) {
    if (error instanceof BoundedJsonError) {
      return adminJson({ error: error.code }, error.code === 'REQUEST_TOO_LARGE' ? 413 : 400);
    }
    return adminJson({ error: 'INVALID_JSON' }, 400);
  }

  if (!isRecord(body) || !onlyAllowedKeys(body, OUTER_FIELDS)) {
    return adminJson({ error: 'PLATFORM_FEATURE_INPUT_INVALID' }, 400);
  }
  const patch = normalizeFeaturePatch(body.patch);
  const reason = normalizeAdminReason(body.reason);
  if (
    !patch
    || !reason
    || typeof body.idempotencyKey !== 'string'
    || !UUID_PATTERN.test(body.idempotencyKey)
  ) {
    return adminJson({ error: 'PLATFORM_FEATURE_INPUT_INVALID' }, 400);
  }

  try {
    const supabase = createClient();
    const digestResult = await getDatabasePlatformPayloadDigest(supabase, {
      feature_id: id,
      patch,
    });
    if (!digestResult.digest) {
      return adminJson({ error: digestResult.errorCode ?? 'PLATFORM_DIGEST_UNAVAILABLE' }, 503);
    }

    const { data, error } = await supabase.rpc('update_platform_feature', {
      p_feature_id: id,
      p_patch: patch,
      p_reason: reason,
      p_idempotency_key: body.idempotencyKey,
      p_expected_payload_digest: digestResult.digest,
    });
    if (error) {
      const errorCode = platformAuthorityErrorCode(error, 'PLATFORM_FEATURE_UPDATE_FAILED');
      return adminJson({
        error: errorCode,
        ...(errorCode === 'MFA_STEP_UP_REQUIRED'
          ? { stepUpHref: '/account/security?next=%2Fsuperadmin' }
          : {}),
      }, statusForError(errorCode));
    }

    const feature = normalizeFeatureResult(data, id);
    if (!feature) return adminJson({ error: 'PLATFORM_FEATURE_UPDATE_FAILED' }, 502);
    return adminJson({
      ok: true,
      outcome: 'updated',
      replayed: isRecord(data) && data.replayed === true,
      featureId: id,
      feature,
    });
  } catch {
    return adminJson({ error: 'PLATFORM_FEATURE_UPDATE_FAILED' }, 503);
  }
}
