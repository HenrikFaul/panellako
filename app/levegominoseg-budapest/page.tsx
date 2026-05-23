import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Wind,
  ChevronRight,
  AlertTriangle,
  Activity,
  MapPin,
  BarChart2,
  Leaf,
  ArrowRight,
  Database,
  Heart,
  Factory,
  Car,
  Thermometer,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Levegőminőség Budapest — Kerületi adatok, PM2.5, PM10 | PanelLakó',
  description:
    'Budapest levegőminőségi adatai kerületenként: PM2.5, PM10 szennyezők, pollenkoncentráció, EU határértékek, egészségügyi hatások — nyílt adatokból.',
  alternates: { canonical: 'https://panellako.hu/levegominoseg-budapest' },
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
  ],
};

const CLUSTER_ARTICLES = [
  {
    href: '/levegominoseg-budapest/pm25-pm10-mit-jelent',
    icon: BarChart2,
    title: 'PM2.5 és PM10 — mit jelent és miért fontos?',
    summary:
      'A szálló por részletes magyarázata: WHO és EU határértékek összehasonlítása, egészségügyi hatások, Budapest mérési adatok.',
  },
  {
    href: '/levegominoseg-budapest/budapest-legszennyezettebb-keruletek',
    icon: MapPin,
    title: 'Budapest legszennyezettebb és legtisztább kerületei',
    summary:
      'Kerületenkénti levegőminőség-összehasonlítás PM2.5 és NO₂ adatok alapján — melyik kerületben érdemes lakni?',
  },
  {
    href: '/levegominoseg-budapest/belteri-levegominoseg-tarsashazban',
    icon: Activity,
    title: 'Beltéri levegőminőség társasházi lakásokban',
    summary:
      'VOC szennyezők, szellőztetési stratégiák panellakásban, HEPA légtisztítók és épületi megoldások.',
  },
];

const POLLUTANTS = [
  {
    code: 'PM2.5',
    name: 'Finom szálló por',
    desc: 'A 2,5 mikrométernél kisebb részecskék mélyen behatolnak a tüdőbe. Forrásai: közlekedés, fűtés, ipari égés.',
    icon: Wind,
    color: 'text-red-500',
    bg: 'bg-red-50',
  },
  {
    code: 'PM10',
    name: 'Durva szálló por',
    desc: 'A 10 mikrométernél kisebb részecskék az orrban és a torokig jutnak. Forrásai: por, pollen, építkezések.',
    icon: Wind,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
  },
  {
    code: 'NO₂',
    name: 'Nitrogén-dioxid',
    desc: 'Elsősorban a dízel járművek kipufogógázából keletkezik. Légutak gyulladását okozza.',
    icon: Car,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    code: 'O₃',
    name: 'Ózon',
    desc: 'Fotokémiai reakcióval keletkezik nyári napsütésben. Magas koncentrációban tüdőkárosító.',
    icon: Thermometer,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
  },
  {
    code: 'CO',
    name: 'Szén-monoxid',
    desc: 'Tökéletlen égésből keletkezik. Zárt garázsoknál, rossz szellőzésű tereknél veszélyes.',
    icon: AlertTriangle,
    color: 'text-slate-500',
    bg: 'bg-slate-50',
  },
  {
    code: 'SO₂',
    name: 'Kén-dioxid',
    desc: 'Szén és olaj elégetésekor keletkezik. A fűtési szezontól Budapest egyes negyedeiben megemelkedik.',
    icon: Factory,
    color: 'text-purple-500',
    bg: 'bg-purple-50',
  },
];

const SOURCES = [
  {
    icon: Car,
    title: 'Közlekedés',
    text: 'A budapesti belváros levegőszennyezésének legjelentősebb forrása a motorizált közlekedés, különösen a dízel személyautók és a tehergépjárművek. A Nagykörút és a főbb bevezető utak mentén a NO₂ értékek tartósan meghaladják az EU éves határértékeit.',
  },
  {
    icon: Thermometer,
    title: 'Fűtési szezon (október–március)',
    text: 'Az elavult kazánok és a szilárd tüzelőanyagú fűtés (szén, tűzifa, biomassza) az őszi-téli hónapokban drámai PM2.5 csúcsokat okoz. Az OLM mérőhálózat adatai szerint Budapest agglomerációjában a fűtési szezonban akár 3–4-szeres PM2.5 értékek mérhetők nyárhoz képest.',
  },
  {
    icon: Factory,
    title: 'Ipari tevékenység',
    text: 'Csepelen és a külső kerületekben ipari üzemek — különösen vegyipari és fémfeldolgozó egységek — szintén hozzájárulnak a légszennyezéshez, bár arányuk a közlekedéshez képest kisebb Budapest belvárosában.',
  },
  {
    icon: Leaf,
    title: 'Természetes szennyezők',
    text: 'Tavaszi pollenszezonban a nyírfa, a tölgy és a fű pollenje kiugróan magas concentrációkat ér el Budapesten. Nyáron az afrikai porszelek Saharai porral terhelt levegőhullámokat hozhatnak, amelyek átmenetileg az EU határértékeit meghaladó PM10-értékeket okoznak.',
  },
];

const HEALTH_EFFECTS = [
  {
    icon: Activity,
    title: 'Légzőrendszer',
    text: 'A PM2.5 részecskék a tüdő alveolusaiba hatolnak, gyulladást okozva. Asztmás betegeknél a rohamok száma szignifikánsan nő a szennyezett napokon. Hosszú távon krónikus obstruktív tüdőbetegség (COPD) alakulhat ki.',
  },
  {
    icon: Heart,
    title: 'Szív- és érrendszer',
    text: 'Az Egészségügyi Világszervezet 2021-es iránymutatása szerint a finomrészecske-szennyezés szívrohamhoz, stroke-hoz és szív- és érrendszeri halálozáshoz vezető legjelentősebb környezeti kockázati tényező Európában. Becslések szerint évente közel 400 000 korai haláleset köthető légszenynyezéshez az EU-ban.',
  },
  {
    icon: AlertTriangle,
    title: 'Gyerekek és csecsemők',
    text: 'A fejlődő tüdő különösen érzékeny a szálló porra. Magasabb légszennyezettségű területen születő gyermekeknél csökkent tüdőkapacitás és magasabb asztmaprevalencia mutatható ki. Az iskolák elhelyezkedése ezért döntő tényező a kisgyermekes családok lakóhely-választásában.',
  },
  {
    icon: Leaf,
    title: 'Allergiások',
    text: 'A pollenkoncentráció és a légszennyezés kölcsönhatásba lép: a szennyezett levegőben a pollenallergének erőteljesebben hatnak. Budapest a Kárpát-medence egyik legmagasabb pollenkoncentrációjú városa, amit a városi hő-sziget hatás tovább fokoz.',
  },
];

const DATA_SOURCES = [
  {
    name: 'OLM — Országos Légszennyezettségi Mérőhálózat',
    desc: 'Az Országos Meteorológiai Szolgálat (OMSZ) által üzemeltetett, EU-jogszabályoknak megfelelő mérőhálózat, amely valós idejű PM2.5, PM10, NO₂, O₃ és SO₂ adatokat közöl. Magyarország legmegbízhatóbb hazai forrása.',
    url: 'https://levegominoseg.hu',
  },
  {
    name: 'OpenAQ',
    desc: 'Nonprofit szervezet által összegyűjtött globális nyílt levegőminőségi adatbázis, amely az OLM adatokat is tartalmazza, és API-n keresztül szabadon elérhető fejlesztők és kutatók számára.',
    url: 'https://openaq.org',
  },
  {
    name: 'Copernicus CAMS',
    desc: 'Az EU Copernicus programjának Légköri Monitoring Szolgálata (CAMS) európai szintű légminőségi előrejelzéseket és visszatekintő adatsorokat biztosít, beleértve Budapestet is.',
    url: 'https://atmosphere.copernicus.eu',
  },
  {
    name: 'EEA — Európai Környezetvédelmi Ügynökség',
    desc: 'Az EEA AirBase és AQI adatbázisa tartalmazza az EU tagállami mérési adatokat, beleértve a magyarországi OLM állomásokat, éves szintű aggregációkkal és trendadatokkal.',
    url: 'https://www.eea.europa.eu/en/topics/in-depth/air-pollution',
  },
];

export default function LevegominosegBudapestPillarPage() {
  return (
    <div className="min-h-screen bg-white">
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
          <span className="font-medium text-slate-600">Levegőminőség Budapest</span>
        </nav>

        {/* Hero */}
        <div className="mb-14">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <Wind size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Levegőminőség Budapest — mit lélegzünk be?
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            Budapest levegőminősége az EU-s átlagnál rosszabb: a finomrészecske-szennyezés (PM2.5) és
            a nitrogén-dioxid (NO₂) szintje számos kerületben rendszeresen meghaladja a WHO 2021-es,
            szigorított iránymutatásait. Mégis hatalmas különbség van a legszennyezettebb belső kerületek
            és a budai zöldövezetek között. Ez az útmutató összegyűjti a tudnivalókat nyílt forrásból.
          </p>
        </div>

        {/* Pillar menu */}
        <section className="mb-16">
          <h2 className="mb-2 text-2xl font-black text-slate-900">Témakörök</h2>
          <p className="mb-7 text-slate-500">
            Mélyebben merüljön el a levegőminőség egy-egy aspektusában, vagy olvassa végig az egész útmutatót.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CLUSTER_ARTICLES.map((article) => {
              const Icon = article.icon;
              return (
                <Link
                  key={article.href}
                  href={article.href}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 transition-colors group-hover:bg-brand-100">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <p className="mb-1.5 font-bold text-slate-900 group-hover:text-brand-700">
                    {article.title}
                  </p>
                  <p className="flex-1 text-sm leading-relaxed text-slate-500">{article.summary}</p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-brand-600">
                    Olvasom <ArrowRight size={12} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Mit mérünk és miért fontos */}
        <section className="mb-16">
          <h2 className="mb-2 text-2xl font-black text-slate-900">Mit mérünk és miért fontos?</h2>
          <p className="mb-7 leading-relaxed text-slate-500">
            A levegőminőséget több különböző szennyező anyag koncentrációjával jellemezzük. Mindegyiknek
            eltérő forrása, egészségügyi hatása és jogszabályi határértéke van. Az EU direktívában (2008/50/EK
            és a 2024-es felülvizsgálat) rögzített határértékek szigorúbbak lettek, de még mindig lazábbak
            a WHO 2021-es iránymutatásainál.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {POLLUTANTS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.code}
                  className={`rounded-2xl border border-slate-100 ${p.bg} p-5`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Icon size={18} className={p.color} />
                    <span className={`text-sm font-black ${p.color}`}>{p.code}</span>
                  </div>
                  <p className="mb-1.5 font-bold text-slate-900">{p.name}</p>
                  <p className="text-sm leading-relaxed text-slate-600">{p.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-8 rounded-2xl border border-brand-100 bg-brand-50 p-6">
            <p className="mb-3 font-bold text-slate-900">WHO (2021) vs. EU határértékek — kulcs mutatók</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-200">
                    <th className="pb-2 text-left font-semibold text-slate-700">Szennyező</th>
                    <th className="pb-2 text-left font-semibold text-slate-700">WHO éves</th>
                    <th className="pb-2 text-left font-semibold text-slate-700">EU éves</th>
                    <th className="pb-2 text-left font-semibold text-slate-700">WHO napi</th>
                    <th className="pb-2 text-left font-semibold text-slate-700">EU napi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-100">
                  <tr>
                    <td className="py-2 font-medium text-slate-900">PM2.5</td>
                    <td className="py-2 text-slate-600">5 µg/m³</td>
                    <td className="py-2 text-slate-600">10 µg/m³</td>
                    <td className="py-2 text-slate-600">15 µg/m³</td>
                    <td className="py-2 text-slate-600">25 µg/m³</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium text-slate-900">PM10</td>
                    <td className="py-2 text-slate-600">15 µg/m³</td>
                    <td className="py-2 text-slate-600">20 µg/m³</td>
                    <td className="py-2 text-slate-600">45 µg/m³</td>
                    <td className="py-2 text-slate-600">50 µg/m³</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium text-slate-900">NO₂</td>
                    <td className="py-2 text-slate-600">10 µg/m³</td>
                    <td className="py-2 text-slate-600">40 µg/m³</td>
                    <td className="py-2 text-slate-600">25 µg/m³</td>
                    <td className="py-2 text-slate-600">200 µg/m³</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Forrás: WHO Global Air Quality Guidelines 2021; EU 2008/50/EK irányelv és 2024/2881 rendelet.
              Az EU 2030-ra szorosabb határértékeket vezet be.
            </p>
          </div>
        </section>

        {/* Fő szennyezési források */}
        <section className="mb-16">
          <h2 className="mb-2 text-2xl font-black text-slate-900">Budapest levegőminőségének fő forrásai</h2>
          <p className="mb-7 leading-relaxed text-slate-500">
            A budapesti légszennyezés nem egyenletes és nem állandó — forrásaitól és az évszaktól
            függően nagyon eltérő képet mutat. A négy legfontosabb szennyezési forrás:
          </p>
          <div className="space-y-5">
            {SOURCES.map((source) => {
              const Icon = source.icon;
              return (
                <div
                  key={source.title}
                  className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="mb-1 font-bold text-slate-900">{source.title}</p>
                    <p className="text-sm leading-relaxed text-slate-500">{source.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Egészségügyi hatások */}
        <section className="mb-16">
          <h2 className="mb-2 text-2xl font-black text-slate-900">Egészségügyi hatások</h2>
          <p className="mb-7 leading-relaxed text-slate-500">
            A légszennyezés egészségügyi hatásai jól dokumentáltak és összetettek. Az azonnali hatások
            (szemirritáció, köhögés) mellett a hosszú távú kitettség súlyos krónikus betegségekhez vezet.
            Az alábbiak az Egészségügyi Világszervezet és az Európai Környezetvédelmi Ügynökség által
            leggyakrabban hivatkozott hatások.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {HEALTH_EFFECTS.map((effect) => {
              const Icon = effect.icon;
              return (
                <div
                  key={effect.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <p className="mb-1.5 font-bold text-slate-900">{effect.title}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{effect.text}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-sm leading-relaxed text-amber-800">
                <strong>Megjegyzés:</strong> Ez az oldal tájékoztató jellegű. Konkrét egészségügyi kérdésekben
                forduljon háziorvosához, tüdőgyógyászához vagy allergológusához. A levegőminőségi adatok
                napi szinten változhatnak — döntéshozatalhoz az OLM valós idejű adatait ajánljuk.
              </p>
            </div>
          </div>
        </section>

        {/* Adatforrások */}
        <section className="mb-16 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-8">
          <div className="mb-6 flex items-center gap-3">
            <Database size={20} className="text-brand-600" />
            <h2 className="text-xl font-black text-slate-900">Adatforrásaink</h2>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-slate-500">
            A PanelLakó levegőminőségi tartalma kizárólag nyilvánosan elérhető, hiteles tudományos és
            kormányzati forrásokra épül. Nem végzünk saját méréseket — az alábbi forrásokat összesítjük
            és tesszük könnyebben érthetővé.
          </p>
          <div className="space-y-5">
            {DATA_SOURCES.map((ds) => (
              <div key={ds.name} className="border-l-2 border-brand-300 pl-4">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900">{ds.name}</p>
                  <a
                    href={ds.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:text-brand-700"
                    aria-label={`${ds.name} megnyitása (új lapon)`}
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
            Lakóhely kiválasztása levegőminőség alapján
          </h2>
          <p className="mb-6 text-brand-100">
            A PanelLakó alkalmazás épületi szintű levegőminőségi adatokat, pollenkoncentrációt és
            környezeti mutatókat jelenít meg a budapestitársasházaknál. Nézze meg lakása vagy
            kiszemelt ingatlana körzetét.
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
