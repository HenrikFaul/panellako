/**
 * POST /api/superadmin/apply-migrations
 *
 * Checks whether each migration is already applied, then tries to apply any
 * that are missing.  "Already applied" counts as success — so clicking the
 * button after manually running the SQL in the Supabase dashboard shows ✓.
 *
 * Apply methods tried in order:
 *   1. supabase.rpc('exec_sql', { sql })  — works if the helper function exists
 *   2. POST supabaseUrl/pg/query          — available on some Supabase plans
 *
 * Raw SQL and provider errors are deliberately never returned to the browser.
 */
import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createAuthenticatedClient } from '@/lib/supabase/server';
import { BoundedJsonError, readBoundedJson } from '@/lib/http/bounded-json';
import { normalizeAdminReason } from '@/lib/superadmin/http';
import {
  getDatabasePlatformPayloadDigest,
  platformAuthorityErrorCode,
  requirePlatformMutation,
} from '@/lib/superadmin/operator-authority';
import {
  PLATFORM_JOB_COMMAND_CONTRACT_VERSION,
  PLATFORM_JOB_COMMAND_SQL,
} from '@/lib/superadmin/platform-job-command-sql';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const APPLY_CONFIRMATION = 'APPLY_PENDING_MIGRATIONS';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLATFORM_MUTATION_TARGET = 'platform:mutations';
const MIGRATION_LEASE_SECONDS = 15 * 60;
const MIGRATION_APPROVAL_TTL = '10 minutes';
const MIGRATION_HEAD = '20260830140000_platform_operator_authority';

function json(body: object, status = 200): NextResponse {
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

// ─── Migration definitions ────────────────────────────────────────────────────

const MIGRATIONS: Array<{ name: string; sql: string }> = [
  {
    name: 'map_theme_default',
    sql: `
INSERT INTO public.platform_settings (key, value)
VALUES ('map_theme', '{"id": "dark"}')
ON CONFLICT (key) DO NOTHING;
    `.trim(),
  },
  {
    name: 'user_reference_addresses',
    sql: `
create table if not exists public.user_reference_addresses (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  lat          double precision not null,
  lon          double precision not null,
  street       text,
  house_number text,
  city         text,
  district     text,
  postcode     text,
  floor        text,
  door         text,
  source       text not null default 'nominatim',
  updated_at   timestamptz not null default now()
);

alter table public.user_reference_addresses enable row level security;

drop policy if exists "Users can read own reference address"   on public.user_reference_addresses;
create policy "Users can read own reference address"
  on public.user_reference_addresses for select using (auth.uid() = user_id);

drop policy if exists "Users can upsert own reference address" on public.user_reference_addresses;
create policy "Users can upsert own reference address"
  on public.user_reference_addresses for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own reference address" on public.user_reference_addresses;
create policy "Users can update own reference address"
  on public.user_reference_addresses for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
    `.trim(),
  },
  {
    name: 'osm_addresses',
    sql: `
create table if not exists public.osm_addresses (
  id                     bigserial primary key,
  external_id            text,
  country                text,
  country_code           text,
  display_name           text,
  name                   text,
  street                 text,
  street_name            text,
  street_type            text,
  street_type_normalized text,
  house_number           text,
  housenumber            text,
  house_number_suffix    text,
  conscriptionnumber     text,
  city                   text,
  town                   text,
  village                text,
  municipality           text,
  district               text,
  suburb                 text,
  neighbourhood          text,
  hamlet                 text,
  postcode               text,
  place                  text,
  lat                    double precision,
  lon                    double precision,
  geometry_type          text,
  created_at             timestamptz default now()
);

create unique index if not exists osm_addresses_external_id_unique
  on public.osm_addresses (external_id)
  where external_id is not null;

create index if not exists osm_addresses_city_idx         on public.osm_addresses (lower(city));
create index if not exists osm_addresses_postcode_idx     on public.osm_addresses (postcode);
create index if not exists osm_addresses_country_code_idx on public.osm_addresses (country_code);

alter table public.osm_addresses enable row level security;

drop policy if exists "osm_addresses_public_read" on public.osm_addresses;
create policy "osm_addresses_public_read"
  on public.osm_addresses for select
  using (true);
    `.trim(),
  },
  {
    name: 'osm_addresses_unique_index',
    sql: `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class index_class
    JOIN pg_index index_meta ON index_meta.indexrelid = index_class.oid
    JOIN pg_namespace namespace_meta ON namespace_meta.oid = index_class.relnamespace
    WHERE namespace_meta.nspname = 'public'
      AND index_class.relname = 'osm_addresses_external_id_unique'
      AND index_meta.indpred IS NOT NULL
  ) THEN
    DROP INDEX public.osm_addresses_external_id_unique;
  END IF;
END
$$;
CREATE UNIQUE INDEX IF NOT EXISTS osm_addresses_external_id_unique ON public.osm_addresses (external_id);
    `.trim(),
  },
  {
    name: 'platform_audit_events',
    sql: `
CREATE TABLE IF NOT EXISTS public.platform_audit_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    text,
  action      text NOT NULL,
  target_type text,
  target_id   text,
  payload     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_audit_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS platform_audit_events_created_at_idx ON public.platform_audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS platform_audit_events_action_idx     ON public.platform_audit_events (action);
    `.trim(),
  },
  {
    name: 'platform_job_commands',
    sql: PLATFORM_JOB_COMMAND_SQL,
  },
  {
    name: 'profiles_trial_columns',
    sql: `
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_trial_start         timestamptz,
  ADD COLUMN IF NOT EXISTS free_trial_days          integer NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS free_trial_never_expires boolean NOT NULL DEFAULT false;
    `.trim(),
  },
  {
    name: 'features_table',
    sql: `
CREATE TABLE IF NOT EXISTS public.features (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  name        text NOT NULL,
  description text,
  module      text NOT NULL DEFAULT 'general',
  route_path  text,
  menu_path   text,
  tier        text NOT NULL DEFAULT 'alap',
  enabled     boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS features_module_idx ON public.features (module);
CREATE INDEX IF NOT EXISTS features_tier_idx   ON public.features (tier);
    `.trim(),
  },
  {
    name: 'resolved_at_lifecycle',
    sql: `
ALTER TABLE public.illegal_dump_reports
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
    `.trim(),
  },
  {
    name: 'features_seed',
    sql: `
INSERT INTO public.features (feature_key, name, description, module, route_path, menu_path, tier, sort_order) VALUES
  ('issue_report',       'Digitális hibabejelentés (korlátlan)', 'Hibabejelentések rögzítése és kezelése',     'issues',     '/w/:id/issues',              'Hibabejelentések',           'alap', 10),
  ('documents',          'Dokumentumtár + visszaigazolás',       'Dokumentumok feltöltése és visszaigazolása', 'documents',  '/w/:id/documents',           'Dokumentumok',               'alap', 20),
  ('meter_reading',      'Mérőóra-diktálás',                     'Mérőóra állásának rögzítése',                'meters',     '/w/:id/meters',              'Mérőórák',                   'alap', 30),
  ('notifications',      'Értesítések (app + push)',             'Push értesítések kezelése',                  'notify',     '/w/:id/notifications',       'Értesítések',                'alap', 40),
  ('assembly_calendar',  'Közgyűlési naptár',                    'Közgyűlések tervezése és nyilvántartása',    'assembly',   '/w/:id/assembly',            'Közgyűlés',                  'alap', 50),
  ('haus_radar',         'Ház Radar műszerfal',                  'Épület-adatok összesítő nézete',             'dashboard',  '/w/:id',                     'Dashboard',                  'alap', 60),
  ('finance_basic',      'Alapszintű pénzügyi átláthatóság',     'Pénzügyi áttekintő nézet',                  'finance',    '/w/:id/financials',          'Pénzügyek',                  'alap', 70),
  ('noise_reporter',     'Zajriporter',                          'Zajszennyezés mérése és riportálása',        'noise',      '/w/:id/zaj',                 'Zajriporter',                'alap', 80),
  ('transit',            'Közlekedés',                           'Tömegközlekedési információk',               'transit',    '/w/:id/kozlekedes',          'Közlekedés',                 'alap', 90),
  ('documents_unlimited','Korlátlan dokumentumfeltöltés (50 MB)','Nagy fájlok feltöltése',                     'documents',  '/w/:id/documents',           'Dokumentumok',               'pro',  25),
  ('accountant_access',  'Könyvelő hozzáférés',                  'Könyvelői szerepkör hozzáadása',             'settings',   '/w/:id/settings/users',      'Beállítások > Felhasználók', 'pro',  35),
  ('ai_issue_triage',    'AI hibabejelentés-triázs',             'Mesterséges intelligencia alapú priorizálás','issues',     '/w/:id/issues',              'Hibabejelentések',           'pro',  45),
  ('email_notifications','E-mail értesítések lakóknak',          'E-mail küldés az épület lakóinak',           'notify',     '/w/:id/notifications',       'Értesítések',                'pro',  55),
  ('finance_arrears',    'Pénzügyi hátralék-riport',             'Fizetési hátralék nyilvántartása',           'finance',    '/w/:id/financials/arrears',  'Pénzügyek > Hátralék',       'pro',  75),
  ('assembly_protocol',  'Közgyűlési protokoll generator',       'Közgyűlési protokoll automatikus generálása','assembly',   '/w/:id/assembly/protocol',   'Közgyűlés > Protokoll',      'pro',  85),
  ('supplier_db',        'Szállítói adatbázis',                  'Szállítók és megbízottak nyilvántartása',    'suppliers',  '/w/:id/suppliers',           'Szállítók',                  'pro',  95),
  ('priority_support',   'Prioritásos ügyfélszolgálat',          'Elsőbbségi ügyfélszolgálati hozzáférés',     'support',    NULL,                         'Támogatás',                  'pro', 100)
ON CONFLICT (feature_key) DO NOTHING;
    `.trim(),
  },
];

function migrationApprovalPayload(reason: string) {
  return {
    confirmation: APPLY_CONFIRMATION,
    migration_head: MIGRATION_HEAD,
    migration_names: MIGRATIONS.map(migration => migration.name),
    migration_sql_sha256: Object.fromEntries(MIGRATIONS.map(migration => [
      migration.name,
      `sha256:${createHash('sha256').update(migration.sql, 'utf8').digest('hex')}`,
    ])),
    reason,
  };
}

function migrationAuthorityStatus(errorCode: string): number {
  if (errorCode === 'AUTH_REQUIRED') return 401;
  if (errorCode === 'MFA_STEP_UP_REQUIRED') return 428;
  if (errorCode.includes('NOT_FOUND')) return 404;
  if (errorCode.includes('DENIED') || errorCode.includes('FORBIDDEN') || errorCode.includes('MISMATCH')) return 403;
  if (errorCode.includes('INVALID') || errorCode.includes('DIGEST')) return 400;
  if (errorCode.includes('ALREADY') || errorCode.includes('CONFLICT') || errorCode.includes('EXPIRED')) return 409;
  return 422;
}

// ─── Idempotency checks ───────────────────────────────────────────────────────

async function isMigrationApplied(supabase: SupabaseClient, name: string): Promise<boolean> {
  if (name === 'map_theme_default') {
    const { data } = await supabase
      .from('platform_settings')
      .select('key')
      .eq('key', 'map_theme')
      .maybeSingle();
    return data != null;
  }
  if (name === 'user_reference_addresses') {
    const { error } = await supabase
      .from('user_reference_addresses')
      .select('user_id')
      .limit(0);
    return !error;
  }
  if (name === 'osm_addresses') {
    const { error } = await supabase
      .from('osm_addresses')
      .select('id')
      .limit(0);
    return !error;
  }
  if (name === 'osm_addresses_unique_index') {
    // CREATE UNIQUE INDEX IF NOT EXISTS is idempotent — always re-run it
    // so it gets applied even if the table was created without the constraint.
    return false;
  }
  if (name === 'platform_audit_events') {
    const { error } = await supabase.from('platform_audit_events').select('id').limit(0);
    return !error;
  }
  if (name === 'platform_job_commands') {
    const { data, error } = await supabase.rpc('platform_job_command_contract_version');
    return !error && data === PLATFORM_JOB_COMMAND_CONTRACT_VERSION;
  }
  if (name === 'profiles_trial_columns') {
    const { error } = await supabase.from('profiles').select('free_trial_days').limit(0);
    return !error;
  }
  if (name === 'features_table') {
    const { error } = await supabase.from('features').select('id').limit(0);
    return !error;
  }
  if (name === 'features_seed') {
    const { data } = await supabase.from('features').select('id').limit(1);
    return (data?.length ?? 0) > 0;
  }
  if (name === 'resolved_at_lifecycle') {
    const { error } = await supabase.from('illegal_dump_reports').select('resolved_at').limit(0);
    return !error;
  }
  return false;
}

// ─── DDL executor ─────────────────────────────────────────────────────────────

async function tryApplySql(
  supabase: SupabaseClient,
  supabaseUrl: string,
  serviceKey: string,
  sql: string,
): Promise<{ ok: boolean; method: string; error?: string }> {
  // Method 1: supabase.rpc('exec_sql', { sql }) — works if function exists in DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rpcError } = await (supabase as any).rpc('exec_sql', { sql });
  if (!rpcError) return { ok: true, method: 'rpc_exec_sql' };

  // Method 2: POST /pg/query — available on some Supabase versions/plans
  const pgRes = await fetch(`${supabaseUrl}/pg/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);

  if (pgRes?.ok) return { ok: true, method: 'pg_query' };

  return {
    ok: false,
    method: 'none',
    error: 'MIGRATION_EXECUTION_UNAVAILABLE',
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authority = await requirePlatformMutation('platform.migrations.apply');
  if (!authority.ok) {
    return json({
      error: authority.errorCode,
      ...(authority.stepUpHref ? { stepUpHref: authority.stepUpHref } : {}),
    }, authority.status);
  }
  if (!isSameOrigin(request)) return json({ error: 'ORIGIN_NOT_ALLOWED' }, 403);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'UNSUPPORTED_MEDIA_TYPE' }, 415);
  }

  let parsedBody: unknown;
  try {
    parsedBody = await readBoundedJson(request, 8 * 1024);
  } catch (error) {
    if (error instanceof BoundedJsonError && error.code === 'REQUEST_TOO_LARGE') {
      return json({ error: 'REQUEST_TOO_LARGE' }, 413);
    }
    return json({ error: 'INVALID_JSON' }, 400);
  }
  if (
    !parsedBody
    || typeof parsedBody !== 'object'
    || Array.isArray(parsedBody)
  ) {
    return json({ error: 'CONFIRMATION_REQUIRED' }, 400);
  }
  const body = parsedBody as Record<string, unknown>;
  if (Object.keys(body).some(key => !['action', 'confirmation', 'reason', 'idempotencyKey', 'approvalId'].includes(key))) {
    return json({ error: 'INVALID_MIGRATION_REQUEST' }, 400);
  }
  if ((body.action !== 'request' && body.action !== 'execute') || body.confirmation !== APPLY_CONFIRMATION) {
    return json({ error: 'CONFIRMATION_REQUIRED' }, 400);
  }
  if (typeof body.idempotencyKey !== 'string' || !UUID_PATTERN.test(body.idempotencyKey)) {
    return json({ error: 'IDEMPOTENCY_KEY_REQUIRED' }, 400);
  }
  const reason = normalizeAdminReason(body.reason);
  if (!reason) return json({ error: 'MIGRATION_REASON_REQUIRED' }, 400);
  const idempotencyKey = body.idempotencyKey;
  const approvalPayload = migrationApprovalPayload(reason);
  const authenticatedClient = createAuthenticatedClient();

  if (body.action === 'request') {
    if ('approvalId' in body) return json({ error: 'INVALID_MIGRATION_REQUEST' }, 400);
    const { data, error } = await authenticatedClient.rpc('create_platform_command_approval', {
      p_capability_key: 'platform.migrations.apply',
      p_action_key: 'platform.migrations.apply',
      p_target_type: 'migration_chain',
      p_target_id: MIGRATION_HEAD,
      p_request_payload: approvalPayload,
      p_reason: reason,
      p_idempotency_key: idempotencyKey,
      p_ttl: MIGRATION_APPROVAL_TTL,
    });
    if (error) {
      const errorCode = platformAuthorityErrorCode(error, 'PLATFORM_MIGRATION_APPROVAL_FAILED');
      return json({
        error: errorCode,
        ...(errorCode === 'MFA_STEP_UP_REQUIRED'
          ? { stepUpHref: '/account/security?next=%2Fsuperadmin' }
          : {}),
      }, migrationAuthorityStatus(errorCode));
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return json({ error: 'PLATFORM_MIGRATION_APPROVAL_FAILED' }, 502);
    }
    return json({ ok: true, approvalPending: true, result: data, migrationHead: MIGRATION_HEAD });
  }

  if (typeof body.approvalId !== 'string' || !UUID_PATTERN.test(body.approvalId)) {
    return json({ error: 'MIGRATION_APPROVAL_REQUIRED' }, 400);
  }

  const expectedDigest = await getDatabasePlatformPayloadDigest(authenticatedClient, approvalPayload);
  if (!expectedDigest.digest) {
    return json({ error: expectedDigest.errorCode ?? 'PLATFORM_DIGEST_UNAVAILABLE' }, 503);
  }
  const { data: authorization, error: authorizationError } = await authenticatedClient.rpc(
    'authorize_platform_action',
    {
      p_approval_id: body.approvalId,
      p_action_key: 'platform.migrations.apply',
      p_payload: approvalPayload,
      p_consumption_idempotency_key: idempotencyKey,
    },
  );
  if (authorizationError) {
    const errorCode = platformAuthorityErrorCode(authorizationError, 'PLATFORM_MIGRATION_AUTHORIZATION_FAILED');
    return json({
      error: errorCode,
      ...(errorCode === 'MFA_STEP_UP_REQUIRED'
        ? { stepUpHref: '/account/security?next=%2Fsuperadmin' }
        : {}),
    }, migrationAuthorityStatus(errorCode));
  }
  if (
    !authorization
    || typeof authorization !== 'object'
    || Array.isArray(authorization)
    || (authorization.outcome !== 'authorized' && authorization.outcome !== 'replayed')
    || authorization.approval_id !== body.approvalId
    || authorization.payload_digest !== expectedDigest.digest
  ) {
    return json({ error: 'PLATFORM_MIGRATION_AUTHORIZATION_FAILED' }, 502);
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'MIGRATION_EXECUTOR_UNAVAILABLE' }, 503);
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return json({ error: 'MIGRATION_EXECUTOR_UNAVAILABLE' }, 503);
  }

  const actor = authority.context.operatorProfileId;
  if (!actor) return json({ error: 'PLATFORM_OPERATOR_REQUIRED' }, 403);

  // The immutable audit table is itself one of the legacy bootstrap migrations.
  // Establish it before requiring the first audit write, otherwise a database
  // missing this table can never use this route to repair itself.
  const auditMigration = MIGRATIONS.find(migration => migration.name === 'platform_audit_events');
  if (!auditMigration) return json({ error: 'MIGRATION_AUDIT_UNAVAILABLE' }, 503);
  if (!(await isMigrationApplied(supabase, auditMigration.name))) {
    const bootstrap = await tryApplySql(
      supabase,
      supabaseUrl,
      serviceKey,
      auditMigration.sql,
    );
    if (!bootstrap.ok && !(await isMigrationApplied(supabase, auditMigration.name))) {
      return json({ error: 'MIGRATION_AUDIT_UNAVAILABLE' }, 503);
    }
  }

  // Bootstrap or upgrade the coordination contract before claiming the global
  // mutation lock. The version RPC prevents re-running DDL on healthy systems.
  const commandMigration = MIGRATIONS.find(migration => migration.name === 'platform_job_commands');
  if (!commandMigration) return json({ error: 'MIGRATION_GUARD_UNAVAILABLE' }, 503);
  if (!(await isMigrationApplied(supabase, commandMigration.name))) {
    const bootstrap = await tryApplySql(supabase, supabaseUrl, serviceKey, commandMigration.sql);
    if (!bootstrap.ok) return json({ error: 'MIGRATION_GUARD_UNAVAILABLE' }, 503);
    if (!(await isMigrationApplied(supabase, commandMigration.name))) {
      return json({ error: 'MIGRATION_GUARD_UNAVAILABLE' }, 503);
    }
  }

  const { data: commandStart, error: commandStartError } = await supabase.rpc(
    'begin_platform_job_command',
    {
      p_command_kind: 'migration',
      p_job_id: 'apply_migrations',
      p_target_key: PLATFORM_MUTATION_TARGET,
      p_idempotency_key: idempotencyKey,
      p_actor_id: actor,
      p_lease_seconds: MIGRATION_LEASE_SECONDS,
      p_start_payload: {
        approval_id: body.approvalId,
        migration_head: MIGRATION_HEAD,
        migration_count: MIGRATIONS.length,
        migration_names: MIGRATIONS.map(migration => migration.name),
        reason,
      },
    },
  );
  if (
    commandStartError
    || !commandStart
    || typeof commandStart !== 'object'
    || Array.isArray(commandStart)
  ) {
    return json({ error: 'MIGRATION_GUARD_UNAVAILABLE' }, 503);
  }
  const command = commandStart as Record<string, unknown>;
  if (command.outcome === 'replayed') {
    const commandStatus = command.status;
    const safeResult = command.safe_result;
    if (
      (commandStatus !== 'ok' && commandStatus !== 'error' && commandStatus !== 'partial')
      || !safeResult
      || typeof safeResult !== 'object'
      || Array.isArray(safeResult)
    ) {
      return json({ error: 'MIGRATION_GUARD_UNAVAILABLE' }, 503);
    }
    return json({
      ok: commandStatus === 'ok',
      replayed: true,
      commandStatus,
      result: safeResult,
      requestId: idempotencyKey,
      approvalId: body.approvalId,
    }, commandStatus === 'ok' ? 200 : 422);
  }
  if (command.outcome === 'already_submitted') {
    return json({ error: 'MIGRATION_ALREADY_SUBMITTED', requestId: idempotencyKey }, 409);
  }
  if (command.outcome === 'already_running') {
    return json({ error: 'MIGRATION_ALREADY_RUNNING', requestId: idempotencyKey }, 409);
  }
  if (command.outcome === 'idempotency_conflict') {
    return json({ error: 'MIGRATION_IDEMPOTENCY_CONFLICT', requestId: idempotencyKey }, 409);
  }
  if (command.outcome !== 'started' || typeof command.command_id !== 'string') {
    return json({ error: 'MIGRATION_GUARD_UNAVAILABLE' }, 503);
  }
  const commandId = command.command_id;

  const results: Array<{
    name: string;
    ok: boolean;
    status: 'already_applied' | 'applied' | 'failed';
    method?: string;
    error?: string;
  }> = [];

  try {
    for (const m of MIGRATIONS) {
    // 1. Check whether it's already in place (catches manual SQL editor runs)
    const alreadyApplied = await isMigrationApplied(supabase, m.name);
    if (alreadyApplied) {
      results.push({ name: m.name, ok: true, status: 'already_applied' });
      continue;
    }

    // 2. Try to apply automatically
    const r = await tryApplySql(supabase, supabaseUrl, serviceKey, m.sql);
    if (r.ok) {
      results.push({ name: m.name, ok: true, status: 'applied', method: r.method });
      continue;
    }

    // 3. Verify once more in case the SQL ran partially or was idempotent
    const appliedAfterAttempt = await isMigrationApplied(supabase, m.name);
    if (appliedAfterAttempt) {
      results.push({ name: m.name, ok: true, status: 'applied', method: r.method });
      continue;
    }

      results.push({ name: m.name, ok: false, status: 'failed', error: r.error });
    }
  } catch {
    results.push({
      name: 'migration_batch',
      ok: false,
      status: 'failed',
      error: 'MIGRATION_EXECUTION_UNAVAILABLE',
    });
  }

  const allOk = results.every(r => r.ok);
  const commandStatus = allOk
    ? 'ok'
    : (results.some(result => result.ok) ? 'partial' : 'error');
  const completionSummary = {
    ok: allOk,
    applied: results.filter(result => result.status === 'applied').length,
    already_applied: results.filter(result => result.status === 'already_applied').length,
    failed: results.filter(result => result.status === 'failed').length,
  };
  const { data: commandCompletion, error: commandCompletionError } = await supabase.rpc(
    'complete_platform_job_command',
    {
      p_command_id: commandId,
      p_status: commandStatus,
      p_safe_result: completionSummary,
      p_actor_id: actor,
    },
  );
  if (
    commandCompletionError
    || !commandCompletion
    || typeof commandCompletion !== 'object'
    || Array.isArray(commandCompletion)
    || (commandCompletion as Record<string, unknown>).outcome !== 'completed'
  ) {
    return json({ ok: false, error: 'MIGRATION_AUDIT_INCOMPLETE', requestId: idempotencyKey, results }, 500);
  }

  return json({ ok: allOk, requestId: idempotencyKey, approvalId: body.approvalId, results }, allOk ? 200 : 422);
}
