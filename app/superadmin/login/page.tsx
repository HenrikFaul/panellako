'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import Logo from '@/components/logo';
import { useI18n } from '@/src/i18n/useI18n';

export default function SuperadminLoginPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/superadmin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? 'SUPERADMIN_LOGIN_FAILED');
        return;
      }
      window.location.assign('/superadmin');
    } catch {
      setError('SUPERADMIN_LOGIN_UNAVAILABLE');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-surface relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div aria-hidden="true" className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-brand-100/65 blur-3xl" />
      <div aria-hidden="true" className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-amber-100/55 blur-3xl" />
      <section className="relative w-full max-w-lg rounded-[1.5rem] border border-canvas-line bg-white p-6 shadow-card-lg sm:p-8" aria-labelledby="platform-login-title">
        <div className="flex items-center gap-4">
          <Logo className="h-12 w-12 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">PanelLakó</p>
            <h1 id="platform-login-title" className="mt-1 text-2xl font-semibold tracking-tight text-canvas-ink">{t('superadmin.login.title')}</h1>
            <p className="mt-1 text-sm text-canvas-muted">{t('superadmin.login.subtitle')}</p>
          </div>
        </div>

        <div className="mt-7 rounded-2xl border border-brand-200 bg-canvas-sage p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-xl border border-brand-200 bg-white p-2 text-brand-800"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <h2 className="font-semibold text-canvas-ink">{t('superadmin.login.namedTitle')}</h2>
              <p className="mt-1 text-sm leading-6 text-canvas-muted">{t('superadmin.login.namedBody')}</p>
            </div>
          </div>
          <Link href={'/login?next=%2Fsuperadmin' as Route} className="btn-primary mt-5 flex min-h-11 w-full items-center justify-center gap-2 px-4 py-2">
            {t('superadmin.login.namedAction')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <details className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <summary className="flex cursor-pointer list-none items-center gap-3 font-semibold text-amber-950">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
            {t('superadmin.login.breakGlassTitle')}
          </summary>
          <p className="mt-3 text-sm leading-6 text-amber-900">{t('superadmin.login.breakGlassBody')}</p>
          <form onSubmit={onSubmit} className="mt-4 space-y-4" aria-busy={loading}>
            <div>
              <label htmlFor="superadmin-legacy-email" className="mb-1.5 block text-sm font-semibold text-slate-800">{t('superadmin.login.email')}</label>
              <input id="superadmin-legacy-email" className="input-base min-h-11 bg-white" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required />
            </div>
            <div>
              <label htmlFor="superadmin-legacy-password" className="mb-1.5 block text-sm font-semibold text-slate-800">{t('superadmin.login.password')}</label>
              <input id="superadmin-legacy-password" className="input-base min-h-11 bg-white" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
            </div>
            {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{t('superadmin.login.failed')} ({error})</p> : null}
            <button type="submit" className="btn-secondary min-h-11 w-full px-4 py-2" disabled={loading}>
              {loading ? t('superadmin.login.breakGlassLoading') : t('superadmin.login.breakGlassAction')}
            </button>
          </form>
        </details>

        <p className="mt-5 text-center text-xs leading-5 text-canvas-muted">{t('superadmin.login.securityNote')}</p>
      </section>
    </main>
  );
}
