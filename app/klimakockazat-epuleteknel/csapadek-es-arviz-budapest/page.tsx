import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CloudRain,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Shield,
  Droplets,
  Building2,
  TrendingUp,
  Zap,
  FileText,
  Users,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Villámárvíz Budapest — Pince és Épületkár | PanelLakó',
  description:
    'Budapest villámárvíz kockázata: melyik kerületek pincehelyiségei a legveszélyesebbek? Csapadékszélsőségek hatása épületekre, megelőzés és biztosítás.',
  alternates: {
    canonical: 'https://panellako.hu/klimakockazat-epuleteknel/csapadek-es-arviz-budapest',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Villámárvíz és csapadékszélsőségek — épületkárok Budapesten',
  description:
    'Budapest villámárvíz kockázata: melyik kerületek pincehelyiségei a legveszélyesebbek? Csapadékszélsőségek hatása épületekre, megelőzés és biztosítás.',
  inLanguage: 'hu',
  url: 'https://panellako.hu/klimakockazat-epuleteknel/csapadek-es-arviz-budapest',
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
      name: 'Csapadék és Árvíz Budapest',
      item: 'https://panellako.hu/klimakockazat-epuleteknel/csapadek-es-arviz-budapest',
    },
  ],
};

const HIGH_RISK_DISTRICTS = [
  {
    kerület: 'XIII. ker. — Angyalföld',
    oka: 'Alacsony fekvésű síkság, régi csatornahálózat, az egykori ipari területek vízelvezető kapacitása csökkent.',
    kockázat: 'Magas',
    badgeColor: 'bg-red-100 text-red-800',
  },
  {
    kerület: 'IV. ker. — Újpest',
    oka: 'Duna közelsége és az alacsonyabb fekvésű utcák; egyes részeken a csatorna visszafolyás állandó probléma.',
    kockázat: 'Magas',
    badgeColor: 'bg-red-100 text-red-800',
  },
  {
    kerület: 'XIV. ker. — Zugló',
    oka: 'A kerület nyugati részén mélyfekvésű terület, a Rákos-patak áradásakor a pincék is érintettek lehetnek.',
    kockázat: 'Közepes–Magas',
    badgeColor: 'bg-orange-100 text-orange-800',
  },
  {
    kerület: 'X. ker. — Kőbánya',
    oka: 'Egykori ipari területek, elégtelen csapadékvíz-kezelés, mélyfekvésű részek a vasút mentén.',
    kockázat: 'Közepes',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
  {
    kerület: 'XX. ker. — Pesterzsébet',
    oka: 'Alacsony tengerszint feletti magasság, sűrű beépítés, az MABISZ 2020–2023-as adatai szerint kiugró kárgyakoriság.',
    kockázat: 'Közepes',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
];

const PREVENTION_LONG_TERM = [
  {
    icon: Droplets,
    title: 'Csapadékvíz-tározók és vízgyűjtés',
    body:
      'A tetőről összegyűjthető esővíz öntözésre és WC-öblítésre hasznosítható. Egy 600 m²-es társasházi tető évi 200–300 m³ vizet gyűjthet, ami a közös zöldfelületek locsolási igényét fedezheti. A tározók egyben pufferként is működnek: egy akár 5–10 m³-es tartály elegendő ahhoz, hogy egy rövid, intenzív zápor vízmennyiségét visszatartsa és ne terhelje a csatornát.',
  },
  {
    icon: Building2,
    title: 'Zöldtető telepítése (30% visszatartás)',
    body:
      'Az extenzív zöldtető 20–40%-kal csökkenti a csapadékvíz tető-lefolyási sebességét, és 30–50%-os mennyiséget tart vissza párologtatással. Ez közvetlenül csökkenti a csatornarendszer terhelését csúcsesők esetén. A Fővárosi Csatornázási Művek (FCSM) becslése szerint ha Budapest lapostető-állományának 20%-a zöldtető lenne, a csúcsidei csatornaterhelés 8–12%-kal csökkenne.',
  },
  {
    icon: TrendingUp,
    title: 'Víz­áteresztő burkolatok (permeable pavement)',
    body:
      'A hagyományos aszfalt és beton közel nulla beszivárgást enged. A vízáteresztő (permeábilis) burkolatok — kavicsos aljzat, hézagos kő, vízáteresztő beton — az esővizet helyben szűrik a talajba, csökkentve a felszíni lefolyást. A társasházi parkolókban és belső udvarokban is alkalmazható megoldás, amely emellett a hőszigetes hatást is mérsékli.',
  },
  {
    icon: Shield,
    title: 'Tereprendezés — lejtős vízelvezetés',
    body:
      'A telek kialakítása döntően befolyásolja, hogy a csapadék az épület felé vagy az épülettől elfele folyt el. Már 2%-os lejt az épülettől elfele elegendő ahhoz, hogy a talajvíz ne gyűljön a pince körül. Régebbi épületeknél ez utólagos tereprendezéssel is elvégezhető, kombinálva az alapzat körüli drén csővel.',
  },
];

export default function CsapadekEsArvizBudapestPage() {
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
          <span className="font-medium text-slate-600">Csapadék és Árvíz Budapest</span>
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
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
            <CloudRain size={24} className="text-blue-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Villámárvíz és csapadékszélsőségek — épületkárok Budapesten
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            Budapest csatornarendszere az 1950-es évek méretezési normái szerint épült. A klímaváltozás
            következtében azonban az extrém csapadékeseményekből napjainkban jóval több csapódik le
            rövidebb idő alatt — és ezt a régi infrastruktúra nem tudja elnyelni. A pincetér-beázás,
            a nedves falak és a penész mind ennek a folyamatnak a tünetei. Mitől függ a kockázat és
            mit tehet a közös képviselő?
          </p>
        </div>

        {/* Csapadékszélsőségek trendje */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">A csapadékszélsőségek trendje Magyarországon</h2>
          <div className="space-y-4 leading-relaxed text-slate-600">
            <p>
              Az OMSZ és az IPCC AR6 (2021) összesített adatai egyértelműen mutatják, hogy Magyarországon
              a csapadék éves összege nem feltétlenül nő, de az <strong className="text-slate-800">intenzitása
              erősen koncentrálódik</strong>: ugyanannyi — sőt, adott esetben kevesebb — eső érkezik, de
              jóval rövidebb idő alatt. Ez az ún. konvektív, villámszerű csapadék jelensége.
            </p>
            <p>
              A trendek konkrétumokban: az 1960–1990-es időszakhoz képest a 2000–2023 közötti évtizedekben
              a napi 50 mm feletti csapadékeseményekre vonatkozó statisztikák emelkedő tendenciát mutatnak
              Budapesten. 2010-ben, 2017-ben és 2020-ban egyaránt mértek <strong className="text-slate-800">
              100 mm feletti napi csapadékot</strong> egyes fővárosi mérőpontokon — ez rendkívülinek
              számít az 1901 óta folytatott mérési sorozatban.
            </p>
            <p>
              A városi csatornázási rendszerek tervezési alapja az ún. visszatérési idő: a Fővárosi
              Csatornázási Művek (FCSM) adatai szerint Budapest csatornái jellemzően
              <strong className="text-slate-800"> 5–10 éves visszatérési idejű csapadékra</strong> lettek
              méretezve az 1950-es és 1960-as évek normái szerint. Ugyanakkor a klimatológiai előrejelzések
              azt mutatják, hogy a mai „20–25 éves&quot; szélsőséges esemény 2050-re már 5–10 éves eseménnyé
              válhat — vagyis a csatornarendszer kapacitása strukturálisan nem lesz elegendő.
            </p>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-blue-700" />
                <p className="text-sm leading-relaxed text-blue-800">
                  <strong>Mit jelent ez a társasháznak?</strong> Akkor is érintett lehet az épülete,
                  ha korábban nem volt vízkár — a csapadékszélsőségek új eseményeket hoznak létre
                  ott, ahol az infrastruktúra eddig elegendő volt.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Villámárvíz mi ez */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">Villámárvíz — mi ez és mikor keletkezik?</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            A villámárvíz (flash flood) nem folyóból eredő, hanem helyi csapadékból keletkező gyors
            felszíni elöntés. Kialakulásának feltételei:
          </p>
          <div className="mb-6 space-y-4">
            {[
              {
                icon: CloudRain,
                iconBg: 'bg-blue-50',
                iconColor: 'text-blue-600',
                title: 'Magas csapadékintenzitás rövid idő alatt',
                body: '20–30 mm/30 perc feletti intenzitásnál a legtöbb városi csatornarendszer megtelik. Ekkor a víz a legalacsonyabb pontok felé gravitál — ez a pinceszint, az aluljárók, a mélyfekvésű udvarok.',
              },
              {
                icon: Building2,
                iconBg: 'bg-slate-50',
                iconColor: 'text-slate-600',
                title: 'Alacsony beszivárgási kapacitás (aszfalt)',
                body: 'Budapest belterületének több mint 60%-a aszfalttal vagy más vízhatlan burkolattal fedett. A csapadék szinte azonnal felszíni lefolyásba kerül (surface runoff), nem szivárhat a talajba. Ez sokszorozza a pillanatnyi vízmennyiséget a csatornahálózatban.',
              },
              {
                icon: Zap,
                iconBg: 'bg-amber-50',
                iconColor: 'text-amber-600',
                title: 'Telített csatornák visszafolyása',
                body: 'Ha a csatornarendszer túltelítődik, a szennyvíz visszafolyhat az alacsonyabban lévő pincék csatornanyílásain. Visszacsapó szelep nélkül ez közvetlenül épületen belüli szennyezettvíz-betöréssel járhat — ez az egyik legsúlyosabb és legköltségesebb káresemény.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}>
                    <Icon size={20} className={item.iconColor} />
                  </div>
                  <div>
                    <p className="mb-1 font-black text-slate-900">{item.title}</p>
                    <p className="text-sm leading-relaxed text-slate-500">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="leading-relaxed text-slate-500">
            Tipikus villámárvíz-helyszínek Budapesten: a pesti síkság mélyfekvésű utcái, a Soroksári
            út menti iparterületek, az aluljárók (pl. Keleti pályaudvar előtt), és a XIII–XIV. kerület
            mélyebb pontjai. Azonban bármely kerület érintett lehet egyedi topográfiai okok miatt.
          </p>
        </section>

        {/* Pinceszint kockázat */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">Pinceszint kockázat Budapesten</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            Az MABISZ 2023-as kárelemzése alapján a villámárvíz miatti pince-beázás a társasházi
            biztosítói káreseményeken belül az ötödik leggyakoribb kategória. Az átlagos kárösszeg
            450 000–800 000 Ft, de mélyebb pince vagy géptér esetén ez a 2–5 millió Ft-ot is
            elérheti. A jellemző károk: beázás, nedves fal, penész, fűtési és villamos berendezések
            tönkremenetele.
          </p>

          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Leginkább érintett kerületek villámárvíz-kockázat szempontjából
              </p>
            </div>
            {HIGH_RISK_DISTRICTS.map((row, i) => (
              <div
                key={row.kerület}
                className={`flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:gap-4 ${
                  i < HIGH_RISK_DISTRICTS.length - 1 ? 'border-b border-slate-100' : ''
                }`}
              >
                <div className="flex shrink-0 items-center gap-2 sm:w-48">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${row.badgeColor}`}>
                    {row.kockázat}
                  </span>
                </div>
                <div>
                  <p className="mb-0.5 text-sm font-black text-slate-900">{row.kerület}</p>
                  <p className="text-xs leading-relaxed text-slate-500">{row.oka}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Forrás: MABISZ 2020–2023 káradatok; FCSM csatornakapacitás-elemzések; Budapest Főváros
            klímaadaptációs stratégiája (2020). A kockázati besorolás tájékoztató jellegű, nem helyettesíti
            az egyedi épületvizsgálatot.
          </p>
        </section>

        {/* Fizikai védekezés */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">Épület fizikai védelme villámárvíz ellen</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            A villámárvíz-kár megelőzésének van egy azonnali/sürgősségi és egy tartós műszaki rétege.
            A kettőt kombinálva érdemes alkalmazni.
          </p>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-600" />
                <p className="font-black text-slate-900 text-sm">Sürgős intézkedések (esemény előtt/közben)</p>
              </div>
              <ul className="space-y-2">
                {[
                  'Pinceszellőzők, kisfogású nyílások ideiglenes lezárása homokzsákkal',
                  'Automatikus szivattyú üzemképességének ellenőrzése (negyedévente)',
                  'Elektromos főkapcsoló elérhetőségének biztosítása pinceszinten',
                  'Értékes tárgyak és iratok magasabb szintre szállítása hőségriadó esetén',
                  'OMSZ riasztás figyelése (zivatarriasztás ≥ 50 mm/6h esetén)',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-slate-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle size={18} className="text-emerald-600" />
                <p className="font-black text-slate-900 text-sm">Tartós műszaki megoldások</p>
              </div>
              <ul className="space-y-2">
                {[
                  'Visszacsapó szelep beépítése a szennyvízcsatornára (kötelező új építésnél, 1997. LXXVIII. tv.)',
                  'Automatikus búvárszivattyú mélyedéses pincék alatt',
                  'Duzzasztó rendszerek (flood gate) a bejárat elé',
                  'Vízálló injektálás az alapfalakon és pincepilléreken',
                  'Drén cső elhelyezése az épület alapozása körül',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-slate-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
            <div className="flex items-start gap-3">
              <Shield size={17} className="mt-0.5 shrink-0 text-amber-700" />
              <p className="text-sm leading-relaxed text-amber-800">
                <strong>Megtérülési becslés:</strong> Egy visszacsapó szelep beépítése kb. 60 000–120 000 Ft,
                míg az általa megelőzött átlagos kárösszeg 450 000–800 000 Ft. Az első villámárvíz-
                esemény megtérülővé teszi a beruházást.
              </p>
            </div>
          </div>
        </section>

        {/* Hosszú távú megelőzés */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">Hosszú távú megelőzési lehetőségek</h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            A csapadékvíz kezelése nem csak a védekezésről szól — a víz megkötése és hasznosítása
            egyszerre csökkenti a kockázatot és teremt értéket a társasház számára.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {PREVENTION_LONG_TERM.map((item) => {
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

        {/* Biztosítás */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">Biztosítás és kártérítés</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            A biztosítási lefedettség megértése villámárvíz esetén különösen fontos, mert a terminológia
            félrevezető lehet. Az alábbiakban a leggyakoribb kérdések és félreértések szerepelnek.
          </p>
          <div className="space-y-4">
            {[
              {
                icon: FileText,
                iconBg: 'bg-slate-50',
                iconColor: 'text-slate-600',
                q: 'Mire terjed ki a lakásbiztosítás?',
                a: 'A standard lakásbiztosítások fedik az árvizet (folyóból eredő elöntés) és a csapadékvíz betörését, de fontos különbség: a villámcsapás közvetlen hatásai (pl. villámcsapás okozta tűz) általában fedett, de a villámcsapás okozta közvetlen elöntés (flash flood kötőde) számos biztosítónál kizárással rendelkezik. Mindig olvassa el a Kárrendezési Szabályzat vonatkozó pontjait.',
              },
              {
                icon: Users,
                iconBg: 'bg-brand-50',
                iconColor: 'text-brand-600',
                q: 'Miért fontos a közös biztosítás?',
                a: 'Az egyéni lakásbiztosítás csak a saját lakás kárát fedezi. Ha a pince közös tulajdon (ami a legtöbb társasháznál így van), a pincei kár rendezésére csak a közös vagyonbiztosítás alkalmas. A közös biztosítás emellett a felelősségbiztosítást is tartalmazza — ha pl. a közös csatorna meghibásodása kárt okoz más lakónak.',
              },
              {
                icon: TrendingUp,
                iconBg: 'bg-amber-50',
                iconColor: 'text-amber-600',
                q: 'Hogyan befolyásolja az MABISZ-riport a díjakat?',
                a: 'Az MABISZ összesített káradatai alapján a biztosítók egyre pontosabban árazzák a villámárvíz-kockázatot irányítószám-szinten. A 2020–2023-as periódusban az érintett kerületekben (XIII., IV., XX.) a társasházi vagyonbiztosítási díjak emelkedtek, egyes esetekben a kizárások is bővültek. Ezért éves felülvizsgálat javasolt.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.q} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                  <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}>
                    <Icon size={18} className={item.iconColor} />
                  </div>
                  <div>
                    <p className="mb-1.5 font-black text-slate-900">{item.q}</p>
                    <p className="text-sm leading-relaxed text-slate-500">{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Közös képviselő teendői */}
        <section className="mb-16 rounded-2xl border border-slate-100 bg-slate-50 px-7 py-8">
          <h2 className="mb-4 text-2xl font-black text-slate-900">
            A közös képviselő teendői
          </h2>
          <p className="mb-6 text-slate-500 leading-relaxed">
            A villámárvíz-kockázat kezelése nem egyszeri esemény — hanem rendszeres karbantartási és
            adminisztrációs feladat. Az alábbi teendők az ajánlott éves ciklusban:
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Shield,
                title: 'Vészhelyzeti terv készítése',
                body: 'Dokumentálja a pinceszint elérési módját, az automatikus szivattyú és a főelzárók helyzetét. Rendkívüli eset esetén a lakóknak értesítési rendet kell tartani (csoportos SMS/app-értesítés).',
              },
              {
                icon: CheckCircle,
                title: 'Szivattyú karbantartás (negyedévente)',
                body: 'A búvárszivattyúkat és a visszacsapó szelepeket negyedévente ellenőriztetni kell. Nyáron, a csapadékszezon előtt különösen fontos a tesztüzem és a szűrők tisztítása.',
              },
              {
                icon: FileText,
                title: 'Biztosítás évente felülvizsgálata',
                body: 'Kérjen be legalább két ajánlatot évente. Ellenőrizze, hogy a közös biztosítás fedezi-e a villámárvíz-kárt, és hogy a biztosított összeg arányos-e az épület aktuális értékével.',
              },
              {
                icon: Users,
                title: 'Bejelentési rendszer (PanelLakó)',
                body: 'Digitális hibabejelentési rendszer alkalmazásával a lakók azonnal jelezhetik a beázást, a szivárgást és a nedves falakat. A dokumentált bejelentések bizonyítékként szolgálnak biztosítói eljárásban és hatósági ellenőrzésnél is.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-white bg-white px-5 py-5 shadow-sm">
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

        {/* Stat strip */}
        <div className="mb-14 grid gap-4 sm:grid-cols-3">
          {[
            { value: '100+ mm', label: 'Napi csapadékrekord Budapesten (2010, 2017, 2020) — a csatornák méretezési alapjának ~2–3-szorosa' },
            { value: '450–800 eFt', label: 'Átlagos biztosítói kárösszeg villámárvíz miatti pince-beázásnál (MABISZ 2023)' },
            { value: '60–120 eFt', label: 'Visszacsapó szelep beépítési költsége — az első káreset megelőzi a beruházást' },
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
            Dokumentálja a beázásokat és szivárgásokat digitálisan
          </h2>
          <p className="mb-6 mx-auto max-w-lg text-brand-100">
            A PanelLakó hibabejelentési rendszerével a lakók azonnal jelezhetik a villámárvíz-károkat,
            szivárgásokat és penészesedést. A közös képviselő valós időben látja és kezeli a
            bejelentéseket — és minden esemény biztosítói bizonyítékként is szolgál.
          </p>
          <Link
            href="/funkciok/hibabejelentes-kezeles"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-transform hover:scale-[1.03]"
          >
            Hibabejelentés-kezelés megismerése
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
