# FEATURE PROMPT 03 — Közelségi és Elérhetőségi Interaktív Térkép (Környezeti Közelségi Térkép)

## Áttekintés és szakdolgozati motiváció

A panellako.hu webapp lakóközösségek digitális irányítási platformja. Az épületek közvetlen fizikai környezete — a zöldfelületek, a tömegközlekedési hozzáférhetőség, a kerékpáros infrastruktúra, a levegőminőség és a hőszigetek — közvetlen hatással van az ott élők mindennapi életminőségére és az ingatlan értékére egyaránt. Ezt az összefüggést a csatolt SZTE geoinformatikai szakdolgozat különösen részletesen dokumentálja.

### Geoinformatikai háttér: az OSM adatszerkezet és a városi élhetőség

A szakdolgozat (SZTE Természettudományi és Informatikai Kar, 2020) alapvetően az OpenStreetMap (OSM) adatbázisát és a Geofabrik-tól letölthető shapefile rétegeket vizsgálta Budapest területén. Az OSM adatok két kulcsfontosságú rétege az elemzés szempontjából:

**A `landuse` réteg** a városon belüli területhasználatot írja le. Releváns értékek: `park`, `forest`, `grass`, `meadow`, `recreation_ground`, `cemetery`, `allotments`, `residential`, `commercial`, `industrial`. A szakdolgozat kimutatta, hogy a budapesti VII. kerületben a lakóterületek mindössze 4,2%-a zöldfelület, míg a XII. kerületben ez az arány 58% felett van — ez alapvetően meghatározza a lakók hőterhelését és levegőminőségét.

**A `natural` réteg** a természetes felszínborítást kódolja: `wood`, `scrub`, `heath`, `grassland`, `water`, `wetland`, `beach`. A városi hőszigetek szempontjából különösen fontos, hogy ezek a kategóriák hogyan arányulnak az épített felszínekhez.

A Geofabrik letöltési portálról (`download.geofabrik.de/europe/hungary-latest.osm.pbf`) érhető el az aktuális magyarországi OSM dump, amelyből az `osmium` vagy `osmfilter` eszközökkel kinyerhetők a releváns rétegek. A szakdolgozat elemzésére a QGIS 3.x szoftvert és a PostGIS adatbázist alkalmazták.

### BKK GTFS adatszerkezet és az elérhetőségi elemzés

A Budapest Közlekedési Központ (BKK) GTFS (General Transit Feed Specification) adatkészlete nyilvánosan elérhető a `bkk.hu` adatközpontján keresztül. A GTFS formátum 9 táblából áll, amelyeket a szakdolgozat az elérhetőségi elemzéshez felhasznált:

- **`agency.txt`** — A közlekedési vállalatok adatai (BKK, VOLÁNBUSZ stb.)
- **`calendar.txt`** — Menetrendi naptár (hétköznap/hétvége, érvényességi időszak)
- **`routes.txt`** — Járatok listája (route_id, route_short_name pl. „4-6", route_type: 0=metró, 1=villamos, 3=busz, 11=trolibusz)
- **`shapes.txt`** — A járatok mértani nyomvonala, GPS-koordináta-pontok sorozataként
- **`stop_times.txt`** — Megállókban való megállási idők (menetrend szerint)
- **`stops.txt`** — Megállók neve, GPS-koordinátái, elhelyezkedése
- **`trips.txt`** — Menetirányok (az egyes körök összekapcsolása a routes-szal és shapes-szel)

A szakdolgozat elemzése alapján egy átlagos budapesti panel lakóépülettől 400 méteres gyaloglási sugarán belül (ami kb. 5 perc séta) jellemzően 3-8 BKK megálló található, amelyeken keresztül az épület közlekedési hozzáférhetőségi indexe (`transit accessibility score`) számítható. A stops.txt fájlból a `location_type=0` értékű bejegyzések konkrét megállóhelyeket jelölnek, míg a `location_type=1` értékek állomás-csoportokat (pl. metro-bejáratokat).

### Kerékpáros útvonalak és légszennyezettség-kitettség

A szakdolgozat különleges relevanciát tulajdonít a kerékpározó közlekedők PM2.5 légszennyezettség-kitettségének. Egy antwerpeni kutatási módszertant adaptálva (amelyet a szakdolgozat 3.4 fejezete ismertet) megvizsgálták, hogy a budapesti kerékpáros nyomvonalak mennyiben teszik ki a kerékpárosokat fokozott légszennyezőanyag-expozíciónak. Az OSM `highway=cycleway`, `highway=path cycleway=*`, és `bicycle=designated` tagek jelölik a dedikált kerékpáros infrastruktúrát. A kutatás eredménye: a Duna-parti kerékpárút mentén mért PM2.5 szintek 23-31%-kal alacsonyabbak a belső budai forgalmi utakon mérteknél — ez az adat közvetlenül alátámasztja az elérhetőségi térkép kerékpáros rétegének fontosságát.

### Parkok és PM2.5 szűrő hatása

A szakdolgozat irodalomjegyzéke és saját mérési adatai alapján: a városi parkok és erdők képesek a finom szálló por (PM2.5) koncentrációját 31-53%-kal csökkenteni az erdőn belüli vagy park-szegélyi mérési pontokon az aszfaltozott, növényzet nélküli területekhez képest. Ez a hatás a fák levelein lévő viaszos bevonat és a turbulens légáramlás-módosítás kombinációjából adódik. Különösen hatékonyak a tűlevelűek (fenyők), amelyek télen is fenntartják e szűrőhatást. Ez az adat különösen fontos a lakóépületek zöldsétány-közelségének értékelésekor: egy park szélén lévő panel lakóépület lakói statisztikailag szignifikánsan jobb levegőt lélegzenek, mint ugyanazon utca másik oldalán élők.

### Városi hőszigetek és a beépítettség összefüggése

A szakdolgozat OSM beépítettségi adatai és a Landsat műholdképek kombinált elemzése alapján: a budapesti belső kerületek sűrűn beépített területein a nyári átlaghőmérséklet 3,5-6,2°C-kal magasabb a peremkerületek zöldterületi zónáihoz képest. Az épületek sűrűségét az OSM `building=*` réteg alapján, a `building:floors` tagből pedig a magassági adatok számíthatók. E két adatból egy épületszintű hőszigot-kockázati index kalkulálható.

---

## A fejlesztendő feature teljes műszaki specifikációja

### Feature neve: **Közelségi és Elérhetőségi Interaktív Térkép**
### Magyar belső neve a kódbázisban: `BuildingEnvironmentMap`
### Helye az alkalmazásban: Épület dashboard, „Környezet" tab
### Prioritás: KÖZEPES-MAGAS (élhetőségi és marketingértékű)
### Érintett útvonal: `/w/:workspaceId/building/:buildingId/environment`

---

## 1. Funkcionális követelmények

### 1.1 Interaktív térképnézet (Desktop)

A desktop nézetben az épület dashboardjának „Környezet" tab-ján megjelenik egy teljes szélességű interaktív térkép, amely:

- **Középpontja** az épület GPS-koordinátája (az adatbázisban tárolt `buildings.latitude`, `buildings.longitude`)
- **Alaptérkép** Mapbox GL JS vektoros csempékkel, dark téma (`mapbox://styles/mapbox/dark-v11`), OpenStreetMap adat mint alternatív forrás
- **Kezdeti zoom-szint**: 15 (kb. 800 méteres látómező), 1 km-es körzetben minden réteg betöltve
- **Rétegváltó panel** (jobb oldalt fix pozíciójú): checkboxok / pill-kapcsolók a rétegek be/kikapcsolásához

### 1.2 Megjelenítendő rétegek

**1. réteg — Zöld területek (Zöldfelületek)**
- Adatforrás: Overpass API valós idejű OSM lekérdezés, fallback: Supabase cache
- Lekért elemek: `landuse=park`, `landuse=forest`, `landuse=grass`, `landuse=meadow`, `leisure=park`, `leisure=garden`, `natural=wood`, `natural=grassland`
- Megjelenítés: félig áttetsző zöld kitöltés (fill-color: `#22c55e`, opacity: 0.35), zöld keret (stroke: `#16a34a`)
- Popup: park neve, terület nagysága (m²), OSM azonosító
- Kiegészítő overlay: 400 m-es gyaloglási izokron kör az épület köré (#22c55e, opacity: 0.08) — 5 perces sétatávolságot jelöl

**2. réteg — BKK megállók (Tömegközlekedés)**
- Adatforrás: BKK nyílt API, GTFS stops.txt, Overpass API (`highway=bus_stop`, `railway=tram_stop`, `railway=station`)
- Megállótípusok szerint eltérő ikon:
  - Metró: kék négyzet ikon `🔵 M`
  - Villamos: sárga kör ikon `🟡 V`
  - Busz: zöld háromszög ikon `🟢 B`
  - Trolibusz: piros téglalap ikon `🔴 T`
  - HÉV: lila ikon `🟣 H`
- Popup tartalom: megálló neve, járatszámok listája, becsült gyaloglási idő az épülettől (az Overpass API távolságadat alapján), következő indulás (ha elérhető a BKK GTFS-RT API-ból)
- Klaszterezés: 13-as zoom alatt csoportosítás, kör alakú klaszterjel számmal

**3. réteg — MOL Bubi kerékpárállomások**
- Adatforrás: `https://opendata.bkk.hu/api/realtime/molbubi` (vagy a MOL Bubi nyílt API)
- Alternatív forrás: Overpass API, `amenity=bicycle_rental` tag
- Ikon: kerékpár szimbólum, sárga-piros MOL-szín
- Popup: állomás neve, szabad dokk-helyek száma, elérhető kerékpárok száma (ha az API valós idejű adatot ad), távolság az épülettől
- Valós idejű frissítés: 5 percenként (a Next.js API route cachelési stratégiájával)

**4. réteg — Levegőminőség mérőállomások**
- Adatforrás: OpenAQ API (`https://api.openaq.io/v2/locations?country=HU&radius=5000&coordinates=LAT,LNG`)
- Alternatív/megerősítő forrás: OLM (Országos Légszennyezettségi Mérőhálózat) adatok
- Ikon: kör, amelynek kitöltési színe az aktuális AQI-indexet tükrözi:
  - Zöld (`#22c55e`): AQI 0-50
  - Sárga (`#eab308`): AQI 51-100
  - Narancssárga (`#f97316`): AQI 101-150
  - Piros (`#ef4444`): AQI 151-200
  - Lila (`#a855f7`): AQI 201+
- Popup: állomás neve, típusa, mért PM2.5, PM10, NO₂ értékek, mérés időpontja

**5. réteg — Gyalogos élhetőségi pontok (Walkability)**
- Lekért POI-k: `amenity=school`, `amenity=pharmacy`, `amenity=supermarket`, `amenity=hospital`, `amenity=kindergarten`, `amenity=post_office`, `amenity=bank`
- Ikon: kategóriaspecifikus szimbólum (iskola, gyógyszertár, bevásárlás, kórház)
- Popup: intézmény neve, típusa, nyitvatartás (ha elérhető az OSM-ből), becsült gyaloglási távolság
- Összesített `Walkability Score` a bal felső sarokban (0-100 skála, a 400/800/1200 m-en belüli POI-k száma és típusa alapján számítva)

**6. réteg — Hőszigot zónák (Urban Heat Island)**
- Adatforrás: Számított overlay, OSM épület-sűrűség alapján (Overpass API `building=*` lekérdezés)
- A hőszigot-szimulációs modell: hexagonális rácson az 1 km²-es cellánként számított épületsűrűség (épületek száma + átlagos emeletek száma produktuma)
- Megjelenítés: hőtérkép jellegű color ramp, kék (alacsony épületsűrűség) → sárga → narancssárga → piros (magas épületsűrűség, várható hőszigot)
- Opacity: 0.45, hogy az alaptérkép átüssön
- Tooltip: becsült hőszigot-intenzitás kategória (Alacsony / Közepes / Magas / Kritikus), összehasonlítás a kerületi átlaggal

### 1.3 Walkability Score számítási logika

A Walkability Score (W) számítása a következő képlettel történik:

```
W = Σ(POI_típus_súlya × min(1, POI_szám_400m/referencia_szám)) × 100 / Σ(súlyok)
```

Súlytábla:
| POI típus | Súly | Referencia_szám (400m-en belül) |
|-----------|------|--------------------------------|
| Gyógyszertár | 15 | 1 |
| Iskola/óvoda | 12 | 1 |
| Élelmiszer-bolt | 20 | 2 |
| BKK megálló | 18 | 3 |
| Park/zöldfelület | 15 | 1 (bármennyi) |
| Posta/bank | 10 | 1 |
| Kórház/egészségügy | 10 | 1 |

---

## 2. Térképkönyvtár-választás és indoklás

### Mapbox GL JS vs. Leaflet.js összehasonlítás

**Leaflet.js (react-leaflet)**
- Előnyök: Nyílt forráskód, kis bundle-méret (~40 KB), nincs API-kulcs szükséges, jól dokumentált, nagy közösség
- Hátrányok: Raszter csempéken alapul (WebGL nélkül), 3D megjelenítés nem lehetséges, nagy adatmennyiségnél (pl. több ezer POI pont) teljesítménye romlik, nincs natív vektoros csempe-támogatás
- Alkalmas: Egyszerű statikus térképekre, néhány száz markerrel

**Mapbox GL JS (react-map-gl)**
- Előnyök: WebGL-alapú renderelés, vektoros csempék (nagyon gyors, kis adatátvitel), layer-alapú stílusozás CSS-szerű, klaszterezés natív támogatása, smooth zoom és tilt, 3D épületek megjeleníthetők, kiváló mobil teljesítmény
- Hátrányok: Fizetős API a nagyobb forgalomnál (de a free tier 50.000 map load/hó ingyenes), bundle-méret (~250 KB), Mapbox API-kulcs szükséges
- Alkalmas: Komplex, adatgazdag interaktív térképekhez

**Döntés: Mapbox GL JS a `react-map-gl` csomaggal** — a panellako.hu élhetőségi térkép funkció igényli a vektoros rétegeket (hőszigot overlay, zöldfelület kitöltések), a nagy számú pontadat hatékony klaszterezését és a sötét téma zökkenőmentes integrálhatóságát. Az ingyenes tier elegendő egy B2B SaaS termék esetén, ahol épületenként legfeljebb néhány tucat felhasználó van.

**Alternatív tile provider lehetőségek:**
- `tile.openstreetmap.org` — teljesen ingyenes, de csak raszteres csempék, nincs vektoros stílusozás
- `MapTiler Cloud` — Mapbox-kompatibilis vektoros csempék, saját free tier (100.000 térkép-nézet/hó), OSM-alapú adatok
- `Stadia Maps` — ingyenes tier van, Stamen design örököse, GDPR-barát
- `Protomaps` — self-hostolt PMTiles formátum, teljesen ingyenes, de saját infrastruktúra kell

A javasolt megközelítés: `Mapbox GL JS` gyártásban Mapbox API-kulccsal, de a tile provider cserélhető legyen egy environment változó (`NEXT_PUBLIC_MAP_STYLE`) segítségével, amely vagy Mapbox stílusra, vagy MapTiler-re mutat.

---

## 3. TypeScript interfészek és adatmodellek

```typescript
// src/types/environment-map.ts

/** Épület alapkoordináta */
export interface BuildingCoordinate {
  latitude: number;
  longitude: number;
  buildingId: string;
  buildingName: string;
}

/** OSM zöldterület elem */
export interface GreenSpaceFeature {
  osmId: string;
  type: 'park' | 'forest' | 'garden' | 'grass' | 'meadow' | 'wood';
  name: string | null;
  geometry: GeoJSON.Geometry; // Polygon vagy MultiPolygon
  properties: {
    area_sqm: number;
    landuse?: string;
    leisure?: string;
    natural?: string;
    distance_m: number; // légvonalbeli távolság az épülettől
  };
}

/** BKK megálló adat */
export interface TransitStop {
  stopId: string;
  stopName: string;
  stopLat: number;
  stopLon: number;
  stopType: 'bus' | 'tram' | 'metro' | 'trolleybus' | 'hev' | 'ferry';
  routes: TransitRoute[];
  walkingDistanceM: number;
  walkingTimeMin: number;
}

export interface TransitRoute {
  routeId: string;
  shortName: string; // pl. "4-6", "47", "M2"
  longName: string;
  routeType: number; // GTFS route_type: 0=Metro, 1=Tram, 3=Bus, 11=Trolley
  color: string; // hex szín, pl. "#EE3224"
}

/** MOL Bubi állomás */
export interface BikeshareStation {
  stationId: string;
  stationName: string;
  latitude: number;
  longitude: number;
  totalDocks: number;
  availableBikes: number;
  availableDocks: number;
  lastUpdated: string; // ISO timestamp
  walkingDistanceM: number;
  walkingTimeMin: number;
}

/** Levegőminőség mérőállomás */
export interface AirQualityStation {
  stationId: string;
  stationName: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  stationType: 'traffic' | 'background' | 'industrial' | 'suburban';
  currentAqi: number;
  aqiCategory: 'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous';
  measurements: {
    pm25?: number;
    pm10?: number;
    no2?: number;
    o3?: number;
    so2?: number;
    co?: number;
  };
  measuredAt: string; // ISO timestamp
}

/** Walkability POI pont */
export interface WalkabilityPoi {
  osmId: string;
  name: string;
  poiType: 'school' | 'pharmacy' | 'supermarket' | 'hospital' | 'kindergarten' | 'post_office' | 'bank' | 'park';
  latitude: number;
  longitude: number;
  distanceM: number;
  walkingTimeMin: number;
  openingHours?: string;
}

/** Hőszigot hexagon cella */
export interface HeatIslandCell {
  cellId: string;
  center: [number, number]; // [lng, lat]
  boundingHex: GeoJSON.Polygon;
  buildingCount: number;
  avgFloors: number;
  densityScore: number; // 0-100
  heatCategory: 'low' | 'medium' | 'high' | 'critical';
}

/** A teljes épület-környezeti adatcsomag (API válasz) */
export interface BuildingMapData {
  buildingId: string;
  coordinates: BuildingCoordinate;
  greenSpaces: GreenSpaceFeature[];
  transitStops: TransitStop[];
  bikeshareStations: BikeshareStation[];
  airQualityStations: AirQualityStation[];
  walkabilityPois: WalkabilityPoi[];
  walkabilityScore: number; // 0-100
  heatIslandCells: HeatIslandCell[];
  cachedAt: string; // ISO timestamp
  cacheExpiresAt: string; // ISO timestamp
}

/** Réteg láthatósági állapot */
export interface MapLayerVisibility {
  greenSpaces: boolean;
  transitStops: boolean;
  bikeshareStations: boolean;
  airQualityStations: boolean;
  walkabilityPois: boolean;
  heatIsland: boolean;
}

/** Térképpanel konfigurációs props */
export interface BuildingEnvironmentMapProps {
  buildingId: string;
  initialLat: number;
  initialLng: number;
  buildingName: string;
  className?: string;
}
```

---

## 4. Next.js API Route: `/api/building-map-data/[buildingId]`

```typescript
// src/app/api/building-map-data/[buildingId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  fetchGreenSpaces,
  fetchTransitStops,
  fetchBikeshareStations,
  fetchAirQualityStations,
  fetchWalkabilityPois,
  computeHeatIsland,
  computeWalkabilityScore,
} from '@/lib/environment-map/fetchers';
import type { BuildingMapData } from '@/types/environment-map';

const CACHE_TTL_HOURS = 168; // 1 hét

export async function GET(
  request: NextRequest,
  { params }: { params: { buildingId: string } }
) {
  const supabase = createClient();
  const { buildingId } = params;

  // 1. Épület koordináták és jogosultság ellenőrzése
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id, name, latitude, longitude, workspace_id')
    .eq('id', buildingId)
    .single();

  if (buildingError || !building) {
    return NextResponse.json({ error: 'Building not found' }, { status: 404 });
  }

  // 2. Cache ellenőrzése
  const { data: cached } = await supabase
    .from('building_map_cache')
    .select('*')
    .eq('building_id', buildingId)
    .gt('cache_expires_at', new Date().toISOString())
    .single();

  if (cached) {
    return NextResponse.json(cached.map_data as BuildingMapData, {
      headers: {
        'X-Cache': 'HIT',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // 3. Párhuzamos adatlekérés
  const lat = building.latitude;
  const lng = building.longitude;

  const [greenSpaces, transitStops, bikeshareStations, airQualityStations, walkabilityPois] =
    await Promise.allSettled([
      fetchGreenSpaces(lat, lng, 1000),
      fetchTransitStops(lat, lng, 600),
      fetchBikeshareStations(lat, lng, 800),
      fetchAirQualityStations(lat, lng, 5000),
      fetchWalkabilityPois(lat, lng, 1200),
    ]);

  const greenSpacesData = greenSpaces.status === 'fulfilled' ? greenSpaces.value : [];
  const transitStopsData = transitStops.status === 'fulfilled' ? transitStops.value : [];
  const bikeshareData = bikeshareStations.status === 'fulfilled' ? bikeshareStations.value : [];
  const airQualityData = airQualityStations.status === 'fulfilled' ? airQualityStations.value : [];
  const walkabilityData = walkabilityPois.status === 'fulfilled' ? walkabilityPois.value : [];

  const walkabilityScore = computeWalkabilityScore(walkabilityData, transitStopsData, greenSpacesData);
  const heatIslandCells = await computeHeatIsland(lat, lng, 1000);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_TTL_HOURS * 60 * 60 * 1000);

  const mapData: BuildingMapData = {
    buildingId,
    coordinates: {
      latitude: lat,
      longitude: lng,
      buildingId,
      buildingName: building.name,
    },
    greenSpaces: greenSpacesData,
    transitStops: transitStopsData,
    bikeshareStations: bikeshareData,
    airQualityStations: airQualityData,
    walkabilityPois: walkabilityData,
    walkabilityScore,
    heatIslandCells,
    cachedAt: now.toISOString(),
    cacheExpiresAt: expiresAt.toISOString(),
  };

  // 4. Cache mentése
  await supabase.from('building_map_cache').upsert({
    building_id: buildingId,
    map_data: mapData,
    cached_at: now.toISOString(),
    cache_expires_at: expiresAt.toISOString(),
  });

  return NextResponse.json(mapData, {
    headers: {
      'X-Cache': 'MISS',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
```

---

## 5. Overpass API lekérdezések — Budapest zöldfelületek

Az Overpass API a `https://overpass-api.de/api/interpreter` végponton érhető el POST kéréssel. Az Overpass QL szintaxis rugalmas szűrési lehetőségeket biztosít.

### 5.1 Zöldfelületek lekérdezése adott koordináta körül (1 km-es sugarú kör)

```overpassql
[out:json][timeout:30];
(
  // Parkok és szabadidős területek
  way["leisure"="park"](around:1000,47.4979,19.0402);
  relation["leisure"="park"](around:1000,47.4979,19.0402);
  way["landuse"="park"](around:1000,47.4979,19.0402);
  way["landuse"="grass"](around:1000,47.4979,19.0402);
  way["landuse"="meadow"](around:1000,47.4979,19.0402);
  way["landuse"="forest"](around:1000,47.4979,19.0402);
  way["leisure"="garden"](around:1000,47.4979,19.0402);
  way["natural"="wood"](around:1000,47.4979,19.0402);
  way["natural"="grassland"](around:1000,47.4979,19.0402);
);
out body geom;
>;
out skel qt;
```

### 5.2 BKK megállók lekérdezése (500 m-es sugár)

```overpassql
[out:json][timeout:25];
(
  node["highway"="bus_stop"](around:500,47.4979,19.0402);
  node["public_transport"="stop_position"](around:500,47.4979,19.0402);
  node["railway"="tram_stop"](around:500,47.4979,19.0402);
  node["railway"="station"](around:500,47.4979,19.0402);
  node["station"="subway"](around:500,47.4979,19.0402);
);
out body;
```

### 5.3 Kerékpáros infrastruktúra és Bubi állomások

```overpassql
[out:json][timeout:25];
(
  // MOL Bubi kerékpár-kölcsönzők
  node["amenity"="bicycle_rental"](around:800,47.4979,19.0402);
  // Dedikált kerékpárutak
  way["highway"="cycleway"](around:1000,47.4979,19.0402);
  way["bicycle"="designated"](around:1000,47.4979,19.0402);
);
out body geom;
```

### 5.4 Walkability POI-k lekérdezése (1200 m-es sugár)

```overpassql
[out:json][timeout:35];
(
  node["amenity"="school"](around:1200,47.4979,19.0402);
  node["amenity"="kindergarten"](around:1200,47.4979,19.0402);
  way["amenity"="school"](around:1200,47.4979,19.0402);
  node["amenity"="pharmacy"](around:1200,47.4979,19.0402);
  node["amenity"="hospital"](around:1200,47.4979,19.0402);
  node["amenity"="doctors"](around:1200,47.4979,19.0402);
  node["shop"="supermarket"](around:1200,47.4979,19.0402);
  node["shop"="convenience"](around:1200,47.4979,19.0402);
  node["amenity"="post_office"](around:1200,47.4979,19.0402);
  node["amenity"="bank"](around:1200,47.4979,19.0402);
);
out body;
```

### 5.5 Hőszigot: épület-sűrűség lekérdezése (1 km körzetben)

```overpassql
[out:json][timeout:60];
(
  way["building"](around:1000,47.4979,19.0402);
  relation["building"](around:1000,47.4979,19.0402);
);
out body geom;
>;
out skel qt;
```

Ebből a válaszból a `building:levels` vagy `building:floors` property-k alapján számítható az emeletszám-átlag, és a poligon területéből az épület-sűrűség hexagonális rácsra vetítve.

---

## 6. Overpass fetcher implementáció TypeScript-ben

```typescript
// src/lib/environment-map/fetchers.ts

import type { GreenSpaceFeature, TransitStop, WalkabilityPoi } from '@/types/environment-map';

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

function haversineDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Föld sugara méterben
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function overpassQuery(query: string): Promise<any> {
  const response = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    next: { revalidate: 3600 }, // Next.js fetch cache: 1 óra
  });

  if (!response.ok) {
    throw new Error(`Overpass API hiba: ${response.status}`);
  }

  return response.json();
}

export async function fetchGreenSpaces(
  lat: number,
  lng: number,
  radiusM: number
): Promise<GreenSpaceFeature[]> {
  const query = `
    [out:json][timeout:30];
    (
      way["leisure"="park"](around:${radiusM},${lat},${lng});
      relation["leisure"="park"](around:${radiusM},${lat},${lng});
      way["landuse"="park"](around:${radiusM},${lat},${lng});
      way["landuse"="grass"](around:${radiusM},${lat},${lng});
      way["landuse"="meadow"](around:${radiusM},${lat},${lng});
      way["landuse"="forest"](around:${radiusM},${lat},${lng});
      way["leisure"="garden"](around:${radiusM},${lat},${lng});
      way["natural"="wood"](around:${radiusM},${lat},${lng});
    );
    out body geom;
    >;
    out skel qt;
  `;

  const data = await overpassQuery(query);

  return data.elements
    .filter((el: any) => el.type === 'way' && el.geometry)
    .map((el: any): GreenSpaceFeature => {
      const coords = el.geometry.map((pt: any) => [pt.lon, pt.lat]);
      const centroidLat = el.geometry.reduce((s: number, p: any) => s + p.lat, 0) / el.geometry.length;
      const centroidLng = el.geometry.reduce((s: number, p: any) => s + p.lon, 0) / el.geometry.length;
      const distance = haversineDistanceM(lat, lng, centroidLat, centroidLng);

      // Terület becslése (Shoelace formula)
      let area = 0;
      for (let i = 0; i < coords.length - 1; i++) {
        area += coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1];
      }
      const areaDeg2 = Math.abs(area / 2);
      // Durva konverzió fok² → m² (Magyarország szélességén ~111km/fok)
      const areaSqM = areaDeg2 * 111000 * 111000 * Math.cos((lat * Math.PI) / 180);

      return {
        osmId: String(el.id),
        type: (el.tags?.leisure || el.tags?.landuse || el.tags?.natural || 'park') as GreenSpaceFeature['type'],
        name: el.tags?.name || null,
        geometry: {
          type: 'Polygon',
          coordinates: [coords],
        },
        properties: {
          area_sqm: Math.round(areaSqM),
          landuse: el.tags?.landuse,
          leisure: el.tags?.leisure,
          natural: el.tags?.natural,
          distance_m: Math.round(distance),
        },
      };
    })
    .sort((a: GreenSpaceFeature, b: GreenSpaceFeature) => a.properties.distance_m - b.properties.distance_m);
}

export async function fetchWalkabilityPois(
  lat: number,
  lng: number,
  radiusM: number
): Promise<WalkabilityPoi[]> {
  const query = `
    [out:json][timeout:35];
    (
      node["amenity"~"school|kindergarten|pharmacy|hospital|doctors|post_office|bank"](around:${radiusM},${lat},${lng});
      node["shop"~"supermarket|convenience"](around:${radiusM},${lat},${lng});
      way["amenity"="school"](around:${radiusM},${lat},${lng});
      way["amenity"="kindergarten"](around:${radiusM},${lat},${lng});
    );
    out body;
  `;

  const data = await overpassQuery(query);

  const amenityTypeMap: Record<string, WalkabilityPoi['poiType']> = {
    school: 'school',
    kindergarten: 'kindergarten',
    pharmacy: 'pharmacy',
    hospital: 'hospital',
    doctors: 'hospital',
    post_office: 'post_office',
    bank: 'bank',
    supermarket: 'supermarket',
    convenience: 'supermarket',
  };

  return data.elements
    .filter((el: any) => el.lat && el.lon)
    .map((el: any): WalkabilityPoi => {
      const dist = haversineDistanceM(lat, lng, el.lat, el.lon);
      const amenity = el.tags?.amenity || el.tags?.shop || 'school';
      return {
        osmId: String(el.id),
        name: el.tags?.name || amenity,
        poiType: amenityTypeMap[amenity] || 'school',
        latitude: el.lat,
        longitude: el.lon,
        distanceM: Math.round(dist),
        walkingTimeMin: Math.round(dist / 80), // ~80 m/perc gyaloglási sebesség
        openingHours: el.tags?.opening_hours,
      };
    })
    .sort((a: WalkabilityPoi, b: WalkabilityPoi) => a.distanceM - b.distanceM);
}

export function computeWalkabilityScore(
  pois: WalkabilityPoi[],
  transitStops: TransitStop[],
  greenSpaces: GreenSpaceFeature[]
): number {
  const weights = {
    pharmacy: 15, school: 12, kindergarten: 8,
    supermarket: 20, hospital: 10, post_office: 5,
    bank: 5, park: 15, transit: 18,
  };
  const refs = {
    pharmacy: 1, school: 1, kindergarten: 1,
    supermarket: 2, hospital: 1, post_office: 1,
    bank: 1, park: 1, transit: 3,
  };

  const counts: Record<string, number> = {};
  for (const poi of pois.filter(p => p.distanceM <= 400)) {
    counts[poi.poiType] = (counts[poi.poiType] || 0) + 1;
  }
  counts['transit'] = transitStops.filter(s => s.walkingDistanceM <= 400).length;
  counts['park'] = greenSpaces.filter(g => g.properties.distance_m <= 400).length > 0 ? 1 : 0;

  let score = 0;
  let totalWeight = 0;
  for (const [type, weight] of Object.entries(weights)) {
    const ref = refs[type as keyof typeof refs];
    const count = counts[type] || 0;
    score += weight * Math.min(1, count / ref);
    totalWeight += weight;
  }

  return Math.round((score / totalWeight) * 100);
}
```

---

## 7. A fő React térkép-komponens: `BuildingEnvironmentMap`

```tsx
// src/components/building/BuildingEnvironmentMap.tsx
'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Map, {
  Source,
  Layer,
  Marker,
  Popup,
  NavigationControl,
  type MapRef,
  type MapMouseEvent,
} from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from '@/i18n/client';
import type {
  BuildingEnvironmentMapProps,
  BuildingMapData,
  MapLayerVisibility,
  TransitStop,
  WalkabilityPoi,
  AirQualityStation,
  BikeshareStation,
} from '@/types/environment-map';
import { LayerTogglePanel } from './LayerTogglePanel';
import { WalkabilityScoreBadge } from './WalkabilityScoreBadge';
import { MapPopupContent } from './MapPopupContent';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
const MAP_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE || 'mapbox://styles/mapbox/dark-v11';
const WALK_ISOCHRONE_RADIUS_DEGREES = 0.0036; // kb. 400 m szélességi fokon

const ISOCHRONE_CIRCLE = (lat: number, lng: number, radiusDeg: number): GeoJSON.Feature => ({
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      Array.from({ length: 64 }, (_, i) => {
        const angle = (i / 64) * 2 * Math.PI;
        return [lng + radiusDeg * Math.cos(angle), lat + radiusDeg * Math.sin(angle) * 0.7];
      }),
    ],
  },
});

export function BuildingEnvironmentMap({
  buildingId,
  initialLat,
  initialLng,
  buildingName,
  className,
}: BuildingEnvironmentMapProps) {
  const { t } = useI18n();
  const mapRef = useRef<MapRef>(null);
  const [popupInfo, setPopupInfo] = useState<{
    lat: number;
    lng: number;
    content: React.ReactNode;
  } | null>(null);
  const [layerVisibility, setLayerVisibility] = useState<MapLayerVisibility>({
    greenSpaces: true,
    transitStops: true,
    bikeshareStations: true,
    airQualityStations: false,
    walkabilityPois: false,
    heatIsland: false,
  });

  // Adatok lekérése
  const { data: mapData, isLoading, error } = useQuery<BuildingMapData>({
    queryKey: ['building-map-data', buildingId],
    queryFn: async () => {
      const res = await fetch(`/api/building-map-data/${buildingId}`);
      if (!res.ok) throw new Error('Térkép adatok betöltése sikertelen');
      return res.json();
    },
    staleTime: 1000 * 60 * 60, // 1 óra
    gcTime: 1000 * 60 * 60 * 24, // 24 óra
  });

  // GeoJSON a zöldfelületekhez
  const greenSpacesGeoJson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: (mapData?.greenSpaces || []).map((gs) => ({
      type: 'Feature',
      properties: { name: gs.name, area: gs.properties.area_sqm, type: gs.type },
      geometry: gs.geometry,
    })),
  };

  // Gyaloglási izokron körök GeoJSON
  const isochroneGeoJson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [ISOCHRONE_CIRCLE(initialLat, initialLng, WALK_ISOCHRONE_RADIUS_DEGREES)],
  };

  // Hőszigot GeoJSON
  const heatIslandGeoJson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: (mapData?.heatIslandCells || []).map((cell) => ({
      type: 'Feature',
      properties: { densityScore: cell.densityScore, category: cell.heatCategory },
      geometry: cell.boundingHex,
    })),
  };

  const handleTransitStopClick = useCallback((stop: TransitStop) => {
    setPopupInfo({
      lat: stop.stopLat,
      lng: stop.stopLon,
      content: (
        <MapPopupContent
          title={stop.stopName}
          subtitle={`${stop.walkingTimeMin} perc séta`}
          details={stop.routes.map((r) => `${r.shortName} — ${r.longName}`)}
          icon="transit"
          type={stop.stopType}
        />
      ),
    });
  }, []);

  const handleBikeshareClick = useCallback((station: BikeshareStation) => {
    setPopupInfo({
      lat: station.latitude,
      lng: station.longitude,
      content: (
        <MapPopupContent
          title={station.stationName}
          subtitle={`${station.walkingTimeMin} perc séta`}
          details={[
            `Elérhető kerékpár: ${station.availableBikes}`,
            `Szabad dokk: ${station.availableDocks}`,
          ]}
          icon="bike"
        />
      ),
    });
  }, []);

  const handleAqiClick = useCallback((station: AirQualityStation) => {
    setPopupInfo({
      lat: station.latitude,
      lng: station.longitude,
      content: (
        <MapPopupContent
          title={station.stationName}
          subtitle={`AQI: ${station.currentAqi} — ${station.aqiCategory}`}
          details={[
            station.measurements.pm25 ? `PM2.5: ${station.measurements.pm25} µg/m³` : null,
            station.measurements.no2 ? `NO₂: ${station.measurements.no2} µg/m³` : null,
            station.measurements.pm10 ? `PM10: ${station.measurements.pm10} µg/m³` : null,
          ].filter(Boolean) as string[]}
          icon="aqi"
          aqiLevel={station.currentAqi}
        />
      ),
    });
  }, []);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-zinc-900 rounded-xl ${className}`} style={{ minHeight: 480 }}>
        <div className="text-zinc-400 text-sm animate-pulse">{t('environmentMap.loading')}</div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden border border-zinc-800 ${className}`} style={{ minHeight: 480 }}>
      {/* Walkability score badge */}
      {mapData && (
        <div className="absolute top-3 left-3 z-10">
          <WalkabilityScoreBadge score={mapData.walkabilityScore} />
        </div>
      )}

      {/* Rétegváltó panel */}
      <div className="absolute top-3 right-3 z-10">
        <LayerTogglePanel
          visibility={layerVisibility}
          onChange={setLayerVisibility}
        />
      </div>

      {/* Mapbox GL térkép */}
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAP_STYLE}
        initialViewState={{
          longitude: initialLng,
          latitude: initialLat,
          zoom: 15,
        }}
        style={{ width: '100%', height: '100%', minHeight: 480 }}
        onClick={() => setPopupInfo(null)}
      >
        <NavigationControl position="bottom-right" />

        {/* Gyaloglási izokron kör — 400 m = 5 perc */}
        <Source id="isochrone" type="geojson" data={isochroneGeoJson}>
          <Layer
            id="isochrone-fill"
            type="fill"
            paint={{ 'fill-color': '#22c55e', 'fill-opacity': 0.06 }}
          />
          <Layer
            id="isochrone-border"
            type="line"
            paint={{ 'line-color': '#22c55e', 'line-width': 1.5, 'line-dasharray': [4, 3] }}
          />
        </Source>

        {/* Zöld területek */}
        {layerVisibility.greenSpaces && (
          <Source id="green-spaces" type="geojson" data={greenSpacesGeoJson}>
            <Layer
              id="green-spaces-fill"
              type="fill"
              paint={{ 'fill-color': '#22c55e', 'fill-opacity': 0.35 }}
            />
            <Layer
              id="green-spaces-border"
              type="line"
              paint={{ 'line-color': '#16a34a', 'line-width': 1 }}
            />
          </Source>
        )}

        {/* Hőszigot overlay */}
        {layerVisibility.heatIsland && (
          <Source id="heat-island" type="geojson" data={heatIslandGeoJson}>
            <Layer
              id="heat-island-fill"
              type="fill"
              paint={{
                'fill-color': [
                  'interpolate', ['linear'],
                  ['get', 'densityScore'],
                  0, '#3b82f6',
                  33, '#eab308',
                  66, '#f97316',
                  100, '#ef4444',
                ],
                'fill-opacity': 0.45,
              }}
            />
          </Source>
        )}

        {/* Épület saját markere */}
        <Marker longitude={initialLng} latitude={initialLat} anchor="center">
          <div className="w-5 h-5 rounded-full bg-white border-4 border-blue-500 shadow-lg" />
        </Marker>

        {/* BKK megálló markerek */}
        {layerVisibility.transitStops &&
          (mapData?.transitStops || []).map((stop) => (
            <Marker
              key={stop.stopId}
              longitude={stop.stopLon}
              latitude={stop.stopLat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleTransitStopClick(stop);
              }}
            >
              <TransitStopMarker stopType={stop.stopType} />
            </Marker>
          ))}

        {/* MOL Bubi markerek */}
        {layerVisibility.bikeshareStations &&
          (mapData?.bikeshareStations || []).map((station) => (
            <Marker
              key={station.stationId}
              longitude={station.longitude}
              latitude={station.latitude}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleBikeshareClick(station);
              }}
            >
              <BikeShareMarker availableBikes={station.availableBikes} />
            </Marker>
          ))}

        {/* AQI mérőállomás markerek */}
        {layerVisibility.airQualityStations &&
          (mapData?.airQualityStations || []).map((station) => (
            <Marker
              key={station.stationId}
              longitude={station.longitude}
              latitude={station.latitude}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleAqiClick(station);
              }}
            >
              <AqiMarker aqi={station.currentAqi} />
            </Marker>
          ))}

        {/* Walkability POI markerek */}
        {layerVisibility.walkabilityPois &&
          (mapData?.walkabilityPois || []).slice(0, 30).map((poi) => (
            <Marker
              key={poi.osmId}
              longitude={poi.longitude}
              latitude={poi.latitude}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupInfo({
                  lat: poi.latitude,
                  lng: poi.longitude,
                  content: (
                    <MapPopupContent
                      title={poi.name}
                      subtitle={`${poi.walkingTimeMin} perc séta`}
                      icon={poi.poiType}
                    />
                  ),
                });
              }}
            >
              <PoiMarker poiType={poi.poiType} />
            </Marker>
          ))}

        {/* Popup */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.lng}
            latitude={popupInfo.lat}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            className="!bg-zinc-900 !border-zinc-700 !text-white"
          >
            {popupInfo.content}
          </Popup>
        )}
      </Map>
    </div>
  );
}

// Marker al-komponensek
function TransitStopMarker({ stopType }: { stopType: string }) {
  const colors: Record<string, string> = {
    metro: 'bg-blue-500',
    tram: 'bg-yellow-400',
    bus: 'bg-green-500',
    trolleybus: 'bg-red-500',
    hev: 'bg-purple-500',
  };
  return (
    <div className={`w-4 h-4 rounded-sm ${colors[stopType] || 'bg-gray-400'} border-2 border-white shadow cursor-pointer hover:scale-110 transition-transform`} />
  );
}

function BikeShareMarker({ availableBikes }: { availableBikes: number }) {
  return (
    <div className="w-5 h-5 rounded-full bg-red-600 border-2 border-yellow-400 flex items-center justify-center text-white text-[8px] font-bold shadow cursor-pointer hover:scale-110 transition-transform">
      {availableBikes}
    </div>
  );
}

function AqiMarker({ aqi }: { aqi: number }) {
  const color = aqi <= 50 ? '#22c55e' : aqi <= 100 ? '#eab308' : aqi <= 150 ? '#f97316' : '#ef4444';
  return (
    <div
      className="w-5 h-5 rounded-full border-2 border-white shadow cursor-pointer hover:scale-110 transition-transform"
      style={{ backgroundColor: color }}
    />
  );
}

function PoiMarker({ poiType }: { poiType: string }) {
  const icons: Record<string, string> = {
    school: '🏫',
    kindergarten: '🎒',
    pharmacy: '💊',
    hospital: '🏥',
    supermarket: '🛒',
    post_office: '📮',
    bank: '🏦',
  };
  return (
    <div className="text-lg cursor-pointer hover:scale-110 transition-transform drop-shadow-lg">
      {icons[poiType] || '📍'}
    </div>
  );
}
```

---

## 8. Supabase adatbázis séma kiegészítések

```sql
-- supabase/migrations/20260517_building_map_cache.sql

-- Épület térképi adatok cache táblája
CREATE TABLE IF NOT EXISTS public.building_map_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    map_data JSONB NOT NULL,
    cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    cache_expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_building_map_cache_building UNIQUE (building_id)
);

-- Index a cache érvényességi idő alapú szűréshez
CREATE INDEX IF NOT EXISTS idx_building_map_cache_expires
    ON public.building_map_cache (building_id, cache_expires_at);

-- RLS engedélyek: csak az épület saját workspace-tagjai olvashatnak
ALTER TABLE public.building_map_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "building_map_cache_select"
    ON public.building_map_cache
    FOR SELECT
    USING (
        building_id IN (
            SELECT b.id FROM public.buildings b
            JOIN public.workspace_members wm ON wm.workspace_id = b.workspace_id
            WHERE wm.user_id = auth.uid()
        )
    );

-- Csak a service_role írhat (API route backend)
CREATE POLICY "building_map_cache_insert_service"
    ON public.building_map_cache
    FOR ALL
    USING (auth.role() = 'service_role');

-- buildings tábla kiegészítése, ha még nem tartalmazza:
ALTER TABLE public.buildings
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Walkability score tárolása az épületen (opcionális, ha a cache-ből akarjuk rendezni)
ALTER TABLE public.buildings
    ADD COLUMN IF NOT EXISTS walkability_score INTEGER CHECK (walkability_score BETWEEN 0 AND 100);

COMMENT ON TABLE public.building_map_cache IS
    'Épületek közelségi és elérhetőségi térképadatainak heti cache-e. Az Overpass API, BKK API és OpenAQ API válaszai itt kerülnek tárolásra a szerver-oldali kiszámítás eredményeivel együtt.';
```

---

## 9. BKK API és GTFS integráció

A BKK nyílt adatai két formában érhetők el:

### 9.1 BKK GTFS statikus adatok
URL: `https://opendata.bkk.hu/data-sources` → letölthető ZIP fájl, tartalmazza az összes fentiekben leírt `.txt` táblát. A stops.txt fájl közel 4000 megállót tartalmaz, amelyek a `stop_lat`, `stop_lon` koordinátákkal térinformatikailag lekérdezhetők. Mivel a GTFS adat hetente frissülhet, a legegyszerűbb megoldás: a stops.txt és routes.txt fájlokat importálni egy Supabase táblába, és az SQL-ben térinformatikai lekérdezéssel (PostGIS `ST_DWithin`) szűrni a közelben lévő megállókat.

### 9.2 BKK GTFS-RT valós idejű API
URL: `https://go.bkk.hu/api/query/v1/ws/otp/plan` — OTP (OpenTripPlanner) kompatibilis tömegközlekedési útvonaltervező API. Elérhető egy API kulccsal, amelyet a `https://opendata.bkk.hu` portálon lehet igényelni.

Példa lekérdezés a legközelebbi megállókhoz:
```typescript
async function fetchTransitStops(lat: number, lng: number, radiusM: number) {
  const params = new URLSearchParams({
    appId: process.env.BKK_API_KEY!,
    lat: String(lat),
    lon: String(lng),
    radius: String(radiusM),
    includeReferences: 'agencies,routes,stops',
    version: '4',
    limit: '20',
  });

  const res = await fetch(
    `https://go.bkk.hu/api/query/v1/ws/otp/nearest-stops?${params}`,
    { next: { revalidate: 3600 } }
  );

  const json = await res.json();
  // Feldolgozás...
}
```

---

## 10. Rétegváltó panel UI komponens

```tsx
// src/components/building/LayerTogglePanel.tsx
'use client';

import { useI18n } from '@/i18n/client';
import type { MapLayerVisibility } from '@/types/environment-map';

interface LayerTogglePanelProps {
  visibility: MapLayerVisibility;
  onChange: (v: MapLayerVisibility) => void;
}

const LAYERS = [
  { key: 'greenSpaces', labelKey: 'environmentMap.layer.greenSpaces', color: '#22c55e', icon: '🌿' },
  { key: 'transitStops', labelKey: 'environmentMap.layer.transit', color: '#3b82f6', icon: '🚌' },
  { key: 'bikeshareStations', labelKey: 'environmentMap.layer.bikeshare', color: '#f59e0b', icon: '🚲' },
  { key: 'airQualityStations', labelKey: 'environmentMap.layer.airQuality', color: '#a855f7', icon: '💨' },
  { key: 'walkabilityPois', labelKey: 'environmentMap.layer.walkability', color: '#06b6d4', icon: '🚶' },
  { key: 'heatIsland', labelKey: 'environmentMap.layer.heatIsland', color: '#ef4444', icon: '🌡️' },
] as const;

export function LayerTogglePanel({ visibility, onChange }: LayerTogglePanelProps) {
  const { t } = useI18n();

  return (
    <div className="bg-zinc-900/90 backdrop-blur border border-zinc-700 rounded-xl p-3 flex flex-col gap-2 min-w-[180px] shadow-xl">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
        {t('environmentMap.layers')}
      </p>
      {LAYERS.map(({ key, labelKey, color, icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange({ ...visibility, [key]: !visibility[key] })}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all ${
            visibility[key]
              ? 'bg-zinc-700 text-white'
              : 'bg-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <span
            className="w-3 h-3 rounded-full flex-shrink-0 border border-white/20"
            style={{ backgroundColor: visibility[key] ? color : '#52525b' }}
          />
          <span>{icon}</span>
          <span className="leading-tight">{t(labelKey)}</span>
        </button>
      ))}
    </div>
  );
}
```

---

## 11. Lokalizáció — i18n kulcsok (kötelező, v3.7.2 óta)

### `src/i18n/resources/hu.ts` kiegészítése

```typescript
// Hozzáadandó a hu.ts locale fájl megfelelő szekciójába:
environmentMap: {
  loading: 'Térkép adatok betöltése...',
  error: 'A térkép adatok betöltése sikertelen.',
  layers: 'Rétegek',
  walkabilityScore: 'Élhetőségi pontszám',
  walkabilityLabel: '/ 100',
  layer: {
    greenSpaces: 'Zöld területek',
    transit: 'BKK megállók',
    bikeshare: 'MOL Bubi',
    airQuality: 'Levegőminőség',
    walkability: 'Gyalogos POI-k',
    heatIsland: 'Hőszigot',
  },
  popup: {
    walkingTime: 'perc séta',
    availableBikes: 'Elérhető kerékpár',
    freeDocks: 'Szabad dokk',
    aqi: 'Levegőminőség index',
    area: 'Terület',
    nextDeparture: 'Következő indulás',
    lines: 'Járatok',
    openingHours: 'Nyitvatartás',
  },
  isochroneLabel: '5 perces gyaloglási zóna',
  cacheInfo: 'Adatok frissítve: {{date}}',
  scoreCategories: {
    excellent: 'Kiváló',
    good: 'Jó',
    average: 'Átlagos',
    poor: 'Gyenge',
    veryPoor: 'Nagyon gyenge',
  },
  heatIslandCategories: {
    low: 'Alacsony hőterhelés',
    medium: 'Közepes hőterhelés',
    high: 'Magas hőterhelés',
    critical: 'Kritikus hőszigot',
  },
},
```

### `src/i18n/resources/en.ts` kiegészítése

```typescript
environmentMap: {
  loading: 'Loading map data...',
  error: 'Failed to load map data.',
  layers: 'Layers',
  walkabilityScore: 'Livability score',
  walkabilityLabel: '/ 100',
  layer: {
    greenSpaces: 'Green spaces',
    transit: 'BKK stops',
    bikeshare: 'MOL Bubi',
    airQuality: 'Air quality',
    walkability: 'Walkability POIs',
    heatIsland: 'Heat island',
  },
  popup: {
    walkingTime: 'min walk',
    availableBikes: 'Available bikes',
    freeDocks: 'Free docks',
    aqi: 'Air Quality Index',
    area: 'Area',
    nextDeparture: 'Next departure',
    lines: 'Lines',
    openingHours: 'Opening hours',
  },
  isochroneLabel: '5-minute walking zone',
  cacheInfo: 'Data refreshed: {{date}}',
  scoreCategories: {
    excellent: 'Excellent',
    good: 'Good',
    average: 'Average',
    poor: 'Poor',
    veryPoor: 'Very poor',
  },
  heatIslandCategories: {
    low: 'Low heat load',
    medium: 'Medium heat load',
    high: 'High heat load',
    critical: 'Critical heat island',
  },
},
```

---

## 12. Mobil responsive viselkedés

A térkép a `md` Tailwind breakpoint (768 px) alatt kártyaalapú listanézetre vált, mivel az interaktív térkép kis kijelzőn rossz UX-t nyújt (pinch-to-zoom konfliktusos a görgetéssel).

```tsx
// src/components/building/BuildingEnvironmentTab.tsx
'use client';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { BuildingEnvironmentMap } from './BuildingEnvironmentMap';
import { BuildingEnvironmentCardList } from './BuildingEnvironmentCardList';

export function BuildingEnvironmentTab({ buildingId, lat, lng, name }: {
  buildingId: string;
  lat: number;
  lng: number;
  name: string;
}) {
  const isMobile = useMediaQuery('(max-width: 767px)');

  if (isMobile) {
    return <BuildingEnvironmentCardList buildingId={buildingId} />;
  }

  return (
    <BuildingEnvironmentMap
      buildingId={buildingId}
      initialLat={lat}
      initialLng={lng}
      buildingName={name}
      className="h-[560px] w-full"
    />
  );
}
```

A kártyaalapú listanézet (`BuildingEnvironmentCardList`) az egyes rétegeket kártyákban jeleníti meg: pl. „Legközelebbi BKK megálló: Blaha Lujza tér (320 m, 4 perc)" formátumban, egymás alatt görgethető listán.

---

## 13. Teljesítményszempontok

### 13.1 Marker klaszterezés
A Mapbox GL JS natív klaszterezési képessége a `Source` komponens `cluster`, `clusterRadius` és `clusterMaxZoom` property-jeivel aktiválható. 13-as zoom szint alatt minden réteg klaszterezett, 15-ös zoom felett egyedi markerek.

```tsx
<Source
  id="transit-stops-source"
  type="geojson"
  data={transitGeoJson}
  cluster={true}
  clusterRadius={50}
  clusterMaxZoom={13}
>
```

### 13.2 Lazy loading és code splitting
A térkép komponens csak a „Környezet" tab aktíválásakor töltődik be:
```tsx
const BuildingEnvironmentMap = dynamic(
  () => import('@/components/building/BuildingEnvironmentMap'),
  { ssr: false, loading: () => <MapSkeleton /> }
);
```
Az `ssr: false` kritikus, mert a Mapbox GL JS window objektumot igényel.

### 13.3 Cache stratégia
- Szerver oldal: Supabase `building_map_cache` tábla — 1 hetes érvényesség (zöldfelületek nem változnak naponta)
- Next.js fetch cache: `next: { revalidate: 3600 }` az Overpass API hívásoknál
- Kliens oldal: `@tanstack/react-query` 1 órás `staleTime` beállítással

### 13.4 Csempe-gyorsítótározás
A Mapbox vektoros csempéit a böngésző automatikusan cache-eli a Service Worker segítségével. A dark-v11 stílusfájl gzip-pel tömörítve kb. 42 KB, a vektoros csempék területtől függően 5-80 KB/csempe.

---

## 14. Biztonsági szempontok

- **Felhasználó tartózkodási helye nem kerül tárolásra**: a térkép mindig az épület GPS-koordinátájára centrál (adatbázisból), nem kér és nem tárol böngészős geolokációt
- **Overpass API rate limit**: az Overpass nyilvános API-nak van sebességkorlátja. Ha egy épület cache-e hiányzik, az API-hívás szerver oldalon fut, nem a felhasználó böngészőjéből — így egyetlen IP-ből (a Next.js szerver) érik el, ami stabil
- **Mapbox token scope**: a `NEXT_PUBLIC_MAPBOX_TOKEN` csak olvasható scope-ot kapjon (styles:read, tiles:read); nem szükséges sem írási, sem datasets scope
- **API kulcs védelme**: a BKK API kulcs és az OpenAQ kulcs csak szerver oldali environment variableként (`BKK_API_KEY`, `OPENAQ_API_KEY`) kerüljön tárolásra, soha nem `NEXT_PUBLIC_` prefix-szel

---

## 15. Implementációs roadmap (sprint bontásban)

### Sprint 1 — Alapinfrastruktúra (1 hét)
1. `npm install react-map-gl mapbox-gl @types/mapbox-gl` — függőségek telepítése
2. Supabase migráció futtatása: `building_map_cache` tábla és buildings koordináta oszlopok
3. Mapbox token beállítása a `.env.local` fájlban és a Vercel projekt dashboard-ban
4. Alap `BuildingEnvironmentMap` komponens: csak az épület helyzetjelzője és az alaptérkép, sötét stílussal
5. Reszponzív `BuildingEnvironmentTab` wrapper elkészítése
6. i18n kulcsok hozzáadása mindkét locale fájlhoz
7. Gyalogos izokron kör megjelenítése (statikus, nem valós routing alapján)

**Sprint 1 elfogadási kritériumok:**
- [x] Az épület dashboardján megjelenik a térkép, az épület pirossal jelölve
- [x] A sötét Mapbox téma megjelenik, nincs fehér villanás
- [x] Mobile nézetben a térképhelyett kártyalista jelenik meg
- [x] A zöld szaggatott kör az épület köré rajzolódik

### Sprint 2 — Zöld területek és tömegközlekedés (1 hét)
1. Overpass API zöldfelület-lekérdező függvény implementálása
2. BKK megállók lekérdezése és megjelenítése
3. `GET /api/building-map-data/[buildingId]` route létrehozása
4. Cache mentés Supabase-be
5. Rétegváltó panel UI (LayerTogglePanel)
6. Popup-ok zöldfelületekre és megállókra

**Sprint 2 elfogadási kritériumok:**
- [x] A 47.49°N, 19.04°E (Blaha Lujza tér) koordinátájú tesztépületnél legalább 3 park és 5 megálló jelenik meg
- [x] Popup tartalmaz megálló nevet és becsült gyaloglási időt
- [x] Cache MISS után az adat Supabase-be kerül (ellenőrizhető a Dashboard-ban)
- [x] Második betöltésnél `X-Cache: HIT` fejléc jelenik meg

### Sprint 3 — MOL Bubi, AQI és Walkability (1 hét)
1. MOL Bubi API integráció (vagy Overpass fallback)
2. OpenAQ API integráció, AQI-szín logika
3. Walkability POI lekérés és score számítás
4. WalkabilityScoreBadge komponens
5. Klaszterezés bekapcsolása a tömegközlekedési rétegen

**Sprint 3 elfogadási kritériumok:**
- [x] Walkability score helyes és 0-100 között van
- [x] AQI marker zöld, ha PM2.5 < 10 µg/m³
- [x] Bubi állomás popup megjeleníti az elérhető kerékpárok számát
- [x] 50+ megálló esetén klaszterezés lép érvénybe zoom 14 alatt

### Sprint 4 — Hőszigot és finomítások (1 hét)
1. Épületsűrűség lekérdező Overpass query implementálása
2. Hexagonális rács generáló algoritmus
3. Hőszigot color ramp megjelenítése
4. Mobil kártyalista teljes implementációja
5. Teljesítménymérés (Lighthouse, Core Web Vitals)
6. Hibakezelés és fallback állapotok

**Sprint 4 elfogadási kritériumok:**
- [x] Hőszigot overlay legalább 15 hexagon cellát jelenít meg
- [x] A térkép Lighthouse Performance > 70 mobilon
- [x] Ha az Overpass API nem elérhető, a cache-ből tölt be, nem jelenít meg hibát
- [x] A mobil kártyalista 300ms-on belül renderelődik (nincs vászon-inicializáció)

---

## 16. Tesztelési kritériumok (konkrét pass/fail feltételek)

### 16.1 Egységtesztek (Jest / Vitest)

| Teszt | Pass feltétel | Fail feltétel |
|-------|---------------|---------------|
| `haversineDistanceM(47.4979, 19.0402, 47.5013, 19.0527)` | Visszaad 950-1050 méter közötti értéket | Bármely más érték |
| `computeWalkabilityScore([], [], [])` | Visszaad 0-t | Bármely más érték |
| `computeWalkabilityScore` 3 db 400m-en belüli BKK megállóval | ≥ 60 pontot ad | < 60 pont |
| AQI color mapping 45-ös értékre | `#22c55e` (zöld) | Bármely más szín |
| AQI color mapping 175-ös értékre | `#ef4444` (piros) | Bármely más szín |

### 16.2 Integrációs tesztek (Playwright)

| Teszt | Pass feltétel |
|-------|---------------|
| `/w/<uuid>/building/<id>/environment` oldal betölt | A térkép vászon (canvas) megjelenik, `mapboxgl` objektum elérhető |
| Rétegváltó: zöld területek kikapcsolása | A GeoJSON source eltűnik a DOM-ból |
| BKK megállóra kattintás | Popup megjelenik a megálló nevével |
| Mobile viewport (375px széles) | Canvas nem jelenik meg, kártyalista igen |

### 16.3 Teljesítménytesztek

- A `GET /api/building-map-data/<id>` válasz cache MISS esetén ≤ 8 másodperc (Overpass API időkorlátja 30 s, de párhuzamos hívás)
- Cache HIT esetén ≤ 200 ms
- A Mapbox csempe-betöltés 4G mobilon ≤ 3 másodperc az első interaktív állapotig

### 16.4 Hozzáférhetőség (a11y)

- A rétegváltó gombok keyboard-fókuszálhatók, `aria-pressed` attribútum jelzi az aktív állapotot
- A térkép vászon `role="application"` és `aria-label` attribútummal rendelkezik
- A kártyalista nézet screenreader-barát, minden kártya értelmes `aria-label`-lel

---

## 17. Térkép URL-struktúra és az alkalmazás routing

A v3.16.0 óta érvényes workspace UUID-in URL-alapú routing miatt az útvonal:

```
/w/:workspaceId/building/:buildingId
```

A „Környezet" tab az épület dashboard-on belül, nem külön útvonal, hanem `?tab=environment` search param-mal kezelt nézet. A searchParams-ba nem kerül felhasználói azonosító, csak az aktív tab neve. A tab-váltás pushState-tel történik (nem replace), hogy a Vissza gomb az előző tab-ra vigyen vissza.

---

## 18. Kapcsolódó fájlok és mappák a kódbázisban

```
src/
  app/
    api/
      building-map-data/
        [buildingId]/
          route.ts                  ← API route (server)
  components/
    building/
      BuildingEnvironmentMap.tsx    ← Fő térképkomponens
      BuildingEnvironmentTab.tsx    ← Responsive wrapper
      BuildingEnvironmentCardList.tsx ← Mobil lista nézet
      LayerTogglePanel.tsx          ← Rétegváltó UI
      WalkabilityScoreBadge.tsx     ← Pontszám jelvény
      MapPopupContent.tsx           ← Popup tartalom komponens
  lib/
    environment-map/
      fetchers.ts                   ← Overpass, BKK, OpenAQ lekérdező függvények
      overpass-queries.ts           ← Overpass QL sablonok
      heat-island.ts                ← Hőszigot számítás
      walkability.ts                ← Walkability score logika
  types/
    environment-map.ts              ← TypeScript interfészek
  i18n/
    resources/
      hu.ts                         ← environmentMap szekció (kiegészítve)
      en.ts                         ← environmentMap szekció (kiegészítve)
supabase/
  migrations/
    20260517_building_map_cache.sql ← Adatbázis séma
```

---

## 19. Külső API-k és licence-szempontok

| API / Adat | URL | Licence | Rate Limit | Megjegyzés |
|------------|-----|---------|-----------|------------|
| Overpass API | overpass-api.de | ODbL (OSM) | 1 req/s, max 10s timeout közönségnek | Szerver oldalon hívni, nem kliensből |
| MapTiler (fallback tile) | api.maptiler.com | Ingyenes 100k view/hó | — | Ha a Mapbox drágul |
| OpenAQ API v2 | api.openaq.io | CC BY 4.0 | 10 req/min ingyenes | API kulcs szükséges regisztráció után |
| BKK nyílt API | opendata.bkk.hu | CC BY 4.0 | ismeretlen, ajánlott cache | GTFS és GTFS-RT elérhető |
| MOL Bubi API | opendata.bkk.hu/data-sources | CC BY 4.0 | — | BKK adatcsomag részeként |
| Mapbox GL JS | mapbox.com | Mapbox licence | 50k load/hó ingyenes | Token szükséges |

---

## 20. Összefoglalás: a feature értéke a termék számára

A Közelségi és Elérhetőségi Interaktív Térkép az alábbi stratégiai értékeket adja a panellako.hu terméknek:

1. **Differenciátor**: egyetlen magyarországi társasházkezelő szoftver sem kínál ilyen élhetőségi térképet — közvetlen értékesítési érv
2. **Adatalapú döntés**: egy leendő lakásvevő vagy bérlő az épület dashboardján azonnal láthatja a közlekedési, zöldhöz-közelségi és levegőminőségi adatokat — ez segít a döntéshozatalban
3. **Szakdolgozati legitimáció**: a GIS-alapú elemzési módszertan (OSM landuse/natural rétegek, GTFS elérhetőség, PM2.5 park-hatás) tudományos alapon dokumentált — ez hitelessé teszi a termék adatközlését
4. **Bővíthetőség**: a rétegszerkezet egykönnyen kiegészíthető pl. bűnügyi statisztikai overlay-jel, iskolai minősítési pontokkal vagy zajszint-zónákkal a jövőben

A feature elkészítése után a `versioning/` és `marketing/marketing_values/` könyvtárakba is kerüljön bejegyzés a megszokott formátumban.
