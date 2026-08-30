import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  CONTROL_CENTER_INTEGRATIONS,
  CONTROL_CENTER_MANIFEST_FINGERPRINT,
  CONTROL_CENTER_SCHEMA_VERSION,
  type ControlCenterAttentionItem,
  type ControlCenterAuditEvent,
  type ControlCenterAuditPage,
  type ControlCenterHealthStatus,
  type ControlCenterIntegration,
  type ControlCenterIntegrationId,
  type ControlCenterIntegrationStatus,
  type ControlCenterRelease,
  type ControlCenterResponse,
  type ControlCenterSection,
  type ControlCenterSummary,
} from '@/lib/superadmin/control-center';

type AdminClient = SupabaseClient;

interface QueryResult<T> {
  data: T;
  available: boolean;
}

interface JobRow {
  id: string;
  job_id: string;
  status: 'running' | 'error' | 'partial';
  started_at: string;
}

interface AuditPageCursor {
  createdAt: string;
  id?: string;
}

const EMPTY_SUMMARY: ControlCenterSummary = {
  workspaces: null,
  buildings: null,
  units: null,
  profiles: null,
  agencies: null,
};

const COUNT_TABLES = {
  workspaces: 'workspaces',
  buildings: 'physical_buildings',
  units: 'units',
  profiles: 'profiles',
  agencies: 'management_agency_details',
} as const satisfies Record<keyof ControlCenterSummary, string>;

const INTEGRATION_REQUIREMENTS: Readonly<Record<
  Exclude<ControlCenterIntegrationId, 'google-oauth' | 'cron'>,
  readonly string[]
>> = {
  supabase: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
  'address-registry': ['GEODATA_ADDRESS_API_URL', 'GEODATA_ADDRESS_API_TOKEN'],
  email: ['BREVO_API_KEY'],
  push: ['NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT'],
  stripe: [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_ID_ALAP_MONTHLY',
    'STRIPE_PRICE_ID_PRO_MONTHLY',
  ],
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

function hasConfiguredValue(env: NodeJS.ProcessEnv, key: string): boolean {
  return Boolean(env[key]?.trim());
}

function requiredConfigurationStatus(
  env: NodeJS.ProcessEnv,
  keys: readonly string[],
): ControlCenterIntegrationStatus {
  const configured = keys.reduce(
    (total, key) => total + Number(hasConfiguredValue(env, key)),
    0,
  );
  if (configured === keys.length) return 'configured';
  return configured === 0 ? 'missing' : 'partial';
}

function integrationSnapshot(
  env: NodeJS.ProcessEnv,
  checkedAt: string,
  databaseAvailable: boolean,
): ControlCenterIntegration[] {
  return CONTROL_CENTER_INTEGRATIONS.map((definition): ControlCenterIntegration => {
    let status: ControlCenterIntegrationStatus;
    if (definition.id === 'google-oauth') {
      // Provider state lives in the Supabase Auth control plane. Without a
      // privileged read-back channel the console must not infer it from UI code.
      status = 'unknown';
    } else if (definition.id === 'cron') {
      status = ['CRON_SECRET', 'ANNOUNCEMENT_DELIVERY_CRON_SECRET']
        .some(key => hasConfiguredValue(env, key))
        ? 'configured'
        : 'missing';
    } else {
      status = requiredConfigurationStatus(env, INTEGRATION_REQUIREMENTS[definition.id]);
    }

    if (definition.id === 'supabase' && status === 'configured' && !databaseAvailable) {
      status = 'degraded';
    }

    return {
      id: definition.id,
      label: definition.label,
      status,
      lastCheckedAt: checkedAt,
    };
  });
}

function safeReleaseToken(value: string | undefined, maximumLength = 120): string | undefined {
  const normalized = value?.trim();
  if (!normalized || normalized.length > maximumLength) return undefined;
  return /^[A-Za-z0-9._/-]+$/.test(normalized) ? normalized : undefined;
}

function releaseSnapshot(env: NodeJS.ProcessEnv): ControlCenterRelease {
  const rawEnvironment = safeReleaseToken(env.VERCEL_ENV ?? env.NODE_ENV, 32);
  const environment = rawEnvironment && ['production', 'preview', 'development', 'test'].includes(rawEnvironment)
    ? rawEnvironment
    : 'unknown';
  const rawSha = env.VERCEL_GIT_COMMIT_SHA?.trim();
  const commitSha = rawSha && /^[0-9a-f]{7,64}$/i.test(rawSha) ? rawSha.slice(0, 12) : undefined;
  const version = safeReleaseToken(env.NEXT_PUBLIC_APP_VERSION ?? env.npm_package_version, 40);
  const deploymentId = safeReleaseToken(env.VERCEL_DEPLOYMENT_ID, 120);
  const rawTimestamp = env.VERCEL_BUILD_TIMESTAMP?.trim();
  const timestamp = rawTimestamp ? Date.parse(rawTimestamp) : Number.NaN;
  const deployedAt = Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;

  return {
    environment,
    ...(version ? { version } : {}),
    ...(commitSha ? { commitSha } : {}),
    ...(deploymentId ? { deploymentId } : {}),
    ...(deployedAt ? { deployedAt } : {}),
    status: environment === 'unknown' || !version || !commitSha ? 'attention' : 'healthy',
  };
}

async function countTable(client: AdminClient, table: string): Promise<QueryResult<number | null>> {
  try {
    const { count, error } = await client
      .from(table)
      .select('id', { count: 'exact', head: true });
    if (error) {
      recordUnavailable(`count:${table}`, error);
      return { data: null, available: false };
    }
    return { data: count ?? 0, available: true };
  } catch (error) {
    recordUnavailable(`count:${table}`, error);
    return { data: null, available: false };
  }
}

async function countPendingOnboarding(client: AdminClient): Promise<QueryResult<number | null>> {
  try {
    const { count, error } = await client
      .from('community_creation_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['PENDING_VERIFICATION', 'NEEDS_EVIDENCE']);
    if (error) {
      recordUnavailable('onboarding:pending', error);
      return { data: null, available: false };
    }
    return { data: count ?? 0, available: true };
  } catch (error) {
    recordUnavailable('onboarding:pending', error);
    return { data: null, available: false };
  }
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

async function loadRecentProblemJobs(
  client: AdminClient,
  now: Date,
): Promise<QueryResult<JobRow[]>> {
  const since = new Date(now.getTime() - 24 * 60 * 60_000).toISOString();
  try {
    const { data, error } = await client
      .from('platform_job_logs')
      .select('id, job_id, status, started_at')
      .in('status', ['error', 'running', 'partial'])
      .gte('started_at', since)
      .order('started_at', { ascending: false })
      .limit(4);
    if (error) {
      recordUnavailable('jobs:recent', error);
      return { data: [], available: false };
    }
    return {
      data: Array.isArray(data) ? data.map(projectJobRow).filter((row): row is JobRow => Boolean(row)) : [],
      available: true,
    };
  } catch (error) {
    recordUnavailable('jobs:recent', error);
    return { data: [], available: false };
  }
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

function projectAuditRow(value: unknown): ControlCenterAuditEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const createdAt = safeIsoDate(row.created_at);
  if (!createdAt) return null;
  return {
    id: safeToken(row.id, 'unknown'),
    action: safeToken(row.action, 'unknown'),
    actor: typeof row.actor_id === 'string' && row.actor_id.trim() ? 'operator' : 'system',
    createdAt,
    ...(typeof row.target_type === 'string' && row.target_type.trim()
      ? { target: safeToken(row.target_type, 'resource') }
      : {}),
  };
}

export async function loadControlCenterAuditPage(
  client: AdminClient,
  limit: number,
  cursor?: AuditPageCursor,
): Promise<QueryResult<ControlCenterAuditPage>> {
  try {
    let query = client
      .from('platform_audit_events')
      .select('id, actor_id, action, target_type, created_at');
    if (cursor?.id) {
      query = query.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
      );
    } else if (cursor) {
      // Compatibility for the previous timestamp-only `before` parameter.
      query = query.lt('created_at', cursor.createdAt);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);
    if (error) {
      recordUnavailable('audit:page', error);
      return { data: { events: [], nextCursor: null }, available: false };
    }

    const events = Array.isArray(data)
      ? data.map(projectAuditRow).filter((row): row is ControlCenterAuditEvent => Boolean(row))
      : [];
    return {
      data: {
        events,
        nextCursor: events.length === limit
          ? encodeAuditCursor(events.at(-1) as ControlCenterAuditEvent)
          : null,
      },
      available: true,
    };
  } catch (error) {
    recordUnavailable('audit:page', error);
    return { data: { events: [], nextCursor: null }, available: false };
  }
}

function sectionStatus(available: boolean, hasAttention = false): ControlCenterHealthStatus {
  if (!available) return 'unavailable';
  return hasAttention ? 'attention' : 'healthy';
}

function overallStatus(
  sections: ControlCenterSection[],
  integrations: ControlCenterIntegration[],
): ControlCenterHealthStatus {
  const database = sections.find(section => section.id === 'database');
  if (database?.status === 'unavailable') return 'unavailable';
  if (sections.some(section => section.status === 'degraded' || section.status === 'unavailable')) {
    return 'degraded';
  }
  if (
    sections.some(section => section.status === 'attention')
    || integrations.some(integration => ['missing', 'partial', 'degraded'].includes(integration.status))
  ) {
    return 'attention';
  }
  return 'healthy';
}

function unavailableSnapshot(env: NodeJS.ProcessEnv, generatedAt: string): ControlCenterResponse {
  const integrations = integrationSnapshot(env, generatedAt, false);
  const release = releaseSnapshot(env);
  const sections: ControlCenterSection[] = [
    { id: 'database', status: 'unavailable', message: 'Database status is unavailable.' },
    { id: 'onboarding', status: 'unavailable', message: 'Onboarding status is unavailable.' },
    { id: 'jobs', status: 'unavailable', message: 'Job status is unavailable.' },
    { id: 'audit', status: 'unavailable', message: 'Audit status is unavailable.' },
    { id: 'integrations', status: 'attention' },
    { id: 'release', status: release.status },
  ];
  return {
    schemaVersion: CONTROL_CENTER_SCHEMA_VERSION,
    manifestFingerprint: CONTROL_CENTER_MANIFEST_FINGERPRINT,
    generatedAt,
    overallStatus: 'unavailable',
    summary: { ...EMPTY_SUMMARY },
    attention: [{
      id: 'database-unavailable',
      severity: 'critical',
      title: 'Database status unavailable',
      detail: 'The platform data service could not be queried.',
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
  const countEntries = Object.entries(COUNT_TABLES) as Array<[keyof ControlCenterSummary, string]>;
  const [countResults, onboarding, jobs, audit] = await Promise.all([
    Promise.all(countEntries.map(async ([key, table]) => [key, await countTable(client, table)] as const)),
    countPendingOnboarding(client),
    loadRecentProblemJobs(client, now),
    loadControlCenterAuditPage(client, 8),
  ]);

  const summary = countResults.reduce<ControlCenterSummary>(
    (current, [key, result]) => ({ ...current, [key]: result.data }),
    { ...EMPTY_SUMMARY },
  );
  const availableCount = countResults.filter(([, result]) => result.available).length;
  const databaseAvailable = availableCount > 0;
  const databaseStatus: ControlCenterHealthStatus = availableCount === 0
    ? 'unavailable'
    : availableCount === countResults.length
      ? 'healthy'
      : 'degraded';

  const attention: ControlCenterAttentionItem[] = [];
  if (typeof onboarding.data === 'number' && onboarding.data > 0) {
    attention.push({
      id: 'pending-community-requests',
      severity: 'warning',
      title: 'Community requests waiting for review',
      detail: 'Pending verification or additional evidence requires operator review.',
      count: onboarding.data,
      href: '/superadmin?tab=communityRequests',
    });
  }
  for (const job of jobs.data) {
    const staleRunning = job.status === 'running'
      && now.getTime() - Date.parse(job.started_at) > 30 * 60_000;
    const attentionKind = staleRunning
      ? 'stuck-job'
      : job.status === 'partial'
        ? 'partial-job'
        : 'job';
    attention.push({
      id: `${attentionKind}-${job.id}`,
      severity: job.status === 'error' || staleRunning
        ? 'critical'
        : job.status === 'partial'
          ? 'warning'
          : 'info',
      title: staleRunning
        ? 'Background job appears stuck'
        : job.status === 'error'
          ? 'Background job failed'
          : job.status === 'partial'
            ? 'Background job completed partially'
            : 'Background job is running',
      detail: `${job.job_id} · ${job.started_at}`,
      href: '/superadmin?tab=operations',
    });
  }
  if (databaseStatus !== 'healthy') {
    attention.push({
      id: 'database-partial',
      severity: databaseStatus === 'unavailable' ? 'critical' : 'warning',
      title: databaseStatus === 'unavailable' ? 'Database status unavailable' : 'Database status is incomplete',
      detail: 'One or more platform datasets could not be queried.',
    });
  }

  const integrations = integrationSnapshot(env, generatedAt, databaseAvailable);
  const release = releaseSnapshot(env);
  const integrationAttention = integrations.some(integration => integration.status !== 'configured' && integration.status !== 'unknown');
  const sections: ControlCenterSection[] = [
    { id: 'database', status: databaseStatus, ...(databaseStatus === 'healthy' ? {} : { message: 'Some database metrics are unavailable.' }) },
    { id: 'onboarding', status: sectionStatus(onboarding.available, Boolean(onboarding.data)) },
    { id: 'jobs', status: sectionStatus(jobs.available, jobs.data.length > 0) },
    { id: 'audit', status: sectionStatus(audit.available) },
    { id: 'integrations', status: integrationAttention ? 'attention' : 'healthy' },
    { id: 'release', status: release.status },
  ];

  return {
    schemaVersion: CONTROL_CENTER_SCHEMA_VERSION,
    manifestFingerprint: CONTROL_CENTER_MANIFEST_FINGERPRINT,
    generatedAt,
    overallStatus: overallStatus(sections, integrations),
    summary,
    attention,
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
  // Existing consumers may keep using `before` while persisting the newly
  // opaque cursor returned by the endpoint.
  const cursor = decodeAuditCursor(rawBefore);
  return cursor ? { ok: true, limit, cursor } : { ok: false };
}
