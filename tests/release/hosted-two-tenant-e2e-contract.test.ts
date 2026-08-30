import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const script = readFileSync('scripts/hosted-two-tenant-e2e.mjs', 'utf8');

describe('hosted two-tenant E2E cleanup contract', () => {
  it('checks every fixture deletion for errors and exact zero residue', () => {
    expect(script).toContain(".delete().eq(column, value)");
    expect(script).toContain(".select('*', { head: true, count: 'exact' })");
    expect(script).toContain("Fixture residue detected:");
    expect(script).toContain("(count ?? 0) !== 0");
  });

  it('publishes PASS evidence only after the finally cleanup completed', () => {
    const finallyIndex = script.indexOf('} finally {');
    const primaryErrorIndex = script.indexOf('if (primaryError) throw primaryError;');
    const proofOutputIndex = script.indexOf('cleanupVerified: true');

    expect(finallyIndex).toBeGreaterThan(-1);
    expect(primaryErrorIndex).toBeGreaterThan(finallyIndex);
    expect(proofOutputIndex).toBeGreaterThan(primaryErrorIndex);
  });
});
