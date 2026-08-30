# 05 — Implementációs ütemterv és API-szerződés

## 1. Szállítási stratégia

Az átállás additív. A meglévő `/superadmin` funkciók a teljes v1 alatt
elérhetők maradnak. Előbb read plane és biztonságos szerződés készül, csak ezután
jöhetnek új commandok.

## 2. Fázisok

Az alábbi rész előbb az aktuális megvalósítást rögzíti, majd megőrzi az eredeti
fázistervet és annak további, még nyitott kapuit.

### 2.1. v0.10.7 aktuális implementációs térkép

Az alábbi fájlok a v1 kód-szintű megvalósítását adják. A felsorolás nem
production bizonyíték: a célzott admin-, izolált adatbázis- és teljes lokális
automatizált kapuk PASS, a végleges hitelesített browser és hosted/production
kapu pedig HOLD, amíg a külön ellenőrzési és deploy-bizonyíték el nem készül.

| Felelősség | Megvalósítás |
|---|---|
| Közös DTO, integrációkatalógus, schema-verzió és determinisztikus fingerprint | `lib/superadmin/control-center.ts` |
| Safe collectorok, részleges hiba, KPI/attention/integráció/audit/release projekció | `lib/superadmin/control-center-server.ts` |
| Aggregált, `no-store` platform snapshot | `app/api/superadmin/control-center/route.ts` |
| Minimalizált, lapozható audit read endpoint | `app/api/superadmin/audit/route.ts` |
| Világos, reszponzív, részpanelhibát kezelő overview | `components/superadmin-control-center.tsx` |
| Meglévő superadmin shell, tab URL-állapot és legacy funkciók megtartása | `components/superadmin-client.tsx` |
| Safe health/stats/settings/job/migration route-ok | `app/api/superadmin/health/route.ts`, `stats/route.ts`, `settings/route.ts`, `jobs/logs/route.ts`, `jobs/run/route.ts`, `apply-migrations/route.ts` |
| Batch-szintű GTFS import guard és receipt replay | `app/api/superadmin/gtfs/import/route.ts`, `components/superadmin-gtfs-import.tsx` |
| Command-contract beágyazott SQL és kliensoldali retry-kulcs | `lib/superadmin/platform-job-command-sql.ts`, `lib/superadmin/idempotency-client.ts` |
| Atomikus command/log/audit állapotgép és globális mutation lock | `supabase/migrations/20260830130000_platform_admin_job_commands.sql` |
| Magyar és angol UI-copy | `src/i18n/resources/hu.ts`, `src/i18n/resources/en.ts` |
| Route-, hardening-, command- és UI-regresszió | `tests/app/api/superadmin-*.test.ts`, `tests/lib/superadmin-idempotency-client.test.ts`, `tests/ui/superadmin-control-center.test.tsx`, `tests/ui/superadmin-gtfs-import.test.tsx` |

Megvalósított viselkedési határ:

1. A `/superadmin` új kezdőlapja read-only összesítő; a nehéz legacy
   settings/stats/log/health lekérések csak a technikai áttekintés megnyitásakor
   indulnak.
2. A szerveroldali admin kliens kötelező; privilegizált route-on nincs anon
   fallback.
3. A kliens nem kap env-nevet, secretértéket, prefixet, hosszt, tokent, nyers
   SQL-t vagy nyers providerhibát.
4. A hosszú ideje `running` job fail-visible attention elemként jelenik meg;
   egy hiányzó forrás nem nullázza le a többi panelt.
5. A platform setting és command bemenet same-origin, content-type, bounded JSON
   és allowlist kapu mögött marad; a migration action külön végső megerősítést
   kér.
6. A kézi jobok és migrációk UUID idempotency keyt, közös
   `platform:mutations` single-flight lockot és legfeljebb 15 perces lease-t
   használnak. A command, a kompozit azonosságú partícionált joblog és az audit
   begin/complete/expire RPC-kben atomikusan változik.
7. A command contract v2 csak egyező `request_payload` mellett enged
   befejezett receipt replayt (`status` + `safe_result`); ugyanaz a kulcs eltérő
   payloaddal konfliktus.
8. A GTFS import ugyanazt a command guardot használja, de pontosan egy,
   legfeljebb 500 soros batchre. Egy fájl több külön lockolt command; nincs
   teljes fájl-lock vagy fájlszintű atomikussági állítás.
9. A GTFS utófeldolgozási lánc mindkét lépés válaszszerződését ellenőrzi, és a
   második lépés hibáját a manuális és ZIP-import felé is továbbadja.
10. Általános impersonation, support session, névre szóló capability és
   AAL2/four-eyes approval registry továbbra is későbbi, külön biztonsági
   szelet.

### Fázis 0 — baseline és karakterizáció

1. Aktuális superadmin route-, komponens- és API-inventory rögzítése.
2. Meglévő users/features/community/jobs/import/diagnostics útvonalak
   karakterizációs tesztje.
3. Secret- és raw-error-szivárgási tesztbaseline.
4. HU/EN kulcsparitás és 375/1440 vizuális baseline.

Kilépési kapu: a jelenlegi viselkedés tesztekkel pinelt, az idegen dirty worktree
érintetlen.

### Fázis 1 — typed manifest és server-only alapok

Tervezett új modulok:

- `lib/superadmin/control-center.ts` — modul/integráció/job manifest és DTO;
- `lib/superadmin/service-client.ts` vagy a meglévő
  `lib/supabase/admin.ts` kiterjesztése — kizárólag service-role, anon fallback nélkül;
- `lib/superadmin/safe-diagnostics.ts` — státusz-, hiba- és metadata-normalizálás;
- manifest contract version + determinisztikus fingerprint.

Kapu:

- server-only import invariant;
- hiányzó service credential fail-closed;
- manifest ID-k egyediek;
- minden modul i18n-kulcsa mindkét locale-ban létezik;
- semmilyen secret metadata nem része a public DTO-nak.

### Fázis 2 — aggregált read API

Tervezett route:

`GET /api/superadmin/control-center`

Feladata:

- superadmin auth ellenőrzés;
- collectorok párhuzamos, timeoutos futtatása;
- platform KPI-k;
- attention itemek deriválása;
- integrációs/config health;
- legutóbbi audit események minimalizált projekciója;
- release identity;
- részleges hiba szerződés;
- `Cache-Control: no-store`.

Javasolt response:

```json
{
  "schemaVersion": "panellako.admin-control-center.v1",
  "generatedAt": "2026-08-30T12:00:00.000Z",
  "overallStatus": "degraded",
  "manifestFingerprint": "sha256:...",
  "release": {
    "status": "unknown",
    "webSha": null,
    "backendSha": null,
    "deployedAt": null
  },
  "sections": {
    "kpis": { "status": "ok", "items": [] },
    "attention": { "status": "ok", "items": [] },
    "integrations": { "status": "degraded", "items": [], "issues": [] },
    "audit": { "status": "unavailable", "items": [], "issues": [] }
  }
}
```

Az `issues` csak stabil kódot és biztonságos, lokalizálható paramétert tartalmaz.
Nyers `error.message` nem része a response-nak.

### Fázis 3 — új default overview UI

Tervezett komponensek:

- `components/superadmin-control-center.tsx` — orchestrator;
- kisméretű prezentációs részek a release, KPI, attention, integrations és audit
  blokkokhoz, ha a komponensméret ezt indokolja;
- meglévő `components/superadmin-client.tsx` integrációja úgy, hogy a jelenlegi
  tabok és funkciók változatlanul megmaradnak.

Kötelező:

- query-alapú tab deep link push state-tel;
- panelenként loading/error/empty;
- stale-response és abort védelem;
- HU/EN i18n;
- daylight design;
- WCAG állapotjelzés;
- 375 és 1440 px ellenőrzés.

### Fázis 4 — meglévő route-ok hardeningje

Prioritás:

1. `health`: secret prefix/hossz és kulcselemzés eltávolítása;
2. `stats` és `settings`: anon fallback megszüntetése;
3. `settings`: kulcs- és payload-allowlist, same-origin, bounded JSON, audit;
4. jobs: stabil job manifest, idempotencia/concurrency, explicit partial állapot;
5. users/features/community: raw DB hiba helyett stabil error code;
6. diagnostics/import: input allowlist, timeout, SSRF-védelem és audit; ebből a
   v0.10.7 csak a GTFS batch route same-origin/bounded/idempotens/globális-lock
   szeletét állítja késznek, nem minden legacy import- vagy diagnostics route-ot;
7. `apply-migrations`: külön R3/R4 kapu vagy későbbi kivezetés a release pipeline javára.

A hardening nem változtathatja meg a normál sikeres workflow-kat.

### Fázis 5 — command és approval plane

A v0.10.7-ben elkészült a minimális végrehajtás-koordináció:

- idempotens command registry a kézi jobokhoz és migrációkhoz;
- v2 receipt replay egyező request payload, befejezett status és safe result
  alapján; eltérő payloadnál konfliktus;
- konzervatív globális single-flight target;
- 15 perces, fail-closed expiry lease;
- atomikus command + joblog + audit state machine;
- service-role-only RPC és RLS-határ.

Későbbi bővítés:

- névre szóló operátori identity;
- AAL2 step-up;
- négy-szem approval;
- support session;
- audit export;
- runbook és immutable receipt;
- outbox/worker a hosszú műveletekhez.

Ez nem v1 szállítási feltétel.

## 3. KPI collector szerződés

Minden KPI:

```text
id, labelKey, value|null, unit, status,
freshnessAt|null, source, drillDownHref|null
```

Szabályok:

- `null` = ismeretlen/nem elérhető, soha nem konvertálható nullára;
- count query explicit workspace/állapot definícióval;
- migráció hiánya stabil `SOURCE_UNAVAILABLE` issue;
- PII és tenantlista nem kerül a KPI DTO-ba;
- lekérdezések párhuzamosak, de connection-pool kímélő concurrency limittel.

## 4. Integráció collector szerződés

```text
id, category, nameKey, purposeKey, criticality,
configurationStatus, runtimeStatus, lastCheckedAt,
lastSuccessAt, freshnessState, latencyBucket,
probeKind, sideEffect, runbookId, actionHref
```

`probeKind`:

- `config_only` — csak szerveroldali jelenlét;
- `local_read` — PanelLakó DB read;
- `remote_read` — bounded külső read;
- `synthetic` — előre definiált canary, külön budgettel;
- `command` — side effect, overview betöltésekor tilos.

## 5. Attention deriváció

Az inbox determinisztikus szabályokból épül. Példák:

| Feltétel | Severity | Elem |
|---|---|---|
| release mismatch | critical | release |
| kritikus integration missing | high | integration |
| job `running` túl a stale küszöbön | high | job |
| job `partial`/`failed` 24 órán belül | medium/high | job |
| függő community request SLA közelében | medium | request |
| audit collector unavailable | high | security |
| nem kritikus cache stale | low | data freshness |

Ugyanaz a forrásesemény stabil attention ID-t kap, így refresh nem duplikálja.

## 6. Audit projection

A v1 explicit mezőket kér:

```text
id, action, actor_id, target_type, target_id,
created_at, outcome, recovery/support marker
```

A szerver:

- actor labelt maszkol vagy `system`-re normalizál;
- target labelt csak nem érzékeny katalógusból képez;
- metadata teljes objektumát nem adja vissza;
- az ismeretlen actiont generikus lokalizálható címkére képezi;
- legfeljebb kis, fix elemszámot ad az overview-nak.

A teljes audit oldal később keyset paginationt használ `(created_at, id)` szerint.

## 7. Release identity

Források prioritása:

1. build-time commit SHA és verzió;
2. backend által visszaadott release/manifest fingerprint;
3. deploy timestamp, ha hiteles környezeti forrásból származik.

Állapot:

- `match`: mindkét SHA és a szükséges contract fingerprint egyezik;
- `mismatch`: legalább egy bizonyított eltérés;
- `unknown`: bármelyik szükséges identity hiányzik vagy malformed;
- `error`: a backend ellenőrzés nem futott le.

Az `unknown` nem tekinthető release PASS-nak.

## 8. Migrációs igény

A read API továbbra is a meglévő
workspace/building/unit/profile/agency/request/job/audit forrásokat aggregálja.
A kézi platformmutációk biztonságos koordinációjához azonban elkészült a
forward-only `20260830130000_platform_admin_job_commands.sql` migráció.

Ez a migráció:

- hiányuk esetén létrehozza az audit- és kompozit kulcsú joblog-alapot, a
  command táblát pedig kompatibilisen létrehozza vagy javítja;
- egyedi idempotency indexet és `status = 'running'` részleges globális target
  indexet tart fenn;
- objektum típusú `request_payload`-ot tárol; csak a teljes command identity és
  payload egyezése adhat befejezett `status` + `safe_result` replayt;
- a partícionált joblogot `(log_id, log_started_at)` párral azonosítja;
- `FOR UPDATE SKIP LOCKED` expiry feldolgozást és tranzakciós
  begin/complete/expire RPC-ket biztosít;
- az RPC-ket és táblákat az `anon`/`authenticated` szerepkörtől elzárja; a
  `platform_audit_events` táblán a `service_role` kizárólag `SELECT` és
  `INSERT` jogot kap, az `UPDATE`/`DELETE`/`TRUNCATE` jog visszavont;
- a lease-t legfeljebb 15 percre korlátozza.

Az izolált PostgreSQL 18.4 első apply, kétszeres teljes reapply, v2 receipt
replay, payload-conflict, globális lock, kompozit logfrissítés és audit
least-privilege canary PASS.
A production Supabase alkalmazás **NOT_RUN / HOLD**.

További új séma akkor indokolt, ha:

- névre szóló operator role/capability;
- command/approval;
- support session;
- release attestation ledger;
- tartós attention ownership/SLA

kerül szállításra. Ezek külön, forward-only migrációt, RLS-t és runtime canaryt
igényelnek; a mostani minimális command registry nem jelent AAL2- vagy
four-eyes approval megvalósítást.
