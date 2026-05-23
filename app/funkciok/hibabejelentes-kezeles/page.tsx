import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  ChevronRight,
  Bell,
  UserCheck,
  ClipboardList,
  ArrowRight,
  Wrench,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Hibabejelentés és feladatkezelés — PanelLakó',
  description:
    'Digitális hibabejelentés társasházaknak: fotóval, státuszkövetéssel, mester-hozzárendeléssel. A PanelLakó rendszerében minden javítás dokumentált és nyomon követhető.',
  alternates: { canonical: 'https://panellako.hu/funkciok/hibabejelentes-kezeles' },
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
      name: 'Hibabejelentés és feladatkezelés',
      item: 'https://panellako.hu/funkciok/hibabejelentes-kezeles',
    },
  ],
};

const STEPS = [
  {
    number: '1',
    title: 'Lakó bejelenti a hibát',
    description:
      'A lakó okostelefonjáról vagy böngészőből megnyitja a bejelentő felületet, kiválasztja a hiba típusát (pl. tetőszivárgás, liftmeghibásodás, közös területi kár), leírja a problémát és opcionálisan fényképet is csatol.',
  },
  {
    number: '2',
    title: 'A közös képviselő értesítést kap',
    description:
      'A rendszer azonnal e-mail és push értesítést küld a közös képviselőnek. Az értesítésben szerepel a hiba kategóriája, leírása, a bejelentő neve és az esetleges fotók. Nincs telefonálgatás, nincs elveszett cetli.',
  },
  {
    number: '3',
    title: 'Mester hozzárendelése és státuszfrissítés',
    description:
      'A képviselő hozzárendeli a feladatot a megfelelő karbantartóhoz vagy külső mesterhez, beállítja a határidőt és frissíti a státuszt (Folyamatban, Ütemezett, Megoldva). A lakó minden státuszváltozásról értesítést kap.',
  },
  {
    number: '4',
    title: 'Lezárás és dokumentálás',
    description:
      'A javítás elvégzése után a feladat lezárásra kerül. A teljes folyamat — a bejelentéstől a megoldásig — naplózva marad, így bármikor visszakereshető. Ez védi a közös képviselőt és a lakóközösséget egyaránt jogvita esetén.',
  },
];

const BENEFITS = [
  'Nincs elveszett bejelentés — minden digitálisan dokumentált',
  'A lakó látja, mikor kerül sor a javításra — kevesebb panasz',
  'A közös képviselő áttekintő listában látja az összes nyitott feladatot',
  'Fotós dokumentáció megvédi a közösséget vitás esetekben',
  'Az elvégzett javítások archívuma segít az éves tervek elkészítésében',
];

const ISSUE_TYPES = [
  'Tetőszivárgás, csapadékvíz-elvezetési problémák',
  'Liftmeghibásodás és karbantartási igények',
  'Közös területi károk (lépcső, folyosó, garázskapu)',
  'Fűtés- és melegvíz-rendszer hibák',
  'Elektromos hibák (közös világítás, kaputelefon)',
  'Vízvezeték-hibák és szivárgások',
  'Szeméttároló és parkoló problémák',
  'Kertészeti és zöldterületi igények',
];

export default function HibabejelentesPage() {
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
          <span className="text-slate-600 font-medium">Hibabejelentés</span>
        </nav>

        {/* Hero */}
        <div className="mb-12 animate-fade-in-up">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
            <AlertTriangle size={24} className="text-amber-500" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Hibabejelentés és feladatkezelés digitálisan
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-500">
            A társasházi hibabejelentés és javíttatás legfőbb problémája a szétszórt kommunikáció — telefonhívások,
            cetlik, e-mailek, amelyek könnyen elvesznek. A PanelLakó rendszerében minden bejelentés egy helyen
            landol, státuszkövetéssel, fotós dokumentációval és mester-hozzárendeléssel.
          </p>
        </div>

        {/* Content */}
        <section className="prose prose-slate max-w-none mb-12">
          <h2 className="text-2xl font-black text-slate-900 mb-4">Miért fontos a digitális hibabejelentés?</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Egy átlagos magyarországi társasházban évente több tucat hibabejelentés érkezik. A lakók telefonon
            hívják a közös képviselőt, vagy papírra írják a problémát — ezek a bejelentések könnyen elvesznek,
            és a státuszukról senki nem kap visszajelzést. Ez frusztrációhoz vezet mind a lakók, mind a képviselő
            részéről: a lakók nem tudják, foglalkoznak-e a gondjukkal, a képviselő pedig folyamatos emlékeztető
            telefonhívásokkal szembesül.
          </p>
          <p className="text-slate-600 leading-relaxed mb-4">
            A PanelLakó digitális hibabejelentő rendszere ezt a folyamatot teljesen átalakítja. Minden bejelentés
            egyből bekerül egy központi feladatlistába, ahol a közös képviselő áttekintheti, priorizálhatja és
            kezelheti őket. A bejelentésekhez fotók csatolhatók, amelyek egyértelműen dokumentálják a problémát
            — ez különösen fontos jogviták vagy biztosítási igények esetén.
          </p>

          <h2 className="text-2xl font-black text-slate-900 mt-8 mb-4">Milyen típusú hibák kezelhetők?</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            A rendszer rugalmas kategóriarendszert használ, amely lefedi a társasházi élet összes tipikus
            problémáját. A bejelentések kategorizálva érkeznek, így a képviselő azonnal látja, melyik szakterületet
            érinti a feladat, és melyik mestert vagy vállalkozót kell értesítenie.
          </p>
          <ul className="space-y-2 mb-6">
            {ISSUE_TYPES.map((item) => (
              <li key={item} className="flex items-start gap-2 text-slate-600">
                <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-2xl font-black text-slate-900 mt-8 mb-4">Fotó csatolás és dokumentáció</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            A mobileszközökön készített fotók közvetlenül csatolhatók a bejelentéshez. Ez nem csupán kényelmi
            funkció — a képi dokumentáció bizonyítja a hiba fennállását, annak mértékét, és azt is, hogy a
            javítás elvégzése előtt pontosan milyen állapotban volt az érintett terület. Ez különösen fontos
            biztosítási károk bejelentésekor vagy akkor, ha a javítás elmaradása miatt jogi vita keletkezik.
          </p>

          <h2 className="text-2xl font-black text-slate-900 mt-8 mb-4">Mesterek és karbantartók hozzárendelése</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            A közös képviselő a feladatot közvetlenül hozzárendelheti a társasházzal szerződésben álló
            karbantartóhoz, vízszerelőhöz, villanyszerelőhöz vagy egyéb szakemberhez. A hozzárendelt személy
            értesítést kap a feladatról, és státuszfrissítéseket küldhet be. A lakók ezzel mindig naprakész
            információt kapnak arról, mikor számíthatnak a javításra — anélkül, hogy a képviselőt kellene hívniuk.
          </p>
        </section>

        {/* How it works */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-black text-slate-900">Hogyan működik? — 4 lépés</h2>
          <div className="space-y-4">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-sm font-black text-white shadow-card">
                  {step.number}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="mb-5 text-xl font-black text-slate-900">5 előny, amit azonnal érezni fog</h2>
          <ul className="space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-3 text-slate-600">
                <CheckCircle size={18} className="mt-0.5 shrink-0 text-brand-500" />
                <span className="text-sm leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Feature highlights */}
        <section className="mb-12 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center">
            <Camera size={22} className="mx-auto mb-2 text-brand-600" />
            <p className="text-sm font-bold text-slate-800">Fotós dokumentáció</p>
            <p className="mt-1 text-xs text-slate-500">Mobilról közvetlenül feltölthető</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center">
            <Bell size={22} className="mx-auto mb-2 text-brand-600" />
            <p className="text-sm font-bold text-slate-800">Automatikus értesítések</p>
            <p className="mt-1 text-xs text-slate-500">E-mail és push minden lépésnél</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center">
            <Wrench size={22} className="mx-auto mb-2 text-brand-600" />
            <p className="text-sm font-bold text-slate-800">Mester-hozzárendelés</p>
            <p className="mt-1 text-xs text-slate-500">Külső szakemberek is kezelhetők</p>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-card-md">
          <h2 className="mb-2 text-2xl font-black text-white">
            Próbálja ki ingyen 14 napig
          </h2>
          <p className="mb-6 text-brand-100">
            Kártyaadatok nem szükségesek. Azonnali hozzáférés a hibabejelentő rendszerhez és az összes funkcióhoz.
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
