'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRef, useState, type FormEvent } from 'react';
import {
  acceptAgencyStaffInvitation,
  assignAgencyToWorkspace,
  createManagementAgency,
  endAgencyPortfolioAssignment,
  getAgencyPortfolioSnapshot,
  issueAgencyStaffInvitation,
  revokeAgencyStaffMembership,
  type AgencyActionResult,
  type AgencyPortfolioSnapshot,
  type AgencyRole,
  type AssignableAgencyRole,
} from '@/app/actions/agency';
import { useI18n } from '@/src/i18n/useI18n';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  KeyRound,
  MailPlus,
  Plus,
  ShieldCheck,
  UserMinus,
  Users,
} from 'lucide-react';

export interface AgencyWorkspaceOption {
  workspaceId: string;
  workspaceName: string;
  address: string;
}

interface AgencyPortfolioClientProps {
  initialResult: AgencyActionResult<AgencyPortfolioSnapshot>;
  availableWorkspaces: AgencyWorkspaceOption[];
}

interface Notice {
  tone: 'success' | 'info' | 'error';
  message: string;
  stepUpHref?: string;
}

interface Attempt {
  fingerprint: string;
  key: string;
}

const ROLE_KEYS: Record<AgencyRole, string> = {
  AGENCY_OWNER: 'agency.roles.owner',
  AGENCY_ADMIN: 'agency.roles.admin',
  PORTFOLIO_MANAGER: 'agency.roles.portfolioManager',
  OPERATIONS: 'agency.roles.operations',
  ACCOUNTANT: 'agency.roles.accountant',
};

const ERROR_KEYS: Record<string, string> = {
  AUTH_REQUIRED: 'agency.errors.authRequired',
  MFA_STEP_UP_REQUIRED: 'agency.errors.mfaRequired',
  SYSTEM_UPDATE_REQUIRED: 'agency.errors.systemUpdate',
  AGENCY_ID_INVALID: 'agency.errors.invalidInput',
  AGENCY_INPUT_INVALID: 'agency.errors.invalidAgency',
  AGENCY_RESPONSE_INVALID: 'agency.errors.invalidResponse',
  AGENCY_ADMIN_REQUIRED: 'agency.errors.adminRequired',
  AGENCY_MEMBERSHIP_REQUIRED: 'agency.errors.membershipRequired',
  AGENCY_STAFF_INVITATION_INVALID: 'agency.errors.invalidInvitation',
  AGENCY_STAFF_INVITATION_ALREADY_PENDING: 'agency.errors.invitationPending',
  AGENCY_INVITATION_TOKEN_INVALID: 'agency.errors.invalidToken',
  AGENCY_INVITATION_EMAIL_MISMATCH: 'agency.errors.emailMismatch',
  AGENCY_INVITATION_INACTIVE: 'agency.errors.invitationInactive',
  AGENCY_PORTFOLIO_INPUT_INVALID: 'agency.errors.invalidAssignment',
  DIRECT_ADMIN_GRANT_REQUIRED: 'agency.errors.directAdminRequired',
  AGENCY_PORTFOLIO_VALIDITY_EXCEEDS_SOURCE: 'agency.errors.validityExceedsSource',
  AGENCY_PORTFOLIO_ALREADY_ASSIGNED: 'agency.errors.alreadyAssigned',
  AGENCY_STAFF_REVOCATION_INVALID: 'agency.errors.invalidRevocation',
  AGENCY_OWNER_REVOCATION_FORBIDDEN: 'agency.errors.ownerRevocationForbidden',
  AGENCY_PORTFOLIO_TERMINATION_INVALID: 'agency.errors.invalidTermination',
  AGENCY_PORTFOLIO_NOT_FOUND: 'agency.errors.assignmentNotFound',
  AGENCY_PORTFOLIO_END_AUTHORITY_REQUIRED: 'agency.errors.endAuthorityRequired',
  IDEMPOTENCY_CONFLICT: 'agency.errors.idempotencyConflict',
};

function defaultDateTimeLocal(days: number): string {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function toIso(value: string): string {
  return new Date(value).toISOString();
}

function dateLabel(value: string | null, locale: string, fallback: string): string {
  if (!value) return fallback;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return fallback;
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'hu-HU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(timestamp);
}

function roleLabel(role: AgencyRole, t: (key: string) => string): string {
  return t(ROLE_KEYS[role]);
}

function noticeFromResult(
  result: AgencyActionResult<unknown>,
  t: (key: string) => string,
  successKey: string,
): Notice {
  if (result.success) return { tone: 'success', message: t(successKey) };
  return {
    tone: 'error',
    message: t(ERROR_KEYS[result.errorCode ?? ''] ?? 'agency.errors.generic'),
    stepUpHref: result.stepUpHref,
  };
}

function NoticeBox({ notice, t }: { notice: Notice; t: (key: string) => string }) {
  const styles = notice.tone === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : notice.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-sky-200 bg-sky-50 text-sky-800';
  return (
    <div
      role={notice.tone === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles}`}
    >
      <p>{notice.message}</p>
      {notice.stepUpHref && (
        <Link href={notice.stepUpHref as Route} className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4">
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          {t('agency.actions.openSecurity')}
        </Link>
      )}
    </div>
  );
}

export function AgencyPortfolioEntryLink() {
  const { t } = useI18n();
  return (
    <Link
      href={'/agency' as Route}
      className="btn-secondary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm"
    >
      <Users className="h-4 w-4" aria-hidden="true" />
      {t('agency.entry')}
    </Link>
  );
}

export function AgencyInvitationAcceptClient({ token }: { token: string }) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function acceptInvitation() {
    setPending(true);
    setNotice(null);
    const result = await acceptAgencyStaffInvitation(token);
    setPending(false);
    if (result.success) {
      setAccepted(true);
      setNotice({ tone: 'success', message: t('agency.invitation.accepted') });
      return;
    }
    setNotice(noticeFromResult(result, t, 'agency.invitation.accepted'));
  }

  return (
    <main className="app-surface flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <section className="w-full max-w-lg rounded-[1.5rem] border border-canvas-line bg-white p-6 text-center shadow-card-lg sm:p-8" aria-labelledby="agency-invitation-title">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-canvas-sage text-brand-800 ring-1 ring-brand-100">
          {accepted
            ? <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            : <MailPlus className="h-7 w-7" aria-hidden="true" />}
        </div>
        <h1 id="agency-invitation-title" className="mt-5 text-2xl font-semibold tracking-tight text-canvas-ink">
          {accepted ? t('agency.invitation.acceptedTitle') : t('agency.invitation.title')}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-canvas-muted">
          {accepted ? t('agency.invitation.acceptedDescription') : t('agency.invitation.description')}
        </p>
        {!accepted && (
          <div className="mt-6 rounded-xl border border-brand-100 bg-canvas-sage px-4 py-3 text-left text-sm leading-relaxed text-brand-950">
            <p className="flex gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {t('agency.invitation.security')}
            </p>
          </div>
        )}
        {notice && <div className="mt-5"><NoticeBox notice={notice} t={t} /></div>}
        <div className="mt-6">
          {accepted ? (
            <Link href={'/agency' as Route} className="btn-primary min-h-11 w-full">
              {t('agency.invitation.openPortfolio')}
            </Link>
          ) : (
            <button type="button" onClick={acceptInvitation} disabled={pending} className="btn-primary min-h-11 w-full disabled:opacity-60">
              {pending ? t('agency.invitation.accepting') : t('agency.invitation.accept')}
            </button>
          )}
        </div>
        <Link href={'/app' as Route} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 hover:text-brand-950">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('agency.actions.backToCommunities')}
        </Link>
      </section>
    </main>
  );
}

export default function AgencyPortfolioClient({ initialResult, availableWorkspaces }: AgencyPortfolioClientProps) {
  const { locale, t } = useI18n();
  const [snapshot, setSnapshot] = useState(initialResult.data ?? null);
  const [loadNotice, setLoadNotice] = useState<Notice | null>(initialResult.success ? null : noticeFromResult(initialResult, t, 'agency.loaded'));
  const [loading, setLoading] = useState(false);
  const attempts = useRef<Record<string, Attempt>>({});

  const [createOpen, setCreateOpen] = useState(!initialResult.data?.agencies.length);
  const [agencyName, setAgencyName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [licenseReference, setLicenseReference] = useState('');
  const [createPending, setCreatePending] = useState(false);
  const [createNotice, setCreateNotice] = useState<Notice | null>(null);

  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState<AssignableAgencyRole>('PORTFOLIO_MANAGER');
  const [staffExpiry, setStaffExpiry] = useState(defaultDateTimeLocal(7));
  const [staffPending, setStaffPending] = useState(false);
  const [staffNotice, setStaffNotice] = useState<Notice | null>(null);
  const [invitationUrl, setInvitationUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const [workspaceId, setWorkspaceId] = useState(availableWorkspaces[0]?.workspaceId ?? '');
  const [appointmentReference, setAppointmentReference] = useState('');
  const [assignmentValidTo, setAssignmentValidTo] = useState('');
  const [assignmentPending, setAssignmentPending] = useState(false);
  const [assignmentNotice, setAssignmentNotice] = useState<Notice | null>(null);
  const [staffReasons, setStaffReasons] = useState<Record<string, string>>({});
  const [assignmentReasons, setAssignmentReasons] = useState<Record<string, string>>({});
  const [operationPending, setOperationPending] = useState<string | null>(null);

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

  async function reload(agencyId?: string | null) {
    setLoading(true);
    const result = await getAgencyPortfolioSnapshot(agencyId ?? null);
    setLoading(false);
    if (result.success && result.data) {
      setSnapshot(result.data);
      setLoadNotice(null);
      return result.data;
    }
    setLoadNotice(noticeFromResult(result, t, 'agency.loaded'));
    return null;
  }

  async function selectAgency(nextAgencyId: string) {
    if (nextAgencyId === snapshot?.selectedAgencyId) return;
    await reload(nextAgencyId);
  }

  async function submitAgency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateNotice(null);
    const payload = {
      agencyName: agencyName.trim(),
      legalName: legalName.trim(),
      registrationNumber: registrationNumber.trim(),
      taxNumber: taxNumber.trim(),
      licenseReference: licenseReference.trim(),
    };
    setCreatePending(true);
    const result = await createManagementAgency({
      ...payload,
      idempotencyKey: attemptKey('create-agency', JSON.stringify(payload)),
    });
    setCreatePending(false);
    setCreateNotice(noticeFromResult(result, t, 'agency.create.success'));
    if (result.success && result.data) {
      clearAttempt('create-agency');
      setAgencyName('');
      setLegalName('');
      setRegistrationNumber('');
      setTaxNumber('');
      setLicenseReference('');
      setCreateOpen(false);
      await reload(result.data.agencyId);
    }
  }

  async function submitStaffInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot?.selectedAgencyId) return;
    setStaffNotice(null);
    setInvitationUrl('');
    const payload = {
      agencyId: snapshot.selectedAgencyId,
      email: staffEmail.trim(),
      organizationRole: staffRole,
      expiresAt: toIso(staffExpiry),
    };
    setStaffPending(true);
    const result = await issueAgencyStaffInvitation({
      ...payload,
      idempotencyKey: attemptKey('staff-invitation', JSON.stringify(payload)),
    });
    setStaffPending(false);
    if (result.success && result.data) {
      clearAttempt('staff-invitation');
      setStaffEmail('');
      if (result.data.token) {
        setInvitationUrl(`${window.location.origin}/agency/invitations/${encodeURIComponent(result.data.token)}`);
        setStaffNotice({ tone: 'success', message: t('agency.staff.invitationCreated') });
      } else {
        setStaffNotice({ tone: 'info', message: t('agency.staff.idempotentReplay') });
      }
      await reload(snapshot.selectedAgencyId);
    } else {
      setStaffNotice(noticeFromResult(result, t, 'agency.staff.invitationCreated'));
    }
  }

  async function copyInvitation() {
    if (!invitationUrl) return;
    await navigator.clipboard.writeText(invitationUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot?.selectedAgencyId) return;
    setAssignmentNotice(null);
    const payload = {
      agencyId: snapshot.selectedAgencyId,
      workspaceId,
      appointmentReference: appointmentReference.trim(),
      validTo: assignmentValidTo ? toIso(assignmentValidTo) : null,
    };
    setAssignmentPending(true);
    const result = await assignAgencyToWorkspace({
      ...payload,
      idempotencyKey: attemptKey('portfolio-assignment', JSON.stringify(payload)),
    });
    setAssignmentPending(false);
    setAssignmentNotice(noticeFromResult(result, t, 'agency.portfolio.assignmentCreated'));
    if (result.success) {
      clearAttempt('portfolio-assignment');
      setAppointmentReference('');
      setAssignmentValidTo('');
      await reload(snapshot.selectedAgencyId);
    }
  }

  async function revokeStaff(organizationMembershipId: string) {
    if (!snapshot?.selectedAgencyId) return;
    const reason = staffReasons[organizationMembershipId]?.trim() ?? '';
    const payload = { agencyId: snapshot.selectedAgencyId, organizationMembershipId, reason };
    const scope = `revoke-staff:${organizationMembershipId}`;
    setOperationPending(scope);
    const result = await revokeAgencyStaffMembership({
      ...payload,
      idempotencyKey: attemptKey(scope, JSON.stringify(payload)),
    });
    setOperationPending(null);
    setStaffNotice(noticeFromResult(result, t, 'agency.staff.revoked'));
    if (result.success) {
      clearAttempt(scope);
      setStaffReasons((current) => ({ ...current, [organizationMembershipId]: '' }));
      await reload(snapshot.selectedAgencyId);
    }
  }

  async function endAssignment(portfolioAssignmentId: string) {
    if (!snapshot?.selectedAgencyId) return;
    const reason = assignmentReasons[portfolioAssignmentId]?.trim() ?? '';
    const payload = { portfolioAssignmentId, reason };
    const scope = `end-assignment:${portfolioAssignmentId}`;
    setOperationPending(scope);
    const result = await endAgencyPortfolioAssignment({
      ...payload,
      idempotencyKey: attemptKey(scope, JSON.stringify(payload)),
    });
    setOperationPending(null);
    setAssignmentNotice(noticeFromResult(result, t, 'agency.portfolio.assignmentEnded'));
    if (result.success) {
      clearAttempt(scope);
      setAssignmentReasons((current) => ({ ...current, [portfolioAssignmentId]: '' }));
      await reload(snapshot.selectedAgencyId);
    }
  }

  const selectedAgency = snapshot?.agencies.find((agency) => agency.agencyId === snapshot.selectedAgencyId) ?? null;
  const portfolio = snapshot?.portfolio ?? [];
  const canManageAgency = snapshot?.canManageAgency ?? false;

  return (
    <main className="app-surface min-h-screen px-4 py-7 sm:px-6 sm:py-9" style={{ backgroundImage: 'none' }}>
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[1.75rem] border border-canvas-line bg-white px-5 py-6 shadow-card-md sm:px-7">
          <Link href={'/app' as Route} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 hover:text-brand-950">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('agency.actions.backToCommunities')}
          </Link>
          <div className="mt-4 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">{t('agency.eyebrow')}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-canvas-ink">{t('agency.title')}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-canvas-muted">{t('agency.subtitle')}</p>
            </div>
            <div className="max-w-xl rounded-2xl border border-brand-100 bg-canvas-sage px-4 py-3">
              <p className="flex gap-2 text-sm leading-relaxed text-brand-950">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {t('agency.securityNotice')}
              </p>
            </div>
          </div>
        </header>

        {loadNotice && <div className="mt-4"><NoticeBox notice={loadNotice} t={t} /></div>}

        <section className="mt-4 rounded-[1.5rem] border border-canvas-line bg-white p-5 shadow-card sm:p-6" aria-labelledby="agency-selection-title">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <h2 id="agency-selection-title" className="text-lg font-semibold text-canvas-ink">{t('agency.selector.title')}</h2>
              {snapshot?.agencies.length ? (
                <label className="mt-3 block max-w-xl text-sm font-medium text-canvas-ink">
                  {t('agency.selector.label')}
                  <select
                    value={snapshot.selectedAgencyId ?? ''}
                    onChange={(event) => selectAgency(event.target.value)}
                    disabled={loading}
                    className="input-field mt-1.5 min-h-11 w-full"
                  >
                    {snapshot.agencies.map((agency) => (
                      <option key={agency.agencyId} value={agency.agencyId}>{agency.agencyName}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="mt-2 text-sm text-canvas-muted">{t('agency.selector.empty')}</p>
              )}
            </div>
            <button type="button" onClick={() => setCreateOpen((current) => !current)} className="btn-secondary min-h-11 px-4">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {createOpen ? t('agency.actions.close') : t('agency.create.open')}
            </button>
          </div>

          {createOpen && (
            <form onSubmit={submitAgency} className="mt-5 border-t border-canvas-line pt-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-canvas-ink">
                  {t('agency.create.agencyName')}
                  <input value={agencyName} onChange={(event) => setAgencyName(event.target.value)} required minLength={2} maxLength={255} className="input-field mt-1.5 min-h-11 w-full" />
                </label>
                <label className="text-sm font-medium text-canvas-ink">
                  {t('agency.create.legalName')}
                  <input value={legalName} onChange={(event) => setLegalName(event.target.value)} required minLength={2} maxLength={255} className="input-field mt-1.5 min-h-11 w-full" />
                </label>
                <label className="text-sm font-medium text-canvas-ink">
                  {t('agency.create.registrationNumber')}
                  <input value={registrationNumber} onChange={(event) => setRegistrationNumber(event.target.value)} maxLength={80} className="input-field mt-1.5 min-h-11 w-full" />
                </label>
                <label className="text-sm font-medium text-canvas-ink">
                  {t('agency.create.taxNumber')}
                  <input value={taxNumber} onChange={(event) => setTaxNumber(event.target.value)} maxLength={50} className="input-field mt-1.5 min-h-11 w-full" />
                </label>
                <label className="text-sm font-medium text-canvas-ink md:col-span-2">
                  {t('agency.create.licenseReference')}
                  <input value={licenseReference} onChange={(event) => setLicenseReference(event.target.value)} maxLength={220} className="input-field mt-1.5 min-h-11 w-full" />
                </label>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-canvas-muted">{t('agency.create.noTenantAccess')}</p>
              {createNotice && <div className="mt-4"><NoticeBox notice={createNotice} t={t} /></div>}
              <button type="submit" disabled={createPending} className="btn-primary mt-4 min-h-11 px-5 disabled:opacity-60">
                {createPending ? t('agency.create.creating') : t('agency.create.submit')}
              </button>
            </form>
          )}
        </section>

        {selectedAgency && (
          <>
            <section aria-label={t('agency.summary.ariaLabel')} className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-canvas-muted">{t('agency.summary.agency')}</p>
                <p className="mt-2 text-lg font-semibold text-canvas-ink">{selectedAgency.agencyName}</p>
                <p className="mt-1 text-sm text-canvas-muted">{roleLabel(selectedAgency.organizationRole, t)}</p>
              </div>
              <div className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-canvas-muted">{t('agency.summary.staff')}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-canvas-ink">{selectedAgency.staffCount}</p>
              </div>
              <div className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-canvas-muted">{t('agency.summary.workspaces')}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-canvas-ink">{selectedAgency.workspaceCount}</p>
              </div>
            </section>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
              <section className="rounded-[1.5rem] border border-canvas-line bg-white p-5 shadow-card sm:p-6" aria-labelledby="agency-staff-title">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-canvas-sage text-brand-800 ring-1 ring-brand-100"><Users className="h-5 w-5" aria-hidden="true" /></div>
                  <div>
                    <h2 id="agency-staff-title" className="text-lg font-semibold text-canvas-ink">{t('agency.staff.title')}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-canvas-muted">{t('agency.staff.description')}</p>
                  </div>
                </div>

                {snapshot?.canManageAgency ? (
                  <>
                    <form onSubmit={submitStaffInvitation} className="mt-5 rounded-2xl border border-canvas-line bg-canvas-soft p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm font-medium text-canvas-ink sm:col-span-2">
                          {t('agency.staff.email')}
                          <input type="email" value={staffEmail} onChange={(event) => setStaffEmail(event.target.value)} required maxLength={254} className="input-field mt-1.5 min-h-11 w-full" />
                        </label>
                        <label className="text-sm font-medium text-canvas-ink">
                          {t('agency.staff.role')}
                          <select value={staffRole} onChange={(event) => setStaffRole(event.target.value as AssignableAgencyRole)} className="input-field mt-1.5 min-h-11 w-full">
                            {(['AGENCY_ADMIN', 'PORTFOLIO_MANAGER', 'OPERATIONS', 'ACCOUNTANT'] as const).map((role) => (
                              <option key={role} value={role}>{roleLabel(role, t)}</option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm font-medium text-canvas-ink">
                          {t('agency.staff.expiry')}
                          <input type="datetime-local" value={staffExpiry} onChange={(event) => setStaffExpiry(event.target.value)} required className="input-field mt-1.5 min-h-11 w-full" />
                        </label>
                      </div>
                      <button type="submit" disabled={staffPending} className="btn-primary mt-4 min-h-11 px-5 disabled:opacity-60">
                        {staffPending ? t('agency.staff.inviting') : t('agency.staff.invite')}
                      </button>
                    </form>
                    {staffNotice && <div className="mt-4"><NoticeBox notice={staffNotice} t={t} /></div>}
                    {invitationUrl && (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <label className="text-sm font-semibold text-emerald-900">
                          {t('agency.staff.oneTimeLink')}
                          <input value={invitationUrl} readOnly className="input-field mt-1.5 w-full bg-white" />
                        </label>
                        <button type="button" onClick={copyInvitation} className="btn-secondary mt-3 min-h-11 px-4">
                          <Clipboard className="h-4 w-4" aria-hidden="true" />
                          {copied ? t('agency.actions.copied') : t('agency.actions.copy')}
                        </button>
                      </div>
                    )}
                    <div className="mt-5 space-y-3">
                      {snapshot.staff.map((member) => (
                        <article key={member.organizationMembershipId} className="rounded-2xl border border-canvas-line p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate font-semibold text-canvas-ink">{member.displayName}</h3>
                              <p className="truncate text-sm text-canvas-muted">{member.email}</p>
                            </div>
                            <span className="rounded-full bg-canvas-sage px-2.5 py-1 text-xs font-semibold text-brand-900 ring-1 ring-brand-100">{roleLabel(member.organizationRole, t)}</span>
                          </div>
                          {member.organizationRole !== 'AGENCY_OWNER' && (
                            <div className="mt-4 border-t border-canvas-line pt-4">
                              <label className="text-sm font-medium text-canvas-ink">
                                {t('agency.staff.revocationReason')}
                                <input
                                  value={staffReasons[member.organizationMembershipId] ?? ''}
                                  onChange={(event) => setStaffReasons((current) => ({ ...current, [member.organizationMembershipId]: event.target.value }))}
                                  minLength={3}
                                  maxLength={1000}
                                  className="input-field mt-1.5 min-h-11 w-full"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => revokeStaff(member.organizationMembershipId)}
                                disabled={(staffReasons[member.organizationMembershipId]?.trim().length ?? 0) < 3 || operationPending === `revoke-staff:${member.organizationMembershipId}`}
                                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-800 disabled:opacity-50"
                              >
                                <UserMinus className="h-4 w-4" aria-hidden="true" />
                                {operationPending === `revoke-staff:${member.organizationMembershipId}` ? t('agency.staff.revoking') : t('agency.staff.revoke')}
                              </button>
                            </div>
                          )}
                        </article>
                      ))}
                      {snapshot.staff.length === 0 && <p className="text-sm text-canvas-muted">{t('agency.staff.empty')}</p>}
                    </div>
                  </>
                ) : (
                  <p className="mt-5 rounded-xl border border-canvas-line bg-canvas-soft px-4 py-3 text-sm leading-relaxed text-canvas-muted">{t('agency.staff.readOnly')}</p>
                )}
              </section>

              <section className="rounded-[1.5rem] border border-canvas-line bg-white p-5 shadow-card sm:p-6" aria-labelledby="agency-portfolio-title">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-canvas-warm text-amber-800 ring-1 ring-amber-100"><Building2 className="h-5 w-5" aria-hidden="true" /></div>
                  <div>
                    <h2 id="agency-portfolio-title" className="text-lg font-semibold text-canvas-ink">{t('agency.portfolio.title')}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-canvas-muted">{t('agency.portfolio.description')}</p>
                  </div>
                </div>

                {snapshot?.canManageAgency && (
                  <form onSubmit={submitAssignment} className="mt-5 rounded-2xl border border-canvas-line bg-canvas-soft p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm font-medium text-canvas-ink sm:col-span-2">
                        {t('agency.portfolio.workspace')}
                        <select value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)} required className="input-field mt-1.5 min-h-11 w-full">
                          <option value="">{t('agency.portfolio.selectWorkspace')}</option>
                          {availableWorkspaces.map((workspace) => (
                            <option key={workspace.workspaceId} value={workspace.workspaceId}>{workspace.workspaceName} — {workspace.address}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium text-canvas-ink sm:col-span-2">
                        {t('agency.portfolio.appointmentReference')}
                        <input
                          value={appointmentReference}
                          onChange={(event) => setAppointmentReference(event.target.value)}
                          required
                          maxLength={206}
                          placeholder={t('agency.portfolio.appointmentPlaceholder')}
                          className="input-field mt-1.5 min-h-11 w-full"
                        />
                      </label>
                      <label className="text-sm font-medium text-canvas-ink sm:col-span-2">
                        {t('agency.portfolio.validTo')}
                        <input type="datetime-local" value={assignmentValidTo} onChange={(event) => setAssignmentValidTo(event.target.value)} className="input-field mt-1.5 min-h-11 w-full" />
                      </label>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-canvas-muted">{t('agency.portfolio.assignmentHelp')}</p>
                    <button type="submit" disabled={assignmentPending || !workspaceId} className="btn-primary mt-4 min-h-11 px-5 disabled:opacity-60">
                      {assignmentPending ? t('agency.portfolio.assigning') : t('agency.portfolio.assign')}
                    </button>
                  </form>
                )}
                {assignmentNotice && <div className="mt-4"><NoticeBox notice={assignmentNotice} t={t} /></div>}

                <div className="mt-5 space-y-3">
                  {portfolio.map((assignment) => (
                    <article key={assignment.portfolioAssignmentId} className="rounded-2xl border border-canvas-line p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-canvas-ink">{assignment.workspaceName}</h3>
                          {assignment.formattedAddress && <p className="mt-1 text-sm text-canvas-muted">{assignment.formattedAddress}</p>}
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${assignment.assignmentStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
                          {assignment.assignmentStatus === 'ACTIVE' ? t('agency.status.active') : t('agency.status.ended')}
                        </span>
                      </div>
                      <dl className="mt-3 grid gap-2 text-sm text-canvas-muted sm:grid-cols-2">
                        <div><dt className="font-medium text-canvas-ink">{t('agency.portfolio.staffGrants')}</dt><dd>{assignment.staffGrantCount}</dd></div>
                        <div><dt className="font-medium text-canvas-ink">{t('agency.portfolio.validity')}</dt><dd>{dateLabel(assignment.validTo, locale, t('agency.portfolio.openEnded'))}</dd></div>
                      </dl>
                      <div className="mt-4 flex flex-wrap gap-3 border-t border-canvas-line pt-4">
                        <Link href={`/w/${assignment.workspaceId}` as Route} className="btn-secondary min-h-11 px-4">
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                          {t('agency.portfolio.openWorkspace')}
                        </Link>
                        {canManageAgency && assignment.assignmentStatus === 'ACTIVE' && (
                          <div className="w-full">
                            <label className="text-sm font-medium text-canvas-ink">
                              {t('agency.portfolio.endReason')}
                              <input
                                value={assignmentReasons[assignment.portfolioAssignmentId] ?? ''}
                                onChange={(event) => setAssignmentReasons((current) => ({ ...current, [assignment.portfolioAssignmentId]: event.target.value }))}
                                minLength={3}
                                maxLength={1000}
                                className="input-field mt-1.5 min-h-11 w-full"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => endAssignment(assignment.portfolioAssignmentId)}
                              disabled={(assignmentReasons[assignment.portfolioAssignmentId]?.trim().length ?? 0) < 3 || operationPending === `end-assignment:${assignment.portfolioAssignmentId}`}
                              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-800 disabled:opacity-50"
                            >
                              {operationPending === `end-assignment:${assignment.portfolioAssignmentId}` ? t('agency.portfolio.ending') : t('agency.portfolio.end')}
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                  {portfolio.length === 0 && <p className="text-sm text-canvas-muted">{t('agency.portfolio.empty')}</p>}
                </div>
              </section>
            </div>
          </>
        )}

        {loading && (
          <div role="status" aria-live="polite" className="fixed bottom-5 right-5 rounded-xl border border-canvas-line bg-white px-4 py-3 text-sm font-medium text-canvas-ink shadow-card-lg">
            {t('agency.loading')}
          </div>
        )}
      </div>
    </main>
  );
}
