import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260829150000_ownership_share_join_flow_closure.sql'),
  'utf8',
);
const runtimeCanary = readFileSync(
  resolve(process.cwd(), 'tests/supabase/ownership-share-join-flow-runtime-canary.sql'),
  'utf8',
);

function functionBlock(name: string, occurrence = 0): string {
  const marker = `CREATE OR REPLACE FUNCTION ${name}`;
  let start = -1;
  for (let index = 0; index <= occurrence; index += 1) {
    start = migration.indexOf(marker, start + 1);
  }
  expect(start, `${name} occurrence ${occurrence} must exist`).toBeGreaterThanOrEqual(0);
  const next = migration.indexOf('CREATE OR REPLACE FUNCTION ', start + marker.length);
  return migration.slice(start, next === -1 ? migration.length : next);
}

describe('ownership share join-flow closure', () => {
  it('ships a rollback-only PostgreSQL runtime canary for share and stale-offer paths', () => {
    expect(runtimeCanary).toContain('\\set ON_ERROR_STOP on');
    expect(runtimeCanary.trim()).toMatch(/^\\set ON_ERROR_STOP on[\s\S]*BEGIN;[\s\S]*ROLLBACK;[\s\S]*runtime canary PASS/);
    for (const invariant of [
      'OWNERSHIP_SHARE_REQUIRED',
      'COUNTER_OFFER_STALE',
      'JOIN_REQUEST_COUNTER_OFFER_NOT_PENDING',
      'JOIN_REQUEST_EXPIRED',
    ]) {
      expect(runtimeCanary).toContain(invariant);
    }
    expect(runtimeCanary).toContain('ownership.share_numerator = 1');
    expect(runtimeCanary).toContain('request.requested_share_numerator = 1');
  });

  it('is forward-only, reapplicable and stores fractions at every request boundary', () => {
    expect(migration.trim()).toMatch(/^--[\s\S]*BEGIN;[\s\S]*COMMIT;$/);
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS share_numerator bigint');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS requested_share_numerator bigint');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS offered_share_numerator bigint');
    expect(migration).toContain('membership_invitations_share_shape_check');
    expect(migration).toContain('join_requests_share_shape_check');
    expect(migration).toContain('join_request_offers_share_shape_check');
    expect(migration).toContain("to_regprocedure('private.submit_join_request_without_share_legacy");
  });

  it('requires explicit shares for owner submissions and invitations', () => {
    const submit = functionBlock('public.submit_join_request');
    const invite = functionBlock('public.issue_membership_invitation');

    for (const block of [submit, invite]) {
      expect(block).toContain("IN ('OWNER', 'OWNER_OCCUPANT')");
      expect(block).toContain('p_share_numerator IS NULL');
      expect(block).toContain('p_share_numerator > p_share_denominator');
      expect(block).toContain('OWNERSHIP_SHARE_REQUIRED');
      expect(block).toContain('OWNERSHIP_SHARE_NOT_APPLICABLE');
      expect(block).toContain('IDEMPOTENCY_PAYLOAD_MISMATCH');
    }
  });

  it('carries invitation shares into the claimed ownership record', () => {
    const accept = functionBlock('public.accept_membership_invitation');

    expect(accept).toContain('private.accept_membership_invitation_without_share_legacy');
    expect(accept).toContain("v_invitation.relationship_type IN ('OWNER', 'OWNER_OCCUPANT')");
    expect(accept).toContain('share_numerator = v_invitation.share_numerator');
    expect(accept).toContain("ownership.source = 'INVITATION'");
  });

  it('makes owner counter-offers explicit and transfers the accepted fraction', () => {
    const review = functionBlock('public.review_join_request');
    const accept = functionBlock('public.accept_join_request_offer');

    expect(review).toContain("v_decision <> 'COUNTER_OFFER'");
    expect(review).toContain('p_offered_share_numerator bigint');
    expect(review).toContain('offered_share_numerator, offered_share_denominator');
    expect(review).toContain('OWNERSHIP_SHARE_REQUIRED');
    expect(accept).toContain('requested_share_numerator = v_offer.offered_share_numerator');
    expect(accept).toContain('requested_share_denominator = v_offer.offered_share_denominator');
  });

  it('rejects stale, expired and terminal counter-offer acceptance while preserving retries', () => {
    const accept = functionBlock('public.accept_join_request_offer');

    expect(accept).toContain("v_request.status <> 'NEEDS_EVIDENCE'");
    expect(accept).toContain('v_request.expires_at <= now()');
    expect(accept).toContain('v_latest_offer_id IS DISTINCT FROM v_offer.id');
    expect(accept).toContain("terminal_event.event_type IN ('ACCEPTED', 'WITHDRAWN')");
    expect(accept).toContain('COUNTER_OFFER_STALE');
    expect(accept).toMatch(/IF EXISTS \([\s\S]*event_type = 'ACCEPTED'[\s\S]*RETURN QUERY/);
  });

  it('keeps old signatures for non-owner rolling clients and exposes shares in lists', () => {
    expect(migration).toContain('public.submit_join_request(uuid, uuid, text, text, uuid)');
    expect(migration).toContain('public.issue_membership_invitation(uuid, text, uuid, text, timestamptz, uuid)');
    expect(migration).toContain('public.review_join_request(uuid, text, text, uuid, text, uuid)');
    expect(migration).toContain('requested_share_numerator bigint');
    expect(migration).toContain('latest_counter_offer_share_numerator bigint');
    expect(migration).toContain('latest_offer_share_numerator bigint');
    expect(migration).toContain('TO authenticated;');
  });
});
