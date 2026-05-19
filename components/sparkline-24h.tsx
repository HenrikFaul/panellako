'use client';

import { useState } from 'react';

export interface SparklinePoint {
  time:    string;
  pm25:    number | null;
  uvIndex: number | null;
}

interface Props {
  data:    SparklinePoint[];
  height?: number;
}

function buildPath(values: (number | null)[], maxVal: number, width: number, height: number): string {
  const step = width / Math.max(values.length - 1, 1);
  const points: string[] = [];
  let started = false;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === null) continue;
    const x = i * step;
    const y = height - Math.max(0, (v / maxVal) * height * 0.85) - height * 0.05;
    points.push(`${started ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`);
    started = true;
  }
  return points.join(' ') || 'M0,0';
}

export default function Sparkline24h({ data, height = 72 }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; idx: number } | null>(null);
  const W = 480;
  const H = height;

  const pm25Values  = data.map(d => d.pm25);
  const uvValues    = data.map(d => d.uvIndex);
  const maxPm25     = Math.max(50, ...pm25Values.filter(Boolean) as number[]);
  const maxUv       = Math.max(6,  ...uvValues.filter(Boolean)  as number[]);

  const pm25Path = buildPath(pm25Values, maxPm25, W, H);
  const uvPath   = buildPath(uvValues,   maxUv,   W, H);

  const gridLines = [0.25, 0.5, 0.75];
  const hourTicks = [0, 6, 12, 18, 23];

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const idx  = Math.round(relX * (data.length - 1));
    setTooltip({ x: relX * W, y: 0, idx: Math.max(0, Math.min(idx, data.length - 1)) });
  }

  const t = tooltip ? data[tooltip.idx] : null;
  const timeLabel = t ? new Date(t.time).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H + 20}`}
        className="w-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid lines */}
        {gridLines.map(f => (
          <line key={f} x1={0} y1={H * (1 - f)} x2={W} y2={H * (1 - f)}
            stroke="white" strokeOpacity="0.05" strokeWidth="1" />
        ))}
        {/* PM2.5 path */}
        <path d={pm25Path} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
        {/* UV path dashed */}
        <path d={uvPath} fill="none" stroke="#eab308" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" />
        {/* Hour ticks */}
        {hourTicks.map(h => {
          const x = (h / 23) * W;
          return (
            <g key={h}>
              <line x1={x} y1={H} x2={x} y2={H + 4} stroke="white" strokeOpacity="0.2" strokeWidth="1" />
              <text x={x} y={H + 14} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.3)">
                {h}:00
              </text>
            </g>
          );
        })}
        {/* Tooltip line */}
        {tooltip && (
          <line x1={tooltip.x} y1={0} x2={tooltip.x} y2={H}
            stroke="white" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="3 2" />
        )}
        {/* Invisible mouse layer */}
        <rect x={0} y={0} width={W} height={H} fill="transparent" />
      </svg>
      {/* Legend */}
      <div className="flex gap-4 px-1 mt-0.5">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-5 rounded-full bg-sky-400" />
          <span className="text-[9px] text-slate-500">PM2.5 µg/m³</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-5 rounded-full bg-amber-400" style={{ backgroundImage: 'repeating-linear-gradient(90deg,#eab308 0,#eab308 4px,transparent 4px,transparent 7px)' }} />
          <span className="text-[9px] text-slate-500">UV index</span>
        </div>
        {tooltip && t && (
          <div className="ml-auto text-[9px] text-slate-400">
            {timeLabel} · PM2.5: <span className="text-sky-400">{t.pm25?.toFixed(1) ?? '—'}</span> · UV: <span className="text-amber-400">{t.uvIndex?.toFixed(1) ?? '—'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
