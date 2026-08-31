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

export type PlatformAdminCapability =
  | 'platform.overview.read'
  | 'platform.health.read'
  | 'platform.release.read'
  | 'platform.integrations.read'
  | 'platform.audit.read'
  | 'platform.users.read_masked'
  | 'platform.features.read'
  | 'platform.features.manage'
  | 'platform.communities.review'
  | 'platform.jobs.read'
  | 'platform.jobs.run'
  | 'platform.settings.manage';

export type PlatformAdminScope = 'platform' | 'platform_or_workspace';
export type PlatformAdminCriticality = 'critical' | 'high' | 'medium' | 'low';
export type PlatformAdminProbeKind =
  | 'config_only'
  | 'local_read'
  | 'remote_read'
  | 'synthetic'
  | 'command';
export type PlatformAdminSideEffect = 'none' | 'read' | 'write';

export interface PlatformAdminManifestDefinition {
  id: string;
  category: string;
  nameKey: string;
  purposeKey: string;
  capability: PlatformAdminCapability;
  scope: PlatformAdminScope;
  criticality: PlatformAdminCriticality;
  timeoutMs: number;
  freshnessMs: number;
  probeKind: PlatformAdminProbeKind;
  sideEffect: PlatformAdminSideEffect;
  runbook: string;
  safeDeepLink: string;
}

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

export type ControlCenterKpiId =
  | 'active_workspaces'
  | 'physical_buildings'
  | 'units'
  | 'active_profiles'
  | 'agencies'
  | 'active_mandates'
  | 'pending_community_requests'
  | 'failed_jobs_24h'
  | 'critical_integration_gaps';

export type ControlCenterFreshnessState = 'fresh' | 'stale' | 'unknown' | 'not_applicable';
export type ControlCenterCollectorState = 'ok' | 'error' | 'timeout' | 'unknown';
export type ControlCenterRuntimeStatus = 'healthy' | 'degraded' | 'unavailable' | 'unknown';
export type ControlCenterLatencyBucket = 'fast' | 'normal' | 'slow' | 'timeout' | 'unknown';

export interface ControlCenterKpi {
  id: ControlCenterKpiId;
  labelKey: string;
  value: number | null;
  unit: 'count';
  status: ControlCenterHealthStatus;
  freshnessAt: string | null;
  freshnessState: ControlCenterFreshnessState;
  collectorState: ControlCenterCollectorState;
  source: string;
  drillDownHref: string | null;
}

export interface ControlCenterAttentionItem {
  id: string;
  severity: ControlCenterSeverity;
  title: string;
  detail: string;
  count?: number;
  href?: string;
  kind?: string;
  state?: string;
  time?: string;
  owner?: string;
  source?: string;
}

export interface ControlCenterIntegration {
  id: ControlCenterIntegrationId;
  label: string;
  status: ControlCenterIntegrationStatus;
  description?: string;
  lastCheckedAt?: string;
  category?: string;
  nameKey?: string;
  purposeKey?: string;
  criticality?: PlatformAdminCriticality;
  configurationStatus?: ControlCenterIntegrationStatus;
  runtimeStatus?: ControlCenterRuntimeStatus;
  lastSuccessAt?: string;
  freshnessState?: ControlCenterFreshnessState;
  latencyMs?: number;
  latencyBucket?: ControlCenterLatencyBucket;
  probeKind?: PlatformAdminProbeKind;
  sideEffect?: PlatformAdminSideEffect;
  runbookId?: string;
  actionHref?: string;
}

export type ControlCenterReleaseIdentityState = 'known' | 'unknown' | 'error';
export type ControlCenterReleaseMatchStatus = 'match' | 'mismatch' | 'unknown' | 'error';

export interface ControlCenterReleaseIdentity {
  surface: 'web' | 'backend';
  state: ControlCenterReleaseIdentityState;
  version?: string;
  commitSha?: string;
  deploymentId?: string;
  builtAt?: string;
  manifestFingerprint?: string;
}

export interface ControlCenterRelease {
  environment: string;
  version?: string;
  commitSha?: string;
  deploymentId?: string;
  deployedAt?: string;
  status: ControlCenterHealthStatus;
  web?: ControlCenterReleaseIdentity;
  backend?: ControlCenterReleaseIdentity;
  identityStatus?: ControlCenterReleaseMatchStatus;
}

export type ControlCenterAuditOutcome =
  | 'succeeded'
  | 'failed'
  | 'partial'
  | 'running'
  | 'unknown';

export interface ControlCenterAuditEvent {
  id: string;
  action: string;
  actor?: 'operator' | 'system';
  createdAt: string;
  status?: ControlCenterHealthStatus;
  target?: string;
  targetId?: string;
  outcome?: ControlCenterAuditOutcome;
  supportMarker?: boolean;
  recoveryMarker?: boolean;
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
  kpis?: ControlCenterKpi[];
  attention: ControlCenterAttentionItem[];
  integrations: ControlCenterIntegration[];
  release: ControlCenterRelease;
  recentAudit: ControlCenterAuditEvent[];
  sections: ControlCenterSection[];
}

export const CONTROL_CENTER_SCHEMA_VERSION = 'panellako.admin-control-center.v1';
export const CONTROL_CENTER_MANIFEST_FINGERPRINT =
  'sha256:491acabd8983c232313d011d153dd0e05e36eff4c04e25a84df2a9b97fba9d16';

const CONTROL_CENTER_INTEGRATION_IDS: readonly ControlCenterIntegrationId[] = [
  'supabase',
  'address-registry',
  'email',
  'push',
  'stripe',
  'google-oauth',
  'bkk',
  'aqi',
  'cron',
];

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
const CONTROL_CENTER_FRESHNESS_STATES = new Set<ControlCenterFreshnessState>([
  'fresh',
  'stale',
  'unknown',
  'not_applicable',
]);
const CONTROL_CENTER_COLLECTOR_STATES = new Set<ControlCenterCollectorState>([
  'ok',
  'error',
  'timeout',
  'unknown',
]);
const CONTROL_CENTER_RUNTIME_STATUSES = new Set<ControlCenterRuntimeStatus>([
  'healthy',
  'degraded',
  'unavailable',
  'unknown',
]);
const CONTROL_CENTER_LATENCY_BUCKETS = new Set<ControlCenterLatencyBucket>([
  'fast',
  'normal',
  'slow',
  'timeout',
  'unknown',
]);
const PLATFORM_ADMIN_CRITICALITIES = new Set<PlatformAdminCriticality>([
  'critical',
  'high',
  'medium',
  'low',
]);
const PLATFORM_ADMIN_PROBE_KINDS = new Set<PlatformAdminProbeKind>([
  'config_only',
  'local_read',
  'remote_read',
  'synthetic',
  'command',
]);
const PLATFORM_ADMIN_SIDE_EFFECTS = new Set<PlatformAdminSideEffect>([
  'none',
  'read',
  'write',
]);
const CONTROL_CENTER_RELEASE_IDENTITY_STATES = new Set<ControlCenterReleaseIdentityState>([
  'known',
  'unknown',
  'error',
]);
const CONTROL_CENTER_RELEASE_MATCH_STATUSES = new Set<ControlCenterReleaseMatchStatus>([
  'match',
  'mismatch',
  'unknown',
  'error',
]);
const CONTROL_CENTER_AUDIT_OUTCOMES = new Set<ControlCenterAuditOutcome>([
  'succeeded',
  'failed',
  'partial',
  'running',
  'unknown',
]);
const CONTROL_CENTER_KPI_IDS: readonly ControlCenterKpiId[] = [
  'active_workspaces',
  'physical_buildings',
  'units',
  'active_profiles',
  'agencies',
  'active_mandates',
  'pending_community_requests',
  'failed_jobs_24h',
  'critical_integration_gaps',
];
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

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function releaseCommit(value: unknown): string | undefined {
  return typeof value === 'string' && /^[0-9a-f]{7,64}$/i.test(value)
    ? value.toLowerCase()
    : undefined;
}

function releaseFingerprint(value: unknown): string | undefined {
  return typeof value === 'string' && /^sha256:[0-9a-f]{64}$/i.test(value)
    ? value.toLowerCase()
    : undefined;
}

function normalizeReleaseIdentity(
  value: unknown,
  surface: ControlCenterReleaseIdentity['surface'],
): ControlCenterReleaseIdentity | null {
  const identity = recordValue(value);
  if (!identity) return null;
  const state = CONTROL_CENTER_RELEASE_IDENTITY_STATES.has(
    identity.state as ControlCenterReleaseIdentityState,
  )
    ? identity.state as ControlCenterReleaseIdentityState
    : 'error';
  const version = machineToken(identity.version, 40) ?? undefined;
  const commitSha = releaseCommit(identity.commitSha);
  const deploymentId = machineToken(identity.deploymentId, 120) ?? undefined;
  const builtAt = isoDate(identity.builtAt) ?? undefined;
  const manifestFingerprint = releaseFingerprint(identity.manifestFingerprint);
  return {
    surface,
    state,
    ...(version ? { version } : {}),
    ...(commitSha ? { commitSha } : {}),
    ...(deploymentId ? { deploymentId } : {}),
    ...(builtAt ? { builtAt } : {}),
    ...(manifestFingerprint ? { manifestFingerprint } : {}),
  };
}

function defaultAttentionKind(id: string): string {
  if (id.includes('community')) return 'community_request';
  if (id.includes('job')) return 'job';
  if (id.includes('integration')) return 'integration';
  if (id.includes('release')) return 'release';
  return 'platform_data';
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

  const kpis: ControlCenterKpi[] = [];
  if (Array.isArray(root.kpis)) {
    const seen = new Set<ControlCenterKpiId>();
    for (const candidate of root.kpis.slice(0, CONTROL_CENTER_KPI_IDS.length + 5)) {
      const item = recordValue(candidate);
      const id = item?.id as ControlCenterKpiId;
      const status = item?.status;
      const freshnessState = item?.freshnessState;
      const collectorState = item?.collectorState;
      const labelKey = machineToken(item?.labelKey, 180);
      const source = machineToken(item?.source, 180);
      const value = item?.value === null ? null : nonNegativeInteger(item?.value);
      const freshnessAt = item?.freshnessAt === null ? null : isoDate(item?.freshnessAt);
      const drillDownHref = item?.drillDownHref === null
        ? null
        : internalAdminHref(item?.drillDownHref) ?? null;
      if (
        !item
        || !CONTROL_CENTER_KPI_IDS.includes(id)
        || seen.has(id)
        || !labelKey
        || !source
        || item.unit !== 'count'
        || !CONTROL_CENTER_HEALTH_STATUSES.has(status as ControlCenterHealthStatus)
        || !CONTROL_CENTER_FRESHNESS_STATES.has(freshnessState as ControlCenterFreshnessState)
        || !CONTROL_CENTER_COLLECTOR_STATES.has(collectorState as ControlCenterCollectorState)
        || item.value !== null && value === null
        || item.freshnessAt !== null && !freshnessAt
        || item.drillDownHref !== null && !drillDownHref
      ) {
        complete = false;
        unavailableSections.add('database');
        continue;
      }
      seen.add(id);
      kpis.push({
        id,
        labelKey,
        value,
        unit: 'count',
        status: status as ControlCenterHealthStatus,
        freshnessAt,
        freshnessState: freshnessState as ControlCenterFreshnessState,
        collectorState: collectorState as ControlCenterCollectorState,
        source,
        drillDownHref,
      });
    }
    if (seen.size !== CONTROL_CENTER_KPI_IDS.length) complete = false;
  } else {
    const legacyKpis: Array<[ControlCenterKpiId, keyof ControlCenterSummary, string]> = [
      ['active_workspaces', 'workspaces', 'workspaces'],
      ['physical_buildings', 'buildings', 'physical_buildings'],
      ['units', 'units', 'units'],
      ['active_profiles', 'profiles', 'profiles'],
      ['agencies', 'agencies', 'management_agency_details'],
    ];
    for (const [id, summaryKey, source] of legacyKpis) {
      const value = summary[summaryKey];
      kpis.push({
        id,
        labelKey: `superadmin.controlCenter.kpis.${id}`,
        value,
        unit: 'count',
        status: value === null ? 'unavailable' : 'healthy',
        freshnessAt: value === null || !generatedAt ? null : generatedAt,
        freshnessState: value === null ? 'unknown' : 'fresh',
        collectorState: value === null ? 'unknown' : 'ok',
        source,
        drillDownHref: null,
      });
    }
  }

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
      const kind = machineToken(item.kind) ?? defaultAttentionKind(id);
      const state = machineToken(item.state) ?? 'open';
      const time = (isoDate(item.time) ?? generatedAt) || new Date(0).toISOString();
      const owner = machineToken(item.owner) ?? 'platform-operator';
      const source = machineToken(item.source, 180) ?? 'legacy-control-center';
      attention.push({
        id,
        severity: severity as ControlCenterSeverity,
        title,
        detail,
        ...(typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 ? { count } : {}),
        ...(href ? { href } : {}),
        kind,
        state,
        time,
        owner,
        source,
      });
      if (item.href !== undefined && !href) complete = false;
      if (item.kind !== undefined && !machineToken(item.kind)
        || item.state !== undefined && !machineToken(item.state)
        || item.time !== undefined && !isoDate(item.time)
        || item.owner !== undefined && !machineToken(item.owner)
        || item.source !== undefined && !machineToken(item.source, 180)) {
        complete = false;
      }
    }
  }

  const integrations: ControlCenterIntegration[] = [];
  if (!Array.isArray(root.integrations)) {
    complete = false;
    unavailableSections.add('integrations');
  } else {
    const seen = new Set<ControlCenterIntegrationId>();
    for (const candidate of root.integrations.slice(0, CONTROL_CENTER_INTEGRATION_IDS.length + 5)) {
      const item = recordValue(candidate);
      const id = item?.id as ControlCenterIntegrationId;
      const status = item?.status;
      if (!item || !CONTROL_CENTER_INTEGRATION_IDS.includes(id) || seen.has(id)
        || !CONTROL_CENTER_INTEGRATION_STATUSES.has(status as ControlCenterIntegrationStatus)) {
        complete = false;
        unavailableSections.add('integrations');
        continue;
      }
      seen.add(id);
      const description = boundedText(item.description, 500);
      const lastCheckedAt = isoDate(item.lastCheckedAt);
      const lastSuccessAt = isoDate(item.lastSuccessAt);
      const configurationStatus = CONTROL_CENTER_INTEGRATION_STATUSES.has(
        item.configurationStatus as ControlCenterIntegrationStatus,
      )
        ? item.configurationStatus as ControlCenterIntegrationStatus
        : status as ControlCenterIntegrationStatus;
      const fallbackRuntimeStatus: ControlCenterRuntimeStatus = id === 'supabase'
        ? status === 'configured'
          ? 'healthy'
          : status === 'degraded'
            ? 'degraded'
            : 'unknown'
        : 'unknown';
      const runtimeStatus = CONTROL_CENTER_RUNTIME_STATUSES.has(
        item.runtimeStatus as ControlCenterRuntimeStatus,
      )
        ? item.runtimeStatus as ControlCenterRuntimeStatus
        : fallbackRuntimeStatus;
      const freshnessState = CONTROL_CENTER_FRESHNESS_STATES.has(
        item.freshnessState as ControlCenterFreshnessState,
      )
        ? item.freshnessState as ControlCenterFreshnessState
        : lastCheckedAt
          ? 'fresh'
          : 'unknown';
      const latencyMs = nonNegativeInteger(item.latencyMs);
      const latencyBucket = CONTROL_CENTER_LATENCY_BUCKETS.has(
        item.latencyBucket as ControlCenterLatencyBucket,
      )
        ? item.latencyBucket as ControlCenterLatencyBucket
        : 'unknown';
      const criticality = PLATFORM_ADMIN_CRITICALITIES.has(
        item.criticality as PlatformAdminCriticality,
      )
        ? item.criticality as PlatformAdminCriticality
        : 'medium';
      const probeKind = PLATFORM_ADMIN_PROBE_KINDS.has(item.probeKind as PlatformAdminProbeKind)
        ? item.probeKind as PlatformAdminProbeKind
        : id === 'supabase'
          ? 'local_read'
          : 'config_only';
      const sideEffect = PLATFORM_ADMIN_SIDE_EFFECTS.has(item.sideEffect as PlatformAdminSideEffect)
        ? item.sideEffect as PlatformAdminSideEffect
        : id === 'supabase'
          ? 'read'
          : 'none';
      const runbookId = machineToken(item.runbookId, 180) ?? `integration-${id}`;
      const actionHref = internalAdminHref(item.actionHref) ?? '/superadmin?tab=operations';
      integrations.push({
        id,
        label: boundedText(item.label, 120) ?? id,
        status: status as ControlCenterIntegrationStatus,
        ...(description ? { description } : {}),
        ...(lastCheckedAt ? { lastCheckedAt } : {}),
        category: machineToken(item.category) ?? 'integration',
        nameKey: machineToken(item.nameKey, 180) ?? `superadmin.controlCenter.integrationNames.${id}`,
        purposeKey: machineToken(item.purposeKey, 180) ?? `superadmin.controlCenter.integrationPurposes.${id}`,
        criticality,
        configurationStatus,
        runtimeStatus,
        ...(lastSuccessAt ? { lastSuccessAt } : {}),
        freshnessState,
        ...(latencyMs !== null ? { latencyMs } : {}),
        latencyBucket,
        probeKind,
        sideEffect,
        runbookId,
        actionHref,
      });
      if (item.lastCheckedAt !== undefined && !lastCheckedAt) {
        complete = false;
        unavailableSections.add('integrations');
      }
      if (item.lastSuccessAt !== undefined && !lastSuccessAt
        || item.latencyMs !== undefined && latencyMs === null
        || item.actionHref !== undefined && !internalAdminHref(item.actionHref)
        || item.runbookId !== undefined && !machineToken(item.runbookId, 180)) {
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
  const explicitWeb = normalizeReleaseIdentity(rawRelease?.web, 'web');
  const explicitBackend = normalizeReleaseIdentity(rawRelease?.backend, 'backend');
  const backend: ControlCenterReleaseIdentity = explicitBackend ?? {
    surface: 'backend',
    state: commitSha && version ? 'known' : 'unknown',
    ...(version ? { version } : {}),
    ...(commitSha ? { commitSha } : {}),
    ...(deploymentId ? { deploymentId } : {}),
    ...(deployedAt ? { builtAt: deployedAt } : {}),
    ...(manifestFingerprint !== 'invalid' ? { manifestFingerprint } : {}),
  };
  const web: ControlCenterReleaseIdentity = explicitWeb ?? {
    surface: 'web',
    state: 'unknown',
  };
  let identityStatus: ControlCenterReleaseMatchStatus;
  if (CONTROL_CENTER_RELEASE_MATCH_STATUSES.has(
    rawRelease?.identityStatus as ControlCenterReleaseMatchStatus,
  )) {
    identityStatus = rawRelease?.identityStatus as ControlCenterReleaseMatchStatus;
  } else if (web.state === 'error' || backend.state === 'error') {
    identityStatus = 'error';
  } else if (web.state !== 'known' || backend.state !== 'known'
    || !web.commitSha || !backend.commitSha
    || !web.manifestFingerprint || !backend.manifestFingerprint) {
    identityStatus = 'unknown';
  } else {
    identityStatus = web.commitSha === backend.commitSha
      && web.manifestFingerprint === backend.manifestFingerprint
      && (!web.version || !backend.version || web.version === backend.version)
      ? 'match'
      : 'mismatch';
  }
  release.web = web;
  release.backend = backend;
  release.identityStatus = identityStatus;
  if (identityStatus === 'mismatch' || identityStatus === 'error') release.status = 'degraded';
  if (rawRelease && Object.hasOwn(rawRelease, 'web') && !explicitWeb
    || rawRelease && Object.hasOwn(rawRelease, 'backend') && !explicitBackend
    || rawRelease?.identityStatus !== undefined
      && !CONTROL_CENTER_RELEASE_MATCH_STATUSES.has(
        rawRelease.identityStatus as ControlCenterReleaseMatchStatus,
      )) {
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
      const targetId = machineToken(item.targetId);
      const outcome = CONTROL_CENTER_AUDIT_OUTCOMES.has(item.outcome as ControlCenterAuditOutcome)
        ? item.outcome as ControlCenterAuditOutcome
        : 'unknown';
      const supportMarker = typeof item.supportMarker === 'boolean' ? item.supportMarker : false;
      const recoveryMarker = typeof item.recoveryMarker === 'boolean' ? item.recoveryMarker : false;
      recentAudit.push({
        id,
        action,
        createdAt,
        ...(actor ? { actor } : {}),
        ...(status ? { status } : {}),
        ...(target ? { target } : {}),
        ...(targetId ? { targetId } : {}),
        outcome,
        supportMarker,
        recoveryMarker,
      });
      if (item.actor !== undefined && !actor
        || item.status !== undefined && !status
        || item.target !== undefined && !target
        || item.targetId !== undefined && !targetId
        || item.outcome !== undefined
          && !CONTROL_CENTER_AUDIT_OUTCOMES.has(item.outcome as ControlCenterAuditOutcome)
        || item.supportMarker !== undefined && typeof item.supportMarker !== 'boolean'
        || item.recoveryMarker !== undefined && typeof item.recoveryMarker !== 'boolean') {
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
    kpis,
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
