'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { FormEvent, useRef, useState } from 'react';
import {
  Building2,
  Check,
  Clipboard,
  Clock3,
  Home,
  KeyRound,
  MailPlus,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react';
import {
  createWorkspaceUnit,
  grantWorkspaceRole,
  issueWorkspaceMembershipInvitation,
  issueWorkspaceStaffInvitation,
  revokeWorkspaceMembershipInvitation,
  reviewWorkspaceJoinRequest,
  revokeWorkspaceRole,
  type AssignableWorkspaceRole,
  type JoinReviewDecision,
  type WorkspaceAdminActionResult,
  type WorkspaceAdminInvitation,
  type WorkspaceAdminRoleAssignment,
  type WorkspaceAdminSnapshot,
  type WorkspaceAdminUnit,
  type WorkspaceJoinRequest,
  type WorkspaceRelationshipType,
  type WorkspaceUnitCategory,
} from '@/app/actions/workspace-admin';
import { useI18n } from '@/src/i18n/useI18n';
import WorkspaceRelationshipRegistry from '@/components/workspace-relationship-registry';
import WorkspaceUnitBulkImport from '@/components/workspace-unit-bulk-import';

interface WorkspaceAdminClientProps {
  initialSnapshot: WorkspaceAdminSnapshot;
}

type Notice = {
  tone: 'success' | 'error' | 'info';
  message: string;
  href?: string;
};

type Attempt = { fingerprint: string; key: string };

const UNIT_CATEGORY_OPTIONS: Array<{ value: WorkspaceUnitCategory; label: string }> = [
  { value: 'APARTMENT', label: 'Lakás' },
  { value: 'GARAGE', label: 'Garázs / teremgarázshely' },
  { value: 'STORAGE', label: 'Tároló' },
  { value: 'COMMERCIAL', label: 'Üzlethelyiség' },
  { value: 'OTHER', label: 'Egyéb albetét' },
];

const RELATIONSHIP_OPTIONS: Array<{ value: WorkspaceRelationshipType; label: string }> = [
  { value: 'OWNER', label: 'Tulajdonos' },
  { value: 'OWNER_OCCUPANT', label: 'Tulajdonos és lakó' },
  { value: 'TENANT', label: 'Bérlő / lakó' },
  { value: 'HOUSEHOLD_MEMBER', label: 'Háztartás tagja' },
  { value: 'AUTHORIZED_OCCUPANT', label: 'Meghatalmazott használó' },
];

const ROLE_OPTIONS: Array<{ value: AssignableWorkspaceRole; label: string; help: string }> = [
  { value: 'DELEGATE_OPERATIONS', label: 'Megbízott kezelő', help: 'Csak a kijelölt operatív jogosultságokat kapja meg, továbbdelegálás nélkül.' },
  { value: 'COMMITTEE_OVERSIGHT', label: 'Bizottsági ellenőr', help: 'Ellenőrzési és audit-hozzáférés a szerepkör sablonja szerint.' },
  { value: 'ACCOUNTANT', label: 'Könyvelő', help: 'Pénzügyi feldolgozási hozzáférés a szerepkör sablonja szerint.' },
  { value: 'BILLING_ADMIN', label: 'Számlázási admin', help: 'Előfizetés- és számlázáskezelési hozzáférés.' },
];

const DELEGATE_CAPABILITY_OPTIONS = [
  { value: 'unit.read_all', label: 'Összes albetét megtekintése' },
  { value: 'member.directory.read_minimal', label: 'Minimális tagjegyzék' },
  { value: 'membership.invite', label: 'Lakók meghívása' },
  { value: 'membership.approve', label: 'Csatlakozási kérelmek kezelése' },
  { value: 'membership.suspend', label: 'Tagság felfüggesztése és lezárása' },
  { value: 'unit_relation.verify', label: 'Lakói és tulajdonosi jogviszonyok kezelése' },
  { value: 'ticket.manage_all', label: 'Hibajegyek kezelése' },
  { value: 'document.publish', label: 'Dokumentumok publikálása' },
  { value: 'announcement.publish', label: 'Közlemények publikálása' },
  { value: 'meter.manage_all', label: 'Mérőállások kezelése' },
] as const;

const STAFF_ROLE_TRANSLATION_KEYS: Record<AssignableWorkspaceRole, string> = {
  DELEGATE_OPERATIONS: 'workspaceAdmin.staff.roleDelegate',
  COMMITTEE_OVERSIGHT: 'workspaceAdmin.staff.roleCommittee',
  ACCOUNTANT: 'workspaceAdmin.staff.roleAccountant',
  BILLING_ADMIN: 'workspaceAdmin.staff.roleBilling',
};

const STAFF_CAPABILITY_TRANSLATION_KEYS: Record<(typeof DELEGATE_CAPABILITY_OPTIONS)[number]['value'], string> = {
  'unit.read_all': 'workspaceAdmin.staff.capabilityUnitRead',
  'member.directory.read_minimal': 'workspaceAdmin.staff.capabilityMemberDirectory',
  'membership.invite': 'workspaceAdmin.staff.capabilityMembershipInvite',
  'membership.approve': 'workspaceAdmin.staff.capabilityMembershipApprove',
  'membership.suspend': 'workspaceAdmin.staff.capabilityMembershipSuspend',
  'unit_relation.verify': 'workspaceAdmin.staff.capabilityUnitRelationVerify',
  'ticket.manage_all': 'workspaceAdmin.staff.capabilityTicketManage',
  'document.publish': 'workspaceAdmin.staff.capabilityDocumentPublish',
  'announcement.publish': 'workspaceAdmin.staff.capabilityAnnouncementPublish',
  'meter.manage_all': 'workspaceAdmin.staff.capabilityMeterManage',
};

function defaultInvitationExpiry(): string {
  const date = new Date(Date.now() + 7 * 86_400_000);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIsoOrEmpty(value: string): string {
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : '';
}

function formatDate(value: string | null): string {
  if (!value) return 'Nincs lejárat';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Ismeretlen időpont';
  return new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function relationshipLabel(value: string): string {
  return RELATIONSHIP_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function roleLabel(value: string): string {
  return ROLE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function noticeFromResult(result: WorkspaceAdminActionResult<unknown>, successMessage: string): Notice {
  if (result.success) return { tone: 'success', message: successMessage };
  return {
    tone: 'error',
    message: result.error ?? 'A művelet most nem sikerült.',
    href: result.mfaRequired ? result.stepUpHref : undefined,
  };
}

function NoticeBox({ notice }: { notice: Notice | null }) {
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
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${palette}`}
    >
      <span>{notice.message}</span>
      {notice.href ? (
        <Link href={notice.href as Route} className="ml-2 inline-flex font-semibold underline underline-offset-2">
          Biztonsági megerősítés
        </Link>
      ) : null}
    </div>
  );
}

function Panel({
  icon,
  eyebrow,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-canvas-line bg-white p-5 shadow-card-md sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-canvas-sage text-brand-800 ring-1 ring-brand-100">
          {icon}
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-canvas-ink">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-canvas-muted">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MembershipInvitationCard({
  invitation,
  units,
  workspaceId,
  onChanged,
}: {
  invitation: WorkspaceAdminInvitation;
  units: WorkspaceAdminUnit[];
  workspaceId: string;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const attempt = useRef<Attempt | null>(null);

  async function revoke(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const payload = { workspaceId, invitationId: invitation.id, reason: reason.trim() };
    const fingerprint = JSON.stringify(payload);
    if (attempt.current?.fingerprint !== fingerprint) {
      attempt.current = { fingerprint, key: window.crypto.randomUUID() };
    }
    setPending(true);
    const result = await revokeWorkspaceMembershipInvitation({ ...payload, idempotencyKey: attempt.current.key });
    setPending(false);
    setNotice(noticeFromResult(result, t('workspaceAdmin.invitation.revokeSuccess')));
    if (result.success) {
      attempt.current = null;
      setReason('');
      onChanged();
    }
  }

  return (
    <li className="rounded-xl bg-canvas-fog px-3 py-2 text-xs">
      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
        <span className="font-medium text-canvas-ink">
          {invitation.email} · {units.find((unit) => unit.id === invitation.unitId)?.designation ?? t('workspaceAdmin.invitation.unitFallback')}
        </span>
        <span className="text-canvas-muted">{invitation.status} · {formatDate(invitation.expiresAt)}</span>
      </div>
      {invitation.status === 'PENDING' ? (
        <form onSubmit={revoke} className="mt-2 grid gap-2 border-t border-canvas-line pt-2 sm:grid-cols-[1fr_auto]">
          <label className="sr-only" htmlFor={`revoke-invitation-${invitation.id}`}>
            {t('workspaceAdmin.invitation.revokeReason')}
          </label>
          <input
            id={`revoke-invitation-${invitation.id}`}
            className="input-base min-h-10"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={3}
            maxLength={500}
            required
            placeholder={t('workspaceAdmin.invitation.revokeReason')}
          />
          <button type="submit" disabled={pending} className="btn-secondary min-h-10 px-3 text-xs">
            {pending ? t('workspaceAdmin.invitation.revoking') : t('workspaceAdmin.invitation.revoke')}
          </button>
          <div className="sm:col-span-2"><NoticeBox notice={notice} /></div>
        </form>
      ) : null}
    </li>
  );
}

function JoinRequestReviewCard({
  request,
  units,
  workspaceId,
  onChanged,
}: {
  request: WorkspaceJoinRequest;
  units: WorkspaceAdminUnit[];
  workspaceId: string;
  onChanged: () => void;
}) {
  const [decision, setDecision] = useState<JoinReviewDecision>('APPROVE');
  const [reason, setReason] = useState('');
  const [offeredUnitId, setOfferedUnitId] = useState(request.unitId);
  const [offeredRelationshipType, setOfferedRelationshipType] = useState<WorkspaceRelationshipType>(request.relationshipType);
  const [offeredShareNumerator, setOfferedShareNumerator] = useState(
    request.shareNumerator == null ? '' : String(request.shareNumerator),
  );
  const [offeredShareDenominator, setOfferedShareDenominator] = useState(
    request.shareDenominator == null ? '' : String(request.shareDenominator),
  );
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const attempt = useRef<Attempt | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const offeredOwnership = offeredRelationshipType === 'OWNER' || offeredRelationshipType === 'OWNER_OCCUPANT';
    const payload = {
      workspaceId,
      requestId: request.id,
      decision,
      offeredUnitId,
      offeredRelationshipType,
      offeredShareNumerator: decision === 'COUNTER_OFFER' && offeredOwnership ? Number(offeredShareNumerator) : null,
      offeredShareDenominator: decision === 'COUNTER_OFFER' && offeredOwnership ? Number(offeredShareDenominator) : null,
      reason: reason.trim(),
    };
    const fingerprint = JSON.stringify(payload);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: window.crypto.randomUUID() };
    setPending(true);
    const result = await reviewWorkspaceJoinRequest({ ...payload, idempotencyKey: attempt.current.key });
    setPending(false);
    setNotice(noticeFromResult(result, 'A csatlakozási kérelmet feldolgoztuk.'));
    if (result.success) {
      attempt.current = null;
      onChanged();
    }
  }

  return (
    <article className="rounded-2xl border border-canvas-line bg-canvas-fog/55 p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3 className="font-semibold text-canvas-ink">{request.requesterDisplayName}</h3>
          <p className="mt-1 text-sm text-canvas-muted">
            {request.unitDesignation} · {relationshipLabel(request.relationshipType)}
            {request.shareNumerator && request.shareDenominator ? ` · ${request.shareNumerator}/${request.shareDenominator}` : ''}
          </p>
          <p className="mt-1 text-xs text-canvas-subtle">Beküldve: {formatDate(request.submittedAt)}</p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
          {request.status === 'NEEDS_EVIDENCE' ? 'Egyeztetés alatt' : 'Jóváhagyásra vár'}
        </span>
      </div>

      {request.latestOfferId ? (
        <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-900">
          Legutóbbi ellenajánlat: {relationshipLabel(request.latestOfferRelationshipType ?? '')}
          {request.latestOfferUnitId ? ` · ${units.find((unit) => unit.id === request.latestOfferUnitId)?.designation ?? 'másik albetét'}` : ''}.
          {request.latestOfferShareNumerator && request.latestOfferShareDenominator
            ? ` Tulajdoni hányad: ${request.latestOfferShareNumerator}/${request.latestOfferShareDenominator}.`
            : ''}
          A lakónak kell elfogadnia, mielőtt a kérelem újra jóváhagyható.
        </p>
      ) : null}

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-canvas-muted">
            Döntés
            <select className="input-base mt-1 min-h-11" value={decision} onChange={(event) => setDecision(event.target.value as JoinReviewDecision)}>
              <option value="APPROVE">Jóváhagyás</option>
              <option value="COUNTER_OFFER">Ellenajánlat</option>
              <option value="NEEDS_EVIDENCE">További igazolás szükséges</option>
              <option value="REJECT">Elutasítás</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-canvas-muted">
            Indoklás {decision === 'APPROVE' ? '(opcionális)' : ''}
            <input
              className="input-base mt-1 min-h-11"
              value={reason}
              maxLength={1000}
              required={decision === 'REJECT' || decision === 'NEEDS_EVIDENCE'}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Rövid, tárgyszerű visszajelzés"
            />
          </label>
        </div>

        {decision === 'COUNTER_OFFER' ? (
          <div className="grid gap-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-sky-950">
              Felajánlott albetét
              <select className="input-base mt-1 min-h-11" value={offeredUnitId} onChange={(event) => setOfferedUnitId(event.target.value)} required>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.designation}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-sky-950">
              Felajánlott jogviszony
              <select className="input-base mt-1 min-h-11" value={offeredRelationshipType} onChange={(event) => setOfferedRelationshipType(event.target.value as WorkspaceRelationshipType)} required>
                {RELATIONSHIP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {(offeredRelationshipType === 'OWNER' || offeredRelationshipType === 'OWNER_OCCUPANT') ? (
              <fieldset className="sm:col-span-2">
                <legend className="text-xs font-semibold text-sky-950">Pontos tulajdoni hányad</legend>
                <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <input aria-label="Tulajdoni hányad számlálója" className="input-base min-h-11" type="number" min={1} step={1} value={offeredShareNumerator} onChange={(event) => setOfferedShareNumerator(event.target.value)} required />
                  <span aria-hidden="true" className="text-canvas-muted">/</span>
                  <input aria-label="Tulajdoni hányad nevezője" className="input-base min-h-11" type="number" min={1} step={1} value={offeredShareDenominator} onChange={(event) => setOfferedShareDenominator(event.target.value)} required />
                </div>
                <p className="mt-1 text-[11px] text-canvas-subtle">Nem becslés: a nyilvántartásban szereplő pontos törtet add meg.</p>
              </fieldset>
            ) : null}
          </div>
        ) : null}

        <NoticeBox notice={notice} />
        <button type="submit" disabled={pending} className="btn-primary min-h-11 px-4">
          {pending ? 'Biztonságos feldolgozás…' : 'Döntés mentése'}
        </button>
      </form>
    </article>
  );
}

function RoleAssignmentCard({
  assignment,
  workspaceId,
  onChanged,
}: {
  assignment: WorkspaceAdminRoleAssignment;
  workspaceId: string;
  onChanged: () => void;
}) {
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const attempt = useRef<Attempt | null>(null);

  async function revoke(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const payload = { workspaceId, roleAssignmentId: assignment.id, reason: reason.trim() };
    const fingerprint = JSON.stringify(payload);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: window.crypto.randomUUID() };
    setPending(true);
    const result = await revokeWorkspaceRole({ ...payload, idempotencyKey: attempt.current.key });
    setPending(false);
    setNotice(noticeFromResult(result, 'A szerepkört visszavontuk.'));
    if (result.success) {
      attempt.current = null;
      onChanged();
    }
  }

  return (
    <article className="rounded-xl border border-canvas-line bg-canvas-fog/55 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-canvas-ink">{roleLabel(assignment.roleKey)}</p>
          <p className="mt-0.5 text-xs text-canvas-muted">
            {assignment.displayName}{assignment.primaryUnitDesignation ? ` · ${assignment.primaryUnitDesignation}` : ''}
          </p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800">
          {assignment.validTo ? `Lejár: ${formatDate(assignment.validTo)}` : 'Visszavonásig aktív'}
        </span>
      </div>
      <form onSubmit={revoke} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          className="input-base min-h-10 flex-1"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          minLength={3}
          maxLength={1000}
          required
          placeholder="Visszavonás indoka"
        />
        <button type="submit" disabled={pending} className="min-h-10 rounded-xl border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-800 transition-colors hover:bg-rose-50 disabled:opacity-50">
          {pending ? 'Visszavonás…' : 'Szerepkör visszavonása'}
        </button>
      </form>
      <div className="mt-2"><NoticeBox notice={notice} /></div>
    </article>
  );
}

export default function WorkspaceAdminClient({ initialSnapshot }: WorkspaceAdminClientProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { workspaceId, permissions, units } = initialSnapshot;
  const activeMembers = initialSnapshot.members.filter((member) => member.status === 'ACTIVE');
  const attempts = useRef<Record<string, Attempt>>({});

  const [unitDesignation, setUnitDesignation] = useState('');
  const [unitCategory, setUnitCategory] = useState<WorkspaceUnitCategory>('APARTMENT');
  const [parentUnitId, setParentUnitId] = useState('');
  const [unitPending, setUnitPending] = useState(false);
  const [unitNotice, setUnitNotice] = useState<Notice | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUnitId, setInviteUnitId] = useState(units[0]?.id ?? '');
  const [inviteRelationship, setInviteRelationship] = useState<WorkspaceRelationshipType>('TENANT');
  const [inviteShareNumerator, setInviteShareNumerator] = useState('');
  const [inviteShareDenominator, setInviteShareDenominator] = useState('');
  const [inviteExpiry, setInviteExpiry] = useState(defaultInvitationExpiry());
  const [invitePending, setInvitePending] = useState(false);
  const [inviteNotice, setInviteNotice] = useState<Notice | null>(null);
  const [invitationUrl, setInvitationUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const [staffEmail, setStaffEmail] = useState('');
  const [staffRoleKey, setStaffRoleKey] = useState<AssignableWorkspaceRole>('DELEGATE_OPERATIONS');
  const [staffCapabilities, setStaffCapabilities] = useState<string[]>([]);
  const [staffInviteExpiry, setStaffInviteExpiry] = useState(defaultInvitationExpiry());
  const [staffValidTo, setStaffValidTo] = useState('');
  const [staffPending, setStaffPending] = useState(false);
  const [staffNotice, setStaffNotice] = useState<Notice | null>(null);
  const [staffInvitationUrl, setStaffInvitationUrl] = useState('');
  const [staffCopied, setStaffCopied] = useState(false);

  const [roleProfileId, setRoleProfileId] = useState(activeMembers[0]?.profileId ?? '');
  const [roleKey, setRoleKey] = useState<AssignableWorkspaceRole>('DELEGATE_OPERATIONS');
  const [roleCapabilities, setRoleCapabilities] = useState<string[]>([]);
  const [roleValidTo, setRoleValidTo] = useState('');
  const [rolePending, setRolePending] = useState(false);
  const [roleNotice, setRoleNotice] = useState<Notice | null>(null);

  function attemptKey(scope: string, fingerprint: string): string {
    const current = attempts.current[scope];
    if (!current || current.fingerprint !== fingerprint) {
      attempts.current[scope] = { fingerprint, key: window.crypto.randomUUID() };
    }
    return attempts.current[scope].key;
  }

  function clearAttempt(scope: string) {
    delete attempts.current[scope];
  }

  function refresh() {
    router.refresh();
  }

  async function submitUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUnitNotice(null);
    const payload = { workspaceId, designation: unitDesignation.trim(), category: unitCategory, parentUnitId: parentUnitId || null };
    setUnitPending(true);
    const result = await createWorkspaceUnit({ ...payload, idempotencyKey: attemptKey('unit', JSON.stringify(payload)) });
    setUnitPending(false);
    setUnitNotice(noticeFromResult(result, 'Az albetétet létrehoztuk.'));
    if (result.success) {
      clearAttempt('unit');
      setUnitDesignation('');
      setParentUnitId('');
      refresh();
    }
  }

  async function submitInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteNotice(null);
    setInvitationUrl('');
    const payload = {
      workspaceId,
      email: inviteEmail.trim(),
      unitId: inviteUnitId,
      relationshipType: inviteRelationship,
      shareNumerator: inviteRelationship === 'OWNER' || inviteRelationship === 'OWNER_OCCUPANT'
        ? Number(inviteShareNumerator)
        : null,
      shareDenominator: inviteRelationship === 'OWNER' || inviteRelationship === 'OWNER_OCCUPANT'
        ? Number(inviteShareDenominator)
        : null,
      expiresAt: toIsoOrEmpty(inviteExpiry),
    };
    setInvitePending(true);
    const result = await issueWorkspaceMembershipInvitation({ ...payload, idempotencyKey: attemptKey('invitation', JSON.stringify(payload)) });
    setInvitePending(false);
    if (result.success && result.data) {
      clearAttempt('invitation');
      setInviteEmail('');
      setInviteShareNumerator('');
      setInviteShareDenominator('');
      if (result.data.token) {
        setInvitationUrl(`${window.location.origin}/invitations/${encodeURIComponent(result.data.token)}`);
        setInviteNotice({ tone: 'success', message: 'A meghívás elkészült. A hivatkozás csak most látható; másold ki és biztonságos csatornán küldd el.' });
      } else {
        setInviteNotice({ tone: 'info', message: 'A meghívás már korábban létrejött ezzel a kéréssel. Biztonsági okból a token nem kérhető le újra.' });
      }
      refresh();
    } else {
      setInviteNotice(noticeFromResult(result, 'A meghívás elkészült.'));
    }
  }

  async function copyInvitation() {
    if (!invitationUrl) return;
    await navigator.clipboard.writeText(invitationUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function toggleStaffCapability(capability: string) {
    setStaffCapabilities((current) => {
      if (current.includes(capability)) {
        if (
          capability === 'member.directory.read_minimal'
          && current.some((item) => item === 'membership.suspend' || item === 'unit_relation.verify')
        ) return current;
        return current.filter((item) => item !== capability);
      }
      const next = new Set([...current, capability]);
      if (capability === 'membership.suspend' || capability === 'unit_relation.verify') {
        next.add('member.directory.read_minimal');
      }
      return Array.from(next);
    });
  }

  async function submitStaffInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStaffNotice(null);
    setStaffInvitationUrl('');
    const payload = {
      workspaceId,
      email: staffEmail.trim(),
      roleKey: staffRoleKey,
      capabilityKeys: staffRoleKey === 'DELEGATE_OPERATIONS' ? staffCapabilities : [],
      expiresAt: toIsoOrEmpty(staffInviteExpiry),
      validTo: staffValidTo ? toIsoOrEmpty(staffValidTo) : null,
    };
    setStaffPending(true);
    const result = await issueWorkspaceStaffInvitation({
      ...payload,
      idempotencyKey: attemptKey('staff-invitation', JSON.stringify(payload)),
    });
    setStaffPending(false);

    if (result.success && result.data) {
      clearAttempt('staff-invitation');
      setStaffEmail('');
      if (result.data.token) {
        setStaffInvitationUrl(`${window.location.origin}/invitations/${encodeURIComponent(result.data.token)}`);
        setStaffNotice({ tone: 'success', message: t('workspaceAdmin.staff.created') });
      } else {
        setStaffNotice({ tone: 'info', message: t('workspaceAdmin.staff.idempotentReplay') });
      }
      refresh();
    } else {
      setStaffNotice(noticeFromResult(result, t('workspaceAdmin.staff.created')));
    }
  }

  async function copyStaffInvitation() {
    if (!staffInvitationUrl) return;
    await navigator.clipboard.writeText(staffInvitationUrl);
    setStaffCopied(true);
    window.setTimeout(() => setStaffCopied(false), 1800);
  }

  function toggleCapability(capability: string) {
    setRoleCapabilities((current) => {
      if (current.includes(capability)) {
        if (
          capability === 'member.directory.read_minimal'
          && current.some((item) => item === 'membership.suspend' || item === 'unit_relation.verify')
        ) return current;
        return current.filter((item) => item !== capability);
      }
      const next = new Set([...current, capability]);
      if (capability === 'membership.suspend' || capability === 'unit_relation.verify') {
        next.add('member.directory.read_minimal');
      }
      return Array.from(next);
    });
  }

  async function submitRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRoleNotice(null);
    const payload = {
      workspaceId,
      profileId: roleProfileId,
      roleKey,
      capabilityKeys: roleKey === 'DELEGATE_OPERATIONS' ? roleCapabilities : [],
      validTo: roleValidTo ? toIsoOrEmpty(roleValidTo) : null,
    };
    setRolePending(true);
    const result = await grantWorkspaceRole({ ...payload, idempotencyKey: attemptKey('role', JSON.stringify(payload)) });
    setRolePending(false);
    setRoleNotice(noticeFromResult(result, 'A korlátozott szerepkört hozzárendeltük.'));
    if (result.success) {
      clearAttempt('role');
      setRoleCapabilities([]);
      refresh();
    }
  }

  return (
    <main className="app-surface min-h-screen px-4 py-7 sm:px-6 sm:py-9" style={{ backgroundImage: 'none' }}>
      <div className="mx-auto max-w-7xl">
        <header className="relative overflow-hidden rounded-[1.75rem] border border-canvas-line bg-white px-5 py-6 shadow-card-md sm:px-7">
          <div aria-hidden="true" className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-brand-100/60 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Lakóközösségi adminisztráció</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-canvas-ink">{initialSnapshot.workspaceName}</h1>
              <p className="mt-2 flex items-center gap-2 text-sm text-canvas-muted">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                {initialSnapshot.address}
              </p>
            </div>
            <div className="max-w-xl rounded-2xl border border-brand-100 bg-canvas-sage px-4 py-3">
              <p className="flex gap-2 text-sm leading-relaxed text-brand-950">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                A jogosultságok szerveroldalon, a workspace és az érintett albetét alapján kerülnek ellenőrzésre. A magas kockázatú műveletek friss MFA-megerősítést kérhetnek.
              </p>
            </div>
          </div>
        </header>

        <section aria-label="Kezelői összesítés" className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: <Home className="h-4 w-4" />, label: 'Aktív albetét', value: units.length },
            { icon: <MailPlus className="h-4 w-4" />, label: 'Függő meghívás', value: initialSnapshot.invitations.filter((item) => item.status === 'PENDING').length },
            { icon: <Users className="h-4 w-4" />, label: 'Nyitott csatlakozás', value: initialSnapshot.joinRequests.length },
            {
              icon: <UserCog className="h-4 w-4" />,
              label: t('workspaceAdmin.staff.summary'),
              value: initialSnapshot.roleAssignments.length
                + initialSnapshot.staffInvitations.filter((item) => item.status === 'PENDING').length,
            },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-canvas-line bg-white px-4 py-4 shadow-card">
              <p className="flex items-center gap-2 text-xs font-semibold text-canvas-muted">{item.icon}{item.label}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-canvas-ink">{item.value}</p>
            </div>
          ))}
        </section>

        <WorkspaceRelationshipRegistry snapshot={initialSnapshot} />

        <div className="mt-5 grid items-start gap-5 xl:grid-cols-2">
          {permissions.canManageUnits ? (
            <Panel
              icon={<Home className="h-5 w-5" aria-hidden="true" />}
              eyebrow="Épületstruktúra"
              title="Új albetét"
              description="A lakás, garázs, tároló és üzlethelyiség külön UUID-t kap. A kiegészítő albetét egy fő albetéthez kapcsolható."
            >
              <form onSubmit={submitUnit} className="space-y-3">
                <label className="block text-xs font-semibold text-canvas-muted">
                  Albetét megnevezése
                  <input className="input-base mt-1 min-h-11" value={unitDesignation} onChange={(event) => setUnitDesignation(event.target.value)} maxLength={120} required placeholder="Például: A lépcsőház, 2/8" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-canvas-muted">
                    Kategória
                    <select className="input-base mt-1 min-h-11" value={unitCategory} onChange={(event) => setUnitCategory(event.target.value as WorkspaceUnitCategory)}>
                      {UNIT_CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-canvas-muted">
                    Kapcsolt fő albetét (opcionális)
                    <select className="input-base mt-1 min-h-11" value={parentUnitId} onChange={(event) => setParentUnitId(event.target.value)}>
                      <option value="">Önálló albetét</option>
                      {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.designation}</option>)}
                    </select>
                  </label>
                </div>
                <NoticeBox notice={unitNotice} />
                <button type="submit" disabled={unitPending} className="btn-primary min-h-11 px-4">
                  {unitPending ? 'Albetét rögzítése…' : 'Albetét létrehozása'}
                </button>
              </form>

              <div className="mt-5 border-t border-canvas-line pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-canvas-subtle">Aktív albetétek</p>
                <div className="mt-2 flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1">
                  {units.length ? units.map((unit) => (
                    <span key={unit.id} className="rounded-full border border-canvas-line bg-canvas-fog px-3 py-1.5 text-xs font-medium text-canvas-ink">
                      {unit.designation} · {UNIT_CATEGORY_OPTIONS.find((item) => item.value === unit.category)?.label ?? unit.category}
                    </span>
                  )) : <p className="text-sm text-canvas-muted">Még nincs aktív albetét.</p>}
                </div>
              </div>
              <WorkspaceUnitBulkImport workspaceId={workspaceId} />
            </Panel>
          ) : null}

          {permissions.canInviteMembers ? (
            <Panel
              icon={<MailPlus className="h-5 w-5" aria-hidden="true" />}
              eyebrow="Lakói hozzáférés"
              title="Meghívás albetéthez"
              description="A meghívott csak a címzett e-maillel és az érvényes, egyszer használható hivatkozással aktiválhat tagságot."
            >
              {units.length === 0 ? (
                <NoticeBox notice={{ tone: 'info', message: 'Meghívás előtt legalább egy aktív albetétet létre kell hozni.' }} />
              ) : (
                <form onSubmit={submitInvitation} className="space-y-3">
                  <label className="block text-xs font-semibold text-canvas-muted">
                    Meghívott e-mail-címe
                    <input className="input-base mt-1 min-h-11" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} maxLength={254} required placeholder="lako@example.hu" />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-canvas-muted">
                      Albetét
                      <select className="input-base mt-1 min-h-11" value={inviteUnitId} onChange={(event) => setInviteUnitId(event.target.value)} required>
                        {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.designation}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-canvas-muted">
                      Jogviszony
                      <select className="input-base mt-1 min-h-11" value={inviteRelationship} onChange={(event) => setInviteRelationship(event.target.value as WorkspaceRelationshipType)}>
                        {RELATIONSHIP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                  </div>
                  {(inviteRelationship === 'OWNER' || inviteRelationship === 'OWNER_OCCUPANT') ? (
                    <fieldset>
                      <legend className="text-xs font-semibold text-canvas-muted">Pontos tulajdoni hányad</legend>
                      <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <input aria-label="Tulajdoni hányad számlálója" className="input-base min-h-11" type="number" min={1} step={1} value={inviteShareNumerator} onChange={(event) => setInviteShareNumerator(event.target.value)} required />
                        <span aria-hidden="true" className="text-canvas-muted">/</span>
                        <input aria-label="Tulajdoni hányad nevezője" className="input-base min-h-11" type="number" min={1} step={1} value={inviteShareDenominator} onChange={(event) => setInviteShareDenominator(event.target.value)} required />
                      </div>
                      <p className="mt-1 text-[11px] text-canvas-subtle">A rendszer ellenőrzi, hogy az igazolt tulajdoni hányadok összege ne haladja meg az 1/1-et.</p>
                    </fieldset>
                  ) : null}
                  <label className="block text-xs font-semibold text-canvas-muted">
                    Lejárat
                    <input className="input-base mt-1 min-h-11" type="datetime-local" value={inviteExpiry} onChange={(event) => setInviteExpiry(event.target.value)} required />
                  </label>
                  <NoticeBox notice={inviteNotice} />
                  {invitationUrl ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <label className="block text-xs font-semibold text-emerald-900">
                        Egyszer megjelenített meghívólink
                        <input className="input-base mt-1 font-mono text-xs" readOnly value={invitationUrl} />
                      </label>
                      <button type="button" onClick={() => void copyInvitation()} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-100">
                        {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                        {copied ? 'Kimásolva' : 'Link másolása'}
                      </button>
                    </div>
                  ) : null}
                  <button type="submit" disabled={invitePending} className="btn-primary min-h-11 px-4">
                    {invitePending ? 'Meghívás létrehozása…' : 'Biztonságos meghívó készítése'}
                  </button>
                </form>
              )}

              {initialSnapshot.invitations.length ? (
                <div className="mt-5 border-t border-canvas-line pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-canvas-subtle">Legutóbbi meghívások</p>
                  <ul className="mt-2 space-y-2">
                    {initialSnapshot.invitations.slice(0, 6).map((invitation) => (
                      <MembershipInvitationCard
                        key={invitation.id}
                        invitation={invitation}
                        units={units}
                        workspaceId={workspaceId}
                        onChanged={refresh}
                      />
                    ))}
                  </ul>
                </div>
              ) : null}
            </Panel>
          ) : null}

          {permissions.canReviewMemberships ? (
            <div className="xl:col-span-2">
              <Panel
                icon={<Users className="h-5 w-5" aria-hidden="true" />}
                eyebrow="Ellenőrzött belépés"
                title="Csatlakozási kérelmek"
                description="Jóváhagyhatsz, indoklással elutasíthatsz, igazolást kérhetsz, vagy módosított albetétet és jogviszonyt ajánlhatsz fel. Saját kérelem nem hagyható jóvá."
              >
                <div className="grid gap-3 lg:grid-cols-2">
                  {initialSnapshot.joinRequests.length ? initialSnapshot.joinRequests.map((request) => (
                    <JoinRequestReviewCard key={request.id} request={request} units={units} workspaceId={workspaceId} onChanged={refresh} />
                  )) : (
                    <div className="lg:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center">
                      <Check className="mx-auto h-5 w-5 text-emerald-700" aria-hidden="true" />
                      <p className="mt-2 text-sm font-semibold text-emerald-900">Nincs feldolgozásra váró csatlakozási kérelem.</p>
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          ) : null}

          {permissions.canGrantLimitedRoles ? (
            <div className="xl:col-span-2">
              <Panel
                icon={<KeyRound className="h-5 w-5" aria-hidden="true" />}
                eyebrow="Szerepkörök és delegáció"
                title="Korlátozott kezelői hozzáférés"
                description="Csak aktív közösségi tag kaphat szerepkört. Megbízott esetén a jogosultságok szűkíthetők; adminjog és továbbdelegálás itt nem adható."
              >
                <section aria-labelledby="staff-invitation-title" className="rounded-2xl border border-brand-100 bg-canvas-sage/70 p-4 sm:p-5">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
                        {t('workspaceAdmin.staff.eyebrow')}
                      </p>
                      <h3 id="staff-invitation-title" className="mt-1 text-base font-semibold text-canvas-ink">
                        {t('workspaceAdmin.staff.title')}
                      </h3>
                      <p className="mt-1 max-w-3xl text-xs leading-relaxed text-canvas-muted">
                        {t('workspaceAdmin.staff.description')}
                      </p>
                    </div>
                    <span className="inline-flex w-fit items-center gap-1 rounded-full border border-brand-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-900">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('workspaceAdmin.staff.noAdminBadge')}
                    </span>
                  </div>

                  <form onSubmit={submitStaffInvitation} className="mt-4 space-y-4">
                    <div className="grid gap-3 lg:grid-cols-2">
                      <label className="text-xs font-semibold text-canvas-muted">
                        {t('workspaceAdmin.staff.email')}
                        <input
                          className="input-base mt-1 min-h-11"
                          type="email"
                          value={staffEmail}
                          onChange={(event) => setStaffEmail(event.target.value)}
                          maxLength={254}
                          autoComplete="email"
                          required
                          placeholder="staff@example.hu"
                        />
                      </label>
                      <label className="text-xs font-semibold text-canvas-muted">
                        {t('workspaceAdmin.staff.role')}
                        <select
                          className="input-base mt-1 min-h-11"
                          value={staffRoleKey}
                          onChange={(event) => {
                            setStaffRoleKey(event.target.value as AssignableWorkspaceRole);
                            setStaffCapabilities([]);
                          }}
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {t(STAFF_ROLE_TRANSLATION_KEYS[option.value])}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-canvas-muted">
                        {t('workspaceAdmin.staff.invitationExpiry')}
                        <input
                          className="input-base mt-1 min-h-11"
                          type="datetime-local"
                          value={staffInviteExpiry}
                          onChange={(event) => setStaffInviteExpiry(event.target.value)}
                          required
                        />
                      </label>
                      <label className="text-xs font-semibold text-canvas-muted">
                        {t('workspaceAdmin.staff.roleExpiry')}
                        <input
                          className="input-base mt-1 min-h-11"
                          type="datetime-local"
                          value={staffValidTo}
                          onChange={(event) => setStaffValidTo(event.target.value)}
                        />
                      </label>
                    </div>

                    {staffRoleKey === 'DELEGATE_OPERATIONS' ? (
                      <fieldset>
                        <legend className="text-xs font-semibold text-canvas-muted">
                          {t('workspaceAdmin.staff.capabilities')}
                        </legend>
                        <p className="mt-1 text-xs text-canvas-subtle">
                          {t('workspaceAdmin.staff.capabilitiesHelp')}
                        </p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {DELEGATE_CAPABILITY_OPTIONS.map((option) => (
                            <label key={option.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-canvas-line bg-white px-3 py-2 text-xs font-medium text-canvas-ink">
                              <input
                                type="checkbox"
                                checked={staffCapabilities.includes(option.value)}
                                onChange={() => toggleStaffCapability(option.value)}
                                className="h-4 w-4 accent-brand-700"
                              />
                              {t(STAFF_CAPABILITY_TRANSLATION_KEYS[option.value])}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ) : null}

                    <NoticeBox notice={staffNotice} />
                    {staffInvitationUrl ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <label className="block text-xs font-semibold text-emerald-900">
                          {t('workspaceAdmin.staff.oneTimeLink')}
                          <input className="input-base mt-1 font-mono text-xs" readOnly value={staffInvitationUrl} />
                        </label>
                        <button
                          type="button"
                          onClick={() => void copyStaffInvitation()}
                          className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
                        >
                          {staffCopied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Clipboard className="h-4 w-4" aria-hidden="true" />}
                          {staffCopied ? t('workspaceAdmin.staff.copied') : t('workspaceAdmin.staff.copy')}
                        </button>
                      </div>
                    ) : null}
                    <button type="submit" disabled={staffPending} className="btn-primary min-h-11 px-4">
                      {staffPending ? t('workspaceAdmin.staff.creating') : t('workspaceAdmin.staff.create')}
                    </button>
                  </form>

                  {initialSnapshot.staffInvitations.length ? (
                    <div className="mt-5 border-t border-brand-100 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-canvas-subtle">
                        {t('workspaceAdmin.staff.recent')}
                      </p>
                      <ul className="mt-2 grid gap-2 lg:grid-cols-2">
                        {initialSnapshot.staffInvitations.slice(0, 8).map((invitation) => (
                          <li key={invitation.id} className="rounded-xl border border-canvas-line bg-white px-3 py-2 text-xs">
                            <p className="font-semibold text-canvas-ink">
                              {invitation.email} · {t(STAFF_ROLE_TRANSLATION_KEYS[invitation.roleKey])}
                            </p>
                            <p className="mt-1 text-canvas-muted">
                              {invitation.status} · {formatDate(invitation.expiresAt)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>

                <div className="my-5 border-t border-canvas-line" />
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-canvas-subtle">
                  {t('workspaceAdmin.staff.existingMemberTitle')}
                </p>
                {activeMembers.length === 0 ? (
                  <NoticeBox notice={{ tone: 'info', message: 'Nincs kiválasztható aktív közösségi tag.' }} />
                ) : (
                  <form onSubmit={submitRole} className="space-y-4 rounded-2xl border border-canvas-line bg-canvas-fog/55 p-4">
                    <div className="grid gap-3 lg:grid-cols-3">
                      <label className="text-xs font-semibold text-canvas-muted">
                        Közösségi tag
                        <select className="input-base mt-1 min-h-11 font-mono text-xs" value={roleProfileId} onChange={(event) => setRoleProfileId(event.target.value)} required>
                          {activeMembers.map((member) => (
                            <option key={member.membershipId} value={member.profileId}>
                              {member.displayName}{member.primaryUnitDesignation ? ` · ${member.primaryUnitDesignation}` : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-canvas-muted">
                        Szerepkör
                        <select className="input-base mt-1 min-h-11" value={roleKey} onChange={(event) => { setRoleKey(event.target.value as AssignableWorkspaceRole); setRoleCapabilities([]); }}>
                          {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-canvas-muted">
                        Lejárat (opcionális)
                        <input className="input-base mt-1 min-h-11" type="datetime-local" value={roleValidTo} onChange={(event) => setRoleValidTo(event.target.value)} />
                      </label>
                    </div>
                    <p className="text-xs leading-relaxed text-canvas-muted">{ROLE_OPTIONS.find((option) => option.value === roleKey)?.help}</p>

                    {roleKey === 'DELEGATE_OPERATIONS' ? (
                      <fieldset>
                        <legend className="text-xs font-semibold text-canvas-muted">Delegált műveletek</legend>
                        <p className="mt-1 text-xs text-canvas-subtle">Ha semmit nem jelölsz, a biztonságos alapértelmezett megbízotti csomag lép életbe.</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {DELEGATE_CAPABILITY_OPTIONS.map((option) => (
                            <label key={option.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-canvas-line bg-white px-3 py-2 text-xs font-medium text-canvas-ink">
                              <input type="checkbox" checked={roleCapabilities.includes(option.value)} onChange={() => toggleCapability(option.value)} className="h-4 w-4 accent-brand-700" />
                              {option.label}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ) : null}
                    <NoticeBox notice={roleNotice} />
                    <button type="submit" disabled={rolePending} className="btn-primary min-h-11 px-4">
                      {rolePending ? 'Szerepkör ellenőrzése…' : 'Szerepkör hozzárendelése'}
                    </button>
                  </form>
                )}

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-canvas-subtle">Aktív korlátozott szerepkörök</p>
                    <span className="flex items-center gap-1 text-xs text-canvas-muted"><Clock3 className="h-3.5 w-3.5" />A lejáratot a szerver érvényesíti</span>
                  </div>
                  <div className="mt-2 grid gap-2 lg:grid-cols-2">
                    {initialSnapshot.roleAssignments.length ? initialSnapshot.roleAssignments.map((assignment) => (
                      <RoleAssignmentCard key={assignment.id} assignment={assignment} workspaceId={workspaceId} onChanged={refresh} />
                    )) : <p className="rounded-xl bg-canvas-fog px-3 py-4 text-sm text-canvas-muted lg:col-span-2">Nincs aktív, ezen a felületen kezelhető szerepkör.</p>}
                  </div>
                </div>
              </Panel>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
