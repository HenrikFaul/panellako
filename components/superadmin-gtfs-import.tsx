'use client';

import { useRef, useState } from 'react';
import { unzip } from 'fflate';

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
  const [states,      setStates]      = useState<Record<string, ImportState>>({});
  const [tripsMap,    setTripsMap]    = useState<Map<string, string> | null>(null);
  const [tripsMsg,    setTripsMsg]    = useState('');
  const [chainStatus, setChainStatus] = useState<string>('');
  const [chainRunning,setChainRunning]= useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function setState(id: string, patch: Partial<ImportState>) {
    setStates(prev => ({ ...prev, [id]: { ...(prev[id] ?? INIT), ...patch } }));
  }

  // ── Run post-import chain: derive refs → building stops ──────────────────

  async function runPostImportChain() {
    setChainRunning(true);
    try {
      setChainStatus('⏳ Megálló járatreferenciák levezetése…');
      const r1 = await fetch('/api/superadmin/jobs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'gtfs_derive_refs' }),
      });
      const d1 = await r1.json() as { ok: boolean; result?: { updated?: number; note?: string }; error?: string };
      if (!d1.ok) {
        setChainStatus(`✗ Járatrefs hiba: ${d1.result?.note ?? d1.error ?? 'ismeretlen hiba'}`);
        setChainRunning(false);
        return;
      }
      setChainStatus(`✓ ${d1.result?.updated ?? 0} megálló frissítve — épület–megálló párok számítása…`);

      const r2 = await fetch('/api/superadmin/jobs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'bkk_building_stops' }),
      });
      const d2 = await r2.json() as { ok: boolean; result?: { body?: { buildingsProcessed?: number } } };
      const processed = d2.result?.body?.buildingsProcessed ?? 0;
      setChainStatus(`✅ Kész! Járatrefs ✓ · Épület–megálló párok: ${processed} épület feldolgozva`);
    } catch (err) {
      setChainStatus(`✗ Hiba: ${err instanceof Error ? err.message : String(err)}`);
    }
    setChainRunning(false);
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
        message: `✓ ${result.imported.toLocaleString('hu-HU')} pár importálva — automatikus levezetés indul…`,
      });

      // Auto-chain: derive route refs → building stops
      await runPostImportChain();
    } catch (err) {
      setState('stop_routes', { status: 'error', progress: 0, message: `✗ ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  // ── ZIP import ────────────────────────────────────────────────────────────

  const [zipStatus,   setZipStatus]   = useState<'idle' | 'extracting' | 'importing' | 'done' | 'error'>('idle');
  const [zipMessage,  setZipMessage]  = useState('');
  const [zipFileProgress, setZipFileProgress] = useState<Record<string, { label: string; pct: number; done: boolean; err: boolean }>>({});
  const zipFileRef = useRef<HTMLInputElement | null>(null);

  function setZipFilePct(filename: string, label: string, pct: number, done = false, err = false) {
    setZipFileProgress(prev => ({ ...prev, [filename]: { label, pct, done, err } }));
  }

  async function importZip(zipFile: File) {
    setZipStatus('extracting');
    setZipMessage('ZIP kibontása…');
    setZipFileProgress({});

    try {
      const buf = await zipFile.arrayBuffer();
      const data = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
        unzip(new Uint8Array(buf), (err, files) => {
          if (err) reject(err);
          else resolve(files);
        });
      });

      // Only top-level .txt files (ignore sub-folders / __MACOSX)
      const entries = Object.entries(data).filter(([name]) => {
        const basename = name.split('/').pop() ?? '';
        return basename.endsWith('.txt') && !name.startsWith('__MACOSX');
      });

      setZipStatus('importing');

      // Build per-file lookup: basename → Uint8Array
      const byName: Record<string, Uint8Array> = {};
      for (const [name, arr] of entries) {
        const basename = name.split('/').pop()!;
        byName[basename] = arr;
      }

      // Decode helper
      function toText(arr: Uint8Array): string {
        return new TextDecoder('utf-8').decode(arr);
      }

      // Process simple files (everything except trips.txt + stop_times.txt)
      const SIMPLE_NAMES = ['feed_info.txt', 'stops.txt', 'routes.txt', 'calendar_dates.txt', 'pathways.txt', 'shapes.txt', 'translations.txt'];
      for (const filename of SIMPLE_NAMES) {
        const arr = byName[filename];
        if (!arr) { setZipFilePct(filename, filename, 0, false, false); continue; }

        const cfg = FILE_CONFIGS.find(c => c.filename === filename);
        if (!cfg) continue;

        setZipFilePct(filename, cfg.description, 5, false, false);
        setState(cfg.id, { status: 'reading', progress: 5, message: 'ZIP-ből olvasva…', total: 0, sent: 0 });
        try {
          const text = toText(arr);
          const rows = parseCsvText(text);
          setState(cfg.id, { status: 'uploading', progress: 30, total: rows.length, message: `${rows.length} sor…` });
          setZipFilePct(filename, cfg.description, 30, false, false);
          const result = await sendBatches(cfg.id, rows, (sent, total) => {
            const pct = 30 + Math.round(sent / total * 70);
            setState(cfg.id, { progress: pct, sent, total });
            setZipFilePct(filename, cfg.description, pct, false, false);
          });
          setState(cfg.id, { status: 'done', progress: 100, message: `✓ ${result.imported} importálva` });
          setZipFilePct(filename, cfg.description, 100, true, false);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setState(cfg.id, { status: 'error', progress: 0, message: `✗ ${msg}` });
          setZipFilePct(filename, cfg.description, 0, false, true);
        }
      }

      // Step 1 of 2-step: trips.txt → gtfs_trips + memory map
      let localTripsMap: Map<string, string> | null = null;
      const tripsArr = byName['trips.txt'];
      if (tripsArr) {
        setZipFilePct('trips.txt', 'Trips', 5, false, false);
        setTripsMsg('trips.txt olvasása (ZIP-ből)…');
        try {
          const text = toText(tripsArr);
          const rows = parseCsvText(text);
          const map = new Map<string, string>();
          for (const r of rows) {
            if (r.trip_id && r.route_id) map.set(r.trip_id, r.route_id);
          }
          localTripsMap = map;
          setTripsMap(map);
          setZipFilePct('trips.txt', 'Trips', 30, false, false);
          setTripsMsg(`${map.size.toLocaleString('hu-HU')} trip — DB-be feltöltés…`);
          const result = await sendBatches('trips', rows, (sent, total) => {
            const pct = 30 + Math.round(sent / total * 70);
            setZipFilePct('trips.txt', 'Trips', pct, false, false);
            setTripsMsg(`DB feltöltés: ${sent.toLocaleString('hu-HU')} / ${total.toLocaleString('hu-HU')}…`);
          });
          setTripsMap(map);
          setTripsMsg(`✓ ${result.imported.toLocaleString('hu-HU')} trip importálva`);
          setZipFilePct('trips.txt', 'Trips', 100, true, false);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setTripsMsg(`✗ ${msg}`);
          setZipFilePct('trips.txt', 'Trips', 0, false, true);
        }
      }

      // Step 2 of 2-step: stop_times.txt → stream from Uint8Array
      const stopTimesArr = byName['stop_times.txt'];
      if (stopTimesArr && localTripsMap) {
        setZipFilePct('stop_times.txt', 'Stop times', 0, false, false);
        setState('stop_routes', { status: 'processing', progress: 0, message: 'ZIP stop_times streaming…', total: 0, sent: 0 });

        const pairSet = new Set<string>();
        let lineNum = 0;
        let headers: string[] | null = null;
        let stopIdx = -1, tripIdx = -1;
        const totalBytes = stopTimesArr.byteLength;

        try {
          const text = new TextDecoder('utf-8').decode(stopTimesArr);
          const lines = text.replace(/^﻿/, '').split(/\r?\n/);
          for (let li = 0; li < lines.length; li++) {
            const line = lines[li].trim();
            if (!line) continue;
            if (headers === null) {
              headers = parseCsvRow(line).map(h => h.trim());
              stopIdx = headers.indexOf('stop_id');
              tripIdx = headers.indexOf('trip_id');
              continue;
            }
            lineNum++;
            if (stopIdx === -1 || tripIdx === -1) continue;
            const vals = parseCsvRow(line);
            const stopId  = vals[stopIdx]?.trim();
            const tripId  = vals[tripIdx]?.trim();
            if (!stopId || !tripId) continue;
            const routeId = localTripsMap.get(tripId);
            if (!routeId) continue;
            pairSet.add(`${stopId}|${routeId}`);

            if (lineNum % 200_000 === 0) {
              const pct = Math.round(li / lines.length * 60);
              setState('stop_routes', { progress: pct, message: `${(lineNum / 1_000_000).toFixed(1)}M sor → ${pairSet.size.toLocaleString('hu-HU')} pár` });
              setZipFilePct('stop_times.txt', 'Stop times', pct, false, false);
              // yield to UI
              await new Promise(r => setTimeout(r, 0));
            }
          }
          void totalBytes; // suppress unused warning

          const pairs = Array.from(pairSet).map(k => {
            const [stop_id, route_id] = k.split('|');
            return { stop_id, route_id };
          });

          setState('stop_routes', { status: 'uploading', progress: 60, total: pairs.length, message: `${pairs.length.toLocaleString('hu-HU')} pár feltöltése…` });
          const result = await sendBatchesDirect('stop_routes', pairs, (sent, total) => {
            const pct = 60 + Math.round(sent / total * 40);
            setState('stop_routes', { progress: pct, sent, total });
            setZipFilePct('stop_times.txt', 'Stop times', pct, false, false);
          });
          setState('stop_routes', { status: 'done', progress: 100, message: `✓ ${result.imported.toLocaleString('hu-HU')} pár importálva` });
          setZipFilePct('stop_times.txt', 'Stop times', 100, true, false);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setState('stop_routes', { status: 'error', progress: 0, message: `✗ ${msg}` });
          setZipFilePct('stop_times.txt', 'Stop times', 0, false, true);
        }
      }

      setZipStatus('done');
      setZipMessage('✅ ZIP importálva — automatikus levezetés indul…');
      await runPostImportChain();
      setZipMessage('✅ ZIP import kész, chain lefutott.');
    } catch (err) {
      setZipStatus('error');
      setZipMessage(`✗ ZIP hiba: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-slate-900">GTFS Adatbetöltés</h2>
      <p className="mb-3 text-xs text-slate-500">
        Csomagold ki a BKK GTFS zip-et, majd töltsd fel a fájlokat egyenként. A megálló–járat kapcsolatokhoz
        először a <code className="rounded bg-slate-100 px-1">trips.txt</code>, majd a{' '}
        <code className="rounded bg-slate-100 px-1">stop_times.txt</code> szükséges. Az import után automatikusan
        lefut a járatrefs-levezetés és az épület–megálló párok számítása.
      </p>

      {/* ZIP import card */}
      <div className="mb-4 flex flex-col gap-3 rounded-xl border-2 border-emerald-200 bg-emerald-50/60 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">📦 GTFS ZIP import</p>
            <p className="text-[11px] text-slate-500">
              Töltsd fel az egész BKK GTFS zip-et — a böngésző kicsomagolja és automatikusan importálja az összes fájlt.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <input
              type="file"
              accept=".zip"
              className="hidden"
              ref={zipFileRef}
              onChange={async e => {
                const f = e.target.files?.[0];
                if (f) await importZip(f);
                if (e.target) e.target.value = '';
              }}
            />
            <button
              onClick={() => zipFileRef.current?.click()}
              disabled={zipStatus === 'extracting' || zipStatus === 'importing'}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
                zipStatus === 'done'
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {zipStatus === 'extracting' ? 'Kibontás…'
                : zipStatus === 'importing' ? 'Importálás…'
                : zipStatus === 'done' ? '↻ ZIP újra'
                : '📂 ZIP fájl választása'}
            </button>
          </div>
        </div>

        {zipMessage && (
          <p className={`text-[11px] font-semibold ${zipStatus === 'error' ? 'text-red-600' : zipStatus === 'done' ? 'text-emerald-700' : 'text-slate-700'}`}>
            {zipMessage}
          </p>
        )}

        {Object.keys(zipFileProgress).length > 0 && (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(zipFileProgress).map(([fname, info]) => (
              <div key={fname} className="rounded-lg border border-slate-200 bg-white p-2">
                <p className="truncate text-[10px] font-bold text-slate-700">{info.label}</p>
                <p className="truncate font-mono text-[9px] text-slate-400">{fname}</p>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${info.err ? 'bg-red-400' : info.done ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                    style={{ width: `${info.err ? 100 : info.pct}%` }}
                  />
                </div>
                <p className={`mt-0.5 text-[9px] font-medium ${info.err ? 'text-red-500' : info.done ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {info.err ? '✗ hiba' : info.done ? '✓ kész' : `${info.pct}%`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto-chain status / Finish-from-DB button */}
      <div className="mb-5 flex flex-col gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-700">Automatikus lezárás (ha az adatok már fenn vannak)</p>
            <p className="text-[10px] text-slate-500">
              Ha trips.txt + stop_times.txt már importálva volt egy korábbi session során, kattints ide —
              lefuttatja a megálló-járatrefs levezetést és az épület–megálló számítást.
            </p>
          </div>
          <button
            onClick={runPostImportChain}
            disabled={chainRunning}
            className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {chainRunning ? 'Fut…' : '▶ Automatikus befejezés'}
          </button>
        </div>
        {chainStatus && (
          <p className={`text-[11px] font-medium ${chainStatus.startsWith('✅') ? 'text-emerald-700' : chainStatus.startsWith('✗') ? 'text-red-600' : 'text-indigo-700'}`}>
            {chainStatus}
          </p>
        )}
      </div>

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
