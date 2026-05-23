import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Calculator,
  CheckCircle,
  ChevronRight,
  TrendingDown,
  FileSpreadsheet,
  Bell,
  Gauge,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Közös Költség Nyilvántartás — PanelLakó',
  description:
    'Átlátható közös költség kezelés: tételek nyilvántartása, hátralékosok listája, fizetési felszólítások, éves elszámolás exportálása, al-mérőóra leolvasás kezelése.',
  alternates: { canonical: 'https://panellako.hu/funkciok/kozos-koltseg' },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Főoldal', item: 'https://panellako.hu' },
    { '@type': 'ListItem', position: 2, name: 'Funkciók', item: 'https://panellako.hu/funkciok' },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Közös Költség Nyilvántartás',
      item: 'https://panellako.hu/funkciok/kozos-koltseg',
    },
  ],
};

const COST_ITEMS = [
  'Épületbiztosítási díj',
  'Takarítás, portaszolgálat',
  'Lift karbantartás és szerviz',
  'Közös területi rezsiköltségek',
  'Felújítási alap befizetések',
  'Szemétszállítás',
  'Közös vízóra elszámolás',
  'Rendkívüli befizetések (rongálás, sürgős javítás)',
];

const FEATURES = [
  {
    icon: TrendingDown,
    title: 'Hátralékosok nyilvántartása',
    description:
      'A rendszer automatikusan nyilvántartja, ki, mennyit és mióta nem fizetett. Egy pillantásra látható az összes hátralékos és a hátralék összege — nincs szükség kézi Excel-táblázatra.',
  },
  {
    icon: Bell,
    title: 'Automatikus fizetési felszólítások',
    description:
      'Beállítható, hogy a rendszer automatikusan felszólítást küldjön a hátralékosoknak — e-mailben, a lejárat utáni meghatározott napon. Ez csökkenti az elmaradt befizetések arányát és tehermentesíti a közös képviselőt.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Éves elszámolás és export',
    description:
      'Az éves elszámolás egy gombnyomással generálható és letölthető könyvelési formátumban. Az export tartalmazza a tételeket, a befizetéseket, a hátralékokat és a felújítási alap egyenlegét.',
  },
  {
    icon: Gauge,
    title: 'Al-mérőóra leolvasás kezelése',
    description:
      'A lakásonkénti al-mérőóra (víz, fűtés, gáz) leolvasásait közvetlenül a rendszerbe rögzítheti. Az egyéni fogyasztás alapján a díjszámítás automatikusan elvégzi az allokációt, a kiegyenlítő tételek is kezelhetők.',
  },
];

export default function KozosKoltsegPage() {
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
          <Link href="/" className="hover:text-slate-600">Főoldal</Link>
          <ChevronRight size={14} />
          <Link href="/funkciok" className="hover:text-slate-600">Funkciók</Link>
          <ChevronRight size={14} />
          <span className="text-slate-600 font-medium">Közös költség</span>
        </nav>

        {/* Hero */}
        <div className="mb-12 animate-fade-in-up">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
            <Calculator size={24} className="text-emerald-500" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Közös költség — átlátható pénzügyek
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-500">
            A közös költség kezelése az egyik legtöbb vitát kiváltó terület a társasházi életben. A
            PanelLakó pénzügyi modulja tételesen, átláthatóan nyilvántartja a befizetéseket és a
            hátralékokat, automatizálja a felszólítókat, és egy gombnyomásra generál könyvelői exportot.
          </p>
        </div>

        {/* Content */}
        <section className="mb-12 space-y-6 text-slate-600">
          <h2 className="text-2xl font-black text-slate-900">Miért okoz problémát a hagyományos közös költség kezelés?</h2>
          <p className="leading-relaxed">
            A legtöbb közös képviselő ma is Excel-táblázatban vagy papír alapon tartja nyilván a közös
            költség befizetéseket. Ez a módszer lassú, hibalehetőségekkel teli és nehezen ellenőrizhető.
            Ha egy lakó vitatja, hogy fizetett-e egy adott hónapban, a bizonyítás rendkívül nehézkes.
            Ha a könyvelő negyedévente kéri az adatokat, azokat manuálisan kell összeállítani.
          </p>
          <p className="leading-relaxed">
            Ráadásul a hátralékosok nyomon követése — ki mennyivel tartozik, mióta, és kapott-e már
            felszólítást — sok képviselőnek állandó fejfájást okoz. A késő befizetések közvetlen
            hatással vannak a társasház likvitására: ha nem folynak be időben a díjak, a közös
            számlán nem lesz fedezet a tervezett karbantartásokra.
          </p>

          <h2 className="text-2xl font-black text-slate-900 pt-4">Tételek és felosztási kulcsok</h2>
          <p className="leading-relaxed">
            A közös költség nem egyetlen összeg — számos tételből áll, amelyek felosztása lakásonként
            eltérő lehet. Egyes tételeket alapterület arányában, másokat tulajdoni hányad alapján, vagy
            éppen egyenlő arányban kell felosztani. A PanelLakó rendszerében minden tételhez
            külön felosztási kulcs rendelhető, a díjszámítás automatikus, és a lakók láthatják,
            melyik tételből mennyit fizetnek.
          </p>
          <p className="leading-relaxed">
            Az átláthatóság nemcsak kényelmi kérdés — a társasháztörvény előírja, hogy a lakók
            számára a pénzügyek ellenőrizhetők legyenek. Ha a számvizsgáló bizottság éves ellenőrzést
            tart, vagy egy lakó kérdőjelezi meg a díjazást, az összes adat azonnal rendelkezésre áll.
          </p>

          <h2 className="text-2xl font-black text-slate-900 pt-4">Hátralékosok és behajtás</h2>
          <p className="leading-relaxed">
            A hátralékos kezelés az egyik legérzékenyebb területe a közös képviselői munkának. A PanelLakó
            hátralékkezelő modulja egyértelműen mutatja, ki mennyivel és mióta tartozik. Az automatikus
            felszólítók beállíthatók úgy, hogy az első fizetési határidő után X nappal automatikusan
            e-mail értesítést küldjenek — emberi beavatkozás nélkül.
          </p>
          <p className="leading-relaxed">
            Ha az elmaradt összeget jogi úton kell behajtani, a rendszerből egyetlen exporttal
            kinyerhető minden szükséges dokumentáció: a befizetési előzmények, az elmaradt összegek
            időbeli bontása, és a kiküldött felszólítók listája.
          </p>

          <h2 className="text-2xl font-black text-slate-900 pt-4">Al-mérőóra leolvasás és elszámolás</h2>
          <p className="leading-relaxed">
            Sok társasházban a főmérő fogyasztását lakásonkénti al-mérőórák alapján kell felosztani.
            Ezt korábban papíron vagy táblázatban végezték, majd manuálisan számolták ki az egyéni
            fogyasztást és a kiegyenlítő tételeket. A PanelLakó rendszerében az al-mérőóra leolvasásokat
            közvetlenül digitálisan rögzíti a képviselő (vagy a lakók maguk), és a rendszer automatikusan
            elvégzi a díjallokációt — beleértve a pozitív és negatív kiegyenlítőket is.
          </p>

          <h2 className="text-2xl font-black text-slate-900 pt-4">Könyvelőknek: export és integráció</h2>
          <p className="leading-relaxed">
            A PanelLakó az éves elszámolást és a havi pénzügyi adatokat könyvelési szoftverekkel
            kompatibilis formátumban (CSV, Excel) exportálja. Ez lehetővé teszi, hogy a könyvelő
            közvetlenül átvehesse az adatokat anélkül, hogy azokat kézzel kellene átvezetni.
            Az átadás gyors, hibamentes és auditálható.
          </p>
        </section>

        {/* Cost items */}
        <section className="mb-12 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-8">
          <h2 className="mb-5 text-xl font-black text-slate-900">Tipikus közös költség tételek</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {COST_ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Feature grid */}
        <section className="mb-12 grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <Icon size={20} className="text-emerald-600" />
                </div>
                <p className="mb-1.5 font-bold text-slate-900">{f.title}</p>
                <p className="text-sm leading-relaxed text-slate-500">{f.description}</p>
              </div>
            );
          })}
        </section>

        {/* Stats row */}
        <section className="mb-12 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center">
            <p className="text-3xl font-black text-brand-600">–40%</p>
            <p className="mt-1 text-sm text-slate-500">Kevesebb késő befizetés automatikus felszólítókkal</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center">
            <p className="text-3xl font-black text-brand-600">1 kattintás</p>
            <p className="mt-1 text-sm text-slate-500">Éves elszámolás export könyvelési formátumban</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center">
            <p className="text-3xl font-black text-brand-600">100%</p>
            <p className="mt-1 text-sm text-slate-500">Átlátható tételes nyilvántartás minden befizetésről</p>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-card-md">
          <h2 className="mb-2 text-2xl font-black text-white">
            Tegye átláthatóvá a pénzügyeket
          </h2>
          <p className="mb-6 text-brand-100">
            14 napos ingyenes próba. Töltse fel a közös költség tételeit, és lássa az azonnali különbséget.
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
