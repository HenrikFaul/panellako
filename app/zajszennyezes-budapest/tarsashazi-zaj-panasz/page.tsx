import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Volume2,
  VolumeX,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  FileText,
  Building2,
  Scale,
  ArrowRight,
  Shield,
  MessageSquare,
  ClipboardList,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Társasházi Zajpanasz — Mit Tehet a Közös Képviselő és a Lakó? | PanelLakó',
  description:
    'Hogyan kezeljük a zajpanaszt társasházban? Hangos szomszéd, felújítási zaj, éjszakai zeneszó — jogi lépések, szomszédjog, önkormányzati hatóság.',
  alternates: {
    canonical: 'https://panellako.hu/zajszennyezes-budapest/tarsashazi-zaj-panasz',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Zajpanasz társasházban — jogi lépések és megoldások',
  description:
    'Hogyan kezeljük a zajpanaszt társasházban? Hangos szomszéd, felújítási zaj, éjszakai zeneszó — jogi lépések, szomszédjog, önkormányzati hatóság.',
  inLanguage: 'hu',
  url: 'https://panellako.hu/zajszennyezes-budapest/tarsashazi-zaj-panasz',
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
      name: 'Zajszennyezés Budapest',
      item: 'https://panellako.hu/zajszennyezes-budapest',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Társasházi Zajpanasz',
      item: 'https://panellako.hu/zajszennyezes-budapest/tarsashazi-zaj-panasz',
    },
  ],
};

const RESIDENT_STEPS = [
  {
    step: '1',
    icon: MessageSquare,
    title: 'Közvetlen megbeszélés',
    body: 'Az első lépés mindig a szomszéddal való személyes, nyugodt hangú megbeszélés. A legtöbb zajkonfliktus tudatlanságból fakad — a szomszéd nem feltétlenül tudja, hogy mennyire hallatszik a zaj. Egy rövid, barátságos tájékoztatás sokszor elegendő. Ha nem hatékony, dokumentálja a kísérletet (dátum, időpont).',
  },
  {
    step: '2',
    icon: FileText,
    title: 'Közös képviselő értesítése írásban',
    body: 'Ha a szóbeli kísérlet eredménytelen, értesítse írásban a közös képviselőt. Az írás fontos: e-mailben vagy ajánlott levélben küldje el, hogy bizonyítható legyen a bejelentés időpontja. A közös képviselő köteles eljárni, a panasz figyelmen kívül hagyása a saját felelősségét alapozza meg.',
  },
  {
    step: '3',
    icon: Building2,
    title: 'Önkormányzat hatósága',
    body: 'Ha a közös képviselő sem old meg a helyzetet, forduljunk a kerületi önkormányzat építési és zajvédelmi hatóságához (321/2005. Korm. rendelet alapján). A kérelmet írásban kell benyújtani; a hatóság 30 napon belül köteles vizsgálni és intézkedni.',
  },
  {
    step: '4',
    icon: Scale,
    title: 'Bírói út',
    body: 'Végsősoron polgári perben is érvényesíthető a szomszédjogi igény. A Polgári Törvénykönyv 5:23. §-a alapján a szomszédos ingatlan használója köteles tartózkodni minden olyan magatartástól, amely a szomszédos ingatlan tulajdonosát szükségtelenül zavarná. A per előtt ajánlott mediációt kísérelni meg.',
  },
];

const DOCUMENTATION_STEPS = [
  {
    num: '1',
    title: 'Naplózás: dátum, időpont, időtartam, leírás',
    body: 'Minden zajincidensről vezessen naplót. Rögzítse: mikor kezdődött, meddig tartott, milyen természetű volt (zene, lépések, géphang, felújítási zaj), melyik lakásból érkezett (ha azonosítható). A naplót aláírással és dátummal lássa el.',
  },
  {
    num: '2',
    title: 'Hangfelvétel készítése',
    body: 'Okostelefonnal hangfelvétel is rögzíthető. A felvétel önmagában nem mindig elegendő jogi bizonyíték (a hatóság hitelesített mérőeszközt fogad el), de jól egészíti ki az írásos bejelentést és a naplót. Célszerű a felvételen hallható dátumot és időpontot is beolvasni.',
  },
  {
    num: '3',
    title: 'Írásbeli felszólítás a szomszédnak',
    body: 'Küldjen ajánlott levelet a zajt okozó lakónak. A levélben hivatkozzon arra, hogy a zajszint megzavarja a mindennapi életvitelét, és kérje a helyzet rendezését. A levél — mint bizonyíték — fontos a hatóság és bíróság előtt.',
  },
  {
    num: '4',
    title: 'Közös képviselő bevonása',
    body: 'Adja át a dokumentációt (napló, felvételek, felszólítás másolata) a közös képviselőnek, és kérje meg arra, hogy közvetítőként lépjen fel, illetve ha szükséges, kezdeményezzen hatósági eljárást.',
  },
  {
    num: '5',
    title: 'Hatósági vagy bírósági eljárás',
    body: 'Az összegyűjtött dokumentációval forduljon az önkormányzati hatósághoz, vagy igényeljen hitelesített akusztikai mérést. Súlyos esetben polgári peres eljárásban kártérítés és használat-megszüntetési ítélet is elérhető.',
  },
];

const SZMSZ_ITEMS = [
  {
    title: 'Csendes órák meghatározása',
    body: 'Az SZMSZ meghatározhat a törvényi minimumnál szigorúbb csendes időszakot is (pl. 22–7 h helyett 21–8 h). Ez írott, betartható norma, amelyet a közös képviselő számon kérhet, és amelyre a hatóság is hivatkozhat.',
  },
  {
    title: 'Felújítási munkák bejelentési kötelezettsége',
    body: 'Az SZMSZ előírhatja, hogy a lakó legalább 5-7 nappal előre értesítse a közös képviselőt és a szomszédokat a tervezett felújítási munkákról. Ez csökkenti a váratlan zajkonfliktusokat és lehetővé teszi az előzetes megállapodást.',
  },
  {
    title: 'Szankciók és eljárásrend',
    body: 'Ha az SZMSZ tartalmaz szankciót (pl. közös költség növelése, hatóság értesítése), az elrettentő erővel bír. A szankciók bevezetéséhez közgyűlési határozat szükséges, legalább egyszerű többséggel.',
  },
];

export default function TarsashaziZajPanaszPage() {
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
          <Link href="/" className="hover:text-slate-600 transition-colors">
            Főoldal
          </Link>
          <ChevronRight size={14} />
          <Link href="/zajszennyezes-budapest" className="hover:text-slate-600 transition-colors">
            Zajszennyezés Budapest
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-600">Társasházi Zajpanasz</span>
        </nav>

        {/* Hero */}
        <div className="mb-14">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <Volume2 size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Zajpanasz társasházban —{' '}
            <span className="text-brand-600">jogi lépések és megoldások</span>
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            A zajpanasz az egyik leggyakoribb konfliktusforrás társasházakban. Hangos szomszéd, éjszakai felújítási munkák, partihangok vagy állandó lépészaj — mindegyik eset más megközelítést igényel, de az alapelvek azonosak: dokumentálás, fokozatosság, jog. Ez az útmutató lépésről lépésre végigvezeti Önt a hatékony panaszkezelésen.
          </p>
        </div>

        {/* Mikor minősül zajnak jogilag */}
        <section aria-labelledby="jogi-zaj-heading" className="mb-14">
          <h2 id="jogi-zaj-heading" className="mb-5 text-2xl font-black text-slate-900">
            Mikor minősül zajnak jogilag?
          </h2>
          <p className="mb-5 text-slate-500 leading-relaxed">
            Magyarországon a zajvédelmet a <strong className="text-slate-700">284/2007. (X. 29.) Korm. rendelet</strong> szabályozza, amelyet a 93/2007. (XII. 18.) KvVM rendelet egészít ki a határértékekkel. Lakóépületekben az alábbi határértékek érvényesek:
          </p>
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 text-left font-black text-slate-700">Időszak</th>
                  <th className="px-5 py-3 text-left font-black text-slate-700">Határérték lakásban</th>
                  <th className="px-5 py-3 text-left font-black text-slate-700">Megjegyzés</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { period: 'Nappal (8–22 h)', limit: '45 dB(A)', note: 'Zavarbeszéd-küszöb' },
                  { period: 'Éjszaka (22–6 h)', limit: '35 dB(A)', note: 'Alvásvédelmi határérték' },
                  { period: 'Felújítás hétköznap', limit: 'Általában 8–20 h', note: 'SZMSZ-ben szűkíthető' },
                  { period: 'Felújítás szombaton', limit: 'Általában 8–14 h', note: 'Önkormányzati rendelet is irányadó' },
                ].map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    <td className="px-5 py-3 font-bold text-brand-700">{row.period}</td>
                    <td className="px-5 py-3 text-slate-700 font-medium">{row.limit}</td>
                    <td className="px-5 py-3 text-slate-500">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800 leading-relaxed">
                <strong>Fontos:</strong> A határértékek a lakás belsejében mérendők, nem a zajforrás mellett. Egy fúrógép a szomszédban percenként más zajszintet eredményezhet a saját lakásban, mint amit a forrás mellett mérni lehetne. Hitelesített mérés kérhető az önkormányzat zajvédelmi hatóságától.
              </p>
            </div>
          </div>
        </section>

        {/* Hangos szomszéd — mit tehet a lakó */}
        <section aria-labelledby="hangos-szomszed-heading" className="mb-14">
          <h2 id="hangos-szomszed-heading" className="mb-5 text-2xl font-black text-slate-900">
            Hangos szomszéd — mit tehet a lakó?
          </h2>
          <p className="mb-7 text-slate-500 leading-relaxed">
            A szomszédi zajkonfliktusok kezelésére fokozatos megközelítést ajánlunk. Az agresszív vagy azonnal hatósági lépések ritkán hatékonyak — a fokozatosság erősebb jogi pozíciót épít és lehetővé teszi a konfliktusmentes megoldást.
          </p>
          <div className="space-y-5">
            {RESIDENT_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-black text-white">
                    {item.step}
                  </span>
                  <div className="flex-1">
                    <div className="mb-1.5 flex items-center gap-2">
                      <Icon size={16} className="text-brand-600" />
                      <h3 className="font-black text-slate-900">{item.title}</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-500">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Felújítási zaj kezelése */}
        <section aria-labelledby="felujitasi-zaj-heading" className="mb-14">
          <h2 id="felujitasi-zaj-heading" className="mb-5 text-2xl font-black text-slate-900">
            Felújítási zaj kezelése
          </h2>
          <p className="mb-5 text-slate-500 leading-relaxed">
            A felújítási zaj sajátos kategória: törvény szerint engedélyezett tevékenység, de időben korlátozott. A munkavégzési idő általánosan hétköznap 8–20 h, szombaton 8–14 h, vasárnap és ünnepnapon tilos (egyes önkormányzati rendeletek eltérést engednek). A konkrét szabályok az adott kerületi rendeletben keresendők.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: ClipboardList,
                title: 'SZMSZ-ben szabályozható',
                body: 'A társasház Szervezeti és Működési Szabályzata (SZMSZ) a törvényi minimum felett további feltételeket is szabhat — pl. rövidebb munkavégzési idő, szomszédok előzetes értesítési kötelezettsége, csöndnapok meghatározása. Ez közgyűlési határozattal vezethető be.',
              },
              {
                icon: MessageSquare,
                title: 'Bejelentési kötelezettség a szomszédoknak',
                body: 'Bár nem minden esetben törvényi kötelezettség, az SZMSZ előírhatja az előzetes értesítést. Jó szomszédi gyakorlat az értesítés akkor is, ha nem kötelező — ez csökkenti a konfliktusok esélyét és elkerüli a hatósági beavatkozást.',
              },
              {
                icon: AlertTriangle,
                title: 'Ha túllépi az engedélyezett időt',
                body: 'Ha a felújítási zaj az engedélyezett időn kívül is folytatódik, azonnal értesítse a közös képviselőt és dokumentálja az eseményt. Ha ez sem segít, hívja az ügyeletes önkormányzati hatóságot vagy a rendőrséget (közbiztonsági szempontból is releváns lehet).',
              },
              {
                icon: Building2,
                title: 'Portól és töréktől való védelem',
                body: 'A felújítás során keletkező por a közös területekre is kiterjedhet. A közös képviselő kérheti a lakótól a megfelelő védelem (fóliázás, takarás, takarítás) biztosítását. Ha ez elmarad, a kárt a felújítást végző lakó köteles megtéríteni.',
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={18} className="text-brand-600" />
                  </div>
                  <h3 className="mb-2 font-black text-slate-900">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* A közös képviselő szerepe */}
        <section aria-labelledby="kozos-kepviselo-heading" className="mb-14">
          <h2 id="kozos-kepviselo-heading" className="mb-5 text-2xl font-black text-slate-900">
            A közös képviselő szerepe zajpanasznál
          </h2>
          <p className="mb-6 text-slate-500 leading-relaxed">
            A 2003. évi CXXXIII. törvény (Társasházi törvény) szerint a közös képviselő köteles a lakóközösség érdekét képviselni, és eljárni az SZMSZ, valamint a vonatkozó jogszabályok megsértése esetén. Zajpanasz esetén ez a következőket jelenti a gyakorlatban:
          </p>
          <div className="space-y-4">
            {[
              {
                icon: Shield,
                title: 'Közvetítés a felek között',
                body: 'A közös képviselő elsősorban mediátori szerepben lép fel: megbeszélést szervez, tájékoztatja a zajt okozó lakót a szabályokról, és kéri a helyzet rendezését. Ez informálisan sokszor elegendő — a legtöbb esetben a szomszéd nem tudja, milyen mértékű a zaj a másik lakásban.',
              },
              {
                icon: ClipboardList,
                title: 'Dokumentálási kötelezettség',
                body: 'A közös képviselőnek rögzítenie kell minden beérkezett zajpanaszt — ki jelezte, mikor, mit tapasztalt. Ez a dokumentáció szükséges az esetleges hatósági eljáráshoz, és védi a közös képviselőt is a felelősség alól, ha bizonyítható, hogy eljárt.',
              },
              {
                icon: FileText,
                title: 'SZMSZ betartatása',
                body: 'Ha az SZMSZ tartalmaz zajvédelmi szabályokat (csendes órák, felújítási időkorlát, értesítési kötelezettség), a közös képviselő köteles azok betartását számon kérni. Az ismételt megsértés esetén figyelmeztetést, majd szankciót alkalmazhat.',
              },
              {
                icon: Building2,
                title: 'Segítségnyújtás a hatósági bejelentésben',
                body: 'A közös képviselő a lakó kérésére segíthet a hatósági bejelentés elkészítésében, és részt vehet a helyszíni szemlén mint képviselő. Önálló hatósági bejelentést is tehet, ha az SZMSZ vagy a közérdek azt indokolja.',
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={17} className="text-brand-600" />
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

        {/* Jogorvoslat menete lépésről lépésre */}
        <section aria-labelledby="jogorvoslat-heading" className="mb-14 rounded-2xl border border-slate-100 bg-slate-50 px-7 py-8">
          <h2 id="jogorvoslat-heading" className="mb-4 text-2xl font-black text-slate-900">
            Jogorvoslat menete lépésről lépésre
          </h2>
          <p className="mb-7 text-slate-500 leading-relaxed">
            A sikeres jogorvoslathoz következetes dokumentálás és fokozatosság szükséges. Az alábbi öt lépés az általánosan javasolt eljárásrend zajpanasz esetén, a 284/2007. Korm. rendelet és a Ptk. 5:23. § alapján.
          </p>
          <div className="space-y-5">
            {DOCUMENTATION_STEPS.map((item) => (
              <div key={item.num} className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-black text-white">
                  {item.num}
                </span>
                <div>
                  <h3 className="mb-1 font-black text-slate-900">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-7 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4">
            <p className="text-sm text-brand-800 leading-relaxed">
              <strong>Fontos:</strong> Közigazgatási bírság mértéke 200 000 Ft-tól akár 10 millió Ft-ig terjedhet (284/2007. Korm. rendelet). Ismételt jogsértés esetén a hatóság a tevékenységtől eltiltást is kiszabhat. A Fővárosi Kormányhivatal Környezetvédelmi Főosztálya másodfokú hatóságként szintén illetékes, ha az önkormányzati szintű eljárás eredménytelen.
            </p>
          </div>
        </section>

        {/* Digitális dokumentáció */}
        <section aria-labelledby="digitalis-dok-heading" className="mb-14">
          <h2 id="digitalis-dok-heading" className="mb-5 text-2xl font-black text-slate-900">
            Hogyan dokumentáljuk a zajpanaszt digitálisan?
          </h2>
          <p className="mb-5 text-slate-500 leading-relaxed">
            A papíralapú naplózás hátránya, hogy könnyen elvész, nehéz exportálni, és nem időbélyegzett. A PanelLakó hibabejelentési modulja erre kínál strukturált megoldást: minden bejelentés időbélyeggel, fotóval, leírással rögzíthető, státusza követhető, és PDF-formátumban hatósági beadványhoz csatolható.
          </p>
          <div className="rounded-2xl border border-brand-200 bg-brand-50/50 px-6 py-6">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
                <ClipboardList size={20} className="text-brand-700" />
              </div>
              <div>
                <h3 className="mb-1.5 font-black text-brand-900">PanelLakó hibabejelentés modul</h3>
                <p className="text-sm text-brand-700 leading-relaxed">
                  A PanelLakó platformon a zajpanasz bejelentése néhány kattintással elvégezhető: csatolhat fotót vagy hangfelvételt, kiválaszthatja a zajforrás típusát, és nyomon követheti, hogy a közös képviselő mikor vette tudomásul és mikor reagált. A bejelentések exportálhatók és hatósági eljáráshoz használhatók.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/funkciok/hibabejelentes-kezeles"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition-transform hover:scale-[1.03]"
              >
                Hibabejelentés modul megismerése
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-brand-300 bg-white px-5 py-2.5 text-sm font-black text-brand-700 shadow-sm transition-transform hover:scale-[1.03]"
              >
                Ingyenes regisztráció
              </Link>
            </div>
          </div>
        </section>

        {/* Megelőzés: SZMSZ */}
        <section aria-labelledby="szmsz-heading" className="mb-14">
          <h2 id="szmsz-heading" className="mb-5 text-2xl font-black text-slate-900">
            Megelőzés: SZMSZ zajos időszak szabályozás
          </h2>
          <p className="mb-6 text-slate-500 leading-relaxed">
            A legjobb zajpanasz az, amelyik meg sem születik. A megelőzés leghatékonyabb eszköze a jól megírt Szervezeti és Működési Szabályzat, amely pontosan rögzíti a zajvédelmi szabályokat, az engedélyezett munkavégzési időt, és a szankciók rendjét. Az alábbiakban azokat a pontokat gyűjtöttük össze, amelyeket érdemes az SZMSZ-be belefoglalni.
          </p>
          <div className="space-y-4">
            {SZMSZ_ITEMS.map((item, i) => (
              <div key={i} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  <CheckCircle size={17} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="mb-1.5 font-black text-slate-900">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Tipp a közös képviselőknek:</strong> Az SZMSZ zajos időszakra vonatkozó szabályainak módosítása nem igényel minősített többséget, csak egyszerű szótöbbséget. A zajvédelmi szabályok bevezetéséhez elegendő egy előterjesztés a következő rendes közgyűlésen, vagy — ha sürgős — rendkívüli közgyűlésen is napirendre tűzhető.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-md">
          <h2 className="mb-2 text-2xl font-black text-white">
            Zajpanaszát digitálisan is rögzítheti — ingyen
          </h2>
          <p className="mb-6 text-brand-100 max-w-lg mx-auto leading-relaxed">
            A PanelLakó platformon időbélyegzett, exportálható formátumban dokumentálhatja zajpanaszát — legyen szó közös képviselői bejelentésről, hatósági beadványhoz szükséges bizonyítékgyűjtésről, vagy egyszerűen a szomszédsági vita rendezéséről.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-transform hover:scale-[1.03]"
          >
            Ingyenes regisztráció
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Kapcsolódó cikkek */}
        <div className="mt-12">
          <p className="mb-4 text-sm font-bold text-slate-700">Kapcsolódó cikkek</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/zajszennyezes-budapest/zajvedes-tarsashazban"
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              <VolumeX size={16} className="text-brand-600" />
              Zajvédelem társasházban — műszaki megoldások
              <ArrowRight size={14} className="ml-auto text-slate-400" />
            </Link>
            <Link
              href="/tarsashazi-jog"
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              <Scale size={16} className="text-brand-600" />
              Társasházi jog — útmutató
              <ArrowRight size={14} className="ml-auto text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-8 flex items-center gap-2 text-sm text-slate-400">
          <Link
            href="/zajszennyezes-budapest"
            className="flex items-center gap-1 hover:text-brand-600 transition-colors"
          >
            ← Vissza: Zajszennyezés Budapest főoldal
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
