# 02 — Typed manifest, safe DTO és aggregált read API

## Feladat

Implementáld a server-only admin manifestet és a
`GET /api/superadmin/control-center` aggregált read API-t.

## Scope

- típusos modul-, integráció- és job-katalógus;
- schema version és determinisztikus fingerprint;
- platform KPI collectorok;
- attention deriváció;
- integráció/config health;
- minimalizált audit projection;
- release identity;
- részleges hiba és timeout;
- route/auth/security tesztek.

## Non-goals

- új adatbázistábla;
- új destruktív command;
- support session;
- credential szerkesztése;
- meglévő job/import viselkedés átírása.

## Kötelező contract

Használd a
`docs/architecture/admin-control-center/05-implementation-roadmap-and-contracts.md`
safe DTO-ját. Minden section külön `ok | degraded | unavailable | unknown`
állapotot ad. A részleges hiba nem dobhatja el a sibling eredményeket.

## Biztonság

- server-side superadmin auth minden híváskor;
- kizárólag `NEXT_PUBLIC_SUPABASE_URL` + valódi service role;
- anon fallback tilos;
- explicit oszloplisták és bounded eredmények;
- `Cache-Control: no-store`;
- nyers `{error.message}` csak szerverlogban, kliensnek stabil issue code;
- env állapot csak `configured/missing/unknown`, secret-karakterisztika nélkül;
- remote read timeoutos, side-effect probe oldalbetöltéskor tilos;
- GeoData requestbe PII/tenantadat nem kerülhet.

## Tesztek

- auth nélküli 401;
- service credential hiány fail-closed;
- secret leak canary ismert tesztértékekkel;
- egy collector hibája mellett a többi PASS;
- missing table nem lesz `0`;
- manifest ID és fingerprint determinisztikus;
- audit DTO explicit mezőkkel és korláttal;
- integration config állapot nem tartalmaz prefixet/hosszt;
- response schema snapshot/validator.

## Dokumentáció

A kör végén frissítsd a changelogot, coding lessont, versioninget és marketing
value fájlt a repository governance szerint. Ne állíts hosted/production PASS-t
lokális tesztből.
