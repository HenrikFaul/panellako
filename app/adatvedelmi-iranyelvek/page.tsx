import type { Metadata } from 'next';
import PublicNav from '@/components/public-nav';
import PublicFooter from '@/components/public-footer';

export const metadata: Metadata = {
  title: 'Adatvédelmi Irányelvek — PanelLakó',
  description:
    'A PanelLakó adatvédelmi irányelvei: milyen adatokat gyűjtünk, hogyan kezeljük, és milyen jogok illetnek meg Önt a GDPR alapján.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://panellako.hu/adatvedelmi-iranyelvek' },
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
      name: 'Adatvédelmi Irányelvek',
      item: 'https://panellako.hu/adatvedelmi-iranyelvek',
    },
  ],
};

export default function AdatvedelmiIranyelvekPage() {
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
            Adatvédelmi Irányelvek
          </h1>
          <p className="mt-3 text-sm text-slate-500">Utolsó frissítés: 2026. május 22.</p>
        </div>

        {/* Disclaimer */}
        <div className="mb-10 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-800">Fontos tájékoztatás</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-700">
            Ez a dokumentum tájékoztató jellegű és folyamatosan frissítjük. Teljes jogi érvényű adatvédelmi
            tájékoztató elkészítése folyamatban van.
          </p>
        </div>

        {/* Document body */}
        <div className="space-y-10">

          {/* 1. Adatkezelő */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">1. Adatkezelő</h2>
            <p className="text-slate-700 leading-relaxed">
              A jelen adatvédelmi irányelvek szerinti adatkezelő:
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-sm font-semibold text-slate-900">PanelLakó</p>
              <p className="mt-1 text-sm text-slate-600">Budapest, Magyarország</p>
              <p className="mt-1 text-sm text-slate-600">
                Email:{' '}
                <a href="mailto:hello@panellako.hu" className="text-brand-600 hover:text-brand-700 font-medium">
                  hello@panellako.hu
                </a>
              </p>
            </div>
          </section>

          {/* 2. Milyen adatokat gyűjtünk */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">2. Milyen adatokat gyűjtünk?</h2>
            <p className="mb-4 text-slate-700 leading-relaxed">
              A PanelLakó platform használata során az alábbi adatokat kezeljük:
            </p>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                <p className="text-sm font-bold text-slate-900">Fiók adatok</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-600 leading-relaxed list-disc list-inside">
                  <li>E-mail cím (belépés, értesítések)</li>
                  <li>Jelszó (titkosítva tárolva — soha nem látható szövegben)</li>
                  <li>Megadott név (megjelenítési célra)</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                <p className="text-sm font-bold text-slate-900">Épületi adatok</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-600 leading-relaxed list-disc list-inside">
                  <li>Az épület pontos címe</li>
                  <li>Albetétek (lakások) száma és adatai</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                <p className="text-sm font-bold text-slate-900">Esemény adatok</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-600 leading-relaxed list-disc list-inside">
                  <li>Hibabejelentések és azok státusza</li>
                  <li>Feltöltött dokumentumok (közgyűlési jegyzőkönyvek, szerződések stb.)</li>
                  <li>Közös költség fizetési tevékenységek</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                <p className="text-sm font-bold text-slate-900">Technikai adatok</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-600 leading-relaxed list-disc list-inside">
                  <li>IP-cím (biztonsági és visszaélés-megelőzési célra)</li>
                  <li>Böngésző típusa és verziója</li>
                  <li>Munkamenet token (session token) a belépett állapot megőrzéséhez</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. Miért kezeljük */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">3. Miért kezeljük ezeket az adatokat?</h2>
            <p className="mb-4 text-slate-700 leading-relaxed">
              Az adatkezelés jogalapjai a GDPR 6. cikk alapján:
            </p>
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                <span className="mt-0.5 shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs">a</span>
                <span><strong className="text-slate-900">Szerződés teljesítése (GDPR 6. cikk b) pont):</strong> A platform alapszolgáltatásainak nyújtásához — beléptetés, bejelentések kezelése, dokumentumtár, közös költség nyilvántartás.</span>
              </li>
              <li className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                <span className="mt-0.5 shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs">b</span>
                <span><strong className="text-slate-900">Jogos érdek (GDPR 6. cikk f) pont):</strong> Platform biztonságának és megbízhatóságának biztosítása, visszaélések megelőzése, rendszerhibák elhárítása.</span>
              </li>
              <li className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                <span className="mt-0.5 shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs">c</span>
                <span><strong className="text-slate-900">Hozzájárulás (GDPR 6. cikk a) pont):</strong> Nem kötelező értesítések és marketing kommunikáció esetén — amelyekre külön beleegyezés szükséges.</span>
              </li>
            </ul>
          </section>

          {/* 4. Tárolási idő */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">4. Meddig tároljuk az adatokat?</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Az adatokat csak addig tároljuk, amíg az adatkezelési cél fennáll:
            </p>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Adat típusa</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Tárolási időszak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="px-4 py-3 text-slate-700">Fiók és profiladatok</td>
                    <td className="px-4 py-3 text-slate-600">Az aktív fiók teljes fennállása alatt folyamatosan</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-700">Épületi és esemény adatok</td>
                    <td className="px-4 py-3 text-slate-600">Az aktív előfizetés ideje alatt</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-700">Fiók törlése után</td>
                    <td className="px-4 py-3 text-slate-600">30 nap — ezután véglegesen és visszaállíthatatlanul törlésre kerül</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-700">Technikai naplók</td>
                    <td className="px-4 py-3 text-slate-600">Legfeljebb 90 nap, biztonsági célból</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 5. Kivel osztjuk meg */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">5. Kivel osztjuk meg az adatokat?</h2>
            <p className="mb-4 text-slate-700 leading-relaxed">
              Az adatokat kizárólag a platform működéséhez elengedhetetlenül szükséges adatfeldolgozókkal
              osztjuk meg. <strong className="text-slate-900">Harmadik fél részére marketing célból semmilyen
              személyes adatot nem adunk át.</strong>
            </p>
            <div className="space-y-3">
              <div className="flex gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4">
                <div className="shrink-0">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <span className="text-xs font-black text-emerald-700">SB</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Supabase</p>
                  <p className="mt-0.5 text-sm text-slate-600 leading-relaxed">
                    Adatbázis és hitelesítés. Az adatok EU-s szerveren (Írország, AWS eu-west-1 régió) kerülnek
                    tárolásra. A Supabase GDPR-megfelelő adatfeldolgozói megállapodással (DPA) rendelkezik.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4">
                <div className="shrink-0">
                  <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center">
                    <span className="text-xs font-black text-violet-700">ST</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Stripe</p>
                  <p className="mt-0.5 text-sm text-slate-600 leading-relaxed">
                    Online fizetési feldolgozás. A Stripe EU-s adatkezelőként működik, PCI DSS tanúsítvánnyal
                    rendelkezik. Kártyaadatokat a PanelLakó rendszere közvetlenül soha nem tárol.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4">
                <div className="shrink-0">
                  <div className="h-9 w-9 rounded-lg bg-orange-50 flex items-center justify-center">
                    <span className="text-xs font-black text-orange-700">PH</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">PostHog</p>
                  <p className="mt-0.5 text-sm text-slate-600 leading-relaxed">
                    Anonimizált használati analitika a platform fejlesztéséhez. Az adatok EU-s szerveren kerülnek
                    feldolgozásra, IP-cím anonimizálással. Személyazonosításra alkalmas adatot nem továbbítunk.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 6. GDPR jogok */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">6. Az Ön jogai GDPR alapján</h2>
            <p className="mb-4 text-slate-700 leading-relaxed">
              A GDPR 15–22. cikke alapján Önt az alábbi jogok illetik meg személyes adataival kapcsolatban.
              Kérelmét a <a href="mailto:hello@panellako.hu" className="text-brand-600 hover:text-brand-700 font-medium">hello@panellako.hu</a> e-mail
              címre küldheti, amelyre 30 napon belül válaszolunk.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  article: 'Art. 15',
                  title: 'Hozzáférési jog',
                  desc: 'Jogosult tájékoztatást kérni arról, hogy milyen személyes adatait kezeljük, mi a célja, és kivel osztottuk meg.',
                },
                {
                  article: 'Art. 16',
                  title: 'Helyesbítési jog',
                  desc: 'Kérheti pontatlan vagy hiányos személyes adatainak módosítását, kiegészítését.',
                },
                {
                  article: 'Art. 17',
                  title: 'Törlési jog (elfeledtetés joga)',
                  desc: 'Kérheti személyes adatai törlését, ha azok kezelése már nem szükséges, vagy visszavonja hozzájárulását.',
                },
                {
                  article: 'Art. 18',
                  title: 'Korlátozáshoz való jog',
                  desc: 'Kérheti az adatkezelés korlátozását, amíg egy kifogás vagy helyesbítés iránti kérelem elbírálása folyamatban van.',
                },
                {
                  article: 'Art. 20',
                  title: 'Adathordozhatóság joga',
                  desc: 'Kérheti adatai géppel olvasható formátumban (JSON/CSV) való kiadását, illetve azok más adatkezelőnek való átadását.',
                },
                {
                  article: 'Art. 21',
                  title: 'Tiltakozás joga',
                  desc: 'Tiltakozhat személyes adatai kezelése ellen, ha az adatkezelés jogos érdeken vagy közhatalmi feladaton alapul.',
                },
              ].map((right) => (
                <div key={right.article} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">
                      {right.article}
                    </span>
                    <p className="text-sm font-bold text-slate-900">{right.title}</p>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{right.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 7. Sütik */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">7. Sütik (Cookies)</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              A PanelLakó kizárólag a platform működéséhez szükséges munkamenet-sütiket (session cookie-kat)
              használ. Ezek a sütik a böngészőablak bezárásakor automatikusan törlődnek.
            </p>
            <div className="rounded-xl border border-brand-100 bg-brand-50 px-5 py-4">
              <ul className="space-y-2 text-sm text-slate-700 leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-brand-600 font-bold">✓</span>
                  <span>Csak munkamenet cookie-kat használunk (session token a belépett állapothoz)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-600 font-bold">✗</span>
                  <span>Nem használunk nyomkövetési (tracking) cookie-kat</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-600 font-bold">✗</span>
                  <span>Nem használunk harmadik féltől származó reklám cookie-kat</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-600 font-bold">✗</span>
                  <span>Nem osztunk meg cookie-adatokat marketing platformokkal</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 8. NAIH */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">8. Adatvédelmi hatóság</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              Ha úgy véli, hogy adatainak kezelése nem felel meg a jogszabályoknak, panaszt nyújthat be a
              hatáskörrel rendelkező adatvédelmi hatóságnál:
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-sm font-bold text-slate-900">
                Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)
              </p>
              <p className="mt-1 text-sm text-slate-600">Postacím: 1363 Budapest, Pf. 9.</p>
              <p className="mt-0.5 text-sm text-slate-600">
                Weboldal:{' '}
                <a
                  href="https://naih.hu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:text-brand-700 font-medium"
                >
                  naih.hu
                </a>
              </p>
              <p className="mt-0.5 text-sm text-slate-600">Telefon: +36 (1) 391-1400</p>
            </div>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Kérjük azonban, hogy panasz benyújtása előtt vegye fel velünk a kapcsolatot — törekszünk az
              esetleges problémákat közvetlenül, gyorsan rendezni.
            </p>
          </section>

          {/* 9. Kapcsolat */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-slate-900">9. Kapcsolat adatvédelmi kérdésekben</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Adatvédelmi kérdéseivel, kérelmeivel kérjük, forduljon hozzánk az alábbi elérhetőségen.
              A beérkező megkeresésekre 30 munkanapon belül válaszolunk.
            </p>
            <div className="rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-5 text-white">
              <p className="font-bold text-lg">PanelLakó — Adatvédelmi kapcsolat</p>
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
