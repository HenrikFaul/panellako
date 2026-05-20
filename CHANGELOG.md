
## 2026-05-20 — v0.7.5 Geocoder + budapest_import részletes hibadiagnosztika

### Fixed
- **`app/api/superadmin/jobs/run/route.ts` `geocodeAddress`** korábban a hiba esetén csak **`null`-t** adott vissza, így a 4 building-re hivatkozó job (`satellite_refresh`, `urban_refresh`, `env_refresh_green`, `urban_atlas_refresh`) `geocodeFailed: 1` üzenetnél megállt információ nélkül. Most részletes objektumot ad vissza:
  - **`{ ok: true, lat, lon, source: 'internal' | 'nominatim', attempts: [...] }`** sikernél (forrás-jelölés a két fallback között)
  - **`{ ok: false, reason: string, attempts: [...] }`** kudarcnál, ahol az `attempts` minden próbálkozást rögzít HTTP status + hibaüzenettel (üres cím, Nominatim 0 találat, hálózati hiba stb.)
  - Üres / 5 karakternél rövidebb cím külön explicit hibaüzenetet kap, nem csak "fetch failed"
- A 4 érintett job most a result-ban visszaadja a **`failures: Array<{ buildingId, name, address, reason, attempts }>`** mezőt — minden geocode-elhasalt épületre megmondja, **melyik volt az**, **mi volt az address**, **miért bukott**, és **mely geocoder-eken bukott el milyen módon**. A superadmin output mostantól meg tudja állapítani, hogy a cím rossz, üres, vagy a Nominatim utasítja el.

### Fixed (network diagnostics)
- **`budapest_import`** job a "fetch failed" lakonikus üzenetet adta minden hiba esetén. Most:
  - 3 lehetséges CKAN-bázis-URL-t próbál sorba (`opendata.budapest.hu/api/3/action` → `nyiltadat.budapest.hu/api/3/action` → `opendata.budapest.hu/api/action`)
  - Mindegyikre futtatott `/package_search?rows=1` próbát logol `fetchErrors: [{ url, error }]` listában, beleértve a `cause` mező első 100 karakterét (DNS/TLS/connect debug)
  - Minden eredeti CKAN-hívás (`package_search`, `datastore_search`) explicit `User-Agent`, `Accept`, `Referer` headerekkel megy
  - Időtúllépés `package_search`-re 10s → 15s (CKAN szervere lassú lehet)
  - Hiba esetén a teljes `fetchErrors` lista visszakerül a job result-jába, így a superadmin pontosan látja melyik URL bukott el milyen hibával
- Ezzel a budapest_import most már **megmondja hogy minden bázis-URL elérhetetlen** ahelyett, hogy némán "fetch failed"-et adna — a következő lépés az lesz, hogy a 3 URL közül legalább egyik válaszoljon, vagy alternatív forrást keressünk (pl. OSM Overpass `natural=tree`).

## 2026-05-20 — v0.7.4 NDVI render NASA GIBS-re + diagnosztika UI kontraszt fix

### Fixed
- **`lib/ndvi-mosaic.ts` + `app/api/superadmin/jobs/run/route.ts`**: a v0.7.3-ban bevezetett **Earth Search STAC + titiler.xyz** alapú pipeline 100%-ban elhasalt élesben (`"All 28 scene renders failed: fetch failed"` minden MGRS tile-ra). A `titiler.xyz` `/stac/preview` endpoint nem érhető el Vercel egress-ből (a `/cog/point/` igen, ami a meglévő `satellite_refresh` job-ban működik — de a STAC-mód láthatóan nincs deployolva titiler.xyz-en, vagy URL-séma másképp van). Lecserélve **NASA GIBS WMS**-re: egyetlen HTTP GET = teljes Magyarország NDVI PNG, semmilyen mozaikolás nem kell, semmilyen API kulcs nem kell.
  - Forrás: `MODIS_Terra_NDVI_8Day` (primer) + `MODIS_Aqua_NDVI_8Day` (fallback), 250 m natív felbontás, 8 napos rolling composite, naponta frissül
  - Endpoint: `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi` (NASA EOSDIS, AWS CloudFront-CDN-en, ingyenes, kulcs nélkül, rate-limit-mentes normál használatra)
  - 8 napos slot-kereső: a job kipróbálja a legfrissebb 8-napos composite-ot, majd 4 héten visszafelé, ha valamelyik nem ad ki adatot (`< 1 KB payload` = NASA "no data" placeholder → következő próbálkozás)
  - Trade-off: 250 m forrás-felbontás (Sentinel-2 10 m helyett) — egy Magyarország-overview-hez ez teljesen elég, és a workflow nem igényel mozaikolást és cross-UTM reprojection-t (ami sharp/proj4-rel kezelhetetlen lenne Vercel-en)
- **`components/superadmin-diagnostics.tsx`** teljes UI rewrite: a v0.6.8-ban bevezetett dark-theme színek (`bg-white/[0.02]`, `text-slate-400` stb.) **láthatatlanok** voltak a `/superadmin` light-theme alapon (`bg-slate-100`/`bg-white`). Minden szín lecserélve a többi superadmin szekció paletta-stílusára:
  - Szekció: `bg-white` + `border-slate-200` + `shadow-sm` (a többi card-dal egyezően)
  - Címek: `text-slate-900` / `text-slate-800`
  - Body: `text-slate-700`; secondary: `text-slate-500`; tertiary: `text-slate-400`
  - Form: `bg-white` border-elt szürke, `focus:ring-sky-500`
  - Primary gombok: `bg-sky-600 text-white hover:bg-sky-700` (kontrasztos)
  - Success gomb (Overpass batch): `bg-emerald-600 text-white hover:bg-emerald-700`
  - Code/preformatted blokkok: **`bg-slate-900` + `text-slate-100`** (sötét háttér + világos szöveg = magas kontraszt a body / headers megjelenítésére)
  - Status badge-ek: solid pasztell hátterek (rose-100/emerald-100/amber-100) + sötét szöveg = jól olvasható szín-kódolás
- 2 új preset gomb a curl-runnerhez: `gibs-ndvi` (NASA GIBS MODIS NDVI próba-lekérés) és `earth-search` (Element84 STAC POST keresés Budapest pontra) — kifejezetten az új NDVI render-pipeline tesztelésére.

### Removed
- titiler.xyz STAC preview hívások (`renderSceneNdvi`, `buildHungaryMosaic`, `searchSentinel2Scenes`, `pickBestScenePerTile`, `MosaicSceneSelection`, `StacItem` lib-API-k) — élesben nem működtek, NASA GIBS váltja ki
- A `cycling.source` style MGRS-tile per-scene compositing logic — egyetlen WMS hívás váltja ki

### Notes
- `sharp` dep megmarad: a master render (8192×3440) Lanczos3-mal downscale-elődik a 4 felbontásra ahelyett, hogy 4-szer hívnánk a GIBS-et (sávszélesség- és időtakarékos)
- Felhasználói toggle bar + viewer komponens változatlan
- Source-attribution mostantól a `ndvi_hungary_renders.source_provider = 'nasa-gibs-wms'` és `source_satellite = 'MODIS Terra/Aqua 8-Day NDVI'`

## 2026-05-20 — v0.7.3 NDVI Magyarország — Sentinel Hub helyett 100% ingyenes pipeline

### Changed (breaking)
- A `ndvi_hungary_render` job teljes pipeline-ja átírva. A v0.7.2-ben bevezetett **Sentinel Hub Process API** (havi 30 000 PU free, de aki túl akar lépni az fizet) **lecserélve egy 100%-ban ingyenes, kulcs nélküli megoldásra**:
  - **Earth Search STAC** (Element84, `https://earth-search.aws.element84.com`) — Sentinel-2 L2A jelenetek indexe AWS S3 nyílt adat-tárolón
  - **titiler.xyz** (Development Seed publikus deploy) — Cloud-Optimized GeoTIFF olvasó, ami szerver-oldalon számolja az `(nir-red)/(nir+red)` NDVI kifejezést és színkódot ad rá; failover `cog.titiler.eoapi.dev` mirror
  - **sharp** — Hungary-canvas-ra komponálja a per-scene NDVI PNG-ket a STAC item bbox-a alapján, majd 4 felbontásra Lanczos3-mal downscale-eli
- Az új workflow ugyanaz, amit a tipikus Sentinel-2 szakdolgozatok használnak: nyílt forrás, semmilyen API-kulcs.

### Removed
- `lib/sentinel-hub.ts` (törölve)
- `SENTINEL_HUB_CLIENT_ID` és `SENTINEL_HUB_CLIENT_SECRET` env-vars **már nem kellenek**

### Added
- `lib/ndvi-mosaic.ts`: `searchSentinel2Scenes` (Earth Search STAC POST), `pickBestScenePerTile` (MGRS-tile szerinti deduplikáció + legkevésbé felhős preferencia), `renderSceneNdvi` (titiler.xyz `/stac/preview.png` failover-rel két host között), `buildHungaryMosaic` (4-párhuzamos render + sharp composite a STAC bbox alapján), `downscalePng` (Lanczos3 resize)
- A render-job mostantól 60 napos időablakkal dolgozik (a 30 nap helyett, így minden MGRS-tile-ra mindig akad cloud-free scene), és a forrás-jelenetek azonosítóit a `source_scene_ids` mezőbe írja
- `package.json`: új dep `sharp ^0.33.5` (Vercel-natívan támogatott)

### Notes
- Hungary ~8 Sentinel-2 MGRS tile-ból áll össze (33TXM, 33TYM/N, 34TCS/T, 34TDS/T, stb.). A pipeline ezeket automatikusan deduplikálja a STAC eredményekből, és tile-onként a legkevésbé felhős, legfrissebb jelenetet választja.
- A felhasználói toggle bar + a viewer komponens változatlan.

## 2026-05-20 — v0.7.2 Magyarország-szintű NDVI mozaik (Sentinel Hub) + toggle UI

### Added — backend
- **`lib/sentinel-hub.ts`**: Sentinel Hub Process API kliens. OAuth 2 client-credentials token-cache, NDVI evalscript v3 (Scene Classification Layer alapú felhő/árnyék/hó kiszűréssel, 6 színkód sűrű növényzettől víz/beépített-ig), `processNdviMosaic({ bbox, width, height, timeRange, maxCloudCover })`, és Earth Search STAC `findLatestSentinel2Scene` helper a felvétel-dátum kinyeréséhez.
- **`supabase/migrations/20260520_ndvi_hungary_renders.sql`**: `ndvi_hungary_renders` tábla (run_id, status, source_satellite, acquisition_from/to/latest, cloud_cover_pct, bbox, **resolutions jsonb** — 4 felbontás URL+méret), `ndvi_hungary_latest` view a legutolsó sikeres render-re, RLS-szel publikus read csak `status='success'`-re. **`ndvi-maps` Supabase Storage bucket** (public read, 500 MB file limit, PNG/WebP/JPEG MIME engedélyezve).
- **`app/api/superadmin/jobs/run/route.ts`** új `ndvi_hungary_render` job: pre-flight ellenőrzi a `SENTINEL_HUB_CLIENT_ID/SECRET` env-eket (503-mal és pontos hibaüzenettel áll meg ha hiányoznak), létrehoz egy `running` rekordot, lekérdezi az Earth Search STAC-ből a legutolsó cloud-free Sentinel-2 jelenetet a Magyarország bbox-ra (16.0, 45.7, 22.9, 48.6) az utolsó 30 napra, majd **4 felbontásban** (1024×430 Nagy → 2048×860 → 4096×1720 → 8192×3440 Nagyon nagyon nagyon nagyon nagy) PNG-be rendereli az NDVI-t a Process API-val. Minden képet feltölt a `ndvi-maps` bucket-be `<run_id>/<resolution>.png` útvonalra, és a rekordot `success`/`partial`/`failure` státuszra állítja a feltöltött felbontások számától függően. `maxDuration = 300` (Pro plan). PU-fogyasztás logolva (`x-processingunits-spent` header).
- **`app/api/environment/ndvi-hungary/route.ts`**: publikus GET végpont. A legutolsó `status='success'` render-t adja vissza JSON-ban (runId, acquisitionLatest dátum, renderelési dátum, bbox, 4 felbontás URL+méret+bytes). 5 perces s-maxage cache.

### Added — frontend
- **`components/ndvi-hungary-viewer.tsx`**: új komponens. Metaadat-banner (forrás műhold, felvétel dátuma, renderelés dátuma, run_id), felbontás-választó tab (Nagy/Nagyon nagy/Nagyon nagyon nagy/Nagyon nagyon nagyon nagyon nagy), interaktív kép-viewport egér-görgős zoom-mal (1×–20×, 1.15× lépés), drag-mozgatással zoom>1 esetén, "Visszaállít" + "Új lapon ↗" gombok (az "Új lapon" linket a böngésző natív zoom-mal teszi végtelen-nagyíthatóvá), NDVI színkód-legenda 6 sávval. Felvétel-dátum overlay a kép bal-alsó sarkán.
- **`components/satellite-ndvi-panel.tsx`**: új **toggle bar** a panel tetején (`🏠 Épület közeli NDVI` ↔ `🇭🇺 Magyarország NDVI`). Magyarország mód lazy-load-olja a `/api/environment/ndvi-hungary` adatot, és átadja a `NdviHungaryViewer`-nek. Hibaüzenet ha a render még nincs (megmondja a usernek, hogy a superadminnak el kell indítania a `ndvi_hungary_render` job-ot).
- **`components/superadmin-client.tsx`** JOBS listához: `ndvi_hungary_render` (label "NDVI Magyarország render", description tartalmazza a szükséges env vars-okat).

### Required env vars (Vercel project settings)
- `SENTINEL_HUB_CLIENT_ID` — Sentinel Hub OAuth client ID
- `SENTINEL_HUB_CLIENT_SECRET` — Sentinel Hub OAuth client secret

**Beállítás:** ingyenes regisztráció a https://www.sentinel-hub.com oldalon → Dashboard → User Settings → OAuth clients → "Create new OAuth client" → mentsd a client_id-t és secret-et a Vercel env-be. Free tier 30 000 processing units / hónap, 4-felbontásos render kb. 150 PU, tehát havonta 200 render is belefér.

## 2026-05-20 — v0.6.8 Superadmin külső-API diagnosztika (curl-runner) + 404 fix

### Fixed
- **`app/api/environment/_diagnostics/route.ts` → `app/api/environment/diagnostics/route.ts`** (rename): Next.js App Router az `_` prefixű mappákat kizárja a routingból ("private folders" konvenció), ezért a v0.6.7-ben hozzáadott diagnosztikai endpoint 404-et adott. Aláhúzás eltávolítva, az endpoint mostantól ténylegesen elérhető a `https://panellako.hu/api/environment/diagnostics` URL-en.

### Added
- **`app/api/superadmin/diagnostics/curl/route.ts`**: új superadmin-only POST végpont, amely tetszőleges HTTP-kérést futtat a Vercel serverless környezetből és visszaadja a teljes választ (status, headers, body, latency). SSRF-védelem: `dns.lookup`-pal feloldja a hostnamet, és visszautasít minden RFC1918 / loopback / link-local / cloud metadata / IPv6 ULA / multicast / forbidden suffix (`.internal`, `.local`, `.vercel.run`) címet. Response body 512 KB-ra cap-elve, a UI 32 KB-ra trunkálva mutatja. Method-whitelist (GET/POST/PUT/PATCH/DELETE/HEAD), `Cookie` és `Host` header sanitization.
- **`components/superadmin-diagnostics.tsx`**: új UI komponens a superadmin felületen:
  - **9 preset gomb**: 4 Overpass mirror (kumi.systems, overpass-api.de, openstreetmap.fr, lz4), Open-Meteo current + air-quality, internal `/api/environment/diagnostics` self-check, PVGIS, titiler.xyz NDVI
  - **Overpass health check batch gomb**: szekvenciálisan futtat mind a 4 Overpass mirror-t és tabuláris megjelenítésben mutatja a status/latency/bytes/note értékeket — egy kattintással látható, melyik tükör érhető el Vercelből
  - **Szabad request űrlap**: method dropdown, URL input, headers JSON szerkesztő, body textarea, timeout (500-25000 ms)
  - **Response panel**: status badge, latency, bytes, content-type, response headers kihajtható lista, body (32 KB-ig), error block hiba esetén, "truncated" jelző ha túlfutott
- Mountolva a `superadmin-client.tsx`-ben a `<SuperadminGtfsImport />` után, így a `/superadmin` oldal alján elérhető.

## 2026-05-20 — v0.6.7 Bugfix: Overpass routes match working /api/cycling pattern

### Fixed
- **`app/api/environment/urban/route.ts`** és **`app/api/environment/green/route.ts`** továbbra is 503-mal hasaltak el az élesben (v0.6.6 mirror-failover nem segített, mert a beállítások nem fértek bele a Vercel 10s default függvény-budget-be):
  - **Mirror sorrend megfordítva**: `overpass.kumi.systems` került ELSŐ helyre (az `/api/cycling` route, ami működik production-ben, pontosan ezt a sorrendet használja). Az `overpass-api.de`, ami gyakran túlterhelt, csak másodlagos.
  - **Per-mirror timeout 12 s → 9 s**: alá megy a Vercel 10 s Hobby-limitnek, így ténylegesen időben befejeződik a próbálkozás.
  - **Overpass server-side `timeout:25` → `timeout:8`**: a szerver maga is gyorsabban válaszol vagy abandonol, beleférünk a függvény-budget-be.
  - **`User-Agent: 'panellako/1.0 (info@panellako.hu)'`** header hozzáadva (az `/api/cycling` is ezt használja — Overpass etikett).
  - **`out center qt` / `out geom qt`** a sima `out center` / `out body; >; out skel qt;` helyett — a `qt` quick-tidy sorrend jóval gyorsabb output-ot ad.
  - **`export const maxDuration = 30`**: Vercel Pro plan-en kibővíti a függvény-budget-et 30 másodpercre (Hobby-n no-op).
  - **`overpass.openstreetmap.fr`** mint negyedik tükör (Bordeaux egyetemi mirror, gyakran kevésbé terhelt).

### Added
- **`app/api/environment/_diagnostics/route.ts`** új diagnosztikai endpoint. Production-ben `curl https://panellako.hu/api/environment/_diagnostics` válaszában látható minden Overpass tükör és Open-Meteo HTTP-státusza, latency-je, byte-mennyisége, és ha 200, akkor element count is. Ezzel mérhető, hogy mely források elérhetők a Vercel környezetből.

### Notes
- A változtatás az `/api/cycling/route.ts`-ben évek óta működő mintát replikálja az urban + green route-okra. Ha az `/api/cycling` működik production-ben (a "Kerékpáros útvonalak" panel 1749 dedikált utat mutat), akkor a két javított route ugyanígy fog. Ha a `_diagnostics` deploy után mind a 4 mirror-t 0 ok-státusszal mutatja, akkor a Vercel projekt valószínűleg hálózati allowlist-en van (ritka), és a következő lépés egy Supabase Edge Function proxy lesz, mert az más egress-csomópontról fut.

## 2026-05-20 — v0.6.6 Bugfix: Overpass mirror failover + stale-cache + PWA meta tag

### Fixed
- **`app/api/environment/urban/route.ts`**: a route 503-mal hasalt el a Vercel cloud env által blokkolt `overpass-api.de` miatt → `OVERPASS_MIRRORS` listával (overpass-api.de + kumi.systems + lz4.overpass-api.de + maps.mail.ru) failover-szerűen próbál minden tükröt 12 s timeouttal. Ha mind elbukik **és** van bármilyen meglévő `building_compact_city_cache` + `building_liveability_cache` sor (TTL nélkül), a stale-cache kerül vissza `source: 'stale-cache'`-sel. Csak ha végképp nincs adat, akkor 503.
- **`app/api/environment/green/route.ts`**: ugyanaz a mintázat — `overpassFetch` segéd a `fetchFromOverpass`-en belül 4 tükröt próbál, és bukás esetén stale `building_green_cache`-t ad vissza `source: 'stale-cache'`-sel a `null` válasz előtt.
- **`app/layout.tsx`**: `<meta name="apple-mobile-web-app-capable">` deprecation böngésző-warning kiküszöbölve a `metadata.other['mobile-web-app-capable'] = 'yes'` modern, cross-platform tag hozzáadásával. iOS Safari továbbra is megkapja az Apple-prefixű tag-et (`appleWebApp.capable = true`), így nincs regresszió.

### Type widening
- `CompactCityData.source`, `LiveabilityData.source`, `GreenData.source` mostantól `'cache' | 'overpass' | 'stale-cache' | 'unavailable'` (az `'unavailable'` jövőbeli használatra előretartva).

## 2026-05-19 — v0.7.0 Cycling data sources backend specification pack

### Added
- **`cycling-data-sources/`**: új specifikációs csomag 25 magyar és nemzetközi kerékpáros adatforrásra (OSM, Magyar Közút KENYI, kormany.hu, BKK Biciklivel/bringás térkép, GraphHopper, Komoot, Bikemap, Naviki, Bike Citizens, Térképem.hu, OpenCycleMap, Cycling Waymarked Trails, OsmAnd, Organic Maps, Kerékpárosklub, Merretekerjek, Bringalap, Bringamánia, Természetjáró, Balatonbringa Club, Velencei-tó, Flowcycle, Bicikliparkoló kereső). Forrásonként 36 000–53 000 karakteres MD, összesen ~1 077 000 karakter.
- Mindegyik fájl 20 fejezete: forrás-áttekintés, jogi/licenc, adatkinyerési felület (URL/curl), hitelesítés/rate-limit, forrás- és cél-adatmodell (PostGIS DDL), 8-rétegű architektúra (L1 ingestion → L8 observability) Mermaid diagrammal, futtatható Python downloader (80–250 sor), feldolgozó pipeline (GPX/KML/PBF/PDF/HTML parserek), frissítési stratégia, storage/skálázás, monitoring/riasztások, költségbecslés (HUF/EUR), biztonság, pytest+VCR tesztek, Docker+k8s CronJob+GitHub Actions, REST API + vector tile serving, runbook, roadmap, referenciák.
- **`versioning/190526_22_v0.7.0_cycling-data-sources-spec-pack.md`**: engineering record.
- **`marketing/marketing_values/20260519_v0.7.0_cycling-data-sources-spec_marketing_value.md`**: marketing record.

### Notes
- A pack specifikáció, nem implementáció — futó ETL pipeline még nincs élesben, MVP forrás (OSM/Overpass + Geofabrik HU) a következő lépés v0.7.2-ben.
- A scraping-orientált források (Kerékpárosklub, Merretekerjek, Bringalap, Bringamánia, Természetjáró, Balatonbringa, Flowcycle) MD-i kötelezően dokumentálják a partnerség-előbb politikát, `*_SCRAPE_ENABLED` env-flag kapcsolóval. Magyar Közút / kormany.hu fájlok tartalmazzák az Infotv. 28. § adatigénylés sablont.

## 2026-05-19 — v0.6.4 Bugfix: transit null name + departures ID normalizálás + kornyezet crash

### Fixed
- **`app/api/superadmin/jobs/run/route.ts`** `gtfs_derive_refs` job: upsert előtt pre-fetch-eli a meglévő `transit_stops.stop_id`-kat, és csak azokat frissíti — ezzel kiküszöböli a `null value in column "name" violates not-null constraint` hibát, amit az orphaned `transit_stop_routes` sorok okoztak (ha a `stop_id` nem létezik a `transit_stops`-ban, az upsert INSERT-et próbált `name` nélkül).
- **`app/api/transit/departures/route.ts`**: GTFS stops.txt-ből importált megállók `F00048` formátumú ID-val rendelkeznek (BKK_ prefix nélkül), de a Futár OBA API `BKK_F00048` formátumot vár. Az API route most automatikusan normalizálja (`F\d` → `BKK_F\d`) ahelyett, hogy mock-kal térne vissza — megszünteti az „API nem elérhető" badge-et ezeken a megállókon.
- **`app/api/environment/weather/route.ts`**: Mock fallback hozzáadva — ha az Open-Meteo API blokkolva van (cloud env network policy), a route valid `current` objektumot ad vissza `{ error: "..." }` helyett; megakadályozza a `TypeError: Cannot read properties of undefined (reading 'uvIndex')` kliens-oldali crash-t.
- **`components/environment-page-client.tsx`**: `weather?.current` guard a `setWeather` hívásnál; `doUrban` helyesen detektálja az error JSON-t (503 + `{ error: '...' }`) és `errorUrban=true`-t állít, retry UI-t jelenít meg CompactCityPanel null data helyett.

## 2026-05-19 — v0.6.3 Műholdas NDVI + Kompakt Város + Élhetőség

### Added
- **`app/api/environment/satellite/route.ts`**: Sentinel-2 L2A NDVI lekérdezés ESA Earth Search STAC (Element84) + titiler.xyz COG point extraction; 7-napos Supabase cache (`building_satellite_cache`); NDVI osztályozás 5 szintben (kopár → sűrű növényzet).
- **`app/api/environment/urban/route.ts`**: Egységes OSM Overpass query (15+ amenity-kategória 1,5 km sugarú körben); BKK transit stops DB lekérdezés; Walk Score-inspirált gyalogolhatóság (exponenciális decay formula); EIU/Mercer-alapú 6-dimenziós élhetőség; párhuzamos Supabase upsert `building_compact_city_cache` + `building_liveability_cache` táblákba (30-napos TTL).
- **`components/satellite-ndvi-panel.tsx`**: NDVI szám + sávos gauge; felvétel metaadata (műhold, dátum, felhőborítottság); szezonális SVG referencia-grafikon Budapest tipikus NDVI-értékeivel + aktuális mérőpont kiemelve; WHO/tudományos kontextus kártyák.
- **`components/compact-city-panel.tsx`**: 15-perces város összetett index SVG kördiagrammal; gyalogolhatóság + transit + vegyes hasznosítás sávok; kulcstávolságok (ABC, gyógyszertár, iskola); amenity-kategória rács; elméleti háttér kártya.
- **`components/liveability-panel.tsx`**: Pure SVG 6-dimenziós radar-diagram (Budapest átlag benchmark); összesített élhetőség-ring; dimenzió-kártyák (Zöld&Levegő, Egészségügy, Oktatás, Kultúra, Szolgáltatások, Biztonság); EIU/Mercer módszertani magyarázat.
- **`supabase/migrations/`**: 3 új tábla: `building_satellite_cache`, `building_compact_city_cache`, `building_liveability_cache`.
- **Superadmin**: `satellite_refresh` + `urban_refresh` jobokk; 3 új tábla az environment stats csoportban.

### Changed
- **`components/environment-page-client.tsx`**: 6 szekciós → 9 szekciós oldal; 3 új IntersectionObserver lazy-load ref (satellite, urban); new import-ok; NAV bővítése; sec-compact és sec-liveable ugyanazt a `/api/environment/urban` hívást osztja meg.

## 2026-05-19 — v0.6.2 KörnyezetScore™ — Teljes környezetoldal újraépítés

### Added
- **`app/api/environment/air-quality/route.ts`**: Open-Meteo Air Quality API integráció (PM2.5, PM10, NO2, O3, SO2, CO, UV, pollen) 30-perces in-memory cache-sel; US EPA PM2.5→AQI konverzió; 7 napos előrejelzés.
- **`app/api/environment/weather/route.ts`**: Open-Meteo Weather API integráció; szélirány/erősség/Beaufort-cimkék; WHO UV kategóriák; 60-perces cache.
- **`app/api/environment/solar/route.ts`**: PVGIS EU JRC REST API integráció (kWh/kWp/év, havi bontás); 30-napos Supabase cache (`building_solar_cache`); CO₂-megtakarítás HU 2024 ráccsal.
- **`app/api/environment/green/route.ts`**: OSM Overpass API integráció (parkok, fák, játszóterek, zajforrások 200-500m sugarú körben); Shoelace terület- és zajscore-számítás; 7-napos Supabase cache (`building_green_cache`).
- **`app/api/environment/score/route.ts`**: KörnyezetScore™ kompozit pontszám (levegő 35% + zöld 25% + pollen 15% + UV 10% + zaj 15%); `building_env_score` Supabase upsert.
- **`components/env-score-hero.tsx`**: Animált SVG kör-gauge a kompozit pontszámhoz; 5 alpontsáv ikonokkal; Budapest átlag benchmark; töltési skeleton.
- **`components/sparkline-24h.tsx`**: Pure SVG 24h sparkline PM2.5 (kék) + UV (borostyán szaggatott); egér-tooltip idő/érték megjelenítéssel.
- **`components/pollen-panel.tsx`**: Pollenpanel (nyír/fű/parlagfű) szintjelzőkkel, 7-napos forecast ráccsal, aktív szezon-detectálással.
- **`components/uv-wind-panel.tsx`**: UV félkör-gauge + szélirány-iránytű; WHO UV-javaslatok; szél–levegőminőség összefüggés-chip.
- **`supabase/migrations/20260520_building_green_cache.sql`**: `building_green_cache` tábla.
- **`supabase/migrations/20260520_building_solar_cache.sql`**: `building_solar_cache` tábla.
- **`supabase/migrations/20260520_building_env_score.sql`**: `building_env_score` tábla.
- **`app/api/superadmin/jobs/run/route.ts`**: `env_refresh_green` job — minden épületre Overpass-frissítés 2 s közbenső késleltetéssel, 7-napos cache-kihagyással.
- **`components/superadmin-client.tsx`**: `Zöld cache frissítés` job hozzáadva; `environment: 'Környezeti adatok'` csoport a stats táblában.

### Changed
- **`components/environment-page-client.tsx`**: Teljes újraírás — 2-tabos layoutból 6 görgethető szekció (KörnyezetScore, Levegő, Pollen/UV, Zöld, Napenergia, Kerékpár); IntersectionObserver lazy-load a nehéz szekciókhoz; AQICN→Open-Meteo csere; SolarCalculator kWp-csúszka; 10-perces auto-refresh.
- **`app/api/superadmin/stats/route.ts`**: 3 új environment-csoport tábla hozzáadva.

## 2026-05-19 — Transit sync auth + BKK key fail-fast fix

### Fixed
- `app/api/transit/sync/route.ts`: a cron auth most már kompatibilis a Vercel Cron fejléccel (`x-vercel-cron: 1`), így a scheduled sync endpoint nem utasítja el alapból a platform-triggerelt hívásokat.
- `app/api/transit/sync/route.ts`: bekerült opcionális `?secret=` támogatás manuális trigger rendszerekhez és diagnosztikához.
- `app/api/transit/sync/route.ts`: `BKKFUTAR_API_KEY` hiány esetén a sync explicit 500 hibával leáll (`Missing BKKFUTAR_API_KEY`) ahelyett, hogy implicit tesztkulccsal/hibás kulccsal csendben futna.
- `app/api/transit/sync/route.ts`: részletesebb 401 válasz (`hint`) a gyorsabb üzemeltetési hibakereséshez.

# Changelog

## 2026-05-18 — v0.6.0 Premium UI/UX Refactor — Design system, Inter font, elevated components

### Changed
- **`app/layout.tsx`**: Integrated `next/font/google` Inter with `latin-ext` subset; applied CSS variable `--font-inter` and `font-sans` class to `<body>` for consistent typography everywhere.
- **`tailwind.config.ts`**: Extended design system — `fontFamily.sans` wired to Inter CSS variable; custom shadow scale (`card`, `card-md`, `card-lg`); `border-radius` tokens `4xl/5xl`; `transitionTimingFunction.spring`; `fade-in-up`, `fade-in`, `scale-in` keyframe animations.
- **`app/globals.css`**: Full redesign — CSS custom properties for surfaces, borders, shadows, radii; `font-feature-settings` for Inter optical improvements; `:focus-visible` ring using brand-500; `.glass`, `.card-lift`, `.input-base`, `.btn-primary`, `.btn-secondary` utility classes; refined sidebar and widget scrollbars; `scroll-margin-top` on all `[id]` elements.
- **`app/app/page.tsx` (Building Picker)**:
  - Header: sticky with `backdrop-blur-xl`, user avatar initials, cleaner sign-out button with red hover state.
  - Cards: `animate-fade-in-up` staggered reveal, `card-lift` hover effect, ping dot on open tickets, gradient building icon badge, address line with `MapPin` icon, cleaner role badge with `ring-1`.
  - Empty state: icon in rounded container, better copy layout.
- **`app/login/page.tsx`**: `animate-scale-in` entry; `backdrop-blur-xl`; `input-base` on fields; `btn-primary` on submit; error/success status distinguished by color (red vs emerald).
- **`components/dashboard-client.tsx`**:
  - **Background**: gradient uses Tailwind theme tokens instead of raw hex.
  - **Sidebar**: 272px width; nav items use `space-y-px` and `duration-150` transitions; building context block with refined opacity; role panel gets icon container.
  - **Header**: `shadow-card-md` + `backdrop-blur-xl`; smaller, cleaner search input; `btn-secondary` contact button.
  - **Hero section**: building name promoted into hero when `buildingName` is set; CTA buttons get `hover:-translate-y-px` microinteraction.
  - **SectionCard**: `border-slate-200/70 bg-white shadow-card-md`; icon gets `h-8 w-8 rounded-xl` container with `ring-1`.
  - **MetricCard**: `uppercase tracking-wide` label; icon in `h-11 w-11 rounded-2xl bg-white/15 ring-1 ring-white/20`; gradient uses `via` stops; `hover:-translate-y-0.5` lift.
  - **StatusBadge / PriorityBadge**: Hungarian labels, `ring-1 ring-inset` style, `text-[11px]`.
  - **Task cards**: `card-lift rounded-2xl bg-slate-50/80`; better typography.
  - **All form inputs**: unified to `input-base` utility class.
  - **All primary buttons**: unified to `btn-primary` / `btn-secondary` utility classes.

## 2026-05-17 — v0.5.6 UI/UX Layout Refactor — Overflow fixes, responsive grids, feed health

### Changed
- **`app/globals.css`**: Added `overflow-x: hidden` and `max-width: 100%` to `html` and `body` — global backstop against horizontal scroll.
- **`app/layout.tsx`**: Added `overflow-x-hidden` Tailwind class to `<body>`.
- **`components/dashboard-client.tsx`**:
  - Overview right panel: `hidden md:flex` → `hidden lg:flex` — prevents narrow-tablet overflow.
  - Metric cards grid: `sm:grid-cols-2 xl:grid-cols-4` → `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` — adds intermediate breakpoint step.
  - Header search input: `w-56` → `w-full md:w-56` — full-width on mobile.
  - Building name `<h1>`: added `break-words` — long addresses no longer overflow.
- **`components/transport-panel.tsx`**: Tab row `flex gap-1` → `flex flex-wrap gap-1` — tabs wrap gracefully on narrow panels.
- **`components/energy-dashboard.tsx`**: `MeterCard` wrapper gains `overflow-hidden` — donut gauge SVG stays contained.
- **`components/air-quality-widget.tsx`**: AQIcon container gains `overflow-hidden` — animated SVG particles stay clipped inside panel bounds.

## 2026-05-16 — v0.5.5 Keresés, kattintható badge-ek, kapcsolati űrlap

### Added
- **`app/actions/contact.ts`**: Új server action — kapcsolati üzenet fogadása és továbbítása email-ben. Tárgy dropdown (Ajánlatkérés / Érdeklődés / Hibabejelentés / Visszajelzés / Partnerség / Egyéb), max 2000 karakter szöveg. Recipient `CONTACT_RECIPIENT_EMAIL` env var-ból olvasva — a recipient email cím SEHOL nem jelenik meg a frontenden.
- **Header keresőmező** — mostantól valóban keres: real-time dropdown az összes indexált tartalomban (navigáció, ticketek, dokumentumok, hírek, albetétek, közgyűlések, tudásbázis, partnerek). Max 8 találat, típus-badge és meta, kattintásra a kapcsolódó szekcióhoz ugrik. Click-outside és ESC bezár.
- **Kapcsolat gomb** a fejlécben (Mail ikon + „Kapcsolat" felirat) — megnyitja a kapcsolati modalt. Sikerüzenet, loading state, hibaüzenet.

### Changed
- **`components/dashboard-client.tsx`**: `MetricCard` — `href` prop, kattintható link minden badge: Nyitott ügyek→`#tickets`, Hátralék→`#finances`, Olvasatlan értesítés→`#notifications`, Albetétek→`#units`. Hover animáció (`scale-[1.02]`). Értesítési napló SectionCard kapott `id="notifications"` anchorhoz.

### Deployment note
Vercel Environment Variables-ben add hozzá: `CONTACT_RECIPIENT_EMAIL=henrikfaul.hf@gmail.com`

## 2026-05-16 — v0.5.4 Communication Intelligence v2 — Structured Announcements & Reminder Engine

### Added
- **`supabase/migrations/20260516_communication_v2.sql`**: Schema migration — `announcements` tábla kiegészítve (`scope`, `priority`, `deadline`, `requires_acknowledgement`). Új táblák: `announcement_units` (per-unit targeting junction), `announcement_reads` (olvasási visszaigazolás per-felhasználó), `reminder_rules` (konfiguálható emlékeztető motor), `reminder_sends` (idempotens kiküldési napló). RLS policy-k és indexek.
- **`app/actions/announcements.ts`**: Teljes újraírás — strukturált célzás (`AnnouncementScope`: all/owners/residents/specific_units), prioritás (`AnnouncementPriority`), határidő, olvasási visszaigazolás. `getRecipientProfileIds()` scope-alapú szűrés memberships alapján. `createAnnouncement()`: `announcement_units` junction + `reminder_rules` automatikus létrehozása. `acknowledgeAnnouncement()`: upsert az `announcement_reads` táblába. `getAnnouncementReads()`: manager-nézet. `checkManagerRole()`: megosztott helper.
- **`app/actions/reminders.ts`**: Új server action fájl — `createReminderRule()`, `toggleReminderRule()`, `getPendingReminderRecipients()` (szűri a már teljesítőket announcement_reads/document_acknowledgements/votes alapján), `executeReminderRule()` (idempotens app értesítés + reminder_sends naplózás upsert-tel).
- **`components/announcement-composer.tsx`**: Többlépéses értesítés-összeállító komponens — 3 mód (Általános hír, Célzott üzenet, Határidős értesítő), scope selector (Mindenki/Tulajdonosok/Lakók), albetét multi-select célzott módban, téma-chip sáv (6 előre definiált + egyéb szabad szöveg), tartalom textarea, emlékeztető konfiguráció (7/3/1, 3/1, 1 napos preset), speciális beállítások (prioritás, e-mail küldés, olvasási visszaigazolás), küldés előtti összefoglaló sáv.

### Changed
- **`lib/types.ts`**: `NewsItem` kiegészítve — `scope`, `priority`, `deadline`, `requires_acknowledgement`, `read_at` (felhasználónkénti), `read_count` (manager nézet).
- **`lib/data.ts`**: `getDashboardData()` — per-user `announcement_reads` lekérése, `read_at` merge-elése a hírekbe. Hirdetések limit 10-re növelve.
- **`components/dashboard-client.tsx`**: Hírfolyam kártya — prioritás-alapú kiemelés (urgent=piros, high=sárga), olvasatlan jelző, határidő megjelenítése, „Elolvasva ✓" gomb kötelező visszaigazolásnál, manager-nézeten olvasói darabszám. Értesítés-küldő kártya: a régi 3 mezős formot felváltja az `AnnouncementComposer` komponens.

### Deployment note
Supabase SQL Editorban futtatni: `supabase/migrations/20260516_communication_v2.sql`

## 2026-05-16 — v0.5.3 Dokumentumtár kezelés — Document Management for Managers

### Added
- **`app/actions/documents.ts`** — `deleteDocument(id, buildingId?)`: törli a dokumentumot az adatbázisból és a Storage bucket-ből. `updateDocument(id, updates, buildingId?)`: szerkeszti a metaadatokat (cím, kategória, verzió, láthatóság). Mindkét action manager-szerepkör ellenőrzéssel (kozos_kepviselo / megbizott).
- **`app/api/init-demo-docs/route.ts`**: GET/POST endpoint — beolvassa a `public/demo-docs/` mappából a 4 demo PDF-et, feltölti a Supabase Storage `documents` bucket-be (`demo/` prefix), és frissíti az adatbázisban a legacy URL-eket a helyes storage path-ra.
- **`public/demo-docs/`**: 4 generált demo PDF a tárolt dokumentumokhoz: `szmsz_v3.1.pdf`, `elszamolas_2025.pdf`, `kozgyules_meghivo_20260610.pdf`, `tuzvedelmi_szabalyzat_v2.pdf`. ReportLab-bal generálva, A4-es formátum, táblázatos tartalom, Panellako brandingegel.
- **`scripts/generate_demo_docs.py`**: Python script a demo PDF-ek újragenerálásához.
- **`supabase/migrations/20260516_fix_demo_document_urls.sql`**: UPDATE migration — legacy `storage.panellako.hu` URL-eket cseréli helyes storage path-ra meglévő adatbázisban.

### Changed
- **`components/dashboard-client.tsx`**: Dokumentumtár kártya — manager-csak szerkesztés (inline edit form cím/kategória/verzió/láthatóság mezőkkel), törlés megerősítő gombbal, ceruza ikon kártyánként. Demo-dokumentumok init banner (amber, csak manager + legacy URL esetén): egy gombbal feltölti a fájlokat és frissíti a DB-t.
- **`supabase/seed.sql`**: Demo dokumentumok `file_url` frissítve legacy URL-ről → helyes storage path (`demo/*.pdf`).

### Deployment note
1. Supabase SQL Editorban: `supabase/migrations/20260516_fix_demo_document_urls.sql` futtatni (meglévő adatok migrálása)
2. Az alkalmazásban Közösképviselő/Megbízott szerepkörrel bejelentkezve, Dokumentumtár szekcióban kattints a **„Demo fájlok feltöltése"** gombra (sárga banner) — feltölti a PDF-eket a Supabase Storage-ba és frissíti a DB rekordokat

## 2026-05-16 — v0.5.2 Közgyűlési Segéd — Assembly Protocol Generator (Initiative #9)

### Added
- **`supabase/functions/generate-assembly-protocol/index.ts`**: Deno Edge Function — Közgyűlési Jegyzőkönyv PDF generálás. Lekérdezi a meeting, épület, agenda_items, resolutions, meeting_attendances, és units adatokat. Kiszámítja a kvórumot (jelenlevő tulajdoni hányad / összes tulajdoni hányad). A4 PDF-et generál (`pdf-lib@1.17.1` via esm.sh) 6 szakasszal: Épület adatai, Közgyűlés adatai, Határozatképesség, Jelenlévők listája, Napirendi pontok + határozatok, Aláírások. Magyar karakterek ASCII transliterálása (Helvetica font korlátai). Feltölti a `documents` Supabase Storage bucket-be (`assembly-protocols/{building_id}/{meeting_id}.pdf`). Frissíti a `meetings.protocol_url` és `meetings.protocol_generated_at` mezőket. Naplóz az `audit_logs` táblába.
- **`components/meeting-detail-panel.tsx`**: Slide-over panel komponens — kvórum progress bar, jelenlét rögzítés/törlés unit-onként (kattintásra), napirendi pontok + határozatok szavazási UI, manager akciók (meghívó küldés 8 napos Ptk. 5:84 ellenőrzéssel, közgyűlés lezárása, PDF generálás, letöltés).
- **`app/actions/meetings.ts`** — új server actionök: `addResolution`, `updateResolutionOutcome`, `removeAttendance`, `getMeetingWithDetails`, `generateProtocolManually`. `closeMeeting` kiegészítve: tüzeli az edge function-t fire-and-forget módon.
- **`supabase/migrations/20260516_assembly_protocol_policies.sql`**: Hiányzó INSERT/UPDATE/DELETE RLS policy-k: meetings, agenda_items, resolutions, votes, meeting_attendances.
- **`app/api/storage-signed-url/route.ts`**: GET endpoint — Supabase Storage signed URL generálás (`?path=...&bucket=...`), 10 perces lejárat. PDF letöltéshez.

### Changed
- **`components/dashboard-client.tsx`**: Meeting kártya — clickable title + "Részletek / Jelenlét" gomb → megnyitja a `MeetingDetailPanel`-t. `closeMeetingAction` helyes `data.buildingId` átadással (volt: `meeting.id` bugfix). `MeetingDetailPanel` megjelenítése + loading state.

### Deployment note
1. Edge Function deploy: `supabase functions deploy generate-assembly-protocol`
2. Supabase SQL Editorban: `supabase/migrations/20260516_assembly_protocol_policies.sql` futtatni
3. Storage bucket: `documents` bucket-nek public/private beállítása megléte szükséges

## 2026-05-16 — v0.5.1 SSR Auth hardening + Landing page (Initiative #2) + RLS fix (Initiative #1)

### Changed
- **`app/page.tsx`**: Landing page — server-side auth check (`getUser()`), authenticated user → `redirect('/app')`, unauthenticated → teal CTA landing page. Eltávolítva a `?role=` URL param alapú szerepkör-meghatározás (security hole: bármely látogató hozzáférhetett az admin nézethez).

### Added
- **`supabase/migrations/20260516_fix_rls_missing_policies.sql`**: Hiányzó INSERT/UPDATE RLS policy-k: `vendors`, `push_subscriptions` (UPDATE), `knowledge_base_articles`, `audit_logs`. A korábban hiányzó policy-k a schema.sql-ben már szerepelnek, ez a migration az adatbázisba való alkalmazást biztosítja.

### Fixed
- Build error: 3 ESLint unused var + `/offline` page `'use client'` hiány → 0 hiba
- `SUPABASE_SERVICE_ROLE_KEY` env var konfliktus: GeoData kulcs → `GEODATA_SUPABASE_SERVICE_ROLE_KEY`

## 2026-05-16 — v0.5.0 SaaS Billing — Stripe integráció (Initiative #4)

### Added
- **`supabase/migrations/20260516_billing.sql`**: `subscriptions` tábla (building_id, stripe_customer_id, stripe_subscription_id, plan, status, unit_count, trial_end, current_period_end, cancel_at_period_end) RLS-sel (csak manager-jogkörű tagok olvashatnak). `invoice_events` tábla (audit log stripe eseményekhez, uq_invoice_event unique constraint). `set_updated_at()` trigger.
- **`app/api/stripe/checkout/route.ts`**: POST endpoint — autentikáció, manager-jogkör ellenőrzés, unit count lekérdezés, Stripe Customer létrehozás/keresés, Checkout Session (subscription mode, quantity=unit_count, 14 napos trial, hu locale, automatic_tax). Már aktív subscription esetén Billing Portal redirect.
- **`app/api/stripe/webhook/route.ts`**: POST endpoint Stripe webhook eseményekhez — HMAC signature verification, `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.paid`. Stripe API v22 kompatibilis (period dates → items.data[0], invoice subscription → parent.subscription_details).
- **`app/api/stripe/portal/route.ts`**: POST endpoint Stripe Customer Portal session létrehozáshoz (lemondás, számlák, kártyacsere).
- **`app/billing/page.tsx`**: Server Component — subscription és épület adatok betöltése, auth check.
- **`app/billing/billing-client.tsx`**: Client Component — árazási kártyák (Alap €1.50/unit/hó, Pro €3.00/unit/hó), próbaidőszak állapot, "Számlázás kezelése" Stripe Portal link, fizetési hibák megjelenítése, sikeres checkout banner.
- **`middleware.ts`**: Subscription paywall hozzáadva `/w/[buildingId]` útvonalakra — service role klienssel lekérdezi a subscription státuszt, expired trial vagy cancelled esetén → redirect `/billing?building=...&reason=subscription_required`. Stripe nélkül (SUPABASE_SERVICE_ROLE_KEY hiányában) átugorja az ellenőrzést.
- **`stripe` és `@stripe/stripe-js`** csomagok telepítve (stripe v22.1.1, API version 2026-04-22.dahlia).

### Architecture note
Per-unit árazás: `unitCount × pricePerUnit (eurocent)` → Stripe `quantity` a checkout session line_item-en. Webhook idempotens: `upsert onConflict building_id` a subscriptions táblán, `upsert onConflict stripe_invoice_id,event_type` az invoice_events táblán.

### Deployment note
1. Stripe Dashboard → Products → létrehozni az Alap (€1.50) és Pro (€3.00) per-unit monthly árat
2. `.env.local` (+ Vercel): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_ALAP_MONTHLY`, `STRIPE_PRICE_ID_PRO_MONTHLY`, `NEXT_PUBLIC_APP_URL`
3. Webhook regisztráció Stripe Dashboard-on: events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.paid`
4. Supabase SQL Editorban: `supabase/migrations/20260516_billing.sql` futtatni

## 2026-05-16 — v0.4.0 Multi-épület dashboard + Building Picker (Initiative #5)

### Added
- **`app/app/page.tsx`**: Building Picker Server Component — az összes épület kártyás nézetben, nyitott ticket számmal, szerepkör badge-dzsel, valós idejű adatokkal a `get_my_buildings` RPC-n keresztül. Bejelentkezési redirect `/login?next=...` nem hitelesített látogatóknak.
- **`app/w/[buildingId]/page.tsx`**: Épület-szintű dashboard route — UUID validáció (404 ha nem UUID), membership check (`validate_building_membership` RPC), jogosulatlan hozzáférés esetén redirect `/app`-ra. `getDashboardData` meghívása `buildingId` paraméterrel.
- **`app/auth/signout/route.ts`**: POST sign-out handler — `supabase.auth.signOut()`, majd redirect `/login`-ra.
- **`supabase/migrations/20260516_get_my_buildings_rpc.sql`**: `get_my_buildings()` Postgres RPC — épület aggregátumok (albetét szám, nyitott ticket szám) per felhasználó, `SECURITY DEFINER`, `authenticated` jogkör.
- **`supabase/migrations/20260516_validate_building_membership_rpc.sql`**: `validate_building_membership(_building_id)` RPC — member check, szerepkör és unit_id visszaadása.
- **`lib/data.ts`**: `getDashboardData(role, buildingId?)` — `buildingId` paraméter hozzáadva, minden Supabase lekérdezés `.eq('building_id', buildingId)`-vel szűrve (announcements, notifications, tickets, meter_readings, documents, meetings, units, vendors, knowledge_base_articles). Finance entries JOIN via units.
- **`middleware.ts`**: Auth guard hozzáadva — `/w/*` és `/app` útvonalak bejelentkezést igényelnek, unauthenticated → `redirect('/login?next=...')`. Autentikált user login oldalon → `redirect('/app')`.
- **`components/dashboard-client.tsx`**: `DashboardData` kiegészítve `buildingId`, `buildingName`, `buildingAddress` opcionális mezőkkel. Sidebar building context panel (épület neve, cím, "Épület váltása" link). Mobile header: tappable building breadcrumb link `/app`-ra (lg breakpoint felett rejtve, sidebar kezeli).
- **Server Actions** (`tickets.ts`, `meter-readings.ts`, `announcements.ts`, `documents.ts`): `revalidatePath` frissítve `/w/${buildingId}` mintára ahol elérhető. `updateTicketStatus` és `updateTicketAiOverride` opcionális `buildingId` paramétert kap.

### Architecture note
A `memberships` tábla már multi-tenancy ready volt. Ez az initiative csak az alkalmazás réteget adaptálta: routing, data scoping, middleware protection. Az RLS policy-k jelen PR-ban változatlanok (production hardening külön security task).

## 2026-05-16 — v0.3.6 Mobile PWA + Push értesítések (Initiative #6)

### Added
- **`next.config.mjs`**: `next-pwa` konfiguráció — service worker regisztrálva, offline fallback `/offline` oldalra, production-only (dev módban kikapcsolva).
- **`public/manifest.json`**: PWA Web App Manifest — installable app, `standalone` display, teal theme color, HU lang.
- **`app/layout.tsx`**: `<link rel="manifest">`, `theme-color`, apple-web-app-capable, `Viewport` export.
- **`app/offline/page.tsx`**: Offline fallback oldal.
- **`supabase/schema.sql`**: `push_subscriptions` tábla (endpoint, p256dh, auth, profile_id) RLS-sel.
- **`app/api/push/subscribe/route.ts`**: POST (upsert subscription) + DELETE (unsubscribe) API végpont.
- **`supabase/functions/send-push/index.ts`**: Supabase Edge Function — Web Push küldés VAPID JWT-vel, building-szintű broadcast, lejárt subscription automatikus törlése.
- **`components/dashboard-client.tsx`**: Push értesítés bekapcsolás/kikapcsolás UI a profil szekcióban (PushManager API detection, Notification.requestPermission, subscribe/unsubscribe flow).

### Deployment note
VAPID kulcsok generálása: `npx web-push generate-vapid-keys`. `NEXT_PUBLIC_VAPID_PUBLIC_KEY` és `VAPID_PRIVATE_KEY` beállítása `.env.local`-ban és Vercel-en. Supabase Edge Function secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:support@panellako.hu`.

## 2026-05-15 — v0.3.5 Közgyűlési protokoll generator (Initiative #9)

### Added
- **`app/actions/meetings.ts`**: Teljes közgyűlési Server Action réteg — `createMeeting` (napirendi pontokkal együtt, audit log bejegyzéssel), `sendAssemblyInvitation` (Ptk. 5:84 8 napos előírás ellenőrzéssel), `recordAttendance` (tulajdoni hányad alapú jelenléti nyilvántartás, upsert), `recordVote` (szavazat rögzítés súlyozással), `closeMeeting` (kvórum automatikus kiszámítása attendance adatokból).
- **`supabase/schema.sql`**: `meetings` tábla bővítve — `status_detail`, `quorum_threshold`, `actual_quorum`, `protocol_url`, `invitation_sent_at`, `location`, `chairperson_name`, `secretary_name`. Új `meeting_attendances` tábla (RLS-sel). `documents.document_type` oszlop. Meeting és agenda_item INSERT/UPDATE policy-k.
- **`lib/types.ts`**: `MeetingItem` interface bővítve kvórum, meghívó, protokoll mezőkkel.
- **`components/dashboard-client.tsx`**: Közgyűlés létrehozási form (manager), meghívó küldés gomb (Ptk. 5:84 ellenőrzéssel), kvórum megjelenítés, közgyűlés lezárás gomb.
- **`@react-pdf/renderer`** csomag telepítve (PDF protokoll generáláshoz).

## 2026-05-15 — v0.3.4 Pénzügyi főkönyv + hátralék automatizáció (Initiative #8)

### Added
- **`app/actions/finance.ts`**: Teljes pénzügyi Server Action réteg — `createCharge` (tömeges egyenletes terhelés az épület összes albetétjének), `recordPayment` (befizetés rögzítés payment típusú bejegyzésként), `getArrearsReport` (hátralék riport per épület), `getUnitFinanceHistory` (albetét-szintű pénzügyi előzmény). Duplikáció-ellenőrzés, összeg/dátum/periódus validáció.
- **`supabase/schema.sql`**: `finance_entries` tábla bővítve: `payment_date`, `payment_reference`, `created_by`, `description`, `entry_type` (charge/payment/adjustment/opening_balance). `unit_balance_view`, `building_arrears_view` nézetek. `sync_unit_balance` trigger (automatikusan frissíti `units.balance_amount`). 4 teljesítmény index.
- **`lib/types.ts`**: `FinanceItem` interface bővítve; új `FinanceEntryType` union type.
- **`components/dashboard-client.tsx`**: Terhelés rögzítési form (manager/könyvelő), befizetés rögzítési modal, fizetési bejegyzések zöld kiemelése, hátralék kiemelése rose színnel.

## 2026-05-15 — v0.3.3 E-mail értesítési rendszer via Resend (Initiative #10)

### Added
- **`lib/email.ts`**: Központi e-mail küldő modul Resend SDK-val. `sendEmail` (single), `sendBulkEmail` (batch, rate-limit-aware chunking), `renderEmailTemplate`, `generateUnsubscribeUrl`. Graceful fallback (console log) ha `RESEND_API_KEY` nincs beállítva.
- **`lib/email-templates/announcement.tsx`**: React Email komponens hirdetményekhez — PanelLakó branded HTML email, kategória badge, CTA gomb, leiratkozás link.
- **`lib/email-templates/ticket-update.tsx`**: React Email komponens ticket státuszfrissítési értesítőhöz — régi→új státusz megjelenítés.
- **`app/api/email/unsubscribe/route.ts`**: GET endpoint egykulcsos leiratkozáshoz — `unsubscribe_token` UUID alapján frissíti a `profiles.notifications_email = false` értékét.
- **`app/actions/announcements.ts`**: `createAnnouncement` mostantól fire-and-forget módon e-mailt küld az épület összes opt-in lakójának hirdetmény létrehozásakor.
- **`supabase/schema.sql`**: `profiles` tábla bővítve: `notifications_email`, `notifications_statutory_email`, `unsubscribe_token` oszlopok.
- **`lib/types.ts`**: `UserProfile` interface bővítve e-mail preference mezőkkel.
- `@react-email/components`, `@react-email/render` csomagok telepítve.

### Pre-condition
`RESEND_API_KEY=re_xxx` beállítása `.env.local`-ban és Vercel-en. A `panellako.hu` domain verifikálása a Resend dashboardon.

## 2026-05-15 — v0.3.2 AI hibabejelentés triázs — claude-haiku-4-5 (Initiative #7)

### Added
- **`supabase/functions/triage-ticket/index.ts`**: Supabase Edge Function — hungarian-language fault ticket triage. Anthropic `claude-haiku-4-5-20251001` modelel kategorizál (8 típus), 1–10 sürgősségi pontot, vendor javaslatot és egymonatos összefoglalót ad vissza JSON-ban. 15 mp timeout, JSON parser fallback, graceful fail ha `ANTHROPIC_API_KEY` nincs beállítva.
- **`app/actions/tickets.ts`**: `createTicket` mostantól fire-and-forget módon meghívja a triage Edge Functiont. Új `updateTicketAiOverride` Server Action manager AI-felülbíráláshoz.
- **`lib/types.ts`**: `Ticket` interface bővítve AI mezőkkel: `ai_category`, `ai_urgency`, `ai_vendor_suggestion`, `ai_summary_hu`, `ai_triage_at`, `ai_override`. Új `AiCategory` union type.
- **`supabase/schema.sql`**: 6 AI oszlop a `tickets` táblán, 2 index (pending triage, urgency sorrendhez).
- **`components/dashboard-client.tsx`**: `AiUrgencyBadge`, `AiCategoryChip`, `AiTriagePendingSkeleton` komponensek. Ticket kártyák mostantól AI sürgősséget, kategóriát, vendor javaslatot, AI összefoglalót mutatnak. Kritikus ticket (urgency ≥ 8) rose kerettel emelkedik ki. Manager "AI módosítás" modal — kategória + sürgősség felülbírálása.
- **`tsconfig.json`**: `supabase/functions/` kizárva a Next.js TypeScript ellenőrzésből (Deno runtime).

### Deployment note
Az Edge Function csak a Supabase dashboardon beállított `ANTHROPIC_API_KEY` secret esetén triázsol — hiánya esetén a ticket `ai_triage_at = null` állapotban marad (pending skeleton jelenik meg). Deploy: `supabase functions deploy triage-ticket --no-verify-jwt`.

## 2026-05-15 — v0.3.1 Dokumentum feltöltés Supabase Storage (Initiative #3)

### Added
- **`app/actions/documents.ts`**: `uploadDocument(formData)` Server Action — MIME validáció (PDF/JPG/PNG/DOC/XLS), 10 MB méretlimit, Supabase Storage feltöltés `documents` bucketbe, storage path tárolás `file_url`-ben, rollback DB hiba esetén.
- **`app/actions/documents.ts`**: `getDocumentSignedUrl(filePath)` Server Action — 1 órás lejáratú signed URL generálás; legacy http(s) URL-ek változatlanul kerülnek vissza.
- **`components/dashboard-client.tsx`**: Dokumentum feltöltési form (manager-only) — cím, kategória, verzió, láthatóság, fájl input; feltöltés állapot visszajelzés (feltöltés folyamatban / feltöltve / hiba).
- **`components/dashboard-client.tsx`**: "Megnyitás" gomb — signed URL alapú dokumentummegnyitás új lapon.

### Fixed
- **`supabase/schema.sql`**: `votes` tábla egyedi constraint hozzáadva (`resolution_id, voter_profile_id`) — az `submitVote` upsert `onConflict` clauseja enélkül futásidőben hibával tér vissza.

## 2026-05-15 — v0.3.0 Növekedési sprint #1 — Teljes Supabase írási réteg (Initiative #1)

### Added
- **`app/actions/votes.ts`**: `submitVote(resolutionId, voteValue)` Server Action — `votes` táblába ír, upsert a dupla szavazás ellen.
- **`app/actions/work-orders.ts`**: `createWorkOrder(...)` + `updateWorkOrderStatus(workOrderId, status)` Server Actions.
- **`app/actions/finance.ts`**: `createFinanceEntry(...)` + `recordPayment(financeEntryId, paidAmount)` Server Actions.

### Fixed
- **`supabase/schema.sql`**: Hiányzó RLS INSERT policy-k hozzáadva: `documents`, `document_acknowledgements`, `finance_entries`, `votes`, `work_orders`. Korábban ezek a táblák silent RLS-blokkolással nem fogadtak írást.
- **`supabase/schema.sql`**: Hiányzó RLS UPDATE policy-k hozzáadva: `tickets`, `notifications`, `document_acknowledgements`, `work_orders`, `resolutions`. Az `updateTicketStatus` és `markNotificationRead` akciók így ténylegesen írnak.
- **`lib/data.ts`**: `getDashboardData` per-user document acknowledgement join implementálva — a `document_acknowledgements` tábla `viewed_at` értéke mostantól bekerül az `acknowledged_at` mezőbe minden dokumentumnál a bejelentkezett felhasználóra szűrve. Korábban az "Elolvasva" gomb sosem tűnt el kattintás után.
- **`lib/data.ts`**: Profil lekérdezés hozzáadva — `currentUser` mostantól valós adatbázis profilt tölt be.
- **`components/dashboard-client.tsx`**: Work order státusz frissítése dropdown-ból (manager szerepkörre). `updateWorkOrderStatus` bekötve.
- **`components/dashboard-client.tsx`**: `updateWorkOrderStatus`, `submitVote` Server Action importok hozzáadva.

## 2026-05-15 — v0.2.1 Server Action sémaillesztési javítások + optimista rollback

### Fixed
- **`app/actions/documents.ts`**: `document_acknowledgements` upsert `acknowledged_at` → `viewed_at` (séma oszlopnév helyreállítva; a korábbi verzió silently misfired).
- **`app/actions/meter-readings.ts`**: `submitted_at` mező eltávolítva — ez az oszlop nem létezik a `meter_readings` sémában (`created_at` default now() kezeli).
- **`app/actions/documents.ts`**: `uploaded_by` mező eltávolítva a `createDocument` insertből — nem létező sémaoszlop.
- **`components/dashboard-client.tsx`**: Optimista rollback implementálva:
  - Ticket létrehozásnál: ha a Server Action sikertelensége esetén az optimista ticket visszavonásra kerül (`filter` a temp id alapján), a form reset csak sikeresnél fut le.
  - Ticket státusz frissítésnél: ha a `updateTicketStatusAction` sikertelenül tér vissza, a korábbi `tickets` állapot visszaáll.

---

## 2026-05-15 — v0.2.0 SSR Auth + Server Actions + Analízis sprint

### Added
- **SSR Auth hardening** (`middleware.ts`, `lib/supabase/server.ts`, `lib/supabase/browser.ts`): cookie-alapú munkamenet, `getUser()` az összes auth kritikus ponton — `getSession()` eltávolítva az egész kódbázisból.
- **@supabase/ssr** csomag: Next.js App Router kompatibilis SSR Supabase kliens.
- **Server Actions réteg** (`app/actions/`): `tickets.ts`, `meter-readings.ts`, `announcements.ts`, `notifications.ts`, `documents.ts` — az összes mutáció valós Supabase írást hajt végre `revalidatePath('/')` frissítéssel.
- **Optimista UI frissítések** ticket létrehozásnál és státusz változtatásnál — gyors UX, szerver szinkron a háttérben.
- **Dokumentum visszaigazolás gomb** (`acknowledgeDocument` Server Action bekötve) — `document_acknowledgements` táblába ír.
- **Resend** e-mail csomag telepítve (kész az e-mail értesítési sprint folytatásához).
- **Valuation + Growth Strategy PDF-ek** (`growth_strategy/output/`, `valuation/output/`): 4 PDF, EN+HU, teljes PanelLakó-specifikus tartalommal.
- **Growth Strategy elemzés**: 10 rangsorolt kezdeményezés, valódi ROI tartományokkal és implementációs promptokkal.
- **docs/** rendszer generálva a doc creation toolkit alapján.

### Changed
- `lib/data.ts`: szerver-oldali `createClient()` hívás (`@supabase/ssr`) a kliens-oldali `supabase` singleton helyett.
- `components/dashboard-client.tsx`: auth ellenőrzés `getUser()`-re váltva, mutációk Server Action hívásokra bekötve, kijelentkezés gomb `createClient()` alapú.
- Mérőóra és értesítés form: `name` attribútumok hozzáadva, Server Action bekötve.

### Infrastructure
- Baseline valuation: **€180k–€420k** (pre-revenue MVP+)
- Target valuation post-10 initiatives: **€2.1M–€5.8M**

## 2026-04-27
### Added
- Elkészült a PanelLakó MVP Next.js + Tailwind alapú webalkalmazás fő dashboard felülete.
- Supabase adatkapcsolat (env alapon) mock fallback logikával.
- MVP modulok megjelenítése: hírfolyam, hibabejelentések, dokumentumtár, pénzügyi áttekintés, közgyűlések.
- Supabase `schema.sql` fájl a minimálisan szükséges táblákkal.
- README telepítési, Vercel deploy és Supabase setup útmutató.

## 2026-04-27 (MVP+ bővítés)
### Added
- Belépési oldal (`/login`) Supabase magic link előkészítéssel.
- Szerepkör-kiterjesztés: megbízott role és role-switch demo nézet.
- Új modulok a dashboardon: hibabejelentés űrlap, óraállás-bejelentés űrlap, képviselői célzott értesítés űrlap.
- Értesítési napló és mérőóra adatok megjelenítése.
- Új PanelLakó logó komponens.
- Kibővített Supabase adatmodell: profiles, buildings, units, memberships, notifications, meter_readings és kapcsolódó RLS policy-k.

### Changed
- Dashboard adatlekérés kiterjesztve notifications és meter_readings táblákra.
- README frissítve az új funkciókhoz és backend-séma tartalomhoz.

## 2026-04-27 (Feature refresh + AWS Location fix)
### Added
- Új server-side AWS Location proxy route: `app/api/location/autocomplete/route.ts`.
- OnlineHáz-szerű albetét táblázat kereséssel, terület/tulajdoni hányad/egyenleg/vízóra adatokkal.
- Bővített dashboard: teendők, gyors műveletek, ticket queue, dokumentum olvasottság, pénzügyi progress, mérőóra lista, közgyűlés/szavazás előkészítés, vendor/work order workflow, tudásbázis és audit napló.
- Új mock adatok a vendorokhoz, work orderekhez, tudásbázishoz, audit loghoz és albetétekhez.
- Supabase séma bővítése: document acknowledgements, agenda items, resolutions, votes, vendors, work_orders, knowledge_base_articles, audit_logs és új albetét mezők.

### Changed
- A címkereső többé nem client-side `process.env.NEXT_PUBLIC_AWS_LOCATION_API_KEY` változóból olvas, hanem a Next.js API route-on keresztül server-side env-et használ.
- Supabase auth kliens `persistSession`, `autoRefreshToken` és `detectSessionInUrl` beállítást kapott a magic link flow stabilizálására.
- Login oldal modernebb UX-et és explicit redirect cél visszajelzést kapott.
- Dashboard vizuális szerkezete modern sidebar + card layout irányba frissült regresszió nélkül: a korábbi profil, ticket, meter, hírek, dokumentum, pénzügy és közgyűlés funkciók megmaradtak.

## 2026-05-19 — Superadmin Control Plane (manual jobs + integration status)

### Added
- Új superadmin belépési flow: `app/superadmin/login/page.tsx`, `app/api/superadmin/login/route.ts`, `app/api/superadmin/logout/route.ts`.
- Új session helper: `lib/superadmin-auth.ts` (HTTP-only cookie alapú superadmin session).
- Új superadmin dashboard: `app/superadmin/page.tsx` + `components/superadmin-client.tsx`.
- Új manuális job trigger API: `app/api/superadmin/jobs/run/route.ts`.
- Manuálisan indítható jobok: `bkk_full_sync`, `bkk_stops_routes`, `bkk_building_stops`, `bkk_alerts`, `air_quality_refresh` (AQI + heatmap párhuzamosan).

### Security / Ops
- A superadmin credential alapértelmezett env fallbackgel fut (`SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`), de production-ben env override erősen ajánlott.

## 2026-05-19 — Transit ops hardening (rate-limit + env fallback + truthful job status)

### Fixed
- `app/api/transit/sync/route.ts`: Supabase service client most már fallbackgel olvassa az env neveket (`NEXT_PUBLIC_SUPABASE_URL|SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY|NEXT_SUPABASE_SERVICE_ROLE_KEY`) az "Invalid API key" hibák csökkentésére.
- `app/api/transit/sync/route.ts`: BKK `LIMIT_EXCEEDED` válasz detektálás + cellánként retry/backoff, és 429 státusz visszaadása rate-limit esetén.
- `app/api/superadmin/jobs/run/route.ts`: `bkk_full_sync` párhuzamos futása helyett szekvenciális futás (stops-routes → building-stops → alerts), így kisebb API burst és helyesebb függőségi sorrend.
- `app/api/superadmin/jobs/run/route.ts`: top-level `ok` mező most valós állapotot tükröz; részleges/sikertelen esetben HTTP 207 a kezelhető operátori diagnosztikához.

