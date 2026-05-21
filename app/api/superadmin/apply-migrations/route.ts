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
