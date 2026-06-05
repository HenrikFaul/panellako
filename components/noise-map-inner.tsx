'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { useMapTheme } from '@/hooks/use-map-theme';

// ─── WMS layer config ─────────────────────────────────────────────────────────
type WmsLayerKey = 'kozut_lden' | 'kozut_lnight' | 'vasut_lden' | 'ipari_lden';

const WMS_LAYERS = {
  kozut_lden:   { label: 'Közút L_den',   wmsLayer: 'KOZUT_LDEN'   },
  kozut_lnight: { label: 'Közút L_night', wmsLayer: 'KOZUT_LNIGHT' },
  vasut_lden:   { label: 'Vasút L_den',   wmsLayer: 'VASUT_LDEN'   },
  ipari_lden:   { label: 'Ipari L_den',   wmsLayer: 'IPARI_LDEN'   },
} satisfies Record<WmsLayerKey, { label: string; wmsLayer: string }>;

// EU END Directive 2002/49/EC dB color scale
const DB_LEGEND = [
  { label: '< 55 dB',  color: '#22c55e' },
  { label: '55–60 dB', color: '#a3e635' },
  { label: '60–65 dB', color: '#facc15' },
  { label: '65–70 dB', color: '#f97316' },
  { label: '70–75 dB', color: '#ef4444' },
  { label: '> 75 dB',  color: '#7f1d1d' },
] satisfies { label: string; color: string }[];

function dbToColor(laeq: number): string {
  if (laeq < 55) return '#22c55e';
  if (laeq < 60) return '#a3e635';
  if (laeq < 65) return '#facc15';
  if (laeq < 70) return '#f97316';
  if (laeq < 75) return '#ef4444';
  return '#7f1d1d';
}

function buildingSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="12" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="5" fill="${color}"/>
  </svg>`;
}

const NOISE_MAP_CSS = `.noise-bldg-pin{background:none!important;border:none!important}`;

// ─── Types ────────────────────────────────────────────────────────────────────
type TileStatus = 'loading' | 'ok' | 'error';
type IotStatus  = 'idle' | 'loading' | 'ok' | 'unavailable' | 'error';

interface GeoJSONFC {
  type:     'FeatureCollection';
  features: Array<{
    type:       'Feature';
    geometry:   { type: 'Point'; coordinates: [number, number] };
    properties: { laeq: number; time: string | null; source: string };
  }>;
}

interface Props {
  buildingLat: number;
  buildingLon: number;
  className?:  string;
}

// ─── Module-level WMS source probe ────────────────────────────────────────────
// Fires a minimal 1×1 WMS request to discover which upstream (MET/NIF/EEA) served it.
async function probeWmsSource(wmsLayerName: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      layers:      wmsLayerName,
      format:      'image/png',
      transparent: 'true',
      version:     '1.1.1',
      width:       '1',
      height:      '1',
      bbox:        '19.05,47.49,19.06,47.50',
      srs:         'EPSG:4326',
    });
    const res = await fetch(`/api/noise/wms-tile?${params.toString()}`, {
      signal: AbortSignal.timeout(8_000),
    });
    return res.headers.get('X-Noise-Source');
  } catch {
    return null;
  }
}

export default function NoiseMapInner({ buildingLat, buildingLon, className }: Props) {
  const theme        = useMapTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef       = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wmsRef       = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iotGroupRef  = useRef<any>(null);

  const [mapReady,    setMapReady]    = useState(false);
  const [wmsLayer,    setWmsLayer]    = useState<WmsLayerKey>('kozut_lden');
  const [iotEnabled,  setIotEnabled]  = useState(false);
  const [tileStatus,  setTileStatus]  = useState<TileStatus>('loading');
  const [wmsSourceId, setWmsSourceId] = useState<string | null>(null);
  const [iotStatus,   setIotStatus]   = useState<IotStatus>('idle');
  const [iotCount,    setIotCount]    = useState(0);

  // ─── Effect 1: Map init ───────────────────────────────────────────────────
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

      L.tileLayer(theme.tileUrl, {
        attribution: theme.attribution,
        maxZoom: 19,
        opacity: 0.6,
      }).addTo(map);

      // IoT marker group — empty until IoT is enabled (Effect 3 populates it)
      iotGroupRef.current = L.layerGroup().addTo(map);

      L.marker([buildingLat, buildingLon], {
        icon: L.divIcon({
          html:       buildingSvg('#38bdf8'),
          className:  'noise-bldg-pin',
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
      wmsRef.current      = null;
      iotGroupRef.current = null;
      setMapReady(false);
      setTileStatus('loading');
      setWmsSourceId(null);
      setIotStatus('idle');
      setIotCount(0);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingLat, buildingLon, theme.id]);

  // ─── Effect 2: WMS layer swap (no map re-init) ────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    let cancelled = false;

    (async () => {
      const L = await import('leaflet');
      if (cancelled || !mapRef.current) return;

      if (wmsRef.current) {
        wmsRef.current.remove();
        wmsRef.current = null;
      }

      setTileStatus('loading');
      setWmsSourceId(null);

      const cfg = WMS_LAYERS[wmsLayer];
      const layer = L.tileLayer.wms('/api/noise/wms-tile', {
        layers:      cfg.wmsLayer,
        format:      'image/png',
        transparent: true,
        version:     '1.1.1',
        opacity:     0.8,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attribution: '<a href="https://zajterkep.met.hu" target="_blank">Stratégiai zajtérkép · HungaroMet / NIF / EEA</a>' as any,
      });

      let firstEventFired = false;
      let okCount = 0;

      layer.on('tileload', () => {
        okCount++;
        if (!firstEventFired && !cancelled) {
          firstEventFired = true;
          setTileStatus('ok');
          probeWmsSource(cfg.wmsLayer).then(src => {
            if (!cancelled) setWmsSourceId(src);
          });
        }
      });

      layer.on('tileerror', () => {
        if (!firstEventFired && !cancelled) {
          setTimeout(() => {
            if (!cancelled && okCount === 0) {
              firstEventFired = true;
              setTileStatus('error');
            }
          }, 4000);
        }
      });

      layer.addTo(mapRef.current);
      // Keep IoT group on top of WMS tiles
      iotGroupRef.current?.bringToFront?.();
      wmsRef.current = layer;
    })();

    return () => { cancelled = true; };
  }, [mapReady, wmsLayer]);

  // ─── Effect 3: IoT toggle / fetch ─────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !iotGroupRef.current) return;

    if (!iotEnabled) {
      iotGroupRef.current.clearLayers();
      setIotStatus('idle');
      setIotCount(0);
      return;
    }

    let cancelled = false;

    (async () => {
      const L = await import('leaflet');
      if (cancelled) return;

      setIotStatus('loading');

      try {
        const res = await fetch('/api/noise/iot-measurements', {
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json() as { status: 'ok' | 'unavailable'; data: GeoJSONFC };

        if (cancelled) return;

        if (json.status === 'unavailable' || !json.data?.features?.length) {
          setIotStatus('unavailable');
          setIotCount(0);
          return;
        }

        iotGroupRef.current.clearLayers();
        let count = 0;

        for (const feature of json.data.features) {
          const [lon, lat] = feature.geometry.coordinates;
          const { laeq, time } = feature.properties;
          const color = dbToColor(laeq);

          const marker = L.circleMarker([lat, lon], {
            radius:      6,
            color,
            fillColor:   color,
            fillOpacity: 0.75,
            weight:      1.5,
            opacity:     1,
          });

          const timeStr = time
            ? new Date(time).toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short' })
            : 'ismeretlen időpont';

          marker.bindTooltip(
            `<div style="font-size:11px;line-height:1.4">
              <b style="color:${color}">${laeq.toFixed(1)} dB</b><br/>
              <span style="color:#94a3b8">${timeStr}</span><br/>
              <span style="color:#475569;font-size:10px">NoiseCapture mérés</span>
            </div>`,
            { sticky: true },
          );

          if (iotGroupRef.current) {
            iotGroupRef.current.addLayer(marker);
            count++;
          }
        }

        if (!cancelled) {
          setIotStatus('ok');
          setIotCount(count);
        }
      } catch {
        if (!cancelled) setIotStatus('error');
      }
    })();

    return () => { cancelled = true; };
  }, [mapReady, iotEnabled]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{ background: '#060c18', minHeight: 360 }}
    >
      {/* Map container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Loading overlay */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-[11px] text-slate-500 animate-pulse">Zajtérkép betöltése…</p>
        </div>
      )}

      {/* WMS layer selector + IoT toggle */}
      {mapReady && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[400] flex flex-col items-center gap-1.5">
          <div className="flex gap-1 bg-black/75 rounded-xl px-2 py-1.5 backdrop-blur-sm">
            {(Object.entries(WMS_LAYERS) as [WmsLayerKey, typeof WMS_LAYERS[WmsLayerKey]][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setWmsLayer(key)}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors ${
                  wmsLayer === key ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIotEnabled(v => !v)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold backdrop-blur-sm border transition-colors ${
              iotEnabled
                ? 'bg-emerald-500/30 border-emerald-500/50 text-emerald-300'
                : 'bg-black/75 border-white/10 text-white/50 hover:text-white/80'
            }`}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${iotEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
            IoT mérések (NoiseCapture)
            {iotEnabled && iotStatus === 'ok' && iotCount > 0 && (
              <span className="ml-1 text-emerald-400">· {iotCount} pont</span>
            )}
          </button>
        </div>
      )}

      {/* WMS tile loading indicator */}
      {mapReady && tileStatus === 'loading' && (
        <div className="absolute top-[5.5rem] left-1/2 -translate-x-1/2 z-[400] flex items-center gap-2 bg-black/70 rounded-xl px-3 py-1.5 backdrop-blur-sm">
          <span className="inline-block h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
          <p className="text-[10px] text-slate-300">Zajréteg betöltése (HungaroMet → NIF → EEA)…</p>
        </div>
      )}

      {/* IoT loading indicator */}
      {mapReady && iotEnabled && iotStatus === 'loading' && (
        <div className="absolute top-[5.5rem] left-1/2 -translate-x-1/2 z-[400] flex items-center gap-2 bg-black/70 rounded-xl px-3 py-1.5 backdrop-blur-sm">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-[10px] text-slate-300">IoT mérések lekérése…</p>
        </div>
      )}

      {/* IoT unavailable notice */}
      {mapReady && iotEnabled && iotStatus === 'unavailable' && (
        <div className="absolute top-[5.5rem] left-1/2 -translate-x-1/2 z-[400] flex items-center gap-2 bg-amber-950/80 border border-amber-700/40 rounded-xl px-3 py-1.5 backdrop-blur-sm">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
          <p className="text-[10px] text-amber-300">NoiseCapture adatok jelenleg nem elérhetők</p>
        </div>
      )}

      {/* All WMS sources failed notice */}
      {mapReady && tileStatus === 'error' && (
        <div className="absolute top-[5.5rem] left-1/2 -translate-x-1/2 z-[400] bg-amber-950/90 border border-amber-700/50 rounded-xl px-4 py-3 text-center max-w-xs backdrop-blur-sm">
          <p className="text-[11px] font-semibold text-amber-300 mb-1.5">
            Zajadatok jelenleg nem elérhetők
          </p>
          <p className="text-[10px] text-amber-500 mb-2">
            A HungaroMet, NIF és EEA WMS szerverek egyike sem válaszolt. Próbálj meg közvetlenül a forrásra navigálni:
          </p>
          <div className="flex flex-col gap-1">
            <a
              href={`https://zajterkep.met.hu#15/${buildingLat.toFixed(5)}/${buildingLon.toFixed(5)}`}
              target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-bold text-sky-400 hover:text-sky-300 underline"
            >
              zajterkep.met.hu (HungaroMet) ↗
            </a>
            <a
              href="https://zajterkepek.hu"
              target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-bold text-sky-400 hover:text-sky-300 underline"
            >
              zajterkepek.hu (NIF Zrt.) ↗
            </a>
            <a
              href="https://noise.eea.europa.eu/"
              target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-bold text-sky-400 hover:text-sky-300 underline"
            >
              noise.eea.europa.eu (EU / EEA) ↗
            </a>
          </div>
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
          <p className="text-[7px] text-slate-600 mt-0.5">EU END 2002/49/EK irányelv</p>
        </div>
      )}

      {/* Source attribution */}
      {mapReady && tileStatus === 'ok' && (
        <div className="absolute bottom-6 right-2 z-[400] flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5 bg-black/75 rounded-lg px-3 py-1.5 backdrop-blur-sm">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[9px] font-bold text-slate-300">Stratégiai zajtérkép</span>
            {wmsSourceId && (
              <span className="text-[8px] text-slate-500">· {wmsSourceId}</span>
            )}
          </div>
          {iotEnabled && iotStatus === 'ok' && iotCount > 0 && (
            <div className="flex items-center gap-1.5 bg-black/75 rounded-lg px-3 py-1.5 backdrop-blur-sm">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span className="text-[9px] font-bold text-slate-300">NoiseCapture · {iotCount} mérés</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
