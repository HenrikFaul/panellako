# PanelLakó platformadmin felület

**Állapot:** v0.10.8 repository- és izolált adatbázis-szinten implementálva; a
teljes Vitest, TypeScript, ESLint, production build, authority és migration-
release contract kapuk PASS, a browser-, hosted- és production kapuk külön
bizonyítást igényelnek
**Dátum:** 2026-08-30
**Elsődleges route:** `/superadmin`
**Tenant-határ:** lakóközösségi `workspace`

## Vezetői döntés

A meglévő `/superadmin` felületet nem cseréljük le és nem választjuk le a már
működő funkciókról. Egy új, alapértelmezett platformáttekintés kerül elé, amely
egyetlen helyen mutatja a szolgáltatás állapotát, a figyelmet igénylő ügyeket,
az integrációkat, a kiadási azonosságot és a minimalizált audit-idővonalat.

A platformadmin és a lakóközösségi admin két külön jogosultsági sík:

- a platformadmin a PanelLakó egészének megbízhatóságát, integrációit,
  kiadásait és kereszt-workspace folyamatainak állapotát kezeli;
- a workspace-admin egy konkrét lakóközösség albetéteit, tagjait,
  jogviszonyait és delegált szerepeit kezeli;
- a kezelőcég (`management_agency`) portfólió-scope, de nem helyettesíti sem a
  platform-, sem a workspace-scope-ot;
- a support hozzáférés nem állandó szerep, hanem időkorlátos, célhoz kötött és
  auditált munkamenet lehet.

## v1 szállítási határ

A v1-ben kód-szinten elkészült:

1. a meglévő `/superadmin` route-on az új alapértelmezett áttekintés;
2. platform KPI-k biztonságos, aggregált megjelenítése;
3. integrációs és konfigurációs állapotmátrix titokértékek nélkül;
4. figyelmet igénylő elemek prioritásos listája;
5. minimalizált, csak olvasható audit-idővonal;
6. frontend–backend kiadási azonosság és ismeretlen/eltérő állapot;
7. a meglévő felhasználó-, feature-, közösségikérelem-, job-, import- és
   diagnosztikai funkciók változatlan elérhetősége;
8. a kézi jobok, migrációk és GTFS batchek tranzakciós, idempotens, globális
   single-flight koordinációja a v0.10.7 command plane-en;
9. névre szóló Supabase Auth platformoperátor, role → capability authority,
   rövid AAL2 step-up és csak olvasható legacy break-glass kompatibilitás;
10. operátori hozzárendelés, exact-payload approval, legfeljebb 60 perces scoped
    support session és release-attestation governance plane;
11. a user-próbaidő, feature és platform setting célzott mutációinak
    authenticated, AAL2-es, indokolt és idempotens adatbázis-RPC-je.

A v1 nem vezet be általános megszemélyesítést, nem ad nyers SQL-futtatót, nem
mutat secret-részleteket, és nem tesz egykattintásossá destruktív platformműveletet.

## v0.10.8 implementációs állapot

A v0.10.7 read plane és command state machine változatlan alapként megmarad. A
`codex/platform-admin-control-center` branch aktuális, még nem publikált
v0.10.8 munkafája ezen felül az alábbiakat tartalmazza:

- egyetlen server-only typed manifest írja le a modulok, integrációk és jobok
  capability-, scope-, kritikalitás-, timeout-, freshness-, probe-, side-effect-,
  runbook- és safe-deep-link mezőit;
- a bounded, poolkímélő collectorok aktív workspace/profile/mandate, függő
  kérelem, 24 órás jobhiba és kritikus integrációhiány KPI-kat adnak, explicit
  freshness és collector state mellett;
- az attention DTO determinisztikus `kind/state/time/owner/source` mezőket, az
  integráció DTO runtime/freshness/latency/probe metadata-t, az auditprojekció
  explicit outcome/target/support/recovery markert kapott;
- a web és backend release identity külön jelenik meg, az eredmény
  `match | mismatch | unknown | error`, és a kliens régebbi safe DTO-kat is
  biztonságosan normalizál;
- az audit projekció és az integrációs állapotok nem adnak át titkot,
  titok-karakterisztikát vagy nyers providerhibát;
- a named read route-ok konkrét capabilityt kérnek; a legacy HMAC session csak
  read-only break-glass adapter, mutációt nem enged;
- a named mutációk Supabase Auth sessiont, konkrét capabilityt és AAL2-t
  követelnek, a végleges adatbázis-RPC-k pedig legfeljebb 15 perces friss AAL2-t
  újraellenőriznek;
- az új governance tab operátori hozzárendelést, approval döntést, support
  session request/approve/revoke lifecycle-t és release attestationt kezel;
- az operátori grant/revoke, a migration apply és a release attestation exact
  canonical payloadhoz kötött, időkorlátos, egyszer használható négy-szem
  approvalt követel; az initiator nem lehet approver;
- a user trial, feature és setting írás authenticated Supabase RPC-n fut,
  reasonnel, session-stabil UUID idempotenciával, payload-egyezéses receipt
  replayjel és közvetlen táblamódosítást tiltó triggerrel; a community review és
  duplicate-resolution ugyanezt az authenticated AAL2/digest/receipt/atomi audit
  mintát kapta saját domain invariánsaival;
- a users read maszkolt emailt, bounded keresést és lapozást ad; a users/features
  UI külön loading/error/retry, MFA step-up és no-op/false-success állapotot kezel;
- a `20260830140000_platform_operator_authority.sql` forward-only migráció
  hozza létre az authority, approval, support, receipt/quota és attestation
  sémát. Az alkalmazásból elérhető RPC-k `authenticated` sessionnel futnak; a
  service role bootstrap/expiry szerepe külön és szűk;
- a production DB workflow/validator a `20260828120000`–`20260830140000`
  tartomány pontos 20 fájlos SHA-256 manifestjét és folytonos pending suffixét
  várja, és a `20260830140000` fölötti local/remote headet elutasítja; a verifier
  a release 88/88 public function nevét és `prokind` értékét, a kritikus
  command/authority RPC-k exact signature-jét, pozitív/negatív
  `authenticated`/`service_role`/`anon` grantjait, a release-kritikus
  public/private táblákat, kijelölt capability-seed párokat és private-helper
  privilege lockot read-backeli;
- a végleges authority migráció SHA-256 értéke
  `45B00B09CAFFC8AF50B2ECB21C3B0789684E4039D859CAF120FF5C0972ED2C99`, és
  byte-pontosan egyezik a manifest bejegyzésével;
- a support lifecycle és az exact-scope authorization primitive elkészült, de
  általános tenantadatot olvasó/író support-action consumer nincs késznek
  állítva;
- a v0.10.7 command v2 contract, 15 perces globális `platform:mutations` lease,
  atomikus begin/complete/expire RPC, session-stabil receipt retry, a GTFS
  legfeljebb 500 soros batch-lockja és a kétlépéses post-chain hibakezelése
  változatlanul megmarad. Ez továbbra sem teljes fájl-lock.

Aktuális bizonyítási határ:

- fókuszált settings/community/migration/command/users/features/control-center
  Vitest: **PASS — 45/45 teszt**;
- TypeScript: **PASS**;
- ESLint: **PASS — 0 warning, 0 error**;
- operator-authority statikus migrációs suite: **PASS — 17/17 teszt**;
- izolált PostgreSQL 18 migration első apply + teljes reapply: **PASS**;
- izolált operator/approval/support/attestation/community mutation runtime
  canary az aktuális migráción: **PASS — 2/2 egymást követő futás**;
- a végleges 20 fájlos migration-release manifest byte-pontos hashokkal elkészült;
  a célzott release-workflow contract suite: **PASS — 8/8 teszt**;
- v0.10.8 teljes Vitest: **PASS — 88 tesztfájl / 577 teszt, 69,78 s**;
- v0.10.8 production build: **PASS — 73/73 statikus oldal**; új admin UI-copy
  scan: **PASS**;
- lokális auth-határ HTTP-smoke: **PASS** — admin redirect/login és auth nélküli
  API-deny;
- végleges hitelesített browser QA: **NOT_RUN / HOLD** — az in-app webview nem
  csatlakozott, külső Chrome-kapcsolat nem volt elérhető;
- hosted read-only smoke, release identity és production deploy: **NOT_RUN / HOLD**;
- a `20260830140000` production Supabase migráció alkalmazása: **NOT_RUN / HOLD**;
- v0.10.8 implementációs commit és feature-branch push: **PASS — `a0f9eb3`**.

Az aktuális fájl- és szerződéstérkép az
 [implementációs ütemtervben](./05-implementation-roadmap-and-contracts.md#21-v0108-aktualis-implementacios-terkep),
a bizonyítási szintek pedig a
[release-kapukban](./06-regression-acceptance-and-release-gates.md) találhatók.

## Dokumentumok

1. [Referenciaaudit és jelenlegi állapot](./01-reference-audit-and-current-state.md)
2. [Célarchitektúra, scope-ok és capability modell](./02-target-architecture-and-capabilities.md)
3. [Biztonság, adatvédelem és támogatási munkamenetek](./03-security-privacy-and-support-sessions.md)
4. [Információs architektúra és UX](./04-information-architecture-and-ux.md)
5. [Implementációs ütemterv és API-szerződés](./05-implementation-roadmap-and-contracts.md)
6. [Regresszió-, elfogadási és kiadási kapuk](./06-regression-acceptance-and-release-gates.md)

Az implementációt irányító promptok:
[`AI_PROMPTING_FOLDERSTRUCTURE/admin-control-center/00_INDEX.md`](../../../AI_PROMPTING_FOLDERSTRUCTURE/admin-control-center/00_INDEX.md).

## Bizonyossági jelölések

- **BIZONYÍTOTT:** a jelenlegi repository forrásából közvetlenül igazolt.
- **TERVEZETT v1:** a jelen fejlesztési kör konkrét szállítási része.
- **TERVEZETT később:** elfogadott cél, de nem része a v1-nek.
- **HOLD:** előfeltétel vagy külön biztonsági/jogi döntés nélkül nem élesíthető.

## Nem alkuképes invariánsok

1. A platformadmin route minden szerverhívása szerveroldalon is hitelesít.
2. Platformadat eléréséhez kizárólag a PanelLakó Supabase projekt használható.
3. A GeoData rendszer csak a dokumentált, PII-mentes címreferencia-határon érhető el.
4. Az admin DTO nem tartalmaz secretet, secret-prefixet, secret-hosszt, tokent,
   cookie-t, nyers provider hibát vagy indokolatlan PII-t.
5. Egy részpanel hibája nem teheti használhatatlanná a többi részpanelt.
6. A v0.10.8-ban hardeningolt user-trial, feature- és setting RPC, valamint a
   job, migration, GTFS batch és felsorolt governance action konkrét
   capabilityhez, reasonhöz és auditált életciklushoz kötött. Durable
   idempotency a szerződés szerint az azt fogadó request/execute/revoke
   parancsokon van; az approval- és support-döntés row-lockkal védett
   single-decision átmenet, kliens idempotency key nélkül. AAL2-t minden felsorolt
   route ellenőrzi; a trial/feature/setting/community és app-facing governance
   RPC a saját DB-s authority/AAL2 szerződését is érvényesíti. A job/GTFS és a
   post-approval migration futtatás a v0.10.7 service-role command plane-en
   marad. Négy-szem approvalt az
   operátori grant/revoke, migration apply és release attestation követel; ez
   nem általános megfelelőségi állítás minden érintetlen legacy route-ról.
7. A platformaudit kliens/API-szinten csak új eseményt kap; törlés és módosítás
   nem kerül a felületre. A migrációk a `service_role` számára is csak `SELECT`
   és `INSERT` auditjogot hagynak, az `UPDATE`, `DELETE` és `TRUNCATE` jogot
   visszavonják, a v0.10.8 pedig append-only triggerrel is védi az audit-,
   support-event- és attestation sorokat. Ez nem állítás a DB-owner/superuser
   abszolút immutabilitásáról.
8. A `workspace_id` ismerete önmagában nem jogosít tenantadat elérésére.
9. Minden új felületi szöveg magyar és angol nyelvi erőforrásból érkezik.
10. A meglévő adminfunkciók nem veszhetnek el az új információs architektúrában.
11. A v0.10.7 command plane-be bekötött kézi job, migration és GTFS batch
    ugyanazt a fail-closed globális zárat használja, amíg nincs bizonyítottan
    biztonságos resource-lock mátrix.
12. A command, a partícionált joblog és az audit átmenete nem válhat három
    egymástól független, részlegesen sikerülő alkalmazásírássá.
13. A GTFS globális mutation lock egyetlen, legfeljebb 500 soros batchre
    vonatkozik; teljes fájlra kiterjedő atomikusság csak külön tervezéssel és
    bizonyítással állítható.
14. A legacy break-glass munkamenet kizárólag read capabilitykre használható;
    platformmutációt, AAL2-t vagy névre szóló operátort nem helyettesíthet.
15. Support session létezése önmagában nem kerülheti meg a tenant RLS-t. Csak az
    exact workspace/agency scope-ra és allowlisted capabilityre újraellenőrzött
    action consumer használhatja; ilyen általános consumer még nincs lezárva.
