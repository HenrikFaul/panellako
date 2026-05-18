/**
 * Lightweight GTFS-Realtime text-proto parser.
 * Parses the text-format (.txt) output of go.bkk.hu GTFS-RT feeds.
 * No binary protobuf library required.
 *
 * Proto text format rules:
 *   field: value          — scalar field (string quoted, number/enum unquoted)
 *   message_name { ... } — nested message block
 *   [ext.name] { ... }   — extension block (we ignore these)
 */

// ─── Field / block extraction ─────────────────────────────────────────────────

function firstField(text: string, name: string): string | null {
  const re = new RegExp(
    `(?:^|\\n)[\\t ]*(${escapeRegex(name)}):[\\t ]*(?:"([^"\\r\\n]*)"|([^"\\s{][^\\r\\n]*?))[\\t ]*(?:\\r?\\n|$)`,
    'm'
  );
  const m = re.exec(text);
  if (!m) return null;
  return (m[2] ?? m[3] ?? '').trim();
}

function firstFloat(text: string, name: string): number | null {
  const v = firstField(text, name);
  if (v === null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function firstInt(text: string, name: string): number | null {
  const v = firstField(text, name);
  if (v === null) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Extract all blocks named `name` from a text proto string.
// Returns the inner content of each block (between the braces).
export function allBlocks(text: string, name: string): string[] {
  const blocks: string[] = [];
  const pattern = `${name} {`;
  let searchFrom = 0;

  while (searchFrom < text.length) {
    const idx = text.indexOf(pattern, searchFrom);
    if (idx === -1) break;

    // Must be at start of string or preceded by whitespace / newline
    const prev = idx > 0 ? text[idx - 1] : '\n';
    if (prev !== '\n' && prev !== '\r' && prev !== ' ' && prev !== '\t') {
      searchFrom = idx + 1;
      continue;
    }

    // Scan for matching closing brace
    let depth = 0;
    const contentStart = idx + pattern.length;
    let i = idx + pattern.length - 1; // points to the opening '{'

    while (i < text.length) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) {
          blocks.push(text.slice(contentStart, i));
          searchFrom = i + 1;
          break;
        }
      }
      i++;
    }

    if (depth !== 0) break; // unmatched brace — bail out
  }
  return blocks;
}

function firstBlock(text: string, name: string): string | null {
  const blocks = allBlocks(text, name);
  return blocks.length > 0 ? blocks[0] : null;
}

// ─── Feed header ──────────────────────────────────────────────────────────────

export function parseHeaderTimestamp(text: string): number {
  const hb = firstBlock(text, 'header');
  if (hb) {
    const ts = firstInt(hb, 'timestamp');
    if (ts) return ts;
  }
  return Math.floor(Date.now() / 1000);
}

// ─── Translation helper ───────────────────────────────────────────────────────

export function extractTranslation(
  containerText: string,
  msgFieldName: string,
  preferLang: string
): string | null {
  const msgBlock = firstBlock(containerText, msgFieldName);
  if (!msgBlock) return null;

  const translationBlocks = allBlocks(msgBlock, 'translation');
  // Prefer requested language
  for (const tb of translationBlocks) {
    if (firstField(tb, 'language') === preferLang) return firstField(tb, 'text');
  }
  // Unspecified language
  for (const tb of translationBlocks) {
    if (!firstField(tb, 'language')) return firstField(tb, 'text');
  }
  // First available
  return translationBlocks.length > 0 ? firstField(translationBlocks[0], 'text') : null;
}

// ─── Vehicle type heuristic ───────────────────────────────────────────────────

export type GtfsVehicleType =
  | 'SUBWAY' | 'TRAM' | 'TROLLEYBUS' | 'BUS' | 'RAIL' | 'FERRY' | 'CABLE_CAR';

const SUBWAY_SET  = new Set(['M1', 'M2', 'M3', 'M4', 'H5', 'H6', 'H7', 'H8', 'H9']);
const TRAM_SET    = new Set(['1', '2', '3', '4', '6', '17', '18', '19', '41', '47', '49', '50', '56', '59', '61', '62']);
const TROLLEY_SET = new Set(['70', '72', '73', '74', '75', '76', '77', '78', '79', '80', '83']);

export function guessVehicleType(routeRef: string): GtfsVehicleType {
  const ref = routeRef.toUpperCase().replace(/^0+/, '');
  if (SUBWAY_SET.has(ref))  return 'SUBWAY';
  if (TRAM_SET.has(routeRef)) return 'TRAM';
  if (TROLLEY_SET.has(routeRef)) return 'TROLLEYBUS';
  // BKK HÉV suburban rail: route refs like 'H5'–'H9' already handled above
  return 'BUS';
}

// ─── Route ref normalisation ──────────────────────────────────────────────────

// Strips 'BKK_' prefix and leading zeros: 'BKK_0068' → '68', 'BKK_M3' → 'M3'
export function normaliseRouteRef(routeId: string): string {
  const stripped = routeId.replace(/^BKK_/, '');
  // Remove leading zeros but keep letters (M3, H5, etc.)
  return stripped.replace(/^0+(\d)/, '$1').trim() || stripped;
}

// ─── VehiclePositions parser ──────────────────────────────────────────────────

export interface ParsedVehicle {
  vehicleId:  string;
  tripId:     string;
  routeRef:   string;
  lat:        number;
  lon:        number;
  bearing?:   number;
  speed?:     number;
  vehicle:    GtfsVehicleType;
  headsign?:  string;
  realtime:   boolean;
  timestamp:  number;  // vehicle observation time (Unix seconds)
}

export function parseVehiclePositions(text: string): ParsedVehicle[] {
  const vehicles: ParsedVehicle[] = [];
  const entityBlocks = allBlocks(text, 'entity');

  for (const entity of entityBlocks) {
    const vb = firstBlock(entity, 'vehicle');
    if (!vb) continue;

    const pos = firstBlock(vb, 'position');
    if (!pos) continue;

    const lat = firstFloat(pos, 'latitude');
    const lon = firstFloat(pos, 'longitude');
    if (lat === null || lon === null) continue;

    const trip      = firstBlock(vb, 'trip');
    const tripId    = trip ? (firstField(trip, 'trip_id')  ?? '') : '';
    const routeId   = trip ? (firstField(trip, 'route_id') ?? '') : '';

    const vDesc     = firstBlock(vb, 'vehicle');
    const vehicleId = vDesc ? (firstField(vDesc, 'id')    ?? '') : '';
    const label     = vDesc ? (firstField(vDesc, 'label') ?? '') : '';

    const bearing   = firstFloat(pos, 'bearing') ?? undefined;
    const speed     = firstFloat(pos, 'speed')   ?? undefined;
    const ts        = firstInt(vb, 'timestamp')  ?? 0;

    const routeRef  = normaliseRouteRef(routeId);

    vehicles.push({
      vehicleId:  vehicleId || label || tripId,
      tripId,
      routeRef,
      lat,
      lon,
      bearing,
      speed,
      vehicle:    guessVehicleType(routeRef),
      headsign:   undefined,
      realtime:   true,
      timestamp:  ts,
    });
  }

  return vehicles;
}

// ─── Alerts parser ────────────────────────────────────────────────────────────

export type AlertEffect =
  | 'NO_SERVICE' | 'REDUCED_SERVICE' | 'SIGNIFICANT_DELAYS'
  | 'DETOUR' | 'ADDITIONAL_SERVICE' | 'MODIFIED_SERVICE'
  | 'OTHER_EFFECT' | 'UNKNOWN_EFFECT' | 'STOP_MOVED' | 'NO_EFFECT';

export interface AlertSeverity { level: 'high' | 'medium' | 'low'; color: string; }

export interface ParsedAlert {
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

const SEVERITY_MAP: Record<string, AlertSeverity> = {
  NO_SERVICE:         { level: 'high',   color: '#ef4444' },
  REDUCED_SERVICE:    { level: 'high',   color: '#f97316' },
  SIGNIFICANT_DELAYS: { level: 'medium', color: '#f59e0b' },
  DETOUR:             { level: 'medium', color: '#f59e0b' },
  MODIFIED_SERVICE:   { level: 'medium', color: '#f59e0b' },
  OTHER_EFFECT:       { level: 'low',    color: '#64748b' },
  UNKNOWN_EFFECT:     { level: 'low',    color: '#64748b' },
  STOP_MOVED:         { level: 'low',    color: '#64748b' },
  NO_EFFECT:          { level: 'low',    color: '#64748b' },
};

function alertSeverity(effect: AlertEffect): AlertSeverity {
  return SEVERITY_MAP[effect] ?? { level: 'low', color: '#64748b' };
}

export function parseAlerts(text: string): ParsedAlert[] {
  const alerts: ParsedAlert[] = [];
  const entityBlocks = allBlocks(text, 'entity');

  for (const entity of entityBlocks) {
    const id = firstField(entity, 'id') ?? '';
    const ab = firstBlock(entity, 'alert');
    if (!ab) continue;

    const effect = (firstField(ab, 'effect') ?? 'UNKNOWN_EFFECT') as AlertEffect;

    // Active periods — take the first one
    const periods    = allBlocks(ab, 'active_period');
    const startTime  = periods.length > 0 ? (firstInt(periods[0], 'start') ?? null) : null;
    const endTime    = periods.length > 0 ? (firstInt(periods[0], 'end')   ?? null) : null;

    // Informed routes
    const informed = allBlocks(ab, 'informed_entity');
    const routes   = informed
      .map(ie => firstField(ie, 'route_id'))
      .filter((r): r is string => r !== null && r !== '')
      .map(normaliseRouteRef)
      .filter(Boolean);

    // Text content — prefer Hungarian
    const headerText      = extractTranslation(ab, 'header_text',      'hu')
                         ?? extractTranslation(ab, 'header_text',      'en')
                         ?? '';
    const descriptionText = extractTranslation(ab, 'description_text', 'hu')
                         ?? extractTranslation(ab, 'description_text', 'en')
                         ?? '';

    // URL
    const urlBlock = firstBlock(ab, 'url');
    const url      = urlBlock
      ? (extractTranslation(urlBlock, 'translation', 'hu') ?? extractTranslation(urlBlock, 'translation', 'en') ?? null)
      : null;

    if (!headerText) continue;

    alerts.push({ id, headerText, descriptionText, effect, severity: alertSeverity(effect), routes, startTime, endTime, url });
  }

  return alerts;
}

// ─── TripUpdates parser ───────────────────────────────────────────────────────

export interface StopDelay {
  stopId:      string;
  arrivalDelay:   number | null; // seconds
  departureDelay: number | null; // seconds
  departureTime:  number | null; // predicted Unix seconds
}

export interface ParsedTripUpdate {
  tripId:     string;
  routeRef:   string;
  stopDelays: StopDelay[];
}

export function parseTripUpdates(text: string): ParsedTripUpdate[] {
  const updates: ParsedTripUpdate[] = [];
  const entityBlocks = allBlocks(text, 'entity');

  for (const entity of entityBlocks) {
    const tub = firstBlock(entity, 'trip_update');
    if (!tub) continue;

    const tripBlock = firstBlock(tub, 'trip');
    const tripId    = tripBlock ? (firstField(tripBlock, 'trip_id')  ?? '') : '';
    const routeId   = tripBlock ? (firstField(tripBlock, 'route_id') ?? '') : '';
    const routeRef  = normaliseRouteRef(routeId);

    const stopUpdates = allBlocks(tub, 'stop_time_update');
    const stopDelays: StopDelay[] = stopUpdates.map(su => {
      const ab = firstBlock(su, 'arrival');
      const db = firstBlock(su, 'departure');
      return {
        stopId:         firstField(su, 'stop_id') ?? '',
        arrivalDelay:   ab ? (firstInt(ab, 'delay') ?? null) : null,
        departureDelay: db ? (firstInt(db, 'delay') ?? null) : null,
        departureTime:  db ? (firstInt(db, 'time')  ?? null) : null,
      };
    });

    updates.push({ tripId, routeRef, stopDelays });
  }
  return updates;
}
