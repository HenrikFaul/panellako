'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { useMapTheme } from '@/hooks/use-map-theme';

// ─── Noise layer config ───────────────────────────────────────────────────────
type NoiseLayer = 'kozut_lden' | 'kozut_lnight' | 'vasut_lden';

const NOISE_LAYER_CFG: Record<NoiseLayer, { label: string; wmsLayer: string; color: string }> = {
  kozut_lden:   { label: 'Közút L_den',    wmsLayer: 'KOZUT_LDEN',   color: '#f97316' },
  kozut_lnight: { label: 'Közút L_night',  wmsLayer: 'KOZUT_LNIGHT', color: '#8b5cf6' },
  vasut_lden:   { label: 'Vasút L_den',    wmsLayer: 'VASUT_LDEN',   color: '#3b82f6' },
};

// dB color scale matching zajterkepek.hu convention
const DB_LEGEND = [
  { label: '< 55 dB', color: '#22c55e' },
  { label: '55–60 dB', color: '#a3e635' },
  { label: '60–65 dB', color: '#facc15' },
  { label: '65–70 dB', color: '#f97316' },
  { label: '70–75 dB', color: '#ef4444' },
  { label: '> 75 dB', color: '#7f1d1d' },
];

// ─── Building dot SVG ─────────────────────────────────────────────────────────
function buildingSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="12" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="5" fill="${color}"/>
  </svg>`;
}

const NOISE_MAP_CSS = `.noise-bldg-pin{background:none!important;border:none!important}`;

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  buildingLat: number;
  buildingLon: number;
  className?:  string;
}

export default function NoiseMapInner({ buildingLat, buildingLon, className }: Props) {
  const theme        = useMapTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef       = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wmsRef       = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [wmsOk, setWmsOk]       = useState<boolean | null>(null);
  const [activeLayer, setActiveLayer] = useState<NoiseLayer>('kozut_lden');

  // zajterkepek.hu deep-link — centered on the building
  const zajLink = `https://zajterkepek.hu/index.html#15/${buildingLat.toFixed(5)}/${buildingLon.toFixed(5)}`;

  useEffect(() => {
    if (!document.getElementById('noise-map-css')) {
      const s = document.createElement('style');
      s.id = 'noise-map-css'; s.textContent = NOISE_MAP_CSS;
      document.head.appendChild(s);
    }

    let destroyed = false;

    (async () => {
      const L = await import('leaflet');
      if (destroyed || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [buildingLat, buildingLon], zoom: 14,
        zoomControl: true, attributionControl: true,
      });

      // Base tile layer
      L.tileLayer(theme.tileUrl, {
        attribution: theme.attribution,
        maxZoom: 19,
        opacity: 0.6,
      }).addTo(map);

      // ── Strategic noise WMS from NIF zajterkepek.hu ───────────────────────
      // WMS endpoint from the Hungarian National Infrastructure Development (NIF Zrt.)
      const wmsLayer = L.tileLayer.wms('https://zajterkepek.hu/geoserver/zajterkep/wms', {
        layers:      NOISE_LAYER_CFG[activeLayer].wmsLayer,
        format:      'image/png',
        transparent: true,
        version:     '1.1.1',
        opacity:     0.8,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attribution: '<a href="https://zajterkepek.hu" target="_blank">zajterkepek.hu · NIF Zrt.</a>' as any,
      });

      // Test WMS availability by listening to tile events
      let firstTileReceived = false;
      wmsLayer.on('tileerror', () => {
        if (!firstTileReceived && !destroyed) setWmsOk(false);
      });
      wmsLayer.on('tileload', () => {
        if (!firstTileReceived && !destroyed) { firstTileReceived = true; setWmsOk(true); }
      });

      wmsLayer.addTo(map);
      wmsRef.current = wmsLayer;

      // Building marker
      L.marker([buildingLat, buildingLon], {
        icon: L.divIcon({
          html: buildingSvg('#38bdf8'),
          className: 'noise-bldg-pin',
          iconSize:   [28, 28],
          iconAnchor: [14, 14],
        }),
        zIndexOffset: 1000,
      }).bindTooltip('<b>Az épület</b>', { sticky: false }).addTo(map);

      mapRef.current = map;
      setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(); }, 300);
      setMapReady(true);
    })();

    return () => {
      destroyed = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      wmsRef.current = null;
      setMapReady(false);
      setWmsOk(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingLat, buildingLon, theme.id]);

  // Switch WMS layer when activeLayer changes (without full map remount)
  useEffect(() => {
    if (!mapRef.current || !wmsRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (wmsRef.current as any).setParams({ layers: NOISE_LAYER_CFG[activeLayer].wmsLayer }, false);
  }, [activeLayer]);

  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}
      style={{ background: '#060c18', minHeight: 360 }}>

      {/* Map container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Loading overlay */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-[11px] text-slate-500 animate-pulse">Zajtérkép betöltése…</p>
        </div>
      )}

      {/* Layer switcher */}
      {mapReady && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[400] flex gap-1 bg-black/75 rounded-xl px-2 py-1.5 backdrop-blur-sm">
          {(Object.entries(NOISE_LAYER_CFG) as [NoiseLayer, typeof NOISE_LAYER_CFG[NoiseLayer]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setActiveLayer(key)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors ${
                activeLayer === key
                  ? 'bg-white/20 text-white'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      )}

      {/* WMS unavailable notice + zajterkepek.hu link */}
      {mapReady && wmsOk === false && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[400] bg-amber-950/90 border border-amber-700/50 rounded-xl px-4 py-2.5 text-center max-w-xs backdrop-blur-sm">
          <p className="text-[10px] text-amber-300 font-medium">A NIF zajtérkép szerver nem elérhető</p>
          <a
            href={zajLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 underline"
          >
            Megnyitás zajterkepek.hu-n →
          </a>
        </div>
      )}

      {/* dB legend */}
      {mapReady && (
        <div className="absolute bottom-6 left-2 z-[400] bg-black/75 rounded-lg px-3 py-2 flex flex-col gap-1 backdrop-blur-sm">
          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Zajterhelés (dB)</p>
          {DB_LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
              <span className="text-[9px] text-slate-300">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* zajterkepek.hu link */}
      {mapReady && (
        <a
          href={zajLink}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-6 right-2 z-[400] flex items-center gap-1.5 bg-black/75 hover:bg-black/90 rounded-lg px-3 py-2 backdrop-blur-sm transition-colors"
        >
          <span className="text-[9px] font-bold text-slate-300">zajterkepek.hu</span>
          <span className="text-[9px] text-slate-500">↗</span>
        </a>
      )}
    </div>
  );
}
