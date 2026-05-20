import { describe, it, expect } from 'vitest';
import { sha256, eqHash, idempotencyKey } from '../../lib/integrity';

describe('integrity.sha256', () => {
  it('produces stable hex for string input', () => {
    const h = sha256('hello');
    expect(h.hex).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
    expect(h.bytes).toBe(5);
  });

  it('produces same hex for equal Uint8Array and Buffer input', () => {
    const h1 = sha256(new Uint8Array([1, 2, 3]));
    const h2 = sha256(Buffer.from([1, 2, 3]));
    expect(h1.hex).toBe(h2.hex);
  });

  it('eqHash returns true for matching hashes, false otherwise', () => {
    expect(eqHash(sha256('a'), sha256('a'))).toBe(true);
    expect(eqHash(sha256('a'), sha256('b'))).toBe(false);
  });

  it('idempotencyKey is deterministic and order-independent', () => {
    const k1 = idempotencyKey('test', { a: 1, b: 2 });
    const k2 = idempotencyKey('test', { b: 2, a: 1 });
    expect(k1).toBe(k2);
    expect(k1.startsWith('test:')).toBe(true);
  });
});
