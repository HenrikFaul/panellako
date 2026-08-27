'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, RefreshCw, School, Building2, Heart, Phone, Globe, Navigation, Map, List } from 'lucide-react';
import CompactCityPanel from '@/components/compact-city-panel';
import type { UrbanData } from '@/app/api/environment/urban/route';
import type { PublicService, PublicServicesResult } from '@/app/api/environment/public-services/route';

const PublicServicesMap = dynamic(() => import('@/components/public-services-map-inner'), { ssr: false });

// ── Client-side Overpass fallback (used when server-side fetch fails) ─────────
interface OverpassEl {
  type: string; id: number;
  lat?: number; lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function distM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

async function fetchOverpassFromBrowser(lat: number, lon: number): Promise<PublicServicesResult> {
  const query = `
[out:json][timeout:25];
(
  node["amenity"="townhall"](around:5000,${lat},${lon});
  way["amenity"="townhall"](around:5000,${lat},${lon});
  node["amenity"~"^(school|college|university)$"](around:3000,${lat},${lon});
  way["amenity"~"^(school|college|university)$"](around:3000,${lat},${lon});
  node["amenity"="kindergarten"](around:2500,${lat},${lon});
  way["amenity"="kindergarten"](around:2500,${lat},${lon});
  node["amenity"~"^(hospital|clinic|doctors|dentist|pharmacy|optician|physiotherapist|blood_bank|health_post|nursing_home|veterinary)$"](around:3000,${lat},${lon});
  way["amenity"~"^(hospital|clinic|doctors|dentist|pharmacy|optician|physiotherapist|blood_bank|health_post|nursing_home|veterinary)$"](around:3000,${lat},${lon});
  node["healthcare"](around:3000,${lat},${lon});
  way["healthcare"](around:3000,${lat},${lon});
  node["social_facility"](around:2000,${lat},${lon});
  way["social_facility"](around:2000,${lat},${lon});
);
out center qt;
`.trim();

  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.openstreetmap.fr/api/interpreter',
  ];

  let elements: OverpassEl[] = [];
  let fetched = false;
  for (const mirror of mirrors) {
    try {
      const res = await fetch(mirror, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) continue;
      const data = await res.json() as { elements?: OverpassEl[]; remark?: string };
      if (data.remark && /runtime error|timeout|Query timed out/i.test(data.remark)) continue;
      elements = data.elements ?? [];
      fetched = true;
      break;
    } catch { continue; }
  }
  if (!fetched) throw new Error('All Overpass mirrors failed');

  const HEALTHCARE_LABELS: Record<string, string> = {
    hospital: 'Kórház', clinic: 'Klinika / rendelő', doctors: 'Orvosi rendelő',
    dentist: 'Fogorvos', pharmacy: 'Gyógyszertár', optician: 'Szemészet',
    physiotherapist: 'Gyógytornász / fizioterapeuta', blood_bank: 'Véradó',
    health_post: 'Egészségügyi állomás', nursing_home: 'Ápolási otthon',
    veterinary: 'Állatorvos', social_facility: 'Szociális intézmény',
  };
  const SCHOOL_LABELS: Record<string, string> = { school: 'Általános / középiskola', college: 'Főiskola', university: 'Egyetem' };

  const toSvc = (el: OverpassEl, cat: PublicService['category']): PublicService | null => {
    const elLat = el.lat ?? el.center?.lat;
    const elLon = el.lon ?? el.center?.lon;
    if (!elLat || !elLon) return null;
    const tags = el.tags ?? {};
    const amenity = tags['amenity'] ?? '';
    const healthcare = tags['healthcare'] ?? '';
    const name = tags['name'] || tags['name:hu'] || tags['operator'] || amenity || cat;
    const subcategory = SCHOOL_LABELS[amenity] ?? HEALTHCARE_LABELS[amenity] ?? HEALTHCARE_LABELS[healthcare]
      ?? (healthcare ? 'Egészségügyi intézmény' : amenity === 'townhall' ? 'Polgármesteri hivatal' : undefined);
    return {
      id: `${el.type}/${el.id}`, name, category: cat, subcategory,
      address: [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ') || undefined,
      phone: tags['phone'] || tags['contact:phone'] || undefined,
      website: tags['website'] || tags['contact:website'] || undefined,
      lat: elLat, lon: elLon, distanceM: distM(lat, lon, elLat, elLon),
    };
  };

  const townhalls: PublicService[] = [];
  const schools: PublicService[] = [];
  const kindergartens: PublicService[] = [];
  const healthcare: PublicService[] = [];

  for (const el of elements) {
    const amenity = el.tags?.['amenity'] ?? '';
    const hc = el.tags?.['healthcare'] ?? '';
    const sf = el.tags?.['social_facility'] ?? '';
    if (amenity === 'townhall') { const s = toSvc(el, 'townhall'); if (s) townhalls.push(s); }
    else if (['school','college','university'].includes(amenity)) { const s = toSvc(el, 'school'); if (s) schools.push(s); }
    else if (amenity === 'kindergarten') { const s = toSvc(el, 'kindergarten'); if (s) kindergartens.push(s); }
    else if (['hospital','clinic','doctors','dentist','pharmacy','optician','physiotherapist','blood_bank','health_post','nursing_home','veterinary'].includes(amenity) || hc || sf) {
      const s = toSvc(el, 'healthcare'); if (s) healthcare.push(s);
    }
  }

  const byDist = (a: PublicService, b: PublicService) => a.distanceM - b.distanceM;
  return {
    townhalls:    townhalls.sort(byDist).slice(0, 10),
    schools:      schools.sort(byDist).slice(0, 20),
    kindergartens:kindergartens.sort(byDist).slice(0, 20),
    healthcare:   healthcare.sort(byDist).slice(0, 40),
    fetchedAt:    new Date().toISOString(),
    source:       'overpass',
  };
}

interface Props {
  buildingId:      string;
  buildingName:    string;
  buildingAddress: string;
  buildingLat:     number;
  buildingLon:     number;
}

const CAT_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  townhall:     { label: 'Polgármesteri hivatal', icon: <Building2 size={14} />, color: '#6366f1' },
  school:       { label: 'Iskola',                icon: <School    size={14} />, color: '#3b82f6' },
  kindergarten: { label: 'Óvoda',                 icon: <School    size={14} />, color: '#f59e0b' },
  healthcare:   { label: 'Egészségügy',           icon: <Heart     size={14} />, color: '#ef4444' },
};

function ServiceCard({ s }: { s: PublicService }) {
  const cfg = CAT_CONFIG[s.category] ?? CAT_CONFIG.healthcare;
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_26px_-24px_rgba(15,23,42,0.24)]">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 rounded-lg p-1.5" style={{ background: cfg.color + '22', color: cfg.color }}>
          {cfg.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-tight text-slate-900">{s.name}</p>
          {s.subcategory && <p className="mt-0.5 text-[10px] text-slate-700">{s.subcategory}</p>}
        </div>
        <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-slate-700">
          <Navigation size={8} />{s.distanceM} m
        </span>
      </div>
      {s.address && (
        <p className="flex items-start gap-1 text-[11px] leading-snug text-slate-700">
          <MapPin size={9} className="mt-0.5 shrink-0 text-slate-700" />{s.address}
        </p>
      )}
      <div className="flex items-center gap-3 mt-0.5">
        {s.phone && (
          <a href={`tel:${s.phone}`} className="flex items-center gap-1 text-[10px] font-medium text-sky-700 hover:text-sky-900">
            <Phone size={9} />{s.phone}
          </a>
        )}
        {s.website && (
          <a href={s.website} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-medium text-sky-700 hover:text-sky-900">
            <Globe size={9} />Weboldal
          </a>
        )}
      </div>
    </div>
  );
}

export default function ServicesPageClient({ buildingId, buildingName, buildingAddress, buildingLat, buildingLon }: Props) {
  const lat = buildingLat ?? 47.5278845;
  const lon = buildingLon ?? 19.0705657;

  // ── Compact city (urban) data ──────────────────────────────────────────────
  const [urban,       setUrban]       = useState<UrbanData | null>(null);
  const [loadingUrban,setLoadingUrban]= useState(false);
  const [errorUrban,  setErrorUrban]  = useState(false);
  const [loadingPois, setLoadingPois] = useState(false);
  const urbanRef    = useRef<HTMLDivElement>(null);
  const urbanLoaded = useRef(false);

  const doUrban = useCallback((livePois = false) => {
    setLoadingUrban(true); setErrorUrban(false);
    if (livePois) setLoadingPois(true);
    const url = `/api/environment/urban?buildingId=${buildingId}&lat=${lat}&lon=${lon}${livePois ? '&withPois=1' : ''}`;
    fetch(url)
      .then(r => r.json() as Promise<UrbanData>)
      .then(d => setUrban(d))
      .catch(() => setErrorUrban(true))
      .finally(() => { setLoadingUrban(false); setLoadingPois(false); });
  }, [buildingId, lat, lon]);

  useEffect(() => {
    const el = urbanRef.current; if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !urbanLoaded.current) { urbanLoaded.current = true; doUrban(); }
    }, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, [doUrban]);

  // ── Public services data ──────────────────────────────────────────────────
  const [services,       setServices]       = useState<PublicServicesResult | null>(null);
  const [loadingSvc,     setLoadingSvc]     = useState(false);
  const [errorSvc,       setErrorSvc]       = useState(false);
  const svcRef    = useRef<HTMLDivElement>(null);
  const svcLoaded = useRef(false);

  const fetchServices = useCallback(async (force = false) => {
    setLoadingSvc(true); setErrorSvc(false);
    try {
      const qs = `/api/environment/public-services?buildingId=${buildingId}&lat=${lat}&lon=${lon}${force ? '&force=1' : ''}`;
      const r = await fetch(qs);
      const d = await r.json() as PublicServicesResult;
      if (d.source === 'mock') {
        // Server-side Overpass unreachable — try directly from browser
        try {
          const direct = await fetchOverpassFromBrowser(lat, lon);
          setServices(direct);
        } catch {
          setServices(d);
        }
      } else {
        setServices(d);
      }
    } catch {
      setErrorSvc(true);
    } finally {
      setLoadingSvc(false);
    }
  }, [buildingId, lat, lon]);

  useEffect(() => {
    const el = svcRef.current; if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !svcLoaded.current) { svcLoaded.current = true; fetchServices(); }
    }, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, [fetchServices]);

  const [activeCat, setActiveCat] = useState<string>('townhall');
  const [svcView, setSvcView] = useState<'list' | 'map'>('list');

  const allServices: Record<string, PublicService[]> = {
    townhall:     services?.townhalls     ?? [],
    school:       services?.schools       ?? [],
    kindergarten: services?.kindergartens ?? [],
    healthcare:   services?.healthcare    ?? [],
  };

  const hasAnyServices = Object.values(allServices).some(arr => arr.length > 0);

  return (
    <div className="min-h-screen text-slate-800">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">
          Élettér · OSM Overpass · BKK Transit
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-[-0.015em] text-slate-900">Lakókörnyezet - szolgáltatások</h1>
        <p className="mt-1 text-sm text-slate-700">{buildingName} · {buildingAddress}</p>
      </div>

      <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">

        {/* 1. Kompakt város */}
        <div ref={urbanRef} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.28)] md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <MapPin size={18} className="text-orange-700" />
            <h2 className="text-base font-semibold text-slate-900">Kompakt város — 15 perces élettér</h2>
            <span className="text-[10px] text-slate-700">OSM Overpass · BKK Transit</span>
          </div>
          {loadingUrban ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-32 rounded-2xl bg-slate-100" />
              <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i=><div key={i} className="h-20 rounded-2xl bg-slate-100" />)}</div>
            </div>
          ) : errorUrban ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-xs text-slate-700">Overpass API nem elérhető</p>
              <button type="button" onClick={() => { urbanLoaded.current = false; doUrban(); }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800">
                Újrapróbálás
              </button>
            </div>
          ) : (
            <CompactCityPanel
              data={urban?.compactCity ?? null}
              loading={false}
              buildingLat={lat}
              buildingLon={lon}
              onRequestLivePois={() => doUrban(true)}
              loadingPois={loadingPois}
            />
          )}
        </div>

        {/* 2. Közszolgáltatások */}
        <div ref={svcRef} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.28)] md:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-violet-700" />
              <h2 className="text-base font-semibold text-slate-900">Közszolgáltatások</h2>
              <span className="text-[10px] text-slate-700">OpenStreetMap · 7 napos cache</span>
            </div>
            {services && (
              <button type="button" onClick={() => fetchServices(true)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800">
                <RefreshCw size={9} />Frissítés
              </button>
            )}
          </div>

          {loadingSvc ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <RefreshCw size={22} className="animate-spin text-slate-700" />
              <p className="text-xs text-slate-700">OSM Overpass lekérdezés…</p>
            </div>
          ) : errorSvc ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <p className="text-xs text-slate-700">Nem sikerült betölteni</p>
              <button type="button" onClick={() => fetchServices(true)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800">
                Újrapróbálás
              </button>
            </div>
          ) : (
            <>
              {/* Category tabs + list/map toggle */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="flex flex-1 flex-wrap gap-2">
                  {(Object.keys(CAT_CONFIG) as string[]).map(cat => {
                    const cfg = CAT_CONFIG[cat];
                    const count = allServices[cat]?.length ?? 0;
                    return (
                      <button key={cat} type="button"
                        onClick={() => setActiveCat(cat)}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-semibold transition-colors ${
                          activeCat === cat
                            ? 'border-transparent'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                        style={activeCat === cat ? { background: cfg.color + '33', borderColor: cfg.color + '60', color: cfg.color } : {}}>
                        {cfg.icon}
                        {cfg.label}
                        <span className="rounded-full px-1.5 py-0.5 text-[8px]"
                          style={{ background: activeCat === cat ? cfg.color + '22' : '#eef2f0' }}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {/* List/Map toggle */}
                {hasAnyServices && (
                  <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1">
                    <button type="button" onClick={() => setSvcView('list')}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors ${
                        svcView === 'list' ? 'bg-white text-violet-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-700 hover:bg-white/70 hover:text-slate-900'
                      }`}>
                      <List size={11} />Lista
                    </button>
                    <button type="button" onClick={() => setSvcView('map')}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors ${
                        svcView === 'map' ? 'bg-white text-violet-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-700 hover:bg-white/70 hover:text-slate-900'
                      }`}>
                      <Map size={11} />Térkép
                    </button>
                  </div>
                )}
              </div>

              {/* Map view */}
              {svcView === 'map' && hasAnyServices && (
                <PublicServicesMap
                  buildingLat={lat}
                  buildingLon={lon}
                  services={{
                    townhall:     allServices.townhall     as PublicService[],
                    school:       allServices.school       as PublicService[],
                    kindergarten: allServices.kindergarten as PublicService[],
                    healthcare:   allServices.healthcare   as PublicService[],
                  }}
                  activeCategory={activeCat as 'townhall' | 'school' | 'kindergarten' | 'healthcare'}
                />
              )}

              {/* List view */}
              {svcView === 'list' && (
                <>
                  {(allServices[activeCat] ?? []).length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-700">Nem találtunk ilyen intézményt a közelben.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {(allServices[activeCat] ?? []).map(s => <ServiceCard key={s.id} s={s} />)}
                    </div>
                  )}
                </>
              )}

              {services && (
                <p className="mt-4 text-center text-[10px] text-slate-700">
                  Forrás: OpenStreetMap · {services.source === 'cache' ? 'Gyorsítótárból' : 'Friss adat'} · {new Date(services.fetchedAt).toLocaleDateString('hu-HU')}
                </p>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
