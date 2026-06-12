'use client';

import { useEffect, useState } from 'react';
import type { AirQualityResult, AQICategory } from '@/app/api/air-quality/route';

// ─── Animation CSS ────────────────────────────────────────────────────────────
const AQ_CSS = `
  @keyframes aq-pulse {
    0%,100% { r: 28; opacity: 0.18; }
    50%      { r: 35; opacity: 0.38; }
  }
  @keyframes aq-pulse-slow {
    0%,100% { r: 22; opacity: 0.12; }
    50%      { r: 30; opacity: 0.28; }
  }
  @keyframes aq-breathe {
    0%,100% { transform: scale(1);    opacity: 0.9; }
    50%      { transform: scale(1.06); opacity: 1;   }
  }
  @keyframes aq-ring-in {
    from { stroke-dashoffset: 220; opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes aq-p0 {
    0%   { transform: translate(50px,72px) scale(0); opacity: 0; }
    8%   { opacity: 0.9; }
    85%  { opacity: 0.6; }
    100% { transform: translate(44px,28px) scale(1); opacity: 0; }
  }
  @keyframes aq-p1 {
    0%   { transform: translate(60px,74px) scale(0); opacity: 0; }
    10%  { opacity: 0.85; }
    80%  { opacity: 0.55; }
    100% { transform: translate(66px,30px) scale(1); opacity: 0; }
  }
  @keyframes aq-p2 {
    0%   { transform: translate(40px,70px) scale(0); opacity: 0; }
    12%  { opacity: 0.75; }
    78%  { opacity: 0.45; }
    100% { transform: translate(35px,26px) scale(1); opacity: 0; }
  }
  @keyframes aq-p3 {
    0%   { transform: translate(55px,76px) scale(0); opacity: 0; }
    6%   { opacity: 0.95; }
    88%  { opacity: 0.65; }
    100% { transform: translate(58px,24px) scale(1); opacity: 0; }
  }
  @keyframes aq-p4 {
    0%   { transform: translate(45px,73px) scale(0); opacity: 0; }
    9%   { opacity: 0.8; }
    82%  { opacity: 0.5; }
    100% { transform: translate(40px,22px) scale(1); opacity: 0; }
  }
  @keyframes aq-p5 {
    0%   { transform: translate(62px,71px) scale(0); opacity: 0; }
    7%   { opacity: 0.88; }
    86%  { opacity: 0.6; }
    100% { transform: translate(70px,27px) scale(1); opacity: 0; }
  }
  @keyframes aq-drift-l {
    0%,100% { transform: translateX(-4px); opacity: 0.3; }
    50%      { transform: translateX(6px);  opacity: 0.7; }
  }
  @keyframes aq-drift-r {
    0%,100% { transform: translateX(5px);  opacity: 0.25; }
    50%      { transform: translateX(-5px); opacity: 0.6; }
  }
`;

// ─── Particle configs per AQI level ──────────────────────────────────────────
const PARTICLE_CONFIGS: Record<AQICategory, { count: number; r: number; opacity: number; dur: number[] }> = {
  good:          { count: 4, r: 1.2, opacity: 0.55, dur: [3.2, 3.8, 4.1, 3.5, 3.0, 4.4] },
  moderate:      { count: 5, r: 1.6, opacity: 0.65, dur: [2.8, 3.2, 3.6, 2.9, 3.4, 3.1] },
  sensitive:     { count: 6, r: 2.0, opacity: 0.75, dur: [2.2, 2.6, 2.9, 2.4, 2.7, 2.3] },
  unhealthy:     { count: 6, r: 2.4, opacity: 0.82, dur: [1.8, 2.1, 2.3, 1.9, 2.2, 1.7] },
  very_unhealthy:{ count: 6, r: 2.8, opacity: 0.88, dur: [1.5, 1.8, 1.9, 1.6, 1.7, 1.4] },
  hazardous:     { count: 6, r: 3.2, opacity: 0.95, dur: [1.2, 1.4, 1.5, 1.3, 1.6, 1.1] },
};

const PARTICLE_ANIMS = ['aq-p0','aq-p1','aq-p2','aq-p3','aq-p4','aq-p5'] as const;

// ─── AQI Arc gauge (220° sweep, bottom gap) ──────────────────────────────────
function ArcGauge({ aqi, color }: { aqi: number; color: string }) {
  const r = 34;
  const cx = 50; const cy = 52;
  // Full arc = 220 degrees. circumference of 220° arc
  const totalArc   = 2 * Math.PI * r * (220 / 360);
  const fillFrac   = Math.min(aqi / 500, 1);
  const fillLength = totalArc * fillFrac;
  const gapLength  = totalArc - fillLength;
  // Rotate start: -110deg from 3 o'clock = 70deg below 12 o'clock from top
  const rotateStart = 'rotate(160 50 52)';

  return (
    <g style={{ animation: 'aq-ring-in 1.2s ease-out both' }}>
      {/* Track */}
      <circle cx={cx} cy={cy} r={r}
        fill="none" stroke="white" strokeOpacity="0.06"
        strokeWidth="4" strokeLinecap="round"
        strokeDasharray={`${totalArc} ${2 * Math.PI * r - totalArc}`}
        transform={rotateStart}
      />
      {/* Fill */}
      <circle cx={cx} cy={cy} r={r}
        fill="none" stroke={color} strokeOpacity="0.85"
        strokeWidth="4.5" strokeLinecap="round"
        strokeDasharray={`${fillLength} ${gapLength + 2 * Math.PI * r - totalArc}`}
        transform={rotateStart}
        style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 3px ${color})` }}
      />
    </g>
  );
}

// ─── Main animated SVG icon ───────────────────────────────────────────────────
function AQIcon({ category, color, aqi }: { category: AQICategory; color: string; aqi: number }) {
  const pc = PARTICLE_CONFIGS[category];
  const delays = [0, 0.6, 1.2, 1.8, 0.3, 0.9];

  return (
    <svg viewBox="0 0 100 100" width="110" height="110" overflow="visible">
      <defs>
        <style>{AQ_CSS}</style>
        <radialGradient id="aq-core-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </radialGradient>
        <filter id="aq-bloom">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Soft background glow */}
      <circle cx="50" cy="52" r="28" fill={color} opacity="0"
        style={{ animation: 'aq-pulse 3.5s ease-in-out infinite' }}
        filter="url(#aq-bloom)"
      />
      <circle cx="50" cy="52" r="22" fill="url(#aq-core-grad)"
        style={{ animation: 'aq-pulse-slow 4s ease-in-out 0.5s infinite' }}
      />

      {/* Arc gauge */}
      <ArcGauge aqi={aqi} color={color} />

      {/* Breathing core circle */}
      <circle cx="50" cy="52" r="23" fill={color} opacity="0.08"
        style={{ animation: 'aq-breathe 4s ease-in-out infinite', transformOrigin: '50px 52px' }}
      />

      {/* Particles */}
      {Array.from({ length: pc.count }, (_, i) => (
        <circle key={i} r={pc.r} fill={color} opacity={pc.opacity}
          style={{
            animation: `${PARTICLE_ANIMS[i]} ${pc.dur[i]}s ease-in ${delays[i]}s infinite`,
            transformOrigin: '0 0',
          }}
        />
      ))}

      {/* AQI number */}
      <text x="50" y="57" textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize="18" fontWeight="900" letterSpacing="-0.5"
        style={{ fontFamily: 'inherit', filter: `drop-shadow(0 0 4px ${color}80)` }}
      >
        {aqi}
      </text>
    </svg>
  );
}

// ─── Mini pollutant bar ───────────────────────────────────────────────────────
function PollutantBar({ label, value, max, color }: {
  label: string; value: number | null; max: number; unit?: string; color: string;
}) {
  if (value === null) return null;
  const frac = Math.min(value / max, 1);
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-7 text-[8px] font-bold uppercase text-slate-600">{label}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${frac * 100}%`, background: color, boxShadow: `0 0 4px ${color}80` }}
        />
      </div>
      <span className="w-8 text-right text-[8px] tabular-nums text-slate-500">{value.toFixed(0)}</span>
    </div>
  );
}

// ─── Health advice ────────────────────────────────────────────────────────────
const ADVICE: Record<AQICategory, string> = {
  good:          'Ideális szabadtéri tevékenységhez',
  moderate:      'Érzékenyek óvatosan a szabadban',
  sensitive:     'Asztmásoknak ne tartózkodjanak kint',
  unhealthy:     'Kerülje a hosszabb kinti tartózkodást',
  very_unhealthy:'Maradjon bent, zárja az ablakokat',
  hazardous:     'Vészhelyzet! Ne hagyja el otthonát',
};

// ─── Main widget ──────────────────────────────────────────────────────────────
export default function AirQualityWidget() {
  const [aq, setAq] = useState<AirQualityResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/air-quality')
      .then(r => r.json())
      .then(d => { setAq(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 animate-pulse">
        <div className="h-[110px] w-[110px] rounded-full bg-white/[0.07]" />
        <div className="h-3 w-16 rounded bg-white/[0.07]" />
        <div className="h-2 w-24 rounded bg-white/[0.07]" />
      </div>
    );
  }

  if (!aq) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[10px] text-slate-600">Levegőminőség nem elérhető</p>
      </div>
    );
  }

  return (
    <a href="#air-quality" className="flex h-full flex-col items-center cursor-pointer hover:opacity-90 transition-opacity" title="Részletes levegőminőség adatok">
      {/* Header label */}
      <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">
        Levegőminőség
      </p>

      {/* Animated icon */}
      <div className="relative flex items-center justify-center overflow-hidden">
        <AQIcon category={aq.aqiCategory} color={aq.color} aqi={aq.aqi} />
      </div>

      {/* Category label */}
      <p className="mt-0.5 text-[11px] font-semibold leading-tight text-center"
        style={{ color: aq.color, textShadow: `0 0 8px ${aq.color}60` }}
      >
        {aq.aqiLabel}
      </p>

      {/* Health advice */}
      <p className="mt-1 px-1 text-center text-[8px] leading-tight text-slate-500">
        {ADVICE[aq.aqiCategory]}
      </p>

      {/* Pollutant bars */}
      <div className="mt-2.5 w-full space-y-1 border-t border-white/[0.07] pt-2">
        <PollutantBar label="PM2.5" value={aq.pm25} max={75}  unit="µg" color={aq.color} />
        <PollutantBar label="NO₂"   value={aq.no2}  max={200} unit="µg" color="#60a5fa" />
        <PollutantBar label="O₃"    value={aq.o3}   max={180} unit="µg" color="#a78bfa" />
        {'so2' in aq && (aq as { so2: number | null }).so2 !== null && (
          <PollutantBar label="SO₂" value={(aq as { so2: number | null }).so2} max={350} unit="µg" color="#fb923c" />
        )}
      </div>

      {/* Station */}
      <p className="mt-2 text-center text-[8px] leading-tight text-slate-700">
        {aq.stationName}
        {'source' in aq && (aq as { source: string }).source === 'aqicn' && (
          <><br/><span className="text-slate-600">AQICN · OLM</span></>
        )}
      </p>
    </a>
  );
}
