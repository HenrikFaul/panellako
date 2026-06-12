'use client';

import { Thermometer, CloudRain } from 'lucide-react';

interface Props {
  uvIndex:            number;
  uvLabel:            string;
  uvColor:            string;
  windSpeed:          number;
  windDirection:      number;
  windDirectionLabel: string;
  windLabel:          string;
  windAqiImpact:      string;
  temperature:        number;
  precipProb:         number;
}

const UV_ADVICE: Record<string, string> = {
  'Alacsony':     'Nincs védelem szükséges',
  'Mérsékelt':    'Napszemüveg, kalap ajánlott',
  'Magas':        'SPF 30+ fényvédő',
  'Nagyon magas': 'Kerülje 10–14h a napot, SPF 50+',
  'Extrém':       'Maradjon árnyékban!',
};

export default function UvWindPanel({
  uvIndex, uvLabel, uvColor,
  windSpeed, windDirection, windDirectionLabel, windLabel, windAqiImpact,
  temperature, precipProb,
}: Props) {
  const uvAngle  = Math.min(uvIndex / 11, 1) * 180;
  const cx = 80; const cy = 70; const r = 55;

  // Arc helper
  function arc(startDeg: number, endDeg: number): string {
    const s = (startDeg - 180) * Math.PI / 180;
    const e = (endDeg   - 180) * Math.PI / 180;
    const x1 = cx + r * Math.cos(s); const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e); const y2 = cy + r * Math.sin(e);
    return `M${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 0 1 ${x2.toFixed(1)},${y2.toFixed(1)}`;
  }

  const uvSegs = [
    { s: 0,   e: 54,  color: '#22c55e' },
    { s: 54,  e: 97,  color: '#eab308' },
    { s: 97,  e: 130, color: '#f97316' },
    { s: 130, e: 163, color: '#ef4444' },
    { s: 163, e: 180, color: '#a855f7' },
  ];

  // Needle at uvAngle degrees from left
  const needleDeg = uvAngle - 180;
  const needleRad = needleDeg * Math.PI / 180;
  const nx = cx + (r - 8) * Math.cos(needleRad);
  const ny = cy + (r - 8) * Math.sin(needleRad);

  // Wind compass arrow
  const arrowRad = (windDirection - 90) * Math.PI / 180;
  const arrowLen = 22;
  const ax = 40 + arrowLen * Math.cos(arrowRad);
  const ay = 40 + arrowLen * Math.sin(arrowRad);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {/* UV gauge */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">UV-index</p>
        <svg viewBox="0 0 160 90" className="w-full max-w-[180px] mx-auto">
          {uvSegs.map((seg, i) => (
            <path key={i} d={arc(seg.s, seg.e)} fill="none" stroke={seg.color} strokeWidth="9" strokeLinecap="butt" opacity="0.7" />
          ))}
          {/* Needle */}
          <line x1={cx.toFixed(1)} y1={cy.toFixed(1)} x2={nx.toFixed(1)} y2={ny.toFixed(1)}
            stroke="white" strokeWidth="2" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="3" fill="white" />
          {/* Center text */}
          <text x={cx} y={cy - 8}  textAnchor="middle" fontSize="18" fontWeight="900" fill={uvColor}>{uvIndex.toFixed(1)}</text>
          <text x={cx} y={cy + 8}  textAnchor="middle" fontSize="7"  fill="rgba(255,255,255,0.5)">{uvLabel}</text>
        </svg>
        <p className="mt-2 text-center text-[10px] text-slate-400">{UV_ADVICE[uvLabel] ?? '—'}</p>
        <div className="mt-2 flex items-center justify-center gap-3 text-[9px] text-slate-500">
          <span className="flex items-center gap-1"><Thermometer size={11} className="shrink-0 text-rose-300" />{temperature}°C</span>
          <span className="flex items-center gap-1"><CloudRain size={11} className="shrink-0 text-sky-300" />{precipProb}%</span>
        </div>
      </div>

      {/* Wind compass */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">Szél</p>
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 80 80" className="h-20 w-20 shrink-0">
            <circle cx="40" cy="40" r="36" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            {['É','K','D','Ny'].map((dir, i) => {
              const angle = i * 90 * Math.PI / 180;
              return (
                <text key={dir} x={40 + 30 * Math.sin(angle)} y={40 - 30 * Math.cos(angle) + 3}
                  textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.3)">{dir}</text>
              );
            })}
            {/* Arrow */}
            <line x1="40" y1="40" x2={ax.toFixed(1)} y2={ay.toFixed(1)}
              stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="40" cy="40" r="3" fill="#ef4444" />
          </svg>
          <div>
            <p className="text-xl font-semibold text-slate-200">{windSpeed} <span className="text-xs text-slate-500">km/h</span></p>
            <p className="text-[10px] text-slate-400">{windDirectionLabel} · {windLabel}</p>
          </div>
        </div>
        <p className={`mt-2 rounded-xl px-3 py-1.5 text-[9px] ${
          windSpeed < 5 ? 'bg-rose-500/10 text-rose-400' : windSpeed < 15 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
        }`}>
          {windSpeed < 5 ? '⚠' : windSpeed < 15 ? '↗' : '✓'} {windAqiImpact}
        </p>
      </div>
    </div>
  );
}
