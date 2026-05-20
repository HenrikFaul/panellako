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

// ─── Tiled / upsampled render (for outputs larger than MODIS native) ──────────
//
// MODIS_Terra_NDVI_8Day is a 250 m/pixel raster.  Hungary spans ~525 km × 322
// km, so MODIS-native dimensions for the Hungary bbox are ≈ 2100 × 1290 px.
//
// When the user requests a much bigger output (4 096+, 8 192+, 16 384+), GIBS
// upsamples the source with nearest-neighbor and the result is **blocky** —
// you can see individual 250 m MODIS cells as squares in the PNG.  That's
// what made the v0.7.6 "Brutális" tier look identical to the 1024-px tier.
//
// Fix: fetch the master at a **slightly-oversampled MODIS-native resolution**
// (one GIBS WMS call, fast & cheap), then **Lanczos3-upscale locally with
// sharp** to the requested target.  Lanczos3 produces a smooth edges without
// the blocky look, and we don't need GIBS to upsample at all.
//
// We still keep `renderHungaryNdviTiled` as the canonical name for backward
// compat — but it no longer tiles GIBS calls (one call is enough), it just
// resamples locally.

export interface TiledRenderOpts {
  width:    number;     // desired output width  in px
  height:   number;     // desired output height in px
  /** Kept for backward compatibility; unused in the local-upscale path. */
  tileMax?: number;
}

// Hungary @ MODIS 250 m native is ~2100 × 1290.  We oversample a bit for
// safety (avoid losing edge detail to integer rounding) — 2880 × 1160 keeps
// the 2.4:1 aspect close to the Hungary bbox and adds a small Lanczos3
// budget.  GIBS happily serves this size in a single GetMap call.
const MODIS_FETCH_WIDTH  = 2880;
const MODIS_FETCH_HEIGHT = 1160;

/**
 * Render NDVI for Hungary at an arbitrarily large pixel size.  Strategy:
 *   1. Fetch the master once at MODIS-native(-ish) resolution via GIBS WMS
 *      (using the same TIME-slot fallback logic as `renderHungaryNdvi`).
 *   2. Upscale to the requested W × H with sharp Lanczos3.
 *   3. Re-encode as PNG.
 *
 * Result: smooth, anti-aliased NDVI map at any output size.  At true MODIS
 * scale you still see only ~250 m of detail; we cannot fabricate detail
 * that isn't in the source.  But the image no longer looks pixel-blocky.
 */
export async function renderHungaryNdviTiled(opts: TiledRenderOpts): Promise<GibsRenderResult> {
  const W = opts.width;
  const H = opts.height;

  // 1. Fetch master at native-ish resolution.  `renderHungaryNdvi` already
  //    cycles through TIME slots + Terra/Aqua fallback.
  const master = await renderHungaryNdvi({ width: MODIS_FETCH_WIDTH, height: MODIS_FETCH_HEIGHT });

  // 2. If the caller asked for exactly the native size, just hand it over.
  if (W === MODIS_FETCH_WIDTH && H === MODIS_FETCH_HEIGHT) {
    return master;
  }

  // 3. Resample locally with Lanczos3.  For DOWNSCALES (W*H < native*native)
  //    sharp will use proper area-aggregation under the hood.  For UPSCALES
  //    Lanczos3 is the canonical sharp resampler.
  const upscaled = await sharp(master.png)
    .resize({ width: W, height: H, fit: 'fill', kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return {
    png:       upscaled,
    width:     W,
    height:    H,
    layer:     master.layer,
    time:      master.time,
    windowEnd: master.windowEnd,
  };
}
