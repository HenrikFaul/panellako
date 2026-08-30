# 06 — Regresszió-, elfogadási és kiadási kapuk

## 1. Funkcionális regressziómátrix

| Terület | Megőrzendő működés | v1 bizonyítás |
|---|---|---|
| Auth | `/superadmin/login`, session cookie, logout | auth route/unit teszt |
| Overview legacy | settings, stats, health, job napló | karakterizáció + integráció |
| Users | listázás és meglévő admin akciók | komponens/API teszt |
| Features | feature list és módosítás | komponens/API + audit teszt |
| Community requests | listázás és review lifecycle | meglévő teszt + negatív scope |
| Jobs | összes jelenlegi job indítható, ismételt/kollidáló futás fail-closed | manifest teljesség + route/state-machine teszt |
| OSM import | komponens és API elérhető | render/wiring teszt |
| GTFS import | komponens és API elérhető, post-chain részhiba nem lesz hamis siker, batch guard megmarad | render/wiring + kétlépéses hiba + route contract teszt |
| Diagnostics | meglévő diagnosztika elérhető | wiring + input boundary |
| Settings | map theme és BKK beállítás | allowlist happy path |
| Workspace admin | `/w/:id/admin` változatlan | meglévő suite |
| Multitenancy | két tenant izoláció | negatív runtime canary |
| Address registry | csak publikus referenciahatár | contract teszt |

## 2. API elfogadási kritériumok

### Auth és biztonság

1. Auth nélkül minden új superadmin route 401-et ad.
2. A browser bundle nem importál service-role klienst.
3. Hiányzó service key esetén fail-closed `unavailable`, anon fallback nélkül.
4. A response szövegében nincs env value, prefix, suffix, kulcshossz, token,
   cookie vagy provider stack trace.
5. Az admin response `Cache-Control: no-store`.
6. Mutáció same-origin és bounded JSON kapu nélkül nem futhat.

### Partial failure

1. Egy hiányzó tábla csak a hozzá tartozó KPI-t jelöli unavailable-ként.
2. Audit hiba mellett a release és integrációs panel továbbra is megjelenik.
3. Remote provider timeout nem blokkolja a DB KPI-kat.
4. `null` érték nem jelenik meg nullaként.
5. A globális állapot a kötelező panel legsúlyosabb állapotát követi.

### Adatminimalizálás

1. Minden DB select explicit oszloplistát használ.
2. Audit metadata nem kerül változtatás nélkül a klienshez.
3. Attention item nem tartalmaz teljes emailt, postacímet vagy személynevet.
4. Integrációs állapot nem árul el credential-karakterisztikát.
5. Hibák stabil kódokra normalizáltak.

## 3. UI elfogadási kritériumok

1. `/superadmin` alapértelmezetten az új áttekintést mutatja.
2. Users, Features, Community Requests és minden legacy overview funkció
   legfeljebb egy egyértelmű navigációs lépéssel elérhető.
3. A tab deep link betölthető; a Vissza gomb az előző tabra lép.
4. Minden panelnek van loading, empty, degraded és error állapota.
5. Egy panelhiba nem unmountolja a sibling panelt.
6. `unknown`, `degraded` és `unavailable` vizuálisan és szövegesen különböző.
7. Minden új felirat elérhető HU és EN nyelven; nincs hardkódolt új UI-copy.
8. 375 px-en nincs oldalirányú oldal-scroll; 1440 px-en nincs indokolatlan
   üres tér vagy túl széles sor.
9. Billentyűzettel elérhető minden tab és akció; focus látható.
10. Státusz nem csak színnel kommunikált; AA kontraszt igazolt.

## 4. Biztonsági negatív tesztek

- idegen originből érkező settings/job request elutasítva;
- túl nagy vagy malformed JSON elutasítva;
- ismeretlen setting key elutasítva;
- ismeretlen job ID elutasítva;
- kliens által küldött actor/scope figyelmen kívül hagyva;
- két gyors azonos command legfeljebb egyszer hajtódik végre;
- egyező, már befejezett command request a tárolt `status` és redaktált
  `safe_result` receiptet játssza vissza mellékhatás nélkül;
- két különböző manuális platformmutáció közül egyszerre legfeljebb egy lehet
  `running` a közös `platform:mutations` targeten;
- azonos idempotency key és eltérő command payload stabil konfliktust ad;
- transport hiba utáni retry ugyanazt a session-stabil idempotency keyt küldi;
- lejárt lease atomikusan zárja errorra a commandot, a kompozit kulcsú joblogot
  és az audit eseményt;
- scope-váltás közben beérkező régi response nem renderelődik;
- service role private helper privilege-lánc valódi canaryval ellenőrzött;
- tenant A adata nem jelenik meg tenant B drill-downban;
- audit INSERT `{ error }` eredménye ellenőrzött, nem csak try/catch-re hagyatkozik.
- a GTFS import idegen origin, hibás content-type, 2 MiB fölötti body, 500 sor
  fölötti batch, hibás mező és hiányzó idempotency key esetén nem ír adatot;
- a GTFS globális lock egyetlen batchre vonatkozik; a teszt és a dokumentáció
  sem állít teljes fájl-lockot vagy fájlszintű atomi importot.

## 5. Kiadási bizonyítékszintek

| Szint | Mit bizonyít | Nem bizonyít |
|---|---|---|
| static | lint, TypeScript, source invariant | futó route |
| unit | DTO, redaction, state és komponenslogika | hosted infra |
| integration | route + Supabase adapter szerződés | production config |
| local browser | hidratált DOM és interakció | hosted release |
| preview | Vercel preview + konfigurációhatár | production alias |
| production | kanonikus host, DB és release identity | hosszú távú stabilitás |

Egy alacsonyabb szint PASS-a nem nevezhető magasabb szint bizonyítékának.

## 6. Kötelező ellenőrzések

### Repository

- célzott Vitest;
- teljes Vitest;
- `npx tsc --noEmit`;
- ESLint;
- production build;
- `git diff --check`;
- tiltott admin UI-kifejezések és hardkódolt új stringek forrás-scanje;
- route/manifest/i18n teljességi teszt.

### Adatbázis

- PostgreSQL támogatott verzión a
  `20260830130000_platform_admin_job_commands.sql` forward apply + teljes
  reapply;
- begin/complete/expire state machine happy path, duplikált idempotency,
  befejezett receipt replay, payload mismatch conflict, globális lock,
  lease-expiry és actor mismatch negatív canary;
- partícionált joblog frissítése kizárólag `(id, started_at)` kompozit
  azonossággal;
- RLS pozitív és negatív canary;
- service-role/private schema teljes privilege-lánc;
- audit grant canary: `service_role` SELECT/INSERT engedélyezett,
  UPDATE/DELETE/TRUNCATE tiltott;
- két-tenant izoláció;
- fixture cleanup exact nulla maradvánnyal.

### Browser

- 375 px és 1440 px;
- HU és EN;
- tab deep link és Back;
- részleges API-hiba;
- release `match/mismatch/unknown`;
- billentyűzet és focus;
- kontraszt és reduced motion.

## 7. Release döntés

### PASS

Csak akkor, ha az összes v1 scope-beli ellenőrzés ténylegesen lefutott és a
hosted kiadási identity a várt commitot mutatja.

### HOLD

- hiányzó production credential vagy migration authority;
- release mismatch/unknown;
- raw secret/PII szivárgás;
- anon fallback privilegizált route-on;
- audit nélküli admin mutáció;
- tenantizolációs negatív teszt hibája;
- legacy funkció elvesztése;
- hosted browser bizonyíték hiánya, ha production deployt állítunk.

### Rollback

Az új overview feature flaggel vagy route-level fallbackkel kivezethető úgy,
hogy a legacy tabok és modulok megmaradnak. A v0.10.7 command/audit migrációja
forward-only: audit/history vagy command rekord nem törölhető rollback címén,
és sémahiba csak újabb forward-fix migrációval javítható. A globális lock
feloldását nem kézi rekordtörlés, hanem a tranzakciós completion vagy a
legfeljebb 15 perces lease-expiry végzi.

## 8. Aktuális bizonyítási pillanatkép

| Kapu | Állapot |
|---|---|
| Célzott admin command/GTFS Vitest | **PASS — 7 fájl / 36 teszt** |
| TypeScript (`npx tsc --noEmit`) | **PASS** |
| Izolált PostgreSQL 18.4 migration + command state machine + kétszeres reapply | **PASS — v2 replay/conflict/lock/log/audit-grant canary** |
| Teljes Vitest | **PASS — 73 fájl / 478 teszt** |
| ESLint | **PASS — 0 warning, 0 error** |
| Production build | **PASS — 73/73 statikus oldal** |
| `git diff --check` és tiltott admin UI-copy scan | **PASS** |
| Végleges hitelesített browser QA | **NOT_RUN / HOLD** — az in-app Browser webview nem tudott csatlakozni |
| Hosted admin smoke és release identity | **NOT_RUN / HOLD** |
| Production Supabase migráció | **NOT_RUN / HOLD** |
| Production deploy és alias | **NOT_RUN / HOLD** |

## 9. Definition of Done

- a dokumentált v1 funkció ténylegesen elérhető;
- a meglévő admin modulok regresszió nélkül működnek;
- a safe DTO és partial failure contract tesztelt;
- HU/EN és accessibility kapu PASS;
- release identity fail-visible;
- changelog, versioning, marketing value és coding lesson frissítve;
- commit és push a megfelelő `codex/` feature branchre;
- production állítás csak külön production bizonyítékkal.
