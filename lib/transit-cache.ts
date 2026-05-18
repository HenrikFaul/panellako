/**
 * transit-cache.ts
 * Shared helpers for reading/writing BKK transit data to the Supabase DB cache.
 *
 * Stop data is cached per building (stale after 23 h).
 * Alert data is cached globally in a singleton row (stale after 5 min).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NearbyStop } from '@/app/api/transit/nearby/route';
import type { TransitAlert } from '@/app/api/transit/alerts/route';

// ─── Stop cache ───────────────────────────────────────────────────────────────

/**
 * Read cached stops for a building.
 * Returns null if there are no rows or any row is older than 23 hours.
 */
export async function loadStopsFromCache(
  supabase: SupabaseClient,
  buildingId: string,
): Promise<NearbyStop[] | null> {
  const cutoff = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('transit_stop_cache')
    .select('stop_data, computed_at')
    .eq('building_id', buildingId)
    .order('distance_m', { ascending: true });

  if (error || !data || data.length === 0) return null;

  // If any row is stale, treat the whole cache as invalid
  const hasStale = data.some(
    (row: { computed_at: string }) => row.computed_at < cutoff,
  );
  if (hasStale) return null;

  return data.map((row: { stop_data: NearbyStop }) => row.stop_data as NearbyStop);
}

/**
 * Persist stops for a building.
 * Deletes all existing rows for the building first, then inserts fresh ones.
 */
export async function saveStopsToCache(
  supabase: SupabaseClient,
  buildingId: string,
  stops: NearbyStop[],
): Promise<void> {
  // Delete stale rows
  await supabase
    .from('transit_stop_cache')
    .delete()
    .eq('building_id', buildingId);

  if (stops.length === 0) return;

  const now = new Date().toISOString();
  const rows = stops.map(stop => ({
    building_id: buildingId,
    stop_id:     stop.id,
    stop_data:   stop as unknown as Record<string, unknown>,
    distance_m:  stop.distanceM,
    computed_at: now,
  }));

  const { error } = await supabase.from('transit_stop_cache').insert(rows);
  if (error) {
    console.error('[transit-cache] saveStopsToCache error:', error.message);
  }
}

// ─── Alert cache ──────────────────────────────────────────────────────────────

/**
 * Read globally cached alerts.
 * Returns null if the singleton row is missing or older than 5 minutes.
 */
export async function loadAlertsFromCache(
  supabase: SupabaseClient,
): Promise<TransitAlert[] | null> {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('transit_alert_cache')
    .select('alerts, fetched_at')
    .eq('singleton', true)
    .single();

  if (error || !data) return null;
  if ((data as { fetched_at: string }).fetched_at < cutoff) return null;

  return (data as { alerts: TransitAlert[] }).alerts as TransitAlert[];
}

/**
 * Persist alerts to the global singleton row.
 * Uses INSERT … ON CONFLICT DO UPDATE so it works whether the row exists or not.
 */
export async function saveAlertsToCache(
  supabase: SupabaseClient,
  alerts: TransitAlert[],
): Promise<void> {
  const { error } = await supabase.from('transit_alert_cache').upsert(
    {
      singleton:  true,
      alerts:     alerts as unknown as Record<string, unknown>[],
      fetched_at: new Date().toISOString(),
    },
    { onConflict: 'singleton' },
  );
  if (error) {
    console.error('[transit-cache] saveAlertsToCache error:', error.message);
  }
}
