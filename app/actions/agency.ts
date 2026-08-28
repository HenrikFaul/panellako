'use server';

import { revalidatePath } from 'next/cache';
import { sanitizeReturnTo } from '@/lib/auth/return-to';
import { createClient } from '@/lib/supabase/server';

export type AgencyRole =
  | 'AGENCY_OWNER'
  | 'AGENCY_ADMIN'
  | 'PORTFOLIO_MANAGER'
  | 'OPERATIONS'
  | 'ACCOUNTANT';

export type AssignableAgencyRole = Exclude<AgencyRole, 'AGENCY_OWNER'>;

export interface AgencySummary {
  agencyId: string;
  agencyName: string;
  legalName: string;
  registrationNumber: string | null;
  taxNumber: string | null;
  organizationRole: AgencyRole;
  staffCount: number;
  workspaceCount: number;
  memberSince: string;
}

export interface AgencyStaffMember {
  organizationMembershipId: string;
  profileId: string;
  displayName: string;
  email: string;
  organizationRole: AgencyRole;
  membershipStatus: string;
  validFrom: string;
}

export interface AgencyPortfolioAssignment {
  portfolioAssignmentId: string;
  workspaceId: string;
  workspaceName: string;
  formattedAddress: string | null;
  assignmentStatus: string;
  validFrom: string;
  validTo: string | null;
  staffGrantCount: number;
}

export interface AgencyPortfolioSnapshot {
  agencies: AgencySummary[];
  selectedAgencyId: string | null;
  canManageAgency: boolean;
  staff: AgencyStaffMember[];
  portfolio: AgencyPortfolioAssignment[];
}

export interface AgencyActionResult<T = never> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  mfaRequired?: boolean;
  stepUpHref?: string;
}

interface RpcErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

type UnknownRow = Record<string, unknown>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_PATTERN = /^[0-9a-f]{64}$/i;
const APPOINTMENT_REFERENCE_PATTERN = /^signed-mandate:[A-Za-z0-9][A-Za-z0-9._~:/#-]{1,190}$/;
const ASSIGNABLE_AGENCY_ROLES = new Set<AssignableAgencyRole>([
  'AGENCY_ADMIN',
  'PORTFOLIO_MANAGER',
  'OPERATIONS',
  'ACCOUNTANT',
]);
const ALL_AGENCY_ROLES = new Set<AgencyRole>([
  'AGENCY_OWNER',
  ...ASSIGNABLE_AGENCY_ROLES,
]);
const AGENCY_ADMIN_ROLES = new Set<AgencyRole>(['AGENCY_OWNER', 'AGENCY_ADMIN']);
const MISSING_RPC_CODES = new Set(['42883', 'PGRST202', 'PGRST204']);

function rows(value: unknown): UnknownRow[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is UnknownRow => Boolean(item) && typeof item === 'object');
  }
  return value && typeof value === 'object' ? [value as UnknownRow] : [];
}

function textValue(row: UnknownRow, key: string, fallback = ''): string {
  const value = row[key];
  return typeof value === 'string' ? value : fallback;
}

function nullableTextValue(row: UnknownRow, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function numericValue(row: UnknownRow, key: string): number {
  const value = row[key];
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isAgencyRole(value: string): value is AgencyRole {
  return ALL_AGENCY_ROLES.has(value as AgencyRole);
}

function isAssignableAgencyRole(value: unknown): value is AssignableAgencyRole {
  return typeof value === 'string'
    && ASSIGNABLE_AGENCY_ROLES.has(value as AssignableAgencyRole);
}

function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}

function isFutureIso(value: string, maxDays?: number): boolean {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return false;
  return maxDays === undefined || timestamp <= Date.now() + maxDays * 24 * 60 * 60 * 1000;
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

function validationFailure<T>(errorCode: string): AgencyActionResult<T> {
  return {
    success: false,
    error: 'The supplied agency operation is invalid.',
    errorCode,
  };
}

function rpcFailure<T>(
  error: RpcErrorLike,
  returnTo: string,
  fallbackCode = 'AGENCY_OPERATION_FAILED',
): AgencyActionResult<T> {
  const extractedCode = extractRpcErrorCode(error);
  const errorCode = extractedCode
    ?? (error.code && MISSING_RPC_CODES.has(error.code) ? 'SYSTEM_UPDATE_REQUIRED' : fallbackCode);

  if (errorCode === 'MFA_STEP_UP_REQUIRED') {
    const safeReturnTo = sanitizeReturnTo(returnTo, '/agency');
    return {
      success: false,
      error: 'Fresh two-factor authentication is required.',
      errorCode,
      mfaRequired: true,
      stepUpHref: `/account/security?next=${encodeURIComponent(safeReturnTo)}`,
    };
  }

  return {
    success: false,
    error: 'The agency operation could not be completed.',
    errorCode,
  };
}

async function authenticatedClient() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return supabase;
}

function revalidateAgencySurface() {
  revalidatePath('/agency');
  revalidatePath('/app');
}

export async function getAgencyPortfolioSnapshot(
  requestedAgencyId?: string | null,
): Promise<AgencyActionResult<AgencyPortfolioSnapshot>> {
  if (requestedAgencyId && !isUuid(requestedAgencyId)) {
    return validationFailure('AGENCY_ID_INVALID');
  }

  const supabase = await authenticatedClient();
  if (!supabase) return validationFailure('AUTH_REQUIRED');

  const agenciesResult = await supabase.rpc('list_my_management_agencies');
  if (agenciesResult.error) return rpcFailure(agenciesResult.error, '/agency');

  const agencies = rows(agenciesResult.data).map((row): AgencySummary | null => {
    const agencyId = textValue(row, 'agency_id');
    const organizationRole = textValue(row, 'organization_role');
    if (!isUuid(agencyId) || !isAgencyRole(organizationRole)) return null;
    return {
      agencyId,
      agencyName: textValue(row, 'agency_name'),
      legalName: textValue(row, 'legal_name'),
      registrationNumber: nullableTextValue(row, 'registration_number'),
      taxNumber: nullableTextValue(row, 'tax_number'),
      organizationRole,
      staffCount: numericValue(row, 'staff_count'),
      workspaceCount: numericValue(row, 'workspace_count'),
      memberSince: textValue(row, 'member_since'),
    };
  }).filter((agency): agency is AgencySummary => agency !== null);

  const selectedAgencyId = requestedAgencyId ?? agencies[0]?.agencyId ?? null;
  if (!selectedAgencyId) {
    return {
      success: true,
      data: { agencies, selectedAgencyId: null, canManageAgency: false, staff: [], portfolio: [] },
    };
  }

  const selectedAgency = agencies.find((agency) => agency.agencyId === selectedAgencyId);
  if (!selectedAgency) return validationFailure('AGENCY_MEMBERSHIP_REQUIRED');

  const canManageAgency = AGENCY_ADMIN_ROLES.has(selectedAgency.organizationRole);
  const [portfolioResult, staffResult] = await Promise.all([
    supabase.rpc('list_agency_portfolio', { p_agency_id: selectedAgencyId }),
    canManageAgency
      ? supabase.rpc('list_agency_staff', { p_agency_id: selectedAgencyId })
      : Promise.resolve({ data: [], error: null }),
  ]);
  const readError = portfolioResult.error ?? staffResult.error;
  if (readError) return rpcFailure(readError, '/agency');

  const portfolio = rows(portfolioResult.data).map((row): AgencyPortfolioAssignment | null => {
    const portfolioAssignmentId = textValue(row, 'portfolio_assignment_id');
    const workspaceId = textValue(row, 'workspace_id');
    if (!isUuid(portfolioAssignmentId) || !isUuid(workspaceId)) return null;
    return {
      portfolioAssignmentId,
      workspaceId,
      workspaceName: textValue(row, 'workspace_name'),
      formattedAddress: nullableTextValue(row, 'formatted_address'),
      assignmentStatus: textValue(row, 'assignment_status'),
      validFrom: textValue(row, 'valid_from'),
      validTo: nullableTextValue(row, 'valid_to'),
      staffGrantCount: numericValue(row, 'staff_grant_count'),
    };
  }).filter((assignment): assignment is AgencyPortfolioAssignment => assignment !== null);

  const staff = rows(staffResult.data).map((row): AgencyStaffMember | null => {
    const organizationMembershipId = textValue(row, 'organization_membership_id');
    const profileId = textValue(row, 'profile_id');
    const organizationRole = textValue(row, 'organization_role');
    if (!isUuid(organizationMembershipId) || !isUuid(profileId) || !isAgencyRole(organizationRole)) {
      return null;
    }
    return {
      organizationMembershipId,
      profileId,
      displayName: textValue(row, 'display_name'),
      email: textValue(row, 'email'),
      organizationRole,
      membershipStatus: textValue(row, 'membership_status'),
      validFrom: textValue(row, 'valid_from'),
    };
  }).filter((member): member is AgencyStaffMember => member !== null);

  return {
    success: true,
    data: { agencies, selectedAgencyId, canManageAgency, staff, portfolio },
  };
}

export async function createManagementAgency(input: {
  agencyName: string;
  legalName: string;
  registrationNumber?: string | null;
  taxNumber?: string | null;
  licenseReference?: string | null;
  idempotencyKey: string;
}): Promise<AgencyActionResult<{ agencyId: string; commandStatus: string }>> {
  const agencyName = input.agencyName.trim();
  const legalName = input.legalName.trim();
  const registrationNumber = input.registrationNumber?.trim() ?? '';
  const taxNumber = input.taxNumber?.trim() ?? '';
  const licenseReference = input.licenseReference?.trim() ?? '';
  if (
    agencyName.length < 2 || agencyName.length > 255
    || legalName.length < 2 || legalName.length > 255
    || registrationNumber.length > 80 || taxNumber.length > 50
    || licenseReference.length > 220 || !isUuid(input.idempotencyKey)
  ) return validationFailure('AGENCY_INPUT_INVALID');

  const supabase = await authenticatedClient();
  if (!supabase) return validationFailure('AUTH_REQUIRED');
  const { data, error } = await supabase.rpc('create_management_agency', {
    p_agency_name: agencyName,
    p_legal_name: legalName,
    p_registration_number: registrationNumber,
    p_tax_number: taxNumber,
    p_license_reference: licenseReference,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) return rpcFailure(error, '/agency');

  const row = rows(data)[0];
  const agencyId = row ? textValue(row, 'agency_id') : '';
  if (!isUuid(agencyId)) return validationFailure('AGENCY_RESPONSE_INVALID');
  revalidateAgencySurface();
  return { success: true, data: { agencyId, commandStatus: textValue(row, 'command_status') } };
}

export async function issueAgencyStaffInvitation(input: {
  agencyId: string;
  email: string;
  organizationRole: AssignableAgencyRole;
  expiresAt: string;
  idempotencyKey: string;
}): Promise<AgencyActionResult<{ invitationId: string; token: string | null; expiresAt: string }>> {
  const email = input.email.trim().toLowerCase();
  if (
    !isUuid(input.agencyId) || !isValidEmail(email)
    || !isAssignableAgencyRole(input.organizationRole)
    || !isFutureIso(input.expiresAt, 30) || !isUuid(input.idempotencyKey)
  ) return validationFailure('AGENCY_STAFF_INVITATION_INVALID');

  const supabase = await authenticatedClient();
  if (!supabase) return validationFailure('AUTH_REQUIRED');
  const { data, error } = await supabase.rpc('issue_agency_staff_invitation', {
    p_agency_id: input.agencyId,
    p_email: email,
    p_organization_role: input.organizationRole,
    p_expires_at: input.expiresAt,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) return rpcFailure(error, '/agency');

  const row = rows(data)[0];
  const invitationId = row ? textValue(row, 'invitation_id') : '';
  if (!isUuid(invitationId)) return validationFailure('AGENCY_RESPONSE_INVALID');
  const token = row ? nullableTextValue(row, 'invitation_token') : null;
  if (token !== null && !TOKEN_PATTERN.test(token)) return validationFailure('AGENCY_RESPONSE_INVALID');
  revalidateAgencySurface();
  return {
    success: true,
    data: { invitationId, token, expiresAt: row ? textValue(row, 'expires_at') : input.expiresAt },
  };
}

export async function acceptAgencyStaffInvitation(
  token: string,
): Promise<AgencyActionResult<{
  agencyId: string;
  organizationRole: AgencyRole;
  projectedWorkspaceCount: number;
}>> {
  const normalizedToken = token.trim().toLowerCase();
  if (!TOKEN_PATTERN.test(normalizedToken)) return validationFailure('AGENCY_INVITATION_TOKEN_INVALID');

  const returnTo = sanitizeReturnTo(`/agency/invitations/${normalizedToken}`, '/agency');
  const supabase = await authenticatedClient();
  if (!supabase) return validationFailure('AUTH_REQUIRED');
  const { data, error } = await supabase.rpc('accept_agency_staff_invitation', {
    p_token: normalizedToken,
  });
  if (error) return rpcFailure(error, returnTo);

  const row = rows(data)[0];
  const agencyId = row ? textValue(row, 'agency_id') : '';
  const organizationRole = row ? textValue(row, 'organization_role') : '';
  if (!isUuid(agencyId) || !isAgencyRole(organizationRole)) {
    return validationFailure('AGENCY_RESPONSE_INVALID');
  }
  revalidateAgencySurface();
  return {
    success: true,
    data: {
      agencyId,
      organizationRole,
      projectedWorkspaceCount: row ? numericValue(row, 'projected_workspace_count') : 0,
    },
  };
}

export async function assignAgencyToWorkspace(input: {
  agencyId: string;
  workspaceId: string;
  appointmentReference: string;
  validTo?: string | null;
  idempotencyKey: string;
}): Promise<AgencyActionResult<{ portfolioAssignmentId: string; projectedStaffCount: number }>> {
  const appointmentReference = input.appointmentReference.trim();
  const validTo = input.validTo?.trim() || null;
  if (
    !isUuid(input.agencyId) || !isUuid(input.workspaceId)
    || !APPOINTMENT_REFERENCE_PATTERN.test(appointmentReference)
    || (validTo !== null && !isFutureIso(validTo))
    || !isUuid(input.idempotencyKey)
  ) return validationFailure('AGENCY_PORTFOLIO_INPUT_INVALID');

  const supabase = await authenticatedClient();
  if (!supabase) return validationFailure('AUTH_REQUIRED');
  const { data, error } = await supabase.rpc('assign_agency_to_workspace', {
    p_agency_id: input.agencyId,
    p_workspace_id: input.workspaceId,
    p_appointment_reference: appointmentReference,
    p_valid_to: validTo,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) return rpcFailure(error, '/agency');

  const row = rows(data)[0];
  const portfolioAssignmentId = row ? textValue(row, 'portfolio_assignment_id') : '';
  if (!isUuid(portfolioAssignmentId)) return validationFailure('AGENCY_RESPONSE_INVALID');
  revalidateAgencySurface();
  return {
    success: true,
    data: {
      portfolioAssignmentId,
      projectedStaffCount: row ? numericValue(row, 'projected_staff_count') : 0,
    },
  };
}

export async function revokeAgencyStaffMembership(input: {
  agencyId: string;
  organizationMembershipId: string;
  reason: string;
  idempotencyKey: string;
}): Promise<AgencyActionResult<{ revokedGrantCount: number }>> {
  const reason = input.reason.trim();
  if (
    !isUuid(input.agencyId) || !isUuid(input.organizationMembershipId)
    || reason.length < 3 || reason.length > 1000 || !isUuid(input.idempotencyKey)
  ) return validationFailure('AGENCY_STAFF_REVOCATION_INVALID');

  const supabase = await authenticatedClient();
  if (!supabase) return validationFailure('AUTH_REQUIRED');
  const { data, error } = await supabase.rpc('revoke_agency_staff_membership', {
    p_agency_id: input.agencyId,
    p_organization_membership_id: input.organizationMembershipId,
    p_reason: reason,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) return rpcFailure(error, '/agency');
  const row = rows(data)[0];
  if (
    !row
    || textValue(row, 'organization_membership_id') !== input.organizationMembershipId
    || textValue(row, 'membership_status') !== 'ENDED'
  ) return validationFailure('AGENCY_RESPONSE_INVALID');
  revalidateAgencySurface();
  return { success: true, data: { revokedGrantCount: numericValue(row, 'revoked_grant_count') } };
}

export async function endAgencyPortfolioAssignment(input: {
  portfolioAssignmentId: string;
  reason: string;
  idempotencyKey: string;
}): Promise<AgencyActionResult<{ revokedGrantCount: number }>> {
  const reason = input.reason.trim();
  if (
    !isUuid(input.portfolioAssignmentId)
    || reason.length < 3 || reason.length > 1000 || !isUuid(input.idempotencyKey)
  ) return validationFailure('AGENCY_PORTFOLIO_TERMINATION_INVALID');

  const supabase = await authenticatedClient();
  if (!supabase) return validationFailure('AUTH_REQUIRED');
  const { data, error } = await supabase.rpc('end_agency_portfolio_assignment', {
    p_portfolio_assignment_id: input.portfolioAssignmentId,
    p_reason: reason,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) return rpcFailure(error, '/agency');
  const row = rows(data)[0];
  if (
    !row
    || textValue(row, 'portfolio_assignment_id') !== input.portfolioAssignmentId
    || textValue(row, 'assignment_status') !== 'ENDED'
  ) return validationFailure('AGENCY_RESPONSE_INVALID');
  revalidateAgencySurface();
  return { success: true, data: { revokedGrantCount: numericValue(row, 'revoked_grant_count') } };
}
