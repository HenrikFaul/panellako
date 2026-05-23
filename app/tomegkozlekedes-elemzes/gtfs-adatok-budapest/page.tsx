import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Database,
  Train,
  ChevronRight,
  ArrowRight,
  CheckCircle,
  FileText,
  RefreshCw,
  BarChart2,
  Download,
  Code,
  Map,
  Clock,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'GTFS Adatok Budapest — Mit Mutat a BKK Futár Open Data? | PanelLakó',
  description:
    'Budapest GTFS adatainak bemutatása: mit tartalmaz a BKK Futár menetrend, hogyan dolgozzuk fel, milyen elemzéseket tesz lehetővé — open data útmutató.',
  alternates: { canonical: 'https://panellako.hu/tomegkozlekedes-elemzes/gtfs-adatok-budapest' },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'GTFS adatok Budapest — a BKK Futár open data',
  description:
    'Budapest GTFS adatainak bemutatása: mit tartalmaz a BKK Futár menetrend, hogyan dolgozzuk fel, milyen elemzéseket tesz lehetővé — open data útmutató.',
  inLanguage: 'hu',
  url: 'https://panellako.hu/tomegkozlekedes-elemzes/gtfs-adatok-budapest',
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
      name: 'Tömegközlekedés Elemzés',
      item: 'https://panellako.hu/tomegkozlekedes-elemzes',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'GTFS Adatok Budapest',
      item: 'https://panellako.hu/tomegkozlekedes-elemzes/gtfs-adatok-budapest',
    },
  ],
};

const GTFS_FILES = [
  {
    file: 'agency.txt',
    desc: 'A közlekedési szolgáltató(k) neve, URL-je és időzónája. Budapest esetén egyetlen sor: BKK Zrt.',
    rows: '1 sor',
    cols: '7 oszlop',
  },
  {
    file: 'stops.txt',
    desc: 'Minden megálló és állomás neve, GPS-koordinátái (WGS84), azonosítója, szülő-állomás referenciája és kerekesszék-hozzáférhetősége.',
    rows: '~5 800 sor',
    cols: '10 oszlop',
  },
  {
    file: 'routes.txt',
    desc: 'A vonalak neve, rövid neve, típusa (0=villamos, 1=metró, 2=vasút, 3=busz, 4=hajó, 11=trolibusz) és szín-kódja a térképi megjelenítéshez.',
    rows: '~260 sor',
    cols: '9 oszlop',
  },
  {
    file: 'trips.txt',
    desc: 'Konkrét menetrendszakaszok, amelyek egy vonal–menetrend–irány kombinációját képviselik. Minden triphez tartozik egy shape_id a GPS-nyomvonalhoz.',
    rows: '~90 000+ sor',
    cols: '8 oszlop',
  },
  {
    file: 'stop_times.txt',
    desc: 'A legterjedelmesebb fájl: minden trip összes megállójának érkezési és indulási ideje, a megálló sorrendje és a pickup/drop-off típus.',
    rows: '~2,5 millió sor',
    cols: '9 oszlop',
  },
  {
    file: 'shapes.txt',
    desc: 'A vonalak GPS-nyomvonala pontsorozatként, az egyes pontok sorrendjével és az egymástól mért távolsággal. Térképi megjelenítéshez és területi elemzésekhez szükséges.',
    rows: '~500 000+ sor',
    cols: '5 oszlop',
  },
  {
    file: 'calendar.txt',
    desc: 'Menetrend-naptárak: melyik service_id hétfőtől–vasárnapig érvényes és milyen dátumtartományban. Az iskolai és nyári menetrendek váltásának alapja.',
    rows: '~30–50 sor',
    cols: '10 oszlop',
  },
  {
    file: 'calendar_dates.txt',
    desc: 'Kivételnapok: ünnepek, különleges eseménynapok, amelyek felülírják a calendar.txt alapértelmezett menetrendjét.',
    rows: '~200–400 sor',
    cols: '3 oszlop',
  },
];

const TOOLS = [
  {
    icon: Code,
    name: 'Python: gtfs-kit',
    desc: 'Pandas-alapú Python könyvtár GTFS-fájlok betöltéséhez, validálásához és elemzéséhez. Gyors megállósűrűség és menetrend-összefoglaló lekérdezések elvégzésére kiváló.',
    url: 'https://github.com/mrcagney/gtfs_kit',
  },
  {
    icon: Code,
    name: 'Python: partridge',
    desc: 'Memóriahatékony GTFS-olvasó, amely csak a szükséges fájlokat tölt be. Nagy adatcsomagoknál (pl. a budapesti stop_times.txt 2,5+ millió sorral) különösen hasznos.',
    url: 'https://github.com/remix/partridge',
  },
  {
    icon: Map,
    name: 'QGIS GTFS importáló',
    desc: 'A QGIS GTFS-betöltő bővítménye megnyitja a stops.txt és shapes.txt fájlokat vektorrétegként, lehetővé téve a térbeli vizualizációt és GIS-elemzést.',
    url: 'https://www.qgis.org',
  },
  {
    icon: Database,
    name: 'PostGIS / PostgreSQL',
    desc: 'A GTFS-adatok PostgreSQL-adatbázisba töltve hatékonyan lekérdezhetők térbeli ST_DWithin() és ST_Buffer() függvényekkel — ez a PanelLakó elemzőmotor alapja is.',
    url: 'https://postgis.net',
  },
];

export default function GtfsAdatokBudapestPage() {
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
          <span className="font-medium text-slate-600">GTFS Adatok Budapest</span>
        </nav>

        {/* Hero */}
        <div className="mb-14">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <Database size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            GTFS adatok Budapest — a BKK Futár open data
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            A Budapesti Közlekedési Központ (BKK) a teljes menetrendi adatbázisát nyílt formátumban,
            ingyenesen elérhetővé teszi fejlesztők és kutatók számára. Ez az útmutató elmagyarázza,
            hogy pontosan mit tartalmaz a GTFS-csomag, hogyan frissül, és milyen elemzési lehetőségeket
            kínál — különös tekintettel a megállóelérhetőségi vizsgálatokra.
          </p>
        </div>

        {/* Mi az a GTFS formátum */}
        <section className="mb-16">
          <h2 className="mb-3 text-2xl font-black text-slate-900">Mi az a GTFS formátum?</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            A <strong>General Transit Feed Specification (GTFS)</strong> egy nyílt adatcsere-szabvány, amelyet
            originally 2005-ben a Google és a TriMet (Portland, Oregon) közösen fejlesztett ki, és amelyet
            azóta a világ több mint 10 000 tömegközlekedési szolgáltatója adoptált. A formátum lényege, hogy
            a menetrendi adatokat egymással összefüggő, CSV-alapú szöveges fájlokban tárolja, amelyek egyetlen
            .zip-archívumba csomagolva tölthetők le.
          </p>
          <p className="mb-5 leading-relaxed text-slate-500">
            A GTFS-t ma az IETF-hez hasonló szervezeti formában a MobilityData nonprofit gondozza és tartja
            karban: az adatspecifikáció nyilvánosan elérhető, javaslatok bárki által benyújthatók. A formátum
            két fő ága a <strong>GTFS Static</strong> (tervezett menetrendek és megállók) és a
            <strong> GTFS-RT</strong> (Realtime: valós idejű járatpozíciók, késések, vészleállások).
            A PanelLakó elemzőmotor jelenleg a statikus adatvariánst használja az elérhetőségi számításokhoz.
          </p>
          <p className="leading-relaxed text-slate-500">
            A GTFS előnye más exportformátumokhoz képest (pl. NeTEx, TransXChange) az egyszerűsége és az
            eszköktámogatás szélessége: a legtöbb GIS-program, utazástervező könyvtár és adatplatform
            natívan kezeli, ami jelentősen csökkenti a feldolgozáshoz szükséges fejlesztési erőforrásokat.
          </p>
        </section>

        {/* A BKK GTFS fájlstruktúra */}
        <section className="mb-16">
          <h2 className="mb-3 text-2xl font-black text-slate-900">A BKK Futár GTFS adatok tartalma</h2>
          <p className="mb-7 leading-relaxed text-slate-500">
            A BKK által közzétett GTFS-csomag a teljes budapesti és agglomerációs menetrendet tartalmazza,
            beleértve a metró-, villamos-, HÉV-, busz-, trolibusz- és hajójáratokat. Az alábbi táblázat
            összefoglalja a csomag legfontosabb fájljait, azok tartalmát és nagyságrendjét.
          </p>
          <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Fájl</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Tartalom</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Méret (kb.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {GTFS_FILES.map((gf) => (
                  <tr key={gf.file} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <code className="rounded bg-brand-50 px-1.5 py-0.5 text-xs font-mono text-brand-700">
                        {gf.file}
                      </code>
                    </td>
                    <td className="px-4 py-3 leading-relaxed text-slate-600">{gf.desc}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      <span className="block">{gf.rows}</span>
                      <span className="text-xs text-slate-400">{gf.cols}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            A fenti sorszámok hozzávetőlegesek és menetrend-váltásonként változhatnak. A stop_times.txt
            messze a legnagyobb fájl — nyers állapotban tipikusan 150–300 MB, ezért hatékony feldolgozáshoz
            streaming-olvasás vagy adatbázis-import ajánlott.
          </p>
        </section>

        {/* Hogyan frissülnek */}
        <section className="mb-16">
          <h2 className="mb-3 text-2xl font-black text-slate-900">Hogyan frissülnek az adatok?</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            A BKK kétféle menetrend-váltást alkalmaz: a <strong>nagy menetrend-váltás</strong> jellemzően
            júniusban és decemberben zajlik, amikor a vonalak, megállók és menetrendek lényegesen megváltozhatnak.
            A <strong>kis menetrend-módosítások</strong> ettől függetlenül is előfordulnak — pl. útlezárás
            miatti ideiglenes átterelés, ünnepnapi menetrend-kiegészítés vagy új megálló aktiválása esetén.
          </p>
          <p className="mb-5 leading-relaxed text-slate-500">
            A statikus GTFS-csomag a developer.bkk.hu portálon rendszeres időközönként, jellemzően hetente
            frissül, de lényeges módosítás esetén soron kívüli frissítés is előfordulhat. A csomag verziókövetése
            a feed_info.txt fájlban rögzített <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono">feed_version</code> dátummező
            alapján végezhető.
          </p>
          <div className="flex items-start gap-4 rounded-2xl border border-brand-100 bg-brand-50 p-5">
            <RefreshCw size={20} className="mt-0.5 shrink-0 text-brand-600" />
            <div>
              <p className="mb-1 font-bold text-slate-900">GTFS-RT: valós idejű kiegészítés</p>
              <p className="text-sm leading-relaxed text-slate-600">
                A BKK Futár API valós idejű járatpozíciókat (VehiclePositions), tervezett menetrend-eltéréseket
                (TripUpdates) és szolgáltatási figyelmeztetéseket (ServiceAlerts) közöl GTFS-RT formátumban,
                Protocol Buffers bináris kódolással. Ezek az adatfolyamok API-kulccsal érhetők el a developer.bkk.hu
                portálon, és a statikus GTFS-sel kombinálva valós idejű késés-előrejelzések és élő térképek
                építhetők belőlük.
              </p>
            </div>
          </div>
        </section>

        {/* Mit lehet elemezni */}
        <section className="mb-16">
          <h2 className="mb-3 text-2xl font-black text-slate-900">Mit lehet elemezni GTFS-ből?</h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            A GTFS statikus adatcsomag rendkívül gazdag elemzési lehetőségeket nyújt. Az alábbiakban
            összefoglaljuk a leggyakoribb felhasználási területeket:
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <MapPin className="mb-3 text-brand-600" size={20} />
              <p className="mb-1.5 font-bold text-slate-900">Megállóelérhetőség és lefedettség</p>
              <p className="text-sm leading-relaxed text-slate-500">
                Bármely ponthoz kiszámítható, hogy 400–800 méteres körzetben hány és milyen típusú megálló
                érhető el. Ez az alapja a PanelLakó épületszintű közlekedési pontszámának.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <Clock className="mb-3 text-brand-600" size={20} />
              <p className="mb-1.5 font-bold text-slate-900">Frekvencia és kapacitásbecslés</p>
              <p className="text-sm leading-relaxed text-slate-500">
                A stop_times.txt alapján kiszámítható, hogy egy adott megállón naponta hány járat halad át,
                és ebből becsülhető az átlagos várakozási idő csúcs- és völgyidőszakban egyaránt.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <BarChart2 className="mb-3 text-brand-600" size={20} />
              <p className="mb-1.5 font-bold text-slate-900">Utazási idők és átszállások</p>
              <p className="text-sm leading-relaxed text-slate-500">
                A trips.txt és stop_times.txt kombinálásával felépíthető egy tranzit-gráf, amelyen Dijkstra
                vagy raptor algoritmussal kiszámítható az optimális útvonal és menetidő bármely A→B relációra.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <Map className="mb-3 text-brand-600" size={20} />
              <p className="mb-1.5 font-bold text-slate-900">Isokrón-térképek</p>
              <p className="text-sm leading-relaxed text-slate-500">
                Egy adott pontból meghatározott idő (pl. 30 perc) alatt elérhető területek lefedő poligonjai
                tömegközlekedéssel, amelyek megmutatják az elérhetőségi egyenlőtlenségeket a városon belül.
              </p>
            </div>
          </div>
        </section>

        {/* Letöltés */}
        <section className="mb-16">
          <h2 className="mb-3 text-2xl font-black text-slate-900">Hogyan tölthetők le a BKK GTFS adatok?</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            A BKK GTFS adatcsomag a <strong>developer.bkk.hu</strong> fejlesztői portálon érhető el, ahol
            a letöltési linkek és az API-dokumentáció is megtalálható. A regisztráció ingyenes; egyes
            valós idejű GTFS-RT végpontok API-kulcsot igényelnek, amelyek a portálon igényelhetők.
          </p>
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Download size={18} className="text-brand-600" />
              <p className="font-bold text-slate-900">Licenc és felhasználási feltételek</p>
            </div>
            <ul className="space-y-2 text-sm leading-relaxed text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="mt-0.5 shrink-0 text-brand-500" />
                <span><strong>Licenc:</strong> Creative Commons Attribution 4.0 International (CC BY 4.0)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="mt-0.5 shrink-0 text-brand-500" />
                <span><strong>Ingyenes felhasználás:</strong> kereskedelmi és nem kereskedelmi projektek egyaránt</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="mt-0.5 shrink-0 text-brand-500" />
                <span><strong>Kötelező jelölés:</strong> "Az adatok forrása: BKK Futár / BKK Zrt." szöveg megjelenítése</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="mt-0.5 shrink-0 text-brand-500" />
                <span><strong>Frissítési ciklus:</strong> jellemzően heti, nagy menetrend-váltásnál (jún./dec.) új főverzió</span>
              </li>
            </ul>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            Figyeljen rá, hogy a GTFS-csomag letöltési URL-je menetrend-váltáskor megváltozhat. Automatizált
            letöltéshez érdemes a developer.bkk.hu feed info végpontját lekérdezni a mindenkori aktuális URL-ért.
          </p>
        </section>

        {/* Feldolgozó eszközök */}
        <section className="mb-16">
          <h2 className="mb-3 text-2xl font-black text-slate-900">Milyen eszközökkel dolgozhatók fel?</h2>
          <p className="mb-7 leading-relaxed text-slate-500">
            A GTFS-fájlok feldolgozásához számos ingyenes, nyílt forráskódú eszköz áll rendelkezésre.
            Az alábbiak a leggyakrabban alkalmazott megoldások:
          </p>
          <div className="space-y-4">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.name}
                  className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="mb-1 font-bold text-slate-900">{tool.name}</p>
                    <p className="text-sm leading-relaxed text-slate-500">{tool.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <FileText size={18} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-sm leading-relaxed text-amber-800">
                <strong>Tipp a stop_times.txt kezeléséhez:</strong> Budapest GTFS-csomagjában a stop_times.txt
                tipikusan 150–300 MB, ami memóriában egyszerre nem feltétlenül dolgozható fel. Python esetén
                a <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">pandas.read_csv(..., chunksize=50000)</code> iteratív
                beolvasást, PostgreSQL esetén a <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">COPY</code> parancsot ajánljuk.
              </p>
            </div>
          </div>
        </section>

        {/* A PanelLakó elemzőmotor */}
        <section className="mb-16">
          <h2 className="mb-3 text-2xl font-black text-slate-900">A PanelLakó elemzőmotor</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            A PanelLakó backend automatikusan letölti és feldolgozza a BKK GTFS-csomag frissítéseit.
            Az adatokat PostgreSQL/PostGIS adatbázisban tároljuk, ahol a megállók geometriájára
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono"> GIST</code>-index
            épül. Egy épület közlekedési elérhetőségének lekérdezése ezáltal milliszekundumos válaszidőn
            belül elvégezhető a <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono">ST_DWithin()</code> térbeli
            függvénnyel.
          </p>
          <p className="mb-7 leading-relaxed text-slate-500">
            A lekérdezés eredménye nemcsak a megállók számát, hanem típusonkénti bontásukat (metró, villamos,
            HÉV, busz, trolibusz) és a GTFS trip_count alapján becsült napi frekvenciájukat is visszaadja.
            Ezekből az adatokból épülnek fel a PanelLakó közlekedési kártyák és a 15 perces város pontszám.
          </p>
          <Link
            href="/elemzes/budapest-kozlekedes"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-brand-200 transition-all hover:bg-brand-700"
          >
            <Map size={16} />
            Interaktív térkép megnyitása
            <ArrowRight size={14} />
          </Link>
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
