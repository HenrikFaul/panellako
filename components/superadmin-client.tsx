'use client';

import { useCallback, useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Job = { id: string; label: string; description: string };
const JOBS: Job[] = [
  { id: 'bkk_full_sync',       label: 'BKK teljes szinkron',      description: 'stops/routes + building_stops + alerts' },
  { id: 'bkk_stops_routes',    label: 'BKK stops/routes',         description: 'transit_stops, transit_routes, transit_stop_routes' },
  { id: 'bkk_building_stops',  label: 'Building stops',           description: 'building_stops újraszámítás' },
  { id: 'bkk_alerts',          label: 'BKK alerts',               description: 'transit_alerts frissítés' },
  { id: 'air_quality_refresh', label: 'Levegőminőség frissítés',  description: 'AQI + heatmap párhuzamos frissítés' },
];

interface BkkRateLimits {
  cell_delay_ms: number;
  retry_max: number;
  retry_wait_ms: number;
}

interface TableStat {
  name: string;
  label: string;
  count: number | null;
  lastUpdated: string | null;
  error: string | null;
}

interface JobLog {
  id: string;
  job_id: string;
  triggered_by: string;
  status: 'running' | 'ok' | 'error' | 'partial';
  result: unknown;
  started_at: string;
  finished_at: string | null;
}

const BKK_DEFAULTS: BkkRateLimits = { cell_delay_ms: 3000, retry_max: 3, retry_wait_ms: 60000 };

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

  useEffect(() => { loadStats(); loadLogs(); }, [loadStats, loadLogs]);

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
            ['BKK Futár',    'Aktív (env kulcs alapján)', 'BKKFUTAR_API_KEY'],
            ['Supabase',     'Aktív (env kulcs alapján)', 'NEXT_PUBLIC_SUPABASE_URL'],
            ['Air Quality',  'Aktív (env kulcs alapján)', 'AQICN_API_TOKEN'],
          ].map(([name, status, key]) => (
            <div key={name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700">{name}</h3>
              <p className="mt-2 text-lg font-black text-emerald-600">{status}</p>
              <p className="mt-1 text-xs text-slate-500">Kulcs: {key}</p>
            </div>
          ))}
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
                  {stats.map(s => (
                    <tr key={s.name} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 pr-4">
                        <span className="font-medium text-slate-800">{s.label}</span>
                        <span className="ml-2 font-mono text-[10px] text-slate-400">{s.name}</span>
                        {s.error && <span className="ml-2 text-[10px] text-red-500">{s.error}</span>}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono font-bold text-slate-900">
                        {s.count === null ? '—' : s.count.toLocaleString('hu-HU')}
                      </td>
                      <td className="py-2 text-slate-500">{fmt(s.lastUpdated)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* BKK Rate Limit Settings */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-black text-slate-900">BKK API rate-limit beállítások</h2>
          <p className="mb-4 text-xs text-slate-500">Ha a szinkron LIMIT_EXCEEDED hibát ad, növeld a késleltetést és az újrapróbálkozási időt.</p>
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
          <div className="mt-4 flex items-center gap-3">
            <button onClick={saveBkkSettings} disabled={bkkSaving} className="btn-primary px-4 py-2 text-sm">
              {bkkSaving ? 'Mentés...' : 'Beállítások mentése'}
            </button>
            {bkkSaveMsg && <span className="text-sm font-bold text-emerald-600">{bkkSaveMsg}</span>}
            <span className="ml-auto text-xs text-slate-400">Alapértelmezett: 3 000 ms · 3 retry · 60 000 ms</span>
          </div>
        </section>

        {/* Job runner */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-black text-slate-900">Ütemezett feladatok / Manuális indítás</h2>
          <div className="space-y-3">
            {JOBS.map(j => (
              <div key={j.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{j.label}</p>
                    <p className="text-xs text-slate-500">{j.description}</p>
                  </div>
                  <button onClick={() => runJob(j.id)} disabled={running === j.id} className="btn-primary px-4 py-2 text-sm">
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

      </div>
    </main>
  );
}
