import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Train,
  Bus,
  Navigation,
  ChevronRight,
  ArrowRight,
  CheckCircle,
  Heart,
  Users,
  Map,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Villamos, Metró, HÉV — Gyalogos Elérhetőség | PanelLakó',
  description:
    'Melyik budapesti lakónegyedekben érhető el villamos, metró vagy HÉV megálló 420 méteren belül? Gyaloglási elérhetőség és közlekedési arány elemzés.',
  alternates: {
    canonical:
      'https://panellako.hu/tomegkozlekedes-elemzes/villamos-metro-hev-elerheto-lakoneegyedek',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Villamos, metró és HÉV — melyik kerületekből érhető el gyalog?',
  description:
    'Melyik budapesti lakónegyedekben érhető el villamos, metró vagy HÉV megálló 420 méteren belül? Gyaloglási elérhetőség és közlekedési arány elemzés.',
  inLanguage: 'hu',
  url: 'https://panellako.hu/tomegkozlekedes-elemzes/villamos-metro-hev-elerheto-lakoneegyedek',
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
      name: 'Tömegközlekedés Elemzés',
      item: 'https://panellako.hu/tomegkozlekedes-elemzes',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Villamos Metró HÉV Elérhetőség',
      item: 'https://panellako.hu/tomegkozlekedes-elemzes/villamos-metro-hev-elerheto-lakoneegyedek',
    },
  ],
};

const METRO_LINES = [
  {
    line: 'M1 (Millenniumi Földalatti)',
    route: 'Vörösmarty tér — Mexikói út',
    covered: 'V., VI., XIV. kerület belső sávja',
    note: 'A világ harmadik legrégebbi, UNESCO-védett metróvonala; kis állomásköz.',
    color: 'text-yellow-500',
    bg: 'bg-yellow-50',
  },
  {
    line: 'M2',
    route: 'Déli pu. — Örs vezér tere',
    covered: 'I., V., VIII., X. kerület, Kelenföld',
    note: 'Keleti pályaudvarnál és Kelenföldi pályaudvarnál intermodális csomópont.',
    color: 'text-red-500',
    bg: 'bg-red-50',
  },
  {
    line: 'M3',
    route: 'Újpest-Központ — Kőbánya-Kispest',
    covered: 'IV., XIII., V., IX., X., XIX. kerület',
    note: 'A leghosszabb metróvonal; 2023-ban megújult összes állomása.',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    line: 'M4',
    route: 'Kelenföldi pu. — Keleti pu.',
    covered: 'XI., I., IV. kerület, Kelenföld',
    note: 'Legújabb metróvonal (2014); nagy közlekdési koridort fed le az Örsöd–Keleti tengelyen.',
    color: 'text-green-500',
    bg: 'bg-green-50',
  },
];

const HEV_LINES = [
  {
    line: 'H5 (Szentendrei HÉV)',
    route: 'Batthyány tér — Szentendre',
    districts: 'III. kerület, Aquincum, Leányfalu, Visegrád térség',
  },
  {
    line: 'H6 (Ráckevei HÉV)',
    route: 'Közvágóhíd — Ráckeve',
    districts: 'IX., XX., XXI. kerület, Csepel, Ráckevei-Duna-ág mente',
  },
  {
    line: 'H7 (Csepeli HÉV)',
    route: 'Boráros tér — Csepel',
    districts: 'IX., XXI. kerület (Csepel-sziget)',
  },
  {
    line: 'H8 (Gödöllői HÉV)',
    route: 'Örs vezér tere — Gödöllő',
    districts: 'XIV., XVI. kerület, Kistarcsa, Pécel, Gödöllő',
  },
  {
    line: 'H9 (Csömöri HÉV)',
    route: 'Örs vezér tere — Csömör',
    districts: 'XIV., XVI. kerület, Cinkota, Csömör',
  },
];

const SIMULTANEOUS_COVERAGE = [
  {
    district: 'V. kerület (Belváros)',
    modes: ['M2', 'M3', 'M4 (közel)', 'Villamos 2', 'Villamos 2B', 'Trolibusz 72, 73'],
    score: 'Kiváló',
    color: 'text-brand-600',
    bg: 'bg-brand-50',
    border: 'border-brand-200',
  },
  {
    district: 'VII. kerület (Erzsébetváros)',
    modes: ['M2 (Blaha)', 'Villamos 4-6', 'Villamos 1', 'Trolibuszok'],
    score: 'Nagyon jó',
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  {
    district: 'IX. kerület (Ferencváros)',
    modes: ['M3', 'M4', 'H6', 'Villamos 2', 'Trolibuszok'],
    score: 'Nagyon jó',
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  {
    district: 'XIV. kerület (Zugló)',
    modes: ['M1', 'H8', 'H9', 'Villamos 1', 'Villamos 62'],
    score: 'Jó',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  {
    district: 'XVI. kerület',
    modes: ['H8 (részben)', 'H9 (részben)', 'csak busz a többi részen'],
    score: 'Vegyes',
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  {
    district: 'XVII. kerület',
    modes: ['csak buszok'],
    score: 'Korlátozott',
    color: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
];

export default function VillamosMetroHevElerhetesekkPage() {
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
        <nav aria-label="Navigáció" className="mb-8 flex flex-wrap items-center gap-1.5 text-sm text-slate-400">
          <Link href="/" className="hover:text-slate-600">
            Főoldal
          </Link>
          <ChevronRight size={14} />
          <Link href="/tomegkozlekedes-elemzes" className="hover:text-slate-600">
            Tömegközlekedés Elemzés
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-600">Villamos Metró HÉV Elérhetőség</span>
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
            <Train size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Villamos, metró és HÉV — melyik kerületekből érhető el gyalog?
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            Budapest kötöttpályás hálózata — a metró, a villamos és a HÉV-vonalak — az agglomerációs
            közlekedés gerincét alkotják. De az egyenlőtlen hálózateloszlás miatt egyes kerületek lakói
            10–15 percet gyalogolnak a legközelebbi kötöttpályás megállóhoz, míg máshol három különböző
            kötöttpályás mód is elérhető 420 méteren belül. Ez az útmutató kerületi bontásban vizsgálja,
            hol és mit ér el a lakó gyalog.
          </p>
        </div>

        {/* Miért fontos a gyaloglási elérhetőség */}
        <section className="mb-16">
          <h2 className="mb-3 text-2xl font-black text-slate-900">Miért fontos a gyaloglási elérhetőség?</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            A várostudomány a <strong>„transit desert&quot;</strong> (közlekedési sivatag) fogalmával jelöli
            azokat a lakóterületeket, ahol a tömegközlekedési ellátottság annyira hiányos, hogy a lakók
            kénytelenek személyautóra támaszkodni a napi mozgáshoz. Ezek a területek egyszerre szenvednek
            magasabb közlekedési költségektől, rosszabb levegőminőségtől és alacsonyabb ingatlanlikviditástól.
          </p>
          <p className="mb-5 leading-relaxed text-slate-500">
            A Szegedi Tudományegyetem 2022-es városmobilitási vizsgálata és az EU SUMP (Sustainable Urban
            Mobility Plan) keretrendszere egyaránt a <strong>400–500 méteres gyaloglási küszöböt</strong> alkalmazza
            a „jó elérhetőség&quot; minimumkövetelményeként. Az Egészségügyi Világszervezet (WHO) aktivitási
            iránymutatásai szerint a napi 30 perces gyaloglás célértékéhez a rövid, megállóig tartó sétákat
            is számítani kell — ez teszi a gyalogos elérhetőséget népegészségügyi szemponttá is.
          </p>
          <div className="flex items-start gap-4 rounded-2xl border border-brand-100 bg-brand-50 p-5">
            <Heart size={20} className="mt-0.5 shrink-0 text-brand-600" />
            <p className="text-sm leading-relaxed text-slate-600">
              A mozgásban gazdag lakókörnyezet csökkenti az ülő életmód kockázatait, javítja a
              légzési és szív-érrendszeri egészséget, és csökkenti a szer-használati kockázatokat —
              ezért a WHO aktív mobilitási ajánlásai a lakásválasztási döntésekre is közvetlen hatással vannak.
            </p>
          </div>
        </section>

        {/* Budapest villamoshálózata */}
        <section className="mb-16">
          <h2 className="mb-3 text-2xl font-black text-slate-900">Budapest villamoshálózata</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            Budapest 32 villamosvonalával Közép-Európa egyik legsűrűbb villamosnál rendelkezik. A hálózat
            súlypontja a Pest belvárosára koncentrálódik, ahol a <strong>4-es és 6-os villamos</strong>
            (a világ egyik legforgalmasabb villamosai közé sorolják) a Nagykörút teljes hosszán végighalad.
            Budán a 2-es villamos a Duna-part mentén nyújt kiváló összeköttetést az I. kerület és
            Kelenföld között.
          </p>
          <p className="mb-5 leading-relaxed text-slate-500">
            A legjobban lefedett kerületek villamos szempontjából: <strong>V., VI., VII., VIII., IX.,</strong>
            és <strong>XIV. kerület</strong>. Ezeken a területeken a legtöbb ingatlan 420 méteren belül el
            tud érni legalább egy villamosmegállót. A külső pesti kerületekben (XVI., XVII., XVIII., XIX., XX.)
            a villamoshálózat hiányzik vagy töredékes.
          </p>
          <p className="mb-5 leading-relaxed text-slate-500">
            Fejlesztések terén kiemelendő az <strong>1-es villamos hosszabbítása</strong>: az eredeti
            Közvágóhíd–Hungária körút szakaszon túl tervezett meghosszabbítás Rákosrendező felé és a
            Baross tér irányába növelné a XIV. és X. kerület kötöttpályás lefedettségét. Emellett a
            <strong> 3-as metró felszíni pótlásának</strong> véglegesítése és a déli Soroksári út
            villamosítási terve is befolyásolhatja a jövőbeni kerületi lefedettségi arányokat.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {['I.', 'II.', 'III.', 'IV.', 'V.', 'VI.', 'VII.', 'VIII.', 'IX.', 'XI.', 'XIII.', 'XIV.'].map((d) => (
              <div
                key={d}
                className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5"
              >
                <CheckCircle size={14} className="shrink-0 text-amber-500" />
                <span className="text-sm font-medium text-slate-700">{d} kerület — van villamosmegálló 420 m-en belül</span>
              </div>
            ))}
          </div>
        </section>

        {/* Metróval lefedett területek */}
        <section className="mb-16">
          <h2 className="mb-3 text-2xl font-black text-slate-900">Metróval leginkább lefedett területek</h2>
          <p className="mb-7 leading-relaxed text-slate-500">
            Budapest négy metróvonala összesen 42 állomást érint és a belváros, az észak-pesti, a keleti
            és a dél-pesti tengelyeket fedi le. Alább a négy vonal rövid jellemzése és területi lefedettsége látható.
          </p>
          <div className="mb-6 space-y-4">
            {METRO_LINES.map((m) => (
              <div
                key={m.line}
                className={`rounded-2xl border border-slate-100 ${m.bg} p-5`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Train size={16} className={m.color} />
                  <p className={`font-black ${m.color}`}>{m.line}</p>
                  <span className="text-sm text-slate-500">{m.route}</span>
                </div>
                <p className="mb-1.5 text-sm font-semibold text-slate-700">
                  Érintett területek: {m.covered}
                </p>
                <p className="text-sm leading-relaxed text-slate-500">{m.note}</p>
              </div>
            ))}
          </div>
          <p className="leading-relaxed text-slate-500">
            <strong>Fehér foltok</strong> — ahol a metróhálózat nem fed le területeket — elsősorban
            a budai hegyvidék (II., XII. kerület belső területei), a nagy kiterjedésű külső pesti kerületek
            (XVI., XVII., XVIII., XIX., XX., XXI., XXII.) és Óbuda egyes részeit (III. kerület északi területe)
            érintik. Ezeken a területeken a tömegközlekedési gerincszolgáltatást kizárólag buszjáratok adják,
            amelyek a közúti dugók miatt kevésbé megbízhatóak.
          </p>
        </section>

        {/* HÉV és elővárosi vasút */}
        <section className="mb-16">
          <h2 className="mb-3 text-2xl font-black text-slate-900">HÉV és elővárosi vasút</h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            Az öt HÉV-vonal (H5–H9) az agglomerációs közlekedés meghatározó eszköze, de a városon belül is
            fontos hálózati elemet alkotnak. A BKK integrált menetrendjébe beillesztett HÉV-vonalak az
            agglomerációs közlekedési kártyával ugyanolyan feltételekkel használhatók, mint a belső
            tömegközlekedés — ez az integráció 2020 óta teljes körű.
          </p>
          <div className="mb-6 space-y-3">
            {HEV_LINES.map((h) => (
              <div
                key={h.line}
                className="rounded-2xl border border-purple-100 bg-purple-50 p-4"
              >
                <p className="mb-1 font-bold text-purple-700">{h.line}</p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Útvonal:</span> {h.route}
                </p>
                <p className="text-sm text-slate-500">
                  <span className="font-medium">Érintett területek:</span> {h.districts}
                </p>
              </div>
            ))}
          </div>
          <p className="leading-relaxed text-slate-500">
            Az agglomerációs ingatlanpiac szempontjából a HÉV-vonalak különös fontossággal bírnak.
            A H8 (Gödöllői) és H5 (Szentendrei) vonalak mentén fekvő — Budapesttől 20–35 km-re lévő —
            városokban (Gödöllő, Szentendre, Pomáz) a budapesti vásárlóerőhöz képest mérsékeltebb
            ingatlanárak ellenére a HÉV-vel gyors eljutás biztosítja a lényeges életminőség-megtartást.
          </p>
        </section>

        {/* Trolibuszok és buszok */}
        <section className="mb-16">
          <h2 className="mb-3 text-2xl font-black text-slate-900">Trolibuszok és buszok szerepe</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            Budapest 15 trolibuszvonala elsősorban a VII., VIII. és XIV. kerületben teremt összeköttetést,
            kiegészítve a villamosok és a metró által le nem fedett utcákat. A trolibuszok emissziómentes
            üzemmódja és viszonylag sűrű megállósűrűsége miatt értékes kiegészítői a kötöttpályás
            hálózatnak, különösen az Erzsébet körút, a Thököly út és a Bosnyák téri tengelyen.
          </p>
          <p className="mb-5 leading-relaxed text-slate-500">
            A 200+ buszvonalas hálózat azokban a kerületekben veszi át a gerincszolgáltatás szerepét,
            ahol sem metró, sem villamos, sem HÉV nem érhető el: ilyen a XVI., XVII., XVIII., XIX., XX.,
            XXI. és XXII. kerület nagy része, valamint a budai hegyvidék (XII. kerület egyes pontjai).
            A buszhálózat hátránya a közúti forgalomtól való függőség és a hosszabb menetidők, amelyek
            csúcsidőben jelentősen megnövekedhetnek.
          </p>
          <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <Bus size={20} className="mt-0.5 shrink-0 text-blue-600" />
            <p className="text-sm leading-relaxed text-slate-600">
              A PanelLakó elemzőeszköz a megállókat típusonként különbözteti meg: a kötöttpályás
              (metró, villamos, HÉV) és a nem kötöttpályás (busz, trolibusz) megállók külön réteget
              alkotnak a térképen, lehetővé téve, hogy az ingatlan közlekedési elérhetőségét mód szerint
              is vizsgálni lehessen.
            </p>
          </div>
        </section>

        {/* Szimultán lefedettség */}
        <section className="mb-16">
          <h2 className="mb-3 text-2xl font-black text-slate-900">Szimultán lefedettség</h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            A legértékesebb közlekedési elérhetőségi szituáció az, amikor egyetlen ingatlan 420 méteres
            körzetébe legalább <strong>két különböző kötöttpályás mód</strong> is beleesik. Ez egyszerre
            biztosítja a hálózati redundanciát (ha az egyik vonal leáll, a másik elérhető) és a rugalmas
            útvonal-tervezési lehetőséget különböző irányokba.
          </p>
          <div className="mb-6 space-y-4">
            {SIMULTANEOUS_COVERAGE.map((sc) => (
              <div
                key={sc.district}
                className={`rounded-2xl border ${sc.border} ${sc.bg} p-5`}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black text-slate-900">{sc.district}</p>
                  <span className={`rounded-full bg-white px-3 py-1 text-xs font-bold ${sc.color}`}>
                    {sc.score}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sc.modes.map((mode) => (
                    <span
                      key={mode}
                      className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm"
                    >
                      {mode}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="leading-relaxed text-slate-500">
            A szimultán lefedettség elemzése megmutatja, hogy Budapest közlekedési gazdagsága erősen
            koncentrált: a belváros és a közel fekvő belső kerületek lényegesen jobb kötöttpályás
            elérhetőséggel rendelkeznek, mint a külső kerületek. Ez az egyenlőtlenség az ingatlanárakban
            is tükröződik: hasonló méretű és állapotú lakásokért a belvárosban magasabb négyzetméterárat
            kell fizetni, részben a superior közlekedési elérhetőség prémiumaként.
          </p>
        </section>

        {/* Hogyan ellenőrzöd */}
        <section className="mb-16">
          <h2 className="mb-3 text-2xl font-black text-slate-900">Hogyan ellenőrzöd a saját épületedet?</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            A PanelLakó <strong>15 perces város funkcióval</strong> bármely budapesti épület vagy cím
            közlekedési elérhetőségét meg lehet vizsgálni. A funkció megmutatja:
          </p>
          <ul className="mb-7 space-y-3 text-slate-600">
            <li className="flex items-start gap-3 text-sm leading-relaxed">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong>420 méteres körben lévő megállók</strong> típusonkénti bontásban (metró, villamos,
                HÉV, busz, trolibusz), megállónévvel és vonalszámokkal.
              </span>
            </li>
            <li className="flex items-start gap-3 text-sm leading-relaxed">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong>Kötöttpályás lefedettségi arány</strong> — a 420 méteres körben lévő megállók
                mekkora hányada kötöttpályás mód.
              </span>
            </li>
            <li className="flex items-start gap-3 text-sm leading-relaxed">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong>Frekvencia-mutató</strong> — az elérhető megállók napi járatszáma a GTFS adatok
                alapján, csúcs- és völgyidei bontásban.
              </span>
            </li>
            <li className="flex items-start gap-3 text-sm leading-relaxed">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong>Kerületi összehasonlítás</strong> — az adott épület közlekedési pontszámának
                helye a kerületi átlaghoz és a budapesti átlaghoz képest.
              </span>
            </li>
            <li className="flex items-start gap-3 text-sm leading-relaxed">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong>Szimultán lefedettség vizualizáció</strong> — a térképen egyszerre látható az
                összes 420 méteres körzetbe eső kötöttpályás megálló és azok vonalai.
              </span>
            </li>
          </ul>
          <div className="mb-7 flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <Users size={20} className="mt-0.5 shrink-0 text-brand-600" />
            <p className="text-sm leading-relaxed text-slate-600">
              A 15 perces város pontszám emellett az iskolák, egészségügyi intézmények, élelmiszerboltok
              és zöldterületek elérhetőségét is összesíti, teljes körű képet adva arról, hogy az adott
              épület mennyire illeszkedik a kompakt, gyalogosan bejárható városmodellbe.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/elemzes/budapest-kozlekedes"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-brand-200 transition-all hover:bg-brand-700"
            >
              <Map size={16} />
              Interaktív közlekedési térkép
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-5 py-3 text-sm font-bold text-brand-700 transition-all hover:bg-brand-100"
            >
              <Navigation size={16} />
              Ingyenes fiók létrehozása
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* Back link */}
        <div className="border-t border-slate-100 pt-8">
          <Link
            href="/tomegkozlekedes-elemzes"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <ChevronRight size={14} className="rotate-180" />
            Vissza: Tömegközlekedés Elemzés
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
