'use client';

import { useCallback, useEffect, useState } from 'react';
import { Wind, Bike, ArrowLeft, RefreshCw } from 'lucide-react';
import AirQualitySection from '@/components/air-quality-section';
import CyclingMap from '@/components/cycling-map';
import type { CyclingFeature } from '@/app/api/cycling/route';

// ─── Tab type ─────────────────────────────────────────────────────────────────
type Tab = 'air' | 'cycling';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'air',     label: 'Levegőminőség',        icon: <Wind size={15} />  },
  { id: 'cycling', label: 'Kerékpáros útvonalak', icon: <Bike size={15} />  },
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  buildingId:      string;
  buildingName:    string;
  buildingAddress: string;
  buildingLat:     number;
  buildingLon:     number;
}

export default function EnvironmentPageClient({
  buildingId, buildingName, buildingAddress, buildingLat, buildingLon,
}: Props) {
  const [tab, setTab]           = useState<Tab>('air');
  const [routes, setRoutes]     = useState<CyclingFeature[]>([]);
  const [cycleLoading, setCycleLoading] = useState(false);
  const [cycleError, setCycleError]     = useState(false);

  // Fetch cycling routes when that tab is first opened
  const fetchRoutes = useCallback(async () => {
    setCycleLoading(true);
    setCycleError(false);
    try {
      const data = await fetch('/api/cycling').then(r => r.json() as Promise<CyclingFeature[]>);
      setRoutes(data);
    } catch {
      setCycleError(true);
    }
    setCycleLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'cycling' && routes.length === 0 && !cycleLoading) {
      fetchRoutes();
    }
  }, [tab, routes.length, cycleLoading, fetchRoutes]);

  return (
    <div className="min-h-screen bg-[#070d1a]">

      {/* ── Top navigation bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#070d1a]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <a
            href={`/w/${buildingId}`}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={14} />
            Vissza
          </a>
          <div className="h-4 w-px bg-white/[0.10]" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[11px] font-black text-slate-200 leading-tight">
              {buildingName}
            </span>
            <span className="truncate text-[9px] text-slate-500">{buildingAddress}</span>
          </div>
          <span className="hidden rounded-full border border-white/[0.08] px-3 py-0.5 text-[9px] font-bold text-slate-500 sm:inline">
            Környezet
          </span>
        </div>

        {/* Tab row */}
        <div className="mx-auto flex max-w-6xl gap-0 px-4 sm:px-6">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 border-b-2 px-4 pb-3 pt-1 text-[11px] font-bold transition-all cursor-pointer ${
                tab === t.id
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Page content ───────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">

        {/* Air Quality tab */}
        {tab === 'air' && (
          <AirQualitySection
            buildingLat={buildingLat}
            buildingLon={buildingLon}
            buildingAddress={buildingAddress}
          />
        )}

        {/* Cycling routes tab */}
        {tab === 'cycling' && (
          <section className="overflow-hidden rounded-[2rem] bg-[#060c18] text-white shadow-2xl shadow-black/40">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <div className="flex items-center gap-2">
                <Bike size={18} className="text-emerald-400" />
                <span className="text-sm font-black tracking-tight">Kerékpáros útvonalak</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/10 px-3 py-0.5 text-[10px] font-bold text-emerald-400">
                  {buildingAddress}
                </span>
                <span className="rounded-full border border-white/[0.07] px-2.5 py-0.5 text-[9px] text-slate-500">
                  OSM · Overpass
                </span>
                {!cycleLoading && (
                  <button
                    type="button"
                    onClick={fetchRoutes}
                    className="rounded-xl p-1.5 text-slate-600 hover:text-slate-400 hover:bg-white/[0.05] transition-colors cursor-pointer"
                    title="Frissítés"
                  >
                    <RefreshCw size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="p-6">
              {cycleLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16">
                  <RefreshCw size={22} className="animate-spin text-slate-600" />
                  <p className="text-[11px] text-slate-500">OpenStreetMap Overpass API lekérdezés…</p>
                  <p className="text-[9px] text-slate-700">Első betöltés akár 10–15 másodpercet vehet igénybe</p>
                </div>
              ) : cycleError ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12">
                  <p className="text-[11px] text-slate-500">Overpass API nem elérhető</p>
                  <button
                    type="button"
                    onClick={fetchRoutes}
                    className="rounded-xl border border-white/[0.1] px-4 py-2 text-[10px] font-bold text-slate-400 hover:bg-white/[0.05] transition-colors cursor-pointer"
                  >
                    Újrapróbálás
                  </button>
                </div>
              ) : (
                <CyclingMap
                  buildingLat={buildingLat}
                  buildingLon={buildingLon}
                  routes={routes}
                />
              )}
            </div>

            {/* Data source note */}
            <div className="border-t border-white/[0.06] px-6 py-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">Adatforrás</p>
                  <p className="text-[10px] leading-relaxed text-slate-400">
                    OpenStreetMap — önkéntes közösség által karbantartott, percenként frissülő kerékpár-infrastruktúra adatok. Lekérdezés: Overpass API.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">Réteg típusok</p>
                  <ul className="space-y-1 text-[9px] text-slate-500">
                    <li><span className="text-[#22c55e] font-bold">Zöld</span> — Önálló kerékpárút (highway=cycleway)</li>
                    <li><span className="text-[#a78bfa] font-bold">Lila</span> — Védett sáv (cycleway=track)</li>
                    <li><span className="text-[#60a5fa] font-bold">Kék</span> — Jelölt sáv úttesten</li>
                    <li><span className="text-[#f97316] font-bold">Narancs</span> — Vegyes forgalmú</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">Frissítési ciklus</p>
                  <p className="text-[10px] leading-relaxed text-slate-400">
                    Az adatok 60 percenként frissülnek. Budapest kerékpárútjai az OSM-en folyamatosan frissülnek — BKK és kerületi fejlesztések is megjelennek.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
