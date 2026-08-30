# 01 — Referenciaaudit és jelenlegi állapot

## 1. Auditmódszer

Az audit a négy átadott repository aktuális forrására épül. A referenciákból
architekturális és UX-mintákat veszünk át, nem kódot másolunk. A PanelLakó saját
domainmodellje, governance szabályai és daylight vizuális rendszere marad az
autoritás.

Vizsgált források:

- Macrovia: `C:\Work\diet`
- Expericentre: `C:\Work\Expericentre`
- Effectime: `C:\Work\Github\effectime-app-enterprise-a95029a1`
- API Workbench Pro: `C:\Work\api-workbench-pro`
- PanelLakó jelenlegi superadmin felülete és API-jai

## 2. Macrovia tanulságok

### BIZONYÍTOTT minták

- A `src/views/operator/AdminSurface.tsx` külön választja a szerkesztői/reviewer
  feladatokat a platformszintű adminisztrációtól.
- A `src/views/operator/SuperadminSurface.tsx` lokalizáció, adatfolyamatok,
  megbízhatóság és rendszerállapot szerint moduláris felületet ad.
- A nehéz modulok lazy betöltést és külön `Suspense` fallbacket használnak;
  egy modul betöltése nem blokkolja a teljes felületet.
- Az admin megjelenés ugyanazt a design-rendszert használja, mint a termék;
  nincs „belső eszköz, ezért lehet nyers” kivétel.

### PanelLakóba átvett döntés

- A platformadmin felület és a workspace-admin felület fogalmilag és
  jogosultságilag külön marad.
- Az áttekintés moduljai külön loading/error/empty állapotot kapnak.
- A meglévő funkciók lazy modulokká szervezhetők, de a v1 nem változtatja meg
  azok üzleti viselkedését.

### Nem átvett minta

Kliensoldalon nem tárolunk vagy szerkesztünk infrastruktúra-credentialt. Az
integrációs kártya csak szerver által képzett, titokmentes állapotot mutathat.

## 3. Expericentre tanulságok

### BIZONYÍTOTT minták

- A `src/lib/adminControlPlane.ts` szerepkörök helyett konkrét capabilityket is
  modellez, például egészségállapot-olvasást, auditolvasást és jóváhagyást.
- Az üzemeltetési ügyek explicit állapotgépet és SLA-állapotot használnak:
  `open → acknowledged → in_progress → blocked/resolved`.
- A deep linkek allowlist-alapú sanitizálást kapnak.
- Az auditértékek rekurzív, mélység- és elemszámkorlátos redakciót használnak;
  az email, telefon, cím, token, secret, cookie és helyadat érzékeny.
- A magas kockázatú műveletnél az operátornak az akciót és a célazonosítót is
  vissza kell igazolnia.
- A `CommonAdminPanel` integrációs teszteket és kiadási összefoglalót közös
  nézetben egyesít.

### PanelLakóba átvett döntés

- A hosszú távú modell role → capability leképezést használ; a route minden
  művelethez konkrét capabilityt kér.
- A figyelmet igénylő lista nem egyszerű hibajegyzék, hanem prioritással,
  felelőssel, határidővel és állapotgéppel rendelkező inbox.
- A DTO és az audit timeline szerveroldali redakción és méretkorláton megy át.
- A v1 integrációs mátrixa nem futtat automatikusan költséges vagy mutáló
  provider-próbát; a próba típusa és hatása a manifest része.

### Nem átvett minta

Nem adjuk vissza a böngészőnek provider stack trace-ét, nyers DB-hibáját vagy
tesztválaszát. A kliens közvetlen providerhívás helyett PanelLakó szerverroute-ot
használ.

## 4. Effectime tanulságok

### BIZONYÍTOTT minták

- A superadmin felület tabjai külön szerződésben dokumentáltak; a tabváltás URL
  állapotot képez, és a böngésző Vissza gombját megőrzi.
- A platformáttekintés, cronok, email queue, feature/tier kezelés és audit külön
  modul, miközben egy közös shellben él.
- A `ReleaseIdentityStatus.tsx` a web- és backend-kiadás azonosságát
  `match | mismatch | unknown` állapotokkal, fail-visible módon jeleníti meg.
- Az audit viewer csak a renderelt mezőket kéri le; teszt tiltja a `select('*')`
  és a védett state snapshotok böngészőbe küldését.
- A hosszú műveletek single-flight védelmet kapnak; scope-váltás után a régi
  async válasz nem írhat az új tenant UI-jába.
- A platformaudit olvasható, de nem módosítható vagy törölhető; export külön
  audit-esemény.

### PanelLakóba átvett döntés

- A release identity önálló, fail-visible kártya, és az `unknown` nem zöld.
- A részpanelek hibái izoláltak, az összesített oldal lehet részlegesen működő.
- Auditnál explicit oszloplista, kulcsalapú lapozás és minimalizált metadata kell.
- A scope-ot érintő aszinkron műveletekhez stale-response védelem és
  single-flight kapu kell.

### Nem átvett minta

Általános megszemélyesítés nem kerül a v1-be. A PanelLakóban később is csak
időkorlátos support munkamenet engedhető, olvasási alapértékkel és külön
jóváhagyással.

## 5. API Workbench Pro tanulságok

### BIZONYÍTOTT minták

- A ContractRadar normalizált, típusos katalógus-projekciót és determinisztikus
  fingerprintet képez, így a UI és a futtató ugyanazt a szerződést látja.
- Duplikált művelet vagy nem támogatott metódus fail-closed hibát ad.
- A companion sandbox külön admin- és demo-credential síkot használ; hiányzó,
  túl rövid, placeholder vagy egyező kulcs esetén a hosted környezet zárva marad.
- A hibajelentésekből ki vannak zárva a credentialek, teljes URL-ek, request
  body-k és workspace értékek.

### PanelLakóba átvett döntés

- Az integrációk, jobok és adminmodulok egy típusos, verziózott manifestből
  épülnek fel.
- A manifestből számított fingerprint bekerülhet a release attestationbe, így
  látható, ha a frontend és a szerver más admin-szerződést futtat.
- Külön privilegizált és publikus credential-sík kötelező; értékük soha nem
  kerül az admin DTO-ba.

## 6. PanelLakó auditindításkori állapota

### BIZONYÍTOTT, már működő elemek

- `/superadmin` auth-gate és külön bejelentkezési munkamenet;
- `overview`, `users`, `features`, `communityRequests` tab;
- felhasználó- és feature-kezelés;
- community request review;
- platform settings (`map_theme`, BKK beállítások);
- platform jobok kézi indítása és `platform_job_logs` napló;
- OSM- és GTFS-import;
- külső API diagnosztika;
- adatforrás-statisztikák;
- `platform_audit_events` használata egyes privilegizált írásoknál;
- külön, server-only PanelLakó admin Supabase kliens helper.

### BIZONYÍTOTT baseline-rések

Az alábbi lista a fejlesztés előtti állapotot rögzíti, nem a v0.10.7 végső
implementációs státuszát.

1. Az áttekintés egyetlen nagy klienskomponensben keveri a KPI-kat,
   konfigurációt, jobokat, importokat és diagnosztikát.
2. Számos user-facing felirat hardkódolt, miközben a projekt HU/EN i18n-t ír elő.
3. A tab állapot jelenleg csak komponens-state, ezért deep link és böngésző
   Vissza viselkedés nincs teljesen szerződésbe foglalva.
4. A health válasz secret prefixet és hosszt is közöl; ez szükségtelen
   információszivárgás.
5. Több admin route service-role helyett anon kulcsra eshet vissza. Privilegizált
   admin lekérdezésnél ez tiltott és hibás biztonsági állapotot jelezhet.
6. Nyers Supabase/provider hibák juthatnak a böngészőbe.
7. A settings PATCH nincs explicit kulcs- és payload-allowlisthez kötve.
8. Nincs egységes platform KPI, attention inbox, integrációs manifest,
   kiadási azonosság vagy közös audit timeline.
9. A jelenlegi env-alapú közös superadmin identity nem tud névre szóló
   operátort, AAL2-t vagy négy-szem jóváhagyást bizonyítani.
10. Az `apply-migrations` és a szabad diagnosztikai futtatás magas
    kockázatú legacy felület; ezek v1-ben megmaradnak a regresszió elkerülésére,
    de nem kerülnek az új áttekintés elsődleges gyorsműveletei közé.

### v0.10.7 zárási térkép

- Az 1., 3–8. rés kód-szinten lezárult az új, külön overview-val, URL-szinkron
  tabállapottal, safe DTO-kkal, service-role-only read route-okkal és a
  settings/job/migration hardeninggel.
- A 10. rés kézi job- és migration oldala szűkült: kétlépcsős megerősítés,
  session-stabil idempotency key, közös `platform:mutations` lock, 15 perces
  lease és atomikus command + joblog + audit RPC készült. A v2 contract csak
  egyező request payloadnál játszik vissza befejezett safe receiptet; eltérő
  payload konfliktus. A szabad
  diagnosztikai capability és a teljes release-pipeline továbbra is külön
  hardeninget igényel.
- A GTFS import route hardeningja batch-szintű: same-origin, bounded és
  idempotens, de egy command legfeljebb 500 sort fog le. Ez nem teljes
  fájl-lock és nem általános legacy import-route hardening.
- A 2. rés az új control center HU/EN szövegeinél lezárult; a megőrzött legacy
  panelek teljes i18n-migrációja nincs production-readyként állítva.
- A 9. rés nyitott marad: a minimális command registry nem névre szóló
  operátor-, AAL2- vagy four-eyes approval rendszer.
- A forward-only command-migráció izolált PostgreSQL apply/state-machine/reapply
  kapuja PASS, production Supabase alkalmazása **NOT_RUN / HOLD**.

## 7. Következtetés

A PanelLakóban már az audit előtt is létezett számottevő platformadmin
funkcionalitás. A választott irány nem párhuzamos admin alkalmazás, hanem:

- közös, típusos szerveraggregáció;
- biztonságos DTO-határ;
- új alapértelmezett áttekintés;
- fokozatos endpoint-hardening;
- minimális, atomikus command-koordináció a meglévő kézi jobokhoz és
  migrációkhoz;
- később névre szóló operátori identity és teljes command/approval
  infrastruktúra.

Az első öt pont v0.10.7-ben kód-szinten megvalósult; a production migráció,
hosted ellenőrzés és deploy külön HOLD kapu.
