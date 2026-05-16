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
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#ccfbf1_0,#f8fafc_42%,#eef2ff_100%)] px-4">
      <section className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-7 shadow-[0_18px_70px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <Logo className="h-12 w-12" />
          <div>
            <h1 className="text-xl font-black tracking-tight">PanelLakó belépés</h1>
            <p className="text-sm text-slate-500">
              {mode === 'magic' ? 'Biztonságos magic link bejelentkezés' : 'E-mail + jelszó bejelentkezés'}
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="mb-5 flex rounded-2xl border border-slate-200 bg-slate-50 p-1 text-sm font-bold">
          <button
            type="button"
            onClick={() => { setMode('magic'); setStatus(''); }}
            className={`flex-1 rounded-xl py-2 transition-colors ${mode === 'magic' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Magic link
          </button>
          <button
            type="button"
            onClick={() => { setMode('password'); setStatus(''); }}
            className={`flex-1 rounded-xl py-2 transition-colors ${mode === 'password' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Jelszó
          </button>
        </div>

        <form className="space-y-3" onSubmit={mode === 'magic' ? submitMagic : submitPassword}>
          <div>
            <label className="block text-sm font-bold mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              placeholder="nev@email.hu"
            />
          </div>
          {mode === 'password' && (
            <div>
              <label className="block text-sm font-bold mb-1">Jelszó</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                placeholder="••••••••"
              />
            </div>
          )}
          <button
            disabled={loading}
            className="w-full rounded-2xl bg-brand-600 px-4 py-3 font-black text-white shadow-lg shadow-brand-100 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Betöltés...' : mode === 'magic' ? 'Belépési link küldése' : 'Belépés'}
          </button>
        </form>

        {status ? <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{status}</p> : null}

        {mode === 'password' && (
          <div className="mt-4 rounded-2xl bg-teal-50 px-4 py-3 text-xs leading-5 text-teal-800">
            <strong>Demo fiókok:</strong><br />
            demo.kepviselo@panellako.hu · PanelLako2026!<br />
            demo.lako@panellako.hu · PanelLako2026!<br />
            demo.konyvelo@panellako.hu · PanelLako2026!
          </div>
        )}

        <Link href="/" className="mt-6 inline-block text-sm font-bold text-brand-700 hover:underline">← Vissza a főoldalra</Link>
      </section>
    </main>
  );
}
