# 06 — QA, release attestation és lezárás

## Feladat

Zárd le a fejlesztési kört bizonyítékokkal, versioninggel és őszinte release
döntéssel. Ne tekints tervezett vagy nem futtatott ellenőrzést PASS-nak.

## Kötelező lokális kapuk

1. célzott superadmin/API/UI tesztek;
2. teljes tesztcsomag;
3. `npx tsc --noEmit`;
4. ESLint;
5. production build;
6. `git diff --check`;
7. secret/PII/raw-error forrás-invariáns;
8. i18n HU/EN paritás;
9. meglévő admin modul wiring;
10. idegen dirty fájlok megőrzése.
11. a `20260830140000_platform-admin-release.sha256` pontos 20 fájlos manifest,
    hash/range/count, exact release-head és pending-suffix workflow contractja;
12. production verifier static contractja a `130000` command és `140000`
    authority kritikus exact RPC signature-jére és grantjaira, a release 88/88
    public function nevére/`prokind` értékére, release-kritikus public/private
    táblákra, kijelölt capability-seed párokra és private-helper privilege lockra.

A célzott command/GTFS kör külön bizonyítsa:

- command v2 azonos payload + befejezett status/safe_result receipt replay;
- ugyanaz a key + eltérő payload conflict;
- audit `service_role` csak SELECT/INSERT, UPDATE/DELETE/TRUNCATE deny;
- GTFS same-origin, bounded body, strict mezőkorlát és maximum 500 sor/batch;
- GTFS idempotens batch replay és globális mutation lock;
- nincs teljes fájl-lock vagy fájlszintű atomi import állítás.

A v0.10.8 operator-authority kör külön bizonyítsa:

- named read capability és kizárólag read-only legacy break-glass;
- mutation deny break-glass, hiányzó capability és AAL1 esetén;
- maximum 15 perces AAL2 recheck a protected authenticated RPC-kben;
- first-operator bootstrap egyszeri és fail-closed;
- exact-payload approval, self-approval/expiry/drift deny és egyszeri consume;
- operator assignment overlap, self-revoke és last-admin védelem;
- maximum 60 perces exact workspace/agency support scope, no reactivation;
- release attestation csak exact approval mellett;
- trial/feature/setting durable receipt replay/conflict, atomi audit és direct
  write trigger deny;
- community review/duplicate-resolution authenticated digest/receipt, self-
  review és invalid domain-state deny, exact retry mellékhatás nélkül;
- audit/support-event/attestation append-only trigger és `service_role`
  SELECT/INSERT-only grant;
- PostgreSQL 18 első apply, teljes reapply és rollback-only runtime canary két
  egymást követő futása.

## Browser kapuk

- 375 és 1440 px;
- HU és EN;
- overview, loading, empty, degraded, error;
- release match/mismatch/unknown;
- tab deep link és Back;
- keyboard/focus;
- kontraszt;
- existing users/features/community/jobs/import/diagnostics útvonal.

## Hosted kapuk

- Preview deploy identity a várt commitra mutat;
- auth nélküli `/superadmin` védett;
- hitelesített overview render;
- safe DTO leak canary;
- részleges provider-hiba;
- production csak explicit deploy után állítható;
- DB-változásnál migration ledger, verify és két-tenant canary;
- fixture cleanup exact nulla maradvánnyal.

## Dokumentációs lezárás

- `CHANGELOG.md` új, ütközésmentes verzió;
- `versioning/DDMMYYNNN_vX.Y.Z_*.md`;
- `marketing/marketing_values/YYYYMMDD_vX.Y.Z_*_marketing_value.md`;
- append-only `codingLessonsLearnt.md`;
- architektúradokumentum implementációs státusza;
- PASS/HOLD/NOT_RUN bontás;
- rollback és fennmaradó kockázat.

## Git

- `codex/` feature branch;
- csak a saját változási szelet stagingje;
- hookok futnak, nincs `--no-verify`;
- commit convention;
- push csak a megfelelő feature branchre;
- main közvetlen push tilos.

## Release döntés

`PASS` csak tényleges hosted és release-identity bizonyítékkal. Minden hiányzó
production credential, DB authority, tenantizolációs próba vagy visual browser
QA `HOLD`/`NOT_RUN`, nem hallgatólagos siker.

## v0.10.8 aktuális lokális pillanatkép

- fókuszált settings/community/migration/command/users/features/control-center:
  **PASS — 45/45 teszt**;
- TypeScript: **PASS**;
- ESLint: **PASS — 0 warning, 0 error**;
- operator-authority statikus migration suite: **PASS — 17/17 teszt**;
- PostgreSQL 18 authority migration apply + reapply: **PASS**;
- runtime canary: **PASS — 2/2 egymást követő, community authorityt, stabil
  decision replayt és audit-egyszeriséget is fedő futás**;
- 20 fájlos migration-release manifest és friss workflow contract:
  **PASS — 8/8 célzott release teszt**; az authority migráció SHA-256 értéke
  `45B00B09CAFFC8AF50B2ECB21C3B0789684E4039D859CAF120FF5C0972ED2C99`;
- teljes v0.10.8 Vitest: **PASS — 88 tesztfájl / 577 teszt, 69,78 s**;
- production build: **PASS — 73/73 statikus oldal**; új admin UI-copy scan:
  **PASS**;
- lokális auth-határ HTTP-smoke: **PASS — 307 / 200 / 401 / 401**;
- browser, hosted, production Supabase apply és deploy: **NOT_RUN / HOLD**;
- v0.10.8 implementációs commit és feature-branch push: **PASS — `a0f9eb3`**.

A v0.10.7 korábbi teljes-suite/build PASS történeti bizonyíték; nem szabad a
v0.10.8 új authority migráció automatikus bizonyítékaként újrahasználni.
