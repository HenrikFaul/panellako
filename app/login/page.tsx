'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { KeyRound, Link2, ShieldCheck } from 'lucide-react';
import Logo from '@/components/logo';
import { sanitizeReturnTo } from '@/lib/auth/return-to';
import { createClient, hasSupabaseConfig } from '@/lib/supabase/browser';

type Mode = 'magic' | 'password';
type Notice = { tone: 'error' | 'success'; message: string };

function LoginForm() {
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('next'));
  const registerHref = `/register?next=${encodeURIComponent(returnTo)}` as Route;
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('error') === 'auth_callback_error') {
      setNotice({
        tone: 'error',
        message: 'A belépési hivatkozás érvénytelen vagy lejárt. Kérj egy új hivatkozást.',
      });
    }
  }, [searchParams]);

  const submitMagic = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    if (!hasSupabaseConfig) {
      setNotice({ tone: 'error', message: 'A belépési szolgáltatás nincs konfigurálva.' });
      return;
    }

    setLoading(true);
    try {
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('next', returnTo);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: callbackUrl.toString(),
          shouldCreateUser: false,
        },
      });

      setNotice(error
        ? { tone: 'error', message: 'A belépési linket most nem sikerült elküldeni. Ellenőrizd az e-mail-címet, majd próbáld újra.' }
        : { tone: 'success', message: 'Ha a fiók létezik, elküldtük a belépési linket. Ellenőrizd az e-mailjeidet.' });
    } catch {
      setNotice({ tone: 'error', message: 'A belépési szolgáltatás átmenetileg nem érhető el.' });
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    if (!hasSupabaseConfig) {
      setNotice({ tone: 'error', message: 'A belépési szolgáltatás nincs konfigurálva.' });
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setNotice({ tone: 'error', message: 'A megadott e-mail-cím vagy jelszó nem megfelelő.' });
        return;
      }

      window.location.assign(returnTo);
    } catch {
      setNotice({ tone: 'error', message: 'A belépési szolgáltatás átmenetileg nem érhető el.' });
    } finally {
      setLoading(false);
    }
  };

  const setActiveMode = (nextMode: Mode) => {
    setMode(nextMode);
    setNotice(null);
  };

  return (
    <main className="app-surface relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div aria-hidden="true" className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-brand-100/65 blur-3xl" />
      <div aria-hidden="true" className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-amber-100/55 blur-3xl" />

      <section className="relative w-full max-w-md rounded-[1.5rem] border border-canvas-line bg-white p-6 shadow-card-lg sm:p-8" aria-labelledby="login-title">
        <div className="mb-7 flex items-center gap-4">
          <Logo className="h-12 w-12 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">PanelLakó</p>
            <h1 id="login-title" className="mt-1 text-2xl font-semibold tracking-tight text-canvas-ink">Belépés</h1>
            <p className="mt-1 text-sm text-canvas-muted">Folytasd a saját lakóközösségedben.</p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-xl border border-canvas-line bg-canvas-sage p-1" role="tablist" aria-label="Belépési mód">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'password'}
            onClick={() => setActiveMode('password')}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${mode === 'password' ? 'bg-white text-brand-900 shadow-sm ring-1 ring-canvas-line' : 'text-canvas-muted hover:bg-white/70 hover:text-canvas-ink'}`}
          >
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Jelszó
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'magic'}
            onClick={() => setActiveMode('magic')}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${mode === 'magic' ? 'bg-white text-brand-900 shadow-sm ring-1 ring-canvas-line' : 'text-canvas-muted hover:bg-white/70 hover:text-canvas-ink'}`}
          >
            <Link2 className="h-4 w-4" aria-hidden="true" />
            Magic link
          </button>
        </div>

        <form className="space-y-4" onSubmit={mode === 'magic' ? submitMagic : submitPassword} aria-busy={loading}>
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-slate-700">E-mail</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input-base min-h-11"
              placeholder="nev@email.hu"
            />
          </div>

          {mode === 'password' && (
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor="login-password" className="text-sm font-semibold text-slate-700">Jelszó</label>
                <Link href={'/forgot-password' as Route} className="rounded text-xs font-semibold text-brand-800 hover:text-brand-950">Elfelejtetted?</Link>
              </div>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input-base min-h-11"
              />
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary min-h-11 w-full">
            {loading ? 'Folyamatban…' : mode === 'magic' ? 'Belépési link küldése' : 'Belépés'}
          </button>
        </form>

        {notice && (
          <p
            role={notice.tone === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            className={`mt-4 rounded-xl border px-4 py-3 text-sm leading-relaxed ${notice.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
          >
            {notice.message}
          </p>
        )}

        {mode === 'password' && (
          <div className="mt-5 rounded-xl border border-brand-100 bg-canvas-sage px-4 py-3 text-xs leading-5 text-brand-900">
            <strong className="font-semibold">Demo fiókok:</strong><br />
            demo.kepviselo@panellako.hu · PanelLako2026!<br />
            demo.lako@panellako.hu · PanelLako2026!<br />
            demo.konyvelo@panellako.hu · PanelLako2026!
          </div>
        )}

        <div className="mt-6 border-t border-canvas-line pt-5 text-center">
          <p className="text-sm text-canvas-muted">
            Még nincs fiókod?{' '}
            <Link href={registerHref} className="rounded font-semibold text-brand-800 hover:text-brand-950">Regisztráció</Link>
          </p>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-canvas-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-700" aria-hidden="true" />
            A fiók létrehozása önmagában nem ad épülethozzáférést.
          </p>
          <Link href="/" className="mt-4 inline-block rounded text-sm font-semibold text-brand-800 hover:text-brand-950">Vissza a főoldalra</Link>
        </div>
      </section>
    </main>
  );
}

function LoginLoading() {
  return (
    <main className="app-surface flex min-h-screen items-center justify-center px-4 py-10">
      <div className="h-[36rem] w-full max-w-md animate-pulse rounded-[1.5rem] border border-canvas-line bg-white shadow-card-lg" aria-label="Belépés betöltése" />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}
