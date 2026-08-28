import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(),
  createClient: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock('@/lib/superadmin-auth', () => ({
  isSuperadminAuthenticated: mocks.authenticated,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}));

import { GET, PATCH } from '@/app/api/superadmin/community-requests/route';

const requestId = 'aaaaaaaa-1111-4111-8111-111111111111';
const idempotencyKey = 'bbbbbbbb-2222-4222-8222-222222222222';
const candidateAddressId = 'cccccccc-3333-4333-8333-333333333333';

function reviewRequest(overrides: Record<string, unknown> = {}, origin = 'https://panellako.hu') {
  return new NextRequest('https://panellako.hu/api/superadmin/community-requests', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Host: 'panellako.hu',
      Origin: origin,
      'Sec-Fetch-Site': 'same-origin',
      'X-Forwarded-For': '192.0.2.15',
    },
    body: JSON.stringify({
      requestId,
      decision: 'APPROVE',
      reason: 'A hivatalos nyilvántartás adatai egyeznek.',
      verificationMethod: 'OFFICIAL_REGISTER',
      evidenceRefs: ['official-register:KCR-2026-001'],
      idempotencyKey,
      reviewerActor: 'attacker@example.invalid',
      ...overrides,
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-secret');
  vi.stubEnv('SUPERADMIN_EMAIL', '  Reviewer@PanelLako.HU  ');

  mocks.authenticated.mockResolvedValue(true);
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  mocks.maybeSingle.mockResolvedValue({
    data: { id: requestId, governance_mode: 'REPRESENTATIVE_MANAGED', legal_form: 'CONDOMINIUM' },
    error: null,
  });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.createClient.mockReturnValue({ rpc: mocks.rpc, from: mocks.from });
});

describe('superadmin community request API', () => {
  it('authenticates before constructing the service-role client', async () => {
    mocks.authenticated.mockResolvedValue(false);

    const response = await GET(new NextRequest('https://panellako.hu/api/superadmin/community-requests'));

    expect(response.status).toBe(401);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('loads a bounded status page through the service-only list RPC', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        request_id: requestId,
        request_status: 'PENDING_VERIFICATION',
        claimant_email: 'private@example.hu',
      }],
      error: null,
    });

    const response = await GET(new NextRequest(
      'https://panellako.hu/api/superadmin/community-requests?status=pending_verification&limit=999',
    ));

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('list_community_creation_requests', {
      p_status: 'PENDING_VERIFICATION',
      p_limit: 100,
    });
    const body = await response.json() as { requests: Array<Record<string, unknown>> };
    expect(body).toMatchObject({ requests: [{ request_id: requestId }] });
    expect(body.requests[0]).not.toHaveProperty('claimant_email');
  });

  it('lists terminal states and projects fuzzy candidates without claimant PII', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [], error: null });
    const terminal = await GET(new NextRequest(
      'https://panellako.hu/api/superadmin/community-requests?status=activated&limit=25',
    ));
    expect(terminal.status).toBe(200);
    expect(mocks.rpc).toHaveBeenLastCalledWith('list_community_creation_requests', {
      p_status: 'ACTIVATED',
      p_limit: 25,
    });

    mocks.rpc.mockResolvedValueOnce({
      data: [{
        candidate_address_id: candidateAddressId,
        formatted_address: '1135 Budapest, Gidófalvy Lajos utca 9.',
        similarity_score: 0.94,
        candidate_workspace_id: requestId,
        claimant_email: 'must-not-leak@example.hu',
      }],
      error: null,
    });
    const candidates = await GET(new NextRequest(
      `https://panellako.hu/api/superadmin/community-requests?candidate_for=${requestId}&limit=25`,
    ));
    expect(candidates.status).toBe(200);
    expect(mocks.rpc).toHaveBeenLastCalledWith('list_community_address_candidates', {
      p_request_id: requestId,
      p_limit: 25,
    });
    const candidateBody = await candidates.json() as { candidates: Array<Record<string, unknown>> };
    expect(candidateBody.candidates[0]).toMatchObject({
      candidate_address_id: candidateAddressId,
      similarity_score: 0.94,
    });
    expect(candidateBody.candidates[0]).not.toHaveProperty('claimant_email');
  });

  it('does not accept alternate Supabase URL or service-key environment fallbacks', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.stubEnv('SUPABASE_URL', 'https://wrong-project.supabase.co');
    vi.stubEnv('NEXT_SUPABASE_SERVICE_ROLE_KEY', 'wrong-service-key');

    const response = await GET(new NextRequest('https://panellako.hu/api/superadmin/community-requests'));

    expect(response.status).toBe(500);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('rejects cross-origin state changes before constructing the service client', async () => {
    const response = await PATCH(reviewRequest({}, 'https://attacker.example'));

    expect(response.status).toBe(403);
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('injects the normalized server reviewer and ignores client reviewer identity', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ request_id: requestId, request_status: 'APPROVED', activation_pending: true }],
      error: null,
    });

    const response = await PATCH(reviewRequest());

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('review_community_creation_request', {
      p_request_id: requestId,
      p_decision: 'APPROVE',
      p_review_reason: 'A hivatalos nyilvántartás adatai egyeznek.',
      p_verification_method: 'OFFICIAL_REGISTER',
      p_evidence_refs: { official_register_reference: 'official-register:KCR-2026-001' },
      p_reviewer_actor: 'reviewer@panellako.hu',
      p_idempotency_key: idempotencyKey,
    });
    expect(mocks.rpc.mock.calls.at(-1)?.[1]).not.toMatchObject({
      p_reviewer_actor: 'attacker@example.invalid',
    });
  });

  it('rejects governance-incompatible verification methods and raw URLs', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { id: requestId, governance_mode: 'SELF_MANAGED', legal_form: 'CONDOMINIUM' },
      error: null,
    });

    const incompatible = await PATCH(reviewRequest({ verificationMethod: 'SIGNED_MANDATE' }));
    expect(incompatible.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();

    mocks.maybeSingle.mockResolvedValue({
      data: { id: requestId, governance_mode: 'BOARD_MANAGED', legal_form: 'CONDOMINIUM' },
      error: null,
    });
    const boardResolution = await PATCH(reviewRequest({
      verificationMethod: 'SELF_MANAGED_RESOLUTION',
      evidenceRefs: ['community-resolution:HAT-2026-8'],
    }));
    expect(boardResolution.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();

    mocks.maybeSingle.mockResolvedValue({
      data: { id: requestId, governance_mode: 'SELF_MANAGED', legal_form: 'CONDOMINIUM' },
      error: null,
    });
    const rawUrl = await PATCH(reviewRequest({
      verificationMethod: 'SELF_MANAGED_RESOLUTION',
      evidenceRefs: ['https://storage.example/private.pdf'],
    }));
    expect(rawUrl.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('requires and maps the second legal-basis reference for self-managed undivided property', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: requestId,
        governance_mode: 'SELF_MANAGED',
        legal_form: 'UNDIVIDED_COMMON_OWNERSHIP',
      },
      error: null,
    });

    const missingLegalBasis = await PATCH(reviewRequest({
      verificationMethod: 'SELF_MANAGED_RESOLUTION',
      evidenceRefs: ['community-resolution:HAT-2026-7'],
    }));
    expect(missingLegalBasis.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();

    const complete = await PATCH(reviewRequest({
      verificationMethod: 'SELF_MANAGED_RESOLUTION',
      evidenceRefs: ['community-resolution:HAT-2026-7', 'legal-basis:OKIRAT-44'],
    }));
    expect(complete.status).toBe(200);
    expect(mocks.rpc).toHaveBeenLastCalledWith('review_community_creation_request', expect.objectContaining({
      p_evidence_refs: {
        community_resolution_reference: 'community-resolution:HAT-2026-7',
        legal_basis_reference: 'legal-basis:OKIRAT-44',
      },
    }));
  });

  it('allows non-approval review decisions without fabricated evidence', async () => {
    const response = await PATCH(reviewRequest({
      decision: 'NEEDS_EVIDENCE',
      reason: 'A kérelmezőtől még egy olvasható határozat szükséges.',
      evidenceRefs: [],
    }));

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenLastCalledWith('review_community_creation_request', expect.objectContaining({
      p_decision: 'NEEDS_EVIDENCE',
      p_evidence_refs: {},
    }));
  });

  it('resolves one fuzzy address candidate with typed evidence and server reviewer identity', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [{ resolution: 'NOT_DUPLICATE' }], error: null });
    const response = await PATCH(reviewRequest({
      action: 'RESOLVE_ADDRESS_CANDIDATE',
      requestId,
      candidateAddressId,
      duplicateResolution: 'NOT_DUPLICATE',
      reason: 'A lépcsőház és a helyrajzi azonosító bizonyítottan eltér.',
      evidenceRefs: ['duplicate-override:KCR-CIM-2026-7'],
      decision: undefined,
      verificationMethod: undefined,
    }));

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenLastCalledWith('resolve_community_address_candidate', {
      p_request_id: requestId,
      p_candidate_address_id: candidateAddressId,
      p_resolution: 'NOT_DUPLICATE',
      p_resolution_reason: 'A lépcsőház és a helyrajzi azonosító bizonyítottan eltér.',
      p_evidence_refs: { duplicate_override_reference: 'duplicate-override:KCR-CIM-2026-7' },
      p_reviewer_actor: 'reviewer@panellako.hu',
      p_idempotency_key: idempotencyKey,
    });
  });
});
