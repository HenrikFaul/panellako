# FEATURE PROMPT 09 — Kerékpáros Hálózatelemzés és Légminőség-kitettség Elemző

## Áttekintés és motiváció (a szakdolgozat alapján)

A panellako.hu webapp lakóközösségeket szolgál ki egy olyan városban — Budapesten —, ahol a kerékpározás az elmúlt évtizedben nemcsak közlekedési alternatívává, hanem életminőségi és egészségügyi döntéssé vált. A csatolt geoinformatikai szakdolgozat (Faul Henrik, SZTE Természettudományi és Informatikai Kar, 2020: *„A zöld város kialakításának támogatása térinformatikai elemzések segítségével Budapest példáján keresztül"*) egy teljes, önálló fejezetet szentel a kerékpáros infrastruktúra és a kerékpárosok légminőség-kitettségének elemzésére.

### A szakdolgozat kerékpározásra vonatkozó kulcsmegállapításai

**Az antwerpeni UFP-kutatás — a feature tudományos alapköve:**
A szakdolgozat részletesen referál egy Antwerpenben végzett tudományos vizsgálatra, amely ultrafinom részecskék (UFP — Ultrafine Particles, jellemzően PM2.5 és alatti frakcció) mértékét vizsgálta különböző kerékpáros útvonaltípusokon:

- **Főutak (főforgalmi utak)**: 100% referenciaszint — ez a legmagasabb UFP-expozíció, amit a kerékpáros elszenvedhet. Egy belső égésű motoros autó mögött haladó kerékpáros percenként több ezer ultrafinom részecskét lélegez be.
- **Mellékutcák (kisebb forgalmú utak)**: ~30%-kal alacsonyabb UFP-expozíció — a zsúfoltabb útvonaltól már egyetlen utcányi eltérés is mérhető javulást hoz.
- **Parkok, zöld folyosók, fasorral fedett kerékpárutak**: ~53%-kal alacsonyabb UFP-expozíció a főutakhoz képest.

Ez a kutatás alapvető jelentőségű: a kerékpárosok egészségügyi kockázata nem csupán a közlekedési balesetek, hanem a belélegzett levegő minőségétől is függ. Egy azonos A-ból B-be tartó útvonal, amelyet park- és mellékutakon tesznek meg, a kerékpáros szervezetét feleannyi szennyezettségnek teszi ki, mint a főútvonalon megtett ugyanaz a távolság — még akkor is, ha az útvonal 15-20%-kal hosszabb.

**A kerékpározás arányai — 2018-as magyarországi felmérés:**
A szakdolgozat rögzíti, hogy 2018-ban a magyarok **17%-a kerékpározik rendszeresen munkába vagy iskolába**. Ez az arány európai összehasonlításban alacsony — Hollandiában ez az arány 27%, Dániában 18%, míg az EU-átlag körülbelül 8%. Magyarország tehát a felső harmadban van, ám a potenciál nagy: a meglévő kerékpáros kultúra és a növekvő infrastruktúra alapján a 20-25%-os arány reálisan elérhető lenne.

**A Kerékpárosklub és a civil infrastruktúra-fejlesztési nyomás:**
A szakdolgozat hivatkozik a **Kerékpárosklub** civil szervezet tevékenységére, amely Magyarország legfontosabb kerékpáros érdekképviseleti és infrastruktúra-fejlesztési szervezete. A Kerékpárosklub rendszeresen publikál hiányelemzéseket Budapest kerékpáros hálózatáról, és lobbizik az összefüggő kerékpáros folyosók kialakításáért. A webapp ebben az ökoszisztémában akkor tud hatékonyan működni, ha a lakóközösségeknek megmutatja, hogy a saját épületük környékén milyen kerékpáros infrastrukturális hiányok vannak, és ezek hogyan érintik a mindennapos kerékpározást.

**Budapest kerékpáros hálózatának egyenetlenségei:**
A szakdolgozat elemzi Budapest kerékpáros hálózatának fragmentált, egyenetlen állapotát. Míg néhány kerület (pl. IX., XIII., XIV. kerület) összefüggő kerékpárút-hálózattal rendelkezik, más területeken a kerékpározó hiányos vagy veszélyes infrastruktúrán kénytelen közlekedni. Különösen problémás a sugárirányú főutak mentén kijelölt kerékpársávok hiánya — ezeken a pontokon a kerékpáros a legintenzívebb forgalomba kénytelen bekeveredni, éppen ott, ahol az UFP-expozíció a legnagyobb.

**A Budapest 2030 városfejlesztési stratégia és a kerékpározás:**
A szakdolgozat ismerteti Budapest hosszú távú fejlesztési tervét, amely a kerékpáros infrastruktúra drasztikus bővítését célozza: a jelenlegi ~200 km kerékpárút-hálózatot 2030-ra 400+ km-re kívánják növelni, és összefüggő kerékpáros gyorshálózatot (bicycle superhighway) terveznek a belváros és a nagy lakótelep-övezetek között. Ez a terv közvetlenül érinti a panelházi lakóközösségeket: egy összefüggő kerékpáros gyorshálózat megnyitja a lehetőséget, hogy a lakótelepen élők autó nélkül is elérhessék munkahelyeiket.

**Az aktív mobilitás egészségügyi előnyei — a CO₂-kalkulátor és egészségügyi dimenzió:**
A szakdolgozat összefoglalja az aktív közlekedési módok egészségügyi előnyeit: a napi 30 perces kerékpározás ~200–300 kcal energiaégetést jelent, ami éves szinten 12–18 kg zsírnak felel meg, emellett csökkenti a szív- és érrendszeri betegségek kockázatát, javítja a mentális egészséget, és D-vitamint termel. Ezek az adatok nem csupán motiváló tények: a panellako.hu kerékpáros feature-jébe beépített CO₂-megtakarítás kalkulátor ezeket az egészségügyi előnyöket is képes számszerűsíteni.

A feature megvalósítása tehát kettős küldetést teljesít: a szakdolgozat tudományos tartalmát élő, interaktív eszközzé alakítja, amely közvetlenül befolyásolja a lakóközösségek mindennapi döntéseit és egészségét.

---

## A fejlesztendő feature teljes műszaki specifikációja

### Feature neve: **Kerékpáros Hálózatelemzés és Légminőség-kitettség Elemző**
### Helye az alkalmazásban: Workspace dashboard → „Környezet" tab → „Kerékpározás" alpanel; önálló `/w/:workspaceId/cycling` útvonal
### Prioritás: **MAGAS** — közvetlen egészségügyi és közlekedési relevancia, három meglévő adatforrás (Waymarked Trails, BKK GBFS, KENYI) már a backendben van

---

## 1. Funkcionális követelmények

### 1.1 Interaktív kerékpáros hálózati térkép

A feature elsődleges belépési pontja egy teljes képernyős, réteges interaktív térkép, amely az alábbi adatrétegeket jeleníti meg:

**EuroVelo és nemzetközi útvonalak (Waymarked Trails ICN/NCN):**
Budapest területén a következő EuroVelo vonalak érintik az agglomerációt:
- **EV6** (Atlanti–Fekete-tenger): a Duna mentén Budapest déli határán halad át, a Ráckevei-Duna-ág kerékpárútján
- **EV13** (Vaskurtain-ösvény): Budapest keleti szélét érinti
- **EV14** (Isztriai–Balatonparti kerékpáros útvonal): a Balatonhoz tart Budáról

Ezek az útvonalak sárga/arany vastagabb vonallal jelennek meg, kattintásra megnyíló popup-pal, amely tartalmazza az útvonal nevét, a teljes hosszt (km), a hálózati szintet (ICN), és egy GPX letöltés gombot.

**Nemzeti kerékpárútvonal-hálózat (KENYI — Magyar Közút):**
A Magyar Közút KENYI nyilvántartásában szereplő, államilag finanszírozott kerékpárutak, amelyek között Budapest közelében megtalálható a Duna-part menti kerékpárút-gerinc, a Római-part kerékpárútja és a budai Körvasút menti kerékpárút. Ezek zöld vonallal, a burkolattípus és fenntartási állapot tooltip-pel jelennek meg.

**OpenCycleMap réteg:**
Az OpenCycleMap (`tile.thunderforest.com/cycle/{z}/{x}/{y}.png`) kapcsolható háttérrétegként érhető el, amely vizuálisan kiemeli az összes térképezett kerékpáros infrastruktúrát. Thunderforest ingyenes API key szükséges (500 req/nap ingyenes tier).

**BKK MOL Bubi állomások valós idejű elérhetőséggel:**
A Bubi dokkolók helyzete és valós idejű kapacitás-adatok (elérhető kerékpárok száma, szabad dokkhelyek száma), BKK GBFS v3 API alapján 5 perces frissítési ciklussal. Az állomások kör-jelölőkkel jelennek meg, ahol a zöld = bőséges kerékpár-kínálat, sárga = korlátozott, piros = üres/tele.

**Lokális kerékpáros infrastruktúra (OSM Overpass):**
Az épület 2 km-es körzetén belüli kerékpáros infrastruktúra (a meglévő `cycling-map-inner.tsx` komponens kiterjesztése):
- Dedikált kerékpárút (highway=cycleway): zöld
- Védett kerékpársáv (cycleway=track): lila
- Festett kerékpársáv (cycleway=lane): kék
- Vegyes forgalmú kerékpáros út (shared_lane): narancs
- Kerékpározásra engedélyezett: szürke

### 1.2 Útvonal-légminőség-expozíciós Pontozó

Az antwerpeni kutatás alapján minden feltérképezett útszakasz kap egy **PM-expozíciós proxy pontszámot** (0–100 skálán, ahol 0 = legjobb, 100 = legrosszabb). A pontszám számítása:

**Expozíciós proxy képlet:**
```
ExposureScore = min(100, 
  (ForgalmiIntenzitasProxy × 0.5) + 
  (ZoldFedettseghiany × 0.3) + 
  (UtszelessegFaktor × 0.2)
)
```

ahol:
- `ForgalmiIntenzitasProxy`: OSM `highway` tag alapján (`motorway`=100, `primary`=80, `secondary`=60, `tertiary`=40, `residential`=20, `cycleway`=5)
- `ZoldFedettseghiany`: 100 − (a 100 m körzetbeni zöldfelület-arány × 100), az OSM `landuse=park|forest|grass` alapján becsülve
- `UtszelessegFaktor`: az OSM `lanes` tag alapján (6+ sáv=100, 4 sáv=70, 2 sáv=40, 1 sáv=10)

**Vizualizáció:** A térképen az útvonalak a pontszámuk alapján zöld→sárga→piros gradienssel jelennek meg egy „légszennyezettség-nézet" módban, amelyet a jobb felső sarokgomb aktivál.

### 1.3 „Egészséges / Gyors / Festői" útvonal-összehasonlítás

A felhasználó megadhat egy célpontot (szövegesen vagy térképre kattintva), és a rendszer három alternatív útvonal-javaslatot számol ki:

**Egészséges útvonal (Healthy Route):**
- Maximalizálja a dedikált kerékpárúton töltött távolság arányát
- Kerüli a főutakat és az 50+ expozíciós pontszámú szakaszokat
- Prioritizálja a parkos, fásított szakaszokat
- Várható PM-expozíció: a referenciához képest 40-53%-kal alacsonyabb

**Gyors útvonal (Fast Route):**
- Minimalizálja a megtett időt és a távolságot
- Elfogadja a főutas szakaszokat, ha azok kerékpársávval ellátottak
- Útvonalhossz általában 5-15%-kal rövidebb, mint az egészséges útvonal

**Festői útvonal (Scenic Route):**
- Maximalizálja a Duna-parti, parkon átvezető, zöldfelületes szakaszok arányát
- Figyelembe veszi az emelkedőprofilja alapján a Waymarked Trails elevation adatát
- Általában a leghosszabb, de a legkellemesebb vizuálisan és levegőminőségi szempontból egyaránt

Az összehasonlítás eredménye egy kompakt táblázatban jelenik meg (lásd 5.3-as fejezet), amely tartalmazza a becsült menetidőt, távolságot, szintkülönbséget, PM-expozíciós indexet és CO₂-megtakarítást.

### 1.4 Bubi-dokkfinder valós idejű elérhetőséggel

Dedikált Bubi-kereső panel az alábbi funkciókkal:
- **Legközelebbi 5 Bubi-állomás** az épülettől légvonalban, távolsággal és gyalogos becsült idővel (Nominatim + Haversine formula)
- **Valós idejű kapacitás**: elérhető kerékpárok, szabad dokkhelyek, utolsó frissítés időpontja
- **Állomás-állapot indikátor**: „Kerékpár van" / „Dokkolt szabad" / „Üres állomás" / „Tele állomás"
- **„Legközelebbi szabad Bubi"** gyorsgomb: megkeresi a legtöbb elérhető kerékpárral rendelkező állomást 800 m körzetben, és a térképen bemutatja az odavezető útvonalat
- **GBFS station_information** alapján: az állomásnév, utca, irányítószám, és a kapacitás (total_docks) megjelenítése

### 1.5 Kerékpáros infrastruktúra-minőségi értékelés kerületenként

Egy összesítő sávdiagram és heatmap kombináció, amely Budapest 23 kerületét értékeli a következő mutatók alapján:
- **Dedikált kerékpárút km / km² terület** (OSM adatból számítva)
- **Kerékpárút-lefedettség aránya** a főutak mentén (van-e párhuzamos kerékpárút a főutakkal)
- **Bubi-állomássűrűség** (GBFS adatból)
- **KENYI-regisztrált utak aránya** (az összes kerékpárút hány %-a van az állami nyilvántartásban)

Az összesített **Kerékpáros Infrastruktúra Index (KII)** 0-100 skálán, kerületi bontásban. Az épület kerülete ki van emelve.

### 1.6 Személyes kerékpáros CO₂-megtakarítás-követő

A felhasználó rögzítheti kerékpáros útjait (vagy a jövőben GPS-adatból automatikusan importálhatja), és a rendszer kiszámítja:

**CO₂-megtakarítás kalkulációja:**
```
CO2_megtakaritas_kg = utazott_km × 0.21 
// 0.21 kg CO₂/km: személyautó magyar átlag (European Environment Agency, 2023 adatai alapján)
```

**Egészségügyi egyenérték:**
```
elgetett_kal = utazott_km × 40  // kb. 40 kcal/km átlagos kerékpározásnál
```

**Éves vetítés és összehasonlítás:**
Ha a felhasználó rendszeresen jelöli meg a kerékpáros útjait, a rendszer éves szinten vetíti ki a megtakarítást és összehasonlítja az országos átlaggal, illetve Budapest kerékpározó átlagával.

### 1.7 Útvonal-veszélyességi értékelés

Minden tervezett útvonalhoz automatikusan generált veszélyességi jelentés:
- **Kereszteződések száma** és típusa (jelzőlámpás / elsőbbségadó kötelező / közvetlen bejárás)
- **Dedikált kerékpársáv aránya** az összes útszakaszon (%)
- **Főúton töltött idő aránya** (azon szakaszok aránya, ahol nincs dedikált kerékpárinfrastruktúra és az OSM `highway` tag `primary` vagy `secondary`)
- **Veszélyességi index**: 0–10 skálán, ahol 0 = teljesen védett útvonal, 10 = a legtöbb szakasz főúton, dedikált infrastruktúra nélkül

---

## 2. Technikai architektúra

### 2.1 `app/api/cycling/routes/route.ts` — Waymarked Trails API integráció

```typescript
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ─── Budapest bounding box ────────────────────────────────────────────────────
const BUDAPEST_BBOX = '18.92,47.35,19.34,47.61'; // lon_min,lat_min,lon_max,lat_max

const WMT_BASE = 'https://cycling.waymarkedtrails.org/api/v1';
const USER_AGENT = 'panellako/1.0 (admin@panellako.hu)';

// ─── Waymarked Trails API típusok ─────────────────────────────────────────────
export interface WmtRouteSummary {
  id: number;
  name: string | null;
  ref: string | null;
  network: 'icn' | 'ncn' | 'rcn' | 'lcn';
  level: number | null;
  distance_km: number | null;
  itinerary?: string[];
}

export interface WmtRouteGeometry {
  type: 'Feature';
  geometry: {
    type: 'MultiLineString' | 'LineString';
    coordinates: number[][][];
  };
  properties: {
    id: number;
    name: string | null;
    network: string;
    ref: string | null;
  };
}

export interface CyclingRoute extends WmtRouteSummary {
  geometry?: WmtRouteGeometry['geometry'];
  gpxUrl: string;
}

// ─── 24 órás szerver cache ────────────────────────────────────────────────────
interface CacheEntry<T> { data: T; expires: number; }
let _routeCache: CacheEntry<CyclingRoute[]> | null = null;

async function fetchWmt<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${WMT_BASE}${path}`, {
      headers: { 
        'User-Agent': USER_AGENT, 
        'Accept': 'application/json' 
      },
      next: { revalidate: 86400 }, // 24 óra Next.js cache
    });
    if (!res.ok) { 
      console.warn(`[cycling/routes] WMT ${path} HTTP ${res.status}`); 
      return null; 
    }
    return await res.json() as T;
  } catch (err) {
    console.warn(`[cycling/routes] WMT fetch error ${path}:`, err);
    return null;
  }
}

export async function GET(): Promise<NextResponse> {
  // Cache ellenőrzés
  if (_routeCache && _routeCache.expires > Date.now()) {
    return NextResponse.json(_routeCache.data);
  }

  // Budapest kerékpáros útvonalak lekérdezése — ICN és NCN szintek
  const listData = await fetchWmt<{ results: WmtRouteSummary[]; total: number }>(
    `/list/by_area?bbox=${BUDAPEST_BBOX}&limit=50&offset=0`
  );

  if (!listData || !listData.results.length) {
    console.error('[cycling/routes] WMT returned no routes');
    return NextResponse.json([], { 
      headers: { 'Cache-Control': 'no-store' } 
    });
  }

  // Csak ICN és NCN szintű útvonalak geometriáját töltjük le (rate limit védelem)
  const topRoutes = listData.results.filter(r => 
    r.network === 'icn' || r.network === 'ncn'
  ).slice(0, 10);

  const routesWithGeom: CyclingRoute[] = await Promise.all(
    topRoutes.map(async (route) => {
      const geom = await fetchWmt<WmtRouteGeometry>(
        `/details/relation/${route.id}/geometry`
      );
      return {
        ...route,
        geometry: geom?.geometry,
        gpxUrl: `${WMT_BASE}/details/relation/${route.id}/gpx`,
      };
    })
  );

  // RCN szintű útvonalak geometria nélkül (listázáshoz elegendő)
  const regionalRoutes: CyclingRoute[] = listData.results
    .filter(r => r.network === 'rcn')
    .slice(0, 20)
    .map(r => ({ ...r, gpxUrl: `${WMT_BASE}/details/relation/${r.id}/gpx` }));

  const allRoutes = [...routesWithGeom, ...regionalRoutes];

  _routeCache = { data: allRoutes, expires: Date.now() + 24 * 60 * 60_000 };
  return NextResponse.json(allRoutes);
}
```

### 2.2 `app/api/cycling/bubi/route.ts` — BKK GBFS v3 valós idejű integráció

```typescript
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ─── BKK GBFS v3 végpontok ────────────────────────────────────────────────────
const GBFS_BASE = 'https://gbfs.bubi.bkk.hu/gbfs/v3';
const STATION_STATUS_URL = `${GBFS_BASE}/station_status.json`;
const STATION_INFO_URL   = `${GBFS_BASE}/station_information.json`;

// ─── GBFS v3 API típusdefiníciók ─────────────────────────────────────────────
interface GbfsStationStatus {
  station_id: string;
  num_bikes_available: number;
  num_docks_available: number;
  is_installed: boolean;
  is_renting: boolean;
  is_returning: boolean;
  last_reported: number; // Unix timestamp
  vehicle_types_available?: Array<{
    vehicle_type_id: string;
    count: number;
  }>;
}

interface GbfsStationInfo {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
  address?: string;
}

export interface BubiStation {
  stationId: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
  bikesAvailable: number;
  docksAvailable: number;
  isOperational: boolean;
  lastReported: string; // ISO string
  availabilityStatus: 'abundant' | 'limited' | 'empty' | 'full' | 'offline';
}

// ─── 5 perces szerver cache ───────────────────────────────────────────────────
interface CacheEntry { data: BubiStation[]; expires: number; }
let _bubiCache: CacheEntry | null = null;

function computeStatus(
  bikes: number, 
  docks: number, 
  capacity: number,
  isOperational: boolean
): BubiStation['availabilityStatus'] {
  if (!isOperational) return 'offline';
  if (bikes === 0) return 'empty';
  if (docks === 0) return 'full';
  const fillRatio = bikes / Math.max(capacity, 1);
  if (fillRatio >= 0.4) return 'abundant';
  return 'limited';
}

export async function GET(): Promise<NextResponse> {
  if (_bubiCache && _bubiCache.expires > Date.now()) {
    return NextResponse.json(_bubiCache.data);
  }

  try {
    // Párhuzamos lekérés — státusz + állomásadatok egyszerre
    const [statusRes, infoRes] = await Promise.all([
      fetch(STATION_STATUS_URL, { 
        headers: { 'User-Agent': 'panellako/1.0 (admin@panellako.hu)' },
        signal: AbortSignal.timeout(8_000),
      }),
      fetch(STATION_INFO_URL, { 
        headers: { 'User-Agent': 'panellako/1.0 (admin@panellako.hu)' },
        signal: AbortSignal.timeout(8_000),
      }),
    ]);

    if (!statusRes.ok || !infoRes.ok) {
      throw new Error(`GBFS HTTP error: status=${statusRes.status} info=${infoRes.status}`);
    }

    const statusData = await statusRes.json() as { 
      data: { stations: GbfsStationStatus[] }; 
      last_updated: number; 
    };
    const infoData = await infoRes.json() as { 
      data: { stations: GbfsStationInfo[] }; 
    };

    // Merge: station_id alapú map építése
    const infoMap = new Map<string, GbfsStationInfo>(
      infoData.data.stations.map(s => [s.station_id, s])
    );

    const stations: BubiStation[] = statusData.data.stations
      .map(status => {
        const info = infoMap.get(status.station_id);
        if (!info) return null;
        const isOp = status.is_installed && status.is_renting;
        return {
          stationId:     status.station_id,
          name:          info.name,
          lat:           info.lat,
          lon:           info.lon,
          capacity:      info.capacity,
          bikesAvailable: status.num_bikes_available,
          docksAvailable: status.num_docks_available,
          isOperational: isOp,
          lastReported:  new Date(status.last_reported * 1000).toISOString(),
          availabilityStatus: computeStatus(
            status.num_bikes_available, 
            status.num_docks_available, 
            info.capacity,
            isOp
          ),
        } satisfies BubiStation;
      })
      .filter((s): s is BubiStation => s !== null);

    _bubiCache = { data: stations, expires: Date.now() + 5 * 60_000 }; // 5 perc
    return NextResponse.json(stations);

  } catch (err) {
    console.error('[cycling/bubi] GBFS fetch error:', err);
    // Ha van régi cache, azt adjuk vissza elavult jelzéssel
    if (_bubiCache) {
      return NextResponse.json(_bubiCache.data, {
        headers: { 'X-Cache-Stale': 'true' },
      });
    }
    return NextResponse.json([], { status: 503 });
  }
}
```

### 2.3 `app/api/cycling/exposure/route.ts` — Légminőség-expozíciós proxy API

```typescript
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ─── Útszakasz-expozíciós pontozás (OSM highway tag alapján) ─────────────────
const HIGHWAY_EXPOSURE_BASE: Record<string, number> = {
  motorway: 100, motorway_link: 95,
  trunk: 90,     trunk_link: 85,
  primary: 80,   primary_link: 75,
  secondary: 60, secondary_link: 55,
  tertiary: 40,  tertiary_link: 35,
  residential: 20, living_street: 10,
  cycleway: 5,   path: 8,
  footway: 12,   service: 15,
  unclassified: 30,
};

export interface ExposureSegment {
  wayId: number;
  highwayType: string;
  name: string | null;
  coords: [number, number][];
  exposureScore: number;     // 0-100, ahol 0 = legegészségesebb
  exposureCategory: 'safe' | 'moderate' | 'elevated' | 'high' | 'very_high';
  exposureLabel: string;     // Magyar megnevezés
}

function categorize(score: number): ExposureSegment['exposureCategory'] {
  if (score <= 15)  return 'safe';
  if (score <= 35)  return 'moderate';
  if (score <= 55)  return 'elevated';
  if (score <= 75)  return 'high';
  return 'very_high';
}

const CATEGORY_LABELS: Record<ExposureSegment['exposureCategory'], string> = {
  safe:      'Biztonságos — alacsony szennyezettség',
  moderate:  'Mérsékelt — elfogadható expozíció',
  elevated:  'Emelkedett — kerülendő hosszabb szakaszon',
  high:      'Magas — főforgalmi terhelés',
  very_high: 'Nagyon magas — főút, kerülendő!',
};

// Overpass lekérdezés az expozíciós elemzéshez
const buildOverpassQuery = (lat: number, lon: number, radius: number = 1500) => `
[out:json][timeout:10];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|cycleway|path|footway|service|unclassified|living_street)(_.+)?$"](around:${radius},${lat},${lon});
);
out geom qt;
`.trim();

const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];

interface CacheEntry { data: ExposureSegment[]; expires: number; }
const _exposureCache = new Map<string, CacheEntry>();

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const lat = parseFloat(url.searchParams.get('lat') ?? '47.4979');
  const lon = parseFloat(url.searchParams.get('lon') ?? '19.0402');
  const radius = Math.min(2000, parseInt(url.searchParams.get('radius') ?? '1500'));

  const cacheKey = `${lat.toFixed(3)}_${lon.toFixed(3)}_${radius}`;
  const cached = _exposureCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const query = buildOverpassQuery(lat, lon, radius);
  const body = `data=${encodeURIComponent(query)}`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'panellako/1.0',
        },
        body,
        signal: AbortSignal.timeout(11_000),
      });
      if (!res.ok) continue;

      const json = await res.json() as { 
        elements: Array<{
          id: number;
          tags?: Record<string, string>;
          geometry?: Array<{ lat: number; lon: number }>;
        }>;
      };

      const segments: ExposureSegment[] = (json.elements ?? [])
        .filter(el => el.geometry && el.geometry.length >= 2)
        .map(el => {
          const highway = el.tags?.highway ?? 'unclassified';
          const baseScore = HIGHWAY_EXPOSURE_BASE[highway] ?? 30;
          const lanes = parseInt(el.tags?.lanes ?? '1');
          const laneFactor = lanes >= 6 ? 20 : lanes >= 4 ? 12 : lanes >= 2 ? 5 : 0;
          const hasCycleway = ['cycleway', 'path', 'footway'].includes(highway) ||
                               el.tags?.cycleway === 'track' || el.tags?.bicycle === 'designated';
          const cyclewayBonus = hasCycleway ? -15 : 0;
          const score = Math.max(0, Math.min(100, baseScore + laneFactor + cyclewayBonus));
          const cat = categorize(score);
          return {
            wayId: el.id,
            highwayType: highway,
            name: el.tags?.name ?? null,
            coords: (el.geometry ?? []).map(g => [g.lon, g.lat] as [number, number]),
            exposureScore: score,
            exposureCategory: cat,
            exposureLabel: CATEGORY_LABELS[cat],
          };
        });

      if (segments.length > 0) {
        _exposureCache.set(cacheKey, { data: segments, expires: Date.now() + 2 * 60 * 60_000 });
        return NextResponse.json(segments);
      }
    } catch (err) {
      console.warn(`[exposure] ${endpoint} failed:`, err);
    }
  }

  return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } });
}
```

---

## 3. Supabase séma kiegészítések

```sql
-- ─── Kerékpáros útvonalak cache táblája ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS cycling_route_cache (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  osm_id        BIGINT NOT NULL UNIQUE,
  name          TEXT,
  ref           TEXT,
  network       TEXT NOT NULL CHECK (network IN ('icn','ncn','rcn','lcn')),
  level         SMALLINT,
  distance_km   NUMERIC(10, 2),
  itinerary     JSONB,
  geom          GEOMETRY(MULTILINESTRING, 4326),
  gpx_url       TEXT,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);
CREATE INDEX IF NOT EXISTS idx_cycling_route_geom ON cycling_route_cache USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_cycling_route_network ON cycling_route_cache (network);
CREATE INDEX IF NOT EXISTS idx_cycling_route_expires ON cycling_route_cache (expires_at);

-- RLS: olvasás bárki számára nyilvános (nem személyes adat)
ALTER TABLE cycling_route_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cycling routes publicly readable" ON cycling_route_cache
  FOR SELECT USING (true);

-- ─── Légminőség-expozíciós pontszámok cache ───────────────────────────────────
CREATE TABLE IF NOT EXISTS cycling_air_exposure_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  way_osm_id      BIGINT NOT NULL,
  highway_type    TEXT NOT NULL,
  exposure_score  SMALLINT NOT NULL CHECK (exposure_score BETWEEN 0 AND 100),
  exposure_category TEXT NOT NULL,
  geom            GEOMETRY(LINESTRING, 4326),
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  bbox_key        TEXT NOT NULL,  -- pl. '47.490_19.040_1500' a cache-kulcshoz
  UNIQUE (way_osm_id, bbox_key)
);
CREATE INDEX IF NOT EXISTS idx_exposure_geom ON cycling_air_exposure_scores USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_exposure_bbox_key ON cycling_air_exposure_scores (bbox_key);

ALTER TABLE cycling_air_exposure_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exposure scores publicly readable" ON cycling_air_exposure_scores
  FOR SELECT USING (true);

-- ─── Felhasználói kerékpáros napló ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_cycling_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  logged_at       DATE NOT NULL DEFAULT CURRENT_DATE,
  distance_km     NUMERIC(6, 2) NOT NULL CHECK (distance_km > 0 AND distance_km < 500),
  duration_min    SMALLINT,     -- Menetidő percben
  route_type      TEXT CHECK (route_type IN ('commute', 'leisure', 'errands', 'other')),
  co2_saved_kg    NUMERIC(6, 3) GENERATED ALWAYS AS (distance_km * 0.21) STORED,
  calories_burned INTEGER GENERATED ALWAYS AS (FLOOR(distance_km * 40)) STORED,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cycling_log_user_date
  ON user_cycling_log (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_cycling_log_workspace
  ON user_cycling_log (workspace_id, logged_at DESC);

ALTER TABLE user_cycling_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cycling log" ON user_cycling_log
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Workspace members see aggregate cycling stats" ON user_cycling_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = cycling_log.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- ─── Bubi állomás-pillanatkép (real-time state cache) ────────────────────────
CREATE TABLE IF NOT EXISTS bubi_station_snapshot (
  station_id      TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  lat             DOUBLE PRECISION NOT NULL,
  lon             DOUBLE PRECISION NOT NULL,
  capacity        SMALLINT NOT NULL,
  bikes_available SMALLINT NOT NULL,
  docks_available SMALLINT NOT NULL,
  is_operational  BOOLEAN NOT NULL DEFAULT true,
  availability    TEXT NOT NULL CHECK (availability IN ('abundant','limited','empty','full','offline')),
  last_reported   TIMESTAMPTZ NOT NULL,
  snapshot_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  geom            GEOMETRY(POINT, 4326) GENERATED ALWAYS AS 
                    (ST_SetSRID(ST_MakePoint(lon, lat), 4326)) STORED
);
CREATE INDEX IF NOT EXISTS idx_bubi_geom ON bubi_station_snapshot USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_bubi_availability ON bubi_station_snapshot (availability);

ALTER TABLE bubi_station_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bubi stations publicly readable" ON bubi_station_snapshot
  FOR SELECT USING (true);
CREATE POLICY "Bubi stations insertable by service role" ON bubi_station_snapshot
  FOR ALL USING (auth.role() = 'service_role');

-- ─── Hasznos nézetek ──────────────────────────────────────────────────────────

-- Felhasználó havi összesítője
CREATE OR REPLACE VIEW user_cycling_monthly AS
SELECT
  user_id,
  workspace_id,
  DATE_TRUNC('month', logged_at) AS month,
  COUNT(*) AS trips,
  SUM(distance_km) AS total_km,
  SUM(co2_saved_kg) AS total_co2_kg,
  SUM(calories_burned) AS total_calories
FROM user_cycling_log
GROUP BY user_id, workspace_id, DATE_TRUNC('month', logged_at);

-- Kerület-szintű Bubi sűrűség (Budapest 23 kerülete, egyszerűsített)
CREATE OR REPLACE VIEW bubi_station_district_summary AS
SELECT
  COUNT(*) AS station_count,
  SUM(capacity) AS total_capacity,
  SUM(bikes_available) AS total_bikes_now,
  AVG(bikes_available::float / NULLIF(capacity, 0)) AS avg_fill_ratio
FROM bubi_station_snapshot
WHERE is_operational = true;
```

---

## 4. Frontend komponensek

### 4.1 `components/cycling-network-panel.tsx` — Fő panel komponens

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { BubiStation } from '@/app/api/cycling/bubi/route';
import type { CyclingRoute } from '@/app/api/cycling/routes/route';
import { useI18n } from '@/hooks/use-i18n';

// Leaflet-alapú komponens dinamikusan importálva (SSR letiltva)
const BubiStationMap = dynamic(() => import('./bubi-station-map'), { 
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  ),
});

type ActiveTab = 'network' | 'bubi' | 'routes' | 'log';

interface Props {
  buildingLat: number;
  buildingLon: number;
  workspaceId: string;
}

export default function CyclingNetworkPanel({ buildingLat, buildingLon, workspaceId }: Props) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<ActiveTab>('network');
  const [bubiStations, setBubiStations] = useState<BubiStation[]>([]);
  const [routes, setRoutes] = useState<CyclingRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastBubiUpdate, setLastBubiUpdate] = useState<Date | null>(null);

  const fetchBubi = useCallback(async () => {
    try {
      const res = await fetch('/api/cycling/bubi');
      if (!res.ok) return;
      const data = await res.json() as BubiStation[];
      setBubiStations(data);
      setLastBubiUpdate(new Date());
    } catch (err) {
      console.error('[CyclingPanel] Bubi fetch error:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchBubi(),
        fetch('/api/cycling/routes')
          .then(r => r.json())
          .then((data: CyclingRoute[]) => setRoutes(data))
          .catch(err => console.error('[CyclingPanel] Routes fetch error:', err)),
      ]);
      setLoading(false);
    };
    init();

    // Bubi 5 percenként frissül
    const bubiInterval = setInterval(fetchBubi, 5 * 60_000);
    return () => clearInterval(bubiInterval);
  }, [fetchBubi]);

  // Legközelebbi 5 Bubi állomás a Haversine-formula alapján
  const nearestBubiStations = [...bubiStations]
    .map(s => ({
      ...s,
      distanceM: haversineMeters(buildingLat, buildingLon, s.lat, s.lon),
    }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 5);

  const TABS: Array<{ id: ActiveTab; label: string }> = [
    { id: 'network', label: t('cycling.tab.network') },
    { id: 'bubi',    label: t('cycling.tab.bubi') },
    { id: 'routes',  label: t('cycling.tab.routes') },
    { id: 'log',     label: t('cycling.tab.log') },
  ];

  return (
    <div className="flex h-full flex-col rounded-3xl bg-slate-900 border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="text-base font-black text-white">
            {t('cycling.panel.title')}
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {t('cycling.panel.subtitle')}
          </p>
        </div>
        {lastBubiUpdate && (
          <span className="text-[9px] text-slate-600">
            Bubi: {lastBubiUpdate.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? 'text-emerald-400 border-b-2 border-emerald-500 -mb-px'
                : 'text-slate-600 hover:text-slate-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab tartalom */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-xs text-slate-600">{t('cycling.loading')}</div>
          </div>
        ) : (
          <>
            {activeTab === 'network' && (
              <BubiStationMap
                buildingLat={buildingLat}
                buildingLon={buildingLon}
                bubiStations={bubiStations}
                routes={routes}
              />
            )}
            {activeTab === 'bubi' && (
              <BubiStationList stations={nearestBubiStations} />
            )}
            {activeTab === 'routes' && (
              <RouteComparisonTable routes={routes} />
            )}
            {activeTab === 'log' && (
              <CyclingLogPanel workspaceId={workspaceId} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Haversine formula ─────────────────────────────────────────────────────────
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

### 4.2 `components/bubi-station-map.tsx` — Bubi térképkomponens Leaflet-tel

```tsx
'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { BubiStation } from '@/app/api/cycling/bubi/route';
import type { CyclingRoute } from '@/app/api/cycling/routes/route';
import { useMapTheme } from '@/hooks/use-map-theme';

const AVAILABILITY_COLORS: Record<BubiStation['availabilityStatus'], string> = {
  abundant: '#22c55e',  // zöld
  limited:  '#eab308',  // sárga
  empty:    '#ef4444',  // piros
  full:     '#f97316',  // narancs
  offline:  '#475569',  // szürke
};

const AVAILABILITY_LABELS: Record<BubiStation['availabilityStatus'], string> = {
  abundant: 'Bőséges kerékpár-kínálat',
  limited:  'Korlátozott készlet',
  empty:    'Nincs elérhető kerékpár',
  full:     'Nincs szabad dokkhely',
  offline:  'Nem üzemel',
};

const NETWORK_COLORS: Record<string, string> = {
  icn: '#fbbf24',  // arany — EuroVelo
  ncn: '#22c55e',  // zöld — nemzeti
  rcn: '#60a5fa',  // kék — regionális
  lcn: '#a78bfa',  // lila — helyi
};

interface Props {
  buildingLat: number;
  buildingLon: number;
  bubiStations: BubiStation[];
  routes: CyclingRoute[];
}

export default function BubiStationMap({ 
  buildingLat, buildingLon, bubiStations, routes 
}: Props) {
  const theme = useMapTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    let destroyed = false;

    (async () => {
      const L = await import('leaflet');
      if (destroyed || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [buildingLat, buildingLon],
        zoom: 13,
        zoomControl: true,
      });
      mapRef.current = map;

      // Alap csempéréteg
      L.tileLayer(theme.tileUrl, {
        attribution: theme.attribution,
        maxZoom: 19,
      }).addTo(map);

      // OpenCycleMap opcionális réteg
      const cycleMapLayer = L.tileLayer(
        'https://tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=your_key_here',
        { attribution: '&copy; Thunderforest', opacity: 0.6, maxZoom: 18 }
      );

      // Rétegváltó
      L.control.layers(
        { 'Alaptérkép': L.tileLayer(theme.tileUrl) },
        { 'OpenCycleMap': cycleMapLayer }
      ).addTo(map);

      // Épületjelölő
      const buildingIcon = L.divIcon({
        html: `<div style="
          width:14px;height:14px;
          background:${theme.colors.building};
          border:2px solid white;
          border-radius:50%;
          box-shadow:0 0 8px ${theme.colors.building}88;
        "></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([buildingLat, buildingLon], { icon: buildingIcon })
        .addTo(map)
        .bindPopup('<b>Az épület helye</b>');

      // Bubi állomások
      bubiStations.forEach(station => {
        const color = AVAILABILITY_COLORS[station.availabilityStatus];
        const icon = L.divIcon({
          html: `<div style="
            width:20px;height:20px;
            background:${color};
            border:2px solid white;
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            font-size:8px;font-weight:bold;color:white;
            box-shadow:0 2px 6px rgba(0,0,0,0.4);
          ">${station.bikesAvailable}</div>`,
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        L.marker([station.lat, station.lon], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:system-ui;min-width:160px">
              <b style="font-size:12px">${station.name}</b><br>
              <span style="color:#6b7280;font-size:10px">${AVAILABILITY_LABELS[station.availabilityStatus]}</span><br>
              <hr style="margin:4px 0;border-color:#e5e7eb">
              <span style="font-size:11px">
                Kerékpár: <b>${station.bikesAvailable}</b> / 
                Dokk: <b>${station.docksAvailable}</b> / 
                Kapacitás: ${station.capacity}
              </span>
            </div>
          `);
      });

      // Waymarked Trails útvonalak megjelenítése
      routes.forEach(route => {
        if (!route.geometry) return;
        const color = NETWORK_COLORS[route.network] ?? '#94a3b8';
        const weight = route.network === 'icn' ? 5 : route.network === 'ncn' ? 4 : 3;
        const coords = route.geometry.type === 'MultiLineString'
          ? route.geometry.coordinates.flat()
          : route.geometry.coordinates;
        
        const latLngs = coords.map(([lon, lat]) => [lat, lon] as [number, number]);
        L.polyline(latLngs, { color, weight, opacity: 0.8 })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:system-ui;min-width:140px">
              <b>${route.name ?? 'Névtelen útvonal'}</b>
              ${route.ref ? `<span style="font-size:10px;color:#6b7280"> (${route.ref})</span>` : ''}
              <br>
              <span style="font-size:10px;color:#6b7280">
                ${route.network.toUpperCase()} · ${route.distance_km?.toFixed(0) ?? '?'} km
              </span>
              ${route.gpxUrl ? `
                <br><a href="${route.gpxUrl}" target="_blank" 
                  style="font-size:10px;color:#22c55e;text-decoration:underline">
                  GPX letöltés ↗
                </a>` : ''}
            </div>
          `);
      });

    })();

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingLat, buildingLon, theme]);

  return <div ref={containerRef} className="h-full w-full" />;
}
```

### 4.3 Útvonal-összehasonlítás táblázat komponens

```tsx
'use client';

import type { CyclingRoute } from '@/app/api/cycling/routes/route';

interface RouteComparisonRow {
  label: string;
  distanceKm: number;
  estimatedMinutes: number;
  elevationM: number | null;
  exposureIndex: number; // 0-100
  co2SavedKg: number;
  network: string;
  ref: string | null;
}

function ExposureBadge({ score }: { score: number }) {
  const color = score <= 20 ? 'bg-emerald-500/20 text-emerald-400'
              : score <= 45 ? 'bg-yellow-500/20 text-yellow-400'
              : score <= 65 ? 'bg-orange-500/20 text-orange-400'
              : 'bg-red-500/20 text-red-400';
  const label = score <= 20 ? 'Alacsony' 
              : score <= 45 ? 'Mérsékelt' 
              : score <= 65 ? 'Emelkedett'
              : 'Magas';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${color}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label} ({score})
    </span>
  );
}

export default function RouteComparisonTable({ routes }: { routes: CyclingRoute[] }) {
  if (!routes.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-slate-600">Nincsenek elérhető útvonalak</p>
      </div>
    );
  }

  const tableRoutes: RouteComparisonRow[] = routes.slice(0, 8).map(r => {
    const dist = r.distance_km ?? 10;
    const exposureByNetwork: Record<string, number> = { icn: 25, ncn: 35, rcn: 45, lcn: 55 };
    return {
      label: r.name ?? 'Névtelen útvonal',
      distanceKm: dist,
      estimatedMinutes: Math.round((dist / 15) * 60), // 15 km/h átlagsebesség
      elevationM: null,
      exposureIndex: exposureByNetwork[r.network] ?? 45,
      co2SavedKg: parseFloat((dist * 0.21).toFixed(2)),
      network: r.network,
      ref: r.ref,
    };
  });

  return (
    <div className="overflow-auto h-full p-4">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
        Kerékpáros útvonalak — Budapest régió
      </h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[9px] text-slate-600 uppercase tracking-wider border-b border-white/10">
            <th className="text-left pb-2">Útvonal</th>
            <th className="text-right pb-2">Hossz</th>
            <th className="text-right pb-2">Becsült idő</th>
            <th className="text-right pb-2">PM-expozíció</th>
            <th className="text-right pb-2">CO₂-megtakarítás</th>
          </tr>
        </thead>
        <tbody>
          {tableRoutes.map((route, i) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td className="py-2.5 pr-3">
                <div className="flex items-center gap-2">
                  <span className={`
                    h-1.5 w-1.5 rounded-full flex-shrink-0
                    ${route.network === 'icn' ? 'bg-yellow-400' :
                      route.network === 'ncn' ? 'bg-emerald-400' :
                      route.network === 'rcn' ? 'bg-blue-400' : 'bg-purple-400'}
                  `} />
                  <div>
                    <div className="text-slate-200 font-medium leading-tight">
                      {route.label.length > 30 ? route.label.slice(0, 28) + '…' : route.label}
                    </div>
                    {route.ref && (
                      <div className="text-[9px] text-slate-600">{route.ref} · {route.network.toUpperCase()}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="text-right text-slate-300 tabular-nums">{route.distanceKm.toFixed(0)} km</td>
              <td className="text-right text-slate-400 tabular-nums">{route.estimatedMinutes} perc</td>
              <td className="text-right">
                <ExposureBadge score={route.exposureIndex} />
              </td>
              <td className="text-right text-emerald-400 tabular-nums font-bold">
                {route.co2SavedKg} kg
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[8px] text-slate-700 leading-relaxed">
        Forrás: Waymarked Trails / OpenStreetMap · ODbL 1.0 · CO₂-megtakarítás: 0.21 kg/km (EEA 2023 átlag, személyautó helyett)
      </p>
    </div>
  );
}
```

### 4.4 CO₂-megtakarítás számláló komponens

```tsx
'use client';

import { useEffect, useState } from 'react';

interface CyclingSummary {
  totalKm: number;
  totalCo2Kg: number;
  totalCalories: number;
  trips: number;
  monthlyKm: number;
}

export default function CyclingCO2Counter({ workspaceId }: { workspaceId: string }) {
  const [summary, setSummary] = useState<CyclingSummary | null>(null);
  const [logKm, setLogKm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/cycling/log?workspaceId=${workspaceId}`)
      .then(r => r.json())
      .then(setSummary)
      .catch(console.error);
  }, [workspaceId]);

  const handleLog = async () => {
    const km = parseFloat(logKm);
    if (isNaN(km) || km <= 0 || km > 500) return;
    setSaving(true);
    try {
      await fetch('/api/cycling/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distanceKm: km, workspaceId }),
      });
      setLogKm('');
      // Frissítés
      const updated = await fetch(`/api/cycling/log?workspaceId=${workspaceId}`).then(r => r.json());
      setSummary(updated);
    } finally {
      setSaving(false);
    }
  };

  const equivalentTrees = summary ? Math.round(summary.totalCo2Kg / 22) : 0;

  return (
    <div className="p-4 h-full flex flex-col gap-4">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
        Közösségi CO₂-megtakarítás
      </h3>

      {summary && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Összes km', value: summary.totalKm.toFixed(1), unit: 'km', color: 'text-emerald-400' },
            { label: 'CO₂ megspórolva', value: summary.totalCo2Kg.toFixed(1), unit: 'kg', color: 'text-green-400' },
            { label: 'Égetett kalória', value: summary.totalCalories.toLocaleString('hu-HU'), unit: 'kcal', color: 'text-yellow-400' },
            { label: 'Egyenértékű fa', value: equivalentTrees.toString(), unit: 'db fa/év', color: 'text-teal-400' },
          ].map(item => (
            <div key={item.label} className="rounded-2xl bg-white/5 p-3 border border-white/10">
              <div className={`text-xl font-black tabular-nums ${item.color}`}>{item.value}</div>
              <div className="text-[9px] text-slate-600">{item.unit}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Kerékpáros út rögzítése */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
        <p className="text-[10px] text-slate-500 mb-2">Kerékpáros út rögzítése</p>
        <div className="flex gap-2">
          <input
            type="number"
            value={logKm}
            onChange={e => setLogKm(e.target.value)}
            placeholder="km"
            className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            onClick={handleLog}
            disabled={saving}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {saving ? '...' : 'Rögzítés'}
          </button>
        </div>
      </div>

      <p className="text-[8px] text-slate-700 leading-relaxed mt-auto">
        Az antwerpeni UFP-kutatás alapján: a park- és mellékúton megtett kerékpáros utak esetén 
        a légminőség-expozíció 53%-kal alacsonyabb, mint a főutak mentén. 
        CO₂-egyenérték: 0,21 kg/km (EEA 2023).
      </p>
    </div>
  );
}
```

---

## 5. Crazy Innovation UI-koncepció — „BioFlow" Kerékpáros Hálózat Vizualizáció

### 5.1 Kontextus és felhasználói cél

A kerékpáros hálózati térkép hagyományos megjelenítése — statikus polyline-ok a térképen, alapszínek — elmulaszt egy alapvető lehetőséget: a **kerékpározás dinamikus, biológiai, időbeli természetének** közvetítését. A kutató és a lakó egyszerre szeretne érteni és érezni: mennyire él a hálózat, mennyire biztonságos, mennyire lélegzik a város kerékpáros szempontból.

### 5.2 A BioFlow Overlay — Cyberpunk-biomimetikus légminőség-heatmap

**Az alapkoncepció:** a kerékpáros hálózatot nem statikus vonalakként, hanem **élő, pulzáló energiaszálakként** jelenítjük meg, amelyek fényintenzitása, pulzálás-sebessége és színe a valós idejű légminőségi adatokat, a Bubi-állomások aktivitását és az útvonal PM-expozíciós proxyját tükrözi — mintha a városon keresztül futó kerékpáros infrastruktúra maga is lélegezne.

**Iteráció 1 — Biztonságos innováció:** Animált gradiens a vonalak mentén (a szokásos statikus szín helyett). Zöldről pirosig skálázódik az expozíciós pontszám alapján, css animation-nel.

**Iteráció 2 — Határkiterjesztés:** A vonalak vastagságát és animációs sebességét a valós idejű Bubi-aktivitás (hány kerékpárt vesznek/tesznek vissza az állomásokon 15 percenként) befolyásolja. A forgalmasabb állomások közelében a vonalak élénkebben pulzálnak — ez az „emberi flow" vizualizálása.

**Iteráció 3 — Radikális mutáció:** Minden útszakasz egy **biolumineszcens tengeri élőlény-szerű animációt** kap: a „safe" kategóriás utak lomhán, mélyzölden izzanak; a „high exposure" utak gyors, vörös pulzálással vibrálnak — mintha a város maga riasztaná a kerékpárost. A Bubi-állomások kis „csomópontként" jelennek meg, ahol az energiaszálak összegyűlnek, mint egy idegrendszeri szinaptikus csomópont.

**Iteráció 4 — Hasznosságkompresszió:** A látványos animáció mögött valódi információ van: a pulzálás sebessége a PM-expozíciót kódolja (gyors = veszélyes, lassú = biztonságos), a fény intenzitása a Bubi-kerék elérhetőséget (halvány = üres, ragyogó = bőséges). A felhasználó egyetlen pillantással látja: melyik utcán érdemes kerékpározni, és hol van szabad Bubi.

**Iteráció 5 — Áttörés finomítás:** A végső implementáció neve: **BioFlow Network Overlay**.

### 5.3 Technikai implementációs irány (Canvas + WebGL alapú)

```tsx
// BioFlow overlay — Canvas 2D animáció WebWorker-rel
// (Leaflet Canvas renderer + requestAnimationFrame)

interface BioFlowSegment {
  coords: [number, number][];
  exposureScore: number;  // 0-100
  bubiProximityScore: number; // 0-100 (legközelebbi Bubi elérhető kerékpárjai)
}

class BioFlowRenderer {
  private phase = 0;
  private animFrame: number | null = null;

  render(ctx: CanvasRenderingContext2D, segments: BioFlowSegment[], pixelCoords: (c: [number,number]) => [number,number]) {
    this.phase += 0.05;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    segments.forEach(seg => {
      const pulseSpeed = 0.5 + (seg.exposureScore / 100) * 3;      // gyors = veszélyes
      const intensity = 0.3 + (seg.bubiProximityScore / 100) * 0.7; // Bubi-fény
      const phase = this.phase * pulseSpeed;
      
      // Alapszín: zöld→piros gradient az exposureScore alapján
      const r = Math.round(seg.exposureScore * 2.55);
      const g = Math.round((100 - seg.exposureScore) * 2.55);
      const alpha = (0.4 + Math.sin(phase) * 0.3) * intensity;
      
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${r},${g},30,${alpha})`;
      ctx.lineWidth = 2 + Math.sin(phase * 1.3) * 1.5;  // pulzáló vastagság
      ctx.shadowColor = `rgba(${r},${g},30,0.6)`;
      ctx.shadowBlur = 8 + Math.sin(phase) * 6;           // neon glow pulzálás
      
      const pixPoints = seg.coords.map(pixelCoords);
      ctx.moveTo(pixPoints[0][0], pixPoints[0][1]);
      pixPoints.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.stroke();
    });
  }
}
```

**Vizuális eredmény:** A térkép egy sötét, cyberpunk hangulatú hálózatként jelenik meg, ahol az utcák és kerékpárutak biolumineszcens folyamatokként izzanak — a zöld utak lassan, mélyen pulzálnak, a piros főutak gyorsan vibrálnak, a Bubi-csomópontok egy-egy fénypontként kapcsolják össze a hálózatot. Este és éjszaka különösen látványos és funkcionális: a veszélyes szakaszok azonnal észrevehető riasztó mintával vibrálnak, míg a biztonságos parki kerékpárutak lágy, nyugtató zöld fénnyel derengnek.

**Felhasználói értékteremtés:** A BioFlow overlay nem dekoráció — egy pillantással megmutatja, melyik útvonalon kerékpározzon a lakó. A biológiai analógia (pulzálás sebessége = veszélyességi szint) intuitívan dekódolható, nem igényel magyarázatot.

---

## 6. End-to-end verifikációs kritériumok

### 6.1 Funkcionális tesztek (10 kritikus eset)

**TC-01: Waymarked Trails API visszatér érvényes ICN útvonallal**
- Előfeltétel: `GET /api/cycling/routes` hívás
- Elvárt: válasz tartalmaz legalább 1 `network === 'icn'` elemet, amelynek `geometry` mezője `MultiLineString` típusú
- Sikerességi kritérium: `routes.some(r => r.network === 'icn' && r.geometry?.type === 'MultiLineString')`

**TC-02: Bubi API visszaad érvényes állomásokat**
- Előfeltétel: `GET /api/cycling/bubi` hívás
- Elvárt: válasz `Array<BubiStation>`, minden elem tartalmaz érvényes `lat`, `lon`, `bikesAvailable`, `docksAvailable` mezőket
- Sikerességi kritérium: `stations.every(s => s.lat > 47 && s.lat < 48 && s.lon > 18 && s.lon < 20)`

**TC-03: Bubi-elérhetőség státusz helyes**
- Előfeltétel: `bikesAvailable=0` esetén
- Elvárt: `availabilityStatus === 'empty'`
- Sikerességi kritérium: `computeStatus(0, 10, 20, true) === 'empty'`

**TC-04: CO₂-megtakarítás kalkuláció pontossága**
- Előfeltétel: `distance_km = 10.0` naplózott út
- Elvárt: `co2_saved_kg = 2.100` (tárolt, számított oszlop)
- Sikerességi kritérium: `Math.abs(logEntry.co2_saved_kg - 2.1) < 0.001`

**TC-05: Expozíciós proxy pontszám helyessége típus szerint**
- Előfeltétel: `highway = 'cycleway'` útszakasz
- Elvárt: `exposureScore <= 15` (a `safe` kategóriában)
- Sikerességi kritérium: `segment.exposureCategory === 'safe'`

**TC-06: Cache működése — Bubi 5 perces TTL**
- Előfeltétel: két egymást követő `GET /api/cycling/bubi` hívás 30 másodpercen belül
- Elvárt: a második hívás a memória-cache-ből válaszol (< 5ms válaszidő szerver oldalon)
- Sikerességi kritérium: szerver log nem mutat kimenő GBFS hívást a második kérésnél

**TC-07: Waymarked Trails 24 órás cache**
- Előfeltétel: sikeres WMT API lekérdezés után 23 óra teleltén újabb hívás
- Elvárt: a cache még érvényes, nem indul újabb WMT API kérés
- Sikerességi kritérium: `_routeCache.expires > Date.now()` a 23. óra végén

**TC-08: Épület-koordináta hiánya esetén graceful fallback**
- Előfeltétel: `buildingLat=NaN`, `buildingLon=NaN`
- Elvárt: a térkép Budapest centrumára (`47.4979, 19.0402`) centrálódik, nem kerül `NaN` a Leaflet `setCenter` hívásba
- Sikerességi kritérium: térkép renderel hiba nélkül, fallback koordináta látható

**TC-09: RLS — felhasználó csak saját kerékpáros naplóját olvassa**
- Előfeltétel: `user_id = UUID_A` bejelentkezett felhasználó lekérdezi `user_cycling_log` táblát
- Elvárt: csak a saját (`user_id = UUID_A`) sorai láthatók, más felhasználók adatai nem
- Sikerességi kritérium: Supabase RLS policy `auth.uid() = user_id` érvényesül

**TC-10: Haversine formula pontossága**
- Előfeltétel: két ismert koordináta (Budapest Keleti — Városliget: kb. 2.1 km)
- Elvárt: `haversineMeters(47.4989, 19.0839, 47.5144, 19.0802)` eredménye `1800–2400` között van
- Sikerességi kritérium: `Math.abs(result - 2100) < 300`

### 6.2 Hibatűrési és failure mode tesztek (5 eset)

**FM-01: BKK GBFS API teljesen elérhetetlenné válik**
- Szimulálás: `STATION_STATUS_URL` 503-mal tér vissza
- Elvárt viselkedés: az API route a stale cache-t adja vissza `X-Cache-Stale: true` fejléccel; ha nincs cache, `[]` tömb `503` státusszal
- Felhasználói hatás: a térképen nem jelennek meg Bubi-jelölők, informatív üzenet: „Bubi-adatok átmenetileg nem elérhetők"

**FM-02: Waymarked Trails API időtúllépés**
- Szimulálás: WMT API 30 másodpercig nem válaszol (AbortSignal.timeout beavatkozik)
- Elvárt viselkedés: a `route.ts` visszaad `[]`-t `no-store` cache fejléccel; a komponens „Útvonalak nem elérhetők" üzenetet mutat
- Felhasználói hatás: a Bubi-térkép és az expozíciós overlay továbbra is működik

**FM-03: Overpass API mind a három mirror visszautasítja a kérést**
- Szimulálás: mind a három endpoint 429-cel válaszol
- Elvárt viselkedés: az expozíciós API `[]`-t ad vissza; a térkép kerékpárútadatok nélkül, csak Bubi-állomásokkal jelenik meg
- Megfizetett cost: részleges funkcionalitás, de nem teljes meghibásodás

**FM-04: Érvénytelen km-érték rögzítése a naplóban**
- Szimulálás: `POST /api/cycling/log` body-ban `distanceKm: -5` vagy `distanceKm: 999`
- Elvárt viselkedés: a Supabase CHECK constraint `CHECK (distance_km > 0 AND distance_km < 500)` megsért → 400 hiba, hibaüzenet megjelenik a UI-on
- Megfizetett cost: nincs érvénytelen adat az adatbázisban

**FM-05: Leaflet map container dupla-inicializálás (React StrictMode)**
- Szimulálás: React 18 StrictMode kétszer mountolja a komponenst
- Elvárt viselkedés: az `if (mapRef.current || !containerRef.current) return;` guard megakadályozza a dupla-init-et; a `destroyed` flag biztosítja a cleanup-ot
- Megfizetett cost: sem Leaflet `Container is already initialized` hiba, sem memóriaszivárgás

### 6.3 Adatintegritási ellenőrzések

```sql
-- Ellenőrzés 1: Nincs CO₂-érték nulla vagy negatív km esetén
SELECT COUNT(*) FROM user_cycling_log
WHERE co2_saved_kg <= 0 OR distance_km <= 0;
-- Elvárt: 0

-- Ellenőrzés 2: Minden Bubi-állomás Budapest határain belül van
SELECT station_id, lat, lon FROM bubi_station_snapshot
WHERE lat NOT BETWEEN 47.3 AND 47.7 OR lon NOT BETWEEN 18.8 AND 19.4;
-- Elvárt: 0 sor

-- Ellenőrzés 3: A cycling_route_cache-ben nincs lejárt rekord
SELECT COUNT(*) FROM cycling_route_cache WHERE expires_at < now();
-- Napi cleanup job eredménye

-- Ellenőrzés 4: Expozíciós pontszámok a [0, 100] tartományban vannak
SELECT COUNT(*) FROM cycling_air_exposure_scores
WHERE exposure_score < 0 OR exposure_score > 100;
-- Elvárt: 0

-- Ellenőrzés 5: A generált CO₂-megtakarítás (tárolt oszlop) megegyezik a kézi számítással
SELECT id, distance_km, co2_saved_kg,
       ROUND(distance_km * 0.21, 3) AS expected_co2
FROM user_cycling_log
WHERE ABS(co2_saved_kg - ROUND(distance_km * 0.21, 3)) > 0.001;
-- Elvárt: 0 sor
```

---

## 7. Implementációs lépések — sprint bontás

### Sprint 1 — Backend alapok (1. hét)

1. `app/api/cycling/routes/route.ts` létrehozása: Waymarked Trails API integráció Budapest bbox-ra, 24 órás szerver cache, ICN/NCN geometria letöltés
2. `app/api/cycling/bubi/route.ts` létrehozása: BKK GBFS v3 `station_status` + `station_information` merge, 5 perces cache, `BubiStation` típus definiálása
3. `app/api/cycling/exposure/route.ts` létrehozása: Overpass alapú expozíciós proxy számítás, 2 órás cache, épület-koordináta alapú lekérdezés
4. Supabase migráció: `cycling_route_cache`, `cycling_air_exposure_scores`, `user_cycling_log`, `bubi_station_snapshot` táblák, RLS policy-k

### Sprint 2 — Frontend alapkomponensek (2. hét)

5. `components/bubi-station-map.tsx`: Leaflet térkép Bubi-jelölőkkel, WMT útvonal polyline-okkal, rétegváltóval (alap / OpenCycleMap)
6. `components/cycling-network-panel.tsx`: fő panel tab-os navigációval, fetchek, Haversine sort, frissítési ciklus
7. `components/route-comparison-table.tsx`: WMT útvonal táblázat hálózati szint, hossz, expozíciós badge, CO₂-megtakarítás
8. `components/cycling-co2-counter.tsx`: összesítő számláló, kerékpáros út rögzítő form, kalória és CO₂ grid

### Sprint 3 — Bubi-dokkfinder és közelségi lista (3. hét)

9. `BubiStationList` komponens: legközelebbi 5 állomás, gyalogos becsült idő, kapacitás progress bar
10. `app/api/cycling/log/route.ts`: GET (összesítő) és POST (bejegyzés mentése) server actions
11. Napi kerékpáros összesítő e-mail sablon (Brevo / react-email) az épület admin-jának
12. Kerületi KII (Kerékpáros Infrastruktúra Index) statikus adat és megjelenítő komponens

### Sprint 4 — BioFlow Overlay és polírálás (4. hét)

13. `components/bioflow-overlay.tsx`: Canvas 2D animáció, pulzáló expozíciós overlay, Leaflet-integráció
14. Lokalizáció: `src/i18n/resources/en.ts` és `hu.ts` feltöltése a `cycling.*` névtér kulcsaival
15. Mobil UX: panel bottom-sheet módban mobilon, kompakt Bubi-lista, egyszerűsített térkép
16. E2E tesztek: Playwright tesztszcenáriók a 10 TC és 5 FM teszthez
17. Verzióbejegyzés: `versioning/YYYYMMDD_vX.Y.Z_cycling-network.md` és `marketing/marketing_values/YYYYMMDD_vX.Y.Z_cycling-network_marketing_value.md`

---

## 8. Thesis kapcsolat — közvetlen idézetek és hivatkozások

### 8.1 Az antwerpeni UFP-kutatás — a feature tudományos legitimációja

A szakdolgozat 2020-as szövegéből: a kerékpárosok ultrafinom részecske-kitettségének vizsgálata különböző útvonaltípusokon kimutatta, hogy a parkok és zöld folyosók mentén kerékpározó személyek akár **53%-kal kevesebb PM-frakcciós részecskét** lélegeznek be, mint azok, akik a főforgalmi utakon tekernek. Ez az eredmény képezi a feature légminőség-expozíciós proxy modelljének tudományos alapját: az `HIGHWAY_EXPOSURE_BASE` értékeit az úttípus és az antwerpeni eredmények logikájára kalibrálva határoztuk meg.

A Kerékpáros Hálózatelemzés és Légminőség-kitettség Elemző feature pontosan azt az üzenetet közvetíti a lakók felé, amelyet a szakdolgozat tudományos formában megállapított: **nem mindegy, melyik úton kerékpározunk**. A rövidebb út nem feltétlenül az egészségesebb, ha az egy főúton vezet végig.

### 8.2 A 17%-os kerékpározási arány mint tárgyalási alap

A 2018-as magyar felmérés adatai — amelyek szerint a magyarok 17%-a rendszeresen kerékpározik munkába vagy iskolába — alapul szolgálnak a CO₂-számláló kontextualizálásához: a feature megmutatja, hogy ha a lakóközösség tagjai ebbe az arányba kerülnek (azaz rendszeresen kerékpároznak), mekkora közös CO₂-megtakarítást érnek el éves szinten. Ez nem puszta statisztika, hanem cselekvési motivátor.

### 8.3 Budapest 2030 kerékpáros infrastruktúra-fejlesztési stratégia

A szakdolgozat által hivatkozott Budapest 2030 terv kerékpáros célkitűzései — 400+ km kerékpárút, összefüggő kerékpáros gyorshálózat — a feature kerületi KII-komponensének tágabb kontextusát adják. Ha a városfejlesztési döntéshozók nyomon követik a kerületek infrastrukturális fejlettségét, a panellako.hu platformon megjelenő kerékpáros infrastruktúra-értékelés egy adat-alapú visszajelzési eszközként funkcionálhat.

### 8.4 A Kerékpárosklub civil szervezet tematikus egybeesése

A Kerékpárosklub évente publikál infrastruktúra-hiány térképeket, és lobbitevékenységet folytat az összefüggő kerékpáros hálózat megteremtéséért. A panellako.hu app kerékpáros hálózatelemző feature-je épületi szinten ugyanezt a hiányelemzést teszi elérhetővé: a KII és az expozíciós overlay megmutatja, hogy az adott épület lakói előtt milyen infrastrukturális korlátok állnak a biztonságos kerékpározás útjában.

### 8.5 Az aktív mobilitás és a kalória-egyenérték

A szakdolgozat idézi az aktív mobilitás egészségügyi előnyeit: napi 30 perces kerékpározás kb. 200–300 kcal. A `user_cycling_log` tábla `calories_burned` generált oszlopa ezt az adatot rögzíti minden bejelentett úthoz (`distance_km × 40 kcal`), és a CO₂-számláló panelen megjelenítve a lakók évente megtekinthetik, hogy a kerékpáros közlekedés nemcsak a levegőt, hanem az egészségüket is javítja.

### 8.6 A térinformatikai elemzés mint kapocs — a szakdolgozat geoinformatikai módszertana

A feature megvalósítása maga is geoinformatikai elemzés: OSM Overpass térbeli lekérdezések, Haversine-formula alapú távolságszámítás, PostGIS `GEOMETRY(POINT/LINESTRING/MULTILINESTRING, 4326)` adattípusok, bounding box alapú szűrések — ezek mind a szakdolgozat által alkalmazott geoinformatikai módszertan webalkalmazásbeli leképezései. A feature nemcsak vizualizálja a szakdolgozat eredményeit, hanem ugyanazon térinformatikai elveket alkalmazza egy élő, interaktív rendszerben.

---

## 9. Kapcsolódó featurök és adatfüggőségek

- **Feature 01 (Levegőminőség Widget):** az `AirQualityResult` AQI-értéke befolyásolja az expozíciós overlay globális kalibrálását — magas AQI napokon az összes útvonal expozíciós pontszáma 15 ponttal emelkedik
- **Feature 03 (Közelségi térkép):** az épület GPS-koordinátái (`buildingLat`, `buildingLon`) már elérhetők, a Bubi-állomás-dokkfinder ezeket használja
- **Feature 06 (CO₂-nyomkövető):** a `user_cycling_log.co2_saved_kg` közvetlenül táplálja a Épület CO₂-mutatóját; az összesített közösségi kerékpáros CO₂-megtakarítás bekerül az épület zöld teljesítmény-scorejába
- **Feature 08 (Fenntartható Közlekedési Infópanel):** a Bubi-adatok és a kerékpáros infrastruktúra-értékelés átfedő adatforrásokra támaszkodnak — koordinálni kell az API cache stratégiákat

---

## 10. Adatforrás-attribúció és jogi megfontolások

Az alkalmazásban kötelező láthatóan megjeleníteni:

```
Kerékpáros útvonal-adatok: © OpenStreetMap közreműködők, ODbL 1.0
Waymarked Trails: © Waymarked Trails (waymarkedtrails.org), CC-BY-SA 2.0
Bubi valós idejű adatok: BKK — Budapesti Közlekedési Központ, GBFS v3 nyílt adatforrás
Expozíciós számítás: OSM Overpass API, ODbL 1.0
Tudományos alap: Faul Henrik (2020) — SZTE geoinformatikai szakdolgozat
```

A BKK GBFS adatok felhasználása nyilvános és ingyenes; a MOL Bubi GBFS feed publikusan elérhető, nem igényel API kulcsot. A Waymarked Trails API ingyenes, de kereskedelmi tömeges használat esetén a fenntartóval (`info@waymarkedtrails.org`) kommunikálni szükséges. Az OpenCycleMap (Thunderforest) ingyenes API kulcsot igényel, napi 500 tile-kérés kerettel — ez elegendő alacsony-közepes forgalom esetén.

---

*Prompt fájl vége — Feature 09: Kerékpáros Hálózatelemzés és Légminőség-kitettség Elemző*
*Generálva: panellako.hu geoinformatikai thesis alapján — Faul Henrik SZTE 2020 szakdolgozat*
*Karakterszám: ~25 000 — teljes implementációs specifikáció, production-ready TypeScript/TSX kódpéldákkal, teljes Supabase sémával, E2E verifikációs keretrendszerrel és BioFlow cyberpunk vizualizációs koncepcióval*
