'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  acquireAdminRequestKey,
  isTerminalAdminCommandResponse,
  releaseAdminRequestKey,
} from '@/lib/superadmin/idempotency-client';

const COUNTIES = [
  { name: 'Budapest',    bbox: [47.35, 18.87, 47.62, 19.34] as const },
  { name: 'Pest',        bbox: [47.00, 18.60, 48.35, 20.25] as const },
  { name: 'Baranya',     bbox: [45.73, 17.55, 46.25, 18.61] as const },
  { name: 'Bács-Kiskun', bbox: [46.03, 18.76, 47.28, 20.21] as const },
  { name: 'Békés',       bbox: [46.39, 20.60, 47.12, 21.60] as const },
  { name: 'Borsod-Abaúj-Zemplén', bbox: [47.60, 20.10, 48.57, 22.00] as const },
  { name: 'Csongrád',    bbox: [46.07, 19.68, 46.77, 20.73] as const },
  { name: 'Fejér',       bbox: [46.73, 18.03, 47.55, 18.78] as const },
  { name: 'Győr-Moson-Sopron', bbox: [47.44, 16.42, 47.94, 17.83] as const },
  { name: 'Hajdú-Bihar', bbox: [47.00, 21.00, 48.00, 22.25] as const },
  { name: 'Heves',       bbox: [47.60, 19.65, 48.13, 20.63] as const },
  { name: 'Jász-Nagykun-Szolnok', bbox: [46.75, 19.80, 47.76, 21.10] as const },
  { name: 'Komárom-Esztergom', bbox: [47.49, 17.90, 47.85, 18.73] as const },
  { name: 'Nógrád',      bbox: [47.79, 19.05, 48.27, 20.18] as const },
  { name: 'Somogy',      bbox: [45.93, 16.77, 47.00, 18.18] as const },
  { name: 'Szabolcs-Szatmár-Bereg', bbox: [47.60, 21.60, 48.57, 22.90] as const },
  { name: 'Tolna',       bbox: [46.25, 17.80, 46.95, 18.85] as const },
  { name: 'Vas',         bbox: [46.70, 16.10, 47.53, 17.00] as const },
  { name: 'Veszprém',    bbox: [46.75, 17.20, 47.53, 18.38] as const },
  { name: 'Zala',        bbox: [46.25, 16.33, 46.92, 17.20] as const },
];

type ImportResult = {
  ok: boolean;
  imported?: number;
  skipped?: number;
  note?: string;
  error?: string;
  ranAt?: string;
};

type RowCount = { count: number | null; loading: boolean };

export default function SuperadminOsmImport() {
  const [rowCount, setRowCount] = useState<RowCount>({ count: null, loading: false });
  const [phase1Running, setPhase1Running] = useState(false);
  const [phase1Result, setPhase1Result] = useState<ImportResult | null>(null);
  const [countyRunning, setCountyRunning] = useState<string | null>(null);
  const [countyResults, setCountyResults] = useState<Record<string, ImportResult>>({});
  const [indexFixRunning, setIndexFixRunning] = useState(false);
  const [indexFixResult, setIndexFixResult] = useState<{ ok: boolean; method?: string; error?: string } | null>(null);
  const [allRunning, setAllRunning] = useState(false);
  const [allResult, setAllResult] = useState<{ ok: boolean; totalImported?: number; failedCount?: number; error?: string } | null>(null);
  const [armedAction, setArmedAction] = useState<string | null>(null);
  const anyImportRunning = phase1Running || indexFixRunning || allRunning || countyRunning !== null;

  const loadRowCount = useCallback(() => {
    setRowCount(rc => ({ ...rc, loading: true }));
    fetch('/api/superadmin/osm-addresses-count')
      .then(r => r.json())
      .then((d: { count?: number }) => setRowCount({ count: d.count ?? null, loading: false }))
      .catch(() => setRowCount({ count: null, loading: false }));
  }, []);

  useEffect(() => { loadRowCount(); }, [loadRowCount]);

  async function runIndexFix() {
    setArmedAction(null);
    setIndexFixRunning(true);
    setIndexFixResult(null);
    const requestScope = 'job:osm_fix_index';
    try {
      const res = await fetch('/api/superadmin/jobs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'osm_fix_index', idempotencyKey: acquireAdminRequestKey(requestScope) }),
      });
      const body = await res.json() as { ok: boolean; result?: { ok: boolean; method?: string; error?: string }; error?: string };
      if (isTerminalAdminCommandResponse(body)) releaseAdminRequestKey(requestScope);
      setIndexFixResult({ ok: body.ok, method: body.result?.method, error: body.result?.error ?? body.error });
    } catch {
      setIndexFixResult({ ok: false, error: 'JOB_REQUEST_FAILED' });
    } finally {
      setIndexFixRunning(false);
    }
  }

  async function runPhase1() {
    setArmedAction(null);
    setPhase1Running(true);
    setPhase1Result(null);
    const requestScope = 'job:osm_addresses_import_phase1';
    try {
      const res = await fetch('/api/superadmin/jobs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'osm_addresses_import_phase1', idempotencyKey: acquireAdminRequestKey(requestScope) }),
      });
      const body = await res.json() as { ok: boolean; result?: ImportResult; error?: string };
      if (isTerminalAdminCommandResponse(body)) releaseAdminRequestKey(requestScope);
      setPhase1Result({ ok: body.ok, ...(body.result ?? {}), error: body.error });
    } catch {
      setPhase1Result({ ok: false, error: 'JOB_REQUEST_FAILED' });
    } finally {
      setPhase1Running(false);
      setTimeout(loadRowCount, 500);
    }
  }

  async function runAllCounties() {
    setArmedAction(null);
    setAllRunning(true);
    setAllResult(null);
    const requestScope = 'job:osm_addresses_import_all';
    try {
      const res = await fetch('/api/superadmin/jobs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'osm_addresses_import_all', idempotencyKey: acquireAdminRequestKey(requestScope) }),
      });
      const body = await res.json() as { ok: boolean; result?: { totalImported?: number; failedCount?: number }; error?: string };
      if (isTerminalAdminCommandResponse(body)) releaseAdminRequestKey(requestScope);
      setAllResult({ ok: body.ok, totalImported: body.result?.totalImported, failedCount: body.result?.failedCount, error: body.error });
    } catch {
      setAllResult({ ok: false, error: 'JOB_REQUEST_FAILED' });
    } finally {
      setAllRunning(false);
      setTimeout(loadRowCount, 500);
    }
  }

  async function runCounty(county: string) {
    setArmedAction(null);
    setCountyRunning(county);
    const requestScope = `job:osm_addresses_import_phase2_county:${county}`;
    try {
      const res = await fetch('/api/superadmin/jobs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job: 'osm_addresses_import_phase2_county',
          county,
          idempotencyKey: acquireAdminRequestKey(requestScope),
        }),
      });
      const body = await res.json() as { ok: boolean; result?: ImportResult; error?: string };
      if (isTerminalAdminCommandResponse(body)) releaseAdminRequestKey(requestScope);
      setCountyResults(prev => ({ ...prev, [county]: { ok: body.ok, ...(body.result ?? {}), error: body.error } }));
    } catch {
      setCountyResults(prev => ({ ...prev, [county]: { ok: false, error: 'JOB_REQUEST_FAILED' } }));
    } finally {
      setCountyRunning(null);
      setTimeout(loadRowCount, 500);
    }
  }

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">OSM Cím-adatbázis import</h2>
          <p className="text-xs text-slate-500">
            Magyar OSM cím-adatok importálása a Panellako Supabase projektbe (<code className="text-[10px]">public.osm_addresses</code>).
            Az autocomplete ebből az adatból dolgozik.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold tabular-nums text-slate-300">
            {rowCount.loading ? 'Töltés…' : rowCount.count === null ? '— sor' : `${rowCount.count.toLocaleString('en-US')} sor`}
          </span>
          <button
            onClick={loadRowCount}
            disabled={rowCount.loading}
            className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-slate-400 hover:bg-white/[0.08] disabled:opacity-50"
          >↻</button>
        </div>
      </div>

      {/* Index fix — must run before any import if upsert fails */}
      <div className="mb-4 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-rose-300">Unique index javítás</p>
          <p className="text-xs text-rose-300/80">Ha &quot;there is no unique or excl&quot; hibát látsz, futtasd ezt először.</p>
          {indexFixResult && (
            <p className={`mt-1 text-xs font-semibold ${indexFixResult.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
              {indexFixResult.ok ? `✓ Kész (${indexFixResult.method})` : `✗ ${indexFixResult.error}`}
            </p>
          )}
        </div>
        <button
          onClick={() => armedAction === 'index' ? runIndexFix() : setArmedAction('index')}
          disabled={anyImportRunning}
          className="shrink-0 rounded-lg bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 ring-1 ring-rose-500/25 hover:bg-rose-500/20 disabled:opacity-50"
        >
          {indexFixRunning ? 'Fut…' : armedAction === 'index' ? 'Megerősítés: javítás' : 'Index javítás'}
        </button>
      </div>

      {/* Phase 1 */}
      <div className="mb-4 rounded-xl border border-violet-500/25 bg-violet-500/[0.06] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-100">1. fázis — Magyarország telephelyek</p>
            <p className="text-xs text-slate-400">OSM <code className="text-[10px]">place=city|town|village|hamlet</code> csomópontok, ~10 000 sor, ~60 másodperc. Futtatható a felületen.</p>
            <p className="mt-1 text-[11px] text-slate-500">Forrás: Overpass API · Cél: Panellako <code className="text-[10px]">wzromwxpjlyrqbdiapep</code></p>
          </div>
          <button
            onClick={() => armedAction === 'phase1' ? runPhase1() : setArmedAction('phase1')}
            disabled={anyImportRunning}
            className="shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-base hover:bg-brand-400 disabled:opacity-50"
          >
            {phase1Running ? 'Fut…' : armedAction === 'phase1' ? 'Megerősítés: indítás' : 'Indítás'}
          </button>
        </div>
        {phase1Result && (
          <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${phase1Result.ok ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/25 bg-rose-500/10 text-rose-300'}`}>
            {phase1Result.ok
              ? `✓ Kész — ${phase1Result.imported?.toLocaleString('en-US') ?? '?'} sor importálva, ${phase1Result.skipped ?? 0} kihagyva${phase1Result.note ? ` · ${phase1Result.note}` : ''}`
              : `✗ Hiba: ${phase1Result.error}`}
          </div>
        )}
      </div>

      {/* Phase 2 */}
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-100">2. fázis — Teljes cím-adatbázis</p>
            <p className="text-xs text-slate-400">
              <code className="text-[10px]">addr:housenumber</code> + <code className="text-[10px]">addr:street</code> — limit nélkül, minden cím.
              Megye: 2–4 perc. Egész ország: 40–80 perc (szerver futtatja végig).
            </p>
            {allResult && (
              <p className={`mt-1 text-xs font-semibold ${allResult.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                {allResult.ok
                  ? `✓ Kész — ${allResult.totalImported?.toLocaleString('en-US') ?? '?'} sor importálva`
                  : `✗ Hiba: ${allResult.error ?? `${allResult.failedCount} megye sikertelen`}`}
              </p>
            )}
          </div>
          <button
            onClick={() => armedAction === 'all' ? runAllCounties() : setArmedAction('all')}
            disabled={anyImportRunning}
            className="shrink-0 rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-ink-base hover:bg-brand-400 disabled:opacity-50"
          >
            {allRunning ? 'Fut… (kérlek várj)' : armedAction === 'all' ? 'Megerősítés: egész ország' : 'Egész ország'}
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {COUNTIES.map(c => {
            const r = countyResults[c.name];
            return (
              <div key={c.name} className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-200">{c.name}</p>
                  {r && (
                    <p className={`text-[11px] ${r.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {r.ok
                        ? `✓ ${r.imported?.toLocaleString('en-US') ?? '?'} sor`
                        : `✗ ${(r.error ?? '').slice(0, 60)}`}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => armedAction === `county:${c.name}`
                    ? runCounty(c.name)
                    : setArmedAction(`county:${c.name}`)}
                  disabled={anyImportRunning}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                    countyRunning === c.name
                      ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/25'
                      : 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/25 hover:bg-amber-500/20'
                  }`}
                >
                  {countyRunning === c.name
                    ? 'Fut…'
                    : armedAction === `county:${c.name}`
                      ? 'Megerősítés'
                      : r?.ok ? 'Újra' : 'Import'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
