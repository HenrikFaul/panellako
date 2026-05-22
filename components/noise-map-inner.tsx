'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { useMapTheme } from '@/hooks/use-map-theme';

// ─── Highway type config ──────────────────────────────────────────────────────
type HighwayType = 'motorway' | 'trunk' | 'primary' | 'secondary' | 'tertiary';

const HIGHWAY_CFG: Record<HighwayType, { label: string; color: string; weight: number }> = {
  motorway:  { label: 'Autópálya/autóút', color: '#ef4444', weight: 5 },
  trunk:     { label: 'Autópálya/autóút', color: '#ef4444', weight: 5 },
  primary:   { label: 'Főút',             color: '#f97316', weight: 4 },
  secondary: { label: 'Elsőrendű',        color: '#fbbf24', weight: 3 },
  tertiary:  { label: 'Másodrendű',       color: '#94a3b8', weight: 2 },
};

// Legend items (merged motorway+trunk)
const LEGEND_ITEMS: { color: string; label: string }[] = [
  { color: '#ef4444', label: 'Főút' },
  { color: '#f97316', label: 'Elsőrendű' },
  { color: '#fbbf24', label: 'Másodrendű' },
  { color: '#94a3b8', label: 'Harmadrendű' },
];

// ─── Noise zones ──────────────────────────────────────────────────────────────
const NOISE_ZONES = [
  { radius: 400, color: '#fbbf24', opacity: 0.06 },
  { radius: 150, color: '#f97316', opacity: 0.12 },
  { radius:  50, color: '#ef4444', opacity: 0.20 },
];

// ─── Building dot SVG ─────────────────────────────────────────────────────────
function buildingSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="12" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="5" fill="${color}"/>
  </svg>`;
}

const NOISE_MAP_CSS = `.noise-bldg-pin{background:none!important;border:none!important}`;

// ─── Overpass response types ──────────────────────────────────────────────────
interface OverpassNode {
  lat: number;
  lon: number;
}

interface OverpassWay {
  type: 'way';
  tags?: { highway?: string };
  geometry?: OverpassNode[];
}

interface OverpassResponse {
  elements?: OverpassWay[];
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  buildingLat: number;
  buildingLon: number;
  className?:  string;
}

export default function NoiseMapInner({ buildingLat, buildingLon, className }: Props) {
  const theme        = useMapTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef       = useRef<any>(null);
  const [loading, setLoading]   = useState(true);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!document.getElementById('noise-map-css')) {
      const s = document.createElement('style');
      s.id = 'noise-map-css'; s.textContent = NOISE_MAP_CSS;
      document.head.appendChild(s);
    }

    let destroyed = false;

    (async () => {
      const L = await import('leaflet');
      if (destroyed || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [buildingLat, buildingLon], zoom: 15,
        zoomControl: true, attributionControl: true,
      });

      // Tile layer — respects user's map theme setting
      L.tileLayer(theme.tileUrl, {
        attribution: theme.attribution + ' · Adatok: <a href="https://www.openstreetmap.org/copyright">ODbL</a>',
        maxZoom: 19,
      }).addTo(map);

      // Noise zone circles (outer → inner, so inner renders on top)
      for (const zone of NOISE_ZONES) {
        L.circle([buildingLat, buildingLon], {
          radius:      zone.radius,
          color:       'transparent',
          fillColor:   zone.color,
          fillOpacity: zone.opacity,
          weight:      0,
        }).addTo(map);
      }

      // Building marker
      L.marker([buildingLat, buildingLon], {
        icon: L.divIcon({
          html: buildingSvg(theme.colors.building),
          className: 'noise-bldg-pin',
          iconSize:   [28, 28],
          iconAnchor: [14, 14],
        }),
        zIndexOffset: 1000,
      }).bindTooltip('<b>Az épület</b>', { sticky: false }).addTo(map);

      mapRef.current = map;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTimeout(() => { if (mapRef.current) (mapRef.current as any).invalidateSize(); }, 300);
      setMapReady(true);

      // ── Fetch Overpass roads ───────────────────────────────────────────────
      const query = `[out:json][timeout:20];(way["highway"~"motorway|trunk|primary|secondary|tertiary"](around:1500,${buildingLat},${buildingLon}););out geom;`;
      try {
        const body    = new URLSearchParams({ data: query });
        const res     = await fetch('https://overpass-api.de/api/interpreter', {
          method:  'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    body.toString(),
          signal:  AbortSignal.timeout(15000),
        });

        if (res.ok && !destroyed) {
          const json: OverpassResponse = await res.json();
          const elements = json.elements ?? [];

          for (const el of elements) {
            if (el.type !== 'way' || !el.geometry || el.geometry.length < 2) continue;
            const highway = el.tags?.highway as HighwayType | undefined;
            if (!highway) continue;

            const cfg = HIGHWAY_CFG[highway];
            if (!cfg) continue;

            const latlngs = el.geometry.map((n) => [n.lat, n.lon] as [number, number]);
            L.polyline(latlngs, {
              color:   cfg.color,
              weight:  cfg.weight,
              opacity: 0.80,
            }).addTo(map);
          }
        }
      } catch {
        // Overpass failed — map still shows building + circles
      }

      setLoading(false);
    })();

    return () => {
      destroyed = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      setLoading(true);
      setMapReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingLat, buildingLon, theme.id]);

  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}
      style={{ background: '#060c18', minHeight: 288 }}>
      {/* Map container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Loading overlay */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-[11px] text-slate-500 animate-pulse">Zajadatok betöltése…</p>
        </div>
      )}

      {/* Loading indicator for road data (shown after map is ready but roads still fetching) */}
      {mapReady && loading && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none">
          <p className="text-[9px] text-slate-400 animate-pulse bg-black/60 px-2 py-1 rounded">
            Úthálózat betöltése…
          </p>
        </div>
      )}

      {/* Legend */}
      {mapReady && (
        <div className="absolute bottom-6 left-2 z-[400] bg-black/70 rounded-lg px-3 py-2 flex flex-col gap-1">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: item.color }}
              />
              <span className="text-[9px] text-slate-300">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
