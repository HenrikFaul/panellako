import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Target,
  Heart,
  ShieldCheck,
  Smile,
  Database,
  Users,
  Building2,
  ArrowRight,
  CheckCircle,
  Star,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Rólunk — PanelLakó küldetése és értékei',
  description:
    'A PanelLakó mögötti csapat: magyar fejlesztők, akik a társasházi ügyintézést digitalizálják. Megismerjük a közös képviselők és lakók mindennapi kihívásait.',
  alternates: { canonical: 'https://panellako.hu/rolunk' },
};

const orgSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://panellako.hu/#organization',
  name: 'PanelLakó',
  url: 'https://panellako.hu',
  logo: {
    '@type': 'ImageObject',
    url: 'https://panellako.hu/icons/icon-512.png',
  },
  description:
    'Magyar társasházkezelő szoftver. Hibabejelentések, dokumentumok, pénzügyek és közgyűlések digitálisan.',
  foundingDate: '2023',
  areaServed: 'HU',
  inLanguage: 'hu',
  knowsAbout: ['Társasházi törvény', 'Közös képviselet', 'Ingatlankezelés', 'GDPR'],
  sameAs: [],
};

const PAIN_POINTS = [
  {
    icon: Building2,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    title: 'A közös képviselő koordinációs pokolban él',
    body: 'Napi szinten kap WhatsApp-üzeneteket, e-maileket és telefonhívásokat ugyanarról a csöpögő csapról. Nincs egységes rendszer, nincs státuszkövetés, nincs visszaigazolás — csak elszórt chat-előzmények és postafiókba temetett levelek.',
  },
  {
    icon: Users,
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-500',
    title: 'A lakók sötétben maradnak',
    body: 'Senki nem tudja, mikor javítják meg a liftét, hol van az aktuális SZMSZ, vagy hogyan szavaztak az előző közgyűlésen. Az átláthatóság hiánya bizalmatlanságot szül — ami aztán feszültségbe, végül jogvitákba torkollik.',
  },
  {
    icon: ShieldCheck,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-500',
    title: 'A jogszabályi megfelelés kézi munkát igényel',
    body: 'A 2003. évi CXXXIII. törvény és a GDPR együttesen komoly adminisztrációs terhet rónak a közös képviselőkre. Papír alapú nyilvántartásokkal ezt szinte lehetetlen hibamentesen teljesíteni, a mulasztásoknak pedig komoly jogi következményei lehetnek.',
  },
];

const VALUES = [
  {
    icon: Heart,
    iconBg: 'bg-brand-50',
    iconColor: 'text-brand-600',
    title: 'Átláthatóság',
    body: 'Minden lakó látja, mi történik az épületével: aktuális bejelentések, pénzügyek, dokumentumok — valós időben. Nincs több titkolódzás, nincs több bizalmatlanság.',
  },
  {
    icon: ShieldCheck,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    title: 'Magyar jogszabályi megfelelés',
    body: 'A PanelLakó a 2003. évi CXXXIII. tv. és a GDPR figyelembevételével készült. Az adatok Magyarországon tárolódnak, a funkciók az aktuális hazai előírásokhoz igazodnak.',
  },
  {
    icon: Smile,
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-600',
    title: 'Felhasználóbarát design',
    body: 'Nem kell IT-szakértőnek lenni. A PanelLakót úgy terveztük, hogy a 70 éves nyugdíjas és a 25 éves közös képviselő egyformán megtalálja benne a számítását — mobil és asztali eszközön egyaránt.',
  },
];

const DATA_SOURCES = [
  {
    name: 'BKK GTFS Open Data',
    desc: 'Tömegközlekedési adatok — megállók, menetrendek, útvonalak',
    href: 'https://opendata.bkk.hu',
  },
  {
    name: 'OpenAQ / Copernicus Atmosphere',
    desc: 'Levegőminőségi mérések és előrejelzések',
    href: 'https://openaq.org',
  },
  {
    name: 'OpenStreetMap contributors',
    desc: 'Térképi alapadatok és épület-geométriák',
    href: 'https://www.openstreetmap.org',
  },
  {
    name: 'KSH — Központi Statisztikai Hivatal',
    desc: 'Demográfiai és ingatlanpiaci statisztikák',
    href: 'https://www.ksh.hu',
  },
  {
    name: 'HungaroMet OMSZ',
    desc: 'Időjárási és zajszennyezési adatok',
    href: 'https://www.met.hu',
  },
];

const STATS = [
  { value: '300+', label: 'Épület', note: 'Aktív épületek száma, 2025. május' },
  { value: '12 000+', label: 'Lakó', note: 'Regisztrált lakói fiókok száma' },
  { value: '98%', label: 'Elégedettség', note: 'NPS alapú elégedettségi arány' },
];

export default function RolunkPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />

      <PublicNav />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <div className="mb-14 text-center">
          <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-md shadow-brand-200">
            <Building2 size={26} className="text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Rólunk — PanelLakó
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-500">
            Magyar platform, amely mögött közvetlen tapasztalat áll a társasházi ügyintézésből — és
            amely hisz abban, hogy ez nem kell, hogy fájdalmas legyen.
          </p>
        </div>

        {/* ── Mission ────────────────────────────────────────────────────── */}
        <section aria-labelledby="mission-heading" className="mb-16">
          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-brand-50 border border-slate-100 px-8 py-10">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
              <Target size={20} className="text-brand-700" />
            </div>
            <h2 id="mission-heading" className="mb-4 text-2xl font-black text-slate-900">
              Küldetésünk
            </h2>
            <p className="mb-4 text-base leading-relaxed text-slate-600">
              Magyarországon közel 50 000 társasházban él a lakások fele. A legtöbb épületet még
              mindig WhatsApp csoportokban, papír alapon vagy Excel táblázatokban kezelik — és ez
              mindenki számára problémát okoz: a közös képviselőnek, a lakóknak és a könyvelőknek
              egyaránt.
            </p>
            <p className="text-base leading-relaxed text-slate-600">
              A PanelLakót azért hoztuk létre, hogy ezt megváltoztassuk. Egy modern, átlátható,
              jogszabálynak megfelelő digitális platform, ahol mindenki megtalálja a számára
              szükséges funkciókat — akár bejelentést tesz egy lakó, akár éves elszámolást
              készít a közös képviselő.
            </p>
          </div>
        </section>

        {/* ── Pain points ────────────────────────────────────────────────── */}
        <section aria-labelledby="why-heading" className="mb-16">
          <h2 id="why-heading" className="mb-2 text-2xl font-black text-slate-900">
            Miért létezik a PanelLakó?
          </h2>
          <p className="mb-8 text-slate-500">
            Három valós probléma motiválta a platform megalkotását.
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            {PAIN_POINTS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
                >
                  <div
                    className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${p.iconBg}`}
                  >
                    <Icon size={22} className={p.iconColor} />
                  </div>
                  <h3 className="mb-2 text-base font-black text-slate-900">{p.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{p.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Values ─────────────────────────────────────────────────────── */}
        <section aria-labelledby="values-heading" className="mb-16">
          <h2 id="values-heading" className="mb-2 text-2xl font-black text-slate-900">
            Értékeink
          </h2>
          <p className="mb-8 text-slate-500">
            Három alapelv mentén hozzuk meg minden döntésünket — a termékfejlesztéstől az
            ügyfélszolgálatig.
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
                >
                  <div
                    className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${v.iconBg}`}
                  >
                    <Icon size={22} className={v.iconColor} />
                  </div>
                  <h3 className="mb-2 text-base font-black text-slate-900">{v.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{v.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Data sources (E-E-A-T) ─────────────────────────────────────── */}
        <section
          aria-labelledby="data-sources-heading"
          className="mb-16 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-8"
        >
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-card">
            <Database size={18} className="text-brand-600" />
          </div>
          <h2 id="data-sources-heading" className="mb-2 text-2xl font-black text-slate-900">
            Adatforrásaink
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-slate-500">
            Az elemzési és környezeti funkciókhoz az alábbi nyílt, megbízható adatforrásokat
            használjuk. Adatainkat rendszeresen frissítjük, és minden forrást feltüntetünk az
            alkalmazáson belül is.
          </p>
          <ul className="space-y-3">
            {DATA_SOURCES.map((ds) => (
              <li
                key={ds.name}
                className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 shadow-card"
              >
                <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
                <div>
                  <a
                    href={ds.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-slate-800 underline-offset-2 hover:text-brand-700 hover:underline"
                  >
                    {ds.name}
                  </a>
                  <span className="mx-2 text-slate-300">—</span>
                  <span className="text-sm text-slate-500">{ds.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>


        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <section aria-label="Megbíznak bennünk" className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-black text-slate-900">
            Bíznak bennünk
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center shadow-card"
              >
                <p className="text-3xl font-black text-brand-600">{s.value}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
            ))}
            <span className="ml-1.5 text-sm text-slate-500">
              Átlagos értékelés az aktív felhasználóinktól
            </span>
          </div>
          <ul className="mt-5 space-y-1 text-center">
            {STATS.map((s) => (
              <li key={s.label} className="text-xs text-slate-400">
                <span className="font-medium text-slate-500">{s.value} {s.label}</span>
                {' — '}
                {s.note}
              </li>
            ))}
          </ul>
        </section>

        {/* ── Bottom CTA ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-card-md">
          <h2 className="mb-2 text-2xl font-black text-white">
            Vegyük fel a kapcsolatot
          </h2>
          <p className="mb-6 text-brand-100">
            Kérdésed van? Szívesen bemutatjuk a platformot — akár egy 20 perces demóhívás
            keretében is.
          </p>
          <Link
            href="/kapcsolat"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-50"
          >
            Kapcsolatfelvétel
            <ArrowRight size={16} />
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
