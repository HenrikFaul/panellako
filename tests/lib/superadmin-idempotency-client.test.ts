import { beforeEach, describe, expect, it } from 'vitest';
import {
  acquireAdminRequestKey,
  isTerminalAdminCommandResponse,
  releaseAdminRequestKey,
} from '@/lib/superadmin/idempotency-client';

describe('superadmin browser idempotency keys', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    releaseAdminRequestKey('job:test-a');
    releaseAdminRequestKey('job:test-b');
  });

  it('reuses one key until a known response releases it', () => {
    const first = acquireAdminRequestKey('job:test-a');
    const retry = acquireAdminRequestKey('job:test-a');

    expect(retry).toBe(first);
    expect(first).toMatch(/^[0-9a-f-]{36}$/i);

    releaseAdminRequestKey('job:test-a');
    expect(acquireAdminRequestKey('job:test-a')).not.toBe(first);
  });

  it('isolates keys by action scope', () => {
    expect(acquireAdminRequestKey('job:test-a')).not.toBe(acquireAdminRequestKey('job:test-b'));
  });

  it('retains uncertain receipts and releases terminal command outcomes', () => {
    expect(isTerminalAdminCommandResponse({
      ok: false,
      error: 'JOB_ALREADY_SUBMITTED',
      requestId: '11111111-1111-4111-8111-111111111111',
    })).toBe(false);
    expect(isTerminalAdminCommandResponse({
      ok: false,
      error: 'MIGRATION_AUDIT_INCOMPLETE',
      requestId: '11111111-1111-4111-8111-111111111111',
    })).toBe(false);
    expect(isTerminalAdminCommandResponse({
      error: 'GTFS_IMPORT_GUARD_UNAVAILABLE',
      requestId: '11111111-1111-4111-8111-111111111111',
    })).toBe(false);
    expect(isTerminalAdminCommandResponse({ ok: true, requestId: 'request-id' })).toBe(true);
    expect(isTerminalAdminCommandResponse({
      ok: false,
      replayed: true,
      commandStatus: 'error',
    })).toBe(true);
    expect(isTerminalAdminCommandResponse({ error: 'INVALID_JOB_REQUEST' })).toBe(true);
    expect(isTerminalAdminCommandResponse({})).toBe(false);
  });
});
