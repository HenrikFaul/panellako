import { beforeEach, describe, expect, it, vi } from 'vitest';

const serverMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: serverMocks.getUser },
    rpc: serverMocks.rpc,
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: serverMocks.revalidatePath,
}));

import {
  acceptAgencyStaffInvitation,
  assignAgencyToWorkspace,
  createManagementAgency,
  getAgencyPortfolioSnapshot,
  issueAgencyStaffInvitation,
} from '../../app/actions/agency';

const agencyId = '11111111-1111-4111-8111-111111111111';
const workspaceId = '22222222-2222-4222-8222-222222222222';
const membershipId = '33333333-3333-4333-8333-333333333333';
const profileId = '44444444-4444-4444-8444-444444444444';
const assignmentId = '55555555-5555-4555-8555-555555555555';
const idempotencyKey = '66666666-6666-4666-8666-666666666666';
const invitationId = '77777777-7777-4777-8777-777777777777';
const token = 'a'.repeat(64);

beforeEach(() => {
  serverMocks.getUser.mockReset().mockResolvedValue({
    data: { user: { id: profileId, email: 'admin@example.com' } },
    error: null,
  });
  serverMocks.rpc.mockReset();
  serverMocks.revalidatePath.mockReset();
});

describe('agency server actions', () => {
  it('loads the agency, staff and portfolio exclusively through scoped RPCs', async () => {
    serverMocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'list_my_management_agencies') {
        return {
          data: [{
            agency_id: agencyId,
            agency_name: 'Példa Kezelő',
            legal_name: 'Példa Kezelő Kft.',
            registration_number: '01-09-999999',
            tax_number: '12345678-2-41',
            organization_role: 'AGENCY_OWNER',
            staff_count: '1',
            workspace_count: 1,
            member_since: '2026-08-28T10:00:00Z',
          }],
          error: null,
        };
      }
      if (name === 'list_agency_portfolio') {
        return {
          data: [{
            portfolio_assignment_id: assignmentId,
            workspace_id: workspaceId,
            workspace_name: 'Napfény Lakóközösség',
            formatted_address: '1135 Budapest, Példa utca 1.',
            assignment_status: 'ACTIVE',
            valid_from: '2026-08-28T10:00:00Z',
            valid_to: null,
            staff_grant_count: '1',
          }],
          error: null,
        };
      }
      if (name === 'list_agency_staff') {
        return {
          data: [{
            organization_membership_id: membershipId,
            profile_id: profileId,
            display_name: 'Admin Példa',
            email: 'admin@example.com',
            organization_role: 'AGENCY_OWNER',
            membership_status: 'ACTIVE',
            valid_from: '2026-08-28T10:00:00Z',
          }],
          error: null,
        };
      }
      return { data: null, error: { code: 'PGRST202', message: 'unexpected RPC' } };
    });

    const result = await getAgencyPortfolioSnapshot();

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      selectedAgencyId: agencyId,
      canManageAgency: true,
      staff: [{ organizationMembershipId: membershipId }],
      portfolio: [{ portfolioAssignmentId: assignmentId, workspaceId }],
    });
    expect(serverMocks.rpc.mock.calls.map(([name]) => name)).toEqual([
      'list_my_management_agencies',
      'list_agency_portfolio',
      'list_agency_staff',
    ]);
  });

  it('rejects malformed staff invitations before authentication or database access', async () => {
    const result = await issueAgencyStaffInvitation({
      agencyId,
      email: 'not-an-email',
      organizationRole: 'PORTFOLIO_MANAGER',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      idempotencyKey,
    });

    expect(result).toMatchObject({ success: false, errorCode: 'AGENCY_STAFF_INVITATION_INVALID' });
    expect(serverMocks.getUser).not.toHaveBeenCalled();
    expect(serverMocks.rpc).not.toHaveBeenCalled();
  });

  it('maps structured MFA failures to a safe step-up destination without returning raw server detail', async () => {
    serverMocks.rpc.mockResolvedValue({
      data: null,
      error: {
        code: 'P0001',
        message: 'sensitive internal text',
        details: '{"error_code":"MFA_STEP_UP_REQUIRED"}',
      },
    });

    const result = await createManagementAgency({
      agencyName: 'Példa Kezelő',
      legalName: 'Példa Kezelő Kft.',
      idempotencyKey,
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: 'MFA_STEP_UP_REQUIRED',
      mfaRequired: true,
      stepUpHref: '/account/security?next=%2Fagency',
    });
    expect(JSON.stringify(result)).not.toContain('sensitive internal text');
  });

  it('validates the signed-mandate evidence contract and forwards only RPC parameters', async () => {
    serverMocks.rpc.mockResolvedValue({
      data: [{ portfolio_assignment_id: assignmentId, projected_staff_count: 2 }],
      error: null,
    });

    const result = await assignAgencyToWorkspace({
      agencyId,
      workspaceId,
      appointmentReference: 'signed-mandate:internal-2026-08-28',
      validTo: null,
      idempotencyKey,
    });

    expect(result).toEqual({
      success: true,
      data: { portfolioAssignmentId: assignmentId, projectedStaffCount: 2 },
    });
    expect(serverMocks.rpc).toHaveBeenCalledWith('assign_agency_to_workspace', {
      p_agency_id: agencyId,
      p_workspace_id: workspaceId,
      p_appointment_reference: 'signed-mandate:internal-2026-08-28',
      p_valid_to: null,
      p_idempotency_key: idempotencyKey,
    });
  });

  it('accepts only a 64-character token and never echoes it in the result', async () => {
    serverMocks.rpc.mockResolvedValue({
      data: [{
        agency_id: agencyId,
        organization_membership_id: membershipId,
        organization_role: 'ACCOUNTANT',
        projected_workspace_count: 3,
        invitation_status: 'ACCEPTED',
      }],
      error: null,
    });

    const result = await acceptAgencyStaffInvitation(token);

    expect(result).toMatchObject({
      success: true,
      data: { agencyId, organizationRole: 'ACCOUNTANT', projectedWorkspaceCount: 3 },
    });
    expect(serverMocks.rpc).toHaveBeenCalledWith('accept_agency_staff_invitation', { p_token: token });
    expect(JSON.stringify(result)).not.toContain(token);
  });

  it('returns a one-time invitation token only from a successful issue command', async () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    serverMocks.rpc.mockResolvedValue({
      data: [{
        invitation_id: invitationId,
        invitation_token: token,
        invitation_status: 'PENDING',
        expires_at: expiresAt,
      }],
      error: null,
    });

    const result = await issueAgencyStaffInvitation({
      agencyId,
      email: 'staff@example.com',
      organizationRole: 'OPERATIONS',
      expiresAt,
      idempotencyKey,
    });

    expect(result).toMatchObject({ success: true, data: { invitationId, token } });
    expect(serverMocks.revalidatePath).toHaveBeenCalledWith('/agency');
    expect(serverMocks.revalidatePath).toHaveBeenCalledWith('/app');
  });
});
