import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Sun,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Zap,
  Battery,
  Scale,
  TrendingDown,
  Building2,
  Leaf,
  Shield,
  Vote,
  FileText,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Napelem Társasházban — Közös Tető, Szavazás, METÁR | PanelLakó',
  description:
    'Hogyan telepítsünk napelemrendszert társasházi tetőre? Közgyűlési határozat (2/3 többség), METÁR szabályozás, megtérülési idő, közös energia-felhasználás.',
  alternates: { canonical: 'https://panellako.hu/zold-tarsashaz/napelem-tarsashazban' },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Napelem telepítés társasházi tetőre — amit tudni kell',
  description:
    'Hogyan telepítsünk napelemrendszert társasházi tetőre? Közgyűlési határozat (2/3 többség), METÁR szabályozás, megtérülési idő, közös energia-felhasználás.',
  inLanguage: 'hu',
  url: 'https://panellako.hu/zold-tarsashaz/napelem-tarsashazban',
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
      name: 'Zöld Társasház',
      item: 'https://panellako.hu/zold-tarsashaz',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Napelem Társasházban',
      item: 'https://panellako.hu/zold-tarsashaz/napelem-tarsashazban',
    },
  ],
};

const SIZING_ITEMS = [
  {
    icon: Zap,
    title: 'Lift és közös területek',
    text: 'A lift éves energiaigénye egy 10-emeletes, 60 lakásos épületben kb. 15 000–25 000 kWh/év. Ez egymagában indokolja egy 10–15 kWp rendszer telepítését, amely napsütötte napokon teljes mértékben fedezheti ezt az igényt.',
  },
  {
    icon: Battery,
    title: 'Lépcsőházi és udvari világítás',
    text: 'Az LED-re korszerűsített közös világítás éves fogyasztása 2 000–5 000 kWh. Napelemmel kombinálva, esetleg kiskapacitású akkumulátoros tárolóval, a közös áramköltség szinte nullára csökkenthető.',
  },
  {
    icon: Shield,
    title: 'Szivattyúk és hőközpont',
    text: 'A keringetőszivattyúk és a hőközpont segédberendezései folyamatos terhelést jelentenek. Ezek önfogyasztási stratégiával lefedhetők napelemmel — különösen nyáron, amikor a napsütési idő és a fűtési szünet egybeesik.',
  },
];

const TENDER_ITEMS = [
  {
    title: 'RRF és GINOP-Plus',
    desc: 'Az EU Helyreállítási és Reziliencia Eszközből (RRF) finanszírozott programok rendszeresen tartalmaznak társasházi megújuló energia komponenst. A GINOP-Plus keretein belül zöld ipari és lakóingatlan-beruházások kaphatnak vissza nem térítendő támogatást.',
  },
  {
    title: 'Önkormányzati napelem programok',
    desc: 'Több fővárosi kerület (pl. XIII., XIV., XV.) rendelkezik saját önkormányzati napelem-támogatási kerettel. Ezek jellemzően 20–50%-os önrész mellett 50–80%-os támogatási intenzitást nyújtanak, és a helyi döntéshozók révén rugalmasabbak.',
  },
  {
    title: 'MFB Zöld Otthon Hitel',
    desc: 'A Magyar Fejlesztési Bank preferenciális kamatozású hitele megújuló energia beruházásokra is igénybe vehető, ha az épület energetikai tanúsítványa legalább B osztályra javul a projektet követően. Maximális összege épületenként akár 200 millió Ft is lehet.',
  },
  {
    title: 'KEHOP-PLUSZ utód programok',
    desc: 'A korábbi KEHOP (Környezeti és Energia Hatékonysági Operatív Program) utódprogramjai az energetikai és megújuló energia beruházásokat továbbra is finanszírozhatják a 2021–2027-es uniós programozási időszakban. Az aktuális kiírásokat az NFIS.hu portálon kell követni.',
  },
];

const QUALITY_ITEMS = [
  {
    icon: Shield,
    title: 'MSZ EN IEC 61215 — Napelemmodul tanúsítvány',
    desc: 'Ez a szabvány igazolja, hogy a modul megfelel a mechanikai, elektromos és termikus terhelési teszteknek. Csak ezzel a tanúsítvánnyal rendelkező modulokat fogad el az ELMŰ/ÉMÁSZ hálózati csatlakozáshoz, és az MFB finanszírozáshoz is elvárás.',
  },
  {
    icon: Zap,
    title: 'MSZ EN IEC 62109 — Inverter biztonság',
    desc: 'Az inverter — a napelemek egyenáramát hálózati váltóárammá alakító berendezés — biztonságát ez a szabvány igazolja. A tanúsítvány hiánya esetén az áramszolgáltató megtagadhatja a hálózati csatlakozást és a mérőberendezés felszerelését.',
  },
  {
    icon: AlertTriangle,
    title: 'Tűzvédelmi előírások — tűzoltó hozzáférés kötelező!',
    desc: 'A 28/2011. (IX.6.) BM rendelet és az OTSZ előírások alapján a napelemrendszer elrendezésének lehetővé kell tennie a tűzoltók tetőre jutását és az oltási munkálatokat. Az engedélyezési tervnek tartalmaznia kell a tűzvédelmi elválasztó sávokat és az útvonalakat — ennek elmulasztása hatósági leállítást vonhat maga után.',
  },
];

export default function NapelemTarsashazbanPage() {
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
          <Link href="/zold-tarsashaz" className="hover:text-slate-600">
            Zöld Társasház
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-600">Napelem Társasházban</span>
        </nav>

        {/* Hero */}
        <div className="mb-14">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
            <Sun size={24} className="text-amber-500" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Napelem telepítés társasházi tetőre — amit tudni kell
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            A közös tetőre szerelt napelemrendszer az egyik legjobb megtérülést hozó zöld beruházás,
            amelyet egy társasházi közösség megvalósíthat. De mielőtt ajánlatot kér a kivitelezőtől,
            fontos tisztában lenni a jogi háttérrel, a 2024 óta érvényes METÁR-szabályokkal, az optimális
            méretezéssel és a közgyűlési szavazás kötelező eljárásrendjével.
          </p>
        </div>

        {/* Jogszabályi háttér */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <Scale size={20} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Jogszabályi háttér</h2>
          </div>
          <p className="leading-relaxed">
            A társasházi tető a 2003. évi CXXXIII. törvény (Társasháztörvény) 3. §-a alapján közös
            tulajdonban áll — vagyis egyetlen tulajdonos sem rendelkezhet felette önállóan, és semmilyen
            beavatkozás — beleértve a napelemrendszer telepítését — nem végezhető el anélkül, hogy a
            közösség jóváhagyná azt.
          </p>
          <p className="leading-relaxed">
            A törvény 24. § (3) bekezdése kimondja, hogy a közös tulajdont érintő beruházásokhoz és
            felújításokhoz az összes tulajdoni hányad legalább kétharmadának (2/3) szavazata szükséges.
            Ez a minősített többség azt jelenti, hogy ha egy 30 lakásos társasházban 10 millió Ft-os
            össztulajdoni hányad van, akkor legalább 6,67 millió Ft-nyi tulajdoni hányad képviselői
            kell, hogy szavazzanak igennel — a jelenléti arány önmagában nem elegendő.
          </p>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <p className="mb-1 font-bold text-slate-900">Az ellenszavazók is kötelesek alávetni magukat</p>
                <p className="text-sm leading-relaxed text-slate-600">
                  A Társasháztörvény 24. § (5) bekezdése alapján a 2/3-os többséggel meghozott határozat
                  kötelező erejű minden tulajdonosra — beleértve azokat is, akik ellene szavaztak vagy
                  távolmaradtak. Ugyanakkor az ellenszavazók 30 napon belül bíróság előtt megtámadhatják
                  a határozatot, ha az jogszabálysértő vagy kirívóan méltánytalan. Éppen ezért kulcsfontosságú
                  a határozat előzetes dokumentálása: árajánlatok, megtérülési kalkuláció, tűzvédelmi terv.
                </p>
              </div>
            </div>
          </div>
          <p className="leading-relaxed">
            Ha az épület SZMSZ-ében nincs külön napelem-szabályozás, érdemes egyszerre módosítani azt is
            a közgyűlésen — ez szintén 2/3-os többséget igényel, de egyetlen határozatba belefoglalható.
          </p>
        </section>

        {/* METÁR */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Zap size={20} className="text-amber-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">METÁR rendszer 2023 után</h2>
          </div>
          <p className="leading-relaxed">
            A METÁR (Megújuló Energiaforrások Támogatási Rendszere) keretein belül működő METÁR+ és
            METÁR KÁT rendszert 2022 végén megreformálták. A legfontosabb változás, amelyet minden
            társasházi döntéshozónak ismernie kell: a nettó elszámolás (net metering) rendszere
            <strong className="text-slate-900"> 2024. január 1-jétől Magyarországon megszűnt</strong>.
          </p>
          <p className="leading-relaxed">
            A nettó elszámolás azt jelentette, hogy amit a napelemek a hálózatba tápláltak, azt az
            áramszámlán jóváírták — vagyis ha napközben felesleges energiát exportált az épület, azt
            este visszakaphatta (virtuális tárolás). Az új rendszerben ez nem lehetséges: bármit
            exportálunk a hálózatba, annak értéke <strong className="text-slate-900">0 forint</strong> — az
            áramszolgáltató azt ingyen kapja meg, a társasházi közösség nem kap ellentételezést.
          </p>
          <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle size={18} className="mt-0.5 shrink-0 text-brand-600" />
              <div>
                <p className="mb-1 font-bold text-slate-900">Az önfogyasztás az optimális stratégia</p>
                <p className="text-sm leading-relaxed text-slate-600">
                  Mivel az exportált energia elvész, a rendszert úgy kell méretezni, hogy az épület
                  közös fogyasztói (lift, lépcsőházi fény, szivattyú) szinte folyamatosan le tudják
                  hívni a megtermelt energiát. A túlméretezett rendszer exportálja a felesleget ingyen
                  — ez rontja a megtérülést. Az ideális tervező elvégzi a terhelési profil elemzést
                  (loadprofile analysis) és ahhoz igazítja a rendszer kapacitását.
                </p>
              </div>
            </div>
          </div>
          <p className="leading-relaxed">
            Az akkumulátoros tárolás (battery storage) részben kompenzálhatja a net metering megszűnését:
            a napközben megtermelt felesleges energiát akkumulátorban eltárolva este és éjjel is
            felhasználható a közös területeken. Egy 10 kWh-s LFP (lítium-vasfoszfát) akkumulátor
            2024-ben kb. 1,2–2 millió Ft-ba kerül — ez a beruházás néhány évvel megnyújtja a megtérülési
            időt, de hosszú távon javítja az önellátási arányt.
          </p>
        </section>

        {/* Optimális méretezés */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <Leaf size={20} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Optimális méretezés közös rendszernél</h2>
          </div>
          <p className="leading-relaxed">
            Az első lépés a közös fogyasztási profil felmérése. Kérjen ki 12 havi mérőleolvasási adatot
            az áramszolgáltatótól a közös mérőkre (lift, közös világítás, kapuberendezések, szivattyúk).
            Ebből kiszámítható az optimális rendszerméret — általában a napi átlagos közös fogyasztás
            80–90%-ának lefedése a cél, hogy ne keletkezzék felesleg.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {SIZING_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <p className="mb-1.5 font-bold text-slate-900">{item.title}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{item.text}</p>
                </div>
              );
            })}
          </div>
          <p className="leading-relaxed">
            Egy tipikus 40–80 lakásos panelépületnél a közös fogyasztás 20 000–50 000 kWh/év között
            mozog. Ehhez 15–35 kWp rendszer szükséges. Magyarország átlagos napsugárzása alapján
            (kb. 1 100–1 200 csúcsnapóra/év) egy 20 kWp rendszer évente kb. 22 000–24 000 kWh-t termel.
            Ez reálisan lefedi a legtöbb társasház teljes közös áramigényét, nyáron akár 100%-ban.
          </p>
          <p className="leading-relaxed">
            A közösségi energiamegosztás (community solar) keretein belül a megtermelt energia az
            egyéni lakásmérőkre is elosztható, ha a szabályozási keret ezt lehetővé teszi. Ehhez
            az elosztótársaság (ELMŰ, ÉMÁSZ, E.ON) hozzájárulása és külön mérési infrastruktúra szükséges.
            Ez az opció külön vizsgálatot igényel, de egyes régiókban már engedélyezett.
          </p>
        </section>

        {/* Megtérülés */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <TrendingDown size={20} className="text-emerald-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">A beruházás megtérülési ideje</h2>
          </div>
          <p className="leading-relaxed">
            A megtérülési idő a rendszer méretétől, a nettó elszámolás hiányától, az aktuális áramáraktól
            és az önfogyasztási aránytól függ. A 2024-es piaci körülmények között egy jól méretezett,
            80–90%-os önfogyasztási arányú rendszernél a megtérülés kb. <strong className="text-slate-900">7–10 év</strong>.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Rendszerméret</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Becsült beruházási költség</th>
                  <th className="px-4 py-3 text-left font-semibold text-brand-700">Éves megtakarítás</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Megtérülés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-900">10 kWp</td>
                  <td className="px-4 py-3 text-slate-600">3,5–4,5 M Ft</td>
                  <td className="px-4 py-3 font-semibold text-brand-700">450–600 ezer Ft</td>
                  <td className="px-4 py-3 text-slate-600">7–9 év</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">20 kWp</td>
                  <td className="px-4 py-3 text-slate-600">6–8 M Ft</td>
                  <td className="px-4 py-3 font-semibold text-brand-700">900 ezer–1,2 M Ft</td>
                  <td className="px-4 py-3 text-slate-600">7–8 év</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-900">30 kWp</td>
                  <td className="px-4 py-3 text-slate-600">9–12 M Ft</td>
                  <td className="px-4 py-3 font-semibold text-brand-700">1,3–1,8 M Ft</td>
                  <td className="px-4 py-3 text-slate-600">7–9 év</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Becsült értékek, 2024-es áramárakkal és 80% önfogyasztási aránnyal számolva. A tényleges
            megtérülés függ a helyi napsugárzástól, a kivitelező árajánlatától és az esetleges pályázati
            támogatásoktól.
          </p>
          <p className="leading-relaxed">
            Fontos kiemelni, hogy a napelemmodul gyártók általában <strong className="text-slate-900">25–30 éves teljesítménygaranciát</strong> vállalnak,
            ami azt jelenti, hogy a beruházás a megtérülési időn túl is folyamatosan termel — a 10.
            évtől a kb. 25. évig minden megterített energia tiszta megtakarítás. Emellett a napelemes
            épület energetikai tanúsítványa javul, ami az ingatlanok értékét is növeli — ez az eladásnál
            realizálható.
          </p>
        </section>

        {/* Közgyűlési szavazás */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <Vote size={20} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Közgyűlési szavazás menete</h2>
          </div>
          <p className="leading-relaxed">
            A napelemes beruházás elindításához elsőként a közgyűlési határozatot kell megszerezni. Az
            előterjesztést megteheti a közös képviselő, az intézőbizottság, vagy bármely olyan tulajdonos,
            aki a szükséges dokumentációt előkészítette. A sikeres szavazáshoz az alábbi előkészítő
            anyagok erősen ajánlottak:
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Legalább 3 összehasonlítható árajánlat</strong> különböző
                kivitelezőktől, azonos műszaki tartalommal (kWp, modul típus, inverter, garancia).
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Energetikai/pénzügyi megtérülési számítás</strong> a 12 havi
                közös áramfogyasztás alapján, önfogyasztási aránnyal és nettó jelenértékkel (NPV).
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Tűzvédelmi hatástanulmány</strong>, amely igazolja,
                hogy a telepítés megfelel az OTSZ előírásainak és a tűzoltók számára biztosított a
                tetőhozzáférés.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Finanszírozási javaslat</strong>: egyszeri befizetés
                a felújítási alapból, részletfizetéses banki hitel az épület nevére, vagy pályázati
                forrás igénybevétele. Az ellenszavazók szempontjából a részletfizetés enyhítheti az
                anyagi terhet.
              </span>
            </li>
          </ul>
          <p className="leading-relaxed">
            Az ellenszavazók érdekeinek kezelésekor kulcsfontosságú, hogy a határozat mellékletében
            rögzítsék a megtakarítások elosztásának módját (pl. a közös költség csökkentése arányosan)
            és azt, hogy az ellenszavazókat ugyanazok a megtakarítások illetik, mint a többi tulajdonost.
            Ez csökkenti a határozat bírósági megtámadásának esélyét.
          </p>
        </section>

        {/* Pályázatok */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
              <FileText size={20} className="text-teal-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Pályázatok és támogatások</h2>
          </div>
          <p className="leading-relaxed">
            A megfelelő pályázati forrás megtalálása drasztikusan csökkentheti a beruházási költséget,
            és akár 40–60%-os vissza nem térítendő támogatást is biztosíthat. Az alábbi forrásokat
            érdemes rendszeresen figyelni:
          </p>
          <div className="space-y-4">
            {TENDER_ITEMS.map((item) => (
              <div key={item.title} className="border-l-2 border-brand-300 pl-4">
                <p className="font-bold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="leading-relaxed">
            Pályázat esetén a közgyűlési határozatnak meg kell előznie a pályázat benyújtását — a
            döntéshozás tehát nem csúszhat. Fontos azt is tudni, hogy pályázati forrásból megvalósuló
            beruházásnál az áramszolgáltató csatlakozási engedélyének megszerzése is a pályázathoz
            csatolandó dokumentumok között szerepelhet — ezért érdemes ezt párhuzamosan kezelni.
          </p>
        </section>

        {/* Kivitelező és tanúsítványok */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <Shield size={20} className="text-slate-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Kivitelező választása és minőségi tanúsítványok</h2>
          </div>
          <p className="leading-relaxed">
            A piacon sajnálatos módon számos megkérdőjelezhető minőségű ajánlat kering. A társasházi
            beruházásnál különösen fontos a megfelelő kivitelező kiválasztása, mivel a rendszer
            meghibásodása nemcsak anyagi kárt okoz, hanem balesetveszélyt és jogi felelősséget is jelent.
          </p>
          <div className="space-y-4">
            {QUALITY_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="mb-1 font-bold text-slate-900">{item.title}</p>
                    <p className="text-sm leading-relaxed text-slate-500">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="leading-relaxed">
            Fontos szempontok a kivitelező értékelésekor: rendelkezik-e MAVIR regisztrációval (kötelező
            a hálózathoz csatlakozó rendszerekhez), milyen referenciamunkái vannak társasházi
            telepítésben, mennyi a garanciális szerviz-időn belüli reakcióideje, és biztosít-e
            teljesítménymonitoring-hozzáférést a megrendelőnek.
          </p>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-lg">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Building2 size={24} className="text-white" />
          </div>
          <h2 className="mb-2 text-2xl font-black text-white">
            Kezelje a napelemes beruházást digitálisan
          </h2>
          <p className="mb-6 text-brand-100">
            A PanelLakó hibabejelentő és dokumentumkezelő modulja segít a napelemes rendszer
            karbantartásának nyilvántartásában, a megújuló energiával kapcsolatos munkák
            koordinálásában és a közgyűlési döntések dokumentálásában.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-50"
          >
            <CheckCircle size={16} />
            Ingyenes regisztráció
          </Link>
        </div>

        {/* Jogi nyilatkozat */}
        <p className="mt-8 text-xs text-slate-400">
          Ez az oldal tájékoztató jellegű, és nem minősül jogi, pénzügyi vagy energetikai tanácsadásnak.
          Konkrét beruházás előtt forduljon engedélyes energetikai szakértőhöz, ügyvédhez és az illetékes
          áramszolgáltatóhoz.
        </p>

        {/* Back link */}
        <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
          <Link href="/zold-tarsashaz" className="flex items-center gap-1 hover:text-brand-600">
            ← Vissza: Zöld Társasház főoldal
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
