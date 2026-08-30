import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const actionSource = readSource('app/actions/workspace-admin.ts');
const clientSource = readSource('components/workspace-relationship-registry.tsx');
const pageSource = readSource('app/w/[buildingId]/(subpages)/admin/page.tsx');
const huSource = readSource('src/i18n/resources/hu.ts');
const enSource = readSource('src/i18n/resources/en.ts');

function actionBody(name: string, nextName: string): string {
  const start = actionSource.indexOf(`export async function ${name}`);
  const end = actionSource.indexOf(`export async function ${nextName}`, start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return actionSource.slice(start, end);
}

describe('workspace person and relationship registry', () => {
  it('loads the complete tenant-scoped relationship projection through the protected RPC', () => {
    expect(actionSource).toContain("hasWorkspaceCapability(context, 'unit_relation.verify')");
    expect(actionSource).toContain("supabase.rpc('list_workspace_unit_relationships', { p_workspace_id: workspaceId })");
    expect(actionSource).toContain("textValue(row, 'relationship_kind')");
    expect(actionSource).toContain("nullableTextValue(row, 'ended_reason')");
    expect(actionSource).not.toContain(".from('people')");
    expect(actionSource).not.toContain(".from('parties')");
  });

  it('creates offline people and relationships only through the scoped high-risk command', () => {
    const body = actionBody('createWorkspacePersonRelationship', 'reviewWorkspaceUnitRelationship');
    expect(body).toContain("requireWorkspaceCapability(input.workspaceId, 'unit_relation.verify')");
    expect(body).toContain('assertUnitInWorkspace(input.unitId, context.workspaceId)');
    expect(body).toContain("supabase.rpc('create_workspace_person_relationship'");
    expect(body).toContain('p_workspace_id: context.workspaceId');
    expect(body).toContain('p_person_id: personId');
    expect(body).toContain('p_display_name: personId ? null : displayName');
    expect(body).toContain('p_evidence_reference: evidenceReference');
    expect(body).toContain('(ownsUnit && !validShare)');
    expect(actionSource).toContain('OWNERSHIP_SHARE_EXCEEDED');
    expect(body).not.toMatch(/\.from\([^)]*\)\s*\.insert\(/);
  });

  it('reviews relationships and membership lifecycle through separate capabilities', () => {
    const reviewBody = actionBody('reviewWorkspaceUnitRelationship', 'changeWorkspaceMembershipStatus');
    const membershipBody = actionBody('changeWorkspaceMembershipStatus', 'acceptJoinRequestCounterOffer');

    expect(reviewBody).toContain("requireWorkspaceCapability(input.workspaceId, 'unit_relation.verify')");
    expect(reviewBody).toContain("supabase.rpc('review_workspace_unit_relationship'");
    expect(reviewBody).toContain('p_relationship_kind: input.relationshipKind');
    expect(reviewBody).toContain('p_relationship_id: input.relationshipId');
    expect(reviewBody).toContain('p_share_numerator:');
    expect(reviewBody).toContain('p_share_denominator:');
    expect(clientSource).toContain('relationship.shareNumerator == null');

    expect(membershipBody).toContain("requireWorkspaceCapability(input.workspaceId, 'membership.suspend')");
    expect(membershipBody).toContain("supabase.rpc('change_workspace_membership_status'");
    expect(membershipBody).toContain('p_membership_id: input.membershipId');
    expect(membershipBody).toContain('p_target_status: input.targetStatus');
  });

  it('gates the route and keeps the client free from direct database writes', () => {
    expect(pageSource).toContain("'membership.suspend'");
    expect(pageSource).toContain("'unit_relation.verify'");
    expect(clientSource).toContain('createWorkspacePersonRelationship');
    expect(clientSource).toContain('reviewWorkspaceUnitRelationship');
    expect(clientSource).toContain('changeWorkspaceMembershipStatus');
    expect(clientSource).not.toContain('createClient(');
    expect(clientSource).not.toContain(".from('");
  });

  it('keeps every new registry string in synchronized Hungarian and English resources', () => {
    for (const key of [
      'registry:',
      'capabilityMembershipSuspend:',
      'capabilityUnitRelationVerify:',
      'securityConfirmation:',
      'ownerOccupant:',
      'pendingVerification:',
      'shareDenominator:',
      'shareHelp:',
      'endedWithoutReason:',
    ]) {
      expect(huSource).toContain(key);
      expect(enSource).toContain(key);
    }
    expect(clientSource).toContain("t('workspaceAdmin.registry.title')");
    expect(clientSource).toContain("t('workspaceAdmin.registry.membership.description')");
  });
});
