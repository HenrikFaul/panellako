import type { Metadata } from 'next';
import type { Route } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Scale,
  FileText,
  Clock,
  CreditCard,
  ArrowRight,
  BadgeAlert,
  Building2,
  Gavel,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Díjhátralékosok Kezelése Társasházban | PanelLakó',
  description:
    'Mit tehet a közös képviselő, ha valaki nem fizeti a közös költséget? Felszólítás, fizetési meghagyás, végrehajtás, jelzálogjog — lépésről lépésre.',
  alternates: { canonical: 'https://panellako.hu/tarsashaz-kezeles/dijhatlarak-kezelese' },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Díjhátralékosok kezelése — a közös képviselő jogai és kötelezettségei',
  description:
    'Mit tehet a közös képviselő, ha valaki nem fizeti a közös költséget? Felszólítás, fizetési meghagyás, végrehajtás, jelzálogjog — lépésről lépésre.',
  url: 'https://panellako.hu/tarsashaz-kezeles/dijhatlarak-kezelese',
  publisher: { '@type': 'Organization', name: 'PanelLakó', url: 'https://panellako.hu' },
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
      name: 'Társasházkezelés',
      item: 'https://panellako.hu/tarsashaz-kezeles',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Díjhátralékosok kezelése',
      item: 'https://panellako.hu/tarsashaz-kezeles/dijhatlarak-kezelese',
    },
  ],
};

const STEPS = [
  {
    step: '1',
    icon: FileText,
    title: 'Írásbeli felszólítás',
    desc: 'Az első és kötelező lépés. Igazolható kézbesítéssel (ajánlott levél, átvételi elismervény) kell megküldeni a hátralék pontos összegével, lejáratával és a fizetési határidővel.',
  },
  {
    step: '2',
    icon: Scale,
    title: 'Fizetési meghagyásos eljárás (FMH)',
    desc: 'Ha a felszólítás eredménytelen, a közjegyzőnél indítható FMH-eljárás. 3 millió Ft-ig kötelező ez az út a peres eljárás helyett. Gyors és olcsó.',
  },
  {
    step: '3',
    icon: Gavel,
    title: 'Végrehajtási eljárás',
    desc: 'Ha az adós nem él ellentmondással, az FMH jogerőre emelkedik, és bírósági végrehajtás indítható. Bankszámla, munkabér vagy ingatlan terhelhető.',
  },
  {
    step: '4',
    icon: Building2,
    title: 'Jelzálogjog bejegyzése',
    desc: 'Párhuzamosan vagy az eljárás helyett jelzálogjog jegyeztethető az ingatlan-nyilvántartásba. Az adósság az ingatlan elidegenítésekor mindenképpen megtérül.',
  },
];

const DEMAND_LETTER_ELEMENTS = [
  'A hátralékos tulajdonos neve és lakáscíme',
  'A hátralék pontos összege forintban (tőke és felhalmozódott kamat külön)',
  'A hátralék keletkezésének időpontja (első késedelmes hónap)',
  'A fizetési határidő (általában 8–15 nap)',
  'Az alkalmazandó késedelmi kamat mértéke (Ptk. 6:155. §)',
  'Figyelmeztetés a következő lépésekre (FMH, jelzálogjog)',
  'A közös képviselő aláírása és dátuma',
  'Igazolható kézbesítés (ajánlott tértivevényes levél VAGY aláírt átvételi elismervény)',
];

const EXECUTION_TYPES = [
  {
    icon: CreditCard,
    title: 'Bankszámla-végrehajtás',
    text: 'Az adós bankszámláján lévő összegből a végrehajtó közvetlenül levonhat. Ez általában a leggyorsabb megoldás, ha az adósnak van aktív bankszámlája.',
  },
  {
    icon: BadgeAlert,
    title: 'Munkabér-letiltás',
    text: 'Ha az adós munkaviszonyban áll, a munkabéréből — a Vht. szabályai szerint a nettó bér 33%-áig — vonható le a tartozás. Különös védelmet élvez az alacsony jövedelmű adós.',
  },
  {
    icon: Building2,
    title: 'Ingatlan-végrehajtás',
    text: 'Végső megoldásként az adós ingatlanára is elrendelhető a végrehajtás. Az ingatlan árverésen kerül értékesítésre, de ez hosszadalmas és drága eljárás.',
  },
];

export default function DijhatlalakKezelesequePage() {
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
          <span className="font-medium text-slate-600">Díjhátralékosok kezelése</span>
        </nav>

        {/* Hero */}
        <div className="mb-12">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <BadgeAlert size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Díjhátralékosok kezelése — a közös képviselő jogai és kötelezettségei
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            A közös képviselők egyik legkényesebb feladata a nem fizető tulajdonostársakkal való
            bánásmód. A 2003. évi CXXXIII. törvény (Ttv.) nemcsak jogot ad, hanem kötelezettséget
            is ró a képviselőre: a hátralék behajtása nem opcionális. Ez a cikk bemutatja a
            lépéseket a felszólítástól a végrehajtásig.
          </p>
        </div>

        {/* H2: Mikor keletkezik díjhátralék? */}
        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-black text-slate-900">
            Mikor keletkezik díjhátralék?
          </h2>
          <p className="leading-relaxed text-slate-600">
            A közös költség fizetési kötelezettsége a Ttv. 43. § (1) bekezdése alapján minden
            tulajdonostársat terhel az albetét-arányának megfelelően, a közgyűlés által jóváhagyott
            összeggel. A hátralék a fizetési határnap elmulasztásával — általában a tárgyhónap
            utolsó napjával vagy az SZMSZ-ben meghatározott határnappal — azonnal keletkezik.
          </p>
          <p className="leading-relaxed text-slate-600">
            A Ptk. 6:155. § alapján a pénztartozás késedelmi kamattal terhelt. A kamat mértéke a
            késedelem napjától jár, és az MNB jegybanki alapkamatát 8 százalékponttal meghaladó
            mértéken számítandó. Ez azt jelenti, hogy a kamat automatikusan folyik — a közös
            képviselőnek erre vonatkozóan külön igényérvényesítési aktust nem kell tennie, de
            nyilván kell tartania.
          </p>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              <p className="font-bold text-amber-900">A késedelmi kamat automatikusan számítódik</p>
            </div>
            <p className="text-sm leading-relaxed text-amber-800">
              Nem szükséges külön kikötni az SZMSZ-ben — a Ptk. törvényi erejű rendelkezése alapján
              minden közös költség hátralékra jár a késedelmi kamat. A kamat érvényesítéséhez
              azonban pontosan nyilván kell tartani a késedelem kezdő napját.
            </p>
          </div>
        </section>

        {/* H2: Az első lépés: írásbeli felszólítás */}
        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-black text-slate-900">
            Az első lépés: írásbeli felszólítás
          </h2>
          <p className="leading-relaxed text-slate-600">
            A közös képviselő köteles a hátralékos tulajdonostársat írásban felszólítani a
            tartozás rendezésére. Ez nemcsak jogi elvárás, hanem bizonyítási szempontból is
            elengedhetetlen: az FMH-eljárásban vagy peres eljárásban a bíróság vagy közjegyző
            elvárja az előzetes felszólítás igazolását.
          </p>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <FileText size={18} className="text-brand-600" />
              <p className="font-bold text-slate-900">A felszólítás kötelező tartalmi elemei</p>
            </div>
            <ul className="space-y-2">
              {DEMAND_LETTER_ELEMENTS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle size={14} className="mt-0.5 shrink-0 text-brand-500" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="leading-relaxed text-slate-600">
            A kézbesítés módja kulcskérdés. A nem bizonyítható kézbesítés — például telefonos
            emlékeztető — jogilag nem elegendő. Ajánlott tértivevényes postai levél vagy a
            PanelLakó platformján keresztül küldött, olvasási visszaigazolással rögzített digitális
            értesítő egyaránt alkalmas az igazolható kézbesítésre.
          </p>
        </section>

        {/* H2: FMH */}
        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-black text-slate-900">
            Fizetési meghagyásos eljárás (FMH)
          </h2>
          <p className="leading-relaxed text-slate-600">
            Ha a felszólítás ellenére az adós nem fizet, a következő lépés a fizetési meghagyásos
            eljárás. A 2009. évi L. törvény (Fmhtv.) alapján 3 millió forint alatti pénzkövetelések
            esetén kötelező az FMH igénybevétele — a bírósági út csak ezután nyílik meg.
          </p>
          <p className="leading-relaxed text-slate-600">
            Az FMH-t a Magyar Országos Közjegyzői Kamara (MOKK) rendszerén keresztül, bármelyik
            közjegyző előtt lehet benyújtani. Az eljárás illetéke az érvényesített követelés 3%-a
            (minimum 5 000 Ft, maximum 300 000 Ft). A közjegyző az FMH-t 15 napon belül kibocsátja,
            az adós pedig a kézbesítéstől számított 15 napon belül élhet ellentmondással.
          </p>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Scale size={18} className="text-brand-600" />
              <p className="font-bold text-slate-900">FMH — az eljárás menete</p>
            </div>
            <ol className="space-y-3">
              {[
                { n: '1', text: 'Kérelem benyújtása a MOKK rendszerén (online is lehetséges)' },
                { n: '2', text: 'Közjegyző 15 napon belül kibocsátja a fizetési meghagyást' },
                { n: '3', text: 'Adós 15 napon belül élhet ellentmondással' },
                {
                  n: '4a',
                  text: 'Ellentmondás esetén: az ügy automatikusan peres eljárásba megy át',
                },
                {
                  n: '4b',
                  text: 'Ellentmondás hiányában: az FMH 30 nap elteltével jogerőre emelkedik, végrehajtható',
                },
              ].map((row) => (
                <li key={row.n} className="flex items-start gap-3 text-sm text-slate-600">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-black text-brand-700">
                    {row.n}
                  </span>
                  <span className="leading-relaxed">{row.text}</span>
                </li>
              ))}
            </ol>
          </div>
          <p className="leading-relaxed text-slate-600">
            Az FMH különös előnye, hogy peres eljáráshoz képest rendkívül gyors és olcsó. Tipikus
            társasházi közös költség hátralék esetén — ahol a tényállás általában egyértelmű —
            az adósok ritkán élnek ellentmondással, így a végrehajtás hamar megindítható.
          </p>
        </section>

        {/* H2: Bírói végrehajtás */}
        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-black text-slate-900">
            Bírói végrehajtás
          </h2>
          <p className="leading-relaxed text-slate-600">
            Ha az adós nem él ellentmondással, az FMH jogerőre emelkedik, és a közös képviselő
            kérelmére bírósági végrehajtó jár el a 1994. évi LIII. törvény (Vht.) alapján. A
            végrehajtás elrendelésének feltétele a végrehajtható okirat (jogerős FMH vagy bírósági
            ítélet) és a végrehajtási kérelem benyújtása az illetékes törvényszék
            végrehajtói irodájához.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {EXECUTION_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.title}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-5"
                >
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={18} className="text-brand-600" />
                  </div>
                  <p className="mb-1.5 font-bold text-slate-900">{type.title}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{type.text}</p>
                </div>
              );
            })}
          </div>
          <p className="leading-relaxed text-slate-600">
            A végrehajtás költségei — amelyeket elsősorban az adós visel — a végrehajtói díjból,
            a behajtási jutalékból és az eljárási illetékből állnak. Ha a behajtás sikertelen
            (az adósnak nincs lefoglalható vagyona), a végrehajtási eljárás felfüggesztésre
            kerülhet, de újraindítható, ha az adós vagyoni helyzete megváltozik.
          </p>
        </section>

        {/* H2: Jelzálogjog */}
        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-black text-slate-900">
            Jelzálogjog bejegyzése
          </h2>
          <p className="leading-relaxed text-slate-600">
            A Ttv. 25. § (3) bekezdése kifejezetten lehetővé teszi, hogy a közgyűlés felhatalmazása
            alapján a közös képviselő jelzálogjogot jegyeztessen be az adós albetétére az
            ingatlan-nyilvántartásba. Ehhez közgyűlési határozat és ügyvéd által ellenjegyzett
            okirat szükséges.
          </p>
          <p className="leading-relaxed text-slate-600">
            A jelzálogjog bejegyzése az adós ingatlanán nyilvánosan megjelenik, ezért — ha az
            adós el kívánja adni vagy jelzálogot kíván felvenni az ingatlanra — kénytelen
            rendezni a közös képviselővel szembeni tartozását. Ez az intézkedés tehát
            pszichológiai és praktikus nyomást egyaránt gyakorol.
          </p>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-600" />
              <p className="font-bold text-red-900">
                Közgyűlési felhatalmazás nélkül nem jegyeztethető be
              </p>
            </div>
            <p className="text-sm leading-relaxed text-red-800">
              A jelzálogjog bejegyeztetéséhez a Ttv. 25. § (3) bekezdése alapján a közgyűlés
              döntése szükséges. A képviselő saját hatáskörben ezt nem teheti meg — ez a hatalom
              ellenőrzési mechanizmusa. A közgyűlési határozatot a határozatkönyvbe kell rögzíteni.
            </p>
          </div>
          <p className="leading-relaxed text-slate-600">
            A jelzálogjog törléséhez — miután az adós rendezte a tartozást — szintén
            ingatlan-nyilvántartási bejegyzés szükséges. Ezt a közös képviselő köteles haladéktalanul
            kezdeményezni a fizetést követően, különben az adós kártérítési igénnyel léphet fel.
          </p>
        </section>

        {/* H2: Részletfizetési megállapodás */}
        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-black text-slate-900">
            Részletfizetési megállapodás
          </h2>
          <p className="leading-relaxed text-slate-600">
            A jogi eljárások nem mindig a legcélravezetőbb megoldás — különösen, ha az adós
            fizetési nehézsége átmeneti (pl. munkahely-vesztés, betegség) és együttműködő
            magatartást tanúsít. Ilyenkor a részletfizetési megállapodás mindkét fél számára
            kedvezőbb lehet: a közösség hamarabb jut pénzhez, az adós elkerüli a végrehajtási
            eljárás pluszköltségeit.
          </p>
          <p className="leading-relaxed text-slate-600">
            A megállapodásnak tartalmaznia kell:
          </p>
          <ul className="space-y-2 pl-1">
            {[
              'A teljes tartozás összegét (tőke + felhalmozódott kamat)',
              'A részletek összegét és esedékességi dátumait',
              'A késedelemi kamat felfüggesztésének feltételeit (ha a felek ebben állapodnak meg)',
              'Szankciókat, ha az adós nem tartja be a megállapodást (azonnal esedékessé válik a teljes tartozás)',
              'Mindkét fél aláírását és dátumát',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-slate-600">
                <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
          <p className="leading-relaxed text-slate-600">
            Fontos: a részletfizetési megállapodás nem jelenti a kamatigény elengedését, hacsak
            ezt a felek kifejezetten nem rögzítik. A kamat elengedéséhez — mivel ez a közösség
            vagyonát érinti — ajánlott közgyűlési felhatalmazást kérni.
          </p>
        </section>

        {/* H2: Megelőzés */}
        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-black text-slate-900">
            Megelőzés: digitális nyilvántartás és értesítők
          </h2>
          <p className="leading-relaxed text-slate-600">
            A legjobb hátralékkezelési stratégia a megelőzés. A tapasztalatok szerint a hátralékos
            esetek jelentős része nem tudatos nemfizetésből, hanem figyelmetlenségből,
            elfelejtett egyenlegből vagy téves utalásból ered. Egy automatizált értesítési rendszer
            drámaian csökkenti a hátralékosok számát.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Clock,
                title: 'Automatikus fizetési emlékeztetők',
                text: 'A PanelLakó rendszere — beállítható ütemterv szerint — fizetési emlékeztetőt küld a fizetési határnap előtt. Ez önmagában a hátralékos esetek több mint felét megelőzi.',
              },
              {
                icon: AlertTriangle,
                title: 'Azonnali késedelmi értesítő',
                text: 'A határnap elmulasztása után a rendszer automatikusan elküldi az első felszólítást — igazolható digitális kézbesítéssel, amelyet az eljárás során bizonyítékként lehet használni.',
              },
              {
                icon: FileText,
                title: 'Riport a közgyűlésnek',
                text: 'Egy kattintással lekérhető a hátralékosok listája: ki mennyi ideje, mennyit tartozik. Ez a közgyűlési előterjesztés elkészítéséhez is nélkülözhetetlen.',
              },
              {
                icon: CheckCircle,
                title: 'Dokumentált kommunikáció',
                text: 'Minden értesítő, felszólítás és visszaigazolás naplózódik — így az FMH-eljáráshoz szükséges bizonyítékok mindig rendelkezésre állnak.',
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
        </section>

        {/* Process overview */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-black text-slate-900">
            A folyamat áttekintése lépésről lépésre
          </h2>
          <div className="space-y-3">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.step}
                  className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">
                      <span className="mr-2 text-brand-600">{step.step}.</span>
                      {step.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Legal disclaimer */}
        <section className="mb-12 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-8">
          <div className="mb-5 flex items-center gap-3">
            <Scale size={20} className="text-brand-600" />
            <h2 className="text-xl font-black text-slate-900">Hivatkozott jogszabályok</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                ref: '2003. évi CXXXIII. tv. (Ttv.) 43. §',
                text: 'A közös költség viselésének kötelezettségéről és arányáról.',
              },
              {
                ref: '2003. évi CXXXIII. tv. (Ttv.) 25. § (3) bek.',
                text: 'A jelzálogjog bejegyeztetésének lehetősége hátralék esetén.',
              },
              {
                ref: '2013. évi V. tv. (Ptk.) 6:155. §',
                text: 'Késedelmi kamat: jegybanki alapkamat + 8 százalékpont.',
              },
              {
                ref: '2009. évi L. tv. (Fmhtv.)',
                text: 'A fizetési meghagyásos eljárás szabályai, 3 millió Ft alatti kötelező igénybevétel.',
              },
              {
                ref: '1994. évi LIII. tv. (Vht.)',
                text: 'Bírósági végrehajtás szabályai — bankszámla, munkabér, ingatlan lefoglalása.',
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
            különösen jelzálogjog bejegyeztetése vagy bírósági eljárás előtt — forduljon
            ügyvédhez.
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
                text: 'Tételek, éves elszámolás, digitális megoldások',
              },
              {
                href: '/tarsashaz-kezeles/dokumentumkezeles-tarsashazban',
                title: 'Kötelező dokumentumok',
                text: 'Megőrzési idők, betekintési jog, digitális tár',
              },
              {
                href: '/tarsashaz-kezeles/kozos-kepviselo-feladatai',
                title: 'A közös képviselő feladatai',
                text: 'Teljes kötelezettségjegyzék és felelősségi körök',
              },
              {
                href: '/funkciok/kozos-koltseg',
                title: 'Közös Költség modul',
                text: 'Hogyan segít a PanelLakó a nyilvántartásban',
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
            Kezelje a hátralékosokat digitálisan
          </h2>
          <p className="mb-6 text-brand-100">
            A PanelLakó automatikus értesítőkkel és dokumentált felszólítási folyamattal segít
            megelőzni és kezelni a díjhátralékokat. 14 napos ingyenes próba.
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
