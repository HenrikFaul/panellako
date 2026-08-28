import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const migration = readFileSync(
  join(root, 'supabase/migrations/20260828130000_announcement_delivery_worker.sql'),
  'utf8',
);
const route = readFileSync(
  join(root, 'app/api/cron/announcement-delivery/route.ts'),
  'utf8',
);
const worker = readFileSync(
  join(root, 'lib/announcement-delivery-worker.ts'),
  'utf8',
);

describe('announcement delivery worker database closure', () => {
  it('claims a bounded batch atomically with skip-locked leases', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.claim_announcement_delivery_batch');
    expect(migration).toContain('FOR UPDATE SKIP LOCKED');
    expect(migration).toContain('LIMIT v_limit');
    expect(migration).toContain("status = 'PROCESSING'");
    expect(migration).toContain('claim_token = gen_random_uuid()');
    expect(migration).toContain('claim_expires_at = v_now + make_interval');
    expect(migration).toContain('attempt_count = outbox.attempt_count + 1');
  });

  it('has retry, exponential backoff and a terminal dead-letter state', () => {
    expect(migration).toContain("'DEAD_LETTER'");
    expect(migration).toContain('POWER(2::numeric, GREATEST(v_attempt_count - 1, 0))');
    expect(migration).toContain("RETURN 'RETRY_SCHEDULED'");
    expect(migration).toContain("failure_code = COALESCE(outbox.failure_code, 'MAX_ATTEMPTS_EXHAUSTED')");
    expect(migration).toContain('dead_lettered_at = COALESCE(outbox.dead_lettered_at, v_now)');
  });

  it('rejects stub completion and makes every transition claim-token guarded and idempotent', () => {
    expect(migration).toContain("v_provider_message_id LIKE 'stub\\_%'");
    expect(migration.match(/outbox\.claim_token = p_claim_token/g)).toHaveLength(3);
    expect(migration).toContain("RETURN 'ALREADY_DELIVERED'");
    expect(migration).toContain("RETURN 'ALREADY_' || v_status");
    expect(migration).toContain("RETURN 'ALREADY_CANCELLED'");
  });

  it('exposes worker state transitions only to service_role', () => {
    expect(migration.match(/REVOKE ALL ON FUNCTION public\./g)).toHaveLength(4);
    expect(migration.match(/FROM PUBLIC, anon, authenticated/g)).toHaveLength(4);
    expect(migration.match(/TO service_role;/g)).toHaveLength(4);
    expect(migration).not.toMatch(/GRANT EXECUTE[\s\S]*TO authenticated/);
  });

  it('authenticates before constructing a service client and never trusts browser input for bounds', () => {
    expect(route).toContain("process.env.ANNOUNCEMENT_DELIVERY_CRON_SECRET");
    expect(route).toContain("request.headers.get('authorization')");
    expect(route).toContain('timingSafeEqual');
    expect(route).not.toContain('x-vercel-cron');
    expect(route).not.toContain("searchParams.get('secret')");
    expect(route.indexOf('isCronAuthorized')).toBeLessThan(route.indexOf('createClient(url, serviceRoleKey'));
    expect(route).not.toContain('request.json()');
  });

  it('resolves live profile and domain context server-side without logging PII', () => {
    expect(worker).toContain(".from('profiles')");
    expect(worker).toContain('notifications_email, unsubscribe_token, status');
    expect(worker).toContain(".from('announcements')");
    expect(worker).toContain(".from('buildings')");
    expect(worker).not.toContain('console.');
    expect(route).not.toContain('console.');
    expect(worker).not.toMatch(/console\.(?:log|error|warn)[\s\S]*recipient/i);
  });
});
