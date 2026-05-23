import type { Metadata } from 'next';
import type { Route } from 'next';
import Link from 'next/link';
import {
  Building2,
  ChevronRight,
  Users,
  Calculator,
  Vote,
  AlertTriangle,
  BookOpen,
  Scale,
  ArrowRight,
  CheckCircle,
  Smartphone,
  Clock,
  FolderOpen,
  BadgeAlert,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Digitális Társasházkezelés — Útmutató 2025 | PanelLakó',
  description:
    'Teljes útmutató a modern társasházkezeléshez: közös képviselő feladatai, SZMSZ készítése, közgyűlés összehívása, pénzügyek, dokumentumkezelés — digitálisan.',
  alternates: { canonical: 'https://panellako.hu/tarsashaz-kezeles' },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Főoldal', item: 'https://panellako.hu' },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Társasházkezelés',
      item: 'https://panellako.hu/tarsashaz-kezeles',
    },
  ],
};

const PILLAR_ARTICLES = [
  {
    href: '/tarsashaz-kezeles/kozos-kepviselo-feladatai',
    icon: Users,
    title: 'A közös képviselő feladatai',
    summary:
      'Ki lehet közös képviselő, milyen adminisztratív, pénzügyi és jogi kötelezettségei vannak, és hogyan felel a törvény előtt.',
  },
  {
    href: '/tarsashaz-kezeles/kozgyules-osszehivasa',
    icon: Vote,
    title: 'Közgyűlés összehívása',
    summary:
      'A rendes és rendkívüli közgyűlés összehívásának menete, kötelező meghívótartalom, határozatképesség, digitális szavazás.',
  },
  {
    href: '/tarsashaz-kezeles/szmsz-keszitese',
    icon: BookOpen,
    title: 'SZMSZ készítése lépésről lépésre',
    summary:
      'A Szervezeti és Működési Szabályzat kötelező tartalmi elemei, elfogadásának és módosításának szabályai.',
  },
  {
    href: '/tarsashaz-kezeles/kozos-koltseg-nyilvantartas',
    icon: Calculator,
    title: 'Közös költség nyilvántartás',
    summary:
      'Hogyan számítsuk ki és tartsuk nyilván a közös költséget, mi kerülhet bele az éves elszámolásba, mit kell közzétenni.',
  },
  {
    href: '/tarsashaz-kezeles/dijhatlarak-kezelese',
    icon: BadgeAlert,
    title: 'Díjhátralékosok kezelése',
    summary:
      'Felszólítási folyamat, jogi lépések, közjegyző és végrehajtási eljárás — mit tehet a közös képviselő hátralék esetén.',
  },
  {
    href: '/tarsashaz-kezeles/dokumentumkezeles-tarsashazban',
    icon: FolderOpen,
    title: 'Kötelező iratok a társasházban',
    summary:
      'Milyen dokumentumokat köteles megőrizni és hozzáférhetővé tenni a közös képviselő, meddig és milyen formában.',
  },
  {
    href: '/tarsashaz-kezeles/felugyelobizottsag',
    icon: AlertTriangle,
    title: 'Felügyelőbizottság a társasházban',
    summary:
      'A felügyelőbizottság szerepe, megválasztásának szabályai, hatásköre és a közös képviselővel való viszonya.',
  },
  {
    href: '/tarsashaz-kezeles/kozos-kepviselo-valasztasa',
    icon: Users,
    title: 'Közös képviselő választása',
    summary:
      'Hogyan válasszunk közös képviselőt: jelölési folyamat, megbízási szerződés, díjazás és a visszahívás menete.',
  },
];

const PAIN_POINTS = [
  {
    icon: Scale,
    title: 'Jogszabályi komplexitás',
    text: 'A 2003. évi CXXXIII. törvény és annak módosításai több száz paragrafusban szabályozzák a társasházak működését. A közös képviselőnek tisztában kell lennie a határozatképesség szabályaival, a kötelező határidőkkel, a jogi felelősség kérdéseivel, a GDPR-ral és a számviteli előírásokkal — miközben nem feltétlenül ügyvéd vagy könyvelő.',
  },
  {
    icon: Users,
    title: 'A kommunikáció nehézségei',
    text: 'Egy átlagos társasházban 20–80 lakástulajdonos él, akik különböző korúak, eltérő elvárásokkal rendelkeznek, és nem mindig könnyen elérhetők. Értesítők kézbesítése, közgyűlési meghívók igazolható megküldése, határozatok közzététele, hátralékos fizetési felszólítások kezelése — mindez rengeteg kommunikációs terhet jelent a képviselőnek.',
  },
  {
    icon: Clock,
    title: 'Adminisztrációs teher',
    text: 'Az iratok kezelése, a számlák nyilvántartása, az éves elszámolás elkészítése, a határozatkönyv vezetése, a bejelentések intézése hatóságokhoz — ezek mind olyan feladatok, amelyek heti több órányi munkát jelentenek. Papíralapon vagy szétszórt digitális fájlokban kezelve ez folyamatosan hibalehetőséget és stresszt okoz.',
  },
];

const DIGITAL_BENEFITS = [
  {
    icon: CheckCircle,
    title: 'Automatizált értesítők és határidők',
    text: 'A rendszer figyel a törvényi határidőkre és automatikusan elküldi a szükséges értesítőket — közgyűlési meghívókat, fizetési felszólításokat, éves elszámolást.',
  },
  {
    icon: FolderOpen,
    title: 'Egyetlen iratkezelési rendszer',
    text: 'Minden dokumentum — SZMSZ, közgyűlési határozatok, számlák, szerződések — egy helyen, kereshető formátumban, jogosultság-kezelt hozzáféréssel.',
  },
  {
    icon: Smartphone,
    title: 'Mobil elérhetőség a lakóknak',
    text: 'A lakók mobiltelefonról is megtekinthetik a közleményeket, szavazhatnak a közgyűlésen, és jelezhetik a hibákat — csökkentve a képviselőre nehezedő kommunikációs terhet.',
  },
  {
    icon: Scale,
    title: 'Jogi megfelelés beépítve',
    text: 'A PanelLakó rendszere a 2003. évi CXXXIII. tv. és a 2021. évi CXLIII. tv. követelményeire épül — az SZMSZ, a közgyűlési folyamat és az iratkezelés a törvényi előírásoknak megfelelő.',
  },
];

const LEGAL_REFS = [
  {
    title: '2003. évi CXXXIII. törvény',
    subtitle: 'A társasházakról szóló alaptörvény',
    text: 'A társasházak alapításának, szervezetének, működésének, a közös képviselő jogainak és kötelezettségeinek, a közgyűlési határozathozatalnak, a pénzügyi elszámolásnak és az iratkezelésnek az elsődleges forrása.',
  },
  {
    title: '2021. évi CXLIII. törvény',
    subtitle: 'Digitális közgyűlés és elektronikus szavazás',
    text: 'Módosította a társasháztörvényt, és törvényes keretbe helyezte az elektronikus szavazást, az online közgyűlés tartásának lehetőségét, amennyiben azt az SZMSZ lehetővé teszi.',
  },
  {
    title: 'GDPR — 679/2016/EU rendelet',
    subtitle: 'Általános Adatvédelmi Rendelet',
    text: 'A társasházi adatkezelésre (tulajdonosi névsor, fizetési adatok, biztonsági kamera felvételek stb.) közvetlenül vonatkozik. A közös képviselő adatkezelőnek minősül, és köteles adatkezelési tájékoztatót biztosítani.',
  },
];

const collectionPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Társasházkezelés — Teljes útmutató',
  description:
    'Teljes útmutató a modern társasházkezeléshez: közös képviselő feladatai, SZMSZ, közgyűlés, pénzügyek, dokumentumkezelés — digitálisan.',
  url: 'https://panellako.hu/tarsashaz-kezeles',
  inLanguage: 'hu',
  publisher: { '@type': 'Organization', name: 'PanelLakó', url: 'https://panellako.hu' },
  hasPart: [
    { '@type': 'Article', name: 'A közös képviselő feladatai', url: 'https://panellako.hu/tarsashaz-kezeles/kozos-kepviselo-feladatai' },
    { '@type': 'Article', name: 'Közgyűlés összehívása', url: 'https://panellako.hu/tarsashaz-kezeles/kozgyules-osszehivasa' },
    { '@type': 'Article', name: 'SZMSZ készítése lépésről lépésre', url: 'https://panellako.hu/tarsashaz-kezeles/szmsz-keszitese' },
    { '@type': 'Article', name: 'Közös költség nyilvántartás', url: 'https://panellako.hu/tarsashaz-kezeles/kozos-koltseg-nyilvantartas' },
    { '@type': 'Article', name: 'Díjhátralékosok kezelése', url: 'https://panellako.hu/tarsashaz-kezeles/dijhatlarak-kezelese' },
    { '@type': 'Article', name: 'Kötelező iratok a társasházban', url: 'https://panellako.hu/tarsashaz-kezeles/dokumentumkezeles-tarsashazban' },
    { '@type': 'Article', name: 'Felügyelőbizottság a társasházban', url: 'https://panellako.hu/tarsashaz-kezeles/felugyelobizottsag' },
    { '@type': 'Article', name: 'Közös képviselő választása', url: 'https://panellako.hu/tarsashaz-kezeles/kozos-kepviselo-valasztasa' },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Mi a közös képviselő fő feladata egy társasházban?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A közös képviselő felelős az épület adminisztrációjáért, a közgyűlések szervezéséért, a pénzügyek kezeléséért, az iratok megőrzéséért és a lakókkal való kommunikációért. A 2003. évi CXXXIII. törvény kötelezi az éves elszámolás elkészítésére és a határozatkönyv vezetésére.',
      },
    },
    {
      '@type': 'Question',
      name: 'Mikor kötelező közgyűlést tartani társasházban?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Évente legalább egyszer rendes közgyűlést kell tartani, ahol az éves elszámolást és a következő évi költségvetést jóváhagyják. Rendkívüli közgyűlés szükséges, ha a tulajdoni hányad legalább 10%-ával rendelkező tulajdonosok kérik.',
      },
    },
    {
      '@type': 'Question',
      name: 'Mit kell tartalmaznia a társasházi SZMSZ-nek?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A Szervezeti és Működési Szabályzat kötelező elemei: a közös képviselő megválasztásának szabályai, a közgyűlési határozathozatal rendje, a közös költség felosztásának módja, az iratkezelés szabályai.',
      },
    },
    {
      '@type': 'Question',
      name: 'Hogyan kezeljük a díjhátralékosokat törvényesen?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A folyamat: írásbeli felszólítás, majd közjegyzői fizetési meghagyás, végül végrehajtási eljárás. A közös képviselőnek dokumentálnia kell minden lépést.',
      },
    },
  ],
};

export default function TarsashazKezelesPillarPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <PublicNav />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Breadcrumb */}
        <nav aria-label="Navigáció" className="mb-8 flex items-center gap-1.5 text-sm text-slate-400">
          <Link href="/" className="hover:text-slate-600">
            Főoldal
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-600">Társasházkezelés</span>
        </nav>

        {/* Hero */}
        <div className="mb-14 animate-fade-in-up">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <Building2 size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Társasházkezelés digitálisan — teljes útmutató
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            A magyarországi társasházak törvényi szabályozása (2003. évi CXXXIII. törvény) komoly adminisztratív
            terhet ró a közös képviselőkre. Ez az útmutató összefoglalja a legfontosabb feladatokat és megmutatja,
            hogyan kezelhető mindez hatékonyan, digitálisan.
          </p>
        </div>

        {/* Pillar menu — article grid */}
        <section className="mb-16">
          <h2 className="mb-2 text-2xl font-black text-slate-900">Témakörök</h2>
          <p className="mb-7 text-slate-500">
            Válassza ki az Önnek leginkább releváns témakört, vagy olvassa végig az egész útmutatót a teljes képért.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PILLAR_ARTICLES.map((article) => {
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

        {/* Miért nehéz */}
        <section className="mb-16">
          <h2 className="mb-2 text-2xl font-black text-slate-900">
            Miért nehéz ma társasházat kezelni?
          </h2>
          <p className="mb-7 leading-relaxed text-slate-500">
            Magyarországon közel 50 000 társasház működik, és a legtöbbnek nincs professzionális
            ingatlankezelő cége mögötte. A közös képviselők jellemzően önkéntes alapon, a munkájuk
            mellett végzik ezt a komplex, jogi és adminisztratív ismereteket igénylő feladatot.
          </p>
          <div className="space-y-5">
            {PAIN_POINTS.map((pain) => {
              const Icon = pain.icon;
              return (
                <div
                  key={pain.title}
                  className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                    <Icon size={20} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="mb-1 font-bold text-slate-900">{pain.title}</p>
                    <p className="text-sm leading-relaxed text-slate-500">{pain.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* A digitalizáció előnyei */}
        <section className="mb-16">
          <h2 className="mb-2 text-2xl font-black text-slate-900">A digitalizáció előnyei</h2>
          <p className="mb-7 leading-relaxed text-slate-500">
            A megfelelő digitális eszköz nem csupán kényelmi fejlesztés — hanem a törvényi kötelezettségek
            könnyebb, pontosabb teljesítésének eszköze, és a közös képviselő felelősségvállalásának
            dokumentálása is egyben.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {DIGITAL_BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <p className="mb-1.5 font-bold text-slate-900">{benefit.title}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{benefit.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Mi az a PanelLakó */}
        <section className="mb-16 space-y-4 text-slate-600">
          <h2 className="text-2xl font-black text-slate-900">
            Hogyan segít a PanelLakó a közös képviselőknek?
          </h2>
          <p className="leading-relaxed">
            A PanelLakó egy kifejezetten a magyarországi társasházak igényeire tervezett digitális
            kezelői platform. Nem egy általános CRM vagy táblázatkezelő — hanem egy olyan rendszer,
            amelynek minden modulja a társasháztörvény elvárásaira épül.
          </p>
          <p className="leading-relaxed">
            A platform tartalmaz online közgyűlési és szavazási modult (a 2021. évi CXLIII. tv. alapján),
            digitális dokumentumtárat, közös költség nyilvántartást, hibabejelentési és karbantartási
            feladatkezelőt, lakói kommunikációs csatornát és díjhátralék-követő rendszert. Mindezek
            egyetlen, könnyen kezelhető felületen érhetők el.
          </p>
          <p className="leading-relaxed">
            A közös képviselők számára a PanelLakó csökkenti az adminisztrációs időt, csökkenti a
            mulasztásból fakadó jogi kockázatot, és javítja a lakókkal való kommunikáció minőségét.
            A lakók számára átlátható, mobilbarát felületet kínál, ahol értesítéseket kaphatnak,
            szavazhatnak, és megtekinthetik a közösségi dokumentumokat.
          </p>
        </section>

        {/* Hivatkozott jogszabályok */}
        <section className="mb-16 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-8">
          <div className="mb-6 flex items-center gap-3">
            <Scale size={20} className="text-brand-600" />
            <h2 className="text-xl font-black text-slate-900">Hivatkozott jogszabályok</h2>
          </div>
          <div className="space-y-5">
            {LEGAL_REFS.map((ref) => (
              <div key={ref.title} className="border-l-2 border-brand-300 pl-4">
                <p className="font-bold text-slate-900">{ref.title}</p>
                <p className="text-sm font-medium text-brand-600">{ref.subtitle}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{ref.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-slate-400">
            Ez az oldal tájékoztató jellegű és nem minősül jogi tanácsadásnak. Konkrét esetekben mindig
            forduljon ügyvédhez vagy ingatlankezelési szakértőhöz.
          </p>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-lg">
          <h2 className="mb-2 text-2xl font-black text-white">
            Próbálja ki a PanelLakót ingyen
          </h2>
          <p className="mb-6 text-brand-100">
            14 napos ingyenes próba, bankkártya nélkül. Regisztráljon és importálja a társasháza adatait.
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
