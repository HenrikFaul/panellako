'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { AQIStation } from '@/app/api/air-quality/stations/route';

// ─── AQI color helper ─────────────────────────────────────────────────────────
function aqiColor(aqi: number): string {
  if (aqi <= 50)  return '#22c55e';
  if (aqi <= 100) return '#eab308';
  if (aqi <= 150) return '#f97316';
  if (aqi <= 200) return '#ef4444';
  if (aqi <= 300) return '#a855f7';
  return '#7f1d1d';
}

// ─── AQI marker SVG ───────────────────────────────────────────────────────────
function aqiMarkerSvg(aqi: number, color: string): string {
  const fontSize = aqi >= 100 ? 9 : 11;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"
    style="filter:drop-shadow(0 0 8px ${color}90);overflow:visible">
    <circle cx="24" cy="24" r="22" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="1.5"/>
    <circle cx="24" cy="24" r="16" fill="${color}" fill-opacity="0.85"/>
    <text x="24" y="24" text-anchor="middle" dominant-baseline="central"
      fill="white" font-weight="900" font-size="${fontSize}"
      font-family="-apple-system,sans-serif">${aqi}</text>
  </svg>`;
}

// ─── Building marker SVG ──────────────────────────────────────────────────────
function buildingSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
    <circle cx="15" cy="15" r="13" fill="#6366f1" fill-opacity="0.18" stroke="#6366f1" stroke-width="1.8"/>
    <circle cx="15" cy="15" r="5.5" fill="#6366f1"/>
  </svg>`;
}

// ─── Inline CSS ───────────────────────────────────────────────────────────────
const AQI_MAP_CSS = `
.aqi-station-pin { background:none!important; border:none!important; }
`;

// ─── Imperative handle ────────────────────────────────────────────────────────
export interface AirQualityMapHandle {
  flyToBuilding: () => void;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  buildingLat:      number;
  buildingLon:      number;
  stations:         AQIStation[];
  onSelectStation?: (uid: number) => void;
}

const AirQualityMapInner = forwardRef<AirQualityMapHandle, Props>(
  function AirQualityMapInner({ buildingLat, buildingLon, stations, onSelectStation }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef       = useRef<unknown>(null);

    // ── Imperative handle ─────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      flyToBuilding: () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const map = mapRef.current as any;
        if (map) map.flyTo([buildingLat, buildingLon], 11, { animate: true, duration: 0.8 });
      },
    }), [buildingLat, buildingLon]);

    // ── Map init ──────────────────────────────────────────────────────────────
    useEffect(() => {
      if (!document.getElementById('aqi-map-css')) {
        const s = document.createElement('style');
        s.id = 'aqi-map-css';
        s.textContent = AQI_MAP_CSS;
        document.head.appendChild(s);
      }

      (async () => {
        const L = await import('leaflet');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).L = L;

        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
          center:           [buildingLat, buildingLon],
          zoom:             11,
          zoomControl:      true,
          attributionControl: true,
        });

        // CartoDB Dark Matter tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
        }).addTo(map);

        // Building marker
        L.marker([buildingLat, buildingLon], {
          icon: L.divIcon({
            html:        buildingSvg(),
            className:   '',
            iconSize:    [30, 30],
            iconAnchor:  [15, 15],
            popupAnchor: [0, -17],
          }),
          zIndexOffset: 200,
        })
          .bindTooltip('<b>Az épület</b>', { sticky: false })
          .addTo(map);

        // Station markers
        for (const station of stations) {
          if (station.aqi === null) continue;
          const color = aqiColor(station.aqi);
          const marker = L.marker([station.lat, station.lon], {
            icon: L.divIcon({
              html:        aqiMarkerSvg(station.aqi, color),
              className:   'aqi-station-pin',
              iconSize:    [48, 48],
              iconAnchor:  [24, 24],
              popupAnchor: [0, -26],
            }),
          })
            .bindTooltip(
              `<div style="font-size:11px"><b>${station.stationName}</b><br/><span style="color:${color};font-weight:900">AQI ${station.aqi}</span></div>`,
              { sticky: true, direction: 'top' }
            )
            .addTo(map);

          if (onSelectStation) {
            marker.on('click', () => onSelectStation(station.uid));
          }
        }

        mapRef.current = map;
      })();

      return () => {
        if (mapRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (mapRef.current as any).remove();
          mapRef.current = null;
        }
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [buildingLat, buildingLon, stations]);

    return (
      <div
        ref={containerRef}
        className="h-[380px] w-full overflow-hidden rounded-2xl"
        style={{ background: '#060c18' }}
      />
    );
  }
);

export default AirQualityMapInner;
