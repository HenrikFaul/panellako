# 05 — Implementációs ütemterv és API-szerződés

## 1. Szállítási stratégia

Az átállás additív. A meglévő `/superadmin` funkciók a teljes v1 alatt
elérhetők maradnak. Előbb read plane és biztonságos szerződés készül, csak ezután
jöhetnek új commandok.

## 2. Fázisok

Az alábbi rész előbb az aktuális megvalósítást rögzíti, majd megőrzi az eredeti
fázistervet és annak további, még nyitott kapuit.

### 2.1. v0.10.8 aktuális implementációs térkép

Az alábbi fájlok a read plane v0.10.7 alapját és a v0.10.8 named authority/
governance/mutation lezárását adják. A felsorolás repository-állapot, nem
production bizonyíték: a fókuszált tesztek, TypeScript, lint, production build és
izolált PostgreSQL kapuk PASS; a hitelesített browser és a hosted/production kapu
külön bizonyítást igényel.

| Felelősség | Megvalósítás |
|---|---|
| Közös DTO, safe backward-compatible normalizálás és schema-verzió | `lib/superadmin/control-center.ts` |
| Canonical typed modul/integráció/job manifest és determinisztikus fingerprint | `lib/superadmin/manifest.ts` |
| Safe collectorok, részleges hiba, KPI/attention/integráció/audit/release projekció | `lib/superadmin/control-center-server.ts` |
| Aggregált, `no-store` platform snapshot | `app/api/superadmin/control-center/route.ts` |
| Minimalizált, lapozható audit read endpoint | `app/api/superadmin/audit/route.ts` |
| Világos, reszponzív, részpanelhibát kezelő overview | `components/superadmin-control-center.tsx` |
| Meglévő superadmin shell, tab URL-állapot és legacy funkciók megtartása | `components/superadmin-client.tsx` |
| Named operator authority, read-only break-glass, AAL2 és authenticated digest helper | `lib/superadmin/operator-authority.ts`, `components/superadmin-authority-provider.tsx` |
| Közös same-origin, bounded JSON, reason, UUID és no-store HTTP contract | `lib/superadmin/http.ts`, `lib/superadmin/request-integrity.ts` |
| Operátori context/bootstrap API | `app/api/superadmin/operator/context/route.ts` |
| Governance read/action API és capability-aware UI | `app/api/superadmin/governance/route.ts`, `app/api/superadmin/governance/action/route.ts`, `components/superadmin-governance.tsx` |
| Maszkolt, bounded user read és atomi trial mutation | `app/api/superadmin/users/route.ts`, `app/api/superadmin/users/[id]/route.ts`, `components/superadmin-users-tab.tsx` |
| Feature read és atomi feature mutation | `app/api/superadmin/features/route.ts`, `app/api/superadmin/features/[id]/route.ts`, `components/superadmin-features-tab.tsx` |
| Safe health/stats/settings/job/migration route-ok | `app/api/superadmin/health/route.ts`, `stats/route.ts`, `settings/route.ts`, `jobs/logs/route.ts`, `jobs/run/route.ts`, `apply-migrations/route.ts` |
| Batch-szintű GTFS import guard és receipt replay | `app/api/superadmin/gtfs/import/route.ts`, `components/superadmin-gtfs-import.tsx` |
| Command-contract beágyazott SQL és kliensoldali retry-kulcs | `lib/superadmin/platform-job-command-sql.ts`, `lib/superadmin/idempotency-client.ts` |
| Atomikus command/log/audit állapotgép és globális mutation lock | `supabase/migrations/20260830130000_platform_admin_job_commands.sql` |
| Operator role/capability, approval, support, receipt/quota, attestation és célzott atomi mutation RPC | `supabase/migrations/20260830140000_platform_operator_authority.sql` |
| Magyar és angol UI-copy | `src/i18n/resources/hu.ts`, `src/i18n/resources/en.ts` |
| Route-, authority-, hardening-, DB runtime- és UI-regresszió | `tests/app/api/superadmin-*.test.ts`, `tests/lib/superadmin-*.test.ts`, `tests/supabase/platform-operator-authority*.{ts,sql}`, `tests/ui/superadmin-*.test.tsx` |

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
10. A named operator route-ok DB-ből oldott capabilityt kérnek; a legacy HMAC
    session csak read-only break-glass, platformmutációt nem enged.
11. A user trial, feature és setting végleges írása authenticated RPC-ben,
    maximum 15 perces AAL2-, reason-, payload-digest-, idempotency-, quota- és
    auditkapuval történik; közvetlen táblamódosítást trigger tilt.
12. Az operátori grant/revoke, migration apply és release attestation exact
    canonical payloadhoz kötött, időkorlátos, egyszer használható four-eyes
    approvalt kér. A trial/feature/setting RPC-re nem állítunk ilyen approvalt.
13. A support lifecycle request/approve/reject/revoke/expire és exact-scope
    authorization primitive elkészült. Általános tenant support-action consumer,
    impersonation és tenantoldali banner továbbra is külön enterprise szelet.

### Fázis 0 — baseline és karakterizáció

1. Aktuális superadmin route-, komponens- és API-inventory rögzítése.
2. Meglévő users/features/community/jobs/import/diagnostics útvonalak
   karakterizációs tesztje.
3. Secret- és raw-error-szivárgási tesztbaseline.
4. HU/EN kulcsparitás és 375/1440 vizuális baseline.

Kilépési kapu: a jelenlegi viselkedés tesztekkel pinelt, az idegen dirty worktree
érintetlen.

### Fázis 1 — typed manifest és server-only alapok — elkészült

Megvalósított modulok:

- `lib/superadmin/manifest.ts` — modul/integráció/job authority és runtime metadata;
- `lib/superadmin/control-center.ts` — DTO és safe backward-compatible normalizálás;
- `lib/superadmin/control-center-server.ts` — bounded collectorok, explicit
  timeout és poolkímélő concurrency;
- meglévő `lib/supabase/admin.ts` — canonical service-role read/admin kliens,
  anon fallback nélkül;
- manifest contract version + determinisztikus fingerprint.

Kapu:

- server-only import invariant;
- hiányzó service credential fail-closed;
- manifest ID-k egyediek;
- minden modul i18n-kulcsa mindkét locale-ban létezik;
- semmilyen secret metadata nem része a public DTO-nak.

### Fázis 2 — aggregált read API — elkészült

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
  "manifestFingerprint": "sha256:...",
  "generatedAt": "2026-08-30T12:00:00.000Z",
  "overallStatus": "degraded",
  "summary": {
    "workspaces": 12,
    "buildings": 15,
    "units": 860,
    "profiles": 1240,
    "agencies": 3
  },
  "kpis": [
    {
      "id": "active_workspaces",
      "value": 12,
      "status": "healthy",
      "freshnessAt": "2026-08-30T12:00:00.000Z",
      "freshnessState": "fresh",
      "collectorState": "ok",
      "source": "workspaces"
    }
  ],
  "attention": [],
  "integrations": [],
  "release": {
    "status": "unknown",
    "web": { "surface": "web", "state": "known", "version": "0.10.8" },
    "backend": { "surface": "backend", "state": "unknown" },
    "identityStatus": "unknown"
  },
  "recentAudit": [],
  "sections": [
    { "id": "database", "status": "healthy" },
    { "id": "audit", "status": "unavailable", "message": "SOURCE_UNAVAILABLE" }
  ]
}
```

Az `issues` csak stabil kódot és biztonságos, lokalizálható paramétert tartalmaz.
Nyers `error.message` nem része a response-nak.

### Fázis 3 — új default overview UI — elkészült

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

### Fázis 4 — célzott meglévő route-ok hardeningje — v0.10.8 szelet elkészült

Prioritás:

1. `health`, `stats`, `control-center`, `audit`, job log, settings GET, community
   GET, users/features GET, diagnostics és OSM count: named read capability,
   canonical admin read kliens, stabil safe error és `no-store` response;
2. `users/:id`, `features/:id`, `settings`: same-origin, bounded JSON, strict
   schema/allowlist, reason/idempotency, named AAL2 route és authenticated atomic
   mutation RPC;
3. jobs: canonical manifest, command-v2 payload receipt, idempotencia, globális
   single-flight, 15 perces lease és explicit partial/stale állapot;
4. community review és duplicate-resolution: named
   `platform.communities.review`, AAL2, DB-digest, durable receipt/quota és atomi
   platform/domain audit authenticated RPC-ben; ebből nem következik minden
   community legacy RPC vagy tábla általános újrahardeningje;
5. `diagnostics/curl`: kizárólag fix, allowlisted preset, timeout, redirect/SSRF-
   és response-size védelem; ez nem szabad URL-futtató és nem általános
   diagnostics állítás;
6. GTFS import: same-origin, bounded, idempotens, globális lockkal védett maximum
   500 soros batch; nem teljes fájl-lock;
7. `apply-migrations`: named AAL2 és exact-payload four-eyes approval, azután a
   v0.10.7 command state machine; hosszú távon továbbra is release pipeline-ba
   helyezhető.

A hardening nem változtathatja meg a normál sikeres workflow-kat.

### Fázis 5 — command, authority és approval plane — lokálisan implementált

A v0.10.7-ben elkészült a minimális végrehajtás-koordináció:

- idempotens command registry a kézi jobokhoz és migrációkhoz;
- v2 receipt replay egyező request payload, befejezett status és safe result
  alapján; eltérő payloadnál konfliktus;
- konzervatív globális single-flight target;
- 15 perces, fail-closed expiry lease;
- atomikus command + joblog + audit state machine;
- service-role-only RPC és RLS-határ.

A v0.10.8 ezt kiegészíti:

- névre szóló Supabase Auth operátori identity és időbeli assignment;
- role → capability context, read-only break-glass kompatibilitás;
- maximum 15 perces AAL2 újraellenőrzés a protected DB-RPC-kben;
- canonical payload-digesthez kötött, lejáró és egyszer használható approval;
- four-eyes operátori grant/revoke, migration apply és release attestation;
- maximum 60 perces, exact workspace/agency scope-ú support lifecycle;
- durable idempotency receipt az idempotency-bearing mutation RPC-knél és
  per-operator action quota a védett műveleteknél; a decision RPC-k receipt key
  nélkül, row-lockkal működnek, a support authorization szerződése pedig külön;
- append-only audit/support-event/release-attestation trigger;
- atomi user trial, feature és setting mutation RPC közvetlen write guarddal.

Későbbi enterprise bővítés marad az audit export, a hosszú műveletek
outbox/workere, külső IdP/session-risk policy, automatizált support expiry
scheduler, általános tenant support-action consumer és tenantoldali aktív-session
banner. Ezek hiánya nem változtatható production PASS állítássá.

## 3. KPI collector szerződés

Minden KPI:

```text
id, labelKey, value|null, unit, status,
freshnessAt|null, freshnessState, collectorState,
source, drillDownHref|null
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
| kritikus integration missing | critical | integration |
| job `running` túl a stale küszöbön | warning | job |
| job `partial`/`failed` 24 órán belül | warning/critical | job |
| függő community request | warning | request |
| audit collector unavailable | critical | security |
| nem kritikus cache stale | info | data freshness |

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

A külön audit endpoint bounded, `(created_at, id)` cursor-alapú keyset lapozást
és ugyanazt az explicit, redaktált projekciót használja; raw metadata nem része a
DTO-nak.

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

A v0.10.8 második forward-only migrációja:
`20260830140000_platform_operator_authority.sql`.

Ez a migráció:

- létrehozza a role/capability/assignment, action quota/receipt, approval,
  support session/event és release-attestation táblákat;
- seedeli a hat operátori szerepet és az aktuális named capabilityket;
- canonical JSON SHA-256 digestet és UTC időnormalizálást használ az exact
  payload identityhez;
- authenticated context/digest, approval, assignment, support és attestation
  RPC-ket ad; a bootstrap és support expiry kizárólag service-role;
- az app-facing authenticated mutation RPC-kben a saját DB-authority szerződést
  és maximum 15 perces AAL2-t ellenőriz; a support revoke requester/approver-
  vagy-capability szabályt használ, a command plane route-gate után service-role;
- tiltja az önjóváhagyást, approval payload driftet, approval újrafelhasználást,
  assignment overlapet, ön-visszavonást, utolsó aktív admin elvesztését,
  support scope-eszkalációt és terminális session reaktiválását;
- atomi, auditált user trial, feature és setting mutation RPC-t ad durable
  receipt/quota és közvetlen write-guard mellett;
- atomi community review és duplicate-resolution RPC-t ad DB-oldali digest,
  durable receipt/quota, self-review tiltás és domain/platform audit mellett;
- append-only triggerrel védi az audit-, support-event- és attestation sorokat,
  miközben a `service_role` operációs auditjoga SELECT/INSERT marad.

A decision RPC-k a terminális sor ellenőrzését az action quota fogyasztása előtt
végzik, ezért determinisztikus already-decided választ adnak új quota-terhelés
nélkül. Az `authorize_platform_action` replayje nem ír új authorization auditot,
a support-döntés lazy-expiry és maintenance-expiry ága pedig egyaránt support-
eventet és platformauditot ír.

Az authority statikus suite 17/17 PASS. PostgreSQL 18 első apply + teljes reapply
PASS, az aktuális community authority ágakat, stabil decision replayt, egyszeri
authorization auditot és egységes support-expiry auditot is tartalmazó rollback-
only runtime canary két egymást követő futása PASS.

A production migration workflow a
`.github/migration-manifests/20260830140000_platform-admin-release.sha256`
manifestet használja. A validator pontosan 20, `20260828120000` és
`20260830140000` közötti fájlt, byte-pontos SHA-256 egyezést és folytonos pending
suffixet vár; seed/role apply és a `140000` fölötti local/remote release head
tiltott. A production verifier a release 88/88 public function nevét és
`prokind` értékét, a kritikus `130000` command és `140000` authority RPC-k exact
signature-jét, pozitív/negatív `authenticated`/`service_role`/`anon` grantjait,
a release-kritikus public/private táblákat, kijelölt capability-seed párokat és
private-helper privilege lockot ellenőriz. A végleges byte-hashokat tartalmazó
20 fájlos manifest elkészült. A végleges authority migráció SHA-256 értéke
`45B00B09CAFFC8AF50B2ECB21C3B0789684E4039D859CAF120FF5C0972ED2C99`, amely
egyezik a manifest bejegyzésével; a célzott release-workflow contract suite
**PASS — 9/9 teszt**. Ez a lokális supply-chain szerződést bizonyítja, nem a
production migráció alkalmazását vagy read-backjét.

Mind a `20260830130000`, mind a `20260830140000` production Supabase alkalmazása
**NOT_RUN / HOLD** ebben a kiadási körben. A lokális PostgreSQL bizonyíték nem
production migration ledger, hosted két-operátoros/four-eyes canary vagy deploy.

További séma csak a tartós attention ownership/SLA, audit export vagy outbox/
worker szállításakor indokolt. Az általános tenant support-action consumerhez
elsősorban route/RLS/runtime integráció és két-tenant canary szükséges; az
authority tábla létezése önmagában nem production hozzáférési bizonyíték.
