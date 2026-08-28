'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { ShieldCheck, UserPlus } from 'lucide-react';
import Logo from '@/components/logo';
import { sanitizeReturnTo } from '@/lib/auth/return-to';
import { createClient, hasSupabaseConfig } from '@/lib/supabase/browser';

type Notice = { tone: 'error' | 'success'; message: string };

function RegisterForm() {
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('next'), '/onboarding');
  const loginHref = `/login?next=${encodeURIComponent(returnTo)}` as Route;
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    const normalizedName = fullName.trim();
    if (normalizedName.length < 2) {
      setNotice({ tone: 'error', message: 'Add meg a teljes nevedet.' });
      return;
    }
    if (password.length < 8) {
      setNotice({ tone: 'error', message: 'A jelszó legalább 8 karakter hosszú legyen.' });
      return;
    }
    if (password !== passwordConfirmation) {
      setNotice({ tone: 'error', message: 'A két jelszó nem egyezik.' });
      return;
    }
    if (!hasSupabaseConfig) {
      setNotice({ tone: 'error', message: 'A regisztrációs szolgáltatás nincs konfigurálva.' });
      return;
    }

    setLoading(true);
    try {
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('next', returnTo);
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: normalizedName },
          emailRedirectTo: callbackUrl.toString(),
        },
      });

      if (error) {
        setNotice({
          tone: 'error',
          message: 'A regisztráció most nem fejezhető be. Ellenőrizd az adatokat, vagy próbáld újra később.',
        });
        return;
      }

      if (data.session) {
        window.location.assign(returnTo);
        return;
      }

      setNotice({
        tone: 'success',
        message: 'Elküldtük a megerősítő levelet. Az e-mail-címed igazolása után folytathatod az onboardingot.',
      });
      setPassword('');
      setPasswordConfirmation('');
    } catch {
      setNotice({ tone: 'error', message: 'A regisztrációs szolgáltatás átmenetileg nem érhető el.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-surface relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div aria-hidden="true" className="absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-sky-100/55 blur-3xl" />
      <div aria-hidden="true" className="absolute -right-28 top-12 h-96 w-96 rounded-full bg-brand-100/70 blur-3xl" />

      <section className="relative w-full max-w-lg rounded-[1.5rem] border border-canvas-line bg-white p-6 shadow-card-lg sm:p-8" aria-labelledby="register-title">
        <div className="mb-7 flex items-center gap-4">
          <Logo className="h-12 w-12 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">PanelLakó</p>
            <h1 id="register-title" className="mt-1 text-2xl font-semibold tracking-tight text-canvas-ink">Fiók létrehozása</h1>
            <p className="mt-1 text-sm text-canvas-muted">Saját belépés, külön ellenőrzött közösségi hozzáférés.</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit} aria-busy={loading}>
          <div>
            <label htmlFor="register-name" className="mb-1.5 block text-sm font-semibold text-slate-700">Teljes név</label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              maxLength={160}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="input-base min-h-11"
            />
          </div>

          <div>
            <label htmlFor="register-email" className="mb-1.5 block text-sm font-semibold text-slate-700">E-mail</label>
            <input
              id="register-email"
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="register-password" className="mb-1.5 block text-sm font-semibold text-slate-700">Jelszó</label>
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input-base min-h-11"
                aria-describedby="register-password-help"
              />
            </div>
            <div>
              <label htmlFor="register-password-confirmation" className="mb-1.5 block text-sm font-semibold text-slate-700">Jelszó újra</label>
              <input
                id="register-password-confirmation"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                className="input-base min-h-11"
              />
            </div>
          </div>
          <p id="register-password-help" className="text-xs text-canvas-muted">Legalább 8 karakteres, egyedi jelszót használj.</p>

          <div className="rounded-xl border border-brand-100 bg-canvas-sage px-4 py-3">
            <p className="flex gap-2 text-sm leading-relaxed text-brand-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              A regisztráció csak fiókot hoz létre. Lakói, tulajdonosi vagy kezelői jogot kizárólag külön, ellenőrzött folyamat adhat.
            </p>
          </div>

          <button type="submit" disabled={loading} className="btn-primary min-h-11 w-full">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {loading ? 'Fiók létrehozása…' : 'Regisztráció'}
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

        <p className="mt-6 border-t border-canvas-line pt-5 text-center text-sm text-canvas-muted">
          Már van fiókod?{' '}
          <Link href={loginHref} className="rounded font-semibold text-brand-800 hover:text-brand-950">Belépés</Link>
        </p>
      </section>
    </main>
  );
}

function RegisterLoading() {
  return (
    <main className="app-surface flex min-h-screen items-center justify-center px-4 py-10">
      <div className="h-[42rem] w-full max-w-lg animate-pulse rounded-[1.5rem] border border-canvas-line bg-white shadow-card-lg" aria-label="Regisztráció betöltése" />
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterLoading />}>
      <RegisterForm />
    </Suspense>
  );
}
