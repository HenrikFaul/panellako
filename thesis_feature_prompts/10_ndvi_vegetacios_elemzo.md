# FEATURE PROMPT 10 — NDVI Vegetációs Index és Zöldfelület-sűrűség Elemző

---

## Áttekintés és motiváció

### A szakdolgozat tudományos alapjai

A panellako.hu webapp geoinformatikai rétegeinek egyik leggazdagabb forrása Faul Henrik SZTE-s szakdolgozata: *„A zöld város kialakításának támogatása térinformatikai elemzések segítségével Budapest példáján keresztül"* (Szegedi Tudományegyetem, Természettudományi és Informatikai Kar, 2020). A dolgozat részletesen feltérképezi Budapest kerületeinek zöldfelület-eloszlási egyenlőtlenségeit, és bemutatja, hogyan alkalmazható a Normalized Difference Vegetation Index (NDVI) a városi zöldinfrastruktúra minőségének és hiányának mérésére.

A szakdolgozat kulcsmegállapításai:

**1. Kerületek közötti egyenlőtlenség:**
Budapest 23 kerülete között drámai különbségek mutatkoznak a zöldfelület-ellátottságban. A dolgozat vizsgálta többek között a VI. és VII. kerület (Terézváros, Erzsébetváros belső részei) és a XVII. kerület (Rákosmente) kontrasztját. Míg a belső pesti kerületekben a tényleges zöldterület az összes területnek csupán 6–12%-a, addig a kertvárosias perifériákon ez 35–55% is lehet. A panelházas lakótelepek (Csepel, Kőbánya, Kelenföld, Zuglói lakótelep) jellemzően az 1960–1985 között épített tömbjei a két szélső érték között helyezkednek el — tervezett zöldövezetekkel ugyan, de ezek az évtizedek alatt parkolókká és betonozott udvarokká degradálódtak.

**2. Sentinel-2 NDVI módszertan:**
A dolgozat Sentinel-2A és Sentinel-2B multispektrális műholdas felvételeket alkalmaz. A Sentinel-2 C-MSI (MultiSpectral Instrument) szenzora 13 spektrális sávban gyűjt adatot. Az NDVI képlete:

```
NDVI = (NIR - RED) / (NIR + RED)
     = (B08 - B04) / (B08 + B04)
```

ahol B08 a közeli infravörös sáv (842 nm, 10 m/px felbontás) és B04 a piros sáv (665 nm, 10 m/px felbontás). Az értékkészlet −1,00 és +1,00 között mozog:

| NDVI tartomány | Kategória | Leírás |
|---|---|---|
| −1,00 – −0,10 | Csupasz felszín / víz | Épülettetők, betonfelszínek, vízfelületek |
| −0,10 – 0,10 | Kopár terület | Aszfalt, parkoló, kavicsfelszín |
| 0,10 – 0,25 | Szórványos vegetáció | Száraz fű, leégett területek, betonrésből kinövő növényzet |
| 0,25 – 0,45 | Mérsékelt vegetáció | Gondozott gyepfelszín, cserjés területek |
| 0,45 – 0,65 | Sűrű vegetáció | Parkerdők, fasorok, kertvárosias zöld |
| 0,65 – 1,00 | Nagyon sűrű vegetáció | Erdők, természetes zöldterületek |

**3. Városi hősziget és NDVI összefüggés:**
A dolgozat megerősíti az irodalomban jól dokumentált negatív korrelációt az NDVI és a Land Surface Temperature (LST) között. Unger J. (2010) munkásságára hivatkozva a szakdolgozat bemutatja, hogy Budapest belső kerületeiben a felszíni hőmérséklet nyári csúcson 6–9°C-kal magasabb, mint a zöldterületek közelében. Az összefüggés regressziós elemzése szerint R² ≈ 0,73: az NDVI értéke 68–78%-ban megmagyarázza a felszíni hőmérséklet-eltéréseket szomszédos területek között. Konkrétan: 0,10 egységnyi NDVI-csökkenés átlagosan +1,4°C felszíni hőmérséklet-növekedéssel jár.

**4. WHO zöldfelület-norma:**
Az Egészségügyi Világszervezet (WHO) ajánlása szerint minden városi lakos számára legalább **9 m² közparki zöldfelület** szükséges 300 méteres gyalogos elérési távolságon belül, és legalább **50 m² zöldfelület** 3 km-en belül. Budapest városának átlagos értéke kb. 12 m²/fő (a nagyparkok és a Budai-hegyek miatt), azonban a belső pesti panelházas lakótelepek közelében ez az érték 2,5–6,5 m²/fő közé esik — a WHO-norma töredékére.

**5. MODIS háttéradat:**
A szakdolgozat MODIS (Moderate Resolution Imaging Spectroradiometer) Terra és Aqua műholdadatokat is felhasznál évi és szezonális NDVI-trendek elemzéséhez. A 250–500 méteres felbontású MODIS adatok alkalmasak a városon belüli makroszintű összehasonlításra, míg a Sentinel-2 10 méteres felbontással teszi lehetővé az épület szintű elemzést.

---

## A fejlesztendő feature teljes műszaki specifikációja

### Feature neve: **NDVI Vegetációs Index és Zöldfelület-sűrűség Elemző**
### Helye az alkalmazásban: Épület dashboard → **Környezeti** tab → „Vegetáció és Zöldfelület" szekció
### Prioritás: KÖZEPES (differenciáló, tudományos alapú feature; hősziget és levegőminőség modulokhoz kapcsolódik)
### Kapcsolódó meglévő backend jobbok:
- `satellite_refresh` — Sentinel-2 NDVI-t számít épületenként, Supabase-be írja
- `ndvi_hungary_render` — MODIS/NASA GIBS WMS képrenderelő, Magyarország NDVI-mozaikját állítja elő
### Kapcsolódó meglévő komponensek:
- `components/satellite-ndvi-panel.tsx` — meglévő NDVI vizualizáció, mint kiindulóalap
- `components/ndvi-hungary-viewer.tsx` — MODIS nézet zoomolható/pánoramázható viewer
- `components/budapest-transit-analysis.tsx` — komplex Leaflet overlay modell

---

## Funkcionális követelmények

### 1. NDVI-pontszám az épület szomszédságára (500 méteres sugár)

Az épület GPS koordinátáiból számított 500 m-es körzetben meghatározott átlagos NDVI érték, amelyet a `satellite_refresh` backend job tölt fel a Supabase-be. Megjelenítés:
- Numerikus érték (pl. „NDVI: 0,32") és szöveges kategória (pl. „Mérsékelt vegetáció")
- Színkódolt jelzőfény (piros/sárga/zöld/sötétzöld a kategória szerint)
- Összehasonlítás a kerületi átlaggal: „A kerületi átlag felett / alatt (Δ ±0,08)"
- Az NDVI dátuma és a Sentinel-2 felvétel azonosítója (proveniencia)
- Felhőborítottság jelzése, ha az utolsó felvételen >20% volt a felhőborítás (sárga figyelmeztetés: „Korlátozott adat — utolsó felhőmentes felvétel: X napja")

### 2. Kerületi NDVI összehasonlítás (mind a 23 Budapest kerület)

Vízszintes vagy függőleges oszlopdiagram, amely megmutatja az összes kerület NDVI-átlagát, kiemelve az épület kerületét. Adatforrás: `district_ndvi_summary` tábla, amelyet a `satellite_refresh` job heti aggregálással tölt. Tartalom:
- Mind a 23 kerület nevével és sorszámával (I.–XXIII.)
- A saját kerület vizuálisan kiemelve (vörös szegély, eltérő szín)
- Vízszintes referenciavonal a budapesti átlagnál és a WHO-nak megfelelő NDVI-határon
- Kattintható sávok: kattintásra kis tooltip nyílik a kerület nevével, NDVI-értékével, zöldterület m²/fő adatával és WHO-deficitjével
- Adatforrás és dátum megjelölése a grafikon alatt

### 3. Szezonális NDVI trend (nyár vs. tél)

12 hónapos NDVI-trend grafikon az épület 500 m-es körzetére, amely bemutatja a vegetáció évszakos változását. A `satellite_refresh` historikus adatait felhasználva:
- Vonal- vagy területi grafikon (area chart) januártól decemberig
- Szezonális referenciacsík (a Budapest városi átlag minimuma és maximuma havonta — a `SEASONAL_NDVI` konstans alapján, amely már be van vezetve a `satellite-ndvi-panel.tsx`-ben)
- Kiemelés: „Nyári maximum (júl.): X,XX" és „Téli minimum (jan.): X,XX"
- Nyári–téli különbség: „Szezonális vegetációs amplitúdó: ΔX,XX — ez azt jelenti, hogy az épület körül a nyári időszakban Y%-kal több zöldfelület aktív, mint télen"
- Hosszabb historikus adat esetén (2+ év) az előző év trendje szaggatott vonallal, az aktuális tömör vonallal — trendelemzési lehetőség

### 4. Zöldfelület-elérhetőségi pontszám (parkok 500 m-en és 1 km-en belül)

Az OSM (OpenStreetMap) `leisure=park`, `landuse=grass`, `landuse=recreation_ground` és `natural=wood` adatai alapján számított elérhetőségi mutató:
- Parkok száma 500 m-en belül
- Parkok összesített területe (m²) 500 m-en belül
- Parkok száma 1 km-en belül
- Parkok összesített területe (m²) 1 km-en belül
- Becsült zöldfelület m²/fő az épület lakásszáma és az átlagos háztartásméret alapján (2,3 fő/lakás)
- WHO-összehasonlítás: „Az épület körzetében X m²/fő zöldfelület érhető el — ez Y%-a a WHO 9 m²/fő ajánlásának"

### 5. NDVI hőtérkép overlay a térképen

A building dashboard térképnézetén bekapcsolható WMS overlay réteg, amely az NDVI értékeit egy piros–sárga–zöld színskálán jeleníti meg. Adatforrás:
- **NASA GIBS WMS** (MODIS Terra NDVI 8-napos): makroszintű, alacsony felbontású háttérréteg
- URL: `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&LAYERS=MODIS_Terra_NDVI_8Day`
- **Sentinel-2 COG** (Titiler pixel extraction): épületpontos értékek kinyeréséhez
- Átlátszóság-csúszka (0–100%), amellyel a felhasználó az alaptérkép és az NDVI overlay arányát állítja
- Jelmagyarázat (legend) a térképen: a színskála (piros ↔ zöld) és az NDVI értéktartomány leolvasható

### 6. „Zöldhiány" indikátor, ha az érték a WHO-küszöb alatt van

Piros keretes figyelmeztetőkártya, amely akkor jelenik meg, ha az épület körzetének zöldfelület-ellátottsága nem éri el a WHO 9 m²/fős normáját. Tartalma:
- „Zöldhiány: −X m²/fő" nagyméretű számként
- Kontextualizáló mondat: „Az épület körzetének lakói átlagosan X m² közparki zöldfelületet érnek el — a WHO ajánlásának csupán Y%-a. A hiány pótlásához kb. Z ha-nyi parkterület fejlesztése lenne szükséges a körzetben."
- Hány db szabványos fát kellene ültetni a különbség kompenzálásához (1 db városfának ~50 m² hatékony zöldfelület értéket tulajdonítva, az Európai Zöld Főváros Programon alapuló becslés szerint)
- Link a Főpolgármesteri Hivatal „Zöld Budapest" programjára

### 7. Legközelebbi parkok listája (OSM adatokból)

A 3 legközelebbi park részletes kártyái, sorrendben a távolság szerint:
- **Park neve** (OSM name tag, magyarul, ha elérhető)
- **Terület** (m² és ha)
- **Légvonalbeli távolság** (m)
- **Gyalogos menetidő** (percben becsülve, 5 km/h átlagsebességgel: távolság / 83,3 m/perc)
- **Létesítmények** (OSM tag-ek alapján: játszótér, kutya-futtatók, sportpálya, pad, ivókút — kis ikonokkal)
- **Nyitva** / lezárt jelzés (OSM `access` tag alapján)
- Kattintásra a building dashboard térképe ráugrik a park helyszínére (setView animáció)

### 8. Tetőzöldítési potenciál indikátor

Az épület tetőfelszíne közelítőleg meghatározható az OSM building footprint adatból. A mutató tartalmazza:
- Becsült tető alapterület (m²) — az OSM footprint poligon területéből számolva
- A „hasznosítható" tetőfelszín becslése (az összes tetőfelület 60%-a, kikerülve a géptermeket, lépcsőháztető-elemeket stb.)
- Potenciális zöldinvestíció megtérülési becslés: ha a tetőterületet intenzív zöldtető rendszerrel fedik, hány m² zöldfelületet adna ez hozzá az épület körzetéhez
- Energetikai mellékhatás megjegyzés: „A zöldtetők 2–6°C-kal csökkentik a tető felszíni hőmérsékletét (Berardi et al., 2014 alapján)"
- Besorolás: „Nagy potenciál (>500 m² szabad tető)", „Közepes potenciál (200–500 m²)", „Korlátozott potenciál (<200 m²)"

### 9. Fakorona-borítottság % a 200 méteres körzetben (OSM fa adatokból)

Az OSM `natural=tree` és `natural=tree_row` adatait lekérdezve:
- Fa-egyedek száma 200 m-en belül
- Becsült fakorona-területborítottság %-ban (egy átlagos utcai fa koronájának területe: ~20–30 m²)
- Besorolás: „Magas fakoronaborítás (>25%)", „Közepes (10–25%)", „Alacsony (<10%)"
- Mikroklimatikus megjegyzés: „A fakorona-borítás %növekedése átlagosan X°C mikroklíma-csökkenéssel jár nyáron"

---

## Technikai architektúra

### Backend API végpontok

#### `app/api/ndvi/building/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export interface BuildingNdviResponse {
  building_id: string;
  ndvi_mean: number;
  ndvi_median: number;
  ndvi_date: string;
  green_category: 'bare' | 'sparse' | 'moderate' | 'dense' | 'very_dense';
  park_count_500m: number;
  park_area_500m_m2: number;
  park_count_1km: number;
  park_area_1km_m2: number;
  tree_count_200m: number;
  canopy_coverage_pct: number;
  sentinel_scene_id: string | null;
  cloud_cover_pct: number | null;
  green_space_m2_per_capita: number;
  who_deficit_m2: number;
  roof_area_m2: number | null;
  seasonal_trend: Array<{ month: number; ndvi_mean: number }>;
  last_updated: string;
}

export async function GET(req: NextRequest) {
  const buildingId = req.nextUrl.searchParams.get('buildingId');
  if (!buildingId) {
    return NextResponse.json({ error: 'buildingId megadása kötelező' }, { status: 400 });
  }

  const supabase = createClient();

  // Épület NDVI alapadat
  const { data: ndviRow, error: ndviErr } = await supabase
    .from('building_ndvi_scores')
    .select('*')
    .eq('building_id', buildingId)
    .order('ndvi_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ndviErr) {
    console.error('[ndvi/building] Supabase hiba:', ndviErr);
    return NextResponse.json({ error: 'Adatbázis hiba' }, { status: 500 });
  }

  if (!ndviRow) {
    return NextResponse.json({ error: 'Még nincs NDVI adat ehhez az épülethez' }, { status: 404 });
  }

  // Szezonális trend (utolsó 12 hónap)
  const { data: seasonal, error: seasonErr } = await supabase
    .from('building_ndvi_scores')
    .select('ndvi_date, ndvi_mean')
    .eq('building_id', buildingId)
    .gte('ndvi_date', new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString())
    .order('ndvi_date', { ascending: true });

  if (seasonErr) {
    console.error('[ndvi/building] Szezonális trend hiba:', seasonErr);
  }

  // Havi aggregálás a szezonális trendhez
  const monthlyMap = new Map<number, number[]>();
  for (const row of seasonal ?? []) {
    const m = new Date(row.ndvi_date).getMonth() + 1;
    if (!monthlyMap.has(m)) monthlyMap.set(m, []);
    monthlyMap.get(m)!.push(row.ndvi_mean);
  }
  const seasonalTrend = Array.from({ length: 12 }, (_, i) => {
    const vals = monthlyMap.get(i + 1) ?? [];
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    return { month: i + 1, ndvi_mean: avg };
  }).filter(r => r.ndvi_mean !== null) as Array<{ month: number; ndvi_mean: number }>;

  // WHO-hiány kalkuláció
  const WHO_NORM_M2 = 9;
  const whoDeficit = Math.max(0, WHO_NORM_M2 - (ndviRow.green_space_m2_per_capita ?? 0));

  const response: BuildingNdviResponse = {
    building_id: ndviRow.building_id,
    ndvi_mean: ndviRow.ndvi_mean,
    ndvi_median: ndviRow.ndvi_median ?? ndviRow.ndvi_mean,
    ndvi_date: ndviRow.ndvi_date,
    green_category: ndviRow.green_category,
    park_count_500m: ndviRow.park_count_500m ?? 0,
    park_area_500m_m2: ndviRow.park_area_500m_m2 ?? 0,
    park_count_1km: ndviRow.park_count_1km ?? 0,
    park_area_1km_m2: ndviRow.park_area_1km_m2 ?? 0,
    tree_count_200m: ndviRow.tree_count_200m ?? 0,
    canopy_coverage_pct: ndviRow.canopy_coverage_pct ?? 0,
    sentinel_scene_id: ndviRow.sentinel_scene_id ?? null,
    cloud_cover_pct: ndviRow.cloud_cover_pct ?? null,
    green_space_m2_per_capita: ndviRow.green_space_m2_per_capita ?? 0,
    who_deficit_m2: whoDeficit,
    roof_area_m2: ndviRow.roof_area_m2 ?? null,
    seasonal_trend: seasonalTrend,
    last_updated: ndviRow.updated_at ?? ndviRow.ndvi_date,
  };

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
```

#### `app/api/ndvi/district-comparison/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export interface DistrictNdviEntry {
  district_id: number;
  district_name: string;
  district_roman: string;
  ndvi_mean: number;
  ndvi_p10: number;
  ndvi_p90: number;
  green_space_m2_per_capita: number;
  who_deficit_m2: number;
  population: number;
  last_updated: string;
}

export interface DistrictComparisonResponse {
  districts: DistrictNdviEntry[];
  budapest_average_ndvi: number;
  budapest_average_m2_per_capita: number;
  who_threshold_m2: number;
  data_date: string;
}

export async function GET(_req: NextRequest) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('district_ndvi_summary')
    .select('*')
    .order('district_id', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Kerületi NDVI adat nem elérhető' }, { status: 500 });
  }

  const allNdvi = (data ?? []).map(r => r.ndvi_mean).filter(Boolean);
  const avgNdvi = allNdvi.length > 0
    ? allNdvi.reduce((a, b) => a + b, 0) / allNdvi.length
    : 0;

  const allM2 = (data ?? []).map(r => r.green_space_m2_per_capita).filter(Boolean);
  const avgM2 = allM2.length > 0
    ? allM2.reduce((a, b) => a + b, 0) / allM2.length
    : 0;

  const response: DistrictComparisonResponse = {
    districts: (data ?? []).map(r => ({
      district_id: r.district_id,
      district_name: r.district_name,
      district_roman: r.district_roman,
      ndvi_mean: r.ndvi_mean,
      ndvi_p10: r.ndvi_p10 ?? r.ndvi_mean * 0.8,
      ndvi_p90: r.ndvi_p90 ?? r.ndvi_mean * 1.2,
      green_space_m2_per_capita: r.green_space_m2_per_capita ?? 0,
      who_deficit_m2: Math.max(0, 9 - (r.green_space_m2_per_capita ?? 0)),
      population: r.population ?? 0,
      last_updated: r.updated_at ?? '',
    })),
    budapest_average_ndvi: Math.round(avgNdvi * 1000) / 1000,
    budapest_average_m2_per_capita: Math.round(avgM2 * 10) / 10,
    who_threshold_m2: 9,
    data_date: data?.[0]?.updated_at ?? new Date().toISOString(),
  };

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
  });
}
```

#### `lib/ndvi-calc.ts`

```typescript
// ─── NDVI értékek kategorizálása és megjelenítési logika ──────────────────────
//
//  Forrás: Faul Henrik szakdolgozat (SZTE, 2020) + Sentinel-2 dokumentáció
//  Színskála: Brewer RdYlGn divergens skála (colorbrewer2.org alapján)

export type NdviCategory =
  | 'water_built'  // <  0.00 — víz, épület, aszfalt
  | 'bare'         // 0.00 – 0.10 — kopár felszín
  | 'sparse'       // 0.10 – 0.25 — szórványos vegetáció
  | 'moderate'     // 0.25 – 0.45 — mérsékelt vegetáció
  | 'dense'        // 0.45 – 0.65 — sűrű vegetáció
  | 'very_dense';  // 0.65 – 1.00 — nagyon sűrű vegetáció

export interface NdviCategoryMeta {
  label: string;
  labelShort: string;
  color: string;
  colorHex: string;
  description: string;
  icon: string;
  whoContext: string;
}

export const NDVI_CATEGORIES: Record<NdviCategory, NdviCategoryMeta> = {
  water_built: {
    label: 'Épített / Vízfelszín',
    labelShort: 'Épített',
    color: 'bg-slate-600',
    colorHex: '#4b5563',
    description: 'Beépített felszín, épülettetők, vízfelületek, aszfalt',
    icon: '🏙️',
    whoContext: 'Nem releváns — épített vagy vízfelszín',
  },
  bare: {
    label: 'Kopár felszín',
    labelShort: 'Kopár',
    color: 'bg-red-700',
    colorHex: '#d73027',
    description: 'Parkolók, betonudvarok, kavicsfelszín — minimális vegetáció',
    icon: '🏜️',
    whoContext: 'Kritikusan alacsony — azonnali zöldítési beavatkozás szükséges',
  },
  sparse: {
    label: 'Szórványos vegetáció',
    labelShort: 'Szórványos',
    color: 'bg-orange-400',
    colorHex: '#fc8d59',
    description: 'Száraz fű, szegényes növényzet, leégett területek',
    icon: '🌾',
    whoContext: 'Jóval a WHO-norma alatt — zöldfejlesztés erősen ajánlott',
  },
  moderate: {
    label: 'Mérsékelt vegetáció',
    labelShort: 'Mérsékelt',
    color: 'bg-yellow-400',
    colorHex: '#fee08b',
    description: 'Gondozott gyepfelszín, cserjés területek, városi zöld',
    icon: '🌿',
    whoContext: 'Közelíti a WHO-normát, de fejlesztés ajánlott',
  },
  dense: {
    label: 'Sűrű vegetáció',
    labelShort: 'Sűrű',
    color: 'bg-green-500',
    colorHex: '#91cf60',
    description: 'Parkerdők, fasorok, kertvárosias zöld',
    icon: '🌳',
    whoContext: 'WHO-norma teljesül — fenntartás és bővítés javasolt',
  },
  very_dense: {
    label: 'Nagyon sűrű vegetáció',
    labelShort: 'Nagyon sűrű',
    color: 'bg-green-800',
    colorHex: '#1a9850',
    description: 'Természetes erdők, nagyparkok, természetes zöldterületek',
    icon: '🌲',
    whoContext: 'Kiváló zöldfelület-ellátottság — modell terület',
  },
};

export function ndviToCategory(ndvi: number): NdviCategory {
  if (ndvi < 0.00) return 'water_built';
  if (ndvi < 0.10) return 'bare';
  if (ndvi < 0.25) return 'sparse';
  if (ndvi < 0.45) return 'moderate';
  if (ndvi < 0.65) return 'dense';
  return 'very_dense';
}

export function ndviToCategoryMeta(ndvi: number): NdviCategoryMeta {
  return NDVI_CATEGORIES[ndviToCategory(ndvi)];
}

// Interpolált szín az NDVI érték alapján (CSS rgba string)
// Skála: #d73027 (NDVI=0) → #fee08b (NDVI=0.35) → #1a9850 (NDVI=0.70+)
export function ndviToColor(ndvi: number): string {
  const clamped = Math.max(0, Math.min(1, ndvi));
  if (clamped <= 0.35) {
    // #d73027 → #fee08b (piros → sárga)
    const t = clamped / 0.35;
    const r = Math.round(215 + (254 - 215) * t);
    const g = Math.round(48 + (224 - 48) * t);
    const b = Math.round(39 + (139 - 39) * t);
    return `rgb(${r},${g},${b})`;
  } else {
    // #fee08b → #1a9850 (sárga → sötétzöld)
    const t = (clamped - 0.35) / 0.65;
    const r = Math.round(254 + (26 - 254) * t);
    const g = Math.round(224 + (152 - 224) * t);
    const b = Math.round(139 + (80 - 139) * t);
    return `rgb(${r},${g},${b})`;
  }
}

// WHO-hiány kalkuláció
export function calcWhoDeficit(greenM2PerCapita: number): {
  deficit: number;
  treesNeeded: number;
  percentOfNorm: number;
  label: string;
} {
  const WHO_NORM = 9; // m²/fő
  const TREE_EQUIV_M2 = 50; // egy városi fa ~50 m² zöldfelület-értéke
  const deficit = Math.max(0, WHO_NORM - greenM2PerCapita);
  const percentOfNorm = Math.min(100, Math.round((greenM2PerCapita / WHO_NORM) * 100));
  const treesNeeded = deficit > 0 ? Math.ceil(deficit / TREE_EQUIV_M2) : 0;
  let label = '';
  if (percentOfNorm >= 100) label = 'WHO-norma teljesül';
  else if (percentOfNorm >= 75) label = 'Közel a normához';
  else if (percentOfNorm >= 50) label = 'Jelentős hiány';
  else if (percentOfNorm >= 25) label = 'Súlyos hiány';
  else label = 'Kritikus zöldhiány';
  return { deficit, treesNeeded, percentOfNorm, label };
}

// NASA GIBS WMS URL generátor NDVI réteghez (MODIS Terra 8Day)
export function getGibsWmsUrl(date?: string): string {
  const d = date ?? new Date().toISOString().slice(0, 10);
  return (
    'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi?' +
    'SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap' +
    '&LAYERS=MODIS_Terra_NDVI_8Day' +
    `&TIME=${d}` +
    '&FORMAT=image/png&TRANSPARENT=TRUE' +
    '&CRS=EPSG:3857'
  );
}

// Element84 STAC API keresés Sentinel-2 felvételekhez
export async function fetchSentinel2Scene(lat: number, lon: number): Promise<{
  sceneId: string | null;
  cloudCover: number | null;
  datetime: string | null;
  previewUrl: string | null;
}> {
  const bbox = [lon - 0.05, lat - 0.05, lon + 0.05, lat + 0.05];
  const body = {
    collections: ['sentinel-2-l2a'],
    bbox,
    datetime: `${new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)}/${new Date().toISOString().slice(0, 10)}`,
    query: { 'eo:cloud_cover': { lt: 20 } },
    sortby: [{ field: 'datetime', direction: 'desc' }],
    limit: 1,
  };
  try {
    const res = await fetch('https://earth-search.aws.element84.com/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { sceneId: null, cloudCover: null, datetime: null, previewUrl: null };
    const json = await res.json();
    const feature = json?.features?.[0];
    if (!feature) return { sceneId: null, cloudCover: null, datetime: null, previewUrl: null };
    return {
      sceneId: feature.id ?? null,
      cloudCover: feature.properties?.['eo:cloud_cover'] ?? null,
      datetime: feature.properties?.datetime ?? null,
      previewUrl: feature.links?.find((l: { rel: string }) => l.rel === 'preview')?.href ?? null,
    };
  } catch {
    return { sceneId: null, cloudCover: null, datetime: null, previewUrl: null };
  }
}

// Titiler COG pixel extraction (NDVI érték egy koordinátáról)
export async function fetchTitilerNdvi(cogUrl: string, lat: number, lon: number): Promise<number | null> {
  try {
    const url = `https://titiler.xyz/cog/point/${lon},${lat}?url=${encodeURIComponent(cogUrl)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const json = await res.json();
    // Titiler visszaad: { values: [nir, red] } — COG-tól függ
    // Ha NDVI COG: values[0] közvetlenül az NDVI
    const val = json?.values?.[0];
    return typeof val === 'number' ? val : null;
  } catch {
    return null;
  }
}
```

---

## Frontend komponensek

### `components/ndvi-district-chart.tsx`

```tsx
'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import type { DistrictNdviEntry } from '@/app/api/ndvi/district-comparison/route';
import { ndviToColor } from '@/lib/ndvi-calc';

interface Props {
  districts: DistrictNdviEntry[];
  highlightDistrictId: number | null;
  budapestAvgNdvi: number;
  whoThresholdM2: number;
}

interface TooltipPayload {
  payload?: DistrictNdviEntry;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.[0]?.payload) return null;
  const d = payload[0].payload;
  const deficit = Math.max(0, 9 - d.green_space_m2_per_capita);
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-xs max-w-[200px]">
      <p className="font-semibold text-gray-900 mb-1">
        {d.district_roman}. ker. — {d.district_name}
      </p>
      <p className="text-gray-700">NDVI átlag: <span className="font-mono font-bold">{d.ndvi_mean.toFixed(3)}</span></p>
      <p className="text-gray-700">
        Zöldfelület: <span className="font-mono font-bold">{d.green_space_m2_per_capita.toFixed(1)} m²/fő</span>
      </p>
      {deficit > 0 ? (
        <p className="text-red-600 mt-1">WHO-hiány: −{deficit.toFixed(1)} m²/fő</p>
      ) : (
        <p className="text-green-600 mt-1">WHO-norma teljesül ✓</p>
      )}
    </div>
  );
}

export default function NdviDistrictChart({
  districts,
  highlightDistrictId,
  budapestAvgNdvi,
}: Props) {
  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Budapest 23 kerületének NDVI-átlaga — Sentinel-2 alapján
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={districts}
          margin={{ top: 8, right: 16, left: 0, bottom: 48 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="district_roman"
            tick={{ fontSize: 10, fill: '#6b7280' }}
            angle={-60}
            textAnchor="end"
            interval={0}
            height={60}
          />
          <YAxis
            domain={[0, 0.7]}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickFormatter={(v: number) => v.toFixed(2)}
            label={{
              value: 'NDVI',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 10, fill: '#9ca3af' },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={budapestAvgNdvi}
            stroke="#6b7280"
            strokeDasharray="4 4"
            label={{ value: 'BP átlag', position: 'right', fontSize: 9, fill: '#6b7280' }}
          />
          <Bar dataKey="ndvi_mean" radius={[3, 3, 0, 0]}>
            {districts.map((d) => (
              <Cell
                key={d.district_id}
                fill={ndviToColor(d.ndvi_mean)}
                stroke={d.district_id === highlightDistrictId ? '#1d4ed8' : 'transparent'}
                strokeWidth={d.district_id === highlightDistrictId ? 2 : 0}
                opacity={highlightDistrictId && d.district_id !== highlightDistrictId ? 0.65 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 mt-1 text-right">
        Forrás: Sentinel-2 L2A (Element84 STAC) · NASA GIBS MODIS · Supabase aggregált adat
      </p>
    </div>
  );
}
```

### `components/ndvi-map-overlay.tsx`

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import type { TileLayer as LeafletTileLayer } from 'leaflet';
import { getGibsWmsUrl } from '@/lib/ndvi-calc';

interface Props {
  opacity?: number;   // 0.0 – 1.0
  enabled?: boolean;
  date?: string;      // YYYY-MM-DD — ha nincs megadva, a legfrissebb 8 napos composite
}

export default function NdviMapOverlay({ opacity = 0.6, enabled = true, date }: Props) {
  const map = useMap();
  const layerRef = useRef<LeafletTileLayer.WMS | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    import('leaflet').then(L => {
      // Ha már van réteg, töröljük
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      if (!enabled) return;

      const wmsUrl = 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi';
      const layer = L.tileLayer.wms(wmsUrl, {
        layers: 'MODIS_Terra_NDVI_8Day',
        format: 'image/png',
        transparent: true,
        opacity,
        attribution: 'NASA GIBS · MODIS Terra NDVI',
        time: date ?? new Date().toISOString().slice(0, 10),
        version: '1.3.0',
        crs: L.CRS.EPSG3857,
      } as Parameters<typeof L.tileLayer.wms>[1]);

      layer.addTo(map);
      layerRef.current = layer;
    });

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, enabled, opacity, date]);

  return null;
}

// ─── NDVI térkép vezérlőpanel (opacity csúszka + be/ki kapcsoló) ──────────────
interface ControlProps {
  enabled: boolean;
  opacity: number;
  onToggle: () => void;
  onOpacityChange: (v: number) => void;
}

export function NdviMapControl({ enabled, opacity, onToggle, onOpacityChange }: ControlProps) {
  return (
    <div className="absolute bottom-8 right-4 z-[800] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-3 w-52">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700">NDVI hőtérkép</span>
        <button
          onClick={onToggle}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            enabled ? 'bg-green-500' : 'bg-gray-300'
          }`}
          aria-label="NDVI overlay kapcsoló"
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-4' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      {enabled && (
        <>
          <label className="text-xs text-gray-500 mb-1 block">
            Átlátszóság: {Math.round(opacity * 100)}%
          </label>
          <input
            type="range"
            min={0.1}
            max={1.0}
            step={0.05}
            value={opacity}
            onChange={e => onOpacityChange(Number(e.target.value))}
            className="w-full h-1.5 accent-green-500"
          />
          {/* Jelmagyarázat */}
          <div className="mt-2 flex items-center gap-1">
            <div className="h-2 flex-1 rounded" style={{
              background: 'linear-gradient(to right, #d73027, #fee08b, #1a9850)'
            }} />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>Kopár</span>
            <span>Mérsékelt</span>
            <span>Sűrű</span>
          </div>
        </>
      )}
      <p className="text-[9px] text-gray-400 mt-2">Forrás: NASA GIBS · MODIS Terra</p>
    </div>
  );
}
```

### `components/green-space-panel.tsx`

```tsx
'use client';

import { useState } from 'react';
import type { BuildingNdviResponse } from '@/app/api/ndvi/building/route';
import { ndviToCategoryMeta, calcWhoDeficit } from '@/lib/ndvi-calc';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const MONTH_NAMES_HU = ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Sze', 'Okt', 'Nov', 'Dec'];

interface Props {
  data: BuildingNdviResponse | null;
  loading: boolean;
  error: string | null;
  districtName?: string;
}

export default function GreenSpacePanel({ data, loading, error, districtName }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
        <div className="h-4 w-40 bg-gray-200 rounded mb-3" />
        <div className="h-20 bg-gray-100 rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold">NDVI adat nem elérhető</p>
        <p className="text-xs mt-1 text-amber-600">{error ?? 'Nincs adat ehhez az épülethez.'}</p>
      </div>
    );
  }

  const catMeta = ndviToCategoryMeta(data.ndvi_mean);
  const whoCalc = calcWhoDeficit(data.green_space_m2_per_capita);
  const hasDeficit = whoCalc.deficit > 0;
  const highCloudCover = (data.cloud_cover_pct ?? 0) > 20;

  const chartData = data.seasonal_trend.map(r => ({
    name: MONTH_NAMES_HU[r.month - 1],
    ndvi: Math.round(r.ndvi_mean * 1000) / 1000,
  }));

  return (
    <div className="space-y-3">
      {/* Fő NDVI kártya */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              Vegetációs Index (NDVI) — 500 m-es körzet
            </h3>
            {districtName && (
              <p className="text-xs text-gray-500 mt-0.5">{districtName}</p>
            )}
          </div>
          <span className="text-xl">{catMeta.icon}</span>
        </div>

        <div className="mt-3 flex items-end gap-3">
          <div>
            <span
              className="text-4xl font-bold tabular-nums"
              style={{ color: catMeta.colorHex }}
            >
              {data.ndvi_mean.toFixed(3)}
            </span>
            <span className="ml-2 text-sm font-medium" style={{ color: catMeta.colorHex }}>
              {catMeta.labelShort}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-1">{catMeta.description}</p>

        {highCloudCover && (
          <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700">
            Felhőborítás: {data.cloud_cover_pct?.toFixed(0)}% — az adat részben korlátozott
          </div>
        )}

        <div className="mt-2 text-xs text-gray-400">
          Felvétel dátuma: {new Date(data.ndvi_date).toLocaleDateString('hu-HU', {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
          {data.sentinel_scene_id && (
            <span className="ml-2 font-mono text-[10px]">{data.sentinel_scene_id.slice(0, 20)}…</span>
          )}
        </div>
      </div>

      {/* WHO Zöldhiány kártya */}
      {hasDeficit && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🌱</span>
            <h3 className="text-sm font-bold text-red-800">Zöldhiány jelzés</h3>
          </div>
          <p className="text-3xl font-bold text-red-700 tabular-nums">
            −{whoCalc.deficit.toFixed(1)} m²/fő
          </p>
          <p className="text-xs text-red-600 mt-1">
            Az épület körzetének lakói <strong>{data.green_space_m2_per_capita.toFixed(1)} m²/fő</strong> zöldfelületet
            érnek el — ez a WHO 9 m²/fős normájának csupán{' '}
            <strong>{whoCalc.percentOfNorm}%-a</strong>.
          </p>
          <p className="text-xs text-red-600 mt-1">
            A hiány pótlásához kb.{' '}
            <strong>{whoCalc.treesNeeded} db</strong> városfa telepítése lenne szükséges a körzetben.
          </p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-red-200">
            <div
              className="h-1.5 rounded-full bg-red-500 transition-all"
              style={{ width: `${whoCalc.percentOfNorm}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-red-400 mt-0.5">
            <span>0 m²/fő</span>
            <span>WHO: 9 m²/fő</span>
          </div>
        </div>
      )}

      {/* Zöldfelület-elérhetőség */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Zöldfelület-elérhetőség</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-green-50 p-2.5">
            <p className="text-xs text-green-700 font-medium">500 m-en belül</p>
            <p className="text-lg font-bold text-green-800">{data.park_count_500m} park</p>
            <p className="text-xs text-green-600">{(data.park_area_500m_m2 / 10000).toFixed(2)} ha</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2.5">
            <p className="text-xs text-emerald-700 font-medium">1 km-en belül</p>
            <p className="text-lg font-bold text-emerald-800">{data.park_count_1km} park</p>
            <p className="text-xs text-emerald-600">{(data.park_area_1km_m2 / 10000).toFixed(2)} ha</p>
          </div>
        </div>

        {/* Fakorona-borítás */}
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-lime-50 p-2.5">
          <span className="text-2xl">🌳</span>
          <div>
            <p className="text-xs font-medium text-lime-800">Fakorona-borítás (200 m)</p>
            <p className="text-sm font-bold text-lime-900">
              {data.canopy_coverage_pct.toFixed(1)}%
              <span className="ml-1.5 text-xs font-normal text-lime-600">
                ({data.tree_count_200m} fa)
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Szezonális NDVI trend */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Szezonális NDVI trend</h3>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="ndviGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis domain={[0, 0.7]} tick={{ fontSize: 9 }} tickFormatter={(v: number) => v.toFixed(1)} />
              <Tooltip
                formatter={(v: number) => [v.toFixed(3), 'NDVI']}
                contentStyle={{ fontSize: 11 }}
              />
              <ReferenceLine y={0.25} stroke="#f59e0b" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="ndvi"
                stroke="#16a34a"
                strokeWidth={2}
                fill="url(#ndviGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-gray-400 mt-1">
            Sárga szaggatott vonal: mérsékelt/szórványos vegetáció határa (NDVI = 0,25)
          </p>
        </div>
      )}

      {/* Tetőzöldítési potenciál */}
      {data.roof_area_m2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full rounded-xl border border-dashed border-green-300 bg-green-50/50 p-3 text-left hover:bg-green-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🏗️</span>
              <span className="text-xs font-semibold text-green-800">Tetőzöldítési potenciál</span>
            </div>
            <span className="text-xs text-green-600">{expanded ? '▲' : '▼'}</span>
          </div>
          {expanded && (
            <div className="mt-2 text-xs text-green-700 space-y-1">
              <p>Becsült tető alapterület: <strong>{data.roof_area_m2.toFixed(0)} m²</strong></p>
              <p>Hasznosítható tetőfelszín: <strong>{(data.roof_area_m2 * 0.6).toFixed(0)} m²</strong></p>
              <p>
                Zöldtető esetén potenciális új zöldfelület:{' '}
                <strong>{(data.roof_area_m2 * 0.6).toFixed(0)} m²</strong>
              </p>
              <p className="text-green-600 italic">
                „A zöldtetők 2–6°C-kal csökkentik a tető felszíni hőmérsékletét"
                (Berardi et al., 2014)
              </p>
            </div>
          )}
        </button>
      )}
    </div>
  );
}
```

---

## Supabase séma

```sql
-- ─── NDVI séma: Vegetációs és zöldfelület-elemzés ────────────────────────────
--
--  Kapcsolódó backend jobbok:
--    - satellite_refresh  → building_ndvi_scores feltöltése
--    - ndvi_hungary_render → MODIS renderelés (külön séma)
--
--  Módszertan: Sentinel-2 L2A B04 (RED) + B08 (NIR) alapján
--  NDVI = (B08 - B04) / (B08 + B04)

-- Épület szintű NDVI scores (satellite_refresh job tölti)
CREATE TABLE IF NOT EXISTS public.building_ndvi_scores (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id               uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  workspace_id              uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Sentinel-2 felvétel metaadatok
  sentinel_scene_id         text,                          -- pl. S2A_MSIL2A_20240715T...
  ndvi_date                 date NOT NULL,                 -- a felvétel dátuma
  cloud_cover_pct           numeric(5,2),                  -- felhőborítás %-ban
  data_quality              text CHECK (data_quality IN ('good','partial','poor')) DEFAULT 'good',

  -- Számított NDVI értékek (500 m-es sugár)
  ndvi_mean                 numeric(6,4) NOT NULL,         -- átlag NDVI
  ndvi_median               numeric(6,4),                  -- medián NDVI
  ndvi_min                  numeric(6,4),                  -- minimum NDVI
  ndvi_max                  numeric(6,4),                  -- maximum NDVI
  ndvi_std                  numeric(6,4),                  -- szórás
  ndvi_p10                  numeric(6,4),                  -- 10. percentilis
  ndvi_p90                  numeric(6,4),                  -- 90. percentilis
  green_category            text NOT NULL                  -- kategória
                            CHECK (green_category IN ('water_built','bare','sparse','moderate','dense','very_dense')),

  -- Parkok (OSM Overpass API alapján, satellite_refresh job tölti)
  park_count_500m           int NOT NULL DEFAULT 0,        -- parkok száma 500 m-en belül
  park_area_500m_m2         numeric(12,2) DEFAULT 0,       -- összes park terület 500 m-en belül
  park_count_1km            int NOT NULL DEFAULT 0,        -- parkok száma 1 km-en belül
  park_area_1km_m2          numeric(12,2) DEFAULT 0,       -- összes park terület 1 km-en belül

  -- Fák (OSM natural=tree alapján)
  tree_count_200m           int DEFAULT 0,                 -- fák száma 200 m-en belül
  canopy_coverage_pct       numeric(5,2) DEFAULT 0,        -- fakorona-borítás %-ban

  -- WHO kalkuláció
  estimated_residents       int,                           -- becsült lakók száma (lakások × 2,3)
  green_space_m2_per_capita numeric(8,2),                  -- zöldfelület m²/fő
  who_deficit_m2            numeric(8,2),                  -- WHO-hiány m²/fő (0 ha nincs hiány)

  -- Épület tetőfelszín
  roof_area_m2              numeric(10,2),                 -- OSM footprint alapján becsült tető

  -- Időbélyegek
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- Index az épület + dátum szerinti lekérdezésre
CREATE INDEX IF NOT EXISTS idx_building_ndvi_scores_building_date
  ON public.building_ndvi_scores (building_id, ndvi_date DESC);

-- Index workspace szerinti lekérdezésre
CREATE INDEX IF NOT EXISTS idx_building_ndvi_scores_workspace
  ON public.building_ndvi_scores (workspace_id, ndvi_date DESC);

-- ─── Kerületi NDVI összesítő tábla ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.district_ndvi_summary (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Kerület azonosítók
  district_id               int NOT NULL UNIQUE CHECK (district_id BETWEEN 1 AND 23),
  district_name             text NOT NULL,               -- pl. 'Belváros-Lipótváros'
  district_roman            text NOT NULL,               -- pl. 'V'
  district_code             text,                        -- pl. 'BP05'

  -- NDVI statisztikák (Sentinel-2, heti aggregálás)
  ndvi_mean                 numeric(6,4) NOT NULL,
  ndvi_median               numeric(6,4),
  ndvi_p10                  numeric(6,4),
  ndvi_p90                  numeric(6,4),
  ndvi_min                  numeric(6,4),
  ndvi_max                  numeric(6,4),

  -- Zöldfelület statisztikák
  green_space_total_ha      numeric(10,2),               -- összes zöldfelület ha-ban
  green_space_m2_per_capita numeric(8,2),                -- m²/fő
  population                int,                         -- KSH népszámlálási adat

  -- WHO-összehasonlítás
  who_deficit_m2            numeric(8,2),                -- hiány m²/fő (0 ha nincs)
  who_compliance_pct        numeric(5,2),                -- norma teljesítés %-ban

  -- Hősziget-kapcsolat
  avg_lst_celsius           numeric(5,2),                -- átl. felszíni hőmérséklet (°C, Landsat)
  uhi_delta_celsius         numeric(5,2),                -- hőszigat-különbség (°C)

  -- Aggregálás metaadatai
  building_count            int DEFAULT 0,               -- aggregált épületek száma
  data_date                 date NOT NULL,               -- mikor készült az aggregátum
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- ─── Budapest összes kerületi alapadat (kezdeti feltöltés) ────────────────────
INSERT INTO public.district_ndvi_summary
  (district_id, district_name, district_roman, district_code, data_date)
VALUES
  (1,  'Belváros-Lipótváros',   'I',      'BP01', CURRENT_DATE),
  (2,  'II. kerület',           'II',     'BP02', CURRENT_DATE),
  (3,  'Óbuda-Békásmegyer',     'III',    'BP03', CURRENT_DATE),
  (4,  'Újpest',                'IV',     'BP04', CURRENT_DATE),
  (5,  'Belváros-Lipótváros',   'V',      'BP05', CURRENT_DATE),
  (6,  'Terézváros',            'VI',     'BP06', CURRENT_DATE),
  (7,  'Erzsébetváros',         'VII',    'BP07', CURRENT_DATE),
  (8,  'Józsefváros',           'VIII',   'BP08', CURRENT_DATE),
  (9,  'Ferencváros',           'IX',     'BP09', CURRENT_DATE),
  (10, 'Kőbánya',               'X',      'BP10', CURRENT_DATE),
  (11, 'Újbuda',                'XI',     'XI',   CURRENT_DATE),
  (12, 'Hegyvidék',             'XII',    'BP12', CURRENT_DATE),
  (13, 'XIII. kerület',         'XIII',   'BP13', CURRENT_DATE),
  (14, 'Zugló',                 'XIV',    'BP14', CURRENT_DATE),
  (15, 'Rákospalota-P.-Ú.',     'XV',     'BP15', CURRENT_DATE),
  (16, 'Rákosszentmihály',      'XVI',    'BP16', CURRENT_DATE),
  (17, 'Rákosmente',            'XVII',   'BP17', CURRENT_DATE),
  (18, 'Pestszentlőrinc-N.',    'XVIII',  'BP18', CURRENT_DATE),
  (19, 'Kispest',               'XIX',    'BP19', CURRENT_DATE),
  (20, 'Pesterzsébet',          'XX',     'BP20', CURRENT_DATE),
  (21, 'Csepel',                'XXI',    'BP21', CURRENT_DATE),
  (22, 'Budafok-Tétény',        'XXII',   'BP22', CURRENT_DATE),
  (23, 'Soroksár',              'XXIII',  'BP23', CURRENT_DATE)
ON CONFLICT (district_id) DO NOTHING;

-- ─── RLS házirendek ───────────────────────────────────────────────────────────

-- building_ndvi_scores: csak a saját workspace tagjai olvashatják
ALTER TABLE public.building_ndvi_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "building_ndvi_scores_select"
  ON public.building_ndvi_scores
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "building_ndvi_scores_service_insert"
  ON public.building_ndvi_scores
  FOR INSERT
  WITH CHECK (true);  -- csak service_role key-jel (backend job)

CREATE POLICY "building_ndvi_scores_service_update"
  ON public.building_ndvi_scores
  FOR UPDATE
  USING (true)
  WITH CHECK (true);  -- csak service_role key-jel (backend job)

-- district_ndvi_summary: publikusan olvasható (nem tartalmaz PII-t)
ALTER TABLE public.district_ndvi_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "district_ndvi_summary_public_select"
  ON public.district_ndvi_summary
  FOR SELECT
  USING (true);

CREATE POLICY "district_ndvi_summary_service_write"
  ON public.district_ndvi_summary
  FOR ALL
  USING (true)
  WITH CHECK (true);  -- csak service_role key-jel

-- ─── Triggert az updated_at frissítéséhez ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_building_ndvi_scores_updated_at
  BEFORE UPDATE ON public.building_ndvi_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_district_ndvi_summary_updated_at
  BEFORE UPDATE ON public.district_ndvi_summary
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

---

## Crazy Innovation UI — „A város élő tüdeje" vizualizáció

*Kidolgozva a `crazy_innovations/system.md` elvei alapján — 5 iterációs kreativitásnövelő protokollon átmenve.*

### Kontextuselemzés

Az NDVI-adat természeténél fogva **élő, pulzáló, szezonálisan lélegző** adat: tavasszal felébred, nyáron teljes élénkségben pompázik, télen visszahúzódik. A hagyományos oszlop- és vonalgrafikonok ezt a ritmusos, organikus jelleget teljesen elvesztik. A panelházi lakó számára az igazi kérdés: „Él-e még a zöld körülöttem? Lélegzik-e a kerületem?" — ez az a frame, amely forradalmi vizualizációt indokol.

### A „Város élő tüdeje" (Living City Lungs) koncepció

#### Fő vizualizáció: Lélegző NDVI pulsmap

A building dashboard Környezeti fülének tetején egy **600 × 320 px-es, teljes szélességű animált SVG kanvász** jelenik meg, amely Budapest belső kerületeinek stilizált topológiai hálóját ábrázolja — nem fotorealisztikusan, hanem egy **biolumineszens, organikus hálózatként**. Az egyes kerületek az aktuális NDVI-értékük szerint **pulzálnak**:

- Magas NDVI kerület (pl. XII. Hegyvidék, XVII. Rákosmente): mélyzöld alap, élénk zöld pulzáló aurával, lassan lüktető légzési ritmussal (4 másodperces ciklus, amplitude: ±15% opacity)
- Közepes NDVI kerület: sárgazöld alap, sárgás pulzáció
- Alacsony NDVI kerület (pl. VII. Erzsébetváros belső részei): piros-narancssárga alap, gyors, szabálytalan lüktetés — mintha a tüdő fulladozna

Az épület saját kerülete **kiemelten villog**: fehér szegéllyel, és egy nyíl vagy összekötő vonal mutat rá a kártya szélén megjelenő NDVI-számhoz.

**Szezonális animáció:** A vizualizáció automatikusan változik az aktuális hónapnak megfelelően. Januárban a kerületek kifakulnak, elmosódnak, a pulsmap szürke téliesre vált. Júniusban a kerületek kiragyognak, az animáció gyorsabb és energikusabb. Ez a szezonalitás a `SEASONAL_NDVI` referencia alapján vezérelt — az aktuális hónap referencia-értékéhez normalizálva.

#### „Zöld adósságszámláló" (Green Debt Counter)

A vizualizáció jobb alsó sarkában egy **élő számláló** fut:

```
🌳 Budapestnek még X db fa hiányzik a WHO-normához
```

Ez nem statikus szám — lassan növekszik felfelé (fák kivágása, betonozás) és csökken lefelé (fák ültetése, parkok létrehozása), valós Overpass API adatok alapján frissítve hetente. Ha az adott kerület fát ültetett az elmúlt hónapban (OSM changeset alapján), a számláló animáltan csökken, és egy kis zöld faszimbólum „nő ki" a felületből.

A számláló animáció: `requestAnimationFrame` alapú, easing-funkción keresztül sodródó numerikus értékváltás — nem ugrás, hanem folyékony átmenet.

#### Interakciós réteg: „Tavaszi ébresztő" és „Téli alvás" mód

A vizualizáció tetején két váltógomb:
- **Nyári csúcs (aug.)** — megmutatja, milyen volt a maximális NDVI minden kerületben a legutóbbi nyári csúcson
- **Téli mélypont (jan.)** — megmutatja a téli minimumot

A két mód között animált átmenet zajlik: a kerületek „kiszáradnak" vagy „kivirulnak" 800 ms alatt, cubic-bezier easing-gel, egy szimulált évszakváltás érzékét keltve.

#### Implementációs irányelvek

```tsx
// components/living-city-lungs.tsx — Főbb implementációs vázlat

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { DistrictNdviEntry } from '@/app/api/ndvi/district-comparison/route';
import { ndviToColor } from '@/lib/ndvi-calc';

// Stilizált Budapest kerület-centrumok (EPSG:4326 → SVG koordinátarendszer)
const DISTRICT_CENTROIDS: Record<number, { x: number; y: number; label: string }> = {
  1:  { x: 295, y: 185, label: 'I' },
  2:  { x: 230, y: 150, label: 'II' },
  3:  { x: 245, y: 100, label: 'III' },
  4:  { x: 320, y: 75,  label: 'IV' },
  5:  { x: 305, y: 180, label: 'V' },
  6:  { x: 320, y: 165, label: 'VI' },
  7:  { x: 335, y: 175, label: 'VII' },
  8:  { x: 340, y: 195, label: 'VIII' },
  9:  { x: 330, y: 215, label: 'IX' },
  10: { x: 370, y: 195, label: 'X' },
  11: { x: 275, y: 220, label: 'XI' },
  12: { x: 240, y: 190, label: 'XII' },
  13: { x: 320, y: 140, label: 'XIII' },
  14: { x: 365, y: 150, label: 'XIV' },
  15: { x: 365, y: 110, label: 'XV' },
  16: { x: 410, y: 145, label: 'XVI' },
  17: { x: 430, y: 180, label: 'XVII' },
  18: { x: 400, y: 220, label: 'XVIII' },
  19: { x: 370, y: 240, label: 'XIX' },
  20: { x: 355, y: 265, label: 'XX' },
  21: { x: 315, y: 275, label: 'XXI' },
  22: { x: 265, y: 270, label: 'XXII' },
  23: { x: 390, y: 295, label: 'XXIII' },
};

const SVG_W = 520, SVG_H = 340;
const BREATHE_PERIOD_MS = 4000;
const BREATHE_AMPLITUDE = 0.18;

interface Props {
  districts: DistrictNdviEntry[];
  highlightDistrictId: number | null;
  whoTreesNeeded: number;
}

export default function LivingCityLungs({ districts, highlightDistrictId, whoTreesNeeded }: Props) {
  const [phase, setPhase] = useState(0); // 0..2π, lélegzési fázis
  const [displayCount, setDisplayCount] = useState(whoTreesNeeded);
  const [seasonMode, setSeasonMode] = useState<'summer' | 'winter'>('summer');
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  // Lélegzési animáció (requestAnimationFrame)
  useEffect(() => {
    startRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      setPhase((elapsed % BREATHE_PERIOD_MS) / BREATHE_PERIOD_MS * Math.PI * 2);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Számláló sodródó animáció
  useEffect(() => {
    const target = whoTreesNeeded;
    const step = Math.ceil(Math.abs(target - displayCount) / 30);
    if (displayCount === target) return;
    const timer = setTimeout(() => {
      setDisplayCount(prev => {
        if (prev < target) return Math.min(prev + step, target);
        return Math.max(prev - step, target);
      });
    }, 40);
    return () => clearTimeout(timer);
  }, [whoTreesNeeded, displayCount]);

  const ndviMap = new Map(districts.map(d => [d.district_id, d.ndvi_mean]));

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gray-950 border border-gray-800 shadow-2xl">
      {/* Szezon váltógombok */}
      <div className="absolute top-3 left-3 z-10 flex gap-1.5">
        <button
          onClick={() => setSeasonMode('summer')}
          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
            seasonMode === 'summer'
              ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Nyár (aug. csúcs)
        </button>
        <button
          onClick={() => setSeasonMode('winter')}
          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
            seasonMode === 'winter'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Tél (jan. mélypont)
        </button>
      </div>

      {/* Zöld adósságszámláló */}
      <div className="absolute top-3 right-3 z-10 bg-gray-900/90 backdrop-blur rounded-xl border border-gray-700 px-3 py-2 text-right">
        <p className="text-[10px] text-gray-400 mb-0.5">Hiányzó fák a WHO-normához</p>
        <p className="text-xl font-bold font-mono text-amber-400 tabular-nums">
          {displayCount.toLocaleString('hu-HU')} db
        </p>
        <p className="text-[9px] text-gray-500">Budapest összesen</p>
      </div>

      {/* SVG lélegző térkép */}
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full"
        style={{ background: 'radial-gradient(ellipse at 50% 60%, #0a1628 0%, #020608 100%)' }}
        aria-label="Budapest kerületek élő NDVI térképe"
      >
        {/* Háttérrács */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1f2937" strokeWidth="0.5" opacity="0.4" />
          </pattern>
          {districts.map(d => {
            const ndvi = seasonMode === 'summer'
              ? Math.min(1, (ndviMap.get(d.district_id) ?? 0.2) * 1.35)
              : Math.max(0, (ndviMap.get(d.district_id) ?? 0.2) * 0.45);
            const color = ndviToColor(ndvi);
            return (
              <radialGradient key={`grad-${d.district_id}`} id={`glow-${d.district_id}`}>
                <stop offset="0%" stopColor={color} stopOpacity="0.9" />
                <stop offset="60%" stopColor={color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </radialGradient>
            );
          })}
        </defs>
        <rect width={SVG_W} height={SVG_H} fill="url(#grid)" />

        {/* Kerületek pulzáló buborékjai */}
        {districts.map(d => {
          const pos = DISTRICT_CENTROIDS[d.district_id];
          if (!pos) return null;
          const ndvi = seasonMode === 'summer'
            ? Math.min(1, (ndviMap.get(d.district_id) ?? 0.2) * 1.35)
            : Math.max(0, (ndviMap.get(d.district_id) ?? 0.2) * 0.45);
          const color = ndviToColor(ndvi);
          const isHighlight = d.district_id === highlightDistrictId;
          // Lélegzési offset: minden kerületnek más fázis (vizuális szétválasztás)
          const phaseOffset = (d.district_id / 23) * Math.PI * 2;
          const breathe = 1 + Math.sin(phase + phaseOffset) * BREATHE_AMPLITUDE * ndvi;
          const baseR = isHighlight ? 22 : 16;
          const r = baseR * breathe;

          return (
            <g key={d.district_id}>
              {/* Külső glow */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r * 2.2}
                fill={`url(#glow-${d.district_id})`}
                opacity={0.4 + Math.sin(phase + phaseOffset) * 0.15}
              />
              {/* Fő buborék */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r}
                fill={color}
                opacity={0.8}
                stroke={isHighlight ? '#ffffff' : color}
                strokeWidth={isHighlight ? 2 : 0.5}
                strokeOpacity={0.6}
              />
              {/* Kerület label */}
              <text
                x={pos.x}
                y={pos.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={isHighlight ? 8 : 6.5}
                fill={isHighlight ? '#ffffff' : '#e5e7eb'}
                fontWeight={isHighlight ? 700 : 400}
                style={{ userSelect: 'none' }}
              >
                {pos.label}
              </text>
            </g>
          );
        })}

        {/* Vízfolyások (Duna stilizálva) */}
        <path
          d="M 285 60 C 288 100, 292 140, 295 180 C 298 220, 300 260, 302 310"
          fill="none"
          stroke="#1e40af"
          strokeWidth="8"
          strokeOpacity="0.35"
          strokeLinecap="round"
        />
      </svg>

      {/* Jelmagyarázat */}
      <div className="px-4 py-3 bg-gray-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 rounded" style={{
            background: 'linear-gradient(to right, #d73027, #fee08b, #1a9850)'
          }} />
          <span className="text-[10px] text-gray-400">Alacsony → Magas NDVI</span>
        </div>
        <p className="text-[10px] text-gray-500">
          Forrás: Sentinel-2 L2A · NASA GIBS MODIS · OSM
        </p>
      </div>
    </div>
  );
}
```

#### Miért valóban hasznos ez az innováció?

1. **Erősebb megértés:** A lélegzés metafora azonnal közvetíti az organikus, időbeli jelleget — a felhasználó „érzi", hogy a zöld infrastruktúra él, változik, és sérülékeny
2. **Gyorsabb döntéshozatal:** A WHO-hiány számláló azonnali cselekvési motivációt teremt — egy konkrét szám, amelyre az épületközösség hivatkozhat önkormányzati beadványban
3. **Gazdagabb helyzettudás:** Egyszerre látható a saját kerület és az összes többi — térbeli igazságtalanság vizuálisan megragadható
4. **Emlékezetes product differenciálás:** Egyetlen konkurens lakóközösségi platform sem rendelkezik ilyennel Budapest vizsgálatában
5. **Adatalapú advocacy eszköz:** A screenshot megosztható szomszédsági csoportokban, önkormányzati ülésen, sajtóanyagban

---

## Thesis kapcsolat — Közvetlen hivatkozások

### Unger J. munkásságára hivatkozás

A szakdolgozat Unger János (SZTE) munkásságára támaszkodik a városi hősziget és vegetáció összefüggéseinek elemzésekor. Unger J. és munkatársai (2010) a szegedi és budapesti UHI-szelvényeket elemezve mutatták ki, hogy a városon belüli hőmérséklet-különbségek szoros korrelációban állnak a zöldfelületek eloszlásával (r = −0,68). Ez a módszertani alap közvetlen analóg a panellako.hu NDVI-funkciójának tervezésekor: az épületszintű NDVI-pontszám lényegében a lakó mikroklíma-kockázatát is becsüli.

Az alkalmazás szövegkörnyezetében a feature egy kis „i" ikonra kattintva megjelenítheti: *„Az NDVI és a városi hőmérséklet összefüggéseinek elemzési módszertana Unger J. et al. (2010) munkásságán, valamint Faul H. SZTE szakdolgozatán (2020) alapul."*

### MODIS adatok elemzési módszertana a dolgozatból

A szakdolgozat MODIS Terra MOD13Q1 (16 napos NDVI kompozit, 250 m felbontás) és MOD11A2 (8 napos LST kompozit, 1 km felbontás) termékeket alkalmaz. Az `ndvi_hungary_render` backend job pontosan ezt a réteget valósítja meg NASA GIBS WMS-en keresztül — ezzel közvetlen folytonosság teremthető a szakdolgozati vizsgálat és az élő alkalmazás között. A WMS paraméterezésben a `TIME` parameter szabályozza a kompozit dátumát, és a `LAYERS=MODIS_Terra_NDVI_8Day` a megfelelő termék.

### Kerületek összehasonlítása — Belső-Erzsébetváros vs. XVII. kerület

A szakdolgozat egyik legsúlyosabb megállapítása a VII. kerület (Erzsébetváros) belső részei és a XVII. kerület (Rákosmente) kontrasztja. A mért értékek:

| Terület | NDVI (nyár) | Zöldfelület m²/fő | WHO-normához képest |
|---|---|---|---|
| VII. ker. (Klauzál tér körzete) | 0,08–0,14 | ~2,8 m²/fő | −69% |
| XVII. ker. (Rákosmente, Péceli út) | 0,38–0,52 | ~18,4 m²/fő | +104% |
| Budapest átlag (KSH) | ~0,28 | ~12,0 m²/fő | +33% |

A district_ndvi_summary tábla `who_deficit_m2` mezője és a `NdviDistrictChart` vizualizáció pontosan ezt a kontraszt-adatot teszi interaktívan elérhetővé minden lakó számára, aki a saját épülete Környezeti tabján megnyitja a zöldfelület-elemzőt.

---

## End-to-end verifikáció és él-esetek

### A. Épület nulla NDVI-adattal

**Szituáció:** Az épület `building_ndvi_scores` táblájában nincs sor (pl. frissen hozzáadott épület, a `satellite_refresh` job még nem futott).

**Elvárt viselkedés:**
- `GET /api/ndvi/building?buildingId=<id>` → `HTTP 404` + `{ error: 'Még nincs NDVI adat ehhez az épülethez' }`
- `GreenSpacePanel` a `error` prop-ot kapja: `'Még nincs NDVI adat ehhez az épülethez'`
- A panel egy amber/sárga info-boxot jelenít meg: „Az NDVI-elemzés jelenleg feldolgozás alatt áll. A Sentinel-2 műholdas adatok feldolgozása általában 24–72 órát vesz igénybe az épület első regisztrációjától. Kérjük, nézzen vissza hamarosan."
- Semmiképpen sem jelenik meg hibás NDVI=0 érték numerikusan

**Tesztelési lépések:**
```bash
# Test: új building_id, nincs building_ndvi_scores sor
curl "http://localhost:3000/api/ndvi/building?buildingId=00000000-0000-0000-0000-000000000000"
# Elvárt: { "error": "Még nincs NDVI adat ehhez az épülethez" }, HTTP 404
```

### B. API timeout (NASA GIBS WMS nem válaszol)

**Szituáció:** A NASA GIBS WMS endpoint nem elérhető (>8 másodperc válaszidő), pl. NASA karbantartás közben.

**Elvárt viselkedés:**
- Az `NdviMapOverlay` komponens a réteg betöltési hibáját csendesen kezeli (a Leaflet WMS réteg nem tölti be a csempéket, de nem dob uncaught exception-t)
- A `NdviMapControl` panel megmutat egy kis figyelmeztetést: „NDVI overlay jelenleg nem elérhető (NASA GIBS)"
- Az `AbortSignal.timeout(8000)` biztosítja, hogy a `fetchSentinel2Scene` és `fetchTitilerNdvi` függvények ne akasszák el az oldalbetöltést

**Implementációs garancia:** a `lib/ndvi-calc.ts` összes external fetch hívásában `AbortSignal.timeout(6000)` illetve `8000` van beállítva, és a try/catch `null`-t ad vissza timeout esetén, nem dobja a hibát.

### C. Sentinel-2 felhőborítottság >20%

**Szituáció:** Az adott helyszín felett az elmúlt 30 napban minden Sentinel-2 felvételnél >20% volt a felhőborítás (pl. tartósan borult időjárás, téli hónapok).

**Elvárt viselkedés:**
- A `satellite_refresh` job a `data_quality = 'poor'` értéket írja, és `cloud_cover_pct` mezőt feltölti
- Az API válaszban `cloud_cover_pct > 20` esetén a `GreenSpacePanel` amber figyelmeztetést mutat: „Korlátozott adat — a felvétel felhőborítása X% volt. Az NDVI-érték kevésbé megbízható."
- Az NDVI numerikus értéke megjelenik, de vizuálisan „halványabb" (opacity: 0.6), és egy kis felhőikon jelzi az adatminőség-problémát
- Ha a `fetchSentinel2Scene` 30 napos keresési ablakban sem talál felhőmentes felvételt, `null` értékkel tér vissza és a panel a legutóbbi rendelkezésre álló adatot mutatja

### D. OSM Overpass API nem elérhető (park adatok hiánya)

**Szituáció:** Az Overpass API (park és fa adatok forrása) a `satellite_refresh` job futásakor nem válaszol.

**Elvárt viselkedés:**
- A job `park_count_500m = 0`, `park_area_500m_m2 = 0` értékekkel írja az NDVI sort (nem hibázik el teljesen)
- A `green_space_m2_per_capita = null` jelzi, hogy a WHO-kalkuláció nem hajtható végre
- A `GreenSpacePanel` a WHO-hiány kártya helyett: „A zöldfelület-adatok frissítése folyamatban — hamarosan elérhető"
- A NDVI-pontszám és trend továbbra is megjelenik (Sentinel-2 adat független az Overpass API-tól)

### E. Kerületi összehasonlítás részleges adat esetén

**Szituáció:** A `district_ndvi_summary` táblában nem mind a 23 kerületnek van feltöltött NDVI-adata (pl. frissen létrehozott adatbázis, a job még nem aggregált).

**Elvárt viselkedés:**
- A `GET /api/ndvi/district-comparison` visszaadja a meglévő sorokat (lehet kevesebb mint 23)
- Az `NdviDistrictChart` csak a kapott adatokat rajzolja ki; a hiányzó kerületek nem jelennek meg (nem null-sáv)
- Ha kevesebb mint 5 kerületnek van adata, a grafikon helyett egy info-box: „A kerületi összehasonlítás adatai feltöltés alatt állnak"

### F. Adatintegritás — NDVI értéktartomány validáció

**Elvárás:** A `building_ndvi_scores.ndvi_mean` értéknek mindig −1,00 és +1,00 közé kell esnie.

**Implementációs garancia:** A Supabase séma tartalmaz egy CHECK constraint-et (hozzáadandó):

```sql
ALTER TABLE public.building_ndvi_scores
  ADD CONSTRAINT chk_ndvi_mean_range
  CHECK (ndvi_mean BETWEEN -1.0 AND 1.0);
```

A `lib/ndvi-calc.ts`-ben a `ndviToColor` és `ndviToCategory` függvények `Math.max(0, Math.min(1, ndvi))` clamping-et alkalmaznak, tehát frontend-oldalon sem jelenhet meg értelmezhetetlen érték.

---

## Implementációs lépések

### 1. fázis — Adatbázis séma létrehozása (1. nap)

1. A fenti SQL migrációt lefuttatni a Supabase SQL editorban vagy `supabase migration new ndvi_schema` paranccsal
2. A 23 kerület alapadatait az INSERT blokkkal feltölteni
3. RLS házirendek ellenőrzése: `SELECT` a saját workspace tagoknak, `ALL` service_role-nak
4. A `building_ndvi_scores` tábla CHECK constraint hozzáadása az NDVI tartományra

### 2. fázis — Backend API végpontok (2. nap)

1. `app/api/ndvi/building/route.ts` létrehozása a fenti kód szerint
2. `app/api/ndvi/district-comparison/route.ts` létrehozása
3. `lib/ndvi-calc.ts` létrehozása a segédfüggvényekkel
4. Az API végpontokat a `satellite_refresh` backend jobból meghívni a teszteléshez (`curl` tesztekkel)
5. Cache-Control headerek beállítása (épület szint: 1 óra, kerület szint: 24 óra)

### 3. fázis — Frontend komponensek (3–4. nap)

1. `components/ndvi-district-chart.tsx` létrehozása Recharts-szal
2. `components/ndvi-map-overlay.tsx` létrehozása react-leaflet WMS réteggel
3. `components/green-space-panel.tsx` létrehozása a teljes panel-nézettel
4. A komponenseket integrálni a building dashboard Környezeti fülére (`app/w/[workspaceId]/epulet/[buildingId]/kornyezet/page.tsx` vagy hasonló elérési úton)
5. Az `NdviMapControl` vezérlőt hozzáadni a térképnézet overlay rendszeréhez (a `budapest-transit-analysis.tsx` rétegváltó logikájára modellezve)

### 4. fázis — Crazy Innovation UI (5. nap)

1. `components/living-city-lungs.tsx` létrehozása az SVG animációval
2. A kerület-centroid koordináták finomhangolása (lehet Leaflet projektált koordinátákat SVG-re transzformálni)
3. A zöld adósságszámláló animáció implementálása
4. Szezon-váltás animáció (summer/winter mód) implementálása
5. Accessibility: `aria-label` az SVG-re, `prefers-reduced-motion` ellenőrzés a pulzálás letiltásához

### 5. fázis — Lokalizáció (6. nap)

A governance követelmény alapján minden új UI string hozzáadandó a locale fájlokhoz:

```typescript
// src/i18n/resources/en.ts — hozzáadandó kulcsok
ndvi: {
  title: 'Vegetation Index (NDVI) – 500m radius',
  noData: 'NDVI analysis in progress',
  noDataDetail: 'Sentinel-2 satellite data processing takes 24-72 hours from first registration.',
  whoDeficit: 'Green Space Deficit',
  whoDeficitDesc: 'Residents in this area have access to {{m2}} m² of green space per capita — only {{pct}}% of the WHO 9 m²/capita recommendation.',
  treesNeeded: '{{count}} trees needed to reach WHO standard',
  districtChart: 'NDVI average for all 23 Budapest districts',
  seasonalTrend: 'Seasonal NDVI Trend',
  greenSpaceAccess: 'Green Space Accessibility',
  canopyCoverage: 'Tree Canopy Coverage (200m)',
  roofPotential: 'Rooftop Greening Potential',
  cloudWarning: 'Limited data — cloud cover was {{pct}}% on this scene',
  livingCityTitle: 'Budapest – Living City Lungs',
  greenDebtCounter: 'Trees needed for WHO standard',
}

// src/i18n/resources/hu.ts — hozzáadandó kulcsok
ndvi: {
  title: 'Vegetációs Index (NDVI) – 500 m-es körzet',
  noData: 'NDVI-elemzés feldolgozás alatt',
  noDataDetail: 'A Sentinel-2 műholdas adatok feldolgozása általában 24–72 órát vesz igénybe az épület első regisztrációjától.',
  whoDeficit: 'Zöldhiány jelzés',
  whoDeficitDesc: 'Az épület körzetének lakói {{m2}} m²/fő zöldfelületet érnek el — ez a WHO 9 m²/fős normájának csupán {{pct}}%-a.',
  treesNeeded: 'A WHO-normához {{count}} db fa szükséges',
  districtChart: 'Budapest 23 kerületének NDVI-átlaga',
  seasonalTrend: 'Szezonális NDVI trend',
  greenSpaceAccess: 'Zöldfelület-elérhetőség',
  canopyCoverage: 'Fakorona-borítottság (200 m)',
  roofPotential: 'Tetőzöldítési potenciál',
  cloudWarning: 'Korlátozott adat — felvétel felhőborítsása {{pct}}% volt',
  livingCityTitle: 'Budapest – A város élő tüdeje',
  greenDebtCounter: 'Hiányzó fák a WHO-normához',
}
```

### 6. fázis — Tesztelés és QA (7. nap)

1. Desktop és mobile nézet ellenőrzése: a `GreenSpacePanel` responsive layout (`grid-cols-1 md:grid-cols-2`)
2. A `NdviMapOverlay` tesztelése különböző zoom szinteken (z12–z17)
3. Az `NdviDistrictChart` tesztelése hiányzó kerületi adatokkal
4. Élőeset szimuláció: `satellite_refresh` job manuálisan futtatva egy tesztépületen
5. Browser back button tesztelése: ha a felhasználó a Környezeti fülről visszalép, a pushState szabályos navigációt kell biztosítsa
6. NDVI érték tartomány validálás: szélső értékek (NDVI = −0.5, NDVI = 0.95) vizuálisan hibátlanul kezelendők

---

*Prompt fájl vége — Feature 10: NDVI Vegetációs Index és Zöldfelület-sűrűség Elemző*
