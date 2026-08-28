import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { isSuperadminAuthenticated } from '@/lib/superadmin-auth';

export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_BODY_BYTES = 24 * 1024;
const REVIEW_RATE_LIMIT = 20;
const REVIEW_RATE_WINDOW_MS = 60_000;

const REQUEST_STATUSES = new Set([
  'PENDING_VERIFICATION',
  'NEEDS_EVIDENCE',
  'APPROVED',
  'REJECTED',
  'ACTIVATED',
  'CANCELLED',
  'EXPIRED',
]);
const REVIEW_DECISIONS = new Set(['APPROVE', 'NEEDS_EVIDENCE', 'REJECT']);
const VERIFICATION_METHODS = new Set([
  'OFFICIAL_REGISTER',
  'SIGNED_MANDATE',
  'SELF_MANAGED_RESOLUTION',
]);
const MANAGED_VERIFICATION_METHODS = new Set(['OFFICIAL_REGISTER', 'SIGNED_MANDATE']);
const SELF_MANAGED_VERIFICATION_METHODS = new Set(['SELF_MANAGED_RESOLUTION']);
const DUPLICATE_RESOLUTIONS = new Set(['NOT_DUPLICATE', 'LINK_EXISTING']);
const EVIDENCE_REFERENCE = /^(official-register|signed-mandate|community-resolution|legal-basis|duplicate-override|link-existing|document|attestation|audit):[A-Za-z0-9][A-Za-z0-9._~:/#-]{1,190}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ReviewDecision = 'APPROVE' | 'NEEDS_EVIDENCE' | 'REJECT';
type VerificationMethod = 'OFFICIAL_REGISTER' | 'SIGNED_MANDATE' | 'SELF_MANAGED_RESOLUTION';
type GovernanceMode = 'REPRESENTATIVE_MANAGED' | 'BOARD_MANAGED' | 'SELF_MANAGED';

interface ReviewBody {
  action?: unknown;
  requestId?: unknown;
  decision?: unknown;
  reason?: unknown;
  verificationMethod?: unknown;
  evidenceRefs?: unknown;
  idempotencyKey?: unknown;
  candidateAddressId?: unknown;
  duplicateResolution?: unknown;
}

interface RateEntry {
  count: number;
  resetAt: number;
}

const reviewRateLimits = new Map<string, RateEntry>();

function json(body: Record<string, unknown>, status = 200, headers?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, private',
      ...headers,
    },
  });
}

function serviceClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

  if (!url || !serviceKey) {
    throw new Error('Superadmin data service is not configured');
  }

  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function normalizedReviewerActor(): string | null {
  const email = (process.env.SUPERADMIN_EMAIL ?? '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = request.headers.get('host')?.trim() || forwardedHost;
  const fetchSite = request.headers.get('sec-fetch-site');

  if (!origin || !host || (fetchSite && fetchSite !== 'same-origin')) return false;

  try {
    const parsed = new URL(origin);
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      !parsed.username &&
      !parsed.password &&
      parsed.host.toLowerCase() === host.toLowerCase()
    );
  } catch {
    return false;
  }
}

function rateLimitKey(request: NextRequest, reviewer: string): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return `${reviewer}|${forwardedFor || 'unknown'}`;
}

function consumeReviewRateLimit(key: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const current = reviewRateLimits.get(key);

  if (!current || current.resetAt <= now) {
    reviewRateLimits.set(key, { count: 1, resetAt: now + REVIEW_RATE_WINDOW_MS });
  } else if (current.count >= REVIEW_RATE_LIMIT) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  } else {
    current.count += 1;
  }

  if (reviewRateLimits.size > 250) {
    for (const [entryKey, entry] of reviewRateLimits) {
      if (entry.resetAt <= now) reviewRateLimits.delete(entryKey);
    }
  }

  return { allowed: true, retryAfter: 0 };
}

function parseLimit(raw: string | null): number | null {
  if (raw === null || raw === '') return DEFAULT_PAGE_SIZE;
  if (!/^\d{1,4}$/.test(raw)) return null;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) return null;
  return Math.min(value, MAX_PAGE_SIZE);
}

async function readBoundedBody(request: NextRequest): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function projectReviewQueueRow(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  return {
    request_id: row.request_id,
    community_name: row.community_name,
    formatted_address: row.formatted_address,
    address_verification_status: row.address_verification_status,
    legal_form: row.legal_form,
    governance_mode: row.governance_mode,
    governance_legal_basis: row.governance_legal_basis,
    declared_unit_count: row.declared_unit_count,
    request_status: row.request_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    address_lease_expires_at: row.address_lease_expires_at,
    reviewed_at: row.reviewed_at,
    review_reason: row.review_reason,
    review_verification_method: row.review_verification_method,
    activation_expires_at: row.activation_expires_at,
    activation_pending: row.activation_pending,
    fuzzy_candidate_count: row.fuzzy_candidate_count,
    unresolved_high_similarity_count: row.unresolved_high_similarity_count,
    highest_similarity_score: row.highest_similarity_score,
  };
}

function projectAddressCandidate(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  return {
    candidate_address_id: row.candidate_address_id,
    formatted_address: row.formatted_address,
    similarity_score: row.similarity_score,
    candidate_kind: row.candidate_kind,
    candidate_workspace_id: row.candidate_workspace_id,
    candidate_request_id: row.candidate_request_id,
    candidate_request_status: row.candidate_request_status,
    duplicate_resolution: row.duplicate_resolution,
    resolution_reason: row.resolution_reason,
    resolved_at: row.resolved_at,
  };
}

function governanceAllowsMethod(governanceMode: GovernanceMode, method: VerificationMethod): boolean {
  if (governanceMode === 'SELF_MANAGED') return SELF_MANAGED_VERIFICATION_METHODS.has(method);
  return MANAGED_VERIFICATION_METHODS.has(method);
}

function hasRequiredApprovalEvidence(
  method: VerificationMethod,
  legalForm: string,
  evidenceRefs: string[],
): boolean {
  const requiredPrefix = method === 'OFFICIAL_REGISTER'
    ? 'official-register:'
    : method === 'SIGNED_MANDATE'
      ? 'signed-mandate:'
      : 'community-resolution:';
  if (!evidenceRefs[0]?.startsWith(requiredPrefix)) return false;
  return legalForm !== 'UNDIVIDED_COMMON_OWNERSHIP'
    || (method === 'SELF_MANAGED_RESOLUTION' && Boolean(evidenceRefs[1]?.startsWith('legal-basis:')));
}

function reviewEvidenceObject(
  decision: ReviewDecision,
  method: VerificationMethod,
  legalForm: string,
  evidenceRefs: string[],
): Record<string, string> {
  if (decision !== 'APPROVE') return {};

  const evidence: Record<string, string> = {};
  if (method === 'OFFICIAL_REGISTER') {
    evidence.official_register_reference = evidenceRefs[0];
  } else if (method === 'SIGNED_MANDATE') {
    evidence.signed_mandate_reference = evidenceRefs[0];
  } else {
    evidence.community_resolution_reference = evidenceRefs[0];
  }

  return legalForm === 'UNDIVIDED_COMMON_OWNERSHIP' && method === 'SELF_MANAGED_RESOLUTION'
    ? { ...evidence, legal_basis_reference: evidenceRefs[1] }
    : evidence;
}

function parseReviewBody(value: unknown):
  | {
      requestId: string;
      decision: ReviewDecision;
      reason: string;
      verificationMethod: VerificationMethod;
      evidenceRefs: string[];
      idempotencyKey: string;
    }
  | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as ReviewBody;
  const requestId = typeof body.requestId === 'string' ? body.requestId.trim().toLowerCase() : '';
  const idempotencyKey = typeof body.idempotencyKey === 'string'
    ? body.idempotencyKey.trim().toLowerCase()
    : '';
  const decision = typeof body.decision === 'string' ? body.decision.trim().toUpperCase() : '';
  const verificationMethod = typeof body.verificationMethod === 'string'
    ? body.verificationMethod.trim().toUpperCase()
    : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

  if (
    !UUID.test(requestId) ||
    !UUID.test(idempotencyKey) ||
    !REVIEW_DECISIONS.has(decision) ||
    !VERIFICATION_METHODS.has(verificationMethod) ||
    reason.length < 10 ||
    reason.length > 1000 ||
    !Array.isArray(body.evidenceRefs) ||
    (decision === 'APPROVE' && body.evidenceRefs.length < 1) ||
    body.evidenceRefs.length > 20
  ) {
    return null;
  }

  const evidenceRefs = body.evidenceRefs.map((item) => typeof item === 'string' ? item.trim() : '');
  if (
    evidenceRefs.some((ref) => !EVIDENCE_REFERENCE.test(ref) || /^(?:https?|data|file|blob):/i.test(ref)) ||
    new Set(evidenceRefs).size !== evidenceRefs.length
  ) {
    return null;
  }

  return {
    requestId,
    decision: decision as ReviewDecision,
    reason,
    verificationMethod: verificationMethod as VerificationMethod,
    evidenceRefs,
    idempotencyKey,
  };
}

function parseDuplicateResolutionBody(value: unknown):
  | {
      requestId: string;
      candidateAddressId: string;
      duplicateResolution: 'NOT_DUPLICATE' | 'LINK_EXISTING';
      reason: string;
      evidenceReference: string;
      idempotencyKey: string;
    }
  | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as ReviewBody;
  if (body.action !== 'RESOLVE_ADDRESS_CANDIDATE') return null;

  const requestId = typeof body.requestId === 'string' ? body.requestId.trim().toLowerCase() : '';
  const candidateAddressId = typeof body.candidateAddressId === 'string'
    ? body.candidateAddressId.trim().toLowerCase()
    : '';
  const idempotencyKey = typeof body.idempotencyKey === 'string'
    ? body.idempotencyKey.trim().toLowerCase()
    : '';
  const duplicateResolution = typeof body.duplicateResolution === 'string'
    ? body.duplicateResolution.trim().toUpperCase()
    : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const evidenceRefs = Array.isArray(body.evidenceRefs)
    ? body.evidenceRefs.map((item) => typeof item === 'string' ? item.trim() : '')
    : [];

  if (
    !UUID.test(requestId) ||
    !UUID.test(candidateAddressId) ||
    !UUID.test(idempotencyKey) ||
    !DUPLICATE_RESOLUTIONS.has(duplicateResolution) ||
    reason.length < 3 ||
    reason.length > 1000 ||
    evidenceRefs.length !== 1 ||
    !EVIDENCE_REFERENCE.test(evidenceRefs[0]) ||
    /^(?:https?|data|file|blob):/i.test(evidenceRefs[0]) ||
    (duplicateResolution === 'NOT_DUPLICATE' && !evidenceRefs[0].startsWith('duplicate-override:')) ||
    (duplicateResolution === 'LINK_EXISTING' && !evidenceRefs[0].startsWith('link-existing:'))
  ) {
    return null;
  }

  return {
    requestId,
    candidateAddressId,
    duplicateResolution: duplicateResolution as 'NOT_DUPLICATE' | 'LINK_EXISTING',
    reason,
    evidenceReference: evidenceRefs[0],
    idempotencyKey,
  };
}

export async function GET(request: NextRequest) {
  if (!(await isSuperadminAuthenticated())) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const candidateFor = request.nextUrl.searchParams.get('candidate_for')?.trim().toLowerCase() ?? '';
  const status = (request.nextUrl.searchParams.get('status') ?? 'PENDING_VERIFICATION').trim().toUpperCase();
  const limit = parseLimit(request.nextUrl.searchParams.get('limit'));
  if ((candidateFor && !UUID.test(candidateFor)) || (!candidateFor && !REQUEST_STATUSES.has(status)) || limit === null) {
    return json({ error: 'Invalid request' }, 400);
  }

  try {
    const supabase = serviceClient();
    if (candidateFor) {
      const { data, error } = await supabase.rpc('list_community_address_candidates', {
        p_request_id: candidateFor,
        p_limit: Math.min(limit, 100),
      });
      if (error) {
        console.error('[community-review] address candidate list failed', { code: error.code ?? 'UNKNOWN' });
        return json({ error: 'Unable to load address candidates' }, 500);
      }
      const candidates = Array.isArray(data)
        ? data.slice(0, limit).map(projectAddressCandidate).filter(Boolean)
        : [];
      return json({ candidates });
    }

    const { data, error } = await supabase.rpc('list_community_creation_requests', {
      p_status: status,
      p_limit: limit,
    });

    if (error) {
      console.error('[community-review] list failed', { code: error.code ?? 'UNKNOWN' });
      return json({ error: 'Unable to load community requests' }, 500);
    }

    const requests = Array.isArray(data)
      ? data.slice(0, limit).map(projectReviewQueueRow).filter(Boolean)
      : [];
    return json({ requests });
  } catch {
    return json({ error: 'Unable to load community requests' }, 500);
  }
}

async function review(request: NextRequest) {
  if (!(await isSuperadminAuthenticated())) {
    return json({ error: 'Unauthorized' }, 401);
  }
  if (!isSameOrigin(request)) {
    return json({ error: 'Forbidden' }, 403);
  }

  const reviewerActor = normalizedReviewerActor();
  if (!reviewerActor) {
    return json({ error: 'Review service is not configured' }, 503);
  }

  const rate = consumeReviewRateLimit(rateLimitKey(request, reviewerActor));
  if (!rate.allowed) {
    return json(
      { error: 'Too many review requests' },
      429,
      { 'Retry-After': String(rate.retryAfter) },
    );
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: 'Request body is too large' }, 413);
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'Invalid request' }, 415);
  }

  let rawBody: string | null;
  try {
    rawBody = await readBoundedBody(request);
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  if (rawBody === null) {
    return json({ error: 'Request body is too large' }, 413);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  const body = parseReviewBody(parsedJson);
  const duplicateBody = parseDuplicateResolutionBody(parsedJson);
  if (!body && !duplicateBody) {
    return json({ error: 'Invalid review request' }, 400);
  }

  try {
    const supabase = serviceClient();
    if (duplicateBody) {
      const evidence = duplicateBody.duplicateResolution === 'NOT_DUPLICATE'
        ? { duplicate_override_reference: duplicateBody.evidenceReference }
        : { link_existing_reference: duplicateBody.evidenceReference };
      const { data, error } = await supabase.rpc('resolve_community_address_candidate', {
        p_request_id: duplicateBody.requestId,
        p_candidate_address_id: duplicateBody.candidateAddressId,
        p_resolution: duplicateBody.duplicateResolution,
        p_resolution_reason: duplicateBody.reason,
        p_evidence_refs: evidence,
        p_reviewer_actor: reviewerActor,
        p_idempotency_key: duplicateBody.idempotencyKey,
      });
      if (error) {
        console.error('[community-review] address resolution failed', { code: error.code ?? 'UNKNOWN' });
        return json({ error: 'Unable to resolve address candidate' }, 409);
      }
      return json({ ok: true, resolution: Array.isArray(data) ? data[0] ?? null : data ?? null });
    }

    if (!body) return json({ error: 'Invalid review request' }, 400);
    const { data: target, error: targetError } = await supabase
      .from('community_creation_requests')
      .select('id, governance_mode, legal_form')
      .eq('id', body.requestId)
      .maybeSingle();

    if (targetError || !target) {
      return json({ error: 'Community request not found' }, 404);
    }
    if (!governanceAllowsMethod(target.governance_mode as GovernanceMode, body.verificationMethod)) {
      return json({ error: 'Verification method is not valid for this governance model' }, 400);
    }
    if (
      body.decision === 'APPROVE' &&
      !hasRequiredApprovalEvidence(body.verificationMethod, String(target.legal_form ?? ''), body.evidenceRefs)
    ) {
      return json({ error: 'Approval evidence is incomplete' }, 400);
    }

    const { data, error } = await supabase.rpc('review_community_creation_request', {
      p_request_id: body.requestId,
      p_decision: body.decision,
      p_review_reason: body.reason,
      p_verification_method: body.verificationMethod,
      p_evidence_refs: reviewEvidenceObject(
        body.decision,
        body.verificationMethod,
        String(target.legal_form ?? ''),
        body.evidenceRefs,
      ),
      p_reviewer_actor: reviewerActor,
      p_idempotency_key: body.idempotencyKey,
    });

    if (error) {
      console.error('[community-review] review failed', { code: error.code ?? 'UNKNOWN' });
      return json({ error: 'Unable to review community request' }, 409);
    }

    return json({ ok: true, review: Array.isArray(data) ? data[0] ?? null : data ?? null });
  } catch {
    return json({ error: 'Unable to review community request' }, 500);
  }
}

export async function PATCH(request: NextRequest) {
  return review(request);
}

export async function POST(request: NextRequest) {
  return review(request);
}
