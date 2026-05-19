'use client';

import type { CompactCityData } from '@/app/api/environment/urban/route';

// ─── Score gauge (horizontal bar with value) ──────────────────────────────────
function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-300">{label}</span>
        <span className="text-[10px] font-black tabular-nums" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color, boxShadow: `0 0 6px ${color}60` }} />
      </div>
    </div>
  );
}

// ─── Walking-time ring ────────────────────────────────────────────────────────
function WalkRing({ score, color }: { score: number; color: string }) {
  const R = 44, C = 2 * Math.PI * R;
  return (
    <svg viewBox="0 0 120 120" className="w-28 h-28">
      <circle cx={60} cy={60} r={R} fill="none" stroke="#ffffff08" strokeWidth={8} />
      <circle cx={60} cy={60} r={R} fill="none" stroke={color} strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`${(score / 100) * C} ${C}`}
        strokeDashoffset={C / 4}
        style={{ transition: 'stroke-dasharray 1s ease' }} />
      <text x={60} y={56} textAnchor="middle" fontSize={22} fontWeight={900} fill={color}>{score}</text>
      <text x={60} y={68} textAnchor="middle" fontSize={8} fill="#94a3b8">/ 100</text>
    </svg>
  );
}

// ─── Score color ──────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 75) return '#22c55e';
  if (s >= 55) return '#84cc16';
  if (s >= 40) return '#eab308';
  return '#f97316';
}

function scoreLabel(s: number) {
  if (s >= 80) return '15 perces város';
  if (s >= 65) return 'Gyalogos-barát';
  if (s >= 50) return 'Mérsékelt';
  return 'Autó-függő';
}

interface Props { data: CompactCityData | null; loading: boolean }

export default function CompactCityPanel({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-white/[0.06]" />)}</div>
        <div className="h-40 rounded-2xl bg-white/[0.06]" />
      </div>
    );
  }
  if (!data) return <p className="text-center py-8 text-[11px] text-slate-600">Overpass API nem elérhető</p>;

  const mainColor = scoreColor(data.score15min);

  return (
    <div className="space-y-5">
      {/* Hero row */}
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-1">
          <WalkRing score={data.score15min} color={mainColor} />
          <p className="text-[10px] font-black" style={{ color: mainColor }}>{scoreLabel(data.score15min)}</p>
          <p className="text-[8px] text-slate-600">15 perces város index</p>
        </div>
        <div className="flex-1 space-y-3 w-full">
          <ScoreBar label="Gyalogolhatóság" value={data.walkabilityScore} color={scoreColor(data.walkabilityScore)} />
          <ScoreBar label="Tömegközlekedés" value={data.transitScore} color={scoreColor(data.transitScore)} />
          <ScoreBar label="Vegyes hasznosítás" value={data.mixedUseScore} color={scoreColor(data.mixedUseScore)} />
          <div className="mt-1 text-[9px] text-slate-600">
            {data.transitStops500m} BKK megálló 500m-en belül · {data.source === 'cache' ? 'Cache (30 nap)' : 'Friss Overpass'}
          </div>
        </div>
      </div>

      {/* Key distances */}
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { label: 'Legközelebbi ABC', dist: data.nearestSupermarketM, icon: '🛒', color: '#fb923c' },
          { label: 'Legközelebbi gyógyszertár', dist: data.nearestPharmacyM, icon: '💊', color: '#60a5fa' },
          { label: 'Legközelebbi iskola', dist: data.nearestSchoolM, icon: '🏫', color: '#a78bfa' },
        ].map(item => (
          <div key={item.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 text-center">
            <p className="text-base">{item.icon}</p>
            <p className="text-[9px] text-slate-500 mt-1">{item.label}</p>
            {item.dist !== null ? (
              <>
                <p className="text-lg font-black" style={{ color: item.color }}>{item.dist} <span className="text-xs text-slate-500">m</span></p>
                <p className="text-[8px] text-slate-600">~{Math.round(item.dist / 67)} perc gyalog</p>
              </>
            ) : (
              <p className="text-xs text-slate-700 mt-1">Nincs az 1 km-es körben</p>
            )}
          </div>
        ))}
      </div>

      {/* Amenity grid */}
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">Létesítmények 1 km-en belül</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {data.amenities.map(a => (
            <div key={a.category} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-center">
              <p className="text-lg">{a.icon}</p>
              <p className="text-[9px] text-slate-500 mt-1">{a.label}</p>
              <p className="text-xl font-black text-slate-200">{a.count}</p>
              {a.nearestM !== null && <p className="text-[8px] text-slate-600">{a.nearestM}m</p>}
            </div>
          ))}
        </div>
      </div>

      {/* What is compact city */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">A 15 perces város koncepció</p>
        <div className="grid gap-2 sm:grid-cols-3 text-[9px] leading-relaxed text-slate-500">
          <p><span className="text-slate-300 font-bold">Carlos Moreno (2016):</span> Minden alapszolgáltatás gyalog vagy kerékpárral elérhető 15 percen belül.</p>
          <p><span className="text-slate-300 font-bold">Gyalogolhatóság:</span> Üzletek, egészségügy, oktatás, kultúra távolsága exponenciális decay-függvény alapján.</p>
          <p><span className="text-slate-300 font-bold">Adat:</span> OSM Overpass API (1,5 km sugár) + BKK Transit megálló-adatbázis.</p>
        </div>
      </div>
    </div>
  );
}
