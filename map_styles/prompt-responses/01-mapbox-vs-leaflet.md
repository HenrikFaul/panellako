# 1. Általános bevezetés

A webes térképezés két domináns JavaScript-könyvtára a **Leaflet.js** (2010, Vladimir Agafonkin) és a **Mapbox GL JS** (2014, Mapbox → fork: MapLibre GL JS). Mindkettő OSM-adatokkal működik, de teljesen eltérő renderelési paradigmát követ — Leaflet DOM/Canvas-rasztert, Mapbox GL WebGL-vektort. A kettő közötti döntés a vizuális testreszabhatóság szempontjából nem pusztán preferencia-kérdés, hanem technológiai kapacitáskérdés.

---

# 2. Leaflet vizuális testreszabhatósága

## Alaparchitektúra

- **Renderelő:** DOM SVG + Canvas 2D (böngésző pixelrajzolás).
- **Tileformátum:** raszter PNG/JPEG/WebP (256×256 px). A stílus a tile-szerveren ("upstream") van beleégetve.
- **Saját adat:** GeoJSON rétegek CSS-sel, SVG-vel, Canvas-szel stílozva.

## Ami testreszabható

| Elem | Hogyan |
|------|--------|
| Basemap | `L.tileLayer(url)` — URL-csere, teljes küllemi ugrás |
| Vektoros adatréteg (GeoJSON) | `style: { color, weight, opacity, fillColor, fillOpacity, dashArray }` |
| Marker | `L.divIcon({ html })` — tetszőleges HTML/CSS/SVG |
| Popup | CSS `.leaflet-popup-content` override |
| Zoom controls | CSS `.leaflet-bar` override, saját HTML replace |
| Heatmap | leaflet.heat plugin: `radius, blur, maxZoom, gradient` |
| Cluster | Leaflet.markercluster: `iconCreateFunction` |

## Korlátok

- A basemap kinézete **nem módosítható kliens oldalon** — amit a tile-szerver ad, azt rendereli. Nincs rétegenkénti stílusvezérlés a basemap-en.
- **Nincs natív vektortile-motor.** A `leaflet-mapbox-gl-leaflet` plugin egy L.GridLayer burokban futtat MapLibre GL JS-t, de az teljes külön WebGL kontextus.
- 3D extrude, globe view, animált rétegek: nem natív. Külön plugin szükséges, teljesítmény esetleges.
- Nagy GeoJSON (>50 k feature): Canvas renderere lassul. Megoldás: spatial indexing + zoom-szintű szűrés JavaScript-ben.

## Mikor elegendő

- Statikus POI + útvonal megjelenítés
- Heatmap overlay raszteres alap fölé
- „Saját CSS / UI keretrendszerbe illeszkedő térkép" (Tailwind, CSS Modules)
- Lightweight bundle: ~40 kB gzip (Mapbox GL ~350 kB)

---

# 3. Mapbox GL JS vizuális testreszabhatósága

## Alaparchitektúra

- **Renderelő:** WebGL (GPU-gyorsított, shader pipeline).
- **Tileformátum:** Mapbox Vector Tile (MVT/PBF) — kliens oldalon renderelt.
- **Stílus:** JSON specifikáció (style.json), minden vizuális tulajdonság kliens oldalon definiált és animálható.

## Ami testreszabható

| Elem | Hogyan |
|------|--------|
| Rétegek | style.json `layers[]` — bármely OSM réteg kiszínezése, súlya, opacitása |
| Data-driven style | `["get", "property"]` expressziók — értékalapú szín/méret |
| Interpoláció | `["interpolate", ["linear"], ["zoom"], 0, val, 20, val]` — zoom-alapú animált átmenet |
| 3D extrude | `fill-extrusion-height`, `fill-extrusion-base` — épületmagasság, domborzat |
| Globe | `projection: 'globe'` — gömbös vetítés |
| Animáció | `map.setPaintProperty()` + requestAnimationFrame loop |
| Heatmap (natív) | `type: "heatmap"` réteg, `heatmap-weight/radius/color/intensity` |
| Cluster | `type: "circle"` + `clusterProperties` a source-on |
| Sprite/ikon | saját sprite sheet → `icon-image: "my_icon"` |
| Betűkészlet | saját glyph PBF szerver → `glyphs` URL |
| Átmenetek | `transition: { duration, delay }` minden paint propertyn |

## Plusz képességek

- **Sky layer:** 3D égbolt, felhők
- **Terrain:** 3D domborzat raszter DEM-ből
- **Fog:** GPU-alapú köd effekt távolabbi térképrészleteken
- **Custom shader layer:** `CustomLayerInterface` — saját WebGL shader közvetlenül a pipeline-ba illesztve
- **Marker/Popup animáció:** CSS transform GPU-gyorsítással

---

# 4. Összehasonlítás

| Szempont | Leaflet | Mapbox GL JS / MapLibre GL JS |
|----------|---------|-------------------------------|
| Renderelő | DOM + Canvas 2D | WebGL (GPU) |
| Basemap stílusozás | Nem (server-side baked) | Igen (JSON, kliens oldali) |
| Data-driven style | Korlátozottan (GeoJSON callback) | Teljesen (expression engine) |
| Heatmap (natív) | Plugin (leaflet.heat) | Igen, réteg típusként |
| Cluster | Plugin (markercluster) | Igen, source-szinten |
| 3D extrude | Nem / plugin | Igen, `fill-extrusion` |
| Globe view | Nem | Igen |
| Animáció | Korlátolt (CSS, limited) | Teljes (paint property tween) |
| Bundle méret | ~40 kB gzip | ~350 kB gzip |
| Tanulási görbe (stílus) | Alacsony (CSS) | Közepes (JSON spec) |
| SSR kompatibilitás | Könnyű (`dynamic` import) | Könnyebb, de szintén dynamic |
| Token szükséges | Nem | MapLibre: nem; Mapbox: igen |
| Custom shader | Nem | Igen |
| Offline / PMTiles | Plugin | Natív (protomaps-js) |

---

# 5. Példák

## Minimal city map (Panellako mini-térkép)

**Leaflet:** `L.tileLayer('https://carto.com/light_all/...')` + `L.circleMarker()` az épületre. Gyors, 40 kB bundle, Tailwind overlay-ek mellé simán illeszkedik. ✓ Egyszerű.

**Mapbox GL JS:** style.json betöltés + `addSource/addLayer` az épület kiemelésre. Több setup, de zoom-animáció és data-driven kiemelés natív. Indokolt, ha 20+ réteg van.

## Big-data heatmap dashboard

**Leaflet:** `leaflet.heat` plugin 10 k pont fölött lassul, nem GPU-gyorsított. A blur/radius fix, nem animálható. ✗ Nem ajánlott 50 k+ pontnál.

**Mapbox GL JS:** natív `type: "heatmap"` réteg GPU-n fut, 500 k pont fölött sem lassít. `heatmap-radius` zoom-alapú interpolációval dinamikus. ✓ Ajánlott.

## Cycling explorer (kerékpárút-rétegek)

**Leaflet:** GeoJSON polyline, szín/vastagság/dashArray per-feature. Filter chips: LayerGroup.addTo/removeFrom. ✓ Elég, és a Panellako implementációban ez fut.

**Mapbox GL JS:** `filter: ["==", "network", "rcn"]` rétegszintű szűrés, zoom-alapú vastagság interpoláció, glow effekt `line-blur`-rel. Szebb, de több work.

## Street-level navigation (z16–z20)

**Leaflet:** raszteres tile megadja az utcaneveket, épületeket — nem lehet módosítani. Ha saját POI kell felette, divIcon overlay. Korlátolt.

**Mapbox GL JS:** minden utcanév, épület-label, POI ikon szín/méret/priority teljes kontroll style.json-ból. `symbol-placement: line` utcaneveknek. ✓ Teljes kontroll.

---

# 6. Döntési útmutató

## Ha CSS/UI-keretrendszerbe illeszkedés a cél, nincs 3D/data-driven igény

→ **Leaflet**

1. Bundle: 40 kB vs 350 kB — kritikus mobilon
2. CSS-sel stílozható minden overlay (Tailwind, CSS Modules simán megy)
3. SSR + Next.js `dynamic({ ssr: false })` triviális
4. A basemap cserélhető URL-lel (CARTO, MapTiler, Stadia — mind raszteres)
5. Learning curve alacsony: `L.map`, `L.tileLayer`, `L.geoJSON` — 3 API
6. Ha nincs szükség rétegenkénti stíluskontrollra a basemap-en (csak adat overlay), Leaflet teljesen elegendő
7. Panellako jelenlegi use case: ezt futtatja, és tökéletesen kielégíti az igényt

## Ha a térkép maga a show-elem, animáció, data-driven, 3D, extrude

→ **MapLibre GL JS** (token nélküli open-source fork)

1. Minden OSM réteg stílusa JSON-ban vezérelhető (szín, súly, label, icon) — kliens oldali
2. Data-driven expressziók: `["get", "property"]` alapján szín/méret automatikus
3. `fill-extrusion`: 3D épületek épületmagasság adatból
4. Natív heatmap, cluster — nincs plugin overhead
5. Animált paint property: `map.setPaintProperty()` loop — sima 60 fps
6. Zoom-alapú interpoláció: minden property automatikusan tweened
7. `CustomLayerInterface`: saját GLSL shader a pipeline-ba
8. PMTiles: `protomaps-js` plugin, self-hosted vektor tileset
9. Sprite/glyph: saját ikonkészlet, saját betűtípus — teljes branding
10. DLC/Cyberpunk téma: bloom, neon glow, `line-blur`, scanline overlay custom layer-rel

**Összefoglaló:** Leaflet ott elegáns, ahol az adat az érték és a térkép csak eszköz. MapLibre GL JS ott szükséges, ahol a térkép maga kommunikál — vizuálisan gazdag, adatvezérelt, animált, 3D.
