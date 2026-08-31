# 02 — Célarchitektúra, scope-ok és capability modell

## 1. Scope-hierarchia

```mermaid
flowchart TD
    P[Platform scope\nPanelLakó szolgáltatás] --> A[Agency scope\nkezelő szervezet]
    P --> W[Workspace scope\nlakóközösségi tenant]
    A -->|mandátum| W
    W --> B[Building scope\nfizikai épület]
    B --> U[Unit scope\nalbetét]
    W --> R[Workspace erőforrások\ndokumentum, pénzügy, közgyűlés]
    P --> S[Support session\nidőkorlátos cél-scope]
    S --> A
    S --> W
```

### Platform scope

Kereszt-workspace állapot, integrációk, kiadási információ, platformaudit,
feature registry, felhasználói fiókok és közösségi aktiválási kérelmek.

### Agency scope

Egy kezelő szervezet portfóliója, munkatársai, mandátumai és delegációi. Egy
agency több workspace-hez kapcsolódhat, de ez nem ad automatikus
platformjogosultságot.

### Workspace scope

A tenant-biztonsági határ. A workspace-admin csak az adott workspace és az
ahhoz tartozó épület/albetét/erőforrás körében járhat el.

### Building és unit scope

Az épület és albetét fizikai/domain erőforrás. A platformadmin felületen ezek
csak aggregált KPI-ként vagy egy explicit, auditált support session céljaként
jelenhetnek meg.

## 2. Authority és role nem ugyanaz

Az effektív jogosultság számítása:

```text
engedélyezett =
  hitelesített, aktív operátori identity
  ÉS aktív szerepkör-hozzárendelés
  ÉS a szerepkörből vagy explicit delegációból eredő capability
  ÉS a capability scope-ja tartalmazza a célobjektumot
  ÉS az authority időben érvényes
  ÉS a munkamenet assurance szintje megfelelő
  ÉS a művelet state machine-je engedi az átmenetet
  ÉS magas kockázatnál rendelkezésre áll a szükséges jóváhagyás
```

A kliensoldali tab- vagy gombrejtés nem authorization kontroll.

## 3. v0.10.8 platform capability katalógus

| Capability | Scope | DB risk class | v0.10.8 állapot |
|---|---|---:|---|
| `platform.overview.read` | platform | R0 | named read |
| `platform.health.read` | platform | R0 | named read |
| `platform.release.read` | platform | R0 | named read |
| `platform.integrations.read` | platform | R0 | named read, bounded preset diagnostics |
| `platform.audit.read` | platform | R1 | named, minimalizált read |
| `platform.users.read_masked` | platform | R1 | bounded, maszkolt read |
| `platform.users.manage_trial` | platform | R3 | AAL2 + authenticated RPC |
| `platform.features.read` | platform | R0 | named read |
| `platform.features.manage` | platform | R3 | AAL2 + authenticated RPC |
| `platform.communities.read` | platform | R0 | seedelt read capability; a jelenlegi community route a szigorúbb `platform.communities.review` capabilityt kéri |
| `platform.communities.review` | platform/workspace | R3 | AAL2 + authenticated atomic RPC |
| `platform.jobs.read` | platform | R0 | named read |
| `platform.jobs.run` | platform | R2 | AAL2 + command v2 |
| `platform.settings.read` | platform | R0 | named read |
| `platform.settings.manage` | platform | R2 | AAL2 + authenticated RPC |
| `platform.migrations.read` | platform | R0 | named read |
| `platform.migrations.apply` | platform | R4 | AAL2 + exact-payload four-eyes approval |
| `platform.operators.manage` | platform | R4 | AAL2 + exact-payload four-eyes approval |
| `platform.approvals.decide` | platform | R3 | AAL2, self-approval deny |
| `platform.support.request` | workspace/agency | R3 | scoped lifecycle |
| `platform.support.approve` | platform | R3 | külön approver + AAL2 |
| `platform.support.revoke` | workspace/agency | R3 | idempotens revoke |
| `platform.release.attest` | platform | R4 | AAL2 + exact-payload four-eyes approval |

## 4. Operátori szerepek v0.10.8 seedmodellje

| Szerep | Tipikus capability | Nem kapja meg automatikusan |
|---|---|---|
| `PLATFORM_OBSERVER` | overview, health, release, integrations, settings/features/community/migration read | PII, mutáció |
| `SUPPORT_OPERATOR` | overview read, maszkolt userkeresés, support request/revoke | az observer többi read capabilityje és közvetlen tenantírás |
| `COMMUNITY_REVIEWER` | közösségi kérelmek kezelése | feature/billing/job admin |
| `INTEGRATION_OPERATOR` | integráció- és jobállapot, engedélyezett futtatás | user/tenant tartalom |
| `SECURITY_OPERATOR` | overview/audit/migration read, operator-, approval-, support- és release-governance | üzleti tartalom kezelése |
| `PLATFORM_ADMIN` | teljes katalógus, kockázati kapukkal | kapuk megkerülése |

A v0.10.8 névre szóló Supabase Auth profilt és időben érvényes operátori
assignmentet használ. A szerveroldali authority a DB-ből kapott role/capability
contextet ellenőrzi. A meglévő HMAC superadmin session kizárólag átmeneti,
read-only break-glass adapter: mutációt, AAL2-t vagy approvalt nem helyettesít.

A táblázat a v0.10.8 aktív, seedelt capabilityket és a tényleges route-határt
együtt mutatja; a seed önmagában nem jelent végrehajtási jogot. A closure során
a route nélküli `platform.users.manage` seed és a nem seedelt
`platform.integrations.test` TypeScript-union érték eltávolításra került. A
későbbi `platform.audit.export` nem v0.10.8 aktív capability. Így a release-ben
maradt manifest/migráció/route capability-katalógus zárt, a route pedig továbbra
is külön server-side authorityt ellenőriz.

## 5. Modularchitektúra

```mermaid
flowchart LR
    UI[/superadmin shell] --> API[/api/superadmin/control-center]
    UI --> GOV[/api/superadmin/governance]
    API --> AUTH[Named operator authority]
    GOV --> AUTH
    AUTH --> BREAK[Read-only break-glass adapter]
    API --> MANIFEST[Typed admin manifest]
    API --> KPI[KPI collectors]
    API --> HEALTH[Integration health collectors]
    API --> INBOX[Attention derivation]
    API --> AUDIT[Audit projection]
    API --> RELEASE[Release identity]
    KPI --> DB[(PanelLakó Supabase)]
    HEALTH --> DB
    INBOX --> DB
    AUDIT --> DB
    HEALTH --> GEO[GeoData Address Registry API]
```

### Typed admin manifest

A `lib/superadmin/manifest.ts` egyetlen server-only katalógusban írja le:

- modulazonosító, cím i18n-kulcs és kategória;
- szükséges capability és scope;
- adatforrás és kritikalitás;
- olvasási próba vagy command típusa;
- timeout és freshness küszöb;
- kapcsolódó runbook azonosító;
- támogatott állapotok;
- biztonságos deep link;
- contract schema version és determinisztikus fingerprint.

A `lib/superadmin/control-center.ts` a publikus DTO-t és a backward-compatible,
fail-closed normalizálást tartalmazza; a collectorok nem tarthatnak fenn második,
eltérő modul-/integráció-/job-katalógust.

### Collector szabály

Minden collector:

- server-only;
- explicit timeoutot használ;
- csak a szükséges mezőket kérdezi le;
- az összes `{ data, error }` eredményt külön ellenőrzi;
- nem esik vissza anon kulcsra;
- hibát biztonságos kódra és státuszra normalizál;
- saját részpanel-eredményt ad, ezért a sibling collectoroktól izolált.

## 6. Adatáramlás és részleges hiba

A v1 aggregátor párhuzamosan gyűjti a független részeket, majd minden részhez
külön státuszt ad:

```text
ok          — hiteles és friss adat
degraded    — részadat vagy freshness probléma
unavailable — a forrás nem válaszolt vagy nincs konfigurálva
unknown     — nincs elég bizonyíték állapotot állítani
```

Az összesített oldal `overallStatus` értéke a legsúlyosabb kötelező rész
állapotából származik. `unknown` és `unavailable` soha nem jelenhet meg zöldként.

## 7. Tenantizolációs szabályok az adminban

- Platform KPI csak aggregált számot ad, nem kever tenantlistát a dashboardba.
- Workspace drill-down előtt a cél scope explicit kiválasztása szükséges.
- Egy support authorization pontosan egy aktív workspace vagy agency scope-ra,
  allowlisted capabilityre és access mode-ra érvényes.
- Scope-váltás törli a kliens cache-ét és invalidálja a függőben lévő válaszokat.
- Cross-tenant export nem része a v1-nek.
- A workspace-admin jelenlegi capability és RLS logikája változatlan marad.
- A v0.10.8 az authorization primitive-et és governance lifecycle-t szállítja;
  általános tenantadatot olvasó/író support-action consumer még nincs lezárva,
  ezért support sessionből nem következik automatikus tenant-hozzáférés.
