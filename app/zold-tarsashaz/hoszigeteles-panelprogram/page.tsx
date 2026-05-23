import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Thermometer,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  FileText,
  TrendingDown,
  Building2,
  Leaf,
  Shield,
  Zap,
  BarChart2,
  DollarSign,
  Scale,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Hőszigetelés és Panelprogram — Pályázati Lehetőségek 2025 | PanelLakó',
  description:
    'Társasházi hőszigetelés és panelprogram: pályázati feltételek, energetikai tanúsítvány szükségessége, megtakarítható fűtési költség, közgyűlési döntés menete.',
  alternates: { canonical: 'https://panellako.hu/zold-tarsashaz/hoszigeteles-panelprogram' },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Hőszigetelés és panelprogram — a leghatékonyabb energetikai felújítás',
  description:
    'Társasházi hőszigetelés és panelprogram: pályázati feltételek, energetikai tanúsítvány szükségessége, megtakarítható fűtési költség, közgyűlési döntés menete.',
  inLanguage: 'hu',
  url: 'https://panellako.hu/zold-tarsashaz/hoszigeteles-panelprogram',
  publisher: {
    '@type': 'Organization',
    name: 'PanelLakó',
    url: 'https://panellako.hu',
  },
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
      name: 'Hőszigetelés és Panelprogram',
      item: 'https://panellako.hu/zold-tarsashaz/hoszigeteles-panelprogram',
    },
  ],
};

const RENOVATION_ELEMENTS = [
  {
    icon: Shield,
    title: 'Homlokzati hőszigetelés',
    text: 'Az EPS (expandált polisztirol) vagy MW (ásványgyapot) alapú hőszigetelési rendszer 12–15 cm vastagsága általában szükséges ahhoz, hogy a falak hőátbocsátási tényezője (U-érték) az EU EPBD által elvárt 0,15–0,20 W/m²K alá csökkenjen. A tűzterjedési sávok és a homlokzati kőzetgyapot-sávok kötelezők többemeletes épületeknél.',
  },
  {
    icon: Thermometer,
    title: 'Tető-hőszigetelés',
    text: 'A lapostető vagy a tetőtér alatti gépészeti tér szigetelése sokszor az egyik legolcsóbban megvalósítható elem, mégis az egyik legnagyobb megtakarítást hozza — a hőveszteség akár 20–30%-a a fedélen keresztül megy el. A PUR hab vagy kőzetgyapot réteg 20–30 cm vastagság ajánlott.',
  },
  {
    icon: Zap,
    title: 'Nyílászáró csere',
    text: 'A háromrétegű üvegezésű, alacsony emisszivitású (Low-E) nyílászárók U-értéke 0,7–1,0 W/m²K — szemben a régi, kétüveges ablakok 2,5–3,5 W/m²K értékével. A zajcsökkentési hatás is jelentős: a panel lakók életminőségét érzékelhetően javítja.',
  },
  {
    icon: BarChart2,
    title: 'Fűtési rendszer korszerűsítés',
    text: 'A hőszigetelés után a fűtési rendszer is áttervezhető kisebb kapacitásra. Az elavult öntöttvas radiátorok helyett alumínium vagy acél elemek, és a termosztátfejek bevezetése egyéni szabályozást tesz lehetővé — ez önmagában 10–15% fűtési megtakarítást hoz.',
  },
  {
    icon: Building2,
    title: 'Hőközpont automatizálás',
    text: 'Az időjárásfüggő szabályozás (ODR – outdoor reset) és a modern, változó fordulatszámú keringetőszivattyúk bevezetése a távfűtéses épületeknél akár 15–25% fűtési energiamegtakarítást eredményezhet az automatizálás önmagában, a hőszigetelési munkától függetlenül is.',
  },
  {
    icon: Leaf,
    title: 'Zöldtető és esővíz-visszatartás',
    text: 'Komplex felújítás keretében a tetőfelújítással egy időben zöldtető vagy esővíz-gyűjtő rendszer is kialakítható. Ez önkormányzati pályázatból is finanszírozható és javítja az épület városi ökológiai értékét, ezzel alátámasztva az EU takszonómia szerinti zöld besorolást.',
  },
];

const GRANT_PROGRAMS = [
  {
    title: 'RRF — EU Helyreállítási és Reziliencia Eszköz',
    details:
      'Az RRF forrásaiból finanszírozott programokban a komplex lakóépület-felújítás prioritást élvez. A 2024–2026-os időszakban megjelenő kiírások várhatóan legalább 40–60%-os vissza nem térítendő támogatást biztosítanak a mélyen felújított (deep retrofit) épületeknek, ahol az energiamegtakarítás eléri a 60%-ot.',
  },
  {
    title: 'KEHOP-PLUSZ utód programok (2021–2027)',
    details:
      'A korábbi KEHOP-os zöldépület programokat a 2021–2027-es uniós programozási időszakban KEHOP-PLUSZ és GINOP-PLUSZ kiírások váltják. Ezek fenntartják a komplex energetikai felújítások finanszírozását, de a feltételrendszer szigorodik: kötelező az energetikai audit és a megalapozó tervdokumentáció.',
  },
  {
    title: 'Önkormányzati co-financing és helyi programok',
    details:
      'Számos fővárosi kerület rendelkezik saját panelprogram kerettel. Budapest XIII., XIV. és XV. kerülete rendszeresen hirdet megelőlegező hitelt és vissza nem térítendő kiegészítő támogatást társasházi hőszigetelési projektekhez. Az önkormányzati finanszírozás sokszor rugalmasabb feltételekkel elérhető, és az uniós forrásokkal párhuzamosan is igénybe vehető.',
  },
  {
    title: 'MFB és OTP Zöld Hitel',
    details:
      'A Magyar Fejlesztési Bank és kereskedelmi bankok zöld hitelei kedvezményes (2–4%-os) kamatozással finanszírozzák azokat a felújításokat, amelyek az épület energetikai besorolását legalább B osztályra javítják. A hitelt az épület közössége veheti fel, a visszafizetés a havi közös költség részeként kezelhető.',
  },
];

export default function HoszigetelesPanelprogramPage() {
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
          <span className="font-medium text-slate-600">Hőszigetelés és Panelprogram</span>
        </nav>

        {/* Hero */}
        <div className="mb-14">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
            <Thermometer size={24} className="text-orange-500" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Hőszigetelés és panelprogram — a leghatékonyabb energetikai felújítás
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            A hőszigetelés az egyetlen beavatkozás, amely egyszerre csökkenti a fűtési és hűtési
            energiaigényt, növeli a lakókomfortot, javítja az energetikai tanúsítvány osztályzatát és
            emeli az ingatlanok piaci értékét. Magyarország panel épületállományának döntő többsége még
            mindig G vagy F osztályú — az EU 2024-es EPBD direktívája pedig 2030-ig kötelező felújítást
            ír elő a legrosszabb épületekre.
          </p>
        </div>

        {/* Miért szükséges */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Miért égetően szükséges a hőszigetelés?</h2>
          </div>
          <p className="leading-relaxed">
            Az 1960–1990 között épített magyarországi panelépületek — amelyek a hazai lakásállomány
            mintegy 30–35%-át teszik ki — az EU energiahatékonysági skálán jellemzően F vagy G osztályba
            tartoznak. Egy tipikus 1970-es évekbeli tízemeletes panel épület fajlagos fűtési energiaigénye
            150–250 kWh/m²/év, míg egy mai, jól szigetelt épületé 30–50 kWh/m²/év alatt van.
          </p>
          <p className="leading-relaxed">
            Ez nem csupán esztétikai kérdés. Az EU 2024-ben megújított Épületek Energiahatékonysági
            Irányelve (EPBD — 2024/1275/EU rendelet) kötelezi a tagállamokat arra, hogy 2030-ig
            a legrosszabb energiahatékonysági besorolású (G osztályú) lakóépületek legalább 16%-át
            felújítsák. Magyarország is köteles ezt beültetni jogszabályba — ez várhatóan kötelező
            felújítási ütemtervet jelent az ilyen besorolású épületek tulajdonosai számára.
          </p>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
              <div>
                <p className="mb-1 font-bold text-slate-900">40–60%-os fűtési megtakarítás lehetséges</p>
                <p className="text-sm leading-relaxed text-slate-600">
                  Egy komplex energetikai felújítás — homlokzati hőszigetelés, tető, nyílászáró, fűtési
                  korszerűsítés együtt — akár 40–60%-kal csökkentheti a fűtési számlát. Egy 80 lakásos
                  panel épületnél ez évi 10–20 millió Ft-os megtakarítást jelenthet a lakóközösség számára,
                  amit az alacsonyabb havi rezsiköltség formájában éreznek meg a lakók.
                </p>
              </div>
            </div>
          </div>
          <p className="leading-relaxed">
            Az energiaárak 2022–2024-es ugrásszerű emelkedése — különösen a gáz és a távhő díjának
            növekedése — azonnali megtérülési argumentumot jelent. Ahol korábban a beruházás 15–20 év
            alatt térült meg, ott ma 8–12 éves megtérülést mutatnak a számítások, különösen ha
            pályázati forrás is bevonható.
          </p>
        </section>

        {/* Energetikai tanúsítvány */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <FileText size={20} className="text-blue-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Az energetikai tanúsítvány</h2>
          </div>
          <p className="leading-relaxed">
            A 7/2006. (V.24.) TNM rendelet alapján 2013. január 1-jétől kötelező az energetikai
            tanúsítvány megléte minden olyan ingatlan adásvételénél, bérbeadásánál és hatósági
            engedélyköteles felújításánál, amelyet Magyarországon hajtanak végre. A tanúsítvány
            10 évig érvényes, utána meg kell újítani.
          </p>
          <p className="leading-relaxed">
            A tanúsítvány az épület fajlagos primer energiafelhasználását mutatja meg kWh/m²/év
            egységben (ezt nevezzük EPC-számnak — Energy Performance Certificate). Az osztályozás
            A++-tól G-ig terjed:
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Osztály</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">EPC szám (kWh/m²/év)</th>
                  <th className="px-4 py-3 text-left font-semibold text-brand-700">Jellemzés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-bold text-green-600">A++</td>
                  <td className="px-4 py-3 text-slate-600">0–40</td>
                  <td className="px-4 py-3 text-slate-600">Nulla energiájú, passzívház szint</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="px-4 py-3 font-bold text-green-500">A+</td>
                  <td className="px-4 py-3 text-slate-600">41–80</td>
                  <td className="px-4 py-3 text-slate-600">Közel nulla energia</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold text-green-400">A</td>
                  <td className="px-4 py-3 text-slate-600">81–100</td>
                  <td className="px-4 py-3 text-slate-600">Energiatakarékos</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="px-4 py-3 font-bold text-yellow-500">B–C</td>
                  <td className="px-4 py-3 text-slate-600">101–160</td>
                  <td className="px-4 py-3 text-slate-600">Közepes energiaigény</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold text-orange-500">D–E</td>
                  <td className="px-4 py-3 text-slate-600">161–300</td>
                  <td className="px-4 py-3 text-slate-600">Gyenge hatékonyság</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="px-4 py-3 font-bold text-red-500">F–G</td>
                  <td className="px-4 py-3 text-slate-600">300 felett</td>
                  <td className="px-4 py-3 text-slate-600">Tipikus panel épület — EU EPBD felújítási kötelezettség alatt</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Forrás: 7/2006. (V.24.) TNM rendelet melléklete; EU EPBD 2024/1275/EU rendelet.
          </p>
          <p className="leading-relaxed">
            A tanúsítványt kizárólag az Energetikai Tanúsítók Névjegyzékében (ETNY) szereplő,
            engedéllyel rendelkező energetikai szakember készítheti el. A helyszíni felmérés,
            a tervdokumentáció áttekintése és a tanúsítvány kiadása díjköteles (általában 80–200 ezer Ft
            egy társasháznál), de a legtöbb pályázatnál előfeltétel.
          </p>
        </section>

        {/* Panelprogram feltételei */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <Scale size={20} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Panelprogram feltételei</h2>
          </div>
          <p className="leading-relaxed">
            A panelprogram az 1945–1990 között épített, ipari technológiával (előre gyártott betonelemek,
            tégla, egyéb) készült többlakásos lakóépületekre irányuló energetikai felújítási program.
            A prioritásos célcsoport az F és G osztályú, legalább 8 lakásos társasházak, amelyek
            meghatározott feltételeknek felelnek meg:
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Minimum energiamegtakarítás:</strong> a pályázat
                benyújtásakor igazolni kell, hogy a tervezett felújítás legalább 30%-os — egyes programoknál
                60%-os — primer energiafelhasználás-csökkentést eredményez. Ezt az energetikai audit igazolja.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Közgyűlési határozat kötelező:</strong> a 2003. évi
                CXXXIII. tv. alapján a felújítás a közös tulajdont érinti, ezért 2/3-os szavazatarány szükséges.
                Pályázathoz a határozatot hiteles másolatban kell csatolni.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Teljes körű tervdokumentáció:</strong> engedélyezési
                tervek, statikai számítás (homlokzathoz), tűzvédelmi dokumentáció, energetikai tanúsítvány
                a projekt előtt és projektszintű energetikai számítás a projekt után.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Tulajdonosi hozzájárulás az önrészhez:</strong> a
                vissza nem térítendő pályázati forrás mellett a tulajdonostársak kötelesek az önrész
                arányos részét fedezni — ez jellemzően a lakóterület arányában kerül elosztásra.
              </span>
            </li>
          </ul>
        </section>

        {/* Aktív pályázatok */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
              <DollarSign size={20} className="text-teal-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Aktív pályázatok 2024–2025</h2>
          </div>
          <p className="leading-relaxed">
            A pályázati keret és a határidők folyamatosan változnak — az alábbiakban az elérhető
            főbb finanszírozási forrásokat mutatjuk be, amelyeket javasolt az NFIS.hu portálon és
            az illetékes önkormányzatnál folyamatosan figyelni:
          </p>
          <div className="space-y-4">
            {GRANT_PROGRAMS.map((program) => (
              <div key={program.title} className="border-l-2 border-brand-300 pl-4">
                <p className="font-bold text-slate-900">{program.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{program.details}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle size={18} className="mt-0.5 shrink-0 text-brand-600" />
              <div>
                <p className="mb-1 font-bold text-slate-900">Tipp: pályázat előtt mindig közgyűlési határozat</p>
                <p className="text-sm leading-relaxed text-slate-600">
                  A közgyűlési határozatnak meg kell előznie a pályázat benyújtását, de a határozat
                  előkészítéséhez — az előkészítő mérnöki tervdokumentáció, az energetikai audit és a
                  háromszeres árajánlatkérés — szintén idő kell. Tervezze meg az ütemtervet legalább
                  6–9 hónappal a tervezett felújítás megkezdése előtt.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Felújítás elemei */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <Leaf size={20} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">A felújítás szokásos elemei</h2>
          </div>
          <p className="leading-relaxed">
            A komplex energetikai felújítás általában az alábbi elemeket foglalja magában — az egyedi
            elhagyhatók, de a komplex megközelítés mindig jobb megtérülést és jobb osztályzatot hoz:
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {RENOVATION_ELEMENTS.map((element) => {
              const Icon = element.icon;
              return (
                <div key={element.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <p className="mb-1.5 font-bold text-slate-900">{element.title}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{element.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Megtérülési számítás */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <TrendingDown size={20} className="text-emerald-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Megtérülési számítás — mintaépület</h2>
          </div>
          <p className="leading-relaxed">
            Az alábbi becslés egy tipikus, 80 lakásos, 1975-ben épített, gázfűtéses panel épületre vonatkozik.
            A tényleges értékek épületenként és régiónként eltérnek.
          </p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-4">
            <div className="border-l-2 border-brand-300 pl-4">
              <p className="font-bold text-slate-900">Jelenlegi fűtési energiafogyasztás (G osztály)</p>
              <p className="text-sm text-slate-600 mt-1">220 kWh/m²/év × 5 600 m² hasznos alapterület = 1 232 000 kWh/év gázegyenérték</p>
            </div>
            <div className="border-l-2 border-brand-300 pl-4">
              <p className="font-bold text-slate-900">Felújítás utáni fogyasztás (C osztály, 50% megtakarítás)</p>
              <p className="text-sm text-slate-600 mt-1">110 kWh/m²/év × 5 600 m² = 616 000 kWh/év — évi ~616 000 kWh megtakarítás</p>
            </div>
            <div className="border-l-2 border-brand-300 pl-4">
              <p className="font-bold text-slate-900">Megtakarított fűtési költség (2024-es áron)</p>
              <p className="text-sm text-slate-600 mt-1">616 000 kWh × ~50 Ft/kWh gázár = kb. 30–35 millió Ft/év összes megtakarítás (kb. 375 000–440 000 Ft/lakás/év)</p>
            </div>
            <div className="border-l-2 border-brand-300 pl-4">
              <p className="font-bold text-slate-900">Szén-dioxid csökkentés</p>
              <p className="text-sm text-slate-600 mt-1">616 000 kWh × 0,202 kg CO₂/kWh (gáz) = kb. 124 tonna CO₂/év megtakarítás</p>
            </div>
            <div className="border-l-2 border-emerald-500 pl-4">
              <p className="font-bold text-slate-900">Ingatlanérték növekedés</p>
              <p className="text-sm text-slate-600 mt-1">G→C osztály javulás: becsült 5–12% értéknövekedés lakásonként, ami egy átlagos 50 milliós panel lakásnál 2,5–6 millió Ft értéktöbbletet jelent.</p>
            </div>
          </div>
          <p className="leading-relaxed">
            A teljes felújítási beruházás cost 200–350 millió Ft között mozoghat (pályázati forrás
            nélkül). 50%-os pályázati intenzitás esetén az önrész 100–175 millió Ft, amit 80 lakáson
            elosztva 1,25–2,2 millió Ft/lakás jelent — és ezt a megnövekedett ingatlanérték sok
            esetben rövid időn belül kompenzálja.
          </p>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-lg">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Building2 size={24} className="text-white" />
          </div>
          <h2 className="mb-2 text-2xl font-black text-white">
            Szervezzük meg a közgyűlési határozatot
          </h2>
          <p className="mb-6 text-brand-100">
            A PanelLakó közgyűlési modul segít az előterjesztés elkészítésében, a szavazás
            lebonyolításában és a pályázathoz szükséges dokumentáció nyilvántartásában.
          </p>
          <Link
            href="/tarsashaz-kezeles"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-50"
          >
            <CheckCircle size={16} />
            Közgyűlési határozat menete
          </Link>
        </div>

        {/* Jogi nyilatkozat */}
        <p className="mt-8 text-xs text-slate-400">
          Ez az oldal tájékoztató jellegű, és nem minősül jogi, pénzügyi vagy energetikai tanácsadásnak.
          A pontos pályázati feltételekért és határidőkért látogasson el az NFIS.hu portálra, és
          forduljon engedélyes energetikai szakértőhöz.
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
