# UNIVERSAL UI/UX/RESZPONZIVITÁS REFAKTOR MESTER-PROMPT
# Verzió: 2.0 | Utolsó frissítés: 2026-05-17
# Karakterszám: ~50 000
# Kompatibilitás: Bármely Next.js / React / TypeScript / Tailwind CSS repo
#
# Használat:
#   1. Másold be ezt a promptot Claude-nak (vagy bármely AI kódolási asszisztensnek)
#   2. Az AI az aktuális repo struktúrájából önállóan azonosítja a konkrét fájlokat
#   3. Bármikor használható: új feature után, layout-törés esetén, accessibility audit előtt
#   4. Teljes refaktor: futtasd végig mind a 26 fázist
#   5. Részleges javítás: ugorj a releváns fázisra

---

Te egy senior frontend-architect és UI/UX-engineer vagy.

A feladatod egy **teljes, szisztematikus UI/UX-refaktor elvégzése** a jelenlegi repón.
Mielőtt bármit tennél: **határozd meg a projekt stack-jét** (framework, CSS megoldás,
router, komponens könyvtár) és ahhoz igazítsd a lenti parancsokat és mintákat.

A refaktor lefedi:
- horizontális overflow / scrollbar hibák megszüntetését
- reszponzív grid és flex rendszer szisztematikus javítását
- vizuális széttörés (content breakage) eltüntetését
- mobilon / tableten / desktopon helyes megjelenést
- Core Web Vitals javítását (LCP, INP, CLS)
- WCAG 2.2 accessibility megfelelőséget
- design token konzisztenciát
- animáció és motion biztonságot
- automatizált tesztelési réteg hozzáadását

---

## NULLADIK LÉPÉS — KÖTELEZŐ ELŐKÉSZÍTÉS (MINDEN REFAKTOR ELŐTT)

### 0.1 Projekt azonosítás

Futtasd a következő parancsokat a projekt struktúrájának megismeréséhez:

```bash
# Framework és verziók
cat package.json | grep -E '"next|"react|"tailwind|"vite|"vue|"svelte' | head -20

# CSS megoldás azonosítása
ls tailwind.config* tailwind.config.ts tailwind.config.js 2>/dev/null
ls *.css src/**/*.css app/**/*.css 2>/dev/null | head -10

# Root layout fájl keresése
find . -name "layout.tsx" -o -name "layout.jsx" -o -name "_app.tsx" -o -name "App.tsx" \
  | grep -v node_modules | grep -v .next | head -5

# Globális CSS fájl
find . -name "globals.css" -o -name "global.css" -o -name "index.css" \
  | grep -v node_modules | head -5

# Komponens könyvtár
find . -path "*/components/*.tsx" -o -path "*/components/*.jsx" \
  | grep -v node_modules | head -20
```

### 0.2 Governance dokumentumok olvasása

Ha a repóban léteznek, olvasd el sorban:

```
1. CLAUDE.md / .cursorrules / AI_INSTRUCTIONS.md — projekt szabályok
2. CHANGELOG.md                                  — ne ütközz verziószámmal
3. codingLessonsLearnt.md / LESSONS.md           — dokumentált hibák
4. .governance/ mappa                            — UI/UX irányelv
```

### 0.3 Git állapot ellenőrzés

```bash
git fetch origin main && git rebase origin/main
git status --short
git log --oneline -5
```

Ha a rebase konfliktust okoz, oldd fel manuálisan — soha ne force-push main-re.

### 0.4 Jelenlegi layout audit indítása

```bash
# Az összes érintett fájl megkeresése
find . -type f \( -name "*.tsx" -o -name "*.jsx" -o -name "*.css" -o -name "*.scss" \) \
  | grep -v node_modules | grep -v .next | grep -v dist \
  | xargs grep -l "grid\|flex\|overflow\|w-full\|min-w\|max-w" 2>/dev/null

# Grid deklarációk összesítése
grep -rn "grid-cols\|xl:grid\|lg:grid\|md:grid" \
  $(find . -path "*/components/*.tsx" | grep -v node_modules) 2>/dev/null

# Fix szélességek keresése
grep -rn "w-\[.*px\]\|min-w-\[.*px\]\|width:.*px" \
  $(find . -path "*/components/*.tsx" | grep -v node_modules) 2>/dev/null | head -30
```

---

## ELSŐ FÁZIS — ROOT LAYOUT ÉS GLOBÁLIS CSS ELLENŐRZÉSE

### 1.1 Root layout fájl (layout.tsx / _app.tsx / App.tsx)

Olvasd el a root layout fájlt. Ellenőrizd:

```tsx
// KELL (Next.js App Router):
<html lang="[LANGUAGE_CODE]" className="h-full overflow-x-hidden">
<body className="h-full overflow-x-hidden">

// KELL (React SPA):
<div id="root" className="min-h-screen overflow-x-hidden">
```

Ha hiányzik az `overflow-x-hidden`, add hozzá. Ha a hiba tovább fennáll,
a gyermek elemek valamelyike okozza (lásd 1.3).

### 1.2 Globális CSS fájl

Olvasd el a globális CSS fájlt (globals.css / index.css / global.css).

**Kötelező szabályok:**

```css
/* Box-sizing: minden elemre kötelező */
*, *::before, *::after {
  box-sizing: border-box;
}

/* Horizontális overflow globális backstop */
html {
  overflow-x: hidden;
  scroll-behavior: smooth;
}

body {
  overflow-x: hidden;
  max-width: 100%;
}

/* Layout shift megelőzése scrollbar megjelenésekor */
body {
  scrollbar-gutter: stable;
}

/* Responsive képek — alapértelmezett */
img, video, svg {
  max-width: 100%;
  height: auto;
}
```

**Miért `scrollbar-gutter: stable`?**
Amikor dinamikusan jelenik meg egy scrollbar (pl. modal nyitásakor), az eltolhatja
a layoutot (CLS — Cumulative Layout Shift). A `scrollbar-gutter: stable` előre
fenntart helyet a scrollbar-nak, megakadályozva a layout ugrást.

### 1.3 A fő tartalmi konténer ellenőrzése

Keresd meg a fő layout struktúrát (sidebar + main, vagy header + content stb.):

```tsx
// TIPIKUS ROSSZ MINTA:
<div className="grid lg:grid-cols-[280px_1fr]">
  <aside>...</aside>
  <main className="space-y-6 px-4 py-5">   ← HIÁNYZIK: min-w-0
```

```tsx
// HELYES MINTA:
<div className="grid lg:grid-cols-[280px_1fr] overflow-x-hidden">
  <aside className="hidden lg:block overflow-hidden">...</aside>
  <main className="min-w-0 overflow-x-hidden space-y-6 px-4 py-5">
```

**Miért kritikus a `min-w-0`?**
CSS Grid-ben a grid item alapértelmezett minimum szélessége `auto`. Ez azt jelenti
hogy a tartalom (pl. egy hosszú szó, egy wide táblázat) kitágíthatja a cellát a
grid boundary-n túlra. A `min-w-0` a minimum szélességet `0`-ra csökkenti,
lehetővé téve hogy a cella összenyomódjon a rendelkezésre álló térbe.

### 1.4 Kártyák / Section wrapper komponensek

Keresd meg az alkalmazásban a wrapper kártya komponenst (SectionCard, Card, Panel stb.):

```bash
grep -rn "function.*Card\|function.*Panel\|function.*Section" \
  $(find . -path "*/components/*.tsx" | grep -v node_modules) | head -20
```

Minden ilyen wrapper komponensre:

```tsx
// ELŐTTE:
<section className="rounded-2xl border bg-white p-5">

// UTÁNA:
<section className="min-w-0 overflow-hidden rounded-2xl border bg-white p-5">
```

**Miért `overflow-hidden` a kártyán?**
Ha egy gyermek elem (táblázat, hosszú URL, wide chart) szélesebb a kártyánál,
az `overflow-hidden` megakadályozza hogy "kitörjön" és horizontális scrollbart okozzon.
Az `overflow-x-auto` alternatív ha a tartalom scrollolható kell legyen (pl. kódrészlet).

---

## MÁSODIK FÁZIS — GRID RENDSZER SZISZTEMATIKUS ELLENŐRZÉSE

### 2.1 Az összes grid deklaráció összegyűjtése

```bash
grep -rn "grid-cols" $(find . -path "*/components/*.tsx" -o -path "*/app/**/*.tsx" \
  | grep -v node_modules | grep -v .next) 2>/dev/null
```

### 2.2 Breakpoint lépcsőzés szabályai

A leggyakoribb hibaforrás: breakpointok közötti "ugrás". A szabály egyszerű:
**minden `N`-oszlopos grid-nek kell egy `N-1`-oszlopos lépcsője is.**

#### SZABÁLY A — 3-oszlopos grid fokozatossága

```tsx
// ❌ ROSSZ: xl-ről közvetlenül 1-re esik le (md és lg breakpointokon 1 col)
<div className="grid gap-6 xl:grid-cols-3">

// ✅ HELYES: fokozatos átmenet
<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
// Vagy ha a tartalom megengedi:
<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
```

#### SZABÁLY B — 4-oszlopos grid fokozatossága

```tsx
// ❌ ROSSZ:
<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

// ✅ HELYES:
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
```

#### SZABÁLY C — FR-arányos grid kezelése

```tsx
// xl:grid-cols-[0.9fr_1.1fr] — ez desktop-only, mobile-on single col
// A gyermek elemekre kötelező: min-w-0 + overflow-hidden/overflow-x-auto
<div className="grid xl:grid-cols-[0.9fr_1.1fr]">
  <div className="min-w-0 overflow-hidden">...</div>   {/* bal col */}
  <div className="min-w-0 overflow-hidden">...</div>   {/* jobb col */}
</div>
```

#### SZABÁLY D — Grid gyermekek min-w-0 szabálya

Minden grid közvetlen gyermeke kapjon `min-w-0`-t ha text/content van benne:

```tsx
<div className="grid md:grid-cols-2">
  <div className="min-w-0">...</div>  {/* ← kötelező */}
  <div className="min-w-0">...</div>  {/* ← kötelező */}
</div>
```

### 2.3 Automatikus grid hibakeresés

```bash
# Keresd az összes "ugrós" grid deklarációt (xl: de nincs lg:)
grep -n "xl:grid-cols" $(find . -path "*/components/*.tsx" | grep -v node_modules) \
  | grep -v "lg:grid-cols" 2>/dev/null
```

Minden találat potenciális overflow-forrás — adj hozzá `lg:` lépcsőt.

---

## HARMADIK FÁZIS — HERO / OVERVIEW SZEKCIÓ JAVÍTÁSA

### 3.1 Széles jobb oldali panel pattern

Sok dashboardon van egy hero szekció bal (szöveg) és jobb (widgetek) oldallal.
A jobb oldal fix szélességű widget-sorozatot tartalmaz — ez a leggyakoribb
overflow-forrás tableten és kis képernyőn.

**Azonosítás:**

```bash
# Fixed-width widgetek a hero szekcióban
grep -n "w-44\|w-40\|w-48\|min-w-\[3" $(find . -path "*/components/*.tsx" \
  | grep -v node_modules) 2>/dev/null | head -20
```

**Javítás:**

```tsx
// ❌ ROSSZ: minden méretben látható, overflow-t okoz tableten
<div className="flex gap-0 border-l">
  <div className="w-44 shrink-0">...</div>   {/* 176px */}
  <div className="w-40 shrink-0">...</div>   {/* 160px */}
  <div className="min-w-[340px]">...</div>   {/* min 340px! */}
</div>

// ✅ HELYES: kis képernyőn rejtett, nagy képernyőn jelenik meg
<div className="hidden lg:flex gap-0 border-l overflow-x-auto">
  <div className="w-44 shrink-0">...</div>
  <div className="w-40 shrink-0">...</div>
  <div className="w-[340px] max-w-full shrink-0">...</div>  {/* max-w-full! */}
</div>
```

### 3.2 Mobile hero fallback

Ha a jobb panel `hidden lg:flex` lesz, gondoskodj mobil fallback-ről:

```tsx
{/* Mobil widget strip — csak lg alatt látható, horizontálisan scrollolható */}
<div className="flex gap-3 overflow-x-auto border-t p-3 lg:hidden">
  <div className="shrink-0 w-40 min-w-[160px]">
    {/* widget 1 */}
  </div>
  <div className="shrink-0 w-36 min-w-[144px]">
    {/* widget 2 */}
  </div>
</div>
```

### 3.3 Hero section overflow-hidden

```tsx
// A hero/overview section konténere kapjon overflow-hidden-t:
<section className="overflow-hidden rounded-2xl bg-slate-950 text-white">
```

Ez megakadályozza hogy a belső widgetek "kilógjanak" a lekerekített sarok alól.

---

## NEGYEDIK FÁZIS — TÁBLÁZATOS TARTALMAK KEZELÉSE

### 4.1 Táblázat overflow szabály

Minden `<table>` elemet kötelező `overflow-x-auto` konténerbe burkolni:

```tsx
// ❌ ROSSZ:
<div className="rounded-2xl bg-white p-5">
  <table className="min-w-full">...</table>
</div>

// ✅ HELYES:
<div className="rounded-2xl bg-white p-5">
  <div className="overflow-x-auto">
    <table className="min-w-full">...</table>
  </div>
</div>
```

```bash
# Ellenőrzés: keres táblázatot overflow wrapper nélkül
grep -n "<table" $(find . -path "*/components/*.tsx" | grep -v node_modules) \
  | head -20
# Ha a környező kontextusban nincs overflow-x-auto, javítsd
```

### 4.2 Hosszú szövegek csonkítása

```bash
# Cím, fejléc, fájlnév jellegű szövegek keresése
grep -n "font-bold\|font-black\|font-semibold" \
  $(find . -path "*/components/*.tsx" | grep -v node_modules) | head -30
```

Alkalmazandó szabályok:
- Egy soros szöveg (`<span>`, `<p>`, `<td>`): `truncate` + `max-w-[...]`
- Főcím (`<h1>`, `<h2>`): `break-words` (ne vágja el, inkább törjön)
- Gomb szöveg: `whitespace-nowrap` (ne törjön)
- Fájlnév, URL: `break-all` (mindenhol törhet)

```tsx
<h1 className="text-2xl font-black break-words">...</h1>
<p className="text-sm truncate max-w-xs">...</p>
<span className="inline-block whitespace-nowrap">Gomb szöveg</span>
```

---

## ÖTÖDIK FÁZIS — MOBIL RESZPONZIVITÁS TELJES AUDIT

### 5.1 Breakpoint ellenőrző checklist

**Mobil (< 640px / sm) — alapértelmezett, mobile-first:**
```bash
grep -rn "sm:" $(find . -path "*/components/*.tsx" | grep -v node_modules) | head -30
```
- [ ] Nincs `sm:grid-cols-N` ahol N > 2
- [ ] Sidebar `hidden lg:block`
- [ ] Hero jobb panel `hidden lg:flex`
- [ ] Padding: `px-4` (mobilon legfeljebb px-4, soha px-8 vagy px-10)
- [ ] Gombok: `flex-wrap` — ne nyomják szét a layoutot
- [ ] Tab navigáció: `flex-wrap gap-1`

**Tablet (640px–1024px / md–lg):**
```bash
grep -rn "md:\|lg:" $(find . -path "*/components/*.tsx" | grep -v node_modules) | head -30
```
- [ ] 2-oszlopos grid `md:grid-cols-2` rendben van
- [ ] 3-oszlopos grid `lg:grid-cols-2` lépcsőn van (nem 3, az xl-en)
- [ ] Header: `md:flex-row` átmenet rendben
- [ ] Fixed-width elemek `max-w-full` párral vannak korlátozva

**Desktop (> 1280px / xl):**
- [ ] `xl:grid-cols-3` és `xl:grid-cols-4` csak itt jelenik meg
- [ ] Sidebar fix 280px (vagy a design szerinti érték)
- [ ] Minden megelőző breakpointon letesztelt

### 5.2 Beviteli mezők mobil kezelése

```tsx
// ❌ ROSSZ: fix szélességű input mobilon kenyomja a layoutot
<input className="w-56 rounded-xl border px-4 py-2" />

// ✅ HELYES: mobilon full-width, nagyobb képernyőn fix
<input className="w-full rounded-xl border px-4 py-2 md:w-56" />
```

### 5.3 Flex konténerek `flex-wrap` ellenőrzése

```bash
# Flex konténerek flex-wrap nélkül (potenciális overflow):
grep -rn "className=\"flex " $(find . -path "*/components/*.tsx" | grep -v node_modules) \
  | grep -v "flex-col\|flex-wrap\|items-\|justify-" | head -20
```

Ha van `flex` és a gyermekek fix szélességűek: add a `flex-wrap`-ot.

```tsx
// ❌ ROSSZ:
<div className="flex gap-3">
  <button className="px-4 py-2">...</button>
  <button className="px-4 py-2">...</button>
</div>

// ✅ HELYES:
<div className="flex flex-wrap gap-3">
  <button className="px-4 py-2">...</button>
  <button className="px-4 py-2">...</button>
</div>
```

---

## HATODIK FÁZIS — FIX SZÉLESSÉGŰ ELEMEK AUDIT

### 6.1 Keresés

```bash
grep -rn "w-\[.*px\]\|min-w-\[.*px\]\|max-w-\[.*px\]" \
  $(find . -path "*/components/*.tsx" | grep -v node_modules) | head -30
```

**Megengedett fix szélességek:**
- Sidebar: design-specifikus fix px (szándékos)
- Ikonok: `w-4`, `w-5`, `w-6`, `w-8` — mindig OK
- Avatar: `w-10 h-10` — OK
- Kis badge/chip: `w-20` — OK

**Problémás fix szélességek:**
- `min-w-[340px]` önmagában — cseréld `w-[340px] max-w-full`-ra
- `w-[600px]` vagy nagyobb px value mobilon — `w-full max-w-[600px]`-ra
- `min-w-full` táblázatban — OK, de kell `overflow-x-auto` wrapper a szülőn

### 6.2 Fix szélességű elem csere-minta

```tsx
// ❌ ROSSZ: minimum szélességgel táguló elem
<div className="min-w-[400px]">...</div>

// ✅ HELYES: maximum szélességgel korlátozott, de összenyomható
<div className="w-full max-w-[400px]">...</div>

// ✅ HELYES 2: ha fix szélességre van szükség nagy képernyőn
<div className="w-full lg:w-[400px] lg:shrink-0">...</div>
```

---

## HETEDIK FÁZIS — KOMPONENS BELSŐ LAYOUT AUDIT

### 7.1 Minden importált widget/komponens vizsgálata

```bash
# Találd meg az összes komponens importot a fő dashboard fájlból
grep -n "^import " $(find . -name "dashboard*.tsx" -o -name "Dashboard*.tsx" \
  | grep -v node_modules | head -1) | grep "from '@/components\|from './\|from '../"
```

Minden importált komponensnél:
- Van-e fix px szélességű elem ami overflow-t okozhat?
- Van-e `overflow-x-auto` wrapper ahol szükséges?
- Van-e `min-w-0` a grid gyermek konténereken?

### 7.2 SVG és animált elem overflow kezelése

SVG-k `overflow="visible"` attribútummal "kilóghatnak" a konténerükből:

```tsx
// ❌ ROSSZ: az SVG animált elemei kilóghatnak a 110px-es konténerből
<svg viewBox="0 0 100 100" width="110" height="110" overflow="visible">

// ✅ HELYES: szülő konténer fogja be az SVG-t
<div className="overflow-hidden">
  <svg viewBox="0 0 100 100" width="110" height="110" overflow="visible">
```

Vagy töröld az `overflow="visible"` attribútumot ha nem szükséges az animációhoz.

### 7.3 Chart / Data Viz komponensek

Recharts, Chart.js, Nivo és hasonló könyvtárak fix px méreteket adnak meg.
Mindig `ResponsiveContainer`-t vagy hasonló wrappert használj:

```tsx
// ❌ ROSSZ: fix szélességű chart
<LineChart width={600} height={300} data={data}>

// ✅ HELYES: reszponzív wrapper
import { ResponsiveContainer, LineChart } from 'recharts';
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
```

### 7.4 Beágyazott iFrame és embed kezelése

```tsx
// ❌ ROSSZ: fix wide iFrame
<iframe width="560" height="315" src="..." />

// ✅ HELYES: aspect-ratio alapú reszponzív embed
<div className="relative aspect-video w-full overflow-hidden rounded-xl">
  <iframe className="absolute inset-0 h-full w-full" src="..." />
</div>
```

---

## NYOLCADIK FÁZIS — CSS ÉS TAILWIND CONFIG AUDIT

### 8.1 Tailwind konfiguráció ellenőrzés

```bash
cat tailwind.config.ts 2>/dev/null || cat tailwind.config.js 2>/dev/null
```

Ellenőrizd:
- Custom `screens` breakpointok eltérnek-e az alapértelmezettől?
  - `sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px`
- Van-e `container` konfig ami fluid layoutot akadályoz?
- Van-e `extend.colors` ahol a brand szín definiálva van?

### 8.2 Design token egységesítés

A `tailwind.config` `theme.extend` szekciójában definiáld a brand tokeneket:

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#...',   // legvilágosabb
          100: '#...',
          200: '#...',
          300: '#...',
          400: '#...',
          500: '#...',   // főszín — ez legyen a brand szín
          600: '#...',
          700: '#...',
          800: '#...',
          900: '#...',
          950: '#...',   // legsötétebb
        },
      },
      borderRadius: {
        card: '1.75rem',   // egységes kártya saroklevágás
      },
      boxShadow: {
        card:  '0 18px 60px rgba(15,23,42,0.08)',
        modal: '0 24px 80px rgba(15,23,42,0.18)',
      },
    },
  },
};
```

### 8.3 Scrollbar custom CSS

```css
/* globals.css — saját görgetősáv stílus (ha szükséges) */
.scroll-custom::-webkit-scrollbar {
  width: 4px;
  height: 4px;  /* vízszintes scrollbar-hoz is */
}
.scroll-custom::-webkit-scrollbar-track {
  background: transparent;
}
.scroll-custom::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.3);
  border-radius: 2px;
}
.scroll-custom::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.6);
}
/* Firefox */
.scroll-custom {
  scrollbar-width: thin;
  scrollbar-color: rgba(100,116,139,0.3) transparent;
}
```

---

## KILENCEDIK FÁZIS — OVERFLOW DEBUGGING TECHNIKÁK

### 9.1 Browser Console overflow detektor

Futtatsd a böngésző konzolban a következő scriptet az overflow-t okozó elem azonosításához:

```javascript
// Minden elem ami szélesebb a viewport-nál:
const overflowing = [...document.querySelectorAll('*')].filter(el => {
  const rect = el.getBoundingClientRect();
  return rect.right > window.innerWidth || rect.left < 0;
}).map(el => ({
  tag:   el.tagName,
  class: el.className.slice(0, 80),
  right: Math.round(el.getBoundingClientRect().right),
  width: Math.round(el.getBoundingClientRect().width),
}));
console.table(overflowing);
```

Ez azonnal megmutatja melyik elem és milyen CSS osztályok okozzák az overflow-t.

### 9.2 Overflow javítási stratégiák prioritás szerint

**1. Stratégia — Összenyomás (`min-w-0`):**
```tsx
// Grid item túl széles → engedd összenyomódni
<div className="min-w-0">...</div>
```

**2. Stratégia — Elfojtás (`overflow-hidden`):**
```tsx
// Tartalom kilóg, de nem kell scroll → vágjuk le
<div className="overflow-hidden">...</div>
```

**3. Stratégia — Scrollolható (`overflow-x-auto`):**
```tsx
// Tartalom kilóg, de scrollolható legyen (táblázat, kód, hosszú sor)
<div className="overflow-x-auto">...</div>
```

**4. Stratégia — Fix szélesség lecserélése:**
```tsx
// min-w-[X] → max-w-[X] vagy w-full max-w-[X]
<div className="w-full max-w-[340px]">...</div>
```

**5. Stratégia — Rejtés kis képernyőn:**
```tsx
// Ha a tartalom nem fontos mobilon
<div className="hidden lg:flex">...</div>
```

---

## TIZEDIK FÁZIS — VISUAL CONSISTENCY ÉS DESIGN RENDSZER AUDIT

### 10.1 Spacing konzisztencia ellenőrzés

```bash
# Padding értékek az összes fő layout elemen
grep -n "px-\|py-\|p-[0-9]\|gap-" \
  $(find . -name "layout.tsx" -o -name "dashboard*.tsx" | grep -v node_modules) \
  | head -30
```

Alkalmazandó elvek:
- Oldal padding: `px-4` (mobile) → `md:px-6` → `lg:px-8` — fokozatos
- Section gap: `space-y-6` vagy `gap-6` — konzisztens
- Kártya padding: egységes (pl. `p-5` vagy `p-6` — ne keverj)
- Border radius: egységes kártya sarok (pl. `rounded-2xl` mindenhol)

### 10.2 Szín konzisztencia

```bash
# Inline color értékek keresése (ami token-en kívül van)
grep -rn "text-\#\|bg-\#\|border-\#\|color: '#" \
  $(find . -path "*/components/*.tsx" | grep -v node_modules) | head -20
```

Ha hardcoded hex szín van ahol token is lehetne, cseréld a design tokenre.

### 10.3 Tipográfia hierarchia ellenőrzés

Az alkalmazott hierarchia konzisztens-e? Ellenőrizd:

```
h1 (page title):   text-2xl md:text-3xl font-black   ← 1 db per page
h2 (section):      text-xl font-bold                 ← section-onként 1
h3 (subsection):   text-base font-semibold
body:              text-sm
meta/label:        text-xs
micro:             text-[10px] vagy text-[11px]
```

---

## TIZENEGYEDIK FÁZIS — MOBIL NAVIGÁCIÓ AUDIT

### 11.1 Sidebar kezelés

```tsx
// Sidebar: mobilon rejtett, desktopoln látható
<aside className="hidden lg:block">

// Hamburger menü gomb: mobilon látható, desktopon rejtett
<button className="lg:hidden" aria-label="Menü megnyitása" aria-expanded={menuOpen}>
  <Menu size={24} />
</button>
```

Ha nincs hamburger menü mobilon, a felhasználók nem tudnak navigálni.
Ellenőrizd:

```bash
grep -rn "hamburger\|mobile.*menu\|MobileNav\|DrawerMenu\|sheet\|Sheet\|Drawer" \
  $(find . -path "*/components/*.tsx" | grep -v node_modules) | head -10
```

### 11.2 Bottom navigation (mobil)

Hosszú alkalmazásoknál fontold meg a bottom navigation-t mobilon:

```tsx
<nav className="fixed bottom-0 left-0 right-0 z-50 flex lg:hidden
  border-t bg-white/95 backdrop-blur px-4 pb-safe">
  {navItems.map(item => (
    <a key={item.href} href={item.href}
      className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px]">
      <item.icon size={20} />
      {item.label}
    </a>
  ))}
</nav>
```

---

## TIZENKETTEDIK FÁZIS — PERFORMANCE ÉS HYDRATION AUDIT

### 12.1 Client component határok

```bash
grep -rn "^'use client'" $(find . -path "*/components/*.tsx" | grep -v node_modules)
```

Ha egy komponens csak `useState`, `useEffect` miatt van `'use client'`:
- Szedd ki a state-t egy kisebb wrapper komponensbe
- A nehéz, adatmegjelenítő rész maradjon Server Component

### 12.2 Suspense határok

```tsx
// ✅ HELYES: loading state Suspense-zel
import { Suspense } from 'react';

<Suspense fallback={
  <div className="animate-pulse h-32 rounded-2xl bg-slate-100" />
}>
  <HeavyDataComponent />
</Suspense>
```

### 12.3 Képek optimalizálása (Next.js)

```tsx
// ❌ ROSSZ: sima <img> tag
<img src="/hero.jpg" alt="Hero" width={800} height={400} />

// ✅ HELYES: Next.js Image komponens — automatikus WebP/AVIF, lazy loading
import Image from 'next/image';
<Image
  src="/hero.jpg"
  alt="Hero képleírás"
  width={800}
  height={400}
  priority={true}         // above the fold képeknél: priority!
  className="w-full h-auto object-cover"
/>
```

---

## TIZENHARMADIK FÁZIS — SPECIFIKUS KOMPONENS BUGOK

### 13.1 Tab navigációs komponens

```tsx
// ❌ ROSSZ: tab sor túlfut ha sok tab van
<div className="flex gap-1">
  {tabs.map(tab => <button key={tab.id}>...</button>)}
</div>

// ✅ HELYES: wrap + scroll opció
<div className="flex flex-wrap gap-1 overflow-x-auto">
  {tabs.map(tab => <button key={tab.id}>...</button>)}
</div>
```

### 13.2 Form elemek layout

```tsx
// ❌ ROSSZ: form grid sm breakpointon 4 col-ra ugrik
<form className="grid sm:grid-cols-[1fr_1fr_1fr_auto]">

// ✅ HELYES: fokozatos bővítés
<form className="grid gap-3 sm:grid-cols-2 md:grid-cols-[1fr_1fr_1fr_auto] max-w-full">
```

### 13.3 Donut/Ring chart SVG kezelése

```tsx
// MeterCard-szerű komponensekben:
<div className="relative flex flex-col rounded-2xl overflow-hidden">
  <div className="relative shrink-0">
    <svg width="64" height="64" viewBox="0 0 64 64">
      {/* gauge */}
    </svg>
  </div>
  <div className="min-w-0 flex-1">
    {/* szöveges tartalom */}
  </div>
</div>
```

---

## TIZENNEGYEDIK FÁZIS — VÉGREHAJTÁSI SORREND ÉS ELLENŐRZŐLISTA

### A teljes refaktor sorrendje:

**1. Előkészítés:**
```bash
git fetch origin main && git rebase origin/main
```

**2. KÖTELEZŐ fájlok olvasása szerkesztés előtt:**
- Root layout fájl (`layout.tsx` / `_app.tsx`)
- Globális CSS (`globals.css` / `index.css`)
- Fő dashboard/layout komponens
- Minden importált widget/panel komponens

**3. Globális CSS javítások:**
- [ ] `*, *::before, *::after { box-sizing: border-box; }`
- [ ] `overflow-x: hidden` html-re és body-ra
- [ ] `max-width: 100%` body-ra
- [ ] `scrollbar-gutter: stable` body-ra
- [ ] `img, video, svg { max-width: 100%; height: auto; }`

**4. Root layout javítások:**
- [ ] `overflow-x-hidden` class a `<body>`-ra

**5. Fő layout komponens javítások (rétegről rétegre):**
- [ ] `<main>` elem: `min-w-0 overflow-x-hidden`
- [ ] Kártya wrapper: `min-w-0 overflow-hidden`
- [ ] Hero jobb panel: `hidden lg:flex` + `overflow-x-auto`
- [ ] Fix szélességű widgetek: `min-w` → `max-w-full`
- [ ] `xl:grid-cols-3` sections: `lg:grid-cols-2` hozzáadása
- [ ] `xl:grid-cols-4` sections: `lg:grid-cols-3` hozzáadása
- [ ] Táblázatok: `overflow-x-auto` wrapper
- [ ] Flex konténerek: `flex-wrap` ahol szükséges
- [ ] Beviteli mezők: `w-full md:w-[fix]`
- [ ] Hosszú szövegek: `truncate` vagy `break-words`
- [ ] h1 elemek: `break-words`

**6. Widget komponensek javítása:**
- [ ] SVG-k `overflow="visible"`: szülőn `overflow-hidden`
- [ ] Chart komponensek: `ResponsiveContainer` wrapper
- [ ] Tab sorok: `flex-wrap`
- [ ] Donut gauge kártyák: `overflow-hidden`
- [ ] Form grid-ek: `max-w-full`

**7. TypeScript + Lint ellenőrzés:**
```bash
npx tsc --noEmit
npx next lint 2>&1 | head -30
# vagy: npx eslint . 2>&1 | head -30
```

**8. Visual ellenőrzés breakpointonként:**
- [ ] 375px (iPhone SE)
- [ ] 390px (iPhone 14)
- [ ] 768px (iPad portrait)
- [ ] 1024px (iPad landscape / kis laptop)
- [ ] 1280px (standard desktop)
- [ ] 1440px (wide desktop)
- [ ] 1920px (full HD)

**9. Commit:**
```bash
git add [érintett fájlok]
git commit -m "fix: resolve layout overflow and responsive breakage

- main content: overflow-x-hidden + min-w-0
- card wrappers: overflow-hidden to contain children
- hero panel: hidden lg:flex + overflow-x-auto
- xl:grid-cols-3: lg:grid-cols-2 stepping added
- xl:grid-cols-4: lg:grid-cols-3 stepping added
- table wrappers: overflow-x-auto throughout
- flex containers: flex-wrap where missing
- fixed min-w replaced with max-w-full equivalents
- globals.css: overflow-x hidden on html/body"
```

**10. Push:**
```bash
git push -u origin [branch-name]
```

---

## TIZENÖTÖDIK FÁZIS — ANTI-PATTERN LISTA

### ❌ NE TEDD EZEKET

1. **Ne töröld a meglévő funkcionális komponenseket** layout fix miatt
2. **Ne adj hozzá `!important`-ot** — ez CSS specificitási háborúhoz vezet
3. **Ne cseréld le a grid-et flexre** csak mert könnyebb — tartsd a meglévő struktúrát
4. **Ne hardcode-olj `width: 100vw`-t** — scrollbar esetén overflow-t okoz
5. **Ne rejtsd el a teljes hero szekciót mobilon** — csak a wide widget panelt
6. **Ne adj `overflow: hidden` az `<html>` elemre** — letiltja az oldal scrollját
   - `overflow-x: hidden` html-re: ✅ OK
   - `overflow: hidden` html-re: ❌ TILOS
7. **Ne változtasd a design token értékeket** (brand szín, spacing scale)
8. **Ne adj hozzá inline style-okat** ahol Tailwind osztály megoldaná
9. **Ne távolítsd el a `backdrop-blur`-t** — design szándékos elem
10. **Ne commitolj TypeScript hiba esetén** — `tsc --noEmit` 0 hibával kell fusson

### ✅ HELYETTE TEDD EZEKET

1. **Overflow containment stratégia:** `overflow-hidden` → `overflow-x-auto` → `min-w-0`
2. **Progressive enhancement:** `base` → `sm:` → `md:` → `lg:` → `xl:` — soha ne ugorj
3. **Tartalmazd a problémát:** `overflow-hidden` a legközelibb ancestor-on
4. **Dokumentálj:** CHANGELOG.md + versioning fájl minden változtatáshoz
5. **Tesztelj minden breakpointon** push előtt

---

## TIZENHATODIK FÁZIS — CHANGELOG ÉS VERZIONING

### 16.1 CHANGELOG.md frissítése

```markdown
## [X.Y.Z] — YYYY-MM-DD — UI/UX Layout Refactor

### Fixed
- Horizontal overflow eliminated from main layout
- Card/section wrappers now properly contain child overflow
- Hero panel widget strip hidden on narrow screens (lg:flex)
- 3-column grid sections step through 2-column on lg breakpoint
- Table overflow wrappers added throughout
- Flex containers with flex-wrap where needed

### Changed
- Main element: min-w-0 + overflow-x-hidden
- xl:grid-cols-3 → lg:grid-cols-2 xl:grid-cols-3
- xl:grid-cols-4 → lg:grid-cols-3 xl:grid-cols-4
- Fixed min-w values replaced with max-w-full equivalents
- globals.css: overflow-x hidden on html and body
```

### 16.2 versioning/*.md fájl létrehozása

Ha a projekt használ versioning fájlokat:

```markdown
# vX.Y.Z — UI/UX Layout Refactor

**Date:** YYYY-MM-DD
**Type:** Bug fix / Enhancement

## Summary
Systematic layout audit and fix pass. Eliminates horizontal scroll on all
breakpoints, adds missing responsive grid steps, contains animated SVG elements.

## Files changed
- app/globals.css: overflow-x hidden, max-width, scrollbar-gutter
- app/layout.tsx: overflow-x-hidden on body
- components/[MainLayout]: min-w-0 on main, hero panel hidden lg:flex
- components/[CardWrapper]: overflow-hidden
- components/[WidgetComponents]: SVG overflow, tab flex-wrap

## Testing
- tsc --noEmit: 0 errors
- Breakpoints tested: 375, 768, 1024, 1280, 1440px
```

---

## TIZENHETEDIK FÁZIS — JÖVŐBELI OVERFLOW MEGELŐZÉSI SZABÁLYOK

### 17.1 Új komponens hozzáadásakor

**Grid container:**
```tsx
// MINDIG: fokozatos breakpoints, soha ne ugorj
<section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
// SOHA:
<section className="grid gap-6 xl:grid-cols-3">  // ← mobilon 1-ről xl-re ugrik
```

**Kártya tartalom:**
```tsx
// MINDIG: overflow kezelés
<div className="min-w-0 overflow-hidden rounded-2xl">
  <div className="overflow-x-auto">  {/* ha scrollolható tartalom van */}
    {/* tartalom */}
  </div>
</div>
```

**Fix szélességű elem:**
```tsx
// MINDIG: max-w-full pair
<div className="w-[400px] max-w-full">

// SOHA: min-w önmagában
<div className="min-w-[400px]">  // ← overflow kockázat
```

**Képek és SVG-k:**
```tsx
// MINDIG: reszponzív méretezés
<img className="w-full h-auto" alt="..." />
<svg className="w-full h-auto" viewBox="0 0 100 100">

// SOHA: fix px + overflow:visible szülő korlátozás nélkül
<svg width="500" height="300" overflow="visible">  // ← kilóg
```

### 17.2 Code review checklist (PR-ek esetén)

Minden UI-t érintő PR-nél ellenőrizd:
- [ ] Nincs új `xl:grid-cols-N` `lg:grid-cols-(N-1)` lépcső nélkül?
- [ ] Nincs új `min-w-[Xpx]` önmagában `max-w-full` nélkül?
- [ ] Minden új `<table>` `overflow-x-auto` wrapper-ben van?
- [ ] Minden új SVG `overflow="visible"` szülőn `overflow-hidden` van?
- [ ] Nincs új inline `width: [fix px]` CSS property?

---

## TIZENNYOLCADIK FÁZIS — ÖSSZEFOGLALÓ ELLENŐRZŐLISTA

Minden refaktor elvégzése után felelj igennel minden kérdésre:

**Layout:**
- [ ] Nincs horizontális scrollbar 375px-en?
- [ ] Nincs horizontális scrollbar 768px-en?
- [ ] Nincs horizontális scrollbar 1024px-en?
- [ ] Nincs horizontális scrollbar 1280px-en?
- [ ] A sidebar fix szélességű és nem okoz overflow-t?
- [ ] A `<main>` elem rendelkezik `min-w-0`-val?

**Grid:**
- [ ] Minden `xl:grid-cols-3` rendelkezik `lg:grid-cols-2` lépcsővel?
- [ ] Minden `xl:grid-cols-4` rendelkezik `lg:grid-cols-3` lépcsővel?
- [ ] Minden grid közvetlen gyermeke `min-w-0`-val van ellátva?

**Kártyák:**
- [ ] Minden kártya/section wrapper `overflow-hidden`-t tartalmaz?
- [ ] Minden `<table>` `overflow-x-auto` wrapper-ben van?
- [ ] Minden h1 elem `break-words`-szel van ellátva?
- [ ] Hosszú szövegek `truncate`-tel vannak ellátva ahol szükséges?

**Vizuális:**
- [ ] Design rendszer (szín, spacing, border-radius) változatlan?
- [ ] Hero szekció mobil megjelenése elfogadható?

**Kód minőség:**
- [ ] `tsc --noEmit` sikeresen lefutott (0 hiba)?
- [ ] `next lint` / `eslint` nem jelez új hibát?
- [ ] Nincs `!important`, felesleges inline style?

**Verzió:**
- [ ] CHANGELOG.md frissítve?
- [ ] Commit üzenet leírja a változtatásokat?
- [ ] Push sikeres?

---

## TIZENKILENCEDIK FÁZIS — CONTAINER QUERIES (MODERN CSS)

> **Forrás:** 2025/2026-ra a container queries minden major böngészőben production-ready.
> Ez a jövőbeli refaktor alapja — viewport-alapú media query-k helyett
> komponens-szintű reszponzivitás.

### 19.1 Mikor használj container query-t media query helyett?

| Media query | Container query |
|-------------|-----------------|
| Oldal szintű layout | Komponens szintű adaptáció |
| Header/Sidebar megjelenés/eltűnés | Kártya belső elrendezés váltás |
| Font méret az oldalon | Widget belső elrendezés |

**Alapszabály:** Ha a kérdés "milyen széles a viewport?", media query kell.
Ha a kérdés "milyen széles a szülő konténer?", container query kell.

### 19.2 Container query implementáció

```css
/* globals.css vagy komponens CSS module */

/* Definiáld a containment context-et */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* Adaptáció a konténer mérete alapján */
@container card (min-width: 400px) {
  .card-body {
    display: flex;
    flex-direction: row;
    gap: 1rem;
  }
}

@container card (max-width: 399px) {
  .card-body {
    display: flex;
    flex-direction: column;
  }
}
```

### 19.3 Tailwind v3 container query (plugin)

```bash
# Ha még nem telepítetted:
npm install @tailwindcss/container-queries
```

```typescript
// tailwind.config.ts
import containerQueries from '@tailwindcss/container-queries';

export default {
  plugins: [containerQueries],
};
```

```tsx
// Használat:
<div className="@container">
  <div className="flex flex-col @md:flex-row gap-4">
    {/* mobilon (szűk konténerben) col, nagyobb konténerben row */}
  </div>
</div>
```

### 19.4 Tailwind v4 container query (natív)

A Tailwind v4 (2025. január) natívan támogatja a container query-ket:

```tsx
<div className="@container/card">
  <div className="@sm/card:flex-row flex flex-col gap-4">
    {/* named container query */}
  </div>
</div>
```

### 19.5 Container query + grid kombináció

```tsx
{/* Ez a kártya bárhová elhelyezhető — mindig optimálisan jelenik meg */}
<div className="@container rounded-2xl border bg-white p-5">
  <div className="grid gap-4 @sm:grid-cols-2 @lg:grid-cols-3">
    {items.map(item => (
      <div key={item.id} className="min-w-0">...</div>
    ))}
  </div>
</div>
```

---

## HUSZADIK FÁZIS — CORE WEB VITALS OPTIMALIZÁLÁS

> **Forrás:** 2025-ben a págák 52%-a mobilon nem teljesíti mind a három CWV metrikát.
> A három mérőszám: **LCP** (betöltés), **INP** (interaktivitás), **CLS** (stabilitás).

### 20.1 LCP — Largest Contentful Paint (célérték: < 2.5s)

Az LCP a legnagyobb látható elem (kép, h1, hero szöveg) megjelenési ideje.

**Leggyakoribb hibák és javítások:**

```tsx
// ❌ ROSSZ: hero kép prioritás nélkül (lazy loaded by default)
<Image src="/hero.jpg" alt="Hero" width={1200} height={600} />

// ✅ HELYES: fetchpriority + priority prop a hero képre
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority           // Next.js: előre tölti a képet, nem lazy-load
  fetchPriority="high"
  className="w-full h-auto"
/>
```

**Font preloading:**
```tsx
// app/layout.tsx — Google Fonts preconnect
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
</head>
```

**Render-blocking resources elkerülése:**
```tsx
// CSS fájlokat Next.js automatikusan kezeli
// JS-nél: dynamic import a heavy component-ekre
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <div className="h-48 animate-pulse bg-slate-100 rounded-2xl" />,
  ssr: false,
});
```

### 20.2 INP — Interaction to Next Paint (célérték: < 200ms)

Az INP minden felhasználói interakció (klikk, billentyű) válaszidejét méri.

**Hosszú event handler megszakítása:**
```typescript
// ❌ ROSSZ: nehéz számítás az event handlerben, blokkolja a főszálat
function handleClick() {
  const result = heavyComputation(data);  // blokkolja 300ms-ig
  setState(result);
}

// ✅ HELYES: defer a nehéz munkát
function handleClick() {
  // Azonnali UI feedback
  setLoading(true);
  // Számítás a következő frame-re halasztva
  setTimeout(() => {
    const result = heavyComputation(data);
    setState(result);
    setLoading(false);
  }, 0);
}

// ✅ MÉG JOBB: useTransition React 18+
const [isPending, startTransition] = useTransition();
function handleClick() {
  startTransition(() => {
    setState(expensiveUpdate(data));
  });
}
```

**Debounce input handlereken:**
```typescript
import { useDebouncedCallback } from 'use-debounce';

const handleSearch = useDebouncedCallback((value: string) => {
  setSearchQuery(value);
}, 300);
```

### 20.3 CLS — Cumulative Layout Shift (célérték: < 0.1)

A CLS váratlan layout elmozdulásokat mér (pl. kép betöltés előtt 0px magas,
utána 400px — minden alatta lévő elem ugrik).

**Kép méret attribútumok:**
```tsx
// ❌ ROSSZ: méret nélküli kép — betöltéskor ugrik a layout
<img src="/photo.jpg" alt="..." />

// ✅ HELYES: mindig add meg a méreteket (akár aspect-ratio-val)
<img src="/photo.jpg" alt="..." width={800} height={450} />
// Vagy aspect-ratio-val:
<div className="aspect-video w-full">
  <img src="/photo.jpg" alt="..." className="w-full h-full object-cover" />
</div>
```

**Font betöltési CLS megelőzése:**
```css
/* font-display: swap helyett optional ha a szöveg nem FOUT-érzékeny */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: optional;  /* nem okoz layout shift */
}
```

**Skeleton screen pattern — tartalom előtt helyfoglalás:**
```tsx
function DataCard() {
  const [data, setData] = useState(null);

  if (!data) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="h-4 w-1/2 rounded bg-slate-200" />
        <div className="h-8 w-full rounded bg-slate-200" />
      </div>
    );
  }

  return <ActualContent data={data} />;
}
```

**Dinamikusan betöltött tartalom magasságának rezerválása:**
```tsx
// ❌ ROSSZ: hirdetés / banner betöltésre vár, majd ugrik a layout
<div>{bannerLoaded && <Banner />}</div>

// ✅ HELYES: fix magasság rezerválva
<div className="min-h-[90px]">
  {bannerLoaded && <Banner />}
</div>
```

### 20.4 Core Web Vitals mérés

```bash
# Lighthouse CLI audit
npx lighthouse http://localhost:3000 --output=json --quiet \
  --chrome-flags="--headless" | jq '.categories | {
    performance: .performance.score,
    accessibility: .accessibility.score,
    "best-practices": ."best-practices".score,
    seo: .seo.score
  }'

# Web Vitals szimulált mérés fejlesztés közben:
# Chrome DevTools → Lighthouse → "Generate report"
# DevTools → Performance → "Web Vitals" checkbox
```

---

## HUSZONEGYEDIK FÁZIS — ACCESSIBILITY (WCAG 2.2 MEGFELELŐSÉG)

> **Fontos:** Az EU Accessibility Act 2025. június 28-tól érvényes.
> A WCAG 2.2 az elfogadott minimum standard. A leggyakoribb hiba (2025-ben
> a weboldalak 79%-án): túl alacsony szöveg-háttér kontraszt.

### 21.1 POUR elvek ellenőrzési framework

| Elv | Kérdés | Ellenőrzés |
|-----|--------|------------|
| **P**erceivable | Látható/hallható minden tartalom? | Kontraszt, alt szöveg |
| **O**perable | Billentyűzettel navigálható? | Tab order, focus indicator |
| **U**nderstandable | Érthető a tartalom és működés? | Szöveg, hibaüzenetek |
| **R**obust | Kompatibilis segítő technológiákkal? | Semantic HTML, ARIA |

### 21.2 Szöveg-háttér kontraszt ellenőrzés

**WCAG 2.2 minimumok:**
- Normál szöveg (< 18pt vagy < 14pt bold): **4.5:1**
- Nagy szöveg (≥ 18pt vagy ≥ 14pt bold): **3:1**
- UI komponens (gomb keret, input border): **3:1**
- Dekoratív elem / letiltott elem: nincs követelmény

```bash
# Axe CLI audit a kontrasztra:
npx axe http://localhost:3000 --tags wcag2aa 2>&1 | grep -A3 "color-contrast"
```

**Tailwind kontraszt ellenőrzés — tipikus problémák:**
```tsx
// ❌ VALÓSZÍNŰLEG ALACSONY KONTRASZT:
<p className="text-slate-400">...</p>  {/* slate-400 fehér háttéren: ~2.8:1 */}
<span className="text-gray-300">...</span>

// ✅ MEGFELELŐ KONTRASZT fehér háttéren:
<p className="text-slate-600">...</p>  {/* ~5.7:1 */}
<p className="text-slate-700">...</p>  {/* ~8.3:1 */}
<p className="text-slate-500">...</p>  {/* ~4.6:1 — éppen megfelel */}
```

**Online eszköz:** https://webaim.org/resources/contrastchecker/

### 21.3 Keyboard navigáció

Minden interaktív elem elérhető kell legyen billentyűzettel:

```tsx
// ❌ ROSSZ: div-en onClick, nem fókuszolható billentyűzettel
<div onClick={handleClick} className="cursor-pointer">Kattints</div>

// ✅ HELYES: button — natív billentyűzet + screen reader támogatás
<button type="button" onClick={handleClick}>Kattints</button>

// ✅ HELYES: ha vizuálisan div-nek kell kinéznie
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>Kattints</div>
```

### 21.4 Focus indicator — látható fókusz

```tsx
// ❌ ROSSZ: fókusz indicator eltávolítása
<button className="outline-none focus:outline-none">...</button>

// ✅ HELYES: saját, jól látható focus indicator
<button className="
  outline-none
  focus-visible:ring-2
  focus-visible:ring-brand-500
  focus-visible:ring-offset-2
">...</button>
```

**WCAG 2.2 focus requirement:**
- A focus indicator legalább 3:1 kontrasztot kell mutasson a háttérrel szemben
- Minimális terület: 2px körkörösen a komponens körül
- `focus-visible` (nem `focus`) használata — csak billentyűzet navigációnál látható

### 21.5 ARIA és semantic HTML

```tsx
// ❌ ROSSZ: nem szemantikus jelölés
<div className="header">...</div>
<div className="nav">...</div>
<div className="main-content">...</div>

// ✅ HELYES: szemantikus HTML5 elemek
<header>...</header>
<nav aria-label="Fő navigáció">...</nav>
<main>...</main>
<aside aria-label="Widget panel">...</aside>
<footer>...</footer>
```

**Modal/Dialog accessibility:**
```tsx
<dialog
  ref={dialogRef}
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">Modal cím</h2>
  <p id="dialog-description">Modal leírás</p>
  <button onClick={close} aria-label="Bezár">×</button>
</dialog>
```

**Loading state:**
```tsx
<div aria-live="polite" aria-atomic="true">
  {loading ? 'Betöltés...' : `${data.length} elem betöltve`}
</div>
```

### 21.6 Touch target méretek (WCAG 2.2 — 2.5.8)

A WCAG 2.2 Success Criterion 2.5.8 minimum 24×24 CSS pixel érintési célt ír elő.

```tsx
// ❌ ROSSZ: túl kis érintési célpont
<button className="p-0.5">
  <XIcon size={12} />
</button>

// ✅ HELYES: legalább 24px × 24px érintési terület
<button className="p-2 min-w-[24px] min-h-[24px] flex items-center justify-center">
  <XIcon size={12} />
</button>

// ✅ AJÁNLOTT: 44px × 44px (Apple HIG guideline)
<button className="p-3">  {/* 12px + ikon + 12px = ~40-48px */}
  <XIcon size={20} />
</button>
```

### 21.7 Skip navigation link

```tsx
// app/layout.tsx — első elem a DOM-ban
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4
    focus:z-[9999] focus:px-4 focus:py-2 focus:bg-brand-600 focus:text-white
    focus:rounded-lg focus:font-bold"
>
  Ugrás a tartalomra
</a>
<main id="main-content" tabIndex={-1}>
  {children}
</main>
```

### 21.8 Form accessibility

```tsx
// ❌ ROSSZ: label nélküli input (placeholder ≠ label)
<input type="email" placeholder="E-mail cím" />

// ✅ HELYES: asszociált label minden inputhoz
<div>
  <label htmlFor="email" className="block text-sm font-medium mb-1">
    E-mail cím <span aria-hidden="true">*</span>
  </label>
  <input
    id="email"
    name="email"
    type="email"
    required
    aria-required="true"
    aria-describedby={emailError ? "email-error" : undefined}
    autoComplete="email"
    className="w-full rounded-lg border px-3 py-2"
  />
  {emailError && (
    <p id="email-error" role="alert" className="mt-1 text-sm text-rose-600">
      {emailError}
    </p>
  )}
</div>
```

### 21.9 Accessibility audit eszközök

```bash
# axe-core CLI audit
npm install --save-dev @axe-core/cli
npx axe http://localhost:3000 --tags wcag2a,wcag2aa,wcag22aa

# Lighthouse accessibility score
npx lighthouse http://localhost:3000 --only-categories=accessibility

# eslint-plugin-jsx-a11y — statikus a11y ellenőrzés
npm install --save-dev eslint-plugin-jsx-a11y
```

`.eslintrc.js`:
```javascript
module.exports = {
  plugins: ['jsx-a11y'],
  extends: ['plugin:jsx-a11y/recommended'],
};
```

---

## HUSZONKETTEDIK FÁZIS — DESIGN TOKEN RENDSZER

> **Forrás:** A design token rendszer a skálázható UI architektúra alapja.
> Megelőzi a "style drift"-et — azt amikor különböző fejlesztők eltérő
> szín/spacing értékeket használnak ugyanarra a célra.

### 22.1 Három rétegű token modell

```
1. PRIMITÍV tokenek  — nyers értékek (slate-500, 16px, 1.5)
2. SZEMANTIKAI tokenek — cél szerinti elnevezés (text-primary, surface-card)
3. KOMPONENS tokenek  — komponens-specifikus (btn-primary-bg, card-padding)
```

### 22.2 Tailwind v3 token konfiguráció

```typescript
// tailwind.config.ts
const config = {
  theme: {
    extend: {
      colors: {
        // Primitív réteg
        brand: {
          50: '#f0fdf9',
          100: '#ccfbef',
          500: '#10b981',  // ← ez a brand főszín
          600: '#059669',
          900: '#064e3b',
          950: '#022c22',
        },
        // Szemantikai réteg (CSS változókkal)
        surface: {
          DEFAULT: 'rgba(255,255,255,0.9)',
          dark:    'rgba(15,23,42,1)',
          muted:   'rgba(248,250,252,1)',
        },
      },
      spacing: {
        // Komponens-specifikus értékek
        'sidebar-width': '280px',
        'header-height': '64px',
      },
    },
  },
};
```

### 22.3 CSS custom properties a dark mode-hoz

```css
/* globals.css */
:root {
  --color-surface:       255 255 255;
  --color-surface-alt:   248 250 252;
  --color-text-primary:  15  23  42;
  --color-text-muted:    100 116 139;
  --color-border:        226 232 240;
  --color-brand:         16  185 129;
}

.dark {
  --color-surface:       15  23  42;
  --color-surface-alt:   30  41  59;
  --color-text-primary:  248 250 252;
  --color-text-muted:    148 163 184;
  --color-border:        51  65  85;
}
```

```typescript
// tailwind.config.ts — CSS változók felhasználása
colors: {
  surface: 'rgb(var(--color-surface) / <alpha-value>)',
  'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
  border: 'rgb(var(--color-border) / <alpha-value>)',
}
```

### 22.4 Token naming convention

```
✅ HELYES (szemantikus):  bg-surface, text-primary, border-subtle
❌ ROSSZ (literális):     bg-white, text-gray-900, border-slate-200
```

Ha a literális értékek szét vannak szórva a kódbázisban, focus a következő
refaktoron: keress minden `bg-white` és `text-slate-900` értéket és cseréld
token-re.

---

## HUSZONHARMADIK FÁZIS — ANIMÁCIÓ ÉS MOTION BIZTONSÁG

> **Forrás:** A `prefers-reduced-motion` media query kezelése WCAG 2.3 követelmény.
> Mozgásérzékeny felhasználóknak (vestibularis rendellenességek, epilepszia)
> a flash és erős animáció fizikai tüneteket okozhat.

### 23.1 prefers-reduced-motion implementáció

```css
/* globals.css — KÖTELEZŐ minden animációhoz */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**React hook:**
```typescript
// hooks/useReducedMotion.ts
import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}
```

**Használat komponensben:**
```tsx
function AnimatedCard() {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className="rounded-2xl transition-transform"
      style={{
        animation: reducedMotion
          ? 'none'
          : 'pulse 2s ease-in-out infinite',
      }}
    >
      ...
    </div>
  );
}
```

### 23.2 Animációs teljesítmény szabályok

**GPU-gyorsított property-k (jók, nem okoznak layout reflow):**
- `transform: translate/scale/rotate`
- `opacity`
- `filter`

**Layout reflow-t okozó property-k (kerülendők animációban):**
- `width`, `height`
- `top`, `left`, `right`, `bottom` (position:absolute esetén `transform: translate`-t használj)
- `margin`, `padding`
- `font-size`

```tsx
// ❌ ROSSZ: layout reflow-t okoz
style={{ height: isOpen ? '200px' : '0px' }}

// ✅ HELYES: GPU-gyorsított
style={{ transform: isOpen ? 'scaleY(1)' : 'scaleY(0)', transformOrigin: 'top' }}
// Vagy: CSS transition + max-height trükk (nem tökéletes, de elfogadható)
className={isOpen ? 'max-h-[200px]' : 'max-h-0 overflow-hidden'}
```

### 23.3 Infinite animation ellenőrzés

```bash
# Keresés infinite animációra (ezek fárasztóak és akadálymentességi problémát okoznak)
grep -rn "animate-spin\|animate-pulse\|animate-bounce\|infinite" \
  $(find . -path "*/components/*.tsx" | grep -v node_modules) | head -20
```

Minden `infinite` animáció esetén:
- Van-e `prefers-reduced-motion` kezelés?
- Szükséges-e az animáció a user experience-hez?
- Ha loading state: skeleton screen jobb alternatíva

---

## HUSZONEGYEDIK FÁZIS — AUTOMATIZÁLT TESZTELÉS

### 24.1 Playwright — overflow detekció

```bash
npm install --save-dev @playwright/test
npx playwright install
```

```typescript
// tests/layout.spec.ts
import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile',   width: 375,  height: 812  },
  { name: 'tablet',   width: 768,  height: 1024 },
  { name: 'laptop',   width: 1024, height: 768  },
  { name: 'desktop',  width: 1280, height: 800  },
  { name: 'wide',     width: 1440, height: 900  },
];

const PAGES_TO_TEST = [
  '/',
  '/app',
  '/w/test-building-id',  // ha van publikus test URL
];

for (const vp of VIEWPORTS) {
  for (const path of PAGES_TO_TEST) {
    test(`no horizontal overflow on ${vp.name} at ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`http://localhost:3000${path}`);
      await page.waitForLoadState('networkidle');

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.body.scrollWidth,
        clientWidth:  document.body.clientWidth,
      }));

      expect(scrollWidth, `${vp.name} ${path} overflow: ${scrollWidth}px > ${clientWidth}px`)
        .toBeLessThanOrEqual(clientWidth);
    });
  }
}

test('overflow detection script — identify culprit elements', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://localhost:3000');

  const overflowing = await page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter(el => el.getBoundingClientRect().right > window.innerWidth)
      .slice(0, 10)
      .map(el => ({
        tag:   el.tagName,
        class: el.className?.toString().slice(0, 60),
        right: Math.round(el.getBoundingClientRect().right),
      }))
  );

  if (overflowing.length > 0) {
    console.log('Overflowing elements:', overflowing);
  }
  expect(overflowing).toHaveLength(0);
});
```

### 24.2 axe-core — accessibility audit Playwright-ban

```bash
npm install --save-dev axe-playwright
```

```typescript
// tests/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home page has no critical accessibility violations', async ({ page }) => {
  await page.goto('http://localhost:3000');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();

  // Log violations for debugging
  if (results.violations.length > 0) {
    console.log('A11y violations:',
      results.violations.map(v => ({
        id:       v.id,
        impact:   v.impact,
        help:     v.help,
        nodes:    v.nodes.length,
      }))
    );
  }

  // Critical violations should be zero
  const critical = results.violations.filter(v => v.impact === 'critical');
  expect(critical).toHaveLength(0);
});
```

### 24.3 Lighthouse CI

```bash
npm install --save-dev @lhci/cli
```

`.lighthouserc.js`:
```javascript
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm start',
      url: ['http://localhost:3000'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance':    ['warn',  { minScore: 0.8  }],
        'categories:accessibility':  ['error', { minScore: 0.9  }],
        'categories:best-practices': ['warn',  { minScore: 0.85 }],
        'categories:seo':            ['warn',  { minScore: 0.8  }],
        'first-contentful-paint':    ['warn',  { maxNumericValue: 2000 }],
        'largest-contentful-paint':  ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift':   ['error', { maxNumericValue: 0.1  }],
        'total-blocking-time':       ['warn',  { maxNumericValue: 300  }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

```bash
# Futtatás:
npx lhci autorun
```

### 24.4 Visual regression testing

```typescript
// tests/visual.spec.ts
import { test, expect } from '@playwright/test';

test('dashboard visual snapshot — desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForLoadState('networkidle');

  // Animációk letiltása a reprodukálható snapshothoz
  await page.addStyleTag({ content: `
    *, *::before, *::after {
      animation-duration: 0ms !important;
      transition-duration: 0ms !important;
    }
  `});

  await expect(page).toHaveScreenshot('dashboard-desktop.png', {
    fullPage: true,
    threshold: 0.02,  // 2% pixel különbség megengedett
  });
});
```

### 24.5 package.json test scriptjei

```json
{
  "scripts": {
    "test":              "playwright test",
    "test:layout":       "playwright test tests/layout.spec.ts",
    "test:a11y":         "playwright test tests/accessibility.spec.ts",
    "test:visual":       "playwright test tests/visual.spec.ts",
    "test:visual:update":"playwright test tests/visual.spec.ts --update-snapshots",
    "audit:lighthouse":  "lhci autorun",
    "audit:axe":         "axe http://localhost:3000 --tags wcag2a,wcag2aa",
    "check:types":       "tsc --noEmit",
    "check:lint":        "next lint",
    "check:all":         "npm run check:types && npm run check:lint && npm run test:layout"
  }
}
```

---

## HUSZONÖTÖDIK FÁZIS — Z-INDEX MENEDZSMENT

### 25.1 Z-index réteg rendszer

A rendezetlen z-index értékek "z-index háborúhoz" vezetnek. Definiálj egy
egységes réteg rendszert:

```typescript
// lib/zIndex.ts — egységes z-index értékek
export const Z_INDEX = {
  base:       0,
  raised:     10,   // emelt kártyák (hover)
  dropdown:   100,  // dropdown menük
  sticky:     200,  // sticky header / sidebar
  overlay:    300,  // overlay háttér (modal mögött)
  modal:      400,  // modal dialog
  tooltip:    500,  // tooltip-ok
  toast:      600,  // értesítések (toast/snackbar)
  emergency:  9999, // csak végső esetben
} as const;
```

```tsx
// Tailwind safelist ha dinamikus z-index kell
// tailwind.config.ts:
safelist: ['z-[100]', 'z-[200]', 'z-[300]', 'z-[400]', 'z-[500]', 'z-[600]']
```

### 25.2 Pozicionált elemek ellenőrzése

```bash
# Absolute/fixed/sticky pozicionált elemek keresése
grep -rn "absolute\|fixed\|sticky\|z-[0-9]" \
  $(find . -path "*/components/*.tsx" | grep -v node_modules) | head -30
```

Ellenőrizd:
- Van-e minden `absolute` pozicionált elemnek `relative` szülője?
- Van-e minden `fixed` elemnek megfelelő z-index?
- Nem fed-e le egy fixed elem a fő tartalmat mobilon?

---

## HUSZONHATODIK FÁZIS — VÉGSŐ ÖSSZEFOGLALÓ ELLENŐRZŐLISTA

Minden refaktor elvégzése után válaszolj igennel minden kérdésre:

**LAYOUT OVERFLOW:**
- [ ] Nincs horizontális scrollbar 375px-en?
- [ ] Nincs horizontális scrollbar 768px-en?
- [ ] Nincs horizontális scrollbar 1024px-en?
- [ ] Nincs horizontális scrollbar 1280px-en?
- [ ] A fő content elem `min-w-0`-val van ellátva?
- [ ] `globals.css`: `overflow-x: hidden` html-en és body-n?
- [ ] Minden kártya/panel wrapper `overflow-hidden`-t tartalmaz?

**GRID ÉS FLEX:**
- [ ] Minden `xl:grid-cols-3` rendelkezik `lg:grid-cols-2` lépcsővel?
- [ ] Minden `xl:grid-cols-4` rendelkezik `lg:grid-cols-3` lépcsővel?
- [ ] Minden grid gyermek `min-w-0`-val van ellátva?
- [ ] Fix szélességű elemek `max-w-full` párral vannak?
- [ ] Flex konténerek `flex-wrap`-pel ahol szükséges?

**TARTALOM:**
- [ ] Minden `<table>` `overflow-x-auto` wrapperben van?
- [ ] Minden `<h1>` és `<h2>` `break-words`-szel van ellátva?
- [ ] Minden potenciálisan hosszú szöveg `truncate`-tel van ellátva?
- [ ] SVG `overflow="visible"`: szülőn `overflow-hidden` van?
- [ ] Chart komponensek `ResponsiveContainer`-ben vannak?

**CORE WEB VITALS:**
- [ ] Hero / above-the-fold kép: `priority` prop megvan?
- [ ] Minden kép rendelkezik `width` és `height` attribútummal?
- [ ] Skeleton screen van minden async betöltett tartalomhoz?
- [ ] Dinamikus tartalom helye reserválva van (nem okoz CLS)?
- [ ] Heavy számítások `useTransition`-nel vagy debounce-szal védve?

**ACCESSIBILITY (WCAG 2.2):**
- [ ] Szöveg-háttér kontraszt ≥ 4.5:1 normál szövegnél?
- [ ] Nagy szöveg (18pt+) kontraszt ≥ 3:1?
- [ ] Minden interaktív elem elérhető billentyűzettel?
- [ ] `focus-visible` ring látható minden interaktív elemen?
- [ ] Minden `<img>` rendelkezik `alt` attribútummal?
- [ ] Minden form input rendelkezik asszociált `<label>`-lel?
- [ ] Hibaüzenetek `role="alert"` vagy `aria-live`-val vannak?
- [ ] Touch targetok legalább 24×24px?
- [ ] Van skip navigation link?
- [ ] Semantic HTML (`header`, `nav`, `main`, `aside`, `footer`) használva?
- [ ] Modal-ok rendelkeznek `aria-modal`, `aria-labelledby` attribútumokkal?

**ANIMÁCIÓ ÉS MOTION:**
- [ ] `@media (prefers-reduced-motion: reduce)` CSS override megvan?
- [ ] Animációk GPU-gyorsított property-ket (`transform`, `opacity`) használnak?
- [ ] Infinite animációk szükségesek és akadálymentességileg kezeltek?

**KÓD MINŐSÉG:**
- [ ] `tsc --noEmit` sikeresen lefutott (0 hiba)?
- [ ] `next lint` / `eslint` nem jelez új hibát?
- [ ] Nincs felesleges `console.log` a kódban?
- [ ] Nincs `!important` (kivéve `prefers-reduced-motion` override)?

**AUTOMATIZÁLT TESZTEK:**
- [ ] Playwright layout teszt lefut és zöld?
- [ ] axe-core nem jelez critical violation-t?
- [ ] Lighthouse accessibility score ≥ 0.9?

**VERZIÓ ÉS DOKUMENTÁCIÓ:**
- [ ] CHANGELOG.md frissítve?
- [ ] versioning/*.md fájl létrehozva (ha szükséges)?
- [ ] Git commit üzenet leírja az összes változtatást?
- [ ] Push sikeres a helyes branch-re?

---

## ÖSSZEFOGLALÁS — A 15 LEGFONTOSABB SZABÁLY

1. **`<main>` mindig kap `min-w-0 overflow-x-hidden`-t** — ez az overflow javítás alapja
2. **Kártya/panel wrapper mindig kap `min-w-0 overflow-hidden`-t** — tartalmazza a gyermek overflow-t
3. **`min-w-[Xpx]` helyett `max-w-full` párost kell alkalmazni** — nem tágul, de összenyomható
4. **`xl:grid-cols-3/4` mindig kap `lg:grid-cols-2/3` lépcsőt** — nincs ugrás xl-re
5. **Minden `<table>` kap `overflow-x-auto` wrappert** — táblázatok scrollolhatók
6. **Hero jobb panel `hidden lg:flex`** — mobilon nincs widget overflow
7. **`flex flex-wrap` minden fix-szélességű gyermeket tartalmazó flex konténerben**
8. **SVG `overflow="visible"` szülője `overflow-hidden`-t kap** — animáció klippelve
9. **`overflow-x: hidden` az html/body-ra globals.css-ben** — globális backstop
10. **Kép méret attribútumok minden képen** — CLS megelőzés
11. **Skeleton screen minden async tartalomhoz** — CLS megelőzés és UX
12. **`focus-visible` ring minden interaktív elemen** — WCAG 2.2 keyboard nav
13. **Szöveg kontraszt ≥ 4.5:1** — a web 79%-a ezen bukik el
14. **`prefers-reduced-motion` CSS override** — mozgásérzékeny felhasználóknak
15. **TypeScript + ESLint + Playwright ellenőrzés minden commit előtt**

---

*Ez a prompt bármely Next.js / React / TypeScript / Tailwind CSS alapú
alkalmazáson alkalmazható. Az AI a konkrét fájlneveket és komponens neveket
önállóan azonosítja a repo struktúrájából.*

*Verzió: 2.0 | Karakterszám: ~50 000 | Fázisok: 26 | Ellenőrzőlista tételek: 80+*
*Kutatási alapok: WCAG 2.2, Core Web Vitals 2025, CSS Container Queries 2025/2026,
Tailwind CSS v4, EU Accessibility Act 2025*
