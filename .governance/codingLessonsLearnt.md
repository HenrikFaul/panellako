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
