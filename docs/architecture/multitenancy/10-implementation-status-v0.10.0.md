# PanelLakó multitenancy – v0.10.0 implementációs állapot

**Dátum:** 2026-08-28
**Állapot:** repository-szintű implementációs jelölt; éles Supabase-migráció és deploy még nem történt
**Forrás:** a `01`–`09` architektúrafejezet, a jelenlegi PanelLakó-kód, valamint a V7 enterprise észrevételek

> **Utókövetés:** a dokumentumban rögzített community creation review/activation
> repository-szintű HOLD-ját a v0.10.1 kétfázisú platform-review + kérelmezői
> AAL2 aktiválás lezárta. A történeti v0.10.0 állapot változatlanul megmarad;
> az új szerződést a [11. fejezet](./11-community-review-and-activation-v0.10.1.md)
> írja le. Live Supabase rollout továbbra sem történt.

## 1. Rövid eredmény

A PanelLakó alkalmazáskódja és additív adatbázis-migrációi most már a
lakóközösségi workspace-et kezelik tenant-határként. A fizikai épület, cím,
albetét, ember/szervezet, tagság, tulajdon, bentlakás, kezelési mandátum,
delegáció és szerepkör külön entitás vagy külön időbeli kapcsolat.

Az implementáció nem tekinti a route-ban kapott UUID-t jogosultságnak. A
workspace-contextet a szerver adatbázis-RPC-ből oldja fel; a műveletek
capabilityt, workspace-scope-ot és szükség esetén albetét-scope-ot ellenőriznek,
az új és a legacy tenanttáblák RLS-e pedig ugyanezt adatbázisoldalon is kikényszeríti.

Ez még nem éles átállás. A két SQL-migráció repositoryban létezik, de az éles
Supabase séma aktuális driftje nem lett lekérdezve, a migráció nem lett éles
adatbázisra alkalmazva, és produkciós deploy sem történt ebben a körben.

## 2. Implementált adatmodell

### 2.1. Tenant, hely és cím

- `workspaces`: a lakóközösség és az adatbiztonsági tenant gyökere;
- `physical_buildings`: a tényleges fizikai épület, a workspacetől külön;
- `workspace_buildings`: időben követhető workspace–épület kapcsolat;
- `addresses`: normalizált és kanonikus címregiszter;
- `building_address_assignments`: elsődleges és történeti épület–cím kapcsolat;
- aktív, elsődleges címre és épületre célzott egyedi indexek;
- `pg_trgm` GIN-index és címjelölt-kereső RPC, automatikus összevonás nélkül.

Az első kompatibilitási rolloutban egy aktív workspace azonosítója megegyezik az
elsődleges legacy `buildings.id` értékével. Így a meglévő `/w/<uuid>` URL-ek nem
törnek el, miközben az új modell már elkülöníti a tenantot a fizikai helytől.

### 2.2. Személyek, szervezetek és kezelőcégek

- `parties`: közös személy/szervezet gyökér;
- `people` és `organizations`: típushelyes részletek;
- `person_account_links`: auth/profile és természetes személy külön kapcsolata;
- `management_agency_details`: kezelőcég-specifikus adatok;
- `organization_memberships`: kezelőcégi munkatársi viszony;
- `management_mandates`: a workspace és a kezelő szervezet vagy személy közötti
  időben érvényes mandátum;
- `delegations`: konkrét, szűk képességkörű, lejáró és tovább nem delegálható
  operatív meghatalmazás.

Egy kezelőcég tehát több házhoz kapcsolódhat, és egy munkatársat nem kell száz
külön profilként létrehozni. Az agency-tagság ugyanakkor önmagában szándékosan
nem ad tenant-hozzáférést: ehhez érvényes workspace-tagság, mandátum/szerep és
capability szükséges.

### 2.3. Tagság, szerepkör és kapcsolat

- `workspace_memberships` és `membership_periods`: a digitális közösségi tagság
  és annak története;
- `role_templates`, `role_capabilities`, `role_assignments`: verziózott RBAC;
- kanonikus, kisbetűs alkalmazás-capabilityk és belső SQL-kulcsok explicit
  `capability_key_map` leképezése;
- `unit_ownerships`: tulajdoni viszony;
- `unit_occupancies`: bentlakási viszony;
- `unit_legal_rights`: egyéb jogcím;
- mindegyik kapcsolat `valid_from`/`valid_to` vagy lezárási állapottal őrzi a
  történetet.

Egy személy több workspace több albetétjéhez kapcsolódhat, és ugyanahhoz az
albetéthez egyszerre eltérő jogcímei lehetnek. A tagság nem következik
automatikusan a tulajdonból vagy bentlakásból, a szerepkör pedig nem helyettesíti
egyiket sem.

### 2.4. Összetett albetétek és számlázás

- a legacy `units` UUID-alapú, kötelező `workspace_id` és fizikaiépület-scope-ot
  kap;
- `unit_relations` tárolja a lakás–garázs–tároló típusos kapcsolatokat;
- `billing_groups` és `billing_group_members` külön kezeli a számlázási
  aggregációt;
- összetett idegen kulcsok akadályozzák meg, hogy egy albetét vagy kapcsolata
  másik workspace-be vagy másik fizikai épületbe mutasson.

A V7 egyszerű `parent_unit_id` oszlopa helyett relációs tábla készült, mert egy
garázs/tároló jogi, használati és számlázási kapcsolata nem feltétlenül ugyanaz,
és ezek idővel külön is változhatnak.

## 3. Authorization és RLS

### 3.1. Központi alkalmazás-szerződés

Az új `lib/authorization` réteg:

- validálja a workspace UUID alakját, de nem tekinti azt titoknak;
- `get_my_workspaces` és `get_workspace_context` RPC-ből oldja fel az effektív
  tenant-contextet;
- egységes `requireWorkspaceAccess`, `requireWorkspaceCapability`,
  `requireOwnOrManagedUnit` és kapcsolódó guardokat ad;
- a régi UI-role stringet csak kompatibilitási megjelenítésre képezi vissza;
- hiányzó új RPC esetén kizárólag a régi, aktív membershipre épülő átmeneti
  feloldást engedi, tetszőleges mock vagy globális demoadatot nem.

### 3.2. Adatbázis-autorítás

Az autoritás forrása az adatbázisban tárolt, aktív és időben érvényes tagság,
szerep, mandátum, delegáció és kapcsolat. Az RLS nem bízza a workspace-listát
egy hosszú életű JWT claimre. A JWT csak olyan munkamenet-tényekhez használatos,
amelyeket a Supabase Auth állít elő, például az `aal` és `amr` MFA-adatokhoz.

Az új domain minden tábláján RLS aktív. A cutover migráció a legacy tenantadatok
RLS-ét is workspace-aware szabályokra cseréli, ideértve a dokumentumokat,
pénzügyet, közgyűlést, szavazatot, ticketet, mérőállást, értesítést, push-t,
szolgáltatói folyamatokat, környezetet, hulladékot és közlekedési cache-t.

### 3.3. Magas kockázatú parancsok

Az adminisztratív command RPC-k:

- szerveren és SQL-ben is capabilityt ellenőriznek;
- tranzakciósak és idempotency keyt használnak;
- audit eseményt írnak;
- érzékeny szerepkör- és delegációmódosításnál friss AAL2 állapotot követelnek;
- strukturált `MFA_STEP_UP_REQUIRED` hibát adnak, amelyet a kliens a biztonsági
  oldalra irányítással kezel;
- nem engedik, hogy egy delegált továbbdelegáljon vagy adminszerepet osszon.

## 4. Regisztráció és onboarding

### 4.1. Fiókfolyamat

- email+jelszó regisztráció és email-megerősítő callback;
- meglévő magic-link belépés megőrzése;
- email+jelszó belépés;
- elfelejtett jelszó és új jelszó beállítása;
- új auth userhez szerveroldali, idempotens profile/person bootstrap;
- visszatérési URL-ek allowlist-alapú, relatív útvonalra korlátozott kezelése;
- TOTP faktor felvétele, ellenőrzése, step-up és eltávolítása a fiókbiztonsági
  oldalon.

A fiók létrehozása nem ad lakó-, tulajdonosi vagy adminjogot.

### 4.2. Már létező közösséghez csatlakozás

- a felhasználó csak aktív, csatlakozható workspace-re kereshet;
- csak a kiválasztott workspace aktív, személyes adatot nem tartalmazó
  albetétjelölései listázhatók;
- lakói/bérlői vagy tulajdonosi kérelmet adhat be;
- ugyanaz a parancs idempotensen újrapróbálható;
- a kezelő jóváhagyhat, elutasíthat, további bizonyítékot kérhet vagy
  `COUNTER_OFFER` eseménnyel másik albetétet/jogviszonyt ajánlhat;
- a kérelmező az ellenajánlatot saját felületén elfogadhatja;
- jóváhagyáskor a tagság és a megfelelő tulajdonosi/bentlakási kapcsolat egy
  tranzakcióban jön létre, majd elkészül a legacy kompatibilitási projekció.

### 4.3. Kezelői adminisztráció

Az új workspace-admin felület capability szerint jeleníti meg:

- albetét létrehozását, beleértve a garázs/tároló kapcsolását;
- lejáró, egyszer használható, emailhez és albetéthez kötött meghívást;
- join request listát és döntési folyamatot;
- ellenajánlatot;
- aktív közösségi tagok minimalizált név/albetét listáját;
- korlátozott megbízotti, bizottsági, könyvelői és billing szerepkör adását és
  visszavonását;
- MFA step-upot a magas kockázatú szerepkör-műveleteknél.

### 4.4. Új vagy önkezelt ház

A képviselővel kezelt és az önkezelt közösség is beadhat
`community_creation_request` rekordot. A kérelem címnormalizálást, pontos
ütközésjelölést és fuzzy duplikációjelölteket kap, de nem hoz létre automatikusan
aktív tenantot vagy adminjogot.

Az aktiválás **HOLD**, amíg nincs lezárt bizonyítéktípus-, review-authority-,
kvórum-, jogalap- és fellebbezési szerződés. Ez tudatos fail-closed állapot: a
„három kattintás után automatikusan admin” szabály ellenőrizetlen címfoglalást és
adateltérítést tenne lehetővé.

## 5. Legacy kompatibilitás és migráció

Az átmenet adatbázis-tranzakciós kompatibilitási projekciót használ:

- a meglévő `buildings`, `memberships` és `units` rekordokból backfill készül;
- az első rolloutban a workspace és a primary building azonosítója stabil;
- új meghívás-, jóváhagyás- és role command ugyanabban az adatbázis-tranzakcióban
  frissíti a szükséges legacy membership projekciót;
- a régi projekció nem autoritásforrás az új commandok számára;
- nincs alkalmazáskódban két külön, egymástól független írás.

Ez a megoldás a jelenlegi monolit PostgreSQL/Supabase rendszerben erősebb és
egyszerűbben rollbackelhető, mint egy azonnal bevezetett Debezium/WAL pipeline.
Később, valódi külön datastore vagy nagy analitikai read-model esetén CDC
bevezethető, de most nem szükséges a tenant-integritáshoz.

## 6. V7 enterprise észrevételek döntési mátrixa

| V7 javaslat | Döntés | Implementáció / indok |
|---|---|---|
| Management agency / portfolio | **ADAPTÁLVA** | `organizations`, `management_agency_details`, `organization_memberships`, mandátumok és delegációk. Agency-tagság nem implicit tenantjog. |
| Parent-child unit | **ADAPTÁLVA** | Típusos `unit_relations` és külön billing group; nem egyetlen, túlterhelt parent oszlop. |
| Minden workspace és role JWT claimben | **ELUTASÍTVA autoritásként** | Stale token, tokenméret, visszavonási késés és portfólióméret miatt. Az adatbázis a forrás; JWT-ből csak Auth által kiadott MFA-tényeket használunk. |
| AAL2 + kliens step-up | **IMPLEMENTÁLVA** | Strukturált SQL hiba, fiókbiztonsági TOTP UI és művelet-visszatérés. |
| Provisional sandbox + 3 automatikus megerősítés | **RÉSZBEN / HOLD** | Létrehozási request és attestation modell van; aktív tenant és founder-admin automatikus kiosztása nincs jogi/review szerződés nélkül. |
| Join request `COUNTER_OFFER` | **IMPLEMENTÁLVA** | Append-only ajánlati esemény, kérelmezői elfogadás, újraellenőrzés. |
| Crypto-shredding | **HOLD** | KMS/DEK lifecycle, kulcs-rotáció, backup, helyreállítás, jogalap és retention policy nélkül a `pgcrypto`-példa nem teljes GDPR-megoldás. |
| `pg_trgm` és fuzzy címkeresés | **IMPLEMENTÁLVA jelöltként** | GIN-index és similarity-alapú jelöltlista; automatikus összevonás nincs. Pontos aktív cím egyedi. |
| 49 naptárcella virtualizálása | **NEM SZÜKSÉGES** | A fix 49 cella nem 200 esemény DOM-node-ja. Kontraszt, billentyűzetes kezelés és mobil dialógus készült; eseménylista később lapozható. |
| Dual-write helyett CDC | **ADAPTÁLVA** | Alkalmazás-szintű dual-write nincs. Azonos PostgreSQL-adatbázison belüli tranzakciós projekció szolgálja az átmenetet; külső CDC csak külön datastore-nál indokolt. |
| CQRS / Saga | **CÉLZOTTAN ADAPTÁLVA** | Idempotens command RPC, append-only audit és állapotgépek készültek; indokolatlan új infrastruktúra nincs. |

## 7. Érintett alkalmazási felületek és API-k

- `/register`, `/login`, `/forgot-password`, `/reset-password`;
- `/onboarding`, `/invitations/[token]`, `/account/security`;
- `/app` portfólióválasztó;
- `/w/[workspaceId]` és minden aloldala workspace-contexttel;
- `/w/[workspaceId]/admin` közösségkezelés;
- ticket, mérőóra, dokumentum, közlemény, pénzügy, közgyűlés, munkalap és reminder
  Server Actionök;
- storage signed URL, push, Stripe, utility provider, környezet, zaj, hulladék és
  közlekedés API-k.

A koordináta-alapú, tenantadatot nem olvasó valódi publikus közadat-route-ok
publikusak maradtak. A building/workspace azonosítóval cache-t vagy tenantadatot
olvasó route-ok viszont workspace→primary physical building feloldást és
`environment.read` jogosultságot igényelnek.

## 8. Release- és bizonyítási állapot

| Kapu | Állapot | Megjegyzés |
|---|---|---|
| TypeScript | PASS | `npm run typecheck`. |
| Teljes Vitest | PASS | 19 fájl, 124 teszt; negatív tenant-, RLS-, onboarding-, MFA- és API-invariánsokkal. |
| ESLint | PASS | `npm run lint`, 0 warning és 0 error. |
| Next production build | PASS | 72/72 statikus oldal; helyi build, nem hosted bizonyíték. |
| SQL migráció statikus teszt | PASS | 20/20 célzott séma- és fail-closed invariáns. |
| Izolált PostgreSQL 18 apply | PASS | Foundation + cutover első és idempotens második apply: `COMMIT`; invitation-, owner/occupant-, role revoke-, reminder- és cache-scope runtime canaryk PASS. |
| Helyi HTTP render | PASS | A fejlesztői szerver a `/register` oldalt `200` válasszal lefordította és kiszolgálta. |
| Vizuális browser QA | NOT_RUN | Az in-app browser webview nem csatlakozott a localhost laphoz; külön Chrome-kapcsolat nem volt elérhető. |
| Live schema drift audit | HOLD | Éles adatbázis-olvasás nem történt. |
| Live migration / deploy | NOT_RUN | Nem történt produkciós végrehajtás. |

## 9. Kötelező következő rollout-lépések

1. Csak olvasható éles séma- és adataudit: tábla-, constraint-, RLS-, Storage-,
   funkció- és orphan riport.
2. Snapshot/backup és visszaállítási próba.
3. Migráció alkalmazása staging vagy elkülönített Supabase branch adatbázison.
4. Backfill-egyezőség és cross-tenant negatív teszt két valódi teszt-workspace-szel.
5. Supabase Auth email-confirmation, redirect allowlist, SMTP és TOTP konfiguráció
   ellenőrzése.
6. Cím- és képviseleti bizonyítékok, platform reviewer authority, self-managed
   kvórum és fellebbezési folyamat termék/jogi jóváhagyása.
7. Community activation command és reviewer UI csak e döntések után.
8. Pilotonkénti feature flag, megfigyelés, rollback-kapu, majd fokozatos cutover.

## 10. Nem állított eredmények

- A repository-migráció létezése nem bizonyítja, hogy az éles adatbázis már ezt
  a sémát futtatja.
- A helyi unit/static/build teszt nem bizonyít hosted, böngészős vagy produkciós
  működést.
- A létrehozási request nem aktív házregisztráció és nem adminjog.
- A fuzzy találat nem címösszevonás.
- A PII jelenlegi normalizálása és RLS-védelme nem crypto-shredding.
- Az agency-portfólió adatmodell nem jelenti azt, hogy egy munkatárs korlátlanul
  eléri az agency összes házát.
