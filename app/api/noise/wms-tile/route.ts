// Server-side WMS tile proxy for noise maps.
// Tries HungaroMet (OMSZ) → NIF Zrt. → EEA in order.
// Caches successful tiles for 30 minutes so repeated requests
// never hit the unreliable upstream servers again.
import { NextRequest } from 'next/server';

// ─── Upstream WMS sources (tried in order) ───────────────────────────────────

type EeaLayerKey = 'KOZUT_LDEN' | 'KOZUT_LNIGHT' | 'VASUT_LDEN' | 'IPARI_LDEN';

const EEA_URLS: Record<EeaLayerKey, string> = {
  KOZUT_LDEN:   'https://noise.discomap.eea.europa.eu/arcgis/services/Agglomeration/NOISE_Roads_Lden/MapServer/WMSServer',
  KOZUT_LNIGHT: 'https://noise.discomap.eea.europa.eu/arcgis/services/Agglomeration/NOISE_Roads_Lnight/MapServer/WMSServer',
  VASUT_LDEN:   'https://noise.discomap.eea.europa.eu/arcgis/services/Agglomeration/NOISE_Rail_Lden/MapServer/WMSServer',
  IPARI_LDEN:   'https://noise.discomap.eea.europa.eu/arcgis/services/Agglomeration/NOISE_Industry_Lden/MapServer/WMSServer',
};

interface Source {
  id: string;
  getUrl: (params: URLSearchParams, layer: string) => { url: string; layerName: string } | null;
}

const SOURCES: Source[] = [
  {
    id: 'met',
    getUrl: (_p, layer) => ({
      url: 'https://geoportal.met.hu/geoserver/zajterkep/wms',
      layerName: layer,
    }),
  },
  {
    id: 'nif',
    getUrl: (_p, layer) => ({
      url: 'https://zajterkepek.hu/geoserver/zajterkep/wms',
      layerName: layer,
    }),
  },
  {
    id: 'eea',
    getUrl: (_p, layer) => {
      const eeaUrl = EEA_URLS[layer as EeaLayerKey];
      if (!eeaUrl) return null;
      return { url: eeaUrl, layerName: '0' };
    },
  },
];

// ─── In-memory tile cache ─────────────────────────────────────────────────────
// Key: stringified WMS params. TTL: 30 min. Max: 4000 entries (~400 MB worst case).

interface CacheEntry { data: ArrayBuffer; mime: string; source: string; ts: number }

const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000;
const CACHE_MAX = 4000;

function pruneCache() {
  if (CACHE.size <= CACHE_MAX) return;
  const cutoff = Date.now() - CACHE_TTL;
  for (const [k, v] of CACHE.entries()) {
    if (v.ts < cutoff) CACHE.delete(k);
    if (CACHE.size <= CACHE_MAX * 0.8) break;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const params = Object.fromEntries(sp.entries());

  // Normalise layer name (clients send it as LAYERS= or layers=)
  const layer = (params['LAYERS'] ?? params['layers'] ?? 'KOZUT_LDEN').toUpperCase();

  // Cache lookup
  const cacheKey = `${layer}:${params['BBOX'] ?? params['bbox'] ?? ''}:${params['WIDTH'] ?? 256}x${params['HEIGHT'] ?? 256}`;
  const hit = CACHE.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return new Response(hit.data, {
      headers: {
        'Content-Type': hit.mime,
        'Cache-Control': 'public, max-age=1800',
        'X-Noise-Source': `cache:${hit.source}`,
      },
    });
  }

  // Build common WMS parameters
  const baseWmsParams: Record<string, string> = {
    SERVICE:     params['SERVICE']     ?? 'WMS',
    REQUEST:     params['REQUEST']     ?? 'GetMap',
    VERSION:     params['VERSION']     ?? '1.1.1',
    FORMAT:      params['FORMAT']      ?? 'image/png',
    TRANSPARENT: params['TRANSPARENT'] ?? 'TRUE',
    WIDTH:       params['WIDTH']       ?? '256',
    HEIGHT:      params['HEIGHT']      ?? '256',
    SRS:         params['SRS']         ?? params['CRS'] ?? 'EPSG:3857',
    STYLES:      params['STYLES']      ?? '',
    BBOX:        params['BBOX']        ?? params['bbox'] ?? '',
  };

  // Try each source
  for (const source of SOURCES) {
    const resolved = source.getUrl(sp, layer);
    if (!resolved) continue;

    const upstreamParams = new URLSearchParams({
      ...baseWmsParams,
      LAYERS: resolved.layerName,
    });

    try {
      const res = await fetch(`${resolved.url}?${upstreamParams}`, {
        signal:  AbortSignal.timeout(10_000),
        headers: { 'User-Agent': 'panellako.hu/1.0 noise-wms-proxy' },
      });

      if (!res.ok) continue;

      const mime = res.headers.get('Content-Type') ?? 'image/png';
      // Reject XML/HTML error responses from GeoServer
      if (!mime.includes('image/')) continue;

      const data = await res.arrayBuffer();

      // Store in cache
      pruneCache();
      CACHE.set(cacheKey, { data, mime, source: source.id, ts: Date.now() });

      return new Response(data, {
        headers: {
          'Content-Type': mime,
          'Cache-Control': 'public, max-age=1800',
          'X-Noise-Source': source.id,
        },
      });
    } catch {
      // Timeout or network error → try next source
    }
  }

  // All sources failed
  return new Response(null, { status: 503 });
}
