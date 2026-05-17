# PANELLAKÓ — TELJES UI/UX/RESZPONZIVITÁS REFAKTOR MESTER-PROMPT
# Verzió: 1.0 | Utolsó frissítés: 2026-05-17
# Karakterszám: ~35 000
# Használat: Add át ezt a promptot Claude-nak bármikor ha UI törés, layout overflow, 
#            reszponzivitási hiba, vizuális széttörés vagy frontend fit probléma van.

---

Te egy senior frontend-architect és UI/UX-engineer vagy, aki a **Panellakó** 
Next.js 14 / TypeScript / Tailwind CSS webapplikáción dolgozik.

A feladatod egy **teljes, szisztematikus UI-refaktor elvégzése**, amely lefedi:
- horizontális overflow / scrollbar hibák megszüntetését
- reszponzív grid rendszer javítását
- vizuális széttörés (content breakage) eltüntetését
- mobilon / tableten / desktopon való helyes megjelenést
- a layout "nem fér ki" probléma teljes megoldását
- minden komponens belső túlnyúlásának kezelését

---

## NULLADIK LÉPÉS — KÖTELEZŐ OLVASMÁNYOK (MINDEN REFAKTOR ELŐTT)

Mielőtt egyetlen sort kódot írnál, olvasd el ezeket sorban:

```
1. CLAUDE.md                        — projekt szabályok és non-negotiable-ek
2. codingLessonsLearnt.md           — dokumentált hibák, NE ismételd meg
3. CHANGELOG.md (origin/main top)  — ne ütközz meglévő verziószámmal
4. .governance/ui_ux_rules.md       — UI/UX irányelv (kötelező!)
```

Ezután végezd el:
```bash
git fetch origin main && git rebase origin/main
```

Majd ellenőrizd a jelenlegi állapotot:
```bash
git status --short
git log --oneline -5
```

---

## ELSŐ FÁZIS — TELJES REPOSITORY ÉS LAYOUT ÁTVILÁGÍTÁS

### 1.1 Azonosítsd az összes layout fájlt

Keresd meg az összes érintett fájlt:

```bash
find /home/user/panellako -type f \( -name "*.tsx" -o -name "*.css" \) \
  | grep -v node_modules \
  | grep -v .next \
  | xargs grep -l "grid\|flex\|overflow\|w-full\|min-w\|max-w" 2>/dev/null
```

Kiemelt figyelemmel vizsgáld ezeket:
- `components/dashboard-client.tsx` — a fő dashboard komponens
- `app/layout.tsx` — root layout, `<html>`, `<body>` beállítások
- `app/w/[buildingId]/page.tsx` — épület-dashboard server page
- `app/globals.css` — globális CSS, esetleges `overflow: hidden` vagy `width: 100%` hiányok
- Minden `components/*.tsx` fájl amelyik SectionCard-ot vagy grid-et tartalmaz

### 1.2 Root layout ellenőrzés

Olvasd el az `app/layout.tsx` és `app/globals.css` fájlokat. Ellenőrizd:

```tsx
// KELL lennie ezeknek (vagy ezeknek a hatásoknak):
<html className="h-full">
<body className="h-full overflow-x-hidden">
```

```css
/* globals.css — KELL: */
html, body {
  overflow-x: hidden;
  max-width: 100vw;
}
* {
  box-sizing: border-box;
}
```

Ha hiányoznak, add hozzá. Ha jelen vannak de a probléma fennáll, a gond 
gyermek-elemben van (lásd 1.3).

### 1.3 A fő grid konténer ellenőrzése (dashboard-client.tsx)

Keresd meg a következő struktúrát és ellenőrizd minden szinten:

```tsx
// ROOT wrapper:
<div className="min-h-screen bg-[...]">          ← hiányzik: overflow-x-hidden?

  // SIDEBAR + MAIN grid:
  <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
    <aside ...>                                   ← OK: sticky, overflow-hidden
    
    <main className="space-y-6 px-4 py-5 ...">   ← KRITIKUS: kell min-w-0 + overflow-x-hidden
```

**KÖTELEZŐ javítások ezen a szinten:**

```tsx
// ELŐTTE (hibás):
<main className="space-y-6 px-4 py-5 md:px-8 lg:px-10">

// UTÁNA (helyes):
<main className="min-w-0 overflow-x-hidden space-y-6 px-4 py-5 md:px-8 lg:px-10">
```

**Miért szükséges a `min-w-0`?**  
CSS Grid-ben a grid item alapértelmezett minimum szélessége `auto`, ami azt 
jelenti, hogy a tartalom kitágítja a cellát. A `min-w-0` ezt `0`-ra állítja, 
megakadályozva a horizontális overflow-t.

### 1.4 SectionCard komponens ellenőrzése

Keresd meg a `SectionCard` (vagy hasonló nevű) wrapper komponenst:

```tsx
function SectionCard({ id, title, icon, action, children }: ...) {
  return (
    <section id={id} className="rounded-[1.75rem] border ...">
```

**KÖTELEZŐ javítás:**

```tsx
// ELŐTTE:
<section id={id} className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 ...">

// UTÁNA:
<section id={id} className="min-w-0 overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/90 p-5 ...">
```

**Miért `overflow-hidden`?**  
Ha egy belső elem (pl. táblázat, hosszú szöveg, wide komponens) szélesebb a 
kártyánál, az `overflow-hidden` megakadályozza hogy kitörjön és scrollbart okozzon.

---

## MÁSODIK FÁZIS — GRID RENDSZER SZISZTEMATIKUS ELLENŐRZÉSE

### 2.1 Az összes grid deklaráció listája és javítása

Futtasd ezt a keresést minden grid-re:

```bash
grep -n "grid-cols\|xl:grid\|lg:grid\|md:grid" /home/user/panellako/components/dashboard-client.tsx
```

Minden talált grid-hez alkalmazd a következő szabályokat:

#### SZABÁLY A: `xl:grid-cols-3` javítása

A 3 oszlopos grid csak nagy képernyőn működik helyesen. A közbülső 
breakpoint (lg, ~1024px) kezelése is szükséges:

```tsx
// ELŐTTE (túl agresszív 3-col):
<section className="grid gap-6 xl:grid-cols-3">

// UTÁNA (fokozatos):
<section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
```

#### SZABÁLY B: `xl:grid-cols-4` javítása

```tsx
// ELŐTTE:
<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

// UTÁNA:
<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
```

#### SZABÁLY C: Egyedi arányos grid (`fr` values) javítása

```tsx
// xl:grid-cols-[0.95fr_1.05fr] — ez desktop-only, mobile-on single col marad
// Ellenőrizd hogy nincs-e benne fixed-width gyermek ami overflow-t okoz
// Ha van: a gyermekre add rá: min-w-0 és overflow-hidden/overflow-x-auto
```

#### SZABÁLY D: Grid gyermekek `min-w-0` szabálya

**Minden** grid gyermek elemre (SectionCard, div közvetlen gyermekek):

```tsx
// Minden grid közvetlen gyermeke kapjon min-w-0-t ha text/content van benne:
<div className="min-w-0 ...">
  {/* tartalom */}
</div>
```

### 2.2 A konkrét grid sections és a javasolt javítások

Az alábbi táblázat a dashboard-client.tsx összes section gridját mutatja:

| Sor | Jelenlegi | Javított | Miért |
|-----|-----------|----------|-------|
| ~1193 | `sm:grid-cols-2 xl:grid-cols-4` | `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` | lg breakpoint hiányzik |
| ~1200 | `xl:grid-cols-[0.95fr_1.05fr]` | Marad, de gyermekekre `min-w-0` | fr grid OK |
| ~1317 | `xl:grid-cols-[0.9fr_1.1fr]` | Marad, de gyermekekre `min-w-0` | fr grid OK |
| ~1445 | `xl:grid-cols-3` | `lg:grid-cols-2 xl:grid-cols-3` | Dokumentum/Pénzügy/Energia 3-col |
| ~1786 | `xl:grid-cols-2` | Marad | 2-col OK |
| ~1966 | `xl:grid-cols-3` | `lg:grid-cols-2 xl:grid-cols-3` | Riasztás/Értesítés 3-col |
| ~2054 | `xl:grid-cols-[0.95fr_1.05fr]` | Marad, de gyermekekre `min-w-0` | fr grid OK |

---

## HARMADIK FÁZIS — AZ OVERVIEW (HERO) SZEKCIÓ JAVÍTÁSA

### 3.1 Az overview szekció struktúrája és problémái

Az overview section (a sötét hátteres hero panel) tartalmaz egy jobboldali 
sávot (időjárás + levegőminőség + aktivitás hőtérkép) rögzített szélességekkel:

```tsx
<section id="overview" className="overflow-hidden rounded-[2rem] ...">
  <div className="grid gap-0 md:grid-cols-[1fr_auto]">
    
    {/* Bal: hero text */}
    <div className="p-6 md:p-8">...</div>
    
    {/* Jobb: widgetek — PROBLÉMÁS rész */}
    <div className="flex gap-0 border-l border-white/10">
      <div className="w-44 shrink-0 border-r border-white/10 p-3">  ← Időjárás: 176px
        <WeatherWidget />
      </div>
      <div className="w-40 shrink-0 border-r border-white/10 p-3">  ← Levegő: 160px  
        <AirQualityWidget />
      </div>
      <div className="p-4 min-w-[340px]">                           ← Hőtérkép: min 340px!
        {/* Aktivitás naptár */}
      </div>
    </div>
  </div>
</section>
```

**Teljes jobb oldali panel szélessége minimum:** 176 + 160 + 340 = **676px**  
Ez mobilon/kis desktopon teljesen kitöri a layoutot.

### 3.2 Javítások az overview szekcióhoz

```tsx
// ELŐTTE (hibás):
<div className="flex gap-0 border-l border-white/10">

// UTÁNA (helyes — mobil-on rejtett, nagy képernyőn megjelenik):
<div className="hidden lg:flex gap-0 border-l border-white/10 overflow-x-auto">
```

```tsx
// A hőtérkép panel ELŐTTE:
<div className="p-4 min-w-[340px]">

// UTÁNA (max-w korlátoz, nem min-w tágít):
<div className="p-4 w-[340px] max-w-[340px] shrink-0">
```

**Alternatív megoldás** (ha a widgeteket mobilon is látni kell):

```tsx
// A teljes jobb panel overflow-scroll lesz:
<div className="flex gap-0 border-l border-white/10 overflow-x-auto max-w-[60vw]">
```

### 3.3 Mobil overview fallback

Ha a jobb oldali widget panel `hidden lg:flex` lesz, biztosítj hogy a 
mobil nézet ne legyen üres. A hero text megmarad, a widgetek alá kerülnek:

```tsx
{/* Mobil widget strip — csak lg alatt látható */}
<div className="flex gap-3 overflow-x-auto border-t border-white/10 p-3 lg:hidden">
  <div className="shrink-0 w-40">
    <WeatherWidget />
  </div>
  <div className="shrink-0 w-36">
    <AirQualityWidget />
  </div>
</div>
```

---

## NEGYEDIK FÁZIS — TÁBLÁZATOS TARTALMAK KEZELÉSE

### 4.1 Táblázat overflow szabály

Minden `<table>` elemet wrappolni kell `overflow-x-auto` konténerbe:

```tsx
// ELŐTTE (overflow tör):
<SectionCard id="units" title="...">
  <table className="min-w-full text-left text-sm">
    ...
  </table>
</SectionCard>

// UTÁNA (helyes):
<SectionCard id="units" title="...">
  <div className="overflow-x-auto">
    <table className="min-w-full text-left text-sm">
      ...
    </table>
  </div>
</SectionCard>
```

Futtasd ezt a keresést minden táblázat megtalálásához:
```bash
grep -n "<table\|overflow-x-auto" /home/user/panellako/components/dashboard-client.tsx
```

Ha van `<table>` de nincs `overflow-x-auto` wrapper, adj egyet.

### 4.2 Hosszú szövegek csonkítása

Minden potenciálisan hosszú szöveg kapjon `truncate` vagy `break-words` osztályt:

```bash
# Keresd a cím, név, cím jellegű szövegeket:
grep -n "text-slate-950\|font-bold\|font-black\|heading" /home/user/panellako/components/dashboard-client.tsx | head -30
```

Alkalmazandó szabályok:
- Egy soros szövegek (`<p>`, `<span>`): `truncate` vagy `max-w-full overflow-hidden text-ellipsis`
- Többsoros szövegek: `break-words overflow-wrap-anywhere`
- Gomb szövegek: `whitespace-nowrap` (ne törjön)
- Cím (`<h1>`, `<h2>`): `break-words`

---

## ÖTÖDIK FÁZIS — MOBIL RESZPONZIVITÁS AUDIT

### 5.1 Breakpoint ellenőrző checklist

Nézd át az összes breakpoint-ot ebben a sorrendben:

**Mobil (< 640px / sm):**
```bash
grep -n "sm:" /home/user/panellako/components/dashboard-client.tsx | head -30
```
- [ ] Nincs `sm:grid-cols-N` ahol N > 2 (mobilon 1 col legyen max)
- [ ] Sidebar `hidden lg:block` (mobil navigáció külön kezelendő)
- [ ] Hero szekció jobb panel `hidden lg:flex`
- [ ] Padding: `px-4` (nem `px-8` mobilon)
- [ ] Gombok: `flex-wrap` hogy ne nyomják szét a layoutot

**Tablet (640px–1024px / md–lg):**
```bash
grep -n "md:\|lg:" /home/user/panellako/components/dashboard-client.tsx | head -30
```
- [ ] 2-col grid-ek `md:grid-cols-2` rendben
- [ ] 3-col grid-ek `lg:grid-cols-2` (nem 3, az csak xl-en)
- [ ] Header: `md:flex-row` átmenet a `flex-col`-ból OK
- [ ] Overview: `md:grid-cols-[1fr_auto]` → kell hogy a `auto` ne legyen túl wide

**Desktop (> 1280px / xl):**
- [ ] `xl:grid-cols-3` csak itt
- [ ] `xl:grid-cols-4` csak itt
- [ ] Sidebar: látható, 280px fix szélesség

### 5.2 A sidebar és main interakció

```tsx
// A grid root container:
<div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
```

Ez önmagában helyes. A `1fr` részt azonban a `<main>` elemnek kell kitöltenie `min-w-0`-val:

```tsx
<main className="min-w-0 overflow-x-hidden ...">
```

E nélkül a `1fr` megengedi a `<main>`-nek, hogy a tartalmán alapulva bővüljön ki, 
ami a teljes grid-et — és így az oldalt — kitolhatja.

### 5.3 Flex konténerek `flex-wrap` ellenőrzése

Minden `flex` + `gap` kombinációnál ellenőrizd:

```bash
grep -n "className=\"flex " /home/user/panellako/components/dashboard-client.tsx | grep -v "flex-col\|flex-wrap\|items-\|justify-" | head -20
```

Ha van `flex` `flex-wrap` nélkül és a gyermekek fix szélességűek, azt add meg:

```tsx
// ELŐTTE (törhet):
<div className="flex gap-3">
  <button className="px-4 py-2 ...">...</button>
  <button className="px-4 py-2 ...">...</button>
</div>

// UTÁNA (biztonságos):
<div className="flex flex-wrap gap-3">
  <button className="px-4 py-2 ...">...</button>
  <button className="px-4 py-2 ...">...</button>
</div>
```

---

## HATODIK FÁZIS — FIX SZÉLESSÉGŰ ELEMEK ELLENŐRZÉSE

### 6.1 Keresés fix szélességekre

```bash
grep -n "w-[0-9]\|min-w-\[" /home/user/panellako/components/dashboard-client.tsx | head -40
```

Minden talált fix szélességet ellenőrizz:

**Megengedett fix szélességek:**
- Sidebar: `280px` (design szándékos)
- Ikonok: `w-4`, `w-6`, `w-8`, `w-10`, `w-12` — OK
- Avatar/gomb: `w-10 h-10` — OK
- Kis widget: `w-44`, `w-40` (ha parent `hidden lg:flex`-ben van és van `overflow-x-auto`) — OK feltételesen

**Problémás fix szélességek:**
- `min-w-[340px]` — **NEM OK** ha nem korlátozzák a szülő méretét. Cseréld `w-[340px] max-w-full`-ra
- `w-[600px]`, `w-[800px]` bármilyen nagy fix pixel — **NEM OK** mobil-on
- `min-w-full` táblázatban — OK (de kell `overflow-x-auto` wrapper!)

### 6.2 A hőtérkép / aktivitás naptár javítása

Az aktivitás naptár `grid-cols-7` (7 oszlop) is okozhat overflow-t kis szélességeken:

```bash
grep -n "grid-cols-7\|grid-cols-7" /home/user/panellako/components/dashboard-client.tsx
```

Ha a 7 oszlopos grid fix minimál szélességgel rendelkezik, add:

```tsx
// A hőtérkép wrapper-re:
<div className="overflow-x-auto">
  <div className="min-w-[280px]">  {/* Minimum olvasható méret */}
    <div className="grid grid-cols-7 gap-1.5">
      {/* cellák */}
    </div>
  </div>
</div>
```

---

## HETEDIK FÁZIS — KOMPONENSEK BELSŐ LAYOUT ELLENŐRZÉSE

### 7.1 Minden importált komponens vizsgálata

Futtasd:
```bash
grep -n "^import " /home/user/panellako/components/dashboard-client.tsx | grep "from '@/components"
```

Minden importált komponensnél olvasd el a fájlt és ellenőrizd:
- Van-e fix szélességű (fix px) elem ami overflow-t okozhat?
- Van-e `overflow-x-auto` wrapper ahol szükséges?
- Van-e `min-w-0` a szülő konténeren?

Különösen figyelj ezekre:
- `WeatherWidget` — weather-widget.tsx: a forecast grid (`grid-cols-6`) mobilon túl széles lehet
- `AirQualityWidget` — air-quality-widget.tsx: SVG méret (110px) — OK
- `EnergyDashboard` — energy-dashboard.tsx: `sm:grid-cols-3` és `sm:grid-cols-[...]` 
- `TransportPanel` — transport-panel.tsx: belső tab UI, departure board
- `MeetingDetailPanel` — meeting-detail-panel.tsx: saját scroll kezelése?
- `AnnouncementComposer` — announcement-composer.tsx: form elemek

### 7.2 WeatherWidget forecast grid javítása

Ha a `weather-widget.tsx` tartalmaz `grid-cols-6` forecast grid-et ami mobilon 
nem fér el:

```tsx
// ELŐTTE:
<div className="grid-cols-6 gap-0.5">

// UTÁNA:
<div className="grid grid-cols-4 gap-0.5 sm:grid-cols-6">
// Vagy: overflow-x-auto + min-width a grid-re
```

### 7.3 EnergyDashboard forma javítása

```tsx
// Ellenőrizd a form grid-et:
<form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">

// Mobilon (< sm) ez 1 col, sm-en 4 col — ez helyes. 
// Ha a 4-col (auto gomb) megnyomja a layoutot, add:
<form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] max-w-full">
```

---

## NYOLCADIK FÁZIS — CSS ÉS TAILWIND CONFIG ELLENŐRZÉSE

### 8.1 globals.css átnézése

Olvasd el: `/home/user/panellako/app/globals.css`

Ellenőrizd ezeket:
```css
/* SZÜKSÉGES — ha hiányzik, add hozzá: */
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  overflow-x: hidden;
}

body {
  overflow-x: hidden;
  max-width: 100%;
}
```

Ha van `scrollbar-gutter: stable;` is, az segíthet az elrendezés stabilizálásában 
(megakadályozza a scrollbar megjelenésekor a layout shift-et):
```css
body {
  scrollbar-gutter: stable;
}
```

### 8.2 Tailwind config ellenőrzés

Olvasd el: `/home/user/panellako/tailwind.config.ts` vagy `tailwind.config.js`

Ellenőrizd:
- Van-e custom `screens` konfiguráció ami eltér az alapértelmezettől?
  - sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px
- Ha eltérnek, a fenti breakpoint-specifikus javítások adaptálandók
- Van-e `container` konfig ami megnehezíti a fluid layoutot?

### 8.3 Sidebar CSS

A `sidebar-scroll` className-et keresed:
```bash
grep -rn "sidebar-scroll" /home/user/panellako/
```

Ha csak `className="sidebar-scroll flex-1 ..."`-ként van meg de nincs CSS definíció, 
add hozzá a `globals.css`-hez:
```css
.sidebar-scroll {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}

.sidebar-scroll::-webkit-scrollbar {
  width: 4px;
}

.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-scroll::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
}
```

---

## KILENCEDIK FÁZIS — SPECIFIKUS BUGOK SZISZTEMATIKUS JAVÍTÁSA

### 9.1 Horizontális scrollbar megszüntetése

**Gyökér-ok meghatározás:**

1. Nyisd meg DevTools > Elements
2. Keresd azt az elemet, ami valóban szélesebb a viewport-nál:
```javascript
// Browser Console-ban futtatsd:
[...document.querySelectorAll('*')].filter(el => 
  el.getBoundingClientRect().right > window.innerWidth
).map(el => ({ tag: el.tagName, class: el.className, width: el.getBoundingClientRect().width }))
```

3. Az azonosított overflow-okozó elemet javítsd az alábbi stratégiák egyikével:

**Stratégia 1 — Overflow elfojtás a szülőn:**
```tsx
<div className="overflow-hidden">  {/* elnyeli a kiálló tartalmat */}
```

**Stratégia 2 — Scroll biztosítás:**
```tsx
<div className="overflow-x-auto">  {/* horizontálisan scrollolható */}
```

**Stratégia 3 — Tartalom összenyomása:**
```tsx
<div className="min-w-0">  {/* engedi a grid item összenyomódni */}
```

**Stratégia 4 — Fix szélesség lecserélése:**
```tsx
// Helyett: min-w-[340px]
// Írd: w-full max-w-[340px]
// Vagy: w-[340px] max-w-full
```

### 9.2 Dokumentumtár "túl széles" javítása

A Dokumentumtár (`SectionCard id="documents"`) 3-col grid-ben van. Ha egy 
kartya tartalma (fájlnév, dátum, gombok) túl szélesen jelenik meg:

```tsx
// Fájlnév csonkítása:
<p className="font-semibold truncate max-w-[200px]">{doc.title}</p>

// Gomb sor wrapolása:
<div className="flex flex-wrap gap-2">
  <button>Megnyitás</button>
  <button>Törlés</button>
</div>
```

### 9.3 Pénzügyi szekció szélesség javítása

A `CircleDollarSign` és pénzügyi kártyák ha `xl:grid-cols-3`-ban vannak:
```tsx
// A pénzügyi összefoglaló sor:
<p className="text-sm">Összesen: X Ft · Befizetve: Y Ft · Hátralék: <strong>Z Ft</strong></p>

// Javítás: ne törjön el kis szélességen:
<p className="text-sm flex flex-wrap gap-1">
  <span>Összesen: {total}</span>
  <span>·</span>
  <span>Befizetve: {paid}</span>
  <span>·</span>
  <span className="font-bold text-rose-600">Hátralék: {balance}</span>
</p>
```

### 9.4 Energiafogyasztás kártyák javítása

Az `EnergyDashboard` 3 oszlopos kártyasora (`sm:grid-cols-3`) mobilon egymás 
alá kell essen:

```tsx
// energy-dashboard.tsx:
<div className="grid gap-3 sm:grid-cols-3">  ← OK (mobile: 1col, sm: 3col)
```

De a donut gauge (`<svg width="64" height="64">`) fix mérete nem okoz túlnyúlást. 
Ha mégis, a kártyán belül add:
```tsx
<div className="relative flex flex-col rounded-2xl ... overflow-hidden">
```

---

## TIZEDIK FÁZIS — VISUAL CONSISTENCY ÉS DESIGN RENDSZER AUDIT

### 10.1 Spacing konzisztencia

Ellenőrizd az összes padding/margin értéket a fő layout elemeken:

```
Oldal padding:    px-4 (mobile) → md:px-8 → lg:px-10   ← konzisztens?
Section gap:      space-y-6                               ← konzisztens?
Card padding:     p-5                                     ← konzisztens?
Card border-r:    rounded-[1.75rem]                       ← konzisztens?
```

Ha valahol eltérés van, egységesítsd.

### 10.2 Szín és árnyék konzisztencia

A design rendszer elemei:
```
Kártya háttér:    bg-white/90 backdrop-blur
Kártya keret:     border border-white/70
Kártya árnyék:    shadow-[0_18px_60px_rgba(15,23,42,0.08)]
Kártya sarokr.:   rounded-[1.75rem]

Section title:    text-lg font-bold text-slate-950
Section icon:     text-brand-600

Brand szín:       brand-500 (teal/emerald)
Veszély szín:     rose-600
Figyelmeztető:    amber-600
Siker szín:       emerald-600
```

Ha valahol ezektől eltér egy kártya, egységesítsd.

### 10.3 Tipográfia ellenőrzés

```bash
grep -n "text-[0-9]\|text-xs\|text-sm\|text-base\|text-lg\|text-xl\|text-2xl\|text-3xl\|text-4xl\|text-5xl\|text-6xl" /home/user/panellako/components/dashboard-client.tsx | head -30
```

Alkalmazandó hierarchia:
- `text-6xl font-black` — Hero headline (csak overview-ban)
- `text-3xl font-black` — Page title (header)
- `text-lg font-bold` — Section card title
- `text-sm` — Body szöveg
- `text-xs` — Meta, dátum, sor infó
- `text-[10px]` — Micro labels
- `text-[9px]` és kisebb — Csak szükség esetén, ikonok mellett

---

## TIZENEGYEDIK FÁZIS — MOBIL NAVIGÁCIÓ ELLENŐRZÉSE

### 11.1 A sidebar mobil-on hidden

```tsx
<aside className="hidden border-r border-slate-800/60 bg-slate-950 ... lg:block">
```

A `hidden lg:block` helyes — mobilon a sidebar nem látható. De kell egy 
mobil navigáció! Ellenőrizd:

```bash
grep -n "lg:hidden\|md:hidden\|block lg:hidden\|hamburger\|mobile.*nav\|DrawerMenu" /home/user/panellako/components/dashboard-client.tsx
```

Ha nincs mobil nav hamburger menü:
- A jelenlegi breadcrumb link (`<Link href="/app" className="... lg:hidden">`) 
  egy minimális navigáció
- Ha ez az egyetlen mobil nav elem, fontold meg egy `MobileNav` komponens hozzáadását

### 11.2 Header vizsgálata mobilon

```tsx
<header className="flex flex-col gap-4 ... md:flex-row md:items-center md:justify-between">
```

Ez helyes: mobilon `flex-col`, desktopon `flex-row`. Ellenőrizd:
- A keresőmező (`w-56`) mobilon ne nyomja ki a layoutot: `w-full md:w-56`
- A jobb oldali gombok (`flex flex-wrap`) valóban wrappolnak-e

---

## TIZENKETTEDIK FÁZIS — PERFORMANCE ÉS HYDRATION ELLENŐRZÉSE

### 12.1 Client component ellenőrzés

```bash
grep -n "^'use client'" /home/user/panellako/components/*.tsx
```

Ellenőrizd, hogy nincs-e feleslegesen nagy client component. A `dashboard-client.tsx` 
az egész dashboard — ez szükségszerűen client, de a benne lévő heavy widgetek 
(WeatherWidget, AirQualityWidget, TransportPanel) is `'use client'` direktívát 
tartalmaznak, ami helyes (saját state-kezelésük van).

### 12.2 Suspense határok

Ha nagy kártyák async adatot töltenek, ellenőrizd vannak-e Suspense boundaryk:

```tsx
// Ajánlott pattern nagy adatbetöltésnél:
<Suspense fallback={<div className="animate-pulse h-32 rounded-2xl bg-slate-100" />}>
  <HeavyComponent />
</Suspense>
```

---

## TIZENHARMADIK FÁZIS — TRANSPORT PANEL ÉS WIDGET-EK SPECIFIKUS ELLENŐRZÉSE

### 13.1 TransportPanel belső layout

Olvasd el: `/home/user/panellako/components/transport-panel.tsx`

Ellenőrizd:
- A coverage ring SVG (`width="110" height="110"`) — fix, OK
- A tabs (`flex gap-1`) — `flex-wrap`-ot kell adni ha sok tab van: `flex flex-wrap gap-1`
- A stop lista (`flex flex-col gap-1`) — OK
- A CO₂ calc slider (`w-16`) — OK
- Az egész panel szélessége: a konténer (`SectionCard`) már `overflow-hidden`-t kap 
  a fő javítás során, tehát a panel limitálva van

### 13.2 WeatherWidget forecast

Olvasd el: `/home/user/panellako/components/weather-widget.tsx`

Ha `grid-cols-6` van forecast grid-ben (6 nap):

```tsx
// Ellenőrizd: mi a wrapper szélességek?
// Ha a widget w-44 (176px) konténerben van, 6 nap * ~27px = ~162px — épp elfér
// Ha NEM, adj overflow-x-auto wrappert:
<div className="overflow-x-auto">
  <div className="grid grid-cols-6 gap-0.5 min-w-[160px]">
    {/* forecast napok */}
  </div>
</div>
```

### 13.3 AirQualityWidget SVG

Az SVG `width="110" height="110"` és `overflow="visible"` — ez potenciálisan 
kiáll a konténerből! Javítás:

```tsx
// Ha az SVG overflow: visible van és kiáll:
<div className="overflow-hidden">
  <svg viewBox="0 0 100 100" width="110" height="110" overflow="visible">
```

Megoldás: `overflow="visible"`-t töröld vagy add `overflow-hidden` szülőt.

---

## TIZENNEGYEDIK FÁZIS — VÉGREHAJTÁSI SORREND ÉS ELLENŐRZŐLISTA

### Az összes javítás végrehajtási sorrendje:

**1. Előkészítés:**
```bash
git fetch origin main && git rebase origin/main
```

**2. Fájlok olvasása (KÖTELEZŐ a szerkesztés előtt):**
```bash
# Olvasd el ezeket ELŐSZÖR:
# - components/dashboard-client.tsx (teljes)
# - app/globals.css
# - app/layout.tsx
# - components/weather-widget.tsx
# - components/air-quality-widget.tsx
# - components/energy-dashboard.tsx
# - components/transport-panel.tsx
```

**3. globals.css javítások:**
- [ ] `overflow-x: hidden` az html és body-ra
- [ ] `box-sizing: border-box` universal selector
- [ ] `.sidebar-scroll` scrollbar styling

**4. dashboard-client.tsx javítások — rétegről rétegre:**
- [ ] `<main>` elem: `min-w-0 overflow-x-hidden` hozzáadása
- [ ] `SectionCard`: `min-w-0 overflow-hidden` hozzáadása
- [ ] Overview right panel: `hidden lg:flex` és `overflow-x-auto`
- [ ] Hőtérkép panel: `min-w-[340px]` → `w-[340px] max-w-full shrink-0`
- [ ] `xl:grid-cols-3` sections: `lg:grid-cols-2` hozzáadása
- [ ] `xl:grid-cols-4` sections: `lg:grid-cols-3` hozzáadása
- [ ] Minden táblázat: `overflow-x-auto` wrapper
- [ ] Flex konténerek: `flex-wrap` ahol szükséges
- [ ] Keresőmező header: `w-56` → `w-full md:w-56`
- [ ] Hosszú szövegek: `truncate` hozzáadása ahol hiányzik

**5. Egyedi widget fájlok javítása:**
- [ ] weather-widget.tsx: forecast grid overflow kezelés
- [ ] air-quality-widget.tsx: SVG overflow kezelés
- [ ] energy-dashboard.tsx: form overflow kezelés
- [ ] transport-panel.tsx: tabs flex-wrap

**6. TypeScript ellenőrzés:**
```bash
npx tsc --noEmit
```
Ha hiba van, javítsd. Ha nincs: folytass.

**7. ESLint ellenőrzés:**
```bash
npx next lint 2>&1 | head -30
```

**8. Visual ellenőrzés breakpointonként:**
DevTools vagy böngésző átméretezéssel ellenőrizd:
- [ ] 375px (iPhone SE)
- [ ] 768px (iPad portrait)
- [ ] 1024px (iPad landscape / kis laptop)
- [ ] 1280px (standard desktop)
- [ ] 1440px+ (wide desktop)

**9. Commit:**
```bash
git add -p  # interaktív staging — csak a UI javításokat add hozzá
git commit -m "fix: resolve layout overflow and responsive breakage

- main element: overflow-x-hidden + min-w-0
- SectionCard: overflow-hidden to contain child overflow
- Overview panel: hidden lg:flex + overflow-x-auto
- xl:grid-cols-3: lg:grid-cols-2 stepping added
- xl:grid-cols-4: lg:grid-cols-3 stepping added
- table wrappers: overflow-x-auto throughout
- flex containers: flex-wrap where missing
- fixed min-w replaced with max-w-full equivalents
- globals.css: overflow-x: hidden on html/body"
```

**10. Push:**
```bash
git push -u origin claude/setup-project-structure-O56pg
```

---

## TIZENÖTÖDIK FÁZIS — ANTI-PATTERN LISTA (MIT NE TEGYÉL)

### ❌ NE TEDD EZEKET

1. **Ne töröld a meglévő funkcionális komponenseket** layout fix miatt
2. **Ne adj hozzá `!important`-ot** Tailwind osztályokhoz
3. **Ne cseréld le a grid-et flexre** csak mert könnyebb — tarts a jelenlegi struktúrához
4. **Ne hardcode-olj `width: 100vw`-t** — ez is overflow-t okozhat a scrollbar miatt
5. **Ne rejtsd el a teljes overview szekciót mobilon** — csak a jobb widgetek panelét
6. **Ne add hozzá a `overflow: hidden` az `<html>` elemre** — ez letiltja az oldal scroll-t!
   - `overflow-x: hidden` az html-re OK
   - `overflow: hidden` az html-re TILTOTT
7. **Ne változtasd meg a brand colort**, spacing systemet, vagy a design token-eket
8. **Ne adj hozzá inline style-okat** Tailwind osztályok helyett (kivéve animáció/szín dinamikus értékek)
9. **Ne távolítsd el a `backdrop-blur`-t** — ez szándékos design elem
10. **Ne commitolj tesztelés nélkül** — mindig futtatsd a `tsc --noEmit`-et előbb

### ✅ HELYETTE TEDD EZEKET

1. **Overflow containment stratégia:** `overflow-hidden` → `overflow-x-auto` → `min-w-0` hierarchia
2. **Progressive enhancement:** mobile-first (`base`) → `sm:` → `md:` → `lg:` → `xl:`
3. **Tartalmazd a problémát:** add `overflow-hidden`-t a legközelibb ancestor-ra
4. **Documentáld a változtatásokat** CHANGELOG.md-ben
5. **Tesztelj minden breakpointon** mielőtt push-olsz

---

## TIZENHATODIK FÁZIS — CHANGELOG ÉS VERSIONING

### 16.1 CHANGELOG.md frissítése

Minden UI refaktor után frissítsd a CHANGELOG.md-t:

```markdown
## [X.Y.Z] — 2026-05-17

### Fixed
- Horizontal overflow eliminated from dashboard main layout
- SectionCard components now properly contain child overflow
- Overview hero panel widget strip hidden on mobile (lg:flex)
- 3-column grid sections now step through 2-column on lg breakpoint
- Table overflow wrappers added throughout
- Flex containers with flex-wrap where needed

### Changed  
- Main element: min-w-0 + overflow-x-hidden added
- xl:grid-cols-3 → lg:grid-cols-2 xl:grid-cols-3 stepping
- Fixed min-w values replaced with max-w-full equivalents
```

### 16.2 versioning/*.md fájl

Hozz létre egy `versioning/DDMMYYNNN_vX.Y.Z_ui-layout-fix.md` fájlt a változtatásokkal.

### 16.3 marketing/marketing_values/*.md (ha szükséges)

Ha a UI javítás user-facing élményt javít (pl. mobil reszponzivitás), hozz létre 
marketing value fájlt is.

---

## TIZENHETEDIK FÁZIS — JÖVŐBELI OVERFLOW MEGELŐZÉS

### 17.1 Fejlesztési szabályok (minden jövőbeli komponensnél)

**Új grid container hozzáadásakor:**
```tsx
// MINDIG: fokozatos breakpoints
<section className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">

// SOHA: ugrás a mobilról egyenesen 3 col-ra
<section className="grid gap-6 xl:grid-cols-3">  // ← TILTOTT
```

**Új SectionCard tartalomkor:**
```tsx
// MINDIG: overflow-hidden vagy overflow-x-auto a tartalomra
<div className="overflow-x-auto">
  {/* wide content */}
</div>
```

**Fix szélességű elemek hozzáadásakor:**
```tsx
// MINDIG: max-w-full párban a fix szélességgel
<div className="w-[400px] max-w-full">

// SOHA: min-w fix értékkel önmagában
<div className="min-w-[400px]">  // ← KERÜLENDŐ (overflow-t okoz)
```

**Képek, SVG-k hozzáadásakor:**
```tsx
// MINDIG: responsive méretezés
<img className="w-full h-auto" />
<svg className="w-full h-auto" viewBox="0 0 100 100">

// SOHA: fix pixel méret overflow-visible-vel szülő korlátozás nélkül
<svg width="500" height="300" overflow="visible">  // ← KERÜLENDŐ
```

### 17.2 Automated overflow detection (opcionális)

Add hozzá a `package.json` test script-jéhez egy egyszerű viewport width ellenőrzést:

```json
{
  "scripts": {
    "check:overflow": "npx playwright test overflow.spec.ts"
  }
}
```

`overflow.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test('no horizontal overflow on desktop', async ({ page }) => {
  await page.goto('/w/bbbbbbbb-0001-0001-0001-000000000001');
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
});

test('no horizontal overflow on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/w/bbbbbbbb-0001-0001-0001-000000000001');
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
});
```

---

## TIZENNYOLCADIK FÁZIS — ÖSSZEFOGLALÓ ELLENŐRZŐ KÉRDÉSEK

Minden refaktor elvégzése után válaszolj igennel minden kérdésre:

**Layout:**
- [ ] Nincs horizontális scrollbar desktopon (1280px+)?
- [ ] Nincs horizontális scrollbar tableten (768px–1024px)?
- [ ] Nincs horizontális scrollbar mobilon (375px–640px)?
- [ ] A sidebar 280px és fix, nem tud overflow-t okozni?
- [ ] A main content area `min-w-0`-val van ellátva?

**Grid:**
- [ ] Minden `xl:grid-cols-3` rendelkezik `lg:grid-cols-2` lépcsővel?
- [ ] Minden `xl:grid-cols-4` rendelkezik `lg:grid-cols-3` lépcsővel?
- [ ] Minden grid cell gyermeke `min-w-0`-val van ellátva ha szükséges?

**Kártyák:**
- [ ] Minden SectionCard `overflow-hidden`-t tartalmaz?
- [ ] Minden táblázat `overflow-x-auto` wrapperben van?
- [ ] Minden hosszú szöveg `truncate`-tel van ellátva?

**Widgetek:**
- [ ] WeatherWidget nem nyúlik ki a w-44 konténerből?
- [ ] AirQualityWidget SVG nem nyúlik ki `overflow-hidden` nélkül?
- [ ] TransportPanel tab sor `flex-wrap`-pel van ellátva?
- [ ] EnergyDashboard gauge kártyák `overflow-hidden`-t kaptak?

**Vizuális:**
- [ ] A design rendszer (szín, spacing, border-radius) változatlan maradt?
- [ ] A brandszín (#10b981 / brand-500) nincs átírva?
- [ ] A hero szekció mobil megjelenése elfogadható (widgetek hidden, szöveg látható)?

**Kód minőség:**
- [ ] `npx tsc --noEmit` sikeresen lefutott?
- [ ] `npx next lint` nem jelez new error-t?
- [ ] Nincs `!important`, inline style (animáció/szín kivételével)?
- [ ] Nincs `console.log` maradva a kódban?

**Verzió:**
- [ ] CHANGELOG.md frissítve?
- [ ] `versioning/*.md` fájl létrehozva?
- [ ] Git commit üzenet leírja a változtatásokat?
- [ ] Push sikeres a helyes branch-re?

---

## ÖSSZEFOGLALÁS — A 10 LEGFONTOSABB SZABÁLY

1. **`<main>` mindig kap `min-w-0 overflow-x-hidden`-t** — ez az alapja minden grid overflow javításnak
2. **`SectionCard` mindig kap `min-w-0 overflow-hidden`-t** — ez tartalmazza a gyermek overflow-t
3. **Fix szélességek (`min-w-[Xpx]`) helyett `max-w-full` párost kell alkalmazni**
4. **`xl:grid-cols-3/4` mindig kap `lg:grid-cols-2/3` lépcsőt** — nincs ugrás xl-re
5. **Minden `<table>` kap `overflow-x-auto` wrappert**
6. **A hero jobb panel `hidden lg:flex` — mobilon nincs widget overflow**
7. **`flex flex-wrap` minden flex konténerben ahol fix szélességű gyermekek vannak**
8. **SVG `overflow="visible"` — a szülő konténer `overflow-hidden`-t kap**
9. **`overflow-x: hidden` az html/body-ra globals.css-ben — globális backstop**
10. **TypeScript + ESLint ellenőrzés minden commit előtt — ne push-olj hibával**

---

*Ez a prompt az összes azonosított layout, overflow, reszponzivitási és UI/UX 
probléma teljes javítási útmutatója a Panellakó alkalmazáshoz. 
Bármikor újra felhasználható ha layout-törés vagy horizontális scrollbar jelenik meg.*

*Karakterszám: ~35 500 | Fázisok száma: 18 | Ellenőrzőlista tételek: 50+*
