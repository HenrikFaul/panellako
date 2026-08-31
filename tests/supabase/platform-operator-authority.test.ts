import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260830140000_platform_operator_authority.sql'),
  'utf8',
);
const v2CommandMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260830130000_platform_admin_job_commands.sql'),
  'utf8',
);
const runtimeCanary = readFileSync(
  resolve(process.cwd(), 'tests/supabase/platform-operator-authority-runtime-canary.sql'),
  'utf8',
);

function functionBlock(name: string): string {
  const marker = `CREATE OR REPLACE FUNCTION ${name}`;
  const start = migration.indexOf(marker);
  expect(start, `${name} must exist`).toBeGreaterThanOrEqual(0);
  const next = migration.indexOf('CREATE OR REPLACE FUNCTION ', start + marker.length);
  return migration.slice(start, next === -1 ? migration.length : next);
}

describe('platform operator authority database contract', () => {
  it('models named roles, capabilities and time-bounded revocable assignments', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.platform_operator_roles');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.platform_operator_role_capabilities');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.platform_operator_assignments');
    expect(migration).toContain("('PLATFORM_ADMIN', 'platform.operators.manage', 'R4')");
    expect(migration).toContain("('PLATFORM_ADMIN', 'platform.users.manage_trial', 'R3')");
    for (const mapping of [
      "('PLATFORM_OBSERVER', 'platform.settings.read', 'R0')",
      "('PLATFORM_OBSERVER', 'platform.communities.read', 'R0')",
      "('PLATFORM_OBSERVER', 'platform.migrations.read', 'R0')",
      "('PLATFORM_OBSERVER', 'platform.features.read', 'R0')",
      "('COMMUNITY_REVIEWER', 'platform.communities.read', 'R0')",
      "('INTEGRATION_OPERATOR', 'platform.settings.read', 'R0')",
      "('SECURITY_OPERATOR', 'platform.migrations.read', 'R0')",
      "('PLATFORM_ADMIN', 'platform.settings.read', 'R0')",
      "('PLATFORM_ADMIN', 'platform.communities.read', 'R0')",
      "('PLATFORM_ADMIN', 'platform.migrations.read', 'R0')",
      "('PLATFORM_ADMIN', 'platform.features.read', 'R0')",
    ]) {
      expect(migration).toContain(mapping);
    }
    expect(migration).toContain('valid_to IS NULL OR valid_to > valid_from');
    expect(migration).toContain('revoked_at IS NULL');
    expect(migration).toContain(
      'agency_id             uuid REFERENCES public.management_agency_details(organization_id)',
    );
    expect(migration).not.toContain('public.management_agencies');

    const hasCapability = functionBlock('private.platform_operator_has_capability');
    expect(hasCapability).toContain('assignment.valid_from <= p_at');
    expect(hasCapability).toContain('assignment.valid_to IS NULL OR assignment.valid_to > p_at');
    expect(hasCapability).toContain('operator_role.is_active');
  });

  it('uses one canonical PostgreSQL SHA-256 contract and an authenticated digest RPC', () => {
    const digest = functionBlock('private.platform_payload_digest');
    expect(digest).toContain("'sha256:' || encode(");
    expect(digest).toContain("public.digest(convert_to(p_payload::text, 'UTF8'), 'sha256')");
    expect(migration).toContain(
      'payload_digest = private.platform_payload_digest(request_payload)',
    );

    const publicDigest = functionBlock('public.get_platform_payload_digest');
    expect(publicDigest).toContain(
      "private.require_platform_operator_capability('platform.overview.read')",
    );
    expect(publicDigest).toContain('RETURN private.platform_payload_digest(p_payload)');
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.get_platform_payload_digest(jsonb) TO authenticated',
    );
  });

  it('normalizes typed timestamps to the same millisecond UTC ISO contract used by clients', () => {
    const iso = functionBlock('private.platform_utc_iso');
    expect(iso).toContain("p_value AT TIME ZONE 'UTC'");
    expect(iso).toContain('YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

    const canonicalGrant = functionBlock('private.platform_operator_grant_payload');
    const prepareGrant = functionBlock('public.prepare_platform_operator_grant_payload');
    const grant = functionBlock('public.grant_platform_operator_assignment');
    const trial = functionBlock('public.update_platform_user_trial');
    expect(canonicalGrant).toContain("'valid_from', private.platform_utc_iso(p_valid_from)");
    expect(canonicalGrant).toContain('private.platform_utc_iso(p_valid_to)');
    expect(prepareGrant).toContain('private.platform_operator_grant_payload(');
    expect(prepareGrant).toContain("'payload_digest', private.platform_payload_digest(v_payload)");
    expect(prepareGrant).toContain("date_trunc('milliseconds', p_valid_from AT TIME ZONE 'UTC')");
    expect(grant).toContain('v_payload := private.platform_operator_grant_payload(');
    expect(grant).toContain('tstzrange(v_valid_from, v_valid_to');
    expect(trial).toContain('private.platform_utc_iso(v_trial_start)');
    expect(trial).toContain("date_trunc('milliseconds', p_free_trial_start AT TIME ZONE 'UTC')");
    expect(trial).toContain('SET free_trial_start = v_trial_start');
    expect(trial).toContain('v_digest := private.platform_payload_digest(v_payload)');
    expect(trial).not.toContain('p_expected_payload_digest');
  });

  it('enforces exact approval identity, expiry, four-eyes and single consumption', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.platform_command_approvals');
    expect(migration).toContain('approver_profile_id <> initiator_profile_id');
    expect(migration).toContain("expires_at <= requested_at + interval '30 minutes'");
    expect(migration).toContain('consumption_idempotency_key uuid');

    const decide = functionBlock('public.decide_platform_command_approval');
    expect(decide).toContain('v_approval.initiator_profile_id = v_actor');
    expect(decide).toContain('PLATFORM_SELF_APPROVAL_FORBIDDEN');
    expect(decide).toContain('v_approval.payload_digest <> p_expected_payload_digest');
    expect(decide.indexOf("v_approval.status <> 'PENDING'")).toBeLessThan(
      decide.indexOf("v_actor, 'platform.approvals.decide'"),
    );

    const consume = functionBlock('private.consume_platform_command_approval');
    expect(consume).toContain('v_approval.request_payload <> v_payload');
    expect(consume).toContain('v_approval.action_key <> p_action_key');
    expect(consume).toContain("v_approval.status = 'CONSUMED'");
    expect(consume).toContain(
      'v_approval.consumption_idempotency_key = p_consumption_idempotency_key',
    );
    expect(consume).toContain("SET status = 'CONSUMED'");

    const authorize = functionBlock('public.authorize_platform_action');
    expect(authorize).toContain("IF v_result ->> 'outcome' <> 'replayed' THEN");
    expect(runtimeCanary).toContain('authorization replay emitted % audit rows instead of one');
    expect(runtimeCanary).toContain('FOR v_index IN 1..61 LOOP');
  });

  it('keeps operator idempotency receipts and action quotas durable and private', () => {
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS private.platform_operator_action_rate_limits',
    );
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS private.platform_operator_action_receipts',
    );
    const quota = functionBlock('private.consume_platform_operator_action_quota');
    expect(quota).toContain('ON CONFLICT (profile_id, action_key) DO UPDATE');
    expect(quota).toContain('request_count < p_limit');
    expect(quota).toContain('retry_after_seconds');
    const replay = functionBlock('private.platform_operator_action_replay');
    expect(replay).toContain('IDEMPOTENCY_PAYLOAD_MISMATCH');
    expect(replay).toContain("jsonb_build_object('replayed', true)");
    expect(migration).toContain(
      'REVOKE ALL ON TABLE private.platform_operator_action_rate_limits',
    );
  });

  it('bootstraps exactly one first platform administrator under a global lock', () => {
    const bootstrap = functionBlock('public.bootstrap_first_platform_operator');
    expect(bootstrap).toContain("v_jwt_role <> 'service_role'");
    expect(bootstrap).toContain('platform:first-operator-bootstrap');
    expect(bootstrap).toContain(
      'IF EXISTS (SELECT 1 FROM public.platform_operator_assignments)',
    );
    expect(bootstrap).toContain("p_role_key <> 'PLATFORM_ADMIN'");
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.bootstrap_first_platform_operator(uuid, text, text) TO service_role',
    );
    expect(migration).not.toContain(
      'GRANT EXECUTE ON FUNCTION public.bootstrap_first_platform_operator(uuid, text, text) TO authenticated',
    );
  });

  it('requires AAL2 plus an exact approved payload for operator grants and revocations', () => {
    const grant = functionBlock('public.grant_platform_operator_assignment');
    const revoke = functionBlock('public.revoke_platform_operator_assignment');
    for (const block of [grant, revoke]) {
      expect(block).toContain(
        "private.require_platform_operator_capability('platform.operators.manage')",
      );
      expect(block).toContain("private.require_recent_aal2(interval '15 minutes')");
      expect(block).toContain('private.require_platform_payload_digest');
      expect(block).toContain('private.consume_platform_command_approval');
      expect(block).toContain('private.store_platform_operator_action_receipt');
      expect(block).toContain('private.append_platform_operator_audit');
    }
    expect(revoke).toContain('PLATFORM_OPERATOR_SELF_REVOKE_FORBIDDEN');
    expect(revoke).toContain('PLATFORM_LAST_ADMIN_PROTECTION');
    expect(grant).toContain('PLATFORM_OPERATOR_ASSIGNMENT_OVERLAP');
    expect(grant).toContain("hashtextextended('platform:operator-assignment-authority', 0)");
    expect(revoke).toContain("hashtextextended('platform:operator-assignment-authority', 0)");
    expect(revoke).toContain('other_assignment.valid_to IS NULL');
  });

  it('creates exact-scope short-lived support sessions with no reactivation', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.platform_support_sessions');
    expect(migration).toContain("scope_type = 'WORKSPACE' AND workspace_id IS NOT NULL AND agency_id IS NULL");
    expect(migration).toContain("scope_type = 'AGENCY' AND agency_id IS NOT NULL AND workspace_id IS NULL");
    expect(migration).toMatch(/access_mode\s+text NOT NULL DEFAULT 'READ_ONLY'/);
    expect(migration).toContain("expires_at <= requested_at + interval '60 minutes'");

    const request = functionBlock('public.request_platform_support_session');
    const decide = functionBlock('public.decide_platform_support_session');
    const authorize = functionBlock('public.authorize_platform_support_action');
    const guard = functionBlock('private.guard_platform_support_session_transition');
    expect(request).toContain("private.require_recent_aal2(interval '15 minutes')");
    expect(decide).toContain('SUPPORT_SESSION_SELF_APPROVAL_FORBIDDEN');
    expect(decide.indexOf("v_session.status <> 'PENDING'")).toBeLessThan(
      decide.indexOf("v_actor, 'platform.support.decide'"),
    );
    expect(decide).toContain("'superadmin.support.expired'");
    expect(authorize).toContain('SUPPORT_SESSION_SCOPE_MISMATCH');
    expect(authorize).toContain('SUPPORT_SESSION_READ_ONLY');
    expect(guard).toContain("OLD.status IN ('REJECTED', 'REVOKED', 'EXPIRED')");
    expect(guard).toContain('SUPPORT_SESSION_REACTIVATION_FORBIDDEN');
    expect(runtimeCanary).toContain('FOR v_index IN 1..31 LOOP');
    expect(runtimeCanary).toContain('lazy support expiry emitted % platform audit rows instead of one');
  });

  it('makes support events, release attestations and platform audit append-only', () => {
    expect(migration).toContain('trg_platform_audit_events_append_only');
    expect(migration).toContain('trg_platform_support_session_events_append_only');
    expect(migration).toContain('trg_platform_release_attestations_append_only');
    expect(migration).toContain(
      'REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.platform_audit_events FROM service_role',
    );
    expect(migration).toContain(
      'GRANT SELECT, INSERT ON TABLE public.platform_support_session_events TO service_role',
    );
    expect(migration).toContain(
      'GRANT SELECT, INSERT ON TABLE public.platform_release_attestations TO service_role',
    );
    expect(migration).not.toMatch(
      /GRANT[\s\S]{0,40}UPDATE[\s\S]{0,80}platform_(audit_events|support_session_events|release_attestations)[\s\S]{0,30}service_role/i,
    );
  });

  it('attests releases only with AAL2, capability and consumed exact approval', () => {
    const attest = functionBlock('public.attest_platform_release');
    expect(attest).toContain(
      "private.require_platform_operator_capability('platform.release.attest')",
    );
    expect(attest).toContain("private.require_recent_aal2(interval '15 minutes')");
    expect(attest).toContain("'platform.release.attest', v_payload, p_idempotency_key");
    expect(attest).toContain('INSERT INTO public.platform_release_attestations');
    expect(attest).toContain('private.store_platform_operator_action_receipt');
  });

  it('updates user trials atomically with typed input and stable failures', () => {
    const trial = functionBlock('public.update_platform_user_trial');
    expect(trial).toContain(
      "private.require_platform_operator_capability('platform.users.manage_trial')",
    );
    expect(trial).toContain("private.require_recent_aal2(interval '15 minutes')");
    expect(trial).toContain('p_free_trial_days NOT BETWEEN 1 AND 3650');
    expect(trial).toContain('PLATFORM_USER_TRIAL_INPUT_INVALID');
    expect(trial).toContain('PLATFORM_USER_NOT_FOUND');
    expect(trial).toContain('PLATFORM_USER_TRIAL_NO_CHANGE');
    expect(trial).toContain('UPDATE public.profiles');
    expect(trial).toContain('private.append_platform_operator_audit');
    expect(migration).toContain('trg_profiles_trial_authority');
  });

  it('updates only allowlisted typed feature fields in the audit transaction', () => {
    const feature = functionBlock('public.update_platform_feature');
    expect(feature).toContain(
      "private.require_platform_operator_capability('platform.features.manage')",
    );
    expect(feature).toContain("'name', 'description', 'module', 'route_path', 'menu_path'");
    expect(feature).toContain("(p_patch ->> 'tier') NOT IN ('trial', 'alap', 'pro')");
    expect(feature).toContain('PLATFORM_FEATURE_INPUT_INVALID');
    expect(feature).toContain('PLATFORM_FEATURE_NOT_FOUND');
    expect(feature).toContain('PLATFORM_FEATURE_NO_CHANGE');
    expect(feature).toContain('UPDATE public.features feature');
    expect(migration).toContain('trg_features_authority');
  });

  it('upserts only the two typed platform setting keys atomically', () => {
    const setting = functionBlock('public.update_platform_setting');
    expect(setting).toContain(
      "private.require_platform_operator_capability('platform.settings.manage')",
    );
    expect(setting).toContain("v_key NOT IN ('map_theme', 'bkk_rate_limits')");
    expect(setting).toContain("(p_value ->> 'id') NOT IN ('minimal', 'nature', 'dark', 'dlc')");
    expect(setting).toContain('v_cell_delay_ms NOT BETWEEN 1000 AND 120000');
    expect(setting).toContain('v_retry_max NOT BETWEEN 0 AND 10');
    expect(setting).toContain('v_retry_wait_ms NOT BETWEEN 1000 AND 600000');
    expect(setting).toContain('v_cells_per_run NOT BETWEEN 0 AND 3');
    expect(setting).toContain('PLATFORM_SETTING_NO_CHANGE');
    expect(setting).toContain('ON CONFLICT (key) DO UPDATE');
    expect(migration).toContain('trg_platform_settings_authority');
  });

  it('reviews community requests through authenticated exact-payload authority RPCs', () => {
    const resolveCandidate = functionBlock('public.resolve_platform_community_address_candidate');
    const reviewRequest = functionBlock('public.review_platform_community_creation_request');
    for (const block of [resolveCandidate, reviewRequest]) {
      expect(block).toContain(
        "private.require_platform_operator_capability('platform.communities.review')",
      );
      expect(block).toContain("private.require_recent_aal2(interval '15 minutes')");
      expect(block).toContain('private.require_platform_payload_digest');
      expect(block).toContain('private.lock_platform_operator_action');
      expect(block).toContain('private.platform_operator_action_replay');
      expect(block).toContain('private.enforce_platform_operator_action_quota');
      expect(block).toContain('v_request.claimant_profile_id = v_actor');
      expect(block).toContain('private.append_platform_operator_audit');
      expect(block).toContain('private.store_platform_operator_action_receipt');
    }
    expect(resolveCandidate).toContain("'platform.communities.resolve_address_candidate'");
    expect(resolveCandidate).toContain('DUPLICATE_CANDIDATE_ALREADY_RESOLVED');
    expect(reviewRequest).toContain("'platform.communities.review_request'");
    expect(reviewRequest).toContain('ADDRESS_DUPLICATE_REVIEW_REQUIRED');
  });

  it('enriches commands and audits without redefining the v2 command contract', () => {
    for (const column of [
      'operator_profile_id',
      'assurance_level',
      'reason',
      'payload_digest',
      'approval_id',
      'support_session_id',
      'outcome',
    ]) {
      expect(migration).toContain(`ADD COLUMN IF NOT EXISTS ${column}`);
    }
    expect(migration).not.toContain('CREATE OR REPLACE FUNCTION public.begin_platform_job_command');
    expect(migration).not.toContain('CREATE OR REPLACE FUNCTION public.complete_platform_job_command');
    expect(migration).not.toContain('CREATE OR REPLACE FUNCTION public.platform_job_command_contract_version');
    expect(v2CommandMigration).toContain("select '20260830130000-v2'::text");
    expect(v2CommandMigration).toContain('platform_job_commands_one_running_target_idx');
    expect(v2CommandMigration).toContain("'outcome', 'replayed'");
  });

  it('exposes authority RPCs only to their intended database roles', () => {
    for (const signature of [
      'public.get_platform_operator_context()',
      'public.get_platform_payload_digest(jsonb)',
      'public.prepare_platform_operator_grant_payload(uuid, text, timestamptz, timestamptz, text)',
      'public.create_platform_command_approval(text, text, text, text, jsonb, text, uuid, interval)',
      'public.decide_platform_command_approval(uuid, text, text, text)',
      'public.grant_platform_operator_assignment(uuid, text, timestamptz, timestamptz, text, uuid, text, uuid)',
      'public.revoke_platform_operator_assignment(uuid, text, uuid, text, uuid)',
      'public.request_platform_support_session(text, uuid, uuid, text[], text, text, uuid, interval)',
      'public.decide_platform_support_session(uuid, text, text)',
      'public.revoke_platform_support_session(uuid, text, uuid, text)',
      'public.attest_platform_release(text, text, text, text, text, text, text, text, uuid, text, uuid)',
      'public.update_platform_user_trial(uuid, timestamptz, integer, boolean, text, uuid)',
      'public.update_platform_feature(uuid, jsonb, text, uuid, text)',
      'public.update_platform_setting(text, jsonb, text, uuid, text)',
      'public.resolve_platform_community_address_candidate(uuid, uuid, text, text, jsonb, uuid, text)',
      'public.review_platform_community_creation_request(uuid, text, text, text, jsonb, uuid, text)',
    ]) {
      expect(migration).toContain(`REVOKE ALL ON FUNCTION ${signature}`);
      expect(migration).toContain(`GRANT EXECUTE ON FUNCTION ${signature} TO authenticated`);
    }
    expect(migration).toContain(
      'REVOKE ALL ON TABLE public.platform_operator_assignments',
    );
    expect(migration).not.toMatch(
      /GRANT (INSERT|UPDATE|DELETE)[\s\S]{0,80}public\.platform_operator_assignments TO authenticated/i,
    );
    expect(migration).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.(resolve_platform_community_address_candidate|review_platform_community_creation_request)[\s\S]{0,30}TO service_role/i,
    );
  });

  it('ships a rollback-only runtime canary for the complete authority boundary', () => {
    expect(runtimeCanary).toContain('\\set ON_ERROR_STOP on');
    expect(runtimeCanary).toContain('BEGIN;');
    expect(runtimeCanary).toContain('ROLLBACK;');
    expect(runtimeCanary).toContain('MFA_STEP_UP_REQUIRED');
    expect(runtimeCanary).toContain('PLATFORM_SELF_APPROVAL_FORBIDDEN');
    expect(runtimeCanary).toContain('IDEMPOTENCY_PAYLOAD_MISMATCH');
    expect(runtimeCanary).toContain('SUPPORT_SESSION_SCOPE_MISMATCH');
    expect(runtimeCanary).toContain('PLATFORM_AUTHORITY_RPC_REQUIRED');
    expect(runtimeCanary).toContain('resolve_platform_community_address_candidate');
    expect(runtimeCanary).toContain('review_platform_community_creation_request');
    expect(runtimeCanary).toContain('REVIEWER_SELF_APPROVAL_FORBIDDEN');
    expect(runtimeCanary).toContain('community review receipt replay failed');
    expect(runtimeCanary).toContain('service role has UPDATE on append-only platform history');
    expect(runtimeCanary).toContain('platform operator authority runtime canary PASS');
  });
});
