'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, CheckCircle2, Link2, MapPin, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { useI18n } from '@/src/i18n/useI18n';

type RequestStatus = 'PENDING_VERIFICATION' | 'NEEDS_EVIDENCE' | 'APPROVED' | 'REJECTED' | 'ACTIVATED' | 'CANCELLED' | 'EXPIRED';
type GovernanceMode = 'REPRESENTATIVE_MANAGED' | 'BOARD_MANAGED' | 'SELF_MANAGED';
type Decision = 'APPROVE' | 'NEEDS_EVIDENCE' | 'REJECT';
type VerificationMethod = 'OFFICIAL_REGISTER' | 'SIGNED_MANDATE' | 'SELF_MANAGED_RESOLUTION';
type DuplicateResolution = 'NOT_DUPLICATE' | 'LINK_EXISTING';

interface CommunityRequest {
  id: string;
  communityName: string;
  formattedAddress: string;
  legalForm: string;
  governanceMode: GovernanceMode;
  declaredUnitCount: number;
  status: RequestStatus;
  createdAt: string;
  fuzzyCandidateCount: number;
  unresolvedHighSimilarityCount: number;
  highestSimilarityScore: number | null;
}

interface AddressCandidate {
  candidateAddressId: string;
  formattedAddress: string;
  similarityScore: number;
  candidateKind: string;
  candidateWorkspaceId: string | null;
  duplicateResolution: DuplicateResolution | null;
}

interface ReviewDraft {
  decision: Decision;
  verificationMethod: VerificationMethod;
  reason: string;
  evidenceText: string;
}

interface DuplicateDraft {
  resolution: DuplicateResolution;
  reason: string;
  evidenceReference: string;
}

interface CandidateState {
  loading: boolean;
  failed: boolean;
  items: AddressCandidate[];
}

const STATUSES: RequestStatus[] = [
  'PENDING_VERIFICATION',
  'NEEDS_EVIDENCE',
  'APPROVED',
  'REJECTED',
  'ACTIVATED',
  'CANCELLED',
  'EXPIRED',
];
const EVIDENCE_REFERENCE = /^(official-register|signed-mandate|community-resolution|legal-basis|document|attestation|audit):[A-Za-z0-9][A-Za-z0-9._~:/#-]{1,190}$/;
const DUPLICATE_EVIDENCE_REFERENCE = /^(duplicate-override|link-existing):[A-Za-z0-9][A-Za-z0-9._~:/#-]{1,190}$/;

function normalizeRequest(value: unknown): CommunityRequest | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const governanceMode = String(row.governance_mode ?? '') as GovernanceMode;
  const status = String(row.request_status ?? row.status ?? '') as RequestStatus;
  const declaredUnitCount = Number(row.declared_unit_count);
  const requestId = row.request_id ?? row.id;

  if (
    typeof requestId !== 'string' ||
    !['REPRESENTATIVE_MANAGED', 'BOARD_MANAGED', 'SELF_MANAGED'].includes(governanceMode) ||
    !STATUSES.includes(status) ||
    !Number.isSafeInteger(declaredUnitCount) ||
    declaredUnitCount < 1
  ) {
    return null;
  }

  return {
    id: requestId,
    communityName: typeof row.community_name === 'string' ? row.community_name : '—',
    formattedAddress: typeof row.formatted_address === 'string'
      ? row.formatted_address
      : typeof row.address === 'string'
        ? row.address
        : '—',
    legalForm: typeof row.legal_form === 'string' ? row.legal_form : '—',
    governanceMode,
    declaredUnitCount,
    status,
    createdAt: typeof row.created_at === 'string' ? row.created_at : '',
    fuzzyCandidateCount: Math.max(0, Number(row.fuzzy_candidate_count) || 0),
    unresolvedHighSimilarityCount: Math.max(0, Number(row.unresolved_high_similarity_count) || 0),
    highestSimilarityScore: Number.isFinite(Number(row.highest_similarity_score))
      ? Number(row.highest_similarity_score)
      : null,
  };
}

function normalizeAddressCandidate(value: unknown): AddressCandidate | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const candidateAddressId = row.candidate_address_id;
  const similarityScore = Number(row.similarity_score);
  const duplicateResolution = row.duplicate_resolution === 'NOT_DUPLICATE' || row.duplicate_resolution === 'LINK_EXISTING'
    ? row.duplicate_resolution
    : null;
  if (typeof candidateAddressId !== 'string' || !Number.isFinite(similarityScore)) return null;

  return {
    candidateAddressId,
    formattedAddress: typeof row.formatted_address === 'string' ? row.formatted_address : '—',
    similarityScore,
    candidateKind: typeof row.candidate_kind === 'string' ? row.candidate_kind : 'ADDRESS',
    candidateWorkspaceId: typeof row.candidate_workspace_id === 'string' ? row.candidate_workspace_id : null,
    duplicateResolution,
  };
}

function allowedMethods(governanceMode: GovernanceMode): VerificationMethod[] {
  if (governanceMode === 'SELF_MANAGED') return ['SELF_MANAGED_RESOLUTION'];
  return ['OFFICIAL_REGISTER', 'SIGNED_MANDATE'];
}

function initialDraft(request: CommunityRequest): ReviewDraft {
  return {
    decision: 'NEEDS_EVIDENCE',
    verificationMethod: allowedMethods(request.governanceMode)[0],
    reason: '',
    evidenceText: '',
  };
}

function evidenceReferences(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((reference) => reference.trim())
    .filter(Boolean);
}

export default function SuperadminCommunityRequests() {
  const { locale, t: translate } = useI18n();
  const t = useMemo(() => ({
    title: translate('superadmin.communityRequests.title'),
    subtitle: translate('superadmin.communityRequests.subtitle'),
    refresh: translate('superadmin.communityRequests.refresh'),
    loading: translate('superadmin.communityRequests.loading'),
    empty: translate('superadmin.communityRequests.empty'),
    loadError: translate('superadmin.communityRequests.loadError'),
    status: translate('superadmin.communityRequests.status'),
    pending: translate('superadmin.communityRequests.pending'),
    needsEvidence: translate('superadmin.communityRequests.needsEvidence'),
    approved: translate('superadmin.communityRequests.approved'),
    rejected: translate('superadmin.communityRequests.rejected'),
    activated: translate('superadmin.communityRequests.activated'),
    cancelled: translate('superadmin.communityRequests.cancelled'),
    expired: translate('superadmin.communityRequests.expired'),
    address: translate('superadmin.communityRequests.address'),
    governance: translate('superadmin.communityRequests.governance'),
    legalForm: translate('superadmin.communityRequests.legalForm'),
    unitCount: translate('superadmin.communityRequests.unitCount'),
    submittedAt: translate('superadmin.communityRequests.submittedAt'),
    representative: translate('superadmin.communityRequests.representative'),
    board: translate('superadmin.communityRequests.board'),
    selfManaged: translate('superadmin.communityRequests.selfManaged'),
    review: translate('superadmin.communityRequests.review'),
    close: translate('superadmin.communityRequests.close'),
    decision: translate('superadmin.communityRequests.decision'),
    approve: translate('superadmin.communityRequests.approve'),
    requestEvidence: translate('superadmin.communityRequests.requestEvidence'),
    reject: translate('superadmin.communityRequests.reject'),
    verificationMethod: translate('superadmin.communityRequests.verificationMethod'),
    officialRegister: translate('superadmin.communityRequests.officialRegister'),
    signedMandate: translate('superadmin.communityRequests.signedMandate'),
    selfManagedResolution: translate('superadmin.communityRequests.selfManagedResolution'),
    reason: translate('superadmin.communityRequests.reason'),
    reasonHint: translate('superadmin.communityRequests.reasonHint'),
    evidenceRefs: translate('superadmin.communityRequests.evidenceRefs'),
    evidenceHint: translate('superadmin.communityRequests.evidenceHint'),
    submit: translate('superadmin.communityRequests.submit'),
    saving: translate('superadmin.communityRequests.saving'),
    saved: translate('superadmin.communityRequests.saved'),
    invalidForm: translate('superadmin.communityRequests.invalidForm'),
    reviewError: translate('superadmin.communityRequests.reviewError'),
    approvalTitle: translate('superadmin.communityRequests.approvalTitle'),
    approvalWarning: translate('superadmin.communityRequests.approvalWarning'),
    confirmApprove: translate('superadmin.communityRequests.confirmApprove'),
    cancel: translate('superadmin.communityRequests.cancel'),
    countSuffix: translate('superadmin.communityRequests.countSuffix'),
    duplicateTitle: translate('superadmin.communityRequests.duplicateTitle'),
    duplicateWarning: translate('superadmin.communityRequests.duplicateWarning'),
    duplicateCount: translate('superadmin.communityRequests.duplicateCount'),
    duplicateLoading: translate('superadmin.communityRequests.duplicateLoading'),
    duplicateLoadError: translate('superadmin.communityRequests.duplicateLoadError'),
    similarity: translate('superadmin.communityRequests.similarity'),
    candidateKind: translate('superadmin.communityRequests.candidateKind'),
    existingWorkspace: translate('superadmin.communityRequests.existingWorkspace'),
    pendingCandidate: translate('superadmin.communityRequests.pendingCandidate'),
    notDuplicate: translate('superadmin.communityRequests.notDuplicate'),
    linkExisting: translate('superadmin.communityRequests.linkExisting'),
    duplicateReason: translate('superadmin.communityRequests.duplicateReason'),
    duplicateEvidence: translate('superadmin.communityRequests.duplicateEvidence'),
    duplicateEvidenceHint: translate('superadmin.communityRequests.duplicateEvidenceHint'),
    resolveDuplicate: translate('superadmin.communityRequests.resolveDuplicate'),
    resolvingDuplicate: translate('superadmin.communityRequests.resolvingDuplicate'),
    duplicateResolved: translate('superadmin.communityRequests.duplicateResolved'),
    duplicateResolveError: translate('superadmin.communityRequests.duplicateResolveError'),
    duplicateResolvedLabel: translate('superadmin.communityRequests.duplicateResolvedLabel'),
    approvalBlockedByDuplicate: translate('superadmin.communityRequests.approvalBlockedByDuplicate'),
  }), [translate]);
  const [status, setStatus] = useState<RequestStatus>('PENDING_VERIFICATION');
  const [requests, setRequests] = useState<CommunityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [idempotencyKeys, setIdempotencyKeys] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [approvalTarget, setApprovalTarget] = useState<CommunityRequest | null>(null);
  const [candidateStates, setCandidateStates] = useState<Record<string, CandidateState>>({});
  const [duplicateDrafts, setDuplicateDrafts] = useState<Record<string, DuplicateDraft>>({});
  const [savingCandidateKey, setSavingCandidateKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const response = await fetch(
        `/api/superadmin/community-requests?status=${encodeURIComponent(status)}&limit=100`,
        { cache: 'no-store' },
      );
      const body = await response.json() as { requests?: unknown[] };
      if (!response.ok) throw new Error('request failed');
      setRequests((body.requests ?? []).map(normalizeRequest).filter((item): item is CommunityRequest => Boolean(item)));
    } catch {
      setRequests([]);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadCandidates = useCallback(async (requestId: string) => {
    setCandidateStates((current) => ({
      ...current,
      [requestId]: { loading: true, failed: false, items: current[requestId]?.items ?? [] },
    }));
    try {
      const response = await fetch(
        `/api/superadmin/community-requests?candidate_for=${encodeURIComponent(requestId)}&limit=100`,
        { cache: 'no-store' },
      );
      const body = await response.json() as { candidates?: unknown[] };
      if (!response.ok) throw new Error('candidate request failed');
      const items = (body.candidates ?? [])
        .map(normalizeAddressCandidate)
        .filter((item): item is AddressCandidate => Boolean(item));
      setCandidateStates((current) => ({ ...current, [requestId]: { loading: false, failed: false, items } }));
    } catch {
      setCandidateStates((current) => ({
        ...current,
        [requestId]: { loading: false, failed: true, items: current[requestId]?.items ?? [] },
      }));
    }
  }, []);

  const statusLabels = useMemo<Record<RequestStatus, string>>(() => ({
    PENDING_VERIFICATION: t.pending,
    NEEDS_EVIDENCE: t.needsEvidence,
    APPROVED: t.approved,
    REJECTED: t.rejected,
    ACTIVATED: t.activated,
    CANCELLED: t.cancelled,
    EXPIRED: t.expired,
  }), [t]);

  const governanceLabels = useMemo<Record<GovernanceMode, string>>(() => ({
    REPRESENTATIVE_MANAGED: t.representative,
    BOARD_MANAGED: t.board,
    SELF_MANAGED: t.selfManaged,
  }), [t]);

  const methodLabels = useMemo<Record<VerificationMethod, string>>(() => ({
    OFFICIAL_REGISTER: t.officialRegister,
    SIGNED_MANDATE: t.signedMandate,
    SELF_MANAGED_RESOLUTION: t.selfManagedResolution,
  }), [t]);

  function openReview(request: CommunityRequest) {
    setExpandedId(request.id);
    setDrafts((current) => current[request.id]
      ? current
      : { ...current, [request.id]: initialDraft(request) });
    setFeedback(null);
    if (request.fuzzyCandidateCount > 0) void loadCandidates(request.id);
  }

  function updateDraft(request: CommunityRequest, patch: Partial<ReviewDraft>) {
    setDrafts((current) => ({
      ...current,
      [request.id]: { ...(current[request.id] ?? initialDraft(request)), ...patch },
    }));
  }

  function isDraftValid(draft: ReviewDraft): boolean {
    const refs = evidenceReferences(draft.evidenceText);
    return (
      draft.reason.trim().length >= 10 &&
      draft.reason.trim().length <= 1000 &&
      (draft.decision !== 'APPROVE' || refs.length >= 1) &&
      refs.length <= 20 &&
      refs.every((reference) => EVIDENCE_REFERENCE.test(reference) && !/^(?:https?|data|file|blob):/i.test(reference)) &&
      new Set(refs).size === refs.length
    );
  }

  function hasRequiredApprovalEvidence(request: CommunityRequest, draft: ReviewDraft): boolean {
    if (draft.decision !== 'APPROVE') return true;
    const refs = evidenceReferences(draft.evidenceText);
    const requiredPrefix = draft.verificationMethod === 'OFFICIAL_REGISTER'
      ? 'official-register:'
      : draft.verificationMethod === 'SIGNED_MANDATE'
        ? 'signed-mandate:'
        : 'community-resolution:';
    return Boolean(refs[0]?.startsWith(requiredPrefix)) && (
      request.legalForm !== 'UNDIVIDED_COMMON_OWNERSHIP'
      || (draft.verificationMethod === 'SELF_MANAGED_RESOLUTION' && Boolean(refs[1]?.startsWith('legal-basis:')))
    );
  }

  async function submitReview(request: CommunityRequest, approvalConfirmed = false) {
    const draft = drafts[request.id] ?? initialDraft(request);
    if (!isDraftValid(draft) || !hasRequiredApprovalEvidence(request, draft)) {
      setFeedback({ kind: 'error', text: t.invalidForm });
      return;
    }
    if (draft.decision === 'APPROVE' && request.unresolvedHighSimilarityCount > 0) {
      setFeedback({ kind: 'error', text: t.approvalBlockedByDuplicate });
      return;
    }
    if (draft.decision === 'APPROVE' && !approvalConfirmed) {
      setApprovalTarget(request);
      return;
    }

    let idempotencyKey = idempotencyKeys[request.id];
    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();
      setIdempotencyKeys((current) => ({ ...current, [request.id]: idempotencyKey }));
    }

    setSavingId(request.id);
    setFeedback(null);
    try {
      const response = await fetch('/api/superadmin/community-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          decision: draft.decision,
          reason: draft.reason.trim(),
          verificationMethod: draft.verificationMethod,
          evidenceRefs: evidenceReferences(draft.evidenceText),
          idempotencyKey,
        }),
      });

      if (!response.ok) throw new Error('review failed');
      setFeedback({ kind: 'success', text: t.saved });
      setExpandedId(null);
      setApprovalTarget(null);
      setIdempotencyKeys((current) => {
        const next = { ...current };
        delete next[request.id];
        return next;
      });
      await load();
    } catch {
      setFeedback({ kind: 'error', text: t.reviewError });
    } finally {
      setSavingId(null);
    }
  }

  function duplicateDraftKey(requestId: string, candidateAddressId: string): string {
    return `${requestId}:${candidateAddressId}`;
  }

  function getDuplicateDraft(requestId: string, candidate: AddressCandidate): DuplicateDraft {
    const key = duplicateDraftKey(requestId, candidate.candidateAddressId);
    return duplicateDrafts[key] ?? {
      resolution: candidate.candidateWorkspaceId ? 'LINK_EXISTING' : 'NOT_DUPLICATE',
      reason: '',
      evidenceReference: candidate.candidateWorkspaceId ? 'link-existing:' : 'duplicate-override:',
    };
  }

  function updateDuplicateDraft(requestId: string, candidate: AddressCandidate, patch: Partial<DuplicateDraft>) {
    const key = duplicateDraftKey(requestId, candidate.candidateAddressId);
    const current = getDuplicateDraft(requestId, candidate);
    const resolution = patch.resolution ?? current.resolution;
    const expectedPrefix = resolution === 'LINK_EXISTING' ? 'link-existing:' : 'duplicate-override:';
    const nextEvidence = patch.resolution && !current.evidenceReference.startsWith(expectedPrefix)
      ? expectedPrefix
      : current.evidenceReference;
    setDuplicateDrafts((drafts) => ({
      ...drafts,
      [key]: { ...current, ...patch, evidenceReference: patch.evidenceReference ?? nextEvidence },
    }));
  }

  async function resolveCandidate(request: CommunityRequest, candidate: AddressCandidate) {
    const key = duplicateDraftKey(request.id, candidate.candidateAddressId);
    const draft = getDuplicateDraft(request.id, candidate);
    const expectedPrefix = draft.resolution === 'LINK_EXISTING' ? 'link-existing:' : 'duplicate-override:';
    if (
      draft.reason.trim().length < 10 ||
      draft.reason.trim().length > 1000 ||
      !DUPLICATE_EVIDENCE_REFERENCE.test(draft.evidenceReference.trim()) ||
      !draft.evidenceReference.trim().startsWith(expectedPrefix) ||
      (draft.resolution === 'LINK_EXISTING' && !candidate.candidateWorkspaceId)
    ) {
      setFeedback({ kind: 'error', text: t.invalidForm });
      return;
    }

    let idempotencyKey = idempotencyKeys[key];
    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();
      setIdempotencyKeys((current) => ({ ...current, [key]: idempotencyKey }));
    }
    setSavingCandidateKey(key);
    setFeedback(null);
    try {
      const response = await fetch('/api/superadmin/community-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESOLVE_ADDRESS_CANDIDATE',
          requestId: request.id,
          candidateAddressId: candidate.candidateAddressId,
          duplicateResolution: draft.resolution,
          reason: draft.reason.trim(),
          evidenceRefs: [draft.evidenceReference.trim()],
          idempotencyKey,
        }),
      });
      if (!response.ok) throw new Error('candidate resolution failed');
      setFeedback({ kind: 'success', text: t.duplicateResolved });
      setIdempotencyKeys((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      await Promise.all([loadCandidates(request.id), load()]);
    } catch {
      setFeedback({ kind: 'error', text: t.duplicateResolveError });
    } finally {
      setSavingCandidateKey(null);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <ShieldCheck aria-hidden="true" size={18} />
            </span>
            <h2 className="text-xl font-semibold text-slate-950">{t.title}</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:opacity-50"
        >
          <RefreshCw aria-hidden="true" size={16} className={loading ? 'animate-spin' : ''} />
          {t.refresh}
        </button>
      </header>

      <div role="tablist" aria-label={t.status} className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1">
        {STATUSES.map((item) => (
          <button
            key={item}
            role="tab"
            type="button"
            aria-selected={status === item}
            onClick={() => {
              setStatus(item);
              setExpandedId(null);
              setFeedback(null);
            }}
            className={`min-h-11 min-w-fit flex-1 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
              status === item
                ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-600 hover:bg-white/70 hover:text-slate-950'
            }`}
          >
            {statusLabels[item]}
          </button>
        ))}
      </div>

      <div aria-live="polite" aria-atomic="true">
        {feedback && (
          <p
            role={feedback.kind === 'error' ? 'alert' : 'status'}
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              feedback.kind === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}
          >
            {feedback.text}
          </p>
        )}
      </div>

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-700">{t.loading}</p>
      ) : loadFailed ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-medium text-rose-900">{t.loadError}</p>
      ) : requests.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-700">{t.empty}</p>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const draft = drafts[request.id] ?? initialDraft(request);
            const isOpen = expandedId === request.id;
            const reviewable = request.status === 'PENDING_VERIFICATION' || request.status === 'NEEDS_EVIDENCE';
            return (
              <article key={request.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-950">{request.communityName}</h3>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          {statusLabels[request.status]}
                        </span>
                      </div>
                      <p className="mt-2 flex items-start gap-2 text-sm font-medium text-slate-800">
                        <MapPin aria-hidden="true" size={17} className="mt-0.5 shrink-0 text-emerald-700" />
                        <span>{request.formattedAddress}</span>
                      </p>
                      {request.unresolvedHighSimilarityCount > 0 && (
                        <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">
                          <AlertTriangle aria-hidden="true" size={17} />
                          {t.duplicateCount}: {request.unresolvedHighSimilarityCount}
                          {request.highestSimilarityScore !== null
                            ? ` · ${Math.round(request.highestSimilarityScore * 100)}%`
                            : ''}
                        </p>
                      )}
                    </div>
                    {reviewable && (
                      <button
                        type="button"
                        onClick={() => isOpen ? setExpandedId(null) : openReview(request)}
                        aria-expanded={isOpen}
                        aria-controls={`community-review-${request.id}`}
                        className="min-h-11 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
                      >
                        {isOpen ? t.close : t.review}
                      </button>
                    )}
                  </div>

                  <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">{t.governance}</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-950">{governanceLabels[request.governanceMode]}</dd>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">{t.legalForm}</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-950">{request.legalForm}</dd>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">{t.unitCount}</dt>
                      <dd className="mt-1 text-sm font-semibold tabular-nums text-slate-950">{request.declaredUnitCount}</dd>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">{t.submittedAt}</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-950">
                        {request.createdAt ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(request.createdAt)) : '—'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {isOpen && (
                  <form
                    id={`community-review-${request.id}`}
                    className="border-t border-slate-200 bg-slate-50 p-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitReview(request);
                    }}
                  >
                    {request.fuzzyCandidateCount > 0 && (() => {
                      const candidateState = candidateStates[request.id];
                      return (
                        <section className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4" aria-labelledby={`duplicate-title-${request.id}`}>
                          <div className="flex items-start gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800 ring-1 ring-amber-300">
                              <AlertTriangle aria-hidden="true" size={18} />
                            </span>
                            <div>
                              <h4 id={`duplicate-title-${request.id}`} className="font-semibold text-amber-950">{t.duplicateTitle}</h4>
                              <p className="mt-1 text-sm leading-6 text-amber-900">{t.duplicateWarning}</p>
                            </div>
                          </div>

                          {candidateState?.loading ? (
                            <p className="mt-4 text-sm font-medium text-amber-950">{t.duplicateLoading}</p>
                          ) : candidateState?.failed ? (
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              <p role="alert" className="text-sm font-semibold text-rose-900">{t.duplicateLoadError}</p>
                              <button
                                type="button"
                                onClick={() => void loadCandidates(request.id)}
                                className="min-h-11 rounded-xl border border-amber-400 bg-white px-4 py-2 text-sm font-semibold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-700"
                              >
                                {t.refresh}
                              </button>
                            </div>
                          ) : (
                            <div className="mt-4 space-y-3">
                              {(candidateState?.items ?? []).map((candidate) => {
                                const key = duplicateDraftKey(request.id, candidate.candidateAddressId);
                                const duplicateDraft = getDuplicateDraft(request.id, candidate);
                                const isResolved = Boolean(candidate.duplicateResolution);
                                return (
                                  <article key={candidate.candidateAddressId} className="rounded-xl border border-amber-300 bg-white p-4 shadow-sm">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                      <div className="min-w-0">
                                        <p className="flex items-start gap-2 font-semibold text-slate-950">
                                          <Link2 aria-hidden="true" size={17} className="mt-1 shrink-0 text-amber-800" />
                                          <span>{candidate.formattedAddress}</span>
                                        </p>
                                        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                                          {t.similarity}: {Math.round(candidate.similarityScore * 100)}% · {t.candidateKind}: {candidate.candidateKind}
                                        </p>
                                      </div>
                                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${isResolved ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-amber-100 text-amber-950 ring-amber-300'}`}>
                                        {isResolved ? `${t.duplicateResolvedLabel}: ${candidate.duplicateResolution}` : t.pendingCandidate}
                                      </span>
                                    </div>

                                    {!isResolved && (
                                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                                        <label htmlFor={`duplicate-resolution-${key}`} className="space-y-1.5 text-sm font-semibold text-slate-800">
                                          <span>{t.decision}</span>
                                          <select
                                            id={`duplicate-resolution-${key}`}
                                            value={duplicateDraft.resolution}
                                            onChange={(event) => updateDuplicateDraft(request.id, candidate, { resolution: event.target.value as DuplicateResolution })}
                                            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200"
                                          >
                                            <option value="NOT_DUPLICATE">{t.notDuplicate}</option>
                                            {candidate.candidateWorkspaceId && <option value="LINK_EXISTING">{t.linkExisting}</option>}
                                          </select>
                                        </label>
                                        <label htmlFor={`duplicate-reason-${key}`} className="space-y-1.5 text-sm font-semibold text-slate-800">
                                          <span>{t.duplicateReason}</span>
                                          <input
                                            id={`duplicate-reason-${key}`}
                                            value={duplicateDraft.reason}
                                            minLength={10}
                                            maxLength={1000}
                                            onChange={(event) => updateDuplicateDraft(request.id, candidate, { reason: event.target.value })}
                                            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200"
                                          />
                                        </label>
                                        <div className="space-y-1.5 text-sm font-semibold text-slate-800 md:col-span-2">
                                          <label htmlFor={`duplicate-evidence-${key}`} className="block">{t.duplicateEvidence}</label>
                                          <input
                                            id={`duplicate-evidence-${key}`}
                                            value={duplicateDraft.evidenceReference}
                                            onChange={(event) => updateDuplicateDraft(request.id, candidate, { evidenceReference: event.target.value })}
                                            aria-describedby={`duplicate-evidence-hint-${key}`}
                                            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-950 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200"
                                          />
                                          <span id={`duplicate-evidence-hint-${key}`} className="block text-xs font-normal leading-5 text-slate-700">{t.duplicateEvidenceHint}</span>
                                        </div>
                                        <div className="md:col-span-2 md:flex md:justify-end">
                                          <button
                                            type="button"
                                            disabled={savingCandidateKey === key}
                                            onClick={() => void resolveCandidate(request, candidate)}
                                            className="min-h-11 w-full rounded-xl bg-amber-800 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-800 focus:ring-offset-2 disabled:opacity-50 md:w-auto"
                                          >
                                            {savingCandidateKey === key ? t.resolvingDuplicate : t.resolveDuplicate}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </article>
                                );
                              })}
                            </div>
                          )}
                        </section>
                      );
                    })()}

                    <div className="grid gap-4 md:grid-cols-2">
                      <label htmlFor={`review-decision-${request.id}`} className="space-y-1.5 text-sm font-semibold text-slate-800">
                        <span>{t.decision}</span>
                        <select
                          id={`review-decision-${request.id}`}
                          value={draft.decision}
                          onChange={(event) => updateDraft(request, { decision: event.target.value as Decision })}
                          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        >
                          <option value="APPROVE">{t.approve}</option>
                          <option value="NEEDS_EVIDENCE">{t.requestEvidence}</option>
                          <option value="REJECT">{t.reject}</option>
                        </select>
                      </label>

                      <label htmlFor={`review-method-${request.id}`} className="space-y-1.5 text-sm font-semibold text-slate-800">
                        <span>{t.verificationMethod}</span>
                        <select
                          id={`review-method-${request.id}`}
                          value={draft.verificationMethod}
                          onChange={(event) => updateDraft(request, { verificationMethod: event.target.value as VerificationMethod })}
                          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        >
                          {allowedMethods(request.governanceMode).map((method) => (
                            <option key={method} value={method}>{methodLabels[method]}</option>
                          ))}
                        </select>
                      </label>

                      <div className="space-y-1.5 text-sm font-semibold text-slate-800 md:col-span-2">
                        <label htmlFor={`review-reason-${request.id}`} className="block">{t.reason}</label>
                        <textarea
                          id={`review-reason-${request.id}`}
                          value={draft.reason}
                          minLength={10}
                          maxLength={1000}
                          required
                          rows={4}
                          onChange={(event) => updateDraft(request, { reason: event.target.value })}
                          aria-describedby={`review-reason-hint-${request.id}`}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        />
                        <span id={`review-reason-hint-${request.id}`} className="block text-xs font-normal leading-5 text-slate-600">{t.reasonHint}</span>
                      </div>

                      <div className="space-y-1.5 text-sm font-semibold text-slate-800 md:col-span-2">
                        <label htmlFor={`review-evidence-${request.id}`} className="block">{t.evidenceRefs}</label>
                        <textarea
                          id={`review-evidence-${request.id}`}
                          value={draft.evidenceText}
                          required={draft.decision === 'APPROVE'}
                          rows={3}
                          onChange={(event) => updateDraft(request, { evidenceText: event.target.value })}
                          aria-describedby={`review-evidence-hint-${request.id}`}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        />
                        <span id={`review-evidence-hint-${request.id}`} className="block text-xs font-normal leading-5 text-slate-600">{t.evidenceHint}</span>
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end">
                      <button
                        type="submit"
                        disabled={savingId === request.id}
                        className="min-h-11 rounded-xl bg-emerald-700 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 disabled:opacity-50"
                      >
                        {savingId === request.id ? t.saving : t.submit}
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}

      {approvalTarget && (() => {
        const draft = drafts[approvalTarget.id] ?? initialDraft(approvalTarget);
        return (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" role="presentation">
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="community-approval-title"
              aria-describedby="community-approval-warning"
              className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                    <CheckCircle2 aria-hidden="true" size={20} />
                  </span>
                  <h3 id="community-approval-title" className="text-xl font-semibold text-slate-950">{t.approvalTitle}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setApprovalTarget(null)}
                  aria-label={t.cancel}
                  className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <X aria-hidden="true" size={20} />
                </button>
              </div>

              <dl className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">{t.address}</dt>
                  <dd className="mt-1 flex items-start gap-2 text-sm font-semibold text-slate-950">
                    <MapPin aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-emerald-700" />
                    {approvalTarget.formattedAddress}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">{t.governance}</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">{governanceLabels[approvalTarget.governanceMode]}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">{t.unitCount}</dt>
                  <dd className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <Building2 aria-hidden="true" size={16} className="text-emerald-700" />
                    {approvalTarget.declaredUnitCount} {t.countSuffix}
                  </dd>
                </div>
              </dl>

              <p id="community-approval-warning" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-950">
                {t.approvalWarning}
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setApprovalTarget(null)}
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  disabled={savingId === approvalTarget.id || draft.decision !== 'APPROVE'}
                  onClick={() => void submitReview(approvalTarget, true)}
                  className="min-h-11 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 disabled:opacity-50"
                >
                  {savingId === approvalTarget.id ? t.saving : t.confirmApprove}
                </button>
              </div>
            </section>
          </div>
        );
      })()}
    </div>
  );
}
