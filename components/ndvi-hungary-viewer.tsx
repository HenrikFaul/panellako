'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NdviHungaryRender } from '@/app/api/environment/ndvi-hungary/route';

interface Props {
  data:    NdviHungaryRender | null;
  loading: boolean;
  error:   string | null;
}

const RESOLUTION_LABELS: Record<string, string> = {
  large:                       'Nagy',
  very_large:                  'Nagyon nagy',
  very_very_large:             'Nagyon nagyon nagy',
  very_very_very_very_large:   'Nagyon nagyon nagyon nagyon nagy',
};

const RESOLUTION_ORDER = ['large', 'very_large', 'very_very_large', 'very_very_very_very_large'];

function fmtMB(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}
function fmtDateOnly(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function NdviHungaryViewer({ data, loading, error }: Props) {
  const [activeRes, setActiveRes] = useState<string>('very_large');
  const [zoom, setZoom]   = useState(1);
  const [panX, setPanX]   = useState(0);
  const [panY, setPanY]   = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Reset pan/zoom when switching resolution
  useEffect(() => { setZoom(1); setPanX(0); setPanY(0); }, [activeRes]);

  const availableResolutions = useMemo(() => {
    if (!data) return [];
    return RESOLUTION_ORDER.filter(k => data.resolutions[k]);
  }, [data]);

  // Default to "very_large" if available, otherwise largest available
  useEffect(() => {
    if (!data) return;
    if (data.resolutions[activeRes]) return;
    const fallback = availableResolutions[1] ?? availableResolutions[0] ?? null;
    if (fallback) setActiveRes(fallback);
  }, [data, activeRes, availableResolutions]);

  const current = data?.resolutions[activeRes];

  // ── Zoom / pan handlers ──────────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dz = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setZoom(z => Math.max(1, Math.min(20, z * dz)));
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    setDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPanX: panX, startPanY: panY };
  }, [zoom, panX, panY]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPanX(dragRef.current.startPanX + dx);
    setPanY(dragRef.current.startPanY + dy);
  }, [dragging]);

  const onMouseUp = useCallback(() => { setDragging(false); dragRef.current = null; }, []);

  const resetView = useCallback(() => { setZoom(1); setPanX(0); setPanY(0); }, []);

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-12 rounded-2xl bg-white/[0.06]" />
        <div className="h-[420px] rounded-2xl bg-white/[0.06]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
        <h3 className="text-sm font-bold text-amber-300">Magyarország NDVI még nem áll rendelkezésre</h3>
        <p className="mt-2 text-[11px] text-slate-400">
          A képet a superadminnak kell legenerálnia a <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[10px]">ndvi_hungary_render</code> job manuális elindításával.
        </p>
        <p className="mt-2 text-[10px] text-slate-500">Részlet: {error}</p>
        <p className="mt-3 text-[10px] text-slate-500">
          Forrás: Sentinel-2 L2A mozaik (Sentinel Hub Process API) · Renderelés 4 felbontásban előre, a felhasználó csak a kész képet tölti le.
        </p>
      </div>
    );
  }

  if (!data || !current) {
    return <p className="text-center py-8 text-[11px] text-slate-600">Nincs rendelkezésre álló render.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Source & acquisition metadata banner */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Forrás műhold</p>
            <p className="mt-1 text-[13px] font-bold text-slate-200">{data.sourceSatellite ?? 'Sentinel-2 L2A'}</p>
            <p className="text-[10px] text-slate-500">{data.sourceProvider ?? 'Sentinel Hub'} mozaik · ≤ {data.cloudCoverPct ?? 30}% felhő</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Felvétel dátuma</p>
            <p className="mt-1 text-[13px] font-bold text-emerald-300">{fmtDateOnly(data.acquisitionLatest)}</p>
            <p className="text-[10px] text-slate-500">
              Időablak: {fmtDateOnly(data.acquisitionFrom)} — {fmtDateOnly(data.acquisitionTo)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Renderelés</p>
            <p className="mt-1 text-[13px] font-bold text-slate-200">{fmtDate(data.renderedAt)}</p>
            <p className="text-[10px] text-slate-500">run_id: <span className="font-mono text-[9px]">{data.runId.slice(0, 8)}…</span></p>
          </div>
        </div>
      </div>

      {/* Resolution + zoom controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1">
          {availableResolutions.map(k => {
            const r = data.resolutions[k];
            return (
              <button
                key={k}
                type="button"
                onClick={() => setActiveRes(k)}
                className={`rounded-xl px-3 py-1.5 text-[10px] font-bold transition-colors ${
                  k === activeRes ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`${r.width} × ${r.height} px · ${fmtMB(r.bytes)}`}
              >
                {RESOLUTION_LABELS[k] ?? k}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2 text-[10px] text-slate-500">
          <span>Zoom: <span className="tabular-nums text-slate-300">{zoom.toFixed(1)}×</span></span>
          <button
            type="button"
            onClick={() => setZoom(z => Math.min(20, z * 1.4))}
            className="rounded-lg border border-white/[0.1] bg-white/[0.03] px-2 py-1 text-slate-300 hover:bg-white/[0.08]"
          >+ Nagyítás</button>
          <button
            type="button"
            onClick={() => setZoom(z => Math.max(1, z / 1.4))}
            className="rounded-lg border border-white/[0.1] bg-white/[0.03] px-2 py-1 text-slate-300 hover:bg-white/[0.08]"
          >− Kicsinyítés</button>
          <button
            type="button"
            onClick={resetView}
            className="rounded-lg border border-white/[0.1] bg-white/[0.03] px-2 py-1 text-slate-300 hover:bg-white/[0.08]"
          >Visszaállít</button>
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-bold text-emerald-300 hover:bg-emerald-500/20"
            title="Eredeti felbontásban új lapon megnyit"
          >Új lapon ↗</a>
        </div>
      </div>

      {/* Image viewport with zoom + pan */}
      <div
        ref={viewportRef}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        className={`relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 ${zoom > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'}`}
        style={{ aspectRatio: `${current.width} / ${current.height}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={`Magyarország NDVI · ${fmtDateOnly(data.acquisitionLatest)} · ${current.width}×${current.height}`}
          draggable={false}
          className="absolute inset-0 h-full w-full select-none object-contain"
          style={{
            transform:        `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin:  'center center',
            transition:       dragging ? 'none' : 'transform 0.12s ease-out',
            imageRendering:   zoom > 4 ? 'pixelated' : 'auto',
          }}
        />
        {/* Acquisition badge */}
        <div className="absolute bottom-3 left-3 rounded-xl bg-black/60 px-3 py-1.5 backdrop-blur-sm">
          <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-300">Sentinel-2 felvétel</p>
          <p className="text-[11px] font-bold text-white">{fmtDateOnly(data.acquisitionLatest)}</p>
        </div>
        <div className="absolute bottom-3 right-3 rounded-xl bg-black/60 px-3 py-1.5 backdrop-blur-sm">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Felbontás</p>
          <p className="text-[11px] font-bold text-white tabular-nums">{current.width} × {current.height}</p>
        </div>
      </div>

      {/* Color scale legend */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">NDVI színkód</p>
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-6 rounded" style={{ backgroundColor: '#1a5e25' }} />≥ 0.50 sűrű növényzet</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-6 rounded" style={{ backgroundColor: '#4cbf4c' }} />0.35–0.50 jó</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-6 rounded" style={{ backgroundColor: '#a6d959' }} />0.20–0.35 mérsékelt</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-6 rounded" style={{ backgroundColor: '#f2d966' }} />0.10–0.20 ritka</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-6 rounded" style={{ backgroundColor: '#d9aa6b' }} />0.00–0.10 kopár</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-6 rounded" style={{ backgroundColor: '#61699e' }} />&lt; 0 víz / beépített</span>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">
          Egérgörgővel zoomolható, húzással mozgatható (zoom &gt; 1×). Az „Új lapon ↗” gomb a kép eredeti felbontását nyitja külön — ott a böngésző natív végtelen-zoom-ja érhető el.
        </p>
      </div>
    </div>
  );
}
