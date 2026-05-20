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
