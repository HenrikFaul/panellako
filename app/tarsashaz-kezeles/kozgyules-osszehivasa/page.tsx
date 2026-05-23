import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ChevronRight,
  Vote,
  Calendar,
  FileText,
  Users,
  CheckCircle,
  ArrowRight,
  Scale,
  AlertTriangle,
  Smartphone,
  BookOpen,
  Clock,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Hogyan hívjuk össze a közgyűlést? — Lépésről lépésre | PanelLakó',
  description:
    'A társasházi közgyűlés összehívásának menete a 2003. évi CXXXIII. törvény szerint. Meghívók, napirend, határozatképesség, digitális szavazás lehetőségei.',
  alternates: { canonical: 'https://panellako.hu/tarsashaz-kezeles/kozgyules-osszehivasa' },
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
      name: 'Közgyűlés összehívása',
      item: 'https://panellako.hu/tarsashaz-kezeles/kozgyules-osszehivasa',
    },
  ],
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Hogyan hívjuk össze a közgyűlést? — Lépésről lépésre',
  description:
    'A társasházi közgyűlés összehívásának menete a 2003. évi CXXXIII. törvény szerint. Meghívók, napirend, határozatképesség, digitális szavazás lehetőségei.',
  url: 'https://panellako.hu/tarsashaz-kezeles/kozgyules-osszehivasa',
  publisher: { '@type': 'Organization', name: 'PanelLakó', url: 'https://panellako.hu' },
  inLanguage: 'hu',
};

const MINOSITETT_TABLE = [
  {
    hatarozat: 'SZMSZ elfogadása vagy módosítása',
    arany: 'Az összes tulajdoni hányad legalább 2/3-a',
    megjegyzes: 'A jelen lévők szavazata nem elég — az összes tulajdoni hányad alapján számítják',
  },
  {
    hatarozat: 'Alapító okirat módosítása',
    arany: 'Az összes tulajdoni hányad legalább 4/5-e',
    megjegyzes: 'Kötelező ügyvédi ellenjegyzés + ingatlan-nyilvántartási bejelentés',
  },
  {
    hatarozat: '500 000 Ft feletti kiadás jóváhagyása',
    arany: 'Összes tulajdoni hányad több mint 50%-a',
    megjegyzes: 'Az SZMSZ magasabb összeget is meghatározhat',
  },
  {
    hatarozat: 'Közös tulajdon elidegenítése',
    arany: 'Az összes tulajdoni hányad legalább 2/3-a',
    megjegyzes: 'Külön törvényi feltételek vonatkoznak',
  },
  {
    hatarozat: 'Közös képviselő visszahívása',
    arany: 'Az összes tulajdoni hányad több mint 50%-a',
    megjegyzes: 'Rendkívüli közgyűlésen is meghozható',
  },
  {
    hatarozat: 'Felújítási alap mértékének módosítása',
    arany: 'Az összes tulajdoni hányad több mint 50%-a',
    megjegyzes: 'Éves költségvetés részeként is elfogadható',
  },
];

const CHECKLIST_STEPS = [
  {
    step: 1,
    title: 'Határozza meg a közgyűlés típusát',
    desc: 'Rendes évi közgyűlés (évente kötelező, legkésőbb május 31-ig) vagy rendkívüli közgyűlés (tulajdonosok 1/4-e kéri vagy sürgős döntés szükséges).',
  },
  {
    step: 2,
    title: 'Állítsa össze a napirendet',
    desc: 'Minden tárgyalandó pontot előre rögzíteni kell. A meghívóban nem szereplő kérdésben — főszabályként — nem hozható határozat.',
  },
  {
    step: 3,
    title: 'Válasszon időpontot és helyszínt',
    desc: 'Az időpont legyen mindenki számára elérhető (esti óra, hétvége). A helyszín legyen a lakók által könnyen megközelíthető — ideális a társasházon belüli közös helyiség.',
  },
  {
    step: 4,
    title: 'Készítse el a meghívót',
    desc: 'Tartalmazza: a közgyűlés dátumát, pontos kezdési időpontját, helyszínét (és online elérhetőségét, ha van), a napirendi pontokat, és a határozatképtelenség esetén tartandó folytatólagos közgyűlés időpontját.',
  },
  {
    step: 5,
    title: 'Kézbesítse a meghívót igazolható módon',
    desc: 'Legalább 8 nappal a közgyűlés előtt. Tértivevényes levél, személyes átadás aláírással, vagy e-mail — ha az SZMSZ és a tulajdonos hozzájárulása azt lehetővé teszi.',
  },
  {
    step: 6,
    title: 'Készítse elő a szükséges dokumentumokat',
    desc: 'Éves elszámolás, terv, határozatkönyv kivonat, esetleges ajánlatok és előterjesztések — a tulajdonosok a döntés előtt megismerhessék a releváns adatokat.',
  },
  {
    step: 7,
    title: 'Vezesse le a közgyűlést és rögzítse a határozatokat',
    desc: 'Jelenlévők listája (tulajdoni hányad szerinti), szavazati arányok rögzítése minden döntésnél, hiteles aláírással ellátott jelenléti ív.',
  },
  {
    step: 8,
    title: 'Tegye közzé a határozatokat és vezesse a határozatkönyvet',
    desc: 'A határozatokat legkésőbb 30 napon belül közzé kell tenni (hirdetőtábla, digitális csatorna). A határozatkönyvet naprakészen kell vezetni és bármely tulajdonos számára hozzáférhetővé kell tenni.',
  },
];

export default function KozgyulesOsszehivasaPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <PublicNav />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Breadcrumb */}
        <nav aria-label="Navigáció" className="mb-8 flex flex-wrap items-center gap-1.5 text-sm text-slate-400">
          <Link href="/" className="hover:text-slate-600">Főoldal</Link>
          <ChevronRight size={14} />
          <Link href="/tarsashaz-kezeles" className="hover:text-slate-600">Társasházkezelés</Link>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-600">Közgyűlés összehívása</span>
        </nav>

        {/* Hero */}
        <div className="mb-12">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <Vote size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Hogyan hívjuk össze a közgyűlést? — lépésről lépésre
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            A társasházi közgyűlés a tulajdonosok legfőbb döntéshozó szerve. A 2003. évi CXXXIII. törvény
            pontosan meghatározza az összehívás menetét, a meghívó kötelező tartalmát, a határozatképességi
            szabályokat és — 2021 óta — a digitális közgyűlés lehetőségét.
          </p>
        </div>

        {/* Rendes vs rendkívüli */}
        <section className="mb-12 space-y-4 text-slate-600">
          <h2 className="text-2xl font-black text-slate-900">
            Rendes és rendkívüli közgyűlés — mi a különbség?
          </h2>
          <p className="leading-relaxed">
            A társasháztörvény két típusú közgyűlést különböztet meg. A <strong className="text-slate-800">rendes évi közgyűlést</strong> évente
            legalább egyszer kötelező megtartani, főszabályként legkésőbb a tárgyévet követő május 31-ig.
            Ezen kell elfogadni az előző évi pénzügyi elszámolást, jóváhagyni a következő évi
            költségvetést, és megvitatni az épület üzemeltetésével kapcsolatos stratégiai kérdéseket.
          </p>
          <p className="leading-relaxed">
            A <strong className="text-slate-800">rendkívüli közgyűlést</strong> az alábbi esetekben kell összehívni: ha a tulajdonosok
            legalább 1/4-e (tulajdoni hányad alapján számítva) írásban kéri, ha valamelyik tulajdonos
            jogaiban sérelmet szenved és a törvény erre lehetőséget ad, ha azonnali döntés szükséges
            (pl. sürgős biztonsági karbantartás), vagy ha a közös képviselő a törvény alapján szükségesnek
            ítéli. A rendkívüli közgyűlés összehívási határideje általában 30 nap.
          </p>
          <p className="leading-relaxed">
            Mindkét típusnál azonos formai követelmények vonatkoznak a meghívóra, a határozatképességre
            és a határozatok nyilvántartására. A különbség főként az időzítésben és az összehívás
            kezdeményezésének okában mutatkozik.
          </p>
        </section>

        {/* Mikor kötelező */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Calendar size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Mikor kötelező közgyűlést tartani?</h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              A törvény kötelező évi rendes közgyűlést ír elő. Ha a közös képviselő ezt elmulasztja,
              bármely tulajdonos bírósághoz fordulhat annak elrendelése érdekében. Az összehívás
              elmulasztása fegyelmi és kártérítési felelősséget is megalapozhat.
            </p>
            <div className="space-y-3">
              {[
                {
                  cim: 'Éves rendes közgyűlés',
                  leiras: 'Minden évben kötelező, főszabályként legkésőbb május 31-ig. Napirenden: előző év pénzügyi elszámolása, következő évi költségvetés és közös költség mértéke.',
                  ikon: Calendar,
                },
                {
                  cim: 'Rendkívüli közgyűlés — tulajdonosi kezdeményezésre',
                  leiras: 'Ha a tulajdonosok legalább 1/4-e (tulajdoni hányad alapján) írásban kéri a összehívást, a képviselő köteles 30 napon belül összehívni.',
                  ikon: Users,
                },
                {
                  cim: 'Rendkívüli közgyűlés — sürgős esetben',
                  leiras: 'Ha a közös tulajdont veszély fenyegeti, vagy azonnali döntés szükséges (pl. vészhelyzeti javítás finanszírozása), a képviselő saját belátása szerint is összehívhatja.',
                  ikon: AlertTriangle,
                },
              ].map((item) => {
                const Icon = item.ikon;
                return (
                  <div key={item.cim} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                      <Icon size={18} className="text-brand-600" />
                    </div>
                    <div>
                      <p className="mb-1 font-bold text-slate-900">{item.cim}</p>
                      <p className="text-sm leading-relaxed text-slate-500">{item.leiras}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Meghívó tartalma */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <FileText size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">A meghívó kötelező tartalma</h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              A közgyűlési meghívónak pontosan meghatározott tartalommal kell rendelkeznie — hiányos
              meghívó esetén a határozatok megtámadhatóvá válnak. A törvény legalább 8 nappal a
              közgyűlés előtt előírja a meghívó kézbesítését, igazolható módon.
            </p>
            <p className="leading-relaxed">
              Az „igazolható kézbesítés&quot; lényege, hogy a képviselő bizonyítani tudja: a meghívó eljutott
              a tulajdonoshoz. Tértivevényes postai ajánlott levél, személyes átadás aláírással, vagy —
              ha az SZMSZ és a tulajdonos hozzájárulása lehetővé teszi — elektronikus kézbesítés (e-mail
              visszaigazolással, digitális aláírással) egyaránt elfogadható.
            </p>
            <ul className="space-y-2 text-sm">
              {[
                'A közgyűlés pontos dátuma, kezdési időpontja',
                'A helyszín pontos megjelölése (cím, emelet, helyiség)',
                'Online elérhetőség (ha digitális közgyűlést tartanak)',
                'A napirendi pontok részletes felsorolása',
                'A határozatképtelenség esetére összehívott folytatólagos közgyűlés időpontja és helyszíne',
                'A szavazati jogosultság feltételeire vonatkozó tájékoztatás',
                'Meghatalmazott útján való részvétel lehetősége (ha SZMSZ megengedi)',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle size={15} className="mt-0.5 shrink-0 text-brand-500" />
                  <span className="text-slate-600">{item}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-800">
                  <strong>Fontos:</strong> A meghívóban nem szereplő napirendi pontban főszabályként
                  nem hozható érvényes határozat. Ha az összes tulajdonos jelen van és egyhangúlag
                  hozzájárul, kivételesen napirenden kívüli kérdés is tárgyalható — de ezt a
                  jelenléti íven rögzíteni kell.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Határozatképesség */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Users size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Határozatképesség</h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              A közgyűlés akkor határozatképes, ha az összes tulajdoni hányad több mint 50%-át
              képviselő tulajdonos jelen van (személyesen vagy meghatalmazott útján). A határozatképesség
              számításánál nem a fejszám, hanem a tulajdoni hányad az irányadó.
            </p>
            <p className="leading-relaxed">
              Ha az első közgyűlés határozatképtelen, a meghívóban megjelölt időpontban — de legalább
              fél óra különbséggel — tartható <strong className="text-slate-800">folytatólagos közgyűlés</strong>.
              A folytatólagos közgyűlés a megjelent tulajdonosok tulajdoni hányadától függetlenül
              határozatképes az eredeti napirendi pontokban — ez az egyik legfontosabb eszköz a döntési
              cselekvőképtelenség elkerülésére.
            </p>
            <p className="leading-relaxed">
              A határozatok elfogadásához főszabályként az összes tulajdoni hányad egyszerű többsége
              (több mint 50%) szükséges. Egyes kérdéseknél (SZMSZ módosítás, alapító okirat módosítás,
              közös tulajdon elidegenítése) minősített többség — 2/3-os vagy 4/5-ös arány — szükséges.
            </p>
          </div>
        </section>

        {/* Digitális közgyűlés */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Smartphone size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Digitális közgyűlés lehetőségei 2021 óta
            </h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              A 2021. évi CXLIII. törvény módosította a társasháztörvényt, és törvényes keretek között
              lehetővé tette az <strong className="text-slate-800">elektronikus szavazást</strong> és az
              <strong className="text-slate-800"> online közgyűlés tartását</strong>. Ez a módosítás a
              Covid-járvány tapasztalataira reagált, de tartós megoldást kínál a kis részvételű,
              logisztikailag nehezen megszervezhető személyes közgyűlések problémájára.
            </p>
            <p className="leading-relaxed">
              Az elektronikus szavazás és az online közgyűlés tartásának előfeltétele, hogy azt az
              SZMSZ lehetővé tegye. Ha az SZMSZ jelenleg nem tartalmaz ilyen rendelkezést, először
              módosítani kell az SZMSZ-t — ami maga is közgyűlési határozatot igényel. A módosítás
              elfogadásához minősített (2/3-os) többség szükséges.
            </p>
            <p className="leading-relaxed">
              A digitális közgyűlés nem szükségszerűen jelenti a személyes jelenlét teljes kiváltását:
              a hibrid megoldás (ahol a tulajdonosok egy része személyesen, más része online vesz részt)
              szintén lehetséges. A lényeg, hogy az azonosítás megbízható legyen, és minden résztvevő
              egyenlő esélyekkel tudjon szavazni és felszólalni.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  cim: 'Előfeltétel',
                  szoveg: 'Az SZMSZ kifejezetten engedélyezi a digitális közgyűlést és/vagy elektronikus szavazást.',
                  szin: 'border-brand-200 bg-brand-50',
                  cimSzin: 'text-brand-700',
                },
                {
                  cim: 'Azonosítás',
                  szoveg: 'A résztvevők kilétét igazolni kell — pl. meghívóban szereplő egyedi kód, e-mail visszaigazolás vagy egyéb megbízható módszer.',
                  szin: 'border-slate-200 bg-slate-50',
                  cimSzin: 'text-slate-700',
                },
                {
                  cim: 'Dokumentálás',
                  szoveg: 'A digitális közgyűlés rögzítése, a szavazási napló megőrzése ugyanolyan kötelező, mint a hagyományos közgyűlésnél.',
                  szin: 'border-slate-200 bg-slate-50',
                  cimSzin: 'text-slate-700',
                },
              ].map((card) => (
                <div key={card.cim} className={`rounded-xl border p-4 ${card.szin}`}>
                  <p className={`mb-1.5 font-bold ${card.cimSzin}`}>{card.cim}</p>
                  <p className="text-sm leading-relaxed text-slate-600">{card.szoveg}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Határozatok nyilvántartása */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <BookOpen size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Határozatok nyilvántartása</h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              A határozatkönyv a közgyűlési döntések jogi szempontból hiteles nyilvántartása.
              Minden határozatot sorszámmal, dátummal, a szavazati arányok pontos feltüntetésével
              kell bejegyezni. A határozatkönyvet a közös képviselő köteles megőrizni és bármely
              tulajdonos részére betekintésre rendelkezésre bocsátani.
            </p>
            <p className="leading-relaxed">
              A határozatokat a közgyűlés napjától számított 30 napon belül közzé kell tenni.
              A hagyományos közzétételre szolgáló eszköz a ház hirdetőtáblája, de az SZMSZ lehetővé
              teheti más csatorna — pl. közös e-mail lista, digitális dokumentumtár — alkalmazását is.
            </p>
            <p className="leading-relaxed">
              A határozatkönyv nyilvánossága korlátlan a tulajdonosok körében — bármely lakástulajdonos
              betekinthet bele. Ezzel szemben a személyes adatokat (pl. ki szavazott hogyan) GDPR-
              megfontolásból körültekintően kell kezelni, különösen, ha a szavazás nem titkos.
            </p>
          </div>
        </section>

        {/* Minősített többség táblázat */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Scale size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Milyen határozatokhoz kell minősített többség?
            </h2>
          </div>
          <p className="mb-5 leading-relaxed text-slate-500">
            Az egyszerű többségen (több mint 50%) túl a törvény számos esetben magasabb szavazati
            arányt ír elő. Az alábbi táblázat a leggyakoribb eseteket foglalja össze.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-bold text-slate-700">Határozat tárgya</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-700">Szükséges arány</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-700">Megjegyzés</th>
                </tr>
              </thead>
              <tbody>
                {MINOSITETT_TABLE.map((row, i) => (
                  <tr key={row.hatarozat} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.hatarozat}</td>
                    <td className="px-4 py-3 text-brand-700 font-semibold">{row.arany}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.megjegyzes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Az arányok az összes tulajdoni hányad alapján értendők, nem csupán a jelen lévők szavazata alapján.
            Tájékoztató jellegű — nem minősül jogi tanácsadásnak.
          </p>
        </section>

        {/* Lépésről lépésre ellenőrző lista */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Clock size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              8 lépés a közgyűlés megszervezéséhez
            </h2>
          </div>
          <p className="mb-6 leading-relaxed text-slate-500">
            Az alábbi ellenőrző lista segít abban, hogy egyetlen kötelező lépést se hagyjon ki a
            közgyűlés megszervezése során.
          </p>
          <div className="space-y-4">
            {CHECKLIST_STEPS.map((item) => (
              <div key={item.step} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-black text-white">
                  {item.step}
                </div>
                <div>
                  <p className="mb-1 font-bold text-slate-900">{item.title}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Back link */}
        <div className="mb-10">
          <Link
            href="/tarsashaz-kezeles"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600"
          >
            <ChevronRight size={14} className="rotate-180" />
            Vissza: Társasházkezelés útmutató
          </Link>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-lg">
          <h2 className="mb-2 text-2xl font-black text-white">
            Online közgyűlés a PanelLakóval
          </h2>
          <p className="mb-6 text-brand-100">
            A PanelLakó közgyűlési modulja a 2021. évi CXLIII. tv. alapján készült — meghívók
            automatikus kiküldésétől a digitális szavazásig és a határozatkönyv automatikus
            kitöltéséig minden lépést lefed.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/funkciok/online-kozgyules"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-50"
            >
              <Vote size={16} />
              Online közgyűlés funkció
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/10"
            >
              Ingyenes regisztráció <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
