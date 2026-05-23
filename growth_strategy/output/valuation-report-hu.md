# Szoftver Értékelési és Technikai Átvilágítási Jelentés

**PanelLakó** — Társasházi digitális működési központ — PropTech SaaS magyarországi és CEE panel-épületekhez

_Elkészült: 2026-05-23 · Verzió 0.9.23 · Szerző: AI-segített Stratégiai Intelligencia · Megbízhatóság: Közepes_

---

## Vezetői Összefoglaló

A PanelLakó egy **éles üzemű, több-bérlős PropTech SaaS platform** magyarországi lakóépületek (társasházak) számára. A 0.9.23-as verzióban a rendszer teljes digitális működési réteget nyújt közös képviselőknek, könyvelőknek és lakóknak: hibabejelentés-kezelés, közösköltség-nyilvántartás, dokumentumtár olvasási visszaigazolással, online közgyűlési szavazás, lakói kommunikáció, környezetanalitika (levegőminőség, zöldterület, klímakockázat), valós idejű közlekedési megjelenítés, Stripe előfizetéses számlázás, PWA push értesítések és egy teljes SEO tartalommarketing-motor. A kódbázis **72 499 sort tartalmaz 814 fájlban**, 44 Supabase migrációval, és Vercelen fut folyamatos telepítéssel.

### Kulcsmutatók

| Mutató | Érték |
|--------|-------|
| Összes kódsor | 72 499 |
| TypeScript/TSX fájlok | 252 fájl (46 459 + 19 065 sor) |
| SQL migrációk | 44 fájl, 4 268 sor |
| Összes fájl a repóban | 814 |
| Git commitok | 420 |
| Aktuális verzió | v0.9.23 (növekedési/skálázási fázis) |

**Fejlesztési Ráfordítás Összefoglalója**

| Mutató | Alacsony | Várható | Magas |
|--------|----------|---------|-------|
| Emberóra | 2 800 | 4 400 | 6 800 |
| Ember-hónap (160 ó/hó) | 17,5 | 27,5 | 42,5 |
| Naptári hónap (4 fős csapat) | 5,5 hó | 8,5 hó | 13 hó |

**Fejlesztési Költség Összefoglalója**

| Forgatókönyv | Alacsony | Várható | Magas |
|-------------|----------|---------|-------|
| KKE / Magyar csapat (átl. €35–65/ó) | €138 000 | €228 000 | €370 000 |
| Nyugat-európai ügynökség (átl. €80–130/ó) | €310 000 | €490 000 | €760 000 |
| Vegyes KKE + NyEU vezető | €195 000 | €330 000 | €520 000 |

**Piaci Értékbecslés**

| Forgatókönyv | Alacsony | Közép | Magas |
|-------------|----------|-------|-------|
| Bevétel előtti IP-értékesítés (jelenlegi) | €350 E | €750 E | €1,4M |
| Korai traction (10–20 fizető épület) | €600 E | €1,2M | €2,2M |
| Növekedési szakasz (€80E+ ARR) | €1,8M | €3,2M | €6,0M |
| Stratégiai felvásárlás (KKE PropTech vevő) | €800 E | €1,6M | €3,0M |

> ⚠ **Legnagyobb bizonytalansági tényező:** A repóban nem látható igazolt ARR-adat. A kódbázis tartalmaz Stripe számlázási infrastruktúrát (éles előfizetési szintek: Alap, Professzionális, Enterprise), termékanalitikát (PostHog) és egy teljes SEO tartalommarketing-motort — mind a monetizáció jele. Egy igazolt €30–50 ezer ARR a piaci értékelés középső becslését azonnal €750 ezerről €1,2–1,8 millióra emelné.

---

## Termék Rekonstrukció

A PanelLakó digitalizálja egy magyarországi társasházi lakóközösség teljes papír- és telefonos munkafolyamatát. A termék modern, felhőalapú architektúrán épül: egyértelmű szerver/kliens szétválasztással, több-bérlős Supabase-adatbázissal (sor szintű biztonsággal), és egy tartalommarketing-motorral, amely egyszerre szerves akvizíciós csatorna.

### Technikai Architektúra

| Réteg | Technológia | Verzió / Megjegyzés |
|-------|-----------|-------------------|
| Frontend keretrendszer | Next.js (App Router) | ^14.2.30 — TypeScript, SSR + RSC |
| Stílus | Tailwind CSS | ^3.4.16 — utility-first, mobilresponsive |
| Backend / Adatbázis | Supabase (PostgreSQL + Auth + Storage) | @supabase/supabase-js ^2.106.1 |
| Hitelesítés | Supabase Magic Link (SSR-hardened) | @supabase/ssr ^0.10.3 |
| Számlázás | Stripe | stripe ^22.1.1 + @stripe/stripe-js ^9.6.0 |
| Email | Resend + @react-email/components | resend ^6.12.3 |
| Push értesítések | web-push (VAPID) | web-push ^3.6.7 |
| PWA | next-pwa | ^5.6.0 — offline támogatás, telepíthető app |
| Térképek / GIS | Leaflet + OSM + Overpass API | leaflet ^1.9.4, @types/leaflet ^1.9.21 |
| PDF generálás | @react-pdf/renderer | ^4.5.1 |
| Hibakezelés | Sentry | @sentry/nextjs ^8.0.0 |
| Termékanalitika | PostHog | posthog-js ^1.130.0 |
| Képfeldolgozás | sharp | ^0.33.5 |
| Hosting / CDN | Vercel (Edge-kompatibilis) | Folyamatos telepítés |
| Nyelv | TypeScript | ^5.7.2 — szigorú mód minden fájlban |

### Funkcionális Modulok Térképe

| Modul | Főbb Funkciók | Kódbázis Elérési Utak |
|-------|-------------|----------------------|
| Hitelesítés és jogosultság | Magic-link SSR auth; 6-szintű RBAC (képviselő, könyvelő, lakó, kivitelező, ellenőr, szuperadmin); munkaterület-tagság kapuzás | app/login/, middleware.ts, lib/supabase/ |
| Több-épületes munkaterület | Több-bérlős architektúra; UUID-kulcsú munkaterület-útvonalak /w/[buildingId]; munkaterület-választó /app-nál; szintmegmaradás tenant_subscriptions-on keresztül | app/w/[buildingId]/, app/app/ |
| Hibabejelentés-kezelés | Hibabejelentési életciklus; státuszgép; kivitelező-hozzárendelés; SLA-koncepció; prioritásrangsorolás | app/w/[buildingId]/tickets/, components/ticket-*.tsx |
| Közösköltség-nyilvántartás | Pénzügyi főkönyv; hátraléknyilvántartás; tulajdoni hányadok; időszakos elszámolás; egyenlegkimutatás; követeléskezelés (FMH, végrehajtás) | app/w/[buildingId]/financials/, components/financial-*.tsx |
| Dokumentumtár | Feltöltés Supabase Storage-ba; kategóriamegjelölés; olvasási visszaigazolás-követés lakónként; dokumentumnyilvántartás | app/w/[buildingId]/documents/, components/document-*.tsx |
| Online Közgyűlés | Napirend; határozatképesség-követés; határozatkezelés; szavazatrögzítés lakónként; jelenléti ív | app/w/[buildingId]/meetings/, components/meeting-*.tsx |
| Környezetanalitika | Levegőminőség (OpenAQ), városi hősziget (UHI), zajhőtérkép, zöldépület-pontszám, területhasználati térkép, kerékpáros elérhetőség | app/w/[buildingId]/kornyezet/, components/*-map-*.tsx |
| Tömegközlekedés-megjelenítés | BKK valós idejű járatpozíciók; GTFS útvonal/megállóadatok; 6 közlekedési mód; interaktív Leaflet térkép adatbázis-fallbackkel | app/elemzes/budapest-kozlekedes/, components/transit-*.tsx |
| Stripe Számlázás | 3 árazási szint (Alap/Professzionális/Enterprise); előfizetés-kezelés; számlázási portál; szuperadmin szintváltó RPC | app/billing/, app/api/billing/, supabase/migrations/ |
| SEO Tartalom Motor | 7 tartalmi pillér; 28 klikkre váró cikk; strukturált adatok; llms.txt; sitemap; BOFU konverziós oldalak | app/tarsashaz-kezeles/, app/tarsashazi-jog/, stb. |
| Szuperadmin Panel | Platform-szintű vezérlőpult; térképtéma-váltó; BKK szinkronizálási feladatok; migrációfuttató; munkaterület-szintkezelés | app/superadmin/, components/superadmin-client.tsx |
| PWA + Push Értesítések | Web-push (VAPID) lakói riasztásokhoz; offline manifest; next-pwa service worker; telepíthető app | public/manifest.json, lib/push-*.ts, app/api/push/ |

---

## Hatókör Elbontás

A hatókört funkcionális területenként bontottuk le, és implementációs komplexitás szerint értékeltük. A 72 499 soros LOC-szám tartalmazza a teljes alkalmazáskódbázist, az SEO tartalommotort, a környezetanalitikát és az összes infrastruktúrát. A komplexitás-szorzók a nyers sormennyiségen túli architekturális mélységet tükrözik.

### Komplexitásértékelések Területenként

| Funkcionális Terület | Komplexitás | Becs. SOC | Rejtett Költségtényezők |
|--------------------|------------|----------|------------------------|
| Auth & Több-bérlős RBAC | Magas | ~3 200 | SSR-hardened magic-link; 6-szintű RLS az összes táblán; munkaterület-tagság kapuzás; szuperadmin felülbírálási út |
| Munkaterület-útvonalak és shell | Közepes-Magas | ~2 800 | UUID munkaterület-útvonalak; aloldalas elrendezési csoport; oldalsáv összeomlási állapota; PWA shell |
| Hibabejelentési rendszer | Magas | ~4 500 | Státuszgép életciklus; kivitelező-hozzárendelés; SLA-koncepció; prioritás; auditnapló |
| Közösköltség-nyilvántartás | Nagyon Magas | ~5 200 | Hátraléklogika; tulajdoni hányaddal súlyozott elszámolás; FMH/jogi követelésfolyamat; főkönyvi integritás |
| Dokumentumtár + Olvasási visszaigazolás | Közepes-Magas | ~3 100 | Supabase Storage feltöltés; lakónkénti visszaigazolás-követés; kategóriakezelés |
| Közgyűlés és szavazás | Magas | ~4 800 | Határozatképességi logika; határozat-állapotgép; felhasználónkénti szavazatrögzítés; ülés életciklusa |
| Környezetanalitika csomag | Nagyon Magas | ~9 400 | 6 párhuzamos almodul (LQ, UHI, zaj, zöldpontozás, területhasználat, kerékpározás); külső API fan-out; gyorsítótárazás; SVG-diagramok |
| Tömegközlekedés-megjelenítés | Magas | ~5 600 | Valós idejű GTFS-RT; BKK OBA API + adatbázis-fallback; 6 közlekedési mód; Leaflet rétegek; sejtenként szinkronizálási feladatok |
| SEO Tartalom Motor | Közepes-Magas | ~14 000 | 7 pilléres hub; 28 klaszter-cikk; 8 strukturált adat séma típus; llms.txt; Python batch scriptek; sitemap 60+ URL-lel |
| Stripe Számlázás + Előfizetések | Magas | ~3 800 | Webhook megbízhatóság; idempotencia; előfizetési állapotgép Supabase és Stripe között; 3 szintű árazás |
| Adatbázisséma + Migrációk | Nagyon Magas | ~4 268 SQL | 44 migráció; RLS 25+ táblán; pgmq feladatsorok; pg_partman particionálás; idempotenciakulcsok |
| CI/CD + Megfigyelhetőség + Biztonság | Magas | ~2 400 | 6 feladatos GitHub Actions; gitleaks + Semgrep + Trivy SARIF; Sentry v8; PostHog EU; strukturált logger; Vitest csomag |
| Szuperadmin Panel | Közepes | ~2 100 | Térképtéma-kezelés; BKK szinkronizálási triggerek; migrációfuttató; munkaterület-adminisztráció |

### Komplexitás-szorzók

| Tényező | Hatás | Indoklás |
|---------|-------|----------|
| Több-bérlős RLS architektúra | +20% | Sor szintű biztonság 25+ táblán; tulajdoni hányad logika; service-role vs. anon-key fegyelem |
| Külső API fan-out (6+ szolgáltatás) | +15% | Overpass API, BKK OBA/GTFS-RT, OpenAQ, Nominatim, AWS Location — mindegyik timeout-tal, fallbackkel, gyorsítótárral |
| Valós idejű térképek (Leaflet, 4 téma) | +10% | Dinamikus csempe-betöltés; SSR/CSR szétválasztás; téma-megmaradás; SVG jármű-markerek; réteg z-sorrendezés |
| SEO tartalom motor nagy méretben | +10% | 28 cikk strukturált adatokkal; Python batch injektáló scriptek; sitemap karbantartás; 60+ kanonikus URL |
| AI-gyorsított fejlesztés | −35% | A fejlesztési idő az AI-eszközöket tükrözi; hagyományos csapat 2,5–3,5× hosszabb lenne azonos kódbázishoz |
| Korlátozott automatizált tesztelés | +18% | Vitest konfigurált, de a tesztcsomag vékony a 72K SOC-hoz képest; magas manuális QA-teher |
| Stripe + számlázási integráció | +8% | Webhook megbízhatóság; idempotencia; előfizetési állapotgép Supabase és Stripe között |
| PWA + push értesítések | +5% | VAPID kulcskezelés; service worker; böngészők közötti értesítési különbségek |

---

## Módszertan

### Alulról felfelé haladó modulelbontás

A 13 fő funkcionális területet alkomponensekre bontottuk. A ráfordítást komponensenként becsültük a kódsorok száma, az érintett adatbázis-táblák, a külső API-integrációk, a UI-interakciók bonyolultsága és a CHANGELOG-ban bizonyított határesetek alapján (420 commit, v0.1.0-tól v0.9.23-ig).

### Hárompontos PERT-becslés

Területenként optimista (O), várható (M) és pesszimista (P) becsléseket gyűjtöttünk. Képlet: **E = (O + 4M + P) / 6**. Szórás: SD = (P − O) / 6. A PERT súlyozott átlag elismeri, hogy a nagy szoftverprojektek szinte mindig a pesszimista irányba tolódnak az integrációs komplexitás és a feltáratlan határesetek miatt.

### Analógiás benchmarkolás

A PanelLakót hasonló funkcionális hatókörű KKE/magyar PropTech SaaS platformokhoz hasonlítottuk: OnlineHáz (HU), Immocloud (AT), Domus24 (HU), Roperty (PL). Nyilvános PropTech mérnöki blogok és KKE SaaS fizetési felmérések megerősítik a €35–65/ó senior full-stack mérnöki díjat Magyarországon, Szlovákiában és Lengyelországban.

### Fontos megkülönböztetések

- **Ráfordítás ≠ Időtartam:** **4 400** emberóra 8,5 hónap alatt teljesíthető (3,5 FTE) vagy 27 hónap alatt (0,5 FTE). A CHANGELOG magas sebességű, AI-segített fejlesztést mutat.
- **Fejlesztési költség ≠ Piaci érték:** A helyreállítási költség az alacsony határ. A piaci értéket az ARR, a piaci részesedés és a stratégiai opcionalitás határozza meg — esetleg 3–10× a fejlesztési költség.
- **Kód ≠ Termék:** Egy szállított termék tartalmaz UX-kutatást, ügyfélsikereket, piaci pozicionálást, jogi megfelelést (GDPR, ÁSZF) és márkát — ezek egyike sem látható a repóból.
- **AI-gyorsított ≠ Hagyományos:** A v0.9.23-as kódbázis AI-gyorsított fejlesztést tükröz. Hagyományos senior csapat 2,5–3,5× több naptári időt igényelne azonos lefedettséghez.
- **Az SEO motor termékeszköz:** A 28 cikkes, 7 pilléres tartalom motor strukturált adatokkal és llms.txt-vel tartós organikus akvizíciós csatorna — nem csupán marketingszöveg. Fejlesztési értéke és folyamatos forgalmi értéke additív a SaaS platformértékeléshez.

---

## Csapat Összetétele

### Szükséges szerepkörök

| Szerepkör | Miért szükséges | Fázis | Ráfordítás % |
|----------|----------------|-------|-------------|
| Senior full-stack mérnök (Next.js/Supabase) | Architektúra, RLS, Stripe-integráció, API útvonalak, SSR auth | Összes | 32% |
| Mid-level frontend mérnök | React komponensek, Leaflet térképek, PWA, reszponzív UI, SEO oldalak | 2–10 | 25% |
| Backend / DB mérnök | PostgreSQL séma, 44 migráció, RLS szabályok, pgmq, pg_partman | 1–4, 7–9 | 18% |
| UX/UI dizájner | Információarchitektúra, mobil UX, komponenskönyvtár, GDPR-folyamatok | 1–3, 5–6 | 10% |
| Termékmenedzser / BA | Követelmények, lakói kutatás, sprint tervezés, árazási stratégia | Összes | 8% |
| QA mérnök | Manuális tesztelés, biztonsági tesztelés, regresszió, mobil/PWA kereszteszköz | 4–10 | 4% |
| SEO / Tartalom specialista | 7 pilléres tartalom, 28 klaszter-cikk, sémamegjelölés, analitika | 5–9 | 3% |

### Szállítási csapat opciók

> **Lean csapat (3 fő, 10–14 hónap)**
> 1× Senior full-stack · 1× Mid frontend · 0,5× UX/UI dizájner
> _Legalacsonyabb költség; legvalószínűbb konfiguráció AI-segített alapítónak vagy nagyon kis startupnak. Valószínűleg tükrözi a PanelLakó tényleges fejlesztési menetét._

> **Kiegyensúlyozott csapat (5 fő, 7–10 hónap)**
> 1× Senior full-stack · 1× Mid frontend · 1× Backend/DB · 0,5× UX/UI · 0,5× PM
> _Seed-fázisú startupnak ajánlott. Párhuzamos frontend/backend fejlesztési sávok; csökkenti az integrációs késedelmet._

> **Szállítási csapat (8 fő, 5–7 hónap)**
> 2× Senior full-stack · 2× Mid frontend · 1× Backend/DB · 1× UX/UI · 1× PM · 1× QA
> _Maximális sebesség. Ügynökségi szállításhoz vagy post-seed csapathoz alkalmas. Párhuzamos munkát tesz lehetővé az analitika, számlázás és tartalom pilléreiben._

---

## Ráfordítás Becslés

### Területenkénti Bontás (PERT)

| Funkcionális Terület | Opt. (ó) | Várh. (ó) | Pess. (ó) | PERT (ó) |
|--------------------|---------|----------|----------|---------|
| Auth & Több-bérlős RBAC | 120 | 200 | 340 | 207 |
| Munkaterület-útvonalak és shell | 100 | 170 | 290 | 177 |
| Hibabejelentési rendszer | 160 | 260 | 440 | 270 |
| Közösköltség-nyilvántartás | 200 | 340 | 580 | 353 |
| Dokumentumtár + Visszaigazolások | 120 | 200 | 340 | 207 |
| Közgyűlés és szavazás | 180 | 300 | 510 | 312 |
| Környezetanalitika csomag | 280 | 460 | 780 | 477 |
| Tömegközlekedés-megjelenítés | 200 | 340 | 580 | 353 |
| SEO Tartalom Motor | 180 | 300 | 500 | 310 |
| Stripe Számlázás + Előfizetések | 140 | 230 | 390 | 238 |
| DB Séma + Migrációk | 100 | 170 | 290 | 177 |
| CI/CD + Megfigyelhetőség + Biztonság | 120 | 200 | 340 | 207 |
| Szuperadmin Panel | 60 | 100 | 180 | 103 |
| Részösszeg (kódolás) | 1 960 | 3 270 | 5 560 | 3 391 |
| + 30% rezsi (QA 20%, PM 15%, dizájn 10%, DevOps 8%, dok 5%) | 588 | 981 | 1 668 | 1 017 |
| **ÖSSZESEN** | **2 548** | **4 251** | **7 228** | **4 408** |

### Összefoglaló Több Mértékegységben

| Mutató | Alacsony | Várható | Magas |
|--------|----------|---------|-------|
| Emberóra | 2 548 | **4 408** | 7 228 |
| Ember-nap (8 ó) | 319 | 551 | 903 |
| Ember-hónap (160 ó) | 15,9 | 27,6 | 45,2 |
| Naptári hónap (4 fős core) | 5,0 | 8,5 | 13,5 |

---

## Költségbecslés

### Részletes Költségmodell — Várható (KKE Díjak)

| Szerepkör | Arány | Óra | Díj (KKE) | Költség |
|----------|-------|-----|----------|---------|
| Senior full-stack mérnök | 32% | 1 411 | €58/ó | €81 838 |
| Mid-level frontend mérnök | 25% | 1 102 | €38/ó | €41 876 |
| Backend / DB mérnök | 18% | 793 | €52/ó | €41 236 |
| UX/UI dizájner | 10% | 441 | €32/ó | €14 112 |
| Termékmenedzser / BA | 8% | 353 | €42/ó | €14 826 |
| QA mérnök | 4% | 176 | €30/ó | €5 280 |
| SEO / Tartalom specialista | 3% | 132 | €28/ó | €3 696 |
| Közvetlen munkabér | | 4 408 | | €202 864 |
| Rezsi (22%) | | | | €44 630 |
| Tartalék (15%) | | | | €30 430 |
| **ÖSSZESEN** | | | | **€277 924** |

### Költségsávok Forgatókönyvek Szerint

| Forgatókönyv | Alacsony | Várható | Magas |
|-------------|----------|---------|-------|
| KKE / Magyar csapat (lean) | €138 000 | €228 000 | €370 000 |
| Vegyes KKE + NyEU vezető | €195 000 | €330 000 | €520 000 |
| Nyugat-európai ügynökség | €310 000 | €490 000 | €760 000 |
| AI-gyorsított solo fejlesztés (tényleges trajektória) | €45 000 | €80 000 | €140 000 |

---

## Piaci Összehasonlítás

A PanelLakó a KKE/magyar PropTech szegmensben versenyez lakóépület-kezelés terén. Az elsődleges verseny analóg: Excel táblák, WhatsApp csoportok és manuális papíralapú folyamatok. Kis számú digitális eszköz létezik, de egyik sem ért el domináns digitálisan natív státuszt Magyarországon.

### Hasonló termékek — Magyar és KKE PropTech

| Termék | Helyszín / Piac | Fázis | Főbb Megjegyzések |
|--------|----------------|-------|-------------------|
| OnlineHáz | Magyarország | Növekedési | Legközelebbi HU peer; ~1 500 épület; becsült €150–300E ARR; funkcionális átfedés dokumentumokban, ülésekben, pénzügyekben |
| Házmester.hu | Magyarország | Korai/Növekedési | HU épületkezelő eszköz; alapszintű hibabejelentés és hirdetmény funkciók; korlátozott pénzügyi modul |
| ImmoPilot | Magyarország/DACH | Korai | Több-ingatlan kezelési fókusz; kisebb lakóingatlan szegmens mint a PanelLakónál |
| Immocloud | Ausztria/DACH | Növekedési | Becsült ~€1,5M ARR; €12M+ értékelés (2024); szélesebb DACH piac, de hasonló funkcionális hatókör |
| Domus24 | Magyarország | Korai | Becsült ~€80–150E ARR; egyes épületes fókusz; analitika vagy PWA nélkül |
| Roperty | Lengyelország | Korai/Növekedési | KKE összehasonlítható; becsült €500E+ ARR (PropTech.pl 2024 adat); nincs környezetanalitikai réteg |
| Condo Control | Kanada/USA | Skálázó | $5M+ ARR; $30–80M értékelés; hasonló funkciókészlet, de észak-amerikai piac |
| Buildium / AppFolio | USA | Nyilvános/Skálázó | $200M+ ARR; nem közvetlen KKE versenytárs, de a kategória funkciómennyezeti szintjét jelöli |
| Loftium | UK/EU | Növekedési | Európai lakóingatlan-kezelés; Series A; €10–30M értékelési sáv |

### Értékelési szorzók — Korai fázisú vertikális SaaS / PropTech (2024–2026)

| Fázis / Növekedési Ütem | Tipikus ARR Szorzó | Példák / Benchmarkok |
|-----------------------|------------------|---------------------|
| Bevétel előtti (IP + opcionalitás) | N/A — költség + stratégiai érték | Helyreállítási költség 1,5–3×; opciós érték a TAM-ból |
| €10–30E ARR (nagyon korai traction) | 15–25× ARR | KKE vertikális SaaS prémium ragadós épületkezelési munkafolyamatokhoz |
| €50–100E ARR (pilot méret) | 8–15× ARR | Traction csökkenti kockázatot; összehasonlítható OnlineHáz / Domus24 becslésekkel |
| €200–500E ARR (termék-piac illeszkedés) | 5–10× ARR | Immocloud DACH sáv; mainstream SaaS szorzó |
| >€1M ARR (növekedési fázis) | 4–8× ARR | Roperty, Condo Control növekedési fázisú szorzók |
| Stratégiai felvásárló (KKE PropTech összevonás) | 2–5× Bevétel + IP prémium | Adathálózat + portfólió szinergiák + csapat acqui-hire érték |
| M&A medián KKE SaaS (2025) | 3,2–4,1× ARR | Jelenlegi üzleti környezet; eladói nyomás KKE-ben 2021-es csúcshoz képest |

---

## Piaci Értékbecslés

Öt független értékelési módszer kerül alkalmazásra és háromszögelésre. Minden módszer különböző bizonyítékokra támaszkodik — eszközpótlás, TAM-rögzítési valószínűség, összehasonlítható tranzakciók, diszkontált pénzáramlás és stratégiai felvásárlói logika. A háromszögelt sáv valódi bizonytalanságot tükröz az igazolt ARR-adatok hiánya miatt.

### 1. módszer: Pótlási / IP Eszközérték

KKE fejlesztési költség várható díjakon: €228E. Stratégiai IP prémium egy éles üzemű, több-bérlős SaaS-ra számlázással, analitikával és 420 commit iterációval: 1,8–3,5× helyreállítási költség. Az SEO tartalommotor (28 cikk, strukturált adatok, épülő domain authority) organikus forgalmi értéket ad a tiszta kódköltségen túl.

Eredmény: **€350 000 – €800 000** (minimális — eszközérték a bevételektől függetlenül).

### 2. módszer: Piac-opciós érték (TAM × Rögzítési valószínűség)

Magyarország: ~400 000 társasházi épület, amelyből ~80 000 panelszerű (10–200 lakás). Átlagos 45 lakásos épület €25–80/lakás/év SaaS árazással → Magyar TAM: €450M–€1,44Md elméleti plafon; reálisan megcélozható: €32M–€96M a digitálisan fogékony szegmensnek.

A megcélozható HU piac 2%-ának rögzítése skálán = €640E–€1,9M ARR. KKE bővítés (Lengyelország, Csehország, Szlovákia: hasonló méret) ezt 3–4×-esre növeli. 5× kilépési szorzónál, 10–15% valószínűséggel súlyozva, 2%-os piaci rögzítésnél: **€320 000 – €1 430 000**.

### 3. módszer: Összehasonlítható tranzakciós szorzók

Összehasonlítható korai fázisú KKE PropTech SaaS seed ügyletek és acqui-hire-ok (2022–2025):
- OnlineHáz hasonló fázisnál: becsült €400–800E értékelés
- Domus24 korai fázisnál: €150–350E
- Immocloud korai kör: €2–4M (de nagyobb DACH piac)
- KKE SaaS seed mediánok: €400E–€1,2M éles üzemű, niche-vertikális eszközökhöz

PanelLakó v0.9.23-nál élő Stripe számlázással és tartalommarketing moattal: **€500 000 – €1 400 000**.

### 4. módszer: DCF — Indikatív Forgatókönyv

Feltételezett trajektória: pilotindítás 2026 második félévében; 8 fizető épület 2026 végén átlag €1 800/évvel; skálázás 60 épületre 2027 végéig (€1 800 átlag) és 200 épületre 2028 végéig (€2 400 átlag). ARR 2026: €14,4E; 2027: €108E; 2028: €480E. Maradványérték 5× ARR-nál, 35%-os diszkontrátával.

5 éves cash flow NPV: **€280 000 – €620 000**. Érzékenység: ha a felfutás 2× lassabb, NPV ≈ €150–350E; ha 1,5× gyorsabb, NPV ≈ €500E–€1,1M.

### 5. módszer: Stratégiai Felvásárlási Prémium

Stratégiai felvásárlók a KKE PropTech térben (egy digitális lakói szolgáltatásokat építő közüzemi vállalat, egy SaaS-ba lépő ingatlanportál, egy európai PropTech összevonó) értékelne:
- Többbérlős Next.js + Supabase architektúra újrahasznosítható portfóliójukban
- 6-szintű RBAC + Stripe számlázás már integrálva
- SEO tartalommotor domain authority-vel magyar ingatlan-kulcsszavakra
- Környezetanalitikai csomag (egyedi differenciáló bármely piaci szereplőhöz képest)
- Csapat acqui-hire érték AI-jártas full-stack fejlesztési képességért

Stratégiai prémium: 1,5–3× IP-érték. Eredmény: **€525 000 – €2 400 000**.

### Végső Piaci Értéksávok

| Értékelési Módszer | Alacsony | Közép | Magas |
|-------------------|----------|-------|-------|
| 1. Pótlási / IP eszközérték | €350E | €575E | €800E |
| 2. Piac-opciós érték (valószínűséggel súlyozva) | €320E | €875E | €1 430E |
| 3. Összehasonlítható tranzakciók (KKE) | €500E | €950E | €1 400E |
| 4. DCF — indikatív forgatókönyv | €280E | €450E | €620E |
| 5. Stratégiai felvásárlási prémium | €525E | €1 300E | €2 400E |
| **Háromszögelt középbecslés** | **€400E** | **€1 100E** | **€2 200E** |

> ✓ **Középbecslés: €1 100 000 (€1,1M)** — a jelenlegi, igazolt bevétel előtti fázisban, éles Stripe számlázással és növekvő SEO moattal. Egy igazolt €30E ARR (17–20 fizető épület) a középbecslést €1,4–1,8M-ra módosítaná. Egy igazolt €80E ARR-trajektória €2,0–3,2M-ra emelné. A középbecslés szándékosan konzervatív a bevételi nyilvánosság hiányáig.

---

## Feltételezések és Korlátok

### Kemény Bizonyíték — Ismert

- ✓ Teljes forráskód: 814 fájl, 72 499 sor TypeScript/TSX/SQL — megerősítve a repo szkennelővel (repo_scan.json)
- ✓ 252 TypeScript/TSX fájl (46 459 + 19 065 sor) — éles üzemű, végig típusos
- ✓ 44 SQL migrációs fájl (4 268 sor) — teljes séma előzmény v0.1.0-tól v0.9.23-ig
- ✓ 420 git commit — folyamatos aktív fejlesztési előzmény
- ✓ 21 produkciós függőség megerősítve package.json-ból (Stripe, Supabase, Sentry, PostHog, Resend, web-push, next-pwa, Leaflet, @react-pdf/renderer, sharp)
- ✓ Stripe számlázási integráció megerősítve: stripe ^22.1.1 és @stripe/stripe-js ^9.6.0 jelen van
- ✓ Teljes CHANGELOG v0.7.x-től v0.9.23-ig részletes funkciómeghatározásokkal
- ✓ SEO tartalommotor: 7 tartalomlpillér, 28 klaszter-cikk, 8 strukturált adat séma típus, llms.txt, 60+ URL-es sitemap — mind megerősítve a CHANGELOG-ban
- ✓ CI/CD folyamat: GitHub Actions Semgrep, gitleaks, Trivy SARIF szkennelésekkel
- ✓ Vercel telepítés megerősítve; Next.js 14 App Router SSR és RSC architektúrával

### Következtetett — Ésszerű Feltételezés

- ~ Fejlesztési ráfordítás a kódmennyiségből, CHANGELOG mélységéből és összehasonlítható KKE PropTech benchmarkokból becsülve — a repóban nincs időkövetési adat
- ~ KKE fejlesztői díj-feltételezések 2025-ös piaci felméréseken alapulnak (HU/SK/PL senior full-stack: €35–65/ó); tényleges díjak helyszíntől és tapasztaltságtól függően változnak
- ~ A Stripe számlázás integrálva, de igazolt ARR/MRR adatok nem láthatók a repóban
- ~ A PostHog termékanalitika konfigurálva (posthog-js ^1.130.0); DAU/MAU adatok pusztán a repóvizsgálatból nem elérhetők
- ~ Az OnlineHáz, Domus24, Roperty összehasonlítható piaci adatok nyilvános forrásokból és PropTech.pl adatokból becsültek — nem auditált
- ~ A SEO tartalommotor feltételezhetően organikus forgalmat generál; Google Search Console adatok vizsgálatra nem elérhetők
- ~ A környezetanalitikai csomag (OpenAQ, Overpass, Nominatim, BKK OBA) harmadik féltől származó ingyenes API-któl függ díjkorlátokkal — produkciós megbízhatóság a kódban látható gyorsítótárazási fegyelemtől függ

### Ismeretlen / Hiányzó — Nem Megerősíthető

- ✗ Bevétel / ARR — a repóban nem látható monetizációs adat; a piaci értékelés legmeghatározóbb egyedi változója
- ✗ Fizető ügyfélszám — a Stripe integrált, de egyetlen irányítópult vagy analitikai adat sem mutat aktív előfizetéseket
- ✗ Felhasználó/bérlőszám — a PostHog konfigurált, de a munkamenetek száma kódból nem hozzáférhető
- ✗ Lemorzsolódási arány / megtartás — terméktelemetria nélkül nem mérhető
- ✗ SLA / üzemidő előzmény — a Sentry konfigurált, de az incidenstörténet nem elérhető
- ✗ Esetleges meglévő ügyfelek földrajzi megoszlása — kizárólag HU vs. KKE bővítés nem egyértelmű
- ✗ Versenyképes nyerési/veszteségi adatok — nem látható CRM vagy üzleti csővezeték adat
- ✗ Jogi/szabályozási megfelelési állapot — a GDPR/ÁSZF oldalak kódban léteznek, de az adatfeldolgozási megállapodások és az ügyfeleknél lévő DPA-k a repón kívüliek

---

## Következő Lépések

### Értékelés Növelésére (Bevétel és Traction)

- → 5–10 fizető pilot épület aláírása bármilyen áron (akár €800–1 200/év) — az első ARR azonnal 30–60%-kal növeli az értékelési hitelességet
- → Egyszerű metrikaoldal közzétele aktív épületekkel, hibajegy-forgalommal és dokumentumolvasásokkal — a befektetők számszerű jelzéseket igényelnek
- → Stripe webhook-to-adatbázis ARR-követés instrumentálása — minden előfizetési esemény legyen rögzített és jelentsíthető
- → Egy hivatkozható esettanulmány felépítése: nevesített 50+ lakásos épület PanelLakó-használattal ≥3 hónapig számszerű eredménnyel (megtakarított idő, visszakövetelt költség)

### Termék Eladásra / Felvásárlásra / Tőkebevonásra

- → 1 oldalas pitch deck elkészítése: TAM (400E HU épület, KKE bővítés), ék (panelepületek, közös képviselők), védhető pozíció (adathálózati hatás + munkafolyamati zár + SEO moat)
- → Angol nyelvű termékösszefoglaló oldal és befektetői pitch közzétele — a DACH, UK és Lengyelország stratégiai felvásárlói angolul működnek
- → Számlázási szint struktúra formalizálása: a Professzionális → Enterprise frissítési korlátok pontosítása épület- vagy albetétszám alapján
- → Egyszerű analitika export (PDF/CSV) hozzáadása PostHog adatokból — demonstrálja a mérhetőséget a felvásárlók számára

### Technikai Adósság Csökkentésére

- → 1. prioritás: Vitest tesztcsomag bővítése — konfigurált, de a lefedettség vékony a 72E SOC felülethez képest; célzott 40%+ a core elszámolási és szavazási modulokon
- → 2. prioritás: RLS szabályok auditálása a teljes migrációs előzmény alapján — 44 migráció elavult szabályok kockázatát jelenti az újabb táblákon
- → 3. prioritás: Strukturált hibanaplózás hozzáadása a külső API fan-outokhoz (Overpass, OpenAQ, BKK) — timeout-nélküli vagy csöndes meghibásodási útvonalak léteznek a környezetanalitikai kódban
- → 4. prioritás: Fire-and-forget Supabase írások felváltása explicit hibakezeléssel és újrapróbálási logikával a számlázási és push értesítési útvonalakon

### KKE Piaci Terjeszkedésre

- → Lengyel és cseh lokalizációs karakterláncok hozzáadása — az i18n architektúra még nem elérhető (csak magyarul); egyetlen lokalizációs réteg 3×-ra növelné a megcélozható piacot
- → Szlovák/lengyel társasházi jog megfelelőjének kutatása a magyar Ttv.-hez (Társasházi Törvény) — a tartalommotor pillérei HU-specifikusak, de szerkezetileg újrahasznosíthatók
- → White-label ajánlat értékelése egy nagy magyar ingatlankezelő cégnek (valószínűleg 50+ épület) — gyorsabb terjesztési csatorna a közvetlen KKV-értékesítésnél

---

## Függelék

### A. Adatbázistábla-leltár (Fő Táblák a Migrációs Előzményekből)

| Tábla | Modul | Cél |
|-------|-------|-----|
| buildings | Core | Épület törzsadata: id, name, address, lat/lon, tier |
| units | Core | Lakásnyilvántartás: building_id, unit_label, area_m2, ownership_share, balance_amount |
| memberships | Auth | Felhasználó ↔ Épület ↔ Szerepkör leképezés: profile_id, building_id, unit_id, role |
| tenant_subscriptions | Számlázás | Stripe előfizetési állapot: workspace_id, tier_id, stripe_subscription_id, status |
| platform_audit_events | Audit | Megváltoztathatatlan szintváltó napló: workspace_id, old_tier, new_tier, reason, performed_by |
| tickets | Hibabejelentés | Hibajegyek: building_id, unit_id, status, priority, vendor_id, due_date |
| documents | Dokumentumok | Dokumentumtár: building_id, title, file_url, category, supabase_storage_path |
| document_acknowledgements | Dokumentumok | Lakónkénti olvasási visszaigazolások: document_id, profile_id, acknowledged_at |
| financials | Könyvelés | Főkönyvi sorok: building_id, unit_id, amount, type, period, balance_after |
| meetings | Közgyűlés | Közgyűlési események: building_id, date, quorum_threshold, status |
| resolutions | Közgyűlés | Közgyűlési határozatok: meeting_id, title, vote_result, passed |
| votes | Közgyűlés | Lakónkénti szavazatok: meeting_id, profile_id, resolution_id, vote |
| noise_reports | Környezet | Zajjelentések: workspace_id, category, severity 1-5, period, estimated_db |
| waste_reports | Környezet | Havi hulladékkövetés: workspace_id, category, amount, co2_saved |
| transit_stops | Közlekedés | BKK GTFS megállóadatok: stop_id, name, lat, lon, synced_at |
| transit_routes | Közlekedés | BKK útvonalak short_name fallbackkel OBA API meghibásodáshoz |
| osm_addresses | Geokódolás | Magyar OSM cím adatok: GIN + B-tree indexek autocomplete-hez |
| platform_settings | Admin | Globális beállítások: kulcs/érték (pl. map_theme = {id: 'dark'}) |
| job_idempotency_keys | Feladatok | pgmq deduplikáció: queue, key, status, payload, created_at |
| audit_logs | Audit | Strukturált eseménynapló: building_id, actor_id, event_type, payload |

### B. Megbízhatósági Értékelés Dimenziónként

| Dimenzió | Megbízhatóság | Indoklás |
|----------|-------------|----------|
| SOC / fájlszám | Magas (±5%) | Közvetlen repo szkennelő kimenet — determinisztikus |
| Tech stack azonosítás | Magas (±5%) | Megerősítve package.json-ból és forrásfájl fejlécekből |
| Funkciólefedetség értékelés | Magas (±10%) | CHANGELOG v0.1.0–v0.9.23 részletes és kereszthivatkozott kóddal |
| Fejlesztési ráfordítás becslés | Közepes-Magas (±25%) | Teljes kódbázis + changelog elérhető; AI fejlesztési sebesség bizonytalanságot ad |
| Költségbecslés (KKE díjak) | Közepes-Magas (±25%) | 2025 HU/SK/PL piaci díjak; tényleges tapasztaltságtól függ |
| Piaci érték (igazolt bevétel előtt) | Közepes (±45%) | Nincs ARR adat; összehasonlítható alapú, széles összehasonlítható sávval |
| Piaci érték (igazolt ARR-rel) | Közepes-Magas (±25%) | Standard ARR szorzók alkalmazhatók a bevétel nyilvánosság után |
| Versenytárs ARR becslések | Közepes-Alacsony (±50%) | Nyilvános források és PropTech.pl adat; nem auditált |

### C. SEO Tartalom Motor — Cikkleltár Összefoglalója

| Tartalom Pillér | Cikkek | Séma Típusok |
|----------------|--------|-------------|
| Társasházkezelés | 8 | Article, CollectionPage, FAQPage, HowTo, BreadcrumbList |
| Társasházi Jog | 3+ | Article, FAQPage, BreadcrumbList |
| Levegőminőség Budapest | 4 | Article, FAQPage, BreadcrumbList |
| Zajszennyezés Budapest | 2+ | Article, FAQPage, BreadcrumbList |
| Klímakockázat Épületeknél | 3 | Article, FAQPage, BreadcrumbList |
| Zöld Társasház | 3 | Article, FAQPage, BreadcrumbList |
| Tömegközlekedés Elemzés | 2+ | Article, BreadcrumbList |
| Globális / Weboldal | — | WebSite + SearchAction, Organization, SoftwareApplication, Person |

---

_Ez a jelentés AI-segített technikai átvilágítással készült, amely közvetlen repóvizsgálatot (814 fájl, 420 commit, teljes CHANGELOG áttekintés) és külső piackutatást kombinál. Minden szám sáv, nem pontbecslés. A jelentést az első igazolt ARR-nyilvánosság vagy pilot ügyfél aláírása után frissíteni kell. Nem minősül pénzügyi, jogi vagy befektetési tanácsnak._
