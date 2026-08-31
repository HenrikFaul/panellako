'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { acquireAdminRequestKey, isTerminalAdminCommandResponse, releaseAdminRequestKey } from '@/lib/superadmin/idempotency-client';
import { usePlatformAuthority } from '@/components/superadmin-authority-context';
import { useI18n } from '@/src/i18n/useI18n';

type ProfileSummary = { id: string | null; displayName: string | null; email: string | null };
type Role = {
  roleKey: string | null;
  displayName: string | null;
  description: string | null;
  active: boolean;
  capabilities: Array<{ key: string | null; riskClass: string | null }>;
};
type Assignment = {
  id: string | null;
  profile: ProfileSummary;
  roleKey: string | null;
  validFrom: string | null;
  validTo: string | null;
  grantReason: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
};
type Approval = {
  id: string | null;
  initiator: ProfileSummary | null;
  approver: ProfileSummary | null;
  capabilityKey: string | null;
  actionKey: string | null;
  targetType: string | null;
  targetId: string | null;
  payload: Record<string, unknown> | null;
  payloadDigest: string | null;
  reason: string | null;
  status: string | null;
  decisionReason: string | null;
  requestedAt: string | null;
  expiresAt: string | null;
  consumedAt: string | null;
};
type SupportSession = {
  id: string | null;
  requester: ProfileSummary | null;
  approver: ProfileSummary | null;
  scopeType: string | null;
  workspaceId: string | null;
  agencyId: string | null;
  capabilityKeys: string[];
  accessMode: string | null;
  reason: string | null;
  status: string | null;
  requestedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
};
type ReleaseAttestation = {
  id: string | null;
  environment: string | null;
  deploymentId: string | null;
  commitSha: string | null;
  artifactDigest: string | null;
  manifestFingerprint: string | null;
  migrationHead: string | null;
  outcome: string | null;
  reason: string | null;
  createdAt: string | null;
};
type Snapshot = {
  roles: Role[];
  assignments: Assignment[];
  approvals: Approval[];
  supportSessions: SupportSession[];
  releaseAttestations: ReleaseAttestation[];
  limited: boolean;
};

const EMPTY_SNAPSHOT: Snapshot = {
  roles: [], assignments: [], approvals: [], supportSessions: [], releaseAttestations: [], limited: false,
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : '—';
}

function profileLabel(profile: ProfileSummary | null): string {
  return profile?.displayName || profile?.email || profile?.id || '—';
}

function textPayload(payload: Record<string, unknown> | null, key: string): string | null {
  const value = payload?.[key];
  return typeof value === 'string' ? value : null;
}

export default function SuperadminGovernance() {
  const { t } = useI18n();
  const authority = usePlatformAuthority();
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [decisionReasons, setDecisionReasons] = useState<Record<string, string>>({});
  const [revokeReasons, setRevokeReasons] = useState<Record<string, string>>({});
  const [grant, setGrant] = useState({ profileId: '', roleKey: '', validTo: '', reason: '' });
  const [support, setSupport] = useState({ scopeType: 'WORKSPACE', scopeId: '', capabilities: 'workspace.read', accessMode: 'READ_ONLY', ttlMinutes: 30, reason: '' });
  const [release, setRelease] = useState({ environment: 'production', deploymentId: '', commitSha: '', artifactDigest: '', manifestFingerprint: '', migrationHead: '', outcome: 'HOLD', reason: '' });

  const can = useCallback((capability: string) => authority.mode === 'operator' && authority.capabilityKeys.includes(capability), [authority]);
  const activeRoles = useMemo(() => snapshot.roles.filter(role => role.active && role.roleKey), [snapshot.roles]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch('/api/superadmin/governance', { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as Partial<Snapshot> & { error?: string };
      if (!response.ok || body.error) throw new Error('GOVERNANCE_LOAD_FAILED');
      setSnapshot({
        roles: Array.isArray(body.roles) ? body.roles : [],
        assignments: Array.isArray(body.assignments) ? body.assignments : [],
        approvals: Array.isArray(body.approvals) ? body.approvals : [],
        supportSessions: Array.isArray(body.supportSessions) ? body.supportSessions : [],
        releaseAttestations: Array.isArray(body.releaseAttestations) ? body.releaseAttestations : [],
        limited: body.limited === true,
      });
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function action(scope: string, body: Record<string, unknown>) {
    setBusy(scope);
    setFeedback(null);
    try {
      const response = await fetch('/api/superadmin/governance/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({})) as { ok?: boolean; error?: string; stepUpHref?: string };
      if (response.status === 428 && result.stepUpHref) {
        window.location.assign(result.stepUpHref);
        return false;
      }
      if (isTerminalAdminCommandResponse(result)) releaseAdminRequestKey(scope);
      if (!response.ok || !result.ok) {
        setFeedback({ tone: 'error', text: `${t('superadmin.governance.actionFailed')} (${result.error ?? response.status})` });
        return false;
      }
      setFeedback({ tone: 'ok', text: t('superadmin.governance.actionSucceeded') });
      await load();
      return true;
    } catch {
      setFeedback({ tone: 'error', text: t('superadmin.governance.actionFailed') });
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function requestGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validFrom = new Date().toISOString();
    const scope = `governance:approval:grant:${grant.profileId}:${grant.roleKey}:${validFrom.slice(0, 16)}:${grant.validTo}:${grant.reason}`;
    const success = await action(scope, {
      action: 'approval.request',
      requestedAction: 'operator.grant',
      input: {
        targetProfileId: grant.profileId.trim(),
        roleKey: grant.roleKey,
        validFrom,
        validTo: grant.validTo ? new Date(grant.validTo).toISOString() : null,
        reason: grant.reason,
      },
      idempotencyKey: acquireAdminRequestKey(scope),
      ttlMinutes: 10,
    });
    if (success) setGrant({ profileId: '', roleKey: '', validTo: '', reason: '' });
  }

  async function requestRevocation(assignment: Assignment) {
    if (!assignment.id) return;
    const reason = revokeReasons[assignment.id]?.trim() ?? '';
    const scope = `governance:approval:revoke:${assignment.id}:${reason}`;
    await action(scope, {
      action: 'approval.request',
      requestedAction: 'operator.revoke',
      input: { assignmentId: assignment.id, reason },
      idempotencyKey: acquireAdminRequestKey(scope),
      ttlMinutes: 10,
    });
  }

  async function decideApproval(approval: Approval, decision: 'APPROVE' | 'REJECT') {
    if (!approval.id || !approval.payloadDigest) return;
    const reason = decisionReasons[approval.id]?.trim() ?? '';
    await action(`governance:approval:decide:${approval.id}:${decision}:${reason}`, {
      action: 'approval.decide', approvalId: approval.id, decision, payloadDigest: approval.payloadDigest, reason,
    });
  }

  async function executeMigrationApproval(approval: Approval, scope: string, idempotencyKey: string) {
    if (!approval.id || !approval.reason) return;
    setBusy(scope);
    setFeedback(null);
    try {
      const response = await fetch('/api/superadmin/apply-migrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          confirmation: 'APPLY_PENDING_MIGRATIONS',
          reason: approval.reason,
          approvalId: approval.id,
          idempotencyKey,
        }),
      });
      const result = await response.json().catch(() => ({})) as { ok?: boolean; error?: string; stepUpHref?: string };
      if (response.status === 428 && result.stepUpHref) {
        window.location.assign(result.stepUpHref);
        return;
      }
      if (isTerminalAdminCommandResponse(result)) releaseAdminRequestKey(scope);
      setFeedback(response.ok && result.ok
        ? { tone: 'ok', text: t('superadmin.governance.actionSucceeded') }
        : { tone: 'error', text: `${t('superadmin.governance.actionFailed')} (${result.error ?? response.status})` });
      await load();
    } catch {
      setFeedback({ tone: 'error', text: t('superadmin.governance.actionFailed') });
    } finally {
      setBusy(null);
    }
  }

  async function executeApproval(approval: Approval) {
    if (!approval.id || !approval.payload) return;
    const scope = `governance:approval:execute:${approval.id}`;
    const idempotencyKey = acquireAdminRequestKey(scope);
    if (approval.actionKey === 'platform.operators.grant') {
      await action(scope, {
        action: 'operator.grant.execute',
        approvalId: approval.id,
        idempotencyKey,
        input: {
          targetProfileId: textPayload(approval.payload, 'profile_id'),
          roleKey: textPayload(approval.payload, 'role_key'),
          validFrom: textPayload(approval.payload, 'valid_from'),
          validTo: textPayload(approval.payload, 'valid_to'),
          reason: textPayload(approval.payload, 'grant_reason'),
        },
      });
    } else if (approval.actionKey === 'platform.operators.revoke') {
      await action(scope, {
        action: 'operator.revoke.execute',
        assignmentId: textPayload(approval.payload, 'assignment_id'),
        reason: textPayload(approval.payload, 'revocation_reason'),
        approvalId: approval.id,
        idempotencyKey,
      });
    } else if (approval.actionKey === 'platform.release.attest') {
      await action(scope, {
        action: 'release.attest.execute',
        approvalId: approval.id,
        idempotencyKey,
        input: {
          environment: textPayload(approval.payload, 'environment'),
          deploymentId: textPayload(approval.payload, 'deployment_id'),
          commitSha: textPayload(approval.payload, 'commit_sha'),
          artifactDigest: textPayload(approval.payload, 'artifact_digest'),
          manifestFingerprint: textPayload(approval.payload, 'manifest_fingerprint'),
          migrationHead: textPayload(approval.payload, 'migration_head'),
          outcome: textPayload(approval.payload, 'outcome'),
          reason: approval.reason,
        },
      });
    } else if (approval.actionKey === 'platform.migrations.apply') {
      await executeMigrationApproval(approval, scope, idempotencyKey);
    }
  }

  async function requestSupport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const capabilities = Array.from(new Set(support.capabilities.split(',').map(value => value.trim()).filter(Boolean))).sort();
    const scope = `governance:support:${support.scopeType}:${support.scopeId}:${support.accessMode}:${capabilities.join(',')}:${support.reason}`;
    const success = await action(scope, {
      action: 'support.request',
      scopeType: support.scopeType,
      scopeId: support.scopeId.trim(),
      capabilityKeys: capabilities,
      accessMode: support.accessMode,
      ttlMinutes: support.ttlMinutes,
      reason: support.reason,
      idempotencyKey: acquireAdminRequestKey(scope),
    });
    if (success) setSupport(current => ({ ...current, scopeId: '', reason: '' }));
  }

  async function decideSupport(session: SupportSession, decision: 'APPROVE' | 'REJECT') {
    if (!session.id) return;
    const reason = decisionReasons[session.id]?.trim() ?? '';
    await action(`governance:support:decide:${session.id}:${decision}:${reason}`, {
      action: 'support.decide', supportSessionId: session.id, decision, reason,
    });
  }

  async function revokeSupport(session: SupportSession) {
    if (!session.id) return;
    const reason = revokeReasons[session.id]?.trim() ?? '';
    const scope = `governance:support:revoke:${session.id}:${reason}`;
    await action(scope, {
      action: 'support.revoke', supportSessionId: session.id, reason, idempotencyKey: acquireAdminRequestKey(scope),
    });
  }

  async function requestRelease(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const scope = `governance:approval:release:${release.environment}:${release.deploymentId}:${release.artifactDigest}`;
    const success = await action(scope, {
      action: 'approval.request',
      requestedAction: 'release.attest',
      input: release,
      idempotencyKey: acquireAdminRequestKey(scope),
      ttlMinutes: 10,
    });
    if (success) setRelease(current => ({ ...current, deploymentId: '', reason: '' }));
  }

  if (loading) return <p role="status" className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">{t('superadmin.governance.loading')}</p>;
  if (loadError) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><p role="alert" className="text-sm font-semibold text-rose-900">{t('superadmin.governance.loadFailed')}</p><button type="button" className="btn-secondary mt-3" onClick={() => void load()}>{t('superadmin.governance.retry')}</button></div>;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">{t('superadmin.governance.eyebrow')}</p><h2 className="mt-1 text-2xl font-semibold text-canvas-ink">{t('superadmin.governance.title')}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-canvas-muted">{t('superadmin.governance.subtitle')}</p></div>
          <button type="button" className="btn-secondary min-h-11 px-4" onClick={() => void load()}>{t('superadmin.governance.refresh')}</button>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-canvas-line bg-canvas-sage p-4"><dt className="text-xs font-medium text-canvas-muted">{t('superadmin.governance.identity')}</dt><dd className="mt-1 font-semibold text-canvas-ink">{authority.operatorEmail ?? authority.operatorProfileId ?? '—'}</dd></div>
          <div className="rounded-xl border border-canvas-line bg-canvas-sage p-4"><dt className="text-xs font-medium text-canvas-muted">{t('superadmin.governance.roles')}</dt><dd className="mt-1 font-semibold text-canvas-ink">{authority.roleKeys.join(', ') || authority.mode}</dd></div>
          <div className="rounded-xl border border-canvas-line bg-canvas-sage p-4"><dt className="text-xs font-medium text-canvas-muted">{t('superadmin.governance.assurance')}</dt><dd className="mt-1 font-semibold text-canvas-ink">{authority.assuranceLevel ?? '—'}</dd></div>
        </dl>
        {snapshot.limited ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-950">{t('superadmin.governance.breakGlassLimited')}</p> : null}
        {feedback ? <p role={feedback.tone === 'error' ? 'alert' : 'status'} className={`mt-4 rounded-xl border p-3 text-sm font-semibold ${feedback.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>{feedback.text}</p> : null}
      </section>

      {can('platform.operators.manage') ? (
        <section className="grid gap-5 lg:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)]">
          <form onSubmit={requestGrant} className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card">
            <h3 className="text-lg font-semibold text-canvas-ink">{t('superadmin.governance.grantTitle')}</h3>
            <p className="mt-1 text-sm text-canvas-muted">{t('superadmin.governance.fourEyesHint')}</p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-semibold text-canvas-ink">{t('superadmin.governance.profileId')}<input className="input-base mt-1 min-h-11" value={grant.profileId} onChange={event => setGrant(current => ({ ...current, profileId: event.target.value }))} required pattern="[0-9a-fA-F-]{36}" /></label>
              <label className="block text-sm font-semibold text-canvas-ink">{t('superadmin.governance.role')}<select className="input-base mt-1 min-h-11" value={grant.roleKey} onChange={event => setGrant(current => ({ ...current, roleKey: event.target.value }))} required><option value="">{t('superadmin.governance.selectRole')}</option>{activeRoles.map(role => <option key={role.roleKey ?? ''} value={role.roleKey ?? ''}>{role.displayName ?? role.roleKey}</option>)}</select></label>
              <label className="block text-sm font-semibold text-canvas-ink">{t('superadmin.governance.validTo')}<input type="datetime-local" className="input-base mt-1 min-h-11" value={grant.validTo} onChange={event => setGrant(current => ({ ...current, validTo: event.target.value }))} /></label>
              <label className="block text-sm font-semibold text-canvas-ink">{t('superadmin.governance.reason')}<textarea className="input-base mt-1" rows={3} minLength={3} maxLength={1_000} value={grant.reason} onChange={event => setGrant(current => ({ ...current, reason: event.target.value }))} required /></label>
            </div>
            <button type="submit" className="btn-primary mt-4 min-h-11 px-4" disabled={busy !== null}>{t('superadmin.governance.requestApproval')}</button>
          </form>

          <div className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card">
            <h3 className="text-lg font-semibold text-canvas-ink">{t('superadmin.governance.assignmentsTitle')}</h3>
            <div className="mt-4 space-y-3">
              {snapshot.assignments.length === 0 ? <p className="text-sm text-canvas-muted">{t('superadmin.governance.empty')}</p> : snapshot.assignments.map(assignment => (
                <article key={assignment.id ?? profileLabel(assignment.profile)} className="rounded-xl border border-canvas-line p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-canvas-ink">{profileLabel(assignment.profile)}</p><p className="mt-1 text-xs text-canvas-muted">{assignment.roleKey} · {formatDate(assignment.validFrom)} → {formatDate(assignment.validTo)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${assignment.revokedAt ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-800'}`}>{assignment.revokedAt ? t('superadmin.governance.revoked') : t('superadmin.governance.active')}</span></div>
                  {!assignment.revokedAt && assignment.id ? <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input aria-label={t('superadmin.governance.revocationReason')} className="input-base min-h-11 flex-1" placeholder={t('superadmin.governance.revocationReason')} value={revokeReasons[assignment.id] ?? ''} onChange={event => setRevokeReasons(current => ({ ...current, [assignment.id as string]: event.target.value }))} /><button type="button" className="btn-secondary min-h-11 px-3" disabled={busy !== null || (revokeReasons[assignment.id]?.trim().length ?? 0) < 3} onClick={() => void requestRevocation(assignment)}>{t('superadmin.governance.requestRevocation')}</button></div> : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card">
        <h3 className="text-lg font-semibold text-canvas-ink">{t('superadmin.governance.approvalsTitle')}</h3>
        <div className="mt-4 space-y-3">
          {snapshot.approvals.length === 0 ? <p className="text-sm text-canvas-muted">{t('superadmin.governance.empty')}</p> : snapshot.approvals.map(approval => {
            const own = approval.initiator?.id === authority.operatorProfileId;
            return <article key={approval.id ?? approval.payloadDigest ?? ''} className="rounded-xl border border-canvas-line p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-canvas-ink">{approval.actionKey}</p><p className="mt-1 text-xs text-canvas-muted">{profileLabel(approval.initiator)} · {approval.targetType}:{approval.targetId}</p><p className="mt-1 break-all font-mono text-[11px] text-canvas-muted">{approval.payloadDigest}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">{approval.status}</span></div><p className="mt-3 text-sm text-canvas-muted">{approval.reason}</p><p className="mt-2 text-xs text-canvas-muted">{t('superadmin.governance.expiresAt')}: {formatDate(approval.expiresAt)}</p>
              {approval.status === 'PENDING' && can('platform.approvals.decide') && !own && approval.id ? <div className="mt-3"><input className="input-base min-h-11" aria-label={t('superadmin.governance.decisionReason')} placeholder={t('superadmin.governance.decisionReason')} value={decisionReasons[approval.id] ?? ''} onChange={event => setDecisionReasons(current => ({ ...current, [approval.id as string]: event.target.value }))} /><div className="mt-2 flex gap-2"><button type="button" className="btn-primary min-h-11 px-3" disabled={busy !== null || (decisionReasons[approval.id]?.trim().length ?? 0) < 3} onClick={() => void decideApproval(approval, 'APPROVE')}>{t('superadmin.governance.approve')}</button><button type="button" className="btn-secondary min-h-11 px-3" disabled={busy !== null || (decisionReasons[approval.id]?.trim().length ?? 0) < 3} onClick={() => void decideApproval(approval, 'REJECT')}>{t('superadmin.governance.reject')}</button></div></div> : null}
              {approval.status === 'APPROVED' && own ? <button type="button" className="btn-primary mt-3 min-h-11 px-3" disabled={busy !== null} onClick={() => void executeApproval(approval)}>{t('superadmin.governance.executeApproved')}</button> : null}
            </article>;
          })}
        </div>
      </section>

      {can('platform.support.request') ? <section className="grid gap-5 lg:grid-cols-2"><form onSubmit={requestSupport} className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card"><h3 className="text-lg font-semibold text-canvas-ink">{t('superadmin.governance.supportRequestTitle')}</h3><p className="mt-1 text-sm text-canvas-muted">{t('superadmin.governance.supportHint')}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-canvas-ink">{t('superadmin.governance.scopeType')}<select className="input-base mt-1 min-h-11" value={support.scopeType} onChange={event => setSupport(current => ({ ...current, scopeType: event.target.value }))}><option value="WORKSPACE">Workspace</option><option value="AGENCY">Agency</option></select></label><label className="text-sm font-semibold text-canvas-ink">{t('superadmin.governance.scopeId')}<input className="input-base mt-1 min-h-11" value={support.scopeId} onChange={event => setSupport(current => ({ ...current, scopeId: event.target.value }))} required /></label><label className="text-sm font-semibold text-canvas-ink sm:col-span-2">{t('superadmin.governance.capabilities')}<input className="input-base mt-1 min-h-11" value={support.capabilities} onChange={event => setSupport(current => ({ ...current, capabilities: event.target.value }))} required /></label><label className="text-sm font-semibold text-canvas-ink">{t('superadmin.governance.accessMode')}<select className="input-base mt-1 min-h-11" value={support.accessMode} onChange={event => setSupport(current => ({ ...current, accessMode: event.target.value }))}><option value="READ_ONLY">{t('superadmin.governance.readOnly')}</option><option value="WRITE">{t('superadmin.governance.write')}</option></select></label><label className="text-sm font-semibold text-canvas-ink">{t('superadmin.governance.ttl')}<input type="number" min={5} max={60} className="input-base mt-1 min-h-11" value={support.ttlMinutes} onChange={event => setSupport(current => ({ ...current, ttlMinutes: Number(event.target.value) }))} /></label><label className="text-sm font-semibold text-canvas-ink sm:col-span-2">{t('superadmin.governance.reason')}<textarea className="input-base mt-1" rows={3} minLength={3} maxLength={1_000} value={support.reason} onChange={event => setSupport(current => ({ ...current, reason: event.target.value }))} required /></label></div><button type="submit" className="btn-primary mt-4 min-h-11 px-4" disabled={busy !== null}>{t('superadmin.governance.requestSupport')}</button></form>
        <div className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card"><h3 className="text-lg font-semibold text-canvas-ink">{t('superadmin.governance.supportSessionsTitle')}</h3><div className="mt-4 space-y-3">{snapshot.supportSessions.length === 0 ? <p className="text-sm text-canvas-muted">{t('superadmin.governance.empty')}</p> : snapshot.supportSessions.map(session => <article key={session.id ?? ''} className="rounded-xl border border-canvas-line p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold text-canvas-ink">{session.scopeType} · {session.workspaceId ?? session.agencyId}</p><p className="mt-1 text-xs text-canvas-muted">{session.accessMode} · {session.capabilityKeys.join(', ')}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{session.status}</span></div><p className="mt-2 text-sm text-canvas-muted">{session.reason}</p>{session.id && session.status === 'PENDING' && can('platform.support.approve') && session.requester?.id !== authority.operatorProfileId ? <div className="mt-3"><input className="input-base min-h-11" placeholder={t('superadmin.governance.decisionReason')} value={decisionReasons[session.id] ?? ''} onChange={event => setDecisionReasons(current => ({ ...current, [session.id as string]: event.target.value }))} /><div className="mt-2 flex gap-2"><button type="button" className="btn-primary min-h-11 px-3" disabled={busy !== null || (decisionReasons[session.id]?.trim().length ?? 0) < 3} onClick={() => void decideSupport(session, 'APPROVE')}>{t('superadmin.governance.approve')}</button><button type="button" className="btn-secondary min-h-11 px-3" disabled={busy !== null || (decisionReasons[session.id]?.trim().length ?? 0) < 3} onClick={() => void decideSupport(session, 'REJECT')}>{t('superadmin.governance.reject')}</button></div></div> : null}{session.id && ['PENDING', 'ACTIVE'].includes(session.status ?? '') && can('platform.support.revoke') ? <div className="mt-3 flex gap-2"><input className="input-base min-h-11 flex-1" placeholder={t('superadmin.governance.revocationReason')} value={revokeReasons[session.id] ?? ''} onChange={event => setRevokeReasons(current => ({ ...current, [session.id as string]: event.target.value }))} /><button type="button" className="btn-secondary min-h-11 px-3" disabled={busy !== null || (revokeReasons[session.id]?.trim().length ?? 0) < 3} onClick={() => void revokeSupport(session)}>{t('superadmin.governance.revoke')}</button></div> : null}</article>)}</div></div></section> : null}

      {can('platform.release.attest') ? <section className="grid gap-5 lg:grid-cols-2"><form onSubmit={requestRelease} className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card"><h3 className="text-lg font-semibold text-canvas-ink">{t('superadmin.governance.releaseRequestTitle')}</h3><p className="mt-1 text-sm text-canvas-muted">{t('superadmin.governance.fourEyesHint')}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-canvas-ink">{t('superadmin.governance.environment')}<select className="input-base mt-1 min-h-11" value={release.environment} onChange={event => setRelease(current => ({ ...current, environment: event.target.value }))}>{['production', 'preview', 'staging', 'development'].map(value => <option key={value}>{value}</option>)}</select></label><label className="text-sm font-semibold text-canvas-ink">{t('superadmin.governance.outcome')}<select className="input-base mt-1 min-h-11" value={release.outcome} onChange={event => setRelease(current => ({ ...current, outcome: event.target.value }))}>{['PASS', 'HOLD', 'FAIL'].map(value => <option key={value}>{value}</option>)}</select></label>{(['deploymentId', 'commitSha', 'artifactDigest', 'manifestFingerprint', 'migrationHead'] as const).map(key => <label key={key} className="text-sm font-semibold text-canvas-ink sm:col-span-2">{t(`superadmin.governance.${key}`)}<input className="input-base mt-1 min-h-11 font-mono text-xs" value={release[key]} onChange={event => setRelease(current => ({ ...current, [key]: event.target.value }))} required /></label>)}<label className="text-sm font-semibold text-canvas-ink sm:col-span-2">{t('superadmin.governance.reason')}<textarea className="input-base mt-1" rows={3} minLength={3} maxLength={1_000} value={release.reason} onChange={event => setRelease(current => ({ ...current, reason: event.target.value }))} required /></label></div><button type="submit" className="btn-primary mt-4 min-h-11 px-4" disabled={busy !== null}>{t('superadmin.governance.requestApproval')}</button></form>
        <div className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card"><h3 className="text-lg font-semibold text-canvas-ink">{t('superadmin.governance.releaseHistoryTitle')}</h3><div className="mt-4 space-y-3">{snapshot.releaseAttestations.length === 0 ? <p className="text-sm text-canvas-muted">{t('superadmin.governance.empty')}</p> : snapshot.releaseAttestations.map(item => <article key={item.id ?? item.artifactDigest ?? ''} className="rounded-xl border border-canvas-line p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold text-canvas-ink">{item.environment} · {item.deploymentId}</p><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{item.outcome}</span></div><p className="mt-2 break-all font-mono text-[11px] text-canvas-muted">{item.commitSha}</p><p className="mt-2 text-xs text-canvas-muted">{formatDate(item.createdAt)}</p></article>)}</div></div></section> : null}

      <details className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card"><summary className="cursor-pointer font-semibold text-canvas-ink">{t('superadmin.governance.roleCatalog')}</summary><div className="mt-4 grid gap-3 md:grid-cols-2">{snapshot.roles.map(role => <article key={role.roleKey ?? ''} className="rounded-xl border border-canvas-line p-4"><h4 className="font-semibold text-canvas-ink">{role.displayName ?? role.roleKey}</h4><p className="mt-1 text-sm text-canvas-muted">{role.description}</p><ul className="mt-3 space-y-1 text-xs text-canvas-muted">{role.capabilities.map(capability => <li key={capability.key ?? ''}><span className="font-semibold text-canvas-ink">{capability.riskClass}</span> · {capability.key}</li>)}</ul></article>)}</div></details>
    </div>
  );
}
