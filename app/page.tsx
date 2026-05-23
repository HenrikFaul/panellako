import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, FolderOpen, Calculator, Users, Vote, Bell, Building2, Scale, Wind, Leaf, ArrowRight } from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'PanelLakó – Társasházkezelő szoftver közös képviselőknek',
  description:
    'Kezelje a társasházát digitálisan: hibabejelentések, dokumentumok, pénzügyek és szavazások egy helyen. 14 napos ingyenes próba, kártyaadat nélkül.',
  openGraph: {
    title: 'PanelLakó – Társasházkezelő szoftver közös képviselőknek',
    description:
      'Kezelje a társasházát digitálisan: hibabejelentések, dokumentumok, pénzügyek és szavazások egy helyen. 14 napos ingyenes próba, kártyaadat nélkül.',
    url: 'https://panellako.hu',
    siteName: 'PanelLakó',
    locale: 'hu_HU',
    type: 'website',
  },
  alternates: { canonical: '/' },
};

const faqItems = [
  {
    question: 'Mi a közös képviselő feladata?',
    answer:
      'A közös képviselő a társasház törvényes képviselője: ő gondoskodik az épület karbantartásáról, összehívja és levezeti a közgyűléseket, kezeli a közös költség befizetéseket, megbízza a szükséges mesterembereket és vezeti az épülettel kapcsolatos adminisztratív dokumentációt. A PanelLakó mindezeket az adminisztrációs feladatokat digitalizálja, így a közös képviselőnek több ideje marad az érdemi munkára.',
  },
  {
    question: 'Mennyibe kerül a PanelLakó?',
    answer:
      'A PanelLakó 14 napos ingyenes próbaidőszakkal rendelkezik – kártyaadat megadása nélkül. A próbaidőszak után a havidíj az épület méretétől (lakások számától) függ. Részletes árinformációért látogasson el az Árak oldalra, vagy vegye fel velünk a kapcsolatot.',
  },
  {
    question: 'Milyen biztonságos az adatkezelés?',
    answer:
      'A PanelLakó GDPR-kompatibilis adatkezelést alkalmaz. Az adatokat az EU területén, Supabase infrastruktúrán tároljuk, amely ISO 27001 tanúsítvánnyal rendelkező adatközpontokban üzemel. A kommunikáció végig TLS titkosítással védett. A személyes adatokat harmadik félnek nem adjuk ki.',
  },
  {
    question: 'Kell-e telepíteni valamit?',
    answer:
      'Nem, a PanelLakó teljesen böngészőalapú szoftver – semmit nem kell letölteni vagy telepíteni. Bármilyen modern böngészőből elérhető számítógépen, tableten és okostelefonon egyaránt. Az alkalmazás reszponzív designja biztosítja, hogy mobilon is kényelmes legyen a használata.',
  },
  {
    question: 'Hogyan kezdhetem el?',
    answer:
      'Regisztráljon ingyenesen a weboldalon – a folyamat 2 percet vesz igénybe, és kártyaadatokat nem kérünk. Azonnal hozzáférést kap az összes funkcióhoz, és a 14 napos próbaidőszak alatt bármikor segítünk a rendszer beüzemelésében. Ha kérdése van, az élő ügyfélszolgálatunk segít.',
  },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Authenticated users go straight to the building picker
  if (user) {
    redirect('/app');
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <PublicNav />

      <main className="flex flex-col">

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-slate-50 pt-20 pb-24 sm:pt-28 sm:pb-32">
          {/* decorative blobs */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -right-40 h-[640px] w-[640px] rounded-full bg-brand-100/60 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 -left-32 h-[480px] w-[480px] rounded-full bg-sky-100/50 blur-3xl"
          />

          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 animate-fade-in">
              14 napos ingyenes próba · Kártyaadat nélkül
            </span>

            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl animate-fade-in-up">
              Digitális{' '}
              <span className="bg-gradient-to-r from-brand-500 to-sky-500 bg-clip-text text-transparent">
                társasházkezelő
              </span>{' '}
              platform
            </h1>

            <p className="mt-6 mx-auto max-w-2xl text-lg leading-relaxed text-slate-600 animate-fade-in-up [animation-delay:60ms]">
              A PanelLakó a legegyszerűbb módja a társasházi adminisztráció digitalizálásának.
              Hibabejelentések, dokumentumok, közös költség nyilvántartás és közgyűlések —
              egyetlen, könnyen kezelhető felületen. Közös képviselőknek, lakóknak és könyvelőknek.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-fade-in-up [animation-delay:120ms]">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-7 py-3.5 text-sm font-black text-white shadow-card-md shadow-brand-200 transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                Ingyenes próba indítása
              </Link>
              <Link
                href="/funkciok"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 shadow-card transition-colors hover:border-brand-300 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                Bemutató megnézése
              </Link>
            </div>
          </div>
        </section>

        {/* ── TRUST BAR ─────────────────────────────────────────────────────── */}
        <section className="border-y border-slate-100 bg-white py-5">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
              {[
                '300+ épület',
                '12 000+ lakó',
                '98% elégedettség',
                '14 napos ingyen próba',
              ].map((stat) => (
                <li
                  key={stat}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-700"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  {stat}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── PAIN POINTS ───────────────────────────────────────────────────── */}
        <section className="bg-slate-50 py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Mire nem való a WhatsApp és az Excel?
              </h2>
              <p className="mt-4 mx-auto max-w-2xl text-base leading-relaxed text-slate-500">
                Sok társasháznál a kommunikáció csoportos chatben zajlik, a dokumentumok
                mappákban porosodnak, a könyvelés pedig kézzel írt táblázatokban él. Ez káoszhoz,
                átláthatatlansághoz és elveszett információkhoz vezet — mindenki számára.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {[
                {
                  emoji: '📱',
                  title: 'WhatsApp-káosz',
                  body:
                    'A hibabejelentések, szavazások és hirdetmények összekeverednek a privát üzenetekkel. Fontos kérések elmerülnek az üzenetáradatban, senki sem tudja ki felelős miért, és nincs nyomkövetés.',
                },
                {
                  emoji: '📂',
                  title: 'Papír dokumentumok',
                  body:
                    'A házirendek, közgyűlési jegyzőkönyvek és szerződések szétszórva, nehezen megtalálhatóan hevernek. Egy irat megkereséséhez sokszor órákat kell keresgélni, és a régi lakók elhagyása után el is veszhetnek.',
                },
                {
                  emoji: '🧮',
                  title: 'Kézi könyvelés',
                  body:
                    'A közös költség nyilvántartása Excel-táblázatokban, banki kivonatokkal egyeztetve kézzel — ez hibalehetőségekkel teli, időrabló folyamat, amely átláthatóság helyett bizalmatlanságot szül.',
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
                >
                  <div className="mb-4 text-3xl">{card.emoji}</div>
                  <h3 className="mb-2 text-base font-bold text-slate-900">{card.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ──────────────────────────────────────────────────────── */}
        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Minden egy helyen
              </h2>
              <p className="mt-4 mx-auto max-w-2xl text-base leading-relaxed text-slate-500">
                A PanelLakó összes funkciója egy gondosan megtervezett, könnyen tanulható
                felületen érhető el. Nincs szükség különálló appokra, e-mailekre vagy
                papíralapú nyilvántartásokra.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  Icon: AlertTriangle,
                  title: 'Hibabejelentés & feladatkezelés',
                  body:
                    'A lakók egyszerűen bejelenthetik a hibákat fotóval és leírással. A közös képviselő azonnal értesítést kap, hozzárendeli a feladatot a megfelelő szakembernek, és a státusz minden érintett számára követhető marad.',
                },
                {
                  Icon: FolderOpen,
                  title: 'Dokumentumtár',
                  body:
                    'Töltse fel a házirend, a közgyűlési határozatok, szerződések és műszaki dokumentumok digitális másolatát. Minden irat biztonságosan tárolt, bármikor kereshető és megosztható.',
                },
                {
                  Icon: Calculator,
                  title: 'Közös költség nyilvántartás',
                  body:
                    'Rögzítse a befizetéseket, generáljon fizetési felszólításokat, és tekintse át az egyenlegeket lakásonként. Az átlátható pénzügyi nyilvántartás csökkenti a vitákat és növeli a bizalmat.',
                },
                {
                  Icon: Users,
                  title: 'Lakói kommunikáció',
                  body:
                    'Küldjön hirdetményeket, értesítéseket és körleveleket közvetlenül a platformon keresztül. Az összes lakó egységes csatornán kap tájékoztatást, és válaszait is itt kezelheti.',
                },
                {
                  Icon: Vote,
                  title: 'Online közgyűlés & szavazás',
                  body:
                    'Hívja össze a közgyűlést digitálisan, töltse fel a napirendet, és vezessen le határozatképes szavazásokat online. A határozatok azonnal dokumentálva és archiválva lesznek.',
                },
                {
                  Icon: Bell,
                  title: 'Értesítések & naplózás',
                  body:
                    'Minden esemény — bejelentés, fizetés, szavazás, dokumentumfeltöltés — automatikusan naplózásra kerül. Az auditnaplóban bármikor visszakereshető, ki mikor mit tett.',
                },
              ].map(({ Icon, title, body }) => (
                <div
                  key={title}
                  className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-card transition-shadow hover:shadow-card-md"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition-colors group-hover:bg-brand-100">
                    <Icon size={20} strokeWidth={2} />
                  </div>
                  <h3 className="mb-2 text-base font-bold text-slate-900">{title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── URBAN DATA ────────────────────────────────────────────────────── */}
        <section className="bg-slate-50 py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Budapest városi adatelemzések
              </h2>
              <p className="mt-4 mx-auto max-w-2xl text-base leading-relaxed text-slate-500">
                Ingyenes, adatvezérelt elemzések Budapest közlekedési, levegőminőségi és
                zajterhelési viszonyairól — hogy társasháza tájékozottan hozzon döntéseket a
                környezeti hatásokról.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <Link
                href="/elemzes"
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-shadow hover:shadow-card-md"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition-colors group-hover:bg-brand-100">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </div>
                <h3 className="mb-2 text-base font-bold text-slate-900">
                  Városi adatelemzések
                </h3>
                <p className="text-sm leading-relaxed text-slate-500">
                  Fedezze fel Budapest kerületeire vonatkozó levegőminőségi, zajterhelési és
                  közlekedési adatokat — mind egy helyen, ingyenesen.
                </p>
                <span className="mt-4 text-sm font-semibold text-brand-600 group-hover:underline">
                  Elemzések megtekintése →
                </span>
              </Link>

              <Link
                href="/elemzes/budapest-kozlekedes"
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-shadow hover:shadow-card-md"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100 transition-colors group-hover:bg-sky-100">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="1" y="3" width="15" height="13" rx="2" />
                    <path d="M16 8h4l3 3v5h-7V8z" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </div>
                <h3 className="mb-2 text-base font-bold text-slate-900">
                  Budapest közlekedési forgalom
                </h3>
                <p className="text-sm leading-relaxed text-slate-500">
                  Kerületenkénti forgalmi adatok, dugók és közlekedési terhelés elemzése —
                  hasznos információ az épület elhelyezkedésének értékeléséhez.
                </p>
                <span className="mt-4 text-sm font-semibold text-sky-600 group-hover:underline">
                  Közlekedési elemzés megtekintése →
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── PERSONAS ──────────────────────────────────────────────────────── */}
        <section className="bg-slate-50 py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Kinek való a PanelLakó?
              </h2>
              <p className="mt-4 mx-auto max-w-2xl text-base leading-relaxed text-slate-500">
                A platform minden érintettet kiszolgál a társasházi ökoszisztémában — az
                adminisztrációért felelős közös képviselőtől a mindennapi kérdéseket intéző
                lakóig és a pénzügyek felett őrködő könyvelőig.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {[
                {
                  emoji: '🏢',
                  persona: 'Közös képviselő',
                  tagline: 'Hatékonyabb ügyintézés, kevesebb papírmunka',
                  points: [
                    'Hibabejelentések és feladatok egy helyen',
                    'Közgyűlés összehívás digitálisan',
                    'Dokumentumok és határozatok archiválása',
                    'Automatikus fizetési értesítők',
                  ],
                },
                {
                  emoji: '🏠',
                  persona: 'Lakó / tulajdonos',
                  tagline: 'Átláthatóság és gyors ügyintézés',
                  points: [
                    'Hibabejelentés fotóval, percek alatt',
                    'Saját befizetések és egyenleg megtekintése',
                    'Házirend és dokumentumok elérése',
                    'Szavazás közgyűlési kérdésekben',
                  ],
                },
                {
                  emoji: '📊',
                  persona: 'Könyvelő',
                  tagline: 'Pontos adatok, kevesebb egyeztetés',
                  points: [
                    'Strukturált befizetés-nyilvántartás',
                    'Exportálható pénzügyi kimutatások',
                    'Lakásonkénti egyenleg-áttekintő',
                    'Auditnapló minden tranzakcióhoz',
                  ],
                },
              ].map((card) => (
                <div
                  key={card.persona}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
                >
                  <div className="mb-4 text-3xl">{card.emoji}</div>
                  <h3 className="text-base font-bold text-slate-900">{card.persona}</h3>
                  <p className="mt-1 mb-4 text-sm font-medium text-brand-600">{card.tagline}</p>
                  <ul className="mt-auto space-y-2">
                    {card.points.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TUDÁSTÁR ──────────────────────────────────────────────────────── */}
        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Szakértői tudástár
              </h2>
              <p className="mt-4 mx-auto max-w-2xl text-base leading-relaxed text-slate-500">
                Ingyenes útmutatók közös képviselőknek és lakóknak
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {[
                {
                  Icon: Building2,
                  href: '/tarsashaz-kezeles',
                  title: 'Társasházkezelési útmutató',
                  description:
                    'Közös képviselő feladatai, SZMSZ, közgyűlés, közös költség — teljes jogi útmutató',
                },
                {
                  Icon: Scale,
                  href: '/tarsashazi-jog',
                  title: 'Magyar társasházi jog',
                  description:
                    '2003. évi CXXXIII. tv. értelmezése: szavazatarányok, viták, alapító okirat',
                },
                {
                  Icon: Wind,
                  href: '/levegominoseg-budapest',
                  title: 'Levegőminőség Budapest',
                  description:
                    'PM2.5, PM10, pollen — melyik kerületben a legjobb a levegő?',
                },
                {
                  Icon: Leaf,
                  href: '/zold-tarsashaz',
                  title: 'Zöld társasház',
                  description:
                    'Napelem, hőszigetelés, EV töltő — hogyan lesz fenntartható az épület?',
                },
              ].map(({ Icon, href, title, description }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-shadow hover:shadow-card-md"
                >
                  <div className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition-colors group-hover:bg-brand-100">
                    <Icon size={20} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-700 transition-colors">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="shrink-0 mt-1 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-500"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Gyakori kérdések
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-500">
                Válaszok a leggyakrabban felmerülő kérdésekre a PanelLakóval kapcsolatban.
              </p>
            </div>

            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 shadow-card overflow-hidden">
              {faqItems.map((item, idx) => (
                <details key={idx} className="group bg-white open:bg-brand-50/40">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-semibold text-slate-900 transition-colors hover:text-brand-700 [&::-webkit-details-marker]:hidden">
                    <span>{item.question}</span>
                    <span className="shrink-0 text-slate-400 transition-transform group-open:rotate-180">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </summary>
                  <p className="px-6 pb-5 text-sm leading-relaxed text-slate-600">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA BANNER ────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-r from-brand-600 to-brand-700 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Kezdje el ingyen ma
            </h2>
            <p className="mt-4 text-base leading-relaxed text-brand-100">
              Regisztráljon percek alatt, és fedezze fel, hogyan teheti hatékonyabbá
              a társasháza kezelését. 14 napos próbaidőszak, kártyaadat nélkül.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-sm font-black text-brand-700 shadow-card-md transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-600"
            >
              Ingyenes próba indítása
            </Link>
            <p className="mt-4 text-xs text-brand-200">
              Nincs kötöttség · Bármikor lemondható · Magyar ügyfélszolgálat
            </p>
          </div>
        </section>

      </main>

      <PublicFooter />
    </>
  );
}
