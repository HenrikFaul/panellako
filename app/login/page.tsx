'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import Logo from '@/components/logo';
import { createClient, hasSupabaseConfig } from '@/lib/supabase/browser';

type Mode = 'magic' | 'password';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const submitMagic = async (event: FormEvent) => {
    event.preventDefault();
    if (!hasSupabaseConfig) {
      setStatus('Supabase konfiguráció hiányzik.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });
    setLoading(false);
    setStatus(error ? `Hiba: ${error.message}` : 'Belépési link elküldve — ellenőrizd az e-mailjedet!');
  };

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!hasSupabaseConfig) {
      setStatus('Supabase konfiguráció hiányzik.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setStatus(`Hiba: ${error.message}`);
    } else {
      window.location.href = '/app';
    }
  };

  return (
    <main className="app-surface flex min-h-screen items-center justify-center px-4 py-8" style={{ backgroundImage: 'none' }}>
      <section className="w-full max-w-md rounded-[1.25rem] border border-canvas-line bg-white p-7 shadow-card-md">

        {/* Logo + heading */}
        <div className="mb-7 flex items-center gap-4">
          <Logo className="h-12 w-12 shrink-0" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-canvas-ink">PanelLakó belépés</h1>
            <p className="mt-0.5 text-sm text-canvas-muted">
              {mode === 'magic' ? 'Biztonságos magic link bejelentkezés' : 'E-mail + jelszó bejelentkezés'}
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="mb-5 flex rounded-xl border border-canvas-line bg-canvas-sage p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => { setMode('magic'); setStatus(''); }}
            className={`min-h-11 flex-1 rounded-lg px-3 py-2 transition-colors ${mode === 'magic' ? 'bg-white text-brand-900 shadow-sm ring-1 ring-canvas-line' : 'text-canvas-muted hover:bg-white/70 hover:text-canvas-ink'}`}
          >
            Magic link
          </button>
          <button
            type="button"
            onClick={() => { setMode('password'); setStatus(''); }}
            className={`min-h-11 flex-1 rounded-lg px-3 py-2 transition-colors ${mode === 'password' ? 'bg-white text-brand-900 shadow-sm ring-1 ring-canvas-line' : 'text-canvas-muted hover:bg-white/70 hover:text-canvas-ink'}`}
          >
            Jelszó
          </button>
        </div>

        <form className="space-y-3.5" onSubmit={mode === 'magic' ? submitMagic : submitPassword}>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base"
              placeholder="nev@email.hu"
            />
          </div>
          {mode === 'password' && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Jelszó</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base"
                placeholder="••••••••"
              />
            </div>
          )}
          <button
            disabled={loading}
            className="btn-primary w-full py-3 text-sm"
          >
            {loading ? 'Betöltés…' : mode === 'magic' ? 'Belépési link küldése' : 'Belépés'}
          </button>
        </form>

        {status ? (
          <p className={`mt-4 rounded-xl px-4 py-3 text-sm ${status.startsWith('Hiba') ? 'border border-rose-200 bg-rose-50 text-rose-800' : 'border border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
            {status}
          </p>
        ) : null}

        {mode === 'password' && (
          <div className="mt-4 rounded-xl border border-brand-200 bg-canvas-sage px-4 py-3 text-xs leading-5 text-brand-900">
            <strong className="font-semibold">Demo fiókok:</strong><br />
            demo.kepviselo@panellako.hu · PanelLako2026!<br />
            demo.lako@panellako.hu · PanelLako2026!<br />
            demo.konyvelo@panellako.hu · PanelLako2026!
          </div>
        )}

        <Link href="/" className="mt-6 inline-block rounded-md text-sm font-semibold text-brand-800 transition-colors hover:text-brand-950">
          ← Vissza a főoldalra
        </Link>
      </section>
    </main>
  );
}
