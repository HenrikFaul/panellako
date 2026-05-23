import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Users,
  AlertTriangle,
  ChevronRight,
  CheckCircle,
  Volume2,
  Home,
  Building2,
  ArrowRight,
  FileText,
  Shield,
  Flame,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Szomszédjog Társasházban — Zajos Szomszéd, Felújítás, Albérlet Szabályozás | PanelLakó',
  description:
    'Szomszédjogi kérdések társasházban: hangos szomszéd jogi kezelése, felújítási munkák korlátai, albérlet-adás szabályozása az SZMSZ-ben — Ptk. és Ttv. alapján.',
  alternates: { canonical: 'https://panellako.hu/tarsashazi-jog/szomszed-jog-tarsashazban' },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Szomszédjog társasházban — mit tehetünk a problémás szomszéddal?',
  description:
    'Szomszédjogi kérdések társasházban: hangos szomszéd, felújítási munkák, albérlet-adás, kisállat-tartás, dohányzás és kárfelelősség.',
  url: 'https://panellako.hu/tarsashazi-jog/szomszed-jog-tarsashazban',
  inLanguage: 'hu',
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
      name: 'Társasházi Jog',
      item: 'https://panellako.hu/tarsashazi-jog',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Szomszédjog Társasházban',
      item: 'https://panellako.hu/tarsashazi-jog/szomszed-jog-tarsashazban',
    },
  ],
};

export default function SzomszedJogTarsashazbanPage() {
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
          <Link href="/tarsashazi-jog" className="hover:text-slate-600">
            Társasházi Jog
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-600">Szomszédjog Társasházban</span>
        </nav>

        {/* Hero */}
        <div className="mb-10">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <Users size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Szomszédjog társasházban — mit tehetünk a problémás szomszéddal?
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            A hangos szomszéd, az éjszakai felújítási munkák, a dohányzás a lépcsőházban és a
            szabályozatlan albérlet-kiadás a leggyakoribb konfliktusok forrása a magyar társasházakban.
            Cikkünkben összefoglaljuk, mit mond a Polgári Törvénykönyv és a Társasházi törvény, és
            mit tehet az SZMSZ a szomszédjogi kérdések rendezésére.
          </p>
        </div>

        {/* Mi a szomszédjog */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <Home size={20} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Mi a szomszédjog?</h2>
          </div>
          <p className="leading-relaxed">
            A szomszédjog alapszabályát a <strong className="text-slate-900">2013. évi V. törvény
            (Ptk.) 5:23. §-a</strong> tartalmazza: a tulajdonos köteles tartózkodni minden olyan
            magatartástól, amely szomszédjait szükségtelenül zavarná, vagy amellyel szomszédai
            ingatlanhasználatát korlátoznák. A zavarás tipikus formái a törvény szerint: szag,
            zaj, vibráció, por, füst, hő és más hasonló hatások.
          </p>
          <p className="leading-relaxed">
            A szomszédjog nem csak szomszédos telkek tulajdonosaira vonatkozik — a
            <strong className="text-slate-900"> társasházon belüli szomszédokra is teljes körűen
            alkalmazandó</strong>. Az emeletről lehallatszó lépések, az újjáépítési munkák pora,
            vagy a főzéskor keletkező szag, amely a szomszéd lakásába áramlik — mind szomszédjogi
            szempontból értékelendő magatartások. A Ptk.-beli alapszabályt a Társasházi törvény
            (2003. évi CXXXIII. tv.) és az SZMSZ tovább pontosíthatja a társasházon belüli
            viszonyokra.
          </p>
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
            <p className="mb-2 font-bold text-slate-900">A „szükségtelen zavarás" mércéje</p>
            <p className="text-sm leading-relaxed text-slate-600">
              A Ptk. nem tiltja a zavarást általában — csak a <em>szükségtelent</em>. Az együttélés
              szükségszerű kellemetlenségeit tűrni kell (pl. egy rövid ideig tartó, nappali időben
              végzett felújítás). A bíróság az adott körülmények összességét mérlegeli: az intenzitást,
              az időtartamot, a napszakot és a szomszéd érzékenységét egyaránt figyelembe veszi.
            </p>
          </div>
        </section>

        {/* Hangos szomszéd */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
              <Volume2 size={20} className="text-orange-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Hangos szomszéd — jogi lehetőségek</h2>
          </div>
          <p className="leading-relaxed">
            A zajvédelemre vonatkozó részletes szabályokat a{' '}
            <strong className="text-slate-900">284/2007. (X. 29.) Korm. rendelet</strong> tartalmazza.
            A rendelet zajhatárértékeket állapít meg lakóterületekre: lakóövezeti épületben éjszaka
            (22:00–06:00 h) az engedélyezett egyenértékű zajszint 35–40 dB(A), nappal 45–50 dB(A).
            Ezeket a határértékeket a saját lakáson belüli hangok — ha áttörnek a szomszéd lakásába —
            is meghaladhatják.
          </p>
          <p className="leading-relaxed">
            Fontos különbség: a <strong className="text-slate-900">saját lakáson belül maradó hang</strong> (pl.
            TV a szobában, amelyet kizárólag az adott lakásban hallani) szomszédjogi szempontból
            nem minősül zavarásnak. Az a hang a releváns, amely a lépcsőházon, mennyezeten, padlón
            vagy falakon átterjedve a szomszéd lakásában is hallható.
          </p>
          <p className="mb-3 font-semibold text-slate-900">Javasolt lépések hangos szomszéd esetén:</p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-black text-brand-700">
                1
              </span>
              <span>
                <strong className="text-slate-900">Közvetlen figyelmeztetés:</strong> először barátságos,
                közvetlen megkeresés a szomszéddal. Sok esetben nem tudja, hogy zavar — és ez a
                leggyorsabb megoldás.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-black text-brand-700">
                2
              </span>
              <span>
                <strong className="text-slate-900">Közös képviselő értesítése:</strong> a közös képviselő
                felhívhatja a zavarást okozó tulajdonost a magatartás abbahagyására — ez nem jogi
                lépés, de hatásos lehet, mert az SZMSZ-en alapuló kötelezettségre hívja fel a figyelmet.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-black text-brand-700">
                3
              </span>
              <span>
                <strong className="text-slate-900">Önkormányzati zajvédelmi hatóság:</strong> a helyi
                önkormányzat környezetvédelmi hatósága eljárhat a 284/2007. Korm. rendelet alapján,
                és zajmérést rendelhet el, bírságot szabhat ki.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-black text-brand-700">
                4
              </span>
              <span>
                <strong className="text-slate-900">Bírósági per:</strong> tartós, súlyos zavarás esetén
                a Ptk. 5:23. § alapján kérhető a zavarás abbahagyása és kártérítés is. A per utolsó
                eszköz — hosszadalmas és költséges, de hatékony, ha az összes többi lépés meghiúsult.
              </span>
            </li>
          </ul>
        </section>

        {/* Felújítási munkák */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-50">
              <Building2 size={20} className="text-yellow-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Felújítási munkák korlátozása</h2>
          </div>
          <p className="leading-relaxed">
            A lakáson belüli felújítási munkák végzésének ideje részben jogszabályban, részben az
            SZMSZ-ben szabályozható. Az általános főszabály szerint
            <strong className="text-slate-900"> hangos munkák (kalapálás, fúrás, vágás) hétköznapokon
            8:00–20:00 óra között</strong> végezhetők. Az SZMSZ azonban ezt tovább szűkítheti —
            például 9:00–18:00-ra, vagy megtilthatja hétvégi munkavégzést.
          </p>
          <p className="leading-relaxed">
            A felújítás megkezdése előtt <strong className="text-slate-900">célszerű értesíteni a
            szomszédokat</strong> (különösen a szomszéd alatti-feletti lakásokat), megjelölve a munka
            várható idejét és jellegét. Ez nem kötelező jogi lépés, de megelőzheti a konfliktust,
            és igazolja a jóhiszeműséget, ha mégis vita merülne fel.
          </p>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <p className="mb-1 font-bold text-slate-900">Kártérítési felelősség a felújítás során</p>
                <p className="text-sm leading-relaxed text-slate-600">
                  Ha a felújítás során a szomszéd lakásában kár keletkezik — például por, nedvesség
                  vagy vibráció miatt —, a kár megtérítéséért a felújítást végző tulajdonos felel
                  (Ptk. 6:519. §). A kár igazolásához célszerű a szomszéd lakásáról fotódokumentációt
                  készíteni a munkák megkezdése előtt és után.
                </p>
              </div>
            </div>
          </div>
          <p className="leading-relaxed">
            Különösen fontos esetekben — például vízvezeték-csere, falszakítás, padlócserénél
            keletkező vibráció — érdemes közjegyző előtt rögzíteni az állapotot, hogy vitatott
            kártérítési igény esetén rendelkezésre álljon a bizonyíték.
          </p>
        </section>

        {/* Albérlet-adás */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <FileText size={20} className="text-indigo-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Albérlet-adás szabályozása az SZMSZ-ben
            </h2>
          </div>
          <p className="leading-relaxed">
            A lakástulajdonos jogosult albérletbe adni a lakását — ez a tulajdonjog részeként alkotmányosan
            védett jog. Az SZMSZ azonban <strong className="text-slate-900">eljárási szabályokat és
            feltételeket írhat elő</strong> az albérlet-adáshoz anélkül, hogy azt tiltaná.
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Bejelentési kötelezettség:</strong> az SZMSZ előírhatja,
                hogy a tulajdonos köteles bejelenteni az albérlő nevét és elérhetőségét a közös
                képviselőnek, valamint azt, hogy az albérlő megkapta az SZMSZ-t és elfogadja annak
                rendelkezéseit.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Minimális bérleti idő:</strong> egyes SZMSZ-ek
                meghatározzák a minimális bérleti időt (pl. legalább 30 nap), amellyel a rövid távú
                turisztikai célú bérbeadást (Airbnb-típusú kiadás) korlátozzák.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Airbnb-kérdés:</strong> a rövid távú bérbeadás
                lakóövezetben engedélyköteles lehet (helyi rendelet alapján), és az SZMSZ-ben szabályozható,
                hogy a lakás rendeltetésszerű (lakóövezeti) célra használandó. A tulajdonos felel
                az albérlő SZMSZ-sértő magatartásáért is — ez különösen lényeges turisztikai
                bérbeadásnál.
              </span>
            </li>
          </ul>
          <p className="leading-relaxed">
            Az SZMSZ által előírt bejelentési kötelezettség elmulasztása esetén a közös képviselő
            felszólíthatja a tulajdonost a pótlásra, és ismételt mulasztás esetén a bíróság útján is
            kikényszeríthető a kötelezettség teljesítése.
          </p>
        </section>

        {/* Kisállat tartás */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <Shield size={20} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Kisállat tartás</h2>
          </div>
          <p className="leading-relaxed">
            A kisállat tartásának kérdése az egyik legtöbb vitát generáló terület a társasházakban.
            A jogi keretrendszer két szinten érvényesül:
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Saját lakásban való tartás:</strong> a tulajdonos
                a kizárólagos tulajdonát képező lakásban tarthat kisállatot — ez a tulajdonjog
                részét képezi, és az SZMSZ ezt teljesen nem tilthatja meg. Ugyanakkor ha a kisállat
                szaga, hangja vagy más hatása szomszédjogi sérelmet okoz, a Ptk. 5:23. §-a alapján
                igény érvényesíthető.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Közös területeken:</strong> az SZMSZ részletesen
                szabályozhatja a kisállatok közös területen való tartózkodását. Tipikus rendelkezések:
                póráz és szájkosár kötelező a lépcsőházban, liften tilos kisállatot szállítani,
                az udvarban meghatározott területen tartózkodhat az állat.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Létszámkorlátozás:</strong> az SZMSZ előírhatja
                a tartható kisállatok maximális számát (pl. legfeljebb 1 kutya és 1 macska) és
                méretét. Ez az előírás jogszerű, ha arányos célt — a szomszédok zavarásának
                megelőzését — szolgál.
              </span>
            </li>
          </ul>
        </section>

        {/* Dohányzás */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <Flame size={20} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Dohányzás a közös területeken</h2>
          </div>
          <p className="leading-relaxed">
            A <strong className="text-slate-900">2011. évi CLIII. törvény (dohányzást korlátozó tv.)</strong> alapján
            a társasházi lépcsőházon, folyosókon és más zárt közös területeken a dohányzás törvényi
            alapon tilos — az SZMSZ-nek ezt nem is szükséges külön rögzítenie, a tilalom
            automatikusan fennáll.
          </p>
          <p className="leading-relaxed">
            Az erkélyen és a teraszon való dohányzás kérdése összetettebb:
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Törvényi tiltás nincs:</strong> az erkélyre és
                teraszra — amelyek a kizárólagos tulajdon részei — a dohányzást korlátozó törvény
                nem terjed ki automatikusan.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">SZMSZ-szel szabályozható:</strong> a közgyűlés
                minősített (2/3-os) szótöbbséggel az SZMSZ-be foglalhatja az erkélyen való dohányzás
                tilalmát vagy korlátozását (pl. csak 22:00 előtt, csak meghatározott szélirányban).
                Ilyen SZMSZ-rendelkezés érvényesen korlátozhatja a saját erkélyen való dohányzást is.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">SZMSZ nélkül:</strong> ha nincs ilyen SZMSZ-rendelkezés,
                az erkélyen dohányzó szomszéd ellen csak akkor léphet fel eredményesen valaki, ha
                bizonyítható, hogy a füst szomszédjogi sérelmet okoz (Ptk. 5:23. §) — pl. a füst
                a szomszéd ablakán rendszeresen beáramlik.
              </span>
            </li>
          </ul>
        </section>

        {/* Kár okozása a szomszédnak */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50">
              <AlertTriangle size={20} className="text-rose-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Kár okozása a szomszédnak</h2>
          </div>
          <p className="leading-relaxed">
            Ha az egyik lakásban keletkező esemény — például csőtörés, beázás vagy tűz — átterjedő
            kárt okoz a szomszéd lakásában, a kártérítési felelősség a{' '}
            <strong className="text-slate-900">Ptk. 6:519. §-a</strong> alapján fennáll. A felelősség
            kimenthető, ha a tulajdonos igazolja, hogy a kárt elháríthatatlan külső ok okozta — ez a
            gyakorlatban rendkívül nehéz bizonyítani.
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
              <span>
                <strong className="text-slate-900">Beázás, csőtörés:</strong> ha a felső lakásban
                törött egy cső és az alatta lévő lakásban kár keletkezett, a felső lakás tulajdonosa
                felel — kivéve ha a csőtörés a közös vízvezetékhálózatban következett be, mert
                ekkor a társasház a felelős kármegtérítésre.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
              <span>
                <strong className="text-slate-900">Tűzkár terjedése:</strong> ha az egyik lakásban
                keletkező tűz átterjed a szomszéd lakásába, a tüzet okozó tulajdonos kártérítési
                felelőssége fennáll, amennyiben gondatlanság igazolható.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Lakásbiztosítás szerepe:</strong> lakástulajdonosi
                felelősség-biztosítás vagy lakásbiztosítás fedezheti a szomszéd lakásában okozott
                károkat is. Célszerű ellenőrizni a biztosítási kötvény feltételeit — és ha nincs
                ilyen fedezet, ajánlott kötni.
              </span>
            </li>
          </ul>
          <p className="leading-relaxed">
            A kár bekövetkezésekor a legfontosabb teendő az azonnali fotódokumentáció, a biztosítónak
            való gyors bejelentés (általában 48–72 órás határidő), és lehetőség szerint a kár
            forrásának minél korábbi megakadályozása (pl. vízelzárás csőtörésnél).
          </p>
        </section>

        {/* CTA blocks */}
        <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 px-8 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="mb-1 text-lg font-black text-slate-900">
                Zajpanasz intézése társasházban
              </h2>
              <p className="text-sm text-slate-500">
                Budapest zajszennyezési térképe és a zajpanasz benyújtásának menete.
              </p>
            </div>
            <Link
              href="/zajszennyezes-budapest/tarsashazi-zaj-panasz"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-brand-300 bg-white px-5 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-100"
            >
              Zajpanasz útmutató <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="mb-16 rounded-2xl border border-slate-200 bg-slate-50 px-8 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="mb-1 text-lg font-black text-slate-900">Társasházi jog — pillar oldal</h2>
              <p className="text-sm text-slate-500">
                A 2003. évi CXXXIII. tv. és a Ptk. alapvető rendelkezéseinek áttekintése.
              </p>
            </div>
            <Link
              href="/tarsashazi-jog"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition-all hover:bg-slate-100"
            >
              Társasházi jog <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-lg">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Building2 size={24} className="text-white" />
          </div>
          <h2 className="mb-2 text-2xl font-black text-white">
            Rendezze a társasházi szabályokat digitálisan
          </h2>
          <p className="mb-6 text-brand-100">
            Az SZMSZ, a határozatkönyv és a lakói kommunikáció egy helyen — a PanelLakó platformon.
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
