'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

// ─── Stop colors (same palette as transit-live-map-inner.tsx STOP_COLOR) ──────
const STOP_COLOR: Record<string, string> = {
  SUBWAY:     '#ef4444',
  TRAM:       '#f59e0b',
  TROLLEYBUS: '#f87171',
  BUS:        '#3b82f6',
  RAIL:       '#8b5cf6',
  FERRY:      '#14b8a6',
  CABLE_CAR:  '#f59e0b',
};
const DEFAULT_STOP_COLOR = '#94a3b8';

// ─── Inline CSS ────────────────────────────────────────────────────────────────
const COVERAGE_MAP_CSS = `
.tcm-bldg-pin { background: none !important; border: none !important; }
.tcm-stop-pin { background: none !important; border: none !important; }
.tcm-legend {
  background: rgba(15,23,42,0.90);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 10px;
  padding: 6px 10px;
  line-height: 1.6;
  font-size: 10px;
  color: #e2e8f0;
}
`;

function buildingSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="12" fill="#6366f1" fill-opacity="0.18" stroke="#6366f1" stroke-width="1.8"/>
    <circle cx="14" cy="14" r="5" fill="#6366f1"/>
  </svg>`;
}

function stopDotSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8">
    <circle cx="4" cy="4" r="3.5" fill="${color}" stroke="white" stroke-width="1"/>
  </svg>`;
}

// ─── Legend control factory (runs after L is loaded) ─────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createLegendControl(L: any) {
  const Legend = L.Control.extend({
    options: { position: 'bottomleft' },
    onAdd() {
      const div = L.DomUtil.create('div', 'tcm-legend');
      div.innerHTML = [
        ['#ef4444', 'Metró'],
        ['#f59e0b', 'Villamos'],
        ['#f87171', 'Trolibusz'],
        ['#3b82f6', 'Busz'],
        ['#6366f1', 'Épület'],
      ].map(([color, label]) =>
        `<div style="display:flex;align-items:center;gap:5px">
           <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></span>
           <span>${label}</span>
         </div>`
      ).join('');
      return div;
    },
  });
  return new Legend();
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Stop {
  id:        string;
  name:      string;
  lat:       number;
  lon:       number;
  routeType?: string;
  routeTypes?: string[];
}

interface Props {
  buildingLat: number;
  buildingLon: number;
  stops:       Stop[];
}

export default function TransitCoverageMapInner({ buildingLat, buildingLon, stops }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef       = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!document.getElementById('tcm-css')) {
      const s = document.createElement('style');
      s.id = 'tcm-css';
      s.textContent = COVERAGE_MAP_CSS;
      document.head.appendChild(s);
    }

    let destroyed = false;

    (async () => {
      const L = await import('leaflet');
      if (destroyed || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center:            [buildingLat, buildingLon],
        zoom:              14,
        zoomControl:       true,
        attributionControl: true,
      });

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> · <a href="https://openstreetmap.org/copyright">ODbL</a>',
          maxZoom: 19,
        }
      ).addTo(map);

      // Building marker
      L.marker([buildingLat, buildingLon], {
        icon: L.divIcon({
          html:      buildingSvg(),
          className: 'tcm-bldg-pin',
          iconSize:  [28, 28],
          iconAnchor:[14, 14],
        }),
        zIndexOffset: 1000,
      })
        .bindTooltip('<b>Az épület</b>', { sticky: false })
        .addTo(map);

      // Coverage circles + stop dot markers
      for (const stop of stops) {
        const type  = stop.routeType ?? (stop.routeTypes?.[0]) ?? '';
        const color = STOP_COLOR[type] ?? DEFAULT_STOP_COLOR;

        // 400 m buffer circle
        L.circle([stop.lat, stop.lon], {
          radius:      400,
          color,
          fillColor:   color,
          fillOpacity: 0.06,
          weight:      1,
          opacity:     0.4,
        }).addTo(map);

        // Small stop dot
        const types = stop.routeTypes ?? (stop.routeType ? [stop.routeType] : []);
        const popupContent = `<div style="font-size:11px;font-weight:700;color:#f1f5f9">${stop.name}</div>${
          types.length > 0
            ? `<div style="font-size:9px;color:#94a3b8;margin-top:2px">${types.join(', ')}</div>`
            : ''
        }`;

        L.marker([stop.lat, stop.lon], {
          icon: L.divIcon({
            html:      stopDotSvg(color),
            className: 'tcm-stop-pin',
            iconSize:  [8, 8],
            iconAnchor:[4, 4],
          }),
          zIndexOffset: 500,
        })
          .bindPopup(popupContent)
          .addTo(map);
      }

      // Legend
      createLegendControl(L).addTo(map);

      mapRef.current = map;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTimeout(() => { if (mapRef.current) (mapRef.current as any).invalidateSize(); }, 300);
      setMapReady(true);
    })();

    return () => {
      destroyed = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      setMapReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingLat, buildingLon]);

  return (
    <div className="relative h-72 overflow-hidden rounded-2xl" style={{ background: '#060c18' }}>
      <div ref={containerRef} className="absolute inset-0" />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="animate-pulse text-[11px] text-slate-500">Térkép betöltése…</p>
        </div>
      )}
      {stops.length === 0 && mapReady && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-[11px] text-slate-600">Nincs megálló adat</p>
        </div>
      )}
    </div>
  );
}
