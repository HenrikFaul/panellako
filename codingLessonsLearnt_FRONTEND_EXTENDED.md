# Kiterjesztett tanulságok a session_log.md hibáiból — Frontend-generálási kritikus problémák

**Dokumentum verzió**: v1.0.0  
**Frissítés dátuma**: 2026-06-12  
**Fázis**: HENRIS Forge v0.5.0 — node-ts stack session, 16 fájl generálása

---

## 🔴 KATEGÓRIA: Frontend-generálási kritikus hibák (2026-06-12)

### [HIBA-FRONTEND-001] Frontend-pár (HTML+JS) párhuzamos generálása szerződés-eltérésre esik

**Dátum**: 2026-06-12 (v0.5.0)

**Fájlok**: `public/index.html` + `public/app.js`

**Hibaüzenet**:
```
FRONTEND-TARTALOM KAPU: a főoldal HTML-je üres/tartalmatlan 
| nem használja a design-alap vázszerkezetét (app-header + app-main kötelező) 
| a frontend JS nem hív /api/ végpontot (nem jelenít meg adatot)
```

**Gyökérok**:
- A HTML és JS párhuzamosan készült (réteg 7. lépésben).
- Mindkettő **függetlenül** találgatta meg az API-végpont-neveket, az elem-id-kat és a renderelési struktúrát.
- Az HTML nem tartalmazott `app-header`, `app-main` id-kat, a JS pedig az ezeket használó renderelési kódot.
- Sem az egyik sem látta a másik szerződését.

**Tünet**:
- A webapp fekete képernyő.
- Konzolban: `Cannot read properties of null (reading 'appendChild')` vagy `getElementById(...) is null`.
- Függőségi furcsamajátékra esik: mindkettő újragenerálódik, de továbbra sem kommunikálnak.

**Javítás**:
1. Az HTML és JS **SOHA nem párhuzamos** — az HTML előbb készül (statikus struktúra definiálása), majd a JS abban hivatkozik.
2. Az HTML-ből exportált **DOM-szerződés fájl** (`dom-contract.json`) tartalmazza az összes kötelező id-kat, class-okat, és az alapvázszerkezetet.
3. A JS-generáló prompt **kötött** ezt a szerződés-fájlt kapja meg: `"EZEK az id-k garantáltan léteznek, CSAK EZEKET használd"`.
4. A kapu ellenőrzi:
   - (a) az HTML tartalmazza az összes szerződés-id-ot
   - (b) a JS csak ezekre hivatkozik
   - (c) az API-hívások megfelelnek a tényleges végpont-neveknek

**Megelőzés**:

**Réteg-szintű szétválasztás**: A frontend HTML és JS **nem azonos párhuzamosítási szintben** lehet.
- Sorrend: `HTML (rang 7) ⊃ JS (rang 8)` — szigorú függőség.

**DOM-szerződés file**:
- Az előkészítő lépés legyen: `DESIGN-PHASE` → HTML generálás → DOM-szerződés export → JS generálás.

**Kötött prompt-injektálás**:
- A JS prompt tartalmazzon konkrét id-listaként:
  ```
  "A HTML-ben szükséges id-k: app-header, app-main, energy-grid, solar-grid, status. 
  Ezeken kívül TILOS DOM-elemeket keresni."
  ```

**Kapu-lánc**:
1. HTML-szintaxis + DOM-id-jelenlét
2. JS-szintaxis
3. API-hívás validálás a tényleges backend-végpont-lista ellen (HTTP-QA)
4. Frontend-elindítás + screenshot/network-trace

---

### [HIBA-FRONTEND-002] API-végpont szinkronizáció hiánya — frontend és backend dupla /api prefix

**Dátum**: 2026-06-12 (v0.5.0) — session_log sor 17:36

**Fájl**: `public/app.js` (frontend hívás) ↔ `src/server.ts` (mount pont)

**Hibaüzenet**:
```
LINT: ⛔ lint-kapu (public/app.js): NEM LÉTEZŐ API-végpontot hívsz: /api/energy-consumption 
— a backend KIZÁRÓLAG ezeket adja: /api/api/energy-consumption, /api/api/solar-production
```

**Gyökérok**:
- A route-fájl (`src/routes/apiStats.ts`) definiálta: `router.get('/api/energy-consumption')`
- A server mountot csinált: `app.use('/api/stats', router)` — **PATH-DUPLIKÁCIÓ!**
- A frontend a logikus `/api/energy-consumption` útvonalra hivatkozott.
- **Tényleges URL lett**: `/api/stats/api/energy-consumption` (dupla /api prefix)

**Javítás**:
- A route-fájlban a belső utak **RELATÍVAK**: `router.get('/energy-consumption')`
- Az mount adja az `/api` prefixet: `app.use('/api', router)`
- Így a tényleges URL: `/api/energy-consumption` (helyes)

**Megelőzés**:

**Kapu a route-fájlokra**:
- Ellenőrizd, hogy a route definíciók **NEM** tartalmazzák a mount-prefix-et.
- Regex: `/router\.(get|post|put|delete)\s*\(\s*['"]\/api\//` — újragenerálás.

**Tényleges API-lista kapu**:
- A pipeline az összes route-fájl alapján **tényleges url-listát** buildel (`/api/energy-consumption`).
- Ezt injektálja a frontend-prompt-ba:
  ```
  "A backend ezeket a végpontokat adja: 
  - GET /api/energy-consumption (params: user_id)
  - GET /api/solar-production (params: user_id)
  [...]"
  ```

**Auto-fix**:
- A dupla /api prefix automatikusan levágható (pl. `route.get('/api/x')` → `route.get('/x')` lint-auto-fix)

**HTTP-QA**:
- Az összes frontend API-hívás tényleges HTTP-get előtt ellenőrizve van: 2xx/404 válasz vs. 400/5xx.

---

### [HIBA-FRONTEND-003] JS szintaktikai hibák (unclosed braces, unexpected identifier)

**Dátum**: 2026-06-12 (v0.5.0)

**Fájl**: `public/app.js`

**Hibaüzenet**:
```
LINT: ⚠ frontend-pár maradék jelzésekkel írva: 
JS szintaktikai hiba: Unexpected end of input
JS szintaktikai hiba: Unexpected identifier 'renderData'
```

**Gyökérok**:
- A 7B kódoló modell hosszú JS-fájlban lezáratlan `{` vagy `}` kapcsos zárójelet hagyott.
- Vagy félbehagyott egy függvénydefiníciót a fájl vége felé.
- Ez a **determinisztikus JavaScript parser** (nem interpreter) az `node -c` paranccsal azonnal detektálja.

**Javítás**:
- Az auto kapu futtatja `node -c public/app.js`-t minden generálás után.
- Szintaktikai hiba esetén a fájl **újragenerálódik** friss kontextussal (előzmények törlésével).

**Megelőzés**:

**JS-szintaxis kapu**: 
- Minden frontend JS `npm run build` vagy `node -c` előtt **KÖTELEZŐ**.

**Apróbb korlátok a JS-promptban**:
```
"Egy függvény max 40 sor, max 3 szint beágyazás, 
függvényt `function foo() {...}` vagy `const foo = () => {...}` 
formában írj. Minden { zárójel után gondoskodj a } lezárásáról."
```

**JSHint vagy ESLint**:
- A kapu futtathat `npx eslint public/app.js` parancsot is (ha .eslintrc megvan).

**Token-limit**: 
- A prompt végén ismételd meg a kulcs-szabályokat: 
  - "Zárójel-egyensúly: minden `{` után kell `}`"
  - "Függvényt `function` vagy `const` forma"

---

### [HIBA-FRONTEND-004] Framework-szintaxis vanilla-JS helyett (Vue/React import/export)

**Dátum**: 2026-06-12 (v0.5.0) — session_log sor 17:40, 17:41

**Fájl**: `public/app.js`

**Hibaüzenet**:
```
LINT: ⛔ lint-kapu (public/app.js): 
böngésző-script modul-szintaxissal (import/export) — 
vanilla JS kötelező, framework (Vue/React) TILOS
```

**Gyökérok**:
- A 7B modell (qwen2.5-coder) betanított módban Vue/React-es kódot írhatott.
- Még akkor is, ha a prompt explicit tilotta.
- A modell a betanított kód-gyakoriságban következtetett: 
  - `"frontend JS = import/export = Vue minta"`

**Tünet**:
- A böngésző: `Uncaught SyntaxError: Cannot use import statement outside a module`
- Vagy halott és nem működő interface.

**Javítás**:
1. A JavaScript Parser-kapu detektálja:
   ```regex
   import\s+.*\s+from
   export\s+(default\s+)?(function|const|class|{)
   ```
   Hibánál újragenerálás.

2. A prompt újra hangsúlyozza:
   ```
   "**VANILLA JAVASCRIPT KIZÁRÓLAG**: 
   - NO import
   - NO export
   - NO npm modules
   - Laikus fájl: <script> tag közt fut
   - Globális függvények, window.API = {}"
   ```

3. Opcionálisan: modellek közötti eszkaláció.
   - Ha 2x ugyanaz a hibaminta → nagyobb modellre váltás.

**Megelőzés**:

**Determinisztikus tilt**:
- A lint-gate regex-szel fogja ki az `import`/`export` szó-mintákat, még fordítás előtt.

**Lessons-fájl szócikk**:
```
"Böngészős vanilla JS nem használ import/export vagy npm. 
Ha külső lib kell, <script src=CDN> tag-gel."
```

**Mandatory szabály a promptban (3-4 soros, NAGY BETŰK)**:
```
"VANILLA JAVASCRIPT: 
- No import/export/require
- Egyetlen fájl, függvények globálisak
- Ha lib kell: <script src=CDN> tag
- HTTP hívás: fetch() API-val"
```

---

### [HIBA-FRONTEND-005] HTML üres vagy hiányzik a kötelező struktúra

**Dátum**: 2026-06-12 (v0.5.0)

**Fájl**: `public/index.html`

**Hibaüzenet**:
```
FRONTEND-TARTALOM KAPU: 
a főoldal HTML-je üres/tartalmatlan 
| nem használja a design-alap vázszerkezetét (app-header + app-main kötelező)
```

**Gyökérok**:
- Az HTML-generáló prompt "intelligens" szabadságot kapott az index.html megtervezésénél.
- De a 7B modellnél nem kellően specifikus a korlát.
- Az eredmény: egy teljesen üres `<html><head></head><body></body></html>`.
- Vagy hiányzott az `<div id="app-main">` vázszerkezet.

**Javítás**:

**HTML-sablon injektálása**:
- A prompt egy konkrét HTML-vázat kap, amiben csak a tartalom-részet (kártyák, diagramok) kell feltölteni:

```html
<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Intelligent Household</title>
  <style>
    body { font-family: sans-serif; margin: 0; background: #f5f5f5; }
    #app-header { background: #333; color: #fff; padding: 1rem; }
    #app-main { max-width: 1200px; margin: 1rem auto; }
    .card { background: #fff; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <header id="app-header">
    <h1>Intelligent Household</h1>
  </header>
  <main id="app-main">
    <!-- IDE KERÜLNEK A KÁRTYÁK STB -->
  </main>
  <script src="app.js"></script>
</body>
</html>
```

**Kapu-ellenőrzés**:
- Az HTML tartalmaz-e:
  - `<title>` elem
  - `<meta charset="UTF-8">`
  - `<main id="app-main">` (vagy `<div id="app-main">`)
  - `<script src="app.js">` vagy `<script>...</script>` tag
  - Legalább 1 `<div id="...">` tartalom-elem
- Ha valamelyik hiányzik → újragenerálás.

**Eszkaláció**:
- Ha az első generálás üres vagy csonka → a prompt friss kontextussal **teljes HTML-t** kér (nem patchelés).

**Megelőzés**:

**Sablon-injektálás kötelező**:
- Soha ne `"írj HTML-t"` — mindig `"egészítsd ki ezt a sablont: [...]"`.

**Kapu-lista**:
- Min. 5 kötelező elem azonosítása az HTML-ben; hiányzik → újragenerálás.
- Ellenőrző szöveg: `grep -c '<main\|<div id="app-main"' public/index.html`

**Screenshot-validáció**:
- Ha van böngésző: a QA-fázis HTML-t betölti és screenshotot készít.
- Üres vagy hiányzó tartalom akkor nyilvánvaló.

---

### [HIBA-FRONTEND-006] API-válasz alak eltérése frontend-elvárástól

**Dátum**: 2026-06-12 (v0.5.0)

**Fájl**: `public/app.js` (fetch+JSON.parse) ↔ `src/routes/apiStats.ts` (végpont)

**Hibaüzenet**:
```
Uncaught TypeError: Cannot read property 'totalConsumption' of undefined
(frontend) 
vagy 
a felületen "undefined kWh" jelenik meg
```

**Gyökérok**:
- A frontend `response.data.totalConsumption` mezőt várt.
- Az API `{ consumption: [...], summary: {...} }` alakot adott.
- Az alakok **soha nem voltak szinkronizálva** — mindkettő tippelt.

**Javítás**:

**ÉLŐ API-mintavétel fázis** (session_log: 17:45, 17:47):
- A pipeline az összes route-fájl alapján **ténylegesen meghívja** a végpontokat.
- Az eredményt `API_RESPONSES.json` fájlba menti.

**JS-generáló prompt injektálása**:
- Konkrét JSON-válasz-mintákat kap:
  ```
  "A `/api/energy-consumption` végpont ezt adja vissza: 
  { 
    user_id: '...', 
    consumption: [100, 150, 200, ...], 
    timestamp: '2026-06-12T...'
  }
  Pont ebből az alakból olvasd a `consumption` tömböt."
  ```

**Kapu-ellenőrzés**:
- A fetch hívások JSON-parsálása valódi válaszok ellen tesztelve.
- Regex: `response\.(.+?)\.(.+?)` — ellenőrizni, hogy a JSON-path létezik-e a mintában.

**Megelőzés**:

**ÉLŐ mintavétel kapu**: 
- Minden frontend-generálás **UTÁN és ELŐTT**, mint a QA-lánc része.
- Az API-végponton teszthívás, az eredmény strukturális validálása.

**Válasz-alak-export**:
- `API_RESPONSES.json` a prompt-kontextusba:
  ```json
  {
    "GET /api/energy-consumption": {
      "sample": { "user_id": "1", "consumption": [...] },
      "required_fields": ["consumption"]
    }
  }
  ```

**Type-checking hint**:
- A promptban kódminta:
  ```javascript
  const data = response.json();
  if (!data.consumption) {
    throw new Error('API error: no consumption field');
  }
  ```

---

### [HIBA-FRONTEND-007] Globális elem-ID-szerződés hiánya

**Dátum**: 2026-06-12 (v0.5.0)

**Fájl**: `public/index.html` + `public/app.js`

**Hibaüzenet**:
```
LINT: ⚠ frontend-pár maradék jelzésekkel írva: 
a js olyan elem-id-kat használ, amik nincsenek a html-ben: status
```

**Gyökérok**:
- A JS `document.getElementById('status')` hívásokon keresztül elemeket keresett.
- Amelyek az HTML-ben nem voltak definiálva.
- Ez a **kereszt-fájl szerződés-hiba**.
- Futásidőben: `Cannot read properties of null`

**Javítás**:

**DOM-szerződés fájl** (`dom-contract.json`):
```json
{
  "required_ids": [
    "app-header",
    "app-main",
    "energy-grid",
    "solar-grid",
    "status"
  ],
  "required_classes": [
    "card",
    "card-title",
    "card-body"
  ],
  "root_element": "app-main"
}
```

**HTML-generáló prompt KÖTÖTT**:
```
"Az alábbi id-kat KÖTELEZŐEN tartalmazd: 
- app-header
- app-main
- energy-grid
- solar-grid
- status

Ezek nélkül a JS nem működik."
```

**JS-generáló prompt KÖTÖTT**:
```
"CSAK az alábbi id-kat használd a HTML-ből: 
- app-header
- app-main
- energy-grid
- solar-grid
- status

Más id-kat SOHA ne keress."
```

**Kapu**:
- HTML-ben hiányzó id → újragenerálás.
- JS olyan id-tat használ ami nem a listában → újragenerálás.

**Megelőzés**:

**DOM-szerződés generátor**:
- A design/plan fázisban egy tanulságfüggvény összeállítja az összes szükséges id-t a terv alapján.
- Exportálja `dom-contract.json`-ként.

**Prompt-injektálás**:
- Mind HTML, mind JS megkapja ezt a listát.

**Kapu-validáció**:
- HTML parser ellenőrzi, hogy az összes id létezik.
- Regex-scanner a JS-ben ellenőrzi: `getElementById\s*\(\s*['"]([^'"]+)` — az id-nak szerződésben kell lennie.

---

### [HIBA-FRONTEND-008] Async adatbetöltés feltöltés nélkül — üres képernyő

**Dátum**: 2026-06-12 (v0.5.0) — korábban már leírva [HIBA-F015]

**Fájl**: `public/app.js`

**Hibaüzenet**:
```
"Monitoring 0 Assets" 
vagy 
teljesen üres felület; konzolban sokszor nincs hiba
```

**Gyökérok**:
- Az adatbetöltés `loadData()` aszinkron.
- A renderelés pedig szinkron és **előtte** futt le.
- Az adat `undefined` marad.

**Javítás**:

Helyes minta:
```javascript
async function init() {
  await loadData();      // wait for data
  renderDashboard();     // render AFTER data loaded
}
init();
```

Vagy az egyszerűbb (Promise-alapú):
```javascript
loadData().then(() => renderDashboard());
```

**Megelőzés**:

**JS-prompt szabály**:
```
"Adatbetöltés MINDIG `await` vagy `.then()` mögött történik, 
a renderelés UTÁNA. 

ROSSZ: loadData(); renderDashboard();
JÓ: await loadData(); renderDashboard();
JÓ: loadData().then(() => renderDashboard());"
```

**Szintaxis-kapu**:
- Grepeli `loadData()` sima hívásait (await vagy .then nélkül).
- Regex: `loadData\s*\(\s*\);` (nem követi `await` vagy `\.then`)
- Ha talál → újragenerálás.

**Végrehajtási tesztelés**:
- A QA-fázis böngészőben betölti az oldalt.
- Vizuálisan ellenőrzi, hogy megjelenik-e az adat (pl. screenshot).
- Vagy API network trace: van-e GET `/api/energy-consumption` hívás és 200-as válasz.

---

### [HIBA-FRONTEND-009] HTML-sztring appendChild helyett insertAdjacentHTML

**Dátum**: 2026-06-12 (v0.5.0) — korábban már leírva [HIBA-F016]

**Fájl**: `public/app.js`

**Hibaüzenet**:
```
TypeError: Failed to execute 'appendChild' on 'Node': 
parameter 1 is not of type 'Node'.
```

**Gyökérok**:
- A JS `element.appendChild(htmlString)` mintát próbál meg.
- Ez érvénytelen — a `appendChild` Node-ot vár, nem sztringet.

**Javítás**:

ROSSZ:
```javascript
element.appendChild("<div>...html...</div>");
```

JÓ (1. mód):
```javascript
element.insertAdjacentHTML('beforeend', "<div>...html...</div>");
```

JÓ (2. mód):
```javascript
const temp = document.createElement('div');
temp.innerHTML = "<div>...html...</div>";
element.appendChild(temp.firstChild);
```

**Megelőzés**:

**Szabály a promptban**:
```
"HTML-sztringek: MINDIG `insertAdjacentHTML()` vagy `innerHTML`. 
`appendChild()` CSAK Node-okra, nem sztringre.

ROSSZ: element.appendChild('<div>...</div>');
JÓ: element.insertAdjacentHTML('beforeend', '<div>...</div>');
JÓ: element.innerHTML = '<div>...</div>';"
```

**Regex-kapu**:
- Detektálja: `appendChild\s*\(\s*["'].*["']\)` minta.
- Újragenerálás.

---

### [HIBA-FRONTEND-010] Aggregát-lekérdezés alias nélkül — "undefined" az eredményben

**Dátum**: 2026-06-12 (v0.5.0) — korábban már leírva [HIBA-F020]

**Fájl**: `src/db/db.ts` (seed lekérdezés) ↔ `public/app.js` (adat felhasználás)

**Hibaüzenet**:
```
"undefined kWh" a felületen; 
konzolban: data.totalConsumption === undefined
```

**Gyökérok**:
- A seed `SELECT SUM(consumption) FROM ...` lekérdezést futtatta.
- Az eredmény kulcsa: `SUM(consumption)` (literál, nem alias).
- A kód `.totalConsumption` vagy `.sum` mezőt keresett → nem talált.

**Javítás**:

ROSSZ:
```sql
SELECT SUM(consumption) FROM consumption_log;
-- eredmény: { "SUM(consumption)": 1234 }
```

JÓ:
```sql
SELECT SUM(consumption) AS total_consumption FROM consumption_log;
-- eredmény: { "total_consumption": 1234 }
```

**Megelőzés**:
- (Már felsorolva más fájlban, de ismétlendő.)
- **Minden agregátum lekérdezésben KÖTELEZŐ az alias**.
- SQL-prompt szabály: `"Agregáló függvények (COUNT, SUM, AVG, MIN, MAX) MINDIG alias-t kapnak: AS cnt, AS total_sum, stb."`

---

## 🟡 KATEGÓRIA: Backend-frontend szinkronizáció (2026-06-12)

### [HIBA-INTEGRATION-001] Route-végpont lista szinkronizálása hiánya

**Dátum**: 2026-06-12 (v0.5.0)

**Gyökérok**:
- Az összes route-fájl independ definiálta az URL-eket.
- A frontend pedig guesselt — nincs "single source of truth".

**Javítás**:
- A pipeline **generálása után** összegyűjti az összes route-fájlból az exportált URL-eket.
- Kiírja: `generated/ROUTES.json`

Minta:
```json
[
  { 
    "method": "GET", 
    "path": "/api/energy-consumption", 
    "params": ["user_id"],
    "description": "Get energy consumption data for user"
  },
  { 
    "method": "GET", 
    "path": "/api/solar-production", 
    "params": ["user_id"],
    "description": "Get solar production data for user"
  }
]
```

- Ezt az frontend-generáló prompt megkapja, és **csak ezekre** hivatkozhat.

**Megelőzés**:

**Route-export kapu**:
- Minden route-fájl `export const ROUTES = [...]` tömböt ad.
- Amit a központi aggregátor összeszed: `routes-aggregate.json`.

**Frontend-prompt injektálás**:
- Az összes végpont lista explicit a promptban.

**HTTP-QA**:
- Az összes frontend fetch-hívás valóban 2xx-et ad vissza.

---

### [HIBA-INTEGRATION-002] Seed-adatok hiánya — API-végpont üres választ ad

**Dátum**: 2026-06-12 (v0.5.0) — session_log 17:57 `"SEED-KAPU: minden adat-végpont üres"`

**Fájl**: `src/db/db.ts` (seed függvény)

**Hibaüzenet**:
```
Az API `[]` tömböt ad vissza; 
a frontend "No data" üzenetet mutat
```

**Gyökérok**:
- A seed lekérdezés nem futott le.
- Vagy az INSERTek csendben meghiúsultak (RLS, constraint, típushiba).

**Javítás**:

1. A pipeline a db inicializálása után ellenőrzi:
   ```
   "Van-e legalább 1 sor az összes adattáblában?"
   ```
   Ha nem → seed újrafutása vagy explicit hibajelzés.

2. **SEED-KAPU**: a HTTP-QA lépésben az összes adat-végpont **minimum 1 sort** kell visszaadjon.
   - Ha 0 → újra seed + hiba-log.

**Megelőzés**:

**Seed-validáció után**:
```sql
SELECT COUNT(*) FROM energy_consumption; 
SELECT COUNT(*) FROM solar_production;
-- Ha valamelyik 0 → hiba
```

**QA-lánc része**:
```
"GET /api/X → min 1 elem válasz, max 1000 elem.
GET /api/X?user_id=1 → konkrét user adatai vagy 200-empty array ha nincs."
```

---

## 🟢 KATEGÓRIA: Mérési és korrekciós stratégia

### [LESSON-QA-METRICS-001] Frontend-generálási siker-metrikák

**Definiáció**:

- **Syntax pass**: 
  - JS: `node -c` zöld
  - HTML: parser zöld
  
- **Contract pass**: 
  - DOM-id-szerződés teljesülve
  - HTML ⊇ contract.ids
  - JS ⊆ contract.ids
  
- **API alignment pass**: 
  - Frontend fetch-utak = ROUTES.json útvonalak
  
- **Runtime pass**: 
  - Böngészőben betöltés 0 konzolos hiba
  - Adatok megjelennek
  
- **Visual pass**: 
  - Screenshot-alapú
  - Legalább 1 kártya + adat-szöveg látható

### [LESSON-QA-GATES-001] Frontend-generálás kapu-lánca

**1. Syntax gate**:
```bash
node -c public/app.js
npx htmlhint public/index.html  # ha van
```

**2. Contract gate**:
- DOM-id validálás
- API endpoint validálás

**3. Compile gate**:
- Teljes backend compile (TypeScript)

**4. Runtime gate**:
- Server indítás
- HTTP-QA (3-5 végpont tesztelése)

**5. Visual gate** (opcionális):
- Puppeteer/Playwright böngészőben screenshotok
- OCR text detection ("kWh", számok megjelennek-e)

---

### [LESSON-FALLBACK-001] Ha a frontend N-szer bukik: eszkaláció

**1-2x szinkron bukás**:
- Újragenerálás friss kontextussal (előzmények törlése)

**3-4x szinkron bukás**:
- Modell-eszkaláció: coder → nagyobb (14B Q4 vagy felhő-modell terv-fázishoz)

**5x+ szinkron bukás**:
- Emberi review
- Az orchestrator **STOP**-ot ír
- A végpont-lista / adatminta / dom-szerződés **manuális ellenőrzés** alatt kerül
- Újra startup friss, validált adatokkal

---

## 📋 KITERJESZTETT ELLENŐRZŐ LISTA — Frontend generáláshoz

### Pre-generálás

- [ ] Backend KOMPILÁLVA és FUTVA — route-lista / válasz-mintavétel elérhető
- [ ] DOM-szerződés (`dom-contract.json`) megvan — összes id-szerződés definiálva
- [ ] API-végpont lista (`ROUTES.json`) megvan — mind a HTML, mind a JS megkapja

### HTML generálás

- [ ] HTML-sablon injektálva a prompt-ba (nem üres sheet)
- [ ] HTML-generáló prompt tartalmazza: "Kötelezően add meg ezeket az id-kat: [...]"
- [ ] HTML-kapu: szintaxis OK, HTML parser zöld
- [ ] HTML-kapu: tartalmazza az összes dom-contract id-kat
- [ ] HTML-kapu: `<script src="app.js">` vagy `<script>...</script>` tag jelen

### JS generálás

- [ ] JS-prompt KÖTÖTT a DOM-szerződéshez: "CSAK ezeket az id-kat használd: [...]"
- [ ] JS-prompt KÖTÖTT a route-listához: "Végpontok: [...]"
- [ ] JS-prompt KÖTÖTT az API-válasz-mintákhoz: "Válasz-alak: {...}"
- [ ] JS-prompt szabályok: **no import/export, vanilla only, await-based fetch, insertAdjacentHTML**
- [ ] JS-szintaxis kapu: `node -c public/app.js` zöld

### Validálás

- [ ] Contract gate: HTML tartalmaz-e összes dom-contract id-kat?
- [ ] Contract gate: JS csak a szerződés-id-kat használ-e?
- [ ] API-alignment gate: frontend fetch-path-jai = ROUTES.json-ban felsorolt útvonalak?
- [ ] ÉLŐ API-mintavétel: valódi végpont-válaszok `API_RESPONSES.json`-ba, a JS-prompt megkapja
- [ ] Seed-kapu: legalább 1 sor az összes adat-táblában az indítás után
- [ ] HTTP-QA: 2-3 főbb adat-végpont 2xx választ ad, nem 4xx/5xx

### Runtime

- [ ] Server start: `node dist/server.js` indul, portot slussal nem lövi le, 3 mp alatt ready
- [ ] Böngésző betöltés: nincs konzolos hiba (0 red errors)
- [ ] Adatok megjelennek: legalább 1 szám / érték "undefined" helyett
- [ ] Visual kapu (ha böngésző): kártyák + fejléc + számok láthatók (screenshot)

### Post-generálás

- [ ] Hibamódsagyűjtés: minden generálási bukás rögzítésre kerül
- [ ] Lesson-append: bukás → `codingLessonsLearnt.md`-be új bejegyzés
- [ ] Versioning: a sikeres frontend-verzió git-commitba kerül

---

## 📚 Integrációs dokumentumok

### `dom-contract.json` minta:
```json
{
  "version": "1.0.0",
  "generated_at": "2026-06-12T18:00:00Z",
  "required_ids": {
    "app-header": "Main header element",
    "app-main": "Main content container",
    "energy-grid": "Energy consumption grid",
    "solar-grid": "Solar production grid",
    "status": "Status indicator",
    "loading-spinner": "Loading animation"
  },
  "required_classes": [
    "card",
    "card-title",
    "card-body",
    "grid-row",
    "btn",
    "btn-primary"
  ],
  "root_element": "app-main",
  "constraints": {
    "no_framework": "vanilla JS only",
    "no_module_syntax": "no import/export",
    "must_load_async": "data loaded via fetch with await"
  }
}
```

### `ROUTES.json` minta:
```json
[
  {
    "method": "GET",
    "path": "/api/energy-consumption",
    "params": ["user_id"],
    "response": {
      "schema": {
        "user_id": "string",
        "consumption": "number[]",
        "timestamp": "ISO8601"
      },
      "example": {
        "user_id": "user-123",
        "consumption": [100, 150, 200],
        "timestamp": "2026-06-12T00:00:00Z"
      }
    }
  },
  {
    "method": "GET",
    "path": "/api/solar-production",
    "params": ["user_id"],
    "response": {
      "schema": {
        "user_id": "string",
        "production": "number[]",
        "timestamp": "ISO8601"
      },
      "example": {
        "user_id": "user-123",
        "production": [50, 75, 100],
        "timestamp": "2026-06-12T00:00:00Z"
      }
    }
  }
]
```

---

## 🔧 Orchestrációs szabályok

### Réteg-szintű függőség (SZIGORÚ SZ. SORRENDBEN)

1. **Backend compile + route-lista export** (rang 5-6)
2. **API-mintavétel + ROUTES.json, API_RESPONSES.json** (rang 6)
3. **DOM-szerződés-export** (rang 6-7)
4. **HTML generálás** (rang 7)
5. **JS generálás** (rang 8) ← **CSAK HTML után**
6. **Server runtime + HTTP-QA** (rang 9)
7. **Visual validation** (rang 10, opcionális)

### Paralelizálás csak ugyanazon rang-en belül engedélyezett!

- Rang 5-6 (backend + API): párhuzam OK
- Rang 7 (HTML): egyszeres
- Rang 8 (JS): egyszeres, **mindig HTML után**
- Rang 9 (runtime): egyszeres

---

Ez a kiterjesztés az eredeti **codingLessonsLearnt.md** struktúrájára épül, de **frontend-specifikus**, **QA-vezérelt**, és **eszkaláció-stratégiát** tartalmaz a jövőbeli session_log hibáinak megelőzéséhez.

**Verzió**: v1.0.0  
**Utoljára frissítve**: 2026-06-12  
**Szerzett**: session_log.md (2026-06-12 17:27—18:20) alapján  
**Status**: Éles validáció alatt