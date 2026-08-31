import { createAdminClient } from '@/lib/supabase/admin';
import { adminJson } from '@/lib/superadmin/http';
import { requirePlatformRead } from '@/lib/superadmin/operator-authority';

export const dynamic = 'force-dynamic';

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
  // ── Környezeti adatok ───────────────────────────────────────────────────────
  { name: 'building_green_cache',    tsCol: 'computed_at', label: 'Épület zöld cache',       group: 'environment' },
  { name: 'building_solar_cache',    tsCol: 'computed_at', label: 'Épület solar cache',      group: 'environment' },
  { name: 'building_env_score',      tsCol: 'computed_at', label: 'Env. pontszámok',         group: 'environment' },
  { name: 'building_satellite_cache',tsCol: 'computed_at', label: 'Satellit NDVI cache',     group: 'environment' },
  { name: 'building_compact_city_cache',tsCol:'computed_at',label:'Kompakt város cache',     group: 'environment' },
  { name: 'building_liveability_cache', tsCol:'computed_at',label:'Élhetőség cache',         group: 'environment' },
  // ── OSM cím-adatbázis ───────────────────────────────────────────────────────
  { name: 'osm_addresses', tsCol: 'created_at', label: 'OSM cím-adatok (autocomplete)', group: 'other' },
  // bkk_stops, transit_stop_cache, transit_alert_cache are legacy tables
  // (0 records / deprecated) — not shown to reduce noise
];

async function getTableStat(
  supabase: ReturnType<typeof createAdminClient>,
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
    error: countErr ? 'SOURCE_UNAVAILABLE' : null,
  };
}

export async function GET() {
  const authority = await requirePlatformRead('platform.overview.read');
  if (!authority.ok) return adminJson({ error: authority.errorCode }, authority.status);

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return adminJson({ error: 'STATS_UNAVAILABLE' }, 503);
  }

  const tables = await Promise.all(
    TABLE_SPECS.map(spec => getTableStat(supabase, spec).catch(() => ({
      name:  spec.name,
      label: spec.label,
      group: spec.group ?? null,
      count: null,
      lastUpdated: null,
      error: 'SOURCE_UNAVAILABLE',
    }))),
  );

  return adminJson({ tables, fetchedAt: new Date().toISOString() });
}
