import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import {
  hasJsonContentType,
  isSameOriginAdminRequest,
  normalizeAdminReason,
} from '@/lib/superadmin/http';

function request(origin: string, host = 'panellako.hu', contentType = 'application/json') {
  return new NextRequest('https://panellako.hu/api/superadmin/example', {
    method: 'POST',
    headers: {
      Origin: origin,
      Host: host,
      'Sec-Fetch-Site': 'same-origin',
      'Content-Type': contentType,
    },
  });
}

describe('platform admin HTTP boundary helpers', () => {
  it('accepts only the exact same origin', () => {
    expect(isSameOriginAdminRequest(request('https://panellako.hu'))).toBe(true);
    expect(isSameOriginAdminRequest(request('https://attacker.example'))).toBe(false);
    expect(isSameOriginAdminRequest(request('https://panellako.hu', 'admin.panellako.hu'))).toBe(false);
  });

  it('requires JSON and bounded meaningful reasons', () => {
    expect(hasJsonContentType(request('https://panellako.hu'))).toBe(true);
    expect(hasJsonContentType(request('https://panellako.hu', 'panellako.hu', 'text/plain'))).toBe(false);
    expect(normalizeAdminReason('  Biztonsági karbantartás  ')).toBe('Biztonsági karbantartás');
    expect(normalizeAdminReason('rövid')).toBeNull();
  });
});
