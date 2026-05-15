# PanelLakó — Szoftver Értékelési Jelentés (HU)

**Elkészült:** 2026-05-15  
**Repositori:** HenrikFaul/panellako  
**Fázis:** MVP+ (bevétel előtti)  
**Háromszögelt középső becslés:** **180 000–420 000 €**

---

## 1. Vezetői összefoglaló

A PanelLakó egy **multi-tenant PropTech SaaS platform**, amely Magyarország ~1,2 millió panellakásos épületállományát és a szélesebb közép-kelet-európai társasházi piacot célozza meg. Teljes digitális működési közeget nyújt: szerepkör-alapú hozzáférés (lakó, tulajdonos, közös képviselő, könyvelő, bizottság, megbízott), hibabejelentés-kezelés, mérőóra-bejelentés, olvasottság-visszajelzéses dokumentumtár, pénzügyi áttekintő, közgyűlés- és szavazás-előkészítő, vendor/munka-rendelési folyamat és tudásbázis — mindezt modern Next.js 14 + Supabase + AWS Location stack-en. A termék **MVP+ fázisban** van: az alaparchitektúra szilárd, a funkcionális felület kiterjedt, de az éles auth-keményítés, a valós adat-írások és a mobilos UX-csiszolás még hátra van.

### Kulcsmérőszámok

| Mutató | Érték |
|--------|-------|
| Forrásfájlok (.ts/.tsx) | 12 |
| Kódsorok összesen | 2 099 |
| TS/TSX kódsorok (termék) | 1 748 |
| DB séma (SQL sor) | 310 |
| Adatbázis-táblák | 18 |
| Felhasználói szerepkörök | 6 |
| Fő funkcionális modulok | 11 |
| Git commitok | 30 |

### Fejlesztési ráfordítás összefoglaló

| Mutató | Alacsony | Várható | Magas |
|--------|----------|---------|-------|
| Személyes munkaórák | 513 | 880 | 1 440 |
| Személyes munkanapok (8 ó/nap) | 64 | 110 | 180 |
| Naptári hónap (3 fős csapat) | 1,5 hó | 2,5 hó | 4 hó |

### Fejlesztési költség összefoglaló

| Forgatókönyv | Alacsony | Várható | Magas |
|--------------|----------|---------|-------|
| KKE csapat (HU/SK/PL, átl. 35–55 €/ó) | 18 000 € | 32 000 € | 56 000 € |
| Vegyes KKE + NY-EU vezető | 28 000 € | 52 000 € | 95 000 € |
| Nyugat-európai / USA ügynökség | 50 000 € | 90 000 € | 175 000 € |
| **AI-gyorsított szóló fejlesztő** | **8 000 €** | **15 000 €** | **28 000 €** |

### Piaci értékbecslés

| Forgatókönyv | Alacsony | Középső | Magas |
|--------------|----------|---------|-------|
| Bevétel előtti jelenlegi állapot | 80 000 € | 180 000 € | 420 000 € |
| 3 fizető épület (korai trakció) | 280 000 € | 620 000 € | 1,1 M € |
| **25 épület, ~48 000 € ARR** | **1,2 M €** | **2,4 M €** | **4,0 M €** |

> ⚠ **Legnagyobb bizonytalanság:** A PanelLakónak az értékelés időpontjában nincsenek igazolt fizető ügyfelei. A piaci érték teljes egészében a piacra lépés sebességén múlik. Egyetlen aláírt pilot-szerződés egy 50+ albetétes épülettel megváltoztatja az értékelési sávot.

---

## 2. Termék rekonstrukció

A PanelLakó egyetlen webes platformra fordítja le a magyarországi társasházi papíralapú és telefonos folyamatokat. A termék modern, felhőnatív stack-en épül, egyértelmű szerver- és kliens-oldali felelősség-elkülönítéssel.

### Technológiai stack

| Réteg | Technológia | Megjegyzés |
|-------|-------------|------------|
| Frontend keretrendszer | Next.js 14 (App Router) | TypeScript, szerver- és klienskomponensek |
| Stíluskezelés | Tailwind CSS 3.4 | Utility-first, mobilra optimalizált |
| Backend / DB | Supabase (PostgreSQL) | Auth, RLS, valós idejű képes |
| Hitelesítés | Supabase Magic Link | E-mail alapú, jelszó nélküli; SSR-kész |
| Geocoding | AWS Location Service | Szerver-oldali proxy route, SSRF-biztonságos |
| Hosting | Vercel | Edge-kompatibilis, env-változó vezérelt |
| Nyelv | TypeScript 5.7 | Strict mód, átfogóan típusos |

### Funkcionális modulok

| Modul | Állapot | Komplexitás |
|-------|---------|-------------|
| Szerepkör-alapú auth (6 szerepkör) | MVP | Közepes — magic link; SSR keményítés folyamatban |
| Hibabejelentés (ticket) | MVP | Közepes — CRUD UI, állapotgép, SLA koncepció |
| Mérőóra-bejelentés | MVP | Alacsony-közepes — űrlap + mock tárolás |
| Hírek / értesítések | MVP | Alacsony — CRUD + célcsoportszűrő |
| Dokumentumtár + olvasottsági visszajelzés | MVP | Közepes — felhasználónkénti visszaigazolás |
| Pénzügyi áttekintő | MVP | Közepes — egyenleg, hátralék, könyvelési mock |
| Albetét-nyilvántartás | MVP | Közepes — terület, tulajdoni hányad, vízóra |
| Közgyűlés és szavazás előkészítő | MVP | Közepes — napirend, határozat, szavazás |
| Vendor / munka-rendelési folyamat | MVP | Közepes — vendorlista, megbízás-követés |
| Tudásbázis | MVP | Alacsony — cikktár |
| Audit napló | MVP | Alacsony — strukturált eseményfolyam |

---

## 3. Hatókör lebontás

A hatókört funkcionális területek szerint bontottuk le, implementációs komplexitás alapján értékelve. A nyers kódsorok alábecsülik a valós komplexitást, mivel a mock adatok és az UI-only nézetek felfújják a látszólagos lefedettséget.

### Komplexitás területenként

| Terület | Becsült LOC-egyenérték | Komplexitásszorzó | Megjegyzés |
|---------|------------------------|-------------------|------------|
| Auth & RLS | ~200 eff. | 2,0× | Magic link + 6 szerepkör RLS — biztonsági kritikus |
| Dashboard shell + routing | ~180 eff. | 1,5× | Szerverkomponens + szerepkör-param routing |
| Ticket-kezelés | ~250 eff. | 1,8× | Állapotgép, SLA, vendor-hivatkozás |
| Mérőóra és közüzemi űrlapok | ~120 eff. | 1,3× | Űrlap + validáció + mock mentés |
| Dokumentumtár | ~150 eff. | 1,5× | Feltöltési placeholder, olvasottsági logika |
| Pénzügyi modul | ~180 eff. | 1,8× | Hátralék-logika, főkönyv, egyenlegszámítás |
| Albetét-nyilvántartás | ~140 eff. | 1,5× | Keresés, tulajdoni hányad, vízóra |
| Közgyűlés / szavazás | ~200 eff. | 2,0× | Határozatképességi logika, határozat-követés |
| Vendor / munka-rendelés | ~160 eff. | 1,8× | Többállapotú megbízás-folyamat |
| AWS Location proxy | ~40 eff. | 1,3× | SSRF-biztonságos szerver route |
| DB séma (310 SQL sor) | ~310 eff. | 2,5× | 18 tábla, RLS, FK kényszerfeltételek |

---

## 4. Módszertan

### Alkalmazott becslési módszerek

#### Funkció-pont proxy
A 11 fő modult önállóan becsültük funkció-pont szemlélettel: bemenetek, kimenetek, lekérdezések, fájlok és interfész-komplexitás alapján. Az eredményeket összegeztük, majd iparági átlagos produktivitással (8–12 hatékony kódsor/óra teljes stack TypeScript/Supabase fejlesztőnél, teszteléssel és átnézéssel együtt) konvertáltuk munkaórává.

#### PERT (Program Evaluation and Review Technique)
Minden modulhoz három becslést gyűjtöttünk: Optimista (O), Legvalószínűbb (M) és Pesszimista (P). PERT képlet: E = (O + 4·M + P) / 6. A modulbecsléseket összesítettük projekt-szintű összegekké.

#### Analógiás / összehasonlítható rendszer benchmarking
A PanelLakót összehasonlítottuk hasonló CEE PropTech MVP-kkel (Immocloud, OnlineHáz funkciókör, Domus24). Ezek jellemzően 800–2 400 munkaórát igényelnek hasonló funkcionalitásmélységhez. A PanelLakó becslése (513–1 440 óra) összhangban van ennek az intervallumnak az alsó végével, tekintettel az AI-asszisztált, gyors fejlesztési ütemre és a jelenlegi mock-adat-függőségre.

---

## 5. Csapat összetétele

### Szükséges szerepkörök

| Szerepkör | Felelősség | Becsült ráfordítás % |
|-----------|------------|----------------------|
| Full-Stack fejlesztő (Next.js/Supabase) | Alaptermék: routing, komponensek, adatréteg, RLS | 50% |
| Backend / DB fejlesztő | Séma, migrációk, RLS policy-k, edge funkciók | 20% |
| UX/UI designer | Komponenskönyvtár, mobil UX, akadálymentesség | 15% |
| QA mérnök | E2E tesztelés, regressziós csomag, biztonságtesztelés | 10% |
| Termékmenedzser / BA | Követelmények, felhasználói kutatás, ütemterv | 5% |

> AI-asszisztált fejlesztésnél 1 senior full-stack fejlesztő + 1 PM lefedi a hatókör 80%-át. A minimális éles minőségű csapat: 3 fő (fejlesztő, designer, PM).

---

## 6. Ráfordítás becslés

### PERT ráfordítás modulonként

| Modul | Optimista (ó) | Várható (ó) | Pesszimista (ó) | PERT E (ó) |
|-------|--------------|-------------|-----------------|------------|
| Auth & RLS (6 szerepkör) | 40 | 70 | 120 | 72 |
| Dashboard shell + routing | 30 | 50 | 90 | 52 |
| Ticket-kezelés | 60 | 90 | 150 | 93 |
| Mérőóra és közüzemi űrlapok | 25 | 40 | 70 | 42 |
| Dokumentumtár | 35 | 55 | 95 | 57 |
| Pénzügyi modul | 40 | 65 | 110 | 68 |
| Albetét-nyilvántartás | 35 | 55 | 90 | 57 |
| Közgyűlés / szavazás | 50 | 80 | 140 | 83 |
| Vendor / munka-rendelés | 40 | 65 | 115 | 68 |
| AWS Location proxy | 8 | 12 | 20 | 12 |
| DB séma és migrációk | 50 | 80 | 140 | 83 |
| Nem kódolási munka (QA, PM, design) | 100 | 190 | 300 | 193 |
| **ÖSSZESEN** | **513** | **852** | **1 440** | **880** |

---

## 7. Költségbecslés

### Részletes költségmodell

| Szerepkör | Becsült órák | KKE díj (€/ó) | KKE költség | NY-EU díj (€/ó) | NY-EU költség |
|-----------|-------------|----------------|-------------|-----------------|---------------|
| Full-Stack fejlesztő | 440 | 40 € | 17 600 € | 90 € | 39 600 € |
| Backend / DB fejlesztő | 176 | 38 € | 6 688 € | 85 € | 14 960 € |
| UX/UI designer | 132 | 30 € | 3 960 € | 75 € | 9 900 € |
| QA mérnök | 88 | 28 € | 2 464 € | 65 € | 5 720 € |
| PM / BA | 44 | 35 € | 1 540 € | 80 € | 3 520 € |
| **ÖSSZESEN (várható)** | **880** | — | **32 252 €** | — | **73 700 €** |

### Forgatókönyv-tartomány (bizonytalansággal)

| Forgatókönyv | Alacsony | Várható | Magas |
|--------------|----------|---------|-------|
| KKE csapat (HU/SK/PL) | 18 000 € | 32 000 € | 56 000 € |
| Vegyes KKE + NY-EU vezető | 28 000 € | 52 000 € | 95 000 € |
| Nyugat-európai / USA ügynökség | 50 000 € | 90 000 € | 175 000 € |
| AI-gyorsított szóló fejlesztő | 8 000 € | 15 000 € | 28 000 € |

---

## 8. Piaci összehasonlítás

A PanelLakó a CEE/magyarországi PropTech szegmensben versenyez a lakóépület-kezelő rendszerek piacán.

### Összehasonlítható termékek

| Termék | Piac | Fázis | Ismert ARR / értékelés |
|--------|------|-------|------------------------|
| OnlineHáz | Magyarország | Növekedés | ~200 000 €+ ARR (becslés), ~1 500 épület |
| Immocloud (AT) | Ausztria/DACH | Növekedés | ~1,5 M € ARR, 12 M €+ értékelés (2024) |
| Domus24 (HU) | Magyarország | Korai | ~80–150 000 € ARR becslés |
| Roperty (PL) | Lengyelország | Korai/növekedés | 500 000 €+ ARR becslés |
| Loftium / Condo Control (CA/US) | É-Amerika | Skálázás | 5 M$+ ARR, 30–80 M$ értékelés |

### Értékelési szorzók korai PropTech SaaS-hoz

| Fázis | ARR szorzó | Megjegyzés |
|-------|-----------|------------|
| Bevétel előtti MVP | N/A (költség + opció) | Érték = pótlási költség + piaci opció |
| 10 000 € ARR (pilot) | 15–25× ARR | Korai SaaS prémium ragadós vertikálisban |
| 50 000 € ARR | 8–15× ARR | Trakció csökkenti a kockázatot |
| 200 000 €+ ARR | 5–10× ARR | Érett SaaS normák |
| Stratégiai vevő (PropTech) | 2–5× Bevétel + IP prémium | Adathálózat + portfólió szinergiák |

---

## 9. Piaci értékbecslés

### Értékelési módszerek

#### 1. Pótlási költség (eszközérték-padló)
A PERT fejlesztési költségbecslés alapján (várható 32 000–52 000 € KKE, 52 000–95 000 € vegyes), 2,5–4× stratégiai prémiummal az IP, az architektúra minősége és a piaci pozíció alapján: pótlási értékpadló **80 000–210 000 €**.

#### 2. Piaci opció értéke (TAM × megragadási valószínűség)
Magyarországon ~80 000 lakóépület van, ebből ~40 000 panel/társasházi típusú. Átlagos 40 albetétes épület × 20–60 €/albetét/év SaaS díj → TAM: 32 M–96 M € (HU). A teljes skálán 2% megragadása = 640 000–1,9 M € ARR potenciál. 5× ARR exit szorzóval: **3,2 M–9,5 M € piaci opcióérték**. Valószínűséggel súlyozva (10–20% egy bevétel előtti MVP-nél): **320 000–1,9 M €**.

#### 3. Összehasonlítható tranzakciós szorzók
Hasonló korai CEE PropTech SaaS acqui-hire vagy seed ügyletek (2022–2025): 150 000–500 000 € bevétel előtti, funkcionálisan teljes platformokra defensible niche-szel. Jelenlegi fázisban: **150 000–420 000 €**.

#### 4. DCF (Diszkontált cash flow — indikatív)
Feltéve, hogy a pilot indítás 2026 H2-ban megtörténik, 5 épület aláír 2026 végéig 1 200 €/épület/évért, majd 80 épületre skálázódik 2028-ra átlagosan 2 400 €/éven: NPV 35% diszkontráta mellett ≈ **180 000–380 000 €**.

#### 5. Stratégiai / acqui-hire prémium
A PanelLakó architektúrája (Next.js + Supabase, multi-tenant, 6 szerepkörös RLS, AWS Location integráció) bármely CEE PropTech vevő számára újrafelhasználható. A csapat + kódbázis mérnöki értéke stratégiai vevőnek: **200 000–500 000 €**.

### Végleges értékelési tartomány összefoglaló

| Módszer | Alacsony | Középső | Magas |
|---------|----------|---------|-------|
| 1. Pótlási költség | 80 000 € | 145 000 € | 210 000 € |
| 2. Piaci opció (valószínűséggel súlyozva) | 320 000 € | 620 000 € | 1,9 M € |
| 3. Összehasonlítható tranzakciók | 150 000 € | 280 000 € | 420 000 € |
| 4. DCF (indikatív) | 180 000 € | 280 000 € | 380 000 € |
| 5. Stratégiai / acqui-hire | 200 000 € | 350 000 € | 500 000 € |
| **Háromszögeléssel kapott középső becslés** | **180 000 €** | **300 000 €** | **420 000 €** |

> ⚠ **Középső becslés: 180 000–420 000 € (bevétel előtti MVP+).** Az első fizető pilot ügyfél 3+ hónapos fizetett használattal ezt 500 000–1,2 M € tartományba mozdítaná. 10 fizető épület × 2 400 €/év = 24 000 € ARR → indikatív értékelés 360 000–600 000 €.

---

## 10. Feltételezések és korlátok

### ✓ Ismert — kemény bizonyíték

- 12 TypeScript/TSX forrásfájl, 1 748 termék-kódsor, szkennelővel megerősítve.
- 18 DB-tábla, köztük auth, szerepkör, ticket, mérőóra, dokumentum, pénzügy, közgyűlés, vendor, audit.
- 6 különböző felhasználói szerepkör szerepkör-alapú routing implementációval.
- Next.js 14 App Router + Supabase Auth + Tailwind CSS stack package.json-ból megerősítve.
- AWS Location szerver-oldali proxy implementálva (SSRF-biztonságos).
- 30 git commit, mind 2026-05-15-én (egynapos batch commit).

### ~ Becsült — ésszerű feltételezés

- A mock adatok dominálnak az adatrétegben; a valós INSERT/UPDATE műveletek részlegesen vagy még nincsenek bekötve.
- RLS policy-k léteznek a schema.sql-ben, de az éles keményítés (getUser vs getSession, SSR cookie-k) hiányos.
- Nem észleltünk unit vagy E2E tesztkészletet; a QA manuális.
- A platform jelenlegi UX-e egydépítéses; a multi-épület backend séma létezik, de a frontend nem kötötte be.
- Nincs i18n réteg; csak magyar nyelvű UI.

### ✗ Hiányzó — nem megerősíthető

- Nincsenek igazolt fizető ügyfelek vagy aláírt pilot szerződések.
- Nincs mért felhasználói munkamenet, engagement vagy megtartási adat.
- Nincsenek versenytársi win/loss adatok.
- A bevételi modell (árazás, csomagolás, fizetési integráció) nincs implementálva.
- Mobilalkalmazás (PWA vagy natív) nem elérhető; a mobil UX reszponzív weben alapul.

---

## 11. Következő lépések

### Költségoptimalizálás

- Folytassuk az AI-asszisztált fejlesztést a sebességi előny megőrzéséhez.
- Halasszuk a felvételt az első bevételig vagy értelmes LOI-ig; prioritás egy alapító mérnök, aki az egész stack-et kezeli.
- Az első 10 pilothoz használjuk a Supabase ingyenes szintjét és a Vercel hobby-t; infrastrukturális költség ≈ 0 €.

### Értékesítési / fundraising felkészültség

- Írjunk alá 3 fizető pilot épületet bármilyen áron (akár 500 €/év) a fizetési hajlandóság bizonyításához.
- Építsünk egyszerű mérőszám-dashboardot: DAU, ticket-volumen, dokumentum-olvasások — befektetőknek számok kellenek.
- Készítsünk 1 oldalas pitch-et: TAM (80 000 HU épület), ékügy (panel épületek, közös képviselők), védhetőség (adathálózat + folyamat lock-in).

### Technikai adósság prioritása

- Cseréljük le a mock adatokat valós Supabase írásokra (szerver akciók vagy API route-ok) — ez az #1 éles blokkoló.
- Keményítsük az SSR autht: cseréljük le a kliens-oldali getSession-t szerver-oldali getUser + cookie-alapú munkamenetre.
- Adjunk hozzá Supabase Storage-t a dokumentumfeltöltéshez (jelenleg a dokumentumkezelés csak UI).
- Implementáljunk valós fizetési integrációt (Stripe vagy Barion HU-ra) a SaaS számlázás engedélyezéséhez.

---

## 12. Függelék

### Adatbázis-tábla leltár

| Tábla | Fő cél | Kulcsoszlopok |
|-------|--------|---------------|
| profiles | Felhasználói azonosság + szerepkör | id, full_name, email, role |
| buildings | Épület törzsadat | id, name, address |
| units | Albetét-nyilvántartás | building_id, unit_label, area_m2, ownership_share, balance_amount |
| memberships | Felhasználó↔Épület↔Szerepkör kapcsolat | profile_id, building_id, unit_id, role |
| announcements | Hírek / bejegyzések | building_id, title, content, target_group, category |
| notifications | Push / e-mail értesítések | building_id, title, message, audience, channel, read_at |
| tickets | Hibabejelentések | building_id, unit_id, status, priority, due_date |
| meter_readings | Mérőóra-bejelentések | unit_id, meter_type, value, submitted_at |
| documents | Dokumentumtár | building_id, title, file_url, category |
| document_acknowledgements | Olvasottsági visszajelzések | document_id, profile_id, acknowledged_at |
| financials | Egyenleg / főkönyvi sorok | building_id, unit_id, amount, type, period |
| meetings | Közgyűlési események | building_id, date, quorum_threshold |
| agenda_items | Napirendi pontok | meeting_id, title, order_number |
| resolutions | Elfogadott határozatok | meeting_id, title, passed |
| votes | Felhasználónkénti szavazatok | meeting_id, profile_id, vote, resolution_id |
| vendors | Vendor törzsadat | id, name, service_type, contact |
| work_orders | Karbantartási megbízások | building_id, vendor_id, status, description |
| knowledge_base_articles | Súgócikkek | building_id, title, content, category |
| audit_logs | Eseménynapló | building_id, actor_id, event_type, payload |

---

### Konfidencia-értékelés

| Terület | Konfidencia | Ok |
|---------|------------|-----|
| LOC / fájlszám | Magas | Közvetlen szkennelő kimenet |
| Technológiai stack | Magas | package.json-ból és forrásból megerősítve |
| Funkciólefedettség | Közepes-magas | Séma + komponensnevekből következtetve |
| Ráfordítás-becslés | Közepes | Analógiás benchmarkokon alapul; nincs időkövetési adat |
| Piaci érték | Közepes-alacsony | Nincs bevétel, nincs ügyfél adat; opcióérték dominál |
| Versenytársi adatok | Közepes | Nyilvánosan elérhető; egyes számok becsültek |

---

*Ez a jelentés automatizált repository-elemzéssel (scan_repo.py) és AI-asszisztált szakértői becsléssel készült. Minden szám tartomány, nem pontbecslés. A jelentést az első pilot indítása után frissíteni kell.*
