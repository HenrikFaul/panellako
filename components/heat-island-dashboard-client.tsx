'use client';

import { useEffect, useState } from 'react';
import { UHIResult } from '@/lib/uhi-calculator';
import UHIRiskCard from '@/components/uhi-risk-card';
import UHIMonthlyChart from '@/components/uhi-monthly-chart';
import CoolSpotsList from '@/components/cool-spots-list';
import ClimateActionPlan from '@/components/climate-action-plan';
import { SkeletonGroup } from '@/components/ui/skeleton';
import ErrorState from '@/components/ui/error-state';

interface Props {
  lat: number;
  lon: number;
  buildingId: string;
}

export default function HeatIslandDashboardClient({ lat, lon, buildingId }: Props) {
  const [data, setData] = useState<UHIResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Bug fix (v0.9.33): retry previously only reset state without re-running the
  // effect (deps never changed), leaving the page on the skeleton forever.
  const [retryToken, setRetryToken] = useState(0);

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
  }, [lat, lon, buildingId, retryToken]);

  if (loading) return <SkeletonGroup rows={3} />;

  if (error || !data) {
    return (
      <ErrorState
        title="Hősziget-adatok jelenleg nem elérhetők"
        message={error ?? 'Ismeretlen hiba történt.'}
        onRetry={() => setRetryToken((t) => t + 1)}
      />
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
