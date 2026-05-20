// Shared helpers for cycling-data Edge Functions
// Runtime: Deno (Supabase Edge Runtime)
// Used by: fetch-bkk-gbfs-status, fetch-bkk-gbfs-info, fetch-waymarkedtrails, ...
// Related spec: cycling-data-sources/00b_SUPABASE_BACKEND.md
//
// Conventions:
// - All helpers are best-effort and never throw on transient I/O errors —
//   callers must check return values.
// - `createServiceClient()` is the canonical way to talk to Postgres from
//   a cycling Edge Function; do not call `createClient` directly.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const CYCLING_USER_AGENT_VERSION = '1.0';
export const CYCLING_CONTACT_EMAIL = 'info@panellako.hu';

// Hungary bounding box (WGS84) — used to filter OSM diffs and validate
// incoming coordinates. Loose envelope covering the entire country.
export const bboxHungary = {
  minLon: 16.0,
  minLat: 45.7,
  maxLon: 22.9,
  maxLat: 48.6,
} as const;

export interface JobRunFields {
  rows_in?: number;
  rows_out?: number;
  rows_rejected?: number;
  snapshot_uri?: string | null;
  error_message?: string | null;
  trigger?: string;
  finished_at?: string;
  started_at?: string;
}

export interface FeedEtagRow {
  feed: string;
  etag: string | null;
  last_modified: string | null;
  updated_at?: string;
}

/**
 * Creates a Supabase client using the service role key. Disables session
 * persistence — Edge Functions are stateless and we never want a cached
 * auth token.
 */
export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var missing');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Returns a polite, identifiable User-Agent string for outbound HTTP calls.
 * Pattern: `panellako-cycling/<version> (<component>; <email>)`
 */
export function politeUserAgent(component: string): string {
  return `panellako-cycling/${CYCLING_USER_AGENT_VERSION} (${component}; ${CYCLING_CONTACT_EMAIL})`;
}

/**
 * Inserts a job_run row into etl_meta.job_run. Best-effort: returns the
 * inserted row id on success, null on failure (and logs the error).
 */
export async function recordJobRun(
  client: SupabaseClient,
  source_id: string,
  status: 'queued' | 'running' | 'success' | 'failure' | 'partial',
  fields: JobRunFields = {}
): Promise<number | null> {
  try {
    const row = {
      source_id,
      status,
      trigger: fields.trigger ?? 'cron',
      started_at: fields.started_at,
      finished_at: fields.finished_at ?? new Date().toISOString(),
      rows_in: fields.rows_in ?? null,
      rows_out: fields.rows_out ?? null,
      rows_rejected: fields.rows_rejected ?? null,
      snapshot_uri: fields.snapshot_uri ?? null,
      error_message: fields.error_message ?? null,
    };
    const { data, error } = await client
      .schema('etl_meta')
      .from('job_run')
      .insert(row)
      .select('id')
      .single();
    if (error) {
      console.error('[cycling/recordJobRun] insert failed:', error.message);
      return null;
    }
    return (data as { id: number } | null)?.id ?? null;
  } catch (err) {
    console.error('[cycling/recordJobRun] unexpected error:', err);
    return null;
  }
}

/**
 * Reads the ETag-cache row for a feed. Returns null when no row exists
 * (PGRST116 from maybeSingle) or on error — callers should treat null as
 * "no cached etag, fetch unconditionally".
 */
export async function readFeedEtag(
  client: SupabaseClient,
  feed: string
): Promise<FeedEtagRow | null> {
  try {
    const { data, error } = await client
      .schema('etl_meta')
      .from('feed_etag')
      .select('feed, etag, last_modified, updated_at')
      .eq('feed', feed)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') {
      console.error('[cycling/readFeedEtag] read failed:', error.message);
      return null;
    }
    return (data as FeedEtagRow | null) ?? null;
  } catch (err) {
    console.error('[cycling/readFeedEtag] unexpected error:', err);
    return null;
  }
}

/**
 * Upserts the ETag-cache row for a feed. Best-effort.
 */
export async function writeFeedEtag(
  client: SupabaseClient,
  feed: string,
  etag: string | null,
  last_modified: string | null
): Promise<boolean> {
  try {
    const { error } = await client
      .schema('etl_meta')
      .from('feed_etag')
      .upsert(
        {
          feed,
          etag,
          last_modified,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'feed' }
      );
    if (error) {
      console.error('[cycling/writeFeedEtag] upsert failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[cycling/writeFeedEtag] unexpected error:', err);
    return false;
  }
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  factor?: number;
  jitterMs?: number;
}

/**
 * Exponential backoff retry helper. Retries on:
 *   - Thrown errors (network failures, timeouts)
 *   - HTTP responses with status >= 500
 * Does NOT retry 4xx (caller's fault) or 304 (legitimate no-content).
 *
 * Defaults: max 3 attempts, base 500ms, factor 2, jitter ±100ms.
 */
export async function withRetry<T extends Response>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const factor = opts.factor ?? 2;
  const jitterMs = opts.jitterMs ?? 100;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fn();
      if (res.status < 500) {
        // 2xx, 3xx, 4xx — return as-is, no retry.
        return res;
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < maxAttempts) {
      const jitter = (Math.random() * 2 - 1) * jitterMs;
      const delay = baseDelayMs * Math.pow(factor, attempt - 1) + jitter;
      await new Promise((r) => setTimeout(r, Math.max(0, delay)));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('withRetry: exhausted attempts');
}

/**
 * SHA-256 of a string or byte buffer, returned as lowercase hex.
 * Uses the Web Crypto API (no third-party deps).
 */
export async function sha256(input: string | Uint8Array): Promise<string> {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
