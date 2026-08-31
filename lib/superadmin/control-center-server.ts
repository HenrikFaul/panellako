import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  CONTROL_CENTER_MANIFEST_FINGERPRINT,
  CONTROL_CENTER_SCHEMA_VERSION,
  type ControlCenterAttentionItem,
  type ControlCenterAuditEvent,
  type ControlCenterAuditOutcome,
  type ControlCenterAuditPage,
  type ControlCenterCollectorState,
  type ControlCenterFreshnessState,
  type ControlCenterHealthStatus,
  type ControlCenterIntegration,
  type ControlCenterIntegrationId,
  type ControlCenterIntegrationStatus,
  type ControlCenterKpi,
  type ControlCenterKpiId,
  type ControlCenterLatencyBucket,
  type ControlCenterRelease,
  type ControlCenterReleaseIdentity,
  type ControlCenterReleaseMatchStatus,
  type ControlCenterRuntimeStatus,
  type ControlCenterResponse,
  type ControlCenterSection,
  type ControlCenterSummary,
} from '@/lib/superadmin/control-center';
import {
  PLATFORM_ADMIN_INTEGRATIONS,
  integrationManifestEntry,
  moduleManifestEntry,
} from '@/lib/superadmin/manifest';

type AdminClient = SupabaseClient;

interface QueryResult<T> {
  data: T;
  available: boolean;
  collectorState: ControlCenterCollectorState;
  checkedAt: string;
  freshnessAt: string | null;
  latencyMs: number;
  issueCode?: 'SOURCE_UNAVAILABLE' | 'COLLECTOR_TIMEOUT';
}

interface RawQueryResult<T> {
  data: T;
  available: boolean;
  issueCode?: 'SOURCE_UNAVAILABLE';
}

interface JobRow {
  id: string;
  job_id: string;
  status: 'running' | 'error' | 'partial';
  started_at: string;
}

interface PendingOnboarding {
  count: number | null;
  oldestCreatedAt: string | null;
}

interface AuditPageCursor {
  createdAt: string;
  id?: string;
}

interface CountMetricDefinition {
  id: Exclude<ControlCenterKpiId, 'pending_community_requests' | 'failed_jobs_24h' | 'critical_integration_gaps'>;
  table: string;
  status?: string;
  summaryKey?: keyof ControlCenterSummary;
  drillDownHref: string | null;
}

const EMPTY_SUMMARY: ControlCenterSummary = {
  workspaces: null,
  buildings: null,
  units: null,
  profiles: null,
  agencies: null,
};

const COUNT_METRICS: readonly CountMetricDefinition[] = [
  { id: 'active_workspaces', table: 'workspaces', status: 'ACTIVE', summaryKey: 'workspaces', drillDownHref: '/superadmin?tab=communityRequests' },
  { id: 'physical_buildings', table: 'physical_buildings', summaryKey: 'buildings', drillDownHref: null },
  { id: 'units', table: 'units', summaryKey: 'units', drillDownHref: null },
  { id: 'active_profiles', table: 'profiles', status: 'ACTIVE', summaryKey: 'profiles', drillDownHref: '/superadmin?tab=users' },
  { id: 'agencies', table: 'management_agency_details', summaryKey: 'agencies', drillDownHref: null },
  { id: 'active_mandates', table: 'management_mandates', status: 'ACTIVE', drillDownHref: null },
] as const;

const INTEGRATION_REQUIREMENTS: Readonly<Record<
  Exclude<ControlCenterIntegrationId, 'google-oauth' | 'cron'>,
  readonly string[]
>> = {
  supabase: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
  'address-registry': ['GEODATA_ADDRESS_API_URL', 'GEODATA_ADDRESS_API_TOKEN'],
  email: ['BREVO_API_KEY'],
  push: ['NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT'],
  stripe: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_ID_ALAP_MONTHLY', 'STRIPE_PRICE_ID_PRO_MONTHLY'],
  bkk: ['BKKFUTAR_API_KEY', 'TRANSIT_SYNC_SECRET'],
  aqi: ['AQICN_API_TOKEN'],
};

function safeErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object' || Array.isArray(error)) return 'UNKNOWN';
  const code = 'code' in error ? error.code : undefined;
  return typeof code === 'string' && /^[A-Z0-9_]{1,32}$/i.test(code) ? code : 'UNKNOWN';
}

function recordUnavailable(scope: string, error: unknown): void {
  console.warn(`[platform-admin] ${scope} unavailable`, { code: safeErrorCode(error) });
}

function createCollectorPool(maxConcurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const drain = (): void => {
    while (active < maxConcurrency && queue.length > 0) {
      const start = queue.shift();
      if (!start) return;
      active += 1;
      start();
    }
  };
  return function schedule<T>(work: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        void work().then(resolve, reject).finally(() => {
          active -= 1;
          drain();
        });
      });
      drain();
    });
  };
}

async function runBoundedCollector<T>(
  scope: string,
  timeoutMs: number,
  fallback: T,
  operation: (signal: AbortSignal) => Promise<RawQueryResult<T>>,
): Promise<QueryResult<T>> {
  const startedAt = Date.now();
  const controller = new AbortController();
  let handle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<QueryResult<T>>(resolve => {
    handle = setTimeout(() => {
      controller.abort();
      recordUnavailable(scope, { code: 'COLLECTOR_TIMEOUT' });
      resolve({
        data: fallback,
        available: false,
        collectorState: 'timeout',
        checkedAt: new Date().toISOString(),
        freshnessAt: null,
        latencyMs: timeoutMs,
        issueCode: 'COLLECTOR_TIMEOUT',
      });
    }, timeoutMs);
  });
  const work = (async (): Promise<QueryResult<T>> => {
    try {
      const result = await operation(controller.signal);
      const checkedAt = new Date().toISOString();
      return {
        data: result.data,
        available: result.available,
        collectorState: result.available ? 'ok' : 'error',
        checkedAt,
        freshnessAt: result.available ? checkedAt : null,
        latencyMs: Math.max(0, Date.now() - startedAt),
        ...(result.issueCode ? { issueCode: result.issueCode } : {}),
      };
    } catch (error) {
      recordUnavailable(scope, error);
      return {
        data: fallback,
        available: false,
        collectorState: 'error',
        checkedAt: new Date().toISOString(),
        freshnessAt: null,
        latencyMs: Math.max(0, Date.now() - startedAt),
        issueCode: 'SOURCE_UNAVAILABLE',
      };
    }
  })();
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (handle) clearTimeout(handle);
  }
}

function hasConfiguredValue(env: NodeJS.ProcessEnv, key: string): boolean {
  return Boolean(env[key]?.trim());
}

function requiredConfigurationStatus(env: NodeJS.ProcessEnv, keys: readonly string[]): ControlCenterIntegrationStatus {
  const configured = keys.reduce((total, key) => total + Number(hasConfiguredValue(env, key)), 0);
  if (configured === keys.length) return 'configured';
  return configured === 0 ? 'missing' : 'partial';
}

function latencyBucket(latencyMs: number | null, state: ControlCenterCollectorState): ControlCenterLatencyBucket {
  if (state === 'timeout') return 'timeout';
  if (latencyMs === null) return 'unknown';
  if (latencyMs < 250) return 'fast';
  if (latencyMs < 1_000) return 'normal';
  return 'slow';
}

function integrationSnapshot(
  env: NodeJS.ProcessEnv,
  checkedAt: string,
  databaseStatus: ControlCenterHealthStatus,
  databaseLatencyMs: number | null,
  databaseCollectorState: ControlCenterCollectorState,
): ControlCenterIntegration[] {
  return PLATFORM_ADMIN_INTEGRATIONS.map((definition): ControlCenterIntegration => {
    let configurationStatus: ControlCenterIntegrationStatus;
    if (definition.id === 'google-oauth') configurationStatus = 'unknown';
    else if (definition.id === 'cron') {
      configurationStatus = ['CRON_SECRET', 'ANNOUNCEMENT_DELIVERY_CRON_SECRET'].some(key => hasConfiguredValue(env, key))
        ? 'configured'
        : 'missing';
    } else configurationStatus = requiredConfigurationStatus(env, INTEGRATION_REQUIREMENTS[definition.id]);

    let runtimeStatus: ControlCenterRuntimeStatus = 'unknown';
    let freshnessState: ControlCenterFreshnessState = 'not_applicable';
    let lastSuccessAt: string | undefined;
    let latencyMs: number | undefined;
    let bucket: ControlCenterLatencyBucket = 'unknown';
    if (definition.id === 'supabase') {
      runtimeStatus = databaseStatus === 'healthy' ? 'healthy' : databaseStatus === 'degraded' ? 'degraded' : 'unavailable';
      freshnessState = databaseStatus === 'unavailable' ? 'unknown' : 'fresh';
      if (databaseStatus !== 'unavailable') lastSuccessAt = checkedAt;
      if (databaseLatencyMs !== null) latencyMs = databaseLatencyMs;
      bucket = latencyBucket(databaseLatencyMs, databaseCollectorState);
    }
    const status: ControlCenterIntegrationStatus = configurationStatus === 'configured'
      && (runtimeStatus === 'degraded' || runtimeStatus === 'unavailable')
      ? 'degraded'
      : configurationStatus;
    return {
      id: definition.id,
      label: definition.label,
      status,
      category: definition.category,
      nameKey: definition.nameKey,
      purposeKey: definition.purposeKey,
      criticality: definition.criticality,
      configurationStatus,
      runtimeStatus,
      lastCheckedAt: checkedAt,
      ...(lastSuccessAt ? { lastSuccessAt } : {}),
      freshnessState,
      ...(latencyMs !== undefined ? { latencyMs } : {}),
      latencyBucket: bucket,
      probeKind: definition.probeKind,
      sideEffect: definition.sideEffect,
      runbookId: definition.runbook,
      actionHref: definition.safeDeepLink,
    };
  });
}

function safeReleaseToken(value: string | undefined, maximumLength = 120): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length <= maximumLength && /^[A-Za-z0-9._/-]+$/.test(normalized)
    ? normalized
    : undefined;
}

function safeReleaseSha(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && /^[0-9a-f]{7,64}$/i.test(normalized) ? normalized.toLowerCase() : undefined;
}

function safeReleaseTimestamp(value: string | undefined): string | undefined {
  const timestamp = value?.trim() ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

function releaseIdentity(
  surface: ControlCenterReleaseIdentity['surface'],
  values: { rawVersion?: string; rawCommitSha?: string; rawDeploymentId?: string; rawBuiltAt?: string },
): ControlCenterReleaseIdentity {
  const version = safeReleaseToken(values.rawVersion, 40);
  const commitSha = safeReleaseSha(values.rawCommitSha);
  const deploymentId = safeReleaseToken(values.rawDeploymentId);
  const builtAt = safeReleaseTimestamp(values.rawBuiltAt);
  const malformed = Boolean(
    values.rawVersion?.trim() && !version
    || values.rawCommitSha?.trim() && !commitSha
    || values.rawDeploymentId?.trim() && !deploymentId
    || values.rawBuiltAt?.trim() && !builtAt,
  );
  return {
    surface,
    state: malformed ? 'error' : version && commitSha ? 'known' : 'unknown',
    ...(version ? { version } : {}),
    ...(commitSha ? { commitSha } : {}),
    ...(deploymentId ? { deploymentId } : {}),
    ...(builtAt ? { builtAt } : {}),
    manifestFingerprint: CONTROL_CENTER_MANIFEST_FINGERPRINT,
  };
}

function releaseMatchStatus(web: ControlCenterReleaseIdentity, backend: ControlCenterReleaseIdentity): ControlCenterReleaseMatchStatus {
  if (web.state === 'error' || backend.state === 'error') return 'error';
  if (web.state !== 'known' || backend.state !== 'known'
    || !web.commitSha || !backend.commitSha || !web.version || !backend.version
    || !web.manifestFingerprint || !backend.manifestFingerprint) return 'unknown';
  return web.commitSha === backend.commitSha && web.version === backend.version
    && web.manifestFingerprint === backend.manifestFingerprint
    ? 'match'
    : 'mismatch';
}

function releaseSnapshot(env: NodeJS.ProcessEnv): ControlCenterRelease {
  const rawEnvironment = safeReleaseToken(env.VERCEL_ENV ?? env.NODE_ENV, 32);
  const environment = rawEnvironment && ['production', 'preview', 'development', 'test'].includes(rawEnvironment)
    ? rawEnvironment
    : 'unknown';
  const web = releaseIdentity('web', {
    rawVersion: env.NEXT_PUBLIC_APP_VERSION,
    rawCommitSha: env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? env.NEXT_PUBLIC_APP_COMMIT_SHA,
    rawDeploymentId: env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID,
    rawBuiltAt: env.NEXT_PUBLIC_VERCEL_BUILD_TIMESTAMP ?? env.NEXT_PUBLIC_APP_BUILD_TIMESTAMP,
  });
  const backend = releaseIdentity('backend', {
    rawVersion: env.APP_VERSION ?? env.npm_package_version,
    rawCommitSha: env.BACKEND_GIT_COMMIT_SHA ?? env.VERCEL_GIT_COMMIT_SHA,
    rawDeploymentId: env.VERCEL_DEPLOYMENT_ID,
    rawBuiltAt: env.VERCEL_BUILD_TIMESTAMP,
  });
  const identityStatus = releaseMatchStatus(web, backend);
  const status: ControlCenterHealthStatus = identityStatus === 'match' && environment !== 'unknown'
    ? 'healthy'
    : identityStatus === 'mismatch' || identityStatus === 'error'
      ? 'degraded'
      : 'attention';
  return {
    environment,
    ...(backend.version ? { version: backend.version } : {}),
    ...(backend.commitSha ? { commitSha: backend.commitSha.slice(0, 12) } : {}),
    ...(backend.deploymentId ? { deploymentId: backend.deploymentId } : {}),
    ...(backend.builtAt ? { deployedAt: backend.builtAt } : {}),
    status,
    web,
    backend,
    identityStatus,
  };
}

function safeToken(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  return /^[A-Za-z0-9._:-]{1,120}$/.test(normalized) ? normalized : fallback;
}

function safeIsoDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

async function countMetric(client: AdminClient, definition: CountMetricDefinition): Promise<QueryResult<number | null>> {
  return runBoundedCollector<number | null>(
    `count:${definition.table}:${definition.status ?? 'all'}`,
    integrationManifestEntry('supabase').timeoutMs,
    null,
    async signal => {
      let query = client.from(definition.table).select('id', { count: 'exact', head: true });
      if (definition.status) query = query.eq('status', definition.status);
      const { count, error } = await query.abortSignal(signal);
      if (error) {
        recordUnavailable(`count:${definition.table}`, error);
        return { data: null, available: false, issueCode: 'SOURCE_UNAVAILABLE' };
      }
      return { data: count ?? 0, available: true };
    },
  );
}

async function countPendingOnboarding(client: AdminClient): Promise<QueryResult<PendingOnboarding>> {
  return runBoundedCollector<PendingOnboarding>(
    'onboarding:pending',
    moduleManifestEntry('community-requests').timeoutMs,
    { count: null, oldestCreatedAt: null },
    async signal => {
      const { data, count, error } = await client.from('community_creation_requests')
        .select('id, created_at', { count: 'exact' })
        .in('status', ['PENDING_VERIFICATION', 'NEEDS_EVIDENCE'])
        .order('created_at', { ascending: true })
        .limit(1)
        .abortSignal(signal);
      if (error) {
        recordUnavailable('onboarding:pending', error);
        return { data: { count: null, oldestCreatedAt: null }, available: false, issueCode: 'SOURCE_UNAVAILABLE' };
      }
      const first = Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : undefined;
      return {
        data: { count: count ?? 0, oldestCreatedAt: safeIsoDate(first?.created_at) },
        available: true,
      };
    },
  );
}

function projectJobRow(value: unknown): JobRow | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const status = row.status;
  const startedAt = safeIsoDate(row.started_at);
  if ((status !== 'running' && status !== 'error' && status !== 'partial') || !startedAt) return null;
  return {
    id: safeToken(row.id, 'unknown'),
    job_id: safeToken(row.job_id, 'unknown'),
    status,
    started_at: startedAt,
  };
}

async function loadRecentProblemJobs(client: AdminClient, now: Date): Promise<QueryResult<JobRow[]>> {
  const since = new Date(now.getTime() - 24 * 60 * 60_000).toISOString();
  return runBoundedCollector(
    'jobs:recent',
    moduleManifestEntry('operations').timeoutMs,
    [],
    async signal => {
      const { data, error } = await client.from('platform_job_logs')
        .select('id, job_id, status, started_at')
        .in('status', ['error', 'running', 'partial'])
        .gte('started_at', since)
        .order('started_at', { ascending: false })
        .limit(8)
        .abortSignal(signal);
      if (error) {
        recordUnavailable('jobs:recent', error);
        return { data: [], available: false, issueCode: 'SOURCE_UNAVAILABLE' };
      }
      return {
        data: Array.isArray(data) ? data.map(projectJobRow).filter((row): row is JobRow => Boolean(row)) : [],
        available: true,
      };
    },
  );
}

async function countFailedJobs24h(client: AdminClient, now: Date): Promise<QueryResult<number | null>> {
  const since = new Date(now.getTime() - 24 * 60 * 60_000).toISOString();
  return runBoundedCollector(
    'jobs:failed-count',
    moduleManifestEntry('operations').timeoutMs,
    null,
    async signal => {
      const { count, error } = await client.from('platform_job_logs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'error')
        .gte('started_at', since)
        .abortSignal(signal);
      if (error) {
        recordUnavailable('jobs:failed-count', error);
        return { data: null, available: false, issueCode: 'SOURCE_UNAVAILABLE' };
      }
      return { data: count ?? 0, available: true };
    },
  );
}

function isAuditId(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function encodeAuditCursor(event: ControlCenterAuditEvent): string | null {
  if (!isAuditId(event.id)) return null;
  return Buffer.from(JSON.stringify([event.createdAt, event.id]), 'utf8').toString('base64url');
}

function decodeAuditCursor(value: string): AuditPageCursor | null {
  if (!/^[A-Za-z0-9_-]{1,512}$/.test(value)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
    if (!Array.isArray(decoded) || decoded.length !== 2) return null;
    const createdAt = safeIsoDate(decoded[0]);
    if (!createdAt || !isAuditId(decoded[1])) return null;
    return { createdAt, id: decoded[1] };
  } catch {
    return null;
  }
}

function auditOutcome(value: unknown): ControlCenterAuditOutcome {
  if (typeof value !== 'string') return 'unknown';
  const normalized = value.trim().toLowerCase();
  if (['ok', 'success', 'succeeded', 'completed'].includes(normalized)) return 'succeeded';
  if (['error', 'failed', 'failure'].includes(normalized)) return 'failed';
  if (normalized === 'partial') return 'partial';
  if (['running', 'pending'].includes(normalized)) return 'running';
  return 'unknown';
}

function auditHealthStatus(outcome: ControlCenterAuditOutcome): ControlCenterHealthStatus | undefined {
  if (outcome === 'succeeded') return 'healthy';
  if (outcome === 'failed') return 'degraded';
  if (outcome === 'partial' || outcome === 'running') return 'attention';
  return undefined;
}

function projectAuditRow(value: unknown): ControlCenterAuditEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const createdAt = safeIsoDate(row.created_at);
  if (!createdAt) return null;
  const payload = row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
    ? row.payload as Record<string, unknown>
    : null;
  const outcome = auditOutcome(row.outcome ?? payload?.outcome ?? payload?.status);
  const status = auditHealthStatus(outcome);
  const targetId = typeof row.target_id === 'string' ? safeToken(row.target_id, '') || undefined : undefined;
  const supportMarker = typeof row.support_session_id === 'string'
    || payload?.support_marker === true
    || payload?.support === true
    || typeof payload?.support_session_id === 'string';
  const recoveryMarker = payload?.recovery_marker === true
    || payload?.recovery === true
    || payload?.rollback === true;
  return {
    id: safeToken(row.id, 'unknown'),
    action: safeToken(row.action, 'unknown'),
    actor: typeof row.actor_id === 'string' && row.actor_id.trim() ? 'operator' : 'system',
    createdAt,
    ...(status ? { status } : {}),
    ...(typeof row.target_type === 'string' && row.target_type.trim()
      ? { target: safeToken(row.target_type, 'resource') }
      : {}),
    ...(targetId ? { targetId } : {}),
    outcome,
    supportMarker,
    recoveryMarker,
  };
}

export async function loadControlCenterAuditPage(
  client: AdminClient,
  limit: number,
  cursor?: AuditPageCursor,
): Promise<QueryResult<ControlCenterAuditPage>> {
  return runBoundedCollector(
    'audit:page',
    moduleManifestEntry('audit').timeoutMs,
    { events: [], nextCursor: null },
    async signal => {
      let query = client.from('platform_audit_events')
        .select('id, actor_id, action, target_type, target_id, outcome, support_session_id, payload, created_at');
      if (cursor?.id) {
        query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
      } else if (cursor) {
        query = query.lt('created_at', cursor.createdAt);
      }
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit)
        .abortSignal(signal);
      if (error) {
        recordUnavailable('audit:page', error);
        return { data: { events: [], nextCursor: null }, available: false, issueCode: 'SOURCE_UNAVAILABLE' };
      }
      const events = Array.isArray(data)
        ? data.map(projectAuditRow).filter((row): row is ControlCenterAuditEvent => Boolean(row))
        : [];
      return {
        data: {
          events,
          nextCursor: events.length === limit ? encodeAuditCursor(events.at(-1) as ControlCenterAuditEvent) : null,
        },
        available: true,
      };
    },
  );
}

function kpiFromResult(
  id: ControlCenterKpiId,
  value: number | null,
  result: QueryResult<unknown>,
  source: string,
  drillDownHref: string | null,
  attentionWhenPositive = false,
): ControlCenterKpi {
  return {
    id,
    labelKey: `superadmin.controlCenter.kpis.${id}`,
    value,
    unit: 'count',
    status: !result.available
      ? 'unavailable'
      : attentionWhenPositive && typeof value === 'number' && value > 0
        ? 'attention'
        : 'healthy',
    freshnessAt: result.freshnessAt,
    freshnessState: result.available ? 'fresh' : 'unknown',
    collectorState: result.collectorState,
    source,
    drillDownHref,
  };
}

function sectionStatus(available: boolean, hasAttention = false): ControlCenterHealthStatus {
  if (!available) return 'unavailable';
  return hasAttention ? 'attention' : 'healthy';
}

function overallStatus(sections: ControlCenterSection[], integrations: ControlCenterIntegration[]): ControlCenterHealthStatus {
  const database = sections.find(section => section.id === 'database');
  if (database?.status === 'unavailable') return 'unavailable';
  if (sections.some(section => section.status === 'degraded' || section.status === 'unavailable')) return 'degraded';
  if (sections.some(section => section.status === 'attention')
    || integrations.some(integration => ['missing', 'partial', 'degraded'].includes(integration.status))) return 'attention';
  return 'healthy';
}

function sortAttention(items: ControlCenterAttentionItem[]): ControlCenterAttentionItem[] {
  const rank = { critical: 0, warning: 1, info: 2 } as const;
  return items.sort((left, right) => {
    const severity = rank[left.severity] - rank[right.severity];
    if (severity !== 0) return severity;
    const time = Date.parse(left.time ?? '') - Date.parse(right.time ?? '');
    return Number.isFinite(time) && time !== 0 ? time : left.id.localeCompare(right.id);
  });
}

function criticalIntegrationGaps(integrations: ControlCenterIntegration[]): ControlCenterIntegration[] {
  return integrations.filter(integration => integration.criticality === 'critical'
    && (['missing', 'partial', 'degraded'].includes(integration.status) || integration.runtimeStatus === 'unavailable'));
}

function unavailableSnapshot(env: NodeJS.ProcessEnv, generatedAt: string): ControlCenterResponse {
  const integrations = integrationSnapshot(env, generatedAt, 'unavailable', null, 'error');
  const release = releaseSnapshot(env);
  const gaps = criticalIntegrationGaps(integrations);
  const unavailable: QueryResult<null> = {
    data: null,
    available: false,
    collectorState: 'error',
    checkedAt: generatedAt,
    freshnessAt: null,
    latencyMs: 0,
    issueCode: 'SOURCE_UNAVAILABLE',
  };
  const kpis: ControlCenterKpi[] = [
    ...COUNT_METRICS.map(metric => kpiFromResult(metric.id, null, unavailable, metric.table, metric.drillDownHref)),
    kpiFromResult('pending_community_requests', null, unavailable, 'community_creation_requests', '/superadmin?tab=communityRequests'),
    kpiFromResult('failed_jobs_24h', null, unavailable, 'platform_job_logs', '/superadmin?tab=operations'),
    {
      id: 'critical_integration_gaps',
      labelKey: 'superadmin.controlCenter.kpis.critical_integration_gaps',
      value: gaps.length,
      unit: 'count',
      status: gaps.length > 0 ? 'attention' : 'healthy',
      freshnessAt: generatedAt,
      freshnessState: 'fresh',
      collectorState: 'ok',
      source: 'platform_admin_manifest',
      drillDownHref: '/superadmin?tab=operations',
    },
  ];
  const sections: ControlCenterSection[] = [
    { id: 'database', status: 'unavailable', message: 'Database status is unavailable.' },
    { id: 'onboarding', status: 'unavailable', message: 'Onboarding status is unavailable.' },
    { id: 'jobs', status: 'unavailable', message: 'Job status is unavailable.' },
    { id: 'audit', status: 'unavailable', message: 'Audit status is unavailable.' },
    { id: 'integrations', status: gaps.length > 0 ? 'attention' : 'healthy' },
    { id: 'release', status: release.status },
  ];
  return {
    schemaVersion: CONTROL_CENTER_SCHEMA_VERSION,
    manifestFingerprint: CONTROL_CENTER_MANIFEST_FINGERPRINT,
    generatedAt,
    overallStatus: 'unavailable',
    summary: { ...EMPTY_SUMMARY },
    kpis,
    attention: [{
      id: 'database-unavailable',
      severity: 'critical',
      title: 'Database status unavailable',
      detail: 'The platform data service could not be queried.',
      kind: 'data_availability',
      state: 'unavailable',
      time: generatedAt,
      owner: 'platform-admin',
      source: 'platform-data-plane',
    }],
    integrations,
    release,
    recentAudit: [],
    sections,
  };
}

export async function collectControlCenterSnapshot(
  client: AdminClient,
  env: NodeJS.ProcessEnv = process.env,
  now: Date = new Date(),
): Promise<ControlCenterResponse> {
  const generatedAt = now.toISOString();
  const schedule = createCollectorPool(4);
  const countPromises = COUNT_METRICS.map(definition => schedule(
    async () => [definition, await countMetric(client, definition)] as const,
  ));
  const onboardingPromise = schedule(() => countPendingOnboarding(client));
  const jobsPromise = schedule(() => loadRecentProblemJobs(client, now));
  const failedJobsPromise = schedule(() => countFailedJobs24h(client, now));
  const auditPromise = schedule(() => loadControlCenterAuditPage(client, 8));
  const [countResults, onboarding, jobs, failedJobs, audit] = await Promise.all([
    Promise.all(countPromises),
    onboardingPromise,
    jobsPromise,
    failedJobsPromise,
    auditPromise,
  ]);

  const summary = countResults.reduce<ControlCenterSummary>((current, [definition, result]) => {
    if (definition.summaryKey) current[definition.summaryKey] = result.data;
    return current;
  }, { ...EMPTY_SUMMARY });
  const availableCount = countResults.filter(([, result]) => result.available).length;
  const databaseStatus: ControlCenterHealthStatus = availableCount === 0
    ? 'unavailable'
    : availableCount === countResults.length
      ? 'healthy'
      : 'degraded';
  const availableLatencies = countResults.filter(([, result]) => result.available).map(([, result]) => result.latencyMs);
  const databaseLatencyMs = availableLatencies.length > 0 ? Math.max(...availableLatencies) : null;
  const databaseCollectorState: ControlCenterCollectorState = countResults.some(([, result]) => result.collectorState === 'timeout')
    ? 'timeout'
    : databaseStatus === 'healthy'
      ? 'ok'
      : 'error';
  const integrations = integrationSnapshot(env, generatedAt, databaseStatus, databaseLatencyMs, databaseCollectorState);
  const gaps = criticalIntegrationGaps(integrations);
  const integrationKpiResult: QueryResult<number> = {
    data: gaps.length,
    available: true,
    collectorState: 'ok',
    checkedAt: generatedAt,
    freshnessAt: generatedAt,
    latencyMs: 0,
  };
  const kpis: ControlCenterKpi[] = [
    ...countResults.map(([definition, result]) => kpiFromResult(
      definition.id,
      result.data,
      result,
      definition.table,
      definition.drillDownHref,
    )),
    kpiFromResult(
      'pending_community_requests',
      onboarding.data.count,
      onboarding,
      'community_creation_requests',
      '/superadmin?tab=communityRequests',
      true,
    ),
    kpiFromResult(
      'failed_jobs_24h',
      failedJobs.data,
      failedJobs,
      'platform_job_logs',
      '/superadmin?tab=operations',
      true,
    ),
    kpiFromResult(
      'critical_integration_gaps',
      gaps.length,
      integrationKpiResult,
      'platform_admin_manifest',
      '/superadmin?tab=operations',
      true,
    ),
  ];

  const attention: ControlCenterAttentionItem[] = [];
  if (typeof onboarding.data.count === 'number' && onboarding.data.count > 0) {
    attention.push({
      id: 'pending-community-requests',
      severity: 'warning',
      title: 'Community requests waiting for review',
      detail: 'Pending verification or additional evidence requires operator review.',
      count: onboarding.data.count,
      href: '/superadmin?tab=communityRequests',
      kind: 'community_request',
      state: 'pending',
      time: onboarding.data.oldestCreatedAt ?? generatedAt,
      owner: 'community-reviewer',
      source: 'community_creation_requests',
    });
  }
  for (const job of jobs.data) {
    const stale = job.status === 'running' && now.getTime() - Date.parse(job.started_at) > 30 * 60_000;
    const idPrefix = stale ? 'stuck-job' : job.status === 'partial' ? 'partial-job' : 'job';
    attention.push({
      id: `${idPrefix}-${job.id}`,
      severity: job.status === 'error' || stale ? 'critical' : job.status === 'partial' ? 'warning' : 'info',
      title: stale
        ? 'Background job appears stuck'
        : job.status === 'error'
          ? 'Background job failed'
          : job.status === 'partial'
            ? 'Background job completed partially'
            : 'Background job is running',
      detail: `${job.job_id} · ${job.started_at}`,
      href: '/superadmin?tab=operations',
      kind: stale ? 'job_stuck' : job.status === 'error' ? 'job_failure' : job.status === 'partial' ? 'job_partial' : 'job_running',
      state: stale ? 'stale' : job.status,
      time: job.started_at,
      owner: 'integration-operator',
      source: 'platform_job_logs',
    });
  }
  if (databaseStatus !== 'healthy') {
    attention.push({
      id: 'database-partial',
      severity: databaseStatus === 'unavailable' ? 'critical' : 'warning',
      title: databaseStatus === 'unavailable' ? 'Database status unavailable' : 'Database status is incomplete',
      detail: 'One or more platform datasets could not be queried.',
      kind: 'data_availability',
      state: databaseStatus,
      time: generatedAt,
      owner: 'platform-admin',
      source: 'platform_metrics',
    });
  }
  for (const integration of gaps) {
    attention.push({
      id: `integration-gap-${integration.id}`,
      severity: 'critical',
      title: 'Critical integration requires attention',
      detail: `${integration.label} · ${integration.status}`,
      href: integration.actionHref,
      kind: 'integration_gap',
      state: integration.runtimeStatus === 'unavailable' ? 'unavailable' : integration.status,
      time: integration.lastCheckedAt ?? generatedAt,
      owner: 'integration-operator',
      source: integration.id,
    });
  }
  if (!audit.available) {
    attention.push({
      id: 'audit-collector-unavailable',
      severity: 'critical',
      title: 'Audit feed unavailable',
      detail: 'The latest platform audit events could not be loaded.',
      kind: 'security_visibility',
      state: audit.collectorState,
      time: audit.checkedAt,
      owner: 'security-operator',
      source: 'platform_audit_events',
    });
  }

  const release = releaseSnapshot(env);
  if (release.identityStatus !== 'match') {
    attention.push({
      id: `release-identity-${release.identityStatus ?? 'unknown'}`,
      severity: release.identityStatus === 'mismatch' || release.identityStatus === 'error' ? 'critical' : 'warning',
      title: release.identityStatus === 'mismatch'
        ? 'Web and backend release identities differ'
        : release.identityStatus === 'error'
          ? 'Release identity is malformed'
          : 'Release identity is incomplete',
      detail: 'Web and backend version, commit and manifest identity must be independently known.',
      kind: 'release_identity',
      state: release.identityStatus ?? 'unknown',
      time: generatedAt,
      owner: 'platform-admin',
      source: 'release_environment',
    });
  }

  const sections: ControlCenterSection[] = [
    {
      id: 'database',
      status: databaseStatus,
      ...(databaseStatus === 'healthy' ? {} : { message: 'Some database metrics are unavailable.' }),
    },
    { id: 'onboarding', status: sectionStatus(onboarding.available, Boolean(onboarding.data.count)) },
    { id: 'jobs', status: sectionStatus(jobs.available && failedJobs.available, jobs.data.length > 0 || Boolean(failedJobs.data)) },
    { id: 'audit', status: sectionStatus(audit.available) },
    {
      id: 'integrations',
      status: integrations.some(integration => ['missing', 'partial', 'degraded'].includes(integration.status))
        ? 'attention'
        : 'healthy',
    },
    { id: 'release', status: release.status },
  ];

  return {
    schemaVersion: CONTROL_CENTER_SCHEMA_VERSION,
    manifestFingerprint: CONTROL_CENTER_MANIFEST_FINGERPRINT,
    generatedAt,
    overallStatus: overallStatus(sections, integrations),
    summary,
    kpis,
    attention: sortAttention(attention),
    integrations,
    release,
    recentAudit: audit.data.events,
    sections,
  };
}

export async function getControlCenterSnapshot(
  env: NodeJS.ProcessEnv = process.env,
  now: Date = new Date(),
): Promise<ControlCenterResponse> {
  const generatedAt = now.toISOString();
  try {
    return await collectControlCenterSnapshot(createAdminClient(), env, now);
  } catch (error) {
    recordUnavailable('database:client', error);
    return unavailableSnapshot(env, generatedAt);
  }
}

export function parseAuditPageParameters(searchParams: URLSearchParams):
  | { ok: true; limit: number; cursor?: AuditPageCursor }
  | { ok: false } {
  const rawLimit = searchParams.get('limit');
  const parsedLimit = rawLimit === null ? 25 : Number(rawLimit);
  if (!Number.isSafeInteger(parsedLimit) || parsedLimit < 1) return { ok: false };
  const limit = Math.min(parsedLimit, 100);
  const rawCursor = searchParams.get('cursor')?.trim();
  const rawBefore = searchParams.get('before')?.trim();
  if (rawCursor && rawBefore) return { ok: false };
  if (rawCursor) {
    const cursor = decodeAuditCursor(rawCursor);
    return cursor ? { ok: true, limit, cursor } : { ok: false };
  }
  if (!rawBefore) return { ok: true, limit };
  const createdAt = safeIsoDate(rawBefore);
  if (createdAt) return { ok: true, limit, cursor: { createdAt } };
  const cursor = decodeAuditCursor(rawBefore);
  return cursor ? { ok: true, limit, cursor } : { ok: false };
}
