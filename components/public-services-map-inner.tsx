'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { PublicService } from '@/app/api/environment/public-services/route';
import { useMapTheme } from '@/hooks/use-map-theme';

const CSS = `.svc-pin{background:none!important;border:none!important}.svc-bldg-pin{background:none!important;border:none!important}`;

type SvcCategory = 'townhall' | 'school' | 'kindergarten' | 'healthcare';

const CAT_CFG: Record<SvcCategory, { label: string; color: string; emoji: string }> = {
  townhall:     { label: 'Polgármesteri hivatal', color: '#6366f1', emoji: '🏛️' },
  school:       { label: 'Iskola',                color: '#3b82f6', emoji: '🎓' },
  kindergarten: { label: 'Óvoda',                 color: '#f59e0b', emoji: '🧒' },
  healthcare:   { label: 'Egészségügy',           color: '#ef4444', emoji: '🏥' },
};

function poiSvg(color: string, emoji: string): string {
  return `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,0.5);border:1.5px solid rgba(255,255,255,0.85);">
    <span style="transform:rotate(45deg);font-size:13px;line-height:1">${emoji}</span>
  </div>`;
}

function buildingSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="#ef4444" fill-opacity="0.2" stroke="#ef4444" stroke-width="2"/>
    <polygon points="16,4 19.4,12.6 28.6,13 21.4,18.9 23.7,27.7 16,22.5 8.3,27.7 10.6,18.9 3.4,13 12.6,12.6"
      fill="#ef4444" stroke="#fee2e2" stroke-width="0.5"/>
  </svg>`;
}

interface Props {
  buildingLat: number;
  buildingLon: number;
  services: Record<SvcCategory, PublicService[]>;
  activeCategory: SvcCategory;
}

export default function PublicServicesMapInner({ buildingLat, buildingLon, services, activeCategory }: Props) {
  const theme = useMapTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  // Init map once
  useEffect(() => {
    if (!document.getElementById('svc-map-css')) {
      const s = document.createElement('style');
      s.id = 'svc-map-css'; s.textContent = CSS;
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
      L.tileLayer(theme.tileUrl, { attribution: theme.attribution, maxZoom: 19 }).addTo(map);
      L.marker([buildingLat, buildingLon], {
        icon: L.divIcon({ html: buildingSvg(), className: 'svc-bldg-pin', iconSize: [32,32], iconAnchor: [16,16] }),
        zIndexOffset: 1000,
      }).bindTooltip('<b>Az épület</b>', { sticky: false }).addTo(map);

      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(); }, 300);
      setMapReady(true);
    })();

    return () => {
      destroyed = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      setMapReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingLat, buildingLon, theme.id]);

  // Re-draw markers when activeCategory or services change
  useEffect(() => {
    if (!mapReady || !layerRef.current) return;

    const run = async () => {
      const Leaflet = await import('leaflet');
      const layer = layerRef.current;
      if (!layer) return;
      layer.clearLayers();

      const cats: SvcCategory[] = ['townhall', 'school', 'kindergarten', 'healthcare'];
      for (const cat of cats) {
        const cfg = CAT_CFG[cat];
        for (const svc of services[cat] ?? []) {
          if (!svc.lat || !svc.lon) continue;
          const isActive = cat === activeCategory;
          const opacity = isActive ? 1.0 : 0.35;
          const marker = Leaflet.marker([svc.lat, svc.lon], {
            icon: Leaflet.divIcon({
              html: `<div style="opacity:${opacity}">${poiSvg(cfg.color, cfg.emoji)}</div>`,
              className: 'svc-pin',
              iconSize: [26,26], iconAnchor: [13,26],
            }),
            zIndexOffset: isActive ? 100 : 10,
          });
          marker.bindTooltip(
            `<div style="font-size:10px;max-width:200px"><b>${svc.name}</b><br/><span style="color:#94a3b8;font-size:9px">${svc.subcategory ?? cfg.label} · ${svc.distanceM} m</span>${svc.address ? `<br/><span style="color:#64748b;font-size:9px">${svc.address}</span>` : ''}</div>`,
            { sticky: true, direction: 'top' }
          );
          marker.addTo(layer);
        }
      }

      // Fit map to active category POIs + building
      const activePois = services[activeCategory] ?? [];
      if (activePois.length > 0) {
        const latlngs = activePois
          .filter(s => s.lat && s.lon)
          .map(s => [s.lat, s.lon] as [number, number]);
        latlngs.push([buildingLat, buildingLon]);
        try {
          mapRef.current?.fitBounds(Leaflet.latLngBounds(latlngs), { padding: [40, 40], maxZoom: 16 });
        } catch { /* ignore */ }
      }
    };
    void run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, activeCategory, services]);

  const allCount = Object.values(services).flat().length;

  return (
    <div className="flex flex-col gap-3">
      {/* Category legend chips */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(CAT_CFG) as [SvcCategory, typeof CAT_CFG[SvcCategory]][]).map(([cat, cfg]) => {
          const count = services[cat]?.length ?? 0;
          const active = cat === activeCategory;
          return (
            <div key={cat}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold border ${
                active ? 'text-white' : 'text-slate-500 border-white/[0.08] bg-white/[0.03]'
              }`}
              style={active ? { background: cfg.color + '28', border: `1px solid ${cfg.color}60`, color: cfg.color } : {}}
            >
              <span>{cfg.emoji}</span>{cfg.label}
              <span className="text-[8px] opacity-60">({count})</span>
            </div>
          );
        })}
      </div>

      <div className="relative overflow-hidden rounded-2xl" style={{ height: 480, background: '#060c18' }}>
        <div ref={containerRef} className="absolute inset-0" />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[11px] text-slate-500 animate-pulse">Térkép betöltése…</p>
          </div>
        )}
      </div>
      <p className="text-[8px] text-slate-700">
        {allCount} intézmény az OSM Overpass adatbázisból · A kiemelt kategória ({CAT_CFG[activeCategory].label}) teljes fényerőn látható
      </p>
    </div>
  );
}
