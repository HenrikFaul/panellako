'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import TransportPanel from '@/components/transport-panel';
import CyclingMap from '@/components/cycling-map';
import type { CyclingFeature } from '@/app/api/cycling/route';
import { Bike, RefreshCw } from 'lucide-react';

interface Props {
  buildingId:      string;
  buildingName:    string;
  buildingAddress: string;
  buildingLat:     number;
  buildingLon:     number;
}

export default function TransitPageClient({
  buildingId,
  buildingName,
  buildingAddress,
  buildingLat,
  buildingLon,
}: Props) {
  const [routes,       setRoutes]       = useState<CyclingFeature[]>([]);
  const [loadingCycle, setLoadingCycle] = useState(false);
  const [errorCycle,   setErrorCycle]   = useState(false);
  const cycleRef     = useRef<HTMLDivElement>(null);
  const cycleLoaded  = useRef(false);

  const fetchCycling = useCallback(async () => {
    setLoadingCycle(true); setErrorCycle(false);
    try { setRoutes(await fetch('/api/cycling').then(r => r.json() as Promise<CyclingFeature[]>)); }
    catch { setErrorCycle(true); }
    setLoadingCycle(false);
  }, []);

  useEffect(() => {
    const el = cycleRef.current; if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !cycleLoaded.current) { cycleLoaded.current = true; void fetchCycling(); }
    }, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, [fetchCycling]);

  return (
    <div className="min-h-screen text-slate-800">
      {/* Page header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">Élő adatok · BKK Zrt., CC BY 4.0</p>
        <h1 className="mt-1 text-xl font-semibold tracking-[-0.015em] text-slate-900">Közlekedés és tömegközlekedés</h1>
        <p className="mt-1 text-sm text-slate-700">{buildingName} · {buildingAddress}</p>
      </div>

      {/* Full-width transport panel */}
      <div className="space-y-5 p-4 md:p-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.28)] md:p-5">
          <TransportPanel
            lat={buildingLat}
            lon={buildingLon}
            buildingAddress={buildingAddress}
            buildingId={buildingId}
          />
        </section>

        {/* Cycling routes */}
        <div ref={cycleRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_-28px_rgba(15,23,42,0.28)]">
          <div className="border-b border-slate-200 px-5 py-4 md:px-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Bike size={18} className="text-emerald-700" />
              Kerékpáros útvonalak
            </h2>
            <p className="mt-1 text-xs text-slate-700">OpenStreetMap · Overpass API</p>
          </div>
          <div className="p-4 md:p-6">
            {loadingCycle ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <RefreshCw size={22} className="animate-spin text-slate-700" />
                <p className="text-xs text-slate-700">Betöltés…</p>
              </div>
            ) : errorCycle ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <p className="text-xs text-slate-700">Overpass API nem elérhető</p>
                <button type="button" onClick={fetchCycling}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800">
                  Újrapróbálás
                </button>
              </div>
            ) : routes.length > 0 ? (
              <CyclingMap buildingLat={buildingLat} buildingLon={buildingLon} routes={routes} />
            ) : (
              <div className="flex flex-col items-center gap-2 py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
                <p className="text-xs text-slate-700">Betöltés…</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
