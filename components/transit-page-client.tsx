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
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Page header */}
      <div className="border-b border-slate-800/60 px-6 py-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Élő adatok · BKK Zrt., CC BY 4.0</p>
        <h1 className="mt-0.5 text-xl font-black text-white">Közlekedés és tömegközlekedés</h1>
        <p className="mt-0.5 text-sm text-slate-500">{buildingName} · {buildingAddress}</p>
      </div>

      {/* Full-width transport panel */}
      <div className="p-4 md:p-6 space-y-4">
        <TransportPanel
          lat={buildingLat}
          lon={buildingLon}
          buildingAddress={buildingAddress}
          buildingId={buildingId}
        />

        {/* Cycling routes */}
        <div ref={cycleRef} className="mt-6">
          <div className="border-b border-slate-800/60 px-6 py-4">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Bike size={18} className="text-emerald-400" />
              Kerékpáros útvonalak
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">OpenStreetMap · Overpass API</p>
          </div>
          <div className="p-4 md:p-6">
            {loadingCycle ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <RefreshCw size={22} className="animate-spin text-slate-600" />
                <p className="text-xs text-slate-500">Betöltés…</p>
              </div>
            ) : errorCycle ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <p className="text-xs text-slate-500">Overpass API nem elérhető</p>
                <button type="button" onClick={fetchCycling}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-400 hover:bg-white/5">
                  Újrapróbálás
                </button>
              </div>
            ) : routes.length > 0 ? (
              <CyclingMap buildingLat={buildingLat} buildingLon={buildingLon} routes={routes} />
            ) : (
              <div className="flex flex-col items-center gap-2 py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
                <p className="text-xs text-slate-600">Betöltés…</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
