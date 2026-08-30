'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Home,
  MapPin,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  acceptJoinRequestCounterOffer,
  cancelMyJoinRequest,
  resubmitMyJoinRequestEvidence,
} from '@/app/actions/workspace-admin';
import { useI18n } from '@/src/i18n/useI18n';
import { createClient, hasSupabaseConfig } from '@/lib/supabase/browser';

type Branch = 'join' | 'create';
type RelationshipType = 'TENANT' | 'OWNER';
type GovernanceMode = 'REPRESENTATIVE_MANAGED' | 'SELF_MANAGED';
type LegalForm = 'CONDOMINIUM' | 'UNDIVIDED_COMMON_OWNERSHIP';
type Notice = { tone: 'error' | 'success' | 'info'; message: string };
type UnknownRecord = Record<string, unknown>;
type Attempt = { fingerprint: string; key: string };

interface RpcErrorLike {
  code?: string;
  message?: string;
  details?: string;
}

interface CommunityOption {
  id: string;
  name: string;
  address: string;
}

interface UnitOption {
  id: string;
  label: string;
  type: string;
}

interface JoinRequestSummary {
  requestId: string;
  workspaceId: string;
  workspaceName: string;
  status: string;
  requestedRelationshipType: string;
  requestedShareNumerator: number;
  requestedShareDenominator: number;
  requestedUnitDesignation: string;
  reviewReason: string;
  submittedAt: string;
  counterOfferId: string;
  counterOfferRelationshipType: string;
  counterOfferShareNumerator: number;
  counterOfferShareDenominator: number;
  counterOfferUnitDesignation: string;
  counterOfferReason: string;
  counterOfferAccepted: boolean;
  version: number;
}

interface CommunityCreationRequestSummary {
  requestId: string;
  reservedWorkspaceId: string;
  activatedWorkspaceId: string;
  communityName: string;
  formattedAddress: string;
  legalForm: string;
  governanceMode: string;
  declaredUnitCount: number;
  status: string;
  reviewReason: string;
  verificationMethod: string;
  addressLeaseExpiresAt: string;
  activationPending: boolean;
}

const SYSTEM_UPDATE_MESSAGE = 'Rendszerfrissítés szükséges: ez a művelet még nem érhető el ezen a telepítésen.';

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function unwrapRows(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) {
    return value.map(asRecord).filter((row): row is UnknownRecord => row !== null);
  }

  const record = asRecord(value);
  if (!record) return [];

  for (const key of ['items', 'results', 'communities', 'units', 'data']) {
    if (Array.isArray(record[key])) {
      return (record[key] as unknown[])
        .map(asRecord)
        .filter((row): row is UnknownRecord => row !== null);
    }
  }

  return [record];
}

function readString(record: UnknownRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function readBoolean(record: UnknownRecord, keys: string[]): boolean {
  for (const key of keys) {
    if (typeof record[key] === 'boolean') return record[key] as boolean;
  }
  return false;
}

function readNumber(record: UnknownRecord, keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return 0;
}

function normalizeCommunities(value: unknown): CommunityOption[] {
  const seen = new Set<string>();
  return unwrapRows(value).flatMap((row) => {
    const id = readString(row, ['workspace_id', 'community_id', 'id']);
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [{
      id,
      name: readString(row, ['community_name', 'workspace_name', 'building_name', 'name']) || 'Lakóközösség',
      address: readString(row, ['formatted_address', 'canonical_address', 'address']),
    }];
  });
}

function normalizeUnits(value: unknown): UnitOption[] {
  const seen = new Set<string>();
  return unwrapRows(value).flatMap((row) => {
    const id = readString(row, ['unit_id', 'id']);
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [{
      id,
      label: readString(row, ['unit_designation', 'unit_label', 'designation', 'label']) || 'Albetét',
      type: readString(row, ['unit_type', 'type']),
    }];
  });
}

function normalizeJoinRequests(value: unknown): JoinRequestSummary[] {
  return unwrapRows(value).flatMap((row) => {
    const requestId = readString(row, ['request_id', 'id']);
    if (!requestId) return [];
    return [{
      requestId,
      workspaceId: readString(row, ['workspace_id']),
      workspaceName: readString(row, ['workspace_name', 'community_name']) || 'Lakóközösség',
      status: readString(row, ['request_status', 'status']) || 'PENDING',
      requestedRelationshipType: readString(row, ['requested_relationship_type']),
      requestedShareNumerator: readNumber(row, ['requested_share_numerator']),
      requestedShareDenominator: readNumber(row, ['requested_share_denominator']),
      requestedUnitDesignation: readString(row, ['requested_unit_designation', 'unit_designation']),
      reviewReason: readString(row, ['review_reason']),
      submittedAt: readString(row, ['submitted_at', 'created_at']),
      counterOfferId: readString(row, ['latest_counter_offer_id', 'latest_offer_id']),
      counterOfferRelationshipType: readString(row, ['latest_counter_offer_relationship_type', 'latest_offer_relationship_type']),
      counterOfferShareNumerator: readNumber(row, ['latest_counter_offer_share_numerator', 'latest_offer_share_numerator']),
      counterOfferShareDenominator: readNumber(row, ['latest_counter_offer_share_denominator', 'latest_offer_share_denominator']),
      counterOfferUnitDesignation: readString(row, ['latest_counter_offer_unit_designation', 'latest_offer_unit_designation']),
      counterOfferReason: readString(row, ['latest_counter_offer_reason', 'latest_offer_reason']),
      counterOfferAccepted: readBoolean(row, ['latest_counter_offer_accepted', 'latest_offer_accepted']),
      version: readNumber(row, ['request_version', 'version']) || 1,
    }];
  });
}

function normalizeCreationRequests(value: unknown): CommunityCreationRequestSummary[] {
  return unwrapRows(value).flatMap((row) => {
    const requestId = readString(row, ['request_id', 'id']);
    if (!requestId) return [];
    return [{
      requestId,
      reservedWorkspaceId: readString(row, ['reserved_workspace_id']),
      activatedWorkspaceId: readString(row, ['activated_workspace_id', 'workspace_id']),
      communityName: readString(row, ['community_name', 'workspace_name']) || 'Lakóközösség',
      formattedAddress: readString(row, ['formatted_address', 'address']),
      legalForm: readString(row, ['legal_form']),
      governanceMode: readString(row, ['governance_mode']),
      declaredUnitCount: readNumber(row, ['declared_unit_count', 'unit_count']),
      status: readString(row, ['request_status', 'status']) || 'PENDING_VERIFICATION',
      reviewReason: readString(row, ['review_reason']),
      verificationMethod: readString(row, ['verification_method']),
      addressLeaseExpiresAt: readString(row, ['address_lease_expires_at']),
      activationPending: readBoolean(row, ['activation_pending']),
    }];
  });
}

function relationshipLabel(value: string): string {
  return ({
    OWNER: 'Tulajdonos',
    OWNER_OCCUPANT: 'Bent lakó tulajdonos',
    TENANT: 'Lakó / bérlő',
    HOUSEHOLD_MEMBER: 'Háztartási tag',
    AUTHORIZED_OCCUPANT: 'Meghatalmazott bentlakó',
  } as Record<string, string>)[value] ?? value;
}

function requestStatusLabel(value: string): string {
  return ({
    PENDING: 'Ellenőrzésre vár',
    PENDING_VERIFICATION: 'Ellenőrzésre vár',
    NEEDS_EVIDENCE: 'Egyeztetés szükséges',
    APPROVED: 'Jóváhagyva',
    REJECTED: 'Elutasítva',
    CANCELLED: 'Visszavonva',
    EXPIRED: 'Lejárt',
  } as Record<string, string>)[value] ?? value;
}

function extractRpcErrorCode(error: RpcErrorLike | null): string | null {
  if (!error) return null;
  for (const candidate of [error.details, error.message]) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as { error_code?: unknown };
      if (typeof parsed.error_code === 'string') return parsed.error_code;
    } catch {
      const match = candidate.match(/"error_code"\s*:\s*"([A-Z0-9_]+)"/);
      if (match?.[1]) return match[1];
    }
  }
  return error.code ?? null;
}

function isMissingRpc(error: RpcErrorLike | null): boolean {
  if (!error) return false;
  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return error.code === 'PGRST202'
    || error.code === '42883'
    || message.includes('could not find the function')
    || message.includes('does not exist')
    || message.includes('schema cache');
}

function rpcErrorMessage(error: RpcErrorLike | null, fallback: string): string {
  if (isMissingRpc(error)) return SYSTEM_UPDATE_MESSAGE;
  if (error?.code === '42501') return 'Ehhez a művelethez nincs jogosultságod. Jelentkezz be újra, vagy kérj segítséget.';
  return fallback;
}

function keyForAttempt(ref: { current: Attempt | null }, fingerprint: string): string {
  if (ref.current?.fingerprint !== fingerprint) {
    ref.current = { fingerprint, key: window.crypto.randomUUID() };
  }
  return ref.current.key;
}

function NoticeBox({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  const style = notice.tone === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : notice.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-sky-200 bg-sky-50 text-sky-900';

  return (
    <p
      role={notice.tone === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${style}`}
    >
      {notice.message}
    </p>
  );
}

function JoinRequestLifecycleControls({
  request,
  onChanged,
}: {
  request: JoinRequestSummary;
  onChanged: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [cancelReason, setCancelReason] = useState('');
  const [evidenceReason, setEvidenceReason] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [pendingAction, setPendingAction] = useState<'cancel' | 'evidence' | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const cancelAttempt = useRef<Attempt | null>(null);
  const evidenceAttempt = useRef<Attempt | null>(null);
  const cancellable = ['DRAFT', 'PENDING', 'NEEDS_EVIDENCE'].includes(request.status);
  const hasUnresolvedCounterOffer = Boolean(request.counterOfferId && !request.counterOfferAccepted);

  async function cancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const payload = {
      requestId: request.requestId,
      expectedVersion: request.version,
      reason: cancelReason.trim(),
    };
    const idempotencyKey = keyForAttempt(cancelAttempt, JSON.stringify(payload));
    setPendingAction('cancel');
    const result = await cancelMyJoinRequest({ ...payload, idempotencyKey });
    setPendingAction(null);
    if (!result.success) {
      setNotice({ tone: 'error', message: result.error ?? t('onboarding.joinLifecycle.cancelFailed') });
      return;
    }
    cancelAttempt.current = null;
    setCancelReason('');
    setNotice({ tone: 'success', message: t('onboarding.joinLifecycle.cancelSuccess') });
    await onChanged();
  }

  async function resubmitEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const evidenceReferences = evidenceText
      .split(/\r?\n/)
      .map((reference) => reference.trim())
      .filter(Boolean);
    const payload = {
      requestId: request.requestId,
      expectedVersion: request.version,
      evidenceReferences,
      reason: evidenceReason.trim(),
    };
    const idempotencyKey = keyForAttempt(evidenceAttempt, JSON.stringify(payload));
    setPendingAction('evidence');
    const result = await resubmitMyJoinRequestEvidence({ ...payload, idempotencyKey });
    setPendingAction(null);
    if (!result.success) {
      setNotice({ tone: 'error', message: result.error ?? t('onboarding.joinLifecycle.evidenceFailed') });
      return;
    }
    evidenceAttempt.current = null;
    setEvidenceReason('');
    setEvidenceText('');
    setNotice({ tone: 'success', message: t('onboarding.joinLifecycle.evidenceSuccess') });
    await onChanged();
  }

  if (!cancellable) return null;

  return (
    <div className="mt-3 border-t border-canvas-line pt-3">
      <NoticeBox notice={notice} />
      {request.status === 'NEEDS_EVIDENCE' ? (
        hasUnresolvedCounterOffer ? (
          <p className="mt-2 text-xs leading-relaxed text-canvas-muted">
            {t('onboarding.joinLifecycle.counterOfferFirst')}
          </p>
        ) : (
          <form onSubmit={resubmitEvidence} className="mt-2 space-y-2 rounded-xl border border-brand-100 bg-white p-3">
            <p className="text-xs font-semibold text-canvas-ink">{t('onboarding.joinLifecycle.evidenceTitle')}</p>
            <label className="block text-xs font-medium text-canvas-muted">
              {t('onboarding.joinLifecycle.evidenceReferences')}
              <textarea
                className="input-base mt-1 min-h-24 resize-y font-mono text-xs"
                value={evidenceText}
                onChange={(event) => setEvidenceText(event.target.value)}
                required
                placeholder={'document:internal-reference\nattestation:internal-reference'}
              />
            </label>
            <label className="block text-xs font-medium text-canvas-muted">
              {t('onboarding.joinLifecycle.evidenceReason')}
              <input
                className="input-base mt-1 min-h-10"
                value={evidenceReason}
                onChange={(event) => setEvidenceReason(event.target.value)}
                minLength={3}
                maxLength={500}
                required
              />
            </label>
            <p className="text-[11px] leading-relaxed text-canvas-subtle">
              {t('onboarding.joinLifecycle.evidenceHelp')}
            </p>
            <button type="submit" disabled={pendingAction !== null} className="btn-primary min-h-10 px-3 text-sm">
              {pendingAction === 'evidence'
                ? t('onboarding.joinLifecycle.evidenceSaving')
                : t('onboarding.joinLifecycle.evidenceSubmit')}
            </button>
          </form>
        )
      ) : null}

      <form onSubmit={cancel} className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="sr-only" htmlFor={`cancel-join-${request.requestId}`}>
          {t('onboarding.joinLifecycle.cancelReason')}
        </label>
        <input
          id={`cancel-join-${request.requestId}`}
          className="input-base min-h-10"
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          minLength={3}
          maxLength={500}
          required
          placeholder={t('onboarding.joinLifecycle.cancelReason')}
        />
        <button type="submit" disabled={pendingAction !== null} className="btn-secondary min-h-10 px-3 text-sm">
          {pendingAction === 'cancel'
            ? t('onboarding.joinLifecycle.cancelling')
            : t('onboarding.joinLifecycle.cancel')}
        </button>
      </form>
    </div>
  );
}

export default function OnboardingClient() {
  const { t } = useI18n();
  const [branch, setBranch] = useState<Branch>('join');

  const [query, setQuery] = useState('');
  const [communities, setCommunities] = useState<CommunityOption[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityOption | null>(null);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('TENANT');
  const [ownershipShareNumerator, setOwnershipShareNumerator] = useState('');
  const [ownershipShareDenominator, setOwnershipShareDenominator] = useState('');
  const [joinMessage, setJoinMessage] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [searchNotice, setSearchNotice] = useState<Notice | null>(null);
  const [joinNotice, setJoinNotice] = useState<Notice | null>(null);
  const joinAttempt = useRef<Attempt | null>(null);
  const [myJoinRequests, setMyJoinRequests] = useState<JoinRequestSummary[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsNotice, setRequestsNotice] = useState<Notice | null>(null);
  const [acceptingRequestId, setAcceptingRequestId] = useState('');

  const [communityName, setCommunityName] = useState('');
  const [formattedAddress, setFormattedAddress] = useState('');
  const [legalForm, setLegalForm] = useState<LegalForm>('CONDOMINIUM');
  const [unitCount, setUnitCount] = useState('');
  const [governanceMode, setGovernanceMode] = useState<GovernanceMode>('REPRESENTATIVE_MANAGED');
  const [creationLoading, setCreationLoading] = useState(false);
  const [creationNotice, setCreationNotice] = useState<Notice | null>(null);
  const creationAttempt = useRef<Attempt | null>(null);
  const [myCreationRequests, setMyCreationRequests] = useState<CommunityCreationRequestSummary[]>([]);
  const [creationRequestsLoading, setCreationRequestsLoading] = useState(true);
  const [activatingCreationRequestId, setActivatingCreationRequestId] = useState('');
  const activationAttempts = useRef(new Map<string, string>());

  const loadMyJoinRequests = useCallback(async () => {
    if (!hasSupabaseConfig) {
      setRequestsLoading(false);
      return;
    }

    setRequestsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('list_my_join_requests');
      if (error) {
        setMyJoinRequests([]);
        if (!isMissingRpc(error)) {
          setRequestsNotice({ tone: 'error', message: 'A korábbi kérelmeket most nem sikerült betölteni.' });
        }
        return;
      }
      setMyJoinRequests(normalizeJoinRequests(data));
      setRequestsNotice(null);
    } catch {
      setMyJoinRequests([]);
      setRequestsNotice({ tone: 'error', message: 'A korábbi kérelmek átmenetileg nem érhetők el.' });
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMyJoinRequests();
  }, [loadMyJoinRequests]);

  const loadMyCreationRequests = useCallback(async () => {
    if (!hasSupabaseConfig) {
      setCreationRequestsLoading(false);
      return;
    }

    setCreationRequestsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('list_my_community_creation_requests');
      if (error) {
        setMyCreationRequests([]);
        if (!isMissingRpc(error)) {
          setCreationNotice({ tone: 'error', message: t('onboarding.creationRequestsLoadError') });
        }
        return;
      }
      setMyCreationRequests(normalizeCreationRequests(data));
    } catch {
      setMyCreationRequests([]);
      setCreationNotice({ tone: 'error', message: t('onboarding.creationRequestsLoadError') });
    } finally {
      setCreationRequestsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadMyCreationRequests();
  }, [loadMyCreationRequests]);

  const activateCreationRequest = async (request: CommunityCreationRequestSummary) => {
    if (!hasSupabaseConfig || request.status !== 'APPROVED' || !request.activationPending) return;
    setActivatingCreationRequestId(request.requestId);
    setCreationNotice(null);
    let idempotencyKey = activationAttempts.current.get(request.requestId);
    if (!idempotencyKey) {
      idempotencyKey = window.crypto.randomUUID();
      activationAttempts.current.set(request.requestId, idempotencyKey);
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('activate_approved_community_creation_request', {
        p_request_id: request.requestId,
        p_idempotency_key: idempotencyKey,
      });

      if (error) {
        if (extractRpcErrorCode(error) === 'MFA_STEP_UP_REQUIRED') {
          setCreationNotice({ tone: 'info', message: t('onboarding.activationMfaRequired') });
          window.location.assign('/account/security?next=%2Fonboarding');
          return;
        }
        setCreationNotice({
          tone: 'error',
          message: rpcErrorMessage(error, t('onboarding.activationFailed')),
        });
        return;
      }

      const result = unwrapRows(data)[0] ?? null;
      const workspaceId = result
        ? readString(result, ['workspace_id', 'activated_workspace_id', 'reserved_workspace_id'])
        : request.reservedWorkspaceId;
      activationAttempts.current.delete(request.requestId);
      setCreationNotice({ tone: 'success', message: t('onboarding.activationSucceeded') });
      await loadMyCreationRequests();
      if (workspaceId) window.location.assign(`/w/${workspaceId}`);
    } catch {
      setCreationNotice({ tone: 'error', message: t('onboarding.activationFailed') });
    } finally {
      setActivatingCreationRequestId('');
    }
  };

  const acceptCounterOffer = async (request: JoinRequestSummary) => {
    if (!request.counterOfferId || request.counterOfferAccepted || !hasSupabaseConfig) return;
    setAcceptingRequestId(request.requestId);
    setRequestsNotice(null);
    try {
      const result = await acceptJoinRequestCounterOffer({
        requestId: request.requestId,
        offerId: request.counterOfferId,
        returnTo: '/onboarding',
      });
      if (!result.success) {
        setRequestsNotice({
          tone: 'error',
          message: result.error ?? 'Az ellenajánlatot most nem sikerült elfogadni.',
        });
        return;
      }
      setRequestsNotice({ tone: 'success', message: 'Az ellenajánlatot elfogadtad; a kérelem ismét ellenőrzésre vár.' });
      await loadMyJoinRequests();
    } catch {
      setRequestsNotice({ tone: 'error', message: 'Az ellenajánlat elfogadása átmenetileg nem érhető el.' });
    } finally {
      setAcceptingRequestId('');
    }
  };

  const searchCommunities = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchNotice(null);
    setJoinNotice(null);

    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 3) {
      setSearchNotice({ tone: 'error', message: 'Adj meg legalább 3 karaktert a névből vagy a címből.' });
      return;
    }
    if (!hasSupabaseConfig) {
      setSearchNotice({ tone: 'error', message: 'A közösségkereső szolgáltatás nincs konfigurálva.' });
      return;
    }

    setSearchLoading(true);
    setSelectedCommunity(null);
    setUnits([]);
    setSelectedUnitId('');
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('search_joinable_communities', {
        p_query: normalizedQuery,
        p_limit: 10,
      });

      if (error) {
        setCommunities([]);
        setSearchNotice({
          tone: 'error',
          message: rpcErrorMessage(error, 'A keresés most nem sikerült. Próbáld újra később.'),
        });
        return;
      }

      const normalized = normalizeCommunities(data);
      setCommunities(normalized);
      if (normalized.length === 0) {
        setSearchNotice({
          tone: 'info',
          message: 'Nem találtunk csatlakozható közösséget. Ellenőrizd a címet, vagy kezdeményezd egy új közösség ellenőrzését.',
        });
      }
    } catch {
      setCommunities([]);
      setSearchNotice({ tone: 'error', message: 'A közösségkereső átmenetileg nem érhető el.' });
    } finally {
      setSearchLoading(false);
    }
  };

  const selectCommunity = async (community: CommunityOption) => {
    setSelectedCommunity(community);
    setUnits([]);
    setSelectedUnitId('');
    setJoinNotice(null);
    joinAttempt.current = null;

    if (!hasSupabaseConfig) {
      setJoinNotice({ tone: 'error', message: 'Az albetétlista szolgáltatása nincs konfigurálva.' });
      return;
    }

    setUnitsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('list_joinable_units', {
        p_workspace_id: community.id,
      });

      if (error) {
        setJoinNotice({
          tone: 'error',
          message: rpcErrorMessage(error, 'Az albetéteket most nem sikerült betölteni.'),
        });
        return;
      }

      const normalized = normalizeUnits(data);
      setUnits(normalized);
      if (normalized.length === 0) {
        setJoinNotice({
          tone: 'info',
          message: 'Ehhez a közösséghez jelenleg nincs kiválasztható albetét. A közösség kezelője tud segíteni.',
        });
      }
    } catch {
      setJoinNotice({ tone: 'error', message: 'Az albetétlista átmenetileg nem érhető el.' });
    } finally {
      setUnitsLoading(false);
    }
  };

  const submitJoinRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setJoinNotice(null);
    if (!selectedCommunity || !selectedUnitId) {
      setJoinNotice({ tone: 'error', message: 'Válassz közösséget és albetétet.' });
      return;
    }
    if (!hasSupabaseConfig) {
      setJoinNotice({ tone: 'error', message: 'A csatlakozási szolgáltatás nincs konfigurálva.' });
      return;
    }

    const payload = {
      workspaceId: selectedCommunity.id,
      unitId: selectedUnitId,
      relationshipType,
      shareNumerator: relationshipType === 'OWNER' ? Number(ownershipShareNumerator) : null,
      shareDenominator: relationshipType === 'OWNER' ? Number(ownershipShareDenominator) : null,
      message: joinMessage.trim(),
    };
    const idempotencyKey = keyForAttempt(joinAttempt, JSON.stringify(payload));
    setJoinLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('submit_join_request', {
        p_workspace_id: payload.workspaceId,
        p_unit_id: payload.unitId,
        p_relationship_type: payload.relationshipType,
        p_share_numerator: payload.shareNumerator,
        p_share_denominator: payload.shareDenominator,
        p_message: payload.message || null,
        p_idempotency_key: idempotencyKey,
      });

      if (error) {
        setJoinNotice({
          tone: 'error',
          message: rpcErrorMessage(error, 'A kérelmet most nem sikerült beküldeni. Azonos adatokkal biztonságosan újrapróbálhatod.'),
        });
        return;
      }

      joinAttempt.current = null;
      setJoinNotice({
        tone: 'success',
        message: 'A csatlakozási kérelmet beküldtük. A hozzáférés csak külön ellenőrzés és jóváhagyás után válik aktívvá.',
      });
      setJoinMessage('');
      setOwnershipShareNumerator('');
      setOwnershipShareDenominator('');
      await loadMyJoinRequests();
    } catch {
      setJoinNotice({
        tone: 'error',
        message: 'A csatlakozási szolgáltatás átmenetileg nem érhető el. Azonos adatokkal biztonságosan újrapróbálhatod.',
      });
    } finally {
      setJoinLoading(false);
    }
  };

  const submitCreationRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreationNotice(null);

    const parsedUnitCount = Number(unitCount);
    if (communityName.trim().length < 2 || formattedAddress.trim().length < 5) {
      setCreationNotice({ tone: 'error', message: 'Add meg a közösség nevét és pontos címét.' });
      return;
    }
    if (!Number.isInteger(parsedUnitCount) || parsedUnitCount < 1 || parsedUnitCount > 5000) {
      setCreationNotice({ tone: 'error', message: 'Az albetétek száma 1 és 5000 közötti egész szám legyen.' });
      return;
    }
    if (!hasSupabaseConfig) {
      setCreationNotice({ tone: 'error', message: 'A közösségfelvételi szolgáltatás nincs konfigurálva.' });
      return;
    }

    const payload = {
      communityName: communityName.trim(),
      formattedAddress: formattedAddress.trim(),
      legalForm,
      unitCount: parsedUnitCount,
      governanceMode,
    };
    const idempotencyKey = keyForAttempt(creationAttempt, JSON.stringify(payload));
    setCreationLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('create_community_creation_request', {
        p_community_name: payload.communityName,
        p_formatted_address: payload.formattedAddress,
        p_legal_form: payload.legalForm,
        p_unit_count: payload.unitCount,
        p_governance_mode: payload.governanceMode,
        p_idempotency_key: idempotencyKey,
      });

      if (error) {
        setCreationNotice({
          tone: 'error',
          message: rpcErrorMessage(error, 'A kérelmet most nem sikerült beküldeni. Azonos adatokkal biztonságosan újrapróbálhatod.'),
        });
        return;
      }

      creationAttempt.current = null;
      setCreationNotice({
        tone: 'success',
        message: 'Az új közösség ellenőrzési kérelmét rögzítettük. Ez még nem hozott létre workspace-et, tagságot vagy adminjogot.',
      });
      await loadMyCreationRequests();
    } catch {
      setCreationNotice({
        tone: 'error',
        message: 'A közösségfelvételi szolgáltatás átmenetileg nem érhető el. Azonos adatokkal biztonságosan újrapróbálhatod.',
      });
    } finally {
      setCreationLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Biztonságos onboarding</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-canvas-ink sm:text-4xl">Hogyan szeretnéd használni a PanelLakót?</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-canvas-muted sm:text-base">
          A fiókod elkészült, de még nem kapott hozzáférést egyetlen lakóközösséghez sem. Válassz egy ellenőrzött folyamatot.
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-2" role="group" aria-label="Onboarding útvonal">
        <button
          type="button"
          aria-pressed={branch === 'join'}
          onClick={() => setBranch('join')}
          className={`min-h-24 rounded-2xl border p-4 text-left transition-colors ${branch === 'join' ? 'border-brand-300 bg-brand-50 shadow-card' : 'border-canvas-line bg-white hover:border-brand-200 hover:bg-canvas-sage'}`}
        >
          <span className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-800 ring-1 ring-brand-100"><Home className="h-5 w-5" aria-hidden="true" /></span>
            <span>
              <strong className="block text-sm font-semibold text-canvas-ink">Már létező közösséghez csatlakozom</strong>
              <span className="mt-1 block text-xs leading-relaxed text-canvas-muted">Lakóként vagy tulajdonosként kérelmet küldök.</span>
            </span>
          </span>
        </button>
        <button
          type="button"
          aria-pressed={branch === 'create'}
          onClick={() => setBranch('create')}
          className={`min-h-24 rounded-2xl border p-4 text-left transition-colors ${branch === 'create' ? 'border-brand-300 bg-brand-50 shadow-card' : 'border-canvas-line bg-white hover:border-brand-200 hover:bg-canvas-sage'}`}
        >
          <span className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-800 ring-1 ring-brand-100"><Building2 className="h-5 w-5" aria-hidden="true" /></span>
            <span>
              <strong className="block text-sm font-semibold text-canvas-ink">Új közösséget kezdeményezek</strong>
              <span className="mt-1 block text-xs leading-relaxed text-canvas-muted">Ellenőrzési kérelmet indítok egy még nem szereplő címhez.</span>
            </span>
          </span>
        </button>
      </div>

      {branch === 'join' ? (
        <div className="mx-auto mt-6 max-w-4xl space-y-5">
        {(requestsLoading || myJoinRequests.length > 0 || requestsNotice) && (
          <section className="rounded-[1.5rem] border border-canvas-line bg-white p-5 shadow-card-md sm:p-7" aria-labelledby="requests-heading">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-canvas-sage text-brand-800 ring-1 ring-brand-100"><Clock3 className="h-5 w-5" aria-hidden="true" /></div>
              <div>
                <h2 id="requests-heading" className="text-lg font-semibold text-canvas-ink">Folyamatban lévő kérelmeid</h2>
                <p className="mt-1 text-sm text-canvas-muted">Itt fogadhatod el a kezelő pontosított albetét- vagy jogviszony-ajánlatát is.</p>
              </div>
            </div>
            <div className="mt-4"><NoticeBox notice={requestsNotice} /></div>
            {requestsLoading ? (
              <p role="status" className="mt-4 text-sm text-canvas-muted">Kérelmek betöltése…</p>
            ) : (
              <div className="mt-4 space-y-3">
                {myJoinRequests.map((request) => (
                  <article key={request.requestId} className="rounded-xl border border-canvas-line bg-canvas-sage/45 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-canvas-ink">{request.workspaceName}</h3>
                        <p className="mt-1 text-xs text-canvas-muted">
                          {request.requestedUnitDesignation || 'Kiválasztott albetét'} · {relationshipLabel(request.requestedRelationshipType)}
                          {request.requestedShareNumerator && request.requestedShareDenominator
                            ? ` · ${request.requestedShareNumerator}/${request.requestedShareDenominator}`
                            : ''}
                        </p>
                      </div>
                      <span className="w-fit rounded-full border border-brand-200 bg-white px-2.5 py-1 text-xs font-semibold text-brand-800">
                        {requestStatusLabel(request.status)}
                      </span>
                    </div>
                    {request.reviewReason && <p className="mt-3 text-sm leading-relaxed text-slate-700">{request.reviewReason}</p>}
                    {request.counterOfferId && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-canvas-warm p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Kezelői ellenajánlat</p>
                        <p className="mt-1 text-sm text-slate-800">
                          {request.counterOfferUnitDesignation || 'Pontosított albetét'} · {relationshipLabel(request.counterOfferRelationshipType)}
                          {request.counterOfferShareNumerator && request.counterOfferShareDenominator
                            ? ` · ${request.counterOfferShareNumerator}/${request.counterOfferShareDenominator}`
                            : ''}
                        </p>
                        {request.counterOfferReason && <p className="mt-1 text-xs leading-relaxed text-slate-600">{request.counterOfferReason}</p>}
                        {request.counterOfferAccepted ? (
                          <p className="mt-2 text-xs font-semibold text-emerald-800">Elfogadva, ismét ellenőrzésre vár.</p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void acceptCounterOffer(request)}
                            disabled={acceptingRequestId === request.requestId}
                            className="btn-primary mt-3 min-h-11 px-4"
                          >
                            {acceptingRequestId === request.requestId ? 'Elfogadás…' : 'Ellenajánlat elfogadása'}
                          </button>
                        )}
                      </div>
                    )}
                    <JoinRequestLifecycleControls request={request} onChanged={loadMyJoinRequests} />
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="rounded-[1.5rem] border border-canvas-line bg-white p-5 shadow-card-md sm:p-7" aria-labelledby="join-heading">
          <div className="mb-6 flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-canvas-sage text-brand-800 ring-1 ring-brand-100"><Search className="h-5 w-5" aria-hidden="true" /></div>
            <div>
              <h2 id="join-heading" className="text-xl font-semibold text-canvas-ink">Közösség keresése</h2>
              <p className="mt-1 text-sm leading-relaxed text-canvas-muted">Csak már regisztrált, csatlakozható közösségek és személyes adatot nem tartalmazó albetétjelölések jelennek meg.</p>
            </div>
          </div>

          <form onSubmit={searchCommunities} className="flex flex-col gap-3 sm:flex-row" role="search">
            <div className="flex-1">
              <label htmlFor="community-search" className="sr-only">Közösség neve vagy címe</label>
              <input
                id="community-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="input-base min-h-11"
                placeholder="Például: Gidófalvy Lajos utca 9."
                required
                minLength={3}
              />
            </div>
            <button type="submit" disabled={searchLoading} className="btn-primary min-h-11 sm:min-w-36">
              <Search className="h-4 w-4" aria-hidden="true" />
              {searchLoading ? 'Keresés…' : 'Keresés'}
            </button>
          </form>

          <div className="mt-4"><NoticeBox notice={searchNotice} /></div>

          {communities.length > 0 && (
            <div className="mt-5 space-y-2" aria-label="Találatok">
              {communities.map((community) => (
                <button
                  key={community.id}
                  type="button"
                  onClick={() => void selectCommunity(community)}
                  aria-pressed={selectedCommunity?.id === community.id}
                  className={`flex min-h-16 w-full items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition-colors ${selectedCommunity?.id === community.id ? 'border-brand-300 bg-brand-50' : 'border-canvas-line bg-white hover:border-brand-200 hover:bg-canvas-sage'}`}
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-sm font-semibold text-canvas-ink">{community.name}</strong>
                    <span className="mt-1 flex items-start gap-1.5 text-xs text-canvas-muted"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{community.address || 'Cím a kiválasztás után ellenőrizhető'}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}

          {selectedCommunity && (
            <form onSubmit={submitJoinRequest} className="mt-6 space-y-5 border-t border-canvas-line pt-6" aria-busy={unitsLoading || joinLoading}>
              <div>
                <label htmlFor="join-unit" className="mb-1.5 block text-sm font-semibold text-slate-700">Albetét</label>
                <select
                  id="join-unit"
                  required
                  value={selectedUnitId}
                  onChange={(event) => { setSelectedUnitId(event.target.value); setJoinNotice(null); }}
                  disabled={unitsLoading || units.length === 0}
                  className="input-base min-h-11"
                >
                  <option value="">{unitsLoading ? 'Albetétek betöltése…' : 'Válassz albetétet'}</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.label}{unit.type ? ` · ${unit.type}` : ''}</option>
                  ))}
                </select>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-slate-700">Milyen kapcsolatot kérsz?</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ['TENANT', 'Lakó / bérlő', 'Az albetétben életvitelszerűen vagy bérlőként lakom.'],
                    ['OWNER', 'Tulajdonos', 'Az albetét tulajdonosa vagy társtulajdonosa vagyok.'],
                  ] as const).map(([value, label, description]) => (
                    <label key={value} className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${relationshipType === value ? 'border-brand-300 bg-brand-50' : 'border-canvas-line hover:bg-canvas-sage'}`}>
                      <input type="radio" name="relationship" value={value} checked={relationshipType === value} onChange={() => { setRelationshipType(value); setJoinNotice(null); }} className="mt-1 h-4 w-4 accent-brand-700" />
                      <span><strong className="block text-sm font-semibold text-canvas-ink">{label}</strong><span className="mt-0.5 block text-xs leading-relaxed text-canvas-muted">{description}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {relationshipType === 'OWNER' ? (
                <fieldset>
                  <legend className="mb-1.5 text-sm font-semibold text-slate-700">Pontos tulajdoni hányad</legend>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <input aria-label="Tulajdoni hányad számlálója" className="input-base min-h-11" type="number" min={1} step={1} value={ownershipShareNumerator} onChange={(event) => setOwnershipShareNumerator(event.target.value)} required />
                    <span aria-hidden="true" className="text-canvas-muted">/</span>
                    <input aria-label="Tulajdoni hányad nevezője" className="input-base min-h-11" type="number" min={1} step={1} value={ownershipShareDenominator} onChange={(event) => setOwnershipShareDenominator(event.target.value)} required />
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-canvas-muted">A tulajdoni lap szerinti törtet add meg; a rendszer nem feltételez automatikusan 1/1 tulajdont.</p>
                </fieldset>
              ) : null}

              <div>
                <label htmlFor="join-message" className="mb-1.5 block text-sm font-semibold text-slate-700">Megjegyzés <span className="font-normal text-canvas-muted">(opcionális)</span></label>
                <textarea
                  id="join-message"
                  rows={3}
                  maxLength={500}
                  value={joinMessage}
                  onChange={(event) => setJoinMessage(event.target.value)}
                  className="input-base resize-y"
                  placeholder="Olyan információ, amely segítheti az ellenőrzést."
                />
              </div>

              <NoticeBox notice={joinNotice} />
              <button type="submit" disabled={joinLoading || unitsLoading || !selectedUnitId} className="btn-primary min-h-11 w-full sm:w-auto">
                {joinLoading ? 'Kérelem küldése…' : 'Csatlakozási kérelem küldése'}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          )}
        </section>
        </div>
      ) : (
        <div className="mx-auto mt-6 max-w-4xl space-y-5">
        {(creationRequestsLoading || myCreationRequests.length > 0) && (
          <section className="rounded-[1.5rem] border border-canvas-line bg-white p-5 shadow-card-md sm:p-7" aria-labelledby="creation-requests-heading">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-canvas-sage text-brand-800 ring-1 ring-brand-100"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></div>
              <div>
                <h2 id="creation-requests-heading" className="text-lg font-semibold text-canvas-ink">{t('onboarding.creationRequestsTitle')}</h2>
                <p className="mt-1 text-sm leading-relaxed text-canvas-muted">{t('onboarding.creationRequestsDescription')}</p>
              </div>
            </div>

            {creationRequestsLoading ? (
              <p role="status" className="mt-4 text-sm text-canvas-muted">{t('onboarding.creationRequestsLoading')}</p>
            ) : (
              <div className="mt-4 space-y-3">
                {myCreationRequests.map((request) => (
                  <article key={request.requestId} className="rounded-xl border border-canvas-line bg-canvas-sage/45 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-canvas-ink">{request.communityName}</h3>
                        <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-canvas-muted">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {request.formattedAddress}
                        </p>
                        <p className="mt-2 text-xs text-slate-600">
                          {request.declaredUnitCount} albetét · {request.governanceMode === 'SELF_MANAGED' ? 'Önkezelt' : 'Képviselővel kezelt'}
                        </p>
                      </div>
                      <span className="w-fit shrink-0 rounded-full border border-brand-200 bg-white px-2.5 py-1 text-xs font-semibold text-brand-800">
                        {requestStatusLabel(request.status)}
                      </span>
                    </div>

                    {request.reviewReason && (
                      <p className="mt-3 rounded-lg border border-canvas-line bg-white px-3 py-2 text-sm leading-relaxed text-slate-700">
                        {request.reviewReason}
                      </p>
                    )}

                    {request.status === 'APPROVED' && request.activationPending && (
                      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-sm font-semibold text-emerald-900">{t('onboarding.activationApproved')}</p>
                        <p className="mt-1 text-xs leading-relaxed text-emerald-800">{t('onboarding.activationApprovedHelp')}</p>
                        <button
                          type="button"
                          onClick={() => void activateCreationRequest(request)}
                          disabled={activatingCreationRequestId === request.requestId}
                          className="btn-primary mt-3 min-h-11 px-4"
                        >
                          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                          {activatingCreationRequestId === request.requestId
                            ? t('onboarding.activating')
                            : t('onboarding.activateCommunity')}
                        </button>
                      </div>
                    )}
                    {request.status === 'APPROVED' && !request.activationPending && (
                      <p className="mt-3 rounded-xl border border-amber-200 bg-canvas-warm px-3 py-2 text-sm leading-relaxed text-amber-900">
                        {t('onboarding.activationWindowExpired')}
                      </p>
                    )}
                    {request.status === 'ACTIVATED' && request.activatedWorkspaceId && (
                      <Link href={`/w/${request.activatedWorkspaceId}`} className="btn-secondary mt-3 min-h-11 w-full px-4 sm:w-auto">
                        {t('onboarding.openActivatedCommunity')}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="rounded-[1.5rem] border border-canvas-line bg-white p-5 shadow-card-md sm:p-7" aria-labelledby="creation-heading">
          <div className="mb-6 flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-canvas-sage text-brand-800 ring-1 ring-brand-100"><Building2 className="h-5 w-5" aria-hidden="true" /></div>
            <div>
              <h2 id="creation-heading" className="text-xl font-semibold text-canvas-ink">Új közösség ellenőrzési kérelme</h2>
              <p className="mt-1 text-sm leading-relaxed text-canvas-muted">A beküldés nem hoz létre aktív épületet vagy adminjogot. Először cím- és jogosultság-ellenőrzés történik.</p>
            </div>
          </div>

          <form onSubmit={submitCreationRequest} className="space-y-5" aria-busy={creationLoading}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="community-name" className="mb-1.5 block text-sm font-semibold text-slate-700">Közösség neve</label>
                <input id="community-name" type="text" required minLength={2} maxLength={200} value={communityName} onChange={(event) => setCommunityName(event.target.value)} className="input-base min-h-11" placeholder="Például: Gidófalvy Lajos utca 9." />
              </div>
              <div>
                <label htmlFor="community-address" className="mb-1.5 block text-sm font-semibold text-slate-700">Pontos cím</label>
                <input id="community-address" type="text" required minLength={5} maxLength={300} autoComplete="street-address" value={formattedAddress} onChange={(event) => setFormattedAddress(event.target.value)} className="input-base min-h-11" placeholder="Irányítószám, település, közterület, házszám" />
              </div>
              <div>
                <label htmlFor="legal-form" className="mb-1.5 block text-sm font-semibold text-slate-700">Jogi forma</label>
                <select id="legal-form" value={legalForm} onChange={(event) => setLegalForm(event.target.value as LegalForm)} className="input-base min-h-11">
                  <option value="CONDOMINIUM">Társasház</option>
                  <option value="UNDIVIDED_COMMON_OWNERSHIP">Osztatlan közös tulajdon</option>
                </select>
              </div>
              <div>
                <label htmlFor="unit-count" className="mb-1.5 block text-sm font-semibold text-slate-700">Albetétek száma</label>
                <input id="unit-count" type="number" inputMode="numeric" required min={1} max={5000} step={1} value={unitCount} onChange={(event) => setUnitCount(event.target.value)} className="input-base min-h-11" />
              </div>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-700">Működési mód</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${governanceMode === 'REPRESENTATIVE_MANAGED' ? 'border-brand-300 bg-brand-50' : 'border-canvas-line hover:bg-canvas-sage'}`}>
                  <input type="radio" name="governance" value="REPRESENTATIVE_MANAGED" checked={governanceMode === 'REPRESENTATIVE_MANAGED'} onChange={() => setGovernanceMode('REPRESENTATIVE_MANAGED')} className="mt-1 h-4 w-4 accent-brand-700" />
                  <span><strong className="flex items-center gap-2 text-sm font-semibold text-canvas-ink"><Users className="h-4 w-4 text-brand-700" aria-hidden="true" />Közös képviselővel kezelt</strong><span className="mt-1 block text-xs leading-relaxed text-canvas-muted">A képviseleti mandátum külön ellenőrzésre kerül.</span></span>
                </label>
                <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${governanceMode === 'SELF_MANAGED' ? 'border-brand-300 bg-brand-50' : 'border-canvas-line hover:bg-canvas-sage'}`}>
                  <input type="radio" name="governance" value="SELF_MANAGED" checked={governanceMode === 'SELF_MANAGED'} onChange={() => setGovernanceMode('SELF_MANAGED')} className="mt-1 h-4 w-4 accent-brand-700" />
                  <span><strong className="flex items-center gap-2 text-sm font-semibold text-canvas-ink"><ShieldCheck className="h-4 w-4 text-brand-700" aria-hidden="true" />Önkezelt közösség</strong><span className="mt-1 block text-xs leading-relaxed text-canvas-muted">Kis közösségnél is jogalap- és közösségi ellenőrzés szükséges.</span></span>
                </label>
              </div>
            </fieldset>

            <div className="rounded-xl border border-amber-200 bg-canvas-warm px-4 py-3 text-sm leading-relaxed text-amber-900">
              A kérelem ellenőrzésre váró adatot rögzít. A beküldő ettől még nem lesz lakó, tulajdonos, közös képviselő vagy workspace-adminisztrátor.
            </div>

            <NoticeBox notice={creationNotice} />
            <button type="submit" disabled={creationLoading} className="btn-primary min-h-11 w-full sm:w-auto">
              {creationLoading ? 'Kérelem küldése…' : 'Ellenőrzési kérelem küldése'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </section>
        </div>
      )}

      <div className="mx-auto mt-6 flex max-w-4xl flex-col items-center justify-between gap-3 rounded-2xl border border-canvas-line bg-canvas-sage px-5 py-4 text-center sm:flex-row sm:text-left">
        <span className="flex items-center gap-2 text-sm text-canvas-muted"><CheckCircle2 className="h-4 w-4 text-brand-700" aria-hidden="true" />Már van aktív hozzáférésed?</span>
        <Link href="/app" className="btn-secondary min-h-11 w-full sm:w-auto">Épületeim megnyitása</Link>
      </div>
    </main>
  );
}
