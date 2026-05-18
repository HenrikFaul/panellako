'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { AQIStation } from '@/app/api/air-quality/stations/route';
import type { HeatmapStation } from '@/app/api/air-quality/heatmap/route';

// ─── Pollutant config ─────────────────────────────────────────────────────────
type PollutantKey = 'pm25' | 'pm10' | 'no2' | 'o3' | 'so2' | 'co' | 'no' | 'nox';

const POLLUTANTS: Record<PollutantKey, { label: string; max: number }> = {
  pm25: { label: 'PM2.5', max: 150 },
  pm10: { label: 'PM10',  max: 250 },
  no2:  { label: 'NO₂',  max: 200 },
  o3:   { label: 'O₃',   max: 180 },
  so2:  { label: 'SO₂',  max: 350 },
  co:   { label: 'CO',   max: 30  },
  no:   { label: 'NO',   max: 200 },
  nox:  { label: 'NOX',  max: 400 },
};

const POLLUTANT_KEYS = Object.keys(POLLUTANTS) as PollutantKey[];
const HEAT_COLORS = ['#22c55e', '#a3e635', '#eab308', '#f97316', '#ef4444', '#a855f7'];

function heatColor(key: PollutantKey, value: number): string {
  const r = Math.min(value / POLLUTANTS[key].max, 1);
  return HEAT_COLORS[Math.min(Math.floor(r * HEAT_COLORS.length), HEAT_COLORS.length - 1)];
}
function heatOpacity(key: PollutantKey, value: number): number {
  return 0.15 + Math.min(value / POLLUTANTS[key].max, 1) * 0.5;
}

// ─── AQI color ────────────────────────────────────────────────────────────────
function aqiColor(aqi: number): string {
  if (aqi <= 50)  return '#22c55e';
  if (aqi <= 100) return '#eab308';
  if (aqi <= 150) return '#f97316';
  if (aqi <= 200) return '#ef4444';
  if (aqi <= 300) return '#a855f7';
  return '#7f1d1d';
}

// ─── SVG markers ─────────────────────────────────────────────────────────────
function aqiMarkerSvg(aqi: number, color: string): string {
  const fs = aqi >= 100 ? 9 : 11;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"
    style="filter:drop-shadow(0 0 8px ${color}90);overflow:visible">
    <circle cx="24" cy="24" r="22" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="1.5"/>
    <circle cx="24" cy="24" r="16" fill="${color}" fill-opacity="0.85"/>
    <text x="24" y="24" text-anchor="middle" dominant-baseline="central"
      fill="white" font-weight="900" font-size="${fs}"
      font-family="-apple-system,sans-serif">${aqi}</text>
  </svg>`;
}

function buildingSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
    <circle cx="15" cy="15" r="13" fill="#6366f1" fill-opacity="0.18" stroke="#6366f1" stroke-width="1.8"/>
    <circle cx="15" cy="15" r="5.5" fill="#6366f1"/>
  </svg>`;
}

const AQI_MAP_CSS = `.aqi-station-pin{background:none!important;border:none!important}`;

// ─── Imperative handle ────────────────────────────────────────────────────────
export interface AirQualityMapHandle { flyToBuilding: () => void; }

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  buildingLat:      number;
  buildingLon:      number;
  stations:         AQIStation[];
  onSelectStation?: (uid: number) => void;
}

const AirQualityMapInner = forwardRef<AirQualityMapHandle, Props>(
  function AirQualityMapInner({ buildingLat, buildingLon, stations, onSelectStation }, ref) {
    const containerRef  = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapRef        = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leafletRef    = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const heatLayerRef  = useRef<any>(null);
    const [mapReady, setMapReady]               = useState(false);
    const [activePollutant, setActivePollutant] = useState<PollutantKey | null>('pm25');
    const [heatData, setHeatData]               = useState<HeatmapStation[]>([]);
    const [heatLoading, setHeatLoading]         = useState(false);

    // ── Imperative handle ─────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      flyToBuilding: () => {
        if (mapRef.current) mapRef.current.flyTo([buildingLat, buildingLon], 11, { animate: true, duration: 0.8 });
      },
    }), [buildingLat, buildingLon]);

    // ── Fetch heatmap station data ────────────────────────────────────────────
    useEffect(() => {
      setHeatLoading(true);
      fetch('/api/air-quality/heatmap')
        .then(r => r.json() as Promise<HeatmapStation[]>)
        .then(d => { setHeatData(d); setHeatLoading(false); })
        .catch(() => setHeatLoading(false));
    }, []);

    // ── Map init ──────────────────────────────────────────────────────────────
    useEffect(() => {
      if (!document.getElementById('aqi-map-css')) {
        const s = document.createElement('style');
        s.id = 'aqi-map-css'; s.textContent = AQI_MAP_CSS;
        document.head.appendChild(s);
      }

      let destroyed = false;
      (async () => {
        const L = await import('leaflet');
        if (destroyed || !containerRef.current || mapRef.current) return;
        leafletRef.current = L;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).L = L;

        const map = L.map(containerRef.current, {
          center: [buildingLat, buildingLon], zoom: 11,
          zoomControl: true, attributionControl: true,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
        }).addTo(map);

        // Heatmap pane — CSS blur for smooth gradient effect
        map.createPane('heatmap');
        const heatPane = map.getPane('heatmap')!;
        heatPane.style.zIndex        = '300';
        heatPane.style.pointerEvents = 'none';
        heatPane.style.filter        = 'blur(28px)';

        heatLayerRef.current = L.layerGroup().addTo(map);

        // Building marker
        L.marker([buildingLat, buildingLon], {
          icon: L.divIcon({ html: buildingSvg(), className: '', iconSize: [30,30], iconAnchor: [15,15], popupAnchor: [0,-17] }),
          zIndexOffset: 200,
        }).bindTooltip('<b>Az épület</b>', { sticky: false }).addTo(map);

        // AQI station markers — show all stations, OLM fallbacks (null AQI) as small dots
        for (const st of stations) {
          if (st.aqi !== null) {
            const color  = aqiColor(st.aqi);
            const marker = L.marker([st.lat, st.lon], {
              icon: L.divIcon({ html: aqiMarkerSvg(st.aqi, color), className: 'aqi-station-pin', iconSize: [48,48], iconAnchor: [24,24], popupAnchor: [0,-26] }),
            }).bindTooltip(
              `<div style="font-size:11px"><b>${st.stationName}</b><br/><span style="color:${color};font-weight:900">AQI ${st.aqi}</span></div>`,
              { sticky: true, direction: 'top' }
            ).addTo(map);
            if (onSelectStation) marker.on('click', () => onSelectStation(st.uid));
          } else {
            // OLM station without current AQI data — show as named dot marker
            L.marker([st.lat, st.lon], {
              icon: L.divIcon({
                html: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
                  <circle cx="11" cy="11" r="9" fill="#334155" stroke="#64748b" stroke-width="1.5"/>
                  <circle cx="11" cy="11" r="3.5" fill="#94a3b8"/>
                </svg>`,
                className: 'aqi-station-pin', iconSize: [22,22], iconAnchor: [11,11],
              }),
            }).bindTooltip(
              `<div style="font-size:11px"><b>${st.stationName}</b><br/><span style="color:#94a3b8;font-size:9px">OLM mérőállomás</span></div>`,
              { sticky: true, direction: 'top' }
            ).addTo(map);
          }
        }

        mapRef.current = map;
        // Ensure tiles render correctly after any CSS layout change
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTimeout(() => { if (mapRef.current) (mapRef.current as any).invalidateSize(); }, 300);
        setMapReady(true);
      })();

      return () => {
        destroyed = true;
        if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
        heatLayerRef.current = null;
        leafletRef.current   = null;
        setMapReady(false);
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [buildingLat, buildingLon, stations]);

    // ── Heatmap redraw whenever pollutant or data changes ─────────────────────
    useEffect(() => {
      const L         = leafletRef.current;
      const heatLayer = heatLayerRef.current;
      if (!mapReady || !L || !heatLayer) return;

      heatLayer.clearLayers();
      if (!activePollutant || heatData.length === 0) return;

      for (const st of heatData) {
        const val = (st as unknown as Record<string, number | null>)[activePollutant];
        if (val === null || val === undefined) continue;
        const color   = heatColor(activePollutant, val);
        const opacity = heatOpacity(activePollutant, val);

        // Outer large circle — 18km radius, overlapping between stations creates smooth city-scale gradient
        L.circle([st.lat, st.lon], {
          pane: 'heatmap', radius: 18000,
          color: 'transparent', fillColor: color, fillOpacity: opacity, interactive: false,
        }).addTo(heatLayer);

        // Inner concentrated circle
        L.circle([st.lat, st.lon], {
          pane: 'heatmap', radius: 8000,
          color: 'transparent', fillColor: color, fillOpacity: opacity * 0.8, interactive: false,
        }).addTo(heatLayer);
      }
    }, [mapReady, activePollutant, heatData]);

    // ── Available pollutants from loaded data ─────────────────────────────────
    const availableKeys = POLLUTANT_KEYS.filter(k =>
      heatData.some(s => (s as unknown as Record<string, number | null>)[k] !== null)
    );

    return (
      <div className="relative h-[380px] w-full overflow-hidden rounded-2xl" style={{ background: '#060c18' }}>
        {/* Leaflet mount */}
        <div ref={containerRef} className="absolute inset-0" />

        {/* Active pollutant label (top-left) */}
        {activePollutant && !heatLoading && (
          <div className="absolute top-2 left-2 z-[1000] rounded-full bg-black/60 backdrop-blur-sm px-3 py-1 text-[9px] font-bold text-slate-300 border border-white/[0.08]">
            {POLLUTANTS[activePollutant].label} hőtérkép
          </div>
        )}

        {heatLoading && (
          <div className="absolute top-2 left-2 z-[1000] rounded-full bg-black/60 backdrop-blur-sm px-3 py-1 text-[9px] text-slate-500 border border-white/[0.08]">
            Adatok betöltése…
          </div>
        )}

        {/* Pollutant toggle buttons (bottom) */}
        {availableKeys.length > 0 && (
          <div className="absolute bottom-2 left-2 right-2 z-[1000] flex flex-wrap items-center gap-1">
            <span className="text-[8px] uppercase tracking-wider text-slate-600 mr-0.5">Réteg:</span>
            {availableKeys.map(key => (
              <button
                key={key}
                onClick={() => setActivePollutant(prev => prev === key ? null : key)}
                className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold transition-colors duration-150 cursor-pointer ${
                  activePollutant === key
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                    : 'bg-black/60 backdrop-blur-sm text-slate-400 border border-white/[0.12] hover:text-slate-200'
                }`}
              >
                {POLLUTANTS[key].label}
              </button>
            ))}
            {activePollutant && (
              <button
                onClick={() => setActivePollutant(null)}
                className="rounded-full px-2 py-0.5 text-[9px] text-slate-600 border border-white/[0.08] bg-black/60 hover:text-slate-400 transition-colors cursor-pointer"
                title="Hőtérkép kikapcsolása"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);

export default AirQualityMapInner;
