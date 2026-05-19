import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { parseAlerts } from '@/lib/gtfs-rt-parser';
import { saveAlertsToCache } from '@/lib/transit-cache';
import {
  upsertTransitStops,
  upsertTransitRoutes,
  upsertTransitStopRoutes,
  upsertBuildingStops,
  upsertCatalogAlerts,
  loadNearbyStops,
} from '@/lib/transit-catalog';
import type { NearbyStop, RouteType } from '@/app/api/transit/nearby/route';
import type { TransitAlert, AlertEffect } from '@/app/api/transit/alerts/route';

export const dynamic = 'force-dynamic';

// ─── Auth ─────────────────────────────────────────────────────────────────────

const CRON_SECRET   = process.env.CRON_SECRET          ?? '';
const SYNC_SECRET   = process.env.TRANSIT_SYNC_SECRET  ?? '';

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  // Vercel Cron sends x-vercel-cron: 1 and cannot attach custom Authorization headers.
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';

  // Optional query/body secret support for manual invocations from simple cron systems.
  const urlSecret = request.nextUrl.searchParams.get('secret') ?? '';

  return (
    (CRON_SECRET !== '' && isVercelCron) ||
    (CRON_SECRET !== '' && token === CRON_SECRET) ||
    (SYNC_SECRET !== '' && token === SYNC_SECRET) ||
    (CRON_SECRET !== '' && urlSecret === CRON_SECRET) ||
    (SYNC_SECRET !== '' && urlSecret === SYNC_SECRET)
  );
}

// ─── Supabase service-role client (bypasses RLS — safe for cron context) ──────

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

// ─── BKK API config ───────────────────────────────────────────────────────────

const BKK_OBA_BASE  = 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where';
const GTFS_RT_BASE  = 'https://go.bkk.hu/api/query/v1/ws/gtfs-rt/full';
const BKK_KEY       = process.env.BKKFUTAR_API_KEY ?? '';
const APP_ORIGIN    = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://panellako.hu').replace(/\/$/, '');

const BKK_HEADERS = {
  'Accept':     'application/json',
  'User-Agent': 'panellako.hu/1.0',
  'Referer':    `${APP_ORIGIN}/`,
  'Origin':     APP_ORIGIN,
};

// ─── Budapest 2×3 grid ────────────────────────────────────────────────────────

const GRID = [
  { lat: 47.40, lon: 18.98 }, { lat: 47.40, lon: 19.12 }, { lat: 47.40, lon: 19.26 },
  { lat: 47.57, lon: 18.98 }, { lat: 47.57, lon: 19.12 }, { lat: 47.57, lon: 19.26 },
] as const;

const LAT_SPAN = '0.30';
const LON_SPAN = '0.32';

const GTFS_TYPE_MAP: Record<number, RouteType> = {
  0: 'TRAM', 1: 'SUBWAY', 2: 'RAIL', 3: 'BUS',
  4: 'FERRY', 5: 'CABLE_CAR', 7: 'CABLE_CAR', 11: 'TROLLEYBUS', 12: 'TRAM',
};

// ─── stops-routes sync ────────────────────────────────────────────────────────

interface StopRouteSyncResult {
  cell:           number;
  stopsUpserted:  number;
  routesUpserted: number;
  pairsUpserted:  number;
}

async function syncStopsRoutesCell(cellIndex: number): Promise<StopRouteSyncResult> {
  const cell = GRID[cellIndex];

  const params = new URLSearchParams({
    key:        BKK_KEY,
    version:    '3',
    appVersion: 'apiary-1.0',
    lat:        String(cell.lat),
    lon:        String(cell.lon),
    latSpan:    LAT_SPAN,
    lonSpan:    LON_SPAN,
  });

  const res = await fetch(`${BKK_OBA_BASE}/stops-for-location.json?${params}`, {
    headers: BKK_HEADERS,
    signal:  AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Futár stops-for-location HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json() as {
    status: string;
    data?: {
      list?: Array<{
        id:        string;
        name?:     string;
        lat?:      number;
        lon?:      number;
        routeIds?: string[];
        routes?:   Array<{ id?: string; shortName?: string; type?: number; color?: string; textColor?: string }>;
      }>;
      references?: {
        routes?: Record<string, { shortName?: string; type?: number; color?: string; textColor?: string }>;
      };
    };
  };

  if (json.status !== 'OK') {
    throw new Error(`Futár stops status: ${json.status}`);
  }

  const routeRefMap: Record<string, { shortName?: string; type?: number; color?: string; textColor?: string }> =
    json?.data?.references?.routes ?? {};

  const list = json?.data?.list ?? [];

  // Build normalised rows
  const stopRows: Array<{ stop_id: string; name: string; lat: number; lon: number; route_type: string; route_refs: string[] }> = [];
  const routeRows: Array<{ route_id: string; short_name: string; type: string; color?: string; text_color?: string }> = [];
  const pairRows:  Array<{ stop_id: string; route_id: string }> = [];

  const seenRoutes = new Set<string>();

  for (const s of list) {
    const sLat = s.lat ?? cell.lat;
    const sLon = s.lon ?? cell.lon;

    // Collect route data for this stop
    const inlineRoutes = Array.isArray(s.routes) ? s.routes : [];
    const referencedIds = Array.isArray(s.routeIds) ? s.routeIds : [];

    const routeIds: string[] = inlineRoutes.map(r => r.id ?? '').filter(Boolean).length > 0
      ? inlineRoutes.map(r => r.id ?? '').filter(Boolean)
      : referencedIds;

    // Collect short names for the stop's route_refs field
    const routeRefs: string[] = [];

    // Determine primary route type
    let routeType: RouteType = 'BUS';
    const firstRouteId = routeIds[0] ?? '';
    const firstRouteInline = inlineRoutes[0];
    const firstRouteDef = routeRefMap[firstRouteId] ?? firstRouteInline ?? null;
    if (firstRouteDef?.type !== undefined) {
      routeType = GTFS_TYPE_MAP[firstRouteDef.type] ?? 'BUS';
    }

    for (const routeId of routeIds) {
      const routeDef = routeRefMap[routeId] ?? inlineRoutes.find(r => r.id === routeId);
      const shortName = routeDef?.shortName ?? '';
      if (shortName) routeRefs.push(shortName);

      if (!seenRoutes.has(routeId)) {
        seenRoutes.add(routeId);
        const rType = routeDef?.type !== undefined
          ? (GTFS_TYPE_MAP[routeDef.type] ?? 'BUS')
          : 'BUS';
        routeRows.push({
          route_id:   routeId,
          short_name: shortName || routeId,
          type:       rType,
          color:      routeDef?.color,
          text_color: routeDef?.textColor,
        });
      }

      pairRows.push({ stop_id: s.id, route_id: routeId });
    }

    stopRows.push({
      stop_id:    s.id,
      name:       s.name ?? 'Megálló',
      lat:        sLat,
      lon:        sLon,
      route_type: routeType,
      route_refs: routeRefs,
    });
  }

  // Courtesy delay before returning (good API citizen)
  await new Promise(resolve => setTimeout(resolve, 300));

  const supabase = createServiceClient();

  // Upsert in dependency order: routes first, then stops, then pairs
  await upsertTransitRoutes(supabase, routeRows);
  await upsertTransitStops(supabase, stopRows);
  await upsertTransitStopRoutes(supabase, pairRows);

  return {
    cell:           cellIndex,
    stopsUpserted:  stopRows.length,
    routesUpserted: routeRows.length,
    pairsUpserted:  pairRows.length,
  };
}

// ─── building-stops sync ──────────────────────────────────────────────────────

interface BuildingStopsSyncResult {
  buildingsProcessed: number;
  buildingsSkipped:   number;
}

async function syncBuildingStops(): Promise<BuildingStopsSyncResult> {
  const supabase = createServiceClient();

  const { data: buildings, error } = await supabase
    .from('buildings')
    .select('id, lat, lon')
    .not('lat', 'is', null)
    .not('lon', 'is', null)
    .limit(500);

  if (error || !buildings) {
    throw new Error(`Failed to fetch buildings: ${error?.message ?? 'unknown error'}`);
  }

  type BuildingRow = { id: string; lat: number; lon: number };
  const rows = buildings as BuildingRow[];

  let buildingsProcessed = 0;
  let buildingsSkipped   = 0;

  // Process 20 buildings at a time
  const CHUNK = 20;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);

    await Promise.all(
      chunk.map(async (building) => {
        try {
          const stops: NearbyStop[] | null = await loadNearbyStops(
            createServiceClient(),
            building.lat,
            building.lon,
            700,
          );

          if (!stops || stops.length === 0) {
            buildingsSkipped++;
            return;
          }

          await upsertBuildingStops(
            createServiceClient(),
            building.id,
            stops.map(s => ({ stop_id: s.id, distance_m: s.distanceM })),
          );
          buildingsProcessed++;
        } catch {
          buildingsSkipped++;
        }
      }),
    );
  }

  return { buildingsProcessed, buildingsSkipped };
}

// ─── alerts sync ──────────────────────────────────────────────────────────────

interface AlertsSyncResult {
  alertsUpserted: number;
}

function mapAlertEffect(effect: string): AlertEffect {
  const valid: AlertEffect[] = [
    'NO_SERVICE', 'REDUCED_SERVICE', 'SIGNIFICANT_DELAYS', 'DETOUR',
    'ADDITIONAL_SERVICE', 'MODIFIED_SERVICE', 'OTHER_EFFECT',
    'UNKNOWN_EFFECT', 'STOP_MOVED', 'NO_EFFECT',
  ];
  return valid.includes(effect as AlertEffect) ? (effect as AlertEffect) : 'UNKNOWN_EFFECT';
}

async function syncAlerts(): Promise<AlertsSyncResult> {
  const url = `${GTFS_RT_BASE}/Alerts.txt?key=${BKK_KEY}`;
  const res = await fetch(url, {
    headers: { ...BKK_HEADERS, 'Accept': '*/*' },
    signal:  AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GTFS-RT Alerts HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const text = await res.text();
  const parsed = parseAlerts(text);

  const alerts: TransitAlert[] = parsed.map(a => ({
    id:              a.id,
    headerText:      a.headerText,
    descriptionText: a.descriptionText,
    effect:          mapAlertEffect(a.effect),
    severity:        a.severity,
    routes:          a.routes,
    startTime:       a.startTime,
    endTime:         a.endTime,
    url:             a.url,
  }));

  const supabase = createServiceClient();

  await upsertCatalogAlerts(supabase, alerts);

  // Backward compat: also write to the old transit_alert_cache singleton
  void saveAlertsToCache(supabase, alerts)
    .catch(e => console.warn('[transit/sync] legacy alert cache save failed:', e));

  return { alertsUpserted: alerts.length };
}

// ─── Request handlers ─────────────────────────────────────────────────────────

async function handleRequest(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({
      error: 'Unauthorized',
      hint: 'Use Vercel Cron (x-vercel-cron), Authorization: Bearer <CRON_SECRET|TRANSIT_SYNC_SECRET>, or ?secret=<...>',
    }, { status: 401 });
  }

  if (!BKK_KEY) {
    return NextResponse.json({ error: 'Missing BKKFUTAR_API_KEY' }, { status: 500 });
  }

  const { searchParams } = request.nextUrl;
  let action = searchParams.get('action') ?? '';

  // For manual POST testing: fall back to reading action from JSON body
  if (!action && request.method === 'POST') {
    try {
      const body = await request.clone().json() as { action?: string };
      action = body?.action ?? '';
    } catch { /* ignore parse errors */ }
  }

  if (!action) action = 'stops-routes';

  try {
    if (action === 'stops-routes') {
      const cellParam = searchParams.get('cell');
      if (cellParam !== null) {
        const cellIndex = parseInt(cellParam, 10);
        if (isNaN(cellIndex) || cellIndex < 0 || cellIndex >= GRID.length) {
          return NextResponse.json(
            { error: `cell must be 0–${GRID.length - 1}` },
            { status: 400 },
          );
        }
        const result = await syncStopsRoutesCell(cellIndex);
        return NextResponse.json({ ...result, syncedAt: new Date().toISOString() });
      }

      // No cell param — process all cells sequentially
      const results: StopRouteSyncResult[] = [];
      for (let i = 0; i < GRID.length; i++) {
        const r = await syncStopsRoutesCell(i);
        results.push(r);
      }
      return NextResponse.json({
        cells:          results,
        totalStops:     results.reduce((acc, r) => acc + r.stopsUpserted,  0),
        totalRoutes:    results.reduce((acc, r) => acc + r.routesUpserted, 0),
        totalPairs:     results.reduce((acc, r) => acc + r.pairsUpserted,  0),
        syncedAt:       new Date().toISOString(),
      });
    }

    if (action === 'building-stops') {
      const result = await syncBuildingStops();
      return NextResponse.json({ ...result, syncedAt: new Date().toISOString() });
    }

    if (action === 'alerts') {
      const result = await syncAlerts();
      return NextResponse.json({ ...result, syncedAt: new Date().toISOString() });
    }

    return NextResponse.json(
      { error: `Unknown action "${action}". Use: stops-routes, building-stops, alerts` },
      { status: 400 },
    );
  } catch (err) {
    console.error(`[transit/sync] action=${action} error:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

// GET — Vercel cron (checks CRON_SECRET, falls back to TRANSIT_SYNC_SECRET)
export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleRequest(request);
}

// POST — manual trigger (checks TRANSIT_SYNC_SECRET, falls back to CRON_SECRET)
export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleRequest(request);
}
