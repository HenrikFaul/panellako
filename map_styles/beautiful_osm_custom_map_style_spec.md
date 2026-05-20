# Beautiful OSM Custom Map Style Specification
**Version:** v0.7.17 — 2026-05-20
**Owner:** Panellako map team
**Scope:** A single, authoritative styling contract for every OSM-driven map surface in the product (dashboard mini-maps, environment page, Budapest transit analyzer, cycling explorer, building viewer, future DLC-sculpted brand maps).
**Audience:** map engineers, designers, QA, and any future agent generating map tiles, sprites, glyphs, or style JSON.
**Doctrine:** Data-first, beauty-second. Then beauty so loud it screams — but never on top of the data.

---

## 0. Table of contents

1. Introduction & philosophy
2. OSM layer hierarchy (priority pyramid)
3. Zoom-level rules (z0–z20)
4. Color palettes & the four canonical themes
5. Typography system
6. Icon design system
7. Layer-by-layer style spec (20+ pseudo-JSON blocks)
8. Map viewport & UI components
9. Accessibility (WCAG 2.1 AA)
10. Performance & technical considerations
11. Implementation guide
12. Example style-JSON snippet

---

## 1. Introduction & philosophy

### 1.1 The data-first, beauty-second doctrine

A map is not a poster. A map is a **load-bearing UI surface** whose primary job is to answer questions like *"how do I get there"*, *"what is around me"*, *"can I cycle to that station"*, *"is there a tram inside 420 m"*. Aesthetics are the second-order concern, not the first. The map is allowed — and required — to be beautiful, but **only after every navigation-critical and information-critical OSM feature is legible at the relevant zoom**.

Concretely this means the styling spec is a contract that any AI agent, any designer, any future contributor must respect:

- **You MUST keep** all OSM-semantically important features visible at the zoom level where the user would expect them. Roads, transit, ferries, cycleways, footpaths, hospitals, schools, fuel stations, pharmacies, transit stops, water features, parks, admin boundaries — these are non-negotiable.
- **You MAY adjust** color, line width, font, halo, opacity ramps, dash arrays, line caps/joins, label density, halo width, icon scale, sprite size, and z-ordering.
- **You MAY add** decorative layers (noise overlays, gradient masks, brand glow, ambient particles) — but only as overlays underneath the data layers in z-order, or above with strict opacity ceilings (≤ 0.15).
- **You MUST NOT remove** a road class, transit line, or POI category purely for visual minimalism. If a layer is too noisy, the answer is *style it differently* (thinner, lighter, halo, label-collision priority), not *delete it*.
- **You MUST NOT** let any decorative effect (neon glow, drop shadow, blur, parallax) lower the contrast ratio of label text below WCAG AA at any zoom.

### 1.2 Why this matters for Panellako

Panellako maps are not generic. They are decision-support surfaces for real-estate and urban-environment questions: a user looks at a flat in Budapest and needs to instantly read tram lines, walkable distances to schools and pharmacies, the green-space buffer, the cycling network class, and the air-quality reference station. **Hiding any of these for the sake of "minimalism" actively damages product value.**

The four canonical themes below all pass the same data-completeness test. They differ in *how* they show the data — palette, weight, glow, typography, icon style — never in *whether*.

### 1.3 What this document is not

- It is not a style JSON dump. It is a spec the JSON must satisfy.
- It is not a tile-server choice. It is renderer-agnostic and survives a swap from MapLibre to Mapbox GL to Protomaps.
- It is not a brand guideline. The brand guideline lives elsewhere and feeds **only** the DLC-Brand theme.

---

## 2. OSM layer hierarchy (the priority pyramid)

When two layers fight for a pixel, this hierarchy decides who wins. Higher tier wins z-order, label collision, and halo budget.

### Tier 1 — Navigation-critical (NEVER hide, NEVER fade below 0.85 opacity at relevant zooms)

- Roads: motorway, trunk, primary, secondary, tertiary, residential, service, living-street, pedestrian, track, path
- Streets and named alleys
- Railways: heavy rail, light rail, subway/metro, tram, monorail, funicular
- Ferries
- Cycleways (separate from roads, including lcn/rcn/ncn/icn route relations)
- Footpaths, stairs, crossings (zebra, traffic-light, raised)
- Transit infrastructure: stops, stations, platforms, entrances/exits

### Tier 2 — Information-critical (NEVER hide at z14+; may collapse to dots at z11–13)

- POIs by category: hospital, clinic, pharmacy, doctor, dentist, veterinary, school, kindergarten, university, library, museum, theatre, cinema, post office, ATM, bank, fuel, EV-charging, parking, bicycle parking, bike-sharing, supermarket, convenience, restaurant, cafe, bar, hotel, place-of-worship, police, fire-station, town-hall, embassy

### Tier 3 — Boundary & administrative (visible from z3 progressively)

- Country borders (admin_level=2)
- Region/province borders (admin_level=4)
- County/megye (admin_level=6)
- Municipality/kerület (admin_level=8)
- Postal zones (boundary=postal_code) — optional overlay
- Statistical/census zones — optional overlay

### Tier 4 — Water & terrain (always visible, but never above Tier 1 labels)

- Oceans, seas
- Lakes, reservoirs, ponds
- Rivers (linestring + polygon), streams, canals
- Wetlands, marshes
- Coastlines
- Contour lines (10 m / 50 m / 100 m sets)
- Hillshade raster underlay
- Glaciers, beaches

### Tier 5 — Pure-decorative (the ONLY tier you may remove or fade aggressively)

- Brand watermarks
- Noise/grain overlays
- Gradient sky-bleeds at the canvas edge
- Vignette masks
- DLC glow halos, neon scanlines, parallax particles

**Rule:** if you find yourself wanting to hide something to "clean up the map", confirm it is Tier 5. If it is Tier 1–4, restyle, do not remove.

---

## 3. Zoom-level rules (z0 through z20)

The map is rendered at integer and fractional zoom levels from 0 (whole earth) to 20 (single building, sub-meter). The styling contract is expressed as five zoom bands, each with hard rules on visibility, weight, label density, and icon scale.

### 3.1 Band A — z0 to z6 (planet to country)

- **Visible:** continents, oceans, country borders, major rivers (Danube, Rhine, Nile, Amazon class), capital cities, top-tier admin labels.
- **Hidden:** roads except motorways at z5–6 as 1.0 px hairlines, all POIs, all buildings, all minor water.
- **Labels:** only country names at z3–4, capitals at z5–6, max 1 label per 60 × 60 px region.
- **Background:** flat fill, no hillshade, no contour.
- **Performance budget:** ≤ 60 features per tile.

### 3.2 Band B — z7 to z10 (region to metropolitan area)

- **Visible:** motorways, trunk roads, primary roads, heavy rail, regional admin (province/county), large lakes, large parks (>5 km²), major cities, towns >20 k population.
- **Newly added at z9:** secondary roads as thin lines, regional transit corridors as colored ribbons, ferry routes as dashed lines.
- **Labels:** city names with population-weighted text-size (population 100 k+ at z7, 20 k+ at z9, 5 k+ at z10), road shields appear at z10 for motorways only.
- **Icons:** none yet; cities are circle markers scaled 2–6 px.
- **Hillshade:** subtle, opacity 0.15, only at z9+.

### 3.3 Band C — z11 to z13 (city overview)

- **Visible:** all road classes down to residential, full transit network (metro / S-bahn / tram / bus / ferry), municipal admin boundaries, neighborhood polygons, all parks and forests, hospitals and universities as labeled icons.
- **Newly added at z12:** named neighborhoods (suburb / quarter / city_district), bridges as styled segments with cap-round, named bays and peninsulas.
- **Labels:** street names start at z13 for primary/secondary, neighborhood names z11+, transit station names z12+.
- **Icons:** Tier-2 POIs as 12 px monochrome markers, max density 1 icon per 24 × 24 px collision box.
- **Buildings:** OFF at z11–12, faint footprint fills at z13 (opacity 0.25, no outlines).

### 3.4 Band D — z14 to z16 (neighborhood detail)

- **Visible:** every street with name, every transit stop with name and route ref, every Tier-2 POI with icon and label, full cycleway network with color-coded route classes, footpaths, stairs, pedestrian areas, bike parking, EV chargers, bus shelters, kiosks, postboxes, vending machines.
- **Newly added at z15:** building footprints with outlines (1 px), house numbers at z16, street-level POIs (cafes, restaurants, bars at z16 only — too noisy earlier), turn-restriction arrows, oneway arrows on roads.
- **Labels:** full street names along the line geometry (`text-field: {name}` with line-placement), route shields with `{ref}` for primaries and motorways, transit stops with route badge + name two-line layout at z16.
- **Icons:** 16 px at z14, 20 px at z16. Halo 1.5 px matching background. Color-coded by category in the Minimal Urban theme; monochrome navy in default fallback.

### 3.5 Band E — z17 to z20 (micro-urban / individual elements)

- **Visible:** every footway, stair, crossing, lamp, bench, tree (when individually mapped), fountain, sculpture, recycling container, fire hydrant, manhole (when tagged), traffic light, post box, parking lot subdivisions, indoor entrance/exit nodes.
- **Newly added at z18:** house numbers always on, building names (apartments, complexes, named blocks), shop signage from OSM `name` + `shop=*` tags, addresses with `addr:street` + `addr:housenumber` rendered next to the building centroid.
- **Newly added at z19–20:** 3D-extruded building heights (where `building:levels` or `height` tagged), driveways, individual parking spaces, courtyard polygons, fence and wall lines.
- **Labels:** densely placed, collision priority follows the pyramid (Tier 1 wins), font-size up to 14 px for important POIs.
- **Icons:** 24 px at z18+, with full color and 2 px halo. Brand DLC theme may use 28 px and soft 3 px glow.

### 3.6 Twenty atomic zoom rules (one-line normative form)

1. z0–z2: only continents + country fills; no labels except 5 largest oceans.
2. z3: country borders 0.5 px gray, country labels 9 px regular.
3. z4: capital cities 2 px dots, no labels yet.
4. z5: capitals labeled at 10 px, top 10 rivers 0.6 px line.
5. z6: motorways appear at 1.0 px, very desaturated.
6. z7: secondary roads still hidden, primaries 1.2 px.
7. z8: large lakes filled, hillshade 0.15 starts.
8. z9: regional transit corridors render as 1.8 px colored ribbons.
9. z10: motorway shields appear, city pop ≥ 5 k labeled.
10. z11: residential roads appear as 0.6 px hairlines.
11. z12: tram/metro lines distinguishable by saturated color.
12. z13: street names start (primaries + secondaries only).
13. z14: every POI tier-2 icon visible with halo.
14. z15: building footprints with 0.5 px outline.
15. z16: house numbers + transit stop full labels.
16. z17: footways + stairs + crossings always on.
17. z18: 3D extrusions begin (where data available).
18. z19: individual benches, lamps, hydrants visible.
19. z20: max detail, all `man_made=*` micro-features, no label collisions allowed to suppress Tier 1.
20. Fractional zoom (e.g. 14.5) interpolates line-width and text-size linearly between band endpoints.

---

## 4. Color palettes & the four canonical themes

The four themes below are **fully differentiated** — not just recolors. Each has its own typographic stack, icon language, weight policy, and decorative budget. A user dropped into any of them must still answer the same navigation questions in the same time. That is the data-completeness test.

### 4.1 Theme 1 — *Minimal Urban Navigation* (light, neutral, the default)

**Intent.** Bureaucratically calm. Designed for long sessions where a user stares at the map for 20+ minutes comparing flats. Zero visual fatigue. The map should fade into background; the answers must pop.

**Palette.**
- Canvas background: `#f8f8f8`
- Land fill: `#f1f1ee`
- Water: `#a0d8f1` (soft pastel cyan)
- Park / green: `#c8e6c9`
- Forest: `#bcd9bd`
- Cemetery: `#dadbcf`
- Beach / sand: `#f5ecd0`
- Built-up residential: `#ecebe5`
- Commercial: `#f0eae2`
- Industrial: `#e8e3df`
- Building fill: `#e2dfd9`, outline `#cfcbc4`
- Admin boundary: `#9a9a9a` dashed for international, solid for municipal

**Road hierarchy (six steps, ordered widest → narrowest).**
1. Motorway — fill `#fbb03b` (amber), casing `#c98a26`, width z13: 5 px / z16: 8 px / z18: 12 px
2. Trunk — fill `#f9d56e`, casing `#c4a44d`
3. Primary — fill `#ffffff`, casing `#bfbcb5`, width z13: 3 px / z16: 5 px
4. Secondary — fill `#ffffff`, casing `#cac7c0`, slightly thinner
5. Tertiary — fill `#fafaf7`, casing `#d8d4cc`
6. Residential — fill `#fdfdfb`, casing `#dcd8d0`, width z14: 1.5 px / z18: 4 px
7. Service / track / path — neutral gray dashed, width 0.8 px → 2 px

**POI icons.** 16 px monochrome navy `#1f3a68` with a 1.5 px white halo. Categories distinguished by glyph only, not color. Selected/hovered icon swaps to a brand teal `#0d8a8c`.

**Labels.** Inter (variable), city names 600 weight, streets 500, neighborhoods 400 italic, POIs 500. Text color `#212121`, halo `#ffffff` 1.5 px. Drop shadow disabled.

**Transit color codes.** Metro `#ed1c24`, S-Bahn `#006633`, tram `#ffd700`, bus `#29abe2`, trolleybus `#cf1f1f`, ferry `#6e5cae`, HÉV (Budapest suburban) `#22c55e`, funicular `#8b5a2b`.

**Decorative budget.** Zero. No glow, no shadow on data, no gradient anywhere except the canvas-edge fade (opacity ≤ 0.08).

### 4.2 Theme 2 — *Beautiful Nature / Green-Planet* (warm, organic, tourism-leaning)

**Intent.** This is the cycling-network, green-space, and weekend-trip theme. Roads recede; vegetation, water, and recreational infrastructure dominate.

**Palette.**
- Canvas background: `#f0f5f0` (soft beige-green)
- Land fill: `#e7eee0`
- Water: `#9ec6dd` (warmer, slightly muted cyan)
- Park / green: `#a8d5a2` (more saturated than Theme 1)
- Forest: `#7fb87a`
- Wetland: `#b4cba4` with diagonal hatch overlay at z14+
- Beach: `#f0e2b6`
- Built-up: `#e0dccc`, buildings `#d2cdb8` with `#b9b39c` outline

**Roads.** Deliberately thinner and grayer than Theme 1, encouraging the eye to land on greenery first.
- Motorway: `#d4b88a` (muted amber), no casing at z<14
- Primary: `#b8b3a4`
- Residential: `#c7c1ad`, hairline at z14, never thicker than 3 px
- All road labels: muted brown `#5b4a33` with cream halo `#f0f5f0`

**Cycling routes (the headline feature).** Color-coded by OSM route relation network class:
- Local Cycle Network (`lcn`): `#facc15` (yellow)
- Regional Cycle Network (`rcn`): `#84cc16` (lime)
- National Cycle Network (`ncn`): `#16a34a` (forest green)
- International Cycle Network (EuroVelo, `icn`): `#0ea5e9` (aqua)
- Cycling routes are drawn as 2.5 px halo + 1.5 px core line, with a faint 0.3-opacity glow at z14+
- Cycling stops, repair stations, bike-rentals get a custom organic-leaf icon

**Topography.**
- Contour lines: `#a07a3c` dotted, 0.4 px at z13 → 0.8 px at z17
- Index contours (every 5th): solid 0.6 px, labeled at z15+
- Hillshade raster underlay: opacity 0.25, multiplied
- Peak markers: triangle glyph + elevation in italics

**Typography.** Source Serif Pro for place names (a classic cartographic feel), Inter for streets and POIs. City labels italic at z9–z12 (river-bend style), upright at z13+.

**Icon style.** Hand-drawn organic outlines, slightly irregular stroke, 18 px at z14, 22 px at z17. Color palette: warm earth tones — terracotta `#c1632b`, olive `#7e8a3a`, slate `#4f6470`.

**Decorative budget.** Subtle paper-grain texture at canvas edges (opacity 0.05), warm vignette in the bottom corners (opacity 0.08). Nothing else.

### 4.3 Theme 3 — *Dark-Mode / Night-Vibe* (low-light, functional, never-blinding)

**Intent.** Late-night use. Same data completeness as Theme 1 but inverted lightness. Critically — *not* a flat color invert; selected colors are recalibrated so contrast ratios survive WCAG AA.

**Palette.**
- Canvas background: `#0a0f1e` (deep midnight blue)
- Land fill: `#10172a`
- Water: `#1e3a8a` (dark royal blue, recognizable as water at first glance)
- Park / green: `#1a3d2b` (deep forest)
- Forest: `#13311f`
- Built-up: `#1c2238`, buildings `#222a44` with `#3a4467` outline
- Admin boundary: `#6b7299` dashed

**Roads.** Roads are *light gray* on dark, not white — pure white at high zoom glows uncomfortably.
- Motorway: `#f3c14a` (warm amber, still warm enough to mark hierarchy)
- Primary: `#cfd5e2`
- Secondary: `#a3a9b8`
- Residential: `#7f8597`, hairline
- Casing: a darker tone `#0a0f1e` (background) — produces a "punch-out" effect

**POI icons.** Luminous soft pastels — pharmacy mint `#5ee3b8`, hospital coral `#f47b85`, transit cyan `#76d8f6`, school violet `#b89cf2`. Each icon has a 3 px box-shadow blur, opacity 0.4, color-matched. Glow never bleeds further than 4 px.

**Labels.** Light text `#e2e8f0`, halo `#0a0f1e` 1.5 px, plus a subtle text-shadow at 0 0 2 px rgba(0,0,0,0.5) for additional separation. Font: Inter, slightly tighter tracking (-0.01 em).

**Transit colors.** Boosted saturation so they still read at night:
- Metro: `#ff3b48`
- S-Bahn: `#1eaa4e`
- Tram: `#ffe156`
- Bus: `#5ccff0`
- Trolleybus: `#ff6b6b`
- Ferry: `#a48de8`
- HÉV: `#4ade80`

**Decorative budget.** A *very* faint star-field at the canvas top (opacity 0.06, only visible above the visible map content area), and a soft radial gradient `radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.25) 100%)` for vignette. No motion, no animation, no parallax — they are reserved for the DLC theme.

### 4.4 Theme 4 — *Custom DLC-Sculpted / Brand-Style* (cyberpunk, in-game, high-style)

**Intent.** The "wow" theme. Used for marketing screenshots, hero scenes, brand campaigns, and the optional "experimental" toggle. *Still passes the data-completeness test.* Every Tier-1 and Tier-2 feature renders and labels. The flourishes happen in Tier-5.

**Palette.**
- Canvas background: `#0d0822` (deep void violet)
- Land fill: `#150d2e`
- Water: `#0e1d3a` with animated thin cyan grid overlay (opacity 0.06, paused if `prefers-reduced-motion`)
- Park / green: `#0f3a2a` with subtle scanline texture
- Built-up: `#1a1230`, buildings `#22183f` with magenta-cyan-amber neon outline (cycled per district seed)
- Admin boundary: `#ec4899` dashed, opacity 0.5

**Brand neon trio.** All accents drawn from:
- Magenta `#ec4899`
- Teal `#14b8a6`
- Amber `#f59e0b`

**Roads as data-cables.** Motorways glow magenta `#ec4899`, primaries glow teal `#14b8a6`, residentials glow amber `#f59e0b` but at very low intensity. The glow is implemented as a 4-pass render: dark core (1.5 px) + neon mid (3 px @ 0.6 opacity) + soft halo (8 px @ 0.2 opacity) + bloom (16 px @ 0.08 opacity).

**Building styling.** Buildings get a 1 px neon outline, color seeded by `osm_id % 3` across the brand trio. Building fills remain dark to keep label contrast.

**POI icons.** Custom icon set, geometric-glyph style, 22 px at z15, with 3 px box-shadow color-matched to category. Hospital icons emit a slow pulse animation (1.6 s cycle, opacity oscillates 0.85 → 1.0) — paused if `prefers-reduced-motion`.

**Labels.** JetBrains Mono for street names (monospaced, tech feel), Space Grotesk for place names. All caps for cities at z10–z13, title case at z14+. Text color is the brand trio's amber `#f59e0b` for highways, teal `#14b8a6` for primaries, and a luminous off-white `#f5f7ff` for everything else.

**Optional cyberpunk grid overlay.** A faint 1 px square grid at 40 px spacing, color `#14b8a6`, opacity 0.04. Always renders *below* all data layers. User-toggleable.

**Decorative budget — the maximum.** Up to four simultaneous decorative passes: bloom, scanlines, grid, vignette. Each is capped at opacity ≤ 0.12. No animation runs faster than 1.4 s per cycle, no animation runs at all under `prefers-reduced-motion`. All decorative passes are rendered on a separate canvas layer that the user can opacity-slide from 0–100 % in the UI.

---

## 5. Typography system

### 5.1 Font stacks per theme

- **Minimal Urban:** Inter (variable, 100–900), with SF Pro Text as native fallback on Apple, Roboto on Android, Segoe UI Variable on Windows. System fallback chain ends in `system-ui, sans-serif`.
- **Nature:** Source Serif Pro for place names + Inter for streets/POIs. Fallback: Georgia, Lora.
- **Dark Mode:** Inter with tightened tracking (-0.01 em) and slightly heavier (500 → 600) than Minimal to compensate for the dark background's perceived thinning of strokes.
- **DLC-Brand:** JetBrains Mono (streets, refs) + Space Grotesk (places, POIs).

### 5.2 Font-weight rules

- Major roads / motorways / trunk labels: 700
- Settlement names z7–z13: 500
- Settlement names z14+: 600
- Streets (primary/secondary): 600 at z14, 500 at z16+
- Streets (residential / service / path): 400
- Neighborhood / quarter labels: 400 italic
- Transit station labels: 600
- POI labels: 500
- Address labels (house numbers): 400
- Decorations (terrain, peaks, contour index): 300 italic

### 5.3 Font-size by zoom

| Feature | z6–z9 | z10–z12 | z13–z14 | z15–z16 | z17–z20 |
|---|---|---|---|---|---|
| Country | 11 px | — | — | — | — |
| Province / region | 10 px | 12 px | — | — | — |
| City (large) | 11 px | 13 px | 15 px | 15 px | 15 px |
| City (small) | — | 9 px | 11 px | 11 px | 11 px |
| Neighborhood | — | — | 10 px | 11 px | 12 px |
| Street (primary) | — | — | 10 px | 12 px | 13 px |
| Street (residential) | — | — | — | 10 px | 12 px |
| Transit stop | — | — | 9 px | 11 px | 12 px |
| POI | — | — | 10 px | 11 px | 12 px |
| House number | — | — | — | 9 px | 10 px |

### 5.4 Label halo & shadow

- **Halo color:** always equals the local background fill at the label's anchor point. For light themes this is near-white; for dark themes the deep midnight blue; for Nature the soft beige-green; for DLC the void violet.
- **Halo width:** 1.5 px standard, 2 px for Tier-1 labels at z<14.
- **Drop shadow:** disabled by default. The Dark Mode theme adds a single `0 0 2 px rgba(0,0,0,0.5)` for additional letter separation. The DLC theme may add a single colored shadow matching the brand trio, but max blur radius 3 px, max opacity 0.3.

### 5.5 Label placement & collision

- Line placement for streets (text follows the geometry, with `text-letter-spacing: 0.04 em` for legibility along curves).
- Point placement for POIs, with `text-anchor: top` if the icon is rendered at the centroid.
- Boundary placement with `symbol-placement: line` and `text-rotation-alignment: map`.
- Collision priority follows the pyramid: Tier 1 always wins over Tier 2, which always wins over Tier 3.
- Symbol sort key = tier × 1000 + feature importance score (population, way length, area).
- No label may be placed within 4 px of the map edge.
- Max 1 city label per 80 × 80 px region at z9–z12.

### 5.6 Bidirectional & non-Latin scripts

- Hungarian (HU): full diacritic coverage required (őűáéíóúüöÁÉ etc.). Inter variable already covers these.
- For future markets (CZ, SK, PL, RO, DE, AT): Latin Extended-A is required.
- For Cyrillic / Greek / Hebrew / Arabic: glyph-server fallback to Noto Sans, RTL handling via Mapbox GL `text-rotation-alignment`.

---

## 6. Icon design system

### 6.1 Principles

- Every icon is a **single line-art glyph** in Theme 1/2/3, and a **geometric/cyber glyph** in Theme 4.
- Icons are **monochrome** in Minimal & Nature, **luminous pastel** in Dark, **neon** in DLC.
- All icons share a 24 × 24 viewBox and are pre-rendered into a sprite sheet per theme. Vector tiles use `icon-image: <name>` and the sprite is loaded once.
- Icons must remain recognizable at 12 px (sprite mode for low-zoom) and 28 px (DLC max).

### 6.2 Icon categories (20+ entries)

1. **Pharmacy** — green cross (or amber cross in HU/AT context). Monochrome navy in Minimal; mint in Dark.
2. **Hospital** — H in rounded square + cross.
3. **Clinic / doctor** — stethoscope outline.
4. **Dentist** — tooth glyph.
5. **Veterinary** — paw + cross.
6. **School** — book + graduation cap.
7. **Kindergarten** — building with playground swing.
8. **University** — column façade glyph.
9. **Library** — open book.
10. **Museum** — Greek temple façade.
11. **Theatre / cinema** — film reel or masks.
12. **Restaurant** — fork + knife crossed.
13. **Cafe** — coffee cup with steam.
14. **Bar / pub** — beer mug.
15. **Hotel** — bed.
16. **Supermarket / convenience** — shopping cart.
17. **Bank / ATM** — banknote / dollar/euro sign in circle.
18. **Post office** — envelope.
19. **Police** — police badge / star.
20. **Fire station** — flame + helmet.
21. **Town hall / municipal office** — neoclassical building outline.
22. **Place of worship** — cross / crescent / star, depending on religion tag.
23. **Fuel station** — gas pump.
24. **EV charging** — plug with bolt.
25. **Parking (car)** — capital P in square.
26. **Bicycle parking** — bike + P.
27. **Bike-sharing station** — bike + circular arrow.
28. **Bus stop** — bus + roof.
29. **Tram stop** — tram + rail.
30. **Metro station** — M in circle (themed colors per network).
31. **Train station** — train + roof.
32. **Ferry pier** — ship + anchor.
33. **Airport** — airplane.
34. **Recycling** — three-arrow triangle.
35. **Drinking fountain** — droplet.
36. **Bench / picnic** — bench glyph.
37. **Viewpoint** — eye on triangle.
38. **Peak** — triangle + elevation.

### 6.3 Base size & scale

- 16 px base at z14, scaling linearly to 20 px at z16 and 24 px at z18.
- DLC theme scales 10 % larger and adds a 3 px shadow.
- Sprite source: SVG, exported at 1×, 2×, 3× to support hi-DPI displays.

### 6.4 Halo & background

- Minimal & Nature: 1.5 px halo matching canvas background.
- Dark: 2 px halo plus the luminous glow described above.
- DLC: 2 px halo plus 3 px colored shadow.

### 6.5 State variants

- Default
- Hovered (icon swaps to brand teal in Minimal, brand magenta in DLC, slightly brighter pastel in Dark)
- Selected (filled background circle + white glyph; for DLC, the glow doubles in intensity)
- Disabled / out-of-hours (50 % opacity, optional clock badge)

---

## 7. Layer-by-layer style spec (pseudo-JSON)

Every layer below carries a `source: osm` and a per-zoom rule block. Renderers (MapLibre / Mapbox GL / Protomaps) consume this as a deterministic translation target. The four themes share the layer set; only the paint properties differ.

### 7.1 roads_motorway

```yaml
roads_motorway:
  source: osm
  source-layer: transportation
  filter: ["==", "class", "motorway"]
  zoom_0_6:
    visibility: visible
    line-width: 1.0
    line-color: "#cccccc"
    line-opacity: 0.6
  zoom_7_12:
    line-width: 2.5
    line-color: "#b0b0b0"
    line-cap: round
    line-join: round
  zoom_13_16:
    line-width: 5.0
    line-color: "#fbb03b"          # Minimal theme; per-theme override
    line-casing-color: "#c98a26"
    line-casing-width: 7.0
    text-field: "{name} ({ref})"
    text-size: 12
    text-color: "#333333"
    text-halo-color: "#ffffff"
    text-halo-width: 1.5
    text-font: ["Inter Bold"]
  zoom_17_20:
    line-width: 12.0
    line-casing-width: 14.0
    text-size: 14
```

### 7.2 roads_trunk

```yaml
roads_trunk:
  filter: ["==", "class", "trunk"]
  zoom_7_12: { line-width: 2.0, line-color: "#c9a85a" }
  zoom_13_16: { line-width: 4.0, line-color: "#f9d56e", line-casing-color: "#c4a44d", text-field: "{name}", text-size: 11 }
  zoom_17_20: { line-width: 10.0, text-size: 13 }
```

### 7.3 roads_primary

```yaml
roads_primary:
  filter: ["==", "class", "primary"]
  zoom_10_12: { line-width: 1.2, line-color: "#d1cec5" }
  zoom_13_16: { line-width: 3.0, line-color: "#ffffff", line-casing-color: "#bfbcb5", text-field: "{name}", text-size: 11 }
  zoom_17_20: { line-width: 7.0, text-size: 13, text-letter-spacing: 0.04 }
```

### 7.4 roads_secondary

```yaml
roads_secondary:
  filter: ["==", "class", "secondary"]
  zoom_11_13: { line-width: 1.0, line-color: "#d6d3ca" }
  zoom_14_16: { line-width: 2.5, line-color: "#ffffff", line-casing-color: "#cac7c0", text-field: "{name}", text-size: 10 }
  zoom_17_20: { line-width: 5.5, text-size: 12 }
```

### 7.5 roads_tertiary

```yaml
roads_tertiary:
  filter: ["==", "class", "tertiary"]
  zoom_12_14: { line-width: 0.8, line-color: "#d8d4cc" }
  zoom_15_16: { line-width: 2.0, line-color: "#fafaf7", line-casing-color: "#d8d4cc", text-field: "{name}", text-size: 10 }
  zoom_17_20: { line-width: 4.5, text-size: 11 }
```

### 7.6 roads_residential

```yaml
roads_residential:
  filter: ["in", "class", "residential", "living_street", "unclassified"]
  zoom_13_14: { line-width: 0.6, line-color: "#dcd8d0" }
  zoom_15_16: { line-width: 1.5, line-color: "#fdfdfb", line-casing-color: "#dcd8d0", text-field: "{name}", text-size: 9 }
  zoom_17_20: { line-width: 4.0, text-size: 11, text-letter-spacing: 0.03 }
```

### 7.7 roads_service_and_path

```yaml
roads_service_and_path:
  filter: ["in", "class", "service", "track", "path", "footway"]
  zoom_14_16:
    line-width: 0.8
    line-color: "#cdc7bd"
    line-dasharray: [2, 2]
    line-cap: butt
  zoom_17_20:
    line-width: 1.8
    line-dasharray: [3, 2]
    text-field: "{name}"
    text-size: 9
    text-color: "#5b5147"
```

### 7.8 railway_heavy

```yaml
railway_heavy:
  source-layer: transportation
  filter: ["==", "class", "rail"]
  zoom_8_12: { line-width: 1.0, line-color: "#5b5b5b" }
  zoom_13_16:
    line-width: 1.5
    line-color: "#3a3a3a"
    line-dasharray: [6, 4]
    text-field: "{name}"
    text-size: 10
  zoom_17_20: { line-width: 2.5, line-dasharray: [8, 4] }
```

### 7.9 railway_tram

```yaml
railway_tram:
  filter: ["==", "subclass", "tram"]
  zoom_12_14: { line-width: 1.2, line-color: "#ffd700" }
  zoom_15_16: { line-width: 2.0, line-color: "#ffd700", line-casing-color: "#a37c00", line-casing-width: 3.5 }
  zoom_17_20: { line-width: 3.5, line-casing-width: 5.5, text-field: "{ref} {name}", text-size: 10, text-color: "#5a4500" }
```

### 7.10 railway_metro

```yaml
railway_metro:
  filter: ["==", "subclass", "subway"]
  zoom_10_13: { line-width: 1.5, line-color: "#ed1c24" }
  zoom_14_16: { line-width: 2.5, line-color: "#ed1c24", line-casing-color: "#8a0e13", line-casing-width: 4.0 }
  zoom_17_20: { line-width: 4.5, text-field: "{ref}", text-size: 11, text-color: "#ffffff", text-halo-color: "#ed1c24", text-halo-width: 1.5 }
```

### 7.11 transit_bus_route

```yaml
transit_bus_route:
  source: osm_route_relations
  filter: ["==", "route", "bus"]
  zoom_13_15: { line-width: 1.0, line-color: "#29abe2", line-opacity: 0.7 }
  zoom_16_20: { line-width: 1.8, line-color: "#29abe2", line-dasharray: [3, 2], text-field: "{ref}", text-size: 10, text-color: "#0c5b78" }
```

### 7.12 cycleway

```yaml
cycleway:
  source: osm
  filter: ["any", ["==", "class", "cycleway"], ["==", "bicycle", "designated"]]
  zoom_13_14: { line-width: 0.8, line-color: "#84cc16", line-opacity: 0.6 }
  zoom_15_16:
    line-width: 1.6
    line-color: "#84cc16"
    line-casing-color: "#3f6912"
    line-casing-width: 2.6
  zoom_17_20:
    line-width: 2.8
    text-field: "{name}"
    text-size: 10
    text-color: "#3f6912"
```

### 7.13 cycle_route_relations (lcn/rcn/ncn/icn)

```yaml
cycle_route_relations:
  source: osm_route_relations
  filter: ["==", "route", "bicycle"]
  paint_by_network:
    lcn: { line-color: "#facc15", line-width: 1.5 }
    rcn: { line-color: "#84cc16", line-width: 2.0 }
    ncn: { line-color: "#16a34a", line-width: 2.5 }
    icn: { line-color: "#0ea5e9", line-width: 3.0 }
  zoom_13_20:
    line-cap: round
    line-join: round
    text-field: "{ref} {name}"
    text-size: 10
    text-color: "#0c5b78"
    text-halo-color: "#f0f5f0"
    text-halo-width: 1.5
```

### 7.14 pedestrian_area

```yaml
pedestrian_area:
  source: osm
  filter: ["==", "class", "pedestrian"]
  zoom_14_16:
    fill-color: "#efebe2"
    fill-outline-color: "#cdc7bd"
  zoom_17_20:
    fill-color: "#efebe2"
    fill-outline-color: "#b8b1a2"
    text-field: "{name}"
    text-size: 10
    text-color: "#5b4a33"
```

### 7.15 water

```yaml
water:
  source: osm
  source-layer: water
  zoom_0_6: { fill-color: "#a0d8f1" }
  zoom_7_13: { fill-color: "#a0d8f1", fill-outline-color: "#6fb6d9" }
  zoom_14_20:
    fill-color: "#a0d8f1"
    fill-outline-color: "#6fb6d9"
    text-field: "{name}"
    text-size: 11
    text-color: "#1d4e6b"
    text-halo-color: "#ffffff"
    text-halo-width: 1.5
    text-style: italic
```

### 7.16 rivers_linestring

```yaml
rivers_linestring:
  source: osm
  filter: ["==", "class", "river"]
  zoom_5_8: { line-width: 0.6, line-color: "#6fb6d9" }
  zoom_9_13: { line-width: 1.2, line-color: "#6fb6d9" }
  zoom_14_20:
    line-width: 2.5
    line-color: "#6fb6d9"
    line-cap: round
    text-field: "{name}"
    text-size: 11
    text-color: "#1d4e6b"
    text-style: italic
    symbol-placement: line
```

### 7.17 parks_and_greenery

```yaml
parks_and_greenery:
  source: osm
  filter: ["in", "class", "park", "garden", "village_green", "playground"]
  zoom_8_12: { fill-color: "#c8e6c9", fill-opacity: 0.7 }
  zoom_13_16:
    fill-color: "#c8e6c9"
    fill-outline-color: "#9ec79f"
    text-field: "{name}"
    text-size: 11
    text-color: "#2f5b30"
    text-style: italic
  zoom_17_20:
    text-size: 13
    text-letter-spacing: 0.03
```

### 7.18 forest

```yaml
forest:
  source: osm
  filter: ["in", "class", "forest", "wood"]
  zoom_7_12: { fill-color: "#bcd9bd", fill-opacity: 0.7 }
  zoom_13_20:
    fill-color: "#bcd9bd"
    fill-outline-color: "#7fb87a"
    text-field: "{name}"
    text-size: 10
    text-color: "#2c4c2d"
    text-style: italic
```

### 7.19 buildings

```yaml
buildings:
  source: osm
  source-layer: building
  zoom_13: { fill-color: "#e2dfd9", fill-opacity: 0.25 }
  zoom_14_16:
    fill-color: "#e2dfd9"
    fill-outline-color: "#cfcbc4"
    fill-opacity: 0.85
  zoom_17_20:
    fill-color: "#e2dfd9"
    fill-outline-color: "#b8b3a8"
    fill-extrusion-height: ["get", "render_height"]
    fill-extrusion-base: 0
    fill-extrusion-opacity: 0.9
    text-field: "{name}"
    text-size: 10
    text-color: "#444444"
```

### 7.20 poi_icons

```yaml
poi_icons:
  source: osm
  source-layer: poi
  zoom_13_14:
    icon-image: "{category}_16"
    icon-size: 0.75
    icon-allow-overlap: false
    icon-padding: 4
  zoom_15_16:
    icon-image: "{category}_20"
    icon-size: 1.0
    text-field: "{name}"
    text-size: 10
    text-anchor: top
    text-offset: [0, 1.2]
    text-color: "#212121"
    text-halo-color: "#f8f8f8"
    text-halo-width: 1.5
  zoom_17_20:
    icon-image: "{category}_24"
    icon-size: 1.2
    text-size: 12
    text-offset: [0, 1.4]
```

### 7.21 labels_cities

```yaml
labels_cities:
  source: osm
  source-layer: place
  filter: ["in", "class", "city", "town", "village"]
  zoom_4_6:
    text-field: "{name}"
    text-size: ["interpolate", ["linear"], ["get", "population"], 100000, 9, 5000000, 13]
    text-color: "#212121"
    text-halo-color: "#ffffff"
    text-halo-width: 1.5
    text-font: ["Inter Semibold"]
  zoom_7_13:
    text-size: ["interpolate", ["linear"], ["zoom"], 7, 10, 13, 15]
    text-letter-spacing: 0.02
  zoom_14_16:
    text-size: 15
    text-transform: none
  zoom_17_20:
    text-size: 15
    text-font: ["Inter Bold"]
```

### 7.22 labels_streets

```yaml
labels_streets:
  source: osm
  source-layer: transportation_name
  zoom_13_14:
    text-field: "{name}"
    text-size: 10
    symbol-placement: line
    text-letter-spacing: 0.04
    text-color: "#5b5147"
    text-halo-color: "#ffffff"
    text-halo-width: 1.25
  zoom_15_16:
    text-size: 11
  zoom_17_20:
    text-size: 13
    text-font: ["Inter Semibold"]
```

### 7.23 labels_neighborhoods

```yaml
labels_neighborhoods:
  source: osm
  filter: ["in", "class", "suburb", "neighbourhood", "quarter"]
  zoom_11_13:
    text-field: "{name}"
    text-size: 10
    text-transform: uppercase
    text-letter-spacing: 0.12
    text-color: "#7a7368"
    text-halo-color: "#f8f8f8"
    text-halo-width: 1.5
    text-style: italic
  zoom_14_16:
    text-size: 11
  zoom_17_20:
    text-size: 12
```

### 7.24 boundary_country

```yaml
boundary_country:
  source: osm
  filter: ["==", "admin_level", 2]
  zoom_2_8:
    line-color: "#9a9a9a"
    line-width: 1.2
    line-dasharray: [4, 2]
    line-opacity: 0.8
  zoom_9_20:
    line-width: 1.6
    line-dasharray: [6, 3]
```

### 7.25 boundary_region

```yaml
boundary_region:
  filter: ["==", "admin_level", 4]
  zoom_5_20:
    line-color: "#b0b0b0"
    line-width: 0.8
    line-dasharray: [3, 3]
    line-opacity: 0.7
```

### 7.26 boundary_municipal

```yaml
boundary_municipal:
  filter: ["in", "admin_level", 6, 8]
  zoom_10_20:
    line-color: "#c2c2c2"
    line-width: 0.6
    line-dasharray: [2, 2]
    line-opacity: 0.6
```

### 7.27 landuse_residential

```yaml
landuse_residential:
  filter: ["==", "class", "residential"]
  zoom_11_20: { fill-color: "#ecebe5", fill-opacity: 0.5 }
```

### 7.28 landuse_commercial

```yaml
landuse_commercial:
  filter: ["==", "class", "commercial"]
  zoom_12_20: { fill-color: "#f0eae2", fill-opacity: 0.5 }
```

### 7.29 landuse_industrial

```yaml
landuse_industrial:
  filter: ["==", "class", "industrial"]
  zoom_12_20: { fill-color: "#e8e3df", fill-opacity: 0.5 }
```

### 7.30 contour_lines

```yaml
contour_lines:
  source: terrain
  filter: [">=", "ele_step", 10]
  zoom_13_14: { line-color: "#a07a3c", line-width: 0.3, line-opacity: 0.4 }
  zoom_15_17:
    line-color: "#a07a3c"
    line-width: 0.5
    line-opacity: 0.6
    text-field: "{ele} m"
    text-size: 9
    text-style: italic
    text-color: "#6e5025"
```

---

## 8. Map viewport & UI components

### 8.1 mapViewport (pseudo-HTML)

```html
<MapViewport class="map-viewport"
             initial-center="47.4979,19.0402"
             initial-zoom="13"
             min-zoom="3" max-zoom="20"
             projection="mercator"
             bearing="0" pitch="0">
  <MapCanvas role="application"
             aria-label="Interactive map of Budapest, OSM-based" />
  <UiOverlay anchor="top-left">  <SearchBar /> </UiOverlay>
  <UiOverlay anchor="top-right"> <LayerSwitcher /> <ThemeSwitcher /> </UiOverlay>
  <UiOverlay anchor="bottom-right"> <ZoomButtons /> <GeolocateButton /> </UiOverlay>
  <UiOverlay anchor="bottom-left">  <ScaleBar /> <AttributionBar /> </UiOverlay>
  <UiOverlay anchor="bottom-center"> <MiniMap collapsed="true" /> </UiOverlay>
  <InfoPanel slot="aside" />
</MapViewport>
```

### 8.2 UI controls

- **Zoom buttons.** Two stacked round buttons (40 px), `+` and `−`, background `rgba(255,255,255,0.92)` with 1 px border and 4 px shadow. Disabled state at zoom limits with 50 % opacity.
- **Geolocate.** Single round button, 40 px, with a crosshair icon. Active state ripples 0.8 s pulse (paused under reduced motion).
- **Layer switcher.** Bottom-anchored modal in mobile, top-right popover on desktop. Lists toggleable layers grouped by tier (Transit / Cycling / Parks / Buildings / Decorative).
- **Theme switcher.** Four pills: Minimal / Nature / Dark / DLC, with a small preview swatch each. Persists via `localStorage.theme`.
- **Search bar.** 320 px on desktop, full-width on mobile, with autocomplete dropdown sourced from `/api/location/autocomplete` (Supabase + Nominatim fallback per v0.7.14).
- **Info panel.** Right-side drawer on desktop (360 px), bottom sheet on mobile (50 % vh). Displays the selected feature's name, OSM tags, photo (if `image=*` tagged), and contextual actions.
- **Mini-map.** Bottom-center, 160 × 100 px, collapsible. Shows current viewport rectangle.
- **Scale bar.** Imperial + metric, 80 px wide, white background with 1 px border.
- **Attribution.** "© OpenStreetMap contributors" + tile-server attribution + (optional) "Map style by Panellako v0.7.17". Required by ODbL.

### 8.3 InfoPanel layout

```html
<aside class="info-panel" role="dialog" aria-labelledby="info-title">
  <header><h2 id="info-title">{{feature.name}}</h2><CloseButton/></header>
  <section class="info-meta"> {{feature.category}} • {{feature.distance}} m </section>
  <section class="info-image" v-if="feature.image"><img alt="" :src="..."></section>
  <section class="info-tags"> <TagPill v-for="t in tags" /> </section>
  <section class="info-actions"> <RouteButton /> <ShareButton /> <ReportButton /> </section>
</aside>
```

---

## 9. Accessibility (WCAG 2.1 AA)

### 9.1 Contrast ratios

- All label text against its halo and against the local background must satisfy **4.5 : 1** for body text and **3.0 : 1** for text ≥ 18 px or bold ≥ 14 px.
- Tested at the four-theme matrix with the labels-cities, labels-streets, and POI label categories.
- Decorative effects (glow, shadow, bloom) **must not** be the contrast carrier — strip the effect and the text must still be readable.

### 9.2 Color-blindness variants

- **Deuteranopia / protanopia variants** for the cycling route palette: lcn → `#fbbf24` (still amber), rcn → `#a78bfa` (violet replaces lime), ncn → `#0ea5e9` (cyan replaces green), icn → `#0c4a6e` (deep navy).
- **Tritanopia variant**: water shifts to `#9bb7c4` (low-blue gray), greens stay readable.
- Theme switcher exposes a "Color-vision accessible" sub-mode that overlays these palettes.

### 9.3 Keyboard navigation

- All UI controls reachable via Tab, with visible 2 px focus rings (color `#0066cc` on light, `#5ccff0` on dark).
- Map canvas itself is focusable; arrow keys pan, `+` / `−` zoom, `Enter` opens the feature under the crosshair.
- Skip-to-content link at the top of the viewport.

### 9.4 Screen-reader semantics

- `MapCanvas` exposes `role="application"` and a live region that announces the current center and zoom on demand (Alt+I keyboard shortcut).
- Selected features expose their OSM `name` and `class` via `aria-live="polite"`.
- Decorative overlays carry `aria-hidden="true"`.

### 9.5 Reduced motion

- All animations (DLC pulses, geolocate ripples, ambient effects) check `prefers-reduced-motion: reduce` and disable when true.
- Tile fade-in is capped at 200 ms regardless of theme.

### 9.6 Font size baseline

- Minimum on-canvas label size: 9 px at z13–z14 (only for low-importance features). Body labels at 10 px+. UI control text at 14 px minimum.

---

## 10. Performance & technical considerations

### 10.1 Vector vs raster

- **Default = vector tiles (PMTiles or MBTiles via Protomaps).** Smaller, restylable client-side, no per-tile network round-trip beyond the archive range request.
- Raster fallback only for hillshade and (optionally) satellite overlay (NDVI page).
- Vector tile schema: OpenMapTiles v3 (compatible with Maputnik for editing).

### 10.2 Tile-server choices

- **Production primary:** self-hosted Protomaps PMTiles on Supabase Storage or CDN.
- **Fallback:** OpenMapTiles container (Docker) on a small VPS, behind Cloudflare.
- **Dev:** MapTiler hosted endpoint or Tilemaker output served locally.

### 10.3 CDN & caching

- 30-day immutable cache for vector tiles (PMTiles is content-addressed).
- 7-day cache for sprite sheets and glyph PBFs.
- 24-hour cache for the style JSON itself (per theme).

### 10.4 Sprite sheet

- One sprite sheet per theme (Minimal / Nature / Dark / DLC), generated from the SVG icon set by `spritezero-cli`.
- 1×, 2×, 3× variants for hi-DPI.
- Sprite sheet size budget: ≤ 200 kB per theme.

### 10.5 Glyph server & font subsetting

- Glyphs served as PBF ranges, one PBF per 256-character range.
- Font subsetted to Latin + Latin Extended-A + Cyrillic + Greek by default; per-deploy further subsetting available.
- Total font-PBF size budget: ≤ 1.5 MB per font.

### 10.6 Performance budgets per theme

| Theme | Tile draw ms (desktop) | Tile draw ms (mid-mobile) | GPU layers | Decorative passes |
|---|---|---|---|---|
| Minimal | ≤ 12 | ≤ 24 | ≤ 8 | 0 |
| Nature | ≤ 14 | ≤ 28 | ≤ 10 | 1 (paper grain) |
| Dark | ≤ 13 | ≤ 26 | ≤ 9 | 1 (vignette + faint stars) |
| DLC | ≤ 18 | ≤ 34 | ≤ 14 | 4 (bloom + scanlines + grid + vignette) |

If any theme exceeds budget on the reference device (Pixel 6a / iPhone 12 mini), the QA gate fails and the offending decorative pass must be capped or downscaled.

### 10.7 Bundle hygiene

- Map renderer bundle (`maplibre-gl`): ≤ 350 kB gzipped.
- Style JSON: ≤ 80 kB per theme.
- Sprite + glyphs lazy-loaded on first map mount.

---

## 11. Implementation guide

### 11.1 Recommended stack

- **Renderer:** `maplibre-gl@latest` (BSD-3, no token required, full vector + 3D + globe).
- **Tile format:** Protomaps PMTiles via `protomaps-leaflet` for Leaflet-based pages, `pmtiles` plugin for MapLibre GL.
- **Style helpers:** `@mapbox/mapbox-gl-style-spec` for validation.
- **Sprite tooling:** `spritezero-cli`.
- **Glyph tooling:** `node-fontnik`.
- **Geocoder:** existing `/api/location/autocomplete` (Supabase + Nominatim fallback).

### 11.2 Integration steps (per page)

1. Lazy-mount the map component (`<MapView />`) only when scrolled into view.
2. Load the style JSON for the active theme from `/styles/{theme}.json` with `cache: 'force-cache'`.
3. Initialize MapLibre GL with `{ style, hash: false, attributionControl: false }` (we render our own attribution).
4. Mount UI overlays via React portals into the viewport.
5. Wire the theme switcher to call `map.setStyle(newStyle)` and persist via `localStorage.theme`.
6. Wire the layer switcher to call `map.setLayoutProperty(layerId, 'visibility', 'visible' | 'none')`.
7. Wire the search bar to fly the camera via `map.flyTo({ center, zoom: 16, speed: 1.2 })`.

### 11.3 Per-product page mapping

| Page | Primary theme | Default zoom | Required layers |
|---|---|---|---|
| Dashboard mini-map | Minimal | 12 | Tier 1 + Tier 2 abbreviated |
| Environment page | Nature | 14 | Tier 1 + cycleways + parks + air-quality stations |
| Budapest transit analyzer | Minimal + custom transit emphasis | 12 | Tier 1 + full transit relations |
| Cycling explorer | Nature | 13 | cycle_route_relations + cycleways + bike parking |
| Building viewer | Minimal | 17 | buildings + Tier 1 + POI |
| Marketing hero | DLC | 14 | All layers, decorative max |

### 11.4 Versioning the style

- Style JSONs are versioned `styles/v0.7.17/{theme}.json` and the active version is read from a single `STYLE_VERSION` constant.
- Sprite + glyph URLs are absolute and reference the same version.
- Bumping the style version is a one-line release; clients pick it up on next reload.

---

## 12. Example style JSON snippet (Minimal Urban, ~80 lines)

```json
{
  "version": 8,
  "name": "Panellako Minimal Urban v0.7.17",
  "metadata": { "panellako:theme": "minimal-urban", "panellako:version": "0.7.17" },
  "sprite": "https://cdn.panellako.hu/styles/v0.7.17/minimal/sprite",
  "glyphs": "https://cdn.panellako.hu/glyphs/{fontstack}/{range}.pbf",
  "sources": {
    "osm": {
      "type": "vector",
      "url": "pmtiles://https://cdn.panellako.hu/tiles/europe.pmtiles",
      "attribution": "© OpenStreetMap contributors"
    },
    "terrain": {
      "type": "raster-dem",
      "url": "https://cdn.panellako.hu/terrain.pmtiles",
      "tileSize": 256
    }
  },
  "layers": [
    { "id": "background", "type": "background", "paint": { "background-color": "#f8f8f8" } },
    { "id": "landuse-park", "type": "fill", "source": "osm", "source-layer": "landuse",
      "filter": ["==", "class", "park"],
      "paint": { "fill-color": "#c8e6c9", "fill-opacity": 0.7 } },
    { "id": "water", "type": "fill", "source": "osm", "source-layer": "water",
      "paint": { "fill-color": "#a0d8f1", "fill-outline-color": "#6fb6d9" } },
    { "id": "rivers", "type": "line", "source": "osm", "source-layer": "waterway",
      "filter": ["==", "class", "river"],
      "paint": { "line-color": "#6fb6d9",
                 "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.6, 14, 2.5] } },
    { "id": "buildings", "type": "fill", "source": "osm", "source-layer": "building",
      "minzoom": 13,
      "paint": { "fill-color": "#e2dfd9", "fill-outline-color": "#cfcbc4",
                 "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0.25, 16, 0.85] } },
    { "id": "roads-residential", "type": "line", "source": "osm", "source-layer": "transportation",
      "filter": ["==", "class", "residential"],
      "paint": { "line-color": "#fdfdfb",
                 "line-width": ["interpolate", ["linear"], ["zoom"], 13, 0.6, 18, 4.0] } },
    { "id": "roads-primary", "type": "line", "source": "osm", "source-layer": "transportation",
      "filter": ["==", "class", "primary"],
      "paint": { "line-color": "#ffffff",
                 "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.2, 18, 7.0] } },
    { "id": "roads-motorway-casing", "type": "line", "source": "osm", "source-layer": "transportation",
      "filter": ["==", "class", "motorway"],
      "paint": { "line-color": "#c98a26",
                 "line-width": ["interpolate", ["linear"], ["zoom"], 7, 2.0, 18, 14.0] } },
    { "id": "roads-motorway", "type": "line", "source": "osm", "source-layer": "transportation",
      "filter": ["==", "class", "motorway"],
      "paint": { "line-color": "#fbb03b",
                 "line-width": ["interpolate", ["linear"], ["zoom"], 7, 1.0, 18, 12.0] } },
    { "id": "railway-tram", "type": "line", "source": "osm", "source-layer": "transportation",
      "filter": ["==", "subclass", "tram"],
      "paint": { "line-color": "#ffd700",
                 "line-width": ["interpolate", ["linear"], ["zoom"], 12, 1.2, 18, 3.5] } },
    { "id": "railway-metro", "type": "line", "source": "osm", "source-layer": "transportation",
      "filter": ["==", "subclass", "subway"],
      "paint": { "line-color": "#ed1c24",
                 "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 18, 4.5] } },
    { "id": "boundary-country", "type": "line", "source": "osm", "source-layer": "boundary",
      "filter": ["==", "admin_level", 2],
      "paint": { "line-color": "#9a9a9a", "line-width": 1.2, "line-dasharray": [4, 2] } },
    { "id": "poi-icons", "type": "symbol", "source": "osm", "source-layer": "poi",
      "minzoom": 14,
      "layout": { "icon-image": "{class}_16", "icon-size": 1.0,
                  "text-field": ["get", "name"], "text-size": 11,
                  "text-anchor": "top", "text-offset": [0, 1.2],
                  "text-font": ["Inter Semibold"] },
      "paint": { "text-color": "#212121",
                 "text-halo-color": "#f8f8f8", "text-halo-width": 1.5 } },
    { "id": "labels-streets", "type": "symbol", "source": "osm", "source-layer": "transportation_name",
      "minzoom": 13,
      "layout": { "text-field": ["get", "name"], "symbol-placement": "line",
                  "text-letter-spacing": 0.04,
                  "text-size": ["interpolate", ["linear"], ["zoom"], 13, 10, 18, 13],
                  "text-font": ["Inter Semibold"] },
      "paint": { "text-color": "#5b5147",
                 "text-halo-color": "#ffffff", "text-halo-width": 1.25 } },
    { "id": "labels-cities", "type": "symbol", "source": "osm", "source-layer": "place",
      "filter": ["in", "class", "city", "town"],
      "layout": { "text-field": ["get", "name"],
                  "text-size": ["interpolate", ["linear"], ["zoom"], 7, 10, 14, 15],
                  "text-font": ["Inter Bold"] },
      "paint": { "text-color": "#212121",
                 "text-halo-color": "#ffffff", "text-halo-width": 1.5 } }
  ]
}
```

---

## 13. Acceptance criteria (the QA gate)

A new style or theme PR is accepted only when **all of the following** hold:

1. The four themes (Minimal, Nature, Dark, DLC) all render the same OSM data set without any Tier-1 or Tier-2 feature being hidden at its required zoom.
2. WCAG AA contrast holds for every label class at every zoom in every theme.
3. The performance budgets in section 10.6 are met on the reference devices.
4. The DLC theme passes the data-completeness test: a user blindfolded into the DLC theme can still find a pharmacy, a tram stop, and a school within 10 seconds on a city block view.
5. The color-blind variants are reachable through one click in the theme switcher.
6. `prefers-reduced-motion` disables every animation.
7. The style JSON validates against `@mapbox/mapbox-gl-style-spec` with zero errors and zero warnings.
8. Sprite and glyph budgets in section 10 are met.
9. The OSM attribution is present and legible at every zoom and on every screen size.
10. No layer in Tier 1–4 was removed compared to the previous style version (a strict diff guard runs in CI).

---

## 14. Glossary

- **OSM** — OpenStreetMap, the data source.
- **PMTiles** — single-file vector tile archive format from Protomaps.
- **Sprite sheet** — packed image of all map icons.
- **Glyph PBF** — protobuf-encoded font range for a vector tile renderer.
- **Tier (1–5)** — the priority pyramid level a feature belongs to.
- **DLC** — "downloadable content"-style cosmetic theme; the maximalist Brand theme.
- **Band (A–E)** — zoom-level grouping used by this spec.
- **WCAG AA** — Web Content Accessibility Guidelines, level AA, the contrast target.
- **lcn/rcn/ncn/icn** — local/regional/national/international cycle network, OSM route relation network classes.

---

## 15. Closing note

This document is the **constitution** for every map surface Panellako ships. Any agent — human or AI — that touches the map style must read it end-to-end before opening the renderer. If you find a need that violates a rule here, the answer is to **amend this spec** (with a versioning entry, a marketing-value entry, and a CHANGELOG bump), not to silently break the rule in a style JSON. Maps are the highest-trust UI we ship — let's keep that trust.

— end of spec —
