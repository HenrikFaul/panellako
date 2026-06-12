'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { CompactCityPoi, AmenityCategory } from '@/app/api/environment/urban/route';
import type { MapTheme } from '@/lib/map-theme';
import { useMapTheme } from '@/hooks/use-map-theme';

// ─── Panel-level category groups ─────────────────────────────────────────────
// We render markers grouped into these 8 user-facing buckets (matches the
// stats panel categories) so the filter chips above the map line up 1:1 with
// what the user already sees.
type CatGroup = 'food'|'health'|'education'|'dining'|'culture'|'sport'|'services'|'safety';

const GROUP_CFG = {
  food:      { label: 'Élelmiszer',  color: '#fb923c', emoji: '🛒' },
  health:    { label: 'Egészségügy', color: '#60a5fa', emoji: '💊' },
  education: { label: 'Oktatás',     color: '#a78bfa', emoji: '🏫' },
  dining:    { label: 'Vendéglátás', color: '#f472b6', emoji: '🍽️' },
  culture:   { label: 'Kultúra',     color: '#d946ef', emoji: '🎭' },
  sport:     { label: 'Sport',       color: '#22c55e', emoji: '⚽' },
  services:  { label: 'Szolgáltatás',color: '#94a3b8', emoji: '🏦' },
  safety:    { label: 'Biztonság',   color: '#eab308', emoji: '🛡️' },
} satisfies Record<CatGroup, { label: string; color: string; emoji: string }>;

const ALL_GROUPS: CatGroup[] = [
  'food','health','education','dining','culture','sport','services','safety',
];

function groupOf(c: AmenityCategory): CatGroup {
  if (c === 'supermarket' || c === 'bakery' || c === 'daily')                  return 'food';
  if (c === 'pharmacy'    || c === 'hospital' || c === 'healthcare')          return 'health';
  if (c === 'school'      || c === 'education')                               return 'education';
  if (c === 'restaurant'  || c === 'cafe' || c === 'food')                    return 'dining';
  if (c === 'culture')                                                        return 'culture';
  if (c === 'sport')                                                          return 'sport';
  if (c === 'safety')                                                         return 'safety';
  return 'services';
}

// ─── Marker SVGs ──────────────────────────────────────────────────────────────
function poiSvg(color: string, emoji: string): string {
  return `<div style="
    display:flex;align-items:center;justify-content:center;
    width:26px;height:26px;border-radius:50% 50% 50% 0;
    background:${color};transform:rotate(-45deg);
    box-shadow:0 1px 4px rgba(0,0,0,0.5);
    border:1.5px solid rgba(255,255,255,0.85);">
    <span style="transform:rotate(45deg);font-size:13px;line-height:1">${emoji}</span>
  </div>`;
}

function buildingSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
    <circle cx="17" cy="17" r="15" fill="#ef4444" fill-opacity="0.2" stroke="#ef4444" stroke-width="2"/>
    <polygon points="17,5 20.3,13.6 29.5,14 22.4,19.9 24.7,28.7 17,23.5 9.3,28.7 11.6,19.9 4.5,14 13.7,13.6"
      fill="#ef4444" stroke="#fee2e2" stroke-width="0.6"/>
  </svg>`;
}

const COMPACT_MAP_CSS = `
  .compact-poi-pin{background:none!important;border:none!important}
  .compact-bldg-pin{background:none!important;border:none!important}
`;

// ─── Selected POI side card ───────────────────────────────────────────────────
function PoiDetailCard({ poi, onClose }: { poi: CompactCityPoi; onClose: () => void }) {
  const g       = groupOf(poi.category);
  const cfg     = GROUP_CFG[g];
  const osmUrl  = `https://www.openstreetmap.org/${poi.osmType}/${poi.osmId}`;
  const entries = Object.entries(poi.tags);
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a1322] p-4 text-slate-200">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{cfg.emoji}</span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold" style={{ color: cfg.color }}>
              {poi.name ?? cfg.label}
            </p>
            <p className="text-[9px] text-slate-500">
              {poi.label} · {poi.distM} m (~{Math.round(poi.distM / 67)} perc gyalog)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md border border-white/[0.08] px-2 py-0.5 text-[10px] font-bold text-slate-400 hover:bg-white/[0.05] hover:text-slate-200 transition-colors"
        >
          ×
        </button>
      </div>

      <div className="mb-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-2 max-h-56 overflow-y-auto">
        {entries.length === 0 ? (
          <p className="text-[9px] text-slate-600">Nincs OSM tag.</p>
        ) : (
          <table className="w-full text-[9px]">
            <tbody>
              {entries.map(([k, v]) => (
                <tr key={k} className="border-b border-white/[0.04] last:border-0">
                  <td className="py-1 pr-2 font-bold text-slate-500 align-top">{k}</td>
                  <td className="py-1 text-slate-300 break-all">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <a
        href={osmUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] px-2 py-1 text-[9px] font-bold text-sky-400 hover:bg-sky-500/10 transition-colors"
      >
        OSM-ben megnyitás ↗
      </a>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  buildingLat:               number;
  buildingLon:               number;
  pois:                      CompactCityPoi[];
  /** When set, the map's filter chips start with ONLY these groups active.
   *  `null` / `undefined` means "all groups active" (default behaviour). */
  initialFilterGroups?:      Set<CatGroup> | null;
  /** When set, after mount the map zooms to this POI and opens its popup
   *  (the right-hand detail card). Changing the value re-applies the effect. */
  zoomToPoiId?:              number | null;
  /** When set, the map renders ONLY this single POI (all others hidden).
   *  Filter chips are hidden in single-POI mode. */
  singlePoiOsmId?:           number | null;
  theme?:                    MapTheme;
}

export default function CompactCityMap({
  buildingLat, buildingLon, pois, initialFilterGroups, zoomToPoiId, singlePoiOsmId, theme: themeProp,
}: Props) {
  const themeFromHook = useMapTheme();
  const theme = themeProp ?? themeFromHook;
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef       = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef   = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRefs    = useRef<Record<CatGroup, any>>({} as Record<CatGroup, any>);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRefs   = useRef<Record<number, any>>({});
  const [mapReady, setMapReady]       = useState(false);
  const [activeGroups, setActiveGroups] = useState<Set<CatGroup>>(
    initialFilterGroups && initialFilterGroups.size > 0
      ? new Set(initialFilterGroups)
      : new Set(ALL_GROUPS),
  );
  const [selected, setSelected]         = useState<CompactCityPoi | null>(null);

  // If the parent updates the requested initial filter groups (e.g. user
  // clicked a different "Nearest" card while already on the map view), sync
  // the active-group state so the chips reflect the new selection.
  useEffect(() => {
    if (initialFilterGroups && initialFilterGroups.size > 0) {
      setActiveGroups(new Set(initialFilterGroups));
    } else if (initialFilterGroups === null) {
      setActiveGroups(new Set(ALL_GROUPS));
    }
  }, [initialFilterGroups]);

  // Per-group counts (re-used by filter chips + stats)
  const counts = useMemo(() => {
    const c: Record<CatGroup, number> = {
      food:0, health:0, education:0, dining:0, culture:0, sport:0, services:0, safety:0,
    };
    for (const p of pois) c[groupOf(p.category)]++;
    return c;
  }, [pois]);

  // ── Map init — runs only when building location changes ──────────────────
  useEffect(() => {
    if (!document.getElementById('compact-map-css')) {
      const s = document.createElement('style');
      s.id = 'compact-map-css'; s.textContent = COMPACT_MAP_CSS;
      document.head.appendChild(s);
    }

    let destroyed = false;
    (async () => {
      const L = await import('leaflet');
      if (destroyed || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        center: [buildingLat, buildingLon], zoom: 15,
        zoomControl: true, attributionControl: true,
      });

      L.tileLayer(theme.tileUrl, {
        attribution: theme.attribution,
        maxZoom: 19,
      }).addTo(map);

      // Building marker — star pin
      L.marker([buildingLat, buildingLon], {
        icon: L.divIcon({
          html: buildingSvg(), className: 'compact-bldg-pin',
          iconSize: [34, 34], iconAnchor: [17, 17],
        }),
        zIndexOffset: 1000,
      }).bindTooltip('<b>Az épület</b>', { sticky: false }).addTo(map);

      // Empty layer-groups per category
      for (const g of ALL_GROUPS) {
        layerRefs.current[g] = L.layerGroup().addTo(map);
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

  // ── Render POI markers — updates layers when `pois` or singlePoiOsmId change
  useEffect(() => {
    const L = leafletRef.current;
    if (!mapReady || !L) return;

    for (const g of ALL_GROUPS) {
      const group = layerRefs.current[g];
      if (group) group.clearLayers();
    }
    markerRefs.current = {};

    // In single-POI mode, render ONLY that one POI so the map stays focused.
    const poisToRender = singlePoiOsmId != null
      ? pois.filter(p => p.osmId === singlePoiOsmId)
      : pois;

    for (const poi of poisToRender) {
      const g    = groupOf(poi.category);
      const cfg  = GROUP_CFG[g];
      const grp  = layerRefs.current[g];
      if (!grp) continue;
      const marker = L.marker([poi.lat, poi.lon], {
        icon: L.divIcon({
          html: poiSvg(cfg.color, cfg.emoji), className: 'compact-poi-pin',
          iconSize: [26, 26], iconAnchor: [13, 26],
        }),
      });
      marker.bindTooltip(
        `<div style="font-size:10px;max-width:180px">
          <b>${(poi.name ?? cfg.label).replace(/</g, '&lt;')}</b>
          <br/><span style="color:#94a3b8">${poi.label} · ${poi.distM} m</span>
        </div>`,
        { sticky: true, direction: 'top' },
      );
      marker.on('click', () => setSelected(poi));
      marker.addTo(grp);
      markerRefs.current[poi.osmId] = marker;
    }
  }, [mapReady, pois, singlePoiOsmId]);

  // ── Zoom to a specific POI + open its detail card ────────────────────────
  // Triggered when the parent panel asks us to focus a single POI (typically
  // because the user clicked one of the "Legközelebbi" cards). We zoom in,
  // pop the tooltip, AND open the right-hand detail card so the user can
  // immediately read the full OSM tag table.
  useEffect(() => {
    if (!mapReady || zoomToPoiId == null) return;
    const map = mapRef.current;
    if (!map) return;
    const poi = pois.find(p => p.osmId === zoomToPoiId);
    if (!poi) return;
    map.setView([poi.lat, poi.lon], 17, { animate: true });
    const marker = markerRefs.current[zoomToPoiId];
    if (marker && typeof marker.openTooltip === 'function') {
      // Defer so the layer is definitely visible (filter effect may have
      // just (re-)added the group) and the pan animation has started.
      setTimeout(() => { try { marker.openTooltip(); } catch { /* noop */ } }, 250);
    }
    setSelected(poi);
  }, [mapReady, zoomToPoiId, pois]);

  // ── Toggle category layers ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    for (const g of ALL_GROUPS) {
      const layer = layerRefs.current[g];
      if (!layer) continue;
      if (activeGroups.has(g)) { if (!map.hasLayer(layer)) layer.addTo(map); }
      else                     { if (map.hasLayer(layer))  map.removeLayer(layer); }
    }
  }, [mapReady, activeGroups]);

  function toggleGroup(g: CatGroup) {
    setActiveGroups(prev => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else             next.add(g);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Filter chips — hidden in single-POI mode (the category is irrelevant) */}
      {singlePoiOsmId == null && (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mr-1">Kategóriák:</span>
        {ALL_GROUPS.map(g => {
          const cfg    = GROUP_CFG[g];
          const active = activeGroups.has(g);
          const count  = counts[g];
          if (count === 0) return null;
          return (
            <button
              key={g}
              type="button"
              onClick={() => toggleGroup(g)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold transition-all duration-150 cursor-pointer ${
                active ? 'text-white' : 'text-slate-500 bg-white/[0.04] border border-white/[0.08]'
              }`}
              style={active ? { background: cfg.color + '28', border: `1px solid ${cfg.color}60`, color: cfg.color } : {}}
            >
              <span>{cfg.emoji}</span>
              {cfg.label}
              <span className="text-[8px] opacity-60">({count})</span>
            </button>
          );
        })}
      </div>
      )}

      {/* Map */}
      <div className="relative overflow-hidden rounded-2xl" style={{ height: 520, background: '#060c18' }}>
        <div ref={containerRef} className="absolute inset-0" />

        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[11px] text-slate-500 animate-pulse">Térkép betöltése…</p>
          </div>
        )}

        {mapReady && pois.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-[11px] text-slate-600">Nincs POI az 1,5 km-es körben</p>
          </div>
        )}
      </div>

      {/* Selected POI card */}
      {selected && (
        <PoiDetailCard poi={selected} onClose={() => setSelected(null)} />
      )}

      {/* Footer */}
      <p className="text-[8px] text-slate-700">
        {pois.length} POI az 1,5 km-es körben · Adat: OpenStreetMap Overpass · Tile: CARTO Dark
      </p>
    </div>
  );
}
