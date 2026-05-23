import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MapPin,
  ArrowRight,
  CheckCircle,
  Building2,
  Train,
  Leaf,
  Activity,
  Users,
  Globe,
  Clock,
  ShoppingBag,
  Heart,
  GraduationCap,
  Bike,
  Home,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: '15 Perces Város Budapest — Milyen Kerületekben Valósul Meg? | PanelLakó',
  description:
    'A 15 perces város koncepció Budapesten: melyik kerületekben elérhető gyalog minden napi szükséglet? Iskolák, orvosok, üzletek, tömegközlekedés 15 perces körzetben.',
  alternates: { canonical: 'https://panellako.hu/15-perces-varos' },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: '15 perces város Budapest — valóság vagy álom?',
  description:
    'A 15 perces város koncepció Budapesten: melyik kerületekben elérhető gyalog minden napi szükséglet? Iskolák, orvosok, üzletek, tömegközlekedés 15 perces körzetben.',
  url: 'https://panellako.hu/15-perces-varos',
  inLanguage: 'hu',
  publisher: {
    '@type': 'Organization',
    name: 'PanelLakó',
    url: 'https://panellako.hu',
    logo: {
      '@type': 'ImageObject',
      url: 'https://panellako.hu/icons/icon-512.png',
    },
  },
  about: {
    '@type': 'Thing',
    name: '15 perces város',
    description: 'Városi tervezési koncepció, amelyben minden napi szükséglet 15 percen belül elérhető gyalog vagy kerékpárral',
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
      name: '15 Perces Város',
      item: 'https://panellako.hu/15-perces-varos',
    },
  ],
};

const DAILY_NEEDS = [
  { icon: ShoppingBag, label: 'Bevásárlás', sub: 'Élelmiszer, piac, alapvető boltok' },
  { icon: Heart, label: 'Egészségügy', sub: 'Háziorvos, gyógyszertár, klinika' },
  { icon: GraduationCap, label: 'Oktatás', sub: 'Óvoda, általános iskola, könyvtár' },
  { icon: Leaf, label: 'Szabadidő', sub: 'Park, sportpálya, közterület' },
  { icon: Users, label: 'Közösség', sub: 'Kultúra, közösségi tér, iroda' },
  { icon: Train, label: 'Közlekedés', sub: 'Megálló, kerékpáros útvonal' },
];

const INNER_DISTRICTS = [
  { name: 'V. kerület (Belváros)', reason: 'A legkompaktabb funkció-mix: sétálóutcák, orvosi rendelők, iskolák, piacok és tömegközlekedési csomópontok egymás mellett.' },
  { name: 'VI. kerület (Terézváros)', reason: 'Nagykörút–Andrássy folyosó: sűrű kereskedelmi, kulturális és közszolgáltatási kínálat kerékpáros infrastruktúrával.' },
  { name: 'VII. kerület (Erzsébetváros)', reason: 'Rákóczi út és Klauzál tér: piac, iskolák, orvosi rendelők és metróhozzáférés sűrű lakókörnyezetben.' },
  { name: 'XIII. kerület belső része', reason: 'Újlipótváros: folyamatos fejlesztés alatt álló, fiatalos lakókörnyezet jó elérhetőséggel és zöldterületekkel a Duna mentén.' },
];

const OUTER_DISTRICTS = [
  { name: 'XV. kerület', reason: 'Nagyobb távolságok, kevesebb piac és közszolgáltatás, autófüggő közlekedési struktúra.' },
  { name: 'XVI. kerület', reason: 'Kertvárosias beépítés, ritka tömegközlekedés, hiányzó kerékpáros infrastruktúra.' },
  { name: 'XVII. kerület', reason: 'Monofunkcionális lakóterületek, a legtöbb közszolgáltatás csak autóval érhető el.' },
];

const PLATFORM_MODULES = [
  {
    icon: Train,
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-600',
    title: 'Tömegközlekedési elérhetőség',
    body: 'A BKK GTFS adatok alapján kiszámítja, hány megálló érhető el 5 és 15 perces gyaloglással, és ezek milyen járattípusokat kínálnak (metró, villamos, busz).',
  },
  {
    icon: Activity,
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600',
    title: 'Levegőminőség',
    body: 'A 15 perces körzetben mért PM2.5, NO₂ és O₃ koncentrációk — mert a gyaloglás értéke csökken, ha közben szennyezett levegőt kell belélegeznie.',
  },
  {
    icon: Leaf,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    title: 'Zöldterületek',
    body: 'Copernicus NDVI adatok alapján a körzet növényzeti borítottsága és a gyalogos körzeten belül elérhető parkok és közterületek száma.',
  },
  {
    icon: Globe,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    title: 'Zajszennyezés',
    body: 'EU 2002/49/EK szerinti Ldn értékek: a gyaloglhatóság ellenáll, ha a környék zsúfolt forgalommal és magas zajszinttel jár.',
  },
  {
    icon: Heart,
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    title: 'Közszolgáltatások',
    body: 'OpenStreetMap POI-adatok alapján: orvos, gyógyszertár, iskola, piac — ezek 15 perces gyaloglási körzetbe esnek-e?',
  },
];

const RESIDENT_BENEFITS = [
  {
    icon: Home,
    title: 'Lakóhely kiválasztás',
    body: 'Mielőtt albérletet bérel vagy lakást vásárol, azonnal láthatja, mi érhető el gyalog a kiszemelt ingatlanból — orvos, iskola, piac, megálló.',
  },
  {
    icon: GraduationCap,
    title: 'Gyermekek biztonsága',
    body: 'Szülők számára kritikus: milyen iskolák és óvodák vannak 10–15 perces sétára, biztonságos gyalogos és kerékpáros útvonalon?',
  },
  {
    icon: Users,
    title: 'Idősek mobilitása',
    body: 'Az autóvezetési lehetőség csökkenésével az idősek számára a gyaloglási körzetben elérhető orvos és bevásárlási lehetőség életminőség-kérdéssé válik.',
  },
  {
    icon: Activity,
    title: 'Felújítási döntések',
    body: 'Közös képviselők és tulajdonosok számára: a jó 15 perces lefedettség indokolja a magasabb értékű felújítást — és emeli az ingatlan piaci értékét.',
  },
];

export default function TizenOtPercesVarosPage() {
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

        {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
        <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-1.5 text-xs text-slate-400">
          <Link href="/" className="hover:text-slate-700">
            Főoldal
          </Link>
          <span>/</span>
          <span className="text-slate-600">15 Perces Város</span>
        </nav>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <div className="mb-14">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">
            <Clock size={13} />
            Városfejlesztési koncepció
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            15 perces város Budapest — valóság vagy álom?
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-500">
            Carlos Moreno párizsi urbanista 2016-ban fogalmazta meg azt a várostervezési koncepciót,
            amely azóta a világ legtöbb nagyvárosa számára irányadóvá vált. Budapest 2030-as fejlesztési
            stratégiájában szintén megjelenik — de vajon a valóságban milyen kerületek közelítik meg
            a 15 perces ideált?
          </p>
        </div>

        {/* ── Mi a 15 perces város? ───────────────────────────────────────── */}
        <section aria-labelledby="mi-az" className="mb-14">
          <h2 id="mi-az" className="mb-4 text-2xl font-black text-slate-900">
            Mi a 15 perces város?
          </h2>
          <p className="mb-5 text-base leading-relaxed text-slate-600">
            A 15 perces város (<em lang="fr">la ville du quart d&apos;heure</em>) alapötlete egyszerű:
            minden napi szükségletnek elérhetőnek kell lennie 15 percen belül, gyalog vagy kerékpárral,
            az otthonunkból. Nem a városközponttól — hanem attól a ponttól, ahol az ember lakik.
          </p>
          <p className="mb-6 text-base leading-relaxed text-slate-600">
            Ez a hat alapszükségletet foglalja magában: munka (vagy legalább a tömegközlekedési csomópont
            hozzá), oktatás, egészségügy, bevásárlás, zöldterület és közösségi élet. Ha mind a hat
            gyalogos körzetben van, az ember életminősége drámaian javul — kevesebb stressz,
            kevesebb autóhasználat, több mozgás, erősebb közösség.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {DAILY_NEEDS.map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="flex flex-col items-start gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
                  <Icon size={16} className="text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{label}</p>
                  <p className="text-xs leading-relaxed text-slate-500">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Budapest stratégia ─────────────────────────────────────────── */}
        <section aria-labelledby="budapest-strategia" className="mb-14">
          <h2 id="budapest-strategia" className="mb-4 text-2xl font-black text-slate-900">
            Budapest és a 15 perces város stratégia
          </h2>
          <p className="mb-5 text-base leading-relaxed text-slate-600">
            A <strong>Budapest 2030 Fővárosi Fejlesztési Stratégia</strong> — amelyet a Fővárosi
            Önkormányzat fogadott el — kimondottan hivatkozik a sétálható és kerékpározható
            városrészek kialakítására, a helyi gazdasági terek megerősítésére és a funkcionális
            vegyes beépítés ösztönzésére. A sétálóváros program keretében több belső kerület
            forgalomcsillapítási és zöldítési programba kezdett.
          </p>
          <p className="mb-5 text-base leading-relaxed text-slate-600">
            Az egyes kerületek eltérő ütemben és eltérő fókusszal haladnak. A belső kerületek
            (I–VIII.) jobb kiindulási pozícióból indulnak: sűrűbb beépítés, vegyes funkciók
            és kiterjedtebb tömegközlekedési hálózat jellemzi őket. A külső kerületek esetében
            az infrastruktúra kiépítése évtizedes beruházásokat igényel.
          </p>
          <div className="rounded-2xl border border-brand-100 bg-brand-50 px-6 py-5">
            <p className="text-sm leading-relaxed text-brand-800">
              <strong>Kulcsszám:</strong> Az EEA (Európai Környezetvédelmi Ügynökség) 2022-es
              felmérése szerint Budapest belsőbb kerületeiben a lakók 68%-a ér el 10 percen belül
              megállót, szemben a külső kerületek 31%-ával. A szolgáltatás-elérhetőség ehhez képest
              még egyenlőtlenebb.
            </p>
          </div>
        </section>

        {/* ── Legjobb kerületek ──────────────────────────────────────────── */}
        <section aria-labelledby="legjobb-keruletek" className="mb-14">
          <h2 id="legjobb-keruletek" className="mb-4 text-2xl font-black text-slate-900">
            Melyik kerületek közelítenek hozzá legjobban?
          </h2>
          <p className="mb-6 text-base leading-relaxed text-slate-600">
            A 15 perces városideál nem egyenletes Budapest térképén. A belső kerületek historikusan
            vegyes funkciójú, kompakt beépítésükkel előnyt élveznek a tervezési cél szempontjából.
          </p>

          <h3 className="mb-3 text-base font-black text-slate-800">
            Jobb lefedettségű belső kerületek
          </h3>
          <div className="mb-6 space-y-3">
            {INNER_DISTRICTS.map(({ name, reason }) => (
              <div key={name} className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-bold text-slate-800">{name}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{reason}</p>
                </div>
              </div>
            ))}
          </div>

          <h3 className="mb-3 text-base font-black text-slate-800">
            Külső, monofunkcionális lakóterületek — nagyobb kihívással
          </h3>
          <div className="space-y-3">
            {OUTER_DISTRICTS.map(({ name, reason }) => (
              <div key={name} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" />
                <div>
                  <p className="text-sm font-bold text-slate-700">{name}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{reason}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PanelLakó modul ────────────────────────────────────────────── */}
        <section aria-labelledby="panellako-modul" className="mb-14">
          <h2 id="panellako-modul" className="mb-4 text-2xl font-black text-slate-900">
            A PanelLakó 15 perces elemzőmodul
          </h2>
          <p className="mb-6 text-base leading-relaxed text-slate-600">
            A PanelLakó elemzőmotorja öt dimenzióban méri, mennyire felel meg egy adott épület
            lakókörnyezete a 15 perces város elvárásainak — nyílt adatforrások alapján, automatikusan
            frissülő értékekkel.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {PLATFORM_MODULES.map(({ icon: Icon, iconBg, iconColor, title, body }) => (
              <div
                key={title}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
                  <Icon size={20} className={iconColor} />
                </div>
                <h3 className="mb-1.5 text-sm font-black text-slate-900">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Hogyan segít a lakóknak? ────────────────────────────────────── */}
        <section aria-labelledby="lakoi-haszon" className="mb-14">
          <h2 id="lakoi-haszon" className="mb-4 text-2xl font-black text-slate-900">
            Hogyan segít ez a lakóknak?
          </h2>
          <p className="mb-6 text-base leading-relaxed text-slate-600">
            A 15 perces elemzés nem elvont urbanisztikai mutatószám — közvetlen hatással van a
            mindennapi életminőségre. Négy konkrét felhasználási eset:
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {RESIDENT_BENEFITS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="flex gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                  <Icon size={18} className="text-brand-600" />
                </div>
                <div>
                  <p className="mb-1 text-sm font-bold text-slate-800">{title}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Közlekedési elérhetőség vs. életminőség ────────────────────── */}
        <section aria-labelledby="kozlekedes-eletminoseg" className="mb-14">
          <h2 id="kozlekedes-eletminoseg" className="mb-4 text-2xl font-black text-slate-900">
            Közlekedési elérhetőség vs. életminőség
          </h2>
          <p className="mb-5 text-base leading-relaxed text-slate-600">
            A 15 perces város megvalósíthatóságát nem egyedül a tömegközlekedési sűrűség határozza
            meg. A valódi életminőség-növelés háromszoros kombinációt igényel:
          </p>
          <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-6">
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                {
                  icon: Train,
                  title: 'Tömegközlekedés',
                  body: 'Megállóközelség, járatsűrűség és éjszakai elérhetőség — mert a 15 perces várost élni is kell, nemcsak napközben.',
                },
                {
                  icon: Bike,
                  title: 'Kerékpározhatóság',
                  body: 'Biztonságos kerékpáros infrastruktúra kiterjeszti a tényleges 15 perces körzetét — a kerékpáros hatótávolság közel háromszorosa a gyaloglásának.',
                },
                {
                  icon: MapPin,
                  title: 'Gyaloglás',
                  body: 'A legfenntarthatóbb módozat, de csak akkor vonzó, ha a járda minősége, a zajszint és a levegőminőség megfelelő. Ezért mérünk minden dimenziót.',
                },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex flex-col items-start gap-2">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                    <Icon size={16} className="text-brand-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">{title}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{body}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-base leading-relaxed text-slate-600">
            Amikor a PanelLakó egy épület 15 perces pontszámát kiszámítja, mindhárom dimenziót
            figyelembe veszi — mert a gyaloglási és kerékpáros lehetőségek csak akkor értékesek,
            ha az útvonal biztonságos, csendes és tiszta levegőjű.
          </p>
        </section>

        {/* ── Közös képviselői perspektíva ───────────────────────────────── */}
        <section aria-labelledby="kozos-kepviseloi" className="mb-14">
          <h2 id="kozos-kepviseloi" className="mb-4 text-2xl font-black text-slate-900">
            Közös képviselői perspektíva
          </h2>
          <p className="mb-5 text-base leading-relaxed text-slate-600">
            A 15 perces lefedettség nemcsak a lakói életminőség, hanem az épület piaci értékének
            szempontjából is egyre fontosabb. Az ingatlanpiaci kutatások következetesen azt mutatják,
            hogy a jobb gyaloglási elérhetőséggel (walk score) rendelkező ingatlanok magasabb
            árszintet tartanak fenn — még a gazdasági visszaesések idején is.
          </p>
          <p className="mb-5 text-base leading-relaxed text-slate-600">
            A PanelLakó 15 perces modulja ezért közvetlen eszköz a közös képviselők és
            ingatlankezelők számára is: dokumentálható, adatalapú érv a felújítási beruházások
            indoklásához, az éves közgyűlési előterjesztésekhez és az épület értékmegőrzési
            stratégiájának kommunikálásához a lakók felé.
          </p>
          <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-teal-50 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                <Building2 size={16} className="text-brand-600" />
              </div>
              <p className="text-sm leading-relaxed text-brand-800">
                <strong>Tipp közös képviselőknek:</strong> Ha az épület 15 perces pontszáma javult
                (pl. új megálló nyílt, vagy közeli orvosi rendelő nyitott), ezt aktívan kommunikálja
                a lakók felé — a lakáspiaci értéknövelő hatás az éves elszámolás pozitív kontextusát
                adhatja.
              </p>
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-sm">
          <h2 className="mb-2 text-2xl font-black text-white">
            Ellenőrizze épülete 15 perces lefedettségét
          </h2>
          <p className="mb-6 text-brand-100">
            Adja meg az épület címét, és másodpercek alatt megtudja, milyen tömegközlekedési,
            levegőminőségi, zajszennyezési és közszolgáltatási lefedettség érhető el 15 perces
            gyaloglással.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/elemzes"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-50"
            >
              Elemzés indítása
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/20"
            >
              Ingyenes regisztráció
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
