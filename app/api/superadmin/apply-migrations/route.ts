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
 * If both fail, the response includes the raw SQL so the admin can run it
 * manually via the Supabase SQL editor.
 */
import { NextResponse } from 'next/server';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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
DROP INDEX IF EXISTS public.osm_addresses_external_id_unique;
DROP INDEX IF EXISTS public.osm_addresses_external_id_idx;
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
  return false;
}

// ─── DDL executor ─────────────────────────────────────────────────────────────

async function tryApplySql(
  supabaseUrl: string,
  serviceKey: string,
  sql: string,
): Promise<{ ok: boolean; method: string; error?: string }> {
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

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
  }).catch(() => null);

  if (pgRes?.ok) return { ok: true, method: 'pg_query' };

  return {
    ok: false,
    method: 'none',
    error: rpcError?.message ?? `pg/query returned ${pgRes?.status ?? 'network error'}`,
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST() {
  if (!(await isSuperadminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const serviceKey  = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY missing from environment' },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const results: Array<{
    name: string;
    ok: boolean;
    status: 'already_applied' | 'applied' | 'failed';
    method?: string;
    error?: string;
  }> = [];

  const failedSql: string[] = [];

  for (const m of MIGRATIONS) {
    // 1. Check whether it's already in place (catches manual SQL editor runs)
    const alreadyApplied = await isMigrationApplied(supabase, m.name);
    if (alreadyApplied) {
      results.push({ name: m.name, ok: true, status: 'already_applied' });
      continue;
    }

    // 2. Try to apply automatically
    const r = await tryApplySql(supabaseUrl, serviceKey, m.sql);
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
    failedSql.push(m.sql);
  }

  const allOk = results.every(r => r.ok);
  return NextResponse.json(
    {
      ok: allOk,
      results,
      manualSqlIfFailed: failedSql.length > 0 ? failedSql.join('\n\n---\n\n') : undefined,
    },
    { status: allOk ? 200 : 422 },
  );
}
