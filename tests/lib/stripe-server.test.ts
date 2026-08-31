import { afterEach, describe, expect, it, vi } from 'vitest';

import { getStripeClient } from '@/lib/stripe/server';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('optional Stripe server configuration', () => {
  it('does not initialize Stripe when the secret key is absent', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');

    expect(getStripeClient()).toBeNull();
  });

  it('initializes lazily when billing is configured', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_panel_lako');

    expect(getStripeClient()).not.toBeNull();
  });
});
