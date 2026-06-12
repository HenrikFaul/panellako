'use client';

import { useState } from 'react';
import SegmentedTabs from '@/components/ui/tabs';
import { BUDAPEST_INDICATORS, BUDAPEST_2030_PILLARS } from '@/lib/budapest-2030-data';
import Budapest2030IndicatorCard from '@/components/budapest-2030-indicator-card';
import Budapest2030PillarCard from '@/components/budapest-2030-pillar-card';
import PersonalImpactCalculator from '@/components/personal-impact-calculator';
import CityComparisonRadarChart from '@/components/city-comparison-radar-chart';
import type { IndicatorStatus } from '@/lib/budapest-2030-data';

type TabId = 'indikatorok' | 'celok' | 'hatas' | 'varosok';

const TABS: { id: TabId; label: string }[] = [
  { id: 'indikatorok', label: '11 Indikátor' },
  { id: 'celok',       label: 'Budapest 2030 Célok' },
  { id: 'hatas',       label: 'Személyes Hatás' },
  { id: 'varosok',     label: 'Városok' },
];

// ─── Summary stat card ────────────────────────────────────────────────────────

function SummaryCard({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
      <p className={`text-2xl font-semibold tabular-nums ${colorClass}`}>{value}</p>
      <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  buildingId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Budapest2030DashboardClient({ buildingId: _buildingId }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('indikatorok');

  // Summary stats
  const countByStatus = (s: IndicatorStatus) => BUDAPEST_INDICATORS.filter(i => i.status === s).length;
  const joCount       = countByStatus('jo');
  const kozepesCount  = countByStatus('kozepes');
  const kritikusCount = countByStatus('kritikus');
  const javulCount    = BUDAPEST_INDICATORS.filter(i => i.trend === 'javul').length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-slate-100 md:text-2xl">Budapest 2030</h1>
        <p className="text-sm text-slate-400">
          EU Zöld Főváros indikátorok és városfejlesztési célok nyomkövető
        </p>
        <p className="text-xs text-slate-500">
          Adatforrások: KSH, EEA, BKK Éves Jelentések, Budapest 2030 ITS Stratégia · Adatok: 2023
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Jó teljesítmény" value={joCount}       colorClass="text-emerald-400" />
        <SummaryCard label="Közepes"          value={kozepesCount} colorClass="text-amber-400"   />
        <SummaryCard label="Kritikus"          value={kritikusCount}colorClass="text-rose-400"    />
        <SummaryCard label="Javuló trend"      value={javulCount}  colorClass="text-sky-400"     />
      </div>

      {/* Tab navigation */}
      <SegmentedTabs
        tabs={TABS.map(tab => ({ key: tab.id, label: tab.label }))}
        active={activeTab}
        onChange={setActiveTab}
        ariaLabel="Budapest 2030 nézetek"
      />

      {/* Tab content */}
      <div>
        {/* TAB 1: 11 Indicators */}
        {activeTab === 'indikatorok' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Mind a 11 EU Zöld Főváros indikátor Budapest 2023-as adataival.
              </p>
              <div className="flex gap-2 text-[10px]">
                <span className="rounded-full bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25 px-2 py-0.5">JÓ = EU határ alatt</span>
                <span className="hidden sm:inline rounded-full bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/25 px-2 py-0.5">KÖZEPES = közel</span>
                <span className="hidden sm:inline rounded-full bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/25 px-2 py-0.5">KRITIKUS = messze</span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {BUDAPEST_INDICATORS.map(indicator => (
                <Budapest2030IndicatorCard key={indicator.id} indicator={indicator} />
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Budapest 2030 Goals */}
        {activeTab === 'celok' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-400">
                Budapest 2030 Integrált Területfejlesztési Stratégia (ITS) 5 pillére és célértékei.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {BUDAPEST_2030_PILLARS.map(pillar => (
                <Budapest2030PillarCard key={pillar.id} pillar={pillar} />
              ))}
            </div>
            {/* Legend */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">A Budapest 2030 stratégia pillérei</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                A Budapest 2030 Integrált Területfejlesztési Stratégia az EU-s kohéziós politika követelményeire épülve
                5 tematikus pillérbe szervezi Budapest fejlesztési prioritásait. Minden pillér mérő célértékeket tartalmaz,
                amelyek 2023-ban aktualizálásra kerültek a 2030-as határidőhöz közelítve. Az itt megjelenő adatok az
                éves monitoring riportokból származnak.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: Personal Impact */}
        {activeTab === 'hatas' && (
          <PersonalImpactCalculator />
        )}

        {/* TAB 4: City Comparison */}
        {activeTab === 'varosok' && (
          <CityComparisonRadarChart />
        )}
      </div>
    </div>
  );
}
