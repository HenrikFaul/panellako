'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { CyclingFeature } from '@/app/api/cycling/route';
import type { MapTheme } from '@/lib/map-theme';
import { useMapTheme } from '@/hooks/use-map-theme';

// ─── Route type config ────────────────────────────────────────────────────────
type RouteType   = CyclingFeature['type'];
type RouteConfig = { label: string; color: string; weight: number; dashArray?: string };

const ROUTE_CFG = {
  cycleway: { label: 'Dedikált kerékpárút', color: '#22c55e', weight: 3 },
  track:    { label: 'Védett sáv',          color: '#a78bfa', weight: 3 },
  lane:     { label: 'Jelölt sáv',          color: '#60a5fa', weight: 2.5 },
  shared:   { label: 'Vegyes forgalmú',     color: '#f97316', weight: 2, dashArray: '6 4' },
  other:    { label: 'Kerékpárral enged.',  color: '#94a3b8', weight: 1.5, dashArray: '4 6' },
} satisfies Record<RouteType, { label: string; color: string; weight: number; dashArray?: string }>;

const ALL_TYPES: RouteType[] = ['cycleway', 'track', 'lane', 'shared', 'other'];

// ─── Building dot SVG ─────────────────────────────────────────────────────────
function buildingSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="12" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="5" fill="${color}"/>
  </svg>`;
}

const CYCLING_MAP_CSS = `.cycling-bldg-pin{background:none!important;border:none!important}`;

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  buildingLat: number;
  buildingLon: number;
  routes:      CyclingFeature[];
  theme?:      MapTheme;
}

export default function CyclingMapInner({ buildingLat, buildingLon, routes, theme: themeProp }: Props) {
  const themeFromHook = useMapTheme();
  const theme = themeProp ?? themeFromHook;
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef       = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef   = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRefs    = useRef<Record<RouteType, any>>({} as Record<RouteType, any>);
  const [activeTypes, setActiveTypes] = useState<Set<RouteType>>(new Set(ALL_TYPES));
  const [mapReady, setMapReady]       = useState(false);

  // ── Map init — runs only when building location or theme changes ──────────
  useEffect(() => {
    if (!document.getElementById('cycling-map-css')) {
      const s = document.createElement('style');
      s.id = 'cycling-map-css'; s.textContent = CYCLING_MAP_CSS;
      document.head.appendChild(s);
    }

    let destroyed = false;
    (async () => {
      const L = await import('leaflet');
      if (destroyed || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        center: [buildingLat, buildingLon], zoom: 13,
        zoomControl: true, attributionControl: true,
      });

      L.tileLayer(theme.tileUrl, {
        attribution: theme.attribution + ' · Adatok: <a href="https://www.openstreetmap.org/copyright">ODbL</a>',
        maxZoom: 19,
      }).addTo(map);

      // Building marker
      L.marker([buildingLat, buildingLon], {
        icon: L.divIcon({
          html: buildingSvg(theme.colors.building), className: 'cycling-bldg-pin',
          iconSize: [28,28], iconAnchor: [14,14],
        }),
        zIndexOffset: 1000,
      }).bindTooltip('<b>Az épület</b>', { sticky: false }).addTo(map);

      // Create one empty LayerGroup per route type — routes are added by the routes effect
      for (const type of ALL_TYPES) {
        layerRefs.current[type] = L.layerGroup().addTo(map);
      }

      mapRef.current = map;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTimeout(() => { if (mapRef.current) (mapRef.current as any).invalidateSize(); }, 300);
      setMapReady(true);
    })();

    return () => {
      destroyed = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      leafletRef.current = null;
      setMapReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingLat, buildingLon, theme.id]);

  // ── Render routes — updates layers without destroying the map ─────────────
  useEffect(() => {
    const L = leafletRef.current;
    if (!mapReady || !L) return;

    const grouped: Record<RouteType, CyclingFeature[]> = {
      cycleway: [], track: [], lane: [], shared: [], other: [],
    };
    for (const r of routes) grouped[r.type].push(r);

    for (const type of ALL_TYPES) {
      const group = layerRefs.current[type];
      if (!group) continue;
      group.clearLayers();
      const cfg: RouteConfig = ROUTE_CFG[type];
      for (const route of grouped[type]) {
        const latlngs = route.coords.map(([lon, lat]) => [lat, lon] as [number, number]);
        L.polyline(latlngs, {
          color:     cfg.color,
          weight:    cfg.weight,
          opacity:   0.85,
          dashArray: cfg.dashArray,
        }).bindTooltip(
          `<div style="font-size:10px"><b>${cfg.label}</b>${route.name ? `<br/>${route.name}` : ''}${route.surface ? `<br/><span style="color:#94a3b8">${route.surface}</span>` : ''}</div>`,
          { sticky: true, direction: 'top' }
        ).addTo(group);
      }
    }
  }, [mapReady, routes]);

  // ── Toggle layers ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    for (const type of ALL_TYPES) {
      const layer = layerRefs.current[type];
      if (!layer) continue;
      if (activeTypes.has(type)) { if (!map.hasLayer(layer)) layer.addTo(map); }
      else                       { if (map.hasLayer(layer))  map.removeLayer(layer); }
    }
  }, [mapReady, activeTypes]);

  function toggleType(type: RouteType) {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else                next.add(type);
      return next;
    });
  }

  const routeCount = routes.length;

  return (
    <div className="flex flex-col gap-0">
      {/* Route type toggles */}
      <div className="flex flex-wrap items-center gap-2 px-1 pb-3">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mr-1">Rétegek:</span>
        {ALL_TYPES.map(type => {
          const cfg: RouteConfig = ROUTE_CFG[type];
          const active = activeTypes.has(type);
          const count  = routes.filter(r => r.type === type).length;
          if (count === 0) return null;
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold transition-all duration-150 cursor-pointer ${
                active ? 'text-white' : 'text-slate-500 bg-white/[0.04] border border-white/[0.08]'
              }`}
              style={active ? { background: cfg.color + '28', border: `1px solid ${cfg.color}60`, color: cfg.color } : {}}
            >
              <span className="h-2 w-4 rounded-full inline-block shrink-0"
                style={{ background: active ? cfg.color : '#475569', ...(cfg.dashArray ? { background: 'none', borderTop: `2px dashed ${active ? cfg.color : '#475569'}`, height: '2px', marginTop: '1px' } : {}) }}
              />
              {cfg.label}
              <span className="text-[8px] opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Map */}
      <div className="relative overflow-hidden rounded-2xl" style={{ height: 520, background: theme.colors.background }}>
        <div ref={containerRef} className="absolute inset-0" />

        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[11px] text-slate-500 animate-pulse">Térkép betöltése…</p>
          </div>
        )}

        {routeCount === 0 && mapReady && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-[11px] text-slate-600">Kerékpárút adat nem elérhető</p>
          </div>
        )}
      </div>

      {/* Stats row */}
      {routeCount > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {ALL_TYPES.filter(t => routes.some(r => r.type === t)).map(type => {
            const cfg   = ROUTE_CFG[type];
            const count = routes.filter(r => r.type === type).length;
            return (
              <div key={type} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: cfg.color }} />
                <span className="text-[9px] text-slate-500">{cfg.label}: <span className="font-bold text-slate-400">{count} szakasz</span></span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
