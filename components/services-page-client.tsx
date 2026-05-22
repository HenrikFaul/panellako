'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, RefreshCw, School, Building2, Heart, Phone, Globe, Navigation, Map, List } from 'lucide-react';
import CompactCityPanel from '@/components/compact-city-panel';
import type { UrbanData } from '@/app/api/environment/urban/route';
import type { PublicService, PublicServicesResult } from '@/app/api/environment/public-services/route';

const PublicServicesMap = dynamic(() => import('@/components/public-services-map-inner'), { ssr: false });

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
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 rounded-lg p-1.5" style={{ background: cfg.color + '22', color: cfg.color }}>
          {cfg.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black text-slate-200 leading-tight">{s.name}</p>
          {s.subcategory && <p className="text-[9px] text-slate-600 mt-0.5">{s.subcategory}</p>}
        </div>
        <span className="shrink-0 text-[9px] font-bold text-slate-600 flex items-center gap-0.5">
          <Navigation size={8} />{s.distanceM} m
        </span>
      </div>
      {s.address && (
        <p className="text-[10px] text-slate-500 leading-snug flex items-start gap-1">
          <MapPin size={9} className="mt-0.5 shrink-0 text-slate-700" />{s.address}
        </p>
      )}
      <div className="flex items-center gap-3 mt-0.5">
        {s.phone && (
          <a href={`tel:${s.phone}`} className="flex items-center gap-1 text-[9px] text-sky-500 hover:text-sky-400">
            <Phone size={9} />{s.phone}
          </a>
        )}
        {s.website && (
          <a href={s.website} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[9px] text-sky-500 hover:text-sky-400">
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

  const fetchServices = useCallback((force = false) => {
    setLoadingSvc(true); setErrorSvc(false);
    const qs = `/api/environment/public-services?buildingId=${buildingId}&lat=${lat}&lon=${lon}${force ? '&force=1' : ''}`;
    fetch(qs)
      .then(r => r.json() as Promise<PublicServicesResult>)
      .then(d => setServices(d))
      .catch(() => setErrorSvc(true))
      .finally(() => setLoadingSvc(false));
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
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <div className="border-b border-slate-800/60 px-6 py-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
          Élettér · OSM Overpass · BKK Transit
        </p>
        <h1 className="mt-0.5 text-xl font-black text-white">Lakókörnyezet - szolgáltatások</h1>
        <p className="mt-0.5 text-sm text-slate-500">{buildingName} · {buildingAddress}</p>
      </div>

      <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-6">

        {/* 1. Kompakt város */}
        <div ref={urbanRef}>
          <div className="mb-4 flex items-center gap-2">
            <MapPin size={18} className="text-orange-400" />
            <h2 className="text-base font-black text-white">Kompakt város — 15 perces élettér</h2>
            <span className="text-[9px] text-slate-600">OSM Overpass · BKK Transit</span>
          </div>
          {loadingUrban ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-32 rounded-2xl bg-white/[0.06]" />
              <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i=><div key={i} className="h-20 rounded-2xl bg-white/[0.06]" />)}</div>
            </div>
          ) : errorUrban ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-xs text-slate-500">Overpass API nem elérhető</p>
              <button type="button" onClick={() => { urbanLoaded.current = false; doUrban(); }}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-400 hover:bg-white/5">
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
        <div ref={svcRef}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-violet-400" />
              <h2 className="text-base font-black text-white">Közszolgáltatások</h2>
              <span className="text-[9px] text-slate-600">OpenStreetMap · 7 napos cache</span>
            </div>
            {services && (
              <button type="button" onClick={() => fetchServices(true)}
                className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[9px] font-bold text-slate-500 hover:text-slate-300 hover:bg-white/5">
                <RefreshCw size={9} />Frissítés
              </button>
            )}
          </div>

          {loadingSvc ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <RefreshCw size={22} className="animate-spin text-slate-600" />
              <p className="text-xs text-slate-500">OSM Overpass lekérdezés…</p>
            </div>
          ) : errorSvc ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <p className="text-xs text-slate-500">Nem sikerült betölteni</p>
              <button type="button" onClick={() => fetchServices(true)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-400 hover:bg-white/5">
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
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-bold transition-all ${
                          activeCat === cat
                            ? 'border-transparent text-white'
                            : 'border-white/[0.08] text-slate-500 hover:text-slate-300'
                        }`}
                        style={activeCat === cat ? { background: cfg.color + '33', borderColor: cfg.color + '60', color: cfg.color } : {}}>
                        {cfg.icon}
                        {cfg.label}
                        <span className="rounded-full px-1.5 py-0.5 text-[8px]"
                          style={{ background: activeCat === cat ? cfg.color + '33' : 'rgba(255,255,255,0.05)' }}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {/* List/Map toggle */}
                {hasAnyServices && (
                  <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
                    <button type="button" onClick={() => setSvcView('list')}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors ${
                        svcView === 'list' ? 'bg-violet-500/20 text-violet-300' : 'text-slate-500 hover:text-slate-300'
                      }`}>
                      <List size={11} />Lista
                    </button>
                    <button type="button" onClick={() => setSvcView('map')}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors ${
                        svcView === 'map' ? 'bg-violet-500/20 text-violet-300' : 'text-slate-500 hover:text-slate-300'
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
                    <p className="py-8 text-center text-xs text-slate-600">Nem találtunk ilyen intézményt a közelben.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {(allServices[activeCat] ?? []).map(s => <ServiceCard key={s.id} s={s} />)}
                    </div>
                  )}
                </>
              )}

              {services && (
                <p className="mt-4 text-center text-[8px] text-slate-700">
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
