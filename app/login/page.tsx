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
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top_left,theme(colors.brand.50)_0%,theme(colors.slate.50)_45%,theme(colors.indigo.50/40%)_100%)] px-4">
      <section className="w-full max-w-md animate-scale-in rounded-[2rem] border border-white/70 bg-white/92 p-7 shadow-card-lg backdrop-blur-xl">

        {/* Logo + heading */}
        <div className="mb-7 flex items-center gap-4">
          <Logo className="h-12 w-12 shrink-0" />
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900">PanelLakó belépés</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {mode === 'magic' ? 'Biztonságos magic link bejelentkezés' : 'E-mail + jelszó bejelentkezés'}
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="mb-5 flex rounded-2xl border border-slate-200/80 bg-slate-50 p-1 text-sm font-bold">
          <button
            type="button"
            onClick={() => { setMode('magic'); setStatus(''); }}
            className={`flex-1 rounded-xl py-2 transition-all ${mode === 'magic' ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Magic link
          </button>
          <button
            type="button"
            onClick={() => { setMode('password'); setStatus(''); }}
            className={`flex-1 rounded-xl py-2 transition-all ${mode === 'password' ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-400 hover:text-slate-600'}`}
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
            className="btn-primary w-full py-3 text-sm font-black shadow-md shadow-brand-100"
          >
            {loading ? 'Betöltés…' : mode === 'magic' ? 'Belépési link küldése' : 'Belépés'}
          </button>
        </form>

        {status ? (
          <p className={`mt-4 rounded-2xl px-4 py-3 text-sm ${status.startsWith('Hiba') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {status}
          </p>
        ) : null}

        {mode === 'password' && (
          <div className="mt-4 rounded-2xl bg-teal-50/80 px-4 py-3 text-xs leading-5.5 text-teal-700">
            <strong className="font-bold">Demo fiókok:</strong><br />
            demo.kepviselo@panellako.hu · PanelLako2026!<br />
            demo.lako@panellako.hu · PanelLako2026!<br />
            demo.konyvelo@panellako.hu · PanelLako2026!
          </div>
        )}

        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-brand-700 hover:text-brand-900">
          ← Vissza a főoldalra
        </Link>
      </section>
    </main>
  );
}
