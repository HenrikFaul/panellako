'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  ChevronRight,
  Clock,
  LayoutDashboard,
  Package,
  RefreshCw,
  Settings,
  Shield,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import {
  CONTROL_CENTER_MANIFEST_FINGERPRINT,
  CONTROL_CENTER_SCHEMA_VERSION,
  normalizeControlCenterResponse,
  type ControlCenterResponse,
} from '@/lib/superadmin/control-center';
import { useI18n } from '@/src/i18n/useI18n';

export type SuperadminDestination = 'operations' | 'users' | 'features' | 'communityRequests';

interface SuperadminControlCenterProps {
  onOpenTab: (tab: SuperadminDestination) => void;
}

type Translate = (key: string) => string;

const STATUS_STYLES: Record<string, string> = {
  healthy: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  configured: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  ready: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  degraded: 'border-amber-200 bg-amber-50 text-amber-900',
  attention: 'border-amber-200 bg-amber-50 text-amber-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  partial: 'border-amber-200 bg-amber-50 text-amber-900',
  missing: 'border-rose-200 bg-rose-50 text-rose-800',
  critical: 'border-rose-200 bg-rose-50 text-rose-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  failed: 'border-rose-200 bg-rose-50 text-rose-800',
  mismatch: 'border-rose-200 bg-rose-50 text-rose-800',
  unavailable: 'border-rose-200 bg-rose-50 text-rose-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  match: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  unknown: 'border-slate-200 bg-slate-50 text-slate-700',
};

const STATUS_ICON: Record<string, LucideIcon> = {
  healthy: CheckCircle,
  configured: CheckCircle,
  ready: CheckCircle,
  ok: CheckCircle,
  degraded: AlertTriangle,
  attention: AlertTriangle,
  warning: AlertTriangle,
  partial: AlertTriangle,
  missing: XCircle,
  critical: XCircle,
  error: XCircle,
  failed: XCircle,
  mismatch: XCircle,
  unavailable: XCircle,
  info: AlertCircle,
  match: CheckCircle,
  unknown: AlertCircle,
};

const SUMMARY_ITEMS: Array<{
  key: keyof ControlCenterResponse['summary'];
  labelKey: string;
  Icon: LucideIcon;
}> = [
  { key: 'workspaces', labelKey: 'superadmin.controlCenter.summary.workspaces', Icon: LayoutDashboard },
  { key: 'buildings', labelKey: 'superadmin.controlCenter.summary.buildings', Icon: Package },
  { key: 'units', labelKey: 'superadmin.controlCenter.summary.units', Icon: BarChart3 },
  { key: 'profiles', labelKey: 'superadmin.controlCenter.summary.profiles', Icon: Users },
  { key: 'agencies', labelKey: 'superadmin.controlCenter.summary.agencies', Icon: Shield },
];

function messageOrFallback(t: Translate, key: string, fallback: string): string {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function translationToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function destinationFromHref(href: string | undefined): SuperadminDestination | null {
  if (!href) return null;
  try {
    const url = new URL(href, 'https://panellako.local');
    if (url.pathname !== '/superadmin') return null;
    const tab = url.searchParams.get('tab');
    return tab === 'operations' || tab === 'users' || tab === 'features' || tab === 'communityRequests'
      ? tab
      : null;
  } catch {
    return null;
  }
}

function statusLabel(t: Translate, status: string): string {
  return messageOrFallback(
    t,
    `superadmin.controlCenter.status.${status}`,
    t('superadmin.controlCenter.status.unknown'),
  );
}

function attentionTitle(
  t: Translate,
  item: ControlCenterResponse['attention'][number],
): string {
  if (item.id === 'pending-community-requests') {
    return t('superadmin.controlCenter.attentionItems.pendingCommunityRequestsTitle');
  }
  if (item.id === 'database-partial') {
    return t('superadmin.controlCenter.attentionItems.databasePartialTitle');
  }
  if (item.id === 'database-unavailable') {
    return t('superadmin.controlCenter.attentionItems.databaseUnavailableTitle');
  }
  if (item.id.startsWith('job-')) {
    return item.severity === 'critical'
      ? t('superadmin.controlCenter.attentionItems.jobFailedTitle')
      : t('superadmin.controlCenter.attentionItems.jobRunningTitle');
  }
  if (item.id.startsWith('stuck-job-')) {
    return t('superadmin.controlCenter.attentionItems.jobStuckTitle');
  }
  if (item.id.startsWith('partial-job-')) {
    return t('superadmin.controlCenter.attentionItems.jobPartialTitle');
  }
  return item.title;
}

function attentionDetail(
  t: Translate,
  item: ControlCenterResponse['attention'][number],
  locale: 'hu' | 'en',
): string {
  if (item.id === 'pending-community-requests') {
    return t('superadmin.controlCenter.attentionItems.pendingCommunityRequestsDetail');
  }
  if (item.id === 'database-partial' || item.id === 'database-unavailable') {
    return t('superadmin.controlCenter.attentionItems.databaseDetail');
  }
  if (item.id.startsWith('job-') || item.id.startsWith('stuck-job-') || item.id.startsWith('partial-job-')) {
    const [jobId, rawDate] = item.detail.split(' · ', 2);
    const formatted = formatDateTime(rawDate, locale);
    return formatted ? `${jobId} · ${formatted}` : jobId;
  }
  return item.detail;
}

function StatusPill({ status, t }: { status: string; t: Translate }) {
  const normalized = status.toLowerCase();
  const Icon = STATUS_ICON[normalized] ?? AlertCircle;
  const classes = STATUS_STYLES[normalized] ?? STATUS_STYLES.unknown;

  return (
    <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}>
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {statusLabel(t, normalized)}
    </span>
  );
}

function formatDateTime(value: string | undefined, locale: 'hu' | 'en'): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'hu-HU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function LoadingState({ t }: { t: Translate }) {
  return (
    <div role="status" aria-live="polite" className="space-y-5">
      <span className="sr-only">{t('superadmin.controlCenter.loading')}</span>
      <div className="h-40 animate-pulse rounded-3xl border border-canvas-line bg-white shadow-card motion-reduce:animate-none" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {SUMMARY_ITEMS.map(({ key }) => (
          <div key={key} className="h-28 animate-pulse rounded-2xl border border-canvas-line bg-white shadow-card motion-reduce:animate-none" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-2xl border border-canvas-line bg-white shadow-card motion-reduce:animate-none" />
        <div className="h-72 animate-pulse rounded-2xl border border-canvas-line bg-white shadow-card motion-reduce:animate-none" />
      </div>
    </div>
  );
}

function EmptyList({ children }: { children: string }) {
  return (
    <div className="rounded-xl border border-dashed border-canvas-line bg-canvas-sage px-4 py-6 text-center text-sm text-canvas-muted">
      {children}
    </div>
  );
}

export default function SuperadminControlCenter({ onOpenTab }: SuperadminControlCenterProps) {
  const { locale, t } = useI18n();
  const [snapshot, setSnapshot] = useState<ControlCenterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refresh = useCallback(() => setRefreshIndex(index => index + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch('/api/superadmin/control-center', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('CONTROL_CENTER_LOAD_FAILED');
        const payload = normalizeControlCenterResponse(await response.json());
        if (!payload) {
          throw new Error('CONTROL_CENTER_RESPONSE_INVALID');
        }
        setSnapshot(payload);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error('Superadmin control-center snapshot failed', loadError);
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [refreshIndex]);

  const partialSections = useMemo(
    () => snapshot?.sections.filter(section => ['degraded', 'unavailable'].includes(section.status.toLowerCase())) ?? [],
    [snapshot],
  );

  if (loading && !snapshot) return <LoadingState t={t} />;

  if (error && !snapshot) {
    return (
      <section role="alert" className="rounded-3xl border border-rose-200 bg-white p-6 shadow-card sm:p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 ring-1 ring-rose-200">
          <AlertCircle aria-hidden="true" className="h-5 w-5" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-canvas-ink">{t('superadmin.controlCenter.errorTitle')}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-canvas-muted">{t('superadmin.controlCenter.errorBody')}</p>
        <button type="button" onClick={refresh} className="btn-primary mt-5 min-h-11 px-4 py-2.5">
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          {t('superadmin.controlCenter.retry')}
        </button>
      </section>
    );
  }

  if (!snapshot) return null;

  const refreshedAt = formatDateTime(snapshot.generatedAt, locale);
  const releaseDate = formatDateTime(snapshot.release.deployedAt, locale);
  const contractStatus = snapshot.schemaVersion === CONTROL_CENTER_SCHEMA_VERSION
    && snapshot.manifestFingerprint === CONTROL_CENTER_MANIFEST_FINGERPRINT
    ? 'match'
    : 'mismatch';

  return (
    <div className="space-y-5" aria-busy={loading}>
      <section aria-labelledby="control-center-heading" className="overflow-hidden rounded-3xl border border-canvas-line bg-white shadow-card">
        <div className="grid gap-6 bg-gradient-to-br from-white via-white to-brand-50/70 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-800 ring-1 ring-brand-200">
                <Activity aria-hidden="true" className="h-5 w-5" />
              </div>
              <StatusPill status={snapshot.overallStatus} t={t} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-800">
              {t('superadmin.controlCenter.eyebrow')}
            </p>
            <h2 id="control-center-heading" className="mt-2 max-w-3xl text-2xl font-semibold tracking-tight text-canvas-ink sm:text-3xl">
              {t('superadmin.controlCenter.title')}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-canvas-muted sm:text-base">
              {t('superadmin.controlCenter.subtitle')}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="btn-secondary min-h-11 px-4 py-2.5"
            >
              <RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} />
              {loading ? t('superadmin.controlCenter.refreshing') : t('superadmin.controlCenter.refresh')}
            </button>
            {refreshedAt && (
              <p className="text-xs text-canvas-muted">
                {t('superadmin.controlCenter.updatedAt')} {refreshedAt}
              </p>
            )}
          </div>
        </div>
      </section>

      {error && (
        <div role="status" aria-live="polite" className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{t('superadmin.controlCenter.staleTitle')}</p>
              <p className="mt-0.5 text-xs leading-5">{t('superadmin.controlCenter.staleBody')}</p>
            </div>
          </div>
          <button type="button" onClick={refresh} className="min-h-11 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-amber-100">
            {t('superadmin.controlCenter.retry')}
          </button>
        </div>
      )}

      {partialSections.length > 0 && (
        <section aria-labelledby="partial-data-heading" className="rounded-2xl border border-amber-200 bg-canvas-warm p-4 sm:p-5">
          <div className="flex gap-3">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
            <div className="min-w-0 flex-1">
              <h3 id="partial-data-heading" className="text-sm font-semibold text-amber-950">{t('superadmin.controlCenter.partialTitle')}</h3>
              <p className="mt-1 text-xs leading-5 text-amber-900">{t('superadmin.controlCenter.partialBody')}</p>
              <ul className="mt-3 flex flex-wrap gap-2" role="list">
                {partialSections.map(section => (
                  <li key={section.id} className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs text-amber-950">
                    <span className="font-semibold">
                      {messageOrFallback(t, `superadmin.controlCenter.sections.${section.id}`, section.id)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{statusLabel(t, section.status)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="platform-summary-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 id="platform-summary-heading" className="text-lg font-semibold text-canvas-ink">{t('superadmin.controlCenter.summary.title')}</h3>
            <p className="mt-1 text-sm text-canvas-muted">{t('superadmin.controlCenter.summary.subtitle')}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {SUMMARY_ITEMS.map(({ key, labelKey, Icon }) => {
            const value = snapshot.summary[key];
            return (
              <article key={key} className="rounded-2xl border border-canvas-line bg-white p-4 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-canvas-muted">{t(labelKey)}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-canvas-sage text-brand-800 ring-1 ring-canvas-line">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-5 text-3xl font-semibold tabular-nums tracking-tight text-canvas-ink">
                  {value === null ? '—' : value.toLocaleString(locale === 'en' ? 'en-GB' : 'hu-HU')}
                </p>
                {value === null && <p className="mt-1 text-xs text-canvas-muted">{t('superadmin.controlCenter.notAvailable')}</p>}
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-12">
        <section aria-labelledby="attention-heading" className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card xl:col-span-7">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 id="attention-heading" className="text-lg font-semibold text-canvas-ink">{t('superadmin.controlCenter.attention.title')}</h3>
              <p className="mt-1 text-sm text-canvas-muted">{t('superadmin.controlCenter.attention.subtitle')}</p>
            </div>
            <span className="rounded-full border border-canvas-line bg-canvas-sage px-3 py-1 text-xs font-semibold tabular-nums text-canvas-ink">
              {snapshot.attention.length}
            </span>
          </div>
          {snapshot.attention.length === 0 ? (
            <EmptyList>{t('superadmin.controlCenter.attention.empty')}</EmptyList>
          ) : (
            <ul className="space-y-2" role="list">
              {snapshot.attention.map(item => {
                const severity = item.severity.toLowerCase();
                const Icon = STATUS_ICON[severity] ?? AlertCircle;
                const destination = destinationFromHref(item.href);
                return (
                  <li key={item.id} className="rounded-xl border border-canvas-line bg-canvas-sage p-4">
                    <div className="flex gap-3">
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${STATUS_STYLES[severity] ?? STATUS_STYLES.unknown}`}>
                        <Icon aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-semibold text-canvas-ink">{attentionTitle(t, item)}</p>
                          {typeof item.count === 'number' && (
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-canvas-ink ring-1 ring-canvas-line">
                              {item.count.toLocaleString(locale === 'en' ? 'en-GB' : 'hu-HU')}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm leading-5 text-canvas-muted">{attentionDetail(t, item, locale)}</p>
                        {destination ? (
                          <button
                            type="button"
                            onClick={() => onOpenTab(destination)}
                            className="mt-3 inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-sm font-semibold text-brand-800 underline-offset-4 hover:underline"
                          >
                            {t('superadmin.controlCenter.open')}
                            <ChevronRight aria-hidden="true" className="h-4 w-4" />
                          </button>
                        ) : item.href ? (
                          <a href={item.href} className="mt-3 inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-sm font-semibold text-brand-800 underline-offset-4 hover:underline">
                            {t('superadmin.controlCenter.open')}
                            <ChevronRight aria-hidden="true" className="h-4 w-4" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="integrations-heading" className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card xl:col-span-5">
          <div className="mb-4">
            <h3 id="integrations-heading" className="text-lg font-semibold text-canvas-ink">{t('superadmin.controlCenter.integrations.title')}</h3>
            <p className="mt-1 text-sm text-canvas-muted">{t('superadmin.controlCenter.integrations.subtitle')}</p>
          </div>
          {snapshot.integrations.length === 0 ? (
            <EmptyList>{t('superadmin.controlCenter.integrations.empty')}</EmptyList>
          ) : (
            <ul className="divide-y divide-canvas-line" role="list">
              {snapshot.integrations.map(integration => {
                const checkedAt = formatDateTime(integration.lastCheckedAt, locale);
                return (
                  <li key={integration.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-canvas-ink">
                          {messageOrFallback(t, `superadmin.controlCenter.integrationNames.${integration.id}`, integration.label)}
                        </p>
                        {integration.description && <p className="mt-1 text-xs leading-5 text-canvas-muted">{integration.description}</p>}
                        {checkedAt && (
                          <p className="mt-1 inline-flex items-center gap-1 text-xs text-canvas-muted">
                            <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                            {checkedAt}
                          </p>
                        )}
                      </div>
                      <StatusPill status={integration.status} t={t} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <section aria-labelledby="audit-heading" className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card xl:col-span-7">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 id="audit-heading" className="text-lg font-semibold text-canvas-ink">{t('superadmin.controlCenter.audit.title')}</h3>
              <p className="mt-1 text-sm text-canvas-muted">{t('superadmin.controlCenter.audit.subtitle')}</p>
            </div>
            <Shield aria-hidden="true" className="h-5 w-5 text-brand-800" />
          </div>
          {snapshot.recentAudit.length === 0 ? (
            <EmptyList>{t('superadmin.controlCenter.audit.empty')}</EmptyList>
          ) : (
            <ol className="space-y-1" role="list">
              {snapshot.recentAudit.map(event => {
                const eventDate = formatDateTime(event.createdAt, locale);
                const actor = event.actor
                  ? messageOrFallback(t, `superadmin.controlCenter.audit.actors.${event.actor}`, event.actor)
                  : t('superadmin.controlCenter.audit.actors.system');
                const target = event.target
                  ? messageOrFallback(t, `superadmin.controlCenter.audit.targets.${translationToken(event.target)}`, event.target)
                  : null;
                return (
                  <li key={event.id} className="grid gap-2 rounded-xl px-3 py-3 hover:bg-canvas-sage sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-canvas-ink">
                        {messageOrFallback(t, `superadmin.controlCenter.audit.actions.${translationToken(event.action)}`, event.action)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-canvas-muted">
                        {[actor, target].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      {event.status && <StatusPill status={event.status} t={t} />}
                      {eventDate && <time dateTime={event.createdAt} className="text-xs text-canvas-muted">{eventDate}</time>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <div className="space-y-5 xl:col-span-5">
          <section aria-labelledby="release-heading" className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="release-heading" className="text-lg font-semibold text-canvas-ink">{t('superadmin.controlCenter.release.title')}</h3>
                <p className="mt-1 text-sm text-canvas-muted">{t('superadmin.controlCenter.release.subtitle')}</p>
              </div>
              <StatusPill status={snapshot.release.status} t={t} />
            </div>
            <dl className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
              <dt className="text-canvas-muted">{t('superadmin.controlCenter.release.environment')}</dt>
              <dd className="truncate text-right font-semibold text-canvas-ink">
                {messageOrFallback(t, `superadmin.controlCenter.environments.${snapshot.release.environment}`, snapshot.release.environment)}
              </dd>
              <dt className="text-canvas-muted">{t('superadmin.controlCenter.release.version')}</dt>
              <dd className="truncate text-right font-mono text-xs font-semibold text-canvas-ink">{snapshot.release.version ?? t('superadmin.controlCenter.notAvailable')}</dd>
              <dt className="text-canvas-muted">{t('superadmin.controlCenter.release.commit')}</dt>
              <dd className="truncate text-right font-mono text-xs font-semibold text-canvas-ink">{snapshot.release.commitSha?.slice(0, 12) ?? t('superadmin.controlCenter.notAvailable')}</dd>
              <dt className="text-canvas-muted">{t('superadmin.controlCenter.release.deployment')}</dt>
              <dd className="truncate text-right font-mono text-xs font-semibold text-canvas-ink">{snapshot.release.deploymentId ?? t('superadmin.controlCenter.notAvailable')}</dd>
              <dt className="text-canvas-muted">{t('superadmin.controlCenter.release.deployedAt')}</dt>
              <dd className="text-right font-semibold text-canvas-ink">{releaseDate ?? t('superadmin.controlCenter.notAvailable')}</dd>
              <dt className="self-center text-canvas-muted">{t('superadmin.controlCenter.release.contract')}</dt>
              <dd className="flex justify-end"><StatusPill status={contractStatus} t={t} /></dd>
            </dl>
          </section>

          <section aria-labelledby="quick-access-heading" className="rounded-2xl border border-canvas-line bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Settings aria-hidden="true" className="h-5 w-5 text-brand-800" />
              <h3 id="quick-access-heading" className="text-lg font-semibold text-canvas-ink">{t('superadmin.controlCenter.quickAccess.title')}</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {([
                ['communityRequests', 'superadmin.controlCenter.quickAccess.communityRequests'],
                ['users', 'superadmin.controlCenter.quickAccess.users'],
                ['features', 'superadmin.controlCenter.quickAccess.features'],
                ['operations', 'superadmin.controlCenter.quickAccess.operations'],
              ] as const).map(([tab, labelKey]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => onOpenTab(tab)}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-canvas-line bg-canvas-sage px-3 py-2.5 text-left text-sm font-semibold text-canvas-ink hover:border-brand-300 hover:bg-brand-50"
                >
                  {t(labelKey)}
                  <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-800" />
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
