'use client';

import { useEffect, useRef, useCallback, useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { NearbyStop } from '@/app/api/transit/nearby/route';
import type { MapTheme } from '@/lib/map-theme';
import { useMapTheme } from '@/hooks/use-map-theme';
import type { VehiclePosition } from '@/app/api/transit/vehicles/route';
import type { Departure } from '@/app/api/transit/departures/route';
import type { TripShape, TripStopTime } from '@/app/api/transit/shape/route';

// ─── Style constants ──────────────────────────────────────────────────────────
const VEHICLE_COLOR: Record<string, string> = {
  SUBWAY: '#ef4444', TRAM: '#fbbf24', TROLLEYBUS: '#f87171',
  BUS: '#38bdf8', RAIL: '#a78bfa', FERRY: '#2dd4bf',
};
const STOP_COLOR: Record<string, string> = {
  SUBWAY: '#ef4444', TRAM: '#fbbf24', TROLLEYBUS: '#f87171',
  BUS: '#38bdf8', RAIL: '#a78bfa', FERRY: '#2dd4bf', CABLE_CAR: '#fbbf24',
};

const TYPE_LABEL_HU: Record<string, string> = {
  BUS: 'Busz', TRAM: 'Villamos', TROLLEYBUS: 'Trolibusz',
  SUBWAY: 'Metró', RAIL: 'HÉV / Vasút', FERRY: 'Komp',
};

// ─── Inline CSS ───────────────────────────────────────────────────────────────
const MAP_CSS = `
.bkk-popup .leaflet-popup-content-wrapper {
  background: #0f172a; color: #e2e8f0; border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.10); box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  padding: 0; overflow: hidden;
}
.bkk-popup .leaflet-popup-tip { background: #0f172a; }
.bkk-popup .leaflet-popup-content { margin: 0; width: auto !important; }
.bkk-dep-row {
  display:flex; align-items:center; gap:6px; padding:5px 0;
  border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer;
  transition: background 0.12s;
}
.bkk-dep-row:last-child { border-bottom:none; }
.bkk-dep-row:hover { background: rgba(255,255,255,0.05); border-radius:6px; }
.bkk-route-badge {
  display:inline-flex; align-items:center; justify-content:center;
  min-width:32px; padding:2px 6px; border-radius:6px;
  font-size:11px; font-weight:900; cursor:pointer; border:none;
  transition: opacity 0.15s, transform 0.15s; white-space:nowrap;
}
.bkk-route-badge:hover { opacity:0.85; transform:scale(1.08); }
.bkk-stop-pin { background:none!important; border:none!important; }
.bkk-a11y { font-size:10px; opacity:0.75; flex-shrink:0; }
.bkk-alert-dot { color:#f97316; font-size:10px; flex-shrink:0; }
.bkk-rt-dot { width:6px; height:6px; border-radius:50%; background:#34d399; flex-shrink:0; animation: bkk-blink 1.4s ease-in-out infinite; }
@keyframes bkk-blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
.bkk-updated { font-size:8px; color:#475569; }
.bkk-updated b { color:#64748b; }
`;

// ─── SVG icon factories ────────────────────────────────────────────────────────
function vehicleSvg(color: string, bearing?: number, vehicleType?: string, routeRef?: string): string {
  const rot    = bearing ?? 0;
  const label  = (routeRef ?? '').substring(0, 5);
  const len    = label.length;
  const tColor = color === '#fbbf24' ? '#1a0a00' : '#ffffff';
  const strokeW = vehicleType === 'SUBWAY' ? '2.5' : vehicleType === 'TRAM' ? '2' : '1.2';
  const glow    = `<circle cx="20" cy="20" r="18" fill="${color}" fill-opacity="0.18"/>`;
  const arrow   = bearing != null
    ? `<polygon points="20,1 24.5,11.5 20,9.5 15.5,11.5" fill="${color}" fill-opacity="0.9" transform="rotate(${rot} 20 20)"/>`
    : '';

  // For 4+ char labels: use a pill/rect shape that's wider to avoid text overflow
  if (len >= 4) {
    const w = len === 4 ? 40 : 46;
    const fSize = len === 4 ? 8.5 : 7.5;
    const fY = '23';
    const rx = 8;
    const pillGlow  = `<rect x="1" y="6" width="${w-2}" height="28" rx="10" fill="${color}" fill-opacity="0.18"/>`;
    const pillArrow = bearing != null
      ? `<polygon points="${w/2},0 ${w/2+4},8 ${w/2},6 ${w/2-4},8" fill="${color}" fill-opacity="0.85" transform="rotate(${rot} ${w/2} 20)"/>`
      : '';
    const pill      = `<rect x="4" y="9" width="${w-8}" height="22" rx="${rx}" fill="${color}" stroke="rgba(255,255,255,0.35)" stroke-width="${strokeW}"/>`;
    const txt       = `<text x="${w/2}" y="${fY}" text-anchor="middle" dominant-baseline="middle" fill="${tColor}" font-size="${fSize}" font-weight="900" font-family="Arial,Helvetica,sans-serif">${label}</text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="40" viewBox="0 0 ${w} 40">${pillGlow}${pillArrow}${pill}${txt}</svg>`;
  }

  const fSize  = len <= 2 ? 13 : len === 3 ? 10.5 : 9;
  const fY     = (20 + fSize * 0.38).toFixed(1);
  const disc    = `<circle cx="20" cy="20" r="13" fill="${color}" stroke="rgba(255,255,255,0.35)" stroke-width="${strokeW}"/>`;
  const text    = label
    ? `<text x="20" y="${fY}" text-anchor="middle" fill="${tColor}" font-size="${fSize}" font-weight="900" font-family="Arial,Helvetica,sans-serif">${label}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">${glow}${arrow}${disc}${text}</svg>`;
}

// ─── Stop icon (type-specific) ────────────────────────────────────────────────
function stopIconSvg(color: string, vehicleType: string): string {
  const tc = color === '#fbbf24' ? '#1a0a00' : '#ffffff';
  const glyphs: Record<string, string> = {
    SUBWAY:    'M', TRAM: 'V', TROLLEYBUS: 'T',
    BUS: 'B',  RAIL: 'H', FERRY: 'F', CABLE_CAR: 'D',
  };
  const g = glyphs[vehicleType] ?? 'B';

  if (vehicleType === 'SUBWAY') {
    // Circle for metro
    return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="10" fill="${color}" stroke="white" stroke-width="1.8"/><text x="11" y="15.5" text-anchor="middle" fill="${tc}" font-size="11" font-weight="900" font-family="Arial,sans-serif">${g}</text></svg>`;
  }
  if (vehicleType === 'RAIL') {
    // Wider rectangle for rail
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="18" viewBox="0 0 24 18"><rect x="1" y="1" width="22" height="16" rx="3" fill="${color}" stroke="white" stroke-width="1.6"/><text x="12" y="13" text-anchor="middle" fill="${tc}" font-size="10" font-weight="900" font-family="Arial,sans-serif">${g}</text></svg>`;
  }
  // Rounded square for bus / tram / trolley
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect x="1" y="1" width="18" height="18" rx="4" fill="${color}" stroke="white" stroke-width="1.6"/><text x="10" y="14" text-anchor="middle" fill="${tc}" font-size="11" font-weight="900" font-family="Arial,sans-serif">${g}</text></svg>`;
}

function buildingSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
    <circle cx="15" cy="15" r="13" fill="#6366f1" fill-opacity="0.18" stroke="#6366f1" stroke-width="1.8"/>
    <circle cx="15" cy="15" r="5.5" fill="#6366f1"/>
  </svg>`;
}


// ─── Polyline gap detection + split ───────────────────────────────────────────
// Shape data sometimes contains a "deadhead" or positioning move segment where
// the vehicle drives from the last stop to a depot, or from a depot to the first
// stop. This creates a long straight-line artifact on the map that visually
// "closes" the route into a loop.
// Fix: split the polyline into separate segments wherever consecutive points are
// more than maxGapM metres apart, and render each segment independently.
function shapeGapDistM(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = (a.lat - b.lat) * 111_320;
  const dLon = (a.lon - b.lon) * 111_320 * Math.cos(a.lat * Math.PI / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

function splitShapeAtGaps(
  points: { lat: number; lon: number }[],
  maxGapM = 1_000,
): { lat: number; lon: number }[][] {
  if (points.length < 2) return points.length === 1 ? [[points[0]]] : [];
  const segs: { lat: number; lon: number }[][] = [];
  let cur: { lat: number; lon: number }[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    if (shapeGapDistM(points[i - 1], points[i]) > maxGapM) {
      if (cur.length >= 2) segs.push(cur);
      cur = [];
    }
    cur.push(points[i]);
  }
  if (cur.length >= 2) segs.push(cur);
  return segs;
}

// ─── HTML escape helper (prevents XSS in popup innerHTML) ────────────────────
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Stop code helper ─────────────────────────────────────────────────────────
function stopCode(stopId: string): string {
  // BKK_F090482 → #090482, BKK_090482 → #090482
  const m = stopId.match(/BKK_F?0*(\d+)/);
  return m ? `#${m[1]}` : '';
}

// ─── Route badge color ────────────────────────────────────────────────────────
function routeBadgeStyle(dep: Departure): { bg: string; textColor: string } {
  const col = VEHICLE_COLOR[dep.vehicle] ?? '#64748b';
  return { bg: col, textColor: col === '#fbbf24' ? '#78350f' : '#fff' };
}

// ─── Departure popup HTML ─────────────────────────────────────────────────────
function buildPopupHtml(
  stop: NearbyStop,
  deps: Departure[] | null,
  alertRouteSet: Set<string>,
  fetchedAt: Date | null,
): string {
  const code    = stopCode(stop.id);
  const timeStr = fetchedAt
    ? fetchedAt.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  // Route badges — all routes served at this stop, grouped and colored
  const routeBadges = stop.routeRefs.slice(0, 10).map(r => {
    const dep  = deps?.find(d => d.routeRef === r);
    const col  = dep ? (VEHICLE_COLOR[dep.vehicle] ?? '#334155') : '#334155';
    const text = col === '#fbbf24' ? '#78350f' : '#fff';
    return `<span class="bkk-route-badge" data-route="${r}" style="background:${col};color:${text}">${r}</span>`;
  }).join('');

  // Departure rows
  let depsHtml = '';
  if (!deps) {
    depsHtml = '<div style="color:#64748b;font-size:10px;padding:6px 0">Betöltés…</div>';
  } else if (deps.length === 0) {
    depsHtml = '<div style="color:#64748b;font-size:10px;padding:6px 0">Nincs indulási adat</div>';
  } else {
    depsHtml = deps.slice(0, 8).map(d => {
      const { bg, textColor } = routeBadgeStyle(d);
      const min = d.minutesAway <= 0
        ? `<span style="color:#34d399;font-weight:900;font-size:11px">◆ Indul</span>`
        : `<span style="font-size:13px;font-weight:900;color:${d.realtime ? '#34d399' : '#94a3b8'}">${d.minutesAway}</span><span style="font-size:9px;color:#475569">&thinsp;p</span>`;
      const rtDot = d.realtime ? `<span class="bkk-rt-dot"></span>` : '';
      const a11y  = d.accessible ? `<span class="bkk-a11y" title="Alacsonypadlós jármű">♿</span>` : '';
      const alert = (d.hasAlert || alertRouteSet.has(d.routeRef))
        ? `<span class="bkk-alert-dot" title="Aktív üzemzavar">⚠</span>` : '';
      const tripAttr = d.tripId ? `data-tripid="${d.tripId}" data-route="${d.routeRef}" data-color="${bg}" data-headsign="${esc(d.headsign ?? '')}"` : '';
      return `<div class="bkk-dep-row" ${tripAttr}>
        <span class="bkk-route-badge" style="background:${bg};color:${textColor};min-width:36px;pointer-events:none">${esc(d.routeRef)}</span>
        ${alert}${a11y}
        <span style="flex:1;font-size:10px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(d.headsign ?? '')}</span>
        <span style="display:flex;align-items:center;gap:3px">${min}${rtDot}</span>
      </div>`;
    }).join('');
  }

  // Travel links (BKK Futár routing deep links)
  const bkkId = stop.id.replace(/^BKK_/, '');
  const fromLink = `https://futar.bkk.hu/?from=${encodeURIComponent(stop.id)}`;
  const toLink   = `https://futar.bkk.hu/?to=${encodeURIComponent(stop.id)}`;

  return `<div style="padding:12px 14px;min-width:230px;max-width:310px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:4px">
      <div style="font-weight:900;font-size:13px;color:#f1f5f9;line-height:1.2">${stop.name}</div>
      ${timeStr ? `<div class="bkk-updated" style="flex-shrink:0">Frissítve<br/><b>${timeStr}</b></div>` : ''}
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:9px;color:#475569">${code}</span>
      <a href="${fromLink}" target="_blank" rel="noopener" style="font-size:9px;color:#38bdf8;text-decoration:none">Innen indulok</a>
      <a href="${toLink}"   target="_blank" rel="noopener" style="font-size:9px;color:#38bdf8;text-decoration:none">Ide megyek</a>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">${routeBadges}</div>
    <div class="bkk-departures-list">${depsHtml}</div>
    <div style="font-size:8px;color:#1e293b;margin-top:6px">${stop.distanceM} m tőlünk · BKK ID: ${bkkId}</div>
  </div>`;
}

// ─── Imperative handle ────────────────────────────────────────────────────────
export interface TransitLiveMapHandle {
  flyToBuilding: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props { lat: number; lon: number; stops: NearbyStop[]; alertRoutes?: string[]; theme?: MapTheme; }

const TransitLiveMapInner = forwardRef<TransitLiveMapHandle, Props>(
  function TransitLiveMapInner({ lat, lon, stops, alertRoutes, theme: themeProp }, ref) {
    const themeFromHook = useMapTheme();
    const theme = themeProp ?? themeFromHook;
    const containerRef    = useRef<HTMLDivElement>(null);
    const mapRef          = useRef<unknown>(null);
    const vehicleLayer    = useRef<unknown>(null);
    const shapeLayer      = useRef<unknown>(null);
    const stopLayerRef    = useRef<unknown>(null);
    const tripStopLayer   = useRef<unknown>(null);
    const stopMarkersRef  = useRef<Map<string, unknown>>(new Map());
    const mapCenterRef    = useRef<{ lat: number; lon: number }>({ lat, lon });
    const [vehicleCount,       setVehicleCount]       = useState<number | null>(null);
    const [lastUpdate,         setLastUpdate]          = useState<Date | null>(null);
    const [showStops,          setShowStops]           = useState(true);
    const [showVehicles,       setShowVehicles]        = useState(true);
    const [isPanned,           setIsPanned]            = useState(false);
    const [isRefreshingStops,  setIsRefreshingStops]   = useState(false);
    // Active trip info panel (shown after clicking a departure)
    const [tripInfo, setTripInfo] = useState<{
      routeRef: string; color: string; headsign: string;
      vehicleId?: string; vehicleModel?: string;
      accessible?: boolean;
      directionId?: number;
      stopTimes?: TripStopTime[];
    } | null>(null);

    const alertRouteSet = useMemo(() => new Set<string>(alertRoutes ?? []), [alertRoutes]);

    useImperativeHandle(ref, () => ({
      flyToBuilding: () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const map = mapRef.current as any;
        if (map) map.flyTo([lat, lon], 15, { animate: true, duration: 0.8 });
      },
    }), [lat, lon]);

    const toggleStops = useCallback(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = mapRef.current as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sl  = stopLayerRef.current as any;
      if (!map || !sl) return;
      setShowStops(v => {
        if (v) { sl.remove(); } else { sl.addTo(map); }
        return !v;
      });
    }, []);

    const toggleVehicles = useCallback(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = mapRef.current as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vl  = vehicleLayer.current as any;
      if (!map || !vl) return;
      setShowVehicles(v => {
        if (v) { vl.remove(); } else { vl.addTo(map); }
        return !v;
      });
    }, []);

    // ── Draw trip shape + show vehicle panel ─────────────────────────────────
    const drawShape = useCallback(async (tripId: string, routeRef: string, color: string, headsign: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L   = (window as any).L as typeof import('leaflet');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sl  = shapeLayer.current as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = mapRef.current as any;
      if (!L || !sl || !map) return;

      sl.clearLayers();
      setTripInfo({ routeRef, color, headsign });
      // Hide all vehicles while a specific trip is focused
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vl = vehicleLayer.current as any;
      if (vl) { try { vl.remove(); } catch { /* ignore */ } }

      try {
        const sr = await fetch(`/api/transit/shape?tripId=${encodeURIComponent(tripId)}`);
        const sd = await sr.json() as TripShape;

        if (sd.points?.length > 0) {
          // Split at gaps > 1 km — removes deadhead / depot positioning moves
          // that create a long straight line "closing" the route on the map.
          const segments = splitShapeAtGaps(sd.points);
          const allRendered: [number, number][] = [];
          for (const seg of segments) {
            const latlngs = seg.map((p): [number, number] => [p.lat, p.lon]);
            L.polyline(latlngs, {
              color: sd.color ?? color,
              weight: 5, opacity: 0.9,
            }).addTo(sl);
            allRendered.push(...latlngs);
          }
          if (allRendered.length > 0) {
            map.fitBounds(L.polyline(allRendered).getBounds(), { padding: [40, 40] });
          }
        }

        const routeColor = sd.color || color;

        // Show trip stops on map, hide regular stops
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const oldTripLayer = tripStopLayer.current as any;
        if (oldTripLayer) { try { oldTripLayer.remove(); } catch { /* ignore */ } }

        if (sd.stopTimes && sd.stopTimes.length > 0) {
          // Hide regular stop layer
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const regularLayer = stopLayerRef.current as any;
          if (regularLayer) { try { regularLayer.remove(); } catch { /* ignore */ } }

          const tsl = L.layerGroup().addTo(map);
          tripStopLayer.current = tsl;

          for (const st of sd.stopTimes) {
            if (!st.lat || !st.lon) continue;
            L.circleMarker([st.lat, st.lon], {
              radius: 5, fillColor: routeColor, fillOpacity: 1, color: 'white', weight: 1.5,
            })
              .bindTooltip(
                `<div style="font-size:11px"><b>${st.stopName}</b><br/><span style="color:#94a3b8;font-size:9px">${st.timeStr}</span></div>`,
                { sticky: true, direction: 'top' }
              )
              .addTo(tsl);
          }
        }

        setTripInfo({
          routeRef:    sd.routeRef || routeRef,
          color:       routeColor,
          headsign:    sd.headsign || headsign,
          vehicleId:   sd.vehicleId,
          vehicleModel:sd.vehicleModel,
          accessible:  sd.accessible,
          directionId: sd.directionId,
          stopTimes:   sd.stopTimes,
        });
      } catch { /* shape draw failure is silent */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Show departures popup ─────────────────────────────────────────────────
    const showDepartures = useCallback(async (stop: NearbyStop, marker: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = marker as any;
      const fetchedAt = new Date();

      m.setPopupContent(buildPopupHtml(stop, null, alertRouteSet, fetchedAt)).openPopup();

      try {
        const res  = await fetch(`/api/transit/departures?stopId=${encodeURIComponent(stop.id)}`);
        const data = await res.json() as { departures: Departure[] };
        const deps: Departure[] = data?.departures ?? [];
        const now = new Date();
        m.setPopupContent(buildPopupHtml(stop, deps, alertRouteSet, now));

        // Leaflet updates popup DOM asynchronously — wait one frame before
        // querying for departure rows to attach the shape-draw click handlers
        setTimeout(() => {
          const popupEl = m.getPopup()?.getElement() as HTMLElement | null;
          if (!popupEl) return;

          popupEl.querySelectorAll<HTMLElement>('.bkk-dep-row[data-tripid]').forEach(el => {
            el.addEventListener('click', (e) => {
              e.stopPropagation();
              const tripId   = el.dataset.tripid ?? '';
              const route    = el.dataset.route   ?? '';
              const color    = el.dataset.color   ?? '#38bdf8';
              const headsign = el.dataset.headsign ?? '';
              if (tripId) drawShape(tripId, route, color, headsign);
            });
          });
        }, 60);
      } catch { /* departure fetch failure — leave loading state */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [alertRouteSet, drawShape]);

    // ── Refresh stops covering the full viewport + 5 km pre-cache buffer ────
    const refreshStopsAt = useCallback(async (newLat: number, newLon: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L as typeof import('leaflet') | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stopLayer = stopLayerRef.current as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = mapRef.current as any;
      if (!L || !stopLayer) return;

      // Compute span from current viewport bounds + ~5 km buffer on each edge
      // 0.09 lat ≈ 10 km N-S, 0.13 lon ≈ 10 km E-W at Budapest latitude
      let latSpan = 0.07;
      let lonSpan = 0.10;
      if (map) {
        try {
          const b = map.getBounds();
          latSpan = (b.getNorth() - b.getSouth()) + 0.09;
          lonSpan = (b.getEast()  - b.getWest())  + 0.13;
        } catch { /* keep defaults */ }
      }

      setIsRefreshingStops(true);
      try {
        const res  = await fetch(
          `/api/transit/nearby?lat=${newLat}&lon=${newLon}&latSpan=${latSpan.toFixed(4)}&lonSpan=${lonSpan.toFixed(4)}`
        );
        const data = await res.json() as { stops: NearbyStop[] };
        const newStops: NearbyStop[] = data?.stops ?? [];

        stopLayer.clearLayers();
        stopMarkersRef.current = new Map();

        for (const stop of newStops) {
          if (stop.lat == null || stop.lon == null || isNaN(stop.lat) || isNaN(stop.lon)) continue;
          const color     = STOP_COLOR[stop.routeType] ?? '#64748b';
          const routes    = stop.routeRefs.slice(0, 5).join(' · ');
          const typeLabel = TYPE_LABEL_HU[stop.routeType] ?? stop.routeType;
          const iconW     = stop.routeType === 'RAIL' ? 24 : stop.routeType === 'SUBWAY' ? 22 : 20;
          const iconH     = stop.routeType === 'RAIL' ? 18 : 20;
          const marker = L.marker([stop.lat, stop.lon], {
            icon: L.divIcon({
              html:       stopIconSvg(color, stop.routeType),
              className:  'bkk-stop-pin',
              iconSize:   [iconW, iconH],
              iconAnchor: [iconW / 2, iconH / 2],
              popupAnchor:[0, -iconH / 2 - 2],
            }),
            zIndexOffset: 50,
          })
            .bindTooltip(
              `<div style="font-size:11px"><b>${stop.name}</b> <span style="color:#64748b;font-size:9px">${stopCode(stop.id)}</span><br/><span style="color:#94a3b8;font-size:9px">${typeLabel} · ${routes} · ${stop.distanceM} m</span></div>`,
              { sticky: true, direction: 'top' }
            )
            .bindPopup('', { className: 'bkk-popup', maxWidth: 330, minWidth: 230 })
            .addTo(stopLayer);

          marker.on('click', () => showDepartures(stop, marker));
          stopMarkersRef.current.set(stop.id, marker);
        }
      } catch { /* stop refresh failure is silent */ }

      setIsRefreshingStops(false);
    }, [showDepartures]);

    const refreshStopsAtRef = useRef(refreshStopsAt);
    useEffect(() => { refreshStopsAtRef.current = refreshStopsAt; }, [refreshStopsAt]);

    // ── Vehicle poll ──────────────────────────────────────────────────────────
    const refreshVehicles = useCallback(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L   = (window as any).L as typeof import('leaflet');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lyr = vehicleLayer.current as any;
      if (!L || !lyr) return;

      const { lat: cLat, lon: cLon } = mapCenterRef.current;

      try {
        const res  = await fetch(`/api/transit/vehicles?lat=${cLat}&lon=${cLon}`);
        const data = await res.json() as { vehicles: VehiclePosition[]; source: string };
        lyr.clearLayers();
        if (data.source === 'mock' || !data.vehicles?.length) { setVehicleCount(0); return; }

        for (const v of data.vehicles) {
          const color = VEHICLE_COLOR[v.vehicle] ?? '#94a3b8';
          const badgeTextColor = color === '#fbbf24' ? '#1a0a00' : '#fff';
          L.marker([v.lat, v.lon], {
            icon: L.divIcon({ html: vehicleSvg(color, v.bearing, v.vehicle, v.routeRef), className: '', iconSize: [(v.routeRef?.length ?? 0) >= 4 ? ((v.routeRef?.length ?? 0) >= 5 ? 46 : 40) : 40, 40], iconAnchor: [(v.routeRef?.length ?? 0) >= 4 ? ((v.routeRef?.length ?? 0) >= 5 ? 23 : 20) : 20, 20], popupAnchor: [0,-20] }),
            zIndexOffset: 100,
          })
            .bindTooltip(
              `<div style="font-size:10px;line-height:1.5">` +
              `<div style="display:flex;align-items:center;gap:5px;margin-bottom:2px">` +
              `<span style="background:${color};color:${badgeTextColor};padding:1px 7px;border-radius:5px;font-weight:900;font-size:12px">${v.routeRef}</span>` +
              `<span style="color:#64748b;font-size:9px">${TYPE_LABEL_HU[v.vehicle] ?? v.vehicle}</span>` +
              `</div>` +
              (v.headsign ? `<div style="color:#cbd5e1;max-width:210px">${esc(v.headsign)}</div>` : '') +
              (v.realtime ? `<div style="color:#34d399;font-size:8px;margin-top:2px">● Valós idejű</div>` : '') +
              `</div>`,
              { sticky: true }
            )
            .on('click', () => {
              // Clicking a live vehicle draws its route shape
              if (v.tripId) {
                drawShape(v.tripId, v.routeRef, color, v.headsign ?? '');
              }
            })
            .addTo(lyr);
        }
        setVehicleCount(data.vehicles.length);
        setLastUpdate(new Date());
      } catch { setVehicleCount(0); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [drawShape]);

    // ── Map init ──────────────────────────────────────────────────────────────
    useEffect(() => {
      if (!document.getElementById('bkk-map-css')) {
        const s = document.createElement('style');
        s.id = 'bkk-map-css';
        s.textContent = MAP_CSS;
        document.head.appendChild(s);
      }

      let interval: ReturnType<typeof setInterval>;
      let moveTimer: ReturnType<typeof setTimeout>;
      let destroyed = false;

      (async () => {
        const L = await import('leaflet');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).L = L;

        if (destroyed || !containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
          center: [lat, lon], zoom: 15,
          zoomControl: true, attributionControl: true,
        });

        L.tileLayer(theme.tileUrl, {
          attribution: theme.attribution,
          maxZoom: 19,
        }).addTo(map);

        // Building marker
        L.marker([lat, lon], {
          icon: L.divIcon({ html: buildingSvg(), className: '', iconSize: [30,30], iconAnchor: [15,15], popupAnchor: [0,-17] }),
          zIndexOffset: 200,
        })
          .bindTooltip('<b>Az épület</b>', { sticky: false })
          .addTo(map);

        // Stop layer
        const stopLayer = L.layerGroup().addTo(map);
        stopLayerRef.current = stopLayer;

        const stopMarkers = new Map<string, unknown>();
        for (const stop of stops) {
          if (stop.lat == null || stop.lon == null || isNaN(stop.lat) || isNaN(stop.lon)) continue;
          const color     = STOP_COLOR[stop.routeType] ?? '#64748b';
          const routes    = stop.routeRefs.slice(0, 5).join(' · ');
          const typeLabel = TYPE_LABEL_HU[stop.routeType] ?? stop.routeType;
          const iconW     = stop.routeType === 'RAIL' ? 24 : stop.routeType === 'SUBWAY' ? 22 : 20;
          const iconH     = stop.routeType === 'RAIL' ? 18 : 20;
          const marker = L.marker([stop.lat, stop.lon], {
            icon: L.divIcon({
              html:       stopIconSvg(color, stop.routeType),
              className:  'bkk-stop-pin',
              iconSize:   [iconW, iconH],
              iconAnchor: [iconW / 2, iconH / 2],
              popupAnchor:[0, -iconH / 2 - 2],
            }),
            zIndexOffset: 50,
          })
            .bindTooltip(
              `<div style="font-size:11px"><b>${stop.name}</b> <span style="color:#64748b;font-size:9px">${stopCode(stop.id)}</span><br/><span style="color:#94a3b8;font-size:9px">${typeLabel} · ${routes} · ${stop.distanceM} m</span></div>`,
              { sticky: true, direction: 'top' }
            )
            .bindPopup('', { className: 'bkk-popup', maxWidth: 330, minWidth: 230 })
            .addTo(stopLayer);

          marker.on('click', () => showDepartures(stop, marker));
          stopMarkers.set(stop.id, marker);
        }
        stopMarkersRef.current = stopMarkers;

        const vLayer = L.layerGroup().addTo(map);
        const sLayer = L.layerGroup().addTo(map);
        vehicleLayer.current = vLayer;
        shapeLayer.current   = sLayer;
        mapRef.current       = map;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTimeout(() => { if (mapRef.current) (mapRef.current as any).invalidateSize(); }, 300);

        map.on('moveend', () => {
          clearTimeout(moveTimer);
          moveTimer = setTimeout(() => {
            const c = map.getCenter();
            mapCenterRef.current = { lat: c.lat, lon: c.lng };
            const diffLat = Math.abs(c.lat - lat);
            const diffLon = Math.abs(c.lng - lon);
            setIsPanned(diffLat > 0.01 || diffLon > 0.01);
            refreshStopsAtRef.current(c.lat, c.lng);
          }, 800);
        });

        await refreshVehicles();
        interval = setInterval(refreshVehicles, 15_000);
      })();

      return () => {
        destroyed = true;
        clearInterval(interval);
        clearTimeout(moveTimer);
        if (mapRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (mapRef.current as any).remove();
          mapRef.current = null;
        }
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lat, lon, theme.id]);

    const clearTrip = useCallback(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sl = shapeLayer.current as any;
      if (sl) sl.clearLayers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tsl = tripStopLayer.current as any;
      if (tsl) { try { tsl.remove(); } catch { /* ignore */ } tripStopLayer.current = null; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = mapRef.current as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const regularLayer = stopLayerRef.current as any;
      if (map && regularLayer && showStops) { try { regularLayer.addTo(map); } catch { /* ignore */ } }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vl = vehicleLayer.current as any;
      if (map && vl && showVehicles) { try { vl.addTo(map); } catch { /* ignore */ } }
      setTripInfo(null);
    }, [showStops, showVehicles]);

    const timeStr = lastUpdate
      ? lastUpdate.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : null;

    return (
      <div className="flex flex-col gap-1.5">
        <div className="relative">
          <div
            ref={containerRef}
            className="h-[520px] w-full overflow-hidden rounded-2xl"
            style={{ background: '#1e293b' }}
          />

          {/* Layer toggles + back-to-building (right column) */}
          <div className="absolute right-2 top-2 z-[1000] flex flex-col gap-1">
            <button
              onClick={toggleStops}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/90 px-2.5 py-1 text-[9px] font-black backdrop-blur-sm transition-all hover:bg-slate-800/90"
              style={{ color: showStops ? '#38bdf8' : '#64748b' }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full transition-colors"
                style={{ background: showStops ? '#38bdf8' : '#475569' }} />
              Megállók
            </button>
            <button
              onClick={toggleVehicles}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/90 px-2.5 py-1 text-[9px] font-black backdrop-blur-sm transition-all hover:bg-slate-800/90"
              style={{ color: showVehicles ? '#34d399' : '#64748b' }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full transition-colors"
                style={{ background: showVehicles ? '#34d399' : '#475569' }} />
              Járművek
            </button>
            {isPanned && (
              <button
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900/90 px-2.5 py-1 text-[9px] font-black text-indigo-400 backdrop-blur-sm transition-all hover:bg-slate-800/90"
                onClick={() => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const map = mapRef.current as any;
                  if (map) {
                    map.flyTo([lat, lon], 15, { animate: true, duration: 0.8 });
                    mapCenterRef.current = { lat, lon };
                    setIsPanned(false);
                  }
                }}
              >
                ⌖ Épületre
              </button>
            )}
          </div>

          {/* Refreshing chip */}
          {isRefreshingStops && (
            <div className="absolute left-1/2 top-2 z-[1000] -translate-x-1/2 rounded-full border border-white/10 bg-slate-900/90 px-3 py-1 text-[9px] font-bold text-sky-400 backdrop-blur-sm">
              Megállók frissítése…
            </div>
          )}

          {/* Unified trip detail panel — replaces all other route/stop overlays */}
          {tripInfo && (
            <div
              className="absolute left-2 top-2 z-[1000] flex flex-col rounded-xl overflow-hidden"
              style={{
                background: 'rgba(15,23,42,0.95)',
                border: `1px solid ${tripInfo.color}50`,
                width: '224px',
                maxHeight: 'calc(100% - 16px)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-2 px-2.5 py-2 shrink-0"
                style={{ borderBottom: `2px solid ${tripInfo.color}` }}
              >
                <span
                  className="flex h-6 min-w-[32px] items-center justify-center rounded px-1.5 text-[11px] font-black shrink-0"
                  style={{ background: tripInfo.color, color: tripInfo.color === '#fbbf24' ? '#78350f' : '#fff' }}
                >
                  {tripInfo.routeRef}
                </span>
                {/* Direction arrow — 0 = outbound →, 1 = return ← */}
                {tripInfo.directionId !== undefined && (
                  <span
                    className="shrink-0 text-[10px] font-black"
                    style={{ color: tripInfo.color }}
                    title={tripInfo.directionId === 0 ? 'Főirány' : 'Visszairány'}
                  >
                    {tripInfo.directionId === 0 ? '→' : '←'}
                  </span>
                )}
                <span className="flex-1 truncate text-[10px] font-bold text-slate-200 min-w-0">
                  {tripInfo.headsign}
                </span>
                <button
                  onClick={clearTrip}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                  title="Útvonal törlése"
                >
                  ✕
                </button>
              </div>

              {/* Vehicle info row */}
              {(tripInfo.vehicleId || tripInfo.vehicleModel || tripInfo.accessible != null) && (
                <div
                  className="flex items-center gap-2 px-2.5 py-1 text-[9px] text-slate-500 shrink-0"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <span className="flex-1 truncate">
                    {[tripInfo.vehicleId, tripInfo.vehicleModel].filter(Boolean).join('  ')}
                  </span>
                  {tripInfo.accessible && <span className="text-sky-400 shrink-0">♿</span>}
                </div>
              )}

              {/* Stop timeline */}
              <div className="overflow-y-auto flex-1">
                {/* Stop count — quick sanity check for the user */}
                {tripInfo.stopTimes && tripInfo.stopTimes.length > 0 && (
                  <div className="px-2.5 pt-1.5 pb-0.5 text-[8px] text-slate-600">
                    {tripInfo.stopTimes.length} megálló
                  </div>
                )}
                {tripInfo.stopTimes && tripInfo.stopTimes.length > 0 ? (
                  tripInfo.stopTimes.map((st, i) => {
                    const isFirst   = i === 0;
                    const isLast    = i === (tripInfo.stopTimes?.length ?? 0) - 1;
                    const isCurrent = !st.isPast && (i === 0 || (tripInfo.stopTimes?.[i - 1]?.isPast ?? true));
                    return (
                      <div
                        key={`${st.stopId}-${i}`}
                        className="flex items-stretch"
                        style={{ opacity: st.isPast ? 0.45 : 1 }}
                      >
                        {/* Timeline column */}
                        <div className="relative flex flex-col items-center shrink-0" style={{ width: 28 }}>
                          {!isFirst && (
                            <div style={{ width: 2, height: 8, background: tripInfo.color, opacity: 0.7, flexShrink: 0 }} />
                          )}
                          <div style={{
                            width:        isFirst || isLast || isCurrent ? 10 : 7,
                            height:       isFirst || isLast || isCurrent ? 10 : 7,
                            borderRadius: '50%',
                            background:   isFirst || isLast || isCurrent ? tripInfo.color : 'transparent',
                            border:       `2px solid ${tripInfo.color}`,
                            flexShrink:   0,
                            marginTop:    isFirst ? 10 : 0,
                            marginBottom: isLast  ? 10 : 0,
                          }} />
                          {!isLast && (
                            <div style={{ width: 2, flex: 1, minHeight: 8, background: tripInfo.color, opacity: 0.7, flexShrink: 0 }} />
                          )}
                        </div>
                        {/* Stop content */}
                        <div className="flex items-baseline gap-1.5 py-1.5 pr-2.5 flex-1 min-w-0">
                          <span
                            className="font-mono tabular-nums shrink-0 text-[9px]"
                            style={{ color: st.isPast ? '#475569' : '#64748b', minWidth: 30 }}
                          >
                            {st.timeStr || '—'}
                          </span>
                          <span
                            className="text-[10px] leading-tight"
                            style={{
                              color:      st.isPast ? '#475569' : isCurrent ? '#f1f5f9' : '#cbd5e1',
                              fontWeight: isCurrent ? 700 : 400,
                              wordBreak:  'break-word',
                            }}
                          >
                            {st.stopName}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-3 py-2 text-[9px] text-slate-500">
                    Megállók betöltése…
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-3">
            {([
              { color: VEHICLE_COLOR.BUS,        type: 'BUS',        label: 'Busz' },
              { color: VEHICLE_COLOR.TRAM,       type: 'TRAM',       label: 'Villamos' },
              { color: VEHICLE_COLOR.TROLLEYBUS, type: 'TROLLEYBUS', label: 'Trolibusz' },
              { color: VEHICLE_COLOR.SUBWAY,     type: 'SUBWAY',     label: 'Metró' },
              { color: VEHICLE_COLOR.RAIL,       type: 'RAIL',       label: 'HÉV/Vasút' },
              { color: '#6366f1',                type: 'BLD',        label: 'Épület' },
            ] as { color: string; type: string; label: string }[]).map(({ color, type, label }) => (
              <div key={label} className="flex items-center gap-1">
                {type === 'BLD'
                  ? <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                  : <span
                      className="flex shrink-0 items-center justify-center rounded text-[7px] font-black leading-none"
                      style={{ background: color, color: color === '#fbbf24' ? '#1a0a00' : '#fff', width: 13, height: 13, borderRadius: type === 'SUBWAY' ? '50%' : 3 }}
                    >
                      {{ BUS:'B', TRAM:'V', TROLLEYBUS:'T', SUBWAY:'M', RAIL:'H' }[type] ?? 'B'}
                    </span>
                }
                <span className="text-[9px] text-slate-500">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {vehicleCount !== null && vehicleCount > 0 && (
              <span className="text-[9px] text-emerald-600">🟢 {vehicleCount} jármű</span>
            )}
            {timeStr && <span className="text-[8px] text-slate-700">{timeStr}</span>}
          </div>
        </div>
      </div>
    );
  }
);

export default TransitLiveMapInner;
