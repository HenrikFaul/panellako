# FEATURE PROMPT 08 — Fenntartható Közlekedési Infópanel

## Áttekintés és motiváció (a szakdolgozat alapján)

A panellako.hu webapp lakóközösségeket szolgál ki, akik számára a mindennapi közlekedés az életminőség egyik meghatározó tényezője. A csatolt geoinformatikai szakdolgozat (SZTE, Természettudományi és Informatikai Kar, 2020) rendkívül részletesen tárgyalja a közösségi közlekedés, a kerékpáros közlekedés és a fenntartható mobilitás összefüggéseit az urbanisztikai életminőséggel és a városok turisztikai versenyképességével.

### A szakdolgozat kulcsmegállapításai — közvetlen hivatkozásalapok

**BKK és a közlekedésszervezés:**
A szakdolgozat részletesen bemutatja a Budapesti Közlekedési Központ (BKK) szerepét mint Magyarország egyik legkomplexebb közlekedésszervező intézményét. A BKK felelős Budapest teljes közösségi közlekedési hálózatának tervezéséért, szervezéséért és fejlesztéséért — beleértve a metróhálózatot, a villamosokat, a buszjáratokat, a HÉV-et és a hajójáratokat. A szakdolgozat hangsúlyozza, hogy a közösségi közlekedés hozzáférhetősége közvetlenül befolyásolja az ingatlanértékeket, a szuburbanizációs tendenciákat és a városon belüli szegregációs folyamatokat.

**GTFS adatformátum — ingyenes és nyílt:**
A szakdolgozat explicit módon rögzíti: *„A BKK honlapjáról letölthető a Google által kifejlesztett, nyilvános és ingyenes GTFS formátumban elérhető közösségi közlekedési menetrend adatbázisa."* Ez kulcsfontosságú: a BKK teljes menetrendje — több mint 200 járat, 6000+ megálló, millió+ menetrendi adat — ingyenesen feldolgozható fejlesztői alkalmazásokhoz. A GTFS (General Transit Feed Specification) a Google által definiált, iparági szabvánnyá vált formátum, amely CSV/txt fájlok sorozataként tartalmazza az összes statikus menetrendinformációt.

**Tömegközlekedés és életminőség összefüggése:**
A szakdolgozat részletesen elemzi, hogyan hat a tömegközlekedési hozzáférhetőség a városnegyedek versenyképességére, a turistaforgalomra és a lakóterületek vonzerejére. Közvetlen kapcsolatot mutat ki a megállók sűrűsége, a járatsűrűség és az ingatlanértékek között. Budapest belvárosában a kiváló közlekedési ellátottság az egyik elsődleges vonzerő a lakók és befektetők számára egyaránt.

**Keresletarányos közlekedés — telebusz rendszer:**
A szakdolgozat innovatív megoldásként tárgyalja a telebusz (demand-responsive transit, DRT) rendszert, amelynek lényege, hogy a közlekedési igényekhez igazított, előre rendelhető kisbuszos szolgáltatás csökkenti a zsúfoltságot a csúcsidőn kívüli időszakokban és az alacsony keresletű zónákban. A telebusz különösen releváns a panel lakótömbök számára: egy nagyobb lakótelep elegendő igényt generálhat a saját dedikált telebusz megállójához.

**Szuburbanizáció és autófüggőség kihívása:**
A szakdolgozat hangsúlyozza, hogy a szuburbanizáció — a városok terjeszkedése és a lakóövezetek külső peremre tolódása — az autófüggőség spiráljához vezet. Azok, akik a panel lakóövezetekbe kénytelenek költözni (részben lakásárak miatt), sokszor tömegközlekedési szempontból periferikus helyzetbe kerülnek. A webapp képes lehet erre a problémára is választ adni: a közlekedési helyzet transzparens bemutatása segíti a lakókat a tudatos döntéshozatalban.

**Kerékpáros közlekedés — a szakdolgozat részletes elemzése:**
A szakdolgozat külön fejezetet szentel a kerékpáros közlekedés előnyeinek és kihívásainak. A legfontosabb megállapítások:
- A kerékpározás **forgalombiztonsági előnyöket** nyújt (ha az infrastruktúra megfelelő)
- Jelentősen **csökkenti az útfenntartási költségeket** (egy kerékpár töredékannyi útkárosodást okoz, mint egy személyautó)
- **Zajcsökkentő hatása** van — a kerékpáros forgalom szinte zajmentes
- **Térbeli hatékonyság**: A szakdolgozat idézi a sokat hivatkozott összehasonlítást: *60 ember 60 autóban vs. 1 busz vs. kerékpárosok* — a kerékpár a legkevesebb helyet foglalja el személyenként az összes közlekedési mód közül
- **2018-as felmérés**: A magyarok 17%-a kerékpárral jár munkába vagy iskolába
- **Budapest 2030 terv**: Budapest városfejlesztési stratégiája kiemelten foglalkozik a kerékpáros infrastruktúra fejlesztésével

**Antwerpeni kerékpáros légszennyezettség-kutatás:**
A szakdolgozat részletesen hivatkozik egy antwerpen alapú tudományos vizsgálatra, amely azt mérte, hogy a kerékpárosok milyen mértékű ultrafinom részecske (UFP — Ultrafine Particles) koncentrációnak vannak kitéve különböző útvonaltípusokon:
- **Főutak (főforgalmi utak)**: legmagasabb UFP-expozíció — 100% referenciaszint
- **Mellékutcák (kisebb forgalmú utak)**: ~30%-kal alacsonyabb UFP-expozíció
- **Parkok, zöld folyosók**: ~53%-kal alacsonyabb UFP-expozíció a főutakhoz képest

Ez a kutatás rendkívül praktikus következtetéssel jár: a kerékpárosok egészségügyi kockázata nagyban csökkenthető, ha kerülik a főforgalmi utakat és park- vagy mellékutak mentén kerékpároznak — még ha az útvonal valamivel hosszabb is. A panelházas lakóknak szóló kerékpáros tanácsadó funkciónak ezt a tudományos alapot KÖTELEZŐEN közvetítenie kell.

**Aktív mobilitás egészségügyi előnyei:**
A szakdolgozat összefoglalja az aktív közlekedési módok (gyaloglás, kerékpározás) egészségügyi előnyeit: szív-ér rendszer erősítése, testsúlykontroll, mentális egészség javulása, D-vitamin termelés. Egy napi 30 perces kerékpározás kb. 200-300 kcal energiát éget el, ami egy éves szinten 12-18 kg zsírnak felel meg — ezek az adatok közvetlenül beépíthetők a CO₂-kalkulátor kalóriaszámoló funkciójába.

---

## A fejlesztendő feature teljes műszaki specifikációja

### Feature neve: **Fenntartható Közlekedési Infópanel**
### Helye az alkalmazásban: Workspace dashboard, dedikált „Közlekedés" tab, épület-szintű widget
### Prioritás: KÖZEPES-MAGAS (lakóközösségi életminőség, CO₂-csökkentési stratégia)
### Kapcsolódó feature-ök:
- **Feature 03**: Közelségi térkép (proximity map) — az épület GPS koordinátái már elérhetők
- **Feature 06**: CO₂-nyomkövető — a transport CO₂ adatokat ebbe a modulba kell integrálni
- **Feature 05**: Értesítési rendszer — BKK zavar-riasztások push értesítésként küldhetők

---

## 1. GTFS adatstruktúra és BKK integráció

### 1.1 GTFS statikus fájlstruktúra

A BKK GTFS csomagja a következő CSV/txt fájlokat tartalmazza (letöltés: https://www.bkk.hu/gtfs/budapest_gtfs.zip):

```
budapest_gtfs.zip
├── agency.txt          — közlekedési szervezet adatai (BKK, MÁV stb.)
├── calendar.txt        — menetrendi naptár (hétköznap, hétvége, ünnepnapok)
├── calendar_dates.txt  — kivételes napok (ünnepnapok, különjáratok)
├── routes.txt          — járatok listája (metró, villamos, busz stb.)
├── shapes.txt          — járat-útvonalak koordinátás leírása (lat/lon pontsorozat)
├── stop_times.txt      — melyik járat mikor áll meg melyik megállóban
├── stops.txt           — megállók listája GPS koordinátákkal
└── trips.txt           — menetrendhez tartozó konkrét menetek
```

**agency.txt** szerkezete:
```
agency_id,agency_name,agency_url,agency_timezone,agency_lang,agency_phone
BKK,Budapesti Közlekedési Központ,https://www.bkk.hu,Europe/Budapest,hu,+36-1-3-255-255
```

**stops.txt** szerkezete (fontosabb oszlopok):
```
stop_id,stop_code,stop_name,stop_lat,stop_lon,location_type,parent_station,stop_timezone,wheelchair_boarding
F00851,851,Boráros tér M,47.482780,19.066780,1,,Europe/Budapest,1
F00852,852,"Boráros tér (Petőfi híd, budai hídfő)",47.482100,19.062400,0,F00851,Europe/Budapest,0
```

**routes.txt** szerkezete:
```
route_id,agency_id,route_short_name,route_long_name,route_desc,route_type,route_url,route_color,route_text_color
5100,BKK,4,Fehér út - Boráros tér,,0,,006AB3,FFFFFF
5200,BKK,6,Kelenföld vasútállomás - Városliget,,0,,006AB3,FFFFFF
3040,BKK,M2,Örs vezér tere - Déli pályaudvar,,1,,FF0000,FFFFFF
```

`route_type` értékek:
- `0` = villamosvonal
- `1` = metróvonal
- `2` = vasutvonal (MÁV/GYSEV)
- `3` = buszjárat
- `4` = komp/hajójárat
- `11` = trolibusz

**trips.txt** szerkezete:
```
route_id,service_id,trip_id,trip_headsign,direction_id,block_id,shape_id,wheelchair_accessible,bikes_allowed
5100,WEEKDAY,trip_5100_001,Boráros tér,0,BLK001,shape_5100_0,1,0
```

**stop_times.txt** szerkezete (a legnagyobb fájl — millió+ sor):
```
trip_id,arrival_time,departure_time,stop_id,stop_sequence,pickup_type,drop_off_type,shape_dist_traveled
trip_5100_001,06:00:00,06:00:00,F00100,1,0,0,0.0
trip_5100_001,06:03:00,06:03:00,F00200,2,0,0,450.5
```

**calendar.txt** szerkezete:
```
service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date
WEEKDAY,1,1,1,1,1,0,0,20240901,20250831
WEEKEND,0,0,0,0,0,1,1,20240901,20250831
HOLIDAY,0,0,0,0,0,0,0,20240901,20250831
```

### 1.2 Megállók keresése koordináták alapján — SQL lekérdezés Supabase-ben

A PostGIS `ST_DWithin` függvénnyel gyorsan megtalálható az épület közelében lévő összes megálló:

```sql
-- Megállók lekérdezése 500 méteres körzetből
SELECT
  stop_id,
  stop_code,
  stop_name,
  stop_lat,
  stop_lon,
  ST_Distance(
    ST_MakePoint(stop_lon, stop_lat)::geography,
    ST_MakePoint($1, $2)::geography  -- $1=épület_lon, $2=épület_lat
  ) AS distance_meters
FROM gtfs_stops
WHERE ST_DWithin(
  ST_MakePoint(stop_lon, stop_lat)::geography,
  ST_MakePoint($1, $2)::geography,
  500  -- 500 méter sugár
)
ORDER BY distance_meters ASC
LIMIT 10;
```

### 1.3 BKK Real-Time API (GTFS-RT)

A BKK valós idejű API alap URL-je:
```
https://go.bkk.hu/api/query/v1/ws/otp/routers/budapest/
```

**Valós idejű indulások lekérdezése egy megállóból:**
```
GET https://go.bkk.hu/api/query/v1/ws/otp/routers/budapest/index/stops/{stop_id}/stoptimes
    ?numberOfDepartures=10
    &timeRange=3600
    &key={BKK_API_KEY}
```

Válasz JSON struktúra (egyszerűsítve):
```json
{
  "version": 2,
  "generatedAt": "1715940000000",
  "currentTime": 1715940000000,
  "data": {
    "entry": {
      "stopTimes": [
        {
          "serviceDay": 1715900400,
          "scheduledArrival": 1715940600,
          "realtimeArrival": 1715940540,
          "arrivalDelay": -60,
          "scheduledDeparture": 1715940600,
          "realtimeDeparture": 1715940540,
          "departureDelay": -60,
          "realtime": true,
          "tripId": "trip_5100_001",
          "routeId": "5100",
          "routeShortName": "4",
          "routeLongName": "Fehér út - Boráros tér",
          "tripHeadsign": "Boráros tér",
          "stopSequence": 15,
          "pickupType": 0,
          "dropOffType": 0
        }
      ]
    }
  }
}
```

**Zavar-riasztások lekérdezése:**
```
GET https://go.bkk.hu/api/query/v1/ws/otp/routers/budapest/index/alerts
    ?key={BKK_API_KEY}
```

Válasz JSON struktúra (alert entry):
```json
{
  "data": {
    "list": [
      {
        "id": "alert_12345",
        "effectiveStartDate": 1715940000,
        "effectiveEndDate": 1716026400,
        "cause": "CONSTRUCTION",
        "effect": "DETOUR",
        "url": "https://www.bkk.hu/hirek/...",
        "headerText": {
          "someTranslation": [
            { "language": "hu", "text": "A 4-es villamos nem jár a Blaha Lujza tér és a Kálvin tér között" }
          ]
        },
        "descriptionText": {
          "someTranslation": [
            { "language": "hu", "text": "2024. május 17-18-án felújítási munkák miatt..." }
          ]
        },
        "informedEntities": [
          { "routeId": "5100", "stopId": null },
          { "routeId": null, "stopId": "F00851" }
        ]
      }
    ]
  }
}
```

### 1.4 MOL Bubi Kerékpár API

A BKK által üzemeltetett MOL Bubi rendszer nyilvánosan elérhető API-ja:
```
GET https://www.bkk.hu/apps/bubi/stations.json
```

Válasz struktúra:
```json
{
  "network": {
    "id": "bubi",
    "name": "MOL Bubi",
    "location": {
      "city": "Budapest",
      "country": "HU",
      "latitude": 47.498,
      "longitude": 19.040
    },
    "stations": [
      {
        "id": "bubi_001",
        "name": "Fővám tér",
        "timestamp": 1715940000,
        "free_bikes": 8,
        "empty_slots": 4,
        "latitude": 47.482500,
        "longitude": 19.062800,
        "extra": {
          "uid": "001",
          "number": "001",
          "slots": 12,
          "nbDocks": 12,
          "online": true,
          "ebikes": 2
        }
      }
    ]
  }
}
```

---

## 2. Supabase adatbázis séma

### 2.1 GTFS statikus adatok (importált táblák)

```sql
-- GTFS megállók táblája
CREATE TABLE gtfs_stops (
  stop_id         TEXT PRIMARY KEY,
  stop_code       TEXT,
  stop_name       TEXT NOT NULL,
  stop_lat        DOUBLE PRECISION NOT NULL,
  stop_lon        DOUBLE PRECISION NOT NULL,
  location_type   INTEGER DEFAULT 0,
  parent_station  TEXT REFERENCES gtfs_stops(stop_id),
  wheelchair_boarding INTEGER DEFAULT 0,
  geom            GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
                    ST_MakePoint(stop_lon, stop_lat)::geography
                  ) STORED,
  imported_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gtfs_stops_geom ON gtfs_stops USING GIST(geom);

-- GTFS járatok táblája
CREATE TABLE gtfs_routes (
  route_id         TEXT PRIMARY KEY,
  agency_id        TEXT NOT NULL,
  route_short_name TEXT NOT NULL,
  route_long_name  TEXT,
  route_type       INTEGER NOT NULL,
  route_color      TEXT DEFAULT '0000FF',
  route_text_color TEXT DEFAULT 'FFFFFF'
);

-- GTFS menetrendi naptár
CREATE TABLE gtfs_calendar (
  service_id TEXT PRIMARY KEY,
  monday     BOOLEAN NOT NULL,
  tuesday    BOOLEAN NOT NULL,
  wednesday  BOOLEAN NOT NULL,
  thursday   BOOLEAN NOT NULL,
  friday     BOOLEAN NOT NULL,
  saturday   BOOLEAN NOT NULL,
  sunday     BOOLEAN NOT NULL,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL
);

-- GTFS menetek (trips)
CREATE TABLE gtfs_trips (
  trip_id        TEXT PRIMARY KEY,
  route_id       TEXT NOT NULL REFERENCES gtfs_routes(route_id),
  service_id     TEXT NOT NULL REFERENCES gtfs_calendar(service_id),
  trip_headsign  TEXT,
  direction_id   INTEGER
);

-- GTFS megállási idők (ez a legnagyobb tábla — particionálni kell)
CREATE TABLE gtfs_stop_times (
  trip_id          TEXT NOT NULL REFERENCES gtfs_trips(trip_id),
  arrival_time     INTERVAL NOT NULL,
  departure_time   INTERVAL NOT NULL,
  stop_id          TEXT NOT NULL REFERENCES gtfs_stops(stop_id),
  stop_sequence    INTEGER NOT NULL,
  PRIMARY KEY (trip_id, stop_sequence)
) PARTITION BY HASH (trip_id);

CREATE TABLE gtfs_stop_times_p0 PARTITION OF gtfs_stop_times FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE gtfs_stop_times_p1 PARTITION OF gtfs_stop_times FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE gtfs_stop_times_p2 PARTITION OF gtfs_stop_times FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE gtfs_stop_times_p3 PARTITION OF gtfs_stop_times FOR VALUES WITH (MODULUS 4, REMAINDER 3);

CREATE INDEX idx_stop_times_stop_id ON gtfs_stop_times (stop_id);
CREATE INDEX idx_stop_times_trip_id ON gtfs_stop_times (trip_id);
```

### 2.2 Közlekedési beállítások és CO₂-nyomkövetés

```sql
-- Felhasználó közlekedési preferenciái
CREATE TABLE transport_preferences (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  home_address      TEXT,
  work_address      TEXT,
  preferred_modes   TEXT[] DEFAULT ARRAY['transit','cycling'], -- 'car','transit','cycling','walking'
  co2_tracking_opt  BOOLEAN DEFAULT FALSE,
  weekly_summary    BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, workspace_id)
);

-- Napi közlekedési CO₂ napló
CREATE TABLE transport_co2_log (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  log_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  transport_mode   TEXT NOT NULL CHECK (transport_mode IN ('car','transit','cycling','walking','escooter')),
  distance_km      DECIMAL(8,2) NOT NULL,
  co2_kg           DECIMAL(8,4) NOT NULL,
  calories_burned  INTEGER,
  cost_huf         DECIMAL(10,2),
  trip_purpose     TEXT CHECK (trip_purpose IN ('work','shopping','leisure','other')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Épület-szintű aggregált közlekedési statisztikák (anonim)
CREATE TABLE building_transport_stats (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  stat_month       DATE NOT NULL, -- hónap első napja
  total_trips      INTEGER DEFAULT 0,
  car_pct          DECIMAL(5,2) DEFAULT 0,
  transit_pct      DECIMAL(5,2) DEFAULT 0,
  cycling_pct      DECIMAL(5,2) DEFAULT 0,
  walking_pct      DECIMAL(5,2) DEFAULT 0,
  co2_saved_kg     DECIMAL(10,2) DEFAULT 0, -- az autóhoz képest
  gamification_pts INTEGER DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, stat_month)
);

-- Közlekedési gamifikáció — épület rangsor
CREATE TABLE transport_leaderboard (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  month           DATE NOT NULL,
  rank            INTEGER,
  total_co2_saved DECIMAL(10,2) DEFAULT 0,
  badge           TEXT, -- 'bronze','silver','gold','platinum'
  UNIQUE(workspace_id, month)
);

-- BKK zavar-riasztások cache (épülethez rendelt vonalak alapján)
CREATE TABLE bkk_alert_cache (
  alert_id        TEXT PRIMARY KEY,
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  route_ids       TEXT[],
  stop_ids        TEXT[],
  start_time      TIMESTAMPTZ,
  end_time        TIMESTAMPTZ,
  cause           TEXT,
  effect          TEXT,
  header_hu       TEXT,
  description_hu  TEXT,
  url             TEXT,
  cached_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Épület közlekedési beállítások (admin konfigurálja)
CREATE TABLE workspace_transport_config (
  workspace_id       UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  building_lat       DOUBLE PRECISION NOT NULL,
  building_lon       DOUBLE PRECISION NOT NULL,
  nearby_stop_ids    TEXT[] DEFAULT ARRAY[]::TEXT[], -- manuálisan vagy auto-beállított
  nearby_bubi_ids    TEXT[] DEFAULT ARRAY[]::TEXT[],
  parking_zone       TEXT, -- 'A','B','C','D' vagy NULL
  ev_charging_nearby BOOLEAN DEFAULT FALSE,
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 CO₂ emissziós faktorok

```sql
-- Közlekedési módok CO₂ emissziós faktorai (gCO₂/km/fő)
CREATE TABLE transport_emission_factors (
  mode         TEXT PRIMARY KEY,
  name_hu      TEXT NOT NULL,
  co2_g_per_km DECIMAL(8,2) NOT NULL,  -- gramm CO₂ / km / utas
  avg_speed_kmh DECIMAL(5,1),
  cost_huf_per_km DECIMAL(8,2),
  calories_per_km DECIMAL(5,1)
);

INSERT INTO transport_emission_factors VALUES
  ('car',      'Személyautó',    170.0,  35.0, 85.0,   0.0),
  ('transit',  'Tömegközlekedés', 41.0, 25.0,  15.0,   0.0),
  ('cycling',  'Kerékpár',         0.0, 15.0,   0.0,  40.0),
  ('walking',  'Gyaloglás',        0.0,  5.0,   0.0,  60.0),
  ('escooter', 'Elektromos roller', 22.0, 20.0,  35.0,  0.0);
```

---

## 3. GTFS statikus adat import stratégia — Supabase Edge Function

### 3.1 Heti frissítési Edge Function

```typescript
// supabase/functions/gtfs-import/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BKK_GTFS_URL = 'https://www.bkk.hu/gtfs/budapest_gtfs.zip'

serve(async (req) => {
  // Csak jogosult cron hívások engedélyezése
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // 1. GTFS ZIP letöltése
    console.log('GTFS ZIP letöltése...')
    const response = await fetch(BKK_GTFS_URL)
    if (!response.ok) throw new Error(`GTFS letöltési hiba: ${response.status}`)

    const zipBuffer = await response.arrayBuffer()

    // 2. ZIP kicsomagolása (Deno-ban: DenoZip könyvtárral)
    const { unzip } = await import('https://deno.land/x/zip@v1.2.3/mod.ts')
    const files = await unzip(new Uint8Array(zipBuffer))

    // 3. stops.txt importálása
    const stopsContent = new TextDecoder().decode(files['stops.txt'])
    const stops = parseCSV(stopsContent)

    // Batch upsert 1000 soronként
    for (let i = 0; i < stops.length; i += 1000) {
      const batch = stops.slice(i, i + 1000).map(row => ({
        stop_id: row.stop_id,
        stop_code: row.stop_code || null,
        stop_name: row.stop_name,
        stop_lat: parseFloat(row.stop_lat),
        stop_lon: parseFloat(row.stop_lon),
        location_type: parseInt(row.location_type || '0'),
        parent_station: row.parent_station || null,
        wheelchair_boarding: parseInt(row.wheelchair_boarding || '0'),
        imported_at: new Date().toISOString()
      }))

      await supabase.from('gtfs_stops').upsert(batch, { onConflict: 'stop_id' })
    }

    // 4. routes.txt importálása
    const routesContent = new TextDecoder().decode(files['routes.txt'])
    const routes = parseCSV(routesContent)

    await supabase.from('gtfs_routes').upsert(
      routes.map(r => ({
        route_id: r.route_id,
        agency_id: r.agency_id,
        route_short_name: r.route_short_name,
        route_long_name: r.route_long_name || null,
        route_type: parseInt(r.route_type),
        route_color: r.route_color || '0000FF',
        route_text_color: r.route_text_color || 'FFFFFF'
      })),
      { onConflict: 'route_id' }
    )

    // 5. Importálás naplózása
    await supabase.from('gtfs_import_log').insert({
      imported_at: new Date().toISOString(),
      stops_count: stops.length,
      routes_count: routes.length,
      status: 'success'
    })

    return new Response(JSON.stringify({
      success: true,
      stops: stops.length,
      routes: routes.length
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    await supabase.from('gtfs_import_log').insert({
      imported_at: new Date().toISOString(),
      status: 'error',
      error_message: error.message
    })
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.replace(/\r/g, '').split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"/, '').replace(/"$/, ''))
  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = parseCSVLine(line)
      return Object.fromEntries(headers.map((h, i) => [h, values[i] || '']))
    })
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes }
    else if (char === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += char }
  }
  result.push(current)
  return result
}
```

### 3.2 Cron job konfiguráció (supabase/config.toml)

```toml
[functions.gtfs-import]
schedule = "0 3 * * 1"  # Hétfőnként hajnali 3:00-kor
```

---

## 4. Next.js API Routes és Server Actions

### 4.1 BKK valós idejű indulások API route

```typescript
// app/api/transport/bkk-departures/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BKK_API_BASE = 'https://go.bkk.hu/api/query/v1/ws/otp/routers/budapest'
const BKK_API_KEY = process.env.BKK_API_KEY!

export interface BKKDeparture {
  tripId: string
  routeShortName: string
  routeLongName: string
  tripHeadsign: string
  scheduledDeparture: number
  realtimeDeparture: number
  departureDelay: number
  realtime: boolean
  minutesUntilDeparture: number
  routeType: number
  routeColor: string
}

export interface StopDepartures {
  stopId: string
  stopName: string
  distanceMeters: number
  walkingMinutes: number
  departures: BKKDeparture[]
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId megadása kötelező' }, { status: 400 })
  }

  const supabase = createClient()

  // Épület koordinátáinak lekérdezése
  const { data: config, error: configError } = await supabase
    .from('workspace_transport_config')
    .select('building_lat, building_lon, nearby_stop_ids')
    .eq('workspace_id', workspaceId)
    .single()

  if (configError || !config) {
    return NextResponse.json({ error: 'Épület konfiguráció nem található' }, { status: 404 })
  }

  // Közeli megállók lekérdezése (PostGIS)
  const { data: nearbyStops } = await supabase.rpc('get_nearby_stops', {
    p_lat: config.building_lat,
    p_lon: config.building_lon,
    p_radius_m: 500,
    p_limit: 5
  })

  if (!nearbyStops || nearbyStops.length === 0) {
    return NextResponse.json({ stops: [], message: 'Nincs közeli megálló 500 méteres körzetben' })
  }

  const now = Math.floor(Date.now() / 1000)
  const results: StopDepartures[] = []

  // Párhuzamos API hívások minden megállóhoz
  await Promise.all(
    nearbyStops.slice(0, 5).map(async (stop: any) => {
      try {
        const url = `${BKK_API_BASE}/index/stops/${stop.stop_id}/stoptimes?numberOfDepartures=6&timeRange=3600&key=${BKK_API_KEY}`
        const response = await fetch(url, {
          next: { revalidate: 30 } // 30 másodperces cache
        })

        if (!response.ok) return

        const data = await response.json()
        const stopTimes = data?.data?.entry?.stopTimes || []

        const departures: BKKDeparture[] = stopTimes.map((st: any) => ({
          tripId: st.tripId,
          routeShortName: st.routeShortName,
          routeLongName: st.routeLongName,
          tripHeadsign: st.tripHeadsign,
          scheduledDeparture: st.scheduledDeparture,
          realtimeDeparture: st.realtimeDeparture || st.scheduledDeparture,
          departureDelay: st.departureDelay || 0,
          realtime: st.realtime || false,
          minutesUntilDeparture: Math.max(0, Math.round((st.realtimeDeparture - now) / 60)),
          routeType: 3, // default: busz, finomítható routes táblából
          routeColor: '006AB3'
        }))

        results.push({
          stopId: stop.stop_id,
          stopName: stop.stop_name,
          distanceMeters: Math.round(stop.distance_meters),
          walkingMinutes: Math.round(stop.distance_meters / 80), // ~80 m/perc sétatempó
          departures: departures.filter(d => d.minutesUntilDeparture >= 0)
        })
      } catch (err) {
        console.error(`BKK API hiba a ${stop.stop_id} megállóhoz:`, err)
      }
    })
  )

  results.sort((a, b) => a.distanceMeters - b.distanceMeters)

  return NextResponse.json({ stops: results, generatedAt: now })
}
```

### 4.2 MOL Bubi állomások Server Action

```typescript
// app/actions/transport/bubi.ts
'use server'

import { createClient } from '@/lib/supabase/server'

const BUBI_API_URL = 'https://www.bkk.hu/apps/bubi/stations.json'

export interface BubiStation {
  id: string
  name: string
  freeBikes: number
  emptySlots: number
  totalSlots: number
  ebikes: number
  online: boolean
  latitude: number
  longitude: number
  distanceMeters: number
  walkingMinutes: number
  cyclingMinutesToCenter: number // Deák Ferenc tér
}

export async function getNearestBubiStations(workspaceId: string): Promise<BubiStation[]> {
  const supabase = createClient()

  const { data: config } = await supabase
    .from('workspace_transport_config')
    .select('building_lat, building_lon')
    .eq('workspace_id', workspaceId)
    .single()

  if (!config) throw new Error('Épület konfiguráció nem található')

  // Fetch Bubi adatok (2 perces cache)
  const response = await fetch(BUBI_API_URL, {
    next: { revalidate: 120 }
  })

  if (!response.ok) throw new Error('MOL Bubi API nem elérhető')

  const data = await response.json()
  const stations = data?.network?.stations || []

  // Távolság számítása és rendezés
  const stationsWithDistance = stations
    .map((station: any) => {
      const distM = haversineDistance(
        config.building_lat, config.building_lon,
        station.latitude, station.longitude
      )
      // Deák Ferenc tér (47.4980, 19.0489) kerékpáros távolsága (légvonalbeli / 0.85 sebességi faktor)
      const centerDist = haversineDistance(station.latitude, station.longitude, 47.498, 19.0489)
      return {
        id: station.id,
        name: station.name,
        freeBikes: station.free_bikes || 0,
        emptySlots: station.empty_slots || 0,
        totalSlots: station.extra?.slots || 0,
        ebikes: station.extra?.ebikes || 0,
        online: station.extra?.online !== false,
        latitude: station.latitude,
        longitude: station.longitude,
        distanceMeters: Math.round(distM),
        walkingMinutes: Math.round(distM / 80),
        cyclingMinutesToCenter: Math.round(centerDist / 250) // ~15 km/h = 250 m/perc
      }
    })
    .filter((s: any) => s.distanceMeters <= 800)
    .sort((a: any, b: any) => a.distanceMeters - b.distanceMeters)
    .slice(0, 5)

  return stationsWithDistance
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Föld sugara méterben
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(Δφ/2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
```

### 4.3 CO₂ kalkulátor Server Action

```typescript
// app/actions/transport/co2-calculator.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export interface TransportOption {
  mode: 'car' | 'transit' | 'cycling' | 'walking' | 'escooter'
  nameHu: string
  co2Kg: number
  timeMins: number
  costHuf: number
  caloriesBurned: number
  co2SavedVsCar: number
  costSavedVsCar: number
}

export interface CO2CalculatorResult {
  distanceKm: number
  options: TransportOption[]
  weeklyCarSavingCO2: number   // ha minden nap busszal → heti CO₂ megtakarítás kg
  monthlyCarSavingHuf: number  // havi autóköltség megtakarítás Ft-ban
  calorieBonusPerYear: number  // éves plusz kalóriaégetés kerékpárral
}

export async function calculateTransportOptions(
  originLat: number, originLon: number,
  destLat: number, destLon: number
): Promise<CO2CalculatorResult> {
  const supabase = createClient()

  // Emissziós faktorok lekérdezése
  const { data: factors } = await supabase
    .from('transport_emission_factors')
    .select('*')

  const distanceKm = haversineDistance(originLat, originLon, destLat, destLon) / 1000

  const factorMap = Object.fromEntries(
    (factors || []).map(f => [f.mode, f])
  )

  const carFactor = factorMap['car']

  const options: TransportOption[] = ['car', 'transit', 'cycling', 'walking', 'escooter']
    .filter(mode => {
      // Szűrés: gyaloglás max 5 km, kerékpár max 20 km, roller max 15 km
      if (mode === 'walking' && distanceKm > 5) return false
      if (mode === 'cycling' && distanceKm > 20) return false
      if (mode === 'escooter' && distanceKm > 15) return false
      return true
    })
    .map(mode => {
      const factor = factorMap[mode]
      if (!factor) return null
      const co2Kg = (distanceKm * factor.co2_g_per_km) / 1000
      const timeMins = Math.round((distanceKm / factor.avg_speed_kmh) * 60)
      const costHuf = Math.round(distanceKm * factor.cost_huf_per_km)
      const caloriesBurned = Math.round(distanceKm * factor.calories_per_km)
      const co2SavedVsCar = (distanceKm * carFactor.co2_g_per_km / 1000) - co2Kg
      const costSavedVsCar = Math.round(distanceKm * carFactor.cost_huf_per_km) - costHuf

      return {
        mode: mode as TransportOption['mode'],
        nameHu: factor.name_hu,
        co2Kg: Math.round(co2Kg * 1000) / 1000,
        timeMins,
        costHuf,
        caloriesBurned,
        co2SavedVsCar: Math.round(co2SavedVsCar * 1000) / 1000,
        costSavedVsCar
      }
    })
    .filter(Boolean) as TransportOption[]

  const transitOption = options.find(o => o.mode === 'transit')
  const cyclingOption = options.find(o => o.mode === 'cycling')

  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    options,
    weeklyCarSavingCO2: transitOption
      ? Math.round(transitOption.co2SavedVsCar * 10 * 100) / 100
      : 0,
    monthlyCarSavingHuf: transitOption
      ? Math.round(transitOption.costSavedVsCar * 22)
      : 0,
    calorieBonusPerYear: cyclingOption
      ? cyclingOption.caloriesBurned * 2 * 220
      : 0
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(Δφ/2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
```

---

## 5. React komponensek

### 5.1 TransportPanel — fő konténer komponens

```typescript
// components/transport/TransportPanel.tsx
'use client'

import { useState } from 'react'
import { BKKDepartureBoard } from './BKKDepartureBoard'
import { BubiStationCard } from './BubiStationCard'
import { TransportCO2Calculator } from './TransportCO2Calculator'
import { CyclingRouteAdvisor } from './CyclingRouteAdvisor'
import { CommunityTransportStats } from './CommunityTransportStats'
import { useI18n } from '@/lib/i18n/useI18n'
import { Bus, Bike, Calculator, MapPin, BarChart3 } from 'lucide-react'

type TransportTab = 'departures' | 'bubi' | 'calculator' | 'cycling' | 'community'

interface TransportPanelProps {
  workspaceId: string
}

export function TransportPanel({ workspaceId }: TransportPanelProps) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<TransportTab>('departures')

  const tabs: { id: TransportTab; labelKey: string; Icon: React.ElementType }[] = [
    { id: 'departures', labelKey: 'transport.tabs.departures', Icon: Bus },
    { id: 'bubi',       labelKey: 'transport.tabs.bubi',       Icon: Bike },
    { id: 'calculator', labelKey: 'transport.tabs.calculator', Icon: Calculator },
    { id: 'cycling',    labelKey: 'transport.tabs.cycling',    Icon: MapPin },
    { id: 'community',  labelKey: 'transport.tabs.community',  Icon: BarChart3 },
  ]

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Panel fejléc */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('transport.panel.title')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {t('transport.panel.subtitle')}
        </p>
      </div>

      {/* Tab navigáció — vízszintes görgetés mobilon */}
      <div className="flex overflow-x-auto scrollbar-none border-b border-gray-200 dark:border-gray-700">
        {tabs.map(({ id, labelKey, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={[
              'flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
              activeTab === id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            ].join(' ')}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t(labelKey)}</span>
          </button>
        ))}
      </div>

      {/* Tab tartalom */}
      <div className="p-4">
        {activeTab === 'departures' && <BKKDepartureBoard workspaceId={workspaceId} />}
        {activeTab === 'bubi'       && <BubiStationCard workspaceId={workspaceId} />}
        {activeTab === 'calculator' && <TransportCO2Calculator workspaceId={workspaceId} />}
        {activeTab === 'cycling'    && <CyclingRouteAdvisor workspaceId={workspaceId} />}
        {activeTab === 'community'  && <CommunityTransportStats workspaceId={workspaceId} />}
      </div>
    </div>
  )
}
```

### 5.2 BKKDepartureBoard — valós idejű menetrend megjelenítő

```typescript
// components/transport/BKKDepartureBoard.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, Clock, Wifi, WifiOff } from 'lucide-react'
import { useI18n } from '@/lib/i18n/useI18n'
import type { StopDepartures, BKKDeparture } from '@/app/api/transport/bkk-departures/route'

const ROUTE_TYPE_ICONS: Record<number, string> = {
  0: '🚃', // villamos
  1: '🚇', // metró
  2: '🚆', // vasút
  3: '🚌', // busz
  4: '⛴️', // hajó
  11: '🚎', // trolibusz
}

function DepartureRow({ dep }: { dep: BKKDeparture }) {
  const isLate = dep.departureDelay > 60
  const isEarly = dep.departureDelay < -30
  const mins = dep.minutesUntilDeparture

  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      {/* Járatszám */}
      <span
        className="min-w-[3rem] text-center text-sm font-bold px-2 py-1 rounded text-white"
        style={{ backgroundColor: `#${dep.routeColor || '006AB3'}` }}
      >
        {dep.routeShortName}
      </span>

      {/* Végállomás */}
      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
        {dep.tripHeadsign}
      </span>

      {/* Indulási idő */}
      <div className="text-right">
        <span className={[
          'text-base font-semibold',
          mins <= 2 ? 'text-red-600 animate-pulse' :
          mins <= 5 ? 'text-orange-500' :
          'text-gray-900 dark:text-white'
        ].join(' ')}>
          {mins === 0 ? '↓' : `${mins}'`}
        </span>
        {dep.realtime && (
          <span className={[
            'ml-1 text-xs',
            isLate ? 'text-red-500' : isEarly ? 'text-blue-500' : 'text-green-500'
          ].join(' ')}>
            {isLate ? `+${Math.round(dep.departureDelay / 60)}'` :
             isEarly ? `${Math.round(dep.departureDelay / 60)}'` : '●'}
          </span>
        )}
      </div>
    </div>
  )
}

export function BKKDepartureBoard({ workspaceId }: { workspaceId: string }) {
  const { t } = useI18n()
  const [stops, setStops] = useState<StopDepartures[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isRealtime, setIsRealtime] = useState(true)
  const [expandedStop, setExpandedStop] = useState<string | null>(null)

  const fetchDepartures = useCallback(async () => {
    try {
      const res = await fetch(`/api/transport/bkk-departures?workspaceId=${workspaceId}`)
      if (!res.ok) throw new Error('API hiba')
      const data = await res.json()
      setStops(data.stops || [])
      setLastUpdate(new Date())
      setIsRealtime(true)
      setError(null)
    } catch (err) {
      setError(t('transport.bkk.errorFetch'))
      setIsRealtime(false)
    } finally {
      setLoading(false)
    }
  }, [workspaceId, t])

  useEffect(() => {
    fetchDepartures()
    const interval = setInterval(fetchDepartures, 30_000) // 30 másodperces frissítés
    return () => clearInterval(interval)
  }, [fetchDepartures])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950 rounded-lg text-red-700 dark:text-red-300">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Státusz sor */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          {isRealtime
            ? <Wifi className="w-3.5 h-3.5 text-green-500" />
            : <WifiOff className="w-3.5 h-3.5 text-red-500" />
          }
          <span>{isRealtime ? t('transport.bkk.realtimeOn') : t('transport.bkk.realtimeOff')}</span>
        </div>
        {lastUpdate && (
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{t('transport.bkk.lastUpdate', { time: lastUpdate.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) })}</span>
          </div>
        )}
      </div>

      {/* Megállók listája */}
      {stops.map(stop => (
        <div
          key={stop.stopId}
          className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
        >
          {/* Megálló fejléc */}
          <button
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
            onClick={() => setExpandedStop(expandedStop === stop.stopId ? null : stop.stopId)}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-gray-900 dark:text-white">{stop.stopName}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>{stop.distanceMeters} m</span>
              <span>~{stop.walkingMinutes} {t('transport.bkk.walkMin')}</span>
            </div>
          </button>

          {/* Indulások */}
          <div className="px-4 divide-y divide-gray-100 dark:divide-gray-800">
            {(expandedStop === stop.stopId ? stop.departures : stop.departures.slice(0, 3))
              .map((dep, i) => (
                <DepartureRow key={`${dep.tripId}-${i}`} dep={dep} />
              ))
            }
          </div>
        </div>
      ))}

      {stops.length === 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
          {t('transport.bkk.noStopsNearby')}
        </p>
      )}
    </div>
  )
}
```

### 5.3 BubiStationCard — MOL Bubi kerékpár-megosztó widget

```typescript
// components/transport/BubiStationCard.tsx
'use client'

import { useEffect, useState } from 'react'
import { Bike, BatteryCharging, Navigation } from 'lucide-react'
import { useI18n } from '@/lib/i18n/useI18n'
import { getNearestBubiStations } from '@/app/actions/transport/bubi'
import type { BubiStation } from '@/app/actions/transport/bubi'

function AvailabilityBar({ available, total }: { available: number; total: number }) {
  const pct = total > 0 ? (available / total) * 100 : 0
  const color = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function BubiStationCard({ workspaceId }: { workspaceId: string }) {
  const { t } = useI18n()
  const [stations, setStations] = useState<BubiStation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getNearestBubiStations(workspaceId)
      .then(setStations)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))

    const interval = setInterval(() => {
      getNearestBubiStations(workspaceId)
        .then(setStations)
        .catch(console.error)
    }, 120_000) // 2 perces frissítés

    return () => clearInterval(interval)
  }, [workspaceId])

  if (loading) {
    return <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
  }

  if (error || stations.length === 0) {
    return (
      <div className="text-center py-8">
        <Bike className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {error || t('transport.bubi.noStations')}
        </p>
      </div>
    )
  }

  const nearest = stations[0]

  return (
    <div className="space-y-3">
      {/* Kiemelt legközelebbi állomás */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-xl p-4 border border-green-200 dark:border-green-800">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-green-700 dark:text-green-300 font-medium uppercase tracking-wide">
              {t('transport.bubi.nearestStation')}
            </p>
            <h3 className="font-semibold text-gray-900 dark:text-white mt-0.5">{nearest.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {nearest.distanceMeters} m — ~{nearest.walkingMinutes} {t('transport.bubi.walkMin')}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-bold ${
            nearest.freeBikes > 3 ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100' :
            nearest.freeBikes > 0 ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
            'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-100'
          }`}>
            {nearest.freeBikes} {t('transport.bubi.bikes')}
          </div>
        </div>

        {/* Telítettségi sáv */}
        <AvailabilityBar available={nearest.freeBikes} total={nearest.totalSlots} />

        <div className="flex items-center justify-between mt-3 text-xs text-gray-600 dark:text-gray-300">
          <span>{nearest.emptySlots} {t('transport.bubi.freeSlots')}</span>
          {nearest.ebikes > 0 && (
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <BatteryCharging className="w-3.5 h-3.5" />
              {nearest.ebikes} {t('transport.bubi.ebikes')}
            </span>
          )}
          <span>Összesen: {nearest.totalSlots}</span>
        </div>

        {/* Városközpontba kerékpározás */}
        <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800 flex items-center justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-300">
            {t('transport.bubi.centerTime')}
          </span>
          <span className="text-sm font-semibold text-green-700 dark:text-green-300">
            ~{nearest.cyclingMinutesToCenter} {t('transport.bubi.minutes')}
          </span>
        </div>
      </div>

      {/* Többi állomás listája */}
      {stations.slice(1).map(station => (
        <div
          key={station.id}
          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{station.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{station.distanceMeters} m</p>
          </div>
          <div className="text-right">
            <p className={`text-base font-bold ${station.freeBikes > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {station.freeBikes}
            </p>
            <p className="text-xs text-gray-500">{t('transport.bubi.bikes')}</p>
          </div>
        </div>
      ))}

      {/* Google Maps kerékpáros navigáció link */}
      <a
        href={`https://www.google.com/maps/dir/?api=1&origin=${nearest.latitude},${nearest.longitude}&travelmode=bicycling`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
      >
        <Navigation className="w-4 h-4" />
        {t('transport.bubi.openMaps')}
      </a>
    </div>
  )
}
```

### 5.4 TransportCO2Calculator — interaktív összehasonlító kalkulátor

```typescript
// components/transport/TransportCO2Calculator.tsx
'use client'

import { useState, useTransition } from 'react'
import { calculateTransportOptions } from '@/app/actions/transport/co2-calculator'
import { useI18n } from '@/lib/i18n/useI18n'
import { Car, Bus, Bike, Footprints, Zap } from 'lucide-react'
import type { TransportOption, CO2CalculatorResult } from '@/app/actions/transport/co2-calculator'

const MODE_ICONS = { car: Car, transit: Bus, cycling: Bike, walking: Footprints, escooter: Zap }
const MODE_COLORS = {
  car: 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950',
  transit: 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950',
  cycling: 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950',
  walking: 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950',
  escooter: 'border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-950',
}

interface TransportCO2CalculatorProps { workspaceId: string }

export function TransportCO2Calculator({ workspaceId }: TransportCO2CalculatorProps) {
  const { t } = useI18n()
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<CO2CalculatorResult | null>(null)
  const [destName, setDestName] = useState('')

  // Egyszerűsített példa helyszínek (épület koordinátái + célállomások)
  const PRESET_DESTINATIONS = [
    { label: 'Belváros (Deák tér)', lat: 47.4980, lon: 19.0489 },
    { label: 'Keleti pályaudvar', lat: 47.5004, lon: 19.0839 },
    { label: 'Mammut bevásárlóközpont', lat: 47.5072, lon: 19.0224 },
    { label: 'Városliget', lat: 47.5139, lon: 19.0864 },
  ]

  // Épület koordinátái — workspace_transport_config-ból jönnek
  // Demonstrációs céllal hardcode: Kelenföld állomás melletti paneltelep
  const BUILDING = { lat: 47.4694, lon: 19.0108 }

  const handleCalculate = (destLat: number, destLon: number, label: string) => {
    setDestName(label)
    startTransition(async () => {
      const res = await calculateTransportOptions(
        BUILDING.lat, BUILDING.lon, destLat, destLon
      )
      setResult(res)
    })
  }

  return (
    <div className="space-y-4">
      {/* Motiváló bevezető — szakdolgozati kontextus */}
      <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-3 border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          {t('transport.calculator.intro')}
        </p>
      </div>

      {/* Célállomás gyorsgombok */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('transport.calculator.selectDestination')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_DESTINATIONS.map(dest => (
            <button
              key={dest.label}
              onClick={() => handleCalculate(dest.lat, dest.lon, dest.label)}
              disabled={isPending}
              className="py-2 px-3 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all disabled:opacity-50"
            >
              {dest.label}
            </button>
          ))}
        </div>
      </div>

      {/* Eredmény megjelenítő */}
      {isPending && (
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      )}

      {result && !isPending && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('transport.calculator.to', { dest: destName })}
            </p>
            <p className="text-xs text-gray-500">{result.distanceKm} km</p>
          </div>

          {/* Módok összehasonlítása */}
          {result.options.map(opt => {
            const Icon = MODE_ICONS[opt.mode] || Car
            return (
              <div
                key={opt.mode}
                className={`p-3 rounded-xl border ${MODE_COLORS[opt.mode]}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {opt.nameHu}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">~{opt.timeMins} perc</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <p className="font-bold text-gray-900 dark:text-white">
                      {opt.co2Kg < 0.001 ? '0' : opt.co2Kg.toFixed(3)} kg
                    </p>
                    <p className="text-gray-500">CO₂</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-900 dark:text-white">
                      {opt.costHuf === 0 ? t('transport.calculator.free') : `${opt.costHuf} Ft`}
                    </p>
                    <p className="text-gray-500">{t('transport.calculator.cost')}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-900 dark:text-white">
                      {opt.caloriesBurned > 0 ? `${opt.caloriesBurned} kcal` : '—'}
                    </p>
                    <p className="text-gray-500">{t('transport.calculator.calories')}</p>
                  </div>
                </div>

                {opt.mode !== 'car' && opt.co2SavedVsCar > 0 && (
                  <div className="mt-2 pt-2 border-t border-current/20 flex items-center justify-between text-xs">
                    <span className="text-green-700 dark:text-green-300">
                      CO₂ megtakarítás: -{opt.co2SavedVsCar.toFixed(3)} kg
                    </span>
                    {opt.costSavedVsCar > 0 && (
                      <span className="text-green-700 dark:text-green-300">
                        -{opt.costSavedVsCar} Ft
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Havi összesítő */}
          {result.monthlyCarSavingHuf > 0 && (
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white">
              <p className="text-xs font-medium opacity-90 mb-1">
                {t('transport.calculator.monthlySavingTitle')}
              </p>
              <p className="text-lg font-bold">{result.monthlyCarSavingHuf.toLocaleString('hu-HU')} Ft</p>
              <p className="text-xs opacity-75 mt-0.5">
                {result.weeklyCarSavingCO2} kg CO₂ hetente, {result.calorieBonusPerYear.toLocaleString()} kcal évente
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

### 5.5 CyclingRouteAdvisor — kerékpáros útvonal légszennyezettség-tanácsadó

```typescript
// components/transport/CyclingRouteAdvisor.tsx
'use client'

import { useI18n } from '@/lib/i18n/useI18n'
import { Bike, Wind, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react'

interface RouteType {
  id: 'major' | 'side' | 'park'
  labelKey: string
  ufpReduction: number  // százalékos csökkentés a főúthoz képest (Antwerpeni kutatás alapján)
  colorClass: string
  descKey: string
  exampleHu: string
}

const ROUTE_TYPES: RouteType[] = [
  {
    id: 'major',
    labelKey: 'transport.cycling.majorRoad',
    ufpReduction: 0,
    colorClass: 'border-red-300 bg-red-50 dark:bg-red-950',
    descKey: 'transport.cycling.majorRoadDesc',
    exampleHu: 'Pl. Üllői út, Rákóczi út, Váci út'
  },
  {
    id: 'side',
    labelKey: 'transport.cycling.sideStreet',
    ufpReduction: 30,
    colorClass: 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950',
    descKey: 'transport.cycling.sideStreetDesc',
    exampleHu: 'Pl. párhuzamos mellékutcák, lakónegyedek'
  },
  {
    id: 'park',
    labelKey: 'transport.cycling.parkRoute',
    ufpReduction: 53,
    colorClass: 'border-green-300 bg-green-50 dark:bg-green-950',
    descKey: 'transport.cycling.parkRouteDesc',
    exampleHu: 'Pl. Városligeti fasor, Kerepesi temető kerülete, budai partszakasz'
  }
]

export function CyclingRouteAdvisor({ workspaceId }: { workspaceId: string }) {
  const { t } = useI18n()

  return (
    <div className="space-y-4">
      {/* Tudományos alap — Antwerpeni tanulmány */}
      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-1">
              {t('transport.cycling.scienceBadge')}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              {t('transport.cycling.antwerpStudy')}
            </p>
          </div>
        </div>
      </div>

      {/* Útvonaltípusok összehasonlítása */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('transport.cycling.routeComparison')}
        </p>
        {ROUTE_TYPES.map(route => (
          <div key={route.id} className={`p-3 rounded-xl border ${route.colorClass}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {t(route.labelKey)}
              </span>
              <div className="flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                <span className={`text-sm font-bold ${
                  route.ufpReduction === 0 ? 'text-red-600 dark:text-red-400' :
                  route.ufpReduction < 40 ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-green-600 dark:text-green-400'
                }`}>
                  {route.ufpReduction === 0 ? '⚠ Referencia' : `-${route.ufpReduction}% UFP`}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300">{route.exampleHu}</p>

            {/* UFP vizuális sáv */}
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${
                  route.ufpReduction === 0 ? 'bg-red-500 w-full' :
                  route.ufpReduction < 40 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${100 - route.ufpReduction}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Tér-hatékonyság — 60 ember összehasonlítás */}
      <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
        <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2">
          {t('transport.cycling.spaceEfficiency')}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-lg">🚗🚗🚗</span>
          <span className="text-gray-700 dark:text-gray-300 text-xs">60 autó = 60 utas</span>
        </div>
        <div className="flex items-center gap-2 text-sm mt-1">
          <span className="text-lg">🚌</span>
          <span className="text-gray-700 dark:text-gray-300 text-xs">1 busz = 60 utas</span>
        </div>
        <div className="flex items-center gap-2 text-sm mt-1">
          <span className="text-lg">🚲🚲🚲</span>
          <span className="text-gray-700 dark:text-gray-300 text-xs">~10 kerékpár = 60 m² helyett 3 m²</span>
        </div>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 italic">
          {t('transport.cycling.spaceEfficiencySource')}
        </p>
      </div>

      {/* Javaslatok */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('transport.cycling.tips')}
        </p>
        {[
          'transport.cycling.tip1',
          'transport.cycling.tip2',
          'transport.cycling.tip3',
          'transport.cycling.tip4',
        ].map(tipKey => (
          <div key={tipKey} className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 dark:text-gray-300">{t(tipKey)}</p>
          </div>
        ))}
      </div>

      {/* Külső linkek */}
      <div className="flex gap-2">
        <a
          href="https://budapest.hu/Lapok/2024/kerekparos-infra.aspx"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Budapest kerékpár térkép
        </a>
        <a
          href="https://www.google.com/maps/@47.498,19.040,13z/data=!5m1!1e3"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
        >
          <Bike className="w-3.5 h-3.5" />
          Google Maps kerékpáros
        </a>
      </div>
    </div>
  )
}
```

---

## 6. Lokalizáció — i18n kulcsok

### 6.1 src/i18n/resources/hu.ts kiegészítés

```typescript
// Hozzáadandó a hu.ts transport namespace-be:
transport: {
  panel: {
    title: 'Fenntartható Közlekedés',
    subtitle: 'BKK menetrendek, Bubi állomások és CO₂ kalkulátor',
  },
  tabs: {
    departures: 'Indulások',
    bubi: 'Bubi kerékpár',
    calculator: 'CO₂ kalkulátor',
    cycling: 'Kerékpáros útvonal',
    community: 'Közösségi trendek',
  },
  bkk: {
    realtimeOn: 'Valós idejű adatok',
    realtimeOff: 'Offline (utolsó ismert adat)',
    lastUpdate: 'Frissítve: {{time}}',
    walkMin: 'perc séta',
    noStopsNearby: 'Nincs BKK megálló 500 méteres közelségben.',
    errorFetch: 'A BKK adatok jelenleg nem elérhetők.',
  },
  bubi: {
    nearestStation: 'Legközelebbi Bubi állomás',
    walkMin: 'perc séta',
    minutes: 'perc',
    bikes: 'kerékpár',
    freeSlots: 'szabad dokk',
    ebikes: 'e-bike',
    centerTime: 'Belvárosba (Deák tér) kerékpárral:',
    noStations: 'Nincs MOL Bubi állomás 800 méteres körzetben.',
    openMaps: 'Kerékpáros navigáció (Google Maps)',
  },
  calculator: {
    intro: 'Szakdolgozati forrás: A kerékpározás és tömegközlekedés szén-dioxid kibocsátása töredéke az autóhasználaténak. Számold ki a te utazásod hatását!',
    selectDestination: 'Válassz célállomást:',
    to: 'Útvonal: épületedtől → {{dest}}',
    free: 'Ingyenes',
    cost: 'Becsült költség',
    calories: 'Kalória égetés',
    monthlySavingTitle: 'Ha minden hétköznap busszal utazol az autó helyett:',
  },
  cycling: {
    scienceBadge: 'Tudományos alap (Antwerpeni UFP-kutatás)',
    antwerpStudy: 'Kutatók kerékpárosok ultrafinom részecske (UFP) expozícióját mérték különböző útvonaltípusokon. Eredmény: parkos, zöld utakon 53%-kal kevesebb légszennyező éri a kerékpárost, mint főforgalmi utakon. A mellékutcák ~30%-kal jobbak a főutaknál.',
    routeComparison: 'Útvonaltípusok összehasonlítása — légszennyezési expozíció',
    majorRoad: 'Főforgalmi úton (legrosszabb)',
    sideStreet: 'Mellékutcákon (közepes)',
    parkRoute: 'Parkos/zöld folyosón (legjobb)',
    majorRoadDesc: 'Közvetlen, gyors, de maximális légszennyezési kitettség.',
    sideStreetDesc: 'Kicsit kerülőbb, de 30%-kal kevesebb UFP-expozíció.',
    parkRouteDesc: 'Leghosszabb útvonal, de 53%-kal tisztább levegő. Ajánlott!',
    spaceEfficiency: 'Térbeli hatékonyság — miért fontos a kerékpározás?',
    spaceEfficiencySource: 'Forrás: SZTE szakdolgozat, 2020. — „space efficiency" összehasonlítás',
    tips: 'Praktikus tanácsok Budapest kerékpáros forgalmában:',
    tip1: 'Válassz párhuzamos mellékutcát a főutakkal, ha csak 1-2 perccel hosszabb az út.',
    tip2: 'Reggeli csúcsforgalomban a parkos útvonalak légszennyezés szempontjából is jobbak.',
    tip3: 'Az Antwerpeni kutatás alapján: 53% kevesebb UFP a tüdődbe park mentén — ez hosszú távon jelentős egészségügyi előny.',
    tip4: 'Budapest 2030 terv kerékpáros infrastruktúrát fejleszt — keresd az új sávokat a budapest.hu oldalon.',
  },
  community: {
    title: 'Közösségi közlekedési trendek',
    subtitle: 'Anonim összesített adatok — csak opt-in felhasználók statisztikái',
    modalSplit: 'Módmegoszlás ebben a hónapban',
    bpAverage: 'Budapest átlag',
    co2Saved: 'CO₂ megtakarítás idén',
    gamification: 'Gamifikáció — épület rangsor',
    noData: 'Még nincs elég adat a statisztika megjelenítéséhez.',
    optIn: 'Kapcsolódj be az anonim statisztikába',
  },
},
```

### 6.2 src/i18n/resources/en.ts kiegészítés

```typescript
// Hozzáadandó az en.ts transport namespace-be:
transport: {
  panel: {
    title: 'Sustainable Transport',
    subtitle: 'BKK schedules, Bubi stations and CO₂ calculator',
  },
  tabs: {
    departures: 'Departures',
    bubi: 'Bubi Bikes',
    calculator: 'CO₂ Calculator',
    cycling: 'Cycling Routes',
    community: 'Community Trends',
  },
  bkk: {
    realtimeOn: 'Real-time data',
    realtimeOff: 'Offline (last known data)',
    lastUpdate: 'Updated: {{time}}',
    walkMin: 'min walk',
    noStopsNearby: 'No BKK stop within 500 metres.',
    errorFetch: 'BKK data is currently unavailable.',
  },
  bubi: {
    nearestStation: 'Nearest Bubi Station',
    walkMin: 'min walk',
    minutes: 'min',
    bikes: 'bikes',
    freeSlots: 'free docks',
    ebikes: 'e-bikes',
    centerTime: 'Cycling to city centre (Deák tér):',
    noStations: 'No MOL Bubi station within 800 metres.',
    openMaps: 'Cycling navigation (Google Maps)',
  },
  calculator: {
    intro: 'Thesis source: Cycling and transit emit a fraction of the CO₂ of car travel. Calculate the impact of your trip!',
    selectDestination: 'Select destination:',
    to: 'Route: your building → {{dest}}',
    free: 'Free',
    cost: 'Estimated cost',
    calories: 'Calories burned',
    monthlySavingTitle: 'If you take the bus every weekday instead of driving:',
  },
  cycling: {
    scienceBadge: 'Scientific basis (Antwerp UFP study)',
    antwerpStudy: 'Researchers measured cyclists' ultrafine particle (UFP) exposure on different route types. Result: on park/green routes cyclists inhale 53% fewer pollutants than on major roads. Side streets are ~30% better than main roads.',
    routeComparison: 'Route type comparison — pollution exposure',
    majorRoad: 'Major road (worst)',
    sideStreet: 'Side streets (moderate)',
    parkRoute: 'Park/green corridor (best)',
    majorRoadDesc: 'Direct and fast, but maximum pollution exposure.',
    sideStreetDesc: 'Slightly longer but 30% less UFP exposure.',
    parkRouteDesc: 'Longest route, but 53% cleaner air. Recommended!',
    spaceEfficiency: 'Space efficiency — why cycling matters',
    spaceEfficiencySource: 'Source: SZTE thesis, 2020 — "space efficiency" comparison',
    tips: 'Practical tips for cycling in Budapest:',
    tip1: 'Choose a parallel side street over a main road if it\'s only 1-2 minutes longer.',
    tip2: 'During morning rush hour, park routes are better both for traffic and air quality.',
    tip3: 'Based on the Antwerp study: 53% less UFP in your lungs via park routes — a significant long-term health benefit.',
    tip4: 'Budapest 2030 plan develops cycling infrastructure — check new lanes on budapest.hu.',
  },
  community: {
    title: 'Community Transport Trends',
    subtitle: 'Anonymous aggregated data — opt-in users only',
    modalSplit: 'Modal split this month',
    bpAverage: 'Budapest average',
    co2Saved: 'CO₂ saved this year',
    gamification: 'Gamification — building leaderboard',
    noData: 'Not enough data to show statistics yet.',
    optIn: 'Join the anonymous statistics',
  },
},
```

---

## 7. CommunityTransportStats komponens — épületszintű gamifikáció

```typescript
// components/transport/CommunityTransportStats.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/useI18n'
import { Trophy, Leaf, Users, TrendingUp } from 'lucide-react'

interface BuildingStats {
  totalTrips: number
  carPct: number
  transitPct: number
  cyclingPct: number
  walkingPct: number
  co2SavedKg: number
  gamificationPts: number
  badge: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum'
}

const BADGE_CONFIG = {
  none: { label: 'Nincs jelvény', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
  bronze: { label: '🥉 Bronz', color: 'text-amber-700', bg: 'bg-amber-100 dark:bg-amber-900' },
  silver: { label: '🥈 Ezüst', color: 'text-gray-600', bg: 'bg-gray-200 dark:bg-gray-700' },
  gold: { label: '🥇 Arany', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900' },
  platinum: { label: '💎 Platina', color: 'text-blue-700', bg: 'bg-blue-100 dark:bg-blue-900' },
}

// Budapest 2023 módmegoszlás (KSH/BKK adat)
const BP_MODAL_SPLIT = { car: 42, transit: 38, cycling: 8, walking: 12 }

export function CommunityTransportStats({ workspaceId }: { workspaceId: string }) {
  const { t } = useI18n()
  const supabase = createClient()
  const [stats, setStats] = useState<BuildingStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

    supabase
      .from('building_transport_stats')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('stat_month', monthStart)
      .single()
      .then(({ data }) => {
        if (data) {
          setStats({
            totalTrips: data.total_trips,
            carPct: data.car_pct,
            transitPct: data.transit_pct,
            cyclingPct: data.cycling_pct,
            walkingPct: data.walking_pct,
            co2SavedKg: data.co2_saved_kg,
            gamificationPts: data.gamification_pts,
            badge: 'bronze' // placeholder: rangsor API-ból jönne
          })
        }
      })
      .finally(() => setLoading(false))
  }, [workspaceId])

  if (loading) {
    return <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
  }

  if (!stats || stats.totalTrips < 10) {
    return (
      <div className="text-center py-10">
        <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('transport.community.noData')}</p>
        <button className="mt-4 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
          {t('transport.community.optIn')}
        </button>
      </div>
    )
  }

  const badge = BADGE_CONFIG[stats.badge]
  const modes = [
    { key: 'car', label: 'Autó', pct: stats.carPct, bpPct: BP_MODAL_SPLIT.car, color: 'bg-red-400' },
    { key: 'transit', label: 'Tömegközlekedés', pct: stats.transitPct, bpPct: BP_MODAL_SPLIT.transit, color: 'bg-blue-400' },
    { key: 'cycling', label: 'Kerékpár', pct: stats.cyclingPct, bpPct: BP_MODAL_SPLIT.cycling, color: 'bg-green-400' },
    { key: 'walking', label: 'Gyaloglás', pct: stats.walkingPct, bpPct: BP_MODAL_SPLIT.walking, color: 'bg-emerald-400' },
  ]

  return (
    <div className="space-y-4">
      {/* Jelvény és pontok */}
      <div className={`flex items-center justify-between p-3 rounded-xl ${badge.bg}`}>
        <div className="flex items-center gap-2">
          <Trophy className={`w-5 h-5 ${badge.color}`} />
          <span className={`text-sm font-semibold ${badge.color}`}>{badge.label}</span>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.gamificationPts}</p>
          <p className="text-xs text-gray-500">zöld pont</p>
        </div>
      </div>

      {/* CO₂ megtakarítás */}
      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-xl border border-green-200 dark:border-green-800">
        <Leaf className="w-8 h-8 text-green-500 flex-shrink-0" />
        <div>
          <p className="text-lg font-bold text-green-700 dark:text-green-300">
            {stats.co2SavedKg.toFixed(1)} kg CO₂
          </p>
          <p className="text-xs text-green-600 dark:text-green-400">megtakarítva az autóhoz képest idén</p>
        </div>
      </div>

      {/* Módmegoszlás összehasonlítás */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Módmegoszlás — épület vs. Budapest átlag
        </p>
        {modes.map(mode => (
          <div key={mode.key} className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
              <span>{mode.label}</span>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900 dark:text-white">{mode.pct.toFixed(0)}%</span>
                <span className="text-gray-400">(Bp: {mode.bpPct}%)</span>
              </div>
            </div>
            {/* Épület sáv */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-0.5">
              <div className={`${mode.color} h-2 rounded-full transition-all`} style={{ width: `${mode.pct}%` }} />
            </div>
            {/* Budapest sáv (ghost) */}
            <div className="w-full bg-transparent rounded-full h-1">
              <div className="bg-gray-400 dark:bg-gray-500 h-1 rounded-full opacity-40" style={{ width: `${mode.bpPct}%` }} />
            </div>
          </div>
        ))}
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
          <div className="flex items-center gap-1.5"><div className="w-3 h-2 bg-green-400 rounded-sm" /><span>Épületünk</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-1 bg-gray-400 rounded-sm opacity-60" /><span>Budapest átlag</span></div>
        </div>
      </div>
    </div>
  )
}
```

---

## 8. Gyorsítótárazási stratégia

### 8.1 Rétegzett cache felépítés

```
GTFS statikus adatok (megállók, járatok)
  └── Supabase tábla: gtfs_stops, gtfs_routes
  └── Frissítési ciklus: hetente egyszer (hétfő hajnali 3:00)
  └── Next.js: fetch({ next: { revalidate: 604800 } })
  └── Oka: A BKK menetrend ritkán változik; a statikus adatok stabilan megmaradnak

BKK valós idejű indulások (GTFS-RT)
  └── Route cache: fetch({ next: { revalidate: 30 } })
  └── Kliens oldal: useEffect + setInterval(30_000)
  └── Oka: 30 másodperces frissítés megfelelő pontosságot ad BKK-szabvány szerint

MOL Bubi állomás adatok
  └── Server Action cache: fetch({ next: { revalidate: 120 } })
  └── Kliens oldal: useEffect + setInterval(120_000)
  └── Oka: Bubi adatok 1-2 percenként változnak; gyorsabb frissítés szükségtelen

BKK zavar-riasztások
  └── Supabase tábla cache: bkk_alert_cache
  └── Edge Function frissítés: 15 percenként
  └── Oka: A zavar-riasztások ritkán frissülnek, a 15 perces cache elegendő

CO₂ kalkulátor emissziós faktorok
  └── Supabase tábla: transport_emission_factors
  └── Next.js unstable_cache: 24 óra
  └── Oka: Statikus referenciaadat, évente 1-2x változik
```

### 8.2 PostGIS RPC függvény — megállók keresése

```sql
-- Supabase RPC: közeli megállók lekérdezése
CREATE OR REPLACE FUNCTION get_nearby_stops(
  p_lat DOUBLE PRECISION,
  p_lon DOUBLE PRECISION,
  p_radius_m INTEGER DEFAULT 500,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  stop_id TEXT,
  stop_name TEXT,
  stop_lat DOUBLE PRECISION,
  stop_lon DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    s.stop_id,
    s.stop_name,
    s.stop_lat,
    s.stop_lon,
    ST_Distance(s.geom, ST_MakePoint(p_lon, p_lat)::geography) AS distance_meters
  FROM gtfs_stops s
  WHERE
    s.location_type = 0  -- csak fizikai megállók, nem állomás-szülők
    AND ST_DWithin(s.geom, ST_MakePoint(p_lon, p_lat)::geography, p_radius_m)
  ORDER BY distance_meters ASC
  LIMIT p_limit;
$$;
```

---

## 9. Kapcsolódó feature-ök integrációja

### 9.1 Feature 06 — CO₂-nyomkövetővel való integráció

A `TransportCO2Calculator` komponens az egyszeri kalkuláción túl képes valódi naplóbejegyzést is létrehozni, ha a felhasználó opt-in módon bekapcsolta a CO₂-nyomkövetést (Feature 06):

```typescript
// Ha a felhasználó választ egy közlekedési módot és visszaigazolja az utazást:
async function logTransportTrip(
  userId: string,
  workspaceId: string,
  mode: string,
  distanceKm: number,
  result: CO2CalculatorResult
) {
  const supabase = createClient()
  const option = result.options.find(o => o.mode === mode)
  if (!option) return

  await supabase.from('transport_co2_log').insert({
    user_id: userId,
    workspace_id: workspaceId,
    log_date: new Date().toISOString().split('T')[0],
    transport_mode: mode,
    distance_km: distanceKm,
    co2_kg: option.co2Kg,
    calories_burned: option.caloriesBurned,
    cost_huf: option.costHuf,
    trip_purpose: 'work'
  })

  // Épületszintű összesítő frissítése
  await supabase.rpc('update_building_transport_stats', {
    p_workspace_id: workspaceId,
    p_mode: mode,
    p_co2_saved_kg: option.co2SavedVsCar
  })
}
```

### 9.2 Feature 03 — Közelségi térképpel való integráció

Az épület GPS koordinátái már elérhetők a proximity map feature-ből (`workspace_transport_config.building_lat/lon`). A BKK megállók és Bubi állomások szintén megjeleníthetők a közelségi térképen külön rétegként — a megálló-markerekre kattintva felugrik a BKKDepartureBoard a kiválasztott megálló indulásaival.

### 9.3 Feature 05 — Push értesítések BKK zavar-riasztásokhoz

Ha egy BKK zavar érinti az épülethez rendelt vonalakat (`bkk_alert_cache`), az értesítési rendszer (Feature 05) push üzenetet küldhet az érintett lakóknak:
```
"🚌 BKK zavar: A 4-es villamos nem jár Blaha – Kálvin tér között. Érintett: 2024. máj. 18. Részletek →"
```

---

## 10. Sprint terv

### 10.1 Sprint 1 (1. hét) — Adatréteg és GTFS import

**Feladatok:**
- [ ] Supabase migrációk: `gtfs_stops`, `gtfs_routes`, `gtfs_calendar`, `gtfs_trips`, `gtfs_stop_times` táblák létrehozása PostGIS kiterjesztéssel
- [ ] `get_nearby_stops` RPC függvény létrehozása és tesztelése
- [ ] `transport_preferences`, `transport_co2_log`, `building_transport_stats`, `workspace_transport_config` táblák migrációja
- [ ] `transport_emission_factors` tábla feltöltése alapértékekkel
- [ ] Supabase Edge Function: `gtfs-import` — BKK GTFS ZIP letöltés és `gtfs_stops` + `gtfs_routes` importálása
- [ ] Cron job konfiguráció (`supabase/config.toml`)
- [ ] BKK API kulcs (developer.bkk.hu) igénylése + environment változóba helyezése

**Elfogadási kritérium:** `get_nearby_stops(47.470, 19.011, 500, 5)` visszaad legalább 3 valódi BKK megállót.

### 10.2 Sprint 2 (2. hét) — BKK és Bubi widget

**Feladatok:**
- [ ] `/api/transport/bkk-departures` route implementálása
- [ ] `getNearestBubiStations` Server Action implementálása
- [ ] `BKKDepartureBoard` komponens
- [ ] `BubiStationCard` komponens
- [ ] 30 másodperces auto-frissítés BKK-hoz, 2 perces Bubihoz
- [ ] Zavar-riasztás panel (BKK alerts API + `bkk_alert_cache`)
- [ ] i18n kulcsok: `hu.ts` és `en.ts` transport.bkk és transport.bubi namespacek
- [ ] Mobil-first layout tesztelés (375px viewport)

**Elfogadási kritérium:** A widget valós BKK adatokat jelenít meg, 30 mp-enként frissül, és zavar esetén megjelenik a riasztás.

### 10.3 Sprint 3 (3. hét) — CO₂ kalkulátor és kerékpáros tanácsadó

**Feladatok:**
- [ ] `calculateTransportOptions` Server Action implementálása
- [ ] `TransportCO2Calculator` komponens — preset célállomásokkal
- [ ] Feature 06 CO₂ log integráció: opcionális utazásnaplózás
- [ ] `CyclingRouteAdvisor` komponens — Antwerpeni UFP adatokkal
- [ ] Kerékpáros tér-hatékonyság szekció (60 ember vizualizáció)
- [ ] Google Maps kerékpáros irányítás linkek
- [ ] i18n kulcsok: transport.calculator és transport.cycling namespacek

**Elfogadási kritérium:** Kalkulátor 5 km-es utazásra korrekt CO₂, idő, költség értékeket ad vissza; a kerékpáros tanácsadó az Antwerpeni adatokat mutatja.

### 10.4 Sprint 4 (4. hét) — Gamifikáció, integráció és QA

**Feladatok:**
- [ ] `CommunityTransportStats` komponens
- [ ] `update_building_transport_stats` RPC függvény
- [ ] `TransportPanel` összerakása + tabnavigáció
- [ ] Feature 03 integráció: megállók + Bubi állomások a közelségi térképen
- [ ] Feature 05 integráció: BKK zavar push értesítés
- [ ] Teljes lokalizáció review (hu + en)
- [ ] Böngésző Back gomb tesztelés (`pushState` tabnavigációhoz — `?tab=departures` URL param)
- [ ] Accessibility: ARIA label-ek az összes interaktív elemre
- [ ] Performance: Lighthouse score >90 mobilon

**Elfogadási kritérium:** Minden tab működik, mobilon gördülékenyen scrollozható, Back gomb visszanavigál, minden szöveg lokalizált.

---

## 11. Tesztelési kritériumok

### 11.1 Funkcionális tesztek

| Teszt | Elvárt eredmény |
|-------|-----------------|
| BKK megálló keresés (500m) | Legalább 1 megálló visszaadása tipikus budapesti panel-épületnél |
| BKK RT indulás | A következő indulás percalapú visszaszámláló pontosan fut |
| BKK késési jelzés | +2 perc késés esetén a sor piros (+2') jelzést mutat |
| Bubi elérhetőség | Szabad kerékpár = 0 esetén a card piros jelzést mutat |
| CO₂ kalkulátor, 5 km autóval | ~0.850 kg CO₂ (170 g/km × 5 km) |
| CO₂ kalkulátor, 5 km busszal | ~0.205 kg CO₂ (41 g/km × 5 km) |
| CO₂ kalkulátor, 5 km kerékpárral | 0 kg CO₂, ~200 kcal kalória |
| Kerékpáros tanácsadó | Park útvonalon 53% UFP csökkentés jelenik meg |
| Auto-frissítés BKK | 30 mp-enként a hálózati kérés kiváltódik |
| GTFS import Edge Function | stops tábla legalább 5000 sort tartalmaz import után |

### 11.2 Felhasználói élmény tesztek

- [ ] Mobilon (375px) a tab navigáció vízszintesen görget, nem törik össze
- [ ] Sötét módban minden elem olvasható
- [ ] Skeleton loader jelenik meg adatlekérés közben
- [ ] Hiba állapot értelmes magyar szöveget mutat
- [ ] Back gomb a tab-ok között működik (URL-ben `?tab=departures` stb.)
- [ ] Képernyőolvasó (NVDA/VoiceOver) olvasni tudja az indulási időket

### 11.3 Teljesítmény tesztek

- [ ] BKK API válasz < 2 másodperc
- [ ] Bubi API válasz < 1 másodperc
- [ ] CO₂ kalkulátor Server Action < 500ms
- [ ] First Contentful Paint (FCP) < 1.5s mobilon
- [ ] GTFS import < 5 perc a teljes stops.txt feldolgozáshoz

---

## 12. Biztonsági megfontolások

- A BKK API kulcsot (`BKK_API_KEY`) KIZÁRÓLAG szerver oldalon kell tárolni és használni — soha nem szabad a kliens bundle-ba kerülnie
- A Bubi API nyilvánosan elérhető, de a kéréseket szerver-oldalon proxyzni kell (CORS + rate limit védelem)
- A `transport_co2_log` tábla RLS szabályai: a felhasználó csak a saját sorait láthatja (`user_id = auth.uid()`)
- A `building_transport_stats` tábla RLS szabályai: a workspace tagjai olvashatják, de csak szerver-oldali RPC írhat bele (a naplózás közvetlenül ne legyen elérhető kliensről)
- Az anonim közösségi statisztika: a lekérdezés soha nem ad vissza egyedi azonosítót, csak aggregált adatot — minimum 10 opt-in felhasználó szükséges a megjelenítéshez (privacy threshold)

---

## 13. A szakdolgozat és a feature kapcsolata — összefoglalás

Ez a feature közvetlenül lefordítja a szakdolgozat legfontosabb urbanisztikai és közlekedési meglátásait egy lakóközösségi digitális eszközzé:

| Szakdolgozat tartalom | Feature megvalósítás |
|-----------------------|----------------------|
| BKK GTFS ingyenes és nyílt | GTFS statikus import Supabase-be, heti frissítéssel |
| Tömegközlekedési hozzáférhetőség elemzés | 500 méteres körzetű megálló-kereső, sétaidő becslés |
| Telebusz (demand-responsive transit) | Jövőbeli bővítési pont: telebusz foglalási modul |
| Antwerpeni UFP kerékpáros kutatás | CyclingRouteAdvisor: 53% park, 30% mellékutca csökkentés |
| 60 ember tér-hatékonyság | Vizuális összehasonlítás a CyclingRouteAdvisor-ban |
| 17% magyarok kerékpároznak munkába | CO₂ kalkulátor motiváló üzenet, közösségi statisztika |
| Budapest 2030 kerékpár fejlesztés | Külső link Budapest kerékpár infrastruktúra térképhez |
| Szuburbanizáció és autófüggőség | Gamifikáció: épület kap pontokat ha csökkenti az autóhasználatot |
| Aktív mobilitás egészségügyi előnyei | CO₂ kalkulátor kalóriaszámítás, éves egészségügyi összesítő |

A panelházas lakóközösségek számára ez a feature elsőként teszi láthatóvá és mérhetővé a saját épületük fenntartható mobilitási lehetőségeit — egyszerű, mobilbarát formában, valós időben. A BKK GTFS ingyenessége és a MOL Bubi nyílt API-ja lehetővé teszi, hogy ez a komplex közlekedési információ infrastrukturális befektetés nélkül integrálható legyen a panellako.hu platformba.
