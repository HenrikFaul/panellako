import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const actions = source('app/actions/workspace-admin.ts');
const client = source('components/workspace-admin-client.tsx');
const hu = source('src/i18n/resources/hu.ts');
const en = source('src/i18n/resources/en.ts');

describe('workspace staff invitation server/UI contract', () => {
  it('uses the scoped audited RPC and never performs client-side database writes', () => {
    expect(actions).toContain('export async function issueWorkspaceStaffInvitation');
    expect(actions).toContain("requireWorkspaceCapability(input.workspaceId, 'role.grant_limited')");
    expect(actions).toContain("supabase.rpc('issue_workspace_staff_invitation'");
    expect(actions).toContain('p_workspace_id: context.workspaceId');
    expect(actions).toContain('p_assignment_valid_to:');
    expect(client).toContain('issueWorkspaceStaffInvitation');
    expect(client).not.toContain('createClient(');
    expect(client).not.toContain(".from('");
  });

  it('does not expose any admin role or unit/relationship input in the staff flow', () => {
    expect(actions).toContain("input.roleKey !== 'DELEGATE_OPERATIONS'");
    expect(actions).toContain('ASSIGNABLE_ROLES.has(input.roleKey)');
    expect(client).toContain("useState<AssignableWorkspaceRole>('DELEGATE_OPERATIONS')");
    expect(client).toContain('noAdminBadge');
    expect(client).not.toContain('staffUnitId');
    expect(client).not.toContain('staffRelationship');
  });

  it('shows an accessible daylight invitation form with HU/EN copy and one-time token handling', () => {
    expect(client).toContain('aria-labelledby="staff-invitation-title"');
    expect(client).toContain('bg-canvas-sage/70');
    expect(client).toContain("useI18n()");
    expect(client).toContain("t('workspaceAdmin.staff.title')");
    expect(client).toContain('/invitations/${encodeURIComponent(result.data.token)}');
    expect(client).toContain('staffInvitationUrl');
    expect(hu).toContain('E-mail-alapú staff onboarding');
    expect(en).toContain('Email-based staff onboarding');
    expect(hu).toContain('Adminjog nem adható');
    expect(en).toContain('No admin role grant');
  });

  it('lists pending staff invitations without dropping existing role assignment tools', () => {
    expect(actions).toContain(".from('workspace_staff_invitations')");
    expect(actions).toContain('staffInvitations:');
    expect(client).toContain('initialSnapshot.staffInvitations');
    expect(client).toContain('grantWorkspaceRole');
    expect(client).toContain('revokeWorkspaceRole');
  });
});
