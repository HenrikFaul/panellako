'use client';

import { useEffect, useState } from 'react';
import { UHIResult } from '@/lib/uhi-calculator';
import UHIRiskCard from '@/components/uhi-risk-card';
import UHIMonthlyChart from '@/components/uhi-monthly-chart';
import CoolSpotsList from '@/components/cool-spots-list';
import ClimateActionPlan from '@/components/climate-action-plan';

interface Props {
  lat: number;
  lon: number;
  buildingId: string;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-800/60 rounded-xl ${className ?? ''}`} />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}

export default function HeatIslandDashboardClient({ lat, lon, buildingId }: Props) {
  const [data, setData] = useState<UHIResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const url = `/api/environment/heat-island?lat=${lat}&lon=${lon}&buildingId=${buildingId}`;

    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<UHIResult>;
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[HeatIslandDashboard] fetch failed:', err);
          setError('Az adatok betöltése nem sikerült. Kérjük, próbálja újra.');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [lat, lon, buildingId]);

  if (loading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-red-900/40 p-6 text-center">
        <p className="text-red-400 text-sm">{error ?? 'Ismeretlen hiba történt.'}</p>
        <button
          onClick={() => { setLoading(true); setError(null); }}
          className="mt-3 text-xs text-slate-400 hover:text-white underline underline-offset-2"
        >
          Újrapróbálás
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* UHI Risk Card */}
      <UHIRiskCard result={data} />

      {/* Monthly Chart */}
      <UHIMonthlyChart data={data.monthlyUHI} />

      {/* Cool Spots */}
      <CoolSpotsList spots={data.coolSpots} />

      {/* Climate Action Plan */}
      <ClimateActionPlan />
    </div>
  );
}
