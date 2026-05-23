import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MapPin,
  ChevronRight,
  AlertTriangle,
  Activity,
  BarChart2,
  Leaf,
  ArrowRight,
  CheckCircle,
  TrendingDown,
  TrendingUp,
  ExternalLink,
  Wind,
  Car,
  Building2,
  Thermometer,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Budapest legszennyezettebb kerületei | PanelLakó',
  description:
    'Melyik budapesti kerületben a legjobb és legrosszabb a levegő? Kerületenkénti összehasonlítás PM2.5 és NO₂ adatok alapján — OLM mérőállomások szerint.',
  alternates: {
    canonical: 'https://panellako.hu/levegominoseg-budapest/budapest-legszennyezettebb-keruletek',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Budapest legszennyezettebb és legtisztabb kerületei',
  description:
    'Melyik budapesti kerületben a legjobb és legrosszabb a levegő? Kerületenkénti összehasonlítás PM2.5 és NO₂ adatok alapján — OLM mérőállomások szerint.',
  inLanguage: 'hu',
  url: 'https://panellako.hu/levegominoseg-budapest/budapest-legszennyezettebb-keruletek',
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
      name: 'Levegőminőség Budapest',
      item: 'https://panellako.hu/levegominoseg-budapest',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Legszennyezettebb kerületek',
      item: 'https://panellako.hu/levegominoseg-budapest/budapest-legszennyezettebb-keruletek',
    },
  ],
};

const POLLUTED_DISTRICTS = [
  {
    district: 'VIII. kerület — Józsefváros',
    pm25: '~16–20 µg/m³',
    no2: '~38–45 µg/m³',
    reason:
      'A Rákóczi út és a Kerepesi út kereszteződésénél lévő nagy forgalmú csomópont, ipari múltú épületállomány, elavult fűtési rendszerek az épületek egy részében. A belváros irányából érkező és áthaladó tranzitforgalom is megemeli a NO₂-szintet.',
  },
  {
    district: 'IX. kerület — Ferencváros',
    pm25: '~15–19 µg/m³',
    no2: '~36–43 µg/m³',
    reason:
      'A Soroksári úti ipari zóna, a Hungária körút forgalma és a Csepel-sziget irányából érkező ipari emisszió együttesen terheli a ferencvárosi levegőt. A rakpartok mentén a teherforgalom is jelentős.',
  },
  {
    district: 'XIV. kerület — Zugló',
    pm25: '~14–17 µg/m³',
    no2: '~32–40 µg/m³',
    reason:
      'Meglepőnek tűnhet, de a Thököly út, a Bosnyák tér és a Hungária körút zuglói szakasza intenzív forgalmat bonyolít. A kerület agglomerációs bevezető funkciója (M3-as autópálya közelség) is rontja a levegőminőséget.',
  },
  {
    district: 'VI. kerület — Terézváros',
    pm25: '~15–18 µg/m³',
    no2: '~37–44 µg/m³',
    reason:
      'A Nagykörút és az Andrássy út kereszteződése Budapesten az egyik legmagasabb NO₂-szintű pont. A sűrű beépítés az utcai levegőcsere-ráta csökkentésével tovább súlyosbítja a helyzetet.',
  },
];

const CLEAN_DISTRICTS = [
  {
    district: 'II. kerület — Budai-hegyvidék egy része',
    pm25: '~7–11 µg/m³',
    no2: '~15–22 µg/m³',
    reason:
      'A Budai-hegyek oldalában elhelyezkedő részek (Hűvösvölgy, Zugliget, Máriaremete) zöldterülettel körülvéve, alacsony tranzitforgalommal. A szél általában a Duna völgyéből fúj, és elviszi a közlekedési szennyezőket.',
  },
  {
    district: 'XII. kerület — Hegyvidék',
    pm25: '~7–10 µg/m³',
    no2: '~14–20 µg/m³',
    reason:
      'Budapest legkevésbé szennyezett kerületei közé tartozik. A Normafa és a Zugligeti-vár körüli területek az OLM-mérések szerint rendszeresen az EU éves PM2.5-határérték alatt maradnak, és a WHO iránymutatásához is közel kerülnek.',
  },
  {
    district: 'XVI. kerület — Mátyásföld',
    pm25: '~8–11 µg/m³',
    no2: '~16–23 µg/m³',
    reason:
      'Pest oldalán a külső kerületek közül a XVI. kerület kertvárosias jellege és alacsony beépítési sűrűsége szabad levegőáramlást tesz lehetővé. Az ipari létesítményektől való távolsága is kedvező.',
  },
  {
    district: 'XVII. kerület — Rákosmente',
    pm25: '~8–12 µg/m³',
    no2: '~17–24 µg/m³',
    reason:
      'A Rákos-patak menti zöldfolyosó és a kisvárosias, kertesházi beépítés Budapest legkevésbé forgalmas kerületei közé sorolja. A fűtési szezontól eltekintve éves átlagban is jobb mutatókat produkál, mint a belső kerületek.',
  },
];

const SEASONAL_CHANGES = [
  {
    season: 'Október–március (fűtési szezon)',
    icon: Thermometer,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    desc: 'A PM2.5 szintek akár 2–4-szeresükre nőnek. Szélcsendes, hideg éjszakákon az inverziós időjárás megakadályozza a szennyezők felfelé való keveredését, és alacsony rétegben halmozódnak fel. A belvárosban reggel 5–9 óra között fordulnak elő a legrosszabb értékek.',
  },
  {
    season: 'Április–szeptember (nyári időszak)',
    icon: Leaf,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-100',
    desc: 'Az alacsonyabb PM2.5 ellenére az ózonszennyezés (O₃) nő a napsütéses napok számával. Május-júniusban a pollenkoncentráció is kiugróan magas Budapesten, különösen a platánsorokban gazdag belvárosi utcákon. Az afrikai porszelek júliusban-augusztusban átmeneti PM10-csúcsokat okoznak.',
  },
];

const GREEN_INITIATIVES = [
  {
    icon: Car,
    title: 'Elektromos buszok flottacseréje',
    text: 'A BKV több mint 50 elektromos buszt állított forgalomba 2022–2024 között, és a cserét 2030-ig folytatja. Az elektromos buszok a NO₂ és a feketekorom (PM) kibocsátásának nullára csökkentésével a legforgalmasabb vonalak mentén közvetlen levegőminőségi javulást hoznak.',
  },
  {
    icon: Leaf,
    title: 'Zöld Budapest Stratégia',
    text: 'A Fővárosi Önkormányzat Zöld Budapest Stratégiája 2030-ra 30%-kal kívánja növelni a városi zöldterületek arányát. Az utcai fasortelepítések, a zöldtetők és zöldfalak nemcsak hőszigetet csökkentik, hanem a PM10 egy részét is megkötik.',
  },
  {
    icon: Wind,
    title: 'Alacsony kibocsátású övezetek (LEZ)',
    text: 'Budapest tervezi alacsony kibocsátású övezetként kezelni a belváros egy részét, amely a leginkább szennyező Euro 3 és annál régebbi dízel járműveket kitiltaná. Az intézkedés pontos bevezetési ütemezése és területe 2024-ben még tárgyalás alatt volt.',
  },
  {
    icon: Building2,
    title: 'Fűtési rendszerek korszerűsítése',
    text: 'A szén- és biomassza-alapú fűtés visszaszorítása érdekében Budapest és az agglomeráció több önkormányzata pályázati forrásokat nyit a kazáncsere-programokhoz. A hatásuk a PM2.5 téli csúcsaira a legjelentősebb.',
  },
];

const PROPERTY_VALUE_FACTORS = [
  {
    factor: 'Levegőminőség és ingatlanárak',
    text: 'Egy 2022-es magyarországi hedonikus árazási modell (Pénzügykutató Intézet) 1–3%-os ingatlanár-különbséget becsült a legszennyezettebb és a legkevésbé szennyezett budapesti kerületek között azonos alapterület, elhelyezkedési kategória és közlekedési hozzáférés esetén. Ez egy 60 millió forintos lakásnál 600 000 – 1,8 millió forint különbséget jelent.',
  },
  {
    factor: 'Allergiás és asztmás vevők preferenciái',
    text: 'Az ingatlanközvetítők visszajelzései szerint az allergiás és asztmás vásárlók 2019 óta szignifikánsan többet kérdeznek a levegőminőségre vonatkozó adatokról. Ez különösen a kisgyermekes és 60 év feletti vásárlóknál figyelhető meg.',
  },
  {
    factor: 'Kerületenkénti prémium — II. és XII.',
    text: 'A budai hegyvidéki kerületek (II., XII.) átlagosan magasabb négyzetméterárát a piaci elemzők részben a jobb levegőminőséggel és a zöldterületek közelségével magyarázzák, nemcsak a budai „presztízzsel". A levegőminőség bármilyen módon mérhető javulása tovább emelheti ezeket az árakat.',
  },
];

export default function BudapestLegszennyezettebKeruletek() {
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
          <span className="font-medium text-slate-600">Legszennyezettebb kerületek</span>
        </nav>

        {/* Hero */}
        <div className="mb-14">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <MapPin size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Budapest legszennyezettebb és legtisztabb kerületei
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            A budapesti levegőminőség kerületenként jelentősen eltér. A belső pesti kerületek
            NO₂- és PM2.5-szintje olykor kétszerese a budai hegyvidéki kerületeknek. Ez a különbség
            nem csupán egészségügyi szempontból, hanem ingatlanérték szempontjából is egyre inkább
            mérhető.
          </p>
        </div>

        {/* Mérési módszertan */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">
            Hogyan mérjük a kerületi levegőminőséget?
          </h2>
          <div className="space-y-4 leading-relaxed text-slate-600">
            <p>
              Magyarország levegőminőségét az Országos Meteorológiai Szolgálat (OMSZ) által üzemeltetett
              Országos Légszennyezettségi Mérőhálózat (OLM) figyeli. A hálózat budapesti mérőállomásai
              folyamatosan mérik a PM2.5, PM10, NO₂, O₃, CO és SO₂ értékeket, és az adatokat
              15 percenként töltik fel a <strong>levegominoseg.hu</strong> portálra.
            </p>
            <p>
              Az OLM állomások nem fedik egyenletesen az összes kerületet — általában a forgalmas
              csomópontoknál és a háttér-mérőhelyeken (pl. parkokban) találhatók. Ezért egyes kerületekre
              vonatkozó becslések részben modellezésen (Copernicus CAMS) és interpoláción alapulnak.
              Az EEA AirBase adatai éves aggregálások formájában érhetők el.
            </p>
            <p>
              Az alábbiakban közölt PM2.5 és NO₂ értékek az OLM 2021–2023 közötti éves átlagainak
              becslésen alapuló tartományai. Nem tükröznek egyetlen konkrét évet, hanem a tipikus
              levegőminőségi helyzetet jelzik. Pontos, aktuális adatokhoz mindig a
              <strong> levegominoseg.hu</strong> oldalt ajánljuk.
            </p>
          </div>
          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-sm leading-relaxed text-amber-800">
                Az alábbi adatok tájékoztató jellegű becslésen alapulnak nyílt forrásokból. Nem helyettesítik
                az OLM hivatalos mérési adatait. Ingatlanvásárlási döntéshoznál mindig ellenőrizze az aktuális
                OLM-adatokat és kérjen szakértői véleményt.
              </p>
            </div>
          </div>
        </section>

        {/* Legszennyezettebb kerületek */}
        <section className="mb-16">
          <div className="mb-6 flex items-center gap-3">
            <TrendingUp size={20} className="text-red-500" />
            <h2 className="text-2xl font-black text-slate-900">A leginkább érintett kerületek</h2>
          </div>
          <p className="mb-7 leading-relaxed text-slate-500">
            Az alábbi kerületek általában a legmagasabb PM2.5 és NO₂ értékeket produkálják Budapesten.
            Közös jellemzőjük a sűrű beépítés, az intenzív tranzitforgalom és az elavult épületállomány.
          </p>
          <div className="space-y-5">
            {POLLUTED_DISTRICTS.map((d) => (
              <div
                key={d.district}
                className="rounded-2xl border border-red-100 bg-red-50/50 p-5"
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <p className="font-black text-slate-900">{d.district}</p>
                  <div className="flex gap-3">
                    <span className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                      PM2.5: {d.pm25}
                    </span>
                    <span className="rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                      NO₂: {d.no2}
                    </span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{d.reason}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Legtisztább kerületek */}
        <section className="mb-16">
          <div className="mb-6 flex items-center gap-3">
            <TrendingDown size={20} className="text-green-600" />
            <h2 className="text-2xl font-black text-slate-900">A legtisztább levegőjű kerületek</h2>
          </div>
          <p className="mb-7 leading-relaxed text-slate-500">
            Ezek a kerületek Budapesten belül szignifikánsan jobb levegőminőséget mutatnak. Közös
            jellemzőjük a kertvárosias vagy hegyvidéki jelleg, az alacsony tranzitforgalom és a
            szabad levegőáramlás lehetősége.
          </p>
          <div className="space-y-5">
            {CLEAN_DISTRICTS.map((d) => (
              <div
                key={d.district}
                className="rounded-2xl border border-green-100 bg-green-50/50 p-5"
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <p className="font-black text-slate-900">{d.district}</p>
                  <div className="flex gap-3">
                    <span className="rounded-lg bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                      PM2.5: {d.pm25}
                    </span>
                    <span className="rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-700">
                      NO₂: {d.no2}
                    </span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{d.reason}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Szezonális változások */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">Szezonális változások</h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            A kerületi rangsor nem állandó — az évszak és az időjárás drámaian befolyásolja, hogy
            éppen melyik kerület mutatja a legrosszabb értékeket.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {SEASONAL_CHANGES.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.season}
                  className={`rounded-2xl border ${s.border} ${s.bg} p-5`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Icon size={18} className={s.color} />
                    <p className={`font-bold ${s.color}`}>{s.season}</p>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Ingatlanértékre való hatás */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">
            Hogyan befolyásolja ez az ingatlan értékét?
          </h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            A levegőminőség és az ingatlanpiac kapcsolata Magyarországon is vizsgált téma lett. Az alábbiakban
            összegyűjtöttük a rendelkezésre álló hazai és közép-európai adatokat.
          </p>
          <div className="space-y-5">
            {PROPERTY_VALUE_FACTORS.map((f) => (
              <div key={f.factor} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                  <BarChart2 size={20} className="text-brand-600" />
                </div>
                <div>
                  <p className="mb-1 font-bold text-slate-900">{f.factor}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Budapest zöld kezdeményezések */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">
            Mit tesz Budapest a levegőminőség javításáért?
          </h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            A fővárosi és a kerületi önkormányzatok több programon dolgoznak a légszennyezés csökkentése
            érdekében. A hatások néhány éves távlatban mérhetők lesznek az OLM-adatokon.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {GREEN_INITIATIVES.map((initiative) => {
              const Icon = initiative.icon;
              return (
                <div
                  key={initiative.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <p className="mb-1.5 font-bold text-slate-900">{initiative.title}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{initiative.text}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <p className="mb-2 text-sm font-bold text-slate-800">Adatforrások és hivatkozások</p>
            <ul className="space-y-1 text-sm text-slate-500">
              <li className="flex items-center gap-2">
                <ExternalLink size={12} className="text-brand-600" />
                <a href="https://levegominoseg.hu" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600">
                  OLM — Magyarország levegőminőségi adatai
                </a>
              </li>
              <li className="flex items-center gap-2">
                <ExternalLink size={12} className="text-brand-600" />
                <a href="https://www.eea.europa.eu/en/topics/in-depth/air-pollution" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600">
                  EEA AirBase — európai összehasonlítás
                </a>
              </li>
              <li className="flex items-center gap-2">
                <ExternalLink size={12} className="text-brand-600" />
                <a href="https://budapest.hu/Lapok/Zold-Budapest-Strategia.aspx" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600">
                  Zöld Budapest Stratégia — Fővárosi Önkormányzat
                </a>
              </li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-lg">
          <h2 className="mb-2 text-2xl font-black text-white">
            Nézze meg lakása levegőminőségét a PanelLakóban
          </h2>
          <p className="mb-6 text-brand-100">
            A PanelLakó alkalmazás kerületi és épületi szintű levegőminőségi adatokat és környezeti
            mutatókat jelenít meg a budapesti társasházakhoz — segítve a tájékozott lakóhely-választást.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-50"
          >
            <CheckCircle size={16} />
            Ingyenes regisztráció
          </Link>
        </div>

        {/* Kapcsolódó cikkek */}
        <div className="mt-12">
          <p className="mb-4 text-sm font-bold text-slate-700">Kapcsolódó cikkek</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/levegominoseg-budapest/pm25-pm10-mit-jelent"
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              <BarChart2 size={16} className="text-brand-600" />
              PM2.5 és PM10 — mit jelent?
              <ArrowRight size={14} className="ml-auto text-slate-400" />
            </Link>
            <Link
              href="/levegominoseg-budapest/belteri-levegominoseg-tarsashazban"
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              <Activity size={16} className="text-brand-600" />
              Beltéri levegőminőség társasházban
              <ArrowRight size={14} className="ml-auto text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-8 flex items-center gap-2 text-sm text-slate-400">
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
