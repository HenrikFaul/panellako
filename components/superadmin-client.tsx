'use client';

import { useState } from 'react';

type Job = { id: string; label: string; description: string };
const JOBS: Job[] = [
  { id: 'bkk_full_sync', label: 'BKK teljes szinkron', description: 'stops/routes + building_stops + alerts' },
  { id: 'bkk_stops_routes', label: 'BKK stops/routes', description: 'transit_stops, transit_routes, transit_stop_routes' },
  { id: 'bkk_building_stops', label: 'Building stops', description: 'building_stops újraszámítás' },
  { id: 'bkk_alerts', label: 'BKK alerts', description: 'transit_alerts frissítés' },
  { id: 'air_quality_refresh', label: 'Levegőminőség frissítés', description: 'AQI + heatmap párhuzamos frissítés' },
];

export default function SuperadminClient() {
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, unknown>>({});

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
  }

  async function logout() {
    await fetch('/api/superadmin/logout', { method: 'POST' });
    window.location.href = '/superadmin/login';
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Platform Vezérlőpult</h1>
            <p className="text-sm text-slate-500">Integrációk állapota és manuális job indítások</p>
          </div>
          <button onClick={logout} className="btn-secondary px-4 py-2">Kijelentkezés</button>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          {[
            ['BKK Futár', 'Aktív (env kulcs alapján)', 'BKKFUTAR_API_KEY'],
            ['Supabase', 'Aktív (env kulcs alapján)', 'NEXT_PUBLIC_SUPABASE_URL'],
            ['Air Quality', 'Aktív (env kulcs alapján)', 'AQICN_API_TOKEN'],
          ].map(([name, status, key]) => (
            <div key={name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700">{name}</h3>
              <p className="mt-2 text-lg font-black text-emerald-600">{status}</p>
              <p className="mt-1 text-xs text-slate-500">Kulcs: {key}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Ütemezett feladatok / Manuális indítás</h2>
          <div className="mt-4 space-y-3">
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
                  <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(results[j.id], null, 2)}</pre>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
