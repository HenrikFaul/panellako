# 05 — Support session, AAL2 és négy-szem elv

## Állapot

**v0.10.8 LOKÁLIS IMPLEMENTÁCIÓ ELKÉSZÜLT / PRODUCTION HOLD.** A named
platformoperator identity, role → capability, AAL2, approval, support lifecycle
és release attestation repositoryban és izolált PostgreSQL-ben létezik. A
production Supabase migráció, hosted két-operátoros canary és deploy nem futott.

## Feladat

Tartsd konzisztensen és bizonyítsd az időkorlátos support sessiont, a high-risk
approval registryt, a named authorityt és a négy-szem folyamatot. Ne tágítsd ki
az állítást általános impersonationre vagy minden legacy admin mutációra.

## Megvalósított előfeltételek

- Supabase Auth platformoperator profil és egyszeri, fail-closed bootstrap;
- role/capability assignment időbeli érvényességgel;
- AAL2 step-up route/UI contract és maximum 15 perces DB-s újraellenőrzés;
- canonical payload digest; durable idempotency receipt az azt fogadó mutation
  RPC-knél, action quota a védett műveleteknél; a decision RPC-k külön
  idempotency key nélkül, row-lockkal működnek;
- append-only audit/support-event/release-attestation trigger;
- exact workspace/agency scope és maximum 60 perces support TTL.

Production előfeltétel marad a jogi/adatvédelmi support policy, incident/runbook
tulajdonos, migration ledger, scheduleres expiry, hosted két-operátoros canary és
tenantizolációs E2E.

## Domainmodell

- `platform_operator_roles`;
- `platform_operator_role_capabilities`;
- `platform_operator_assignments`;
- `private.platform_operator_action_rate_limits`;
- `private.platform_operator_action_receipts`;
- meglévő `platform_job_commands` v2 command plane;
- `platform_command_approvals`;
- `platform_support_sessions`;
- `platform_support_session_events`;
- `platform_release_attestations`.

A séma a forward-only
`supabase/migrations/20260830140000_platform_operator_authority.sql` része,
explicit RLS/GRANT-tal. Audit/history táblán nincs app UPDATE/DELETE; az
operációs `service_role` audit/support-event/attestation joga csak
SELECT/INSERT, az UPDATE/DELETE/TRUNCATE visszavont, és append-only trigger is
véd. Ettől a DB-owner/superuser elleni abszolút immutabilitás még külön kontrollt
igényel.

## Support invariánsok

- pontos workspace vagy agency scope;
- capability allowlist;
- read-only alapérték;
- rövid lejárat;
- a support-request receipt identity scope/capability/access mode/reason alapú;
  a TTL nem része, retrykor az eredeti `expires_at` marad;
- requester és approver külön személy;
- revoke azonnali;
- expiry után nincs reaktiválás;
- jelszó, token és credential soha nem látható.

A governance lifecycle és az `authorize_platform_support_action` primitive
elkészült. Minden tenant action consumer dual attributionje, az aktív-session
tenant banner és az általános read/write integráció későbbi scope; ezek nélkül a
session nem kerülheti meg az RLS-t.

## Approval invariánsok

- canonical command payload hash;
- initiator ≠ approver;
- approval lejár és egyszer használható;
- módosult payload új approval;
- execution előtt teljes reauthorization;
- approval consumption/execution esetén durable state/result receipt; az
  `authorize_platform_action` replay nem duplikál authorization auditot;
- a downstream command/job `partial` vagy `failed` állapota nem jelenhet meg
  zöldként; ezek nem approval státuszok;
- pre- és completion-audit.

Az approval jelenleg az operátori grant/revoke, migration apply és release
attestation műveletekre van bekötve. A trial/feature/setting RPC AAL2,
capability, reason, idempotency és atomi audit védelmet kapott, de nem four-eyes
workflow.

Az approval/support decision terminális állapotellenőrzése megelőzi a quota
fogyasztását, ezért az already-decided replay stabil. A support-döntés lazy-expiry
és maintenance-expiry ága egyaránt support-session eseményt és platformauditot
ír; az authorization audit egyszerisége és az expiry-egységesség canaryval fedett.

## Bizonyítás

- statikus migration authority suite: **PASS — 17/17 teszt**;
- PostgreSQL 18 első apply + teljes reapply: **PASS**;
- rollback-only AAL1 deny/AAL2 allow, self-approval, digest drift, assignment,
  support expiry/revoke, release attestation, trial/feature/setting direct-write
  guard, community authority, stabil decision replay és audit-egyszeriség runtime
  canary: **PASS — 2/2 egymást követő futás**;
- production Supabase apply és migration ledger: **NOT_RUN / HOLD**;
- hosted két-operátoros approval és két-tenant support E2E: **NOT_RUN / HOLD**;
- production deploy/release attestation: **NOT_RUN / HOLD**.
