'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface GreenBuildingScore {
  total:        number;
  air:          number;
  green:        number;
  transit:      number;
  cycling:      number;
  noise:        number;
  uhi:          number;
  badge:        string;
  airEstimated: boolean;
  lat:          number;
  lon:          number;
  computedAt:   string;
}

interface Props {
  buildingId:   string;
  buildingName: string;
  lat:          number;
  lon:          number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Badge config
// ──────────────────────────────────────────────────────────────────────────────

const BADGE_CONFIG: Record<
  string,
  { emoji: string; bg: string; text: string; border: string }
> = {
  Platina:      { emoji: '🏆', bg: 'bg-emerald-100',  text: 'text-emerald-700', border: 'border-emerald-300' },
  Arany:        { emoji: '🥇', bg: 'bg-yellow-100',   text: 'text-yellow-700',  border: 'border-yellow-300'  },
  Ezüst:        { emoji: '🥈', bg: 'bg-slate-100',    text: 'text-slate-600',   border: 'border-slate-300'   },
  Bronz:        { emoji: '🥉', bg: 'bg-orange-100',   text: 'text-orange-700',  border: 'border-orange-300'  },
  Fejlesztendő: { emoji: '🌱', bg: 'bg-red-100',      text: 'text-red-700',     border: 'border-red-300'     },
};

function getBadgeCfg(badge: string) {
  return BADGE_CONFIG[badge] ?? BADGE_CONFIG['Fejlesztendő'];
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-score definitions
// ──────────────────────────────────────────────────────────────────────────────

interface SubScoreDef {
  key:    keyof GreenBuildingScore;
  label:  string;
  max:    number;
  icon:   string;
  source: string;
  color:  string;
}

const SUB_SCORES: SubScoreDef[] = [
  { key: 'air',     label: 'Levegőminőség',  max: 25, icon: '💨', source: 'OpenAQ v3',                          color: 'bg-sky-500'      },
  { key: 'green',   label: 'Zöldfelület',     max: 20, icon: '🌳', source: 'OpenStreetMap Overpass',             color: 'bg-emerald-500'  },
  { key: 'transit', label: 'Közlekedés',      max: 20, icon: '🚌', source: 'OpenStreetMap Overpass',             color: 'bg-violet-500'   },
  { key: 'cycling', label: 'Kerékpározás',    max: 15, icon: '🚲', source: 'OpenStreetMap Overpass + BuBi adat', color: 'bg-lime-500'     },
  { key: 'noise',   label: 'Zajterhelés',     max: 10, icon: '🔇', source: 'OpenStreetMap Overpass',             color: 'bg-amber-500'    },
  { key: 'uhi',     label: 'Hőszigat hatás',  max: 10, icon: '🌡', source: 'OpenStreetMap Overpass',             color: 'bg-orange-500'   },
];

// ──────────────────────────────────────────────────────────────────────────────
// Skeleton
// ──────────────────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-800/60 rounded-xl ${className ?? ''}`} />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Hero skeleton */}
      <Skeleton className="h-52 w-full rounded-2xl" />
      {/* Grid skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SVG arc score display
// ──────────────────────────────────────────────────────────────────────────────

function ScoreArc({ score, max = 100 }: { score: number; max?: number }) {
  const pct     = Math.min(1, score / max);
  const r       = 52;
  const cx      = 64;
  const cy      = 64;
  const circum  = 2 * Math.PI * r;
  // Arc from -210° to 30° (240° sweep, centered at bottom)
  const sweepDeg = 240;
  const startAngle = -210 * (Math.PI / 180);
  const arcLen  = pct * (sweepDeg / 360) * circum;
  const dash    = `${arcLen} ${circum}`;

  const getColor = () => {
    if (score >= 85) return '#10b981'; // emerald
    if (score >= 70) return '#f59e0b'; // amber
    if (score >= 55) return '#94a3b8'; // slate
    if (score >= 40) return '#f97316'; // orange
    return '#ef4444';                  // red
  };

  return (
    <svg viewBox="0 0 128 128" className="w-36 h-36" aria-hidden>
      {/* Track */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="#334155"
        strokeWidth="10"
        strokeDasharray={`${(sweepDeg / 360) * circum} ${circum}`}
        strokeDashoffset="0"
        strokeLinecap="round"
        transform={`rotate(${-210} ${cx} ${cy})`}
      />
      {/* Fill */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={getColor()}
        strokeWidth="10"
        strokeDasharray={dash}
        strokeDashoffset="0"
        strokeLinecap="round"
        transform={`rotate(${startAngle * (180 / Math.PI)} ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text
        x={cx} y={cy - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-white"
        style={{ fontSize: 28, fontWeight: 700, fontFamily: 'inherit' }}
      >
        {score}
      </text>
      <text
        x={cx} y={cy + 18}
        textAnchor="middle"
        className="fill-slate-400"
        style={{ fontSize: 11, fontFamily: 'inherit' }}
      >
        / {max}
      </text>
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-score card
// ──────────────────────────────────────────────────────────────────────────────

function SubScoreCard({
  def,
  value,
  estimated,
}: {
  def: SubScoreDef;
  value: number;
  estimated?: boolean;
}) {
  const pct = Math.min(100, (value / def.max) * 100);

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-lg leading-none" aria-hidden>{def.icon}</span>
        <span className="text-xs text-slate-500 font-medium">
          {value.toFixed(1)}&nbsp;/&nbsp;{def.max}
        </span>
      </div>

      <div>
        <p className="text-sm font-semibold text-white leading-tight">{def.label}</p>
        {estimated && (
          <p className="text-[10px] text-amber-400/80 mt-0.5">becsült</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${def.color} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-[10px] text-slate-600 truncate">{def.source}</p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main client component
// ──────────────────────────────────────────────────────────────────────────────

export default function GreenScoreDashboardClient({
  buildingId,
  buildingName,
  lat,
  lon,
}: Props) {
  const [data, setData]       = useState<GreenBuildingScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchScore = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/building-score/${buildingId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<GreenBuildingScore>;
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err: unknown) => {
        console.error('[GreenScore] fetch failed:', err);
        setError('Az adatok betöltése nem sikerült. Kérjük, próbálja újra.');
        setLoading(false);
      });
  }, [buildingId]);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  if (loading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-red-900/40 p-6 text-center">
        <p className="text-red-400 text-sm">{error ?? 'Ismeretlen hiba történt.'}</p>
        <button
          onClick={fetchScore}
          className="mt-3 text-xs text-slate-400 hover:text-white underline underline-offset-2"
        >
          Újrapróbálás
        </button>
      </div>
    );
  }

  const badgeCfg = getBadgeCfg(data.badge);

  return (
    <div className="space-y-5">
      {/* ── Hero ── */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col items-center gap-3 shadow-sm">
        <ScoreArc score={data.total} />

        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold ${badgeCfg.bg} ${badgeCfg.text} ${badgeCfg.border}`}>
          <span aria-hidden>{badgeCfg.emoji}</span>
          {data.badge}
        </div>

        <p className="text-slate-400 text-xs text-center max-w-xs">
          {buildingName}
        </p>

        <p className="text-[10px] text-slate-600 text-center">
          Frissítve: {new Date(data.computedAt).toLocaleString('hu-HU', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>

      {/* ── Sub-score grid ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SUB_SCORES.map((def) => (
          <SubScoreCard
            key={def.key}
            def={def}
            value={data[def.key] as number}
            estimated={def.key === 'air' ? data.airEstimated : undefined}
          />
        ))}
      </div>

      {/* ── Refresh ── */}
      <button
        onClick={fetchScore}
        className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-medium py-3 transition-colors"
      >
        Frissítés
      </button>

      {/* ── Attribution ── */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800/60 p-4 space-y-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Adatforrások</p>
        <ul className="text-[11px] text-slate-600 space-y-0.5 mt-1">
          <li>• Levegőminőség: OpenAQ v3 API (openaq.org)</li>
          <li>• Zöldfelület, közlekedés, kerékpározás, zaj, hőszigat: OpenStreetMap / Overpass API</li>
          <li>• Koordináták: Nominatim (nominatim.openstreetmap.org)</li>
        </ul>
        <p className="text-[10px] text-slate-700 mt-2">
          Az adatok közelítő értékek. Közvetlen döntéshozatalhoz nem ajánlott.
        </p>
      </div>

      {/* ── Back navigation ── */}
      <Link
        href={`/w/${buildingId}`}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors py-1"
      >
        <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-current" aria-hidden>
          <path
            fillRule="evenodd"
            d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
            clipRule="evenodd"
          />
        </svg>
        Vissza a dashboardra
      </Link>

      {/* Coordinate display for transparency */}
      <p className="text-[10px] text-slate-700 text-center">
        {lat.toFixed(5)}, {lon.toFixed(5)}
      </p>
    </div>
  );
}
