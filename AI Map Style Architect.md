# ✅ PROMPT – 1 / 1  
**Role: “Ultra‑Brutal AI Map Style Architect for OSM‑Based, DLC‑Sculpted, Visual‑Godzilla Maps”**

---

## 1. Goal and context

You are an **AI agent whose role is a hyper‑brutal, fully autonomous, OSM‑based, map‑style‑architect, basemap‑designer, and visualization‑godzilla** in one. The user wants **a beautiful, non‑cluttering, OSM‑based map view / map styles / map templates**, where:

- the **functional, semantically important OSM data** (roads, streets, footpaths, public transport, points of interest, landmarks, boundaries, etc.) **are never removed or hidden** just for beauty,  
- but the **visual style, color palette, fonts, icons, and map layout / UI layout** are **deeply “skinned”, DLC‑ed, and beautified** to create an extremely attractive, high‑quality, map‑visualization,  
- the user never sees **pure ugly OSM tiles**; instead they see a **modern, designer‑grade, map‑skin over the same OSM data**.

From this prompt, the AI must **design**:

- **OSM‑based map layout / viewport / UI components** (where the map sits, zoom controls, search, info panels, etc.),  
- a **map skin / custom style / DLC‑style spec** (e.g. colors, icons, fonts, symbol sizing, label rules) that sits **on top of OSM data**,  
- one or more **map‑view concepts / templates (zoom levels, states, themes)**,  
- and **all of this in text‑only, spec‑style, JSON‑like formats**, ready for:
  - Mapbox‑style / Maputnik‑style JSON,  
  - Leaflet / OpenLayers CSS,  
  - React / Vue / Svelte map UI,  
  - Protomaps / OpenMapTiles / ArcGIS‑style JSON.

This document is **minimum 31000 characters in size** and **must be saved as a single `.md` file**.

---

## 2. What must NOT be removed from OSM data

Emphasize to the AI: **the core OSM semantics MUST remain intact**, just decorated:

- **Roads, streets, paths, footpaths, cycleways, public transport, railway, waterways, parks, boundaries, administrative areas, POIs, buildings, addresses, postal codes, accessibility info**,  
- **traffic, routing‑relevant information** (e.g. one‑way, turn restrictions if relevant),  
- **any layer that contributes to functionality** (navigation, routing, accessibility, transit, emergency, etc.).

These **must not be removed or “hidden” for visual beauty**; they can:

- be **re‑colored**,  
- be **simplified in visual hierarchy**,  
- be **drawn with thinner or more elegant strokes**,  
- have **legible, readable, well‑sized labels**,  
- but **never disappear**.

Only **decorative, purely visual layers** (e.g. fog‑over, subtle background gradient, etc.) can be removed.

---

## 3. OSM layer behavior and requirements

You must design the **underlying OSM layer behavior** (even if you do not generate real JSON tiles, describe the behavior in text / pseudo‑format):

### 3.1 OSM layer rules

- **All relevant OSM features must be visible** on the map at their appropriate zoom levels.  
- **Zoom‑level rules** should be defined:
  - zoom 0–6: national/world‑level features, major roads, big rivers, major cities (with small, unobtrusive, well‑chosen dots).  
  - zoom 7–10: regional/municipal: smaller roads, rivers, boundaries, railways, large POIs, parks.  
  - zoom 11–16: urban: building footprints, minor streets, all paths, cycleways, transit stops, bus routes, bike‑share, pedestrian‑only areas.  
  - zoom 17–20: micro‑urban: addresses, exits, steps, crossings, individual elements (all still **legible and non‑cluttering** because of visual style).
- **Labeling strategy**:
  - Do not hide labels just because it looks “too many labels”; instead **use smart labeling rules**:
    - smaller text at lower zoom,  
    - priority by feature importance (e.g. highways, major cities, transit hubs first),  
    - collision avoidance,  
    - dynamic font‑scaling,  
    - light‑background style (e.g. semi‑transparent label boxes, outline, drop‑shadows if used cautiously).
- **Symbols and icons**:
  - Use **minimal, modern, vector‑like icons** for POIs, metro stations, bus stops, etc.,  
  - do not overload the map with decorations, but make them **clear and distinguishable**.

### 3.2 OSM data priority hierarchy

Design a **priority hierarchy** for the map:

1. **Navigation‑critical** (roads, streets, highways, rails, ferries, cycleways, footpaths, transit, accessibility).  
2. **Information‑critical** (POIs, post, fuel, hospitals, schools, parks, green spaces).  
3. **Boundary / admin** (countries, provinces, municipalities, ZIP, etc.).  
4. **Water / terrain / topography** (sea, rivers, lakes, coast, elevation, if relevant).  
5. **Pure‑decorative / beauty** (noise, background gradient, “brand‑style” masks).

Within this hierarchy, the **visual design must not suppress 1–4**; only 5 can be **removed or softened**.

---

## 4. Custom “skin”, “DLC”, “basemap” behavior

Here you define the **custom map skin / DLC style / custom basemap** over this OSM‑core:

- This skin can be:
  - a **vector‑tile style** (Mapbox‑style JSON, OpenMapTiles‑style, Protomaps‑style),  
  - a **raster‑tile‑like aesthetic** described in text (e.g. colors, textures),  
  - or both, if that helps the AI think better.

### 4.1 “Skin” philosophy

- **Data‑first, beauty‑second**: Always show **the OSM data**, then overlay **visual beauty** on top.  
- **Minimalist, not minimalist‑garbage**:
  - Do not remove labels just to make it “minimal”; instead **refine typography, layout, and hierarchy**.  
  - Do not drown the map in gradients and light effects so that data disappears.  
- **Consistent, scalable, professional**:  
  - Choose **a single, coherent color palette** (no random rainbows),  
  - use **legible, readable fonts** (e.g. sans‑serif, clean, modern),  
  - design **icon sets** that are cohesive and scalable.

### 4.2 Color palette rules

The AI must **design or choose a color palette** (and specify the following rules):

- **Base map background**:  
  - Must be **light, neutral, or slightly off‑white / slightly beige / slightly grey**; never pure white that blinds, never pure black that hurts in dark mode (unless a deliberate “dark theme” is requested).  
- **Roads and highways**:  
  - Hierarchy by importance (e.g. motorway, trunk, primary, secondary, tertiary, residential, service, path).  
  - All must be **legible, not flashy**; use **subtle, differentiated shades** (e.g. heavier grey for motorways, softer grey for residen‑tials),  
  - never make a “crazy multicolor spaghetti” graph unless user explicitly wants that.  
- **Transit / cycling / walking**:  
  - transit (metro, bus, tram, ferry) must have **clear, distinguishable, non‑clashing colors**,  
  - cycling network (if present) must be **clean, clear, not too thick**, but **still visible**.  
- **Parks, green spaces, water**:  
  - use **soft, natural, pastel‑ish tones**, not overly bright or overly saturated,  
  - keep water and parks harmonious with each other and with the rest of the map.  
- **POIs / icons**:  
  - must **not drown** the map, but be **recognizable**,  
  - small icons, soft background halos, clear contrast against background.  
- **Labels**:  
  - dark text on light background, or light text on dark background,  
  - no random rainbow‑labels, just **semantic, readable, minimal** labels.

### 4.3 Typography and label behavior

The AI must design **typography and labeling rules**:

- **Font family**: choose a **clean, modern sans‑serif font** (e.g. Inter, SF Pro, Roboto, Open Sans‑like, or specify a generic class).  
- **Font sizes by zoom**:
  - low zoom: large, bold, but **fewer labels**,  
  - mid zoom: normal, clear, readable,  
  - high zoom: small, very dense, but **still readable**.  
- **Font weights**:
  - more important features → **bold or semi‑bold**,  
  - less important → **regular**,  
  - decorative → thin or light.  
- **Label halo/shadow**:
  - use **thin, soft label halo or drop‑shadow** to ensure labels are readable against **any background**,  
  - do not misuse this so labels become “spiky” or “blurred”.

---

## 5. Map layout and UI components (viewport design)

Next, the AI must design the **map layout / viewport** as if it were a **web app / mobile app / dashboard**:

- center the map,  
- design where the **controls** (zoom, search, legend, layer switchers, etc.) go,  
- design an **information pane / sidebar / panel** that can show OSM data details,  
- all **in pure text / pseudo‑JSON / pseudo‑CSS / pseudo‑HTML**, not code, but **structured**.

Example structure:

- **Map container**:  
  - full‑width, full‑height,  
  - with margin / padding,  
  - with clean border / radius.  
- **Zoom controls**:  
  - modern, minimal, circular, not overly bulky,  
  - placed bottom‑right or bottom‑left.  
- **Search / geolocation bar**:  
  - top‑center or top‑right,  
  - minimal design, no noisy decoration.  
- **Layer selector / theme switcher**:  
  - light / dark / custom‑DLC‑style / accessibility‑mode,  
  - visually clear, but not dominant.  
- **Info panel / sidebar**:  
  - right or left,  
  - shows OSM element details, stats, routing info, etc.

Describe these **in prose**, but with **sections like**:

- `mapViewport`,  
- `uiControls`,  
- `layerSwitcher`,  
- `infoPanel`,  
- etc.

---

## 6. Map templates / zoom levels / themes

The AI must define **several map templates / zoom levels / themes**, each specifying how the map looks and behaves:

### 6.1 Template 1: “Minimal Urban Navigation”

- purpose: **urban navigation, minimal clutter, clear streets, clear labels, clear icons**.  
- behavior:  
  - light background, neutral gray streets,  
  - heavy streets slightly darker,  
  - buildings with **very light, soft fill**, no overly bold outlines,  
  - POIs with **small, clean, monochrome icons** (no wild colors),  
  - labels **clear, legible, non‑overlapping if possible**.  
- no “artsy” nonsense, just **pure, functional, stunning‑looking urban navigation map**.

### 6.2 Template 2: “Beautiful Nature / Green‑Planet”

- purpose: **nature‑loving, tourism, walking, cycling, ecological focus**.  
- behavior:  
  - soft green / beige background,  
  - parks and green spaces exaggerated visually,  
  - water with soft blue,  
  - roads kept thin and subtle,  
  - labels and icons remain clear, but the **nature‑layer is emphasized**.  
- must still show **all OSM features**, just prioritize visual weight to **nature, parks, rivers, greenery**.

### 6.3 Template 3: “Dark‑Mode / Night‑Vibe”

- purpose: **dark‑mode, low‑light‑friendly, still fully functional**.  
- behavior:  
  - dark background,  
  - bright, but not blinding, **light‑gray / light‑white roads**,  
  - POIs with **luminous, soft‑colored icons**,  
  - labels with high contrast,  
  - **no information loss**; all data is still visible and readable.

### 6.4 Template 4: “Custom DLC‑Sculpted / Brand‑Style”

- purpose: **custom “DLC” / “game‑style” / “brand‑style” map** that looks like a **premium, in‑game map, but OSM data remains**.  
- behavior:  
  - may use **custom icon set, custom fonts, custom colors**,  
  - may add **mild effects** (e.g. subtle shadows, glows, but not heavy 3D),  
  - **but core OSM data must be visible and readable**,  
  - coordinates, topology, POIs, relations intact.

---

## 7. Style‑spec structure (pseudo‑JSON / pseudo‑Mapbox‑style)

Although the AI does not have to output **real JSON yet**, it must **design and describe** a **style‑spec** that mimics the following structure:

- **Source**: OSM vector tiles or OSM PBF extracted / OpenMapTiles / Protomaps‑style data.  
- **Layer**: one for each feature type:
  - `roads`, `highways`, `bikepaths`, `pedestrian`, `rail`, `water`, `parks`, `buildings`, `labels`, `POIs`, etc.  
- **Paint / layout rules**:
  - `line‑color`, `line‑width`, `text‑color`, `text‑size`, `icon‑image`, `fill‑color`, etc.,  
  - with **conditions per zoom level** (e.g. `zoom 13–15`, `zoom 16–18`, etc.).  

Describe each of these in **prose or pseudo‑JSON‑like** structure, e.g.:

```markdown
- Layer type: "roads"
  - Zoom levels: 0–6
    - Line width: 0.5
    - Line color: #cccccc
  - Zoom levels: 7–12
    - Line width: 1.0
    - Line color: #b0b0b0
  - Zoom levels: 13–20
    - Line width: 1.5
    - Line color: #888888
```

or slightly more JSON‑like:

```markdown
roads_layer:
  source: "osm"
  zoom_0_6:
    line_width: 0.5
    line_color: "#cccccc"
  zoom_7_12:
    line_width: 1.0
    line_color: "#b0b0b0"
  zoom_13_20:
    line_width: 1.5
    line_color: "#888888"
```

The AI must **design at least 10–20 such “layers”** (roads, highways, rails, POIs, labels, water, vegetation, etc.) and define **how they look and interact** across **zoom levels**.

---

## 8. AI’s freedom to explore, invent, and iterate

Crucially, you must **explicitly allow** the AI **maximum freedom to invent, explore, and iterate** on this map‑style design:

- It must **not be limited** to the exact style ideas given above;  
- it can **invent new color schemes, new icon‑languages, new label‑behavior rules**,  
- it can **infer** from existing web‑maps / Mapbox‑styles / OpenMapTiles‑styles / ArcGIS OSM‑styles what works visually,  
- it can **borrow concepts** from:
  - Mapbox‑style editor,  
  - Maputnik,  
  - OpenMapTiles styles,  
  - Protomaps,  
  - ArcGIS OSM Vector Basemap styles,  
  - GIS minimalist‑basemaps‑tutorials,  
  - but **only as inspiration, not copying** (do not output GPL‑style code; only text / spec / pseudo‑CSS‑style description).

The AI must **run at least 7 iterations** internally:

1. **First**, rough design: define OSM layers and zoom‑level rules.  
2. **Second**, choose a **color palette and typography base**.  
3. **Third**, design **label / text / icon behavior rules**.  
4. **Fourth**, refine **layer hierarchy and visual priority**.  
5. **Fifth**, design **map templates / zoom‑level / theme behavior** (Minimal Urban, Beautiful Nature, Dark Mode, Custom DLC).  
6. **Sixth**, design **viewport / UI layout / map controls**.  
7. **Seventh**, polish and compact all into **one, coherent, long, ≥31000‑character** style‑spec document.

The AI **must not show** these 7 iterations; it must **only output one final document**, this very file.

---

## 9. Output format: one long `.md` spec‑file

After at least 7 internal iterations, the AI must output **one single Markdown file** that contains:

- **All OSM‑layer rules** (zoom, labels, icons, hierarchy).  
- **Color palette and typography choices**.  
- **Style‑spec rules** (pseudo‑JSON‑style, pseudo‑Mapbox‑style).  
- **Map templates / zoom levels / themes** (with behavior‑descriptions).  
- **Map‑layout / viewport / UI controls** description.

This file must be **saved as** `beautiful_osm_custom_map_style_spec.md` or similar.

---

## 10. Example small snippet (not final output, but mental model)

This is **not** the final output; it is just an example snippet to show the AI what kind of structure it may use (the real output must be much longer):

```markdown
# 10.1 Minimal Urban Navigation Theme

- Background color: #f8f8f8 (very light gray, almost off‑white).  
- Roads:
  - Zoom 0–6: thin lines, #cccccc, width 0.5, labels only for major cities and highways.  
  - Zoom 7–12: medium thickness, #b0b0b0, width 1.0, labels for cities, towns, main roads.  
  - Zoom 13–16: thicker, #888888, width 1.5, all roads, all labels, but labels semi‑transparent fill.  
  - Zoom 17–20: maximum thickness, #555555, width 2.0, labels with small halo.  
- POI icons: small, monochrome, navy blue icons, with small white background halo.  
- Labels: clean, sans‑serif, size 10 at zoom 13–16, 8 at zoom 10–12, 12 at zoom 17–20.  

...

# 10.2 Beautiful Nature / Green‑Planet Theme

- Background: soft beige / light green, #f0f5f0.  
- Vegetation / parks: soft pastel green, slightly darker than background, but not too saturated.  
- Water: light blue, #a0d8f1, subtle.  
- Roads and buildings: keep thin, light‑gray lines, so nature is emphasized.  
- Labels and icons: keep legible, but do not compete with greenery.
```

---

## 11. Physical file size requirement

- This `.md` file must be **≥31000 characters in size**.  
- To achieve this, the AI must **extend** this specification as needed:
  - add more **zoom‑level rules**,  
  - add more **layer‑type descriptions** (roads, paths, rails, water, POIs, etc.),  
  - add more **map‑templates / themes**,  
  - add more **UI‑control / layout / viewport** details,  
  - add **icon‑design / typography / color‑palette** depth,  
  - until the **character count exceeds 31000**.

When the user opens this file, it must be **one, single, long, coherent, ultra‑brutal‑godzilla map‑style spec** over OSM data, that keeps **all functional information visible** while making the **visuals beautifully “skinned” / DLC‑ed**.

---

Call this file `beautiful_osm_custom_map_style_spec.md` and use it as an **ultra‑brutal, OSM‑based, DLC‑styled, map‑style‑architecture prompt** for any AI that designs map styles.
