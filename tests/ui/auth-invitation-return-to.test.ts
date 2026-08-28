import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const loginSource = readFileSync(join(root, 'app/login/page.tsx'), 'utf8');
const registerSource = readFileSync(join(root, 'app/register/page.tsx'), 'utf8');

describe('invitation-aware email/password registration', () => {
  it('preserves the sanitized destination from login into registration', () => {
    expect(loginSource).toContain("const returnTo = sanitizeReturnTo(searchParams.get('next'));");
    expect(loginSource).toContain('`/register?next=${encodeURIComponent(returnTo)}`');
  });

  it('uses the same safe destination for confirmation callbacks and immediate sessions', () => {
    expect(registerSource).toContain("sanitizeReturnTo(searchParams.get('next'), '/onboarding')");
    expect(registerSource).toContain("callbackUrl.searchParams.set('next', returnTo)");
    expect(registerSource).toContain('window.location.assign(returnTo)');
    expect(registerSource).not.toContain("window.location.assign('/onboarding')");
  });

  it('preserves the destination when returning from registration to login', () => {
    expect(registerSource).toContain('`/login?next=${encodeURIComponent(returnTo)}`');
  });
});
