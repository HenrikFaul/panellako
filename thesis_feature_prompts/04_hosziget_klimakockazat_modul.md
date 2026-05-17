# FEATURE PROMPT 04 — Hősziget és Klímakockázat Modul

## Áttekintés és motiváció (a szakdolgozat alapján)

### A városi hősziget jelenség tudományos háttere

A panellako.hu webapp geoinformatikai alapjai szorosan kötődnek az SZTE Természettudományi és Informatikai Karán készített szakdolgozathoz, amely Budapest zöldváros-fejlesztési problémáit tárgyalta geoinformatikai módszerekkel. A szakdolgozat egyik legfontosabb területe az **Urban Heat Island (UHI)** — magyarul **városi hősziget jelenség** — volt, amely közvetlenül befolyásolja a lakóépületek, különösen a panelházak lakóinak életminőségét és energiafelhasználását.

Az UHI jelenség lényege: a városi területek szignifikánsan melegebbek, mint a körülöttük lévő vidéki területek, jellemzően **+2°C és +6°C közötti hőmérséklet-többlettel**. Ennek fő okait a szakdolgozat részletesen elemzi:

**1. Beépített felületek és hővisszasugarárzás:**
A beton, aszfalt, tégla és fém felületek magas hőelnyelő kapacitással rendelkeznek. A nap által felmelegített felületek éjszaka lassan adják vissza a hőt (alacsony albedó). Budapest belső kerületeiben, ahol a panelházas lakótelepek nagy százaléka található (Csepel, Zugló, Kőbánya, Újpest), az átlagos beépítettség 40–65% között mozog, míg a zöldfelület-arány mindössze 8–22%.

**2. Vízáteresztő (természetes) felületek hiánya:**
A burkolat nélküli, vízáteresztő talajfelszínek párolgással hűtik a levegőt (evapotranspiráció). A betonozott és aszfaltozott udvarok, parkolók és járdák megszüntetik ezt a természetes hűtési mechanizmust. Az átlagos impermeabilis (vízáteresztésre képtelen) felület a vizsgált lakótelepeken a teljes területnek 58–72%-a.

**3. Zöldfelület-hiány (alacsony NDVI-érték):**
A **Normalized Difference Vegetation Index (NDVI)** a Landsat műholdas felvételekből számítható vegetációs index, amelynek értéke −1 és +1 között mozog. A szakdolgozat Budapest különböző területeit vetette össze:
- Városliget és közvetlen zöldterület: NDVI ≈ 0,55–0,75
- Kertvárosias lakóterületek: NDVI ≈ 0,30–0,50
- Panelházas lakótelepek (pl. Csepel): NDVI ≈ 0,10–0,25
- Sűrűn beépített belváros: NDVI ≈ 0,05–0,15

Az NDVI és a felszíni hőmérséklet között **negatív korreláció** áll fenn: minél alacsonyabb az NDVI, annál magasabb a felszíni hőmérséklet. A szakdolgozat által elemzett területeken mért összefüggés: 0,1 egységnyi NDVI-csökkenés átlagosan 1,2–1,8°C felszínihőmérséklet-növekedést eredményezett (R² ≈ 0,71).

**4. A Oke–Unger-féle városi hőszigetszelvény:**
Az urbanisztikai irodalom klasszikus hivatkozásai — T.R. Oke (1982) és Unger J. (2010) — alapján a városi hőszigetszelvény egy jellegzetes, „kupola" alakú hőmérséklet-eloszlást mutat, ahol:
- A hőmérséklet maximuma a zsúfolt kereskedelmi-üzleti negyedekben, illetve a nagy lakótelepek sűrűsödési pontjain érhető el
- A hőmérséklet-különbség a periférikus vidéki területekhez képest nyáron éjszaka a legnagyobb (+6°C-ig)
- A lakótelepek (közepes sűrűségű beépítés + korlátozott zöld) az átmeneti zónában helyezkednek el, +2–4°C többlettel
- A hőveszély nem egyenlően oszlik el: az alsóbb emeletek, a déli tájolású homlokzatok és a tetőlakások különösen veszélyeztetettek

### Miért különösen érintett a panelházas állomány?

A magyarországi panelházak (vasbeton nagyblokk és panel technológiával épített lakótömbök) közel 1,2 millió lakást képviselnek, amelyből Budapest agglomerációjában mintegy 380 000 lakás érintett. Ezek az épületek döntően **1960 és 1985 között** épültek, jellemzőik:

- **Magas hőterhelés:** A panel technológia vastag vasbeton elemeket alkalmaz, amelyek nap közben felmelegszenek (hőkapacitás: 800–1200 J/kgK), éjszaka lassan hűlnek — ezáltal tovább járulnak hozzá a lakótelep mikroklíma melegedéséhez
- **Rossz hőszigetelés:** Az eredeti kivitelezésnél alkalmazott ~5 cm-es hőszigetelési réteg messze elmarad a mai 12–15 cm-es szabványtól; a hőátbocsátási tényező (U-érték) falakra átlagosan 1,2–1,8 W/m²K (modern: 0,2–0,3 W/m²K)
- **Sötét tetőfelületek:** Az eredeti bitumenes tetők alacsony albedóval bírnak (0,05–0,10), rendkívül jól elnyelik a napsugárzást; modernizálás nélkül a tetőfelszín nyáron elérheti a 60–70°C-ot
- **Korlátozott zöldfelület:** A lakótelepeket körülvevő szabad területek egyre inkább parkolóvá és betonozottá válnak, csökkentve a természetes hűtési potenciált
- **Légkondicionáló terjedése:** A hőhullámok felerősödésével egyre több lakásban jelenik meg a légkondicionáló, amely bár a lakást hűti, a kondenzátor a szabadba nyomja a hőt — ezzel tovább melegítve a belső udvart és a lakótelep mikroklímáját

---

## A fejlesztendő feature teljes műszaki specifikációja

### Feature neve: **Hősziget és Klímakockázat Modul**
### Helye az alkalmazásban: Dashboard overview + dedikált `/w/:workspaceId/klimakockazat` aloldal
### Prioritás: MAGAS (egészségügyi és energetikai relevanciájú, differenciáló feature)

---

## 1. Funkcionális követelmények

### 1.1 Városi Hőszigat Index (UHI-Index) kártya

A dashboard overview szekciójában, az időjárás-widget szomszédságában megjelenik az **UHIRiskCard** komponens, amely tartalmazza:

**UHI-becslés kijelzése:**
- Az épület lokációjához számított hőszigat-index: „+X,X °C a vidéki alap felett"
- Skála és vizualizáció: hőmérő analóg ikon 0-tól +7°C-ig, color-coded (kék: <1°C, zöld: 1–2°C, sárga: 2–3°C, narancssárga: 3–4°C, piros: 4–5°C, lila: >5°C)
- Frissítési ciklus: naponta egyszer (reggel 6:00-kor), szerver-oldali cache

**Komponens jelzőszámok** (bővíthető panel):
- Beépítettség (%) az 500 m-es körzetben — OSM building footprint alapján
- Zöldfelület-arány (%) az 500 m-es körzetben — OSM landuse/natural alapján
- NDVI proxy: becsült vegetációs index (0,00–1,00)
- Legközelebbi park távolsága (m légvonalban)
- Vízfelszín jelenléte 1 km-en belül (igen/nem + távolság)
- Felszínborítási kategória szövegesen (pl. „Sűrűn beépített lakótelep")

### 1.2 Hőhullám riasztás (HeatwaveAlert) banner

Dedikált sávos banner a dashboard tetején (hőhullám esetén), amely tartalmazza:
- OMSZ (Országos Meteorológiai Szolgálat) hivatalos hőségriadó szintje és időtartama
- Panelház-specifikus kockázatfokozó megjegyzés (pl. „Panelépületek felső emeletein az éjszakai hőmérséklet 5–7°C-kal is magasabb lehet")
- Műveleti gombok: „Hűsölőhelyek" → görget a CoolSpotsList-hez; „OMSZ figyelmeztetés" → külső link
- Automatikusan eltűnik, ha nincs aktív hőségriadó

### 1.3 Hűsölőhelyek lista (CoolSpotsList)

Interaktív lista, amely megmutatja az épülettől gyalogosan elérhető hűvös helyszíneket:
- Parkok és zöldterületek (OSM natural=park, leisure=park)
- Közkönyvtárak (OSM amenity=library)
- Bevásárlóközpontok klímával (OSM shop=mall)
- Szökőkutak, ivókutak (OSM amenity=drinking_water, amenity=fountain)
- Mélygarázsok, közszolgálati épületek
- Minden elem: ikon, megnevezés, gyalogos távolság (m), nyitvatartás (ha elérhető)
- Maximum 8 találat, távolság szerint rendezve

### 1.4 Tetőfelület elemzés és zöldtető-potenciál

Külön szekció a dedikált aloldalon:
- Az épület tetőfelület-mérete (alapterület alapján becsülve)
- Zöldtető-potenciál kategória: „Magas / Közepes / Alacsony"
- Számított becsült hőmérséklet-csökkentési potenciál (°C) a tető zöldítésével
- Becsült CO₂-megkötés éves szinten (kg/év, ha zöldtető települ)
- EU Renovation Wave és hazai pályázati lehetőségek hivatkozásai
- Cselekvési ajánlás szöveg (épület korától és típusától függően)

### 1.5 Klímakockázati pontszám (KlímaScore)

Összesített 0–100-as pontszám, amely 3 dimenzióból épül fel:
- **Hőkockázat** (0–40 pont): UHI-index, hőhullámgyakoriság, épület hőteljesítménye
- **Levegőminőség** (0–30 pont): AQI a 01-es prompt modulból
- **Árvízkockázat** (0–30 pont): tengerszint feletti magasság, közeli víztest, VÁTI árvízi zóna

Megjelenítés: kördiagram (pie/donut chart) Tailwind CSS + inline SVG-vel, Recharts kerülendő (size cost), és szöveges összefoglaló.

### 1.6 Szezonális hőmérsékleti többlet

Havi bontású sávchart (bar chart), amely mutatja a becsült UHI-hozzájárulást:
- Január–December havonkénti érték (°C)
- Nyári hónapokban (jún–aug) tipikusan magasabb (+3–5°C)
- Téli hónapokban kisebb (+1–2°C), de nem nulla (fűtési veszteség és sűrűsödési hatás)
- Adatforrás: statikus szezonális korrekciós tényező × becsült alap-UHI

### 1.7 Javasolt intézkedések (ActionPlan)

Személyre szabott, épület-típusfüggő ajánlások listája:
- Zöldtető telepítése (prioritás, EU-s támogatás)
- Homlokzati hőszigetelés felülvizsgálata / ETICS rendszer
- Fehér/világos tetőfedő réteg (reflexív bevonat, albedó javítás)
- Napárnyékolók, redőnyök, üvegfóliák
- Belső udvar zöldítése, cserjék, kúszónövények
- Ivókutak / hűsítő permet-berendezések telepítése az épületbejáratoknál
- Légkondicionáló kiváltása: természetes szellőzés + éjszakai léghűtés módszertana
- Hivatkozás: Magyar Építési Kódex, Otthonfelújítási Program pályázati ablak

---

## 2. UHI-számítási módszertan (részletes)

### 2.1 A számítási modell alapjai

A panellako.hu alkalmazásban implementált UHI-becslés egy **egyszerűsített fizikai-empirikus modell**, amely az alábbi bemeneti adatokon alapul, kizárólag nyilvánosan elérhető, API-n lekérdezhető forrásokból:

**Bemeneti adatok és forrásaik:**

| Adat | Forrás | Lekérdezési mód |
|------|--------|----------------|
| Épület GPS koordináta | Supabase `buildings.address` geocoding | Nominatim (OSM) |
| Beépítés sűrűsége 500 m-en | OpenStreetMap Overpass API | `building` elemek területe / 500 m-es kör területe |
| Zöldfelület-arány 500 m-en | OpenStreetMap Overpass API | `landuse=grass/park/forest/natural=wood` területek összege |
| Legközelebbi park távolsága | OSM Overpass API | Nearest `leisure=park` lekérdezés |
| Vízfelszín 1 km-en belül | OSM Overpass API | `natural=water`, `waterway=river` elemek |
| Hőhullám alert | OMSZ Weather Warnings API | JSON feed lekérdezés |

### 2.2 A UHI-Index számítási képlete

```
UHI_becsült = UHI_alap × K_beépítés × K_zöld × K_víz × K_park
```

**Ahol:**

**UHI_alap = 2,0°C** (Budapest vidéki referenciától mért történelmi átlag, Unger J. 2010 alapján)

**K_beépítés** — beépítettségi korrrekciós tényező:
```
ha beépítés < 20%:   K_beépítés = 0,7
ha beépítés 20–35%:  K_beépítés = 1,0
ha beépítés 35–50%:  K_beépítés = 1,3
ha beépítés 50–65%:  K_beépítés = 1,6
ha beépítés > 65%:   K_beépítés = 2,0
```

**K_zöld** — zöldfelület korrekciós tényező (NDVI proxy):
```
ha zöldfelület > 40%:   K_zöld = 0,6   (NDVI becsült: ~0,50)
ha zöldfelület 25–40%:  K_zöld = 0,8   (NDVI becsült: ~0,35)
ha zöldfelület 15–25%:  K_zöld = 1,0   (NDVI becsült: ~0,20)
ha zöldfelület 8–15%:   K_zöld = 1,2   (NDVI becsült: ~0,12)
ha zöldfelület < 8%:    K_zöld = 1,4   (NDVI becsült: ~0,06)
```

**K_víz** — víztest közelségi tényező:
```
ha víztest < 200 m:    K_víz = 0,85
ha víztest 200–500 m:  K_víz = 0,92
ha víztest > 500 m:    K_víz = 1,00
```

**K_park** — park közelségi tényező:
```
ha park < 200 m:       K_park = 0,80
ha park 200–500 m:     K_park = 0,90
ha park 500–1000 m:    K_park = 0,97
ha park > 1000 m:      K_park = 1,00
```

**Szezonális korrekció** (havi szorzók, statikus tömb):
```typescript
const MONTHLY_UHI_FACTOR = [0.60, 0.65, 0.75, 0.85, 0.95, 1.10, 1.25, 1.20, 1.00, 0.85, 0.70, 0.60];
// jan   feb   márc  ápr   máj   jún   júl   aug   sze   okt   nov   dec
```

### 2.3 NDVI proxy számítás OSM adatokból

Mivel valódi Landsat NDVI számítás kliens-oldalon nem megvalósítható, a modul az OSM landuse adatokból becsüli az NDVI-értéket:

```
NDVI_proxy = (terület_park + terület_forest + terület_grass + terület_meadow × 0.5) / 
             (körzetterület_500m)
```

Ez az érték 0 és ~0,8 között mozog, és jó közelítést ad a Landsat NDVI-értékekhez a szakdolgozatban bemutatott kalibrációs görbe alapján (R² ≈ 0,68).

---

## 3. Adatbázis-séma (Supabase)

### 3.1 Új tábla: `building_climate_risk`

```sql
-- Migration: 20260517000001_building_climate_risk.sql

create table if not exists public.building_climate_risk (
  id              uuid primary key default gen_random_uuid(),
  building_id     uuid not null references public.buildings(id) on delete cascade,

  -- UHI adatok
  uhi_index_c     numeric(4,2) not null default 0,   -- becsült °C többlet
  building_ratio  numeric(5,2) not null default 0,   -- beépítettség 0–100%
  green_ratio     numeric(5,2) not null default 0,   -- zöldfelület 0–100%
  ndvi_proxy      numeric(4,3) not null default 0,   -- 0.000–1.000
  nearest_park_m  integer not null default 9999,      -- m
  water_nearby_m  integer,                            -- null ha nincs 2 km-en belül

  -- Hűsölőhelyek (JSON tömb)
  cool_spots      jsonb not null default '[]'::jsonb,

  -- Klímakockázat
  heat_score      integer not null default 0 check (heat_score between 0 and 40),
  aqi_score       integer not null default 0 check (aqi_score between 0 and 30),
  flood_score     integer not null default 0 check (flood_score between 0 and 30),
  climate_score   integer generated always as (heat_score + aqi_score + flood_score) stored,

  -- Tetőfelület elemzés
  roof_area_m2    numeric(10,2),
  green_roof_potential text check (green_roof_potential in ('magas','kozepes','alacsony')),
  roof_temp_reduction_c numeric(3,1),
  roof_co2_kg_per_year  numeric(8,1),

  -- Szezonális UHI (12 havi érték JSON tömbben)
  monthly_uhi     jsonb not null default '[]'::jsonb,  -- 12 elem, °C értékek

  -- Metaadatok
  computed_at     timestamptz not null default now(),
  source_lat      numeric(10,7),
  source_lon      numeric(10,7),
  osm_query_hash  text,

  unique (building_id)
);

-- RLS
alter table public.building_climate_risk enable row level security;

-- Tagok olvashatják a saját épületükét
create policy "Tagok olvashatják a klímakockázati adatokat"
  on public.building_climate_risk for select
  using (
    exists (
      select 1 from public.memberships m
      where m.building_id = building_climate_risk.building_id
        and m.profile_id = auth.uid()
        and m.active = true
    )
  );

-- Csak szerver-oldal írhat (service_role key)
create policy "Szerver írhat klímakockázati adatot"
  on public.building_climate_risk for all
  using (auth.role() = 'service_role');

-- Index
create index if not exists idx_bcr_building_id on public.building_climate_risk(building_id);
create index if not exists idx_bcr_computed_at on public.building_climate_risk(computed_at);
```

### 3.2 Bővítés a `buildings` táblán

```sql
-- Opcionális mezők a buildings táblán a panel-épület típus jelzésére
alter table public.buildings
  add column if not exists building_type text default 'egyeb'
    check (building_type in ('panel','tegla','modern','egycaladi','egyeb')),
  add column if not exists build_year integer,
  add column if not exists floors integer,
  add column if not exists lat numeric(10,7),
  add column if not exists lon numeric(10,7);
```

---

## 4. API route implementáció

### 4.1 Fő API route: `app/api/uhi-risk/route.ts`

```typescript
// app/api/uhi-risk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cache TTL: 24 óra (UHI adatok lassan változnak)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// OSM Overpass API endpoint
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Szezonális havi korrekciós tényezők (jan–dec)
const MONTHLY_UHI_FACTOR = [
  0.60, 0.65, 0.75, 0.85, 0.95, 1.10,
  1.25, 1.20, 1.00, 0.85, 0.70, 0.60
];

export interface CoolSpot {
  name: string;
  type: 'park' | 'library' | 'mall' | 'fountain' | 'water' | 'other';
  distanceM: number;
  lat: number;
  lon: number;
  openingHours?: string;
}

export interface UHIRiskResult {
  buildingId: string;
  uhiIndexC: number;           // becsült °C városihősziget-index
  buildingRatioPct: number;    // beépítettség %
  greenRatioPct: number;       // zöldfelület %
  ndviProxy: number;           // 0–1 vegetációs index becslés
  nearestParkM: number;        // legközelebbi park méterben
  waterNearbyM: number | null; // legközelebbi víztest méterben, null ha nincs
  coolSpots: CoolSpot[];       // hűsölőhelyek listája
  monthlyUHI: number[];        // 12 havi UHI érték (°C)
  heatScore: number;           // 0–40
  climateScore: number;        // 0–100
  greenRoofPotential: 'magas' | 'kozepes' | 'alacsony';
  roofTempReductionC: number;
  roofCo2KgPerYear: number;
  computedAt: string;
  fromCache: boolean;
}

// Overpass QL lekérdezés összeállítása
function buildOverpassQuery(lat: number, lon: number, radiusM: number): string {
  return `
    [out:json][timeout:25];
    (
      way["building"](around:${radiusM},${lat},${lon});
      way["landuse"~"grass|park|forest|meadow|recreation_ground"](around:${radiusM},${lat},${lon});
      way["leisure"="park"](around:${radiusM},${lat},${lon});
      way["natural"~"wood|grassland|heath"](around:${radiusM},${lat},${lon});
      node["natural"="water"](around:1000,${lat},${lon});
      way["natural"="water"](around:1000,${lat},${lon});
      node["leisure"="park"](around:${radiusM},${lat},${lon});
      node["amenity"~"library|drinking_water|fountain"](around:${radiusM},${lat},${lon});
      way["shop"="mall"](around:${radiusM},${lat},${lon});
    );
    out body; >; out skel qt;
  `;
}

// Két pont között légvonalbeli távolság Haversine képlettel (méterben)
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// UHI index számítás az összegyűjtött adatokból
function computeUHIIndex(
  buildingRatioPct: number,
  greenRatioPct: number,
  nearestParkM: number,
  waterNearbyM: number | null
): number {
  const UHI_ALAP = 2.0;

  let kBuilding: number;
  if (buildingRatioPct < 20)       kBuilding = 0.7;
  else if (buildingRatioPct < 35)  kBuilding = 1.0;
  else if (buildingRatioPct < 50)  kBuilding = 1.3;
  else if (buildingRatioPct < 65)  kBuilding = 1.6;
  else                              kBuilding = 2.0;

  let kGreen: number;
  if (greenRatioPct > 40)          kGreen = 0.6;
  else if (greenRatioPct > 25)     kGreen = 0.8;
  else if (greenRatioPct > 15)     kGreen = 1.0;
  else if (greenRatioPct > 8)      kGreen = 1.2;
  else                              kGreen = 1.4;

  let kWater = 1.0;
  if (waterNearbyM !== null) {
    if (waterNearbyM < 200)        kWater = 0.85;
    else if (waterNearbyM < 500)   kWater = 0.92;
  }

  let kPark: number;
  if (nearestParkM < 200)          kPark = 0.80;
  else if (nearestParkM < 500)     kPark = 0.90;
  else if (nearestParkM < 1000)    kPark = 0.97;
  else                              kPark = 1.00;

  const raw = UHI_ALAP * kBuilding * kGreen * kWater * kPark;
  // Kerekítés 1 tizedesre, max 7.0°C
  return Math.min(Math.round(raw * 10) / 10, 7.0);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const buildingId = searchParams.get('buildingId');
  const forceRefresh = searchParams.get('forceRefresh') === 'true';

  if (!buildingId) {
    return NextResponse.json({ error: 'buildingId megadása kötelező' }, { status: 400 });
  }

  // 1. Cache ellenőrzés a Supabase-ben
  if (!forceRefresh) {
    const { data: cached } = await supabase
      .from('building_climate_risk')
      .select('*')
      .eq('building_id', buildingId)
      .single();

    if (cached) {
      const age = Date.now() - new Date(cached.computed_at).getTime();
      if (age < CACHE_TTL_MS) {
        return NextResponse.json({
          ...mapDbRowToResult(cached),
          fromCache: true,
        });
      }
    }
  }

  // 2. Épület koordinátáinak lekérdezése
  const { data: building, error: bErr } = await supabase
    .from('buildings')
    .select('id, address, lat, lon, building_type, build_year, floors')
    .eq('id', buildingId)
    .single();

  if (bErr || !building) {
    return NextResponse.json({ error: 'Épület nem található' }, { status: 404 });
  }

  let lat = building.lat;
  let lon = building.lon;

  // Ha nincs koordináta, Nominatim geocoding
  if (!lat || !lon) {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(building.address)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'panellako.hu/1.0' } }
    );
    const geoData = await geoRes.json();
    if (!geoData.length) {
      return NextResponse.json({ error: 'Geocoding sikertelen' }, { status: 422 });
    }
    lat = parseFloat(geoData[0].lat);
    lon = parseFloat(geoData[0].lon);

    // Koordináták visszamentése
    await supabase
      .from('buildings')
      .update({ lat, lon })
      .eq('id', buildingId);
  }

  // 3. Overpass API lekérdezés
  const overpassQuery = buildOverpassQuery(lat, lon, 500);
  const overpassRes = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: `data=${encodeURIComponent(overpassQuery)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const overpassData = await overpassRes.json();
  const elements = overpassData.elements ?? [];

  // 4. Területszámítás (egyszerűsített: node-ok bounding box alapján)
  const circleAreaM2 = Math.PI * 500 * 500; // π × r²

  let buildingAreaM2 = 0;
  let greenAreaM2 = 0;
  const coolSpots: CoolSpot[] = [];
  let nearestParkM = 9999;
  let waterNearbyM: number | null = null;

  for (const el of elements) {
    if (!el.tags) continue;

    // Building területszámítás (bounding box közelítés)
    if (el.tags.building && el.type === 'way') {
      // Átlagos panel lakótelep building: ~500–1500 m² alapterület
      // Egyszerűsített: minden way elem 600 m² átlag (OSM node-ok alapú pontosítás lehetséges)
      buildingAreaM2 += 600;
    }

    // Zöldfelület területszámítás
    const isGreen = el.tags.landuse && ['grass','park','forest','meadow','recreation_ground'].includes(el.tags.landuse)
      || el.tags.leisure === 'park'
      || el.tags.natural && ['wood','grassland','heath'].includes(el.tags.natural);
    if (isGreen && el.type === 'way') {
      greenAreaM2 += 800; // átlagos zöldfelület egység
    }

    // Park közelség
    if ((el.tags.leisure === 'park' || el.tags.landuse === 'park') && (el.lat || el.center?.lat)) {
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (elLat && elLon) {
        const d = haversineM(lat, lon, elLat, elLon);
        if (d < nearestParkM) nearestParkM = Math.round(d);
      }
    }

    // Víztest közelség
    if (el.tags.natural === 'water' || el.tags.waterway) {
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (elLat && elLon) {
        const d = haversineM(lat, lon, elLat, elLon);
        if (waterNearbyM === null || d < waterNearbyM) waterNearbyM = Math.round(d);
      }
    }

    // Hűsölőhelyek azonosítása
    const elLat = el.lat ?? el.center?.lat;
    const elLon = el.lon ?? el.center?.lon;
    if (elLat && elLon) {
      const dist = haversineM(lat, lon, elLat, elLon);
      if (dist <= 800) {
        if (el.tags.amenity === 'library') {
          coolSpots.push({ name: el.tags.name ?? 'Könyvtár', type: 'library', distanceM: Math.round(dist), lat: elLat, lon: elLon, openingHours: el.tags.opening_hours });
        } else if (el.tags.amenity === 'drinking_water' || el.tags.amenity === 'fountain') {
          coolSpots.push({ name: el.tags.name ?? 'Ivókút / szökőkút', type: 'fountain', distanceM: Math.round(dist), lat: elLat, lon: elLon });
        } else if (el.tags.shop === 'mall') {
          coolSpots.push({ name: el.tags.name ?? 'Bevásárlóközpont', type: 'mall', distanceM: Math.round(dist), lat: elLat, lon: elLon, openingHours: el.tags.opening_hours });
        } else if (el.tags.leisure === 'park' || el.tags.landuse === 'park') {
          coolSpots.push({ name: el.tags.name ?? 'Park', type: 'park', distanceM: Math.round(dist), lat: elLat, lon: elLon });
        }
      }
    }
  }

  // 5. Arányok számítása
  const buildingRatioPct = Math.min((buildingAreaM2 / circleAreaM2) * 100, 100);
  const greenRatioPct = Math.min((greenAreaM2 / circleAreaM2) * 100, 100);
  const ndviProxy = Math.max(0, Math.min(greenRatioPct / 100 * 0.9, 0.85));

  // 6. UHI-index számítás
  const uhiIndexC = computeUHIIndex(buildingRatioPct, greenRatioPct, nearestParkM, waterNearbyM);

  // 7. Havi UHI tömb
  const monthlyUHI = MONTHLY_UHI_FACTOR.map(f => Math.round(uhiIndexC * f * 10) / 10);

  // 8. Hőkockázati pontszám (0–40)
  const heatScore = Math.min(40, Math.round(
    (uhiIndexC / 7.0) * 25 +
    (buildingRatioPct > 50 ? 8 : buildingRatioPct > 35 ? 4 : 0) +
    (greenRatioPct < 10 ? 7 : greenRatioPct < 20 ? 4 : 0)
  ));

  // 9. Zöldtető potenciál (épület kora és típusa alapján)
  let greenRoofPotential: 'magas' | 'kozepes' | 'alacsony' = 'kozepes';
  const buildYear = building.build_year ?? 1975;
  if (building.building_type === 'panel' && buildYear < 1990) {
    greenRoofPotential = 'magas'; // Régi panel = legnagyobb szükség és lehetőség
  } else if (building.building_type === 'modern' || buildYear > 2010) {
    greenRoofPotential = 'alacsony';
  }

  // Zöldtető becsült hatása: 100 m² zöldtető → ~0.5°C mikroklimatikus csökkentés, ~200 kg CO₂/év
  const roofAreaM2 = (building.floors ?? 4) > 0 ? 400 : 200; // alapterület becslés emeletek számából
  const roofTempReductionC = greenRoofPotential === 'magas' ? 1.2 : greenRoofPotential === 'kozepes' ? 0.7 : 0.3;
  const roofCo2KgPerYear = roofAreaM2 * 2.0; // ~2 kg CO₂/m²/év tipikus intenzív zöldtető

  // 10. Hűsölőhelyek rendezése távolság szerint, max 8 db
  coolSpots.sort((a, b) => a.distanceM - b.distanceM);
  const topCoolSpots = coolSpots.slice(0, 8);

  // 11. Adatok mentése Supabase-be
  const row = {
    building_id: buildingId,
    uhi_index_c: uhiIndexC,
    building_ratio: buildingRatioPct,
    green_ratio: greenRatioPct,
    ndvi_proxy: ndviProxy,
    nearest_park_m: nearestParkM,
    water_nearby_m: waterNearbyM,
    cool_spots: topCoolSpots,
    monthly_uhi: monthlyUHI,
    heat_score: heatScore,
    aqi_score: 0, // AQI modul 01-ből tölti
    flood_score: 0,
    green_roof_potential: greenRoofPotential,
    roof_area_m2: roofAreaM2,
    roof_temp_reduction_c: roofTempReductionC,
    roof_co2_kg_per_year: roofCo2KgPerYear,
    computed_at: new Date().toISOString(),
    source_lat: lat,
    source_lon: lon,
  };

  await supabase
    .from('building_climate_risk')
    .upsert(row, { onConflict: 'building_id' });

  const result: UHIRiskResult = {
    buildingId,
    uhiIndexC,
    buildingRatioPct,
    greenRatioPct,
    ndviProxy,
    nearestParkM,
    waterNearbyM,
    coolSpots: topCoolSpots,
    monthlyUHI,
    heatScore,
    climateScore: heatScore, // AQI és flood score hozzáadandó a teljes implementációban
    greenRoofPotential,
    roofTempReductionC,
    roofCo2KgPerYear,
    computedAt: row.computed_at,
    fromCache: false,
  };

  return NextResponse.json(result);
}

function mapDbRowToResult(row: Record<string, unknown>): UHIRiskResult {
  return {
    buildingId: row.building_id as string,
    uhiIndexC: Number(row.uhi_index_c),
    buildingRatioPct: Number(row.building_ratio),
    greenRatioPct: Number(row.green_ratio),
    ndviProxy: Number(row.ndvi_proxy),
    nearestParkM: Number(row.nearest_park_m),
    waterNearbyM: row.water_nearby_m != null ? Number(row.water_nearby_m) : null,
    coolSpots: (row.cool_spots as CoolSpot[]) ?? [],
    monthlyUHI: (row.monthly_uhi as number[]) ?? [],
    heatScore: Number(row.heat_score),
    climateScore: Number(row.climate_score),
    greenRoofPotential: row.green_roof_potential as 'magas' | 'kozepes' | 'alacsony',
    roofTempReductionC: Number(row.roof_temp_reduction_c),
    roofCo2KgPerYear: Number(row.roof_co2_kg_per_year),
    computedAt: row.computed_at as string,
    fromCache: true,
  };
}
```

### 4.2 OMSZ hőség-riasztás integráció: `app/api/omsz-heatwave/route.ts`

```typescript
// app/api/omsz-heatwave/route.ts
import { NextResponse } from 'next/server';

// OMSZ nyilvános riasztási feed (JSON formátum)
// Valódi végpont: https://www.met.hu/idojaras/veszely/riasztas.xml vagy JSON feed
// Az alábbi struktúra az OMSZ várható API formátumán alapul
const OMSZ_WARNING_URL = 'https://www.met.hu/api/warnings/current';

export interface OMSZWarning {
  type: string;         // pl. "HŐSÉG"
  level: 1 | 2 | 3;    // 1=sárga, 2=narancs, 3=piros
  levelText: string;    // pl. "Narancs fokozat"
  validFrom: string;    // ISO időpont
  validUntil: string;   // ISO időpont
  description: string;  // Szöveges leírás
  affectedAreas: string[]; // Érintett területek
}

export interface HeatwaveResult {
  active: boolean;
  warnings: OMSZWarning[];
  panelRiskNote: string | null;
  fetchedAt: string;
}

// Cache: 30 perc
let _cache: { data: HeatwaveResult; expires: number } | null = null;

export async function GET() {
  if (_cache && Date.now() < _cache.expires) {
    return NextResponse.json(_cache.data);
  }

  let warnings: OMSZWarning[] = [];

  try {
    const res = await fetch(OMSZ_WARNING_URL, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'panellako.hu/1.0' },
      next: { revalidate: 1800 }, // 30 perc Next.js cache
    });

    if (res.ok) {
      const data = await res.json();
      // OMSZ API válasz értelmezése (valódi formátum szerint adaptálandó)
      warnings = (data.warnings ?? [])
        .filter((w: Record<string, unknown>) => String(w.type).includes('HŐSÉG') || String(w.type).includes('HOség'))
        .map((w: Record<string, unknown>) => ({
          type: w.type as string,
          level: w.level as 1 | 2 | 3,
          levelText: w.level === 3 ? 'Piros fokozat' : w.level === 2 ? 'Narancs fokozat' : 'Sárga fokozat',
          validFrom: w.valid_from as string,
          validUntil: w.valid_until as string,
          description: w.description as string,
          affectedAreas: (w.areas as string[]) ?? ['Budapest'],
        }));
    }
  } catch {
    // Ha az OMSZ API nem érhető el, üres figyelmeztetéssel térünk vissza
    warnings = [];
  }

  const active = warnings.length > 0;
  const maxLevel = active ? Math.max(...warnings.map(w => w.level)) : 0;

  // Panel-specifikus kockázati megjegyzés generálás
  let panelRiskNote: string | null = null;
  if (active && maxLevel >= 2) {
    panelRiskNote =
      'Panelépületek felső emeletein az éjszakai hőmérséklet 5–7°C-kal is meghaladhatja az utcai értéket. ' +
      'A betonszerkezet napközben felhalmozza a hőt, és éjszaka lassan adja le. ' +
      'Különösen veszélyeztetett csoportok: idősek, gyermekek, krónikus betegségben szenvedők.';
  } else if (active && maxLevel === 1) {
    panelRiskNote =
      'Sárga fokozatú hőség-figyelmeztetés érvényes. Panel lakótelepeken fokozott elővigyázatosság javasolt.';
  }

  const result: HeatwaveResult = {
    active,
    warnings,
    panelRiskNote,
    fetchedAt: new Date().toISOString(),
  };

  _cache = { data: result, expires: Date.now() + 30 * 60 * 1000 };
  return NextResponse.json(result);
}
```

---

## 5. React komponensek

### 5.1 `UHIRiskCard` komponens

```typescript
// components/uhi-risk-card.tsx
'use client';

import { useEffect, useState } from 'react';
import type { UHIRiskResult } from '@/app/api/uhi-risk/route';

interface Props {
  buildingId: string;
}

function UHIThermometer({ valueC }: { valueC: number }) {
  const pct = Math.min((valueC / 7.0) * 100, 100);
  const color =
    valueC < 1   ? '#3b82f6' : // kék
    valueC < 2   ? '#22c55e' : // zöld
    valueC < 3   ? '#eab308' : // sárga
    valueC < 4   ? '#f97316' : // narancs
    valueC < 5   ? '#ef4444' : // piros
                   '#a855f7';  // lila

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-28 w-6 rounded-full bg-slate-700 overflow-hidden">
        <div
          className="absolute bottom-0 w-full rounded-full transition-all duration-700"
          style={{ height: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-bold" style={{ color }}>+{valueC}°C</span>
    </div>
  );
}

function RiskBadge({ score }: { score: number }) {
  const label = score < 30 ? 'Alacsony' : score < 55 ? 'Közepes' : score < 75 ? 'Magas' : 'Kritikus';
  const cls =
    score < 30 ? 'bg-green-500/20 text-green-300 border-green-500/40' :
    score < 55 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
    score < 75 ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
                 'bg-red-500/20 text-red-300 border-red-500/40';

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {label} kockázat
    </span>
  );
}

export default function UHIRiskCard({ buildingId }: Props) {
  const [data, setData] = useState<UHIRiskResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/uhi-risk?buildingId=${buildingId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [buildingId]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-slate-800/60 p-4 animate-pulse">
        <div className="h-4 w-40 rounded bg-slate-700 mb-3" />
        <div className="h-20 w-full rounded bg-slate-700" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl bg-slate-800/60 p-4 text-xs text-slate-500">
        Klímakockázati adatok nem elérhetők.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-orange-950/40 to-slate-800/60 border border-orange-800/20 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>🌡️</span> Hőszigat index
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">500 m-es körzetben számítva</p>
        </div>
        <RiskBadge score={data.climateScore} />
      </div>

      {/* Főérték */}
      <div className="flex items-center gap-4 mb-3">
        <UHIThermometer valueC={data.uhiIndexC} />
        <div className="flex-1">
          <p className="text-2xl font-black text-white">+{data.uhiIndexC}°C</p>
          <p className="text-xs text-slate-400 leading-tight">
            a vidéki alap felett (Unger J. 2010 módszertan)
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1">
            <div className="text-[10px] text-slate-500">
              Beépítettség: <span className="text-slate-300 font-semibold">{data.buildingRatioPct.toFixed(0)}%</span>
            </div>
            <div className="text-[10px] text-slate-500">
              Zöldfelület: <span className="text-slate-300 font-semibold">{data.greenRatioPct.toFixed(0)}%</span>
            </div>
            <div className="text-[10px] text-slate-500">
              NDVI proxy: <span className="text-slate-300 font-semibold">{data.ndviProxy.toFixed(2)}</span>
            </div>
            <div className="text-[10px] text-slate-500">
              Legk. park: <span className="text-slate-300 font-semibold">{data.nearestParkM} m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bővítő gomb */}
      <button
        className="text-[10px] text-orange-400 hover:text-orange-300 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {expanded ? '▲ Kevesebb részlet' : '▼ Részletes elemzés'}
      </button>

      {/* Részletes panel */}
      {expanded && (
        <div className="mt-3 space-y-2 border-t border-orange-800/20 pt-3">
          {/* Szezonális UHI sávchart */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 mb-1">Havi UHI-hozzájárulás (°C)</p>
            <div className="flex items-end gap-0.5 h-12">
              {data.monthlyUHI.map((val, i) => {
                const labels = ['J','F','M','Á','M','J','J','A','Sz','O','N','D'];
                const maxVal = Math.max(...data.monthlyUHI);
                const heightPct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full rounded-sm bg-orange-500/60"
                      style={{ height: `${heightPct}%` }}
                      title={`${labels[i]}: +${val}°C`}
                    />
                    <span className="text-[8px] text-slate-600">{labels[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Zöldtető potenciál */}
          <div className="rounded-lg bg-green-900/20 border border-green-700/20 p-2">
            <p className="text-[10px] font-semibold text-green-300">
              🌿 Zöldtető potenciál: {data.greenRoofPotential.toUpperCase()}
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5">
              Telepítéssel: −{data.roofTempReductionC}°C mikroklimatikus hatás, ~{data.roofCo2KgPerYear.toFixed(0)} kg CO₂/év megkötés
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 5.2 `HeatwaveAlert` banner komponens

```typescript
// components/heatwave-alert.tsx
'use client';

import { useEffect, useState } from 'react';
import type { HeatwaveResult } from '@/app/api/omsz-heatwave/route';

export default function HeatwaveAlert() {
  const [data, setData] = useState<HeatwaveResult | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/omsz-heatwave')
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data?.active || dismissed) return null;

  const maxLevel = Math.max(...data.warnings.map(w => w.level));
  const bannerColor =
    maxLevel === 3 ? 'bg-red-900/80 border-red-600/60' :
    maxLevel === 2 ? 'bg-orange-900/70 border-orange-600/50' :
                     'bg-yellow-900/60 border-yellow-600/40';
  const textColor = maxLevel === 3 ? 'text-red-200' : maxLevel === 2 ? 'text-orange-200' : 'text-yellow-200';
  const levelEmoji = maxLevel === 3 ? '🔴' : maxLevel === 2 ? '🟠' : '🟡';

  const firstWarning = data.warnings[0];

  return (
    <div className={`rounded-xl border p-3 mb-4 ${bannerColor}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span>{levelEmoji}</span>
            <span className={`text-sm font-bold ${textColor}`}>
              OMSZ Hőség-figyelmeztetés — {firstWarning.levelText}
            </span>
          </div>
          <p className={`text-xs ${textColor} opacity-90`}>
            Érvényes: {new Date(firstWarning.validFrom).toLocaleDateString('hu-HU')} – {new Date(firstWarning.validUntil).toLocaleDateString('hu-HU')}
          </p>
          {data.panelRiskNote && (
            <p className="text-[11px] text-orange-200 mt-1 bg-orange-900/30 rounded p-1.5 leading-relaxed">
              ⚠️ {data.panelRiskNote}
            </p>
          )}
        </div>
        <button
          className="text-slate-400 hover:text-white text-lg leading-none shrink-0"
          onClick={() => setDismissed(true)}
          aria-label="Bezárás"
        >×</button>
      </div>
      <div className="flex gap-2 mt-2">
        <a
          href="#husolo-helyek"
          className={`text-[11px] font-semibold px-2 py-1 rounded border ${textColor} border-current hover:bg-white/10 transition-colors`}
        >
          🧊 Hűsölőhelyek
        </a>
        <a
          href="https://www.met.hu/idojaras/veszely/riasztas/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-semibold px-2 py-1 rounded border border-slate-500 text-slate-300 hover:bg-white/10 transition-colors"
        >
          OMSZ riasztás ↗
        </a>
      </div>
    </div>
  );
}
```

### 5.3 `CoolSpotsList` komponens

```typescript
// components/cool-spots-list.tsx
'use client';

import type { CoolSpot } from '@/app/api/uhi-risk/route';

const TYPE_ICONS: Record<CoolSpot['type'], string> = {
  park: '🌳',
  library: '📚',
  mall: '🏬',
  fountain: '⛲',
  water: '💧',
  other: '📍',
};

const TYPE_LABELS: Record<CoolSpot['type'], string> = {
  park: 'Park / zöldterület',
  library: 'Könyvtár',
  mall: 'Bevásárlóközpont',
  fountain: 'Ivókút / szökőkút',
  water: 'Vízpart',
  other: 'Egyéb',
};

interface Props {
  spots: CoolSpot[];
  buildingLat: number;
  buildingLon: number;
}

export default function CoolSpotsList({ spots, buildingLat, buildingLon }: Props) {
  if (!spots.length) {
    return (
      <div id="husolo-helyek" className="rounded-xl bg-slate-800/50 p-4 text-sm text-slate-400 text-center">
        Nem találtunk hűsölőhelyet 800 m-es körzetben.
      </div>
    );
  }

  return (
    <div id="husolo-helyek" className="space-y-2">
      <h4 className="text-sm font-bold text-white mb-2">
        🧊 Hűsölőhelyek (800 m-es körzetben)
      </h4>
      {spots.map((spot, i) => {
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${buildingLat},${buildingLon}&destination=${spot.lat},${spot.lon}&travelmode=walking`;
        return (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg bg-slate-800/60 border border-slate-700/30 p-2.5 hover:border-slate-600/50 transition-colors"
          >
            <span className="text-xl shrink-0">{TYPE_ICONS[spot.type]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{spot.name}</p>
              <p className="text-[10px] text-slate-400">{TYPE_LABELS[spot.type]}</p>
              {spot.openingHours && (
                <p className="text-[9px] text-slate-500 mt-0.5">⏰ {spot.openingHours}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-blue-400">{spot.distanceM} m</p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] text-slate-500 hover:text-blue-400 transition-colors"
              >
                Útvonal ↗
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

## 6. WeatherWidget bővítése UHI offset-tel

A meglévő `components/weather-widget.tsx` fájl `WeatherWidget` komponensét ki kell egészíteni az urbánus hőszigat vizuális offsetjével. A widget alján, a heti előrejelzés felett jelenik meg:

```typescript
// Hozzáadandó a WeatherWidget komponenshez — a forecast szekció elé:

// Props bővítés:
// export default function WeatherWidget({ city = 'Budapest', buildingId }: { city?: string; buildingId?: string })

// State hozzáadás:
// const [uhiOffset, setUhiOffset] = useState<number | null>(null);

// useEffect bővítés (buildingId esetén):
// useEffect(() => {
//   if (!buildingId) return;
//   fetch(`/api/uhi-risk?buildingId=${buildingId}`)
//     .then(r => r.json())
//     .then(d => setUhiOffset(d.uhiIndexC))
//     .catch(() => {});
// }, [buildingId]);

// JSX betét a hőmérséklet-szám után:
{uhiOffset !== null && uhiOffset > 0.5 && (
  <div className="flex items-center justify-center gap-1 mt-0.5">
    <span className="text-[9px] text-orange-400 font-semibold">
      🌡️ +{uhiOffset}°C hőszigat
    </span>
  </div>
)}
```

---

## 7. Dedikált aloldal: `app/w/[workspaceId]/klimakockazat/page.tsx`

A dashboard overview kártyáján megjelenő „Részletes elemzés" gomb ide navigál. Az oldal az összes modul kibővített nézetét mutatja:

- `HeatwaveAlert` banner (felül)
- `UHIRiskCard` teljes nézetben, szezonális barcharttal
- `CoolSpotsList` teljes lista
- Tetőfelület elemzés részletes szekció
- Klímakockázati pontszám kördiagram
- Javasolt intézkedések lista (ActionPlan)
- Energetikai összefüggés: UHI hatása a hűtési energiaszükségletre

**Energetikai kapcsolat részletezése:**
A szakirodalom alapján (Santamouris, 2015 — „Cooling the cities") minden +1°C városi hőszigat-effektus az épületek hűtési energiaszükségletét átlagosan 3–5%-kal növeli. Egy tipikus 50 lakásos budapesti panelházban, ahol a nyári légkondicionáló-fogyasztás elérheti az éves villamosenergia-felhasználás 20–30%-át, ez reálisan 2–5%-os éves megtakarítási potenciált jelent a hőszigat-csökkentési intézkedések révén. Az aloldalon ezt a becslést számszerűsítve kell megjeleníteni az épület méretének és az aktuális UHI-indexnek a függvényében.

---

## 8. Panel-specifikus tartalom és EU kontextus

### 8.1 Hőszigetelés (ETICS) és UHI összefüggés

A panelházakon elvégzett homlokzati hőszigetelési beavatkozások (**ETICS** — External Thermal Insulation Composite System) nemcsak az épületen belüli komfortot javítják, hanem közvetlenül csökkentik az épület külső hőkibocsátását is:
- A fehér/világos külső vakolat albedója 0,60–0,85 (szemben az eredeti sötétebb homlokzatok 0,20–0,35-ös értékével)
- A magas albedó reflektálja a napsugárzást, kevesebb hőt abszorbeál az épület — ezáltal csökkenti a hőszigat-hozzájárulást
- Egy 8 emeletes, 50 lakásos panelház homlokzati felülete ~1800–2400 m²; ha ezt ETICS-szel látják el, az éjszakai hővisszasugárzás akár 15–25%-kal csökkenhet a közvetlenül körülvevő térben

### 8.2 EU Renovation Wave és hazai pályázati lehetőségek

- **EU Renovation Wave (2030-ra 35 millió épület felújítása):** Az Európai Unió Zöld Megállapodásának részeként 2020-ban meghirdetett program kifejezetten prioritásként kezeli az energiaszegény, rosszul szigetelt épületek (köztük a kelet-európai panelházak) felújítását
- **Hazai Otthonfelújítási Program:** 2021-es pályázat, amelynek keretében lakótársasági közös területek energetikai korszerűsítésére vissza nem térítendő támogatás volt igényelhető
- **Magyar Pályázati Ablak:** A panellako.hu javasolt intézkedések szekciója hivatkozzon a Palyazat.gov.hu és az NKFI releváns pályázataira

---

## 9. Sprint-alapú implementációs terv

### Sprint 1 (1. hét): Adatbázis-séma és API alap

**Feladatok:**
- [ ] Supabase migration elkészítése: `building_climate_risk` tábla létrehozása RLS-sel
- [ ] `buildings` tábla bővítése: `lat`, `lon`, `building_type`, `build_year`, `floors` mezők
- [ ] `app/api/uhi-risk/route.ts` alapváltozat: Overpass API integráció, UHI számítás, Supabase mentés
- [ ] `app/api/omsz-heatwave/route.ts`: OMSZ feed integráció (fallback: üres válasz ha API nem elérhető)
- [ ] Nominatim geocoding implementáció a coordinates hiány kezelésére

**Elfogadási kritérium:**
- Az API route `/api/uhi-risk?buildingId=<uuid>` 200 OK választ ad vissza helyes JSON struktúrával
- A Supabase `building_climate_risk` tábla feltöltődik az első lekérdezéskor
- A cache 24 óráig érvényes (második hívás `fromCache: true`-val tér vissza)

### Sprint 2 (2. hét): Fő UI komponensek

**Feladatok:**
- [ ] `UHIRiskCard` komponens teljes implementációja (hőmérő, badge, szezonális chart, zöldtető szekció)
- [ ] `HeatwaveAlert` banner komponens implementáció
- [ ] `CoolSpotsList` komponens implementáció Google Maps linkkel
- [ ] Dashboard integráció: komponensek elhelyezése a dashboard overview szekciójában
- [ ] WeatherWidget bővítése: UHI offset megjelenítése

**Elfogadási kritérium:**
- Dashboard-on megjelenik az UHIRiskCard és (hőhullám esetén) a HeatwaveAlert banner
- A WeatherWidget alatt látható az urbánus hőszigat offset, ha > 0,5°C
- A CoolSpotsList helyes adatokat mutat, a távolságok pontosak (±20% elfogadható)
- Minden szöveg helyes magyarnyelvű, nincs hardcoded angol szöveg

### Sprint 3 (3. hét): Dedikált aloldal és részletes elemzés

**Feladatok:**
- [ ] `app/w/[workspaceId]/klimakockazat/page.tsx` létrehozása
- [ ] Klímakockázati pontszám kördiagram (inline SVG, no külső charting library)
- [ ] ActionPlan (javasolt intézkedések) komponens, épület típusa szerinti tartalmakkal
- [ ] Energetikai összefüggés szekció: hűtési energiaszükséglet becslése
- [ ] Panel-specifikus tartalom: hőszigetelés, EU Renovation Wave hivatkozások
- [ ] Breadcrumb navigáció és Back-button kompatibilitás (pushState)

**Elfogadási kritérium:**
- Az aloldal URL-je `/w/<workspaceId>/klimakockazat`
- A Back gomb visszavisz a dashboardra
- Az ActionPlan panel típusa szerint különböző tartalmat mutat (panel vs. egyéb)
- A klímakockázati pontszám helyes és összhangban van a részadatokkal

### Sprint 4 (4. hét): Lokalizáció, tesztek, csiszolás

**Feladatok:**
- [ ] Minden user-facing string hozzáadása `src/i18n/resources/en.ts` és `src/i18n/resources/hu.ts` fájlokhoz
- [ ] Unit tesztek: `computeUHIIndex` függvény — 8 határeset tesztelése
- [ ] Unit tesztek: `haversineM` függvény — ismert koordinátapárok ellenőrzése
- [ ] Integration teszt: API route mock Overpass válasszal
- [ ] Mobile UX ellenőrzés: minden komponens 375px szélességen is olvasható
- [ ] Loading skeleton animációk az összes komponenshez
- [ ] Error boundary kezelés: ha az Overpass API timeout, graceful fallback

**Elfogadási kritérium:**
- `pnpm test` zöld a klímakockázat modulhoz tartozó összes teszten
- Minden komponens mobilon (375px) megfelelően jelenik meg, nincs horizontális scroll
- Nincs egyetlen hardcoded string sem — minden szöveg i18n kulcson keresztül jelenik meg

---

## 10. Tesztkritériumok részletezve

### 10.1 UHI számítás unit tesztek

```typescript
// __tests__/uhi-calculation.test.ts

import { describe, it, expect } from 'vitest';
// A computeUHIIndex és haversineM függvények exportálandók a route fájlból

describe('computeUHIIndex', () => {
  it('alacsony beépítés + magas zöldfelület = alacsony UHI', () => {
    // 15% beépítés, 45% zöld, park 150m-re, Duna 300m-re
    const result = computeUHIIndex(15, 45, 150, 300);
    expect(result).toBeLessThan(1.5);
  });

  it('magas beépítés + minimális zöldfelület = magas UHI', () => {
    // 70% beépítés, 5% zöld, park 2000m-re, nincs víztest
    const result = computeUHIIndex(70, 5, 2000, null);
    expect(result).toBeGreaterThan(4.5);
  });

  it('Csepel lakótelep jellegű terület', () => {
    // 55% beépítés, 12% zöld, park 700m-re, nincs víztest közel
    const result = computeUHIIndex(55, 12, 700, null);
    expect(result).toBeGreaterThan(3.0);
    expect(result).toBeLessThan(5.5);
  });

  it('Városliget közelségi hatás', () => {
    // 40% beépítés, 35% zöld (park melletti blokk), park 80m-re
    const result = computeUHIIndex(40, 35, 80, null);
    expect(result).toBeLessThan(2.0);
  });

  it('maximum érték nem haladja meg a 7.0°C-ot', () => {
    const result = computeUHIIndex(100, 0, 9999, null);
    expect(result).toBeLessThanOrEqual(7.0);
  });

  it('minimum értéknél sem negatív', () => {
    const result = computeUHIIndex(0, 100, 0, 0);
    expect(result).toBeGreaterThan(0);
  });
});

describe('haversineM', () => {
  it('Budapest Keleti → Keleti = 0m', () => {
    const d = haversineM(47.5002, 19.0836, 47.5002, 19.0836);
    expect(d).toBeCloseTo(0, 0);
  });

  it('Budapest Keleti → Oktogon ≈ 1500m', () => {
    const d = haversineM(47.5002, 19.0836, 47.5016, 19.0660);
    expect(d).toBeGreaterThan(1200);
    expect(d).toBeLessThan(1800);
  });

  it('Budapest → Pécs ≈ 190 km', () => {
    const d = haversineM(47.4979, 19.0402, 46.0727, 18.2323);
    expect(d / 1000).toBeGreaterThan(180);
    expect(d / 1000).toBeLessThan(210);
  });
});
```

### 10.2 Komponens tesztek (Vitest + Testing Library)

```typescript
// __tests__/uhi-risk-card.test.tsx

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UHIRiskCard from '@/components/uhi-risk-card';

const mockData = {
  buildingId: 'test-uuid',
  uhiIndexC: 3.2,
  buildingRatioPct: 52,
  greenRatioPct: 11,
  ndviProxy: 0.12,
  nearestParkM: 680,
  waterNearbyM: null,
  coolSpots: [],
  monthlyUHI: [1.2, 1.3, 1.5, 1.7, 1.9, 2.2, 2.5, 2.4, 2.0, 1.7, 1.4, 1.2],
  heatScore: 28,
  climateScore: 55,
  greenRoofPotential: 'magas' as const,
  roofTempReductionC: 1.2,
  roofCo2KgPerYear: 800,
  computedAt: '2026-05-17T10:00:00Z',
  fromCache: false,
};

describe('UHIRiskCard', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockData),
    });
  });

  it('megjelenik a UHI-index értéke', async () => {
    render(<UHIRiskCard buildingId="test-uuid" />);
    const value = await screen.findByText('+3.2°C');
    expect(value).toBeTruthy();
  });

  it('magas kockázat badge jelenik meg 55-ös score-ra', async () => {
    render(<UHIRiskCard buildingId="test-uuid" />);
    const badge = await screen.findByText('Magas kockázat');
    expect(badge).toBeTruthy();
  });
});
```

---

## 11. Lokalizációs kulcsok (i18n)

Az alábbi kulcsokat kell hozzáadni mind az `en.ts`, mind a `hu.ts` fájlhoz:

```typescript
// Hozzáadandó a locale fájlokhoz (uhi névtér)
uhi: {
  title: 'Hőszigat index',          // en: 'Heat Island Index'
  subtitle: '500 m-es körzetben számítva',  // en: 'Computed within 500m radius'
  ruralOffset: 'a vidéki alap felett',       // en: 'above rural baseline'
  methodology: 'Unger J. 2010 módszertan',   // en: 'Unger J. 2010 methodology'
  buildingRatio: 'Beépítettség',     // en: 'Building coverage'
  greenRatio: 'Zöldfelület',         // en: 'Green coverage'
  ndviProxy: 'NDVI proxy',           // en: 'NDVI proxy'
  nearestPark: 'Legk. park',         // en: 'Nearest park'
  monthlyChart: 'Havi UHI-hozzájárulás (°C)',  // en: 'Monthly UHI contribution (°C)'
  greenRoofPotential: 'Zöldtető potenciál',     // en: 'Green roof potential'
  showDetails: 'Részletes elemzés',  // en: 'Detailed analysis'
  hideDetails: 'Kevesebb részlet',   // en: 'Less detail'
  lowRisk: 'Alacsony kockázat',      // en: 'Low risk'
  mediumRisk: 'Közepes kockázat',    // en: 'Medium risk'
  highRisk: 'Magas kockázat',        // en: 'High risk'
  criticalRisk: 'Kritikus kockázat', // en: 'Critical risk'
  heatwaveTitle: 'OMSZ Hőség-figyelmeztetés', // en: 'OMSZ Heat Warning'
  coolSpotsTitle: 'Hűsölőhelyek (800 m-es körzetben)', // en: 'Cool spots (800m radius)'
  coolSpotsEmpty: 'Nem találtunk hűsölőhelyet 800 m-es körzetben.', // en: 'No cool spots found within 800m.'
  routeLink: 'Útvonal',              // en: 'Route'
  greenRoofHigh: 'magas',            // en: 'high'
  greenRoofMedium: 'közepes',        // en: 'medium'
  greenRoofLow: 'alacsony',          // en: 'low'
  tempReduction: 'mikroklimatikus hatás', // en: 'microclimatic effect'
  co2Capture: 'CO₂ megkötés',        // en: 'CO₂ capture'
}
```

---

## 12. Performancia és biztonsági szempontok

### 12.1 Overpass API terhelésvédelem

Az Overpass API rate-limitelt közszolgáltatás. A panellako.hu implementációban:
- A lekérdezés eredménye 24 óráig cache-elve van a Supabase-ben
- A `osm_query_hash` mező tárolja a lekérdezési paramétereket; csak akkor fut új lekérdezés, ha koordináta változott
- Szerver-oldali rate limiting: max 1 Overpass-hívás/perc/épület
- Fallback: ha Overpass timeout (25s-nél hosszabb válaszidő), a régi cache-értéket adjuk vissza `fromCache: true`-val

### 12.2 RLS és adatbiztonság

- A `building_climate_risk` tábla RLS-sel védett: csak az épület aktív tagjai olvashatják
- A `SUPABASE_SERVICE_ROLE_KEY` csak szerver-oldali API route-okban szerepel, soha kliens-oldali kódban
- A GPS koordináták és OSM adatok nem tekinthetők személyes adatnak (az épület nyilvános helyszíne), de az RLS megakadályozza illetéktelen hozzáférést

### 12.3 Bundle méret

- Ne importálj Recharts, Chart.js vagy más charting library-t — az inline SVG és Tailwind-alapú sávchart elegendő és ~0 KB-os bundle növekménnyel jár
- Az API hívások kliens-oldali `fetch` és `useState` kombinációjával oldandók meg (no SWR, no React Query — a meglévő codebase mintájával konzisztens)

---

## 13. CHANGELOG és verziózás

A modul bevezetésekor a következő fájlokat kell létrehozni vagy módosítani:

**CHANGELOG.md** — új bejegyzés:
```
## [X.Y.Z] — 2026-??-??
### Added
- Hősziget és Klímakockázat Modul: UHI-index kártya, hőhullám-riasztás banner, hűsölőhelyek lista
- Új API route: /api/uhi-risk (Overpass API integráció, Supabase cache)
- Új API route: /api/omsz-heatwave (OMSZ figyelmeztetés integráció)
- Supabase: building_climate_risk tábla RLS-sel
- Dedikált klímakockázati aloldal: /w/:workspaceId/klimakockazat
- WeatherWidget bővítése: urbánus hőszigat offset megjelenítése
- Panel-specifikus UHI elemzés: zöldtető potenciál, hőszigetelési javaslatok
```

**`versioning/DDMMYYNNN_vX.Y.Z_hosziget-klimakockazat-modul.md`** — engineering record

**`marketing/marketing_values/YYYYMMDD_vX.Y.Z_hosziget-klimakockazat-modul_marketing_value.md`** — marketing record

---

## 14. Kapcsolódó fejlesztési területek (jövőbeli sprint)

- **Valódi NDVI integráció:** Google Earth Engine API vagy Copernicus Land Service API-n keresztül tényleges Landsat/Sentinel NDVI értékek lehívása (prémium feature)
- **Szél-folyosók elemzése:** Budapest Városfejlesztési Tervei (BVT) tartalmazzák a tervezett szél-folyosókat; ezek integrálása javítaná a mikroklíma-modellt
- **Historikus hőhullám-adatok:** OMSZ historikus nyilvántartás alapján az épület lokációjának hőhullám-kitettsége az elmúlt 10 évben
- **Összehasonlítás más épületekkel:** Anonim benchmark más, hasonló típusú panelházakkal azonos városrészben
- **Szomszédos lakótelep szintű aggregáció:** Csepel, Zugló, Kőbánya lakótelepek UHI-térképe (heatmap overlay OSM alaptérképen)

---

*Prompt elkészítve: 2026-05-17. Alapja: SZTE geoinformatika szakdolgozat (hősziget jelenség, NDVI elemzés, OSM landuse analízis) + panellako.hu Next.js 14 / Supabase architektúra.*
