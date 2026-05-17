'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Bike, Bus, ChevronRight, MapPin, Leaf, RefreshCw, AlertCircle } from 'lucide-react';
import type { TransitNearbyResult, NearbyStop, RouteType } from '@/app/api/transit/nearby/route';
import type { DepartureBoard, Departure } from '@/app/api/transit/departures/route';

// ─── Animation CSS ─────────────────────────────────────────────────────────────
const TP_CSS = `
  @keyframes tp-ring-in {
    from { stroke-dashoffset: 314; opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes tp-pulse-ring {
    0%,100% { opacity: 0.12; r: 44; }
    50%      { opacity: 0.26; r: 50; }
  }
  @keyframes tp-bounce-in {
    0%   { transform: scale(0.6) translateY(8px); opacity: 0; }
    70%  { transform: scale(1.05) translateY(-2px); }
    100% { transform: scale(1) translateY(0); opacity: 1; }
  }
  @keyframes tp-slide-up {
    from { transform: translateY(6px); opacity: 0; }
    to   { transform: translateY(0);   opacity: 1; }
  }
  @keyframes tp-blink {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.35; }
  }
`;

// ─── Route type badge config ──────────────────────────────────────────────────
const ROUTE_STYLE: Record<RouteType | string, { bg: string; text: string; border: string; label: string }> = {
  SUBWAY:     { bg: 'bg-red-600',     text: 'text-white',        border: 'border-red-700',     label: 'M' },
  TRAM:       { bg: 'bg-yellow-400',  text: 'text-yellow-900',   border: 'border-yellow-500',  label: 'V' },
  TROLLEYBUS: { bg: 'bg-red-400',     text: 'text-white',        border: 'border-red-500',     label: 'Tr' },
  BUS:        { bg: 'bg-sky-500',     text: 'text-white',        border: 'border-sky-600',     label: 'B' },
  RAIL:       { bg: 'bg-violet-600',  text: 'text-white',        border: 'border-violet-700',  label: 'H' },
  FERRY:      { bg: 'bg-teal-500',    text: 'text-white',        border: 'border-teal-600',    label: 'H' },
  CABLE_CAR:  { bg: 'bg-amber-500',   text: 'text-white',        border: 'border-amber-600',   label: 'D' },
};

const VEHICLE_COLOR: Record<Departure['vehicle'], string> = {
  SUBWAY: '#ef4444', TRAM: '#fbbf24', TROLLEYBUS: '#f87171',
  BUS: '#38bdf8', RAIL: '#a78bfa', FERRY: '#2dd4bf',
};

// ─── Coverage score ring ──────────────────────────────────────────────────────
function CoverageRing({ total, label, color }: { total: number; label: string; color: string }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const fill = circ * Math.min(total / 100, 1);
  const gap = circ - fill;

  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: 110, height: 110 }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <defs>
          <style>{TP_CSS}</style>
        </defs>
        {/* Pulse halo */}
        <circle cx="55" cy="55" r="44" fill={color} opacity="0"
          style={{ animation: 'tp-pulse-ring 4s ease-in-out infinite' }}
        />
        {/* Track */}
        <circle cx="55" cy="55" r={r} fill="none"
          stroke="white" strokeOpacity="0.07" strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Fill */}
        <circle cx="55" cy="55" r={r} fill="none"
          stroke={color} strokeOpacity="0.9" strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${gap}`}
          transform="rotate(-90 55 55)"
          style={{
            animation: 'tp-ring-in 1.2s ease-out both',
            filter: `drop-shadow(0 0 4px ${color}80)`,
            transition: 'stroke-dasharray 1s ease',
          }}
        />
        {/* Score */}
        <text x="55" y="50" textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize="22" fontWeight="900" letterSpacing="-1"
          style={{ fontFamily: 'inherit' }}
        >
          {total}
        </text>
        <text x="55" y="68" textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize="8" fontWeight="600" opacity="0.65"
          style={{ fontFamily: 'inherit' }}
        >
          / 100
        </text>
      </svg>
      {/* Label below ring */}
      <div className="absolute bottom-0 left-0 right-0 text-center">
        <span className="text-[9px] font-black" style={{ color, textShadow: `0 0 8px ${color}60` }}>
          {label}
        </span>
      </div>
    </div>
  );
}

// ─── Score breakdown bars ─────────────────────────────────────────────────────
function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-14 text-[8px] font-bold text-slate-500 leading-none">{label}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(value / max * 100, 100)}%`, background: color, boxShadow: `0 0 4px ${color}60` }}
        />
      </div>
      <span className="w-6 text-right text-[8px] tabular-nums font-bold" style={{ color }}>{value}</span>
    </div>
  );
}

// ─── Route badge pill ─────────────────────────────────────────────────────────
function RouteBadge({ routeRef, type }: { routeRef: string; type: RouteType }) {
  const s = ROUTE_STYLE[type] ?? ROUTE_STYLE.BUS;
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-black border ${s.bg} ${s.text} ${s.border}`}>
      {routeRef}
    </span>
  );
}

// ─── Stop row ─────────────────────────────────────────────────────────────────
function StopRow({
  stop, selected, onClick,
}: {
  stop: NearbyStop;
  selected: boolean;
  onClick: () => void;
}) {
  const s = ROUTE_STYLE[stop.routeType] ?? ROUTE_STYLE.BUS;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-2 rounded-xl px-2.5 py-2 text-left transition-all ${
        selected
          ? 'bg-white/[0.10] ring-1 ring-white/20'
          : 'hover:bg-white/[0.05]'
      }`}
    >
      {/* Type dot */}
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[7px] font-black ${s.bg} ${s.text}`}>
        {s.label}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-bold text-slate-200 leading-tight">{stop.name}</p>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {stop.routeRefs.slice(0, 5).map(r => (
            <RouteBadge key={r} routeRef={r} type={stop.routeType} />
          ))}
          {stop.routeRefs.length > 5 && (
            <span className="text-[8px] text-slate-600">+{stop.routeRefs.length - 5}</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-[9px] tabular-nums text-slate-400">{stop.distanceM}m</span>
        <ChevronRight size={10} className={`transition-opacity ${selected ? 'opacity-80' : 'opacity-30'}`} />
      </div>
    </button>
  );
}

// ─── Departure countdown ──────────────────────────────────────────────────────
function DepartureTime({ minutes, realtime }: { minutes: number; realtime: boolean }) {
  if (minutes <= 0) return (
    <span className="text-[9px] font-black text-emerald-400" style={{ animation: 'tp-blink 1.4s ease-in-out infinite' }}>
      ◆ Indul
    </span>
  );
  return (
    <span className="flex items-baseline gap-0.5">
      <span className="text-[13px] font-black tabular-nums leading-none" style={{ color: realtime ? '#34d399' : '#94a3b8' }}>
        {minutes}
      </span>
      <span className="text-[8px] text-slate-500">p</span>
      {realtime && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
    </span>
  );
}

// ─── Departure board panel ────────────────────────────────────────────────────
function DepartureBoardPanel({ stopId, stopName }: { stopId: string; stopName: string }) {
  const [board, setBoard] = useState<DepartureBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const prevStopId = useRef('');

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/transit/departures?stopId=${encodeURIComponent(stopId)}`)
      .then(r => r.json())
      .then(d => { setBoard(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [stopId]);

  useEffect(() => {
    if (stopId !== prevStopId.current) {
      prevStopId.current = stopId;
      load();
    }
  }, [stopId, load]);

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5 animate-pulse">
        {[1,2,3].map(i => (
          <div key={i} className="h-8 rounded-xl bg-white/[0.05]" />
        ))}
      </div>
    );
  }

  if (!board || board.departures.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
        <AlertCircle size={12} className="text-slate-600" />
        <p className="text-[10px] text-slate-600">Nincs indulási adat</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 truncate pr-2">{board.stopName || stopName}</p>
        <button onClick={load} className="text-slate-600 hover:text-slate-400 transition-colors">
          <RefreshCw size={10} />
        </button>
      </div>
      <ul className="space-y-1">
        {board.departures.map((dep, i) => (
          <li key={i}
            className="flex items-center gap-2 rounded-xl px-2.5 py-1.5"
            style={{ animation: `tp-slide-up 0.3s ease-out ${i * 0.06}s both`, background: 'rgba(255,255,255,0.04)' }}
          >
            {/* Vehicle color dot */}
            <span className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: VEHICLE_COLOR[dep.vehicle] }} />
            {/* Route number */}
            <span className="w-8 text-[11px] font-black tabular-nums leading-none"
              style={{ color: VEHICLE_COLOR[dep.vehicle] }}>
              {dep.routeRef}
            </span>
            {/* Headsign */}
            <span className="min-w-0 flex-1 truncate text-[9px] text-slate-400">{dep.headsign}</span>
            {/* Time */}
            <DepartureTime minutes={dep.minutesAway} realtime={dep.realtime} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Bubi station card ────────────────────────────────────────────────────────
function BubiCard({ station }: { station: TransitNearbyResult['bubi'][number] }) {
  const pct = station.totalDocks > 0 ? station.bikesAvail / station.totalDocks : 0;
  const color = pct > 0.5 ? '#34d399' : pct > 0.2 ? '#fbbf24' : '#f87171';

  return (
    <div className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <Bike size={14} className="shrink-0" style={{ color }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-bold text-slate-300 leading-tight">{station.name}</p>
        <p className="text-[8px] text-slate-500">{station.distanceM}m</p>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <div className="flex items-baseline gap-0.5">
          <span className="text-[13px] font-black tabular-nums leading-none" style={{ color }}>
            {station.bikesAvail}
          </span>
          <span className="text-[8px] text-slate-500">/{station.totalDocks}</span>
        </div>
        <p className="text-[8px] text-slate-600">kerékpár</p>
      </div>
    </div>
  );
}

// ─── CO₂ comparison calculator ────────────────────────────────────────────────
const CO2_PER_KM: Record<string, { label: string; gCo2: number; color: string; icon: string }> = {
  car:     { label: 'Autó',         gCo2: 171,  color: '#f87171', icon: '🚗' },
  transit: { label: 'Tömegközlek.', gCo2: 28,   color: '#38bdf8', icon: '🚌' },
  ebike:   { label: 'E-bike/Bubi',  gCo2: 8,    color: '#34d399', icon: '🚲' },
  walk:    { label: 'Gyalog',       gCo2: 0,    color: '#a78bfa', icon: '🚶' },
};

function Co2Calculator() {
  const [km, setKm] = useState(5);
  const maxCo2 = CO2_PER_KM.car.gCo2 * km;

  return (
    <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Leaf size={12} className="text-emerald-400" />
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">CO₂ összehasonlító</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-slate-500">{km} km</span>
          <input
            type="range" min={1} max={20} value={km}
            onChange={e => setKm(Number(e.target.value))}
            className="w-16 h-1 accent-emerald-400"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        {Object.entries(CO2_PER_KM).map(([key, cfg]) => {
          const total = cfg.gCo2 * km;
          const frac = maxCo2 > 0 ? total / maxCo2 : 0;
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="w-4 text-center text-[10px]">{cfg.icon}</span>
              <span className="w-20 text-[9px] text-slate-400 truncate">{cfg.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${frac * 100}%`, background: cfg.color, boxShadow: `0 0 4px ${cfg.color}60` }}
                />
              </div>
              <span className="w-12 text-right text-[9px] tabular-nums font-bold" style={{ color: cfg.color }}>
                {total === 0 ? '0 g' : total < 1000 ? `${total} g` : `${(total/1000).toFixed(1)} kg`}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[8px] text-slate-700">
        Forrás: EU átlag 2024 · Bubi ~0 közvetlen emissziót produkál
      </p>
    </div>
  );
}

// ─── Coverage color helper ────────────────────────────────────────────────────
function coverageColor(total: number): string {
  if (total >= 80) return '#34d399';  // emerald
  if (total >= 60) return '#38bdf8';  // sky
  if (total >= 40) return '#fbbf24';  // amber
  if (total >= 20) return '#f97316';  // orange
  return '#f87171';                   // red
}

// ─── Main TransportPanel ──────────────────────────────────────────────────────
interface TransportPanelProps {
  lat?: number;
  lon?: number;
}

export default function TransportPanel({ lat = 47.4979, lon = 19.0402 }: TransportPanelProps) {
  const [data, setData] = useState<TransitNearbyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStop, setSelectedStop] = useState<NearbyStop | null>(null);
  const [tab, setTab] = useState<'stops' | 'bubi' | 'co2'>('stops');

  useEffect(() => {
    fetch(`/api/transit/nearby?lat=${lat}&lon=${lon}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
        if (d.stops?.length > 0) setSelectedStop(d.stops[0]);
      })
      .catch(() => setLoading(false));
  }, [lat, lon]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        <div className="h-[110px] w-[110px] self-center rounded-full bg-white/[0.05]" />
        <div className="h-4 w-32 self-center rounded bg-white/[0.05]" />
        {[1,2,3].map(i => <div key={i} className="h-10 rounded-xl bg-white/[0.05]" />)}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-[10px] text-slate-600">Közlekedési adatok nem elérhetők</p>
      </div>
    );
  }

  const { coverage, stops, bubi } = data;
  const color = coverageColor(coverage.total);

  return (
    <div className="flex flex-col gap-3">
      {/* Coverage ring + score breakdown */}
      <div className="flex items-center gap-4">
        <CoverageRing total={coverage.total} label={coverage.label} color={color} />
        <div className="flex-1 space-y-1.5">
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-2">Tömegközl. lefedettség</p>
          <ScoreBar label="Megállók"   value={coverage.stopScore}    max={40} color="#38bdf8" />
          <ScoreBar label="Minőség"    value={coverage.qualityScore} max={40} color="#a78bfa" />
          <ScoreBar label="Útvonalak"  value={coverage.accessScore}  max={20} color="#34d399" />
          <p className="mt-1 text-[8px] text-slate-600">
            {stops.length} megálló · {new Set(stops.flatMap(s => s.routeRefs)).size} járat 700m-en belül
          </p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {([
          ['stops', <Bus size={10} key="b" />, 'Megállók'],
          ['bubi',  <Bike size={10} key="k" />, 'Bubi'],
          ['co2',   <Leaf size={10} key="l" />, 'CO₂'],
        ] as const).map(([id, icon, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[9px] font-black transition-all ${
              tab === id
                ? 'bg-white/[0.12] text-white'
                : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'stops' && (
        <div className="flex flex-col gap-1">
          {stops.slice(0, 6).map(stop => (
            <StopRow
              key={stop.id}
              stop={stop}
              selected={selectedStop?.id === stop.id}
              onClick={() => setSelectedStop(stop)}
            />
          ))}
          {stops.length === 0 && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <MapPin size={12} className="text-slate-600" />
              <p className="text-[10px] text-slate-600">Nincsenek közeli megállók</p>
            </div>
          )}

          {/* Departure board for selected stop */}
          {selectedStop && (
            <div className="mt-1 rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <DepartureBoardPanel stopId={selectedStop.id} stopName={selectedStop.name} />
            </div>
          )}
        </div>
      )}

      {tab === 'bubi' && (
        <div className="flex flex-col gap-1.5">
          {bubi.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <Bike size={14} className="text-slate-600" />
              <div>
                <p className="text-[10px] font-bold text-slate-500">Nincs Bubi állomás a közelben</p>
                <p className="text-[9px] text-slate-600">800m-en belül nem található dokkoló</p>
              </div>
            </div>
          ) : (
            bubi.map(s => <BubiCard key={s.id} station={s} />)
          )}
          <div className="mt-1 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-[8px] text-slate-600 leading-relaxed">
              💡 A kerékpározás a főutcáknál 53%-kal kevesebb ultrafinom részecskét jelent parki útvonalakon.
              (Antwerp tanulmány, 2014)
            </p>
          </div>
        </div>
      )}

      {tab === 'co2' && <Co2Calculator />}

      {/* Data source badge */}
      <div className="flex items-center justify-between">
        <p className="text-[8px] text-slate-700">
          Forrás: {data.source === 'futar' ? 'BKK Futár GTFS' : data.source === 'overpass' ? 'OpenStreetMap' : 'Minta adatok'}
        </p>
        <p className="text-[8px] text-slate-700">
          {new Date(data.fetchedAt).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
