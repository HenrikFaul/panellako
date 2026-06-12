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
    <main className="app-surface flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.06)_0%,transparent_55%)] px-4">
      <section className="w-full max-w-md animate-scale-in rounded-2xl border border-white/[0.08] bg-white/[0.04] p-7 shadow-panel">

        {/* Logo + heading */}
        <div className="mb-7 flex items-center gap-4">
          <Logo className="h-12 w-12 shrink-0" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-100">PanelLakó belépés</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              {mode === 'magic' ? 'Biztonságos magic link bejelentkezés' : 'E-mail + jelszó bejelentkezés'}
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="mb-5 flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => { setMode('magic'); setStatus(''); }}
            className={`flex-1 rounded-lg py-2 transition-colors ${mode === 'magic' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Magic link
          </button>
          <button
            type="button"
            onClick={() => { setMode('password'); setStatus(''); }}
            className={`flex-1 rounded-lg py-2 transition-colors ${mode === 'password' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Jelszó
          </button>
        </div>

        <form className="space-y-3.5" onSubmit={mode === 'magic' ? submitMagic : submitPassword}>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-300">E-mail</label>
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
              <label className="mb-1.5 block text-sm font-semibold text-slate-300">Jelszó</label>
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
          <p className={`mt-4 rounded-xl px-4 py-3 text-sm ${status.startsWith('Hiba') ? 'border border-rose-500/20 bg-rose-500/10 text-rose-300' : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'}`}>
            {status}
          </p>
        ) : null}

        {mode === 'password' && (
          <div className="mt-4 rounded-xl border border-brand-500/20 bg-brand-500/[0.06] px-4 py-3 text-xs leading-5 text-brand-300">
            <strong className="font-semibold">Demo fiókok:</strong><br />
            demo.kepviselo@panellako.hu · PanelLako2026!<br />
            demo.lako@panellako.hu · PanelLako2026!<br />
            demo.konyvelo@panellako.hu · PanelLako2026!
          </div>
        )}

        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-brand-400 hover:text-brand-300">
          ← Vissza a főoldalra
        </Link>
      </section>
    </main>
  );
}
