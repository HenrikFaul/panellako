'use client';

import { useEffect, useRef, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import 'leaflet/dist/leaflet.css';
import { X, Navigation } from 'lucide-react';
import type { AQIStation } from '@/app/api/air-quality/stations/route';
import type { HeatmapStation } from '@/app/api/air-quality/heatmap/route';

// ─── Pollutant config ─────────────────────────────────────────────────────────
type PollutantKey = 'pm25' | 'pm10' | 'no2' | 'o3' | 'so2' | 'co' | 'no' | 'nox';

const POLLUTANTS: Record<PollutantKey, { label: string; unit: string; max: number }> = {
  pm25: { label: 'PM2.5', unit: 'µg/m³', max: 150 },
  pm10: { label: 'PM10',  unit: 'µg/m³', max: 250 },
  no2:  { label: 'NO₂',  unit: 'µg/m³', max: 200 },
  o3:   { label: 'O₃',   unit: 'µg/m³', max: 180 },
  so2:  { label: 'SO₂',  unit: 'µg/m³', max: 350 },
  co:   { label: 'CO',   unit: 'mg/m³', max: 30  },
  no:   { label: 'NO',   unit: 'µg/m³', max: 200 },
  nox:  { label: 'NOX',  unit: 'µg/m³', max: 400 },
};

const POLLUTANT_KEYS = Object.keys(POLLUTANTS) as PollutantKey[];
const HEAT_COLORS = ['#22c55e', '#a3e635', '#eab308', '#f97316', '#ef4444', '#a855f7'];

function heatColor(key: PollutantKey, value: number): string {
  const r = Math.min(value / POLLUTANTS[key].max, 1);
  return HEAT_COLORS[Math.min(Math.floor(r * HEAT_COLORS.length), HEAT_COLORS.length - 1)];
}
function heatOpacity(key: PollutantKey, value: number): number {
  return 0.2 + Math.min(value / POLLUTANTS[key].max, 1) * 0.55;
}

// Approximate pollutant value from AQI when real per-pollutant data isn't available.
// Maps AQI 0–300 linearly to 0–max for each pollutant (rough proxy only).
function syntheticValue(key: PollutantKey, aqi: number): number {
  return (Math.min(aqi, 300) / 300) * POLLUTANTS[key].max;
}

function aqiColor(aqi: number): string {
  if (aqi <= 50)  return '#22c55e';
  if (aqi <= 100) return '#eab308';
  if (aqi <= 150) return '#f97316';
  if (aqi <= 200) return '#ef4444';
  if (aqi <= 300) return '#a855f7';
  return '#7f1d1d';
}
function aqiLabel(aqi: number): string {
  if (aqi <= 50)  return 'Jó';
  if (aqi <= 100) return 'Mérsékelt';
  if (aqi <= 150) return 'Érzékenyek figyeljenek';
  if (aqi <= 200) return 'Egészségtelen';
  if (aqi <= 300) return 'Nagyon egészségtelen';
  return 'Veszélyes';
}

// ─── SVG markers ─────────────────────────────────────────────────────────────
function aqiMarkerSvg(aqi: number, color: string): string {
  const fs = aqi >= 100 ? 9 : 11;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44" style="filter:drop-shadow(0 0 6px ${color}80);overflow:visible">
    <circle cx="22" cy="22" r="20" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="1.5"/>
    <circle cx="22" cy="22" r="14" fill="${color}" fill-opacity="0.9"/>
    <text x="22" y="22" text-anchor="middle" dominant-baseline="central" fill="white" font-weight="900" font-size="${fs}" font-family="-apple-system,sans-serif">${aqi}</text>
  </svg>`;
}
function stationDotSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
    <circle cx="9" cy="9" r="7.5" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
    <circle cx="9" cy="9" r="3" fill="#64748b"/>
  </svg>`;
}
function buildingSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="#6366f1" fill-opacity="0.18" stroke="#6366f1" stroke-width="2"/>
    <circle cx="16" cy="16" r="6" fill="#6366f1"/>
  </svg>`;
}

const AQI_MAP_CSS = `.aqi-station-pin{background:none!important;border:none!important}`;

export interface AirQualityMapHandle { flyToBuilding: () => void; }

interface Props {
  buildingLat:      number;
  buildingLon:      number;
  stations:         AQIStation[];
  onSelectStation?: (uid: number) => void;
}

const AirQualityMapInner = forwardRef<AirQualityMapHandle, Props>(
  function AirQualityMapInner({ buildingLat, buildingLon, stations, onSelectStation }, ref) {
    const containerRef    = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapRef          = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leafletRef      = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const heatLayerRef    = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stationLayerRef = useRef<any>(null);

    const [mapReady, setMapReady]               = useState(false);
    const [activePollutant, setActivePollutant] = useState<PollutantKey | null>('pm25');
    const [heatData, setHeatData]               = useState<HeatmapStation[]>([]);
    const [heatLoading, setHeatLoading]         = useState(false);
    const [selectedStation, setSelectedStation] = useState<AQIStation | null>(null);
    // true when heatmap is drawn from AQI proxy rather than real per-pollutant data
    const [isSynthetic, setIsSynthetic]         = useState(false);

    useImperativeHandle(ref, () => ({
      flyToBuilding: () => {
        if (mapRef.current) mapRef.current.flyTo([buildingLat, buildingLon], 12, { animate: true, duration: 0.8 });
      },
    }), [buildingLat, buildingLon]);

    // ── Fetch heatmap data once ───────────────────────────────────────────────
    useEffect(() => {
      setHeatLoading(true);
      fetch('/api/air-quality/heatmap')
        .then(r => r.json() as Promise<HeatmapStation[]>)
        .then(d => { setHeatData(d); setHeatLoading(false); })
        .catch(() => setHeatLoading(false));
    }, []);

    // ── Map init — Hungary-wide view ──────────────────────────────────────────
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

        const map = L.map(containerRef.current, {
          center: [47.16, 19.50], zoom: 7,
          zoomControl: true, attributionControl: true,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
        }).addTo(map);

        // Heatmap pane (blurred, non-interactive layer beneath markers)
        map.createPane('heatmap');
        const heatPane = map.getPane('heatmap')!;
        heatPane.style.zIndex        = '300';
        heatPane.style.pointerEvents = 'none';
        heatPane.style.filter        = 'blur(32px)';
        heatLayerRef.current    = L.layerGroup().addTo(map);
        stationLayerRef.current = L.layerGroup().addTo(map);

        L.marker([buildingLat, buildingLon], {
          icon: L.divIcon({ html: buildingSvg(), className: '', iconSize: [32,32], iconAnchor: [16,16] }),
          zIndexOffset: 2000,
        }).bindTooltip('<b>Az épület</b>', { sticky: false }).addTo(map);

        mapRef.current = map;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTimeout(() => { if (mapRef.current) (mapRef.current as any).invalidateSize(); }, 300);
        setMapReady(true);
      })();
      return () => {
        destroyed = true;
        if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
        leafletRef.current = heatLayerRef.current = stationLayerRef.current = null;
        setMapReady(false);
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [buildingLat, buildingLon]);

    // ── Station markers ───────────────────────────────────────────────────────
    useEffect(() => {
      const L  = leafletRef.current;
      const sl = stationLayerRef.current;
      if (!mapReady || !L || !sl) return;

      sl.clearLayers();
      for (const st of stations) {
        if (st.aqi !== null) {
          const color  = aqiColor(st.aqi);
          const marker = L.marker([st.lat, st.lon], {
            icon: L.divIcon({
              html: aqiMarkerSvg(st.aqi, color),
              className: 'aqi-station-pin', iconSize: [44,44], iconAnchor: [22,22],
            }),
          }).bindTooltip(
            `<div style="font-size:11px"><b>${st.stationName}</b><br/><span style="color:${color};font-weight:900">AQI ${st.aqi}</span><br/><span style="color:#64748b;font-size:9px">kattints az adatlapért</span></div>`,
            { sticky: true, direction: 'top' }
          );
          marker.on('click', () => {
            setSelectedStation(st);
            if (onSelectStation && st.uid > 0) onSelectStation(st.uid);
          });
          sl.addLayer(marker);
        } else {
          const marker = L.marker([st.lat, st.lon], {
            icon: L.divIcon({
              html: stationDotSvg(),
              className: 'aqi-station-pin', iconSize: [18,18], iconAnchor: [9,9],
            }),
          }).bindTooltip(
            `<div style="font-size:11px"><b>${st.stationName}</b><br/><span style="color:#94a3b8;font-size:9px">OLM mérőállomás · kattints</span></div>`,
            { sticky: true, direction: 'top' }
          );
          marker.on('click', () => setSelectedStation(st));
          sl.addLayer(marker);
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapReady, stations]);

    // ── Heatmap redraw ────────────────────────────────────────────────────────
    // Uses real per-pollutant data when available; falls back to AQI-derived
    // synthetic values so the heatmap always renders even with the demo token.
    useEffect(() => {
      const L         = leafletRef.current;
      const heatLayer = heatLayerRef.current;
      if (!mapReady || !L || !heatLayer) return;

      heatLayer.clearLayers();
      if (!activePollutant) { setIsSynthetic(false); return; }

      // Collect real data points for this pollutant
      type Pt = { lat: number; lon: number; val: number };
      const realPts: Pt[] = heatData
        .map(st => {
          const raw = (st as unknown as Record<string, number | null>)[activePollutant];
          return raw !== null && raw !== undefined ? { lat: st.lat, lon: st.lon, val: raw } : null;
        })
        .filter((p): p is Pt => p !== null);

      // Fall back to AQI-derived synthetic values from station markers
      const useSynthetic = realPts.length === 0;
      const pts: Pt[] = useSynthetic
        ? stations
            .filter(st => st.aqi !== null)
            .map(st => ({ lat: st.lat, lon: st.lon, val: syntheticValue(activePollutant, st.aqi!) }))
        : realPts;

      setIsSynthetic(useSynthetic);

      for (const { lat, lon, val } of pts) {
        const color   = heatColor(activePollutant, val);
        const opacity = heatOpacity(activePollutant, val);
        L.circle([lat, lon], {
          pane: 'heatmap', radius: 40000,
          color: 'transparent', fillColor: color, fillOpacity: opacity, interactive: false,
        }).addTo(heatLayer);
        L.circle([lat, lon], {
          pane: 'heatmap', radius: 20000,
          color: 'transparent', fillColor: color, fillOpacity: opacity * 0.8, interactive: false,
        }).addTo(heatLayer);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapReady, activePollutant, heatData, stations]);

    // Find the closest heatmap station for the selected station detail panel
    const selectedDetail = useMemo<HeatmapStation | null>(() => {
      if (!selectedStation || heatData.length === 0) return null;
      let best: HeatmapStation | null = null;
      let bestDist = Infinity;
      for (const h of heatData) {
        const d = Math.hypot(h.lat - selectedStation.lat, h.lon - selectedStation.lon);
        if (d < bestDist) { bestDist = d; best = h; }
      }
      return bestDist < 2.0 ? best : null;
    }, [selectedStation, heatData]);

    return (
      <div className="flex flex-col gap-2">
        {/* ── Map ─────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl" style={{ height: 460, background: '#060c18' }}>
          <div ref={containerRef} className="absolute inset-0" />

          {/* Active pollutant badge */}
          {activePollutant && (
            <div className="absolute top-2 left-2 z-[1000] flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-sm px-3 py-1 border border-white/[0.08]">
              <span className="text-[9px] font-bold text-slate-300">{POLLUTANTS[activePollutant].label} hőtérkép</span>
              {isSynthetic && (
                <span className="text-[7px] text-amber-500/80 font-medium">· AQI-alapú becslés</span>
              )}
              {heatLoading && (
                <span className="text-[7px] text-slate-500">· betöltés…</span>
              )}
            </div>
          )}

          {/* Fly-to-building button */}
          <button
            type="button"
            onClick={() => { if (mapRef.current) mapRef.current.flyTo([buildingLat, buildingLon], 12, { animate: true, duration: 0.8 }); }}
            className="absolute top-2 right-2 z-[1000] flex items-center gap-1.5 rounded-xl bg-black/60 backdrop-blur-sm px-3 py-1.5 text-[9px] font-bold text-slate-300 border border-white/[0.08] hover:border-indigo-500/50 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            <Navigation size={10} />
            Épület
          </button>

          {/* Heatmap legend — always visible when a pollutant is active */}
          {activePollutant && (
            <div className="absolute bottom-12 right-2 z-[1000] bg-black/70 backdrop-blur-sm rounded-xl p-2.5 border border-white/[0.08] min-w-[110px]">
              <p className="text-[8px] font-bold uppercase text-slate-500 mb-1.5">
                {POLLUTANTS[activePollutant].label} · {POLLUTANTS[activePollutant].unit}
              </p>
              <div className="flex gap-0.5 mb-0.5">
                {HEAT_COLORS.map((c, i) => (
                  <div key={i} className="h-2.5 flex-1 rounded-sm" style={{ background: c }} />
                ))}
              </div>
              <div className="flex justify-between text-[7px] text-slate-600 mt-0.5">
                <span>0</span>
                <span>{POLLUTANTS[activePollutant].max}</span>
              </div>
            </div>
          )}

          {/* Pollutant toggle buttons — always visible (all 8 pollutants) */}
          <div className="absolute bottom-2 left-2 right-14 z-[1000] flex flex-wrap items-center gap-1">
            <span className="text-[8px] uppercase tracking-wider text-slate-600 mr-0.5">Réteg:</span>
            {POLLUTANT_KEYS.map(key => (
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
              >✕</button>
            )}
          </div>
        </div>

        {/* ── Station detail panel ─────────────────────────────────────────── */}
        {selectedStation && (
          <div className="rounded-2xl border border-white/[0.07] bg-[#090f1e]">
            <div className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="min-w-0 pr-4">
                  <p className="mb-0.5 text-[8px] font-bold uppercase tracking-widest text-slate-600">Mérőállomás adatlap</p>
                  <p className="text-sm font-black text-slate-100 leading-tight">{selectedStation.stationName}</p>
                  <p className="mt-0.5 text-[9px] text-slate-600">
                    {selectedStation.lat.toFixed(4)}°N, {selectedStation.lon.toFixed(4)}°E
                  </p>
                </div>
                <div className="flex items-start gap-3 shrink-0">
                  {selectedStation.aqi !== null && (
                    <div className="flex flex-col items-end">
                      <span className="text-3xl font-black leading-none tabular-nums" style={{ color: aqiColor(selectedStation.aqi) }}>
                        {selectedStation.aqi}
                      </span>
                      <span className="text-[8px] mt-0.5" style={{ color: aqiColor(selectedStation.aqi) }}>
                        {aqiLabel(selectedStation.aqi)}
                      </span>
                      <span className="text-[7px] text-slate-600 mt-0.5">AQI</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedStation(null)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.05] transition-colors cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {selectedDetail ? (
                <div className="grid grid-cols-4 gap-1.5">
                  {POLLUTANT_KEYS.map(key => {
                    const val = (selectedDetail as unknown as Record<string, number | null>)[key];
                    if (val === null || val === undefined) return null;
                    const p     = POLLUTANTS[key];
                    const frac  = Math.min(val / p.max, 1);
                    const color = heatColor(key, val);
                    return (
                      <div key={key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                        <p className="text-[8px] font-bold uppercase text-slate-500 mb-1">{p.label}</p>
                        <p className="text-sm font-black text-slate-100 tabular-nums leading-none">{val.toFixed(1)}</p>
                        <p className="mt-0.5 text-[8px] text-slate-600">{p.unit}</p>
                        <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <div className="h-full rounded-full transition-all" style={{ width: `${frac * 100}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : selectedStation.aqi !== null ? (
                // Synthetic per-pollutant estimate from AQI when no real data
                <div>
                  <p className="mb-2 text-[8px] text-amber-500/70 font-medium">AQI-alapú közelítő értékek (valós API token szükséges a pontos adathoz)</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['pm25','pm10','no2','o3'] as PollutantKey[]).map(key => {
                      const val   = syntheticValue(key, selectedStation.aqi!);
                      const p     = POLLUTANTS[key];
                      const frac  = Math.min(val / p.max, 1);
                      const color = heatColor(key, val);
                      return (
                        <div key={key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 opacity-70">
                          <p className="text-[8px] font-bold uppercase text-slate-500 mb-1">{p.label}</p>
                          <p className="text-sm font-black text-slate-100 tabular-nums leading-none">~{val.toFixed(0)}</p>
                          <p className="mt-0.5 text-[8px] text-slate-600">{p.unit}</p>
                          <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                            <div className="h-full rounded-full transition-all" style={{ width: `${frac * 100}%`, background: color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[10px] text-slate-600">
                  Ez egy OLM mérőállomás helye. Részletes szennyező-adatok valós idejű AQICN API tokennel elérhetők.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default AirQualityMapInner;
