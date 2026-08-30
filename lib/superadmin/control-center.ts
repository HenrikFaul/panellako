export type ControlCenterHealthStatus =
  | 'healthy'
  | 'attention'
  | 'degraded'
  | 'unavailable';

export type ControlCenterIntegrationStatus =
  | 'configured'
  | 'partial'
  | 'missing'
  | 'unknown'
  | 'degraded';

export type ControlCenterSeverity = 'info' | 'warning' | 'critical';

export type ControlCenterIntegrationId =
  | 'supabase'
  | 'address-registry'
  | 'email'
  | 'push'
  | 'stripe'
  | 'google-oauth'
  | 'bkk'
  | 'aqi'
  | 'cron';

export interface ControlCenterSummary {
  workspaces: number | null;
  buildings: number | null;
  units: number | null;
  profiles: number | null;
  agencies: number | null;
}

export interface ControlCenterAttentionItem {
  id: string;
  severity: ControlCenterSeverity;
  title: string;
  detail: string;
  count?: number;
  href?: string;
}

export interface ControlCenterIntegration {
  id: ControlCenterIntegrationId;
  label: string;
  status: ControlCenterIntegrationStatus;
  description?: string;
  lastCheckedAt?: string;
}

export interface ControlCenterRelease {
  environment: string;
  version?: string;
  commitSha?: string;
  deploymentId?: string;
  deployedAt?: string;
  status: ControlCenterHealthStatus;
}

export interface ControlCenterAuditEvent {
  id: string;
  action: string;
  actor?: 'operator' | 'system';
  createdAt: string;
  status?: ControlCenterHealthStatus;
  target?: string;
}

export interface ControlCenterSection {
  id: 'database' | 'onboarding' | 'jobs' | 'audit' | 'integrations' | 'release';
  status: ControlCenterHealthStatus;
  message?: string;
}

export interface ControlCenterResponse {
  schemaVersion: string;
  manifestFingerprint: string;
  generatedAt: string;
  overallStatus: ControlCenterHealthStatus;
  summary: ControlCenterSummary;
  attention: ControlCenterAttentionItem[];
  integrations: ControlCenterIntegration[];
  release: ControlCenterRelease;
  recentAudit: ControlCenterAuditEvent[];
  sections: ControlCenterSection[];
}

export interface ControlCenterIntegrationDefinition {
  id: ControlCenterIntegrationId;
  label: string;
}

/**
 * Public, value-free catalog shared by the API and the admin UI. Environment
 * variable names and credentials deliberately stay in the server-only module.
 */
export const CONTROL_CENTER_INTEGRATIONS = [
  { id: 'supabase', label: 'Supabase' },
  { id: 'address-registry', label: 'GeoData Address Registry' },
  { id: 'email', label: 'Email' },
  { id: 'push', label: 'Web Push' },
  { id: 'stripe', label: 'Stripe' },
  { id: 'google-oauth', label: 'Google OAuth' },
  { id: 'bkk', label: 'BKK' },
  { id: 'aqi', label: 'AQI' },
  { id: 'cron', label: 'Scheduler' },
] as const satisfies readonly ControlCenterIntegrationDefinition[];

export const CONTROL_CENTER_SCHEMA_VERSION = 'panellako.admin-control-center.v1';
export const CONTROL_CENTER_MANIFEST_SEED = [
  CONTROL_CENTER_SCHEMA_VERSION,
  CONTROL_CENTER_INTEGRATIONS.map(integration => integration.id).join(','),
  'workspaces,buildings,units,profiles,agencies',
  'database,onboarding,jobs,audit,integrations,release',
].join('|');
export const CONTROL_CENTER_MANIFEST_FINGERPRINT =
  'sha256:956a44ec409a5e43040be653d96d06aeaaee3e060aa1be147e339d5c2741ef53';

const CONTROL_CENTER_HEALTH_STATUSES = new Set<ControlCenterHealthStatus>([
  'healthy',
  'attention',
  'degraded',
  'unavailable',
]);
const CONTROL_CENTER_INTEGRATION_STATUSES = new Set<ControlCenterIntegrationStatus>([
  'configured',
  'partial',
  'missing',
  'unknown',
  'degraded',
]);
const CONTROL_CENTER_SEVERITIES = new Set<ControlCenterSeverity>([
  'info',
  'warning',
  'critical',
]);
const CONTROL_CENTER_SECTION_IDS: readonly ControlCenterSection['id'][] = [
  'database',
  'onboarding',
  'jobs',
  'audit',
  'integrations',
  'release',
];

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function boundedText(value: unknown, maximumLength: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maximumLength ? normalized : null;
}

function machineToken(value: unknown, maximumLength = 120): string | null {
  const normalized = boundedText(value, maximumLength);
  return normalized && /^[A-Za-z0-9._:-]+$/.test(normalized) ? normalized : null;
}

function isoDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function internalAdminHref(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 500) return undefined;
  try {
    const parsed = new URL(value, 'https://panellako.local');
    if (parsed.origin !== 'https://panellako.local' || parsed.pathname !== '/superadmin') return undefined;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return undefined;
  }
}

/**
 * Converts an untrusted API payload into a bounded, render-safe snapshot.
 * Missing or drifted sections are represented as unavailable instead of being
 * dereferenced by React. A non-object response remains a transport failure.
 */
export function normalizeControlCenterResponse(payload: unknown): ControlCenterResponse | null {
  const root = recordValue(payload);
  if (!root) return null;

  let complete = true;
  const unavailableSections = new Set<ControlCenterSection['id']>();

  const schemaVersion = boundedText(root.schemaVersion, 160) ?? 'invalid';
  const manifestFingerprint = typeof root.manifestFingerprint === 'string'
    && /^sha256:[0-9a-f]{64}$/i.test(root.manifestFingerprint)
    ? root.manifestFingerprint.toLowerCase()
    : 'invalid';
  const generatedAt = isoDate(root.generatedAt) ?? '';
  if (schemaVersion === 'invalid' || manifestFingerprint === 'invalid' || !generatedAt) complete = false;

  const rawSummary = recordValue(root.summary);
  if (!rawSummary) unavailableSections.add('database');
  const metric = (key: keyof ControlCenterSummary): number | null => {
    if (!rawSummary || !Object.hasOwn(rawSummary, key)) {
      complete = false;
      unavailableSections.add('database');
      return null;
    }
    const value = rawSummary[key];
    if (value === null) return null;
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value;
    complete = false;
    unavailableSections.add('database');
    return null;
  };
  const summary: ControlCenterSummary = {
    workspaces: metric('workspaces'),
    buildings: metric('buildings'),
    units: metric('units'),
    profiles: metric('profiles'),
    agencies: metric('agencies'),
  };

  const attention: ControlCenterAttentionItem[] = [];
  if (!Array.isArray(root.attention)) {
    complete = false;
    unavailableSections.add('onboarding');
    unavailableSections.add('jobs');
  } else {
    const seen = new Set<string>();
    for (const candidate of root.attention.slice(0, 50)) {
      const item = recordValue(candidate);
      const id = machineToken(item?.id);
      const severity = item?.severity;
      const title = boundedText(item?.title, 240);
      const detail = boundedText(item?.detail, 600);
      if (!item || !id || seen.has(id) || !CONTROL_CENTER_SEVERITIES.has(severity as ControlCenterSeverity) || !title || !detail) {
        complete = false;
        continue;
      }
      seen.add(id);
      const count = item.count;
      const href = internalAdminHref(item.href);
      attention.push({
        id,
        severity: severity as ControlCenterSeverity,
        title,
        detail,
        ...(typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 ? { count } : {}),
        ...(href ? { href } : {}),
      });
      if (item.href !== undefined && !href) complete = false;
    }
  }

  const definitions = new Map(CONTROL_CENTER_INTEGRATIONS.map(definition => [definition.id, definition]));
  const integrations: ControlCenterIntegration[] = [];
  if (!Array.isArray(root.integrations)) {
    complete = false;
    unavailableSections.add('integrations');
  } else {
    const seen = new Set<ControlCenterIntegrationId>();
    for (const candidate of root.integrations.slice(0, CONTROL_CENTER_INTEGRATIONS.length + 5)) {
      const item = recordValue(candidate);
      const id = item?.id as ControlCenterIntegrationId;
      const definition = definitions.get(id);
      const status = item?.status;
      if (!item || !definition || seen.has(id) || !CONTROL_CENTER_INTEGRATION_STATUSES.has(status as ControlCenterIntegrationStatus)) {
        complete = false;
        unavailableSections.add('integrations');
        continue;
      }
      seen.add(id);
      const description = boundedText(item.description, 500);
      const lastCheckedAt = isoDate(item.lastCheckedAt);
      integrations.push({
        id,
        label: boundedText(item.label, 120) ?? definition.label,
        status: status as ControlCenterIntegrationStatus,
        ...(description ? { description } : {}),
        ...(lastCheckedAt ? { lastCheckedAt } : {}),
      });
      if (item.lastCheckedAt !== undefined && !lastCheckedAt) {
        complete = false;
        unavailableSections.add('integrations');
      }
    }
  }

  const rawRelease = recordValue(root.release);
  if (!rawRelease) unavailableSections.add('release');
  const environment = rawRelease
    && typeof rawRelease.environment === 'string'
    && ['production', 'preview', 'development', 'test', 'unknown'].includes(rawRelease.environment)
    ? rawRelease.environment
    : 'unknown';
  const releaseStatus = rawRelease?.status;
  const release: ControlCenterRelease = {
    environment,
    status: CONTROL_CENTER_HEALTH_STATUSES.has(releaseStatus as ControlCenterHealthStatus)
      ? releaseStatus as ControlCenterHealthStatus
      : 'attention',
  };
  if (!rawRelease || environment === 'unknown' && rawRelease.environment !== 'unknown'
    || !CONTROL_CENTER_HEALTH_STATUSES.has(releaseStatus as ControlCenterHealthStatus)) {
    complete = false;
    unavailableSections.add('release');
  }
  const version = machineToken(rawRelease?.version, 40);
  const commitSha = typeof rawRelease?.commitSha === 'string' && /^[0-9a-f]{7,64}$/i.test(rawRelease.commitSha)
    ? rawRelease.commitSha
    : null;
  const deploymentId = machineToken(rawRelease?.deploymentId, 120);
  const deployedAt = isoDate(rawRelease?.deployedAt);
  if (version) release.version = version;
  if (commitSha) release.commitSha = commitSha;
  if (deploymentId) release.deploymentId = deploymentId;
  if (deployedAt) release.deployedAt = deployedAt;
  if (rawRelease?.deployedAt !== undefined && !deployedAt) {
    complete = false;
    unavailableSections.add('release');
  }

  const recentAudit: ControlCenterAuditEvent[] = [];
  if (!Array.isArray(root.recentAudit)) {
    complete = false;
    unavailableSections.add('audit');
  } else {
    const seen = new Set<string>();
    for (const candidate of root.recentAudit.slice(0, 50)) {
      const item = recordValue(candidate);
      const id = machineToken(item?.id);
      const action = machineToken(item?.action);
      const createdAt = isoDate(item?.createdAt);
      if (!item || !id || seen.has(id) || !action || !createdAt) {
        complete = false;
        unavailableSections.add('audit');
        continue;
      }
      seen.add(id);
      const actor = item.actor === 'operator' || item.actor === 'system' ? item.actor : undefined;
      const status = CONTROL_CENTER_HEALTH_STATUSES.has(item.status as ControlCenterHealthStatus)
        ? item.status as ControlCenterHealthStatus
        : undefined;
      const target = machineToken(item.target);
      recentAudit.push({
        id,
        action,
        createdAt,
        ...(actor ? { actor } : {}),
        ...(status ? { status } : {}),
        ...(target ? { target } : {}),
      });
      if (item.actor !== undefined && !actor || item.status !== undefined && !status || item.target !== undefined && !target) {
        complete = false;
        unavailableSections.add('audit');
      }
    }
  }

  const rawSections = Array.isArray(root.sections) ? root.sections : [];
  if (!Array.isArray(root.sections)) complete = false;
  const sectionMap = new Map<ControlCenterSection['id'], ControlCenterSection>();
  for (const candidate of rawSections.slice(0, CONTROL_CENTER_SECTION_IDS.length + 5)) {
    const item = recordValue(candidate);
    const id = item?.id as ControlCenterSection['id'];
    const status = item?.status;
    if (!item || !CONTROL_CENTER_SECTION_IDS.includes(id) || sectionMap.has(id)
      || !CONTROL_CENTER_HEALTH_STATUSES.has(status as ControlCenterHealthStatus)) {
      complete = false;
      continue;
    }
    const message = boundedText(item.message, 500);
    sectionMap.set(id, {
      id,
      status: status as ControlCenterHealthStatus,
      ...(message ? { message } : {}),
    });
    if (item.message !== undefined && !message) complete = false;
  }

  const contractMismatch = schemaVersion !== CONTROL_CENTER_SCHEMA_VERSION
    || manifestFingerprint !== CONTROL_CENTER_MANIFEST_FINGERPRINT;
  if (contractMismatch) complete = false;
  const sections = CONTROL_CENTER_SECTION_IDS.map((id): ControlCenterSection => {
    const section = sectionMap.get(id);
    if (!section || unavailableSections.has(id)) {
      complete = false;
      return { id, status: 'unavailable', message: 'Response section unavailable.' };
    }
    if (contractMismatch && id === 'release' && section.status !== 'unavailable') {
      return { ...section, status: 'degraded' };
    }
    return section;
  });

  const rawOverallStatus = root.overallStatus;
  const overallStatus = complete && CONTROL_CENTER_HEALTH_STATUSES.has(rawOverallStatus as ControlCenterHealthStatus)
    ? rawOverallStatus as ControlCenterHealthStatus
    : 'degraded';

  return {
    schemaVersion,
    manifestFingerprint,
    generatedAt,
    overallStatus,
    summary,
    attention,
    integrations,
    release,
    recentAudit,
    sections,
  };
}

export interface ControlCenterAuditPage {
  events: ControlCenterAuditEvent[];
  nextCursor: string | null;
}
