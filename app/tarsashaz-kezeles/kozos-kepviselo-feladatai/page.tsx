import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ChevronRight,
  Users,
  FileText,
  Calculator,
  Scale,
  MessageSquare,
  Clock,
  CheckCircle,
  ArrowRight,
  Building2,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'A közös képviselő feladatai 2025-ben — Jogszabályi kötelezettségek | PanelLakó',
  description:
    'Mik a közös képviselő feladatai a 2003. évi CXXXIII. törvény alapján? Adminisztratív, pénzügyi, jogi kötelezettségek és digitális megoldások összefoglalója.',
  alternates: { canonical: 'https://panellako.hu/tarsashaz-kezeles/kozos-kepviselo-feladatai' },
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
      name: 'Közös képviselő feladatai',
      item: 'https://panellako.hu/tarsashaz-kezeles/kozos-kepviselo-feladatai',
    },
  ],
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'A közös képviselő feladatai 2025-ben',
  description:
    'Mik a közös képviselő feladatai a 2003. évi CXXXIII. törvény alapján? Adminisztratív, pénzügyi, jogi kötelezettségek és digitális megoldások összefoglalója.',
  url: 'https://panellako.hu/tarsashaz-kezeles/kozos-kepviselo-feladatai',
  publisher: { '@type': 'Organization', name: 'PanelLakó', url: 'https://panellako.hu' },
  inLanguage: 'hu',
};

const DEADLINE_TABLE = [
  {
    irat: 'Éves pénzügyi elszámolás megküldése',
    hataridő: 'Tárgyévet követő év március 31.',
    jogszabaly: '2003. évi CXXXIII. tv. 24. §',
  },
  {
    irat: 'Rendes évi közgyűlés összehívása',
    hataridő: 'Legkésőbb tárgyév május 31.',
    jogszabaly: '2003. évi CXXXIII. tv. 40. §',
  },
  {
    irat: 'Közgyűlési meghívó kiküldése',
    hataridő: 'Legalább 8 nappal előbb',
    jogszabaly: '2003. évi CXXXIII. tv. 41. §',
  },
  {
    irat: 'Határozatkönyv vezetése',
    hataridő: 'Folyamatos / közgyűlés után azonnal',
    jogszabaly: '2003. évi CXXXIII. tv. 33. §',
  },
  {
    irat: 'Biztosítási szerződés megkötése / megújítása',
    hataridő: 'Lejárat előtt legalább 30 nap',
    jogszabaly: '2003. évi CXXXIII. tv. 27. §',
  },
  {
    irat: 'Fizetési felszólítás hátralékos felé',
    hataridő: 'Esedékesség napján vagy következő munkanapon',
    jogszabaly: '2003. évi CXXXIII. tv. 24/A. §',
  },
  {
    irat: 'Kötelező karbantartási napló frissítése',
    hataridő: 'Elvégzett munkát követő 5 munkanapon belül',
    jogszabaly: 'Épületüzemeltetési szabályok',
  },
];

export default function KozosKepviseloFeladataiPage() {
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
          <span className="font-medium text-slate-600">Közös képviselő feladatai</span>
        </nav>

        {/* Hero */}
        <div className="mb-12">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <Users size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            A közös képviselő feladatai 2025-ben
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            A 2003. évi CXXXIII. törvény (társasháztörvény) részletesen szabályozza, hogy egy közös képviselő
            milyen feladatokat köteles ellátni. Ez a cikk összefoglalja az összes kötelezettséget —
            adminisztratív, pénzügyi, jogi és kommunikációs szempontból egyaránt.
          </p>
        </div>

        {/* Ki lehet közös képviselő */}
        <section className="mb-12 space-y-4 text-slate-600">
          <h2 className="text-2xl font-black text-slate-900">Ki lehet közös képviselő?</h2>
          <p className="leading-relaxed">
            A társasháztörvény szerint közös képviselő lehet természetes személy — akár lakástulajdonos,
            akár kívülálló — vagy gazdasági társaság. A megválasztáshoz a közgyűlés egyszerű szótöbbségi
            határozata szükséges (az összes tulajdoni hányadhoz viszonyítva több mint 50%). A megbízatás
            határozott vagy határozatlan időre szólhat, ezt az SZMSZ-ben kell rögzíteni.
          </p>
          <p className="leading-relaxed">
            A közös képviselő jogállása sajátos: nem munkaviszonyban, hanem megbízási jogviszonyban áll
            a társasházzal. Ennek fontos következménye, hogy a képviselő nem jogosult automatikusan
            munkavállalói juttatásokra, de a megbízási díja adóköteles jövedelem. A polgári törvénykönyv
            megbízásra vonatkozó szabályait (Ptk. 6:272–6:280. §) kell alkalmazni, kiegészítve a
            társasháztörvény speciális rendelkezéseivel.
          </p>
          <p className="leading-relaxed">
            Fontos hangsúlyozni, hogy a közös képviselőre komoly felelősség hárul: a gondatlan vagy
            szándékos kötelezettségszegésből eredő károkért személyesen felel a tulajdonosok felé.
            Ezért a feladatkör alapos ismerete és szisztematikus dokumentálása nem csupán adminisztratív
            kötelezettség, hanem a képviselő saját érdeke is.
          </p>
        </section>

        {/* Adminisztratív feladatok */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <FolderOpen size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Adminisztratív feladatok</h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              A közös képviselő adminisztratív kötelezettségei a tulajdonosi nyilvántartástól a határozatkönyv
              vezetéséig terjednek. A törvény előírja a lakástulajdonosok és bérlők naprakész nyilvántartását
              (névsor, elérhetőségek, tulajdoni hányadok), amelyet az ingatlan-nyilvántartással összhangban
              kell vezetni.
            </p>
            <p className="leading-relaxed">
              A határozatkönyv a közgyűlési döntések hivatalos nyilvántartása. Minden elfogadott határozatot
              sorszámmal, dátummal és a szavazati arányok feltüntetésével kell bejegyezni. A határozatkönyvet
              bármely tulajdonos betekintheti — a közös képviselő köteles azt hozzáférhetővé tenni.
            </p>
            <p className="leading-relaxed">
              A levelezés kezelése szintén kritikus feladat: a hatóságoktól érkező leveleket, fizetési
              meghagyásokat, bírósági dokumentumokat haladéktalanul feldolgozni és archiválni kell.
              A postai kézbesítési vélelem szabályai (Ptk. 6:6. §) a társasházi levelezésre is vonatkoznak,
              ezért az igazolható kézbesítés (tértivevény, e-mail visszaigazolás) kiemelt fontosságú.
            </p>
            <ul className="list-inside space-y-2 text-sm">
              {[
                'Tulajdonosi és bérlői nyilvántartás naprakészen tartása',
                'Határozatkönyv folyamatos vezetése (minden közgyűlés után)',
                'Szerződések, biztosítások, megállapodások archiválása',
                'Épület-karbantartási napló és meghibásodási előzmények dokumentálása',
                'Beérkező levelek és hatósági iratok kezelése, iktatása',
                'Éves összesítő jelentés elkészítése a tulajdonosok részére',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle size={15} className="mt-0.5 shrink-0 text-brand-500" />
                  <span className="text-slate-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pénzügyi feladatok */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Calculator size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Pénzügyi feladatok</h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              A közös képviselő legterjedelmesebb és legtöbb hibalehetőséget rejtő feladata a pénzügyek
              kezelése. A közös költség szedése, a felújítási alap gyűjtése, a számlák kifizetése és az
              éves elszámolás elkészítése együttesen alkotják a pénzügyi kötelezettségek körét.
            </p>
            <p className="leading-relaxed">
              A közös költség mértékét a közgyűlés határozza meg az éves köllségvetés elfogadásával.
              A közös képviselő köteles a tulajdonosokat a havi fizetési kötelezettségről írásban
              értesíteni, és a beérkező összegeket elkülönítetten kezelni. A törvény kifejezetten
              tiltja a közös alapok és a képviselő saját vagyonának összeolvadását — az elkülönített
              bankszámla kötelező.
            </p>
            <p className="leading-relaxed">
              Az éves elszámolást — bevételek, kiadások, egyenleg, felújítási alap állása — minden
              évben el kell készíteni és a közgyűlés elé kell tárni. Az elszámolást tárgyévet követő
              március 31-ig meg kell küldeni minden tulajdonosnak. A könyvelővel való kapcsolattartás,
              a számlák és bizonylatok átadása szintén a képviselő feladata.
            </p>
            <p className="leading-relaxed">
              A díjhátralékosok kezelése egyre nagyobb terhet jelent. A közös képviselő köteles
              a hátralékos tulajdonost felszólítani, és szükség esetén fizetési meghagyásos eljárást
              kezdeményezni közjegyzőnél. A törvény lehetővé teszi zálogjog bejegyeztetését az adós
              ingatlanára, ha a hátralék meghaladja a hat havi közös költség összegét.
            </p>
          </div>
        </section>

        {/* Jogi és hatósági feladatok */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Scale size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Jogi és hatósági feladatok</h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              A közös képviselő törvényes képviselője a társasháznak harmadik felekkel szemben —
              hatóságokkal, vállalkozókkal, bíróságokkal. Ez azt jelenti, hogy nevét és aláírását
              kérik szerződéseknél, hatósági bejelentésnél, tűzvédelmi és energetikai nyilatkozatoknál.
            </p>
            <p className="leading-relaxed">
              Az épület műszaki állapotával kapcsolatos kötelezettségek közé tartozik az épületgépészeti
              vizsgálatok megszervezése, a kéményseprői ellenőrzés koordinálása, a lift éves
              biztonsági felülvizsgálatának biztosítása és az eredmények dokumentálása. Tűzvédelmi
              szempontból a közös képviselő felelős a tűzoltó készülékek érvényes karbantartásáért.
            </p>
            <p className="leading-relaxed">
              A GDPR (679/2016/EU rendelet) értelmében a társasház adatkezelőnek minősül, és a
              közös képviselő mint képviseletért felelős személy köteles gondoskodni az adatkezelési
              tájékoztató elkészítéséről, a kamerák üzemeltetésének szabályszerűségéről, és a
              tulajdonosi adatok biztonságos tárolásáról.
            </p>
            <ul className="list-inside space-y-2 text-sm">
              {[
                'Társasház képviselete bírósági és hatósági eljárásokban',
                'Szerződések megkötése és aláírása (vállalkozók, szolgáltatók)',
                'Épület-energetikai tanúsítvánnyal kapcsolatos kötelezettségek',
                'Lift, gáz- és villamos berendezések éves felülvizsgálatának szervezése',
                'GDPR adatkezelési tájékoztató biztosítása a tulajdonosok felé',
                'Káresemény esetén biztosítóval való egyeztetés és kárbejelentés',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle size={15} className="mt-0.5 shrink-0 text-brand-500" />
                  <span className="text-slate-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Kommunikációs feladatok */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <MessageSquare size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Kommunikációs feladatok</h2>
          </div>
          <div className="space-y-4 text-slate-600">
            <p className="leading-relaxed">
              A kommunikáció a közös képviselő munkájának egyik legidőigényesebb vetülete. Egy 40 lakásos
              társasházban akár 40 különböző személyiségű, elvárású és elérhetőségű tulajdonossal kell
              rendszeres kapcsolatot tartani — és ez a szám a bérlőkkel együtt akár a kétszerese is lehet.
            </p>
            <p className="leading-relaxed">
              A törvény előírja, hogy a közgyűlési meghívót igazolható módon kell kézbesíteni minden
              tulajdonos részére legalább 8 nappal az ülés előtt. Az igazolható kézbesítés hagyományosan
              tértivevényes postai küldeményt jelent, de az SZMSZ lehetővé teheti az elektronikus kézbesítést
              is — feltéve, hogy a tulajdonos ehhez előzetesen hozzájárult.
            </p>
            <p className="leading-relaxed">
              A határozatokat a közgyűlés után haladéktalanul, de legkésőbb 30 napon belül közzé kell
              tenni a hirdetőtáblán vagy a törvény által elfogadott egyéb módon. Az értesítők,
              fizetési felszólítások, karbantartási bejelentések és rendellenességekről szóló tájékoztatók
              kezelése szintén a képviselő felelőssége.
            </p>
            <p className="leading-relaxed">
              A lakókkal való egyéni kommunikáció — panaszok kezelése, kérdések megválaszolása, vitás
              helyzetek kezelése — informálisan zajlik, de különösen fontos, hogy a képviselő ezeket
              dokumentálja. Egy nem rögzített szóbeli megállapodás később komoly konfliktus forrásává
              válhat.
            </p>
          </div>
        </section>

        {/* Határidők táblázat */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Clock size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Kötelező iratkezelési határidők</h2>
          </div>
          <p className="mb-5 leading-relaxed text-slate-500">
            Az alábbi táblázat a leggyakoribb határidőket foglalja össze. Az egyes törvényi rendelkezések
            eltérő határidőket szabhatnak meg, ezért minden esetben olvassa el az eredeti jogszabályszöveget.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-bold text-slate-700">Irat / feladat</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-700">Határidő</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-700">Jogszabály</th>
                </tr>
              </thead>
              <tbody>
                {DEADLINE_TABLE.map((row, i) => (
                  <tr
                    key={row.irat}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{row.irat}</td>
                    <td className="px-4 py-3 text-slate-600">{row.hataridő}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{row.jogszabaly}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Tájékoztató jellegű összefoglaló — nem minősül jogi tanácsadásnak. Mindig ellenőrizze a
            hatályos jogszabályszöveget.
          </p>
        </section>

        {/* Digitális megoldások */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Building2 size={18} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Digitális megoldások a közös képviselőknek
            </h2>
          </div>
          <p className="leading-relaxed">
            A felsorolt kötelezettségek egyértelműen jelzik, hogy a közös képviselői feladat egy
            mindenki szempontjából komoly igényű, sokféle szaktudást feltételező munka. A hagyományos
            papíralapú vagy szétszórt digitális (e-mail + táblázat + pendrive) megközelítés egyre
            kevésbé fenntartható — különösen, hogy a jogszabály változásai (digitális közgyűlés,
            GDPR) új elvárásokat hoztak magukkal.
          </p>
          <p className="leading-relaxed">
            A PanelLakó digitális platform minden kötelezettségterületre kínál megoldást: a
            dokumentumtár a jogszabályban meghatározott iratőrzési követelményekre épül, a közgyűlési
            modul a 2021. évi CXLIII. tv. keretrendszerét követi, a pénzügyi nyilvántartás a közös
            költség elszámolás és a hátralékkövetés feladatait egységes felületen kezeli.
          </p>
          <p className="leading-relaxed">
            A rendszer automatikus emlékeztetőket küld a közelgő határidőkre (közgyűlés, éves
            elszámolás, biztonsági felülvizsgálatok), és minden kommunikációs eseményt (értesítők
            kiküldése, meghívók kézbesítése) naplóz — így a közös képviselő bármikor igazolni tudja
            kötelezettségei teljesítését.
          </p>
          <div className="mt-2">
            <Link
              href="/funkciok"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Ismerje meg a PanelLakó funkcióit <ArrowRight size={14} />
            </Link>
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
            Próbálja ki a PanelLakót ingyen
          </h2>
          <p className="mb-6 text-brand-100">
            14 napos ingyenes próba, bankkártya nélkül. Importálja a társasháza adatait és fedezze
            fel, hogyan csökkentheti a közös képviselői adminisztráció terhét.
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
