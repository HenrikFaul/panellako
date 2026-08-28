'use server';

import { revalidatePath } from 'next/cache';
import {
  assertUnitInWorkspace,
  authorizationMessage,
  requireAuthenticatedUser,
  requireWorkspaceAccess,
  requireWorkspaceCapability,
} from '@/lib/authorization/guards';
import { hasWorkspaceCapability } from '@/lib/authorization/capabilities';
import { isWorkspaceId } from '@/lib/authorization/workspace-context';
import { sanitizeReturnTo } from '@/lib/auth/return-to';

export type WorkspaceUnitCategory = 'APARTMENT' | 'GARAGE' | 'STORAGE' | 'COMMERCIAL' | 'OTHER';
export type WorkspaceRelationshipType =
  | 'OWNER'
  | 'OWNER_OCCUPANT'
  | 'TENANT'
  | 'HOUSEHOLD_MEMBER'
  | 'AUTHORIZED_OCCUPANT';
export type JoinReviewDecision = 'APPROVE' | 'REJECT' | 'NEEDS_EVIDENCE' | 'COUNTER_OFFER';
export type AssignableWorkspaceRole =
  | 'DELEGATE_OPERATIONS'
  | 'COMMITTEE_OVERSIGHT'
  | 'ACCOUNTANT'
  | 'BILLING_ADMIN';

export interface WorkspaceAdminUnit {
  id: string;
  designation: string;
  category: WorkspaceUnitCategory;
}

export interface WorkspaceAdminInvitation {
  id: string;
  email: string;
  unitId: string;
  relationshipType: WorkspaceRelationshipType;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface WorkspaceStaffInvitation {
  id: string;
  email: string;
  roleKey: AssignableWorkspaceRole;
  capabilityKeys: string[];
  status: string;
  expiresAt: string;
  validTo: string | null;
  createdAt: string;
}

export interface WorkspaceJoinRequest {
  id: string;
  status: string;
  relationshipType: WorkspaceRelationshipType;
  unitId: string;
  unitDesignation: string;
  requesterDisplayName: string;
  submittedAt: string;
  expiresAt: string;
  latestOfferId: string | null;
  latestOfferRelationshipType: WorkspaceRelationshipType | null;
  latestOfferUnitId: string | null;
}

export interface WorkspaceAdminMember {
  membershipId: string;
  profileId: string;
  displayName: string;
  status: string;
  primaryUnitDesignation: string | null;
  roleKeys: string[];
}

export interface WorkspaceAdminRoleAssignment {
  id: string;
  membershipId: string;
  profileId: string;
  displayName: string;
  primaryUnitDesignation: string | null;
  roleKey: AssignableWorkspaceRole;
  status: string;
  validTo: string | null;
  createdAt: string;
}

export interface WorkspaceAdminPermissions {
  canManageUnits: boolean;
  canInviteMembers: boolean;
  canReviewMemberships: boolean;
  canGrantLimitedRoles: boolean;
}

export interface WorkspaceAdminSnapshot {
  workspaceId: string;
  workspaceName: string;
  address: string;
  permissions: WorkspaceAdminPermissions;
  units: WorkspaceAdminUnit[];
  invitations: WorkspaceAdminInvitation[];
  staffInvitations: WorkspaceStaffInvitation[];
  joinRequests: WorkspaceJoinRequest[];
  members: WorkspaceAdminMember[];
  roleAssignments: WorkspaceAdminRoleAssignment[];
}

export interface WorkspaceAdminActionResult<T = never> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  mfaRequired?: boolean;
  stepUpHref?: string;
}

export interface CreateWorkspaceUnitInput {
  workspaceId: string;
  designation: string;
  category: WorkspaceUnitCategory;
  parentUnitId?: string | null;
  idempotencyKey: string;
}

export interface IssueMembershipInvitationInput {
  workspaceId: string;
  email: string;
  unitId: string;
  relationshipType: WorkspaceRelationshipType;
  expiresAt: string;
  idempotencyKey: string;
}

export interface IssueWorkspaceStaffInvitationInput {
  workspaceId: string;
  email: string;
  roleKey: AssignableWorkspaceRole;
  capabilityKeys?: string[];
  expiresAt: string;
  validTo?: string | null;
  idempotencyKey: string;
}

export interface ReviewWorkspaceJoinRequestInput {
  workspaceId: string;
  requestId: string;
  decision: JoinReviewDecision;
  offeredRelationshipType?: WorkspaceRelationshipType | null;
  offeredUnitId?: string | null;
  reason?: string | null;
  idempotencyKey: string;
}

export interface GrantWorkspaceRoleInput {
  workspaceId: string;
  profileId: string;
  roleKey: AssignableWorkspaceRole;
  capabilityKeys?: string[];
  validTo?: string | null;
  idempotencyKey: string;
}

export interface RevokeWorkspaceRoleInput {
  workspaceId: string;
  roleAssignmentId: string;
  reason: string;
  idempotencyKey: string;
}

export interface AcceptJoinRequestCounterOfferInput {
  requestId: string;
  offerId: string;
  returnTo?: string | null;
}

interface RpcErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

type UnknownRow = Record<string, unknown>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNIT_CATEGORIES = new Set<WorkspaceUnitCategory>(['APARTMENT', 'GARAGE', 'STORAGE', 'COMMERCIAL', 'OTHER']);
const RELATIONSHIP_TYPES = new Set<WorkspaceRelationshipType>([
  'OWNER',
  'OWNER_OCCUPANT',
  'TENANT',
  'HOUSEHOLD_MEMBER',
  'AUTHORIZED_OCCUPANT',
]);
const REVIEW_DECISIONS = new Set<JoinReviewDecision>(['APPROVE', 'REJECT', 'NEEDS_EVIDENCE', 'COUNTER_OFFER']);
const ASSIGNABLE_ROLES = new Set<AssignableWorkspaceRole>([
  'DELEGATE_OPERATIONS',
  'COMMITTEE_OVERSIGHT',
  'ACCOUNTANT',
  'BILLING_ADMIN',
]);
const DELEGATE_CAPABILITIES = new Set([
  'workspace.read',
  'building.read',
  'unit.directory.read_masked',
  'unit.read_all',
  'member.directory.read_minimal',
  'membership.invite',
  'membership.approve',
  'ticket.manage_all',
  'document.publish',
  'announcement.publish',
  'meter.manage_all',
]);
const MISSING_RPC_CODES = new Set(['42883', 'PGRST202']);

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function firstRow(value: unknown): UnknownRow | null {
  const row = Array.isArray(value) ? value[0] : value;
  return typeof row === 'object' && row !== null && !Array.isArray(row)
    ? row as UnknownRow
    : null;
}

function textValue(row: UnknownRow, key: string, fallback = ''): string {
  const value = row[key];
  return typeof value === 'string' ? value : fallback;
}

function nullableTextValue(row: UnknownRow, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' && value ? value : null;
}

function extractRpcErrorCode(error: RpcErrorLike | null | undefined): string | null {
  if (!error) return null;
  const candidates = [error.details, error.message, error.hint].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as { error_code?: unknown };
      if (typeof parsed.error_code === 'string') return parsed.error_code;
    } catch {
      const match = candidate.match(/"error_code"\s*:\s*"([A-Z0-9_]+)"/);
      if (match?.[1]) return match[1];
    }
  }
  return null;
}

function rpcFailure<T>(
  error: RpcErrorLike,
  workspaceId: string | null,
  fallback: string,
): WorkspaceAdminActionResult<T> {
  const errorCode = extractRpcErrorCode(error) ?? error.code ?? 'RPC_FAILED';
  const safeReturnTo = workspaceId && isWorkspaceId(workspaceId)
    ? sanitizeReturnTo(`/w/${workspaceId}/admin`, '/app')
    : '/onboarding';

  if (errorCode === 'MFA_STEP_UP_REQUIRED') {
    return {
      success: false,
      error: 'A művelet megerősítéséhez friss kétlépcsős azonosítás szükséges.',
      errorCode,
      mfaRequired: true,
      stepUpHref: `/account/security?next=${encodeURIComponent(safeReturnTo)}`,
    };
  }
  if (MISSING_RPC_CODES.has(errorCode)) {
    return {
      success: false,
      error: 'Rendszerfrissítés szükséges: ez a kezelői művelet még nem érhető el ezen a telepítésen.',
      errorCode,
    };
  }

  const knownMessages: Record<string, string> = {
    SELF_APPROVAL_FORBIDDEN: 'Saját csatlakozási kérelmet nem hagyhatsz jóvá.',
    JOIN_REQUEST_NOT_REVIEWABLE: 'A kérelem állapota közben megváltozott; frissítsd az oldalt.',
    COUNTER_OFFER_INVALID: 'Az ellenajánlat albetétje vagy lakói jogviszonya érvénytelen.',
    PARENT_UNIT_NOT_AVAILABLE: 'A kapcsolt albetét nem ehhez a lakóközösséghez tartozik.',
    MEMBERSHIP_INVITATION_INVALID: 'A meghívás adatai vagy lejárata érvénytelen.',
    OWNER_SELF_INVITATION_FORBIDDEN: 'Saját e-mail-címedre nem küldhetsz tulajdonosi meghívást.',
    MEMBERSHIP_INVITER_AUTHORITY_REQUIRED: 'A meghíváshoz ellenőrzött, workspace-szintű kezelői jogosultság szükséges.',
    INVITATION_GRANTOR_AUTHORITY_EXPIRED: 'A meghívó kezelői jogosultsága időközben megszűnt; kérj új meghívást.',
    DIRECT_ADMIN_GRANT_REQUIRED: 'Szerepkört csak közvetlen, érvényes kezelési mandátummal rendelkező admin adhat.',
    TARGET_MEMBERSHIP_REQUIRED: 'A kiválasztott személy nem aktív tagja ennek a lakóközösségnek.',
    DELEGATION_CAPABILITY_FORBIDDEN: 'A kiválasztott delegált jogosultságok túllépik az átadható keretet.',
    ADMIN_ROLE_STAFF_INVITATION_FORBIDDEN: 'Adminisztrátori szerepkör nem adható staff-meghívással.',
    DIRECT_VERIFIED_ADMIN_REQUIRED: 'Staffot csak közvetlen, ellenőrzött mandátummal rendelkező admin hívhat meg.',
    STAFF_INVITATION_INVALID: 'A staff-meghívás adatai vagy lejárata érvénytelen.',
    STAFF_ROLE_CAPABILITY_AMPLIFICATION_FORBIDDEN: 'A meghívás nem adhat több jogosultságot annál, amellyel a meghívó rendelkezik.',
    IDEMPOTENCY_CONFLICT: 'Ez a kérésazonosító már egy másik meghíváshoz tartozik.',
    ROLE_ASSIGNMENT_NOT_FOUND: 'A szerepkör-hozzárendelés már nem aktív vagy nem található.',
    COUNTER_OFFER_NOT_AVAILABLE: 'Az ellenajánlat már nem érhető el.',
  };

  return {
    success: false,
    error: knownMessages[errorCode] ?? fallback,
    errorCode,
  };
}

function validationFailure<T>(message: string): WorkspaceAdminActionResult<T> {
  return { success: false, error: message, errorCode: 'INPUT_INVALID' };
}

function refreshAdmin(workspaceId: string): void {
  revalidatePath(`/w/${workspaceId}/admin`);
  revalidatePath(`/w/${workspaceId}`);
}

export async function getWorkspaceAdminSnapshot(
  workspaceId: string,
): Promise<WorkspaceAdminActionResult<WorkspaceAdminSnapshot>> {
  if (!isWorkspaceId(workspaceId)) return validationFailure('Érvénytelen lakóközösség-azonosító.');

  try {
    const [{ supabase }, context] = await Promise.all([
      requireAuthenticatedUser(),
      requireWorkspaceAccess(workspaceId),
    ]);
    const permissions: WorkspaceAdminPermissions = {
      canManageUnits: hasWorkspaceCapability(context, 'unit.manage'),
      canInviteMembers: hasWorkspaceCapability(context, 'membership.invite'),
      canReviewMemberships: hasWorkspaceCapability(context, 'membership.approve'),
      canGrantLimitedRoles: hasWorkspaceCapability(context, 'role.grant_limited'),
    };

    if (!Object.values(permissions).some(Boolean)) {
      return { success: false, error: 'Ehhez a kezelőfelülethez nincs jogosultságod.', errorCode: 'CAPABILITY_REQUIRED' };
    }

    const needsUnits = permissions.canManageUnits || permissions.canInviteMembers || permissions.canReviewMemberships;
    const unitsPromise = needsUnits
      ? supabase
        .from('units')
        .select('id, designation, unit_label, unit_category, status')
        .eq('workspace_id', workspaceId)
        .eq('status', 'ACTIVE')
        .order('designation', { ascending: true })
      : Promise.resolve({ data: [], error: null });
    const invitationsPromise = permissions.canInviteMembers
      ? supabase
        .from('membership_invitations')
        .select('id, invited_email_normalized, unit_id, relationship_type, status, expires_at, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(100)
      : Promise.resolve({ data: [], error: null });
    const staffInvitationsPromise = permissions.canGrantLimitedRoles
      ? supabase
        .from('workspace_staff_invitations')
        .select('id, invited_email_normalized, role_key, capability_keys, status, expires_at, assignment_valid_to, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(100)
      : Promise.resolve({ data: [], error: null });
    const joinRequestsPromise = permissions.canReviewMemberships
      ? supabase.rpc('list_workspace_join_requests', { p_workspace_id: workspaceId })
      : Promise.resolve({ data: [], error: null });
    const membersPromise = permissions.canGrantLimitedRoles
      ? supabase.rpc('list_workspace_members', { p_workspace_id: workspaceId })
      : Promise.resolve({ data: [], error: null });
    const rolesPromise = permissions.canGrantLimitedRoles
      ? supabase
        .from('role_assignments')
        .select('id, membership_id, role_key, status, valid_to, created_at')
        .eq('workspace_id', workspaceId)
        .eq('status', 'ACTIVE')
        .in('role_key', Array.from(ASSIGNABLE_ROLES))
        .order('created_at', { ascending: false })
        .limit(1000)
      : Promise.resolve({ data: [], error: null });

    const [unitsResult, invitationsResult, staffInvitationsResult, joinRequestsResult, membersResult, rolesResult] = await Promise.all([
      unitsPromise,
      invitationsPromise,
      staffInvitationsPromise,
      joinRequestsPromise,
      membersPromise,
      rolesPromise,
    ]);

    const readError = unitsResult.error
      ?? invitationsResult.error
      ?? staffInvitationsResult.error
      ?? joinRequestsResult.error
      ?? membersResult.error
      ?? rolesResult.error;
    if (readError) {
      return rpcFailure(readError, workspaceId, 'A kezelői adatok betöltése most nem sikerült.');
    }

    const members = ((membersResult.data ?? []) as UnknownRow[]).map((row) => ({
      membershipId: textValue(row, 'membership_id'),
      profileId: textValue(row, 'profile_id'),
      displayName: textValue(row, 'display_name') || 'Regisztrált felhasználó',
      status: textValue(row, 'membership_status'),
      primaryUnitDesignation: nullableTextValue(row, 'primary_unit_designation'),
      roleKeys: Array.isArray(row.role_keys)
        ? row.role_keys.filter((value): value is string => typeof value === 'string')
        : [],
    })).filter((member) => isUuid(member.membershipId) && isUuid(member.profileId) && member.status === 'ACTIVE');
    const memberByMembership = new Map(members.map((member) => [member.membershipId, member]));

    return {
      success: true,
      data: {
        workspaceId,
        workspaceName: context.workspaceName,
        address: context.address,
        permissions,
        units: ((unitsResult.data ?? []) as UnknownRow[]).map((row) => ({
          id: textValue(row, 'id'),
          designation: textValue(row, 'designation') || textValue(row, 'unit_label') || 'Albetét',
          category: textValue(row, 'unit_category', 'APARTMENT') as WorkspaceUnitCategory,
        })).filter((unit) => isUuid(unit.id) && UNIT_CATEGORIES.has(unit.category)),
        invitations: ((invitationsResult.data ?? []) as UnknownRow[]).map((row) => ({
          id: textValue(row, 'id'),
          email: textValue(row, 'invited_email_normalized'),
          unitId: textValue(row, 'unit_id'),
          relationshipType: textValue(row, 'relationship_type') as WorkspaceRelationshipType,
          status: textValue(row, 'status'),
          expiresAt: textValue(row, 'expires_at'),
          createdAt: textValue(row, 'created_at'),
        })).filter((invitation) => isUuid(invitation.id) && RELATIONSHIP_TYPES.has(invitation.relationshipType)),
        staffInvitations: ((staffInvitationsResult.data ?? []) as UnknownRow[]).map((row) => {
          const expiresAt = textValue(row, 'expires_at');
          const storedStatus = textValue(row, 'status');
          return {
            id: textValue(row, 'id'),
            email: textValue(row, 'invited_email_normalized'),
            roleKey: textValue(row, 'role_key') as AssignableWorkspaceRole,
            capabilityKeys: Array.isArray(row.capability_keys)
              ? row.capability_keys.filter((value): value is string => typeof value === 'string')
              : [],
            status: storedStatus === 'PENDING' && Date.parse(expiresAt) <= Date.now()
              ? 'EXPIRED'
              : storedStatus,
            expiresAt,
            validTo: nullableTextValue(row, 'assignment_valid_to'),
            createdAt: textValue(row, 'created_at'),
          };
        }).filter((invitation) => isUuid(invitation.id) && ASSIGNABLE_ROLES.has(invitation.roleKey)),
        joinRequests: ((joinRequestsResult.data ?? []) as UnknownRow[]).map((row) => ({
          id: textValue(row, 'request_id'),
          status: textValue(row, 'request_status'),
          relationshipType: textValue(row, 'requested_relationship_type') as WorkspaceRelationshipType,
          unitId: textValue(row, 'requested_unit_id'),
          unitDesignation: textValue(row, 'unit_designation') || 'Albetét',
          requesterDisplayName: textValue(row, 'requester_display_name') || 'Regisztrált felhasználó',
          submittedAt: textValue(row, 'submitted_at'),
          expiresAt: textValue(row, 'expires_at'),
          latestOfferId: nullableTextValue(row, 'latest_offer_id'),
          latestOfferRelationshipType: nullableTextValue(row, 'latest_offer_relationship_type') as WorkspaceRelationshipType | null,
          latestOfferUnitId: nullableTextValue(row, 'latest_offer_unit_id'),
        })).filter((request) => isUuid(request.id) && RELATIONSHIP_TYPES.has(request.relationshipType)),
        members,
        roleAssignments: ((rolesResult.data ?? []) as UnknownRow[]).map((row) => ({
          id: textValue(row, 'id'),
          membershipId: textValue(row, 'membership_id'),
          profileId: memberByMembership.get(textValue(row, 'membership_id'))?.profileId ?? '',
          displayName: memberByMembership.get(textValue(row, 'membership_id'))?.displayName ?? 'Regisztrált felhasználó',
          primaryUnitDesignation: memberByMembership.get(textValue(row, 'membership_id'))?.primaryUnitDesignation ?? null,
          roleKey: textValue(row, 'role_key') as AssignableWorkspaceRole,
          status: textValue(row, 'status'),
          validTo: nullableTextValue(row, 'valid_to'),
          createdAt: textValue(row, 'created_at'),
        })).filter((assignment) => isUuid(assignment.id) && isUuid(assignment.profileId) && ASSIGNABLE_ROLES.has(assignment.roleKey)),
      },
    };
  } catch (error) {
    return { success: false, error: authorizationMessage(error), errorCode: 'AUTHORIZATION_FAILED' };
  }
}

export async function createWorkspaceUnit(
  input: CreateWorkspaceUnitInput,
): Promise<WorkspaceAdminActionResult<{ unitId: string }>> {
  const designation = input.designation.trim();
  if (!isWorkspaceId(input.workspaceId) || !isUuid(input.idempotencyKey)) {
    return validationFailure('Érvénytelen kérésazonosító vagy lakóközösség.');
  }
  if (designation.length < 1 || designation.length > 120 || !UNIT_CATEGORIES.has(input.category)) {
    return validationFailure('Az albetét megnevezése 1–120 karakter legyen, és válassz érvényes kategóriát.');
  }
  if (input.parentUnitId && !isUuid(input.parentUnitId)) {
    return validationFailure('A kapcsolt albetét azonosítója érvénytelen.');
  }

  try {
    const [context, { supabase }] = await Promise.all([
      requireWorkspaceCapability(input.workspaceId, 'unit.manage'),
      requireAuthenticatedUser(),
    ]);
    if (input.parentUnitId) await assertUnitInWorkspace(input.parentUnitId, context.workspaceId);

    const { data, error } = await supabase.rpc('create_workspace_unit', {
      p_workspace_id: context.workspaceId,
      p_designation: designation,
      p_unit_category: input.category,
      p_parent_unit_id: input.parentUnitId || null,
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) return rpcFailure(error, context.workspaceId, 'Az albetét létrehozása most nem sikerült.');

    const row = firstRow(data);
    const unitId = row ? textValue(row, 'unit_id') : '';
    if (!isUuid(unitId)) return { success: false, error: 'A szerver nem adott vissza érvényes albetét-azonosítót.', errorCode: 'RPC_RESPONSE_INVALID' };
    refreshAdmin(context.workspaceId);
    return { success: true, data: { unitId } };
  } catch (error) {
    return { success: false, error: authorizationMessage(error), errorCode: 'AUTHORIZATION_FAILED' };
  }
}

export async function issueWorkspaceMembershipInvitation(
  input: IssueMembershipInvitationInput,
): Promise<WorkspaceAdminActionResult<{ invitationId: string; token: string; expiresAt: string }>> {
  const email = input.email.trim().toLowerCase();
  const expiresAtMs = Date.parse(input.expiresAt);
  if (!isWorkspaceId(input.workspaceId) || !isUuid(input.unitId) || !isUuid(input.idempotencyKey)) {
    return validationFailure('Érvénytelen lakóközösség-, albetét- vagy kérésazonosító.');
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email) || !RELATIONSHIP_TYPES.has(input.relationshipType)) {
    return validationFailure('Adj meg érvényes e-mail-címet és lakói jogviszonyt.');
  }
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now() || expiresAtMs > Date.now() + 90 * 86_400_000) {
    return validationFailure('A meghívás lejárata a következő 90 napra essen.');
  }

  try {
    const [context, { supabase }] = await Promise.all([
      requireWorkspaceCapability(input.workspaceId, 'membership.invite'),
      requireAuthenticatedUser(),
    ]);
    await assertUnitInWorkspace(input.unitId, context.workspaceId);
    const { data, error } = await supabase.rpc('issue_membership_invitation', {
      p_workspace_id: context.workspaceId,
      p_email: email,
      p_unit_id: input.unitId,
      p_relationship_type: input.relationshipType,
      p_expires_at: new Date(expiresAtMs).toISOString(),
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) return rpcFailure(error, context.workspaceId, 'A meghívás létrehozása most nem sikerült.');

    const row = firstRow(data);
    const invitationId = row ? textValue(row, 'invitation_id') : '';
    const token = row ? textValue(row, 'invitation_token') : '';
    const expiresAt = row ? textValue(row, 'expires_at') : '';
    if (!isUuid(invitationId)) return { success: false, error: 'A szerver nem adott vissza érvényes meghívást.', errorCode: 'RPC_RESPONSE_INVALID' };
    refreshAdmin(context.workspaceId);
    return { success: true, data: { invitationId, token, expiresAt } };
  } catch (error) {
    return { success: false, error: authorizationMessage(error), errorCode: 'AUTHORIZATION_FAILED' };
  }
}

export async function issueWorkspaceStaffInvitation(
  input: IssueWorkspaceStaffInvitationInput,
): Promise<WorkspaceAdminActionResult<{
  invitationId: string;
  token: string;
  status: string;
  expiresAt: string;
  roleKey: AssignableWorkspaceRole;
}>> {
  const email = input.email.trim().toLowerCase();
  const expiresAtMs = Date.parse(input.expiresAt);
  const validToMs = input.validTo ? Date.parse(input.validTo) : null;
  const capabilityKeys = Array.from(new Set(input.capabilityKeys ?? []));

  if (!isWorkspaceId(input.workspaceId) || !isUuid(input.idempotencyKey) || !ASSIGNABLE_ROLES.has(input.roleKey)) {
    return validationFailure('A lakóközösség, a staff-szerepkör vagy a kérésazonosító érvénytelen.');
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return validationFailure('Adj meg érvényes staff e-mail-címet.');
  }
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now() || expiresAtMs > Date.now() + 90 * 86_400_000) {
    return validationFailure('A staff-meghívás lejárata a következő 90 napra essen.');
  }
  if (validToMs !== null && (!Number.isFinite(validToMs) || validToMs <= expiresAtMs)) {
    return validationFailure('A szerepkör lejárata legyen későbbi a meghívás lejáratánál.');
  }
  if (input.roleKey !== 'DELEGATE_OPERATIONS' && capabilityKeys.length > 0) {
    return validationFailure('Egyedi jogosultsági kör csak megbízott staffnál adható.');
  }
  if (capabilityKeys.length > 32 || capabilityKeys.some((capability) => !DELEGATE_CAPABILITIES.has(capability))) {
    return validationFailure('A kiválasztott staff-jogosultság nem delegálható ezen a felületen.');
  }

  try {
    const [context, { supabase }] = await Promise.all([
      requireWorkspaceCapability(input.workspaceId, 'role.grant_limited'),
      requireAuthenticatedUser(),
    ]);
    const { data, error } = await supabase.rpc('issue_workspace_staff_invitation', {
      p_workspace_id: context.workspaceId,
      p_email: email,
      p_role_key: input.roleKey,
      p_capability_keys: capabilityKeys.length > 0 ? capabilityKeys : null,
      p_expires_at: new Date(expiresAtMs).toISOString(),
      p_assignment_valid_to: validToMs === null ? null : new Date(validToMs).toISOString(),
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) return rpcFailure(error, context.workspaceId, 'A staff-meghívás létrehozása most nem sikerült.');

    const row = firstRow(data);
    const invitationId = row ? textValue(row, 'invitation_id') : '';
    const token = row ? textValue(row, 'invitation_token') : '';
    const status = row ? textValue(row, 'invitation_status') : '';
    const expiresAt = row ? textValue(row, 'expires_at') : '';
    const roleKey = row ? textValue(row, 'role_key') as AssignableWorkspaceRole : input.roleKey;
    if (!isUuid(invitationId) || !status || !ASSIGNABLE_ROLES.has(roleKey)) {
      return { success: false, error: 'A szerver nem adott vissza érvényes staff-meghívást.', errorCode: 'RPC_RESPONSE_INVALID' };
    }

    refreshAdmin(context.workspaceId);
    return { success: true, data: { invitationId, token, status, expiresAt, roleKey } };
  } catch (error) {
    return { success: false, error: authorizationMessage(error), errorCode: 'AUTHORIZATION_FAILED' };
  }
}

export async function reviewWorkspaceJoinRequest(
  input: ReviewWorkspaceJoinRequestInput,
): Promise<WorkspaceAdminActionResult<{ requestId: string; status: string }>> {
  const reason = input.reason?.trim() || null;
  if (!isWorkspaceId(input.workspaceId) || !isUuid(input.requestId) || !isUuid(input.idempotencyKey) || !REVIEW_DECISIONS.has(input.decision)) {
    return validationFailure('A csatlakozási kérelem vagy a döntés érvénytelen.');
  }
  if (reason && reason.length > 1000) return validationFailure('Az indoklás legfeljebb 1000 karakter lehet.');
  if (['REJECT', 'NEEDS_EVIDENCE'].includes(input.decision) && !reason) {
    return validationFailure('Ehhez a döntéshez rövid indoklás szükséges.');
  }
  if (input.decision === 'COUNTER_OFFER') {
    if (!input.offeredUnitId || !isUuid(input.offeredUnitId) || !input.offeredRelationshipType || !RELATIONSHIP_TYPES.has(input.offeredRelationshipType)) {
      return validationFailure('Az ellenajánlathoz válassz albetétet és lakói jogviszonyt.');
    }
  }

  try {
    const [context, { supabase }] = await Promise.all([
      requireWorkspaceCapability(input.workspaceId, 'membership.approve'),
      requireAuthenticatedUser(),
    ]);
    if (input.decision === 'COUNTER_OFFER' && input.offeredUnitId) {
      await assertUnitInWorkspace(input.offeredUnitId, context.workspaceId);
    }
    const { data, error } = await supabase.rpc('review_join_request', {
      p_request_id: input.requestId,
      p_decision: input.decision,
      p_offered_relationship_type: input.decision === 'COUNTER_OFFER' ? input.offeredRelationshipType : null,
      p_offered_unit_id: input.decision === 'COUNTER_OFFER' ? input.offeredUnitId : null,
      p_reason: reason,
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) return rpcFailure(error, context.workspaceId, 'A csatlakozási kérelem feldolgozása most nem sikerült.');

    const row = firstRow(data);
    const requestId = row ? textValue(row, 'request_id') : '';
    const status = row ? textValue(row, 'request_status') : '';
    if (!isUuid(requestId) || !status) return { success: false, error: 'A szerver válasza nem volt értelmezhető.', errorCode: 'RPC_RESPONSE_INVALID' };
    refreshAdmin(context.workspaceId);
    return { success: true, data: { requestId, status } };
  } catch (error) {
    return { success: false, error: authorizationMessage(error), errorCode: 'AUTHORIZATION_FAILED' };
  }
}

export async function grantWorkspaceRole(
  input: GrantWorkspaceRoleInput,
): Promise<WorkspaceAdminActionResult<{ roleAssignmentId: string; status: string }>> {
  if (!isWorkspaceId(input.workspaceId) || !isUuid(input.profileId) || !isUuid(input.idempotencyKey) || !ASSIGNABLE_ROLES.has(input.roleKey)) {
    return validationFailure('A tag, a szerepkör vagy a kérésazonosító érvénytelen.');
  }
  const validToMs = input.validTo ? Date.parse(input.validTo) : null;
  if (validToMs !== null && (!Number.isFinite(validToMs) || validToMs <= Date.now())) {
    return validationFailure('A szerepkör lejárata csak jövőbeli időpont lehet.');
  }
  const capabilityKeys = Array.from(new Set(input.capabilityKeys ?? []));
  if (input.roleKey !== 'DELEGATE_OPERATIONS' && capabilityKeys.length > 0) {
    return validationFailure('Egyedi jogosultsági kör csak megbízott szerepkörnél adható.');
  }
  if (capabilityKeys.some((capability) => !DELEGATE_CAPABILITIES.has(capability))) {
    return validationFailure('A kiválasztott jogosultság nem delegálható ezen a felületen.');
  }

  try {
    const [context, { supabase }] = await Promise.all([
      requireWorkspaceCapability(input.workspaceId, 'role.grant_limited'),
      requireAuthenticatedUser(),
    ]);
    const { data, error } = await supabase.rpc('grant_workspace_role', {
      p_workspace_id: context.workspaceId,
      p_profile_id: input.profileId,
      p_role_key: input.roleKey,
      p_capability_keys: capabilityKeys.length > 0 ? capabilityKeys : null,
      p_valid_to: validToMs === null ? null : new Date(validToMs).toISOString(),
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) return rpcFailure(error, context.workspaceId, 'A szerepkör hozzárendelése most nem sikerült.');

    const row = firstRow(data);
    const roleAssignmentId = row ? textValue(row, 'role_assignment_id') : '';
    const status = row ? textValue(row, 'assignment_status') : '';
    if (!isUuid(roleAssignmentId) || !status) return { success: false, error: 'A szerver válasza nem volt értelmezhető.', errorCode: 'RPC_RESPONSE_INVALID' };
    refreshAdmin(context.workspaceId);
    return { success: true, data: { roleAssignmentId, status } };
  } catch (error) {
    return { success: false, error: authorizationMessage(error), errorCode: 'AUTHORIZATION_FAILED' };
  }
}

export async function revokeWorkspaceRole(
  input: RevokeWorkspaceRoleInput,
): Promise<WorkspaceAdminActionResult<{ roleAssignmentId: string; status: string }>> {
  const reason = input.reason.trim();
  if (!isWorkspaceId(input.workspaceId) || !isUuid(input.roleAssignmentId) || !isUuid(input.idempotencyKey)) {
    return validationFailure('A szerepkör-hozzárendelés vagy a kérésazonosító érvénytelen.');
  }
  if (reason.length < 3 || reason.length > 1000) return validationFailure('A visszavonás indoklása 3–1000 karakter legyen.');

  try {
    const [context, { supabase }] = await Promise.all([
      requireWorkspaceCapability(input.workspaceId, 'role.grant_limited'),
      requireAuthenticatedUser(),
    ]);
    const { data, error } = await supabase.rpc('revoke_workspace_role', {
      p_workspace_id: context.workspaceId,
      p_role_assignment_id: input.roleAssignmentId,
      p_reason: reason,
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) return rpcFailure(error, context.workspaceId, 'A szerepkör visszavonása most nem sikerült.');

    const row = firstRow(data);
    const roleAssignmentId = row ? textValue(row, 'role_assignment_id') : '';
    const status = row ? textValue(row, 'assignment_status') : '';
    if (!isUuid(roleAssignmentId) || !status) return { success: false, error: 'A szerver válasza nem volt értelmezhető.', errorCode: 'RPC_RESPONSE_INVALID' };
    refreshAdmin(context.workspaceId);
    return { success: true, data: { roleAssignmentId, status } };
  } catch (error) {
    return { success: false, error: authorizationMessage(error), errorCode: 'AUTHORIZATION_FAILED' };
  }
}

export async function acceptJoinRequestCounterOffer(
  input: AcceptJoinRequestCounterOfferInput,
): Promise<WorkspaceAdminActionResult<{ requestId: string; status: string }>> {
  if (!isUuid(input.requestId) || !isUuid(input.offerId)) {
    return validationFailure('Az ellenajánlat azonosítója érvénytelen.');
  }

  try {
    const { supabase } = await requireAuthenticatedUser();
    const { data, error } = await supabase.rpc('accept_join_request_offer', {
      p_request_id: input.requestId,
      p_offer_id: input.offerId,
    });
    if (error) return rpcFailure(error, null, 'Az ellenajánlat elfogadása most nem sikerült.');

    const row = firstRow(data);
    const requestId = row ? textValue(row, 'request_id') : '';
    const status = row ? textValue(row, 'request_status') : '';
    if (!isUuid(requestId) || !status) return { success: false, error: 'A szerver válasza nem volt értelmezhető.', errorCode: 'RPC_RESPONSE_INVALID' };
    revalidatePath(sanitizeReturnTo(input.returnTo, '/onboarding'));
    return { success: true, data: { requestId, status } };
  } catch (error) {
    return { success: false, error: authorizationMessage(error), errorCode: 'AUTHORIZATION_FAILED' };
  }
}
