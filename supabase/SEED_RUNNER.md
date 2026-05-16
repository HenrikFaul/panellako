# PanelLakó Demo Seed Runner

> Ez a fájl Claude Code prompt-ként működik. Nyisd meg Claude Code-ban és ő elvégzi a seedelést.

## Claude Code utasítások (automatikusan végrehajtandó)

Ha ez a fájl Claude Code-ban van megnyitva instrukció-ként, hajtsd végre az alábbi lépéseket:

1. Olvasd be a `supabase/seed.sql` teljes tartalmát
2. Próbáld meg a Supabase MCP `apply_migration` tool-lal alkalmazni a projekt ID-ra (`wzromwxpjlyrqbdiapep`). Ha a MCP nem érhető el ehhez a projekthez, ugorj a 3. lépésre.
3. Ha MCP nem érhető el: jelenítsd meg a seed.sql tartalmát copy-paste instrukciókkal a Supabase SQL Editor-hoz:
   - Nyisd meg: https://supabase.com/dashboard/project/wzromwxpjlyrqbdiapep/sql/new
   - Másold be a seed.sql teljes tartalmát
   - Kattints a **Run** gombra
4. Ellenőrizd az alkalmazás sikerességét az alábbi SQL lekérdezéssel:
   ```sql
   SELECT
     (SELECT count(*) FROM auth.users   WHERE id IN (
       'aaaaaaaa-0001-0001-0001-000000000001',
       'aaaaaaaa-0002-0002-0002-000000000002',
       'aaaaaaaa-0003-0003-0003-000000000003')) AS auth_users,
     (SELECT count(*) FROM public.profiles)             AS profiles,
     (SELECT count(*) FROM public.buildings)            AS buildings,
     (SELECT count(*) FROM public.units)                AS units,
     (SELECT count(*) FROM public.memberships)          AS memberships,
     (SELECT count(*) FROM public.announcements)        AS announcements,
     (SELECT count(*) FROM public.notifications)        AS notifications,
     (SELECT count(*) FROM public.tickets)              AS tickets,
     (SELECT count(*) FROM public.meter_readings)       AS meter_readings,
     (SELECT count(*) FROM public.documents)            AS documents,
     (SELECT count(*) FROM public.finance_entries)      AS finance_entries,
     (SELECT count(*) FROM public.meetings)             AS meetings,
     (SELECT count(*) FROM public.vendors)              AS vendors,
     (SELECT count(*) FROM public.work_orders)          AS work_orders,
     (SELECT count(*) FROM public.knowledge_base_articles) AS kb_articles,
     (SELECT count(*) FROM public.audit_logs)           AS audit_logs,
     (SELECT count(*) FROM public.subscriptions)        AS subscriptions;
   ```
   Elvárt eredmény: minden sor értéke > 0, a seed RAISE NOTICE üzenetek a log-ban láthatók.
5. Összefoglald mi jött létre (lásd "Futtatás után elvárt állapot" szekció).

---

## Demo bejelentkezési adatok (seed után)

| Szerepkör | E-mail | Jelszó |
|-----------|--------|--------|
| Közös képviselő | demo.kepviselo@panellako.hu | PanelLako2026! |
| Lakó | demo.lako@panellako.hu | PanelLako2026! |
| Könyvelő | demo.konyvelo@panellako.hu | PanelLako2026! |

---

## Supabase projekt adatok

| Mező | Érték |
|------|-------|
| Project ID | `wzromwxpjlyrqbdiapep` |
| SQL Editor URL | https://supabase.com/dashboard/project/wzromwxpjlyrqbdiapep/sql/new |
| Auth Users URL | https://supabase.com/dashboard/project/wzromwxpjlyrqbdiapep/auth/users |

---

## Fontos fejlesztési szabály

Ha a PanelLakó alkalmazásba új adatbázis táblák vagy feature-ök kerülnek, ez a seed **MINDIG** legyen kibővítve az új tábla/feature demo adataival.

**Kötelező workflow:**
```
Új migration vagy feature
  → supabase/seed.sql kiegészítése az új tábla demo soraival
  → Mindkét fájl commit ugyanabban a PR-ban
```

A seed UUID-ok fix értékek — soha ne változtasd meg a meglévőket, csak újakat adj hozzá.

---

## Futtatás után elvárt állapot

### Felhasználók és hozzáférés
- 3 bejelentkező felhasználó (Supabase Auth + `profiles` tábla)
- 3 membership az "Alkotás utca 42." épülethez

### Épület és albetétek
- 1 épület: **Alkotás utca 42.** (Budapest, XI. kerület)
- 16 albetét: A/1–A/8 és B/1–B/8
- 3 albetétnél hátralék: A/2 (24 500 Ft), A/4 (18 750 Ft), A/7 (9 200 Ft)

### Dashboard tab-ok tartalma
| Tab | Demo adat |
|-----|-----------|
| Hirdetőtábla | 5 bejelentés (tarsashazi_kozlony, uzemeltetes, biztonsag) |
| Értesítések | 6 értesítés (3 olvasott, 3 olvasatlan) |
| Hibabejelentések | 8 jegy (uj, folyamatban, varakozik, lezarva mix) |
| Mérőórák | 6 leolvasás (viz, gaz, villany, 3 különböző albetétből) |
| Dokumentumok | 4 doc, 2 aláírás (lako user) |
| Pénzügyek | 8 bejegyzés, 3 hátralékos albetét |
| Közgyűlés | 2 meeting (1 lezárt napirend+határozat+szavazat, 1 tervezett) |
| Munkamegrendelések | 3 work order, 4 alvállalkozó |
| Tudásbázis | 5 cikk (SZMSZ, pénzügy, tűzvédelem, parkoló, szemét) |
| Audit napló | 10 bejegyzés |
| Billing | 1 aktív trial subscription (alap, 14 nap) |

### AI triage adatok
- 6 jegyhez van `ai_category`, `ai_urgency`, `ai_summary_hu` feltöltve
- 2 jegynél nincs (demonstrálja a feldolgozatlan állapotot)

### Szimulált hátralékos helyzet
```
A/2 – Tóth Anna:    −24 500 Ft  (nyitó + részleges befizetés)
A/4 – Kiss Erzsébet: −18 750 Ft  (2026-02 charge, részleges)
A/7 – Molnár Katalin: −9 200 Ft  (2026-03 charge, részleges)
```

---

## Seed újrafuttatás (idempotent)

A seed.sql újrafuttatható — minden INSERT tartalmaz `ON CONFLICT DO NOTHING` kikötést.
Kivétel: az auth.users táblába való INSERT idempotens az `id`-ra, de az `email` oszlopon is egyedi kényszer lehet. Ha e-mail conflict-et kapsz, a felhasználók már léteznek és ezt figyelmen kívül hagyhatod.

---

## Hibaelhárítás

| Hiba | Megoldás |
|------|----------|
| `relation "auth.users" does not exist` | Csak Supabase környezetben futtatható, lokális PostgreSQL-en nem |
| `permission denied for table subscriptions` | Futtasd service_role-ként (SQL Editor alapból ilyen) |
| `function set_updated_at() does not exist` | Előbb futtasd a `schema.sql`-t |
| `ERROR: duplicate key value` (auth.users) | A felhasználók már léteznek — biztonságosan figyelmen kívül hagyható |
| `crypt()` nem található | `CREATE EXTENSION IF NOT EXISTS pgcrypto;` — a schema.sql tartalmazza |
