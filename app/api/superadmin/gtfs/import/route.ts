import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';
import { BoundedJsonError, readBoundedJson } from '@/lib/http/bounded-json';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ─── Supabase client ──────────────────────────────────────────────────────────

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_BATCH_ROWS = 500;
const MAX_ROW_FIELDS = 64;
const MAX_FIELD_NAME_LENGTH = 80;
const MAX_FIELD_VALUE_LENGTH = 32_768;
const IMPORT_LEASE_TTL_SECONDS = 15 * 60;
const PLATFORM_GLOBAL_MUTATION_TARGET_KEY = 'platform:mutations';
const FILE_TYPES = new Set([
  'stops',
  'routes',
  'stop_routes',
  'feed_info',
  'calendar_dates',
  'pathways',
  'shapes',
  'translations',
  'trips',
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function json(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host')?.trim()
    || request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const fetchSite = request.headers.get('sec-fetch-site');
  if (!origin || !host || (fetchSite && fetchSite !== 'same-origin')) return false;

  try {
    const parsed = new URL(origin);
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:')
      && !parsed.username
      && !parsed.password
      && parsed.host.toLowerCase() === host.toLowerCase()
    );
  } catch {
    return false;
  }
}

function isGtfsRow(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  return entries.length <= MAX_ROW_FIELDS && entries.every(([key, fieldValue]) => (
    key.length > 0
    && key.length <= MAX_FIELD_NAME_LENGTH
    && typeof fieldValue === 'string'
    && fieldValue.length <= MAX_FIELD_VALUE_LENGTH
  ));
}

type BeginCommandResult = {
  outcome?: unknown;
  command_id?: unknown;
  status?: unknown;
  safe_result?: unknown;
};

type SafeImportResult = {
  code: 'GTFS_IMPORT_COMPLETED' | 'GTFS_IMPORT_FAILED';
  batch_id: string;
  batch_digest: string;
  file_type: string;
  imported: number;
  skipped: number;
};

function safeImportResult(value: unknown): SafeImportResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const result = value as Record<string, unknown>;
  if (
    result.code !== 'GTFS_IMPORT_COMPLETED'
    || typeof result.batch_id !== 'string'
    || typeof result.batch_digest !== 'string'
    || !/^sha256:[0-9a-f]{64}$/.test(result.batch_digest)
    || typeof result.file_type !== 'string'
    || !Number.isSafeInteger(result.imported)
    || Number(result.imported) < 0
    || !Number.isSafeInteger(result.skipped)
    || Number(result.skipped) < 0
  ) return null;
  return result as SafeImportResult;
}

async function completeCommand(
  supabase: ReturnType<typeof createAdminClient>,
  commandId: string,
  actor: string,
  status: 'ok' | 'error',
  safeResult: SafeImportResult,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('complete_platform_job_command', {
      p_command_id: commandId,
      p_status: status,
      p_safe_result: safeResult,
      p_actor_id: actor,
    });
    return Boolean(
      !error
      && data
      && typeof data === 'object'
      && !Array.isArray(data)
      && (data as Record<string, unknown>).outcome === 'completed',
    );
  } catch {
    return false;
  }
}

/** Parse a GTFS date string (YYYYMMDD) to ISO 'YYYY-MM-DD', or null if invalid. */
function parseGtfsDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{8}$/.test(value)) return null;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

const ROUTE_TYPE_MAP: Record<number, string> = {
  0:  'TRAM',
  1:  'SUBWAY',
  2:  'RAIL',
  3:  'BUS',
  4:  'FERRY',
  5:  'CABLE_CAR',
  7:  'CABLE_CAR',
  11: 'TROLLEYBUS',
  12: 'TRAM',
};

// ─── Row transformers ─────────────────────────────────────────────────────────

type TransformResult = {
  table: string;
  conflictColumns: string;
  transformed: Record<string, unknown>[];
  skipped: number;
};

function transformRows(fileType: string, rows: unknown[]): TransformResult {
  const now = new Date().toISOString();

  switch (fileType) {
    case 'stops': {
      const transformed: Record<string, unknown>[] = [];
      let skipped = 0;
      for (const r of rows as Record<string, unknown>[]) {
        const lat = parseFloat(r.stop_lat as string);
        const lon = parseFloat(r.stop_lon as string);
        if (isNaN(lat) || isNaN(lon)) { skipped++; continue; }
        transformed.push({
          stop_id:    r.stop_id,
          name:       (r.stop_name as string) || r.stop_id,
          lat,
          lon,
          route_type: 'BUS',
          route_refs: [],
          synced_at:  now,
        });
      }
      return { table: 'transit_stops', conflictColumns: 'stop_id', transformed, skipped };
    }

    case 'routes': {
      const transformed = (rows as Record<string, unknown>[]).map(r => ({
        route_id:   r.route_id,
        short_name: (r.route_short_name as string) || r.route_id,
        type:       ROUTE_TYPE_MAP[parseInt(r.route_type as string)] ?? 'BUS',
        color:      r.route_color      ? `#${r.route_color}`      : null,
        text_color: r.route_text_color ? `#${r.route_text_color}` : null,
        synced_at:  now,
      }));
      return { table: 'transit_routes', conflictColumns: 'route_id', transformed, skipped: 0 };
    }

    case 'stop_routes': {
      const transformed = (rows as Record<string, unknown>[]).map(r => ({
        stop_id:  r.stop_id,
        route_id: r.route_id,
      }));
      return { table: 'transit_stop_routes', conflictColumns: 'stop_id,route_id', transformed, skipped: 0 };
    }

    case 'feed_info': {
      const transformed = (rows as Record<string, unknown>[]).map(r => ({
        feed_id:        r.feed_id,
        publisher_name: r.feed_publisher_name,
        publisher_url:  r.feed_publisher_url,
        lang:           r.feed_lang,
        start_date:     parseGtfsDate(r.feed_start_date),
        end_date:       parseGtfsDate(r.feed_end_date),
        version:        r.feed_version ?? null,
        imported_at:    now,
      }));
      return { table: 'gtfs_feed_info', conflictColumns: 'feed_id', transformed, skipped: 0 };
    }

    case 'calendar_dates': {
      const transformed: Record<string, unknown>[] = [];
      let skipped = 0;
      for (const r of rows as Record<string, unknown>[]) {
        const date = parseGtfsDate(r.date);
        if (date === null) { skipped++; continue; }
        transformed.push({
          service_id:     r.service_id,
          date,
          exception_type: parseInt(r.exception_type as string),
        });
      }
      return { table: 'gtfs_calendar_dates', conflictColumns: 'service_id,date', transformed, skipped };
    }

    case 'pathways': {
      const transformed = (rows as Record<string, unknown>[]).map(r => ({
        pathway_id:       r.pathway_id,
        pathway_mode:     parseInt(r.pathway_mode as string),
        is_bidirectional: parseInt(r.is_bidirectional as string) || 1,
        from_stop_id:     r.from_stop_id,
        to_stop_id:       r.to_stop_id,
        traversal_time:   r.traversal_time ? parseInt(r.traversal_time as string) : null,
      }));
      return { table: 'gtfs_pathways', conflictColumns: 'pathway_id', transformed, skipped: 0 };
    }

    case 'shapes': {
      const transformed: Record<string, unknown>[] = [];
      let skipped = 0;
      for (const r of rows as Record<string, unknown>[]) {
        const lat = parseFloat(r.shape_pt_lat as string);
        const lon = parseFloat(r.shape_pt_lon as string);
        if (isNaN(lat) || isNaN(lon)) { skipped++; continue; }
        transformed.push({
          shape_id:      r.shape_id,
          pt_sequence:   parseInt(r.shape_pt_sequence as string),
          lat,
          lon,
          dist_traveled: r.shape_dist_traveled ? parseFloat(r.shape_dist_traveled as string) : null,
        });
      }
      return { table: 'gtfs_shapes', conflictColumns: 'shape_id,pt_sequence', transformed, skipped };
    }

    case 'translations': {
      const transformed = (rows as Record<string, unknown>[]).map(r => ({
        table_name:  r.table_name,
        field_name:  r.field_name,
        language:    r.language,
        translation: r.translation,
        field_value: (r.field_value as string) || null,
      }));
      return { table: 'gtfs_translations', conflictColumns: 'table_name,field_name,language,translation', transformed, skipped: 0 };
    }

    case 'trips': {
      const transformed: Record<string, unknown>[] = [];
      let skipped = 0;
      for (const r of rows as Record<string, unknown>[]) {
        if (!r.trip_id || !r.route_id || !r.service_id) { skipped++; continue; }
        transformed.push({
          trip_id:               r.trip_id,
          route_id:              r.route_id,
          service_id:            r.service_id,
          trip_headsign:         (r.trip_headsign as string) || null,
          direction_id:          r.direction_id !== '' && r.direction_id != null ? parseInt(r.direction_id as string) : null,
          block_id:              (r.block_id as string) || null,
          shape_id:              (r.shape_id as string) || null,
          wheelchair_accessible: r.wheelchair_accessible !== '' && r.wheelchair_accessible != null ? parseInt(r.wheelchair_accessible as string) : null,
          bikes_allowed:         r.bikes_allowed !== '' && r.bikes_allowed != null ? parseInt(r.bikes_allowed as string) : null,
        });
      }
      return { table: 'gtfs_trips', conflictColumns: 'trip_id', transformed, skipped };
    }

    default:
      throw new Error(`Unknown fileType: ${fileType}`);
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!(await isSuperadminAuthenticated())) {
    return json({ error: 'UNAUTHORIZED' }, 401);
  }
  if (!isSameOrigin(request)) return json({ error: 'ORIGIN_NOT_ALLOWED' }, 403);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'UNSUPPORTED_MEDIA_TYPE' }, 415);
  }

  let parsedBody: unknown;
  try {
    parsedBody = await readBoundedJson(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof BoundedJsonError && error.code === 'REQUEST_TOO_LARGE') {
      return json({ error: 'REQUEST_TOO_LARGE' }, 413);
    }
    return json({ error: 'INVALID_JSON' }, 400);
  }

  if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
    return json({ error: 'INVALID_GTFS_IMPORT_REQUEST' }, 400);
  }
  const body = parsedBody as Record<string, unknown>;
  if (Object.keys(body).some(key => !['fileType', 'rows', 'batchId', 'idempotencyKey'].includes(key))) {
    return json({ error: 'INVALID_GTFS_IMPORT_REQUEST' }, 400);
  }

  const fileType = typeof body.fileType === 'string' ? body.fileType : '';
  const rows = body.rows;
  const batchId = typeof body.batchId === 'string' ? body.batchId : '';
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '';
  if (!FILE_TYPES.has(fileType) || !Array.isArray(rows) || !UUID_PATTERN.test(batchId)) {
    return json({ error: 'INVALID_GTFS_IMPORT_REQUEST' }, 400);
  }
  if (!UUID_PATTERN.test(idempotencyKey)) {
    return json({ error: 'IDEMPOTENCY_KEY_REQUIRED' }, 400);
  }
  if (rows.length > MAX_BATCH_ROWS) {
    return json({ error: 'GTFS_BATCH_LIMIT_EXCEEDED' }, 400);
  }
  if (!rows.every(isGtfsRow)) {
    return json({ error: 'INVALID_GTFS_ROWS' }, 400);
  }
  const batchDigest = `sha256:${createHash('sha256')
    .update(JSON.stringify({ fileType, batchId, rows }))
    .digest('hex')}`;

  let result: TransformResult;
  try {
    result = transformRows(fileType, rows);
  } catch {
    return json({ error: 'INVALID_GTFS_ROWS' }, 400);
  }

  const { table, conflictColumns, transformed, skipped } = result;
  let supabase: ReturnType<typeof createAdminClient>;
  try {
    // This is intentionally the canonical PanelLakó service-role client. There
    // is no alternate URL/key name and no anonymous-key fallback.
    supabase = createAdminClient();
  } catch {
    return json({ error: 'GTFS_IMPORT_UNAVAILABLE' }, 503);
  }

  const actor = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase() || 'superadmin';
  // The current command contract owns the global lock for one 500-row batch.
  // A file is deliberately not claimed as atomically locked across all batches.
  const commandJobId = `gtfs_import:${fileType}:${batchId}`;
  let beginData: unknown;
  let beginError: unknown;
  try {
    const begin = await supabase.rpc('begin_platform_job_command', {
      p_command_kind: 'job',
      p_job_id: commandJobId,
      p_target_key: PLATFORM_GLOBAL_MUTATION_TARGET_KEY,
      p_idempotency_key: idempotencyKey,
      p_actor_id: actor,
      p_lease_seconds: IMPORT_LEASE_TTL_SECONDS,
      p_start_payload: {
        file_type: fileType,
        batch_id: batchId,
        batch_digest: batchDigest,
        batch_rows: rows.length,
      },
    });
    beginData = begin.data;
    beginError = begin.error;
  } catch {
    return json({ error: 'GTFS_IMPORT_GUARD_UNAVAILABLE', requestId: idempotencyKey }, 503);
  }
  if (beginError || !beginData || typeof beginData !== 'object' || Array.isArray(beginData)) {
    return json({ error: 'GTFS_IMPORT_GUARD_UNAVAILABLE', requestId: idempotencyKey }, 503);
  }

  const beginResult = beginData as BeginCommandResult;
  if (beginResult.outcome === 'already_running') {
    return json({ error: 'PLATFORM_MUTATION_ALREADY_RUNNING', requestId: idempotencyKey }, 409);
  }
  if (beginResult.outcome === 'idempotency_conflict') {
    return json({ error: 'GTFS_IMPORT_IDEMPOTENCY_CONFLICT', requestId: idempotencyKey }, 409);
  }
  if (beginResult.outcome === 'replayed') {
    const replay = beginResult.status === 'ok'
      ? safeImportResult(beginResult.safe_result)
      : null;
    if (
      replay
      && replay.batch_id === batchId
      && replay.batch_digest === batchDigest
      && replay.file_type === fileType
    ) {
      return json({
        imported: replay.imported,
        skipped: replay.skipped,
        replayed: true,
        requestId: idempotencyKey,
      });
    }
    if (beginResult.status === 'error' || beginResult.status === 'partial') {
      return json({
        error: 'GTFS_IMPORT_PREVIOUSLY_FAILED',
        replayed: true,
        requestId: idempotencyKey,
      }, 422);
    }
    return json({ error: 'GTFS_IMPORT_GUARD_UNAVAILABLE', requestId: idempotencyKey }, 503);
  }
  if (beginResult.outcome === 'already_submitted') {
    return json({ error: 'GTFS_IMPORT_ALREADY_SUBMITTED', requestId: idempotencyKey }, 409);
  }
  if (
    beginResult.outcome !== 'started'
    || typeof beginResult.command_id !== 'string'
    || !UUID_PATTERN.test(beginResult.command_id)
  ) {
    return json({ error: 'GTFS_IMPORT_GUARD_UNAVAILABLE', requestId: idempotencyKey }, 503);
  }
  const commandId = beginResult.command_id;

  try {
    if (transformed.length > 0) {
      const { error: importError } = await supabase
        .from(table)
        .upsert(transformed, { onConflict: conflictColumns });
      if (importError) {
        const completed = await completeCommand(supabase, commandId, actor, 'error', {
          code: 'GTFS_IMPORT_FAILED',
          batch_id: batchId,
          batch_digest: batchDigest,
          file_type: fileType,
          imported: 0,
          skipped,
        });
        return completed
          ? json({ error: 'GTFS_IMPORT_FAILED', requestId: idempotencyKey }, 500)
          : json({ error: 'GTFS_IMPORT_AUDIT_INCOMPLETE', requestId: idempotencyKey }, 500);
      }
    }

    const safeResult: SafeImportResult = {
      code: 'GTFS_IMPORT_COMPLETED',
      batch_id: batchId,
      batch_digest: batchDigest,
      file_type: fileType,
      imported: transformed.length,
      skipped,
    };
    if (!(await completeCommand(supabase, commandId, actor, 'ok', safeResult))) {
      return json({ error: 'GTFS_IMPORT_AUDIT_INCOMPLETE', requestId: idempotencyKey }, 500);
    }
    return json({
      imported: transformed.length,
      skipped,
      requestId: idempotencyKey,
    });
  } catch {
    const completed = await completeCommand(supabase, commandId, actor, 'error', {
      code: 'GTFS_IMPORT_FAILED',
      batch_id: batchId,
      batch_digest: batchDigest,
      file_type: fileType,
      imported: 0,
      skipped,
    });
    return completed
      ? json({ error: 'GTFS_IMPORT_FAILED', requestId: idempotencyKey }, 500)
      : json({ error: 'GTFS_IMPORT_AUDIT_INCOMPLETE', requestId: idempotencyKey }, 500);
  }
}
