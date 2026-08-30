# 05 — Support session, AAL2 és négy-szem elv

## Állapot

**TERVEZETT KÉSŐBB / HOLD**, amíg névre szóló platformoperator identity és
megbízható AAL2 nem áll rendelkezésre.

## Feladat

Az előfeltételek teljesülése után implementáld az időkorlátos support sessiont,
a high-risk command registryt és a négy-szem approval folyamatot.

## Előfeltételek

- Supabase Auth platformoperator account;
- role/capability assignment időbeli érvényességgel;
- AAL2 step-up RPC és frontend retry contract;
- jogi/adatvédelmi döntés a support scope-ról és retentionről;
- append-only audit és immutable receipt;
- incident/runbook tulajdonos.

## Domainmodell

- `platform_operator_roles`;
- `platform_operator_assignments`;
- `platform_commands`;
- `platform_command_approvals`;
- `platform_support_sessions`;
- `platform_support_session_events`.

Minden tábla UUID PK-t, időbeli érvényességet, explicit RLS/GRANT-ot és
forward-only migrációt kap. Audit/history táblán nincs app UPDATE/DELETE; az
operációs `service_role` is csak SELECT/INSERT jogot kaphat, az
UPDATE/DELETE/TRUNCATE explicit visszavonandó. Ettől a DB-owner/superuser
elleni abszolút immutabilitás még külön kontrollt igényel.

## Support invariánsok

- pontos workspace vagy agency scope;
- capability allowlist;
- read-only alapérték;
- rövid lejárat;
- requester és approver külön személy;
- session banner minden érintett UI-n;
- minden akció dual attribution;
- revoke azonnali;
- expiry után nincs reaktiválás;
- jelszó, token és credential soha nem látható.

## Approval invariánsok

- canonical command payload hash;
- initiator ≠ approver;
- approval lejár és egyszer használható;
- módosult payload új approval;
- execution előtt teljes reauthorization;
- idempotens receipt;
- partial/failed állapot nem zöld;
- pre- és completion-audit.

## Bizonyítás

- PostgreSQL apply/reapply;
- RLS pozitív és negatív canary;
- AAL1 deny, AAL2 allow;
- self-approval deny;
- stale/expired approval deny;
- scope escalation deny;
- session expiry/revoke runtime;
- két-tenant negatív E2E;
- immutable audit canary;
- exact fixture cleanup.
