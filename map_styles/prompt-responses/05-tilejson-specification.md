# 1. Bevezetés: TileJSON alapok

A **TileJSON** egy JSON-alapú metainformációs formátum, amely egy térkép-tileset tulajdonságait írja le — az adatforrástól függetlenül. A rendszerek (MapLibre, Leaflet, QGIS, GIS-eszközök) a TileJSON-t olvassák, és ebből tudják meg, hogy hol érhetők el a tile-ok, milyen zoom-tartomány van, mi a köz ponti koordináta, és milyen séma szerint épülnek fel a vektorrétegek.

**Spec hivatkozás:** `mapbox/tilejson-spec` (GitHub) — jelenleg 3.0.0 a legfrissebb verzió.

## Főbb mezők

| Mező | Kötelező? | Leírás |
|------|-----------|--------|
| `tilejson` | Igen | Spec verzió, pl. `"3.0.0"` |
| `tiles` | Igen | Tile URL template-ek tömbje (`{z}/{x}/{y}.pbf`) |
| `minzoom` | Igen | Minimális zoom (tipikusan 0) |
| `maxzoom` | Igen | Maximális zoom (OpenMapTiles: 14, raszter: 19) |
| `name` | Nem | Emberi olvasásra szánt tileset neve |
| `description` | Nem | Rövid leírás |
| `attribution` | Nem | Copyright szöveg (pl. "© OpenStreetMap contributors") |
| `bounds` | Nem | Bounding box `[minLon, minLat, maxLon, maxLat]` |
| `center` | Nem | Ajánlott kezdőnézet `[lon, lat, zoom]` |
| `format` | Nem | `"pbf"` (vektor), `"png"`, `"webp"`, `"jpg"` |
| `scheme` | Nem | `"xyz"` (alapértelmezett) vagy `"tms"` |
| `vector_layers` | Vektorhoz ajánlott | Réteg nevei, property leírások |
| `fillzoom` | Nem | Felső zoom-határ, amelyen a tile-ok még generálódnak (és felette zoom-in lesz a render) |

---

# 2. TileJSON automatikus generálása

## Kiindulópontok

### a) Meglévő tile-szerver URL-ból

Ha a tile-szerver kiszolgál egy `tiles.json` vagy `tilejson` endpointot (MapTiler, Geoapify, OpenMapTiles), a TileJSON már kész — csak a URL-t kell a `sources` szekciókba illeszteni:

```json
"sources": {
  "openmaptiles": {
    "type": "vector",
    "url": "https://api.maptiler.com/tiles/v3/tiles.json?key=YOUR_KEY"
  }
}
```

### b) PMTiles archívból

A Protomaps PMTiles fájlba beágyazott metaadat tartalmazza a TileJSON-ekvivalenst. A `pmtiles` JavaScript library `openHeader()` metódusa visszaadja ezt az adatot, amelyből TileJSON generálható.

### c) Saját tileset manuális definiálásával

Ha a tile-szerver nem ad `tiles.json`-t, saját TileJSON-t kell írni a tile URL-ek, zoom-tartomány, attribúció és (vektoros esetén) réteg-séma alapján.

---

# 3. Eszközök és keretrendszerek

## Spec referencia

- **`mapbox/tilejson-spec`** (GitHub): a kanonikus JSON Schema, validátor, changelog. Minden TileJSON-generator ezzel kompatibilis.

## Generátor eszközök

| Eszköz | Input | Output |
|--------|-------|--------|
| **Tilemaker** | OSM PBF + Lua config | PBF tiles + `tiles.json` |
| **tippecanoe** | GeoJSON | MBTiles + beágyazott TileJSON |
| **mbtiles-spec** | SQLite MBTiles | TileJSON a `metadata` táblából |
| **pmtiles CLI** | PMTiles archív | TileJSON metadata extrakció |
| **MapTiler Engine** | PostGIS, GeoJSON, Shapefile | TileJSON + hosted endpoint |
| **Geoapify** | Hosted OSM tileset | TileJSON REST API |

## Node.js könyvtárak

- `@mapbox/tilejson` — spec validáció és TileJSON objektum builder
- `mbtiles` (npm) — MBTiles file-ból TileJSON kiolvasás
- `pmtiles` (npm) — PMTiles header → TileJSON metaadat

## Python eszközök

- `mbutil` — MBTiles export, TileJSON kinyerés
- `rio-cogeo` — Cloud Optimized GeoTIFF → raszteres TileJSON

---

# 4. TileJSON template

Ez az alap template minden kötelező és ajánlott mezőt tartalmaz. A `{{ }}` jelölők paraméterezendőek:

```json
{
  "tilejson": "3.0.0",
  "name": "{{ Tileset neve, pl. 'Panellako Budapest OSM' }}",
  "description": "{{ Rövid leírás, pl. 'OpenMapTiles séma alapú vektortile, Budapest és környéke' }}",
  "attribution": "© <a href='https://openstreetmap.org/copyright'>OpenStreetMap contributors</a>",
  "tiles": [
    "{{ Tile URL 1, pl. 'https://cdn.panellako.hu/tiles/hungary/{z}/{x}/{y}.pbf' }}",
    "{{ Opcionális mirror URL 2 }}",
    "{{ Opcionális mirror URL 3 }}"
  ],
  "minzoom": {{ Minimum zoom, általában 0 }},
  "maxzoom": {{ Maximum zoom, vektornál 14, raszternél 19 }},
  "format": "{{ 'pbf' | 'png' | 'jpg' | 'webp' }}",
  "scheme": "xyz",
  "bounds": [
    {{ Bal-alsó Lon }},
    {{ Bal-alsó Lat }},
    {{ Jobb-felső Lon }},
    {{ Jobb-felső Lat }}
  ],
  "center": [
    {{ Közép Lon }},
    {{ Közép Lat }},
    {{ Ajánlott induló zoom }}
  ],
  "vector_layers": [
    {
      "id": "{{ source-layer neve, pl. 'transportation' }}",
      "description": "{{ Leírás }}",
      "minzoom": {{ réteg min zoom }},
      "maxzoom": {{ réteg max zoom }},
      "fields": {
        "{{ property neve }}": "{{ típus leírása, pl. 'String' | 'Number' }}"
      }
    }
  ]
}
```

### Budapest-specifikus default values

```json
"bounds": [18.8, 47.3, 19.4, 47.7],
"center": [19.04, 47.50, 12]
```

---

# 5. AI-prompt példaszöveg TileJSON-generációhoz

Amikor AI-t kérsz TileJSON generálásra, add meg a következő információkat:

```
Generálj érvényes TileJSON 3.0.0 specifikációjú JSON-t az alábbi paraméterek alapján:

- Tileset neve: "Panellako Budapest OSM vektor"
- Tile URL template: "https://cdn.panellako.hu/tiles/budapest/{z}/{x}/{y}.pbf"
- Tile séma: xyz
- Formátum: pbf (vector)
- Zoom range: minzoom=0, maxzoom=14
- Fedett terület: Budapest és 40 km-es körzetének bounding box-a
  (kb. lon 18.8–19.5, lat 47.3–47.7)
- Középpont: Budapest (lon 19.04, lat 47.50), induló zoom: 12
- Attribúció: "© OpenStreetMap contributors"
- Vector layers (OpenMapTiles séma):
  - transportation (roads, railways) — minzoom 4, maxzoom 14,
    fields: class (String), subclass (String), oneway (Number)
  - building — minzoom 13, maxzoom 14,
    fields: render_height (Number), building (String)
  - water — minzoom 4, maxzoom 14,
    fields: class (String), intermittent (Number)
  - poi — minzoom 14, maxzoom 14,
    fields: class (String), subclass (String), name (String)
  - place — minzoom 3, maxzoom 14,
    fields: class (String), name (String), population (Number)

Validáld a generált JSON-t a mapbox/tilejson-spec 3.0.0 JSON Schema ellen.
Jelezd, ha bármely mező opcionális vs. kötelező.
```

## Mit kap vissza

Egy kész, validált TileJSON objektumot, amelyet közvetlenül beilleszthetsz a style.json `sources` szekciójába — vagy önállóan kiszolgálhatod egy CDN-ről, hogy a MapLibre, QGIS és más kliensek automatikusan felismerjék.
