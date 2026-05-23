/**
 * transit-catalog.ts
 * Helpers for reading and writing the normalised transit catalog tables:
 *   transit_stops, transit_routes, transit_stop_routes, building_stops, transit_alerts
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NearbyStop, RouteType } from '@/app/api/transit/nearby/route';
import type { TransitAlert, AlertEffect, AlertSeverity } from '@/app/api/transit/alerts/route';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function alertSeverity(effect: AlertEffect): AlertSeverity {
  if (['NO_SERVICE', 'SIGNIFICANT_DELAYS'].includes(effect))
    return { level: 'high',   color: '#ef4444' };
  if (['REDUCED_SERVICE', 'DETOUR', 'MODIFIED_SERVICE'].includes(effect))
    return { level: 'medium', color: '#f97316' };
  return   { level: 'low',    color: '#eab308' };
}

// ─── DB row types ─────────────────────────────────────────────────────────────

interface StopRow {
  stop_id:    string;
  name:       string;
  lat:        number;
  lon:        number;
  route_type: string;
  route_refs: string[];
}

interface AlertRow {
  alert_id:    string;
  header_text: string;
  desc_text:   string;
  effect:      string;
  route_refs:  string[];
  starts_at:   string | null;
  ends_at:     string | null;
  url:         string | null;
  fetched_at:  string;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

/**
 * Load stops for a building using the building_stops join table.
 * Returns null if no rows found (signals: not pre-computed yet).
 */
export async function loadBuildingStops(
  supabase: SupabaseClient,
  buildingId: string,
): Promise<NearbyStop[] | null> {
  const { data, error } = await supabase
    .from('building_stops')
    .select('distance_m, transit_stops(stop_id, name, lat, lon, route_type, route_refs)')
    .eq('building_id', buildingId)
    .order('distance_m', { ascending: true });

  if (error || !data || data.length === 0) return null;

  const stops: NearbyStop[] = [];
  const seenIds = new Set<string>();
  for (const row of data as Array<{ distance_m: number; transit_stops: StopRow[] | StopRow | null }>) {
    // Supabase returns the related row as array or object depending on the relation cardinality
    const s = Array.isArray(row.transit_stops)
      ? row.transit_stops[0]
      : row.transit_stops;
    if (!s) continue;
    // Deduplicate: skip if we've already seen this stop_id (guards against bad cron data)
    if (seenIds.has(s.stop_id)) continue;
    // Guard against null/empty names from bad cron writes
    if (!s.name) continue;
    seenIds.add(s.stop_id);
    stops.push({
      id:         s.stop_id,
      name:       s.name,
      lat:        s.lat,
      lon:        s.lon,
      distanceM:  row.distance_m,
      routeRefs:  s.route_refs ?? [],
      routeType:  (s.route_type as RouteType) ?? 'BUS',
    });
  }

  return stops.length > 0 ? stops : null;
}

/**
 * Load all stops within a bounding box — used for the map view where the
 * frontend passes the full viewport bounds via latSpan/lonSpan.
 * Returns null only if the table is empty (not seeded yet).
 */
export async function loadStopsInBbox(
  supabase: SupabaseClient,
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
  centerLat: number,
  centerLon: number,
  limit = 400,
): Promise<NearbyStop[] | null> {
  const { data, error } = await supabase
    .from('transit_stops')
    .select('stop_id, name, lat, lon, route_type, route_refs')
    .gte('lat', minLat).lte('lat', maxLat)
    .gte('lon', minLon).lte('lon', maxLon)
    .limit(limit);

  if (error) return null;
  if (!data || data.length === 0) return null;

  return (data as StopRow[])
    .map(s => ({
      id:        s.stop_id,
      name:      s.name,
      lat:       s.lat,
      lon:       s.lon,
      distanceM: Math.round(haversineM(centerLat, centerLon, s.lat, s.lon)),
      routeRefs: s.route_refs ?? [],
      routeType: (s.route_type as RouteType) ?? 'BUS',
    }))
    .sort((a, b) => a.distanceM - b.distanceM);
}

/**
 * Load stops near a lat/lon using a bounding-box query on transit_stops.
 * Uses haversine to compute exact distances, filters to ≤maxDistM, sorts, slices 12.
 * Returns null if the table is empty (signals: not seeded yet).
 */
export async function loadNearbyStops(
  supabase: SupabaseClient,
  lat: number,
  lon: number,
  maxDistM = 700,
): Promise<NearbyStop[] | null> {
  const LAT_DELTA = 0.008; // ~900 m
  const LON_DELTA = 0.011;

  const { data, error } = await supabase
    .from('transit_stops')
    .select('stop_id, name, lat, lon, route_type, route_refs')
    .gte('lat', lat - LAT_DELTA)
    .lte('lat', lat + LAT_DELTA)
    .gte('lon', lon - LON_DELTA)
    .lte('lon', lon + LON_DELTA);

  if (error) return null;
  if (!data || data.length === 0) return null; // not seeded

  const stops: NearbyStop[] = (data as StopRow[])
    .map(s => ({
      id:        s.stop_id,
      name:      s.name,
      lat:       s.lat,
      lon:       s.lon,
      distanceM: Math.round(haversineM(lat, lon, s.lat, s.lon)),
      routeRefs: s.route_refs ?? [],
      routeType: (s.route_type as RouteType) ?? 'BUS',
    }))
    .filter(s => s.distanceM <= maxDistM)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 12);

  return stops.length > 0 ? stops : null;
}

/**
 * Load active alerts from transit_alerts.
 * "Active" = fetched_at > 30 min ago AND (ends_at IS NULL OR ends_at > now).
 * Returns null if no fresh rows exist.
 */
export async function loadCatalogAlerts(
  supabase: SupabaseClient,
): Promise<TransitAlert[] | null> {
  const freshCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const nowIso      = new Date().toISOString();

  const { data, error } = await supabase
    .from('transit_alerts')
    .select('alert_id, header_text, desc_text, effect, route_refs, starts_at, ends_at, url, fetched_at')
    .gt('fetched_at', freshCutoff)
    .or(`ends_at.is.null,ends_at.gt.${nowIso}`);

  if (error || !data || data.length === 0) return null;

  return (data as AlertRow[]).map(row => ({
    id:              row.alert_id,
    headerText:      row.header_text,
    descriptionText: row.desc_text,
    effect:          row.effect as AlertEffect,
    severity:        alertSeverity(row.effect as AlertEffect),
    routes:          row.route_refs ?? [],
    startTime:       row.starts_at ? Math.floor(new Date(row.starts_at).getTime() / 1000) : null,
    endTime:         row.ends_at   ? Math.floor(new Date(row.ends_at).getTime()   / 1000) : null,
    url:             row.url ?? null,
  }));
}

// ─── Writes ───────────────────────────────────────────────────────────────────

/**
 * Upsert stops into transit_stops. Processed in batches of 500.
 */
export async function upsertTransitStops(
  supabase: SupabaseClient,
  rows: Array<{
    stop_id:    string;
    name:       string;
    lat:        number;
    lon:        number;
    route_type: string;
    route_refs: string[];
  }>,
): Promise<void> {
  const BATCH = 500;
  const now   = new Date().toISOString();

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map(r => ({ ...r, synced_at: now }));
    const { error } = await supabase
      .from('transit_stops')
      .upsert(batch, { onConflict: 'stop_id' });
    if (error) {
      console.error('[transit-catalog] upsertTransitStops error:', error.message);
    }
  }
}

/**
 * Upsert routes into transit_routes.
 */
export async function upsertTransitRoutes(
  supabase: SupabaseClient,
  rows: Array<{
    route_id:   string;
    short_name: string;
    type:       string;
    color?:     string;
    text_color?: string;
  }>,
): Promise<void> {
  if (rows.length === 0) return;
  const now = new Date().toISOString();
  const mapped = rows.map(r => ({ ...r, synced_at: now }));
  const { error } = await supabase
    .from('transit_routes')
    .upsert(mapped, { onConflict: 'route_id' });
  if (error) {
    console.error('[transit-catalog] upsertTransitRoutes error:', error.message);
  }
}

/**
 * Upsert stop-route pairs into transit_stop_routes.
 */
export async function upsertTransitStopRoutes(
  supabase: SupabaseClient,
  rows: Array<{ stop_id: string; route_id: string }>,
): Promise<void> {
  if (rows.length === 0) return;
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('transit_stop_routes')
      .upsert(batch, { onConflict: 'stop_id,route_id', ignoreDuplicates: true });
    if (error) {
      console.error('[transit-catalog] upsertTransitStopRoutes error:', error.message);
    }
  }
}

/**
 * Replace building_stops rows for a building.
 * Deletes existing rows first, then inserts fresh ones.
 */
export async function upsertBuildingStops(
  supabase: SupabaseClient,
  buildingId: string,
  stops: Array<{ stop_id: string; distance_m: number }>,
): Promise<void> {
  await supabase
    .from('building_stops')
    .delete()
    .eq('building_id', buildingId);

  if (stops.length === 0) return;

  const rows = stops.map(s => ({
    building_id: buildingId,
    stop_id:     s.stop_id,
    distance_m:  s.distance_m,
  }));

  const { error } = await supabase.from('building_stops').insert(rows);
  if (error) {
    console.error('[transit-catalog] upsertBuildingStops error:', error.message);
  }
}

/**
 * Upsert alerts into transit_alerts.
 * After inserting, delete any rows with fetched_at < now()-20min that aren't in the new set.
 */
export async function upsertCatalogAlerts(
  supabase: SupabaseClient,
  alerts: TransitAlert[],
): Promise<void> {
  if (alerts.length === 0) return;

  const now = new Date().toISOString();
  const rows = alerts.map(a => ({
    alert_id:    a.id,
    header_text: a.headerText,
    desc_text:   a.descriptionText,
    effect:      a.effect,
    route_refs:  a.routes,
    starts_at:   a.startTime ? new Date(a.startTime * 1000).toISOString() : null,
    ends_at:     a.endTime   ? new Date(a.endTime   * 1000).toISOString() : null,
    url:         a.url,
    fetched_at:  now,
  }));

  const { error } = await supabase
    .from('transit_alerts')
    .upsert(rows, { onConflict: 'alert_id' });
  if (error) {
    console.error('[transit-catalog] upsertCatalogAlerts upsert error:', error.message);
  }

  // Purge stale rows not in the new set
  const staleCutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const newIds      = alerts.map(a => a.id);
  if (newIds.length > 0) {
    const { error: delError } = await supabase
      .from('transit_alerts')
      .delete()
      .lt('fetched_at', staleCutoff)
      .not('alert_id', 'in', `(${newIds.map(id => `"${id}"`).join(',')})`);
    if (delError) {
      console.warn('[transit-catalog] upsertCatalogAlerts purge error:', delError.message);
    }
  }
}
