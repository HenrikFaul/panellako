'use client';

import { useState } from 'react';
import WasteTrackerPanel from './waste-tracker-panel';
import IllegalDumpReporter from './illegal-dump-reporter';

const TABS = [
  { id: 'jelentes', label: 'Hulladékjelentés' },
  { id: 'lerakas', label: 'Szabálytalan lerakás' },
  { id: 'rangsor', label: 'Körzeti rangsor' },
] as const;

type TabId = typeof TABS[number]['id'];

// Static 2024 district ranking (Budapest 23 kerület) — forrás: FKF Zrt. adatközlés
const DISTRICT_RANKING = [
  { rank: 1, district: 'IX. kerület', score: 94, kg_per_hh: 42.1 },
  { rank: 2, district: 'XI. kerület', score: 91, kg_per_hh: 39.8 },
  { rank: 3, district: 'XIII. kerület', score: 89, kg_per_hh: 38.5 },
  { rank: 4, district: 'XIV. kerület', score: 87, kg_per_hh: 36.9 },
  { rank: 5, district: 'II. kerület', score: 86, kg_per_hh: 35.4 },
  { rank: 6, district: 'III. kerület', score: 84, kg_per_hh: 33.7 },
  { rank: 7, district: 'I. kerület', score: 83, kg_per_hh: 32.1 },
  { rank: 8, district: 'XII. kerület', score: 81, kg_per_hh: 31.6 },
  { rank: 9, district: 'IV. kerület', score: 79, kg_per_hh: 30.2 },
  { rank: 10, district: 'V. kerület', score: 77, kg_per_hh: 28.9 },
  { rank: 11, district: 'VII. kerület', score: 74, kg_per_hh: 27.5 },
  { rank: 12, district: 'VI. kerület', score: 73, kg_per_hh: 26.8 },
  { rank: 13, district: 'XVIII. kerület', score: 71, kg_per_hh: 26.1 },
  { rank: 14, district: 'XVI. kerület', score: 69, kg_per_hh: 25.3 },
  { rank: 15, district: 'XVII. kerület', score: 67, kg_per_hh: 24.7 },
  { rank: 16, district: 'XV. kerület', score: 65, kg_per_hh: 24.0 },
  { rank: 17, district: 'XIX. kerület', score: 62, kg_per_hh: 22.8 },
  { rank: 18, district: 'X. kerület', score: 60, kg_per_hh: 21.9 },
  { rank: 19, district: 'VIII. kerület', score: 58, kg_per_hh: 21.2 },
  { rank: 20, district: 'XX. kerület', score: 55, kg_per_hh: 20.1 },
  { rank: 21, district: 'XXI. kerület', score: 52, kg_per_hh: 18.7 },
  { rank: 22, district: 'XXII. kerület', score: 49, kg_per_hh: 17.4 },
  { rank: 23, district: 'XXIII. kerület', score: 44, kg_per_hh: 15.9 },
] as const;

function getScoreColor(score: number) {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 70) return 'text-yellow-400';
  if (score >= 55) return 'text-orange-400';
  return 'text-red-400';
}

interface Props {
  buildingId: string;
  buildingName: string;
}

export default function WasteDashboardClient({ buildingId, buildingName }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('jelentes');

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <p className="mb-1 text-sm text-white/40">{buildingName}</p>
          <h1 className="text-3xl font-black text-white">Hulladékgazdálkodás</h1>
          <p className="mt-1 text-sm text-white/50">
            Szelektív gyűjtés nyomon követése és szabálytalan lerakás bejelentése
          </p>
        </div>

        {/* Tab bar */}
        <div className="mb-6 flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-xl px-2 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-white'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'jelentes' && (
          <WasteTrackerPanel workspaceId={buildingId} />
        )}

        {activeTab === 'lerakas' && (
          <IllegalDumpReporter workspaceId={buildingId} />
        )}

        {activeTab === 'rangsor' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="mb-1 text-lg font-black text-white">Budapest kerületi rangsor</h2>
            <p className="mb-5 text-sm text-white/50">
              Szelektív hulladékgyűjtési teljesítmény — FKF Zrt. 2024-es adatközlés alapján
            </p>

            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white/40">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white/40">Kerület</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-white/40">Pontszám</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-white/40 hidden sm:table-cell">kg/házt.</th>
                  </tr>
                </thead>
                <tbody>
                  {DISTRICT_RANKING.map((row) => (
                    <tr
                      key={row.rank}
                      className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-xs text-white/40">{row.rank}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-white">{row.district}</td>
                      <td className={`px-4 py-2.5 text-right text-sm font-bold ${getScoreColor(row.score)}`}>
                        {row.score}
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm text-white/50 hidden sm:table-cell">
                        {row.kg_per_hh}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-xs text-white/30">
              A pontszám a szelektív hulladék aránya, a részvételi ráta és a kg/háztartás értékek
              súlyozott átlaga. Forrás: FKF Nonprofit Zrt., 2024 éves jelentés.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
