import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Thermometer,
  ChevronRight,
  Leaf,
  Sun,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  TreePine,
  Building2,
  Droplets,
  Wind,
  TrendingUp,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Hőszigetek Budapest — Melyik Kerületekben a Legmelegebb Nyáron? | PanelLakó',
  description:
    'Budapest városi hősziget-térképe: melyik kerületekben mér a OMSZ 5-8°C-kal magasabb hőmérsékletet? UHI hatás mérséklésének lehetőségei épületszinten.',
  alternates: { canonical: 'https://panellako.hu/klimakockazat-epuleteknel/hoszigetek-budapest' },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Budapest hőszigetek — miért melegebb a belváros és mit tehetünk?',
  description:
    'Budapest városi hősziget-térképe: melyik kerületekben mér a OMSZ 5-8°C-kal magasabb hőmérsékletet? UHI hatás mérséklésének lehetőségei épületszinten.',
  inLanguage: 'hu',
  url: 'https://panellako.hu/klimakockazat-epuleteknel/hoszigetek-budapest',
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
      name: 'Klímakockázat Épületeknél',
      item: 'https://panellako.hu/klimakockazat-epuleteknel',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Hőszigetek Budapest',
      item: 'https://panellako.hu/klimakockazat-epuleteknel/hoszigetek-budapest',
    },
  ],
};

const DISTRICT_HEAT = [
  {
    kerület: 'VIII. ker. — Corvin köz',
    szint: 'Kritikus',
    elteres: '+7–8 °C',
    ok: 'Nagyon magas beépítettség, szinte nulla zöldfelület, széles aszfalt utak és épületek közötti hővissza­sugárzás.',
    badgeColor: 'bg-red-100 text-red-800',
    borderColor: 'border-red-200',
    bgColor: 'bg-red-50',
  },
  {
    kerület: 'IX. ker. — Ferencváros ipari zóna',
    szint: 'Magas',
    elteres: '+6–7 °C',
    ok: 'Ipari csarnokok és raktárak sötét tetőfelületei, korlátozott szellőzési folyosók, nagy forgalmú utak.',
    badgeColor: 'bg-orange-100 text-orange-800',
    borderColor: 'border-orange-200',
    bgColor: 'bg-orange-50',
  },
  {
    kerület: 'X. ker. — Kőbánya déli rész',
    szint: 'Magas',
    elteres: '+5–6 °C',
    ok: 'Összefüggő ipari beépítés, alacsony albedójú burkolatok, kevés árnyékoló fasor.',
    badgeColor: 'bg-orange-100 text-orange-800',
    borderColor: 'border-orange-200',
    bgColor: 'bg-orange-50',
  },
  {
    kerület: 'V–VI. ker. — Belső Pest',
    szint: 'Közepes–Magas',
    elteres: '+4–6 °C',
    ok: 'Szoros utcahálózat, mélyudvarok, sűrű forgalom, de némileg csökkentett ipari hőterhelés.',
    badgeColor: 'bg-amber-100 text-amber-800',
    borderColor: 'border-amber-200',
    bgColor: 'bg-amber-50',
  },
  {
    kerület: 'II. XII. ker. — Budai hegyvidék',
    szint: 'Mérsékelt',
    elteres: '+1–2 °C',
    ok: 'Kiterjedt erdőfelületek, szétszórt beépítés, természetes szellőzési folyosók a hegyek között.',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    borderColor: 'border-emerald-200',
    bgColor: 'bg-emerald-50',
  },
];

const BUILDING_ACTIONS = [
  {
    icon: Leaf,
    title: 'Tetőzöldítés',
    body:
      'Extenzív zöldtető (sédum, mohák) a tető felszíni hőmérsékletét akár 40–50 °C-ról 25–30 °C-ra csökkenti hőhullám idején — ez 5 °C körüli beltéri hőmérsékletsüllyedést is eredményezhet a tetőszinti lakásokban. Intenzív zöldtető magasabb teherbírást igényel, de cserjék és fák is ültethetők.',
  },
  {
    icon: Sun,
    title: 'Reflexív tetőfestés (cool roof)',
    body:
      'A 0,8+ albedójú fehér vagy ezüst tetőfesték visszaveri a napenergia több mint 80%-át. Egy 600 m²-es tető esetén ez a nyári hűtési energiafelhasználást 15–30%-kal csökkenti. A cost-of-living szempontból a legjobb megtérülésű beavatkozások egyike: kb. 800–1 200 Ft/m² alkalmazási költség, 3–5 éves megtérülési idő.',
  },
  {
    icon: Wind,
    title: 'Árnyékolás és függőleges kert',
    body:
      'Napellenző, marquise vagy lamella elhelyezése a délkeleti–délnyugati homlokzatokon a szolár nyereséget 40–60%-kal mérsékli. Függőleges zöld falak (climbing plants, moduláris rendszerek) homlokzaton akár 3–5 °C beltéri hőcsökkentést hoznak, és közben párologtatással tovább hűtenek.',
  },
  {
    icon: Droplets,
    title: 'Zöld belső udvar',
    body:
      'Egy burkolt, beton belső udvar nyáron hőcsapda. 4–6 fa és gyepfelület elhelyezése a belső udvaron az ott tartózkodó hőérzetet 6–8 °C-kal javítja. A tereprendezés vízelvezetési szempontból is hasznos: a növényzet csökkenti a villámárvíz-kockázatot.',
  },
];

export default function HoszigetekBudapestPage() {
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
          <Link href="/" className="hover:text-slate-600">Főoldal</Link>
          <ChevronRight size={14} />
          <Link href="/klimakockazat-epuleteknel" className="hover:text-slate-600">
            Klímakockázat Épületeknél
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-600">Hőszigetek Budapest</span>
        </nav>

        {/* Hero */}
        <div className="mb-14">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
            <Thermometer size={24} className="text-orange-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Budapest hőszigetek — miért melegebb a belváros és mit tehetünk?
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            Nyáron a VIII. kerületben akár 7–8 °C-kal magasabb a hőmérséklet, mint Budakeszin. Ez nem véletlen:
            a városi hősziget-effektus (Urban Heat Island, UHI) fizikailag bemérhető jelenség, amelyre
            az épületek tervezése és felújítása érdemi választ adhat. Az OMSZ műholdas és állomásos mérései,
            valamint a Copernicus LST-adatok alapján részletes képet kapunk Budapest kerületi hőtérképéről.
          </p>
        </div>

        {/* UHI definíció */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">Mi az Urban Heat Island (UHI) hatás?</h2>
          <div className="space-y-4 leading-relaxed text-slate-600">
            <p>
              A városi hősziget-effektus (UHI) azt a jól dokumentált jelenséget jelöli, amelynek során
              a sűrűn beépített városi területek szignifikánsan melegebbek a körülöttük lévő vidéki vagy
              erdős területeknél. A különbség nyári napokon 5–10 °C, éjszaka 3–5 °C is lehet.
            </p>
            <p>
              Az UHI három fő mechanizmuson alapul. Az első az <strong className="text-slate-800">aszfalt
              és beton hőtárolása</strong>: az alacsony albedójú burkolatok (aszfalt albedója 0,05–0,10,
              míg a fűé 0,25) a napsugárzást elnyelik és hőként tárolják, majd éjszaka sugározzák vissza.
              Egy nap során a beton tömegközlekedési csomóponton 60–70 °C-ra is felmelegedhet.
            </p>
            <p>
              A második tényező a <strong className="text-slate-800">zöldterületek hiánya</strong>. A
              növényzet evapotranzspirációval — vagyis a leveleken keresztüli párologtatással — hűti a
              környezetét. Ahol nincs zöldfelület, ott ez a természetes hűtési mechanizmus is hiányzik.
              Budapesten a VIII. kerületben a zöldfelület-arány mindössze 8–10%, szemben az EU 30%-os
              ajánlásával.
            </p>
            <p>
              Harmadikként az <strong className="text-slate-800">emberi hőkibocsátás</strong> is számít:
              közlekedési eszközök, légkondicionálók (amelyek a beltéri hőt a külső térbe lövik ki),
              ipari folyamatok és a sűrűn lakott épületek saját hőtermelése összességében akár 50–100 W/m²
              többlethőt adnak a városi légterhez.
            </p>
            <p>
              Az UHI <strong className="text-slate-800">éjszakai hatása különösen erős</strong>: míg vidéken
              a tárgyak és a föld éjszaka gyorsan lehűlnek, a városban felhalmozott hő lassabban adódik le.
              Ez azt jelenti, hogy nyáron a belvárosban még hajnali 4-kor is 28–30 °C lehet, miközben
              Budakeszin már 22 °C körül jár a hőmérő. Ennek következménye a pihenés és az alvásminőség
              romlása, ami krónikus egészségügyi problémákat is okozhat.
            </p>
          </div>
        </section>

        {/* Budapest mérése */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">Budapest hőszigeteinek mérése</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            Az OMSZ automatikus meteorológiai mérőhálózata (AGROMET) és a Copernicus Land Monitoring
            Service által közzétett műholdas Land Surface Temperature (LST) adatok — elsősorban a
            Landsat 8 és a Sentinel-3 SLSTR szenzorokból — lehetővé teszik Budapest hőterének részletes
            elemzését. Az LST mérések termikus infravörös sávban rögzítik a felszín hőmérsékletét,
            és 30–100 méteres felbontásban térképezik a városi hőtereket.
          </p>
          <p className="mb-6 leading-relaxed text-slate-500">
            Az adatok szerint a <strong className="text-slate-800">belváros és Budakeszi közötti
            hőmérséklet-különbség</strong> tartósan 5–8 °C, hőhullámok idején akár 9–10 °C is. Az
            alábbi táblázat a kerületek viszonylagos UHI-intenzitását mutatja be a rendelkezésre álló
            OMSZ és Copernicus LST-adatok alapján.
          </p>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            {DISTRICT_HEAT.map((row, i) => (
              <div
                key={row.kerület}
                className={`flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:gap-5 ${
                  i < DISTRICT_HEAT.length - 1 ? 'border-b border-slate-100' : ''
                } ${row.bgColor}`}
              >
                <div className="flex shrink-0 items-center gap-3 sm:w-56">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${row.badgeColor}`}>
                    {row.szint}
                  </span>
                  <span className={`text-xs font-black ${row.borderColor.replace('border', 'text')}`}>
                    {row.elteres}
                  </span>
                </div>
                <div>
                  <p className="mb-0.5 text-sm font-black text-slate-900">{row.kerület}</p>
                  <p className="text-xs leading-relaxed text-slate-600">{row.ok}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Forrás: OMSZ AGROMET mérőhálózat; Copernicus Land Surface Temperature (Landsat 8 / Sentinel-3 SLSTR);
            a hőmérsékleteltérések hőhullám-idő­szaki (júliusi) adatok alapján.
          </p>
        </section>

        {/* Miért veszélyes */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">Miért veszélyes a hőhullám Budapesten?</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            A hőhullámok egészségügyi kockázata egyenlőtlenül oszlik el: a legsérülékenyebb csoportok
            aránytalanul nagy terhet viselnek. Az Európai Hőhullám Korai Figyelmeztető Rendszer
            (EWENT) becslése szerint a 2003-as és a 2022-es hőhullámban Magyarországon is
            háromjegyű a hőséghez köthető többlethalálozás.
          </p>
          <div className="space-y-4">
            {[
              {
                icon: AlertTriangle,
                iconBg: 'bg-red-50',
                iconColor: 'text-red-600',
                title: 'Idős és kisgyermekes lakók',
                body:
                  '65 év felett a hőszabályozó képesség csökken; kisgyermekeknél a testfelület–tömeg arány kedvezőtlenebb. Mindkét csoport gyorsabban dehydrálódik. Az OMSZ és az ÁNTSZ közös ajánlása szerint a napi maximum hőmérséklet 38 °C felett a kockázat exponenciálisan nő.',
              },
              {
                icon: AlertTriangle,
                iconBg: 'bg-orange-50',
                iconColor: 'text-orange-600',
                title: 'Krónikus betegek — szív-érrendszer',
                body:
                  'Magas hőmérsékleten a szív munkaterhe megnő: a vér viszkozitása változik, a perifériás erek tágulnak. Hipertóniás, szívelégtelen vagy diabéteszes betegek esetén a hőhullámok a kórházi felvételek számát 20–30%-kal emelhetik a statisztikák szerint.',
              },
              {
                icon: Building2,
                iconBg: 'bg-amber-50',
                iconColor: 'text-amber-600',
                title: 'Panel lakások hőtárolása',
                body:
                  'A vasbeton panel szerkezet magas hőkapacitású anyag: nappal felmelegszik, éjszaka lassan adja le a hőt. Az 1970–90-es évek paneljeiben nincs hőszigetelés a mennyezeten, ami azt jelenti, hogy a tetőszinti lakás 5–8 °C-kal melegebb lehet a belső lakoknál. A beltéri hőmérséklet 33–35 °C felett is előfordul hőhullám idején.',
              },
              {
                icon: Sun,
                iconBg: 'bg-amber-50',
                iconColor: 'text-amber-600',
                title: 'Éjszakai lehűlés hiánya',
                body:
                  'Az álmatlanság és a pihenés hiánya kumulatív egészségromlással jár. Egy héten át tartó hőhullámban, ahol az éjszakai minimum sem süllyed 25 °C alá (ún. trópusi éjszaka), a munkaképesség csökken és a balesetek száma nő. 2022 júliusában Budapesten összesen 12 egymást követő trópusi éjszaka volt mérve.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                  <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}>
                    <Icon size={18} className={item.iconColor} />
                  </div>
                  <div>
                    <p className="mb-1.5 font-black text-slate-900">{item.title}</p>
                    <p className="text-sm leading-relaxed text-slate-500">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Zöldfelületek hűsítő hatása */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">Zöldfelületek hűsítő hatása</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            A növényzet az UHI elleni legtermészetesebb és legtöbb szempont szerint leghatékonyabb
            védelmet nyújtja. Az evapotranzspirációs hűtés és az árnyékolás együttes hatása fizikailag
            mérhető és jól dokumentált.
          </p>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: TreePine,
                iconBg: 'bg-emerald-50',
                iconColor: 'text-emerald-600',
                stat: '~70 kW/nap',
                label: 'Egy kifejlett fa hűsítő hatása párologtatással (evapotranzspirációval)',
              },
              {
                icon: Leaf,
                iconBg: 'bg-brand-50',
                iconColor: 'text-brand-600',
                stat: '1–3 °C',
                label: '1 ha park hatása az 1 km-es körzetben mérhető átlaghőmérsékletre',
              },
              {
                icon: TrendingUp,
                iconBg: 'bg-blue-50',
                iconColor: 'text-blue-600',
                stat: '30–40%',
                label: 'Zöldtető csapadék-visszatartási képessége, ami csökkenti a csatornaterhelést is',
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.stat} className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                  <div className={`mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}>
                    <Icon size={20} className={card.iconColor} />
                  </div>
                  <p className="mb-1 text-2xl font-black text-slate-900">{card.stat}</p>
                  <p className="text-xs leading-relaxed text-slate-500">{card.label}</p>
                </div>
              );
            })}
          </div>
          <p className="leading-relaxed text-slate-500">
            Fontos különbség van a <strong className="text-slate-800">zöldtető és a fehér (reflexív) tető</strong>
            {' '}között. A zöldtető aktívan hűt párologtatással és biológiai aktivitással, ráadásul
            csapadékvizet tart vissza. A cool roof (fehér tető) csak a szolár nyereséget csökkenti
            reflexióval, de nem párologtat. Mindkettő hatékony, de zöldtető hosszabb távon
            ökológiai és szociális értéket is teremt.
          </p>
        </section>

        {/* Mit tehet a társasház */}
        <section className="mb-16 rounded-2xl border border-slate-100 bg-slate-50 px-7 py-8">
          <h2 className="mb-4 text-2xl font-black text-slate-900">
            Mit tehet a társasház a hőszigetek ellen?
          </h2>
          <p className="mb-7 text-slate-500 leading-relaxed">
            A társasházi közösségek döntéseivel az épület hőterhelése érdemben csökkenthető. Az alábbi
            négy beavatkozás különböző beruházási szinten valósítható meg — közgyűlési határozattal
            és közös finanszírozással.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {BUILDING_ACTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-white bg-white px-5 py-5 shadow-sm">
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={17} className="text-brand-600" />
                  </div>
                  <h3 className="mb-2 text-sm font-black text-slate-900">{item.title}</h3>
                  <p className="text-xs leading-relaxed text-slate-500">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Budapest zöldítési programjai */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">Budapest zöldítési programjai</h2>
          <p className="mb-5 leading-relaxed text-slate-500">
            Budapest Főváros klímaadaptációs stratégiája (2020) és a Zöld Budapest program célul tűzi
            ki, hogy 2030-ra a belső kerületekben az egy főre jutó zöldfelület elérje az EU által
            ajánlott szintet. Ennek részeként:
          </p>
          <ul className="space-y-3">
            {[
              'Évente minimum 50 000 m² új zöldfelület létrehozása — a fókusz a VIII., IX. és X. kerületen van.',
              'Kerületi fásítási program: 2021–2025 között közel 10 000 új utcai faültetés tervezett, elsősorban hővezető utak mentén.',
              'Kötelező zöldfelület-arány új építési engedélyeknél: a zöld tetők és a közterületi zöldfelületek beszámítása a kötelező minimumba.',
              'Kerületi ösztönzők: a II., XII. és XIV. kerület helyi rendelettel is támogatja a zöldtető-telepítést (díjmentesség, kerületi pályázat).',
              'Európai finanszírozás: a Kohéziós Alap és a LIFE program zöld infrastruktúra prioritásai Budapest számára is elérhetők 2021–2027 között.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-slate-600">
                <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-600" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/60 px-6 py-5">
            <div className="flex items-start gap-3">
              <Leaf size={17} className="mt-0.5 shrink-0 text-brand-600" />
              <p className="text-sm leading-relaxed text-brand-800">
                <strong>Pályázati lehetőség:</strong> A Hatékony Ház Plusz program keretében a zöldtető
                telepítése társasházon az energetikai felújítással együtt 40–60%-os vissza nem térítendő
                támogatással finanszírozható. A pályázat előkészítéséhez energetikai audit és közgyűlési
                határozat szükséges.
              </p>
            </div>
          </div>
        </section>

        {/* Statisztikák */}
        <div className="mb-14 grid gap-4 sm:grid-cols-3">
          {[
            { value: '5–8 °C', label: 'Budapest belváros és a budai agglomeráció közötti hőmérsékleteltérés hőhullám idején (OMSZ/Copernicus LST)' },
            { value: '12 nap', label: 'Egymást követő trópusi éjszakák száma Budapesten 2022 júliusában' },
            { value: '8–10%', label: 'Zöldfelület-arány a VIII. kerületben — az EU 30%-os ajánlásával szemben' },
          ].map((stat) => (
            <div key={stat.value} className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center shadow-sm">
              <p className="mb-1 text-3xl font-black text-brand-600">{stat.value}</p>
              <p className="text-xs leading-snug text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mb-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-md">
          <h2 className="mb-2 text-2xl font-black text-white">
            Zöld felújítás és hűtési megoldások a társasházának
          </h2>
          <p className="mb-6 mx-auto max-w-lg text-brand-100">
            Tájékozódjon a zöldtető, reflexív festés és homlokzatzöldítés pályázati lehetőségeiről
            — és kezelje a társasháza UHI-ellenes beruházásait digitálisan a PanelLakó platformon.
          </p>
          <Link
            href="/zold-tarsashaz"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-transform hover:scale-[1.03]"
          >
            Zöld Társasház megoldások
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Vissza link */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/klimakockazat-epuleteknel" className="flex items-center gap-1 hover:text-brand-600">
            ← Vissza: Klímakockázat Épületeknél főoldal
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
