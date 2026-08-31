import { describe, expect, it } from 'vitest';
import {
  adminPayloadDigest,
  canonicalAdminPayload,
  isSha256Digest,
} from '@/lib/superadmin/request-integrity';

describe('platform admin request integrity', () => {
  it('produces the same digest for objects with different insertion order', () => {
    const left = { target: 'jobs', payload: { county: 'Pest', retry: 2 } };
    const right = { payload: { retry: 2, county: 'Pest' }, target: 'jobs' };

    expect(canonicalAdminPayload(left)).toBe(canonicalAdminPayload(right));
    expect(adminPayloadDigest(left)).toBe(adminPayloadDigest(right));
    expect(isSha256Digest(adminPayloadDigest(left))).toBe(true);
  });

  it('preserves array order and rejects non-JSON numeric values', () => {
    expect(adminPayloadDigest({ values: [1, 2] })).not.toBe(
      adminPayloadDigest({ values: [2, 1] }),
    );
    expect(() => canonicalAdminPayload({ value: Number.NaN })).toThrow(
      'ADMIN_PAYLOAD_INVALID_NUMBER',
    );
  });

  it('rejects undefined fields so approval identity cannot silently drift', () => {
    expect(() => canonicalAdminPayload({ allowed: true, omitted: undefined })).toThrow(
      'ADMIN_PAYLOAD_INVALID_KEY',
    );
  });
});
