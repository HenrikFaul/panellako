import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'PanelLakó – Társasházkezelő szoftver Magyarországon',
  description:
    'Kezeld a közös képviseletet digitálisan: bejelentések, dokumentumok, pénzügyek, közgyűlések — egy platformon, 14 napos ingyenes próbával.',
  openGraph: {
    title: 'PanelLakó – Társasházkezelő szoftver Magyarországon',
    description:
      'Kezeld a közös képviseletet digitálisan: bejelentések, dokumentumok, pénzügyek, közgyűlések — egy platformon.',
  },
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Authenticated users go straight to the building picker
  if (user) {
    redirect('/app');
  }

  // Unauthenticated: show landing page with login CTA
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_top_left,#ccfbf1_0,#f8fafc_30%,#eef2ff_100%)] px-4">
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

      {/* SSR-visible content for crawlers — not displayed to users but indexable */}
      <section className="sr-only">
        <h2>Társasházkezelő szoftver közös képviselőknek és lakóknak</h2>
        <p>
          A PanelLakó egy modern, webalapú társasházi kezelőszoftver, amely lehetővé teszi a
          közös képviselők és lakók számára a digitális kommunikációt, hibabejelentések
          kezelését, dokumentumok tárolását, közös költség nyilvántartását és közgyűlések szervezését.
        </p>
        <ul>
          <li>Hibabejelentések és feladatkezelés</li>
          <li>Dokumentumtár — szabályzatok, közgyűlési jegyzőkönyvek</li>
          <li>Közös költség és pénzügyi átláthatóság</li>
          <li>Közgyűlés szervezés és szavazás</li>
          <li>Lakói értesítések és üzenetek</li>
          <li>Épület-adatok és mérőórák kezelése</li>
        </ul>
        <p>14 napos ingyenes próbaidőszak, kártyaadatok nem szükségesek. Magyar fejlesztés.</p>
      </section>
    </div>
  );
}
