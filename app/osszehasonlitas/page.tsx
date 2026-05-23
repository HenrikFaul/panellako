import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BarChart2,
  CheckCircle,
  XCircle,
  ArrowRight,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Users,
  Building2,
  Star,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'PanelLakó vs Excel és WhatsApp — Társasházi Szoftver Összehasonlítás',
  description:
    'Összehasonlítás: PanelLakó digitális társasházi platform vs. Excel táblázat + WhatsApp + papír. Melyik a hatékonyabb közös képviselethez?',
  alternates: { canonical: 'https://panellako.hu/osszehasonlitas' },
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
      name: 'Összehasonlítás',
      item: 'https://panellako.hu/osszehasonlitas',
    },
  ],
};

const COMPARISON_ROWS = [
  {
    aspect: 'Hibabejelentés nyilvántartása',
    excel: 'Elvész a chatben, nincs státuszkövetés',
    panellako: 'Strukturált, státuszkövető rendszer — mindenki látja az állapotot',
  },
  {
    aspect: 'Dokumentumok tárolása',
    excel: 'Helyi fájlok, e-mail mellékletek, elveszett verziók',
    panellako: 'Biztonságos felhő, automatikus verziókövetés, jogosultságok',
  },
  {
    aspect: 'Közös költség nyilvántartás',
    excel: 'Kézi táblázat, magas hibalehetőség, nehéz exportálni',
    panellako: 'Automatikus, könyvelési formátumban exportálható',
  },
  {
    aspect: 'Közgyűlés szervezése',
    excel: 'Személyes megjelenés szükséges, papír jelenléti ív',
    panellako: 'Online is lehetséges, digitális szavazás, határozatképesség automatikus',
  },
  {
    aspect: 'Hozzáférés dokumentumokhoz',
    excel: 'Excel fájl küldése e-mailben — kinek melyik verzió van meg?',
    panellako: 'Bármikor, bármely eszközről, mindig a legfrissebb verzió',
  },
  {
    aspect: 'GDPR megfelelés',
    excel: 'Nincs megoldva — személyes adatok helyi fájlokban',
    panellako: 'EU-s szerveren, GDPR megfelelő adatkezelés beépítve',
  },
  {
    aspect: 'Keresés az adatokban',
    excel: 'CTRL+F az Excel fájlban — ha megtalálod a fájlt',
    panellako: 'Intelligens keresés minden adatban, minden eszközön',
  },
  {
    aspect: 'Mobil elérés',
    excel: 'Nem optimalizált, nehézkes mobilon',
    panellako: 'Reszponzív, PWA — mobilon is teljes funkcionalitás',
  },
  {
    aspect: 'Valódi ár',
    excel: '"Ingyenes" — de az időköltség láthatatlan számla',
    panellako: '14 napos ingyenes próba, utána épület mérete szerint',
  },
];

const HIDDEN_COSTS = [
  {
    icon: Clock,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    title: 'Időköltség',
    body: 'Egy átlagos közös képviselő heti 4-6 órát tölt manuális adatrögzítéssel, e-mailek keresésével és táblázatok karbantartásával. 10 munkaév alatt ez több mint 2 500 óra — amit produktív munkára lehetne fordítani.',
  },
  {
    icon: AlertTriangle,
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    title: 'Hibakockázat',
    body: 'Az Excel fájlokban könnyű félregépelni, a verziók összekeverednek, és a másolás-beillesztés szükségszerűen hibákat szül. Egy elszámolási hiba súlyos bizalmi- és jogi konfliktushoz vezethet a lakók között.',
  },
  {
    icon: ShieldCheck,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    title: 'Megfelelési kockázat',
    body: 'A GDPR és a 2003. évi CXXXIII. törvény komoly követelményeket támaszt a személyes adatok és dokumentumok kezelésével szemben. A helyi Excel fájlokban tárolt lakóadatok GDPR-bírságot vonhatnak maga után.',
  },
  {
    icon: Smartphone,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    title: 'Hozzáférhetőség',
    body: 'Ha a közös képviselő szabadságon van, beteg, vagy váratlanul megváltozik, az összes adat az ő számítógépén marad — a többi lakó és az esetleges utód nulla hozzáféréssel rendelkezik.',
  },
];

const SWITCH_TRIGGERS = [
  'Egy lakógyűlésen kínos perceket tölt azzal, hogy a megfelelő Excel fájlt keresi.',
  'A könyvelő már harmadszor kéri ugyanazokat az adatokat, mert az előző verziót nem találja.',
  'Egy lakó panaszt nyújt be, mert nem kapott visszaigazolást a hibabejelentéséről.',
  'Adatvédelmi incidensnek minősül, hogy egy lakó személyes adatai körbejártak WhatsAppon.',
  'Az új közös képviselő nem tud eligazodni az elődje Excel táblázataiban — az átadás hetekig tart.',
];

const STATS = [
  { value: '68%', label: 'A Magyar társasházak papír- vagy Excel-alapú nyilvántartást használnak' },
  { value: '4–6 óra', label: 'Hetente manuális adminisztrációra fordított idő átlagos közös képviselőnél' },
  { value: '3× annyi', label: 'Jogi konfliktus fordul elő papír alapú nyilvántartásnál, mint digitálisnál' },
  { value: '14 nap', label: 'Elegendő az ingyenes próbaidő, hogy érezze a különbséget' },
];

export default function OsszehasonlitasPage() {
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
          <span className="font-medium text-slate-700">Összehasonlítás</span>
        </nav>

        {/* Hero */}
        <div className="mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-700">
            <BarChart2 size={13} />
            Összehasonlítás
          </div>
          <h1 className="mb-5 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            PanelLakó vs. Excel + WhatsApp —{' '}
            <span className="text-brand-600">melyik jobb a társasház kezeléséhez?</span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-500">
            Magyarországon a társasházak többsége még mindig Excel táblázatokat, papír nyilvántartásokat és WhatsApp csoportokat használ az ügyintézésre. Ez kényelmes lehet, de komoly kockázatokat rejt — jogi, pénzügyi és emberi oldalon egyaránt. Nézzük meg tényszerűen, mit jelent a két megközelítés a mindennapokban.
          </p>
        </div>

        {/* Comparison table */}
        <section aria-labelledby="comparison-heading" className="mb-14">
          <h2 id="comparison-heading" className="mb-6 text-2xl font-black text-slate-900">
            Összehasonlítás szempontok szerint
          </h2>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 shadow-sm sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-4 text-left font-black text-slate-700 w-1/3">Szempont</th>
                  <th className="px-5 py-4 text-left font-black text-slate-700 w-1/3">Excel + WhatsApp</th>
                  <th className="px-5 py-4 text-left font-black text-brand-700 w-1/3 bg-brand-50/60">
                    PanelLakó
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                  >
                    <td className="px-5 py-4 font-semibold text-slate-700">{row.aspect}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-2">
                        <XCircle size={16} className="mt-0.5 shrink-0 text-rose-400" />
                        <span className="text-slate-500">{row.excel}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 bg-brand-50/40">
                      <div className="flex items-start gap-2">
                        <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-600" />
                        <span className="font-medium text-slate-700">{row.panellako}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-4 sm:hidden">
            {COMPARISON_ROWS.map((row, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3">
                  <p className="font-black text-sm text-slate-800">{row.aspect}</p>
                </div>
                <div className="px-4 py-3 flex items-start gap-2 border-b border-slate-100">
                  <XCircle size={15} className="mt-0.5 shrink-0 text-rose-400" />
                  <p className="text-xs text-slate-500">{row.excel}</p>
                </div>
                <div className="px-4 py-3 flex items-start gap-2 bg-brand-50/40">
                  <CheckCircle size={15} className="mt-0.5 shrink-0 text-brand-600" />
                  <p className="text-xs font-medium text-slate-700">{row.panellako}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Hidden costs of Excel */}
        <section aria-labelledby="hidden-costs-heading" className="mb-14">
          <h2 id="hidden-costs-heading" className="mb-6 text-2xl font-black text-slate-900">
            Az Excel rejtett költségei
          </h2>
          <p className="mb-7 text-slate-500">
            Az Excel és a WhatsApp látszólag ingyenes. A valódi ár azonban az időben, a kockázatban és a bizalomvesztésben mérődik — és ezek sokkal drágábbak, mint bármely szoftveres előfizetés.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {HIDDEN_COSTS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.iconBg}`}>
                    <Icon size={20} className={item.iconColor} />
                  </div>
                  <h3 className="mb-2 font-black text-slate-900">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* When to switch */}
        <section aria-labelledby="switch-heading" className="mb-14 rounded-2xl border border-slate-100 bg-slate-50 px-7 py-8">
          <h2 id="switch-heading" className="mb-5 text-xl font-black text-slate-900">
            Mikor érdemes váltani?
          </h2>
          <p className="mb-5 text-slate-500">
            Nincs ideális pillanat a digitalizálásra — de van öt jel, hogy már régen itt volt az ideje:
          </p>
          <ol className="space-y-3">
            {SWITCH_TRIGGERS.map((trigger, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-black text-brand-700">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-slate-600">{trigger}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm font-semibold text-slate-700">
            Ha akár egy pont ismerős, a PanelLakó 14 napos ingyenes próbája megmutatja, mennyivel egyszerűbb lehet.
          </p>
        </section>

        {/* Stats */}
        <section aria-labelledby="stats-heading" className="mb-14">
          <h2 id="stats-heading" className="mb-6 text-2xl font-black text-slate-900">
            Kik váltottak már?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div
                key={stat.value}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center shadow-sm"
              >
                <p className="mb-1 text-3xl font-black text-brand-600">{stat.value}</p>
                <p className="text-xs leading-snug text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why PanelLako wins */}
        <section aria-labelledby="why-heading" className="mb-14">
          <h2 id="why-heading" className="mb-6 text-2xl font-black text-slate-900">
            Miért választják a PanelLakót?
          </h2>
          <div className="space-y-3">
            {[
              { icon: Building2, text: 'Kifejezetten Magyar társasházakra tervezett — a hazai jogszabályok és szokások szerint.' },
              { icon: ShieldCheck, text: 'GDPR megfelelő, EU-s szervereken — az adatvédelmi megfelelés beépített, nem utólagos.' },
              { icon: Users, text: 'Nem kell mindenkit egyszerre meggyőzni: a közös képviselő elkezdheti, a lakók fokozatosan csatlakoznak.' },
              { icon: TrendingUp, text: 'Minden adat exportálható — soha nem leszel bezárva a rendszerbe, az adataid mindig a tiéid.' },
              { icon: Star, text: 'Dedikált Magyar ügyfélszolgálat — nem kell angolul írni, nincs ticketing-labirintus.' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
                <Icon size={17} className="mt-0.5 shrink-0 text-brand-500" />
                <p className="text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-md">
          <h2 className="mb-2 text-2xl font-black text-white">
            Próbálja ki ingyen — 14 napig, kötelezettség nélkül
          </h2>
          <p className="mb-6 text-brand-100">
            Nem kell hitelkártya, nem kell telepítés. Regisztráljon, és percek alatt létrehozza első digitális társasházát.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-transform hover:scale-[1.03]"
            >
              Ingyenes próba indítása
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/funkciok"
              className="inline-flex items-center gap-2 rounded-xl border border-brand-400/40 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-600"
            >
              Összes funkció megtekintése
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
