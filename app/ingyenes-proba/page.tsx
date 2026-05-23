import type { Metadata } from 'next';
import type { Route } from 'next';
import Link from 'next/link';
import {
  CheckCircle,
  ArrowRight,
  Building2,
  Shield,
  Users,
  Calculator,
  Vote,
  FolderOpen,
  Bell,
  Zap,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Ingyenes Próba — PanelLakó Társasházkezelő Szoftver',
  description:
    'Próbálja ki a PanelLakó társasházkezelő szoftvert 14 napig ingyen, kártyaadat nélkül. Azonnali hozzáférés az összes funkcióhoz — hibabejelentés, közös költség, online közgyűlés.',
  alternates: { canonical: 'https://panellako.hu/ingyenes-proba' },
  openGraph: {
    title: 'Ingyenes Próba — PanelLakó Társasházkezelő Szoftver',
    description:
      '14 napos ingyenes próba kártyaadat nélkül. Próbálja ki a PanelLakó összes funkcióját: hibabejelentés, közös költség, dokumentumtár, online közgyűlés.',
    url: 'https://panellako.hu/ingyenes-proba',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Valóban ingyenes a próbaidőszak?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Igen, 14 napig az összes funkció korlátlanul elérhető. Kártyaadatot nem kérünk a regisztrációhoz. A próbaidőszak végén automatikusan leáll a hozzáférés — fizetés csak akkor indul, ha tudatosan vált fizetős csomagra.',
      },
    },
    {
      '@type': 'Question',
      name: 'Mi szükséges a regisztrációhoz?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Csak egy e-mail cím és egy jelszó. Nincs szükség kártyaadatra, céges adatokra vagy telefonszámra az ingyenes próba elindításához.',
      },
    },
    {
      '@type': 'Question',
      name: 'Mennyi ideig tart a beállítás?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Az alap épületprofil 10-15 perc alatt elkészíthető: épület neve és címe, lakások száma, és az első bejelentés elindítható. Az összes funkció azonnal elérhető, nincs várakozási idő.',
      },
    },
    {
      '@type': 'Question',
      name: 'Megmaradnak az adataim a próbaidőszak után?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ha fizetős csomagra vált, minden adat megmarad. Ha nem folytatja, az adatokat töröljük a GDPR szabályoknak megfelelően, 30 nappal a próbaidőszak lejárta után.',
      },
    },
    {
      '@type': 'Question',
      name: 'Ingyenes a szoftver társasházaknak?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '14 napig teljes egészében ingyenes a PanelLakó. Utána az árazás az épület méretétől függ — kis társasházaknak (≤20 albetét) elérhető Alap csomag, közepes és nagyobb épületeknek Professzionális és Enterprise csomagok állnak rendelkezésre.',
      },
    },
  ],
};

const FEATURES = [
  { icon: Bell, title: 'Hibabejelentés és feladatkezelés', desc: 'Lakók bejelentik, Ön kezeli — minden státusz és kommunikáció egy helyen.' },
  { icon: Calculator, title: 'Közös költség nyilvántartás', desc: 'Bevételek, kiadások, hátralékosok — havi automatikus kimutatással.' },
  { icon: FolderOpen, title: 'Digitális dokumentumtár', desc: 'SZMSZ, közgyűlési határozatok, szerződések — biztonságosan tárolva.' },
  { icon: Vote, title: 'Online közgyűlés és szavazás', desc: 'Elektronikus meghívó, napirend, szavazás és határozatkönyv.' },
  { icon: Users, title: 'Lakói kommunikáció', desc: 'E-mail és push értesítések minden fontos eseményről automatikusan.' },
  { icon: Zap, title: 'Könyvelői export', desc: 'Könyvelőknek szóló kimutatások egy kattintással, ANYK-kompatibilis formátumban.' },
];

const STEPS = [
  { n: '1', title: 'Regisztráció', desc: 'E-mail cím és jelszó — kártyaadat nélkül, 1 perc alatt.' },
  { n: '2', title: 'Épület hozzáadása', desc: 'Épület neve, címe, lakások száma — 10 perc.' },
  { n: '3', title: 'Meghívja a lakókat', desc: 'E-mail meghívó küldése a lakóknak és könyvelőnek.' },
  { n: '4', title: 'Működik', desc: 'Az első hibabejelentés perceken belül megérkezik.' },
];

export default function IngyenesProbaPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <PublicNav />

      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-brand-600 to-sky-600 py-20 sm:py-24 text-center">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold text-white ring-1 ring-white/30 mb-6">
              14 nap · Kártyaadat nélkül · Azonnali hozzáférés
            </span>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Próbálja ki ingyen a PanelLakót
            </h1>
            <p className="mt-6 mx-auto max-w-2xl text-lg leading-relaxed text-white/85">
              A PanelLakó ingyenes próbaidőszaka alatt az összes funkció — hibabejelentés,
              közös költség, dokumentumtár, online közgyűlés — korlátozás nélkül elérhető.
              14 nap, kártyaadat nélkül, automatikus leállással.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-black text-brand-700 shadow-lg transition-colors hover:bg-brand-50"
              >
                <CheckCircle size={18} />
                Ingyenes próba indítása
              </Link>
              <Link
                href={"/arak" as Route}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/20"
              >
                Árak megtekintése <ArrowRight size={16} />
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/80">
              {['Nincs kártyaadat', 'Nincs telepítés', 'GDPR-megfelelő', 'Magyar fejlesztés'].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-white/60" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Mit kap az ingyenes próbában */}
        <section className="py-16 sm:py-20 bg-slate-50">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-black text-slate-900 mb-12">
              Mi érhető el az ingyenes próba alatt?
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                      <Icon size={22} className="text-brand-600" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 mb-1">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-500">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Hogyan kezdje */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-black text-slate-900 mb-12">
              4 lépés az első bejelentésig
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s) => (
                <div key={s.n} className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-xl font-black text-white">
                    {s.n}
                  </div>
                  <h3 className="text-base font-black text-slate-900 mb-1">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ki használja */}
        <section className="py-16 sm:py-20 bg-slate-50">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-black text-slate-900 mb-10">
              Kinek szól a PanelLakó ingyenes próbája?
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                {
                  icon: Building2,
                  title: 'Közös képviselőknek',
                  items: ['Hibabejelentések digitalizálása', 'Közgyűlés online lebonyolítása', 'Hátralékosok automatikus nyomon követése'],
                },
                {
                  icon: Calculator,
                  title: 'Könyvelőknek',
                  items: ['Könyvelői export egy kattintással', 'Bevételek és kiadások strukturáltan', 'Párhuzamos épületek kezelése'],
                },
                {
                  icon: Users,
                  title: 'Lakóknak',
                  items: ['Hibabejelentés telefonról', 'Közlemények és értesítések', 'Közgyűlési dokumentumok hozzáférése'],
                },
              ].map((group) => {
                const Icon = group.icon;
                return (
                  <div key={group.title} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                      <Icon size={22} className="text-brand-600" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 mb-3">{group.title}</h3>
                    <ul className="space-y-2">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                          <CheckCircle size={14} className="mt-0.5 shrink-0 text-brand-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-black text-slate-900 mb-10">
              Kérdések az ingyenes próbáról
            </h2>
            <div className="space-y-6">
              {faqSchema.mainEntity.map((faq) => (
                <div key={faq.name} className="border-b border-slate-100 pb-6">
                  <h3 className="text-base font-black text-slate-900 mb-2">{faq.name}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">{faq.acceptedAnswer.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-br from-brand-600 to-brand-700 text-center">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <Shield size={40} className="mx-auto mb-6 text-white/70" />
            <h2 className="text-3xl font-black text-white mb-4">
              Nincs kockázat — próbálja ki most
            </h2>
            <p className="text-brand-100 mb-8 text-lg">
              14 nap, kártyaadat nélkül. Ha nem felel meg, egyszerűen nem folytatja.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-black text-brand-700 shadow-lg transition-colors hover:bg-brand-50"
            >
              <CheckCircle size={18} />
              Regisztráció indítása — ingyenes
            </Link>
            <p className="mt-4 text-sm text-brand-200">
              Kártyaadat nem szükséges · Azonnali hozzáférés · 14 napos próba
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
