'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Wind, ChevronDown, Database, AlertCircle } from 'lucide-react';
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

const HU_DAYS = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];
function dayLabel(iso: string): string {
  const d = new Date(iso);
  return HU_DAYS[d.getDay()] ?? iso.slice(5);
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
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${frac * 100}%`, background: color, boxShadow: `0 0 4px ${color}80` }} />
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
  const [expanded, setExpanded] = useState(true);
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
    const iv = setInterval(fetchData, 10 * 60_000);
    return () => clearInterval(iv);
  }, [fetchData]);

  const forecastDays: ForecastDay[] = aq?.forecast?.pm25?.slice(0, 7) ?? [];
  const forecastMax  = forecastDays.length > 0
    ? Math.max(75, ...forecastDays.map(d => d.max)) : 75;

  const measuredAtStr = aq?.measuredAt
    ? new Date(aq.measuredAt).toLocaleString('hu-HU', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <section
      id="air-quality"
      className="overflow-hidden rounded-[2rem] bg-[#060c18] text-white shadow-2xl shadow-black/40"
    >
      {/* ── Header (always visible, click to toggle) ───────────────────────── */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center justify-between border-b border-white/[0.06] px-6 py-4 text-left transition-colors hover:bg-white/[0.02]"
      >
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
          <ChevronDown
            size={15}
            className="text-slate-500 transition-transform duration-300"
            style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          />
        </div>
      </button>

      {/* ── Collapsible body ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.35s ease',
        }}
      >
        <div style={{ overflow: 'hidden' }}>

          {/* Main grid */}
          <div className="grid gap-0 lg:grid-cols-[300px_1fr]">

            {/* Left: AQI data */}
            <div className="flex flex-col gap-5 border-b border-white/[0.06] p-6 lg:border-b-0 lg:border-r">
              {loading ? (
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
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className="text-8xl font-black leading-none tabular-nums"
                      style={{ color: aq.color, textShadow: `0 0 30px ${aq.color}60` }}
                    >
                      {aq.aqi}
                    </span>
                    <span className="mt-1 text-sm font-black" style={{ color: aq.color, textShadow: `0 0 12px ${aq.color}50` }}>
                      {aq.aqiLabel}
                    </span>
                    <span className="text-center text-[10px] leading-tight text-slate-400">
                      {ADVICE[aq.aqiCategory]}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-2">
                    <PollutantBar label="PM2.5" value={aq.pm25} max={75}  color={aq.color}  />
                    <PollutantBar label="PM10"  value={aq.pm10} max={150} color="#fb923c"   />
                    <PollutantBar label="NO₂"   value={aq.no2}  max={200} color="#60a5fa"   />
                    <PollutantBar label="O₃"    value={aq.o3}   max={180} color="#a78bfa"   />
                    <PollutantBar label="SO₂"   value={aq.so2}  max={350} color="#f97316"   />
                    <PollutantBar label="CO"    value={aq.co}   max={10}  color="#94a3b8"   />
                  </div>

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

            {/* Right: Map */}
            <div className="p-4">
              <AirQualityMap ref={mapRef} buildingLat={lat} buildingLon={lon} stations={stations} />
            </div>
          </div>

          {/* 7-day PM2.5 forecast */}
          {forecastDays.length > 0 && (
            <div className="border-t border-white/[0.06] px-6 py-5">
              <p className="mb-3 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                PM2.5 előrejelzés (7 nap)
              </p>
              <div className="flex flex-col gap-2">
                {forecastDays.map(d => {
                  const barFrac = Math.min(d.avg / forecastMax, 1);
                  const color   = aq ? aq.color : '#38bdf8';
                  return (
                    <div key={d.day} className="flex items-center gap-3">
                      <span className="w-6 shrink-0 text-[9px] font-bold text-slate-500">{dayLabel(d.day)}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${barFrac * 100}%`, background: color, boxShadow: `0 0 4px ${color}60` }} />
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

          {/* PM2.5 methodology explanation */}
          <div className="border-t border-white/[0.06] px-6 py-5">
            <p className="mb-4 text-[9px] font-bold uppercase tracking-widest text-slate-500">
              Hogyan készül az előrejelzés?
            </p>
            <div className="grid gap-3 sm:grid-cols-3">

              {/* Card 1: Data sources */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Database size={13} className="shrink-0 text-sky-500" />
                  <span className="text-[10px] font-black text-slate-300">Adatforrások</span>
                </div>
                <ul className="space-y-1.5 text-[9px] leading-relaxed text-slate-500">
                  <li>Budapest OLM állomásainak valós idejű mérései (AQICN/WAQI hálózat)</li>
                  <li>ECMWF meteorológiai modell — szél, csapadék, hőmérséklet</li>
                  <li>CAMS (Copernicus) légköri szállítási modell</li>
                  <li>Helyi historikus mintázatok (előző 7 nap súlyozott átlaga)</li>
                </ul>
              </div>

              {/* Card 2: Influencing factors */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Wind size={13} className="shrink-0 text-sky-500" />
                  <span className="text-[10px] font-black text-slate-300">Befolyásoló tényezők</span>
                </div>
                <ul className="space-y-1.5 text-[9px] leading-relaxed text-slate-500">
                  <li><span className="text-slate-400 font-semibold">Közlekedés:</span> a városi PM2.5 kb. 60%-a</li>
                  <li><span className="text-slate-400 font-semibold">Szél:</span> erős szél (5+ m/s) 40–60%-kal csökkenti az értéket</li>
                  <li><span className="text-slate-400 font-semibold">Hőmérséklet-inverzió:</span> hideg, szélcsendes éjjeleken a szennyezők a talaj közelében rekedhetek</li>
                  <li><span className="text-slate-400 font-semibold">Fűtési szezon (okt–márc):</span> szilárd tüzelés hatása</li>
                  <li><span className="text-slate-400 font-semibold">Sahara-por:</span> tavaszi-nyári átmeneti emelkedés</li>
                </ul>
              </div>

              {/* Card 3: Health thresholds */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <AlertCircle size={13} className="shrink-0 text-sky-500" />
                  <span className="text-[10px] font-black text-slate-300">Egészségügyi küszöbök</span>
                </div>
                <div className="space-y-1.5 text-[9px] leading-relaxed">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] shrink-0" />
                    <span className="text-slate-500">&lt; 12 µg/m³ — <span className="text-[#22c55e]">Jó</span> (WHO éves irányszám)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#eab308] shrink-0" />
                    <span className="text-slate-500">12–35 µg/m³ — <span className="text-[#eab308]">Mérsékelt</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#f97316] shrink-0" />
                    <span className="text-slate-500">35–55 µg/m³ — <span className="text-[#f97316]">Érzékenyek figyeljenek</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444] shrink-0" />
                    <span className="text-slate-500">&gt; 55 µg/m³ — <span className="text-[#ef4444]">Kerülje a kültéri tartózkodást</span></span>
                  </div>
                  <p className="mt-2 text-[8px] text-slate-700 border-t border-white/[0.05] pt-2">
                    Az előrejelzés tájékoztató jellegű, ±20–30% bizonytalansággal.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
