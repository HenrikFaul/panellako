import type { Metadata } from 'next';
import type { Route } from 'next';
import Link from 'next/link';
import {
  Train,
  Bus,
  MapPin,
  Navigation,
  ChevronRight,
  ArrowRight,
  Database,
  CheckCircle,
  Map,
  TrendingUp,
  Layers,
  Clock,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Tömegközlekedés Elemzés Budapest — GTFS Adatok | PanelLakó',
  description:
    'Budapest tömegközlekedési hálózatának részletes elemzése: villamos, metró, busz, HÉV, trolibusz vonalak GTFS-adatok alapján. Megálló-sűrűség, gyaloglási lefedettség.',
  alternates: { canonical: 'https://panellako.hu/tomegkozlekedes-elemzes' },
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
  ],
};

const CLUSTER_ARTICLES = [
  {
    href: '/tomegkozlekedes-elemzes/gtfs-adatok-budapest',
    icon: Database,
    title: 'GTFS adatok Budapest — a BKK Futár open data',
    summary:
      'Mit tartalmaz a BKK menetrendi adatcsomag, hogyan frissül, és milyen elemzéseket tesz lehetővé a nyílt GTFS formátum?',
  },
  {
    href: '/tomegkozlekedes-elemzes/villamos-metro-hev-elerheto-lakoneegyedek',
    icon: Train,
    title: 'Villamos, metró és HÉV — Gyalogos Elérhetőség | PanelLakó',
    summary:
      'Melyik budapesti lakónegyedekben érhető el kötöttpályás közlekedés 420 méteren belül? Kerületi lefedettségi arányok elemzése.',
  },
];

const TRANSPORT_MODES = [
  {
    icon: Train,
    mode: 'Metró',
    lines: '4 vonal (M1–M4)',
    passengers: '~130 millió/év',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
  {
    icon: Train,
    mode: 'Villamos',
    lines: '32 vonal',
    passengers: '~175 millió/év',
    color: 'text-yellow-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  {
    icon: Train,
    mode: 'HÉV / Elővárosi vasút',
    lines: '5 vonal (H5–H9)',
    passengers: '~40 millió/év',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  {
    icon: Bus,
    mode: 'Autóbusz',
    lines: '200+ vonal',
    passengers: '~290 millió/év',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    icon: Bus,
    mode: 'Trolibusz',
    lines: '15 vonal',
    passengers: '~40 millió/év',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  {
    icon: Navigation,
    mode: 'Hajó (BKK)',
    lines: '4 vonal (D2, D11, D12, D13)',
    passengers: '~2 millió/év',
    color: 'text-brand-600',
    bg: 'bg-brand-50',
    border: 'border-brand-200',
  },
];

const KEY_FACTS = [
  {
    icon: MapPin,
    label: '3 000+',
    desc: 'megálló és állomás Budapesten és az agglomerációban',
  },
  {
    icon: Train,
    label: '200+ vonal',
    desc: 'naponta üzemelő járatvonal a BKK hálózatán',
  },
  {
    icon: Clock,
    label: '420 m',
    desc: 'az 5 perces gyaloglási zóna sugara, az elérhetőségi küszöb',
  },
  {
    icon: TrendingUp,
    label: '~680 M utas/év',
    desc: 'összesített éves utasszám Budapest közösségi közlekedésén',
  },
];

export default function TomegkozlekedesesElemzesPillarPage() {
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
          <span className="font-medium text-slate-600">Tömegközlekedés Elemzés</span>
        </nav>

        {/* Hero */}
        <div className="mb-14">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <Train size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Budapest tömegközlekedésének elemzése — GTFS adatok és interaktív térkép
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            Budapest Európa egyik legsűrűbb tömegközlekedési hálózatával rendelkezik: több mint 200 vonal,
            3 000-nél is több megálló és állomás fedi le a várost és az agglomerációt. A BKK Futár nyílt
            GTFS-adatai lehetővé teszik, hogy bármely épület közlekedési elérhetőségét pontosan mérjük —
            kerületi szinten, megállótípusonként és menetrendi frekvenciánként bontva. Ez az útmutató
            összefoglalja a módszertant, az adatforrásokat és azt, hogyan segít a PanelLakó elemzőeszköze
            a lakásválasztásban.
          </p>
        </div>

        {/* Key facts */}
        <div className="mb-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {KEY_FACTS.map((fact) => {
            const Icon = fact.icon;
            return (
              <div
                key={fact.label}
                className="flex flex-col items-start rounded-2xl border border-slate-100 bg-slate-50 p-5"
              >
                <Icon size={20} className="mb-3 text-brand-600" />
                <p className="text-2xl font-black text-slate-900">{fact.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{fact.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Article cards */}
        <section className="mb-16">
          <h2 className="mb-2 text-2xl font-black text-slate-900">Mélyebb elemzések</h2>
          <p className="mb-7 text-slate-500">
            Merüljön el a tömegközlekedési adatok egy-egy részletesebb aspektusában.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {CLUSTER_ARTICLES.map((article) => {
              const Icon = article.icon;
              return (
                <Link
                  key={article.href}
                  href={article.href as Route}
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

        {/* Mi az a GTFS */}
        <section className="mb-16">
          <h2 className="mb-3 text-2xl font-black text-slate-900">Mi az a GTFS és miért hasznos?</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            A <strong>General Transit Feed Specification (GTFS)</strong> egy Google által kidolgozott, globálisan
            elfogadott nyílt adatformátum, amelyet ma már a világ több száz közlekedési szolgáltatója használ.
            A formátum lényege, hogy a menetrendi, megállóhelyi és útvonali adatokat egységes, géppel olvasható
            CSV-fájlokban tárolja. Ez teszi lehetővé, hogy a Google Maps, az Apple Maps, a Moovit és a hasonló
            applikációk naprakészen megjeleníthetik a helyi közlekedési információkat.
          </p>
          <p className="mb-5 leading-relaxed text-slate-500">
            A GTFS statikus csomag tipikusan a következő fájlokat tartalmazza: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono">stops.txt</code> (megállók koordinátái és
            nevei), <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono">routes.txt</code> (vonalak és típusaik),{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono">trips.txt</code> (konkrét járatok menetrend-napokhoz rendelve),{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono">stop_times.txt</code> (érkezési és indulási idők
            megállónként), <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono">shapes.txt</code> (vonalak GPS-nyomvonala)
            és <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono">calendar.txt</code> (menetrendek érvényessége). Ezekből az adatokból
            nemcsak menetrendek, hanem komplex térbeli elemzések is elvégezhetők: megállóvonzáskörzetek, átszállási gráfok,
            frekvenciatérképek és elérhetőségi izokronák egyaránt generálhatók belőlük.
          </p>
          <p className="leading-relaxed text-slate-500">
            A BKK a GTFS-adatokat a <strong>developer.bkk.hu</strong> fejlesztői portálon teszi elérhetővé
            CC BY 4.0 licenc alatt, azaz bármely felhasználó szabadon letöltheti, feldolgozhatja és publikálhatja
            azokat, feltéve hogy a forrást megfelelően jelzi. Ez az nyílt adatpolitika teszi lehetővé a PanelLakó
            elemzőmotor működését is.
          </p>
        </section>

        {/* Budapest közlekedési módjai — táblázat */}
        <section className="mb-16">
          <h2 className="mb-3 text-2xl font-black text-slate-900">Budapest tömegközlekedési módjai</h2>
          <p className="mb-7 leading-relaxed text-slate-500">
            A Budapesti Közlekedési Központ (BKK) az integrált közlekedési hatóság, amely a metró-, villamos-,
            busz-, trolibusz- és HÉV-hálózatot egy egységes menetrenddel és díjszabással üzemelteti.
            Az alábbi táblázat az egyes módok hálózati méretét és hozzávetőleges éves utasszámát foglalja össze.
          </p>
          <div className="mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Mód</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Vonalak</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Éves utasszám (kb.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {TRANSPORT_MODES.map((tm) => {
                  const Icon = tm.icon;
                  return (
                    <tr key={tm.mode} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${tm.bg}`}>
                            <Icon size={14} className={tm.color} />
                          </span>
                          <span className="font-medium text-slate-900">{tm.mode}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{tm.lines}</td>
                      <td className="px-4 py-3 text-slate-600">{tm.passengers}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-sm leading-relaxed text-slate-500">
            A legmagasabb utasszámot a buszok és a villamosok bonyolítják le, de a kötöttpályás módok
            (metró, villamos, HÉV) töltik be a hálózat gerincét: ezek gyorsabbak, nagyobb kapacitásúak
            és kevésbé érzékenyek a közúti forgalomra. Az ingatlanpiaci szempontból ezért különösen értékes
            a kötöttpályás megállók közelségének mérése.
          </p>
        </section>

        {/* A 420 méteres gyaloglási zóna */}
        <section className="mb-16">
          <h2 className="mb-3 text-2xl font-black text-slate-900">A 420 méteres gyaloglási zóna módszertana</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            A közlekedéstervezésben és a városfejlesztési kutatásokban az <strong>5 perces gyaloglási távolság</strong> az
            elfogadott standard a megálló-elérhetőség méréséhez. Átlagos gyalogossebességgel (kb. 1,4 m/s,
            azaz 5 km/h) 5 perc alatt kb. 420 métert tesz meg egy felnőtt. Ez az érték szerepel a WHO
            aktív közlekedési ajánlásaiban és az EU városi mobilitási keretrendszerében egyaránt.
          </p>
          <p className="mb-5 leading-relaxed text-slate-500">
            A PanelLakó elemzőmotor minden épületnél kiszámítja, hogy az adott épület koordinátájától
            420 méteres légvonalbeli körön belül hány és milyen típusú megálló található. Ez a megközelítés
            nem veszi figyelembe a valós gyalogos infrastruktúrát (utak, hidak, akadályok), de reprezentatív
            becslést ad az elérhetőségről. Pontosabb eredményt a menetrendi adat és az OSM gyalogos gráf
            kombinálásával lehetne elérni, amelyen a platform fejlesztési ütemtervén szerepel.
          </p>
          <div className="rounded-2xl border border-brand-100 bg-brand-50 p-6">
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="mt-0.5 shrink-0 text-brand-600" />
              <div>
                <p className="mb-1 font-bold text-slate-900">Mit mutat a 420 m-es zóna?</p>
                <ul className="space-y-1.5 text-sm leading-relaxed text-slate-600">
                  <li>• Hány megálló esik az épülettől gyaloglással elérhető körzetbe</li>
                  <li>• Milyen típusú megállók (metró, villamos, HÉV, busz, trolibusz)</li>
                  <li>• A megállók frekvenciája (napi járatszám a GTFS alapján)</li>
                  <li>• A kötöttpályás lefedettség aránya az összes elérhető megállón belül</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Megálló-sűrűség hőtérkép */}
        <section className="mb-16">
          <h2 className="mb-3 text-2xl font-black text-slate-900">Megálló-sűrűség hőtérkép</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            A megálló-sűrűség hőtérképet <strong>kernel density estimation (KDE)</strong> módszerrel állítjuk elő.
            Ez a technika minden megálló köré egy Gauss-eloszlású &quot;dombot&quot; rajzol, amelyek összege adja a
            szuperponált sűrűségfelületet. A dombok sugara (bandwidth) szabályozható paraméter; a PanelLakó
            elemzőn 300 métert alkalmazunk, ami a gyalogos elérhetőségi zónával konzisztens.
          </p>
          <p className="mb-5 leading-relaxed text-slate-500">
            A hőtérképen a sötétebb, meleg tónusú területek magas megállósűrűséget jelölnek (elsősorban
            a belváros, az I–IX. kerületek és a nagy közlekedési csomópontok körül), míg a fehér foltok
            alacsony lefedettségű területeket — <em>transit deserteket</em> — jelölnek. Ilyen fehér foltok
            leginkább a külső kerületekben (XVI., XVII., XVIII., XXII. kerület egyes részeiben) figyelhetők meg,
            ahol a kötöttpályás kapcsolat hiányzik és kizárólag buszjáratok üzemelnek.
          </p>
          <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <Layers size={20} className="mt-0.5 shrink-0 text-brand-600" />
            <p className="text-sm leading-relaxed text-slate-600">
              A KDE-réteg mellett a PanelLakó térkép külön réteget biztosít a kötöttpályás (metró, villamos, HÉV)
              és a nem kötöttpályás (busz, trolibusz) megállókra, lehetővé téve a két csoport sűrűségének
              független vizsgálatát. A rétegek ki-be kapcsolhatók az interaktív térképen.
            </p>
          </div>
        </section>

        {/* Tömegközlekedési elérhetőség és ingatlanárak */}
        <section className="mb-16">
          <h2 className="mb-3 text-2xl font-black text-slate-900">
            Tömegközlekedési elérhetőség és ingatlanárak
          </h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            Számos hazai és nemzetközi kutatás kimutatta, hogy a tömegközlekedési elérhetőség — különösen
            a kötöttpályás megállóktól való távolság — szignifikáns ingatlanár-prémiumot generál. A „transit
            premium&quot; hatás Budapesten is megfigyelhető: a metróállomástól 300 méteren belüli lakások négyzetméterre
            vetített átlagára jellemzően 8–15%-kal magasabb, mint az azonos kerületben, de 600 méternél
            távolabb lévő lakásoké, a többi tényező kontrollálása esetén.
          </p>
          <p className="mb-5 leading-relaxed text-slate-500">
            A villamos esetében ez a prémium alacsonyabb (3–6%), de mégis szignifikáns, különösen az 1-es,
            2-es, 4-es és 6-os villamos mentén. A HÉV-vonalak az agglomerációs ingatlanpiac egyik
            legfontosabb meghatározójává váltak: az Aquincumi HÉV (H5) és a Ráckevei HÉV (H6) mentén
            fekvő Budapest-közeli agglomerációs városokban az elmúlt öt évben az ingatlanárak gyorsabban
            nőttek, mint a főváros átlagától távolabb fekvő területeken.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <TrendingUp size={20} className="mb-3 text-brand-600" />
              <p className="text-lg font-black text-slate-900">+8–15%</p>
              <p className="mt-1 text-sm text-slate-500">metróállomástól 300 m-en belüli lakások ár-prémium becslése</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <TrendingUp size={20} className="mb-3 text-amber-500" />
              <p className="text-lg font-black text-slate-900">+3–6%</p>
              <p className="mt-1 text-sm text-slate-500">villamosmegállótól 300 m-en belüli lakások becsült prémium</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <TrendingUp size={20} className="mb-3 text-purple-500" />
              <p className="text-lg font-black text-slate-900">HÉV-hatás</p>
              <p className="mt-1 text-sm text-slate-500">agglomerációs kereslet növekedése az elővárosi vasút mentén</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-slate-400">
            Megjegyzés: a fenti becslések kutatási összefoglalókból és hazai ingatlanpiaci adatokból
            levont közelítő értékek, nem garancia befektetési döntésekhez.
          </p>
        </section>

        {/* Hogyan használjuk a PanelLakó eszközt */}
        <section className="mb-16">
          <h2 className="mb-3 text-2xl font-black text-slate-900">
            Hogyan használjuk a PanelLakó elemzőeszközt?
          </h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            A PanelLakó interaktív tömegközlekedési elemzője egyetlen felületen jeleníti meg Budapest összes
            GTFS-alapú megállóját, a megálló-sűrűség hőtérképet, és lehetővé teszi, hogy bármely budapesti
            épületre rákattintva megtekintsük annak 420 méteres körzeti lefedettségét.
          </p>
          <ul className="mb-6 space-y-3 text-slate-600">
            <li className="flex items-start gap-3 text-sm leading-relaxed">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong>Épület-szintű elemzés:</strong> kattintson bármelyik épületre a térképen, és azonnal
                látja a 420 méteres körzetben lévő megállók listáját típus és vonal szerint bontva.
              </span>
            </li>
            <li className="flex items-start gap-3 text-sm leading-relaxed">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong>Rétegek:</strong> kapcsolja be a hőtérkép réteget, hogy átfogóan lássa a kerületi
                lefedettségi különbségeket, majd szűrjön módra (csak metró, csak kötöttpálya stb.).
              </span>
            </li>
            <li className="flex items-start gap-3 text-sm leading-relaxed">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong>Frekvencia-szűrő:</strong> szűrjön csúcsidei és csúcsidőn kívüli frekvenciára,
                hogy lássa, milyen az adott megálló valódi hasznosíthatósága napközben és este.
              </span>
            </li>
            <li className="flex items-start gap-3 text-sm leading-relaxed">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong>Összehasonlítás:</strong> jelöljön meg két épületet, és hasonlítsa össze
                közlekedési elérhetőségüket egymás mellett a döntéstámogató nézetben.
              </span>
            </li>
          </ul>
          <Link
            href="/elemzes/budapest-kozlekedes"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-brand-200 transition-all hover:bg-brand-700"
          >
            <Map size={16} />
            Megnyitom az interaktív közlekedési térképet
            <ArrowRight size={14} />
          </Link>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
