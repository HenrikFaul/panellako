'use client';

import React, { useCallback, useEffect, useState } from 'react';
import SuperadminGtfsImport from '@/components/superadmin-gtfs-import';
import SuperadminDiagnostics from '@/components/superadmin-diagnostics';

// ─── Types ────────────────────────────────────────────────────────────────────

type JobEndpoint = { url: string; note?: string };
type Job = { id: string; label: string; description: string; endpoints?: JobEndpoint[]; envVars?: string[] };
const JOBS: Job[] = [
  {
    id: 'bkk_full_sync', label: 'BKK teljes szinkron', description: 'stops/routes + building_stops + alerts (BKK API)',
    endpoints: [{ url: 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where/*', note: 'Futár OBA REST API' }],
    envVars: ['BKKFUTAR_API_KEY'],
  },
  {
    id: 'bkk_building_stops', label: 'BKK épület–megálló számítás', description: 'building_stops újraszámítás DB-ből (transit_stops)',
  },
  {
    id: 'bkk_alerts', label: 'BKK alerts', description: 'transit_alerts frissítés (BKK GTFS-RT, valós idejű)',
    endpoints: [{ url: 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where/*', note: 'Futár OBA REST API' }],
    envVars: ['BKKFUTAR_API_KEY'],
  },
  {
    id: 'gtfs_derive_refs', label: 'GTFS → Megálló járatrefs', description: 'transit_stops.route_refs + route_type frissítése transit_stop_routes alapján',
  },
  {
    id: 'air_quality_refresh', label: 'Levegőminőség frissítés', description: 'AQI + heatmap párhuzamos frissítés',
    endpoints: [
      { url: 'https://api.waqi.info/feed/{city}/', note: 'AQICN AQI feed' },
      { url: 'https://api.waqi.info/map/bounds/', note: 'AQICN map bounds' },
    ],
    envVars: ['AQICN_API_TOKEN'],
  },
  {
    id: 'env_refresh_green', label: 'Zöld cache frissítés', description: 'OSM Overpass lekérdezés minden épületre, 7 napos cache',
    endpoints: [
      { url: 'https://overpass-api.de/api/interpreter', note: 'OSM Overpass QL — szabad, kulcs nélkül' },
      { url: 'https://nominatim.openstreetmap.org/search', note: 'Geocódolás — szabad, kulcs nélkül' },
    ],
    envVars: [],
  },
  {
    id: 'satellite_refresh', label: 'Műhold NDVI frissítés', description: 'Sentinel-2 NDVI minden épületre, 7 napos cache',
    endpoints: [
      { url: 'https://earth-search.aws.element84.com/v1/search', note: 'Element84 STAC (Sentinel-2) — szabad, kulcs nélkül' },
      { url: 'https://titiler.xyz/cog/point/{lon},{lat}', note: 'Titiler COG pixel lekérdezés — szabad, kulcs nélkül' },
    ],
    envVars: [],
  },
  {
    id: 'urban_refresh', label: 'Kompakt & Élhetőség frissítés', description: 'OSM amenity + BKK transit minden épületre, 30 napos cache',
    endpoints: [
      { url: 'https://overpass-api.de/api/interpreter', note: 'OSM Overpass QL — szabad, kulcs nélkül' },
      { url: 'https://nominatim.openstreetmap.org/search', note: 'Geocódolás — szabad, kulcs nélkül' },
    ],
    envVars: [],
  },
  {
    id: 'urban_atlas_refresh', label: 'EU Urban Atlas frissítés', description: 'Copernicus Urban Atlas 2018 területhasználat minden épületre — 180 napos cache',
    endpoints: [
      { url: 'https://image.discomap.eea.europa.eu/arcgis/rest/services/UrbanAtlas/UA2018/MapServer/0/query', note: 'EEA ArcGIS REST — EU nyílt adat, kulcs nélkül' },
    ],
    envVars: [],
  },
  {
    id: 'budapest_import', label: 'Budapest Nyílt Adat importálás', description: 'Budapest fa-leltár + parknyilvántartás letöltése és Supabase-be importálása (CKAN)',
    endpoints: [
      { url: 'https://opendata.budapest.hu/api/3/action/package_search', note: 'CKAN dataset discovery — Budapest Főváros nyílt adat' },
      { url: 'https://opendata.budapest.hu/api/3/action/datastore_search', note: 'CKAN paginated record download — fa-leltár + parkok' },
    ],
    envVars: [],
  },
  {
    id: 'ndvi_hungary_render', label: 'NDVI Magyarország render', description: 'MODIS Terra/Aqua 8-Day NDVI Magyarország bbox-re, 5 felbontásban (1024×430 → 16384×6880 Brutális tiled mozaik px). 100% ingyenes — NASA GIBS WMS (kulcs nélkül). Felhasználó-oldalon toggle barral váltható a panelen.',
    endpoints: [
      { url: 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi', note: 'NASA GIBS WMS — MODIS Terra/Aqua 8-Day NDVI rétegek, EOSDIS-CDN-en, kulcs nélkül' },
    ],
    envVars: [],
  },
];

interface BkkRateLimits {
  cell_delay_ms:  number;
  retry_max:      number;
  retry_wait_ms:  number;
  cells_per_run:  number;
}

interface EnvHealth {
  envVars: Record<string, { set: boolean; length: number; prefix: string }>;
  keyAnalysis: {
    serviceKeyIsJwt: boolean;
    anonKeyIsJwt: boolean;
    serviceKeyHasWhitespace: boolean;
    urlHasWhitespace: boolean;
    effectiveKeyUsed: string;
  };
  supabaseTests: Array<{ label: string; ok: boolean; count: number | null; error: string | null }>;
  checkedAt: string;
}

interface TableStat {
  name: string;
  label: string;
  count: number | null;
  lastUpdated: string | null;
  error: string | null;
  group?: string;
}

const GROUP_LABELS: Record<string, string> = {
  transit:     'Transit (élő adatok)',
  gtfs:        'GTFS statikus import',
  other:       'Egyéb',
  environment: 'Környezeti adatok',
};

interface JobLog {
  id: string;
  job_id: string;
  triggered_by: string;
  status: 'running' | 'ok' | 'error' | 'partial';
  result: unknown;
  started_at: string;
  finished_at: string | null;
}

const BKK_DEFAULTS: BkkRateLimits = { cell_delay_ms: 5000, retry_max: 3, retry_wait_ms: 90000, cells_per_run: 0 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short' });
}

function duration(start: string, end: string | null): string {
  if (!end) return 'fut…';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.round(ms / 60_000)} perc`;
}

const STATUS_PILL: Record<string, string> = {
  ok:      'bg-emerald-100 text-emerald-700',
  error:   'bg-red-100 text-red-700',
  partial: 'bg-amber-100 text-amber-700',
  running: 'bg-blue-100 text-blue-700',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SuperadminClient() {
  // Job runners
  const [running, setRunning]   = useState<string | null>(null);
  const [results, setResults]   = useState<Record<string, unknown>>({});

  // BKK rate-limit settings
  const [bkkSettings, setBkkSettings] = useState<BkkRateLimits>(BKK_DEFAULTS);
  const [bkkSaving, setBkkSaving]     = useState(false);
  const [bkkSaveMsg, setBkkSaveMsg]   = useState('');

  // DB stats
  const [stats, setStats]           = useState<TableStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsFetchedAt, setStatsFetchedAt] = useState<string | null>(null);

  // Health check
  const [health, setHealth]           = useState<EnvHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Job logs
  const [logs, setLogs]           = useState<JobLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // ── Load on mount ────────────────────────────────────────────────────────

  useEffect(() => {
    // Load BKK settings
    fetch('/api/superadmin/settings')
      .then(r => r.json())
      .then((data: { settings?: Array<{ key: string; value: unknown }> }) => {
        const row = data.settings?.find(s => s.key === 'bkk_rate_limits');
        if (row?.value && typeof row.value === 'object') {
          setBkkSettings({ ...BKK_DEFAULTS, ...(row.value as Partial<BkkRateLimits>) });
        }
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  const loadHealth = useCallback(() => {
    setHealthLoading(true);
    fetch('/api/superadmin/health')
      .then(r => r.json())
      .then((data: EnvHealth) => setHealth(data))
      .catch(() => { /* ignore */ })
      .finally(() => setHealthLoading(false));
  }, []);

  const loadStats = useCallback(() => {
    setStatsLoading(true);
    fetch('/api/superadmin/stats')
      .then(r => r.json())
      .then((data: { tables: TableStat[]; fetchedAt: string }) => {
        setStats(data.tables ?? []);
        setStatsFetchedAt(data.fetchedAt ?? null);
      })
      .catch(() => { /* ignore */ })
      .finally(() => setStatsLoading(false));
  }, []);

  const loadLogs = useCallback(() => {
    setLogsLoading(true);
    fetch('/api/superadmin/jobs/logs?limit=30')
      .then(r => r.json())
      .then((data: { logs: JobLog[] }) => setLogs(data.logs ?? []))
      .catch(() => { /* ignore */ })
      .finally(() => setLogsLoading(false));
  }, []);

  useEffect(() => { loadStats(); loadLogs(); loadHealth(); }, [loadStats, loadLogs, loadHealth]);

  // ── Actions ──────────────────────────────────────────────────────────────

  async function saveBkkSettings() {
    setBkkSaving(true);
    setBkkSaveMsg('');
    const res = await fetch('/api/superadmin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'bkk_rate_limits', value: bkkSettings }),
    });
    setBkkSaveMsg(res.ok ? '✓ Mentve' : '✗ Hiba');
    setBkkSaving(false);
    setTimeout(() => setBkkSaveMsg(''), 3000);
  }

  async function runJob(jobId: string) {
    setRunning(jobId);
    const res = await fetch('/api/superadmin/jobs/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job: jobId }),
    });
    const body = await res.json().catch(() => ({}));
    setResults(prev => ({ ...prev, [jobId]: { status: res.status, body } }));
    setRunning(null);
    // Refresh logs + stats after a job finishes
    setTimeout(() => { loadLogs(); loadStats(); }, 800);
  }

  async function logout() {
    await fetch('/api/superadmin/logout', { method: 'POST' });
    window.location.href = '/superadmin/login';
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Platform Vezérlőpult</h1>
            <p className="text-sm text-slate-500">Integrációk állapota és manuális job indítások</p>
          </div>
          <button onClick={logout} className="btn-secondary px-4 py-2">Kijelentkezés</button>
        </div>

        {/* Integration status cards */}
        <section className="grid gap-4 md:grid-cols-3">
          {[
            { name: 'BKK Futár',   key: 'BKKFUTAR_API_KEY',        note: 'LIMIT_EXCEEDED esetén várj éjfélig (UTC reset)' },
            { name: 'Supabase',    key: 'NEXT_PUBLIC_SUPABASE_URL', note: '' },
            { name: 'Air Quality', key: 'AQICN_API_TOKEN',          note: 'Ha Sanghaj jelenik meg, a demo token aktív — regisztrálj valódi kulcsot: aqicn.org/data-platform/token' },
          ].map(({ name, key, note }) => (
            <div key={name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700">{name}</h3>
              <p className="mt-2 text-lg font-black text-emerald-600">Aktív (env kulcs alapján)</p>
              <p className="mt-1 text-xs text-slate-500">Kulcs: {key}</p>
              {note && <p className="mt-2 text-[11px] text-amber-600">{note}</p>}
            </div>
          ))}
        </section>

        {/* Env / connectivity health */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-900">Környezeti változók és kapcsolat</h2>
            <button
              onClick={loadHealth}
              disabled={healthLoading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {healthLoading ? 'Töltés…' : '↻ Ellenőrzés'}
            </button>
          </div>
          {!health ? (
            <p className="text-sm text-slate-400">Töltés…</p>
          ) : (
            <div className="space-y-4">
              {/* Env vars table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-[10px] font-bold uppercase text-slate-400">
                      <th className="pb-1.5 pr-4">Változó</th>
                      <th className="pb-1.5 pr-3">Be van állítva?</th>
                      <th className="pb-1.5 pr-3">Hossz</th>
                      <th className="pb-1.5">Eleje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(health.envVars).map(([k, v]) => (
                      <tr key={k} className="border-b border-slate-50 last:border-0">
                        <td className="py-1.5 pr-4 font-mono font-bold text-slate-700">{k}</td>
                        <td className="py-1.5 pr-3">
                          <span className={`rounded-full px-2 py-0.5 font-bold ${v.set ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {v.set ? '✓ igen' : '✗ hiányzik'}
                          </span>
                        </td>
                        <td className="py-1.5 pr-3 font-mono text-slate-500">{v.length || '—'}</td>
                        <td className="py-1.5 font-mono text-slate-400">{v.prefix || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Key analysis */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Service role JWT?',       ok: health.keyAnalysis.serviceKeyIsJwt },
                  { label: 'Anon key JWT?',            ok: health.keyAnalysis.anonKeyIsJwt },
                  { label: 'Service key whitespace?',  ok: !health.keyAnalysis.serviceKeyHasWhitespace },
                  { label: 'URL whitespace?',          ok: !health.keyAnalysis.urlHasWhitespace },
                ].map(item => (
                  <span key={item.label} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${item.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {item.ok ? '✓' : '✗'} {item.label}
                  </span>
                ))}
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                  Aktív kulcs: {health.keyAnalysis.effectiveKeyUsed}
                </span>
              </div>
              {/* Supabase connectivity */}
              <div className="flex flex-wrap gap-3">
                {health.supabaseTests.map(t => (
                  <div key={t.label} className={`rounded-xl border px-3 py-2 text-xs ${t.ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                    <p className="font-bold text-slate-700">{t.label}</p>
                    {t.ok
                      ? <p className="text-emerald-700">✓ OK — buildings rekord: {t.count}</p>
                      : <p className="text-red-600">✗ {t.error}</p>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* DB stats */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">Adatbázis állapot</h2>
              {statsFetchedAt && (
                <p className="text-xs text-slate-400">Lekérve: {fmt(statsFetchedAt)}</p>
              )}
            </div>
            <button
              onClick={loadStats}
              disabled={statsLoading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {statsLoading ? 'Töltés…' : '↻ Frissítés'}
            </button>
          </div>
          {stats.length === 0 && !statsLoading ? (
            <p className="text-sm text-slate-400">Nincs adat — próbáld frissíteni.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-bold text-slate-500">
                    <th className="pb-2 pr-4">Tábla</th>
                    <th className="pb-2 pr-4 text-right">Rekordok</th>
                    <th className="pb-2">Utolsó frissítés</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.reduce<React.ReactNode[]>((acc, s, i) => {
                    const prevGroup = i > 0 ? stats[i - 1].group : undefined;
                    if (s.group && s.group !== prevGroup) {
                      acc.push(
                        <tr key={`group-${s.group}`}>
                          <td colSpan={3} className={`pb-1 ${i > 0 ? 'border-t border-slate-200 pt-4' : 'pt-1'}`}>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              {GROUP_LABELS[s.group] ?? s.group}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                    acc.push(
                      <tr key={s.name} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 pr-4">
                          <span className="font-medium text-slate-800">{s.label}</span>
                          <span className="ml-2 font-mono text-[10px] text-slate-400">{s.name}</span>
                          {s.error && <span className="ml-2 text-[10px] text-red-500">{s.error}</span>}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono font-bold text-slate-900">
                          {s.count === null ? '—' : s.count.toLocaleString('en-US')}
                        </td>
                        <td className="py-2 text-slate-500">{fmt(s.lastUpdated)}</td>
                      </tr>
                    );
                    return acc;
                  }, [])}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* BKK Rate Limit Settings */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-black text-slate-900">BKK API rate-limit beállítások</h2>
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
            <p className="font-bold">ℹ️ BKK Futár API rate limit — amit tudunk</p>
            <p>A BKK nem publikálja pontosan a limiteket, de a következők érvényesek a tapasztalatok alapján:</p>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>A <code className="bg-amber-100 px-1 rounded">LIMIT_EXCEEDED</code> (HTTP 400, code: 400) a napi/óránkénti kvóta kimerülését jelzi</li>
              <li>Az ingyenes tesztkulcs valószínűleg <strong>~100–500 kérés/nap</strong> korláttal rendelkezik</li>
              <li>A kvóta valószínűleg <strong>éjfélkor UTC-ben resetel</strong> — ekkor próbáld újra</li>
              <li>Produkciós kulcsért vedd fel a kapcsolatot a BKK-val: <strong>futar@bkk.hu</strong></li>
              <li>A sync most <strong>3 cellát</strong> használ (korábbi 6 helyett) — felére csökkentve az API hívásokat</li>
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-700">Cellák közötti késleltetés (ms)</span>
              <span className="text-[10px] text-slate-400">Budapest 6 cellára osztva — ennyi ms telik el minden BKK API kérés után</span>
              <input
                type="number" min={500} max={30000} step={500}
                value={bkkSettings.cell_delay_ms}
                onChange={e => setBkkSettings(s => ({ ...s, cell_delay_ms: Number(e.target.value) }))}
                className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-700">Max újrapróbálkozás / cella</span>
              <span className="text-[10px] text-slate-400">Rate limit esetén ennyiszer próbálja újra ugyanazt a cellát</span>
              <input
                type="number" min={0} max={10} step={1}
                value={bkkSettings.retry_max}
                onChange={e => setBkkSettings(s => ({ ...s, retry_max: Number(e.target.value) }))}
                className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-700">Várakozás újrapróbálkozás előtt (ms)</span>
              <span className="text-[10px] text-slate-400">Rate limit után ennyi ideig vár újrapróbálkozás előtt</span>
              <input
                type="number" min={5000} max={300000} step={5000}
                value={bkkSettings.retry_wait_ms}
                onChange={e => setBkkSettings(s => ({ ...s, retry_wait_ms: Number(e.target.value) }))}
                className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 sm:col-span-1">
              <span className="text-xs font-bold text-slate-700">Cellák száma / futás</span>
              <span className="text-[10px] text-slate-400">Budapest 3 cellára osztva. 0 = mind (3 db). Erős limit esetén állítsd 1-re.</span>
              <input
                type="number" min={0} max={3} step={1}
                value={bkkSettings.cells_per_run}
                onChange={e => setBkkSettings(s => ({ ...s, cells_per_run: Number(e.target.value) }))}
                className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={saveBkkSettings} disabled={bkkSaving} className="btn-primary px-4 py-2 text-sm">
              {bkkSaving ? 'Mentés...' : 'Beállítások mentése'}
            </button>
            {bkkSaveMsg && <span className="text-sm font-bold text-emerald-600">{bkkSaveMsg}</span>}
            <span className="ml-auto text-xs text-slate-400">Alapértelmezett: 5 000 ms · 3 retry · 90 000 ms · 0 (mind)</span>
          </div>
        </section>

        {/* Job runner */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-black text-slate-900">Ütemezett feladatok / Manuális indítás</h2>
          <div className="space-y-3">
            {JOBS.map(j => (
              <div key={j.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">{j.label}</p>
                    <p className="text-xs text-slate-500">{j.description}</p>
                    {/* API endpoints */}
                    {j.endpoints && j.endpoints.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {j.endpoints.map(ep => (
                          <span key={ep.url} title={ep.note} className="inline-flex max-w-full items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                            <span className="shrink-0 text-slate-400">🌐</span>
                            <span className="truncate">{ep.url}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Env var requirements */}
                    {j.envVars !== undefined && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {j.envVars.length === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                            ✓ Nincs API kulcs szükséges
                          </span>
                        ) : j.envVars.map(v => (
                          <span key={v} className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-700">
                            🔑 {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => runJob(j.id)} disabled={running === j.id} className="btn-primary shrink-0 px-4 py-2 text-sm">
                    {running === j.id ? 'Fut...' : 'Azonnali indítás'}
                  </button>
                </div>
                {results[j.id] ? (
                  <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                    {JSON.stringify(results[j.id], null, 2)}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* Job run logs */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-900">Job futási napló</h2>
            <button
              onClick={loadLogs}
              disabled={logsLoading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {logsLoading ? 'Töltés…' : '↻ Frissítés'}
            </button>
          </div>
          {logs.length === 0 && !logsLoading ? (
            <p className="text-sm text-slate-400">Még nem futott le egyetlen job sem, vagy a platform_job_logs tábla hiányzik.</p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div
                    className="flex cursor-pointer flex-wrap items-center gap-3"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_PILL[log.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {log.status}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-700">{log.job_id}</span>
                    <span className="text-xs text-slate-500">{fmt(log.started_at)}</span>
                    <span className="text-xs text-slate-400">({duration(log.started_at, log.finished_at)})</span>
                    <span className="ml-auto text-[10px] text-slate-300">{expandedLog === log.id ? '▲' : '▼'}</span>
                  </div>
                  {expandedLog === log.id && (
                    <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] text-slate-100">
                      {JSON.stringify(log.result, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── GTFS Import ─────────────────────────────────────────────── */}
        <SuperadminGtfsImport />

        {/* ── External-API diagnostics (custom curl runner) ───────────── */}
        <SuperadminDiagnostics />

      </div>
    </main>
  );
}
