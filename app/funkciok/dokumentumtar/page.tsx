import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FolderOpen,
  FileText,
  ShieldCheck,
  Search,
  Lock,
  CheckCircle,
  ChevronRight,
  ArrowRight,
  History,
  Users,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Digitális Dokumentumtár — PanelLakó',
  description:
    'Tárolja biztonságosan a társasházi iratokat: SZMSZ, közgyűlési jegyzőkönyvek, számlák, szerződések. GDPR-megfelelő, kereshető, jogosultság-kezelt dokumentumtár.',
  alternates: { canonical: 'https://panellako.hu/funkciok/dokumentumtar' },
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
      name: 'Digitális Dokumentumtár',
      item: 'https://panellako.hu/funkciok/dokumentumtar',
    },
  ],
};

const DOC_TYPES = [
  { icon: FileText, label: 'Szervezeti és Működési Szabályzat (SZMSZ)' },
  { icon: FileText, label: 'Közgyűlési meghívók és napirendi pontok' },
  { icon: FileText, label: 'Közgyűlési jegyzőkönyvek és határozatok' },
  { icon: FileText, label: 'Éves pénzügyi elszámolások és mérlegek' },
  { icon: FileText, label: 'Karbantartási és felújítási szerződések' },
  { icon: FileText, label: 'Közüzemi számlák és számlamellékletek' },
  { icon: FileText, label: 'Biztosítási kötvények és káresemény-dokumentumok' },
  { icon: FileText, label: 'Hatósági engedélyek és épülettervek' },
];

const FEATURES = [
  {
    icon: Lock,
    title: 'Jogosultság-kezelés',
    description:
      'Pontosan meghatározható, melyik lakó vagy bérlő milyen dokumentumokhoz férhet hozzá. A pénzügyi iratok például csak a közös képviselőnek láthatók, míg a közgyűlési határozatok mindenki számára elérhetők.',
  },
  {
    icon: History,
    title: 'Verziókövetés',
    description:
      'Minden dokumentum módosításánál automatikusan megőrzi a rendszer a korábbi verziót is. Így bármikor visszaállítható egy korábbi állapot, és nyomon követhető, ki, mikor és mit változtatott.',
  },
  {
    icon: Search,
    title: 'Teljes szöveges keresés',
    description:
      'Akár több évre visszamenőleg is azonnal megtalálható bármely irat. A keresés névvel, dátummal, típussal vagy kulcsszóval is működik — nincs több órákon át tartó iratkeresés.',
  },
  {
    icon: ShieldCheck,
    title: 'GDPR megfelelés',
    description:
      'A rendszer a magyar és az európai uniós adatvédelmi szabályoknak megfelelően kezeli a személyes adatokat. Minden hozzáférés naplózva van, az adatok titkosítva tárolódnak szerver oldalon.',
  },
];

export default function DokumentumtarPage() {
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
          <span className="text-slate-600 font-medium">Dokumentumtár</span>
        </nav>

        {/* Hero */}
        <div className="mb-12 animate-fade-in-up">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
            <FolderOpen size={24} className="text-blue-500" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Dokumentumtár — minden irat egy helyen
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-500">
            A legtöbb társasházban az iratok szétszórva találhatók: néhány papíralapú mappában, néhány e-mailben,
            pendrive-on vagy a közös képviselő személyi számítógépén. Ez megnehezíti a hozzáférést, kockázatot
            jelent az adatvédelmi megfelelés szempontjából, és komoly gondot okozhat képviselőváltáskor. A
            PanelLakó dokumentumtára ezt a problémát egyszer és mindenkorra megoldja.
          </p>
        </div>

        {/* Content */}
        <section className="mb-12 space-y-6 text-slate-600">
          <h2 className="text-2xl font-black text-slate-900">Miért kritikus a rendezett iratkezelés?</h2>
          <p className="leading-relaxed">
            A társasháztörvény (2003. évi CXXXIII. tv.) kötelezi a közös képviselőt a közösség iratainak
            megőrzésére és a lakók számára való hozzáférhetővé tételére. Ha egy lakó kikéri az SZMSZ-t vagy
            egy korábbi közgyűlési határozatot, azt a képviselőnek rendelkezésre kell bocsátania. A papíralapú
            vagy szétszórt digitális dokumentumkezelés esetén ez időigényes, olykor lehetetlen feladat.
          </p>
          <p className="leading-relaxed">
            A digitális dokumentumtár biztosítja, hogy minden irat azonnal, bármelyik jogosult fél számára
            elérhető legyen — akár éjjel is, akár mobilról. Képviselőváltáskor az összes irat automatikusan
            átadható az új képviselőnek, a történeti dokumentumok és a korábbi határozatok teljes
            egészében megmaradnak.
          </p>

          <h2 className="text-2xl font-black text-slate-900 pt-4">Hozzáférés-kezelés: ki láthat mit?</h2>
          <p className="leading-relaxed">
            Nem minden irat szól mindenkinek. A pénzügyi riportok és a könyvelési anyagok például általában
            csak a közös képviselő és a számvizsgáló bizottság tagjai számára hozzáférhetők, míg a közgyűlési
            határozatok és az SZMSZ az összes tulajdonos számára nyilvánosan megtekinthető.
          </p>
          <p className="leading-relaxed">
            A PanelLakó dokumentumtárában dokumentumtípusonként és akár egyedi dokumentumonként is
            beállítható a láthatóság: mindenki, csak képviselők, csak meghatározott lakók, vagy akár
            külső könyvelő is kaphat korlátozott olvasási jogot anélkül, hogy a teljes rendszerhez
            hozzáférne. Ez nemcsak kényelmes, hanem GDPR szempontból is kifejezetten helyes megközelítés.
          </p>

          <h2 className="text-2xl font-black text-slate-900 pt-4">Verziókövetés és auditnyomvonal</h2>
          <p className="leading-relaxed">
            Az SZMSZ vagy a házirend módosításakor kritikus, hogy az összes korábbi verzió megmaradjon.
            A PanelLakó rendszere automatikusan archiválja a dokumentumok korábbi változatait — így mindig
            visszaállítható, hogy egy adott időpontban milyen szabály volt érvényben. Az auditnapló rögzíti,
            ki mikor töltötte fel, módosította vagy tekintette meg az egyes iratokat.
          </p>

          <h2 className="text-2xl font-black text-slate-900 pt-4">GDPR megfelelés és adatbiztonság</h2>
          <p className="leading-relaxed">
            A társasházi iratok számos személyes adatot tartalmaznak: tulajdonosok nevét, lakcímét,
            fizetési adatait. Az Általános Adatvédelmi Rendelet (GDPR) előírja ezek biztonságos kezelését,
            a hozzáférések naplózását és az adatok meghatározott ideig való megőrzését (majd törlését).
            A PanelLakó titkosított adattárolással, hozzáférés-naplózással és automatikus adatmegőrzési
            politikával biztosítja a megfelelést — a közös képviselőnek nem kell adatvédelmi szakértőnek lennie.
          </p>
        </section>

        {/* Document types */}
        <section className="mb-12 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-8">
          <h2 className="mb-6 text-xl font-black text-slate-900">Milyen dokumentumokat tárolhat?</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {DOC_TYPES.map((doc) => (
              <li key={doc.label} className="flex items-start gap-2.5 text-sm text-slate-600">
                <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
                <span>{doc.label}</span>
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
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                  <Icon size={20} className="text-brand-600" />
                </div>
                <p className="mb-1.5 font-bold text-slate-900">{f.title}</p>
                <p className="text-sm leading-relaxed text-slate-500">{f.description}</p>
              </div>
            );
          })}
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-card-md">
          <h2 className="mb-2 text-2xl font-black text-white">
            Rendezze át az iratkezelést
          </h2>
          <p className="mb-6 text-brand-100">
            14 napos ingyenes próba, kártyaadatok nélkül. Töltse fel az első dokumentumokat, és lássa meg a különbséget.
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
