import type { Metadata } from 'next';
import type { Route } from 'next';
import Link from 'next/link';
import {
  FolderOpen,
  CheckCircle,
  ChevronRight,
  Scale,
  FileText,
  Clock,
  AlertTriangle,
  ArrowRight,
  Building2,
  Lock,
  Users,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Kötelező Dokumentumok Társasházban — Teljes Lista és Megőrzési Idők | PanelLakó',
  description:
    'Milyen dokumentumokat köteles megőrizni a közös képviselő? SZMSZ, közgyűlési jegyzőkönyvek, számviteli iratok — kötelező megőrzési idők és digitális megoldások.',
  alternates: {
    canonical: 'https://panellako.hu/tarsashaz-kezeles/dokumentumkezeles-tarsashazban',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Kötelező dokumentumok társasházban — teljes lista',
  description:
    'Milyen dokumentumokat köteles megőrizni a közös képviselő? SZMSZ, közgyűlési jegyzőkönyvek, számviteli iratok — kötelező megőrzési idők és digitális megoldások.',
  url: 'https://panellako.hu/tarsashaz-kezeles/dokumentumkezeles-tarsashazban',
  publisher: { '@type': 'Organization', name: 'PanelLakó', url: 'https://panellako.hu' },
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
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Dokumentumkezelés társasházban',
      item: 'https://panellako.hu/tarsashaz-kezeles/dokumentumkezeles-tarsashazban',
    },
  ],
};

const RETENTION_TABLE = [
  {
    type: 'SZMSZ és módosításai',
    period: 'Örök megőrzés',
    basis: 'Ttv. 13. §',
  },
  {
    type: 'Alapító okirat',
    period: 'Örök megőrzés',
    basis: 'Ttv. 7. §',
  },
  {
    type: 'Közgyűlési meghívók',
    period: '5 év',
    basis: 'Ttv. 19. § és polgári jog általános elévülése',
  },
  {
    type: 'Jelenléti ívek',
    period: '5 év',
    basis: 'Ttv. 19. §',
  },
  {
    type: 'Közgyűlési határozatok (határozatkönyv)',
    period: '10 év',
    basis: 'Ttv. 30. §',
  },
  {
    type: 'Éves elszámolások',
    period: '8 év',
    basis: '2000. évi C. tv. (Sztv.) 169. §',
  },
  {
    type: 'Számlák, bizonylatok',
    period: '8 év',
    basis: 'Sztv. 169. §',
  },
  {
    type: 'Bankszámlakivonatok',
    period: '8 év',
    basis: 'Sztv. 169. §',
  },
  {
    type: 'Szerződések (folyamatban lévő)',
    period: 'Szerződés megszűnéséig + 5 év',
    basis: 'Ptk. 6:22. § (elévülési idő)',
  },
  {
    type: 'Energetikai tanúsítvány',
    period: '10 év (érvényessége alatt)',
    basis: '7/2006. (V. 24.) TNM rendelet',
  },
  {
    type: 'Lift hatósági felülvizsgálat',
    period: 'Következő felülvizsgálatig + 5 év',
    basis: '11/2013. (III. 21.) NGM rendelet',
  },
  {
    type: 'Tűzvédelmi dokumentumok',
    period: '5 év',
    basis: '54/2014. (XII. 5.) BM rendelet',
  },
  {
    type: 'Munkáltatói iratok (ha alkalmaz)',
    period: '50 év',
    basis: '1997. évi LXXX. tv. (Tbj.)',
  },
];

export default function DokumentumkezelesTarsashazbanPage() {
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
          <Link href="/tarsashaz-kezeles" className="hover:text-slate-600">
            Társasházkezelés
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-600">Dokumentumkezelés társasházban</span>
        </nav>

        {/* Hero */}
        <div className="mb-12">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <FolderOpen size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Kötelező dokumentumok társasházban — teljes lista
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            A közös képviselő dokumentumkezelési kötelezettségei sokrétűek: a 2003. évi CXXXIII.
            törvénytől (Ttv.) a 2000. évi C. törvény (számviteli törvény) szabályain át az
            épületgépészeti és tűzvédelmi előírásokig számos jogszabály meghatározza, milyen
            iratokat kell megőrizni, meddig, és milyen formában. Ez az útmutató átfogó listát
            és megőrzési időket ad — a kötelező joghely-hivatkozásokkal együtt.
          </p>
        </div>

        {/* H2: Alapdokumentumok */}
        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-black text-slate-900">
            Alapdokumentumok
          </h2>
          <p className="leading-relaxed text-slate-600">
            A társasházi jogviszony alapját képező iratok azok, amelyek a társasház létrejöttét,
            szervezetét és működési kereteit meghatározzák. Ezeket nem elegendő megőrizni —
            a közös képviselő köteles azokat a tulajdonostársak számára hozzáférhetővé tenni, és
            szükség esetén másolatot adni belőlük.
          </p>
          <div className="space-y-3">
            {[
              {
                icon: FileText,
                title: 'Alapító okirat',
                text: 'A társasházi albetétek és közös területek jogi meghatározása. A Ttv. 7. §-a alapján az alapítás feltétele és örökre megőrzendő. Ha módosítják, a korábbi változat is megőrzendő.',
              },
              {
                icon: Scale,
                title: 'Szervezeti és Működési Szabályzat (SZMSZ)',
                text: 'A Ttv. 13. §-a szerinti kötelező belső szabályzat, amely az épület-specifikus működési rendet, szavazási szabályokat és közösségi előírásokat tartalmazza. Minden módosítás külön dokumentumként is megőrzendő.',
              },
              {
                icon: Building2,
                title: 'Ingatlan-nyilvántartási adatok, tulajdoni lapok',
                text: 'A hatályos tulajdoni lapok másolatai (az összes albetétről) és az esetleges terheket, jelzálogjogokat igazoló dokumentumok. Ezek naprakészen kell tartani.',
              },
              {
                icon: FolderOpen,
                title: 'Igazságügyi nyilvántartás (közös képviselői megbízás)',
                text: 'A közös képviselő megbízásának dokumentuma — közgyűlési határozat vagy szerződés — amely a képviseleti jogosultságot igazolja hatóságokkal, bankokkal és szerződő partnerekkel szemben.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={18} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="mb-1 font-bold text-slate-900">{item.title}</p>
                    <p className="text-sm leading-relaxed text-slate-500">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* H2: Közgyűlési dokumentumok */}
        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-black text-slate-900">
            Közgyűlési dokumentumok
          </h2>
          <p className="leading-relaxed text-slate-600">
            A közgyűlés a társasház legfőbb döntéshozó szerve. A Ttv. 30. § kötelezővé teszi a
            határozatkönyv vezetését, és a gyűléssel kapcsolatos összes dokumentum megőrzését.
            Ezek hiányában a határozatok végrehajthatósága — jogi vita esetén — megkérdőjelezhető.
          </p>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Users size={18} className="text-brand-600" />
              <p className="font-bold text-slate-900">Megőrzendő közgyűlési iratok</p>
            </div>
            <div className="space-y-4">
              {[
                {
                  title: 'Meghívók (5 évig)',
                  text: 'A közgyűlési meghívó dátumát, a napirendi pontokat és az igazolható kézbesítés módját tartalmazó dokumentum. A Ttv. 19. § szerinti határidők betartásának bizonyítéka.',
                },
                {
                  title: 'Jelenléti ívek (5 évig)',
                  text: 'A megjelent és meghatalmazott tulajdonostársak aláírásával hitelesített jelenléti ív — a határozatképesség utólagos igazolásához elengedhetetlen.',
                },
                {
                  title: 'Határozatkönyv (10 évig)',
                  text: 'A Ttv. 30. § szerint a közgyűlési határozatokat sorszámozva, dátummal és a szavazati arányok feltüntetésével kell rögzíteni. Ez az egész társasházi élet gerince — mindenkire kötelező.',
                },
                {
                  title: 'Meghatalmazások (5 évig)',
                  text: 'Ha tulajdonostárs meghatalmazott útján vett részt, a meghatalmazás írásban megőrzendő a szavazati jog igazolásához.',
                },
                {
                  title: 'Hangfelvételek / videofelvételek',
                  text: 'Nem kötelező készíteni, de ha a közgyűlésről készül felvétel, azt GDPR-konform adatkezeléssel — a felvételről való tájékoztatással — kell kezelni, és az érintettek hozzáférhetnek saját adataikhoz.',
                },
              ].map((item) => (
                <div key={item.title} className="border-l-2 border-brand-200 pl-4">
                  <p className="font-bold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* H2: Pénzügyi dokumentumok */}
        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-black text-slate-900">
            Pénzügyi dokumentumok
          </h2>
          <p className="leading-relaxed text-slate-600">
            A társasházi pénzügyi iratkezelést elsősorban a 2000. évi C. törvény (számviteli
            törvény, Sztv.) szabályozza, különösen a 169. §, amely 8 éves megőrzési kötelezettséget
            ír elő a számviteli nyilvántartásokra. Ide tartoznak:
          </p>
          <ul className="space-y-2 pl-1">
            {[
              'Éves pénzügyi elszámolások (Ttv. 24/A. § alapján is kötelező) — 8 év',
              'Bejövő számlák (karbantartók, szolgáltatók, közmű-számlák) — 8 év',
              'Banki bizonylatok, bankszámlakivonatok — 8 év',
              'Pénztárbizonylatok (ha készpénzes kifizetés történt) — 8 év',
              'Közös képviselői megbízási díjról szóló bizonylatok — 8 év',
              'Felújítási alap kezeléséről szóló elkülönített nyilvántartás — 8 év',
              'Szerződések (takarítás, lift, biztosítás, karbantartók) — megszűnéstől + 5 év',
              'Hátralékos fizetési felszólítások, megállapodások — 8 év',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-slate-600">
                <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              <p className="font-bold text-amber-900">Elkülönített felújítási alap</p>
            </div>
            <p className="text-sm leading-relaxed text-amber-800">
              A Ttv. 45. §-a szerint a felújítási alap pénzeszközeit elkülönített bankszámlán kell
              kezelni, és nyilvántartásának a folyó kiadásoktól elkülönítve kell megjelennie az
              éves elszámolásban. Az összeolvasztás jogsértő, és a képviselő felelősségét
              alapozhatja meg.
            </p>
          </div>
        </section>

        {/* H2: Épületdokumentáció */}
        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-black text-slate-900">
            Épületdokumentáció
          </h2>
          <p className="leading-relaxed text-slate-600">
            Az épület fizikai állapotával és biztonságával kapcsolatos dokumentumok jogszabályi
            alapja különböző ágazati rendeletek — az építési, tűzvédelmi, energetikai és
            gépészeti előírások. Ezeket a közös képviselőnek nyomon kell követnie, és gondoskodnia
            kell a határidős megújításokról.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Building2,
                title: 'Energetikai tanúsítvány',
                text: '10 évig érvényes; a 7/2006. (V. 24.) TNM rendelet írja elő. Ingatlan értékesítésekor vagy bérbeadásakor kötelező bemutatni. Lejárat előtt meg kell újítani.',
              },
              {
                icon: AlertTriangle,
                title: 'Tűzvédelmi dokumentumok',
                text: 'Tűzvédelmi szabályzat (ha 50 főnél több személyt foglalkoztat a társasház), tűzvédelmi oktatások nyilvántartása, tűzoltó-berendezések vizsgálati naplói — az 54/2014. (XII. 5.) BM rendelet alapján.',
              },
              {
                icon: Clock,
                title: 'Lift hatósági felülvizsgálat',
                text: 'A 11/2013. (III. 21.) NGM rendelet alapján a lift évenként kötelező hatósági felülvizsgálatnak kell alávetni. A felülvizsgálati napló és a minősítő határozat megőrzendő az aktuális + megelőző felülvizsgálati periódusból.',
              },
              {
                icon: FileText,
                title: 'Épületgépészeti tervek és dokumentációk',
                text: 'Az épület elektromos, vízvezeték-, fűtési rendszerének tervdokumentációja — ezek elengedhetetlenek bármely felújításhoz vagy hatósági engedélykérelemhez. Lehetőleg digitalizálva kell megőrizni.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-5"
                >
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={18} className="text-brand-600" />
                  </div>
                  <p className="mb-1.5 font-bold text-slate-900">{item.title}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{item.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* H2: Lakókkal kapcsolatos dokumentumok */}
        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-black text-slate-900">
            Lakókkal kapcsolatos dokumentumok
          </h2>
          <p className="leading-relaxed text-slate-600">
            A társasházi nyilvántartásnak tartalmaznia kell minden albetét és tulajdonos adatát.
            Ezek kezelése egyben GDPR-köteles adatkezelési tevékenység — a közös képviselő
            adatkezelőnek minősül, és köteles adatkezelési tájékoztatót biztosítani.
          </p>
          <ul className="space-y-2 pl-1">
            {[
              'Albetét-nyilvántartás (helyrajzi szám, albetét-arány, cím)',
              'Tulajdonosok neve és értesítési adatai (postacím, e-mail, telefonszám)',
              'Tulajdoni lapok másolatai (frissített verzió szükség szerint)',
              'Bérleti szerződések másolatai — amennyiben a tulajdonos értesítette a képviselőt a bérlőről',
              'Lakók által adott meghatalmazások (közgyűlés, ügyintézés)',
              'Épített közös területekre vonatkozó bérbeadási szerződések (pl. reklámfelület, antenna)',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-slate-600">
                <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
          <p className="leading-relaxed text-slate-600">
            A bérlőkre vonatkozó adatok kezelése különösen kényes: a GDPR 679/2016/EU rendelet
            alapján csak a szükséges mértékű adatot szabad tárolni, és az érintett személy
            tájékoztatást, hozzáférést, törlést kérhet. Az adatkezelési tájékoztatót a közös
            képviselőnek nyilvánosan közzé kell tennie.
          </p>
        </section>

        {/* H2: Megőrzési idők táblázata */}
        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-black text-slate-900">
            Kötelező megőrzési idők táblázata
          </h2>
          <p className="leading-relaxed text-slate-600">
            Az alábbi táblázat összefoglalja a leggyakoribb iratfajtákat, azok kötelező megőrzési
            idejét és az azt előíró jogszabályi hivatkozást.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 font-bold text-slate-700">Irat típusa</th>
                  <th className="px-4 py-3 font-bold text-slate-700">Megőrzési idő</th>
                  <th className="px-4 py-3 font-bold text-slate-700">Jogszabályi alap</th>
                </tr>
              </thead>
              <tbody>
                {RETENTION_TABLE.map((row, i) => (
                  <tr
                    key={row.type}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                  >
                    <td className="px-4 py-3 text-slate-700">{row.type}</td>
                    <td className="px-4 py-3 font-medium text-brand-700">{row.period}</td>
                    <td className="px-4 py-3 text-slate-500">{row.basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">
            A táblázat a legfontosabb iratfajtákat tartalmazza. Az egyedi esetekre vonatkozó
            pontos megőrzési kötelezettséget mindig az adott jogszabály alapján kell meghatározni.
          </p>
        </section>

        {/* H2: Lakók jogai a dokumentumokhoz */}
        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-black text-slate-900">
            Lakók jogai a dokumentumokhoz
          </h2>
          <p className="leading-relaxed text-slate-600">
            A Ttv. 46. § (3) bekezdése alapján minden tulajdonostárs jogosult betekinteni az
            összes, a társasházi közösséggel kapcsolatos iratba. Ez nem korlátozható — a közös
            képviselő nem tagadhatja meg az iratokhoz való hozzáférést arra hivatkozva, hogy az
            nem érinti közvetlenül az adott tulajdonost.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: FileText,
                title: 'Betekintési jog',
                text: 'Minden tulajdonostárs helyszínen megtekintheti a közösségi iratokat. A közös képviselő köteles az iratokat rendelkezésre bocsátani.',
              },
              {
                icon: FolderOpen,
                title: 'Másolatkérés',
                text: 'A tulajdonostárs másolatot kérhet az iratokról. Ennek díja legfeljebb az önköltségi ár lehet — extraprofitot nem lehet felszámítani.',
              },
              {
                icon: Lock,
                title: 'GDPR-korlátok',
                text: 'Más tulajdonosok személyes adataihoz (pl. hátralék neve) való hozzáférés korlátozott — erre a GDPR tájékoztatási kötelezettsége alkalmazandó.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-brand-100 bg-brand-50 p-5"
                >
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">
                    <Icon size={18} className="text-brand-600" />
                  </div>
                  <p className="mb-1.5 font-bold text-slate-900">{item.title}</p>
                  <p className="text-sm leading-relaxed text-slate-600">{item.text}</p>
                </div>
              );
            })}
          </div>
          <p className="leading-relaxed text-slate-600">
            Ha a közös képviselő megtagadja a betekintést vagy a másolatkiadást, a tulajdonostárs
            bírósághoz fordulhat. A jogtalan megtagadás a képviselő visszahívásának alapja is lehet.
            Éppen ezért a jól szervezett, digitálisan kezelt dokumentumtár — amelyhez a tulajdonosok
            online hozzáférhetnek — csökkenti a konfliktusok kockázatát.
          </p>
        </section>

        {/* H2: Digitális dokumentumtár */}
        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-black text-slate-900">
            Digitális dokumentumtár előnyei
          </h2>
          <p className="leading-relaxed text-slate-600">
            A papíralapú iratkezelés egyre nehezebben tartható fenn a megnövekedett jogszabályi
            elvárások és a tulajdonosok növekvő igényei mellett. A digitális dokumentumtár
            nemcsak kényelmi megoldás — hanem a törvényi kötelezettségek biztonságosabb
            teljesítésének eszköze is.
          </p>
          <div className="space-y-3">
            {[
              {
                icon: FolderOpen,
                title: 'Kereshetőség és rendszerezettség',
                text: 'A digitalizált iratok pillanatok alatt megtalálhatók irat típusa, dátuma vagy ügyiratszáma alapján — nem kell fizikai mappákban keresni évekre visszamenőleg.',
              },
              {
                icon: Lock,
                title: 'Biztonság és mentés',
                text: 'A felhőalapú tároló megvédi az iratokat a fizikai megsemmisüléstől (tűz, vízkár, betörés). Automatikus biztonsági mentéssel az iratok soha nem vesznek el.',
              },
              {
                icon: Users,
                title: 'Hozzáférés-kezelés',
                text: 'Beállítható, hogy a tulajdonostársak csak a saját adataikat és a közösségi dokumentumokat lássák — a más tulajdonos személyes adatait védő GDPR-szabályok automatikusan érvényesülnek.',
              },
              {
                icon: Scale,
                title: 'GDPR megfelelés',
                text: 'A PanelLakó dokumentumtára beépített hozzáférési naplóval rendelkezik — így bármikor igazolható, ki, mikor és milyen dokumentumhoz fért hozzá. Ez az adatvédelmi hatósági ellenőrzésen kulcsfontosságú.',
              },
              {
                icon: CheckCircle,
                title: 'Azonnali megosztás és aláírás',
                text: 'Dokumentumok könnyen megoszthatók a tulajdonostársakkal, alvállalkozókkal vagy hatóságokkal — elektronikus aláírással ellátva, hitelesített formában.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={18} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="mb-1 font-bold text-slate-900">{item.title}</p>
                    <p className="text-sm leading-relaxed text-slate-500">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="leading-relaxed text-slate-600">
            A PanelLakó Dokumentumtár moduljáról részletesen olvashat a{' '}
            <Link
              href="/funkciok/dokumentumtar"
              className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700"
            >
              /funkciok/dokumentumtar
            </Link>{' '}
            oldalon. A modul lehetővé teszi az összes fent felsorolt irat digitális kezelését,
            a megőrzési határidők követését és a tulajdonosok hozzáférés-kezelését — egységes,
            GDPR-konform keretrendszerben.
          </p>
        </section>

        {/* Legal refs */}
        <section className="mb-12 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-8">
          <div className="mb-5 flex items-center gap-3">
            <Scale size={20} className="text-brand-600" />
            <h2 className="text-xl font-black text-slate-900">Hivatkozott jogszabályok</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                ref: '2003. évi CXXXIII. tv. (Ttv.) 13., 19., 24/A., 30., 45–46. §§',
                text: 'A társasháztörvény iratkezelési, közgyűlési dokumentálási és betekintési kötelezettségekre vonatkozó rendelkezései.',
              },
              {
                ref: '2000. évi C. tv. (Sztv.) 169. §',
                text: 'A számviteli bizonylatok és könyvviteli nyilvántartások kötelező 8 éves megőrzési ideje.',
              },
              {
                ref: '679/2016/EU rendelet (GDPR)',
                text: 'A személyes adatok kezelésére vonatkozó általános uniós adatvédelmi rendelet — a közös képviselő mint adatkezelő kötelezettségeit meghatározza.',
              },
              {
                ref: '7/2006. (V. 24.) TNM rendelet',
                text: 'Az épületek energetikai jellemzőinek meghatározásáról — az energetikai tanúsítvány 10 éves érvényességi ideje.',
              },
              {
                ref: '11/2013. (III. 21.) NGM rendelet',
                text: 'A felvonók időszakos biztonsági felülvizsgálatának kötelező rendjéről.',
              },
              {
                ref: '54/2014. (XII. 5.) BM rendelet',
                text: 'Az Országos Tűzvédelmi Szabályzat — a tűzvédelmi dokumentumok megőrzési követelményei.',
              },
            ].map((note) => (
              <div key={note.ref} className="border-l-2 border-brand-300 pl-4">
                <p className="font-bold text-slate-900">{note.ref}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{note.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-slate-400">
            Ez a cikk tájékoztató jellegű és nem minősül jogi tanácsadásnak. Konkrét esetekben —
            különösen jogvita, hatósági eljárás vagy adatvédelmi kérdés esetén — forduljon
            ügyvédhez vagy GDPR-tanácsadóhoz.
          </p>
        </section>

        {/* Further reading */}
        <section className="mb-12">
          <h2 className="mb-5 text-xl font-black text-slate-900">Kapcsolódó témák</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                href: '/tarsashaz-kezeles/kozos-koltseg-nyilvantartas',
                title: 'Közös költség nyilvántartás',
                text: 'Tételek, éves elszámolás, könyvelői export',
              },
              {
                href: '/tarsashaz-kezeles/dijhatlarak-kezelese',
                title: 'Díjhátralékosok kezelése',
                text: 'Felszólítás, FMH, végrehajtás, jelzálogjog',
              },
              {
                href: '/tarsashaz-kezeles/szmsz-keszitese',
                title: 'SZMSZ készítése',
                text: 'Kötelező tartalom, elfogadás, módosítás',
              },
              {
                href: '/funkciok/dokumentumtar',
                title: 'Dokumentumtár modul',
                text: 'Digitális iratkezelés a PanelLakóban',
              },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href as Route}
                className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
              >
                <div>
                  <p className="font-bold text-slate-900 group-hover:text-brand-700">
                    {link.title}
                  </p>
                  <p className="text-sm text-slate-500">{link.text}</p>
                </div>
                <ArrowRight
                  size={16}
                  className="ml-auto mt-0.5 shrink-0 text-slate-300 group-hover:text-brand-500"
                />
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-lg">
          <h2 className="mb-2 text-2xl font-black text-white">
            Tárolja az összes iratot egy helyen
          </h2>
          <p className="mb-6 text-brand-100">
            A PanelLakó Dokumentumtár modulja kezeli a megőrzési határidőket, a hozzáférési
            jogosultságokat és a GDPR-megfelelést. 14 napos ingyenes próba, bankkártya nélkül.
          </p>
          <Link
            href="/funkciok/dokumentumtar"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-50"
          >
            <CheckCircle size={16} />
            Dokumentumtár megismerése
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
