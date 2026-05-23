import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BarChart2,
  Wind,
  Thermometer,
  Volume2,
  ArrowRight,
  Database,
  MapPin,
  Users,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Budapest Városi Adatelemzések — PanelLakó Elemzések',
  description:
    'Budapest tömegközlekedés, levegőminőség, zöldterület, zajszennyezés és klímakockázat interaktív elemzései — nyílt adatokból, lakóknak és döntéshozóknak.',
  alternates: { canonical: 'https://panellako.hu/elemzes' },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Főoldal',
      item: 'https://panellako.hu',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Elemzések',
      item: 'https://panellako.hu/elemzes',
    },
  ],
};

const DATA_SOURCES = [
  { name: 'BKK GTFS', desc: 'Budapest Közlekedési Központ menetrendadatok' },
  { name: 'OpenAQ / Copernicus', desc: 'Európai légszennyezettség-mérési adatok' },
  { name: 'HungaroMet OMSZ', desc: 'Időjárás, klíma és zajszennyezési mérések' },
  { name: 'OpenStreetMap', desc: 'Nyílt térkép és épület-adatok' },
  { name: 'KSH', desc: 'Központi Statisztikai Hivatal demográfiai adatok' },
];

const RESIDENT_BENEFITS = [
  'Megalapozott döntés arról, melyik kerületbe érdemes költözni tömegközlekedési lefedettség alapján.',
  'Levegőminőségi és zajszennyezési adatok segítségével azonosíthatók a csendesebb, egészségesebb utcák.',
  'Klímakockázati térképek megmutatják, hogy egy adott ingatlan mennyire kitett a hősziget-effektusnak.',
  'Átlátható, nyílt adatokon alapuló elemzések — nem marketing szöveg, hanem valódi mérési eredmények.',
];

export default function ElemzesekHubPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <PublicNav />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Breadcrumb */}
        <nav aria-label="Navigáció" className="mb-8 flex items-center gap-2 text-sm text-slate-400">
          <Link href="/" className="hover:text-brand-600 transition-colors">Főoldal</Link>
          <span>/</span>
          <span className="font-medium text-slate-700">Elemzések</span>
        </nav>

        {/* Hero */}
        <div className="mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-700">
            <BarChart2 size={13} />
            Városi adatok
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Budapest városi adatelemzések
          </h1>
          <p className="max-w-2xl text-lg text-slate-500">
            Nyílt adatokból készített, interaktív térképek és elemzések Budapest kerületeire
          </p>
        </div>

        {/* Mission section */}
        <section aria-labelledby="mission-heading" className="mb-14 rounded-2xl border border-slate-100 bg-slate-50 px-7 py-8">
          <h2 id="mission-heading" className="mb-4 text-xl font-black text-slate-900">
            Miért készítünk városadatokat?
          </h2>
          <div className="space-y-3 text-slate-600 leading-relaxed">
            <p>
              Budapest fejlődése és a lakók mindennapi döntései szorosan összefonódnak — mégis kevesen tudják, hogy pontosan melyik kerületben a legjobb a tömegközlekedési lefedettség, hol a legtisztább a levegő, vagy hol a legnagyobb a hősziget-kockázat. Mi ezt meg akarjuk változtatni.
            </p>
            <p>
              Célunk az átláthatóság: kizárólag nyílt, ellenőrizhető forrásokból (BKK, OMSZ, OpenStreetMap, EU Copernicus) dolgozunk fel adatokat, és közérthető, interaktív vizualizációkban tesszük elérhetővé őket. Nincs mögötte reklám vagy ingatlanpiaci érdek — csak az adat.
            </p>
            <p>
              Hiszünk abban, hogy a tájékozott lakók jobb döntéseket hoznak: legyen szó lakásvásárlásról, albérlet-keresésről, vagy éppen arról, hogy megértsék, miért fáj a fejük bizonyos napokon. A városadatok segítenek mindebben — ha hozzáférhetők és érthetők.
            </p>
            <p>
              Elemzéseink lakóknak, önkormányzatoknak és döntéshozóknak egyaránt szólnak. Mindegyik elemzés ingyenesen elérhető, nyílt forrású adatokon alapul, és rendszeresen frissítjük őket.
            </p>
          </div>
        </section>

        {/* Analysis cards */}
        <section aria-labelledby="analyses-heading" className="mb-14">
          <h2 id="analyses-heading" className="mb-6 text-2xl font-black text-slate-900">
            Elérhető elemzések
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">

            {/* Card 1 — live */}
            <Link
              href="/elemzes/budapest-kozlekedes"
              className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                  <MapPin size={22} className="text-brand-600" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Élő adatok
                </span>
              </div>
              <h3 className="mb-2 text-lg font-black text-slate-900">
                Budapest tömegközlekedés
              </h3>
              <p className="flex-1 text-sm leading-relaxed text-slate-500">
                Budapest összes tömegközlekedési vonala GTFS-adatok alapján: villamos, metró, busz, HÉV, trolibusz és hajójáratok interaktív térképen — 420 m bufferzónákkal és megálló-sűrűséggel.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {['GTFS', 'BKK', 'Interaktív térkép'].map((tag) => (
                  <span key={tag} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 transition-colors hover:text-brand-700">
                Megnyitom
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>

            {/* Card 2 — coming soon */}
            <div className="relative flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6 opacity-70">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-200">
                  <Wind size={22} className="text-slate-400" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-500">
                  Hamarosan
                </span>
              </div>
              <h3 className="mb-2 text-lg font-black text-slate-700">
                Levegőminőség
              </h3>
              <p className="flex-1 text-sm leading-relaxed text-slate-400">
                Budapest kerületeinek PM2.5 és PM10 szennyezettségi adatai, pollenkoncentráció és EU határértékek összehasonlítása.
              </p>
            </div>

            {/* Card 3 — coming soon */}
            <div className="relative flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6 opacity-70">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-200">
                  <Thermometer size={22} className="text-slate-400" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-500">
                  Hamarosan
                </span>
              </div>
              <h3 className="mb-2 text-lg font-black text-slate-700">
                Hőszigetek
              </h3>
              <p className="flex-1 text-sm leading-relaxed text-slate-400">
                Budapest urban heat island térképe, épület szintű klímakockázat-elemzés.
              </p>
            </div>

            {/* Card 4 — coming soon */}
            <div className="relative flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6 opacity-70">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-200">
                  <Volume2 size={22} className="text-slate-400" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-500">
                  Hamarosan
                </span>
              </div>
              <h3 className="mb-2 text-lg font-black text-slate-700">
                Zajszennyezés
              </h3>
              <p className="flex-1 text-sm leading-relaxed text-slate-400">
                Budapest zajszennyezési térképe HungaroMet és NIF Zrt. adatok alapján.
              </p>
            </div>

          </div>
        </section>

        {/* Data sources */}
        <section aria-labelledby="sources-heading" className="mb-14 rounded-2xl border border-slate-100 bg-slate-50 px-7 py-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
              <Database size={18} className="text-brand-600" />
            </div>
            <h2 id="sources-heading" className="text-xl font-black text-slate-900">
              Adatforrásaink
            </h2>
          </div>
          <p className="mb-5 text-sm text-slate-500">
            Minden elemzésünk kizárólag nyilvánosan elérhető, ellenőrizhető adatforrásokon alapul. Nem használunk fizetős vagy zárt adatbázisokat.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {DATA_SOURCES.map((src) => (
              <div key={src.name} className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
                <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
                <div>
                  <p className="text-sm font-bold text-slate-800">{src.name}</p>
                  <p className="text-xs text-slate-500">{src.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why useful for residents */}
        <section aria-labelledby="benefits-heading" className="mb-14">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <Users size={18} className="text-brand-600" />
            </div>
            <h2 id="benefits-heading" className="text-xl font-black text-slate-900">
              Miért hasznos ez lakóknak?
            </h2>
          </div>
          <div className="space-y-3">
            {RESIDENT_BENEFITS.map((benefit, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
                <TrendingUp size={17} className="mt-0.5 shrink-0 text-brand-500" />
                <p className="text-sm leading-relaxed text-slate-600">{benefit}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related content */}
        <section aria-labelledby="related-heading" className="mb-14">
          <h2 id="related-heading" className="mb-5 text-xl font-black text-slate-900">
            Kapcsolódó tartalmak
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/levegominoseg-budapest"
              className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <Wind size={18} className="text-slate-400" />
                <span className="text-sm font-bold text-slate-800">Levegőminőség Budapest</span>
              </div>
              <ArrowRight size={16} className="text-slate-400 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/tarsashaz-kezeles"
              className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <BarChart2 size={18} className="text-slate-400" />
                <span className="text-sm font-bold text-slate-800">Társasházkezelés</span>
              </div>
              <ArrowRight size={16} className="text-slate-400 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-md">
          <h2 className="mb-2 text-2xl font-black text-white">
            Tömegközlekedési elemzés most érhető el
          </h2>
          <p className="mb-6 text-brand-100">
            Nézze meg Budapest összes vonalát interaktív térképen — ingyenesen.
          </p>
          <Link
            href="/elemzes/budapest-kozlekedes"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-transform hover:scale-[1.03]"
          >
            Térkép megnyitása
            <ArrowRight size={16} />
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
