'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface OverpassElement {
  type: 'way' | 'relation';
  id: number;
  geometry?: { lat: number; lon: number }[];
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

// ─── Color map ────────────────────────────────────────────────────────────────
function getColor(tags: Record<string, string>): string {
  const lu = tags.landuse;
  const le = tags.leisure;
  const na = tags.natural;

  if (lu === 'park' || le === 'park' || le === 'garden')                    return '#22c55e';
  if (na === 'wood' || lu === 'forest')                                      return '#15803d';
  if (na === 'grassland' || lu === 'grass' || lu === 'meadow')               return '#84cc16';
  if (na === 'scrub')                                                        return '#65a30d';
  if (lu === 'residential')                                                  return '#64748b';
  if (lu === 'commercial' || lu === 'retail')                                return '#f97316';
  if (lu === 'industrial')                                                   return '#94a3b8';
  if (lu === 'farmland' || lu === 'allotments')                              return '#eab308';
  if (lu)                                                                    return '#475569';
  return '#475569';
}

function getLabel(tags: Record<string, string>): string {
  return tags.landuse ?? tags.leisure ?? tags.natural ?? 'ismeretlen';
}

// ─── GeoJSON conversion ───────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function overpassWayToGeoJson(el: OverpassElement): any | null {
  const coords = (el.geometry ?? []).map((p: { lat: number; lon: number }) => [p.lon, p.lat]);
  if (coords.length < 3) return null;
  if (
    coords[0][0] !== coords[coords.length - 1][0] ||
    coords[0][1] !== coords[coords.length - 1][1]
  ) {
    coords.push(coords[0]);
  }
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: el.tags ?? {},
  };
}

// ─── Legend config ────────────────────────────────────────────────────────────
const LEGEND_ITEMS: { color: string; label: string }[] = [
  { color: '#22c55e', label: 'Park' },
  { color: '#15803d', label: 'Erdő' },
  { color: '#84cc16', label: 'Rét/fű' },
  { color: '#64748b', label: 'Lakó' },
  { color: '#f97316', label: 'Kereskedelmi' },
  { color: '#94a3b8', label: 'Ipari' },
  { color: '#eab308', label: 'Mezőgazdaság' },
];

// ─── Building dot SVG ─────────────────────────────────────────────────────────
function buildingSvg(): string {
  const color = '#6366f1';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="12" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="5" fill="${color}"/>
  </svg>`;
}

const LAND_USE_MAP_CSS = `.land-use-bldg-pin{background:none!important;border:none!important}`;

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  buildingLat: number;
  buildingLon: number;
}

export default function LandUseMapInner({ buildingLat, buildingLon }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!document.getElementById('land-use-map-css')) {
      const s = document.createElement('style');
      s.id = 'land-use-map-css';
      s.textContent = LAND_USE_MAP_CSS;
      document.head.appendChild(s);
    }

    let destroyed = false;

    (async () => {
      const L = await import('leaflet');
      if (destroyed || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [buildingLat, buildingLon],
        zoom: 15,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">ODbL</a>',
        maxZoom: 19,
      }).addTo(map);

      // Building marker
      L.marker([buildingLat, buildingLon], {
        icon: L.divIcon({
          html: buildingSvg(),
          className: 'land-use-bldg-pin',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
        zIndexOffset: 1000,
      }).bindTooltip('<b>Az épület</b>', { sticky: false }).addTo(map);

      // Legend control
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const LegendControl = (L.Control as any).extend({
        onAdd() {
          const div = document.createElement('div');
          div.style.cssText = 'background:rgba(6,12,24,0.85);border-radius:8px;padding:6px 8px;font-size:9px;line-height:1.6;color:#94a3b8;min-width:110px;border:1px solid rgba(255,255,255,0.08)';
          div.innerHTML = LEGEND_ITEMS.map(
            item => `<div style="display:flex;align-items:center;gap:5px"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${item.color};flex-shrink:0"></span>${item.label}</div>`
          ).join('');
          return div;
        },
      });
      new LegendControl({ position: 'bottomleft' }).addTo(map);

      mapRef.current = map;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTimeout(() => { if (mapRef.current) (mapRef.current as any).invalidateSize(); }, 300);
      setMapReady(true);

      // Fetch Overpass data
      const query = `[out:json][timeout:25];
(
  way["landuse"](around:1000,${buildingLat},${buildingLon});
  relation["landuse"](around:1000,${buildingLat},${buildingLon});
  way["leisure"="park"](around:1000,${buildingLat},${buildingLon});
  way["leisure"="garden"](around:1000,${buildingLat},${buildingLon});
  way["natural"="wood"](around:1000,${buildingLat},${buildingLon});
  way["natural"="scrub"](around:1000,${buildingLat},${buildingLon});
  way["natural"="grassland"](around:1000,${buildingLat},${buildingLon});
);
out geom;`;

      try {
        const res = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: query,
          signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) throw new Error('Overpass HTTP error');
        const data: OverpassResponse = await res.json() as OverpassResponse;

        if (destroyed || !mapRef.current) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const features: any[] = [];
        for (const el of data.elements) {
          if (el.type === 'way') {
            const feature = overpassWayToGeoJson(el);
            if (feature) features.push(feature);
          }
        }

        L.geoJSON(
          { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection,
          {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            style(feature: any) {
              const tags: Record<string, string> = (feature?.properties as Record<string, string>) ?? {};
              const color = getColor(tags);
              return {
                color,
                fillColor: color,
                fillOpacity: 0.35,
                weight: 0.8,
                opacity: 0.5,
              };
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onEachFeature(feature: any, layer: any) {
              const tags: Record<string, string> = (feature?.properties as Record<string, string>) ?? {};
              const label = getLabel(tags);
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              layer.bindPopup(`<div style="font-size:10px"><b>${label}</b></div>`);
            },
          }
        ).addTo(mapRef.current);
      } catch {
        if (!destroyed) setError(true);
      }
    })();

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapReady(false);
      setError(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingLat, buildingLon]);

  return (
    <div className="relative overflow-hidden rounded-2xl h-72" style={{ background: '#060c18' }}>
      <div ref={containerRef} className="absolute inset-0" />

      {!mapReady && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[11px] text-slate-500 animate-pulse">Területfelhasználás betöltése…</p>
        </div>
      )}

      {error && mapReady && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none">
          <p className="text-[10px] text-slate-500 bg-[#060c18]/80 px-2 py-1 rounded">Adatok nem elérhetők</p>
        </div>
      )}
    </div>
  );
}
