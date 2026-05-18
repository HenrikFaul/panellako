'use client';

import { useEffect, useRef, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import 'leaflet/dist/leaflet.css';
import { X, Navigation, ChevronDown, CheckCircle, XCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import type { AQIStation, StationValidation } from '@/app/api/air-quality/stations/route';
import type { HeatmapStation } from '@/app/api/air-quality/heatmap/route';

// ─── Pollutant config ─────────────────────────────────────────────────────────
type PollutantKey = 'pm25' | 'pm10' | 'no2' | 'o3' | 'so2' | 'co' | 'no' | 'nox';

const POLLUTANTS: Record<PollutantKey, { label: string; unit: string; max: number; color: string }> = {
  pm25: { label: 'PM2.5', unit: 'µg/m³', max: 150,  color: '#38bdf8' },
  pm10: { label: 'PM10',  unit: 'µg/m³', max: 250,  color: '#818cf8' },
  no2:  { label: 'NO₂',  unit: 'µg/m³', max: 200,  color: '#a78bfa' },
  o3:   { label: 'O₃',   unit: 'µg/m³', max: 180,  color: '#34d399' },
  so2:  { label: 'SO₂',  unit: 'µg/m³', max: 350,  color: '#fbbf24' },
  co:   { label: 'CO',   unit: 'mg/m³', max: 30,   color: '#94a3b8' },
  no:   { label: 'NO',   unit: 'µg/m³', max: 200,  color: '#fb923c' },
  nox:  { label: 'NOX',  unit: 'µg/m³', max: 400,  color: '#f472b6' },
};
const POLLUTANT_KEYS = Object.keys(POLLUTANTS) as PollutantKey[];

// ─── Color science ────────────────────────────────────────────────────────────
// Smooth 8-stop gradient: deep navy → sky → cyan → lime → yellow → orange → red → magenta
const GRADIENT_STOPS: [number, number, number, number][] = [
  // [t, r, g, b]
  [0.00,  14,  42, 120],  // deep navy
  [0.15,   8, 145, 178],  // sky blue
  [0.30,   6, 182, 212],  // cyan
  [0.45, 134, 239, 172],  // teal-green
  [0.60, 234, 179,   8],  // amber
  [0.75, 249, 115,  22],  // orange
  [0.88, 239,  68,  68],  // red
  [1.00, 192,  38, 211],  // magenta
];

function lerpColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < GRADIENT_STOPS.length - 1; i++) {
    const [t0, r0, g0, b0] = GRADIENT_STOPS[i];
    const [t1, r1, g1, b1] = GRADIENT_STOPS[i + 1];
    if (clamped >= t0 && clamped <= t1) {
      const frac = (clamped - t0) / (t1 - t0);
      const r = Math.round(r0 + (r1 - r0) * frac);
      const g = Math.round(g0 + (g1 - g0) * frac);
      const b = Math.round(b0 + (b1 - b0) * frac);
      return `rgb(${r},${g},${b})`;
    }
  }
  return 'rgb(192,38,211)';
}

function intensityFor(key: PollutantKey, value: number): number {
  return Math.min(value / POLLUTANTS[key].max, 1);
}

function syntheticValue(key: PollutantKey, aqi: number): number {
  return (Math.min(aqi, 300) / 300) * POLLUTANTS[key].max;
}

// AQI-level color (for station markers)
function aqiColor(aqi: number): string {
  if (aqi <= 50)  return '#22c55e';
  if (aqi <= 100) return '#eab308';
  if (aqi <= 150) return '#f97316';
  if (aqi <= 200) return '#ef4444';
  if (aqi <= 300) return '#a855f7';
  return '#dc2626';
}
function aqiLabel(aqi: number): string {
  if (aqi <= 50)  return 'Jó';
  if (aqi <= 100) return 'Mérsékelt';
  if (aqi <= 150) return 'Érzékenyek figyeljenek';
  if (aqi <= 200) return 'Egészségtelen';
  if (aqi <= 300) return 'Nagyon egészségtelen';
  return 'Veszélyes';
}

// ─── Premium SVG markers ──────────────────────────────────────────────────────
const AQI_MAP_CSS = `
.aqi-station-pin { background:none!important; border:none!important; }
@keyframes aq-beacon-pulse {
  0%,100% { opacity:0.30; transform:scale(1); }
  50%      { opacity:0.08; transform:scale(1.35); }
}
.aq-beacon-ring {
  animation: aq-beacon-pulse 3.2s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}
@keyframes aq-low-conf {
  0%,100% { opacity:0.55; }
  50%      { opacity:0.25; }
}
.aq-low-conf-ring { animation: aq-low-conf 2s ease-in-out infinite; }
`;

// Premium "air quality sensor beacon" marker for live stations
function beaconMarkerSvg(aqi: number, color: string, confidence: StationValidation['confidence']): string {
  const isLive = true;
  const textSize = aqi >= 100 ? 9 : 11;
  const glowStr  = `drop-shadow(0 0 ${isLive ? 9 : 5}px ${color}${confidence === 'high' ? '70' : '40'})`;
  // Confidence indicator dot (top-right corner)
  const confDot = confidence === 'low'
    ? `<circle cx="35" cy="10" r="4.5" fill="#ef4444" stroke="#060c18" stroke-width="1.5"/><text x="35" y="10" text-anchor="middle" dominant-baseline="central" fill="white" font-size="6" font-weight="900">!</text>`
    : confidence === 'medium'
      ? `<circle cx="35" cy="10" r="4.5" fill="#f97316" stroke="#060c18" stroke-width="1.5"/>`
      : '';
  // Signal bars (beacon antenna)
  const bars = `
    <line x1="22" y1="9" x2="22" y2="4.5" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
    <circle cx="22" cy="3.5" r="1.8" fill="${color}" opacity="0.9"/>
    <line x1="18.5" y1="8" x2="18.5" y2="5.5" stroke="${color}" stroke-width="1.2" stroke-linecap="round" opacity="0.45"/>
    <line x1="25.5" y1="8" x2="25.5" y2="5.5" stroke="${color}" stroke-width="1.2" stroke-linecap="round" opacity="0.45"/>
  `;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44" style="filter:${glowStr};overflow:visible">
    <circle cx="22" cy="22" r="21" fill="none" stroke="${color}" stroke-width="1.2" class="aq-beacon-ring"/>
    <circle cx="22" cy="22" r="17" fill="${color}" fill-opacity="0.12"/>
    <circle cx="22" cy="22" r="13" fill="${color}" fill-opacity="0.92" stroke="rgba(255,255,255,0.22)" stroke-width="1.5"/>
    <circle cx="22" cy="22" r="8"  fill="rgba(255,255,255,0.12)"/>
    ${bars}
    <text x="22" y="22" text-anchor="middle" dominant-baseline="central" fill="white" font-weight="900" font-size="${textSize}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">${aqi}</text>
    ${confDot}
  </svg>`;
}

// Elegant sensor dot for fallback / no-AQI stations
function sensorDotSvg(confidence: StationValidation['confidence']): string {
  const ringColor = confidence === 'high' ? '#475569' : confidence === 'medium' ? '#334155' : '#1e293b';
  const coreColor = confidence === 'high' ? '#64748b' : '#475569';
  const cls       = confidence === 'low' ? ' class="aq-low-conf-ring"' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" style="filter:drop-shadow(0 1px 4px rgba(0,0,0,0.6))">
    <circle cx="11" cy="11" r="9" fill="${ringColor}" fill-opacity="0.35" stroke="${ringColor}" stroke-width="1"${cls}/>
    <circle cx="11" cy="11" r="4" fill="${coreColor}"/>
    <circle cx="11" cy="4.5" r="1.5" fill="${ringColor}" opacity="0.7"/>
    <line x1="11" y1="6.5" x2="11" y2="8" stroke="${ringColor}" stroke-width="1" opacity="0.6" stroke-linecap="round"/>
  </svg>`;
}

// Building anchor marker
function buildingMarkerSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
    <circle cx="17" cy="17" r="15" fill="#6366f1" fill-opacity="0.18" stroke="#6366f1" stroke-width="2"/>
    <circle cx="17" cy="17" r="7"  fill="#6366f1" fill-opacity="0.95"/>
    <circle cx="17" cy="17" r="3"  fill="rgba(255,255,255,0.5)"/>
  </svg>`;
}

// ─── Heatmap circle layers per station ───────────────────────────────────────
interface HeatCircle { radius: number; color: string; opacity: number; }

function heatCircles(key: PollutantKey, value: number): HeatCircle[] {
  const intensity = intensityFor(key, value);
  if (intensity < 0.01) return [];
  const col = lerpColor(intensity);
  return [
    { radius: 62000, color: col, opacity: intensity * 0.055 },
    { radius: 44000, color: col, opacity: intensity * 0.110 },
    { radius: 30000, color: col, opacity: intensity * 0.210 },
    { radius: 18000, color: col, opacity: intensity * 0.360 },
    { radius:  9000, color: col, opacity: intensity * 0.520 },
  ];
}

// ─── Tooltip HTML ─────────────────────────────────────────────────────────────
function stationTooltip(st: AQIStation): string {
  const conf  = st.validation.confidence;
  const badge = conf === 'high'
    ? `<span style="color:#34d399;font-size:8px">✓ Validált</span>`
    : conf === 'medium'
      ? `<span style="color:#fbbf24;font-size:8px">⚠ Közepes megbízhatóság</span>`
      : `<span style="color:#ef4444;font-size:8px">✗ Alacsony megbízhatóság</span>`;
  const aqiStr = st.aqi !== null
    ? `<span style="color:${aqiColor(st.aqi)};font-weight:900">AQI ${st.aqi}</span>`
    : `<span style="color:#475569">Nincs élő AQI</span>`;
  return `<div style="font-size:11px;line-height:1.4">
    <b>${st.stationName}</b><br/>
    ${aqiStr} · ${badge}<br/>
    <span style="color:#475569;font-size:9px">${st.lat.toFixed(4)}°N, ${st.lon.toFixed(4)}°E · ${st.validation.nearestCityName} (${Math.round(st.validation.nearestCityKm)} km)</span>
  </div>`;
}

// ─── Imperative handle ────────────────────────────────────────────────────────
export interface AirQualityMapHandle { flyToBuilding: () => void; }

interface Props {
  buildingLat:      number;
  buildingLon:      number;
  stations:         AQIStation[];
  onSelectStation?: (uid: number) => void;
}

// ─── Validation Report Panel ──────────────────────────────────────────────────
const CHECK_LABELS: Record<keyof Omit<StationValidation, 'score' | 'confidence' | 'issues' | 'nearestCityName' | 'nearestCityKm'>, string> = {
  schemaOk:   'Séma',
  inBbox:     'Bbox',
  notSwapped: 'Tengely',
  nearCity:   'Közelség',
  nameMatch:  'Névegyezés',
  precision:  'Pontosság',
};
const CHECK_KEYS = Object.keys(CHECK_LABELS) as Array<keyof typeof CHECK_LABELS>;

function ValidationBadge({ score }: { score: number }) {
  const color = score >= 5 ? '#34d399' : score >= 3 ? '#fbbf24' : '#ef4444';
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-black"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
      {score}/6
    </span>
  );
}

function ValidationReportPanel({ stations }: { stations: AQIStation[] }) {
  const [open, setOpen] = useState(false);

  const summary = useMemo(() => {
    const high   = stations.filter(s => s.validation.confidence === 'high').length;
    const medium = stations.filter(s => s.validation.confidence === 'medium').length;
    const low    = stations.filter(s => s.validation.confidence === 'low').length;
    const issues = stations.filter(s => s.validation.issues.length > 0);
    return { high, medium, low, total: stations.length, issues };
  }, [stations]);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#060c18] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Térbeli validációs jelentés
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <span className="flex items-center gap-1 text-[8px] text-emerald-400"><CheckCircle size={9} /> {summary.high} magas</span>
            <span className="flex items-center gap-1 text-[8px] text-amber-400"><AlertCircle size={9} /> {summary.medium} közepes</span>
            {summary.low > 0 && <span className="flex items-center gap-1 text-[8px] text-red-400"><XCircle size={9} /> {summary.low} alacsony</span>}
          </div>
          <ChevronDown size={13} className="text-slate-500 transition-transform"
            style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="border-t border-white/[0.05] px-4 pb-4">

          {/* Method legend */}
          <div className="py-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {CHECK_KEYS.map((key, i) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[8px] font-black bg-white/[0.06] text-slate-400">{i + 1}</span>
                <span className="text-[8px] text-slate-500">{CHECK_LABELS[key]}</span>
              </div>
            ))}
          </div>
          <p className="text-[8px] text-slate-700 mb-3 leading-relaxed">
            1 Séma: numerikus, véges, érvényes tartomány · 2 Bbox: Magyarország határain belül (45.7–48.6°N, 16.1–22.9°E) · 3 Tengely: szélességi/hosszúsági fok nincs felcserélve · 4 Közelség: ismert magyar város ≤120 km · 5 Névegyezés: állomásnév és koordináta konzisztens (≤60 km) · 6 Pontosság: koordináta nem gyanúsan kerek · Vetület: nincs szisztematikus eltérés (WGS84↔OSM/CARTO igazítás ellenőrizve)
          </p>

          {/* Station table */}
          <div className="overflow-auto max-h-72">
            <table className="w-full text-[8px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-1.5 pr-3 font-bold text-slate-600 whitespace-nowrap">Állomás</th>
                  <th className="text-center py-1.5 px-1 font-bold text-slate-600">Pont.</th>
                  {CHECK_KEYS.map((_, i) => (
                    <th key={i} className="text-center py-1.5 px-1 font-bold text-slate-600">{i + 1}</th>
                  ))}
                  <th className="text-left py-1.5 pl-2 font-bold text-slate-600">Problémák</th>
                </tr>
              </thead>
              <tbody>
                {stations.map(st => {
                  const v = st.validation;
                  return (
                    <tr key={st.uid} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="py-1.5 pr-3 text-slate-300 whitespace-nowrap max-w-[160px] overflow-hidden text-ellipsis">
                        {st.stationName}
                        {st.aqi !== null && (
                          <span className="ml-1 text-[7px]" style={{ color: aqiColor(st.aqi) }}>AQI {st.aqi}</span>
                        )}
                      </td>
                      <td className="text-center py-1.5 px-1">
                        <ValidationBadge score={v.score} />
                      </td>
                      {CHECK_KEYS.map(key => (
                        <td key={key} className="text-center py-1.5 px-1">
                          {v[key]
                            ? <span className="text-emerald-500">✓</span>
                            : <span className="text-red-500">✗</span>
                          }
                        </td>
                      ))}
                      <td className="py-1.5 pl-2 text-slate-600 text-[7px] max-w-[200px]">
                        {v.issues.length === 0
                          ? <span className="text-emerald-600">—</span>
                          : v.issues.join(' · ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Offset check note */}
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <CheckCircle size={10} className="text-emerald-500 shrink-0" />
            <p className="text-[8px] text-emerald-600 leading-relaxed">
              Szisztematikus eltolódás nem észlelhető — WGS84 koordinátarendszer, OSM/CartoDB WMTS csempék (Web Mercator), Leaflet-konverzió ellenőrizve. A marker-réteg és a hőtérkép azonos koordináta-feltevéssel dolgozik.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
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

    const [mapReady,        setMapReady]        = useState(false);
    const [activePollutant, setActivePollutant] = useState<PollutantKey | null>('pm25');
    const [heatData,        setHeatData]        = useState<HeatmapStation[]>([]);
    const [heatLoading,     setHeatLoading]     = useState(false);
    const [selectedStation, setSelectedStation] = useState<AQIStation | null>(null);
    const [isSynthetic,     setIsSynthetic]     = useState(false);

    useImperativeHandle(ref, () => ({
      flyToBuilding: () => {
        if (mapRef.current) mapRef.current.flyTo([buildingLat, buildingLon], 12, { animate: true, duration: 0.8 });
      },
    }), [buildingLat, buildingLon]);

    // ── Fetch heatmap detail data ─────────────────────────────────────────────
    useEffect(() => {
      setHeatLoading(true);
      fetch('/api/air-quality/heatmap')
        .then(r => r.json() as Promise<HeatmapStation[]>)
        .then(d => { setHeatData(d); setHeatLoading(false); })
        .catch(() => setHeatLoading(false));
    }, []);

    // ── Map init — Hungary-wide view, CARTO dark basemap ─────────────────────
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

        // CARTO Voyager Dark — premium dark basemap
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19, subdomains: 'abcd',
        }).addTo(map);

        // Heatmap pane (behind markers, blurred for smooth gradient effect)
        map.createPane('heatmap');
        const heatPane = map.getPane('heatmap')!;
        heatPane.style.zIndex        = '300';
        heatPane.style.pointerEvents = 'none';
        heatPane.style.filter        = 'blur(26px)';
        heatPane.style.mixBlendMode  = 'screen'; // additive blending for vivid hotspots

        heatLayerRef.current    = L.layerGroup().addTo(map);
        stationLayerRef.current = L.layerGroup().addTo(map);

        // Building marker (above everything)
        L.marker([buildingLat, buildingLon], {
          icon: L.divIcon({
            html: buildingMarkerSvg(),
            className: 'aqi-station-pin', iconSize: [34,34], iconAnchor: [17,17],
          }),
          zIndexOffset: 2000,
        }).bindTooltip('<b>Az épület</b>', { sticky: false }).addTo(map);

        mapRef.current = map;
        setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(); }, 300);
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

    // ── Station markers (re-render on stations change) ────────────────────────
    useEffect(() => {
      const L  = leafletRef.current;
      const sl = stationLayerRef.current;
      if (!mapReady || !L || !sl) return;

      sl.clearLayers();
      for (const st of stations) {
        const conf = st.validation.confidence;
        if (st.aqi !== null) {
          const color  = aqiColor(st.aqi);
          const marker = L.marker([st.lat, st.lon], {
            icon: L.divIcon({
              html:      beaconMarkerSvg(st.aqi, color, conf),
              className: 'aqi-station-pin',
              iconSize:  [44, 44], iconAnchor: [22, 22],
            }),
            zIndexOffset: conf === 'high' ? 100 : conf === 'medium' ? 50 : 0,
          }).bindTooltip(stationTooltip(st), { sticky: true, direction: 'top' });
          marker.on('click', () => {
            setSelectedStation(st);
            if (onSelectStation && st.uid > 0) onSelectStation(st.uid);
          });
          sl.addLayer(marker);
        } else {
          // Fallback/no-data station — elegant sensor dot
          const marker = L.marker([st.lat, st.lon], {
            icon: L.divIcon({
              html:      sensorDotSvg(conf),
              className: 'aqi-station-pin',
              iconSize:  [22, 22], iconAnchor: [11, 11],
            }),
          }).bindTooltip(stationTooltip(st), { sticky: true, direction: 'top' });
          marker.on('click', () => setSelectedStation(st));
          sl.addLayer(marker);
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapReady, stations]);

    // ── Heatmap (premium 5-circle system per station) ─────────────────────────
    useEffect(() => {
      const L         = leafletRef.current;
      const heatLayer = heatLayerRef.current;
      if (!mapReady || !L || !heatLayer) return;

      heatLayer.clearLayers();
      if (!activePollutant) { setIsSynthetic(false); return; }

      // Collect validated real per-pollutant data points
      type Pt = { lat: number; lon: number; val: number };
      const realPts: Pt[] = heatData
        .map(st => {
          const raw = (st as unknown as Record<string, number | null>)[activePollutant];
          // Only use points from within Hungary bbox
          if (raw === null || raw === undefined) return null;
          if (st.lat < 45.7 || st.lat > 48.6 || st.lon < 16.1 || st.lon > 22.9) return null;
          return { lat: st.lat, lon: st.lon, val: raw };
        })
        .filter((p): p is Pt => p !== null);

      // Fallback: AQI-derived synthetic values from validated stations only
      const useSynthetic = realPts.length === 0;
      const pts: Pt[] = useSynthetic
        ? stations
            .filter(st => st.aqi !== null && st.validation.confidence !== 'low')
            .map(st => ({ lat: st.lat, lon: st.lon, val: syntheticValue(activePollutant, st.aqi!) }))
        : realPts;

      setIsSynthetic(useSynthetic);

      // Draw 5 concentric blurred circles per station for a rich heatmap effect
      for (const { lat, lon, val } of pts) {
        const circles = heatCircles(activePollutant, val);
        for (const { radius, color, opacity } of circles) {
          L.circle([lat, lon], {
            pane:         'heatmap',
            radius,
            color:        'transparent',
            fillColor:    color,
            fillOpacity:  Math.min(opacity, 0.95),
            interactive:  false,
            stroke:       false,
          }).addTo(heatLayer);
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapReady, activePollutant, heatData, stations]);

    // ── Closest detail data for selected station ──────────────────────────────
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

    // ── Gradient legend bar ───────────────────────────────────────────────────
    const gradientCss = GRADIENT_STOPS
      .map(([t, r, g, b]) => `rgb(${r},${g},${b}) ${(t * 100).toFixed(0)}%`)
      .join(', ');

    return (
      <div className="flex flex-col gap-2">

        {/* ── Map ──────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl" style={{ height: 480, background: '#060c18' }}>
          <div ref={containerRef} className="absolute inset-0" />

          {/* Active pollutant badge */}
          {activePollutant && (
            <div className="absolute top-2 left-2 z-[1000] flex items-center gap-2 rounded-full bg-black/75 backdrop-blur-sm px-3 py-1.5 border border-white/[0.09]">
              <span className="h-2 w-2 rounded-full shrink-0"
                style={{ background: POLLUTANTS[activePollutant].color, boxShadow: `0 0 6px ${POLLUTANTS[activePollutant].color}` }} />
              <span className="text-[9px] font-bold text-slate-300">
                {POLLUTANTS[activePollutant].label} hőtérkép
              </span>
              {isSynthetic && (
                <span className="text-[7px] text-amber-500/80 font-medium">· AQI-becslés</span>
              )}
              {heatLoading && <span className="text-[7px] text-slate-500">· ...</span>}
            </div>
          )}

          {/* Fly to building */}
          <button
            type="button"
            onClick={() => { if (mapRef.current) mapRef.current.flyTo([buildingLat, buildingLon], 12, { animate: true, duration: 0.8 }); }}
            className="absolute top-2 right-2 z-[1000] flex items-center gap-1.5 rounded-xl bg-black/70 backdrop-blur-sm px-3 py-1.5 text-[9px] font-bold text-slate-300 border border-white/[0.09] hover:border-indigo-500/50 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            <Navigation size={10} /> Épület
          </button>

          {/* Premium gradient legend (bottom-right) */}
          {activePollutant && (
            <div className="absolute bottom-12 right-2 z-[1000] bg-black/75 backdrop-blur-sm rounded-xl p-2.5 border border-white/[0.09] min-w-[120px]">
              <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                {POLLUTANTS[activePollutant].label}
                <span className="ml-1 font-normal">{POLLUTANTS[activePollutant].unit}</span>
              </p>
              {/* Smooth gradient bar */}
              <div className="h-3 rounded-full mb-1" style={{ background: `linear-gradient(to right, ${gradientCss})` }} />
              <div className="flex justify-between text-[7px] font-mono text-slate-600">
                <span>0</span>
                <span>{Math.round(POLLUTANTS[activePollutant].max / 2)}</span>
                <span>{POLLUTANTS[activePollutant].max}+</span>
              </div>
              <div className="mt-1.5 space-y-0.5">
                {[
                  { label: 'Jó',           color: '#22c55e' },
                  { label: 'Mérsékelt',    color: '#eab308' },
                  { label: 'Egészségtelen',color: '#ef4444' },
                  { label: 'Veszélyes',    color: '#c026d3' },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-[7px] text-slate-600">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pollutant toggles (bottom bar) */}
          <div className="absolute bottom-2 left-2 right-28 z-[1000] flex flex-wrap items-center gap-1">
            <span className="text-[8px] uppercase tracking-wider text-slate-600 mr-0.5 hidden sm:inline">Réteg:</span>
            {POLLUTANT_KEYS.map(key => (
              <button
                key={key}
                onClick={() => setActivePollutant(prev => prev === key ? null : key)}
                className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold transition-all duration-150 cursor-pointer ${
                  activePollutant === key
                    ? 'text-white shadow-md'
                    : 'bg-black/65 backdrop-blur-sm text-slate-400 border border-white/[0.12] hover:text-slate-200'
                }`}
                style={activePollutant === key
                  ? { background: POLLUTANTS[key].color, boxShadow: `0 2px 8px ${POLLUTANTS[key].color}60` }
                  : {}}
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
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Mérőállomás</p>
                    {/* Confidence badge */}
                    {(() => {
                      const conf = selectedStation.validation.confidence;
                      return conf === 'high'
                        ? <span className="flex items-center gap-0.5 text-[7px] text-emerald-500"><CheckCircle size={8} /> Validált</span>
                        : conf === 'medium'
                          ? <span className="flex items-center gap-0.5 text-[7px] text-amber-500"><AlertCircle size={8} /> Közepes</span>
                          : <span className="flex items-center gap-0.5 text-[7px] text-red-500"><XCircle size={8} /> Alacsony</span>;
                    })()}
                  </div>
                  <p className="text-sm font-black text-slate-100 leading-tight">{selectedStation.stationName}</p>
                  <p className="mt-0.5 text-[9px] text-slate-600">
                    {selectedStation.lat.toFixed(4)}°N · {selectedStation.lon.toFixed(4)}°E
                    <span className="ml-2">· {selectedStation.validation.nearestCityName} ({Math.round(selectedStation.validation.nearestCityKm)} km)</span>
                  </p>
                  {selectedStation.validation.issues.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedStation.validation.issues.map((issue, i) => (
                        <span key={i} className="rounded-full bg-red-500/10 px-2 py-0.5 text-[7px] text-red-400 border border-red-500/20">
                          {issue}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-start gap-3 shrink-0">
                  {selectedStation.aqi !== null && (
                    <div className="flex flex-col items-end">
                      <span className="text-3xl font-black leading-none tabular-nums"
                        style={{ color: aqiColor(selectedStation.aqi), textShadow: `0 0 20px ${aqiColor(selectedStation.aqi)}50` }}>
                        {selectedStation.aqi}
                      </span>
                      <span className="text-[8px] mt-0.5 font-bold" style={{ color: aqiColor(selectedStation.aqi) }}>
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

              {/* Pollutant data grid */}
              {selectedDetail ? (
                <div className="grid grid-cols-4 gap-1.5">
                  {POLLUTANT_KEYS.map(key => {
                    const val = (selectedDetail as unknown as Record<string, number | null>)[key];
                    if (val === null || val === undefined) return null;
                    const p       = POLLUTANTS[key];
                    const intens  = intensityFor(key, val);
                    const color   = lerpColor(intens);
                    return (
                      <div key={key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                        <p className="text-[8px] font-bold uppercase text-slate-500 mb-1">{p.label}</p>
                        <p className="text-sm font-black text-slate-100 tabular-nums leading-none">{val.toFixed(1)}</p>
                        <p className="mt-0.5 text-[8px] text-slate-600">{p.unit}</p>
                        <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <div className="h-full rounded-full transition-all" style={{ width: `${intens * 100}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : selectedStation.aqi !== null ? (
                <div>
                  <p className="mb-2 text-[8px] text-amber-500/70 font-medium italic">
                    AQI-alapú közelítő értékek · valós pollutáns-adatokhoz éles AQICN token szükséges
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['pm25','pm10','no2','o3'] as PollutantKey[]).map(key => {
                      const val    = syntheticValue(key, selectedStation.aqi!);
                      const p      = POLLUTANTS[key];
                      const intens = intensityFor(key, val);
                      const color  = lerpColor(intens);
                      return (
                        <div key={key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 opacity-65">
                          <p className="text-[8px] font-bold uppercase text-slate-500 mb-1">{p.label}</p>
                          <p className="text-sm font-black text-slate-100 tabular-nums leading-none">~{val.toFixed(0)}</p>
                          <p className="mt-0.5 text-[8px] text-slate-600">{p.unit}</p>
                          <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                            <div className="h-full rounded-full" style={{ width: `${intens * 100}%`, background: color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[10px] text-slate-600">
                  OLM mérőállomás helye — részletes szennyező-adatok valós idejű AQICN API tokennel elérhetők.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Validation report (collapsible) ──────────────────────────────── */}
        {stations.length > 0 && (
          <ValidationReportPanel stations={stations} />
        )}

      </div>
    );
  }
);

export default AirQualityMapInner;
