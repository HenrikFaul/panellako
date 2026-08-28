import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260828129000_agency_portfolio_workflow.sql'),
  'utf8',
);

const runtimeCanary = readFileSync(
  resolve(process.cwd(), 'tests/supabase/agency-portfolio-runtime-canary.sql'),
  'utf8',
);

function functionBlock(name: string): string {
  const marker = `CREATE OR REPLACE FUNCTION ${name}`;
  const start = migration.indexOf(marker);
  expect(start, `${name} must exist`).toBeGreaterThanOrEqual(0);
  const next = migration.indexOf('CREATE OR REPLACE FUNCTION ', start + marker.length);
  return migration.slice(start, next === -1 ? migration.length : next);
}

describe('management agency portfolio workflow migration', () => {
  it('binds every portfolio and grant edge to the same agency and workspace', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.agency_portfolio_assignments');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.agency_workspace_grants');
    expect(migration).toContain('FOREIGN KEY (workspace_id, mandate_id, agency_id)');
    expect(migration).toContain('REFERENCES public.management_mandates(workspace_id, id, agency_id)');
    expect(migration).toContain('FOREIGN KEY (agency_id, workspace_id, portfolio_assignment_id)');
    expect(migration).toContain(
      'REFERENCES public.agency_portfolio_assignments(agency_id, workspace_id, id)',
    );
    expect(migration).toContain('FOREIGN KEY (agency_id, organization_membership_id)');
    expect(migration).toContain('FOREIGN KEY (workspace_id, workspace_membership_id)');
    expect(migration).toContain('FOREIGN KEY (workspace_id, role_assignment_id)');
  });

  it('validates profile, assignment, role and delegation provenance before a grant exists', () => {
    const validator = functionBlock('private.validate_agency_workspace_grant');

    expect(migration).toContain('trg_agency_workspace_grants_validate');
    expect(validator).toContain('v_workspace_profile_id IS DISTINCT FROM v_organization_profile_id');
    expect(validator).toContain('assignment.agency_id = NEW.agency_id');
    expect(validator).toContain('assignment.workspace_id = NEW.workspace_id');
    expect(validator).toContain('delegation.source_mandate_id = v_assignment.mandate_id');
    expect(validator).toContain('delegation.can_redelegate = false');
    expect(validator).toContain('AGENCY_WORKSPACE_GRANT_PROVENANCE_INVALID');
  });

  it('keeps agency workflow tables FORCE-RLS default-deny and command-only', () => {
    for (const table of [
      'agency_staff_invitations',
      'agency_portfolio_assignments',
      'agency_workspace_grants',
    ]) {
      expect(migration).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
      expect(migration).toContain(`ALTER TABLE public.${table} FORCE ROW LEVEL SECURITY`);
      expect(migration).toContain(
        `REVOKE ALL ON TABLE public.${table} FROM PUBLIC, anon, authenticated, service_role`,
      );
      expect(migration).not.toContain(`GRANT SELECT ON TABLE public.${table} TO authenticated`);
    }
    expect(migration).not.toMatch(/CREATE POLICY\s+agency_/i);
  });

  it('keeps every private SECURITY DEFINER helper sealed with a fixed search path', () => {
    for (const name of [
      'private.validate_agency_workspace_grant',
      'private.require_agency_admin',
      'private.project_agency_staff_access',
      'private.revoke_agency_workspace_grant',
    ]) {
      const block = functionBlock(name);
      expect(block).toContain('SECURITY DEFINER');
      expect(block).toContain('SET search_path = pg_catalog, public, private');
      expect(block).toContain('FROM PUBLIC, anon, authenticated, service_role');
    }
  });

  it('maps agency staff only to limited tenant roles and forbids redelegation', () => {
    const mapping = functionBlock('private.agency_workspace_role');
    const projection = functionBlock('private.project_agency_staff_access');

    expect(mapping).toContain("WHEN 'ACCOUNTANT' THEN 'ACCOUNTANT'");
    for (const role of ['AGENCY_OWNER', 'AGENCY_ADMIN', 'PORTFOLIO_MANAGER', 'OPERATIONS']) {
      expect(mapping).toContain(`WHEN '${role}' THEN 'DELEGATE_OPERATIONS'`);
    }
    expect(mapping).not.toContain('COMMON_REPRESENTATIVE_ADMIN');
    expect(projection).toContain("'REMINDER_MANAGE', 'METER_MANAGE'");
    expect(projection).not.toContain('ROLE_GRANT_ADMIN');
    expect(projection).not.toContain('ROLE_GRANT_LIMITED');
    expect(projection).toContain("v_assignment.valid_to, false,");
    expect(migration).toContain("role_key IN ('DELEGATE_OPERATIONS', 'ACCOUNTANT')");
  });

  it('requires both agency administration and a current direct mandate for assignment', () => {
    const assignment = functionBlock('public.assign_agency_to_workspace');

    expect(assignment).toContain('private.require_agency_admin(v_actor, p_agency_id)');
    expect(assignment).toContain('JOIN public.membership_periods period');
    expect(assignment).toContain("role_assignment.role_key IN ('COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN', 'SELF_MANAGED_ADMIN')");
    expect(assignment).toContain('mandate.agency_id IS NULL');
    expect(assignment).toContain("mandate.verification_status = 'VERIFIED'");
    expect(assignment).toContain('role_assignment.valid_from <= now()');
    expect(assignment).toContain('(role_assignment.valid_to IS NULL OR role_assignment.valid_to > now())');
    expect(assignment).toContain('(mandate.valid_to IS NULL OR mandate.valid_to > now())');
    expect(assignment).toContain('DIRECT_ADMIN_GRANT_REQUIRED');
  });

  it('binds invitations to email, expiry and still-current issuer authority', () => {
    const issue = functionBlock('public.issue_agency_staff_invitation');
    const accept = functionBlock('public.accept_agency_staff_invitation');

    expect(issue).toContain("encode(digest(v_token, 'sha256'), 'hex')");
    expect(issue).toContain("SET status = 'EXPIRED'");
    expect(issue).toContain('AGENCY_STAFF_ALREADY_ACTIVE');
    expect(accept).toContain('v_invitation.invited_email_normalized <> v_actor_email');
    expect(accept).toContain('v_invitation.expires_at <= now()');
    expect(accept).toContain('membership.profile_id = v_invitation.invited_by_profile_id');
    expect(accept).toContain('INVITATION_GRANTOR_AUTHORITY_EXPIRED');
    expect(accept).toContain('AGENCY_STAFF_SUSPENDED');
    expect(accept).toContain('AGENCY_MEMBERSHIP_ROLE_CONFLICT');
  });

  it('uses payload fingerprints and rejects idempotency-key reuse across commands', () => {
    for (const name of [
      'public.create_management_agency',
      'public.issue_agency_staff_invitation',
      'public.assign_agency_to_workspace',
      'public.revoke_agency_staff_membership',
      'public.end_agency_portfolio_assignment',
    ]) {
      const block = functionBlock(name);
      expect(block).toContain('v_request_fingerprint');
      expect(block).toContain('IDEMPOTENCY_CONFLICT');
      expect(block).toContain('private.lock_idempotent_command');
    }
    expect(migration).toContain('request_fingerprint text NOT NULL');
    expect(migration).toContain('agency_revocation_fingerprint');
    expect(migration).toContain('end_request_fingerprint');
  });

  it('revokes normalized access, legacy projection, periods and stale invitations together', () => {
    const revokeGrant = functionBlock('private.revoke_agency_workspace_grant');
    const revokeStaff = functionBlock('public.revoke_agency_staff_membership');

    expect(revokeGrant).toContain("SET status = 'REVOKED'");
    expect(revokeGrant).toContain('private.project_legacy_workspace_role');
    expect(revokeGrant).toContain(
      '(v_grant.workspace_membership_created OR v_grant.workspace_membership_activated)',
    );
    expect(revokeGrant).toContain("SET status = 'ENDED'");
    expect(revokeGrant).toContain('started_at + interval \'1 microsecond\'');
    expect(revokeStaff).toContain('public.agency_staff_invitations');
    expect(revokeStaff).toContain("SET status = 'REVOKED', revoked_at = clock_timestamp()");
    expect(revokeStaff).toContain('AGENCY_OWNER_REVOCATION_FORBIDDEN');
  });

  it('uses current temporal authority and closes assignment plus mandate atomically', () => {
    const end = functionBlock('public.end_agency_portfolio_assignment');

    expect(end).toContain('membership.valid_from <= now()');
    expect(end).toContain('(membership.valid_to IS NULL OR membership.valid_to > now())');
    expect(end).toContain('role_assignment.valid_from <= now()');
    expect(end).toContain('(role_assignment.valid_to IS NULL OR role_assignment.valid_to > now())');
    expect(end).toContain('mandate.valid_from <= now()');
    expect(end).toContain('(mandate.valid_to IS NULL OR mandate.valid_to > now())');
    expect(end).toContain('private.revoke_agency_workspace_grant');
    expect(end).toContain("SET status = 'REVOKED', verification_status = 'ENDED'");
    expect(end).toContain('end_request_fingerprint = v_request_fingerprint');
  });

  it('requires fresh AAL2 for every agency state-changing public command', () => {
    for (const name of [
      'public.create_management_agency',
      'public.issue_agency_staff_invitation',
      'public.accept_agency_staff_invitation',
      'public.assign_agency_to_workspace',
      'public.revoke_agency_staff_membership',
      'public.end_agency_portfolio_assignment',
    ]) {
      expect(functionBlock(name)).toContain("private.require_recent_aal2(interval '15 minutes')");
    }
  });

  it('ships a runtime canary with positive lifecycle and negative isolation probes', () => {
    expect(runtimeCanary).toContain('agency create -> assignment -> invitation/accept -> projection');
    expect(runtimeCanary).toContain('cross-tenant portfolio assignment unexpectedly succeeded');
    expect(runtimeCanary).toContain('revoked inviter invitation unexpectedly succeeded');
    expect(runtimeCanary).toContain('expired direct admin unexpectedly ended the portfolio');
    expect(runtimeCanary).toContain('agency membership alone granted tenant access');
    expect(runtimeCanary).toContain('agency portfolio runtime canary PASS');
  });
});
