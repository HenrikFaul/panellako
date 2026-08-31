import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('superadmin command hardening invariants', () => {
  it('keeps manual jobs service-only, same-origin and body-bounded', () => {
    const route = source('app/api/superadmin/jobs/run/route.ts');

    expect(route).toContain("import { createAdminClient } from '@/lib/supabase/admin'");
    expect(route).toContain("requirePlatformMutation('platform.jobs.run')");
    expect(route).toContain('isSameOriginAdminRequest(request)');
    expect(route).toContain('readBoundedJson(request, 8 * 1024)');
    expect(route).toContain('normalizeAdminReason(body.reason)');
    expect(route).toContain('authority.context.operatorProfileId');
    expect(route).toContain("rpc('begin_platform_job_command'");
    expect(route).toContain("rpc('complete_platform_job_command'");
    expect(route).toContain("const PLATFORM_MUTATION_TARGET = 'platform:mutations'");
    expect(route).toContain('IDEMPOTENCY_KEY_REQUIRED');
    expect(route).toContain('JOB_IDEMPOTENCY_CONFLICT');
    expect(route).toContain("result.outcome === 'replayed'");
    expect(route).toContain('p_start_payload: context.requestPayload ?? {}');
    expect(route).toContain('sanitizeJobResponse');
    expect(route).toContain("headers: secret ? { Authorization: `Bearer ${secret}` } : undefined");
    expect(route).not.toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    expect(route).not.toContain('NEXT_SUPABASE_SERVICE_ROLE_KEY');
    expect(route).not.toContain('process.env.SUPERADMIN_EMAIL');
    expect(route).not.toContain('&secret=');

    const client = source('components/superadmin-client.tsx');
    const osmClient = source('components/superadmin-osm-import.tsx');
    const gtfsClient = source('components/superadmin-gtfs-import.tsx');
    expect(client).toContain('acquireAdminRequestKey(requestScope)');
    expect(client).toContain('if (isTerminalAdminCommandResponse(body)) releaseAdminRequestKey(requestScope)');
    expect(client).toContain('Megerősítés: indítás');
    expect(client).toContain('JSON.stringify({ job: jobId, idempotencyKey, reason })');
    expect(osmClient).toContain('acquireAdminRequestKey(requestScope)');
    expect(osmClient).toContain('if (isTerminalAdminCommandResponse(body)) releaseAdminRequestKey(requestScope)');
    expect(osmClient).toContain('Megerősítés: egész ország');
    expect(osmClient).toContain('reason: normalizedReason');
    expect(gtfsClient.match(/acquireAdminRequestKey\(/g)).toHaveLength(4);
    expect(gtfsClient.match(/releaseAdminRequestKey\(/g)).toHaveLength(4);
    expect(gtfsClient).toContain('acquireAdminRequestKey(batchIdScope)');
    expect(gtfsClient).toContain('acquireAdminRequestKey(requestKeyScope)');
    expect(gtfsClient).toContain('releaseAdminRequestKey(batchIdScope)');
    expect(gtfsClient).toContain('releaseAdminRequestKey(requestKeyScope)');
    expect(gtfsClient).toContain('const terminalBatchResponse = knownJson');
    expect(gtfsClient).toContain('isTerminalAdminCommandResponse(d1)');
    expect(gtfsClient).toContain('isTerminalAdminCommandResponse(d2)');
    expect(gtfsClient).toContain('Megerősítés: befejezés');
    expect(gtfsClient).toContain('reason: normalizedReason');
    expect(route).toContain("commandStatus: status");
    expect(route).toContain("ok: status === 'ok'");
    expect(route).toContain("status === 'partial' ? 207");
  });

  it('requires an audited confirmation without returning SQL or provider errors', () => {
    const route = source('app/api/superadmin/apply-migrations/route.ts');
    const client = source('components/superadmin-client.tsx');

    expect(route).toContain("const APPLY_CONFIRMATION = 'APPLY_PENDING_MIGRATIONS'");
    expect(route).toContain('isSameOrigin(request)');
    expect(route).toContain('readBoundedJson(request, 8 * 1024)');
    expect(route).toContain("requirePlatformMutation('platform.migrations.apply')");
    expect(route).toContain("'create_platform_command_approval'");
    expect(route).toContain("'authorize_platform_action'");
    expect(route).toContain('migration_sql_sha256');
    expect(route).toContain("'begin_platform_job_command'");
    expect(route).toContain("'complete_platform_job_command'");
    expect(route).toContain('PLATFORM_JOB_COMMAND_CONTRACT_VERSION');
    expect(route).toContain("command.outcome === 'replayed'");
    expect(route).toContain('migration_names: MIGRATIONS.map');
    expect(route).toContain("MIGRATIONS.find(migration => migration.name === 'platform_audit_events')");
    expect(route).not.toContain('manualSqlIfFailed');
    expect(route).not.toContain('rpcError?.message');

    expect(client).toContain("confirmation: 'APPLY_PENDING_MIGRATIONS'");
    expect(client).toContain('migrArmed');
    expect(client).not.toContain('manualSqlIfFailed');
  });

  it('keeps the runtime bootstrap SQL identical to the forward migration', () => {
    const migrationName = '20260830130000_platform_admin_job_commands.sql';
    const migration = source(`supabase/migrations/${migrationName}`).replace(/\r/g, '').trim();
    const runtime = source('lib/superadmin/platform-job-command-sql.ts');
    const embedded = runtime.match(/String\.raw`([\s\S]*)`;\s*$/)?.[1]?.replace(/\r/g, '').trim();

    expect(embedded).toBe(migration);
    expect(migration).toContain('for update skip locked');
    expect(migration).toContain('and started_at = command_row.log_started_at');
    expect(migration).toContain('get diagnostics affected_rows = row_count');
    expect(migration).toContain('public.begin_platform_job_command');
    expect(migration).toContain('public.complete_platform_job_command');
    expect(migration).toContain('public.expire_platform_job_commands');
    expect(migration).toContain("target_key = 'platform:mutations'");
    expect(migration).toContain('least(p_lease_seconds, 900)');
    expect(migration).toContain('request_payload jsonb');
    expect(migration.match(/prior_command\.request_payload = normalized_payload/g)).toHaveLength(2);
    expect(migration).toContain("'outcome', 'replayed'");
    expect(migration).toContain('revoke update, delete, truncate on table public.platform_audit_events from service_role');
    expect(migration).toContain('grant select, insert on table public.platform_audit_events to service_role');
    expect(migration).not.toContain('grant select, insert, update on table public.platform_audit_events to service_role');
    expect(migration).toContain('to service_role');

    const migrations = readdirSync(resolve(process.cwd(), 'supabase/migrations'));
    expect(migrations).toContain(migrationName);
    expect(migrations).not.toContain('20260830_platform_admin_job_commands.sql');
    expect(migrationName.localeCompare('20260830120000_shared_geodata_address_registry.sql')).toBeGreaterThan(0);
  });
});
