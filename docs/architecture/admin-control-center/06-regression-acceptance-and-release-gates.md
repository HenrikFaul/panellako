# 06 — Regresszió-, elfogadási és kiadási kapuk

## 1. Funkcionális regressziómátrix

| Terület | Megőrzendő működés | v1 bizonyítás |
|---|---|---|
| Auth/authority | Supabase operator context, bootstrap, read-only break-glass, logout | authority route/unit + DB canary |
| Overview legacy | settings, stats, health, job napló | karakterizáció + integráció |
| Users | maszkolt/bounded listázás és próbaidő módosítás | komponens/API + authenticated RPC teszt |
| Features | feature list és módosítás | komponens/API + authenticated RPC/audit teszt |
| Community requests | listázás, review és duplicate-resolution lifecycle | named read + authenticated AAL2/digest/receipt RPC teszt |
| Governance | role/assignment, approval, support session és release attestation | route/UI + DB state-machine canary |
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
7. Read csak named capabilityvel vagy read-only legacy break-glass módban
   engedhető; mutation kizárólag named operátornak, konkrét capabilityvel és
   AAL2-vel.
8. A végleges trial/feature/setting RPC authenticated user sessionnel fut, és
   DB-ben is újraellenőrzi a capabilityt és maximum 15 perces AAL2-t.
9. Break-glass, kliens által küldött actor/capability, vagy service-role direct
   trial/feature/setting write nem adhat sikeres operátori receiptet.

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
11. Authority, users, features és governance felület loading/error/retry,
    reason és MFA step-up állapotot ad; session-stabil idempotencyt csak az azt
    fogadó szerződésnél kér. No-op vagy hiba nem jelenhet meg hamis sikerként.

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
- legacy break-glass mutation minden hardeningolt route-on deny;
- hiányzó capability és AAL1 stabil deny/`MFA_STEP_UP_REQUIRED` választ ad;
- first-operator bootstrap második futása, nem konfigurált profil vagy már létező
  assignment mellett deny;
- approval self-decision, expired/stale/digest-mismatch és más actionre történő
  consumption deny; exact retry ugyanazt a receiptet adja;
- operator assignment overlap, self-revoke és utolsó aktív platformadmin revoke
  deny;
- support self-approval, scope mismatch, lejárt/revoked session access és
  terminális reaktiválás deny; maximum TTL 60 perc;
- release attestation exact approval nélkül vagy eltérő artifact/manifest/
  migration payload mellett deny;
- trial/feature/setting direct write guard deny, azonos payload retry replay,
  eltérő payload ugyanazzal a keyjel conflict és no-op stabil eredmény;
- community review/duplicate-resolution self-review, stale state, invalid
  evidence, digest mismatch és same-key/different-payload deny; exact retry nem
  duplikál state change-et vagy auditot;
- audit/support-event/release-attestation UPDATE/DELETE triggerrel tiltott; az
  operációs `service_role` auditjoga csak SELECT/INSERT.

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
- `20260830140000_platform_operator_authority.sql` forward apply + teljes
  reapply PostgreSQL 18-on;
- role/capability seed, context, AAL2, receipt/quota, approval, assignment,
  support lifecycle, release attestation és trial/feature/setting RPC runtime
  canary;
- a rollback-only runtime canary kétszer egymás után is ugyanazzal az eredménnyel
  fut, fixture-maradvány nélkül.
- a 20 fájlos `20260830140000_platform-admin-release.sha256` byte-pontos
  manifestje, range/count ellenőrzése, folytonos pending suffix és clean
  post-deploy contract; a `140000` fölötti local/remote head fail-closed;
- production verifier read-back a release 88/88 public function nevére és
  `prokind` értékére, a kritikus `130000` command/`140000` authority RPC-k exact
  signature-jére, pozitív/negatív `authenticated`/`service_role`/`anon` grantokra,
  release-kritikus public/private táblákra, kijelölt capability-seed párokra és
  private-helper privilege lockra.

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
hogy a legacy tabok és modulok megmaradnak. A v0.10.7 command/audit és a v0.10.8
operator-authority migráció forward-only: audit/history, assignment, approval,
support-event, attestation vagy command rekord nem törölhető rollback címén, és
sémahiba csak újabb forward-fix migrációval javítható. A globális lock feloldását
nem kézi rekordtörlés, hanem a tranzakciós completion vagy a legfeljebb 15 perces
lease-expiry végzi. Production migráció hiányában az alkalmazás csak read-only
break-glass/limited módot mutathat; nem eshet vissza közvetlen legacy írásra.

## 8. Aktuális bizonyítási pillanatkép

| Kapu | Állapot |
|---|---|
| Fókuszált settings/community/migration/command/users/features/control-center Vitest | **PASS — 45/45 teszt** |
| TypeScript (`npx tsc --noEmit`) | **PASS** |
| Operator-authority statikus migrációs suite | **PASS — 17/17 teszt** |
| Izolált PostgreSQL 18 v0.10.8 authority migration első apply + teljes reapply | **PASS** |
| Rollback-only operator/approval/support/attestation/community mutation runtime canary | **PASS — 2/2 egymást követő futás** |
| 20 fájlos migration-release manifest és friss workflow contract | **PASS — 9/9 célzott release teszt; authority SHA-256 `45B00B09…ED2C99`** |
| v0.10.8 teljes Vitest | **PASS — 88 tesztfájl / 578 teszt, 78,03 s** |
| v0.10.8 ESLint | **PASS — 0 warning, 0 error** |
| v0.10.8 production build | **PASS — 73/73 statikus oldal** |
| v0.10.8 új admin UI-copy scan | **PASS** |
| Lokális auth-határ HTTP-smoke | **PASS — 307 / 200 / 401 / 401** |
| Végleges hitelesített browser QA | **NOT_RUN / HOLD — webview attach hiba, Chrome-kapcsolat nem elérhető** |
| Hosted admin smoke és release identity | **NOT_RUN / HOLD** |
| Production Supabase `20260830130000` + `20260830140000` migráció | **NOT_RUN / HOLD** |
| Production deploy és alias | **NOT_RUN / HOLD** |
| v0.10.8 implementációs commit és feature-branch push | **PASS — `a0f9eb3`** |
| Első védett DB audit | **HOLD — `33369494169`, hiányzó DB-password secret; DB-művelet nem indult** |
| Védett DB-password rotation workflow contract | **PASS — owner/main/exact-confirm, mask, bounded verify; runtime NOT_RUN** |

## 9. Definition of Done

- a dokumentált v1 funkció ténylegesen elérhető;
- a meglévő admin modulok regresszió nélkül működnek;
- a safe DTO és partial failure contract tesztelt;
- HU/EN és accessibility kapu PASS;
- release identity fail-visible;
- changelog, versioning, marketing value és coding lesson frissítve;
- publication esetén commit és push a megfelelő `codex/` feature branchre;
- production állítás csak külön production bizonyítékkal.
