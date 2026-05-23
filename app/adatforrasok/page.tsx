import type { Metadata } from 'next';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Database,
  Globe,
  MapPin,
  Activity,
  CheckCircle,
  ArrowRight,
  Train,
  Wind,
  Volume2,
  Leaf,
  BarChart2,
  AlertCircle,
  ExternalLink,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Adatforrások és Módszertan — PanelLakó Elemzések | PanelLakó',
  description:
    'A PanelLakó elemzéseiben felhasznált nyílt adatforrások: BKK GTFS, OpenAQ, Copernicus, HungaroMet, OpenStreetMap, KSH — részletes módszertannal.',
  alternates: { canonical: 'https://panellako.hu/adatforrasok' },
};

const datasetSchema = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'PanelLakó Elemzési Adatforrások',
  description:
    'A PanelLakó platform tömegközlekedési, levegőminőségi, zajszennyezési, térinformatikai és statisztikai elemzéseinek adatforrásai.',
  url: 'https://panellako.hu/adatforrasok',
  inLanguage: 'hu',
  creator: {
    '@type': 'Organization',
    name: 'PanelLakó',
    url: 'https://panellako.hu',
  },
  includedInDataCatalog: {
    '@type': 'DataCatalog',
    name: 'PanelLakó nyílt adatkatalógus',
  },
  hasPart: [
    {
      '@type': 'Dataset',
      name: 'BKK Futár GTFS',
      description: 'Budapest tömegközlekedési megállók, vonalak, menetrend, útvonalak',
      url: 'https://developer.bkk.hu',
      license: 'https://creativecommons.org/licenses/by/4.0/',
    },
    {
      '@type': 'Dataset',
      name: 'OpenAQ',
      description: 'PM2.5, PM10, NO₂, O₃ levegőminőségi mérések',
      url: 'https://openaq.org',
    },
    {
      '@type': 'Dataset',
      name: 'Copernicus Atmosphere Monitoring Service (CAMS)',
      description: 'EU műholdas légkörfigyelés és napi levegőminőségi előrejelzés',
      url: 'https://atmosphere.copernicus.eu',
    },
    {
      '@type': 'Dataset',
      name: 'OpenStreetMap',
      description: 'Épületek, közterületek, zöldterületek, POI-ok',
      url: 'https://www.openstreetmap.org',
      license: 'https://opendatacommons.org/licenses/odbl/1-0/',
    },
    {
      '@type': 'Dataset',
      name: 'KSH — Központi Statisztikai Hivatal',
      description: 'Demográfia, ingatlanárak, közlekedési statisztikák',
      url: 'https://www.ksh.hu',
    },
  ],
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Főoldal', item: 'https://panellako.hu' },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Adatforrások',
      item: 'https://panellako.hu/adatforrasok',
    },
  ],
};

const TRANSIT_SOURCES = [
  {
    name: 'BKK Futár GTFS',
    href: 'https://developer.bkk.hu',
    update: 'Menetrend-váltáskor (2×/év)',
    license: 'CC BY 4.0',
    content: 'Megállók, vonalak, menetrend, útvonalak',
  },
  {
    name: 'BKK GTFS-RT',
    href: 'https://developer.bkk.hu',
    update: '15 másodperc',
    license: 'CC BY 4.0',
    content: 'Valós idejű jármű-pozíció és időbeli eltérések',
  },
];

const AIR_SOURCES = [
  {
    name: 'OpenAQ',
    href: 'https://openaq.org',
    update: 'Óránként',
    license: 'CC BY 4.0',
    content: 'PM2.5, PM10, NO₂, O₃ mérések, globális mérőhálózat',
  },
  {
    name: 'Copernicus CAMS (Atmosphere Monitoring Service)',
    href: 'https://atmosphere.copernicus.eu',
    update: 'Naponta (előrejelzés)',
    license: 'Copernicus licence (ingyenes felhasználás)',
    content: 'EU műholdas légkörfigyelés, európai napi levegőminőségi előrejelzés',
  },
  {
    name: 'OLM — Országos Légszennyezettségi Mérőhálózat',
    href: 'https://www.levegominoseg.hu',
    update: 'Óránként',
    license: 'Magyar állami adatok',
    content: 'Magyar állami mérőhálózat, OMSZ üzemeltetés, valós idejű mérési adatok',
  },
];

const NOISE_SOURCES = [
  {
    name: 'HungaroMet / OMSZ Zajszennyezési térkép',
    href: 'https://zajterkep.met.hu',
    update: 'Stratégiai zajkészítési ciklus (5 évenként)',
    license: 'EU 2002/49/EK, WMS szolgáltatás',
    content: 'Közlekedési és ipari zajszint-térképek, Ldn és Lnight értékek',
  },
  {
    name: 'NIF Zrt. Zajszennyezési térkép',
    href: 'https://zajterkepek.hu',
    update: 'Stratégiai zajkészítési ciklus',
    license: 'WMS szolgáltatás',
    content: 'Autópálya és főút menti zajszint-térképek',
  },
];

const GEO_SOURCES = [
  {
    name: 'OpenStreetMap (OSM)',
    href: 'https://www.openstreetmap.org',
    update: 'Folyamatos (közösségi szerkesztés)',
    license: 'ODbL 1.0',
    content: 'Épületek, közterületek, zöldterületek, POI-ok, úthálózat',
  },
  {
    name: 'Overpass API',
    href: 'https://overpass-api.de',
    update: 'Valós idejű',
    license: 'ODbL 1.0',
    content: 'OSM lekérdező API, valós idejű POI query és térbeli szűrések',
  },
];

const CLIMATE_SOURCES = [
  {
    name: 'Copernicus Land Service',
    href: 'https://land.copernicus.eu',
    update: 'Évente / szezonálisan',
    license: 'Copernicus licence',
    content: 'NDVI (növényzeti index), Urban Atlas, városi zöldfelület-adatok',
  },
  {
    name: 'HungaroMet OMSZ',
    href: 'https://www.met.hu',
    update: 'Naponta / havi összesítők',
    license: 'Magyar állami adatok',
    content: 'Hőmérsékleti adatok, hősziget-index, klímatrendek, UV-sugárzás',
  },
];

const STATS_SOURCES = [
  {
    name: 'KSH — Központi Statisztikai Hivatal',
    href: 'https://www.ksh.hu',
    update: 'Éves (népszámlálás, éves statisztikák)',
    license: 'Magyar állami nyílt adatok',
    content: 'Demográfia, ingatlanárak, közlekedési statisztikák, kerületi adatok',
  },
  {
    name: 'TeIR — Területi Statisztikai Rendszer',
    href: 'https://teir.hu',
    update: 'Éves',
    license: 'Magyar állami nyílt adatok',
    content: 'Kerületi és járási szintű társadalmi-gazdasági adatok',
  },
];

type DataSource = {
  name: string;
  href: string;
  update: string;
  license: string;
  content: string;
};

function SourceCard({ source }: { source: DataSource }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <a
          href={source.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 text-sm font-black text-slate-800 hover:text-brand-700"
        >
          {source.name}
          <ExternalLink
            size={13}
            className="text-slate-400 transition-colors group-hover:text-brand-500"
          />
        </a>
      </div>
      <p className="mb-3 text-sm leading-relaxed text-slate-500">{source.content}</p>
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
          <Clock size={11} />
          {source.update}
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
          <ShieldCheck size={11} />
          {source.license}
        </span>
      </div>
    </div>
  );
}

type SectionProps = {
  id: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  intro: string;
  sources: DataSource[];
};

function DataSection({ id, icon: Icon, iconBg, iconColor, title, intro, sources }: SectionProps) {
  return (
    <section aria-labelledby={id} className="mb-12">
      <div className="mb-5 flex items-center gap-3">
        <div
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon size={20} className={iconColor} />
        </div>
        <h2 id={id} className="text-xl font-black text-slate-900">
          {title}
        </h2>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-slate-500">{intro}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {sources.map((s) => (
          <SourceCard key={s.name} source={s} />
        ))}
      </div>
    </section>
  );
}

export default function AdatforrasokPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <PublicNav />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">

        {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
        <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-1.5 text-xs text-slate-400">
          <Link href="/" className="hover:text-slate-700">
            Főoldal
          </Link>
          <span>/</span>
          <span className="text-slate-600">Adatforrások</span>
        </nav>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <div className="mb-14">
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-md shadow-brand-200">
            <Database size={26} className="text-white" />
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Adatforrások és módszertan
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-500">
            A PanelLakó elemzőmotorja kizárólag nyílt, hitelesített forrásokból dolgozik. Az alábbi
            táblázatok részletezik az egyes elemzési modulok mögötti adatokat, azok frissítési
            ciklusát és licencét.
          </p>
        </div>

        {/* ── Trust banner ───────────────────────────────────────────────── */}
        <div className="mb-12 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-teal-50 px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Globe, label: 'Kizárólag nyílt adatok', sub: 'Minden forrás publikusan elérhető és ellenőrizhető' },
              { icon: CheckCircle, label: 'Rendszeres frissítés', sub: 'Az adatok az eredeti forrás frissítési ciklusát követik' },
              { icon: ShieldCheck, label: 'Licencelt felhasználás', sub: 'Minden adatforrás felhasználási feltételeit betartjuk' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                  <Icon size={16} className="text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{label}</p>
                  <p className="text-xs leading-relaxed text-slate-500">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Data sections ──────────────────────────────────────────────── */}
        <DataSection
          id="tomegkozlekedes"
          icon={Train}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          title="Tömegközlekedési adatok"
          intro="A BKK nyílt adatszolgáltatásán keresztül naprakész menetrendet, megállóhelyeket és valós idejű járműpozíciót töltünk be. Ez az alap a lakóhely 5 és 15 perces tömegközlekedési elérhetőségének kiszámításához."
          sources={TRANSIT_SOURCES}
        />

        <DataSection
          id="levegominoseg"
          icon={Wind}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
          title="Levegőminőségi adatok"
          intro="Három egymást kiegészítő forrást kombinálunk: globális mérőhálózati adatokat, műholdas légkörmodelleket és a hazai állami mérőállomások valós idejű értékeit."
          sources={AIR_SOURCES}
        />

        <DataSection
          id="zajszennyezes"
          icon={Volume2}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          title="Zajszennyezési adatok"
          intro="Az EU 2002/49/EK zajirányelvnek megfelelően készített stratégiai zajszennyezési térképeket használjuk, WMS protokollon keresztül betöltve."
          sources={NOISE_SOURCES}
        />

        <DataSection
          id="teriinformatikai"
          icon={MapPin}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          title="Térinformatikai adatok"
          intro="Az OpenStreetMap a világ legnagyobb nyílt térképadatbázisa. Az Overpass API segítségével valós idejű, helyhez kötött POI-lekérdezéseket futtatunk — orvosi rendelők, iskolák, zöldterületek és bevásárlási lehetőségek elhelyezkedésének meghatározásához."
          sources={GEO_SOURCES}
        />

        <DataSection
          id="klimazoldterulet"
          icon={Leaf}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          title="Klíma és zöldterület adatok"
          intro="Az NDVI (Normalized Difference Vegetation Index) műholdas növényzeti index és a városi hőszigetre vonatkozó adatok lehetővé teszik a kerületi szintű zöldterület-borítottság és hőstressz kiszámítását."
          sources={CLIMATE_SOURCES}
        />

        <DataSection
          id="statisztikai"
          icon={BarChart2}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          title="Statisztikai adatok"
          intro="A KSH és a TeIR adatai biztosítják az ingatlanpiaci, demográfiai és közlekedési háttérinformációkat, amelyek kontextusba helyezik a környezeti méréseket."
          sources={STATS_SOURCES}
        />

        {/* ── Methodology notes ──────────────────────────────────────────── */}
        <section
          aria-labelledby="modszertan-heading"
          className="mb-12 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-8"
        >
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
            <Activity size={18} className="text-brand-600" />
          </div>
          <h2 id="modszertan-heading" className="mb-4 text-xl font-black text-slate-900">
            Módszertani megjegyzések
          </h2>
          <div className="space-y-5">
            {[
              {
                title: '420 méteres bufferzóna',
                body: 'Az 5 perces gyaloglási elérhetőséget 420 méter sugarú körrel modellezzük, ami az átlagos gyaloglási sebességen (84 m/perc) alapul. A 15 perces körzet ennek arányosan, 1 260 méter sugarú körként jelenik meg.',
              },
              {
                title: 'Megálló-sűrűség számítás',
                body: 'A tömegközlekedési sűrűség kiszámításához kernel density estimation (KDE) módszert alkalmazunk, Gaussian kernellel és 500 méteres sávszélességgel. Az eredmény egy folytonos sűrűségi felület, amely a megálló-hálózat térbeli egyenlőtlenségeit mutatja.',
              },
              {
                title: 'Levegőminőségi index',
                body: 'Az EEA (Európai Környezetvédelmi Ügynökség) EU Air Quality Index módszertanát alkalmazzuk: az egyes szennyezők (PM2.5, PM10, NO₂, O₃) mért értékeit az EU határértékekhez viszonyítva normáljuk, majd a legrosszabb részindex adja a végső indexet.',
              },
              {
                title: 'Zajindex (Ldn)',
                body: 'Az EU 2002/49/EK zajirányelvnek megfelelően a nap–este–éjszaka súlyozott átlagos zajszintet (Ldn) használjuk. Az esti és éjszakai zajt 5, illetve 10 dB(A) büntetéssel számítjuk, tükrözve a pihenési időszakok fokozott érzékenységét.',
              },
            ].map(({ title, body }) => (
              <div key={title} className="flex gap-3">
                <CheckCircle size={16} className="mt-1 shrink-0 text-brand-500" />
                <div>
                  <p className="mb-1 text-sm font-bold text-slate-800">{title}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Error reporting ────────────────────────────────────────────── */}
        <section
          aria-labelledby="hibabejelentes-heading"
          className="mb-12 rounded-2xl border border-amber-100 bg-amber-50 px-6 py-6"
        >
          <div className="flex items-start gap-4">
            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <AlertCircle size={18} className="text-amber-500" />
            </div>
            <div>
              <h2 id="hibabejelentes-heading" className="mb-2 text-base font-black text-slate-900">
                Adathibák bejelentése
              </h2>
              <p className="mb-3 text-sm leading-relaxed text-slate-600">
                Ha hibás, elavult vagy hiányzó adatot észlel valamelyik elemzési modulban, kérjük,
                jelezze felénk. Az adatminőség javítása közös érdek — minden bejelentés segít
                pontosabb elemzéseket kínálni minden felhasználónak.
              </p>
              <Link
                href="/kapcsolat"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-700 hover:text-amber-800 underline-offset-2 hover:underline"
              >
                Adathiba bejelentése a Kapcsolat oldalon
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-sm">
          <h2 className="mb-2 text-2xl font-black text-white">
            Nézze meg az elemzéseket valós adatokkal
          </h2>
          <p className="mb-6 text-brand-100">
            Keresse meg lakóhelye tömegközlekedési elérhetőségét, levegőminőségét és
            zajszennyezési szintjét — a fenti adatforrások alapján.
          </p>
          <Link
            href="/elemzes"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-50"
          >
            Elemzések megtekintése
            <ArrowRight size={16} />
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
