import type { Metadata } from 'next';
import type { Route } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  FolderOpen,
  Calculator,
  Vote,
  Bell,
  Gauge,
  SplitSquareVertical,
  Smartphone,
  ShieldCheck,
  Clock,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Funkciók — PanelLakó Társasházkezelő Szoftver',
  description:
    'Ismerje meg a PanelLakó összes funkcióját: hibabejelentés, dokumentumtár, közös költség, online közgyűlés és még sok más.',
  alternates: { canonical: 'https://panellako.hu/funkciok' },
};

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'PanelLakó',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://panellako.hu',
  description:
    'Digitális társasházkezelő platform közös képviselőknek és lakóknak — bejelentések, dokumentumok, pénzügyek, közgyűlések egy helyen.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'HUF',
    description: '14 napos ingyenes próba',
  },
  publisher: {
    '@type': 'Organization',
    name: 'PanelLakó',
    url: 'https://panellako.hu',
  },
};

const MAIN_FEATURES = [
  {
    href: '/funkciok/hibabejelentes-kezeles',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50',
    title: 'Hibabejelentés és feladatkezelés',
    description:
      'Lakók egy gombnyomással jelezhetik a problémákat — tetőszivárgástól a lifthibáig. A közös képviselő azonnal értesítést kap, hozzárendelheti a megfelelő mestert, és nyomon követheti a javítás státuszát. Fotók csatolásával minden dokumentált, viták nélkül.',
  },
  {
    href: '/funkciok/dokumentumtar',
    icon: FolderOpen,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50',
    title: 'Digitális Dokumentumtár',
    description:
      'Az SZMSZ-től a közgyűlési jegyzőkönyveken át a szerződésekig — minden irat egy helyen, biztonságosan tárolva. Jogosultság-kezeléssel pontosan szabályozható, hogy melyik lakó milyen dokumentumhoz férhet hozzá. Keresés, verziókövetés, GDPR megfelelés beépítve.',
  },
  {
    href: '/funkciok/kozos-koltseg',
    icon: Calculator,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-50',
    title: 'Közös Költség Nyilvántartás',
    description:
      'Tételesen nyilvántartja a befizetéseket és hátralékok, automatikus fizetési felszólítással. Az éves elszámolás exportálható könyvelési formátumban. Az al-mérőóra leolvasásokat közvetlenül a rendszerbe rögzítheti, a díjszámítás automatikus.',
  },
  {
    href: '/funkciok/online-kozgyules',
    icon: Vote,
    iconColor: 'text-violet-500',
    iconBg: 'bg-violet-50',
    title: 'Online Közgyűlés és Szavazás',
    description:
      'Szervezzen törvényes digitális közgyűlést a 2021. évi CXLIII. törvény alapján. Napirendi pontok kezelése, határozati javaslatok feltöltése, elektronikus szavazás és automatikus határozatképesség-számítás. A jelenléti ívtől a határozatok nyilvántartásáig minden automatizált.',
  },
];

const MINOR_FEATURES = [
  {
    icon: Bell,
    title: 'Értesítések',
    description: 'E-mail és push értesítések minden fontos eseményről automatikusan.',
  },
  {
    icon: Gauge,
    title: 'Mérőóra-leolvasás',
    description: 'Épület-szintű főmérő leolvasások rögzítése és nyilvántartása.',
  },
  {
    icon: SplitSquareVertical,
    title: 'Al-mérőóra kezelés',
    description: 'Lakásonkénti al-mérőórák rögzítése, fogyasztás összehasonlítás.',
  },
  {
    icon: Smartphone,
    title: 'Mobil app',
    description: 'Teljes funkcionalitás mobilon is — iOS és Android böngészőből.',
  },
  {
    icon: ShieldCheck,
    title: 'GDPR megfelelő',
    description: 'Magyar és EU adatvédelmi szabályoknak megfelelő adatkezelés.',
  },
  {
    icon: Clock,
    title: '24/7 hozzáférés',
    description: 'A platform bármikor elérhető — éjjel is be lehet jelenteni hibát.',
  },
];

export default function FunkciokhubPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />

      <PublicNav />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Hero */}
        <div className="mb-14 text-center animate-fade-in-up">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            A PanelLakó összes funkciója
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
            Minden, amit a modern társasházkezeléshez tudnod kell — egy platformon, papír nélkül.
          </p>
        </div>

        {/* Main feature cards */}
        <section aria-label="Főbb funkciók" className="mb-16">
          <div className="grid gap-6 sm:grid-cols-2">
            {MAIN_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.href}
                  className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-shadow hover:shadow-card-md"
                >
                  <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${f.iconBg}`}>
                    <Icon size={22} className={f.iconColor} />
                  </div>
                  <h2 className="mb-2 text-lg font-black text-slate-900">{f.title}</h2>
                  <p className="flex-1 text-sm leading-relaxed text-slate-500">{f.description}</p>
                  <Link
                    href={f.href as Route}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 transition-colors hover:text-brand-700"
                  >
                    Részletek
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* Trust / minor features */}
        <section
          aria-label="További funkciók"
          className="mb-16 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-8"
        >
          <h2 className="mb-6 text-xl font-black text-slate-900">
            És még sok minden más…
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MINOR_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-card">
                    <Icon size={16} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{f.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{f.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-card-md">
          <h2 className="mb-2 text-2xl font-black text-white">
            Próbáld ki 14 napig ingyen
          </h2>
          <p className="mb-6 text-brand-100">
            Kártyaadatok nem szükségesek. Azonnali hozzáférés az összes funkcióhoz.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-50"
          >
            <CheckCircle size={16} />
            Ingyenes regisztráció
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
