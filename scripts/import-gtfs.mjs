#!/usr/bin/env node
/**
 * BKK GTFS Static Import Script
 *
 * Reads the BKK GTFS static feed and upserts all stops, routes, and
 * stop–route relationships directly into Supabase — no BKK API calls,
 * no rate limits.
 *
 * Usage (from the panellako project root):
 *   node scripts/import-gtfs.mjs /path/to/extracted-gtfs/
 *
 * The GTFS directory must contain:
 *   stops.txt, routes.txt, trips.txt, stop_times.txt
 *
 * Credentials are read from .env.local (NEXT_PUBLIC_SUPABASE_URL +
 * NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY).
 */

import { createReadStream } from 'fs';
import { readFile, access } from 'fs/promises';
import { createInterface } from 'readline';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// ─── CLI args ─────────────────────────────────────────────────────────────────

const gtfsDir = process.argv[2];
if (!gtfsDir) {
  console.error('Usage: node scripts/import-gtfs.mjs /path/to/extracted-gtfs/');
  process.exit(1);
}

// ─── Load .env.local ──────────────────────────────────────────────────────────

async function loadEnv() {
  const files = ['.env.local', '.env'];
  for (const file of files) {
    try {
      const text = await readFile(file, 'utf-8');
      const env = {};
      for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
      return env;
    } catch { /* try next */ }
  }
  return {};
}

// ─── Stream CSV helper ────────────────────────────────────────────────────────

async function* streamCsv(filePath) {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let headers = null;
  for await (const rawLine of rl) {
    // Strip UTF-8 BOM if present on first line
    const line = rawLine.replace(/^﻿/, '');
    if (!line.trim()) continue;

    if (!headers) {
      headers = line.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      continue;
    }

    // Simple CSV split (handles quoted fields with commas inside)
    const values = [];
    let current = '';
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { values.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    yield row;
  }
}

// ─── GTFS type → RouteType ────────────────────────────────────────────────────

const TYPE_MAP = {
  0: 'TRAM', 1: 'SUBWAY', 2: 'RAIL', 3: 'BUS',
  4: 'FERRY', 5: 'CABLE_CAR', 7: 'CABLE_CAR', 11: 'TROLLEYBUS', 12: 'TRAM',
};

const TYPE_PRIORITY = {
  SUBWAY: 0, RAIL: 1, TRAM: 2, TROLLEYBUS: 3, BUS: 4, FERRY: 5, CABLE_CAR: 6,
};

function bestType(a, b) {
  return (TYPE_PRIORITY[a] ?? 99) <= (TYPE_PRIORITY[b] ?? 99) ? a : b;
}

// ─── Supabase batch upsert ────────────────────────────────────────────────────

async function batchUpsert(supabase, table, rows, conflictCol, batchSize = 500) {
  let done = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: conflictCol });
    if (error) throw new Error(`Upsert ${table} batch ${i}: ${error.message}`);
    done += batch.length;
    process.stdout.write(`\r  ${table}: ${done}/${rows.length}`);
  }
  process.stdout.write('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🚌 BKK GTFS import — directory: ${gtfsDir}\n`);

  // Verify required files exist
  const required = ['stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt'];
  for (const f of required) {
    const p = join(gtfsDir, f);
    await access(p).catch(() => { console.error(`Missing: ${p}`); process.exit(1); });
    console.log(`  ✓ found ${f}`);
  }
  console.log();

  // Load credentials
  const env = await loadEnv();
  const url = (env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL ?? '').trim();
  const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY ?? env.NEXT_SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  const anonKey    = (env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  const key = serviceKey.startsWith('eyJ') ? serviceKey : anonKey;

  if (!url || !key) {
    console.error('Could not find Supabase credentials in .env.local');
    console.error('Expected: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    process.exit(1);
  }

  const usingServiceRole = key === serviceKey;
  console.log(`🔑 Using ${usingServiceRole ? 'service role key' : 'anon key'} — ${url}\n`);

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // ── 1. Read routes.txt ────────────────────────────────────────────────────
  console.log('📍 Reading routes.txt …');
  const routeRows = [];
  const routeTypeMap = {}; // route_id → RouteType

  for await (const r of streamCsv(join(gtfsDir, 'routes.txt'))) {
    const gtfsType = parseInt(r.route_type ?? '3', 10);
    const type = TYPE_MAP[gtfsType] ?? 'BUS';
    routeTypeMap[r.route_id] = type;
    routeRows.push({
      route_id:   r.route_id,
      short_name: r.route_short_name ?? r.route_id,
      type,
      color:      r.route_color     ? `#${r.route_color}`      : undefined,
      text_color: r.route_text_color ? `#${r.route_text_color}` : undefined,
      synced_at:  new Date().toISOString(),
    });
  }
  console.log(`  → ${routeRows.length} routes\n`);

  // ── 2. Read trips.txt → trip→route map ───────────────────────────────────
  console.log('🗺️  Reading trips.txt (building trip→route map) …');
  const tripRouteMap = {}; // trip_id → route_id
  let tripCount = 0;

  for await (const t of streamCsv(join(gtfsDir, 'trips.txt'))) {
    tripRouteMap[t.trip_id] = t.route_id;
    tripCount++;
    if (tripCount % 100_000 === 0) process.stdout.write(`\r  ${tripCount} trips read…`);
  }
  process.stdout.write(`\r  → ${tripCount} trips\n\n`);

  // ── 3. Read stops.txt ─────────────────────────────────────────────────────
  console.log('🚏 Reading stops.txt …');
  const stopMap = {}; // stop_id → row (will be enriched with route_refs later)
  let stopCount = 0;

  for await (const s of streamCsv(join(gtfsDir, 'stops.txt'))) {
    const lat = parseFloat(s.stop_lat);
    const lon = parseFloat(s.stop_lon);
    if (isNaN(lat) || isNaN(lon)) continue; // skip stops without coords
    stopMap[s.stop_id] = {
      stop_id:    s.stop_id,
      name:       s.stop_name ?? s.stop_id,
      lat,
      lon,
      route_type: 'BUS', // will be updated from stop_times
      route_refs: [],     // will be filled from stop_times
      synced_at:  new Date().toISOString(),
    };
    stopCount++;
  }
  console.log(`  → ${stopCount} stops with coordinates\n`);

  // ── 4. Stream stop_times.txt → stop→route relationships ──────────────────
  console.log('⏱️  Streaming stop_times.txt (this is the large file, please wait) …');
  const stopRouteSet = new Set(); // "stop_id|route_id"
  const stopRouteRefs = {}; // stop_id → Set<short_name>
  const stopPrimaryType = {}; // stop_id → best RouteType
  let lineCount = 0;
  let pairCount = 0;

  for await (const st of streamCsv(join(gtfsDir, 'stop_times.txt'))) {
    lineCount++;
    if (lineCount % 500_000 === 0) {
      process.stdout.write(`\r  ${(lineCount / 1_000_000).toFixed(1)}M lines, ${pairCount} unique pairs…`);
    }

    const routeId = tripRouteMap[st.trip_id];
    if (!routeId) continue;
    const stopId  = st.stop_id;
    if (!stopMap[stopId]) continue; // skip stops we don't know about

    const key2 = `${stopId}|${routeId}`;
    if (stopRouteSet.has(key2)) continue;
    stopRouteSet.add(key2);
    pairCount++;

    // Track route_refs (short names) per stop
    if (!stopRouteRefs[stopId]) stopRouteRefs[stopId] = new Set();
    const routeDef = routeRows.find(r => r.route_id === routeId);
    if (routeDef?.short_name) stopRouteRefs[stopId].add(routeDef.short_name);

    // Track best route type per stop
    const routeType = routeTypeMap[routeId] ?? 'BUS';
    stopPrimaryType[stopId] = stopPrimaryType[stopId]
      ? bestType(stopPrimaryType[stopId], routeType)
      : routeType;
  }
  process.stdout.write(`\r  → ${lineCount.toLocaleString()} lines, ${pairCount} unique stop–route pairs\n\n`);

  // ── 5. Enrich stops with route_refs + primary type ────────────────────────
  console.log('✏️  Enriching stops with route_refs …');
  for (const [stopId, stop] of Object.entries(stopMap)) {
    stop.route_refs = Array.from(stopRouteRefs[stopId] ?? []).sort();
    stop.route_type = stopPrimaryType[stopId] ?? 'BUS';
  }
  const enrichedStops = Object.values(stopMap);
  console.log(`  → ${enrichedStops.length} stops enriched\n`);

  // ── 6. Build stop_route pair rows ─────────────────────────────────────────
  const pairRows = Array.from(stopRouteSet).map(key2 => {
    const [stop_id, route_id] = key2.split('|');
    return { stop_id, route_id };
  });

  // ── 7. Upsert to Supabase ─────────────────────────────────────────────────
  console.log('⬆️  Upserting to Supabase …\n');

  // Routes first (stops reference them via route_refs, not FK though)
  await batchUpsert(supabase, 'transit_routes', routeRows, 'route_id');

  // Stops
  await batchUpsert(supabase, 'transit_stops', enrichedStops, 'stop_id');

  // Stop–route pairs (largest batch)
  await batchUpsert(supabase, 'transit_stop_routes', pairRows, 'stop_id,route_id');

  // ── 8. Done ───────────────────────────────────────────────────────────────
  console.log('\n✅ Import complete!\n');
  console.log(`   Routes:          ${routeRows.length}`);
  console.log(`   Stops:           ${enrichedStops.length}`);
  console.log(`   Stop–route pairs: ${pairRows.length}`);
  console.log('\nRun "BKK Building stops" in the superadmin panel to compute');
  console.log('the per-building stop distances (no BKK API needed — uses DB only).\n');
}

main().catch(err => { console.error('\n❌ Error:', err.message); process.exit(1); });
