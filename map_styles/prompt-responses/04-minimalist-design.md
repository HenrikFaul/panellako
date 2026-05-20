# 1. Bevezetés: minimalista térkép definíció

A „minimalista térkép" nem azt jelenti, hogy kevés adat van rajta. Azt jelenti, hogy **minden megjelenített adat szükséges, és semmi felesleges nem terheli a vizuális csatornát.** A jó minimalista térképen az első tekintet a releváns információra esik, nem az ornamentikára.

Nagy adathalmaz esetén ez a legfontosabb feszültség: a térkép maga tudna 500 réteget megjeleníteni, de a felhasználó csak 5-öt keres. A megoldás nem az adattörlés, hanem a **vizuális hierarchia**.

## Miben különbözik a minimalista a „sötét/üres" dizájntól?

| Minimalista | „Sihu" (túlminimalista) |
|------------|------------------------|
| Minden Tier 1 navigációs elem látható | Utak, vonalak eltávolítva „vizuális tisztaság" érdekében |
| Tipográfia kontrasztos, olvasható | Halvány, kis betűk |
| Egy fókuszált adatréteg a basemap fölé | Semmilyen adat, csak háttérszín |
| A felhasználó azonnal megtalálja a keresett infót | A térkép „szép", de nem kommunikál |

---

# 2. Adat-szűrési és aggregációs technikák

## Clustering

**Mikor:** sok pontszerű adat (POI, események, tranzakciók) alacsony zoomnál.

**Hogyan:** a MapLibre GL / Leaflet.markercluster a szomszédos pontokat egyetlen jelölővé vonja össze, amelyhez a darabszám van kiírva.

**Mikor érdemes:**
- >200 pont / képernyő esetén mindig
- Heatmap alternatívája, ha az egyedi pontok fontos attribútumot hordoznak

## Level-of-Detail (LOD)

**Mikor:** hierarchikus adatstruktúra (kerület → körülbelül → utca szint).

**Hogyan:** zoom-szinthez kötött `minzoom` / `maxzoom` rétegeken minden adatcsoport külön rétegen szerepel; kisebb zoom csak az összefoglaló aggregátumot mutatja.

**Példa:**
- z10: csak kerületenkénti átlagszám (choropleth)
- z14: utcánkénti részletes POI-ok
- z17: egyedi épületek számai

## Dynamic show-hide

**Mikor:** felhasználó által vezérelhető rétegek (kékpárút-típus szűrő, POI kategória toggle).

**Hogyan:** `map.setLayoutProperty(layerId, 'visibility', 'visible' | 'none')`.

**Teljesítmény:** ez nem újrarenderelés, csak GPU-pipelinen a réteg kihagyása — azonnali.

---

# 3. Vizuális hierarchia

## Szintek

1. **Core-navigation (Tier 1):** Utak, vasutak, tranzitmegállók — mindig látható, teljes opacitás, maximális label-prioritás.
2. **Secondary-info (Tier 2):** POI ikonok (kórház, iskola, gyógyszertár) — z14+ felett látható.
3. **Tertiary-info (Tier 3):** Kerületi határok, irányítószám-területek — halvány dashed vonal.
4. **Overlay-data (saját réteg):** Heatmap, choropleth, route highlight — max. 0.45 opacity.
5. **Purely-decorative (Tier 5):** Háttér-textúra, vignette, glow — max. 0.15 opacity.

## Line-width és color hierarchia követése

- **Motorway:** legvastagabb (5–12 px), legtelítettebb szín (amber `#fbb03b`)
- **Primary:** közepes (3–7 px), fehér
- **Residential:** vékony (1.5–4 px), halványszürke
- **Path/footway:** hairline (0.8–1.8 px), szaggatott

**Aranyszabály:** a vonalvastagság és a szín telítettsége arányos az út fontosságával. Ugyanez az elv a label font-weight-re is igaz (motorway: 700, residential: 400).

## Transparency használata

- Overlay rétegek: 0.30–0.45 opacity
- Terület kitöltések (parks, buildings): 0.50–0.85
- Dekoráció: max. 0.15
- Navigációs adatok: 1.0 (soha nem átlátszó)

## Label-priority

```json
"symbol-sort-key": ["*", ["get", "importance"], 1000]
```

Magas fontossági szám = label jobban megmarad ütközéskor. A Tier 1 elemek kapják a legmagasabb sort-key-t.

---

# 4. Szín- és betűpaletta

## Minimalista szín-elvek

1. **Semleges alap** — `#f8f8f8` (fehér közel), `#10172a` (sötétkék) — a térkép maga ne „kiáltson"
2. **Egy hangsúlyos szín** — a brand teal, a ciklista zöld, a tranzit amber — ez az egyetlen telített elem
3. **Desaturált funkcionális szürkeárnyalat-skála** — utak, épületek, határok mind szürkék, nem tarka
4. **Maximális fehér/fekete a labeleknek** — 4.5:1 kontraszt WCAG AA

## Minimalista paletta (Panellako Minimal Urban)

```
Canvas:     #f8f8f8  (semleges fehér)
Land:       #f1f1ee  (törtfehér)
Water:      #a0d8f1  (halvány pasztell cián)
Park:       #c8e6c9  (halvány menta)
Roads:      #ffffff / #fdfdfb  (fehér/törtfehér)
Motorway:   #fbb03b  (amber — egyetlen telített elem)
Buildings:  #e2dfd9  (beige-szürke)
Labels:     #212121  (szinte fekete)
Halo:       #ffffff  (fehér)
```

## Betű-elvek

- **Sans-serif** (Inter, Roboto, Segoe UI) — semmi díszítő serif
- **Font weight:** 400 (residential) → 500 (secondary) → 600 (city) → 700 (motorway)
- **Méret:** 9–15 px között zoom-alapon
- **Letter-spacing:** 0.04 em utcacímkéknél (line placement segít az olvashatóságon)
- **Soha ne legyen small-caps** dekoratív szövegeken — csak UPPERCASE neighborhood labeleken (0.12 em spacing)

---

# 5. Példák

## A) Minimal Urban Navigation (Panellako default)

**Rétegek:**
- Canvas: `#f8f8f8`
- Parks → Water → Buildings → Roads (residential–motorway) → Railways → POI → Labels
- Overlay: nulla

**Szűrők:** nincs LOD — minden útosztály látható z13+
**Hierarchia:** motorway amber telített, minden más szürke/fehér
**Label:** Inter Semibold, fehér halo

## B) Minimal Public Transport Map

**Rétegek:**
- Canvas: `#f8f8f8`
- Parks (halvány, 0.4 opacity) → Water → Buildings (0.3 opacity) → Roads (halványszürke, vékony)
- **Tranzit rétegek:** metro piros, tram arany, bus kék — vastagítva, kiemelve
- POI: csak tranzitmegállók + kórházak
- Labels: csak tranzitmegálló nevek + városrész nevek

**LOD:** z11-en csak vonalak (route), z13+ megállók is, z15+ feliratok és kapujelölők

## C) Minimal POI Heatmap

**Rétegek:**
- Canvas: `#f0f5f0` (természet téma)
- Parks → Water → Roads (nagyon halvány, 0.4 opacity)
- **Overlay:** POI heatmap (pharmaciák / iskolák sűrűsége) — teal→sárga→piros skála
- POI ikonok: csak z16+ felett (ne versenyezzenek a heatmap-pel)

**Adat-szűrés:** csak 1 kategória egyszerre (kategória toggle a UI-ban)
**z-rend:** heatmap az épületek fölé, de minden label alá

---

# 6. Minimalista design-checklist

1. ☐ Minden Tier 1 navigációs elem látható az adott zoom-szinten?
2. ☐ Az egyetlen „kiabáló" szín (accent) legfeljebb 1–2 kategória?
3. ☐ A motorway–residential vonalvastagság és szín legalább 3 lépcsőn fokozatos?
4. ☐ Minden label WCAG AA kontrasztú (4.5:1) a helyi háttérrel?
5. ☐ Az overlay max. 0.45 opacity-val bír, a basemap látszik alatta?
6. ☐ Van clustering z<13-on, ha >200 pont van egy képernyőn?
7. ☐ A dekoratív effektek (blur, glow, vignette) max. 0.15 opacity?
8. ☐ `prefers-reduced-motion` letiltja az összes animációt?
9. ☐ Nincs 2 egyforma saturáltságú szín a palettán (csak 1 accent, a többi neutrális)?
10. ☐ A label-density max 1 felirat / 80×80 px régión z9–12 közt?
