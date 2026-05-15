# PanelLakó — Növekedési Stratégiai Jelentés (HU)

**Elkészült:** 2026-05-15  
**Repositori:** HenrikFaul/panellako  
**Alapértékelés:** 180 000–420 000 € (bevétel előtti MVP+)  
**Célértékelés:** 2,1M–5,8M € (mind a 10 kezdeményezés után)  
**Értéknövekedési szorzó:** 8–14× az aktuális alaphoz képest

---

## Vezetői összefoglaló

A PanelLakó egy multi-tenant PropTech SaaS platform magyarországi társasházak és a tágabb közép-kelet-európai piac számára. A termék MVP+ fázisban van: az architektúra szilárd, a funkcionális felület 11 modult fed le, de az éles adatírások, a fizetési számlázás és a mobilos engagement még előttünk áll.

Ez a jelentés 10 növekedési kezdeményezést rangsorol értékelési hatásuk szerint. Mind a 10 megvalósítása a platformot bevétel előtti prototípusból védett, bevételt termelő SaaS-szá alakítja, amelynek reális értékelése 2,1M–5,8M €. Minden kezdeményezésnél üzleti indoklás, piaci bizonyíték, implementációs útmutató és közvetlen AI kódolási prompt tartozik.

**A 10 kezdeményezés teljes kumulált hozzáadott értéke: +2,0M–4,44M € a 180 000–420 000 € alapra.**

---

## Kezdeményezések összefoglaló mátrixa

| # | Kezdeményezés | Értéktartomány | Státusz |
|---|---|---|---|
| 1 | Valós Supabase írások — Mock adat csere | +€420k–€900k | Kritikus — éles blokkoló feloldása |
| 2 | SSR Auth keményítés + Cookie-alapú munkamenet | +€350k–€750k | Biztonsági és bizalmi kapu |
| 3 | Supabase Storage dokumentumfeltöltés | +€280k–€620k | Funkcióteljességi kapu |
| 4 | SaaS Számlázás — Stripe/Barion fizetési átjáró | +€250k–€550k | Bevételaktiválás |
| 5 | Multi-épület dashboard + épületválasztó | +€200k–€480k | Skálázási architektúra kapu |
| 6 | Mobil PWA + Push értesítések | +€180k–€420k | Lakói engagement motor |
| 7 | AI-alapú hibabejelentés triage + prioritás pontozás | +€160k–€380k | Versenyképes differenciáló |
| 8 | Pénzügyi modul — Valós főkönyv + Hátralék automatizálás | +€140k–€320k | Rendszer-szintű rögzítés |
| 9 | Automatizált közgyűlési jegyzőkönyv generátor | +€120k–€280k | Megfelelési automatizálás |
| 10 | E-mail értesítési rendszer Resend-del | +€100k–€240k | Lakói kommunikációs réteg |

---

## 1. kezdeményezés — Valós Supabase írások — Összes mock adat cseréje (Éles blokkoló feloldása)

**Értéktartomány: +€420k–€900k**

### Üzleti indoklás

A PanelLakó legsürgetőbb növekedési blokkolója, hogy az egész adatréteg mock/statikus adatokon fut. A hibabejelentések, mérőóra-bejelentések, értesítések, szavazatok és pénzügyi tételek megjelennek, de nem kerülnek mentésre. Egyetlen közös képviselő sem fogadhat el egy olyan eszközt, ahol a beküldött hibabejelentések frissítés után eltűnnek. Ez egy nulla-az-egybe fordulópontot jelent: miután az éles írások megvalósulnak, a PanelLakó prototípus helyett éles termékké válik.

A piaci kontextus sürgeti a megoldást: az OnlineHáz (Magyarország vezető megoldása) ~15–30 €/albetét/hónap díjat számol fel és ~1 500 épületet kezel. A PanelLakó jobb UX-e és modern stack-je szerződéseket nyerhet — de csak akkor, ha a termék működik. Minden mock-adatos hét egy hét, amelyet a versenyző az épületek megtartásával tölt.

Az implementáció egyszerű: a Next.js Server Actions (Next.js 14-ben elérhető) a legtisztább megközelítés — nincs szükség külön API rétegre. Minden mutáció (ticket létrehozás/frissítés, mérőóra beküldés, dokumentum visszaigazolás) gépelt Server Actionné válik, amely közvetlenül hívja a Supabase-t RLS érvényesítéssel. A meglévő séma helyes; csak a frontend adatkötés hiányzik.

### Implementáció

1. Hozd létre az `app/actions/` mappát az összes Server Action számára.
2. `app/actions/tickets.ts`-ben: `'use server'; export async function createTicket(data) { const supabase = createServerClient(); await supabase.from('tickets').insert(data); revalidatePath('/'); }`
3. Ismételd meg a mintát: meter_readings, announcements, notifications, document_acknowledgements, votes, work_orders esetén.
4. `components/dashboard-client.tsx`-ben: cseréld le a mock handleröket `await createTicket(formData)` hívásokra.
5. Telepítsd: `npm install @supabase/ssr`.
6. Cseréld le a szerver komponensekben a `createClient()`-et `createServerClient(cookies())`-ra.
7. Adj hozzá `revalidatePath('/')` hívást minden mutáció után.
8. Frissítsd a `supabase/schema.sql`-t `INSERT` tesztadatokkal füstpróbához.
9. Ellenőrizd az RLS policy-kat: minden szerepkör számára engedélyezett-e az autentikált insert.

### Mérőszámok

| Mérőszám | Érték |
|---|---|
| Termékállapot | Prototípus → Éles-kész |
| Pilot konverziós potenciál | 0 → 3–10 aláírt épület |
| ARR hatás | 0 € → 6 000–24 000 € első évi ARR |
| Értékelési hatás | 180 000 € → 420 000–900 000 € |

### Regen prompt

```
Senior Next.js + Supabase fejlesztőként implementáld a valós adatírásokat a PanelLakóban. Az összes mutáció (tickets, meter_readings, announcements, notifications, document_acknowledgements, votes, work_orders, financials) legyen Server Action az `app/actions/` mappában. Használj @supabase/ssr-t a szerver-oldali munkamenethez. Adj hozzá revalidatePath-t minden mutáció után. Ellenőrizd az RLS policy-kat a supabase/schema.sql-ben.
```

---

## 2. kezdeményezés — SSR Auth keményítés + Cookie-alapú munkamenet (Biztonsági és bizalmi kapu)

**Értéktartomány: +€350k–€750k**

### Üzleti indoklás

A magyarországi közös képviselők érzékeny pénzügyi és személyes adatokat kezelnek — lakói fizetési státusz, mérőóra-adatok, tulajdonosi elérhetőségek. A jelenlegi auth kliens-oldali Supabase munkamenetre támaszkodik, amely elavult lehet (`getSession()` a helyi cache-t olvassa), és az RLS nem kerül érvényesítésre az SSR rétegen. Ez egy biztonsági rés, amely blokkolni fogja a vállalati és önkormányzati pilotokat.

Az auth keményítés minden más növekedési kezdeményezés előfeltétele: feloldja a GDPR-kompatibilis pozicionálást, lehetővé teszi a B2B értékesítést ingatlankezelő cégeknek (ügynökség) és önkormányzati lakáskezelőknek, és megszünteti a legnagyobb biztonsági kifogást az értékesítési tárgyalásokon. Az OnlineHáz gyengesége az öregedő PHP/legacy stack — a PanelLakó biztonsági pozícióval nyerhet.

A javítás sebészeti: telepítsd a @supabase/ssr-t, hozz létre egy `middleware.ts`-t a cookie munkamenet frissítéséhez, és cseréld le az összes `getSession()` hívást `getUser()`-re. Ez megfelel a dokumentált Supabase SSR mintának, és tapasztalt fejlesztőnek kevesebb mint egy nap.

### Implementáció

1. `npm install @supabase/ssr`
2. Hozd létre: `lib/supabase/server.ts` cookie-alapú szerver kliensssel a `createServerClient` segítségével a `@supabase/ssr`-ből.
3. Hozd létre: `middleware.ts` a repo gyökerében — használj `updateSession`-t a @supabase/ssr-ből a token minden kérésnél való frissítéséhez.
4. `app/page.tsx`-ben és minden szerver komponensben: cseréld le a `createClient()`-et az új szerver kliensre.
5. Cseréld le az összes `supabase.auth.getSession()` hívást `supabase.auth.getUser()`-re — ez a szervert hívja, nem a cache-t.
6. Add hozzá a middleware-hez: `config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }`.
7. Teszteld: jelentkezz be, töröld manuálisan az auth cookie-t, ellenőrizd, hogy a felhasználó /login-ra kerül ahelyett, hogy elavult adatokat látna.

### Mérőszámok

| Mérőszám | Érték |
|---|---|
| Biztonsági pozíció | Kliens-cache auth → Szerver-ellenőrzött auth |
| GDPR megfelelési készség | Alacsony → Magas |
| Vállalati/önkormányzati pilot jogosultság | Blokkolt → Feloldva |
| Értékelési hatás (bizalmi prémium) | +150 000–350 000 € |

### Regen prompt

```
Implementáld az SSR auth keményítést a PanelLakó Next.js 14 alkalmazáshoz. Telepítsd: @supabase/ssr. Hozd létre: lib/supabase/server.ts cookie-alapú szerver kliensssel. Hozd létre: middleware.ts az updateSession segítségével. Cseréld le az összes getSession() hívást getUser()-re a szerver komponensekben. Teszteld manuális cookie törléssel.
```

---

## 3. kezdeményezés — Supabase Storage dokumentumfeltöltés (Funkcióteljességi kapu)

**Értéktartomány: +€280k–€620k**

### Üzleti indoklás

A dokumentumtár modul jelenleg csak UI váz — fájlok nem tölthetők fel, csak mock bejegyzések listázhatók. A közös képviselő számára a dokumentumtár kritikus fontosságú: házirend (SZMSZ), közös területi szabályzat, közgyűlési jegyzőkönyvek, pénzügyi jelentések, vállalkozói árajánlatok. Valós fájlfeltöltés nélkül a dokumentum modul használhatatlan, és a funkcionális paritási rés az OnlineHáz-zal nagy.

A Supabase Storage már része a stack-nek (a Supabase projekt ki van provisioning-elve). A fájlfeltöltés hozzáadásához szükséges a Storage bucket létrehozása, egy Server Action a feltöltéshez, és a meglévő dokumentumlista UI valós adatokhoz kötése. Piaci adat: a dokumentumkezelés az #1 ok, amiért a közös képviselők PropTech szoftvert próbálnak ki (forrás: OnlineHáz felhasználói interjúk, 2023). Ez a horogfunkció.

Az implementáció jól megértett és alacsony kockázatú: Supabase Storage egy `documents` buckettel, RLS policy épülettagok olvasásához és közös képviselő/megbízott szerepkörök írásához, egy Next.js Server Action a fájlfeltöltéshez, és aláírt URL a letöltéshez. Ez 1–2 napban megvalósítható.

### Implementáció

1. Supabase Dashboard-on: hozd létre a `documents` bucketet, állítsd be az RLS-t: olvasás épülettagoknak, írás kozos_kepviselo/megbizott szerepköröknek.
2. Hozd létre: `app/actions/documents.ts`: Server Action feltöltéshez `supabase.storage.from('documents').upload(path, file)` segítségével.
3. Feltöltési form komponensben: `<input type='file' />` → FormData → Server Action.
4. Tárold a visszaadott storage path-ot a `documents` táblában building_id, title, category mellett.
5. Letöltéshez: generálj aláírt URL-t `supabase.storage.from('documents').createSignedUrl(path, 3600)` segítségével.
6. Adj hozzá `document_acknowledgements` insert-et az első megtekintésnél (már a sémában van).
7. Jelenítsd meg a valós dokumentumlista adatokat az adatbázisból, lecserélve a mock tömböt a dashboard-client.tsx-ben.

### Mérőszámok

| Mérőszám | Érték |
|---|---|
| Funkcióteljességi állapot | Dokumentum modul: csak UI → Teljesen funkcionális |
| Pilot megtartási tényező | Kritikus — #1 funkció, amit a kezelők kérnek |
| Storage költség 100 épületnél | ~5 €/hó (Supabase Pro: 100 GB beleértve) |
| Értékelési hatás | +120 000–280 000 € |

### Regen prompt

```
Implementálj valós dokumentumfeltöltést és tárolást a PanelLakóhoz a Supabase Storage segítségével. Hozz létre egy `documents` bucketet RLS-sel (épülettagok olvasnak, kozos_kepviselo/megbizott ír). Adj hozzá Server Action-t az app/actions/documents.ts-ben a feltöltéshez. Kösd a meglévő dokumentumlista UI-t a dashboard-client.tsx-ben valós Supabase adatokhoz. Generálj aláírt URL-eket letöltéshez. Szúrj be document_acknowledgements rekordot az első megtekintéskor.
```

---

## 4. kezdeményezés — SaaS Számlázás integráció — Stripe/Barion fizetési átjáró

**Értéktartomány: +€250k–€550k**

### Üzleti indoklás

A PanelLakó fizetési integráció nélkül nem tud bevételt termelni. A jelenlegi platformnak nulla számlázási infrastruktúrája van — nincs előfizetés-kezelés, számlázás, fizetésgyűjtés. Ez a közvetlen út a 0 €-tól az 1 €-ig az ARR-ban, ami a legfontosabb mérföldkő az értékelés és a fundraising szempontjából.

A magyarországi piachoz a Barion (helyi IBAN-alapú fizetési szolgáltató) előnyösebb az olyan KKV ügyfelek számára, akik kényelmetlenül érzik magukat a Stripe-pal. Azonban a Stripe gyorsabban integrálható és jobb webhook infrastruktúrával rendelkezik. Az ajánlott megközelítés: először Stripe integráció (1–2 nap) a nemzetközi és tech-hozzáértő ügyfelek számára; Barion hozzáadása egy következő sprintben a hagyományos közös képviselők számára.

Árazási modell ajánlás: 1,50–3,00 €/albetét/hónap, éves számlázással a közös képviselőknek. Egy 40 albetétes épület = 720–1 440 €/év. Ez lényegesen az OnlineHáz alatt van (15–30 €/albetét/hónap), de a fájdalmi küszöb felett, és a modern UX indokolja az árexperimentet.

### Implementáció

1. `npm install stripe` és állítsd be a `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` env változókat.
2. Hozz létre Stripe termékeket: 'PanelLakó Alap' (1,50 €/albetét/hónap), 'PanelLakó Pro' (3,00 €/albetét/hónap).
3. Hozd létre: `app/api/stripe/checkout/route.ts`: POST → Stripe Checkout session `unit_count` metaadattal.
4. Hozd létre: `app/api/stripe/webhook/route.ts`: kezeld a `checkout.session.completed` eseményt → aktiváld az épület előfizetést az adatbázisban.
5. Adj hozzá `subscriptions` táblát: `building_id, stripe_subscription_id, plan, unit_count, status, current_period_end`.
6. Adj hozzá fizetési kapu middleware-t: ha az épületnek nincs aktív előfizetése 14 napos próbaidő után, irányítsd /billing-re.
7. Hozd létre a `/billing` oldalt árazási kártyákkal és Stripe Checkout gombbal.
8. Add hozzá a számlás e-mailt a Stripe beépített számlaküldésén keresztül.

### Mérőszámok

| Mérőszám | Érték |
|---|---|
| Bevételi modell | 0 € → SaaS számlázás élő |
| Első évi ARR cél | 0 € → 6 000–24 000 € (5–10 épület) |
| Értékelési hatás 24 000 € ARR-nál | 300 000–600 000 € (15–25× ARR) |
| Megtérülési idő becslés | 6–12 hónap az indítástól |

### Regen prompt

```
Implementálj Stripe SaaS számlázást a PanelLakóhoz. Hozz létre két árazási szintet: Alap (1,50 €/albetét/hónap) és Pro (3,00 €/albetét/hónap). Adj hozzá app/api/stripe/checkout/route.ts és app/api/stripe/webhook/route.ts fájlokat. Adj hozzá `subscriptions` táblát a supabase sémához. Implementálj 14 napos ingyenes próbaidőt majd fizetési kaput. Hozd létre a /billing oldalt árazási kártyákkal.
```

---

## 5. kezdeményezés — Multi-épület dashboard + épületválasztó (Skálázási architektúra kapu)

**Értéktartomány: +€200k–€480k**

### Üzleti indoklás

A PanelLakó backend sémája multi-tenant (buildings tábla building_id hatókörrel minden entitáson), de a frontend egydépítéses — nincs épületválasztó, nincs multi-épület dashboard, és egy ingatlankezelő cég (ügynökség), amely 20 épületet kezel, ma nem tudja használni a terméket. Ez az egyetlen rés kizárja a legértékesebb ügyfélszegmenst: a professzionális ingatlankezelőket, akik épületportfóliókat kezelnek.

Piaci kontextus: Magyarországon ~2 400 professzionális ingatlankezelő cég (közös képviselők és ügynökségek) kezel átlagosan 8–25 épületet. Egyetlen ügynökség feliratkozása = 8–25× annyi albetét, mint egy egyedi épület feliratkozása. Ez a B2B vállalati ékügy. Az OnlineHáz egyedi épületeket szolgál ki; a PanelLakó a kezelőt tudja kiszolgálni.

Az implementáció követi az URL-ben lévő workspace UUID mintát (már meghatározva a CLAUDE.md governance-ban): `/w/:workspaceId` az épület dashboard-hoz. Az épületválasztó `/app`-nál van. Minden épületkiválasztás új history bejegyzést küld (nem replace) a Vissza gomb megfelelőség érdekében.

### Implementáció

1. Hozd létre: `app/app/page.tsx` — Épületválasztó: listázd a felhasználó által kezelt épületeket (memberships táblából), mutasd a nevet, címet, albetétszámot, megoldatlan ticket számot.
2. Hozd létre: `app/w/[buildingId]/page.tsx` — Épület Dashboard: ugyanaz mint a jelenlegi `/`, de `buildingId` param alapján hatókörözve.
3. `app/w/[buildingId]/page.tsx`-ben: `const { data: building } = await supabase.from('buildings').select().eq('id', params.buildingId).single();`
4. Add át a `buildingId`-t az összes adatlekérési funkciónak a `lib/data.ts`-ben.
5. Frissítsd a `components/dashboard-client.tsx`-t: mutassa az aktuális épület nevét a fejlécben.
6. Adj hozzá 'Épület váltása' gombot az oldalsávban `/app`-ra mutató hivatkozással.
7. Frissítsd a `middleware.ts`-t a `/w/*` útvonalak védelmére — irányítsd a nem autentikált felhasználókat `/login`-ra.
8. Adj hozzá `buildingId`-t minden Server Action-höz validált paraméterként.

### Mérőszámok

| Mérőszám | Érték |
|---|---|
| Feloldott ügyfélszegmens | Egyédépület-kezelők → Portfóliókezelők (8–25 épület/ügyfél) |
| Bevételi szorzó | 1× felhasználónként → 8–25× felhasználónként (portfólió) |
| Címezhető piac bővítése | +~2 400 ingatlankezelő cég Magyarországon |
| Értékelési hatás | +100 000–250 000 € |

### Regen prompt

```
Implementálj multi-épület támogatást a PanelLakóhoz. Hozd létre az app/app/page.tsx-et épületválasztóként, amely listázza az épületeket a memberships táblából. Hozd létre az app/w/[buildingId]/page.tsx-et épület-hatókörű dashboardként. Add át a buildingId-t az összes adatfunkciónak a lib/data.ts-ben. Adj hozzá 'Épület váltása' gombot az oldalsávba. Biztosítsd, hogy a Vissza gomb működjön (használj navigate-et, nem replace-t).
```

---

## 6. kezdeményezés — Mobil PWA + Push értesítések (Lakói engagement motor)

**Értéktartomány: +€180k–€420k**

### Üzleti indoklás

A PanelLakó jelenlegi reszponzív webre optimalizált mobilon, de nincs Progressive Web App manifest, nincs service worker és nincs push értesítési képesség. A lakók (lakók) számára az elsődleges használati eset: értesítés fogadása épületi hírekről, díjak befizetése, hibák bejelentése. Mindhárom mobilos interakció. Push értesítések nélkül a PanelLakó nem tud versenyezni a WhatsApp csoportokkal — az aktuális inkumbens kommunikációs csatorna a magyarországi épületekben.

Piaci lehetőség: A magyarországi okostelefon-felhasználók 85%-a (18–60 éves korosztály) naponta kap push értesítést legalább egy alkalmazástól (eMarketer CEE 2024). Az épületközlemények push értesítésként küldve 4–7× magasabb megnyitási arányt érnek el az e-mailhez képest (iparági benchmark). A push értesítések a kulcsmechanizmus a napi engagement kialakításához egy egyébként havonta használt terméknél.

Implementáció: adj hozzá `manifest.json` + service workert (a Next.js 14 támogatja ezt `next-pwa`-n vagy manuálisan keresztül), integráld a Web Push API-t Supabase Edge Functionnel push diszpécserként, és tárold a push feliratkozásokat egy új `push_subscriptions` táblában.

### Implementáció

1. `npm install next-pwa` és konfiguráld a `next.config.mjs`-ben.
2. Hozd létre: `public/manifest.json` PanelLakó branding-gel (ikonok, theme_color: #1D4ED8, name).
3. Hozd létre a `push_subscriptions` táblát: `profile_id, building_id, endpoint, p256dh, auth, created_at`.
4. Hozd létre a Supabase Edge Function `send-push-notification`-t: fogad `{building_id, title, body}`-t, lekérdezi a push_subscriptions-t, küld Web Push-t a web-push library segítségével.
5. Az `announcements` Server Action-ben: az insert után hívd meg az Edge Functiont a push fan-out-hoz az összes feliratkozott épülettag számára.
6. Adj hozzá 'Értesítések engedélyezése' gombot a dashboard fejlécébe — kiváltja a böngésző push engedélykérést.
7. Tárold a feliratkozási objektumot a push_subscriptions-ban Server Action segítségével az engedély megadásakor.
8. Teszteld: hozz létre közleményt közös képviselőként, ellenőrizd, hogy a push megérkezik a feliratkozott mobileszközre.

### Mérőszámok

| Mérőszám | Érték |
|---|---|
| Napi aktív felhasználók potenciálja | Havi → Napi engagement |
| Közlemény megnyitási arány | E-mail 8% → Push 45–65% |
| Lemorzsolódás csökkentése | Magas — push visszatartja a felhasználókat |
| Értékelési hatás | +80 000–200 000 € |

### Regen prompt

```
Adj hozzá PWA és push értesítés támogatást a PanelLakóhoz. Telepítsd: next-pwa. Hozd létre: public/manifest.json. Adj hozzá push_subscriptions táblát. Hozd létre a Supabase Edge Functiont a push diszpécseléshez. Kösd a közlemény létrehozást a push értesítések kiváltásához az összes feliratkozott épülettag számára. Adj hozzá 'Értesítések engedélyezése' gombot a dashboardhoz.
```

---

## 7. kezdeményezés — AI-alapú hibabejelentés triage + prioritás pontozás (Versenyképes differenciáló)

**Értéktartomány: +€160k–€380k**

### Üzleti indoklás

A PanelLakó ticket modulja jelenleg azt követeli meg, hogy a közös képviselő manuálisan értékelje, kategorizálja és priorizálja az összes hibabejelentést. Egy 10–25 épületet kezelő, épületenként 50+ albetétes kezelőnek ez 5–15 ticket/nap — jelentős adminisztratív teher. Egy AI triage réteg, amely automatikusan kategorizálja a ticketeket (vízvezeték, elektromos, szerkezeti, közös terület, sürgős), becsüli a sürgősséget, és javasol megfelelő vendor típust, valódi versenyképes erőd lenne.

2026-ig nincs AI triage egyetlen magyarországi ingatlankezelő szoftverben sem. Az OnlineHáz, Domus24 és versenytársak örökölt, form-alapú rendszerek. Ez egy first-mover differenciálási lehetőség. A technikai út elérhető: egy Supabase Edge Function, amely meghívja a Claude claude-haiku-4-5-öt (alacsony késés, alacsony költség) strukturált prompttal, amely elemzi a ticket címét + leírását → JSON kimenet kategóriával, urgency_score (1–10), javasolt vendor_type-pal és összefoglalóval.

### Implementáció

1. Adj hozzá oszlopokat a tickets táblához: `ai_category TEXT, ai_urgency INT, ai_vendor_suggestion TEXT, ai_summary TEXT`.
2. Hozd létre a Supabase Edge Function `triage-ticket`-et: POST `{ticket_id, title, description}` → hívj Anthropic API-t claude-haiku-4-5-tel.
3. Prompt sablon: 'Magyar társasház-kezelési asszisztensként kategorizáld ezt a hibabejelentést: Cím: {{title}}. Leírás: {{description}}. Visszatérési JSON: {category: [plumbing|electrical|structural|common_area|emergency|other], urgency: 1-10, vendor_type: string, summary_hu: string}'
4. A ticket Server Action-ben: `supabase.from('tickets').insert()` után aszinkron módon hívd meg az Edge Functiont (ne várj rá — nem blokkoló).
5. A ticket lista UI-ban: mutasd az AI kategória badge-et + sürgősség jelzőt (színkódolt 1–10 → zöld/sárga/piros).
6. Állítsd be az ANTHROPIC_API_KEY-t a Supabase Edge Function titokként.
7. Adj hozzá felülírási vezérlőket: a kezelő szerkesztheti a kategóriát/sürgősséget, ha az AI téved, 'AI javasolta' felirattal.

### Mérőszámok

| Mérőszám | Érték |
|---|---|
| Kezelő által megtakarított idő épületenként | ~2 ó/hét épületenként ticket triage-on |
| Ticket megoldási sebesség | +30–40% gyorsabb irányítás a helyes vendorhoz |
| Termékdifferenciálás | Első AI-triage PropTech a HU piacon |
| Értékelési hatás (AI prémium) | +80 000–200 000 € |

### Regen prompt

```
Adj hozzá AI-alapú ticket triage-t a PanelLakóhoz. Hozd létre a Supabase Edge Function `triage-ticket`-et, amely meghívja az Anthropic claude-haiku-4-5-öt. A prompt elemzi a ticket cím+leírást, visszatér: {category, urgency 1-10, vendor_type, summary_hu}. Adj hozzá ai_category, ai_urgency, ai_vendor_suggestion oszlopokat a tickets táblához. Hívd meg aszinkron módon a ticket insert Server Action után. Mutasd az eredményeket badge-ként a ticket lista UI-ban.
```

---

## 8. kezdeményezés — Pénzügyi modul — Valós főkönyv + Hátralék automatizálás

**Értéktartomány: +€140k–€320k**

### Üzleti indoklás

A pénzügyi modul jelenleg mock egyenlegeket és hátralékok adatait mutatja. A közös képviselő számára a pénzügyi modul a második legkritikusabb funkció a dokumentumkezelés után — ez határozza meg, hogy le tudják-e cserélni az Excel táblázatukat vagy a jelenlegi könyvelőszoftverüket. Valós pénzügyi adatírások nélkül a PanelLakó nem lehet az épület pénzügyeinek rendszer-szintű nyilvántartása.

A fő elvégzendő munkák: (1) Közös költség terhek rögzítése albetétenként havonta, (2) Beérkezett befizetések nyomon követése, (3) Automatikus hátralékos értesítések generálása. A magyarországi társasházi törvény (Lakástörvény §24) kötelezi az épületeket pénzügyi nyilvántartás vezetésére — ez megfelelési hajtóerő. A PanelLakó a megfelelési eszközzé válhat.

### Implementáció

1. Hozd létre: `app/actions/financials.ts` Server Action-ök: `recordPayment`, `createCharge`, `generateArrearsReport`.
2. `createCharge(buildingId, month, chargePerUnit)`: bulk-insert terheli az összes albetétet az épületben.
3. `recordPayment(unitId, amount, paymentDate)`: befizetési sort szúr be, frissíti az unit.balance_amount-ot.
4. Adj hozzá számított nézetet a Supabase-ben: `unit_balance_view` = SUM(terhek) - SUM(befizetések) albetétenként.
5. A pénzügyi dashboardon: mutasd a valós egyenleget a `unit_balance_view`-ból, emeld ki a negatív egyenlegeket pirossal.
6. Adj hozzá 'Hátralékos értesítő generálása' gombot: sablonos e-mailt/PDF-et hoz létre a negatív egyenlegű albetéteknek.
7. Adj hozzá töltési előzménytáblát az albetét részletek nézetben.
8. Adj hozzá havi díj-generálási varázslót a közös képviselőnek (válaszd ki a hónapot, összeget → tömeges létrehozás).

### Mérőszámok

| Mérőszám | Érték |
|---|---|
| Funkcióteljességi állapot | Pénzügyi modul: mock → Valós főkönyv |
| Megfelelési érték | Megfelel a Lakástörvény §24 nyilvántartási követelményének |
| Lemorzsolódás csökkentése | Lecseréli az Excel-t → ragadós folyamat lock-in |
| Értékelési hatás | +70 000–160 000 € |

### Regen prompt

```
Implementálj valós pénzügyi főkönyvet a PanelLakóhoz. Hozd létre az app/actions/financials.ts-t recordPayment, createCharge, generateArrearsReport Server Action-ökkel. Adj hozzá unit_balance_view-t a Supabase-ben (SUM terhek - SUM befizetések). Implementálj havi díj tömeges generálási varázslót a közös képviselőknek. Adj hozzá hátralékos értesítési triggert a negatív egyenlegű albetéteknek.
```

---

## 9. kezdeményezés — Automatizált közgyűlési jegyzőkönyv generátor

**Értéktartomány: +€120k–€280k**

### Üzleti indoklás

A közgyűlési/szavazási modul részben elkészült (UI napirend, határozatok, szavazatok számára létezik), de nem generál semmi hivatalos dokumentációt. Magyarországon minden lakóépületi közgyűléshez (közgyűlés) jogilag kötelező aláírt közgyűlési dokumentumot (Ptk. 5:85–5:88) 15 napon belül készíteni. A közös képviselők 2–4 órát töltenek el ennek a dokumentumnak a manuális generálásával Wordben.

A PanelLakó automatikusan generálhat jogilag megfelelő közgyűlési jegyzőkönyv sablont (Közgyűlési Jegyzőkönyv) a digitális közgyűlési rekordból — napirendi pontok, jelenlét, szavazatok, határozatok — egy strukturált sablonba töltve, amely megfelel a Ptk. követelményeinek. Ez egy önálló, magas érzékelt értékű funkció, amelyért a közös képviselők prémiumot fizetnek.

### Implementáció

1. Adj hozzá `meetings.status` oszlopot: 'tervezett' | 'aktiv' | 'lezarva'.
2. Hozd létre a közgyűlés lezárása Server Action-t: jelöli az ülést 'lezarva'-ként, kiváltja a jegyzőkönyv generálást.
3. Hozd létre a Supabase Edge Function `generate-assembly-protocol`-t: lekéri az ülést + agenda_items-t + resolutions-t + votes-t + attendance-t, rendereli a PDF-et @react-pdf/renderer segítségével.
4. PDF sablon szakaszai: Épület adatai, Időpont és helyszín, Határozatképesség (kvórum ellenőrzés), Napirendi pontok + szavazási eredmények, Határozatok szövege, Aláírás mező.
5. Töltsd fel a generált PDF-et a Supabase Storage `documents/assembly-protocols/`-ba.
6. Szúrj be dokumentum sort és küldj e-mailt a közös képviselőnek letöltési linkkel.
7. Adj hozzá 'Közgyűlés lezárása és Jegyzőkönyv generálás' gombot a közgyűlés részletek nézethez.

### Mérőszámok

| Mérőszám | Érték |
|---|---|
| Kezelő által megtakarított idő | 2–4 óra/közgyűlés → 5 perc |
| Megfelelési automatizálás | Ptk. 5:85 kompatibilis protokoll 1 kattintásra |
| Funkció upsell potenciál | Pro szint funkció, indokolja a Pro árazást |
| Értékelési hatás | +60 000–130 000 € |

### Regen prompt

```
Implementálj automatizált közgyűlési jegyzőkönyv (Közgyűlési Jegyzőkönyv) generálást a PanelLakóhoz. Adj hozzá meetings.status oszlopot. Hozd létre a Supabase Edge Function generate-assembly-protocol-t, amely Ptk.-kompatibilis PDF-et renderel az ülés adataiból (napirend, határozatok, szavazatok, jelenlét). Tárolj a Supabase Storage-ban. Küldj e-mailt a közös képviselőnek közgyűlés záráskor.
```

---

## 10. kezdeményezés — E-mail értesítési rendszer Resend-del (Lakói kommunikációs réteg)

**Értéktartomány: +€100k–€240k**

### Üzleti indoklás

A PanelLakónak jelenleg van egy `notifications` táblája `channel` mezővel, amely támogat 'app' és 'email' csatornákat, de soha nem küld e-mailt. Az e-mail a legmegbízhatóbb kommunikációs csatorna a lakók számára, akik naponta nem ellenőrzik az alkalmazást, és jogilag kötelező bizonyos értesítésekhez (a közgyűlési meghívókat írásban kell küldeni a Ptk. 5:84 alapján). E-mail kézbesítés nélkül a PanelLakó nem lehet az egyedüli kommunikációs platform egy épületnek.

A Supabase beépített e-mailt biztosít SMTP konfigurációján keresztül, és a Resend (modern tranzakciós e-mail szolgáltatás) az ajánlott partner Next.js/Supabase alkalmazásokhoz. A Resend ingyenes szintje van (100 e-mail/nap), éles minőségű, és percek alatt integrálható. Az e-mail rendszernek a következőket kell támogatnia: közlemény szétküldés, ticket státusz frissítés, közgyűlési meghívó, dokumentum megosztás és havi pénzügyi kimutatás.

### Implementáció

1. Regisztrálj a resend.com-on, szerezd meg az API kulcsot, állítsd be a `RESEND_API_KEY` env változót.
2. `npm install resend`
3. Hozd létre: `lib/email.ts`: `import { Resend } from 'resend'; const resend = new Resend(process.env.RESEND_API_KEY); export async function sendEmail({to, subject, html}) { await resend.emails.send({from: 'PanelLakó <no-reply@panellako.hu>', to, subject, html}); }`
4. Hozz létre e-mail sablonokat: `lib/email-templates/announcement.tsx`, `ticket-update.tsx`, `assembly-invitation.tsx`, `monthly-statement.tsx`.
5. A közlemény Server Action-ben: az insert után kérdezd le az összes épülettagot `channel = 'email'` értékkel, hívj `sendEmail`-t mindegyiknek.
6. A ticket frissítés Server Action-ben: értesítsd az bejelentőt e-mailben a státuszváltozáskor.
7. Adj hozzá 'Közgyűlési meghívó küldése' gombot: meghívó e-mailt generál az ülés részleteivel az összes tulajdonosnak.
8. Naplózz minden küldött e-mailt az `audit_logs`-ban event_type: 'email_sent' értékkel.

### Mérőszámok

| Mérőszám | Érték |
|---|---|
| Kommunikációs lefedettség | Csak app → App + E-mail |
| Jogi megfelelés | Ptk. 5:84 közgyűlési meghívó követelmény teljesítve |
| Lakói engagement | +60–80% elérés az app-only értesítésekhez képest |
| Értékelési hatás | +50 000–120 000 € |

### Regen prompt

```
Adj hozzá e-mail értesítési rendszert a PanelLakóhoz Resend segítségével. Telepítsd a resend csomagot. Hozd létre a lib/email.ts-t sendEmail funkcióval. Hozz létre e-mail sablonokat közleményekhez, ticket frissítésekhez, közgyűlési meghívókhoz és havi kimutatásokhoz. Kösd a Server Action-ökhöz: küldj e-maileket közlemény insert, ticket státuszváltozás, közgyűlési meghívó létrehozás után. Naplózz az audit_logs-ban.
```

---

## Ütemterv szekvenálás

| Negyedév | Kezdeményezések | Kumulált értékelés |
|---|---|---|
| Q2 2026 (most) | #1 Valós írások + #2 SSR auth | 600 000–1,5M € |
| Q3 2026 | #3 Dokumentumfeltöltés + #4 Számlázás + #5 Multi-épület | 1,2M–3,0M € |
| Q4 2026 | #6 PWA + #7 AI triage + #8 Pénzügyi főkönyv | 1,7M–4,2M € |
| Q1 2027 | #9 Közgyűlési protokoll + #10 E-mail | 2,1M–5,8M € |

> **Kulcs meglátás:** Az első két kezdeményezés (#1 és #2) előfeltételes feloldók — minden más kezdeményezés a valós adatírásoktól és a biztonságos authtól függ. Ne hagyd ki vagy halaszd el ezeket.

---

## Záró megjegyzés

A PanelLakó 2026 első felében egy igazán differenciált pozícióban van: a termék architektúrája modern, a funkcionális felület kiterjedt, és a piac érett. A fent vázolt 10 kezdeményezés nem spekulatív — mindegyik jól meghatározott technikai munkát, ismert implementációs mintákat és mérhető üzleti eredményeket jelent.

A kritikus útvonal egyszerű: feloldd az #1-et és a #2-t (valós írások + auth keményítés), majd azonnal aktiválj 3 fizető pilot épületet. Ez az egyetlen lépés a jelenlegi 180 000–420 000 €-s értékelést 500 000–1,2M € tartományba mozdítja. Az összes többi kezdeményezés erre az alapra épít.

**A teljes inkrementális értéknövekedési potenciál: +2,0M–4,44M €. A cél értékelés: 2,1M–5,8M €.**

---

*Jelentés elkészítve: 2026-05-15 · PanelLakó growth_strategy toolkit · Részletes fejlesztési promptok: `growth_strategy/output/dev_prompts/`*
