# Összefoglaló: Geoinformatikai Szakdolgozat → panellako.hu Feature Javaslatok

## A szakdolgozatról

**Cím**: A zöld város kialakításának támogatása térinformatikai elemzések segítségével Budapest példáján keresztül  
**Intézmény**: Szegedi Tudományegyetem, Természettudományi és Informatikai Kar, Természeti Földrajzi és Geoinformatikai Tanszék  
**Év**: 2020  
**Kulcsszavak**: Budapest, térinformatika, interdiszciplinaritás, élhetőség, GIS, zöld város  

### A szakdolgozat főbb fejezetei és releváns témái

| Fejezet | Téma | Relevanciaszint panellako.hu-hoz |
|---------|------|----------------------------------|
| Térinformatika | GIS rendszerek alkalmazási területei | ⭐⭐⭐ |
| Zöld város koncepció | EU Zöld Főváros kritériumrendszer (11 indikátor) | ⭐⭐⭐⭐⭐ |
| Budapest célkitűzései | Budapest 2030 városfejlesztési stratégia | ⭐⭐⭐⭐ |
| Levegőminőség | OLM mérőállomások, PM2.5/NO₂/O₃ analízis | ⭐⭐⭐⭐⭐ |
| Közlekedés környezeti hatásai | Forgalmi zajszennyezés, emissziók | ⭐⭐⭐⭐ |
| Kerékpáros közlekedés | Infrastruktúra, légszennyezés-kitettség | ⭐⭐⭐⭐ |
| Tömegközlekedés (BKK) | GTFS adatbázis, hálózatelemzés | ⭐⭐⭐⭐⭐ |
| Területhasználat | Hőszigat hatás, NDVI, zöldfelület-arány | ⭐⭐⭐⭐ |

---

## A javasolt funkciók teljes listája

Az alábbi táblázat összefoglalja az összes javasolt funkciót, azok prioritását, implementációs összetettségét, és hogy melyik prompt fájlban találhatók a részletek.

| # | Feature neve | Magyar neve | Prompt fájl | Prioritás | Összetettség | Thesis kapcsolat |
|---|-------------|-------------|-------------|-----------|--------------|-----------------|
| 01 | Air Quality Monitor Widget | Levegőminőség-figyelő Widget | `01_levegominoseg_widget.md` | 🔴 MAGAS | Közepes | Levegőminőség fejezet (OLM, PM2.5, NO₂) |
| 02 | Green Building Score Dashboard | Zöld Épület Pontszám | `02_zold_pontszam_dashboard.md` | 🔴 MAGAS | Magas | Zöld város 11 indikátora |
| 03 | Environmental Proximity Map | Közelségi Interaktív Térkép | `03_kornyezeti_kozelseegi_terkep.md` | 🟡 KÖZEPES | Magas | OSM területhasználat, BKK GTFS |
| 04 | Urban Heat Island Monitor | Hőszigat Klímakockázat Modul | `04_hosziget_klimakockazat_modul.md` | 🟡 KÖZEPES | Közepes | Területhasználat, NDVI, hőszigat |
| 05 | Community Green Actions | Közösségi Zöld Akciók Platform | `05_kozossegi_zold_akciok_platform.md` | 🟡 KÖZEPES | Közepes | Integrált szemléletmód, állampolgári tudomány |
| 06 | Building Energy & CO₂ Tracker | Épületenergetikai Nyomkövető | `06_epulet_energetika_co2_nyomkoveto.md` | 🔴 MAGAS | Közepes | Energiagazdálkodás indikátor, panelfelújítás |
| 07 | Traffic Noise Reporter | Közlekedési Zaj Bejelentő | `07_kozlekedes_zaj_bejelento.md` | 🟢 ALACSONY | Alacsony | Zajszennyezés fejezet, Budapest zajtérkép |
| 08 | Sustainable Transport Info | Fenntartható Közlekedési Infópanel | `08_fenntarthato_kozlekedes_info.md` | 🟡 KÖZEPES | Magas | BKK GTFS, kerékpáros infrastruktúra |
| 09 | Cycling Network & Air Exposure Analyzer | Kerékpáros Hálózatelemzés + Légminőség-kitettség | `09_kerekparos_halozat_utvonal_elemzo.md` | 🔴 MAGAS | Magas | Kerékpáros fejezet: PM2.5-kitettség, Antwerp 53%-os csökkentés, infrastruktúra-hiányok |
| 10 | NDVI Vegetation & Green Area Analyzer | NDVI Vegetációs Index + Zöldfelület-elemző | `10_ndvi_vegetacios_elemzo.md` | 🟡 KÖZEPES | Közepes | Területhasználat fejezet: Sentinel-2 NDVI, WHO 9 m²/fő, kerületi egyenlőtlenség |
| 11 | Budapest 2030 Strategic Indicators Dashboard | Budapest 2030 Stratégiai Indikátorok Dashboard | `11_budapest_2030_strategia_dashboard.md` | 🟡 KÖZEPES | Közepes | Budapest 2030 fejezet: 5 pillér, EU Zöld Főváros mind 11 indikátora, 5 városös radar |
| 12 | Waste & Water Management EU Indicators | Hulladékgazdálkodás + Vízfogyasztás-nyomkövető | `12_hulladek_viz_gazdalkodas_eu_indikatorok.md` | 🟡 KÖZEPES | Közepes | EU Green Capital 5. (hulladék) + 8-9. (víz) indikátor — korábban nem fedett kritériumok |

---

## Részletes feature leírások és indoklás

---

### FEATURE 01 — Levegőminőség-figyelő Widget
**Prompt fájl**: `01_levegominoseg_widget.md`  
**Méret**: ~29 600 karakter

**Mit old meg**: A panelházakban élők egy kompakt widgeten keresztül valós idejű levegőminőségi adatokat látnak az épületükhöz legközelebbi OLM mérőállomástól. PM2.5, PM10, NO₂, O₃ értékek, AQI index, egészségügyi tanácsok, küszöbértékalapú push értesítések.

**Miért érdemes implementálni**: A szakdolgozat részletesen bemutatja, hogy a Greenpeace 2019-es Blaha Lujza téri kézi mérései szerint *„a NO₂ koncentrációja többszöröse az 1,3 km-re lévő, szintén erős forgalommal jellemezhető Erzsébet téren tapasztaltaknak"* — azaz a lakóhely közelisége erősen forgalmas utcához közvetlen egészségügyi kockázatot jelent. A lakóknak joguk van erről tudni.

**Adatforrások**:
- OpenAQ API v3 (ingyenes, koordináta alapú legközelebbi állomás)
- OLM (levegominoseg.hu) — scraping vagy JSON endpoint
- 30 perces szerver-oldali cache (mint a weather widget)

**Kapcsolódó feature-ök**: 02 (pontszám egyik összetevője), 05 (közösségi zöld akciók aktiválója)

---

### FEATURE 02 — Zöld Épület Pontszám Dashboard
**Prompt fájl**: `02_zold_pontszam_dashboard.md`

**Mit old meg**: Az EU Zöld Főváros kritériumrendszeréből adaptált, épületszintű összetett környezeti pontszám (0-100), amely 6 alpont összegeként áll elő:
- Levegőminőség (25 pont) — közelgő AQI alapján
- Zöldfelület közelség (20 pont) — 500m-es parkok, OSM adatból
- Tömegközlekedés elérhetőség (20 pont) — BKK megállók 400m-en belül
- Kerékpáros infrastruktúra (15 pont) — kerékpárutak, Bubi állomás
- Zajkitettség (10 pont) — főútaktól való távolság
- Hőszigat hatás (10 pont) — beépítettség arány

**Miért érdemes implementálni**: A szakdolgozat gerincét alkotó zöld város indikátorok (11 szempont az Európa Zöld Fővárosa kritériumrendszerből) közvetlen inspirációként szolgálnak. Az összevont pontszám motiválja a lakóközösségeket a környezeti fejlesztésekre, és egyedi értékajánlatot ad a panellako.hu-nak versenytársakkal szemben.

**Gamifikáció**: Bronz/Ezüst/Arany/Platina „Zöld Épület" kitűzők — hasonlóan az EU Zöld Főváros díjhoz

---

### FEATURE 03 — Közelségi és Elérhetőségi Interaktív Térkép
**Prompt fájl**: `03_kornyezeti_kozelseegi_terkep.md`

**Mit old meg**: Interaktív térkép az épület dashboard-ján, amely megmutatja:
- Zöld területek (parkok, erdők) 1 km-en belül
- BKK megállók és vonalszámok, gyaloglási idő
- MOL Bubi állomások
- OLM levegőminőség-mérő állomások AQI szín-kóddal
- Hőszigat-övezetek szimulált overlay-el

**Miért érdemes implementálni**: A szakdolgozat az OpenStreetMap landuse/natural rétegeit és BKK GTFS adatbázisát használta Budapest zöldfelület-ellátottságának és tömegközlekedési hozzáférhetőségének elemzéséhez. Ezek az adatforrások ingyenesen hozzáférhetők (Geofabrik, BKK nyilvános GTFS), és közvetlenül beintegrálhatók a webapp-ba.

**Technológia**: react-leaflet vagy Mapbox GL JS, Overpass API (OSM lekérdezések), BKK GTFS stop_times.txt, OpenAQ API

---

### FEATURE 04 — Hőszigat és Klímakockázat Modul
**Prompt fájl**: `04_hosziget_klimakockazat_modul.md`

**Mit old meg**: A városi hőszigat-hatás (UHI) épületszintű becslése és klímakockázati értékelés:
- Becsült UHI hatás (+X°C a vidéki hőmérséklethez képest) az épület körzetére
- Hőhullám riasztás (OMSZ alapján)
- Legközelebbi hűsölőhelyek (parkok, könyvtárak, bevásárlóközpontok)
- Panelház-specifikus felújítási javaslatok (hőszigetelés, tetőzöldítés)
- Napelem potenciál becslés (épület tetőfelülete alapján)

**Miért érdemes implementálni**: A szakdolgozat részletesen tárgyalja Unger J. (2010) és Oke (1982) munkásságára hivatkozva, hogy a városközpontok hőmérsékleti többlete elérheti a 4-6°C-ot. Panelházak esetén ez különösen súlyos, mert a beton homlokzatok és az aszfalt udvarok erős hőelnyelők. A panellako.hu célközönsége (panelházi lakóközösségek) különösen érintett.

**Különlegesség**: Panel building fókusz — az EU Renovation Wave és a Magyar Plusz Otthon Program felújítási lehetőségek linkjei

---

### FEATURE 05 — Közösségi Zöld Akciók és Bejelentési Platform
**Prompt fájl**: `05_kozossegi_zold_akciok_platform.md`

**Mit old meg**: Közösségi platform a lakók zöld kezdeményezéseinek szervezéséhez és környezeti problémák bejelentéséhez:
- Zöld akciók szervezése (faültetés, szelektív gyűjtés, energiatakarékossági kihívások)
- Részvételkövetés és épületszintű zöld hatásösszesítő
- Környezeti bejelentések (illegális hulladék, kerékpárút probléma, zajszennyezés)
- CO₂ megtakarítás kalkulátor (autó vs kerékpár vs BKK)
- Gamification: zöld pontok, kitűzők

**Miért érdemes implementálni**: A szakdolgozat idézi, hogy a Kerékpárosklub civil szervezet javaslatainak köszönhetően számos kerékpárút épülhetett a fővárosban — a közösségi részvétel valódi változást hozhat. A Greenpeace önkéntes Blaha Lujza téri mérése megmutatta, hogy polgári adatgyűjtés pótolhatja a hivatalos monitoring hiányosságait.

---

### FEATURE 06 — Épületenergetikai és CO₂ Nyomkövető
**Prompt fájl**: `06_epulet_energetika_co2_nyomkoveto.md`

**Mit old meg**: Az energiafogyasztás és szénlábnyom komplex nyomkövetése és vizualizációja — a **meglévő mérőóra-leolvasási modulra** építve:
- Havi/éves energiafogyasztási trend (fűtés, HMV, villany, gáz)
- CO₂ lábnyom számítás emissziófaktorokkal (FŐTÁV: 0.127 kg CO₂/kWh, villany: 0.264 kg CO₂/kWh)
- EU energiacímke becslés (A+++-G skála)
- Felújítási javaslattevő ROI kalkulátorral (hőszigetelés, napelem, ablakcsere, hőszivattyú)
- Magyar felújítási programok linkjei (Plusz Otthon, Otthon Melege Program)

**Miért érdemes implementálni**: A szakdolgozat az energiagazdálkodást az Európa Zöld Fővárosa kritériumrendszer egyik kulcsindikátoraként tárgyalja. Magyarország 1,5 millió lakosa él panelházban — ezek az épületek az ország legenergia-hatékonytalanabb lakásállományát képviselik (2-4× több fűtési energia/m² mint modern épületek). Az EU 2030-as célkitűzések és a felújítási támogatások nagyon aktuálissá teszik ezt a modult. **FONTOS: Ez a feature közvetlenül a meglévő mérőóra-leolvasási modulra épít**, ezért implementációs előnye van.

---

### FEATURE 07 — Közlekedési Zaj és Forgalom Bejelentő
**Prompt fájl**: `07_kozlekedes_zaj_bejelento.md`

**Mit old meg**: Közösségi zajriportolás és zajnaptár:
- Lakók bejelenthetnek zajszennyezési eseményeket (közlekedési, építkezési, szórakozóhelyi)
- Időpont, súlyosság, kategória rögzítése
- Zajnaptár (a meglévő TicketHeatmap mintájára)
- Napi-heti zajsablon vizualizáció (Recharts RadarChart)
- Budapest stratégiai zajtérkép linkje és az épület zajkategóriájának megjelenítése
- Hatósági bejelentés segítő (sablonok, dokumentálás)

**Miért érdemes implementálni**: A szakdolgozat részletezi a közlekedési zaj súlyos egészségi hatásait (szív- és érrendszeri betegségek, alvásproblémák), hivatkozva az EEA „Zaj Európában 2020" jelentésre. A thesis szerzője személyesen is megtapasztalta az adatszerzési nehézségeket — az állampolgári bejelentési rendszer éppen ezt a hiányt pótolná. Az implementáció relatíve egyszerű (a meglévő ticket-rendszerre épít).

---

### FEATURE 08 — Fenntartható Közlekedési Infópanel
**Prompt fájl**: `08_fenntarthato_kozlekedes_info.md`

**Mit old meg**: Valós idejű fenntartható közlekedési információ:
- BKK következő indulások a közeli megállókból (GTFS-RT)
- MOL Bubi elérhető kerékpárok és szabad dokkolók
- CO₂ összehasonlítás: autó vs BKK vs kerékpár vs gyaloglás
- Kerékpáros útvonal légszennyezés-kitettség tanácsadó
- Közösségi fenntartható közlekedési statisztikák

**Miért érdemes implementálni**: A szakdolgozat részletesen elemzi a BKK GTFS adatbázist és annak analitikai lehetőségeit. Idézi a 2018-as reprezentatív felmérést: a felnőtt magyarok 17%-a kerékpározik munkába, 38%-uk hetente kerékpározik — ez komoly érdeklődést mutat a fenntartható közlekedés iránt. A thesis az Antwerpenben mért 53%-os PM2.5 csökkentést parkos kerékpárúton (vs forgalmas főút) adatkövető alapnak tekintheti a kerékpáros útvonal tanácsadóhoz.

---

## Implementációs prioritások és sorrend

### Azonnali megvalósítási lista (erős thesis kapcsolat + könnyű implementáció):

1. **Feature 01** (Levegőminőség Widget) — OpenAQ API ingyenes, a weather widget mintájára viszonylag gyors
2. **Feature 06** (Energetika CO₂) — a meglévő mérőóra modulra épít, kis kiegészítéssel nagy értéket ad
3. **Feature 07** (Zajbejelentő) — a meglévő ticket rendszer mintájára egyszerű

### Közepes távú fejlesztések:

4. **Feature 04** (Hőszigat) — nincs valós idejű API szükséglet, statikus adatból is működik
5. **Feature 05** (Zöld Akciók) — közösségi funkció, a meglévő meeting/vote modulhoz hasonló
6. **Feature 08** (Közlekedési infó) — BKK GTFS integráció némi munkát igényel

### Hosszú távú, stratégiai fejlesztések:

7. **Feature 02** (Zöld Pontszám) — összetett, több adatforrást aggregál
8. **Feature 03** (Interaktív Térkép) — map library integráció, de nagy wow-faktor

---

## Technológiai összefoglalás: Adatforrások

| Adatforrás | Feature-ök | Hozzáférés | Ár | Cache ajánlás |
|-----------|-----------|-----------|-----|--------------|
| **OpenAQ API v3** | 01, 02 | REST API, nincs key | Ingyenes (500 req/nap) | 30 perc |
| **levegominoseg.hu** | 01, 02 | JSON endpoint / scraping | Ingyenes | 30 perc |
| **OpenStreetMap / Overpass API** | 02, 03, 04 | REST API | Ingyenes | 24 óra |
| **Nominatim geocoding** | 01, 02, 03 | REST API | Ingyenes | Egyszer, épület létrehozásakor |
| **BKK GTFS** | 03, 08 | Letölthető ZIP | Ingyenes | Heti frissítés |
| **BKK GTFS-RT** | 08 | REST API | Ingyenes | 30 másodperc |
| **MOL Bubi API** | 03, 08 | REST API (bkk.hu) | Ingyenes | 2 perc |
| **OMSZ** | 04 | RSS / XML | Ingyenes | 1 óra |
| **Supabase Storage** | 05 | Built-in | Meglévő terv | N/A |
| **Brevo email** | 01, 05, 06 | Meglévő integráció | Meglévő terv | N/A |

---

## Technológiai összefoglalás: Szükséges Supabase séma kiegészítések

Az alábbi táblák kerülnek hozzáadásra a javasolt feature-ök implementálásakor:

```sql
-- Feature 01
air_quality_alert_prefs
air_quality_history

-- Feature 02
building_green_scores
green_score_history

-- Feature 03
building_map_cache

-- Feature 04
building_climate_risk

-- Feature 05
green_actions
green_action_participants
environmental_reports
report_attachments
green_achievements
co2_savings_log

-- Feature 06
building_energy_profile
energy_consumption_monthly (materialized view)
renovation_estimates

-- Feature 07
noise_reports
building_noise_profile

-- Feature 08
transit_stops_cache
transport_co2_log
community_transport_stats
```

---

## Kapcsolatok a feature-ök között (dependency graph)

```
Feature 01 (Levegőminőség)
    ↓ AQI adat                    ↓ PM-kitettség proxy
Feature 02 (Zöld Pontszám) ←── Feature 03 (Térkép) → Feature 08 (Közlekedés)
    ↑                                    ↑                    ↑
Feature 04 (Hőszigat) ─────────────────── ────────────────────┘
    ↑ UHI adatok
Feature 10 (NDVI) ──────────────────────────────────────────────

Feature 09 (Kerékpáros) ←── Feature 01 (AQI) + Feature 08 (Közlekedés)
    ↓ útvonal kitettség
Feature 11 (Budapest 2030) ←── 01+02+04+08+09+10+12 (aggregált city-szintű adatok)

Feature 05 (Zöld Akciók) ←── Feature 07 (Zajriporter) + Feature 12 (Hulladék)

Feature 06 (Energetika) ←── Meglévő mérőóra modul
Feature 12 (Hulladék+Víz) ←── Meglévő mérőóra modul (víz extension)
```

---

## Marketing értékajánlat

A geoinformatikai szakdolgozatból inspirált funkciók egyedi piaci pozicionálást tesznek lehetővé:

- **„Az egyetlen lakóközösségi app, amely megmutatja, milyen a levegő az épülete körül"**
- **„Zöld Épület Pontszám — minősítse lakóhelyét az EU zöld város szempontjai alapján"**
- **„Fenntartható közlekedési asszisztens a lakóközösségek számára"**
- **„Állampolgári adatgyűjtés: Önök mérnek, a városvezetés fejleszt"**
- **„Kerékpáros útvonal légminőség-kitettség elemzővel — védje az egészségét a városban"**
- **„Budapest 2030 stratégiai indikátorok: látja, hogyan fejlődik a városa"**
- **„Hulladék és víz nyomkövető — az összes EU Zöld Főváros indikátor egy helyen"**

Ezek a pozicionálási üzenetek a 2024-2025-ös EU Zöld Deal diskurzushoz és a Magyar kormányzati fenntarthatósági kommunikációhoz kapcsolhatók.

---

## Prompt fájlok listája

| Fájlnév | Feature | Karakterszám |
|---------|---------|--------------|
| `01_levegominoseg_widget.md` | Levegőminőség-figyelő Widget + Riasztás | ~29 600 ✅ |
| `02_zold_pontszam_dashboard.md` | Zöld Épület Pontszám Dashboard | ~67 600 ✅ |
| `03_kornyezeti_kozelseegi_terkep.md` | Közelségi Interaktív Térkép | ~62 500 ✅ |
| `04_hosziget_klimakockazat_modul.md` | Hőszigat és Klímakockázat Modul | ~60 500 ✅ |
| `05_kozossegi_zold_akciok_platform.md` | Közösségi Zöld Akciók Platform | ~95 100 ✅ |
| `06_epulet_energetika_co2_nyomkoveto.md` | Épületenergetikai CO₂ Nyomkövető | ~69 800 ✅ |
| `07_kozlekedes_zaj_bejelento.md` | Közlekedési Zaj Bejelentő | ~83 700 ✅ |
| `08_fenntarthato_kozlekedes_info.md` | Fenntartható Közlekedési Infópanel | ~88 700 ✅ |
| `09_kerekparos_halozat_utvonal_elemzo.md` | Kerékpáros Hálózatelemzés + Légminőség | ~72 900 ✅ |
| `10_ndvi_vegetacios_elemzo.md` | NDVI Vegetációs Index + Zöldfelület | ~77 100 ✅ |
| `11_budapest_2030_strategia_dashboard.md` | Budapest 2030 Stratégiai Dashboard | ~86 700 ✅ |
| `12_hulladek_viz_gazdalkodas_eu_indikatorok.md` | Hulladék + Víz EU Indikátorok | ~80 700 ✅ |
| **`OSSZEFOGLALO.md`** | **Ez a fájl — összegzés és útmutató** | — |

---

### EU Zöld Főváros 11 indikátor lefedettsége (2026-05-22 után)

| # | EU Green Capital indikátor | Fedett? | Prompt(ok) |
|---|--------------------------|---------|------------|
| 1 | Helyi közlekedés | ✅ | 08, 09 |
| 2 | Zöld városi területek + természet | ✅ | 03, 10 |
| 3 | Helyi levegőminőség | ✅ | 01, 09 |
| 4 | Zajszennyezés | ✅ | 07 |
| 5 | Hulladékgazdálkodás | ✅ | 12 |
| 6 | Vízfogyasztás | ✅ | 12 |
| 7 | Szennyvízkezelés | ✅ | 12 |
| 8 | Ökoinovációs foglalkoztatás | ✅ | 11 |
| 9 | CO₂ kibocsátás | ✅ | 06, 09 |
| 10 | Energiagazdálkodás | ✅ | 06 |
| 11 | Irányítás és eco-menedzsment | ✅ | 05, 11 |

**Mind a 11 EU Zöld Főváros indikátor le van fedve prompt-szinten.**

---

*Generálva: panellako.hu, a geoinformatikai szakdolgozat (SZTE 2020) alapján*  
*Frissítve: 2026-05-22 — 09–12 promptok hozzáadva (cycling, NDVI, Budapest 2030, hulladék+víz)*
