'use client';

import type { Budapest2030Pillar } from '@/lib/budapest-2030-data';

interface Props {
  pillar: Budapest2030Pillar;
}

export default function Budapest2030PillarCard({ pillar }: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5 flex flex-col gap-4 hover:border-white/20 transition-colors">
      {/* Pillar header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl" role="img" aria-label={pillar.nameHu}>{pillar.icon}</span>
        <h3 className={`text-lg font-black ${pillar.colorClass}`}>{pillar.nameHu}</h3>
      </div>

      {/* Goals */}
      <div className="flex flex-col gap-4">
        {pillar.goals.map(goal => (
          <div key={goal.id} className="flex flex-col gap-1.5">
            {/* Goal name + values */}
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[12px] font-semibold text-white leading-tight">{goal.nameHu}</p>
              <p className="shrink-0 text-[11px] font-bold text-white tabular-nums">
                <span className={pillar.colorClass}>{goal.currentValue}</span>
                <span className="text-slate-500"> / {goal.targetValue}</span>
              </p>
            </div>

            {/* Progress bar */}
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${goal.progressPercent}%`,
                  background: getBarColor(goal.progressPercent, pillar.colorClass),
                }}
              />
            </div>

            {/* Progress % + unit */}
            <div className="flex items-center justify-between">
              <p className="text-[9px] text-slate-500">{goal.unit}</p>
              <p className="text-[10px] font-bold text-slate-400">{goal.progressPercent}%</p>
            </div>

            {/* Data source */}
            <p className="text-[9px] text-slate-600">Forrás: {goal.dataSourceHu}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper: pick a gradient color based on progress and pillar accent
function getBarColor(pct: number, colorClass: string): string {
  // Use pillar color at high progress, amber at medium, red at low
  if (pct >= 75) {
    if (colorClass.includes('sky'))     return 'linear-gradient(90deg, #0ea5e9, #38bdf8)';
    if (colorClass.includes('emerald')) return 'linear-gradient(90deg, #10b981, #34d399)';
    if (colorClass.includes('amber'))   return 'linear-gradient(90deg, #d97706, #fbbf24)';
    if (colorClass.includes('rose'))    return 'linear-gradient(90deg, #e11d48, #fb7185)';
    if (colorClass.includes('violet'))  return 'linear-gradient(90deg, #7c3aed, #a78bfa)';
    return 'linear-gradient(90deg, #6366f1, #818cf8)';
  }
  if (pct >= 50) return 'linear-gradient(90deg, #d97706, #fbbf24)';
  return 'linear-gradient(90deg, #dc2626, #f87171)';
}
