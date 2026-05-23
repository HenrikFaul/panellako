import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Volume2,
  AlertTriangle,
  MapPin,
  Heart,
  Building2,
  Scale,
  BarChart2,
  ArrowRight,
  CheckCircle,
  FileText,
  Mic,
  Car,
  Train,
} from 'lucide-react';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Zajszennyezés Budapest — Zajtérkép és Kerületi Adatok | PanelLakó',
  description:
    'Budapest zajszennyezési térképe, legzajosabb és legcsendesebb kerületek, EU zajhatárértékek, társasházi zaj kezelése. HungaroMet és NIF Zrt. adatok alapján.',
  alternates: { canonical: 'https://panellako.hu/zajszennyezes-budapest' },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Főoldal',
      item: 'https://panellako.hu',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Zajszennyezés Budapest',
      item: 'https://panellako.hu/zajszennyezes-budapest',
    },
  ],
};

const NOISE_SOURCES = [
  {
    icon: Car,
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    title: 'Közúti forgalom',
    body:
      'A budapesti zajterhelés közel 70%-áért a közúti közlekedés felelős. A legterheltebb szakaszokon (pl. Üllői út, Hungária körút, Budaörsi út) csúcsforgalomban a zajszint eléri a 75–80 dB(A) értéket, ami tartós expozíció esetén halláscsökkenést okozhat.',
  },
  {
    icon: Train,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    title: 'Villamos és felszíni metró',
    body:
      'Az 1-es és 2-es villamosvonal, valamint a 3-as metró felszíni szakasza (Kőbánya-Kispest–Határ út) jelentős impulzuszajt gerjeszt. A villamos fékezésekor keletkező 85–88 dB(A) körüli csúcsok a szomszédos lakások ablakai mögött is mérhetők.',
  },
  {
    icon: Volume2,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    title: 'Szórakoztató intézmények',
    body:
      'A belvárosi szórakozóhelyek (VII., VIII. kerület ruin-bárnegyede, V. kerület Duna-parti sávja) éjszakai nyitvatartása folyamatos panaszforrás. A Magyar Zaj- és Rezgésvédelmi Egyesület adatai szerint ezek az intézmények felelnek a lakóterületi határtúllépések közel 20%-áért.',
  },
  {
    icon: Building2,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    title: 'Ipari és építési zaj',
    body:
      'Budapesten folyamatos a beruházási aktivitás: nagyberuházások zajából a lakóterületek is részesülnek. Az Építési törvény (1997. évi LXXVIII. tv.) munkavégzési időt korlátoz (hétköznap 6–22 óra, szombat 8–14 óra), de a határértékeket sokszor átlépik.',
  },
];

const HEALTH_EFFECTS = [
  {
    title: 'Alvászavar és krónikus fáradtság',
    body:
      'A WHO 2018-as iránymutatása szerint már 40 dB(A) éjszakai zajszint megzavarhatja az alvást. 55 dB felett a szív- és érrendszeri betegségek kockázata szignifikánsan megnő. Budapesten az éjszakai határt meghaladó zajban él a város lakónépességének közel 40%-a.',
  },
  {
    title: 'Szív- és érrendszeri problémák',
    body:
      'Az Európai Környezetvédelmi Ügynökség (EEA) 2023-as jelentése szerint a közlekedési zaj évente közel 48 000 szívinfarktus esetért felelős Európában. A kockázat 10 dB(A)-nkénti zajnövekedéssel 8–10%-kal emelkedik, ami azt jelenti, hogy egy forgalmas budapesti úttól 20 méterre lakó személy valódi pluszterhelésnek van kitéve.',
  },
  {
    title: 'Tanulási és kognitív képesség csökkenése',
    body:
      'Gyermekeknél a tartós zajexpozíció (>55 dB nappali átlag) olvasási és számolási készségek lassabb fejlődésével jár. Az iskolai osztálytermekben mért zajszintek a WHO 35 dB(A)-s belső határát számos belvárosi iskolában tartósan meghaladják.',
  },
  {
    title: 'Mentális egészség és stressz',
    body:
      'Krónikus zajexpozíció növeli a kortizolszintet, ami szorongáshoz, depresszióhoz és csökkent életminőséghez vezet. A zaj által okozott irritáció (annoyance) a legszélesebb körben dokumentált nem-hallásrendszeri hatás — az EU 2002/49/EK irányelve külön indikátort (Lden) vezet be erre a célra.',
  },
];

const COMPLAINT_STEPS = [
  {
    step: '1',
    title: 'Dokumentálás',
    body:
      'Mérje, rögzítse és naplózza a zajt: időpont, időtartam, forrás megnevezése. Mobil zajmérő alkalmazások is elfogadhatók bizonyítékként, de a hatósági eljárásban hitelesített mérés erősebb. A PanelLakó hibabejelentési moduljában fotó, hang és leírás egyaránt csatolható.',
  },
  {
    step: '2',
    title: 'Bejelentés az önkormányzathoz',
    body:
      'Minden kerületi önkormányzat rendelkezik zajvédelmi hatóssági hatáskörrel (321/2005. Korm. rendelet). A panaszt írásban, személyesen vagy elektronikusan kell benyújtani a Hatósági Irodához. A hatóság 30 napon belül köteles vizsgálni.',
  },
  {
    step: '3',
    title: 'Hatósági eljárás és jogorvoslat',
    body:
      'Ha az önkormányzati hatóság nem intézkedik, a Fővárosi Kormányhivatal Környezetvédelmi Főosztálya szintén illetékes. Közigazgatási bírságok mértéke 200 000 Ft-tól akár 10 millió Ft-ig terjedhet. Ismételt jogsértés esetén tevékenységtől eltiltás is kiszabható.',
  },
];

export default function ZajszennyezesBudapestPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <PublicNav />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Breadcrumb */}
        <nav aria-label="Navigáció" className="mb-8 flex items-center gap-2 text-sm text-slate-400">
          <Link href="/" className="hover:text-brand-600 transition-colors">Főoldal</Link>
          <span>/</span>
          <span className="font-medium text-slate-700">Zajszennyezés Budapest</span>
        </nav>

        {/* Hero */}
        <div className="mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-700">
            <Volume2 size={13} />
            Zajszennyezés
          </div>
          <h1 className="mb-5 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Zajszennyezés Budapest —{' '}
            <span className="text-brand-600">mit mutat a zajtérkép?</span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-500">
            Budapest az Európai Unió egyik legterheltebb fővárosai közé tartozik zajszennyezés szempontjából. Az EU 2002/49/EK irányelve alapján kötelező ötévenkénti stratégiai zajtérkép-felülvizsgálat legutóbbi, 2022-es kiadása szerint a budapesti lakónépesség több mint 40%-a él az éjszakai határértéket (L<sub>night</sub> 45 dB) meghaladó környezetben. Ez közel 800 000 embert érint — köztük több tízezer panel- és társasházi lakást.
          </p>
        </div>

        {/* Mi számít zajszennyezésnek */}
        <section aria-labelledby="mi-szamit-heading" className="mb-14">
          <h2 id="mi-szamit-heading" className="mb-5 text-2xl font-black text-slate-900">
            Mi számít zajszennyezésnek?
          </h2>
          <p className="mb-4 text-slate-500 leading-relaxed">
            A zaj hangnyomásszintjét dB(A) egységben mérjük, ahol az (A) a hallási érzékenységre súlyozott szűrőt jelöl. A skála logaritmikus: 10 dB növekedés az észlelt hangerőt körülbelül kétszeresére növeli. A mindennapi életben:
          </p>
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 text-left font-black text-slate-700">Zajszint dB(A)</th>
                  <th className="px-5 py-3 text-left font-black text-slate-700">Példa</th>
                  <th className="px-5 py-3 text-left font-black text-slate-700">Hatás</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { db: '30 dB', example: 'Csendes hálószoba', effect: 'Zavartalan alvás' },
                  { db: '45 dB', example: 'Csendes utca éjjel', effect: 'EU L‑night határérték' },
                  { db: '55 dB', example: 'Forgalmas iroda', effect: 'WHO nappali küszöb' },
                  { db: '65 dB', example: 'Forgalmas úttól 10 m', effect: 'Állandó szívterhelés' },
                  { db: '75+ dB', example: 'Főút csúcsforgalom', effect: 'Halláskárosodás kockázata' },
                ].map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    <td className="px-5 py-3 font-bold text-brand-700">{row.db}</td>
                    <td className="px-5 py-3 text-slate-600">{row.example}</td>
                    <td className="px-5 py-3 text-slate-500">{row.effect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-slate-500 leading-relaxed">
            Az EU 2002/49/EK irányelve bevezette az <strong className="text-slate-700">L<sub>den</sub></strong> (nap-este-éjszaka súlyozott) indikátort, ahol az esti (19–23 h) zajhoz 5 dB, az éjszakaihoz (23–7 h) 10 dB büntetőpontot adnak hozzá, hogy tükrözzék a fokozott érzékenységet. A WHO 2018-as iránymutatása szerint az L<sub>den</sub> 53 dB-es közlekedési zajszint alatt csökken számottevően a szív- és érrendszeri megbetegedések kockázata. Magyarország ezt az irányelvet a 280/2004. (X. 20.) Korm. rendelettel ültette át a nemzeti jogba.
          </p>
        </section>

        {/* Legzajosabb és legcsendesebb részek */}
        <section aria-labelledby="terkep-heading" className="mb-14">
          <h2 id="terkep-heading" className="mb-5 text-2xl font-black text-slate-900">
            Budapest legzajosabb és legcsendesebb részei
          </h2>
          <p className="mb-5 text-slate-500 leading-relaxed">
            A NIF Zrt. által kiadott stratégiai zajtérkép (2022) és a HungaroMet monitoring-adatai alapján jelentős területi különbségek mutatkoznak. A belső pest kerületek (V., VI., VII., VIII., IX.) jelentős részén az éjszakai átlag L<sub>night</sub> 55–65 dB körüli, miközben a budai villanegyedek (II., XII. kerület magasabb fekvésű részeiben) ez az érték 35–42 dB — csaknem háromszoros különbség.
          </p>

          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-6 py-5">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-600" />
                <span className="text-sm font-black text-rose-700">Legterheltebb területek</span>
              </div>
              <ul className="space-y-1.5 text-sm text-rose-800">
                {[
                  'Nagykörúton belüli Pest (Üllői út, Rákóczi út)',
                  'Budaörsi út / Kelenföld (XI. ker.)',
                  'Hungária körút teljes sávja (VII–XIV. ker.)',
                  'Soroksári út (IX. ker.)',
                  'Repülőtér környéke (XVI., XVIII. ker.)',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-5">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-600" />
                <span className="text-sm font-black text-emerald-700">Legcsendesebb területek</span>
              </div>
              <ul className="space-y-1.5 text-sm text-emerald-800">
                {[
                  'Budai-hegyek (II. ker. magasabb fekvésű részek)',
                  'Virányos, Pasarét (II. ker.)',
                  'Máriaremete (II. ker.)',
                  'Normafa és Svábhegy (XII. ker.)',
                  'Remetehegyi úti lakónegyed (III. ker.)',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-brand-100 bg-brand-50/60 px-6 py-5">
            <div className="flex items-start gap-3">
              <MapPin size={18} className="mt-0.5 shrink-0 text-brand-600" />
              <div>
                <p className="mb-1 font-bold text-brand-800 text-sm">Interaktív zajtérkép</p>
                <p className="text-sm text-brand-700 leading-relaxed">
                  Az elemzési modulban interaktív térképen tekintheti meg saját kerületének zajterhelési adatait, összehasonlíthatja az egészségügyi kategóriákkal, és lementheti a saját lakóhelyére vonatkozó jelentést.{' '}
                  <Link href="/elemzes" className="font-bold underline hover:text-brand-900 transition-colors">
                    Megnyitom az elemzési modult →
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Zajforrások */}
        <section aria-labelledby="zajforrasok-heading" className="mb-14">
          <h2 id="zajforrasok-heading" className="mb-5 text-2xl font-black text-slate-900">
            Zajforrások Budapesten
          </h2>
          <p className="mb-7 text-slate-500 leading-relaxed">
            A zajszennyezés nem egységes jelenség — forrása, időbelisége és karaktere más-más beavatkozást igényel. A stratégiai zajtérkép öt főforrást különít el: közúti, vasúti, légi, ipari és szabadidős/szórakoztató zajforrások.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {NOISE_SOURCES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.iconBg}`}>
                    <Icon size={20} className={item.iconColor} />
                  </div>
                  <h3 className="mb-2 font-black text-slate-900">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{item.body}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-sm text-slate-500 leading-relaxed">
            A Liszt Ferenc Nemzetközi Repülőtér felszállási és leszállási útvonalai a XVI., XVII. és XVIII. kerületet érintik a legerősebben. A repülőtéri zajszintek szabályozása a 176/1995. (XII. 29.) Korm. rendelet alatt zajlik; a zajvédelmi övezettérkép nyilvános és a kerületi önkormányzatoknál megtekinthető.
          </p>
        </section>

        {/* Egészségügyi hatások */}
        <section aria-labelledby="egeszseg-heading" className="mb-14">
          <h2 id="egeszseg-heading" className="mb-5 text-2xl font-black text-slate-900">
            Egészségügyi hatások — amit a számok mutatnak
          </h2>
          <div className="space-y-4">
            {HEALTH_EFFECTS.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <Heart size={17} className="mt-0.5 shrink-0 text-rose-500" />
                  <div>
                    <h3 className="mb-1.5 font-black text-slate-900">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-500">{item.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Zajvédelem társasházban */}
        <section aria-labelledby="tarsashaz-heading" className="mb-14">
          <h2 id="tarsashaz-heading" className="mb-5 text-2xl font-black text-slate-900">
            Zajvédelem társasházban — mit tehet a közösség?
          </h2>
          <p className="mb-6 text-slate-500 leading-relaxed">
            A társasházi zaj kétirányú probléma: egyrészt külső zajforrásokkal (közlekedés, szórakoztató helyek), másrészt belső forrásokkal (szomszédok, technikai berendezések) szemben szükséges védekezni. A 2003. évi CXXXIII. törvény (Tht.) 24. §-a a közgyűlés hatáskörébe utalja a közös részek zajvédelmi felújítását; a közös képviselő pedig a Szervezeti és Működési Szabályzat szerint köteles a zajforrásokat bejelenteni és eljárást kezdeményezni.
          </p>
          <div className="space-y-4">
            {[
              {
                icon: Building2,
                title: 'Ablakcsere és nyílászáró-felújítás',
                body: 'Hőszigetelő üvegezésű, akusztikailag is minősített ablakok (pl. 45+ dB Rw csillapítással) akár 15–20 dB-es belső zajszintcsökkentést eredményeznek. A felújítás finanszírozható a Magyar Állami CSOK Plusz program keretén belüli társasházi energetikai pályázaton keresztül.',
              },
              {
                icon: Mic,
                title: 'Közösségi terek zajszigetelése',
                body: 'A lépcsőházak és mélygarázsok akusztikai kezelése (rezgéscsillapítók gépalap alatt, hangszigetelő burkolat liftaknánál) csökkenti az épületen belül terjedő hangterhelést. A beruházás a közös költség keretéből finanszírozható, szükségességét közgyűlési határozattal kell rögzíteni.',
              },
              {
                icon: FileText,
                title: 'Biztosítás és kártérítés',
                body: 'A társasházi vagyonbiztosítások jellemzően nem fedezik a zajártalom miatti értékcsökkenést. Kivétel lehet, ha közlekedési beruházás (útbővítés, metróvonal) következtében bekövetkező ingatlanérték-csökkenést az ún. kisajátítási kártérítés keretében igényelnek — ehhez értékbecslő és jogi képviselő szükséges.',
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
                >
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

        {/* Jogorvoslat */}
        <section aria-labelledby="jogorvoslat-heading" className="mb-14 rounded-2xl border border-slate-100 bg-slate-50 px-7 py-8">
          <h2 id="jogorvoslat-heading" className="mb-4 text-2xl font-black text-slate-900">
            Jogorvoslat zajpanasz esetén — 3 lépéses folyamat
          </h2>
          <p className="mb-7 text-slate-500 leading-relaxed">
            A 284/2007. (X. 29.) Korm. rendelet és az önkormányzati zajvédelmi hatáskörre vonatkozó szabályok alapján az alábbi folyamat érvényes. A sikeres hatósági eljárás kulcsa a következetes dokumentálás.
          </p>
          <div className="space-y-5">
            {COMPLAINT_STEPS.map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-black text-white">
                  {item.step}
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
              <strong>Tipp a dokumentáláshoz:</strong> A PanelLakó hibabejelentési moduljával a zajpanaszok időbélyegzett, fotóval és hanggal kiegészített bejelentésként rögzíthetők, amelyek PDF-formátumban exportálhatók és közvetlenül hatósági beadványhoz csatolhatók.
            </p>
          </div>
        </section>

        {/* Link cards */}
        <section aria-labelledby="kapcsolodo-heading" className="mb-14">
          <h2 id="kapcsolodo-heading" className="mb-5 text-xl font-black text-slate-900">
            Kapcsolódó elemzések és tartalmak
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/elemzes/budapest-kozlekedes"
              className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm transition-all hover:border-brand-200 hover:shadow-md"
            >
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                <BarChart2 size={18} className="text-brand-600" />
              </div>
              <div>
                <p className="mb-1 font-black text-slate-900 group-hover:text-brand-700 transition-colors">
                  Budapest közlekedési elemzés
                </p>
                <p className="text-sm text-slate-500">
                  Forgalmi adatok, tömegközlekedés és zajterhelés összefüggései kerületi bontásban.
                </p>
              </div>
            </Link>
            <Link
              href="/zajszennyezes-budapest/tarsashazi-zaj-panasz"
              className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm transition-all hover:border-brand-200 hover:shadow-md"
            >
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                <Scale size={18} className="text-brand-600" />
              </div>
              <div>
                <p className="mb-1 font-black text-slate-900 group-hover:text-brand-700 transition-colors">
                  Társasházi zajpanasz kezelése
                </p>
                <p className="text-sm text-slate-500">
                  Lépésről lépésre: hogyan nyújtson be hatékony zajpanaszt — jogszabályi hivatkozásokkal.
                </p>
              </div>
            </Link>
            <Link
              href="/zajszennyezes-budapest/zajvedes-tarsashazban"
              className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm transition-all hover:border-brand-200 hover:shadow-md"
            >
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                <Building2 size={18} className="text-violet-600" />
              </div>
              <div>
                <p className="mb-1 font-black text-slate-900 group-hover:text-brand-700 transition-colors">
                  Zajvédelem és hangszigetelés
                </p>
                <p className="text-sm text-slate-500">
                  Ablakcsere, hangszigetelési megoldások és közösségi intézkedések zajvédelemre társasházakban.
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-10 text-center shadow-md">
          <h2 className="mb-2 text-2xl font-black text-white">
            Rögzítse zajpanaszát digitálisan — ingyenesen
          </h2>
          <p className="mb-6 text-brand-100 max-w-lg mx-auto">
            A PanelLakó platformon időbélyegzett, exportálható formátumban dokumentálhatja a zajforrásokat — legyen szó hatósági beadványhoz vagy közgyűlési előterjesztéshez szükséges bizonyítékgyűjtésről.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-brand-700 shadow-sm transition-transform hover:scale-[1.03]"
          >
            Ingyenes regisztráció
            <ArrowRight size={16} />
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
