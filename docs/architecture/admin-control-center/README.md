# PanelLakó platformadmin felület

**Állapot:** v1 kód-szinten implementálva; teljes lokális automatizált release-gate PASS, végleges hitelesített browser és hosted/production kapuk HOLD
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
8. a kézi jobok és migrációk tranzakciós, idempotens, globális single-flight
   koordinációja service-role-only RPC-kkel.

A v1 nem vezet be általános megszemélyesítést, nem ad nyers SQL-futtatót, nem
mutat secret-részleteket, és nem tesz egykattintásossá destruktív platformműveletet.

## v0.10.7 implementációs állapot

A dokumentált v1 szelet a `codex/platform-admin-control-center` feature branchen
kód-szinten elkészült:

- a `/superadmin` alapértelmezett, világos platformáttekintést kapott;
- a meglévő technikai áttekintés és adminmodulok külön tabon megmaradtak;
- új, szerveroldali `control-center` read API aggregálja a KPI-, attention-,
  integráció-, audit- és release-adatokat részleges hibára felkészítve;
- a frontend és a backend közös, verziózott manifest-fingerprintet ellenőriz;
- az audit projekció és az integrációs állapotok nem adnak át titkot,
  titok-karakterisztikát vagy nyers providerhibát;
- a health, stats, settings, job log, job command és migration command route-ok
  hitelesítési, origin-, payload-, allowlist- és auditvédelmet kaptak;
- a migration command kétlépcsős megerősítést használ, nyers SQL megjelenítése
  nélkül;
- a `20260830130000_platform_admin_job_commands.sql` forward-only migráció
  létrehozza/javítja a command, partícionált joblog és audit kapcsolatát;
- a kézi jobok és migrációk közös `platform:mutations` lockot, legfeljebb
  15 perces lease-t és atomikus begin/complete/expire RPC-ket használnak;
- a `20260830130000-v2` command contract az idempotency key mellett a
  `request_payload` egyezését is megköveteli; befejezett azonos kérés a tárolt
  safe receiptet játssza vissza, eltérő payload konfliktust ad;
- a kliens idempotency keyje ugyanazon böngészőtabban transport retry és
  oldalfrissítés között stabil marad;
- a GTFS import route same-origin, bounded és idempotens commandként legfeljebb
  500 sort kezel egy batchben. A globális lock batch-szintű, nem teljes
  fájl-lock; egy fájl több külön commandból áll;
- a GTFS utófeldolgozási lánc mindkét lépés hibáját továbbadja, így a második
  job hibája nem jelenik meg hamis teljes sikerként;
- a query-alapú tab deep link, böngésző Vissza/Előre és HU/EN felület része az
  implementációnak.

Bizonyítási határ:

- célzott admin command/GTFS Vitest: **PASS — 7 fájl / 36 teszt**;
- TypeScript: **PASS**;
- izolált PostgreSQL 18.4 migration + kétszeres reapply + v2
  replay/conflict/lock/log/audit-grant canary: **PASS**;
- teljes Vitest: **PASS — 73 fájl / 478 teszt**;
- ESLint: **PASS — 0 warning, 0 error**;
- production build: **PASS — 73/73 statikus oldal**;
- `git diff --check` és tiltott admin UI-copy scan: **PASS**;
- végleges hitelesített browser QA: **NOT_RUN / HOLD** — az in-app Browser
  webview nem tudott csatlakozni;
- hosted read-only smoke, release identity és production deploy: **NOT_RUN / HOLD**;
- production Supabase migráció alkalmazása: **NOT_RUN / HOLD**.

Az aktuális fájl- és szerződéstérkép az
[implementációs ütemtervben](./05-implementation-roadmap-and-contracts.md#21-v0107-aktualis-implementacios-terkep),
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
6. A v0.10.7-ben módosított settings/job/migration/GTFS batch írások auditált
   vagy auditált command-életciklushoz kötöttek. Új magas kockázatú műveletnél
   AAL2, indok, idempotencia és szükség esetén négy-szem elv kötelező; ez nem
   általános megfelelőségi állítás minden érintetlen legacy route-ról.
7. A platformaudit kliens/API-szinten csak új eseményt kap; törlés és módosítás
   nem kerül a felületre. A command v2 migráció a `service_role` számára is
   csak `SELECT` és `INSERT` jogot hagy, az `UPDATE`, `DELETE` és `TRUNCATE`
   jogot explicit visszavonja. Ez az operációs szerepkört védi, nem állítás a
   DB-owner/superuser abszolút immutabilitásáról.
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
