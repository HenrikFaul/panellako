import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Gavel,
  AlertTriangle,
  ChevronRight,
  CheckCircle,
  Scale,
  FileText,
  Users,
  Clock,
  Building2,
  ArrowRight,
  Shield,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Közgyűlési Határozat Megtámadása — Eljárás | PanelLakó',
  description:
    'Hogyan támadható meg a társasházi közgyűlési határozat? A 30 napos jogvesztő határidő, bírói út, érvényes érvek és a perindítás menete — 2003. évi CXXXIII. tv. alapján.',
  alternates: { canonical: 'https://panellako.hu/tarsashazi-jog/kozgyulesi-hatarozat-megtamadasa' },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Közgyűlési határozat megtámadása — mit kell tudni?',
  description:
    'Hogyan támadható meg a társasházi közgyűlési határozat? A 30 napos jogvesztő határidő, bírói út, érvényes érvek és a perindítás menete.',
  url: 'https://panellako.hu/tarsashazi-jog/kozgyulesi-hatarozat-megtamadasa',
  inLanguage: 'hu',
  publisher: {
    '@type': 'Organization',
    name: 'PanelLakó',
    url: 'https://panellako.hu',
  },
  datePublished: '2024-01-15',
  dateModified: '2026-05-23',
  author: { '@type': 'Organization', name: 'PanelLakó', url: 'https://panellako.hu' },
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
      name: 'Közgyűlési Határozat Megtámadása',
      item: 'https://panellako.hu/tarsashazi-jog/kozgyulesi-hatarozat-megtamadasa',
    },
  ],
};

export default function KozgyulesiHatarozatMegtamadasaPage() {
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
          <span className="font-medium text-slate-600">Közgyűlési Határozat Megtámadása</span>
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
        <div className="mb-10">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <Gavel size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Közgyűlési határozat megtámadása — mit kell tudni?
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            Ha a társasházi közgyűlésen jogsértő döntés született — legyen szó érvénytelen szavazásról,
            hibás meghívóról vagy napirenden nem szereplő kérdésről — a tulajdonosok bírósághoz fordulhatnak.
            Az alábbiakban összefoglaljuk a megtámadás feltételeit, a 30 napos jogvesztő határidőt,
            és a kereset benyújtásának menetét a 2003. évi CXXXIII. törvény alapján.
          </p>
        </div>

        {/* CRITICAL alert box */}
        <div className="mb-10 rounded-2xl border-2 border-red-400 bg-red-50 px-6 py-6">
          <div className="flex items-start gap-4">
            <AlertTriangle size={28} className="mt-0.5 shrink-0 text-red-500" />
            <div>
              <p className="mb-2 text-lg font-black text-red-700 uppercase tracking-wide">
                30 napos jogvesztő határidő
              </p>
              <p className="leading-relaxed text-slate-700">
                A határozat közlésétől számított <strong>30 napon belül</strong> kell keresetet benyújtani.
                A határidő elmulasztása <strong>jogvesztéssel jár</strong> — utólag nem pótolható!
                A 30 nap elteltével a határozat jogerőre emelkedik és bírói úton többé nem támadható meg.
              </p>
              <p className="mt-2 text-sm font-semibold text-red-600">(Ttv. 42. §)</p>
            </div>
          </div>
        </div>

        {/* Mikor támadható meg */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <Scale size={20} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Mikor támadható meg a határozat?</h2>
          </div>
          <p className="leading-relaxed">
            A 2003. évi CXXXIII. törvény 42. §-a alapján a közgyűlési határozat bírói úton megtámadható,
            ha az jogszabályba, az alapító okiratba vagy az SZMSZ-be ütközik. A megtámadási okok három
            nagy csoportba sorolhatók:
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Eljárási hiba:</strong> a meghívó nem felelt meg a
                törvényi előírásoknak (pl. kevesebb mint 8 nappal előre küldték ki), a közgyűlés
                határozatképtelen volt, vagy az értesítés elmulasztása miatt egyes tulajdonosok nem
                tudtak részt venni.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Tartalmi hiba:</strong> a határozat tartalma ütközik
                a Ttv.-vel (pl. olyan kötelezettséget ró a tulajdonosokra, amelyet a törvény nem tesz
                lehetővé), az alapító okirattal vagy az SZMSZ rendelkezéseivel.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Érvénytelen szavazás:</strong> a döntés napirenden
                nem szereplő kérdésben született, a szükséges minősített többség (2/3 vagy 4/5) helyett
                csak egyszerű többséggel fogadták el, vagy a szavazatszámlálás hibás volt.
              </span>
            </li>
          </ul>
          <p className="leading-relaxed">
            Fontos: a bíróság kizárólag a jogszerűség kérdésében dönt — nem vizsgálja, hogy a határozat
            célszerű-e vagy gazdaságilag indokolt-e. Ha a döntés jogszabályba nem ütközik, de a
            tulajdonos szerint rosszul sáfárkodik a közös pénzzel, ez önmagában nem elegendő alapja
            a sikeres megtámadásnak.
          </p>
        </section>

        {/* Ki indíthat pert */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <Users size={20} className="text-indigo-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Ki indíthat pert?</h2>
          </div>
          <p className="leading-relaxed">
            A Ttv. 42. §-a alapján <strong className="text-slate-900">bármely tulajdonostárs</strong> jogosult
            a megtámadásra — a szavazásban való részvételtől vagy az ott leadott szavazattól függetlenül.
            Ez azt jelenti, hogy az a tulajdonos is indíthat pert, aki:
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Jelen volt és igennel szavazott,</strong> majd utólag
                vette észre, hogy az eljárás szabálytalan volt (pl. a határozatképességhez szükséges
                hányad nem volt meg, de az elnök mégis megállapította a határozatképességet).
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Tartózkodott vagy nemmel szavazott</strong> — ők a
                leggyakoribb felperesek, mivel a döntés ellen szavaztak, de leszavazták őket.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Nem volt jelen a közgyűlésen,</strong> de bizonyítani
                tudja, hogy nem kapott szabályos meghívót (pl. nem küldték ki a meghívót a törvényi
                határidőn belül, vagy rossz címre ment). Ebben az esetben a 30 napos határidő a
                határozat kézbesítésétől, illetve tényleges tudomásra jutástól számít.
              </span>
            </li>
          </ul>
          <p className="leading-relaxed">
            Társtulajdonos esetén a per indítása a többi résztulajdonos hozzájárulása nélkül is lehetséges,
            de a ítélet — ha a határozatot érvénytelenné nyilvánítja — az összes tulajdonosra kiterjed.
          </p>
        </section>

        {/* 30 napos határidő */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <Clock size={20} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">A 30 napos határidő számítása</h2>
          </div>
          <p className="leading-relaxed">
            A legkritikusabb kérdés: mikor kezd el futni a 30 nap? A törvény szerint a határidő
            <strong className="text-slate-900"> a határozat közlésétől</strong> számít — nem attól,
            amikor a tulajdonos ténylegesen tudomást szerzett a döntésről. Ez a különbség elvesztegetett
            napokat — vagy az egész határidőt — jelentheti.
          </p>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="mb-3 font-bold text-slate-900">Mi számít &quot;közlésnek&quot;?</p>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex gap-2">
                <span className="mt-0.5 font-bold text-amber-600">▶</span>
                <span>
                  <strong>Közgyűlésen szóban:</strong> ha a tulajdonos személyesen jelen volt és a
                  határozatot kihirdették, a közlés napja maga a közgyűlés napja.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 font-bold text-amber-600">▶</span>
                <span>
                  <strong>Postai kézbesítés:</strong> a határozatkönyvi kivonatot vagy a határozat
                  szövegét tartalmazó levél kézbesítésének napja a közlés napja. Tértivevényes
                  levélnél az átvétel dátuma az irányadó.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 font-bold text-amber-600">▶</span>
                <span>
                  <strong>Elektronikus kézbesítés:</strong> ha az SZMSZ lehetővé teszi az e-mailes
                  közlést és a tulajdonos ehhez hozzájárult, az e-mail elküldésétől — nem az
                  olvasástól — számít a kézbesítés.
                </span>
              </li>
            </ul>
          </div>
          <p className="leading-relaxed">
            A <strong className="text-slate-900">jogvesztés</strong> következménye végleges és
            visszafordíthatatlan: a 30. nap leteltével a bíróság a keresetet érdemi vizsgálat nélkül
            elutasítja. Sem igazolási kérelem, sem méltányossági kérelem nem orvosolhatja az
            elmulasztott határidőt. Ezért rendkívül fontos, hogy ha egy határozatban problémát észlelünk,
            azonnal — lehetőleg az első 1-2 héten belül — konzultáljunk ügyvéddel.
          </p>
        </section>

        {/* A kereset tartalma */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <FileText size={20} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">A kereset tartalma</h2>
          </div>
          <p className="leading-relaxed">
            A keresetet az <strong className="text-slate-900">illetékes járásbíróságon</strong> kell
            benyújtani, és az alperes a társasház — amelyet a közös képviselő képvisel. A kereset
            formai és tartalmi kellékei:
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">A megtámadott határozat pontos szövege</strong> és
                a határozat kelte, amelyet a határozatkönyvből kell beszerezni. Ha a közös képviselő
                nem adja ki a határozatkönyvi kivonatot, a bíróságtól kérhető bizonyítási cselekmény.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">A jogsértés konkrét megjelölése:</strong> melyik
                jogszabályba, okirat-rendelkezésbe vagy SZMSZ-szakaszba ütközik a határozat, és miért.
                Általános &quot;sérelmesnek tartom&quot; megfogalmazás nem elegendő.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">A kért döntés:</strong> a határozat érvénytelenségének
                megállapítása (megsemmisítés) vagy hatályon kívül helyezése. A kereset arra is irányulhat,
                hogy a bíróság pótoljon egy megtagadott hozzájárulást (pl. tetőtér-beépítésnél).
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Bizonyítékok:</strong> a meghívó, a határozatkönyvi
                kivonat, az SZMSZ és az alapító okirat releváns részei, esetleges tanúnyilatkozatok
                a szavazatszámlálásról.
              </span>
            </li>
          </ul>
          <p className="leading-relaxed">
            Az illetékesség: az ingatlan fekvése szerinti járásbíróság (pl. egy budapesti társasháznál
            a Budai Központi Kerületi Bíróság vagy a Pesti Központi Kerületi Bíróság, kerülettől
            függően). Az eljárási illeték mértéke a pertárgy értékétől függ — egyszerű
            érvénytelenség-megállapítási keresetben jellemzően 15 000–50 000 Ft közötti összeg.
          </p>
        </section>

        {/* Milyen határozatokat támadnak meg */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
              <Gavel size={20} className="text-orange-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Milyen határozatokat szoktak megtámadni?
            </h2>
          </div>
          <p className="leading-relaxed">
            A joggyakorlat alapján az alábbi típushibák fordulnak elő leggyakrabban a társasházi
            közgyűlési határozatokban:
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
              <span>
                <strong className="text-slate-900">Határozatképtelenség ellenére meghozott döntés:</strong> az
                elnök a jelenléti ív alapján megállapítja a határozatképességet, holott az összes
                tulajdoni hányad 50%-a + 1 szavazat nem volt jelen.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
              <span>
                <strong className="text-slate-900">Nem megfelelő meghívó:</strong> a meghívót kevesebb
                mint 8 nappal a közgyűlés előtt küldték ki, vagy nem tartalmazta a napirendi pontokat,
                esetleg nem jutott el az összes tulajdonoshoz.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
              <span>
                <strong className="text-slate-900">Napirenden nem szereplő kérdésben hozott döntés:</strong> a
                közgyűlésen a napirendi pontok között nem szerepelt az adott kérdés, mégis szavaztak
                róla — ez az eljárás jogszabálysértő, kivéve ha valamennyi tulajdonos hozzájárult
                a rendkívüli napirend felvételéhez.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
              <span>
                <strong className="text-slate-900">Minősített többség megkerülése:</strong> az SZMSZ
                módosítását vagy egy közös rész átalakítását egyszerű szótöbbséggel fogadták el, holott
                a törvény 2/3-os, egyes esetekben 4/5-os minősített többséget ír elő.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
              <span>
                <strong className="text-slate-900">Összeférhetetlenségi szabályok megsértése:</strong> a
                közös képviselő vagy egy tulajdonos olyan határozatnál szavazott, amelyben személyesen
                érdekelt, és a szavazata döntő volt az eredmény szempontjából.
              </span>
            </li>
          </ul>
        </section>

        {/* Ideiglenes intézkedés */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
              <Shield size={20} className="text-purple-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Ideiglenes intézkedés kérése</h2>
          </div>
          <p className="leading-relaxed">
            Ha a megtámadott határozat végrehajtása <strong className="text-slate-900">visszafordíthatatlan
            következményekkel járna</strong> — például azonnal lebontanak egy közös területen emelt
            kerítést, vagy megkötnek egy drága, hosszú távú szerződést —, a felperes a keresettel
            egyidejűleg <strong className="text-slate-900">ideiglenes intézkedés</strong> iránti kérelmet
            nyújthat be (Pp. 156. §).
          </p>
          <p className="leading-relaxed">
            Az ideiglenes intézkedés célja, hogy a bíróság az ítélet meghozataláig felfüggessze a
            határozat végrehajtását. A kérelemnek tartalmaznia kell:
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                A sürgősség és a visszafordíthatatlanság részletes igazolását — a bíróság csak akkor
                rendel el ideiglenes intézkedést, ha a felperes valószínűsíti, hogy a végrehajtás
                pótolhatatlan hátrányt okozna.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                A határozat valószínű jogellenességére vonatkozó érvelést — önmagában a határidő
                betartása nem elegendő, a jogsértést legalább valószínűsíteni kell.
              </span>
            </li>
          </ul>
          <p className="leading-relaxed">
            Az ideiglenes intézkedést a bíróság általában a kérelem beérkezésétől számított néhány
            napon belül — sürgős esetben akár 24–48 órán belül — elbírálja. Ha a kérelem megalapozott,
            a végrehajtás az ítélet jogerőre emelkedéséig felfüggesztődik.
          </p>
        </section>

        {/* Ügyvéd szükségessége */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
              <Scale size={20} className="text-teal-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Ügyvéd szükségessége</h2>
          </div>
          <p className="leading-relaxed">
            A polgári eljárásban <strong className="text-slate-900">kötelező jogi képviselet nincs</strong> az
            1 millió forint pertárgy-értéket el nem érő ügyekben — a járásbírósági eljárásban tehát
            az egyszerűbb határozat-megtámadási perekben elméletileg mindenki eljárhat maga is.
            Ugyanakkor erősen ajánlott ügyvédet megbízni, ha:
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                A pertárgy értéke meghaladja a <strong className="text-slate-900">150 000 Ft-ot</strong> —
                ez az összeg a perköltség-kockázat és az ügy összetettsége miatt tekinthető a
                praktikus ügyvéd-megbízás alsó határának.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                Az ügy összetett jogi kérdéseket vet fel (pl. összeférhetetlenség, minősített
                többség értelmezése), vagy a határozat egy drága felújítási projektet érint.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                A határidő szorítása miatt sürgős — az ügyvéd néhány napon belül be tudja nyújtani
                a keresetet, és gondoskodik a bizonyítékok helyes csatolásáról.
              </span>
            </li>
          </ul>
          <p className="leading-relaxed">
            Hasznos lehet az <strong className="text-slate-900">ingyenes elsőkonsultáció</strong> igénybevétele
            is: számos ügyvédi iroda kínál 30–60 perces díjmentes konzultációt, ahol meg lehet ítélni
            a per esélyét és a várható költségeket. A Magyar Ügyvédi Kamara területi kamaráin keresztül
            is lehet ügyvédet keresni. Ha az ügy egyértelműen megnyerhető, az elmarasztaló ítélet
            után a perköltség az alperest (a társasházat) terheli.
          </p>
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
            <p className="mb-2 font-bold text-slate-900">Tipp: Mire figyeljen az ügyvéd kiválasztásakor?</p>
            <p className="text-sm leading-relaxed text-slate-600">
              Társasházi ügyekben jártas, ingatlanjoggal foglalkozó ügyvédet keressen. A &quot;PK vélemény&quot;
              (a Legfelsőbb Bíróság polgári kollégiumi véleménye) a kulcs hivatkozási alap — ezt az
              ügyvédnek ismernie kell, és képesnek kell lennie arra, hogy az ön konkrét esetére
              alkalmazza.
            </p>
          </div>
        </section>

        {/* CTA block */}
        <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 px-8 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="mb-1 text-lg font-black text-slate-900">
                Megelőzés: rendszeres közgyűlés szervezés
              </h2>
              <p className="text-sm text-slate-500">
                A legtöbb határozat-megtámadási per megelőzhető lett volna szabályos meghívóval,
                megfelelő napirenddel és pontos szavazatszámlálással.
              </p>
            </div>
            <Link
              href="/tarsashaz-kezeles/kozgyules-osszehivasa"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-brand-300 bg-white px-5 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-100"
            >
              Közgyűlés összehívása <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="mb-16 rounded-2xl border border-slate-200 bg-slate-50 px-8 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="mb-1 text-lg font-black text-slate-900">Kapcsolat és jogi segítség</h2>
              <p className="text-sm text-slate-500">
                Ha konkrét határozat-megtámadási kérdése van, keressen minket.
              </p>
            </div>
            <Link
              href="/kapcsolat"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition-all hover:bg-slate-100"
            >
              Kapcsolat <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-lg">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Building2 size={24} className="text-white" />
          </div>
          <h2 className="mb-2 text-2xl font-black text-white">
            Jogszerű közgyűlések — kevesebb vita
          </h2>
          <p className="mb-6 text-brand-100">
            A PanelLakó rendszere a törvényi előírásoknak megfelelő közgyűlési folyamatot biztosít:
            automatikus meghívó, határozatkönyv és szavazatszámlálás.
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
