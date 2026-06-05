# Szerepkör-alapú jogosultság tábla (Roles & Permissions)

_Utoljára frissítve: 2026-06-05 · v0.9.32_

Ez a dokumentum egyetlen helyen rögzíti, hogy melyik szerepkör mit tehet a PanelLakó
platformon. **Az RLS policy-k, az API route-ok engedélyezési logikája és az UI
jogosultság-ellenőrzések mind innen kell hogy levezethetők legyenek.**

---

## Szerepkörök

| Kód | Elnevezés | Leírás |
|-----|-----------|--------|
| `lakó` | Lakó | Egyszerű bérlő/tulajdonos, nem képviseli az épületet |
| `tulajdonos` | Tulajdonos | Fizető előfizető-tag; az épület nevében is eljárhat |
| `bizottság` | Közös képviselő / bizottság | Az épület adminisztratív egysége |
| `megbízott` | Megbízott kezelő | Külső cég, vagyonkezelő, könyvelő |
| `szuperadmin` | Platformadmin | Anthropic/Panellakó belső — teljes hozzáférés |

---

## Jogosultság-mátrix

| Funkció | lakó | tulajdonos | bizottság | megbízott | szuperadmin |
|---------|:----:|:----------:|:---------:|:---------:|:-----------:|
| Saját profil szerkesztése | ✅ | ✅ | ✅ | ✅ | ✅ |
| Épület adatok megtekintése | ✅ | ✅ | ✅ | ✅ | ✅ |
| Hibabejelentés létrehozása | ✅ | ✅ | ✅ | ✅ | ✅ |
| Hibabejelentés lezárása | ❌ | ✅ | ✅ | ✅ | ✅ |
| Mérőóra-diktálás | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dokumentumok megtekintése | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dokumentumok feltöltése | ❌ | ✅ | ✅ | ✅ | ✅ |
| Zajriport rögzítése | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pénzügyek megtekintése | ❌ | ✅ | ✅ | ✅ | ✅ |
| Közgyűlés létrehozása | ❌ | ❌ | ✅ | ❌ | ✅ |
| Lakótársak listázása | ❌ | ❌ | ✅ | ✅ | ✅ |
| Értesítés küldése | ❌ | ❌ | ✅ | ✅ | ✅ |
| Előfizetés kezelése | ❌ | ✅ | ✅ | ❌ | ✅ |
| Épület beállítások | ❌ | ❌ | ✅ | ❌ | ✅ |
| Próbaidőszak módosítása | ❌ | ❌ | ❌ | ❌ | ✅ |
| Feature registry módosítás | ❌ | ❌ | ❌ | ❌ | ✅ |
| Tier változtatás (RPC) | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## RLS elvek

1. **Minden felhasználói táblán RLS kötelező** — explicit policy-k nélkül a Supabase
   csöndben 0 sort ad vissza.
2. **Szuperadmin műveletek service-role key-jel futnak** — sosem az anon/authenticated
   role-lal.
3. **Tier-változtatás kizárólag RPC-n keresztül** (`public.superadmin_change_workspace_tier`)
   — közvetlen `UPDATE tenant_subscriptions SET tier_id = ...` tilos.
4. **Audit trail kötelező** minden szuperadmin-kezdeményezett íráshoz
   (`platform_audit_events` tábla).

---

## Státusz lifecycle (illegal_dump_reports)

```
uj → folyamatban → megoldva
      ↑_____________|   (visszanyitható)
```

- `resolved_at` a lezáráskor (`megoldva`) kerül beállításra.
- **`resolved_at` visszanyitáskor NEM törlődik** — az audit trail megmarad.
- Egymást követő lezárások esetén a legkorábbi `resolved_at` marad meg.

---

## Változtatási napló

| Dátum | Változás |
|-------|---------|
| 2026-06-05 | Dokumentum létrehozva (v0.9.32 best-practices PR) |
