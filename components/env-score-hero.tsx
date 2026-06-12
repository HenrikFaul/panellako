'use client';

import { useEffect, useState } from 'react';
import { Wind, Leaf, Flower2, Sun, Volume2 } from 'lucide-react';
import type { EnvScore } from '@/app/api/environment/score/route';

interface Props {
  score:   EnvScore | null;
  loading: boolean;
}

const CIRCUMFERENCE = 2 * Math.PI * 65; // r=65

export default function EnvScoreHero({ score, loading }: Props) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    if (!score) return;
    const t = setTimeout(() => setAnimated(score.total), 50);
    return () => clearTimeout(t);
  }, [score]);

  const strokeDash = `${(animated / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`;

  const components = score ? [
    { label: 'Levegőminőség', score: score.airScore,    max: 35, Icon: Wind,    color: '#38bdf8' },
    { label: 'Zöld index',    score: score.greenScore,  max: 25, Icon: Leaf,    color: '#22c55e' },
    { label: 'Pollen',        score: score.pollenScore, max: 15, Icon: Flower2, color: '#a78bfa' },
    { label: 'UV-sugárzás',   score: score.uvScore,     max: 10, Icon: Sun,     color: '#eab308' },
    { label: 'Zajszint',      score: score.noiseScore,  max: 15, Icon: Volume2, color: '#94a3b8' },
  ] : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="h-36 w-36 rounded-full bg-white/[0.06] animate-pulse" />
        <div className="h-3 w-24 rounded bg-white/[0.06] animate-pulse" />
        <div className="w-full space-y-2 max-w-xs">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-6 rounded-lg bg-white/[0.06] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!score) {
    return (
      <div className="flex flex-col items-center gap-2 py-8">
        <p className="text-[11px] text-slate-600">Pontszám kiszámítása…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Circular gauge */}
      <div className="relative">
        <svg viewBox="0 0 160 160" className="h-36 w-36" style={{ transform: 'rotate(-90deg)' }}>
          {/* Background ring */}
          <circle cx="80" cy="80" r="65" fill="none" stroke="white" strokeOpacity="0.07" strokeWidth="12" />
          {/* Animated score arc */}
          <circle
            cx="80" cy="80" r="65" fill="none"
            stroke={score.color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={strokeDash}
            style={{
              transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)',
              filter: `drop-shadow(0 0 8px ${score.color}60)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: 4 }}>
          <span className="text-3xl font-semibold tabular-nums leading-none" style={{ color: score.color }}>
            {score.total}
          </span>
          <span className="text-[9px] text-slate-500 mt-0.5">/ 100</span>
          <span className="text-[11px] font-bold mt-1" style={{ color: score.color }}>
            {score.label}
          </span>
        </div>
      </div>

      {/* Components */}
      <div className="w-full max-w-xs space-y-2">
        {components.map(c => (
          <div key={c.label} className="flex items-center gap-2">
            <c.Icon size={12} className="shrink-0" style={{ color: c.color }} />
            <span className="w-28 shrink-0 text-[10px] text-slate-500">{c.label}</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width:      `${(c.score / c.max) * 100}%`,
                  background: c.color,
                  boxShadow:  `0 0 4px ${c.color}60`,
                }}
              />
            </div>
            <span className="w-10 text-right text-[10px] tabular-nums text-slate-400">{c.score}/{c.max}</span>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-slate-700">Budapest átlag: ~58/100</p>
    </div>
  );
}
