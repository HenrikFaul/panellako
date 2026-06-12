'use client';

import { useState } from 'react';
import type { BudapestIndicator, IndicatorStatus, TrendDirection } from '@/lib/budapest-2030-data';

// ─── Inline SVG sparkline ────────────────────────────────────────────────────

function MiniSparkline({ data }: { data: { year: number; value: number }[] }) {
  if (data.length < 2) return null;
  const W = 200;
  const H = 60;
  const values = data.map(d => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const step = W / (data.length - 1);

  const points = data.map((d, i) => {
    const x = i * step;
    const y = H - ((d.value - minV) / range) * (H * 0.85) - H * 0.075;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = points.map((p, i) => (i === 0 ? `M${p}` : `L${p}`)).join(' ');

  // filled area
  const areaD =
    `M${points[0]} ` +
    points.slice(1).map(p => `L${p}`).join(' ') +
    ` L${W},${H} L0,${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 60 }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sg)" />
      <path d={pathD} fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" />
      {/* First and last year labels */}
      <text x={2} y={H - 2} fontSize="8" fill="rgba(148,163,184,0.6)">{data[0].year}</text>
      <text x={W - 2} y={H - 2} fontSize="8" fill="rgba(148,163,184,0.6)" textAnchor="end">{data[data.length - 1].year}</text>
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: IndicatorStatus) {
  if (status === 'jo')       return { label: 'JÓ',      cls: 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25' };
  if (status === 'kozepes')  return { label: 'KÖZEPES', cls: 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/25' };
  return                            { label: 'KRITIKUS',cls: 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/25' };
}

function trendArrow(trend: TrendDirection) {
  if (trend === 'javul')  return { arrow: '↗', cls: 'text-emerald-400', label: 'javuló' };
  if (trend === 'stabil') return { arrow: '→', cls: 'text-amber-400',   label: 'stabil'  };
  return                         { arrow: '↘', cls: 'text-rose-400',    label: 'romló'   };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  indicator: BudapestIndicator;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Budapest2030IndicatorCard({ indicator }: Props) {
  const [expanded, setExpanded] = useState(false);
  const badge = statusBadge(indicator.status);
  const trend = trendArrow(indicator.trend);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 flex flex-col gap-3 hover:border-white/[0.12] transition-colors">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {indicator.categoryHu}
          </p>
          <h3 className="text-sm font-semibold text-slate-100 leading-tight">{indicator.nameHu}</h3>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* Values row */}
      <div className="flex items-end gap-4">
        <div>
          <p className="text-2xl font-semibold text-slate-100 tabular-nums">
            {indicator.currentValue}
            <span className="ml-1 text-xs font-normal text-slate-400">{indicator.unit}</span>
          </p>
          <p className="text-[10px] text-slate-500">Jelenlegi érték ({indicator.currentYear})</p>
        </div>
        <div className="ml-auto text-right">
          <p className={`text-lg font-semibold tabular-nums ${trend.cls}`}>
            {trend.arrow}
          </p>
          <p className={`text-[10px] font-semibold ${trend.cls}`}>{trend.label}</p>
        </div>
      </div>

      {/* Targets row */}
      <div className="flex gap-3 text-[11px]">
        <div className="flex flex-col items-center rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1">
          <span className="text-slate-500">EU határ</span>
          <span className="font-semibold text-slate-100 tabular-nums">{indicator.euThreshold} {indicator.unit}</span>
        </div>
        <div className="flex flex-col items-center rounded-lg bg-sky-500/10 ring-1 ring-sky-500/25 px-2 py-1">
          <span className="text-sky-400">2030 cél</span>
          <span className="font-semibold text-sky-300 tabular-nums">{indicator.target2030} {indicator.unit}</span>
        </div>
      </div>

      {/* Sparkline */}
      <div>
        <p className="mb-1 text-[10px] text-slate-500">Történeti trend ({indicator.baselineYear}–{indicator.currentYear})</p>
        <MiniSparkline data={indicator.historicalData} />
      </div>

      {/* Description */}
      <p className="text-[11px] leading-relaxed text-slate-400">{indicator.descriptionHu}</p>

      {/* Expand/collapse tips */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition-colors"
      >
        <span>{expanded ? '▲' : '▼'}</span>
        <span>Mit tehetsz te? ({indicator.residentActionHu.length} tipp)</span>
      </button>
      {expanded && (
        <ul className="space-y-1.5">
          {indicator.residentActionHu.map((tip, i) => (
            <li key={i} className="flex gap-2 text-[11px] text-slate-300">
              <span className="mt-0.5 shrink-0 text-sky-400">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Data source */}
      <p className="text-[9px] text-slate-600">Forrás: {indicator.dataSourceHu}</p>
    </div>
  );
}
