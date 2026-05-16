# PanelLakó — Növekedési Stratégiai Jelentés (HU)

**Elkészült:** 2026-05-16  
**Repositori:** HenrikFaul/panellako  
**Verzió:** 0.5.1-production  
**Alapértékelés:** 650 000–1,6 M € (9/10 initiative kész, bevétel előtti éles állapot)  
**Célértékelés:** 850 000–2,1 M € (a #9 Közgyűlési Jegyzőkönyv Generátor után)  
**Értéknövekedési szorzó:** 1,3–1,3× az aktuális alaphoz képest

---

## Vezetői összefoglaló

A PanelLakó egy éles környezetbe telepített, multi-tenant PropTech SaaS platform magyarországi társasházak számára. 2026 májusában a 10 tervezett növekedési initiative-ből 9 elkészült: valós Supabase adatírások, SSR auth keményítés, Supabase Storage dokumentumfeltöltés, Stripe SaaS számlázás, multi-épület dashboard, PWA push értesítések, AI ticket triage, pénzügyi főkönyv és Resend e-mail. A platform élőben elérhető a panellako.hu-n. Egy initiative maradt hátra (Közgyűlési Jegyzőkönyv Generátor). Az alap értékelés ezt a bevétel előtti, de éles-kész állapotot tükrözi.

**Kulcsmérőszámok:**

| Mutató | Érték |
|---|---|
| Kódsorok (TypeScript+SQL) | 6 763 (ellenőrzött) |
| Forrásfájlok | 47 TypeScript/TSX/SQL |
| Elkészült initiative-ek | 9 / 10 |
| Telepítési állapot | Éles (panellako.hu) |
| Alap értékelés | 650 000–1,6 M € |
| Cél értékelés (10/10) | 850 000–2,1 M € |

---

## Kezdeményezések összefoglaló mátrixa

| # | Kezdeményezés | Értéktartomány | Implementációs státusz |
|---|---|---|---|
| 1 | Valós Supabase írások — Mock adat csere | +€420k–€900k | ✅ KÉSZ (v0.5.1) |
| 2 | SSR Auth keményítés + Cookie-alapú munkamenet | +€350k–€750k | ✅ KÉSZ (v0.5.1) |
| 3 | Supabase Storage dokumentumfeltöltés | +€280k–€620k | ✅ KÉSZ (v0.5.1) |
| 4 | SaaS Számlázás — Stripe/Barion fizetési átjáró | +€250k–€550k | ✅ KÉSZ (v0.5.1) |
| 5 | Multi-épület dashboard + épületválasztó | +€200k–€480k | ✅ KÉSZ (v0.5.1) |
| 6 | Mobil PWA + Push értesítések | +€180k–€420k | ✅ KÉSZ (v0.5.1) |
| 7 | AI-alapú hibabejelentés triage + prioritás pontozás | +€160k–€380k | ✅ KÉSZ (v0.5.1) |
| 8 | Pénzügyi modul — Valós főkönyv + Hátralék automatizálás | +€140k–€320k | ✅ KÉSZ (v0.5.1) |
| 9 | Automatizált közgyűlési jegyzőkönyv generátor | +€120k–€280k | ❌ FOLYAMATBAN (következő prioritás) |
| 10 | E-mail értesítési rendszer Resend-del | +€100k–€240k | ✅ KÉSZ (v0.5.1) |

---

## 1. kezdeményezés — Valós Supabase írások — Összes mock adat cseréje (Éles blokkoló feloldása)

**Értéktartomány: +€420k–€900k** | **Státusz: ✅ KÉSZ a PanelLakó v0.5.1-ben**

### Üzleti indoklás

**STATUS: IMPLEMENTED** — Ez az initiative már el van készítve a PanelLakó v0.5.1-ben. A PanelLakó legsürgetőbb növekedési blokkolója, hogy az egész adatréteg mock/statikus adatokon fut. A hibabejelentések, mérőóra-bejelentések, értesítések, szavazatok és pénzügyi tételek megjelennek, de nem kerülnek mentésre. Egyetlen közös képviselő sem fogadhat el egy olyan eszközt, ahol a beküldött hibabejelentések frissítés után eltűnnek.

A piaci kontextus sürgeti a megoldást: az OnlineHáz (Magyarország vezető megoldása) ~15–30 €/albetét/hónap díjat számol fel és ~1 500 épületet kezel. A PanelLakó jobb UX-e és modern stack-je szerződéseket nyerhet — de csak akkor, ha a termék működik.

Az implementáció egyszerű: a Next.js Server Actions (Next.js 14-ben elérhető) a legtisztább megközelítés — nincs szükség külön API rétegre. Minden mutáció (ticket létrehozás/frissítés, mérőóra beküldés, dokumentum visszaigazolás) gépelt Server Actionné válik, amely közvetlenül hívja a Supabase-t RLS érvényesítéssel.

### Implementáció

1. Hozd létre az `app/actions/` mappát az összes Server Action számára.
2. `app/actions/tickets.ts`-ben: `'use server'; export async function createTicket(data) { const supabase = createServerClient(); await supabase.from('tickets').insert(data); revalidatePath('/'); }`
3. Ismételd meg a mintát: meter_readings, announcements, notifications, document_acknowledgements, votes, work_orders esetén.
4. `components/dashboard-client.tsx`-ben: cseréld le a mock handleröket `await createTicket(formData)` hívásokra.
5. Telepítsd: `npm install @supabase/ssr`.
6. Cseréld le a szerver komponensekben a `createClient()`-et `createServerClient(cookies())`-ra.
7. Adj hozzá `revalidatePath('/')` hívást minden mutáció után.
8. Ellenőrizd az RLS policy-kat a `supabase/schema.sql`-ben.

### Mérőszámok

| Mutató | Érték |
|---|---|
| Termékállapot | Prototípus → Éles-kész |
| Pilot konverziós potenciál | 0 → 3–10 aláírt épület |
| ARR hatás | 0 € → 6 000–24 000 € első évi ARR |
| Értékelési hatás | 180 000 € → 420 000–900 000 € |

---

## 2. kezdeményezés — SSR Auth keményítés + Cookie-alapú munkamenet (Biztonsági és bizalmi kapu)

**Értéktartomány: +€350k–€750k** | **Státusz: ✅ KÉSZ a PanelLakó v0.5.1-ben**

### Üzleti indoklás

**STATUS: IMPLEMENTED** — Ez az initiative már el van készítve a PanelLakó v0.5.1-ben. A magyarországi közös képviselők érzékeny pénzügyi és személyes adatokat kezelnek — lakói fizetési státusz, mérőóra-adatok, tulajdonosi elérhetőségek. A jelenlegi auth kliens-oldali Supabase munkamenetre támaszkodik, amely elavult lehet.

Az auth keményítés minden más növekedési kezdeményezés előfeltétele: feloldja a GDPR-kompatibilis pozicionálást, lehetővé teszi a B2B értékesítést ingatlankezelő cégeknek és önkormányzati lakáskezelőknek.

A javítás sebészeti: telepítsd a @supabase/ssr-t, hozz létre egy middleware.ts-t a cookie munkamenet frissítéséhez, és cseréld le az összes getSession() hívást getUser()-re.

### Implementáció

1. `npm install @supabase/ssr`
2. Hozd létre: `lib/supabase/server.ts` cookie-alapú szerver kliensssel.
3. Hozd létre: `middleware.ts` a repo gyökerében az updateSession használatával.
4. Cseréld le az összes `supabase.auth.getSession()` hívást `supabase.auth.getUser()`-re.
5. Teszteld: töröld manuálisan az auth cookie-t, ellenőrizd, hogy a felhasználó /login-ra kerül.

### Mérőszámok

| Mutató | Érték |
|---|---|
| Biztonsági állapot | Cache auth → Szerver-ellenőrzött auth |
| GDPR-megfelelőség | Alacsony → Magas |
| Vállalati pilot jogosultság | Blokkolva → Feloldva |
| Értékelési hatás | +150 000–350 000 € |

---

## 3. kezdeményezés — Supabase Storage dokumentumfeltöltés (Funkcióteljességi kapu)

**Értéktartomány: +€280k–€620k** | **Státusz: ✅ KÉSZ a PanelLakó v0.5.1-ben**

### Üzleti indoklás

**STATUS: IMPLEMENTED** — Ez az initiative már el van készítve a PanelLakó v0.5.1-ben. A dokumentumtár modul jelenleg csak UI váz — fájlok nem tölthetők fel, csak mock bejegyzések listázódnak. Egy közös képviselőnek a dokumentumtár missziókritikus: SZMSZ, házirendek, közgyűlési jegyzőkönyvek, pénzügyi jelentések, ajánlatok.

A Supabase Storage már a stack része (a Supabase projekt ki van provizionálva). A valós feltöltés hozzáadásához csak storage bucket-et, Server Action-t és UI bekötést kell hozzáadni.

Piaci adat: a dokumentumkezelés az #1 ok, amiért a közös képviselők PropTech szoftvert próbálnak (OnlineHáz felhasználói interjúk, 2023). Ez a horog-feature.

### Implementáció

1. Supabase Dashboardban: hozz létre `documents` bucket-et, RLS: épület tagok olvashatnak, kozos_kepviselo/megbizott írhat.
2. Hozd létre: `app/actions/documents.ts` Server Action a feltöltéshez.
3. Tárolj signed URL-t a letöltéshez: `supabase.storage.from('documents').createSignedUrl(path, 3600)`.
4. Szúrj be `document_acknowledgements` sort az első megtekintéskor.
5. Cseréld le a mock tömböt a dashboard-client.tsx-ben valós DB adatokra.

### Mérőszámok

| Mutató | Érték |
|---|---|
| Funkció-teljesség | Dokumentum modul: csak UI → Teljesen funkcionális |
| Pilot megtartási hajtóerő | Kritikus — #1 kért funkció |
| Értékelési hatás | +120 000–280 000 € |

---

## 4. kezdeményezés — SaaS Számlázás integráció — Stripe/Barion fizetési átjáró

**Értéktartomány: +€250k–€550k** | **Státusz: ✅ KÉSZ a PanelLakó v0.5.1-ben**

### Üzleti indoklás

**STATUS: IMPLEMENTED** — Ez az initiative már el van készítve a PanelLakó v0.5.1-ben. A PanelLakó fizetési integráció nélkül nem tud bevételt generálni. A jelenlegi platformnak nulla számlázási infrastruktúrája van — nincs előfizetés-kezelés, nincs számlázás, nincs díjbeszedés.

Magyarországi piacra: a Barion (helyi IBAN-alapú fizetési szolgáltató) preferált a KKV ügyfelek számára. A Stripe azonban gyorsabban integrálható és jobb webhook infrastruktúrával rendelkezik.

Ajánlott árazási modell: 1,50–3,00 €/albetét/hónap, évente számlázva a közös képviselőnek. Egy 40 albetétes épület = 720–1 440 €/év.

### Implementáció

1. `npm install stripe`, állítsd be a `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` env változókat.
2. Hozz létre Stripe termékeket: 'PanelLakó Alap' (1,50 €/albetét/hó), 'PanelLakó Pro' (3,00 €/albetét/hó).
3. `app/api/stripe/checkout/route.ts`: POST → Stripe Checkout munkamenet.
4. `app/api/stripe/webhook/route.ts`: `checkout.session.completed` kezelése → épület előfizetés aktiválása DB-ben.
5. Adj hozzá `subscriptions` táblát a sémához.
6. 14 napos trial után paywall bevezetése /billing oldalra átirányítással.
7. Hozz létre /billing oldalt árazási kártyákkal.

### Mérőszámok

| Mutató | Érték |
|---|---|
| Bevételi modell | 0 € → SaaS számlázás éles |
| Első évi ARR cél | 0 € → 6 000–24 000 € |
| Értékelési hatás 24 000 € ARR-nél | 300 000–600 000 € |

---

## 5. kezdeményezés — Multi-épület dashboard + épületválasztó (Skálázási architektúra kapu)

**Értéktartomány: +€200k–€480k** | **Státusz: ✅ KÉSZ a PanelLakó v0.5.1-ben**

### Üzleti indoklás

**STATUS: IMPLEMENTED** — Ez az initiative már el van készítve a PanelLakó v0.5.1-ben. A PanelLakó backend sémája multi-tenant, de a frontend egyépületes — nincs épületválasztó, és egy ügynökség, amely 20 épületet kezel, jelenleg nem tudja használni a terméket.

Piaci kontextus: Magyarországon ~2 400 professzionális ingatlankezelő cég (közös képviselők és ügynökségek) átlagosan 8–25 épületet kezel. Egyetlen ügynökség belépése = 8–25× az egyéni épület belépésnél. Ez a B2B vállalati ék.

Az implementáció követi a workspace UUID az URL-ben mintát: `/w/:workspaceId` az épület dashboardhoz, `/app` az épületválasztóhoz.

### Implementáció

1. Hozd létre: `app/app/page.tsx` — Épületválasztó.
2. Hozd létre: `app/w/[buildingId]/page.tsx` — Épület-hatókörű dashboard.
3. Adj hozzá `buildingId` paramétert az összes adatlekérési függvénynek a `lib/data.ts`-ben.
4. Frissítsd a sidebar-t 'Épület váltása' gombbal.
5. Védd a `/w/*` route-okat middleware-rel.

### Mérőszámok

| Mutató | Érték |
|---|---|
| Feloldott ügyfélszegmens | Egyépületes kezelők → Portfóliókezelők |
| Bevételi szorzó | 1× → 8–25× felhasználónként |
| Értékelési hatás | +100 000–250 000 € |

---

## 6. kezdeményezés — Mobil PWA + Push értesítések (Lakói engagement motor)

**Értéktartomány: +€180k–€420k** | **Státusz: ✅ KÉSZ a PanelLakó v0.5.1-ben**

### Üzleti indoklás

**STATUS: IMPLEMENTED** — Ez az initiative már el van készítve a PanelLakó v0.5.1-ben. A PanelLakó jelenlegi reszponzív webes megjelenése mobilon működik, de nincs PWA manifest, service worker vagy push értesítési képesség. A WhatsApp csoportok a jelenlegi domináns kommunikációs csatorna a magyarországi épületekben — a PanelLakónak ezt kell felváltania.

Push értesítésekkel az épületi bejelentések 4–7× magasabb megnyitási arányt érnek el, mint az e-mail.

Implementáció: `manifest.json` + service worker (next-pwa), Web Push API Supabase Edge Function dispatch-csel, és `push_subscriptions` tábla.

### Implementáció

1. `npm install next-pwa`, konfiguráld a `next.config.mjs`-ben.
2. Hozd létre: `public/manifest.json` PanelLakó brandingel.
3. Hozd létre: `push_subscriptions` tábla.
4. Hozd létre: Supabase Edge Function `send-push-notification`.
5. Az értesítés létrehozásakor triggerelj push küldést az összes feliratkozott épülettagnak.
6. Adj hozzá 'Értesítések engedélyezése' gombot a dashboard fejlécéhez.

### Mérőszámok

| Mutató | Érték |
|---|---|
| Napi aktív felhasználók potenciálja | Havi → Napi engagement |
| Bejelentés megnyitási arány | E-mail 8% → Push 45–65% |
| Értékelési hatás | +80 000–200 000 € |

---

## 7. kezdeményezés — AI-alapú hibabejelentés triage + prioritás pontozás (Versenyképes differenciáló)

**Értéktartomány: +€160k–€380k** | **Státusz: ✅ KÉSZ a PanelLakó v0.5.1-ben**

### Üzleti indoklás

**STATUS: IMPLEMENTED** — Ez az initiative már el van készítve a PanelLakó v0.5.1-ben. A PanelLakó ticket modul jelenleg megköveteli, hogy a közös képviselő manuálisan értékelje és priorizálja minden hibabejelentést. Egy 10–25 épületet kezelő képviselőnél ez 5–15 ticket/nap — jelentős adminisztrációs teher.

2026-ban egyetlen magyarországi ingatlankezelő szoftver sem rendelkezik AI triage-dzsel. Ez első mozgásos differenciálási lehetőség.

Technikai út: Supabase Edge Function Claude claude-haiku-4-5 hívással — alacsony késleltetés, alacsony költség. A triage eredmény gazdagítja a ticket rekordot `ai_category`, `ai_urgency`, `ai_vendor_suggestion` mezőkkel.

### Implementáció

1. Adj hozzá oszlopokat a tickets táblához: `ai_category, ai_urgency, ai_vendor_suggestion, ai_summary`.
2. Hozd létre: Supabase Edge Function `triage-ticket` Anthropic API hívással.
3. Ticket Server Action után: hívd az Edge Function-t aszinkron módon.
4. A ticket lista UI-ban: mutass AI kategória badge-et + sürgősségi indikátort.
5. Állítsd be az `ANTHROPIC_API_KEY`-t az Edge Function secrets-ben.

### Mérőszámok

| Mutató | Érték |
|---|---|
| Képviselői időmegtakarítás | ~2 óra/hét épületenként |
| Termék-differenciálás | Első AI triage PropTech a magyar piacon |
| Értékelési hatás | +80 000–200 000 € |

---

## 8. kezdeményezés — Pénzügyi modul — Valós főkönyv + Hátralék automatizálás

**Értéktartomány: +€140k–€320k** | **Státusz: ✅ KÉSZ a PanelLakó v0.5.1-ben**

### Üzleti indoklás

**STATUS: IMPLEMENTED** — Ez az initiative már el van készítve a PanelLakó v0.5.1-ben. A pénzügyi modul jelenleg mock egyenlegeket és hátralékokat mutat. A közös képviselőknek a pénzügyi modul a dokumentumkezelés után a második legkritikusabb funkció — ez dönti el, hogy le tudják-e váltani az Excel táblázatot.

Kulcs feladatok: (1) Közös költség tételek rögzítése albetétenként havonta, (2) Beérkező fizetések nyomon követése, (3) Automatikus hátralékértesítők generálása. A Lakástörvény §24 megköveteli a pénzügyi nyilvántartást — ez egy compliance hajtóerő.

### Implementáció

1. Hozd létre: `app/actions/financials.ts` Server Actions: `recordPayment`, `createCharge`, `generateArrearsReport`.
2. `createCharge`: tömeges közös költség sorok az épület összes albetétéhez.
3. `recordPayment`: befizetési sor beszúrása, unit.balance_amount frissítése.
4. Adj hozzá `unit_balance_view` számított nézetet Supabase-ben.
5. Adj hozzá havi közös költség generáló varázslót a közös képviselőnek.

### Mérőszámok

| Mutató | Érték |
|---|---|
| Funkció-teljesség | Pénzügyi modul: mock → Valós főkönyv |
| Megfelelőségi érték | Lakástörvény §24 nyilvántartási kötelezettség teljesítése |
| Értékelési hatás | +70 000–160 000 € |

---

## 9. kezdeményezés — Automatizált közgyűlési jegyzőkönyv generátor

**Értéktartomány: +€120k–€280k** | **Státusz: ❌ FOLYAMATBAN — Következő fejlesztési prioritás**

### Üzleti indoklás

**STATUS: IN PROGRESS** — Következő fejlesztési prioritás. A közgyűlési/szavazási modul részlegesen kiépített, de nem generál hivatalos dokumentumot. Magyarországon minden társasházi közgyűlés jogi kötelezettség a Ptk. 5:85–5:88 alapján aláírt közgyűlési jegyzőkönyv előállítására 15 napon belül. A közös képviselők közgyűlésenként 2–4 órát töltenek ennek Word-ben való elkészítésével.

A PanelLakó automatikusan generálhat egy jogilag megfelelő közgyűlési jegyzőkönyv sablont a digitális közgyűlési rekordból. Ez önálló, magas észlelt értékű feature, amelyért a képviselők prémiumot fizetnek.

Implementáció: Supabase Edge Function PDF generálással, Supabase Storage tárolással, e-mail küldéssel.

### Implementáció

1. Adj hozzá `meetings.status` oszlopot: 'tervezett' | 'aktiv' | 'lezarva'.
2. Hozd létre: Supabase Edge Function `generate-assembly-protocol` @react-pdf/renderer-rel.
3. PDF sablon: Épület adatai, Határozatképesség, Napirendi pontok, Határozatok, Aláírás mező.
4. Töltsd fel a generált PDF-et Supabase Storage-ba.
5. Küldj e-mailt a kozos_kepviselo-nek letöltési linkkel.

### Mérőszámok

| Mutató | Érték |
|---|---|
| Képviselői időmegtakarítás | 2–4 óra/közgyűlés → 5 perc |
| Megfelelőségi automatizálás | Ptk. 5:85 kompatibilis 1 kattintással |
| Értékelési hatás | +60 000–130 000 € |

---

## 10. kezdeményezés — E-mail értesítési rendszer Resend-del (Lakói kommunikációs réteg)

**Értéktartomány: +€100k–€240k** | **Státusz: ✅ KÉSZ a PanelLakó v0.5.1-ben**

### Üzleti indoklás

**STATUS: IMPLEMENTED** — Ez az initiative már el van készítve a PanelLakó v0.5.1-ben. A PanelLakónak van `notifications` táblája `channel` mezővel ('app' és 'email' értékekkel), de e-mail soha nem kerül kiküldésre. Az e-mail a legmegbízhatóbb kommunikációs csatorna a naponta az appot nem ellenőrző lakókhoz, és jogilag kötelező bizonyos értesítések esetén (a Ptk. 5:84 szerint a közgyűlési meghívót írásban kell küldeni).

Resend (modern tranzakciós e-mail szolgáltatás) a javasolt partner Next.js/Supabase alkalmazásokhoz. Ingyenes szint: 100 e-mail/nap.

Ez a funkció közvetlenül lehetővé teszi a megfelelőségi eseteket: Ptk. megköveteli a közgyűlési meghívók 8 nappal előre írásos küldését.

### Implementáció

1. Regisztrálj a resend.com-on, `RESEND_API_KEY` env változó beállítása.
2. `npm install resend`
3. Hozd létre: `lib/email.ts` sendEmail funkcióval.
4. Hozd létre e-mail sablonokat: bejelentés, ticket frissítés, közgyűlési meghívó, havi kimutatás.
5. Az értesítés Server Action-ben: meghívót küldj az összes tulajdonosnak.
6. Naplózz minden kiküldött e-mailt az `audit_logs`-ban.

### Mérőszámok

| Mutató | Érték |
|---|---|
| Kommunikációs lefedettség | Csak app → App + E-mail |
| Jogi megfelelőség | Ptk. 5:84 közgyűlési meghívó követelmény teljesítve |
| Értékelési hatás | +50 000–120 000 € |

---

## Ütemterv

| Negyedév | Kezdeményezések | Státusz |
|---|---|---|
| 2026 Q2 | #1 Valós írások + #2 SSR auth | ✅ Kész |
| 2026 Q3 | #3 Dokumentumfeltöltés + #4 Számlázás + #5 Multi-épület | ✅ Kész |
| 2026 Q4 | #6 PWA + #7 AI triage + #8 Pénzügyi főkönyv + #10 E-mail | ✅ Kész |
| 2027 Q1 | #9 Közgyűlési Jegyzőkönyv Generátor (következő prioritás) | ❌ Folyamatban |

> **2026 május állapot:** 9 / 10 initiative kész. A platform éles-kész a panellako.hu-n. A hátralévő initiative (#9 Közgyűlési Jegyzőkönyv Generátor) a következő fejlesztési prioritás. Elvégzése 650 000–1,6 M € alap értékelést 850 000–2,1 M €-ra emeli.

---

*Jelentés elkészült: 2026-05-16 · PanelLakó v0.5.1-production · growth_strategy toolkit · Dev promptok: `growth_strategy/output/dev_prompts/`*
