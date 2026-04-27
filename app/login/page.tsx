'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import Logo from '@/components/logo';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (!hasSupabaseConfig || !supabase) {
      setStatus('Supabase konfiguráció hiányzik, a belépés demo módban van.');
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setStatus(error ? `Hiba: ${error.message}` : 'Belépési link elküldve az email címre.');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <Logo className="h-12 w-12" />
          <div>
            <h1 className="text-xl font-semibold">PanelLakó belépés</h1>
            <p className="text-sm text-slate-500">Biztonságos magic link bejelentkezés</p>
          </div>
        </div>

        <form className="space-y-3" onSubmit={submit}>
          <label className="block text-sm font-medium">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="nev@email.hu"
          />
          <button className="w-full rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">Belépési link küldése</button>
        </form>

        {status ? <p className="mt-4 text-sm text-slate-700">{status}</p> : null}

        <Link href="/" className="mt-6 inline-block text-sm text-brand-700 hover:underline">← Vissza a főoldalra</Link>
      </section>
    </main>
  );
}
