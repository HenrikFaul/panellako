/**
 * import-hungary-addresses.mjs
 *
 * Imports Hungarian address data from OpenStreetMap Overpass API into
 * the GeoData Supabase project's public.osm_addresses table.
 *
 * Usage:
 *   node scripts/import-hungary-addresses.mjs [--phase=1|2|all] [--county=Budapest]
 *
 * Phase 1: All Hungarian settlement/place nodes (~10k rows)  — fast (~60s)
 * Phase 2: Full address nodes with housenumber+street, county by county — slow (30-90 min)
 *
 * Required env vars (from .env or environment):
 *   SUPABASE_URL                       = https://buuoyyfzincmbxafvihc.supabase.co
 *   GEODATA_SUPABASE_SERVICE_ROLE_KEY  = eyJ...
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Load .env manually (no dotenv dependency needed) ─────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.GEODATA_SUPABASE_SERVICE_ROLE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing SUPABASE_URL or GEODATA_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ─── Args ──────────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, v = 'true'] = a.slice(2).split('='); return [k, v]; })
);
const PHASE  = args.phase  ?? 'all';
const COUNTY = args.county ?? null;

// ─── Hungarian counties with bounding boxes [minLat, minLon, maxLat, maxLon] ──
const COUNTIES = [
  { name: 'Budapest',               bbox: [47.35, 18.87, 47.62, 19.34] },
  { name: 'Pest',                   bbox: [47.00, 18.60, 48.35, 20.25] },
  { name: 'Baranya',                bbox: [45.73, 17.55, 46.25, 18.61] },
  { name: 'Bács-Kiskun',            bbox: [46.03, 18.76, 47.28, 20.21] },
  { name: 'Békés',                  bbox: [46.44, 20.59, 47.10, 21.63] },
  { name: 'Borsod-Abaúj-Zemplén',  bbox: [47.53, 20.16, 48.60, 22.04] },
  { name: 'Csongrád-Csanád',        bbox: [45.93, 19.58, 46.83, 21.14] },
  { name: 'Fejér',                  bbox: [46.71, 17.93, 47.63, 19.01] },
  { name: 'Győr-Moson-Sopron',      bbox: [47.43, 16.43, 48.10, 18.03] },
  { name: 'Hajdú-Bihar',            bbox: [47.02, 21.25, 48.03, 22.62] },
  { name: 'Heves',                  bbox: [47.43, 19.50, 48.12, 20.88] },
  { name: 'Jász-Nagykun-Szolnok',  bbox: [46.70, 19.64, 47.79, 21.13] },
  { name: 'Komárom-Esztergom',      bbox: [47.39, 17.81, 47.90, 18.92] },
  { name: 'Nógrád',                 bbox: [47.65, 18.81, 48.30, 20.09] },
  { name: 'Somogy',                 bbox: [46.11, 16.88, 47.03, 18.33] },
  { name: 'Szabolcs-Szatmár-Bereg', bbox: [47.44, 21.49, 48.59, 23.02] },
  { name: 'Tolna',                  bbox: [46.17, 17.89, 46.94, 18.96] },
  { name: 'Vas',                    bbox: [46.72, 16.05, 47.58, 17.43] },
  { name: 'Veszprém',               bbox: [46.76, 17.35, 47.59, 18.39] },
  { name: 'Zala',                   bbox: [46.20, 16.25, 46.99, 17.36] },
];

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const BATCH_SIZE   = 500;
const SLEEP_MS     = 3000; // polite pause between county queries

// ─── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalizeStreetType(raw) {
  if (!raw) return null;
  const map = {
    'utca': 'utca', 'út': 'út', 'tér': 'tér', 'köz': 'köz', 'körút': 'körút',
    'sétány': 'sétány', 'sor': 'sor', 'fasor': 'fasor', 'rakpart': 'rakpart',
    'dűlő': 'dűlő', 'liget': 'liget', 'park': 'park', 'lejtő': 'lejtő',
    'u': 'utca', 'u.': 'utca', 'krt': 'körút', 'krt.': 'körút',
    'tere': 'tér', 'útja': 'út', 'körúton': 'körút',
  };
  const lower = raw.toLowerCase().trim();
  return map[lower] ?? lower;
}

function parseStreet(street) {
  if (!street) return { name: null, type: null };
  const TYPES = ['utca', 'út', 'tér', 'köz', 'körút', 'sétány', 'sor', 'fasor',
                 'rakpart', 'dűlő', 'liget', 'park', 'lejtő', 'sugárút', 'lakótelep'];
  for (const t of TYPES) {
    if (street.toLowerCase().endsWith(` ${t}`)) {
      return { name: street.slice(0, street.length - t.length - 1).trim(), type: t };
    }
  }
  // "Kossuth Lajos u." pattern
  const match = street.match(/^(.+?)\s+(u\.|ut\.|útja|tere|köze|rakpartja)$/i);
  if (match) return { name: match[1].trim(), type: match[2].replace(/\.$/,'') };
  return { name: street, type: null };
}

function buildDisplayName(tags) {
  const pc   = tags['addr:postcode']  || tags['postal_code'] || '';
  const city = tags['addr:city']      || tags['addr:town']   || tags['addr:village']
             || tags['addr:municipality'] || tags['name'] || '';
  const street = tags['addr:street'] || '';
  const hn     = tags['addr:housenumber'] || '';
  const parts = [pc && city ? `${pc} ${city}` : (city || pc), street, hn].filter(Boolean);
  return parts.length ? `HU, ${parts.join(', ')}` : null;
}

function elementToRow(el, county) {
  const tags = el.tags || {};
  const lat  = el.lat  ?? el.center?.lat ?? null;
  const lon  = el.lon  ?? el.center?.lon ?? null;
  const street = tags['addr:street'] || '';
  const { name: streetName, type: streetType } = parseStreet(street);
  const houseNumber = tags['addr:housenumber'] || null;
  const city   = tags['addr:city']   || tags['addr:town']   || tags['addr:village']
               || tags['addr:municipality'] || tags['is_in:city'] || null;
  const postcode = tags['addr:postcode'] || tags['postal_code'] || null;
  const place    = tags['place'] || null;

  // For place nodes (settlement-level), set appropriate city/town/village fields
  const isPlace = !!place;
  const placeType = place;
  const name = tags['name'] || tags['name:hu'] || null;

  const settlementCity    = isPlace && ['city','municipality'].includes(placeType) ? name : (city || null);
  const settlementTown    = isPlace && placeType === 'town'   ? name : null;
  const settlementVillage = isPlace && ['village','hamlet','suburb','district'].includes(placeType) ? name : null;

  return {
    external_id:           `osm:${el.type}:${el.id}`,
    osm_id:                el.id,
    osm_type:              el.type,
    name:                  name,
    country:               'Magyarország',
    country_code:          'HU',
    state:                 county ?? null,
    postcode:              postcode,
    city:                  settlementCity ?? city,
    town:                  settlementTown,
    village:               settlementVillage,
    district:              tags['addr:district'] || tags['is_in:district'] || null,
    suburb:                tags['addr:suburb']   || (isPlace && placeType === 'suburb' ? name : null),
    neighbourhood:         tags['addr:neighbourhood'] || (isPlace && placeType === 'neighbourhood' ? name : null),
    hamlet:                isPlace && placeType === 'hamlet' ? name : null,
    municipality:          isPlace && placeType === 'municipality' ? name : null,
    street:                street || null,
    street_name:           streetName,
    street_type:           streetType,
    street_type_normalized: normalizeStreetType(streetType),
    house_number:          houseNumber,
    housenumber:           houseNumber,
    house_number_suffix:   tags['addr:housename'] || null,
    conscriptionnumber:    tags['addr:conscriptionnumber'] || null,
    staircase:             tags['addr:staircase'] || null,
    entrance:              tags['addr:entrance']  || null,
    floor:                 tags['addr:floor']     || null,
    door:                  tags['addr:door']      || null,
    unit:                  tags['addr:unit']      || null,
    block:                 tags['addr:block']     || null,
    building:              tags['building']       || null,
    place:                 place,
    lat:                   lat,
    lon:                   lon,
    geometry_type:         'Point',
    display_name:          buildDisplayName(tags) || (name ? `HU, ${name}` : null),
    source_file:           `overpass/${county ?? 'Hungary'}`,
    raw_tags:              tags,
    raw_feature:           { id: el.id, type: el.type, lat, lon },
    updated_at:            new Date().toISOString(),
  };
}

// ─── Supabase upsert ────────────────────────────────────────────────────────

async function upsertBatch(rows) {
  const url  = `${SUPABASE_URL}/rest/v1/osm_addresses`;
  const body = JSON.stringify(rows);
  const res  = await fetch(url, {
    method:  'POST',
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'resolution=merge-duplicates,return=minimal',
    },
    body,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase upsert failed (${res.status}): ${err.slice(0, 300)}`);
  }
}

async function insertRows(rows, label) {
  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await upsertBatch(batch);
    total += batch.length;
    process.stdout.write(`\r  ${label}: ${total}/${rows.length} rows inserted`);
  }
  console.log(`\r  ✓ ${label}: ${total} rows`);
  return total;
}

// ─── Overpass fetch ────────────────────────────────────────────────────────────

async function overpassQuery(query, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(OVERPASS_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    `data=${encodeURIComponent(query)}`,
        signal:  AbortSignal.timeout(240_000),
      });
      if (res.status === 429 || res.status === 503) {
        const wait = attempt * 30_000;
        console.log(`\n  ⏳ Overpass rate limit (${res.status}), waiting ${wait/1000}s...`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.elements ?? [];
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`\n  ⚠️  Retry ${attempt}/${retries}: ${err.message}`);
      await sleep(attempt * 15_000);
    }
  }
  return [];
}

// ─── Phase 1: Settlement nodes ─────────────────────────────────────────────────

async function phase1() {
  console.log('\n📍 Phase 1: Hungarian settlements (cities, towns, villages, hamlets)');
  const query = `
[out:json][timeout:90];
area["ISO3166-1"="HU"][admin_level="2"]->.hungary;
(
  node[place~"^(city|town|village|hamlet|suburb|quarter|neighbourhood|municipality|district)$"](area.hungary);
);
out body;`;

  console.log('  Querying Overpass API for all Hungarian place nodes...');
  const elements = await overpassQuery(query);
  console.log(`  Found ${elements.length} settlement nodes`);

  const rows = elements
    .filter(el => el.lat && el.lon)
    .map(el => elementToRow(el, null));

  if (rows.length === 0) {
    console.log('  ⚠️  No rows to insert');
    return 0;
  }
  return insertRows(rows, 'Settlements');
}

// ─── Phase 2: Address nodes by county ─────────────────────────────────────────

async function phase2County(county) {
  const [minLat, minLon, maxLat, maxLon] = county.bbox;
  console.log(`\n📦 ${county.name} (bbox: ${minLat},${minLon},${maxLat},${maxLon})`);

  const query = `
[out:json][timeout:180][maxsize:200000000];
(
  node["addr:housenumber"]["addr:street"](${minLat},${minLon},${maxLat},${maxLon});
  node["addr:housenumber"]["addr:city"](${minLat},${minLon},${maxLat},${maxLon});
);
out body;`;

  console.log('  Querying Overpass...');
  const elements = await overpassQuery(query);
  console.log(`  Found ${elements.length} address nodes`);

  if (elements.length === 0) return 0;

  const rows = elements
    .filter(el => el.lat && el.lon)
    .map(el => elementToRow(el, county.name));

  return insertRows(rows, county.name);
}

async function phase2(onlyCounty) {
  console.log('\n🏠 Phase 2: Full address nodes (housenumber + street) by county');

  const counties = onlyCounty
    ? COUNTIES.filter(c => c.name.toLowerCase() === onlyCounty.toLowerCase())
    : COUNTIES;

  if (onlyCounty && counties.length === 0) {
    console.error(`❌ Unknown county: ${onlyCounty}. Available: ${COUNTIES.map(c => c.name).join(', ')}`);
    process.exit(1);
  }

  let totalInserted = 0;
  for (let i = 0; i < counties.length; i++) {
    const county = counties[i];
    try {
      const n = await phase2County(county);
      totalInserted += n;
    } catch (err) {
      console.error(`\n  ❌ Error for ${county.name}: ${err.message}`);
    }
    if (i < counties.length - 1) {
      process.stdout.write(`  Pausing ${SLEEP_MS/1000}s before next county...\n`);
      await sleep(SLEEP_MS);
    }
  }
  return totalInserted;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🇭🇺 Hungary Address Import`);
  console.log(`   Supabase: ${SUPABASE_URL}`);
  console.log(`   Phase:    ${PHASE}`);
  if (COUNTY) console.log(`   County:   ${COUNTY}`);
  console.log('');

  // Verify connection
  const pingRes = await fetch(`${SUPABASE_URL}/rest/v1/osm_addresses?select=count&limit=1`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
  });
  if (!pingRes.ok) {
    console.error(`❌ Cannot reach osm_addresses table: ${pingRes.status}`);
    process.exit(1);
  }
  const countRes = await fetch(`${SUPABASE_URL}/rest/v1/osm_addresses?select=id&head=true`, {
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer':        'count=exact',
    },
  });
  const existing = countRes.headers.get('content-range')?.split('/')[1] ?? '?';
  console.log(`✓ Connected. Current row count: ${existing}\n`);

  let total = 0;

  if (PHASE === '1' || PHASE === 'all') {
    total += await phase1();
  }

  if (PHASE === '2' || PHASE === 'all') {
    total += await phase2(COUNTY);
  }

  console.log(`\n✅ Done! Total rows inserted/updated: ${total}`);

  // Final count
  const finalRes = await fetch(`${SUPABASE_URL}/rest/v1/osm_addresses?select=id&head=true`, {
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer':        'count=exact',
    },
  });
  const finalCount = finalRes.headers.get('content-range')?.split('/')[1] ?? '?';
  console.log(`   Total rows in osm_addresses: ${finalCount}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
