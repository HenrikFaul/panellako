import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Vote,
  CheckCircle,
  ChevronRight,
  Scale,
  Users,
  Bell,
  BookOpen,
  FileCheck,
  CalendarDays,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Online Közgyűlés és Szavazás — PanelLakó',
  description:
    'Törvényes digitális közgyűlés a 2021. évi CXLIII. tv. alapján: elektronikus szavazás, határozatképesség, napirend, meghívók, jelenléti ív, határozatok nyilvántartása.',
  alternates: { canonical: 'https://panellako.hu/funkciok/online-kozgyules' },
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
      name: 'Online Közgyűlés és Szavazás',
      item: 'https://panellako.hu/funkciok/online-kozgyules',
    },
  ],
};

const STEPS = [
  {
    number: '1',
    title: 'Közgyűlés létrehozása és napirend összeállítása',
    description:
      'A közös képviselő létrehoz egy új közgyűlést, megadja a dátumot (vagy az online szavazási időszakot) és feltölti a napirendi pontokat. Minden napirendi ponthoz határozati javaslat és melléklet csatolható.',
  },
  {
    number: '2',
    title: 'Meghívók kiküldése',
    description:
      'A rendszer automatikusan kiküld e-mail meghívókat az összes tulajdonosnak, a törvényi határidőknek megfelelően (legalább 8 nappal a közgyűlés előtt). A meghívó tartalmazza a napirendet, az esetleges mellékleteket és a szavazási linket.',
  },
  {
    number: '3',
    title: 'Elektronikus szavazás',
    description:
      'A tulajdonosok a kapott linkre kattintva, személyazonosságuk hitelesítése után leadják szavazatukat az egyes napirendi pontokra. Igen, nem, tartózkodás lehetőségek, és az arányos szavazati erő (tulajdoni hányad) automatikusan figyelembe van véve.',
  },
  {
    number: '4',
    title: 'Határozatképesség és eredmények',
    description:
      'A rendszer valós időben számolja a részvételi arányt és a szavazatokat. Automatikusan jelzi, ha a közgyűlés határozatképes (50%+1 tulajdoni hányad részvétel), és megmutatja, melyik határozati javaslat ment át és melyik nem.',
  },
  {
    number: '5',
    title: 'Határozatok rögzítése és közzététele',
    description:
      'A közgyűlés lezárása után a rendszer automatikusan generálja a jelenléti ívet és a határozatok összesítőjét. Ezek azonnal elérhetők a dokumentumtárban, és a lakók e-mailben is megkaphatják a végeredményt.',
  },
];

const LEGAL_POINTS = [
  'A 2021. évi CXLIII. törvény lehetővé teszi az elektronikus szavazást társasházi közgyűléseken',
  'Az SZMSZ-ben rögzíteni kell az elektronikus szavazás lehetőségét',
  'A meghívókat legalább 8 nappal a közgyűlés előtt ki kell küldeni',
  'Határozatképességhez a tulajdoni hányadok több mint 50%-ának részvétele szükséges',
  'Az egyszerű többséghez a jelenlévők szavazatainak több mint 50%-a kell',
  'Minősített döntéseknél (pl. SZMSZ módosítás) az összes hányad legalább 2/3-a szükséges',
];

const FEATURES = [
  {
    icon: CalendarDays,
    title: 'Napirend kezelése',
    description: 'Napirendi pontok, határozati javaslatok és mellékletek egy helyen, áttekinthetően.',
  },
  {
    icon: Bell,
    title: 'Meghívók és értesítések',
    description: 'Automatikus e-mail meghívók törvényi határidőkkel, emlékeztetőkkel.',
  },
  {
    icon: Users,
    title: 'Határozatképesség figyelése',
    description: 'Valós idejű részvételi arány számítás tulajdoni hányad alapján.',
  },
  {
    icon: FileCheck,
    title: 'Jelenléti ív és határozatok',
    description: 'Automatikusan generált jelenléti ív és határozati összesítő, azonnal exportálható.',
  },
];

export default function OnlineKozgyulesPage() {
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
          <span className="text-slate-600 font-medium">Online közgyűlés</span>
        </nav>

        {/* Hero */}
        <div className="mb-12 animate-fade-in-up">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50">
            <Vote size={24} className="text-violet-500" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Online közgyűlés és szavazás
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-500">
            A hagyományos személyes közgyűlés megszervezése időigényes és drága: megfelelő helyszín
            biztosítása, időpont egyeztetés, részvétel megszervezése — és a végén sok esetben a közgyűlés
            nem is határozatképes, mert nem jelenik meg elég tulajdonos. A PanelLakó online közgyűlési
            modulja törvényes keretek között teszi lehetővé a digitális szavazást.
          </p>
        </div>

        {/* Content */}
        <section className="mb-12 space-y-6 text-slate-600">
          <h2 className="text-2xl font-black text-slate-900">A digitális közgyűlés jogi háttere</h2>
          <p className="leading-relaxed">
            A 2021. évi CXLIII. törvény (a társasházakról szóló törvény módosítása) egyértelműen
            lehetővé teszi az elektronikus szavazást és a digitális közgyűlés tartását. Ez azt jelenti,
            hogy egy törvényesen elfogadott határozat meghozható anélkül, hogy egyetlen tulajdonosnak
            is személyesen meg kellene jelennie — amennyiben a szavazás az SZMSZ-ben rögzített módon,
            megfelelő azonosítással és dokumentálással zajlik.
          </p>
          <p className="leading-relaxed">
            Ez különösen értékes olyan társasházakban, ahol a tulajdonosok nagy része nem helyi lakos
            (pl. befektetők, bérbe adott lakások tulajdonosai), vagy ahol nehéz mindenkit egy időpontban
            összehozni. Az online szavazás kiterjeszti a részvételi lehetőséget, és statisztikailag
            magasabb részvételi arányt eredményez, mint a hagyományos közgyűlések.
          </p>

          <h2 className="text-2xl font-black text-slate-900 pt-4">Határozatképesség és szavazatszámlálás</h2>
          <p className="leading-relaxed">
            A közgyűlés határozatképességéhez a tulajdoni hányadok több mint 50%-ának részvétele szükséges.
            A PanelLakó rendszere valós időben számolja, hogy az eddig leadott szavazatok mekkora tulajdoni
            hányadot képviselnek. Ha a szavazási időszak végére nem éri el a szükséges szintet, a rendszer
            automatikusan jelez — sőt, megkönnyíti a megismételt közgyűlés összehívását is.
          </p>
          <p className="leading-relaxed">
            Az egyes határozati javaslatok elfogadásához szükséges szavazatarány tételenként
            állítható be. Az egyszerű döntésekhez (jelenlévők többsége) és a minősített döntésekhez
            (összes tulajdonos 2/3-a, pl. SZMSZ módosítás) eltérő szabály vonatkozik — a rendszer ezt
            automatikusan kezeli és figyelmeztet, ha az adott határozati javaslat nem ment át.
          </p>

          <h2 className="text-2xl font-black text-slate-900 pt-4">Napirend kezelés és határozati javaslatok</h2>
          <p className="leading-relaxed">
            A napirend összeállítása az egyik legfontosabb lépés a közgyűlés előkészítésében. A PanelLakó
            rendszerében a közös képviselő egyszerűen összeállíthatja a napirendi pontokat, mindegyikhez
            csatolhatja a releváns dokumentumokat (pl. árajánlatot, szerződéstervezetet, elszámolást) és
            a konkrét határozati javaslatot. A tulajdonosok a szavazás előtt megismerhetik az összes
            mellékelt anyagot — ez növeli a döntések átláthatóságát és csökkenti a vitatott határozatok
            arányát.
          </p>

          <h2 className="text-2xl font-black text-slate-900 pt-4">Meghívók és emlékeztetők küldése</h2>
          <p className="leading-relaxed">
            A törvény legalább 8 nappal a közgyűlés előtt kötelezi a meghívók kiküldését. A PanelLakó
            rendszerében ez automatikusan történik: a képviselő beállítja a dátumot, a rendszer automatikusan
            generálja és kiküldi a meghívókat az összes tulajdonos számára nyilvántartott e-mail-címre.
            Emlékeztető üzenet is küldhető néhány nappal a szavazás lezárása előtt, növelve a részvételi
            arányt.
          </p>

          <h2 className="text-2xl font-black text-slate-900 pt-4">Jelenléti ív és határozatok nyilvántartása</h2>
          <p className="leading-relaxed">
            A közgyűlés lezárása után a rendszer automatikusan generálja a törvényes jelenléti ívet —
            amelyen szerepel minden szavazó neve, tulajdoni hányada, és hogy digitálisan vagy személyesen
            vett részt. A határozatok összesítője azonnali PDF formátumban exportálható és feltölthető
            a dokumentumtárba, ahol a lakók bármikor megtekinthetik.
          </p>
          <p className="leading-relaxed">
            A határozatok nyilvántartása azért kritikus, mert a korábbi döntések kötelező erővel bírnak
            a társasház tagjaira — és a következő közgyűlés megnyitásakor az előző ülés határozatait
            szokás felolvasni. A PanelLakó archiválja az összes korábbi közgyűlés anyagát, amelyek
            bármikor visszakereshetők.
          </p>
        </section>

        {/* Legal points */}
        <section className="mb-12 rounded-2xl border border-violet-100 bg-violet-50/60 px-6 py-8">
          <div className="mb-5 flex items-center gap-3">
            <Scale size={20} className="text-violet-600" />
            <h2 className="text-xl font-black text-slate-900">Jogi tudnivalók — összefoglalás</h2>
          </div>
          <ul className="space-y-3">
            {LEGAL_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-slate-600">
                <BookOpen size={15} className="mt-0.5 shrink-0 text-violet-500" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-400">
            Forrás: 2021. évi CXLIII. tv. — Mindig javasolt jogi tanácsadóval egyeztetni az SZMSZ
            módosításakor.
          </p>
        </section>

        {/* Steps */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-black text-slate-900">Hogyan zajlik egy online közgyűlés?</h2>
          <div className="space-y-4">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-sm font-black text-white shadow-card">
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

        {/* Feature grid */}
        <section className="mb-12 grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                  <Icon size={20} className="text-violet-600" />
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
            Szervezze meg az első online közgyűlést
          </h2>
          <p className="mb-6 text-brand-100">
            14 napos ingyenes próba — tapasztalja meg, milyen könnyű a digitális közgyűlés szervezése.
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
