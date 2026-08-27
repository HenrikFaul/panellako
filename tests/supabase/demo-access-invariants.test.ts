import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260827163737_demo_profiles_never_expire.sql',
);
const seedPath = resolve(process.cwd(), 'supabase/seed.sql');

const demoIdentities = [
  ['aaaaaaaa-0001-0001-0001-000000000001', 'demo.kepviselo@panellako.hu'],
  ['aaaaaaaa-0002-0002-0002-000000000002', 'demo.lako@panellako.hu'],
  ['aaaaaaaa-0003-0003-0003-000000000003', 'demo.konyvelo@panellako.hu'],
] as const;

describe('demo access data invariants', () => {
  it('limits the migration to the three exact demo UUID and e-mail pairs', () => {
    const migration = readFileSync(migrationPath, 'utf8');

    for (const [id, email] of demoIdentities) {
      expect(migration).toContain(`id = '${id}'::uuid AND email = '${email}'`);
    }

    expect(migration).not.toContain('UPDATE public.subscriptions');
    expect(migration).not.toMatch(/email\s+LIKE/i);
  });

  it('makes seed reruns repair permanent access without changing paid state', () => {
    const seed = readFileSync(seedPath, 'utf8');

    expect(seed).toContain('role, free_trial_never_expires');
    expect(seed).toMatch(/ON CONFLICT \(id\) DO UPDATE\s+SET free_trial_never_expires = EXCLUDED\.free_trial_never_expires;/);
    expect(seed).not.toContain('SET status = \'active\'');
  });
});
