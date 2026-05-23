import type { Metadata } from 'next';
import type { Route } from 'next';
import Link from 'next/link';
import {
  Calculator,
  CheckCircle,
  ChevronRight,
  Scale,
  AlertTriangle,
  FileText,
  Clock,
  CreditCard,
  ArrowRight,
  ReceiptText,
  Building2,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Közös Költség Nyilvántartás — Hogyan Csináljuk Jól? | PanelLakó',
  description:
    'A társasházi közös költség nyilvántartásának szabályai, tételek listája, éves elszámolás menete, könyvelőknek szóló export, hátralékosok kezelése.',
  alternates: { canonical: 'https://panellako.hu/tarsashaz-kezeles/kozos-koltseg-nyilvantartas' },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Közös költség nyilvántartás — szabályok és digitális megoldások',
  description:
    'A társasházi közös költség nyilvántartásának szabályai, tételek listája, éves elszámolás menete, könyvelőknek szóló export, hátralékosok kezelése.',
  url: 'https://panellako.hu/tarsashaz-kezeles/kozos-koltseg-nyilvantartas',
  publisher: { '@type': 'Organization', name: 'PanelLakó', url: 'https://panellako.hu' },
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
      name: 'Közös Költség Nyilvántartás',
      item: 'https://panellako.hu/tarsashaz-kezeles/kozos-koltseg-nyilvantartas',
    },
  ],
};

const COST_ITEMS = [
  {
    icon: Building2,
    title: 'Takarítás és portaszolgálat',
    description:
      'A közös területek (lépcsőház, folyosók, aulák, mélygarázs) rendszeres takarítási költsége, valamint a portaszolgálat díja — ha a társasház alkalmaz ilyet.',
  },
  {
    icon: Calculator,
    title: 'Kertészet és zöldfelület-fenntartás',
    description:
      'A társasház kertjének, parkosított területének gondozása, szezonális metszési munkák, fűnyírás, virágültetés és ezek anyagköltsége.',
  },
  {
    icon: FileText,
    title: 'Épületbiztosítás',
    description:
      'A társasházi vagyonbiztosítás díja, amely az épületre és a közös berendezésekre (lift, kazán, tető) vonatkozik. Ezt az összes albetét tulajdonosa arányosan viseli.',
  },
  {
    icon: CreditCard,
    title: 'Lift karbantartás és felülvizsgálat',
    description:
      'A lift üzemeltetési szerződése, az éves kötelező hatósági felülvizsgálat díja, valamint az eseti javítási és cserealkatrész-költségek.',
  },
  {
    icon: ReceiptText,
    title: 'Közös területi rezsiköltségek',
    description:
      'A lépcsőházi világítás, a közös szerelvények, a kapu és kaputelefon áramköltsége, a közös vízóra-mérőn elszámolt vízfogyasztás.',
  },
  {
    icon: CheckCircle,
    title: 'Felújítási alap',
    description:
      'A 2003. évi CXXXIII. törvény (Ttv.) 45. § alapján a közgyűlés határozhatja meg a felújítási alapba befizetendő összeg mértékét, amelyből a közös épületelemek felújítási munkálatait finanszírozzák.',
  },
  {
    icon: Scale,
    title: 'Közös képviselő díja',
    description:
      'A megválasztott közös képviselő vagy vállalkozási formában eljáró ingatlankezelő cég munkavégzésének ellenértéke, amelyet a közgyűlés hagy jóvá.',
  },
];

const LEGAL_NOTES = [
  {
    ref: '2003. évi CXXXIII. tv. 43. §',
    text: 'A közös költség megfizetésének kötelezettségéről és az albetét-arányos megosztás szabályáról szóló rendelkezés.',
  },
  {
    ref: '2003. évi CXXXIII. tv. 45. §',
    text: 'A felújítási alap képzésének és felhasználásának kötelező eljárási rendje.',
  },
  {
    ref: '2003. évi CXXXIII. tv. 24/A. §',
    text: 'Az éves elszámolás tartalmi követelményei és a kötelező közzétételre vonatkozó előírás.',
  },
  {
    ref: '2013. évi V. tv. (Ptk.) 6:155. §',
    text: 'A késedelmi kamat mértékére vonatkozó általános szabály, amelyet a hátralékos közös költségre is alkalmazni kell.',
  },
];

export default function KozosKoltsegNyilvantartasPage() {
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
          <span className="font-medium text-slate-600">Közös költség nyilvántartás</span>
        </nav>

        {/* Hero */}
        <div className="mb-12">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <Calculator size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Közös költség nyilvántartás — szabályok és digitális megoldások
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            A közös költség nyilvántartása az egyik legfontosabb — és legtöbb vitát kiváltó —
            kötelezettség a társasházi közös képviselők számára. Ez a cikk összefoglalja, mi kerülhet
            bele a közös költségbe, hogyan határozható meg az összege, milyen nyilvántartási
            kötelezettségek vonatkoznak rá, és hogyan kezelhető az éves elszámolás — a 2003. évi
            CXXXIII. törvény (Ttv.) rendelkezései alapján.
          </p>
        </div>

        {/* H2: Mi tartozik a közös költségbe? */}
        <section className="mb-12 space-y-5">
          <h2 className="text-2xl font-black text-slate-900">
            Mi tartozik a közös költségbe?
          </h2>
          <p className="leading-relaxed text-slate-600">
            A Ttv. 43. § (1) bekezdése szerint a tulajdonostársak kötelesek arányosan viselni a
            közös tulajdonban lévő épületrészek, berendezések fenntartásával és kezelésével
            kapcsolatos kiadásokat. A közös költség tehát nem önkényesen meghatározott összeg,
            hanem az alábbi, konkrétan meghatározható tételekből kell felépíteni:
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {COST_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={18} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="mb-1 font-bold text-slate-900">{item.title}</p>
                    <p className="text-sm leading-relaxed text-slate-500">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="leading-relaxed text-slate-600">
            Fontos hangsúlyozni, hogy a közös képviselő nem vehet fel ebbe a körbe olyan tételeket,
            amelyek nem a közös tulajdont érintik, és a közgyűlés sem hagyhat jóvá törvénysértő
            terheket az egyes tulajdonostársakra. A közös költség összetételét és mértékét minden
            évben a rendes éves közgyűlésnek kell jóváhagynia — ez az éves költségvetés elfogadása.
          </p>
        </section>

        {/* H2: A közös költség meghatározásának menete */}
        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-black text-slate-900">
            A közös költség meghatározásának menete
          </h2>
          <p className="leading-relaxed text-slate-600">
            A közgyűlés határozza meg a tárgyévre vonatkozó közös költség összegét és annak
            tételeit. A határozathoz — a Ttv. 27. § alapján — a jelenlévők egyszerű szótöbbsége
            szükséges, feltéve, hogy a közgyűlés határozatképes (azaz az összes tulajdoni hányad
            több mint fele képviselt).
          </p>
          <p className="leading-relaxed text-slate-600">
            Az egyes tulajdonostársakra jutó havi közös költség összegét az{' '}
            <strong>albetét-arány</strong> határozza meg. Ez az ingatlan-nyilvántartásban rögzített,
            ezrelékben vagy törtrészben kifejezett arány mutatja meg, hogy az adott lakás milyen
            hányada az egész társasháznak. Például ha egy lakás tulajdoni hányada 85/10 000, akkor
            a tulajdonos a közös költség 0,85%-át fizeti havonta. Az SZMSZ eltérhet ettől az elvtől
            (pl. négyzetméter-arányos elosztás), de ehhez a közgyűlés minősített — legalább kétharmados
            — szótöbbsége szükséges a Ttv. 34. § (1) bekezdése alapján.
          </p>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              <p className="font-bold text-amber-900">Figyelem: nem elegendő a szóbeli döntés</p>
            </div>
            <p className="text-sm leading-relaxed text-amber-800">
              A közös költség összegéről hozott közgyűlési határozatot írásban rögzíteni kell a
              határozatkönyvben (Ttv. 30. §). Az írásbeli rögzítés hiánya végrehajtási eljárásban
              bizonyítási problémát okozhat.
            </p>
          </div>
        </section>

        {/* H2: Kötelező nyilvántartási elemek */}
        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-black text-slate-900">
            Kötelező nyilvántartási elemek
          </h2>
          <p className="leading-relaxed text-slate-600">
            A Ttv. 46. § (1) bekezdése alapján a közös képviselő köteles nyilvántartani minden
            tulajdonostárs tekintetében a közös költséggel kapcsolatos pénzügyi adatokat.
            A minimálisan szükséges nyilvántartási elemek albetétenként:
          </p>
          <ul className="space-y-2 pl-1">
            {[
              'Az albetét azonosítója (cím, helyrajzi szám, albetét-arány)',
              'A tulajdonos neve és kapcsolattartási adatai',
              'Havi fizetési kötelezettség összege (bontva: folyó költség + felújítási alap)',
              'Fizetések dátuma és összege (banki terhelés vagy befizetési igazolás alapján)',
              'Fennálló hátralék összege és keletkezésének időpontja',
              'Felszólítások dátuma és tartalma (igazolható kézbesítéssel)',
              'Részletfizetési megállapodások adatai',
              'Hatósági vagy bírósági eljárások ügyszáma, állapota',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-slate-600">
                <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
          <p className="leading-relaxed text-slate-600">
            A nyilvántartást naprakészen kell vezetni. A tulajdonostársak — a Ttv. 46. § (3) bekezdése
            alapján — jogosultak betekinteni a saját fizetési előzményeikbe. Ezt a betekintési jogot
            a közös képviselő nem tagadhatja meg.
          </p>
        </section>

        {/* H2: Az éves elszámolás */}
        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-black text-slate-900">
            Az éves elszámolás
          </h2>
          <p className="leading-relaxed text-slate-600">
            A közös képviselő köteles elkészíteni az éves pénzügyi elszámolást és azt a tárgyévet
            követő <strong>120 napon belül</strong> — tehát legkésőbb április 30-ig — a rendes éves
            közgyűlés elé terjeszteni. Ez a kötelezettség a Ttv. 24/A. §-ából következik, és annak
            elmulasztása a képviselő ellen visszahívási eljárást alapozhat meg.
          </p>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Clock size={18} className="text-brand-600" />
              <p className="font-bold text-slate-900">Az éves elszámolás kötelező tartalma</p>
            </div>
            <ul className="space-y-2">
              {[
                'Bevételek és kiadások részletes kimutatása tételenként',
                'Bankszámlaegyenleg az időszak elején és végén',
                'Felújítási alap egyenlege (elkülönített számla)',
                'Fennálló hátralékosok listája névvel, összeggel',
                'Függő kötelezettségek (pl. folyamatban lévő perek, nem teljesített szerződések)',
                'Következő évre tervezett költségvetés javaslata',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle size={14} className="mt-0.5 shrink-0 text-brand-500" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="leading-relaxed text-slate-600">
            A tulajdonostársak a közgyűlésen, illetve azt megelőzően a közös képviselőtől kérhetik
            az elszámolás részleteit. Ha a tulajdonostárs vitatja az elszámolás helyességét, a Ttv.
            24/A. § (3) bekezdése alapján bírósági felülvizsgálatot kérhet — a közgyűléstől számított
            60 napon belül.
          </p>
        </section>

        {/* H2: Hátralékosok kezelése jogilag */}
        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-black text-slate-900">
            Hátralékosok kezelése jogilag
          </h2>
          <p className="leading-relaxed text-slate-600">
            A közös képviselő nemcsak joga, hanem törvényi kötelessége a hátralékos közös költség
            behajtása. A Ttv. 43. § (3) bekezdése kimondja, hogy a közös képviselő köteles a
            hátralékos tulajdonostárssal szemben eljárni — ennek elmulasztása esetén a többi
            tulajdonostárssal szemben felelőssége merülhet fel.
          </p>
          <p className="leading-relaxed text-slate-600">
            Az ajánlott lépések sorrendben: írásbeli felszólítás (igazolható kézbesítéssel) →
            fizetési meghagyásos eljárás (FMH) a közjegyzőnél → végrehajtási eljárás (ha az FMH-t
            nem vitatják) → jelzálogjog-bejegyzés az ingatlanra. A hátralékra a Ptk. 6:155. §
            szerinti késedelmi kamat is felszámítható: ez a jegybanki alapkamat 8 százalékponttal
            emelt mértéke.
          </p>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-600" />
              <p className="font-bold text-red-900">Jelzálogjog bejegyzése</p>
            </div>
            <p className="text-sm leading-relaxed text-red-800">
              A Ttv. 25. § (3) bekezdése lehetővé teszi, hogy a közös képviselő — a közgyűlés
              felhatalmazása alapján — jelzálogjogot jegyeztessen be a hátralékos tulajdonos
              ingatlanára. Ez az intézkedés az ingatlan elidegenítésekor a hátralék megtérülését
              biztosítja. A bejegyzés az ingatlan-nyilvántartásban nyilvánossá teszi a terhet,
              ami az értékesítés előtt köteles rendezni.
            </p>
          </div>
          <p className="leading-relaxed text-slate-600">
            Részletfizetési megállapodás szintén köthető — ez sok esetben célravezetőbb, mint a
            peres eljárás, és a közös képviselőt megkíméli az eljárás adminisztrációs terhétől.
            Az ilyen megállapodást írásban, a hátralék összegének, a törlesztési ütemezésnek és
            a késedelmi következményeknek egyértelmű rögzítésével kell megkötni.
          </p>
        </section>

        {/* H2: Digitális eszközök */}
        <section className="mb-12 space-y-4">
          <h2 className="text-2xl font-black text-slate-900">
            Digitális eszközök a nyilvántartáshoz
          </h2>
          <p className="leading-relaxed text-slate-600">
            A táblázatkezelőben vagy papíralapon vezetett nyilvántartás könnyen hibás, nehezen
            ellenőrizhető, és nem alkalmas a törvényi előírásoknak megfelelő, igazolható
            kézbesítési és értesítési feladatok elvégzésére. A digitális megoldások — mint a
            PanelLakó platformja — számos előnyt kínálnak:
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: 'Valós idejű egyenlegkövetés',
                text: 'Minden befizetés azonnal rögzül, a hátralék automatikusan kiszámítódik és megjelenik a közös képviselő és a tulajdonos felületén is.',
              },
              {
                title: 'Automatikus értesítők',
                text: 'A rendszer automatikusan küld fizetési emlékeztetőt és felszólítást — előre beállított ütemterv szerint, igazolható kézbesítéssel.',
              },
              {
                title: 'Könyvelői export',
                text: 'Az összes tranzakció és egyenleg exportálható könyvelési szoftverek által olvasható formátumban (xlsx, csv), megkönnyítve az éves elszámolást.',
              },
              {
                title: 'Hátralék-riportok',
                text: 'Kattintásra lekérhető áttekintés a hátralékos albetétekről, az összesített összegről, a lejárat dátumáról és az eddigi lépésekről.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-brand-100 bg-brand-50 p-5"
              >
                <p className="mb-1.5 font-bold text-slate-900">{item.title}</p>
                <p className="text-sm leading-relaxed text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="leading-relaxed text-slate-600">
            A PanelLakó közös költség moduljának részleteiről bővebben olvashat a{' '}
            <Link
              href="/funkciok/kozos-koltseg"
              className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700"
            >
              /funkciok/kozos-koltseg
            </Link>{' '}
            oldalon. A modul az összes fent említett nyilvántartási kötelezettséget lefedi, és
            közvetlen kapcsolatot teremt a könyvelő felé — minimalizálva a manuális adatbevitel
            szükségességét.
          </p>
        </section>

        {/* Legal refs */}
        <section className="mb-12 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-8">
          <div className="mb-5 flex items-center gap-3">
            <Scale size={20} className="text-brand-600" />
            <h2 className="text-xl font-black text-slate-900">Hivatkozott jogszabályok</h2>
          </div>
          <div className="space-y-4">
            {LEGAL_NOTES.map((note) => (
              <div key={note.ref} className="border-l-2 border-brand-300 pl-4">
                <p className="font-bold text-slate-900">{note.ref}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{note.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-slate-400">
            Ez a cikk tájékoztató jellegű, és nem minősül jogi tanácsadásnak. Konkrét esetekben
            forduljon ügyvédhez vagy ingatlankezelési szakértőhöz.
          </p>
        </section>

        {/* Further reading */}
        <section className="mb-12">
          <h2 className="mb-5 text-xl font-black text-slate-900">Kapcsolódó témák</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                href: '/tarsashaz-kezeles/dijhatlarak-kezelese',
                title: 'Díjhátralékosok kezelése',
                text: 'Jogi lépések, FMH, végrehajtás, jelzálogjog',
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
                href: '/tarsashaz-kezeles/kozgyules-osszehivasa',
                title: 'Közgyűlés összehívása',
                text: 'Meghívó, határozatképesség, digitális szavazás',
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
            Vezesse digitálisan a közös költség nyilvántartást
          </h2>
          <p className="mb-6 text-brand-100">
            A PanelLakó automatizálja a nyilvántartást, az értesítőket és a könyvelői exportot.
            14 napos ingyenes próba, bankkártya nélkül.
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
