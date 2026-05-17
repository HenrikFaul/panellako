import { NextRequest, NextResponse } from 'next/server';

// ─── In-memory cache: address text → coordinates (24h TTL) ───────────────────
interface GeoEntry { lat: number; lon: number; expires: number; }
const _geoCache = new Map<string, GeoEntry>();

function normalizeAddress(addr: string): string {
  return addr.trim().toLowerCase().replace(/\s+/g, ' ');
}

// ─── Nominatim geocoding (OpenStreetMap, free, no API key) ───────────────────
async function nominatimGeocode(address: string): Promise<{ lat: number; lon: number } | null> {
  const params = new URLSearchParams({
    q:            address,
    format:       'json',
    countrycodes: 'hu',
    limit:        '1',
    addressdetails: '0',
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      'User-Agent':   'panellako.hu/1.0 (contact via panellako.hu)',
      'Accept':       'application/json',
      'Referer':      'https://panellako.hu',
    },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const { lat, lon } = data[0];
  return { lat: parseFloat(lat), lon: parseFloat(lon) };
}

// ─── GET /api/transit/geocode?address=<text> ──────────────────────────────────
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.trim() ?? '';
  if (!address || address.length < 5) {
    return NextResponse.json({ error: 'address required (min 5 chars)' }, { status: 400 });
  }

  const key = normalizeAddress(address);
  const cached = _geoCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json({ lat: cached.lat, lon: cached.lon, source: 'cache' });
  }

  try {
    const result = await nominatimGeocode(address);
    if (!result) {
      return NextResponse.json({ error: 'no_result', address }, { status: 404 });
    }
    _geoCache.set(key, { ...result, expires: Date.now() + 24 * 60 * 60 * 1000 });
    return NextResponse.json({ ...result, source: 'nominatim' });
  } catch (err) {
    console.error('[transit/geocode] Nominatim error:', err);
    return NextResponse.json({ error: 'geocode_failed', message: String(err) }, { status: 502 });
  }
}
