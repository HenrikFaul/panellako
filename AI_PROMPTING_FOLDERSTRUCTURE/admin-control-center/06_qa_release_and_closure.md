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

A célzott command/GTFS kör külön bizonyítsa:

- command v2 azonos payload + befejezett status/safe_result receipt replay;
- ugyanaz a key + eltérő payload conflict;
- audit `service_role` csak SELECT/INSERT, UPDATE/DELETE/TRUNCATE deny;
- GTFS same-origin, bounded body, strict mezőkorlát és maximum 500 sor/batch;
- GTFS idempotens batch replay és globális mutation lock;
- nincs teljes fájl-lock vagy fájlszintű atomi import állítás.

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
