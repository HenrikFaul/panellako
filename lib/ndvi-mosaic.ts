// 100% free, no-API-key NDVI renderer for Hungary, built on NASA GIBS.
//
// GIBS (Global Imagery Browse Services) is NASA EOSDIS's public visualisation
// gateway.  It exposes WMS/WMTS endpoints for ~1000 daily-updated Earth
// observation layers, including MODIS Terra / Aqua 8-day NDVI composites and
// VIIRS NDVI products.  It's hosted on the AWS CloudFront CDN, is rate-limit
// friendly for cloud workloads, and has been the standard "I just want an
// NDVI map" option for academic and government Earth observation work for
// over a decade.
//
//   • Docs:  https://nasa-gibs.github.io/gibs-api-docs/
//   • WMS:   https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi
//   • No registration, no token, no quota for normal use.
//
// We use `MODIS_Terra_NDVI_8Day` as the primary layer (250 m resolution,
// rolling 8-day composite, updated daily).  For the largest output sizes the
// data is naturally upsampled (that's true of any source short of paid
// providers — Sentinel-2 native 10 m would require multi-tile mosaicking,
// and titiler.xyz's STAC endpoint isn't reachable from the Vercel egress).

import sharp from 'sharp';

export const HU_BBOX: [number, number, number, number] = [16.0, 45.7, 22.9, 48.6];

const GIBS_WMS_URL = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';

const NDVI_LAYER_PRIMARY  = 'MODIS_Terra_NDVI_8Day';
const NDVI_LAYER_FALLBACK = 'MODIS_Aqua_NDVI_8Day';

export interface GibsRenderResult {
  png:        Buffer;
  width:      number;
  height:     number;
  layer:      string;
  time:       string;        // ISO YYYY-MM-DD
  windowEnd:  string;        // last day of the 8-day composite window
}

// ─── Time-slot calculation ───────────────────────────────────────────────────
//
// MODIS 8-day NDVI composites are aligned to fixed Julian-day slots starting
// each year at day-of-year 1, 9, 17, 25 ... .  GIBS exposes them with the
// composite's START date as the TIME parameter (YYYY-MM-DD).  We want the
// most recent composite whose window has ended at least `bufferDays` days ago
// (NASA needs ~2 days for ingest + processing).

function lastCompositeStart(now: Date, bufferDays: number): { start: Date; end: Date } {
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((now.getTime() - yearStart.getTime()) / 86400_000);
  // We want a composite whose END (start + 7 days) was ≥ bufferDays ago.
  // So composite start must be ≥ bufferDays + 7 ago in days-from-year-start.
  const minDayOfYear = dayOfYear - bufferDays - 7;
  const slot = Math.floor(minDayOfYear / 8);
  const startDay = slot * 8;  // 0-indexed within year, → Jan 1 + startDay days
  const start = new Date(yearStart.getTime() + startDay * 86400_000);
  const end   = new Date(start.getTime() + 7 * 86400_000);
  return { start, end };
}

function fmtDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── WMS GetMap ──────────────────────────────────────────────────────────────

interface RenderOpts {
  width:   number;
  height:  number;
  /** Optional override of the TIME parameter (YYYY-MM-DD). */
  time?:   string;
}

async function getMap(layer: string, opts: RenderOpts, time: string): Promise<{ buf: Buffer; contentType: string }> {
  // WMS 1.3.0 + EPSG:4326 → BBOX axis order is "minLat,minLon,maxLat,maxLon".
  const params = new URLSearchParams({
    SERVICE:     'WMS',
    REQUEST:     'GetMap',
    VERSION:     '1.3.0',
    LAYERS:      layer,
    STYLES:      '',
    CRS:         'EPSG:4326',
    BBOX:        `${HU_BBOX[1]},${HU_BBOX[0]},${HU_BBOX[3]},${HU_BBOX[2]}`,
    WIDTH:       String(opts.width),
    HEIGHT:      String(opts.height),
    FORMAT:      'image/png',
    TRANSPARENT: 'TRUE',
    TIME:        time,
  });
  const url = `${GIBS_WMS_URL}?${params.toString()}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'panellako-ndvi-mosaic/1.0 (info@panellako.hu)', 'Accept': 'image/png' },
    signal:  AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`GIBS HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.startsWith('image/')) {
    // GIBS returns a ServiceException XML for invalid TIME etc.
    const txt = await res.text().catch(() => '');
    throw new Error(`GIBS non-image response (content-type=${ct}): ${txt.slice(0, 300)}`);
  }
  return { buf: Buffer.from(await res.arrayBuffer()), contentType: ct };
}

/**
 * Render NDVI for Hungary at the requested pixel size.  Tries the most recent
 * 8-day composite first, then falls back to previous slots if data is missing.
 * Falls back from Terra → Aqua if the primary platform has no usable data.
 */
export async function renderHungaryNdvi(opts: RenderOpts): Promise<GibsRenderResult> {
  const now = new Date();
  const candidates: Array<{ layer: string; start: Date; end: Date }> = [];
  // Try the current cycle and the previous 3 cycles (covers ~4 weeks of data).
  for (let buf = 2; buf <= 30; buf += 8) {
    const { start, end } = lastCompositeStart(now, buf);
    candidates.push({ layer: NDVI_LAYER_PRIMARY,  start, end });
  }
  for (let buf = 2; buf <= 30; buf += 8) {
    const { start, end } = lastCompositeStart(now, buf);
    candidates.push({ layer: NDVI_LAYER_FALLBACK, start, end });
  }

  let lastErr: unknown = null;
  for (const cand of candidates) {
    const time = fmtDateOnly(cand.start);
    try {
      const { buf } = await getMap(cand.layer, opts, time);
      // Validate: GIBS sometimes returns an empty/transparent 1×1 placeholder
      // when the layer has no data for the requested TIME.  A real GIBS NDVI
      // tile is at least ~3 KB even for tiny requests; failing the size check
      // forces us to try the next candidate.
      if (buf.length < 1024) {
        lastErr = new Error(`GIBS returned tiny payload (${buf.length} B) for ${cand.layer} @ ${time} — likely no data`);
        continue;
      }
      return {
        png:       buf,
        width:     opts.width,
        height:    opts.height,
        layer:     cand.layer,
        time,
        windowEnd: fmtDateOnly(cand.end),
      };
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`All GIBS NDVI attempts failed; last error: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
}

/**
 * Resize a master PNG (the largest output) down to a smaller target.  We use
 * Lanczos3 to keep the resampling sharp.  This means we only hit GIBS once
 * for the largest size and then derive the smaller resolutions locally.
 */
export async function downscalePng(masterPng: Buffer, targetWidth: number, targetHeight: number): Promise<Buffer> {
  return sharp(masterPng)
    .resize({ width: targetWidth, height: targetHeight, fit: 'fill', kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// ─── Tiled render (for very large outputs > GIBS single-call limit) ──────────
//
// NASA GIBS WMS has a practical single-request size limit around 8192 px.
// To build a higher-resolution mosaic we slice the Hungary bbox into a
// regular tileMax × tileMax grid (with the right-most / bottom-most tiles
// possibly smaller), fetch each tile via WMS GetMap with its own bbox, and
// composite them together with sharp.  All tiles use a single TIME value
// (the one resolved from the first successful slot lookup) so the mosaic
// is visually consistent.

export interface TiledRenderOpts {
  width:    number;     // desired output width  in px
  height:   number;     // desired output height in px
  /** Max single WMS GetMap call dimensions. NASA GIBS practical limit ~8192. */
  tileMax?: number;     // default 4096 (safe under GIBS limits, faster per-tile)
}

/**
 * Render NDVI for Hungary at an arbitrarily large pixel size by stitching
 * multiple GIBS WMS GetMap tiles together with sharp.composite.  Picks the
 * TIME slot via the same lookup as `renderHungaryNdvi` (using a small probe
 * call), then fetches every tile at that TIME and mosaics them.
 */
export async function renderHungaryNdviTiled(opts: TiledRenderOpts): Promise<GibsRenderResult> {
  const tileMax = Math.max(256, Math.min(8192, opts.tileMax ?? 4096));
  const W = opts.width;
  const H = opts.height;

  // 1. Resolve a single (layer, time, windowEnd) by probing with a small render.
  //    This reuses the slot-cycling/fallback logic in renderHungaryNdvi.
  const probe = await renderHungaryNdvi({ width: 64, height: 32 });
  const layer     = probe.layer;
  const time      = probe.time;
  const windowEnd = probe.windowEnd;

  // 2. Compute the tile grid.
  const cols = Math.ceil(W / tileMax);
  const rows = Math.ceil(H / tileMax);

  // Pixel-space slicing — each tile owns its pixel offsets and size.  We then
  // map those pixel offsets into bbox-space via lat/lon linear interpolation
  // across the Hungary bbox.  HU_BBOX = [lonMin, latMin, lonMax, latMax].
  const lonMin = HU_BBOX[0], latMin = HU_BBOX[1], lonMax = HU_BBOX[2], latMax = HU_BBOX[3];
  const lonSpan = lonMax - lonMin;
  const latSpan = latMax - latMin;

  // 3. Fetch every tile.
  type TilePart = { input: Buffer; left: number; top: number };
  const parts: TilePart[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const xStart = col * tileMax;
      const yStart = row * tileMax;
      const tileW  = Math.min(tileMax, W - xStart);
      const tileH  = Math.min(tileMax, H - yStart);

      // bbox for this tile (note: image y=0 is the NORTH edge, so latMax at top).
      const tLonMin = lonMin + (xStart           / W) * lonSpan;
      const tLonMax = lonMin + ((xStart + tileW) / W) * lonSpan;
      const tLatMax = latMax - (yStart           / H) * latSpan;
      const tLatMin = latMax - ((yStart + tileH) / H) * latSpan;

      const params = new URLSearchParams({
        SERVICE:     'WMS',
        REQUEST:     'GetMap',
        VERSION:     '1.3.0',
        LAYERS:      layer,
        STYLES:      '',
        CRS:         'EPSG:4326',
        // WMS 1.3.0 + EPSG:4326 → "minLat,minLon,maxLat,maxLon"
        BBOX:        `${tLatMin},${tLonMin},${tLatMax},${tLonMax}`,
        WIDTH:       String(tileW),
        HEIGHT:      String(tileH),
        FORMAT:      'image/png',
        TRANSPARENT: 'TRUE',
        TIME:        time,
      });
      const url = `${GIBS_WMS_URL}?${params.toString()}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'panellako-ndvi-mosaic/1.0 (info@panellako.hu)', 'Accept': 'image/png' },
        signal:  AbortSignal.timeout(120_000),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`GIBS tile HTTP ${res.status} @ row=${row} col=${col}: ${txt.slice(0, 200)}`);
      }
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.startsWith('image/')) {
        const txt = await res.text().catch(() => '');
        throw new Error(`GIBS tile non-image (ct=${ct}) @ row=${row} col=${col}: ${txt.slice(0, 300)}`);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      parts.push({ input: buf, left: xStart, top: yStart });
    }
  }

  // 4. Composite onto a blank transparent canvas of the target size.
  const canvas = sharp({
    create: {
      width:      W,
      height:     H,
      channels:   4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
  const mosaic = await canvas
    .composite(parts)
    .png({ compressionLevel: 9 })
    .toBuffer();

  return {
    png:       mosaic,
    width:     W,
    height:    H,
    layer,
    time,
    windowEnd,
  };
}
