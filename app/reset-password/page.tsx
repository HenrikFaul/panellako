'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { KeyRound } from 'lucide-react';
import Logo from '@/components/logo';
import { createClient, hasSupabaseConfig } from '@/lib/supabase/browser';

type Notice = { tone: 'error' | 'success'; message: string };

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    if (password.length < 8) {
      setNotice({ tone: 'error', message: 'A jelszó legalább 8 karakter hosszú legyen.' });
      return;
    }
    if (password !== passwordConfirmation) {
      setNotice({ tone: 'error', message: 'A két jelszó nem egyezik.' });
      return;
    }
    if (!hasSupabaseConfig) {
      setNotice({ tone: 'error', message: 'A jelszómódosítási szolgáltatás nincs konfigurálva.' });
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setNotice({
          tone: 'error',
          message: 'A jelszót nem sikerült módosítani. Lehet, hogy a helyreállító link lejárt.',
        });
        return;
      }

      setPassword('');
      setPasswordConfirmation('');
      setCompleted(true);
      setNotice({ tone: 'success', message: 'Az új jelszavadat elmentettük.' });
    } catch {
      setNotice({ tone: 'error', message: 'A jelszómódosítás átmenetileg nem érhető el.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-surface flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <section className="w-full max-w-md rounded-[1.5rem] border border-canvas-line bg-white p-6 shadow-card-lg sm:p-8" aria-labelledby="reset-title">
        <div className="mb-7 flex items-center gap-4">
          <Logo className="h-12 w-12 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">PanelLakó</p>
            <h1 id="reset-title" className="mt-1 text-2xl font-semibold tracking-tight text-canvas-ink">Új jelszó beállítása</h1>
            <p className="mt-1 text-sm text-canvas-muted">Adj meg egy új, egyedi jelszót.</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit} aria-busy={loading}>
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold text-slate-700">Új jelszó</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-base min-h-11"
              disabled={completed}
            />
          </div>
          <div>
            <label htmlFor="new-password-confirmation" className="mb-1.5 block text-sm font-semibold text-slate-700">Új jelszó újra</label>
            <input
              id="new-password-confirmation"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              className="input-base min-h-11"
              disabled={completed}
            />
          </div>
          <button type="submit" disabled={loading || completed} className="btn-primary min-h-11 w-full">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            {loading ? 'Mentés…' : 'Jelszó mentése'}
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
          <Link href={completed ? '/app' : '/login'} className="rounded font-semibold text-brand-800 hover:text-brand-950">
            {completed ? 'Tovább a PanelLakóba' : 'Vissza a belépéshez'}
          </Link>
        </p>
      </section>
    </main>
  );
}
