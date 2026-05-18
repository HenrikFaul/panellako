'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { NearbyStop } from '@/app/api/transit/nearby/route';
import type { VehiclePosition } from '@/app/api/transit/vehicles/route';

// ─── Vehicle type config ───────────────────────────────────────────────────────
const VEHICLE_COLOR: Record<string, string> = {
  SUBWAY:     '#ef4444',
  TRAM:       '#fbbf24',
  TROLLEYBUS: '#f87171',
  BUS:        '#38bdf8',
  RAIL:       '#a78bfa',
  FERRY:      '#2dd4bf',
};

const STOP_COLOR: Record<string, string> = {
  SUBWAY:     '#ef4444',
  TRAM:       '#fbbf24',
  TROLLEYBUS: '#f87171',
  BUS:        '#64748b',
  RAIL:       '#a78bfa',
  FERRY:      '#2dd4bf',
  CABLE_CAR:  '#f59e0b',
};

// ─── SVG icon factories ────────────────────────────────────────────────────────
function vehicleSvg(color: string, bearing?: number): string {
  const rot = bearing !== undefined ? bearing : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="10" fill="${color}" fill-opacity="0.25" />
    <circle cx="14" cy="14" r="6"  fill="${color}" />
    <polygon points="14,4 17,11 14,9 11,11" fill="${color}"
      transform="rotate(${rot} 14 14)" />
  </svg>`;
}

function stopSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="7"  fill="white" stroke="${color}" stroke-width="2.5" />
    <circle cx="10" cy="10" r="3"  fill="${color}" />
  </svg>`;
}

function buildingSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="#6366f1" fill-opacity="0.20" stroke="#6366f1" stroke-width="2"/>
    <circle cx="16" cy="16" r="6"  fill="#6366f1" />
  </svg>`;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  lat:   number;
  lon:   number;
  stops: NearbyStop[];
}

export default function TransitLiveMapInner({ lat, lon, stops }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<unknown>(null);
  const vehicleLayer  = useRef<unknown>(null);
  const [vehicleCount, setVehicleCount] = useState<number | null>(null);
  const [lastUpdate,   setLastUpdate]   = useState<Date | null>(null);
  const [liveFailed,   setLiveFailed]   = useState(false);

  // ── Fetch + render vehicles ────────────────────────────────────────────────
  const refreshVehicles = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L as typeof import('leaflet');
    if (!L || !vehicleLayer.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layer = vehicleLayer.current as any;

    try {
      const res  = await fetch(`/api/transit/vehicles?lat=${lat}&lon=${lon}`);
      const data = await res.json() as { vehicles: VehiclePosition[]; source: string };

      layer.clearLayers();

      if (data.source === 'mock' || data.vehicles.length === 0) {
        setLiveFailed(true);
        setVehicleCount(0);
        return;
      }

      setLiveFailed(false);
      for (const v of data.vehicles) {
        const color = VEHICLE_COLOR[v.vehicle] ?? '#94a3b8';
        const svg   = vehicleSvg(color, v.bearing);
        const icon  = L.divIcon({
          html:        svg,
          className:   '',
          iconSize:    [28, 28],
          iconAnchor:  [14, 14],
          popupAnchor: [0, -16],
        });
        const label = `<b style="color:${color}">${v.routeRef}</b> ${v.headsign ?? ''}`.trim();
        L.marker([v.lat, v.lon], { icon })
          .bindPopup(`<div style="font-size:12px;min-width:80px">${label}</div>`)
          .addTo(layer);
      }
      setVehicleCount(data.vehicles.length);
      setLastUpdate(new Date());
    } catch {
      setLiveFailed(true);
    }
  }, [lat, lon]);

  // ── Map init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    (async () => {
      const L = await import('leaflet');
      // Expose L globally for refreshVehicles callback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).L = L;

      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center:          [lat, lon],
        zoom:            15,
        zoomControl:     true,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Building marker
      const bldIcon = L.divIcon({
        html:        buildingSvg(),
        className:   '',
        iconSize:    [32, 32],
        iconAnchor:  [16, 16],
        popupAnchor: [0, -18],
      });
      L.marker([lat, lon], { icon: bldIcon })
        .bindPopup('<div style="font-size:12px"><b>Az épület</b></div>')
        .addTo(map);

      // Stop markers
      for (const stop of stops) {
        const color  = STOP_COLOR[stop.routeType] ?? '#64748b';
        const icon   = L.divIcon({
          html:        stopSvg(color),
          className:   '',
          iconSize:    [20, 20],
          iconAnchor:  [10, 10],
          popupAnchor: [0, -12],
        });
        const routes = stop.routeRefs.slice(0, 6).join(', ');
        L.marker([stop.lat, stop.lon], { icon })
          .bindPopup(
            `<div style="font-size:11px;min-width:100px">
              <b>${stop.name}</b><br/>
              <span style="color:#64748b">${stop.distanceM} m · ${routes}</span>
            </div>`
          )
          .addTo(map);
      }

      // Vehicle layer group (updated on refresh)
      const vLayer = L.layerGroup().addTo(map);
      vehicleLayer.current = vLayer;
      mapRef.current = map;

      // Initial fetch + 15 s polling
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
    <div className="flex flex-col gap-2">
      {/* Map */}
      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-xl"
        style={{ background: '#1e293b' }}
      />

      {/* Status bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          {liveFailed ? (
            <span className="text-[9px] text-slate-600">
              ⚫ Járatok pozíciója nem elérhető
            </span>
          ) : vehicleCount !== null ? (
            <span className="text-[9px] text-emerald-500">
              🟢 {vehicleCount} jármű a közelben
            </span>
          ) : (
            <span className="text-[9px] text-slate-600">Betöltés…</span>
          )}
        </div>
        {timeStr && (
          <span className="text-[8px] text-slate-700">Frissítve: {timeStr}</span>
        )}
      </div>

      <div className="flex items-center gap-1 px-1">
        {[
          { color: VEHICLE_COLOR.BUS,        label: 'Busz' },
          { color: VEHICLE_COLOR.TRAM,       label: 'Villamos' },
          { color: VEHICLE_COLOR.TROLLEYBUS, label: 'Trolibusz' },
          { color: VEHICLE_COLOR.SUBWAY,     label: 'Metró' },
          { color: '#6366f1',                label: 'Épület' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-0.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
            <span className="text-[8px] text-slate-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
