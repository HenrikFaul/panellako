'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import Logo from '@/components/logo';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (!hasSupabaseConfig || !supabase) {
      setStatus('Supabase konfiguráció hiányzik, a belépés demo módban van.');
      return;
    }

    setLoading(true);
    const redirectTo = `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo
      }
    });
    setLoading(false);
    setStatus(error ? `Hiba: ${error.message}` : `Belépési link elküldve. Redirect cél: ${redirectTo}`);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#ccfbf1_0,#f8fafc_42%,#eef2ff_100%)] px-4">
      <section className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-7 shadow-[0_18px_70px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <Logo className="h-12 w-12" />
          <div>
            <h1 className="text-xl font-black tracking-tight">PanelLakó belépés</h1>
            <p className="text-sm text-slate-500">Biztonságos magic link bejelentkezés</p>
          </div>
        </div>

        <form className="space-y-3" onSubmit={submit}>
          <label className="block text-sm font-bold">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            placeholder="nev@email.hu"
          />
          <button disabled={loading} className="w-full rounded-2xl bg-brand-600 px-4 py-3 font-black text-white shadow-lg shadow-brand-100 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? 'Küldés...' : 'Belépési link küldése'}
          </button>
        </form>

        {status ? <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{status}</p> : null}

        <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          Ha Supabase rossz helyre dob vissza, az Authentication → URL Configuration alatt a Site URL és Redirect URLs mezőket kell a Vercel / saját domain URL-re állítani.
        </div>

        <Link href="/" className="mt-6 inline-block text-sm font-bold text-brand-700 hover:underline">← Vissza a főoldalra</Link>
      </section>
    </main>
  );
}
