'use client';

/**
 * TransitCoverageMapInner — v2.0
 *
 * Methodology: Faul Henrik szakdolgozat §4.4 "Budapest tömegközlekedése"
 * ─────────────────────────────────────────────────────────────────────────
 * The thesis computes 420 m walking buffers (5 min @ 5 km/h) around every
 * BKK stop and overlays them on OSM residential-landuse polygons to reveal
 * which residential areas lack convenient transit coverage.
 *
 * Three visual layers (matching the thesis map legend):
 *   1. Lakóövezet (OSM landuse=residential) — blue polygons
 *   2. Nappali járatok 420 m bufferzónája   — solid amber circles
 *   3. Éjszakai járatok 420 m bufferzónája  — dashed yellow circles
 */

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

// ─── Night-route heuristic (BKK convention) ───────────────────────────────────
// BKK nighttime route short-names: É-prefix (É2, É4…) or 9xx series (914, 923…)
function hasNightService(routeRefs: string[]): boolean {
  return routeRefs.some(r => {
    const u = r.trim().toUpperCase();
    return u.startsWith('É') || /^9[0-9]{2}/.test(u);
  });
}

// ─── Overpass helpers (residential landuse) ───────────────────────────────────
interface OvNode { type: 'node'; id: number; lat: number; lon: number; }
interface OvWay  { type: 'way';  id: number; nodes: number[];           }
type OvEl = OvNode | OvWay;

function buildNodeMap(elements: OvEl[]): Map<number, [number, number]> {
  const m = new Map<number, [number, number]>();
  for (const el of elements) {
    if (el.type === 'node') m.set(el.id, [el.lat, el.lon]);
  }
  return m;
}

function wayToLatLngs(
  way:     OvWay,
  nodeMap: Map<number, [number, number]>,
): [number, number][] | null {
  const coords = way.nodes
    .map(id => nodeMap.get(id))
    .filter(Boolean) as [number, number][];
  return coords.length >= 3 ? coords : null;
}

// ─── Inline CSS ───────────────────────────────────────────────────────────────
const MAP_CSS = `
.tcm-pin { background: none !important; border: none !important; }
.tcm-legend {
  background: rgba(8,14,30,0.90);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 10px;
  padding: 7px 11px;
  line-height: 1.8;
  font-size: 10px;
  color: #e2e8f0;
  max-width: 230px;
}
.tcm-legend-title {
  font-size: 8.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: #475569;
  margin-bottom: 3px;
}
`;

function buildingSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
    <circle cx="13" cy="13" r="11" fill="#6366f1" fill-opacity="0.18" stroke="#818cf8" stroke-width="2"/>
    <circle cx="13" cy="13" r="4.5" fill="#818cf8"/>
  </svg>`;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Stop {
  id:          string;
  name:        string;
  lat:         number;
  lon:         number;
  routeType?:  string;
  routeRefs?:  string[];
  routeTypes?: string[];
}

interface Props {
  buildingLat: number;
  buildingLon: number;
  stops:       Stop[];
}

export default function TransitCoverageMapInner({ buildingLat, buildingLon, stops }: Props) {
  const containerRef   = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef         = useRef<any>(null);
  const [mapReady,     setMapReady]     = useState(false);
  const [loadingPolys, setLoadingPolys] = useState(true);

  useEffect(() => {
    if (!document.getElementById('tcm2-css')) {
      const s = document.createElement('style');
      s.id = 'tcm2-css';
      s.textContent = MAP_CSS;
      document.head.appendChild(s);
    }

    let destroyed = false;

    (async () => {
      const L = await import('leaflet');
      if (destroyed || !containerRef.current || mapRef.current) return;

      // ── Map init ─────────────────────────────────────────────────────────────
      const map = L.map(containerRef.current, {
        center:             [buildingLat, buildingLon],
        zoom:               13,          // neighbourhood context (thesis: district-level view)
        zoomControl:        true,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://carto.com/attributions">CARTO</a> &middot; ' +
          '<a href="https://openstreetmap.org/copyright">ODbL</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(); }, 300);
      setMapReady(true);

      // ── Layer 1: Lakóövezet polygons from OSM (Overpass) ─────────────────────
      // Thesis §4.4: "az Openstreetmap landusage rétegéből … a residential
      // attribútumú polygon objektumokat … elkészíthetjük a lakóövezeti térkép réteget"
      const POLY_RADIUS = 2200;
      const ovQuery = `[out:json][timeout:30];(way["landuse"="residential"](around:${POLY_RADIUS},${buildingLat},${buildingLon}););out body;>;out skel qt;`;
      try {
        const res = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: `data=${encodeURIComponent(ovQuery)}`,
          signal: AbortSignal.timeout(25000),
        });
        if (res.ok && !destroyed) {
          const json = await res.json();
          const nodeMap = buildNodeMap(json.elements as OvEl[]);
          const ways    = (json.elements as OvEl[]).filter((e): e is OvWay => e.type === 'way');
          for (const way of ways) {
            const latlngs = wayToLatLngs(way, nodeMap);
            if (!latlngs || destroyed) continue;
            L.polygon(latlngs, {
              color:       '#3b82f6',
              weight:      0.5,
              opacity:     0.4,
              fillColor:   '#93c5fd',
              fillOpacity: 0.22,
            }).addTo(map);
          }
        }
      } catch {
        // Overpass unavailable — continue without residential overlay
      }
      if (!destroyed) setLoadingPolys(false);

      // ── Layers 2 & 3: Stop coverage buffers ──────────────────────────────────
      // Thesis §4.4: "megállóhelyek köré generált 420 méteres bufferzónával
      // (átlagos 5km/h-s gyalogos sebességgel 5 perc alatt lesétálható távolság)"
      const BUFFER_RADIUS = 420;   // metres — 5 min walk @ 5 km/h

      // Render daytime buffers first (below nighttime)
      const dayStops   = stops.filter(s => !hasNightService(s.routeRefs ?? []));
      const nightStops = stops.filter(s =>  hasNightService(s.routeRefs ?? []));

      // Layer 2 — Nappali járatok 420 m bufferzónája (solid amber)
      for (const stop of dayStops) {
        if (stop.lat == null || stop.lon == null || isNaN(stop.lat) || isNaN(stop.lon)) continue;
        L.circle([stop.lat, stop.lon], {
          radius:      BUFFER_RADIUS,
          color:       '#d97706',
          weight:      1,
          opacity:     0.55,
          fillColor:   '#fbbf24',
          fillOpacity: 0.22,
        }).addTo(map);
      }

      // Layer 3 — Éjszakai járatok 420 m bufferzónája (dashed yellow)
      // Visual equivalent of the hatched fill in the thesis GIS output
      for (const stop of nightStops) {
        if (stop.lat == null || stop.lon == null || isNaN(stop.lat) || isNaN(stop.lon)) continue;
        L.circle([stop.lat, stop.lon], {
          radius:      BUFFER_RADIUS,
          color:       '#fde047',
          weight:      1.5,
          opacity:     0.65,
          dashArray:   '5 4',
          fillColor:   '#fde047',
          fillOpacity: 0.09,
        }).addTo(map);
      }

      // ── Stop dot markers ──────────────────────────────────────────────────────
      for (const stop of stops) {
        if (stop.lat == null || stop.lon == null || isNaN(stop.lat) || isNaN(stop.lon)) continue;
        const refs  = stop.routeRefs ?? [];
        const night = hasNightService(refs);
        L.circleMarker([stop.lat, stop.lon], {
          radius:      3.5,
          color:       '#ffffff',
          weight:      1,
          fillColor:   night ? '#fde047' : '#fbbf24',
          fillOpacity: 1,
        })
          .bindPopup(
            `<div style="font-size:11px;font-weight:700;color:#f1f5f9">${stop.name}</div>` +
            (refs.length
              ? `<div style="font-size:9px;color:#94a3b8;margin-top:2px">${refs.join(' · ')}</div>`
              : ''),
          )
          .addTo(map);
      }

      // ── Building marker ───────────────────────────────────────────────────────
      L.marker([buildingLat, buildingLon], {
        icon: L.divIcon({
          html:       buildingSvg(),
          className:  'tcm-pin',
          iconSize:   [26, 26],
          iconAnchor: [13, 13],
        }),
        zIndexOffset: 1000,
      })
        .bindTooltip('<b>Az épület</b>', { sticky: false })
        .addTo(map);

      // ── Legend (matches thesis map legend structure) ──────────────────────────
      const LegendCtl = L.Control.extend({
        options: { position: 'bottomleft' },
        onAdd() {
          const div = L.DomUtil.create('div', 'tcm-legend');
          // Night symbol: dashed circle (visual analog of hatched fill)
          const nightSym = `<svg width="14" height="14" viewBox="0 0 14 14">
            <circle cx="7" cy="7" r="5.5" fill="rgba(253,224,71,0.09)" stroke="#fde047" stroke-width="1.5" stroke-dasharray="3 2.5"/>
          </svg>`;
          // Day symbol: solid circle
          const daySym = `<svg width="14" height="14" viewBox="0 0 14 14">
            <circle cx="7" cy="7" r="5.5" fill="rgba(251,191,36,0.28)" stroke="#d97706" stroke-width="1"/>
          </svg>`;
          // Residential symbol
          const resSym = `<svg width="14" height="14" viewBox="0 0 14 14">
            <rect x="1" y="1" width="12" height="12" rx="2" fill="rgba(147,197,253,0.28)" stroke="#3b82f6" stroke-width="0.8"/>
          </svg>`;
          // Building symbol
          const bldgSym = `<svg width="14" height="14" viewBox="0 0 14 14">
            <circle cx="7" cy="7" r="5" fill="#818cf8" opacity="0.9"/>
          </svg>`;
          const row = (sym: string, label: string) =>
            `<div style="display:flex;align-items:center;gap:5px">${sym}<span>${label}</span></div>`;
          div.innerHTML =
            `<div class="tcm-legend-title">Tömegközlekedési lefedettség · 420 m</div>` +
            row(nightSym, 'Éjszakai járatok 420 m bufferzónája') +
            row(daySym,   'Nappali járatok 420 m bufferzónája') +
            row(resSym,   'Lakóövezet (OSM)') +
            row(bldgSym,  'Épület');
          return div;
        },
      });
      new LegendCtl().addTo(map);

    })();

    return () => {
      destroyed = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      setMapReady(false);
      setLoadingPolys(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingLat, buildingLon, stops]);

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{ background: '#060c18', height: '300px' }}
    >
      <div ref={containerRef} className="absolute inset-0" />

      {/* Loading states */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="animate-pulse text-[11px] text-slate-500">Térkép betöltése…</p>
        </div>
      )}
      {mapReady && loadingPolys && (
        <div className="pointer-events-none absolute right-2 top-2">
          <span className="animate-pulse text-[9px] text-slate-600">
            Lakóövezetek betöltése…
          </span>
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
