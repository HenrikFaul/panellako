'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AlertTriangle, Bike, Bus, ChevronRight, Leaf, MapPin, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import type { TransitNearbyResult, NearbyStop, RouteType } from '@/app/api/transit/nearby/route';
import type { DepartureBoard, Departure } from '@/app/api/transit/departures/route';
import type { AlertsResult, TransitAlert, AlertSeverity } from '@/app/api/transit/alerts/route';
import TransitLiveMap, { type TransitLiveMapHandle } from '@/components/transit-live-map';
import TransitCoverageMap from '@/components/transit-coverage-map';

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
  @keyframes tp-slide-up {
    from { transform: translateY(6px); opacity: 0; }
    to   { transform: translateY(0);   opacity: 1; }
  }
  @keyframes tp-blink {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.35; }
  }
  @keyframes tp-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
`;

// ─── Route type badge config ──────────────────────────────────────────────────
const ROUTE_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  SUBWAY:     { bg: 'bg-red-600',     text: 'text-white',        border: 'border-red-700',     label: 'M' },
  TRAM:       { bg: 'bg-yellow-400',  text: 'text-yellow-900',   border: 'border-yellow-500',  label: 'V' },
  TROLLEYBUS: { bg: 'bg-red-400',     text: 'text-white',        border: 'border-red-500',     label: 'Tr' },
  BUS:        { bg: 'bg-sky-500',     text: 'text-white',        border: 'border-sky-600',     label: 'B' },
  RAIL:       { bg: 'bg-violet-600',  text: 'text-white',        border: 'border-violet-700',  label: 'H' },
  FERRY:      { bg: 'bg-teal-500',    text: 'text-white',        border: 'border-teal-600',    label: 'H' },
  CABLE_CAR:  { bg: 'bg-amber-500',   text: 'text-white',        border: 'border-amber-600',   label: 'D' },
};

const VEHICLE_COLOR: Record<string, string> = {
  SUBWAY: '#ef4444', TRAM: '#fbbf24', TROLLEYBUS: '#f87171',
  BUS: '#38bdf8', RAIL: '#a78bfa', FERRY: '#2dd4bf',
};

// Severity-level border opacity — magas riasztásnál erősebb border
const SEVERITY_BORDER_OPACITY: Record<AlertSeverity['level'], string> = {
  high:   '50',
  medium: '35',
  low:    '25',
};

// ─── Freshness state ──────────────────────────────────────────────────────────
type FeedHealth = 'live' | 'refreshing' | 'stale' | 'offline';

function feedHealth(lastFetched: Date | null, isRefreshing: boolean): FeedHealth {
  if (isRefreshing) return 'refreshing';
  if (!lastFetched) return 'offline';
  const ageMs = Date.now() - lastFetched.getTime();
  if (ageMs < 90_000) return 'live';
  if (ageMs < 5 * 60_000) return 'stale';
  return 'offline';
}

function FeedHealthBadge({ health, lastFetched }: { health: FeedHealth; lastFetched: Date | null }) {
  const labels: Record<FeedHealth, { label: string; color: string }> = {
    live:       { label: 'Élő',       color: '#34d399' },
    refreshing: { label: 'Frissül…',  color: '#38bdf8' },
    stale:      { label: 'Elavult',   color: '#f97316' },
    offline:    { label: 'Offline',   color: '#ef4444' },
  };
  const { label, color } = labels[health];
  const timeStr = lastFetched
    ? lastFetched.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  return (
    <div className="flex items-center gap-1.5">
      {health === 'live'
        ? <Wifi size={9} style={{ color }} />
        : health === 'offline'
          ? <WifiOff size={9} style={{ color }} />
          : <RefreshCw size={9} style={{ color, animation: health === 'refreshing' ? 'tp-spin 1s linear infinite' : undefined }} />
      }
      <span className="text-[8px] font-bold" style={{ color }}>{label}</span>
      {lastFetched && (
        <span className="text-[8px] text-slate-700">{timeStr}</span>
      )}
    </div>
  );
}

// ─── Coverage score ring ──────────────────────────────────────────────────────
function CoverageRing({ total, label, color }: { total: number; label: string; color: string }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const fill = circ * Math.min(total / 100, 1);
  const gap = circ - fill;
  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: 110, height: 110 }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <defs><style>{TP_CSS}</style></defs>
        <circle cx="55" cy="55" r="44" fill={color} opacity="0"
          style={{ animation: 'tp-pulse-ring 4s ease-in-out infinite' }} />
        <circle cx="55" cy="55" r={r} fill="none"
          stroke="white" strokeOpacity="0.07" strokeWidth="6" strokeLinecap="round" />
        <circle cx="55" cy="55" r={r} fill="none"
          stroke={color} strokeOpacity="0.9" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${fill} ${gap}`}
          transform="rotate(-90 55 55)"
          style={{ animation: 'tp-ring-in 1.2s ease-out both', filter: `drop-shadow(0 0 4px ${color}80)`, transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="55" y="50" textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize="22" fontWeight="900" letterSpacing="-1"
          style={{ fontFamily: 'inherit' }}>{total}</text>
        <text x="55" y="68" textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize="8" fontWeight="600" opacity="0.65"
          style={{ fontFamily: 'inherit' }}>/ 100</text>
      </svg>
      <div className="absolute bottom-0 left-0 right-0 text-center">
        <span className="text-[9px] font-semibold" style={{ color, textShadow: `0 0 8px ${color}60` }}>
          {label}
        </span>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-14 text-[8px] font-bold text-slate-500 leading-none">{label}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(value / max * 100, 100)}%`, background: color, boxShadow: `0 0 4px ${color}60` }} />
      </div>
      <span className="w-6 text-right text-[8px] tabular-nums font-bold" style={{ color }}>{value}</span>
    </div>
  );
}

// ─── Route badge ─────────────────────────────────────────────────────────────
function RouteBadge({ routeRef, type }: { routeRef: string; type: RouteType }) {
  const s = ROUTE_STYLE[type] ?? ROUTE_STYLE.BUS;
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold border ${s.bg} ${s.text} ${s.border}`}>
      {routeRef}
    </span>
  );
}

// ─── Stop row ─────────────────────────────────────────────────────────────────
function StopRow({ stop, selected, onClick }: {
  stop: NearbyStop; selected: boolean; onClick: () => void;
}) {
  const s = ROUTE_STYLE[stop.routeType] ?? ROUTE_STYLE.BUS;
  return (
    <button onClick={onClick}
      className={`w-full flex items-start gap-2 rounded-xl px-2.5 py-2 text-left transition-all ${
        selected ? 'bg-white/[0.10] ring-1 ring-white/20' : 'hover:bg-white/[0.05]'
      }`}
    >
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[7px] font-semibold ${s.bg} ${s.text}`}>
        {s.label}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-bold text-slate-200 leading-tight">{stop.name}</p>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {stop.routeRefs.slice(0, 5).map(r => <RouteBadge key={r} routeRef={r} type={stop.routeType} />)}
          {stop.routeRefs.length > 5 && <span className="text-[8px] text-slate-600">+{stop.routeRefs.length - 5}</span>}
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
    <span className="text-[9px] font-semibold text-emerald-400"
      style={{ animation: 'tp-blink 1.4s ease-in-out infinite' }}>◆ Indul</span>
  );
  return (
    <span className="flex items-baseline gap-0.5">
      <span className="text-[13px] font-semibold tabular-nums leading-none"
        style={{ color: realtime ? '#34d399' : '#94a3b8' }}>{minutes}</span>
      <span className="text-[8px] text-slate-500">p</span>
      {realtime && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
    </span>
  );
}

// ─── Departure board ──────────────────────────────────────────────────────────
function DepartureBoardPanel({ stopId, stopName, refreshKey }: {
  stopId: string; stopName: string; refreshKey: number;
}) {
  const [board, setBoard] = useState<DepartureBoard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/transit/departures?stopId=${encodeURIComponent(stopId)}`)
      .then(r => r.json())
      .then(d => { setBoard(d); setLoading(false); })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopId, refreshKey]);

  if (loading) return (
    <div className="flex flex-col gap-1.5 animate-pulse">
      {[1,2,3].map(i => <div key={i} className="h-8 rounded-xl bg-white/[0.05]" />)}
    </div>
  );

  if (!board || board.departures.length === 0) return (
    <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
      <MapPin size={12} className="text-slate-600" />
      <p className="text-[10px] text-slate-600">Nincs indulási adat</p>
    </div>
  );

  const isMock    = (board as { _mock?: boolean })._mock;
  const mockError = (board as { _error?: string })._error;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 truncate pr-2">{board.stopName || stopName}</p>
        {isMock && (
          <span className="rounded-full bg-amber-900/20 px-1.5 py-0.5 text-[7px] font-bold text-amber-300 italic">
            API nem elérhető
          </span>
        )}
      </div>
      {isMock && mockError && (
        <p className="mb-1.5 rounded-lg bg-amber-900/10 px-2 py-1 text-[8px] text-amber-400 break-words leading-snug">
          {mockError}
        </p>
      )}
      <ul className="space-y-1">
        {board.departures.map((dep: Departure, i) => (
          <li key={`${dep.routeRef}-${dep.tripId ?? i}`}
            className="flex items-center gap-2 rounded-xl px-2.5 py-1.5"
            style={{ animation: `tp-slide-up 0.3s ease-out ${i * 0.06}s both`, background: 'rgba(255,255,255,0.04)' }}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: VEHICLE_COLOR[dep.vehicle] ?? '#94a3b8' }} />
            <span className="w-8 text-[11px] font-semibold tabular-nums leading-none"
              style={{ color: VEHICLE_COLOR[dep.vehicle] ?? '#94a3b8' }}>{dep.routeRef}</span>
            <span className="min-w-0 flex-1 truncate text-[9px] text-slate-400">{dep.headsign ?? ''}</span>
            <DepartureTime minutes={dep.minutesAway} realtime={dep.realtime} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Alert card ───────────────────────────────────────────────────────────────
function AlertCard({ alert }: { alert: TransitAlert }) {
  const { color, level } = alert.severity;
  const borderOpacity = SEVERITY_BORDER_OPACITY[level];
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen(v => !v)}
      className="w-full rounded-xl px-3 py-2 text-left transition-all"
      style={{ background: `${color}14`, border: `1px solid ${color}${borderOpacity}` }}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle size={11} style={{ color, flexShrink: 0, marginTop: 1 }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-bold leading-tight" style={{ color }}>{alert.headerText}</p>
            {level === 'high' && (
              <span className="shrink-0 rounded-full px-1 py-0.5 text-[7px] font-semibold"
                style={{ background: `${color}30`, color }}>
                ●
              </span>
            )}
          </div>
          {alert.routes.length > 0 && (
            <p className="mt-0.5 text-[8px] text-slate-500">Érintett: {alert.routes.join(', ')}</p>
          )}
        </div>
      </div>
      {open && alert.descriptionText && (
        <p className="mt-1.5 text-[9px] text-slate-400 leading-relaxed">{alert.descriptionText}</p>
      )}
    </button>
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
          <span className="text-[13px] font-semibold tabular-nums leading-none" style={{ color }}>{station.bikesAvail}</span>
          <span className="text-[8px] text-slate-500">/{station.totalDocks}</span>
        </div>
        <p className="text-[8px] text-slate-600">kerékpár</p>
      </div>
    </div>
  );
}

// ─── CO₂ calculator ───────────────────────────────────────────────────────────
const CO2_PER_KM: Record<string, { label: string; gCo2: number; color: string }> = {
  car:     { label: 'Autó',         gCo2: 171, color: '#f87171' },
  transit: { label: 'Tömegközlek.', gCo2: 28,  color: '#38bdf8' },
  ebike:   { label: 'E-bike/Bubi',  gCo2: 8,   color: '#34d399' },
  walk:    { label: 'Gyalog',       gCo2: 0,   color: '#a78bfa' },
};
function Co2Calculator() {
  const [km, setKm] = useState(5);
  const maxCo2 = CO2_PER_KM.car.gCo2 * km;
  return (
    <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Leaf size={12} className="text-emerald-400" />
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">CO₂ összehasonlító</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-slate-500">{km} km</span>
          <input type="range" min={1} max={20} value={km}
            onChange={e => setKm(Number(e.target.value))}
            className="w-16 h-1 accent-emerald-400" />
        </div>
      </div>
      <div className="space-y-1.5">
        {Object.entries(CO2_PER_KM).map(([key, cfg]) => {
          const total = cfg.gCo2 * km;
          const frac = maxCo2 > 0 ? total / maxCo2 : 0;
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
              <span className="w-20 text-[9px] text-slate-400 truncate">{cfg.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${frac * 100}%`, background: cfg.color, boxShadow: `0 0 4px ${cfg.color}60` }} />
              </div>
              <span className="w-12 text-right text-[9px] tabular-nums font-bold" style={{ color: cfg.color }}>
                {total === 0 ? '0 g' : total < 1000 ? `${total} g` : `${(total/1000).toFixed(1)} kg`}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[8px] text-slate-700">Forrás: EU átlag 2024 · Bubi ~0 közvetlen emissziót produkál</p>
    </div>
  );
}

// ─── Coverage color ────────────────────────────────────────────────────────────
function coverageColor(total: number): string {
  if (total >= 80) return '#34d399';
  if (total >= 60) return '#38bdf8';
  if (total >= 40) return '#fbbf24';
  if (total >= 20) return '#f97316';
  return '#f87171';
}

// ─── Geocoding hook ───────────────────────────────────────────────────────────
function useGeocoordinate(
  lat: number | undefined,
  lon: number | undefined,
  buildingAddress: string | undefined
): { lat: number; lon: number; geocoding: boolean } {
  // Budapest center as last-resort default
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({
    lat: lat ?? 47.5278845,
    lon: lon ?? 19.0705657,
  });
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (lat !== undefined && lon !== undefined) {
      setCoords({ lat, lon });
      return;
    }
    if (!buildingAddress) return;
    setGeocoding(true);
    fetch(`/api/transit/geocode?address=${encodeURIComponent(buildingAddress)}`)
      .then(r => r.json())
      .then(d => {
        if (d.lat && d.lon) setCoords({ lat: d.lat, lon: d.lon });
      })
      .catch(() => {})
      .finally(() => setGeocoding(false));
  }, [lat, lon, buildingAddress]);

  return { ...coords, geocoding };
}

// ─── Main TransportPanel ──────────────────────────────────────────────────────
interface TransportPanelProps {
  lat?:             number;
  lon?:             number;
  buildingAddress?: string;
  buildingId?:      string;
}

const REFRESH_INTERVAL_MS = 30_000;  // 30 seconds

export default function TransportPanel({ lat, lon, buildingAddress, buildingId }: TransportPanelProps) {
  const { lat: realLat, lon: realLon, geocoding } = useGeocoordinate(lat, lon, buildingAddress);

  const [data, setData]               = useState<TransitNearbyResult | null>(null);
  const [alerts, setAlerts]           = useState<AlertsResult | null>(null);
  const [loading, setLoading]         = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey]   = useState(0);
  const [selectedStop, setSelectedStop] = useState<NearbyStop | null>(null);
  const [tab, setTab]                 = useState<'stops' | 'bubi' | 'co2' | 'alerts'>('stops');
  const [walkRadiusM, setWalkRadiusM] = useState(420);
  const coordsReady                   = !geocoding && (realLat !== 47.5278845 || realLon !== 19.0705657 || lat !== undefined);
  const firstLoad                     = useRef(true);
  const mapRef                        = useRef<TransitLiveMapHandle>(null);

  const fetchData = useCallback(async () => {
    if (firstLoad.current) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const nearbyUrl = `/api/transit/nearby?lat=${realLat}&lon=${realLon}${buildingId ? `&buildingId=${encodeURIComponent(buildingId)}` : ''}&radiusM=${walkRadiusM}`;
      const [nearbyRes, alertsRes] = await Promise.allSettled([
        fetch(nearbyUrl).then(r => r.json()),
        fetch('/api/transit/alerts').then(r => r.json()),
      ]);

      if (nearbyRes.status === 'fulfilled') {
        const d = nearbyRes.value as TransitNearbyResult;
        setData(d);
        if (!selectedStop && d.stops?.length > 0) setSelectedStop(d.stops[0]);
      }
      if (alertsRes.status === 'fulfilled') {
        setAlerts(alertsRes.value as AlertsResult);
      }
      setLastFetched(new Date());
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      firstLoad.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realLat, realLon, buildingId, walkRadiusM]);

  // Initial load + coordinate changes
  useEffect(() => {
    firstLoad.current = true;
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => {
      setRefreshKey(k => k + 1);
      fetchData();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  const health = feedHealth(lastFetched, isRefreshing || geocoding);

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (loading || geocoding) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-1.5">
          <div className="h-2 w-2 rounded-full bg-white/[0.10]" />
          <div className="h-2 w-32 rounded bg-white/[0.10]" />
        </div>
        <div className="h-[110px] w-[110px] self-center rounded-full bg-white/[0.05]" />
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
  const alertCount = alerts?.alerts.length ?? 0;
  const isMockData = data.source === 'mock';

  return (
    <div className="grid gap-5 xl:grid-cols-[280px_1fr]">

      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">

        {/* Address + freshness row */}
        <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              onClick={() => mapRef.current?.flyToBuilding()}
              title="Térkép centrírozása az épületre"
              className="shrink-0 rounded p-0.5 text-slate-600 transition-colors hover:text-sky-400 hover:bg-white/[0.08]"
            >
              <MapPin size={9} />
            </button>
            <p className="truncate text-[9px] text-slate-500">
              {buildingAddress
                ? buildingAddress.replace(/^HU,\s*/i, '').slice(0, 35)
                : `${realLat.toFixed(4)}°N ${realLon.toFixed(4)}°E`}
            </p>
            {isMockData && (
              <span className="ml-1 rounded-full bg-amber-900/30 px-1.5 py-0.5 text-[7px] font-bold text-amber-400">
                MINTA
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <FeedHealthBadge health={health} lastFetched={lastFetched} />
            <button
              onClick={() => { setRefreshKey(k => k + 1); fetchData(); }}
              className="text-slate-600 hover:text-slate-400 transition-colors"
              disabled={isRefreshing}
            >
              <RefreshCw size={10} style={isRefreshing ? { animation: 'tp-spin 1s linear infinite' } : undefined} />
            </button>
          </div>
        </div>

        {/* Coverage ring */}
        <div className="flex items-center gap-4">
          <CoverageRing total={coverage.total} label={coverage.label} color={color} />
          <div className="flex-1 space-y-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Tömegközl. lefedettség</p>
            <ScoreBar label="Megállók"  value={coverage.stopScore}    max={40} color="#38bdf8" />
            <ScoreBar label="Minőség"   value={coverage.qualityScore} max={40} color="#a78bfa" />
            <ScoreBar label="Útvonalak" value={coverage.accessScore}  max={20} color="#34d399" />
            <p className="mt-1 text-[8px] text-slate-600">
              {stops.length} megálló · {new Set(stops.flatMap(s => s.routeRefs)).size} járat 700m-en belül
            </p>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex flex-wrap gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {([
            ['stops',  <Bus size={10} key="b" />,          'Megállók'],
            ['bubi',   <Bike size={10} key="k" />,         'Bubi'],
            ['alerts', <AlertTriangle size={10} key="a" />, alertCount > 0 ? `Riasztás (${alertCount})` : 'Riasztás'],
            ['co2',    <Leaf size={10} key="l" />,         'CO₂'],
          ] as const).map(([id, icon, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`relative flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[9px] font-semibold transition-all ${
                tab === id ? 'bg-white/[0.12] text-white' : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              {icon}{label}
              {id === 'alerts' && alertCount > 0 && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-orange-500" />
              )}
            </button>
          ))}
        </div>

        {/* ── Stops tab ─────────────────────────────────────────────── */}
        {tab === 'stops' && (
          <div className="flex flex-col gap-1">
            {stops.slice(0, 6).map(stop => (
              <StopRow key={stop.id} stop={stop} selected={selectedStop?.id === stop.id}
                onClick={() => setSelectedStop(stop)} />
            ))}
            {stops.length === 0 && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <MapPin size={12} className="text-slate-600" />
                <p className="text-[10px] text-slate-600">Nincsenek közeli megállók</p>
              </div>
            )}
            {selectedStop && (
              <div className="mt-1 rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <DepartureBoardPanel stopId={selectedStop.id} stopName={selectedStop.name} refreshKey={refreshKey} />
              </div>
            )}
          </div>
        )}

        {/* ── Bubi tab ──────────────────────────────────────────────── */}
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
            ) : bubi.map(s => <BubiCard key={s.id} station={s} />)}
          </div>
        )}

        {/* ── Alerts tab ────────────────────────────────────────────── */}
        {tab === 'alerts' && (
          <div className="flex flex-col gap-1.5">
            {(!alerts || alerts.alerts.length === 0) ? (
              <div className="flex items-center gap-2 rounded-xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <AlertTriangle size={12} className="text-emerald-500" />
                <p className="text-[10px] text-slate-400">Nincs aktív üzemzavar a BKK hálózaton</p>
              </div>
            ) : (
              alerts.alerts.map(alert => <AlertCard key={alert.id} alert={alert} />)
            )}
            {alerts?.stale && (
              <p className="text-center text-[8px] text-amber-300">⚠ Riasztások adatai elavultak</p>
            )}
          </div>
        )}

        {/* ── CO₂ tab ───────────────────────────────────────────────── */}
        {tab === 'co2' && <Co2Calculator />}

        {/* Data source */}
        <div className="mt-auto flex items-center justify-between border-t border-white/[0.05] pt-2">
          <p className="flex items-center gap-1.5 text-[8px] text-slate-700">
            <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
              data.source === 'futar'
                ? 'bg-emerald-400'
                : data.source === 'overpass'
                  ? 'bg-amber-400'
                  : data.source === 'db'
                    ? 'bg-sky-400'
                    : 'bg-rose-400'}`} />
            {data.source === 'futar'
              ? 'BKK Futár valósidejű'
              : data.source === 'overpass'
                ? 'OpenStreetMap'
                : data.source === 'db'
                  ? 'DB cache aktív'
                  : 'BKK API nem elérhető'}
          </p>
          <p className="text-[8px] text-slate-700">
            {coordsReady && lat !== undefined ? 'Valós helyszín'
              : buildingAddress ? 'Geocódolt cím'
              : '⚠ Budapest középpont'}
          </p>
        </div>
      </div>

      {/* ── Right: always-on live map + coverage map ───────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Élő járattérkép</p>
          <TransitLiveMap ref={mapRef} lat={realLat} lon={realLon} stops={stops}
            alertRoutes={alerts?.alerts.flatMap(a => a.routes)} />
          <p className="text-[8px] text-slate-700">
            Kattints megállóra a menetrendért · járatra az útvonalért · 15 mp-ként frissül
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
            Tömegközlekedési lefedettség — {walkRadiusM} m ({Math.round(walkRadiusM / 84)} p sétálva)
          </p>
          <div className="flex items-center gap-2 mb-1">
            <input
              type="range" min={150} max={1000} step={50}
              value={walkRadiusM}
              onChange={e => setWalkRadiusM(Number(e.target.value))}
              className="h-1 flex-1 accent-sky-400"
              title="Gyaloglási sugár állítása"
            />
            <span className="w-12 shrink-0 text-right text-[8px] text-slate-600">{walkRadiusM} m</span>
          </div>
          <TransitCoverageMap
            buildingLat={realLat}
            buildingLon={realLon}
            radiusM={walkRadiusM}
            stops={stops.map(s => ({
              id:         s.id,
              name:       s.name,
              lat:        s.lat,
              lon:        s.lon,
              routeType:  s.routeType,
              routeRefs:  s.routeRefs,
            }))}
          />
        </div>
      </div>

    </div>
  );
}
