'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  acquireAdminRequestKey,
  isTerminalAdminCommandResponse,
  releaseAdminRequestKey,
} from '@/lib/superadmin/idempotency-client';
import { usePlatformAuthority } from '@/components/superadmin-authority-context';
import { useI18n } from '@/src/i18n/useI18n';

interface UserRow {
  id: string;
  full_name: string | null;
  emailMasked: string;
  created_at: string | null;
  free_trial_start: string | null;
  free_trial_days: number;
  free_trial_never_expires: boolean;
}

interface EditState {
  free_trial_start: string;
  free_trial_days: number;
  free_trial_never_expires: boolean;
  reason: string;
}

interface ActionMessage {
  kind: 'success' | 'error';
  key: string;
  stepUpHref?: string;
}

interface Pagination {
  offset: number;
  hasMore: boolean;
  nextOffset: number | null;
}

const PAGE_SIZE = 50;

type Translator = (key: string) => string;

function translated(t: Translator, key: string, values: Record<string, string | number> = {}): string {
  return Object.entries(values).reduce(
    (message, [name, value]) => message.replace(`{${name}}`, String(value)),
    t(key),
  );
}

function fmtDate(iso: string | null | undefined, locale: 'hu' | 'en'): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return '—';
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-GB' : 'hu-HU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function toInputDate(iso: string | null | undefined): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

function trialEnd(user: UserRow, locale: 'hu' | 'en', t: Translator): string {
  if (user.free_trial_never_expires) return t('superadmin.users.neverExpires');
  const start = user.free_trial_start ?? user.created_at;
  if (!start || !Number.isFinite(Date.parse(start))) return '—';
  const end = new Date(new Date(start).getTime() + user.free_trial_days * 86_400_000);
  const date = fmtDate(end.toISOString(), locale);
  if (end < new Date()) {
    return translated(t, 'superadmin.users.expiredWithDate', { date });
  }
  const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  return translated(t, 'superadmin.users.daysRemaining', { days, date });
}

function isTrialExpired(user: UserRow): boolean {
  if (user.free_trial_never_expires) return false;
  const start = user.free_trial_start ?? user.created_at;
  return Boolean(start && Number.isFinite(Date.parse(start))
    && new Date(new Date(start).getTime() + user.free_trial_days * 86_400_000) < new Date());
}

function errorKey(code: unknown): string {
  switch (code) {
    case 'MFA_STEP_UP_REQUIRED': return 'superadmin.users.errors.mfaRequired';
    case 'PLATFORM_USER_TRIAL_NO_CHANGE': return 'superadmin.users.errors.noChange';
    case 'PLATFORM_USER_NOT_FOUND': return 'superadmin.users.errors.notFound';
    case 'IDEMPOTENCY_PAYLOAD_MISMATCH': return 'superadmin.users.errors.idempotencyMismatch';
    case 'PLATFORM_CAPABILITY_DENIED': return 'superadmin.users.errors.capabilityDenied';
    default: return 'superadmin.users.errors.actionFailed';
  }
}

async function jsonBody(response: Response): Promise<Record<string, unknown>> {
  try {
    const value = await response.json() as unknown;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export default function SuperadminUsersTab() {
  const { locale, t } = useI18n();
  const authority = usePlatformAuthority();
  const canManage = authority.mode === 'operator'
    && authority.capabilityKeys.includes('platform.users.manage_trial');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pagination, setPagination] = useState<Pagination>({ offset: 0, hasMore: false, nextOffset: null });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, EditState>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, ActionMessage>>({});

  const load = useCallback(async (offset = 0, query = '') => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (query.trim()) params.set('search', query.trim());
      const response = await fetch(`/api/superadmin/users?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const body = await jsonBody(response);
      if (!response.ok || !Array.isArray(body.users)) throw new Error('USERS_LOAD_FAILED');
      const page = body.pagination && typeof body.pagination === 'object'
        ? body.pagination as Record<string, unknown>
        : {};
      setUsers(body.users as UserRow[]);
      setPagination({
        offset,
        hasMore: page.hasMore === true,
        nextOffset: typeof page.nextOffset === 'number' ? page.nextOffset : null,
      });
      setExpanded(null);
    } catch {
      setLoadError('superadmin.users.loadError');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(0, ''); }, [load]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const next = search.trim();
    setAppliedSearch(next);
    void load(0, next);
  }

  function openEdit(user: UserRow) {
    setExpanded(user.id);
    setMessages(previous => {
      const next = { ...previous };
      delete next[user.id];
      return next;
    });
    setEditing(previous => ({
      ...previous,
      [user.id]: {
        free_trial_start: toInputDate(user.free_trial_start ?? user.created_at),
        free_trial_days: user.free_trial_days,
        free_trial_never_expires: user.free_trial_never_expires,
        reason: previous[user.id]?.reason ?? '',
      },
    }));
  }

  function patch(userId: string, field: keyof EditState, value: string | number | boolean) {
    setEditing(previous => ({
      ...previous,
      [userId]: { ...previous[userId], [field]: value },
    }));
  }

  async function save(userId: string) {
    const state = editing[userId];
    if (!state || state.reason.trim().length < 10 || saving) return;
    const scope = `user-trial:${userId}`;
    const idempotencyKey = acquireAdminRequestKey(scope);
    setSaving(userId);
    setMessages(previous => {
      const next = { ...previous };
      delete next[userId];
      return next;
    });

    try {
      const response = await fetch(`/api/superadmin/users/${userId}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          free_trial_start: state.free_trial_start
            ? new Date(`${state.free_trial_start}T00:00:00.000Z`).toISOString()
            : null,
          free_trial_days: state.free_trial_days,
          free_trial_never_expires: state.free_trial_never_expires,
          reason: state.reason.trim(),
          idempotencyKey,
        }),
      });
      const body = await jsonBody(response);
      if (isTerminalAdminCommandResponse(body)) releaseAdminRequestKey(scope);

      const trial = body.trial && typeof body.trial === 'object'
        ? body.trial as Record<string, unknown>
        : null;
      const validTrial = trial
        && (trial.free_trial_start === null || (
          typeof trial.free_trial_start === 'string'
          && Number.isFinite(Date.parse(trial.free_trial_start))
        ))
        && typeof trial.free_trial_days === 'number'
        && Number.isInteger(trial.free_trial_days)
        && trial.free_trial_days >= 1
        && trial.free_trial_days <= 3_650
        && typeof trial.free_trial_never_expires === 'boolean';
      if (!response.ok || body.ok !== true || body.outcome !== 'updated' || !validTrial) {
        setMessages(previous => ({
          ...previous,
          [userId]: {
            kind: 'error',
            key: errorKey(body.error),
            ...(response.status === 428 && typeof body.stepUpHref === 'string'
              ? { stepUpHref: body.stepUpHref }
              : {}),
          },
        }));
        return;
      }

      setUsers(previous => previous.map(user => user.id !== userId ? user : {
        ...user,
        free_trial_start: trial.free_trial_start as string | null,
        free_trial_days: trial.free_trial_days as number,
        free_trial_never_expires: trial.free_trial_never_expires as boolean,
      }));
      setEditing(previous => ({
        ...previous,
        [userId]: {
          ...previous[userId],
          free_trial_start: toInputDate(trial.free_trial_start as string | null),
          free_trial_days: trial.free_trial_days as number,
          free_trial_never_expires: trial.free_trial_never_expires as boolean,
          reason: '',
        },
      }));
      setMessages(previous => ({
        ...previous,
        [userId]: {
          kind: 'success',
          key: body.replayed === true
            ? 'superadmin.users.saveReplayed'
            : 'superadmin.users.saveSucceeded',
        },
      }));
    } catch {
      setMessages(previous => ({
        ...previous,
        [userId]: { kind: 'error', key: 'superadmin.users.errors.network' },
      }));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">{t('superadmin.users.title')}</h2>
          <p className="text-xs text-slate-500">
            {translated(t, 'superadmin.users.pageSummary', { count: users.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(pagination.offset, appliedSearch)}
          disabled={loading}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] disabled:opacity-50"
        >
          {loading ? t('superadmin.users.loading') : t('superadmin.users.refresh')}
        </button>
      </div>

      <form className="flex gap-2" onSubmit={submitSearch} role="search">
        <label className="sr-only" htmlFor="platform-user-search">{t('superadmin.users.searchLabel')}</label>
        <input
          id="platform-user-search"
          type="search"
          maxLength={120}
          placeholder={t('superadmin.users.search')}
          value={search}
          onChange={event => setSearch(event.target.value)}
          className="input-base flex-1"
        />
        <button type="submit" disabled={loading} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-base disabled:opacity-50">
          {t('superadmin.users.searchAction')}
        </button>
      </form>

      {loadError ? (
        <div role="alert" className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-200">
          <p>{t(loadError)}</p>
          <button type="button" onClick={() => void load(pagination.offset, appliedSearch)} className="mt-3 rounded-lg border border-rose-400/30 px-3 py-1.5 font-semibold">
            {t('superadmin.users.retry')}
          </button>
        </div>
      ) : loading && users.length === 0 ? (
        <div role="status" aria-live="polite" className="space-y-2">
          <span className="sr-only">{t('superadmin.users.loadingUsers')}</span>
          {[...Array(5)].map((_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />)}
        </div>
      ) : users.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">{t('superadmin.users.noMatch')}</p>
      ) : (
        <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.03]">
          {users.map(user => {
            const isOpen = expanded === user.id;
            const state = editing[user.id];
            const message = messages[user.id];
            const panelId = `platform-user-editor-${user.id}`;
            const trialEndText = trialEnd(user, locale, t);
            return (
              <div key={user.id}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  disabled={!canManage}
                  title={!canManage ? t('superadmin.users.readOnlyAccess') : undefined}
                  onClick={() => isOpen ? setExpanded(null) : openEdit(user)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] disabled:cursor-default ${isOpen ? 'bg-white/[0.02]' : ''}`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-300" aria-hidden="true">
                      {(user.full_name ?? user.emailMasked).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100">{user.full_name || t('superadmin.users.anonymous')}</p>
                      <p className="truncate text-xs text-slate-500">{user.emailMasked}</p>
                    </div>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-xs text-slate-500">{t('superadmin.users.registeredAt')}</p>
                    <p className="text-xs font-semibold text-slate-300">{fmtDate(user.created_at, locale)}</p>
                  </div>
                  <div className="hidden shrink-0 text-right md:block">
                    <p className="text-xs text-slate-500">{t('superadmin.users.trialEnd')}</p>
                    <p className={`text-xs font-semibold ${user.free_trial_never_expires ? 'text-emerald-400' : isTrialExpired(user) ? 'text-rose-400' : 'text-slate-300'}`}>
                      {trialEndText}
                    </p>
                  </div>
                  <span className="shrink-0 text-slate-600" aria-hidden="true">{canManage ? (isOpen ? '▲' : '▼') : t('superadmin.users.readOnly')}</span>
                </button>

                {canManage && isOpen && state && (
                  <div id={panelId} className="border-t border-white/[0.06] bg-white/[0.02] px-4 pb-4 pt-3">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t('superadmin.users.regDate')}</span>
                        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-400">{fmtDate(user.created_at, locale)}</div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label htmlFor={`trial-start-${user.id}`} className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t('superadmin.users.trialStart')}</label>
                        <input id={`trial-start-${user.id}`} type="date" value={state.free_trial_start} disabled={state.free_trial_never_expires} onChange={event => patch(user.id, 'free_trial_start', event.target.value)} className="input-base disabled:opacity-40" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label htmlFor={`trial-days-${user.id}`} className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t('superadmin.users.trialDays')}</label>
                        <input id={`trial-days-${user.id}`} type="number" min={1} max={3650} value={state.free_trial_days} disabled={state.free_trial_never_expires} onChange={event => patch(user.id, 'free_trial_days', Math.max(1, Number.parseInt(event.target.value, 10) || 14))} className="input-base disabled:opacity-40" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t('superadmin.users.neverExpires')}</span>
                        <button type="button" aria-pressed={state.free_trial_never_expires} onClick={() => patch(user.id, 'free_trial_never_expires', !state.free_trial_never_expires)} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${state.free_trial_never_expires ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/[0.04] text-slate-400'}`}>
                          {state.free_trial_never_expires
                            ? t('superadmin.users.permanentAccessEnabled')
                            : t('superadmin.users.permanentAccess')}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-col gap-1">
                      <label htmlFor={`trial-reason-${user.id}`} className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t('superadmin.users.reasonLabel')}</label>
                      <textarea id={`trial-reason-${user.id}`} value={state.reason} minLength={10} maxLength={1000} required onChange={event => patch(user.id, 'reason', event.target.value)} className="input-base min-h-20" placeholder={t('superadmin.users.reasonPlaceholder')} />
                      <p className="text-[10px] text-slate-500">{translated(t, 'superadmin.users.reasonCounter', { count: state.reason.trim().length })}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button type="button" onClick={() => void save(user.id)} disabled={saving === user.id || state.reason.trim().length < 10} className="rounded-[0.625rem] bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-base hover:bg-brand-400 disabled:opacity-50">
                        {saving === user.id ? t('superadmin.users.saving') : t('superadmin.users.save')}
                      </button>
                      <button type="button" onClick={() => setExpanded(null)} className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/[0.08]">{t('superadmin.users.cancel')}</button>
                      {message && (
                        <div role={message.kind === 'error' ? 'alert' : 'status'} aria-live="polite" className={`text-sm font-semibold ${message.kind === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          <span>{t(message.key)}</span>
                          {message.stepUpHref && <a href={message.stepUpHref} className="ml-2 underline">{t('superadmin.authority.stepUp')}</a>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loadError && (pagination.offset > 0 || pagination.hasMore) && (
        <nav aria-label={t('superadmin.users.paginationLabel')} className="flex items-center justify-between gap-3">
          <button type="button" disabled={loading || pagination.offset === 0} onClick={() => void load(Math.max(0, pagination.offset - PAGE_SIZE), appliedSearch)} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 disabled:opacity-40">{t('superadmin.users.previousPage')}</button>
          <span className="text-xs text-slate-500">{pagination.offset + 1}–{pagination.offset + users.length}</span>
          <button type="button" disabled={loading || !pagination.hasMore || pagination.nextOffset === null} onClick={() => void load(pagination.nextOffset ?? pagination.offset, appliedSearch)} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 disabled:opacity-40">{t('superadmin.users.nextPage')}</button>
        </nav>
      )}
    </div>
  );
}
