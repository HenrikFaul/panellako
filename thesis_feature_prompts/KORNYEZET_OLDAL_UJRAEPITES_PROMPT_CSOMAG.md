# Környezet oldal teljes újraépítése — Prompt csomag
**Dátum:** 2026-05-19  
**Verzió:** 1.0  
**Scope:** `/w/[buildingId]/kornyezet` teljes rekonstrukció  
**Vizsgálati módszer:** 7 iterációs mélyelemzés + 60+ forrás kutatás

---

## I. JELENLEGI ÁLLAPOT ELEMZÉSE (7 iteráció)

### Iteráció 1: Inventory — Mi van most?
A jelenlegi implementáció (`environment-page-client.tsx` + `air-quality-section.tsx`) **2 lapfület** kínál:

| Lapfül | Adatforrás | Mit mutat | Hiányosság |
|--------|-----------|-----------|-----------|
| Levegőminőség | AQICN API + OLM állomások | AQI szám, PM2.5/PM10/NO2/O3/SO2/CO, 7 napos PM2.5 előrejelzés, állomás-térkép, heatmap | Nincs pollen, UV, zöld index, trend chart, személyes ajánlás |
| Kerékpáros útvonalak | OSM Overpass | Kerékpárutaktérkép 4 rétegen | Nincs gyalogos, parkok, zajforrások, zöldzóna |

**Komponens fa:**
```
EnvironmentPageClient
├── header (sticky, 2 tab)
├── AirQualitySection
│   ├── AQI gauge (AQICN)
│   ├── Pollutant bars (6 anyag)
│   ├── AirQualityMap (Leaflet + stáció markerek)
│   └── 7-nap PM2.5 forecast bars
└── CyclingMap (Leaflet + OSM rétegek)
```

**API lábnyom:**
- `GET /api/air-quality?lat=&lon=` → AQICN, 10 perc cache
- `GET /api/air-quality/stations` → AQICN bounds, validáció
- `GET /api/air-quality/heatmap` → AQICN állomás részletek
- `GET /api/cycling` → Overpass API (légszennyezés, kerékpár)

---

### Iteráció 2: Adathézag-elemzés — Mi hiányzik?

#### Kritikus hiányok (minden lakó számára releváns)
1. **Pollen index** — Magyarország Európa legnagyobb parlagfű-exportőre; Budapest lakói számára kritikus allergia-adat. Nincs a jelenlegi oldalon.
2. **UV-index** — erkélyhasználat, napozás, bőrvédelem; teljesen hiányzik.
3. **Zöldelérési index** — legközelebbi park, fák száma 500m-en belül; csak kerékpártérképből következtethető.
4. **Zajszennyezési indikátor** — forgalmas út mellett vs. csendes mellékutca; jelenleg 0 tájékoztatás.
5. **Történeti trend** — "tegnap jobb/rosszabb volt-e?" kérdésre nincs válasz.
6. **Összetett Környezeti Pontszám** — egyetlen összefoglaló szám; elérhető lenne.

#### Fontos hiányok (hasznosság növekvő sorrendben)
7. **Napenergia-potenciál** — PVGIS ingyenes EU API, 271M épületet lefed
8. **Tevékenységi ajánlás** — "most mehetek-e futni?" — BreezoMeter, IQAir is csinálja
9. **Szél és csapadék** — levegőminőséget erősen befolyásolják
10. **Szomszédos amenitások** — iskolák, gyógyszertár, játszótér — OSM-ből ingyenesen

---

### Iteráció 3: API-landscape elemzés (mi érhető el ingyen, 2025)

| API | Adattípus | Kulcs kell? | Rate limit | Lefedés |
|-----|----------|------------|-----------|---------|
| **Open-Meteo Air Quality** | PM2.5, PM10, NO2, O3, SO2, CO, dust, UV, pollen (fű/nyír/éger) | **NEM** | 10,000/nap | Európa, CAMS |
| **PVGIS (EU JRC)** | Éves napenergia kWh/m², PV termelés | **NEM** | 30 req/s | EU |
| **Open-Meteo Weather** | Hőmérséklet, szél, csapadék, UV előrejelzés | **NEM** | 10,000/nap | Globális |
| **AQICN** (meglévő) | AQI, pollutants, 7-nap PM2.5 forecast | Igen (ingyenes) | 1000/nap | Globális |
| **Overpass API** (meglévő) | Kerékpárutak, parkok, fák, POI-k | **NEM** | ~1M/nap | Globális |
| **EEA Noise Directive** | Lden zajkontúrok | NEM (WMS) | Nincs limit | EU |

**Kulcsmegállapítás:** Az Open-Meteo Air Quality API **pollen + UV + összes szennyező + 7 napos hourly forecast-ot** ad AQICN-nel összehasonlítható minőségben, API kulcs nélkül. Ez az AQICN **teljes kiváltását** teszi lehetővé egyszerűsítve az architektúrát.

**Open-Meteo AQ endpoint:**
```
GET https://air-quality-api.open-meteo.com/v1/air-quality
  ?latitude=47.4979
  &longitude=19.0402
  &hourly=pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide,
          dust,uv_index,grass_pollen,birch_pollen,alder_pollen
  &forecast_days=7
```

**PVGIS endpoint:**
```
GET https://re.jrc.ec.europa.eu/api/v5_3/PVcalc
  ?lat=47.4979&lon=19.0402
  &peakpower=1&loss=14&outputformat=json
```

---

### Iteráció 4: Hasonló platformok elemzése (mit csinálnak mások)

| Platform | Egyedi funkció amit érdemes átvenni |
|---------|-----------------------------------|
| **IQAir AirVisual** | Pollen szintek fa/fű/gyom bontásban; szél irány/sebesség hatása a légszennyezésre; "legközelebbi tiszta levegős hely" |
| **Plume Labs** | 72 órás előrejelzés; aktivitás-specifikus tanácsok (futás, kerékpár); 6 hónapos historikus; utca szintű térkép |
| **BreezoMeter** | Tevékenységi pontszám ("futáshoz 78/100"); személyreszabott egészségügyi ajánlás; ablaknyitás-tanács |
| **Skyee** | Összetett "Környezeti egészségpont" szám; UV + levegő + szél kombináció |
| **NatureScore™** | Zöldelérési szám 30+ adatforrásból: NDVI, zöldterület %, legközelebbi park távolsága |
| **Redfin Climate** | Árvízkockázat, tűzkockázat, hőhullám kockázat épületenként |
| **AirGradient** | 5 perces frissítés; push értesítés küszöbátlépésnél; export CSV |

---

### Iteráció 5: Architektúra-elemzés — Jelenlegi vs. ajánlott

#### Jelenlegi architektúra problémái
```
AQICN API ──→ /api/air-quality ──→ AirQualitySection (10 perc cache serverside)
AQICN API ──→ /api/air-quality/stations ──→ AirQualityMap (nincs cache)  
AQICN API ──→ /api/air-quality/heatmap ──→ AirQualityMap (15 perc serverside)
Overpass  ──→ /api/cycling ──→ CyclingMap (nincs cache, 10-15s)
```
**Problémák:**
- AQICN rate limit: 1000 req/nap ingyenesen → több felhasználóval elfogyhat
- 3 külön AQICN endpoint = 3x API hívás / user session
- Overpass 15s betöltési idő zöldfelület adathoz = nincs rá optimalizálás
- Nincs Supabase perzisztencia az OSM zöldfelület adathoz
- Nincs building-szintű cache a PVGIS/zöld adatokhoz

#### Ajánlott architektúra
```
Open-Meteo AQ ──→ /api/environment/air-quality ──→ Supabase(air_quality_readings) → kliens
Open-Meteo AQ ──→ /api/environment/pollen ──→ in-memory cache 3h → kliens
Open-Meteo WX ──→ /api/environment/weather ──→ in-memory cache 1h → kliens
PVGIS         ──→ /api/environment/solar ──→ Supabase(building_solar_cache) 30 nap TTL
Overpass      ──→ /api/environment/green ──→ Supabase(building_green_cache) 7 nap TTL
Overpass      ──→ /api/cycling (meglévő, változatlan)
```

**Supabase táblák:**
- `air_quality_readings` (meglévő, bővíteni kell)
- `building_solar_cache` (új, PVGIS eredmény per building)
- `building_green_cache` (új, OSM zöldelérési adatok per building)
- `building_env_score` (új, összesített env pontszám, napi refresh)

---

### Iteráció 6: Öt új funkció részletes tervezése

#### Funkció 1: Pollen-index panel
**Mit mutat:** 3 pollenszint (fű, nyír, éger/parlagfű) aktuális + 7 napos heti előrejelzés Copernicus CAMS adatból
**Miért fontos:** Magyarország Európa egyik legmagasabb parlagfű-terhelésű országa; Budapest lakói 15-20%-a allergiás
**Adatforrás:** Open-Meteo Air Quality API (`grass_pollen`, `birch_pollen`, `alder_pollen` változók, µg/m³)
**Pollen szezonok Budapesten:**
- Nyír: február–április
- Fű: május–július  
- Éger: február–március
- Parlagfű: augusztus–október (legsúlyosabb!)

**API hívás:**
```
https://air-quality-api.open-meteo.com/v1/air-quality
  ?latitude={lat}&longitude={lon}
  &hourly=grass_pollen,birch_pollen,alder_pollen
  &forecast_days=7
  &timezone=Europe/Budapest
```

**Skálázás:** 0–30 µg/m³ = Alacsony, 30–90 = Mérsékelt, >90 = Magas (CAMS európai küszöbök alapján)

**UI:** Három kártya napi értékkel + 7 napos mini barcharttal + "ma mit vigyél magaddal" ikon (zsebkendő / gyógyszer szimbolika)

---

#### Funkció 2: Lokális Zöld Pontszám (Green Index)
**Mit mutat:** 0–100 pontos zöldelérési index az épület körüli 500m sugarú körre számítva OSM adatból
**Metodológia** (tudományos irodalom alapján: NDVI + park %, legközelebbi park):
```
GreenScore = 
  (park_terület_500m / 500m_kör_terület) * 40   // zöldfelület arány
+ (fák_száma_200m / 50).clamp(0,1) * 30          // faállomány sűrűség
+ (1 - legközelebbi_park_km / 0.5).clamp(0,1) * 30  // park elérhetőség
```

**Overpass lekérdezés:**
```
[out:json];
(
  // Parkok 500m-en belül
  way[leisure=park](around:500,{lat},{lon});
  relation[leisure=park](around:500,{lat},{lon});
  // Fák 200m-en belül
  node[natural=tree](around:200,{lat},{lon});
  // Zöldterületek
  way[landuse=grass](around:500,{lat},{lon});
  way[natural=wood](around:500,{lat},{lon});
  way[landuse=forest](around:500,{lat},{lon});
  way[leisure=garden](around:500,{lat},{lon});
  way[leisure=playground](around:300,{lat},{lon});
  way[leisure=sports_centre](around:500,{lat},{lon});
);
out body;
>;
out skel qt;
```

**Cacheing:** Supabase `building_green_cache` táblában 7 napig; frissítés superadmin jobs-ból

**UI:** Körös gauge widget (0-100), mellette a legközelebbi park neve + távolsága, fa-ikonok a sűrűséghez, "500m-en belüli zöldfelület" megjelenítése a térképen Leaflet polygonként

---

#### Funkció 3: UV-index + Időjárás panel
**Mit mutat:** Aktuális UV-index + ma max + 7 napos UV + hőmérséklet, szél, csapadék forecast
**Miért fontos:** Erkély és tetőterasz használathoz, napvédelem; a szél közvetlenül befolyásolja az AQI-t
**Adatforrás:** Open-Meteo Weather API + Air Quality API (UV)

**API hívás:**
```
https://api.open-meteo.com/v1/forecast
  ?latitude={lat}&longitude={lon}
  &hourly=uv_index,temperature_2m,wind_speed_10m,wind_direction_10m,precipitation_probability
  &daily=uv_index_max,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_sum
  &timezone=Europe/Budapest
  &forecast_days=7
```

**UV skála** (WHO):
- 0-2: Alacsony (zöld) — nincs védelem szükséges
- 3-5: Mérsékelt (sárga) — napszemüveg, kalap
- 6-7: Magas (narancs) — fényvédő SPF 30+
- 8-10: Nagyon magas (piros) — kerülje a csúcsidőt (10-14h)
- 11+: Extrém (lila) — maradjon árnyékban

**UI:** UV gauge szám + emoji + tanács + "szélirány és szélsebesség" kompasz widget + 7 napos hőmérsékleti és csapadék sávchart

---

#### Funkció 4: Napenergia-potenciál (PVGIS)
**Mit mutat:** Az épület tetőjének becsült napelemtermelési kapacitása kWh/m²/év + CO2-megtakarítás számológép
**Adatforrás:** EU JRC PVGIS 5.3 REST API (ingyenes, nincs kulcs)

**API hívás:**
```
https://re.jrc.ec.europa.eu/api/v5_3/PVcalc
  ?lat={lat}&lon={lon}
  &peakpower=1          // 1 kWp referenciarendszer
  &loss=14              // tipikus veszteség %
  &outputformat=json
  &raddatabase=PVGIS-SARAH3
```

**Visszatérési értékek:**
- `outputs.totals.fixed.E_y`: éves termelés kWh/kWp
- `outputs.totals.fixed.H_i_opt`: optimális döntésszögön bejövő besugárzás kWh/m²/év
- `outputs.totals.fixed.SD_y`: szórás

**Számítás:** Budapest tipikus tetőfelület = 100–600 m² → max beépíthető kapacitás:
```
kapacitás_kWp = (tetőfelület_m² * 0.15) // ~15% hatásfok
éves_termelés_kWh = kapacitás_kWp * E_y_value
CO2_megtakarítás_kg = éves_termelés_kWh * 0.233  // HU grid factor
```

**Cache:** Supabase `building_solar_cache`, TTL 30 nap (PVGIS adat évi 1x változik)

**UI:** Napot ábrázoló radial progress, kWh/év szám, CO2 megtakarítás, és egy slider: "Ha X m² napelemet szerelnétek" → dinamikus számítás

---

#### Funkció 5: Összetett Környezeti Pontszám (KörnyezetScore™)
**Mit mutat:** 0–100 pontos összesített környezeti minőségszám az épületre, valós idejű adatokból

**Összetevők és súlyok** (WHO és irodalmi alapon):
```
KörnyezetScore = 
  (1 - normalize(AQI, 0, 200)) * 35       // Levegőminőség (35%)
+ normalize(GreenScore, 0, 100) * 25       // Zöld index (25%)
+ (1 - normalize(pollenMax, 0, 150)) * 15  // Pollen terhelés (15%)
+ (1 - normalize(UV, 0, 11)) * 10          // UV terhelés (10%)
+ noise_score * 15                          // Zajbecslés (15%)
```

**Zajbecslés** (nincs szabad EU noise API de közelítés OSM-ből):
```
noise_score = 1.0
- 0.3 ha főút (highway=primary/trunk) < 100m
- 0.2 ha vasút (railway=rail) < 200m
- 0.1 ha tram (railway=tram) < 100m
- 0.15 ha busy secondary < 150m
Minimum: 0.0, Maximum: 1.0
```
Ez OSM-ből `around:N,{lat},{lon}` lekérdezéssel, Supabase-ben cachelt

**UI:** Nagy körös gauge/dial tetején az oldalnak, szín skálán (piros → sárga → zöld), mellette a 5 összetevő tooltip-ben, "Budapest átlag: 62" benchmark

---

### Iteráció 7: UX és technikai finomítások

**Navigáció:** Helyett 2 tab → scrollozható egységes oldal szakaszokkal, sticky "Ugrás..." gyors navigáció gombokkal (mint a panellako.hu dashboard)

**Teljesítmény:**
- Legfontosabb adatok (AQ + pollen) eager load page loadon
- Zöld index + solar + OSM: lazy load scrollra/kattintásra
- Service Worker cache: AQ data 5 perces offline support

**Értesítések:** 
- Napi push notification (ha push engedélyezve): "Ma magas pollenszint — ezüst fű, nyír"
- AQI > 100 riasztás (már van push infrastruktúra a projekten)

**Lokalizáció:** Minden string a meglévő `src/i18n/resources/hu.ts` + `en.ts` fájlokba

---

## II. TELJES IMPLEMENTÁCIÓS PROMPT CSOMAG

Az alábbi promptok sorrendben hajtandók végre, önállóan is megérthetők.

---

### PROMPT 1: Adatbázis migrációk

```
Feladat: Hozz létre 3 új Supabase migrációt a panellako projektben a kornyezet oldal bővítéséhez.

Fájlok: supabase/migrations/ mappában

MIGRÁCIÓ 1: 20260520_building_green_cache.sql
-- Épületenkénti OSM zöld index cache
create table if not exists public.building_green_cache (
  id                  bigint generated always as identity primary key,
  building_id         uuid not null references public.buildings(id) on delete cascade,
  green_score         numeric(5,1) not null,  -- 0-100
  park_area_500m_m2   numeric(12,0),           -- park terület 500m-en belül m²-ben
  tree_count_200m     integer,                 -- fák száma 200m-en belül
  nearest_park_name   text,
  nearest_park_m      numeric(7,0),
  playground_count    integer,
  sports_count        integer,
  overpass_raw        jsonb,                   -- nyers Overpass válasz cache
  computed_at         timestamptz not null default now(),
  valid_until         timestamptz not null generated always as (computed_at + interval '7 days') stored,
  UNIQUE(building_id)
);
alter table public.building_green_cache enable row level security;
create policy "Authenticated can read" on public.building_green_cache for select to authenticated using (true);
create policy "Service role can write" on public.building_green_cache for all using (true);

MIGRÁCIÓ 2: 20260520_building_solar_cache.sql
create table if not exists public.building_solar_cache (
  id               bigint generated always as identity primary key,
  building_id      uuid not null references public.buildings(id) on delete cascade,
  e_y_kwh_kwp      numeric(8,2),   -- éves termelés kWh/kWp
  h_i_opt          numeric(8,2),   -- optimális besugárzás kWh/m²/év
  e_d_kwh_kwp      numeric(8,2),   -- napi átlag kWh/kWp
  pvgis_raw        jsonb,
  computed_at      timestamptz not null default now(),
  valid_until      timestamptz not null generated always as (computed_at + interval '30 days') stored,
  UNIQUE(building_id)
);
alter table public.building_solar_cache enable row level security;
create policy "Authenticated can read" on public.building_solar_cache for select to authenticated using (true);
create policy "Service role can write" on public.building_solar_cache for all using (true);

MIGRÁCIÓ 3: 20260520_building_env_score.sql
create table if not exists public.building_env_score (
  id              bigint generated always as identity primary key,
  building_id     uuid not null references public.buildings(id) on delete cascade,
  total_score     numeric(5,1) not null,   -- 0-100
  air_score       numeric(5,1),
  green_score     numeric(5,1),
  pollen_score    numeric(5,1),
  uv_score        numeric(5,1),
  noise_score     numeric(5,1),
  aqi_snapshot    integer,
  computed_at     timestamptz not null default now(),
  UNIQUE(building_id)
);
alter table public.building_env_score enable row level security;
create policy "Authenticated can read" on public.building_env_score for select to authenticated using (true);
create policy "Service role can write" on public.building_env_score for all using (true);
```

---

### PROMPT 2: Open-Meteo Air Quality + Pollen API route

```
Feladat: Hozd létre az app/api/environment/air-quality/route.ts fájlt, amely
az Open-Meteo Air Quality API-t hívja levegőminőségi + pollen + UV adatokért.
Ez FELVÁLTJA az app/api/air-quality/route.ts-t.

Követelmények:
- force-dynamic
- GET handler, params: lat, lon (default Budapest: 47.4979, 19.0402)
- Open-Meteo endpoint: https://air-quality-api.open-meteo.com/v1/air-quality
  hourly változók:
    pm2_5, pm10, nitrogen_dioxide, ozone, sulphur_dioxide, carbon_monoxide,
    dust, uv_index, grass_pollen, birch_pollen, alder_pollen
  forecast_days=7, timezone=Europe%2FBudapest
- In-memory cache: 30 perc per koordináta (kerekített 2 tizedesre)
- Visszatérési típus:

export interface EnvAirQualityResult {
  // Aktuális értékek (legutolsó teljes óra)
  current: {
    pm25:      number | null;
    pm10:      number | null;
    no2:       number | null;
    o3:        number | null;
    so2:       number | null;
    co:        number | null;
    dust:      number | null;
    uvIndex:   number | null;
    grassPollen:  number | null;
    birchPollen:  number | null;
    alderPollen:  number | null;
    aqi:          number;   // számított US EPA AQI PM2.5 alapján
    aqiLabel:     string;   // 'Jó' | 'Mérsékelt' | ...
    aqiColor:     string;   // hex
  };
  // 7 napos napi összegzők
  daily: Array<{
    date:        string;   // ISO YYYY-MM-DD
    avgPm25:     number;
    maxUv:       number;
    maxGrassPollen: number;
    maxBirchPollen: number;
    maxAlderPollen: number;
  }>;
  // Hourly az első 24 órára (trend sparkline-hoz)
  hourly24: Array<{
    time:    string;
    pm25:    number | null;
    uvIndex: number | null;
  }>;
  fetchedAt: string;
  source:    'open-meteo';
}

AQI számítás PM2.5 alapján (US EPA breakpoints):
- 0-12.0 µg/m³ → AQI 0-50 (Jó)
- 12.1-35.4 → AQI 51-100 (Mérsékelt)
- 35.5-55.4 → AQI 101-150 (Érzékenyek figyeljenek)
- 55.5-150.4 → AQI 151-200 (Egészségtelen)
- 150.5-250.4 → AQI 201-300 (Nagyon egészségtelen)
- 250.5+ → AQI 301+ (Veszélyes)

Pollen szintek (µg/m³ → szint):
- grass_pollen < 10: 'low' | 10-50: 'moderate' | >50: 'high'
- birch_pollen < 10: 'low' | 10-80: 'moderate' | >80: 'high'
- alder_pollen < 5: 'low' | 5-30: 'moderate' | >30: 'high'

Fallback: ha Open-Meteo nem elérhető, próbáld az AQICN-t (meglévő fetchAQICN logikával).
Importáld a meglévő aqiInfo() függvényt az air-quality/route.ts-ből (shared helper).

Hibakezelés: 
- Ha mindkét forrás meghal, adjon vissza { current: mockData, _mock: true }
- Soha ne dobjón 500-as hibát, mindig legyen fallback JSON
```

---

### PROMPT 3: Weather API route

```
Feladat: Hozd létre az app/api/environment/weather/route.ts fájlt.

Open-Meteo Weather API: https://api.open-meteo.com/v1/forecast
Params:
  latitude, longitude
  hourly: temperature_2m, wind_speed_10m, wind_direction_10m, 
          precipitation_probability, relative_humidity_2m
  daily: uv_index_max, temperature_2m_max, temperature_2m_min, 
         wind_speed_10m_max, precipitation_sum, sunrise, sunset
  timezone: Europe/Budapest
  forecast_days: 7

Cache: 60 perc in-memory per koordináta

Export interface EnvWeatherResult {
  current: {
    temperature:     number;
    humidity:        number;
    windSpeed:       number;     // km/h
    windDirection:   number;     // fok, 0=É, 90=K, 180=D, 270=Ny
    windDirectionLabel: string;  // 'É', 'ÉK', 'K', 'DK', 'D', 'DNy', 'Ny', 'ÉNy'
    precipProb:      number;     // 0-100 %
    uvIndex:         number;
    uvLabel:         string;     // 'Alacsony' | 'Mérsékelt' | 'Magas' | 'Nagyon magas' | 'Extrém'
    uvColor:         string;     // hex
  };
  daily: Array<{
    date:      string;
    tempMax:   number;
    tempMin:   number;
    windMax:   number;
    precipSum: number;
    uvMax:     number;
    sunrise:   string;
    sunset:    string;
    dayLengthH: number;  // nappalH = (sunset-sunrise) percben
  }>;
  fetchedAt: string;
}

windDirectionLabel logika:
  0-22.5 | 337.5-360 → 'É'
  22.5-67.5  → 'ÉK'
  67.5-112.5 → 'K'
  112.5-157.5→ 'DK'
  157.5-202.5→ 'D'
  202.5-247.5→ 'DNy'
  247.5-292.5→ 'Ny'
  292.5-337.5→ 'ÉNy'

UV kategória (WHO):
  0-2: { label: 'Alacsony', color: '#22c55e' }
  3-5: { label: 'Mérsékelt', color: '#eab308' }
  6-7: { label: 'Magas', color: '#f97316' }
  8-10: { label: 'Nagyon magas', color: '#ef4444' }
  11+: { label: 'Extrém', color: '#a855f7' }
```

---

### PROMPT 4: Green Space API route (OSM/Overpass + Supabase cache)

```
Feladat: Hozd létre az app/api/environment/green/route.ts fájlt.

Működés:
1. GET ?buildingId=UUID&lat=N&lon=N
2. Supabase-ben ellenőriz: building_green_cache WHERE building_id=? AND valid_until > now()
3. Ha van friss cache → visszaadja
4. Ha nincs → Overpass lekérdezés → számítás → Supabase upsert → visszaadja

Overpass endpoint: https://overpass-api.de/api/interpreter
Timeout: 30s, signal: AbortSignal.timeout(30000)

Overpass QL query (POST, body: application/x-www-form-urlencoded, data=<query>):
[out:json][timeout:25];
(
  way[leisure=park](around:500,{lat},{lon});
  relation[leisure=park](around:500,{lat},{lon});
  way[landuse=grass](around:500,{lat},{lon});
  way[natural=wood](around:500,{lat},{lon});
  way[landuse=forest](around:500,{lat},{lon});
  way[leisure=garden](around:500,{lat},{lon});
  way["leisure"="recreation_ground"](around:500,{lat},{lon});
  node[natural=tree](around:200,{lat},{lon});
  way[leisure=playground](around:300,{lat},{lon});
  node[leisure=playground](around:300,{lat},{lon});
  way[leisure=sports_centre](around:500,{lat},{lon});
  node[leisure=pitch](around:300,{lat},{lon});
);
out body;
>;
out skel qt;

Zöldelérési pontszám számítás:
function calcGreenScore(elements: OverpassElement[], lat: number, lon: number): GreenData {
  // Park terület (polygon way area közelítés: way node-ok konvex burkolója)
  // Tree count (node[natural=tree])
  // Legközelebbi park távolsága (haversine a centroidhoz)
  
  const parkAreaM2 = ... // way polygonok összesített területe m²-ben (shoelace formula)
  const treeCount = elements.filter(e => e.type==='node' && e.tags?.natural==='tree').length
  const nearestPark = ... // legközelebbi park centroid távolsága méterben
  const playgroundCount = ...
  const sportsCount = ...
  
  // Pontszám: 0-100
  const areaScore = Math.min(parkAreaM2 / 50000, 1) * 40  // 50,000 m² = max
  const treeScore = Math.min(treeCount / 50, 1) * 30      // 50 fa = max
  const proximityScore = Math.max(0, 1 - nearestPark / 500) * 30  // 500m = 0 pont
  
  return {
    greenScore: Math.round(areaScore + treeScore + proximityScore),
    parkAreaM2: Math.round(parkAreaM2),
    treeCount,
    nearestParkName: ...,
    nearestParkM: Math.round(nearestPark),
    playgroundCount,
    sportsCount,
  }
}

Export interface GreenData {
  greenScore:      number;     // 0-100
  parkAreaM2:      number;
  treeCount:       number;
  nearestParkName: string;
  nearestParkM:    number;
  playgroundCount: number;
  sportsCount:     number;
  computedAt:      string;
  source:          'cache' | 'overpass';
}

Supabase client: service role key (SUPABASE_SERVICE_ROLE_KEY, nem az anon key!)
Hibakezelés: ha Overpass timeout → return null (a kliens "adat nem elérhető" állapotot mutat)
```

---

### PROMPT 5: Solar potential API route (PVGIS)

```
Feladat: Hozd létre az app/api/environment/solar/route.ts fájlt.

PVGIS 5.3 REST API:
URL: https://re.jrc.ec.europa.eu/api/v5_3/PVcalc
Params: lat, lon, peakpower=1, loss=14, outputformat=json, raddatabase=PVGIS-SARAH3
Method: GET
Timeout: 15s
Rate limit: 30 req/s/IP (nincs napi limit)

GET handler params: ?buildingId=UUID&lat=N&lon=N

Működés:
1. Supabase building_solar_cache check (30 napos TTL)
2. Ha nincs → PVGIS hívás → cache írás → return
3. Return: SolarData

Export interface SolarData {
  eYearKwhKwp:   number;   // éves termelés kWh/kWp (tipikusan 900-1100 Bp-en)
  hOptKwhM2:     number;   // optimális besugárzás kWh/m²/év
  eDayKwhKwp:    number;   // napi átlag
  monthly: Array<{         // 12 hónap
    month:     number;     // 1-12
    e:         number;     // kWh/kWp
  }>;
  estimatedFor1kWp: {
    annualKwh:    number;
    co2SavedKg:   number;  // * 0.233 (HU 2024 grid factor)
  };
  computedAt: string;
  source:     'cache' | 'pvgis';
}

PVGIS JSON válasz mező mapping:
  outputs.totals.fixed.E_y → eYearKwhKwp
  outputs.totals.fixed.H_i_opt → hOptKwhM2
  outputs.totals.fixed.E_d → eDayKwhKwp
  outputs.monthly.fixed[i].E_m → monthly[i].e

Hibakezelés: ha PVGIS nem elérhető → return null, kliens "adat nem elérhető"
```

---

### PROMPT 6: Noise score segédszámítás az OSM green query-be integrálva

```
A green/route.ts Overpass lekérdezésébe add hozzá:

Az Overpass QL query bővítése zajforrásokkal:
  way[highway~"^(motorway|trunk|primary)$"](around:200,{lat},{lon});
  way[highway=secondary](around:150,{lat},{lon});
  way[railway=rail](around:300,{lat},{lon});
  way[railway=tram](around:150,{lat},{lon});
  way[aeroway=runway](around:2000,{lat},{lon});

Noise score számítás:
function calcNoiseScore(elements: OverpassElement[], lat: number, lon: number): number {
  let penalty = 0;
  for (const el of elements) {
    const hw = el.tags?.highway;
    const rw = el.tags?.railway;
    const aw = el.tags?.aeroway;
    const dist = minDistanceToWay(el, lat, lon); // polyline-hoz legközelebbi pont
    
    if ((hw === 'motorway' || hw === 'trunk') && dist < 200) penalty += (1 - dist/200) * 0.35;
    if (hw === 'primary' && dist < 150) penalty += (1 - dist/150) * 0.25;
    if (hw === 'secondary' && dist < 100) penalty += (1 - dist/100) * 0.15;
    if (rw === 'rail' && dist < 300) penalty += (1 - dist/300) * 0.30;
    if (rw === 'tram' && dist < 100) penalty += (1 - dist/100) * 0.15;
    if (aw === 'runway' && dist < 2000) penalty += (1 - dist/2000) * 0.40;
  }
  return Math.max(0, Math.min(1, 1 - penalty));  // 0=nagyon zajos, 1=csendes
}

Visszaadandó mezők a GreenData interfészbe:
  noiseScore:         number;   // 0.0-1.0
  mainRoadDistM:      number | null;  // legközelebbi főút m-ben (null = nincs 500m-en)
  railDistM:          number | null;
```

---

### PROMPT 7: Összetett KörnyezetScore számítás és API route

```
Feladat: Hozd létre az app/api/environment/score/route.ts fájlt.

GET ?buildingId=UUID&lat=N&lon=N

Párhuzamosan hívja:
1. /api/environment/air-quality?lat=&lon=
2. /api/environment/green?buildingId=&lat=&lon=
(A weather és solar NEM szükséges a score-hoz, azok display-only)

Pontszám formula:
function calcEnvScore(aq: EnvAirQualityResult, green: GreenData | null): EnvScore {
  // 1. Levegő komponens (35%)
  const aqNorm = Math.max(0, 1 - (aq.current.aqi / 200));
  const airScore = aqNorm * 35;

  // 2. Zöld komponens (25%)
  const greenScore = green ? (green.greenScore / 100) * 25 : 12.5; // half if unknown
  
  // 3. Pollen komponens (15%)
  const maxPollen = Math.max(
    aq.current.grassPollen ?? 0,
    aq.current.birchPollen ?? 0,
    aq.current.alderPollen ?? 0,
  );
  const pollenNorm = Math.max(0, 1 - maxPollen / 150);
  const pollenScore = pollenNorm * 15;
  
  // 4. UV komponens (10%) - ma max UV alapján
  const todayUV = aq.daily[0]?.maxUv ?? 5;
  const uvNorm = Math.max(0, 1 - todayUV / 11);
  const uvScore = uvNorm * 10;
  
  // 5. Zaj komponens (15%)
  const noiseScore = green ? green.noiseScore * 15 : 10; // 2/3 ha ismeretlen
  
  const total = airScore + greenScore + pollenScore + uvScore + noiseScore;
  
  return {
    total:        Math.round(total),
    airScore:     Math.round(airScore),
    greenScore:   Math.round(greenScore),
    pollenScore:  Math.round(pollenScore),
    uvScore:      Math.round(uvScore),
    noiseScore:   Math.round(noiseScore),
    label:        total >= 80 ? 'Kiváló' : total >= 60 ? 'Jó' : total >= 40 ? 'Mérsékelt' : 'Gyenge',
    color:        total >= 80 ? '#22c55e' : total >= 60 ? '#84cc16' : total >= 40 ? '#eab308' : '#ef4444',
  };
}

Supabase upsert a building_env_score táblába minden kiszámítás után.

Export interface EnvScore {
  total:       number;   // 0-100
  airScore:    number;   // 0-35
  greenScore:  number;   // 0-25
  pollenScore: number;   // 0-15
  uvScore:     number;   // 0-10
  noiseScore:  number;   // 0-15
  label:       string;
  color:       string;
}
```

---

### PROMPT 8: Új environment-page-client.tsx — Teljes rekonstrukció

```
Feladat: Írd újra teljesen a components/environment-page-client.tsx fájlt.
Az oldal struktúrája NEM tab-alapú lesz, hanem SCROLLOZHATÓ SZAKASZOK.

Props (változatlan):
interface Props {
  buildingId:      string;
  buildingName:    string;
  buildingAddress: string;
  buildingLat:     number;
  buildingLon:     number;
}

OLDAL FELÉPÍTÉSE (fentről le):
┌─────────────────────────────────────────────────────────┐
│ HEADER (sticky) — visszagomb + épület neve + "Környezet" │
│ GYORS NAVIGÁCIÓ — 5 szekció anchor linkekkel             │
├─────────────────────────────────────────────────────────┤
│ 1. HERO: KörnyezetScore™ (összetett pontszám widget)     │
├─────────────────────────────────────────────────────────┤
│ 2. LEVEGŐMINŐSÉG — AQI + pollutants + 24h trend chart   │
│    + 7 napos PM2.5 és UV forecast                        │
├─────────────────────────────────────────────────────────┤
│ 3. POLLEN & UV — Pollen index (fű/nyír/éger) + UV gauge │
│    + szél/időjárás widget                                │
├─────────────────────────────────────────────────────────┤
│ 4. ZÖLD KÖRNYEZET — Green score + parktérkép Leafleten  │
│    + legközelebbi park + fa-sűrűség + zajindikátor       │
├─────────────────────────────────────────────────────────┤
│ 5. NAPENERGIA — PVGIS solar gauge + havi barchart        │
│    + CO2 slider számológép                               │
├─────────────────────────────────────────────────────────┤
│ 6. KERÉKPÁROS INFRASTRUKTÚRA (meglévő CyclingMap)       │
└─────────────────────────────────────────────────────────┘

STATE:
const [aq,      setAq]      = useState<EnvAirQualityResult | null>(null);
const [weather, setWeather] = useState<EnvWeatherResult | null>(null);
const [green,   setGreen]   = useState<GreenData | null>(null);
const [solar,   setSolar]   = useState<SolarData | null>(null);
const [score,   setScore]   = useState<EnvScore | null>(null);
const [loading, setLoading] = useState({ aq: true, weather: true, green: false, solar: false });

BETÖLTÉSI SORREND:
1. useEffect eager load: párhuzamosan fetch AQ + weather + score → ezek gyorsak
2. useEffect lazy load (IntersectionObserver): green szekciónál → Overpass query
3. useEffect lazy load: solar szekciónál → PVGIS query

SZEKCIÓ 1 — KörnyezetScore Hero:
- Nagy körös "gauge" widget: 0-100 szám, szín-gradiens, label ("Jó / Mérsékelt / Kiváló")
- 5 kis komponens-csík alatta (levegő, zöld, pollen, UV, zaj) egyenként tooltipekkel
- "Budapest átlag: ~58" benchmark összehasonlítás
- Betöltési skeleton: animált körös placeholder

SZEKCIÓ 2 — Levegőminőség:
- Bal: AQI nagy szám (szín + glow, mint most) + 6 pollutant bar (PM2.5/PM10/NO2/O3/SO2/CO)
- Jobb: 24 órás sparkline chart (PM2.5 és UV index, dual axis)
  - Lightweight chart: csak CSS + SVG path (ne importálj recharts-ot!)
  - X tengely: óra (0:00, 6:00, 12:00, 18:00, 24:00)
  - Y tengely: µg/m³
- Alul: 7 napos napi átlag PM2.5 sávchart (mint a meglévő)
- Adatforrás badge: "Open-Meteo · CAMS · Valós idejű"
- "Utoljára frissítve: X" szöveg

SZEKCIÓ 3 — Pollen & UV:
Layout: 2 kártya egymás mellett desktop-on, egymás alatt mobilon

POLLEN KÁRTYA:
- Header: virág ikon + "Pollenterhelés" + aktuális szezon badge
  (aktív szezon logika: február-április = nyír, május-július = fű, aug-okt = parlagfű)
- 3 pollen típus sor (fű, nyír, parlagfű) mindegyiknél:
  * Ikon + név + aktuális µg/m³ érték
  * Szintbadge: "Alacsony / Mérsékelt / Magas" (zöld/sárga/piros)
  * Vizuális bar (0-100% max értékig)
- 7 napos mini forecast: dátum + max napi érték kis cellákként
- Figyelmeztetés: ha bármelyik > 90: "⚠️ Ma allergiásoknak ajánlott gyógyszert bevenni"

UV KÁRTYA:
- Nagy UV szám (0-12) + szín + WHO kategória badge
- UV kompasz-szerű vizualizáció (félkörös skála)
- "Csúcs UV: 13:00–15:00 között" (napcsúcs ideje szezonalisan)
- Ajánlások:
  * UV < 3: "Nincs védelem szükséges"
  * UV 3-5: "Napszemüveg, kalap ajánlott"
  * UV 6-7: "SPF 30+ fényvédő"  
  * UV 8-10: "Kerülje 10-14h a napot, SPF 50+"
  * UV 11+: "Maradjon árnyékban!"
- Szél widget: szélirány kompasz (SVG nyíl) + szélsebesség km/h

SZEKCIÓ 4 — Zöld Környezet:
Layout: 3 kártya felső sorban + Leaflet térkép alul

KÁRTYÁK:
1. Green Score gauge (körös, 0-100) + "Budapest átlag: 52"
2. Legközelebbi park: neve + távolsága + gyalogos idő (@ 4 km/h) + park ikon
3. Faállomány: fa ikon + "X fa 200m-en belül" + játszótér/sport counter

ZAJINDIKÁTOR csík (teljes szélességben):
- Skála: "Csendes ●─────●─────●─────● Zajos"
- Jelölő: noise score alapján (0=zajos, 1=csendes)
- Ha főút < 100m: "⚠️ Főút ~Xm — megnövelt zajterhelés"
- Ha vasút < 200m: "🚂 Vasút ~Xm távolságra"

LEAFLET TÉRKÉP (280px magas):
- Épület marker (meglévő stílus)
- Overpass parkok: zöld polygon fill (opacity 0.3)
- Overpass fák: zöld pont markerek
- 500m sugarú kör az épület körül (dash-dot szegély)
- Réteg toggle: "Parkok" / "Fák" checkbox

SZEKCIÓ 5 — Napenergia:
Layout: bal gauge + jobb havi barchart

SOLAR GAUGE:
- Nap ikon + animált "napfény sugarak" SVG
- Fő szám: "{eYearKwhKwp} kWh/kWp/év"
- Benchmark: "Budapest átlag: ~1050 kWh/kWp/év"
- Alcím: "Az EU JRC PVGIS műholdas mérése alapján"

HAVI BARCHART (SVG, pure CSS):
- 12 oszlop január–december
- Magasság arányos az E_m értékkel
- Szín: téli=kék, tavaszi/őszi=sárga, nyári=piros
- Hover tooltip: hónap neve + kWh/kWp

CO2 SLIDER KALKULÁTOR:
```
<label>Ha {X} kWp napelemet szerelnétek:</label>
<input type="range" min={1} max={50} step={1} value={kwp} />
Éves termelés: {(kwp * eYearKwhKwp).toFixed(0)} kWh
CO₂ megtakarítás: {(kwp * eYearKwhKwp * 0.233).toFixed(0)} kg/év
Ez {Math.round(kwp * eYearKwhKwp * 0.233 / 21)} szemeteszsák égetés CO₂ egyenértéke
```

SZEKCIÓ 6 — Kerékpáros (meglévő CyclingMap változatlan):
A meglévő cycling map komponens beágyazva.

---
DARK THEME: marad a meglévő #070d1a háttér, fehér/slate szövegek.
RESPONSIVE: sm: 1 oszlop, lg: 2 oszlop ahol releváns.
ANIMÁCIÓK: fade-in szekciónként (opacity 0→1, translate-y 8px→0 staggered)
SKELETONOK: minden szekció betöltési állapothoz.
HIBA ÁLLAPOT: minden szekciónál külön hibaüzenet, retry gombbal.
LOKALIZÁCIÓ: minden string useI18n()-ből, de a hu.ts/en.ts bővítésével.
```

---

### PROMPT 9: Pollen UX komponens (önálló)

```
Feladat: Hozd létre a components/pollen-panel.tsx kliens komponenst.

Props:
interface PollenPanelProps {
  current: {
    grassPollen:  number | null;
    birchPollen:  number | null;
    alderPollen:  number | null;
  };
  daily: Array<{
    date:           string;
    maxGrassPollen: number;
    maxBirchPollen: number;
    maxAlderPollen: number;
  }>;
}

Pollen szint helper:
type PollenLevel = 'low' | 'moderate' | 'high' | 'unknown';
function pollenLevel(value: number | null, thresholds: [number, number]): PollenLevel {
  if (value === null) return 'unknown';
  if (value < thresholds[0]) return 'low';
  if (value < thresholds[1]) return 'moderate';
  return 'high';
}
const THRESHOLDS = {
  grass:  [10, 50] as [number, number],
  birch:  [10, 80] as [number, number],
  alder:  [5,  30] as [number, number],
} satisfies Record<string, [number, number]>;

Aktív szezon detekció (hónap alapján):
const month = new Date().getMonth() + 1; // 1-12
const activePollens: string[] = [];
if (month >= 2 && month <= 4) activePollens.push('birch', 'alder');
if (month >= 5 && month <= 7) activePollens.push('grass');
if (month >= 8 && month <= 10) activePollens.push('ragweed'); // nincs API data de jelöljük

LEVEL COLORS:
  low:     { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Alacsony' }
  moderate:{ bg: 'bg-amber-500/10',   text: 'text-amber-400',   label: 'Mérsékelt' }
  high:    { bg: 'bg-red-500/10',     text: 'text-red-400',     label: 'Magas' }
  unknown: { bg: 'bg-slate-500/10',   text: 'text-slate-500',   label: '—' }

3 SOR (fű/nyír/éger):
- Bal: növény neve + szezon badge (ha aktív: animált "🌿 Aktív szezon")
- Középen: progress bar (0 → max threshold érték)
- Jobb: µg/m³ érték + level badge

7 napos mini forecast GRID:
- 7 cella, mindegyikben: nap neve + kis körök (3 szín) a napi max szintekhez
- Hover: tooltip a konkrét értékekkel

Parlagfű figyelmeztetés (augusztus–október):
Ha month >= 8 && month <= 10:
  <div class="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
    ⚠️ Parlagfű szezon aktív. A CAMS modell parlagfű-specifikus adatot nem közöl,
    de Budapest tipikusan MAGAS szinttel rendelkezik aug–okt között.
    Allergiásoknak ajánlott EAN adatokat követni: pollencount.eu/budapest-hu
  </div>
```

---

### PROMPT 10: UV + Szél widget komponens

```
Feladat: Hozd létre a components/uv-wind-panel.tsx komponenst.

Props:
interface UvWindPanelProps {
  uvIndex:          number;
  uvLabel:          string;
  uvColor:          string;
  windSpeed:        number;      // km/h
  windDirection:    number;      // fok
  windDirectionLabel: string;    // 'É', 'ÉK', stb.
  precipProb:       number;      // 0-100%
  temperature:      number;      // °C
}

UV FÉLKÖRÖS GAUGE (pure SVG, nincs külső lib):
- Félkörös arc (180°, balról jobbra)
- 6 szegmens: zöld, sárga, narancs, piros, lila, sötétlila
- Mozgó mutató a jelenlegi UV értékre (arcPath transform)
- Középen nagy szám + WHO kategória szöveg
- SVG viewBox="0 0 200 120"

SVG arc path számítás:
function uvToAngle(uv: number): number {
  return Math.min(uv / 11, 1) * 180; // 0-180 fok
}

SZÉL KOMPASZ (SVG körös):
- Fekete háttér kör
- 8 iránypont (É, ÉK, K, DK, D, DNy, Ny, ÉNy) kis pontokkal
- Piros-fehér nyíl a szélirányra fordítva
- Középen: szélsebesség szám + km/h
- Alatta: szöveg label + "Sebesség: X km/h (Beaufort Y)"

Beaufort skála (közelítés):
  < 2: 'Szélcsend'
  2-12: 'Gyenge szél'
  12-20: 'Enyhe szél'
  20-29: 'Mérsékelt szél'
  29-39: 'Élénk szél'
  > 39: 'Erős szél / Szél-vihar'

HATÁS AZ AQI-RA magyarázat chip:
  windSpeed < 5  → "⚠️ Szélcsend — szennyezők felhalmozódhatnak"
  windSpeed 5-15 → "↗️ Enyhe szél — átlagos szétoszlás"
  windSpeed > 15 → "✓ Jó szél — szennyezőket elviszi"
```

---

### PROMPT 11: KörnyezetScore™ Hero widget

```
Feladat: Hozd létre a components/env-score-hero.tsx kliens komponenst.

Props:
interface EnvScoreHeroProps {
  score: EnvScore | null;
  loading: boolean;
}

ANIMÁLT KÖRÖS GAUGE (pure SVG):
- viewBox="0 0 160 160", cx=80, cy=80, r=65
- Háttér kör: stroke-dasharray="408 0" (2*pi*65 ≈ 408), stroke-width=12, stroke=white/5
- Animált ív: strokeDasharray={`${score.total / 100 * 408} 408`}
  stroke: score.color, strokeLinecap="round"
  transition: 1.2s ease-out (useMemo-val delayed state)
- Közép szöveg: nagy szám + "/ 100" kis betűvel + label ("Jó")

5 KOMPONENS SÁVCSOPORT (alul):
Mindegyik sor:
  [ikon] [cím szöveg, balra] [...........░░░░] [szám/max, jobbra]
Komponensek:
  Wind (levegő)  → airScore / 35
  Leaf (zöld)    → greenScore / 25
  Flower (pollen)→ pollenScore / 15
  Sun (UV)       → uvScore / 10
  Volume2 (zaj)  → noiseScore / 15

Minden sávon tooltip (hover/focus): mi befolyásolja, mit jelent a szám

BENCHMARK CHIP: "Budapest átlag: ~58/100" szürke szöveg alul, forrás hivatkozással

BETÖLTÉSI SKELETON:
  - Pulzáló kör placeholder (w-40 h-40 rounded-full bg-white/5 animate-pulse)
  - 5 skeleton sor alatta

LOADING STATE: ha score === null && !loading: "Pontszám még nem elérhető" placeholder üzenet
```

---

### PROMPT 12: 24 órás sparkline chart (pure SVG)

```
Feladat: Hozd létre a components/sparkline-24h.tsx kliens komponenst
KÜLSŐ CHART LIBRARY NÉLKÜL (csak SVG + CSS).

Props:
interface SparklineProps {
  data: Array<{ time: string; pm25: number | null; uv: number | null }>;
  height?: number;  // default 80
}

SVG PATH GENERÁLÁS:
function buildPath(
  values: (number | null)[],
  maxVal: number,
  width: number,
  height: number,
): string {
  const step = width / (values.length - 1);
  const points: string[] = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === null) continue;
    const x = i * step;
    const y = height - (v / maxVal) * height * 0.9 - height * 0.05;
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(' ');
}

MEGJELENÍTÉS:
- SVG viewBox="0 0 480 {height}"
- Vízszintes grid vonalak (opacity 0.1)
- PM2.5 vonal: kék (#38bdf8), stroke-width=1.5
- UV vonal: sárga (#eab308), stroke-width=1.5, stroke-dasharray="4 2"
- Óra feliratok: 0:00, 6:00, 12:00, 18:00, 24:00 (x tengely)
- Jelmagyarázat: "— PM2.5 (µg/m³)" + "- - UV index" (jobb felső sarok)
- "Most" jelölő: függőleges piros vonal az aktuális óránál

Interaktivitás:
- SVG overlay transparent rect onMouseMove: tooltip mutatása
  (time, pm25 érték, uv érték)
- Tooltip: abszolút positioned div, megjelenik hover-re
```

---

### PROMPT 13: Lokalizáció kiterjesztés

```
Feladat: Add hozzá az alábbi kulcsokat MINDKÉT locale fájlba
(src/i18n/resources/hu.ts és src/i18n/resources/en.ts),
a meglévő namespace struktúrán belül.

Az összes string egy 'environment' namespace alá kerüljön.

Magyar (hu.ts):
environment: {
  // Navigáció
  pageTitle: 'Környezet',
  sections: {
    score:    'Környezeti pontszám',
    air:      'Levegőminőség',
    pollen:   'Pollen & UV',
    green:    'Zöld környezet',
    solar:    'Napenergia',
    cycling:  'Kerékpáros infrastruktúra',
  },
  // KörnyezetScore
  score: {
    label:     'KörnyezetScore',
    excellent: 'Kiváló',
    good:      'Jó',
    moderate:  'Mérsékelt',
    poor:      'Gyenge',
    benchmark: 'Budapest átlag: ~58/100',
    components: {
      air:    'Levegőminőség',
      green:  'Zöld index',
      pollen: 'Pollen terhelés',
      uv:     'UV-sugárzás',
      noise:  'Zajszint',
    },
  },
  // Levegőminőség
  air: {
    title:     'Levegőminőség',
    aqi:       'AQI index',
    labels: {
      good:         'Jó',
      moderate:     'Mérsékelt',
      sensitive:    'Érzékenyek figyeljenek',
      unhealthy:    'Egészségtelen',
      very_unhealthy: 'Nagyon egészségtelen',
      hazardous:    'Veszélyes',
    },
    advice: {
      good:         'Ideális szabadtéri tevékenységhez',
      moderate:     'Érzékenyek óvatosan a szabadban',
      sensitive:    'Asztmásoknak tartózkodjanak kint',
      unhealthy:    'Kerülje a hosszabb kinti tartózkodást',
      very_unhealthy: 'Maradjon bent, zárja az ablakokat',
      hazardous:    'Vészhelyzet! Ne hagyja el otthonát',
    },
    forecast7day: '7 napos PM2.5 előrejelzés',
    trend24h:    '24 órás trend',
    source:      'Open-Meteo · CAMS · Valós idejű',
  },
  // Pollen
  pollen: {
    title:    'Pollenterhelés',
    grass:    'Fű pollen',
    birch:    'Nyír pollen',
    alder:    'Éger pollen',
    ragweed:  'Parlagfű (szezonális)',
    levels: {
      low:      'Alacsony',
      moderate: 'Mérsékelt',
      high:     'Magas',
      unknown:  'Ismeretlen',
    },
    activeSeason:   'Aktív szezon',
    forecast7day:   '7 napos pollen-előrejelzés',
    ragweedWarning: 'Parlagfű szezon aktív. Allergiásoknak fokozott óvatosság ajánlott.',
  },
  // UV
  uv: {
    title:  'UV-index',
    levels: {
      low:       'Alacsony',
      moderate:  'Mérsékelt',
      high:      'Magas',
      very_high: 'Nagyon magas',
      extreme:   'Extrém',
    },
    advice: {
      low:       'Nincs védelem szükséges',
      moderate:  'Napszemüveg, kalap ajánlott',
      high:      'SPF 30+ fényvédő',
      very_high: 'Kerülje 10–14h a napot, SPF 50+',
      extreme:   'Maradjon árnyékban!',
    },
  },
  // Szél
  wind: {
    title:       'Szél',
    speed:       'Szélsebesség',
    direction:   'Irány',
    calm:        'Szélcsend',
    light:       'Gyenge szél',
    gentle:      'Enyhe szél',
    moderate:    'Mérsékelt szél',
    fresh:       'Élénk szél',
    strong:      'Erős szél',
    impactLow:   'Szennyezők felhalmozódhatnak',
    impactMed:   'Átlagos szétoszlás',
    impactHigh:  'Szennyezőket elviszi',
  },
  // Zöld
  green: {
    title:         'Zöld Környezet',
    score:         'Zöld index',
    benchmark:     'Budapest átlag: ~52/100',
    nearestPark:   'Legközelebbi park',
    distance:      '{{m}} m',
    walkTime:      '~{{min}} perc gyalog',
    trees:         '{{count}} fa 200m-en belül',
    playgrounds:   '{{count}} játszótér',
    sports:        '{{count}} sporttér',
    noise:         'Zajterhelés',
    noiseLow:      'Csendes',
    noiseHigh:     'Zajos',
    mainRoadNear:  'Főút {{m}}m-re — megnövelt zajterhelés',
    railNear:      'Vasút {{m}}m-re',
  },
  // Solar
  solar: {
    title:        'Napenergia-potenciál',
    annual:       'Éves termelés',
    unit:         'kWh/kWp/év',
    benchmark:    'Budapest átlag: ~1050 kWh/kWp/év',
    source:       'EU JRC PVGIS műholdas adat alapján',
    calculator:   'Napelem kalkulátor',
    sliderLabel:  'Tervezett kapacitás: {{kwp}} kWp',
    annualOutput: 'Éves termelés: {{kwh}} kWh',
    co2Saved:     'CO₂ megtakarítás: {{kg}} kg/év',
    co2Equiv:     'Ez {{bags}} zsák hulladék elégetése CO₂-egyenértéke',
  },
}

Angol (en.ts) - megfelelő fordításokkal.
```

---

### PROMPT 14: Superadmin job — zöld cache előszámítás

```
Feladat: Add hozzá az `env_refresh_green` job-ot az 
app/api/superadmin/jobs/run/route.ts fájlba.

Job: 'env_refresh_green'
Leírás: Minden épületre kiszámítja a green score-t az Overpass API-ból és 
        elmenti a building_green_cache táblába.

Futtatás:
1. SELECT id, lat, lon FROM buildings WHERE lat IS NOT NULL AND lon IS NOT NULL
2. Minden épületre sequentially (ne párhuzamosan — Overpass rate limit):
   a. building_green_cache WHERE building_id = ? AND valid_until > now() → ha van, skip
   b. Ha nincs: fetch /api/environment/green?buildingId=&lat=&lon= (internal route)
   c. Wait 2000ms az Overpass rate limit miatt
3. Return { processed, skipped, errors }

Rate limit védelme:
  for (const building of buildings) {
    const hasCache = await checkCache(building.id);
    if (!hasCache) {
      await computeAndCacheGreen(building.id, building.lat, building.lon);
      await new Promise(r => setTimeout(r, 2000)); // Overpass ratelimit
    }
  }

Add hozzá a superadmin-client.tsx JOBS listájához:
  { id: 'env_refresh_green', label: 'Zöld cache frissítés', description: 'OSM Overpass lekérdezés minden épületre, 7 napos cache' }

Stats panel TABLE_SPECS bővítés:
  { name: 'building_green_cache',  label: 'Épület zöld cache',  group: 'environment' }
  { name: 'building_solar_cache',  label: 'Épület solar cache', group: 'environment' }
  { name: 'building_env_score',    label: 'Env. pontszámok',    group: 'environment' }

GROUP_LABELS bővítés:
  environment: 'Környezeti adatok'
```

---

### PROMPT 15: Push értesítés integráció (kiegészítés meglévő push rendszerhez)

```
Feladat: Bővítsd a meglévő push értesítési rendszert napi 
környezeti riasztással (egy app/api/push/notify/route.ts bővítés).

Trigger: cron job / superadmin job 'env_daily_alert'

Logika:
1. Fetch Open-Meteo AQ minden épület koordinátájára (group by koordináta, batch)
2. Feltételek, amelyek riasztást aktiválnak:
   - AQI > 100 ("Levegőminőség rossz ma")
   - pollen high bármely típusból (µg/m³ fű>50, nyír>80, éger>30)
   - UV > 8 (nagyon magas)
3. Ha van trigger: PUSH küldés az épület összes aktív mobile-push subscriber-jének
4. Üzenet sablon:
   - AQI magas: "🌫️ {buildingName} — Ma {aqiLabel} levegőminőség ({aqi} AQI). Érzékenyeknek maradjanak bent!"
   - Pollen magas: "🌿 Ma MAGAS pollen szezon {city}-ban. Allergiásoknak gyógyszer ajánlott."
   - UV magas: "☀️ Ma nagyon magas UV ({uvIndex}). SPF 50+, kerülje 10-14h a napot."

Minden push max 1x küldendő naponta épületenként (Supabase upsert timestamp alapján).
```

---

## III. IMPLEMENTÁCIÓS SORREND (prioritás)

```
SPRINT 1 (alap infrastruktúra):
✦ Migráció 1-3 futtatása (PROMPT 1)
✦ Open-Meteo Air Quality API route (PROMPT 2)
✦ Weather API route (PROMPT 3)
✦ environment-page-client.tsx rekonstrukció (PROMPT 8)
  → Csak AQ + Pollen + UV + Weather szekciókkal
  → Green és Solar szekciók "hamarosan" placeholder-rel

SPRINT 2 (zöld infrastruktúra):
✦ Green Space API route Overpass-szal (PROMPT 4 + 6)
✦ Superadmin job (PROMPT 14)
✦ Green szekció és Leaflet térkép megjelenítése

SPRINT 3 (solar + score):
✦ Solar API route PVGIS-szal (PROMPT 5)
✦ KörnyezetScore formula és API route (PROMPT 7)
✦ Hero widget implementáció (PROMPT 11)

SPRINT 4 (UX finomítás):
✦ 24h sparkline chart (PROMPT 12)
✦ Push értesítések (PROMPT 15)
✦ Lokalizáció bővítés (PROMPT 13)
✦ IntersectionObserver lazy loading
```

---

## IV. FORRÁSANYAGOK

1. Open-Meteo Air Quality API: https://open-meteo.com/en/docs/air-quality-api
2. PVGIS EU JRC API: https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/api-non-interactive-service_en
3. Overpass API wiki: https://wiki.openstreetmap.org/wiki/Overpass_API
4. EEA Noise Directive data: https://www.eea.europa.eu/en/datahub/datahubitem-view/c952f520-8d71-42c9-b74c-b7eb002f939b
5. Budapest Geoportal: https://geoportal.budapest.hu/
6. ATLO Budapest Open Data Atlas: https://atlo.team/boda/
7. Budapest pollen (pollencount.eu): https://pollencount.eu/budapest-hu
8. IQAir pollen Budapest: https://www.iqair.com/pollen/hungary/central-hungary/budapest
9. European Aeroallergen Network: https://link.springer.com/article/10.1007/s40629-025-00357-5
10. Copernicus CAMS urban: https://atmosphere.copernicus.eu/breezometer-information-air-quality-and-pollen
11. Plume Labs: https://plumelabs.com/en/air/
12. BreezoMeter: https://www.breezometer.com/air-quality-map/
13. NatureScore: https://www.mdpi.com/2071-1050/17/10/4336
14. WHO UV Index guidelines: https://openweathermap.org/api/uvi
15. Green space & health: https://pmc.ncbi.nlm.nih.gov/articles/PMC11546338/
16. NDVI green methodology: https://www.nature.com/articles/s41370-024-00650-5
17. Urban heat island Copernicus: https://land.copernicus.eu/en/feature-articles/urban-heat-islands-measured-mapped-and-managed
18. Noise & green: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6068578/
19. Health Impacts Urban: https://www.mdpi.com/2071-1050/17/10/4336
20. Radon Hungary: https://link.springer.com/article/10.1007/s00254-008-1329-6
21. EU noise API: https://www.eea.europa.eu/en/datahub/datahubitem-view/c952f520-8d71-42c9-b74c-b7eb002f939b
22. Redfin climate methodology: https://www.redfin.com/guides/climate-change-housing-impact/methodology
23. Open-Meteo free overview: https://dev.to/0012303/open-meteo-api-free-weather-data-for-any-location-no-key-no-limits-no-bs-2j2
24. AucklandLivability: https://link.springer.com/article/10.1007/s12061-025-09643-9
25. ESG real estate 2025: https://www.buildium.com/blog/proptech-trends-to-know/
26. IQAir features: https://www.iqair.com/air-quality-monitors/air-quality-app
27. Frontiers IEQ: https://www.frontiersin.org/journals/built-environment/articles/10.3389/fbuil.2025.1652527/full
28. Nature air/noise/green: https://pmc.ncbi.nlm.nih.gov/articles/PMC6265844/
29. PVGIS rooftop Europe: https://www.nature.com/articles/s41560-025-01947-x
30. PropTech ESG: https://www.axon.dev/industries/real-estate/esg-compliance
```

---

## V. ÖSSZEFOGLALÁS

Az újraépített `/kornyezet` oldal 6 szekciójával, 5 új adatforrásával és az összetett KörnyezetScore™ mutatóval a PanelLakó platformot **proptech ESG-minőségű** környezeti dashboarddá emeli, amelyhez hasonló funkciókért másutt fizetős API kulcsok kellenek (BreezoMeter, IQAir Pro, WalkScore). A mi implementációnk **100%-ban ingyenes nyílt adatokon** alapul:

| Forrás | Adat | Díj |
|--------|------|-----|
| Open-Meteo | AQ + pollen + UV + időjárás | **Ingyenes, kulcs nélkül** |
| PVGIS (EU JRC) | Napenergia | **Ingyenes, kulcs nélkül** |
| OSM/Overpass | Zöldelérés, zajbecslés | **Ingyenes, kulcs nélkül** |
| AQICN (meglévő) | Fallback AQI | Ingyenes kulccsal |

**Egyedi versenyelőnyök:**
1. KörnyezetScore™ — nincs más magyar lakásos alkalmazásban
2. Parlagfű-szezon figyelmeztetés — kritikus Magyarországon
3. Napelem kalkulátor lakóközösség szintjén — valós EU JRC adattal
4. Zajbecslés OSM zajforrás proximitásból — ahol nincs szabad EU noise API
5. 500m sugarú zöld-térkép az épület körül Leaflet-en
