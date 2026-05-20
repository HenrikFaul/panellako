// Sentinel Hub Process API client (OAuth 2 client credentials).
// Docs: https://docs.sentinel-hub.com/api/latest/api/process/
//
// Required env vars (set in Vercel project settings):
//   SENTINEL_HUB_CLIENT_ID
//   SENTINEL_HUB_CLIENT_SECRET
//
// Register a free account at https://www.sentinel-hub.com — the free tier
// includes 30 000 processing units / month, plenty for our weekly NDVI mosaic.
//
// Pricing in PU per request roughly = (output_width * output_height) / (512*512).
// Our largest tile (8192*3440) = ~108 PU per request, the 4 resolutions
// together ~150 PU.  Three runs per month still leaves >29 000 PU spare.

const TOKEN_URL   = 'https://services.sentinel-hub.com/oauth/token';
const PROCESS_URL = 'https://services.sentinel-hub.com/api/v1/process';

interface CachedToken { token: string; expiresAt: number }
let _tokenCache: CachedToken | null = null;

export class SentinelHubError extends Error {
  status?: number;
  responseBody?: string;
  constructor(message: string, opts?: { status?: number; responseBody?: string }) {
    super(message);
    this.name = 'SentinelHubError';
    this.status = opts?.status;
    this.responseBody = opts?.responseBody;
  }
}

export function sentinelHubConfigured(): boolean {
  const id  = (process.env.SENTINEL_HUB_CLIENT_ID     ?? '').trim();
  const sec = (process.env.SENTINEL_HUB_CLIENT_SECRET ?? '').trim();
  return id.length > 0 && sec.length > 0;
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (_tokenCache && _tokenCache.expiresAt > now + 30_000) {
    return _tokenCache.token;
  }
  const id  = (process.env.SENTINEL_HUB_CLIENT_ID     ?? '').trim();
  const sec = (process.env.SENTINEL_HUB_CLIENT_SECRET ?? '').trim();
  if (!id || !sec) {
    throw new SentinelHubError(
      'Sentinel Hub credentials missing — set SENTINEL_HUB_CLIENT_ID and SENTINEL_HUB_CLIENT_SECRET in the Vercel project. Sign up at https://www.sentinel-hub.com — the free tier (30 000 PU/month) is enough.',
    );
  }
  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     id,
    client_secret: sec,
  }).toString();
  const res = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal:  AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new SentinelHubError(`OAuth token request failed: HTTP ${res.status}`, { status: res.status, responseBody: txt.slice(0, 500) });
  }
  const json = await res.json() as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new SentinelHubError('OAuth response missing access_token');
  }
  _tokenCache = {
    token:     json.access_token,
    expiresAt: now + (json.expires_in ?? 3600) * 1000,
  };
  return _tokenCache.token;
}

/** Reset the in-memory token cache. Mostly useful in tests. */
export function _resetTokenCache(): void { _tokenCache = null; }

// ─── NDVI evalscript ─────────────────────────────────────────────────────────
//
// Classifies NDVI into 6 colour bands (matches our NDVI legend on the
// existing user-side panel exactly):
//
//   < 0      → blue-grey   (water / built / no data)
//   0.0–0.10 → brown       (kopár felszín)
//   0.10–0.20 → ochre      (ritka növényzet)
//   0.20–0.35 → light green (mérsékelt zöld)
//   0.35–0.50 → green      (jó növényzet)
//   ≥ 0.50    → dark green (sűrű növényzet)
//
// Pixels with no data are output transparent so the user can layer the PNG
// over a basemap if they want.
export const NDVI_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: { bands: 4, sampleType: "UINT8" },
    mosaicking: "ORBIT"
  };
}
function evaluatePixel(samples) {
  // Filter clouds/shadows/snow via the Scene Classification Layer.
  let r = 0, g = 0, b = 0, a = 0;
  let bestNdvi = null;
  for (const s of samples) {
    if (s.dataMask < 1) continue;
    // SCL classes to drop: 1 (defective), 3 (cloud shadow), 8 (cloud medium), 9 (cloud high), 10 (cirrus), 11 (snow/ice)
    const scl = s.SCL;
    if (scl === 1 || scl === 3 || scl === 8 || scl === 9 || scl === 10 || scl === 11) continue;
    const denom = s.B08 + s.B04;
    if (denom <= 0) continue;
    const ndvi = (s.B08 - s.B04) / denom;
    if (bestNdvi === null || ndvi > bestNdvi) bestNdvi = ndvi;
  }
  if (bestNdvi === null) return [0, 0, 0, 0];
  let rr, gg, bb;
  if      (bestNdvi < 0)     { rr = 0.38; gg = 0.42; bb = 0.62; }
  else if (bestNdvi < 0.10)  { rr = 0.85; gg = 0.67; bb = 0.42; }
  else if (bestNdvi < 0.20)  { rr = 0.95; gg = 0.85; bb = 0.40; }
  else if (bestNdvi < 0.35)  { rr = 0.65; gg = 0.85; bb = 0.35; }
  else if (bestNdvi < 0.50)  { rr = 0.30; gg = 0.75; bb = 0.30; }
  else                        { rr = 0.09; gg = 0.55; bb = 0.15; }
  return [Math.round(rr * 255), Math.round(gg * 255), Math.round(bb * 255), 255];
}`;

export interface ProcessRequestParams {
  bbox:           [number, number, number, number];    // [minLon, minLat, maxLon, maxLat]
  width:          number;
  height:         number;
  timeRangeFrom:  string;                                // ISO datetime
  timeRangeTo:    string;                                // ISO datetime
  maxCloudCover:  number;                                // %, e.g. 30
  evalscript?:    string;                                // defaults to NDVI_EVALSCRIPT
  format?:        'image/png' | 'image/jpeg' | 'image/webp';
}

export interface ProcessResult {
  contentType: string;
  bytes:       Uint8Array;
  /** Sentinel Hub returns the cost in this header. */
  puConsumed:  number | null;
  /** The latest acquisition date that contributed to the mosaic (from the response header). */
  latestSensingTime: string | null;
}

/**
 * Submit a Sentinel-2 L2A NDVI mosaic request and return the raw image bytes.
 */
export async function processNdviMosaic(params: ProcessRequestParams): Promise<ProcessResult> {
  const token  = await getAccessToken();
  const format = params.format ?? 'image/png';
  const body = {
    input: {
      bounds: {
        bbox:       params.bbox,
        properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
      },
      data: [{
        type: 'sentinel-2-l2a',
        dataFilter: {
          timeRange: { from: params.timeRangeFrom, to: params.timeRangeTo },
          maxCloudCoverage: params.maxCloudCover,
          mosaickingOrder:  'leastCC',
        },
      }],
    },
    output: {
      width:  params.width,
      height: params.height,
      responses: [{
        identifier: 'default',
        format: { type: format },
      }],
    },
    evalscript: params.evalscript ?? NDVI_EVALSCRIPT,
  };

  const res = await fetch(PROCESS_URL, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      'Accept':        format,
    },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new SentinelHubError(`Process API returned HTTP ${res.status}`, { status: res.status, responseBody: txt.slice(0, 500) });
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  const puHeader = res.headers.get('x-processingunits-spent');
  const latestSensingHeader = res.headers.get('x-latest-sensing-time') ?? res.headers.get('x-sensing-time-end');
  return {
    contentType:       res.headers.get('content-type') ?? format,
    bytes:             buf,
    puConsumed:        puHeader ? Number(puHeader) : null,
    latestSensingTime: latestSensingHeader,
  };
}

// ─── ESA Earth Search STAC helper — used to discover the latest acquisition
//     date when Sentinel Hub does not return it in headers. ───────────────────

interface StacFeature {
  id: string;
  properties: { datetime: string; 'eo:cloud_cover'?: number };
}

/**
 * Find the most recent Sentinel-2 L2A scene over Hungary in the window.
 * Returns the latest acquisition timestamp and the matching scene id.
 */
export async function findLatestSentinel2Scene(opts: {
  bbox:           [number, number, number, number];
  timeRangeFrom:  string;
  timeRangeTo:    string;
  maxCloudCover:  number;
}): Promise<{ datetime: string; sceneId: string } | null> {
  const url = 'https://earth-search.aws.element84.com/v1/search';
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'panellako/1.0' },
    body:    JSON.stringify({
      collections: ['sentinel-2-l2a'],
      bbox:        opts.bbox,
      datetime:    `${opts.timeRangeFrom}/${opts.timeRangeTo}`,
      query:       { 'eo:cloud_cover': { lt: opts.maxCloudCover } },
      limit:       10,
      sortby:      [{ field: 'properties.datetime', direction: 'desc' }],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const json = await res.json() as { features?: StacFeature[] };
  const top = (json.features ?? [])[0];
  if (!top) return null;
  return { datetime: top.properties.datetime, sceneId: top.id };
}
