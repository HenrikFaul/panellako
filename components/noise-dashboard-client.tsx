'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import SegmentedTabs from '@/components/ui/tabs';
import NoiseReportForm from './noise-report-form';
import NoiseHeatmap from './noise-heatmap';
import NoiseHealthAdvisory from './noise-health-advisory';

const NoiseMap = dynamic(() => import('./noise-map'), { ssr: false });

const TABS = [
  { id: 'terkep',      label: 'Térkép' },
  { id: 'bejeleentes', label: 'Bejelentés' },
  { id: 'naptar',      label: 'Naptár' },
  { id: 'egeszseg',    label: 'Egészségügyi tanácsok' },
] as const;

type TabId = typeof TABS[number]['id'];

interface Props {
  buildingId:   string;
  buildingName: string;
  buildingLat:  number;
  buildingLon:  number;
}

export default function NoiseDashboardClient({ buildingId, buildingName, buildingLat, buildingLon }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('terkep');

  return (
    <div className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <p className="mb-1 text-xs text-slate-500">{buildingName}</p>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100 md:text-2xl">Zajriporter</h1>
          <p className="mt-1 text-sm text-slate-400">
            Rögzítse és kövesse az épülete körüli zajszennyezést
          </p>
        </div>

        {/* Tab bar */}
        <SegmentedTabs
          tabs={TABS.map((tab) => ({ key: tab.id, label: tab.label }))}
          active={activeTab}
          onChange={setActiveTab}
          ariaLabel="Zajriporter nézetek"
          className="mb-6"
        />

        {/* Tab content */}
        {activeTab === 'terkep' && (
          <NoiseMap
            buildingLat={buildingLat}
            buildingLon={buildingLon}
            className="h-[420px] rounded-2xl border border-white/[0.08] overflow-hidden"
          />
        )}

        {activeTab === 'bejeleentes' && (
          <NoiseReportForm workspaceId={buildingId} />
        )}

        {activeTab === 'naptar' && (
          <NoiseHeatmap workspaceId={buildingId} />
        )}

        {activeTab === 'egeszseg' && (
          <NoiseHealthAdvisory />
        )}
      </div>
    </div>
  );
}
