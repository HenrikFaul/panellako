import { describe, expect, it } from 'vitest';
import {
  hasProfileTrialAccess,
  hasSubscriptionAccess,
  hasWorkspaceAccess,
  type ProfileTrialAccess,
} from '../../lib/subscription-access';

const NOW = new Date('2026-08-27T12:00:00.000Z');

function profile(overrides: Partial<ProfileTrialAccess> = {}): ProfileTrialAccess {
  return {
    free_trial_never_expires: false,
    free_trial_start: '2026-08-01T12:00:00.000Z',
    free_trial_days: 14,
    created_at: '2026-08-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('hasSubscriptionAccess', () => {
  it.each([
    ['no subscription', null, true],
    ['active', { status: 'active', trial_end: '2020-01-01T00:00:00.000Z' }, true],
    ['open-ended trial', { status: 'trialing', trial_end: null }, true],
    ['future trial', { status: 'trialing', trial_end: '2026-08-28T12:00:00.000Z' }, true],
    ['trial ending now', { status: 'trialing', trial_end: NOW.toISOString() }, false],
    ['expired trial', { status: 'trialing', trial_end: '2026-08-26T12:00:00.000Z' }, false],
    ['past due', { status: 'past_due', trial_end: null }, false],
    ['cancelled', { status: 'cancelled', trial_end: null }, false],
    ['incomplete', { status: 'incomplete', trial_end: null }, false],
    ['incomplete expired', { status: 'incomplete_expired', trial_end: null }, false],
    ['unpaid', { status: 'unpaid', trial_end: null }, false],
  ])('%s', (_name, subscription, expected) => {
    expect(hasSubscriptionAccess(subscription, NOW)).toBe(expected);
  });
});

describe('hasProfileTrialAccess', () => {
  it('allows an old profile with permanent access', () => {
    expect(hasProfileTrialAccess(profile({ free_trial_never_expires: true }), NOW)).toBe(true);
  });

  it('allows a regular profile whose trial is still running', () => {
    expect(hasProfileTrialAccess(profile({ free_trial_start: '2026-08-20T12:00:00.000Z' }), NOW)).toBe(true);
  });

  it('denies an expired regular profile and a missing profile', () => {
    expect(hasProfileTrialAccess(profile(), NOW)).toBe(false);
    expect(hasProfileTrialAccess(null, NOW)).toBe(false);
  });
});

describe('hasWorkspaceAccess', () => {
  const expiredSubscription = {
    status: 'trialing',
    trial_end: '2026-08-26T12:00:00.000Z',
  };

  it('allows an expired subscription when the profile has permanent access', () => {
    expect(hasWorkspaceAccess(
      expiredSubscription,
      profile({ free_trial_never_expires: true }),
      NOW,
    )).toBe(true);
  });

  it('denies access when both subscription and profile trial are expired', () => {
    expect(hasWorkspaceAccess(expiredSubscription, profile(), NOW)).toBe(false);
  });

  it('allows an active subscription even when the profile trial is expired', () => {
    expect(hasWorkspaceAccess({ status: 'active', trial_end: null }, profile(), NOW)).toBe(true);
  });
});
