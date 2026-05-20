// Free Sentinel-2 NDVI mosaic builder.
//
// Stack (100% free, no API keys):
//   • Earth Search STAC (Element84)  — Sentinel-2 L2A index on AWS S3
//   • titiler.xyz / cog.titiler.eoapi.dev — public Cloud-Optimised GeoTIFF
//     reader that can compute the NDVI expression and apply a colormap on
//     the fly.  Per-scene PNGs are then mosaicked locally with sharp.
//
// This is the exact workflow most academic Sentinel-2 thesis projects use,
// and Vercel doesn't need a single paid credential to run it.

import sharp from 'sharp';

// Hungary covers ~8 Sentinel-2 MGRS tiles.  We let STAC discover them; we
// just need the bbox.
export const HU_BBOX: [number, number, number, number] = [16.0, 45.7, 22.9, 48.6];

const STAC_SEARCH_URL = 'https://earth-search.aws.element84.com/v1/search';
// Multiple titiler instances — kumi.systems-style failover.
const TITILER_HOSTS = [
  'https://titiler.xyz',
  'https://cog.titiler.eoapi.dev',
];

export interface StacItem {
  id: string;
  bbox: [number, number, number, number];
  properties: {
    datetime: string;
    'eo:cloud_cover'?: number;
    'mgrs:utm_zone'?: number;
    'mgrs:latitude_band'?: string;
    'mgrs:grid_square'?: string;
    's2:mgrs_tile'?: string;
  };
  // Earth Search exposes the STAC item self-link in the `links` array.
  links: Array<{ rel: string; href: string; type?: string }>;
  assets: Record<string, { href: string; type?: string }>;
  collection?: string;
}

export interface MosaicSceneSelection {
  /** MGRS tile id, e.g. "33TXM". */
  tileId:        string;
  scene:         StacItem;
  selfHref:      string;
  acquisitionAt: string;
  cloudCover:    number | null;
}

export interface NdviMosaicResult {
  width:  number;
  height: number;
  png:    Buffer;
  scenes: MosaicSceneSelection[];
  /** ISO datetime of the latest scene that contributed to the mosaic. */
  latestSensingTime: string | null;
  cloudCoverMax: number;
  errors: Array<{ tileId: string; error: string }>;
}

// ─── STAC search ──────────────────────────────────────────────────────────────

function mgrsTileFromItem(item: StacItem): string {
  const explicit = item.properties['s2:mgrs_tile'];
  if (explicit) return explicit;
  const zone = item.properties['mgrs:utm_zone'];
  const band = item.properties['mgrs:latitude_band'];
  const sq   = item.properties['mgrs:grid_square'];
  if (zone && band && sq) return `${zone}${band}${sq}`;
  // Fallback: parse from item id — Earth Search ids look like
  // "S2A_33TXM_20240920_0_L2A" or "S2B_T33TXM_20240920_0_L2A".
  const m = item.id.match(/_T?(\d{1,2}[A-Z]{3})_/);
  return m ? m[1] : item.id;
}

function itemSelfHref(item: StacItem): string {
  // Prefer the JSON self link
  const self = item.links?.find(l => l.rel === 'self');
  if (self?.href) return self.href;
  // Earth Search v1 fallback URL
  return `https://earth-search.aws.element84.com/v1/collections/${item.collection ?? 'sentinel-2-l2a'}/items/${item.id}`;
}

/**
 * Search Earth Search for Sentinel-2 L2A scenes intersecting Hungary in the
 * given time window with cloud cover below the threshold.  Returns ALL hits
 * (Earth Search paginates after 50 items by default; we ask for 100 which is
 * enough to cover Hungary with revisits).
 */
export async function searchSentinel2Scenes(opts: {
  bbox:           [number, number, number, number];
  timeRangeFrom:  string;
  timeRangeTo:    string;
  maxCloudCover:  number;
  limit?:         number;
}): Promise<StacItem[]> {
  const body = {
    collections: ['sentinel-2-l2a'],
    bbox:        opts.bbox,
    datetime:    `${opts.timeRangeFrom}/${opts.timeRangeTo}`,
    query:       { 'eo:cloud_cover': { lt: opts.maxCloudCover } },
    limit:       opts.limit ?? 100,
    sortby:      [{ field: 'properties.datetime', direction: 'desc' }],
  };
  const res = await fetch(STAC_SEARCH_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'panellako-ndvi-mosaic/1.0' },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`Earth Search STAC returned HTTP ${res.status}`);
  }
  const json = await res.json() as { features?: StacItem[] };
  return json.features ?? [];
}

/**
 * Group STAC items by MGRS tile and pick the best (= least cloudy, then most
 * recent) per tile.  Hungary needs ~8 tiles for full coverage.
 */
export function pickBestScenePerTile(items: StacItem[]): MosaicSceneSelection[] {
  const byTile = new Map<string, MosaicSceneSelection>();
  for (const item of items) {
    const tileId = mgrsTileFromItem(item);
    const cloud  = item.properties['eo:cloud_cover'] ?? null;
    const acquisitionAt = item.properties.datetime;
    const existing = byTile.get(tileId);
    const candidate: MosaicSceneSelection = {
      tileId,
      scene:        item,
      selfHref:     itemSelfHref(item),
      acquisitionAt,
      cloudCover:   cloud,
    };
    if (!existing) {
      byTile.set(tileId, candidate);
      continue;
    }
    // Prefer lower cloud cover.  If both null or both equal, prefer newer.
    const existingCloud = existing.cloudCover ?? 100;
    const newCloud      = cloud ?? 100;
    if (newCloud + 5 < existingCloud) {           // meaningfully cleaner
      byTile.set(tileId, candidate);
    } else if (Math.abs(newCloud - existingCloud) <= 5 && acquisitionAt > existing.acquisitionAt) {
      byTile.set(tileId, candidate);              // tie → fresher wins
    }
  }
  return Array.from(byTile.values()).sort((a, b) => a.tileId.localeCompare(b.tileId));
}

// ─── titiler render per scene ────────────────────────────────────────────────

/**
 * Ask a titiler instance to render an NDVI PNG for the given STAC item.
 * Uses red & nir Sentinel-2 assets (10 m bands).  The colormap is applied
 * server-side so we get an RGB-A PNG back.
 *
 * We try multiple titiler hosts in order, with a per-host timeout.
 */
export async function renderSceneNdvi(stacItemHref: string, maxSize: number): Promise<{ png: Buffer; host: string }> {
  const params = new URLSearchParams();
  params.append('url',            stacItemHref);
  params.append('assets',         'red');
  params.append('assets',         'nir');
  params.append('asset_as_band',  'true');
  params.append('expression',     '(nir-red)/(nir+red)');
  params.append('rescale',        '-0.2,0.8');
  params.append('colormap_name',  'rdylgn');
  params.append('max_size',       String(maxSize));
  params.append('return_mask',    'true');

  let lastErr: unknown = null;
  for (const host of TITILER_HOSTS) {
    const url = `${host}/stac/preview.png?${params.toString()}`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'panellako-ndvi-mosaic/1.0', 'Accept': 'image/png' },
        signal:  AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        lastErr = new Error(`titiler ${host} HTTP ${res.status}: ${body.slice(0, 200)}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 200) {
        lastErr = new Error(`titiler ${host} returned only ${buf.length} bytes`);
        continue;
      }
      return { png: buf, host };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

// ─── Composite scenes onto a Hungary canvas ──────────────────────────────────

function bboxToPixelRect(
  sceneBbox:   [number, number, number, number],
  canvasBbox:  [number, number, number, number],
  canvasWidth: number,
  canvasHeight: number,
): { left: number; top: number; width: number; height: number } {
  const [cMinLon, cMinLat, cMaxLon, cMaxLat] = canvasBbox;
  const [sMinLon, sMinLat, sMaxLon, sMaxLat] = sceneBbox;
  const lonSpan = cMaxLon - cMinLon;
  const latSpan = cMaxLat - cMinLat;
  const left   = Math.round(((sMinLon - cMinLon) / lonSpan) * canvasWidth);
  const right  = Math.round(((sMaxLon - cMinLon) / lonSpan) * canvasWidth);
  // PNG y-axis is top-down: lat=cMaxLat → y=0, lat=cMinLat → y=canvasHeight
  const top    = Math.round(((cMaxLat - sMaxLat) / latSpan) * canvasHeight);
  const bottom = Math.round(((cMaxLat - sMinLat) / latSpan) * canvasHeight);
  return {
    left:   Math.max(0, left),
    top:    Math.max(0, top),
    width:  Math.max(1, Math.min(canvasWidth  - left, right - left)),
    height: Math.max(1, Math.min(canvasHeight - top,  bottom - top)),
  };
}

/**
 * Build a Hungary-wide NDVI mosaic by rendering each selected Sentinel-2
 * scene with titiler and compositing all PNGs onto a single canvas.
 */
export async function buildHungaryMosaic(
  scenes: MosaicSceneSelection[],
  canvasWidth: number,
  canvasHeight: number,
  perScenePixels: number = 2048,
): Promise<NdviMosaicResult> {
  if (scenes.length === 0) {
    throw new Error('No Sentinel-2 scenes selected — STAC search returned 0 features');
  }

  // Prepare a black canvas (RGBA, all zeros).
  const base = sharp({
    create: {
      width:      canvasWidth,
      height:     canvasHeight,
      channels:   4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).png();

  // Render every scene in parallel (bounded concurrency = 4).
  const errors: NdviMosaicResult['errors'] = [];
  const rendered: Array<{ scene: MosaicSceneSelection; buf: Buffer; rect: { left: number; top: number; width: number; height: number } }> = [];

  const queue = [...scenes];
  const concurrency = 4;
  async function worker() {
    while (queue.length > 0) {
      const s = queue.shift()!;
      try {
        const { png } = await renderSceneNdvi(s.selfHref, perScenePixels);
        // Re-project the rendered PNG to the canvas's pixel rectangle for the
        // scene's bbox.  Earth Search reports bbox in EPSG:4326, our canvas is
        // also EPSG:4326 — straight scale & translate.
        const rect = bboxToPixelRect(s.scene.bbox, HU_BBOX, canvasWidth, canvasHeight);
        // Resize the scene PNG to the exact rectangle we want.  Use `fit:fill`
        // so it stretches exactly; the small latitude distortion at this scale
        // is below 1 pixel for the Hungary bbox.
        const resized = await sharp(png).resize({ width: rect.width, height: rect.height, fit: 'fill' }).png().toBuffer();
        rendered.push({ scene: s, buf: resized, rect });
      } catch (err) {
        errors.push({ tileId: s.tileId, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, scenes.length) }, () => worker()));

  if (rendered.length === 0) {
    throw new Error(`All ${scenes.length} scene renders failed: ${JSON.stringify(errors).slice(0, 500)}`);
  }

  // Composite all the resized scene PNGs onto the base canvas.
  const composite = await base.composite(
    rendered.map(r => ({ input: r.buf, top: r.rect.top, left: r.rect.left, blend: 'over' as const })),
  ).png().toBuffer();

  // Find the latest acquisition time across the rendered scenes.
  let latest: string | null = null;
  let cloudMax = 0;
  for (const r of rendered) {
    if (!latest || r.scene.acquisitionAt > latest) latest = r.scene.acquisitionAt;
    if (r.scene.cloudCover !== null && r.scene.cloudCover > cloudMax) cloudMax = r.scene.cloudCover;
  }

  return {
    width:  canvasWidth,
    height: canvasHeight,
    png:    composite,
    scenes: rendered.map(r => r.scene),
    latestSensingTime: latest,
    cloudCoverMax: cloudMax,
    errors,
  };
}

/**
 * Downscale a master PNG to a smaller target resolution.  Used to derive the
 * "Nagy" / "Nagyon nagy" / etc. files from a single master render so we don't
 * burn extra titiler calls.
 */
export async function downscalePng(masterPng: Buffer, targetWidth: number, targetHeight: number): Promise<Buffer> {
  return sharp(masterPng)
    .resize({ width: targetWidth, height: targetHeight, fit: 'fill', kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toBuffer();
}
