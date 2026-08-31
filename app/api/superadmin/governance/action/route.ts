import { NextRequest } from 'next/server';
import { BoundedJsonError, readBoundedJson } from '@/lib/http/bounded-json';
import {
  adminJson,
  hasJsonContentType,
  isSameOriginAdminRequest,
  normalizeAdminReason,
  UUID_PATTERN,
} from '@/lib/superadmin/http';
import {
  getDatabasePlatformPayloadDigest,
  platformAuthorityErrorCode,
  requirePlatformMutation,
} from '@/lib/superadmin/operator-authority';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 48 * 1024;
const ROLE_KEY = /^[A-Z][A-Z0-9_]{2,63}$/;
const CAPABILITY_KEY = /^[a-z][a-z0-9_.-]{2,95}$/;
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const COMMIT_SHA = /^[0-9a-f]{40}([0-9a-f]{24})?$/;
const MIGRATION_HEAD = /^[0-9]{14}_[a-z0-9_]{3,120}$/;
const DEPLOYMENT_ID = /^[A-Za-z0-9._:-]{3,160}$/;

type Row = Record<string, unknown>;
type RpcClient = ReturnType<typeof createClient>;

function isRecord(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(record: Row, allowed: readonly string[]): boolean {
  return Object.keys(record).every(key => allowed.includes(key));
}

function validUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function validDate(value: unknown, nullable?: false): value is string;
function validDate(value: unknown, nullable: true): value is string | null;
function validDate(value: unknown, nullable = false): value is string | null {
  return (nullable && value === null)
    || (typeof value === 'string' && value.length <= 64 && Number.isFinite(Date.parse(value)));
}

function resultRow(value: unknown): Row | null {
  return isRecord(value) ? value : null;
}

function rpcStatus(code: string): number {
  if (code === 'MFA_STEP_UP_REQUIRED') return 428;
  if (code === 'PLATFORM_RATE_LIMITED') return 429;
  if (code.endsWith('_NOT_FOUND')) return 404;
  if (code.includes('DENIED') || code.includes('FORBIDDEN') || code.includes('MISMATCH')) return 403;
  if (code.includes('INPUT_INVALID') || code.includes('INVALID') || code.includes('DIGEST')) return 400;
  if (code.includes('CONFLICT') || code.includes('OVERLAP') || code.includes('NO_CHANGE') || code.includes('ALREADY') || code.includes('TERMINAL') || code.includes('EXPIRED')) return 409;
  return 422;
}

async function runRpc(client: RpcClient, name: string, args: Row) {
  const { data, error } = await client.rpc(name, args);
  if (error) {
    const code = platformAuthorityErrorCode(error);
    return adminJson({
      error: code,
      ...(code === 'MFA_STEP_UP_REQUIRED' ? { stepUpHref: '/account/security?next=%2Fsuperadmin' } : {}),
    }, rpcStatus(code));
  }
  if (!resultRow(data)) return adminJson({ error: 'PLATFORM_ACTION_RESPONSE_INVALID' }, 502);
  return adminJson({ ok: true, result: data });
}

async function requireAction(capability: string) {
  const authority = await requirePlatformMutation(capability);
  if (authority.ok) return null;
  return adminJson({
    error: authority.errorCode,
    ...(authority.stepUpHref ? { stepUpHref: authority.stepUpHref } : {}),
  }, authority.status);
}

interface GrantInput {
  targetProfileId: string;
  roleKey: string;
  validFrom: string;
  validTo: string | null;
  reason: string;
}

function grantInput(value: unknown): GrantInput | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ['targetProfileId', 'roleKey', 'validFrom', 'validTo', 'reason'])) return null;
  const reason = normalizeAdminReason(value.reason, 3, 1_000);
  if (!validUuid(value.targetProfileId) || typeof value.roleKey !== 'string' || !ROLE_KEY.test(value.roleKey)) return null;
  if (!validDate(value.validFrom) || !validDate(value.validTo ?? null, true) || !reason) return null;
  return {
    targetProfileId: value.targetProfileId,
    roleKey: value.roleKey,
    validFrom: value.validFrom,
    validTo: typeof value.validTo === 'string' ? value.validTo : null,
    reason,
  };
}

interface ReleaseInput {
  environment: 'production' | 'preview' | 'staging' | 'development';
  deploymentId: string;
  commitSha: string;
  artifactDigest: string;
  manifestFingerprint: string;
  migrationHead: string;
  outcome: 'PASS' | 'HOLD' | 'FAIL';
  reason: string;
}

function releaseInput(value: unknown): ReleaseInput | null {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    'environment', 'deploymentId', 'commitSha', 'artifactDigest', 'manifestFingerprint', 'migrationHead', 'outcome', 'reason',
  ])) return null;
  const environment = typeof value.environment === 'string' ? value.environment.toLowerCase() : '';
  const commitSha = typeof value.commitSha === 'string' ? value.commitSha.toLowerCase() : '';
  const outcome = typeof value.outcome === 'string' ? value.outcome.toUpperCase() : '';
  const reason = normalizeAdminReason(value.reason, 3, 1_000);
  if (!['production', 'preview', 'staging', 'development'].includes(environment)
    || typeof value.deploymentId !== 'string' || !DEPLOYMENT_ID.test(value.deploymentId)
    || !COMMIT_SHA.test(commitSha)
    || typeof value.artifactDigest !== 'string' || !SHA256.test(value.artifactDigest)
    || typeof value.manifestFingerprint !== 'string' || !SHA256.test(value.manifestFingerprint)
    || typeof value.migrationHead !== 'string' || !MIGRATION_HEAD.test(value.migrationHead)
    || !['PASS', 'HOLD', 'FAIL'].includes(outcome)
    || !reason) return null;
  return {
    environment: environment as ReleaseInput['environment'],
    deploymentId: value.deploymentId,
    commitSha,
    artifactDigest: value.artifactDigest,
    manifestFingerprint: value.manifestFingerprint,
    migrationHead: value.migrationHead,
    outcome: outcome as ReleaseInput['outcome'],
    reason,
  };
}

function releasePayload(input: ReleaseInput): Row {
  return {
    environment: input.environment,
    deployment_id: input.deploymentId,
    commit_sha: input.commitSha,
    artifact_digest: input.artifactDigest,
    manifest_fingerprint: input.manifestFingerprint,
    migration_head: input.migrationHead,
    outcome: input.outcome,
  };
}

async function requestApproval(client: RpcClient, body: Row) {
  if (!hasOnlyKeys(body, ['action', 'requestedAction', 'input', 'idempotencyKey', 'ttlMinutes'])) {
    return adminJson({ error: 'PLATFORM_APPROVAL_REQUEST_INVALID' }, 400);
  }
  if (!validUuid(body.idempotencyKey) || !Number.isSafeInteger(body.ttlMinutes) || Number(body.ttlMinutes) < 5 || Number(body.ttlMinutes) > 30) {
    return adminJson({ error: 'PLATFORM_APPROVAL_REQUEST_INVALID' }, 400);
  }

  let capabilityKey: string;
  let actionKey: string;
  let targetType: string;
  let targetId: string;
  let payload: Row;
  let reason: string;

  if (body.requestedAction === 'operator.grant') {
    const input = grantInput(body.input);
    if (!input) return adminJson({ error: 'PLATFORM_OPERATOR_GRANT_INPUT_INVALID' }, 400);
    const denied = await requireAction('platform.operators.manage');
    if (denied) return denied;
    const { data, error } = await client.rpc('prepare_platform_operator_grant_payload', {
      p_target_profile_id: input.targetProfileId,
      p_role_key: input.roleKey,
      p_valid_from: input.validFrom,
      p_valid_to: input.validTo,
      p_reason: input.reason,
    });
    if (error || !isRecord(data) || !isRecord(data.payload)) {
      const code = error ? platformAuthorityErrorCode(error) : 'PLATFORM_OPERATOR_GRANT_INPUT_INVALID';
      return adminJson({ error: code }, rpcStatus(code));
    }
    capabilityKey = 'platform.operators.manage';
    actionKey = 'platform.operators.grant';
    targetType = 'platform_operator';
    targetId = input.targetProfileId;
    payload = data.payload;
    reason = input.reason;
  } else if (body.requestedAction === 'operator.revoke') {
    if (!isRecord(body.input) || !hasOnlyKeys(body.input, ['assignmentId', 'reason'])) {
      return adminJson({ error: 'PLATFORM_OPERATOR_REVOKE_INPUT_INVALID' }, 400);
    }
    const inputReason = normalizeAdminReason(body.input.reason, 3, 1_000);
    if (!validUuid(body.input.assignmentId) || !inputReason) return adminJson({ error: 'PLATFORM_OPERATOR_REVOKE_INPUT_INVALID' }, 400);
    const denied = await requireAction('platform.operators.manage');
    if (denied) return denied;
    capabilityKey = 'platform.operators.manage';
    actionKey = 'platform.operators.revoke';
    targetType = 'platform_operator_assignment';
    targetId = body.input.assignmentId;
    payload = { assignment_id: body.input.assignmentId, revocation_reason: inputReason };
    reason = inputReason;
  } else if (body.requestedAction === 'release.attest') {
    const input = releaseInput(body.input);
    if (!input) return adminJson({ error: 'PLATFORM_RELEASE_ATTESTATION_INPUT_INVALID' }, 400);
    const denied = await requireAction('platform.release.attest');
    if (denied) return denied;
    capabilityKey = 'platform.release.attest';
    actionKey = 'platform.release.attest';
    targetType = 'deployment';
    targetId = input.deploymentId;
    payload = releasePayload(input);
    reason = input.reason;
  } else {
    return adminJson({ error: 'PLATFORM_APPROVAL_ACTION_NOT_ALLOWED' }, 400);
  }

  return runRpc(client, 'create_platform_command_approval', {
    p_capability_key: capabilityKey,
    p_action_key: actionKey,
    p_target_type: targetType,
    p_target_id: targetId,
    p_request_payload: payload,
    p_reason: reason,
    p_idempotency_key: body.idempotencyKey,
    p_ttl: `${body.ttlMinutes} minutes`,
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginAdminRequest(request)) return adminJson({ error: 'ORIGIN_NOT_ALLOWED' }, 403);
  if (!hasJsonContentType(request)) return adminJson({ error: 'UNSUPPORTED_MEDIA_TYPE' }, 415);

  let parsed: unknown;
  try {
    parsed = await readBoundedJson(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof BoundedJsonError && error.code === 'REQUEST_TOO_LARGE') return adminJson({ error: 'REQUEST_TOO_LARGE' }, 413);
    return adminJson({ error: 'INVALID_JSON' }, 400);
  }
  if (!isRecord(parsed) || typeof parsed.action !== 'string') return adminJson({ error: 'PLATFORM_ACTION_INVALID' }, 400);

  const client = createClient();
  if (parsed.action === 'approval.request') return requestApproval(client, parsed);

  if (parsed.action === 'approval.decide') {
    if (!hasOnlyKeys(parsed, ['action', 'approvalId', 'decision', 'payloadDigest', 'reason'])
      || !validUuid(parsed.approvalId)
      || (parsed.decision !== 'APPROVE' && parsed.decision !== 'REJECT')
      || typeof parsed.payloadDigest !== 'string' || !SHA256.test(parsed.payloadDigest)) {
      return adminJson({ error: 'PLATFORM_APPROVAL_DECISION_INVALID' }, 400);
    }
    const reason = normalizeAdminReason(parsed.reason, 3, 1_000);
    if (!reason) return adminJson({ error: 'PLATFORM_APPROVAL_DECISION_INVALID' }, 400);
    const denied = await requireAction('platform.approvals.decide');
    if (denied) return denied;
    return runRpc(client, 'decide_platform_command_approval', {
      p_approval_id: parsed.approvalId,
      p_decision: parsed.decision,
      p_expected_payload_digest: parsed.payloadDigest,
      p_reason: reason,
    });
  }

  if (parsed.action === 'operator.grant.execute') {
    if (!hasOnlyKeys(parsed, ['action', 'input', 'approvalId', 'idempotencyKey']) || !validUuid(parsed.approvalId) || !validUuid(parsed.idempotencyKey)) {
      return adminJson({ error: 'PLATFORM_OPERATOR_GRANT_INPUT_INVALID' }, 400);
    }
    const input = grantInput(parsed.input);
    if (!input) return adminJson({ error: 'PLATFORM_OPERATOR_GRANT_INPUT_INVALID' }, 400);
    const denied = await requireAction('platform.operators.manage');
    if (denied) return denied;
    const prepared = await client.rpc('prepare_platform_operator_grant_payload', {
      p_target_profile_id: input.targetProfileId,
      p_role_key: input.roleKey,
      p_valid_from: input.validFrom,
      p_valid_to: input.validTo,
      p_reason: input.reason,
    });
    if (prepared.error || !isRecord(prepared.data) || typeof prepared.data.payload_digest !== 'string' || !SHA256.test(prepared.data.payload_digest)) {
      const code = prepared.error ? platformAuthorityErrorCode(prepared.error) : 'PLATFORM_OPERATOR_GRANT_INPUT_INVALID';
      return adminJson({ error: code }, rpcStatus(code));
    }
    return runRpc(client, 'grant_platform_operator_assignment', {
      p_target_profile_id: input.targetProfileId,
      p_role_key: input.roleKey,
      p_valid_from: input.validFrom,
      p_valid_to: input.validTo,
      p_reason: input.reason,
      p_idempotency_key: parsed.idempotencyKey,
      p_expected_payload_digest: prepared.data.payload_digest,
      p_approval_id: parsed.approvalId,
    });
  }

  if (parsed.action === 'operator.revoke.execute') {
    if (!hasOnlyKeys(parsed, ['action', 'assignmentId', 'reason', 'approvalId', 'idempotencyKey'])
      || !validUuid(parsed.assignmentId) || !validUuid(parsed.approvalId) || !validUuid(parsed.idempotencyKey)) {
      return adminJson({ error: 'PLATFORM_OPERATOR_REVOKE_INPUT_INVALID' }, 400);
    }
    const reason = normalizeAdminReason(parsed.reason, 3, 1_000);
    if (!reason) return adminJson({ error: 'PLATFORM_OPERATOR_REVOKE_INPUT_INVALID' }, 400);
    const denied = await requireAction('platform.operators.manage');
    if (denied) return denied;
    const payload = { assignment_id: parsed.assignmentId, revocation_reason: reason };
    const digest = await getDatabasePlatformPayloadDigest(client, payload);
    if (!digest.digest) return adminJson({ error: digest.errorCode ?? 'PLATFORM_DIGEST_UNAVAILABLE' }, 503);
    return runRpc(client, 'revoke_platform_operator_assignment', {
      p_assignment_id: parsed.assignmentId,
      p_reason: reason,
      p_idempotency_key: parsed.idempotencyKey,
      p_expected_payload_digest: digest.digest,
      p_approval_id: parsed.approvalId,
    });
  }

  if (parsed.action === 'support.request') {
    if (!hasOnlyKeys(parsed, ['action', 'scopeType', 'scopeId', 'capabilityKeys', 'accessMode', 'reason', 'idempotencyKey', 'ttlMinutes'])
      || (parsed.scopeType !== 'WORKSPACE' && parsed.scopeType !== 'AGENCY')
      || !validUuid(parsed.scopeId)
      || !Array.isArray(parsed.capabilityKeys) || parsed.capabilityKeys.length < 1 || parsed.capabilityKeys.length > 32
      || parsed.capabilityKeys.some(value => typeof value !== 'string' || !CAPABILITY_KEY.test(value))
      || (parsed.accessMode !== 'READ_ONLY' && parsed.accessMode !== 'WRITE')
      || !validUuid(parsed.idempotencyKey)
      || !Number.isSafeInteger(parsed.ttlMinutes) || Number(parsed.ttlMinutes) < 5 || Number(parsed.ttlMinutes) > 60) {
      return adminJson({ error: 'SUPPORT_SESSION_INPUT_INVALID' }, 400);
    }
    const reason = normalizeAdminReason(parsed.reason, 3, 1_000);
    if (!reason) return adminJson({ error: 'SUPPORT_SESSION_INPUT_INVALID' }, 400);
    const denied = await requireAction('platform.support.request');
    if (denied) return denied;
    return runRpc(client, 'request_platform_support_session', {
      p_scope_type: parsed.scopeType,
      p_workspace_id: parsed.scopeType === 'WORKSPACE' ? parsed.scopeId : null,
      p_agency_id: parsed.scopeType === 'AGENCY' ? parsed.scopeId : null,
      p_capability_keys: Array.from(new Set(parsed.capabilityKeys)).sort(),
      p_access_mode: parsed.accessMode,
      p_reason: reason,
      p_idempotency_key: parsed.idempotencyKey,
      p_ttl: `${parsed.ttlMinutes} minutes`,
    });
  }

  if (parsed.action === 'support.decide') {
    if (!hasOnlyKeys(parsed, ['action', 'supportSessionId', 'decision', 'reason'])
      || !validUuid(parsed.supportSessionId)
      || (parsed.decision !== 'APPROVE' && parsed.decision !== 'REJECT')) {
      return adminJson({ error: 'SUPPORT_SESSION_DECISION_INVALID' }, 400);
    }
    const reason = normalizeAdminReason(parsed.reason, 3, 1_000);
    if (!reason) return adminJson({ error: 'SUPPORT_SESSION_DECISION_INVALID' }, 400);
    const denied = await requireAction('platform.support.approve');
    if (denied) return denied;
    return runRpc(client, 'decide_platform_support_session', {
      p_support_session_id: parsed.supportSessionId,
      p_decision: parsed.decision,
      p_reason: reason,
    });
  }

  if (parsed.action === 'support.revoke') {
    if (!hasOnlyKeys(parsed, ['action', 'supportSessionId', 'reason', 'idempotencyKey'])
      || !validUuid(parsed.supportSessionId) || !validUuid(parsed.idempotencyKey)) {
      return adminJson({ error: 'SUPPORT_SESSION_REVOKE_INPUT_INVALID' }, 400);
    }
    const reason = normalizeAdminReason(parsed.reason, 3, 1_000);
    if (!reason) return adminJson({ error: 'SUPPORT_SESSION_REVOKE_INPUT_INVALID' }, 400);
    const denied = await requireAction('platform.support.revoke');
    if (denied) return denied;
    const payload = { support_session_id: parsed.supportSessionId, revocation_reason: reason };
    const digest = await getDatabasePlatformPayloadDigest(client, payload);
    if (!digest.digest) return adminJson({ error: digest.errorCode ?? 'PLATFORM_DIGEST_UNAVAILABLE' }, 503);
    return runRpc(client, 'revoke_platform_support_session', {
      p_support_session_id: parsed.supportSessionId,
      p_reason: reason,
      p_idempotency_key: parsed.idempotencyKey,
      p_expected_payload_digest: digest.digest,
    });
  }

  if (parsed.action === 'release.attest.execute') {
    if (!hasOnlyKeys(parsed, ['action', 'input', 'approvalId', 'idempotencyKey']) || !validUuid(parsed.approvalId) || !validUuid(parsed.idempotencyKey)) {
      return adminJson({ error: 'PLATFORM_RELEASE_ATTESTATION_INPUT_INVALID' }, 400);
    }
    const input = releaseInput(parsed.input);
    if (!input) return adminJson({ error: 'PLATFORM_RELEASE_ATTESTATION_INPUT_INVALID' }, 400);
    const denied = await requireAction('platform.release.attest');
    if (denied) return denied;
    const digest = await getDatabasePlatformPayloadDigest(client, releasePayload(input));
    if (!digest.digest) return adminJson({ error: digest.errorCode ?? 'PLATFORM_DIGEST_UNAVAILABLE' }, 503);
    return runRpc(client, 'attest_platform_release', {
      p_environment: input.environment,
      p_deployment_id: input.deploymentId,
      p_commit_sha: input.commitSha,
      p_artifact_digest: input.artifactDigest,
      p_manifest_fingerprint: input.manifestFingerprint,
      p_migration_head: input.migrationHead,
      p_outcome: input.outcome,
      p_reason: input.reason,
      p_idempotency_key: parsed.idempotencyKey,
      p_expected_payload_digest: digest.digest,
      p_approval_id: parsed.approvalId,
    });
  }

  return adminJson({ error: 'PLATFORM_ACTION_NOT_ALLOWED' }, 400);
}
