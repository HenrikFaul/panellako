import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Car,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Zap,
  Battery,
  Scale,
  Building2,
  Shield,
  FileText,
  TrendingDown,
  Leaf,
  BarChart2,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Elektromos Töltő Társasházban — Jogi Háttér | PanelLakó',
  description:
    'Hogyan kérhet és telepíthet elektromos autó töltőt a társasházi parkolóban? 2021. évi CXLIII. tv., közgyűlési döntés, egyedi vs. közös töltő, mérőbővítés.',
  alternates: { canonical: 'https://panellako.hu/zold-tarsashaz/ev-tolto-tarsashazban' },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Elektromos autó töltő a társasházi parkolóban',
  description:
    'Hogyan kérhet és telepíthet elektromos autó töltőt a társasházi parkolóban? 2021. évi CXLIII. tv., közgyűlési döntés, egyedi vs. közös töltő, mérőbővítés.',
  inLanguage: 'hu',
  url: 'https://panellako.hu/zold-tarsashaz/ev-tolto-tarsashazban',
  publisher: {
    '@type': 'Organization',
    name: 'PanelLakó',
    url: 'https://panellako.hu',
  },
  datePublished: '2024-01-15',
  dateModified: '2026-05-23',
  author: { '@type': 'Organization', name: 'PanelLakó', url: 'https://panellako.hu' },
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
    {
      '@type': 'ListItem',
      position: 3,
      name: 'EV Töltő Társasházban',
      item: 'https://panellako.hu/zold-tarsashaz/ev-tolto-tarsashazban',
    },
  ],
};

const PROCEDURE_STEPS = [
  {
    number: '1',
    title: 'Írásbeli kérelem benyújtása',
    description:
      'A tulajdonos írásban kéri a közös képviselőtől a töltőpont kiépítésének engedélyezését. A kérelemben meg kell jelölni a töltő tervezett helyét (parkolóhely száma), a tervezett berendezés típusát és teljesítményét (pl. 7,4 kW AC Mode 3), valamint nyilatkozni kell arról, hogy a kérelmező vállalja a felmerülő összes költséget.',
  },
  {
    number: '2',
    title: 'A közös képviselő 30 napon belül válaszol',
    description:
      'A 2021. évi CXLIII. törvény alapján a közös képviselőnek 30 napon belül írásban kell reagálnia a kérelemre. A válasz tartalmazhatja a jóváhagyást, a műszaki feltételek közlését, vagy — ha az épület hálózata nem bírja el — az elutasítás műszaki indoklását. Puszta kényelmi hivatkozással, a többség ellenállásával vagy szubjektív döntéssel nem tagadható meg a hozzájárulás.',
  },
  {
    number: '3',
    title: 'Műszaki lehetőség és villamos hálózat vizsgálat',
    description:
      'A közös képviselő bevon egy villamossági tervezőt, aki megvizsgálja az épület főelosztóját, a parkoló villamos infrastruktúráját és a rendelkezésre álló szabad kapacitást. Ha a meglévő hálózat bírja a töltő terhelését (pl. 7,4 kW AC), az engedély megadható. Ha szükséges a főelosztó bővítése vagy a hálózat fejlesztése, azt az elosztótársaságnál (ELMŰ, ÉMÁSZ, E.ON) kell kérelmezni.',
  },
  {
    number: '4',
    title: 'Kivitelezés és mérő felszerelés',
    description:
      'A jóváhagyást követően az engedélyes villanyszerelő elvégzi az elektromos munkákat, az elosztótársaság felszereli a mérőberendezést a kérelmező parkolóhelyéhez. A töltő üzembe helyezésénél kötelező a hatósági próba és az elvégzett munkák dokumentálása (mérési és próbajegyzőkönyv), amelyet a közös képviselőnek is megőrizendő másolatban kell átadni.',
  },
];

const CHARGER_TYPES = [
  {
    icon: Zap,
    type: 'AC 7,4 kW — Mode 3, Type 2',
    label: 'Otthoni töltés (éjszakai)',
    desc: 'A legelterjedtebb háziasszisztált (otthoni/garázsban) töltési mód. Egy 60 kWh-s akkumulátorú autó kb. 8 órán belül teljesen feltölthető. Ez az a kapacitás, amit a legtöbb épület meglévő hálózata is elbír egy vagy két töltőpontra. Kábel: Type 2 (IEC 62196-2), ezzel kompatibilis szinte minden EU-ban forgalmazott elektromos autó.',
    color: 'bg-brand-50',
    iconColor: 'text-brand-600',
  },
  {
    icon: Zap,
    type: 'AC 11–22 kW — Mode 3, Type 2',
    label: 'Gyorsabb AC töltés',
    desc: 'Ahol az épület háromfázisú csatlakozással rendelkezik, és a hálózat bírja, 11 vagy 22 kW-os AC töltő is telepíthető. Ez felére csökkenti a töltési időt. Azonban az elosztótársasági engedély szinte biztosan szükséges ilyen teljesítménynél, és az épület főelosztójának kapacitásától is függ.',
    color: 'bg-amber-50',
    iconColor: 'text-amber-500',
  },
  {
    icon: Battery,
    type: 'DC 50 kW — CHAdeMO / CCS',
    label: 'Gyors DC töltés (nem ajánlott garázsba)',
    desc: 'A DC gyors- és villámtöltők (50–350 kW) kifejezetten nyilvános töltőállomásokhoz valók, amelyek különleges hálózati csatlakozással és hűtési rendszerekkel rendelkeznek. Egy társasházi garázsba általában nem érdemes és nem is szabad DC töltőt telepíteni — a befektetés nem arányos, és az épület hálózata ezt általában nem is bírja el.',
    color: 'bg-red-50',
    iconColor: 'text-red-500',
  },
];

const SMART_CHARGING_ITEMS = [
  {
    icon: BarChart2,
    title: 'Dinamikus terheléskezelő (load balancing)',
    text: 'Ha egy épületben több töltőpont van, a load balancing rendszer intelligensen osztja el az elérhető hálózati kapacitást a töltők között. Csúcsidőben (pl. reggel 7–9 óra, este 18–20 óra) nem haladja meg az épület összesített teljesítményigénye a főbiztosíték korlátát — a rendszer automatikusan csökkenti az egyes töltők teljesítményét, hogy minden kocsi töltődjön.',
  },
  {
    icon: Battery,
    title: 'Éjszakai töltés (overnight charging)',
    text: 'Az éjszakai töltés (22:00–06:00) egyszerre előnyös az épület és a töltőhálózat szempontjából: az épület többi fogyasztója inaktív, így a hálózat terhelése alacsony, és nincs load balancing szükség. Egyes áramszolgáltatók éjszakai elektromos tarifát kínálnak, amivel a töltési költség 30–50%-kal csökkenthető.',
  },
  {
    icon: Shield,
    title: 'Egyedi fogyasztásmérés és számlázás',
    text: 'Közös töltési infrastruktúra esetén elengedhetetlen az egyedi fogyasztásmérés. Modern okostöltők (pl. OCPP-kompatibilis berendezések) RFID kártyával azonosítják a felhasználókat, és mérik az egyéni fogyasztást — így mindenki pontosan a saját töltési igénye arányában fizet, nem a parkolóhely méretével arányosan.',
  },
];

export default function EvToltoTarsashazbanPage() {
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
          <Link href="/zold-tarsashaz" className="hover:text-slate-600">
            Zöld Társasház
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-600">EV Töltő Társasházban</span>
        </nav>

        {/* Hero */}
        <div className="mb-14">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
            <Car size={24} className="text-blue-500" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Elektromos autó töltő a társasházi parkolóban
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            Az elektromos autók száma Magyarországon 2023–2024-ben megduplázódott, és ez a tendencia
            folytatódik. Egyre több társasházi lakótulajdonos szeretné saját parkolóhelyén tölteni autóját —
            és a törvény kifejezetten lehetővé teszi ezt anélkül, hogy a közgyűlés 2/3-os jóváhagyása
            szükséges lenne. Ez az útmutató végigvezeti a jogi jogosultságon, a kérelmi folyamaton,
            a műszaki lehetőségeken és a szóba jövő töltőtípusokon.
          </p>
        </div>

        {/* Jogszabályi jogosultság */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <Scale size={20} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Jogszabályi jogosultság</h2>
          </div>
          <p className="leading-relaxed">
            A 2021. évi CXLIII. törvény (az épületek energetikai jellemzőinek meghatározásáról szóló
            törvény módosítása) 8/A. §-a 2022. január 1-jétől bevezette az egyéni elektromos töltési jogot
            Magyarországon. Ez az egyik legfontosabb jogszabályi változás, amelyet minden elektromos autót
            fontolgató társasházi lakónak ismernie kell.
          </p>
          <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle size={18} className="mt-0.5 shrink-0 text-brand-600" />
              <div>
                <p className="mb-1 font-bold text-slate-900">Nem kell 2/3-os közgyűlési többség!</p>
                <p className="text-sm leading-relaxed text-slate-600">
                  A 2021. évi CXLIII. törvény 8/A. §-a alapján az albetét-tulajdonos joga, hogy elektromos
                  töltőpontot telepíttessen a saját parkolóhelyén, feltéve, hogy az műszakilag lehetséges
                  és ő maga vállalja a felmerülő összes költséget. A közös képviselő nem tagadhatja meg a
                  hozzájárulást puszta hivatkozással a tulajdonostársak ellenállására, szubjektív döntéssel
                  vagy esztétikai okokra — a törvény ezt individuális jogként rögzíti.
                </p>
              </div>
            </div>
          </div>
          <p className="leading-relaxed">
            A törvény ugyanakkor fontos korlátot is rögzít: az egyéni jog kizárólag a saját parkolóhely
            vagy garázsbetét tekintetében érvényes. Ha a parkoló közös tulajdonú terület, és a kérelmező
            nem rendelkezik kizárólagos használatú parkolóhellyel, akkor a töltőpont elhelyezése
            közös döntést igényelhet. Ezért az albetéti és parkolóhely tulajdoni viszonyokat az SZMSZ
            és az alapító okirat alapján mindig előre tisztázni kell.
          </p>
          <p className="leading-relaxed">
            A törvény a közös képviselőt is kötelezi: az indokolt, jól dokumentált kérelemre 30 napon
            belül köteles írásban válaszolni. A hallgatás vagy az elodázás a törvény megsértése —
            ilyen esetben a kérelmező hatósági eljárást indíthat, vagy bírósághoz fordulhat.
          </p>
        </section>

        {/* Az eljárás menete */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
              <FileText size={20} className="text-teal-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Az eljárás menete lépésről lépésre</h2>
          </div>
          <div className="space-y-4">
            {PROCEDURE_STEPS.map((step) => (
              <div key={step.number} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-black text-white shadow-sm">
                  {step.number}
                </div>
                <div>
                  <p className="mb-1 font-bold text-slate-900">{step.title}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Egyedi vs közös töltő */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Car size={20} className="text-blue-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Egyedi vs. közös töltő</h2>
          </div>
          <p className="leading-relaxed">
            A társasházi töltési infrastruktúra megvalósítható egyéni és közösségi modellben is.
            A két megközelítés eltérő jogi, pénzügyi és műszaki következményekkel jár:
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                <Car size={20} className="text-brand-600" />
              </div>
              <p className="mb-2 font-bold text-slate-900">Egyedi töltő (1 kérelmező)</p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li className="flex gap-2">
                  <CheckCircle size={14} className="mt-0.5 shrink-0 text-brand-500" />
                  <span>Nem szükséges közgyűlési határozat (törvény alapján)</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle size={14} className="mt-0.5 shrink-0 text-brand-500" />
                  <span>A kérelmező viseli a töltő, a kábel és a saját mérő teljes költségét</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle size={14} className="mt-0.5 shrink-0 text-brand-500" />
                  <span>Gyorsan megvalósítható (ha a hálózat bírja)</span>
                </li>
                <li className="flex gap-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
                  <span>Ha a hálózat nem bírja, a fejlesztési költség is az egyéni kérelmezőt terheli</span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
                <Building2 size={20} className="text-teal-600" />
              </div>
              <p className="mb-2 font-bold text-slate-900">Közös töltő infrastruktúra</p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li className="flex gap-2">
                  <CheckCircle size={14} className="mt-0.5 shrink-0 text-brand-500" />
                  <span>Közösség határozattal dönt (jellemzően egyszerű vagy 2/3 többség)</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle size={14} className="mt-0.5 shrink-0 text-brand-500" />
                  <span>A beruházás megosztott — fajlagosan olcsóbb (10–20 töltőpont egyszerre)</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle size={14} className="mt-0.5 shrink-0 text-brand-500" />
                  <span>Okostöltő rendszer, egyéni mérővel — mindenki a saját fogyasztásáért fizet</span>
                </li>
                <li className="flex gap-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
                  <span>Hosszabb döntéshozatali folyamat, de jobb hosszú távú megoldás</span>
                </li>
              </ul>
            </div>
          </div>
          <p className="leading-relaxed">
            Ha több tulajdonos egyidejűleg jelent be igényt, érdemes koordinálni a kérelmeket és
            közös infrastruktúra-beruházásként kezelni — ez jelentős megtakarítást hozhat a hálózatfejlesztési
            és kivitelezési költségekben (skálázási előny).
          </p>
        </section>

        {/* Mérőbővítés */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <AlertTriangle size={20} className="text-amber-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Mérőbővítés és hálózatfejlesztés</h2>
          </div>
          <p className="leading-relaxed">
            Az egyik leggyakoribb akadály az elektromos töltők telepítésekor az épület meglévő villamos
            hálózatának korlátozott kapacitása. A probléma az, hogy a régi panelépületek villamossági
            infrastruktúrája jellemzően az 1960–80-as évek igényeihez lett méretezve — amikor sem
            mosogatógép, sem elektromos töltő nem volt jellemző fogyasztó.
          </p>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <p className="mb-1 font-bold text-slate-900">Ha az épület hálózata nem elegendő</p>
                <p className="text-sm leading-relaxed text-slate-600">
                  Ha az épület főelosztójának szabad kapacitása nem elegendő egy vagy több töltő biztonságos
                  üzemeltetéséhez, az elosztótársasági hálózatfejlesztés szükséges — ezt az E.ON, ELMŰ
                  vagy ÉMÁSZ felé kell kérelmezni. A fejlesztés határideje 30–90 nap, díja
                  pedig a fejlesztés mértékétől függően 200 ezer Ft-tól akár több millió Ft-ig terjedhet.
                  Egyéni kérelemnél ezt a kérelmező fizeti; közös beruházásnál a közösség osztja el a
                  tulajdoni arány szerint.
                </p>
              </div>
            </div>
          </div>
          <p className="leading-relaxed">
            A villamossági tervező bevonása az eljárás elején alapvető: ő az, aki megmondja, hogy az
            épület meglévő hálózata elbírja-e a terhelést, és ha nem, milyen fejlesztés szükséges és
            mibe kerül. Ez a tervező ún. MV tervező (műszaki vezető jogosultságú tervező) kell legyen,
            aki engedéllyel rendelkezik a hatósági tervdokumentáció készítésére.
          </p>
        </section>

        {/* Smart charging */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <Leaf size={20} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Smart charging és terheléskezelés</h2>
          </div>
          <p className="leading-relaxed">
            Az okostöltők (smart EV chargers) olyan berendezések, amelyek hálózati kommunikációra képesek,
            és dinamikusan képesek alkalmazkodni az épület pillanatnyi terheléséhez. Ez különösen
            fontos társasházi környezetben, ahol több töltő egyidejű használata könnyen meghaladhatná
            a főbiztosíték kapacitását.
          </p>
          <div className="space-y-4">
            {SMART_CHARGING_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="mb-1 font-bold text-slate-900">{item.title}</p>
                    <p className="text-sm leading-relaxed text-slate-500">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="leading-relaxed">
            A modern OCPP (Open Charge Point Protocol) szabványt támogató töltők bármely kompatibilis
            töltéskezelő platformmal kommunikálhatnak — ez lehetővé teszi a távelemzést, a riasztásokat
            és a töltési adatok exportálását. Ez különösen hasznos a közös képviselőnek, aki a közös
            töltési infrastruktúra üzemeltetéséért felelős.
          </p>
        </section>

        {/* Töltő típusok */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Zap size={20} className="text-blue-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Töltő típusok — melyiket válasszuk?</h2>
          </div>
          <p className="leading-relaxed">
            Az otthoni és a nyilvános töltési infrastruktúra egymástól alapvetően különbözik. Társasházi
            garázsban jellemzően az AC (váltóáramú) otthoni töltők az optimálisak — ezek az egésznapos
            parkolást kihasználva lassan, biztonságosan töltik az akkumulátort, és nem igényelnek
            különleges hálózati csatlakozást.
          </p>
          <div className="space-y-4">
            {CHARGER_TYPES.map((charger) => {
              const Icon = charger.icon;
              return (
                <div key={charger.type} className={`rounded-2xl border border-slate-200 p-5 ${charger.color}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                      <Icon size={20} className={charger.iconColor} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{charger.type}</p>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{charger.label}</p>
                      <p className="text-sm leading-relaxed text-slate-600">{charger.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="leading-relaxed">
            Összefoglalva: a legtöbb társasházi lakástulajdonosnak egy 7,4 kW-os AC Mode 3 Type 2
            fali töltő (wallbox) a tökéletes megoldás. Ez éjszakai töltéssel egy teljes feltöltést biztosít,
            illeszkedik a meglévő hálózathoz, és a beruházási költ legalacsonyabb.
          </p>
        </section>

        {/* Mennyibe kerül */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <TrendingDown size={20} className="text-emerald-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Mennyibe kerül és mikor térül meg?</h2>
          </div>
          <p className="leading-relaxed">
            Az egyéni EV töltő telepítésének összköltsége 2024-ben az alábbi tételekből áll össze:
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Tétel</th>
                  <th className="px-4 py-3 text-left font-semibold text-brand-700">Becsült költség</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Megjegyzés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-900">Wallbox (7,4 kW AC, okos)</td>
                  <td className="px-4 py-3 font-semibold text-brand-700">80–200 ezer Ft</td>
                  <td className="px-4 py-3 text-slate-600">OCPP-kompatibilis okostöltő</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">Villanyszerelési munkadíj</td>
                  <td className="px-4 py-3 font-semibold text-brand-700">50–150 ezer Ft</td>
                  <td className="px-4 py-3 text-slate-600">Kábelfektetés, dobozolás, beüzemelés</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-900">Saját mérő felszerelése</td>
                  <td className="px-4 py-3 font-semibold text-brand-700">20–60 ezer Ft</td>
                  <td className="px-4 py-3 text-slate-600">Elosztótársaság által felszerelve</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">Hálózatbővítés (ha szükséges)</td>
                  <td className="px-4 py-3 font-semibold text-brand-700">200 ezer – több M Ft</td>
                  <td className="px-4 py-3 text-slate-600">Csak ha a hálózat nem bírja el</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Becsült értékek, 2024-es piaci árak alapján. A tényleges költség függ a parkoló helyzetétől,
            a kábelfektetési útvonal hosszától és a helyi kivitelező díjszabásától.
          </p>
          <p className="leading-relaxed">
            Az üzemanyag-megtakarítás szempontjából: egy átlagos belső égésű motorú autó üzemanyagköltsége
            kb. 5 000–7 000 Ft/100 km (benzin/dízel 2024-es árakon). Elektromos autóval ugyanekkora
            távolság megtételéhez kb. 15–20 kWh szükséges, ami éjszakai tarifa esetén (30–35 Ft/kWh)
            kb. 500–700 Ft/100 km — vagyis a hajtásköltség 7–10-szerese is csökkenhet. Egy évente
            15 000 km-t megtett autónál ez akár 700 000 – 1 000 000 Ft éves megtakarítást jelent,
            ami a beruházást 4–12 hónap alatt visszahozza.
          </p>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-lg">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Building2 size={24} className="text-white" />
          </div>
          <h2 className="mb-2 text-2xl font-black text-white">
            Töltőmeghibásodást jelentene be?
          </h2>
          <p className="mb-6 text-brand-100">
            A PanelLakó hibabejelentő rendszere segít az elektromos töltőkkel kapcsolatos problémák
            gyors és dokumentált kezelésében — a bejelentéstől a javítás lezárásáig minden nyomon követhető.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-50"
          >
            <CheckCircle size={16} />
            Ingyenes regisztráció
          </Link>
        </div>

        {/* Jogi nyilatkozat */}
        <p className="mt-8 text-xs text-slate-400">
          Ez az oldal tájékoztató jellegű, és nem minősül jogi vagy műszaki tanácsadásnak.
          Az egyéni kérelem elkészítéséhez javasolt ügyvédhez és engedélyes villanyszerelőhöz fordulni.
          A hivatkozott törvényszöveg (2021. évi CXLIII. tv.) hatályos szövegét a Magyar Közlönyből
          és a Nemzeti Jogszabálytárból (njt.hu) ellenőrizze.
        </p>

        {/* Back link */}
        <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
          <Link href="/zold-tarsashaz" className="flex items-center gap-1 hover:text-brand-600">
            ← Vissza: Zöld Társasház főoldal
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
