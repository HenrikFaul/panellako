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

### v1 kompatibilitási állapot

A jelenlegi HMAC-aláírt, httpOnly, sameSite strict superadmin cookie megmarad,
hogy ne veszítsünk működő funkciót. A v1 minden új route-ja ezt szerveroldalon
ellenőrzi.

Korlát: ez közös env-identity, ezért nem bizonyít névre szóló operátort, AAL2
szintet vagy jóváhagyót. Emiatt a v1 új áttekintése alapvetően read-only, az új
magas kockázatú capabilityk pedig HOLD állapotúak.

A meglévő kézi job- és migrációműveletek ettől függetlenül szűk, fail-closed
koordinációs réteget kaptak: UUID idempotency key, közös
`platform:mutations` single-flight target, legfeljebb 15 perces lease, valamint
atomikus command + partícionált joblog + audit begin/complete/expire RPC. Ez
dupla végrehajtás és auditcsend ellen véd, de nem teljesíti a névre szóló
operátor, AAL2 vagy négy-szem jóváhagyás célállapotát.

A command contract v2 receipt replayt használ. Az idempotency key csak akkor
azonosítja ugyanazt a kérést, ha a command kind, job, target, actor és a
normalizált `request_payload` is egyezik. Futó kérés nem indul újra;
befejezett kérés a tárolt `status` és redaktált `safe_result` receiptet kapja;
azonos kulcs és eltérő payload fail-closed konfliktus.

### Célállapot

- névre szóló Supabase Auth operátori fiók;
- rövid élettartamú platform session;
- role/capability hozzárendelés időbeli érvényességgel;
- AAL2 step-up külön magas kockázatú műveletek előtt;
- visszavonás és session-revocation;
- eszköz-, idő- és IP-kockázati jel auditálása minimalizált formában;
- break-glass fiók offline megőrzéssel és külön incidenseljárással.

## 3. AAL2 és kockázati osztályok

| Osztály | Példa | Követelmény |
|---|---|---|
| R0 | platform health, release read | hitelesített operátor |
| R1 | audit read, maszkolt userkeresés | capability + rövid session |
| R2 | settings módosítás, job indítás | capability + AAL2 + indok + idempotencia |
| R3 | tier/feature globális változás, support write | R2 + négy-szem jóváhagyás |
| R4 | törlés, credential rotáció, audit export | R3 + explicit runbook + immutable receipt |

Az AAL2 hiba stabil kódot ad, például `MFA_STEP_UP_REQUIRED`; a frontend modalt
nyit, tokenfrissítés után pedig ugyanazzal az idempotency keyjel próbál újra.

## 4. Négy-szem jóváhagyás

### Állapotgép

```text
DRAFT → PENDING_APPROVAL → APPROVED → EXECUTING → SUCCEEDED
  └──────────────→ REJECTED       └────────→ FAILED | PARTIAL
PENDING_APPROVAL → EXPIRED | CANCELLED
```

Invariánsok:

- a kezdeményező nem lehet a jóváhagyó;
- a jóváhagyó ugyanazt a canonical command payload hash-t látja;
- módosult payload új jóváhagyást igényel;
- approval időkorlátos és egyszer használható;
- execution előtt az authority, scope, target state és AAL2 újraellenőrződik;
- minden átmenet append-only audit esemény;
- retry ugyanazzal az idempotency keyjel ugyanazt a receiptet adja.

## 5. Support session célmodell

A support session nem „belépés más nevében”. A cél egy korlátozott platform
eszköz, amely az alábbiakat rögzíti:

- `id`, kérelmező, jóváhagyó;
- indok és kapcsolódó ticket/incidens;
- pontos agency/workspace scope;
- capability allowlist;
- `READ_ONLY` alapérték, külön write-eszkaláció;
- kiadás és lejárat;
- aktív/revoked/expired állapot;
- immutable session események.

### Tilos

- jelszó vagy session token megtekintése;
- korlátlan platform-scope support session;
- tenant scope csendes bővítése;
- felhasználó nevében végzett művelet attribution nélkül;
- audit kikapcsolása;
- lejárt session reaktiválása.

### UI jelzés

Aktív support session alatt állandó, jól látható banner mutatja a scope-ot,
lejáratot és a kilépés gombját. Minden végrehajtott művelet az operátor és az
érintett user/workspace külön azonosítóját tartalmazza.

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

A v0.10.7-ben ténylegesen hardeningolt `PATCH /api/superadmin/settings`,
`POST /api/superadmin/jobs/run` és
`POST /api/superadmin/apply-migrations` route:

- same-origin ellenőrzést végez;
- csak a támogatott `Content-Type`-ot fogadja;
- bounded JSON parsert használ;
- strict schema és allowlist szerint validál;
- a verified sessionből származtatja az actor identityt;
- nem fogad el kliens által küldött `actor_id` vagy capability mezőt.

A job- és migration route ezen felül UUID idempotency keyt kér, és ugyanazt a
globális single-flight/concurrency szabályt alkalmazza. A settings route
auditált rollbacket használ, de nem része a command-lock állapotgépnek. Ez a
felsorolás nem állít általános rate limitet, és nem terjeszti ki automatikusan a
hardeninget a repository minden régebbi admin mutációjára.

A `POST /api/superadmin/gtfs/import` külön, batch-szintű hardeninget kapott:
same-origin és JSON kapu, 2 MiB bounded body, explicit request allowlist,
szigorú sor-/mezőkorlát, canonical service-role kliens, UUID batch- és
idempotency azonosító, payload digest, receipt replay és globális
`platform:mutations` lock. Egy command maximum 500 sort fog le. Egy teljes
GTFS-fájl több egymást követő batch command, ezért ez nem teljes fájl-lock és
nem fájlszintű atomi tranzakció.

A v0.10.7 kézi job- és migrációs route-jai a kliensoldali kulcsot ugyanazon
böngészőtabban memóriában és `sessionStorage`-ban tartják. Csak terminális,
biztonságosan értelmezhető válasz után szabadítják fel új művelethez. Ismeretlen
transportkimenetnél, valamint `already_submitted`, audit-incomplete,
audit-unavailable és guard-unavailable jellegű nem terminális válasznál
ugyanazzal a kulccsal próbálnak újra. A GTFS batch- és utófeldolgozó kliens
ugyanezt a közös osztályozót használja. A szerveroldali egyedi idempotency index
és globális részleges lock a kliens viselkedésétől függetlenül is kötelező.

## 8. Audit modell

Minden privilegizált írás legalább ezt rögzíti:

```text
event_id, occurred_at, actor_id, assurance_level,
action, target_type, target_id, scope_type, scope_id,
reason_code/reason, request_id, idempotency_key,
before_digest, after_digest, outcome, approval_id, support_session_id
```

PII és teljes before/after állapot helyett hash vagy minimalizált diff kerül az
auditba. A v0.10.7 kliens- és API-folyamatai nem adnak audit UPDATE/DELETE
műveletet: a command RPC-k új eseményt illesztenek be. A command v2 migráció az
`anon` és `authenticated` szerepkörtől minden táblajogot visszavon, a
`service_role` auditjogát pedig `SELECT` + `INSERT` műveletre szűkíti;
`UPDATE`, `DELETE` és `TRUNCATE` explicit visszavont. Ez az operációs
service-role szinten kikényszeríti a csak-hozzáfűző viselkedést, de nem jelent
abszolút immutabilitást a DB-owner vagy superuser ellen. A command indítás és
lezárás külön új audit-eseményt készít.

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
