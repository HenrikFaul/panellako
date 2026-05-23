import type { Metadata } from 'next';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Általános Szerződési Feltételek — PanelLakó ÁSZF',
  description:
    'A PanelLakó platform használatának általános szerződési feltételei. Előfizetési feltételek, lemondás, felelősség.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://panellako.hu/aszf' },
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
      name: 'Általános Szerződési Feltételek',
      item: 'https://panellako.hu/aszf',
    },
  ],
};

export default function AszfPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <PublicNav />

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        {/* Header */}
        <div className="mb-10 border-b border-slate-200 pb-8">
          <p className="mb-3 text-sm font-medium text-brand-600 uppercase tracking-wider">Jogi dokumentum</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Általános Szerződési Feltételek (ÁSZF)
          </h1>
          <p className="mt-3 text-sm text-slate-500">Utolsó frissítés: 2026. május 22.</p>
        </div>

        {/* Disclaimer */}
        <div className="mb-10 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-800">Fontos tájékoztatás</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-700">
            Ez a dokumentum tájékoztató jellegű, folyamatosan frissítjük.
          </p>
        </div>

        {/* Document body */}
        <div className="space-y-10">

          {/* 1. A felek */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">1. A felek</h2>
            <p className="mb-4 text-slate-700 leading-relaxed">
              Jelen Általános Szerződési Feltételek (továbbiakban: ÁSZF) a PanelLakó platform
              igénybevételére vonatkozó jogviszony feltételeit szabályozzák az alábbi felek között:
            </p>
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-sm font-bold text-slate-900">Szolgáltató</p>
                <p className="mt-1 text-sm text-slate-600">PanelLakó</p>
                <p className="mt-0.5 text-sm text-slate-600">Budapest, Magyarország</p>
                <p className="mt-0.5 text-sm text-slate-600">
                  Email:{' '}
                  <a href="mailto:hello@panellako.hu" className="text-brand-600 hover:text-brand-700 font-medium">
                    hello@panellako.hu
                  </a>
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                <p className="text-sm font-bold text-slate-900">Felhasználó</p>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  Az a természetes vagy jogi személy, aki a PanelLakó platformon regisztrált fiókkal
                  rendelkezik, és a szolgáltatást igénybe veszi. A regisztrációval a Felhasználó elfogadja
                  jelen ÁSZF rendelkezéseit.
                </p>
              </div>
            </div>
          </section>

          {/* 2. A szolgáltatás tárgya */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">2. A szolgáltatás tárgya</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              A Szolgáltató a PanelLakó elnevezésű, felhőalapú (SaaS) társasházkezelő szoftverplatformhoz
              biztosít hozzáférést előfizetéses alapon. A platform az alábbi fő funkciókat tartalmazza:
            </p>
            <ul className="space-y-2">
              {[
                'Hibabejelentések nyilvántartása és kezelése',
                'Dokumentumtár — közgyűlési jegyzőkönyvek, szerződések tárolása',
                'Közös költség nyilvántartás és fizetési előzmények követése',
                'Online közgyűlés lebonyolítása és szavazási funkciók',
                'Épület- és albetétnyilvántartás',
                'Értesítések és kommunikációs eszközök',
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                  <span className="mt-0.5 shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed">
              A Szolgáltató fenntartja a jogot a platform funkcióinak bővítésére és fejlesztésére.
              Meglévő funkciók megszüntetése esetén a Felhasználókat előzetesen értesíti.
            </p>
          </section>

          {/* 3. Regisztráció és fiók */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">3. Regisztráció és fiók</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              A platform igénybevételéhez érvényes regisztráció szükséges. A regisztrációra az alábbi
              feltételek vonatkoznak:
            </p>
            <div className="space-y-3 rounded-xl border border-slate-200 divide-y divide-slate-200 overflow-hidden">
              <div className="px-5 py-4 bg-white">
                <p className="text-sm font-bold text-slate-900">Életkori feltétel</p>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  A platformot kizárólag 18. életévét betöltött természetes személy, illetve törvényes
                  képviselő útján eljáró jogi személy veheti igénybe.
                </p>
              </div>
              <div className="px-5 py-4 bg-white">
                <p className="text-sm font-bold text-slate-900">Valós adatok megadása</p>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  A regisztráció során megadott adatoknak (név, e-mail cím, épületadatok) valósnak és
                  pontosnak kell lenniük. Hamis adatok megadása az ÁSZF súlyos megsértésének minősül.
                </p>
              </div>
              <div className="px-5 py-4 bg-white">
                <p className="text-sm font-bold text-slate-900">Fiók biztonsága</p>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  A Felhasználó felelős a fiókjához kapcsolódó hozzáférési adatok biztonságos
                  megőrzéséért. A fiókján keresztül végzett tevékenységekért a Felhasználó felel.
                </p>
              </div>
              <div className="px-5 py-4 bg-white">
                <p className="text-sm font-bold text-slate-900">Egy fiók per épület</p>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  Ugyanaz az épület (azonos cím alapján) legfeljebb egy aktív munkaterületen
                  (workspace-en) kezelhető az előfizetésen belül.
                </p>
              </div>
            </div>
          </section>

          {/* 4. Próbaidőszak */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">4. Próbaidőszak</h2>
            <div className="rounded-xl border border-brand-200 bg-brand-50 px-5 py-5">
              <p className="text-sm font-bold text-brand-900 mb-3">14 napos ingyenes próba</p>
              <ul className="space-y-2">
                {[
                  'A próbaidőszak a regisztrációtól számított 14 naptári napig tart.',
                  'Bankkártya- vagy fizetési adatok megadása nem szükséges a próba megkezdéséhez.',
                  'A próbaidőszak lejártával a fiók automatikusan NEM vált fizetős előfizetésbe.',
                  'A próba lejárta után a fiók inaktív állapotba kerül; az adatok 30 napig megőrzésre kerülnek.',
                  'Az inaktív fiók bármikor reaktiválható előfizetés megkezdésével.',
                ].map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm text-brand-800 leading-relaxed">
                    <span className="mt-0.5 shrink-0 text-brand-600 font-bold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 5. Előfizetés és fizetés */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">5. Előfizetés és fizetés</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              A PanelLakó platform előfizetéses modellben érhető el. A fizetési feltételek:
            </p>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-700 bg-slate-50 w-2/5">Számlázási ciklus</td>
                    <td className="px-4 py-3 text-slate-600">Havi előfizetés; a díj minden hónap elején esedékes.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-700 bg-slate-50">Fizetési mód</td>
                    <td className="px-4 py-3 text-slate-600">Online bankkártyával, Stripe fizetési platformon keresztül (Visa, Mastercard, AMEX).</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-700 bg-slate-50">Pénznem</td>
                    <td className="px-4 py-3 text-slate-600">Magyar forint (HUF). Az árak az aktuális árlistán szerepelnek.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-700 bg-slate-50">Számla</td>
                    <td className="px-4 py-3 text-slate-600">Az előfizetési díjról elektronikus számla kerül kiállításra, amelyet a Felhasználó e-mailben kap meg.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-slate-700 bg-slate-50">Sikertelen fizetés</td>
                    <td className="px-4 py-3 text-slate-600">Sikertelen fizetés esetén a Szolgáltató 3 napos türelmi időn belül értesíti a Felhasználót. A türelmi idő lejártával a fiók felfüggesztésre kerül.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Az aktuális díjszabás a{' '}
              <a href="/arak" className="text-brand-600 hover:text-brand-700 font-medium">panellako.hu/arak</a>{' '}
              oldalon tekinthető meg. A Szolgáltató fenntartja a jogot az árak módosítására, amelyről
              a Felhasználókat legalább 30 nappal előre értesíti.
            </p>
          </section>

          {/* 6. Lemondás */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">6. Lemondás</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              A Felhasználó az előfizetést bármikor, azonnali hatállyal mondhatja le a platform
              beállításain keresztül vagy a <a href="mailto:hello@panellako.hu" className="text-brand-600 hover:text-brand-700 font-medium">hello@panellako.hu</a> e-mail
              címen küldött kérelemmel.
            </p>
            <div className="space-y-3">
              <div className="flex gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
                <span className="mt-0.5 shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold text-xs">1</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Azonnali lemondás</p>
                  <p className="mt-0.5 text-sm text-slate-600 leading-relaxed">
                    A lemondás a kérelem beérkezésétől számítva azonnal érvényes. A már kifizetett
                    időszakra visszatérítés nem jár, azonban a hozzáférés a kifizetett időszak
                    végéig fennmarad.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
                <span className="mt-0.5 shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold text-xs">2</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Adatmegőrzési időszak</p>
                  <p className="mt-0.5 text-sm text-slate-600 leading-relaxed">
                    A lemondást követően az összes adatot (dokumentumok, bejelentések, fizetési
                    előzmények) 30 napig megőrizzük. Ezen időszakon belül az adatok exportálhatók.
                    30 nap elteltével az adatok véglegesen és visszaállíthatatlanul törlésre kerülnek.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
                <span className="mt-0.5 shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold text-xs">3</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Reaktiválás</p>
                  <p className="mt-0.5 text-sm text-slate-600 leading-relaxed">
                    A 30 napos megőrzési időszakon belül az előfizetés újraindítható, és az összes
                    adat visszaállítható.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 7. A felhasználó kötelezettségei */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">7. A felhasználó kötelezettségei</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              A platform igénybevétele során a Felhasználó köteles:
            </p>
            <ul className="space-y-3">
              {[
                {
                  title: 'Jogszerű használat',
                  desc: 'A platformot kizárólag jogszerű célokra, a vonatkozó magyar és EU-s jogszabályok betartásával használni. Tilos a platform visszaélésszerű, félrevezető vagy harmadik személyek jogait sértő célokra való felhasználása.',
                },
                {
                  title: 'Helyes és valós adatok',
                  desc: 'A regisztráció során és a platform használata közben valós, pontos és naprakész adatokat megadni. Az adatokban bekövetkezett változásokat haladéktalanul frissíteni.',
                },
                {
                  title: 'Titoktartás és hozzáférés-védelem',
                  desc: 'A fiókhoz tartozó bejelentkezési adatokat (e-mail, jelszó) bizalmasan kezelni, harmadik személyekkel nem megosztani. Jogosulatlan hozzáférés észlelése esetén azonnal értesíteni a Szolgáltatót.',
                },
                {
                  title: 'Rendszerterhelés tilalma',
                  desc: 'Tartózkodni a platform automatizált vagy tömeges lekérdezéstől, scrapin tevékenységtől, illetve bármilyen olyan tevékenységtől, amely a platform rendeltetésszerű működését veszélyezteti.',
                },
                {
                  title: 'Bejelentési kötelezettség',
                  desc: 'A platform működésében észlelt hibákat, biztonsági hiányosságokat haladéktalanul jelenteni a Szolgáltatónak a hello@panellako.hu e-mail címen.',
                },
              ].map((item) => (
                <li key={item.title} className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                  <p className="text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* 8. Felelősség korlátozása */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">8. Felelősség korlátozása</h2>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-5 space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-900">"As is" alapú szolgáltatás</p>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  A platform a "jelenlegi állapotában" (as is) kerül biztosításra. A Szolgáltató nem
                  vállal szavatosságot arra, hogy a platform minden körülmények között hibamentesen,
                  megszakítás nélkül működik.
                </p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Szavatosság kizárása</p>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  A Szolgáltató kizárja a felelősségét minden olyan kárért, amely a platform
                  időszakos elérhetetlenségéből, technikai hibájából, harmadik féltől (Supabase,
                  Stripe, PostHog stb.) eredő kimaradásból, illetve vis maior eseményből ered.
                </p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Adatmentés felelőssége</p>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  A Felhasználó által feltöltött dokumentumok és adatok rendszeres exportálásáért
                  a Felhasználó is felelős. A Szolgáltató rendszeres biztonsági mentéseket végez,
                  de nem garantál 100%-os adatvédelmet vis maior esetén.
                </p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Felelősség maximuma</p>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  A Szolgáltató felelőssége — amennyiben fennáll — nem haladhatja meg a Felhasználó
                  által az előző 3 hónapban ténylegesen megfizetett előfizetési díj összegét.
                </p>
              </div>
            </div>
          </section>

          {/* 9. Szellemi tulajdon */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">9. Szellemi tulajdon</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              A PanelLakó platform minden eleme szerzői jogi védelem alatt áll:
            </p>
            <ul className="space-y-2">
              {[
                'A platform szoftvere, forráskódja és algoritmusa a Szolgáltató kizárólagos szellemi tulajdona.',
                'A platform megjelenése, dizájnja, ikonjai, logója és vizuális elemei szerzői jogi védelem alatt állnak.',
                'A Szolgáltató által létrehozott sablon dokumentumok, súgótartalmak és egyéb szöveges tartalmak szintén védett alkotások.',
                'A Felhasználó által feltöltött tartalmak (dokumentumok, képek, adatok) a Felhasználó tulajdonában maradnak.',
                'A PanelLakó nevet, logót és márkajelzést a Felhasználó nem használhatja kereskedelmi célra a Szolgáltató előzetes írásbeli hozzájárulása nélkül.',
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                  <span className="mt-0.5 shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs">©</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 10. Módosítás */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">10. Az ÁSZF módosítása</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              A Szolgáltató fenntartja a jogot jelen ÁSZF egyoldalú módosítására. A módosítás
              feltételei:
            </p>
            <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-200 overflow-hidden">
              <div className="px-5 py-4 flex gap-3">
                <span className="mt-0.5 shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs">30</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">30 napos értesítési kötelezettség</p>
                  <p className="mt-0.5 text-sm text-slate-600 leading-relaxed">
                    Lényeges módosítás esetén a Szolgáltató legalább 30 naptári nappal korábban
                    tájékoztatja a Felhasználókat e-mailben és a platformon belüli értesítéssel.
                  </p>
                </div>
              </div>
              <div className="px-5 py-4 flex gap-3">
                <span className="mt-0.5 shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs">✓</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Hallgatólagos elfogadás</p>
                  <p className="mt-0.5 text-sm text-slate-600 leading-relaxed">
                    Ha a Felhasználó az értesítési időszak lejártáig nem mondja fel az előfizetést,
                    az a módosított ÁSZF elfogadásának minősül.
                  </p>
                </div>
              </div>
              <div className="px-5 py-4 flex gap-3">
                <span className="mt-0.5 shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs">✗</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Visszautasítás joga</p>
                  <p className="mt-0.5 text-sm text-slate-600 leading-relaxed">
                    A Felhasználó a módosítás hatályba lépése előtt díjmentesen lemondhatja
                    előfizetését, ha a változásokkal nem ért egyet.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Az ÁSZF kisebb, nem lényeges módosítása (helyesírási javítás, pontosítás) 30 napos
              előzetes értesítés nélkül is elvégezhető, és a módosítás közzétételével lép hatályba.
            </p>
          </section>

          {/* 11. Irányadó jog */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">11. Irányadó jog és joghatóság</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Jelen ÁSZF-re és az abból eredő jogviszonyokra a <strong className="text-slate-900">magyar jog</strong> az
              irányadó, különös tekintettel az alábbi jogszabályokra:
            </p>
            <ul className="space-y-2 mb-4">
              {[
                '2013. évi V. törvény — Polgári Törvénykönyv (Ptk.)',
                '2001. évi CVIII. törvény — Elektronikus kereskedelmi törvény',
                '2011. évi CXII. törvény — Információs önrendelkezési jog és információszabadság',
                'Az Európai Parlament és a Tanács (EU) 2016/679 rendelete (GDPR)',
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                  <span className="mt-0.5 shrink-0 text-brand-600 font-bold">§</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-sm font-bold text-slate-900">Illetékes bíróság</p>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                A felek közötti jogvitákra — amennyiben azokat peren kívül nem sikerül rendezni —
                a Budapesti (fővárosi) illetékes bíróság az illetékes. Fogyasztói jogviták esetén
                a Fogyasztóvédelmi Hatóság és a Pénzügyi Békéltető Testület is igénybe vehető.
              </p>
            </div>
          </section>

          {/* 12. Kapcsolat */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">12. Kapcsolat</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              ÁSZF-fel kapcsolatos kérdéseivel, panaszaival kérjük, forduljon hozzánk. Törekszünk
              minden megkeresésre 5 munkanapon belül válaszolni.
            </p>
            <div className="rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-5 text-white">
              <p className="font-bold text-lg">PanelLakó — Ügyfélszolgálat</p>
              <p className="mt-1 text-brand-100 text-sm">Budapest, Magyarország</p>
              <a
                href="mailto:hello@panellako.hu"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/30"
              >
                hello@panellako.hu
              </a>
            </div>
          </section>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
