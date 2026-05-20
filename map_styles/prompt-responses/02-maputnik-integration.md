# 1. Áttekintés

A **Maputnik** egy nyílt forráskódú, böngészőalapú vizuális stílusszerkesztő Mapbox GL / MapLibre GL stílusokhoz. A stílus eredménye egy `style.json` fájl, amelyet MapLibre GL JS vagy Mapbox GL JS közvetlenül fogyaszt. Ez a dokumentum leírja, hogyan exportálható és integrálható egy Maputnik-stílus webes alkalmazásba.

---

# 2. Maputnik stílus exportja

## A szerkesztőfelületen

1. Megnyitod a Maputnik-et (maputnik.github.io vagy self-hosted példány).
2. Betöltöd az alap stílust (pl. OSM Liberty, OSM Bright, saját draft) a `Open` gombbal.
3. Elvégzed a vizuális szerkesztéseket (rétegek, színek, betűk, ikonok).
4. Az `Export` menüben: **`Download Style (JSON)`** — ez egy validált Mapbox GL Style Spec v8 JSON fájl.

## Mit tartalmaz a style.json

```
{
  "version": 8,
  "name": "Saját stílus neve",
  "metadata": { ... },
  "sprite": "https://cdn.example.com/sprites/v1/sprite",
  "glyphs":  "https://cdn.example.com/glyphs/{fontstack}/{range}.pbf",
  "sources": {
    "openmaptiles": {
      "type": "vector",
      "url": "https://api.maptiler.com/tiles/v3/tiles.json?key=YOUR_KEY"
    }
  },
  "layers": [ ... ]
}
```

Kritikus mezők:

| Mező | Szerepe |
|------|---------|
| `sprite` | Az ikonkészlet URL-je (PNG + JSON index) |
| `glyphs` | A glyph/betűkészlet PBF szerver URL-je |
| `sources` | Adatforrások (vector tile URL, raszter URL, GeoJSON) |
| `layers` | Rendezett rétegek tömbje (típus, filter, paint, layout) |

## TileJSON forrás vs. direkt tiles URL

- **TileJSON URL:** `"url": "https://api.maptiler.com/tiles/v3/tiles.json?key=..."` — a szerver adja vissza a tiles URL-t, bounds-t, zoom range-t.
- **Direkt tiles:** `"tiles": ["https://a.tile.server/{z}/{x}/{y}.pbf"]` — statikus URL, nincs szerver roundtrip.
- Geoapify, MapTiler, OpenMapTiles mind TileJSON-t adnak; PMTiles saját protocol (`pmtiles://`).

---

# 3. Mapbox GL / MapLibre integráció

## Lépésről-lépésre

### 1. MapLibre GL JS telepítése

A package.json-ba: `maplibre-gl` (nem szükséges token, open-source).

### 2. Map inicializálás style.json URL-lel

A map objektum létrehozásakor a `style` paraméter értéke lehet:
- Abszolút URL: `"https://cdn.example.com/styles/minimal.json"`
- Relatív Next.js API route: `"/api/map-style/minimal"`
- Inline JS objektum: `{ version: 8, sources: {...}, layers: [...] }`

Példa algoritmikusan:

```
map = new MapLibreGL.Map({
  container: 'map-div-id',
  style: '/styles/panellako-minimal.json',
  center: [19.04, 47.50],
  zoom: 13,
  attributionControl: false,  // saját attribution komponens
})
```

### 3. Access token

- **MapLibre GL JS:** nincs szükség tokenre. Az adatforrás-URL maga hitelesíti.
- **Mapbox GL JS:** `mapboxgl.accessToken = 'pk.eyJ1...'` kötelező.
- Ha Geoapify tile-szerveret használsz: az API kulcs a source URL-ben van (`?apiKey=xxx`).
- Ha MapTiler-t: `?key=xxx` a tiles.json URL-ben.

### 4. Forrástranszformáció (source-transform)

Ha a tile-szerver CORS-fejlécet nem küld, vagy a tiles URL-t futásidőben kell módosítani (pl. auth header hozzáadása), a `transformRequest` callback segít:

```
transformRequest: (url, resourceType) => {
  if (resourceType === 'Tile' && url.startsWith('https://my.server')) {
    return { url, headers: { Authorization: 'Bearer ...' } }
  }
}
```

### 5. Lokalizáció

A `text-field` réteg-layoutban cserélhető: `["get", "name:hu"]` → magyar felirat, `["coalesce", ["get", "name:hu"], ["get", "name"]]` → magyar ha van, egyébként alapértelmezett.

---

# 4. Leaflet integráció (mapbox-gl-leaflet)

## Miért kell plugin?

Leaflet saját renderelője raszteres. A Mapbox GL stílus vektor tile-okat renderel WebGL-lel. A kettőt összekötni kell — ezt a `@mapbox/mapbox-gl-leaflet` (vagy `maplibre-gl-leaflet`) plugin csinálja.

## Hogyan működik

A plugin egy speciális `L.GridLayer` alosztályt hoz létre, amely:
1. A Leaflet tile-gridbe illeszkedő konténer div-eket generál.
2. Minden konténerbe egy MapLibre GL `Map` példányt hoz létre, a megfelelő tile-koordinátával.
3. A MapLibre GL instance rendeli a WebGL canvas-t, amelyen a vektoros stílus renderel.
4. A Leaflet kezeli a pan/zoom interakciókat, a MapLibre GL instance szinkronizálódik.

## Algoritmus

```
1. Leaflet map inicializálása hagyományosan (L.map())
2. L.mapboxGL plugin inicializálása:
   - style: '/styles/panellako-dark.json'
   - accessToken: '' (MapLibre esetén üres)
3. Plugin.addTo(map) — beilleszti a GridLayer-t
4. A Leaflet saját rétegei (GeoJSON, marker, circle) felette maradnak
   → ezek a normal DOM/SVG Leaflet rétegen vannak, a WebGL canvas alatt/felett
```

## Fontos megkülönböztetés

- A **MapLibre GL instance** (a plugin belsejében) felelős az OSM basemap rajzolásáért.
- A **Leaflet saját rétegei** (amit `addTo(map)`-pal adsz hozzá) a Leaflet canvas/SVG rétegen vannak.
- A kettő z-sorrendje: MapLibre GL canvas alul, Leaflet overlay rétegek felül.
- Interakció: a Leaflet event-eket (click, mousemove) kapja, ezeket szükség esetén továbbíthatod a MapLibre példánynak.

---

# 5. OSM-adatforrás-kompatibilitás

## Mikor melyik forrás

| Forrás | Típus | Használat |
|--------|-------|-----------|
| Geoapify | Vector tiles (PBF) + TileJSON | Egyszerű integráció, API kulcs szükséges |
| MapTiler | Vector tiles + TileJSON | Professzionális, hosted, API kulcs |
| OpenMapTiles önállóan | PBF vector tiles | Self-hosted, Docker, ingyenes |
| Protomaps PMTiles | Vector archive | Self-hosted, CDN, nincs tile-server |
| OpenStreetMap.org | Raszteres PNG | Leaflet alap, nem vektoros |
| Stadia Maps | Raszteres + vektor | Hosted, ingyenes kvóta |

## Az OpenMapTiles forrásséma és a style.json kapcsolata

A Maputnik OSM Liberty stílus `openmaptiles` source-t vár, amelynek schema definiálja a réteg neveket (`transportation`, `building`, `water`, `poi`, stb.) és a property-ket. Saját tile-szerver ugyanezt a sémát kell, hogy kövesse — különben a `filter`-ek és `source-layer` hivatkozások nem illeszkednek.

## A Leaflet nem keveri az OSM-adatot

A Leaflet NEM parse-olja a style.json `sources` szekciót. Leaflet + mapbox-gl-leaflet esetén a MapLibre GL instance csinálja az adatfetching-et és renderelést. A Leaflet saját tile layer-je (ha van) párhuzamos, független stack — két különböző basemap futna egyszerre. Ezért: vagy Leaflet raszteres tile (L.tileLayer), VAGY MapLibre GL vektor plugin, a kettő egyszerre redundáns és teljesítménypazarló.

---

# 6. Gyakori hibák és megoldások

## 1. CORS hiba tile-szerverre

- **Hiba:** `Access-Control-Allow-Origin` hiányzik a tile-válaszban.
- **Megoldás:** Cloudflare Workers proxy, vagy saját tile-server CORS fejléccel.

## 2. Sprite 404

- **Hiba:** Az ikonok nem jelennek meg, konzolban sprite betöltési hiba.
- **Megoldás:** A sprite URL-nek `sprite.json` + `sprite.png` + `sprite@2x.png` párból kell állnia; az URL-ben nincs `.json` kiterjesztés — a renderer appendi.

## 3. Glyph PBF hiánya

- **Hiba:** Feliratok nem jelennek meg, „missing glyph" üzenet.
- **Megoldás:** Önálló glyph-szerver (node-fontnik), MapTiler glyphs URL, vagy Stadia glyphs endpoint.

## 4. `text-field` kifejezés nem talál property-t

- **Hiba:** Feliratok üresek egyes feature-ökön.
- **Megoldás:** `["coalesce", ["get", "name:hu"], ["get", "name"], ""]` — fallback lánc.

## 5. MapLibre GL 350 kB bundle Next.js-ben

- **Megoldás:** `dynamic(() => import('maplibre-gl'), { ssr: false })` — SSR nem szükséges, kliens oldali betöltés.

## 6. Leaflet + mapbox-gl-leaflet kettős scroll

- **Hiba:** Scroll zoom kétszer reagál (Leaflet is, MapLibre is el is kapja).
- **Megoldás:** MapLibre instance-on `scrollZoom: false`, Leaflet kezeli az összes interakciót.
