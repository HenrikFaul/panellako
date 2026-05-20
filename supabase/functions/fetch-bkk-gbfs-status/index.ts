// Supabase Edge Function — BKK MOL Bubi GBFS station_status minutely poller
// Runtime: Deno (Supabase Edge Runtime)
// Deploy: supabase functions deploy fetch-bkk-gbfs-status --no-verify-jwt
// Related spec: cycling-data-sources/00b_SUPABASE_BACKEND.md (§6),
//               cycling-data-sources/28_bkk-bringas-terkep.md
// Schedule: pg_cron `* * * * *` (every minute) via net.http_post — see
//           the matching cycling-data migration for the cron.schedule call.
// Dependencies (created by the cycling-data migration):
//   - gbfs.station_status         (partitioned by ts, PK (station_id, ts))
//   - gbfs.station_information    (not written here, but referenced FK-wise)
//   - etl_meta.feed_etag          (PK feed, columns etag, last_modified, updated_at)
//   - etl_meta.job_run            (audit table — best-effort writes)
//   - etl_meta.parse_error        (best-effort writes on malformed payload)
//   - Storage bucket `cycling-snapshots` (private, service-role write)
//
// Flow:
//   1. Read cached ETag/Last-Modified for feed=`bkk_gbfs_status`.
//   2. Conditional GET against gbfs.bubi.bkk.hu (polite User-Agent).
//   3. 304 → record success with rows_in=0 and return { skipped: true }.
//   4. Non-2xx → record failure and return 502.
//   5. Parse JSON; if `data.stations` is not an array → record parse_error and 422.
//   6. Map to gbfs.station_status rows and batch-insert.
//      Unique-constraint violations (23505) on (station_id, ts) are
//      swallowed — they only mean we polled twice in the same minute.
//   7. Upload raw JSON to Storage at `gbfs/bkk-status/<iso_ts>.json`.
//   8. Upsert the ETag cache and write a success job_run.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createServiceClient,
  politeUserAgent,
  readFeedEtag,
  writeFeedEtag,
  recordJobRun,
  withRetry,
} from '../_shared/cycling.ts';

// ── Constants ──────────────────────────────────────────────────────────────

const SOURCE_ID = 'bkk-gbfs-status';
const FEED_KEY = 'bkk_gbfs_status';
const FEED_URL = 'https://gbfs.bubi.bkk.hu/gbfs/v3/station_status.json';
const USER_AGENT = politeUserAgent('bkk-gbfs-status');
const SNAPSHOT_BUCKET = 'cycling-snapshots';
const REQUEST_TIMEOUT_MS = 20_000;

// ── Types ──────────────────────────────────────────────────────────────────

interface GbfsStationStatus {
  station_id: string;
  num_bikes_available: number;
  num_docks_available: number;
  is_renting: boolean | number;
  is_returning: boolean | number;
  last_reported?: number | null;
}

interface GbfsResponse {
  last_updated: number;
  ttl?: number;
  version?: string;
  data: { stations: GbfsStationStatus[] };
}

interface StationStatusRow {
  station_id: string;
  ts: string;
  num_bikes_available: number;
  num_docks_available: number;
  is_renting: boolean;
  is_returning: boolean;
  last_reported: string | null;
}

interface FetchResult {
  status: number;
  body: GbfsResponse | null;
  etag: string | null;
  lastModified: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function coerceBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'yes';
  }
  return false;
}

function toIsoFromEpochSeconds(epoch: number | null | undefined): string | null {
  if (epoch == null || !Number.isFinite(epoch)) return null;
  return new Date(epoch * 1000).toISOString();
}

async function fetchGbfsFeed(
  cachedEtag: string | null,
  cachedLastModified: string | null
): Promise<FetchResult> {
  const headers: HeadersInit = {
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
  };
  if (cachedEtag) headers['If-None-Match'] = cachedEtag;
  if (cachedLastModified) headers['If-Modified-Since'] = cachedLastModified;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const resp = await withRetry(() =>
      fetch(FEED_URL, { headers, signal: controller.signal })
    );
    clearTimeout(timeoutId);

    const etag = resp.headers.get('ETag');
    const lastModified = resp.headers.get('Last-Modified');

    if (resp.status === 304) {
      return { status: 304, body: null, etag, lastModified };
    }
    if (!resp.ok) {
      return { status: resp.status, body: null, etag, lastModified };
    }

    let body: GbfsResponse | null = null;
    try {
      body = (await resp.json()) as GbfsResponse;
    } catch (err) {
      console.error('[fetch-bkk-gbfs-status] JSON parse failed:', err);
      return { status: 200, body: null, etag, lastModified };
    }
    return { status: resp.status, body, etag, lastModified };
  } finally {
    clearTimeout(timeoutId);
  }
}

function mapToRows(json: GbfsResponse, ts: string): StationStatusRow[] {
  const stations = Array.isArray(json?.data?.stations) ? json.data.stations : [];
  const rows: StationStatusRow[] = [];
  for (const s of stations) {
    if (!s || typeof s.station_id !== 'string') continue;
    rows.push({
      station_id: s.station_id,
      ts,
      num_bikes_available: Number(s.num_bikes_available ?? 0) | 0,
      num_docks_available: Number(s.num_docks_available ?? 0) | 0,
      is_renting: coerceBool(s.is_renting),
      is_returning: coerceBool(s.is_returning),
      last_reported: toIsoFromEpochSeconds(s.last_reported ?? null),
    });
  }
  return rows;
}

/**
 * Inserts the station-status rows in one batch. Treats unique-violation
 * (23505) on (station_id, ts) as a benign double-poll and returns a notice
 * string. Other errors are propagated to the caller.
 */
async function insertStatus(
  client: SupabaseClient,
  rows: StationStatusRow[]
): Promise<{ inserted: number; notice: string | null }> {
  if (rows.length === 0) return { inserted: 0, notice: null };

  const { error } = await client.schema('gbfs').from('station_status').insert(rows);
  if (error) {
    if (error.code === '23505') {
      const notice = `duplicate (station_id, ts) — already inserted in this minute`;
      console.warn(`[fetch-bkk-gbfs-status] ${notice}`);
      return { inserted: 0, notice };
    }
    throw new Error(`station_status insert failed: ${error.message}`);
  }
  return { inserted: rows.length, notice: null };
}

async function uploadSnapshot(
  client: SupabaseClient,
  ts: string,
  json: GbfsResponse
): Promise<string | null> {
  const path = `gbfs/bkk-status/${ts}.json`;
  try {
    const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
    const { error } = await client.storage.from(SNAPSHOT_BUCKET).upload(path, blob, {
      contentType: 'application/json',
      upsert: false,
    });
    if (error) {
      console.warn(`[fetch-bkk-gbfs-status] snapshot upload failed (${path}):`, error.message);
      return null;
    }
    return path;
  } catch (err) {
    console.warn(`[fetch-bkk-gbfs-status] snapshot upload threw (${path}):`, err);
    return null;
  }
}

async function recordParseError(
  client: SupabaseClient,
  reason: string,
  sample: string
): Promise<void> {
  try {
    const { error } = await client
      .schema('etl_meta')
      .from('parse_error')
      .insert({
        source_id: SOURCE_ID,
        error_message: reason,
        raw_record: { sample: sample.slice(0, 4000) },
      });
    if (error) {
      console.warn('[fetch-bkk-gbfs-status] parse_error insert failed:', error.message);
    }
  } catch (err) {
    console.warn('[fetch-bkk-gbfs-status] parse_error insert threw:', err);
  }
}

// ── Handler ────────────────────────────────────────────────────────────────

serve(async (_req: Request) => {
  const startedAt = new Date().toISOString();
  let client: SupabaseClient;
  try {
    client = createServiceClient();
  } catch (err) {
    console.error('[fetch-bkk-gbfs-status] client init failed:', err);
    return jsonResponse({ error: 'Server configuration error' }, 500);
  }

  try {
    // 1. ETag cache lookup.
    const cached = await readFeedEtag(client, FEED_KEY);
    const cachedEtag = cached?.etag ?? null;
    const cachedLastModified = cached?.last_modified ?? null;

    // 2. Conditional fetch.
    let fetchResult: FetchResult;
    try {
      fetchResult = await fetchGbfsFeed(cachedEtag, cachedLastModified);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[fetch-bkk-gbfs-status] feed fetch failed:', msg);
      await recordJobRun(client, SOURCE_ID, 'failure', {
        started_at: startedAt,
        error_message: `fetch error: ${msg}`,
        trigger: 'cron',
      });
      return jsonResponse({ error: 'Upstream fetch failed', detail: msg }, 502);
    }

    // 3. 304 Not Modified — record success with 0 rows.
    if (fetchResult.status === 304) {
      await recordJobRun(client, SOURCE_ID, 'success', {
        started_at: startedAt,
        rows_in: 0,
        rows_out: 0,
        trigger: 'cron',
      });
      return jsonResponse({ skipped: true, reason: '304 Not Modified' }, 200);
    }

    // 4. Non-2xx — record failure and 502.
    if (fetchResult.status < 200 || fetchResult.status >= 300) {
      await recordJobRun(client, SOURCE_ID, 'failure', {
        started_at: startedAt,
        error_message: `HTTP ${fetchResult.status}`,
        trigger: 'cron',
      });
      return jsonResponse({ error: `HTTP ${fetchResult.status}` }, 502);
    }

    const json = fetchResult.body;
    if (!json || typeof json !== 'object') {
      await recordParseError(client, 'response body was not parseable as JSON', '');
      await recordJobRun(client, SOURCE_ID, 'failure', {
        started_at: startedAt,
        error_message: 'response body was not parseable JSON',
        trigger: 'cron',
      });
      return jsonResponse({ error: 'Malformed JSON' }, 422);
    }

    // 5. Validate shape.
    if (!Array.isArray(json?.data?.stations)) {
      const sample = JSON.stringify(json).slice(0, 4000);
      await recordParseError(client, 'data.stations is not an array', sample);
      await recordJobRun(client, SOURCE_ID, 'failure', {
        started_at: startedAt,
        error_message: 'data.stations not an array',
        trigger: 'cron',
      });
      return jsonResponse({ error: 'data.stations is not an array' }, 422);
    }

    // 6. Build rows.
    const ts = toIsoFromEpochSeconds(json.last_updated) ?? new Date().toISOString();
    const rows = mapToRows(json, ts);
    const rowsIn = json.data.stations.length;

    // 7. Insert station_status (one batch, swallow 23505).
    let inserted = 0;
    let dupNotice: string | null = null;
    try {
      const result = await insertStatus(client, rows);
      inserted = result.inserted;
      dupNotice = result.notice;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[fetch-bkk-gbfs-status] insert failed:', msg);
      await recordJobRun(client, SOURCE_ID, 'failure', {
        started_at: startedAt,
        rows_in: rowsIn,
        rows_out: 0,
        error_message: msg,
        trigger: 'cron',
      });
      return jsonResponse({ error: 'Database insert failed', detail: msg }, 500);
    }

    // 8. Upload raw snapshot (best-effort).
    const snapshotPath = await uploadSnapshot(client, ts, json);
    const snapshotUri = snapshotPath ? `${SNAPSHOT_BUCKET}/${snapshotPath}` : null;

    // 9. Persist ETag / Last-Modified for next conditional GET.
    await writeFeedEtag(client, FEED_KEY, fetchResult.etag, fetchResult.lastModified);

    // 10. Success audit row.
    await recordJobRun(client, SOURCE_ID, 'success', {
      started_at: startedAt,
      rows_in: rowsIn,
      rows_out: inserted,
      snapshot_uri: snapshotUri,
      error_message: dupNotice,
      trigger: 'cron',
    });

    return jsonResponse(
      {
        rows: inserted,
        ts,
        etag: fetchResult.etag,
        snapshot_uri: snapshotUri,
      },
      200
    );
  } catch (err) {
    // Last-resort safety net — nothing in the happy path should throw past here.
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[fetch-bkk-gbfs-status] unhandled error:', msg);
    await recordJobRun(client, SOURCE_ID, 'failure', {
      started_at: startedAt,
      error_message: `unhandled: ${msg}`,
      trigger: 'cron',
    });
    return jsonResponse({ error: 'Internal Server Error', detail: msg }, 500);
  }
});

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
