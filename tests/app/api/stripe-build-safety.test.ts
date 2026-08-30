import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Stripe route build safety', () => {
  const routes = [
    'app/api/stripe/checkout/route.ts',
    'app/api/stripe/portal/route.ts',
    'app/api/stripe/webhook/route.ts',
  ];

  it.each(routes)('%s never initializes Stripe during module loading', (route) => {
    const source = readSource(route);

    expect(source).toContain('getStripeClient()');
    expect(source).not.toContain('new Stripe(');
  });

  it('keeps the Stripe SDK constructor behind runtime configuration', () => {
    const source = readSource('lib/stripe/server.ts');

    expect(source).toContain("process.env.STRIPE_SECRET_KEY?.trim()");
    expect(source).toContain('if (!apiKey) return null');
  });
});
