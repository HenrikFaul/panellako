import type { Metadata } from 'next';
import Link from 'next/link';
import {
  VolumeX,
  Volume2,
  ChevronRight,
  AlertTriangle,
  Building2,
  ArrowRight,
  Shield,
  Wrench,
  BarChart2,
  Users,
  Layers,
  Home,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Zajvédelem Társasházban — Hangszigetelés és Műszaki Megoldások | PanelLakó',
  description:
    'Hogyan javítható a hangszigetelés társasházi lakásban és épületszinten? Közös döntések, pályázatok, hatékony megoldások lépésről lépésre.',
  alternates: {
    canonical: 'https://panellako.hu/zajszennyezes-budapest/zajvedes-tarsashazban',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Zajvédelem társasházban — műszaki megoldások és közös döntések',
  description:
    'Hogyan javítható a hangszigetelés társasházi lakásban és épületszinten? Közös döntések, pályázatok, hatékony megoldások lépésről lépésre.',
  inLanguage: 'hu',
  url: 'https://panellako.hu/zajszennyezes-budapest/zajvedes-tarsashazban',
  publisher: {
    '@type': 'Organization',
    name: 'PanelLakó',
    url: 'https://panellako.hu',
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Főoldal', item: 'https://panellako.hu' },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Zajszennyezés Budapest',
      item: 'https://panellako.hu/zajszennyezes-budapest',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Zajvédelem Társasházban',
      item: 'https://panellako.hu/zajszennyezes-budapest/zajvedes-tarsashazban',
    },
  ],
};

const INSULATION_TYPES = [
  {
    icon: Volume2,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    title: 'Léghangszigetelés (Rw)',
    body: 'A léghangszigetelés az átmenő léghangot — pl. zeneszó, beszéd, tévé — csökkenti. Mértéke az Rw (súlyozott hanggátlási szám) értékkel fejezhető ki, amelyet dB-ben adunk meg. Magyar szabvány szerint lakóépületek lakáselválasztó falainál az MSZ EN ISO 717-1 szerinti Rw ≥ 52 dB értéket kellene elérni — a régi panelépületek falai ezt sokszor nem teljesítik.',
  },
  {
    icon: Layers,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    title: 'Lépéshangszigetelés (Lw)',
    body: 'A lépéshang az épület szerkezetén terjedő mechanikai rezgés — padlón járás, székek tologatása, súlyos tárgyak leesése. Mértéke az Lw (súlyozott ütéshangsugárzás) értékkel írható le: minél kisebb az Lw érték, annál jobb a szigetelés. Új épületeknél az előírt érték Lw ≤ 58 dB(A). A vasbeton fedések és az alápincézett paneleknél ez különösen kritikus érték.',
  },
  {
    icon: Wrench,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    title: 'Rezgéscsillapítás (gépek, lift)',
    body: 'A liftgép, a szivattyúk, a fűtési keringtetők és a szellőztető berendezések rezgéseket gerjeszt az épület szerkezetén keresztül. A rezgéscsillapítás rugalmas alátétekkel, antivibráló konzolokkal és géptalp-rugózással érhető el. Ez különösen liftcsere esetén kritikus, ahol az új géptér elhelyezése akár 10–15 dB ütéshanggal csökkentheti a közelben lévő lakások zajterhelését.',
  },
  {
    icon: Home,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    title: 'Ütéshangszigetelés (padló)',
    body: 'Az ütéshang legfőbb terjedési útja a padló. Az ütéshang ellen a padlón belüli lebegő esztrich megoldás (rugalmas alapozású aljzatbeton) a leghatékonyabb — ez 15–25 dB Lw javulást adhat. Meglévő padlónál vékony rugalmas alapozású padlóburkolat és szőnyeg alkalmazható, amely kisebb, de érzékelhető javulást hoz.',
  },
];

const INDIVIDUAL_SOLUTIONS = [
  {
    solution: 'Rugalmas padlóburkolat',
    improvement: '1,5–3 dB Lw javulás',
    cost: 'alacsony-közepes',
    detail: 'Rugalmas vinilburkolat, parafa padló vagy szivacsos alátétű laminált padló az ütéshanggal szemben hatékonyabb, mint a kemény kerámia vagy kőburkolat. Könnyen felszerelhető, nem igényel az épület szerkezeti megbontását.',
    color: 'bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  {
    solution: 'Szőnyeg, szőnyegpadló',
    improvement: '3–6 dB Lw javulás',
    cost: 'alacsony',
    detail: 'A szőnyeg — különösen sűrű, vastag alátéttel — az ütéshang ellen a legolcsóbb és leggyorsabb megoldás. A szőnyeg 3–6 dB Lw értékel csökkenti az alatta lévő lakásba terjedő ütéshangot. Nappalihoz, hálószobához, gyermekszobához egyaránt ajánlott.',
    color: 'bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  {
    solution: 'Ajtótömítés (füles, szivacsos)',
    improvement: '3–5 dB Rw javulás',
    cost: 'nagyon alacsony',
    detail: 'Az ajtó rések a léghangszigetelés leggyengébb pontjai. Minőségi ajtótömítő gumi (EPDM szalag), söpröge-tömítő és küszöbszigetelés alkalmazása szignifikánsan csökkenti az ajtón át szüremkedő hangot — különösen lépcsőházi zajok esetén.',
    color: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    solution: 'Ablakcsere (egyrétegű → kétrétegű)',
    improvement: 'Rw 32 → 42 dB',
    cost: 'közepes-magas',
    detail: 'Az ablakcsere az utcai és szomszédi léghangszigetelés leghatékonyabb egyéni beavatkozása. Egyrétegű üvegezésről kétrétegű, 4-12-4 mm-es hőszigetelő üvegre való váltással az ablak Rw értéke 10 dB-rel javítható. Speciális zajcsillapító üveggel (Rw 44–48 dB) ez még tovább növelhető.',
    color: 'bg-brand-50 border-brand-200',
    badge: 'bg-brand-100 text-brand-700',
  },
];

const BUILDING_SOLUTIONS = [
  {
    icon: Wrench,
    title: 'Lift géptermének szigetelése',
    body: 'Az elavult liftek géptere az egyik legnagyobb rezgés- és zajforrás a társasházban. A géptér rugalmas alapozású géptalp-cseréje, a trafó és a motor antivibráló konzolon való rögzítése, és a géptér falainak akusztikai borítása 15–20 dB rezgéscsökkentést adhat a szomszédos lakásokban. Liftcsere esetén az új gép elhelyezése és rögzítési módja az egyik legkritikusabb döntés.',
  },
  {
    icon: Layers,
    title: 'Lépcsőházi padlóburkolat',
    body: 'A kemény, csiszolatlan beton vagy csempeburkolat a lépcsőházon terjedő lépéshang fő terjedési útja. Rugalmas, fél-kemény szőnyegburkolat (Lw ≥ 0,4 mm alátéttel) vagy antisztatikus, akusztikai padlólap alkalmazása csökkenti a lépcső- és forgalomzajt az összes szomszédos lakásban. Ez különösen reggel (6–8 h) és este (20–22 h) érzékelhető.',
  },
  {
    icon: Building2,
    title: 'Bejárati ajtó cseréje',
    body: 'Az épület bejárati ajtaja nemcsak hőveszteség-, hanem zajvédelmi szempontból is kulcselem. Legalább Rw 30 dB értékű ajtó és megfelelő küszöb-tömítés alkalmazása csökkenti a kültéri utcai zaj behatolását a közös közlekedő területekre — ahonnan a zajok tovább terjedhetnek a lakásokba.',
  },
  {
    icon: Shield,
    title: 'Gépészeti rezgéscsillapítók',
    body: 'A fűtési keringtető szivattyúk, a HMV-tartály, a bojlerek és a szellőztető ventilátoros egységek rezgéseket generálnak, amelyek a csöveken és a falszerkezeten terjednek. Rugalmas csővezető-csatlakozások (kompenzátorok), antivibráló géptalp-betétek és rugalmas csőbilincsek alkalmazása a zajforrásnál a leghatékonyabb — és legolcsóbb — épületi zajvédelmi beavatkozások egyike.',
  },
];

const WINDOW_COMPARISON = [
  {
    type: 'Egyrétegű üveg (régi)',
    rw: '22–27 dB',
    suitability: 'Nem elegendő',
    color: 'text-red-600',
    note: 'Tipikus a 70-es/80-as évekbeli panel lakásokban',
  },
  {
    type: 'Kétrétegű hőszigetelő',
    rw: '32–38 dB',
    suitability: 'Megfelelő csendes utcán',
    color: 'text-amber-600',
    note: 'Standard hőszigeteléssel kombinált csomag',
  },
  {
    type: 'Kétrétegű akusztikai üveg',
    rw: '38–44 dB',
    suitability: 'Jó forgalmas utcán',
    color: 'text-brand-600',
    note: 'Laminált üvegréteggel, hangcsillapító PVB fóliával',
  },
  {
    type: 'Háromrétegű akusztikai',
    rw: '44–48 dB',
    suitability: 'Kiváló villamosnál, főútnál',
    color: 'text-emerald-600',
    note: 'Prémium kategória, rezgésgátló kerettel együtt maximális',
  },
];

export default function ZajvedelemTarsashazbanPage() {
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
          <Link href="/" className="hover:text-slate-600 transition-colors">
            Főoldal
          </Link>
          <ChevronRight size={14} />
          <Link href="/zajszennyezes-budapest" className="hover:text-slate-600 transition-colors">
            Zajszennyezés Budapest
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-600">Zajvédelem Társasházban</span>
        </nav>

        {/* Hero */}
        <div className="mb-14">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <VolumeX size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Zajvédelem társasházban —{' '}
            <span className="text-brand-600">műszaki megoldások és közös döntések</span>
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            A társasházi zajvédelem nem egyetlen megoldásból áll: egyéni lakásbeli beavatkozások, épületi szintű közös döntések és pályázati lehetőségek együtt adnak tartós eredményt. Ez az útmutató összegyűjti a hatékony hangszigetelési megoldásokat — a konkrét műszaki adatoktól az önkormányzati pályázatokig.
          </p>
        </div>

        {/* A hangszigetelés típusai */}
        <section aria-labelledby="szigeteles-tipusai-heading" className="mb-14">
          <h2 id="szigeteles-tipusai-heading" className="mb-5 text-2xl font-black text-slate-900">
            A hangszigetelés típusai társasházakban
          </h2>
          <p className="mb-7 text-slate-500 leading-relaxed">
            A hang különböző utakon terjed az épületen belül — ezért a zajvédelem is különböző módszereket igényel. Az MSZ EN ISO 12354 szabványcsalád négy alapvető terjedési mechanizmust különböztet meg, amelyeket külön kell kezelni.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {INSULATION_TYPES.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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

        {/* Mikor jogosult a lakó zajvédelemre */}
        <section aria-labelledby="jogosultsag-heading" className="mb-14">
          <h2 id="jogosultsag-heading" className="mb-5 text-2xl font-black text-slate-900">
            Mikor jogosult a lakó zajvédelemre?
          </h2>
          <p className="mb-5 text-slate-500 leading-relaxed">
            A zajvédelemre való jogosultság az épület minőségi osztályától és az érvényes szabványoktól függ. A régi panelépületek jól dokumentált gyengesége a hangszigetelés terén az alábbi okokra vezethető vissza:
          </p>
          <div className="mb-6 space-y-4">
            {[
              {
                title: 'Vékony vasbeton válaszfalak',
                body: 'A tipikus magyar panelépület (Larsen-rendszer, WBS, BL-típus) belső válaszfalai 10–12 cm vastagságú betonpanelek, amelyek léghangszigetelési értéke (Rw) alig éri el a 45–48 dB-t. Ez az MSZ EN ISO 12354-1 szabvány által ajánlott 52 dB-es érték alatt van, ezért a szomszéd hangjai szinte zavartalan terjedelemmel hallhatók.',
              },
              {
                title: 'Vasbeton magas hangsebessége',
                body: 'A vasbeton és az acél szerkezeti elemek hangvezetési sebessége (>3000 m/s) lényegesen magasabb, mint a levegőé (340 m/s). Ez azt jelenti, hogy az épület szerkezetén terjedő ütés- és rezgéshang szinte az egész épületen átjuthat — ezért érezni a liftet, a vízvezetéket vagy a szomszéd mosógépét más emeleten is.',
              },
              {
                title: 'MSZ EN ISO 12354 szabvány',
                body: 'A 2002-ben bevezetett és azóta felülvizsgált MSZ EN ISO 12354-1 és 12354-2 szabvány meghatározza az épületakusztikai tervezés számítási módszereit. Új épületeknél az e szabvány szerinti eljárást kötelező alkalmazni az engedélyezési tervekben — de a meglévő, régi épületek nem esnek visszamenőleges felújítási kötelezettség alá, hacsak nem minősített energetikai fejlesztés keretein belül végzik.',
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                  <AlertTriangle size={17} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="mb-1.5 font-black text-slate-900">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-brand-100 bg-brand-50/60 px-6 py-5">
            <p className="text-sm text-brand-800 leading-relaxed">
              <strong>Fontos tudnivaló:</strong> Ha az épület nem felel meg az épülettervek készítésekor hatályos akusztikai előírásoknak, az kivitelezési hiba — amelyért a tervező és a kivitelező felelős. Ez kártérítési igény alapja lehet, ha az elévülési idő (általában 5 év szerkezeti hibáknál, 10 év rejtett hibáknál) még nem telt le.
            </p>
          </div>
        </section>

        {/* Egyéni megoldások */}
        <section aria-labelledby="egyeni-megoldasok-heading" className="mb-14">
          <h2 id="egyeni-megoldasok-heading" className="mb-5 text-2xl font-black text-slate-900">
            Hatékony egyéni megoldások (saját lakáson belül)
          </h2>
          <p className="mb-7 text-slate-500 leading-relaxed">
            Az egyéni beavatkozások az épület szerkezetét nem érintik, ezért ezek nem igényelnek közgyűlési döntést — a lakó saját hatáskörben elvégezheti őket. Az alábbiakban a leghatékonyabb megoldásokat gyűjtöttük össze a várható javulás mértékével és a hozzávetőleges kivitelezési kategóriával.
          </p>
          <div className="space-y-4">
            {INDIVIDUAL_SOLUTIONS.map((item, i) => (
              <div key={i} className={`rounded-2xl border px-6 py-5 ${item.color}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-black text-slate-900">{item.solution}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${item.badge}`}>
                      {item.improvement}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                      Költség: {item.cost}
                    </span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Ablakcsere */}
        <section aria-labelledby="ablakcsere-heading" className="mb-14">
          <h2 id="ablakcsere-heading" className="mb-5 text-2xl font-black text-slate-900">
            Ablakcsere — melyik az igazi megoldás zajra?
          </h2>
          <p className="mb-6 text-slate-500 leading-relaxed">
            Az ablakcsere a leggyakrabban felmerülő egyéni zajvédelmi beavatkozás, de nem minden ablak egyforma. A hőszigetelésnél alkalmazott paraméterektől eltérő jellemzők döntik el a zajcsillapítási hatékonyságot. Az Rw értéken kívül a keret anyaga, a rugalmas tömítés és a beépítési mód is számít.
          </p>
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 text-left font-black text-slate-700">Ablaktípus</th>
                  <th className="px-5 py-3 text-left font-black text-slate-700">Rw érték</th>
                  <th className="px-5 py-3 text-left font-black text-slate-700">Alkalmasság</th>
                </tr>
              </thead>
              <tbody>
                {WINDOW_COMPARISON.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    <td className="px-5 py-3 font-medium text-slate-800">
                      {row.type}
                      <span className="mt-0.5 block text-xs font-normal text-slate-400">{row.note}</span>
                    </td>
                    <td className={`px-5 py-3 font-bold ${row.color}`}>{row.rw}</td>
                    <td className="px-5 py-3 text-slate-500">{row.suitability}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="mb-1 text-sm font-bold text-amber-800">Rezgésgátló keret — a legfontosabb részlet</p>
                <p className="text-sm text-amber-700 leading-relaxed">
                  Az ablakcsere leggyakoribb hibája, hogy a jó üvegezést rossz beépítéssel párosítják. Ha az ablakkeret a falba mereven be van kötve (pl. habbal rögzítve, rugalmas tömítés nélkül), a falszerkezeten terjedő ütéshang az ablakon át be fog szüremleni. A szereléskor elengedhetetlen a rugalmas akasztó-konzol, a dübel helyett rugalmas tömítős rögzítés és minden oldalt minimum 12 mm vastag akusztikai tömítőszalag.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Épületi szintű megoldások */}
        <section aria-labelledby="epuleti-megoldasok-heading" className="mb-14">
          <h2 id="epuleti-megoldasok-heading" className="mb-5 text-2xl font-black text-slate-900">
            Épületi szintű megoldások — közös képviselői döntések
          </h2>
          <p className="mb-7 text-slate-500 leading-relaxed">
            Az épületi szintű zajvédelmi beavatkozásokhoz közgyűlési határozat és a közös képviselő koordinációja szükséges. Ezek a beruházások azonban az egész lakóközösség zajterhelését csökkentik, és a lakások értékére is pozitív hatással vannak.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {BUILDING_SOLUTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <h3 className="mb-2 font-black text-slate-900">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Közgyűlési határozat */}
        <section aria-labelledby="kozgyules-heading" className="mb-14 rounded-2xl border border-slate-100 bg-slate-50 px-7 py-8">
          <h2 id="kozgyules-heading" className="mb-4 text-2xl font-black text-slate-900">
            Közgyűlési határozat zajvédelemre
          </h2>
          <p className="mb-6 text-slate-500 leading-relaxed">
            A közös tulajdonban lévő részek zajvédelmi felújításához a 2003. évi CXXXIII. törvény (Társasházi törvény) 24. § alapján közgyűlési határozat szükséges. Az egyszerű szótöbbség (50%+1 szavazat) elegendő kisebb karbantartási és felújítási munkákhoz; liftcsere vagy ablakcsere közös területen minősített (2/3-os) többséget igényelhet.
          </p>
          <div className="space-y-5 mb-6">
            {[
              {
                step: '1',
                title: 'Műszaki felmérés és szakértői vélemény',
                body: 'Az előterjesztés előtt érdemes épületakusztikai szakértővel felmértetni a jelenlegi állapotot. A szakvélemény meghatározza a kritikus pontokat, a várható javulást és a beruházás megtérülési idejét. Ez erősíti az előterjesztés meggyőzőerejét a közgyűlésen.',
              },
              {
                step: '2',
                title: 'Ajánlatok, kötelező versenytárgyalás',
                body: 'A 2003. évi CXXXIII. törvény 36/A. § szerint meghatározott összeg felett kötelező legalább három árajánlatot bekérni. A versenytárgyalási szabályok betartása védi a közösséget és a közös képviselőt a felelősség alól.',
              },
              {
                step: '3',
                title: 'Finanszírozás: felújítási alap vagy pályázat',
                body: 'A beruházás finanszírozható a felújítási alapból, közös költség-emelésből vagy pályázati forrásból (ld. lent). Ha szükséges, az épület hitelért is fordulhat Magyar Állam által garantált programokhoz.',
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-black text-white">
                  {item.step}
                </span>
                <div>
                  <h3 className="mb-1 font-black text-slate-900">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-brand-200 bg-brand-50 px-5 py-4">
            <p className="text-sm text-brand-800 leading-relaxed">
              <strong>Megtérülési idő:</strong> Az épületi szintű zajvédelmi fejlesztések (ablakcsere, lift-szigetelés) jellemzően 15–25 éves megtérüléssel bírnak, ha csak energetikai megtakarítást nézünk. Ha az ingatlanérték-növekedést is figyelembe vesszük (5–12%-os értéknövelő hatás csendes, jól szigetelt épületnél), a megtérülés lényegesen kedvezőbb képet mutat.
            </p>
          </div>
        </section>

        {/* Pályázatok */}
        <section aria-labelledby="palyazatok-heading" className="mb-14">
          <h2 id="palyazatok-heading" className="mb-5 text-2xl font-black text-slate-900">
            Állami és uniós pályázatok zajvédelemre
          </h2>
          <p className="mb-6 text-slate-500 leading-relaxed">
            Magyarországon több pályázati program támogatja a társasházi épületfelújítást — köztük olyanok is, amelyek akusztikai fejlesztésekre is felhasználhatók, különösen ha ablakcsere vagy homlokzati szigetelés formájában jelennek meg.
          </p>
          <div className="space-y-4">
            {[
              {
                icon: Building2,
                title: 'Panelprogram / Panel Plusz',
                body: 'A Magyarország Kormánya által meghirdetett panelfelújítási program keretében a panelépületek komplex energetikai felújítása — köztük ablakcsere és homlokzati hőszigetelés — célzott támogatással valósítható meg. Az aktuális feltételekről és meghirdetett körökről a Nemzeti Fejlesztési Minisztérium és az önkormányzati pályázati irodák adnak felvilágosítást.',
              },
              {
                icon: BarChart2,
                title: 'GINOP / KEHOP pályázatok',
                body: 'Az EU strukturális alapjaiból finanszírozott GINOP és KEHOP pályázatok rendszeres körökben hirdetnek meg társasházi energetikai és minőségjavítási programokat. A pályázatokban az akusztikai fejlesztések az energetikai komplexitásba illesztve elszámolhatók — elsősorban ablakcsere és homlokzati szigetelés formájában.',
              },
              {
                icon: Users,
                title: 'Kerületi önkormányzati programok',
                body: 'Több budapesti kerület (pl. II., VI., VII., XI. kerület) saját felújítási támogatási programot is működtet, amelyek keretében akusztikai fejlesztések is részesülhetnek vissza nem térítendő támogatásban. Az aktuális programokról a kerületi önkormányzat pályázati irodájánál érdeklődjön.',
              },
              {
                icon: Home,
                title: 'OMSZ zajvédelmi program',
                body: 'Az Országos Meteorológiai Szolgálat (OMSZ) és a Nemzeti Közlekedési Hatóság keretein belül meghirdetett zajvédelmi intézkedési programok célja a stratégiai zajtérképben azonosított zajterhelési hot-spoton élő lakók aktív zajvédelme — köztük ablakcserék és homlokzati árnyékolók. Ezek meghirdetéséről az adott kerületi önkormányzat tájékoztat.',
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={17} className="text-brand-600" />
                  </div>
                  <div>
                    <h3 className="mb-1.5 font-black text-slate-900">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-500">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Tipp a közös képviselőknek:</strong> A pályázatokhoz szükséges műszaki dokumentáció (energetikai tanúsítvány, épületakusztikai felmérés) megrendelését érdemes összevonni, mivel mindkettőhöz ugyanazok az adatpontok szükségesek — ezzel a szakértői díj egy részét megtakarítható.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-md">
          <h2 className="mb-2 text-2xl font-black text-white">
            Szervezze meg a zajvédelmi beruházást digitálisan
          </h2>
          <p className="mb-6 text-brand-100 max-w-lg mx-auto leading-relaxed">
            A PanelLakó platformon a közös képviselő nyomon követheti a felújítási döntések előkészítését, a közgyűlési határozatokat és a kivitelező kiválasztásának menetét. A lakók digitálisan szavazhatnak és hozzáférhetnek a fejlesztési dokumentumokhoz.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/funkciok"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-transform hover:scale-[1.03]"
            >
              Funkciók megismerése
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-black text-white shadow-sm transition-transform hover:scale-[1.03]"
            >
              Ingyenes regisztráció
            </Link>
          </div>
        </div>

        {/* Kapcsolódó cikkek */}
        <div className="mt-12">
          <p className="mb-4 text-sm font-bold text-slate-700">Kapcsolódó cikkek</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/zajszennyezes-budapest/tarsashazi-zaj-panasz"
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              <Volume2 size={16} className="text-brand-600" />
              Zajpanasz társasházban — jogi lépések
              <ArrowRight size={14} className="ml-auto text-slate-400" />
            </Link>
            <Link
              href="/zajszennyezes-budapest"
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              <BarChart2 size={16} className="text-brand-600" />
              Budapest zajszennyezési térkép
              <ArrowRight size={14} className="ml-auto text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-8 flex items-center gap-2 text-sm text-slate-400">
          <Link
            href="/zajszennyezes-budapest"
            className="flex items-center gap-1 hover:text-brand-600 transition-colors"
          >
            ← Vissza: Zajszennyezés Budapest főoldal
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
