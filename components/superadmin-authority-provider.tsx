'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import SuperadminClient from '@/components/superadmin-client';
import { SuperadminAuthorityContext } from '@/components/superadmin-authority-context';
import type { PlatformAuthorityContext } from '@/lib/superadmin/operator-authority';
import { useI18n } from '@/src/i18n/useI18n';

export function SuperadminAuthorityGate({ initialContext }: { initialContext: PlatformAuthorityContext }) {
  const { t } = useI18n();
  const [context, setContext] = useState(initialContext);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providerValue = useMemo(() => context, [context]);

  async function bootstrap() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/superadmin/operator/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const body = await response.json().catch(() => ({})) as {
        error?: string;
        stepUpHref?: string;
      };
      if (response.status === 428 && body.stepUpHref) {
        window.location.assign(body.stepUpHref);
        return;
      }
      if (!response.ok) {
        setError(body.error ?? 'PLATFORM_BOOTSTRAP_FAILED');
        return;
      }
      const refreshed = await fetch('/api/superadmin/operator/context', { cache: 'no-store' });
      const refreshedBody = await refreshed.json().catch(() => ({})) as { context?: PlatformAuthorityContext };
      if (!refreshed.ok || !refreshedBody.context) {
        window.location.reload();
        return;
      }
      setContext(refreshedBody.context);
    } catch {
      setError('PLATFORM_AUTHORITY_UNAVAILABLE');
    } finally {
      setLoading(false);
    }
  }

  if (context.mode === 'none') {
    return (
      <main className="app-surface flex min-h-screen items-center justify-center px-4 py-10">
        <section className="w-full max-w-lg rounded-[1.5rem] border border-canvas-line bg-white p-7 shadow-card-lg" aria-labelledby="operator-denied-title">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">{t('superadmin.authority.eyebrow')}</p>
          <h1 id="operator-denied-title" className="mt-2 text-2xl font-semibold text-canvas-ink">{t('superadmin.authority.deniedTitle')}</h1>
          <p className="mt-3 text-sm leading-6 text-canvas-muted">{t('superadmin.authority.deniedBody')}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={'/account/security?next=%2Fsuperadmin' as Route} className="btn-secondary min-h-11 px-4 py-2">{t('superadmin.authority.security')}</Link>
            <Link href={'/app' as Route} className="btn-primary min-h-11 px-4 py-2">{t('superadmin.authority.backToApp')}</Link>
          </div>
        </section>
      </main>
    );
  }

  if (context.mode === 'bootstrap') {
    return (
      <main className="app-surface flex min-h-screen items-center justify-center px-4 py-10">
        <section className="w-full max-w-xl rounded-[1.5rem] border border-canvas-line bg-white p-7 shadow-card-lg" aria-labelledby="operator-bootstrap-title">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">{t('superadmin.authority.eyebrow')}</p>
          <h1 id="operator-bootstrap-title" className="mt-2 text-2xl font-semibold text-canvas-ink">{t('superadmin.authority.bootstrapTitle')}</h1>
          <p className="mt-3 text-sm leading-6 text-canvas-muted">{t('superadmin.authority.bootstrapBody')}</p>
          <dl className="mt-5 rounded-xl border border-canvas-line bg-canvas-sage p-4 text-sm">
            <dt className="font-medium text-canvas-muted">{t('superadmin.authority.identity')}</dt>
            <dd className="mt-1 font-semibold text-canvas-ink">{context.operatorEmail ?? context.operatorProfileId}</dd>
            <dt className="mt-3 font-medium text-canvas-muted">{t('superadmin.authority.assurance')}</dt>
            <dd className="mt-1 font-semibold text-canvas-ink">{context.assuranceLevel ?? '—'}</dd>
          </dl>
          <label htmlFor="platform-bootstrap-reason" className="mt-5 block text-sm font-semibold text-canvas-ink">{t('superadmin.authority.reason')}</label>
          <textarea
            id="platform-bootstrap-reason"
            value={reason}
            onChange={event => setReason(event.target.value)}
            minLength={10}
            maxLength={1_000}
            rows={3}
            className="input-base mt-2 resize-y"
            placeholder={t('superadmin.authority.bootstrapReasonPlaceholder')}
          />
          {error ? <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{t('superadmin.authority.bootstrapFailed')} ({error})</p> : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className="btn-primary min-h-11 px-4 py-2" disabled={loading || reason.trim().length < 10} onClick={() => void bootstrap()}>
              {loading ? t('superadmin.authority.bootstrapping') : t('superadmin.authority.bootstrap')}
            </button>
            {context.assuranceLevel !== 'aal2' ? (
              <Link href={'/account/security?next=%2Fsuperadmin' as Route} className="btn-secondary min-h-11 px-4 py-2">{t('superadmin.authority.stepUp')}</Link>
            ) : null}
          </div>
        </section>
      </main>
    );
  }

  return (
    <SuperadminAuthorityContext.Provider value={providerValue}>
      {context.mode === 'break_glass' ? (
        <div role="status" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-950">
          {t('superadmin.authority.breakGlassReadOnly')}
        </div>
      ) : null}
      <SuperadminClient />
    </SuperadminAuthorityContext.Provider>
  );
}
