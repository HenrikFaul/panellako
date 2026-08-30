import 'server-only';

import Stripe from 'stripe';

let cachedStripe: { apiKey: string; client: Stripe } | null = null;

/**
 * Stripe is optional outside billing-enabled deployments. Initializing the
 * SDK at module load makes every Next.js build depend on that optional secret,
 * including previews that never execute a billing request.
 */
export function getStripeClient(): Stripe | null {
  const apiKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!apiKey) return null;

  if (cachedStripe?.apiKey === apiKey) return cachedStripe.client;

  try {
    const client = new Stripe(apiKey, {
      apiVersion: '2026-04-22.dahlia',
      typescript: true,
    });
    cachedStripe = { apiKey, client };
    return client;
  } catch {
    return null;
  }
}
