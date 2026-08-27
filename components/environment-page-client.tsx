'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Wind, ArrowLeft, Leaf, Flower2, Sun, Zap, ChevronDown, AlertCircle, Database, Satellite, Star, Trophy, MapPin, Trees, Baby, Volleyball } from 'lucide-react';
import LandUseMap from '@/components/land-use-map';
import AirQualityMap from '@/components/air-quality-map';
import type { AirQualityMapHandle } from '@/components/air-quality-map';
import type { AQIStation } from '@/app/api/air-quality/stations/route';
import EnvScoreHero from '@/components/env-score-hero';
import PollenPanel from '@/components/pollen-panel';
import UvWindPanel from '@/components/uv-wind-panel';
import Sparkline24h from '@/components/sparkline-24h';
import SatelliteNdviPanel from '@/components/satellite-ndvi-panel';
import LiveabilityPanel from '@/components/liveability-panel';
import type { EnvAirQualityResult } from '@/app/api/environment/air-quality/route';
import type { EnvWeatherResult } from '@/app/api/environment/weather/route';
import type { GreenData } from '@/app/api/environment/green/route';
import type { SolarData } from '@/app/api/environment/solar/route';
import type { EnvScore } from '@/app/api/environment/score/route';
import type { SatelliteData } from '@/app/api/environment/satellite/route';
import type { UrbanData } from '@/app/api/environment/urban/route';
import type { UrbanAtlasData } from '@/app/api/environment/urban-atlas/route';
import type { BudapestTreesData } from '@/app/api/environment/budapest-trees/route';

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  buildingId:           string;
  buildingName:         string;
  buildingAddress:      string;
  buildingLat:          number;
  buildingLon:          number;
  usedReferenceAddress?: boolean;
}

// ─── AQI advice ───────────────────────────────────────────────────────────────
const ADVICE: Record<string, string> = {
  good:          'Ideális szabadtéri tevékenységhez',
  moderate:      'Érzékenyek óvatosan a szabadban',
  sensitive:     'Asztmásoknak ne tartózkodjanak kint',
  unhealthy:     'Kerülje a hosszabb kinti tartózkodást',
  very_unhealthy:'Maradjon bent, zárja az ablakokat',
  hazardous:     'Vészhelyzet! Ne hagyja el otthonát',
};

// ─── Pollutant bar ────────────────────────────────────────────────────────────
function PollutantBar({ label, value, max, color }: { label: string; value: number | null; max: number; color: string }) {
  if (value === null) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 shrink-0 text-[10px] font-semibold uppercase text-slate-700/75">{label}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(value / max, 1) * 100}%`, background: color, boxShadow: `0 0 4px ${color}80` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-slate-700">{value.toFixed(1)}</span>
    </div>
  );
}

const HU_DAYS = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];
function dayLabel(iso: string) { return HU_DAYS[new Date(iso).getDay()] ?? iso.slice(5); }

// ─── Solar calculator ─────────────────────────────────────────────────────────
function SolarCalculator({ solar }: { solar: SolarData }) {
  const [kwp, setKwp] = useState(5);
  const annual = Math.round(kwp * solar.eYearKwhKwp);
  const co2    = Math.round(annual * 0.233);
  const maxE   = Math.max(...solar.monthly.map(m => m.e), 1);

  const monthColor = (m: number) => {
    if (m <= 2 || m === 12) return '#38bdf8';
    if (m <= 4 || m >= 10)  return '#eab308';
    return '#f97316';
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700/75">Havi termelés (kWh/kWp)</p>
        <div className="flex items-end gap-1 h-16">
          {solar.monthly.map(m => (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-0.5">
              <div className="w-full rounded-t" title={`${m.month}. hónap: ${m.e} kWh/kWp`}
                style={{ height: `${(m.e / maxE) * 52}px`, background: monthColor(m.month), opacity: 0.8 }} />
              <span className="text-[9px] text-slate-700/75">{m.month}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-[11px] font-semibold text-slate-800">Napelem kalkulátor</p>
        <div className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-[10px] text-slate-700/75">Kapacitás: {kwp} kWp</span>
          <input type="range" min={1} max={50} step={1} value={kwp}
            onChange={e => setKwp(Number(e.target.value))}
            className="flex-1 accent-amber-400" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] text-slate-700/75">Éves termelés</p>
            <p className="text-base font-semibold text-amber-700">{annual.toLocaleString('hu-HU')} kWh</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] text-slate-700/75">CO₂ megtakarítás</p>
            <p className="text-base font-semibold text-emerald-700">{co2.toLocaleString('hu-HU')} kg/év</p>
          </div>
        </div>
        <p className="text-center text-[10px] text-slate-700/75">
          ≈ {Math.round(co2 / 21)} zsák hulladék elégetésének CO₂-egyenértéke
        </p>
      </div>
    </div>
  );
}

// ─── Section wrappers ─────────────────────────────────────────────────────────
function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="environment-section overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.28)]">
      {children}
    </section>
  );
}

function SectionHeader({ icon, title, badge, source }: {
  icon: React.ReactNode; title: string; badge?: string; source?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 md:px-6">
      <div className="flex items-center gap-2">{icon}<span className="text-sm font-semibold tracking-tight text-slate-900">{title}</span></div>
      <div className="flex flex-wrap items-center gap-2">
        {badge  && <span className="rounded-full bg-sky-50 px-3 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-sky-100">{badge}</span>}
        {source && <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] text-slate-700/75">{source}</span>}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function EnvironmentPageClient({
  buildingId, buildingName, buildingAddress, buildingLat, buildingLon, usedReferenceAddress,
}: Props) {
  const lat = buildingLat ?? 47.5278845;
  const lon = buildingLon ?? 19.0705657;

  const [aq,           setAq]           = useState<EnvAirQualityResult | null>(null);
  const [weather,      setWeather]      = useState<EnvWeatherResult | null>(null);
  const [green,        setGreen]        = useState<GreenData | null>(null);
  const [solar,        setSolar]        = useState<SolarData | null>(null);
  const [score,        setScore]        = useState<EnvScore | null>(null);
  const [satellite,    setSatellite]    = useState<SatelliteData | null>(null);
  const [urban,        setUrban]        = useState<UrbanData | null>(null);
  const [urbanAtlas,   setUrbanAtlas]   = useState<UrbanAtlasData | null>(null);
  const [bpTrees,      setBpTrees]      = useState<BudapestTreesData | null>(null);
  const [stations,     setStations]     = useState<AQIStation[]>([]);

  const [loadingAq,        setLoadingAq]        = useState(true);
  const [loadingWeather,   setLoadingWeather]    = useState(true);
  const [loadingScore,     setLoadingScore]      = useState(true);
  const [loadingGreen,     setLoadingGreen]      = useState(false);
  const [loadingUrbanAtlas,setLoadingUrbanAtlas] = useState(false);
  const [loadingBpTrees,   setLoadingBpTrees]    = useState(false);
  const [loadingSolar,     setLoadingSolar]      = useState(false);
  const [loadingSatellite, setLoadingSatellite]  = useState(false);
  const [loadingUrban,     setLoadingUrban]      = useState(false);
  const [errorGreen,       setErrorGreen]        = useState(false);
  const [errorSolar,       setErrorSolar]        = useState(false);
  const [errorSatellite,   setErrorSatellite]    = useState(false);
  const [errorUrban,       setErrorUrban]        = useState(false);
  const [aqExpanded,       setAqExpanded]        = useState(true);

  const greenRef      = useRef<HTMLDivElement>(null);
  const solarRef      = useRef<HTMLDivElement>(null);
  const satelliteRef  = useRef<HTMLDivElement>(null);
  const urbanRef      = useRef<HTMLDivElement>(null);
  const greenLoadedRef      = useRef(false);
  const urbanAtlasLoadedRef = useRef(false);
  const bpTreesLoadedRef    = useRef(false);
  const solarLoadedRef      = useRef(false);
  const satelliteLoadedRef  = useRef(false);
  const urbanLoadedRef      = useRef(false);
  const mapRef    = useRef<AirQualityMapHandle>(null);

  // Eager: AQ + weather + score + stations
  useEffect(() => {
    const go = async () => {
      const [aqR, wxR, scR, stR] = await Promise.allSettled([
        fetch(`/api/environment/air-quality?lat=${lat}&lon=${lon}`).then(r => r.json() as Promise<EnvAirQualityResult>),
        fetch(`/api/environment/weather?lat=${lat}&lon=${lon}`).then(r => r.json() as Promise<EnvWeatherResult>),
        fetch(`/api/environment/score?buildingId=${buildingId}&lat=${lat}&lon=${lon}`).then(r => r.json() as Promise<EnvScore>),
        fetch('/api/air-quality/stations').then(r => r.json() as Promise<AQIStation[]>),
      ]);
      if (aqR.status === 'fulfilled') setAq(aqR.value);
      if (wxR.status === 'fulfilled' && wxR.value?.current) setWeather(wxR.value);
      if (scR.status === 'fulfilled') setScore(scR.value);
      if (stR.status === 'fulfilled') setStations(stR.value);
      setLoadingAq(false); setLoadingWeather(false); setLoadingScore(false);
    };
    void go();
    const iv = setInterval(() => { void go(); }, 10 * 60_000);
    return () => clearInterval(iv);
  }, [lat, lon, buildingId]);

  // Lazy: green
  const doGreen = useCallback(() => {
    setLoadingGreen(true); setErrorGreen(false);
    fetch(`/api/environment/green?buildingId=${buildingId}&lat=${lat}&lon=${lon}`)
      .then(r => r.json() as Promise<GreenData | null>)
      .then(d => { if (d) setGreen(d); else setErrorGreen(true); })
      .catch(() => setErrorGreen(true))
      .finally(() => setLoadingGreen(false));
  }, [buildingId, lat, lon]);

  useEffect(() => {
    const el = greenRef.current; if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !greenLoadedRef.current) {
        greenLoadedRef.current = true;
        doGreen();
        // Also trigger the two extra green sources in parallel
        if (!urbanAtlasLoadedRef.current) { urbanAtlasLoadedRef.current = true; doUrbanAtlas(); }
        if (!bpTreesLoadedRef.current)    { bpTreesLoadedRef.current    = true; doBpTrees();    }
      }
    }, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doGreen]);

  // Lazy: Urban Atlas
  const doUrbanAtlas = useCallback(() => {
    setLoadingUrbanAtlas(true);
    fetch(`/api/environment/urban-atlas?buildingId=${buildingId}&lat=${lat}&lon=${lon}`)
      .then(r => r.json() as Promise<UrbanAtlasData>)
      .then(d => { if (d && d.source !== 'unavailable') setUrbanAtlas(d); })
      .catch(() => { /* best-effort */ })
      .finally(() => setLoadingUrbanAtlas(false));
  }, [buildingId, lat, lon]);

  // Lazy: Budapest trees / parks
  const doBpTrees = useCallback(() => {
    setLoadingBpTrees(true);
    fetch(`/api/environment/budapest-trees?buildingId=${buildingId}&lat=${lat}&lon=${lon}`)
      .then(r => r.json() as Promise<BudapestTreesData>)
      .then(d => { if (d && d.source !== 'no_data') setBpTrees(d); })
      .catch(() => { /* best-effort */ })
      .finally(() => setLoadingBpTrees(false));
  }, [buildingId, lat, lon]);

  // Lazy: solar
  useEffect(() => {
    const el = solarRef.current; if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !solarLoadedRef.current) {
        solarLoadedRef.current = true; setLoadingSolar(true); setErrorSolar(false);
        fetch(`/api/environment/solar?buildingId=${buildingId}&lat=${lat}&lon=${lon}`)
          .then(r => r.json() as Promise<SolarData | null>)
          .then(d => { if (d) setSolar(d); else setErrorSolar(true); })
          .catch(() => setErrorSolar(true))
          .finally(() => setLoadingSolar(false));
      }
    }, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, [buildingId, lat, lon]);

  // Lazy: satellite NDVI
  const doSatellite = useCallback(() => {
    setLoadingSatellite(true); setErrorSatellite(false);
    fetch(`/api/environment/satellite?buildingId=${buildingId}&lat=${lat}&lon=${lon}`)
      .then(r => r.json() as Promise<SatelliteData>)
      .then(d => setSatellite(d))
      .catch(() => setErrorSatellite(true))
      .finally(() => setLoadingSatellite(false));
  }, [buildingId, lat, lon]);

  useEffect(() => {
    const el = satelliteRef.current; if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !satelliteLoadedRef.current) { satelliteLoadedRef.current = true; doSatellite(); }
    }, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, [doSatellite]);

  // Lazy: urban (compact city + liveability — shared Overpass query)
  // When the panel switches to map view and the cached payload has no POI list,
  // we re-fetch with `?withPois=1` (bypasses cache) so the map can render.
  const doUrban = useCallback((withPois = false) => {
    if (!withPois) { setLoadingUrban(true); setErrorUrban(false); }
    const qs = `buildingId=${buildingId}&lat=${lat}&lon=${lon}${withPois ? '&withPois=1' : ''}`;
    fetch(`/api/environment/urban?${qs}`)
      .then(r => {
        if (!r.ok) {
          if (!withPois) setErrorUrban(true);
          return null;
        }
        return r.json();
      })
      .then(d => {
        if (!d) return;
        if ((d as { error?: string }).error) { if (!withPois) setErrorUrban(true); }
        else if ((d as UrbanData).compactCity && (d as UrbanData).liveability) setUrban(d as UrbanData);
        else if (!withPois) setErrorUrban(true);
      })
      .catch(() => { if (!withPois) setErrorUrban(true); })
      .finally(() => { if (!withPois) setLoadingUrban(false); });
  }, [buildingId, lat, lon]);

  useEffect(() => {
    const el = urbanRef.current; if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !urbanLoadedRef.current) { urbanLoadedRef.current = true; doUrban(); }
    }, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, [doUrban]);

  const forecastMax = aq?.daily?.length ? Math.max(30, ...aq.daily.map(d => d.avgPm25)) : 30;

  const NAV = [
    { id: 'sec-score',     Icon: Trophy,    label: 'Pontszám' },
    { id: 'sec-air',       Icon: Wind,      label: 'Levegő' },
    { id: 'sec-pollen',    Icon: Flower2,   label: 'Pollen & UV' },
    { id: 'sec-green',     Icon: Leaf,      label: 'Zöld' },
    { id: 'sec-solar',     Icon: Sun,       label: 'Napenergia' },
    { id: 'sec-satellite', Icon: Satellite, label: 'Műhold' },
    { id: 'sec-liveable',  Icon: Star,      label: 'Élhetőség' },
  ];

  return (
    <div className="min-h-screen text-slate-800">

      {/* Header */}
      <header className="relative z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl lg:sticky lg:top-0 lg:z-50">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <a href={`/w/${buildingId}`}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-800">
            <ArrowLeft size={14} />Vissza
          </a>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[11px] font-semibold leading-tight text-slate-900">{buildingName}</span>
            <span className="truncate text-[10px] text-slate-700/75">{buildingAddress}</span>
          </div>
          <span className="hidden rounded-full border border-brand-100 bg-brand-50 px-3 py-0.5 text-[10px] font-semibold text-brand-800 sm:inline">Környezet</span>
        </div>
        {/* Quick nav */}
        <div className="mx-auto flex max-w-6xl overflow-x-auto px-4 sm:px-6" style={{ scrollbarWidth: 'none' }}>
          {NAV.map(n => (
            <a key={n.id} href={`#${n.id}`}
              className="flex shrink-0 items-center gap-1.5 px-3 pb-3 pt-1 text-[10px] font-semibold text-slate-700/75 transition-colors hover:text-brand-800">
              <n.Icon size={13} className="shrink-0" />
              <span className="hidden sm:inline">{n.label}</span>
            </a>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6">

        {/* v0.7.14 — Reference-address banner: ha a user mentett saját referencia-címet, jelezzük. */}
        {usedReferenceAddress ? (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <MapPin size={16} className="mt-0.5 shrink-0 text-emerald-700" />
            <p className="text-[11px] leading-relaxed text-emerald-800">
              Az alábbi adatok az Ön <span className="font-bold">referencia-címe</span> alapján számítódnak:
              {' '}<span className="font-bold">{buildingAddress}</span>
              {' '}(lakó-szinten). A környezeti mérések (levegő, NDVI, kerékpáros infrastruktúra) ehhez a koordinátához vannak igazítva.
            </p>
          </div>
        ) : null}

        {/* 1. KörnyezetScore */}
        <Section id="sec-score">
          <SectionHeader icon={<Trophy size={18} className="text-amber-700" />} title="KörnyezetScore™" badge={buildingAddress} source="Open-Meteo · OSM" />
          <div className="p-6"><EnvScoreHero score={score} loading={loadingScore} /></div>
        </Section>

        {/* 2. Levegőminőség */}
        <Section id="sec-air">
          <button type="button" onClick={() => setAqExpanded(e => !e)}
            className="flex w-full items-center justify-between border-b border-slate-200 px-5 py-4 text-left transition-colors hover:bg-slate-50 md:px-6">
            <div className="flex items-center gap-2">
              <Wind size={18} className="text-sky-700" />
              <span className="text-sm font-semibold tracking-tight text-slate-900">Levegőminőség</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-sky-50 px-3 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-sky-100 sm:inline">{buildingAddress}</span>
              <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] text-slate-700/75 md:inline">Open-Meteo · CAMS</span>
              <ChevronDown size={15} className="text-slate-500 transition-transform duration-300"
                style={{ transform: aqExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
            </div>
          </button>

          <div style={{ display: 'grid', gridTemplateRows: aqExpanded ? '1fr' : '0fr', transition: 'grid-template-rows 0.35s ease' }}>
            <div style={{ overflow: 'hidden' }}>
              <div className="grid gap-0 lg:grid-cols-[300px_1fr]">
                {/* Left: AQI */}
                <div className="flex flex-col gap-5 border-b border-slate-200 p-6 lg:border-b-0 lg:border-r">
                  {loadingAq ? (
                    <div className="flex flex-col items-center gap-4 animate-pulse">
                      <div className="h-28 w-28 rounded-full bg-slate-100" />
                      <div className="h-4 w-20 rounded bg-slate-100" />
                      {[1,2,3,4].map(i => <div key={i} className="h-3 w-full rounded bg-slate-100" />)}
                    </div>
                  ) : aq ? (
                    <>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-8xl font-semibold leading-none tabular-nums"
                          style={{ color: aq.current.aqiColor, textShadow: `0 0 30px ${aq.current.aqiColor}60` }}>
                          {aq.current.aqi}
                        </span>
                        <span className="mt-1 text-sm font-semibold" style={{ color: aq.current.aqiColor }}>{aq.current.aqiLabel}</span>
                        <span className="text-center text-[10px] leading-tight text-slate-700">{ADVICE[aq.current.aqiCategory]}</span>
                      </div>
                      <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <PollutantBar label="PM2.5" value={aq.current.pm25} max={75}  color={aq.current.aqiColor} />
                        <PollutantBar label="PM10"  value={aq.current.pm10} max={150} color="#fb923c" />
                        <PollutantBar label="NO₂"   value={aq.current.no2}  max={200} color="#60a5fa" />
                        <PollutantBar label="O₃"    value={aq.current.o3}   max={180} color="#a78bfa" />
                        <PollutantBar label="SO₂"   value={aq.current.so2}  max={350} color="#f97316" />
                        <PollutantBar label="CO"    value={aq.current.co}   max={10}  color="#94a3b8" />
                        <PollutantBar label="Por"   value={aq.current.dust} max={50}  color="#d97706" />
                      </div>
                      {aq.source === 'mock' && <p className="text-center text-[10px] text-slate-700/75">Offline mód — közelítő adatok</p>}
                    </>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-[11px] text-slate-700/75">Levegőminőség nem elérhető</p>
                    </div>
                  )}
                </div>
                {/* Right: Map */}
                <div className="p-4">
                  <AirQualityMap ref={mapRef} buildingLat={lat} buildingLon={lon} stations={stations} />
                </div>
              </div>

              {/* 24h sparkline */}
              {aq && aq.hourly24.length > 0 && (
                <div className="border-t border-slate-200 px-6 py-5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700/75">24 órás trend</p>
                  <Sparkline24h data={aq.hourly24} />
                </div>
              )}

              {/* 7-day PM2.5 */}
              {aq && aq.daily.length > 0 && (
                <div className="border-t border-slate-200 px-6 py-5">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700/75">PM2.5 előrejelzés (7 nap)</p>
                  <div className="flex flex-col gap-2">
                    {aq.daily.slice(0, 7).map(d => (
                      <div key={d.date} className="flex items-center gap-3">
                        <span className="w-6 shrink-0 text-[10px] font-semibold text-slate-700/75">{dayLabel(d.date)}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(d.avgPm25 / forecastMax, 1) * 100}%`, background: aq.current.aqiColor, boxShadow: `0 0 4px ${aq.current.aqiColor}60` }} />
                        </div>
                        <span className="w-10 text-right text-[10px] tabular-nums text-slate-700">{(d.avgPm25 ?? 0).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info cards */}
              <div className="border-t border-slate-200 px-6 py-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2"><Database size={13} className="shrink-0 text-sky-700" /><span className="text-[11px] font-semibold text-slate-800">Adatforrások</span></div>
                    <ul className="space-y-1 text-[10px] leading-relaxed text-slate-700/75">
                      <li>Copernicus CAMS légköri modell (11 km)</li>
                      <li>Open-Meteo ingyenes API, kulcs nélkül</li>
                      <li>OLM Budapest állomásai referenciaként</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2"><Wind size={13} className="shrink-0 text-sky-700" /><span className="text-[11px] font-semibold text-slate-800">Befolyásoló tényezők</span></div>
                    <ul className="space-y-1 text-[10px] leading-relaxed text-slate-700/75">
                      <li><span className="font-semibold text-slate-800">Közlekedés:</span> városi PM2.5 ~60%-a</li>
                      <li><span className="font-semibold text-slate-800">Szél 5+ m/s:</span> 40–60% csökkentés</li>
                      <li><span className="font-semibold text-slate-800">Hőinverzió:</span> éjszakai felhalmozódás</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2"><AlertCircle size={13} className="shrink-0 text-sky-700" /><span className="text-[11px] font-semibold text-slate-800">Egészségügyi küszöbök</span></div>
                    <div className="space-y-1 text-[10px]">
                      {[{ c:'#22c55e',t:'< 12 µg/m³ — Jó'},{c:'#eab308',t:'12–35 — Mérsékelt'},{c:'#f97316',t:'35–55 — Érzékenyek'},{c:'#ef4444',t:'> 55 — Egészségtelen'}].map(r=>(
                        <div key={r.t} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: r.c }} />
                          <span className="text-slate-700/75">{r.t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* 3. Pollen & UV */}
        <Section id="sec-pollen">
          <SectionHeader icon={<Flower2 size={18} className="text-purple-700" />} title="Pollen & UV" source="Open-Meteo · CAMS · WHO" />
          <div className="p-6 space-y-6">
            {loadingAq || loadingWeather ? (
              <div className="space-y-3 animate-pulse">{[1,2,3].map(i=><div key={i} className="h-8 rounded-xl bg-slate-100" />)}</div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Pollen */}
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <Flower2 size={15} className="text-purple-700" />
                    <span className="text-xs font-semibold text-slate-900">Pollenterhelés</span>
                    {(() => {
                      const m = new Date().getMonth() + 1;
                      const s = m>=2&&m<=4 ? 'Nyír-éger' : m>=5&&m<=7 ? 'Fűpollen' : m>=8&&m<=10 ? '⚠ Parlagfű' : null;
                      return s ? <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 ring-1 ring-purple-100">{s} szezon</span> : null;
                    })()}
                  </div>
                  {aq ? (
                    <PollenPanel
                      current={{ grassPollen: aq.current.grassPollen, birchPollen: aq.current.birchPollen, alderPollen: aq.current.alderPollen }}
                      daily={aq.daily.map(d => ({ date: d.date, maxGrassPollen: d.maxGrassPollen, maxBirchPollen: d.maxBirchPollen, maxAlderPollen: d.maxAlderPollen }))}
                    />
                  ) : <p className="text-[11px] text-slate-700/75">Pollenadatok nem elérhetők</p>}
                </div>
                {/* UV + Wind */}
                <div>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Sun size={15} className="text-amber-700" />
                    <span className="text-xs font-semibold text-slate-900">UV-index & Szél</span>
                    {weather?.source === 'mock' && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-100">
                        becsült adat — élő forrás nem elérhető
                      </span>
                    )}
                  </div>
                  {weather ? (
                    <UvWindPanel
                      uvIndex={weather.current.uvIndex}
                      uvLabel={weather.current.uvLabel}
                      uvColor={weather.current.uvColor}
                      windSpeed={weather.current.windSpeed}
                      windDirection={weather.current.windDirection}
                      windDirectionLabel={weather.current.windDirectionLabel}
                      windLabel={weather.current.windLabel}
                      windAqiImpact={weather.current.windAqiImpact}
                      temperature={weather.current.temperature}
                      precipProb={weather.current.precipProb}
                    />
                  ) : <p className="text-[11px] text-slate-700/75">Időjárásadatok nem elérhetők</p>}
                </div>
              </div>
            )}

            {/* 7-day weather strip */}
            {weather && weather.daily.length > 0 && (
              <div className="border-t border-slate-200 pt-5">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700/75">7 napos időjárás-előrejelzés</p>
                <div className="grid grid-cols-7 gap-1">
                  {weather.daily.map(d => (
                    <div key={d.date} className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-2">
                      <span className="text-[10px] font-semibold text-slate-700/75">{dayLabel(d.date)}</span>
                      <span className="text-[11px] font-semibold text-slate-900">{d.tempMax}°</span>
                      <span className="text-[10px] text-slate-700/75">{d.tempMin}°</span>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-amber-500/70" style={{ width: `${Math.min(d.uvMax / 11, 1) * 100}%` }} />
                      </div>
                      <span className="text-[9px] text-slate-700/75">UV {(d.uvMax ?? 0).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* 4. Zöld Környezet */}
        <div ref={greenRef}>
          <Section id="sec-green">
            <SectionHeader
              icon={<Leaf size={18} className="text-emerald-700" />}
              title="Zöld Környezet"
              source="OSM · Sentinel-2 · EU Urban Atlas · Budapest Nyílt Adat"
            />
            <div className="p-6 space-y-4">

              {/* ── Top KPI row ─────────────────────────────────────────────── */}
              {loadingGreen ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-24 rounded-2xl bg-slate-100" />
                  <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i=><div key={i} className="h-24 rounded-2xl bg-slate-100" />)}</div>
                </div>
              ) : errorGreen ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <p className="text-[11px] text-slate-700/75">Overpass API nem elérhető</p>
                  <button type="button"
                    onClick={() => { greenLoadedRef.current = false; urbanAtlasLoadedRef.current = false; bpTreesLoadedRef.current = false; doGreen(); doUrbanAtlas(); doBpTrees(); }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-semibold text-slate-700 shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800">
                    Újrapróbálás
                  </button>
                </div>
              ) : green ? (
                <>
                  {/* KPI row */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700/75">OSM zöld index</p>
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-semibold text-emerald-700">{green.greenScore}</span>
                        <span className="mb-1 text-[10px] text-slate-700/75">/ 100</span>
                      </div>
                      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${green.greenScore}%` }} />
                      </div>
                      <p className="mt-1 text-[10px] text-slate-700/75">Budapest átlag: ~52/100</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700/75">Legközelebbi park</p>
                      <p className="truncate text-sm font-semibold text-slate-900">{bpTrees?.nearestParkName ?? green.nearestParkName}</p>
                      <p className="text-xl font-semibold text-emerald-700">
                        {bpTrees?.nearestParkM ?? green.nearestParkM}{' '}
                        <span className="text-xs text-slate-700/75">m</span>
                      </p>
                      <p className="text-[10px] text-slate-700/75">
                        ~{Math.round((bpTrees?.nearestParkM ?? green.nearestParkM) / 67)} perc gyalog
                        {bpTrees ? <span className="ml-1 text-emerald-700">· Bp. adat</span> : null}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700/75">Természet 200–500m</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Trees size={13} className="shrink-0 text-emerald-700" />
                          <span className="text-[10px] text-slate-800">
                            {bpTrees ? `${bpTrees.treeCount200m} fa (200m)` : `${green.treeCount} fa (200m)`}
                            {bpTrees && <span className="ml-1 text-[9px] text-emerald-700">· official</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-2"><Baby size={13} className="shrink-0 text-sky-700" /><span className="text-[10px] text-slate-800">{green.playgroundCount} játszótér (300m)</span></div>
                        <div className="flex items-center gap-2"><Volleyball size={13} className="shrink-0 text-amber-700" /><span className="text-[10px] text-slate-800">{green.sportsCount} sporttér (500m)</span></div>
                      </div>
                    </div>
                  </div>

                  {/* ── Multi-source detail grid ───────────────────────────── */}
                  <div className="grid gap-3 sm:grid-cols-2">

                    {/* OSM Overpass card */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">OSM</span>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700/75">OpenStreetMap · Overpass</p>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1 text-[10px] text-slate-800">
                        <span className="text-slate-700/75">Park terület (500m)</span>
                        <span className="font-bold text-right">{(green.parkAreaM2 / 10000).toFixed(2)} ha</span>
                        <span className="text-slate-700/75">Fák (200m)</span>
                        <span className="font-bold text-right">{green.treeCount} db</span>
                        <span className="text-slate-700/75">Játszótér (300m)</span>
                        <span className="font-bold text-right">{green.playgroundCount} db</span>
                        <span className="text-slate-700/75">Sporttér (500m)</span>
                        <span className="font-bold text-right">{green.sportsCount} db</span>
                      </div>
                      <p className="mt-2 text-[9px] text-slate-700/75">
                        {green.source === 'cache' ? 'Gyorsítótárból (7 napos)' : 'Friss Overpass lekérdezés'}
                      </p>
                    </div>

                    {/* Satellite / NDVI card */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800"><Satellite size={11} /></span>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700/75">Sentinel-2 · Területi NDVI</p>
                      </div>
                      {loadingUrbanAtlas && !satellite ? (
                        <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                      ) : satellite ? (
                        <div className="grid grid-cols-2 gap-y-1 text-[10px] text-slate-800">
                          <span className="text-slate-700/75">Pont NDVI</span>
                          <span className="font-bold text-right" style={{ color: satellite.ndviColor ?? '#94a3b8' }}>
                            {satellite.ndvi?.toFixed(3) ?? '—'} ({satellite.ndviLabel})
                          </span>
                          <span className="text-slate-700/75">Területi NDVI (500m)</span>
                          <span className="font-bold text-right">
                            {satellite.areaNdvi != null ? satellite.areaNdvi.toFixed(3) : '—'}
                          </span>
                          <span className="text-slate-700/75">Vegetáció-fedettség</span>
                          <span className="text-right font-bold text-emerald-700">
                            {satellite.vegPct != null ? `${satellite.vegPct}%` : '—'}
                          </span>
                          <span className="text-slate-700/75">Felvétel dátuma</span>
                          <span className="font-bold text-right">{satellite.sceneDate ?? '—'}</span>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-700/75">Betöltés a Műhold szekción…</p>
                      )}
                    </div>

                    {/* EU Urban Atlas card */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">EU</span>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700/75">Copernicus Urban Atlas 2018</p>
                      </div>
                      {loadingUrbanAtlas ? (
                        <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                      ) : urbanAtlas ? (
                        <>
                          <div className="grid grid-cols-2 gap-y-1 text-[10px] text-slate-800">
                            <span className="text-slate-700/75">Zöld városi t.</span>
                            <span className="text-right font-bold text-emerald-700">{urbanAtlas.greenUrbanPct.toFixed(1)}%</span>
                            <span className="text-slate-700/75">Erdő</span>
                            <span className="text-right font-bold text-emerald-700">{urbanAtlas.forestPct.toFixed(1)}%</span>
                            <span className="text-slate-700/75">Sport/szabadidő</span>
                            <span className="font-bold text-right">{urbanAtlas.sportsLeisurePct.toFixed(1)}%</span>
                            <span className="text-slate-700/75">Összes zöld</span>
                            <span className="text-right font-bold text-emerald-700">{urbanAtlas.totalGreenPct.toFixed(1)}%</span>
                            <span className="text-slate-700/75">Beépített</span>
                            <span className="text-right font-bold text-slate-700">{urbanAtlas.artificialPct.toFixed(1)}%</span>
                          </div>
                          <p className="mt-2 text-[9px] text-slate-700/75">
                            EU hivatalos adat · {urbanAtlas.source === 'cache' ? '6 hónapos cache' : 'Friss EEA lekérdezés'}
                          </p>
                        </>
                      ) : (
                        <p className="text-[10px] text-slate-700/75">Adat nem elérhető (EEA szerver)</p>
                      )}
                    </div>

                    {/* Budapest Open Data card */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800">BP</span>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700/75">Budapest Nyílt Adat · Fa-leltár</p>
                      </div>
                      {loadingBpTrees ? (
                        <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                      ) : bpTrees ? (
                        <>
                          <div className="grid grid-cols-2 gap-y-1 text-[10px] text-slate-800">
                            <span className="text-slate-700/75">Fa (200m)</span>
                            <span className="text-right font-bold text-emerald-700">{bpTrees.treeCount200m} db</span>
                            <span className="text-slate-700/75">Fa (500m)</span>
                            <span className="font-bold text-right">{bpTrees.treeCount500m} db</span>
                            <span className="text-slate-700/75">Park (500m)</span>
                            <span className="font-bold text-right">{bpTrees.parkCount500m} db</span>
                            <span className="text-slate-700/75">Park terület</span>
                            <span className="font-bold text-right">{(bpTrees.parkAreaM2 / 10000).toFixed(2)} ha</span>
                          </div>
                          <p className="mt-2 text-[9px] text-slate-700/75">
                            {bpTrees.totalTreesDb.toLocaleString('hu-HU')} fa az adatbázisban · importálva: {bpTrees.importedAt ? new Date(bpTrees.importedAt).toLocaleDateString('hu-HU') : '—'}
                          </p>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-700">Az adatimport még nem futott le.</p>
                          <p className="text-[10px] text-slate-700/75">Superadmin → <em>Budapest Nyílt Adat importálás</em> job indítása szükséges.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Noise */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700/75">Zajterhelés becslés</p>
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 text-[10px] text-slate-700/75">Zajos</span>
                      <div className="relative flex-1 h-2 rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 opacity-60">
                        <div className="absolute -top-1 -translate-x-1/2 h-4 w-4 rounded-full border-2 border-white bg-slate-900 shadow transition-all duration-700"
                          style={{ left: `${Math.min(green.noiseScore, 1) * 100}%` }} />
                      </div>
                      <span className="shrink-0 text-[10px] text-slate-700/75">Csendes</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {green.mainRoadDistM !== null && <p className="text-[10px] text-amber-800">⚠ Főút {Math.round(green.mainRoadDistM)}m-re — megnövelt zajterhelés</p>}
                      {green.railDistM     !== null && <p className="text-[10px] text-amber-800">⚠ Vasút {Math.round(green.railDistM)}m-re</p>}
                      {green.mainRoadDistM === null && green.railDistM === null && <p className="text-[10px] text-emerald-700">✓ Nincs jelentős zajforrás a közelben</p>}
                    </div>
                    <p className="mt-2 text-[9px] text-slate-700/75">
                      Becslés OSM úthálózat alapján.{green.source === 'cache' ? ' · Gyorsítótárból (7 napos frissítés)' : ' · Friss Overpass lekérdezés'}
                    </p>
                  </div>

                  {/* Land use map */}
                  <div className="mt-4">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700/75">Területfelhasználás térkép</p>
                    <LandUseMap buildingLat={lat} buildingLon={lon} />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
                  <p className="text-[11px] text-slate-700">Zöldfelület-adatok betöltése…</p>
                  <p className="text-[10px] text-slate-700/75">Az első lekérdezés ~30 másodpercet vehet igénybe</p>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* 5. Napenergia */}
        <div ref={solarRef}>
          <Section id="sec-solar">
            <SectionHeader icon={<Zap size={18} className="text-amber-700" />} title="Napenergia-potenciál" source="EU JRC PVGIS" />
            <div className="p-6">
              {loadingSolar ? (
                <div className="space-y-3 animate-pulse"><div className="h-28 rounded-2xl bg-slate-100" /><div className="h-16 rounded-2xl bg-slate-100" /></div>
              ) : errorSolar ? (
                <p className="py-6 text-center text-[11px] text-slate-700/75">PVGIS-adat jelenleg nem elérhető</p>
              ) : solar ? (
                <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700/75">Éves termelés</p>
                      <p className="text-4xl font-semibold text-amber-700">{(solar.eYearKwhKwp ?? 0).toFixed(0)}<span className="ml-1 text-sm text-slate-700/75">kWh/kWp</span></p>
                      <p className="mt-1 text-[10px] text-slate-700/75">Budapest átlag: ~1 050 kWh/kWp/év</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[10px] text-slate-700/75">Napi átlag</p>
                        <p className="text-lg font-semibold text-amber-700">{(solar.eDayKwhKwp ?? 0).toFixed(2)} <span className="text-xs text-slate-700/75">kWh</span></p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[10px] text-slate-700/75">Besugárzás</p>
                        <p className="text-lg font-semibold text-amber-700">{(solar.hOptKwhM2 ?? 0).toFixed(0)} <span className="text-xs text-slate-700/75">kWh/m²</span></p>
                      </div>
                    </div>
                    <p className="text-center text-[10px] text-slate-700/75">EU JRC PVGIS-SARAH3 műholdas adat</p>
                  </div>
                  <SolarCalculator solar={solar} />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-500" />
                  <p className="text-[11px] text-slate-700/75">Napenergia-adatok betöltése…</p>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* 6. Műholdas NDVI */}
        <div ref={satelliteRef}>
          <Section id="sec-satellite">
            <SectionHeader icon={<Satellite size={18} className="text-sky-700" />} title="Műholdas vegetáció (NDVI)" source="Sentinel-2 · ESA STAC · Copernicus" />
            <div className="p-6">
              {loadingSatellite ? (
                <div className="space-y-3 animate-pulse">
                  <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i=><div key={i} className="h-24 rounded-2xl bg-slate-100" />)}</div>
                  <div className="h-20 rounded-2xl bg-slate-100" />
                </div>
              ) : errorSatellite ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <p className="text-[11px] text-slate-700/75">Sentinel-2 adat nem elérhető</p>
                  <button type="button" onClick={() => { satelliteLoadedRef.current = false; doSatellite(); }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-semibold text-slate-700 shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800">
                    Újrapróbálás
                  </button>
                </div>
              ) : satellite ? (
                <SatelliteNdviPanel data={satellite} loading={false} />
              ) : (
                <SatelliteNdviPanel data={null} loading={false} />
              )}
            </div>
          </Section>
        </div>

        {/* 7. Élhetőség (shared Overpass query) */}
        <div ref={urbanRef}>
          <Section id="sec-liveable">
            <SectionHeader icon={<Star size={18} className="text-yellow-400" />} title="Élhetőség — Lakókörnyezet minőség" source="OSM · Open-Meteo · EIU módszertan" />
            <div className="p-6">
              {loadingUrban ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-64 rounded-2xl bg-slate-100" />
                  <div className="grid grid-cols-3 gap-3">{[1,2,3,4,5,6].map(i=><div key={i} className="h-14 rounded-2xl bg-slate-100" />)}</div>
                </div>
              ) : errorUrban ? (
                <p className="py-8 text-center text-[11px] text-slate-700/75">Élhetőségi adat nem elérhető</p>
              ) : (
                <LiveabilityPanel data={urban?.liveability ?? null} loading={false} />
              )}
            </div>
          </Section>
        </div>


      </main>
    </div>
  );
}
