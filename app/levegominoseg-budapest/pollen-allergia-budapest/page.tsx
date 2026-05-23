import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Leaf,
  ChevronRight,
  AlertTriangle,
  Wind,
  Activity,
  ArrowRight,
  CheckCircle,
  Sun,
  BarChart2,
  ExternalLink,
  Calendar,
  ThumbsDown,
  Shield,
  Users,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Pollen és Allergia Budapest — Kerületi Szezon | PanelLakó',
  description:
    'Budapest pollenkoncentrációja kerületenként: nyírfa, fű, parlagfű szezonok. Allergiások tippjei, pollenjelző apps, alacsony pollenkoncentrációjú kerületek.',
  alternates: {
    canonical: 'https://panellako.hu/levegominoseg-budapest/pollen-allergia-budapest',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Pollen és allergia Budapest — mit kell tudni a pollenszezónról?',
  description:
    'Budapest pollenkoncentrációja kerületenként: nyírfa, fű, parlagfű szezonok. Allergiások tippjei, pollenjelző apps, alacsony pollenkoncentrációjú kerületek.',
  inLanguage: 'hu',
  url: 'https://panellako.hu/levegominoseg-budapest/pollen-allergia-budapest',
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
      name: 'Pollen és Allergia Budapest',
      item: 'https://panellako.hu/levegominoseg-budapest/pollen-allergia-budapest',
    },
  ],
};

const POLLEN_SEASONS = [
  {
    plant: 'Éger (Alnus)',
    season: 'Január – március',
    intensity: 3,
    note: 'Téli-tavaszi korai virágzó — meglepően erős hatást fejt ki enyhébb teleken.',
  },
  {
    plant: 'Mogyoró (Corylus)',
    season: 'Február – március',
    intensity: 3,
    note: 'Szintén korai allergén, keresztreakciót mutat nyírfával és egyéb lombhullató fákkal.',
  },
  {
    plant: 'Nyírfa (Betula)',
    season: 'Március – május',
    intensity: 5,
    note: 'A legfontosabb tavaszi allergén Magyarországon. Keresztreakció: alma, mogyoró, sárgarépa.',
  },
  {
    plant: 'Platán (Platanus)',
    season: 'Április – május',
    intensity: 4,
    note: 'Jellegzetesen budapesti allergén — a belváros utcasorain tömegesen ültetve.',
  },
  {
    plant: 'Fűfélék (Poaceae)',
    season: 'Május – augusztus',
    intensity: 5,
    note: 'Leghosszabb szezon, Magyarország egyik legdominánsabb allergia-forrása.',
  },
  {
    plant: 'Üröm (Artemisia)',
    season: 'Július – szeptember',
    intensity: 3,
    note: 'Nyári-őszi allergén. Keresztreakció: parlagfűvel, egyes fűszerekkel és zöldségekkel.',
  },
  {
    plant: 'Parlagfű (Ambrosia)',
    season: 'Augusztus – október',
    intensity: 5,
    note: 'Magyarország és Budapest "védjegye" — az EU-ban itt a legmagasabb a parlagfűpollen-terhelés.',
  },
];

const DISTRICT_POLLEN = [
  {
    type: 'Duna-parti kerületek (V., XIII., XI., I.)',
    icon: Wind,
    level: 'közepes',
    color: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    description:
      'A Duna mentén sűrűn sorakozó platánfák április-május között magas platánpollen-koncentrációt okoznak. A folyókörnyéki szellő szétteríti a pollent a parti lakóépületekbe is. Ugyanakkor a viszonylag rendezett zöldfelület-kezelés csökkenti a parlagfű terjedését.',
  },
  {
    type: 'Kertvárosias külső kerületek (XVI., XVII., XVIII., XXIII.)',
    icon: Leaf,
    level: 'magas',
    color: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-700',
    description:
      'A Budapest peremén lévő, lazáb beépítésű kertvárosias kerületekben nagyobb a parlagfű-állomány. A kevésbé intenzíven gondozott gyommentesítés és a külterületi területek közelsége miatt augusztus-október között kiugróan magas lehet a parlagfűpollen-koncentráció.',
  },
  {
    type: 'Belső kerületek (VI., VII., VIII., IX.)',
    icon: Activity,
    level: 'vegyes',
    color: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    description:
      'A sűrű városi beépítés eleve csökkenti a nyílt pollenforrások számát, ugyanakkor az utcasorokon alkalmazott faegyedek (platán, hárs, juhar) koncentrált pollenforrásokat jelentenek. A hőszigeti hatás meghosszabbíthatja a virágzási idényt 1–2 héttel.',
  },
  {
    type: 'Budai hegyvidéki kerületek (II., XII.)',
    icon: Sun,
    level: 'alacsony–közepes',
    color: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-700',
    description:
      'Erdős környezet, kevesebb parlagfű és jobb légcsere. Ugyanakkor a nyírfa és az egyéb lombhullató fák pollenje tavasszal számottevő. Általában az egyik legjobb választás allergiás lakók számára.',
  },
];

const ALLERGEN_APPS = [
  {
    name: 'ÁNTSZ Pollenjelző Szolgálat',
    url: 'https://polleninfo.hu',
    desc: 'A Nemzeti Népegészségügyi Központ (NNK) pollenjelző rendszere: aktuális napi pollenadatok több hazai mérőállomásról, heti előrejelzés.',
  },
  {
    name: 'European Pollen Information (EAN)',
    url: 'https://www.ean-net.org',
    desc: 'Pán-európai pollenmonitorozó hálózat. Budapest adatai az aerobiológiai mérőhálózaton keresztül elérhetők. Hasznosabb hosszabb távú trendekhez.',
  },
  {
    name: 'Copernicus Atmosphere Monitoring Service (CAMS)',
    url: 'https://atmosphere.copernicus.eu',
    desc: 'Az EU Copernicus program napi és 4 napos pollenelőrejelzése 5 km-es felbontásban — nyírfa, fű, parlagfű és üröm szezonokra.',
  },
  {
    name: 'IQAir AirVisual',
    url: 'https://www.iqair.com/air-quality-map',
    desc: 'Valós idejű PM2.5 és AQI térkép, ahol a pollen adatokat is megjelenítik városonként. Ingyenes alkalmazás iOS és Android platformon.',
  },
  {
    name: 'Pollen.com (Breezometer integrációval)',
    url: 'https://www.breezometer.com',
    desc: 'AI-alapú pollenkoncentráció-előrejelzés utcaszinten is — Budapest lefedettséggel rendelkezik.',
  },
];

const RESIDENT_TIPS = [
  {
    icon: Wind,
    title: 'HEPA légszűrő a lakásban',
    text: 'Egy H13 osztályú HEPA légszűrő a pollen 99,97%-át kiszűri — ez az egyik leghatékonyabb védekezési eszköz. Pollenszezonban tartsa bezárva az ablakokat, és a szobában kapcsolja be a szűrőt.',
  },
  {
    icon: Activity,
    title: 'Légkondicionáló szűrő rendszeres cseréje',
    text: 'A split klímák szűrői pollent és port gyűjtenek. Évente legalább egyszer, de pollenszezon előtt mindenképpen tisztítsa meg (vagy cserélje le) a belső egység szűrőit. Elmulasztva maga a klíma szórja vissza az összegyűlt allergéneket.',
  },
  {
    icon: Calendar,
    title: 'Szellőztetés időpontjának megválasztása',
    text: 'A pollenkoncentráció napközben és kora délután a legmagasabb (10–16 óra). Szellőztessen korán reggel (6–8 óra) vagy este, amikor a pollen megsűllik és leülepszik. Esős napon szellőztetni viszont különösen ajánlott — az eső letisztítja a levegőt.',
  },
  {
    icon: Shield,
    title: 'Antihistamin és allergiateszt',
    text: 'Az évenkénti allergiateszt (bőrpróba vagy IgE vérvizsgálat) meghatározza, melyik pollenre érzékeny. Az allergológus által felírt szezonális antihistamin lényegesen csökkenti a tüneteket. Allergenizációs immunkezelés hosszú távon akár gyógyulást is hozhat.',
  },
  {
    icon: CheckCircle,
    title: 'Ruha és haj szellőztetése',
    text: 'Magas pollenszezonban a kültéren viselt ruhán visszamarad a pollen — ne vigye be a hálószobába és lefekvés előtt zuhanyzzon. Ruhát ne szárítszon kint a szabadban — a kiakasztott ágynemű és ruha valóságos pollengyűjtővé válik.',
  },
  {
    icon: ThumbsDown,
    title: 'Kerülje a csúcsidőszakokat',
    text: 'Nyírfa- és fűpollenszinten csúcson napos, szeles napokon kerülje a hosszan tartózkodást parkokban és erdős területeken. Búvárkodás, kerékpározás és futás helyett ilyenkor a fedett uszoda vagy beltéri edzőterem a jobb választás.',
  },
];

const RAGWEED_OBLIGATIONS = [
  {
    title: 'A tulajdonos köteleze',
    text: 'A 340/2013. (IX. 25.) Korm. rendelet értelmében minden ingatlan tulajdonosa köteles az ingatlanon és az azt körülvevő területen a parlagfűvet virágzás előtt eltávolítani (kaszálni, gyomírtani). Ez természetes személyekre és jogi személyekre egyaránt vonatkozik.',
  },
  {
    title: 'Hatósági bejelentés lehetősége',
    text: 'Ha szomszédja vagy közeli telek tulajdonosa nem tartja be a kötelezettséget, bejelentést tehet a helyi önkormányzat Környezetvédelmi Irodájánál vagy az illetékes járási hivatalnál. Bírság akár 150 000 Ft is lehet, a kisebb területeket kevesebbre bírságolják.',
  },
  {
    title: 'Felelősség megosztása — társasházak',
    text: 'Társasháznál a közös tulajdonú területeket (udvar, parkoló, zöldterület) a közös képviselő köteles gondoztatni. Ha a parlagfű az épület körüli közös területen nő, a lakók az épület éves közgyűlésén kötelezhetik a közös képviselőt a rendszeres gyommentesítésre.',
  },
];

export default function PollenAllergiaBudapestPage() {
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
          <span className="font-medium text-slate-600">Pollen és Allergia Budapest</span>
        </nav>
        {/* Author meta */}
        <p className="mb-10 flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <span className="font-medium text-slate-600">PanelLakó szerkesztőség</span>
          <span aria-hidden="true">·</span>
          <time dateTime="2024-01-15">2024. január 15.</time>
          <span aria-hidden="true">·</span>
          <span>Frissítve: 2026. május 23.</span>
        </p>

        {/* Hero */}
        <div className="mb-14">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <Leaf size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Pollen és allergia Budapest — mit kell tudni a pollenszezónról?
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            Magyarországon az allergiás megbetegedések aránya folyamatosan emelkedik — becslések szerint
            a felnőtt lakosság közel 30%-a szenved valamilyen légúti allergiától. Budapest különösen
            érintett: a sűrű utcai fasor, a budai erdők és a peremkerületek parlagfűmezői egyaránt
            hozzájárulnak a főváros magasan tartott pollenterheléséhez. Ez az útmutató összefoglalja a
            legfontosabb szezonokat, kerületi különbségeket és az allergiások számára bevált
            védekezési stratégiákat.
          </p>
        </div>

        {/* Fő pollenszezonok — táblázat */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">
            A fő pollenszezonok Budapesten
          </h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            A fővárosban szinte egész évben megtalálható valamilyen pollen a levegőben — de az
            intenzitás és az érintett növényfajok szezonálisan változnak. Az alábbi táblázat a
            legfontosabb allergén növényeket, virágzási időszakukat és relatív erősségüket foglalja
            össze (1–5 csillag), kiemelve a három kiugró csúcsszezonos fajt.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Növény</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Szezon</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Erősség</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Megjegyzés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {POLLEN_SEASONS.map((row) => (
                  <tr key={row.plant} className={row.intensity === 5 ? 'bg-red-50/40' : ''}>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.plant}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.season}</td>
                    <td className="px-4 py-3 text-amber-500">
                      {'★'.repeat(row.intensity)}
                      <span className="text-slate-200">{'★'.repeat(5 - row.intensity)}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-sm leading-relaxed text-amber-800">
                <strong>Három csúcs-szezon:</strong> A nyírfa (március–május), a fűfélék
                (május–augusztus) és a parlagfű (augusztus–október) a három legnagyobb tünetgeneráló
                időszak. A pollenek egymást fedő szezonjuk miatt az allergiások akár 8–9 hónapig is
                tünetesek lehetnek megfelelő kezelés nélkül.
              </p>
            </div>
          </div>
        </section>

        {/* Parlagfű probléma */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">
            Parlagfű — Magyarország különleges problémája
          </h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            Magyarország az Európai Unió egyik legsúlyosabban érintett országa parlagfű
            (Ambrosia artemisiifolia) tekintetében. Budapest és körzete a parlagfű-koncentráció
            európai &quot;fővárosa&quot; — a Kárpát-medence klímája és a rossz gyomirtási gyakorlatok
            miatt a parlagfű évtizedek alatt terjedt el a külső kerületekben, utak mentén,
            parlagon hagyott területeken és üres telkeken. Egy parlagfűnövény napi szinten
            egymillió pollenszemet termelhet — és már néhány száz pollen/m³ fölött tünet
            jelentkezik az érzékenyeknél.
          </p>
          <div className="space-y-4">
            {RAGWEED_OBLIGATIONS.map((item) => (
              <div
                key={item.title}
                className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                  <Shield size={20} className="text-brand-600" />
                </div>
                <div>
                  <p className="mb-1 font-bold text-slate-900">{item.title}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
              <p className="text-sm leading-relaxed text-red-800">
                <strong>Fontos határidő:</strong> A parlagfű virágzása általában augusztus első
                felében tetőzik. A kötelező gyommentesítést legkésőbb júliusban el kell végezni,
                mielőtt a növény pollent szór — virágzás utáni kaszálás már nem hatékony, és
                hatósági bírságot is vonhat maga után.
              </p>
            </div>
          </div>
        </section>

        {/* Kerületi pollenterhelés */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">
            Melyik kerületben a legrosszabb a pollenterhelés?
          </h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            A pollenterhelés Budapesten kerületenként jelentősen eltérhet — az adott terület
            beépítési jellege, az utcai fafajok összetétele és a közelben lévő zöldterületek
            minősége egyaránt befolyásolja, hogy mekkora pollenkoncentrációnak van kitéve
            egy-egy társasházi lakó. Az alábbi összefoglaló a tipikus mintázatokat mutatja.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {DISTRICT_POLLEN.map((district) => {
              const Icon = district.icon;
              return (
                <div
                  key={district.type}
                  className={`rounded-2xl border p-5 ${district.color}`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                      <Icon size={20} className="text-brand-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Pollenterhelés</p>
                      <span className={`inline-block rounded-lg px-2 py-0.5 text-xs font-bold ${district.badge}`}>
                        {district.level}
                      </span>
                    </div>
                  </div>
                  <p className="mb-1.5 font-bold text-slate-900">{district.type}</p>
                  <p className="text-sm leading-relaxed text-slate-600">{district.description}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <p className="mb-2 text-sm font-bold text-slate-800">
              Lakásválasztás és allergia — mire figyeljen?
            </p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="mt-0.5 shrink-0 text-brand-600" />
                <span>Ellenőrizze, milyen fák vannak az épület körül — a platán és a nyírfa a leggyakoribb tavaszi allergének.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="mt-0.5 shrink-0 text-brand-600" />
                <span>Nézze meg a közeli üres telkeket és parkolókat — ezek jellemzően parlagfűgócok.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="mt-0.5 shrink-0 text-brand-600" />
                <span>Magasabb emeleten (4. emelet fölött) a pollen szintje némileg alacsonyabb lehet, mint a földszinten, ahol a pollen még nem oszlott szét.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Pollenjelző alkalmazások */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">
            Pollenjelző alkalmazások és megbízható források
          </h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            A pollen-előrejelzés ma már napra kész és területi felbontású. Az alábbi forrásokat
            ajánljuk allergiások és gondosan oda nem figyelő egészségesek számára egyaránt —
            mert a megfelelő információ lehetővé teszi, hogy Ön dönthessen arról, mikor szellőztet,
            mikor megy el futni és mikor viseli a maszkot.
          </p>
          <div className="space-y-4">
            {ALLERGEN_APPS.map((app) => (
              <div
                key={app.name}
                className="flex gap-4 rounded-2xl border border-brand-100 bg-brand-50/40 p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                  <ExternalLink size={18} className="text-brand-600" />
                </div>
                <div>
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-1 block font-bold text-slate-900 hover:text-brand-600"
                  >
                    {app.name} ↗
                  </a>
                  <p className="text-sm leading-relaxed text-slate-600">{app.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mit tehet az allergiás lakó */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">
            Mit tehet az allergiás lakó? — Praktikus tippek
          </h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            Az allergiás tünetek nem törvényszerűek — megfelelő beltéri és viselkedési
            stratégiával lényegesen csökkenthetők a hatások még erős pollenszezonban is.
            Az alábbi hat intézkedés a leghatékonyabb és legtöbbet bizonyított megközelítés.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {RESIDENT_TIPS.map((tip) => {
              const Icon = tip.icon;
              return (
                <div
                  key={tip.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
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

        {/* Közös képviselő teendői */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-black text-slate-900">
            Közös képviselői teendők parlagfű esetén
          </h2>
          <p className="mb-6 leading-relaxed text-slate-500">
            Társasházi lakóként nem csak egyéni védekezéssel befolyásolhatja allergiás terhelését
            — a közös tulajdonú területek gondozása jogi kötelezettség, amelyet a közös képviselő
            köteles teljesíteni.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Feladat</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Ki felelős?</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Határidő</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  {
                    task: 'Közös területek parlagfűmentesítése (kaszálás, gyomirtás)',
                    who: 'Közös képviselő / megbízott karbantartó',
                    deadline: 'Legkésőbb július vége',
                  },
                  {
                    task: 'Rendszeres kaszálás (parlagfű visszanövés ellen)',
                    who: 'Közös képviselő',
                    deadline: 'Háromhetente, július–október',
                  },
                  {
                    task: 'Szomszéd ingatlan bejelentése hatóságnál',
                    who: 'Bármely lakó',
                    deadline: 'Legkésőbb virágzás előtt',
                  },
                  {
                    task: 'Önkormányzati parlagfűjárás kérése',
                    who: 'Közös képviselő vagy lakó',
                    deadline: 'Júniusban',
                  },
                  {
                    task: 'Parkolók, garázsok előtti zöldterület gondozása',
                    who: 'Közös képviselő',
                    deadline: 'Folyamatos (éves karbantartási tervben)',
                  },
                ].map((row) => (
                  <tr key={row.task}>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.task}</td>
                    <td className="px-4 py-3 text-slate-600">{row.who}</td>
                    <td className="px-4 py-3 text-slate-600">{row.deadline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
            <div className="flex items-start gap-3">
              <Users size={18} className="mt-0.5 shrink-0 text-brand-600" />
              <p className="text-sm leading-relaxed text-slate-700">
                <strong>Közgyűlési határozat:</strong> Ha a közös képviselő nem gondoskodik a
                parlagfűmentesítésről, a lakók közgyűlésen kötelező határozatot hozhatnak a
                rendszeres gyomirtásra — és annak költségét a közös költségbe tervezhetik.
                A hibabejelentés funkció a PanelLakóban segít dokumentálni ezeket az
                igényeket és nyomon követni a megoldást.
              </p>
            </div>
          </div>
        </section>

        {/* Pollenadatok a PanelLakón */}
        <section className="mb-16 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-8">
          <div className="mb-4 flex items-center gap-3">
            <Activity size={18} className="text-brand-600" />
            <p className="font-bold text-slate-900">Pollenadatok a PanelLakóban</p>
          </div>
          <p className="mb-4 leading-relaxed text-slate-600">
            A PanelLakó levegőminőség modulja mutatja az aktuális pollenkoncentrációt a lakás
            helyszínén — közvetlenül a Copernicus és az ÁNTSZ adatfolyamokból. Beállíthatók
            értesítők, amelyek magas pollenszezonban figyelmeztetnek, mielőtt szellőztet vagy
            kinyitja az ablakot. Az épület körüli parlagfűprobléma szintén bejelenthetők a
            hibabejelentés modulon keresztül — a közös képviselő értesítést kap és rögzíteni
            kell a megoldás határidejét.
          </p>
          <ul className="mb-4 space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="shrink-0 text-brand-600" />
              <span>Valós idejű pollenkoncentráció-értesítők az Ön lakóhelyszínére</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="shrink-0 text-brand-600" />
              <span>Szellőztetési ablak javaslatok pollenszezonban</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={14} className="shrink-0 text-brand-600" />
              <span>Parlagfű-bejelentés közös képviselőnek dokumentált, nyomon követhető módon</span>
            </li>
          </ul>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <ExternalLink size={12} className="shrink-0 text-brand-600" />
            <a
              href="https://atmosphere.copernicus.eu"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-600"
            >
              Copernicus CAMS pollen adatok
            </a>
            <span>·</span>
            <a
              href="https://polleninfo.hu"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-600"
            >
              NNK Pollenjelző Szolgálat
            </a>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-lg">
          <h2 className="mb-2 text-2xl font-black text-white">
            Parlagfű az épület körül? Jelezze a PanelLakóban!
          </h2>
          <p className="mb-6 text-brand-100">
            A PanelLakó hibabejelentő moduljában dokumentáltan, nyomon követhető módon jelezheti
            a közös képviselőnek a parlagfű-problémát, a kaszálás szükségességét vagy bármely más,
            az allergiás lakókat érintő gondot. Az értesítők és a pollenelőrejelzés segítenek
            felkészülni a szezonra.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-50"
          >
            <CheckCircle size={16} />
            Bejelentkezés a PanelLakóba
          </Link>
        </div>

        {/* Kapcsolódó cikkek */}
        <div className="mt-12">
          <p className="mb-4 text-sm font-bold text-slate-700">Kapcsolódó cikkek</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/levegominoseg-budapest/belteri-levegominoseg-tarsashazban"
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              <Activity size={16} className="text-brand-600" />
              Beltéri levegőminőség társasházi lakásokban
              <ArrowRight size={14} className="ml-auto text-slate-400" />
            </Link>
            <Link
              href="/levegominoseg-budapest/pm25-pm10-mit-jelent"
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              <BarChart2 size={16} className="text-brand-600" />
              PM2.5 és PM10 — mit jelent?
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
