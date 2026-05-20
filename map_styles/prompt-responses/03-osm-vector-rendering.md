# 1. Bevezetés: OSM vektortérkép rétegek

Az OpenStreetMap adatai vektortile formátumban (PBF/MVT) érhetők el a MapLibre GL / Mapbox GL rendererekhez. Az OpenMapTiles séma (az iparági standard) a következő fő `source-layer` névtereket definiálja — ezek mindegyike OSM adatból van lefordítva:

- `transportation` — utak, vasutak, légi/vízi útvonalak
- `building` — épületek, épületrészek
- `water`, `waterway` — tavak, folyók, csatornák
- `landuse`, `landcover` — területhasználat (park, erdő, ipar, mezőgazdaság)
- `poi` — pontszerű érdeklődési helyek (POI)
- `boundary` — adminisztratív határok
- `place` — helységek, kerületek, városrészek
- `transportation_name` — útcímkék
- `aeroway` — repülőtéri infrastruktúra
- `mountain_peak` — hegycsúcsok
- `park` — természetvédelmi területek

---

# 2. Alap OSM-rétegek

## Hierarchia és szerepük a stílusban

Az OSM-rétegek vizuális prioritása a térkép adatminőségét tükrözi. A specifikáció (beautiful_osm_custom_map_style_spec.md) Tier 1–5 piramisban gondolkodik:

| Tier | Kategória | OSM source-layer | Soha nem tüntethető el |
|------|-----------|------------------|------------------------|
| 1 | Navigációs | transportation, transportation_name | ✓ |
| 2 | Információs | poi, place | z14+ felett ✓ |
| 3 | Határok | boundary | z3+ felett ✓ |
| 4 | Víz/terep | water, waterway, landuse | ✓ |
| 5 | Dekoratív | custom overlay rétegek | Törölhető |

## Réteg sorrendszabályok

```
background → landuse (park, erdő) → water → building →
transportation casing → transportation fill →
railway → poi → boundary → place labels → street labels
```

Minden egyedi vizuális réteg ebbe a stack-be illeszkedik — az adat-rétegek FÖLÉ, de a Tier 1 labelek ALÁ (különben a fontosabb feliratok eltűnnek az overlay alatt).

---

# 3. Egyedi vizuális rétegek típusai

## A) Heatmap réteg

### Mikor

- Pontszerű sűrűségadat (pl. légszennyezési állomások, balesethelyek, adásvételek száma).

### tile-schema alap

- Forrás: saját GeoJSON vagy Mapbox tileset (nem OSM).
- Propertyke: `weight` float (0–1) a heatmap intenzitáshoz.

### Style

```json
{
  "type": "heatmap",
  "source": "aqi-stations",
  "paint": {
    "heatmap-weight": ["get", "weight"],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 8, 16, 24],
    "heatmap-color": ["interpolate", ["linear"],
      ["heatmap-density"],
      0, "rgba(0,0,0,0)",
      0.3, "#4ade80",
      0.6, "#facc15",
      1.0, "#ef4444"
    ],
    "heatmap-opacity": 0.75
  }
}
```

### z-rend

- A heatmap réteg az `building` réteg FÖLÉ, de az `poi` réteg ALÁ kerül. Az OSM utak és feliratok láthatók maradnak.

## B) Choropleth réteg

### Mikor

- Területi statisztika (pl. kerületenkénti átlagár, levegőminőségi index zóna szerint).

### tile-schema alap

- Forrás: saját polygon GeoJSON vagy tileset (kerületek, irányítószám-területek).
- Property: `value` (szám, pl. ár, AQI, populáció/km²).

### Style

```json
{
  "type": "fill",
  "source": "districts",
  "paint": {
    "fill-color": ["interpolate", ["linear"], ["get", "value"],
      0,   "#dcfce7",
      50,  "#86efac",
      150, "#facc15",
      300, "#ef4444"
    ],
    "fill-opacity": 0.35
  }
}
```

### z-rend

- A choropleth polygon a `landuse` FÖLÉ, de a `transportation fill` ALÁ kerül. Az utak átlátszanak rajta.

## C) Highlight / selected feature réteg

### Mikor

- Felhasználó által kiválasztott elem kiemelése (épület, stop, POI).

### Megvalósítás

```json
{
  "id": "selected-building",
  "type": "fill-extrusion",
  "source": "osm",
  "source-layer": "building",
  "filter": ["==", ["get", "osm_id"], ["literal", 12345678]],
  "paint": {
    "fill-extrusion-color": "#6366f1",
    "fill-extrusion-height": 20,
    "fill-extrusion-opacity": 0.8
  }
}
```

Az `id` szűrőt futásidőben frissíted: `map.setFilter('selected-building', ['==', 'osm_id', selectedId])`.

### z-rend

- A `building` réteg fölé, de minden label alá.

## D) 3D extrude-based building layer

### Mikor

- Épületmagasság vizualizáció (`building:levels` vagy `height` OSM tag alapján).

### Stílus

```json
{
  "id": "3d-buildings",
  "type": "fill-extrusion",
  "source": "osm",
  "source-layer": "building",
  "minzoom": 15,
  "paint": {
    "fill-extrusion-color": "#e2dfd9",
    "fill-extrusion-height": ["coalesce",
      ["get", "render_height"],
      ["*", ["get", "building:levels"], 3.5],
      10
    ],
    "fill-extrusion-base": 0,
    "fill-extrusion-opacity": 0.9
  }
}
```

### z-rend

- A 2D `building` fill réteg helyett (vagy mellette), de mindig POI és label rétegek alatt.

---

# 4. Zoom-szint-vezérelt viselkedés

## z0–z10: csak OSM alap, semmilyen overlay

```json
"minzoom": 11
```

A heatmap/choropleth/extrude rétegekre `"minzoom": 11` (esetleg 12) beállítandó. z10 alatt a sűrűség értelmezhetetlen, a choropleth területi egységek túl kicsik.

## z11–z14: gyenge, halványított overlay

```json
"fill-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0.0, 13, 0.25, 14, 0.40]
```

A choropleth és heatmap z11-en opacity=0 (láthatatlan), z13-on 0.25, z14-en 0.40 — fokozatosan erősödik. Az OSM rétegek teljes opacitáson vannak.

## z15–z18: erősebb, de az OSM-adat mindig előbbre van

```json
"fill-opacity": 0.45
"heatmap-opacity": 0.70
```

A maximum overlay-opacity soha nem éri el 0.6-ot — a basemap adatai (utak, feliratok) mindig látszanak.

## z19–z20: micro-zoom, minimális overlay

```json
"fill-opacity": ["interpolate", ["linear"], ["zoom"], 19, 0.40, 20, 0.15]
```

Micro-zoomnál az overlay visszahúzódik — a felhasználónak már a valós utcai információkra van szüksége, nem a területi aggregátumra.

---

# 5. Vizuális elnyomás vs. adat-eltávolítás

## Mit NEM szabad eltávolítani

Ezek a rétegek a `beautiful_osm_custom_map_style_spec.md` szerint Tier 1–2:

- `transportation`: minden útklasszis (motorway → path)
- `transportation_name`: utcacímkék
- `railway`: tram, metro, heavy rail
- `poi`: kórház, gyógyszertár, iskola, tranzitmegálló
- `boundary`: admin_level 2–8
- `water`, `waterway`: tavak, folyók

**Nem: törlés. Igen: vizuális elnyomás.**

## Vizuális elnyomás technikái

### opacity csökkentés

```json
"line-opacity": 0.4   // halvány, de látható
"fill-opacity": 0.3
```

### Vonalvastagság csökkentés

```json
"line-width": ["interpolate", ["linear"], ["zoom"], 13, 0.5, 16, 1.5]
// Vékonyabb, de megmarad
```

### Szín telítettség csökkentés (desaturate)

Nincs natív MapLibre CSS filter, de a palettát desaturálva lehet beleírni a style.json-be. Pl. `#fbb03b` (telített motorway) → `#d9c9b0` (halványított motorway).

### Label-priority, nem törlés

```json
"symbol-sort-key": 1000   // Tier 1 feliratok = magas prioritás
"symbol-sort-key": 100    // Tier 2 feliratok = közepes prioritás
```

A collision detection a magasabb `symbol-sort-key`-t tartja meg. A Tier 1 feliratok mindig megmaradnak, a Tier 2 csak ha van hely.

---

# 6. Példa pseudostyle — 2-3 egyedi vizuális réteg

## Panellako környezeti térkép (zöldterület + légszennyezés)

```json
// 1. Alap OSM rétegek (kivonatolva)
{ "id": "parks",         "type": "fill", "source-layer": "landuse",
  "filter": ["==","class","park"],
  "paint": { "fill-color": "#c8e6c9", "fill-opacity": 0.7 } },

{ "id": "water",         "type": "fill", "source-layer": "water",
  "paint": { "fill-color": "#a0d8f1" } },

{ "id": "roads-primary", "type": "line", "source-layer": "transportation",
  "filter": ["==","class","primary"],
  "paint": { "line-color": "#ffffff",
             "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 18, 7] } },

// 2. Choropleth: kerületi zöldterület-arány
{ "id": "district-green-pct",
  "type": "fill",
  "source": "districts-geojson",
  "minzoom": 11,
  "paint": {
    "fill-color": ["interpolate", ["linear"], ["get", "green_pct"],
      0, "#fff3e0", 10, "#a5d6a7", 30, "#2e7d32"],
    "fill-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0, 13, 0.35, 19, 0.15]
  }
},

// 3. Heatmap: levegőminőségi állomások
{ "id": "aqi-heatmap",
  "type": "heatmap",
  "source": "aqi-stations-geojson",
  "minzoom": 9,
  "paint": {
    "heatmap-weight": ["get", "aqi_weight"],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 9, 20, 15, 50],
    "heatmap-color": ["interpolate", ["linear"],
      ["heatmap-density"],
      0,   "rgba(0,0,0,0)",
      0.25,"#4ade80",
      0.5, "#facc15",
      0.8, "#f97316",
      1.0, "#ef4444"
    ],
    "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.6, 16, 0.3]
  }
},

// 4. Poi réteg — mindig felül (Tier 2, soha nem tüntethető el z14+)
{ "id": "poi-icons",
  "type": "symbol",
  "source-layer": "poi",
  "minzoom": 14,
  "layout": { "icon-image": "{class}_16", "text-field": ["get","name"],
              "text-size": 11, "text-anchor": "top", "text-offset": [0,1.2] },
  "paint": { "text-color": "#212121", "text-halo-color": "#f8f8f8", "text-halo-width": 1.5 }
}
```

**Réteg sorrendje a stackben:**

```
background → parks/forest → water → district-green-pct (choropleth) →
buildings → roads-casing → roads-fill → aqi-heatmap →
railways → poi-icons → street-labels → city-labels
```

Ez biztosítja, hogy a choropleth és heatmap soha nem fedje el az utcacímkéket és POI-ikonokat.
