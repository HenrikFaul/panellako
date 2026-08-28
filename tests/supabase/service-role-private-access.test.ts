import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260829100000_service_role_private_schema_access.sql',
  ),
  'utf8',
);

describe('service-role private helper access migration', () => {
  it('grants only usage and function execution without schema creation rights', () => {
    expect(migration).toContain('GRANT USAGE ON SCHEMA private TO service_role;');
    expect(migration).toContain(
      'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO service_role;',
    );
    expect(migration).not.toMatch(/GRANT\s+CREATE\s+ON\s+SCHEMA\s+private/i);
    expect(migration.trim()).toMatch(/^--[\s\S]*BEGIN;[\s\S]*COMMIT;$/);
  });
});
