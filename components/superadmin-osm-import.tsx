'use client';

import React, { useCallback, useEffect, useState } from 'react';

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

  const loadRowCount = useCallback(() => {
    setRowCount(rc => ({ ...rc, loading: true }));
    fetch('/api/superadmin/osm-addresses-count')
      .then(r => r.json())
      .then((d: { count?: number }) => setRowCount({ count: d.count ?? null, loading: false }))
      .catch(() => setRowCount({ count: null, loading: false }));
  }, []);

  useEffect(() => { loadRowCount(); }, [loadRowCount]);

  async function runPhase1() {
    setPhase1Running(true);
    setPhase1Result(null);
    try {
      const res = await fetch('/api/superadmin/jobs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'osm_addresses_import_phase1' }),
      });
      const body = await res.json() as { ok: boolean; result?: ImportResult; error?: string };
      setPhase1Result({ ok: body.ok, ...(body.result ?? {}), error: body.error });
    } catch (e) {
      setPhase1Result({ ok: false, error: String(e) });
    } finally {
      setPhase1Running(false);
      setTimeout(loadRowCount, 500);
    }
  }

  async function runCounty(county: string) {
    setCountyRunning(county);
    try {
      const res = await fetch('/api/superadmin/jobs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'osm_addresses_import_phase2_county', county }),
      });
      const body = await res.json() as { ok: boolean; result?: ImportResult; error?: string };
      setCountyResults(prev => ({ ...prev, [county]: { ok: body.ok, ...(body.result ?? {}), error: body.error } }));
    } catch (e) {
      setCountyResults(prev => ({ ...prev, [county]: { ok: false, error: String(e) } }));
    } finally {
      setCountyRunning(null);
      setTimeout(loadRowCount, 500);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">OSM Cím-adatbázis import</h2>
          <p className="text-xs text-slate-500">
            Magyar OSM cím-adatok importálása a Panellako Supabase projektbe (<code className="text-[10px]">public.osm_addresses</code>).
            Az autocomplete ebből az adatból dolgozik.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {rowCount.loading ? 'Töltés…' : rowCount.count === null ? '— sor' : `${rowCount.count.toLocaleString('en-US')} sor`}
          </span>
          <button
            onClick={loadRowCount}
            disabled={rowCount.loading}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >↻</button>
        </div>
      </div>

      {/* Phase 1 */}
      <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-bold text-slate-900">1. fázis — Magyarország telephelyek</p>
            <p className="text-xs text-slate-600">OSM <code className="text-[10px]">place=city|town|village|hamlet</code> csomópontok, ~10 000 sor, ~60 másodperc. Futtatható a felületen.</p>
            <p className="mt-1 text-[11px] text-slate-400">Forrás: Overpass API · Cél: Panellako <code className="text-[10px]">wzromwxpjlyrqbdiapep</code></p>
          </div>
          <button
            onClick={runPhase1}
            disabled={phase1Running || countyRunning !== null}
            className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {phase1Running ? 'Fut…' : 'Indítás'}
          </button>
        </div>
        {phase1Result && (
          <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${phase1Result.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
            {phase1Result.ok
              ? `✓ Kész — ${phase1Result.imported?.toLocaleString('en-US') ?? '?'} sor importálva, ${phase1Result.skipped ?? 0} kihagyva${phase1Result.note ? ` · ${phase1Result.note}` : ''}`
              : `✗ Hiba: ${phase1Result.error}`}
          </div>
        )}
      </div>

      {/* Phase 2 */}
      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
        <p className="mb-1 font-bold text-slate-900">2. fázis — Teljes cím-adatbázis (megyénként)</p>
        <p className="text-xs text-slate-600 mb-3">
          <code className="text-[10px]">addr:housenumber</code> + <code className="text-[10px]">addr:street</code> csomópontok, ~10–50 000 cím/megye.
          Minden megye 2–4 percet vesz igénybe. Futtasd megyénként — az upsert biztonságos, újra futtatható.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {COUNTIES.map(c => {
            const r = countyResults[c.name];
            return (
              <div key={c.name} className="flex items-center justify-between gap-2 rounded-lg border border-white bg-white px-3 py-2 shadow-sm">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{c.name}</p>
                  {r && (
                    <p className={`text-[11px] ${r.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                      {r.ok
                        ? `✓ ${r.imported?.toLocaleString('en-US') ?? '?'} sor`
                        : `✗ ${(r.error ?? '').slice(0, 60)}`}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => runCounty(c.name)}
                  disabled={countyRunning !== null || phase1Running}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
                    countyRunning === c.name
                      ? 'bg-amber-200 text-amber-800'
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
                >
                  {countyRunning === c.name ? 'Fut…' : r?.ok ? 'Újra' : 'Import'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
