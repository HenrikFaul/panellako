import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260829130000_invitation_join_lifecycle.sql',
  ),
  'utf8',
);

const runtimeCanary = readFileSync(
  resolve(
    process.cwd(),
    'tests/supabase/invitation-join-lifecycle-runtime-canary.sql',
  ),
  'utf8',
);

function functionBlock(name: string): string {
  const marker = `CREATE OR REPLACE FUNCTION ${name}`;
  const start = migration.indexOf(marker);
  expect(start, `${name} must exist`).toBeGreaterThanOrEqual(0);
  const next = migration.indexOf('CREATE OR REPLACE FUNCTION ', start + marker.length);
  return migration.slice(start, next === -1 ? migration.length : next);
}

describe('invitation and join-request lifecycle migration', () => {
  it('ships a rollback-only self-contained PostgreSQL runtime canary', () => {
    expect(runtimeCanary).toContain('\\set ON_ERROR_STOP on');
    expect(runtimeCanary.trim()).toMatch(
      /^\\set ON_ERROR_STOP on[\s\S]*BEGIN;[\s\S]*ROLLBACK;[\s\S]*runtime canary PASS/,
    );
    expect(runtimeCanary).toContain('INSERT INTO auth.users');
    expect(runtimeCanary).toContain('SELECT private.bootstrap_profile');
    expect(runtimeCanary).toContain('INSERT INTO public.workspaces');
    expect(runtimeCanary).toContain('INSERT INTO public.management_mandates');
    expect(runtimeCanary).toContain('INSERT INTO public.role_assignments');
  });

  it('runtime-checks the success and denial paths of every lifecycle command', () => {
    for (const command of [
      'public.revoke_membership_invitation',
      'public.cancel_join_request',
      'public.resubmit_join_request_evidence',
      'public.list_my_join_requests',
    ]) {
      expect(runtimeCanary).toContain(command);
    }

    for (const invariant of [
      'JOIN_REQUEST_VERSION_CONFLICT',
      'JOIN_REQUEST_COUNTER_OFFER_PENDING',
      'JOIN_REQUEST_NOT_CANCELLABLE',
      'JOIN_REQUEST_EVIDENCE_NOT_AVAILABLE',
      'MEMBERSHIP_INVITATION_NOT_REVOCABLE',
      'MEMBERSHIP_INVITATION_REVOKED',
      'JOIN_REQUEST_CANCELLED',
      'JOIN_REQUEST_EVIDENCE_RESUBMITTED',
    ]) {
      expect(runtimeCanary).toContain(invariant);
    }

    expect(runtimeCanary).toContain("invitation.status = 'REVOKED'");
    expect(runtimeCanary).toContain("request.status = 'CANCELLED'");
    expect(runtimeCanary).toContain("request.status = 'PENDING'");
    expect(runtimeCanary).toContain('request.version = 3');
    expect(runtimeCanary).toContain('JOIN public.join_request_evidence_events evidence');
  });

  it('is forward-only and safe to reapply', () => {
    expect(migration.trim()).toMatch(/^--[\s\S]*BEGIN;[\s\S]*COMMIT;$/);
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS revoked_at timestamptz');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS cancelled_at timestamptz');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.join_request_evidence_events');
    expect(migration).toContain('CREATE INDEX IF NOT EXISTS join_request_evidence_events_request_idx');
    expect(migration).toContain("WHERE conname = 'membership_invitations_revoked_by_fk'");
    expect(migration).toContain("WHERE conname = 'join_requests_workspace_id_id_uq'");
    expect(migration).toContain("WHERE conname = 'join_requests_workspace_id_id_requester_uq'");
    expect(migration).toContain('DROP TRIGGER IF EXISTS trg_join_request_evidence_events_immutable');
    expect(migration).toContain('DROP POLICY IF EXISTS join_request_evidence_events_scoped_select');
  });

  it('stores complete invitation revocation and join cancellation provenance', () => {
    expect(migration).toContain('revoked_by_profile_id uuid');
    expect(migration).toContain('revocation_reason text');
    expect(migration).toContain('membership_invitations_revocation_shape_check');
    expect(migration).toContain('cancelled_by_profile_id uuid');
    expect(migration).toContain('cancellation_reason text');
    expect(migration).toContain('join_requests_cancellation_shape_check');
    expect(migration).toContain("revocation_reason = COALESCE(NULLIF(BTRIM(revocation_reason), ''), 'LEGACY_REVOKED')");
    expect(migration).toContain("cancellation_reason = COALESCE(NULLIF(BTRIM(cancellation_reason), ''), 'LEGACY_CANCELLED')");
  });

  it('keeps evidence history immutable, tenant-scoped and RPC-only', () => {
    expect(migration).toContain('FOREIGN KEY (workspace_id, join_request_id, requester_profile_id)');
    expect(migration).toContain(
      'REFERENCES public.join_requests(workspace_id, id, requester_profile_id) ON DELETE RESTRICT',
    );
    expect(migration).toContain('UNIQUE (requester_profile_id, idempotency_key)');
    expect(migration).toContain('private.is_valid_opaque_evidence_references(evidence_references)');
    expect(migration).toContain('ALTER TABLE public.join_request_evidence_events FORCE ROW LEVEL SECURITY');
    expect(migration).toContain("private.has_workspace_capability(auth.uid(), workspace_id, 'MEMBERSHIP_REVIEW')");
    expect(migration).toContain('BEFORE UPDATE OR DELETE ON public.join_request_evidence_events');
    expect(migration).toContain('JOIN_REQUEST_EVIDENCE_EVENT_IMMUTABLE');
    expect(migration).toContain('REVOKE ALL ON TABLE public.join_request_evidence_events');
    expect(migration).not.toMatch(
      /CREATE POLICY join_request_evidence_events_[\s\S]*?FOR (INSERT|UPDATE|DELETE) TO authenticated/i,
    );
  });

  it('appends the authoritative version to the existing requester list contract', () => {
    const list = functionBlock('public.list_my_join_requests');

    expect(migration).toContain('DROP FUNCTION IF EXISTS public.list_my_join_requests()');
    expect(list).toMatch(
      /latest_counter_offer_accepted boolean,\s*request_version integer\s*\)/,
    );
    expect(list).toMatch(/END,\s*jr\.version\s+FROM public\.join_requests jr/);
    expect(list).toContain('jr.requester_profile_id = auth.uid()');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.list_my_join_requests()');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.list_my_join_requests()');
  });

  it('revokes only a locked pending invitation with capability, fresh AAL2, idempotency and audit', () => {
    const revoke = functionBlock('public.revoke_membership_invitation');

    expect(revoke).toContain('p_invitation_id uuid');
    expect(revoke).toContain('FOR UPDATE');
    expect(revoke).toContain("'MEMBERSHIP_INVITE'");
    expect(revoke).toContain('private.require_workspace_capability');
    expect(revoke).toContain("private.require_recent_aal2(interval '15 minutes')");
    expect(revoke).toContain("'revoke_membership_invitation'");
    expect(revoke).toContain('private.lock_idempotent_command');
    expect(revoke).toContain('IDEMPOTENCY_CONFLICT');
    expect(revoke).toContain("v_invitation.status <> 'PENDING'");
    expect(revoke).toContain("SET status = 'REVOKED'");
    expect(revoke).toContain('revoked_by_profile_id = v_actor');
    expect(revoke).toContain('MEMBERSHIP_INVITATION_REVOKED');
    expect(revoke).toContain('private.record_idempotent_command');
    expect(revoke).toContain('private.write_authorization_event');
    expect(revoke).not.toMatch(/token_hash|invitation_token/i);
  });

  it('lets only the requester cancel an active request with row locking and optimistic concurrency', () => {
    const cancel = functionBlock('public.cancel_join_request');

    expect(cancel).toContain('p_expected_version integer');
    expect(cancel).toContain('jr.requester_profile_id = v_actor');
    expect(cancel).toContain('FOR UPDATE');
    expect(cancel).toContain("v_request.status NOT IN ('DRAFT', 'PENDING', 'NEEDS_EVIDENCE')");
    expect(cancel).toContain('v_request.version <> p_expected_version');
    expect(cancel).toContain('JOIN_REQUEST_VERSION_CONFLICT');
    expect(cancel).toContain("'cancel_join_request'");
    expect(cancel).toContain('IDEMPOTENCY_CONFLICT');
    expect(cancel).toContain("SET status = 'CANCELLED'");
    expect(cancel).toContain('cancelled_by_profile_id = v_actor');
    expect(cancel).toContain('JOIN_REQUEST_CANCELLED');
    expect(cancel).not.toContain('private.require_workspace_capability');
  });

  it('resubmits bounded opaque evidence only from NEEDS_EVIDENCE', () => {
    const validate = functionBlock('private.is_valid_opaque_evidence_references');
    const resubmit = functionBlock('public.resubmit_join_request_evidence');

    expect(validate).toContain('CARDINALITY(p_references) BETWEEN 1 AND 10');
    expect(validate).toContain("'^[a-z][a-z0-9_-]{1,31}:[A-Za-z0-9][A-Za-z0-9._~:/#-]{1,190}$'");
    expect(resubmit).toContain('p_evidence_references text[]');
    expect(resubmit).toContain('jr.requester_profile_id = v_actor');
    expect(resubmit).toContain('FOR UPDATE');
    expect(resubmit).toContain("v_request.status <> 'NEEDS_EVIDENCE'");
    expect(resubmit).toContain('v_request.version <> p_expected_version');
    expect(resubmit).toContain('JOIN_REQUEST_VERSION_CONFLICT');
    expect(resubmit).toContain("v_latest_review_event = 'COUNTER_OFFER'");
    expect(resubmit).toContain('JOIN_REQUEST_COUNTER_OFFER_PENDING');
    expect(resubmit).toContain('INSERT INTO public.join_request_evidence_events');
    expect(resubmit).toContain("SET status = 'PENDING'");
    expect(resubmit).toContain('version = v_next_version');
    expect(resubmit).toContain('reviewer_profile_id = NULL');
    expect(resubmit).toContain("'resubmit_join_request_evidence'");
    expect(resubmit).toContain('IDEMPOTENCY_CONFLICT');
    expect(resubmit).toContain('JOIN_REQUEST_EVIDENCE_RESUBMITTED');
  });

  it('exposes only the intended authenticated RPC contracts', () => {
    const signatures = [
      'public.list_my_join_requests()',
      'public.revoke_membership_invitation(uuid, text, uuid)',
      'public.cancel_join_request(uuid, integer, text, uuid)',
      'public.resubmit_join_request_evidence(uuid, integer, text[], text, uuid)',
    ];

    for (const signature of signatures) {
      expect(migration).toContain(`REVOKE ALL ON FUNCTION ${signature}`);
      expect(migration).toContain(`GRANT EXECUTE ON FUNCTION ${signature}`);
    }
    expect(migration.match(/TO authenticated;/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });
});
