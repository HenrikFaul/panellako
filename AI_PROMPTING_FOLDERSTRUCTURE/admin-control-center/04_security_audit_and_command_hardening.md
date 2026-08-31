# 04 — Endpoint-hardening, audit és command safety

## Feladat

Keményítsd a meglévő superadmin API-kat úgy, hogy a sikeres workflow-k és a
felületi elérhetőség változatlan maradjon.

## Prioritási sorrend

1. `health`: secret prefix/hossz/kulcselemzés eltávolítása;
2. `stats` és `settings`: anon fallback megszüntetése;
3. `settings`: explicit key/value schema allowlist;
4. mutációk: same-origin, bounded body, actor sessionből;
5. jobok: typed allowlist, idempotencia és concurrency/single-flight;
6. minden Supabase write `{ error }` ellenőrzése;
7. raw DB/provider hibák stabil kódra normalizálása;
8. audit minden privilegizált íráshoz;
9. diagnosztika/import SSRF, timeout és response-size korlát;
10. migration futtatás elkülönítése magas kockázatú legacy funkcióként.

## v0.10.8 bizonyított hardening-scope

Késznek csak az alábbi célzott szelet nevezhető:

- `PATCH /api/superadmin/users/:id`;
- `PATCH /api/superadmin/features/:id`;
- `PATCH /api/superadmin/settings`;
- `PATCH|POST /api/superadmin/community-requests` authenticated atomic review/
  duplicate-resolution RPC;
- `POST /api/superadmin/jobs/run`;
- `POST /api/superadmin/apply-migrations`;
- `POST /api/superadmin/gtfs/import`, kizárólag batch-szinten;
- `POST /api/superadmin/governance/action`.

Named read capabilityt kapott a control-center, audit, health, stats, settings,
job log, users, features, community requests, OSM count és a konkrét
`diagnostics/curl` preset route. A diagnostics route csak fix allowlisted célokat,
timeoutot, redirect/SSRF- és response-size korlátot használ.

Ez nem általános állítás minden korábbi community/import/diagnostics vagy más
legacy admin route hardeningjéről. Az érintetlen route-okat külön kell feltárni,
módosítani és bizonyítani.

## Audit

- Az API mindig új audit-eseményt illeszt be; nincs edit/delete route.
- A command v2 migráció a `service_role` számára is csak `SELECT` és `INSERT`
  auditjogot enged, az `UPDATE`, `DELETE` és `TRUNCATE` jogot visszavonja.
  Ez nem abszolút immutabilitási állítás DB-owner/superuser ellen.
- A v0.10.8 append-only triggerrel is tiltja az audit-, support-event- és
  release-attestation sorok UPDATE/DELETE módosítását; a `service_role` az utóbbi
  két history táblán is csak SELECT/INSERT jogot kap.
- Actor kizárólag verified sessionből.
- Target és scope szerveroldalon feloldva.
- Reason és idempotency key kötelező, ahol releváns.
- Destruktív akciónál pre-event és completion-event.
- Audit INSERT hibáját explicit vizsgáld; a Supabase SDK nem feltétlenül dob.
- Raw body, secret és indokolatlan PII nem kerül metadata-ba.

## Command állapotok

`accepted | running | succeeded | partial | failed | cancelled | timed_out | stale`

Részsiker nem nevezhető sikernek. A UI stabil receiptet kap és a logból
visszaolvasható állapotot mutat.

### Command contract v2 receipt replay

- Contract identity: `20260830130000-v2`.
- A registry a command kind, job ID, target, actor, idempotency key és
  normalizált `request_payload` értékét tárolja.
- Ugyanaz a kulcs és ugyanaz a teljes request identity futó állapotban
  `already_submitted`.
- Ugyanaz a kulcs és ugyanaz a teljes request identity befejezett állapotban
  `replayed`, a tárolt `status` + redaktált `safe_result` receipttel; a
  mellékhatás nem fut újra.
- Ugyanaz a kulcs eltérő command identity vagy `request_payload` mellett
  `idempotency_conflict`.
- A route csak a saját, szűk safe-result sémáját játszhatja vissza; nyers
  provider-válasz nem válhat receiptté.

### GTFS batch contract

- Same-origin, JSON content-type és 2 MiB bounded body kötelező.
- A request kulcsai, file type, sorok, mezőszám, mezőnév és mezőérték
  allowlist/korlát szerint validáltak.
- Egy request legfeljebb 500 sort tartalmaz.
- Egy batch stabil `batchId`, idempotency key és tartalomdigest mellett egy
  globális `platform:mutations` command.
- Egyező, sikeres batch-retry a tárolt imported/skipped receiptet kapja;
  korábbi error/partial nem ír újra; payload mismatch konfliktus.
- A kliens egyetlen bizonytalan transport retry alatt ugyanazt a teljes
  serializált bodyt küldi.
- A lock határa egy batch. Egy fájl több külön batch, ezért nincs teljes
  fájl-lock vagy fájlszintű atomi importgarancia.

## AAL2 határ

A legacy env-backed/HMAC session kizárólag read-only break-glass. A v0.10.8
mutation route named Supabase operátort, konkrét capabilityt és AAL2-t követel;
a protected authenticated DB-RPC maximum 15 perces friss AAL2-t újraellenőriz.
Az operátori grant/revoke, migration apply és release attestation exact-payload
four-eyes approval nélkül nem hajtható végre. A user trial, feature és setting
RPC AAL2/capability/reason/idempotency + atomi audit kaput használ, de nem
állítható rá four-eyes approval.

## Tesztek

- cross-origin deny;
- oversized/malformed body;
- unknown setting/job/action deny;
- duplicate idempotency;
- completed receipt replay mellékhatás nélkül;
- ugyanaz a key + eltérő request payload conflict;
- concurrent same-target command;
- GTFS cross-origin/content-type/body/500-row/field-limit deny;
- GTFS sikeres és korábban hibás batch replay;
- audit `service_role` SELECT/INSERT allow, UPDATE/DELETE/TRUNCATE deny;
- partial result;
- audit success/failure visibility;
- no raw error/secret;
- legacy happy path regresszió.
