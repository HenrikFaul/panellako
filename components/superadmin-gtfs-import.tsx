'use client';

import { useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type FileType =
  | 'feed_info' | 'stops' | 'routes' | 'calendar_dates'
  | 'pathways'  | 'shapes' | 'translations' | 'stop_routes' | 'trips';

interface FileConfig {
  id:          FileType;
  filename:    string;
  description: string;
  table:       string;
  hint?:       string;
}

type Status = 'idle' | 'reading' | 'processing' | 'uploading' | 'done' | 'error';

interface ImportState {
  status:   Status;
  progress: number;  // 0–100
  total:    number;
  sent:     number;
  message:  string;
}

const INIT: ImportState = { status: 'idle', progress: 0, total: 0, sent: 0, message: '' };

const FILE_CONFIGS: FileConfig[] = [
  { id: 'feed_info',       filename: 'feed_info.txt',       table: 'gtfs_feed_info',         description: 'Feed metaadatok' },
  { id: 'stops',           filename: 'stops.txt',            table: 'transit_stops',          description: 'Megállók' },
  { id: 'routes',          filename: 'routes.txt',           table: 'transit_routes',         description: 'Járatok' },
  { id: 'calendar_dates',  filename: 'calendar_dates.txt',   table: 'gtfs_calendar_dates',    description: 'Menetrendi napok' },
  { id: 'pathways',        filename: 'pathways.txt',         table: 'gtfs_pathways',          description: 'Állomás átjárók' },
  { id: 'shapes',          filename: 'shapes.txt',           table: 'gtfs_shapes',            description: 'Járat vonalak', hint: 'Nagy fájl — eltarthat egy ideig' },
  { id: 'translations',    filename: 'translations.txt',     table: 'gtfs_translations',      description: 'Fordítások' },
  { id: 'stop_routes',     filename: 'trips.txt + stop_times.txt', table: 'gtfs_trips + transit_stop_routes', description: 'Trips + megálló–járat kapcsolatok', hint: 'trips.txt → gtfs_trips-be importál + memória-map, aztán stop_times.txt streamelve' },
];

const STATUS_COLOR: Record<Status, string> = {
  idle:       'text-slate-400',
  reading:    'text-blue-500',
  processing: 'text-amber-500',
  uploading:  'text-indigo-500',
  done:       'text-emerald-600',
  error:      'text-red-600',
};

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function parseCsvRow(line: string): string[] {
  const vals: string[] = [];
  let cur = ''; let q = false;
  for (const ch of line) {
    if (ch === '"') { q = !q; continue; }
    if (ch === ',' && !q) { vals.push(cur); cur = ''; continue; }
    cur += ch;
  }
  vals.push(cur);
  return vals;
}

function parseCsvText(raw: string): Array<Record<string, string>> {
  const text = raw.replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvRow(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = parseCsvRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (vals[i] ?? '').trim(); });
    return row;
  });
}

async function streamLinesFromFile(
  file: File,
  onLine: (line: string, isFirst: boolean) => void,
  onProgress: (pct: number) => void,
): Promise<void> {
  const total  = file.size;
  let   read   = 0;
  let   buffer = '';
  let   first  = true;

  const stream = file.stream().pipeThrough(new TextDecoderStream());
  const reader = stream.getReader();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      if (buffer.trim()) { onLine(buffer.replace(/^﻿/, ''), first); }
      break;
    }
    read += new Blob([value]).size;
    onProgress(Math.min(99, Math.round(read / total * 100)));
    buffer += value;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      onLine(first ? line.replace(/^﻿/, '') : line, first);
      first = false;
    }
  }
}

// ─── Batch API sender ─────────────────────────────────────────────────────────

async function sendBatches(
  fileType: FileType,
  rows: Record<string, string>[],
  onProgress: (sent: number, total: number) => void,
): Promise<{ imported: number; skipped: number }> {
  const BATCH = 500;
  let imported = 0; let skipped = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const res = await fetch('/api/superadmin/gtfs/import', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ fileType, rows: batch }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    const body = await res.json() as { imported: number; skipped: number };
    imported += body.imported;
    skipped  += body.skipped;
    onProgress(Math.min(i + BATCH, rows.length), rows.length);
  }
  return { imported, skipped };
}

async function sendBatchesDirect(
  fileType: FileType,
  rows: Array<{ stop_id: string; route_id: string }>,
  onProgress: (sent: number, total: number) => void,
): Promise<{ imported: number; skipped: number }> {
  return sendBatches(fileType, rows as unknown as Record<string, string>[], onProgress);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SuperadminGtfsImport() {
  const [states,   setStates]   = useState<Record<string, ImportState>>({});
  const [tripsMap, setTripsMap] = useState<Map<string, string> | null>(null);
  const [tripsMsg, setTripsMsg] = useState('');
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function setState(id: string, patch: Partial<ImportState>) {
    setStates(prev => ({ ...prev, [id]: { ...(prev[id] ?? INIT), ...patch } }));
  }

  // ── Generic file import ───────────────────────────────────────────────────

  async function importFile(cfg: FileConfig, file: File) {
    setState(cfg.id, { status: 'reading', progress: 5, message: 'Fájl olvasása…', total: 0, sent: 0 });
    try {
      const text = await file.text();
      setState(cfg.id, { status: 'processing', progress: 20, message: 'CSV feldolgozás…' });
      const rows = parseCsvText(text);
      setState(cfg.id, { status: 'uploading', progress: 30, total: rows.length, message: `${rows.length} sor feltöltése…` });
      const result = await sendBatches(cfg.id, rows, (sent, total) => {
        setState(cfg.id, { progress: 30 + Math.round(sent / total * 70), sent, total });
      });
      setState(cfg.id, {
        status: 'done', progress: 100,
        message: `✓ ${result.imported} importálva, ${result.skipped} kihagyva`,
      });
    } catch (err) {
      setState(cfg.id, { status: 'error', progress: 0, message: `✗ ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  // ── Special: trips.txt → imports to gtfs_trips AND builds in-memory map ─────

  async function loadTrips(file: File) {
    setTripsMsg('trips.txt olvasása…');
    try {
      const text = await file.text();
      const rows = parseCsvText(text);
      const map  = new Map<string, string>();
      for (const r of rows) {
        if (r.trip_id && r.route_id) map.set(r.trip_id, r.route_id);
      }
      setTripsMap(map);
      setTripsMsg(`${map.size.toLocaleString('hu-HU')} trip — feltöltés DB-be…`);
      const result = await sendBatches('trips', rows, (sent, total) => {
        setTripsMsg(`DB feltöltés: ${sent.toLocaleString('hu-HU')} / ${total.toLocaleString('hu-HU')}…`);
      });
      setTripsMsg(`✓ ${result.imported.toLocaleString('hu-HU')} trip importálva (gtfs_trips) — most add meg a stop_times.txt-t`);
    } catch (err) {
      setTripsMsg(`✗ ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Special: stop_times.txt → streams, extracts unique stop–route pairs ──

  async function importStopTimes(file: File) {
    if (!tripsMap) return;
    setState('stop_routes', { status: 'processing', progress: 0, message: 'Streaming stop_times.txt…', total: 0, sent: 0 });
    const pairSet = new Set<string>();
    let   lineNum = 0;
    let   headers: string[] | null = null;
    let   stopIdx = -1, tripIdx = -1;

    try {
      await streamLinesFromFile(
        file,
        (line, isFirst) => {
          if (isFirst) {
            headers = parseCsvRow(line).map(h => h.trim());
            stopIdx = headers.indexOf('stop_id');
            tripIdx = headers.indexOf('trip_id');
            return;
          }
          lineNum++;
          if (stopIdx === -1 || tripIdx === -1) return;
          const vals = parseCsvRow(line);
          const stopId  = vals[stopIdx]?.trim();
          const tripId  = vals[tripIdx]?.trim();
          if (!stopId || !tripId) return;
          const routeId = tripsMap.get(tripId);
          if (!routeId) return;
          pairSet.add(`${stopId}|${routeId}`);
        },
        pct => {
          if (lineNum % 100_000 === 0 || pct % 5 === 0) {
            setState('stop_routes', {
              progress: Math.round(pct * 0.6),
              message: `${(lineNum / 1_000_000).toFixed(1)}M sor → ${pairSet.size.toLocaleString('hu-HU')} egyedi pár`,
            });
          }
        },
      );

      const pairs = Array.from(pairSet).map(k => {
        const [stop_id, route_id] = k.split('|');
        return { stop_id, route_id };
      });

      setState('stop_routes', { status: 'uploading', progress: 60, total: pairs.length, message: `${pairs.length.toLocaleString('hu-HU')} pár feltöltése…` });

      const result = await sendBatchesDirect('stop_routes', pairs, (sent, total) => {
        setState('stop_routes', { progress: 60 + Math.round(sent / total * 40), sent, total });
      });

      setState('stop_routes', {
        status: 'done', progress: 100,
        message: `✓ ${result.imported.toLocaleString('hu-HU')} pár importálva`,
      });
    } catch (err) {
      setState('stop_routes', { status: 'error', progress: 0, message: `✗ ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-lg font-black text-slate-900">GTFS Adatbetöltés</h2>
      <p className="mb-5 text-xs text-slate-500">
        Csomagold ki a BKK GTFS zip-et, majd töltsd fel a fájlokat egyenként. A megálló–járat kapcsolatokhoz
        először a <code className="rounded bg-slate-100 px-1">trips.txt</code>, majd a{' '}
        <code className="rounded bg-slate-100 px-1">stop_times.txt</code> szükséges (böngészőben streameli).
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {FILE_CONFIGS.filter(c => c.id !== 'stop_routes').map(cfg => {
          const st = states[cfg.id] ?? INIT;
          return (
            <div key={cfg.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3">
              <div>
                <p className="text-xs font-bold text-slate-800">{cfg.description}</p>
                <p className="font-mono text-[10px] text-slate-400">{cfg.filename}</p>
                <p className="text-[10px] text-slate-400">→ {cfg.table}</p>
                {cfg.hint && <p className="mt-0.5 text-[10px] text-amber-500">{cfg.hint}</p>}
              </div>

              {st.status !== 'idle' && (
                <>
                  {st.status !== 'done' && st.status !== 'error' && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${st.progress}%` }}
                      />
                    </div>
                  )}
                  <p className={`text-[11px] font-medium ${STATUS_COLOR[st.status]}`}>{st.message}</p>
                  {st.total > 0 && st.status === 'uploading' && (
                    <p className="text-[10px] text-slate-400">{st.sent.toLocaleString('hu-HU')} / {st.total.toLocaleString('hu-HU')} sor</p>
                  )}
                </>
              )}

              <input
                type="file"
                accept=".txt,.csv"
                className="hidden"
                ref={el => { fileRefs.current[cfg.id] = el; }}
                onChange={async e => {
                  const f = e.target.files?.[0];
                  if (f) await importFile(cfg, f);
                  if (e.target) e.target.value = '';
                }}
              />
              <button
                onClick={() => fileRefs.current[cfg.id]?.click()}
                disabled={st.status === 'uploading' || st.status === 'reading' || st.status === 'processing'}
                className={`mt-auto rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-40 ${
                  st.status === 'done'
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {st.status === 'done' ? '↻ Újra' : st.status === 'idle' ? 'Fájl választása' : 'Folyamatban…'}
              </button>
            </div>
          );
        })}

        {/* Special card: stop routes (trips + stop_times) */}
        {(() => {
          const st = states['stop_routes'] ?? INIT;
          return (
            <div className="flex flex-col gap-2 rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-3 sm:col-span-2">
              <div>
                <p className="text-xs font-bold text-slate-800">Megálló–járat kapcsolatok</p>
                <p className="font-mono text-[10px] text-slate-400">trips.txt + stop_times.txt</p>
                <p className="text-[10px] text-slate-400">→ transit_stop_routes</p>
                <p className="mt-0.5 text-[10px] text-amber-500">2 lépéses folyamat — stop_times.txt streamelve</p>
              </div>

              {/* Step 1: trips */}
              <div className="flex items-center gap-2">
                <input
                  type="file" accept=".txt,.csv" className="hidden"
                  ref={el => { fileRefs.current['trips'] = el; }}
                  onChange={async e => {
                    const f = e.target.files?.[0];
                    if (f) await loadTrips(f);
                    if (e.target) e.target.value = '';
                  }}
                />
                <button
                  onClick={() => fileRefs.current['trips']?.click()}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    tripsMap
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  1. trips.txt
                </button>
                {tripsMsg && <p className="text-[10px] text-slate-600">{tripsMsg}</p>}
              </div>

              {/* Step 2: stop_times */}
              {st.status !== 'idle' && (
                <>
                  {(st.status === 'processing' || st.status === 'uploading') && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${st.progress}%` }}
                      />
                    </div>
                  )}
                  <p className={`text-[11px] font-medium ${STATUS_COLOR[st.status]}`}>{st.message}</p>
                </>
              )}

              <input
                type="file" accept=".txt,.csv" className="hidden"
                ref={el => { fileRefs.current['stop_times'] = el; }}
                onChange={async e => {
                  const f = e.target.files?.[0];
                  if (f) await importStopTimes(f);
                  if (e.target) e.target.value = '';
                }}
              />
              <button
                onClick={() => fileRefs.current['stop_times']?.click()}
                disabled={!tripsMap || st.status === 'processing' || st.status === 'uploading'}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-40 ${
                  st.status === 'done'
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {!tripsMap
                  ? '2. stop_times.txt (előbb trips.txt kell)'
                  : st.status === 'done'
                    ? '↻ stop_times.txt újra'
                    : st.status === 'idle'
                      ? '2. stop_times.txt (stream)'
                      : 'Feldolgozás…'}
              </button>
            </div>
          );
        })()}
      </div>
    </section>
  );
}
