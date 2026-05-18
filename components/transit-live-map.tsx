'use client';

import dynamic from 'next/dynamic';
import { forwardRef } from 'react';
import type { NearbyStop } from '@/app/api/transit/nearby/route';
import type { TransitLiveMapHandle } from './transit-live-map-inner';

const Inner = dynamic(() => import('./transit-live-map-inner'), {
  ssr:     false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-xl bg-slate-800/40">
      <span className="text-[10px] text-slate-600">Térkép betöltése…</span>
    </div>
  ),
});

export type { TransitLiveMapHandle };

const TransitLiveMap = forwardRef<TransitLiveMapHandle, {
  lat:   number;
  lon:   number;
  stops: NearbyStop[];
}>(function TransitLiveMap({ lat, lon, stops }, ref) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Inner ref={ref as any} lat={lat} lon={lon} stops={stops} />;
});

export default TransitLiveMap;
