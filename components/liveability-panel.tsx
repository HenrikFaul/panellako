'use client';

import type { LiveabilityData } from '@/app/api/environment/urban/route';

// ─── Pure SVG radar/spider chart ─────────────────────────────────────────────

function RadarChart({ dimensions }: { dimensions: LiveabilityData['dimensions'] }) {
  const N   = dimensions.length;   // 6
  const CX  = 150, CY = 150, R = 110;
  const LEVELS = [20, 40, 60, 80, 100];

  function axisPoint(i: number, radius: number): [number, number] {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
    return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)];
  }

  function labelPoint(i: number): [number, number] {
    const [x, y] = axisPoint(i, R + 22);
    return [x, y];
  }

  // Data polygon
  const dataPts = dimensions.map((d, i) => axisPoint(i, (d.score / 100) * R));
  const polyline = dataPts.map(([x, y]) => `${x},${y}`).join(' ');
  // Average benchmark (60/100)
  const avgPts = dimensions.map((_, i) => axisPoint(i, 0.60 * R));
  const avgLine = avgPts.map(([x, y]) => `${x},${y}`).join(' ');

  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-xs mx-auto" aria-label="Liveability radar chart">
      <defs>
        <radialGradient id="radarGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
          <stop offset="100%" stopColor="#22c55e" stopOpacity={0.03} />
        </radialGradient>
      </defs>

      {/* Grid levels */}
      {LEVELS.map(lvl => {
        const pts = Array.from({ length: N }, (_, i) => axisPoint(i, (lvl / 100) * R));
        return (
          <polygon key={lvl}
            points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
            fill="none" stroke="#ffffff10" strokeWidth={1} />
        );
      })}

      {/* Axis lines */}
      {dimensions.map((_, i) => {
        const [x, y] = axisPoint(i, R);
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#ffffff10" strokeWidth={1} />;
      })}

      {/* Budapest avg benchmark */}
      <polygon points={avgLine} fill="none" stroke="#eab308" strokeWidth={1}
        strokeDasharray="3 3" strokeOpacity={0.4} />

      {/* Data area */}
      <polygon points={polyline} fill="url(#radarGrad)" stroke="#22c55e" strokeWidth={2}
        strokeLinejoin="round" />

      {/* Data vertices */}
      {dataPts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill={dimensions[i].color} stroke="#0a0f1e" strokeWidth={1.5} />
      ))}

      {/* Labels */}
      {dimensions.map((d, i) => {
        const [x, y] = labelPoint(i);
        const anchor = x < CX - 5 ? 'end' : x > CX + 5 ? 'start' : 'middle';
        return (
          <g key={i}>
            <text x={x} y={y - 2} textAnchor={anchor} fontSize={9} fill="#94a3b8" fontWeight={700}>
              {d.icon} {d.label}
            </text>
            <text x={x} y={y + 9} textAnchor={anchor} fontSize={8} fill={d.color} fontWeight={900}>
              {d.score}
            </text>
          </g>
        );
      })}

      {/* Center */}
      <circle cx={CX} cy={CY} r={3} fill="#475569" />

      {/* Avg legend */}
      <line x1={200} y1={278} x2={215} y2={278} stroke="#eab308" strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.5} />
      <text x={218} y={281} fontSize={7} fill="#78716c">Budapest átlag (~60)</text>
    </svg>
  );
}

// ─── Dimension card ───────────────────────────────────────────────────────────

function DimCard({ dim }: { dim: LiveabilityData['dimensions'][0] }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-base">{dim.icon}</span>
        <span className="text-[10px] font-black text-slate-200">{dim.label}</span>
        <span className="ml-auto text-sm font-black tabular-nums" style={{ color: dim.color }}>{dim.score}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${dim.score}%`, background: dim.color }} />
      </div>
    </div>
  );
}

// ─── Total score ring ─────────────────────────────────────────────────────────

function ScoreRing({ score, color, label }: { score: number; color: string; label: string }) {
  const R = 52, C = 2 * Math.PI * R;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 130 130" className="w-32 h-32">
        <circle cx={65} cy={65} r={R} fill="none" stroke="#ffffff08" strokeWidth={10} />
        <circle cx={65} cy={65} r={R} fill="none" stroke={color} strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * C} ${C}`}
          strokeDashoffset={C / 4}
          style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 8px ${color}80)` }} />
        <text x={65} y={61} textAnchor="middle" fontSize={26} fontWeight={900} fill={color}>{score}</text>
        <text x={65} y={73} textAnchor="middle" fontSize={9} fill="#94a3b8">/ 100</text>
      </svg>
      <p className="text-[10px] font-black" style={{ color }}>{label}</p>
      <p className="text-[8px] text-slate-600">Élhetőség összesített pontszáma</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props { data: LiveabilityData | null; loading: boolean }

export default function LiveabilityPanel({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-64 rounded-2xl bg-white/[0.06]" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[1,2,3,4,5,6].map(i => <div key={i} className="h-14 rounded-2xl bg-white/[0.06]" />)}</div>
      </div>
    );
  }
  if (!data) return <p className="text-center py-8 text-[11px] text-slate-600">Élhetőségi adat nem elérhető</p>;

  return (
    <div className="space-y-5">
      {/* Radar + total side-by-side */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex-1">
          <RadarChart dimensions={data.dimensions} />
        </div>
        <div className="flex flex-col items-center gap-4">
          <ScoreRing score={data.totalScore} color={data.labelColor} label={data.label} />
          <div className="space-y-1 text-[9px] text-slate-600 text-center">
            <p>Budapest átlag: ~62/100</p>
            <p className="rounded-full bg-white/[0.04] px-3 py-0.5 text-slate-500">
              {data.source === 'cache' ? 'Cache (30 napos frissítés)' : 'Friss Overpass lekérdezés'}
            </p>
          </div>
        </div>
      </div>

      {/* Dimension cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {data.dimensions.map(d => <DimCard key={d.key} dim={d} />)}
      </div>

      {/* Methodology note */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">Módszertan</p>
        <div className="grid gap-2 sm:grid-cols-3 text-[9px] leading-relaxed text-slate-500">
          <p><span className="text-slate-300 font-bold">Zöld & Levegő:</span> OSM zöldscore + Open-Meteo AQI (20-20%)</p>
          <p><span className="text-slate-300 font-bold">Egészségügy, Oktatás, Kultúra:</span> OSM Overpass távolság-decay exponenciális súlyozással</p>
          <p><span className="text-slate-300 font-bold">Biztonság (proxy):</span> Rendőrség távolsága + közlekedés sűrűsége (EIU/Mercer módszertanhoz igazítva)</p>
        </div>
      </div>
    </div>
  );
}
