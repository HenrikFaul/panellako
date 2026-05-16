import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Authenticated users go straight to the building picker
  if (user) {
    redirect('/app');
  }

  // Unauthenticated: show landing page with login CTA
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#ccfbf1_0,#f8fafc_30%,#eef2ff_100%)] px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-sky-500 shadow-lg shadow-teal-900/20">
          <span className="text-2xl font-black text-white">PL</span>
        </div>
        <h1 className="text-3xl font-black text-slate-950">PanelLakó</h1>
        <p className="mt-3 text-slate-500">
          Digitális társasházkezelő platform — bejelentések, dokumentumok, pénzügyek egy helyen.
        </p>
        <Link
          href="/login"
          className="mt-8 flex w-full items-center justify-center rounded-2xl bg-teal-600 px-6 py-3.5 text-sm font-black text-white shadow-md shadow-teal-200 hover:bg-teal-700 transition-colors"
        >
          Bejelentkezés
        </Link>
        <p className="mt-4 text-xs text-slate-400">
          14 napos ingyenes próbaidőszak · Kártyaadatok nem szükségesek
        </p>
      </div>
    </div>
  );
}
