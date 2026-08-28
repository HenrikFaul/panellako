import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const actionSource = readSource('app/actions/workspace-admin.ts');
const pageSource = readSource('app/w/[buildingId]/(subpages)/admin/page.tsx');
const clientSource = readSource('components/workspace-admin-client.tsx');

function actionBody(name: string, nextName: string): string {
  const start = actionSource.indexOf(`export async function ${name}`);
  const end = actionSource.indexOf(`export async function ${nextName}`, start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return actionSource.slice(start, end);
}

describe('workspace admin tenant and mutation boundaries', () => {
  it('uses only reviewed RPCs for writes and passes their exact tenant-aware contracts', () => {
    expect(actionSource).toContain("supabase.rpc('create_workspace_unit'");
    expect(actionSource).toContain('p_workspace_id: context.workspaceId');
    expect(actionSource).toContain('p_parent_unit_id: input.parentUnitId || null');
    expect(actionSource).toContain("supabase.rpc('issue_membership_invitation'");
    expect(actionSource).toContain("supabase.rpc('review_join_request'");
    expect(actionSource).toContain("supabase.rpc('grant_workspace_role'");
    expect(actionSource).toContain("supabase.rpc('revoke_workspace_role'");
    expect(actionSource).toContain("supabase.rpc('accept_join_request_offer'");
    expect(actionSource).toContain('p_request_id: input.requestId');
    expect(actionSource).toContain('p_offer_id: input.offerId');
    expect(actionSource).not.toMatch(/\.from\([^)]*\)\s*\.insert\(/);
    expect(actionSource).not.toMatch(/\.from\([^)]*\)\s*\.update\(/);
    expect(actionSource).not.toMatch(/\.from\([^)]*\)\s*\.delete\(/);
  });

  it('checks the operation capability and object scope before every manager RPC', () => {
    const createBody = actionBody('createWorkspaceUnit', 'issueWorkspaceMembershipInvitation');
    const invitationBody = actionBody('issueWorkspaceMembershipInvitation', 'reviewWorkspaceJoinRequest');
    const reviewBody = actionBody('reviewWorkspaceJoinRequest', 'grantWorkspaceRole');
    const grantBody = actionBody('grantWorkspaceRole', 'revokeWorkspaceRole');
    const revokeBody = actionBody('revokeWorkspaceRole', 'acceptJoinRequestCounterOffer');

    expect(createBody).toContain("requireWorkspaceCapability(input.workspaceId, 'unit.manage')");
    expect(createBody).toContain('assertUnitInWorkspace(input.parentUnitId, context.workspaceId)');
    expect(invitationBody).toContain("requireWorkspaceCapability(input.workspaceId, 'membership.invite')");
    expect(invitationBody).toContain('assertUnitInWorkspace(input.unitId, context.workspaceId)');
    expect(reviewBody).toContain("requireWorkspaceCapability(input.workspaceId, 'membership.approve')");
    expect(reviewBody).toContain('assertUnitInWorkspace(input.offeredUnitId, context.workspaceId)');
    expect(grantBody).toContain("requireWorkspaceCapability(input.workspaceId, 'role.grant_limited')");
    expect(revokeBody).toContain("requireWorkspaceCapability(input.workspaceId, 'role.grant_limited')");
  });

  it('scopes manager reads and delegates display-name access to the protected listing RPC', () => {
    expect(actionSource).toContain(".eq('workspace_id', workspaceId)");
    expect(actionSource).toContain("supabase.rpc('list_workspace_join_requests', { p_workspace_id: workspaceId })");
    expect(actionSource).not.toContain(".from('profiles')");
    expect(actionSource).toContain("supabase.rpc('list_workspace_members'");
    expect(actionSource).toContain(".from('role_assignments')");
  });

  it('turns the database step-up signal into a safe local security link', () => {
    expect(actionSource).toContain("errorCode === 'MFA_STEP_UP_REQUIRED'");
    expect(actionSource).toContain('sanitizeReturnTo(`/w/${workspaceId}/admin`, \'/app\')');
    expect(actionSource).toContain('`/account/security?next=${encodeURIComponent(safeReturnTo)}`');
    expect(clientSource).toContain('Biztonsági megerősítés');
  });

  it('gates the page and keeps the client on server actions with a daylight surface', () => {
    expect(pageSource).toContain("'unit.manage'");
    expect(pageSource).toContain("'membership.invite'");
    expect(pageSource).toContain("'membership.approve'");
    expect(pageSource).toContain("'role.grant_limited'");
    expect(pageSource).toContain('getWorkspaceAdminSnapshot(workspaceId)');
    expect(clientSource).toContain('app-surface min-h-screen');
    expect(clientSource).toContain('bg-white');
    expect(clientSource).toContain('COUNTER_OFFER');
    expect(clientSource).toContain('DELEGATE_OPERATIONS');
    expect(clientSource).not.toContain('createClient(');
    expect(clientSource).not.toContain(".from('");
  });
});
