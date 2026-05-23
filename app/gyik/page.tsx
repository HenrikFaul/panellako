import type { Metadata } from 'next';
import Link from 'next/link';
import {
  HelpCircle,
  CheckCircle,
  Shield,
  CreditCard,
  Zap,
  ArrowRight,
  Building2,
  Smartphone,
  Lock,
  Users,
  FileText,
  Gauge,
  Vote,
  BookOpen,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Gyakran Ismételt Kérdések — PanelLakó GYIK',
  description:
    'Minden válasz a PanelLakó társasházkezelő szoftverrel kapcsolatos kérdésekre: beállítás, adatbiztonság, árak, funkciók, jogi megfelelés.',
  alternates: { canonical: 'https://panellako.hu/gyik' },
  openGraph: {
    title: 'Gyakran Ismételt Kérdések — PanelLakó GYIK',
    description:
      'Minden válasz a PanelLakó társasházkezelő szoftverrel kapcsolatos kérdésekre: beállítás, adatbiztonság, árak, funkciók, jogi megfelelés.',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Mi az a PanelLakó és kinek szól?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A PanelLakó egy digitális társasházi kezelőszoftver, amely közös képviselőknek, lakóknak és könyvelőknek egyaránt készült. Segít a hibabejelentések kezelésében, a dokumentumtár vezetésében, a közös költség nyilvántartásában és az online közgyűlések szervezésében — mindezt egy helyen, papír nélkül.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kell-e bármit telepíteni?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Nem, a PanelLakó teljes mértékben böngészőalapú. Sem a közös képviselőnek, sem a lakóknak nem kell semmilyen programot letölteni vagy telepíteni. Mobilon és asztali gépen egyaránt tökéletesen működik bármely modern böngészőből.',
      },
    },
    {
      '@type': 'Question',
      name: 'Milyen épülettípusokhoz megfelelő a PanelLakó?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A PanelLakó skálázható megoldás: kisebb, 10 albetétes panelektől a 200+ lakásos nagy társasházakig egyaránt alkalmas. Ingatlankezelő cégek számára is ideális, akik egyszerre több épületet kezelnek, mivel egy fiókból több társasház is kezelhető.',
      },
    },
    {
      '@type': 'Question',
      name: 'Megfelel a PanelLakó a magyar jogszabályoknak?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Igen. A PanelLakó megfelel a 2003. évi CXXXIII. törvény (a társasházakról) és a 2021. évi CXLIII. törvény előírásainak, amely lehetővé teszi a digitális, teljes joghatályú közgyűlések megtartását. A rendszer a GDPR-nak is teljes mértékben megfelel.',
      },
    },
    {
      '@type': 'Question',
      name: 'Van mobilalkalmazás?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Igen, a PanelLakó PWA (Progressive Web App) technológiát alkalmaz, amely iOS és Android eszközökre egyaránt telepíthető a böngészőből, alkalmazásbolt nélkül. A telepített változat offline funkciókkal is rendelkezik, és teljesen natív appérzetet nyújt.',
      },
    },
    {
      '@type': 'Question',
      name: 'Hol tárolják az adatokat?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Az összes adat EU-s szervereken (Supabase, Írország) kerül tárolásra, teljes GDPR-megfelelőséggel. Az adatátvitel TLS titkosítással védett, az adatbázis szintű titkosítás folyamatosan aktív. Az adatok soha nem kerülnek ki az Európai Unión kívülre.',
      },
    },
    {
      '@type': 'Question',
      name: 'Ki férhet hozzá az épület adataihoz?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Kizárólag azok a személyek férhetnek hozzá az épület adataihoz, akiket a közös képviselő kifejezetten meghívott és jogosultsággal látott el. A rendszer szerepkör alapú hozzáférés-kezelést alkalmaz: a lakó csak a saját adatait és a közös dokumentumokat látja, a könyvelő csak a pénzügyi adatokhoz fér hozzá, az adminisztrátor minden funkciót kezel.',
      },
    },
    {
      '@type': 'Question',
      name: 'Mi történik a próbaidőszak lejáratakor az adatokkal?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ha a próbaidőszak után nem folytatja az előfizetést, adatait szabadon exportálhatja CSV és PDF formátumban. Az adatokat a rendszer 30 napig megőrzi a próbaidőszak lejárta után, mielőtt véglegesen törölné azokat. Ez elegendő időt biztosít a döntésre és az esetleges adatmentésre.',
      },
    },
    {
      '@type': 'Question',
      name: 'Hogyan működik a hibabejelentés?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A lakó egy gombnyomással jelezi a problémát — képpel és részletes leírással. A közös képviselő azonnali értesítést kap, hozzárendelheti a megfelelő szakembert, és státuszt állíthat be (beérkezett, folyamatban, megoldva). A lakó minden státuszváltozásról automatikus értesítést kap, így mindig tudja, mi történik a bejelentésével.',
      },
    },
    {
      '@type': 'Question',
      name: 'Lehet-e könyvelőt hozzáadni a rendszerhez?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Igen, a könyvelő saját dedikált szerepkörrel rendelkezik, amellyel csak a pénzügyi adatokhoz és dokumentumokhoz fér hozzá — a lakói személyes adatokat nem látja. Ez megfelel az adatvédelmi elvárásoknak, ugyanakkor biztosítja a könyvelési munkához szükséges teljes hozzáférést.',
      },
    },
    {
      '@type': 'Question',
      name: 'Hogyan zajlik az online szavazás és közgyűlés?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A 2021. évi CXLIII. törvény feltételeinek teljesítése esetén teljes joghatályú, határozatképes szavazás tartható digitálisan. A rendszer kezeli a napirendi pontokat, a határozati javaslatokat, az elektronikus szavazatokat és az automatikus határozatképesség-számítást. A jelenléti ívtől a határozatok nyilvántartásáig minden automatizált és jogilag érvényes.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kezel al-mérőórákat is a rendszer?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Igen, a PanelLakó teljes körű al-mérőóra-kezeléssel rendelkezik. Rögzítheti a lakásonkénti leolvasásokat, automatikus fogyasztási naplót vezet, és részletes riportokat generál. A rendszer összehasonlítja az épület főmérőjének és az al-mérőórák összesítésének értékét, így a különbözetek is átláthatóvá válnak.',
      },
    },
    {
      '@type': 'Question',
      name: 'Mibe kerül a 14 napos próbaidőszak?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A próbaidőszak teljesen ingyenes. Kártyaadatot sem kell megadni a regisztrációhoz. A 14 nap alatt az összes funkció korlátozás nélkül elérhető, így valódi képet kaphat arról, hogyan segíti a PanelLakó a napi munkát.',
      },
    },
    {
      '@type': 'Question',
      name: 'Mikor kell fizetni az előfizetésért?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Fizetni csak a 14 napos ingyenes próbaidőszak lejárta után szükséges, ha úgy dönt, hogy folytatja a használatot. Az előfizetés havi elszámolással működik. Bankkártyával (Visa, Mastercard, American Express) és banki átutalással egyaránt lehet fizetni. Éves előfizetés esetén kedvezményes díjat biztosítunk.',
      },
    },
    {
      '@type': 'Question',
      name: 'Lehet-e bármikor lemondani az előfizetést?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Igen, az előfizetés bármikor, kötöttség nélkül lemondható. Nincs felmondási idő, nincs rejtett díj. Lemondás előtt adatait szabadon exportálhatja, és 30 napig még hozzáférhet a rendszerhez az utolsó fizetési időszak végéig.',
      },
    },
  ],
};

const CATEGORIES = [
  {
    id: 'altalanos',
    label: 'Általános',
    icon: HelpCircle,
    iconColor: 'text-violet-500',
    iconBg: 'bg-violet-50',
    faqs: [
      {
        q: 'Mi az a PanelLakó és kinek szól?',
        a: 'A PanelLakó egy digitális társasházi kezelőszoftver, amely közös képviselőknek, lakóknak és könyvelőknek egyaránt készült. Segít a hibabejelentések kezelésében, a dokumentumtár vezetésében, a közös költség nyilvántartásában és az online közgyűlések szervezésében — mindezt egy helyen, papír nélkül.',
        icon: Building2,
      },
      {
        q: 'Kell-e bármit telepíteni?',
        a: 'Nem, a PanelLakó teljes mértékben böngészőalapú. Sem a közös képviselőnek, sem a lakóknak nem kell semmilyen programot letölteni vagy telepíteni. Mobilon és asztali gépen egyaránt tökéletesen működik bármely modern böngészőből.',
        icon: Smartphone,
      },
      {
        q: 'Milyen épülettípusokhoz megfelelő a PanelLakó?',
        a: 'A PanelLakó skálázható megoldás: kisebb, 10 albetétes panelektől a 200+ lakásos nagy társasházakig egyaránt alkalmas. Ingatlankezelő cégek számára is ideális, akik egyszerre több épületet kezelnek, mivel egy fiókból több társasház is kezelhető.',
        icon: Building2,
      },
      {
        q: 'Megfelel a PanelLakó a magyar jogszabályoknak?',
        a: 'Igen. A PanelLakó megfelel a 2003. évi CXXXIII. törvény (a társasházakról) és a 2021. évi CXLIII. törvény előírásainak, amely lehetővé teszi a digitális, teljes joghatályú közgyűlések megtartását. A rendszer a GDPR-nak is teljes mértékben megfelel.',
        icon: BookOpen,
      },
      {
        q: 'Van mobilalkalmazás?',
        a: 'Igen, a PanelLakó PWA (Progressive Web App) technológiát alkalmaz, amely iOS és Android eszközökre egyaránt telepíthető a böngészőből, alkalmazásbolt nélkül. A telepített változat offline funkciókkal is rendelkezik, és teljesen natív appérzetet nyújt.',
        icon: Smartphone,
      },
    ],
  },
  {
    id: 'adatbiztonsag',
    label: 'Adatbiztonság & GDPR',
    icon: Shield,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-50',
    faqs: [
      {
        q: 'Hol tárolják az adatokat?',
        a: 'Az összes adat EU-s szervereken (Supabase, Írország) kerül tárolásra, teljes GDPR-megfelelőséggel. Az adatátvitel TLS titkosítással védett, az adatbázis szintű titkosítás folyamatosan aktív. Az adatok soha nem kerülnek ki az Európai Unión kívülre.',
        icon: Lock,
      },
      {
        q: 'Ki férhet hozzá az épület adataihoz?',
        a: 'Kizárólag azok a személyek férhetnek hozzá az épület adataihoz, akiket a közös képviselő kifejezetten meghívott és jogosultsággal látott el. A rendszer szerepkör alapú hozzáférés-kezelést alkalmaz: a lakó csak a saját adatait és a közös dokumentumokat látja, a könyvelő csak a pénzügyi adatokhoz fér hozzá, az adminisztrátor minden funkciót kezel.',
        icon: Users,
      },
      {
        q: 'Mi történik a próbaidőszak lejáratakor az adatokkal?',
        a: 'Ha a próbaidőszak után nem folytatja az előfizetést, adatait szabadon exportálhatja CSV és PDF formátumban. Az adatokat a rendszer 30 napig megőrzi a próbaidőszak lejárta után, mielőtt véglegesen törölné azokat. Ez elegendő időt biztosít a döntésre és az esetleges adatmentésre.',
        icon: FileText,
      },
    ],
  },
  {
    id: 'funkciok',
    label: 'Funkciók',
    icon: Zap,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50',
    faqs: [
      {
        q: 'Hogyan működik a hibabejelentés?',
        a: 'A lakó egy gombnyomással jelezi a problémát — képpel és részletes leírással. A közös képviselő azonnali értesítést kap, hozzárendelheti a megfelelő szakembert, és státuszt állíthat be (beérkezett, folyamatban, megoldva). A lakó minden státuszváltozásról automatikus értesítést kap, így mindig tudja, mi történik a bejelentésével.',
        icon: HelpCircle,
      },
      {
        q: 'Lehet-e könyvelőt hozzáadni a rendszerhez?',
        a: 'Igen, a könyvelő saját dedikált szerepkörrel rendelkezik, amellyel csak a pénzügyi adatokhoz és dokumentumokhoz fér hozzá — a lakói személyes adatokat nem látja. Ez megfelel az adatvédelmi elvárásoknak, ugyanakkor biztosítja a könyvelési munkához szükséges teljes hozzáférést.',
        icon: Users,
      },
      {
        q: 'Hogyan zajlik az online szavazás és közgyűlés?',
        a: 'A 2021. évi CXLIII. törvény feltételeinek teljesítése esetén teljes joghatályú, határozatképes szavazás tartható digitálisan. A rendszer kezeli a napirendi pontokat, a határozati javaslatokat, az elektronikus szavazatokat és az automatikus határozatképesség-számítást. A jelenléti ívtől a határozatok nyilvántartásáig minden automatizált és jogilag érvényes.',
        icon: Vote,
      },
      {
        q: 'Kezel al-mérőórákat is a rendszer?',
        a: 'Igen, a PanelLakó teljes körű al-mérőóra-kezeléssel rendelkezik. Rögzítheti a lakásonkénti leolvasásokat, automatikus fogyasztási naplót vezet, és részletes riportokat generál. A rendszer összehasonlítja az épület főmérőjének és az al-mérőórák összesítésének értékét, így a különbözetek is átláthatóvá válnak.',
        icon: Gauge,
      },
    ],
  },
  {
    id: 'arak',
    label: 'Árak & Szerződés',
    icon: CreditCard,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50',
    faqs: [
      {
        q: 'Mibe kerül a 14 napos próbaidőszak?',
        a: 'A próbaidőszak teljesen ingyenes. Kártyaadatot sem kell megadni a regisztrációhoz. A 14 nap alatt az összes funkció korlátozás nélkül elérhető, így valódi képet kaphat arról, hogyan segíti a PanelLakó a napi munkát.',
        icon: CheckCircle,
      },
      {
        q: 'Mikor kell fizetni az előfizetésért?',
        a: 'Fizetni csak a 14 napos ingyenes próbaidőszak lejárta után szükséges, ha úgy dönt, hogy folytatja a használatot. Az előfizetés havi elszámolással működik. Bankkártyával (Visa, Mastercard, American Express) és banki átutalással egyaránt lehet fizetni. Éves előfizetés esetén kedvezményes díjat biztosítunk.',
        icon: CreditCard,
      },
      {
        q: 'Lehet-e bármikor lemondani az előfizetést?',
        a: 'Igen, az előfizetés bármikor, kötöttség nélkül lemondható. Nincs felmondási idő, nincs rejtett díj. Lemondás előtt adatait szabadon exportálhatja, és 30 napig még hozzáférhet a rendszerhez az utolsó fizetési időszak végéig.',
        icon: CheckCircle,
      },
    ],
  },
];

export default function GyikPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <PublicNav />

      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-slate-50 via-brand-50/40 to-slate-50 py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 mb-6">
              <HelpCircle size={14} />
              Minden kérdésre válaszolunk
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Gyakran ismételt{' '}
              <span className="bg-gradient-to-r from-brand-600 to-teal-500 bg-clip-text text-transparent">
                kérdések
              </span>
            </h1>
            <p className="mt-5 text-lg text-slate-500 max-w-2xl mx-auto">
              Ha nem találod, amit keresel, írj nekünk a{' '}
              <Link href="/kapcsolat" className="font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-2">
                /kapcsolat
              </Link>{' '}
              oldalon — általában 1 munkanapon belül válaszolunk.
            </p>

            {/* Category quick-nav */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <a
                    key={cat.id}
                    href={`#${cat.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-brand-300 hover:text-brand-700 hover:shadow-md"
                  >
                    <Icon size={14} className={cat.iconColor} />
                    {cat.label}
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ Categories */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 space-y-16">
            {CATEGORIES.map((cat) => {
              const CatIcon = cat.icon;
              return (
                <div key={cat.id} id={cat.id}>
                  {/* Category header */}
                  <div className="flex items-center gap-3 mb-8">
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${cat.iconBg}`}>
                      <CatIcon size={20} className={cat.iconColor} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">{cat.label}</h2>
                  </div>

                  {/* FAQ items */}
                  <div className="space-y-3">
                    {cat.faqs.map(({ q, a, icon: ItemIcon }) => (
                      <details
                        key={q}
                        className="group rounded-2xl border border-slate-200 bg-slate-50 transition-all open:bg-white open:shadow-card open:border-brand-200"
                      >
                        <summary className="flex cursor-pointer list-none items-start gap-4 px-6 py-5 select-none">
                          <div className="mt-0.5 shrink-0">
                            <ItemIcon size={18} className="text-brand-500" />
                          </div>
                          <span className="flex-1 text-base font-semibold text-slate-800 group-open:text-brand-700 leading-snug">
                            {q}
                          </span>
                          {/* Chevron indicator */}
                          <svg
                            className="mt-0.5 h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180 group-open:text-brand-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        <div className="px-6 pb-6 pt-1">
                          <div className="ml-[34px]">
                            <p className="text-sm leading-relaxed text-slate-600">{a}</p>
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Trust strip */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="grid gap-6 sm:grid-cols-3 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50">
                  <Shield size={20} className="text-brand-600" />
                </div>
                <p className="text-sm font-bold text-slate-800">GDPR megfelelő</p>
                <p className="text-xs text-slate-500 max-w-[180px]">EU-s szervereken, TLS titkosítással védett adatkezelés</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50">
                  <CheckCircle size={20} className="text-brand-600" />
                </div>
                <p className="text-sm font-bold text-slate-800">Jogilag megfelelő</p>
                <p className="text-xs text-slate-500 max-w-[180px]">2003. évi CXXXIII. tv. és 2021. évi CXLIII. tv. szerint</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50">
                  <CreditCard size={20} className="text-brand-600" />
                </div>
                <p className="text-sm font-bold text-slate-800">Kártyaadat nélkül</p>
                <p className="text-xs text-slate-500 max-w-[180px]">14 napos ingyenes próba, kötelezettség nélkül</p>
              </div>
            </div>
          </div>
        </section>

        {/* Still have questions CTA */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-brand-50/30 shadow-card-md p-8 sm:p-10 text-center">
              <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
                <HelpCircle size={26} className="text-brand-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 sm:text-3xl mb-3">
                Nem találtad a választ?
              </h2>
              <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-xl mx-auto">
                Írj nekünk bátran — minden kérdésre személyesen válaszolunk. Általában
                1 munkanapon belül visszajelzünk, és szükség esetén rövid bemutatót is tartunk
                az épület igényeire szabva.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/kapcsolat"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-sm shadow-brand-200 hover:bg-brand-700 transition-all"
                >
                  <HelpCircle size={16} />
                  Kérdés küldése
                </Link>
                <Link
                  href="/arak"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  Árak megtekintése
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
