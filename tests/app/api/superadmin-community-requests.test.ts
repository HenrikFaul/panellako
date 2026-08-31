import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireRead: vi.fn(),
  requireMutation: vi.fn(),
  digest: vi.fn(),
  authorityErrorCode: vi.fn(),
  createServiceClient: vi.fn(),
  createAuthenticatedClient: vi.fn(),
  serviceRpc: vi.fn(),
  authenticatedRpc: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock('@/lib/superadmin/operator-authority', () => ({
  requirePlatformRead: mocks.requireRead,
  requirePlatformMutation: mocks.requireMutation,
  getDatabasePlatformPayloadDigest: mocks.digest,
  platformAuthorityErrorCode: mocks.authorityErrorCode,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createServiceClient,
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createAuthenticatedClient }));

import { GET, PATCH } from '@/app/api/superadmin/community-requests/route';

const requestId = 'aaaaaaaa-1111-4111-8111-111111111111';
const idempotencyKey = 'bbbbbbbb-2222-4222-8222-222222222222';
const candidateAddressId = 'cccccccc-3333-4333-8333-333333333333';
const operatorProfileId = 'dddddddd-4444-4444-8444-444444444444';

function allowedAuthority() {
  return {
    ok: true,
    context: {
      authenticated: true,
      mode: 'operator',
      operatorProfileId,
      operatorEmail: 'reviewer@panellako.hu',
      assuranceLevel: 'aal2',
      roleKeys: ['COMMUNITY_REVIEWER'],
      capabilityKeys: ['platform.communities.read', 'platform.communities.review'],
      authorityValidUntil: null,
      activeSupportSessions: [],
      canBootstrap: false,
      breakGlassExpiresAt: null,
    },
    status: 403,
    errorCode: 'PLATFORM_CAPABILITY_DENIED',
  };
}

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

  mocks.requireRead.mockResolvedValue(allowedAuthority());
  mocks.requireMutation.mockResolvedValue(allowedAuthority());
  mocks.digest.mockResolvedValue({ digest: `sha256:${'a'.repeat(64)}`, errorCode: null });
  mocks.authorityErrorCode.mockImplementation((_error: unknown, fallback: string) => fallback);
  mocks.serviceRpc.mockResolvedValue({ data: [], error: null });
  mocks.authenticatedRpc.mockImplementation(async (name: string) => {
    if (name === 'resolve_platform_community_address_candidate') {
      return {
        data: {
          outcome: 'resolved',
          request_id: requestId,
          candidate_address_id: candidateAddressId,
          duplicate_resolution: 'NOT_DUPLICATE',
          replayed: false,
        },
        error: null,
      };
    }
    if (name === 'review_platform_community_creation_request') {
      return {
        data: {
          outcome: 'reviewed',
          request_id: requestId,
          request_status: 'APPROVED',
          activation_pending: true,
          replayed: false,
        },
        error: null,
      };
    }
    throw new Error(`Unexpected authenticated RPC: ${name}`);
  });
  mocks.maybeSingle.mockResolvedValue({
    data: { id: requestId, governance_mode: 'REPRESENTATIVE_MANAGED', legal_form: 'CONDOMINIUM' },
    error: null,
  });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.createServiceClient.mockReturnValue({ rpc: mocks.serviceRpc, from: mocks.from });
  mocks.createAuthenticatedClient.mockReturnValue({ rpc: mocks.authenticatedRpc });
});

describe('superadmin community request API', () => {
  it('authenticates before constructing the service-role client', async () => {
    mocks.requireRead.mockResolvedValue({
      ...allowedAuthority(),
      ok: false,
      status: 401,
      errorCode: 'AUTH_REQUIRED',
    });

    const response = await GET(new NextRequest('https://panellako.hu/api/superadmin/community-requests'));

    expect(response.status).toBe(401);
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });

  it('loads a bounded status page through the service-only list RPC', async () => {
    mocks.serviceRpc.mockResolvedValue({
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
    expect(mocks.serviceRpc).toHaveBeenCalledWith('list_community_creation_requests', {
      p_status: 'PENDING_VERIFICATION',
      p_limit: 100,
    });
    const body = await response.json() as { requests: Array<Record<string, unknown>> };
    expect(body).toMatchObject({ requests: [{ request_id: requestId }] });
    expect(body.requests[0]).not.toHaveProperty('claimant_email');
  });

  it('lists terminal states and projects fuzzy candidates without claimant PII', async () => {
    mocks.serviceRpc.mockResolvedValueOnce({ data: [], error: null });
    const terminal = await GET(new NextRequest(
      'https://panellako.hu/api/superadmin/community-requests?status=activated&limit=25',
    ));
    expect(terminal.status).toBe(200);
    expect(mocks.serviceRpc).toHaveBeenLastCalledWith('list_community_creation_requests', {
      p_status: 'ACTIVATED',
      p_limit: 25,
    });

    mocks.serviceRpc.mockResolvedValueOnce({
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
    expect(mocks.serviceRpc).toHaveBeenLastCalledWith('list_community_address_candidates', {
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
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });

  it('rejects cross-origin state changes before constructing the service client', async () => {
    const response = await PATCH(reviewRequest({}, 'https://attacker.example'));

    expect(response.status).toBe(403);
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
    expect(mocks.createAuthenticatedClient).not.toHaveBeenCalled();
    expect(mocks.serviceRpc).not.toHaveBeenCalled();
    expect(mocks.authenticatedRpc).not.toHaveBeenCalled();
  });

  it('binds the exact review payload to an authenticated RPC and ignores client reviewer identity', async () => {
    const response = await PATCH(reviewRequest());

    expect(response.status).toBe(200);
    const payload = {
      request_id: requestId,
      decision: 'APPROVE',
      reason: 'A hivatalos nyilvántartás adatai egyeznek.',
      verification_method: 'OFFICIAL_REGISTER',
      evidence_refs: { official_register_reference: 'official-register:KCR-2026-001' },
    };
    expect(mocks.digest).toHaveBeenCalledWith(
      expect.objectContaining({ rpc: mocks.authenticatedRpc }),
      payload,
    );
    expect(mocks.authenticatedRpc).toHaveBeenCalledWith('review_platform_community_creation_request', {
      p_request_id: requestId,
      p_decision: 'APPROVE',
      p_review_reason: 'A hivatalos nyilvántartás adatai egyeznek.',
      p_verification_method: 'OFFICIAL_REGISTER',
      p_evidence_refs: { official_register_reference: 'official-register:KCR-2026-001' },
      p_idempotency_key: idempotencyKey,
      p_expected_payload_digest: `sha256:${'a'.repeat(64)}`,
    });
    expect(mocks.authenticatedRpc.mock.calls.at(-1)?.[1]).not.toMatchObject({
      p_reviewer_actor: 'attacker@example.invalid',
    });
    expect(mocks.serviceRpc).not.toHaveBeenCalled();
  });

  it('rejects governance-incompatible verification methods and raw URLs', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { id: requestId, governance_mode: 'SELF_MANAGED', legal_form: 'CONDOMINIUM' },
      error: null,
    });

    const incompatible = await PATCH(reviewRequest({ verificationMethod: 'SIGNED_MANDATE' }));
    expect(incompatible.status).toBe(400);
    expect(mocks.authenticatedRpc).not.toHaveBeenCalled();

    mocks.maybeSingle.mockResolvedValue({
      data: { id: requestId, governance_mode: 'BOARD_MANAGED', legal_form: 'CONDOMINIUM' },
      error: null,
    });
    const boardResolution = await PATCH(reviewRequest({
      verificationMethod: 'SELF_MANAGED_RESOLUTION',
      evidenceRefs: ['community-resolution:HAT-2026-8'],
    }));
    expect(boardResolution.status).toBe(400);
    expect(mocks.authenticatedRpc).not.toHaveBeenCalled();

    mocks.maybeSingle.mockResolvedValue({
      data: { id: requestId, governance_mode: 'SELF_MANAGED', legal_form: 'CONDOMINIUM' },
      error: null,
    });
    const rawUrl = await PATCH(reviewRequest({
      verificationMethod: 'SELF_MANAGED_RESOLUTION',
      evidenceRefs: ['https://storage.example/private.pdf'],
    }));
    expect(rawUrl.status).toBe(400);
    expect(mocks.authenticatedRpc).not.toHaveBeenCalled();
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
    expect(mocks.authenticatedRpc).not.toHaveBeenCalled();

    const complete = await PATCH(reviewRequest({
      verificationMethod: 'SELF_MANAGED_RESOLUTION',
      evidenceRefs: ['community-resolution:HAT-2026-7', 'legal-basis:OKIRAT-44'],
    }));
    expect(complete.status).toBe(200);
    expect(mocks.authenticatedRpc).toHaveBeenLastCalledWith(
      'review_platform_community_creation_request',
      expect.objectContaining({
      p_evidence_refs: {
        community_resolution_reference: 'community-resolution:HAT-2026-7',
        legal_basis_reference: 'legal-basis:OKIRAT-44',
      },
      }),
    );
  });

  it('allows non-approval review decisions without fabricated evidence', async () => {
    const response = await PATCH(reviewRequest({
      decision: 'NEEDS_EVIDENCE',
      reason: 'A kérelmezőtől még egy olvasható határozat szükséges.',
      evidenceRefs: [],
    }));

    expect(response.status).toBe(200);
    expect(mocks.authenticatedRpc).toHaveBeenLastCalledWith(
      'review_platform_community_creation_request',
      expect.objectContaining({
        p_decision: 'NEEDS_EVIDENCE',
        p_evidence_refs: {},
      }),
    );
  });

  it('resolves one fuzzy address candidate through the authenticated exact-payload RPC', async () => {
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
    const payload = {
      request_id: requestId,
      candidate_address_id: candidateAddressId,
      resolution: 'NOT_DUPLICATE',
      reason: 'A lépcsőház és a helyrajzi azonosító bizonyítottan eltér.',
      evidence_refs: { duplicate_override_reference: 'duplicate-override:KCR-CIM-2026-7' },
    };
    expect(mocks.digest).toHaveBeenCalledWith(
      expect.objectContaining({ rpc: mocks.authenticatedRpc }),
      payload,
    );
    expect(mocks.authenticatedRpc).toHaveBeenLastCalledWith(
      'resolve_platform_community_address_candidate',
      {
      p_request_id: requestId,
      p_candidate_address_id: candidateAddressId,
      p_resolution: 'NOT_DUPLICATE',
      p_resolution_reason: 'A lépcsőház és a helyrajzi azonosító bizonyítottan eltér.',
      p_evidence_refs: { duplicate_override_reference: 'duplicate-override:KCR-CIM-2026-7' },
      p_idempotency_key: idempotencyKey,
        p_expected_payload_digest: `sha256:${'a'.repeat(64)}`,
      },
    );
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
    expect(mocks.serviceRpc).not.toHaveBeenCalled();
  });

  it('redacts database failures while preserving the stable MFA step-up contract', async () => {
    mocks.authenticatedRpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'P0001',
        message: 'sensitive provider detail',
        details: '{"error_code":"MFA_STEP_UP_REQUIRED"}',
      },
    });
    mocks.authorityErrorCode.mockReturnValue('MFA_STEP_UP_REQUIRED');

    const response = await PATCH(reviewRequest({
      action: 'RESOLVE_ADDRESS_CANDIDATE',
      candidateAddressId,
      duplicateResolution: 'NOT_DUPLICATE',
      evidenceRefs: ['duplicate-override:KCR-CIM-2026-7'],
      decision: undefined,
      verificationMethod: undefined,
    }));

    expect(response.status).toBe(428);
    expect(await response.json()).toEqual({
      error: 'MFA_STEP_UP_REQUIRED',
      stepUpHref: '/account/security?next=%2Fsuperadmin',
    });
  });
});
