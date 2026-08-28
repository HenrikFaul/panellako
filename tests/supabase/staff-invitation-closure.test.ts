import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260828123000_staff_invitation_closure.sql'),
  'utf8',
);
const contentAudience = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260828124000_content_audience_closure.sql'),
  'utf8',
);
const voteIntegrity = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260828125000_vote_integrity_closure.sql'),
  'utf8',
);

function functionBlock(name: string): string {
  const marker = `CREATE OR REPLACE FUNCTION ${name}`;
  const start = migration.indexOf(marker);
  expect(start, `${name} must exist`).toBeGreaterThanOrEqual(0);
  const next = migration.indexOf('CREATE OR REPLACE FUNCTION ', start + marker.length);
  return migration.slice(start, next === -1 ? migration.length : next);
}

describe('workspace staff invitation closure', () => {
  it('keeps the new invitation table default-deny and command-only', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.workspace_staff_invitations');
    expect(migration).toContain('ALTER TABLE public.workspace_staff_invitations ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('ALTER TABLE public.workspace_staff_invitations FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('REVOKE ALL ON TABLE public.workspace_staff_invitations FROM PUBLIC, anon, authenticated');
    expect(migration).not.toMatch(/CREATE POLICY workspace_staff_invitations_[\s\S]*?FOR (INSERT|UPDATE|DELETE) TO authenticated/i);
  });

  it('creates a unit-free neutral membership before the explicit staff role', () => {
    const accept = functionBlock('public.accept_workspace_staff_invitation');

    expect(accept).toContain("v_invitation.workspace_id, v_actor, 'ACTIVE', 'INVITATION'");
    expect(accept).toContain('v_invitation.created_by_profile_id, NULL');
    expect(accept).toContain("'STAFF_INVITATION_ACCEPTED'");
    expect(accept).toContain('source_staff_invitation_id');
    expect(accept).not.toContain('INSERT INTO public.unit_ownerships');
    expect(accept).not.toContain('INSERT INTO public.unit_occupancies');
    expect(accept).not.toContain('private.project_legacy_relationship');
  });

  it('binds acceptance to the authenticated email, expiry and one pending token', () => {
    const accept = functionBlock('public.accept_workspace_staff_invitation');

    expect(accept).toContain("v_invitation.status <> 'PENDING'");
    expect(accept).toContain('v_invitation.expires_at <= now()');
    expect(accept).toContain('v_invitation.invited_email_normalized <> v_email');
    expect(accept).toContain('STAFF_INVITATION_NOT_ACCEPTABLE');
    expect(accept).toContain("SET status = 'ACCEPTED'");
    expect(accept).toContain("AND status = 'PENDING'");
  });

  it('makes issue and accept idempotent while rejecting token replay under another key', () => {
    const issue = functionBlock('public.issue_workspace_staff_invitation');
    const accept = functionBlock('public.accept_workspace_staff_invitation');

    expect(issue).toContain("'issue_workspace_staff_invitation'");
    expect(issue).toContain('request_fingerprint');
    expect(issue).toContain('IDEMPOTENCY_CONFLICT');
    expect(accept).toContain("'accept_workspace_staff_invitation'");
    expect(accept).toContain('private.record_idempotent_command');
    expect(accept).toContain("v_invitation.status <> 'PENDING'");
  });

  it('forbids admin roles and privilege amplification', () => {
    const normalize = functionBlock('private.normalize_staff_invitation_capabilities');
    const issue = functionBlock('public.issue_workspace_staff_invitation');
    const accept = functionBlock('public.accept_workspace_staff_invitation');

    for (const role of ['DELEGATE_OPERATIONS', 'COMMITTEE_OVERSIGHT', 'ACCOUNTANT', 'BILLING_ADMIN']) {
      expect(migration).toContain(`'${role}'`);
    }
    expect(normalize).toContain('ADMIN_ROLE_STAFF_INVITATION_FORBIDDEN');
    expect(normalize).not.toContain("'COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN') THEN");
    expect(normalize).toContain('STAFF_ROLE_CAPABILITY_AMPLIFICATION_FORBIDDEN');
    expect(normalize).toContain('NOT private.has_workspace_capability');
    expect(issue).toContain("private.require_workspace_capability(p_workspace_id, 'ROLE_GRANT_LIMITED')");
    expect(issue).toContain("private.require_recent_aal2(interval '15 minutes')");
    expect(accept).toContain('requested.internal_key NOT IN');
    expect(accept).toContain('NOT private.has_workspace_capability');
  });

  it('revalidates a same-workspace verified mandate and never trusts agency membership', () => {
    const issue = functionBlock('public.issue_workspace_staff_invitation');
    const accept = functionBlock('public.accept_workspace_staff_invitation');

    expect(migration).toContain('FOREIGN KEY (workspace_id, grantor_membership_id)');
    expect(migration).toContain('FOREIGN KEY (workspace_id, source_mandate_id)');
    expect(migration).toContain('FOREIGN KEY (workspace_id, source_staff_invitation_id)');
    expect(issue).toContain("mm.verification_status = 'VERIFIED'");
    expect(accept).toContain('ra.source_mandate_id = v_invitation.source_mandate_id');
    expect(accept).toContain("mm.verification_status = 'VERIFIED'");
    expect(issue).not.toContain('organization_memberships');
    expect(accept).not.toContain('organization_memberships');
  });

  it('materializes an explicit non-redelegable delegation and the narrow legacy projection', () => {
    const accept = functionBlock('public.accept_workspace_staff_invitation');

    expect(accept).toContain('INSERT INTO public.delegations');
    expect(accept).toContain("false, 'STAFF_INVITATION_ACCEPTED'");
    expect(accept).toContain('INSERT INTO public.role_assignments');
    expect(accept).toContain('private.project_legacy_workspace_role');
    expect(accept).toContain('v_invitation.role_key');
    expect(migration).toContain('DELEGATE_OPERATIONS maps narrowly to legacy megbizott');
  });

  it('preserves the existing invitation URL by dispatching staff tokens compatibly', () => {
    const compatibility = functionBlock('public.accept_membership_invitation');

    expect(compatibility).toContain('public.workspace_staff_invitations');
    expect(compatibility).toContain('public.accept_workspace_staff_invitation');
    expect(compatibility).toContain('private.upsert_legacy_membership_projection');
    expect(compatibility).not.toContain('private.project_legacy_relationship');
  });

  it('stores immutable resident-invitation authority provenance and rejects owner self-invites', () => {
    const issue = functionBlock('public.issue_membership_invitation');

    expect(migration).toContain('ADD COLUMN IF NOT EXISTS grantor_membership_id uuid');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS source_mandate_id uuid');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS source_delegation_id uuid');
    expect(migration).toContain('trg_membership_invitations_provenance_immutable');
    expect(issue).toContain("p_relationship_type IN ('OWNER', 'OWNER_OCCUPANT')");
    expect(issue).toContain('OWNER_SELF_INVITATION_FORBIDDEN');
    expect(issue).toContain("mm.verification_status = 'VERIFIED'");
    expect(issue).not.toContain('organization_memberships');
  });

  it('denies resident invitation acceptance after mandate or delegation authority is revoked', () => {
    const accept = functionBlock('public.accept_membership_invitation');

    expect(accept).toContain('v_invitation.grantor_membership_id IS NULL');
    expect(accept).toContain("'MEMBERSHIP_INVITE'");
    expect(accept).toContain("mm.verification_status = 'VERIFIED'");
    expect(accept).toContain("d.status = 'ACTIVE'");
    expect(accept).toContain('admin_assignment.source_mandate_id');
    expect(accept).toContain('delegate_assignment.source_delegation_id');
    expect(accept).toContain('INVITATION_GRANTOR_AUTHORITY_EXPIRED');
  });

  it('keeps unverified owner claims out of owner finance, documents and votes', () => {
    const finance = functionBlock('private.can_read_verified_unit_finance');
    const relationships = functionBlock('private.relationship_labels');

    expect(finance).toContain("uo.status = 'VERIFIED'");
    expect(migration).toContain('private.can_read_verified_unit_finance(workspace_id, unit_id)');
    expect(relationships).toContain("uo.status = 'VERIFIED'");
    expect(contentAudience).toContain("WHEN 'OWNERS' THEN");
    expect(contentAudience).toContain('private.has_verified_owner_relationship');
    expect(contentAudience).toContain("uo.status = 'VERIFIED'");
    expect(voteIntegrity).toContain('private.has_verified_owner_relationship(v_actor, p_workspace_id, p_unit_id)');
    expect(voteIntegrity).toContain('VERIFIED_VOTE_ENTITLEMENT_REQUIRED');
  });
});
