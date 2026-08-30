import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260829110000_workspace_relationship_registry.sql',
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

describe('workspace relationship registry migration', () => {
  it('adds immutable command receipts and transition histories', () => {
    for (const table of [
      'workspace_person_relationship_commands',
      'unit_relationship_status_events',
      'workspace_membership_status_events',
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
      expect(migration).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
      expect(migration).toContain(`ALTER TABLE public.${table} FORCE ROW LEVEL SECURITY`);
    }

    expect(migration).toContain('workspace_person_relationship_commands_shape_check');
    expect(migration).toContain('unit_relationship_status_events_shape_check');
    expect(migration).toContain('workspace_membership_status_events_membership_fk');
    expect(migration).toContain('private.reject_workspace_registry_history_mutation()');
    expect(migration).toContain('WORKSPACE_REGISTRY_HISTORY_IMMUTABLE');
    expect(migration).not.toMatch(
      /GRANT\s+(?:INSERT|UPDATE|DELETE|ALL)[^;]*workspace_(?:person_relationship_commands|membership_status_events)[^;]*authenticated/i,
    );
  });

  it('creates account-independent verified people and repeatable multi-unit links', () => {
    const create = functionBlock('public.create_workspace_person_relationship');

    expect(create).toContain('p_person_id uuid');
    expect(create).toContain('p_display_name text');
    expect(create).toContain('p_unit_id uuid');
    expect(create).toContain('p_relationship_type text');
    expect(create).toContain("private.require_workspace_capability(p_workspace_id, 'UNIT_RELATION_VERIFY')");
    expect(create).toContain("private.require_recent_aal2(interval '15 minutes')");
    expect(create).toContain('INSERT INTO public.parties');
    expect(create).toContain('INSERT INTO public.people');
    expect(create).not.toContain('INSERT INTO public.person_account_links');
    expect(create).toContain('INSERT INTO public.unit_ownerships');
    expect(create).toContain('INSERT INTO public.unit_occupancies');
    expect(create).toContain("'VERIFIED'");
    expect(create).toContain("'WORKSPACE_ADMIN_REVIEW'");
    expect(create).toContain('PERSON_SCOPE_MISMATCH');
    expect(create).toContain('RELATIONSHIP_EVIDENCE_REQUIRED');
    expect(create).toContain(
      "v_evidence_reference !~ '^[a-z][a-z0-9_-]{1,39}:[A-Za-z0-9][A-Za-z0-9._~:/#-]{1,190}$'",
    );
    expect(create).toContain("'create_workspace_person_relationship'");
    expect(create).toContain('IDEMPOTENCY_PAYLOAD_MISMATCH');
    expect(create).toContain('workspace_person_relationship_commands');
    expect(create).toContain('private.reconcile_legacy_person_relationships');
  });

  it('serializes and caps verified ownership shares at one whole unit', () => {
    const guard = functionBlock('private.enforce_verified_unit_ownership_share');
    const create = functionBlock('public.create_workspace_person_relationship');

    expect(guard).toContain('FOR UPDATE');
    expect(guard).toContain("ownership.status = 'VERIFIED'");
    expect(guard).toContain('OWNERSHIP_SHARE_REQUIRED');
    expect(guard).toContain('OWNERSHIP_TYPE_SHARE_MISMATCH');
    expect(guard).toContain('OWNERSHIP_SHARE_EXCEEDED');
    expect(migration).toContain('unit_ownerships_verified_share_guard');
    expect(migration).toContain('OWNERSHIP_SHARE_DATA_CONFLICT');
    expect(create).toContain('An explicit ownership share is required');
    expect(create).not.toContain('v_share_numerator := 1');
  });

  it('returns the detailed tenant registry only to relationship verifiers', () => {
    const list = functionBlock('public.list_workspace_unit_relationships');

    expect(list).toMatch(/relationship_kind text[\s\S]*relationship_id uuid/i);
    expect(list).toMatch(/subject_party_id uuid[\s\S]*person_id uuid[\s\S]*profile_id uuid/i);
    expect(list).toContain("'UNIT_RELATION_VERIFY'");
    expect(list).not.toContain("'MEMBER_DIRECTORY_READ'");
    expect(list).toContain('IF NOT v_can_verify THEN');
    expect(list).toContain('CASE WHEN v_can_verify THEN ownership.evidence_reference ELSE NULL END');
    expect(list).toContain('CASE WHEN v_can_verify THEN occupancy.evidence_reference ELSE NULL END');
    expect(list).toContain('ownership.workspace_id = p_workspace_id');
    expect(list).toContain('occupancy.workspace_id = p_workspace_id');
    expect(list).toContain('LIMIT 2000');
    expect(list).not.toMatch(/\b(email|phone)\b/i);
  });

  it('enforces the relationship state machine with evidence, history and safe retries', () => {
    const review = functionBlock('public.review_workspace_unit_relationship');

    expect(review).toContain("v_decision NOT IN ('VERIFY', 'DISPUTE', 'END')");
    expect(review).toContain("v_previous_status NOT IN ('CLAIMED', 'PENDING_VERIFICATION', 'DISPUTED')");
    expect(review).toContain("v_previous_status NOT IN ('CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED')");
    expect(review).toContain('RELATIONSHIP_REVIEW_REASON_REQUIRED');
    expect(review).toContain('RELATIONSHIP_EVIDENCE_REQUIRED');
    expect(review.match(/v_evidence_reference !~ '\^\[a-z\]/g)).toHaveLength(2);
    expect(review).toContain('ended_reason = CASE');
    expect(review).toContain('INSERT INTO public.unit_relationship_status_events');
    expect(review).toContain("'review_workspace_unit_relationship'");
    expect(review).toContain('IDEMPOTENCY_PAYLOAD_MISMATCH');
    expect(review).toContain('private.write_authorization_event');
    expect(review).toContain('private.reconcile_legacy_person_relationships');
  });

  it('suspends or ends access without deleting relationship history', () => {
    const change = functionBlock('public.change_workspace_membership_status');

    expect(change).toContain("v_target_status NOT IN ('ACTIVE', 'SUSPENDED', 'ENDED')");
    expect(change).toContain("private.require_workspace_capability(p_workspace_id, 'MEMBERSHIP_SUSPEND')");
    expect(change).toContain("private.require_recent_aal2(interval '15 minutes')");
    expect(change).toContain('workspace-membership-lifecycle:');
    expect(change).toContain('SELF_MEMBERSHIP_STATUS_CHANGE_FORBIDDEN');
    expect(change).toContain('LAST_ADMIN_PROTECTION');
    expect(change).toContain('private.effective_role_keys');
    expect(change).toContain('UPDATE public.membership_periods');
    expect(change).toContain('INSERT INTO public.membership_periods');
    expect(change).toContain("'ADMIN_REACTIVATION'");
    expect(change).toContain('v_membership.status <> \'SUSPENDED\'');
    expect(change).toContain('end_reason = v_reason');
    expect(change).toContain("SET status = 'REVOKED'");
    expect(change).toContain('UPDATE public.delegations');
    expect(change).toContain('INSERT INTO public.workspace_membership_status_events');
    expect(change).toContain("'change_workspace_membership_status'");
    expect(change).not.toMatch(/DELETE\s+FROM\s+public\.(?:workspace_memberships|membership_periods|unit_)/i);
  });

  it('keeps high-risk registry delegation explicit and bounded', () => {
    const normalize = functionBlock('private.normalize_staff_invitation_capabilities');
    const grant = functionBlock('public.grant_workspace_role');

    expect(migration).toContain("('DELEGATE_OPERATIONS', 'UNIT_RELATION_VERIFY', 'HIGH', interval '15 minutes')");
    expect(migration).toContain("('DELEGATE_OPERATIONS', 'MEMBERSHIP_SUSPEND', 'HIGH', interval '15 minutes')");
    for (const block of [normalize, grant]) {
      expect(block).toContain("'MEMBERSHIP_SUSPEND'");
      expect(block).toContain("'UNIT_RELATION_VERIFY'");
      expect(block).toContain('private.has_workspace_capability');
    }
    const defaultBundle = normalize.slice(
      normalize.indexOf('v_internal_capabilities := ARRAY['),
      normalize.indexOf(']::text[];', normalize.indexOf('v_internal_capabilities := ARRAY[')),
    );
    expect(defaultBundle).not.toContain('MEMBERSHIP_SUSPEND');
    expect(defaultBundle).not.toContain('UNIT_RELATION_VERIFY');
  });

  it('fixes search paths and revokes public execution from every public command', () => {
    for (const name of [
      'public.create_workspace_person_relationship',
      'public.list_workspace_unit_relationships',
      'public.review_workspace_unit_relationship',
      'public.change_workspace_membership_status',
    ]) {
      const block = functionBlock(name);
      expect(block).toMatch(/SECURITY DEFINER\s+SET search_path = pg_catalog, public, private/);
      expect(migration).toContain(`REVOKE ALL ON FUNCTION ${name}`);
      expect(migration).toContain(`GRANT EXECUTE ON FUNCTION ${name}`);
    }
  });
});
