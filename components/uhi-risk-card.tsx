'use client';

import { UHIResult } from '@/lib/uhi-calculator';

interface Props {
  result: UHIResult;
}

const CATEGORY_LABELS: Record<string, string> = {
  alacsony: 'ALACSONY',
  kozepes:  'KÖZEPES',
  magas:    'MAGAS',
  kritikus: 'KRITIKUS',
};

const KLIMA_LABELS: Record<string, string> = {
  'kiváló':   'Kiváló',
  'jó':       'Jó',
  'közepes':  'Közepes',
  'rossz':    'Rossz',
  'kritikus': 'Kritikus',
};

const KLIMA_COLORS: Record<string, string> = {
  'kiváló':   'text-emerald-400',
  'jó':       'text-green-400',
  'közepes':  'text-yellow-400',
  'rossz':    'text-orange-400',
  'kritikus': 'text-red-500',
};

export default function UHIRiskCard({ result }: Props) {
  const {
    uhiCelsius,
    uhiCategory,
    klimaScore,
    klimaCategory,
    colorHex,
    factors,
  } = result;

  const barWidth = Math.round((klimaScore / 100) * 100);
  const barColor =
    klimaScore >= 80 ? '#34d399'
    : klimaScore >= 65 ? '#4ade80'
    : klimaScore >= 50 ? '#eab308'
    : klimaScore >= 35 ? '#f97316'
    : '#ef4444';

  return (
    <div className="rounded-2xl bg-slate-900 border border-white/10 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
            Hőszigat hatás
          </p>
          <p className="text-slate-300 text-sm max-w-xs">
            Becsült hőmérsékleti többlet a vidéki referenciához képest (Oke 1982 alapján)
          </p>
        </div>
        {/* Big °C ring */}
        <div className="relative flex-shrink-0 flex items-center justify-center w-24 h-24">
          <svg viewBox="0 0 96 96" className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="48" cy="48" r="40" fill="none" stroke="#1e293b" strokeWidth="8" />
            <circle
              cx="48" cy="48" r="40"
              fill="none"
              stroke={colorHex}
              strokeWidth="8"
              strokeDasharray={`${(Math.min(uhiCelsius, 6) / 6) * 251.3} 251.3`}
              strokeLinecap="round"
            />
          </svg>
          <div className="relative text-center">
            <span className="text-2xl font-bold text-white">+{uhiCelsius.toFixed(1)}</span>
            <span className="block text-xs text-slate-400">°C</span>
          </div>
        </div>
      </div>

      {/* Category badge */}
      <div className="flex items-center gap-3">
        <span
          className="px-3 py-1 rounded-full text-xs font-bold tracking-wider"
          style={{ backgroundColor: colorHex + '22', color: colorHex, border: `1px solid ${colorHex}44` }}
        >
          {CATEGORY_LABELS[uhiCategory] ?? uhiCategory.toUpperCase()}
        </span>
        <span className="text-sm text-slate-400">
          hősziget intenzitás
        </span>
      </div>

      {/* KlímaScore */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">KlímaScore</span>
          <span className={`text-lg font-bold ${KLIMA_COLORS[klimaCategory] ?? 'text-white'}`}>
            {klimaScore}/100 — {KLIMA_LABELS[klimaCategory] ?? klimaCategory}
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${barWidth}%`, backgroundColor: barColor }}
          />
        </div>
        <p className="text-xs text-slate-500">
          Összetett klímakomfort-mutató: UHI (40pt) + levegőminőség (30pt) + árvízkockázat (30pt)
        </p>
      </div>

      {/* Sub-indicators */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-white">{factors.buildingDensityPercent}<span className="text-base text-slate-400">%</span></p>
          <p className="text-xs text-slate-400 mt-0.5">Beépítettség</p>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{factors.greenCoveragePercent}<span className="text-base text-slate-400">%</span></p>
          <p className="text-xs text-slate-400 mt-0.5">Zöldfelület</p>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-sky-400">
            {factors.nearestParkDistanceM >= 999
              ? '—'
              : factors.nearestParkDistanceM < 1000
              ? `${factors.nearestParkDistanceM}`
              : `${(factors.nearestParkDistanceM / 1000).toFixed(1)}k`}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Park (m)</p>
        </div>
      </div>

      {/* Proximity badges */}
      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
          factors.hasWaterBody500m
            ? 'bg-sky-900/40 text-sky-300 border border-sky-700/40'
            : 'bg-slate-800/40 text-slate-500 border border-white/5'
        }`}>
          {factors.hasWaterBody500m ? '✓' : '✗'} Víztest 500m-en belül
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
          factors.hasPark300m
            ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40'
            : 'bg-slate-800/40 text-slate-500 border border-white/5'
        }`}>
          {factors.hasPark300m ? '✓' : '✗'} Park 300m-en belül
        </span>
      </div>

      {/* Source note */}
      <p className="text-xs text-slate-600">
        OSM alapú becslés · Unger J. (2010), Oke (1982) · Budapest városi hőtöbblet átlag: +4–6°C
      </p>
    </div>
  );
}
