export interface SubscriptionAccess {
  status: string;
  trial_end: string | null;
}

export interface ProfileTrialAccess {
  free_trial_never_expires: boolean;
  free_trial_start: string | null;
  free_trial_days: number;
  created_at: string | null;
}

const DAY_IN_MS = 86_400_000;

/** Returns true when the superadmin-managed profile trial grants access. */
export function hasProfileTrialAccess(
  profile: ProfileTrialAccess | null,
  now: Date = new Date(),
): boolean {
  if (!profile) return false;
  if (profile.free_trial_never_expires) return true;

  const start = profile.free_trial_start ?? profile.created_at;
  if (!start || !Number.isFinite(profile.free_trial_days)) return false;

  const startMs = new Date(start).getTime();
  if (!Number.isFinite(startMs)) return false;

  return startMs + profile.free_trial_days * DAY_IN_MS > now.getTime();
}

/** Preserves the existing building subscription access rules. */
export function hasSubscriptionAccess(
  subscription: SubscriptionAccess | null,
  now: Date = new Date(),
): boolean {
  if (!subscription) return true;
  if (subscription.status === 'active') return true;
  if (subscription.status !== 'trialing') return false;
  if (!subscription.trial_end) return true;

  const trialEndMs = new Date(subscription.trial_end).getTime();
  return Number.isFinite(trialEndMs) && trialEndMs > now.getTime();
}

export function hasWorkspaceAccess(
  subscription: SubscriptionAccess | null,
  profile: ProfileTrialAccess | null,
  now: Date = new Date(),
): boolean {
  return hasSubscriptionAccess(subscription, now) || hasProfileTrialAccess(profile, now);
}
