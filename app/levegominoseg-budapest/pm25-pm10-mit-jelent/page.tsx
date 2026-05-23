import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Wind,
  ChevronRight,
  AlertTriangle,
  Activity,
  BarChart2,
  Heart,
  Car,
  CheckCircle,
  ExternalLink,
  Thermometer,
  Shield,
  Eye,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'PM2.5 és PM10 — Mit jelent a lakóknak? Egészségügyi határértékek | PanelLakó',
  description:
    'Mi a PM2.5 és PM10 részecskeszennyezés? Hogyan befolyásolja az egészségünket? WHO és EU határértékek, Budapest mérési adatok magyarázata.',
  alternates: { canonical: 'https://panellako.hu/levegominoseg-budapest/pm25-pm10-mit-jelent' },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'PM2.5 és PM10 — mit jelent és miért fontos?',
  description:
    'Mi a PM2.5 és PM10 részecskeszennyezés? Hogyan befolyásolja az egészségünket? WHO és EU határértékek, Budapest mérési adatok magyarázata.',
  inLanguage: 'hu',
  url: 'https://panellako.hu/levegominoseg-budapest/pm25-pm10-mit-jelent',
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
      name: 'Levegőminőség Budapest',
      item: 'https://panellako.hu/levegominoseg-budapest',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'PM2.5 és PM10',
      item: 'https://panellako.hu/levegominoseg-budapest/pm25-pm10-mit-jelent',
    },
  ],
};

const SHORT_TERM_EFFECTS = [
  {
    icon: Activity,
    title: 'Köhögés és torokkaparás',
    text: 'Néhány órán belül megjelenő tünet magas PM2.5 napokon. Különösen erős erőfeszítésnél (futás, kerékpározás) érződik, mert a megnövekedett légzési frekvencia több részecskét juttat a tüdőbe.',
  },
  {
    icon: Eye,
    title: 'Szemirritáció',
    text: 'A finom részecskék a szemkötőhártyán is lerakódnak, könnyezést, égő érzést okozva. Kontaktlencse-viselőknél különösen kellemetlen lehet.',
  },
  {
    icon: AlertTriangle,
    title: 'Asztmaroham',
    text: 'Asztmás betegek tüneteinek súlyosbodása már 50 µg/m³ feletti napi PM2.5 értéknél statisztikailag kimutatható. Az OLM adatok szerint Budapest-en évente számos nap meghaladja ezt a küszöböt.',
  },
];

const LONG_TERM_EFFECTS = [
  {
    icon: Heart,
    title: 'Szív- és érrendszeri betegségek',
    text: 'A finomrészecskék a tüdőből a véráramba jutva gyulladásos folyamatokat indítanak el az erekben. Hosszú távú kitettség esetén megnő a szívroham, a stroke és a szívelégtelenség kockázata. A WHO becslése szerint minden 10 µg/m³-es PM2.5-emelkedés 6–8%-kal növeli a kardiovaszkuláris halandóságot.',
  },
  {
    icon: Activity,
    title: 'COPD és krónikus bronchitis',
    text: 'Évekig tartó PM2.5-kitettség a tüdő alveoláris szerkezetének visszafordíthatatlan megváltozásához vezet. A 65 év feletti, érintett területen élő budapesti lakosoknál a COPD prevalenciája magasabb, mint a vidéki vagy alacsonyabb szennyezettségű területeken élőknél.',
  },
  {
    icon: Shield,
    title: 'Gyermekek tüdőfejlődése',
    text: 'Gyermekkorban a tüdő folyamatosan fejlődik. Ahol magasabb a PM2.5, ott szignifikánsan kisebb a felnőttkori tüdőkapacitás. Az EU-ban végzett ESCAPE-tanulmány szerint minden 5 µg/m³-es PM2.5-különbség mérhető különbséget eredményez a 8–12 éves gyermekek tüdőfunkciójában.',
  },
  {
    icon: AlertTriangle,
    title: 'Születési súly és termékenység',
    text: 'Terhesség alatt magas PM2.5-kitettség alacsonyabb születési súllyal és koraszüléssel jár. Férfiaknál egyes vizsgálatok összefüggést találtak a spermiumminőség romlásával és az alacsony városi levegőminőség között.',
  },
];

const PERSONAL_ACTIONS = [
  {
    icon: Shield,
    title: 'HEPA légtisztítók otthon',
    text: 'A H13/H14 osztályú HEPA filterrel rendelkező légtisztítók a PM2.5 részecskék 99,97%-át kiszűrik. A CADR (Clean Air Delivery Rate) mutatószám alapján válasszunk — egy 20 m²-es szobához legalább 200 m³/h CADR ajánlott.',
  },
  {
    icon: Activity,
    title: 'Szellőztetés időzítése',
    text: 'Budapesten reggel 6–9 és este 18–22 óra között általában alacsonyabb a PM2.5-szint, mint csúcsidőben. Az OLM valós idejű adatai alapján döntsük el, mikor érdemes ablakot nyitni.',
  },
  {
    icon: Thermometer,
    title: 'Páratartalom fenntartása',
    text: '40–60% relatív páratartalom esetén a légúti nyálkahártya hatékonyabban szűri a részecskéket. Alacsonyabb páratartalomnál a nyálkahártya kiszárad és kevésbé véd.',
  },
  {
    icon: Car,
    title: 'Személyes mérőeszközök',
    text: 'Kisméretű, hordozható PM-szenzorokat (pl. IQAir AirVisual Pro, Laser Egg) lakásban, munkahelyen, vagy kerékpározás közben is használhatunk. Ezek pontossága kisebb az OLM-állomásokénál, de trendek követésére alkalmasak.',
  },
];

export default function Pm25Pm10MitJelentPage() {
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
          <Link href="/" className="hover:text-slate-600">
            Főoldal
          </Link>
          <ChevronRight size={14} />
          <Link href="/levegominoseg-budapest" className="hover:text-slate-600">
            Levegőminőség Budapest
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-600">PM2.5 és PM10</span>
        </nav>

        {/* Hero */}
        <div className="mb-14">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <BarChart2 size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            PM2.5 és PM10 — mit jelent és miért fontos?
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            A PM2.5 és PM10 rövidítések mögött a levegőben lebegő apró részecskék állnak, amelyek
            méretüknél fogva mélyebben hatolnak be a légutakba, mint bármelyik más szennyező. Megértésük
            az első lépés a tájékozott lakóhely-választáshoz és az egészségtudatos életmódhoz.
          </p>
        </div>

        {/* Mi a szálló por */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">Mi a szálló por (particulate matter)?</h2>
          <div className="space-y-4 leading-relaxed text-slate-600">
            <p>
              A szálló por — angolul <em>particulate matter</em> (PM) — a levegőben lebegő szilárd és
              folyékony mikrorészecskék összefoglaló neve. Méretüket mikrométerben (µm) adjuk meg: egy
              hajszál átmérője kb. 70 µm, míg a PM2.5 részecskék legfeljebb 2,5 µm átmérőjűek — vagyis
              harmincszor vékonyabbak egy hajszálnál.
            </p>
            <p>
              A <strong>PM10</strong> jelölés az összes 10 µm-nél kisebb részecskét takarja. Ezek általában
              az orr szőrszálaiban és a torok nyálkahártyáján fennakadnak, de irritációt és allergén hatást
              okoznak. Ide tartoznak a pollenszzemek töredékei, az építési por, a tengerparti só és a
              gumiabroncs-kopásból keletkező részecskék.
            </p>
            <p>
              A <strong>PM2.5</strong> a veszélyesebb frakció. Ezek a részecskék átjutnak a hörgőkön és
              mélyen bejutnak a tüdő alveolusaiba — a légtömlőkbe, ahol a gázcsere zajlik. Egyes részecskék
              az alveoláris nyálkahártyán átjutva közvetlenül a véráramba kerülnek, és szisztémás
              gyulladásos reakciót indítanak el.
            </p>
            <p>
              A részecskék forrása és kémiai összetétele is fontos: a dieselfüst koromrészecskéi (black
              carbon) és a polyciklikus aromás szénhidrogének (PAH) rákkeltő anyagok. Az ammónium-nitrát
              (műtrágya égéstermékei) és a szulfátok szintén PM-alkotóelemek, és szintén gyulladáskeltők.
            </p>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="mb-2 font-bold text-slate-900">Méretarány szemléltetése</p>
              <ul className="space-y-1 text-sm text-slate-600">
                <li><span className="font-semibold">Hajszál vastagsága:</span> ~70 µm</li>
                <li><span className="font-semibold">PM10 legfelső határ:</span> 10 µm (~7× vékonyabb)</li>
                <li><span className="font-semibold">PM2.5 legfelső határ:</span> 2,5 µm (~28× vékonyabb)</li>
                <li><span className="font-semibold">Vírus (pl. influenza):</span> 0,1–0,3 µm</li>
              </ul>
            </div>
          </div>
        </section>

        {/* WHO és EU határértékek */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">WHO és EU határértékek összehasonlítása</h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            A WHO 2021-ben felülvizsgálta és drasztikusan szigorította a levegőminőségi iránymutatásait a
            legfrissebb epidemiológiai kutatások alapján. Az EU direktíva (2024/2881 rendelet) is közeledik
            ezekhez, de az átmeneti határértékek még mindig lazábbak — különösen PM2.5 esetén.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Szennyező</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Időtáv</th>
                  <th className="px-4 py-3 text-left font-semibold text-brand-700">WHO 2021</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">EU 2024</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">EU 2030 cél</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-900">PM2.5</td>
                  <td className="px-4 py-3 text-slate-600">Éves átlag</td>
                  <td className="px-4 py-3 font-semibold text-brand-700">5 µg/m³</td>
                  <td className="px-4 py-3 text-slate-600">10 µg/m³</td>
                  <td className="px-4 py-3 text-slate-600">5 µg/m³</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-900">PM2.5</td>
                  <td className="px-4 py-3 text-slate-600">Napi átlag</td>
                  <td className="px-4 py-3 font-semibold text-brand-700">15 µg/m³</td>
                  <td className="px-4 py-3 text-slate-600">25 µg/m³</td>
                  <td className="px-4 py-3 text-slate-600">—</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">PM10</td>
                  <td className="px-4 py-3 text-slate-600">Éves átlag</td>
                  <td className="px-4 py-3 font-semibold text-brand-700">15 µg/m³</td>
                  <td className="px-4 py-3 text-slate-600">20 µg/m³</td>
                  <td className="px-4 py-3 text-slate-600">20 µg/m³</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">PM10</td>
                  <td className="px-4 py-3 text-slate-600">Napi átlag</td>
                  <td className="px-4 py-3 font-semibold text-brand-700">45 µg/m³</td>
                  <td className="px-4 py-3 text-slate-600">50 µg/m³</td>
                  <td className="px-4 py-3 text-slate-600">—</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Forrás: WHO Global Air Quality Guidelines 2021; Az Európai Parlament és a Tanács 2024/2881/EU rendelete.
            A napi határértékek esetén az EU engedélyezi az évi 3–35 napos túllépést az egyes mutatóktól függően.
          </p>
          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-sm leading-relaxed text-amber-800">
                <strong>Budapest valós helyzete:</strong> Az OLM és az EEA adatai alapján Budapest belső
                kerületeiben az éves PM2.5 átlag 12–18 µg/m³ között mozog — ez az EU 2024-es határértéket
                teljesíti, de a WHO 5 µg/m³-es iránymutatásának 2–3-szorosa. Télen egyes napokban napi
                csúcsok a 60–80 µg/m³-t is meghaladhatják.
              </p>
            </div>
          </div>
        </section>

        {/* PM2.5 forrásai Budapesten */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">
            Milyen forrásokból keletkezik PM2.5 Budapesten?
          </h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            A PM2.5 forrásprofilja Budapesten évszaktól és napszaktól erősen függ. A három fő forrás
            eltérő térbeli és időbeli eloszlást mutat:
          </p>
          <div className="space-y-5">
            <div className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                <Car size={20} className="text-brand-600" />
              </div>
              <div>
                <p className="mb-1 font-bold text-slate-900">Közlekedés — főleg dízel</p>
                <p className="text-sm leading-relaxed text-slate-500">
                  A dízel személyautók és tehergépjárművek feketekorom-kibocsátása (black carbon) az
                  év egészén át állandó PM2.5-forrás. A belváros forgalmas csomópontjain (Petőfi híd,
                  Nagykörút, Árpád híd bevezető) a reggeli csúcsidőben mért PM2.5 olykor kétszerese
                  az éjszakai értékeknek. Egyre nagyobb hányadot tesz ki a fékek és gumiabroncsok
                  kopásából keletkező ún. nem kipufogó (non-exhaust) emisszió, amelyet az elektromos
                  autók sem szüntetnek meg teljesen.
                </p>
              </div>
            </div>
            <div className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                <Thermometer size={20} className="text-brand-600" />
              </div>
              <div>
                <p className="mb-1 font-bold text-slate-900">Fűtési szezon (október–március)</p>
                <p className="text-sm leading-relaxed text-slate-500">
                  Az elavult szilárd tüzelőanyagú kazánok és kandalló tüzelők a PM2.5-szennyezés
                  legszeszélyesebb, de egyes napokon legjelentősebb forrásai. Szélcsendes, inverziós
                  időjárásban a tüzelésből keletkező részecskék nem oszlanak el, és reggel 4–8 óra
                  között — amikor sokan befűtenek — kiugró csúcsokat okoznak. Az agglomerációban
                  (Budaörs, Érd, Törökbálint) épített, kevésbé szigorúan ellenőrzött kazánok is
                  szennyezik Budapest belvárosát széllel.
                </p>
              </div>
            </div>
            <div className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                <Wind size={20} className="text-brand-600" />
              </div>
              <div>
                <p className="mb-1 font-bold text-slate-900">Építkezések és útfelszín</p>
                <p className="text-sm leading-relaxed text-slate-500">
                  Budapest éppen zajló fejlesztései (M3-as metrórekonstrukció befejezése, irodanegyed
                  építések a Váci úton, Rákos vasúti fejlesztés) jelentős PM10-forrásként is hatnak, de
                  az építési por finom frakciója PM2.5-ként is mérhető. Száraz nyári időszakban a
                  közutak felszínéről felvert por szintén hozzájárul az összes szálló por szintjéhez.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Egészségügyi hatások */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">
            Egészségügyi hatások rövid és hosszú távon
          </h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            A PM-szennyezés hatásai két időtávon vizsgálhatók. A rövid távú hatások órákon vagy napokon
            belül jelentkeznek magas szennyezési napokon. A hosszú távú hatások évek vagy évtizedek alatt
            halmozódnak fel.
          </p>
          <div className="mb-8">
            <p className="mb-4 font-bold text-slate-800">Rövid távú hatások</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {SHORT_TERM_EFFECTS.map((e) => {
                const Icon = e.icon;
                return (
                  <div key={e.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
                      <Icon size={18} className="text-brand-600" />
                    </div>
                    <p className="mb-1.5 font-bold text-slate-900">{e.title}</p>
                    <p className="text-sm leading-relaxed text-slate-500">{e.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-4 font-bold text-slate-800">Hosszú távú hatások</p>
            <div className="space-y-4">
              {LONG_TERM_EFFECTS.map((e) => {
                const Icon = e.icon;
                return (
                  <div key={e.title} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                      <Icon size={20} className="text-brand-600" />
                    </div>
                    <div>
                      <p className="mb-1 font-bold text-slate-900">{e.title}</p>
                      <p className="text-sm leading-relaxed text-slate-500">{e.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Mit tehetsz */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">
            Mit tehetsz Budapest lakójaként?
          </h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            Nem tudjuk egyénileg megváltoztatni a közlekedési rendszert vagy a szomszéd fűtési szokásait.
            De van néhány hatékony lépés, amivel csökkenthetjük a saját és a családunk PM-kitettségét.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {PERSONAL_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <div key={action.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <p className="mb-1.5 font-bold text-slate-900">{action.title}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{action.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Budapest PM adatok */}
        <section className="mb-16 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-8">
          <h2 className="mb-4 text-xl font-black text-slate-900">
            Budapest PM adatok — hol érhetők el?
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-slate-500">
            Az alábbi forrásokból ingyenesen elérhetők Budapest PM2.5 és PM10 adatai — valós időben és
            archívált formában egyaránt.
          </p>
          <div className="space-y-4">
            {[
              {
                name: 'OLM — levegominoseg.hu',
                desc: 'Magyarország hivatalos levegőminőségi portálja. Kerületenkénti és mérőállomásonkénti adatok, valós idejű és archívált. Ingyenes, regisztráció nélkül.',
                url: 'https://levegominoseg.hu',
              },
              {
                name: 'OpenAQ API',
                desc: 'Az OLM és számos más hálózat adatait aggregáló nyílt API. Fejlesztőknek és kutatóknak ideális — JSON formátumban, korlátlan visszatekintéssel.',
                url: 'https://openaq.org',
              },
              {
                name: 'Copernicus CAMS Air Quality',
                desc: 'Európai szintű levegőminőségi modell-adatok és előrejelzések. Magasabb térbeli felbontású, 5-napos előrejelzéssel — alkalmas hosszú távú trendek elemzésére.',
                url: 'https://atmosphere.copernicus.eu',
              },
              {
                name: 'EEA AirBase / E-PRTR',
                desc: 'Az Európai Környezetvédelmi Ügynökség összesített adatbázisa, amely összehasonlíthatóvá teszi a budapesti adatokat más európai fővárosokkal.',
                url: 'https://www.eea.europa.eu/en/topics/in-depth/air-pollution',
              },
            ].map((ds) => (
              <div key={ds.name} className="border-l-2 border-brand-300 pl-4">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900">{ds.name}</p>
                  <a
                    href={ds.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:text-brand-700"
                    aria-label={`${ds.name} megnyitása`}
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{ds.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-lg">
          <h2 className="mb-2 text-2xl font-black text-white">
            Levegőminőség az Ön lakásánál
          </h2>
          <p className="mb-6 text-brand-100">
            A PanelLakó alkalmazásban épületi szintű levegőminőségi adatokat, PM2.5 és pollenkoncentrációt
            talál a budapesti társasháztulajdonosoknak. Nézze meg a saját lakása környékét.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-50"
          >
            <CheckCircle size={16} />
            Ingyenes regisztráció
          </Link>
        </div>

        {/* Back link */}
        <div className="mt-10 flex items-center gap-2 text-sm text-slate-400">
          <Link
            href="/levegominoseg-budapest"
            className="flex items-center gap-1 hover:text-brand-600"
          >
            ← Vissza: Levegőminőség Budapest főoldal
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
