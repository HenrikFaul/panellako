import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const foundationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260828120000_multitenancy_foundation.sql',
);
const cutoverPath = resolve(
  process.cwd(),
  'supabase/migrations/20260828121000_multitenancy_rls_cutover.sql',
);
const communityActivationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260828122000_community_activation_review.sql',
);

const foundation = readFileSync(foundationPath, 'utf8');
const cutover = readFileSync(cutoverPath, 'utf8');
const communityActivation = readFileSync(communityActivationPath, 'utf8');
const combined = `${foundation}\n${cutover}`;

function sqlFunctionBlock(sql: string, name: string): string {
  const marker = `CREATE OR REPLACE FUNCTION ${name}`;
  const start = sql.indexOf(marker);
  expect(start, `${name} must exist`).toBeGreaterThanOrEqual(0);
  const next = sql.indexOf('CREATE OR REPLACE FUNCTION ', start + marker.length);
  return sql.slice(start, next === -1 ? sql.length : next);
}

function functionBlock(name: string): string {
  return sqlFunctionBlock(foundation, name);
}

function communityActivationFunctionBlock(name: string): string {
  return sqlFunctionBlock(communityActivation, name);
}

describe('multi-tenancy foundation schema contract', () => {
  it('creates the tenant, identity, portfolio, access and relationship graph', () => {
    const requiredTables = [
      'workspaces',
      'addresses',
      'physical_buildings',
      'building_address_assignments',
      'workspace_buildings',
      'parties',
      'people',
      'organizations',
      'person_account_links',
      'management_agency_details',
      'organization_memberships',
      'workspace_memberships',
      'membership_periods',
      'role_templates',
      'role_capabilities',
      'capability_key_map',
      'role_assignments',
      'management_mandates',
      'delegations',
      'unit_relations',
      'billing_groups',
      'billing_group_members',
      'unit_ownerships',
      'unit_legal_rights',
      'unit_occupancies',
      'membership_invitations',
      'join_requests',
      'join_request_offers',
      'community_creation_requests',
      'community_creation_attestations',
      'authorization_audit_events',
      'command_idempotency_keys',
    ];

    for (const table of requiredTables) {
      expect(foundation).toMatch(
        new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}\\s*\\(`, 'i'),
      );
      expect(foundation).toMatch(
        new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`, 'i'),
      );
    }

    expect(foundation).toContain('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    expect(foundation).toContain('CREATE INDEX IF NOT EXISTS addresses_canonical_key_trgm_idx');
    expect(foundation).toContain('gin_trgm_ops');
  });

  it('uses composite tenant foreign keys for object-bound relationships', () => {
    const requiredCompositeForeignKeys = [
      'FOREIGN KEY (workspace_id, membership_id)',
      'FOREIGN KEY (workspace_id, source_mandate_id)',
      'FOREIGN KEY (workspace_id, source_delegation_id)',
      'FOREIGN KEY (workspace_id, primary_context_unit_id)',
      'FOREIGN KEY (workspace_id, physical_building_id)',
      'FOREIGN KEY (workspace_id, parent_unit_id)',
      'FOREIGN KEY (workspace_id, child_unit_id)',
      'FOREIGN KEY (workspace_id, billing_group_id)',
      'FOREIGN KEY (workspace_id, unit_id)',
    ];

    for (const foreignKey of requiredCompositeForeignKeys) {
      expect(foundation).toContain(foreignKey);
    }

    expect(foundation).toContain('REFERENCES public.workspace_buildings(workspace_id, physical_building_id)');
    expect(foundation).toContain('REFERENCES public.workspace_memberships(workspace_id, id)');
    expect(foundation).toContain('REFERENCES public.management_mandates(workspace_id, id)');
    expect(foundation).toContain('REFERENCES public.delegations(workspace_id, id)');
    expect(foundation).toContain('REFERENCES public.units(workspace_id, id)');
  });

  it('models typed unit composition separately from explicit billing groups', () => {
    expect(foundation).toContain("relation_type IN ('ACCESSORY_OF', 'BILLING_ASSOCIATED_WITH', 'SPLIT_FROM', 'MERGED_INTO')");
    expect(foundation).toContain('CREATE TABLE IF NOT EXISTS public.billing_groups');
    expect(foundation).toContain('CREATE TABLE IF NOT EXISTS public.billing_group_members');
    expect(foundation).not.toContain('vw_aggregated_unit_shares');
    expect(foundation).not.toMatch(/COALESCE\(parent_unit_id,\s*id\)/i);
  });

  it('preserves the first-rollout workspace/building UUID compatibility invariant', () => {
    expect(foundation).toMatch(
      /INSERT INTO public\.workspaces[\s\S]*?SELECT\s+b\.id,\s+b\.name/i,
    );
    expect(foundation).toMatch(
      /INSERT INTO public\.physical_buildings[\s\S]*?SELECT\s+b\.id,/i,
    );
    expect(foundation).toMatch(
      /INSERT INTO public\.workspace_buildings[\s\S]*?SELECT b\.id, b\.id, true/i,
    );
    expect(foundation).toContain('LEGACY_PRIMARY_BUILDING_ID_INVARIANT');
    expect(foundation).toContain('reserved_workspace_id');
    expect(foundation).toMatch(
      /workspaces\.id, buildings\.id and\s+-- physical_buildings\.id from reserved_workspace_id/,
    );
  });

  it('keeps fuzzy address matching candidate-only and never auto-merges', () => {
    const addressSearch = functionBlock('public.search_address_candidates');
    const communityCreate = functionBlock('public.create_community_creation_request');

    expect(addressSearch).toContain('similarity(a.canonical_key');
    expect(addressSearch).toContain('RETURNS TABLE');
    expect(addressSearch).not.toMatch(/UPDATE\s+public\.(addresses|physical_buildings|workspaces)/i);
    expect(communityCreate).toContain("pg_advisory_xact_lock(hashtextextended('address:'");
    expect(communityCreate).not.toMatch(/similarity\([^)]*\)[\s\S]*?(UPDATE|DELETE)/i);
    expect(communityCreate).not.toMatch(/INSERT INTO public\.(workspaces|physical_buildings|buildings)/i);
  });

  it('keeps community onboarding request-only without provisional auto-activation', () => {
    const communityCreate = functionBlock('public.create_community_creation_request');

    expect(communityCreate).toContain("'PENDING_VERIFICATION'");
    expect(communityCreate).toContain('HOLD: activation is intentionally not client-granted');
    expect(combined).not.toMatch(
      /CREATE\s+(?:CONSTRAINT\s+)?TRIGGER[^;]*community_creation_attestations[\s\S]*?(ACTIVE|activate)/i,
    );
    expect(foundation).not.toContain('activate_provisional');
  });

  it('keeps counter-offers as immutable append-only events', () => {
    expect(foundation).toContain("event_type IN ('COUNTER_OFFER', 'ACCEPTED', 'WITHDRAWN', 'REVIEW_NOTE')");
    expect(foundation).toContain('supersedes_offer_id uuid REFERENCES public.join_request_offers');
    expect(foundation).toContain('CREATE TRIGGER trg_join_request_offers_immutable');
    expect(foundation).toContain('JOIN_REQUEST_OFFER_IMMUTABLE');
    expect(functionBlock('public.accept_join_request_offer')).toContain("'ACCEPTED'");
    expect(functionBlock('public.review_join_request')).toContain("p_decision = 'COUNTER_OFFER'");
  });

  it('provides stable, idempotent onboarding and manager RPC contracts', () => {
    const signatures = [
      'public.ensure_profile()',
      'public.get_my_workspaces()',
      'public.get_workspace_context(p_workspace_id uuid)',
      'public.search_joinable_communities(\n  p_query text,\n  p_limit integer DEFAULT 10',
      'public.list_joinable_units(p_workspace_id uuid)',
      'public.list_my_join_requests()',
      'public.submit_join_request(\n  p_workspace_id uuid,\n  p_unit_id uuid,\n  p_relationship_type text,\n  p_message text,\n  p_idempotency_key uuid',
      'public.create_community_creation_request(\n  p_community_name text,\n  p_formatted_address text,\n  p_legal_form text,\n  p_unit_count integer,\n  p_governance_mode text,\n  p_idempotency_key uuid',
      'public.create_workspace_unit(\n  p_workspace_id uuid,\n  p_designation text,\n  p_unit_category text,\n  p_parent_unit_id uuid,\n  p_idempotency_key uuid',
      'public.issue_membership_invitation(\n  p_workspace_id uuid,\n  p_email text,\n  p_unit_id uuid,\n  p_relationship_type text,\n  p_expires_at timestamptz,\n  p_idempotency_key uuid',
      'public.accept_membership_invitation(\n  p_token text,\n  p_idempotency_key uuid',
      'public.list_workspace_join_requests(p_workspace_id uuid)',
      'public.list_workspace_members(p_workspace_id uuid)',
      'public.record_reminder_send(\n  p_reminder_rule_id uuid,\n  p_profile_id uuid,\n  p_channel text,\n  p_days_before_deadline integer,\n  p_idempotency_key uuid',
      'public.grant_workspace_role(\n  p_workspace_id uuid,\n  p_profile_id uuid,\n  p_role_key text,\n  p_capability_keys text[],\n  p_valid_to timestamptz,\n  p_idempotency_key uuid',
      'public.revoke_workspace_role(\n  p_workspace_id uuid,\n  p_role_assignment_id uuid,\n  p_reason text,\n  p_idempotency_key uuid',
    ];

    for (const signature of signatures) expect(foundation).toContain(signature);
    expect(foundation).toContain('CREATE TABLE IF NOT EXISTS public.command_idempotency_keys');
    expect(foundation).toContain('pg_advisory_xact_lock');
    expect(foundation.match(/private\.lock_idempotent_command/g)?.length ?? 0).toBeGreaterThanOrEqual(8);
    expect(foundation).toContain('ADMIN_ROLE_LIMITED_GRANT_FORBIDDEN');
    expect(foundation).toContain('can_redelegate, reason');
    expect(foundation).toContain("p_role_key NOT IN ('DELEGATE_OPERATIONS', 'COMMITTEE_OVERSIGHT', 'ACCOUNTANT', 'BILLING_ADMIN')");
  });

  it('returns the frontend workspace contracts and canonical dotted capabilities', () => {
    const myWorkspaces = functionBlock('public.get_my_workspaces');
    const workspaceContext = functionBlock('public.get_workspace_context');
    const canonicalCapabilities = [
      'workspace.read',
      'unit.read_all',
      'membership.approve',
      'ticket.create',
      'meter.submit_own_unit',
      'document.common.read',
      'finance.workspace.read',
      'meeting.read',
      'vote.cast',
      'vote.audit',
      'reminder.manage',
      'billing.manage',
    ];

    for (const capability of canonicalCapabilities) expect(foundation).toContain(`'${capability}'`);
    expect(myWorkspaces).toMatch(/role_keys text\[\][\s\S]*relationship_labels text\[\][\s\S]*unit_count bigint[\s\S]*open_tickets bigint[\s\S]*member_since timestamptz/i);
    expect(workspaceContext).toMatch(/role_keys text\[\][\s\S]*relationship_labels text\[\][\s\S]*capabilities text\[\][\s\S]*related_unit_ids uuid\[\][\s\S]*primary_unit_id uuid/i);
    expect(functionBlock('private.effective_capabilities')).toContain('ckm.canonical_key');
    expect(functionBlock('private.effective_capabilities')).toContain("'VOTE_CAST'");
    expect(foundation).toContain("('COMMITTEE_OVERSIGHT', 'VOTE_AUDIT'");
    expect(cutover).toContain("private.has_workspace_capability(auth.uid(), workspace_id, 'REMINDER_MANAGE')");
  });

  it('provides a masked capability-guarded workspace member directory', () => {
    const members = functionBlock('public.list_workspace_members');

    expect(members).toMatch(/membership_id uuid[\s\S]*profile_id uuid[\s\S]*display_name text/i);
    expect(members).toMatch(/membership_status text[\s\S]*primary_unit_designation text/i);
    expect(members).toMatch(/role_keys text\[\][\s\S]*role_assignment_ids uuid\[\][\s\S]*effective_capabilities text\[\]/i);
    expect(members).toContain("'MEMBERSHIP_REVIEW'");
    expect(members).toContain("'MEMBER_DIRECTORY_READ'");
    expect(members).toContain('LIMIT 1000');
    expect(members).not.toMatch(/\b(email|phone)\b/i);
  });

  it('projects normalized membership changes transactionally for legacy readers', () => {
    const invitation = functionBlock('public.accept_membership_invitation');
    const review = functionBlock('public.review_join_request');
    const grant = functionBlock('public.grant_workspace_role');
    const revoke = functionBlock('public.revoke_workspace_role');

    expect(invitation).toContain('private.project_legacy_relationship');
    expect(review).toContain('private.project_legacy_relationship');
    expect(grant).toContain('private.project_legacy_workspace_role');
    expect(revoke).toContain('private.project_legacy_workspace_role');
    expect(foundation).toContain('ON CONFLICT (profile_id, building_id, role) DO UPDATE');
    expect(foundation).toContain('trg_workspace_memberships_close_legacy_projection');
    expect(foundation).toContain("WHEN 'DELEGATE_OPERATIONS' THEN 'megbizott'");
    expect(foundation).toContain('BILLING_ADMIN intentionally has no legacy projection');
  });

  it('scopes reminders by workspace plus physical-building binding and command-only send audit', () => {
    const scopeTrigger = functionBlock('private.sync_physical_building_workspace_scope');
    const recordSend = functionBlock('public.record_reminder_send');

    expect(foundation).toContain('ALTER TABLE public.reminder_rules ADD COLUMN IF NOT EXISTS workspace_id uuid');
    expect(foundation).toContain('ALTER TABLE public.reminder_rules ALTER COLUMN workspace_id SET NOT NULL');
    expect(foundation).toContain('reminder_rules_workspace_building_fk');
    expect(foundation).toContain('reminder_rules_workspace_deadline_idx');
    expect(scopeTrigger).toContain('public.workspace_buildings');
    expect(scopeTrigger).toContain('WORKSPACE_BUILDING_SCOPE_MISMATCH');
    expect(recordSend).toContain("private.require_workspace_capability(v_workspace_id, 'REMINDER_MANAGE')");
    expect(recordSend).toContain("private.lock_idempotent_command(v_actor, 'record_reminder_send'");
    expect(cutover).not.toContain('GRANT INSERT ON public.reminder_sends TO authenticated');
  });

  it('lists only the authenticated subject own join requests with masked workflow detail', () => {
    const ownRequests = functionBlock('public.list_my_join_requests');

    expect(ownRequests).toContain('jr.requester_profile_id = auth.uid()');
    expect(ownRequests).toContain('latest_counter_offer_accepted boolean');
    expect(ownRequests).toContain("accepted.event_type = 'ACCEPTED'");
    expect(ownRequests).not.toContain('p_workspace_id');
    expect(ownRequests).not.toContain('p_email');
    expect(ownRequests).not.toContain('evidence_reference');
  });

  it('uses database-indexed authorization, not JWT workspace claims', () => {
    const capabilityHelper = functionBlock('private.has_workspace_capability');

    expect(capabilityHelper).toContain('public.workspace_memberships');
    expect(capabilityHelper).toContain('public.membership_periods');
    expect(capabilityHelper).toContain('public.role_assignments');
    expect(capabilityHelper).toContain('public.management_mandates');
    expect(capabilityHelper).toContain('public.delegations');
    expect(capabilityHelper).not.toContain('organization_memberships');
    expect(combined).not.toMatch(/auth\.jwt\(\)[\s\S]{0,120}app_metadata[\s\S]{0,120}workspaces/i);
    expect(foundation).toContain('workspace_memberships_profile_active_idx');
    expect(foundation).toContain('role_assignments_membership_active_idx');
  });

  it('guards high-risk manager commands with capability checks and fresh AAL2', () => {
    for (const name of [
      'public.review_join_request',
      'public.create_workspace_unit',
      'public.issue_membership_invitation',
      'public.grant_workspace_role',
      'public.revoke_workspace_role',
    ]) {
      const block = functionBlock(name);
      expect(block).toContain('private.require_workspace_capability');
      expect(block).toContain('private.require_recent_aal2');
    }
    expect(foundation).toContain('MFA_STEP_UP_REQUIRED');
    expect(functionBlock('private.require_recent_aal2')).toContain("auth.jwt() ->> 'aal'");
    expect(functionBlock('private.require_recent_aal2')).toContain("auth.jwt() -> 'amr'");
  });

  it('fixes search_path and revokes PUBLIC from security-definer functions', () => {
    const securityDefinerCount = foundation.match(/SECURITY DEFINER/g)?.length ?? 0;
    const fixedSearchPathCount = foundation.match(
      /SECURITY DEFINER\s+SET search_path = pg_catalog, public, private(?:, auth)?/g,
    )?.length ?? 0;
    const publicRevokes = foundation.match(/REVOKE ALL ON FUNCTION [^;]+ FROM PUBLIC;/g)?.length ?? 0;
    const authenticatedGrants = foundation.match(/GRANT EXECUTE ON FUNCTION [^;]+ TO authenticated;/g)?.length ?? 0;

    expect(securityDefinerCount).toBeGreaterThan(15);
    expect(fixedSearchPathCount).toBe(securityDefinerCount);
    expect(publicRevokes).toBeGreaterThanOrEqual(securityDefinerCount);
    expect(authenticatedGrants).toBeGreaterThanOrEqual(securityDefinerCount);
    expect(combined).not.toMatch(/TO\s+(?:anon|authenticated)[\s\S]{0,80}(?:USING|WITH CHECK)\s*\(\s*true\s*\)/i);
  });
});

describe('multi-tenancy RLS cut-over contract', () => {
  it('fails before policy removal when tenant reconciliation is incomplete', () => {
    const preflightIndex = cutover.indexOf('RLS_CUTOVER_PREFLIGHT_FAILED');
    const policyDropIndex = cutover.indexOf("FROM pg_policies");

    expect(preflightIndex).toBeGreaterThanOrEqual(0);
    expect(policyDropIndex).toBeGreaterThan(preflightIndex);
    expect(cutover).toContain("'ACTIVE_WORKSPACE_COMPATIBILITY'");
    expect(cutover).toContain("'UNIT_TENANT_SCOPE'");
    expect(cutover).toContain("'CORE_TENANT_KEYS_NOT_NULL'");
    expect(cutover).toContain("'REMINDER_WORKSPACE_BUILDING_SCOPE'");
    expect(cutover).toContain("'WORK_ORDER_PARENT_SCOPE'");
  });

  it('dynamically drops legacy permissive policies before creating scoped ones', () => {
    expect(cutover).toContain('SELECT schemaname, tablename, policyname');
    expect(cutover).toContain("'DROP POLICY IF EXISTS %I ON %I.%I'");
    expect(cutover).toContain("tablename = ANY(v_tables)");
    expect(cutover).toContain('private.has_active_workspace_membership');
    expect(cutover).toContain('private.has_workspace_capability');
    expect(cutover).toContain('private.can_access_unit');
    expect(cutover).not.toMatch(/TO\s+(?:anon|authenticated)[\s\S]{0,80}(?:USING|WITH CHECK)\s*\(\s*true\s*\)/i);
  });

  it('removes permissive environment-cache access and restores tenant-scoped reads only', () => {
    const cacheTables = [
      'transit_stop_cache',
      'building_stops',
      'building_solar_cache',
      'building_satellite_cache',
      'building_liveability_cache',
      'building_green_cache',
      'building_compact_city_cache',
      'building_env_score',
      'building_public_services_cache',
      'building_urban_atlas_cache',
    ];

    for (const table of cacheTables) {
      expect(cutover).toContain(`'${table}'`);
      expect(cutover).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
    }
    expect(cutover).toContain("private.has_workspace_capability(auth.uid(), wb.workspace_id, ''ENVIRONMENT_READ'')");
    expect(cutover).toContain('FOR ALL TO service_role USING (true) WITH CHECK (true)');
    expect(cutover).toContain('REVOKE ALL ON TABLE public.%I FROM anon, authenticated');
  });

  it('binds document Storage objects to authoritative database rows', () => {
    expect(cutover).toContain('CREATE POLICY documents_authoritative_select');
    expect(cutover).toContain('CREATE POLICY documents_authoritative_insert');
    expect(cutover).toContain('CREATE POLICY documents_authoritative_update');
    expect(cutover).toContain('CREATE POLICY documents_authoritative_delete');
    expect(cutover.match(/d\.file_url = storage\.objects\.name/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(cutover).toContain("bucket_id = 'documents'");
    expect(cutover).toContain("d.file_url LIKE ('workspace/' || d.workspace_id::text || '/documents/%')");
    expect(cutover).not.toContain('Authenticated users can upload documents\n+    ON storage.objects');
  });
});

describe('community creation platform review and activation contract', () => {
  it('stores immutable, service-only review history behind fail-closed RLS', () => {
    expect(communityActivation).toContain(
      'CREATE TABLE IF NOT EXISTS public.community_creation_reviews',
    );
    expect(communityActivation).toContain(
      'ALTER TABLE public.community_creation_reviews ENABLE ROW LEVEL SECURITY;',
    );
    expect(communityActivation).toContain(
      'FOR SELECT TO service_role',
    );
    expect(communityActivation).toContain(
      'FOR INSERT TO service_role',
    );
    expect(communityActivation).toContain(
      'REVOKE ALL ON TABLE public.community_creation_reviews\n  FROM PUBLIC, anon, authenticated, service_role;',
    );
    expect(communityActivation).toContain(
      'REVOKE ALL ON TABLE public.community_address_duplicate_resolutions\n  FROM PUBLIC, anon, authenticated, service_role;',
    );
    expect(communityActivation).not.toContain(
      'GRANT SELECT, INSERT ON TABLE public.community_creation_reviews',
    );
    expect(communityActivation).not.toContain(
      'GRANT SELECT, INSERT ON TABLE public.community_address_duplicate_resolutions',
    );
    expect(communityActivation).toContain(
      'CREATE TRIGGER trg_community_creation_reviews_immutable',
    );
    expect(communityActivation).toContain('COMMUNITY_REVIEW_IMMUTABLE');
    expect(communityActivation).toContain(
      'UNIQUE (reviewer_actor, idempotency_key)',
    );
    expect(communityActivation).toContain(
      'CREATE TABLE IF NOT EXISTS public.community_address_duplicate_resolutions',
    );
    expect(communityActivation).toContain(
      'ALTER TABLE public.community_address_duplicate_resolutions ENABLE ROW LEVEL SECURITY;',
    );
    expect(communityActivation).toContain(
      'trg_community_address_duplicate_resolutions_immutable',
    );
  });

  it('keeps service review separate from claimant activation', () => {
    const review = communityActivationFunctionBlock(
      'public.review_community_creation_request',
    );
    const serviceList = communityActivationFunctionBlock(
      'public.list_community_creation_requests',
    );

    expect(communityActivation).toContain(
      'public.review_community_creation_request(\n  p_request_id uuid,\n  p_decision text,\n  p_review_reason text,\n  p_verification_method text,\n  p_evidence_refs jsonb,\n  p_reviewer_actor text,\n  p_idempotency_key uuid',
    );
    expect(communityActivation).toContain(
      "p_status text DEFAULT 'PENDING_VERIFICATION',\n  p_limit integer DEFAULT 100",
    );
    expect(review).toContain('private.require_service_role_reviewer(p_reviewer_actor)');
    expect(review).toContain('REVIEWER_SELF_APPROVAL_FORBIDDEN');
    expect(review).toContain('LOWER(BTRIM(claimant.email)) = v_actor');
    expect(review).toContain("v_decision NOT IN ('APPROVE', 'NEEDS_EVIDENCE', 'REJECT')");
    expect(review).toContain("v_new_status := 'APPROVED'");
    expect(review).toContain("v_new_status = 'APPROVED'");
    expect(review).toContain(
      'private.has_unresolved_community_address_candidate(v_request.id, 0.85)',
    );
    expect(review).toContain('ADDRESS_DUPLICATE_REVIEW_REQUIRED');
    expect(review).not.toMatch(
      /INSERT INTO public\.(workspaces|physical_buildings|buildings|workspace_memberships|management_mandates|role_assignments)/i,
    );
    expect(serviceList).toContain(
      "PERFORM private.require_service_role_reviewer('service-role@panellako.internal')",
    );
    expect(communityActivation).toContain(
      'GRANT EXECUTE ON FUNCTION public.review_community_creation_request(uuid, text, text, text, jsonb, text, uuid)\n  TO service_role;',
    );
    expect(communityActivation).not.toContain(
      'GRANT EXECUTE ON FUNCTION public.review_community_creation_request(uuid, text, text, text, jsonb, text, uuid)\n  TO authenticated;',
    );
  });

  it('requires typed reviewer resolution for high-similarity address candidates', () => {
    const candidates = communityActivationFunctionBlock(
      'public.list_community_address_candidates',
    );
    const resolveCandidate = communityActivationFunctionBlock(
      'public.resolve_community_address_candidate',
    );
    const unresolved = communityActivationFunctionBlock(
      'private.has_unresolved_community_address_candidate',
    );
    const serviceList = communityActivationFunctionBlock(
      'public.list_community_creation_requests',
    );

    expect(candidates).toContain('similarity(candidate.canonical_key, requested.canonical_key) >= 0.20');
    expect(candidates).toContain("'ACTIVE_WORKSPACE'");
    expect(candidates).toContain("'OPEN_REQUEST'");
    expect(resolveCandidate).toContain("v_resolution NOT IN ('NOT_DUPLICATE', 'LINK_EXISTING')");
    expect(resolveCandidate).toContain("v_refs ->> 'duplicate_override_reference'");
    expect(resolveCandidate).toContain("v_refs ->> 'link_existing_reference'");
    expect(resolveCandidate).toContain("SET status = 'REJECTED'");
    expect(resolveCandidate).toContain('linked_existing_workspace_id = v_candidate_workspace_id');
    expect(unresolved).toContain('>= p_similarity_threshold');
    expect(unresolved).toContain("resolution.resolution = 'NOT_DUPLICATE'");
    expect(serviceList).toContain('fuzzy_candidate_count');
    expect(serviceList).toContain('unresolved_high_similarity_count');
    expect(serviceList).toContain('highest_similarity_score');
    expect(communityActivation).toContain(
      'GRANT EXECUTE ON FUNCTION public.resolve_community_address_candidate(uuid, uuid, text, text, jsonb, text, uuid)\n  TO service_role;',
    );
  });

  it('makes verified mandates the authority boundary and preserves only the exact demo fixture', () => {
    const capability = communityActivationFunctionBlock(
      'private.has_workspace_capability',
    );
    const roleKeys = communityActivationFunctionBlock(
      'private.effective_role_keys',
    );
    const sourceGuard = communityActivationFunctionBlock(
      'private.validate_role_assignment_source',
    );

    expect(capability).toContain("mm.verification_status = 'VERIFIED'");
    expect(capability).toContain("dm.verification_status = 'VERIFIED'");
    expect(roleKeys).toContain("mm.verification_status = 'VERIFIED'");
    expect(roleKeys).toContain("dm.verification_status = 'VERIFIED'");
    expect(sourceGuard).toContain("mm.verification_status = 'VERIFIED'");
    expect(communityActivation).toContain(
      "mm.workspace_id = 'bbbbbbbb-0001-0001-0001-000000000001'::uuid",
    );
    expect(communityActivation).toContain(
      "mm.mandate_party_id = 'aaaaaaaa-0001-0001-0001-000000000001'::uuid",
    );
    expect(communityActivation).toContain(
      "LOWER(BTRIM(p.email)) = 'demo.kepviselo@panellako.hu'",
    );
    expect(communityActivation).toContain('p.free_trial_never_expires = true');
    expect(communityActivation).toContain(
      "evidence_reference = 'demo-seed:fixed-public-presentation-fixture'",
    );
    expect(communityActivation).not.toMatch(
      /UPDATE public\.management_mandates[\s\S]*?SET verification_status = 'VERIFIED'[\s\S]*?WHERE mm\.workspace_id (?:IS NOT NULL|= mm\.workspace_id)/i,
    );
  });

  it('requires typed opaque governance evidence and retains the legal cutoffs', () => {
    const opaqueRefs = communityActivationFunctionBlock(
      'private.validate_opaque_evidence_references',
    );
    const governance = communityActivationFunctionBlock(
      'private.require_community_governance_evidence',
    );

    expect(opaqueRefs).toContain("jsonb_typeof(v_refs) <> 'object'");
    expect(opaqueRefs).toContain("'official_register_reference'");
    expect(opaqueRefs).toContain("'signed_mandate_reference'");
    expect(opaqueRefs).toContain("'community_resolution_reference'");
    expect(opaqueRefs).toContain("'legal_basis_reference'");
    expect(opaqueRefs).toContain('pii_allowed');
    expect(governance).toContain("p_verification_method = 'OFFICIAL_REGISTER'");
    expect(governance).toContain("p_legal_form <> 'CONDOMINIUM'");
    expect(governance).toContain('MANAGED_LEGAL_FORM_UNSUPPORTED');
    expect(governance).toContain("p_verification_method = 'SIGNED_MANDATE'");
    expect(governance).toContain("p_verification_method <> 'SELF_MANAGED_RESOLUTION'");
    expect(governance).toContain("p_legal_form = 'CONDOMINIUM'");
    expect(governance).toContain('p_declared_unit_count > 6');
    expect(governance).toContain("p_legal_form = 'UNDIVIDED_COMMON_OWNERSHIP'");
    expect(governance).toContain("v_refs ->> 'community_resolution_reference'");
    expect(governance).toContain("v_refs ->> 'legal_basis_reference'");
    expect(governance).toContain("TIMESTAMPTZ '2026-11-01 00:00:00+01'");
    expect(communityActivation).not.toMatch(
      /CREATE\s+(?:CONSTRAINT\s+)?TRIGGER[^;]*community_creation_attestations[\s\S]*?(ACTIVE|activate)/i,
    );
  });

  it('bounds legal form and initial unit inventory in both table and command contracts', () => {
    const createRequest = communityActivationFunctionBlock(
      'public.create_community_creation_request',
    );

    expect(communityActivation).toContain(
      "legal_form IN ('CONDOMINIUM', 'UNDIVIDED_COMMON_OWNERSHIP')",
    );
    expect(communityActivation).toContain(
      'CHECK (declared_unit_count BETWEEN 1 AND 5000)',
    );
    expect(createRequest).toContain(
      "v_legal_form NOT IN ('CONDOMINIUM', 'UNDIVIDED_COMMON_OWNERSHIP')",
    );
    expect(createRequest).toContain(
      'p_unit_count IS NULL OR p_unit_count NOT BETWEEN 1 AND 5000',
    );
    expect(createRequest).not.toMatch(
      /similarity\([^)]*\)[\s\S]*?(UPDATE|DELETE|INSERT INTO public\.(?:workspaces|physical_buildings|buildings))/i,
    );
  });

  it('activates only the original claimant with fresh AAL2 and a live approval window', () => {
    const activate = communityActivationFunctionBlock(
      'public.activate_approved_community_creation_request',
    );

    expect(communityActivation).toContain(
      'public.activate_approved_community_creation_request(\n  p_request_id uuid,\n  p_idempotency_key uuid',
    );
    expect(activate).toContain("v_actor uuid := auth.uid()");
    expect(activate).toContain('v_request.claimant_profile_id <> v_actor');
    expect(activate).toContain("private.require_recent_aal2(interval '15 minutes')");
    expect(activate).toContain("v_request.status <> 'APPROVED'");
    expect(activate).toContain('v_request.activation_expires_at <= now()');
    expect(activate).toContain('v_request.address_lease_expires_at <= now()');
    expect(activate).toContain("review.decision = 'APPROVE'");
    expect(activate).toContain('COMMUNITY_ALREADY_EXISTS');
    expect(activate).toContain(
      'private.has_unresolved_community_address_candidate(v_request.id, 0.85)',
    );
    expect(communityActivation).toContain(
      "v_activation_expires_at := LEAST(\n      v_request.address_lease_expires_at,\n      now() + interval '72 hours'",
    );
  });

  it('creates one complete legacy-compatible tenant graph transactionally', () => {
    const activate = communityActivationFunctionBlock(
      'public.activate_approved_community_creation_request',
    );

    for (const insertion of [
      'INSERT INTO public.buildings',
      'INSERT INTO public.physical_buildings',
      'INSERT INTO public.workspaces',
      'INSERT INTO public.workspace_buildings',
      'INSERT INTO public.building_address_assignments',
      'INSERT INTO public.units',
      'INSERT INTO public.workspace_memberships',
      'INSERT INTO public.membership_periods',
      'INSERT INTO public.management_mandates',
      'INSERT INTO public.role_assignments',
      'INSERT INTO public.authorization_audit_events',
    ]) {
      expect(activate).toContain(insertion);
    }
    expect(activate).toContain('FROM generate_series(1, v_request.declared_unit_count)');
    expect(activate).toContain("verification_status, evidence_reference");
    expect(activate).toContain("'VERIFIED'");
    expect(activate).toContain('source_mandate_id');
    expect(activate).toContain("v_role_key IN ('COMMON_REPRESENTATIVE_ADMIN', 'BOARD_ADMIN')");
    expect(activate).toContain('private.project_legacy_workspace_role');
    expect(activate).toContain('Do not mislabel a\n  -- community coordinator as a common representative');
    expect(activate).toContain("SET status = 'ACTIVATED'");
    expect(activate).toContain('activated_workspace_id = v_request.reserved_workspace_id');
    expect(activate).toContain('activated_at = v_activated_at');
  });

  it('returns the same activated workspace on safe retries and exposes terminal subject state', () => {
    const activate = communityActivationFunctionBlock(
      'public.activate_approved_community_creation_request',
    );
    const ownList = communityActivationFunctionBlock(
      'public.list_my_community_creation_requests',
    );

    expect(activate).toContain(
      "private.lock_idempotent_command(\n    v_actor, 'activate_approved_community_creation_request'",
    );
    expect(activate).toContain("v_request.status = 'ACTIVATED'");
    expect(activate).toContain('v_request.activated_workspace_id');
    expect(communityActivation).toContain(
      "'ACTIVATED', 'REJECTED', 'CANCELLED', 'EXPIRED'",
    );
    expect(ownList).toContain('ccr.claimant_profile_id = v_actor');
    expect(ownList).toContain('ccr.activation_expires_at');
    expect(ownList).toContain('ccr.activated_workspace_id');
    expect(ownList).toContain('ccr.activated_at');
    expect(ownList).not.toContain('reviewer_actor');
    expect(ownList).not.toContain('evidence_references');
  });
});
