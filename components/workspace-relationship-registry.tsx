'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useRef, useState } from 'react';
import { Check, History, ShieldAlert, UserRoundPlus, UsersRound } from 'lucide-react';
import {
  changeWorkspaceMembershipStatus,
  createWorkspacePersonRelationship,
  reviewWorkspaceUnitRelationship,
  type WorkspaceAdminActionResult,
  type WorkspaceAdminMember,
  type WorkspaceAdminSnapshot,
  type WorkspaceMembershipTargetStatus,
  type WorkspaceRelationshipReviewDecision,
  type WorkspaceRelationshipType,
  type WorkspaceUnitRelationship,
} from '@/app/actions/workspace-admin';
import { useI18n } from '@/src/i18n/useI18n';

type Notice = {
  tone: 'success' | 'error' | 'info';
  message: string;
  href?: string;
};

type Attempt = { fingerprint: string; key: string };

interface WorkspaceRelationshipRegistryProps {
  snapshot: WorkspaceAdminSnapshot;
}

const RELATIONSHIP_TYPES: WorkspaceRelationshipType[] = [
  'OWNER',
  'OWNER_OCCUPANT',
  'TENANT',
  'HOUSEHOLD_MEMBER',
  'AUTHORIZED_OCCUPANT',
];

const RELATIONSHIP_TYPE_KEYS: Record<WorkspaceRelationshipType, string> = {
  OWNER: 'workspaceAdmin.registry.relationship.owner',
  OWNER_OCCUPANT: 'workspaceAdmin.registry.relationship.ownerOccupant',
  TENANT: 'workspaceAdmin.registry.relationship.tenant',
  HOUSEHOLD_MEMBER: 'workspaceAdmin.registry.relationship.householdMember',
  AUTHORIZED_OCCUPANT: 'workspaceAdmin.registry.relationship.authorizedOccupant',
};

const STATUS_KEYS: Record<string, string> = {
  CLAIMED: 'workspaceAdmin.registry.status.claimed',
  PENDING_VERIFICATION: 'workspaceAdmin.registry.status.pendingVerification',
  VERIFIED: 'workspaceAdmin.registry.status.verified',
  DISPUTED: 'workspaceAdmin.registry.status.disputed',
  ENDED: 'workspaceAdmin.registry.status.ended',
  ACTIVE: 'workspaceAdmin.registry.status.active',
  SUSPENDED: 'workspaceAdmin.registry.status.suspended',
};

function noticeFromResult(
  result: WorkspaceAdminActionResult<unknown>,
  successMessage: string,
  fallback: string,
): Notice {
  if (result.success) return { tone: 'success', message: successMessage };
  return {
    tone: 'error',
    message: result.error ?? fallback,
    href: result.mfaRequired ? result.stepUpHref : undefined,
  };
}

function NoticeBox({ notice, securityLabel }: { notice: Notice | null; securityLabel: string }) {
  if (!notice) return null;
  const palette = notice.tone === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-900'
    : notice.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : 'border-sky-200 bg-sky-50 text-sky-900';
  return (
    <div
      role={notice.tone === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className={`rounded-xl border px-3 py-2.5 text-sm leading-relaxed ${palette}`}
    >
      <span>{notice.message}</span>
      {notice.href ? (
        <Link href={notice.href as Route} className="ml-2 inline-flex font-semibold underline underline-offset-2">
          {securityLabel}
        </Link>
      ) : null}
    </div>
  );
}

function RelationshipCard({
  relationship,
  workspaceId,
  onChanged,
}: {
  relationship: WorkspaceUnitRelationship;
  workspaceId: string;
  onChanged: () => void;
}) {
  const { locale, t } = useI18n();
  const [decision, setDecision] = useState<WorkspaceRelationshipReviewDecision>('VERIFY');
  const [reason, setReason] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [shareNumerator, setShareNumerator] = useState(
    relationship.shareNumerator == null ? '' : String(relationship.shareNumerator),
  );
  const [shareDenominator, setShareDenominator] = useState(
    relationship.shareDenominator == null ? '' : String(relationship.shareDenominator),
  );
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const attempt = useRef<Attempt | null>(null);
  const ended = relationship.status === 'ENDED';
  const allowedDecisions: WorkspaceRelationshipReviewDecision[] = relationship.status === 'VERIFIED'
    ? ['DISPUTE', 'END']
    : relationship.status === 'DISPUTED'
      ? ['VERIFY', 'END']
      : ['VERIFY', 'DISPUTE', 'END'];
  const effectiveDecision = allowedDecisions.includes(decision) ? decision : allowedDecisions[0];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const payload = {
      workspaceId,
      relationshipKind: relationship.relationshipKind,
      relationshipId: relationship.relationshipId,
      decision: effectiveDecision,
      reason: reason.trim() || null,
      evidenceReference: evidenceReference.trim() || null,
      shareNumerator: relationship.relationshipKind === 'OWNERSHIP' && effectiveDecision === 'VERIFY'
        ? Number(shareNumerator)
        : null,
      shareDenominator: relationship.relationshipKind === 'OWNERSHIP' && effectiveDecision === 'VERIFY'
        ? Number(shareDenominator)
        : null,
    };
    const fingerprint = JSON.stringify(payload);
    if (attempt.current?.fingerprint !== fingerprint) {
      attempt.current = { fingerprint, key: window.crypto.randomUUID() };
    }
    setPending(true);
    const result = await reviewWorkspaceUnitRelationship({
      ...payload,
      idempotencyKey: attempt.current.key,
    });
    setPending(false);
    setNotice(noticeFromResult(
      result,
      t('workspaceAdmin.registry.review.success'),
      t('workspaceAdmin.registry.review.failed'),
    ));
    if (result.success) {
      attempt.current = null;
      setReason('');
      setEvidenceReference('');
      onChanged();
    }
  }

  const dateLocale = locale === 'en' ? 'en-GB' : 'hu-HU';
  const validFrom = relationship.validFrom
    ? new Intl.DateTimeFormat(dateLocale, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(relationship.validFrom))
    : '—';
  const statusLabel = t(STATUS_KEYS[relationship.status] ?? 'workspaceAdmin.registry.status.unknown');
  const relationshipLabel = relationship.relationshipType === 'SOLE_OWNER'
    ? t('workspaceAdmin.registry.relationship.owner')
    : relationship.relationshipType === 'CO_OWNER'
      ? t('workspaceAdmin.registry.relationship.coOwner')
      : relationship.relationshipType in RELATIONSHIP_TYPE_KEYS
        ? t(RELATIONSHIP_TYPE_KEYS[relationship.relationshipType as WorkspaceRelationshipType])
        : relationship.relationshipType;

  return (
    <article className="rounded-2xl border border-canvas-line bg-canvas-fog/55 p-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <h4 className="font-semibold text-canvas-ink">{relationship.displayName}</h4>
          <p className="mt-1 text-sm text-canvas-muted">
            {relationship.unitDesignation} · {relationshipLabel}
          </p>
          <p className="mt-1 text-xs text-canvas-subtle">
            {relationship.relationshipKind === 'OWNERSHIP'
              ? t('workspaceAdmin.registry.kind.ownership')
              : t('workspaceAdmin.registry.kind.occupancy')}
            {relationship.shareNumerator && relationship.shareDenominator
              ? ` · ${relationship.shareNumerator}/${relationship.shareDenominator}`
              : ''}
            {` · ${validFrom}`}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-canvas-line bg-white px-2.5 py-1 text-xs font-semibold text-canvas-ink">
          {statusLabel}
        </span>
      </div>

      {relationship.evidenceReference ? (
        <p className="mt-3 break-all rounded-xl border border-canvas-line bg-white px-3 py-2 font-mono text-[11px] text-canvas-muted">
          {t('workspaceAdmin.registry.evidenceStored')}: {relationship.evidenceReference}
        </p>
      ) : null}

      {ended ? (
        <p className="mt-3 text-xs leading-relaxed text-canvas-muted">
          {relationship.endedReason || t('workspaceAdmin.registry.review.endedWithoutReason')}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3 border-t border-canvas-line pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-canvas-muted">
              {t('workspaceAdmin.registry.review.decision')}
              <select
                className="input-base mt-1 min-h-11"
                value={effectiveDecision}
                onChange={(event) => setDecision(event.target.value as WorkspaceRelationshipReviewDecision)}
              >
                {allowedDecisions.map((item) => (
                  <option key={item} value={item}>
                    {item === 'VERIFY'
                      ? t('workspaceAdmin.registry.review.verify')
                      : item === 'DISPUTE'
                        ? t('workspaceAdmin.registry.review.dispute')
                        : t('workspaceAdmin.registry.review.end')}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-canvas-muted">
              {t('workspaceAdmin.registry.evidence')}
              <input
                className="input-base mt-1 min-h-11 font-mono text-xs"
                value={evidenceReference}
                onChange={(event) => setEvidenceReference(event.target.value)}
                maxLength={255}
                required={effectiveDecision === 'VERIFY'}
                placeholder="registry:internal-reference"
              />
            </label>
          </div>
          {relationship.relationshipKind === 'OWNERSHIP' && effectiveDecision === 'VERIFY' ? (
            <fieldset>
              <legend className="text-xs font-semibold text-canvas-muted">{t('workspaceAdmin.registry.create.share')}</legend>
              <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <input
                  aria-label={t('workspaceAdmin.registry.create.shareNumerator')}
                  className="input-base min-h-11"
                  type="number"
                  min={1}
                  step={1}
                  value={shareNumerator}
                  onChange={(event) => setShareNumerator(event.target.value)}
                  required
                />
                <span aria-hidden="true" className="text-canvas-muted">/</span>
                <input
                  aria-label={t('workspaceAdmin.registry.create.shareDenominator')}
                  className="input-base min-h-11"
                  type="number"
                  min={1}
                  step={1}
                  value={shareDenominator}
                  onChange={(event) => setShareDenominator(event.target.value)}
                  required
                />
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-canvas-subtle">
                {t('workspaceAdmin.registry.create.shareHelp')}
              </p>
            </fieldset>
          ) : null}
          {effectiveDecision !== 'VERIFY' ? (
            <label className="block text-xs font-semibold text-canvas-muted">
              {t('workspaceAdmin.registry.review.reason')}
              <textarea
                className="input-base mt-1 min-h-20 resize-y"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={3}
                maxLength={1000}
                required
              />
            </label>
          ) : null}
          <NoticeBox notice={notice} securityLabel={t('workspaceAdmin.registry.securityConfirmation')} />
          <button type="submit" disabled={pending} className="btn-secondary min-h-10 px-3 text-sm">
            {pending ? t('workspaceAdmin.registry.review.saving') : t('workspaceAdmin.registry.review.submit')}
          </button>
        </form>
      )}
    </article>
  );
}

function MembershipLifecycleCard({
  member,
  workspaceId,
  onChanged,
}: {
  member: WorkspaceAdminMember;
  workspaceId: string;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [targetStatus, setTargetStatus] = useState<WorkspaceMembershipTargetStatus>(
    member.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED',
  );
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const attempt = useRef<Attempt | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const payload = { workspaceId, membershipId: member.membershipId, targetStatus, reason: reason.trim() };
    const fingerprint = JSON.stringify(payload);
    if (attempt.current?.fingerprint !== fingerprint) {
      attempt.current = { fingerprint, key: window.crypto.randomUUID() };
    }
    setPending(true);
    const result = await changeWorkspaceMembershipStatus({ ...payload, idempotencyKey: attempt.current.key });
    setPending(false);
    setNotice(noticeFromResult(
      result,
      t('workspaceAdmin.registry.membership.success'),
      t('workspaceAdmin.registry.membership.failed'),
    ));
    if (result.success) {
      attempt.current = null;
      setReason('');
      onChanged();
    }
  }

  return (
    <article className="rounded-xl border border-canvas-line bg-white p-3">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <h4 className="text-sm font-semibold text-canvas-ink">{member.displayName}</h4>
          <p className="mt-1 text-xs text-canvas-muted">
            {member.primaryUnitDesignation || t('workspaceAdmin.registry.membership.noPrimaryUnit')} ·{' '}
            {t(STATUS_KEYS[member.status] ?? 'workspaceAdmin.registry.status.unknown')}
          </p>
        </div>
        {member.roleKeys.length ? (
          <span className="inline-flex w-fit rounded-full bg-canvas-sage px-2.5 py-1 text-[11px] font-semibold text-brand-900">
            {member.roleKeys.join(', ')}
          </span>
        ) : null}
      </div>

      {member.status === 'ACTIVE' || member.status === 'SUSPENDED' ? (
        <form onSubmit={submit} className="mt-3 space-y-3 border-t border-canvas-line pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-canvas-muted">
              {t('workspaceAdmin.registry.membership.targetStatus')}
              <select
                className="input-base mt-1 min-h-10"
                value={targetStatus}
                onChange={(event) => setTargetStatus(event.target.value as WorkspaceMembershipTargetStatus)}
              >
                {member.status === 'SUSPENDED' ? (
                  <>
                    <option value="ACTIVE">{t('workspaceAdmin.registry.membership.reactivate')}</option>
                    <option value="ENDED">{t('workspaceAdmin.registry.membership.end')}</option>
                  </>
                ) : (
                  <>
                    <option value="SUSPENDED">{t('workspaceAdmin.registry.membership.suspend')}</option>
                    <option value="ENDED">{t('workspaceAdmin.registry.membership.end')}</option>
                  </>
                )}
              </select>
            </label>
            <label className="text-xs font-semibold text-canvas-muted">
              {t('workspaceAdmin.registry.membership.reason')}
              <input
                className="input-base mt-1 min-h-10"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={3}
                maxLength={1000}
                required
              />
            </label>
          </div>
          <NoticeBox notice={notice} securityLabel={t('workspaceAdmin.registry.securityConfirmation')} />
          <button type="submit" disabled={pending} className="btn-secondary min-h-10 px-3 text-sm">
            {pending ? t('workspaceAdmin.registry.membership.saving') : t('workspaceAdmin.registry.membership.submit')}
          </button>
        </form>
      ) : null}
    </article>
  );
}

export default function WorkspaceRelationshipRegistry({ snapshot }: WorkspaceRelationshipRegistryProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { workspaceId, permissions, relationships, units, members } = snapshot;
  const [personChoice, setPersonChoice] = useState('NEW');
  const [displayName, setDisplayName] = useState('');
  const [unitId, setUnitId] = useState(units[0]?.id ?? '');
  const [relationshipType, setRelationshipType] = useState<WorkspaceRelationshipType>('TENANT');
  const [shareNumerator, setShareNumerator] = useState('');
  const [shareDenominator, setShareDenominator] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const attempt = useRef<Attempt | null>(null);

  const existingPeople = useMemo(() => {
    const people = new Map<string, string>();
    for (const relationship of relationships) {
      if (relationship.personId && !people.has(relationship.personId)) {
        people.set(relationship.personId, relationship.displayName);
      }
    }
    return Array.from(people, ([personId, name]) => ({ personId, name }))
      .sort((left, right) => left.name.localeCompare(right.name, 'hu'));
  }, [relationships]);

  const ownership = relationshipType === 'OWNER' || relationshipType === 'OWNER_OCCUPANT';

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const numerator = ownership && shareNumerator.trim() ? Number(shareNumerator) : null;
    const denominator = ownership && shareDenominator.trim() ? Number(shareDenominator) : null;
    const payload = {
      workspaceId,
      personId: personChoice === 'NEW' ? null : personChoice,
      displayName: personChoice === 'NEW' ? displayName.trim() : null,
      unitId,
      relationshipType,
      shareNumerator: numerator,
      shareDenominator: denominator,
      evidenceReference: evidenceReference.trim(),
    };
    const fingerprint = JSON.stringify(payload);
    if (attempt.current?.fingerprint !== fingerprint) {
      attempt.current = { fingerprint, key: window.crypto.randomUUID() };
    }
    setPending(true);
    const result = await createWorkspacePersonRelationship({ ...payload, idempotencyKey: attempt.current.key });
    setPending(false);
    setNotice(noticeFromResult(
      result,
      t('workspaceAdmin.registry.create.success'),
      t('workspaceAdmin.registry.create.failed'),
    ));
    if (result.success) {
      attempt.current = null;
      setDisplayName('');
      setShareNumerator('');
      setShareDenominator('');
      setEvidenceReference('');
      router.refresh();
    }
  }

  if (!permissions.canManageRelationships && !permissions.canSuspendMemberships) return null;

  return (
    <section className="mt-5 rounded-[1.5rem] border border-canvas-line bg-white p-5 shadow-card-md sm:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-canvas-sage text-brand-800 ring-1 ring-brand-100">
            <UsersRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
              {t('workspaceAdmin.registry.eyebrow')}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-canvas-ink">
              {t('workspaceAdmin.registry.title')}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-canvas-muted">
              {t('workspaceAdmin.registry.description')}
            </p>
          </div>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950">
          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t('workspaceAdmin.registry.securityNotice')}
        </div>
      </div>

      {permissions.canManageRelationships ? (
        <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.5fr)]">
          <form onSubmit={submitCreate} className="space-y-3 rounded-2xl border border-brand-100 bg-canvas-sage/65 p-4">
            <div className="flex items-center gap-2">
              <UserRoundPlus className="h-4 w-4 text-brand-800" aria-hidden="true" />
              <h3 className="font-semibold text-canvas-ink">{t('workspaceAdmin.registry.create.title')}</h3>
            </div>
            <p className="text-xs leading-relaxed text-canvas-muted">{t('workspaceAdmin.registry.create.description')}</p>

            <label className="block text-xs font-semibold text-canvas-muted">
              {t('workspaceAdmin.registry.create.person')}
              <select
                className="input-base mt-1 min-h-11"
                value={personChoice}
                onChange={(event) => setPersonChoice(event.target.value)}
              >
                <option value="NEW">{t('workspaceAdmin.registry.create.newPerson')}</option>
                {existingPeople.map((person) => (
                  <option key={person.personId} value={person.personId}>{person.name}</option>
                ))}
              </select>
            </label>

            {personChoice === 'NEW' ? (
              <label className="block text-xs font-semibold text-canvas-muted">
                {t('workspaceAdmin.registry.create.displayName')}
                <input
                  className="input-base mt-1 min-h-11"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  minLength={2}
                  maxLength={160}
                  autoComplete="off"
                  required
                />
              </label>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <label className="text-xs font-semibold text-canvas-muted">
                {t('workspaceAdmin.registry.create.unit')}
                <select className="input-base mt-1 min-h-11" value={unitId} onChange={(event) => setUnitId(event.target.value)} required>
                  {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.designation}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-canvas-muted">
                {t('workspaceAdmin.registry.create.relationship')}
                <select
                  className="input-base mt-1 min-h-11"
                  value={relationshipType}
                  onChange={(event) => setRelationshipType(event.target.value as WorkspaceRelationshipType)}
                >
                  {RELATIONSHIP_TYPES.map((type) => (
                    <option key={type} value={type}>{t(RELATIONSHIP_TYPE_KEYS[type])}</option>
                  ))}
                </select>
              </label>
            </div>

            {ownership ? (
              <fieldset>
                <legend className="text-xs font-semibold text-canvas-muted">{t('workspaceAdmin.registry.create.share')}</legend>
                <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <input
                    aria-label={t('workspaceAdmin.registry.create.shareNumerator')}
                    className="input-base min-h-11"
                    type="number"
                    min={1}
                    step={1}
                    value={shareNumerator}
                    onChange={(event) => setShareNumerator(event.target.value)}
                    required
                  />
                  <span aria-hidden="true" className="text-canvas-muted">/</span>
                  <input
                    aria-label={t('workspaceAdmin.registry.create.shareDenominator')}
                    className="input-base min-h-11"
                    type="number"
                    min={1}
                    step={1}
                    value={shareDenominator}
                    onChange={(event) => setShareDenominator(event.target.value)}
                    required
                  />
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-canvas-subtle">
                  {t('workspaceAdmin.registry.create.shareHelp')}
                </p>
              </fieldset>
            ) : null}

            <label className="block text-xs font-semibold text-canvas-muted">
              {t('workspaceAdmin.registry.evidence')}
              <input
                className="input-base mt-1 min-h-11 font-mono text-xs"
                value={evidenceReference}
                onChange={(event) => setEvidenceReference(event.target.value)}
                minLength={3}
                maxLength={255}
                required
                placeholder="registry:internal-reference"
              />
            </label>
            <p className="text-[11px] leading-relaxed text-canvas-subtle">{t('workspaceAdmin.registry.evidenceHelp')}</p>
            <NoticeBox notice={notice} securityLabel={t('workspaceAdmin.registry.securityConfirmation')} />
            <button type="submit" disabled={pending || units.length === 0} className="btn-primary min-h-11 w-full px-4">
              {pending ? t('workspaceAdmin.registry.create.saving') : t('workspaceAdmin.registry.create.submit')}
            </button>
          </form>

          <div>
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <h3 className="font-semibold text-canvas-ink">{t('workspaceAdmin.registry.list.title')}</h3>
                <p className="mt-1 text-xs text-canvas-muted">{t('workspaceAdmin.registry.list.description')}</p>
              </div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-canvas-line bg-canvas-fog px-2.5 py-1 text-xs font-semibold text-canvas-ink">
                <History className="h-3.5 w-3.5" aria-hidden="true" />
                {relationships.length}
              </span>
            </div>
            <div className="mt-3 grid max-h-[48rem] gap-3 overflow-y-auto pr-1 lg:grid-cols-2">
              {relationships.length ? relationships.map((relationship) => (
                <RelationshipCard
                  key={`${relationship.relationshipKind}:${relationship.relationshipId}`}
                  relationship={relationship}
                  workspaceId={workspaceId}
                  onChanged={() => router.refresh()}
                />
              )) : (
                <div className="rounded-2xl border border-dashed border-canvas-line bg-canvas-fog px-4 py-8 text-center lg:col-span-2">
                  <Check className="mx-auto h-5 w-5 text-brand-700" aria-hidden="true" />
                  <p className="mt-2 text-sm font-semibold text-canvas-ink">{t('workspaceAdmin.registry.list.empty')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {permissions.canSuspendMemberships ? (
        <div className="mt-6 border-t border-canvas-line pt-5">
          <h3 className="font-semibold text-canvas-ink">{t('workspaceAdmin.registry.membership.title')}</h3>
          <p className="mt-1 text-xs leading-relaxed text-canvas-muted">{t('workspaceAdmin.registry.membership.description')}</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {members.length ? members.map((member) => (
              <MembershipLifecycleCard
                key={`${member.membershipId}:${member.status}`}
                member={member}
                workspaceId={workspaceId}
                onChanged={() => router.refresh()}
              />
            )) : (
              <p className="rounded-xl bg-canvas-fog px-3 py-4 text-sm text-canvas-muted lg:col-span-2">
                {t('workspaceAdmin.registry.membership.empty')}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
