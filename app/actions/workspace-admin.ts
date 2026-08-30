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
export type WorkspaceRelationshipKind = 'OWNERSHIP' | 'OCCUPANCY';
export type WorkspaceRelationshipReviewDecision = 'VERIFY' | 'DISPUTE' | 'END';
export type WorkspaceMembershipTargetStatus = 'ACTIVE' | 'SUSPENDED' | 'ENDED';
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
  shareNumerator: number | null;
  shareDenominator: number | null;
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
  shareNumerator: number | null;
  shareDenominator: number | null;
  unitId: string;
  unitDesignation: string;
  requesterDisplayName: string;
  submittedAt: string;
  expiresAt: string;
  latestOfferId: string | null;
  latestOfferRelationshipType: WorkspaceRelationshipType | null;
  latestOfferUnitId: string | null;
  latestOfferShareNumerator: number | null;
  latestOfferShareDenominator: number | null;
}

export interface WorkspaceAdminMember {
  membershipId: string;
  profileId: string;
  displayName: string;
  status: string;
  primaryUnitDesignation: string | null;
  roleKeys: string[];
}

export interface WorkspaceUnitRelationship {
  relationshipKind: WorkspaceRelationshipKind;
  relationshipId: string;
  subjectPartyId: string;
  personId: string | null;
  profileId: string | null;
  displayName: string;
  unitId: string;
  unitDesignation: string;
  relationshipType: string;
  status: string;
  shareNumerator: number | null;
  shareDenominator: number | null;
  verifiedAt: string | null;
  evidenceReference: string | null;
  source: string;
  validFrom: string;
  validTo: string | null;
  endedReason: string | null;
  createdAt: string;
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
  canManageRelationships: boolean;
  canSuspendMemberships: boolean;
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
  relationships: WorkspaceUnitRelationship[];
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

export interface WorkspaceUnitImportRowInput {
  rowNumber: number;
  designation: string;
  unitCategory: string;
  parentDesignation?: string | null;
}

export interface WorkspaceUnitImportPreviewRow {
  rowNumber: number;
  designation: string;
  normalizedDesignation: string;
  unitCategory: string;
  parentDesignation: string | null;
  parentNormalizedDesignation: string | null;
  status: 'READY' | 'CONFLICT' | 'INVALID' | 'IMPORTED';
  errorCode: string | null;
  errorMessage: string | null;
  unitId?: string | null;
}

export interface PreviewWorkspaceUnitImportInput {
  workspaceId: string;
  rows: WorkspaceUnitImportRowInput[];
}

export interface ApplyWorkspaceUnitImportInput extends PreviewWorkspaceUnitImportInput {
  idempotencyKey: string;
}

export interface IssueMembershipInvitationInput {
  workspaceId: string;
  email: string;
  unitId: string;
  relationshipType: WorkspaceRelationshipType;
  shareNumerator?: number | null;
  shareDenominator?: number | null;
  expiresAt: string;
  idempotencyKey: string;
}

export interface RevokeMembershipInvitationInput {
  workspaceId: string;
  invitationId: string;
  reason: string;
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
  offeredShareNumerator?: number | null;
  offeredShareDenominator?: number | null;
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

export interface CreateWorkspacePersonRelationshipInput {
  workspaceId: string;
  personId?: string | null;
  displayName?: string | null;
  unitId: string;
  relationshipType: WorkspaceRelationshipType;
  shareNumerator?: number | null;
  shareDenominator?: number | null;
  evidenceReference: string;
  idempotencyKey: string;
}

export interface ReviewWorkspaceUnitRelationshipInput {
  workspaceId: string;
  relationshipKind: WorkspaceRelationshipKind;
  relationshipId: string;
  decision: WorkspaceRelationshipReviewDecision;
  reason?: string | null;
  evidenceReference?: string | null;
  shareNumerator?: number | null;
  shareDenominator?: number | null;
  idempotencyKey: string;
}

export interface ChangeWorkspaceMembershipStatusInput {
  workspaceId: string;
  membershipId: string;
  targetStatus: WorkspaceMembershipTargetStatus;
  reason: string;
  idempotencyKey: string;
}

export interface AcceptJoinRequestCounterOfferInput {
  requestId: string;
  offerId: string;
  returnTo?: string | null;
}

export interface CancelJoinRequestInput {
  requestId: string;
  expectedVersion: number;
  reason: string;
  idempotencyKey: string;
}

export interface ResubmitJoinRequestEvidenceInput {
  requestId: string;
  expectedVersion: number;
  evidenceReferences: string[];
  reason: string;
  idempotencyKey: string;
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
const EVIDENCE_REFERENCE_PATTERN = /^[a-z][a-z0-9_-]{1,39}:[A-Za-z0-9][A-Za-z0-9._~:/#-]{1,190}$/;
const UNIT_CATEGORIES = new Set<WorkspaceUnitCategory>(['APARTMENT', 'GARAGE', 'STORAGE', 'COMMERCIAL', 'OTHER']);
const RELATIONSHIP_TYPES = new Set<WorkspaceRelationshipType>([
  'OWNER',
  'OWNER_OCCUPANT',
  'TENANT',
  'HOUSEHOLD_MEMBER',
  'AUTHORIZED_OCCUPANT',
]);
const REVIEW_DECISIONS = new Set<JoinReviewDecision>(['APPROVE', 'REJECT', 'NEEDS_EVIDENCE', 'COUNTER_OFFER']);
const RELATIONSHIP_KINDS = new Set<WorkspaceRelationshipKind>(['OWNERSHIP', 'OCCUPANCY']);
const RELATIONSHIP_REVIEW_DECISIONS = new Set<WorkspaceRelationshipReviewDecision>(['VERIFY', 'DISPUTE', 'END']);
const MEMBERSHIP_TARGET_STATUSES = new Set<WorkspaceMembershipTargetStatus>(['ACTIVE', 'SUSPENDED', 'ENDED']);
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
  'membership.suspend',
  'unit_relation.verify',
  'ticket.manage_all',
  'document.publish',
  'announcement.publish',
  'meter.manage_all',
]);
const MISSING_RPC_CODES = new Set(['42883', 'PGRST202']);

function normalizedDelegateCapabilities(values: readonly string[]): string[] {
  const capabilities = new Set(values);
  if (capabilities.has('membership.suspend') || capabilities.has('unit_relation.verify')) {
    capabilities.add('member.directory.read_minimal');
  }
  return Array.from(capabilities);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isOwnershipRelationship(value: WorkspaceRelationshipType | null | undefined): boolean {
  return value === 'OWNER' || value === 'OWNER_OCCUPANT';
}

function isValidOwnershipShare(numerator: unknown, denominator: unknown): boolean {
  return Number.isSafeInteger(numerator)
    && Number.isSafeInteger(denominator)
    && Number(numerator) > 0
    && Number(denominator) > 0
    && Number(numerator) <= Number(denominator);
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

function nullableNumberValue(row: UnknownRow, key: string): number | null {
  const value = row[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function integerValue(row: UnknownRow, key: string): number | null {
  const value = nullableNumberValue(row, key);
  return value !== null && Number.isSafeInteger(value) ? value : null;
}

function booleanValue(row: UnknownRow, key: string): boolean | null {
  const value = row[key];
  return typeof value === 'boolean' ? value : null;
}

function importRowsPayload(rows: WorkspaceUnitImportRowInput[]): UnknownRow[] | null {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 500) return null;
  const payload: UnknownRow[] = [];
  for (const row of rows) {
    if (
      !Number.isSafeInteger(row.rowNumber)
      || row.rowNumber < 1
      || typeof row.designation !== 'string'
      || row.designation.length > 120
      || typeof row.unitCategory !== 'string'
      || row.unitCategory.length > 50
      || (row.parentDesignation != null && (typeof row.parentDesignation !== 'string' || row.parentDesignation.length > 120))
    ) return null;
    payload.push({
      designation: row.designation.trim(),
      unit_category: row.unitCategory.trim().toUpperCase(),
      parent_designation: row.parentDesignation?.trim() || null,
    });
  }
  return payload;
}

function parseUnitImportPreviewRows(value: unknown): WorkspaceUnitImportPreviewRow[] | null {
  if (!Array.isArray(value)) return null;
  const rows: WorkspaceUnitImportPreviewRow[] = [];
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    const row = raw as UnknownRow;
    const rowNumber = integerValue(row, 'row_number');
    const designation = textValue(row, 'designation');
    const normalizedDesignation = textValue(row, 'normalized_designation');
    const unitCategory = textValue(row, 'unit_category');
    const parentDesignation = nullableTextValue(row, 'parent_designation');
    const parentNormalizedDesignation = nullableTextValue(row, 'parent_normalized_designation');
    const status = textValue(row, 'status') as WorkspaceUnitImportPreviewRow['status'];
    const errorCode = nullableTextValue(row, 'error_code');
    const errorMessage = nullableTextValue(row, 'error_message');
    const unitId = nullableTextValue(row, 'unit_id');
    if (
      rowNumber === null
      || !['READY', 'CONFLICT', 'INVALID', 'IMPORTED'].includes(status)
      || (unitId !== null && !isUuid(unitId))
    ) return null;
    rows.push({
      rowNumber,
      designation,
      normalizedDesignation,
      unitCategory,
      parentDesignation,
      parentNormalizedDesignation,
      status,
      errorCode,
      errorMessage,
      unitId,
    });
  }
  return rows;
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
    PERSON_RELATIONSHIP_INPUT_INVALID: 'A személy vagy az albetéti jogviszony adatai érvénytelenek.',
    PERSON_NOT_AVAILABLE_IN_WORKSPACE: 'A kiválasztott személy nem kezelhető ebben a lakóközösségben.',
    PERSON_SCOPE_MISMATCH: 'A kiválasztott személy nem kezelhető ebben a lakóközösségben.',
    PERSON_DISPLAY_NAME_INVALID: 'Új személy felviteléhez érvényes teljes név szükséges.',
    RELATIONSHIP_ALREADY_ACTIVE: 'Ez a személy és albetét közötti jogviszony már aktív.',
    OWNERSHIP_RELATIONSHIP_ALREADY_EXISTS: 'Ehhez a személyhez és albetéthez már tartozik élő tulajdoni kapcsolat.',
    OCCUPANCY_RELATIONSHIP_ALREADY_EXISTS: 'Ehhez a személyhez és albetéthez már tartozik élő bentlakási kapcsolat.',
    OWNERSHIP_SHARE_INVALID: 'A tulajdoni hányad értéke érvénytelen.',
    OWNERSHIP_SHARE_REQUIRED: 'Tulajdonosi jogviszonyhoz kötelező a pontos tulajdoni hányad.',
    OWNERSHIP_SHARE_NOT_APPLICABLE: 'Tulajdoni hányad csak tulajdonosi jogviszonyhoz adható meg.',
    OWNERSHIP_SHARE_EXCEEDED: 'A megadott hányaddal az albetét igazolt tulajdoni hányadai 100% fölé kerülnének.',
    OWNERSHIP_TYPE_SHARE_MISMATCH: 'A tulajdonosi típus nem egyezik a megadott tulajdoni hányaddal.',
    OWNERSHIP_SHARE_DATA_CONFLICT: 'Az albetét meglévő tulajdoni hányadai rendezést igényelnek az új kapcsolat előtt.',
    COUNTER_OFFER_STALE: 'Ez az ellenajánlat már nem aktuális. Töltsd újra a kérelmet a legfrissebb ajánlathoz.',
    JOIN_REQUEST_COUNTER_OFFER_NOT_PENDING: 'A csatlakozási kérelem már nem vár ellenajánlat-elfogadásra.',
    OCCUPANCY_SHARE_FORBIDDEN: 'Bentlakási jogviszonyhoz nem rögzíthető tulajdoni hányad.',
    RELATIONSHIP_NOT_FOUND: 'A jogviszony már nem található ebben a lakóközösségben.',
    RELATIONSHIP_STATE_INVALID: 'A jogviszony állapota közben megváltozott; frissítsd az oldalt.',
    RELATIONSHIP_NOT_REVIEWABLE: 'A jogviszony állapota közben megváltozott; frissítsd az oldalt.',
    RELATIONSHIP_ALREADY_ENDED: 'A jogviszony már lezárult.',
    RELATIONSHIP_REVIEW_INPUT_INVALID: 'A jogviszony vagy a választott művelet érvénytelen.',
    RELATIONSHIP_REVIEW_REASON_INVALID: 'Az indoklás hossza vagy formátuma érvénytelen.',
    RELATIONSHIP_REVIEW_REASON_REQUIRED: 'Ehhez a művelethez indoklás szükséges.',
    RELATIONSHIP_EVIDENCE_INVALID: 'A bizonyíték-hivatkozás formátuma érvénytelen.',
    RELATIONSHIP_EVIDENCE_REQUIRED: 'Az ellenőrzéshez bizonyíték-hivatkozás szükséges.',
    MEMBERSHIP_STATUS_CHANGE_INVALID: 'A tagság nem állítható a kiválasztott állapotba.',
    MEMBERSHIP_STATUS_INPUT_INVALID: 'A tagság vagy a választott célállapot érvénytelen.',
    MEMBERSHIP_STATUS_TRANSITION_INVALID: 'A tagság nem állítható a kiválasztott állapotba.',
    MEMBERSHIP_SELF_CHANGE_FORBIDDEN: 'A saját kezelői tagságodat ezen a felületen nem függesztheted fel és nem zárhatod le.',
    SELF_MEMBERSHIP_STATUS_CHANGE_FORBIDDEN: 'A saját kezelői tagságodat ezen a felületen nem függesztheted fel és nem zárhatod le.',
    LAST_ADMIN_PROTECTION: 'Az utolsó aktív adminisztrátor hozzáférése nem szüntethető meg. Előbb add át a kezelői mandátumot.',
    ACTIVE_ADMIN_ROLE_REQUIRES_TRANSFER: 'Az aktív adminisztrátori szerepkört előbb át kell adni vagy szabályosan vissza kell vonni.',
    MEMBERSHIP_INVITATION_NOT_REVOCABLE: 'A meghívás már nem vonható vissza.',
    MEMBERSHIP_INVITATION_NOT_PENDING: 'A meghívás állapota közben megváltozott; frissítsd az oldalt.',
    JOIN_REQUEST_NOT_CANCELLABLE: 'A csatlakozási kérelem már nem vonható vissza.',
    JOIN_REQUEST_VERSION_CONFLICT: 'A csatlakozási kérelem közben megváltozott; töltsd újra az adatokat.',
    JOIN_REQUEST_NOT_AWAITING_EVIDENCE: 'Ehhez a kérelemhez jelenleg nem pótolható igazolás.',
    JOIN_REQUEST_COUNTER_OFFER_PENDING: 'Előbb fogadd el vagy rendezd a kezelői ellenajánlatot.',
    JOIN_REQUEST_EXPIRED: 'A csatlakozási kérelem lejárt; indíts új kérelmet.',
    IDEMPOTENCY_PAYLOAD_MISMATCH: 'Ez a kérésazonosító már más tartalommal került felhasználásra. Indíts új műveletet.',
    UNIT_IMPORT_INPUT_INVALID: 'A tömeges albetétfelvitel adatai érvénytelenek.',
    UNIT_IMPORT_ROWS_INVALID: 'A tömeges albetétfelvitel adatszerkezete érvénytelen.',
    UNIT_IMPORT_ROWS_REQUIRED: 'Az importhoz legalább egy albetétsor szükséges.',
    UNIT_IMPORT_ROW_LIMIT_EXCEEDED: 'Egy import legfeljebb 500 albetétet tartalmazhat.',
    UNIT_IMPORT_NOT_READY: 'Az import ütközést vagy hibás sort tartalmaz; előbb javítsd az előnézetben jelzett sorokat.',
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

function refreshOnboarding(): void {
  revalidatePath('/onboarding');
  revalidatePath('/app');
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
      canManageRelationships: hasWorkspaceCapability(context, 'unit_relation.verify'),
      canSuspendMemberships: hasWorkspaceCapability(context, 'membership.suspend'),
    };

    if (!Object.values(permissions).some(Boolean)) {
      return { success: false, error: 'Ehhez a kezelőfelülethez nincs jogosultságod.', errorCode: 'CAPABILITY_REQUIRED' };
    }

    const needsUnits = permissions.canManageUnits
      || permissions.canInviteMembers
      || permissions.canReviewMemberships
      || permissions.canManageRelationships;
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
        .select('id, invited_email_normalized, unit_id, relationship_type, share_numerator, share_denominator, status, expires_at, created_at')
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
    const canReadMembers = hasWorkspaceCapability(context, 'member.directory.read_minimal')
      || permissions.canReviewMemberships
      || permissions.canGrantLimitedRoles
      || permissions.canSuspendMemberships;
    const membersPromise = canReadMembers
      ? supabase.rpc('list_workspace_members', { p_workspace_id: workspaceId })
      : Promise.resolve({ data: [], error: null });
    const relationshipsPromise = permissions.canManageRelationships
      ? supabase.rpc('list_workspace_unit_relationships', { p_workspace_id: workspaceId })
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

    const [
      unitsResult,
      invitationsResult,
      staffInvitationsResult,
      joinRequestsResult,
      membersResult,
      relationshipsResult,
      rolesResult,
    ] = await Promise.all([
      unitsPromise,
      invitationsPromise,
      staffInvitationsPromise,
      joinRequestsPromise,
      membersPromise,
      relationshipsPromise,
      rolesPromise,
    ]);

    const readError = unitsResult.error
      ?? invitationsResult.error
      ?? staffInvitationsResult.error
      ?? joinRequestsResult.error
      ?? membersResult.error
      ?? relationshipsResult.error
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
    })).filter((member) => isUuid(member.membershipId) && isUuid(member.profileId) && member.status !== 'ENDED');
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
          shareNumerator: nullableNumberValue(row, 'share_numerator'),
          shareDenominator: nullableNumberValue(row, 'share_denominator'),
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
          shareNumerator: nullableNumberValue(row, 'requested_share_numerator'),
          shareDenominator: nullableNumberValue(row, 'requested_share_denominator'),
          unitId: textValue(row, 'requested_unit_id'),
          unitDesignation: textValue(row, 'unit_designation') || 'Albetét',
          requesterDisplayName: textValue(row, 'requester_display_name') || 'Regisztrált felhasználó',
          submittedAt: textValue(row, 'submitted_at'),
          expiresAt: textValue(row, 'expires_at'),
          latestOfferId: nullableTextValue(row, 'latest_offer_id'),
          latestOfferRelationshipType: nullableTextValue(row, 'latest_offer_relationship_type') as WorkspaceRelationshipType | null,
          latestOfferUnitId: nullableTextValue(row, 'latest_offer_unit_id'),
          latestOfferShareNumerator: nullableNumberValue(row, 'latest_offer_share_numerator'),
          latestOfferShareDenominator: nullableNumberValue(row, 'latest_offer_share_denominator'),
        })).filter((request) => isUuid(request.id) && RELATIONSHIP_TYPES.has(request.relationshipType)),
        members,
        relationships: ((relationshipsResult.data ?? []) as UnknownRow[]).map((row) => ({
          relationshipKind: textValue(row, 'relationship_kind') as WorkspaceRelationshipKind,
          relationshipId: textValue(row, 'relationship_id'),
          subjectPartyId: textValue(row, 'subject_party_id'),
          personId: nullableTextValue(row, 'person_id'),
          profileId: nullableTextValue(row, 'profile_id'),
          displayName: textValue(row, 'display_name') || 'Nyilvántartott személy',
          unitId: textValue(row, 'unit_id'),
          unitDesignation: textValue(row, 'unit_designation') || 'Albetét',
          relationshipType: textValue(row, 'relationship_type'),
          status: textValue(row, 'relationship_status'),
          shareNumerator: nullableNumberValue(row, 'share_numerator'),
          shareDenominator: nullableNumberValue(row, 'share_denominator'),
          verifiedAt: nullableTextValue(row, 'verified_at'),
          evidenceReference: nullableTextValue(row, 'evidence_reference'),
          source: textValue(row, 'source'),
          validFrom: textValue(row, 'valid_from'),
          validTo: nullableTextValue(row, 'valid_to'),
          endedReason: nullableTextValue(row, 'ended_reason'),
          createdAt: textValue(row, 'created_at'),
        })).filter((relationship) => (
          RELATIONSHIP_KINDS.has(relationship.relationshipKind)
          && isUuid(relationship.relationshipId)
          && isUuid(relationship.subjectPartyId)
          && isUuid(relationship.unitId)
        )),
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

export async function previewWorkspaceUnitImport(
  input: PreviewWorkspaceUnitImportInput,
): Promise<WorkspaceAdminActionResult<{ rows: WorkspaceUnitImportPreviewRow[] }>> {
  const rows = importRowsPayload(input.rows);
  if (!isWorkspaceId(input.workspaceId) || !rows) {
    return validationFailure('Adj meg 1–500, érvényes szerkezetű albetétsort.');
  }

  try {
    const [context, { supabase }] = await Promise.all([
      requireWorkspaceCapability(input.workspaceId, 'unit.manage'),
      requireAuthenticatedUser(),
    ]);
    const { data, error } = await supabase.rpc('preview_workspace_unit_import', {
      p_workspace_id: context.workspaceId,
      p_rows: rows,
    });
    if (error) return rpcFailure(error, context.workspaceId, 'Az import előzetes ellenőrzése most nem sikerült.');
    const previewRows = parseUnitImportPreviewRows(data);
    if (!previewRows || previewRows.length !== rows.length) {
      return { success: false, error: 'A szerver nem adott vissza teljes import-előnézetet.', errorCode: 'RPC_RESPONSE_INVALID' };
    }
    return { success: true, data: { rows: previewRows } };
  } catch (error) {
    return { success: false, error: authorizationMessage(error), errorCode: 'AUTHORIZATION_FAILED' };
  }
}

export async function applyWorkspaceUnitImport(
  input: ApplyWorkspaceUnitImportInput,
): Promise<WorkspaceAdminActionResult<{
  importId: string | null;
  applied: boolean;
  importedCount: number;
  rows: WorkspaceUnitImportPreviewRow[];
}>> {
  const rows = importRowsPayload(input.rows);
  if (!isWorkspaceId(input.workspaceId) || !isUuid(input.idempotencyKey) || !rows) {
    return validationFailure('Az importcsomag, a lakóközösség vagy a kérésazonosító érvénytelen.');
  }

  try {
    const [context, { supabase }] = await Promise.all([
      requireWorkspaceCapability(input.workspaceId, 'unit.manage'),
      requireAuthenticatedUser(),
    ]);
    const { data, error } = await supabase.rpc('apply_workspace_unit_import', {
      p_workspace_id: context.workspaceId,
      p_rows: rows,
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) return rpcFailure(error, context.workspaceId, 'A tömeges albetétfelvitel most nem sikerült.');

    const row = firstRow(data);
    const importId = row ? nullableTextValue(row, 'import_id') : null;
    const applied = row ? booleanValue(row, 'applied') : null;
    const importedCount = row ? integerValue(row, 'imported_count') : null;
    const resultRows = row ? parseUnitImportPreviewRows(row.results) : null;
    if (
      applied === null
      || importedCount === null
      || importedCount < 0
      || !resultRows
      || resultRows.length !== rows.length
      || (applied && (!importId || !isUuid(importId)))
      || (!applied && importId !== null)
    ) {
      return { success: false, error: 'A szerver nem adott vissza érvényes importeredményt.', errorCode: 'RPC_RESPONSE_INVALID' };
    }
    if (applied) refreshAdmin(context.workspaceId);
    return { success: true, data: { importId, applied, importedCount, rows: resultRows } };
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
  const hasShare = input.shareNumerator != null || input.shareDenominator != null;
  if (isOwnershipRelationship(input.relationshipType)) {
    if (!isValidOwnershipShare(input.shareNumerator, input.shareDenominator)) {
      return validationFailure('Tulajdonosi meghívásnál add meg a pontos tulajdoni hányad számlálóját és nevezőjét.');
    }
  } else if (hasShare) {
    return validationFailure('Tulajdoni hányad csak tulajdonosi jogviszonyhoz adható meg.');
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
      p_share_numerator: isOwnershipRelationship(input.relationshipType) ? input.shareNumerator : null,
      p_share_denominator: isOwnershipRelationship(input.relationshipType) ? input.shareDenominator : null,
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

export async function revokeWorkspaceMembershipInvitation(
  input: RevokeMembershipInvitationInput,
): Promise<WorkspaceAdminActionResult<{ invitationId: string; status: string; revokedAt: string }>> {
  const reason = input.reason.trim();
  if (!isWorkspaceId(input.workspaceId) || !isUuid(input.invitationId) || !isUuid(input.idempotencyKey)) {
    return validationFailure('A meghívás vagy a kérésazonosító érvénytelen.');
  }
  if (reason.length < 3 || reason.length > 500) {
    return validationFailure('A visszavonás indoklása 3–500 karakter legyen.');
  }

  try {
    const [context, { supabase }] = await Promise.all([
      requireWorkspaceCapability(input.workspaceId, 'membership.invite'),
      requireAuthenticatedUser(),
    ]);
    const { data, error } = await supabase.rpc('revoke_membership_invitation', {
      p_invitation_id: input.invitationId,
      p_reason: reason,
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) return rpcFailure(error, context.workspaceId, 'A meghívást most nem sikerült visszavonni.');

    const row = firstRow(data);
    const invitationId = row ? textValue(row, 'invitation_id') : '';
    const status = row ? textValue(row, 'invitation_status') : '';
    const revokedAt = row ? textValue(row, 'revoked_at') : '';
    if (!isUuid(invitationId) || !status || !revokedAt) {
      return { success: false, error: 'A szerver válasza nem volt értelmezhető.', errorCode: 'RPC_RESPONSE_INVALID' };
    }
    refreshAdmin(context.workspaceId);
    return { success: true, data: { invitationId, status, revokedAt } };
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
  const capabilityKeys = normalizedDelegateCapabilities(input.capabilityKeys ?? []);

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
    const hasOfferedShare = input.offeredShareNumerator != null || input.offeredShareDenominator != null;
    if (isOwnershipRelationship(input.offeredRelationshipType)) {
      if (!isValidOwnershipShare(input.offeredShareNumerator, input.offeredShareDenominator)) {
        return validationFailure('Tulajdonosi ellenajánlatnál add meg a pontos tulajdoni hányadot.');
      }
    } else if (hasOfferedShare) {
      return validationFailure('Tulajdoni hányad csak tulajdonosi ellenajánlathoz adható meg.');
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
      p_offered_share_numerator: input.decision === 'COUNTER_OFFER' && isOwnershipRelationship(input.offeredRelationshipType)
        ? input.offeredShareNumerator
        : null,
      p_offered_share_denominator: input.decision === 'COUNTER_OFFER' && isOwnershipRelationship(input.offeredRelationshipType)
        ? input.offeredShareDenominator
        : null,
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
  const capabilityKeys = normalizedDelegateCapabilities(input.capabilityKeys ?? []);
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

export async function createWorkspacePersonRelationship(
  input: CreateWorkspacePersonRelationshipInput,
): Promise<WorkspaceAdminActionResult<{
  personId: string;
  ownershipId: string | null;
  occupancyId: string | null;
  status: string;
}>> {
  const displayName = input.displayName?.trim().replace(/\s+/g, ' ') || null;
  const evidenceReference = input.evidenceReference.trim();
  const personId = input.personId || null;
  const ownsUnit = input.relationshipType === 'OWNER' || input.relationshipType === 'OWNER_OCCUPANT';
  const shareNumerator = input.shareNumerator ?? null;
  const shareDenominator = input.shareDenominator ?? null;

  if (
    !isWorkspaceId(input.workspaceId)
    || !isUuid(input.unitId)
    || !isUuid(input.idempotencyKey)
    || (personId !== null && !isUuid(personId))
    || !RELATIONSHIP_TYPES.has(input.relationshipType)
  ) {
    return validationFailure('Érvénytelen lakóközösség-, személy-, albetét- vagy kérésazonosító.');
  }
  if (!personId && (!displayName || displayName.length < 2 || displayName.length > 160)) {
    return validationFailure('Új személy felviteléhez 2–160 karakteres teljes név szükséges.');
  }
  if (!EVIDENCE_REFERENCE_PATTERN.test(evidenceReference)) {
    return validationFailure('A belső bizonyíték-hivatkozás namespace:azonosító formátumú legyen, és ne tartalmazzon nyers személyes adatot.');
  }
  const hasAnyShare = shareNumerator !== null || shareDenominator !== null;
  const validShare = shareNumerator !== null
    && shareDenominator !== null
    && Number.isSafeInteger(shareNumerator)
    && Number.isSafeInteger(shareDenominator)
    && shareNumerator > 0
    && shareDenominator > 0
    && shareNumerator <= shareDenominator;
  if ((!ownsUnit && hasAnyShare) || (ownsUnit && !validShare)) {
    return validationFailure('Tulajdonosi jogviszonyhoz adj meg két pozitív egészből álló pontos hányadot; a számláló nem lehet nagyobb a nevezőnél.');
  }

  try {
    const [context, { supabase }] = await Promise.all([
      requireWorkspaceCapability(input.workspaceId, 'unit_relation.verify'),
      requireAuthenticatedUser(),
    ]);
    await assertUnitInWorkspace(input.unitId, context.workspaceId);
    const { data, error } = await supabase.rpc('create_workspace_person_relationship', {
      p_workspace_id: context.workspaceId,
      p_person_id: personId,
      p_display_name: personId ? null : displayName,
      p_unit_id: input.unitId,
      p_relationship_type: input.relationshipType,
      p_share_numerator: ownsUnit ? shareNumerator : null,
      p_share_denominator: ownsUnit ? shareDenominator : null,
      p_evidence_reference: evidenceReference,
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) return rpcFailure(error, context.workspaceId, 'A személy albetéti jogviszonyát most nem sikerült rögzíteni.');

    const row = firstRow(data);
    const returnedPersonId = row ? textValue(row, 'person_id') : '';
    const ownershipId = row ? nullableTextValue(row, 'ownership_id') : null;
    const occupancyId = row ? nullableTextValue(row, 'occupancy_id') : null;
    const status = row ? textValue(row, 'relationship_status') : '';
    if (
      !isUuid(returnedPersonId)
      || (ownershipId !== null && !isUuid(ownershipId))
      || (occupancyId !== null && !isUuid(occupancyId))
      || (!ownershipId && !occupancyId)
      || !status
    ) {
      return { success: false, error: 'A szerver nem adott vissza érvényes jogviszonyt.', errorCode: 'RPC_RESPONSE_INVALID' };
    }
    refreshAdmin(context.workspaceId);
    return {
      success: true,
      data: { personId: returnedPersonId, ownershipId, occupancyId, status },
    };
  } catch (error) {
    return { success: false, error: authorizationMessage(error), errorCode: 'AUTHORIZATION_FAILED' };
  }
}

export async function reviewWorkspaceUnitRelationship(
  input: ReviewWorkspaceUnitRelationshipInput,
): Promise<WorkspaceAdminActionResult<{
  relationshipId: string;
  relationshipKind: WorkspaceRelationshipKind;
  status: string;
  validTo: string | null;
}>> {
  const reason = input.reason?.trim() || null;
  const evidenceReference = input.evidenceReference?.trim() || null;
  if (
    !isWorkspaceId(input.workspaceId)
    || !isUuid(input.relationshipId)
    || !isUuid(input.idempotencyKey)
    || !RELATIONSHIP_KINDS.has(input.relationshipKind)
    || !RELATIONSHIP_REVIEW_DECISIONS.has(input.decision)
  ) {
    return validationFailure('A jogviszony, döntés vagy kérésazonosító érvénytelen.');
  }
  if (reason && reason.length > 1000) return validationFailure('Az indoklás legfeljebb 1000 karakter lehet.');
  if (['DISPUTE', 'END'].includes(input.decision) && (!reason || reason.length < 3)) {
    return validationFailure('A vitatáshoz vagy lezáráshoz legalább 3 karakteres indoklás szükséges.');
  }
  if (input.decision === 'VERIFY' && !evidenceReference) {
    return validationFailure('Az ellenőrzéshez belső bizonyíték-hivatkozás szükséges.');
  }
  if (evidenceReference && !EVIDENCE_REFERENCE_PATTERN.test(evidenceReference)) {
    return validationFailure('A bizonyíték-hivatkozás namespace:azonosító formátumú legyen.');
  }
  const hasShare = input.shareNumerator != null || input.shareDenominator != null;
  if (input.relationshipKind === 'OWNERSHIP' && input.decision === 'VERIFY') {
    if (hasShare && !isValidOwnershipShare(input.shareNumerator, input.shareDenominator)) {
      return validationFailure('A tulajdoni hányad számlálója és nevezője pozitív egész szám legyen.');
    }
  } else if (hasShare) {
    return validationFailure('Tulajdoni hányad csak tulajdonjog ellenőrzésekor módosítható.');
  }

  try {
    const [context, { supabase }] = await Promise.all([
      requireWorkspaceCapability(input.workspaceId, 'unit_relation.verify'),
      requireAuthenticatedUser(),
    ]);
    const { data, error } = await supabase.rpc('review_workspace_unit_relationship', {
      p_workspace_id: context.workspaceId,
      p_relationship_kind: input.relationshipKind,
      p_relationship_id: input.relationshipId,
      p_decision: input.decision,
      p_reason: reason,
      p_evidence_reference: evidenceReference,
      p_share_numerator: input.relationshipKind === 'OWNERSHIP' && input.decision === 'VERIFY'
        ? input.shareNumerator ?? null
        : null,
      p_share_denominator: input.relationshipKind === 'OWNERSHIP' && input.decision === 'VERIFY'
        ? input.shareDenominator ?? null
        : null,
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) return rpcFailure(error, context.workspaceId, 'A jogviszony állapotát most nem sikerült módosítani.');

    const row = firstRow(data);
    const relationshipId = row ? textValue(row, 'relationship_id') : '';
    const relationshipKind = row ? textValue(row, 'relationship_kind') as WorkspaceRelationshipKind : 'OWNERSHIP';
    const status = row ? textValue(row, 'relationship_status') : '';
    const validTo = row ? nullableTextValue(row, 'valid_to') : null;
    if (!isUuid(relationshipId) || !RELATIONSHIP_KINDS.has(relationshipKind) || !status) {
      return { success: false, error: 'A szerver válasza nem volt értelmezhető.', errorCode: 'RPC_RESPONSE_INVALID' };
    }
    refreshAdmin(context.workspaceId);
    return { success: true, data: { relationshipId, relationshipKind, status, validTo } };
  } catch (error) {
    return { success: false, error: authorizationMessage(error), errorCode: 'AUTHORIZATION_FAILED' };
  }
}

export async function changeWorkspaceMembershipStatus(
  input: ChangeWorkspaceMembershipStatusInput,
): Promise<WorkspaceAdminActionResult<{ membershipId: string; status: string; changedAt: string }>> {
  const reason = input.reason.trim();
  if (
    !isWorkspaceId(input.workspaceId)
    || !isUuid(input.membershipId)
    || !isUuid(input.idempotencyKey)
    || !MEMBERSHIP_TARGET_STATUSES.has(input.targetStatus)
  ) {
    return validationFailure('A tagság, célállapot vagy kérésazonosító érvénytelen.');
  }
  if (reason.length < 3 || reason.length > 1000) {
    return validationFailure('A tagság módosításához 3–1000 karakteres indoklás szükséges.');
  }

  try {
    const [context, { supabase }] = await Promise.all([
      requireWorkspaceCapability(input.workspaceId, 'membership.suspend'),
      requireAuthenticatedUser(),
    ]);
    const { data, error } = await supabase.rpc('change_workspace_membership_status', {
      p_workspace_id: context.workspaceId,
      p_membership_id: input.membershipId,
      p_target_status: input.targetStatus,
      p_reason: reason,
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) return rpcFailure(error, context.workspaceId, 'A közösségi tagság állapotát most nem sikerült módosítani.');

    const row = firstRow(data);
    const membershipId = row ? textValue(row, 'membership_id') : '';
    const status = row ? textValue(row, 'membership_status') : '';
    const changedAt = row ? textValue(row, 'changed_at') : '';
    if (!isUuid(membershipId) || !status || !changedAt) {
      return { success: false, error: 'A szerver válasza nem volt értelmezhető.', errorCode: 'RPC_RESPONSE_INVALID' };
    }
    refreshAdmin(context.workspaceId);
    return { success: true, data: { membershipId, status, changedAt } };
  } catch (error) {
    return { success: false, error: authorizationMessage(error), errorCode: 'AUTHORIZATION_FAILED' };
  }
}

export async function cancelMyJoinRequest(
  input: CancelJoinRequestInput,
): Promise<WorkspaceAdminActionResult<{ requestId: string; status: string; version: number; cancelledAt: string }>> {
  const reason = input.reason.trim();
  if (!isUuid(input.requestId) || !isUuid(input.idempotencyKey) || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) {
    return validationFailure('A csatlakozási kérelem verziója vagy kérésazonosítója érvénytelen.');
  }
  if (reason.length < 3 || reason.length > 500) {
    return validationFailure('A visszavonás indoklása 3–500 karakter legyen.');
  }

  try {
    const { supabase } = await requireAuthenticatedUser();
    const { data, error } = await supabase.rpc('cancel_join_request', {
      p_request_id: input.requestId,
      p_expected_version: input.expectedVersion,
      p_reason: reason,
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) return rpcFailure(error, null, 'A csatlakozási kérelmet most nem sikerült visszavonni.');

    const row = firstRow(data);
    const requestId = row ? textValue(row, 'request_id') : '';
    const status = row ? textValue(row, 'request_status') : '';
    const version = row ? integerValue(row, 'request_version') : null;
    const cancelledAt = row ? textValue(row, 'cancelled_at') : '';
    if (!isUuid(requestId) || !status || version === null || !cancelledAt) {
      return { success: false, error: 'A szerver válasza nem volt értelmezhető.', errorCode: 'RPC_RESPONSE_INVALID' };
    }
    refreshOnboarding();
    return { success: true, data: { requestId, status, version, cancelledAt } };
  } catch (error) {
    return { success: false, error: authorizationMessage(error), errorCode: 'AUTHORIZATION_FAILED' };
  }
}

export async function resubmitMyJoinRequestEvidence(
  input: ResubmitJoinRequestEvidenceInput,
): Promise<WorkspaceAdminActionResult<{ requestId: string; status: string; version: number; evidenceEventId: string }>> {
  const reason = input.reason.trim();
  const evidenceReferences = Array.from(new Set(input.evidenceReferences.map((reference) => reference.trim()).filter(Boolean)));
  if (!isUuid(input.requestId) || !isUuid(input.idempotencyKey) || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) {
    return validationFailure('A csatlakozási kérelem verziója vagy kérésazonosítója érvénytelen.');
  }
  if (reason.length < 3 || reason.length > 500) {
    return validationFailure('Az igazoláspótlás rövid indoklása 3–500 karakter legyen.');
  }
  if (
    evidenceReferences.length < 1
    || evidenceReferences.length > 10
    || evidenceReferences.some((reference) => !EVIDENCE_REFERENCE_PATTERN.test(reference))
  ) {
    return validationFailure('Adj meg 1–10 egyedi, namespace:azonosító formátumú belső bizonyíték-hivatkozást.');
  }

  try {
    const { supabase } = await requireAuthenticatedUser();
    const { data, error } = await supabase.rpc('resubmit_join_request_evidence', {
      p_request_id: input.requestId,
      p_expected_version: input.expectedVersion,
      p_evidence_references: evidenceReferences,
      p_reason: reason,
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) return rpcFailure(error, null, 'Az igazolásokat most nem sikerült beküldeni.');

    const row = firstRow(data);
    const requestId = row ? textValue(row, 'request_id') : '';
    const status = row ? textValue(row, 'request_status') : '';
    const version = row ? integerValue(row, 'request_version') : null;
    const evidenceEventId = row ? textValue(row, 'evidence_event_id') : '';
    if (!isUuid(requestId) || !status || version === null || !isUuid(evidenceEventId)) {
      return { success: false, error: 'A szerver válasza nem volt értelmezhető.', errorCode: 'RPC_RESPONSE_INVALID' };
    }
    refreshOnboarding();
    return { success: true, data: { requestId, status, version, evidenceEventId } };
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
