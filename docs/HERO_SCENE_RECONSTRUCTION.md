# PANELLAKO HERO SECTION — TELJES REKONSTRUKCIÓS DOKUMENTÁCIÓ

**Verzió:** v0.7.15 (DashboardHeroScene) + v1.0.0 (HeroVehicle)  
**Utolsó frissítés:** 2026-05-24  
**Célrendszer:** Next.js 14 App Router, TypeScript, Tailwind CSS, inline SVG + CSS keyframes  
**Fájlok:** `components/dashboard-hero-scene.tsx`, `components/HeroVehicle.tsx`, integráció: `components/dashboard-client.tsx`

---

## 1. ÁTTEKINTÉS ÉS DESIGN ELVEK

A dashboard hero szekció egy önálló, animált SVG-jelenet, amely a PanelLakó alkalmazás főoldalán a fejléc középső részét tölti ki. A jelenet valós időben reagál a napszakra és az évszakra — a felhasználó bármikor ránézhet a dashboardra, és azonnal érzékeli, hogy milyen napszak van, milyen évszak, milyen az időjárás hangulata. Ez az „élő város" visszajelzés erősíti a termék emlékképét.

### 1.1 Tervezési célok (Crazy Innovations elv)

- **Ambient „élő város" visszajelzés:** a jelenet napszak- és évszakfüggő — reggel más égbolt, este más, tél más, nyár más.
- **Nulla új függőség:** tiszta CSS keyframes + inline SVG, semmilyen külső animációs könyvtár.
- **GPU-barát animáció:** kizárólag `transform` és `opacity` animálódik; a véletlenszerűség memorizált (mount-stable PRNG), tehát nem keletkeznek layout-thrashing újraszámítások.
- **`prefers-reduced-motion` tisztelet:** ha a rendszerszintű mozgáscsökkentési beállítás aktív, a jelenet rendereli a helyes palettát és sziluetteket, de minden mozgás lefagy.
- **Önálló:** semmilyen globális CSS nem szivárog ki; minden keyframe egy `<style>` tagben él a komponens subtree-jén belül.
- **Teljesítménykorlát:** ≤30 KB komponens, 2–5 s animációs intervallumok, a belső tram csak 25–45 s-enként spawn-ol újra.

### 1.2 Fájlstruktúra

```
components/
  dashboard-hero-scene.tsx   — SVG jelenet: égbolt, épületek, fák, csillagok, hold, stb.
  HeroVehicle.tsx            — Jármű-overlay: 6 jármű animált rotációja
```

A `dashboard-client.tsx` mindkét komponenst importálja és a hero header közepén rendereli.

---

## 2. NAPSZAK-RENDSZER (TimeOfDay)

### 2.1 Napszak-típus definíció

```typescript
export type TimeOfDay =
  | 'dawn'       // 5–7 óra: hajnal
  | 'morning'    // 7–10 óra: reggel
  | 'day'        // 10–16 óra: nappal
  | 'afternoon'  // 16–19 óra: délután
  | 'sunset'     // 19–21 óra: naplemente
  | 'evening'    // 21–23 óra: este
  | 'night';     // 23–4 óra: éjszaka (kizárással: minden más óra)
```

### 2.2 Napszak-érzékelő függvény

```typescript
export function detectTimeOfDay(date: Date = new Date()): TimeOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 7) return 'dawn';
  if (h >= 7 && h < 10) return 'morning';
  if (h >= 10 && h < 16) return 'day';
  if (h >= 16 && h < 19) return 'afternoon';
  if (h >= 19 && h < 21) return 'sunset';
  if (h >= 21 && h < 23) return 'evening';
  return 'night';
}
```

**Logika:** a böngésző helyi idejét veszi alapul (`new Date()`), az egész óra értékét vizsgálja (`getHours()`). Az éjszaka az egyetlen "maradék" ág, amely lehatárolatlan és lefedi a 23-tól 4:59-ig tartó teljes sávot.

### 2.3 Napszak reaktivitás

A komponensen belül a napszak egy React state-ben él, amelyet egy `setInterval` frissít percenként:

```typescript
const [tod, setTod] = useState<TimeOfDay>(() => forceTimeOfDay ?? detectTimeOfDay());

useEffect(() => {
  if (forceTimeOfDay) {
    setTod(forceTimeOfDay);
    return;
  }
  setTod(detectTimeOfDay());
  const id = setInterval(() => setTod(detectTimeOfDay()), 60_000);
  return () => clearInterval(id);
}, [forceTimeOfDay]);
```

- Az inicializálás (`useState` initializer function) szinkron: az első render azonnal a helyes napszakot kapja.
- Ha `forceTimeOfDay` prop be van állítva (pl. preview/testing céljából), az override felülírja a detekciót és letiltja az intervalt.
- Percenkénti frissítés (`60_000 ms`) elegendő, mert a napszakhatárok egész órákon vannak.

A `dashboard-client.tsx`-ben párhuzamosan fut egy `heroTod` state, amelyet szintén `setInterval(60_000)` frissít, és kizárólag a fejléc háttérgradiens számításához szükséges:

```typescript
const [heroTod, setHeroTod] = useState<HeroTimeOfDay>(() => heroDetectTod());
useEffect(() => {
  const id = setInterval(() => setHeroTod(heroDetectTod()), 60_000);
  return () => clearInterval(id);
}, []);
const heroAmbient = heroSkyGradient(heroTod).mid;
```

---

## 3. ÉVSZAK-RENDSZER (Season)

### 3.1 Évszak-típus definíció

```typescript
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
```

### 3.2 Évszak-érzékelő függvény

```typescript
export function detectSeason(date: Date = new Date()): Season {
  const m = date.getMonth(); // 0–11 (JS Date, január = 0)
  if (m >= 2 && m <= 4) return 'spring';  // március, április, május
  if (m >= 5 && m <= 7) return 'summer';  // június, július, augusztus
  if (m >= 8 && m <= 10) return 'autumn'; // szeptember, október, november
  return 'winter';                          // december, január, február
}
```

### 3.3 Évszak stabilitás

Az évszak nem változik egy dashboard-munkamenet alatt, ezért `useMemo`-ban van:

```typescript
const season: Season = useMemo(
  () => forceSeason ?? detectSeason(),
  [forceSeason]
);
```

---

## 4. ÉG GRADIENS PALETTÁI (skyGradient)

A `skyGradient()` függvény az összes 7 napszakhoz definiálja az égbolt lineáris gradiensét: `from` (felső szín), `mid` (középszín) és `to` (alsó szín), valamint a `midOffset` (a középszín százalékos pozíciója a gradiensben).

```typescript
export function skyGradient(tod: TimeOfDay): { from: string; mid: string; to: string; midOffset: number }
```

### 4.1 Hajnal (`dawn`)

```
from:      #ea580c  (mély narancsvörös)
mid:       #fbbf24  (arány-sárga)
to:        #fed7aa  (halvány barack)
midOffset: 35%
```

### 4.2 Reggel (`morning`)

```
from:      #fbbf24  (meleg sárga)
mid:       #fde68a  (halvány sárga)
to:        #fef3c7  (krémszínű)
midOffset: 50%
```

### 4.3 Nappal (`day`)

```
from:      #38bdf8  (élénk égkék)
mid:       #7dd3fc  (halvány égkék)
to:        #bae6fd  (nagyon halvány kék)
midOffset: 55%
```

### 4.4 Délután (`afternoon`)

```
from:      #fde68a  (halványsárga)
mid:       #fbbf24  (arány)
to:        #fef3c7  (krémszínű)
midOffset: 50%
```

### 4.5 Naplemente (`sunset`)

```
from:      #ea580c  (narancsvörös)
mid:       #f97316  (narancs)
to:        #fed7aa  (halvány barack)
midOffset: 35%
```

### 4.6 Este (`evening`)

```
from:      #1e1b4b  (mélykék-indigo)
mid:       #312e81  (indigo)
to:        #4338ca  (vibráns indigo)
midOffset: 55%
```

### 4.7 Éjszaka (`night`)

```
from:      #010610  (majdnem fekete kék)
mid:       #040e24  (nagyon sötét kék)
to:        #0d2248  (sötét tengerészkék)
midOffset: 40%
```

### 4.8 Az égbolt SVG-ben való alkalmazása

```xml
<linearGradient id="phs-sky" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%"                  stopColor={sky.from} />
  <stop offset={`${sky.midOffset}%`} stopColor={sky.mid} />
  <stop offset="100%"                stopColor={sky.to} />
</linearGradient>

<rect x="0" y="-20" width="418" height="138" fill="url(#phs-sky)" />
```

Az SVG viewBox `"0 -20 418 138"` — az y=-20 extra teret ad az égbolt tetején.

---

## 5. ÉPÜLET PALETTA RENDSZER (buildingPalette)

Az épületek színezete a napszak alapján 3 variáns között vált.

```typescript
function buildingPalette(tod: TimeOfDay): {
  topFill: string;     // épület felső kitöltési szín
  bottomFill: string;  // épület alsó kitöltési szín
  pilaster: string;    // függőleges pillérek szín
  slab: string;        // vízszintes vasbeton övek szín
  rim: string;         // jobb oldali fény-visszaverő szín
  litWarm: string;     // meleg (sárgas) megvilágított ablak szín
  litCool: string;     // hűvös kék megvilágított ablak szín
  windowDark: string;  // sötét (kikapcsolt) ablak szín
  ground: string;      // talajelső vonal szín
}
```

### 5.1 Nappali paletta (day / morning / afternoon)

```
topFill:    #cbd5e1  (slate-300)
bottomFill: #94a3b8  (slate-400)
pilaster:   #94a3b8
slab:       #64748b  (slate-500)
rim:        #475569  (slate-600)
litWarm:    #f7c873
litCool:    #7fb6e8
windowDark: #334155  (slate-700)
ground:     #475569
```

### 5.2 Hajnali / naplementi paletta (dawn / sunset)

```
topFill:    #7c2d12  (orange-900)
bottomFill: #431407
pilaster:   #431407
slab:       #7c2d12
rim:        #fbbf24  (arany)
litWarm:    #fde047
litCool:    #fb923c  (narancs)
windowDark: #1c1917  (stone-900)
ground:     #451a03  (orange-950)
```

### 5.3 Éjszakai / esti paletta (evening / night)

```
topFill:    #10182a
bottomFill: #070a14
pilaster:   #14202e
slab:       #1b2d44
rim:        #4a7ab5
litWarm:    #f7c873
litCool:    #7fb6e8
windowDark: #0a0f1c
ground:     #2a5080
```

---

## 6. SVG JELENET GEOMETRIÁJA

### 6.1 ViewBox és koordináta-rendszer

```
viewBox: "0 -20 418 138"
preserveAspectRatio: "none"
GROUND konstant: y = 118
```

### 6.2 Négy épület pontos specifikációja

```typescript
const buildings = [
  { x: 4,   top: 29, w: 86,  cols: 4, rows: 6, chimneys: [16, 58]           },
  { x: 94,  top: 3,  w: 122, cols: 6, rows: 8, chimneys: [16, 56, 100], antenna: true },
  { x: 220, top: 16, w: 104, cols: 5, rows: 7, chimneys: [18, 80]           },
  { x: 328, top: 42, w: 86,  cols: 4, rows: 5, chimneys: [14, 62]           },
];
```

| # | x | top | w | magasság | cols | rows | ablakok | antenna |
|---|---|-----|---|----------|------|------|---------|---------|
| 0 | 4 | 29 | 86 | 89 | 4 | 6 | 24 | ✗ |
| 1 | 94 | 3 | 122 | 115 | 6 | 8 | 48 | ✓ |
| 2 | 220 | 16 | 104 | 102 | 5 | 7 | 35 | ✗ |
| 3 | 328 | 42 | 86 | 76 | 4 | 5 | 20 | ✗ |

### 6.3 Ablakrács matematikája

```typescript
const winW = 12;   // ablak szélessége
const winH = 8;    // ablak magassága
const gapX = 6;    // vízszintes ablakköz
const gapY = 5;    // függőleges ablakköz
const padX = 10;   // vízszintes padding az épület szélén
const padTop = 10; // függőleges padding a tetőtől

// Ablak koordináták:
const wx = b.x + padX + c * (winW + gapX);  // = b.x + 10 + c * 18
const wy = b.top + padTop + r * (winH + gapY); // = b.top + 10 + r * 13
```

**Determinisztikus megvilágítás:**

```typescript
const seed    = bi * 37 + r * 17 + c * 11;
const lit     = seed % 10 < 7;        // ~70% megvilágított
const warm    = (seed * 3) % 10 < 8;  // ~80% meleg, ~20% hűvös
const flicker = (seed * 7) % 11 < 4;  // ~36% villog
```

**Flicker animáció:**

```typescript
animation: `panellako-flicker ${4 + (i % 5)}s ease-in-out ${(i % 7) * 0.7}s infinite`
// Időtartam: 4–8 s, delay: 0–4.2 s
```

**Ablak opacity:**
- Meleg lit ablak: `fillOpacity=0.92`
- Hűvös lit ablak: `fillOpacity=0.55`
- Sötét ablak: `fillOpacity=0.6`
- `rx="1"` lekerekített sarok

### 6.4 Kémények

```typescript
const ch = 9 + (ci % 2) * 5;  // alternáló magasság: 9 vagy 14 egység
// Törzs: width=5, height=ch, x = b.x + off - 2.5, y = b.top - ch
// Sapka:  width=7, height=2,  x = b.x + off - 3.5, rx=0.3
```

### 6.5 Antenna (csak épület 1)

```
Rúd:  x = b.x + b.w/2, y1 = b.top-19 → b.top, strokeWidth=1
Szár1: ±9 egység, y = b.top-14, strokeWidth=0.8
Szár2: ±5 egység, y = b.top-9,  strokeWidth=0.8
Piros jelzőfény: r=1.5, fill="#e03030", fillOpacity=0.65, y = b.top-20
Csoport opacity: 0.75
```

### 6.6 Jobb oldali fény-határ (rim)

```xml
<linearGradient id="phs-rim" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0%"   stopColor={palette.rim} stopOpacity="0" />
  <stop offset="100%" stopColor={palette.rim} stopOpacity="0.45" />
</linearGradient>
<!-- Sáv: x = b.x + b.w - 1.5, width=1.5, height=bH -->
```

### 6.7 Talaj

```xml
<rect x="0" y={GROUND}   width="418" height="2"  fill={palette.ground}     fillOpacity="0.7" />
<rect x="0" y={GROUND+2} width="418" height="18" fill={palette.bottomFill} fillOpacity="0.35" />
```

### 6.8 Horizont glória

```xml
<ellipse cx="209" cy="138" rx="200" ry="48" fill="url(#phs-horizon)" />
<!-- day: #bae6fd | night: #1a4a8a | egyébként: #fde68a; stopOpacity="0.5" -->
```

---

## 7. DETERMINISZTIKUS PRNG (mulberry32)

```typescript
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = useMemo(() => mulberry32(1337), []);
```

**Seed: 1337 — fix.** A hívási sorrend kritikus (változtatás eltolna minden elemet):

1. `stars` (38 × 5 = 190 hívás)
2. `constellations` (3 × 12 ≈ 39 hívás)
3. `snowflakes` (22 × 5 = 110 hívás)
4. `leaves` (7 × 5 = 35 hívás)
5. `clouds` (3 × 4 = 12 hívás)

---

## 8. ÉJSZAKAI ÉG ELEMEI

### 8.1 Csillagmező (38 csillag)

```typescript
Array.from({ length: 38 }, (_, i) => ({
  cx:              rng() * 418,        // x: teljes szélesség
  cy:              rng() * 70,         // y: csak az égbolt felső 70 egységén
  r:               0.4 + rng() * 1.4, // sugár: 0.4–1.8
  opacity:         0.4 + rng() * 0.5, // bázis opacity: 0.4–0.9
  twinkleDelay:    rng() * 5,          // 0–5 s
  twinkleDuration: 2 + rng() * 4,     // 2–6 s
}))
```

Szín: `#fef3c7` (meleg fehér). Megjelenítési feltétel: `tod === 'night' || tod === 'evening'`.

CSS animáció: `panellako-twinkle ${twinkleDuration}s ease-in-out ${twinkleDelay}s infinite`

`--star-base-op` CSS custom property-vel (egyéni bázis opacity-hoz):

```css
@keyframes panellako-twinkle {
  0%, 100% { opacity: var(--star-base-op, 0.7); }
  50%      { opacity: 0.15; }
}
```

### 8.2 Csillagképek (3 forgó klaszter)

```typescript
Array.from({ length: 3 }, (_, i) => ({
  cx:       60 + i * 130 + rng() * 20,  // ~60, ~190, ~320
  cy:       12 + rng() * 18,             // 12–30
  pts:      Array.from({ length: 5 }, () => ({
    x: (rng() - 0.5) * 14,   // ±7
    y: (rng() - 0.5) * 8,    // ±4
  })),
  duration: 10 + rng() * 8,  // 10–18 s
}))
```

```css
@keyframes panellako-rotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```

`transformBox: 'fill-box'` + `transformOrigin: '${c.cx}px ${c.cy}px'` a forgatáshoz.

### 8.3 Hullócsillag (30 s-es ciklus)

```xml
<line x1="40" y1="14" x2="50" y2="16" stroke="#fef3c7" strokeWidth="0.8" strokeLinecap="round" opacity="0" />
```

```css
@keyframes panellako-shoot {
  0%   { transform: translate(0,0);        opacity: 0; }
  5%   {                                   opacity: 1; }
  25%  {                                   opacity: 1; }
  40%  { transform: translate(80px, 28px); opacity: 0; }
  100% { transform: translate(80px, 28px); opacity: 0; }
}
/* Látható 1.5–7.5 s között a 30 s ciklusból */
```

---

## 9. NAP ÉS HOLD

```typescript
function isNightish(tod: TimeOfDay): boolean {
  return tod === 'evening' || tod === 'night';
}
const showSun  = !isNightish(tod);
const showMoon =  isNightish(tod);
```

**Pozíció (cx=362 fix, y napszaktól):**

| Napszak | sunY |
|---------|------|
| dawn | 92 |
| morning | 40 |
| day | 18 |
| afternoon | 38 |
| sunset | 92 |
| evening/night (hold) | 18 |

**Elemek:**

```xml
<!-- Glória (r=22) -->
<circle cx={362} cy={sunY} r="22" fill="url(#phs-celestial-glow)" />
<!-- Égitest (nap: r=9, hold: r=7) -->
<circle cx={362} cy={sunY} r={showMoon ? 7 : 9}
        fill={showMoon ? '#fef3c7' : '#fde047'}
        opacity={showMoon ? 0.95 : 1} />
<!-- Hold kráterek (csak hold esetén) -->
<circle cx={359} cy={sunY-1.5} r="1.2" fill="#fde68a" opacity="0.55" />
<circle cx={364} cy={sunY+2}   r="0.9" fill="#fde68a" opacity="0.45" />
```

**phs-celestial-glow gradiens:** hold esetén `#fef3c7`, nap esetén `#fde047`; stopOpacity: 0.55 → 0.15 → 0.

---

## 10. FELHŐK

**Megjelenítési feltétel:** `tod !== 'night' && tod !== 'evening'`

```typescript
Array.from({ length: 3 }, (_, i) => ({
  baseY:    18 + i * 12 + rng() * 6,   // ~18, ~30, ~42
  duration: 50 + rng() * 30,            // 50–80 s
  delay:    -rng() * 50,                // negatív = véletlenszerű kezdőpozíció
  opacity:  0.55 + rng() * 0.35,        // 0.55–0.90
  scale:    0.8 + rng() * 0.5,          // 0.8–1.3×
}))
```

```css
@keyframes panellako-cloud {
  0%   { transform: translateX(440px); }
  100% { transform: translateX(-160px); }
}
/* Jobbról balra, 600 egység út, 50–80 s */
```

**Felhő forma (3 ellipszis):**

```xml
<ellipse cx="0"  cy="0"  rx="14" ry="5"   fill="#ffffff" opacity="0.85" />
<ellipse cx="10" cy="-2" rx="10" ry="4"   fill="#ffffff" opacity="0.80" />
<ellipse cx="-9" cy="1"  rx="8"  ry="3.5" fill="#ffffff" opacity="0.75" />
```

---

## 11. FÁKRENDSZER

### 11.1 3 fa-foglalat

```typescript
const treeSlots = [
  { x: 92,  scale: 0.9  },  // épület 0–1 között
  { x: 218, scale: 1.0  },  // épület 1–2 között (referencia)
  { x: 326, scale: 0.85 },  // épület 2–3 között
];
```

**Rajzolási sorrend:** fák az épületek ELŐTT (az épületek takarják a fák elejét — mélység).

### 11.2 Fa alapgeometria

```typescript
const trunkH   = 14 * scale;
const trunkW   = 3  * scale;
const trunkTop = groundY - trunkH;  // groundY = 118
const canopyR  = 9  * scale;
const canopyCy = trunkTop - 2;
```

### 11.3 Téli fa

```xml
<!-- Sötétbarna törzs (#3f2410) -->
<!-- 4 kopasz ág (strokeWidth: 1.2 és 1.0) -->
<!-- Hósapkák: 2 fehér kör az ágak végén -->
```

### 11.4 Lombos fa (spring / summer / autumn)

| Évszak | canopyMain | canopyShadow | Törzs |
|--------|-----------|-------------|-------|
| spring | `#4ade80` | `#22c55e` | `#7c3a14` |
| summer | `#16a34a` | `#15803d` | `#7c3a14` |
| autumn | `#ea580c` | `#b45309` | `#7c3a14` |

**3 rétegű ellipszis lombkorona:**

```xml
<ellipse cx={x}   cy={canopyCy}   rx={canopyR+1}   ry={canopyR*0.75} fill={canopyShadow} opacity="0.85" />
<ellipse cx={x-2} cy={canopyCy-1} rx={canopyR*0.8} ry={canopyR*0.65} fill={canopyMain} />
<ellipse cx={x+2} cy={canopyCy+1} rx={canopyR*0.7} ry={canopyR*0.55} fill={canopyMain} opacity="0.9" />
```

### 11.5 Őszi kiegészítők

```xml
<circle cx={x-3} cy={canopyCy-2} r={1.4*scale} fill="#dc2626" opacity="0.85" />
<circle cx={x+4} cy={canopyCy}   r={1.2*scale} fill="#facc15" opacity="0.85" />
<circle cx={x+1} cy={canopyCy+3} r={1.0*scale} fill="#f97316" opacity="0.85" />
```

### 11.6 Tavaszi virágzás

```xml
<circle cx={x-3} cy={canopyCy-2} r="1.3" fill="#fbcfe8" />  <!-- pink-200 -->
<circle cx={x+3} cy={canopyCy-1} r="1.1" fill="#fbcfe8" />
<circle cx={x}   cy={canopyCy+3} r="1.0" fill="#fbcfe8" />
<circle cx={x-5} cy={canopyCy+1} r="0.9" fill="#f9a8d4" />  <!-- pink-300 -->
<circle cx={x+5} cy={canopyCy+2} r="0.9" fill="#f9a8d4" />
```

### 11.7 Nyári pillangó (csak fa #1 — idx===1)

```tsx
<g className="panellako-anim"
   style={{ animation: 'panellako-twinkle 7s ease-in-out infinite' }}>
  {/* Bal szárny */}
  <path d={`M${x-1.5},${canopyCy-6} q-2,-2 -3,0 q2,2 3,0 z`} fill="#f472b6" opacity="0.85" />
  {/* Jobb szárny */}
  <path d={`M${x+1.5},${canopyCy-6} q2,-2 3,0 q-2,2 -3,0 z`}  fill="#f472b6" opacity="0.85" />
  {/* Test */}
  <line x1={x} y1={canopyCy-7} x2={x} y2={canopyCy-5} stroke="#1f2937" strokeWidth="0.5" />
</g>
```

---

## 12. ŐSZI HULLÓ LEVELEK

```typescript
Array.from({ length: 7 }, (_, i) => ({
  startX:   rng() * 418,
  color:    ['#f97316', '#dc2626', '#facc15', '#ea580c'][Math.floor(rng() * 4)],
  duration: 9 + rng() * 6,   // 9–15 s
  delay:    rng() * 14,       // 0–14 s
  drift:    12 + rng() * 18,  // 12–30 egység
  scale:    0.8 + rng() * 0.6, // 0.8–1.4×
}))
```

**Levél path:** `M0,0 Q3,-3 6,0 Q3,3 0,0 Z` (mandula alak, 6×3 egység)

```css
@keyframes panellako-leaf {
  0%   { transform: translate3d(0, -6px, 0) rotate(0deg);    opacity: 0; }
  12%  { opacity: 1; }
  88%  { opacity: 1; }
  100% { transform: translate3d(var(--drift, 14px), 138px, 0) rotate(540deg); opacity: 0; }
}
```

---

## 13. TÉLI HÓPELYHEK

```typescript
Array.from({ length: 22 }, (_, i) => ({
  startX:   rng() * 418,
  r:        0.7 + rng() * 1.1,  // 0.7–1.8
  duration: 9 + rng() * 8,      // 9–17 s
  delay:    rng() * 12,          // 0–12 s
  drift:    6 + rng() * 10,      // 6–16 egység
}))
```

**SVG:** `<circle cx="0" cy="0" r={s.r} fill="#ffffff" opacity="0.92" />`

```css
@keyframes panellako-snow {
  0%   { transform: translate3d(0, -8px, 0); opacity: 0; }
  10%  { opacity: 0.9; }
  90%  { opacity: 0.9; }
  100% { transform: translate3d(var(--drift, 8px), 138px, 0); opacity: 0; }
}
```

---

## 14. BELSŐ MINI-VILLAMOS

### 14.1 Spawn logika

```typescript
// Első spawn: 5–15 s után
const firstDelay = 5_000 + Math.random() * 10_000;
// Ismétlések: 25–45 s-enként
const delay = 25_000 + Math.random() * 20_000;

// tramKey növelése → React remount → CSS animáció újraindul
setTramKey((k) => k + 1);
```

Ha `tramKey === 0`: nincs villamos. Ha `hideTram={true}` prop: az egész blokk el van nyomva.

### 14.2 Megjelenési adatok

```typescript
const y         = groundY - 22;  // = 96 (tram alja a talalon)
const bodyFill  = '#fcd34d';      // BKK sárga (amber-300)
const bodyStroke= '#a16207';      // amber-700
const windowFill= nightish ? '#fef3c7' : '#bfdbfe';
const headlight = nightish ? '#fef9c3' : '#fef08a';
```

**Elemek:**
- Test: `80×18` rect, rx=2
- Tetőcsíka: `80×3` rect, `#a16207`, opacity=0.4
- 4 ablak: 14×8, x={4,22,40,58}, y=y+4
- Első fényszóró: `cx=76, cy=y+14, r=1.4`
- Ajtóvonal: x1=36, y1–y2: y+4 → y+16
- 2 kerék (bogie): cx={14,66}, cy=y+19, r=2.4 (sötét) + r=1 (szürke)
- Pantográf: 2 vonal x1={38,48}, y1=y-4 → x2={48,58}, y2=y

```css
@keyframes panellako-tram {
  0%   { transform: translateX(-100px); }
  100% { transform: translateX(440px); }
}
/* 11 s, linear, forwards */
```

---

## 15. CSS KEYFRAME ÖSSZEFOGLALÓ

```css
@keyframes panellako-twinkle {
  0%, 100% { opacity: var(--star-base-op, 0.7); }
  50%      { opacity: 0.15; }
}

@keyframes panellako-rotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes panellako-flicker {
  0%, 100% { opacity: 0.92; }
  47%      { opacity: 0.78; }
  51%      { opacity: 1.0; }
  54%      { opacity: 0.85; }
}

@keyframes panellako-cloud {
  0%   { transform: translateX(440px); }
  100% { transform: translateX(-160px); }
}

@keyframes panellako-tram {
  0%   { transform: translateX(-100px); }
  100% { transform: translateX(440px); }
}

@keyframes panellako-snow {
  0%   { transform: translate3d(0, -8px, 0); opacity: 0; }
  10%  { opacity: 0.9; }
  90%  { opacity: 0.9; }
  100% { transform: translate3d(var(--drift, 8px), 138px, 0); opacity: 0; }
}

@keyframes panellako-leaf {
  0%   { transform: translate3d(0, -6px, 0) rotate(0deg);    opacity: 0; }
  12%  { opacity: 1; }
  88%  { opacity: 1; }
  100% { transform: translate3d(var(--drift, 14px), 138px, 0) rotate(540deg); opacity: 0; }
}

@keyframes panellako-shoot {
  0%   { transform: translate(0,0);        opacity: 0; }
  5%   {                                   opacity: 1; }
  25%  {                                   opacity: 1; }
  40%  { transform: translate(80px, 28px); opacity: 0; }
  100% { transform: translate(80px, 28px); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .panellako-anim { animation: none !important; }
}
```

---

## 16. HEROVEHICLE OVERLAY RENDSZER

### 16.1 Járműkonfiguráció

```typescript
const VEHICLE_REGISTRY = {
  tram:     { Component: Tram,       width: 360, height: 36, duration: 26, layer: 'ground' },
  trolley:  { Component: Trolleybus, width: 260, height: 36, duration: 22, layer: 'ground' },
  bus:      { Component: Bus,        width: 220, height: 36, duration: 20, layer: 'ground' },
  cyclists: { Component: Cyclists,   width: 180, height: 32, duration: 32, layer: 'ground' },
  a380_to:  { Component: A380,       width: 280, height: 76, duration: 16, layer: 'sky', takeoff: true  },
  a380_ld:  { Component: A380,       width: 280, height: 76, duration: 16, layer: 'sky', takeoff: false },
};
```

### 16.2 Rotáció logika

```typescript
// Előző jármű kizárva a következő kiválasztásból
function pickRandomKind(exclude: VehicleKey | null): VehicleKey {
  const pool = VEHICLE_KEYS.filter(k => k !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Animáció befejezése után 1.2–2.6 s szünet, majd következő jármű
const onEnd = () => {
  setTimeout(() => {
    setKind(prev => pickRandomKind(prev));
    setSeq(s => s + 1);  // seq növelése: React remount → CSS animáció újraindul
  }, 1200 + Math.random() * 1400);
};
```

### 16.3 Elhelyezési logika

```tsx
<div
  key={seq}
  className="pointer-events-none absolute"
  style={{
    width: cfg.width, height: cfg.height,
    left: 0,
    ...(isSky ? { top: 4 } : { bottom: 4 }),
    animation: `${animName} ${cfg.duration}s linear`,
    animationFillMode: 'forwards',
    willChange: 'transform',
  }}
  onAnimationEnd={onEnd}
>
```

- Földi: `bottom: 4px`
- Légi: `top: 4px`
- `left: 0` mindig (az animáció tolja)

### 16.4 Jármű-animációk

```css
@keyframes vh-ground {
  0%   { transform: translateX(-440px); }
  100% { transform: translateX(calc(100vw + 80px)); }
}

@keyframes vh-a380-to {
  0%   { transform: translate(-300px,  70px) rotate(-7deg); }
  60%  { transform: translate(60vw,   -10px) rotate(-9deg); }
  100% { transform: translate(calc(100vw + 100px), -50px) rotate(-9deg); }
}

@keyframes vh-a380-ld {
  0%   { transform: translate(-300px, -50px) rotate( 7deg); }
  60%  { transform: translate(60vw,    30px) rotate( 9deg); }
  100% { transform: translate(calc(100vw + 100px), 80px) rotate(9deg); }
}
```

---

## 17. RÉSZLETES JÁRMŰLEÍRÁSOK

### 17.1 Villamos — CAF Urbos 5-szekciós

**SVG viewBox:** `"0 0 540 40"` | Konténer: 360×36 px | Idő: 26 s

**Sárga gradiens (`tramY`):**
```
0%:   #fde047 (yellow-300)
35%:  #fbd000 (BKK sárga)
80%:  #e0a800 (arány)
100%: #ca8a04 (amber-600)
```

**5 szekció:** Hátulsó kabin (ívelt) → Fújtató 1 → MID 1 (100px) → Fújtató 2 → MID CENTER (100px) → Fújtató 3 → MID 2 (100px) → Fújtató 4 → Első kabin (ívelt)

Fújtató méret: 8×25 px, 5 vonal, `bellows` gradiens.

**2 pantográf** (MID 1-en és MID 2-en): V-alak + vízszintes kontaktrúd + kontaktpont (`#fff3c4` + `#ffffff`)

**Vonalkijelző:** `"17"` — mindkét kabinon

**7 bogie:** x = `[60, 138, 188, 272, 356, 406, 480]`

Minden bogie: 16×2.8 alap-rect + 2 kerék (r=2.6, `#0a0e1a`) + 2 belső (r=1, `#52525b`)

**Fényszórók:** cx={12, 532}, cy=29, r={3, 1.7, 1} rétegek

**Ablaksávok:** 3×96 px (`winBand` gradiens, y=11, height=9.5)

**Gloss highlights:** ívelt fehér vonalak a tetőn

### 17.2 Trolibusz — Solaris-Trollino 18

**SVG viewBox:** `"0 0 380 42"` | Konténer: 260×36 px | Idő: 22 s

**Piros gradiens (`troBody`):** `#ef4444 → #dc2626 → #7f1d1d`

**2 szekció:** Hátulsó (172px) + Fújtató (6px, 4 vonal) + Első (ívelt vég)

**Trolipálcák:** 2 drót (`y=2` és `y=3.5`), kontaktpont `#fff3c4`

**BKK sárga csík:** `y=21.4, height=1.6, fill="#fbbf24"` — mindkét szekción

**Vonalkijelző:** `"72"`

**5 kerék:** x = `[28, 156, 230, 320, 358]`, r={3.8, 2, 0.9}

**Ablaksávok:** 2 sor (hátulsó: 9 ablak, első: 7 ablak) — `troLit` gradiens

### 17.3 Autóbusz — Mercedes-Benz Citaro

**SVG viewBox:** `"0 0 320 40"` | Konténer: 220×36 px | Idő: 20 s

**Kék gradiens (`busBody`):** `#38bdf8 → #0ea5e9 → #075985`

**Test:** szögletes hát, ívelt első vég

**3 ajtó:** x = `[14, 110, 210]`, fehér (`#f1f5f9`)

**13 ablak:** x/szélesség/opacity lista (megvilágított, `busLit` gradiens)

**Mercedes csillag:** r=2.4 kör + 3 vonal (csillag forma)

**Vonalkijelző:** `"105"`

**Fehér csík:** `y=21, height=1.2, fill="#f1f5f9"`

**2 kerék:** x = `[42, 240]`, r={3.6, 1.9, 0.8}

### 17.4 Kerékpárosok — 3 versenyző

**SVG viewBox:** `"0 0 220 36"` | Konténer: 180×32 px | Idő: 32 s

| Versenyző | x | Mez | Sisak |
|-----------|---|-----|-------|
| 1 | 18 | `#dc2626` (piros) | `#0a0a0a` |
| 2 | 86 | `#0ea5e9` (kék) | `#f1f5f9` |
| 3 | 154 | `#fbbf24` (sárga) | `#dc2626` |

**Kerék animáció:**
```css
.cy-wheel { animation: cyspin 0.45s linear infinite; transform-box: fill-box; transform-origin: center; }
@keyframes cyspin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
```

**Kerék geometria:** r=6 kerék + 4 küllőpár (0°/90°/45°/135°) + agy (`cyHub` gradiens)

**Kerékpár váz:** 8 vonal (felső cső, hátsó villya, nyeregcső, alsó cső, stb.)

### 17.5 Airbus A380 (felszállás és landolás)

**SVG viewBox:** `"0 0 320 90"` | Konténer: 280×76 px | Idő: 16 s

**Test gradiens:** `#ffffff → #f1f5f9 → #cbd5e1`

**Szárny gradiens:** `#e2e8f0 → #94a3b8`

**Motor gradiens:** `#475569 → #1e293b → #0f172a`

**Farokfogó:** fehér háromszög + piros mező + `★` szimbólum (AIR HUNGARY livery)

**28 felső fedélzeti ablak:** x=88+i×6.5, y=42.5, 2.6×1.6

**32 alsó fedélzeti ablak:** x=84+i×6, y=50.5, 2.6×1.6

**Piros csík:** `y=47 → y=50`, 230 px hosszú

**Motorok:** 2 db — nagy (translate 150,67, rx=14) + kis (translate 105,70, rx=13)

**Ventilátor animáció:**
```css
.a-prop { animation: aprop .18s linear infinite; transform-box: fill-box; transform-origin: center; }
@keyframes aprop { from{transform:rotate(0)} to{transform:rotate(360deg)} }
```

**Navigációs fények strobo:**
```css
.a-strobe { animation: astrobe 1.2s ease-in-out infinite; }
@keyframes astrobe { 0%,90%,100%{opacity:.1} 45%,55%{opacity:1} }
```

Piros (cx=67, bal szárny) + zöld (cx=200, jobb szárny) + fehér orrfény

**"AIR HUNGARY" felirat:** x=200, y=44.5, 4px, piros, letterSpacing=0.1em

---

## 18. FEJLÉC INTEGRÁCIÓ (dashboard-client.tsx)

### 18.1 hexToRgba segédfüggvény

```typescript
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
```

### 18.2 Hero fejléc 9-megállós radialGradient háttér

```typescript
const heroAmbient = heroSkyGradient(heroTod).mid;

background: `radial-gradient(
  ellipse 62% 220% at 50% 50%,
  ${heroAmbient} 0%,
  ${hexToRgba(heroAmbient, 0.88)} 14%,
  ${hexToRgba(heroAmbient, 0.68)} 30%,
  ${hexToRgba(heroAmbient, 0.44)} 46%,
  ${hexToRgba(heroAmbient, 0.22)} 62%,
  ${hexToRgba(heroAmbient, 0.07)} 76%,
  #05091a 90%
)`
```

Ellipszis: `62% 220%` — jóval szélesebb mint magas, a fejléc közepéből sugárzik.

### 18.3 Arany felső csík

```tsx
<div className="absolute inset-x-0 top-0 h-[2px]" style={{
  background: 'linear-gradient(90deg, transparent 0%, #c87920 30%, #f5c842 55%, #c87920 80%, transparent 100%)'
}} />
```

### 18.4 Jelenet konténer (4-irányú maszk)

```tsx
<div
  className="pointer-events-none select-none relative flex-1 min-w-0 h-[108px] overflow-hidden"
  style={{
    WebkitMaskImage: [
      'linear-gradient(to right,  transparent 0%, black 13%, black 87%, transparent 100%)',
      'linear-gradient(to bottom, transparent 0%, black 13%, black 87%, transparent 100%)',
    ].join(', '),
    WebkitMaskComposite: 'destination-in',
    maskImage: [
      'linear-gradient(to right,  transparent 0%, black 13%, black 87%, transparent 100%)',
      'linear-gradient(to bottom, transparent 0%, black 13%, black 87%, transparent 100%)',
    ].join(', '),
    maskComposite: 'intersect',
  }}
>
  <DashboardHeroScene hideTram />
  <HeroVehicle />
</div>
```

**A maszk logikája:** `mask-composite: intersect` = csak azok a pixelek látszanak, amelyek mindkét gradiensben láthatók. A sarkok teljesen átlátszóak, az élek simán elhalványodnak. A jelenet így „beleolvad" a fejléc háttérgrádiensbe.

---

## 19. NAPSZAK × ÉVSZAK MÁTRIX

| Elem | dawn | morning | day | afternoon | sunset | evening | night |
|------|:----:|:-------:|:---:|:---------:|:------:|:-------:|:-----:|
| Csillagok | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| Nap | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Hold | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| Felhők | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Épület paletta | dawn/sunset | nappali | nappali | nappali | dawn/sunset | éjszakai | éjszakai |

| Elem | spring | summer | autumn | winter |
|------|:------:|:------:|:------:|:------:|
| Virágzás a fán | ✓ | ✗ | ✗ | ✗ |
| Pillangó (fa#2) | ✗ | ✓ | ✗ | ✗ |
| Őszi lombszín | ✗ | ✗ | ✓ | ✗ |
| Hulló levelek | ✗ | ✗ | ✓ | ✗ |
| Kopasz ágak | ✗ | ✗ | ✗ | ✓ |
| Hósapka ágakon | ✗ | ✗ | ✗ | ✓ |
| Hulló hó (22 db) | ✗ | ✗ | ✗ | ✓ |

---

## 20. GYORS REFERENCIA — ÖSSZES SZÁM

| Paraméter | Érték |
|-----------|-------|
| SVG viewBox | `"0 -20 418 138"` |
| GROUND y-koordináta | 118 |
| Hero konténer magassága | 108 px |
| Csillagok száma | 38 |
| Csillagkép klaszterek | 3 (5 csillag/klaszter) |
| Hullócsillag ciklus | 30 s |
| Felhők száma | 3 |
| Fák száma | 3 |
| Hópelyhek száma | 22 |
| Hulló levelek száma | 7 |
| Belső tram első spawn | 5–15 s |
| Belső tram ismétlési idő | 25–45 s |
| Belső tram áthaladási idő | 11 s |
| PRNG seed | 1337 |
| Napszak frissítési intervallum | 60 000 ms |
| Jármű szünet animáció közt | 1 200–2 600 ms |
| Ablak flicker arány | ~36% |
| Megvilágított ablakok aránya | ~70% |
| Meleg vs. hűvös ablak | ~80% vs. ~20% |

| Jármű | viewBox | Konténer | Idő | Réteg |
|-------|---------|----------|-----|-------|
| Tram (CAF Urbos 5-szekciós) | 540×40 | 360×36 px | 26 s | ground |
| Trolleybus (Trollino 18) | 380×42 | 260×36 px | 22 s | ground |
| Bus (Citaro) | 320×40 | 220×36 px | 20 s | ground |
| Cyclists (3 versenyző) | 220×36 | 180×32 px | 32 s | ground |
| A380 felszállás | 320×90 | 280×76 px | 16 s | sky |
| A380 landolás | 320×90 | 280×76 px | 16 s | sky |

---

## 21. ISMERT CSAPDÁK ÉS REKONSTRUKCIÓS MEGJEGYZÉSEK

1. **PRNG hívási sorrend kritikus:** Ha új `useMemo` blokkot szúrsz be a meglévők közé, az összes utána következő elem eltolódik.

2. **SVG `transformBox: 'fill-box'`:** A csillagkép forgatáshoz kötelező — anélkül a `transform-origin` a teljes SVG koordináta-rendszerben értelmezne.

3. **CSS Custom Properties TypeScript-ben:**
   ```typescript
   style={{ '--drift': `${value}px` } as CSSProperties}
   ```

4. **`animationFillMode: 'forwards'` a HeroVehicle-nél:** Az animáció végén az elem az utolsó keyframe pozícióján marad a szünet idejére.

5. **Belső tram vs. HeroVehicle kettős villamos:** Mindig add meg a `hideTram` propot, ha `HeroVehicle` is jelen van!

6. **`preserveAspectRatio="none"`:** A jelenet nyúlik a konténer méretéhez — szándékos.

7. **A380 mindkét verzió ugyanaz az SVG:** Csak az animáció neve különbözik (`vh-a380-to` vs. `vh-a380-ld`).

---

## 22. RENDERELÉSI SORREND AZ SVG-BEN

1. Égbolt (`rect` — `url(#phs-sky)`)
2. Horizont glória (`ellipse`)
3. Csillagok, csillagképek, hullócsillag (csak evening/night)
4. Nap / Hold
5. Felhők (csak nem evening/night)
6. **Fák** (az épületek ELŐTT — mélység!)
7. Épületek (4 db, pilléreikkel, öveikkel, kéményeikkel)
8. Talaj (2 sáv)
9. Ablakok (flat map az összes épületen)
10. Hulló levelek (csak autumn)
11. Hópelyhek (csak winter)
12. Belső mini-villamos (ha `!hideTram && tramKey > 0`)

---

## 23. PROP INTERFACE

```typescript
// DashboardHeroScene
interface Props {
  forceTimeOfDay?: TimeOfDay;  // preview/testing
  forceSeason?: Season;         // preview/testing
  className?: string;
  hideTram?: boolean;           // default: false — prodban: true (ha HeroVehicle is van)
}

// HeroVehicle — nincs prop, teljesen önálló
```

**Exportált API:**
```typescript
export function detectTimeOfDay(date?: Date): TimeOfDay
export function detectSeason(date?: Date): Season
export function skyGradient(tod: TimeOfDay): { from: string; mid: string; to: string; midOffset: number }
export type TimeOfDay
export type Season
export default function DashboardHeroScene(props: Props): JSX.Element
```
