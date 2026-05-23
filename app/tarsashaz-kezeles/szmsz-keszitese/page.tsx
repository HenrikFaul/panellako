import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ChevronRight,
  BookOpen,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Scale,
  FolderOpen,
  Users,
  Building2,
  Vote,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'SZMSZ készítése társasházaknak — Útmutató | PanelLakó',
  description:
    'Hogyan készítsük el a társasház SZMSZ-ét (Szervezeti és Működési Szabályzatát)? Kötelező tartalom, elfogadás menete, módosítás szabályai.',
  alternates: { canonical: 'https://panellako.hu/tarsashaz-kezeles/szmsz-keszitese' },
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
      name: 'SZMSZ készítése',
      item: 'https://panellako.hu/tarsashaz-kezeles/szmsz-keszitese',
    },
  ],
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'SZMSZ készítése — Szervezeti és Működési Szabályzat társasházaknak',
  description:
    'Hogyan készítsük el a társasház SZMSZ-ét (Szervezeti és Működési Szabályzatát)? Kötelező tartalom, elfogadás menete, módosítás szabályai.',
  url: 'https://panellako.hu/tarsashaz-kezeles/szmsz-keszitese',
  publisher: { '@type': 'Organization', name: 'PanelLakó', url: 'https://panellako.hu' },
  inLanguage: 'hu',
  datePublished: '2024-01-15',
  dateModified: '2026-05-23',
  author: { '@type': 'Organization', name: 'PanelLakó', url: 'https://panellako.hu' },
};

const KOTELEZO_ELEMEK = [
  {
    szam: '1.',
    cim: 'A közös képviselő vagy intézőbizottság megválasztásának rendje',
    leiras:
      'Megbízatás időtartama (határozott vagy határozatlan), megválasztáshoz szükséges szavazati arány, visszahívás feltételei, helyettesítés rendje.',
  },
  {
    szam: '2.',
    cim: 'A közgyűlés összehívásának és lefolytatásának szabályai',
    leiras:
      'Az összehívás módja, határidők, a meghívó tartalma, határozatképesség megállapításának módja, szavazási eljárás. 2021 óta ide kerülnek az elektronikus szavazás szabályai is.',
  },
  {
    szam: '3.',
    cim: 'A határozathozatal rendje',
    leiras:
      'Milyen kérdésekben szükséges egyszerű, illetve minősített többség, a szavazati jog gyakorlásának módja (személyesen, meghatalmazott útján, elektronikusan).',
  },
  {
    szam: '4.',
    cim: 'A közös költség meghatározásának és fizetésének rendje',
    leiras:
      'A közös költség számítási alapja, a fizetési határidők, a hátralék esetén alkalmazandó eljárás (kamat, felszólítás, fizetési meghagyás).',
  },
  {
    szam: '5.',
    cim: 'A felújítási alap kezelése',
    leiras:
      'A felújítási alap mértéke (az összes közös költség legalább 10%-a), az alap elkülönített kezelésének módja, a felhasználás jóváhagyásának rendje.',
  },
  {
    szam: '6.',
    cim: 'A közös tulajdonban lévő épületrészek használatának szabályai',
    leiras:
      'Lépcsőház, tető, pince, udvar, parkoló, közös helyiségek — ki használhatja, milyen feltételekkel, milyen tilalmak vonatkoznak rájuk.',
  },
  {
    szam: '7.',
    cim: 'A közös képviselő díjazása és kiadásainak megtérítése',
    leiras:
      'Megbízási díj, rezsiköltség-megtérítés, könyvelői és jogi tanácsadói díjak kezelése, kifizetési határidők.',
  },
  {
    szam: '8.',
    cim: 'Az iratkezelés és a dokumentumok hozzáférhetőségének rendje',
    leiras:
      'Milyen iratokat kell megőrizni, meddig, milyen formában (papír, digitális), és hogyan biztosítható a tulajdonosok betekintési joga.',
  },
  {
    szam: '9.',
    cim: 'Adatkezelési szabályok (GDPR)',
    leiras:
      'A társasházi adatkezelés céljai, jogalapja, a kezelt adatok köre (tulajdonosi névsor, fizetési adatok, biztonsági kamera), az érintetti jogok érvényesítésének módja.',
  },
  {
    szam: '10.',
    cim: 'A bérbeadásra és az albérletre vonatkozó szabályok',
    leiras:
      'A tulajdonos értesítési kötelezettsége bérlő beköltözésekor, a bérlő kötelezettségei, esetleges házirendre hivatkozás.',
  },
];

const ELKESZITES_LEPESEK = [
  {
    szam: 1,
    cim: 'Hatályos SZMSZ felülvizsgálata (vagy hiányának megállapítása)',
    leiras:
      'Előbb meg kell győződni arról, van-e egyáltalán hatályos SZMSZ. Ha igen, át kell nézni, hogy megfelel-e a jelenleg hatályos törvényi követelményeknek — különösen a 2021. évi CXLIII. tv. módosításai és a GDPR tekintetében.',
  },
  {
    szam: 2,
    cim: 'Munkacsoport vagy szakértő bevonása',
    leiras:
      'Nagyobb társasházaknál célszerű egy 3-5 főből álló munkacsoport felállítása a tulajdonosok körből. Kisebb házaknál a közös képviselő maga is elvégezheti, de ügyvédi véleményezés erősen ajánlott az elfogadás előtt.',
  },
  {
    szam: 3,
    cim: 'Tervezet elkészítése',
    leiras:
      'A tervezetet írásban kell elkészíteni, a törvény kötelező tartalmi elemeit teljes körűen lefedve. A tervezet lehet teljesen új dokumentum, vagy a meglévő SZMSZ módosítással és kiegészítéssel ellátott verziója.',
  },
  {
    szam: 4,
    cim: 'Tervezet közzététele és véleményezési lehetőség biztosítása',
    leiras:
      'Mielőtt a tervezet a közgyűlés elé kerül, biztosítani kell, hogy minden tulajdonos megismerhesse azt — lehetőség szerint legalább 15 nappal a közgyűlés előtt. Ez növeli az elfogadás esélyét és csökkenti a vitatható határozatok kockázatát.',
  },
  {
    szam: 5,
    cim: 'Elfogadás közgyűlésen, 2/3-os minősített többséggel',
    leiras:
      'Az SZMSZ elfogadásához az összes tulajdoni hányad legalább 2/3-ának igenlő szavazata szükséges. Az elfogadást a határozatkönyvbe kell bejegyezni, és az SZMSZ-t ezt követően kell hatályba léptetni.',
  },
];

const TIPIKUS_HIBAK = [
  {
    hiba: 'Elavult jogszabályi hivatkozások',
    leiras:
      'Sok régi SZMSZ még a 2003. évi CXXXIII. tv. eredeti szövegét idézi, és nem tartalmazza a 2021. évi módosítások következtében hatályba lépett rendelkezéseket (digitális közgyűlés, elektronikus szavazás). Az elavult SZMSZ nem tiltja ugyan a digitális megoldásokat, de nem is teszi őket törvényesen lehetővé.',
  },
  {
    hiba: 'Hiányzó GDPR fejezet',
    leiras:
      'A 2018 előtt elfogadott SZMSZ-ek túlnyomó többségéből hiányzik az adatkezelési fejezet. Ez nem csupán formális hiányosság: ha a társasházban biztonsági kamera üzemel, vagy a képviselő a tulajdonosok személyes adatait kezeli, az adatkezelési tájékoztató és az SZMSZ megfelelő fejezete kötelező.',
  },
  {
    hiba: 'A felújítási alap mértéke nincs rögzítve',
    leiras:
      'A törvény szerint a felújítási alapra évenként legalább az összes közös költség 10%-ának megfelelő összeget kell befizetni. Ha az SZMSZ nem rögzíti ezt, vitás lehet a befizetési kötelezettség mértéke és a felhasználás rendje.',
  },
  {
    hiba: 'Szavazási arányok pontatlan meghatározása',
    leiras:
      'Az SZMSZ nem különbözteti meg egyértelműen az egyszerű és minősített többséget igénylő döntési körök listáját. Ennek következtében érvénytelen határozatok születhetnek, amelyeket bármely tulajdonos megtámadhat bíróságon.',
  },
  {
    hiba: 'Digitális kommunikáció nincs szabályozva',
    leiras:
      'Az SZMSZ nem rendelkezik arról, hogy az e-mailen küldött értesítők, meghívók igazolható kézbesítésnek minősülnek-e. E nélkül az elektronikus kommunikáció jogilag nem egyenértékű a tértivevényes postai levéllel — ami drágává és körülményessé teszi a papírmentes üzemeltetést.',
  },
];

export default function SzmszKeszitesePage() {
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
          <span className="font-medium text-slate-600">SZMSZ készítése</span>
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
        <div className="mb-12">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <BookOpen size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            SZMSZ készítése — Szervezeti és Működési Szabályzat
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            A Szervezeti és Működési Szabályzat (SZMSZ) a társasház belső alkotmánya — a törvény által
            kötelezően előírt dokumentum, amely meghatározza a közgyűlés, a közös képviselő és a
            tulajdonosok közötti viszony minden lényeges szabályát.
          </p>
        </div>

        {/* Mi az SZMSZ, miért kötelező */}
        <section className="mb-12 space-y-4 text-slate-600">
          <h2 className="text-2xl font-black text-slate-900">Mi az SZMSZ és miért kötelező?</h2>
          <p className="leading-relaxed">
            A 2003. évi CXXXIII. törvény 13. §-a kötelezővé teszi, hogy minden társasház rendelkezzen
            érvényes Szervezeti és Működési Szabályzattal. Az SZMSZ a törvény keretei között szabályozza
            a társasház belső működését: a döntéshozatalt, a gazdálkodást, az iratkezelést, az adatkezelést
            és a tulajdonosok közötti viszonyokat.
          </p>
          <p className="leading-relaxed">
            Az SZMSZ és az alapító okirat együtt alkotja a társasház belső szabályrendszerét. Az alapító
            okirat az ingatlan-nyilvántartásba is bejegyzett, az épületet és a tulajdoni hányadokat
            rögzítő dokumentum. Az SZMSZ ezzel szemben a működési szabályokat tartalmazza — és
            könnyebben módosítható (2/3-os vs. 4/5-ös szavazatarány).
          </p>
          <p className="leading-relaxed">
            Ha egy társasháznak nincs érvényes SZMSZ-e, vagy az SZMSZ nem felel meg a törvény
            minimális tartalmi követelményeinek, bármely tulajdonos bírósághoz fordulhat annak
            elkészítésére vagy módosítására kötelezés iránt. Emellett az érvénytelen SZMSZ-re
            hivatkozva meghozott határozatok megtámadhatóvá válnak.
          </p>
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
            <div className="flex gap-3">
              <Scale size={18} className="mt-0.5 shrink-0 text-brand-600" />
              <div>
                <p className="font-bold text-brand-800">Jogszabályi alap</p>
                <p className="mt-1 text-sm text-brand-700">
                  2003. évi CXXXIII. törvény a társasházakról, 13. §: „A közgyűlés a szervezeti és
                  működési szabályzatban határozza meg a tulajdonostársak közösségének szervezetét
                  és működési rendjét, ideértve a közös képviselő jogait és kötelezettségeit is.&quot;
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Kötelező tartalmi elemek */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <FileText size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Az SZMSZ kötelező tartalmi elemei</h2>
          </div>
          <p className="mb-6 leading-relaxed text-slate-500">
            A törvény meghatározza azokat a minimális tartalmi elemeket, amelyeket az SZMSZ-nek
            kötelezően tartalmaznia kell. Az alábbiakban ezeket részletezzük.
          </p>
          <div className="space-y-4">
            {KOTELEZO_ELEMEK.map((elem) => (
              <div
                key={elem.szam}
                className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-black text-white">
                  {elem.szam}
                </div>
                <div>
                  <p className="mb-1.5 font-bold text-slate-900">{elem.cim}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{elem.leiras}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Az elkészítés menete */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Users size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Az SZMSZ elkészítésének menete</h2>
          </div>
          <div className="space-y-4">
            {ELKESZITES_LEPESEK.map((lepes) => (
              <div
                key={lepes.szam}
                className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-brand-300 bg-white text-sm font-black text-brand-600">
                  {lepes.szam}
                </div>
                <div>
                  <p className="mb-1 font-bold text-slate-900">{lepes.cim}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{lepes.leiras}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Elfogadás és módosítás */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Vote size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Az SZMSZ elfogadása és módosítása</h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              Az SZMSZ elfogadásához és módosításához az összes tulajdoni hányad legalább
              <strong className="text-slate-800"> 2/3-ának igenlő szavazata</strong> szükséges.
              Ez minősített többség — nem elég, ha csupán a jelenlévők 2/3-a szavaz igennel.
              Az arány az összes (jelenlévő és távolmaradó) tulajdoni hányadhoz viszonyítva értendő.
            </p>
            <p className="leading-relaxed">
              Ha az SZMSZ módosítása egyidejűleg az alapító okirat módosítását is szükségessé teszi
              (pl. közös területek besorolásának megváltoztatása), akkor az alapító okirathoz az összes
              tulajdoni hányad <strong className="text-slate-800">legalább 4/5-ének</strong> hozzájárulása
              szükséges, és a módosítást ügyvédnek kell ellenjegyeznie, majd az ingatlan-nyilvántartásba
              be kell jegyeztetni.
            </p>
            <p className="leading-relaxed">
              Az SZMSZ módosításának folyamata ugyanaz, mint az elfogadásé: tervezet elkészítése,
              véleményezési lehetőség biztosítása, közgyűlési tárgyalás és szavazás, majd a határozat
              határozatkönyvbe való bejegyzése. Az elfogadott SZMSZ-t meg kell őrizni, és bármely
              tulajdonos kérésére rendelkezésre kell bocsátani.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-1.5 font-bold text-slate-900">SZMSZ elfogadása / módosítása</p>
                <p className="text-2xl font-black text-brand-600">2/3-os</p>
                <p className="text-sm text-slate-500">Az összes tulajdoni hányad alapján számítva</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-1.5 font-bold text-slate-900">Alapító okirat módosítása</p>
                <p className="text-2xl font-black text-brand-600">4/5-ös</p>
                <p className="text-sm text-slate-500">Ügyvédi ellenjegyzés + ingatlan-nyilvántartás</p>
              </div>
            </div>
          </div>
        </section>

        {/* Tipikus hibák */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Tipikus hibák az SZMSZ-ben</h2>
          </div>
          <p className="mb-5 leading-relaxed text-slate-500">
            A társasházi SZMSZ-ek auditálása során az alábbi hibák fordulnak elő a leggyakrabban.
            Ha az Ön társasházában az alábbiak bármelyike fennáll, érdemes felülvizsgálni a dokumentumot.
          </p>
          <div className="space-y-4">
            {TIPIKUS_HIBAK.map((item, i) => (
              <div
                key={item.hiba}
                className="flex gap-4 rounded-2xl border border-amber-100 bg-amber-50 p-5"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-xs font-black text-amber-700">
                  {i + 1}
                </div>
                <div>
                  <p className="mb-1 font-bold text-slate-900">{item.hiba}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{item.leiras}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tárolás és hozzáférhetőség */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <FolderOpen size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Az SZMSZ tárolása és hozzáférhetősége
            </h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              A törvény értelmében bármely lakástulajdonos jogosult az SZMSZ megtekintésére —
              a közös képviselő köteles azt kérésre rendelkezésre bocsátani. A hozzáférési jog
              megtagadása törvénysértésnek minősül, és bírósági eljárás alapja lehet.
            </p>
            <p className="leading-relaxed">
              A tárolásra vonatkozóan a törvény nem ír elő szigorú formai követelményt, de a
              jó gyakorlat az, hogy az SZMSZ egyszerre papír alapon (aláírt, lepecsételt eredeti)
              és digitális formátumban (kereshető PDF) is megőrzésre kerüljön. A papír eredeti a
              jogi vita esetén bizonyítékként szolgál, a digitális változat a mindennapi munkát
              könnyíti meg.
            </p>
            <p className="leading-relaxed">
              Ideális megoldás, ha az SZMSZ (és a korábbi verziók is) a társasházi dokumentumtárban
              hozzáférhető minden tulajdonos számára. Ez biztosítja az átláthatóságot, csökkenti a
              „nem tudtam róla&quot; típusú vitákat, és megkönnyíti az új tulajdonosok tájékoztatását is —
              az ingatlan vásárlásakor a vevők általában igénylik a társasházi dokumentumok megtekintését.
            </p>
            <ul className="space-y-2 text-sm">
              {[
                'Papír eredeti megőrzése aláírt, dátumozott formában (a határozatkönyvvel együtt)',
                'Digitális változat (kereshető PDF) archiválása, verziószámmal és elfogadás dátumával',
                'Előző SZMSZ-verziók megőrzése — jogvitában releváns lehet, mikor mi volt hatályban',
                'Elérhetővé tétel a tulajdonosok számára (hirdetőtábla, e-mail kérésre, digitális dokumentumtár)',
                'Frissítés módosítás esetén — és a korábbi verzió egyidejű archiválása',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle size={15} className="mt-0.5 shrink-0 text-brand-500" />
                  <span className="text-slate-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Digitális kezelés */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Building2 size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Segítség az SZMSZ digitális kezelésében
            </h2>
          </div>
          <p className="leading-relaxed">
            A PanelLakó dokumentumtár modulja lehetővé teszi, hogy az SZMSZ és annak összes
            korábbi verziója biztonságosan, kereshető formátumban és jogosultság-kezelten legyen
            elérhető. A tulajdonosok bármikor megtekinthetik a hatályos SZMSZ-t, a közös képviselő
            pedig egy kattintással megoszthatja az új verziókat.
          </p>
          <p className="leading-relaxed">
            Az SZMSZ-ben rögzített digitális közgyűlési és szavazási szabályok közvetlenül
            integrálódnak a PanelLakó közgyűlési moduljával — így az SZMSZ nem csupán egy statikus
            dokumentum, hanem a platform működésének alapja. A módosítások átvezetése és a
            tulajdonosok értesítése egyetlen lépésben elvégezhető.
          </p>
          <div className="mt-2">
            <Link
              href="/funkciok/dokumentumtar"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Ismerje meg a dokumentumtár funkciót <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* Legal disclaimer */}
        <div className="mb-10 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-5">
          <div className="flex gap-3">
            <Scale size={18} className="mt-0.5 shrink-0 text-slate-400" />
            <p className="text-sm leading-relaxed text-slate-500">
              Ez az oldal tájékoztató jellegű összefoglaló és nem minősül jogi tanácsadásnak.
              Az SZMSZ elkészítésekor és elfogadásakor mindig ellenőrizze a hatályos jogszabályszöveget
              (2003. évi CXXXIII. törvény), és szükség esetén forduljon ingatlanügyvédhez.
            </p>
          </div>
        </div>

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
            Kezelje digitálisan a társasháza dokumentumait
          </h2>
          <p className="mb-6 text-brand-100">
            Az SZMSZ-től a közgyűlési határozatokig — a PanelLakó dokumentumtár modulja minden
            iratot egy helyen, kereshetően és jogosultság-kezelten tárol. 14 napos ingyenes próba.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/funkciok/dokumentumtar"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-50"
            >
              <FolderOpen size={16} />
              Dokumentumtár funkció
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
