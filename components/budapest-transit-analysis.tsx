'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { BudapestOverviewResponse } from '@/app/api/transit/budapest-overview/route';
import { useMapTheme } from '@/hooks/use-map-theme';

// ─── Mode colour palette — matches the ArcGIS thesis style ────────────────────
//
//   TRAM       Villamos                yellow-400
//   METRO      Metró / Földalatti      blue-900
//   BUS        Busz                    cyan-400
//   HEV/RAIL   HÉV                     green-500
//   TROLLEY    Troli                   red-600
//   FERRY      Hajó                    amber-800
//
// GTFS feeds sometimes label modes differently (METRO vs SUBWAY, HEV vs RAIL,
// TROLLEYBUS vs TROLLEY) — we normalise via MODE_OF().

type Mode = 'TRAM' | 'METRO' | 'BUS' | 'HEV' | 'TROLLEY' | 'FERRY';

const MODE_CFG: Record<Mode, { label: string; color: string }> = {
  TRAM:    { label: 'Villamos',           color: '#facc15' }, // yellow-400
  METRO:   { label: 'Metró / Földalatti', color: '#1e3a8a' }, // blue-900
  BUS:     { label: 'Busz',               color: '#22d3ee' }, // cyan-400
  HEV:     { label: 'HÉV',                color: '#22c55e' }, // green-500
  TROLLEY: { label: 'Troli',              color: '#dc2626' }, // red-600
  FERRY:   { label: 'Hajó',               color: '#92400e' }, // amber-800
};

const MODE_ORDER: Mode[] = ['TRAM', 'METRO', 'BUS', 'HEV', 'TROLLEY', 'FERRY'];

function MODE_OF(rawType: string): Mode {
  const t = (rawType ?? '').toUpperCase();
  if (t === 'TRAM') return 'TRAM';
  if (t === 'METRO' || t === 'SUBWAY' || t === 'UNDERGROUND') return 'METRO';
  if (t === 'HEV' || t === 'RAIL' || t === 'SUBURBAN' || t === 'COMMUTER') return 'HEV';
  if (t === 'TROLLEY' || t === 'TROLLEYBUS') return 'TROLLEY';
  if (t === 'FERRY' || t === 'BOAT' || t === 'WATER') return 'FERRY';
  return 'BUS';
}

// Rail-bound modes (used by Layer 2 "kötöttpályás")
const RAIL_BOUND: Mode[] = ['TRAM', 'METRO', 'HEV'];

// ─── Layer toggle keys ────────────────────────────────────────────────────────

type LayerKey =
  | 'tram' | 'metro' | 'bus' | 'hev' | 'trolley' | 'ferry'
  | 'heat'         // megálló-sűrűség
  | 'dayBuffer'    // nappali járatok 420 m buffer
  | 'nightBuffer'  // éjszakai 420 m buffer
  | 'residential'; // OSM landuse=residential

interface LayerToggle {
  key:      LayerKey;
  label:    string;
  swatch:   string;   // colour for the legend chip square
  initial:  boolean;
  group:    'mode' | 'analysis';
}

const LAYERS: LayerToggle[] = [
  { key: 'tram',        label: 'Villamos',            swatch: MODE_CFG.TRAM.color,    initial: true,  group: 'mode' },
  { key: 'metro',       label: 'Metró / Földalatti',  swatch: MODE_CFG.METRO.color,   initial: true,  group: 'mode' },
  { key: 'bus',         label: 'Busz',                swatch: MODE_CFG.BUS.color,     initial: true,  group: 'mode' },
  { key: 'hev',         label: 'HÉV',                 swatch: MODE_CFG.HEV.color,     initial: true,  group: 'mode' },
  { key: 'trolley',     label: 'Troli',               swatch: MODE_CFG.TROLLEY.color, initial: true,  group: 'mode' },
  { key: 'ferry',       label: 'Hajó',                swatch: MODE_CFG.FERRY.color,   initial: true,  group: 'mode' },
  { key: 'heat',        label: 'Megálló-sűrűség hőtérkép',         swatch: '#1e40af', initial: false, group: 'analysis' },
  { key: 'dayBuffer',   label: 'Nappali járatok 420 m bufferzónája', swatch: '#65a30d', initial: true,  group: 'analysis' },
  { key: 'nightBuffer', label: 'Éjszakai járatok 420 m bufferzónája', swatch: '#facc15', initial: true,  group: 'analysis' },
  { key: 'residential', label: 'Lakóövezet (OSM)',    swatch: '#a78bfa',              initial: true,  group: 'analysis' },
];

const MODE_TO_LAYER: Record<Mode, LayerKey> = {
  TRAM: 'tram', METRO: 'metro', BUS: 'bus', HEV: 'hev', TROLLEY: 'trolley', FERRY: 'ferry',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Heuristic: BKK night-bus lines are prefixed with "9" (e.g. 907, 914, 950).
 *  Returns true for night-only routes — we use this to split day/night for the
 *  Layer 4 / Layer 5 buffer zones. */
function isNightRoute(routeRef: string | null | undefined): boolean {
  if (!routeRef) return false;
  // BKK night-line convention: 9XX where XX are digits. Avoid matching "9"
  // (single digit) or "M9" etc. — they don't exist but be defensive.
  return /^9\d{2}$/.test(routeRef.trim());
}

// Budapest bbox (matches API)
const BBOX = { south: 47.35, west: 18.85, north: 47.65, east: 19.35 };
const CENTER: [number, number] = [(BBOX.south + BBOX.north) / 2, (BBOX.west + BBOX.east) / 2];

const BUDAPEST_TRANSIT_CSS = `
  .bptransit-attribution{font-size:9px!important;color:#475569}
`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function BudapestTransitAnalysis() {
  const theme        = useMapTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef       = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef   = useRef<any>(null);
  // Layer-group refs, one per LayerKey
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRefs    = useRef<Partial<Record<LayerKey, any>>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const residentialFetchedRef = useRef(false);

  const [mapReady, setMapReady]   = useState(false);
  const [data, setData]           = useState<BudapestOverviewResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [residentialError, setResidentialError] = useState<string | null>(null);
  const [showInfo, setShowInfo]   = useState(false);

  const [active, setActive] = useState<Set<LayerKey>>(() => {
    const init = new Set<LayerKey>();
    for (const l of LAYERS) if (l.initial) init.add(l.key);
    return init;
  });

  // ─── 1) Fetch the analysis bundle ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/transit/budapest-overview', { cache: 'force-cache' })
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<BudapestOverviewResponse>;
      })
      .then(json => {
        if (cancelled) return;
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setLoadError((err as Error).message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // ─── 2) Init Leaflet map ───────────────────────────────────────────────
  useEffect(() => {
    if (!document.getElementById('budapest-transit-css')) {
      const s = document.createElement('style');
      s.id = 'budapest-transit-css'; s.textContent = BUDAPEST_TRANSIT_CSS;
      document.head.appendChild(s);
    }

    let destroyed = false;
    (async () => {
      const L = await import('leaflet');
      if (destroyed || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        center: CENTER, zoom: 12,
        zoomControl: true, attributionControl: true,
        preferCanvas: true, // Canvas renderer = far better perf for 1000s of polylines
      });

      L.tileLayer(theme.tileUrl, {
        attribution: theme.attribution,
        maxZoom: 18,
        className: 'bptransit-attribution',
      }).addTo(map);

      // Pre-create empty layer groups so toggling later is just add/remove.
      for (const l of LAYERS) {
        layerRefs.current[l.key] = L.layerGroup();
      }

      mapRef.current = map;
      setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(); }, 300);
      setMapReady(true);
    })();

    return () => {
      destroyed = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      leafletRef.current = null;
      setMapReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.id]);

  // ─── 3) Populate mode-shape layers when data arrives ──────────────────
  useEffect(() => {
    const L = leafletRef.current;
    if (!mapReady || !L || !data) return;

    // Clear all mode layer-groups
    for (const m of MODE_ORDER) {
      const lyr = layerRefs.current[MODE_TO_LAYER[m]];
      if (lyr) lyr.clearLayers();
    }
    // Also clear the analysis-derived layers populated from shapes
    layerRefs.current.dayBuffer?.clearLayers();
    layerRefs.current.nightBuffer?.clearLayers();
    layerRefs.current.heat?.clearLayers();

    // 3a) Mode shape polylines
    for (const shape of data.shapes) {
      const mode  = MODE_OF(shape.route_type);
      const cfg   = MODE_CFG[mode];
      const group = layerRefs.current[MODE_TO_LAYER[mode]];
      if (!group) continue;

      const isRail = RAIL_BOUND.includes(mode);
      const line = L.polyline(shape.polyline, {
        color:   cfg.color,
        weight:  isRail ? 2.5 : 1.5,
        opacity: isRail ? 0.85 : 0.7,
        smoothFactor: 1.3,
      });
      line.addTo(group);
    }

    // 3b) Day / night buffer halos (approximated with thick low-opacity strokes)
    //      ~420 m ≈ weight 40 at z=12; we use Canvas which scales weights in
    //      pixels regardless of zoom, so the user gets a "fat halo" effect.
    for (const shape of data.shapes) {
      const night = isNightRoute(shape.route_ref);

      if (!night) {
        // Daytime buffer — every non-9xx line. 420 m ≈ weight 40 at z=12.
        const halo = L.polyline(shape.polyline, {
          color: '#65a30d',         // lime-700 — matches thesis "Nappali járatok bufferzónája"
          weight: 40,
          opacity: 0.22,
          smoothFactor: 1.5,
          interactive: false,
        });
        halo.addTo(layerRefs.current.dayBuffer);
      } else {
        // Night buffer — 9xx lines only (BKK convention)
        const halo = L.polyline(shape.polyline, {
          color: '#facc15',
          weight: 40,
          opacity: 0.28,
          dashArray: '12,6',
          smoothFactor: 1.5,
          interactive: false,
        });
        halo.addTo(layerRefs.current.nightBuffer);
      }
    }

    // 3c) Stop heatmap approximation — faint blue circles, fillOpacity composites
    for (const s of data.stops) {
      const dot = L.circleMarker([s.lat, s.lon], {
        radius:      14,            // pixel radius; ≈200m at z=12-13
        color:       '#1e40af',     // blue-800
        opacity:     0,             // no stroke
        weight:      0,
        fillColor:   '#1e40af',
        fillOpacity: 0.06,
        interactive: false,
      });
      dot.addTo(layerRefs.current.heat);
    }

    // 3d) Stop markers — tiny pins on the mode layers so popups work
    for (const s of data.stops) {
      const mode = MODE_OF(s.route_type);
      const cfg  = MODE_CFG[mode];
      const group = layerRefs.current[MODE_TO_LAYER[mode]];
      if (!group) continue;

      const pin = L.circleMarker([s.lat, s.lon], {
        radius:      2.5,
        color:       cfg.color,
        weight:      0.5,
        fillColor:   cfg.color,
        fillOpacity: 0.9,
      });
      pin.bindTooltip(
        `<div style="font-size:10px;max-width:200px">
           <b>${s.name.replace(/</g, '&lt;')}</b>
           <br/><span style="color:#64748b">${cfg.label}${s.route_refs.length ? ' · ' + s.route_refs.slice(0,8).join(', ') : ''}</span>
         </div>`,
        { sticky: true, direction: 'top', opacity: 0.95 },
      );
      pin.addTo(group);
    }
  }, [mapReady, data]);

  // ─── 4) Toggle layer visibility ────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    for (const l of LAYERS) {
      const lyr = layerRefs.current[l.key];
      if (!lyr) continue;
      if (active.has(l.key)) {
        if (!map.hasLayer(lyr)) lyr.addTo(map);
      } else {
        if (map.hasLayer(lyr)) map.removeLayer(lyr);
      }
    }
  }, [mapReady, active]);

  // ─── 5) Lazy-load OSM landuse=residential when layer first activated ──
  useEffect(() => {
    if (!mapReady || !active.has('residential')) return;
    if (residentialFetchedRef.current) return;
    residentialFetchedRef.current = true;

    const L = leafletRef.current;
    if (!L) return;
    const layer = layerRefs.current.residential;
    if (!layer) return;

    // Overpass query: every landuse=residential way/relation in Budapest bbox.
    const query = `[out:json][timeout:25];
      (
        way["landuse"="residential"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
        relation["landuse"="residential"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
      );
      out geom;`;

    const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);

    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`Overpass HTTP ${r.status}`);
        return r.json();
      })
      .then(json => {
        type OverpassNd = { lat: number; lon: number };
        type OverpassElement = {
          type: 'way' | 'relation' | 'node';
          geometry?: OverpassNd[];
          members?: Array<{ type: string; role: string; geometry?: OverpassNd[] }>;
        };

        const polygons: Array<Array<[number, number]>> = [];
        for (const el of (json?.elements ?? []) as OverpassElement[]) {
          if (el.type === 'way' && el.geometry && el.geometry.length >= 3) {
            polygons.push(el.geometry.map(n => [n.lat, n.lon] as [number, number]));
          } else if (el.type === 'relation' && Array.isArray(el.members)) {
            for (const m of el.members) {
              if (m.role === 'outer' && m.geometry && m.geometry.length >= 3) {
                polygons.push(m.geometry.map(n => [n.lat, n.lon] as [number, number]));
              }
            }
          }
        }

        for (const ring of polygons) {
          L.polygon(ring, {
            color:       '#a78bfa',
            weight:      0,
            fillColor:   '#a78bfa',
            fillOpacity: 0.20,
            interactive: false,
          }).addTo(layer);
        }
      })
      .catch(err => {
        setResidentialError((err as Error).message);
        // Allow retry on next activation
        residentialFetchedRef.current = false;
      });
  }, [mapReady, active]);

  // ─── 6) UI handlers ────────────────────────────────────────────────────
  function toggle(key: LayerKey) {
    setActive(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const modeLayers     = useMemo(() => LAYERS.filter(l => l.group === 'mode'), []);
  const analysisLayers = useMemo(() => LAYERS.filter(l => l.group === 'analysis'), []);

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 180px)', minHeight: 520 }}>
      {/* Map container */}
      <div ref={containerRef} className="absolute inset-0 rounded-2xl overflow-hidden bg-slate-900" />

      {/* Loading / error overlay */}
      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="rounded-full border border-white/10 bg-slate-900/90 px-4 py-2 text-xs font-bold text-slate-300 shadow-md animate-pulse">
            GTFS-adatok betöltése…
          </p>
        </div>
      )}
      {loadError && (
        <div className="absolute inset-x-0 top-4 mx-auto w-fit max-w-md rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 shadow-md">
          ⚠ Adatlekérés sikertelen: {loadError}
        </div>
      )}

      {/* Layer panel (top-left) */}
      <div className="absolute left-3 top-3 z-[1000] w-64 max-w-[80vw] rounded-2xl border border-white/10 bg-slate-900/90 p-3 shadow-lg backdrop-blur">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Rétegek</p>

        <div className="flex flex-col gap-1.5">
          {modeLayers.map(l => (
            <LayerChip
              key={l.key}
              label={l.label}
              swatch={l.swatch}
              active={active.has(l.key)}
              onClick={() => toggle(l.key)}
            />
          ))}
        </div>

        <div className="my-2 border-t border-white/10" />

        <div className="flex flex-col gap-1.5">
          {analysisLayers.map(l => (
            <LayerChip
              key={l.key}
              label={l.label}
              swatch={l.swatch}
              active={active.has(l.key)}
              onClick={() => toggle(l.key)}
            />
          ))}
        </div>

        {residentialError && active.has('residential') && (
          <p className="mt-2 text-[9px] text-rose-400">⚠ OSM Overpass: {residentialError}</p>
        )}

        {data?.meta && (
          <p className="mt-2 text-[9px] text-slate-400">
            {data.meta.totalShapesOut.toLocaleString('hu-HU')} vonalszakasz · {data.meta.totalStops.toLocaleString('hu-HU')} megálló
          </p>
        )}
      </div>

      {/* Info button (top-right) */}
      <button
        type="button"
        onClick={() => setShowInfo(v => !v)}
        className="absolute right-3 top-3 z-[1000] grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-slate-900/90 text-base font-semibold text-slate-200 shadow-lg hover:bg-slate-800"
        aria-label="Módszertan"
      >
        ℹ
      </button>

      {/* Info popup */}
      {showInfo && (
        <div className="absolute right-3 top-16 z-[1001] w-80 max-w-[80vw] rounded-2xl border border-white/10 bg-slate-900 p-4 text-xs text-slate-300 shadow-2xl">
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-slate-100">Módszertan</p>
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-400 hover:bg-white/10"
            >
              ×
            </button>
          </div>
          <p className="mb-2">
            A térkép Budapest tömegközlekedésének analitikus elemzése GTFS-adatok alapján,
            a BKK Futár nyílt adatkészletének napi szinkronjából.
          </p>
          <ul className="mb-2 list-disc pl-4 space-y-0.5">
            <li><b>Vonalak:</b> járat-shape-ek mode-szerinti színkódolással.</li>
            <li><b>Kötöttpályás:</b> a villamos / metró / HÉV vastagabb vonalakkal.</li>
            <li><b>Hőtérkép:</b> megálló-sűrűség (átfedő körök alpha-kompozit).</li>
            <li><b>420 m buffer:</b> kb. 5 perces gyaloglási elérhetőség egy vonal körül.</li>
            <li><b>Éjszakai (9XX):</b> a BKK 9-cel kezdődő háromjegyű vonalai.</li>
            <li><b>Lakóövezet:</b> OSM <code>landuse=residential</code> poligonok.</li>
          </ul>
          <p className="mb-1 text-[10px] font-bold text-slate-500">Adatforrás:</p>
          <ul className="text-[10px] space-y-0.5">
            <li>BKK Futár nyílt GTFS feed (megállók, vonalak, shape-ek)</li>
            <li>OpenStreetMap Overpass API (lakóövezet)</li>
            <li>CartoCDN light basemap</li>
          </ul>
          {data?.meta?.fetchedAt && (
            <p className="mt-2 text-[10px] text-slate-400">
              Felvétel: {new Date(data.meta.fetchedAt).toLocaleString('hu-HU')}
            </p>
          )}
          {data?.availableRouteTypes && data.availableRouteTypes.length > 0 && (
            <p className="mt-1 text-[10px] text-slate-400">
              DB route_type: {data.availableRouteTypes.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Layer chip ────────────────────────────────────────────────────────────────

function LayerChip({
  label, swatch, active, onClick,
}: { label: string; swatch: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
        active
          ? 'bg-white/[0.12] text-white shadow-sm'
          : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
      }`}
    >
      <span
        className="inline-block h-3 w-3 rounded-sm border border-white/40"
        style={{ background: swatch }}
      />
      <span className="text-left">{label}</span>
    </button>
  );
}
