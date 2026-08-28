'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Mail } from 'lucide-react';
import Logo from '@/components/logo';
import { createClient, hasSupabaseConfig } from '@/lib/supabase/browser';

type Notice = { tone: 'error' | 'success'; message: string };

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    if (!hasSupabaseConfig) {
      setNotice({ tone: 'error', message: 'A jelszó-helyreállítási szolgáltatás nincs konfigurálva.' });
      return;
    }

    setLoading(true);
    try {
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('next', '/reset-password');
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: callbackUrl.toString(),
      });

      setNotice(error
        ? { tone: 'error', message: 'A kérést most nem sikerült elküldeni. Próbáld újra később.' }
        : { tone: 'success', message: 'Ha a fiók létezik, elküldtük a jelszó-helyreállító levelet.' });
    } catch {
      setNotice({ tone: 'error', message: 'A jelszó-helyreállítás átmenetileg nem érhető el.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-surface flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <section className="w-full max-w-md rounded-[1.5rem] border border-canvas-line bg-white p-6 shadow-card-lg sm:p-8" aria-labelledby="forgot-title">
        <div className="mb-7 flex items-center gap-4">
          <Logo className="h-12 w-12 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">PanelLakó</p>
            <h1 id="forgot-title" className="mt-1 text-2xl font-semibold tracking-tight text-canvas-ink">Elfelejtett jelszó</h1>
            <p className="mt-1 text-sm text-canvas-muted">Biztonságos helyreállító linket küldünk.</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit} aria-busy={loading}>
          <div>
            <label htmlFor="recovery-email" className="mb-1.5 block text-sm font-semibold text-slate-700">E-mail</label>
            <input
              id="recovery-email"
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
          <button type="submit" disabled={loading} className="btn-primary min-h-11 w-full">
            <Mail className="h-4 w-4" aria-hidden="true" />
            {loading ? 'Küldés…' : 'Helyreállító link küldése'}
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
          <Link href="/login" className="rounded font-semibold text-brand-800 hover:text-brand-950">Vissza a belépéshez</Link>
        </p>
      </section>
    </main>
  );
}
