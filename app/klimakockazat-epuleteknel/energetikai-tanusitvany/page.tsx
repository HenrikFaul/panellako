import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Zap,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Shield,
  TrendingUp,
  FileText,
  Building2,
  Thermometer,
  Sun,
  BarChart2,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Energetikai Tanúsítvány — EPC és Felújítás | PanelLakó',
  description:
    'Az energetikai tanúsítvány (EPC) kötelező megléte 2024-ben, A++-tól G osztályig, EU EPBD 2024 felújítási kötelezettség, hogyan javítható az épület energiaosztálya.',
  alternates: {
    canonical: 'https://panellako.hu/klimakockazat-epuleteknel/energetikai-tanusitvany',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Energetikai tanúsítvány — kötelező, amit minden tulajdonosnak tudni kell',
  description:
    'Az energetikai tanúsítvány (EPC) kötelező megléte 2024-ben, A++-tól G osztályig, EU EPBD 2024 felújítási kötelezettség, hogyan javítható az épület energiaosztálya.',
  inLanguage: 'hu',
  url: 'https://panellako.hu/klimakockazat-epuleteknel/energetikai-tanusitvany',
  publisher: {
    '@type': 'Organization',
    name: 'PanelLakó',
    url: 'https://panellako.hu',
  },
  datePublished: '2024-01-15',
  dateModified: '2026-05-23',
  author: { '@type': 'Organization', name: 'PanelLakó', url: 'https://panellako.hu' },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Főoldal', item: 'https://panellako.hu' },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Klímakockázat Épületeknél',
      item: 'https://panellako.hu/klimakockazat-epuleteknel',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Energetikai Tanúsítvány',
      item: 'https://panellako.hu/klimakockazat-epuleteknel/energetikai-tanusitvany',
    },
  ],
};

const EPC_CLASSES = [
  { osztaly: 'A++', szin: 'bg-emerald-600', szoveg: 'text-white', hatarErtek: '< 40 kWh/m²/év', leiras: 'Közel nulla energia­igényű (nZEB). Elsősorban passzívház és aktívház standard.' },
  { osztaly: 'A+', szin: 'bg-emerald-500', szoveg: 'text-white', hatarErtek: '40–80 kWh/m²/év', leiras: 'Igen jó energetikai teljesítmény. Új épületek EU-s szabvány szerint.' },
  { osztaly: 'A', szin: 'bg-green-500', szoveg: 'text-white', hatarErtek: '80–100 kWh/m²/év', leiras: 'Jó. Korszerűsített épületek, napelemmel és hőszivattyúval.' },
  { osztaly: 'BB', szin: 'bg-lime-500', szoveg: 'text-white', hatarErtek: '100–130 kWh/m²/év', leiras: 'Megfelelő. Közepesen felújított panel vagy tégla épületek.' },
  { osztaly: 'C', szin: 'bg-yellow-400', szoveg: 'text-slate-900', hatarErtek: '130–200 kWh/m²/év', leiras: 'Gyenge. Alapkorszerűsített, de nem komplex felújítású épületek.' },
  { osztaly: 'D', szin: 'bg-orange-400', szoveg: 'text-white', hatarErtek: '200–300 kWh/m²/év', leiras: 'Rossz. Felújítatlan téglaépületek, régi nyílászárókkal.' },
  { osztaly: 'E–G', szin: 'bg-red-500', szoveg: 'text-white', hatarErtek: '300+ kWh/m²/év', leiras: 'Nagyon rossz. Felújítatlan panel épületek, F–G az EU EPBD kötelező felújítási célsávja 2033-ig.' },
];

const IMPROVEMENT_STEPS = [
  {
    icon: Thermometer,
    title: 'Külső hőszigetelés — a legnagyobb hatás',
    body:
      'A külső falak hőszigetelése (ETICS rendszer, polisztirol vagy kőzetgyapot) az épület primer­energia-szükségletét 30–50%-kal csökkenti. Ez jellemzően 2–3 EPC-osztálynyi javulást jelent. Egy felújítatlan panelen a falak U-értéke 1,0–1,5 W/m²K körüli; a szabvány szerint 0,24 W/m²K az elvárt — 15 cm hőszigetelés éri el ezt a szintet.',
  },
  {
    icon: Building2,
    title: 'Nyílászárócsere',
    body:
      'Az eredeti panelablakok hőhídjai és elavult tömítései a hőveszteség 15–25%-áért felelnek. Háromrétegű üvegezésű (Uw ≤ 0,9 W/m²K) műanyag vagy fa nyílászárók cseréjével 1–2 EPC-osztálynyi javulás érhető el. Cseréje szinte mindig megelőzi a hőszigetelést a megtérülési számításokban.',
  },
  {
    icon: Zap,
    title: 'Fűtési rendszer korszerűsítés — kazán → hőszivattyú',
    body:
      'Egy régi gázkazán (η ≈ 70–80%) lecserélése hőszivattyúra (COP ≈ 3–4) a primerenergia-szükségletet felére csökkenti. Az EPC számítás a primerenergiát veszi alapul, ezért a hőszivattyúra váltás az energiaosztályt 2–3 sávval javíthatja. A beruházási költség 2–4 millió Ft között mozog, de az energiamegtakarítás 8–12 éven belül megtérül.',
  },
  {
    icon: Sun,
    title: 'Napelem rendszer telepítése',
    body:
      'A tetőre helyezett PV rendszer a közös területek (lépcsőház, lift, szivattyúk) villamosenergia-igényét fedezheti, és az EPC-számításban a primerenergia-mérleget javítja. 30–50 kWp közötti rendszer egy 40 lakásos társasházon elegendő a közös fogyasztás fedezésére, és nyáron +kWh-t is termel vissza a hálózatba (METÁR-KIS).',
  },
];

export default function EnergetikaiTanusitvanyPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <PublicNav />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Breadcrumb */}
        <nav aria-label="Navigáció" className="mb-8 flex items-center gap-1.5 text-sm text-slate-400">
          <Link href="/" className="hover:text-slate-600">Főoldal</Link>
          <ChevronRight size={14} />
          <Link href="/klimakockazat-epuleteknel" className="hover:text-slate-600">
            Klímakockázat Épületeknél
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-600">Energetikai Tanúsítvány</span>
        </nav>
        {/* Author meta */}
        <p className="mb-10 flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <span className="font-medium text-slate-600">PanelLakó szerkesztőség</span>
          <span aria-hidden="true">·</span>
          <time dateTime="2024-01-15">2024. január 15.</time>
          <span aria-hidden="true">·</span>
          <span>Frissítve: 2026. május 23.</span>
        </p>

        {/* Hero */}
        <div className="mb-14">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <Zap size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Energetikai tanúsítvány — kötelező, amit minden tulajdonosnak tudni kell
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            Az energetikai tanúsítvány (angolul: Energy Performance Certificate, EPC) Magyarországon
            jogilag kötelező minden eladásnál és bérbeadásnál. Az EU EPBD 2024-es irányelve tovább erősíti
            a szerepét: a legrosszabb besorolású épületek kötelező felújítás alá esnek 2033-ig. Ha az
            épülete F vagy G osztályú, az nemcsak rezsiköltség-kérdés — hanem az ingatlan jövőbeli
            eladhatóságának és hitelképességének kérdése is.
          </p>
        </div>

        {/* Mi az EPC */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">Mi az energetikai tanúsítvány (EPC)?</h2>
          <div className="space-y-4 leading-relaxed text-slate-600">
            <p>
              Az energetikai tanúsítvány egy akkreditált energetikai szakértő által kiállított hivatalos
              dokumentum, amely az épület energetikai teljesítményét számszerűsíti. Magyarországon a
              <strong className="text-slate-800"> 7/2006. (V. 24.) TNM rendelet</strong> szabályozza
              a tartalmát és a kiállítás feltételeit.
            </p>
            <p>
              A tanúsítvány három fő mutatót tartalmaz:
            </p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Mutató</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Mértékegység</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Mit mér?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-900">Fűtési hőszükséglet</td>
                    <td className="px-4 py-3 text-slate-600">kWh/m²/év</td>
                    <td className="px-4 py-3 text-slate-600">Az épület hőtechnikai burkolói által átengedett hőveszteség.</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">Primer­energia-igény</td>
                    <td className="px-4 py-3 text-slate-600">kWh/m²/év</td>
                    <td className="px-4 py-3 text-slate-600">Az összes energiahordozó (gáz, villamos, nap) primer­energiában kifejezett összege. Ez az osztályba sorolás alapja.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-900">CO₂-kibocsátás</td>
                    <td className="px-4 py-3 text-slate-600">kg CO₂/m²/év</td>
                    <td className="px-4 py-3 text-slate-600">Az épület üzemeltetésével járó szén-dioxid-kibocsátás — egyre fontosabb az EU taxonómia és a banki értékelés szempontjából.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Az osztályok <strong className="text-slate-800">A++(7) jelzéstől G(−) jelzésig</strong> terjednek,
              ahol az A++ közel nulla energiaigényű épületet jelöl. A tanúsítvány 10 évig érvényes, és
              az eMEP (Elektronikus Műszaki Engedélyezési Portál) nyilvántartásban publikusan ellenőrizhető.
            </p>
          </div>
        </section>

        {/* EPC osztályok vizuális */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">EPC osztályok — A++-tól G-ig</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            Az alábbi áttekintő a magyarországi 7/2006. TNM rendelet primerenergia-határértékei alapján
            mutatja be az osztályokat és azok energetikai tartalmát.
          </p>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            {EPC_CLASSES.map((row, i) => (
              <div
                key={row.osztaly}
                className={`flex items-center gap-4 px-5 py-3.5 ${
                  i < EPC_CLASSES.length - 1 ? 'border-b border-slate-100' : ''
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${row.szin} ${row.szoveg}`}
                >
                  {row.osztaly}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{row.hatarErtek}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500">{row.leiras}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mikor kötelező */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">Mikor kötelező az energetikai tanúsítvány?</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            A 7/2006. TNM rendelet alapján energetikai tanúsítványt kell bemutatni az alábbi esetekben:
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: FileText,
                iconBg: 'bg-brand-50',
                iconColor: 'text-brand-600',
                title: 'Ingatlan eladásakor',
                body: 'Az adásvételi szerződés megkötésekor a tanúsítványt be kell mutatni a vevőnek, és a szerződésbe az EPC-osztályt bele kell foglalni. Enélkül az okiratszerkesztő közjegyző nem köteles megkötni a szerződést.',
              },
              {
                icon: Building2,
                iconBg: 'bg-slate-50',
                iconColor: 'text-slate-600',
                title: 'Bérbeadáskor (50 m² felett)',
                body: 'Ha az ingatlan alapterülete meghaladja az 50 m²-t és bérleti szerződést kötnek, az EPC-t a bérlőnek át kell adni. Rövid távú bérbeadás (pl. Airbnb) esetén is kötelező a meglét, bár a bemutatás módja rugalmasabb.',
              },
              {
                icon: AlertTriangle,
                iconBg: 'bg-amber-50',
                iconColor: 'text-amber-600',
                title: 'Hatósági felszólítás esetén',
                body: 'Az építési hatóság bármikor kötelezheti az ingatlan tulajdonosát az energetikai tanúsítvány bemutatására, különösen felújítási engedélyek eljárásában. Hiánya szabálysértési bírságot vonhat maga után.',
              },
              {
                icon: Sun,
                iconBg: 'bg-emerald-50',
                iconColor: 'text-emerald-600',
                title: 'Új építési engedélynél',
                body: 'Új épület esetén az építési engedélyhez tervezett EPC-számítást kell csatolni, és az épület átadáskor tényleges EPC-t kell kiállíttatni. A 2022 január 1 után engedélyezett épületek esetén kötelező az A+ vagy annál jobb osztály.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                  <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${item.iconBg}`}>
                    <Icon size={17} className={item.iconColor} />
                  </div>
                  <h3 className="mb-2 text-sm font-black text-slate-900">{item.title}</h3>
                  <p className="text-xs leading-relaxed text-slate-500">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* EU EPBD 2024 */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">EU EPBD 2024 — a nagy változás</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            A 2024/1275/EU irányelv (az Épületenergetikai Irányelv átdolgozása) 2024 júniusában lépett
            hatályba. Ez a legjelentősebb kötelezettséget rója az EU tagállamokra az épületszektori
            dekarbonizáció terén.
          </p>
          <div className="mb-6 space-y-4">
            <div className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                <Building2 size={20} className="text-brand-600" />
              </div>
              <div>
                <p className="mb-1 font-black text-slate-900">Nem lakóingatlanok — 2030-as határidő</p>
                <p className="text-sm leading-relaxed text-slate-500">
                  Az F és G osztályú kereskedelmi, irodai és ipari ingatlanoknak 2030-ig el kell érniük
                  legalább E osztályt. Ez a legagresszívebb menetrend — érintett a hazai kereskedelmi
                  ingatlanok 30–40%-a becslések szerint.
                </p>
              </div>
            </div>
            <div className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                <Building2 size={20} className="text-orange-600" />
              </div>
              <div>
                <p className="mb-1 font-black text-slate-900">Lakóingatlanok — 2033-as határidő</p>
                <p className="text-sm leading-relaxed text-slate-500">
                  A legrosszabb EPC-osztályú lakóépületeknek 2033-ig kell elérniük legalább E osztályt.
                  Az irányelv implementálása tagállami szintű: <strong>Magyarország implementációja 2025-ig
                  szükséges</strong>, a pontos kötelezettség-küszöbök és mentességek hazai jogszabályban
                  kerülnek meghatározásra. Az irányelv nem ír elő kötelező szankciókat, de a pénzügyi
                  ösztönzők (EU forrás, preferenciális hitelezés) az E+ osztályhoz köthetők.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-brand-100 bg-brand-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={17} className="mt-0.5 shrink-0 text-brand-700" />
                <p className="text-sm leading-relaxed text-brand-800">
                  <strong>Fontos:</strong> Az EPBD 2024 közvetlen hatálya az EU-tagállamokra, nem az
                  egyes tulajdonosokra vonatkozik. Magyarország köteles implementálni — amíg ez meg nem
                  történik, a kötelezettség módja és mértéke nem végleges. Ugyanakkor a banki és
                  biztosítói értékelések az EU-taxonómiát már most figyelembe veszik.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Budapest EPC képe */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">Budapest EPC-képe — a panelépületek helyzete</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            Az eMEP nyilvántartás és az OMSZ/KSH épületállomány-adatok alapján Budapest felújítatlan
            panelépületeinek döntő többsége D–G osztályba esik:
          </p>
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Tipikus panel épület EPC-osztályok Budapesten</p>
            </div>
            {[
              { tipus: 'Felújítatlan panel (1960–1990)', osztaly: 'E–G', szazalek: '~55%', megjegyzes: 'Primerenergia-szükséglet 300+ kWh/m²/év.' },
              { tipus: 'Részlegesen felújított (csak ablakcsere)', osztaly: 'D–E', szazalek: '~20%', megjegyzes: 'Primerenergia 200–300 kWh/m²/év.' },
              { tipus: 'Komplex felújított (ETICS + nyílászáró + gépészet)', osztaly: 'BB–C', szazalek: '~15%', megjegyzes: 'Primerenergia 130–200 kWh/m²/év.' },
              { tipus: 'Mélyfelújított (hőszivattyú, napelem, ETICS)', osztaly: 'A–BB', szazalek: '~10%', megjegyzes: 'Primerenergia 80–130 kWh/m²/év.' },
            ].map((row, i) => (
              <div key={row.tipus} className={`flex flex-col gap-1.5 px-5 py-4 sm:flex-row sm:items-center sm:gap-4 ${i < 3 ? 'border-b border-slate-100' : ''}`}>
                <div className="sm:w-64">
                  <p className="text-sm font-black text-slate-900">{row.tipus}</p>
                  <p className="text-xs text-slate-400">{row.szazalek} az állomány</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    row.osztaly.startsWith('E') || row.osztaly.startsWith('F') || row.osztaly.startsWith('G')
                      ? 'bg-red-100 text-red-800'
                      : row.osztaly.startsWith('D')
                      ? 'bg-orange-100 text-orange-800'
                      : row.osztaly.startsWith('BB') || row.osztaly.startsWith('C')
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {row.osztaly}
                  </span>
                  <p className="text-xs text-slate-500">{row.megjegyzes}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="leading-relaxed text-slate-500">
            Az EU taxonómia (2020/852/EU rendelet) és az EBA (Európai Bankhatóság) hitelkockázati
            irányelvei szerint a G osztályú lakóingatlanok <strong className="text-slate-800">egyre
            nehezebben hitelezhetők</strong>: a bankok a kockázati felárba beépítik az energetikai
            kockázatot. Ez az értékcsökkentő hatás Magyarországon jelenleg kisebb, mint Nyugat-Európában,
            de a trendje egyértelmű — különösen az EU direktíva implementálásával párhuzamosan.
          </p>
        </section>

        {/* Hogyan javítható */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">Hogyan javítható az EPC osztály?</h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            Az EPC-osztály javítása befektetés az ingatlan értékébe, a lakók komfortjába és az
            energiaszámlák csökkentésébe. A négy legfontosabb beavatkozás — csökkenő várható
            megtérülési idő szerint:
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {IMPROVEMENT_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={17} className="text-brand-600" />
                  </div>
                  <h3 className="mb-2 text-sm font-black text-slate-900">{item.title}</h3>
                  <p className="text-xs leading-relaxed text-slate-500">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Hol kell kiállíttatni */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">Hol kell kiállíttatni az EPC-t?</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            Energetikai tanúsítványt kizárólag az <strong>akkreditált energetikai tanúsítók névjegyzékébe</strong>
            {' '}felvett, hatályos jogosultsággal rendelkező szakember állíthat ki. Az eMEP
            (Elektronikus Műszaki Engedélyezési Portál) nyilvántartásában ellenőrizhető a tanúsító
            státusza és az általa kiállított tanúsítványok listája.
          </p>
          <div className="space-y-3">
            {[
              {
                icon: CheckCircle,
                iconColor: 'text-emerald-600',
                label: 'Jogosult tanúsítók listája',
                desc: 'Az eMEP portálon (emep.e-epites.hu) kereshető névre, cégnévre vagy régióra.',
              },
              {
                icon: FileText,
                iconColor: 'text-brand-600',
                label: 'eMEP rendszer',
                desc: 'A tanúsítvány elektronikusan rögzítésre kerül az eMEP rendszerben. Az azon szereplő egyedi azonosítóval az adásvételi szerződésben hivatkozni kell az EPC-re.',
              },
              {
                icon: BarChart2,
                iconColor: 'text-slate-600',
                label: 'Díjak',
                desc: 'Egyedi lakás EPC-je 25 000–50 000 Ft; társasházi épületre vonatkozó közös tanúsítvány 50 000–120 000 Ft között mozog az épület méretétől függően.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-5 py-4">
                  <Icon size={18} className={`mt-0.5 shrink-0 ${item.iconColor}`} />
                  <div>
                    <p className="mb-0.5 text-sm font-black text-slate-900">{item.label}</p>
                    <p className="text-xs leading-relaxed text-slate-500">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* EPC és ingatlanérték */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">Az EPC és az ingatlanérték</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            Az energetikai osztály egyre meghatározóbb tényezővé válik az ingatlan piaci értékében.
            A legfrissebb európai kutatások és a hazai adatok ezt a tendenciát erősítik.
          </p>
          <div className="space-y-4">
            {[
              {
                icon: TrendingUp,
                iconBg: 'bg-brand-50',
                iconColor: 'text-brand-600',
                title: 'Utrecht tanulmány (2022) — EU-szintű összefüggés',
                body: 'Az Utrecht Egyetem 2022-es, 30 EU-s városra kiterjedő vizsgálata szerint az A és G osztályú lakások piaci ára között átlagosan 30–40%-os különbség mérhető, azonos elhelyezkedés esetén. A prémium különösen magas Hollandiában, Belgiumban és az DACH-régióban — Magyarországon jelenleg 8–15% körülire becsülhető.',
              },
              {
                icon: Shield,
                iconBg: 'bg-slate-50',
                iconColor: 'text-slate-600',
                title: 'RICS 2023 — kötelező értékelési szempontok',
                body: 'A Royal Institution of Chartered Surveyors (RICS) 2023-as frissített értékbecslési iránymutatása előírja, hogy a tanúsított értékbecslőknek az EPC-osztályt mint értékmódosító tényezőt kötelezően szerepeltetniük kell az értékbecslési jelentésben. Magyarországon az RICS-tagszabványok irányadók a banki értékbecslési piacon.',
              },
              {
                icon: AlertTriangle,
                iconBg: 'bg-amber-50',
                iconColor: 'text-amber-600',
                title: 'Hitelezési kockázat — EU taxonómia hatása',
                body: 'Az EBA 2023-as hitelkockázati irányelvei alapján a bankok kötelesek az ingatlanok fizikai klímakockázatát (beleértve az EPC-osztályt) beépíteni a hitelkockázati értékelésbe. G osztályú épületek esetén egyes bankok már most magasabb kamatfelárral vagy alacsonyabb LTV-vel (Loan-to-Value) finanszíroznak. Ez a tendencia erősödni fog a Magyarország EPBD-implementációját követő időszakban.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                  <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}>
                    <Icon size={18} className={item.iconColor} />
                  </div>
                  <div>
                    <p className="mb-1.5 font-black text-slate-900">{item.title}</p>
                    <p className="text-sm leading-relaxed text-slate-500">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Stat strip */}
        <div className="mb-14 grid gap-4 sm:grid-cols-3">
          {[
            { value: '30–40%', label: 'Értékkülönbség A vs. G osztályú lakások között az EU-ban (Utrecht, 2022)' },
            { value: '~600 000', label: 'Magyar lakás érintheti a kötelező E osztályra emelés az EPBD 2033-as határideje alapján' },
            { value: '2–3', label: 'EPC-osztálynyi javulás érhető el külső hőszigeteléssel egy felújítatlan panelépületen' },
          ].map((stat) => (
            <div key={stat.value} className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center shadow-sm">
              <p className="mb-1 text-3xl font-black text-brand-600">{stat.value}</p>
              <p className="text-xs leading-snug text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mb-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-md">
          <h2 className="mb-2 text-2xl font-black text-white">
            Javítsa épülete energiaosztályát — Panelprogram és hőszigetelés
          </h2>
          <p className="mb-6 mx-auto max-w-lg text-brand-100">
            Tekintse meg a PanelLakó Zöld Társasház hőszigetelési útmutatóját: pályázati lehetőségek,
            finanszírozási módok és az EPC-osztály lépésről lépésre való javítása a 2033-as EPBD-határidő
            előtt.
          </p>
          <Link
            href="/zold-tarsashaz/hoszigeteles-panelprogram"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-transform hover:scale-[1.03]"
          >
            Hőszigetelés Panelprogram
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Vissza */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/klimakockazat-epuleteknel" className="flex items-center gap-1 hover:text-brand-600">
            ← Vissza: Klímakockázat Épületeknél főoldal
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
