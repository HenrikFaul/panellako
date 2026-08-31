# 03 — Biztonság, adatvédelem és támogatási munkamenetek

## 1. Fenyegetési modell

Az admin felület nagyobb blast radiusszal működik, ezért külön kezeljük:

- ellopott vagy megosztott superadmin credential;
- CSRF és cross-origin parancsindítás;
- túl széles service-role lekérdezés;
- secret- és providerhiba-szivárgás;
- PII megjelenése KPI-ban, auditban vagy URL-ben;
- tenantkeveredés scope-váltáskor;
- dupla kattintásból vagy retryból eredő ismételt mutáció;
- lejárt authorityvel beváltott meghívás vagy support session;
- auditcsend, amikor a DB SDK hibát eredményként ad vissza, nem kivételként;
- release drift, amikor a web és a backend eltérő szerződést futtat.

## 2. Identity és munkamenet

### v0.10.8 kompatibilitási állapot

A platform authority elsődleges forrása névre szóló Supabase Auth profil,
időben érvényes `platform_operator_assignment` és az ahhoz tartozó role →
capability halmaz. A szerverroute minden read vagy mutation belépésnél ezt a
contextet oldja fel. Az app-facing authenticated mutation RPC-k a saját
DB-authority szerződésüket és a friss AAL2-t ellenőrzik. A support revoke külön
requester/approver-vagy-capability szabályt alkalmaz; a job-, GTFS- és a
jóváhagyás utáni migration command plane route-gate után service-role RPC-t
használ. Ezért nincs általános „minden DB-RPC ugyanazt a capabilityt ellenőrzi”
állítás.

A korábbi HMAC-aláírt, httpOnly, sameSite strict superadmin cookie kizárólag
átmeneti, read-only break-glass adapterként marad meg. Read capabilityhez adhat
korlátozott hozzáférést, de mutációhoz, operátori identitáshoz, AAL2-höz,
approvalhoz vagy support scope-hoz soha. Az egyszeri első-operátor bootstrap csak
akkor nyitott, ha még nincs assignment, és a verified Supabase profil megegyezik
a konfigurált bootstrap címmel; az RPC kizárólag service-role hívható.

A v0.10.7 kézi job-, migration- és GTFS batch command plane változatlanul
UUID idempotency keyt, közös `platform:mutations` single-flight targetet,
legfeljebb 15 perces lease-t és atomikus command + partícionált joblog + audit
begin/complete/expire RPC-t használ. A v0.10.8 ezek route-jait named capability
és AAL2 kapu mögé teszi; a migration apply ezen felül exact-payload, négy-szem
approvalt követel.

A command contract v2 receipt replayt használ. Az idempotency key csak akkor
azonosítja ugyanazt a kérést, ha a command kind, job, target, actor és a
normalizált `request_payload` is egyezik. Futó kérés nem indul újra;
befejezett kérés a tárolt `status` és redaktált `safe_result` receiptet kapja;
azonos kulcs és eltérő payload fail-closed konfliktus.

### További enterprise célállapot

- külső IdP/SSO és dedikált, rövid platform session policy;
- eszköz- és session-risk alapú step-up/revocation;
- eszköz-, idő- és IP-kockázati jel auditálása minimalizált formában;
- offline break-glass credential külön incidenseljárással és rendszeres drill;
- általános tenant support-action consumer csak explicit RLS/scope canary után.

## 3. AAL2 és kockázati osztályok

| Osztály | Példa | Követelmény |
|---|---|---|
| R0 | platform health, release read | hitelesített operátor |
| R1 | audit read, maszkolt userkeresés | named capability + aktív assignment; külön rövid platform-session policy még későbbi hardening |
| R2 | settings módosítás, job indítás | capability + AAL2 + indok + idempotencia |
| R3 | user trial/feature/community review, support lifecycle | capability + AAL2 + indok; durable request/execute/revoke parancsnál idempotencia + atomi audit, a support döntés row-lockkal védett single-decision átmenet és külön approvert kér |
| R4 | operátori authority, migration apply, release attestation | R3 + exact-payload négy-szem approval + durable consumption/execution receipt |

Az AAL2 hiba stabil `MFA_STEP_UP_REQUIRED` kódot és allowlisted step-up útvonalat
ad. A frontend az account security flow-ra irányít vagy explicit step-up linket
mutat; az idempotency-bearing action retryja ugyanazt a session-stabil kulcsot
használja. A védett app-facing authenticated RPC-k maximum 15 perces friss
AAL2-t követelnek, ezért a kliensoldali gombrejtés vagy route-check önmagában nem
authority. A job/GTFS/migration command plane külön határát a 7. fejezet rögzíti.

## 4. Négy-szem jóváhagyás — v0.10.8 lokális implementáció

### Állapotgép

```text
PENDING → APPROVED → CONSUMED
   ├────→ REJECTED
   └────→ EXPIRED
```

Ez kizárólag a `platform_command_approvals` tényleges lifecycle-ja. A
`CANCELLED` értéket a séma fenntartja, de a jelenlegi governance API/UI nem ad
hozzá átmenetet. Az `EXECUTING`, `SUCCEEDED`, `FAILED` és `PARTIAL` a külön
command/job végrehajtási sík állapotai, nem approval státuszok.

Invariánsok:

- a kezdeményező nem lehet a jóváhagyó;
- a jóváhagyó ugyanazt a canonical command payload hash-t látja;
- módosult payload új jóváhagyást igényel;
- approval időkorlátos és egyszer használható;
- execution előtt az authority, scope, target state és AAL2 újraellenőrződik;
- minden implementált átmenet audit eseményt ír az operációsan append-only
  audit historyba;
- az idempotency-bearing approval request és consumption/execution az állapotot
  és resultot durable receiptből játssza vissza. Az `authorize_platform_action`
  csak az első `authorized` eredménynél ír authorization auditot; a `replayed`
  ág nem duplikál mellékhatást. Az approve/reject döntésnek nincs kliens
  idempotency keyje; row lock védi, és a terminális sor visszaolvasása megelőzi
  az action quota fogyasztását, ezért az already-decided válasz stabil.

A v0.10.8-ban ez az approval-kapu az operátori assignment grant/revoke, a
migration apply és a release attestation műveletekre van ténylegesen bekötve.
Nem általános állítás minden R2/R3 vagy érintetlen legacy mutációról. A user
trial, feature és setting RPC AAL2/capability/reason/idempotency + atomi audit
védelmet kapott, de nem kér four-eyes approvalt.

## 5. Support session — v0.10.8 governance lifecycle

A support session nem „belépés más nevében”. A cél egy korlátozott platform
eszköz, amely az alábbiakat rögzíti:

- `id`, kérelmező, jóváhagyó;
- reason; strukturált ticket/incidens-kapcsolat nincs, az azonosító jelenleg csak
  a reason szövegében adható meg;
- pontos agency/workspace scope;
- capability allowlist;
- `READ_ONLY` alapérték; a `WRITE` módot már a kérelemben explicit kérni kell,
  majd külön operátornak jóvá kell hagynia;
- kiadás és lejárat;
- aktív/revoked/expired állapot;
- append-only triggerrel védett operációs session-event history, a dokumentált
  DB-owner/superuser caveattal.

### Tilos

- jelszó vagy session token megtekintése;
- korlátlan platform-scope support session;
- tenant scope csendes bővítése;
- felhasználó nevében végzett művelet attribution nélkül;
- audit kikapcsolása;
- lejárt session reaktiválása.

### Megvalósítási határ

A governance UI kérelmezni, külön operátorral jóváhagyni/elutasítani és
visszavonni tudja a maximum 60 perces, exact workspace vagy agency scope-hoz,
allowlisted capabilityhez és `READ_ONLY | WRITE` módhoz kötött sessiont. A DB
tiltja az önjóváhagyást és a terminális állapot reaktiválását; az expiry külön
service-role karbantartó RPC-ben auditált.

A support request idempotency-egyezése a scope típust/azonosítót, capabilityket,
access mode-ot és reasont hasonlítja. A `ttl` nem része ennek az identitynek: az
azonos keyjel, eltérő TTL-lel érkező retry az eredeti sessiont és annak eredeti
`expires_at` értékét játssza vissza, nem hosszabbítja meg a sessiont.

Az `authorize_platform_support_action` az exact scope/action authorization
primitive-je. Általános tenantoldali support consumer, impersonation, aktív
tenantnézet-banner és minden tenant action dual-attribution integrációja nincs
ebben a körben teljesnek állítva. Ezek nélkül egy aktív session sem kerülheti meg
a tenant RLS-t vagy a normál domain-authorityt.

## 6. Safe DTO szerződés

### Engedélyezett

- stabil, dokumentált enumok és hibakódok;
- aggregált darabszámok;
- konfiguráció állapota: `configured | missing | degraded | unknown`;
- időbélyeg, freshness és válaszidő;
- rövid, lokalizálható issue kód;
- maszkolt vagy pseudonimizált actor label, ha üzletileg szükséges;
- release SHA/fingerprint, ha az nem credential.

### Tiltott

- secret érték, prefix, suffix vagy hossz;
- cookie, Authorization header, refresh/access token;
- service-role vagy anon kulcs elemzése;
- teljes request/response body;
- provider stack trace és nyers DB hiba;
- teljes email, telefon, postacím vagy IP az áttekintésben;
- `select('*')` eredmény továbbítása;
- ismeretlen metadata objektum változtatás nélküli JSON renderelése.

### Kötelező korlátok

- maximum elemszám listánként;
- maximum stringhossz;
- maximum metadata mélység;
- explicit oszloplista;
- cursor-alapú lapozás nagy auditlistán;
- `Cache-Control: no-store` az admin válaszokon;
- biztonságos, nem részletező klienshiba; részletes diagnosztika csak
  szerveroldali logban, credential nélkül.

## 7. CSRF, origin és request-integritás

A v0.10.8-ban ténylegesen hardeningolt mutation route-ok:

- `PATCH /api/superadmin/users/:id`;
- `PATCH /api/superadmin/features/:id`;
- `PATCH /api/superadmin/settings`;
- `PATCH|POST /api/superadmin/community-requests`;
- `POST /api/superadmin/jobs/run`;
- `POST /api/superadmin/apply-migrations`;
- `POST /api/superadmin/gtfs/import`, kizárólag batch-szinten;
- `POST /api/superadmin/governance/action`.

Az ezekhez közös, tényleges request-integritási minimum:

- same-origin ellenőrzést végez;
- csak a támogatott `Content-Type`-ot fogadja;
- bounded JSON parsert használ;
- strict schema és allowlist szerint validál;
- a verified Supabase sessionből származtatja az actor identityt;
- nem fogad el kliens által küldött `actor_id` vagy capability mezőt.

A users trial, feature és setting route authenticated Supabase RPC-t hív; a
végleges RPC végzi a capability/AAL2 újraellenőrzést, payload-digestet,
idempotens receiptet, quotát, írást és auditot. A közvetlen trial/feature/setting
táblamódosítást trigger tiltja. A job- és GTFS batch route a v0.10.7 command-v2
állapotgépet használja; a migration route ezen felül exact-payload approvalt
kér. A governance route kizárólag explicit allowlisted action/RPC párokat futtat.

A community review és duplicate-resolution szintén authenticated DB-RPC-ben
ellenőrzi újra a capabilityt, a maximum 15 perces AAL2-t, a DB-oldali payload-
digestet, receiptet/quotát, self-review tiltást és a domain state-et; a state
change, domain audit és platformaudit egy tranzakcióban zárul. Ez nem általános
állítás minden más community legacy RPC-ről.

A support-döntés lazy-expiry ága és a service-role maintenance expiry ág egyaránt
ír `platform_support_session_events` és `platform_audit_events` sort. A két út
egységes auditláncát a rollback-only runtime canary külön ellenőrzi.

Ez a felsorolás nem állít általános rate limitet vagy teljes legacy-route
hardeninget a repository más admin endpointjairól.

A `POST /api/superadmin/gtfs/import` batch-szintű hardeningje:
same-origin és JSON kapu, 2 MiB bounded body, explicit request allowlist,
szigorú sor-/mezőkorlát, canonical service-role kliens, UUID batch- és
idempotency azonosító, payload digest, receipt replay és globális
`platform:mutations` lock. Egy command maximum 500 sort fog le. Egy teljes
GTFS-fájl több egymást követő batch command, ezért ez nem teljes fájl-lock és
nem fájlszintű atomi tranzakció.

A kézi job-, migration-, GTFS-, users-, features-, settings- és a kulcsot fogadó
governance request/execute/revoke flow-k a kliensoldali kulcsot ugyanazon
böngészőtabban memóriában és `sessionStorage`-ban tartják. Csak terminális,
biztonságosan értelmezhető válasz után szabadítják fel új művelethez. Ismeretlen
transportkimenetnél, valamint `already_submitted`, audit-incomplete,
audit-unavailable és guard-unavailable jellegű nem terminális válasznál
ugyanazzal a kulccsal próbálnak újra. A GTFS batch- és utófeldolgozó kliens
ugyanezt a közös osztályozót használja. Az approval/support decision flow nem
fogad kliens idempotency keyt; row lock és a quota-fogyasztás előtti terminális
állapotellenőrzés stabilizálja az already-decided ismétlést. Ahol van key, a
szerveroldali egyedi idempotency index és globális részleges lock a kliens
viselkedésétől függetlenül is kötelező.

## 8. Audit modell

A `platform_audit_events` tényleges v0.10.8 mezőköre a legacy oszlopokból és az
authority-bővítésből áll; ez nem célmodell és nem általános állítás minden
érintetlen legacy admin mutációról:

```text
id, actor_id, action, target_type, target_id, payload, created_at,
actor_profile_id, assurance_level, reason, request_id, idempotency_key,
payload_digest, approval_id, support_session_id, outcome,
before_digest, after_digest
```

Nincs dedikált audit `scope_type`/`scope_id` vagy `reason_code` oszlop. A scope a
target/payload mezőkben vagy a hivatkozott support sessionben található. Az
`append_platform_operator_audit` jelenleg nem tölti a `request_id` mezőt, ezért
az ezekkel létrehozott eseményekben az null marad.

PII és teljes before/after állapot helyett hash vagy minimalizált diff kerül az
auditba. A kliens- és API-folyamatok nem adnak audit UPDATE/DELETE műveletet: a
DB-RPC-k új eseményt illesztenek be. A migrációk az `anon` és `authenticated`
szerepkörtől a közvetlen audit táblajogot visszavonják, a `service_role`
auditjogát pedig `SELECT` + `INSERT` műveletre szűkítik; `UPDATE`, `DELETE` és
`TRUNCATE` explicit visszavont.

A v0.10.8 append-only triggerrel tiltja a `platform_audit_events`,
`platform_support_session_events` és `platform_release_attestations` sorainak
UPDATE/DELETE módosítását is. Ez az alkalmazás, az authenticated/service-role
operációs sík és a normál SQL-művelet ellen erős kontroll, de nem abszolút
immutabilitási állítás a trigger kikapcsolására képes DB-owner vagy superuser
ellen. A command indítás/lezárás, approval, support és release átmenet külön új
audit-eseményt készít.

## 9. Adatmegőrzés és GDPR

- Az áttekintés nem válhat személyi adattárrá.
- A KPI-k aggregáltak, kis elemszámú csoportnál elnyomhatók.
- Auditban csak elszámoltathatósághoz szükséges adat marad.
- Export jogalapja, célja, filtere és soraránya auditált.
- Support session képernyőképe vagy raw payloadja nem automatikus auditadat.
- Törlési kérelem nem törölheti a kötelező pénzügyi/audit integritást; a
  multitenancy terv pseudonymizációs/crypto-shredding szabályai érvényesek.

## 10. Integrációbiztonság

- PanelLakó appadat csak a PanelLakó Supabase projektbe kerül.
- A GeoData API kizárólag publikus címreferenciát kap/ad; nincs user-, session-,
  workspace- vagy membership-adat.
- Külső provider teszt alapból read-only és bounded.
- Költséges vagy mutáló teszt külön R2/R3 command.
- Credential státusz csak `configured/missing/unknown`; nincs karakterhossz,
  prefix vagy formátum-ujjlenyomat a kliensben.
- Admin és publikus credentialek külön plane-ben élnek és nem lehetnek azonosak.
