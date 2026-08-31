'use client';

import { useRef, useState } from 'react';
import { unzip } from 'fflate';
import { useI18n } from '@/src/i18n/useI18n';
import {
  acquireAdminRequestKey,
  isTerminalAdminCommandResponse,
  releaseAdminRequestKey,
} from '@/lib/superadmin/idempotency-client';

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

const MAX_ZIP_COMPRESSED_BYTES = 128 * 1024 * 1024;
const MAX_ZIP_UNCOMPRESSED_BYTES = 768 * 1024 * 1024;
const MAX_ZIP_ENTRY_BYTES = 512 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 64;
const MAX_CSV_ROWS = 2_000_000;
const MAX_STOP_TIME_ROWS = 10_000_000;
const MAX_TEXT_FILE_BYTES = 512 * 1024 * 1024;
const ZIP_REQUIRED_HEADERS: Readonly<Record<string, readonly string[]>> = {
  'stops.txt': ['stop_id', 'stop_name'],
  'routes.txt': ['route_id', 'route_type'],
  'trips.txt': ['route_id', 'service_id', 'trip_id'],
  'stop_times.txt': ['trip_id', 'stop_id', 'stop_sequence'],
};
const GTFS_ERROR_I18N_KEYS: Readonly<Record<string, string>> = {
  GTFS_CSV_UNTERMINATED_QUOTE: 'unterminatedQuote',
  GTFS_FILE_TOO_LARGE: 'fileTooLarge',
  GTFS_INVALID_HEADERS: 'invalidHeaders',
  GTFS_REQUIRED_FILE_EMPTY: 'requiredFileEmpty',
  GTFS_REQUIRED_FILE_MISSING: 'requiredFileMissing',
  GTFS_REQUIRED_HEADER_MISSING: 'requiredHeaderMissing',
  GTFS_ROW_LIMIT_EXCEEDED: 'rowLimitExceeded',
  GTFS_STOP_ROUTES_EMPTY: 'stopRoutesEmpty',
  GTFS_TRIPS_MAP_EMPTY: 'tripsMapEmpty',
  GTFS_ZIP64_UNSUPPORTED: 'zip64Unsupported',
  GTFS_ZIP_COMPRESSED_LIMIT_EXCEEDED: 'zipCompressedTooLarge',
  GTFS_ZIP_DUPLICATE_FILE: 'zipDuplicateFile',
  GTFS_ZIP_ENTRY_LIMIT_EXCEEDED: 'zipEntryLimitExceeded',
  GTFS_ZIP_ENTRY_TOO_LARGE: 'zipEntryTooLarge',
  GTFS_ZIP_INVALID: 'zipInvalid',
  GTFS_ZIP_UNCOMPRESSED_LIMIT_EXCEEDED: 'zipUncompressedTooLarge',
};

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
  reading:    'text-sky-300',
  processing: 'text-amber-300',
  uploading:  'text-violet-300',
  done:       'text-emerald-300',
  error:      'text-rose-300',
};

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function parseCsvRecords(
  raw: string,
  maxRecords = MAX_CSV_ROWS + 1,
): string[][] {
  const text = raw.replace(/^﻿/, '');
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;

  const finishRecord = () => {
    record.push(field);
    if (record.some(value => value.trim().length > 0)) records.push(record);
    if (records.length > maxRecords) throw new Error('GTFS_ROW_LIMIT_EXCEEDED');
    record = [];
    field = '';
  };

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      finishRecord();
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error('GTFS_CSV_UNTERMINATED_QUOTE');
  if (field.length > 0 || record.length > 0) finishRecord();
  return records;
}

class AdminMutationError extends Error {
  readonly stepUpHref: string | null;

  constructor(code: string, stepUpHref?: unknown) {
    super(code);
    this.stepUpHref = typeof stepUpHref === 'string' && stepUpHref.startsWith('/account/security?')
      ? stepUpHref
      : null;
  }
}

function parseCsvRow(line: string): string[] {
  return parseCsvRecords(line, 1)[0] ?? [];
}

export function parseCsvText(raw: string, maxRows = MAX_CSV_ROWS): Array<Record<string, string>> {
  const records = parseCsvRecords(raw, maxRows + 1);
  if (records.length < 2) return [];
  const headers = records[0].map(header => header.trim());
  if (headers.length === 0 || headers.some(header => !header)) throw new Error('GTFS_INVALID_HEADERS');
  return records.slice(1).map(vals => {
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (vals[i] ?? '').trim(); });
    return row;
  });
}

function inspectZipCentralDirectory(bytes: Uint8Array): Array<{ name: string; compressedSize: number; uncompressedSize: number }> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimumOffset = Math.max(0, bytes.byteLength - 65_557);
  let endOffset = -1;
  for (let offset = bytes.byteLength - 22; offset >= minimumOffset; offset--) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw new Error('GTFS_ZIP_INVALID');
  const entryCount = view.getUint16(endOffset + 10, true);
  const directoryOffset = view.getUint32(endOffset + 16, true);
  if (entryCount > MAX_ZIP_ENTRIES) throw new Error('GTFS_ZIP_ENTRY_LIMIT_EXCEEDED');
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const entries: Array<{ name: string; compressedSize: number; uncompressedSize: number }> = [];
  let offset = directoryOffset;
  for (let index = 0; index < entryCount; index++) {
    if (offset + 46 > bytes.byteLength || view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error('GTFS_ZIP_INVALID');
    }
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) throw new Error('GTFS_ZIP64_UNSUPPORTED');
    if (uncompressedSize > MAX_ZIP_ENTRY_BYTES) throw new Error('GTFS_ZIP_ENTRY_TOO_LARGE');
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > bytes.byteLength) throw new Error('GTFS_ZIP_INVALID');
    entries.push({ name: decoder.decode(bytes.slice(nameStart, nameEnd)), compressedSize, uncompressedSize });
    offset = nameEnd + extraLength + commentLength;
  }
  const totalUncompressed = entries.reduce((total, entry) => total + entry.uncompressedSize, 0);
  if (totalUncompressed > MAX_ZIP_UNCOMPRESSED_BYTES) throw new Error('GTFS_ZIP_UNCOMPRESSED_LIMIT_EXCEEDED');
  return entries;
}

function validateRequiredZipFiles(byName: Record<string, Uint8Array>): void {
  for (const [filename, expectedHeaders] of Object.entries(ZIP_REQUIRED_HEADERS)) {
    const data = byName[filename];
    if (!data) throw new Error(`GTFS_REQUIRED_FILE_MISSING:${filename}`);
    const headerSample = new TextDecoder('utf-8', { fatal: false }).decode(data.slice(0, Math.min(data.byteLength, 64 * 1024)));
    const headerLine = headerSample.replace(/^﻿/, '').split(/\r?\n/, 1)[0] ?? '';
    const headers = parseCsvRow(headerLine).map(header => header.trim());
    const missing = expectedHeaders.filter(header => !headers.includes(header));
    if (missing.length > 0) throw new Error(`GTFS_REQUIRED_HEADER_MISSING:${filename}:${missing.join(',')}`);
  }
}

// ─── Batch API sender ─────────────────────────────────────────────────────────

function shortBatchFingerprint(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
    second ^= second >>> 13;
  }
  return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`;
}

async function sendBatches(
  fileType: FileType,
  rows: Record<string, string>[],
  reason: string,
  onProgress: (sent: number, total: number) => void,
): Promise<{ imported: number; skipped: number }> {
  const BATCH = 500;
  let imported = 0; let skipped = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    // Each 500-row batch is its own globally coordinated command. The short,
    // deterministic content scope retains both UUIDs across transport failure
    // and a later retry in this browser tab. This is not a file-wide lock.
    const batchIndex = Math.floor(i / BATCH);
    const fingerprint = shortBatchFingerprint(JSON.stringify({
      fileType,
      batchIndex,
      totalRows: rows.length,
      rows: batch,
    }));
    const batchScope = `gtfs-batch:${fileType}:${batchIndex}:${fingerprint}`;
    const batchIdScope = `${batchScope}:batch-id`;
    const requestKeyScope = `${batchScope}:request`;
    const batchId = acquireAdminRequestKey(batchIdScope);
    const idempotencyKey = acquireAdminRequestKey(requestKeyScope);
    const requestBody = JSON.stringify({ fileType, rows: batch, batchId, idempotencyKey, reason });
    let res: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await fetch('/api/superadmin/gtfs/import', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    requestBody,
        });
        break;
      } catch {
        if (attempt === 1) throw new Error('GTFS_IMPORT_REQUEST_FAILED');
      }
    }
    if (!res) throw new Error('GTFS_IMPORT_REQUEST_FAILED');
    const parsedBody = await res.json().catch(() => null) as unknown;
    const knownJson = parsedBody && typeof parsedBody === 'object' && !Array.isArray(parsedBody)
      ? parsedBody as Record<string, unknown>
      : null;
    const terminalBatchResponse = knownJson && (
      isTerminalAdminCommandResponse(knownJson)
      || (Number.isSafeInteger(knownJson.imported) && Number.isSafeInteger(knownJson.skipped))
    );
    if (terminalBatchResponse) {
      releaseAdminRequestKey(batchIdScope);
      releaseAdminRequestKey(requestKeyScope);
    }
    if (!knownJson) throw new AdminMutationError('GTFS_IMPORT_REQUEST_FAILED');
    if (!res.ok) {
      throw new AdminMutationError(
        typeof knownJson.error === 'string'
          ? knownJson.error
          : 'GTFS_IMPORT_REQUEST_FAILED',
        knownJson.stepUpHref,
      );
    }
    if (!Number.isSafeInteger(knownJson.imported) || !Number.isSafeInteger(knownJson.skipped)) {
      throw new AdminMutationError('GTFS_IMPORT_REQUEST_FAILED');
    }
    imported += Number(knownJson.imported);
    skipped  += Number(knownJson.skipped);
    onProgress(Math.min(i + BATCH, rows.length), rows.length);
  }
  return { imported, skipped };
}

async function sendBatchesDirect(
  fileType: FileType,
  rows: Array<{ stop_id: string; route_id: string }>,
  reason: string,
  onProgress: (sent: number, total: number) => void,
): Promise<{ imported: number; skipped: number }> {
  return sendBatches(fileType, rows as unknown as Record<string, string>[], reason, onProgress);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SuperadminGtfsImport({ canMutate = true }: { canMutate?: boolean }) {
  const { t } = useI18n();
  const [states,      setStates]      = useState<Record<string, ImportState>>({});
  const [tripsMap,    setTripsMap]    = useState<Map<string, string> | null>(null);
  const [tripsMsg,    setTripsMsg]    = useState('');
  const [chainStatus, setChainStatus] = useState<string>('');
  const [chainRunning,setChainRunning]= useState(false);
  const [chainArmed,  setChainArmed]  = useState(false);
  const [operationReason, setOperationReason] = useState('');
  const [stepUpHref, setStepUpHref] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const normalizedReason = operationReason.trim();
  const reasonValid = normalizedReason.length >= 10 && normalizedReason.length <= 1_000;

  function setState(id: string, patch: Partial<ImportState>) {
    setStates(prev => ({ ...prev, [id]: { ...(prev[id] ?? INIT), ...patch } }));
  }

  function formatGtfsError(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error);
    const [code, ...details] = raw.split(':');
    const translationKey = GTFS_ERROR_I18N_KEYS[code];
    if (!translationKey) return raw;
    const localized = t(`superadmin.gtfs.errors.${translationKey}`);
    return details.length > 0 ? `${localized} (${details.join(':')})` : localized;
  }

  function captureMutationError(error: unknown): void {
    if (error instanceof AdminMutationError && error.stepUpHref) {
      setStepUpHref(error.stepUpHref);
    }
  }

  // ── Run post-import chain: derive refs → building stops ──────────────────

  async function runPostImportChain(): Promise<boolean> {
    if (!canMutate) {
      setChainStatus('✗ PLATFORM_CAPABILITY_DENIED');
      return false;
    }
    if (!reasonValid) {
      setChainStatus('✗ PLATFORM_REASON_REQUIRED');
      return false;
    }
    setChainArmed(false);
    setChainRunning(true);
    setStepUpHref(null);
    try {
      setChainStatus('⏳ Megálló járatreferenciák levezetése…');
      const refsScope = 'job:gtfs_derive_refs';
      const r1 = await fetch('/api/superadmin/jobs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'gtfs_derive_refs', idempotencyKey: acquireAdminRequestKey(refsScope), reason: normalizedReason }),
      });
      const d1 = await r1.json().catch(() => null) as {
        ok?: boolean;
        result?: { updated?: number; note?: string };
        error?: string;
        stepUpHref?: string;
      } | null;
      if (isTerminalAdminCommandResponse(d1)) releaseAdminRequestKey(refsScope);
      if (!r1.ok || d1?.ok !== true) {
        if (r1.status === 428 && d1?.stepUpHref?.startsWith('/account/security?')) setStepUpHref(d1.stepUpHref);
        setChainStatus(`✗ Járatrefs hiba: ${d1?.result?.note ?? d1?.error ?? 'JOB_REQUEST_FAILED'}`);
        return false;
      }
      setChainStatus(`✓ ${d1.result?.updated ?? 0} megálló frissítve — épület–megálló párok számítása…`);

      const buildingStopsScope = 'job:bkk_building_stops';
      const r2 = await fetch('/api/superadmin/jobs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'bkk_building_stops', idempotencyKey: acquireAdminRequestKey(buildingStopsScope), reason: normalizedReason }),
      });
      const d2 = await r2.json().catch(() => null) as {
        ok?: boolean;
        result?: { body?: { buildingsProcessed?: number }; note?: string };
        error?: string;
        stepUpHref?: string;
      } | null;
      if (isTerminalAdminCommandResponse(d2)) releaseAdminRequestKey(buildingStopsScope);
      if (!r2.ok || d2?.ok !== true) {
        if (r2.status === 428 && d2?.stepUpHref?.startsWith('/account/security?')) setStepUpHref(d2.stepUpHref);
        setChainStatus(`✗ Épület–megálló hiba: ${d2?.result?.note ?? d2?.error ?? 'JOB_REQUEST_FAILED'}`);
        return false;
      }
      const processed = d2.result?.body?.buildingsProcessed ?? 0;
      setChainStatus(`✅ Kész! Járatrefs ✓ · Épület–megálló párok: ${processed} épület feldolgozva`);
      return true;
    } catch {
      setChainStatus('✗ Hiba: JOB_REQUEST_FAILED');
      return false;
    } finally {
      setChainRunning(false);
    }
  }

  // ── Generic file import ───────────────────────────────────────────────────

  async function importFile(cfg: FileConfig, file: File) {
    if (!canMutate) return;
    if (!reasonValid) {
      setState(cfg.id, { status: 'error', progress: 0, message: '✗ PLATFORM_REASON_REQUIRED' });
      return;
    }
    setStepUpHref(null);
    setState(cfg.id, { status: 'reading', progress: 5, message: 'Fájl olvasása…', total: 0, sent: 0 });
    try {
      if (file.size > MAX_TEXT_FILE_BYTES) throw new Error('GTFS_FILE_TOO_LARGE');
      const text = await file.text();
      setState(cfg.id, { status: 'processing', progress: 20, message: 'CSV feldolgozás…' });
      const rows = parseCsvText(text);
      setState(cfg.id, { status: 'uploading', progress: 30, total: rows.length, message: `${rows.length} sor feltöltése…` });
      const result = await sendBatches(cfg.id, rows, normalizedReason, (sent, total) => {
        setState(cfg.id, { progress: 30 + Math.round(sent / total * 70), sent, total });
      });
      setState(cfg.id, {
        status: 'done', progress: 100,
        message: `✓ ${result.imported} importálva, ${result.skipped} kihagyva`,
      });
    } catch (err) {
      captureMutationError(err);
      setState(cfg.id, { status: 'error', progress: 0, message: `✗ ${formatGtfsError(err)}` });
    }
  }

  // ── Special: trips.txt → imports to gtfs_trips AND builds in-memory map ─────

  async function loadTrips(file: File) {
    if (!canMutate) return;
    if (!reasonValid) {
      setTripsMap(null);
      setTripsMsg('✗ PLATFORM_REASON_REQUIRED');
      return;
    }
    setStepUpHref(null);
    setTripsMsg('trips.txt olvasása…');
    setTripsMap(null);
    try {
      if (file.size > MAX_TEXT_FILE_BYTES) throw new Error('GTFS_FILE_TOO_LARGE');
      const text = await file.text();
      const rows = parseCsvText(text);
      const map  = new Map<string, string>();
      for (const r of rows) {
        if (r.trip_id && r.route_id) map.set(r.trip_id, r.route_id);
      }
      if (map.size === 0) throw new Error('GTFS_TRIPS_MAP_EMPTY');
      setTripsMsg(`${map.size.toLocaleString('hu-HU')} trip — feltöltés DB-be…`);
      const result = await sendBatches('trips', rows, normalizedReason, (sent, total) => {
        setTripsMsg(`DB feltöltés: ${sent.toLocaleString('hu-HU')} / ${total.toLocaleString('hu-HU')}…`);
      });
      setTripsMap(map);
      setTripsMsg(`✓ ${result.imported.toLocaleString('hu-HU')} trip importálva (gtfs_trips) — most add meg a stop_times.txt-t`);
    } catch (err) {
      captureMutationError(err);
      setTripsMsg(`✗ ${formatGtfsError(err)}`);
    }
  }

  // ── Special: stop_times.txt → streams, extracts unique stop–route pairs ──

  async function importStopTimes(file: File) {
    if (!canMutate) return;
    if (!tripsMap) return;
    if (!reasonValid) {
      setState('stop_routes', { status: 'error', progress: 0, message: '✗ PLATFORM_REASON_REQUIRED' });
      return;
    }
    setStepUpHref(null);
    setState('stop_routes', { status: 'processing', progress: 0, message: t('superadmin.gtfs.processingStopTimes'), total: 0, sent: 0 });
    const pairSet = new Set<string>();

    try {
      if (file.size > MAX_TEXT_FILE_BYTES) throw new Error('GTFS_FILE_TOO_LARGE');
      const text = await file.text();
      const records = parseCsvRecords(text, MAX_STOP_TIME_ROWS + 1);
      const headers = records[0]?.map(header => header.trim()) ?? [];
      const stopIdx = headers.indexOf('stop_id');
      const tripIdx = headers.indexOf('trip_id');
      if (stopIdx === -1 || tripIdx === -1) throw new Error('GTFS_REQUIRED_HEADER_MISSING:stop_times.txt');

      for (let recordIndex = 1; recordIndex < records.length; recordIndex++) {
        const vals = records[recordIndex];
        const stopId = vals[stopIdx]?.trim();
        const tripId = vals[tripIdx]?.trim();
        if (stopId && tripId) {
          const routeId = tripsMap.get(tripId);
          if (routeId) pairSet.add(`${stopId}|${routeId}`);
        }
        if (recordIndex % 200_000 === 0) {
          const pct = Math.round(recordIndex / records.length * 60);
          setState('stop_routes', {
            progress: pct,
            message: `${(recordIndex / 1_000_000).toFixed(1)}M sor → ${pairSet.size.toLocaleString('hu-HU')} egyedi pár`,
          });
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      const pairs = Array.from(pairSet).map(k => {
        const [stop_id, route_id] = k.split('|');
        return { stop_id, route_id };
      });
      if (pairs.length === 0) throw new Error('GTFS_STOP_ROUTES_EMPTY');

      setState('stop_routes', { status: 'uploading', progress: 60, total: pairs.length, message: `${pairs.length.toLocaleString('hu-HU')} pár feltöltése…` });

      const result = await sendBatchesDirect('stop_routes', pairs, normalizedReason, (sent, total) => {
        setState('stop_routes', { progress: 60 + Math.round(sent / total * 40), sent, total });
      });

      setState('stop_routes', {
        status: 'done', progress: 100,
        message: `✓ ${result.imported.toLocaleString('hu-HU')} pár importálva — automatikus levezetés indul…`,
      });

      // Auto-chain: derive route refs → building stops
      await runPostImportChain();
    } catch (err) {
      captureMutationError(err);
      setState('stop_routes', { status: 'error', progress: 0, message: `✗ ${formatGtfsError(err)}` });
    }
  }

  // ── ZIP import ────────────────────────────────────────────────────────────

  const [zipStatus,   setZipStatus]   = useState<'idle' | 'extracting' | 'importing' | 'done' | 'partial' | 'error'>('idle');
  const [zipMessage,  setZipMessage]  = useState('');
  const [zipFileProgress, setZipFileProgress] = useState<Record<string, { label: string; pct: number; done: boolean; err: boolean }>>({});
  const zipFileRef = useRef<HTMLInputElement | null>(null);

  function setZipFilePct(filename: string, label: string, pct: number, done = false, err = false) {
    setZipFileProgress(prev => ({ ...prev, [filename]: { label, pct, done, err } }));
  }

  async function importZip(zipFile: File) {
    if (!canMutate) return;
    if (!reasonValid) {
      setZipStatus('error');
      setZipMessage('✗ PLATFORM_REASON_REQUIRED');
      return;
    }
    setStepUpHref(null);
    setZipStatus('extracting');
    setZipMessage('ZIP kibontása…');
    setZipFileProgress({});
    setTripsMap(null);
    setTripsMsg('');

    try {
      if (zipFile.size > MAX_ZIP_COMPRESSED_BYTES) throw new Error('GTFS_ZIP_COMPRESSED_LIMIT_EXCEEDED');
      const buf = await zipFile.arrayBuffer();
      const zipBytes = new Uint8Array(buf);
      const metadata = inspectZipCentralDirectory(zipBytes);
      const data = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
        unzip(zipBytes, (err, files) => {
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
        if (byName[basename]) throw new Error(`GTFS_ZIP_DUPLICATE_FILE:${basename}`);
        if (arr.byteLength > MAX_ZIP_ENTRY_BYTES) throw new Error(`GTFS_ZIP_ENTRY_TOO_LARGE:${basename}`);
        byName[basename] = arr;
      }
      const actualUncompressed = Object.values(data).reduce((total, entry) => total + entry.byteLength, 0);
      const declaredUncompressed = metadata.reduce((total, entry) => total + entry.uncompressedSize, 0);
      if (actualUncompressed > MAX_ZIP_UNCOMPRESSED_BYTES || actualUncompressed > declaredUncompressed + 1024) {
        throw new Error('GTFS_ZIP_UNCOMPRESSED_LIMIT_EXCEEDED');
      }
      validateRequiredZipFiles(byName);

      // Decode helper
      function toText(arr: Uint8Array): string {
        return new TextDecoder('utf-8').decode(arr);
      }

      // Process simple files (everything except trips.txt + stop_times.txt)
      const SIMPLE_NAMES = ['feed_info.txt', 'stops.txt', 'routes.txt', 'calendar_dates.txt', 'pathways.txt', 'shapes.txt', 'translations.txt'];
      const requiredSimpleFiles = new Set(['stops.txt', 'routes.txt']);
      let requiredImportFailed = false;
      const optionalFailures: string[] = [];
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
          if (requiredSimpleFiles.has(filename) && rows.length === 0) throw new Error('GTFS_REQUIRED_FILE_EMPTY');
          setState(cfg.id, { status: 'uploading', progress: 30, total: rows.length, message: `${rows.length} sor…` });
          setZipFilePct(filename, cfg.description, 30, false, false);
          const result = await sendBatches(cfg.id, rows, normalizedReason, (sent, total) => {
            const pct = 30 + Math.round(sent / total * 70);
            setState(cfg.id, { progress: pct, sent, total });
            setZipFilePct(filename, cfg.description, pct, false, false);
          });
          setState(cfg.id, { status: 'done', progress: 100, message: `✓ ${result.imported} importálva` });
          setZipFilePct(filename, cfg.description, 100, true, false);
        } catch (err) {
          captureMutationError(err);
          const msg = formatGtfsError(err);
          setState(cfg.id, { status: 'error', progress: 0, message: `✗ ${msg}` });
          setZipFilePct(filename, cfg.description, 0, false, true);
          if (requiredSimpleFiles.has(filename)) requiredImportFailed = true;
          else optionalFailures.push(filename);
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
          if (rows.length === 0) throw new Error('GTFS_REQUIRED_FILE_EMPTY');
          const map = new Map<string, string>();
          for (const r of rows) {
            if (r.trip_id && r.route_id) map.set(r.trip_id, r.route_id);
          }
          if (map.size === 0) throw new Error('GTFS_TRIPS_MAP_EMPTY');
          setZipFilePct('trips.txt', 'Trips', 30, false, false);
          setTripsMsg(`${map.size.toLocaleString('hu-HU')} trip — DB-be feltöltés…`);
          const result = await sendBatches('trips', rows, normalizedReason, (sent, total) => {
            const pct = 30 + Math.round(sent / total * 70);
            setZipFilePct('trips.txt', 'Trips', pct, false, false);
            setTripsMsg(`DB feltöltés: ${sent.toLocaleString('hu-HU')} / ${total.toLocaleString('hu-HU')}…`);
          });
          localTripsMap = map;
          setTripsMap(map);
          setTripsMsg(`✓ ${result.imported.toLocaleString('hu-HU')} trip importálva`);
          setZipFilePct('trips.txt', 'Trips', 100, true, false);
        } catch (err) {
          captureMutationError(err);
          const msg = formatGtfsError(err);
          setTripsMsg(`✗ ${msg}`);
          setZipFilePct('trips.txt', 'Trips', 0, false, true);
          localTripsMap = null;
          setTripsMap(null);
          requiredImportFailed = true;
        }
      } else {
        requiredImportFailed = true;
      }

      // Step 2 of 2-step: stop_times.txt → stream from Uint8Array
      const stopTimesArr = byName['stop_times.txt'];
      if (stopTimesArr && localTripsMap && !requiredImportFailed) {
        setZipFilePct('stop_times.txt', 'Stop times', 0, false, false);
        setState('stop_routes', { status: 'processing', progress: 0, message: 'ZIP stop_times streaming…', total: 0, sent: 0 });

        const pairSet = new Set<string>();
        let rowNum = 0;

        try {
          const text = new TextDecoder('utf-8').decode(stopTimesArr);
          const records = parseCsvRecords(text, MAX_STOP_TIME_ROWS + 1);
          const headers = records[0]?.map(header => header.trim()) ?? [];
          const stopIdx = headers.indexOf('stop_id');
          const tripIdx = headers.indexOf('trip_id');
          if (stopIdx === -1 || tripIdx === -1) throw new Error('GTFS_REQUIRED_HEADER_MISSING:stop_times.txt');
          for (let recordIndex = 1; recordIndex < records.length; recordIndex++) {
            rowNum += 1;
            const vals = records[recordIndex];
            const stopId  = vals[stopIdx]?.trim();
            const tripId  = vals[tripIdx]?.trim();
            if (!stopId || !tripId) continue;
            const routeId = localTripsMap.get(tripId);
            if (!routeId) continue;
            pairSet.add(`${stopId}|${routeId}`);

            if (rowNum % 200_000 === 0) {
              const pct = Math.round(recordIndex / records.length * 60);
              setState('stop_routes', { progress: pct, message: `${(rowNum / 1_000_000).toFixed(1)}M sor → ${pairSet.size.toLocaleString('hu-HU')} pár` });
              setZipFilePct('stop_times.txt', 'Stop times', pct, false, false);
              // yield to UI
              await new Promise(r => setTimeout(r, 0));
            }
          }
          const pairs = Array.from(pairSet).map(k => {
            const [stop_id, route_id] = k.split('|');
            return { stop_id, route_id };
          });
          if (pairs.length === 0) throw new Error('GTFS_STOP_ROUTES_EMPTY');

          setState('stop_routes', { status: 'uploading', progress: 60, total: pairs.length, message: `${pairs.length.toLocaleString('hu-HU')} pár feltöltése…` });
          const result = await sendBatchesDirect('stop_routes', pairs, normalizedReason, (sent, total) => {
            const pct = 60 + Math.round(sent / total * 40);
            setState('stop_routes', { progress: pct, sent, total });
            setZipFilePct('stop_times.txt', 'Stop times', pct, false, false);
          });
          setState('stop_routes', { status: 'done', progress: 100, message: `✓ ${result.imported.toLocaleString('hu-HU')} pár importálva` });
          setZipFilePct('stop_times.txt', 'Stop times', 100, true, false);
        } catch (err) {
          captureMutationError(err);
          const msg = formatGtfsError(err);
          setState('stop_routes', { status: 'error', progress: 0, message: `✗ ${msg}` });
          setZipFilePct('stop_times.txt', 'Stop times', 0, false, true);
          requiredImportFailed = true;
        }
      } else {
        requiredImportFailed = true;
        setState('stop_routes', { status: 'error', progress: 0, message: `✗ ${t('superadmin.gtfs.requiredImportFailed')}` });
        setZipFilePct('stop_times.txt', 'Stop times', 0, false, true);
      }

      if (requiredImportFailed) {
        setZipStatus('error');
        setZipMessage(`✗ ${t('superadmin.gtfs.requiredImportFailed')}`);
        return;
      }

      setZipMessage('✅ ZIP importálva — automatikus levezetés indul…');
      const chainCompleted = await runPostImportChain();
      if (!chainCompleted) {
        setZipStatus('error');
        setZipMessage('✗ A ZIP adatai importálva, de az automatikus levezetés sikertelen.');
        return;
      }
      if (optionalFailures.length > 0) {
        setZipStatus('partial');
        setZipMessage(`⚠ ${t('superadmin.gtfs.optionalImportFailed')}: ${optionalFailures.join(', ')}.`);
      } else {
        setZipStatus('done');
        setZipMessage('✅ ZIP import kész, az automatikus levezetés lefutott.');
      }
    } catch (err) {
      captureMutationError(err);
      setZipStatus('error');
      setZipMessage(`✗ ZIP hiba: ${formatGtfsError(err)}`);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
      <h2 className="mb-1 text-lg font-semibold text-slate-100">GTFS Adatbetöltés</h2>
      <p className="mb-3 text-xs text-slate-500">
        Csomagold ki a BKK GTFS zip-et, majd töltsd fel a fájlokat egyenként. A megálló–járat kapcsolatokhoz
        először a <code className="rounded bg-white/[0.06] px-1 text-slate-300">trips.txt</code>, majd a{' '}
        <code className="rounded bg-white/[0.06] px-1 text-slate-300">stop_times.txt</code> szükséges. Az import után automatikusan
        lefut a járatrefs-levezetés és az épület–megálló párok számítása.
      </p>

      <div className="mb-4">
        <label htmlFor="gtfs-operation-reason" className="block text-xs font-semibold text-slate-200">{t('superadmin.governance.reason')}</label>
        <textarea
          id="gtfs-operation-reason"
          value={operationReason}
          disabled={!canMutate}
          onChange={event => {
            setOperationReason(event.target.value);
            setChainArmed(false);
          }}
          minLength={10}
          maxLength={1_000}
          rows={2}
          aria-describedby="gtfs-operation-reason-hint"
          className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100"
          placeholder={t('superadmin.operationsUi.reasonRequired')}
        />
        <span id="gtfs-operation-reason-hint" className="mt-1 block text-[11px] text-slate-500">
          {t('superadmin.operationsUi.reasonRequired')}
        </span>
      </div>
      {stepUpHref && (
        <p role="alert" className="mb-4 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200">
          {t('agency.errors.mfaRequired')}{' '}
          <a href={stepUpHref} className="underline">{t('superadmin.authority.stepUp')}</a>
        </p>
      )}

      {/* ZIP import card */}
      <div className={`mb-4 flex flex-col gap-3 rounded-xl border p-4 ${
        zipStatus === 'error'
          ? 'border-rose-500/25 bg-rose-500/[0.06]'
          : zipStatus === 'partial'
            ? 'border-amber-500/30 bg-amber-500/[0.06]'
            : 'border-emerald-500/25 bg-emerald-500/[0.06]'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-100">GTFS ZIP import</p>
            <p className="text-[11px] text-slate-400">
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
              disabled={!canMutate || !reasonValid || zipStatus === 'extracting' || zipStatus === 'importing'}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                zipStatus === 'done' || zipStatus === 'partial'
                  ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25 hover:bg-emerald-500/20'
                  : 'bg-brand-500 text-ink-base hover:bg-brand-400'
              }`}
            >
              {zipStatus === 'extracting' ? 'Kibontás…'
                : zipStatus === 'importing' ? 'Importálás…'
                : zipStatus === 'done' || zipStatus === 'partial' ? '↻ ZIP újra'
                : 'ZIP fájl választása'}
            </button>
          </div>
        </div>

        {zipMessage && (
          <p
            className={`text-[11px] font-semibold ${zipStatus === 'error' ? 'text-rose-300' : zipStatus === 'done' ? 'text-emerald-300' : zipStatus === 'partial' ? 'text-amber-300' : 'text-slate-300'}`}
            role={zipStatus === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            {zipMessage}
          </p>
        )}

        {Object.keys(zipFileProgress).length > 0 && (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(zipFileProgress).map(([fname, info]) => (
              <div key={fname} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2">
                <p className="truncate text-[10px] font-semibold text-slate-300">{info.label}</p>
                <p className="truncate font-mono text-[9px] text-slate-500">{fname}</p>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    role="progressbar"
                    aria-label={info.label}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={info.err ? 100 : info.pct}
                    className={`h-full rounded-full transition-all duration-300 ${info.err ? 'bg-rose-400' : info.done ? 'bg-emerald-500' : 'bg-violet-500'}`}
                    style={{ width: `${info.err ? 100 : info.pct}%` }}
                  />
                </div>
                <p className={`mt-0.5 text-[9px] font-medium ${info.err ? 'text-rose-300' : info.done ? 'text-emerald-300' : 'text-slate-500'}`}>
                  {info.err ? '✗ hiba' : info.done ? '✓ kész' : `${info.pct}%`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto-chain status / Finish-from-DB button */}
      <div className="mb-5 flex flex-col gap-2 rounded-xl border border-violet-500/25 bg-violet-500/[0.06] p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-200">Automatikus lezárás (ha az adatok már fenn vannak)</p>
            <p className="text-[10px] text-slate-500">
              Ha trips.txt + stop_times.txt már importálva volt egy korábbi session során, kattints ide —
              lefuttatja a megálló-járatrefs levezetést és az épület–megálló számítást.
            </p>
          </div>
          <button
            onClick={() => chainArmed ? runPostImportChain() : setChainArmed(true)}
            disabled={!canMutate || !reasonValid || chainRunning}
            className="shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-ink-base hover:bg-brand-400 disabled:opacity-50"
          >
            {chainRunning ? 'Fut…' : chainArmed ? 'Megerősítés: befejezés' : 'Automatikus befejezés'}
          </button>
        </div>
        {chainStatus && (
          <p
            className={`text-[11px] font-medium ${chainStatus.startsWith('✅') ? 'text-emerald-300' : chainStatus.startsWith('✗') ? 'text-rose-300' : 'text-violet-300'}`}
            role={chainStatus.startsWith('✗') ? 'alert' : 'status'}
            aria-live="polite"
          >
            {chainStatus}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {FILE_CONFIGS.filter(c => c.id !== 'stop_routes').map(cfg => {
          const st = states[cfg.id] ?? INIT;
          return (
            <div key={cfg.id} className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
              <div>
                <p className="text-xs font-semibold text-slate-200">{cfg.description}</p>
                <p className="font-mono text-[10px] text-slate-500">{cfg.filename}</p>
                <p className="text-[10px] text-slate-500">→ {cfg.table}</p>
                {cfg.hint && <p className="mt-0.5 text-[10px] text-amber-300">{cfg.hint}</p>}
              </div>

              {st.status !== 'idle' && (
                <>
                  {st.status !== 'done' && st.status !== 'error' && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        role="progressbar"
                        aria-label={cfg.description}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={st.progress}
                        className="h-full rounded-full bg-violet-500 transition-all duration-300"
                        style={{ width: `${st.progress}%` }}
                      />
                    </div>
                  )}
                  <p className={`text-[11px] font-medium ${STATUS_COLOR[st.status]}`} role={st.status === 'error' ? 'alert' : 'status'} aria-live="polite">{st.message}</p>
                  {st.total > 0 && st.status === 'uploading' && (
                    <p className="text-[10px] text-slate-500">{st.sent.toLocaleString('hu-HU')} / {st.total.toLocaleString('hu-HU')} sor</p>
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
                disabled={!canMutate || !reasonValid || st.status === 'uploading' || st.status === 'reading' || st.status === 'processing'}
                className={`mt-auto rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
                  st.status === 'done'
                    ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25 hover:bg-emerald-500/20'
                    : 'bg-brand-500 text-ink-base hover:bg-brand-400'
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
            <div className="flex flex-col gap-2 rounded-xl border border-violet-500/25 bg-violet-500/[0.06] p-3 sm:col-span-2">
              <div>
                <p className="text-xs font-semibold text-slate-200">Megálló–járat kapcsolatok</p>
                <p className="font-mono text-[10px] text-slate-500">trips.txt + stop_times.txt</p>
                <p className="text-[10px] text-slate-500">→ transit_stop_routes</p>
                <p className="mt-0.5 text-[10px] text-amber-300">2 lépéses folyamat — stop_times.txt streamelve</p>
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
                  disabled={!canMutate || !reasonValid}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
                    tripsMap
                      ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25 hover:bg-emerald-500/20'
                      : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                  }`}
                >
                  1. trips.txt
                </button>
                {tripsMsg && <p className="text-[10px] text-slate-400">{tripsMsg}</p>}
              </div>

              {/* Step 2: stop_times */}
              {st.status !== 'idle' && (
                <>
                  {(st.status === 'processing' || st.status === 'uploading') && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        role="progressbar"
                        aria-label="stop_times.txt"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={st.progress}
                        className="h-full rounded-full bg-violet-500 transition-all duration-300"
                        style={{ width: `${st.progress}%` }}
                      />
                    </div>
                  )}
                  <p className={`text-[11px] font-medium ${STATUS_COLOR[st.status]}`} role={st.status === 'error' ? 'alert' : 'status'} aria-live="polite">{st.message}</p>
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
                disabled={!canMutate || !reasonValid || !tripsMap || st.status === 'processing' || st.status === 'uploading'}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
                  st.status === 'done'
                    ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25 hover:bg-emerald-500/20'
                    : 'bg-brand-500 text-ink-base hover:bg-brand-400'
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
