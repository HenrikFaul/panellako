# PanelLakó governance coding lessons

A korábbi, összevont történeti tanulságok a repository gyökerében található
`codingLessonsLearnt.md` fájlban maradnak. Ez a governance-közeli fájl az
`AGENTS.md` kötelező olvasási sorrendjéhez igazított, új PanelLakó tanulságokat
tartalmazza.

## ➕ APPEND — 2026-08-30 Platformadmin Control Center

### [LESSON-ADMIN-121]: Admin health válasz státuszt közölhet, secret-karakterisztikát nem

**Context**: A platformadminnak jeleznie kell, hogy egy külső integráció vagy
platformkonfiguráció használható-e, miközben a route service-role és más
magas értékű credentialek közelében fut.

**Problem**: A secret prefixe, hossza, env-neve vagy nyers providerhibája
önmagában is támadási információ. A pusztán környezeti kulcs jelenlétéből képzett
„Aktív” címke közben téves biztonságérzetet ad, mert nem bizonyít runtime
működést. Ha minden collector egy közös hibára omlik, az operátor a működő
részrendszerekről is elveszíti az információt.

**Fix**: A szerver csak stabil `configured`, `missing`, `unknown`, `degraded`
és health állapotokat projektál; a public DTO nem tartalmaz credential-shape-et
vagy nyers hibát. A collectorok külön hibahatáron futnak, az ismeretlen állapot
nem minősül egészségesnek, a frontend–backend szerződést pedig közös verzió és
determinisztikus fingerprint ellenőrzi.

**Prevention**: Minden új admin-integrációnál külön tesztelje a route az auth
előtti klienslétrehozás tiltását, az anon fallback hiányát, a secret/raw-error
negatív invariánst, a `no-store` headert és a részleges forráshibát. Production
PASS csak runtime probe és release identity bizonyítékkal mondható ki; env-key
jelenlétből soha.

### [LESSON-ADMIN-122]: A command, a partícionált log és az audit egyetlen adatbázis-állapotgép

**Context**: A superadmin kézi jobjai és migrációi ugyanazokat a platformszintű
adatforrásokat módosíthatják, miközben retry, dupla kattintás, route-timeout vagy
megszakadt worker is előfordulhat. A `platform_job_logs` partícionált, ezért az
`id` önmagában nem teljes fizikai rekordazonosság.

**Problem**: Az alkalmazásból egymás után végzett command-, log- és auditírás
részlegesen sikerülhet, a read-then-write stale cleanup pedig versenyhelyzetet
enged. A jobonkénti lock nem védi az eltérő jobcsaládok közös erőforrásait, egy
túl hosszú lease pedig egy megszakadt futás után órákra blokkolhatja az egész
adminfelületet. Új UUID generálása minden retrynál az idempotenciát is
hatástalanítja.

**Fix**: A kézi jobok és migrációk közös `platform:mutations` targetet kapnak.
A service-role-only `begin_platform_job_command`,
`complete_platform_job_command` és `expire_platform_job_commands` RPC-k egy
tranzakcióban kezelik a commandot, a `(id, started_at)` kompozit kulcsú logot és
az új audit-esemény rögzítését. A lease legfeljebb 15 perc, az expiry
`FOR UPDATE SKIP LOCKED` feldolgozást használ. A böngészőtab ugyanazt az
idempotency keyt tartja meg bizonytalan transportkimenet és oldalfrissítés
esetén, és csak ismert JSON-válasz után engedi el.

A v2 contract a normalizált `request_payload`-ot is a command identity részévé
teszi. Egyező befejezett kérés a tárolt status/safe_result receiptet kapja,
eltérő payload ugyanazzal a kulccsal konfliktus. Az audit táblán a
`service_role` is csak SELECT/INSERT jogot tart meg. A GTFS import ugyanezt a
guardot egyetlen, maximum 500 soros batchre használja; egy teljes fájl nem egy
lockolt vagy atomi command.

**Prevention**: Minden új manuális platformmutáció a közös command RPC-n menjen
át; közvetlen háromlépéses log/audit írás tilos. Párhuzamos futás csak
bizonyított resource-lock mátrix után engedhető. A migrációs kapu ellenőrizze az
első applyt, a duplicate/idempotency és actor-mismatch ágakat, a lease-expiryt,
a kompozit logfrissítést és a teljes reapplyt. Az izolált PostgreSQL PASS nem
production Supabase vagy hosted deploy bizonyíték.

Minden receipt tesztelje külön az azonos payload replayt és az eltérő payload
conflictet. Batch importnál a dokumentáció és a teszt nevezze meg a lock valódi
határát; batch-lockból tilos fájl-lockot vagy teljes import-atomikusságot
következtetni.

## ➕ APPEND — 2026-08-30 Named operator authority és admin governance

### [LESSON-ADMIN-123]: A közös admin cookie nem operátori authority

**Context**: A v0.10.7 HMAC superadmin munkamenete megőrizte a legacy funkciók
elérhetőségét, de közös env-identityként nem bizonyított névre szóló operátort,
role-t, capabilityt vagy friss MFA-t.

**Problem**: Ha a route a cookie vagy egy elrejtett UI-tab alapján enged mutációt,
az actor attribution hamis, a capability csak dekoráció, és egy break-glass
credential állandó platformadmin joggá válik. A route-szintű AAL2 check önmagában
szintén kevés, mert közvetlen vagy eltérő kliens megkerülheti.

**Fix**: A primary authority Supabase Auth profilhoz kötött, időben érvényes
operator assignmentből és role → capability katalógusból származik. A legacy
HMAC session kizárólag read-only break-glass. Mutation előtt a route named
capabilityt és AAL2-t kér. A trial/feature/setting/community és app-facing
governance RPC a saját DB-s authority-szerződését és maximum 15 perces friss
AAL2-t újraellenőrzi; a job/GTFS és post-approval migration út a v0.10.7
service-role command plane-re lép tovább. A bootstrap csak üres registry,
verified konfigurált profil és service-role RPC mellett nyitható.

**Prevention**: Minden új admin route tesztelje külön a no-session, break-glass,
hiányzó capability, AAL1 és AAL2 ágakat. UI-gombrejtés, env-email vagy service-
role direct write soha nem számít authorizationnek. A manifest capability neve,
route-checkje és migrációs seedje egyetlen closure gate-ben egyezzen.

### [LESSON-ADMIN-124]: Az approval és az idempotencia csak canonical payloadhoz kötve biztonságos

**Context**: Operátori grant/revoke, migration apply és release attestation
esetén a jóváhagyónak pontosan ugyanazt a műveletet kell engedélyeznie, amelyet a
kezdeményező később végrehajt.

**Problem**: Csupán actionnévre, célazonosítóra vagy kliens által számított hashre
támaszkodva a payload az approval után megváltozhat. Új retry-kulcs duplikált
mellékhatást okozhat, egy receipt pedig eltérő payloadot játszhat vissza. A
service-role audit UPDATE/DELETE joga és a közvetlen üzleti táblawrite gyengíti
az elszámoltathatóságot akkor is, ha az API látszólag auditál.

**Fix**: A DB canonical JSON SHA-256 digestet számol, az approval a teljes
payloadot és digestet tárolja, lejár, egyszer használható, és initiator ≠ approver.
Végrehajtáskor az authority, AAL2, action, cél, payload és digest újraellenőrződik.
A trial/feature/setting mutation durable receiptet, payload-conflictet, no-op
eredményt és atomi auditot ad; közvetlen táblawrite triggerrel tiltott. Az audit,
support-event és release-attestation append-only triggerrel védett, a
`service_role` operációs joga csak SELECT/INSERT.

**Prevention**: Minden idempotency-bearing, állapotváltoztató protected RPC
kapjon exact-retry és same-key/different-payload negatív tesztet. A decision
RPC-knél row-lock és already-decided viselkedést kell tesztelni. Approvalnál
külön tesztelendő a self-approval, expiry, digest drift, más action/cél és double
consume. Az „append-only” állítás mindig
nevezze meg a kliens/API, GRANT/REVOKE és trigger szintet; DB-owner/superuser
ellen külön kontroll nélkül ne állítson abszolút immutabilitást.

### [LESSON-ADMIN-125]: A governance lifecycle nem azonos a tenant support végrehajtással

**Context**: A support session sémája, request/approve/revoke folyamata és exact
scope authorization primitive-je önmagában is jelentős control-plane alap.

**Problem**: Könnyű ebből azt állítani, hogy teljes impersonation vagy minden
tenant action dual attributionje elkészült, miközben egyetlen domain consumer
sem használja még a sessiont. Ugyanez a túlállítás jelent meg korábban batch-
lock és teljes fájl-lock összekeverésekor.

**Fix**: A dokumentáció külön kezeli a governance lifecycle-t, az authorization
primitive-et és a tényleges tenant consumer integrációt. A v0.10.8 csak az első
kettőt állítja késznek; általános consumer, tenant banner és hosted két-tenant
canary HOLD. A GTFS lock továbbra is pontosan egy, legfeljebb 500 soros batchre
vonatkozik.

**Prevention**: Minden biztonsági claim nevezze meg a route-ot, RPC-t, scope-ot,
lockhatárt és futtatott bizonyítékszintet. Repository/izolált PostgreSQL PASS nem
hosted, production vagy tenant-E2E bizonyíték.
