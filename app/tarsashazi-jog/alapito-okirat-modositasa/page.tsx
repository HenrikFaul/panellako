import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FileText,
  AlertTriangle,
  ChevronRight,
  CheckCircle,
  Scale,
  Building2,
  ArrowRight,
  Gavel,
  Shield,
  BookOpen,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Alapító Okirat Módosítása Társasházban | PanelLakó',
  description:
    'Mikor és hogyan módosítható a társasházi alapító okirat? Közjegyző előtti eljárás, egyhangú határozat, ingatlan-nyilvántartás bejegyzés — Ttv. és Inytv. alapján.',
  alternates: { canonical: 'https://panellako.hu/tarsashazi-jog/alapito-okirat-modositasa' },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Alapító okirat módosítása — eljárás és feltételek',
  description:
    'Mikor és hogyan módosítható a társasházi alapító okirat? Közjegyző előtti eljárás, egyhangú határozat, ingatlan-nyilvántartás bejegyzés.',
  url: 'https://panellako.hu/tarsashazi-jog/alapito-okirat-modositasa',
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
      name: 'Alapító Okirat Módosítása',
      item: 'https://panellako.hu/tarsashazi-jog/alapito-okirat-modositasa',
    },
  ],
};

export default function AlapitoOkiratModositasaPage() {
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
          <span className="font-medium text-slate-600">Alapító Okirat Módosítása</span>
        </nav>

        {/* Hero */}
        <div className="mb-10">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <FileText size={24} className="text-brand-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Alapító okirat módosítása — eljárás és feltételek
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-500">
            Az alapító okirat a társasház &quot;alaptörvénye&quot; — meghatározza az összes albetét adatait,
            a közös és kizárólagos tulajdoni részeket, és a tulajdoni arányokat. A módosítása összetett,
            közjegyző bevonásával járó eljárás, amelyhez főszabályként az összes tulajdonos egyhangú
            hozzájárulása szükséges. Az alábbiakban részletezzük a folyamatot a 2003. évi CXXXIII.
            törvény (Ttv.) és az ingatlan-nyilvántartási törvény (Inytv.) alapján.
          </p>
        </div>

        {/* Mi az alapító okirat */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <BookOpen size={20} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Mi az alapító okirat?</h2>
          </div>
          <p className="leading-relaxed">
            A <strong className="text-slate-900">2003. évi CXXXIII. törvény 7. §-a</strong> szerint az
            alapító okirat az a közokirat vagy teljes bizonyító erejű magánokirat, amellyel az épület
            társasházzá nyilvánítása megtörténik, és amelyet az ingatlan-nyilvántartásba bejegyeznek.
            Kötelező tartalmi elemei:
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Az épület adatai:</strong> helyrajzi szám, cím,
                az épület alapterülete, szintszáma, és az összes közös tulajdoni rész felsorolása.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Az albetétek listája:</strong> minden önálló
                lakás, garázs, tároló és nem lakás célú helyiség megnevezése, helyrajzi száma,
                alapterülete és rendeltetése.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Tulajdoni arányok (eszmei hányadok):</strong> minden
                albetéthez rendelt tulajdoni részesedés, amelynek összege 1/1 (azaz 100%). Ez alapján
                számítják a szavazati jogot és a közös költség megoszlását.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Közös célú helyiségek:</strong> amelyek kizárólagos
                használatban vannak (pl. egy tároló, amelyet kizárólag az 1. emeleti lakás tulajdonosa
                használ), de közös tulajdoni résznek minősülnek.
              </span>
            </li>
          </ul>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
            <p className="mb-2 font-bold text-slate-900">Különbség az SZMSZ-től</p>
            <p className="text-sm leading-relaxed text-slate-600">
              Az alapító okirat az épület <em>fizikai és jogi struktúráját</em> rögzíti, és az
              ingatlan-nyilvántartásba bejegyzett közokirat. Az SZMSZ ezzel szemben a társasház
              <em> működési szabályait</em> tartalmazza (közgyűlési rend, szavazatarányok, házirendre
              vonatkozó rendelkezések), és nem kerül az ingatlan-nyilvántartásba. Az SZMSZ módosítása
              lényegesen egyszerűbb — 2/3-os közgyűlési szótöbbség elegendő —, míg az alapító
              okirat módosítása egyhangúságot és közjegyző bevonását igényli.
            </p>
          </div>
        </section>

        {/* Mikor kell módosítani */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
              <AlertTriangle size={20} className="text-orange-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Mikor kell módosítani?</h2>
          </div>
          <p className="leading-relaxed">
            Az alapító okirat módosítása szükséges minden olyan esetben, amikor az épület
            fizikai szerkezete vagy a jogi tulajdoni viszonyok megváltoznak. A leggyakoribb esetek:
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
              <span>
                <strong className="text-slate-900">Új albetét kialakítása:</strong> ha egy meglévő
                nagyobb lakást kettő önálló lakásra osztanak fel (osztás), vagy egy közös területből
                — például pincéből — önálló tároló albetétet hoznak létre.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
              <span>
                <strong className="text-slate-900">Albetétek összevonása:</strong> két szomszédos
                lakás egyetlen albetétté való összevonása (pl. szomszédos lakások áttörésével).
                Ehhez az alapító okirat módosításán felül építési engedély és a hatósági eljárás
                lefolytatása is szükséges.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
              <span>
                <strong className="text-slate-900">Tetőtér-beépítés:</strong> ha a korábban közös
                tetőtérből lakásokat alakítanak ki, az új albetéteket be kell jegyezni az alapító
                okiratba, és a tulajdoni arányokat újra kell számítani.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
              <span>
                <strong className="text-slate-900">Közös terület céljának megváltoztatása:</strong> pl.
                ha egy korábbi mosókonyhát közös kerékpártárolóvá alakítanak — az okiratban a
                rendeltetés megváltoztatását rögzíteni kell.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
              <span>
                <strong className="text-slate-900">Tulajdoni arányok megváltozása:</strong> ha az
                eszmei hányadok újraszámítása szükségessé válik (pl. bővítés után), azt az
                alapító okiratban kell rögzíteni.
              </span>
            </li>
          </ul>
        </section>

        {/* Egyhangúság főszabálya */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <Scale size={20} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Szavazatarány: FŐSZABÁLY = egyhangúság
            </h2>
          </div>
          <div className="rounded-2xl border-2 border-red-300 bg-red-50 px-6 py-6">
            <div className="flex items-start gap-4">
              <AlertTriangle size={24} className="mt-0.5 shrink-0 text-red-500" />
              <div>
                <p className="mb-2 text-lg font-black text-red-700">
                  100% — az összes tulajdonos egyhangú hozzájárulása szükséges
                </p>
                <p className="leading-relaxed text-slate-700">
                  A <strong>Ttv. 10. §-a</strong> értelmében az alapító okirat módosításához
                  főszabályként az összes tulajdonostárs <strong>egyhangú</strong> hozzájárulása
                  szükséges. Egyetlen ellenszavazat vagy tartózkodás elegendő a módosítás meghiúsításához
                  — ezért az alapító okirat módosítása az egyik legbonyolultabb és legtöbb
                  egyeztetést igénylő eljárás a társasházi jogban.
                </p>
              </div>
            </div>
          </div>
          <p className="leading-relaxed">
            Az egyhangúság követelménye alól a törvény csak szűk kivételeket ismer:
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Bíróság pótolhatja a hozzájárulást (Ttv. 10. § (3)):</strong> ha
                valamely tulajdonos az alapító okirat módosításához szükséges hozzájárulást
                indokolatlanul megtagadja, és ezzel aránytalanul sérti a többi tulajdonos közös
                érdekeit, a bíróság ítéletével pótolhatja a hiányzó hozzájárulást. Ez különösen
                releváns akkor, ha egyetlen tulajdonos blokkolja az egész épület javát szolgáló
                módosítást.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">4/5-ös (80%-os) minősített többség:</strong> az
                eszmei hányadok módosítása egyes esetekben 4/5-ös szótöbbséggel is elvégezhető,
                ha az a törvényi feltételeknek megfelel. Ez azonban szűken értelmezendő kivétel.
              </span>
            </li>
          </ul>
          <p className="leading-relaxed">
            A bírói hozzájárulás-pótlás igénybevétele hosszadalmas (általában 1–3 éves per) és
            bizonytalan kimenetelű folyamat. Ezért a legtöbb esetben a módosítást megelőzi egy
            hosszas egyeztetési szakasz, amelynek célja az összes tulajdonos meggyőzése és a
            kompromisszum megtalálása.
          </p>
        </section>

        {/* A módosítás menete */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
              <Gavel size={20} className="text-teal-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">A módosítás menete — 5 lépés</h2>
          </div>
          <div className="space-y-4">
            <div className="flex gap-4 rounded-2xl border border-brand-200 bg-brand-50 p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-black text-white">
                1
              </div>
              <div>
                <p className="mb-1 font-bold text-slate-900">Döntés a közgyűlésen</p>
                <p className="text-sm leading-relaxed text-slate-600">
                  A módosítás szükségességéről és tartalmáról a közgyűlés dönt. Bár a törvény szerint
                  az egyhangúságot a teljes okirat-módosítás egészéhez kell biztosítani, a közgyűlési
                  szándéknyilatkozat — amelyen mindenki jelen van és igennel szavaz — az eljárás
                  kiindulópontja. A döntést határozatkönyvbe kell foglalni.
                </p>
              </div>
            </div>
            <div className="flex gap-4 rounded-2xl border border-brand-200 bg-brand-50 p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-black text-white">
                2
              </div>
              <div>
                <p className="mb-1 font-bold text-slate-900">Okirat-tervezet elkészítése</p>
                <p className="text-sm leading-relaxed text-slate-600">
                  Ügyvéd vagy közjegyző elkészíti az alapító okirat módosításának tervezetét. Ez
                  tartalmazza a módosított szövegrészt és — ha szükséges — az új albetétek adatait
                  (helyrajzi szám, alapterület, eszmei hányad). A tervezethez általában friss
                  tulajdoni lap és térképmásolat is szükséges.
                </p>
              </div>
            </div>
            <div className="flex gap-4 rounded-2xl border border-brand-200 bg-brand-50 p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-black text-white">
                3
              </div>
              <div>
                <p className="mb-1 font-bold text-slate-900">Közjegyző előtti aláírás</p>
                <p className="text-sm leading-relaxed text-slate-600">
                  Az összes tulajdonosnak személyesen — vagy meghatalmazott útján — alá kell írnia
                  a módosított okiratot ügyvéd vagy közjegyző jelenlétében. A közjegyző hitelesíti
                  az aláírásokat, az ügyvéd ellenjegyzi az okiratot. Ez az eljárás logisztikailag
                  az egyik legnagyobb kihívás, különösen nagy, sok tulajdonossal rendelkező
                  épületeknél.
                </p>
              </div>
            </div>
            <div className="flex gap-4 rounded-2xl border border-brand-200 bg-brand-50 p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-black text-white">
                4
              </div>
              <div>
                <p className="mb-1 font-bold text-slate-900">Ingatlan-nyilvántartási kérelem benyújtása</p>
                <p className="text-sm leading-relaxed text-slate-600">
                  Az ügyvéd által ellenjegyzett, módosított alapító okiratot a bejegyzési kérelemmel
                  együtt be kell nyújtani az illetékes járási földhivatalhoz (ingatlan-nyilvántartási
                  hatóság). A kérelmet elektronikusan is be lehet nyújtani ügyvéd útján.
                </p>
              </div>
            </div>
            <div className="flex gap-4 rounded-2xl border border-brand-200 bg-brand-50 p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-black text-white">
                5
              </div>
              <div>
                <p className="mb-1 font-bold text-slate-900">Földhivatali bejegyzés</p>
                <p className="text-sm leading-relaxed text-slate-600">
                  A földhivatal megvizsgálja a kérelmet és az okiratot, majd — ha mindent rendben
                  talál — bejegyzi a módosítást. A bejegyzés a tulajdoni lapon jelenik meg. Az
                  eljárás általában 30–90 napig tart; sürgősségi eljárás is kérhető.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tetőtér-beépítés */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
              <Building2 size={20} className="text-purple-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Különleges eset: tetőtér-beépítés
            </h2>
          </div>
          <p className="leading-relaxed">
            A tetőtér-beépítés az egyik leggyakrabban előforduló és legösszetettebb alapítóokirat-módosítási
            eset. Jogi megítélése attól függ, hogy a tetőtér kizárólagos tulajdon-e vagy közös terület:
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Saját lakás feletti tetőrész:</strong> ha a tetőtér
                egy meghatározott lakás fölötti és az alapító okirat szerint ahhoz rendelt kizárólagos
                tulajdon, a beépítés az adott tulajdonos ügye — de épít engedélyeztetésre és
                szomszédok értesítésére akkor is szükség van.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Közös tető beépítése:</strong> ha a tetőtér közös
                tulajdon (a leggyakoribb eset), a beépítéshez az összes tulajdonos hozzájárulása
                szükséges, és a beépített tér értékének arányos kompenzációját kell megfizetni a
                többi tulajdonos számára — ez a forgalmi érték alapján számítandó.
              </span>
            </li>
          </ul>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <p className="mb-1 font-bold text-slate-900">Kompenzáció kérdése</p>
                <p className="text-sm leading-relaxed text-slate-600">
                  A közös tetőtér beépítésekor az a tulajdonos, aki az új lakást megkapja, elveszi
                  az összes többi tulajdonos közös vagyonát. Ezért a vételárat — amelyet általában
                  ingatlanértékbecslő állapít meg — az összes többi tulajdonosnak kell kifizetni
                  tulajdoni arányuk szerint. Az összeg és a fizetési feltételek az egyhangú
                  megállapodás részét képezik.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Ingatlan-nyilvántartási kötelezettség */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <Shield size={20} className="text-indigo-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Ingatlan-nyilvántartási kötelezettség</h2>
          </div>
          <p className="leading-relaxed">
            Az alapító okirat módosítását — az egyhangú aláírástól számított{' '}
            <strong className="text-slate-900">90 napon belül</strong> — be kell jegyeztetni az
            ingatlan-nyilvántartásba. Ezt az Inytv. (1997. évi CXLI. törvény, 29/A. §) írja elő.
            A bejegyzési kérelemhez szükséges:
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Ügyvéd által ellenjegyzett okirat:</strong> a
                módosított alapító okiratot ügyvédnek kell ellenjegyeznie — közjegyző által készített
                közokiratnál ez automatikus.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Az összes tulajdonos aláírása:</strong> az
                ingatlan-nyilvántartási hatóság ellenőrzi, hogy valamennyi érintett tulajdonos
                hozzájárult-e a módosításhoz.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="text-slate-900">Esetleges hatósági engedélyek:</strong> ha a
                módosítás építési változtatással jár (pl. tetőtér-beépítés), a jogerős építési
                vagy fennmaradási engedélyt is csatolni kell.
              </span>
            </li>
          </ul>
          <p className="leading-relaxed">
            Ha a 90 napos határidőt elmulasztják, a bejegyzés nem válik automatikusan érvénytelenné —
            de a mulasztás jogi bizonytalanságot okoz, és az ingatlan-nyilvántartásban nem szereplő
            változtatás harmadik személyekkel szemben nem hivatkozható.
          </p>
        </section>

        {/* Tipikus hibák */}
        <section className="mb-12 space-y-4 text-slate-600">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Tipikus hibák</h2>
          </div>
          <p className="leading-relaxed">
            Az alapító okirat módosítása körüli leggyakoribb hibák, amelyek jogi vitákhoz és
            érvénytelen módosításokhoz vezetnek:
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
              <span>
                <strong className="text-slate-900">Informális megállapodás okirat-módosítás nélkül:</strong> a
                tulajdonosok szóban vagy e-mailben megállapodnak a tetőtér-beépítésről, de a
                módosított okiratot sohasem írják alá és nem jegyeztetik be. Ez az egyezség
                harmadik személyekkel szemben érvénytelen, és ingatlan-eladásnál komoly problémákat
                okoz.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
              <span>
                <strong className="text-slate-900">Csak az SZMSZ-ben rögzítve:</strong> az alapító
                okirat tartalmát érintő változást (pl. közös terület céljának módosítása) kizárólag
                az SZMSZ-be foglalják, de az alapító okiratot nem módosítják. Az SZMSZ nem
                helyettesítheti az alapító okiratot — ez az eltérés érvénytelenséget okoz.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
              <span>
                <strong className="text-slate-900">Az Inytv.-bejegyzés elmarad:</strong> az okiratot
                aláírják, de a földhivatali bejegyeztetést elmulasztják. Az ingatlan-nyilvántartásba
                be nem jegyzett változás nem keletkeztet dologi hatályú jogot — az épület eladásakor
                vagy jelzáloghitelésnél komoly akadályba ütközhet.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
              <span>
                <strong className="text-slate-900">Nem minden tulajdonos ír alá:</strong> ha egy
                újabban beköltözött tulajdonos (pl. aki az eredeti megállapodás után vette meg a
                lakást) nem írja alá a módosítást, az egyhangúság hiánya miatt az egész eljárás
                érvénytelen.
              </span>
            </li>
          </ul>
        </section>

        {/* CTA blocks */}
        <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 px-8 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="mb-1 text-lg font-black text-slate-900">
                Visszalépés a társasházi jog pillar oldalra
              </h2>
              <p className="text-sm text-slate-500">
                A 2003. évi CXXXIII. tv. és a Ptk. releváns rendelkezéseinek áttekintése.
              </p>
            </div>
            <Link
              href="/tarsashazi-jog"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-brand-300 bg-white px-5 py-3 text-sm font-black text-brand-700 shadow-sm transition-all hover:bg-brand-100"
            >
              Társasházi jog <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="mb-16 rounded-2xl border border-slate-200 bg-slate-50 px-8 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="mb-1 text-lg font-black text-slate-900">
                Közgyűlési határozat megtámadása
              </h2>
              <p className="text-sm text-slate-500">
                Ha az alapítóokirat-módosítás körüli határozatot meg kívánja támadni.
              </p>
            </div>
            <Link
              href="/tarsashazi-jog/kozgyulesi-hatarozat-megtamadasa"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition-all hover:bg-slate-100"
            >
              Határozat megtámadása <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-lg">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Building2 size={24} className="text-white" />
          </div>
          <h2 className="mb-2 text-2xl font-black text-white">
            Dokumentumtár és határozatkönyv egy helyen
          </h2>
          <p className="mb-6 text-brand-100">
            Az alapító okirat, az SZMSZ és az összes határozat biztonságosan tárolva és kereshetően
            elérhető a PanelLakó platformon.
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
