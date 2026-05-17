import { NextResponse } from 'next/server';

// ─── Types ────────────────────────────────────────────────────────────────────
export type AlertEffect =
  | 'NO_SERVICE' | 'REDUCED_SERVICE' | 'SIGNIFICANT_DELAYS'
  | 'DETOUR' | 'ADDITIONAL_SERVICE' | 'MODIFIED_SERVICE'
  | 'OTHER_EFFECT' | 'UNKNOWN_EFFECT' | 'STOP_MOVED' | 'NO_EFFECT';

export interface TransitAlert {
  id:             string;
  headerText:     string;
  descriptionText: string;
  effect:         AlertEffect;
  routes:         string[];   // affected route short names
  startTime:      number | null;  // unix seconds
  endTime:        number | null;
  url:            string | null;
}

export interface AlertsResult {
  alerts:    TransitAlert[];
  fetchedAt: string;
  source:    'futar' | 'mock';
  stale:     boolean;
}

// ─── Cache ────────────────────────────────────────────────────────────────────
interface CacheEntry { data: AlertsResult; expires: number; }
let _cache: CacheEntry | null = null;
const CACHE_TTL_MS  = 5 * 60 * 1000;   // 5 minutes
const STALE_AGE_MS  = 10 * 60 * 1000;  // mark stale after 10 min

// ─── BKK Futár alerts ─────────────────────────────────────────────────────────
async function fetchFutarAlerts(): Promise<TransitAlert[]> {
  const BASE = 'https://futar.bkk.hu/api/query/v1/ws/otp/routers/budapest';
  const res = await fetch(`${BASE}/index/alerts`, {
    headers: {
      'Accept':     'application/json',
      'User-Agent': 'panellako.hu/1.0',
    },
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) throw new Error(`Futár alerts HTTP ${res.status}`);
  const data = await res.json();

  // OTP alert shape: data.data.list[]
  const list: Array<{
    id?: string;
    alertHeaderText?: { someTranslation?: Array<{ language: string; value: string }> };
    alertDescriptionText?: { someTranslation?: Array<{ language: string; value: string }> };
    alertUrl?: { someTranslation?: Array<{ language: string; value: string }> };
    effect?: string;
    activePeriod?: Array<{ start?: number; end?: number }>;
    informedEntity?: Array<{
      routeId?: string;
      agencyId?: string;
      stopId?: string;
    }>;
    // Alternate shape (OTP v1)
    headerText?: string;
    descriptionText?: string;
    route?: { shortName?: string };
    routes?: Array<{ shortName?: string }>;
  }> = data?.data?.list ?? data?.data?.entry?.alerts ?? data?.data?.alerts ?? [];

  function extractText(
    field: { someTranslation?: Array<{ language: string; value: string }> } | undefined,
    fallback = ''
  ): string {
    if (!field?.someTranslation) return fallback;
    const hu = field.someTranslation.find(t => t.language === 'hu');
    const en = field.someTranslation.find(t => t.language === 'en');
    return (hu ?? en ?? field.someTranslation[0])?.value ?? fallback;
  }

  return list.slice(0, 20).map((a, i) => {
    const period = a.activePeriod?.[0];
    const routeNames: string[] = (a.routes ?? (a.route ? [a.route] : []))
      .map((r: { shortName?: string }) => r.shortName ?? '')
      .filter(Boolean);

    return {
      id:              a.id ?? String(i),
      headerText:      extractText(a.alertHeaderText, a.headerText ?? 'Üzemzavar'),
      descriptionText: extractText(a.alertDescriptionText, a.descriptionText ?? ''),
      effect:          (a.effect as AlertEffect) ?? 'OTHER_EFFECT',
      routes:          routeNames,
      startTime:       period?.start ?? null,
      endTime:         period?.end   ?? null,
      url:             extractText(a.alertUrl) || null,
    };
  });
}

// ─── Effect → severity + color ────────────────────────────────────────────────
function alertSeverity(effect: AlertEffect): { level: 'high' | 'medium' | 'low'; color: string } {
  if (['NO_SERVICE', 'SIGNIFICANT_DELAYS'].includes(effect)) return { level: 'high',   color: '#ef4444' };
  if (['REDUCED_SERVICE', 'DETOUR', 'MODIFIED_SERVICE'].includes(effect)) return { level: 'medium', color: '#f97316' };
  return { level: 'low', color: '#eab308' };
}

// ─── GET handler ──────────────────────────────────────────────────────────────
export async function GET() {
  const now = Date.now();

  if (_cache && _cache.expires > now) {
    const ageMs = now - new Date(_cache.data.fetchedAt).getTime();
    return NextResponse.json({ ..._cache.data, stale: ageMs > STALE_AGE_MS });
  }

  try {
    const alerts = await fetchFutarAlerts();
    const result: AlertsResult = {
      alerts,
      fetchedAt: new Date().toISOString(),
      source: 'futar',
      stale: false,
    };
    _cache = { data: result, expires: now + CACHE_TTL_MS };
    return NextResponse.json(result);
  } catch (err) {
    console.warn('[transit/alerts] Futár failed:', err);
    // Return last known data if available (marked stale), else empty
    if (_cache) {
      return NextResponse.json({ ..._cache.data, stale: true });
    }
    const empty: AlertsResult = {
      alerts: [],
      fetchedAt: new Date().toISOString(),
      source: 'mock',
      stale: false,
    };
    return NextResponse.json(empty);
  }
}
