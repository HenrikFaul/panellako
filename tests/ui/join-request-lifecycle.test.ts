import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const actionSource = readSource('app/actions/workspace-admin.ts');
const onboardingSource = readSource('components/onboarding-client.tsx');
const adminSource = readSource('components/workspace-admin-client.tsx');
const huSource = readSource('src/i18n/resources/hu.ts');
const enSource = readSource('src/i18n/resources/en.ts');

describe('invitation and join request lifecycle UI contracts', () => {
  it('revokes only through the capability-checked idempotent server action', () => {
    expect(actionSource).toContain("requireWorkspaceCapability(input.workspaceId, 'membership.invite')");
    expect(actionSource).toContain("supabase.rpc('revoke_membership_invitation'");
    expect(actionSource).toContain('p_invitation_id: input.invitationId');
    expect(actionSource).toContain('p_idempotency_key: input.idempotencyKey');
    expect(adminSource).toContain('revokeWorkspaceMembershipInvitation');
    expect(adminSource).toContain("invitation.status === 'PENDING'");
  });

  it('sends requester cancellation with the exact optimistic version', () => {
    expect(actionSource).toContain("supabase.rpc('cancel_join_request'");
    expect(actionSource).toContain('p_expected_version: input.expectedVersion');
    expect(onboardingSource).toContain("version: readNumber(row, ['request_version', 'version']) || 1");
    expect(onboardingSource).toContain('expectedVersion: request.version');
    expect(onboardingSource).toContain('cancelMyJoinRequest');
  });

  it('resubmits only opaque evidence references and never raw files', () => {
    expect(actionSource).toContain('EVIDENCE_REFERENCE_PATTERN');
    expect(actionSource).toContain("supabase.rpc('resubmit_join_request_evidence'");
    expect(actionSource).toContain('p_evidence_references: evidenceReferences');
    expect(onboardingSource).toContain('resubmitMyJoinRequestEvidence');
    expect(onboardingSource).toContain(".split(/\\r?\\n/)");
    expect(onboardingSource).not.toContain('type="file"');
  });

  it('blocks evidence submission in the client while a counter-offer is unresolved', () => {
    expect(onboardingSource).toContain('hasUnresolvedCounterOffer');
    expect(onboardingSource).toContain('request.counterOfferId && !request.counterOfferAccepted');
    expect(onboardingSource).toContain("t('onboarding.joinLifecycle.counterOfferFirst')");
  });

  it('collects and forwards explicit owner shares across join, invite and counter-offer flows', () => {
    expect(onboardingSource).toContain('ownershipShareNumerator');
    expect(onboardingSource).toContain('p_share_numerator: payload.shareNumerator');
    expect(onboardingSource).toContain('A tulajdoni lap szerinti törtet add meg');
    expect(adminSource).toContain('inviteShareNumerator');
    expect(adminSource).toContain('offeredShareNumerator');
    expect(actionSource).toContain('p_share_numerator: isOwnershipRelationship(input.relationshipType)');
    expect(actionSource).toContain('p_offered_share_numerator:');
    expect(actionSource).toContain('OWNERSHIP_SHARE_NOT_APPLICABLE');
  });

  it('keeps the new lifecycle copy synchronized in Hungarian and English', () => {
    for (const key of ['joinLifecycle:', 'cancelSuccess:', 'evidenceReferences:', 'counterOfferFirst:']) {
      expect(huSource).toContain(key);
      expect(enSource).toContain(key);
    }
  });
});
