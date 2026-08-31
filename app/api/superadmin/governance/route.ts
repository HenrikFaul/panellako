import { adminJson } from '@/lib/superadmin/http';
import {
  hasPlatformCapability,
  requirePlatformRead,
} from '@/lib/superadmin/operator-authority';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => typeof item === 'object' && item !== null && !Array.isArray(item))
    : [];
}

function text(value: unknown, maximum = 1_000): string | null {
  return typeof value === 'string' && value.length <= maximum ? value : null;
}

function maskEmail(value: unknown): string | null {
  const email = text(value, 320);
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!local || !domain) return null;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(3, Math.min(8, local.length - visible.length)))}@${domain}`;
}

function safeApprovalPayload(actionKey: unknown, payload: unknown): Row | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const source = payload as Row;
  const allowedByAction: Record<string, readonly string[]> = {
    'platform.operators.grant': ['profile_id', 'role_key', 'valid_from', 'valid_to', 'grant_reason'],
    'platform.operators.revoke': ['assignment_id', 'revocation_reason'],
    'platform.release.attest': ['environment', 'deployment_id', 'commit_sha', 'artifact_digest', 'manifest_fingerprint', 'migration_head', 'outcome'],
    'platform.migrations.apply': ['migration_head', 'migration_names'],
  };
  const keys = typeof actionKey === 'string' ? allowedByAction[actionKey] : undefined;
  if (!keys) return null;
  return Object.fromEntries(keys.filter(key => key in source).map(key => [key, source[key]]));
}

export async function GET() {
  const authority = await requirePlatformRead('platform.overview.read');
  if (!authority.ok) return adminJson({ error: authority.errorCode }, authority.status);

  const context = authority.context;
  const canSeeOperators = hasPlatformCapability(context, 'platform.operators.manage')
    || hasPlatformCapability(context, 'platform.approvals.decide');
  const canSeeApprovals = hasPlatformCapability(context, 'platform.approvals.decide')
    || hasPlatformCapability(context, 'platform.operators.manage')
    || hasPlatformCapability(context, 'platform.release.attest');
  const canSeeSupport = hasPlatformCapability(context, 'platform.support.request')
    || hasPlatformCapability(context, 'platform.support.approve')
    || hasPlatformCapability(context, 'platform.support.revoke');
  const canSeeRelease = hasPlatformCapability(context, 'platform.release.read')
    || hasPlatformCapability(context, 'platform.release.attest');

  if (context.mode === 'break_glass') {
    return adminJson({
      context,
      roles: [],
      assignments: [],
      approvals: [],
      supportSessions: [],
      releaseAttestations: [],
      limited: true,
    });
  }

  try {
    const admin = createAdminClient();
    const operatorId = context.operatorProfileId;
    const rolePromise = canSeeOperators
      ? admin.from('platform_operator_roles').select('role_key, display_name, description, is_active').order('role_key')
      : Promise.resolve({ data: [], error: null });
    const roleCapabilitiesPromise = canSeeOperators
      ? admin.from('platform_operator_role_capabilities').select('role_key, capability_key, risk_class').order('role_key').order('capability_key')
      : Promise.resolve({ data: [], error: null });
    const assignmentsPromise = canSeeOperators
      ? admin.from('platform_operator_assignments').select('id, profile_id, role_key, valid_from, valid_to, granted_by_profile_id, grant_reason, revoked_at, revoked_by_profile_id, revocation_reason, created_at').order('created_at', { ascending: false }).limit(100)
      : Promise.resolve({ data: [], error: null });

    let approvalsQuery = admin.from('platform_command_approvals')
      .select('id, initiator_profile_id, approver_profile_id, capability_key, action_key, target_type, target_id, request_payload, payload_digest, reason, status, decision_reason, requested_at, expires_at, decided_at, consumed_at')
      .order('requested_at', { ascending: false })
      .limit(100);
    if (!canSeeApprovals && operatorId) approvalsQuery = approvalsQuery.eq('initiator_profile_id', operatorId);
    const approvalsPromise = canSeeApprovals || operatorId
      ? approvalsQuery
      : Promise.resolve({ data: [], error: null });

    let supportQuery = admin.from('platform_support_sessions')
      .select('id, requester_profile_id, approver_profile_id, scope_type, workspace_id, agency_id, capability_keys, access_mode, reason, status, decision_reason, requested_at, activated_at, expires_at, decided_at, revoked_at, revoked_by_profile_id, revocation_reason')
      .order('requested_at', { ascending: false })
      .limit(100);
    if (!hasPlatformCapability(context, 'platform.support.approve') && operatorId) {
      supportQuery = supportQuery.eq('requester_profile_id', operatorId);
    }
    const supportPromise = canSeeSupport ? supportQuery : Promise.resolve({ data: [], error: null });
    const releasePromise = canSeeRelease
      ? admin.from('platform_release_attestations').select('id, environment, deployment_id, commit_sha, artifact_digest, manifest_fingerprint, migration_head, outcome, reason, attested_by_profile_id, approval_id, created_at').order('created_at', { ascending: false }).limit(50)
      : Promise.resolve({ data: [], error: null });

    const [roleResult, roleCapabilityResult, assignmentResult, approvalResult, supportResult, releaseResult] = await Promise.all([
      rolePromise,
      roleCapabilitiesPromise,
      assignmentsPromise,
      approvalsPromise,
      supportPromise,
      releasePromise,
    ]);
    if ([roleResult, roleCapabilityResult, assignmentResult, approvalResult, supportResult, releaseResult].some(result => result.error)) {
      return adminJson({ error: 'PLATFORM_GOVERNANCE_UNAVAILABLE' }, 503);
    }

    const assignments = rows(assignmentResult.data);
    const approvals = rows(approvalResult.data);
    const supportSessions = rows(supportResult.data);
    const releases = rows(releaseResult.data);
    const profileIds = Array.from(new Set([
      ...assignments.flatMap(row => [row.profile_id, row.granted_by_profile_id, row.revoked_by_profile_id]),
      ...approvals.flatMap(row => [row.initiator_profile_id, row.approver_profile_id]),
      ...supportSessions.flatMap(row => [row.requester_profile_id, row.approver_profile_id, row.revoked_by_profile_id]),
      ...releases.map(row => row.attested_by_profile_id),
    ].filter((value): value is string => typeof value === 'string')));

    const profileResult = profileIds.length > 0
      ? await admin.from('profiles').select('id, full_name, email').in('id', profileIds)
      : { data: [], error: null };
    if (profileResult.error) return adminJson({ error: 'PLATFORM_GOVERNANCE_UNAVAILABLE' }, 503);
    const profileMap = new Map(rows(profileResult.data).map(profile => [String(profile.id), {
      id: String(profile.id),
      displayName: text(profile.full_name, 160),
      email: maskEmail(profile.email),
    }]));

    return adminJson({
      context,
      roles: rows(roleResult.data).map(role => ({
        roleKey: text(role.role_key, 64),
        displayName: text(role.display_name, 160),
        description: text(role.description, 500),
        active: role.is_active === true,
        capabilities: rows(roleCapabilityResult.data)
          .filter(item => item.role_key === role.role_key)
          .map(item => ({ key: text(item.capability_key, 96), riskClass: text(item.risk_class, 2) })),
      })),
      assignments: assignments.map(assignment => ({
        id: text(assignment.id, 36),
        profile: profileMap.get(String(assignment.profile_id)) ?? { id: text(assignment.profile_id, 36), displayName: null, email: null },
        roleKey: text(assignment.role_key, 64),
        validFrom: text(assignment.valid_from, 64),
        validTo: text(assignment.valid_to, 64),
        grantReason: text(assignment.grant_reason),
        revokedAt: text(assignment.revoked_at, 64),
        revocationReason: text(assignment.revocation_reason),
      })),
      approvals: approvals.map(approval => ({
        id: text(approval.id, 36),
        initiator: profileMap.get(String(approval.initiator_profile_id)) ?? null,
        approver: profileMap.get(String(approval.approver_profile_id)) ?? null,
        capabilityKey: text(approval.capability_key, 96),
        actionKey: text(approval.action_key, 96),
        targetType: text(approval.target_type, 64),
        targetId: text(approval.target_id, 320),
        payload: safeApprovalPayload(approval.action_key, approval.request_payload),
        payloadDigest: text(approval.payload_digest, 71),
        reason: text(approval.reason),
        status: text(approval.status, 32),
        decisionReason: text(approval.decision_reason),
        requestedAt: text(approval.requested_at, 64),
        expiresAt: text(approval.expires_at, 64),
        decidedAt: text(approval.decided_at, 64),
        consumedAt: text(approval.consumed_at, 64),
      })),
      supportSessions: supportSessions.map(session => ({
        id: text(session.id, 36),
        requester: profileMap.get(String(session.requester_profile_id)) ?? null,
        approver: profileMap.get(String(session.approver_profile_id)) ?? null,
        scopeType: text(session.scope_type, 16),
        workspaceId: text(session.workspace_id, 36),
        agencyId: text(session.agency_id, 36),
        capabilityKeys: Array.isArray(session.capability_keys) ? session.capability_keys.filter(value => typeof value === 'string').slice(0, 32) : [],
        accessMode: text(session.access_mode, 16),
        reason: text(session.reason),
        status: text(session.status, 32),
        decisionReason: text(session.decision_reason),
        requestedAt: text(session.requested_at, 64),
        activatedAt: text(session.activated_at, 64),
        expiresAt: text(session.expires_at, 64),
        revokedAt: text(session.revoked_at, 64),
        revocationReason: text(session.revocation_reason),
      })),
      releaseAttestations: releases.map(release => ({
        id: text(release.id, 36),
        environment: text(release.environment, 32),
        deploymentId: text(release.deployment_id, 160),
        commitSha: text(release.commit_sha, 64),
        artifactDigest: text(release.artifact_digest, 71),
        manifestFingerprint: text(release.manifest_fingerprint, 71),
        migrationHead: text(release.migration_head, 160),
        outcome: text(release.outcome, 16),
        reason: text(release.reason),
        attestedBy: profileMap.get(String(release.attested_by_profile_id)) ?? null,
        approvalId: text(release.approval_id, 36),
        createdAt: text(release.created_at, 64),
      })),
      limited: false,
    });
  } catch {
    return adminJson({ error: 'PLATFORM_GOVERNANCE_UNAVAILABLE' }, 503);
  }
}
