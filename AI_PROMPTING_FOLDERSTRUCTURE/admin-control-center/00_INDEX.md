# PanelLakó admin-control-center — AI fejlesztési prompt index

## Cél

Ez a csomag a PanelLakó meglévő `/superadmin` felületének regressziómentes
továbbfejlesztését vezérli. Nem új, párhuzamos admin alkalmazást épít: az
eddigi users, features, community requests, jobs, OSM/GTFS import,
diagnosztika és settings funkciók megmaradnak.

## Kötelező olvasási sorrend

1. `AGENTS.md`
2. `.governance/controller.md`
3. `.governance/agent_execution_rules.md`
4. `.governance/codingLessonsLearnt.md` helyett a repository gyökerében lévő
   `codingLessonsLearnt.md`
5. `.governance/ui_ux_rules.md`
6. `.governance/roles_permissions.md`
7. `CHANGELOG.md` és a legfrissebb versioning artefaktum
8. `docs/architecture/admin-control-center/README.md`, majd a 01–06 fejezet
9. az alábbi, aktuális feladathoz tartozó prompt

CodeGraph-indexelt repositoryban minden kódfeltárás CodeGraph-pal indul.

## Promptok sorrendje

1. [01 — Baseline, referenciaaudit és regressziós inventory](./01_baseline_and_reference_audit.md)
2. [02 — Typed manifest, safe DTO és aggregált read API](./02_server_manifest_and_read_api.md)
3. [03 — Daylight overview, i18n és accessibility](./03_overview_ui_and_navigation.md)
4. [04 — Endpoint-hardening, audit és command safety](./04_security_audit_and_command_hardening.md)
5. [05 — Support session, AAL2 és négy-szem elv](./05_support_sessions_and_approval_plane.md)
6. [06 — QA, release attestation és lezárás](./06_qa_release_and_closure.md)

## Közös hard rule-ok

- A PanelLakó appadata csak a `wzromwxpjlyrqbdiapep` Supabase projektbe kerül.
- GeoData csak a dokumentált, PII-mentes address registry API-határon érhető el.
- Privilegizált admin adatlekérés soha nem eshet vissza anon kulcsra.
- Secret érték, prefix, suffix, hossz, token, cookie és raw provider/DB hiba nem
  kerülhet böngésző DTO-ba vagy UI-ba.
- Minden új vagy ebben a körben módosított admin mutáció szerveroldali
  auth/capability rechecket és auditot kap. Ez nem állítás az összes érintetlen
  legacy route kész hardeningjéről.
- Magas kockázatú művelethez AAL2, indok, idempotencia; kritikus művelethez
  külön jóváhagyás is kell.
- A platformauditnak nincs clear/edit/delete kliens- vagy API-funkciója; a
  command v2 sémában a `service_role` is csak SELECT/INSERT jogot kap, az
  UPDATE/DELETE/TRUNCATE visszavont.
- A command contract v2 receipt replay csak teljes command identity és
  `request_payload` egyezésnél engedélyezett; befejezett kérés a tárolt
  status/safe_result receiptet kapja, eltérő payload konfliktus.
- A GTFS import globális lockja egy legfeljebb 500 soros batchre vonatkozik,
  nem teljes fájlra. Fájl-szintű atomikusságot külön bizonyíték nélkül tilos
  állítani.
- Minden új user-facing string HU és EN resource key.
- User tabváltás push state, system auth redirect replace.
- Daylight design, WCAG AA, 375 és 1440 px ellenőrzés.
- Egy részpanel hibája nem döntheti le a többi részpanelt.
- A meglévő adminfunkciók elvesztése release blocker.
- Ne használj git hookot kihagyó kapcsolót.

## v1 határ

A prompt 01–04 és 06 adja a v1-et. A prompt 05 célarchitektúra és csak akkor
implementálható, ha névre szóló operator identity, AAL2 és adatbázis authority
rendelkezésre áll.
