import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const actionMocks = vi.hoisted(() => ({
  acceptInvitation: vi.fn(),
  assignWorkspace: vi.fn(),
  createAgency: vi.fn(),
  endAssignment: vi.fn(),
  getSnapshot: vi.fn(),
  issueInvitation: vi.fn(),
  revokeStaff: vi.fn(),
}));

vi.mock('../../app/actions/agency', () => ({
  acceptAgencyStaffInvitation: actionMocks.acceptInvitation,
  assignAgencyToWorkspace: actionMocks.assignWorkspace,
  createManagementAgency: actionMocks.createAgency,
  endAgencyPortfolioAssignment: actionMocks.endAssignment,
  getAgencyPortfolioSnapshot: actionMocks.getSnapshot,
  issueAgencyStaffInvitation: actionMocks.issueInvitation,
  revokeAgencyStaffMembership: actionMocks.revokeStaff,
}));

import AgencyPortfolioClient, {
  AgencyInvitationAcceptClient,
  AgencyPortfolioEntryLink,
} from '../../components/agency-portfolio-client';

const agencyId = '11111111-1111-4111-8111-111111111111';
const workspaceId = '22222222-2222-4222-8222-222222222222';
const membershipId = '33333333-3333-4333-8333-333333333333';
const profileId = '44444444-4444-4444-8444-444444444444';
const assignmentId = '55555555-5555-4555-8555-555555555555';
const invitationId = '77777777-7777-4777-8777-777777777777';
const token = 'b'.repeat(64);

const ownerSnapshot = {
  agencies: [{
    agencyId,
    agencyName: 'Példa Kezelő',
    legalName: 'Példa Kezelő Kft.',
    registrationNumber: null,
    taxNumber: null,
    organizationRole: 'AGENCY_OWNER' as const,
    staffCount: 1,
    workspaceCount: 1,
    memberSince: '2026-08-28T10:00:00Z',
  }],
  selectedAgencyId: agencyId,
  canManageAgency: true,
  staff: [{
    organizationMembershipId: membershipId,
    profileId,
    displayName: 'Tulajdonos Példa',
    email: 'owner@example.com',
    organizationRole: 'AGENCY_OWNER' as const,
    membershipStatus: 'ACTIVE',
    validFrom: '2026-08-28T10:00:00Z',
  }],
  portfolio: [{
    portfolioAssignmentId: assignmentId,
    workspaceId,
    workspaceName: 'Napfény Lakóközösség',
    formattedAddress: '1135 Budapest, Példa utca 1.',
    assignmentStatus: 'ACTIVE',
    validFrom: '2026-08-28T10:00:00Z',
    validTo: null,
    staffGrantCount: 1,
  }],
};

beforeEach(() => {
  document.documentElement.lang = 'hu';
  actionMocks.acceptInvitation.mockReset();
  actionMocks.assignWorkspace.mockReset();
  actionMocks.createAgency.mockReset();
  actionMocks.endAssignment.mockReset();
  actionMocks.getSnapshot.mockReset().mockResolvedValue({ success: true, data: ownerSnapshot });
  actionMocks.issueInvitation.mockReset();
  actionMocks.revokeStaff.mockReset();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => cleanup());

describe('agency portfolio UI', () => {
  it('exposes the localized portfolio entry from the community picker', () => {
    render(<AgencyPortfolioEntryLink />);
    expect(screen.getByRole('link', { name: 'Kezelőcéges portfólió' })).toHaveAttribute('href', '/agency');
  });

  it('keeps the new entry available in the English locale', async () => {
    document.documentElement.lang = 'en';
    render(<AgencyPortfolioEntryLink />);
    expect(await screen.findByRole('link', { name: 'Management company portfolio' })).toHaveAttribute('href', '/agency');
  });

  it('renders an admin portfolio and issues an email-bound invitation', async () => {
    actionMocks.issueInvitation.mockResolvedValue({
      success: true,
      data: {
        invitationId,
        token,
        expiresAt: '2026-09-04T10:00:00Z',
      },
    });

    render(
      <AgencyPortfolioClient
        initialResult={{ success: true, data: ownerSnapshot }}
        availableWorkspaces={[{ workspaceId, workspaceName: 'Napfény Lakóközösség', address: '1135 Budapest, Példa utca 1.' }]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Kezelőcéges portfólió' })).toBeInTheDocument();
    expect(screen.getByText('Napfény Lakóközösség')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Munkatárs e-mail-címe'), { target: { value: 'staff@example.com' } });
    fireEvent.change(screen.getByLabelText('Szervezeti szerepkör'), { target: { value: 'OPERATIONS' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Biztonságos meghívó készítése' }).closest('form')!);

    await waitFor(() => {
      expect(actionMocks.issueInvitation).toHaveBeenCalledWith(expect.objectContaining({
        agencyId,
        email: 'staff@example.com',
        organizationRole: 'OPERATIONS',
        idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/i),
      }));
    });
    expect(await screen.findByLabelText('Egyszer megjelenített meghívólink')).toHaveValue(
      `http://localhost:3000/agency/invitations/${token}`,
    );
  });

  it('keeps staff mutation controls hidden for a read-only agency member', () => {
    const accountantSnapshot = {
      ...ownerSnapshot,
      agencies: [{ ...ownerSnapshot.agencies[0], organizationRole: 'ACCOUNTANT' as const }],
      canManageAgency: false,
      staff: [],
    };
    render(
      <AgencyPortfolioClient
        initialResult={{ success: true, data: accountantSnapshot }}
        availableWorkspaces={[]}
      />,
    );

    expect(screen.getByText(/munkatársat csak a kezelőcég tulajdonosa vagy adminisztrátora kezelhet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Biztonságos meghívó készítése' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kezelőcég hozzárendelése' })).not.toBeInTheDocument();
  });

  it('accepts an agency invitation without exposing the token in rendered success copy', async () => {
    actionMocks.acceptInvitation.mockResolvedValue({
      success: true,
      data: { agencyId, organizationRole: 'ACCOUNTANT', projectedWorkspaceCount: 1 },
    });
    render(<AgencyInvitationAcceptClient token={token} />);

    fireEvent.click(screen.getByRole('button', { name: 'Meghívás biztonságos elfogadása' }));

    await waitFor(() => expect(actionMocks.acceptInvitation).toHaveBeenCalledWith(token));
    expect(await screen.findByRole('heading', { name: 'Meghívás elfogadva' })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(token);
  });

  it('sanitizes the invitation return path before forwarding it to login', () => {
    const routeSource = readFileSync(
      resolve(process.cwd(), 'app/agency/invitations/[token]/page.tsx'),
      'utf8',
    );
    expect(routeSource).toContain('sanitizeReturnTo(`/agency/invitations/${token}`, \'/agency\')');
    expect(routeSource).toContain('redirect(`/login?next=${encodeURIComponent(invitationPath)}`)');
    expect(routeSource).toContain('TOKEN_PATTERN.test(token)');
  });
});
