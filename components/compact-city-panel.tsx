'use client';

import { useState } from 'react';
import type { CompactCityData, CompactCityPoi, AmenityCategory } from '@/app/api/environment/urban/route';
import CompactCityMap from '@/components/compact-city-map';

// ─── Panel-level category groups ─────────────────────────────────────────────
// Must stay in sync with `groupOf` / GROUP_CFG in compact-city-map.tsx.
type CatGroup = 'food'|'health'|'education'|'dining'|'culture'|'sport'|'services'|'safety';

// Maps the AmenityDetail.category strings (set on the server in route.ts) and
// the "Legközelebbi …" cards to the OSM AmenityCategory members that should
// stay visible on the map when the user drills down.
const GROUP_CATEGORIES: Record<CatGroup, AmenityCategory[]> = {
  food:      ['supermarket', 'bakery', 'daily'],
  health:    ['pharmacy', 'hospital', 'healthcare'],
  education: ['school', 'education'],
  dining:    ['restaurant', 'cafe', 'food'],
  culture:   ['culture'],
  sport:     ['sport'],
  services:  ['services'],
  safety:    ['safety'],
};

// Categories used to pick the "nearest" POI for each shortcut card. These must
// match the server-side `nearest*M` queries in route.ts so the picked POI is
// the same building/shop the user already sees on the stats card.
const NEAREST_CATEGORIES: Record<'food'|'health'|'education', AmenityCategory[]> = {
  food:      ['supermarket'],
  health:    ['pharmacy'],
  education: ['school', 'education'],
};

// ─── Score gauge (horizontal bar with value) ──────────────────────────────────
function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold text-slate-300">{label}</span>
        <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }} />
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
      <text x={60} y={56} textAnchor="middle" fontSize={22} fontWeight={600} fill={color}>{score}</text>
      <text x={60} y={68} textAnchor="middle" fontSize={8} fill="#94a3b8">/ 100</text>
    </svg>
  );
}

// ─── Score color ──────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 75) return '#34d399';
  if (s >= 55) return '#84cc16';
  if (s >= 40) return '#fbbf24';
  return '#f97316';
}

function scoreLabel(s: number) {
  if (s >= 80) return '15 perces város';
  if (s >= 65) return 'Gyalogos-barát';
  if (s >= 50) return 'Mérsékelt';
  return 'Autó-függő';
}

type ViewMode = 'stats' | 'map';

interface Props {
  data:           CompactCityData | null;
  loading:        boolean;
  buildingLat?:   number;
  buildingLon?:   number;
  /** When the user opens the map view but the data came from cache (no POIs),
   *  the panel calls this so the parent can re-fetch with `?withPois=1`. */
  onRequestLivePois?: () => void;
  /** True while the parent's live re-fetch is in flight. */
  loadingPois?:   boolean;
}

export default function CompactCityPanel({
  data, loading, buildingLat, buildingLon, onRequestLivePois, loadingPois,
}: Props) {
  const [view, setView] = useState<ViewMode>('stats');
  // null  → map shows ALL categories (default "Térkép" tab behaviour)
  // Set   → map filter chips are pre-set to only these groups
  const [mapFilterGroups, setMapFilterGroups] = useState<Set<CatGroup> | null>(null);
  // null  → no auto-zoom (default)
  // num   → on mount the map zooms to this osmId and opens its popup
  const [mapZoomToPoiId, setMapZoomToPoiId] = useState<number | null>(null);
  // null  → show all POIs; num → show ONLY that one POI on the map
  const [singlePoiOsmId, setSinglePoiOsmId] = useState<number | null>(null);

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
  const hasPois   = Array.isArray(data.pois) && data.pois.length > 0;
  const canShowMap = buildingLat !== undefined && buildingLon !== undefined;
  const pois: CompactCityPoi[] = data.pois ?? [];

  // Switch to map view and focus on a specific category group (no POI zoom).
  // Used by the "Létesítmények 1 km-en belül" tiles.
  function focusCategoryGroup(group: CatGroup) {
    setMapFilterGroups(new Set([group]));
    setMapZoomToPoiId(null);
    setView('map');
    if (!hasPois && onRequestLivePois) onRequestLivePois();
  }

  // Switch to map view, filter to one group, AND zoom to the actual nearest
  // POI in that group. Used by the "Legközelebbi ABC / gyógyszertár / iskola"
  // shortcut cards. We re-derive "nearest" from `data.pois` so we open the
  // *same* POI the user just clicked, including its full OSM tag table.
  function focusNearest(kind: 'food'|'health'|'education') {
    const wanted = NEAREST_CATEGORIES[kind];
    const candidates = pois.filter(p => wanted.includes(p.category));
    const nearest = candidates.slice().sort((a, b) => a.distM - b.distM)[0];
    setMapFilterGroups(new Set([kind]));
    setMapZoomToPoiId(nearest?.osmId ?? null);
    setSinglePoiOsmId(nearest?.osmId ?? null);
    setView('map');
    if (!hasPois && onRequestLivePois) onRequestLivePois();
  }

  // Default "Térkép" tab — full unfiltered map.
  function openFullMap() {
    setMapFilterGroups(null);
    setMapZoomToPoiId(null);
    setSinglePoiOsmId(null);
    setView('map');
    if (!hasPois && onRequestLivePois) onRequestLivePois();
  }

  // ── Toggle bar (same visual style as satellite-ndvi-panel) ───────────────
  const ToggleBar = (
    <div className="inline-flex rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1">
      <button
        type="button"
        onClick={() => setView('stats')}
        className={`rounded-xl px-4 py-2 text-[11px] font-semibold transition-colors ${
          view === 'stats' ? 'bg-orange-500/20 text-orange-300' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        Statisztika
      </button>
      <button
        type="button"
        onClick={openFullMap}
        disabled={!canShowMap}
        className={`rounded-xl px-4 py-2 text-[11px] font-semibold transition-colors ${
          view === 'map' ? 'bg-orange-500/20 text-orange-300' : 'text-slate-400 hover:text-slate-200'
        } ${!canShowMap ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        Térkép
      </button>
    </div>
  );

  // ── Map view ─────────────────────────────────────────────────────────────
  if (view === 'map') {
    return (
      <div className="space-y-5">
        {ToggleBar}
        {!canShowMap ? (
          <p className="text-center py-8 text-[11px] text-slate-600">
            Térkép nem elérhető (épület koordináta hiányzik).
          </p>
        ) : loadingPois ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
            <p className="text-[11px] text-slate-600">POI-k lekérdezése az OpenStreetMap-ből…</p>
          </div>
        ) : !hasPois ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <p className="text-[11px] text-slate-500">A jelenlegi adatcsomag (cache) nem tartalmazza a POI listát.</p>
            {onRequestLivePois && (
              <button
                type="button"
                onClick={onRequestLivePois}
                className="rounded-xl border border-white/[0.08] px-4 py-2 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.05] transition-colors"
              >
                Live POI-k lekérése
              </button>
            )}
          </div>
        ) : (
          <>
            {singlePoiOsmId != null && (
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                <p className="text-[9px] font-semibold text-slate-400">Egyetlen helyszín megjelenítve</p>
                <button
                  type="button"
                  onClick={() => { setSinglePoiOsmId(null); setMapZoomToPoiId(null); }}
                  className="rounded-md border border-white/[0.08] px-2 py-0.5 text-[9px] font-semibold text-slate-300 hover:bg-white/[0.06] transition-colors"
                >
                  ← Összes POI mutatása
                </button>
              </div>
            )}
            <CompactCityMap
              buildingLat={buildingLat as number}
              buildingLon={buildingLon as number}
              pois={data.pois ?? []}
              initialFilterGroups={mapFilterGroups}
              zoomToPoiId={mapZoomToPoiId}
              singlePoiOsmId={singlePoiOsmId}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {ToggleBar}
      {/* Hero row */}
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-1">
          <WalkRing score={data.score15min} color={mainColor} />
          <p className="text-[10px] font-semibold" style={{ color: mainColor }}>{scoreLabel(data.score15min)}</p>
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
        {([
          { kind: 'food'      as const, label: 'Legközelebbi ABC',          dist: data.nearestSupermarketM, color: '#fb923c' },
          { kind: 'health'    as const, label: 'Legközelebbi gyógyszertár', dist: data.nearestPharmacyM,    color: '#38bdf8' },
          { kind: 'education' as const, label: 'Legközelebbi iskola',       dist: data.nearestSchoolM,      color: '#a78bfa' },
        ]).map(item => {
          // Only act on the click if the data is actually there AND the map
          // tab is reachable; otherwise the card is purely informational.
          const clickable = canShowMap && item.dist !== null && pois.length > 0;
          return (
            <div
              key={item.label}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => focusNearest(item.kind) : undefined}
              onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); focusNearest(item.kind); } } : undefined}
              className={`relative rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center transition-colors ${
                clickable ? 'cursor-pointer hover:bg-white/[0.05] hover:border-white/[0.15]' : ''
              }`}
            >
              {clickable && (
                <span className="absolute top-1.5 right-2 text-[8px] font-semibold text-slate-500">→</span>
              )}
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
              <p className="text-[9px] text-slate-500 mt-1">{item.label}</p>
              {item.dist !== null ? (
                <>
                  <p className="text-lg font-semibold tabular-nums" style={{ color: item.color }}>{item.dist} <span className="text-xs text-slate-500">m</span></p>
                  <p className="text-[8px] text-slate-600">~{Math.round(item.dist / 67)} perc gyalog</p>
                </>
              ) : (
                <p className="text-xs text-slate-600 mt-1">Nincs az 1 km-es körben</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Amenity grid */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Létesítmények 1 km-en belül</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {data.amenities.map(a => {
            // `a.category` on the server is already one of our CatGroup keys
            // (food / health / education / dining / culture / sport). We only
            // treat it as clickable if (a) the group is one we know how to
            // filter, (b) the map tab is reachable, and (c) the count > 0.
            const group = (a.category as CatGroup);
            const clickable =
              canShowMap &&
              a.count > 0 &&
              pois.length > 0 &&
              (group in GROUP_CATEGORIES);
            return (
              <div
                key={a.category}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => focusCategoryGroup(group) : undefined}
                onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); focusCategoryGroup(group); } } : undefined}
                className={`rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center transition-colors ${
                  clickable ? 'cursor-pointer hover:bg-white/[0.05] hover:border-white/[0.15]' : ''
                }`}
              >
                <p className="text-[9px] text-slate-500 mt-1">{a.label}</p>
                <p className="text-xl font-semibold tabular-nums text-slate-100">{a.count}</p>
                {a.nearestM !== null && <p className="text-[8px] text-slate-600">{a.nearestM}m</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* What is compact city */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">A 15 perces város koncepció</p>
        <div className="grid gap-2 sm:grid-cols-3 text-[9px] leading-relaxed text-slate-500">
          <p><span className="text-slate-300 font-semibold">Carlos Moreno (2016):</span> Minden alapszolgáltatás gyalog vagy kerékpárral elérhető 15 percen belül.</p>
          <p><span className="text-slate-300 font-semibold">Gyalogolhatóság:</span> Üzletek, egészségügy, oktatás, kultúra távolsága exponenciális decay-függvény alapján.</p>
          <p><span className="text-slate-300 font-semibold">Adat:</span> OSM Overpass API (1,5 km sugár) + BKK Transit megálló-adatbázis.</p>
        </div>
      </div>
    </div>
  );
}
