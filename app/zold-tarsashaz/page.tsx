import type { Metadata } from 'next';
import type { Route } from 'next';
import Link from 'next/link';
import {
  Leaf,
  ChevronRight,
  Sun,
  Thermometer,
  Zap,
  Trash2,
  Vote,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Building2,
  Scale,
  TrendingDown,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Zöld Társasház — Fenntartható Épületüzemeltetés és Felújítás | PanelLakó',
  description:
    'Hogyan lesz a társasház zöldebb? Napelemes rendszerek, hőszigetelés, zöldtető, e-autó töltők, és a szükséges határozatok megszerzése közgyűlésen.',
  alternates: { canonical: 'https://panellako.hu/zold-tarsashaz' },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Főoldal', item: 'https://panellako.hu' },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Zöld Társasház',
      item: 'https://panellako.hu/zold-tarsashaz',
    },
  ],
};

const PILLAR_ARTICLES = [
  {
    href: '/zold-tarsashaz/napelem-tarsashazban',
    icon: Sun,
    title: 'Naperőmű tervezés lépésről lépésre',
    summary:
      'Hogyan mérje fel a tető kapacitását, kérjen ajánlatokat, és vigye a döntést közgyűlés elé? Tervezési és engedélyezési útmutató.',
  },
  {
    href: '/zold-tarsashaz/hoszigeteles-panelprogram',
    icon: Thermometer,
    title: 'Hőszigetelési pályázatok 2024–2025',
    summary:
      'Az Otthon Felújítási Program és az EU-s alapok által finanszírozott hőszigetelési támogatások feltételei, igénylési folyamata.',
  },
  {
    href: '/zold-tarsashaz/ev-tolto-tarsashazban',
    icon: Zap,
    title: 'EV töltő bevezetése a mélygarázsban',
    summary:
      'A 2021. évi CXLIII. tv. alapján az egyedi töltési kérelmek kezelése, mérő bővítés, közös töltési infrastruktúra kialakítása.',
  },
];

export default function ZoldTarsashazPillarPage() {
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
          <span className="font-medium text-slate-600">Zöld Társasház</span>
        </nav>

        {/* Hero */}
        <div className="mb-14 animate-fade-in-up">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <Leaf size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Zöld társasház — fenntartható épületüzemeltetés
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            A magyarországi társasházak energiafelhasználása az ország teljes épületállományának jelentős részét
            teszi ki. A zöldítés nemcsak az éghajlat védelme miatt fontos: a lakók közvetlen pénzügyi hasznot
            realizálnak alacsonyabb rezsiköltségek formájában, az ingatlan értéke nő, és a 2024-től kötelező
            energetikai tanúsítványok eredménye is javul. Az EU takszonómia és az Otthon Felújítási Program
            tovább erősíti a zöld beruházások vonzerejét — ezért érdemes most lépni.
          </p>
        </div>

        {/* Article cards */}
        <section className="mb-16">
          <h2 className="mb-2 text-2xl font-black text-slate-900">Részletes témakörök</h2>
          <p className="mb-7 text-slate-500">
            Válassza ki az Önnek leginkább releváns zöld fejlesztési területet, vagy olvassa végig az egész útmutatót.
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

        {/* Napelemes rendszerek */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Sun size={20} className="text-amber-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Napelemes rendszerek telepítése</h2>
          </div>
          <p className="leading-relaxed">
            A közös tetőn elhelyezett napelemrendszer az egyik leglátványosabb megtakarítást hozó beruházás,
            amelyet egy társasház megvalósíthat. A közös helyiségek (lépcsőház, lift, folyosói világítás,
            mélygarázs) áramköltségét akár 60–80%-kal csökkenthetik a megfelelően méretezett rendszerek,
            és a felesleges energiát a METÁR (Megújuló Energiaforrások Támogatási Rendszere) keretein belül
            vissza is lehet táplálni a hálózatba.
          </p>
          <p className="leading-relaxed">
            A 2023-as szabályozási változások (338/2022. Korm. rendelet módosítása) alapján a közös tulajdonú
            tetőre telepített napelemrendszer esetén a megtermelt energiát megosztott energia (közösségi
            energiamegosztás) alapján lehet elosztani a tulajdonosok között, ami újabb megtakarítási lehetőséget
            jelent az egyéni lakásokban is. Az ELMŰ/ÉMÁSZ hálózathoz való csatlakozáshoz engedélyes tervező
            bevonása és hálózati csatlakozási kérelem benyújtása szükséges — ez átlagosan 3–6 hónapot vesz
            igénybe.
          </p>
          <p className="leading-relaxed">
            A megtérülési idő egy átlagos 10–30 kWp teljesítményű, társasházi közös tetőre telepített rendszer
            esetén jelenleg 6–10 év — de az energiaárak emelkedésével és a támogatási konstrukciókkal ez
            tovább csökkenhet. A befektetés a társasházi vagyon növelésével is jár: az energetikai tanúsítvány
            pontszáma javul, ami közvetlen hatással van az ingatlanok értékére.
          </p>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <p className="mb-1 font-bold text-slate-900">Közgyűlési határozat szükséges</p>
                <p className="text-sm leading-relaxed text-slate-600">
                  A napelemrendszer telepítése a közös tulajdont érinti, ezért a 2003. évi CXXXIII. törvény
                  24. § (3) bekezdése alapján az összes tulajdoni hányad legalább kétharmadának (2/3)
                  jóváhagyása szükséges. A határozat nélkül megkezdett munkálatok jogi vitát vonhatnak maguk
                  után, és az ELMŰ/ÉMÁSZ sem ad csatlakozási engedélyt a tulajdonosi döntés igazolása nélkül.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Hőszigetelés */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
              <Thermometer size={20} className="text-orange-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Hőszigetelés és panelprogram</h2>
          </div>
          <p className="leading-relaxed">
            Magyarországon az épületállomány döntő része az 1960–1990-es évek között épült panelházakból áll,
            amelyek energetikai minősége mai szemmel rendkívül gyenge. A homlokzati hőszigetelés, a nyílászárócsere
            és a tetőfelújítás egyszerre csökkenti a fűtési és hűtési energiaigényt, javítja a lakókomfortot,
            és növeli az ingatlanok piaci értékét.
          </p>
          <p className="leading-relaxed">
            Az Otthon Felújítási Program (OFP) keretében a társasházak komplex energetikai felújításra
            pályázhatnak: homlokzati hőszigetelés, tetőfelújítás, nyílászárócsere és fűtési rendszer
            korszerűsítés egyszerre finanszírozható. A feltételek között szerepel az energetikai audit elvégzése,
            az EPC (Energy Performance Certificate) legalább C osztályra való javítása, és a projekt
            megvalósítási ütemterv benyújtása. A 2024. január 1-től kötelező energetikai tanúsítvány megújítása
            szintén ösztönzi a felújítást, hiszen a jobb besorolás közvetlenül befolyásolja az ingatlan
            eladhatóságát és hitelezhetőségét.
          </p>
          <p className="leading-relaxed">
            Egy jól kivitelezett hőszigetelés a fűtési költségeket átlagosan 30–50%-kal csökkenti. A
            megtérülési idő 10–15 év, de ha a felújítást pályázati forrásból finanszírozzák, ez az időszak
            jelentősen lerövidülhet. Az épület CO₂-kibocsátása is drasztikusan csökken, ami az EU takszonómia
            szerinti zöld besoroláshoz is hozzájárul — ez a lakóingatlan-finanszírozás és -értékelés szempontjából
            egyre fontosabb szempont.
          </p>
        </section>

        {/* Zöldtető */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <Leaf size={20} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Zöldtető és esővíz-visszatartás</h2>
          </div>
          <p className="leading-relaxed">
            A zöldtető nemcsak esztétikai megoldás: bizonyított tény, hogy a növényzettel borított tetőfelület
            10–15 °C-kal mérsékeli a tetőfelszín hőmérsékletét, csökkentve ezzel a városi hősziget-hatást
            és a felső lakások hűtési igényét. Emellett a zöldtető biodiverzitást is növel — méhek, rovarok
            és madarak számára biztosít élőhelyet a sűrűn beépített városi környezetben.
          </p>
          <p className="leading-relaxed">
            Az esővíz-visszatartás a zöldtető egyik legfontosabb járulékos haszna: a csapadékvíz egy részét
            a növényzet és a szubsztrátum visszatartja, csökkentve a szennyvízhálózatra nehezedő terhelést.
            Ezt ki lehet egészíteni esővízgyűjtő tartályokkal, amelyek vizét öntözésre vagy WC-öblítésre
            lehet felhasználni — ez a vízszolgáltatási díjat is mérsékeli.
          </p>
          <p className="leading-relaxed">
            Fontos technikai előfeltétel a szerkezeti teherbírás ellenőrzése: egy extenzív zöldtető
            (vékony szubsztrátumréteg, szárazságtűrő növények) négyzetméterenkénti terhele kb. 80–150 kg/m²,
            míg az intenzív változat (mélyebb termőréteg, fák és cserjék) akár 400–600 kg/m²-t is elérhet.
            Szakértői statikai vizsgálat nélkül nem indítható el a beruházás. Budapest egyes kerületei
            (pl. XIII., XIV. kerület) önkormányzati támogatást nyújtanak zöldtető-telepítéshez.
          </p>
        </section>

        {/* EV töltők */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Zap size={20} className="text-blue-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Elektromos autó töltők (EV)</h2>
          </div>
          <p className="leading-relaxed">
            A 2021. évi CXLIII. törvény 2022. január 1-től kötelezővé tette, hogy a társasházak az egyedi
            lakástulajdonosok kérelmére lehetővé tegyék elektromos töltőpont kiépítését a saját parkolóhelyükön
            vagy tárolójukban, feltéve, hogy az műszakilag lehetséges és a kérelmező vállalja a felmerülő
            költségeket. A közös képviselő nem utasíthatja el az ilyen kérelmet puszta hivatkozással a
            többség ellenállására — a törvény ezt egyéni jogként rögzíti.
          </p>
          <p className="leading-relaxed">
            A közös elektromos infrastruktúra (főelosztó, mérőhely) bővítése azonban már közös döntést
            igényel, és a 2003. évi CXXXIII. törvény szabályai szerint a közgyűlés határozathozatali
            rendjébe esik. Ha a parkolóház vagy mélygarázs közös tulajdon, a töltők közös beruházásként is
            megvalósíthatók — ez esetben az összes tulajdonos arányosan viseli a költségeket, és mindenki
            igénybe veheti a töltési szolgáltatást. Léteznek olyan okostöltő-megoldások, amelyek egyedi
            fogyasztásmérést biztosítanak, így mindenki csak a saját fogyasztásáért fizet.
          </p>
          <p className="leading-relaxed">
            A mérőbővítési igényt az ELMŰ/ÉMÁSZ felé kell benyújtani, amelynek elbírálása 30–90 napot
            vehet igénybe. Érdemes ezt párhuzamosan kezelni a közgyűlési határozattal, hogy a beruházás
            ne csússzon el feleslegesen.
          </p>
        </section>

        {/* Hulladékcsökkentés */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
              <Trash2 size={20} className="text-teal-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Hulladékcsökkentés és szelektív gyűjtés</h2>
          </div>
          <p className="leading-relaxed">
            A 2023-ban hatályba lépett módosított hulladéktörvény (2012. évi CLXXXV. tv. novellája) megerősítette
            a szelektív hulladékgyűjtés kötelező biztosítását a lakóépületek közös területein. A közös képviselő
            felelőssége gondoskodni arról, hogy megfelelő számú és méretű szelektív gyűjtőedény álljon
            rendelkezésre (papír, műanyag-fém, üveg, biohulladék), és a lakók tájékoztatást kapjanak a
            helyes szelektálási gyakorlatról.
          </p>
          <p className="leading-relaxed">
            A biohulladék-gyűjtés 2024-től általánossá vált a nagyobb városokban: a zöldhulladékot és
            az élelmiszerhulladékot egyre több helyen kötelező elkülönítetten gyűjteni. Ahol az udvar
            lehetővé teszi, közös komposztáló elhelyezése is megfontolandó — a komposzt a zöldtető,
            a közös kert vagy a szobanövények trágyájaként hasznosítható, és csökkenti a maradék
            hulladék mennyiségét.
          </p>
          <p className="leading-relaxed">
            A hulladékcsökkentési intézkedések nem igényelnek különösebb beruházást, mégis hozzájárulnak
            a társasház fenntarthatósági profiljának javításához, és komoly megtakarítást hozhatnak a
            hulladékszállítási díjaknál — különösen, ha csökken az ürítési szükséglet.
          </p>
        </section>

        {/* Közgyűlési határozat */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <Vote size={20} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Hogyan hozzon határozatot a közgyűlés?</h2>
          </div>
          <p className="leading-relaxed">
            A zöld beruházások döntő részéhez közgyűlési határozat szükséges — a szükséges szavazatarány
            a beruházás jellegétől függ. A 2003. évi CXXXIII. törvény a következő szavazatarányokat rögzíti:
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Egyszerű többség (50%+1):</strong> kisebb karbantartási
                munkák, szelektív hulladékgyűjtő edények elhelyezése, tájékoztató táblák kihelyezése,
                komposztáló telepítése az udvaron.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Minősített 2/3-os többség:</strong> napelemrendszer
                telepítése a közös tetőn, zöldtető kialakítása, homlokzati hőszigetelés, az SZMSZ
                módosítása (pl. EV töltési szabályzat beillesztése), alapító okirat módosítása.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
              <span>
                <strong className="text-slate-900">Az ellenszavazók érdekeinek figyelembevétele:</strong>{' '}
                a 2/3 feletti többséggel meghozott határozat kötelező erejű minden tulajdonosra —
                beleértve az ellenszavazókat is. Azonban a méltányossági elv megköveteli, hogy a
                beruházás indokoltságát, a várható megtérülést és az anyagi terhet átlátható
                módon dokumentálják, hogy a határozat esetleges megtámadása esetén is megállják a helyüket.
              </span>
            </li>
          </ul>
          <p className="leading-relaxed">
            A leggyakoribb hiba az, hogy a közgyűlés előtt nem készítenek elegendő előkészítő anyagot:
            árajánlatokat, energetikai számításokat, megtérülési kalkulációt. Ezek nélkül a 2/3-os
            többség megszerzése nehezebb, és a határozat jogi sebezhetőbb is. A PanelLakó dokumentumtár
            modulja segít ezeket az anyagokat strukturáltan tárolni és a lakókkal megosztani.
          </p>
        </section>

        {/* Miért érdemes most lépni */}
        <section className="mb-16 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-8">
          <div className="mb-6 flex items-center gap-3">
            <TrendingDown size={20} className="text-brand-600" />
            <h2 className="text-xl font-black text-slate-900">Miért érdemes most zöldíteni?</h2>
          </div>
          <div className="space-y-5">
            <div className="border-l-2 border-brand-300 pl-4">
              <p className="font-bold text-slate-900">Energiaköltség megtakarítás</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                A rezsiköltségek 2022–2024 között ugrásszerűen nőttek. Egy jól zöldített társasház
                évi 1–3 millió forintnyi közös költséget takaríthat meg, amit a lakók közvetlenül érzékelnek
                a havi befizetéseikben.
              </p>
            </div>
            <div className="border-l-2 border-brand-300 pl-4">
              <p className="font-bold text-slate-900">Ingatlanérték növekedése</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Az energetikai tanúsítvány osztályzata közvetlen hatással van az ingatlan piaci értékére
                és jelzáloghitelezhetőségére. Az A vagy B osztályú épületekben lévő lakások akár 10–20%-kal
                magasabb áron értékesíthetők, mint az azonos méretű, rosszabb besorolású ingatlanok.
              </p>
            </div>
            <div className="border-l-2 border-brand-300 pl-4">
              <p className="font-bold text-slate-900">EU takszonómia és finanszírozás</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Az EU Fenntartható Pénzügyi Takszonómia (2020/852/EU rendelet) alapján a zöld ingatlanok
                kedvezőbb finanszírozást kaphatnak — banki zöldhitelek, kedvezményes kamat, pályázati
                vissza nem térítendő támogatások.
              </p>
            </div>
            <div className="border-l-2 border-brand-300 pl-4">
              <p className="font-bold text-slate-900">Otthon Felújítási Program (OFP)</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                A program keretében társasházak komplex energetikai felújításra pályázhatnak akár 50–70%-os
                vissza nem térítendő támogatással. Az aktuális feltételekért és határidőkért érdemes figyelni
                az NFIS és a MABISZ kommunikációját.
              </p>
            </div>
          </div>
          <p className="mt-6 text-xs text-slate-400">
            Ez az oldal tájékoztató jellegű, és nem minősül jogi, pénzügyi vagy energetikai tanácsadásnak.
            Konkrét beruházás előtt mindig forduljon engedélyes energetikai szakértőhöz és ügyvédhez.
          </p>
        </section>

        {/* Hivatkozott jogszabályok */}
        <section className="mb-16 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-8">
          <div className="mb-6 flex items-center gap-3">
            <Scale size={20} className="text-brand-600" />
            <h2 className="text-xl font-black text-slate-900">Hivatkozott jogszabályok</h2>
          </div>
          <div className="space-y-5">
            <div className="border-l-2 border-brand-300 pl-4">
              <p className="font-bold text-slate-900">2003. évi CXXXIII. törvény — Társasháztörvény</p>
              <p className="text-sm font-medium text-brand-600">24. § — határozathozatal közös tulajdont érintő ügyekben</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                A közös tulajdonrészek átalakításához, bővítéséhez és a közös épületrészt érintő beruházásokhoz
                az összes tulajdoni hányad 2/3-ának jóváhagyása szükséges.
              </p>
            </div>
            <div className="border-l-2 border-brand-300 pl-4">
              <p className="font-bold text-slate-900">2021. évi CXLIII. törvény — Digitális és EV töltő módosítások</p>
              <p className="text-sm font-medium text-brand-600">EV töltőpontra vonatkozó kötelezettség</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Bevezette az egyéni EV töltési jogot: a társasház nem tagadhatja meg a tulajdonos kérelmére
                az elektromos töltőpont kiépítését a saját parkolóhelyén, ha az műszakilag lehetséges
                és a kérelmező viseli a költségeket.
              </p>
            </div>
            <div className="border-l-2 border-brand-300 pl-4">
              <p className="font-bold text-slate-900">338/2022. Korm. rendelet — METÁR</p>
              <p className="text-sm font-medium text-brand-600">Megújuló Energiaforrások Támogatási Rendszere</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Szabályozza a közös tulajdonú napelemrendszerek hálózatra táplálásának feltételeit és
                a megosztott energiaközösségek működési keretét.
              </p>
            </div>
            <div className="border-l-2 border-brand-300 pl-4">
              <p className="font-bold text-slate-900">2012. évi CLXXXV. törvény — Hulladéktörvény (2023-as módosítás)</p>
              <p className="text-sm font-medium text-brand-600">Szelektív hulladékgyűjtési kötelezettség</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Megerősíti a szelektív gyűjtőedények biztosítási kötelezettségét lakóépületek közös területein,
                és bevezeti a biohulladék-gyűjtési kötelezettséget a nagyobb városokban.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-lg">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Building2 size={24} className="text-white" />
          </div>
          <h2 className="mb-2 text-2xl font-black text-white">
            Kezelje a zöld fejlesztéseket digitálisan
          </h2>
          <p className="mb-6 text-brand-100">
            A PanelLakó dokumentumtár és közgyűlési modul segít a zöld beruházások előkészítésében,
            a határozatok nyilvántartásában és a lakókkal való kommunikációban.
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
