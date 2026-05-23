import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ChevronRight,
  Users,
  Scale,
  FileText,
  CheckCircle,
  AlertTriangle,
  Building2,
  ShieldCheck,
  Eye,
  ArrowRight,
  Gavel,
  BarChart3,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Felügyelőbizottság a Társasházban — Feladatok és Választás | PanelLakó',
  description:
    'A társasházi felügyelőbizottság feladatai, tagjainak megválasztása, jogai és kötelezettségei — 2003. évi CXXXIII. törvény alapján. Mikor kötelező felügyelőbizottságot alakítani?',
  alternates: { canonical: 'https://panellako.hu/tarsashaz-kezeles/felugyelobizottsag' },
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
      name: 'Felügyelőbizottság',
      item: 'https://panellako.hu/tarsashaz-kezeles/felugyelobizottsag',
    },
  ],
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Felügyelőbizottság a társasházban — mikor kötelező és mit csinál?',
  description:
    'A társasházi felügyelőbizottság feladatai, tagjainak megválasztása, jogai és kötelezettségei — 2003. évi CXXXIII. törvény alapján. Mikor kötelező felügyelőbizottságot alakítani?',
  url: 'https://panellako.hu/tarsashaz-kezeles/felugyelobizottsag',
  publisher: { '@type': 'Organization', name: 'PanelLakó', url: 'https://panellako.hu' },
  inLanguage: 'hu',
  datePublished: '2024-01-15',
  dateModified: '2026-05-23',
  author: { '@type': 'Organization', name: 'PanelLakó', url: 'https://panellako.hu' },
};

const FELADATOK = [
  {
    cim: 'Pénzügyi ellenőrzés',
    leiras:
      'A közös képviselő által vezetett pénzügyi nyilvántartások, bankszámlakivonatok és a közös költség elszámolásának rendszeres vizsgálata.',
    ikon: BarChart3,
  },
  {
    cim: 'Éves elszámolás felülvizsgálata',
    leiras:
      'Az éves pénzügyi elszámolás és a következő évi költségvetési terv ellenőrzése, vélemény kialakítása a közgyűlés számára.',
    ikon: FileText,
  },
  {
    cim: 'Szerződések vizsgálata',
    leiras:
      'A társasház nevében kötött szerződések (karbantartás, takarítás, biztosítás) áttekintése, a megkötött feltételek célszerűségének megítélése.',
    ikon: Scale,
  },
  {
    cim: 'Hibabejelentések nyomon követése',
    leiras:
      'Annak ellenőrzése, hogy a tulajdonosok által bejelentett hibák kezelése szabályos és határidőben megtörtént-e.',
    ikon: AlertTriangle,
  },
  {
    cim: 'Rendkívüli közgyűlés összehívása',
    leiras:
      'Ha a közös képviselő jogszabályt vagy az SZMSZ-t megsérti, a felügyelőbizottság önállóan jogosult rendkívüli közgyűlést összehívni.',
    ikon: Gavel,
  },
  {
    cim: 'Javaslattétel a közgyűlésnek',
    leiras:
      'A felügyelőbizottság bármely kérdésben javaslatot tehet a közgyűlésnek, és véleményét a napirendre tűzettheti.',
    ikon: CheckCircle,
  },
];

const OSSZEFÉRHETETLENSÉG = [
  'A közös képviselő nem lehet a felügyelőbizottság tagja.',
  'A közös képviselő Ptk. szerinti közeli hozzátartozója sem lehet felügyelőbizottsági tag.',
  'Akinek a társasházzal szemben fennálló követelése van (pl. hátralékos közös költség), kizárható.',
  'Az SZMSZ további összeférhetetlenségi szabályokat is előírhat.',
];

export default function FelugyelobizottsagPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <PublicNav />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Breadcrumb */}
        <nav aria-label="Navigáció" className="mb-8 flex flex-wrap items-center gap-1.5 text-sm text-slate-400">
          <Link href="/" className="hover:text-slate-600">Főoldal</Link>
          <ChevronRight size={14} />
          <Link href="/tarsashaz-kezeles" className="hover:text-slate-600">Társasházkezelés</Link>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-600">Felügyelőbizottság</span>
        </nav>

        {/* Hero */}
        <div className="mb-12">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <ShieldCheck size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Felügyelőbizottság a társasházban — mikor kötelező és mit csinál?
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            A felügyelőbizottság a tulajdonosok ellenőrző szerve: feladata, hogy a közös képviselő
            munkáját, a pénzügyi gazdálkodást és az SZMSZ betartását függetlenül vizsgálja.
            A 2003. évi CXXXIII. törvény (Ttv.) 53–59. §-ai részletesen szabályozzák,
            mikor kötelező megalakítani és milyen jogokat gyakorolhat.
          </p>
        </div>

        {/* Mikor kötelező */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Building2 size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Mikor kötelező felügyelőbizottságot alakítani?
            </h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              A Ttv. 53. §-a szerint a felügyelőbizottság megalakítása két feltétel együttes fennállása
              esetén <strong className="text-slate-800">kötelező</strong>: egyrészt az épületben
              legalább <strong className="text-slate-800">hat önálló albetét</strong> található, másrészt
              a Szervezeti-Működési Szabályzat (SZMSZ) előírja a felügyelőbizottság létrehozását.
              Amennyiben az SZMSZ erről nem rendelkezik, a megalakítás kötelezővé válik akkor is, ha
              a tulajdonosok <strong className="text-slate-800">legalább 1/10-e</strong> (tulajdoni hányad
              alapján számítva) írásban kezdeményezi.
            </p>
            <p className="leading-relaxed">
              Hat albetétnél kisebb társasházakban a felügyelőbizottság megalakítása nem kötelező, de
              az SZMSZ-ben önkéntesen is előírható, és a tulajdonosok dönthetnek ilyen testület
              létrehozásáról. A kisebb közösségekben sokszor egyetlen aktív tulajdonos látja el az
              informális ellenőrzői szerepet, ám a törvényes jogosítványok csak a szabályszerűen
              megalakított felügyelőbizottságot illetik meg.
            </p>
            <div className="rounded-xl border border-brand-100 bg-brand-50 p-5">
              <div className="flex gap-3">
                <CheckCircle size={18} className="mt-0.5 shrink-0 text-brand-600" />
                <div>
                  <p className="mb-1 font-bold text-brand-800">Összefoglalás — Ttv. 53. §</p>
                  <p className="text-sm leading-relaxed text-brand-700">
                    Kötelező: legalább 6 albetét + SZMSZ rendelkezése, VAGY a tulajdoni hányad
                    legalább 1/10-ének írásos kérése. Önkéntes: bármely méretű társasházban
                    dönthet úgy a közgyűlés, hogy felügyelőbizottságot alakít.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tagok */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Users size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">A felügyelőbizottság tagjai</h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              A felügyelőbizottságnak <strong className="text-slate-800">legalább 3 tagból</strong> kell
              állnia. A tagoknak a társasház valamely önálló ingatlanának tulajdonosainak kell lenniük —
              bérlők, használók nem választhatók meg. A megbízatás időtartamát az SZMSZ határozza meg;
              ha az SZMSZ hallgat a kérdésről, a törvény alapján főszabályként az éves közgyűlésen
              újra kell választani a tagokat.
            </p>
            <p className="leading-relaxed">
              A felügyelőbizottság tagjainak száma páratlan szokott lenni (3 vagy 5 fő), hogy szavazategyenlőség
              esetén ne alakulhasson ki döntésképtelenség. A tagok maguk közül elnököt választanak, aki
              képviseli a testületet a közös képviselővel és a közgyűléssel szemben.
            </p>
            <p className="mb-3 font-semibold text-slate-800">Összeférhetetlenségi szabályok</p>
            <ul className="space-y-2 text-sm">
              {OSSZEFÉRHETETLENSÉG.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
                  <span className="text-slate-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Megválasztás */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Gavel size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Megválasztás menete</h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              A felügyelőbizottság tagjait a <strong className="text-slate-800">közgyűlés választja meg</strong> egyszerű
              szótöbbséggel — azaz a jelenlevők tulajdoni hányad alapján számított több mint 50%-ának
              igenlő szavazatával. A megválasztáshoz nincs szükség minősített többségre, kivéve, ha
              az SZMSZ szigorúbb feltételt ír elő.
            </p>
            <p className="leading-relaxed">
              Az SZMSZ előírhatja a <strong className="text-slate-800">titkos szavazást</strong> a
              felügyelőbizottsági tagok megválasztásánál. Titkos szavazás esetén gondoskodni kell a
              szavazólapok előzetes elkészítéséről és a szavazatszámlálás pártatlanságáról. Ha az
              SZMSZ nem teszi kötelezővé, a nyílt kézfelemeléses szavazás is érvényes.
            </p>
            <p className="leading-relaxed">
              A felügyelőbizottság tagjai — akárcsak a közös képviselő — <strong className="text-slate-800">visszahívhatók</strong>{' '}
              a közgyűlés egyszerű többségi döntésével. A visszahíváshoz nem szükséges indok, de a
              kötelezettségszegés tényének rögzítése erősíti a döntés jogszerűségét. A visszahívott
              tag mandátuma azonnal megszűnik; a helyére a következő közgyűlésen kell új tagot
              választani. Sürgős esetben rendkívüli közgyűlésen is pótolható a kiesett tag.
            </p>
          </div>
        </section>

        {/* Feladatok */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Eye size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              A felügyelőbizottság feladatai — Ttv. 56. §
            </h2>
          </div>
          <p className="mb-6 leading-relaxed text-slate-500">
            A felügyelőbizottság elsődleges funkciója az <strong className="text-slate-700">ellenőrzés</strong>:
            nem hoz végrehajtói döntéseket, nem kezeli a pénzt, nem köt szerződéseket — hanem
            felügyeli, hogy mindez szabályosan és a tulajdonosok érdekeinek megfelelően történik-e.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {FELADATOK.map((item) => {
              const Icon = item.ikon;
              return (
                <div
                  key={item.cim}
                  className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                    <Icon size={18} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="mb-1 font-bold text-slate-900">{item.cim}</p>
                    <p className="text-sm leading-relaxed text-slate-500">{item.leiras}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Mit ellenőrizhet */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <FileText size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Mit ellenőrizhet a felügyelőbizottság?
            </h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              A felügyelőbizottság széles körű betekintési joggal rendelkezik. A közös képviselő
              <strong className="text-slate-800"> köteles biztosítani a hozzáférést</strong> minden
              olyan dokumentumhoz, nyilvántartáshoz és adathoz, amelyre a felügyelőbizottság az
              ellenőrzési feladatainak ellátásához szükséget tart. Ez a kötelezettség nem diszkrécionális
              — a megtagadás jogszabálysértésnek minősül, és alapul szolgálhat a rendkívüli közgyűlés
              összehívásához.
            </p>
            <p className="leading-relaxed">
              Az ellenőrzés kiterjedhet a társasház bankszámlájának kivonatára, az összes kötött
              szerződésre, a hibabejelentési naplóra és a bejelentések elbírálásának menetére,
              a felújítási alap felhasználására, a biztosítással kapcsolatos iratokra, valamint
              az éves közgyűlésen elfogadott határozatok végrehajtásának állapotára.
            </p>
            <p className="leading-relaxed">
              A felügyelőbizottság rendszerint negyedévente, félévente vagy évente ülésezik,
              de szükség esetén rendkívüli ülést is összehívhat. Az ülések összehívásának rendjét
              és a döntéshozatal módját az SZMSZ vagy a felügyelőbizottság saját ügyrendje
              határozza meg.
            </p>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-800">
                  <strong>Fontos:</strong> Ha a közös képviselő megtagadja a dokumentumokba való
                  betekintést, a felügyelőbizottság rendkívüli közgyűlést hívhat össze, és
                  a jogsértést bejelentheti a járási hivatal gyámhivatali és igazságügyi
                  főosztályának — mint társasházi hatóságnak.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Felelősség */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Scale size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Felelősség és jogkövetkezmények
            </h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              A felügyelőbizottság tagjai <strong className="text-slate-800">nem mentesülnek a felelősség alól</strong> pusztán
              azért, mert ellenőrző — és nem végrehajtó — szerepet töltenek be. Ha egy tag az ellenőrzési
              kötelezettségét gondatlanul mulasztja el, és ebből a társasháznak kára keletkezik,
              kártérítési felelősséggel tartozhat a polgári jog szabályai szerint.
            </p>
            <p className="leading-relaxed">
              Ha a felügyelőbizottság jogsértést vagy súlyos kötelezettségszegést tár fel,
              az alábbi lépéseket teheti:
            </p>
            <div className="space-y-3">
              {[
                {
                  szam: '1',
                  cim: 'Rendkívüli közgyűlés összehívása',
                  leiras:
                    'A felügyelőbizottság önállóan jogosult rendkívüli közgyűlést összehívni, ha a közös képviselő nem teszi meg, noha köteles lenne rá (Ttv. 56. §).',
                },
                {
                  szam: '2',
                  cim: 'Hatósághoz fordulás',
                  leiras:
                    'Súlyos jogsértés esetén a felügyelőbizottság bejelentést tehet a társasházi hatóságnál (járásbíróság, járási hivatal) a törvény megsértése miatt.',
                },
                {
                  szam: '3',
                  cim: 'Közgyűlési napirendre tűzés',
                  leiras:
                    'Bármely kérdést — beleértve a közös képviselő visszahívásának javaslatát — napirendre tűzethet a következő közgyűlésen.',
                },
              ].map((item) => (
                <div key={item.szam} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-black text-white">
                    {item.szam}
                  </div>
                  <div>
                    <p className="mb-1 font-bold text-slate-900">{item.cim}</p>
                    <p className="text-sm leading-relaxed text-slate-500">{item.leiras}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Digitális kor */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <BarChart3 size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Felügyelőbizottság a digitális korban
            </h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              A hagyományos felügyelőbizottsági munka egyik legnagyobb kihívása az volt, hogy
              a szükséges dokumentumok — bankszámlakivonatok, számlák, szerződések — csak
              személyesen, a közös képviselőnél voltak elérhetők. Ez lassította az ellenőrzést
              és növelte a konfliktus esélyét.
            </p>
            <p className="leading-relaxed">
              A PanelLakó platform ezt a problémát strukturálisan oldja meg. A felügyelőbizottság
              tagjai <strong className="text-slate-800">valós idejű hozzáférést kapnak</strong> a
              társasház digitális dokumentumtárához, a pénzügyi összesítőkhöz és a hibabejelentési
              naplóhoz — anélkül, hogy egyenként kellene kérniük a dokumentumokat a közös képviselőtől.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  cim: 'Pénzügyi átláthatóság',
                  szoveg:
                    'A bevételek, kiadások és az éves elszámolás az összes jogosult számára valós időben elérhető — nincsenek rejtett tranzakciók.',
                  szin: 'border-brand-200 bg-brand-50',
                  cimSzin: 'text-brand-700',
                },
                {
                  cim: 'Dokumentumtár-hozzáférés',
                  szoveg:
                    'Szerződések, határozatok, közgyűlési jegyzőkönyvek egy helyen tárolva — a felügyelőbizottság bármikor visszakereshet és letölthet.',
                  szin: 'border-slate-200 bg-slate-50',
                  cimSzin: 'text-slate-700',
                },
                {
                  cim: 'Hibabejelentési napló',
                  szoveg:
                    'Minden bejelentés státusza, határideje és a megtett lépések rögzítve vannak — az ellenőrzés másodpercek alatt elvégezhető.',
                  szin: 'border-slate-200 bg-slate-50',
                  cimSzin: 'text-slate-700',
                },
              ].map((card) => (
                <div key={card.cim} className={`rounded-xl border p-4 ${card.szin}`}>
                  <p className={`mb-1.5 font-bold ${card.cimSzin}`}>{card.cim}</p>
                  <p className="text-sm leading-relaxed text-slate-600">{card.szoveg}</p>
                </div>
              ))}
            </div>
            <p className="leading-relaxed">
              A digitális dokumentumkezelés azt is megkönnyíti, hogy a felügyelőbizottság
              ülésein már előkészített összefoglalók álljanak rendelkezésre, ne kelljen manuálisan
              összegyűjteni az adatokat. Az ülések rövidebbekké és hatékonyabbakká válnak — a tagok
              az ellenőrzésre, nem az adatgyűjtésre fordíthatják az idejüket.
            </p>
          </div>
        </section>

        {/* Back link */}
        <div className="mb-10">
          <Link
            href="/tarsashaz-kezeles"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600"
          >
            <ChevronRight size={14} className="rotate-180" />
            Vissza: Társasházkezelés útmutató
          </Link>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-lg">
          <h2 className="mb-2 text-2xl font-black text-white">
            Hatékonyabb felügyelőbizottsági ellenőrzés
          </h2>
          <p className="mb-6 text-brand-100">
            A PanelLakó felügyelőbizottsági modulja valós idejű pénzügyi hozzáférést, digitális
            dokumentumtárat és hibabejelentési naplót kínál — hogy az ellenőrzés tényleg
            ellenőrzés legyen, ne iratok utáni keresgélés.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-50"
            >
              <ShieldCheck size={16} />
              Ingyenes regisztráció
            </Link>
            <Link
              href="/tarsashaz-kezeles"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/10"
            >
              Több cikk <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
