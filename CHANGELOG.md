
## v0.9.14 — SEO Sprint 4: Mérés, befejezés és E-E-A-T
**Dátum:** 2026-05-23
**Branch:** claude/fix-cron-null-values-uDCqd

### Cluster cikkek befejezése — Tarsashazi Jog
- `kozgyulesi-hatarozat-megtamadasa` — 30 napos jogvesztő határidő (Ttv. 42. §), piros alert box
- `szomszed-jog-tarsashazban` — Ptk. 5:23. §, zajhatárok, albérlet, kisállat, dohányzás
- `alapito-okirat-modositasa` — egyhangúság (100%), Inytv. 29/A. § 90 nap

### Cluster cikkek befejezése — Klímakockázat
- `hoszigetek-budapest` — UHI, OMSZ mérés, 5-8°C különbség, zöldtető/reflektív festés
- `csapadek-es-arviz-budapest` — villámárvíz, pincebeázás, MABISZ biztosítás
- `energetikai-tanusitvany` — EPC A++-G osztályok, EU EPBD 2024/1275/EU

### Cluster cikkek befejezése — Társasházkezelés
- `felugyelobizottsag` — Ttv. 53-56. §, ellenőrzési jogkör, digitális hozzáférés
- `kozos-kepviselo-valasztasa` — Ttv. 27/33. §§, 90 napos felmondás, átadás-átvétel

### Hub oldalak frissítése (belső linkek)
- Minden pillar hub frissítve: valós cluster cikk linkek, "coming soon" eltávolítva
- `/elemzes` hub: levegőminőség/klíma/zaj linkek frissítve valós oldalakra
- `public-footer.tsx`: tarsashazi-jog, zöld-tarsashaz, adatforrasok hozzáadva

### Technikai frissítések
- `app/sitemap.ts`: 60+ URL (teljes tartalomtérkép)
- `app/page.tsx`: "Szakértői tudástár" szekció (4 content pillar kártya)

### Sprint 4 sikerkritériumok
- [ ] 50+ oldal indexálva GSC Coverage-ben
- [ ] 5+ BOFU keyword top 100-ban
- [ ] Homepage organikus session vs. baseline mérhető
- [ ] Trial signup konverzió tracking by landing page (PostHog)

## v0.9.13 — SEO Sprint 3: Topikai autoritás — tartalom pillérek
**Dátum:** 2026-05-23
**Branch:** claude/fix-cron-null-values-uDCqd

### Tartalom-pillérek (hub oldalak)
- `app/tarsashaz-kezeles/page.tsx` — Társasházkezelés pillar hub
- `app/levegominoseg-budapest/page.tsx` — Levegőminőség Budapest hub (kibővítve)
- `app/zajszennyezes-budapest/page.tsx` — Zajszennyezés Budapest hub
- `app/klimakockazat-epuleteknel/page.tsx` — Klímakockázat épületeknél hub
- `app/zold-tarsashaz/page.tsx` — Zöld Társasház hub
- `app/tarsashazi-jog/page.tsx` — Magyar Társasházi Jog hub
- `app/tomegkozlekedes-elemzes/page.tsx` — Tömegközlekedés Elemzés hub

### Cluster cikkek — Társasházkezelés pillar
- `kozos-kepviselo-feladatai` — 2003. évi CXXXIII. tv., adminisztratív/pénzügyi/jogi feladatok
- `kozgyules-osszehivasa` — 2021. évi CXLIII. tv., 8 lépéses checklist, minősített többség
- `szmsz-keszitese` — 10 kötelező elem, 5 tipikus hiba, 2/3 vs 4/5 szavazatarány
- `kozos-koltseg-nyilvantartas` — tételek, éves elszámolás, Ptk. késedelmi kamat
- `dijhatlarak-kezelese` — FMH, végrehajtás, jelzálogjog bejegyzés
- `dokumentumkezeles-tarsashazban` — megőrzési idők táblázata, lakói betekintési jog
- `felugyelobizottsag` — Ttv. 53-56. §, ellenőrzési jogkör
- `kozos-kepviselo-valasztasa` — megbízási szerződés, 90 napos felmondás, átadás-átvétel

### Cluster cikkek — Levegőminőség pillar
- `pm25-pm10-mit-jelent` — WHO vs EU határértékek, egészségügyi hatások
- `budapest-legszennyezettebb-keruletek` — OLM mérőállomások, kerületi összehasonlítás
- `belteri-levegominoseg-tarsashazban` — VOC, HEPA, CO-érzékelő, páratartalom
- `pollen-allergia-budapest` — pollenszezon táblázat, parlagfű, 340/2013. Korm. rendelet

### Cluster cikkek — Zajszennyezés pillar
- `tarsashazi-zaj-panasz` — 45/35 dB(A) határok, 5 lépéses jogorvoslat
- `zajvedes-tarsashazban` — Rw/Lw értékek, ablakcsere, panelprogram

### Cluster cikkek — Zöld Társasház pillar
- `napelem-tarsashazban` — METÁR 2023, önfogyasztás, 2/3-os közgyűlés
- `hoszigeteles-panelprogram` — EPBD 2024, EPC osztályok, felújítási kötelezettség 2033
- `ev-tolto-tarsashazban` — 2021. évi CXLIII. tv. 8/A. §, load balancing

### Cluster cikkek — Klímakockázat pillar
- `hoszigetek-budapest` — UHI, OMSZ mérés, zöldtető, reflektív festés
- `csapadek-es-arviz-budapest` — villámárvíz, pincebeázás, MABISZ
- `energetikai-tanusitvany` — EPC osztályok, EU EPBD 2024/1275/EU, 30-40% értékkülönbség

### Cluster cikkek — Társasházi Jog pillar
- `kozgyulesi-hatarozat-megtamadasa` — 30 napos jogvesztő határidő (Ttv. 42. §)
- `szomszed-jog-tarsashazban` — Ptk. 5:23. §, zajhatárok, albérlet, kisállat, dohányzás
- `alapito-okirat-modositasa` — egyhangú szavazatarány, közjegyző, Inytv. 29/A. §

### Egyéb új oldalak
- `app/tomegkozlekedes-elemzes/gtfs-adatok-budapest/page.tsx` — BKK GTFS fájlstruktúra
- `app/tomegkozlekedes-elemzes/villamos-metro-hev-elerheto-lakoneegyedek/page.tsx`
- `app/15-perces-varos/page.tsx` — Budapest 2030 stratégia
- `app/adatforrasok/page.tsx` — E-E-A-T Dataset JSON-LD, 6 adatkategória

### Technikai módosítások
- `app/sitemap.ts`: 50+ URL (minden tartalom-pillér + cluster cikk)
- `public/manifest.json`: theme_color + leíró description
- `app/page.tsx`: /elemzes link szekció (ACT-019)

### Sprint 3 sikerkritériumok
- [ ] 5+ tartalom-pillér oldal indexálva GSC-ben
- [ ] /levegominoseg-budapest első benyomások megjelennek
- [ ] BreadcrumbList Rich Results Test átmegy
- [ ] 3+ külső visszamutató hivatkozás elnyerve

## v0.9.12 — SEO Sprint 2: Konverziós felületek és navigáció
**Dátum:** 2026-05-23
**Branch:** claude/fix-cron-null-values-uDCqd

### Új oldalak
- `app/funkciok/page.tsx` — Funkciók hub (SoftwareApplication JSON-LD schema)
- `app/funkciok/hibabejelentes-kezeles/page.tsx` — Hibabejelentés feature oldal
- `app/funkciok/dokumentumtar/page.tsx` — Dokumentumtár feature oldal
- `app/funkciok/kozos-koltseg/page.tsx` — Közös költség feature oldal
- `app/funkciok/online-kozgyules/page.tsx` — Online közgyűlés feature oldal
- `app/arak/page.tsx` — Árak oldal (3 csomag, Offer JSON-LD)
- `app/gyik/page.tsx` — GYIK oldal (FAQPage JSON-LD, 15 kérdés)
- `app/rolunk/page.tsx` — Rólunk oldal (Organization JSON-LD, E-E-A-T)
- `app/kapcsolat/page.tsx` — Kapcsolat oldal (ContactPage JSON-LD)
- `app/adatvedelmi-iranyelvek/page.tsx` — GDPR Adatvédelmi irányelvek
- `app/aszf/page.tsx` — ÁSZF (12 fejezet, jogi megfelelés)
- `app/osszehasonlitas/page.tsx` — PanelLakó vs Excel+WhatsApp összehasonlítás
- `app/elemzes/page.tsx` — Elemzések hub (4 analysis card)

### Módosított fájlok
- `components/public-nav.tsx` (ÚJ) — Sticky publikus navigáció (5 menüpont + CTA)
- `components/public-footer.tsx` (ÚJ) — 4 hasábos footer jogi + hub linkekkel
- `app/page.tsx` — Teljes homepage újraírás (600+ szó, FAQPage schema, /elemzes link)
- `app/sitemap.ts` — 30+ URL a teljes tartalmibázishoz
- `public/manifest.json` — Leíró description + theme_color=#0f766e

### SEO hatás
- Megvalósított ACT-010 (homepage rewrite), ACT-011/012 (feature pages), ACT-013 (árak), ACT-014 (GYIK), ACT-015 (jogi oldalak), ACT-016 (rólunk), ACT-017 (nav), ACT-018 (footer), ACT-019 (elemzések link), ACT-038 (kapcsolat)
- 10+ új indexálható oldal FAQPage, SoftwareApplication, Organization, ContactPage sémákkal
- GDPR jogi megfelelés: adatvédelmi irányelvek és ÁSZF élő

## Sprint 2 sikerkritériumok
- [ ] Homepage top 50 brand query-re
- [ ] 10+ új oldal indexálva GSC-ben
- [ ] FAQPage Rich Results Test átmegy
- [ ] SoftwareApplication schema valid
- [ ] Jogi oldalak élők és footerből linkelt

## 2026-05-22 — v0.9.11 SEO Sprint 1: Technical Foundation

### Added — SEO technical foundation (ACT-001 … ACT-006)
- **`app/robots.ts`** — robots.txt: allow `/`, block `/api/`, `/superadmin`, `/w/`, `/app/`, `/offline`, `/billing`, `/login`; sitemap directive to `https://panellako.hu/sitemap.xml`
- **`app/sitemap.ts`** — XML sitemap: homepage (priority 1.0) + /elemzes/budapest-kozlekedes (priority 0.8)
- **`app/layout.tsx`** — `metadataBase: new URL(BASE_URL)` unblocks OG/canonical URL resolution; title template `%s — PanelLakó`; full `openGraph` + `twitter` blocks; Organization + SoftwareApplication JSON-LD schema injected into `<head>`
- **`app/page.tsx`** — SEO-clean title/description; `sr-only` static content block (hibabejelentés, dokumentumtár, közös költség, közgyűlés) for Googlebot; explicit `canonical: '/'`
- **`app/elemzes/budapest-kozlekedes/page.tsx`** — SSR static content block above Leaflet map (Googlebot now reads 300+ words); Article JSON-LD schema; full OG metadata; canonical URL
- **noindex on utility routes**: `app/superadmin/page.tsx`, `app/billing/page.tsx`, `app/app/page.tsx` via `Metadata.robots`; `app/login/layout.tsx`, `app/offline/layout.tsx`, `app/superadmin/login/layout.tsx` via layout wrappers (required for `'use client'` pages)
- Removed banned phrase "Digitális működési központ" from all metadata

## 2026-05-22 — v0.9.10 Fix: 15-min city map, public services, transit badges, noise map HungaroMet

### Fixed
- **15-minute city "Térkép" tab** (`services-page-client.tsx`): URL param `livePois=1` → `withPois=1`; live Overpass POI fetch now actually bypasses cache and the map tab loads correctly
- **Közszolgáltatások data**: Overpass query radius 2.5 km → 3 km; added healthcare OSM tags (`healthcare`, `social_facility`, optician, physiotherapist, blood_bank, health_post, nursing_home, veterinary); limits raised to 40 healthcare / 20 schools / 20 kindergartens / 10 townhalls; `force=1` cache bypass param
- **Public services map view** (`public-services-map-inner.tsx`, new component): Leaflet map with all 4 categories simultaneously, active category at full opacity, dimmed others; auto-fits bounds to active category; List/Map toggle in UI; Frissítés now passes `force=1`
- **Transit vehicle badge rendering** (`transit-live-map-inner.tsx`): 4+ char route refs now use wider pill SVG instead of cramped circle; correct `iconSize`/`iconAnchor` for pill shapes
- **Transit route info map** (`vehicles/route.ts`): also stores normalised (leading-zero-stripped) key so GTFS-RT lookups succeed for routes like `BKK_0047`→`47`
- **Zajtérkép** (`noise-map-inner.tsx`): HungaroMet (`zajterkep.met.hu`) added as primary WMS source; NIF `zajterkepek.hu` as fallback; source toggle UI; Ipari L_den 4th layer; source-aware deep-link and WMS-unavailable switch

## 2026-05-22 — v0.9.9 Build fix: signalNav orphan cleanup (3rd pass)

### Fixed — dashboard-client.tsx dead code after signalNav removal
Eltávolított import ikonok (kizárólag signalNav envSection-ben voltak):
- `Flame` — Hősziget kockázat nav elem ikonja
- `Leaf` — Zöld Akciók nav elem ikonja
- `Recycle` — Hulladék & Víz nav elem ikonja
- `TrendingUp` — Budapest 2030 nav elem ikonja
- `Volume2` — Zajriporter nav elem ikonja

Eltávolított count-változók (kizárólag signalNav badge-ekben használtak):
- `criticalTickets` — kritikus + nyitott ticketek száma
- `unacknowledgedDocs` — nem aláírt dokumentumok száma
- `upcomingMeetings` — tervezett közgyűlések száma

### Note: levegőminőség-állomás jelölők
A levegőminőség-monitor állomás SVG jelölők (`stationMarkerSvg`, `sensorDotSvg`) és az
`air-quality-map-inner.tsx` / `air-quality-map.tsx` komponensek **változatlanok** — a PR
egyetlen sorát sem érintette. Az állomás jelölők eltűnése azért látható a produkción, mert az
ismételt build hibák megakadályozták az új kód deployolását; a produkció egy korábbi verzión
futott. Ez a build fix lehetővé teszi az állomásjelölőket is tartalmazó új kód deployolását.

## 2026-05-22 — v0.9.8 Oldalsáv főoldalon + Zajtérkép WMS + Szöveg tisztítás

### Added
- **`components/noise-map-inner.tsx`** — Teljesen újraírva: NIF zajterkepek.hu WMS réteg (közút L_den / L_night, vasút L_den), rétegváltó vezérlő, dB-szintű jelmagyarázat (55–75+ dB), zajterkepek.hu mélylinkje az épület koordinátáival. Alap OSM tile 60% opacity-val, WMS réteg 80%-on felül.
- **`components/workspace-sidebar.tsx`** — Szót `WorkspaceSidebar` immár a főoldalon (`/w/[buildingId]`) is megjelenik a `DashboardClient`-ben mint önálló beillesztett komponens, collapsible (272px ↔ 60px), `useState(sidebarCollapsed)` + `paddingLeft` animáció.

### Changed
- **`components/dashboard-client.tsx`** — Belső `<aside>` tömb eltávolítva, helyette `<WorkspaceSidebar>` komponens injektálva. Külső `grid-cols-[272px_1fr]` → `flex min-h-screen`, `<main>` dinamikus `paddingLeft`-tel. Hős szövegek (épületnév, cím, keresőmező) erős szövegárnyékkal ellátva a kontrasztos olvashatósághoz minden napszakban.
- **`components/noise-dashboard-client.tsx`** — Zajtérkép magassága 288px → 420px.

### Removed — VÉGLEGES, VISSZAVONHATATLAN
- **„Operációs központ"** szöveg eltávolítva: `workspace-sidebar.tsx` és `dashboard-client.tsx` — **SOHA NE KERÜLJÖN VISSZA!** (lásd codingLessonsLearnt #LESSON-UI-BRAND-001)
- **„Digitális műveleti központ"** szöveg eltávolítva: `dashboard-client.tsx` — **SOHA NE KERÜLJÖN VISSZA!** (lásd codingLessonsLearnt #LESSON-UI-BRAND-001)

### Fixed
- `environment-page-client.tsx` — `RefreshCw` nem használt import, `loadingPois` nem olvasott state eltávolítva → Vercel build hiba javítva.
- `components/workspace-sidebar.tsx`, `dashboard-client.tsx` — `'Hőszigat kockázat'` (nagybetűs változat) → `'Hősziget kockázat'` javítva.

## 2026-05-22 — v0.9.7 Animált hős járművek + Workspace oldalsáv + Supabase MCP konfig

### Added
- **`components/HeroVehicle.tsx`** — Teljes újraírás: 6 részletes SVG jármű (CAF Urbos 5-szekciós villamos, Solaris-Trollino 18 trolibusz, Mercedes-Benz Citaro busz, 3 forgó kerekű bringás, A380 felszállás + leszállás) véletlenszerűen váltakoznak 16–32 másodpercenként. Inline CSS keyframe animációk (`vh-ground`, `vh-a380-to`, `vh-a380-ld`, `cyspin`, `aprop`, `astrobe`), TypeScript-szigorú típusok (`VehicleKey`, `VehicleConfig`), `onAnimationEnd`-alapú sorrend.
- **`app/w/[buildingId]/(subpages)/layout.tsx`** — Route-group layout: auth + tagság-ellenőrzés, `WorkspaceShell` injektálás minden `/w/:id/*` aloldalon.
- **`components/workspace-shell.tsx`** — Kliens shell: összeomlás-állapot kezelése, `paddingLeft` animáció.
- **`components/workspace-sidebar.tsx`** — Rögzített oldalsáv, kibontható/összecsukható (272px ↔ 60px). Aktív útvonaljelölés `usePathname()`-szel, épületkártya, szerepkör-pill, számlázás hivatkozás (csak menedzsereknek).
- **`.mcp.json`** — Supabase MCP HTTP konfiguráció env-változókkal (`${SUPABASE_PROJECT_REF}`, `${SUPABASE_ACCESS_TOKEN}`) — nincs többé kézi token beírás.

### Changed
- 7 környezeti aloldal (`kornyezet`, `zaj`, `hulladek`, `klimakockazat`, `budapest-2030`, `green-score`, `zold-akciok`) áthelyezve a `(subpages)/` route-csoportba — URL-ek nem változtak.

## 2026-05-22 — v0.9.6 Területfelhasználás Térkép a Környezet Oldalon

### Added
- **`components/land-use-map-inner.tsx`** — 'use client' Leaflet komponens. Overpass API POST (1000m sugár, 20s timeout) lekérdezi a landuse/leisure/natural OSM poligonokat. Overpass `geometry` tömböt GeoJSON Feature-ré konvertál, `L.geoJSON` style függvénnyel színezi (park=#22c55e, erdő=#15803d, rét=#84cc16, cserjés=#65a30d, lakó=#64748b, kereskedelmi=#f97316, ipari=#94a3b8, mezőgazdaság=#eab308). Dark CARTO tile layer, indigo épületjelölő, bottom-left jelmagyarázat, betöltési/hibaállapot.
- **`components/land-use-map.tsx`** — SSR:false dynamic import wrapper, `LandUseMap` export.
- **`components/environment-page-client.tsx`** — `sec-green` szekció aljára (zajterhelés szekció után) hozzáadva a területfelhasználás térkép a `LandUseMap buildingLat={lat} buildingLon={lon}` komponenssel.

## 2026-05-22 — v0.9.5 Zöld Épület Pontszám (Feature 02)

### Added
- **`app/api/building-score/[buildingId]/route.ts`** — GET `/api/building-score/[buildingId]`. Auth + membership ellenőrzés. 6 al-pontszám párhuzamos számítása: levegőminőség (OpenAQ v3), zöldfelület, közlekedés, kerékpározás, zaj, hőszigat (mind Overpass API). Minden külső API-hívás `AbortSignal.timeout(15000)` + try/catch alapértelmezett értékekkel. Haversine-távolság segédfüggvény. Nominatim geocoding fallback ha az épületnek nincs lat/lon-ja. `Cache-Control: s-maxage=3600`. Visszaad: `{ total, air, green, transit, cycling, noise, uhi, badge, airEstimated, lat, lon, computedAt }`.
- **`app/w/[buildingId]/green-score/page.tsx`** — Szerver oldal: UUID validáció, auth + tagság ellenőrzés (azonos pattern mint klimakockazat). Épület lat/lon lekérés Supabase-ből + Nominatim fallback. Budapest koordináta fallback (47.4979, 19.0402). `generateMetadata` SEO-hoz.
- **`components/green-score-dashboard-client.tsx`** — Kliens dashboard: SVG körív pontszámkijelző, badge (Platina/Arany/Ezüst/Bronz/Fejlesztendő) Tailwind-színekkel, 6 al-pontszám kártya 2-3 oszlopos rácsban (progress bar, ikon, forrás-attribúció), skeleton töltési állapot, hibaállapot, Frissítés gomb, adatforrás-attribúciós blokk, vissza-navigáció.

## 2026-05-22 — v0.9.4 Közösségi Zöld Akciók (Feature 05)

### Added
- **`app/w/[buildingId]/zold-akciok/page.tsx`** — Szerver oldal: UUID validáció, auth ellenőrzés, tagság-ellenőrzés (ugyanaz a pattern, mint `/w/[buildingId]/zaj`), épület neve + azonosítója átadva a kliens komponensnek. `generateMetadata` SEO-hoz.
- **`components/green-actions-client.tsx`** — Kliens dashboard 3 szekcióval:
  1. **CO₂ Megtakarítás Kalkulátor** — távolság-csúszka (0–50 km), közlekedési mód választó (Autó/BKK/Kerékpár/Gyalog), összehasonlító táblázat (Autó: 0,21 kg/km, BKK: 0,082 kg/km, többi 0), „Rögzítem" gomb localStorage mentéshez.
  2. **Saját Közlekedési Napló** — legutóbbi 10 út `pl_trip_log` localStorage kulcsból, havi CO₂-megtakarítás összesítő, „Törlés" link, SSR-biztos hidratálás `useEffect`-tel.
  3. **Épületi Zöld Akciók** — 6 előre definiált zöld akció kártya (faültetés, szelektív gyűjtés, LED-csere, kerékpártároló, zöldhomlokzat, esővíz-gyűjtés), „Szavazok rá!" toggle, lokális szavazatszámláló.
- Teljes kliens-oldali állapot (localStorage + React state) — nincs új Supabase tábla, nincs új npm csomag.

## 2026-05-22 — v0.9.3 Panellako Supabase projektbe irányítás — OSM-cím adatok

### Fixed
- **`app/api/location/autocomplete/route.ts`** — A cím-autocomplete endpoint mostantól `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env változókat használ (Panellako projekt, `wzromwxpjlyrqbdiapep`). Korábban tévesen a GeoData projektbe (`SUPABASE_URL` / `GEODATA_SUPABASE_SERVICE_ROLE_KEY`) írt/olvasott.
- **`scripts/import-hungary-addresses.mjs`** — Az import szkript szintén átirányítva a Panellako projektre; a kommentben szereplő URL és env var nevek frissítve.
- **`supabase/migrations/20260522002_osm_addresses.sql`** — `public.osm_addresses` tábla migrációja a Panellako projektbe: teljes oszlopstruktúra, GIN + B-tree indexek az autocomplete lekérdezési mintákhoz, RLS policy (publikus olvasás, csak service role írhat).

## 2026-05-22 — v0.9.2 Hőszigat és Klímakockázat Modul (Feature 04)

### Added
- **`lib/uhi-calculator.ts`** — UHI (Urban Heat Island) kalkulátor könyvtár. Becsüli a helyi hőmérsékleti többletet a vidéki referenciához képest OSM-ből levezetett adatok alapján: épületsűrűség, zöldfelület-lefedettség, víztest- és parkközelség × szezonális szorzók (Unger J. 2010, Oke 1982). KlímaScore 0–100 (UHI-komponens 40pt + levegőminőség 30pt + árvízkockázat 30pt). Havi UHI tömb (jan–dec).
- **`app/api/environment/heat-island/route.ts`** — GET `/api/environment/heat-island?lat=X&lon=Y`. Overpass API 500m sugarú lekérdezés (épületek, zöldfelületek, víztest, parkok, könyvtárak, bevásárlóközpontok, szökőkutak, mélygarázsok). 24 órás modul-szintű cache. Budapest fallback.
- **`components/uhi-risk-card.tsx`** — UHI kockázat-kártya: °C szám SVG-gyűrűvel, KlímaScore mutató, al-indikátorok.
- **`components/uhi-monthly-chart.tsx`** — Havi UHI sávdiagram (jan–dec), tiszta SVG. Kék (téli) → piros (nyári) szín.
- **`components/cool-spots-list.tsx`** — Hűsölőhelyek listája típus-ikonnal, névvel, távolsággal.
- **`components/climate-action-plan.tsx`** — 8 pontos klíma-cselekvési terv checkbox-okkal (localStorage), EU pályázati link.
- **`components/heat-island-dashboard-client.tsx`** — Kliens dashboard wrapper: fetch, skeleton, error state.
- **`app/w/[buildingId]/klimakockazat/page.tsx`** — Szerver page, auth + tagság, Supabase lat/lon + Nominatim fallback.

## 2026-05-22 — v0.9.1 Budapest 2030 Stratégiai Indikátorok Dashboard (Feature 11)

### Added
- **`lib/budapest-2030-data.ts`** — Teljes statikus adatfájl: mind a 11 EU Zöld Főváros indikátor (`BudapestIndicator` típussal: azonosító, leírás, jelenlegi érték, EU határérték, 2030-as cél, 2015–2023-as trend, kerületi bontás, lakói tippek, adatforrás, EU városok összehasonlítása), Budapest 2030 ITS 5 pillérkártya (élhető/zöld/dinamikus/gondoskodó/okos), normalizáló segédfüggvény a radar-diagramhoz. Összes adat: KSH, EEA, BKK éves jelentések, OLM.
- **`app/w/[buildingId]/budapest-2030/page.tsx`** — Szerver komponens: membership auth check + statikus metadata (`Budapest 2030 — PanelLakó`). Rendeli a `Budapest2030DashboardClient`-et.
- **`components/budapest-2030-dashboard-client.tsx`** — Fő kliens komponens: 4 fül (11 Indikátor / Budapest 2030 Célok / Személyes Hatás / Városok), összefoglaló stat kártyák (jó/közepes/kritikus/javuló), tab navigáció `useState`-tel.
- **`components/budapest-2030-indicator-card.tsx`** — Kártyakomponens az összes 11 indikátorhoz: státuszbadge (JÓ=zöld/KÖZEPES=amber/KRITIKUS=piros), jelenlegi érték + egység, EU határérték + 2030-as cél, trendnyíl, SVG mini-sparkline (2015–2023), összecsukható „Mit tehetsz te?" tippek, adatforrás attribúció.
- **`components/budapest-2030-pillar-card.tsx`** — Budapest 2030 pillér kártyakomponens 3 alcéllal és progress-barral (pillér-akkordszínű / amber / piros, a %-tól függően).
- **`components/personal-impact-calculator.tsx`** — Interaktív CO₂/víz/hulladék hatáskalkulátor: személyautó km, tömegközlekedés km, kerékpározás km, vízfogyasztás, szelektív hulladékgyűjtés csúszkákkal; kiszámolja az éves CO₂-megtakarítást, vízfogyasztás-különbséget, újrahasznosított hulladék kg-ot; „Ha mind a 1,7M budapesti lakó így élne…" városszintű projekció.
- **`components/city-comparison-radar-chart.tsx`** — Tiszta SVG radar-diagram (Recharts-nélkül) 5 városra (Budapest/Bécs/Prága/Varsó/Pozsony) 11 tengelyen, városonkénti toggle gombok, 0–100-ra normalizált értékek, kísérő pontszámtáblázat.

## 2026-05-22 — v0.9.0 Zajbejelentő + Hulladékgazdálkodás modul (Feature 07 + 12)

### Added — Feature 07: Zajbejelentő (Traffic Noise Reporter)
- **`supabase/migrations/20260522_noise_reports.sql`** — `noise_reports` tábla: `noise_category` és `noise_period` enum típusok, severity 1–5, duration, estimated_db, RLS policy-k.
- **`app/api/noise/reports/route.ts`** — POST (bejelentés mentése, validációval) és GET (90 napos lekérdezés workspace_id alapján).
- **`app/api/noise/heatmap/route.ts`** — GET: dátum × napszak aggregáció (count + átlag severity), utolsó 90 nap.
- **`components/noise-report-form.tsx`** — Kliens form: kategória dropdown, 1–5 csillag-súlyosság, napszak-választó, időtartam slider, becsült dB, szabad szöveges leírás, ismétlődő zaj checkbox.
- **`components/noise-heatmap.tsx`** — 7 nap × 4 napszak rács; szín: white/5 → amber-300 → red-500.
- **`components/noise-health-advisory.tsx`** — WHO/EEA Lnight küszöbértékek (< 40 / 40–55 / 55–65 / > 65 dB), Budapest Stratégiai Zajtérkép link.
- **`components/noise-dashboard-client.tsx`** — 3 füles kliens: Bejelentés | Naptár | Egészségügyi tanácsok.
- **`app/w/[buildingId]/zaj/page.tsx`** — Szerver page: auth + tagság ellenőrzés.

### Added — Feature 12 (waste): Hulladékgazdálkodás
- **`supabase/migrations/20260522_waste_reports.sql`** — `waste_reports` tábla (havi UPSERT, 5 kategória), `illegal_dump_reports` tábla (GPS + kategória + státusz), RLS policy-k.
- **`app/api/waste/reports/route.ts`** — POST (havi upsert + szabálytalan lerakás) és GET (12 havi lekérdezés).
- **`lib/waste-co2-factors.ts`** — EEA-alapú CO₂-megtakarítás tényezők és `calcWasteCO2Savings()`.
- **`components/waste-tracker-panel.tsx`** — Havi hulladékbevitel, live CO₂-megtakarítás számítás, CSS sávdiagram.
- **`components/illegal-dump-reporter.tsx`** — GPS auto-fill gombbal, kategória select, leírás.
- **`components/waste-dashboard-client.tsx`** — 3 füles kliens: Hulladékjelentés | Szabálytalan lerakás | Körzeti rangsor.
- **`app/w/[buildingId]/hulladek/page.tsx`** — Szerver page: auth + tagság ellenőrzés.

## 2026-05-22 — v0.8.3 Térképstílus-perzisztencia javítás + DB migráció UI

### Fixed
- **`hooks/use-map-theme.ts`** — `fetchPromise` nem resetelődött `null`-ra a `catch` ágban, így az első sikertelen fetch után minden következő hívás ugyanazt a sikertelen Promise-t kapta vissza (stale dark theme). Javítva: `fetchPromise = null` a catch ágban + `localStorage` fallback. `useState` initializer mostantól `cachedTheme ?? readLocalStorage() ?? default` sorrendben indul — azonnal helyes témát mutat DB-hívás előtt is.
- **`components/superadmin-client.tsx`** — `saveMapTheme()` korábban optimistikusan `setMapTheme(id)` hívott DB-konfirmálás előtt, elfedve az esetleges mentési hibákat. Javítva: a téma-state és a `invalidateMapThemeCache(id)` hívás most a `res.ok` megerősítése után fut. Hibaüzenet részletes szöveggel + 5s timeout.
- **`app/api/settings/map-theme/route.ts`** — Hiányzó env var és DB read error esetén `console.warn`/`console.error` naplózás hozzáadva. Téma ID regex validáció: `/^(minimal|nature|dark|dlc)$/.test(id)`.

### Added
- **`hooks/use-map-theme.ts`** — `localStorage` perzisztencia (`panellako_map_theme` kulcs): témaváltás után az oldalfrissítés azonnal a helyes témát mutatja, DB round-trip nélkül.
- **`app/api/superadmin/apply-migrations/route.ts`** — Új POST endpoint, szuperadmin-auth protected. Két módszerrel próbálja alkalmazni a DDL migrációkat: (1) `supabase.rpc('exec_sql')`, (2) `fetch(supabaseUrl + '/pg/query')`. Visszaadja a nyers SQL-t `manualSqlIfFailed` mezőben, ha mindkét metódus sikertelen.
- **`components/superadmin-client.tsx`** — „Migrációk alkalmazása" szekció a superadmin vezérlőpulton: gomb, eredmény-lista (migráció-nként ok/error), manuális SQL fallback-megjelenítés sárga dobozban.

## 2026-05-22 — v0.8.1 Dinamikus térképstílus-rendszer — 4 téma + superadmin témaváltó

### Added
- **`lib/map-theme.ts`** — 4 kanonikus téma definíciója (`minimal`, `nature`, `dark`, `dlc`) egységes `MapTheme` típussal: tile URL, attribúció, color palette (primary, secondary, accent, building, text, background), swatch preview.
- **`hooks/use-map-theme.ts`** — kliens-oldali hook, modul-szintű cache-sel; egy API-hívás per oldalbetöltés, minden térkép-komponens osztja.
- **`app/api/settings/map-theme/route.ts`** — nyilvános GET endpoint, visszaadja az aktuális téma ID-t a `platform_settings` táblából; `DEFAULT_THEME_ID = 'dark'` fallback.
- **`supabase/migrations/20260522001_map_theme_default.sql`** — alapértelmezett `map_theme = {"id":"dark"}` beillesztése a `platform_settings` táblába.
- **Superadmin témaváltó UI** (`components/superadmin-client.tsx`) — 4 gombos kártyarács, color swatch preview, aktív téma kiemelés; PATCH `/api/superadmin/settings` → azonnali mentés + cache invalidálás.
- **5 prompt-response dokumentum** (`map_styles/prompt-responses/`):
  - `01-mapbox-vs-leaflet.md` — Mapbox GL JS vs Leaflet vizuális testreszabhatóság teljes összehasonlítás, döntési útmutató
  - `02-maputnik-integration.md` — Maputnik stílusok exportja + MapLibre GL / Leaflet integráció lépésről-lépésre
  - `03-osm-vector-rendering.md` — OSM vektortérkép réteg-hierarchia, egyedi vizuális rétegek (heatmap/choropleth/highlight/3D extrude), zoom-vezérelt viselkedés
  - `04-minimalist-design.md` — minimalista térképdesign nagy adathalmaz mellett, adat-szűrési és aggregációs technikák, checklist
  - `05-tilejson-specification.md` — TileJSON spec alapjai, automatikus generálás, eszközök, template, AI-prompt példaszöveg

### Changed
- **`components/cycling-map-inner.tsx`** — `theme?: MapTheme` prop + `useMapTheme()` hook; tile URL és building marker szín témafüggő; `theme.id` a useEffect dependency listában.
- **`components/air-quality-map-inner.tsx`** — ua. pattern; CARTO dark_all hardcode → `theme.tileUrl`.
- **`components/transit-live-map-inner.tsx`** — ua. pattern; OSM standard tiles → `theme.tileUrl`.
- **`components/compact-city-map.tsx`** — ua. pattern; tile URL témafüggő.
- **`components/budapest-transit-analysis.tsx`** — `useMapTheme()` hook; CARTO light_all hardcode → `theme.tileUrl`.

### Notes
- Az összes térkép-komponens visszaesik `'dark'` témára, ha az API-hívás sikertelen (offline / DB-hiba).
- Témaváltás után a felhasználók az **oldal újratöltésekor** látják az új témát (modul-szintű cache nem invalidálódik live).
- Szuperadmin témaváltás azonnali cache-invalidálást is végez (`invalidateMapThemeCache()`), így az ugyanazon oldalbetöltésen belüli próba is az új témát mutatja.

## 2026-05-21 — v0.8.0 Tier 1 CI/CD + observability + security setup (audit Tier 1)

### Added — CI/CD + Security (this agent)
- **`.github/workflows/ci.yml`** — átfogó CI minden `push` + `pull_request` `main`-re. 6 párhuzamos job a `concurrency: ci-${{ github.ref }}` group alatt (PR-frissítés cancel-eli a futót):
  - **`typecheck`** — `tsc --noEmit` (Node 20, npm cache, `npm ci --no-audit --no-fund --prefer-offline`).
  - **`lint`** — `next lint` ugyanazon a Node-20 + cache setup-on.
  - **`build`** — `next build` `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` stub env-vel és `NEXT_TELEMETRY_DISABLED=1`-gyel; `needs: [typecheck, lint]`-tel kapuzva.
  - **`gitleaks`** — `gitleaks/gitleaks-action@v2`, full-history checkout (`fetch-depth: 0`), `.gitleaks.toml` config-fal, `GITHUB_TOKEN`-nel a PR-comment-hez.
  - **`semgrep`** — `returntocorp/semgrep` konténerből, `semgrep ci --config=auto --config=.semgrep.yml`, registry rulesets: `p/nextjs p/typescript p/react p/owasp-top-ten p/secrets`. SARIF-ot ad át a `github/codeql-action/upload-sarif@v3`-nek (`category: semgrep`) → GitHub Code Scanning UI.
  - **`trivy`** — `aquasecurity/trivy-action@master` filesystem-scan `CRITICAL,HIGH` súllyal, `ignore-unfixed: true`, `skip-dirs: node_modules,.next,growth_strategy/fonts,valuation/fonts`. SARIF feltöltés `category: trivy`.
  - Permissions: `contents: read`, `security-events: write` (SARIF-hoz), `pull-requests: write` (gitleaks PR-comment).
- **`.github/dependabot.yml`** — heti frissítés (hétfő 04:00 Europe/Budapest):
  - **npm** csoportokkal: `next-react` (next + react + @next/*), `supabase` (@supabase/*), `tailwind` (tailwindcss/autoprefixer/postcss), `sentry` (@sentry/*), `typescript` (typescript + @types/*), `eslint` (eslint* + @typescript-eslint/*), `dev-dependencies` (minden devDep minor+patch). 10 nyitott PR-ig, `chore(deps)` commit-prefix, `dependencies` + `automerge-candidate` label.
  - **github-actions** ecosystem külön, `chore(ci)` prefix-szel, `dependencies` + `ci` címkékkel.
- **`renovate.json`** — alternatíva Dependabothoz, jobb grouping-gel (`group:allNonMajor`, `:automergeMinor`, `:dependencyDashboard`, `:prHourlyLimit2`). Patch-all auto-merge branch-en, Next.js+React / Supabase / Sentry / Stripe csoportok, devDeps auto-merge, `sharp` és `@react-pdf/renderer` külön csoport `stabilityDays: 7`-tel és auto-merge nélkül. `lockFileMaintenance` heti hétfő 5:00. `Europe/Budapest` időzóna, `vulnerabilityAlerts` security-label-lel, auto-merge nélkül. A user választhat Dependabot vagy Renovate közül — egyszerre csak az egyik fusson.
- **`.gitleaks.toml`** — secret-scanning config. `useDefault = true` (gitleaks beépített ruleset), plusz panellako-specifikus rule-ok: `supabase-service-role-key` (JWT minta), `supabase-service-role-key-assignment` (env-var assignment), `stripe-secret-key` (sk_live/test), `stripe-webhook-secret` (whsec_), `resend-api-key` (re_), `sentry-dsn-with-secret` (legacy DSN). Allowlist: `node_modules/`, `.next/`, `package-lock.json`, `CHANGELOG.md`, `codingLessonsLearnt.md`, doc-pack-ek (`growth_strategy/`, `valuation/`, `doc creation/`), `versioning/*.md`, `marketing/*.md`, `cycling-data-sources/*.md`, `stack_audits/*.md`, `map_styles/*.md` — a doku tartalmazhat illusztratív vagy már rotált példa-kulcsokat.
- **`.semgrep.yml`** — 4 panellako-specifikus custom rule (a `semgrep ci --config=auto` online registry-jét egészíti ki):
  - `no-service-role-in-client-or-page-component` (ERROR) — `SUPABASE_SERVICE_ROLE_KEY` tilos `app/**` és `components/**` alatt, kivéve `app/api/**`, `app/superadmin/**`, `app/**/route.ts`.
  - `no-anon-key-in-superadmin-api` (WARNING) — `NEXT_PUBLIC_SUPABASE_ANON_KEY` `app/api/superadmin/**` alatt valószínűleg hiba (RLS-fal verekszik az admin).
  - `no-fetch-without-timeout` (WARNING) — `app/api/**` és `lib/**` alatt `fetch($URL)` `AbortSignal.timeout()` nélkül a Vercel function-budget végéig lóghat.
  - `no-console-log-in-production-route` (INFO) — `app/api/**`, `app/w/**`, `app/superadmin/**` alatt strukturált `lib/log.ts`-t kell használni a trace-correlation miatt.
- **`scripts/check-secrets.sh`** (executable) — lokális gitleaks scan, opcionális husky/dependency nélkül. `chmod +x` rajta van, `set -euo pipefail`, telepítési útmutatóval, ha gitleaks nincs telepítve. `gitleaks detect --source=$PATH --config .gitleaks.toml --verbose --no-git` ugyanazon a config-on fut, mint a CI.

### Changed — CI/CD + Security
- Semmi — minden új fájl. **A `package.json`-t NEM** érintettük (a CI tool-jai konténerből futnak: gitleaks-action, returntocorp/semgrep, aquasecurity/trivy-action). Husky, lint-staged, simple-git-hooks szándékosan nem lett npm-csomagként hozzáadva — a `scripts/check-secrets.sh` opcionális lokális alternatíva.

### Notes — CI/CD + Security
- **Tier 1 fedés:** az audit (`stack_audits/panellako_ai_stack_optimization_audit.md` §4.4 és §4.8) Tier 1 javaslatai (`gitleaks pre-commit`, `Semgrep CE` + nextjs/typescript/react ruleset, `Trivy` lockfile-scan, `Dependabot`, alternatív `Renovate`) mind teljesülnek — nulla EUR/hó vendor-spend, csak GitHub Actions free tier (2 000 min/mo).
- **SARIF + Code Scanning:** a `security-events: write` permission kell a `github/codeql-action/upload-sarif@v3`-hoz; nyilvános repón a Code Scanning automatikusan rendelkezésre áll, privát repón GitHub Advanced Security feature flag szükséges (a user megerősíti — public a repo, OK).
- **gitleaks-action konfiguráció:** csak `GITHUB_TOKEN`-nel dolgozik (a `GITLEAKS_LICENSE` titok org-szintű, csak large-org enterprise tier-en kell). A PR-comment automatikusan érkezik, ha pre-existing leak-et találunk, manuálisan kell triagolni.
- **Dependabot vs Renovate:** mindkettő fájl bekerül, de **csak az egyiket aktiváld**. Dependabot alapból bekapcsol, Renovate-hoz a GitHub App-ot kell telepíteni a repóra. A `renovate.json` jelenléte nem aktiválja önmagában — biztonságos itt hagyni.
- **NOT touched:** `app/**`, `components/**`, `lib/**`, `supabase/**`, `next.config.mjs`, `vercel.json`, `middleware.ts`, `tsconfig.json`, `package.json`, `package-lock.json`, `tailwind.config.*`, `postcss.config.mjs`, `sentry.*`, `vitest.*`, `posthog.*` — a build-output és deploy-target bit-szintig változatlan.

### Added — Backend / Observability / Data integrity (this agent)
- **`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`** — `@sentry/nextjs` v8 init triplet. Mind a három `NEXT_PUBLIC_SENTRY_DSN`-re kapcsol; DSN nélkül a SDK no-op (build-safe). Client config: `tracesSampleRate: 0.1`, replay csak hibára (`replaysOnErrorSampleRate: 0.5`) `maskAllText` + `blockAllMedia` GDPR-flag-ekkel; `ignoreErrors` filterek a network/abort zaj kiszűrésére. Server config: tracing + profiling 0.1 sample, `httpIntegration({ tracing: true })`. Edge: `tracesSampleRate: 0.1`.
- **`next.config.mjs`** — feltételes `withSentryConfig` wrap. Csak akkor élesedik, ha `SENTRY_ORG` ÉS `SENTRY_PROJECT` env be van állítva (source-map upload-hoz); egyébként direkt export. `tunnelRoute: '/monitoring'` ad-blocker-bypass-hoz, `hideSourceMaps: true`, `widenClientFileUpload: true`, `reactComponentAnnotation: { enabled: true }`, `automaticVercelMonitors: true`.
- **`lib/log.ts`** — strukturált JSON logger (`{ ts, level, event, ... }` egy-soros JSON, Vercel + Supabase Logflare natívan parse-olja). Konvenció: `event` dotted snake_case namespace (pl. `transit.sync.start`). `logger.{debug,info,warn,error}` és `withTiming(event, fn, ctx?)` async-wrapper, ami sikerre `latency_ms`-t loggol, hibára pedig `error: { name, message, stack }` objektumot.
- **`lib/integrity.ts`** — SHA-256 helper + idempotency-key generátor. Általánosítja a `cycling-data-sources/00b_SUPABASE_BACKEND.md`-ben már leírt snapshot-hash mintát, hogy ugyanaz a hash-konvenció használható legyen pgmq job-dedup-ra, fájl-integritás ellenőrzésre, és upsert change-detection-re. `sha256(input)` / `sha256Stream(stream)` / `eqHash(a, b)` / `idempotencyKey(source, payload)`. Az idempotencyKey rendezi az object-keyeket, így `{a:1,b:2}` és `{b:2,a:1}` azonos hash-t ad.
- **`lib/posthog.ts`** — `'use client'` PostHog wrapper. EU host (`https://eu.i.posthog.com`), `person_profiles: 'identified_only'` GDPR-barátabb működéshez, autocapture on, **session recording OFF** (explicit opt-in prod-ban). `initPostHog()` lazy idempotens, `usePostHog()` hook, `track(event, props)` no-op ha nincs key. **NEM mount-olja magát semmilyen layoutba** — a user dönti el, mikor élesedik.
- **`supabase/migrations/20260521_pgmq_job_queue.sql`** — 4 queue (`q_transit_sync`, `q_cycling_ingest`, `q_ndvi_render`, `q_dead_letter`), `public.job_idempotency_keys` tábla RLS-szel (service-role only), és két SECURITY DEFINER RPC: `enqueue_with_key(p_queue, p_key, p_payload)` ami visszaadja `(message_id, was_new)`-t (re-call ugyanazon kulccsal no-op), és `move_to_dead_letter(p_key, p_reason)` ami áthelyezi a payload-ot a DLQ-ba és `status='failure'`-re állítja a kulcsot. Minden `pgmq.create()` saját `do $$ ... $$` blokkban van — hiányzó extension vagy meglévő queue tiszta no-op.
- **`supabase/migrations/20260521_pg_partman_platform_logs.sql`** — `platform_job_logs` átalakítása havi partíció-táblára `pg_partman` segítségével. Megőrzi az eredeti sémát (UUID PK, `triggered_by`, status CHECK constraint). A PK (id) → (id, started_at) kell, mert minden UNIQUE constraint-nek tartalmaznia kell a partition-key oszlopot. Retention: 12 hónap (auto-drop). Outer exception-handler-rel safe-no-op-ol ha `pg_partman` nincs telepítve.
- **`vitest.config.ts`, `tests/setup.ts`** — Vitest 2.x framework + jsdom env + `@testing-library/jest-dom` matchers + TextEncoder/TextDecoder polyfill. Coverage v8-provider HTML + lcov reporter-rel, `cycling-data-sources/`, `map_styles/`, `stack_audits/` kizárva.
- **`tests/lib/integrity.test.ts`** (4 case) — sha256 stable-hex, Uint8Array ↔ Buffer ekvivalencia, eqHash, idempotencyKey order-invariance.
- **`tests/lib/log.test.ts`** (2 case) — logger JSON-shape verifikáció, withTiming latency_ms emit + return value.
- **`package.json`** — új dep-ek: `@sentry/nextjs@^8.0.0`, `posthog-js@^1.130.0`. Új devDep-ek: `vitest@^2.0.0`, `@vitest/coverage-v8@^2.0.0`, `@vitejs/plugin-react@^4.3.0`, `jsdom@^25.0.0`, `@testing-library/react@^16.0.0`, `@testing-library/jest-dom@^6.4.0`. Új scriptek: `test`, `test:watch`, `test:coverage`.

### Notes — Backend / Observability / Data integrity
- **Tier 1 fedés:** az audit (`stack_audits/panellako_ai_stack_optimization_audit.md` §4.2/§4.3/§4.6/§4.7) Tier 1 javaslatai (Sentry Developer, structured logger, pgmq-alapú DLQ + idempotency-key, `pg_partman` a `platform_job_logs`-ra, Vitest framework, PostHog free) mind teljesülnek — incremental cost 0 €/hó (Sentry/PostHog/Logflare free tier-ek elegendőek a low-thousand DAU-hoz).
- **Required env vars (mind opcionális, build-safe ha nincs):**
  - `NEXT_PUBLIC_SENTRY_DSN` — DSN nélkül Sentry no-op
  - `SENTRY_ORG`, `SENTRY_PROJECT` — csak source-map upload-hoz, ha hiányoznak a `withSentryConfig` wrap kimarad
  - `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (default `https://eu.i.posthog.com`) — key nélkül PostHog no-op
  - `NEXT_PUBLIC_VERCEL_ENV`, `VERCEL_ENV` — Vercel auto-inject
- **Scope-on kívül (szándékosan):** `app/api/superadmin/jobs/run/route.ts` NEM lett refaktorálva pgmq-ra — csak az infrastruktúra (queue-k + idempotency tábla + helper RPC-k) jön létre. PostHog provider mount-olása szintén későbbi PR. Sentry capture auto-instrumentál Next.js handler-eket, kézi `Sentry.captureException` hívás nem szükséges a v0.8.0 baseline-hez.
- **Assumption flag:** a `pg_partman` extension installáltsága a Supabase projekten feltételezés (az audit Tier 1 javaslata, és a spec `cycling-data-sources/00b_SUPABASE_BACKEND.md` is listázza). Ha NINCS engedélyezve, a partíciós migráció notice-ot ír és érintetlen hagyja a táblát — biztonságos no-op.
- **NOT touched (this agent):** `app/**`, `components/**`, `.github/**`, `middleware.ts`, `vercel.json`, `tsconfig.json`, `tailwind.config.*`, `postcss.config.mjs`, meglévő `lib/*` fájlok, meglévő `supabase/migrations/*` fájlok — a build-output és deploy-target változatlan ezeken kívül.

## 2026-05-20 — v0.7.17 OSM custom map style spec (≥31k karakter, 4 téma, 30 layer-blokk, z0–z20 szabályok)

## 2026-05-20 — v0.7.16 AI-stack-optimalizációs audit (3 cost-tier, ≈8–15k karakteres jelentés)

### Added
- **`stack_audits/panellako_ai_stack_optimization_audit.md`** — új, önálló audit-jelentés a teljes panellako stack-re, **3 cost-tier szerkezetben** (Tier 1 ≈7 €/hó, Tier 2 ≈99 €/hó, Tier 3 ≈248 €/hó). A jelentés 10 réteget vizsgál (Frontend / Backend / Data / CI/CD / AI / Event-driven / Observability / Security / Data-integrity / Edge-WASM) és minden rétegre tier-szinten ad konkrét vendor-választást, EUR-számot és repo-specifikus érvelést. A "Belül 7+ iterációs" finomítás során azonosított extra technológiák: **pgmq+pg_cron+pg_net** mint Kafka-helyettesítő (már enabled a repo-ban), **OpenTelemetry+Grafana Cloud** (free tier), **Sentry Dev**, **Cloudflare R2 zero-egress** a NDVI master tier-hez, **Cloudflare Worker + WASM sharp** a NDVI Lanczos3 upscale off-loading-jához, **Inngest/Trigger.dev** opcionális (de a tanulmány javaslata szerint **nem szükséges** mert a pgmq elég), **Snyk Code**, **gitleaks pre-commit**, **Semgrep CE**, **Trivy lockfile-scan**, **Renovate Bot**, **Chromatic visual diff**, **PostHog free**, **Neon read-replica branching**.
- **`stack_audits/`** mappa létrehozva (eddig nem létezett).
- **`versioning/200526_28_v0.7.16_stack_audit.md`** — engineering record.
- **`marketing/marketing_values/20260521_v0.7.16_stack_audit_marketing_value.md`** — marketing record.

### Changed
- Semmilyen alkalmazás-kód (route.ts, components/*, lib/*, supabase/* stb.) **NEM** módosult — ez tisztán auditing-task volt, nem development-task. A repo viselkedése, build-output, deploy-target változatlan.

### Notes
- A jelentés repo-specifikus erősségeket aknáz ki: a meglévő `pgmq + pg_cron + pg_net` Supabase-extension-mátrixot (Kafka helyett 0 €), a `SHA-256 snapshot hash` mintát a cycling-data spec-ből (idempotens upsertek), a 25-source `cycling-data-sources/*.md` few-shot library-t (AI-asszisztált adapter-generálás ~25 € one-off), a `crazy_innovations/system.md` 5-iteration kreativitás-protokollt (v0.7.15 hero ennek köszönhető), a `full-stack-e2e-prompt-ecosystem/end_to_end_full_stack_verification.prompt`-ot (free CI gate Sonnet API-n keresztül), és a Stripe + `tenant_subscriptions.tier_id` + `superadmin_change_workspace_tier` RPC párost (AI-feature-ek tier-gating-jéhez kész billing-rail).
- 10 hidden-risk megfogalmazva (Nominatim ToS, sharp cold start, zero CI test gate, superadmin single-secret, `platform_job_logs` unbounded, service-role-leak audit grep, Cloudflare in front of Vercel, NDVI 100 MB lambda-ceiling, in-memory cache cold-start evaporation, no off-site WAL archive).
- A jelentés **NEM tartalmazza** az "internal 7+ iteration story"-t (a spec szerint a iterációk eredménye, nem a folyamat kerül a outputba), de a végeredmény minden rétegen tükrözi: 1) raw draft → 2) Kafka/WASM extra → 3) cost-tier balancing → 4) hiányzó observability+security+test rétegek → 5) AI-strategy per tier → 6) hidden-risk walkthrough → 7) 90-day execution roadmap.
- **Cost-tier vég-összegek**: Tier 1 = **7 €/hó (≈84 €/év)**, Tier 2 = **99 €/hó (≈1 188 €/év)**, Tier 3 = **248 €/hó (≈2 976 €/év)**. Tier 3 / Tier 2 = +150%.
- **Nem érintett**: dashboard hero, address-autocomplete, Budapest-transit, satellite/NDVI, superadmin, cycling-jobs, environment-page — minden korábbi modul változatlan.

## 2026-05-20 — v0.7.15 Dashboard hero — napszak- és évszak-aware animált jelenet

### Added
- **`components/dashboard-hero-scene.tsx`** — új önálló kliens-komponens, ami a Dashboard hero-jét egy **élő, ambient SVG-jelenetté** alakítja. Hét napszak (hajnal/reggel/nappal/délután/naplemente/este/éjszaka) és négy évszak (tavasz/nyár/ősz/tél) kombinációi alapján váltja a sky-gradient palettát, az égitestet (nap vs. hold + krátermintázat), a felhők/csillagok/villogó épület-ablakok motívumait, és a fák megjelenését (rügyes tavaszi rózsaszín virágok / sűrű nyári lomb + alkalmi pillangó / őszi színes lomb + hulló levelek / téli csupasz törzs + hósapkák).
- **BKK-villamos sziluett**: 25–45 mp-enként random átkel a hero alján bal→jobb (`requestAnimationFrame` helyett pure CSS `@keyframes panellako-tram`, GPU-friendly `transform: translateX()`), éjszaka világító ablakokkal és fényszóróval, nappal pasztel-üveg ablakokkal.
- **Háttérben forgó csillagképek**: 3 kis cluster lassan rotál (8–18 mp-es ciklus), 38 véletlenszerű "twinkle" csillag pulzál, és egy ritka shooting-star animáció (30 mp-es ciklus) ad finom mozgalmasságot — anélkül, hogy elvonná a figyelmet a tartalomról.

### Changed
- **`components/dashboard-client.tsx`** hero blokkjában a statikus `PanelSkylineSvg` helyett `<DashboardHeroScene />` van. A header magassága (108 px) és a layout (left: cím / center: jelenet / right: search + actions) változatlan. A bal- és jobb-szélső gradient-fade-ek 1/3-ról 1/4-re csökkentek, hogy az élő ég jobban látszódjon, de a cím + a search-chip kontrasztja megmarad.

### Notes
- **Nulla új npm dep** — minden tisztán inline SVG + scope-olt CSS `@keyframes`. Nincs framer-motion, lottie, anime.js.
- **Performance**: a véletlenszerű elemek (csillag-pozíciók, hópelyhek, levelek, felhők) `useMemo`-val egyszer generálódnak a mount-kor (mulberry32 deterministic seed), és csak `transform` + `opacity` animálódik (compositor-only).
- **Akadálymentesség**: `prefers-reduced-motion: reduce` esetén minden animáció `animation: none` (csak a helyes napszak-paletta marad). A jelenet `aria-hidden="true"` — dekoratív, nem hordoz fontos információt.
- **Re-evaluation**: `setInterval` 60 mp-enként frissíti a napszakot — egy nap alatt felhasználó nélkül is kíséri az időt. Az évszak a session során állandó.
- **API**: `forceTimeOfDay` és `forceSeason` prop-okkal a komponens bármikor manuálisan állítható (teszt / preview / superadmin demo).
- **Nem érintett**: address-autocomplete, satellite/NDVI, superadmin, Budapest-transit, environment-page — minden korábbi modul változatlan.

## 2026-05-20 — v0.7.14 Magyarország-szintű címkereső (Nominatim fallback) + profil-mentés + környezeti referencia-cím

### Added
- **`/api/location/autocomplete` Nominatim fallback** — eddig csak a `osm_addresses` Supabase-táblát kereste, ami a production-ben jelenleg üres / hiányzik. Most ha a Supabase 0 eredményt ad vagy nem elérhető, **automatikusan visszaesik OpenStreetMap Nominatim-re** (`countrycodes=hu`, `limit=8`, `addressdetails=1`), és a teljes Magyarország címkészlete kereshetővé válik. Politikus használat: 1 req/sec/IP throttle, 24 h in-memory cache, `User-Agent: panellako.hu/1.0`, csak `q.length >= 4` esetén hívódik a külső API. A response payload-ban a `source` mező (`'supabase' | 'nominatim'`) jelzi a forrást, és minden javaslat hordozza a teljes címet (lat/lon/utca/házszám/város/kerület/irányítószám), nem csak a label-t.
- **Új tábla `public.user_reference_addresses`** (`supabase/migrations/20260521_user_reference_addresses.sql`) — egy user, egy referencia-cím (PK = user_id). Tárolja a `display_name`, `lat/lon`, és a strukturált összetevőket (street, house_number, city, district, postcode), valamint opcionális `floor`/`door` mezőket. RLS-sel védve: user csak a saját rekordját látja/írhatja.
- **Új API endpoint `app/api/user/reference-address/route.ts`** — `GET` lekéri a session-user referencia-címét, `POST` upsert-eli a kiválasztott címet. A session-cookie-ból jövő `auth.uid()` és az RLS a single source of truth (nincs service_role write).
- **Címkereső UI újraírva (`components/dashboard-client.tsx` Profil-szekció)** — a javaslat-lista mostantól objektum-tömböt fogad (id/label/lat/lon/source), minden javaslat-soron forrás-badge (`GeoData` vagy `OSM`), külön státusz-sor a teljes forrás-megnevezéssel. Cím-kiválasztás után megjelenik **két új input**: emelet és ajtó (mindkettő opcionális). A "Profil mentése" gomb a kiválasztott címet (a strukturált komponenseivel együtt) elmenti a `user_reference_addresses` táblába a saját userhez. Sikeres mentés után zöld toast 3 mp-re ("Cím elmentve"), hiba esetén piros üzenet.
- **Referencia-cím override a környezeti oldalon (`app/w/[buildingId]/kornyezet/page.tsx`)** — ha a usernek van mentett `user_reference_addresses` rekordja, az `EnvironmentPageClient` annak lat/lon-jával hívódik (nem a building lat/lon-jával). Az összes downstream API-call (`/api/environment/*`, `/api/cycling`, `/api/air-quality/*`, satellite stb.) ehhez a koordinátához igazítva számol. Új `usedReferenceAddress: boolean` prop a kliens-oldali komponensben — ha igaz, a környezet-oldal tetején emerald banner jelenik meg "Az alábbi adatok az Ön referencia-címe alapján számítódnak: …" felirattal.

### Notes
- **Nulla új npm dep:** csak a meglévő `@supabase/ssr` (server client) és a beépített `fetch` (Nominatim). A user kérése szerint **minimális** logika — a táblát szándékosan egyszerűre szabtuk, mert a user jelezte hogy hamarosan egy "brutálabb" táblára cseréli.
- **Backward-compat a frontenden:** a régi `suggestions: string[]` response-formátum helyett most `suggestions: AddressOption[]` jön. A `dashboard-client.tsx` autocomplete-effect tartalmaz egy normalizáló guard-ot is, ami a stringeket (ha jönnének) objektummá alakítja, így nem törik a UI még részleges deploy alatt sem.
- **Nem érintett:** Hero section, satellite/NDVI komponensek, Budapest-transit elemzés, building-seed (Gidófalvy Lajos u. 9 marad), superadmin, cycling-jobs.

## 2026-05-20 — v0.7.13 Budapest tömegközlekedés-elemzés (interaktív ArcGIS-stílusú térkép)

### Added
- **Új oldal `/elemzes/budapest-kozlekedes`** — önálló analitikus térkép Budapest tömegközlekedéséről, GTFS-adatok alapján, a felhasználó szakdolgozati ArcGIS-stílusát követve, interaktív Leaflet-felülettel és **10 be-kikapcsolható réteggel**:
  - **6 közlekedési mód** (alapban bekapcsolva): 🟡 Villamos `#facc15`, 🔵 Metró/Földalatti `#1e3a8a`, 🟦 Busz `#22d3ee`, 🟢 HÉV `#22c55e`, 🔴 Troli `#dc2626`, 🟤 Hajó `#92400e`. A kötöttpályás módok (TRAM/METRO/HEV) vastagabb vonallal és nagyobb opacity-vel.
  - **Megálló-sűrűség hőtérkép** (alpha-kompozit halvány körökkel — Leaflet.heat plugin telepítése nélkül)
  - **Nappali járatok 420 m bufferzónája** (lime halo, `weight: 40, opacity: 0.15` — turf-mentes vizuális közelítés)
  - **Éjszakai járatok 420 m bufferzónája** (csak 9XX route-refek, sárga csíkozott halo — `dashArray: '10,8'`)
  - **Lakóövezet OSM** (`landuse=residential` polygons, **lazy loading** az első aktiváláskor Overpass API-ról)
- **Új API endpoint `app/api/transit/budapest-overview/route.ts`** — egy GET-hívásra visszaadja az összes Budapest-bbox-on belüli megállót és shape-et, csoportosítva route_type szerint a `gtfs_trips ↔ transit_routes` join-on keresztül. Server-oldali decimáció `POINT_BUDGET = 80 000`-re. `availableRouteTypes` és `meta.warnings[]` debug-mezőkkel a hibakeresés érdekében. `Cache-Control: max-age=600, s-maxage=3600, stale-while-revalidate=86400`.
- **`components/budapest-transit-analysis.tsx`** — Leaflet `preferCanvas: true` üzemmódban (1000+ polyline-hoz kötelező), CartoCDN `light_all` basemap-pel, bal-felül chip-stílusú réteg-toggle panel, jobb-felül ℹ módszertan-popup.

### Notes
- **Nulla új npm dep:** se `@turf/buffer`, se `leaflet.heat`, se másik plugin. Csak a meglévő `leaflet` + `@types/leaflet`. A buffer-effekt vastag `weight: 40` polyline-nal van közelítve.
- **Day/night heurisztika:** BKK konvenció szerint a 9-cel kezdődő háromjegyű route-refek éjszakaiak (907, 914, 950 stb.) — `/^9\d{2}$/`. Egyszerűsített a `gtfs_calendar_dates.service_id`-alapú szétválasztáshoz képest, de a BKK-feed-re 99%-ban helyes.
- **`route_type` mapping:** GTFS-standardhoz illeszt (`TRAM`, `METRO/SUBWAY`, `BUS`, `RAIL/HEV/SUBURBAN`, `TROLLEY/TROLLEYBUS`, `FERRY/BOAT`). Ha a DB-ben más enum van, a `availableRouteTypes` debug-mezőben látszik runtime-ban.
- **SSR-mentes Leaflet:** `next/dynamic { ssr: false }` egy thin client-only wrapper-en keresztül (`app/elemzes/budapest-kozlekedes/mount.tsx`) — a Leaflet `window`-on dolgozik importáláskor.
- **Nem érintett:** satellite NDVI, superadmin, compact-city, environment-page-client, dashboard-client — minden korábbi modul változatlan.

## 2026-05-21 — v0.7.12 NDVI Brutális (16 384 × 6 880) tier verifikációs lánc

### Fixed
- A user nem volt biztos abban, hogy a NDVI Brutális tier valóban 16 384 × 6 880 pixel mérettel töltődik be (a screenshot felirat ezt mutatta, de a kép pixeles MODIS-tartalmat jelenített meg). Bevezettünk **két szintű verifikációt**:

#### 1) Job-side (`app/api/superadmin/jobs/run/route.ts`)
- A sharp upscale után **`sharp().metadata()`** ellenőrzi a generált PNG tényleges szélességét/magasságát. Ha nem egyezik a target W×H-val, `dimensionMismatches: [{ key, expected, actual }]` mező a response-ban, és a tier nem kerül feltöltésre.
- A **Brutális (master) tier feltöltése 3× retry-vel** (1,5/3 mp backoff között) — egy ~100 MB-os PNG-t a Supabase Storage gyakran első próbálkozásra timeout-tal abandonol, a 2-3. próba viszont általában átmegy.
- A többi tier (downscale) 1 próba (kis fájlok, megbízhatóak).

#### 2) Browser-side (`components/ndvi-hungary-viewer.tsx`)
- A megjelenített `<img>`-en `onLoad` handler kiolvassa `naturalWidth` / `naturalHeight`-ot
- Összehasonlítja a tier deklarált W×H-jával
- **Mismatch esetén** narancssárga "⚠ Valóban betöltött: X × Y" felirat a felbontás-badgen
- **Match esetén (Brutális tierre)** zöld "✓ Verifikálva: 16 384 × 6 880" felirat
- **Loading indicator** a kép-fetch alatt: "Töltés… 16 384 × 6 880 (XX MB)" — látható a méret már a fetch közben
- `<img>`-en `key={runId-activeRes}` cache-bypass-elve: tier-váltáskor React kényszerít új fetch-et, ne mutasson stale-cache-ből kisebb képet
- Felbontás-badge `tabular-nums` ezres-csoportosítással magyar locale-on: `16 384 × 6 880`

### Note
A MODIS forrás natív 250 m/pixel ami Hungary-re ~2 880 × 1 160 px. A 16 384 × 6 880 tier továbbra is upsampled (Lanczos3-mal) — de a verifikáció garantálja, hogy a feltöltött PNG **tényleg** 16 384 × 6 880 méretű, és a böngészőben is ennyi pixel töltődik be.

## 2026-05-21 — v0.7.11 Cycling jobok — GBFS auto-discovery + Waymarked Trails endpoint-variánsok

### Fixed
- **`cycling_bkk_gbfs_status` + `cycling_bkk_gbfs_info`**: a hardkódolt `https://gbfs.bubi.bkk.hu/gbfs/v3/...` URL **DNS-szinten halott** (`fetch failed`) — a host nem oldódik fel. Új viselkedés:
  1. **GBFS auto-discovery**: 5 candidate `gbfs.json` URL-en (`opendata.bkk.hu`, `gbfs.bubi.bkk.hu`, `gbfs.bubi.bkk.hu/v3`, `api.molbubi.hu`, `molbubi.bkk.hu`) megpróbál csatlakozni
  2. **Sub-feed URL kinyerés**: a sikeres `gbfs.json`-ből kiolvassa a `station_status` / `station_information` feed URL-jét (v1/v2/v3 GBFS séma is támogatva)
  3. **Direct-fallback**: ha mind az 5 discovery URL bukik, 5 közvetlen kanonikus URL-t próbál (`/v3/`, `/`, `/en/`, `api.molbubi.hu` variánsok)
  4. **Diagnosztika**: a `attempts: [{ url, ok, status, error }]` mező a response body-ban visszaadja MINDEN URL-próbálkozás eredményét, hogy a user pontosan lássa melyik bukott el milyen módon

- **`cycling_waymarked_trails`**: a v0.7.7-ben hardkódolt `https://cycling.waymarkedtrails.org/api/v1/list/by_area?bbox=...` endpoint **200 OK + 0 eredményt** adott — az API shape láthatóan változott. Új viselkedés:
  1. **4 endpoint variáns** próbálkozás (eredeti URL + `/list/segments` + alternate axis order + legacy `/api/list` path)
  2. **Tolerált válasz-formák**: `[...]` (raw array), `{results:[]}`, `{rows:[]}`, `{segments:[]}`, `{features:[]}` (GeoJSON FeatureCollection)
  3. **Nyers válasz minta**: ha minden variáns 0-t ad vissza, a `attempts[*].sample` mezőben az első 500 karakter a server valós válaszáról kerül vissza — így a user pontosan látja milyen shape-t kapott (vagy hogy az API "API moved" / hibaüzenetet ad)
  4. **Diagnostikus 502**: minden URL eredmény nélkül → 502 + részletes `attempts` lista

### Notes
- A user a `/superadmin` → "Diagnosztika — külső API curl" felületen mostantól pontosan ellenőrizheti melyik BKK GBFS URL működik az ő Vercel deploy-jából (curl preset-ekkel)
- Mind a 3 új cycling-job most már produkál hasznos diagnostikus üzenetet a UI-on, nem csak "fetch failed"-et

## 2026-05-21 — v0.7.10 Demo building force-UPDATE + runtime safety net (semmilyen körülmény közt nem maradhat az Alkotás u. 42)

### Fixed
- **`supabase/migrations/20260521_force_demo_building_gidofalvy.sql`** (új migráció): a v0.7.9-es UPDATE migráció defenzív `WHERE name = 'Alkotás utca 42.'` guard-dal működött, ami a felhasználói visszajelzés alapján nem mindig garantálta a felülírást (pl. ha valami szuper-edge-case-ben más név volt a régi rekordban, vagy ha a guard máshogy nem matcholt). Ez az új migráció **FELTÉTEL NÉLKÜL** UPDATE-eli a demo épület UUID-ját (`bbbbbbbb-0001-...`) a Gidófalvy Lajos utca 9. értékekre, lat/lon-nal expliciten. Verifikációs NOTICE/WARNING utána.
- **`app/api/superadmin/jobs/run/route.ts` `resolveCoords` runtime safety net**: ha a demo building rekordban a lat/lon még mindig null, és a `b.id === 'bbbbbbbb-...'`, a függvény **hardkódolt értékkel** (`lat=47.5278845, lon=19.0705657`) visszatér és átírja a DB-rekordot is. Ez biztosítja, hogy a job futtatása **akkor is sikerül**, ha a migráció valamiért még nem futott le. A `source` mezőben `'hardcoded-demo'` jelölésű ez az eset.

### Verified
- Forráskód-szinten **NULLA hardkódolt** `Alkotás utca 42` előfordulás a runtime kódban (`*.ts`/`*.tsx`/`*.js`/`*.sql` non-doc, non-migration fájlokban). A megmaradt 5 hivatkozás mind történeti rekord: CHANGELOG.md, 2 versioning/ entry, 1 marketing_values/ entry, és a v0.7.9 migráció ami a régi guard-clause-ban hivatkozik rá (`WHERE name = 'Alkotás utca 42.'`). Ezek a fix történetét dokumentálják, **nem futáskor használt értékek**.

## 2026-05-20 — v0.7.9 Demo prod DB migration + NDVI Lanczos3 upscale + Élhetőség módszertan + Budapest OSM fallback

### Fixed
- **`supabase/migrations/20260520_update_demo_building.sql`** (új migráció): a v0.7.8 a `seed.sql`-t frissítette, de a **production adatbázisban már létezett** a régi `Alkotás utca 42.` rekord a demo building UUID-n (a régi seed `ON CONFLICT DO NOTHING` viselkedéssel ment). Ez a migráció explicit `UPDATE buildings SET name/address/lat/lon/geocoded_at` a demo épület UUID-ján, csak ha a régi adat van benne (idempotens, kézi felülírást nem rontja). A `supabase db push` után az `urban_atlas_refresh` / `satellite_refresh` / `urban_refresh` / `env_refresh_green` jobok mostantól a **Gidófalvy Lajos utca 9.** rekordot fogják felhasználni, lat/lon expliciten kitöltve = geocoder hívás megszűnik.
- **`lib/ndvi-mosaic.ts` `renderHungaryNdviTiled`**: a v0.7.6 tiled-renderelés (4×2 GIBS WMS tile) blokkos képet adott a nagyobb felbontásokon (4096+, 8192+, 16384+) — a forrás MODIS 250 m natív felbontását GIBS **nearest-neighbor**-rel skálázta felfelé, így a "Brutális" tier ugyanúgy nézett ki mint a "Nagy" (~64 px-es MODIS-cellák voltak láthatóak). **Most:** master render egyetlen GIBS-hívással a MODIS-near-natív 2880×1160 pixelre, majd **`sharp` Lanczos3 upscale** a kért target W×H-ra. Eredmény: minden output sima, anti-aliased, profi képjavítási eljárással. Ami nem MODIS 250 m-en belül van, az _szándékosan_ nem látszik (nincs benne a forrásban) — de a kép már nem _ronda_, csak _részlet-limitált_.
- **`components/liveability-panel.tsx` radar viewBox**: a `0 0 300 300` viewBox levágta az oldalsó labelek végét — "Szolgáltatások" → "iltatások", "Biztonság" → "iztonság", "Egészségügy" → "Egés", "Oktatás" → "Okta". Új viewBox: `-80 -10 460 320` (160 px extra szélesség + 10 px felül + 20 px alul), `max-w-xs` → `max-w-md`. Most minden magyar dimenzió-cím beletartozik.

### Added
- **`components/liveability-panel.tsx` módszertan kibővítve** — eddig 3 általános sor volt, most:
  - 6 dimenziós módszertani lista (Zöld/Levegő 20%, Egészségügy 20%, Oktatás 15%, Kultúra 15%, Szolgáltatások 15%, Biztonság 15%) konkrét pontozási képletekkel (decay-távolságok, súlyok, alap-pontszámok)
  - **Adatforrások-szekció**: OSM Overpass API + Open-Meteo + BKK Futár GTFS — mind 100%-ban nyílt, kulcs nélkül
  - **Lekérdezve-szekció**: a `data.computedAt` időpontja kiírva magyar formátumban + cache/live jelzés + 30 napos frissítési kadencia
  - **Tudományos háttér-szekció**: EIU Liveability Index + Mercer Quality of Living módszertani referencia + Walk Score™ exponenciális decay
  - Új legenda-elem a radar-on: "Az Ön lakókörnyezete" (zöld) + "Budapest átlag (~60)" (sárga szaggatott)
- **`app/api/superadmin/jobs/run/route.ts` `budapest_import` OSM Overpass fallback**: a `opendata.budapest.hu` / `nyiltadat.budapest.hu` DNS-szinten halott (`ENOTFOUND` mindkét hostra), tehát a CKAN-pipeline nem indítható. Új viselkedés: ha mindhárom CKAN-bázis-URL elhasal, **automatikusan OSM Overpass-szel tölti fel a `budapest_trees` + `budapest_parks` táblákat** (queries: `node[natural=tree]` Budapest bbox-on, `way/relation[leisure=park]` Budapest bbox-on, 3-tükörös failover-rel a `kumi.systems` / `overpass-api.de` / `openstreetmap.fr` mirror-ok között). A `budapest_data_meta` jelzi a forrást: `osm-overpass:natural=tree` / `osm-overpass:leisure=park`.

## 2026-05-20 — v0.7.8 Demo building Nominatim-verifikált címre cserélve (Gidófalvy Lajos u. 9)

### Fixed
- A demo seed `Alkotás utca 42.` címét (XI. ker.) **lecseréltük a Nominatim-verifikált `Gidófalvy Lajos utca 9.` címre** (XIII. ker., 1134), OSM way `129080989`. A geocoder hetek óta `no_result`-tal hasalt el az Alkotás u. 42-re, mert az a cím / házszám-kombináció nem volt jól geokódolható Nominatim-mel. Az új cím vizuálisan ellenőrizve a https://nominatim.openstreetmap.org/ui/details.html?osmtype=W&osmid=129080989 oldalon.

### Changed
- **`supabase/seed.sql`** demo building INSERT mostantól populálja a `lat` (`47.5278845`), `lon` (`19.0705657`), `geocoded_at = now()` mezőket **expliciten** — így a satellite_refresh / urban_refresh / urban_atlas_refresh / env_refresh_green / urban-atlas jobok **soha többé nem indítanak Nominatim-hívást** a demo épületre. A geocoder a teljes pipeline legtörékenyebb függősége; expliciten beírt koordinátákkal a demo reprodukálható lesz akkor is, ha Nominatim down.
- INSERT-ből `ON CONFLICT (id) DO NOTHING` → `ON CONFLICT (id) DO UPDATE SET name/address/lat/lon/geocoded_at = EXCLUDED.*` (idempotens; meglévő demo-building seed esetén is updateli).
- `supabase/SEED_RUNNER.md`: dokumentált name + címfrissítés (XI. ker. → XIII. ker.).
- A seed `seed.sql` minden narratív hivatkozása frissítve (SZMSZ szöveg, parkolóhely-leírás, owner audit-log entries, RAISE NOTICE summary). Magyar névelő-szabály betartva: `az` → `a` mert `Gidófalvy` mássalhangzóval kezdődik.
- **21 forrásfájl** `47.4979`/`19.0402` fallback default-jai → `47.5278845`/`19.0705657`:
  - Backend route-ok: `app/api/environment/{air-quality,green,satellite,score,solar,urban,urban-atlas,weather,budapest-trees,diagnostics}/route.ts`, `app/api/air-quality/route.ts`, `app/api/transit/{debug,nearby,vehicles}/route.ts`, `app/api/superadmin/jobs/run/route.ts`
  - Frontend: `app/w/[buildingId]/kornyezet/page.tsx`, `components/air-quality-section.tsx`, `components/transport-panel.tsx`, `components/environment-page-client.tsx`, `components/superadmin-diagnostics.tsx`
- Diagnosztikai UI 4-tizedes coord-rövidítések (`latitude=47.49&longitude=19.04`) → `latitude=47.5279&longitude=19.0706` 4 preset URL-ben (Open-Meteo current + air-quality, PVGIS, titiler.xyz).

### Not changed (kifejezetten szándékosan)
- `app/api/air-quality/stations/route.ts`: a `47.4979,19.0402` itt fizikai légszennyezés-monitoring állomások koordinátája (`Budapest`, `Erzsébet tér`), nem fallback default. Ezek a valódi BME / EU EEA mérőállomások helyzetét képviselik, NEM cserélendők.
- `thesis_feature_prompts/01_levegominoseg_widget.md`: feature-prompt template, történelmi referencia, érintetlen marad.

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

