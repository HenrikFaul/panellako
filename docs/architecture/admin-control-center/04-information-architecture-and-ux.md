# 04 — Információs architektúra és UX

## 1. UX-cél

Az adminisztrátor az első képernyőn három kérdésre kapjon választ:

1. Működik-e a PanelLakó és ugyanaz a kiadás fut-e minden rétegen?
2. Mi igényel most figyelmet, milyen súlyos és hol kezelhető?
3. Mely üzleti és technikai modulok érhetők el anélkül, hogy a meglévő
   funkciókat keresni kellene?

## 2. Navigáció

A route marad `/superadmin`. A tab az URL queryben él:

```text
/superadmin?tab=overview
/superadmin?tab=users
/superadmin?tab=features
/superadmin?tab=community-requests
```

Felhasználói tabváltás push state-et használ; auth redirect replace-et. A v1
megtartja az összes jelenlegi tabot és az overview alatti job/import/diagnosztika
elérési utakat.

## 3. Áttekintés komponensrendje

### 3.1. Fejléc

- PanelLakó márkajel és egyértelmű admin kontextus;
- utolsó frissítés időpontja;
- globális állapotbadge;
- manuális frissítés;
- kijelentkezés;
- nincs secret-, környezet- vagy userazonosító a fejlécben.

### 3.2. Kiadási azonosság

Megjelenik:

- web release rövid SHA/verzió;
- backend/contract release rövid SHA/verzió;
- admin manifest fingerprint;
- `egyezik | eltér | ismeretlen` állapot;
- deploy idő és freshness, ha megbízható forrásból elérhető.

Az `eltér` és `ismeretlen` fail-visible. Nem használunk zöld badge-et
ismeretlen állapothoz.

### 3.3. Platform KPI-k

Javasolt v1 KPI-k:

- aktív workspace-ek;
- fizikai épületek;
- albetétek;
- aktív profilok/tagok;
- kezelő szervezetek és aktív mandátumok;
- függő közösségi kérelmek;
- hibás/részleges jobok az elmúlt 24 órában;
- konfigurálatlan kritikus integrációk.

Minden kártya jelzi a saját állapotát és frissességét. Egy hiányzó, későbbi
migrációhoz tartozó tábla `unavailable`, nem nulla.

### 3.4. Figyelmet igénylő lista

Az inbox derivált nézet, nem párhuzamos source of truth. Forrásai:

- függő community request;
- hibás, részleges, timeoutos vagy beragadt job;
- hiányzó/degradált kritikus integráció;
- release mismatch/unknown;
- elavult adatforrás;
- lejáró mandátum vagy delegáció;
- biztonsági/authority anomália;
- később approvalra váró high-risk command.

Elemmezők:

```text
id, kind, severity, state, titleKey, detailKey,
scopeType, safeScopeLabel, occurredAt, dueAt,
ownerRole, actionHref, sourceStatus
```

Súlyosság: `critical | high | medium | low | info`. Az állapot nem csak színnel,
hanem szöveggel és ikonnal is megjelenik.

### 3.5. Integrációs mátrix

Csoportok:

- alap infrastruktúra: Supabase DB/Auth/Storage;
- identity: email+jelszó, magic link, Google OAuth;
- cím: shared GeoData Address Registry;
- kommunikáció: email és push;
- pénzügy: Stripe;
- közlekedés: BKK/GTFS/GBFS;
- környezet: AQI, OSM, Copernicus/NASA források;
- automatizálás: cron/scheduler/worker.

Kártyánként:

- név és cél;
- `configured | healthy | degraded | missing | unknown`;
- utolsó sikeres próba és freshness;
- latency bucket, nem érzékeny raw mérés;
- read-only vagy side-effect jelölés;
- runbook/deep link;
- nincs secret neveken túli értékinformáció.

### 3.6. Audit-idővonal

A v1 legutóbbi, minimalizált eseményeket mutatja:

- idő;
- lokalizált akciócímke;
- maszkolt operátor vagy `system`;
- cél típusa és biztonságos címkéje;
- eredmény;
- support/approval jelölő, ha van.

A teljes metadata csak külön, szerveroldalon redaktált részletnézetben jelenhet
meg. Nincs szerkesztés és törlés.

### 3.7. Modulindítók

Az új áttekintés közvetlenül elérhetővé teszi, de nem implementálja újra:

- felhasználók;
- feature registry;
- közösségi kérelmek;
- jobok és futási napló;
- OSM import;
- GTFS import;
- külső API diagnosztika;
- platform settings.

## 4. Daylight vizuális rendszer

- warm canvas: `#f4f7f4` / `#edf3ee`;
- kártya: fehér;
- border: `#dbe5df`;
- elsődleges ink: `#17231e`;
- visszafogott teal fókusz és CTA;
- sötét blokk csak valódi kód/log overlay esetén;
- árnyék enyhe, hierarchia spacingből és tipográfiából épül;
- nincs emoji alapú státuszjelzés.

## 5. Reszponzív viselkedés

### 375 px

- egyoszlopos sorrend;
- sticky vagy kompakt tablist, vízszintes scroll csak a tabokra;
- KPI-k 2 oszlopos mini-gridként vagy egy oszlopban;
- táblázat helyett kártya/lista;
- ikon-only gombhoz kötelező accessible name;
- log/JSON részlet bottom sheet vagy teljes szélességű panel.

### 1440 px

- 12 oszlopos grid;
- attention inbox domináns bal oldali blokk;
- integrációk és release állapot jobb oldali összefoglaló;
- audit timeline teljes szélességben vagy másodlagos oszlopban;
- egy sorban legfeljebb 4 KPI-kártya a jó olvashatóságért.

## 6. Akadálymentesség

- WCAG 2.1 AA minimum, célként WCAG 2.2 AA;
- minden status badge szöveges jelentést kap;
- `aria-live="polite"` a frissítési eredményhez;
- `role="alert"` csak valódi hibához;
- loading panel `aria-busy` és skeleton;
- logikus heading-szintek;
- látható focus ring;
- minimum 44×44 px interaktív cél;
- tablista teljes billentyűzet-kezeléssel;
- dátum/idő lokalizált és machine-readable `datetime` értékkel;
- animáció csökkentése `prefers-reduced-motion` mellett.

## 7. i18n

Minden új string a `superadmin.controlCenter.*` namespace-be kerül a magyar és
angol erőforrásban ugyanabban a commitban. A manifest user-facing neveket nem
szövegként, hanem i18n-kulcsként hordozza.

Kötelező kulcscsoportok:

- page/header/navigation;
- status és severity label;
- KPI cím és helper;
- attention kind és action;
- integration név/cél/állapot;
- release állapot és hiba;
- audit action label;
- loading/empty/error/retry;
- idő- és frissességi szöveg;
- accessible name-ek.

## 8. Állapotok és részleges hiba UX

Minden panel külön kezeli:

```text
idle → loading → ready
              ↘ empty
              ↘ degraded
              ↘ error → retrying
```

- A teljes oldal csak auth-hibánál vagy invalid contractnál áll meg.
- Egy collector hibája nem rejti el a már betöltött sibling adatot.
- Retry csak az érintett panelt frissíti, de a fejléc globális refresh minden
  panelt újrakérhet.
- Régi kérés eredménye scope- vagy tabváltás után nem írhatja felül az új state-et.
- A kliens nem következtet `0` értékre hálózati vagy jogosultsági hibából.
