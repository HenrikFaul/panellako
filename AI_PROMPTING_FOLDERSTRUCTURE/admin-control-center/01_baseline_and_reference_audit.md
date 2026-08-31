# 01 — Baseline, referenciaaudit és regressziós inventory

## Feladat

Bizonyítsd a PanelLakó admin jelenlegi állapotát, és készíts végrehajtható gap
listát a v1 áttekintéshez. Ebben a lépésben ne írj production kódot.

## Kötelező vizsgálat

1. CodeGraph-pal térképezd fel:
   - `app/superadmin/**`;
   - `components/superadmin-*.tsx`;
   - `app/api/superadmin/**`;
   - `lib/superadmin-auth.ts` és `lib/supabase/admin.ts`;
   - `platform_settings`, `platform_job_logs`, `platform_audit_events` sémát;
   - superadmin teszteket és HU/EN i18n kulcsokat.
2. Olvasd el a négy referencia auditját a
   `docs/architecture/admin-control-center/01-reference-audit-and-current-state.md`
   fájlban; csak akkor nyisd meg újra a külső repókat, ha egy döntéshez pontos
   bizonyíték hiányzik.
3. Rögzítsd a jelenlegi route/API/komponens/akció mátrixot.
4. Jelöld külön a biztonsági réseket, a UX réseket és az élesítési HOLD-okat.

## Kimenet

- fájl- és szimbólumszintű current-state térkép;
- minden meglévő funkció regressziós checkliste;
- v1 fájlterv és blast radius;
- tesztterv;
- egyértelmű lista arról, mi nem része a v1-nek.

## Biztonsági ellenőrzés

Keresd meg és jelöld P0/P1-ként:

- anon fallback privilegizált route-on;
- secret prefix/hossz vagy nyers hiba a response-ban;
- `select('*')` admin/audit lekérdezésben;
- tetszőleges settings/job/URL input;
- audit nélküli mutáció;
- kliens által megadott actor/scope;
- same-origin, body limit, timeout vagy idempotencia hiánya.

## Elfogadás

- Egyetlen meglévő adminfunkció sincs kihagyva az inventoryból.
- Minden állítás BIZONYÍTOTT vagy külön FELTÉTELEZÉS/HOLD.
- Nincs kód-, séma-, changelog- vagy versioning módosítás ebben a lépésben.
