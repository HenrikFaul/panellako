# Szerepkör-alapú jogosultság tábla (Roles & Permissions)

_Utoljára frissítve: 2026-08-30 · v0.10.8_

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
| `szuperadmin` | Legacy platformadmin kompatibilitási szerep | A meglévő adminfelület elérésének kompatibilitási identitása; önmagában nem ad named platformmutációs authorityt |

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

A táblázat `szuperadmin` oszlopa a történeti UI-funkciók láthatóságát jelöli.
v0.10.8-tól a hardeningolt platformmutációk tényleges végrehajtási joga nem ebből
a tenant/legacy szerepből, hanem az alábbi named platformoperator assignmentből,
konkrét capabilityből és friss AAL2-ből származik. A legacy HMAC session csak
olvasási break-glass kompatibilitás; mutációs fallback nincs.

---

## Named platformoperator szerepkörök — v0.10.8

Ezek a szerepkörök a `platform_operator_roles`,
`platform_operator_role_capabilities` és időben érvényes
`platform_operator_assignments` táblákból származnak. Nem tenant-szerepkörök, és
nem írják felül a workspace RLS-t.

| Szerepkör | Seedelt capabilityk |
|---|---|
| `PLATFORM_OBSERVER` | `platform.overview.read`, `platform.health.read`, `platform.release.read`, `platform.integrations.read`, `platform.settings.read`, `platform.features.read`, `platform.communities.read`, `platform.migrations.read` |
| `SUPPORT_OPERATOR` | `platform.overview.read`, `platform.users.read_masked`, `platform.support.request`, `platform.support.revoke` |
| `COMMUNITY_REVIEWER` | `platform.overview.read`, `platform.communities.read`, `platform.communities.review` |
| `INTEGRATION_OPERATOR` | `platform.overview.read`, `platform.health.read`, `platform.integrations.read`, `platform.jobs.read`, `platform.settings.read`, `platform.jobs.run`, `platform.settings.manage` |
| `SECURITY_OPERATOR` | `platform.overview.read`, `platform.audit.read`, `platform.migrations.read`, `platform.operators.manage`, `platform.approvals.decide`, `platform.support.approve`, `platform.support.revoke`, `platform.release.attest` |
| `PLATFORM_ADMIN` | A v0.10.8 teljes seedelt platform-katalógusa; a kockázati kapuk alól ez a szerep sem ad felmentést |

Kötelező végrehajtási határok:

1. Named read route: a kért capability, vagy kizárólag olvasásra a legacy
   break-glass session.
2. Hardeningolt mutation route: named operátor + pontos capability + friss AAL2;
   a védett DB-RPC legfeljebb 15 perces AAL2-t ismét ellenőriz.
3. Operátori grant/revoke, migration apply és release attestation: exact-payload,
   lejáró, egyszer használható four-eyes approval; self-approval tiltott.
4. User-trial, feature, setting és community-review mutáció: capability + AAL2 +
   reason + idempotency + quota + atomi audit, de nincs rájuk általános
   four-eyes állítás.
5. Support session: legfeljebb 60 perces, pontos workspace- vagy agency-scope.
   Létrejötte önmagában nem ad tenant-hozzáférést és nem impersonation.

---

## RLS elvek

1. **Minden felhasználói táblán RLS kötelező** — explicit policy-k nélkül a Supabase
   csöndben 0 sort ad vissza.
2. **A service role nem felhasználói authorization.** A v0.10.8 hardeningolt
   app-facing mutációs RPC-k authenticated Supabase Auth sessionnel futnak, és
   DB-ben is ellenőrzik a named operátort, capabilityt és AAL2-t. A service role
   szerepe szűk: többek között az egyszeri first-operator bootstrap és a
   support-session expiry; legacy read/admin lekérdezésnél is csak szerveroldalon
   használható.
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
| 2026-08-30 | v0.10.8 named platformoperator role/capability, AAL2, approval és read-only break-glass határ rögzítve |
| 2026-06-05 | Dokumentum létrehozva (v0.9.32 best-practices PR) |
