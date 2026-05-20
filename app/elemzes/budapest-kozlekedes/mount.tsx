'use client';

// Client-only mount wrapper — Leaflet has zero SSR support (it touches `window`
// at import time), so we use `next/dynamic` with `ssr: false`. This is only
// permitted inside a 'use client' module, which is why this thin wrapper exists.

import dynamic from 'next/dynamic';

const BudapestTransitAnalysis = dynamic(
  () => import('@/components/budapest-transit-analysis'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[60vh] items-center justify-center rounded-2xl bg-slate-100">
        <p className="text-xs font-bold text-slate-500 animate-pulse">Térkép betöltése…</p>
      </div>
    ),
  },
);

export default function BudapestTransitAnalysisMount() {
  return <BudapestTransitAnalysis />;
}
