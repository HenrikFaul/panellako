import { NextResponse } from 'next/server';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function createServiceClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  const key = serviceKey.startsWith('eyJ') ? serviceKey : (anonKey || serviceKey);
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

const TABLE_SPECS: Array<{ name: string; tsCol: string | null; label: string; group?: string }> = [
  // ── Transit (élő adatok) ────────────────────────────────────────────────────
  { name: 'transit_stops',       tsCol: 'synced_at',   label: 'Megállók',                  group: 'transit' },
  { name: 'transit_routes',      tsCol: 'synced_at',   label: 'Járatok',                   group: 'transit' },
  { name: 'transit_stop_routes', tsCol: null,          label: 'Megálló–járat párok',        group: 'transit' },
  { name: 'building_stops',      tsCol: null,          label: 'Épület–megálló párok',       group: 'transit' },
  { name: 'transit_alerts',      tsCol: 'fetched_at',  label: 'Forgalmi figyelmeztetések', group: 'transit' },
  // ── GTFS statikus import ────────────────────────────────────────────────────
  { name: 'gtfs_feed_info',      tsCol: 'imported_at', label: 'GTFS feed info',             group: 'gtfs' },
  { name: 'gtfs_trips',          tsCol: null,          label: 'GTFS trips',                 group: 'gtfs' },
  { name: 'gtfs_calendar_dates', tsCol: null,          label: 'GTFS menetrendi napok',      group: 'gtfs' },
  { name: 'gtfs_pathways',       tsCol: null,          label: 'GTFS átjárók',               group: 'gtfs' },
  { name: 'gtfs_shapes',         tsCol: null,          label: 'GTFS vonalgeometria',        group: 'gtfs' },
  { name: 'gtfs_translations',   tsCol: null,          label: 'GTFS fordítások',            group: 'gtfs' },
  // ── Egyéb ───────────────────────────────────────────────────────────────────
  { name: 'air_quality_readings',tsCol: 'created_at',  label: 'Levegőminőség mérések',     group: 'other' },
  // bkk_stops, transit_stop_cache, transit_alert_cache are legacy tables
  // (0 records / deprecated) — not shown to reduce noise
];

async function getTableStat(
  supabase: ReturnType<typeof createServiceClient>,
  spec: (typeof TABLE_SPECS)[number],
) {
  const { count, error: countErr } = await supabase
    .from(spec.name)
    .select('*', { count: 'exact', head: true });

  let lastUpdated: string | null = null;
  if (spec.tsCol && !countErr) {
    const { data } = await supabase
      .from(spec.name)
      .select(spec.tsCol)
      .order(spec.tsCol, { ascending: false })
      .limit(1)
      .maybeSingle();
    lastUpdated = (data as Record<string, string> | null)?.[spec.tsCol] ?? null;
  }

  return {
    name:        spec.name,
    label:       spec.label,
    group:       spec.group ?? null,
    count:       countErr ? null : (count ?? 0),
    lastUpdated,
    error: countErr?.message ?? null,
  };
}

export async function GET() {
  if (!(await isSuperadminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const tables = await Promise.all(
    TABLE_SPECS.map(spec => getTableStat(supabase, spec).catch(err => ({
      name:  spec.name,
      label: spec.label,
      group: spec.group ?? null,
      count: null,
      lastUpdated: null,
      error: err instanceof Error ? err.message : String(err),
    }))),
  );

  return NextResponse.json({ tables, fetchedAt: new Date().toISOString() });
}
