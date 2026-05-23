import type { Metadata } from 'next';
import type { Route } from 'next';
import Link from 'next/link';
import {
  Scale,
  ChevronRight,
  FileText,
  Users,
  Vote,
  AlertTriangle,
  CheckCircle,
  Building2,
  Smartphone,
  ArrowRight,
  BookOpen,
  Shield,
  Gavel,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Magyar Társasházi Jog — 2003. évi CXXXIII. tv. | PanelLakó',
  description:
    'A 2003. évi CXXXIII. törvény (Társasházi törvény) értelmezése gyakorlatban: közös tulajdon, közgyűlés szabályai, SZMSZ, közös képviselő jogállása, jogi viták.',
  alternates: { canonical: 'https://panellako.hu/tarsashazi-jog' },
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
  ],
};

const PILLAR_ARTICLES = [
  {
    href: '/tarsashazi-jog/kozgyulesi-hatarozat-megtamadasa',
    icon: Gavel,
    title: 'Közgyűlési határozat megtámadása',
    summary:
      'A 30 napos keresetindítási határidő, a jogalap meghatározása, a bíróság hatásköre és a megtámadás várható eredménye.',
  },
  {
    href: '/tarsashazi-jog/szomszed-jog-tarsashazban',
    icon: Users,
    title: 'Szomszédjogi kérdések',
    summary:
      'Zajos szomszéd, dohányzás a lépcsőházban, albérleti viták, kutyatartás — az SZMSZ-ben szabályozható és a törvény által rendezett esetek.',
  },
  {
    href: '/tarsashazi-jog/alapito-okirat-modositasa',
    icon: FileText,
    title: 'Alapító okirat módosítása',
    summary:
      'Mikor és hogyan kell módosítani az alapító okiratot, ki jogosult kezdeményezni, és milyen eljárást kell lefolytatni a változtatáshoz.',
  },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Hogyan támadható meg egy közgyűlési határozat?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A 2003. évi CXXXIII. törvény 42. §-a alapján a határozat ellen bírósághoz lehet fordulni a hozatalától számított 60 napon belül. A bíróság semmissé nyilváníthatja, megváltoztathatja vagy helybenhagyhatja a határozatot.',
      },
    },
    {
      '@type': 'Question',
      name: 'Milyen szabályok vonatkoznak a szomszédjogra társasházban?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A szomszédjog alapja a Ptk. és a társasháztörvény. Felső szomszéd vízkár esetén a felelősség a víz forrásától függ. Az állandó zajterhelés esetén polgári per is indítható szomszéd ellen kártérítés iránt.',
      },
    },
    {
      '@type': 'Question',
      name: 'Mikor és hogyan módosítható az alapító okirat?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Az alapító okirat módosításához egyhangú közgyűlési szavazat szükséges. A módosítást ügyvédnek kell ellenjegyeznie, és az ingatlan-nyilvántartásba kell bejegyeztetni.',
      },
    },
  ],
};

export default function TarsashaziJogPillarPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <PublicNav />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Breadcrumb */}
        <nav aria-label="Navigáció" className="mb-8 flex items-center gap-1.5 text-sm text-slate-400">
          <Link href="/" className="hover:text-slate-600">
            Főoldal
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-600">Társasházi Jog</span>
        </nav>

        {/* Hero */}
        <div className="mb-14 animate-fade-in-up">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <Scale size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Magyar társasházi jog — a 2003. évi CXXXIII. törvény gyakorlatban
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            A 2003. évi CXXXIII. törvény (Tht.) az elsődleges jogforrás minden magyarországi társasház
            számára. A törvény hét fejezetre tagolódik: alapítás, a közös tulajdon, a tulajdonostársak
            jogai és kötelezettségei, a szervezeti és működési szabályzat, a közgyűlés és a közös képviselő,
            az elszámolás, valamint a jogi viták rendezése. A 2021. évi CXLIII. törvény lényeges módosításokat
            hozott a digitális közgyűlés és az elektronikus szavazás terén, a 2023-as novella pedig pontosította
            a közös képviselő felelősségi szabályait és a díjhátralékos eljárás egyes lépéseit.
          </p>
        </div>

        {/* Article cards */}
        <section className="mb-16">
          <h2 className="mb-2 text-2xl font-black text-slate-900">Részletes témakörök</h2>
          <p className="mb-7 text-slate-500">
            Az alábbi cikkek mélyebb jogi elemzést nyújtanak a leggyakrabban felmerülő kérdésekről.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PILLAR_ARTICLES.map((article) => {
              const Icon = article.icon;
              return (
                <Link
                  key={article.href}
                  href={article.href as Route}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 transition-colors group-hover:bg-brand-100">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <p className="mb-1.5 font-bold text-slate-900 group-hover:text-brand-700">{article.title}</p>
                  <p className="flex-1 text-sm leading-relaxed text-slate-500">{article.summary}</p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-brand-600">
                    Olvasom <ArrowRight size={12} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Közös tulajdon fogalma */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <Building2 size={20} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">A közös tulajdon fogalma</h2>
          </div>
          <p className="leading-relaxed">
            A 2003. évi CXXXIII. törvény 3. §-a szerint a társasházi közös tulajdon magában foglalja
            mindazokat az ingatlanrészeket, amelyek nem tartoznak kizárólagos tulajdonba. A törvény
            felsorolásszerűen meghatározza a jellemzően közös részeket: a telek, a lépcsőház, a folyosók,
            a lift és gépháza, a közös tető (tetőtér, ha nem önálló lakásegység), a pince, a közös
            vízvezeték- és fűtéshálózat, a közös elektromos fővezeték, a kapualj, és az udvar.
          </p>
          <p className="leading-relaxed">
            A kizárólagos tulajdon ezzel szemben az egyes lakások, illetve nem lakás célú helyiségek
            (bolt, iroda, garázs) belső tere, beleértve az ezekhez tartozó erkélyt és terraszt is —
            ezek jogi helyzetéről a törvény 4. §-a rendelkezik. Fontos kivétel: az erkély és a terasz
            külső felülete, az azzal összefüggő szigetelés és a homlokzat közös tulajdon marad, még ha
            a belső tér kizárólagos tulajdon is. Ezért az erkélyek külső festése, a homlokzat
            módosítása vagy a szigetelés javítása nem a lakástulajdonos egyéni joga, hanem közgyűlési
            döntést igénylő közös ügy.
          </p>
          <p className="leading-relaxed">
            A közös tulajdon hányadát (eszmei hányad) az alapító okirat tartalmazza, és ez alapján
            számítják a szavazati jogot a közgyűlésen, valamint a közös költség megosztását. Az eszmei
            hányad módosítása csak az alapító okirat módosításával lehetséges, amelyhez a törvény a
            4/5-ös (80%-os) minősített többséget írja elő.
          </p>
        </section>

        {/* Közgyűlés szabályai */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <Vote size={20} className="text-indigo-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">A közgyűlés szabályai</h2>
          </div>
          <p className="leading-relaxed">
            A közgyűlés a társasház legfőbb döntéshozó szerve (2003. évi CXXXIII. tv. 19–28. §).
            Évente legalább egyszer össze kell hívni — a rendes éves közgyűlést általában az előző év
            elszámolásának elfogadása és a tárgyévi költségvetés meghatározása céljából tartják. A
            meghívót — amely tartalmazza a napirendi pontokat, a napot, az időpontot és a helyszínt —
            legalább 8 nappal a közgyűlés előtt kézbesíteni kell valamennyi tulajdonosnak.
          </p>
          <p className="leading-relaxed">
            A határozatképességhez az összes tulajdoni hányad több mint felét képviselő
            tulajdonostársak jelenléte szükséges (50%+1 szavazatarány). Ha az első közgyűlés
            határozatképtelen, megismételt közgyűlést kell tartani — ez az eredeti napirend keretein
            belül a megjelent tulajdonosok hányadától függetlenül határozatképes.
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Egyszerű szótöbbség (50%+1):</strong> éves elszámolás
                elfogadása, közös képviselő megbízása, karbantartási munkák elrendelése, a
                határozatkönyv jóváhagyása, kisebb közös területhasználati döntések.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Minősített 2/3-os többség:</strong> az SZMSZ
                elfogadása és módosítása (24. §), a közös tulajdonrészek átalakítása, bővítése,
                lényeges felújítása, napelemrendszer, hőszigetelés, EV töltő mint közös beruházás,
                a közös képviselő visszahívása.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Minősített 4/5-os (80%-os) többség:</strong> az
                alapító okirat módosítása (3. §), különös tekintettel az eszmei hányadok
                megváltoztatására, a közös tulajdon egyes részeinek kizárólagos tulajdonba adására,
                az épület bővítésére.
              </span>
            </li>
          </ul>
          <p className="leading-relaxed">
            A közgyűlési határozatokat határozatkönyvbe kell foglalni, amelyet a közös képviselő
            vezet, és amelybe bármely tulajdonos betekinthet. A határozatkönyv a jogi viták
            elsődleges bizonyítéka — ezért pontos, dátummal ellátott, az igen-nem-tartózkodás
            szavazatszámát egyértelműen feltüntető tartalma elengedhetetlen.
          </p>
        </section>

        {/* Közös képviselő jogállása */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
              <Shield size={20} className="text-purple-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">A közös képviselő jogállása</h2>
          </div>
          <p className="leading-relaxed">
            A közös képviselő a 2003. évi CXXXIII. törvény 27–38. §-ai alapján a társasház törvényes
            képviselője. Jogi állása megbízási jogviszony (nem munkaviszony), amelynek alapja a
            közgyűlési határozat és az esetleges megbízási szerződés. Ez azt jelenti, hogy a
            munkajogi védelem (pl. felmondási idő, végkielégítés) nem illeti meg — visszahívható
            minősített 2/3-os közgyűlési szavazással, akár azonnali hatállyal.
          </p>
          <p className="leading-relaxed">
            A közös képviselő köteles az éves elszámolást és a következő évi költségvetési tervet a
            rendes közgyűlésen beterjeszteni, gondoskodni a szükséges karbantartási munkák elvégzéséről,
            a díjhátralékosok felszólításáról, az iratok megőrzéséről, és képviselni a társasházat
            hatóságokkal, bíróságokkal, és harmadik személyekkel szemben. A mulasztásból eredő
            kárért személyes vagyoni felelősséggel tartozik (Ptk. 6:541. §).
          </p>
          <p className="leading-relaxed">
            A visszahívás menete: bármely tulajdonostárs kezdeményezheti rendkívüli közgyűlés
            összehívását, amelyre a többi tulajdonost a szabályos meghívóval meg kell hívni, és amelyen
            az összes tulajdoni hányad 2/3-ának igenlő szavazatával dönthetnek a visszahívásról.
            A visszahívott közös képviselő köteles az összes iratot, nyilvántartást és pénzeszközt
            átadni utódjának, lehetőleg 30 napon belül. A helyettes közös képviselő kijelölése az SZMSZ-ben
            rögzíthető — ha nincs ilyen rendelkezés, a visszahívástól a megbízásig terjedő időszakban
            bármelyik tulajdonostárs jogosult a halaszthatatlan intézkedések megtételére.
          </p>
        </section>

        {/* Szomszédjogi kérdések */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
              <Users size={20} className="text-orange-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Szomszédjoggal kapcsolatos kérdések</h2>
          </div>
          <p className="leading-relaxed">
            A szomszédjogi szabályokat részben a Polgári Törvénykönyv (2013. évi V. törvény 5:23–5:30. §),
            részben a társasháztörvény, részben pedig az SZMSZ rendezi. A zajos szomszéd, az építési
            munkák miatti zavar, a dohányzás a közös tereken, az állattartás rendje és az albérleti
            viszonyok kezelése az egyik leggyakoribb konfliktusforrás a társasházakban.
          </p>
          <p className="leading-relaxed">
            Az SZMSZ kiemelt szerepet játszik e téren: a törvény keretein belül részletesen szabályozhatja
            a csendes órákat (általában 22:00–07:00), az állatartás feltételeit (pl. maximum méret,
            szobatisztaság), a dohányzási tilalmi zónákat a közös területeken, és az albérletbe adással
            kapcsolatos bejelentési kötelezettséget. Az SZMSZ-ben rögzített szabályok betartása az
            albérlőre is kötelező, és a tulajdonos felel az albérlő jogsértő magatartásáért.
          </p>
          <p className="leading-relaxed">
            Ha valaki a közös területet jogtalanul foglalja el (pl. a folyosón tárolja bútorait,
            lezárja a közös kertet), a közös képviselő a 2003. évi CXXXIII. tv. 42. §-a alapján
            köteles intézkedni — szükség esetén jogi úton is. Az építési munkákhoz (pl. falszakítás,
            vízvezeték-átalakítás) szomszéd- és közös képviselői hozzájárulás szükséges, és az
            okozott kárt a felújítást végző tulajdonos köteles megtéríteni.
          </p>
        </section>

        {/* Jogi viták */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <Gavel size={20} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Jogi viták és jogorvoslati lehetőségek</h2>
          </div>
          <p className="leading-relaxed">
            A 2003. évi CXXXIII. törvény 42. §-a alapján a közgyűlési határozatot bármely tulajdonostárs
            megtámadhatja a bíróságon, ha az jogszabályba vagy az alapító okiratba, illetve az SZMSZ-be
            ütközik. A keresetindítás határideje <strong className="text-slate-900">30 nap</strong> a
            határozat meghozatalától vagy a tudomásra jutástól számítva — ezt az anyagi jogi határidőt
            a bíróság nem hosszabbítja meg, és az elmulasztása jogvesztéssel jár.
          </p>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
              <div>
                <p className="mb-1 font-bold text-slate-900">Kritikus határidő: 30 nap</p>
                <p className="text-sm leading-relaxed text-slate-600">
                  A közgyűlési határozat megtámadására nyitva álló 30 napos határidő jogvesztő — az
                  lejárta után a határozat jogerőre emelkedik, és bírói úton nem támadható meg.
                  Ha az érintett tulajdonos nem volt jelen a közgyűlésen, a határidő a határozat
                  kézbesítésétől, értesítésétől számítódik.
                </p>
              </div>
            </div>
          </div>
          <p className="leading-relaxed">
            A bírói útnál olcsóbb és gyorsabb alternatíva a mediáció: a felek semleges közvetítő
            segítségével kereshetnek megállapodást. A mediáció különösen hatékony szomszédjogi
            vitákban, ahol a hosszú távú együttélés érdekében mindkét fél érdekelt a békés rendezésben.
            A mediációs megállapodást bírói jóváhagyással végrehajtható okirattá lehet tenni.
          </p>
          <p className="leading-relaxed">
            A díjhátralékos eljárás esetén a törvény speciális szabályt tartalmaz: a társasház
            közvetlenül közjegyző előtt végrehajtható okiratba foglalhatja a követelést, és közjegyző
            előtti fizetési meghagyással érvényesítheti — ez lényegesen olcsóbb és gyorsabb, mint
            a peres eljárás.
          </p>
        </section>

        {/* Digitális közgyűlés */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <Smartphone size={20} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              2021. évi CXLIII. tv. — digitális közgyűlés
            </h2>
          </div>
          <p className="leading-relaxed">
            A 2021. évi CXLIII. törvény 2022. január 1-jén lépett hatályba, és módosította a
            2003. évi CXXXIII. törvényt az elektronikus szavazás és az online közgyűlés lehetővé
            tétele érdekében. A módosítás értelmében a társasház SZMSZ-e lehetővé teheti, hogy a
            közgyűlést részben vagy egészben elektronikus úton tartsák meg, beleértve a szavazást is.
          </p>
          <p className="leading-relaxed">
            Az elektronikus szavazás feltételei:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>Az SZMSZ kifejezetten lehetővé teszi az elektronikus szavazást és az online közgyűlés tartását.</span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                A szavazáshoz hitelesített elektronikus azonosítás szükséges — az egyszerű e-mail vagy
                WhatsApp üzenet nem elegendő, hiszen a szavazó személyazonossága és a szavazat hitelessége
                igazolható kell legyen.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                A szavazási felületnek biztosítania kell, hogy minden szavazat rögzítésre kerüljön,
                és a határozatkönyv az elektronikus szavazás eredményét is tartalmazza.
              </span>
            </li>
          </ul>
          <p className="leading-relaxed">
            A PanelLakó online közgyűlési modulja a 2021. évi CXLIII. törvény követelményeire épül:
            hitelesített szavazás, automatikus határozatkönyv-generálás és az összes szavazat
            auditálható rögzítése. Az SZMSZ-módosítás mintaszövegét a platform dokumentumtárban
            is elérhető.
          </p>
        </section>

        {/* 2023-as módosítások */}
        <section className="mb-14 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
              <BookOpen size={20} className="text-teal-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">2023-as módosítások</h2>
          </div>
          <p className="leading-relaxed">
            A 2023-ban hatályba lépett novellacsomag több ponton pontosította a Tht. rendelkezéseit,
            különös figyelmet fordítva a közös képviselők felelősségére és az átláthatóság erősítésére.
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Éves elszámolás kötelező nyilvánosra hozatala:</strong> a
                közös képviselő köteles az éves elszámolást a közgyűlés után 15 napon belül a tulajdonosok
                számára hozzáférhetővé tenni — papíron vagy (ha az SZMSZ lehetővé teszi) elektronikusan.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Díjhátralék-eljárás szigorítása:</strong> a
                módosítás rövidítette a felszólítási lépések közötti kötelező várakozási időt,
                lehetővé téve a gyorsabb jogi lépéseket tartós hátralék esetén.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Közös képviselői nyilvántartás:</strong> a kormányzat
                bejelentette egy nyilvános közös képviselői nyilvántartás létrehozásának tervét, amely
                lehetővé teszi a megbízhatóság ellenőrzését és a korábbi jogsértések nyomon követését.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Energetikai tanúsítvány kötelezővé tétele:</strong> a
                2023-as módosítások megerősítették, hogy az épületre vonatkozó hatályos energetikai
                tanúsítványt a közgyűlésen be kell mutatni, és azt a dokumentumtárban meg kell őrizni.
              </span>
            </li>
          </ul>
        </section>

        {/* Hivatkozott jogszabályok */}
        <section className="mb-16 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-8">
          <div className="mb-6 flex items-center gap-3">
            <Scale size={20} className="text-brand-600" />
            <h2 className="text-xl font-black text-slate-900">Hivatkozott jogszabályok</h2>
          </div>
          <div className="space-y-5">
            <div className="border-l-2 border-brand-300 pl-4">
              <p className="font-bold text-slate-900">2003. évi CXXXIII. törvény — Tht.</p>
              <p className="text-sm font-medium text-brand-600">A társasházakról szóló alaptörvény</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                A társasházak alapításának, szervezetének, működésének, a közös képviselő jogainak és
                kötelezettségeinek, a közgyűlési határozathozatalnak, a pénzügyi elszámolásnak és az
                iratkezelésnek az elsődleges forrása. A 42. § szabályozza a jogorvoslati eljárást és
                a határozat megtámadásának 30 napos határidejét.
              </p>
            </div>
            <div className="border-l-2 border-brand-300 pl-4">
              <p className="font-bold text-slate-900">2021. évi CXLIII. törvény</p>
              <p className="text-sm font-medium text-brand-600">Digitális közgyűlés és EV töltők</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Módosította a Tht.-t, törvényes keretbe helyezte az elektronikus szavazást és az online
                közgyűlés tartásának lehetőségét, és bevezette az egyéni EV töltési jogot.
              </p>
            </div>
            <div className="border-l-2 border-brand-300 pl-4">
              <p className="font-bold text-slate-900">2013. évi V. törvény — Ptk.</p>
              <p className="text-sm font-medium text-brand-600">5:23–5:30. § — szomszédjog</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                A szomszédjogi szabályok (zavartalan birtokláshoz való jog, zajtilalom, ingatlanhasználat
                korlátai) alapjogi forrása, amelyet az SZMSZ és a Tht. további rendelkezései egészítenek ki.
              </p>
            </div>
            <div className="border-l-2 border-brand-300 pl-4">
              <p className="font-bold text-slate-900">GDPR — 679/2016/EU rendelet</p>
              <p className="text-sm font-medium text-brand-600">Általános Adatvédelmi Rendelet</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                A társasházi adatkezelésre (tulajdonosi névsor, fizetési adatok, biztonsági felvételek)
                közvetlen hatállyal bír. A közös képviselő adatkezelőnek minősül, és adatkezelési
                tájékoztatót köteles biztosítani. Az adatkezelési szabályzatot az SZMSZ mellékletébe
                is be kell illeszteni.
              </p>
            </div>
          </div>
          <p className="mt-6 text-xs text-slate-400">
            Ez az oldal tájékoztató jellegű és nem minősül jogi tanácsadásnak. Konkrét esetekben
            mindig forduljon ügyvédhez vagy közjegyzőhöz.
          </p>
        </section>

        {/* CTA block — secondary: teljes útmutató */}
        <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 px-8 py-8 text-center">
          <FileText size={24} className="mx-auto mb-3 text-brand-600" />
          <h2 className="mb-2 text-xl font-black text-slate-900">
            Teljes társasházkezelési útmutató
          </h2>
          <p className="mb-5 text-slate-500">
            A jogi háttér mellett a napi adminisztráció, az elszámolás, a dokumentumkezelés és a
            lakói kommunikáció kérdéseit is összefoglalja a teljes útmutatónk.
          </p>
          <Link
            href="/tarsashaz-kezeles"
            className="inline-flex items-center gap-2 rounded-xl border border-brand-300 bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-100"
          >
            Társasházkezelési útmutató <ArrowRight size={14} />
          </Link>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-lg">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Building2 size={24} className="text-white" />
          </div>
          <h2 className="mb-2 text-2xl font-black text-white">
            Kezelje a társasházát a törvényi előírásoknak megfelelően
          </h2>
          <p className="mb-6 text-brand-100">
            A PanelLakó rendszere a 2003. évi CXXXIII. tv. és a 2021. évi CXLIII. tv. követelményeire épül —
            közgyűlés, határozatkönyv, elszámolás, dokumentumtár.
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
