import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadAlertsFromCache, saveAlertsToCache } from '@/lib/transit-cache';

// ─── Types ────────────────────────────────────────────────────────────────────
export type AlertEffect =
  | 'NO_SERVICE' | 'REDUCED_SERVICE' | 'SIGNIFICANT_DELAYS'
  | 'DETOUR' | 'ADDITIONAL_SERVICE' | 'MODIFIED_SERVICE'
  | 'OTHER_EFFECT' | 'UNKNOWN_EFFECT' | 'STOP_MOVED' | 'NO_EFFECT';

export interface AlertSeverity {
  level: 'high' | 'medium' | 'low';
  color: string;
}

export interface TransitAlert {
  id:              string;
  headerText:      string;
  descriptionText: string;
  effect:          AlertEffect;
  severity:        AlertSeverity;
  routes:          string[];
  startTime:       number | null;
  endTime:         number | null;
  url:             string | null;
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
const CACHE_TTL_MS = 5 * 60 * 1000;
const STALE_AGE_MS = 10 * 60 * 1000;

const BKK_KEY = process.env.BKKFUTAR_API_KEY ?? 'apaiary-test';

// ─── BKK Futár alerts ────────────────────────────────────────────────────────
// Uses the OTP routers/budapest/index/alerts endpoint (public, no key required)
// Falls back to the OBA endpoint with key if OTP fails.
async function fetchFutarAlerts(): Promise<TransitAlert[]> {
  const headers = { 'Accept': 'application/json', 'User-Agent': 'panellako.hu/1.0' };

  // Try OTP alerts first (documented and stable)
  const otpUrl = 'https://futar.bkk.hu/api/query/v1/ws/otp/routers/budapest/index/alerts';
  let rawJson: Record<string, unknown> | null = null;

  const otpRes = await fetch(otpUrl, { headers, signal: AbortSignal.timeout(7000) });
  if (otpRes.ok) {
    rawJson = await otpRes.json() as Record<string, unknown>;
  }

  // OBA alerts fallback
  if (!rawJson) {
    const obaParams = new URLSearchParams({ key: BKK_KEY, version: '3', appVersion: 'apiary-1.0' });
    const obaRes = await fetch(
      `https://futar.bkk.hu/api/query/v1/ws/otp/api/where/current-time.json?${obaParams}`,
      { headers, signal: AbortSignal.timeout(5000) }
    );
    if (!obaRes.ok) throw new Error(`Futár alerts HTTP ${obaRes.status}`);
    rawJson = await obaRes.json() as Record<string, unknown>;
  }

  type AlertItem = {
    id?: string;
    alertHeaderText?:      { someTranslation?: Array<{ language: string; value: string }> };
    alertDescriptionText?: { someTranslation?: Array<{ language: string; value: string }> };
    alertUrl?:             { someTranslation?: Array<{ language: string; value: string }> };
    effect?: string;
    activePeriod?: Array<{ start?: number; end?: number }>;
    headerText?: string;
    descriptionText?: string;
    route?:  { shortName?: string };
    routes?: Array<{ shortName?: string }>;
  };

  const dataBlock = rawJson?.data as { list?: AlertItem[]; entry?: { alerts?: AlertItem[] }; alerts?: AlertItem[] } | undefined;
  const list: AlertItem[] =
    dataBlock?.list ??
    dataBlock?.entry?.alerts ??
    dataBlock?.alerts ??
    [];

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
    const effect = (a.effect as AlertEffect) ?? 'OTHER_EFFECT';
    return {
      id:              a.id ?? String(i),
      headerText:      extractText(a.alertHeaderText, a.headerText ?? 'Üzemzavar'),
      descriptionText: extractText(a.alertDescriptionText, a.descriptionText ?? ''),
      effect,
      severity:        alertSeverity(effect),
      routes:          routeNames,
      startTime:       period?.start ?? null,
      endTime:         period?.end   ?? null,
      url:             extractText(a.alertUrl) || null,
    };
  });
}

function alertSeverity(effect: AlertEffect): AlertSeverity {
  if (['NO_SERVICE', 'SIGNIFICANT_DELAYS'].includes(effect))
    return { level: 'high',   color: '#ef4444' };
  if (['REDUCED_SERVICE', 'DETOUR', 'MODIFIED_SERVICE'].includes(effect))
    return { level: 'medium', color: '#f97316' };
  return   { level: 'low',    color: '#eab308' };
}

// ─── GET handler ──────────────────────────────────────────────────────────────
export async function GET() {
  const now = Date.now();

  // In-memory cache (fastest path)
  if (_cache && _cache.expires > now) {
    const ageMs = now - new Date(_cache.data.fetchedAt).getTime();
    return NextResponse.json({ ..._cache.data, stale: ageMs > STALE_AGE_MS });
  }

  // DB cache (second-fastest path — avoids BKK round-trip within 5-min window)
  try {
    const dbAlerts = await loadAlertsFromCache(createClient());
    if (dbAlerts) {
      const result: AlertsResult = {
        alerts: dbAlerts, fetchedAt: new Date().toISOString(), source: 'futar', stale: false,
      };
      // Warm the in-memory cache too
      _cache = { data: result, expires: now + CACHE_TTL_MS };
      return NextResponse.json(result);
    }
  } catch (dbErr) {
    console.warn('[transit/alerts] DB cache read failed:', dbErr);
  }

  try {
    const alerts = await fetchFutarAlerts();
    const result: AlertsResult = {
      alerts, fetchedAt: new Date().toISOString(), source: 'futar', stale: false,
    };
    _cache = { data: result, expires: now + CACHE_TTL_MS };
    // Fire-and-forget: persist to DB cache
    void saveAlertsToCache(createClient(), alerts)
      .catch(e => console.warn('[transit/alerts] DB cache save failed:', e));
    return NextResponse.json(result);
  } catch (err) {
    console.warn('[transit/alerts] Futár failed:', err);
    if (_cache) return NextResponse.json({ ..._cache.data, stale: true });
    return NextResponse.json({
      alerts: [], fetchedAt: new Date().toISOString(), source: 'mock', stale: false,
    } satisfies AlertsResult);
  }
}
