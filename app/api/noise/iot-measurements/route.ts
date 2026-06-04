// IoT / citizen-science noise measurements proxy for Budapest.
// Sources tried in order:
//   1. Noise-Planet / NoiseCapture REST API  — status: unverified endpoint
//   2. Noise-Planet GeoServer WFS            — status: unverified endpoint
// If both fail, returns empty FeatureCollection with status "unavailable".
// Result is cached in-memory for 1 hour (IoT data changes slowly).
//
// See docs/NOISE_MAP_ARCHITECTURE.md § "IoT acquisition plan" for full
// source provenance, licensing notes, and fallback policy.

import { NextRequest } from 'next/server';

// Budapest bounding box (WGS84)
const BP = {
  minLat: 47.3497,
  maxLat: 47.6167,
  minLon: 18.9000,
  maxLon: 19.3347,
};

const BBOX_STR = `${BP.minLon},${BP.minLat},${BP.maxLon},${BP.maxLat}`;

// Endpoints attempted in order. Both are marked unverified — the exact
// Noise-Planet API path needs confirmation against their documentation.
// See: https://noise-planet.org/  and  https://data.noise-planet.org/
const NC_ENDPOINTS = [
  // Primary: NoiseCapture REST API with bbox filter
  `https://data.noise-planet.org/api/noisecapture/measure?bbox=${BBOX_STR}&limit=500`,
  // Alternative: GeoServer WFS endpoint with BBOX CQL filter
  `https://data.noise-planet.org/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature` +
    `&typeName=noisecapture:noisecapture_area&outputFormat=application%2Fjson` +
    `&CQL_FILTER=BBOX(the_geom,${BBOX_STR})`,
];

// ─── In-memory cache (1 hour TTL) ─────────────────────────────────────────
interface CacheEntry { payload: IotResponse; ts: number }
let cache: CacheEntry | null = null;
const CACHE_TTL = 60 * 60 * 1000;

// ─── Response shape ────────────────────────────────────────────────────────
interface IotResponse {
  source:       'noisecapture' | 'none';
  status:       'ok' | 'unavailable';
  reason?:      string;
  retrieved_at: string;
  bbox:         typeof BP;
  data:         GeoJSONFC;
}

// ─── Route handler ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // ?nocache=1 bypasses the in-memory cache (useful for debugging / admin refresh)
  const nocache = req.nextUrl.searchParams.get('nocache') === '1';

  // Cache hit
  if (!nocache && cache && Date.now() - cache.ts < CACHE_TTL) {
    return Response.json({ ...cache.payload, cached: true });
  }

  for (const url of NC_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        signal:  AbortSignal.timeout(12_000),
        headers: {
          Accept:       'application/json',
          'User-Agent': 'panellako.hu/1.0 noise-iot-proxy',
        },
      });

      if (!res.ok) continue;
      const ct = res.headers.get('Content-Type') ?? '';
      if (!ct.includes('json') && !ct.includes('geo')) continue;

      const raw = await res.json();
      const data = toGeoJSON(raw);

      const payload: IotResponse = {
        source:       'noisecapture',
        status:       'ok',
        retrieved_at: new Date().toISOString(),
        bbox:         BP,
        data,
      };
      cache = { payload, ts: Date.now() };
      return Response.json(payload);
    } catch {
      // endpoint unreachable or timed out — try next
    }
  }

  // All endpoints failed — return empty with provenance note
  const fallback: IotResponse = {
    source:       'none',
    status:       'unavailable',
    reason:       'NoiseCapture API endpoints unreachable. ' +
                  'Source status: unverified. ' +
                  'System operating in static baseline mode (WMS strategic layer active). ' +
                  'See docs/NOISE_MAP_ARCHITECTURE.md for IoT source details.',
    retrieved_at: new Date().toISOString(),
    bbox:         BP,
    data:         emptyFC(),
  };
  return Response.json(fallback);
}

// ─── GeoJSON normalisation ─────────────────────────────────────────────────
// Accepts several response shapes from different Noise-Planet endpoint variants.

interface GeoJSONFC {
  type:     'FeatureCollection';
  features: GeoJSONFeature[];
}

interface GeoJSONFeature {
  type:       'Feature';
  geometry:   { type: 'Point'; coordinates: [number, number] };
  properties: { laeq: number; time: string | null; source: string };
}

function emptyFC(): GeoJSONFC {
  return { type: 'FeatureCollection', features: [] };
}

function toGeoJSON(raw: unknown): GeoJSONFC {
  if (!raw || typeof raw !== 'object') return emptyFC();
  const r = raw as Record<string, unknown>;

  // Already a valid GeoJSON FeatureCollection
  if (r.type === 'FeatureCollection' && Array.isArray(r.features)) {
    const features = (r.features as Record<string, unknown>[]).flatMap(f => {
      const g = f.geometry as { type: string; coordinates: unknown } | undefined;
      if (!g || g.type !== 'Point') return [];
      const [lon, lat] = g.coordinates as number[];
      if (!isFinite(lat) || !isFinite(lon)) return [];
      const p = (f.properties ?? {}) as Record<string, unknown>;
      const laeq = asFloat(p.laeq ?? p.db ?? p.level ?? p.noise_level ?? p.leq);
      if (!isFinite(laeq)) return [];
      return [{
        type: 'Feature' as const,
        geometry:   { type: 'Point' as const, coordinates: [lon, lat] as [number, number] },
        properties: {
          laeq,
          time:   (p.time ?? p.timestamp ?? p.created_at ?? null) as string | null,
          source: 'noisecapture',
        },
      }];
    });
    return { type: 'FeatureCollection', features };
  }

  // Array of raw measurement objects
  if (Array.isArray(raw)) {
    const features = (raw as Record<string, unknown>[]).flatMap(m => {
      const lat  = asFloat(m.lat ?? m.latitude  ?? m.y);
      const lon  = asFloat(m.lon ?? m.longitude ?? m.x);
      const laeq = asFloat(m.laeq ?? m.db ?? m.level ?? m.noise_level ?? m.leq);
      if (!isFinite(lat) || !isFinite(lon) || !isFinite(laeq)) return [];
      return [{
        type: 'Feature' as const,
        geometry:   { type: 'Point' as const, coordinates: [lon, lat] as [number, number] },
        properties: {
          laeq,
          time:   (m.time ?? m.timestamp ?? m.created_at ?? null) as string | null,
          source: 'noisecapture',
        },
      }];
    });
    return { type: 'FeatureCollection', features };
  }

  return emptyFC();
}

function asFloat(v: unknown): number {
  return typeof v === 'number' ? v : parseFloat(String(v ?? 'NaN'));
}
