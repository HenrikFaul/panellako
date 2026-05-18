import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadAlertsFromCache, saveAlertsToCache } from '@/lib/transit-cache';
import { parseAlerts } from '@/lib/gtfs-rt-parser';
import { loadCatalogAlerts, upsertCatalogAlerts } from '@/lib/transit-catalog';

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
  source:    'gtfs-rt' | 'futar' | 'mock';
  stale:     boolean;
}

// ─── Cache ────────────────────────────────────────────────────────────────────
interface CacheEntry { data: AlertsResult; expires: number; }
let _cache: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;
const STALE_AGE_MS = 10 * 60 * 1000;

const GTFS_RT_BASE = 'https://go.bkk.hu/api/query/v1/ws/gtfs-rt/full';
const OBA_BASE     = 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where';
const APP_ORIGIN   = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://panellako.hu').replace(/\/$/, '');
const BKK_KEY      = process.env.BKKFUTAR_API_KEY ?? '';

const BKK_HEADERS = {
  'Accept':     '*/*',
  'User-Agent': 'panellako.hu/1.0',
  'Referer':    `${APP_ORIGIN}/`,
  'Origin':     APP_ORIGIN,
};

// ─── GTFS-RT Alerts (primary) ─────────────────────────────────────────────────
async function fetchGtfsRtAlerts(): Promise<TransitAlert[]> {
  const url = `${GTFS_RT_BASE}/Alerts.txt?key=${BKK_KEY}`;
  const res = await fetch(url, {
    headers: BKK_HEADERS,
    signal:  AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GTFS-RT Alerts HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const text = await res.text();
  return parseAlerts(text).map(a => ({
    id:              a.id,
    headerText:      a.headerText,
    descriptionText: a.descriptionText,
    effect:          a.effect as AlertEffect,
    severity:        a.severity,
    routes:          a.routes,
    startTime:       a.startTime,
    endTime:         a.endTime,
    url:             a.url,
  }));
}

// ─── OBA/OTP JSON fallback ────────────────────────────────────────────────────
async function fetchObaAlerts(): Promise<TransitAlert[]> {
  const headers = { ...BKK_HEADERS, 'Accept': 'application/json' };

  const otpUrl = 'https://futar.bkk.hu/api/query/v1/ws/otp/routers/budapest/index/alerts';
  let rawJson: Record<string, unknown> | null = null;

  const otpRes = await fetch(otpUrl, { headers, signal: AbortSignal.timeout(7_000) });
  if (otpRes.ok) rawJson = await otpRes.json() as Record<string, unknown>;

  if (!rawJson) {
    const obaParams = new URLSearchParams({
      key: BKK_KEY || 'apaiary-test', version: '3', appVersion: 'apiary-1.0',
    });
    const obaRes = await fetch(
      `${OBA_BASE}/current-time.json?${obaParams}`,
      { headers, signal: AbortSignal.timeout(5_000) }
    );
    if (!obaRes.ok) throw new Error(`OBA alerts HTTP ${obaRes.status}`);
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
    routes?: Array<{ shortName?: string }>;
    route?:  { shortName?: string };
  };

  const dataBlock = rawJson?.data as { list?: AlertItem[] } | undefined;
  const list: AlertItem[] = dataBlock?.list ?? [];

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
    const period     = a.activePeriod?.[0];
    const routeNames = (a.routes ?? (a.route ? [a.route] : []))
      .map(r => r.shortName ?? '').filter(Boolean);
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

  // ── New transit_alerts table (preferred) ──────────────────────────────────
  try {
    const catalogAlerts = await loadCatalogAlerts(createClient());
    if (catalogAlerts) {
      const result: AlertsResult = { alerts: catalogAlerts, fetchedAt: new Date().toISOString(), source: 'futar', stale: false };
      _cache = { data: result, expires: now + CACHE_TTL_MS };
      return NextResponse.json(result);
    }
  } catch (dbErr) {
    console.warn('[transit/alerts] catalog DB read failed:', dbErr);
  }

  // DB cache (avoids BKK round-trip within 5-min window)
  try {
    const dbAlerts = await loadAlertsFromCache(createClient());
    if (dbAlerts) {
      const result: AlertsResult = {
        alerts: dbAlerts, fetchedAt: new Date().toISOString(), source: 'futar', stale: false,
      };
      _cache = { data: result, expires: now + CACHE_TTL_MS };
      return NextResponse.json(result);
    }
  } catch (dbErr) {
    console.warn('[transit/alerts] DB cache read failed:', dbErr);
  }

  // Try GTFS-RT first, fall back to OBA/OTP JSON
  let alerts: TransitAlert[] | null = null;
  let source: 'gtfs-rt' | 'futar' = 'gtfs-rt';

  try {
    alerts = await fetchGtfsRtAlerts();
  } catch (err) {
    console.warn('[transit/alerts] GTFS-RT failed, trying OBA fallback:', err);
    try {
      alerts = await fetchObaAlerts();
      source = 'futar';
    } catch (err2) {
      console.warn('[transit/alerts] OBA fallback also failed:', err2);
    }
  }

  if (alerts !== null) {
    const result: AlertsResult = {
      alerts, fetchedAt: new Date().toISOString(), source, stale: false,
    };
    _cache = { data: result, expires: now + CACHE_TTL_MS };
    void saveAlertsToCache(createClient(), alerts)
      .catch(e => console.warn('[transit/alerts] DB cache save failed:', e));
    void upsertCatalogAlerts(createClient(), alerts).catch(e => console.warn('[transit/alerts] catalog save failed:', e));
    return NextResponse.json(result);
  }

  if (_cache) return NextResponse.json({ ..._cache.data, stale: true });
  return NextResponse.json({
    alerts: [], fetchedAt: new Date().toISOString(), source: 'mock', stale: false,
  } satisfies AlertsResult);
}
