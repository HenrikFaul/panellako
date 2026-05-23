import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Activity,
  ChevronRight,
  AlertTriangle,
  Wind,
  BarChart2,
  ArrowRight,
  CheckCircle,
  Home,
  Droplets,
  Shield,
  Thermometer,
  Users,
  ExternalLink,
  Eye,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Beltéri Levegőminőség Társasházban | PanelLakó',
  description:
    'Hogyan javíthatjuk a beltéri levegőminőséget társasházi lakásban? VOC szennyezők, párásítás, szellőztetés, HEPA légtisztítók, épületgépészeti megoldások.',
  alternates: {
    canonical: 'https://panellako.hu/levegominoseg-budapest/belteri-levegominoseg-tarsashazban',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Beltéri levegőminőség társasházi lakásokban',
  description:
    'Hogyan javíthatjuk a beltéri levegőminőséget társasházi lakásban? VOC szennyezők, párásítás, szellőztetés, HEPA légtisztítók, épületgépészeti megoldások.',
  inLanguage: 'hu',
  url: 'https://panellako.hu/levegominoseg-budapest/belteri-levegominoseg-tarsashazban',
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
      name: 'Levegőminőség Budapest',
      item: 'https://panellako.hu/levegominoseg-budapest',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Beltéri levegőminőség',
      item: 'https://panellako.hu/levegominoseg-budapest/belteri-levegominoseg-tarsashazban',
    },
  ],
};

const INDOOR_WORSE_REASONS = [
  {
    icon: Wind,
    title: 'Illékony szerves vegyületek (VOC)',
    text: 'A lakásban lévő festékek, lakkok, bútorok (különösen a farost-alapú bútorok, pl. MDF és laminált deszka), szőnyegek és takarítószerek illékony szerves vegyületeket (VOC) párologtatnak. Frissen felújított vagy bebútorozott lakásokban a VOC-szint hetekig-hónapokig emelkedett marad.',
  },
  {
    icon: Activity,
    title: 'CO₂-felhalmozódás',
    text: 'Az emberek és háziállatok folyamatosan CO₂-t lélegeznek ki. Egy átlagos méretű hálószobában (15 m²) két alvó emberrel az elégtelen szellőztetés esetén a CO₂-szint reggelig 2000–3000 ppm-re emelkedhet. Az optimális beltéri szint 600–800 ppm alatt van — ezt túllépve fáradtság, fejfájás és koncentrációzavar jelentkezik.',
  },
  {
    icon: Droplets,
    title: 'Penész és spórák',
    text: 'A panellakásokban és régebbi téglaházakban különösen gyakori a penészedés — különösen a hidegebb sarokszobákban és a fürdőszobában. A penészspórák belégzése asztmaszerű tüneteket, krónikus rhinitist és immunrendszeri problémákat okozhat. A magas páratartalom (60% fölött) a penész szaporodásának kedvez.',
  },
  {
    icon: AlertTriangle,
    title: 'Szálló por és háziállatszőr',
    text: 'A kárpitok, szőnyegek, párnák és plüssök por- és atkagyűjtemények. A pormatkák a szálló porban lévő fehérjeallergének fő forrásai, és asztma-rohamok kiváltói. Háziállat tartása esetén az allergén szőr és hámrészecskék a tüdőre kerülnek.',
  },
];

const INDOOR_POLLUTANTS = [
  {
    name: 'Formaldehid (HCHO)',
    source: 'MDF bútorok, padlóburkolatok, egyes festékek, ragasztók',
    health: 'Szemirritáció, torokkaparás, allergén, hosszú távon rákkeltő (IARC 1-es csoport)',
    level: 'magas kockázat',
    color: 'bg-red-100 text-red-700',
  },
  {
    name: 'Radon (Rn)',
    source: 'Talaj, építőanyagok (különösen pincei és földszinti lakásokban)',
    health: 'A tüdőrák második leggyakoribb oka a dohányzás után. Szagtalan, láthatatlan.',
    level: 'kiemelt kockázat',
    color: 'bg-red-200 text-red-800',
  },
  {
    name: 'Dohányfüst (ETS)',
    source: 'Dohányzás a lakásban vagy a lépcsőházban',
    health: 'Több mint 7000 vegyi anyag, köztük >70 rákkeltő. Gyermekekre különösen veszélyes.',
    level: 'nagyon magas kockázat',
    color: 'bg-red-200 text-red-800',
  },
  {
    name: 'Szén-dioxid (CO₂)',
    source: 'Légzés, gáztűzhely, gyertya',
    health: 'Magas szinten (>2000 ppm) fejfájás, fáradtság, koncentrációzavar',
    level: 'közepes kockázat',
    color: 'bg-amber-100 text-amber-700',
  },
  {
    name: 'Páratartalom (alacsony)',
    source: 'Téli fűtési időszak, szellőztetés hiánya',
    health: 'Kiszáradt nyálkahártya, megnövekedett vírusterjedés, szúró szemek',
    level: 'mérsékelt',
    color: 'bg-yellow-100 text-yellow-700',
  },
  {
    name: 'Háziállatszőr, poratkák',
    source: 'Kárpitok, szőnyegek, ágynemű, plüssök',
    health: 'Asztma, allergiás rhinitis, kötőhártya-gyulladás',
    level: 'közepes kockázat',
    color: 'bg-amber-100 text-amber-700',
  },
];

const VENTILATION_TIPS = [
  {
    icon: Wind,
    title: 'Mikor szellőztessünk Budapesten?',
    text: 'A külső levegőminőség napi változik. Általában a kora reggeli órák (5–8 óra) és a késő esti órák (20–23 óra) mutatják a legalacsonyabb PM2.5 és NO₂ szinteket a belvárosban. Az OLM valós idejű adatait (levegominoseg.hu) ellenőrizve tudja meghatározni a legjobb szellőztetési ablakot.',
  },
  {
    icon: Home,
    title: 'Kereszt-szellőztetés panellakásban',
    text: 'A hatékony szellőztetéshez egyszerre nyissuk meg a lakás szemközti oldalán lévő ablakokat — így erős léghuzam keletkezik, amely percek alatt kicseréli a beltéri levegőt. Egy 50 m²-es lakás ilyen módon 5–10 perc alatt szellőztethető, ahelyett, hogy egész nap nyitva tartjuk az ablakot.',
  },
  {
    icon: Thermometer,
    title: 'Téli szellőztetés hidegben',
    text: 'Télen sokan kerülik a szellőztetést a hőveszteségtől félve — pedig ez az, amikor a CO₂, a VOC és a belélegzett por felhalmozódása a legveszélyesebb. Rövid, intenzív szellőztetés (10 perc, teljesen nyitott ablakok) energetikailag hatékonyabb és egészségesebb, mint az egész napos résnyire nyitott ablak.',
  },
  {
    icon: Activity,
    title: 'Hálószoba szellőztetése lefekvés előtt',
    text: 'Az alvás alatt felhalmozódó CO₂ és VOC csökkentése érdekében mindig szellőztessünk lefekvés előtt 10–15 percig. Ha van CO₂-mérő a szobában, ez közvetlenül mérhető: az ideális értéket akkor éri el a levegő, ha az ablak bezárása után az érték az éjszaka folyamán nem haladja meg a 1000–1200 ppm-t.',
  },
];

const HEPA_GUIDE = [
  {
    criterion: 'HEPA szűrőosztály',
    detail: 'H13 vagy H14 jelölés — ez szűri ki a részecskék 99,97%-át (H13) ill. 99,995%-át (H14). Az olcsóbb "HEPA-típusú" szűrők nem érik el ezt a szintet.',
  },
  {
    criterion: 'CADR szám (m³/h)',
    detail: 'A Clean Air Delivery Rate megmutatja, hány m³ megtisztított levegőt tud óránként előállítani a gép. Egy 20 m²-es szobához legalább 200 m³/h CADR szükséges hatékony működéshez.',
  },
  {
    criterion: 'Aktívszén szűrő',
    detail: 'A VOC-ok és a szagok szűréséhez aktívszén-réteg is szükséges a HEPA-szűrő mellé. VOC-problémánál (pl. frissen felújított szoba) ez elengedhetetlen.',
  },
  {
    criterion: 'Zajszint',
    detail: 'Alvószobai légtisztítónál a zajszint ne haladja meg a 35 dB(A) értéket alacsony fokozaton. A zajosabb modelleknél általában van csendes "éjszakai mód".',
  },
  {
    criterion: 'Szűrőcsere-ciklus',
    detail: 'A HEPA-szűrőt általában 6–12 havonta kell cserélni — az előírtnál ritkábban csere esetén a visszaszivárgás rontja a hatékonyságot. A szűrőcsere költségét is számítsuk be a vásárlásnál.',
  },
];

const BUILDING_SOLUTIONS = [
  {
    icon: Users,
    title: 'Lépcsőházi szellőzés',
    text: 'A lépcsőház és a folyosó megfelelő szellőztetése csökkenti azt az utat, amelyen keresztül a cigarettafüst, a takarítószer-gőzök és a mosokonyhai szagok bejutnak a lakásokba. A közös képviselő kérheti a szellőzőaknák tisztítását és a szellőztetési rendszer ellenőrzését.',
  },
  {
    icon: Wind,
    title: 'Garázsszellőztetés',
    text: 'A mélygarázsokból és a félig zárt parkolókból felszálló CO és szálló por közvetlenül befolyásolja a lakások beltéri levegőjét, ha a szellőzőrendszer nem megfelelően tervezett. Ha szagot érez gépkocsi-kipufogóra emlékeztető szagot a lakásban, jelezze a közös képviselőnek.',
  },
  {
    icon: Shield,
    title: 'Lift és gépészeti karbantartás',
    text: 'A lift géptermének és a pincei gépészeti helyiségek rendszeres karbantartása megakadályozza, hogy a kenőanyagok, oldószerek és festékek gőzei a közlekedő tereken át a lakásokba kerüljenek. Ez különösen fontos pincei lakásoknál.',
  },
  {
    icon: Home,
    title: 'Közös épületi szellőzőrendszerek',
    text: 'Egyes panelépületekben és újabb társasházakban közös szellőzőaknák biztosítják a lakások légtechnikai összeköttetését. Ezek rendszeres tisztítása (3–5 évente) megelőzi a penészspóra és por-felhalmozódást az aknákban — ami más lakásokba is bekeveredhet.',
  },
];

const HUMIDITY_TIPS = [
  {
    title: 'Ideális páratartalom: 40–60% RH',
    text: 'Ez az a tartomány, amelyben sem a penész (szeret >60% RH), sem a kiszáradásból fakadó problémák (légúti irritáció, vírusfertőzések elterjedése <35% RH) nem jellemzők. Télen a fűtés miatt a lakásokban az RH olykor 20–30%-ra is csökken.',
  },
  {
    title: 'Kondenzáció megelőzése',
    text: 'A penész az ablakkeretek és a hideg falak mentén keletkezik leggyakrabban, ahol a meleg beltéri levegő érintkezik a hideg felülettel. Szellőztetés és a hőhidak (sarkokban, redőnydoboznál) megfelelő szigetelése csökkenti a kondenzáció kockázatát.',
  },
  {
    title: 'Párásítók és légnedvesítők',
    text: 'Télen párásítóval visszaállítható az optimális páratartalom. Az ultrahangos párásítók vízkövet is szétszórnak a levegőbe, ha kemény csapvizet használunk — ezért desztillált vizet vagy demineralizált vizet adjunk hozzájuk, különben fehér por jelenik meg a bútorokon.',
  },
  {
    title: 'Penész esetén azonnali beavatkozás',
    text: 'A penész nem csak esztétikai probléma — mikrobiológiai veszélyforrás. Ha penészt észlel, hibabejelentést tehet a közös képviselőnek az épület szintű okok (pl. hőhíd, ázás) azonosításáért, miközben a felszíni penészt speciális gombaölő szerrel kezeli.',
  },
];

export default function BelteriLevegominosegTarsashazbanPage() {
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
          <Link href="/levegominoseg-budapest" className="hover:text-slate-600">
            Levegőminőség Budapest
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-600">Beltéri levegőminőség</span>
        </nav>

        {/* Hero */}
        <div className="mb-14">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <Activity size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Beltéri levegőminőség társasházi lakásokban
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            Meglepő, de az Egészségügyi Világszervezet szerint az emberek napi idejük 80–90%-át beltéri
            terekben töltik. A beltéri levegő minősége sok esetben rosszabb, mint a kültéri — főleg
            városban, ahol szennyező anyagok halmozódhatnak fel zárt terekben. Társasházi lakásban
            mindez különösen összetett kihívást jelent.
          </p>
        </div>

        {/* Miért lehet rosszabb a beltéri levegő */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">
            Miért lehet rosszabb a beltéri levegő a külsőnél?
          </h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            A beltéri tér zárt, és nem rendelkezik a kültér természetes hígítási képességével. A
            szennyező anyagok nem oszlanak el a szélben és a napsütésben — felhalmozódnak, kivéve ha
            aktívan szellőztetünk. Az alábbi négy fő ok magyarázza, miért alakulhat ki rosszabb
            levegőminőség a lakásban, mint az utcán.
          </p>
          <div className="space-y-5">
            {INDOOR_WORSE_REASONS.map((reason) => {
              const Icon = reason.icon;
              return (
                <div key={reason.title} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="mb-1 font-bold text-slate-900">{reason.title}</p>
                    <p className="text-sm leading-relaxed text-slate-500">{reason.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tipikus beltéri szennyezők */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">Tipikus beltéri szennyezők</h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            Az alábbiakban a leggyakoribb beltéri szennyezők forrásait, egészségügyi hatásait és
            kockázati szintjét összegezzük — magyarországi, illetve közép-európai életkörülményekre
            szabva.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Szennyező</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Forrás</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Egészségügyi hatás</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Kockázat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {INDOOR_POLLUTANTS.map((p) => (
                  <tr key={p.name}>
                    <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.source}</td>
                    <td className="px-4 py-3 text-slate-600">{p.health}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-lg px-2 py-0.5 text-xs font-semibold ${p.color}`}>
                        {p.level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-sm leading-relaxed text-amber-800">
                <strong>Radon figyelmeztetés:</strong> Pincei lakásban, régi épületben vagy ahol granitoid
                kőzetekre alapoztak, érdemes radon-mérő készülékkel ellenőrizni a koncentrációt. A WHO
                küszöbértéke 100 Bq/m³, az EU ajánlott határértéke 300 Bq/m³. A mérés elvégezhető
                otthoni passzív radon-detektorokkal, amelyek 3–12 hónapos expozíció után kiküldhetők
                laboratóriumi értékelésre.
              </p>
            </div>
          </div>
        </section>

        {/* Szellőztetési stratégiák */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">
            Szellőztetési stratégiák panellakásban
          </h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            A szellőztetés a legolcsóbb és leghatékonyabb eszköz a beltéri levegőminőség javítására —
            de csak akkor, ha a kültéri levegő is elfogadható minőségű, és ha helyesen csináljuk.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {VENTILATION_TIPS.map((tip) => {
              const Icon = tip.icon;
              return (
                <div key={tip.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <p className="mb-1.5 font-bold text-slate-900">{tip.title}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{tip.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Légtisztítók és HEPA filterek */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">
            Légtisztítók és HEPA filterek — mire figyeljünk?
          </h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            A jó légtisztító valóban hatékony — de nem minden &quot;levegőtisztítónak&quot; nevezett termék
            éri el az egészségvédelmileg releváns szűrési hatékonyságot. Az alábbiakban a legfontosabb
            szempontokat foglaljuk össze vásárlás előtt.
          </p>
          <div className="space-y-4">
            {HEPA_GUIDE.map((item) => (
              <div key={item.criterion} className="flex gap-4 rounded-2xl border border-brand-100 bg-brand-50/40 p-5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-100">
                  <Eye size={16} className="text-brand-700" />
                </div>
                <div>
                  <p className="mb-1 font-bold text-slate-900">{item.criterion}</p>
                  <p className="text-sm leading-relaxed text-slate-600">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <p className="mb-2 text-sm font-bold text-slate-800">Elkerülendő technológiák</p>
            <ul className="space-y-1.5 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-1 text-red-500">✗</span>
                <span><strong>Ionizátorok (negatív ionizátorok):</strong> Ozon-mellékterméket bocsátanak ki, ami maga is légúti irritáló.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-red-500">✗</span>
                <span><strong>UV-C légtisztítók önmagukban:</strong> Baktériumokat és vírusokat ölnek ugyan, de a szálló port és a VOC-okat nem szűrik.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-red-500">✗</span>
                <span><strong>&quot;HEPA-típusú&quot; filterek:</strong> Nem tévesztendő össze a valódi H13/H14 HEPA osztályú szűrőkkel — szűrési hatásfokuk általában lényegesen rosszabb.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Épületi szintű megoldások */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">
            Épületi szintű megoldások: mit kérhet a közös képviselőtől?
          </h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            A beltéri levegőminőség egy része nem az egyéni lakókon múlik, hanem az épület közös
            területeinek és rendszereinek állapotán. Ezekért a közös képviselő felelős, és a lakók
            jogosultak azok felülvizsgálatát kérni.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {BUILDING_SOLUTIONS.map((solution) => {
              const Icon = solution.icon;
              return (
                <div
                  key={solution.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <p className="mb-1.5 font-bold text-slate-900">{solution.title}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{solution.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Páratartalom és penész */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">
            Páratartalom és penész kapcsolata
          </h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            A páratartalom szabályozása az egyik legfontosabb eszköz a beltéri levegőminőség
            fenntartásában — mind a penész megelőzése, mind a légúti irritáció elkerülése szempontjából.
          </p>
          <div className="space-y-4">
            {HUMIDITY_TIPS.map((tip) => (
              <div key={tip.title} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                  <Droplets size={20} className="text-brand-600" />
                </div>
                <div>
                  <p className="mb-1 font-bold text-slate-900">{tip.title}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{tip.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <p className="mb-3 text-sm font-bold text-slate-800">Hasznos mérőeszközök</p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <Shield size={14} className="text-brand-600" />
                <span><strong>CO₂-mérő:</strong> Valós időben mutatja a CO₂-szintet — ideális hálószobába, gyermekszobába, irodába (pl. Aranet4, CO2mini).</span>
              </li>
              <li className="flex items-center gap-2">
                <Droplets size={14} className="text-brand-600" />
                <span><strong>Higrométer:</strong> Az optimális 40–60% RH tartomány figyelésére (digitális thermo-higrométer, 2–5 EUR).</span>
              </li>
              <li className="flex items-center gap-2">
                <Wind size={14} className="text-brand-600" />
                <span><strong>PM-szenzor:</strong> Hordozható PM2.5-mérő a saját lakásra és utcai levegőre is (pl. IQAir AirVisual Pro, Laser Egg).</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Adatforrások */}
        <section className="mb-16 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-8">
          <div className="mb-4 flex items-center gap-3">
            <ExternalLink size={18} className="text-brand-600" />
            <p className="font-bold text-slate-900">Hivatkozott és ajánlott forrásak</p>
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            {[
              { label: 'WHO Global Air Quality Guidelines 2021', url: 'https://www.who.int/publications/i/item/9789240034228' },
              { label: 'US EPA Indoor Air Quality (IAQ)', url: 'https://www.epa.gov/indoor-air-quality-iaq' },
              { label: 'OLM — Magyarország levegőminőségi adatai', url: 'https://levegominoseg.hu' },
              { label: 'EEA — Beltéri levegőminőség irányelv', url: 'https://www.eea.europa.eu/en/topics/in-depth/air-pollution' },
              { label: 'Nemzeti Népegészségügyi Központ (NNK) — radon tájékoztató', url: 'https://www.nnk.gov.hu' },
            ].map((s) => (
              <li key={s.label} className="flex items-center gap-2">
                <ExternalLink size={12} className="shrink-0 text-brand-600" />
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-600">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-400">
            Ez az oldal tájékoztató jellegű. Konkrét egészségügyi kérdésekben forduljon orvoshoz. Radon-méréssel
            és penészmentesítéssel kapcsolatban kérjen szakértői véleményt.
          </p>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-lg">
          <h2 className="mb-2 text-2xl font-black text-white">
            Penészedés vagy légcsere-probléma a lakásban?
          </h2>
          <p className="mb-6 text-brand-100">
            A PanelLakó alkalmazásban közvetlenül jelezheti a közös képviselőjének a penészedési,
            szellőzési vagy gépészeti hibákat. A hibabejelentés nyomon követhető, és a közös képviselő
            köteles reagálni.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-50"
          >
            <CheckCircle size={16} />
            Hibabejelentés a PanelLakóban
          </Link>
        </div>

        {/* Kapcsolódó cikkek */}
        <div className="mt-12">
          <p className="mb-4 text-sm font-bold text-slate-700">Kapcsolódó cikkek</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/levegominoseg-budapest/pm25-pm10-mit-jelent"
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              <BarChart2 size={16} className="text-brand-600" />
              PM2.5 és PM10 — mit jelent?
              <ArrowRight size={14} className="ml-auto text-slate-400" />
            </Link>
            <Link
              href="/levegominoseg-budapest/budapest-legszennyezettebb-keruletek"
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              <Wind size={16} className="text-brand-600" />
              Legszennyezettebb kerületek
              <ArrowRight size={14} className="ml-auto text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-8 flex items-center gap-2 text-sm text-slate-400">
          <Link
            href="/levegominoseg-budapest"
            className="flex items-center gap-1 hover:text-brand-600"
          >
            ← Vissza: Levegőminőség Budapest főoldal
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
