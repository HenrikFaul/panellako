'use client';

import { useEffect, useRef, useState } from 'react';
import type { SatelliteData } from '@/app/api/environment/satellite/route';
import type { NdviHungaryRender } from '@/app/api/environment/ndvi-hungary/route';
import NdviHungaryViewer from '@/components/ndvi-hungary-viewer';

// ─── Budapest seasonal NDVI reference (monthly averages) ─────────────────────
const SEASONAL_NDVI = [
  { m: 1,  lo: 0.10, hi: 0.20 },
  { m: 2,  lo: 0.12, hi: 0.22 },
  { m: 3,  lo: 0.20, hi: 0.35 },
  { m: 4,  lo: 0.32, hi: 0.50 },
  { m: 5,  lo: 0.45, hi: 0.62 },
  { m: 6,  lo: 0.50, hi: 0.65 },
  { m: 7,  lo: 0.48, hi: 0.62 },
  { m: 8,  lo: 0.44, hi: 0.56 },
  { m: 9,  lo: 0.38, hi: 0.50 },
  { m: 10, lo: 0.28, hi: 0.42 },
  { m: 11, lo: 0.18, hi: 0.30 },
  { m: 12, lo: 0.10, hi: 0.20 },
];
const MONTH_NAMES = ['Jan','Feb','Már','Ápr','Máj','Jún','Júl','Aug','Sze','Okt','Nov','Dec'];

// Map NDVI -0.2..0.8 → Y (SVG coords, top=high NDVI)
const SVG_W = 480, SVG_H = 80, PAD_L = 10, PAD_R = 10;
function ndviToY(v: number): number {
  const clamped = Math.max(-0.2, Math.min(0.8, v));
  return SVG_H - 4 - ((clamped + 0.2) / 1.0) * (SVG_H - 8);
}

interface Props {
  data:    SatelliteData | null;
  loading: boolean;
}

type ViewMode = 'building' | 'hungary';

export default function SatelliteNdviPanel({ data, loading }: Props) {
  const [view, setView] = useState<ViewMode>('building');
  const [huData, setHuData] = useState<NdviHungaryRender | null>(null);
  const [huLoading, setHuLoading] = useState(false);
  const [huError, setHuError] = useState<string | null>(null);
  const huLoadedRef = useRef(false);

  useEffect(() => {
    if (view !== 'hungary' || huLoadedRef.current) return;
    huLoadedRef.current = true;
    setHuLoading(true);
    setHuError(null);
    fetch('/api/environment/ndvi-hungary')
      .then(async r => {
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          setHuError(j.error ?? `HTTP ${r.status}`);
          return null;
        }
        return r.json() as Promise<NdviHungaryRender>;
      })
      .then(d => { if (d) setHuData(d); })
      .catch(e => setHuError(e instanceof Error ? e.message : String(e)))
      .finally(() => setHuLoading(false));
  }, [view]);

  const colW = (SVG_W - PAD_L - PAD_R) / 12;
  const curMonth = new Date().getMonth() + 1;
  const sceneMonth = data?.sceneDate ? new Date(data.sceneDate).getMonth() + 1 : curMonth;

  // Build seasonal band path
  const upperPts = SEASONAL_NDVI.map((s, i) => {
    const x = PAD_L + (i + 0.5) * colW;
    return `${x},${ndviToY(s.hi)}`;
  });
  const lowerPts = [...SEASONAL_NDVI].reverse().map((s, i) => {
    const x = PAD_L + (11 - i + 0.5) * colW;
    return `${x},${ndviToY(s.lo)}`;
  });
  const bandPath = `M ${upperPts[0]} L ${upperPts.join(' L ')} L ${lowerPts.join(' L ')} Z`;

  // Midline
  const midLinePts = SEASONAL_NDVI.map((s, i) => {
    const x = PAD_L + (i + 0.5) * colW;
    return `${x},${ndviToY((s.lo + s.hi) / 2)}`;
  });

  // Current reading dot position
  const dotX = data?.sceneDate
    ? PAD_L + (sceneMonth - 0.5) * colW
    : PAD_L + (curMonth - 0.5) * colW;
  const dotY = data?.ndvi !== null && data?.ndvi !== undefined
    ? ndviToY(data.ndvi)
    : ndviToY((SEASONAL_NDVI[curMonth - 1].lo + SEASONAL_NDVI[curMonth - 1].hi) / 2);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 rounded-2xl bg-white/[0.06]" />
        <div className="h-12 rounded-2xl bg-white/[0.06]" />
        <div className="h-24 rounded-2xl bg-white/[0.06]" />
      </div>
    );
  }

  // ── Toggle bar between "épület közeli" and "Magyarország" nézet ──────────
  const ToggleBar = (
    <div className="inline-flex rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1">
      <button
        type="button"
        onClick={() => setView('building')}
        className={`rounded-xl px-4 py-2 text-[11px] font-bold transition-colors ${
          view === 'building'
            ? 'bg-emerald-500/20 text-emerald-300'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        🏠 Épület közeli NDVI
      </button>
      <button
        type="button"
        onClick={() => setView('hungary')}
        className={`rounded-xl px-4 py-2 text-[11px] font-bold transition-colors ${
          view === 'hungary'
            ? 'bg-emerald-500/20 text-emerald-300'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        🇭🇺 Magyarország NDVI
      </button>
    </div>
  );

  if (view === 'hungary') {
    return (
      <div className="space-y-5">
        {ToggleBar}
        <NdviHungaryViewer data={huData} loading={huLoading} error={huError} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {ToggleBar}
      {/* NDVI value + classification */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Big number */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">Vegetációs index (NDVI)</p>
          {data?.ndvi !== null && data?.ndvi !== undefined ? (
            <>
              <p className="text-4xl font-black tabular-nums" style={{ color: data.ndviColor, textShadow: `0 0 20px ${data.ndviColor}60` }}>
                {data.ndvi.toFixed(3)}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${data.ndviPct}%`, background: data.ndviColor }} />
              </div>
              <p className="mt-1.5 text-[10px] font-bold" style={{ color: data.ndviColor }}>{data.ndviLabel}</p>
            </>
          ) : (
            <p className="text-[11px] text-slate-600 mt-2">Nem elérhető</p>
          )}
        </div>

        {/* Scene metadata */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-2.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Felvétel adatai</p>
          <div className="space-y-2 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Műhold</span>
              <span className="font-bold text-slate-200">{data?.satellite ?? 'Sentinel-2'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Felvétel dátuma</span>
              <span className="font-bold text-slate-200">{data?.sceneDate ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Felhőborítottság</span>
              <span className="font-bold text-slate-200">
                {data?.cloudCover !== null && data?.cloudCover !== undefined ? `${data.cloudCover.toFixed(0)}%` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Forrás</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] text-emerald-400">
                {data?.source === 'cache' ? 'Cache' : data?.source === 'sentinel2' ? 'Élő lekérdezés' : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* NDVI scale legend */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2.5">NDVI skála</p>
          <div className="space-y-1.5">
            {[
              { range: '> 0.5', label: 'Sűrű növényzet',   color: '#16a34a' },
              { range: '0.35–0.5', label: 'Jó növényzet',  color: '#22c55e' },
              { range: '0.2–0.35', label: 'Mérsékelt',      color: '#84cc16' },
              { range: '0.1–0.2', label: 'Ritka',           color: '#ca8a04' },
              { range: '< 0.1',   label: 'Beépített/Víz',  color: '#60a5fa' },
            ].map(r => (
              <div key={r.range} className="flex items-center gap-2">
                <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />
                <span className="text-[9px] text-slate-400">{r.range} — {r.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Seasonal chart */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <p className="mb-3 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          Szezonális NDVI — Budapest referencia + jelenlegi mérés
        </p>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H + 16}`} className="w-full" style={{ height: 80 }}>
          {/* Seasonal band */}
          <path d={bandPath} fill="#22c55e" fillOpacity={0.12} />
          {/* Mid reference line */}
          <polyline points={midLinePts.join(' ')} fill="none" stroke="#22c55e" strokeWidth={1} strokeOpacity={0.3} strokeDasharray="3 3" />
          {/* Month labels */}
          {SEASONAL_NDVI.map((_, i) => (
            <text key={i} x={PAD_L + (i + 0.5) * colW} y={SVG_H + 13}
              textAnchor="middle" fontSize={7} fill="#475569">{MONTH_NAMES[i]}</text>
          ))}
          {/* Current month column highlight */}
          <rect x={PAD_L + (curMonth - 1) * colW} y={0} width={colW} height={SVG_H}
            fill="#eab308" fillOpacity={0.05} />
          {/* Current reading dot */}
          {data?.ndvi !== null && data?.ndvi !== undefined && (
            <>
              <line x1={dotX} y1={0} x2={dotX} y2={SVG_H} stroke={data.ndviColor} strokeWidth={1} strokeOpacity={0.5} strokeDasharray="2 2" />
              <circle cx={dotX} cy={dotY} r={5} fill={data.ndviColor} filter="url(#glow)" />
              <circle cx={dotX} cy={dotY} r={3} fill={data.ndviColor} />
              <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
            </>
          )}
        </svg>
        <p className="mt-1 text-[8px] text-slate-700">Copernicus Sentinel-2 MSI · ESA STAC · titiler.xyz · Copernicus Land Service</p>
      </div>

      {/* What NDVI means */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">Miért fontos az NDVI?</p>
        <div className="grid gap-2 sm:grid-cols-3 text-[9px] leading-relaxed text-slate-500">
          <p><span className="text-slate-300 font-bold">Hővédelemi hatás:</span> Magasabb NDVI = kisebb városi hősziget-hatás (akár –3°C nyáron)</p>
          <p><span className="text-slate-300 font-bold">Levegőminőség:</span> Sűrű növényzet ~10–20% PM2.5 abszorpciót biztosít</p>
          <p><span className="text-slate-300 font-bold">Mentális egészség:</span> NDVI &gt;0.35 összefügg alacsonyabb stressz-szinttel (WHO 2023)</p>
        </div>
      </div>
    </div>
  );
}
