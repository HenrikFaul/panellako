'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Wind } from 'lucide-react';
import AirQualityMap from '@/components/air-quality-map';
import type { AirQualityMapHandle } from '@/components/air-quality-map';
import type { AirQualityResult, ForecastDay } from '@/app/api/air-quality/route';
import type { AQIStation } from '@/app/api/air-quality/stations/route';

// ─── Health advice ────────────────────────────────────────────────────────────
const ADVICE: Record<string, string> = {
  good:          'Ideális szabadtéri tevékenységhez',
  moderate:      'Érzékenyek óvatosan a szabadban',
  sensitive:     'Asztmásoknak ne tartózkodjanak kint',
  unhealthy:     'Kerülje a hosszabb kinti tartózkodást',
  very_unhealthy:'Maradjon bent, zárja az ablakokat',
  hazardous:     'Vészhelyzet! Ne hagyja el otthonát',
};

// ─── Day abbreviations (ISO weekday → HU short) ──────────────────────────────
const HU_DAYS = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];

function dayLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return HU_DAYS[d.getDay()] ?? isoDate.slice(5);
}

// ─── Pollutant bar ────────────────────────────────────────────────────────────
function PollutantBar({ label, value, max, color }: {
  label: string; value: number | null; max: number; color: string;
}) {
  if (value === null) return null;
  const frac = Math.min(value / max, 1);
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 shrink-0 text-[9px] font-bold uppercase text-slate-500">{label}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${frac * 100}%`, background: color, boxShadow: `0 0 4px ${color}80` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-[9px] tabular-nums text-slate-400">
        {value.toFixed(0)}
      </span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  buildingLat?:     number;
  buildingLon?:     number;
  buildingAddress?: string;
}

// ─── Main section ─────────────────────────────────────────────────────────────
export default function AirQualitySection({ buildingLat, buildingLon, buildingAddress }: Props) {
  const [aq,       setAq]       = useState<AirQualityResult | null>(null);
  const [stations, setStations] = useState<AQIStation[]>([]);
  const [loading,  setLoading]  = useState(true);
  const mapRef = useRef<AirQualityMapHandle>(null);

  const lat = buildingLat ?? 47.4979;
  const lon = buildingLon ?? 19.0402;

  const fetchData = useCallback(async () => {
    try {
      const [aqRes, stRes] = await Promise.allSettled([
        fetch(`/api/air-quality?lat=${lat}&lon=${lon}`).then(r => r.json() as Promise<AirQualityResult>),
        fetch('/api/air-quality/stations').then(r => r.json() as Promise<AQIStation[]>),
      ]);
      if (aqRes.status === 'fulfilled') setAq(aqRes.value);
      if (stRes.status === 'fulfilled') setStations(stRes.value);
    } catch { /* silent */ }
    setLoading(false);
  }, [lat, lon]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10 * 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Forecast data ─────────────────────────────────────────────────────────
  const forecastDays: ForecastDay[] = aq?.forecast?.pm25?.slice(0, 7) ?? [];
  const forecastMax = forecastDays.length > 0
    ? Math.max(75, ...forecastDays.map(d => d.max))
    : 75;

  // ── Measured-at timestamp ─────────────────────────────────────────────────
  const measuredAtStr = aq?.measuredAt
    ? new Date(aq.measuredAt).toLocaleString('hu-HU', {
        month:   'short',
        day:     'numeric',
        hour:    '2-digit',
        minute:  '2-digit',
      })
    : null;

  return (
    <section
      id="air-quality"
      className="overflow-hidden rounded-[2rem] bg-[#060c18] text-white shadow-2xl shadow-black/40"
    >
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
        <div className="flex items-center gap-2">
          <Wind size={18} className="text-sky-400" />
          <span className="text-sm font-black tracking-tight">Levegőminőség</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-sky-500/10 px-3 py-0.5 text-[10px] font-bold text-sky-400">
            {buildingAddress ?? 'Budapest'}
          </span>
          <span className="rounded-full border border-white/[0.07] px-2.5 py-0.5 text-[9px] text-slate-500">
            AQICN · OLM
          </span>
        </div>
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────────── */}
      <div className="grid gap-0 lg:grid-cols-[300px_1fr]">

        {/* Left column: AQI data */}
        <div className="flex flex-col gap-5 border-b border-white/[0.06] p-6 lg:border-b-0 lg:border-r">

          {loading ? (
            /* Loading skeleton */
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <div className="h-28 w-28 rounded-full bg-white/[0.06]" />
              <div className="h-4 w-20 rounded bg-white/[0.06]" />
              <div className="h-3 w-32 rounded bg-white/[0.06]" />
              <div className="mt-2 w-full space-y-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-2 w-8 rounded bg-white/[0.06]" />
                    <div className="h-1 flex-1 rounded-full bg-white/[0.06]" />
                    <div className="h-2 w-6 rounded bg-white/[0.06]" />
                  </div>
                ))}
              </div>
            </div>
          ) : aq ? (
            <>
              {/* Big AQI number */}
              <div className="flex flex-col items-center gap-1">
                <span
                  className="text-8xl font-black leading-none tabular-nums"
                  style={{
                    color:      aq.color,
                    textShadow: `0 0 30px ${aq.color}60`,
                  }}
                >
                  {aq.aqi}
                </span>
                <span
                  className="mt-1 text-sm font-black"
                  style={{ color: aq.color, textShadow: `0 0 12px ${aq.color}50` }}
                >
                  {aq.aqiLabel}
                </span>
                <span className="text-center text-[10px] leading-tight text-slate-400">
                  {ADVICE[aq.aqiCategory]}
                </span>
              </div>

              {/* Pollutant bars */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-2">
                <PollutantBar label="PM2.5" value={aq.pm25} max={75}  color={aq.color}  />
                <PollutantBar label="PM10"  value={aq.pm10} max={150} color="#fb923c"   />
                <PollutantBar label="NO₂"   value={aq.no2}  max={200} color="#60a5fa"   />
                <PollutantBar label="O₃"    value={aq.o3}   max={180} color="#a78bfa"   />
                <PollutantBar label="SO₂"   value={aq.so2}  max={350} color="#f97316"   />
                <PollutantBar label="CO"    value={aq.co}   max={10}  color="#94a3b8"   />
              </div>

              {/* Measured at */}
              {measuredAtStr && (
                <p className="text-center text-[9px] text-slate-600">
                  Mérés: {measuredAtStr}
                  <br />
                  <span className="text-slate-700">{aq.stationName}</span>
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-[11px] text-slate-600">Levegőminőség nem elérhető</p>
            </div>
          )}
        </div>

        {/* Right column: Map */}
        <div className="p-4">
          <AirQualityMap
            ref={mapRef}
            buildingLat={lat}
            buildingLon={lon}
            stations={stations}
          />
        </div>
      </div>

      {/* ── 7-day PM2.5 forecast ─────────────────────────────────────────────── */}
      {forecastDays.length > 0 && (
        <div className="border-t border-white/[0.06] px-6 py-5">
          <p className="mb-3 text-[9px] font-bold uppercase tracking-widest text-slate-500">
            PM2.5 előrejelzés (7 nap)
          </p>
          <div className="flex flex-col gap-2">
            {forecastDays.map((d) => {
              const barFrac = Math.min(d.avg / forecastMax, 1);
              const color   = aq ? aq.color : '#38bdf8';
              return (
                <div key={d.day} className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-[9px] font-bold text-slate-500">
                    {dayLabel(d.day)}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width:     `${barFrac * 100}%`,
                        background: color,
                        boxShadow:  `0 0 4px ${color}60`,
                      }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-[9px] tabular-nums text-slate-400">
                    {d.avg.toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
