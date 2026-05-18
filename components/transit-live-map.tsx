'use client';

import dynamic from 'next/dynamic';
import type { NearbyStop } from '@/app/api/transit/nearby/route';

const Inner = dynamic(() => import('./transit-live-map-inner'), {
  ssr:     false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-xl bg-slate-800/40">
      <span className="text-[10px] text-slate-600">Térkép betöltése…</span>
    </div>
  ),
});

export default function TransitLiveMap({
  lat, lon, stops,
}: {
  lat:   number;
  lon:   number;
  stops: NearbyStop[];
}) {
  return <Inner lat={lat} lon={lon} stops={stops} />;
}
