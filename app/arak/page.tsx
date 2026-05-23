import type { Metadata } from 'next';
import type { Route } from 'next';
import Link from 'next/link';
import { CheckCircle, Star, Building2, Zap, Shield, Mail, ArrowRight, Users } from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Árak — PanelLakó Társasházkezelő Szoftver',
  description:
    '14 napos ingyenes próba kártyaadat nélkül. PanelLakó árazása épület méret szerint — kis és nagy társasházak számára is elérhető.',
  alternates: { canonical: '/arak' },
  openGraph: {
    title: 'Árak — PanelLakó Társasházkezelő Szoftver',
    description:
      '14 napos ingyenes próba kártyaadat nélkül. PanelLakó árazása épület méret szerint — kis és nagy társasházak számára is elérhető.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'PanelLakó',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android',
  description:
    'Digitális társasházkezelő platform közös képviselőknek, lakóknak és könyvelőknek.',
  offers: [
    {
      '@type': 'Offer',
      name: 'Alap csomag',
      description: 'Kis társasházaknak, legfeljebb 20 albetéttel.',
      price: '0',
      priceCurrency: 'HUF',
      availability: 'https://schema.org/InStock',
    },
    {
      '@type': 'Offer',
      name: 'Professzionális csomag',
      description: 'Közepes épületeknek, 21–80 albetéttel.',
      price: '0',
      priceCurrency: 'HUF',
      availability: 'https://schema.org/InStock',
    },
    {
      '@type': 'Offer',
      name: 'Enterprise csomag',
      description: 'Nagy épületeknek és ingatlankezelő cégeknek, 80+ albetéttel.',
      price: '0',
      priceCurrency: 'HUF',
      availability: 'https://schema.org/InStock',
    },
  ],
};

const COMMON_FEATURES = [
  'Hibabejelentés és feladatkezelés',
  'Lakói értesítések és üzenetek',
  'Épület-adatok és lakástérkép',
  'Közös költség nyilvántartás',
  'Dokumentumtár (szabályzatok, jegyzőkönyvek)',
  'Online közgyűlés és szavazás',
  'GDPR-megfelelő adatkezelés',
  'Böngészőalapú — semmi telepítés nem szükséges',
];

const TIERS = [
  {
    id: 'alap',
    name: 'Alap',
    subtitle: 'Kis társasházak',
    size: '≤ 20 albetét',
    price: 'Kapcsolat szükséges az árért',
    cta: 'Kapcsolatfelvétel',
    ctaHref: '/kapcsolat',
    highlighted: false,
    icon: Building2,
    features: [
      '5 alapfunkció (hibabejelentés, dokumentumtár, közös költség, üzenetek, közgyűlés)',
      'E-mail alapú ügyfélszolgálat',
      '2 GB tárhely dokumentumokhoz',
      '14 napos ingyenes próbaidőszak',
      'GDPR-megfelelő adatkezelés',
    ],
  },
  {
    id: 'profi',
    name: 'Professzionális',
    subtitle: 'Közepes épületek',
    size: '21–80 albetét',
    price: 'Kapcsolat szükséges az árért',
    cta: 'Kapcsolatfelvétel',
    ctaHref: '/kapcsolat',
    highlighted: true,
    icon: Zap,
    badge: 'Legnépszerűbb',
    features: [
      'Minden Alap csomag funkció',
      'Könyvelő hozzáférés (külön szerepkör)',
      'Bővített dokumentumtár korlátlan tárhellyel',
      'Al-mérőórák leolvasása és naplója',
      'Telefonos ügyfélszolgálat',
      '14 napos ingyenes próbaidőszak',
      'GDPR-megfelelő adatkezelés',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'Nagy épületek & ingatlankezelők',
    size: '80+ albetét',
    price: 'Egyéni ajánlat',
    cta: 'Ajánlatot kérek',
    ctaHref: '/kapcsolat',
    highlighted: false,
    icon: Star,
    features: [
      'Minden Professzionális funkció',
      'SLA garancia (rendelkezésre állás)',
      'Dedikált account manager',
      'API hozzáférés és egyéni integráció',
      'Több épület kezelése egy fiókból',
      '14 napos ingyenes próbaidőszak',
      'GDPR-megfelelő adatkezelés',
    ],
  },
];

export default function ArakPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicNav />

      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-slate-50 via-brand-50/40 to-slate-50 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 mb-6">
              <Shield size={14} />
              14 napos ingyenes próba · Kártyaadat nem szükséges
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Árak —{' '}
              <span className="bg-gradient-to-r from-brand-600 to-teal-500 bg-clip-text text-transparent">
                mindig áttekinthető
              </span>
            </h1>
            <p className="mt-5 text-lg text-slate-500 max-w-2xl mx-auto">
              Minden csomag épület mérethez igazodik. Nem fizet felesleges funkcióért —
              csak azért, ami ténylegesen kell a közös képviselethez.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-brand-500" />
                14 napos ingyenes próba
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-brand-500" />
                Kártyaadat nem szükséges
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-brand-500" />
                Azonnali hozzáférés
              </span>
            </div>
          </div>
        </section>

        {/* Pricing cards */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-6 sm:gap-8 lg:grid-cols-3 lg:items-stretch">
              {TIERS.map((tier) => {
                const Icon = tier.icon;
                return (
                  <div
                    key={tier.id}
                    className={`relative flex flex-col rounded-3xl p-8 ${
                      tier.highlighted
                        ? 'bg-gradient-to-br from-brand-600 to-teal-700 text-white shadow-card-lg ring-2 ring-brand-500/20'
                        : 'bg-white border border-slate-200 shadow-card'
                    }`}
                  >
                    {tier.badge && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-900 shadow-sm">
                          <Star size={10} fill="currentColor" />
                          {tier.badge}
                        </span>
                      </div>
                    )}

                    {/* Header */}
                    <div className="mb-6">
                      <div
                        className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
                          tier.highlighted
                            ? 'bg-white/20 text-white'
                            : 'bg-brand-50 text-brand-600'
                        }`}
                      >
                        <Icon size={22} />
                      </div>
                      <h2
                        className={`text-2xl font-black ${
                          tier.highlighted ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {tier.name}
                      </h2>
                      <p
                        className={`text-sm font-medium mt-0.5 ${
                          tier.highlighted ? 'text-brand-100' : 'text-slate-500'
                        }`}
                      >
                        {tier.subtitle}
                      </p>
                      <div
                        className={`mt-3 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold ${
                          tier.highlighted
                            ? 'bg-white/15 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Building2 size={12} />
                        {tier.size}
                      </div>
                    </div>

                    {/* Price */}
                    <div
                      className={`mb-6 rounded-2xl px-4 py-4 ${
                        tier.highlighted ? 'bg-white/10' : 'bg-slate-50'
                      }`}
                    >
                      <p
                        className={`text-base font-bold ${
                          tier.highlighted ? 'text-white' : 'text-slate-800'
                        }`}
                      >
                        {tier.price}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${
                          tier.highlighted ? 'text-brand-100' : 'text-slate-400'
                        }`}
                      >
                        Egyéni igények alapján kalkulálva
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="mb-8 flex-1 space-y-3">
                      {tier.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5">
                          <CheckCircle
                            size={16}
                            className={`mt-0.5 shrink-0 ${
                              tier.highlighted ? 'text-brand-200' : 'text-brand-500'
                            }`}
                          />
                          <span
                            className={`text-sm leading-snug ${
                              tier.highlighted ? 'text-white/90' : 'text-slate-600'
                            }`}
                          >
                            {feat}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Link
                      href={tier.ctaHref as Route}
                      className={`mt-auto flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all ${
                        tier.highlighted
                          ? 'bg-white text-brand-700 hover:bg-brand-50 shadow-sm'
                          : 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-200'
                      }`}
                    >
                      {tier.cta}
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* What's in every plan */}
        <section className="py-16 sm:py-20 bg-slate-50">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">
                Mit tartalmaz minden csomag?
              </h2>
              <p className="mt-3 text-slate-500">
                Az alábbi funkciók és garanciák minden előfizetési szinten megtalálhatók —
                függetlenül az épület méretétől.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {COMMON_FEATURES.map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-card"
                >
                  <CheckCircle size={18} className="shrink-0 text-brand-500" />
                  <span className="text-sm font-medium text-slate-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Payment FAQ */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">
                Milyen fizetési módokat fogadnak el?
              </h2>
            </div>
            <div className="space-y-4">
              {[
                {
                  q: 'Hogyan fizethetek az előfizetésért?',
                  a: 'Bankkártyával (Visa, Mastercard, American Express) és banki átutalással is lehetséges az előfizetés rendezése. Enterprise ügyfeleknek egyedi számlázás is elérhető.',
                },
                {
                  q: 'Mikor számítsak az első díjra?',
                  a: 'A 14 napos ingyenes próbaidőszak lejárta után, ha úgy dönt, hogy folytatja a használatot. A próba során semmilyen összeget nem vonunk le.',
                },
                {
                  q: 'Köthetek éves előfizetést?',
                  a: 'Igen, éves előfizetés esetén kedvezményes díjat biztosítunk. A pontos feltételekről vegye fel velünk a kapcsolatot.',
                },
                {
                  q: 'Mi történik, ha lemondok?',
                  a: 'Bármikor lemondhatja az előfizetést, kötöttség nélkül. Adatait exportálhatja, és 30 napig megőrizzük törlés előtt.',
                },
              ].map(({ q, a }) => (
                <div
                  key={q}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5"
                >
                  <p className="font-semibold text-slate-900 mb-1.5">{q}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Help choosing */}
        <section className="py-16 sm:py-20 bg-slate-50">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-card-md p-8 sm:p-10 text-center">
              <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
                <Users size={26} className="text-brand-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 sm:text-3xl mb-3">
                Nem vagy biztos melyik csomag kell?
              </h2>
              <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-xl mx-auto">
                Írj nekünk, és segítünk megtalálni az épületednek megfelelő megoldást.
                Általában 1 munkanapon belül válaszolunk, és szükség esetén rövid bemutatót
                is tartunk.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/kapcsolat"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-sm shadow-brand-200 hover:bg-brand-700 transition-all"
                >
                  <Mail size={16} />
                  Kapcsolatfelvétel
                </Link>
                <Link
                  href="/gyik"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  Gyakori kérdések
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA banner */}
        <section className="py-16 sm:py-24 bg-gradient-to-br from-brand-600 via-teal-700 to-brand-800">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
            <h2 className="text-3xl font-black text-white sm:text-4xl lg:text-5xl mb-4">
              Próbálja ki ingyen 14 napig
            </h2>
            <p className="text-brand-100 text-lg mb-8 max-w-xl mx-auto">
              Kártyaadat nem szükséges. Azonnali hozzáférés. Bármikor lemondható.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-black text-brand-700 shadow-lg hover:bg-brand-50 transition-all"
              >
                Ingyenes próba indítása
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/funkciok"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-8 py-4 text-base font-bold text-white hover:bg-white/20 transition-all"
              >
                Funkciók megtekintése
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-brand-200">
              <span className="flex items-center gap-1.5">
                <CheckCircle size={14} />
                14 napos ingyenes próba
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle size={14} />
                GDPR megfelelő
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle size={14} />
                Magyar fejlesztés
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle size={14} />
                EU-s szervereken tárolva
              </span>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
