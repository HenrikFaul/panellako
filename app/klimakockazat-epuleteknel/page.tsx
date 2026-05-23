import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Thermometer,
  CloudRain,
  Wind,
  AlertTriangle,
  BarChart2,
  Building2,
  Leaf,
  CheckCircle,
  TrendingUp,
  Droplets,
  Sun,
  ArrowRight,
  Shield,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Klímakockázat Ingatlanoknál Budapest — Hőszigetek és Árvízkockázat | PanelLakó',
  description:
    'Budapest épületeinek klímakockázata: városi hőszigetek, szélsőséges hőhullámok, csapadék és árvíz. Hogyan érinti ez a társasházi ingatlanokat?',
  alternates: { canonical: 'https://panellako.hu/klimakockazat-epuleteknel' },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Főoldal',
      item: 'https://panellako.hu',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Klímakockázat épületeknél',
      item: 'https://panellako.hu/klimakockazat-epuleteknel',
    },
  ],
};

const HEATWAVES = [
  { year: '2003', description: 'Rekordmeleg: a napi maximum 41,9 °C-ig emelkedett Szegeden; Budapesten közel 300 hőség-többlethalálozás.' },
  { year: '2007', description: 'Júliusi hőhullám, amikor Budapest belső kerületeiben a reggeli minimum is meghaladta a 25 °C-ot több egymást követő napon.' },
  { year: '2015', description: 'Augusztus közepén a 40 °C-ot is megközelítő hőmérsékletek miatt az OMSZ hőségriasztást adott ki; áramkimaradások is előfordultak.' },
  { year: '2019', description: 'A nyáron mért hőmérsékletek több meteorológiai állomáson dőlt meg, az energiafelhasználás rekordot ért el.' },
  { year: '2022', description: 'Júliusi prolongált hőhullám: Budapest belvárosában az átlaghőmérséklet 5–7 °C-kal haladta meg a sokéves átlagot; az 1970-es évek panel épületjeinek lakói különösen veszélyeztett helyzetbe kerültek.' },
];

const BUILDING_RISKS = [
  {
    icon: Thermometer,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    title: 'Panelépületek hővédelme',
    body:
      'Az 1960–1990 között emelt panel épületek hőtechnikai jellemzői nem felelnek meg a 7/2006. (V. 24.) TNM rendelet mai követelményeinek. A külső falak hőátbocsátási tényezője (U-érték) jellemzően 1,0–1,5 W/m²K körüli, szemben a ma elvárt 0,24 W/m²K-vel. Ez nyáron kifejező beltéri túlmelegedést, télen hőveszteséget okoz.',
  },
  {
    icon: CloudRain,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    title: 'Tetők és ereszrendszerek',
    body:
      'Az intenzív csapadékeseményekre méretezetlen lapostetők beázási kockázatot hordoznak. A KSH adatai szerint a panel épületek közel 35%-ának tetőfelújítása elmarad a szükséges ciklusoktól. A felgyülemlő víz betonsérüléseket, az acélbetétek korróziójának felgyorsulását eredményezi, ami hosszú távon állékonyságot érintő kérdéssé válhat.',
  },
  {
    icon: Wind,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    title: 'Nyílászárók és légcsere',
    body:
      'Az eredeti panelablakok hőhídjai nemcsak téli páralecsapódást, hanem nyáron is gyors beltéri felmelegedést okoznak. A korszerűtlen ablakok cseréje akár 30–40%-kal csökkentheti az épületek hűtési energiaigényét, ami egyre fontosabb a légkondicionáló elterjedése miatt (az EU energiastratégiájának megfelelően a 2030-ra kitűzött energiahatékonysági célok is erre sürgetnek).',
  },
  {
    icon: Droplets,
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    title: 'Pinceterek és talajvíz',
    body:
      'A villámárvizek és a megnövekedett csapadékintenzitás következtében a fővárosi csatornázási rendszer kapacitása egyes kerületekben elégtelen. Különösen érintett a X., XIX. és XX. kerület, ahol a pincébe kerülő vízzel összefüggő biztosítási káreseményeket 2020–2023 között az MABISZ adatai szerint a bekövetkező kárral párhuzamosan növekvő tendencia jellemzi.',
  },
];

const ACTIONS = [
  {
    icon: Leaf,
    title: 'Energetikai felújítás (Panelprogram)',
    body:
      'A Magyar Kormány Panelprogram keretében 1992 óta közel 200 000 lakás esett át komplex energetikai felújításon. A program külső hőszigetelést, ablakcserét, fűtési és melegvíz-rendszer korszerűsítést foglal magában. A 2021–2030-as időszakra a Hatékony Ház Plusz pályázat biztosít forrást EU Kohéziós Alap támogatással.',
  },
  {
    icon: Sun,
    title: 'Napelemes rendszerek és megújuló energia',
    body:
      'A tetőre telepített fotovoltaikus rendszer csökkenti a közös területek villamosenergia-fogyasztását és védelmet nyújt az energiaárak volatilitása ellen. A METÁR-KIS rendszeren belül a társasházak is igényelhetnek prémium tarifát. A napelemek egységnyi területre vetített hőelnyelő hatása ugyanakkor csökkenti a tető hőterhelését is.',
  },
  {
    icon: Droplets,
    title: 'Zöldtetők és esővíz-gazdálkodás',
    body:
      'Az extenzív zöldtetők akár 50–80%-kal visszatartják a csapadékvizet, csökkentik a csatornaterhelést és isolálják az épületet hő ellen. Budapest Főváros 2020/202-es klímaadaptációs határozata ösztönzi zöldtető-telepítést; számos kerület (II., XII., XIV.) helyi rendelettel is támogatja.',
  },
  {
    icon: Wind,
    title: 'Árnyékolás és természetes szellőzés',
    body:
      'Épület-árnyékoló elemek (marquise, lamella, fatálcás erkélykorlátok) a szolár nyereséget akár 40–60%-kal mérsékelhetik. Természetes keresztszellőzés biztosítása a tervezési szabványokban (MSZ EN 16798) előírt belső léghőmérséklet-korlátokat az épület aktív hűtése nélkül is megtarthatja.',
  },
];

export default function KlimakockazatEpuleteknelPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <PublicNav />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Breadcrumb */}
        <nav aria-label="Navigáció" className="mb-8 flex items-center gap-2 text-sm text-slate-400">
          <Link href="/" className="hover:text-brand-600 transition-colors">Főoldal</Link>
          <span>/</span>
          <span className="font-medium text-slate-700">Klímakockázat épületeknél</span>
        </nav>

        {/* Hero */}
        <div className="mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-700">
            <Thermometer size={13} />
            Klímakockázat
          </div>
          <h1 className="mb-5 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Klímakockázat ingatlanoknál —{' '}
            <span className="text-brand-600">amit minden tulajdonosnak tudni kell</span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-500">
            A klímaváltozás fizikailag, pénzügyileg és jogi szempontból is érinti a magyarországi ingatlanállományt — különösen a fővárosi panel és többlakásos épületeket. A HungaroMet adatai szerint Budapest átlaghőmérséklete az elmúlt 60 évben 1,8 °C-kal emelkedett; az extrém csapadékeseményekre vonatkozó előrejelzések szerint 2050-re a jelenlegi „ritka" hőhullámok rendszeres jelenséggé válnak. Ez nem csupán kényelmi, hanem vagyonbiztonsági kérdés is.
          </p>
        </div>

        {/* Urban Heat Island */}
        <section aria-labelledby="uhi-heading" className="mb-14">
          <h2 id="uhi-heading" className="mb-5 text-2xl font-black text-slate-900">
            Urban Heat Island — városi hőszigetek Budapesten
          </h2>
          <p className="mb-5 text-slate-500 leading-relaxed">
            A városok sűrűn beépített részei szignifikánsan melegebbek a környező vidéki területeknél — ezt a jelenséget városi hősziget-effektusnak (Urban Heat Island, UHI) nevezzük. Budapest esetén a hőkülönbség a belváros és a budai hegyvidék között nyári napokon elérheti az 5–8 °C-ot is, éjszaka pedig 3–5 °C is jellemző.
          </p>

          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                kerület: 'VIII., IX. ker.',
                hatas: 'Legsúlyosabban érintett',
                leiras: 'Nagy beépítettség, kevés zöldfelület, aszfalt- és kőburkolatok dominanciája.',
                color: 'border-orange-200 bg-orange-50',
                textColor: 'text-orange-800',
                badgeColor: 'bg-orange-200 text-orange-800',
              },
              {
                kerület: 'V., VI., VII. ker.',
                hatas: 'Erősen érintett',
                leiras: 'Belső Pest sűrű utcahálózata, mélyudvarok, alacsony lombkorona-borítás.',
                color: 'border-amber-200 bg-amber-50',
                textColor: 'text-amber-800',
                badgeColor: 'bg-amber-200 text-amber-800',
              },
              {
                kerület: 'II., XII. ker.',
                hatas: 'Mérsékelten érintett',
                leiras: 'Magasabb fekvés, kiterjedt zöldterületek, alacsonyabb beépítési sűrűség.',
                color: 'border-emerald-200 bg-emerald-50',
                textColor: 'text-emerald-800',
                badgeColor: 'bg-emerald-200 text-emerald-800',
              },
            ].map((item) => (
              <div key={item.kerület} className={`rounded-2xl border px-5 py-5 ${item.color}`}>
                <span className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${item.badgeColor}`}>
                  {item.hatas}
                </span>
                <p className={`mb-1 font-black ${item.textColor}`}>{item.kerület}</p>
                <p className="text-xs leading-relaxed text-slate-600">{item.leiras}</p>
              </div>
            ))}
          </div>

          <p className="text-slate-500 leading-relaxed">
            A hősziget-hatás enyhítésének leghatékonyabb eszközei a zöldfelületek bővítése (parkok, fasorok), a vizes felületek megőrzése (szökőkutak, tófelszínek), illetve az épületek zöldtetős és homlokzatzöldítős kezelése. Budapest Főváros klímaadaptációs stratégiája (2020) a belső kerületekben évente minimum 50 000 m² új zöldfelület létrehozását irányozza elő.
          </p>
        </section>

        {/* Hőhullámok */}
        <section aria-labelledby="hohullam-heading" className="mb-14">
          <h2 id="hohullam-heading" className="mb-5 text-2xl font-black text-slate-900">
            Hőhullámok és energiafelhasználás Magyarországon
          </h2>
          <p className="mb-6 text-slate-500 leading-relaxed">
            Az Országos Meteorológiai Szolgálat (OMSZ) definíciója szerint hőhullám akkor áll fenn, ha legalább három egymást követő napon az átlaghőmérséklet 25 °C felett marad. Az alábbi kiemelt évek jól szemléltetik a tendenciát:
          </p>

          <div className="mb-7 overflow-hidden rounded-2xl border border-slate-200">
            {HEATWAVES.map((item, i) => (
              <div
                key={item.year}
                className={`flex items-start gap-4 px-6 py-4 ${
                  i < HEATWAVES.length - 1 ? 'border-b border-slate-100' : ''
                } ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
              >
                <span className="flex h-8 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-sm font-black text-brand-700">
                  {item.year}
                </span>
                <p className="text-sm leading-relaxed text-slate-600 pt-1">{item.description}</p>
              </div>
            ))}
          </div>

          <p className="mb-5 text-slate-500 leading-relaxed">
            A klímamodellek (IPCC AR6, 2021) szerint Magyarországon 2050-re az évi hőhullám-napok száma megduplázódhat, a jelenlegi 10–15 nap/évről 25–35 napra. Ez közvetlen hatással van az <strong className="text-slate-700">energetikai tanúsítványokra (EPC)</strong>: egy alacsony energetikai osztályú (F–G sávos) épület nyári hűtési energia-szükséglete akár 4–5-szörösre nőhet, ami a lakhatás rezsiköltségeire közvetlenül kihat.
          </p>
          <div className="rounded-2xl border border-brand-100 bg-brand-50/60 px-6 py-5">
            <div className="flex items-start gap-3">
              <TrendingUp size={17} className="mt-0.5 shrink-0 text-brand-600" />
              <p className="text-sm text-brand-800 leading-relaxed">
                <strong>Az EU Épületenergetikai Irányelv (EPBD, 2024/1275/EU)</strong> előírja, hogy 2030-ra a legrosszabb energetikai besorolású lakóépületek (G-osztály) kötelező felújítás alá essenek. Magyarországon ez körülbelül 600 000 lakást érinthet, közte a panel épületek jelentős hányadát.
              </p>
            </div>
          </div>
        </section>

        {/* Csapadék és pince */}
        <section aria-labelledby="csapadek-heading" className="mb-14">
          <h2 id="csapadek-heading" className="mb-5 text-2xl font-black text-slate-900">
            Csapadékszélsőségek és pincetér-kockázat
          </h2>
          <p className="mb-5 text-slate-500 leading-relaxed">
            A klímaváltozás egyik paradoxona, hogy egyszerre valószínűsít hosszabb száraz periódusokat és intenzívebb, rövidebb idő alatt érkező csapadékokat — az utóbbit villámárvíznek nevezzük. Budapest csatornázási rendszerének tervezési paraméterei egy 5–10 éves visszatérési idejű csapadékeseményre méreteztek (a fővárosi CSATORNA Kft. adatai alapján), miközben az extrém csapadékeseményekre vonatkozó előrejelzések a 20–25 éves visszatérési idejű csapadékot mutatják jövőbeli normává.
          </p>

          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: AlertTriangle,
                iconColor: 'text-rose-600',
                iconBg: 'bg-rose-50',
                title: 'Legkockázatosabb pincetér-jellemzők',
                items: [
                  'Nincs önálló visszacsapó szelep a szennyvízcsatornán',
                  'Az utca szintjénél alacsonyabb pincebejárat',
                  'Elavult vízelvezető rendszer (pre-1980 épületek)',
                  'Hiányzó vagy sérült szigetelés az alapfalakon',
                  'Tömítetlen átvezetések (csőátvezetések)',
                ],
              },
              {
                icon: CheckCircle,
                iconColor: 'text-emerald-600',
                iconBg: 'bg-emerald-50',
                title: 'Megelőző intézkedések',
                items: [
                  'Visszacsapó szelep beépítése (kötelező az 1997. évi LXXVIII. tv. 36. § alapján új építésnél)',
                  'Szivattyútér kialakítása és automatikus szivattyú telepítése',
                  'Vízálló festék és injektálás az alapfalakon',
                  'Rendszeres csatorna-karbantartás (félévente ajánlott)',
                  'Riasztórendszer alacsony pincetérbe',
                ],
              },
            ].map((col) => {
              const Icon = col.icon;
              return (
                <div key={col.title} className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                  <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${col.iconBg}`}>
                    <Icon size={17} className={col.iconColor} />
                  </div>
                  <h3 className="mb-3 font-black text-slate-900 text-sm">{col.title}</h3>
                  <ul className="space-y-2">
                    {col.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <p className="text-sm text-slate-500 leading-relaxed">
            Az MABISZ 2023-as kárelemzése alapján a villámárvíz miatti pince-beázás a társasházi biztosítói káreseményeken belül az ötödik leggyakoribb kategória, és az átlagos kárösszeg 450 000–800 000 Ft közötti. A megelőzés egy visszacsapó szelep árával (kb. 60 000–120 000 Ft) jellemzően megtérül.
          </p>
        </section>

        {/* Épületek sérülékenysége */}
        <section aria-labelledby="serulek-heading" className="mb-14">
          <h2 id="serulek-heading" className="mb-5 text-2xl font-black text-slate-900">
            Épületek fizikai sérülékenysége — részletes kép
          </h2>
          <p className="mb-7 text-slate-500 leading-relaxed">
            A klímakockázatok az épület fizikai állapotán keresztül manifesztálódnak. Az alábbi négy tényező a legkritikusabb a magyarországi panel és régebbi technológiájú társasházi épületek esetén.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {BUILDING_RISKS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.iconBg}`}>
                    <Icon size={20} className={item.iconColor} />
                  </div>
                  <h3 className="mb-2 font-black text-slate-900">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Ingatlanérték */}
        <section aria-labelledby="ingatlanertek-heading" className="mb-14">
          <h2 id="ingatlanertek-heading" className="mb-5 text-2xl font-black text-slate-900">
            Klímakockázat és ingatlanérték — a pénzügyi dimenzió
          </h2>
          <p className="mb-6 text-slate-500 leading-relaxed">
            A klímaváltozás nem csupán fizikai, hanem pénzügyi kockázatot is jelent az ingatlantulajdonosok számára. Három egymással összefüggő csatornán keresztül hathat a piaci értékre:
          </p>
          <div className="space-y-4">
            {[
              {
                icon: Shield,
                iconBg: 'bg-rose-50',
                iconColor: 'text-rose-600',
                title: 'Biztosítási díjak emelkedése',
                body:
                  'A biztosítók egyre inkább árazzák be a klímakockázatokat. 2020–2024 között a fővárosi társasházi vagyonbiztosítási díjak átlagosan 25–35%-kal emelkedtek. Magas árvíz- vagy hőhullám-kockázatú épületeknél az önrészek és kizárások is nőnek, illetve egyes esetekben a biztosíthatóság kérdése merülhet fel.',
              },
              {
                icon: BarChart2,
                iconBg: 'bg-amber-50',
                iconColor: 'text-amber-600',
                title: 'Hitelezési kockázat (EU-taxonómia)',
                body:
                  'Az EU Fenntartható Pénzügyi Taxonómia (2020/852/EU rendelet) és az EBA hitelkockázat-irányelvei egyre inkább előírják a bankoknak, hogy az ingatlanfinanszírozásnál vegyék figyelembe a fizikai klímakockázatokat. Amennyiben egy épület nem felel meg a jövőbeli minimumstandardoknak, a refinanszírozás drágábbá válhat, vagy a hitelkeret csökkenhet.',
              },
              {
                icon: TrendingUp,
                iconBg: 'bg-emerald-50',
                iconColor: 'text-emerald-600',
                title: 'Eladhatóság és értékbecslés',
                body:
                  'Az RICS (Royal Institution of Chartered Surveyors) 2023-as iránymutatása szerint a klímakockázatok figyelembevétele az értékbecslési folyamatban kötelezővé válik. Tanulmányok szerint az alacsony energetikai osztályú (E–G sávos) ingatlanok piaci ára 5–15%-kal elmarad az azonos elhelyezkedésű, jobb besorolású ingatlanokétól.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
                >
                  <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}>
                    <Icon size={18} className={item.iconColor} />
                  </div>
                  <div>
                    <h3 className="mb-1.5 font-black text-slate-900">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-500">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Mit tehet a társasház */}
        <section aria-labelledby="mitehet-heading" className="mb-14 rounded-2xl border border-slate-100 bg-slate-50 px-7 py-8">
          <h2 id="mitehet-heading" className="mb-4 text-2xl font-black text-slate-900">
            Mit tehet a társasház? — Klímaadaptációs lépések
          </h2>
          <p className="mb-7 text-slate-500 leading-relaxed">
            A klímaadaptáció a társasházakban nem egyetlen nagy beruházás, hanem lépéssorozat. Az alábbi intézkedések rangsorolhatók kockázat és megtérülés alapján, és mindegyik finanszírozható hazai vagy EU-s forrásból.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {ACTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white bg-white px-5 py-5 shadow-sm"
                >
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={17} className="text-brand-600" />
                  </div>
                  <h3 className="mb-2 font-black text-slate-900 text-sm">{item.title}</h3>
                  <p className="text-xs leading-relaxed text-slate-500">{item.body}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4">
            <p className="text-sm text-brand-800 leading-relaxed">
              <strong>Finanszírozási lehetőség:</strong> A Nemzeti Épületenergetikai Stratégia (NEES 2020–2030) és a Hatékony Ház Plusz program keretében az energetikai felújítások 40–60%-os vissza nem térítendő támogatással igényelhetők. A pályázat benyújtásához energetikai auditjelentés és közgyűlési határozat szükséges.
            </p>
          </div>
        </section>

        {/* Link cards */}
        <section aria-labelledby="kapcsolodo-heading" className="mb-14">
          <h2 id="kapcsolodo-heading" className="mb-5 text-xl font-black text-slate-900">
            Kapcsolódó elemzések és vizualizációk
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/elemzes"
              className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm transition-all hover:border-brand-200 hover:shadow-md"
            >
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                <BarChart2 size={18} className="text-brand-600" />
              </div>
              <div>
                <p className="mb-1 font-black text-slate-900 group-hover:text-brand-700 transition-colors">
                  Budapest elemzések — hősziget és zajtérkép
                </p>
                <p className="text-sm text-slate-500">
                  Interaktív UHI hőtérkép, városi zajszintek és épületenergetikai adatok egy felületen.
                </p>
              </div>
            </Link>
            <Link
              href="/zajszennyezes-budapest"
              className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm transition-all hover:border-brand-200 hover:shadow-md"
            >
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                <Wind size={18} className="text-violet-600" />
              </div>
              <div>
                <p className="mb-1 font-black text-slate-900 group-hover:text-brand-700 transition-colors">
                  Zajszennyezés Budapest
                </p>
                <p className="text-sm text-slate-500">
                  A zajterhelés és a hőszigetek egymást erősítő hatása — miért fontosak együtt?
                </p>
              </div>
            </Link>
            <Link
              href="/klimakockazat-epuleteknel/hoszigetek-budapest"
              className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm transition-all hover:border-brand-200 hover:shadow-md"
            >
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                <Thermometer size={18} className="text-orange-600" />
              </div>
              <div>
                <p className="mb-1 font-black text-slate-900 group-hover:text-brand-700 transition-colors">
                  Hőszigetek Budapest
                </p>
                <p className="text-sm text-slate-500">
                  Kerületi hőtérkép és UHI-adatok: melyik városrész mennyivel melegebb, és mit tehet ez ellen?
                </p>
              </div>
            </Link>
            <Link
              href="/klimakockazat-epuleteknel/csapadek-es-arviz-budapest"
              className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm transition-all hover:border-brand-200 hover:shadow-md"
            >
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                <CloudRain size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="mb-1 font-black text-slate-900 group-hover:text-brand-700 transition-colors">
                  Villámárvíz és csapadékszélsőségek
                </p>
                <p className="text-sm text-slate-500">
                  Árvízkockázati zónák, pincetér-veszélyeztetettség és védekezési lehetőségek Budapesten.
                </p>
              </div>
            </Link>
            <Link
              href="/klimakockazat-epuleteknel/energetikai-tanusitvany"
              className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm transition-all hover:border-brand-200 hover:shadow-md"
            >
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                <Shield size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="mb-1 font-black text-slate-900 group-hover:text-brand-700 transition-colors">
                  Energetikai tanúsítvány
                </p>
                <p className="text-sm text-slate-500">
                  Mit jelent az energetikai osztálybesorolás, mikor kötelező a megújítás, és hogyan javítható?
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* Stats strip */}
        <div className="mb-14 grid gap-4 sm:grid-cols-3">
          {[
            { value: '1,8 °C', label: 'Budapest átlaghőmérsékletének emelkedése az elmúlt 60 évben (HungaroMet)' },
            { value: '~600 000', label: 'Magyar lakás eshet a kötelező felújítási küszöb alá az EU EPBD 2030-as céljai alapján' },
            { value: '40–60%', label: 'Elérhető energetikai felújítási támogatás az aktuális pályázatokon' },
          ].map((stat) => (
            <div
              key={stat.value}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center shadow-sm"
            >
              <p className="mb-1 text-3xl font-black text-brand-600">{stat.value}</p>
              <p className="text-xs leading-snug text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-md">
          <h2 className="mb-2 text-2xl font-black text-white">
            Kövesse nyomon épülete klímaállapotát digitálisan
          </h2>
          <p className="mb-6 text-brand-100 max-w-lg mx-auto">
            A PanelLakó platformon rögzítheti a beázásokat, hőproblémákat és karbantartási eseményeket — így mindig naprakész képe lesz a társasház állapotáról, és bizonyítékai lesznek minden hatósági vagy biztosítói eljáráshoz.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-transform hover:scale-[1.03]"
            >
              Ingyenes regisztráció
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/elemzes"
              className="inline-flex items-center gap-2 rounded-xl border border-brand-400/40 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-600"
            >
              Elemzések megtekintése
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
