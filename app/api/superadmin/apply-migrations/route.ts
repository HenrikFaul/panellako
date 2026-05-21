/**
 * POST /api/superadmin/apply-migrations
 *
 * Applies the pending DDL migrations to the Panellako Supabase project.
 * Called once from the superadmin panel when the DB is missing tables.
 * Uses the service role key to bypass RLS and execute DDL via the
 * Supabase database REST proxy.
 */
import { NextResponse } from 'next/server';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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
];

async function tryRpcExecSql(
  supabaseUrl: string,
  serviceKey: string,
  sql: string,
): Promise<{ ok: boolean; method: string; error?: string }> {
  // Method 1: supabase.rpc('exec_sql', { sql }) — works if function exists in DB
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rpcError } = await (supabase as any).rpc('exec_sql', { sql });
  if (!rpcError) return { ok: true, method: 'rpc_exec_sql' };

  // Method 2: Supabase pg/query HTTP endpoint (available on some Supabase versions)
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

export async function POST() {
  if (!(await isSuperadminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const serviceKey  = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY missing from environment', manual: true },
      { status: 500 },
    );
  }

  const results: Array<{ name: string; ok: boolean; method?: string; error?: string }> = [];

  for (const m of MIGRATIONS) {
    const r = await tryRpcExecSql(supabaseUrl, serviceKey, m.sql);
    results.push({ name: m.name, ...r });
  }

  const allOk = results.every(r => r.ok);
  return NextResponse.json(
    { ok: allOk, results, manualSqlIfFailed: allOk ? undefined : MIGRATIONS.map(m => m.sql).join('\n\n---\n\n') },
    { status: allOk ? 200 : 422 },
  );
}
