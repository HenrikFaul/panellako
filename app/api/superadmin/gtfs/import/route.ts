import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';

export const dynamic = 'force-dynamic';

// ─── Supabase client ──────────────────────────────────────────────────────────

function createServiceClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  const key = serviceKey.startsWith('eyJ') ? serviceKey : (anonKey || serviceKey);
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { fileType?: string; rows?: unknown[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { fileType, rows } = body;

  if (!fileType || !Array.isArray(rows)) {
    return NextResponse.json({ error: 'fileType and rows are required' }, { status: 400 });
  }

  let result: TransformResult;
  try {
    result = transformRows(fileType, rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { table, conflictColumns, transformed, skipped } = result;

  if (transformed.length === 0) {
    return NextResponse.json({ imported: 0, skipped });
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from(table)
    .upsert(transformed, { onConflict: conflictColumns });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ imported: transformed.length, skipped });
}
