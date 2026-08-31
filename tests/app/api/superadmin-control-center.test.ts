import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONTROL_CENTER_MANIFEST_FINGERPRINT,
  CONTROL_CENTER_SCHEMA_VERSION,
  normalizeControlCenterResponse,
} from '@/lib/superadmin/control-center';
import {
  CONTROL_CENTER_MANIFEST_SEED,
  PLATFORM_ADMIN_MANIFEST,
} from '@/lib/superadmin/manifest';

const mocks = vi.hoisted(() => ({
  requirePlatformRead: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/superadmin/operator-authority', () => ({
  requirePlatformRead: mocks.requirePlatformRead,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { GET } from '@/app/api/superadmin/control-center/route';

type TableResult = {
  data?: unknown[] | null;
  count?: number | null;
  error?: unknown;
  pending?: boolean;
};

function query(result: TableResult) {
  const resolved = {
    data: result.data ?? null,
    count: result.count ?? null,
    error: result.error ?? null,
  };
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'in', 'eq', 'gte', 'order', 'limit', 'lt', 'or', 'abortSignal']) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = (
    resolve: (value: typeof resolved) => unknown,
    reject: (reason: unknown) => unknown,
  ) => result.pending
    ? new Promise(() => undefined)
    : Promise.resolve(resolved).then(resolve, reject);
  return chain;
}

function adminClient(results: Record<string, TableResult>) {
  const chains: Record<string, ReturnType<typeof query>> = {};
  return {
    from: vi.fn((table: string) => {
      const chain = query(results[table] ?? { data: [], count: 0 });
      chains[table] ??= chain;
      return chain;
    }),
    chains,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-30T12:00:00.000Z'));
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  mocks.requirePlatformRead.mockResolvedValue({ ok: true, context: { mode: 'operator' } });
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'never-return-this-service-secret');
  vi.stubEnv('GEODATA_ADDRESS_API_URL', 'https://address.example/v1');
  vi.stubEnv('GEODATA_ADDRESS_API_TOKEN', 'never-return-this-address-token');
  vi.stubEnv('BREVO_API_KEY', 'never-return-this-email-secret');
  vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'public-vapid-value');
  vi.stubEnv('VAPID_PRIVATE_KEY', 'never-return-this-push-secret');
  vi.stubEnv('VAPID_SUBJECT', 'mailto:ops@example.invalid');
  vi.stubEnv('STRIPE_SECRET_KEY', 'never-return-this-stripe-secret');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'never-return-this-webhook-secret');
  vi.stubEnv('STRIPE_PRICE_ID_ALAP_MONTHLY', 'price_alap');
  vi.stubEnv('STRIPE_PRICE_ID_PRO_MONTHLY', 'price_pro');
  vi.stubEnv('BKKFUTAR_API_KEY', 'never-return-this-bkk-secret');
  vi.stubEnv('TRANSIT_SYNC_SECRET', 'never-return-this-sync-secret');
  vi.stubEnv('AQICN_API_TOKEN', 'never-return-this-aqi-secret');
  vi.stubEnv('CRON_SECRET', 'never-return-this-cron-secret');
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('NEXT_PUBLIC_APP_VERSION', '0.10.7');
  vi.stubEnv('APP_VERSION', '0.10.7');
  vi.stubEnv('NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA', '0123456789abcdef0123456789abcdef01234567');
  vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '0123456789abcdef0123456789abcdef01234567');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('superadmin control-center API', () => {
  it('pins the shared frontend-backend contract fingerprint', () => {
    const digest = createHash('sha256').update(CONTROL_CENTER_MANIFEST_SEED).digest('hex');
    expect(CONTROL_CENTER_MANIFEST_FINGERPRINT).toBe(`sha256:${digest}`);
    for (const definition of [
      ...PLATFORM_ADMIN_MANIFEST.modules,
      ...PLATFORM_ADMIN_MANIFEST.integrations,
      ...PLATFORM_ADMIN_MANIFEST.jobs,
    ]) {
      expect(definition).toMatchObject({
        capability: expect.stringMatching(/^platform\./),
        scope: expect.any(String),
        criticality: expect.any(String),
        timeoutMs: expect.any(Number),
        freshnessMs: expect.any(Number),
        probeKind: expect.any(String),
        sideEffect: expect.any(String),
        runbook: expect.any(String),
        safeDeepLink: expect.stringMatching(/^\/superadmin(?:\?|$)/),
      });
    }
  });

  it('normalizes the previous read DTO without trusting unsafe enriched fields', () => {
    const normalized = normalizeControlCenterResponse({
      schemaVersion: CONTROL_CENTER_SCHEMA_VERSION,
      manifestFingerprint: CONTROL_CENTER_MANIFEST_FINGERPRINT,
      generatedAt: '2026-08-30T12:00:00.000Z',
      overallStatus: 'healthy',
      summary: { workspaces: 1, buildings: 1, units: 4, profiles: 4, agencies: 0 },
      attention: [{
        id: 'legacy-job',
        severity: 'warning',
        title: 'Legacy job',
        detail: 'Legacy detail',
        href: 'https://attacker.invalid/superadmin?tab=operations',
      }],
      integrations: [{ id: 'supabase', label: 'Supabase', status: 'configured' }],
      release: { environment: 'preview', version: '0.10.7', commitSha: '0123456789ab', status: 'healthy' },
      recentAudit: [{ id: 'legacy-audit', action: 'feature.update', createdAt: '2026-08-30T11:00:00.000Z' }],
      sections: [
        { id: 'database', status: 'healthy' },
        { id: 'onboarding', status: 'healthy' },
        { id: 'jobs', status: 'healthy' },
        { id: 'audit', status: 'healthy' },
        { id: 'integrations', status: 'healthy' },
        { id: 'release', status: 'healthy' },
      ],
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.kpis).toHaveLength(5);
    expect(normalized?.attention[0]).toMatchObject({
      kind: 'job',
      state: 'open',
      owner: 'platform-operator',
      source: 'legacy-control-center',
    });
    expect(normalized?.attention[0]?.href).toBeUndefined();
    expect(normalized?.release.identityStatus).toBe('unknown');
    expect(normalized?.recentAudit[0]).toMatchObject({
      outcome: 'unknown',
      supportMarker: false,
      recoveryMarker: false,
    });
  });

  it('authenticates before constructing the service-role client', async () => {
    mocks.requirePlatformRead.mockResolvedValue({
      ok: false,
      status: 401,
      errorCode: 'AUTH_REQUIRED',
      context: { mode: 'none' },
    });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.requirePlatformRead).toHaveBeenCalledWith('platform.overview.read');
  });

  it('returns a redacted platform snapshot from the canonical admin client', async () => {
    const client = adminClient({
      workspaces: { count: 12 },
      physical_buildings: { count: 14 },
      units: { count: 280 },
      profiles: { count: 190 },
      management_agency_details: { count: 7 },
      management_mandates: { count: 9 },
      community_creation_requests: { count: 3 },
      platform_job_logs: {
        count: 1,
        data: [
          {
            id: 'aaaaaaaa-1111-4111-8111-111111111111',
            job_id: 'announcement-delivery',
            status: 'error',
            started_at: '2026-08-30T10:00:00.000Z',
            result: { apiKey: 'never-return-this-service-secret' },
          },
          {
            id: 'cccccccc-3333-4333-8333-333333333333',
            job_id: 'stale-import',
            status: 'running',
            started_at: '2026-08-30T10:00:00.000Z',
          },
          {
            id: 'dddddddd-4444-4444-8444-444444444444',
            job_id: 'partial-import',
            status: 'partial',
            started_at: '2026-08-30T11:00:00.000Z',
          },
        ],
      },
      platform_audit_events: {
        data: [{
          id: 'bbbbbbbb-2222-4222-8222-222222222222',
          actor_id: 'admin.private@example.hu',
          action: 'feature.update',
          target_type: 'feature',
          target_id: 'private-target-id',
          outcome: 'succeeded',
          support_session_id: '99999999-9999-4999-8999-999999999999',
          payload: {
            recovery_marker: true,
            password: 'never-return-this-service-secret',
          },
          created_at: '2026-08-30T09:00:00.000Z',
        }],
      },
    });
    mocks.createAdminClient.mockReturnValue(client);

    const response = await GET();
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(body.schemaVersion).toBe(CONTROL_CENTER_SCHEMA_VERSION);
    expect(body.manifestFingerprint).toBe(CONTROL_CENTER_MANIFEST_FINGERPRINT);
    expect(body.summary).toEqual({
      workspaces: 12,
      buildings: 14,
      units: 280,
      profiles: 190,
      agencies: 7,
    });
    expect(body.integrations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'supabase',
        status: 'configured',
        runtimeStatus: 'healthy',
        freshnessState: 'fresh',
        latencyBucket: 'fast',
        probeKind: 'local_read',
        sideEffect: 'read',
      }),
      expect.objectContaining({
        id: 'google-oauth',
        status: 'unknown',
        runtimeStatus: 'unknown',
        freshnessState: 'not_applicable',
      }),
    ]));
    expect(body.release).toMatchObject({
      environment: 'preview',
      commitSha: '0123456789ab',
      identityStatus: 'match',
      web: {
        surface: 'web',
        state: 'known',
        commitSha: '0123456789abcdef0123456789abcdef01234567',
      },
      backend: {
        surface: 'backend',
        state: 'known',
        commitSha: '0123456789abcdef0123456789abcdef01234567',
      },
    });
    expect(body.recentAudit).toEqual([
      expect.objectContaining({
        action: 'feature.update',
        actor: 'operator',
        target: 'feature',
        targetId: 'private-target-id',
        outcome: 'succeeded',
        supportMarker: true,
        recoveryMarker: true,
      }),
    ]);
    expect(body.kpis).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'active_workspaces', value: 12, collectorState: 'ok' }),
      expect.objectContaining({ id: 'active_profiles', value: 190, freshnessState: 'fresh' }),
      expect.objectContaining({ id: 'active_mandates', value: 9 }),
      expect.objectContaining({ id: 'pending_community_requests', value: 3 }),
      expect.objectContaining({ id: 'failed_jobs_24h', value: 1 }),
      expect.objectContaining({ id: 'critical_integration_gaps', value: 0 }),
    ]));
    expect(body.attention).toContainEqual(expect.objectContaining({
      id: 'stuck-job-cccccccc-3333-4333-8333-333333333333',
      severity: 'critical',
      kind: 'job_stuck',
      state: 'stale',
      owner: 'integration-operator',
      source: 'platform_job_logs',
    }));
    expect(body.attention).toContainEqual(expect.objectContaining({
      id: 'partial-job-dddddddd-4444-4444-8444-444444444444',
      severity: 'warning',
      title: 'Background job completed partially',
    }));
    expect(client.chains.platform_job_logs.in).toHaveBeenCalledWith(
      'status',
      ['error', 'running', 'partial'],
    );
    expect(client.chains.platform_job_logs.gte).toHaveBeenCalledWith(
      'started_at',
      '2026-08-29T12:00:00.000Z',
    );
    expect(serialized).not.toContain('admin.private@example.hu');
    expect(serialized).not.toContain('never-return-this');
    expect(serialized).not.toContain('prefix');
    expect(serialized).not.toContain('length');
  });

  it('isolates one unavailable table without discarding the remaining snapshot', async () => {
    mocks.createAdminClient.mockReturnValue(adminClient({
      workspaces: { count: 2 },
      physical_buildings: { count: 2 },
      units: { error: { code: '42P01', message: 'raw-secret-database-message' } },
      profiles: { count: 4 },
      management_agency_details: { count: 1 },
      management_mandates: { count: 1 },
      community_creation_requests: { count: 0 },
      platform_job_logs: { data: [] },
      platform_audit_events: { data: [] },
    }));

    const response = await GET();
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.summary).toMatchObject({ workspaces: 2, units: null, profiles: 4 });
    expect(body.overallStatus).toBe('degraded');
    expect(body.sections).toContainEqual(expect.objectContaining({ id: 'database', status: 'degraded' }));
    expect(serialized).not.toContain('raw-secret-database-message');
  });

  it('bounds a stalled collector and preserves sibling KPI results', async () => {
    mocks.createAdminClient.mockReturnValue(adminClient({
      workspaces: { count: 2 },
      physical_buildings: { count: 2 },
      units: { pending: true },
      profiles: { count: 4 },
      management_agency_details: { count: 1 },
      management_mandates: { count: 1 },
      community_creation_requests: { count: 0 },
      platform_job_logs: { data: [], count: 0 },
      platform_audit_events: { data: [] },
    }));

    const responsePromise = GET();
    await vi.advanceTimersByTimeAsync(5_000);
    const response = await responsePromise;
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary).toMatchObject({ workspaces: 2, units: null, profiles: 4 });
    expect(body.kpis).toContainEqual(expect.objectContaining({
      id: 'units',
      value: null,
      collectorState: 'timeout',
      freshnessState: 'unknown',
    }));
    expect(body.overallStatus).toBe('degraded');
  });

  it('fails release identity visibly when independently supplied web and backend SHAs differ', async () => {
    vi.stubEnv('NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    mocks.createAdminClient.mockReturnValue(adminClient({
      workspaces: { count: 2 },
      physical_buildings: { count: 2 },
      units: { count: 4 },
      profiles: { count: 4 },
      management_agency_details: { count: 1 },
      management_mandates: { count: 1 },
      community_creation_requests: { count: 0 },
      platform_job_logs: { data: [], count: 0 },
      platform_audit_events: { data: [] },
    }));

    const response = await GET();
    const body = await response.json();

    expect(body.release).toMatchObject({ identityStatus: 'mismatch', status: 'degraded' });
    expect(body.sections).toContainEqual(expect.objectContaining({ id: 'release', status: 'degraded' }));
    expect(body.attention).toContainEqual(expect.objectContaining({
      id: 'release-identity-mismatch',
      kind: 'release_identity',
      state: 'mismatch',
    }));
    expect(body.overallStatus).toBe('degraded');
  });

  it('fails safely when the admin database client is not configured', async () => {
    mocks.createAdminClient.mockImplementation(() => {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY=never-return-this-service-secret');
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.overallStatus).toBe('unavailable');
    expect(body.summary).toEqual({
      workspaces: null,
      buildings: null,
      units: null,
      profiles: null,
      agencies: null,
    });
    expect(JSON.stringify(body)).not.toContain('never-return-this-service-secret');
  });
});
