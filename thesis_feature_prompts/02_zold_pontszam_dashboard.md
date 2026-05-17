# FEATURE PROMPT 02 — Zöld Épület Pontszám Dashboard (Green Building Score)

## Áttekintés és motiváció (a szakdolgozat alapján)

### A szakdolgozat és a panellako.hu kapcsolata

A panellako.hu webapp elsősorban lakóközösségek digitális igazgatási platformja. A platform értékajánlatát azonban jelentősen bővíti, ha a lakóközösség nemcsak az épület belső ügyeit (közgyűlések, dokumentumok, pénzügyek) kezeli, hanem tudatosan nyomon követi az épület és lakókörnyezete **környezeti minőségét** is. Ez az igény közvetlenül az SZTE Természettudományi és Informatikai Karán megvédett geoinformatikai szakdolgozatból fakad, amely Budapest zöldvárosi fejlesztésének GIS-alapú támogatásával foglalkozik.

A szakdolgozat fő tézise: Budapest különböző városrészeiben drámai különbségek mérhetők a levegőminőség, a zöldfelület-ellátottság, a hőszigat-hatás erőssége és a közlekedési infrastruktúra hozzáférhetősége tekintetében. Ezek az indikátorok nem egyenértékű súllyal érintik a lakóközösségeket — egy forgalmas körút melletti panelház teljesen más kihívásokkal néz szembe, mint egy kertvárosi társasház. A **Zöld Épület Pontszám** (Green Building Score) funkció célja: ezt a komplex, többdimenziós környezeti valóságot egyetlen, könnyen érthető, 0–100 pontos összesített pontszámmá alakítani, amelyet az épület dashboardján azonnal láthat mindenki.

### A szakdolgozat releváns fejezetei és megállapításai

#### 1. Levegőminőség és az OLM mérőhálózat

A szakdolgozat részletesen bemutatja az Országos Légszennyezettségi Mérőhálózat (OLM) 12 budapesti automata mérőállomásának adatait. A mért légszennyezők — PM2.5, PM10, NO₂, O₃, SO₂, CO — térbeli megoszlása erősen egyenetlen. A Blaha Lujza téri mérőállomás körzetében mért NO₂ értékek az Erzsébet téri értékek többszörösét is elérhetik, mindössze 1,3 km-es légvonalbeli távolságon belül. Ez a térbeli variancia közvetlenül meghatározza az épületszintű levegőminőségi alpontszám számítási módszerét: nem elegendő csak a városrész általános AQI-ját figyelembe venni, hanem a **legközelebbi mérőállomás tényleges aktuális adatait** kell használni, súlyozva a távolsággal.

A szakdolgozat az AQI-számítás EU-konform módszerét írja le: a szennyezőkomponensek koncentrációit az EU 2008/50/EK irányelv határértékeivel kell arányosítani. PM2.5 esetében az éves határérték 25 µg/m³, PM10-nél 40 µg/m³, NO₂-nél 40 µg/m³ (éves), O₃-nál 120 µg/m³ (napi 8 órás maximum).

#### 2. Zöldfelületek, NDVI és vegetációs index

A szakdolgozat a Normalized Difference Vegetation Index (NDVI) fogalmát és Budapest kerületeire vonatkozó számításait tartalmazza. Az NDVI értéke -1 és +1 közé esik: erdős, dús növényzetű területeken 0,6–0,9 közötti, beépített belvárosban 0,1–0,2 körüli. A vizsgálat megmutatja, hogy a belső kerületek (V., VI., VII., VIII.) NDVI értéke szignifikánsan alacsonyabb, mint a külső kerületeké (XI., XII., XVI., XVII.), ami korrelál az egészségügyi mutatókkal és a lakók hőterheléssel való elégedettségével.

A 500 méteres gyalogos elérhetőségi zóna (walking catchment area) kulcsfontosságú: az Egészségügyi Világszervezet (WHO) ajánlása szerint minden lakónak 300 méteres körzeten belül kell rendelkezni közparkhoz való hozzáféréshez. A szakdolgozat megállapítja, hogy a budapesti panelházak közel 40%-a nem felel meg ennek a kritériumnak, és ez az épület Zöld Pontszámának zöldfelület-alpontszámában közvetlenül tükröződik.

#### 3. Tömegközlekedés és BKK GTFS adatok

A szakdolgozat a BKK (Budapesti Közlekedési Központ) GTFS (General Transit Feed Specification) adatbázisát elemzi, különös tekintettel a megállók sűrűségére, az átszállási lehetőségekre és a járatfrekvenciára. A vizsgálat szerint a belső kerületek metró-, villamos- és buszhálózati ellátottsága az 1 km-es körzetben átlagosan 3,7-szer magasabb, mint a külső kerületeké, ami döntően befolyásolja az autóhasználati szükségletet és közvetve a helyileg keletkező közlekedési emissziót is.

A kerékpáros infrastruktúra tekintetében a szakdolgozat kiemeli a MOL Bubi önkényes használatú kerékpárkölcsönzési rendszer szerepét: a Bubi-dokkokhoz való közelség erősen korrelál a kerékpározási hajlandósággal, és egy épület Bubi-stációhoz való közelsége önmagában is erős indikátora a fenntartható közlekedési hozzáférhetőségnek.

#### 4. Hőszigat-hatás és beépítettség

A szakdolgozat a városi hőszigat-hatást (Urban Heat Island, UHI) a beépítettségi mutatóval és az átjáró felszínek arányával (impervious surface percentage) hozza összefüggésbe. A belváros sűrűn beépített negyedeiben a hőmérséklet 3–5°C-kal magasabb lehet, mint a zöld övezetekben, ami nyáron komfort- és egészségügyi kockázatot jelent, télen pedig fűtési megtakarítást, de összességében a nyári hőveszteség dominál. A szakdolgozat a Landsat műholdképekből számított LST (Land Surface Temperature) adatokkal igazolja, hogy a magas beépítettségű területek nemcsak melegebbek, hanem a hőstressz idején veszélyesebbek is az idősebb és krónikus beteg lakók számára.

#### 5. Zajszennyezés és a stratégiai zajtérkép

A szakdolgozat hivatkozik Budapest stratégiai zajtérképére, amelyet az EU 2002/49/EK „Környezeti zajról szóló" irányelve kötelezővé tesz. A zajtérkép a főutak, vasútvonalak és repülőtér körüli Lden (nappali-esti-éjszakai egyenértékű zajszint) és Lnight értékeket mutatja, 5 dB-es sávokban. A zajkategória ismerete épületnél és annak közvetlen utcai környezetében az egyik legegyszerűbben lekérhető, mégis közvetlen egészségügyi hatású mutató — a WHO ajánlása szerint a 40 dB Lnight feletti tartós éjszakai zajexpozíció alvászavarhoz és kardiovaszkuláris betegségekhez vezet.

---

## A fejlesztendő feature teljes műszaki specifikációja

### Feature neve: **Zöld Épület Pontszám Dashboard**
### Rövid neve kódban: `BuildingGreenScore` / `green-score`
### Helye az alkalmazásban: Épület dashboard főoldal, hero card, önálló aloldal `/w/:workspaceId/green-score`
### Prioritás: MAGAS (differenciáló feature, thesis-alapú, marketingérték)
### Kapcsolódó feature-ök: Feature 01 (levegőminőség widget), Feature 08 (tömegközlekedés panel)

---

## 1. Funkcionális követelmények

### 1.1 Az összesített Zöld Pontszám (0–100)

Az épület egyetlen, jól érthető összesített **Zöld Pontszámot** kap, amely 6 alpontszám súlyozott összegéből áll:

| # | Alpontszám neve | Max pont | Súly | Adatforrás |
|---|-----------------|----------|------|------------|
| 1 | Levegőminőség | 25 | 25% | OpenAQ / OLM hálózat |
| 2 | Zöldfelület közelség | 20 | 20% | Overpass API (OSM) + NDVI koncepció |
| 3 | Tömegközlekedés elérhetőség | 20 | 20% | BKK GTFS / Overpass API |
| 4 | Kerékpáros infrastruktúra | 15 | 15% | Overpass API (OSM) |
| 5 | Zajszennyezés | 10 | 10% | Közúti távolság becslés + OSM |
| 6 | Hőszigat hatás | 10 | 10% | OSM beépítettség + NDVI proxy |
| | **ÖSSZESEN** | **100** | **100%** | |

### 1.2 Pontszám kategóriák és vizuális jelzések

| Összesített pontszám | Kategória | Szín kód | Badge szín | Magyar leírás |
|----------------------|-----------|-----------|------------|---------------|
| 85–100 | Kiváló | `#16a34a` (green-600) | Arany | Kiváló zöld épület |
| 70–84 | Jó | `#65a30d` (lime-600) | Ezüst | Jó zöld teljesítmény |
| 55–69 | Átlagos | `#ca8a04` (yellow-600) | Bronz | Átlagos szint |
| 40–54 | Gyenge | `#ea580c` (orange-600) | — | Fejlesztendő |
| 0–39 | Rossz | `#dc2626` (red-600) | — | Sürgős fejlesztés szükséges |

### 1.3 Gamifikáció: Zöld Épület Jelvények (Badges)

Az épület háromféle jelvényt szerezhet:
- **🥉 Bronz Zöld Épület** — összesített pontszám ≥ 55
- **🥈 Ezüst Zöld Épület** — összesített pontszám ≥ 70
- **🥇 Arany Zöld Épület** — összesített pontszám ≥ 85

A jelvény megjelenítése:
- Az épület dashboard fejlécén (BuildingHeader komponens), a névfelirat mellett
- A panellako.hu nyilvános épület-adatlapon (ha a lakóközösség engedélyezi a nyilvánossá tételt)
- Megosztható egyedi URL-lel, közösségi médiára szánt kép generálással (OG image)

### 1.4 Városátlag összehasonlítás

Minden épület pontszáma összehasonlításra kerül a Budapest-i panellakó típusú épületek átlagpontszámával (kerületre lebontva is). Az összehasonlítás az összesített Supabase adatokból dinamikusan számítódik. Megjelenítés: „Épületünk X ponttal a kerületi átlag felett/alatt van."

---

## 2. Pontozási algoritmus — részletes képletek

### 2.1 Levegőminőség alpontszám (max 25 pont)

**Adatforrás**: OpenAQ API v3 (`https://api.openaq.io/v3/`) — legközelebbi mérőállomás, PM2.5, PM10, NO₂, O₃ aktuális mérés.

**Algoritmus**:

```
EU_LIMITS = {
  pm25: 25,    // µg/m³ — EU éves határérték
  pm10: 50,    // µg/m³ — EU 24 órás határérték
  no2:  200,   // µg/m³ — EU 1 órás határérték (riasztási küszöb)
  o3:   120,   // µg/m³ — EU 8 óra csúcsérték
}

// Minden komponens "teljesítési aránya" (1.0 = határértéken, >1.0 = határérték felett)
ratio_pm25 = aktuális_pm25 / EU_LIMITS.pm25
ratio_pm10 = aktuális_pm10 / EU_LIMITS.pm10
ratio_no2  = aktuális_no2  / EU_LIMITS.no2
ratio_o3   = aktuális_o3   / EU_LIMITS.o3

// Súlyozott átlag (PM2.5 egészséghatása a legnagyobb)
composite_ratio = (
  ratio_pm25 * 0.40 +
  ratio_pm10 * 0.25 +
  ratio_no2  * 0.20 +
  ratio_o3   * 0.15
)

// Pontszám: 0 ráta → 25 pont, ≥1.5 ráta → 0 pont, lineáris közte
air_score = MAX(0, 25 * (1 - composite_ratio / 1.5))

// Távolság-korrekció: ha a legközelebbi állomás >5 km távolságra van,
// a pontszám megbízhatósága csökken (jelölés: "becsült" jel a UI-ban)
if (station_distance_km > 5) {
  air_score = air_score * 0.9  // 10% bizonytalansági levonás
  reliability = "becsült"
} else {
  reliability = "mért"
}
```

**Frissítési ciklus**: Óránként, Supabase Edge Function via cron.

### 2.2 Zöldfelület közelség alpontszám (max 20 pont)

**Adatforrás**: OpenStreetMap Overpass API — parkok, zöld területek, játszóterek, közkertek 500 m sugarú körben.

**OSM query**:
```overpass
[out:json][timeout:25];
(
  node["leisure"="park"](around:500,{lat},{lon});
  way["leisure"="park"](around:500,{lat},{lon});
  relation["leisure"="park"](around:500,{lat},{lon});
  node["leisure"="garden"](around:500,{lat},{lon});
  way["landuse"="grass"](around:500,{lat},{lon});
  way["landuse"="forest"](around:500,{lat},{lon});
  node["leisure"="playground"](around:500,{lat},{lon});
);
out body;>;out skel qt;
```

**Algoritmus**:
```
// 1. Legközelebbi park távolsága (d1)
d1_score = MAX(0, 10 * (1 - nearest_park_m / 500))
// Pl. 0m → 10 pont, 250m → 5 pont, 500m → 0 pont

// 2. Zöldterületek összesített kiterjedése 500m-es körben (area_m2)
// OSM polygon területek összege
area_score = MIN(10, 10 * (total_green_area_m2 / 50000))
// 50 000 m² (5 ha) = teljes 10 pont; kisebb arányosan

// Összesített zöldfelület alpontszám
green_score = d1_score + area_score

// NDVI proxy megjegyzés: valódi NDVI műholdkép nincs real-time,
// de a zöld területek OSM-ből számított területaránya jó NDVI-proxy.
// Jövőbeli fejlesztés: Sentinel-2 NDVI API integrálása.
```

**Frissítési ciklus**: Naponta egyszer (OSM adatok ritkán változnak).

### 2.3 Tömegközlekedés elérhetőség alpontszám (max 20 pont)

**Adatforrás**: Overpass API (OSM tömegközlekedési megállók), kiegészítve BKK nyílt GTFS adatokkal a járatfrekvenciához.

**Algoritmus**:
```
// 1. Megállók száma 400m-es körben
stops_400m = count_of_transit_stops_within_400m(lat, lon)
stops_score = MIN(8, stops_400m * 1.5)
// 0 megálló → 0 pont, 5 megálló → 7.5 pont, ≥6 megálló → 8 pont

// 2. Vonaltípus prémium (metró/villamos jobban pontoz, mint busz)
line_types = distinct_line_types_within_400m(lat, lon)
// "metro" → +4 pont, "tram" → +3 pont, "bus" → +2 pont, "trolleybus" → +2 pont
type_score = MIN(8, sum_of_type_premiums)

// 3. Sűrűség prémium: ha ≥3 különböző vonal érintkezik 400m-en belül
if (distinct_lines_count >= 3) density_bonus = 4 else density_bonus = 0

transit_score = MIN(20, stops_score + type_score + density_bonus)
```

**GTFS járatfrekvencia** (opcionális, v2 fejlesztés): BKK GTFS feed letöltése és Supabase-ben indexelése — csúcsidei (7:00–9:00, 16:00–18:00) átlagos járattávolságok percben.

### 2.4 Kerékpáros infrastruktúra alpontszám (max 15 pont)

**Adatforrás**: Overpass API — kerékpárutak és MOL Bubi állomások.

**Algoritmus**:
```
// 1. Kerékpárút hossza 300m-es körben (méterben)
bike_lane_m = sum_of_cycleway_lengths_within_300m(lat, lon)
// OSM highway=cycleway + bicycle=designated utak
lane_score = MIN(8, bike_lane_m / 100)
// 0m → 0 pont, 800m+ → 8 pont

// 2. MOL Bubi állomás közelség
nearest_bubi_m = nearest_bubi_station_distance_m(lat, lon)
if (nearest_bubi_m <= 200) bubi_score = 7
elif (nearest_bubi_m <= 350) bubi_score = 4
elif (nearest_bubi_m <= 500) bubi_score = 2
else bubi_score = 0

bike_score = MIN(15, lane_score + bubi_score)
```

**Bubi állomások lekérése**: A MOL Bubi API nyilvános JSON feed-je (`https://opendata.bkk.hu/` vagy GBFS-kompatibilis feed). Alternatív: OSM `amenity=bicycle_rental` + `network=MOL Bubi` tag.

### 2.5 Zajszennyezés alpontszám (max 10 pont)

**Adatforrás**: OSM közúti adatok (road classification, távolság), Budapest stratégiai zajtérképe (statikus referencia adat).

**Algoritmus**:
```
// 1. Legközelebbi főút (trunk, primary, secondary) távolsága
nearest_major_road_m = nearest_road_distance_m(lat, lon, ["trunk","primary","secondary"])

if (nearest_major_road_m >= 200) road_score = 5
elif (nearest_major_road_m >= 100) road_score = 3
elif (nearest_major_road_m >= 50)  road_score = 1
else road_score = 0

// 2. Zajkategória a stratégiai zajtérképből (statikus lookup tábla)
// Budapest zajtérképe 2017-es adatok alapján, 250m-es rácshálón
// Supabase-ben noise_map_grid táblaként tárolva (egyszer feltöltve)
noise_category = lookup_noise_grid(lat, lon)
// Lden értékek: <45 dB → 5 pont, 45-55 dB → 3 pont, 55-65 dB → 1 pont, >65 dB → 0 pont
if (noise_category == "<45dB") noise_map_score = 5
elif (noise_category == "45-55dB") noise_map_score = 3
elif (noise_category == "55-65dB") noise_map_score = 1
else noise_map_score = 0

noise_score = road_score + noise_map_score
```

**Megjegyzés az implementálandó fejlesztő számára**: A stratégiai zajtérkép statikus adatai egyszer importálandók egy Supabase migrációban. A `noise_map_grid` tábla körülbelül 5000–10 000 sort tartalmaz Budapest területére fedőhálón. Ezek az adatok a Budapest Főváros Önkormányzatának nyílt adatportálján elérhetők GeoJSON és WFS formátumban.

### 2.6 Hőszigat hatás alpontszám (max 10 pont)

**Adatforrás**: OSM épület adatok (building footprint, impervious surface proxy), NDVI proxy.

**Algoritmus**:
```
// Az 500m-es körön belüli beépített terület aránya
// OSM landuse=residential + building=* polygon-ok összterülete / teljes körterület
total_circle_area_m2 = PI * 500^2 = 785398 m²
built_up_area_m2 = sum_of_building_footprints_within_500m(lat, lon)
built_ratio = built_up_area_m2 / total_circle_area_m2  // 0.0–1.0

// Zöldfelület arány (a zöld pontból újrafelhasználva)
green_ratio = total_green_area_m2 / total_circle_area_m2

// Hőszigat pontszám: alacsony beépítettség + magas zöldfelület = jobb
// Optimális: built_ratio < 0.3, green_ratio > 0.2
heat_island_score = MAX(0, 10 * (
  (1 - MIN(1, built_ratio / 0.6)) * 0.6 +
  MIN(1, green_ratio / 0.25) * 0.4
))
// built_ratio = 0.0, green_ratio = 0.25 → 10 pont
// built_ratio = 0.6, green_ratio = 0.0  →  0 pont
```

---

## 3. Adatbázis séma (Supabase PostgreSQL)

### 3.1 Adatbázis migrációs SQL

```sql
-- Migration: 20260517_building_green_scores.sql

-- Fő scoring tábla: épületenkénti aktuális pontszám
CREATE TABLE IF NOT EXISTS public.building_green_scores (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id             UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  workspace_id            UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Összesített pontszám (0–100)
  total_score             NUMERIC(5,2) NOT NULL CHECK (total_score BETWEEN 0 AND 100),

  -- Alpontszámok (egyedi max értékek szerint)
  air_quality_score       NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (air_quality_score BETWEEN 0 AND 25),
  green_space_score       NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (green_space_score BETWEEN 0 AND 20),
  transit_score           NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (transit_score BETWEEN 0 AND 20),
  cycling_score           NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (cycling_score BETWEEN 0 AND 15),
  noise_score             NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (noise_score BETWEEN 0 AND 10),
  heat_island_score       NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (heat_island_score BETWEEN 0 AND 10),

  -- Adatforrás metaadatok
  air_station_id          TEXT,                     -- OpenAQ station ID
  air_station_distance_km NUMERIC(6,2),             -- km
  air_data_reliability    TEXT DEFAULT 'mért',      -- 'mért' | 'becsült'
  nearest_park_name       TEXT,
  nearest_park_distance_m INTEGER,
  nearest_bubi_station    TEXT,
  nearest_bubi_distance_m INTEGER,
  transit_stops_count     INTEGER,
  bike_lane_length_m      INTEGER,
  built_up_ratio          NUMERIC(4,3),             -- 0.000–1.000
  green_ratio             NUMERIC(4,3),             -- 0.000–1.000

  -- Gamifikáció
  badge_level             TEXT CHECK (badge_level IN ('none', 'bronze', 'silver', 'gold')),

  -- Időbélyeg
  computed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until             TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),

  CONSTRAINT uq_building_green_score UNIQUE (building_id)
);

-- Pontszám-előzmény (trend követés)
CREATE TABLE IF NOT EXISTS public.building_score_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id     UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  total_score     NUMERIC(5,2) NOT NULL,
  air_quality_score   NUMERIC(5,2),
  green_space_score   NUMERIC(5,2),
  transit_score       NUMERIC(5,2),
  cycling_score       NUMERIC(5,2),
  noise_score         NUMERIC(5,2),
  heat_island_score   NUMERIC(5,2),
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Napi particionálás indexek a trend lekérdezéshez
CREATE INDEX IF NOT EXISTS idx_score_history_building_date
  ON public.building_score_history (building_id, recorded_at DESC);

-- Zajtérkép rács (statikusan importált, Budapest)
CREATE TABLE IF NOT EXISTS public.noise_map_grid (
  id          SERIAL PRIMARY KEY,
  lat         NUMERIC(9,6) NOT NULL,
  lon         NUMERIC(9,6) NOT NULL,
  lden_class  TEXT NOT NULL,   -- '<45dB', '45-55dB', '55-65dB', '>65dB'
  source      TEXT DEFAULT 'Budapest Stratégiai Zajtérkép 2017'
);

CREATE INDEX IF NOT EXISTS idx_noise_map_grid_coords
  ON public.noise_map_grid USING GIST (
    ST_SetSRID(ST_MakePoint(lon, lat), 4326)
  );

-- RLS szabályok
ALTER TABLE public.building_green_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_score_history ENABLE ROW LEVEL SECURITY;

-- Tagok olvashatják az épületük pontszámát
CREATE POLICY "building_members_read_green_score"
  ON public.building_green_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.building_memberships bm
      WHERE bm.building_id = building_green_scores.building_id
        AND bm.user_id = auth.uid()
    )
  );

-- Csak a szerver (service_role) írhat
CREATE POLICY "service_role_write_green_score"
  ON public.building_green_scores FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "building_members_read_score_history"
  ON public.building_score_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.building_memberships bm
      WHERE bm.building_id = building_score_history.building_id
        AND bm.user_id = auth.uid()
    )
  );
```

### 3.2 TypeScript interface-ek

```typescript
// lib/types/green-score.ts

export interface GreenScoreSubScores {
  airQuality: number;     // max 25
  greenSpace: number;     // max 20
  transit: number;        // max 20
  cycling: number;        // max 15
  noise: number;          // max 10
  heatIsland: number;     // max 10
}

export type BadgeLevel = 'none' | 'bronze' | 'silver' | 'gold';

export interface GreenScoreMetadata {
  airStationId: string | null;
  airStationName: string | null;
  airStationDistanceKm: number | null;
  airDataReliability: 'mért' | 'becsült';
  nearestParkName: string | null;
  nearestParkDistanceM: number | null;
  nearestBubiStation: string | null;
  nearestBubiDistanceM: number | null;
  transitStopsCount: number;
  bikeLaneLengthM: number;
  builtUpRatio: number;
  greenRatio: number;
}

export interface BuildingGreenScore {
  id: string;
  buildingId: string;
  workspaceId: string;
  totalScore: number;
  subScores: GreenScoreSubScores;
  badgeLevel: BadgeLevel;
  metadata: GreenScoreMetadata;
  computedAt: string;
  validUntil: string;
}

export interface GreenScoreHistoryEntry {
  recordedAt: string;
  totalScore: number;
  subScores: Partial<GreenScoreSubScores>;
}

export interface GreenScoreCityComparison {
  buildingScore: number;
  districtAverage: number;
  cityAverage: number;
  districtRank: number;         // percentilis 0–100
  districtName: string;         // pl. "XI. kerület"
}

export interface AdminActionSuggestion {
  category: keyof GreenScoreSubScores;
  currentScore: number;
  maxScore: number;
  priority: 'high' | 'medium' | 'low';
  titleHu: string;
  descriptionHu: string;
  estimatedPointGain: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  estimatedCostHuf: string;     // pl. "0 Ft", "500 000–2 000 000 Ft"
}
```

---

## 4. API végpontok (Next.js 14 App Router)

### 4.1 Fő scoring API

**Fájl**: `app/api/building-score/[buildingId]/route.ts`

```typescript
// app/api/building-score/[buildingId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { computeGreenScore } from '@/lib/green-score/compute';
import { BuildingGreenScore } from '@/lib/types/green-score';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteParams {
  params: { buildingId: string };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const supabase = createServiceClient();
  const { buildingId } = params;

  // 1. Jogosultság ellenőrzés
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Épület lekérése koordinátákkal
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id, name, lat, lon, address, workspace_id')
    .eq('id', buildingId)
    .single();

  if (buildingError || !building) {
    return NextResponse.json({ error: 'Building not found' }, { status: 404 });
  }

  // 3. Tagság ellenőrzés
  const { data: membership } = await supabase
    .from('building_memberships')
    .select('id')
    .eq('building_id', buildingId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 4. Cacheit pontszám lekérése
  const { data: cached } = await supabase
    .from('building_green_scores')
    .select('*')
    .eq('building_id', buildingId)
    .maybeSingle();

  const now = new Date();
  if (cached && new Date(cached.valid_until) > now) {
    return NextResponse.json(mapDbToScore(cached));
  }

  // 5. Friss pontszám kiszámítása
  try {
    const freshScore = await computeGreenScore({
      buildingId,
      lat: building.lat,
      lon: building.lon,
      workspaceId: building.workspace_id,
    });

    // 6. Mentés Supabase-be (upsert)
    await supabase.from('building_green_scores').upsert(
      {
        building_id: buildingId,
        workspace_id: building.workspace_id,
        total_score: freshScore.totalScore,
        air_quality_score: freshScore.subScores.airQuality,
        green_space_score: freshScore.subScores.greenSpace,
        transit_score: freshScore.subScores.transit,
        cycling_score: freshScore.subScores.cycling,
        noise_score: freshScore.subScores.noise,
        heat_island_score: freshScore.subScores.heatIsland,
        badge_level: freshScore.badgeLevel,
        air_station_id: freshScore.metadata.airStationId,
        air_station_distance_km: freshScore.metadata.airStationDistanceKm,
        air_data_reliability: freshScore.metadata.airDataReliability,
        nearest_park_name: freshScore.metadata.nearestParkName,
        nearest_park_distance_m: freshScore.metadata.nearestParkDistanceM,
        nearest_bubi_station: freshScore.metadata.nearestBubiStation,
        nearest_bubi_distance_m: freshScore.metadata.nearestBubiDistanceM,
        transit_stops_count: freshScore.metadata.transitStopsCount,
        bike_lane_length_m: freshScore.metadata.bikeLaneLengthM,
        built_up_ratio: freshScore.metadata.builtUpRatio,
        green_ratio: freshScore.metadata.greenRatio,
        computed_at: now.toISOString(),
        valid_until: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'building_id' }
    );

    // 7. Előzmény mentése
    await supabase.from('building_score_history').insert({
      building_id: buildingId,
      workspace_id: building.workspace_id,
      total_score: freshScore.totalScore,
      air_quality_score: freshScore.subScores.airQuality,
      green_space_score: freshScore.subScores.greenSpace,
      transit_score: freshScore.subScores.transit,
      cycling_score: freshScore.subScores.cycling,
      noise_score: freshScore.subScores.noise,
      heat_island_score: freshScore.subScores.heatIsland,
    });

    return NextResponse.json(freshScore);
  } catch (err) {
    console.error('[green-score] compute error:', err);
    return NextResponse.json(
      { error: 'Pontszám számítása sikertelen', detail: String(err) },
      { status: 500 }
    );
  }
}

function mapDbToScore(row: Record<string, unknown>): BuildingGreenScore {
  return {
    id: row.id as string,
    buildingId: row.building_id as string,
    workspaceId: row.workspace_id as string,
    totalScore: Number(row.total_score),
    subScores: {
      airQuality: Number(row.air_quality_score),
      greenSpace: Number(row.green_space_score),
      transit: Number(row.transit_score),
      cycling: Number(row.cycling_score),
      noise: Number(row.noise_score),
      heatIsland: Number(row.heat_island_score),
    },
    badgeLevel: (row.badge_level as string) as BuildingGreenScore['badgeLevel'],
    metadata: {
      airStationId: row.air_station_id as string | null,
      airStationName: null,
      airStationDistanceKm: Number(row.air_station_distance_km) || null,
      airDataReliability: (row.air_data_reliability as 'mért' | 'becsült') ?? 'becsült',
      nearestParkName: row.nearest_park_name as string | null,
      nearestParkDistanceM: Number(row.nearest_park_distance_m) || null,
      nearestBubiStation: row.nearest_bubi_station as string | null,
      nearestBubiDistanceM: Number(row.nearest_bubi_distance_m) || null,
      transitStopsCount: Number(row.transit_stops_count) || 0,
      bikeLaneLengthM: Number(row.bike_lane_length_m) || 0,
      builtUpRatio: Number(row.built_up_ratio) || 0,
      greenRatio: Number(row.green_ratio) || 0,
    },
    computedAt: row.computed_at as string,
    validUntil: row.valid_until as string,
  };
}
```

### 4.2 Pontszám-előzmény API

**Fájl**: `app/api/building-score/[buildingId]/history/route.ts`

```typescript
// Lekéri az elmúlt 30 nap pontszám előzményét (trendgráfhoz)
export async function GET(req: NextRequest, { params }: RouteParams) {
  const supabase = createServiceClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('building_score_history')
    .select('total_score, air_quality_score, green_space_score, transit_score, cycling_score, noise_score, heat_island_score, recorded_at')
    .eq('building_id', params.buildingId)
    .gte('recorded_at', thirtyDaysAgo)
    .order('recorded_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ history: data });
}
```

### 4.3 Compute service (lib/green-score/compute.ts)

```typescript
// lib/green-score/compute.ts

import { fetchAirQualityScore } from './sub-scores/air-quality';
import { fetchGreenSpaceScore } from './sub-scores/green-space';
import { fetchTransitScore } from './sub-scores/transit';
import { fetchCyclingScore } from './sub-scores/cycling';
import { fetchNoiseScore } from './sub-scores/noise';
import { fetchHeatIslandScore } from './sub-scores/heat-island';
import { BuildingGreenScore, BadgeLevel } from '@/lib/types/green-score';

interface ComputeParams {
  buildingId: string;
  lat: number;
  lon: number;
  workspaceId: string;
}

export async function computeGreenScore(params: ComputeParams): Promise<BuildingGreenScore> {
  const { buildingId, lat, lon, workspaceId } = params;

  // Párhuzamos API hívások (Promise.allSettled → részleges hiba esetén sem áll meg)
  const [airResult, greenResult, transitResult, cyclingResult, noiseResult, heatResult] =
    await Promise.allSettled([
      fetchAirQualityScore(lat, lon),
      fetchGreenSpaceScore(lat, lon),
      fetchTransitScore(lat, lon),
      fetchCyclingScore(lat, lon),
      fetchNoiseScore(lat, lon),
      fetchHeatIslandScore(lat, lon),
    ]);

  const air      = airResult.status === 'fulfilled'     ? airResult.value     : { score: 0, meta: {} };
  const green    = greenResult.status === 'fulfilled'   ? greenResult.value   : { score: 0, meta: {} };
  const transit  = transitResult.status === 'fulfilled' ? transitResult.value : { score: 0, meta: {} };
  const cycling  = cyclingResult.status === 'fulfilled' ? cyclingResult.value : { score: 0, meta: {} };
  const noise    = noiseResult.status === 'fulfilled'   ? noiseResult.value   : { score: 0, meta: {} };
  const heat     = heatResult.status === 'fulfilled'    ? heatResult.value    : { score: 0, meta: {} };

  const totalScore = Math.min(100, Math.round(
    (air.score + green.score + transit.score + cycling.score + noise.score + heat.score) * 10
  ) / 10);

  const badgeLevel: BadgeLevel =
    totalScore >= 85 ? 'gold' :
    totalScore >= 70 ? 'silver' :
    totalScore >= 55 ? 'bronze' : 'none';

  return {
    id: '',
    buildingId,
    workspaceId,
    totalScore,
    subScores: {
      airQuality: air.score,
      greenSpace: green.score,
      transit: transit.score,
      cycling: cycling.score,
      noise: noise.score,
      heatIsland: heat.score,
    },
    badgeLevel,
    metadata: {
      airStationId: air.meta.stationId ?? null,
      airStationName: air.meta.stationName ?? null,
      airStationDistanceKm: air.meta.distanceKm ?? null,
      airDataReliability: air.meta.reliability ?? 'becsült',
      nearestParkName: green.meta.nearestParkName ?? null,
      nearestParkDistanceM: green.meta.nearestParkDistanceM ?? null,
      nearestBubiStation: cycling.meta.nearestBubiStation ?? null,
      nearestBubiDistanceM: cycling.meta.nearestBubiDistanceM ?? null,
      transitStopsCount: transit.meta.stopsCount ?? 0,
      bikeLaneLengthM: cycling.meta.bikeLaneLengthM ?? 0,
      builtUpRatio: heat.meta.builtUpRatio ?? 0,
      greenRatio: heat.meta.greenRatio ?? 0,
    },
    computedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}
```

---

## 5. React komponensek

### 5.1 BuildingGreenScoreCard — fő kártya komponens

**Fájl**: `components/green-score/BuildingGreenScoreCard.tsx`

```tsx
// components/green-score/BuildingGreenScoreCard.tsx
'use client';

import { useEffect, useState } from 'react';
import { BuildingGreenScore, AdminActionSuggestion } from '@/lib/types/green-score';
import { GreenScoreCircle } from './GreenScoreCircle';
import { GreenScoreBreakdown } from './GreenScoreBreakdown';
import { GreenScoreTrendChart } from './GreenScoreTrendChart';
import { AdminActionList } from './AdminActionList';
import { GreenBadge } from './GreenBadge';
import { generateAdminActions } from '@/lib/green-score/admin-actions';

interface Props {
  buildingId: string;
  workspaceId: string;
  isAdmin?: boolean;
}

export function BuildingGreenScoreCard({ buildingId, workspaceId, isAdmin }: Props) {
  const [score, setScore] = useState<BuildingGreenScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/building-score/${buildingId}`);
        if (!res.ok) throw new Error(await res.text());
        const data: BuildingGreenScore = await res.json();
        setScore(data);
      } catch (e) {
        setError('A pontszám betöltése sikertelen.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [buildingId]);

  if (loading) return <GreenScoreCardSkeleton />;
  if (error)   return <GreenScoreCardError message={error} />;
  if (!score)  return null;

  const actions: AdminActionSuggestion[] = generateAdminActions(score);

  return (
    <div className="rounded-2xl border border-green-100 bg-white shadow-sm p-6 space-y-6">
      {/* Fejléc */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Zöld Épület Pontszám</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Frissítve: {new Date(score.computedAt).toLocaleDateString('hu-HU', {
              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
        {score.badgeLevel !== 'none' && (
          <GreenBadge level={score.badgeLevel} />
        )}
      </div>

      {/* Körkörös pontszám megjelenítő + alpontszám sávok */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <GreenScoreCircle score={score.totalScore} size={140} />
        <div className="flex-1 w-full">
          <GreenScoreBreakdown subScores={score.subScores} />
        </div>
      </div>

      {/* Városátlag összehasonlítás */}
      <CityComparison score={score.totalScore} />

      {/* Részletek kibontása */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-sm text-green-700 hover:text-green-900 font-medium flex items-center justify-center gap-1 py-2 rounded-lg hover:bg-green-50 transition-colors"
      >
        {expanded ? 'Kevesebb részlet ▲' : 'Részletes elemzés ▼'}
      </button>

      {expanded && (
        <div className="space-y-6 pt-2 border-t border-gray-100">
          {/* 30 napos trend */}
          <GreenScoreTrendChart buildingId={buildingId} />

          {/* Admin akció javaslatok */}
          {isAdmin && actions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Fejlesztési javaslatok az épületkezelőnek
              </h3>
              <AdminActionList actions={actions} />
            </div>
          )}

          {/* Adatforrás infó */}
          <DataSourceInfo metadata={score.metadata} />
        </div>
      )}
    </div>
  );
}
```

### 5.2 GreenScoreCircle — körkörös SVG indikátor

**Fájl**: `components/green-score/GreenScoreCircle.tsx`

```tsx
// components/green-score/GreenScoreCircle.tsx
'use client';

interface Props {
  score: number;   // 0–100
  size?: number;   // px, default 120
}

function scoreToColor(score: number): string {
  if (score >= 85) return '#16a34a';  // green-600
  if (score >= 70) return '#65a30d';  // lime-600
  if (score >= 55) return '#ca8a04';  // yellow-600
  if (score >= 40) return '#ea580c';  // orange-600
  return '#dc2626';                    // red-600
}

function scoreToLabel(score: number): string {
  if (score >= 85) return 'Kiváló';
  if (score >= 70) return 'Jó';
  if (score >= 55) return 'Átlagos';
  if (score >= 40) return 'Gyenge';
  return 'Rossz';
}

export function GreenScoreCircle({ score, size = 120 }: Props) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - score / 100);
  const color = scoreToColor(score);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="flex flex-col items-center gap-1" style={{ width: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Háttér kör */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none" stroke="#e5e7eb"
          strokeWidth={12}
        />
        {/* Értékkör */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none" stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="flex flex-col items-center" style={{ marginTop: -(size * 0.7) }}>
        <span className="text-3xl font-bold" style={{ color }}>
          {Math.round(score)}
        </span>
        <span className="text-xs text-gray-500">/100</span>
      </div>
      {/* Label alatta */}
      <div
        className="mt-1 text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: color + '20', color }}
      >
        {scoreToLabel(score)}
      </div>
    </div>
  );
}
```

### 5.3 GreenScoreBreakdown — alpontszám sávok

**Fájl**: `components/green-score/GreenScoreBreakdown.tsx`

```tsx
// components/green-score/GreenScoreBreakdown.tsx
'use client';

import { GreenScoreSubScores } from '@/lib/types/green-score';

interface CategoryConfig {
  key: keyof GreenScoreSubScores;
  labelHu: string;
  maxScore: number;
  icon: string;
  colorClass: string;
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'airQuality',  labelHu: 'Levegőminőség',          maxScore: 25, icon: '💨', colorClass: 'bg-sky-500' },
  { key: 'greenSpace',  labelHu: 'Zöldfelület közelség',   maxScore: 20, icon: '🌳', colorClass: 'bg-green-500' },
  { key: 'transit',     labelHu: 'Tömegközlekedés',        maxScore: 20, icon: '🚇', colorClass: 'bg-blue-500' },
  { key: 'cycling',     labelHu: 'Kerékpáros inf.',        maxScore: 15, icon: '🚲', colorClass: 'bg-teal-500' },
  { key: 'noise',       labelHu: 'Zajszennyezés',          maxScore: 10, icon: '🔕', colorClass: 'bg-yellow-500' },
  { key: 'heatIsland',  labelHu: 'Hőszigat hatás',         maxScore: 10, icon: '🌡️', colorClass: 'bg-orange-500' },
];

interface Props {
  subScores: GreenScoreSubScores;
}

export function GreenScoreBreakdown({ subScores }: Props) {
  return (
    <div className="space-y-2.5 w-full">
      {CATEGORIES.map(cat => {
        const value = subScores[cat.key];
        const pct = Math.round((value / cat.maxScore) * 100);
        return (
          <div key={cat.key} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <span>{cat.icon}</span>
                <span className="font-medium">{cat.labelHu}</span>
              </span>
              <span className="font-semibold text-gray-800 tabular-nums">
                {value.toFixed(1)}&thinsp;/&thinsp;{cat.maxScore}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${cat.colorClass}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

## 6. Dashboard integráció

### 6.1 Elhelyezés az alkalmazáson belül

A `BuildingGreenScoreCard` komponens három helyen jelenik meg:

**A) Épület dashboard főoldal** (`app/w/[workspaceId]/page.tsx` vagy a dashboard kliens komponensben):
- A weather-widget és a levegőminőség-widget mellé, a dashboard grid harmadik oszlopaként, vagy alatta a második sorban
- Kompakt mód: csak a körkörös pontszám és a badge látszik; kattintásra teljes kártyává nyílik
- Tailwind grid: `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`

**B) Önálló aloldal** (`app/w/[workspaceId]/green-score/page.tsx`):
- Teljes körű részletes nézet: trend grafikon, admin javaslatok, adatforrás részletek
- Fejlécen a badge prominensen megjelenik
- Aloldalon megosztási gomb (épület zöld pontszámának publikus link generálása)

**C) Épület beállítások oldal** (adminok számára):
- „Zöld Pontszám" fül az épület profilján
- Részletes admin akció lista

### 6.2 Dashboard kártya integráció (dashboard-client.tsx)

```tsx
// Kiegészítés a meglévő dashboard-client.tsx-hez
import { BuildingGreenScoreCard } from '@/components/green-score/BuildingGreenScoreCard';

// A meglévő grid-be beillesztve:
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
  <WeatherWidget />
  <AirQualityWidget buildingId={buildingId} />    {/* Feature 01 */}
  <BuildingGreenScoreCard
    buildingId={buildingId}
    workspaceId={workspaceId}
    isAdmin={isAdmin}
  />
</div>
```

---

## 7. Admin akció javaslatok

### 7.1 Javaslat generálás logikája

**Fájl**: `lib/green-score/admin-actions.ts`

A rendszer minden alpontszámhoz egyedi javaslatokat generál, ha az alpontszám az elérhető maximum 60%-a alatt van. A javaslatok konkrétak, megvalósíthatók és a pontnövekedés becslésével kerülnek listázásra.

```typescript
// lib/green-score/admin-actions.ts

import { BuildingGreenScore, AdminActionSuggestion } from '@/lib/types/green-score';

export function generateAdminActions(score: BuildingGreenScore): AdminActionSuggestion[] {
  const actions: AdminActionSuggestion[] = [];
  const { subScores } = score;

  // 1. Levegőminőség javaslatok
  if (subScores.airQuality < 15) {
    actions.push({
      category: 'airQuality',
      currentScore: subScores.airQuality,
      maxScore: 25,
      priority: 'high',
      titleHu: 'HEPA légtisztítók telepítése közös területekre',
      descriptionHu: 'A lépcsőházakba és közösségi helyiségekbe telepített HEPA szűrős légtisztítók PM2.5 és PM10 szintjét 60-80%-kal csökkentik a belső tereken. Ez nem javítja a külső mérést, de a lakók tényleges exponáltsága csökken.',
      estimatedPointGain: 2,
      difficultyLevel: 'medium',
      estimatedCostHuf: '200 000–600 000 Ft',
    });
    actions.push({
      category: 'airQuality',
      currentScore: subScores.airQuality,
      maxScore: 25,
      priority: 'high',
      titleHu: 'Zöld fal (vertical garden) telepítése az utca felőli homlokzaton',
      descriptionHu: 'Egy 20–40 m² kiterjedésű függőleges zöldfal mérhető mértékben csökkenti a helyi PM10 szintet, és javítja a homlokzat hőszigetelési tulajdonságait is. Budapest több kerületében önkormányzati támogatás érhető el.',
      estimatedPointGain: 3,
      difficultyLevel: 'hard',
      estimatedCostHuf: '1 500 000–4 000 000 Ft',
    });
  }

  // 2. Zöldfelület javaslatok
  if (subScores.greenSpace < 12) {
    actions.push({
      category: 'greenSpace',
      currentScore: subScores.greenSpace,
      maxScore: 20,
      priority: 'medium',
      titleHu: 'Tetőkert vagy tetőterasz kialakítása',
      descriptionHu: 'Egy 50–100 m² zöldtetővel az épület saját zöldfelülete közvetlenül növekszik. Ez az OSM adatokban is megjelenhet amenity=rooftop_garden tagként, és emeli a zöldfelület alpontszámot.',
      estimatedPointGain: 2,
      difficultyLevel: 'hard',
      estimatedCostHuf: '3 000 000–8 000 000 Ft',
    });
    actions.push({
      category: 'greenSpace',
      currentScore: subScores.greenSpace,
      maxScore: 20,
      priority: 'medium',
      titleHu: 'Épület előtti járdán cserjesáv/fasor ültetése az önkormányzattal együttműködve',
      descriptionHu: 'Sok kerületi önkormányzat (pl. XI., XIV. kerület) ingyenes faültetési programot kínál panelházak előtti közterületre. Alacsony cost, magas ökológiai haszon.',
      estimatedPointGain: 1,
      difficultyLevel: 'easy',
      estimatedCostHuf: '0 Ft (önkormányzati program)',
    });
  }

  // 3. Tömegközlekedés javaslatok
  if (subScores.transit < 12) {
    actions.push({
      category: 'transit',
      currentScore: subScores.transit,
      maxScore: 20,
      priority: 'low',
      titleHu: 'BKK megálló-telepítési kérelem a lakóközösségtől',
      descriptionHu: 'Ha a lakóközösség aláírásgyűjtést szervez és a BKK-hoz formálisan benyújtja, reális esély van új buszmegálló telepítésére 400 m-en belül. BKK megállóbővítési kérelem: https://bkk.hu/megallok.',
      estimatedPointGain: 4,
      difficultyLevel: 'medium',
      estimatedCostHuf: '0 Ft (közösségi akció)',
    });
  }

  // 4. Kerékpáros javaslatok
  if (subScores.cycling < 9) {
    actions.push({
      category: 'cycling',
      currentScore: subScores.cycling,
      maxScore: 15,
      priority: 'medium',
      titleHu: 'Biztonságos kerékpártároló kialakítása az épületben',
      descriptionHu: 'A pinceszinten vagy udvarban kialakított zárt, kamerafelügyelt kerékpártároló ösztönzi a kerékpározást, és közvetetten növeli a kerékpáros infrastruktúra pontszámot. OSM-be felvehető amenity=bicycle_parking tagként.',
      estimatedPointGain: 1,
      difficultyLevel: 'easy',
      estimatedCostHuf: '100 000–400 000 Ft',
    });
    actions.push({
      category: 'cycling',
      currentScore: subScores.cycling,
      maxScore: 15,
      priority: 'medium',
      titleHu: 'MOL Bubi dok telepítéséhez önkormányzati kérelem',
      descriptionHu: 'A MOL Bubi rendszer kerületi kiterjesztéséhez az önkormányzatnál kezdeményezés nyújtható be. A Bubi stáció az épülettől 200 m-en belül +7 pontot jelentene a kerékpáros alpontszámon.',
      estimatedPointGain: 7,
      difficultyLevel: 'hard',
      estimatedCostHuf: '0 Ft (önkormányzati kezdeményezés)',
    });
  }

  // 5. Zajszennyezés javaslatok
  if (subScores.noise < 6) {
    actions.push({
      category: 'noise',
      currentScore: subScores.noise,
      maxScore: 10,
      priority: 'high',
      titleHu: 'Háromrétegű üvegezésű nyílászárók cseréje',
      descriptionHu: 'Az utca felőli lakásokban (és közös területeken) a háromrétegű üveges nyílászárók 5–8 dB zajcsökkentést nyújtanak. Akár 50%-os állami támogatás érhető el a panelprogram keretein belül.',
      estimatedPointGain: 0,   // belső javulás, nem méri a külső zaj mutatót
      difficultyLevel: 'medium',
      estimatedCostHuf: '800 000–2 500 000 Ft (épületfüggő)',
    });
  }

  // 6. Hőszigat javaslatok
  if (subScores.heatIsland < 6) {
    actions.push({
      category: 'heatIsland',
      currentScore: subScores.heatIsland,
      maxScore: 10,
      priority: 'medium',
      titleHu: 'Tükröző (cool roof) tetőbevonat alkalmazása felújításkor',
      descriptionHu: 'A magas albedójú tető bevonat 3–5°C-kal csökkenti a tetőfelület hőmérsékletét nyáron, ezzel csökkenti az épület hőszigat-hozzájárulását és a tetőtéri lakások hűtési igényét.',
      estimatedPointGain: 2,
      difficultyLevel: 'medium',
      estimatedCostHuf: '200 000–800 000 Ft',
    });
    actions.push({
      category: 'heatIsland',
      currentScore: subScores.heatIsland,
      maxScore: 10,
      priority: 'low',
      titleHu: 'Az épület udvarán permeábilis burkolat elhelyezése',
      descriptionHu: 'A beton- és aszfaltburkolat helyett füves kockakő vagy permeábilis aszfalt elhelyezése az udvaron csökkenti az impervious surface arányát, ami közvetlenül javítja a hőszigat alpontszámot.',
      estimatedPointGain: 1,
      difficultyLevel: 'medium',
      estimatedCostHuf: '500 000–1 500 000 Ft',
    });
  }

  // Prioritás szerint rendezés: high → medium → low
  const priority = { high: 0, medium: 1, low: 2 };
  return actions.sort((a, b) => priority[a.priority] - priority[b.priority]);
}
```

---

## 8. Gamifikáció részletezése

### 8.1 Badge megjelenítő komponens

```tsx
// components/green-score/GreenBadge.tsx
'use client';

import { BadgeLevel } from '@/lib/types/green-score';

const BADGE_CONFIG: Record<Exclude<BadgeLevel, 'none'>, {
  labelHu: string;
  icon: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}> = {
  gold: {
    labelHu: 'Arany Zöld Épület',
    icon: '🥇',
    bgClass: 'bg-yellow-50',
    textClass: 'text-yellow-700',
    borderClass: 'border-yellow-300',
  },
  silver: {
    labelHu: 'Ezüst Zöld Épület',
    icon: '🥈',
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-600',
    borderClass: 'border-gray-300',
  },
  bronze: {
    labelHu: 'Bronz Zöld Épület',
    icon: '🥉',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-700',
    borderClass: 'border-orange-300',
  },
};

interface Props {
  level: BadgeLevel;
  showLabel?: boolean;
}

export function GreenBadge({ level, showLabel = true }: Props) {
  if (level === 'none') return null;
  const cfg = BADGE_CONFIG[level];
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass}`}>
      <span>{cfg.icon}</span>
      {showLabel && <span>{cfg.labelHu}</span>}
    </div>
  );
}
```

### 8.2 Pontszám trend komponens (30 napos grafikon)

**Fájl**: `components/green-score/GreenScoreTrendChart.tsx`

A trend grafikon Recharts `AreaChart` komponenst használ (amelyet a projekt már tartalmaz, vagy egyszerű SVG sparkline-ként implementálható). Az x-tengely a dátumokat, az y-tengely a 0–100-as pontszámot mutatja. A `ReferenceLine` jelöli a 70-es (silver) és 85-ös (gold) küszöbértékeket. Az aktuális pontszám mellé trendnyíl is kerül:
- ▲ Zöld: az elmúlt 7 napban ≥3 pontot javult
- → Szürke: ±2 pont változás
- ▼ Piros: az elmúlt 7 napban ≥3 pontot romlott

---

## 9. Kapcsolódó feature-ök

### 9.1 Kapcsolat a Feature 01 (Levegőminőség Widget) -tel

A `BuildingGreenScoreCard` a Zöld Pontszám **levegőminőség alpontszámát** részben ugyanazokból az OpenAQ adatokból számítja, mint a Feature 01 levegőminőség widget. A köztük lévő kapcsolat:

- Megosztott Supabase cache: az `air_quality_cache` tábla (Feature 01 által karbantartott) elsődleges adatforrása a levegőminőség alpontszámnak
- A Zöld Pontszám kártyán a levegőminőség sávra kattintva közvetlenül a Feature 01 részletes levegőminőség paneljéhez navigál (`/w/:workspaceId/air-quality`)
- A Feature 01 riasztási rendszere (ha AQI > 150) automatikusan frissíti a Zöld Pontszámot is

**Importálás Feature 01-ből**:
```typescript
import { getAirQualityForBuilding } from '@/lib/air-quality/fetcher';
// Ez az egységes, cache-elt hívás, nem kell duplikálni az OpenAQ API hívást
```

### 9.2 Kapcsolat a Feature 08 (Tömegközlekedés Panel) -lel

A tömegközlekedés alpontszámhoz a Feature 08 által kezelt BKK GTFS adatok (ha implementálva vannak) közvetlen inputot adnak:
- A Feature 08 `transit_stops` Supabase táblája lekérdezhető a tömegközlekedés alpontszám számításhoz
- A Zöld Pontszám kártyán a tömegközlekedés sávra kattintva a Feature 08 tömegközlekedés térképéhez navigál

---

## 10. Implementációs ütemterv (Sprint bontás)

### Sprint 1 — Adatbázis és API alap (5 nap)

**Feladatok**:
1. Supabase migrációs SQL futtatása (`building_green_scores`, `building_score_history`, `noise_map_grid`)
2. `lib/types/green-score.ts` TypeScript interface-ek létrehozása
3. `lib/green-score/compute.ts` és az alpontszám sub-modulok váza (`air-quality.ts`, `green-space.ts`, `transit.ts`, `cycling.ts`, `noise.ts`, `heat-island.ts`)
4. OpenAQ API wrapper megírása (Feature 01 fetcherét újrahasznosítva)
5. Overpass API wrapper megírása (saját, cache-elt)
6. `app/api/building-score/[buildingId]/route.ts` teljes implementáció
7. `app/api/building-score/[buildingId]/history/route.ts` implementáció
8. Egységtesztek a pontszám-algoritmus számításokhoz

**Definíció of Done**: A `/api/building-score/:id` végpont HTTP 200-at és érvényes JSON-t ad vissza egy valódi épület ID-ra.

### Sprint 2 — React UI komponensek (4 nap)

**Feladatok**:
1. `GreenScoreCircle.tsx` SVG körkörös progress
2. `GreenScoreBreakdown.tsx` sávdiagram
3. `GreenBadge.tsx` badge megjelenítő
4. `BuildingGreenScoreCard.tsx` fő wrapper
5. `GreenScoreTrendChart.tsx` (Recharts AreaChart)
6. `AdminActionList.tsx` és `generateAdminActions()` logika
7. Skeleton loading és error állapot komponensek
8. Storybook story-k (ha a projekt Storybook-ot használ)

**Definíció of Done**: Storybook-ban vagy test page-en minden állapot renderelődik helyesen (loading, error, bronze/silver/gold/none badge, admin és nem-admin nézet).

### Sprint 3 — Dashboard integráció és gamifikáció (3 nap)

**Feladatok**:
1. `dashboard-client.tsx` kiegészítése a kártyával
2. `/w/:workspaceId/green-score` önálló aloldal létrehozása
3. Badge megjelenítése a dashboard fejlécen (BuildingHeader komponens)
4. Nyilvános megosztási URL generálás (OG image opcionálisan: Vercel OG Image API)
5. Városátlag összehasonlítás Supabase aggregációs query-vel
6. Lokalizáció: minden szöveg `src/i18n/resources/en.ts` és `hu.ts` fájlokba

**Definíció of Done**: Valódi épület dashboardján a Zöld Pontszám kártya éles adatokkal megjelenik, badge-gel és bővíthető részletekkel.

### Sprint 4 — Automatikus frissítés és tesztelés (3 nap)

**Feladatok**:
1. Supabase Edge Function (Deno) cron: `compute-green-scores` — naponta egyszer minden workspace aktív épületére
2. A cron funkcióban a `Promise.allSettled` alapú párhuzamos compute
3. E2E tesztek: Playwright vagy Cypress — a pontszám kártya megjelenik és értelmes adatot mutat
4. Integrációs tesztek: API route mock OpenAQ és Overpass válaszokkal
5. Teljesítmény: a kártya LCP (Largest Contentful Paint) < 1,2 s (Supabase cache-ből)
6. Mobil UX review: a kördiagram és sávok mobilon is olvashatók (min 320px)

---

## 11. Tesztelési kritériumok

### 11.1 Egységtesztek (Jest)

```typescript
// __tests__/green-score/compute.test.ts

describe('Air Quality Score', () => {
  it('visszaadja a maximális 25 pontot, ha minden szennyező 0', () => {
    const score = computeAirScore({ pm25: 0, pm10: 0, no2: 0, o3: 0 });
    expect(score).toBe(25);
  });
  it('0 pontot ad, ha PM2.5 ≥ 37.5 µg/m³ (1.5× EU határérték)', () => {
    const score = computeAirScore({ pm25: 37.5, pm10: 0, no2: 0, o3: 0 });
    expect(score).toBe(0);
  });
  it('megbízhatósági flag "becsült" ha állomás > 5 km', () => {
    const { reliability } = computeAirScoreWithMeta({ stationDistanceKm: 7, pm25: 10, pm10: 20, no2: 30, o3: 60 });
    expect(reliability).toBe('becsült');
  });
});

describe('Badge Level', () => {
  it('gold badge 85+ pontnál', () => {
    expect(computeBadgeLevel(87)).toBe('gold');
  });
  it('none badge 54 pontnál', () => {
    expect(computeBadgeLevel(54)).toBe('none');
  });
});
```

### 11.2 Integrációs tesztek

- Mock Overpass API válasz 3 parkkal 400m-en belül → `green_space_score >= 10`
- Mock OpenAQ PM2.5 = 12 µg/m³ → `air_quality_score` a [18, 25] tartományban
- Érvénytelen `buildingId` → API 404-et ad vissza
- Nem tag felhasználó → API 403-at ad vissza

### 11.3 UI tesztek (Playwright)

```typescript
test('Zöld pontszám kártya betölt és megjelenik', async ({ page }) => {
  await page.goto('/w/test-workspace-id');
  await expect(page.getByText('Zöld Épület Pontszám')).toBeVisible();
  await expect(page.getByTestId('green-score-circle')).toBeVisible();
  // A pontszámnak 0–100 között kell lennie
  const scoreText = await page.getByTestId('green-score-value').textContent();
  const score = parseInt(scoreText ?? '0', 10);
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);
});

test('Részletes nézet kinyílik kattintásra', async ({ page }) => {
  await page.goto('/w/test-workspace-id');
  await page.getByText('Részletes elemzés').click();
  await expect(page.getByText('30 napos trend')).toBeVisible();
});
```

---

## 12. Lokalizáció (i18n)

### 12.1 Szükséges kulcsok (hu.ts és en.ts)

```typescript
// Hozzáadandó a src/i18n/resources/hu.ts fájlhoz:
greenScore: {
  title: 'Zöld Épület Pontszám',
  subtitle: 'Környezeti értékelés',
  categories: {
    airQuality: 'Levegőminőség',
    greenSpace: 'Zöldfelület közelség',
    transit: 'Tömegközlekedés',
    cycling: 'Kerékpáros infrastruktúra',
    noise: 'Zajszennyezés',
    heatIsland: 'Hőszigat hatás',
  },
  badges: {
    gold: 'Arany Zöld Épület',
    silver: 'Ezüst Zöld Épület',
    bronze: 'Bronz Zöld Épület',
  },
  levels: {
    excellent: 'Kiváló',
    good: 'Jó',
    average: 'Átlagos',
    poor: 'Gyenge',
    bad: 'Rossz',
  },
  comparison: {
    aboveDistrict: '{{points}} ponttal a kerületi átlag felett',
    belowDistrict: '{{points}} ponttal a kerületi átlag alatt',
    atDistrict: 'Kerületi átlagon',
  },
  trend: {
    improving: 'Javuló trend',
    stable: 'Stabil',
    declining: 'Romló trend',
    chartTitle: '30 napos pontszám előzmény',
  },
  actions: {
    sectionTitle: 'Fejlesztési javaslatok az épületkezelőnek',
    highPriority: 'Magas prioritás',
    mediumPriority: 'Közepes prioritás',
    lowPriority: 'Alacsony prioritás',
    estimatedGain: 'Becsült pontszám javulás',
    estimatedCost: 'Becsült költség',
    difficulty: {
      easy: 'Könnyű',
      medium: 'Közepes',
      hard: 'Nehéz',
    },
  },
  dataSource: {
    title: 'Adatforrások',
    airStation: 'Legközelebbi OLM mérőállomás',
    distanceKm: '{{distance}} km légvonalban',
    reliability: 'Adat megbízhatósága',
    reliabilityMert: 'Mért (közvetlen állomás)',
    reliabilityBecslut: 'Becsült (≥5 km)',
    nearestPark: 'Legközelebbi park',
    bubiStation: 'Legközelebbi MOL Bubi állomás',
    osmSource: 'OpenStreetMap adatok alapján',
  },
  updatedAt: 'Frissítve: {{datetime}}',
  loading: 'Pontszám betöltése...',
  error: 'A pontszám betöltése sikertelen.',
  expandDetails: 'Részletes elemzés ▼',
  collapseDetails: 'Kevesebb részlet ▲',
},
```

---

## 13. Teljesítmény és skálázhatóság

### 13.1 Cache stratégia

- **Supabase tábla cache**: a `building_green_scores.valid_until` 24 órás TTL-lel; ha érvényes, az API azonnal visszaadja az adatbázisból (< 50 ms)
- **Overpass API**: saját Supabase táblában cache-elve (`osm_green_areas_cache`, `osm_transit_stops_cache`), 7 napos TTL (OSM adatok lassan változnak)
- **OpenAQ**: a Feature 01 air quality cache táblájából olvasva, 1 órás TTL
- **Edge cache**: a Next.js `Cache-Control: s-maxage=3600` fejléccel a CDN szinten is cache-elhető

### 13.2 Párhuzamos feldolgozás

Az `alpontszám-számítók` `Promise.allSettled`-del párhuzamosan futnak; ha valamelyik API (pl. Overpass) időtúllépés miatt meghiúsul, az adott alpontszám 0 ponttal számít be, és a UI-on jelzés jelenik meg: „Az adat jelenleg nem elérhető." Ezzel garantált, hogy az összesített pontszám mindig megjelenik, soha nem okoz 500-as hibát egy downstream API kiesése.

### 13.3 Supabase Edge Function (cron)

```typescript
// supabase/functions/compute-green-scores/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Összes aktív épület lekérése
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, lat, lon, workspace_id')
    .not('lat', 'is', null)
    .not('lon', 'is', null);

  if (!buildings) return new Response('No buildings', { status: 200 });

  // Párhuzamos számítás (max 10 épület egyszerre, rate limiting)
  const BATCH_SIZE = 10;
  for (let i = 0; i < buildings.length; i += BATCH_SIZE) {
    const batch = buildings.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(b => computeAndSaveScore(supabase, b))
    );
  }

  return new Response(`Processed ${buildings.length} buildings`, { status: 200 });
});
```

---

## 14. Biztonsági szempontok

- **RLS (Row Level Security)**: minden `building_green_scores` sor csak az épület tagjainak olvasható (policy implementálva a migrációban)
- **API hitelesítés**: a `/api/building-score/[buildingId]` endpoint Supabase session cookie-val hitelesít, a tagságot explicit ellenőrzi
- **Koordináta adatok**: az épület lat/lon koordinátái nem kerülnek ki a válasz JSON-ban (csak az alpontszámok és metaadatok)
- **Rate limiting**: az Overpass API-t max 1 kérés/másodperc sebességgel hívják (önkorlátozás a compute funkcióban), hogy ne kerüljön tiltólistára a szerver IP-je
- **OpenAQ API kulcs**: `.env.local`-ban tárolva (`OPENAQ_API_KEY`), kizárólag szerver oldalon használva

---

## 15. Mobil UX szempontok

- A kördiagram minimum 100×100 px-en is olvasható (score + szám + kategória)
- Az alpontszám sávok 20px magasak, touch targetként megfelelők (minimum 44px touch area a teljes sorhoz)
- A kártya kompakt módban (`expanded=false`) maximum 320px magasságú, nem tolja el a dashboard többi elemét
- Az admin akció javaslatok minden egyes kártyája accordion-szerűen nyílik — nem egy statikus lista, ami szétverné a mobilnézetet

---

## 16. Metrikák és monitoring

### 16.1 Fontos üzleti metrikák nyomon követése

- Átlagos Zöld Pontszám (Budapest panelházak, kerületenként) — belső BI dashboardon
- Badge szintek eloszlása (hány épület bronz / ezüst / arany)
- Legtöbbet kattintott admin javaslat kategória (insight: melyik területen van a legnagyobb igény)
- Pontszám trend iránya az elmúlt 3 hónapban (javul-e a fleet?)

### 16.2 Technikai metrikák

- API válaszidő p50/p95 (target: p50 < 100 ms Supabase cache-ből, p95 < 3000 ms friss számítással)
- Overpass API timeout arány (target: < 5%)
- OpenAQ adat freshness: hány épületnél nincs 24 óránál frissebb adat

---

## 17. Marketing és kommunikáció értéke

A Zöld Épület Pontszám funkció a panellako.hu egyik legerősebb differenciáló feature-je a piacon, mert:

1. **Egyedi adatintegráció**: Egyetlen közép-európai lakóközösség-menedzsment alkalmazás sem aggregál ilyen komplex, épületszintű környezeti pontszámot valós OSM, OpenAQ és BKK adatokból.
2. **Thesis-alapú hitelesség**: A GIS szakdolgozat eredményeiből fakadó módszertan hiteles tudományos hátteret ad, amelyre a marketing hivatkozhat.
3. **Gamifikáció és közösség**: A badge rendszer ösztönzi a lakóközösségeket a platform aktívabb használatára, és megosztható tartalmat generál.
4. **Admin actionability**: Nem csak mér, hanem konkrét, megvalósítható lépéseket javasol — ez az igazi értékajánlat az épületkezelőknek.
5. **Fenntarthatósági trend**: A ESG (Environmental, Social, Governance) szempontok az ingatlanpiacon egyre fontosabbak; egy ilyen pontszám a lakástulajdonosok számára is értéknövelő tényező lehet.

---

## 18. Ismert korlátok és jövőbeli fejlesztési irányok

### 18.1 Jelenlegi korlátok

- **Zajtérkép**: A Budapest stratégiai zajtérképe statikusan importált (2017-es adat). Valós idejű zajmérés nem elérhető nyilvánosan. A statikus adat is értékes, de jelölni kell az UI-ban.
- **NDVI**: Valódi műholdalapú NDVI adat (Sentinel-2, Copernicus Land Services) nem integrált az első verzióban. Az OSM zöldfelület proxy jó közelítés, de nem azonos.
- **BKK GTFS járatfrekvencia**: A járatfrekvencia adatok a BKK GTFS feed-ből elérhetők, de az első verzióban csak a megállók száma és típusa kerül figyelembevételre.
- **Épületszintű zajmérés**: Az OLM csak levegőminőséget mér zajt nem; épületszintű zajmérés IoT szenzorokat igényelne.

### 18.2 Jövőbeli fejlesztési irányok (v2+)

- Sentinel-2 NDVI API integráció (Copernicus Dataspace): valódi vegetációs index épület körzetére
- BKK GTFS járatfrekvencia feldolgozás: csúcsidei járatköz percben
- Épületenergetikai besorolás (EPC) integrálása a pontszámba (ha elérhető Energetikai Tanúsítványok Adatbázisából)
- Szomszéd épületek összehasonlítása: „Összehasonlítás a körzet hasonló épületeivel"
- Push értesítés, ha az épület pontszáma jelentősen változik (pl. >5 pont csökkenés levegőminőség miatt)
- Publikus városi leaderboard: Zöld Épület rangsor (opt-in alapon)

---

## Összefoglalás

A **Zöld Épület Pontszám Dashboard** (Feature 02) a panellako.hu eddigi legkomplexebb, de egyben leginkább differenciáló feature-je. Hat különböző nyílt adatforrásból (OpenAQ, Overpass/OSM, BKK, statikus zajtérkép) aggregál egyetlen, könnyen érthető, 0–100 pontos összetett mutatót. A pontszám naponta automatikusan frissül, épületenként személyre szabott fejlesztési javaslatokat kínál, gamifikációval ösztönzi az elkötelezettséget, és közvetlenül kapcsolódik a Feature 01 levegőminőség widget és a Feature 08 tömegközlekedés panel adataihoz. A feature teljes implementációja 4 sprintben (kb. 15 munkanap) elvégezhető, és az összes vonatkozó governance szabályt (RLS, i18n, browser back button, workspace UUID URL) betartja.
