# 03 — Daylight overview, i18n és accessibility

## Feladat

Készítsd el az új alapértelmezett `/superadmin` áttekintést a meglévő
superadmin shellben, funkcionális regresszió nélkül.

## Kötelező blokkok

1. fejléc és frissítési állapot;
2. release identity;
3. platform KPI-k;
4. prioritásos attention inbox;
5. integrációs/config mátrix;
6. minimalizált audit timeline;
7. meglévő admin modulok egyértelmű indítói.

## Navigáció

- A tab query-alapú és deep-linkelhető.
- Felhasználói tabváltás push state; auth redirect replace.
- Users, Features és Community Requests tabok változatlanul elérhetők.
- A jobok, logok, settings, OSM/GTFS import és diagnosztika nem veszhet el.
- PII és belső user/session ID nem kerül URL-be.

## State machine

Minden panel önálló:

`idle → loading → ready | empty | degraded | error → retrying`

AbortController vagy ekvivalens védi a stale response-t. Refresh alatt a már
meglévő biztonságos adat megmaradhat, de a freshness látható.

## UI szabályok

- Használd a PanelLakó daylight tokeneket.
- Sötét felület csak valódi log/kód overlay.
- Nincs emoji státuszjelzés.
- Az állapot szöveggel és ikonnal is közölt.
- Minimum 44×44 px cél, látható focus, logikus heading.
- 375 px és 1440 px kötelező.
- Reduced motion támogatás.

## i18n

- Minden új string: `superadmin.controlCenter.*`.
- HU és EN ugyanabban a commitban.
- A manifest csak i18n kulcsot tárol user-facing szöveg helyett.
- Modul-szintű konstansban nincs hardkódolt magyar/angol címke.

## Tesztek

- default overview render;
- részleges hiba;
- loading/empty/retry;
- tab deep link és Back;
- existing module wiring;
- stale response;
- HU/EN key parity;
- accessible names/tab keyboard;
- tiltott/hardkódolt UI-copy forrás-invariáns;
- 375/1440 browser screenshot és kontraszt.
