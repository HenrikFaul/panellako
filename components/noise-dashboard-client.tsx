'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
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
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <p className="mb-1 text-sm text-white/40">{buildingName}</p>
          <h1 className="text-3xl font-black text-white">Zajriporter</h1>
          <p className="mt-1 text-sm text-white/50">
            Rögzítse és kövesse az épülete körüli zajszennyezést
          </p>
        </div>

        {/* Tab bar */}
        <div className="mb-6 flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-900'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'terkep' && (
          <NoiseMap
            buildingLat={buildingLat}
            buildingLon={buildingLon}
            className="h-72 rounded-2xl overflow-hidden"
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
