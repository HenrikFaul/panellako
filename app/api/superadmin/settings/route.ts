import { NextRequest, NextResponse } from 'next/server';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { readBoundedJson, BoundedJsonError } from '@/lib/http/bounded-json';
import { MAP_THEME_IDS, type MapThemeId } from '@/lib/map-theme';

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

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host')?.trim()
    || request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const fetchSite = request.headers.get('sec-fetch-site');
  if (!origin || !host || (fetchSite && fetchSite !== 'same-origin')) return false;

  try {
    const parsed = new URL(origin);
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:')
      && !parsed.username
      && !parsed.password
      && parsed.host.toLowerCase() === host.toLowerCase()
    );
  } catch {
    return false;
  }
}

function finiteInteger(value: unknown, minimum: number, maximum: number): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value < minimum || value > maximum) return null;
  return value;
}

function validateSetting(input: unknown): { key: AllowedSettingKey; value: unknown } | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  if (record.key === 'map_theme') {
    if (!record.value || typeof record.value !== 'object' || Array.isArray(record.value)) return null;
    const id = (record.value as Record<string, unknown>).id;
    if (typeof id !== 'string' || !MAP_THEME_IDS.includes(id as MapThemeId)) return null;
    return { key: 'map_theme', value: { id } };
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
    return { key: 'bkk_rate_limits', value: normalized };
  }

  return null;
}

export async function GET() {
  if (!(await isSuperadminAuthenticated())) {
    return json({ error: 'UNAUTHORIZED' }, 401);
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('platform_settings')
      .select('key, value, updated_at')
      .in('key', [...ALLOWED_SETTING_KEYS])
      .order('key');
    if (error) return json({ error: 'SETTINGS_UNAVAILABLE' }, 503);
    return json({ settings: data ?? [] });
  } catch {
    return json({ error: 'SETTINGS_UNAVAILABLE' }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await isSuperadminAuthenticated())) {
    return json({ error: 'UNAUTHORIZED' }, 401);
  }
  if (!isSameOrigin(request)) {
    return json({ error: 'ORIGIN_NOT_ALLOWED' }, 403);
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'UNSUPPORTED_MEDIA_TYPE' }, 415);
  }

  let body: unknown;
  try {
    body = await readBoundedJson(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof BoundedJsonError && error.code === 'REQUEST_TOO_LARGE') {
      return json({ error: 'REQUEST_TOO_LARGE' }, 413);
    }
    return json({ error: 'INVALID_JSON' }, 400);
  }

  const setting = validateSetting(body);
  if (!setting) return json({ error: 'INVALID_SETTING' }, 400);

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return json({ error: 'SETTINGS_UNAVAILABLE' }, 503);
  }

  const { data: before, error: beforeError } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', setting.key)
    .maybeSingle();
  if (beforeError) return json({ error: 'SETTINGS_UNAVAILABLE' }, 503);

  const updatedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('platform_settings')
    .upsert({ key: setting.key, value: setting.value, updated_at: updatedAt });
  if (updateError) return json({ error: 'SETTING_UPDATE_FAILED' }, 500);

  const actor = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase() || 'superadmin';
  const { error: auditError } = await supabase.from('platform_audit_events').insert({
    actor_id: actor,
    action: 'superadmin.setting.update',
    target_type: 'platform_setting',
    target_id: setting.key,
    payload: { before: before?.value ?? null, after: setting.value },
  });

  if (auditError) {
    let rollbackError: unknown = null;
    if (before) {
      const rollback = await supabase.from('platform_settings').upsert({
        key: setting.key,
        value: before.value,
        updated_at: updatedAt,
      });
      rollbackError = rollback.error;
    } else {
      const rollback = await supabase.from('platform_settings').delete().eq('key', setting.key);
      rollbackError = rollback.error;
    }
    if (rollbackError) console.error('[platform-admin] setting rollback failed', { key: setting.key });
    return json({ error: 'SETTING_AUDIT_FAILED' }, 500);
  }

  return json({ ok: true, key: setting.key });
}
