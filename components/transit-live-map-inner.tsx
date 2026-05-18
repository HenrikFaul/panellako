'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { NearbyStop } from '@/app/api/transit/nearby/route';
import type { VehiclePosition } from '@/app/api/transit/vehicles/route';
import type { Departure } from '@/app/api/transit/departures/route';

// ─── Style constants ──────────────────────────────────────────────────────────
const VEHICLE_COLOR: Record<string, string> = {
  SUBWAY: '#ef4444', TRAM: '#fbbf24', TROLLEYBUS: '#f87171',
  BUS: '#38bdf8', RAIL: '#a78bfa', FERRY: '#2dd4bf',
};
const STOP_COLOR: Record<string, string> = {
  SUBWAY: '#ef4444', TRAM: '#d97706', TROLLEYBUS: '#f87171',
  BUS: '#64748b', RAIL: '#a78bfa', FERRY: '#2dd4bf', CABLE_CAR: '#f59e0b',
};

// ─── Inline CSS injected once ────────────────────────────────────────────────
const MAP_CSS = `
.bkk-popup .leaflet-popup-content-wrapper {
  background: #0f172a; color: #e2e8f0; border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.10); box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  padding: 0; overflow: hidden;
}
.bkk-popup .leaflet-popup-tip { background: #0f172a; }
.bkk-popup .leaflet-popup-content { margin: 0; }
.bkk-dep-row { display:flex; align-items:center; gap:8px; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
.bkk-dep-row:last-child { border-bottom:none; }
.bkk-route-badge {
  display:inline-flex; align-items:center; justify-content:center;
  min-width:32px; padding:2px 6px; border-radius:6px;
  font-size:11px; font-weight:900; cursor:pointer; border:none;
  transition: opacity 0.15s, transform 0.15s;
}
.bkk-route-badge:hover { opacity:0.85; transform:scale(1.08); }
`;

// ─── SVG icon factories ────────────────────────────────────────────────────────
function vehicleSvg(color: string, bearing?: number) {
  const rot = bearing ?? 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
    <circle cx="13" cy="13" r="9"  fill="${color}" fill-opacity="0.22"/>
    <circle cx="13" cy="13" r="5.5" fill="${color}"/>
    <polygon points="13,3 16,10 13,8.5 10,10" fill="${color}" transform="rotate(${rot} 13 13)"/>
  </svg>`;
}
function stopSvg(color: string, size = 18) {
  const h = size / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${h}" cy="${h}" r="${h - 2}" fill="white" stroke="${color}" stroke-width="2.2"/>
    <circle cx="${h}" cy="${h}" r="${Math.max(h - 6, 2)}" fill="${color}"/>
  </svg>`;
}
function buildingSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
    <circle cx="15" cy="15" r="13" fill="#6366f1" fill-opacity="0.18" stroke="#6366f1" stroke-width="1.8"/>
    <circle cx="15" cy="15" r="5.5" fill="#6366f1"/>
  </svg>`;
}

// ─── Departure popup HTML ─────────────────────────────────────────────────────
function buildPopupHtml(stop: NearbyStop, deps: Departure[] | null): string {
  const routes = stop.routeRefs.slice(0, 8);
  const badges = routes.map(r => {
    const dep = deps?.find(d => d.routeRef === r);
    const col = dep ? (VEHICLE_COLOR[dep.vehicle] ?? '#64748b') : '#334155';
    return `<span class="bkk-route-badge" data-route="${r}" style="background:${col};color:${col === '#fbbf24' ? '#78350f' : '#fff'}">${r}</span>`;
  }).join('');

  let depsHtml = '';
  if (!deps) {
    depsHtml = '<div style="color:#64748b;font-size:10px;padding:4px 0">Betöltés…</div>';
  } else if (deps.length === 0) {
    depsHtml = '<div style="color:#64748b;font-size:10px;padding:4px 0">Nincs indulási adat</div>';
  } else {
    depsHtml = deps.slice(0, 6).map(d => {
      const col = VEHICLE_COLOR[d.vehicle] ?? '#64748b';
      const min = d.minutesAway <= 0 ? '⬤' : `${d.minutesAway} p`;
      const rtDot = d.realtime ? `<span style="color:#34d399;font-size:8px">●</span>` : '';
      const tripAttr = d.tripId ? `data-tripid="${d.tripId}"` : '';
      return `<div class="bkk-dep-row">
        <span class="bkk-route-badge" ${tripAttr} data-route="${d.routeRef}"
          style="background:${col};color:${col === '#fbbf24' ? '#78350f' : '#fff'};min-width:36px">
          ${d.routeRef}
        </span>
        <span style="flex:1;font-size:10px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.headsign}</span>
        <span style="font-size:11px;font-weight:900;color:#f1f5f9;white-space:nowrap">${min}</span>
        ${rtDot}
      </div>`;
    }).join('');
  }

  return `<div style="padding:12px 14px;min-width:200px;max-width:280px">
    <div style="font-weight:900;font-size:12px;margin-bottom:8px;color:#f1f5f9">${stop.name}</div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">${badges}</div>
    <div class="bkk-departures-list">${depsHtml}</div>
    <div style="font-size:8px;color:#334155;margin-top:6px">${stop.distanceM} m · 🔄 frissíthető</div>
  </div>`;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props { lat: number; lon: number; stops: NearbyStop[]; }

export default function TransitLiveMapInner({ lat, lon, stops }: Props) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<unknown>(null);
  const vehicleLayer   = useRef<unknown>(null);
  const shapeLayer     = useRef<unknown>(null);
  const stopMarkersRef = useRef<Map<string, unknown>>(new Map());
  const [vehicleCount, setVehicleCount] = useState<number | null>(null);
  const [lastUpdate,   setLastUpdate]   = useState<Date | null>(null);

  // ── Show/update departure popup for a stop ────────────────────────────────
  const showDepartures = useCallback(async (stop: NearbyStop, marker: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L as typeof import('leaflet');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = marker as any;

    // Open popup with loading state first
    m.setPopupContent(buildPopupHtml(stop, null)).openPopup();

    try {
      const res  = await fetch(`/api/transit/departures?stopId=${encodeURIComponent(stop.id)}`);
      const data = await res.json() as { departures: Departure[] };
      const deps: Departure[] = data?.departures ?? [];
      m.setPopupContent(buildPopupHtml(stop, deps));

      // Wire up route badge click → fetch + draw shape
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = mapRef.current as any;
      if (!map) return;

      const popupEl = m.getPopup()?.getElement() as HTMLElement | null;
      if (!popupEl) return;

      popupEl.querySelectorAll<HTMLElement>('.bkk-route-badge[data-tripid]').forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', async () => {
          const tripId = el.dataset.tripid;
          if (!tripId) return;

          // Clear previous shape
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sl = shapeLayer.current as any;
          if (sl) sl.clearLayers();

          try {
            const sr = await fetch(`/api/transit/shape?tripId=${encodeURIComponent(tripId)}`);
            const sd = await sr.json() as { points: Array<{lat:number;lon:number}>; color: string; routeRef: string };
            if (sd.points?.length > 0) {
              const latlngs = sd.points.map((p: {lat:number;lon:number}) => [p.lat, p.lon] as [number,number]);
              L.polyline(latlngs, {
                color:  sd.color ?? '#38bdf8',
                weight: 4,
                opacity: 0.85,
              }).addTo(sl);
              map.fitBounds(L.polyline(latlngs).getBounds(), { padding: [40, 40] });
            }
          } catch { /* shape draw failure is silent */ }
        });
      });
    } catch { /* departure fetch failure — leave loading state */ }
  }, []);

  // ── Vehicle poll ──────────────────────────────────────────────────────────
  const refreshVehicles = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L   = (window as any).L as typeof import('leaflet');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lyr = vehicleLayer.current as any;
    if (!L || !lyr) return;

    try {
      const res  = await fetch(`/api/transit/vehicles?lat=${lat}&lon=${lon}`);
      const data = await res.json() as { vehicles: VehiclePosition[]; source: string };
      lyr.clearLayers();
      if (data.source === 'mock' || !data.vehicles?.length) { setVehicleCount(0); return; }

      for (const v of data.vehicles) {
        const color = VEHICLE_COLOR[v.vehicle] ?? '#94a3b8';
        L.marker([v.lat, v.lon], {
          icon: L.divIcon({ html: vehicleSvg(color, v.bearing), className: '', iconSize: [26,26], iconAnchor: [13,13], popupAnchor: [0,-14] }),
          zIndexOffset: 100,
        })
          .bindTooltip(`<b style="color:${color}">${v.routeRef}</b>&thinsp;${v.headsign ?? ''}`, { sticky: true, className: '' })
          .addTo(lyr);
      }
      setVehicleCount(data.vehicles.length);
      setLastUpdate(new Date());
    } catch { setVehicleCount(0); }
  }, [lat, lon]);

  // ── Map init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    // Inject popup CSS once
    if (!document.getElementById('bkk-map-css')) {
      const s = document.createElement('style');
      s.id = 'bkk-map-css';
      s.textContent = MAP_CSS;
      document.head.appendChild(s);
    }

    let interval: ReturnType<typeof setInterval>;

    (async () => {
      const L = await import('leaflet');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).L = L;

      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [lat, lon], zoom: 15,
        zoomControl: true, attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Közlekedési adat: <a href="https://opendata.bkk.hu" target="_blank">BKK Zrt., CC BY 4.0</a>',
        maxZoom: 19,
      }).addTo(map);

      // Building marker
      L.marker([lat, lon], {
        icon: L.divIcon({ html: buildingSvg(), className: '', iconSize: [30,30], iconAnchor: [15,15], popupAnchor: [0,-17] }),
        zIndexOffset: 200,
      })
        .bindTooltip('<b>Az épület</b>', { sticky: false })
        .addTo(map);

      // Stop markers
      const stopMarkers = new Map<string, unknown>();
      for (const stop of stops) {
        const color  = STOP_COLOR[stop.routeType] ?? '#64748b';
        const routes = stop.routeRefs.slice(0, 4).join(' · ');
        const marker = L.marker([stop.lat, stop.lon], {
          icon: L.divIcon({ html: stopSvg(color), className: '', iconSize: [18,18], iconAnchor: [9,9], popupAnchor: [0,-12] }),
        })
          .bindTooltip(
            `<div style="font-size:11px"><b>${stop.name}</b><br/><span style="color:#94a3b8;font-size:9px">${routes} · ${stop.distanceM} m</span></div>`,
            { sticky: true, direction: 'top' }
          )
          .bindPopup('', { className: 'bkk-popup', maxWidth: 300, minWidth: 200 })
          .addTo(map);

        marker.on('click', () => showDepartures(stop, marker));
        stopMarkers.set(stop.id, marker);
      }
      stopMarkersRef.current = stopMarkers;

      const vLayer = L.layerGroup().addTo(map);
      const sLayer = L.layerGroup().addTo(map);
      vehicleLayer.current = vLayer;
      shapeLayer.current   = sLayer;
      mapRef.current       = map;

      await refreshVehicles();
      interval = setInterval(refreshVehicles, 15_000);
    })();

    return () => {
      clearInterval(interval);
      if (mapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapRef.current as any).remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon]);

  const timeStr = lastUpdate
    ? lastUpdate.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div ref={containerRef} className="h-[520px] w-full overflow-hidden rounded-2xl" style={{ background: '#1e293b' }} />

      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-3">
          {[
            { color: VEHICLE_COLOR.BUS,    label: 'Busz' },
            { color: VEHICLE_COLOR.TRAM,   label: 'Villamos' },
            { color: VEHICLE_COLOR.SUBWAY, label: 'Metró' },
            { color: VEHICLE_COLOR.RAIL,   label: 'HÉV/Vasút' },
            { color: '#6366f1',            label: 'Épület' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
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
