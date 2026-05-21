# FEATURE PROMPT 12 — Hulladékgazdálkodás és Vízfogyasztás-nyomkövető (EU Zöld Főváros Indikátorok)

---

## 1. Áttekintés és motiváció

### 1.1 Az EU Zöld Főváros értékelési rendszer: a két hiányzó indikátor

A panellako.hu webapp mögött álló geoinformatikai szakdolgozat (Faul Henrik, SZTE Természettudományi és Informatikai Kar, Természeti Földrajzi és Geoinformatikai Tanszék, 2020) az Európa Zöld Fővárosa (European Green Capital Award — EGCA) értékelési keretrendszert vizsgálja Budapest szemszögéből. Az EGCA keretrendszer **11 fő indikátort** tartalmaz, amelyek alapján egy európai nagyváros fenntarthatósági teljesítményét mérik:

| # | Indikátor | Lefedett feature-ök (panellako.hu) |
|---|-----------|-------------------------------------|
| 1 | Helyi közlekedés | Feature 08 (Fenntartható Közlekedési Infópanel) |
| 2 | Zöldfelületek és területhasználat | Feature 03 (Közelségi Térkép), Feature 04 (Hősziget) |
| 3 | Levegőminőség | Feature 01 (Levegőminőség Widget) |
| 4 | Zajszennyezés | Feature 07 (Közlekedési Zaj Bejelentő) |
| 5 | Hulladéktermelés és hulladékkezelés | **← Ez a feature (Hulladék modul)** |
| 6 | Energiafelhasználás és éghajlatpolitika | Feature 06 (Épületenergetika CO₂) |
| 7 | Természet és biodiverzitás | Feature 04 részben (NDVI) |
| 8 | Vízfogyasztás és vízminőség | **← Ez a feature (Víz modul)** |
| 9 | Szennyvízkezelés | **← Ez a feature (Víz modul, szennyvíz aspektus)** |
| 10 | Ökoinnovációs készség | Feature 05 (Közösségi Zöld Akciók) |
| 11 | Helyi éghajlati döntéshozatal | Feature 02 (Zöld Pontszám Dashboard) |

Az eddig elkészült feature prompt-ok (01–08) **öt indikátort** fednek le. Az EU értékelési rendszer **hulladékgazdálkodási (5. szempont)** és **vízgazdálkodási (8–9. szempont)** kritériumai mindeddig lefedetlen fehér foltot képeznek a panellako.hu fenntarthatósági eszköztárában. Ez a feature prompt célja: egy egységes, két részmodulból álló rendszer, amely ezt a hiányt tölti be.

### 1.2 A hulladékgazdálkodás szakdolgozati és hazai háttere

Az EGCA 5. kritériuma szerint az értékelt városoknak be kell mutatniuk:
- **Egy főre jutó kommunális hulladék mennyisége** (kg/fő/év)
- **Szelektív hulladékgyűjtés és újrahasznosítási ráta** (a háztartási hulladék hány %-a kerül újrahasznosításra)
- **Hulladéklerakón végső elhelyezésre kerülő hulladék aránya** (minél kisebb, annál jobb)
- **Biohulladék-kezelési kapacitás** (komposztálás, anaerob emésztés)

Budapest jelenlegi hulladékgazdálkodási helyzete a KSH és az FKF Nonprofit Zrt. adatai alapján:

| Mutató | Budapest (2022) | Magyar átlag | EU-27 átlag | Bécs (referencia) |
|--------|-----------------|--------------|-------------|-------------------|
| Egy főre jutó kommunális hulladék | 412 kg/fő/év | 368 kg/fő/év | 505 kg/fő/év | 560 kg/fő/év |
| Szelektív hulladékgyűjtési arány | 28% | 31% | 47% | 62% |
| Újrahasznosítási ráta (ténylegesen feldolgozott) | ~22% | ~25% | ~48% | ~60% |
| Hulladéklerakóra kerülő arány | 18% | 42% | 23% | <1% |
| Biohulladék külön gyűjtése | ~8% | ~5% | ~30% | ~40% |

Budapest újrahasznosítási rátája (22–28%) **messze elmarad** az EU átlagtól (48%) és különösen a vezető városoktól, mint Bécs (~60%) vagy Ljubljana (~68%). A **Magyarország Hulladékgazdálkodási Terve 2020–2030** (NHKT 2020–2030, OGY határozat 2020/17) ezt a különbséget explicit módon nevesíti, és célként tűzi ki, hogy 2025-re elérje az EU 55%-os újrahasznosítási célt, 2030-ra pedig a 60%-ot. A terv külön fejezetben foglalkozik a **lakótelepek szelektív gyűjtési kihívásaival**: a nagy lakóházakban a közös szemétledobók és konténerek miatti alacsony részvételi arány az egyik legnagyobb akadály.

A **panelházak hulladékgazdálkodási sajátosságai**:
1. **Közös konténeres rendszer**: A legtöbb panelházban nincs lakásonkénti hulladékgyűjtés — közös, épületszintű konténerek vannak. Ez anonimmá teszi a hulladékot, és csökkenti az egyéni felelősségérzetet.
2. **Hulladékledobó-aknák**: Az 1960–1980-as évek panelépületeinek többségében vannak hulladékledobó-aknák (hulladékcső), amelyek a lakóemeletek közvetlenül a pincébe engedik a hulladékot. Ezek szelektív gyűjtésre alkalmatlanok, és sok épületben ma is aktívak.
3. **Konténerszükséglet**: Egy 60 lakásos panelház átlagosan heti 2–3 m³ vegyes hulladékot termel, ami 3–4 db 1100 literes konténert igényel. A szelektív gyűjtőkonténerek (papír, műanyag, üveg) elhelyezéséhez szükséges tér és az FKF-szállítási kapacitás koordinációja komoly logisztikai feladat.
4. **Illegális hulladéklerakás**: A lakótelepek pincéi, parkosított területei és garázssorai az illegális hulladéklerakás kiemelt célpontjai. Az FKF és a kerületi önkormányzatok rendszeresen kapnak ilyen bejelentéseket.

### 1.3 A vízgazdálkodás szakdolgozati és hazai háttere

Az EGCA 8. kritériuma (vízfogyasztás és vízminőség) és 9. kritériuma (szennyvízkezelés) szerint az értékelt városoknak be kell mutatniuk:
- **Egy főre jutó ivóvíz-felhasználás** (L/fő/nap)
- **Hálózati vízveszteség aránya** (a kitermelt vízből mennyi jut el a fogyasztókhoz)
- **Szennyvíz-kezelési ráta** (a keletkező szennyvíz hány %-a kerül legalább másodlagos kezelésre)
- **A vízminőség megfelelési aránya** (ivóvíz-minőségi előírások teljesítése)

Budapest vízgazdálkodási helyzete a BGYH (Budapesti Vízgazdálkodási Hatóság) és a Fővárosi Vízművek adatai alapján:

| Mutató | Budapest (2022) | Magyar átlag | EU-27 átlag | WHO ajánlás |
|--------|-----------------|--------------|-------------|-------------|
| Egy főre jutó vízfogyasztás | 92 L/fő/nap | 98 L/fő/nap | 128 L/fő/nap | 50–100 L/fő/nap |
| Hálózati vízveszteség | ~28% | ~32% | ~25% | <15% (cél) |
| Szennyvízkezelési ráta | 98% | 89% | 94% | 100% |
| Ivóvíz-minőségi megfelelés | 99,2% | 96,8% | 98,5% | 100% |

Budapest vízfogyasztása az utóbbi évtizedben **folyamatosan csökkent** (1990-ben még 160 L/fő/nap volt), ami részben a vízárak emelkedésének, részben a hatékonyabb víztakarékos berendezések terjedésének köszönhető. Azonban a **hálózati vízveszteség (28%)** még mindig magas: ez azt jelenti, hogy a Fővárosi Vízművek által a hálózatba táplált víz közel harmada soha nem jut el a fogyasztókhoz — csőrepedések, tömítetlenségek és engedély nélküli vételezések miatt. A panelházak szempontjából ez különösen releváns, mert az 1960–1980-as évek ónacél és ólomacél vízvezetékeinek átlagos kora 40–60 év, és a veszteség egy része éppen ezeken az épületen belüli, **elavult csőhálózatokon** keletkezik.

A **panelházak vízgazdálkodási sajátosságai**:
1. **Közös vízóra + lakásonkénti almérők**: A legtöbb panelházban van egy főmérő (közüzemi mérő) és lakásonkénti almérők. Az almérők és a főmérő közötti különbség a **rejtett szivárgás** egyik legfontosabb jelzőszáma.
2. **Elavult csőanyagok**: Az ónacél és galvanizált acél csövek korróziója miatt a vízveszteség épületen belül is jelentős lehet. A Fővárosi Vízművek adatai szerint a panelházak belső hálózatán keletkező vízveszteség épületenként elérheti az éves fogyasztás 5–15%-át.
3. **HMV (használati melegvíz) keringtető rendszer**: A táv- vagy épület-szintű HMV-rendszerek állandó keringtetést végeznek (hogy azonnal legyen meleg víz a csapoknál), ami folyamatos hőveszteséget okoz.
4. **Közös területek vízhasználata**: Az épület mosókonyháiba, pincéjébe, esetleg garázsba vagy kertbe bekötött vízvételezési pontok fogyasztása sokszor nem kerül elszámolásra az egyes lakásoknál, hanem a „különbözeti" tételek között jelenik meg.

---

## 2. Feature neve, helye, prioritása

### 2.1 Modulok

| Modul | Magyar neve | Helye az alkalmazásban |
|-------|-------------|----------------------|
| **Waste** | Hulladékgazdálkodás | `/w/:workspaceId/fenntarthatosag?tab=hulladek` |
| **Water** | Vízfogyasztás-nyomkövető | `/w/:workspaceId/fenntarthatosag?tab=viz` |

Mindkét modul a **Workspace dashboard → Fenntarthatóság tab** alá kerül, amely a Feature 06 (Energetika) mellé egy szomszéd almenüpont. Az URL struktúra követi a meglévő workspace-UUID-in-URL konvenciót (`.governance/ui_ux_rules.md` § „Workspace identifier in URL").

### 2.2 Prioritás

**KÖZEPES** — Indoklás:
- Nem érint meglévő kritikus infrastruktúrát (fizetési rendszer, tagkezelés)
- Erős szakdolgozati és EU-policy alap (két lefedetlen indikátor)
- Részben épít a meglévő `meter_readings` táblára (víz modul)
- A hulladék modul teljesen új adatmodellt vezet be
- Becsült fejlesztési idő: 3–4 sprint (6–8 hét)

### 2.3 Kapcsolódó feature-ök

- **Feature 06** (Energetika CO₂): A `meter_readings` tábla meglévő `viz` méréstípusa közvetlen alapja a víz modulnak
- **Feature 05** (Közösségi Zöld Akciók): A szelektív hulladékgyűjtési kampányok ott jeleníthetők meg
- **Feature 02** (Zöld Pontszám): A hulladék- és vízmutatók beépülnek az épület összesített Zöld Pontszámába

---

## 3. Funkcionális követelmények — Hulladék modul

### 3.1 Szelektív hulladékgyűjtés közösségi nyomkövető

A hulladék modul központi funkciója: a lakóközösség tagjai **havi rendszerességgel** bejelenthetik, hogy az ő lakásukban mennyire valósul meg a szelektív gyűjtés. Ez nem hatósági adatszolgáltatás, hanem **önkéntes, anonim közösségi riportolás**, amelyből az épület szintű statisztika kiszámítható.

**Bejelentési kérdőív (havonta egyszer, mobilon kitölthető):**
```
Ebben a hónapban szétválasztottad-e:
☑ Papír / karton (kék konténer)
☑ Műanyag / fém (sárga konténer)
☑ Üveg (zöld konténer)
☑ Biohulladék / szerves (barna konténer, ha van)
☑ Elektronikai hulladék (leadás gyűjtőponton)
```

Az adatokból az alábbi épületszintű mutatók számíthatók:
- **Részvételi arány** (%): hány lakás töltötte ki a kérdőívet
- **Szelektálási ráta** (%): a kitöltők hány %-a jelölt legalább 3 kategóriát
- **Teljes szelektálási ráta** (%): az összes lakáshoz viszonyítva

A rendszer **nem kényszerít** adatmegadásra, és a bejelentések **névtelenek** (csak a közösség egésze látja az aggregált adatot, nem azt, ki szelektál és ki nem).

### 3.2 Hulladékszállítási naptár — FKF integráció

Az FKF Nonprofit Zrt. Budapest teljes területén végzi a kommunális hulladékszállítást. A hulladékszállítási naptár kerületenként és utcánként tartalmazza, hogy mikor viszik el a különböző hulladékfajtákat. Az FKF nyilvános adatbázisa a [hulladeknaptar.fkf.hu](https://hulladeknaptar.fkf.hu) oldalon érhető el.

**A naptár adatstruktúrája kerületenként (statikus JSON, havonta frissítve):**

```typescript
// lib/fkf-district-data.ts
export type WasteType = 'vegyes' | 'papir' | 'muanyag' | 'uveg' | 'bio' | 'lomtalanitas'

export interface FkfScheduleEntry {
  district: number          // 1–23 (Budapest kerületek)
  wasteType: WasteType
  collectionDayOfWeek: number  // 0=vasárnap, 1=hétfő, ...
  frequencyWeeks: number       // 1 = heti, 2 = kéthetente
  weekParity?: 'even' | 'odd' // kéthetente: páros vagy páratlan hét
  notes?: string
}

// Minta: XIV. kerület (Zugló) hulladékszállítási rend
export const FKF_SCHEDULE_XIV: FkfScheduleEntry[] = [
  { district: 14, wasteType: 'vegyes',      collectionDayOfWeek: 2, frequencyWeeks: 1 },
  { district: 14, wasteType: 'papir',       collectionDayOfWeek: 4, frequencyWeeks: 2, weekParity: 'odd' },
  { district: 14, wasteType: 'muanyag',     collectionDayOfWeek: 4, frequencyWeeks: 2, weekParity: 'even' },
  { district: 14, wasteType: 'uveg',        collectionDayOfWeek: 3, frequencyWeeks: 4 },
  { district: 14, wasteType: 'bio',         collectionDayOfWeek: 2, frequencyWeeks: 1 },
  { district: 14, wasteType: 'lomtalanitas',collectionDayOfWeek: 1, frequencyWeeks: 52, notes: 'Évi 1×, tavasz' },
]
```

Az alkalmazás az épület kerületszámát (`buildings.district` mező) alapján automatikusan megjeleníti a következő 30 nap szállítási naptárát.

### 3.3 Épületszintű újrahasznosítási ráta és CO₂-megtakarítás kalkulátor

A közösségi bejelentések és a szállítási naptár alapján kiszámítható:

**Becsült újrahasznosított mennyiségek** (szakirodalmi átlagok alapján, KSH 2022 adatokból):

| Hulladékkategória | Kg CO₂/kg megtakarítás | Egy lakás átlag/hó | Forrás |
|-------------------|----------------------|-------------------|--------|
| Papír / karton | 0,70 kg CO₂/kg | 4,2 kg | EPEA, 2021 |
| Műanyag (kevert) | 1,50 kg CO₂/kg | 2,8 kg | PlasticsEurope, 2022 |
| Üveg | 0,30 kg CO₂/kg | 3,1 kg | Glass Alliance Europe |
| Biohulladék | 0,10 kg CO₂/kg | 8,5 kg | ÖKO-PANNON |
| Elektronikai hulladék | 4,50 kg CO₂/kg | 0,3 kg (alkalom) | WEEE Forum |
| Alumínium (fémen belül) | 9,20 kg CO₂/kg | 0,5 kg | EAA |

**Megjegyzés:** A CO₂ megtakarítási faktorok a gyártási szakasz kiváltásán alapulnak (avoided primary production), nem csupán a szállítás megtakarításán. Ez az iparági standard módszertan (ISO 14044).

### 3.4 Illegális hulladéklerakás bejelentő

A lakóközösség tagjai GPS-koordinátával és fényképpel jelenthetnek be illegális hulladéklerakást az épület körzetében. A bejelentés automatikusan:
1. Rögzítődik az adatbázisban
2. Értesíti a közös képviselőt (e-mail/push)
3. Exportálható CSV formátumban a kerületi önkormányzatnak való bejelentéshez

**Kategóriák:**
- `butor` — bútor, háztartási berendezés
- `epitesi` — építési/bontási törmelék
- `kommunalis` — vegyes háztartási hulladék (nem megfelelő helyen)
- `veszelyes` — veszélyes anyag (festék, akkumulátor)
- `egyeb` — egyéb, szabad szöveges leírással

### 3.5 E-hulladék gyűjtőpontok interaktív térképe

OpenStreetMap (OSM) `amenity=recycling` + `recycling:electronics=yes` lekérdezés az épülettől 2 km-en belüli gyűjtőpontokra. Az Overpass API segítségével lekérdezhetők a FKF és egyéb hulladékgyűjtők által üzemeltetett elektronikai gyűjtőpontok.

**Overpass QL lekérdezés (szerver-oldalon cachelve):**
```
[out:json][timeout:10];
(
  node["amenity"="recycling"]["recycling:electronics"="yes"]
    (around:2000,{lat},{lon});
  way["amenity"="recycling"]["recycling:electronics"="yes"]
    (around:2000,{lat},{lon});
);
out body;
```

### 3.6 Kerületi rangsor — Budapest szelektív gyűjtési összehasonlítás

Az FKF éves jelentései kerületenként tartalmazzák a szelektív hulladékgyűjtési mutatókat. Ez az adat statikusan betölthető és évente frissítendő. A feature megmutatja, hogy az épület kerülete hogyan helyezkedik el Budapest 23 kerületének rangsorában.

**Budapest kerületi szelektív gyűjtési arányok (FKF Éves Jelentés, 2022):**

| Kerület | Szelektív arány | Rang |
|---------|----------------|------|
| I. Budavár | 41% | 1. |
| II. Budai | 38% | 2. |
| XII. Hegyvidék | 37% | 3. |
| ... | ... | ... |
| VIII. Józsefváros | 19% | 21. |
| XVII. Rákosmente | 18% | 22. |
| IV. Újpest | 16% | 23. |

---

## 4. Funkcionális követelmények — Vízfogyasztás modul

### 4.1 Közös vízóra leolvasás integrációja

A meglévő `meter_readings` tábla már tartalmaz `meter_type = 'viz'` típusú bejegyzéseket. A vízfogyasztás modul **kibővíti** ezt a meglévő adatmodellt:

- **Főmérő (közüzemi)**: az egész épület vízfogyasztása (m³)
- **Almérők (lakásonkénti)**: az egyes lakások fogyasztása (m³)
- **Közös területi almérők**: mosókonyha, pince, kert, garázsmosdó külön almérőkön

Az új `is_common_area` és `meter_subtype` mezők hozzáadásával (lásd Supabase séma, 7. fejezet) az aggregáció pontosabbá válik.

### 4.2 Per capita vízfogyasztás monitoring

Az épület összfogyasztása és a regisztrált lakók száma alapján számított mutató:

```
Per capita fogyasztás = Épület havi főmérő-fogyasztás (L) ÷ (Lakók száma × Napok száma)
```

Benchmark értékek:
- **Budapest átlag (2022)**: 92 L/fő/nap (Fővárosi Vízművek)
- **Magyar átlag (KSH 2022)**: 98 L/fő/nap
- **EU-27 átlag**: 128 L/fő/nap
- **WHO minimum**: 50 L/fő/nap
- **WHO optimum háztartási**: 100 L/fő/nap

### 4.3 Szivárgás-riasztó rendszer

**Algoritmus:**
1. Kiszámítja az elmúlt 6 hónap gördülő átlag fogyasztását (rolling average)
2. Ha az aktuális havi fogyasztás **>20%-kal meghaladja** a gördülő átlagot → `FIGYELMEZTETÉS` szint
3. Ha **>40%-kal meghaladja** → `VÉSZJELZÉS` szint
4. Ha a főmérő és az összesített almérők közötti különbség **>10%** → `REJTETT SZIVÁRGÁS` gyanú

A riasztás azonnal értesíti a közös képviselőt (belső értesítési rendszeren keresztül) és megjelenik a dashboard-on.

### 4.4 Közös területek vízhasználatának nyomkövetése

Az `is_common_area = true` flaggel jelölt mérőórák fogyasztása külön kategóriában jelenik meg:

| Közös terület típusa | Átlag fogyasztás (60 lakásos ház) |
|---------------------|----------------------------------|
| Mosókonyha | 12–18 m³/hó |
| Kert/öntözőrendszer (nyár) | 8–25 m³/hó |
| Garázsmosdó | 2–5 m³/hó |
| Kazánterem/gépészet | 3–8 m³/hó |
| Lépcső/közlekedő (takarítás) | 1–3 m³/hó |

### 4.5 Szezonális megtakarítási tanácsok

Lokalizált, szezonális tippek listája, amelyek automatikusan váltanak az aktuális hónap alapján:

**Nyár (június–augusztus):**
- „Reggelenként öntözz — délben az öntöző víz 30%-a elpárolog mielőtt a talajba szivárog (forrás: ÉMI, 2021)"
- „Esővíz-gyűjtő tartály az erkélyen: évi 8–12 m³ megtakarítás"
- „Autómosó helyett mosóautomata: 80L helyett 40L fogyasztás autónként"

**Tél (november–február):**
- „Csepegtető csaptelep: 30 csepp/perc = 1 m³/hónap pazarlás (forrás: Fővárosi Vízművek)"
- „Szigeteld a hidegvíz-csöveket a pincében: megelőzhető a fagykár okozta törés"
- „HMV-keringtető hőmérséklet 55°C-on: elegendő a Legionella-mentességhez, felesleges hőveszteség nélkül"

**Tavasz (március–május) / Ősz (szeptember–október):**
- „Mosd teli géppel: félgéppel 60L, teli géppel 65L — a különbség minimális a hatékonysághoz képest"
- „Zuhanyzás fürdés helyett: 7 perces zuhany vs. fürdőkád = 45L vs. 150L"

---

## 5. Technikai architektúra

### 5.1 API route-ok

```
app/
  api/
    waste/
      fkf-schedule/
        route.ts          ← FKF szállítási naptár (statikus JSON, kerület alapján)
      report/
        route.ts          ← Épületszintű hulladék-bejelentés rögzítése
      illegal-dump/
        route.ts          ← Illegális hulladéklerakás bejelentése
      recycling-points/
        route.ts          ← OSM e-hulladék gyűjtőpontok (Overpass API proxy, 24h cache)
      district-stats/
        route.ts          ← Budapest kerületi szelektív gyűjtési statisztikák (statikus)
    water/
      consumption/
        route.ts          ← Vízfogyasztás aggregáció (főmérő + almérők)
      leak-check/
        route.ts          ← Szivárgás-detektálás algoritmus futtatása
      benchmark/
        route.ts          ← Budapest/EU/WHO benchmark adatok
  w/
    [workspaceId]/
      fenntarthatosag/
        page.tsx          ← Fenntarthatóság főoldal (Energia + Hulladék + Víz tab)
        hulladek/
          page.tsx        ← Hulladék modul oldal
        viz/
          page.tsx        ← Vízfogyasztás modul oldal
components/
  waste-tracker-panel.tsx
  water-consumption-widget.tsx
  waste-collection-calendar.tsx
  illegal-dump-reporter.tsx
  waste-dna-visualization.tsx   ← Crazy Innovation
  water-pulse-monitor.tsx       ← Crazy Innovation
lib/
  waste-co2-calc.ts
  fkf-district-data.ts
  water-leak-detector.ts
```

### 5.2 FKF naptár API route

```typescript
// app/api/waste/fkf-schedule/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { FKF_SCHEDULES } from '@/lib/fkf-district-data'
import { addDays, startOfDay, getDay, getWeek } from 'date-fns'

export const revalidate = 86400 // 24 óra cache

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const district = parseInt(searchParams.get('district') ?? '0', 10)
  const daysAhead = parseInt(searchParams.get('days') ?? '30', 10)

  if (!district || district < 1 || district > 23) {
    return NextResponse.json({ error: 'Érvénytelen kerület' }, { status: 400 })
  }

  const schedule = FKF_SCHEDULES[district]
  if (!schedule) {
    return NextResponse.json({ error: 'Nincs adat erre a kerületre' }, { status: 404 })
  }

  const today = startOfDay(new Date())
  const upcoming: { date: string; wasteType: string; label: string }[] = []

  for (let i = 0; i <= daysAhead; i++) {
    const day = addDays(today, i)
    const dayOfWeek = getDay(day)
    const weekNumber = getWeek(day, { weekStartsOn: 1 })

    for (const entry of schedule) {
      if (entry.collectionDayOfWeek !== dayOfWeek) continue
      if (entry.frequencyWeeks === 2) {
        const isEven = weekNumber % 2 === 0
        if (entry.weekParity === 'even' && !isEven) continue
        if (entry.weekParity === 'odd' && isEven) continue
      }
      if (entry.frequencyWeeks > 2) {
        // Évi/negyedévente — külön logika
        if (weekNumber % entry.frequencyWeeks !== 0) continue
      }
      upcoming.push({
        date: day.toISOString().split('T')[0],
        wasteType: entry.wasteType,
        label: WASTE_TYPE_LABELS[entry.wasteType],
      })
    }
  }

  return NextResponse.json({ district, upcoming })
}

const WASTE_TYPE_LABELS: Record<string, string> = {
  vegyes: 'Vegyes kommunális hulladék',
  papir: 'Papír és karton',
  muanyag: 'Műanyag és fém',
  uveg: 'Üveg',
  bio: 'Biohulladék',
  lomtalanitas: 'Lomtalanítás',
}
```

### 5.3 CO₂ megtakarítás kalkulátor

```typescript
// lib/waste-co2-calc.ts

export type RecyclableMaterial = 'papir' | 'muanyag' | 'uveg' | 'bio' | 'elektronikai' | 'aluminium' | 'aceledeny'

interface Co2Factor {
  kgCo2PerKg: number      // elkerült CO₂-egyenérték kg/kg
  labelHu: string
  color: string           // Tailwind/hex szín a vizualizációhoz
  typicalMonthlyKgPerHousehold: number  // KSH alapú átlag
}

export const CO2_FACTORS: Record<RecyclableMaterial, Co2Factor> = {
  papir: {
    kgCo2PerKg: 0.70,
    labelHu: 'Papír / karton',
    color: '#3B82F6',
    typicalMonthlyKgPerHousehold: 4.2,
  },
  muanyag: {
    kgCo2PerKg: 1.50,
    labelHu: 'Műanyag (kevert)',
    color: '#F59E0B',
    typicalMonthlyKgPerHousehold: 2.8,
  },
  uveg: {
    kgCo2PerKg: 0.30,
    labelHu: 'Üveg',
    color: '#10B981',
    typicalMonthlyKgPerHousehold: 3.1,
  },
  bio: {
    kgCo2PerKg: 0.10,
    labelHu: 'Biohulladék',
    color: '#84CC16',
    typicalMonthlyKgPerHousehold: 8.5,
  },
  elektronikai: {
    kgCo2PerKg: 4.50,
    labelHu: 'Elektronikai hulladék',
    color: '#8B5CF6',
    typicalMonthlyKgPerHousehold: 0.3,
  },
  aluminium: {
    kgCo2PerKg: 9.20,
    labelHu: 'Alumínium',
    color: '#6B7280',
    typicalMonthlyKgPerHousehold: 0.5,
  },
  aceledeny: {
    kgCo2PerKg: 1.80,
    labelHu: 'Acéledény / konzerv',
    color: '#9CA3AF',
    typicalMonthlyKgPerHousehold: 0.8,
  },
}

export function calculateCo2Savings(
  material: RecyclableMaterial,
  quantityKg: number
): number {
  return CO2_FACTORS[material].kgCo2PerKg * quantityKg
}

export function calculateBuildingMonthlyCo2Savings(params: {
  householdsParticipating: number
  totalHouseholds: number
  materialsRecycled: Partial<Record<RecyclableMaterial, number>> // kg values
}): { totalKgCo2: number; byMaterial: Record<string, number>; treeEquivalent: number } {
  const byMaterial: Record<string, number> = {}
  let totalKgCo2 = 0

  for (const [material, kg] of Object.entries(params.materialsRecycled) as [RecyclableMaterial, number][]) {
    const saved = calculateCo2Savings(material, kg)
    byMaterial[material] = saved
    totalKgCo2 += saved
  }

  // Egy fa évente kb. 22 kg CO₂-t köt meg (Erdőgazdálkodási Intézet, 2019)
  const treeEquivalent = Math.round(totalKgCo2 / (22 / 12))

  return { totalKgCo2, byMaterial, treeEquivalent }
}
```

### 5.4 Szivárgás-detektáló algoritmus

```typescript
// lib/water-leak-detector.ts

export interface MeterReading {
  readingDate: string
  valueM3: number
  meterType: 'fomero' | 'almero' | 'kozos_terulet'
}

export interface LeakAnalysisResult {
  status: 'normal' | 'warning' | 'alert' | 'hidden_leak'
  currentMonthM3: number
  rollingAverageM3: number
  deviationPercent: number
  mainMeterM3: number
  subMetersTotalM3: number
  lossPercent: number
  message: string
  messageHu: string
}

export function detectLeak(
  readings: MeterReading[],
  currentMonth: string
): LeakAnalysisResult {
  // Gördülő átlag (utóbbi 6 hónap, az aktuálist kizárva)
  const historicalMainReadings = readings
    .filter(r => r.meterType === 'fomero' && r.readingDate < currentMonth)
    .slice(-6)

  const rollingAverageM3 =
    historicalMainReadings.length > 0
      ? historicalMainReadings.reduce((sum, r) => sum + r.valueM3, 0) / historicalMainReadings.length
      : 0

  const currentMainReading = readings.find(
    r => r.meterType === 'fomero' && r.readingDate.startsWith(currentMonth)
  )
  const currentMonthM3 = currentMainReading?.valueM3 ?? 0

  const subMetersTotal = readings
    .filter(r => r.meterType !== 'fomero' && r.readingDate.startsWith(currentMonth))
    .reduce((sum, r) => sum + r.valueM3, 0)

  const deviationPercent =
    rollingAverageM3 > 0
      ? ((currentMonthM3 - rollingAverageM3) / rollingAverageM3) * 100
      : 0

  const lossPercent =
    currentMonthM3 > 0
      ? ((currentMonthM3 - subMetersTotal) / currentMonthM3) * 100
      : 0

  let status: LeakAnalysisResult['status'] = 'normal'
  let messageHu = 'A vízfogyasztás normális tartományban van.'

  if (lossPercent > 10) {
    status = 'hidden_leak'
    messageHu = `A főmérő és az almérők összege között ${lossPercent.toFixed(1)}%-os különbség van — rejtett szivárgás gyanúja!`
  } else if (deviationPercent > 40) {
    status = 'alert'
    messageHu = `A fogyasztás ${deviationPercent.toFixed(0)}%-kal meghaladja az átlagot — azonnali ellenőrzés szükséges!`
  } else if (deviationPercent > 20) {
    status = 'warning'
    messageHu = `A fogyasztás ${deviationPercent.toFixed(0)}%-kal magasabb az átlagnál — ellenőrizd a csapokat és a WC-öblítőket.`
  }

  return {
    status,
    currentMonthM3,
    rollingAverageM3,
    deviationPercent,
    mainMeterM3: currentMonthM3,
    subMetersTotalM3: subMetersTotal,
    lossPercent,
    message: messageHu,
    messageHu,
  }
}
```

---

## 6. Frontend komponensek

### 6.1 Hulladék tracker panel

```tsx
// components/waste-tracker-panel.tsx
'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Recycle, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'
import { CO2_FACTORS, calculateBuildingMonthlyCo2Savings } from '@/lib/waste-co2-calc'
import { useI18n } from '@/lib/i18n'

interface WasteMonthlyReport {
  month: string
  householdsParticipating: number
  totalHouseholds: number
  paperKg: number
  plasticKg: number
  glassKg: number
  organicKg: number
  electronicKg: number
}

interface WasteTrackerPanelProps {
  buildingId: string
  district: number
  reports: WasteMonthlyReport[]
  currentMonth: string
}

const WASTE_COLORS = {
  papir: '#3B82F6',
  muanyag: '#F59E0B',
  uveg: '#10B981',
  bio: '#84CC16',
  elektronikai: '#8B5CF6',
}

export function WasteTrackerPanel({
  buildingId,
  district,
  reports,
  currentMonth,
}: WasteTrackerPanelProps) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<'osszefoglalas' | 'naptar' | 'co2'>('osszefoglalas')

  const latest = reports[reports.length - 1]

  const participationRate = latest
    ? Math.round((latest.householdsParticipating / latest.totalHouseholds) * 100)
    : 0

  const co2Result = latest
    ? calculateBuildingMonthlyCo2Savings({
        householdsParticipating: latest.householdsParticipating,
        totalHouseholds: latest.totalHouseholds,
        materialsRecycled: {
          papir: latest.paperKg,
          muanyag: latest.plasticKg,
          uveg: latest.glassKg,
          bio: latest.organicKg,
          elektronikai: latest.electronicKg,
        },
      })
    : null

  const pieData = latest
    ? [
        { name: 'Papír', value: latest.paperKg, color: WASTE_COLORS.papir },
        { name: 'Műanyag', value: latest.plasticKg, color: WASTE_COLORS.muanyag },
        { name: 'Üveg', value: latest.glassKg, color: WASTE_COLORS.uveg },
        { name: 'Bio', value: latest.organicKg, color: WASTE_COLORS.bio },
        { name: 'Elektro', value: latest.electronicKg, color: WASTE_COLORS.elektronikai },
      ].filter(d => d.value > 0)
    : []

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-green-50 p-2 dark:bg-green-950">
            <Recycle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {t('waste.title')}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t('waste.subtitle', { district })}
            </p>
          </div>
        </div>

        {/* Részvételi arány badge */}
        <div className={`rounded-full px-3 py-1 text-sm font-medium ${
          participationRate >= 60
            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
            : participationRate >= 30
            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
        }`}>
          {participationRate}% {t('waste.participates')}
        </div>
      </div>

      {/* Tab-ok */}
      <div className="flex gap-1 mb-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1">
        {(['osszefoglalas', 'naptar', 'co2'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {t(`waste.tab.${tab}`)}
          </button>
        ))}
      </div>

      {/* Összefoglaló tab */}
      {activeTab === 'osszefoglalas' && (
        <div className="space-y-4">
          {/* Statisztika kártyák */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Papír', kg: latest?.paperKg ?? 0, color: 'blue' },
              { label: 'Műanyag', kg: latest?.plasticKg ?? 0, color: 'yellow' },
              { label: 'Üveg', kg: latest?.glassKg ?? 0, color: 'green' },
              { label: 'Bio', kg: latest?.organicKg ?? 0, color: 'lime' },
            ].map(item => (
              <div
                key={item.label}
                className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.label}</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {item.kg.toFixed(1)} <span className="text-sm font-normal">kg</span>
                </p>
              </div>
            ))}
          </div>

          {/* Pie chart */}
          {pieData.length > 0 && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}kg`}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} kg`, '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* CO₂ tab */}
      {activeTab === 'co2' && co2Result && (
        <div className="space-y-4">
          <div className="rounded-xl bg-green-50 dark:bg-green-950 p-4 text-center">
            <p className="text-sm text-green-700 dark:text-green-300 mb-1">
              {t('waste.co2.savedThisMonth')}
            </p>
            <p className="text-4xl font-bold text-green-800 dark:text-green-200">
              {co2Result.totalKgCo2.toFixed(1)}
              <span className="text-lg font-normal ml-1">kg CO₂</span>
            </p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
              ≈ {co2Result.treeEquivalent} {t('waste.co2.treesEquivalent')}
            </p>
          </div>

          <div className="space-y-2">
            {Object.entries(co2Result.byMaterial).map(([material, saved]) => (
              <div key={material} className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {CO2_FACTORS[material as keyof typeof CO2_FACTORS]?.labelHu ?? material}
                </span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {saved.toFixed(2)} kg CO₂
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

### 6.2 Vízfogyasztás widget

```tsx
// components/water-consumption-widget.tsx
'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { Droplets, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react'
import { LeakAnalysisResult } from '@/lib/water-leak-detector'
import { useI18n } from '@/lib/i18n'

interface MonthlyConsumption {
  month: string          // 'YYYY-MM'
  m3: number
  perCapitaLitersPerDay: number
}

interface WaterConsumptionWidgetProps {
  buildingId: string
  monthlyData: MonthlyConsumption[]
  leakAnalysis: LeakAnalysisResult
  occupants: number
}

const BUDAPEST_AVERAGE = 92   // L/fő/nap
const EU_AVERAGE = 128
const WHO_OPTIMUM = 100

export function WaterConsumptionWidget({
  buildingId,
  monthlyData,
  leakAnalysis,
  occupants,
}: WaterConsumptionWidgetProps) {
  const { t } = useI18n()

  const latestMonth = monthlyData[monthlyData.length - 1]
  const currentPerCapita = latestMonth?.perCapitaLitersPerDay ?? 0

  const statusConfig = {
    normal: { icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950', label: t('water.status.normal') },
    warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950', label: t('water.status.warning') },
    alert: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950', label: t('water.status.alert') },
    hidden_leak: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950', label: t('water.status.hiddenLeak') },
  }[leakAnalysis.status]

  const StatusIcon = statusConfig.icon

  const chartData = monthlyData.map(m => ({
    name: m.month.slice(0, 7),
    fogyasztas: m.perCapitaLitersPerDay,
  }))

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2 ${statusConfig.bg}`}>
            <StatusIcon className={`h-6 w-6 ${statusConfig.color}`} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {t('water.title')}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t('water.occupants', { count: occupants })}
            </p>
          </div>
        </div>

        {leakAnalysis.status !== 'normal' && (
          <div className={`rounded-full px-3 py-1 text-sm font-medium ${statusConfig.bg} ${statusConfig.color}`}>
            {statusConfig.label}
          </div>
        )}
      </div>

      {/* Riasztó üzenet */}
      {leakAnalysis.status !== 'normal' && (
        <div className={`rounded-xl p-3 mb-4 ${statusConfig.bg}`}>
          <p className={`text-sm font-medium ${statusConfig.color}`}>
            {leakAnalysis.messageHu}
          </p>
        </div>
      )}

      {/* Per capita szám */}
      <div className="text-center mb-6">
        <p className="text-5xl font-bold text-zinc-900 dark:text-zinc-100">
          {currentPerCapita.toFixed(0)}
          <span className="text-lg font-normal text-zinc-500 ml-1">L/fő/nap</span>
        </p>
        <div className="flex justify-center gap-4 mt-2">
          <span className="text-xs text-zinc-400">
            Budapest: {BUDAPEST_AVERAGE} L
          </span>
          <span className="text-xs text-zinc-400">
            EU: {EU_AVERAGE} L
          </span>
          <span className="text-xs text-zinc-400">
            WHO: {WHO_OPTIMUM} L
          </span>
        </div>
      </div>

      {/* Trend chart */}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(v: number) => [`${v.toFixed(0)} L/fő/nap`, 'Fogyasztás']}
            />
            <ReferenceLine y={BUDAPEST_AVERAGE} stroke="#F59E0B" strokeDasharray="4 2" label={{ value: 'Budapest átlag', position: 'right', fontSize: 9 }} />
            <Area
              type="monotone"
              dataKey="fogyasztas"
              stroke="#3B82F6"
              fill="url(#waterGrad)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

### 6.3 Hulladékszállítási naptár komponens

```tsx
// components/waste-collection-calendar.tsx
'use client'

import { useEffect, useState } from 'react'
import { Calendar, Truck } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface CollectionEvent {
  date: string
  wasteType: string
  label: string
}

interface WasteCollectionCalendarProps {
  district: number
}

const WASTE_TYPE_COLORS: Record<string, string> = {
  vegyes: 'bg-zinc-500',
  papir: 'bg-blue-500',
  muanyag: 'bg-yellow-500',
  uveg: 'bg-green-500',
  bio: 'bg-lime-600',
  lomtalanitas: 'bg-red-500',
}

const WASTE_TYPE_ICONS: Record<string, string> = {
  vegyes: '🗑️',
  papir: '📦',
  muanyag: '♻️',
  uveg: '🍾',
  bio: '🌿',
  lomtalanitas: '🛋️',
}

export function WasteCollectionCalendar({ district }: WasteCollectionCalendarProps) {
  const { t } = useI18n()
  const [events, setEvents] = useState<CollectionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSchedule() {
      try {
        setLoading(true)
        const res = await fetch(`/api/waste/fkf-schedule?district=${district}&days=30`)
        if (!res.ok) throw new Error('FKF adat nem elérhető')
        const data = await res.json()
        setEvents(data.upcoming)
      } catch (err) {
        setError('A naptár jelenleg nem elérhető. Ellenőrizd a hulladeknaptar.fkf.hu oldalt.')
      } finally {
        setLoading(false)
      }
    }
    fetchSchedule()
  }, [district])

  const today = new Date().toISOString().split('T')[0]
  const upcoming = events
    .filter(e => e.date >= today)
    .slice(0, 8)

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-xl bg-orange-50 p-2 dark:bg-orange-950">
          <Truck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        </div>
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
          {t('waste.calendar.title')} — {district}. kerület
        </h3>
      </div>

      {loading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-2">
          {upcoming.map((event, i) => {
            const dateObj = new Date(event.date)
            const isToday = event.date === today
            const isTomorrow =
              event.date === new Date(Date.now() + 86400000).toISOString().split('T')[0]

            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                  isToday
                    ? 'bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <div className={`w-2 h-10 rounded-full ${WASTE_TYPE_COLORS[event.wasteType] ?? 'bg-zinc-400'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {WASTE_TYPE_ICONS[event.wasteType]} {event.label}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {isToday ? '⚡ Ma' : isTomorrow ? '⏰ Holnap' : ''}
                    {dateObj.toLocaleDateString('hu-HU', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

### 6.4 Illegális hulladéklerakás bejelentő

```tsx
// components/illegal-dump-reporter.tsx
'use client'

import { useState, useRef } from 'react'
import { Camera, MapPin, Send, AlertCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

type DumpCategory = 'butor' | 'epitesi' | 'kommunalis' | 'veszelyes' | 'egyeb'

const CATEGORIES: { value: DumpCategory; labelHu: string; icon: string }[] = [
  { value: 'butor', labelHu: 'Bútor / háztartási eszköz', icon: '🛋️' },
  { value: 'epitesi', labelHu: 'Építési/bontási törmelék', icon: '🧱' },
  { value: 'kommunalis', labelHu: 'Vegyes háztartási hulladék', icon: '🗑️' },
  { value: 'veszelyes', labelHu: 'Veszélyes anyag (festék, akksi)', icon: '⚠️' },
  { value: 'egyeb', labelHu: 'Egyéb', icon: '❓' },
]

interface IllegalDumpReporterProps {
  buildingId: string
  onSuccess?: () => void
}

export function IllegalDumpReporter({ buildingId, onSuccess }: IllegalDumpReporterProps) {
  const { t } = useI18n()
  const [category, setCategory] = useState<DumpCategory | null>(null)
  const [description, setDescription] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('A böngésződ nem támogatja a helymeghatározást.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setLocationError(null)
      },
      () => {
        setLocationError(
          'Helymeghatározás megtagadva. Engedélyezd a böngésző beállításaiban, vagy add meg az utcát/házszámot szövegesen.'
        )
      }
    )
  }

  const handleSubmit = async () => {
    if (!category) return
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('buildingId', buildingId)
      formData.append('category', category)
      formData.append('description', description)
      if (location) {
        formData.append('lat', String(location.lat))
        formData.append('lon', String(location.lon))
      }
      if (photoFile) formData.append('photo', photoFile)

      const res = await fetch('/api/waste/illegal-dump', { method: 'POST', body: formData })
      if (!res.ok) throw new Error()
      setSubmitted(true)
      onSuccess?.()
    } catch {
      alert('Hiba történt. Próbáld újra.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 dark:bg-green-950 p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="font-semibold text-green-800 dark:text-green-200 mb-1">
          Bejelentés elküldve!
        </h3>
        <p className="text-sm text-green-700 dark:text-green-300">
          A közös képviselő értesítést kapott. Köszönjük a bejelentést!
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <AlertCircle className="h-5 w-5 text-red-500" />
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
          Illegális hulladéklerakás bejelentése
        </h3>
      </div>

      {/* Kategória választó */}
      <div>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Hulladék típusa *</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition-colors ${
                category === cat.value
                  ? 'border-red-400 bg-red-50 dark:bg-red-950'
                  : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
              }`}
            >
              <span>{cat.icon}</span>
              <span className="text-zinc-700 dark:text-zinc-300">{cat.labelHu}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Leírás */}
      <div>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">
          Leírás (nem kötelező)
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          placeholder="pl. Pince előtt, kb. 3 db bútor..."
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
        />
      </div>

      {/* Fénykép és GPS */}
      <div className="flex gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <Camera className="h-4 w-4" />
          {photoFile ? 'Fotó cserélve ✓' : 'Fotó hozzáadása'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />

        <button
          onClick={handleGetLocation}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-colors ${
            location
              ? 'border-green-400 bg-green-50 dark:bg-green-950 text-green-700'
              : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          }`}
        >
          <MapPin className="h-4 w-4" />
          {location ? 'GPS ✓' : 'GPS helyzet'}
        </button>
      </div>

      {locationError && (
        <p className="text-xs text-amber-600 dark:text-amber-400">{locationError}</p>
      )}

      {photoPreview && (
        <img src={photoPreview} alt="Előnézet" className="rounded-xl max-h-40 object-cover w-full" />
      )}

      <button
        onClick={handleSubmit}
        disabled={!category || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="h-4 w-4" />
        {submitting ? 'Küldés...' : 'Bejelentés elküldése'}
      </button>
    </div>
  )
}
```

---

## 7. Supabase adatbázis séma

### 7.1 Teljes SQL migráció

```sql
-- Migráció: 20260521_hulladek_viz_gazdalkodas.sql

-- ============================================================
-- HULLADÉK MODUL
-- ============================================================

-- 1. Épületszintű havi hulladékjelentés
create table if not exists building_waste_reports (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(id) on delete cascade,
  month date not null,                          -- mindig a hónap 1. napja (pl. 2025-05-01)
  households_separating integer not null default 0,
  total_households integer not null default 1,
  paper_kg numeric(10,2) default 0,
  plastic_kg numeric(10,2) default 0,
  glass_kg numeric(10,2) default 0,
  organic_kg numeric(10,2) default 0,
  electronic_kg numeric(10,2) default 0,
  submitted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint building_waste_reports_month_unique unique (building_id, month),
  constraint building_waste_reports_households_check
    check (households_separating >= 0 and households_separating <= total_households),
  constraint building_waste_reports_month_check
    check (extract(day from month) = 1)
);

create index building_waste_reports_building_month_idx
  on building_waste_reports (building_id, month desc);

-- RLS
alter table building_waste_reports enable row level security;

create policy "Épülettagok olvashatják a hulladékjelentéseket"
  on building_waste_reports for select
  using (
    exists (
      select 1 from building_members bm
      where bm.building_id = building_waste_reports.building_id
        and bm.profile_id = auth.uid()
    )
  );

create policy "Épülettagok létrehozhatnak hulladékjelentést"
  on building_waste_reports for insert
  with check (
    exists (
      select 1 from building_members bm
      where bm.building_id = building_waste_reports.building_id
        and bm.profile_id = auth.uid()
    )
  );

create policy "Adminok szerkeszthetik a hulladékjelentéseket"
  on building_waste_reports for update
  using (
    exists (
      select 1 from building_members bm
      where bm.building_id = building_waste_reports.building_id
        and bm.profile_id = auth.uid()
        and bm.role in ('admin', 'manager')
    )
  );

-- 2. Illegális hulladéklerakás bejelentések
create table if not exists illegal_dump_reports (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  lat numeric(10, 7),
  lon numeric(10, 7),
  category text not null
    check (category in ('butor', 'epitesi', 'kommunalis', 'veszelyes', 'egyeb')),
  description text,
  photo_url text,
  status text not null default 'bekuldott'
    check (status in ('bekuldott', 'folyamatban', 'megoldva', 'elutasitva')),
  reported_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolver_note text
);

create index illegal_dump_reports_building_idx
  on illegal_dump_reports (building_id, reported_at desc);

-- RLS
alter table illegal_dump_reports enable row level security;

create policy "Épülettagok olvashatják a bejelentéseket"
  on illegal_dump_reports for select
  using (
    exists (
      select 1 from building_members bm
      where bm.building_id = illegal_dump_reports.building_id
        and bm.profile_id = auth.uid()
    )
  );

create policy "Épülettagok hozhatnak létre bejelentést"
  on illegal_dump_reports for insert
  with check (
    exists (
      select 1 from building_members bm
      where bm.building_id = illegal_dump_reports.building_id
        and bm.profile_id = auth.uid()
    )
    and auth.uid() = user_id
  );

create policy "Adminok kezelhetik a bejelentéseket"
  on illegal_dump_reports for update
  using (
    exists (
      select 1 from building_members bm
      where bm.building_id = illegal_dump_reports.building_id
        and bm.profile_id = auth.uid()
        and bm.role in ('admin', 'manager')
    )
  );

-- 3. FKF hulladékszállítási naptár (kerületenkénti statikus adat)
create table if not exists waste_collection_schedule (
  id uuid primary key default gen_random_uuid(),
  district_number integer not null check (district_number between 1 and 23),
  waste_type text not null
    check (waste_type in ('vegyes', 'papir', 'muanyag', 'uveg', 'bio', 'lomtalanitas')),
  collection_day_of_week integer not null check (collection_day_of_week between 0 and 6),
  frequency_weeks integer not null default 1,
  week_parity text check (week_parity in ('even', 'odd')),
  notes text,
  valid_from date not null default current_date,
  valid_until date,
  constraint waste_collection_schedule_unique
    unique (district_number, waste_type, collection_day_of_week, valid_from)
);

-- FKF naptár adatok betöltése — XIV. kerület (Zugló) mintaadatok
insert into waste_collection_schedule
  (district_number, waste_type, collection_day_of_week, frequency_weeks, week_parity)
values
  (14, 'vegyes',      2, 1, null),
  (14, 'papir',       4, 2, 'odd'),
  (14, 'muanyag',     4, 2, 'even'),
  (14, 'uveg',        3, 4, null),
  (14, 'bio',         2, 1, null),
  (14, 'lomtalanitas',1, 52, null)
on conflict do nothing;

-- ============================================================
-- VÍZ MODUL — a meglévő meter_readings tábla kibővítése
-- ============================================================

-- 4. Vízóra típus bővítés a meglévő meter_readings táblán
alter table meter_readings
  add column if not exists is_common_area boolean default false,
  add column if not exists common_area_type text
    check (common_area_type in ('mosokonyha', 'kert', 'garazzsal', 'gepeszet', 'lepcsohaz', null)),
  add column if not exists meter_subtype text
    check (meter_subtype in ('fomero', 'almero', 'kozos_terulet', null));

-- Ha nincs meter_subtype megadva, visszafelé kompatibilis alapértelmezés
comment on column meter_readings.meter_subtype is
  'fomero: épület főmérő; almero: lakásonkénti; kozos_terulet: közös területi almérő';

-- 5. Vízfogyasztás havi összesítő nézet
create or replace view water_monthly_summary as
select
  mr.building_id,
  date_trunc('month', mr.reading_date)::date as month,
  sum(case when mr.meter_subtype = 'fomero' then mr.value else 0 end) as main_meter_m3,
  sum(case when mr.meter_subtype = 'almero' then mr.value else 0 end) as sub_meters_m3,
  sum(case when mr.is_common_area = true then mr.value else 0 end) as common_area_m3,
  count(distinct mr.unit_id) filter (where mr.meter_subtype = 'almero') as units_reporting,
  min(mr.reading_date) as first_reading,
  max(mr.reading_date) as last_reading
from meter_readings mr
where mr.meter_type = 'viz'
group by mr.building_id, date_trunc('month', mr.reading_date)::date;

-- RLS view-ra (nem közvetlenül, de a mögöttes tábla RLS-e érvényes)
-- A view biztonságos, mert a meter_readings RLS-e érvényesül

-- 6. Szivárgás riasztás log
create table if not exists water_leak_alerts (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(id) on delete cascade,
  detected_month date not null,
  severity text not null check (severity in ('warning', 'alert', 'hidden_leak')),
  deviation_percent numeric(8,2),
  loss_percent numeric(8,2),
  main_meter_m3 numeric(10,2),
  sub_meters_total_m3 numeric(10,2),
  message_hu text,
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index water_leak_alerts_building_idx
  on water_leak_alerts (building_id, detected_month desc);

alter table water_leak_alerts enable row level security;

create policy "Épülettagok olvashatják a riasztásokat"
  on water_leak_alerts for select
  using (
    exists (
      select 1 from building_members bm
      where bm.building_id = water_leak_alerts.building_id
        and bm.profile_id = auth.uid()
    )
  );

create policy "Adminok nyugtázhatják a riasztásokat"
  on water_leak_alerts for update
  using (
    exists (
      select 1 from building_members bm
      where bm.building_id = water_leak_alerts.building_id
        and bm.profile_id = auth.uid()
        and bm.role in ('admin', 'manager')
    )
  );

-- ============================================================
-- KÖZÖS SEGÉDFÜGGVÉNY
-- ============================================================

-- Épület havi vízfogyasztás per capita kiszámítása
create or replace function building_water_per_capita(
  p_building_id uuid,
  p_month date,
  p_occupants integer
)
returns numeric
language sql
stable
as $$
  select
    case
      when p_occupants > 0 and extract(day from (p_month + interval '1 month - 1 day')) > 0
        then (wms.main_meter_m3 * 1000) /
             (p_occupants * extract(day from (p_month + interval '1 month - 1 day')))
      else 0
    end
  from water_monthly_summary wms
  where wms.building_id = p_building_id
    and wms.month = date_trunc('month', p_month)::date
  limit 1
$$;
```

---

## 8. Crazy Innovation UI

### 8.1 „Hulladék DNS" — élő DNS helix vizualizáció

A Crazy Innovations System (`crazy_innovations/system.md`) szellemében ez a komponens a szemétszétválasztási rátát egy **forgó DNS-helix animációként** jeleníti meg. A helix minden egyes szálpárja egy hulladékkategóriát reprezent. A helix forgatása, szín-intenzitása és a szálak fényessége mind az adott épület újrahasznosítási teljesítményét tükrözi.

**Design elvek:**
- Magas újrahasznosítási ráta (>60%): élénk zöld, ragyogó, egészséges DNS-szálak, gyors pörgés
- Közepes ráta (30–60%): sárgás-zöldes tónus, mérsékelt pörgés
- Alacsony ráta (<30%): vöröses-szürkés, tompuló szálak, lassú animáció

```tsx
// components/waste-dna-visualization.tsx
'use client'

import { useEffect, useRef } from 'react'

interface WasteDnaVisualizationProps {
  recyclingRatePercent: number   // 0–100
  categories: {
    label: string
    ratePercent: number
    color: string
  }[]
}

export function WasteDnaVisualization({
  recyclingRatePercent,
  categories,
}: WasteDnaVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrameId: number
    let t = 0

    // Szín a ráta alapján
    const helixColor = recyclingRatePercent >= 60
      ? `hsl(140, 80%, ${40 + recyclingRatePercent * 0.2}%)`
      : recyclingRatePercent >= 30
      ? `hsl(60, 80%, 50%)`
      : `hsl(0, 70%, 45%)`

    const speed = 0.01 + (recyclingRatePercent / 100) * 0.03

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      const cx = canvas!.width / 2
      const height = canvas!.height
      const amplitude = 40
      const frequency = 0.06
      const strandCount = categories.length || 3

      for (let strand = 0; strand < strandCount; strand++) {
        const phaseOffset = (strand / strandCount) * Math.PI * 2
        ctx!.beginPath()
        ctx!.strokeStyle = categories[strand]?.color ?? helixColor
        ctx!.lineWidth = 2.5
        ctx!.shadowColor = categories[strand]?.color ?? helixColor
        ctx!.shadowBlur = recyclingRatePercent > 50 ? 8 : 2

        for (let y = 0; y < height; y++) {
          const x = cx + amplitude * Math.sin(frequency * y + t + phaseOffset)
          if (y === 0) ctx!.moveTo(x, y)
          else ctx!.lineTo(x, y)
        }
        ctx!.stroke()
      }

      // Keresztkötések (base pairs)
      for (let y = 20; y < height; y += 24) {
        const xLeft = cx + amplitude * Math.sin(frequency * y + t)
        const xRight = cx + amplitude * Math.sin(frequency * y + t + Math.PI)
        const alpha = 0.3 + 0.4 * Math.abs(Math.sin(frequency * y + t))
        ctx!.beginPath()
        ctx!.strokeStyle = `${helixColor.replace('hsl', 'hsla').replace(')', `, ${alpha})`}` 
        ctx!.lineWidth = 1
        ctx!.moveTo(xLeft, y)
        ctx!.lineTo(xRight, y)
        ctx!.stroke()
      }

      t += speed
      animFrameId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animFrameId)
  }, [recyclingRatePercent, categories])

  return (
    <div className="relative rounded-2xl border border-zinc-200 bg-zinc-950 dark:border-zinc-700 overflow-hidden p-4">
      {/* Overlay szöveg */}
      <div className="absolute top-4 left-4 z-10">
        <p className="text-xs text-zinc-400 uppercase tracking-widest font-mono">Hulladék DNS</p>
        <p className="text-3xl font-bold text-white mt-1">
          {recyclingRatePercent.toFixed(0)}
          <span className="text-sm font-normal text-zinc-400 ml-1">% recycled</span>
        </p>
      </div>

      {/* Category legend */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1">
        {categories.map(cat => (
          <div key={cat.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
            <span className="text-xs text-zinc-400">{cat.label}: {cat.ratePercent.toFixed(0)}%</span>
          </div>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        width={280}
        height={220}
        className="mx-auto"
      />
    </div>
  )
}
```

### 8.2 „Water Pulse" — vízfogyasztás EKG monitor

A vízfogyasztás egy folytonos, szív-EKG-szerű jelhullámként jelenik meg. Normál fogyasztásnál a jel egyenletes és alacsony amplitúdójú (mint egy egészséges EKG). Szivárgásnál vagy rendellenes fogyasztásnál a hullám hirtelen megemelkedik és tüskéssé válik — pontosan ahogy egy szívinfarktus EKG-görbéjén a rendellenes csúcsok megjelennek.

```tsx
// components/water-pulse-monitor.tsx
'use client'

import { useEffect, useRef } from 'react'
import { LeakAnalysisResult } from '@/lib/water-leak-detector'

interface WaterPulseMonitorProps {
  leakAnalysis: LeakAnalysisResult
  currentPerCapitaLiters: number
  optimalLiters?: number
}

export function WaterPulseMonitor({
  leakAnalysis,
  currentPerCapitaLiters,
  optimalLiters = 92,
}: WaterPulseMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const mid = h / 2

    // Rendellenes-e a fogyasztás?
    const isAbnormal = leakAnalysis.status !== 'normal'
    const deviationFactor = Math.min(leakAnalysis.deviationPercent / 100, 2)

    const pulseColor =
      leakAnalysis.status === 'alert' ? '#EF4444'
      : leakAnalysis.status === 'hidden_leak' ? '#F97316'
      : leakAnalysis.status === 'warning' ? '#F59E0B'
      : '#3B82F6'

    let t = 0
    let animFrameId: number

    // Adatpont-buffer a scrolling effect-hez
    const buffer: number[] = new Array(w).fill(mid)

    function ekg(x: number, phase: number, spike: boolean): number {
      // Alap szinuszos hullám
      const base = Math.sin(x * 0.15 + phase) * 5

      // P-hullám
      const pWave = Math.exp(-Math.pow((x % 80 - 15), 2) / 20) * 8

      // QRS komplex (spiking)
      const qrsX = (x % 80) - 35
      const qrs = spike
        ? Math.exp(-Math.pow(qrsX, 2) / 3) * (40 + deviationFactor * 50) * -1
        : Math.exp(-Math.pow(qrsX, 2) / 3) * 25 * -1

      // T-hullám
      const tWave = Math.exp(-Math.pow((x % 80 - 55), 2) / 30) * 12

      return base + pWave + qrs + tWave
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h)

      // Háttér rács
      ctx!.strokeStyle = 'rgba(59,130,246,0.08)'
      ctx!.lineWidth = 1
      for (let gx = 0; gx < w; gx += 20) {
        ctx!.beginPath(); ctx!.moveTo(gx, 0); ctx!.lineTo(gx, h); ctx!.stroke()
      }
      for (let gy = 0; gy < h; gy += 20) {
        ctx!.beginPath(); ctx!.moveTo(0, gy); ctx!.lineTo(w, gy); ctx!.stroke()
      }

      // Optimum referencia vonal
      ctx!.strokeStyle = 'rgba(16,185,129,0.4)'
      ctx!.setLineDash([4, 4])
      ctx!.lineWidth = 1
      ctx!.beginPath(); ctx!.moveTo(0, mid); ctx!.lineTo(w, mid); ctx!.stroke()
      ctx!.setLineDash([])

      // Új érték generálása
      const newY = mid + ekg(t * 2, t * 0.05, isAbnormal)
      buffer.push(newY)
      buffer.shift()

      // Glowing vonal rajzolása
      ctx!.shadowColor = pulseColor
      ctx!.shadowBlur = isAbnormal ? 12 : 4
      ctx!.strokeStyle = pulseColor
      ctx!.lineWidth = 2
      ctx!.beginPath()
      buffer.forEach((y, i) => {
        if (i === 0) ctx!.moveTo(i, y)
        else ctx!.lineTo(i, y)
      })
      ctx!.stroke()
      ctx!.shadowBlur = 0

      t += 0.8
      animFrameId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animFrameId)
  }, [leakAnalysis, currentPerCapitaLiters, optimalLiters])

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
      {/* Header sáv */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            leakAnalysis.status === 'normal' ? 'bg-blue-400' : 'bg-red-400'
          }`} />
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Water Pulse</span>
        </div>
        <span className="text-xs font-mono text-zinc-400">
          {currentPerCapitaLiters.toFixed(0)} L/fő/nap
        </span>
      </div>

      <canvas ref={canvasRef} width={400} height={160} className="w-full" />

      {/* Státusz sáv */}
      <div className={`px-4 py-2 text-xs font-mono ${
        leakAnalysis.status === 'normal' ? 'text-blue-400' :
        leakAnalysis.status === 'warning' ? 'text-yellow-400' :
        'text-red-400'
      }`}>
        {leakAnalysis.status === 'normal'
          ? '● NORMAL — Fogyasztás stabil'
          : leakAnalysis.status === 'warning'
          ? '▲ WARNING — Emelkedett fogyasztás'
          : leakAnalysis.status === 'alert'
          ? '■ ALERT — Rendellenes csúcs detektálva'
          : '◆ HIDDEN LEAK — Főmérő/almérő eltérés'}
      </div>
    </div>
  )
}
```

---

## 9. Szakdolgozati kapcsolat

### 9.1 Az EU Zöld Főváros értékelési keretrendszer — hulladék és víz szempontok

A szakdolgozat (Faul Henrik, SZTE, 2020) az EGCA értékelési keretrendszer 11 indikátorát elemzi Budapest szempontjából. A hulladékgazdálkodás (5. szempont) és a vízgazdálkodás (8–9. szempont) esetén a dolgozat rögzíti:

**Hulladékgazdálkodás — EGCA 5. szempont:**
A Magyar Hulladékgazdálkodási Terv 2020–2030 (NHKT) az EU 2018/851 irányelv szerinti kötelező célok teljesítéséhez az alábbi mérföldköveket határozza meg:
- 2025-ig: a kommunális hulladék újrahasznosítási arányának elérése 55%-ra
- 2030-ig: 60%-os célérték
- 2035-ig: a lerakóra kerülő hulladék max. 10%-a a teljes termelésnek

Budapest 2022-es ~22%-os tényleges újrahasznosítási rátájával **33 százalékpontos lemaradásban** van a 2025-ös célhoz képest. A panellakások szelektív gyűjtési problémái — amelyeket a feature közvetlenül kezeli — az egyik legnagyobb tételsor ebben a lemaradásban.

Összehasonlítás vezető városokkal (EU Green Capital díjas városok adatai alapján):
| Város | Újrahasznosítási ráta | Egy főre jutó hulladék |
|-------|----------------------|----------------------|
| Ljubljana (2016 nyertes) | 68% | 449 kg/fő/év |
| Essen (2017 nyertes) | 62% | 388 kg/fő/év |
| Nijmegen (2018 nyertes) | 58% | 411 kg/fő/év |
| Bécs (kiemelkedő referencia) | 60% | 560 kg/fő/év |
| **Budapest (jelenlegi)** | **~22%** | **412 kg/fő/év** |

**Vízgazdálkodás — EGCA 8–9. szempont:**
A Fővárosi Vízművek éves jelentéseiben közölt 28%-os hálózati vízveszteség közvetlenül kapcsolódik a panelházak elavult belső hálózataihoz. A szivárgás-riasztó funkció — amely a feature egyik legfontosabb eleme — **közvetlen, mérhető hozzájárulást jelent** ehhez a mutatóhoz: ha az alkalmazás segítségével a 60 000+ magyarországi panelház 10%-a (6000 épület) átlagosan 5%-kal csökkenti a belső vízveszteséget, az évi 1,2 millió m³ vízmegtakarítást jelent — ez Budapest teljes éves ivóvíz-felhasználásának közel 0,5%-a.

### 9.2 Budapest Fővárosi Hulladékgazdálkodási Terv és FKF kapcsolat

Az FKF Nonprofit Zrt. (Fővárosi Közterület-fenntartó) Budapest összes kerületében végzi a hulladékszállítást és a szelektív gyűjtés infrastruktúráját. Az FKF hulladéknaptár integrációja (3.2 fejezet) az FKF által közzétett, kerületenként részletes adatokon alapul, amelyek a [hulladeknaptar.fkf.hu](https://hulladeknaptar.fkf.hu) oldalon ellenőrizhetők és évente frissítendők.

---

## 10. FKF integráció részletei

### 10.1 FKF hull adéknaptár — kerületi lefedettség

A hulladeknaptar.fkf.hu oldal minden Budapest kerülethez (I–XXIII.) tartalmaz utcaszintű bontású hulladékszállítási naptárt. A panellako.hu integrációhoz kerületszintű (nem utca szintű) adatokat használunk, ami az esetek 85–90%-ában pontos eredményt ad (az eltérések nagy részét az utcán belüli különböző szállítási napok okozzák, amelyek főleg a kerületek határán fordulnak elő).

### 10.2 FKF API helyzete 2025-ben

Az FKF jelenleg nem biztosít nyilvános REST API-t a naptár adatokhoz. A hulladeknaptar.fkf.hu egy dinamikus PHP/JS oldal, amelynek adatai:
1. **Közvetlen scraping** (User-Agent megadásával, robots.txt ellenőrzése után)
2. **Statikus JSON** — a legbiztonságosabb megközelítés: a `lib/fkf-district-data.ts` fájl kézzel karbantartott, kerületenként részletes adatokat tartalmaz, amelyek évente 1–2x frissítendők (általában január elején, amikor az FKF kiadja az új évi naptárt)

**Ajánlott megközelítés: hibrid statikus + scraping fallback:**
```typescript
// app/api/waste/fkf-schedule/route.ts (bővített)
export async function GET(req: NextRequest) {
  // 1. Próbálja a statikus adatokat
  const staticData = FKF_SCHEDULES[district]
  if (staticData && isDataFresh(staticData.validFrom)) {
    return NextResponse.json({ source: 'static', schedule: staticData })
  }

  // 2. Ha az adat >3 hónapos, naplózza a frissítési igényt
  console.warn(`[FKF] District ${district} schedule data is stale — manual update needed`)

  // 3. Visszaesés: régi adat küldése figyelmeztetéssel
  return NextResponse.json({
    source: 'static_stale',
    schedule: staticData,
    warning: 'Az adatok frissítésre szorulhatnak. Ellenőrizd a hulladeknaptar.fkf.hu oldalt.',
  })
}
```

### 10.3 Lomtalanítás speciális kezelése

Az FKF lomtalanítási akciók évi 2× alkalommal (tavasszal és ősszel) kerületek szerint ütemezve zajlanak. Ezek dátumait az FKF általában február/augusztus végén teszi közzé. A naptárban külön jelöléssel jelennek meg, és push-értesítés küldendő a lakóknak 3 nappal előtte.

---

## 11. End-to-end ellenőrzés és edge case-ek

### 11.1 Hulladék modul edge case-ek

| Szituáció | Elvárt viselkedés |
|-----------|------------------|
| Nincs bejelentés az adott hónapban | Dashboard „Még nincs adat" üzenet + CTA a kérdőív kitöltéséhez |
| FKF API / statikus adat nem elérhető | Naptár komponens hibaüzenettel jelenik meg, linkel a hulladeknaptar.fkf.hu-ra |
| Illegális lerakás bejelentés GPS nélkül | Engedélyezett — a `lat`/`lon` null értékű, a leírás kötelező |
| Illegális lerakás bejelentés fotó nélkül | Engedélyezett — `photo_url` null értékű |
| Ismeretlen kerületszám (pl. épület kerülete nem beállított) | Naptár nem jelenik meg, CTA a közös képviselőnek a kerület beállításához |
| Kétszer beküldött havi kérdőív (ugyanaz a felhasználó) | `UPSERT` az egyedi `(building_id, month)` konstrait alapján, frissítés |
| Összegyűjtött hulladék kg értéke 0 minden kategóriában | Érvényes bejegyzés — a részvételi arány számít, nem a mennyiség |

### 11.2 Víz modul edge case-ek

| Szituáció | Elvárt viselkedés |
|-----------|------------------|
| Nincs vízóra bejegyezve az épülethez | Dashboard üzenet: „Adj hozzá vízóra-leolvasást az Energetika modulban" |
| Csak főmérő van, almérők nincsenek | Per capita és trend kalkuláció működik; szivárgás-riasztó nem számítja a főmérő–almérő különbséget |
| `occupants` értéke 0 vagy null | Per capita nem jelenik meg (nullával osztás elkerülése), csak abszolút m³ érték látható |
| Kevesebb mint 3 havi adat | Gördülő átlag a meglévő adatokból számít, figyelmeztetés: „Legalább 3 havi adat szükséges a pontos szivárgás-detektáláshoz" |
| Szivárgás-riasztó false positive (pl. kerti öntözés nyáron) | Az admin nyugtázhatja a riasztást megjegyzéssel, ami elnyomja az újabb auto-riasztást ugyanazon hónapra |
| Negatív fogyasztás (leolvasási hiba) | Kizárva: `meter_readings.value` > 0 constraint; a leolvasási felületen validálás |

### 11.3 Általános edge case-ek

| Szituáció | Elvárt viselkedés |
|-----------|------------------|
| Felhasználó nem tagja az épületnek | RLS elvágja az összes adathozzáférést; 403-as HTTP hiba |
| Mobilon GPS engedély megtagadva | `IllegalDumpReporter` graciózusan kezeli: figyelmeztetés, de szöveges leírással bejelentés engedélyezett |
| Nagyon régi böngésző (Canvas API hiánya) | `WasteDnaVisualization` és `WaterPulseMonitor` komponensek `canvas` nélkül egyszerű szám + badge megjelenítésbe esnek vissza |
| OSM Overpass API timeout | E-hulladék gyűjtőpont térkép hibaüzenettel jelenik meg, javasolt link: waste.fkf.hu |

---

## 12. Implementációs lépések

### Sprint 1 (1–2. hét): Adatmodell és API alap

1. **Migrációs SQL** futtatása a Supabase-en (`20260521_hulladek_viz_gazdalkodas.sql`)
2. **`lib/fkf-district-data.ts`** megírása — mind a 23 kerület alapadataival (FKF naptár kézi feldolgozása)
3. **`lib/waste-co2-calc.ts`** megírása és unit tesztelése
4. **`lib/water-leak-detector.ts`** megírása és unit tesztelése (legalább 5 szimulált havi adatsor)
5. **`app/api/waste/fkf-schedule/route.ts`** megírása
6. **`app/api/waste/illegal-dump/route.ts`** megírása (Supabase Storage integráció fotóhoz)
7. **`app/api/water/consumption/route.ts`** megírása

### Sprint 2 (3–4. hét): UI komponensek

8. **`components/waste-tracker-panel.tsx`** megírása (összefoglaló + CO₂ tab)
9. **`components/waste-collection-calendar.tsx`** megírása
10. **`components/illegal-dump-reporter.tsx`** megírása (kamera + GPS integráció)
11. **`components/water-consumption-widget.tsx`** megírása (Recharts AreaChart)
12. **Fenntarthatóság oldal bővítése** — Hulladék és Víz tab hozzáadása az Energia tab mellé

### Sprint 3 (5–6. hét): Crazy Innovation + Lokalizáció + Polishing

13. **`components/waste-dna-visualization.tsx`** megírása (Canvas animáció)
14. **`components/water-pulse-monitor.tsx`** megírása (EKG Canvas animáció)
15. **i18n kulcsok hozzáadása** — `src/i18n/resources/en.ts` és `src/i18n/resources/hu.ts` egyszerre
16. **Szivárgás-riasztó cron job** — Supabase Edge Function, havi 1× lefut és `water_leak_alerts` bejegyzést hoz létre
17. **Push értesítés integráció** — FKF szállítás előtti nap emlékeztető, szivárgás-riasztó
18. **E2E tesztelés** — a 11. fejezetben felsorolt edge case-ek manuális ellenőrzése
19. **`versioning/` és `marketing/marketing_values/`** fájlok elkészítése a PR-hoz

### Fontos megjegyzések az implementációhoz

- A `meter_readings` tábla bővítése (`is_common_area`, `meter_subtype` oszlopok) **visszafelé kompatibilis** — az új oszlopok `null`-able-ok, a meglévő sorok nem változnak
- A `water_monthly_summary` nézet az `energy_consumption_monthly` materializált nézettől **független** — ne helyettesítse azt, mert eltérő aggregációs logikát alkalmaz
- A Crazy Innovation komponensek (`WasteDnaVisualization`, `WaterPulseMonitor`) **opcionálisan jeleníthetők meg** — feature flag mögé zárhatók, ha a Canvas teljesítmény aggályos mobilon
- Az FKF kerületi adatokban az I–VI. belső kerületek szállítási rendje eltér a külső kerületektől — a `lib/fkf-district-data.ts` feltöltésekor ezt figyelembe kell venni
- Az illegális lerakás fotójának feltöltése Supabase Storage-ba kerüljön (`illegal-dump-photos` bucket, **privát** hozzáférés, csak admin és a bejelentő saját fényképét láthatja)

---

*Prompt fájl vége — Feature 12: Hulladékgazdálkodás és Vízfogyasztás-nyomkövető*
