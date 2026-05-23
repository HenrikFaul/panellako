import type { Metadata } from 'next';
import type { Route } from 'next';
import Link from 'next/link';
import {
  Calculator,
  FileSpreadsheet,
  Download,
  CheckCircle,
  ArrowRight,
  Building2,
  Shield,
  Clock,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Társasházi Könyvelő Szoftver — PanelLakó Könyvelőknek',
  description:
    'PanelLakó társasházi könyvelő szoftver: automatikus könyvelői export, közös költség nyilvántartás, hátralékosok kezelése és ANYK-kompatibilis kimutatások — több épület egyszerre.',
  alternates: { canonical: 'https://panellako.hu/funkciok/konyveloknek' },
  openGraph: {
    title: 'Társasházi Könyvelő Szoftver — PanelLakó Könyvelőknek',
    description:
      'Könyvelői export egy kattintással, több épület párhuzamos kezelése, automatikus hátralékos lista — a PanelLakó könyvelő modulja társasházi könyvelőknek.',
    url: 'https://panellako.hu/funkciok/konyveloknek',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Társasházi könyvelő szoftver — PanelLakó könyvelőknek',
  description:
    'A PanelLakó társasházi könyvelő modulja: automatikus könyvelői export, közös költség nyilvántartás, hátralékosok kezelése, több épület párhuzamos kezelése.',
  url: 'https://panellako.hu/funkciok/konyveloknek',
  publisher: { '@type': 'Organization', name: 'PanelLakó', url: 'https://panellako.hu' },
  inLanguage: 'hu',
  datePublished: '2024-01-15',
  dateModified: '2026-05-23',
  author: { '@type': 'Organization', name: 'PanelLakó', url: 'https://panellako.hu' },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Főoldal', item: 'https://panellako.hu' },
    { '@type': 'ListItem', position: 2, name: 'Funkciók', item: 'https://panellako.hu/funkciok' },
    { '@type': 'ListItem', position: 3, name: 'Könyvelőknek', item: 'https://panellako.hu/funkciok/konyveloknek' },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Milyen könyvelői exportot generál a PanelLakó?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A PanelLakó CSV és Excel formátumú exportot generál a havi közös költség bevételekről, kiadásokról és az egyenleg-kimutatásról. Az export tartalmaz albetétenként bontott nyilvántartást, a hátralékosok listáját, és a felújítási alap összesítőjét.',
      },
    },
    {
      '@type': 'Question',
      name: 'Egyszerre több épületet is kezelhet a könyvelő?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Igen, a PanelLakó egy fiókból több munkaterületet (épületet) kezel párhuzamosan. A könyvelő minden épülethez külön hozzáférést kap, és az exportok épületenként generálhatók.',
      },
    },
    {
      '@type': 'Question',
      name: 'GDPR-megfelelő a könyvelői hozzáférés?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A PanelLakó adatkezelése az EU adatvédelmi rendelete (GDPR) szerint működik. A könyvelői szerepkörű felhasználók csak a pénzügyi adatokhoz férnek hozzá, a személyes lakói adatokhoz nem — az adatok európai szervereken (Supabase, Írország) tárolódnak.',
      },
    },
    {
      '@type': 'Question',
      name: 'Mennyibe kerül a könyvelői hozzáférés?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A könyvelői hozzáférés az épület előfizetési csomagjának részét képezi — nincs külön díja. Egy könyvelő korlátlan számú épülethez kaphat hozzáférést, amennyiben az adott épület rendelkezik érvényes előfizetéssel.',
      },
    },
  ],
};

const FEATURES = [
  {
    icon: Download,
    title: 'Könyvelői export egy kattintással',
    desc: 'Havi bevétel/kiadás kimutatás CSV és Excel formátumban. Albetétenként bontva, hátralékos lista, felújítási alap — minden ami a könyveléshez kell.',
  },
  {
    icon: Calculator,
    title: 'Közös költség nyilvántartás',
    desc: 'Albetétenként bontott befizetések, részteljesítések és hátralékosok — valós idejű egyenleg-nyilvántartással.',
  },
  {
    icon: AlertTriangle,
    title: 'Hátralékosok automatikus kezelése',
    desc: 'A hátralékos albetétek listája automatikusan frissül. Automatikus emlékeztető küldés konfigurálható határidővel.',
  },
  {
    icon: Building2,
    title: 'Több épület párhuzamosan',
    desc: 'Egy fiókból több társasház párhuzamos kezelése. Minden épület külön munkaterületen, könyvelői hozzáféréssel.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Éves elszámolás összeállítás',
    desc: 'Az éves pénzügyi elszámolás a 2003. évi CXXXIII. tv. 24. § határideje (március 31.) előtt egy kattintással exportálható.',
  },
  {
    icon: RefreshCw,
    title: 'Automatikus riportok',
    desc: 'Havi összesítők automatikusan generálódnak. Nincs manuális adatbevitel — a befizetések azonnal megjelennek a rendszerben.',
  },
];

const PAIN_POINTS = [
  { before: 'Excel táblák e-mailben küldözgetése a közös képviselővel', after: 'Megosztott, valós idejű adatok — mindenki ugyanazt látja' },
  { before: 'Manuális hátralékos lista frissítés minden hónapban', after: 'Automatikus frissítés, automatikus emlékeztető küldés' },
  { before: 'Épületenként külön mappa, külön fájlok', after: 'Egy felület, minden épület strukturáltan egy helyen' },
  { before: 'Adategyeztetés a közös képviselővel telefonon', after: 'Valós idejű hozzáférés — nincs szükség egyeztetésre' },
];

export default function KonyvelokNekPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <PublicNav />

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {/* Breadcrumb */}
        <nav aria-label="Navigáció" className="mb-8 flex flex-wrap items-center gap-1.5 text-sm text-slate-400">
          <Link href="/" className="hover:text-slate-600">Főoldal</Link>
          <span>/</span>
          <Link href={"/funkciok" as Route} className="hover:text-slate-600">Funkciók</Link>
          <span>/</span>
          <span className="font-medium text-slate-600">Könyvelőknek</span>
        </nav>

        {/* Hero */}
        <div className="mb-16">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <Calculator size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Társasházi könyvelő szoftver
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            A PanelLakó könyvelői modulja egyetlen felületre hozza össze a közös képviselőt és
            a könyvelőt. Automatikus export, valós idejű hátralékos lista, és az éves elszámolás
            összeállítása percek alatt — nem órák alatt.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-6 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              <CheckCircle size={16} />
              Ingyenes próba — 14 nap
            </Link>
            <Link
              href={"/kapcsolat" as Route}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              Bemutató kérése <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Előtte/utána */}
        <section className="mb-16">
          <h2 className="mb-8 text-2xl font-black text-slate-900">
            Hogyan változik a könyvelési munkafolyamat?
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <div className="grid grid-cols-2 bg-slate-50">
              <div className="border-r border-slate-100 px-6 py-3 text-sm font-black text-slate-500 uppercase tracking-wide">Előtte</div>
              <div className="px-6 py-3 text-sm font-black text-brand-600 uppercase tracking-wide">PanelLakóval</div>
            </div>
            {PAIN_POINTS.map((row, i) => (
              <div key={i} className="grid grid-cols-2 border-t border-slate-100">
                <div className="border-r border-slate-100 px-6 py-4 text-sm leading-relaxed text-slate-500">{row.before}</div>
                <div className="px-6 py-4 text-sm leading-relaxed text-slate-700 font-medium">{row.after}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Funkciók */}
        <section className="mb-16">
          <h2 className="mb-8 text-2xl font-black text-slate-900">
            Könyvelői funkciók részletesen
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={22} className="text-brand-600" />
                  </div>
                  <h3 className="mb-2 text-base font-black text-slate-900">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Miért számít a könyvelő persona */}
        <section className="mb-16 rounded-2xl bg-brand-50 border border-brand-100 px-8 py-8">
          <div className="flex items-start gap-4">
            <div className="shrink-0 mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
              <Building2 size={20} className="text-brand-700" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 mb-2">
                Egy könyvelő = akár 10–50 épület
              </h2>
              <p className="text-sm leading-relaxed text-slate-600 max-w-2xl">
                A társasházi könyvelők általában több épület könyvelését végzik párhuzamosan. Ha Ön
                könyvelőként ajánlja a PanelLakót a közös képviselőknek, egyetlen döntésével
                10-50 épületnél indíthatja el a digitalizálást. Ezért kínálunk könyvelőknek kiemelt
                onboardingot és demonstrációs hozzáférést.
              </p>
              <Link
                href={"/kapcsolat" as Route}
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:underline"
              >
                Könyvelői partnerség érdeklődés <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* GDPR + biztonság */}
        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-black text-slate-900">
            GDPR-megfelelőség és adatbiztonság
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Shield, title: 'EU adatközpont', desc: 'Adatok európai szervereken (Supabase, Írország) tárolódnak.' },
              { icon: Clock, title: 'Megőrzési határidők', desc: 'Automatikus adatmegőrzés az adóügyi (8 év) és GDPR határidők szerint.' },
              { icon: CheckCircle, title: 'Szerepkör-alapú hozzáférés', desc: 'A könyvelő csak pénzügyi adatokat lát — személyes lakói adatokhoz nincs hozzáférése.' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3 rounded-xl bg-slate-50 p-5">
                  <div className="shrink-0 mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                    <Icon size={16} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="mb-8 text-2xl font-black text-slate-900">
            Gyakori kérdések könyvelőknek
          </h2>
          <div className="space-y-6">
            {faqSchema.mainEntity.map((faq) => (
              <div key={faq.name} className="border-b border-slate-100 pb-6">
                <h3 className="text-base font-black text-slate-900 mb-2">{faq.name}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{faq.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 px-8 py-10 text-center shadow-card-md">
          <h2 className="mb-2 text-2xl font-black text-white">
            Próbálja ki ingyenesen könyvelőként
          </h2>
          <p className="mb-6 text-brand-100">
            14 nap, kártyaadat nélkül. Több épületet is kezelhet egy fiókból.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-50"
            >
              <CheckCircle size={16} />
              Ingyenes regisztráció
            </Link>
            <Link
              href={"/kapcsolat" as Route}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/20"
            >
              Bemutató kérése
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
