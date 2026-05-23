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
  ArrowRight,
  Gavel,
  ClipboardList,
  UserCheck,
  RefreshCw,
  Search,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Közös Képviselő Választása és Visszahívása — Eljárási Útmutató | PanelLakó',
  description:
    'Hogyan választunk közös képviselőt? Pályáztatás, megbízási szerződés, visszahívás menete, összeférhetetlenség — 2003. évi CXXXIII. törvény alapján részletesen.',
  alternates: { canonical: 'https://panellako.hu/tarsashaz-kezeles/kozos-kepviselo-valasztasa' },
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
      name: 'Közös képviselő választása',
      item: 'https://panellako.hu/tarsashaz-kezeles/kozos-kepviselo-valasztasa',
    },
  ],
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Közös képviselő választása és visszahívása — lépésről lépésre',
  description:
    'Hogyan választunk közös képviselőt? Pályáztatás, megbízási szerződés, visszahívás menete, összeférhetetlenség — 2003. évi CXXXIII. törvény alapján részletesen.',
  url: 'https://panellako.hu/tarsashaz-kezeles/kozos-kepviselo-valasztasa',
  publisher: { '@type': 'Organization', name: 'PanelLakó', url: 'https://panellako.hu' },
  inLanguage: 'hu',
};

const SZERZODES_ELEMEK = [
  {
    elem: 'Feladatok pontos körülírása',
    leiras:
      'Milyen üzemeltetési, pénzügyi, kommunikációs és képviseleti feladatokat lát el a képviselő? A pontatlan feladatleírás a visszahívásnál és kártérítési igénynél nehezíti az eljárást.',
  },
  {
    elem: 'Díjazás és elszámolás rendje',
    leiras:
      'Havi átalány, rezsióradíj vagy vegyes díjazás? Az elszámolás módja, a számlázás határideje, és az esetleges pluszköltségek (pl. ügyvédi megbízás) kezelése.',
  },
  {
    elem: 'Felmondás feltételei',
    leiras:
      'Felmondási idő (legfeljebb 90 nap), azonnali hatályú felmondás feltételei, a felmondás közlésének módja (írásban, tértivevénnyel).',
  },
  {
    elem: 'Számadási kötelezettség',
    leiras:
      'Megbízatás megszűnésekor a képviselő köteles teljes körű pénzügyi elszámolást adni, az iratok, pénzeszközök és kulcsok átadásával együtt.',
  },
  {
    elem: 'Felelősségkorlátozás mértéke',
    leiras:
      'A Ptk. megengedi a felelősség szerződéses korlátozását, de a szándékos és súlyosan gondatlan magatartásért vállalt felelősség nem zárható ki.',
  },
  {
    elem: 'Helyettesítés és titoktartás',
    leiras:
      'Ki helyettesíti a képviselőt akadályoztatás esetén? A társasházi adatok kezelésének titoktartási szabályai (GDPR-megfelelőség).',
  },
];

const KERDESEK_INTERJUN = [
  'Hány társasház kezelését látja el jelenleg, és van-e kapacitás egy újabb épületre?',
  'Milyen informatikai rendszert használ a pénzügyi nyilvántartáshoz és a kommunikációhoz?',
  'Hogyan kezeli a sürgős hibabejelentéseket munkaidőn kívül?',
  'Tud-e referenciát adni hasonló méretű és korú épületből?',
  'Milyen tapasztalata van felújítási projektek lebonyolításában (pályázat, kivitelező-kiválasztás)?',
  'Hogyan biztosítja, hogy a tulajdonosok naprakészek legyenek a fontos ügyekről?',
];

const ATADAS_LISTA = [
  'Társasház összes kulcsa (pince, tető, gépház, postafiókok)',
  'Teljes pénzügyi nyilvántartás és bankszámla feletti rendelkezési jog átruházása',
  'Összes szerződés, ajánlat, garancialevél eredeti példánya',
  'Határozatkönyv, közgyűlési jegyzőkönyvek, tulajdonosi nyilvántartás',
  'Folyamatban lévő ügyek részletes összefoglalója (határidők, felelősök)',
  'Biztosítási kötvény és káreseményekkel kapcsolatos iratok',
  'Felújítási alap egyenlege és felhasználásának dokumentációja',
];

export default function KozosKepviseloValasztasaPage() {
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
          <span className="font-medium text-slate-600">Közös képviselő választása</span>
        </nav>

        {/* Hero */}
        <div className="mb-12">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <UserCheck size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Közös képviselő választása és visszahívása — lépésről lépésre
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            A közös képviselő a társasház végrehajtó szerve: ő köti a szerződéseket, kezeli
            a pénzügyeket, képviseli a társasházat hatóságokkal és vállalkozókkal szemben.
            A 2003. évi CXXXIII. törvény (Ttv.) 27–33. §-ai részletesen meghatározzák, ki
            töltheti be ezt a szerepet, hogyan kell megválasztani és mikor lehet visszahívni.
          </p>
        </div>

        {/* Ki lehet közös képviselő */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Users size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Ki lehet közös képviselő? — Ttv. 27. §
            </h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              Közös képviselő lehet <strong className="text-slate-800">természetes személy</strong> (tulajdonos
              és nem tulajdonos egyaránt) vagy <strong className="text-slate-800">gazdálkodó szervezet</strong>{' '}
              (Kft., Bt., egyéni vállalkozó). A törvény nem írja elő ingatlankezelői szakképesítés meglétét —
              de szakmai szempontból erősen ajánlott, különösen nagyobb épületeknél.
            </p>
            <p className="leading-relaxed">
              A törvényi összeférhetetlenségi szabály egyetlen, de alapvető korlátot tartalmaz:
              aki közös képviselőként dolgozik, <strong className="text-slate-800">nem lehet egyszerre
              a felügyelőbizottság tagja</strong>, és a Ptk. szerinti közeli hozzátartozója sem tölthet
              be felügyelőbizottsági tagságot ugyanabban a társasházban. Ez a szabály az ellenőrzési
              és a végrehajtási funkció szétválasztását szolgálja.
            </p>
            <p className="leading-relaxed">
              Az SZMSZ kiegészítő összeférhetetlenségi szabályokat is megállapíthat — például
              előírhatja, hogy a közös képviselő ne lehessen egyszerre az épületben dolgozó
              vállalkozó alvállalkozója, hogy a közbeszerzési jellegű döntéseknél ne álljon fenn
              érdekkonfliktus.
            </p>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-800">
                  <strong>Szakmai szempont:</strong> Bár a törvény nem teszi kötelezővé az
                  ingatlankezelői képesítést, a Magyar Ingatlankezelők és Üzemeltetők Országos
                  Szövetsége (MIOSZ) akkreditált tanfolyamokat kínál. Pályáztatáskor érdemes
                  ezt szempontként szerepeltetni.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* A választás menete */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Gavel size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">A választás menete</h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              A közös képviselőt a <strong className="text-slate-800">közgyűlés választja</strong> egyszerű
              többséggel — az összes tulajdoni hányad több mint 50%-ának igenlő szavazatával. A határozat
              érvényességéhez nem szükséges minősített arány, kivéve, ha az SZMSZ eltérően rendelkezik.
            </p>
            <p className="leading-relaxed">
              A legjobb gyakorlat szerint a jelölteknek <strong className="text-slate-800">bemutatkozási
              lehetőséget</strong> kell biztosítani a szavazás előtt: rövid előadásban ismertethessék
              tapasztalataikat, módszereiket, referenciáikat és díjajánlatukat. Ha több jelölt indul,
              érdemes előzetesen írott <strong className="text-slate-800">pályázatot</strong> bekérni,
              amelynek szempontrendszerét a közgyűlési meghívóval együtt közzé kell tenni.
            </p>
            <p className="leading-relaxed">
              A versenyeztetés (pályáztatás) nem törvényi kötelezettség, de komolyan növeli a döntés
              átláthatóságát és csökkenti a helytelen választás kockázatát. Ha több jelölt van, a szavazás
              lehet egyfordulós (a legtöbb szavazatot kapott jelölt nyer, ha megvan az 50%+1 szükséges arány)
              vagy kétfordulós (ha az első fordulóban senki nem szerez abszolút többséget).
            </p>
          </div>
        </section>

        {/* Megbízási szerződés */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <FileText size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              A megbízási szerződés tartalma
            </h2>
          </div>
          <p className="mb-6 leading-relaxed text-slate-500">
            A közgyűlési határozat önmagában nem elegendő — a közös képviselővel
            <strong className="text-slate-700"> írásos megbízási szerződést</strong> kell kötni.
            A szerződés a felek közötti jogvita esetén az egyetlen hiteles dokumentum. Az alábbi
            elemek mindenképpen szerepeljenek benne.
          </p>
          <div className="space-y-3">
            {SZERZODES_ELEMEK.map((item) => (
              <div key={item.elem} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                  <CheckCircle size={15} className="text-brand-500" />
                </div>
                <div>
                  <p className="mb-1 font-bold text-slate-900">{item.elem}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{item.leiras}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Díjazás */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Scale size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Díjazás szokásos mértéke
            </h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              A közös képviselői díjazásra nincs törvényi minimum vagy maximum — a piac határozza meg.
              Budapesten az általánosan elfogadott sáv
              <strong className="text-slate-800"> albetétenként havi 1 500–5 000 Ft</strong> között
              mozog, de a konkrét összeg számos tényezőtől függ.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  cim: 'Épület mérete',
                  szoveg:
                    'Kisebb épületeknél (10–20 albetét) magasabb az egységár, mert a fix adminisztratív terhe arányosan nagyobb. Nagy épületeknél (50+ albetét) alacsonyabb fajlagos díj szokásos.',
                  szin: 'border-brand-200 bg-brand-50',
                  cimSzin: 'text-brand-700',
                },
                {
                  cim: 'Feladatok köre',
                  szoveg:
                    'Ha a képviselő teljes körű üzemeltetést vállal (hibabejelentések, vállalkozók koordinálása, ügyfélszolgálat), magasabb díj indokolt, mint alap adminisztrációnál.',
                  szin: 'border-slate-200 bg-slate-50',
                  cimSzin: 'text-slate-700',
                },
                {
                  cim: 'Épület kora és állapota',
                  szoveg:
                    'Régebbi, leromlott állapotú épületek több hibabejelentést és koordinációs munkát generálnak — ezt a díjnak tükröznie kell, vagy külön rezsióradíjban érdemes rögzíteni.',
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
            <p className="text-sm text-slate-400">
              A fenti összegek tájékoztató jellegűek és nem minősülnek jogi tanácsadásnak.
              Vidéki nagyvárosokban az árak általában 20–30%-kal alacsonyabbak a budapesti szintnél.
            </p>
          </div>
        </section>

        {/* Visszahívás */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <RefreshCw size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              A közös képviselő visszahívása — Ttv. 33. §
            </h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              A közgyűlés a közös képviselőt <strong className="text-slate-800">bármikor visszahívhatja</strong> —
              a visszahíváshoz elegendő az egyszerű többség (az összes tulajdoni hányad több mint 50%-a).
              A visszahíváshoz nem szükséges indokot megjelölni, de a kötelezettségszegés dokumentálása
              megkönnyítheti az esetleges kártérítési igény érvényesítését.
            </p>
            <p className="leading-relaxed">
              Fontos korlát: a megbízási szerződésben rögzített felmondási idő
              <strong className="text-slate-800"> legfeljebb 90 nap</strong> lehet (Ttv. 33. §).
              Ha a szerződés ennél hosszabb felmondási időt tartalmazna, az a törvény erejénél fogva
              semmis, és 90 napra csökken. Ez a szabály a tulajdonosokat védi az esetleg hátrányos
              feltételekkel megkötött szerződésektől.
            </p>
            <div className="rounded-xl border border-brand-100 bg-brand-50 p-5">
              <div className="flex gap-3">
                <CheckCircle size={18} className="mt-0.5 shrink-0 text-brand-600" />
                <div>
                  <p className="mb-1 font-bold text-brand-800">Eljárási rend</p>
                  <p className="text-sm leading-relaxed text-brand-700">
                    1. A tulajdonosok legalább 1/4-e (tulajdoni hányad alapján) visszahívási
                    rendkívüli közgyűlést kezdeményez.&ensp;
                    2. A közgyűlés határozatot hoz egyszerű többséggel.&ensp;
                    3. A határozatot írásban közlik a közös képviselővel.&ensp;
                    4. Megkezdődik a legfeljebb 90 napos felmondási idő, amelyen belül az
                    átadás-átvételt le kell folytatni.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Rendkívüli visszahívás */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <AlertTriangle size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Rendkívüli visszahívás — kötelezettségszegés esetén
            </h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              Ha a közös képviselő súlyos kötelezettségszegést követ el — például sikkasztást, a
              tulajdonosok félrevezetését, a törvény vagy az SZMSZ nyilvánvaló megsértését —, a
              közgyűlés <strong className="text-slate-800">azonnali hatályú visszahívásról</strong> dönthet.
              Az azonnali visszahívás esetén a felmondási idő nem alkalmazható.
            </p>
            <p className="leading-relaxed">
              Az azonnali visszahíváshoz azonban szükséges, hogy a tényállás kellően alátámasztott
              legyen. A közgyűlési határozatban érdemes rögzíteni a kötelezettségszegés konkrét
              eseteit és időpontjait. Ha a visszahívott képviselő vitatja a döntést, bírósághoz
              fordulhat — de a bírósági eljárás nem függeszti fel a visszahívást.
            </p>
            <p className="leading-relaxed">
              Az azonnali visszahívás után is kötelező a <strong className="text-slate-800">számadás</strong>:
              a volt közös képviselő haladéktalanul köteles elszámolni az általa kezelt pénzeszközökkel,
              és az összes iratot, kulcsot, hozzáférési adatot (internet, kamerarendszer, kapunyitó)
              átadni az új képviselőnek vagy az arra kijelölt tulajdonosnak.
            </p>
          </div>
        </section>

        {/* Átadás-átvétel */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <ClipboardList size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Átadás-átvétel — mit és mennyi idő alatt kell átadni?
            </h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              Az átadás-átvételre a megbízatás megszűnésétől számított
              <strong className="text-slate-800"> 30 napon belül</strong> kell sort keríteni.
              Ezt az időkorlátot a törvény is rögzíti; ha a volt képviselő nem tesz eleget az
              átadási kötelezettségnek, a társasház bíróság útján kényszerezheti ki, és
              kártérítési igényt érvényesíthet.
            </p>
            <p className="mb-3 font-semibold text-slate-800">
              Az átadás kötelező tartalma:
            </p>
            <ul className="space-y-2 text-sm">
              {ATADAS_LISTA.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle size={14} className="mt-0.5 shrink-0 text-brand-500" />
                  <span className="text-slate-600">{item}</span>
                </li>
              ))}
            </ul>
            <p className="leading-relaxed">
              Az átadás-átvételről <strong className="text-slate-800">írásos jegyzőkönyvet</strong> kell
              felvenni, amelyet mindkét fél aláír. A hiányos átadás tényét is rögzíteni kell —
              ez alapozza meg a kártérítési igényt.
            </p>
          </div>
        </section>

        {/* Keresési stratégiák */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Search size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Új közös képviselő keresési stratégiái
            </h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              Ha a társasháznak új közös képviselőt kell találnia, érdemes több csatornán egyidejűleg
              hirdetni. A <strong className="text-slate-800">szomszédos társasházak</strong> ajánlása
              az egyik legjobb forrás — egy általuk elégedetten használt képviselő már bizonyított.
              Online hirdetési platformokon (ingatlankezelési portálok, Facebook csoportok, helyi
              fórumok) szintén megtalálhatók a pályázók. A MIOSZ tagnyilvántartása szintén hasznos
              kiindulópont, mivel az ott szereplő kezelők szakmai képesítéssel rendelkeznek.
            </p>
            <p className="mb-3 font-semibold text-slate-800">Kérdések az interjún:</p>
            <ul className="space-y-2 text-sm">
              {KERDESEK_INTERJUN.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Building2 size={14} className="mt-0.5 shrink-0 text-brand-500" />
                  <span className="text-slate-600">{item}</span>
                </li>
              ))}
            </ul>
            <p className="leading-relaxed">
              Egyes társasházak <strong className="text-slate-800">próbaidőszakot</strong> kötnek ki
              a szerződésben (pl. 3 hónap, amelynek letelte előtt mindkét fél mondhat fel rövidebb
              felmondási idővel). Ez hasznos biztonsági háló, különösen ha a képviselőnek nincs
              elegendő helyi referenciája. A próbaidőszak feltételeit a megbízási szerződésben
              pontosan rögzíteni kell.
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
            PanelLakó közös képviselőknek
          </h2>
          <p className="mb-6 text-brand-100">
            Legyen Ön az a közös képviselő, akit a tulajdonosok örömmel választanak újra.
            A PanelLakó átlátható pénzügyi kimutatásokkal, digitális dokumentumtárral és
            hatékony kommunikációs eszközökkel segíti a napi munkát.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-50"
            >
              <UserCheck size={16} />
              Kipróbálom ingyen
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
