# FEATURE PROMPT 11 — Budapest 2030 Stratégiai Indikátorok és EU Zöld Főváros Nyomkövető Dashboard

## Áttekintés és motiváció (a szakdolgozat alapján)

### A szakdolgozat és a panellako.hu kapcsolata

A panellako.hu webapp elsősorban budapesti lakóközösségek digitális igazgatási és tájékoztatási platformja. Bár a platform magját a közös ügyek kezelése alkotja — közgyűlések, dokumentumok, pénzügyek, karbantartási bejelentések —, a platform valódi differenciáló értéke abban rejlik, hogy a lakóközösséget **városszintű összefüggésbe helyezi**. Egy panelházi lakó nemcsak az épületben él: az adott kerületben, az adott városban, az adott politikai és stratégiai keretrendszerben él. Ennek a szintnek a megjelenítése — a lakó és a városi jövő kapcsolata — az a layer, amelyet egyetlen más hazai lakóközösségi alkalmazás sem nyújt.

A csatolt geoinformatikai szakdolgozat (SZTE, Természettudományi és Informatikai Kar, 2020) — „A zöld város kialakításának támogatása térinformatikai elemzések segítségével Budapest példáján keresztül" — teljes fejezetet szentel a **Budapest 2030 városfejlesztési stratégiának** és az **EU Zöld Főváros (European Green Capital) díjpályázatának**. A szakdolgozat egyértelműen megmutatja, hogy ezek a stratégiai keretek nem elméleti absztrakciók: konkrét mérhetőségi mutatókban fejeződnek ki, és ezek a mutatók **kerület-szintig lebontva, GIS-alapon elemezhetők**. Pontosan ezt az elemzési logikát kell a panellako.hu feature-be visszaépíteni: nem városszintű átlagot mutatunk, hanem azt, hogy az adott épület adott kerülete **hogyan áll a 11 EU Zöld Főváros-indikátor mindegyikén**, és hogyan viszonyul ez a saját 2030-as céljához.

### A Budapest 2030 stratégia öt pillére

A szakdolgozat részletesen bemutatja Budapest Főváros 2020-ban megújított Integrált Városfejlesztési Stratégiáját, amelynek céldokumentuma a **Budapest 2030** névre hallgató hosszú távú városfejlesztési stratégia. Az öt fő pillér:

1. **Élhető Budapest** — Lakhatás, közterületek, kereskedelmi és szolgáltatási hálózat fejlesztése, lakóközösségek életminőség-javítása. Közvetlen kapcsolat a panellako.hu felhasználóival: a panelfelújítási program, a lakókörnyezet fejlesztése, az épületek energetikai korszerűsítése mind ebbe a pillérbe esik.

2. **Zöld Budapest** — Zöldfelületek bővítése, zöldhálózat fejlesztése, biodiverzitás megőrzése, klímaadaptáció. A szakdolgozat NDVI-alapú zöldfelület-elemzése közvetlenül ide kapcsolódik: a szakdolgozat kimutatta, hogy a belső kerületek zöldfelület-ellátottsága drámaian elmarad a WHO ajánlásától.

3. **Dinamikus Budapest** — Gazdaságfejlesztés, innovációs ökoszisztéma, munkahelyek vonzása, smart city infrastruktúra. Az EU Zöld Főváros kritérium „ökoinnovációs foglalkoztatás" mutatója ebbe a pillérbe illeszkedik.

4. **Gondoskodó Budapest** — Szociális biztonság, egészségügyi ellátás, befogadó közösségek, demográfiai kihívások kezelése. A levegőminőség egészségügyi következményei és a zaj általi egészségkárosodás ebben a pillérben jelennek meg városstratégiai szinten.

5. **Okos Budapest** — Digitalizáció, adatvezérelt városirányítás, e-közigazgatás, smart infrastruktúra, nyílt adatok. A panellako.hu mint platform maga is az „Okos Budapest" pillérébe illeszkedik: egy olyan eszköz, amely segíti a lakóközösségeket az adatvezérelt döntéshozatalban.

### Az EU Zöld Főváros díj 11 indikátorkategóriája

Az Európai Zöld Főváros díjat (European Green Capital Award) az Európai Bizottság ítéli oda évente egy-egy európai városnak, amely kiemelkedő teljesítményt nyújt a fenntartható városi fejlődés területén. Budapest aktívan pályázik erre a díjra. A 11 értékelési kritérium:

| # | Kategória (HU) | Kategória (EN) | Mért dimenzió |
|---|----------------|----------------|---------------|
| 1 | Levegőminőség | Air Quality | PM2.5, PM10, NO₂, O₃ napi és éves átlagok |
| 2 | Zajszennyezés | Noise | % lakosság >55 dB(A) Lden és >50 dB(A) Lnight |
| 3 | Hulladékgazdálkodás | Waste | Újrahasznosítási arány %, lerakóra kerülő % |
| 4 | Természet és biodiverzitás | Nature & Biodiversity | m²/fő zöldfelület, Natura 2000 területarány |
| 5 | Vízgazdálkodás | Water | L/fő/nap fogyasztás, szennyvíztisztítási arány % |
| 6 | Ökoinnovációs foglalkoztatás | Eco-innovation | Zöld munkahelyek száma, zöld startup ökoszisztéma |
| 7 | Helyi közlekedés | Local Transport | Tömegközlekedési modal share %, kerékpáros modal share % |
| 8 | CO₂-kibocsátás | CO₂ Emissions | Ton CO₂/fő/év, trend 2005-hez képest |
| 9 | Energiagazdálkodás | Energy | Megújuló energia arány %, energiafogyasztás/fő |
| 10 | Területhasználat | Land Use | Beépített terület %, barnamezős fejlesztések aránya |
| 11 | Irányítás és polgári részvétel | Governance | Helyi környezeti stratégiák, participáció, ISO 14001 |

A szakdolgozat részletesen elemzi, hogy ezen kritériumok hogyan mérhetők GIS-adatokkal, és Budapest egyes kerületei hogyan teljesítenek az egyes dimenziókban. A Feature 11 feladata: ezeket az elemzési eredményeket a panellako.hu felhasználóinak emészthetővé, relevánsá és cselekvés-orientálttá tenni.

### Miért fontos ez a panelházi lakóknak?

A Budapest 2030 stratégia és az EU Zöld Főváros indikátorok nemcsak városvezetői absztrakciók. Közvetlen hatásuk van a panelházi lakók mindennapi életére:

- **Levegőminőség**: Egy panelláz melletti forgalmas út NO₂-szintje befolyásolja a lakók egészségét, az ablakok nyithatóságát, a balkoni tartózkodást.
- **Zöldfelület**: A legközelebbi park elérhetősége és mérete befolyásolja a gyerekek és idősek szabadtéri aktivitását.
- **Közlekedés**: A tömegközlekedési ellátottság szintje meghatározza, hogy az épület lakói mennyire tudnak autó nélkül élni.
- **Zajszennyezés**: Az éjszakai zajszint közvetlenül befolyásolja az alvásminőséget és a kardiovaszkuláris kockázatokat.
- **CO₂**: A lakók egyéni döntései (közlekedési mód, energiafogyasztás, hulladék) összesítve épület- és kerületszintű CO₂-lábnyomot alkotnak — és ez mérhető.
- **Energiagazdálkodás**: Budapest 2030 panelfelújítási programja (KEHOP, GINOP, hőszigetelési pályázatok) közvetlenül az „Energia" indikátor javítását szolgálja.

---

## A fejlesztendő feature teljes műszaki specifikációja

### Feature neve: **Budapest 2030 Stratégiai Indikátorok és EU Zöld Főváros Nyomkövető Dashboard**
### Rövid neve kódban: `Budapest2030Dashboard` / `budapest-2030`
### Helye az alkalmazásban: Workspace dashboard → „Város" tab (dedikált főoldal), route: `/w/:workspaceId/varos`
### Prioritás: KÖZEPES-MAGAS (szakdolgozat-alapú, stratégiai kontextus, differenciáló, közösségi értéket erősítő)
### Kapcsolódó feature-ök: Feature 01 (levegőminőség), Feature 02 (Zöld Épület Pontszám), Feature 07 (közlekedés-zaj), Feature 08 (tömegközlekedés)

---

## Funkcionális követelmények

### 3.1 EU Zöld Főváros 11 Indikátor-kártyák

A dashboard fő blokkja 11 db egyenlő méretű indikátorkártyából áll, mindegyik azonos struktúrával, de saját adattal és vizualizációs hangsúllyal. Minden kártya tartalmazza:

**3.1.1 Budapesti jelenlegi státusz (good/moderate/poor)**

Minden kártyán egy `StatusBadge` komponens jelenik meg, amely a Budapest jelenlegi, legfrissebb publikus adatokon alapuló értékelését mutatja:
- `JÓ` (zöld, #22c55e) — Budapest teljesítménye megfelel vagy közelíti az EU Zöld Főváros küszöbértékét
- `KÖZEPES` (sárga, #eab308) — közepes teljesítmény, javuló trend esetén még elérhető a 2030-as cél
- `KRITIKUS` (piros, #ef4444) — Budapest elmarad az elvárástól, sürgős beavatkozás szükséges

**3.1.2 Historikus trend (javuló / stabil / romló)**

Minden kártyán egy mini sparkline grafikon (5-pont-es Recharts `LineChart`, 120×40px) mutatja a 2015–2023 közötti éves értékeket. A trend iránya egy animated nyíl ikonnal is jelzett (`TrendingUp`, `TrendingDown`, `Minus` a Lucide React könyvtárból).

**3.1.3 Kerület-szintű összehasonlítás**

Minden indikátoron az épület kerületének értéke összehasonlításra kerül Budapest átlagával. A kártya alján egy kis horizontális bar: bal oldal = kerület értéke, jobb oldal = budapesti átlag. A felhasználó azonnal látja, hogy az ő kerülete jobb, rosszabb vagy átlagos-e.

**3.1.4 Resident Action — mit tud tenni a lakó?**

Minden kártyán egy összecsukható `ActionPanel` tartalmaz 2-3 konkrét, épületszintű és személyes cselekvési javaslatot. Például a „Helyi közlekedés" indikátornál: „Válasszon tömegközlekedést autó helyett a napi ingázáshoz", „Igényeljen MOL Bubi bérletet 40%-os kerületi kedvezménnyel". Ezek nem általános zöld tanácsok — az épület konkrét kerületéhez és közlekedési hozzáférhetőségéhez szabottak.

---

### 3.2 Budapest 2030 Pillér-haladásmérő

Az öt pillér mindegyikéhez egy komplex `PillarProgressCard` komponens tartozik, amely:

- A pillér nevét és ikonját mutatja
- A pillérhez tartozó kulcscélok listáját (3-5 alcél)
- Minden alcélnál egy progressbar (0–100%) a 2030-as cél arányos teljesítettségét mutatva
- A legutolsó frissítés forrását (pl. „Budapest Főváros Éves Zöldjelentés 2023")
- Egy `CollapsedGoalList` komponenst, amely kibontva a teljes alcél-listát megmutatja mérőszámokkal

**Pillér adatstruktúra:**

```typescript
interface Budapest2030Pillar {
  id: 'elheto' | 'zold' | 'dinamikus' | 'gondoskodo' | 'okos';
  nameHu: string;
  icon: string; // Lucide icon name
  colorHex: string;
  goals: Budapest2030Goal[];
}

interface Budapest2030Goal {
  id: string;
  descriptionHu: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  baselineYear: number;
  targetYear: 2030;
  progressPercent: number; // computed: (currentValue - baselineValue) / (targetValue - baselineValue) * 100
  sourceUrl: string;
}
```

---

### 3.3 Kerület-rangsor minden indikátoron

A `DistrictRankingPanel` komponens egy 23 kerületes ranglistát jelenít meg minden indikátorra, ahol:

- Az épület kerülete kiemelve jelenik meg (arany keret, automatikus scroll)
- A kerületek 1–23 rangsorban szerepelnek (1 = legjobb teljesítmény)
- Egy mini horizontális sparkline mutatja az adott kerület 3 éves trendjét
- A felhasználó kerülete és az 1. helyezett kerület különbségét egy `Δ gap` érték mutatja
- Szűrhető a 11 indikátor között dropdown-nal

A kerületszintű adatok statikus adatfájlból töltődnek (`lib/district-indicator-data.ts`), amelyet éves frissítési ciklus szerint karbantartunk.

---

### 3.4 Személyes hozzájárulás kalkulátor

A `PersonalImpactCalculator` komponens interaktív slider-alapú kalkulátor, amely kiszámolja, hogy a lakó napi döntései hogyan járulnak hozzá Budapest városszintű indikátoraihoz:

**Sliders:**

| Slider neve | Tartomány | Egység | Kapcsolódó indikátor |
|-------------|-----------|--------|----------------------|
| Autóval megtett napi km | 0–80 | km/nap | CO₂, Helyi közlekedés |
| Tömegközlekedéssel megtett napi km | 0–60 | km/nap | Helyi közlekedés |
| Kerékpározással megtett napi km | 0–30 | km/nap | Helyi közlekedés, CO₂ |
| Napi vízfogyasztás | 50–300 | L/nap | Vízgazdálkodás |
| Évi hulladékból újrahasznosított | 0–100 | % | Hulladékgazdálkodás |
| Otthon megújuló energia arány | 0–100 | % | Energia |

**Output:**
- CO₂ megtakarítás tömegközlekedés vs. autó: `X kg CO₂/év`
- Kerékpározással megtakarított CO₂: `Y kg CO₂/év`
- Vízfogyasztás helyen a budapesti átlaghoz képest: `+/-Z %`
- Budapest 8 millió összlakosa × az én szintem = városszintű CO₂ különbség

A kalkulátor alapú ösztönzési logika a szakdolgozat által hivatkozott kutatásokra épül (kerékpározás UFP expozíció-csökkentési adatok, autó vs. tömegközlekedés CO₂ emissziós arányok).

---

### 3.5 Idősor vizualizáció — 2015→2030 célvonallal

A `IndicatorTimelineChart` komponens egy részletes Recharts `ComposedChart`, amely:

- X tengely: 2015–2030 (évek)
- Y tengely: az adott indikátor egysége
- Szilárd vonal (solid): 2015–2023 tényleges adat
- Szaggatott vonal (dashed): 2024–2030 Budapest tervezett trajektóriája
- Vízszintes referenciavonal: az EU Zöld Főváros küszöbérték
- Zöld sávozás: a küszöbérték feletti „biztonságos" zóna
- Piros sávozás: a küszöbérték alatti „kritikus" zóna
- Interaktív tooltip: hover-re az adott évre vonatkozó adat, forrás, és Budapest pozíciója az EU ranglistán

Minden 11 indikátorra egyedi skála és vizualizáció tartozik, de ugyanaz a komponens rendereli mindet — az `indicatorConfig` objektum tartalmazza az egységet, a skálát, a küszöbértéket és a trend irányát (alacsonyabb jobb vs. magasabb jobb).

---

### 3.6 EU-főváros összehasonlítás — RadarChart

A `CityComparisonRadar` komponens Recharts `RadarChart`-tal jeleníti meg Budapest helyzetét az összehasonlítható EU városokhoz képest a mind a 11 indikátoron:

**Összehasonlított városok:**
- Budapest (kék vonal, kiemelt)
- Bécs / Wien (zöld vonal) — rendszeres EU Zöld Főváros díjas
- Prága / Praha (narancssárga)
- Varsó / Warszawa (lila)
- Pozsony / Bratislava (szürke)

Az adatok normalizálva jelennek meg (0–100-as skálán a legjobb városhoz viszonyítva), hogy a különböző mértékegységek összehasonlíthatók legyenek. A felhasználó toggleolhat az egyes városok között. Egy `InfoTooltip` minden indikátornál megmagyarázza, hogy az adott dimenzión mit jelent a magas/alacsony értéke.

---

## Technikai architektúra

### 4.1 API endpoint

```typescript
// app/api/budapest-indicators/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { budapest2030Data, districtIndicatorData } from '@/lib/budapest-2030-data';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const districtId = searchParams.get('district_id');
  const indicatorId = searchParams.get('indicator_id');

  // 1. Static base data (Budapest-szintű, évente frissített)
  const baseIndicators = budapest2030Data.indicators;

  // 2. Supabase: legfrissebb snapshot ha létezik
  const supabase = createClient();
  const { data: snapshots } = await supabase
    .from('budapest_indicator_snapshots')
    .select('*')
    .order('recorded_year', { ascending: false })
    .limit(11);

  // 3. District-level scores ha kért
  let districtScores = null;
  if (districtId) {
    const { data } = await supabase
      .from('district_indicator_scores')
      .select('*')
      .eq('district_id', districtId);
    districtScores = data;
  }

  // 4. Merge: Supabase felülírja a static értéket ha frissebb
  const mergedIndicators = baseIndicators.map((indicator) => {
    const dbSnapshot = snapshots?.find((s) => s.indicator_id === indicator.id);
    return {
      ...indicator,
      currentValue: dbSnapshot?.value ?? indicator.currentValue,
      dataSourceUrl: dbSnapshot?.source_url ?? indicator.dataSourceUrl,
      lastUpdated: dbSnapshot ? `${dbSnapshot.recorded_year}` : indicator.lastUpdated,
    };
  });

  return NextResponse.json({
    indicators: mergedIndicators,
    districtScores,
    pillars: budapest2030Data.pillars,
    cityComparison: budapest2030Data.cityComparison,
    generatedAt: new Date().toISOString(),
  });
}
```

---

### 4.2 Statikus adatkönyvtár — `lib/budapest-2030-data.ts`

```typescript
// lib/budapest-2030-data.ts
// Forrás: KSH, BKK Éves Jelentések, Budapest Főváros Zöldjelentés 2023,
// EEA (European Environment Agency) City Profiles, Eurostat Urban Audit

export interface BudapestIndicator {
  id: string;
  category: EUGreenCapitalCategory;
  nameHu: string;
  nameEn: string;
  currentValue: number;
  unit: string;
  target2030: number;
  euGreenCapitalThreshold: number;
  trend: 'improving' | 'stable' | 'worsening';
  trendDirection: 'lower-is-better' | 'higher-is-better';
  status: 'good' | 'moderate' | 'poor';
  color: string;
  dataSource: string;
  dataSourceUrl: string;
  lastUpdated: string;
  historicalSeries: IndicatorDataPoint[];
  residentActions: ResidentAction[];
  description: string;
}

export interface IndicatorDataPoint {
  year: number;
  value: number;
  isProjection?: boolean;
}

export interface ResidentAction {
  id: string;
  descriptionHu: string;
  impactLevel: 'high' | 'medium' | 'low';
  link?: string;
}

export type EUGreenCapitalCategory =
  | 'air-quality'
  | 'noise'
  | 'waste'
  | 'nature'
  | 'water'
  | 'eco-innovation'
  | 'local-transport'
  | 'co2'
  | 'energy'
  | 'land-use'
  | 'governance';

export const budapest2030Data = {
  indicators: [
    {
      id: 'air-quality',
      category: 'air-quality' as EUGreenCapitalCategory,
      nameHu: 'Levegőminőség',
      nameEn: 'Air Quality',
      currentValue: 23.4,
      unit: 'µg/m³ PM2.5 éves átlag',
      target2030: 10.0,
      euGreenCapitalThreshold: 10.0,
      trend: 'improving',
      trendDirection: 'lower-is-better',
      status: 'moderate',
      color: '#f97316',
      dataSource: 'OLM (Országos Légszennyezettségi Mérőhálózat), EEA AirBase',
      dataSourceUrl: 'https://www.levegominoseg.hu',
      lastUpdated: '2023',
      description:
        'A PM2.5 szálló por éves átlagkoncentrációja. Az EU 2021/1119 rendelet (Fit for 55) 2030-ra 10 µg/m³ határértéket ír elő. Budapest 2023-ban 23,4 µg/m³ átlagot mért, ami az EU határérték több mint kétszerese, de 2015-höz képest 18%-os javulás.',
      historicalSeries: [
        { year: 2015, value: 28.6 },
        { year: 2016, value: 27.9 },
        { year: 2017, value: 26.8 },
        { year: 2018, value: 26.1 },
        { year: 2019, value: 25.3 },
        { year: 2020, value: 22.8 },
        { year: 2021, value: 24.1 },
        { year: 2022, value: 23.9 },
        { year: 2023, value: 23.4 },
        { year: 2024, value: 22.5, isProjection: true },
        { year: 2025, value: 21.0, isProjection: true },
        { year: 2028, value: 16.0, isProjection: true },
        { year: 2030, value: 12.0, isProjection: true },
      ],
      residentActions: [
        {
          id: 'air-1',
          descriptionHu:
            'Kerülje a személyautó-használatot reggel 7–9 és délután 16–18 között — ez a csúcsidőszak, amikor a forgalmi NO₂ szint a legmagasabb.',
          impactLevel: 'high',
        },
        {
          id: 'air-2',
          descriptionHu:
            'Ne égessen hulladékot, kerti nyesedéket vagy PVC-t a közös udvaron vagy erkélyen — ez lokálisan kritikus PM2.5 csúcsot okoz.',
          impactLevel: 'medium',
        },
        {
          id: 'air-3',
          descriptionHu:
            'Ha légzőszervi betegségben szenved, telepítsen HEPA szűrős légszűrőt az otthonában — az OLM adatok alapján a belső levegő is szennyezhető.',
          impactLevel: 'medium',
          link: 'https://www.levegominoseg.hu/egeszseg',
        },
      ],
    },
    {
      id: 'noise',
      category: 'noise' as EUGreenCapitalCategory,
      nameHu: 'Zajszennyezés',
      nameEn: 'Noise Pollution',
      currentValue: 41.2,
      unit: '% lakos >55 dB(A) Lden',
      target2030: 20.0,
      euGreenCapitalThreshold: 20.0,
      trend: 'stable',
      trendDirection: 'lower-is-better',
      status: 'poor',
      color: '#ef4444',
      dataSource: 'Budapest Stratégiai Zajtérkép (EU 2002/49/EK alapján), BM Zajvédelmi Osztály',
      dataSourceUrl: 'https://www.budapest.hu/Lapok/zajterkep.aspx',
      lastUpdated: '2022',
      description:
        'A Budapest stratégiai zajtérképe szerint a főváros lakóinak 41,2%-a van kitéve 55 dB(A) feletti Lden (nappali-esti-éjszakai egyenértékű) zajterhelésnek a főutak, vasútvonalak és repülőtér közelségéből. A WHO 2018-as útmutatója szerint a 45 dB Lden fölötti tartós expozíció egészségkárosodást okoz.',
      historicalSeries: [
        { year: 2015, value: 43.5 },
        { year: 2017, value: 42.8 },
        { year: 2019, value: 42.1 },
        { year: 2022, value: 41.2 },
        { year: 2025, value: 39.0, isProjection: true },
        { year: 2028, value: 32.0, isProjection: true },
        { year: 2030, value: 25.0, isProjection: true },
      ],
      residentActions: [
        {
          id: 'noise-1',
          descriptionHu:
            'Ha panellakásban él és az ablakok a forgalmas utcára néznek: kérelmezze a kerületi önkormányzatnál a zajvédelmi nyílászárócsere-pályázaton való részvételt.',
          impactLevel: 'high',
        },
        {
          id: 'noise-2',
          descriptionHu:
            'Jelezze a FŐKEFE-nek vagy a BKK-nak a közelben éjszakai zajszennyezést okozó közúti javítási, aszfaltozási munkálatokat.',
          impactLevel: 'low',
        },
        {
          id: 'noise-3',
          descriptionHu:
            'Hálószobáját lehetőleg az udvari oldalra rendezze be — a forgalmas utcától való elfordulás 8–15 dB zajcsökkentést eredményez.',
          impactLevel: 'medium',
        },
      ],
    },
    {
      id: 'waste',
      category: 'waste' as EUGreenCapitalCategory,
      nameHu: 'Hulladékgazdálkodás',
      nameEn: 'Waste Management',
      currentValue: 31.8,
      unit: '% újrahasznosítási arány',
      target2030: 55.0,
      euGreenCapitalThreshold: 50.0,
      trend: 'improving',
      trendDirection: 'higher-is-better',
      status: 'poor',
      color: '#ef4444',
      dataSource: 'KSH (Központi Statisztikai Hivatal), FKF Nonprofit Kft. Éves Jelentés',
      dataSourceUrl: 'https://www.ksh.hu/stadat_files/kop/hu/kop0003.html',
      lastUpdated: '2023',
      description:
        'Budapest szelektív hulladékgyűjtési és újrahasznosítási aránya 2023-ban 31,8%, ami elmarad az EU 2025-ös 50%-os kötelező célértékétől. A fő probléma a panelházi szelektív hulladékgyűjtési infrastruktúra hiányossága és a lakói tudatosság alacsony szintje.',
      historicalSeries: [
        { year: 2015, value: 18.4 },
        { year: 2016, value: 20.1 },
        { year: 2017, value: 22.7 },
        { year: 2018, value: 24.9 },
        { year: 2019, value: 27.3 },
        { year: 2020, value: 28.1 },
        { year: 2021, value: 29.4 },
        { year: 2022, value: 30.8 },
        { year: 2023, value: 31.8 },
        { year: 2025, value: 37.0, isProjection: true },
        { year: 2028, value: 47.0, isProjection: true },
        { year: 2030, value: 55.0, isProjection: true },
      ],
      residentActions: [
        {
          id: 'waste-1',
          descriptionHu:
            'Kövesse az épületben kialakított 4-frakciós (papír, műanyag, üveg, fém) szelektív gyűjtési szabályt — ha nincs ilyen, kezdeményezze a közösségi fórumon.',
          impactLevel: 'high',
        },
        {
          id: 'waste-2',
          descriptionHu:
            'Biohulladékát (élelmiszer-maradék, kávézacc) komposztálásra vigye a legközelebbi FKF komposztálási pontra.',
          impactLevel: 'medium',
          link: 'https://www.fkf.hu/komposztalo-pontok',
        },
        {
          id: 'waste-3',
          descriptionHu:
            'Elektromos és elektronikai hulladékát (E-hulladék) ne dobja a kommunális kukába — vigye a FKF visszagyűjtő pontjára.',
          impactLevel: 'medium',
        },
      ],
    },
    {
      id: 'nature',
      category: 'nature' as EUGreenCapitalCategory,
      nameHu: 'Természet és biodiverzitás',
      nameEn: 'Nature & Biodiversity',
      currentValue: 9.8,
      unit: 'm²/fő zöldfelület (kerületi átlag)',
      target2030: 15.0,
      euGreenCapitalThreshold: 12.0,
      trend: 'improving',
      trendDirection: 'higher-is-better',
      status: 'moderate',
      color: '#eab308',
      dataSource: 'Budapest Főváros Zöldfelületi Kataszter, FÖMI (Lechner Tudásközpont)',
      dataSourceUrl: 'https://lechnerkozpont.hu/cikk/zoldfelulet-kataszter',
      lastUpdated: '2023',
      description:
        'A WHO ajánlása szerint minden városiaknak legalább 9 m² zöldfelülethez kell hozzáférnie és 300 méteren belül kell lennie egy közparknak. Budapest városszintű átlaga 9,8 m²/fő, de kerületi szinten hatalmas szórás mutatkozik: a II. és XII. kerületben 48 m²/fő, míg a VII. és IX. kerületben csak 2,1–3,4 m²/fő.',
      historicalSeries: [
        { year: 2015, value: 8.9 },
        { year: 2017, value: 9.1 },
        { year: 2019, value: 9.3 },
        { year: 2021, value: 9.6 },
        { year: 2023, value: 9.8 },
        { year: 2025, value: 10.5, isProjection: true },
        { year: 2028, value: 12.5, isProjection: true },
        { year: 2030, value: 15.0, isProjection: true },
      ],
      residentActions: [
        {
          id: 'nature-1',
          descriptionHu:
            'Csatlakozzon a kerületi „Zöldítési Program"-hoz — a legtöbb kerületi önkormányzat ingyenes fa- és cserjetelepítési akciót kínál.',
          impactLevel: 'medium',
        },
        {
          id: 'nature-2',
          descriptionHu:
            'Telepítsen virágládákat az erkélyre és az épület bejáratánál — a pollinátorbarát növények (levendula, rozmaring, zsálya) hozzájárulnak a városi biodiverzitáshoz.',
          impactLevel: 'low',
        },
        {
          id: 'nature-3',
          descriptionHu:
            'Kérelmezze a közös képviselőn keresztül a Zöld Budapest Program tetőkert- vagy zöldhomlokzat-pályázatán való részvételt.',
          impactLevel: 'high',
          link: 'https://budapest.hu/Lapok/zoldbp.aspx',
        },
      ],
    },
    {
      id: 'water',
      category: 'water' as EUGreenCapitalCategory,
      nameHu: 'Vízgazdálkodás',
      nameEn: 'Water Management',
      currentValue: 118.4,
      unit: 'L/fő/nap ivóvíz-fogyasztás',
      target2030: 100.0,
      euGreenCapitalThreshold: 110.0,
      trend: 'improving',
      trendDirection: 'lower-is-better',
      status: 'moderate',
      color: '#eab308',
      dataSource: 'Fővárosi Vízművek Éves Jelentés, KSH',
      dataSourceUrl: 'https://www.vizmuvek.hu/hu/rolunk/sajtoszoba/kiadvanyok',
      lastUpdated: '2023',
      description:
        'Budapest ivóvíz-fogyasztása az elmúlt évtizedben folyamatosan csökkent — 2010-ben még 148 L/fő/nap volt, 2023-ra 118 L/fő/napra mérséklődött. A Fővárosi Vízművek hálózati veszteségaránya 22% körül stabilizálódott, ami uniós szinten közepes.',
      historicalSeries: [
        { year: 2015, value: 131.2 },
        { year: 2016, value: 129.4 },
        { year: 2017, value: 127.1 },
        { year: 2018, value: 125.8 },
        { year: 2019, value: 123.4 },
        { year: 2020, value: 122.1 },
        { year: 2021, value: 120.8 },
        { year: 2022, value: 119.3 },
        { year: 2023, value: 118.4 },
        { year: 2025, value: 115.0, isProjection: true },
        { year: 2028, value: 107.0, isProjection: true },
        { year: 2030, value: 100.0, isProjection: true },
      ],
      residentActions: [
        {
          id: 'water-1',
          descriptionHu:
            'Cserélje a csaptelepeket vízspóroló perlátor-betétre — 50%-kal csökkentheti a csap alatti vízfelhasználást minimális beruházással.',
          impactLevel: 'medium',
        },
        {
          id: 'water-2',
          descriptionHu:
            'Jelentse a közös képviselőnek a lépcsőházban vagy alagsorban észlelt csepegő csapot, szivárgó csőkönyököt — a rejtett csőhálózati veszteség a panellakásokban kritikus.',
          impactLevel: 'high',
        },
      ],
    },
    {
      id: 'eco-innovation',
      category: 'eco-innovation' as EUGreenCapitalCategory,
      nameHu: 'Ökoinnovációs foglalkoztatás',
      nameEn: 'Eco-innovation & Employment',
      currentValue: 4.2,
      unit: '% zöld szektorban foglalkoztatottak aránya',
      target2030: 8.0,
      euGreenCapitalThreshold: 6.0,
      trend: 'improving',
      trendDirection: 'higher-is-better',
      status: 'moderate',
      color: '#eab308',
      dataSource: 'KSH Munkaerő-felvétel, Eurostat Green Economy Statistics',
      dataSourceUrl: 'https://ec.europa.eu/eurostat/web/environment/green-economy',
      lastUpdated: '2022',
      description:
        'A zöld szektorban foglalkoztatottak aránya magában foglalja a megújuló energia, energiahatékonyság, hulladékgazdálkodás, víztisztítás, fenntartható mezőgazdaság és zöld épületgazdálkodás területén dolgozókat. Budapest 2023-ban 4,2%-os aránnyal közepes EU-s teljesítményt nyújt.',
      historicalSeries: [
        { year: 2015, value: 2.8 },
        { year: 2017, value: 3.1 },
        { year: 2019, value: 3.6 },
        { year: 2021, value: 3.9 },
        { year: 2022, value: 4.2 },
        { year: 2025, value: 5.0, isProjection: true },
        { year: 2028, value: 6.5, isProjection: true },
        { year: 2030, value: 8.0, isProjection: true },
      ],
      residentActions: [
        {
          id: 'eco-1',
          descriptionHu:
            'Keressen munkát vagy pályázzon ösztöndíjra a zöld szektorban — a KEHOP és GINOP programok Budapest-szerte zöld munkahelyeket finanszíroznak.',
          impactLevel: 'high',
          link: 'https://www.palyazat.gov.hu',
        },
      ],
    },
    {
      id: 'local-transport',
      category: 'local-transport' as EUGreenCapitalCategory,
      nameHu: 'Helyi közlekedés',
      nameEn: 'Local Transport',
      currentValue: 54.3,
      unit: '% tömegközlekedési modal share',
      target2030: 65.0,
      euGreenCapitalThreshold: 60.0,
      trend: 'stable',
      trendDirection: 'higher-is-better',
      status: 'moderate',
      color: '#eab308',
      dataSource: 'BKK Éves Közlekedési Jelentés, KSH Közlekedési Statisztikák',
      dataSourceUrl: 'https://bkk.hu/fejlesztesek/kutatasok-elemzesek/',
      lastUpdated: '2023',
      description:
        'Budapest 2023-ban a teljes utazásszám 54,3%-át tömegközlekedési eszközökkel bonyolítják le. A kerékpáros modal share 3,8%. Bécsben a tömegközlekedési arány 38%, de a kerékpáros 7%, és összesen a nem-autós modalitás 73% körüli. Budapest 2030-as célja 65% tömegközlekedési + 6% kerékpáros.',
      historicalSeries: [
        { year: 2015, value: 56.2 },
        { year: 2016, value: 55.8 },
        { year: 2017, value: 55.1 },
        { year: 2018, value: 54.9 },
        { year: 2019, value: 55.3 },
        { year: 2020, value: 44.1 },
        { year: 2021, value: 50.2 },
        { year: 2022, value: 53.1 },
        { year: 2023, value: 54.3 },
        { year: 2025, value: 57.0, isProjection: true },
        { year: 2028, value: 62.0, isProjection: true },
        { year: 2030, value: 65.0, isProjection: true },
      ],
      residentActions: [
        {
          id: 'transport-1',
          descriptionHu:
            'Váltson éves BKK bérlet + MOL Bubi kombinált előfizetésre — az éves megtakarítás az autótartáshoz képest 600 000 – 1 200 000 Ft/év.',
          impactLevel: 'high',
          link: 'https://bkk.hu/berletek/',
        },
        {
          id: 'transport-2',
          descriptionHu:
            'Ha gyereket visz iskolába, szervezzen kerületi „sétáló busz" (walking school bus) programot — más szülőkkel váltva kísérve a gyerekeket.',
          impactLevel: 'medium',
        },
      ],
    },
    {
      id: 'co2',
      category: 'co2' as EUGreenCapitalCategory,
      nameHu: 'CO₂-kibocsátás',
      nameEn: 'CO₂ Emissions',
      currentValue: 5.8,
      unit: 'tonna CO₂/fő/év',
      target2030: 3.5,
      euGreenCapitalThreshold: 4.5,
      trend: 'improving',
      trendDirection: 'lower-is-better',
      status: 'moderate',
      color: '#eab308',
      dataSource: 'EEA (European Environment Agency) Urban Audit, KSH Energia Mérleg',
      dataSourceUrl: 'https://www.eea.europa.eu/data-and-maps/data/urban-atlas',
      lastUpdated: '2022',
      description:
        'Budapest egy főre jutó CO₂-kibocsátása 2022-ben 5,8 tonna volt — ez EU-s összehasonlításban közepes, de még mindig 65%-kal meghaladja a Párizsi Megállapodás 1,5°C-os pályájához szükséges 3,5 tonnás szintet.',
      historicalSeries: [
        { year: 2015, value: 7.2 },
        { year: 2016, value: 7.0 },
        { year: 2017, value: 6.8 },
        { year: 2018, value: 6.6 },
        { year: 2019, value: 6.4 },
        { year: 2020, value: 5.6 },
        { year: 2021, value: 6.1 },
        { year: 2022, value: 5.8 },
        { year: 2025, value: 5.2, isProjection: true },
        { year: 2028, value: 4.3, isProjection: true },
        { year: 2030, value: 3.5, isProjection: true },
      ],
      residentActions: [
        {
          id: 'co2-1',
          descriptionHu:
            'Váltson villany- vagy hibrid autóra, ha autót tart fenn — vagy mondjon le az autóról és BKK + Bolt + MOL Bubi kombinációt használjon.',
          impactLevel: 'high',
        },
        {
          id: 'co2-2',
          descriptionHu:
            'Pályázzon panellakása hőszigetelési és nyílászárócsere-felújítására — 30-50%-os fűtési energiamegtakarítás érhető el, ami 1-2 tonna CO₂/év csökkentés.',
          impactLevel: 'high',
        },
      ],
    },
    {
      id: 'energy',
      category: 'energy' as EUGreenCapitalCategory,
      nameHu: 'Energiagazdálkodás',
      nameEn: 'Energy Management',
      currentValue: 14.2,
      unit: '% megújuló energia arány (fővárosi fogyasztásból)',
      target2030: 32.0,
      euGreenCapitalThreshold: 25.0,
      trend: 'improving',
      trendDirection: 'higher-is-better',
      status: 'poor',
      color: '#ef4444',
      dataSource: 'MEKH (Magyar Energetikai és Közmű-szabályozási Hivatal), FCSM Éves Jelentés',
      dataSourceUrl: 'https://www.mekh.hu/statisztikak',
      lastUpdated: '2023',
      description:
        'Budapest megújuló energia aránya 2023-ban 14,2% — ez messze elmarad az EU 2030-as kötelező 32%-os célértékétől. A legfontosabb növekedési potenciál a lakóépületek tetején elhelyezhető napelemek, a geotermikus fűtés bővítése és a fővárosi közvilágítás LED-re cserélése.',
      historicalSeries: [
        { year: 2015, value: 7.1 },
        { year: 2016, value: 7.9 },
        { year: 2017, value: 8.8 },
        { year: 2018, value: 9.6 },
        { year: 2019, value: 10.8 },
        { year: 2020, value: 11.4 },
        { year: 2021, value: 12.1 },
        { year: 2022, value: 13.3 },
        { year: 2023, value: 14.2 },
        { year: 2025, value: 18.0, isProjection: true },
        { year: 2028, value: 27.0, isProjection: true },
        { year: 2030, value: 32.0, isProjection: true },
      ],
      residentActions: [
        {
          id: 'energy-1',
          descriptionHu:
            'Kezdeményezze a társasházi napelem-pályázaton való részvételt — a KEHOP 5.2.4 pályázat akár 80%-os támogatást nyújt lakóépületek napelemrendszereire.',
          impactLevel: 'high',
          link: 'https://www.palyazat.gov.hu/kehop524',
        },
        {
          id: 'energy-2',
          descriptionHu:
            'Cserélje le az izzóit LED-re, és állítson be okos termosztátot — ezek alacsony befektetéssel 20-30%-os energiamegtakarítást eredményeznek.',
          impactLevel: 'medium',
        },
      ],
    },
    {
      id: 'land-use',
      category: 'land-use' as EUGreenCapitalCategory,
      nameHu: 'Területhasználat',
      nameEn: 'Land Use',
      currentValue: 47.3,
      unit: '% beépített terület aránya',
      target2030: 42.0,
      euGreenCapitalThreshold: 45.0,
      trend: 'stable',
      trendDirection: 'lower-is-better',
      status: 'moderate',
      color: '#eab308',
      dataSource: 'Lechner Tudásközpont Térinformatikai Platform, CORINE Land Cover',
      dataSourceUrl: 'https://www.eea.europa.eu/data-and-maps/data/corine-land-cover-5',
      lastUpdated: '2022',
      description:
        'Budapest területének 47,3%-a beépített (épületek, burkolatok, utak). Budapest 2030 célkitűzése szerint minden barnamezős terület rehabilitáción esik át mielőtt új zöldmezős fejlesztés engedélyezhető, és 2030-ra a beépített arány 42% alá kell csökkenteni a zöldterületek visszafoglalásával.',
      historicalSeries: [
        { year: 2015, value: 48.1 },
        { year: 2018, value: 47.9 },
        { year: 2022, value: 47.3 },
        { year: 2025, value: 46.5, isProjection: true },
        { year: 2028, value: 44.0, isProjection: true },
        { year: 2030, value: 42.0, isProjection: true },
      ],
      residentActions: [
        {
          id: 'land-1',
          descriptionHu:
            'Szavazzon a kerületi közmeghallgatásokon a zöldterületként megmaradó telkek védelme mellett — a helyi politikai részvétel közvetlen hatással bír a területhasználati döntésekre.',
          impactLevel: 'high',
        },
        {
          id: 'land-2',
          descriptionHu:
            'Keressen „zsebpark" (pocket park) pályázatokat a kerületben — több kerület finanszíroz 50–200 m²-es mini parkokat lakóközösségi kezdeményezésre.',
          impactLevel: 'medium',
        },
      ],
    },
    {
      id: 'governance',
      category: 'governance' as EUGreenCapitalCategory,
      nameHu: 'Irányítás és polgári részvétel',
      nameEn: 'Environmental Governance',
      currentValue: 62.0,
      unit: '/ 100 pontos Governance Score',
      target2030: 85.0,
      euGreenCapitalThreshold: 75.0,
      trend: 'improving',
      trendDirection: 'higher-is-better',
      status: 'moderate',
      color: '#eab308',
      dataSource: 'Európai Bizottság Smart Cities & Communities Platform, OECD Government at a Glance',
      dataSourceUrl: 'https://ec.europa.eu/info/eu-regional-and-urban-development/topics/cities-and-urban-development/city-initiatives/smart-cities_en',
      lastUpdated: '2023',
      description:
        'Az irányítási mutató a helyi környezeti stratégiák meglétét, a polgári részvétel szintjét, az ISO 14001 alapú önkormányzati környezetirányítási rendszer kiépítettségét és a nyílt adat hozzáférhetőséget méri. Budapest a 62 pontos eredménnyel közepes teljesítményt nyújt.',
      historicalSeries: [
        { year: 2015, value: 48.0 },
        { year: 2017, value: 52.0 },
        { year: 2019, value: 57.0 },
        { year: 2021, value: 60.0 },
        { year: 2023, value: 62.0 },
        { year: 2025, value: 68.0, isProjection: true },
        { year: 2028, value: 78.0, isProjection: true },
        { year: 2030, value: 85.0, isProjection: true },
      ],
      residentActions: [
        {
          id: 'governance-1',
          descriptionHu:
            'Regisztráljon a Budapest Participatory Budget (Részvételi Költségvetés) platformra és szavazzon a kerületi zöld beruházási projektekre.',
          impactLevel: 'high',
          link: 'https://otlet.budapest.hu',
        },
        {
          id: 'governance-2',
          descriptionHu:
            'Ossza meg a panellako.hu platformat lakóközösségének, hogy az épület szintjén is elinduljon az adatvezérelt közösségi döntéshozatal.',
          impactLevel: 'medium',
        },
      ],
    },
  ] as BudapestIndicator[],

  pillars: [
    {
      id: 'elheto',
      nameHu: 'Élhető Budapest',
      icon: 'Home',
      colorHex: '#3b82f6',
      goals: [
        { id: 'elheto-1', descriptionHu: 'Szociális bérlakásállomány bővítése 5000 lakással', currentValue: 1240, targetValue: 5000, unit: 'lakás', baselineYear: 2020, targetYear: 2030, progressPercent: 24.8, sourceUrl: 'https://budapest.hu' },
        { id: 'elheto-2', descriptionHu: 'Panelfelújítási program — 120 épület évente', currentValue: 68, targetValue: 120, unit: 'épület/év', baselineYear: 2020, targetYear: 2030, progressPercent: 56.7, sourceUrl: 'https://budapest.hu' },
        { id: 'elheto-3', descriptionHu: 'Közterületi zöld pihenőhelyek száma 500-ra emelése', currentValue: 312, targetValue: 500, unit: 'pihenőhely', baselineYear: 2020, targetYear: 2030, progressPercent: 62.4, sourceUrl: 'https://budapest.hu' },
      ],
    },
    {
      id: 'zold',
      nameHu: 'Zöld Budapest',
      icon: 'Leaf',
      colorHex: '#22c55e',
      goals: [
        { id: 'zold-1', descriptionHu: '1 millió új fa telepítése 2030-ra', currentValue: 340000, targetValue: 1000000, unit: 'fa', baselineYear: 2020, targetYear: 2030, progressPercent: 34.0, sourceUrl: 'https://budapest.hu/zoldbp' },
        { id: 'zold-2', descriptionHu: 'Zöldfelület 9,8 m²/főről 15 m²/főre növelése', currentValue: 9.8, targetValue: 15.0, unit: 'm²/fő', baselineYear: 2020, targetYear: 2030, progressPercent: 17.0, sourceUrl: 'https://budapest.hu/zoldbp' },
        { id: 'zold-3', descriptionHu: 'Hőszigat-csökkentő tetőkert program — 200 épület', currentValue: 42, targetValue: 200, unit: 'épület', baselineYear: 2020, targetYear: 2030, progressPercent: 21.0, sourceUrl: 'https://budapest.hu/zoldbp' },
      ],
    },
    {
      id: 'dinamikus',
      nameHu: 'Dinamikus Budapest',
      icon: 'TrendingUp',
      colorHex: '#f59e0b',
      goals: [
        { id: 'din-1', descriptionHu: 'Zöld startup ökoszisztéma — 300 új vállalkozás', currentValue: 87, targetValue: 300, unit: 'vállalkozás', baselineYear: 2020, targetYear: 2030, progressPercent: 29.0, sourceUrl: 'https://budapest.hu' },
        { id: 'din-2', descriptionHu: 'Budapest Smart City index EU top 10-be kerülés', currentValue: 18, targetValue: 10, unit: 'helyezés (EU)', baselineYear: 2020, targetYear: 2030, progressPercent: 38.0, sourceUrl: 'https://ec.europa.eu/smartcities' },
      ],
    },
    {
      id: 'gondoskodo',
      nameHu: 'Gondoskodó Budapest',
      icon: 'Heart',
      colorHex: '#ec4899',
      goals: [
        { id: 'gon-1', descriptionHu: 'Hőhullám-menedékhelyek száma 150-re emelése', currentValue: 68, targetValue: 150, unit: 'menedékhely', baselineYear: 2020, targetYear: 2030, progressPercent: 45.3, sourceUrl: 'https://budapest.hu' },
        { id: 'gon-2', descriptionHu: 'Levegőminőség riasztási rendszer kerületi lefedettség 100%', currentValue: 61.0, targetValue: 100.0, unit: '% kerületi lefedettség', baselineYear: 2020, targetYear: 2030, progressPercent: 61.0, sourceUrl: 'https://www.levegominoseg.hu' },
      ],
    },
    {
      id: 'okos',
      nameHu: 'Okos Budapest',
      icon: 'Cpu',
      colorHex: '#8b5cf6',
      goals: [
        { id: 'okos-1', descriptionHu: 'Okos közvilágítás LED arány 100%', currentValue: 74.0, targetValue: 100.0, unit: '% LED arány', baselineYear: 2020, targetYear: 2030, progressPercent: 74.0, sourceUrl: 'https://budapest.hu' },
        { id: 'okos-2', descriptionHu: 'Nyílt városi adat API-ok száma 50-re bővítése', currentValue: 23, targetValue: 50, unit: 'API endpoint', baselineYear: 2020, targetYear: 2030, progressPercent: 46.0, sourceUrl: 'https://opendata.budapest.hu' },
      ],
    },
  ],

  cityComparison: {
    cities: [
      {
        id: 'budapest',
        nameHu: 'Budapest',
        color: '#3b82f6',
        scores: { 'air-quality': 45, noise: 38, waste: 42, nature: 55, water: 65, 'eco-innovation': 48, 'local-transport': 72, co2: 52, energy: 35, 'land-use': 60, governance: 62 },
      },
      {
        id: 'wien',
        nameHu: 'Bécs',
        color: '#22c55e',
        scores: { 'air-quality': 82, noise: 70, waste: 88, nature: 80, water: 92, 'eco-innovation': 85, 'local-transport': 91, co2: 76, energy: 79, 'land-use': 78, governance: 94 },
      },
      {
        id: 'praha',
        nameHu: 'Prága',
        color: '#f97316',
        scores: { 'air-quality': 55, noise: 50, waste: 52, nature: 62, water: 70, 'eco-innovation': 55, 'local-transport': 76, co2: 58, energy: 44, 'land-use': 65, governance: 70 },
      },
      {
        id: 'warszawa',
        nameHu: 'Varsó',
        color: '#a855f7',
        scores: { 'air-quality': 30, noise: 42, waste: 38, nature: 48, water: 62, 'eco-innovation': 40, 'local-transport': 68, co2: 40, energy: 32, 'land-use': 55, governance: 58 },
      },
      {
        id: 'bratislava',
        nameHu: 'Pozsony',
        color: '#6b7280',
        scores: { 'air-quality': 48, noise: 55, waste: 45, nature: 58, water: 68, 'eco-innovation': 43, 'local-transport': 65, co2: 50, energy: 40, 'land-use': 62, governance: 60 },
      },
    ],
  },
};
```

---

## Frontend komponensek

### 5.1 Fő dashboard komponens

```tsx
// components/budapest-2030-dashboard.tsx
'use client';

import { useState } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { EuGreenCapitalIndicatorCard } from './eu-green-capital-indicator-card';
import { CityComparisonRadar } from './city-comparison-radar';
import { PersonalImpactCalculator } from './personal-impact-calculator';
import { IndicatorTimelineChart } from './indicator-timeline-chart';
import { PillarProgressCard } from './pillar-progress-card';
import { DistrictRankingPanel } from './district-ranking-panel';
import type { BudapestIndicator } from '@/lib/budapest-2030-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Building2, Leaf, BarChart3, Users, Globe } from 'lucide-react';

interface Budapest2030DashboardProps {
  indicators: BudapestIndicator[];
  pillars: typeof import('@/lib/budapest-2030-data').budapest2030Data.pillars;
  cityComparison: typeof import('@/lib/budapest-2030-data').budapest2030Data.cityComparison;
  districtId: number;
  districtName: string;
}

export function Budapest2030Dashboard({
  indicators,
  pillars,
  cityComparison,
  districtId,
  districtName,
}: Budapest2030DashboardProps) {
  const { t } = useI18n();
  const [activeIndicator, setActiveIndicator] = useState<string | null>(null);

  const goodCount = indicators.filter((i) => i.status === 'good').length;
  const moderateCount = indicators.filter((i) => i.status === 'moderate').length;
  const poorCount = indicators.filter((i) => i.status === 'poor').length;

  // Aggregált Budapest Health Score: súlyozott átlag a 11 indikátor EU-küszöbhöz viszonyított teljesítményéből
  const healthScore = Math.round(
    indicators.reduce((acc, ind) => {
      const normalized =
        ind.trendDirection === 'lower-is-better'
          ? Math.max(0, Math.min(100, ((ind.euGreenCapitalThreshold * 1.5 - ind.currentValue) / (ind.euGreenCapitalThreshold * 1.5 - ind.target2030)) * 100))
          : Math.max(0, Math.min(100, (ind.currentValue / ind.euGreenCapitalThreshold) * 100));
      return acc + normalized;
    }, 0) / indicators.length
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Hero fejléc */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-green-950 p-6 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">
              {t('budapest2030.title')}
            </h1>
            <p className="mt-1 text-slate-300">
              {t('budapest2030.subtitle', { district: districtName })}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline" className="border-green-400 text-green-400">
                {goodCount} {t('budapest2030.statusGood')}
              </Badge>
              <Badge variant="outline" className="border-yellow-400 text-yellow-400">
                {moderateCount} {t('budapest2030.statusModerate')}
              </Badge>
              <Badge variant="outline" className="border-red-400 text-red-400">
                {poorCount} {t('budapest2030.statusPoor')}
              </Badge>
            </div>
          </div>
          {/* City Health Score — aggregált mutató */}
          <div className="flex flex-col items-center">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full border-4 text-3xl font-bold"
              style={{
                borderColor: healthScore >= 70 ? '#22c55e' : healthScore >= 45 ? '#eab308' : '#ef4444',
                color: healthScore >= 70 ? '#22c55e' : healthScore >= 45 ? '#eab308' : '#ef4444',
              }}
            >
              {healthScore}
            </div>
            <span className="mt-1 text-sm text-slate-400">{t('budapest2030.cityHealthScore')}</span>
          </div>
        </div>
      </div>

      {/* Tabbed navigáció */}
      <Tabs defaultValue="indicators">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="indicators">
            <BarChart3 className="mr-1 h-4 w-4" />
            {t('budapest2030.tab.indicators')}
          </TabsTrigger>
          <TabsTrigger value="pillars">
            <Building2 className="mr-1 h-4 w-4" />
            {t('budapest2030.tab.pillars')}
          </TabsTrigger>
          <TabsTrigger value="districts">
            <Leaf className="mr-1 h-4 w-4" />
            {t('budapest2030.tab.districts')}
          </TabsTrigger>
          <TabsTrigger value="compare">
            <Globe className="mr-1 h-4 w-4" />
            {t('budapest2030.tab.compare')}
          </TabsTrigger>
          <TabsTrigger value="calculator">
            <Users className="mr-1 h-4 w-4" />
            {t('budapest2030.tab.calculator')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="indicators" className="mt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {indicators.map((indicator) => (
              <EuGreenCapitalIndicatorCard
                key={indicator.id}
                indicator={indicator}
                isActive={activeIndicator === indicator.id}
                onExpand={() =>
                  setActiveIndicator(activeIndicator === indicator.id ? null : indicator.id)
                }
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pillars" className="mt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pillars.map((pillar) => (
              <PillarProgressCard key={pillar.id} pillar={pillar} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="districts" className="mt-4">
          <DistrictRankingPanel indicators={indicators} activeDistrictId={districtId} />
        </TabsContent>

        <TabsContent value="compare" className="mt-4">
          <CityComparisonRadar cityComparison={cityComparison} highlightCity="budapest" />
        </TabsContent>

        <TabsContent value="calculator" className="mt-4">
          <PersonalImpactCalculator indicators={indicators} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

### 5.2 EU Zöld Főváros Indikátor-kártya

```tsx
// components/eu-green-capital-indicator-card.tsx
'use client';

import { useState } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BudapestIndicator } from '@/lib/budapest-2030-data';
import { cn } from '@/lib/utils';

interface EuGreenCapitalIndicatorCardProps {
  indicator: BudapestIndicator;
  isActive: boolean;
  onExpand: () => void;
}

const statusConfig = {
  good: { label: 'Jó', bgClass: 'bg-green-50 border-green-200', badgeClass: 'bg-green-100 text-green-800' },
  moderate: { label: 'Közepes', bgClass: 'bg-yellow-50 border-yellow-200', badgeClass: 'bg-yellow-100 text-yellow-800' },
  poor: { label: 'Kritikus', bgClass: 'bg-red-50 border-red-200', badgeClass: 'bg-red-100 text-red-800' },
};

export function EuGreenCapitalIndicatorCard({ indicator, isActive, onExpand }: EuGreenCapitalIndicatorCardProps) {
  const { t } = useI18n();
  const config = statusConfig[indicator.status];

  const TrendIcon =
    indicator.trend === 'improving'
      ? TrendingUp
      : indicator.trend === 'worsening'
      ? TrendingDown
      : Minus;

  const trendColor =
    indicator.trend === 'improving'
      ? (indicator.trendDirection === 'lower-is-better' ? 'text-green-600' : 'text-green-600')
      : indicator.trend === 'worsening'
      ? 'text-red-600'
      : 'text-slate-400';

  const historicalPoints = indicator.historicalSeries
    .filter((p) => !p.isProjection)
    .map((p) => ({ year: p.year, value: p.value }));

  // Progress a 2030-as célhoz
  const progressToTarget =
    indicator.trendDirection === 'lower-is-better'
      ? Math.max(0, Math.min(100,
          ((historicalPoints[0].value - indicator.currentValue) /
            (historicalPoints[0].value - indicator.target2030)) * 100
        ))
      : Math.max(0, Math.min(100,
          ((indicator.currentValue - historicalPoints[0].value) /
            (indicator.target2030 - historicalPoints[0].value)) * 100
        ));

  return (
    <Card className={cn('border transition-all duration-200', config.bgClass, isActive && 'ring-2 ring-offset-1')}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              EU Zöld Főváros
            </p>
            <h3 className="mt-0.5 text-base font-bold text-slate-900">{indicator.nameHu}</h3>
          </div>
          <Badge className={cn('shrink-0 text-xs', config.badgeClass)}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Aktuális érték */}
        <div className="flex items-end justify-between">
          <div>
            <span className="text-2xl font-bold" style={{ color: indicator.color }}>
              {indicator.currentValue.toLocaleString('hu-HU')}
            </span>
            <span className="ml-1 text-xs text-slate-500">{indicator.unit}</span>
          </div>
          <div className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
            <TrendIcon className="h-4 w-4" />
            <span>{t(`budapest2030.trend.${indicator.trend}`)}</span>
          </div>
        </div>

        {/* Mini Sparkline */}
        <div className="h-10 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalPoints}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={indicator.color}
                strokeWidth={2}
                dot={false}
              />
              <RechartsTooltip
                formatter={(v: number) => [`${v.toLocaleString('hu-HU')} ${indicator.unit}`, indicator.nameHu]}
                labelFormatter={(label) => `${label}`}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Progress a 2030-as célhoz */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{t('budapest2030.progressTo2030')}</span>
            <span className="font-medium">{progressToTarget.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressToTarget}%`, backgroundColor: indicator.color }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>{t('budapest2030.currentValue')}: {indicator.currentValue}</span>
            <span>{t('budapest2030.target2030')}: {indicator.target2030}</span>
          </div>
        </div>

        {/* Kibontás gomb */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-xs"
          onClick={onExpand}
        >
          {t('budapest2030.whatCanIDo')}
          {isActive ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {/* Kibontott resident actions + timeline */}
        {isActive && (
          <div className="space-y-3 border-t pt-3">
            {/* Trend chart kibővített nézetben */}
            <IndicatorTimelineChartCompact indicator={indicator} />

            <h4 className="text-sm font-semibold text-slate-700">{t('budapest2030.residentActions')}</h4>
            <ul className="space-y-2">
              {indicator.residentActions.map((action) => (
                <li key={action.id} className="flex items-start gap-2 text-xs text-slate-600">
                  <span
                    className={cn(
                      'mt-0.5 h-2 w-2 shrink-0 rounded-full',
                      action.impactLevel === 'high' ? 'bg-green-500' : action.impactLevel === 'medium' ? 'bg-yellow-500' : 'bg-slate-400'
                    )}
                  />
                  <span>{action.descriptionHu}</span>
                  {action.link && (
                    <a href={action.link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 text-blue-500" />
                    </a>
                  )}
                </li>
              ))}
            </ul>

            <p className="text-xs text-slate-400">
              {t('budapest2030.dataSource')}: <span className="font-medium">{indicator.dataSource}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Kompakt idősor az indikátorkártyán belüli kibontott nézethez
function IndicatorTimelineChartCompact({ indicator }: { indicator: BudapestIndicator }) {
  const allPoints = indicator.historicalSeries.map((p) => ({
    year: p.year,
    actual: p.isProjection ? undefined : p.value,
    projected: p.isProjection ? p.value : undefined,
  }));

  return (
    <div className="h-28 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={allPoints}>
          <Line type="monotone" dataKey="actual" stroke={indicator.color} strokeWidth={2} dot={false} name="Tényleges" />
          <Line type="monotone" dataKey="projected" stroke={indicator.color} strokeWidth={2} dot={false} strokeDasharray="4 2" name="Tervezett" />
          <RechartsTooltip formatter={(v: number) => [`${v} ${indicator.unit}`]} labelFormatter={(y) => `${y}`} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

### 5.3 Városösszehasonlító RadarChart

```tsx
// components/city-comparison-radar.tsx
'use client';

import { useState } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import { useI18n } from '@/hooks/useI18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const INDICATOR_LABELS_HU: Record<string, string> = {
  'air-quality': 'Levegő',
  noise: 'Zaj',
  waste: 'Hulladék',
  nature: 'Természet',
  water: 'Víz',
  'eco-innovation': 'Ökoinnováció',
  'local-transport': 'Közlekedés',
  co2: 'CO₂',
  energy: 'Energia',
  'land-use': 'Területhasz.',
  governance: 'Irányítás',
};

export function CityComparisonRadar({ cityComparison, highlightCity }: {
  cityComparison: any;
  highlightCity: string;
}) {
  const { t } = useI18n();
  const [visibleCities, setVisibleCities] = useState<Set<string>>(
    new Set(cityComparison.cities.map((c: any) => c.id))
  );

  const radarData = Object.keys(INDICATOR_LABELS_HU).map((indicatorId) => {
    const entry: Record<string, any> = { indicator: INDICATOR_LABELS_HU[indicatorId] };
    cityComparison.cities.forEach((city: any) => {
      entry[city.id] = city.scores[indicatorId] ?? 0;
    });
    return entry;
  });

  const toggleCity = (cityId: string) => {
    setVisibleCities((prev) => {
      const next = new Set(prev);
      if (next.has(cityId)) {
        if (next.size > 1) next.delete(cityId);
      } else {
        next.add(cityId);
      }
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('budapest2030.cityComparison.title')}</CardTitle>
        <p className="text-xs text-slate-500">{t('budapest2030.cityComparison.subtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* City toggles */}
        <div className="flex flex-wrap gap-4">
          {cityComparison.cities.map((city: any) => (
            <div key={city.id} className="flex items-center gap-2">
              <Switch
                id={`city-${city.id}`}
                checked={visibleCities.has(city.id)}
                onCheckedChange={() => toggleCity(city.id)}
                style={{ '--switch-color': city.color } as React.CSSProperties}
              />
              <Label htmlFor={`city-${city.id}`} className="text-sm font-medium" style={{ color: city.color }}>
                {city.nameHu}
              </Label>
            </div>
          ))}
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="indicator" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
              {cityComparison.cities
                .filter((city: any) => visibleCities.has(city.id))
                .map((city: any) => (
                  <Radar
                    key={city.id}
                    name={city.nameHu}
                    dataKey={city.id}
                    stroke={city.color}
                    fill={city.color}
                    fillOpacity={city.id === highlightCity ? 0.25 : 0.08}
                    strokeWidth={city.id === highlightCity ? 2.5 : 1.5}
                  />
                ))}
              <Legend />
              <Tooltip formatter={(v: number) => [`${v}/100`]} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <p className="text-center text-xs text-slate-400">
          {t('budapest2030.cityComparison.note')}
        </p>
      </CardContent>
    </Card>
  );
}
```

---

### 5.4 Személyes hatáskiszámító

```tsx
// components/personal-impact-calculator.tsx
'use client';

import { useState, useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/hooks/useI18n';
import { Car, Bike, Bus, Droplets, Trash2, Zap } from 'lucide-react';

const CO2_PER_KM_CAR = 0.21; // kg CO₂/km személyautó (átlagos euro-6)
const CO2_PER_KM_BKK = 0.032; // kg CO₂/km tömegközlekedés (Budapest átlag)
const CO2_PER_KM_BIKE = 0.0; // kerékpár
const DAYS_PER_YEAR = 250; // munkanapos napok

export function PersonalImpactCalculator({ indicators }: { indicators: any[] }) {
  const { t } = useI18n();
  const [carKm, setCarKm] = useState(15);
  const [bkkKm, setBkkKm] = useState(20);
  const [bikeKm, setBikeKm] = useState(5);
  const [waterL, setWaterL] = useState(118);
  const [recyclingPct, setRecyclingPct] = useState(30);
  const [renewablePct, setRenewablePct] = useState(0);

  const impacts = useMemo(() => {
    const annualCarCo2 = carKm * CO2_PER_KM_CAR * DAYS_PER_YEAR;
    const annualBkkCo2 = bkkKm * CO2_PER_KM_BKK * DAYS_PER_YEAR;
    const annualBikeCo2 = bikeKm * CO2_PER_KM_BIKE * DAYS_PER_YEAR;
    const totalTransportCo2 = annualCarCo2 + annualBkkCo2 + annualBikeCo2;

    // Mennyivel csökkenne, ha az autó km-eket BKK-ra váltaná?
    const co2SavedIfBKK = carKm * (CO2_PER_KM_CAR - CO2_PER_KM_BKK) * DAYS_PER_YEAR;
    const co2SavedIfBike = carKm * CO2_PER_KM_CAR * DAYS_PER_YEAR;

    // Budapest átlag: 118 L/fő/nap vízfogyasztás
    const waterDiffPct = ((waterL - 118) / 118) * 100;

    // Újrahasznosítás különbség a Budapest 31,8% átlaghoz képest
    const recyclingDiff = recyclingPct - 31.8;

    return {
      totalTransportCo2Kg: Math.round(totalTransportCo2),
      co2SavedIfBKK: Math.round(co2SavedIfBKK),
      co2SavedIfBike: Math.round(co2SavedIfBike),
      waterDiffPct: Math.round(waterDiffPct * 10) / 10,
      recyclingDiff: Math.round(recyclingDiff * 10) / 10,
    };
  }, [carKm, bkkKm, bikeKm, waterL, recyclingPct, renewablePct]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('budapest2030.calculator.title')}</CardTitle>
        <p className="text-xs text-slate-500">{t('budapest2030.calculator.subtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Sliders */}
          <div className="space-y-5">
            <SliderRow icon={<Car className="h-4 w-4 text-red-500" />} label={`Autóval: ${carKm} km/nap`} value={carKm} min={0} max={80} step={1} onChange={setCarKm} />
            <SliderRow icon={<Bus className="h-4 w-4 text-blue-500" />} label={`BKK: ${bkkKm} km/nap`} value={bkkKm} min={0} max={60} step={1} onChange={setBkkKm} />
            <SliderRow icon={<Bike className="h-4 w-4 text-green-500" />} label={`Kerékpár: ${bikeKm} km/nap`} value={bikeKm} min={0} max={30} step={1} onChange={setBikeKm} />
            <SliderRow icon={<Droplets className="h-4 w-4 text-cyan-500" />} label={`Vízfogyasztás: ${waterL} L/nap`} value={waterL} min={50} max={300} step={5} onChange={setWaterL} />
            <SliderRow icon={<Trash2 className="h-4 w-4 text-amber-500" />} label={`Újrahasznosítás: ${recyclingPct}%`} value={recyclingPct} min={0} max={100} step={5} onChange={setRecyclingPct} />
            <SliderRow icon={<Zap className="h-4 w-4 text-yellow-500" />} label={`Megújuló energia: ${renewablePct}%`} value={renewablePct} min={0} max={100} step={5} onChange={setRenewablePct} />
          </div>

          {/* Eredmények */}
          <div className="space-y-3">
            <ImpactResult
              label="Éves közlekedési CO₂"
              value={`${impacts.totalTransportCo2Kg} kg CO₂/év`}
              subtext="Az Ön teljes közlekedési karbonlábnyoma"
              good={impacts.totalTransportCo2Kg < 500}
            />
            <ImpactResult
              label="Ha BKK-ra vált autó helyett"
              value={`−${impacts.co2SavedIfBKK} kg CO₂/év`}
              subtext={`≈ ${Math.round(impacts.co2SavedIfBKK / 22)} fa éves CO₂-megkötése`}
              good={impacts.co2SavedIfBKK > 0}
            />
            <ImpactResult
              label="Vízfogyasztás vs. bp. átlag"
              value={`${impacts.waterDiffPct > 0 ? '+' : ''}${impacts.waterDiffPct}%`}
              subtext={waterL < 118 ? 'Átlag alatt — példamutató' : 'Átlag felett — csökkentse a perlátorokkal'}
              good={impacts.waterDiffPct <= 0}
            />
            <ImpactResult
              label="Újrahasznosítás vs. bp. átlag"
              value={`${impacts.recyclingDiff > 0 ? '+' : ''}${impacts.recyclingDiff}%`}
              subtext={recyclingPct > 31.8 ? 'Átlag felett — nagyon jó!' : 'Átlag alatt — van mit javítani'}
              good={impacts.recyclingDiff >= 0}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SliderRow({ icon, label, value, min, max, step, onChange }: any) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} className="w-full" />
    </div>
  );
}

function ImpactResult({ label, value, subtext, good }: { label: string; value: string; subtext: string; good: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${good ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-bold ${good ? 'text-green-700' : 'text-amber-700'}`}>{value}</p>
      <p className="text-xs text-slate-500">{subtext}</p>
    </div>
  );
}
```

---

## Supabase séma

```sql
-- Supabase migrációs fájl: 20240521_budapest_indicators.sql

-- Budapest indikátor pillanatkép — évente feltöltendő, verziózott
CREATE TABLE public.budapest_indicator_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id  TEXT NOT NULL,                 -- pl. 'air-quality', 'noise', stb.
  value         NUMERIC(10, 3) NOT NULL,
  recorded_year SMALLINT NOT NULL,
  source_url    TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (indicator_id, recorded_year)
);

COMMENT ON TABLE public.budapest_indicator_snapshots IS
  'EU Zöld Főváros indikátorok éves városszintű Budapest értékei. Forrás: KSH, EEA, BKK, Budapest Főváros Zöldjelentés.';

-- Budapest kerület indikátor értékek és rangsor
CREATE TABLE public.district_indicator_scores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id   SMALLINT NOT NULL,            -- 1–23 (Budapest kerületek)
  indicator_id  TEXT NOT NULL,
  score         NUMERIC(10, 3) NOT NULL,
  rank_in_city  SMALLINT,                     -- 1 = legjobb, 23 = legrosszabb
  recorded_year SMALLINT NOT NULL,
  source_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (district_id, indicator_id, recorded_year)
);

COMMENT ON TABLE public.district_indicator_scores IS
  'Kerületszintű indikátor értékek és rangsorok (1–23). Lehetővé teszi a kerület vs. Budapest átlag összehasonlítást.';

-- RLS: nyilvánosan olvasható, csak service_role írhat
ALTER TABLE public.budapest_indicator_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read budapest_indicator_snapshots"
  ON public.budapest_indicator_snapshots FOR SELECT USING (true);

ALTER TABLE public.district_indicator_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read district_indicator_scores"
  ON public.district_indicator_scores FOR SELECT USING (true);

-- Index a gyors kerület + indikátor + év lekérdezéshez
CREATE INDEX idx_district_indicator_scores_district_year
  ON public.district_indicator_scores (district_id, recorded_year);

CREATE INDEX idx_budapest_indicator_snapshots_indicator_year
  ON public.budapest_indicator_snapshots (indicator_id, recorded_year DESC);
```

---

## Crazy Innovation UI — City Health HUD (Városegészségügyi Vezérlőpult)

### A „City Health HUD" koncepció

A standard dashboard helyett egy **cinematic, sci-fi vezérlőtermi élmény** — mintha Budapest egy élő szuperorganizmus lenne, és a panellako.hu lakói a város vitális jeleit monitorozó orvoscsapat tagjai lennének.

#### Belépési animáció — „Power On Sequence"

Amikor a felhasználó megnyitja a „Város" tabot, egy 1,8 másodperces boot-animáció játszódik le:
- Fekete háttér, majd zöld scan-vonal söpör végig a képernyőn (CSS `clip-path` animációval)
- `BUDAPEST CITY HEALTH MONITORING SYSTEM v2030` felirat jelenik meg monospace betűkkel, karakterenként kirajzolva (typewriter effect, `framer-motion`)
- Az indikátor-kártyák alulról fadeIn-nel rakódnak be, 80ms-os stagger delayekkel kerületenként

#### Vital Signs Panel — élő EKG-vonalak

Az oldal tetején egy teljes szélességű, sötét (slate-950) panel fut, amelyen 11 párhuzamos, folyamatosan animált EKG-szerű hullámvonal fut egymás alatt. Minden vonal egy-egy EU indikátort jelképez:

- A vonalak 8 másodperces ciklus alatt egyszer végigfutnak (CSS `@keyframes` + `animation: ecgPulse 8s linear infinite`)
- A vonal amplitúdója az indikátor aktuális értékének az EU-küszöbhöz viszonyított távolságával arányos — minél kritikusabb, annál nagyobb az amplitúdó és annál pirosabb a vonal
- Kritikus indikátornál (piros státusz) a vonal pulzáló piros glowt kap (`box-shadow: 0 0 8px #ef4444, 0 0 20px #ef444480`)
- A 11 vonal látványosan összekapcsolódik egy összesített „Budapest Health Signal"-lá a jobb oldalon, ahol a `healthScore` érték animálva frissül

```typescript
// Minta: CSS keyframes az EKG vonalhoz
const ekg_css = `
@keyframes ecgPulse {
  0%   { stroke-dashoffset: 1000; }
  100% { stroke-dashoffset: 0; }
}
.ekg-line {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: ecgPulse 8s linear infinite;
}
.ekg-critical {
  stroke: #ef4444;
  filter: drop-shadow(0 0 4px #ef4444);
  animation: ecgPulse 3s linear infinite; /* gyorsabb kritikusnál */
}
`;
```

#### Budapest Health Score — holografikus gömb

A bal felső sarokban egy 200×200px SVG-alapú holografikus gömb mutatja a `healthScore` aggregált értéket (0–100). A gömb:

- Forgó, áttetsző gömb-rács (wireframe sphere) — 60fps CSS 3D transzformációval
- A gömb belső kitöltése a score-tól függő szín: 0–40 = piros, 41–65 = amber, 66–100 = zöld
- A score szám a gömb közepén jelenik meg, fehér, 48px bold monospace betűkkel
- Hover-re a gömb megáll, és egy tooltip mutatja: „11 indikátor súlyozott átlaga az EU Zöld Főváros küszöbértékekhez képest"

#### Indicator Alert System — piros pulzáló riasztás

Ha egy indikátor `status === 'poor'`, az indikátorkártya:

- Sötétvörös (slate-900 + red-950) hátteret kap
- Folyamatos, 2 másodperces pulzáló piros glow-effektet (`box-shadow: 0 0 0 2px #ef4444`)
- A kártya fejlécén egy `ALERT` badge jelenik meg villogó animációval
- A panel bal szélén egy függőleges piros csík fut végig (akár egy kritikus sáv az orvosi monitoron)
- Az összes ilyen kártya automatikusan előre kerül a grid-ben (CSS `order: -1`)

#### City Thermal Map — kerülettérkép overlay

A Districts tab helyett egy interaktív hőtérkép jelenik meg — Budapest SVG alaprajza, kerületenkénti hőszínezéssel:

- Minden kerület kitöltési színe az aktívan kiválasztott indikátor kerületi értékéhez igazodik (zöld–sárga–piros gradiens)
- Hover-re egy floating tooltip mutatja a kerület nevét, az indikátor értékét, a rangsort (pl. „XIV. kerület — 3. helyezett hulladékgazdálkodásban")
- A felhasználó kerülete `stroke-width: 3px` vastag fehér kerettel kiemelve
- Indikátort váltva a kerületek színei 300ms-os smooth transition-nel váltanak át

#### Temporal Control Strip — idő-szelektor

A dashboard alján egy vízszintes sáv fut: egy horizontális timeline 2015–2030 között, draggable thumbmal. Ahogy a felhasználó húzza a thumbot, az összes indikátor értéke és a sparkline-ok animálva frissülnek, megmutatva Budapest aktuális értékét abban az évben. A jövőbe húzva a projected értékek jelennek meg, enyhe blur-effekttel megkülönböztetve a tényleges adatoktól.

```typescript
// Időcsúszka logika — minden adat az adott évre szűrve
const getValueForYear = (indicator: BudapestIndicator, year: number): number => {
  const point = indicator.historicalSeries.find((p) => p.year === year);
  if (point) return point.value;
  // Interpoláció ha nincs pont az adott évre
  const before = indicator.historicalSeries.filter((p) => p.year < year).at(-1);
  const after = indicator.historicalSeries.find((p) => p.year > year);
  if (!before || !after) return indicator.currentValue;
  const ratio = (year - before.year) / (after.year - before.year);
  return before.value + ratio * (after.value - before.value);
};
```

---

## Thesis kapcsolat

### Budapest 2030 stratégiai hivatkozások a szakdolgozatból

A szakdolgozat a Budapest 2030 stratégiát két különálló kontextusban tárgyalja, mindkettő közvetlenül megjelenik ebben a feature-ben:

**1. Kerékpáros és fenntartható közlekedés kontextusa:**
A szakdolgozat explicit módon megemlíti: *„Budapest városfejlesztési stratégiája kiemelten foglalkozik a kerékpáros infrastruktúra fejlesztésével"* — ez közvetlenül a Feature 11 helyi közlekedés indikátorában jelenik meg (jelenlegi 54,3% tömegközlekedési modal share, 2030-as cél: 65%).

**2. Zöldfelület-fejlesztési kontextus:**
A szakdolgozat NDVI-elemzése és a WHO 9 m²/fő zöldfelület-ajánlásra való hivatkozása közvetlenül a „Természet és biodiverzitás" indikátor tárgyalásában jelenik meg, ahol a szakdolgozat megállapítja, hogy a belváros kerületek drámaian elmaradnak az ajánlástól.

### EU Zöld Főváros kritériumok a szakdolgozatban

A szakdolgozat tárgyalja az EU Zöld Főváros díj pályázati keretrendszerét a zöld városok indikátorainak meghatározásában, különösen:

- **Levegőminőség fejezet**: A szakdolgozat az EU 2008/50/EK irányelvben meghatározott PM2.5 és NO₂ határértékeket alkalmazza Budapest mérőállomás-adatainak értékelésére — ezek az értékek az EU Zöld Főváros levegőminőség kritérium küszöbértékeivel azonosak.
- **Zaj fejezet**: A stratégiai zajtérkép és a 2002/49/EK irányelv szerinti Lden/Lnight értékek a zajindikátor közvetlen adatalapját képezik.
- **Területhasználat fejezet**: A CORINE Land Cover adatbázis és az impervious surface percentage vizsgálat közvetlenül a területhasználati indikátorhoz kapcsolódik.

---

## End-to-end verifikáció és szélső esetek

### Hibamodell és adatfrissesség kezelése

**1. Elavult adatok jelzése**

```typescript
// lib/data-freshness.ts
const DATA_STALENESS_THRESHOLD_YEARS = 2;

export function isDataStale(lastUpdatedYear: string): boolean {
  const currentYear = new Date().getFullYear();
  return currentYear - parseInt(lastUpdatedYear) > DATA_STALENESS_THRESHOLD_YEARS;
}

// Komponensben:
{isDataStale(indicator.lastUpdated) && (
  <Badge variant="outline" className="border-amber-300 text-amber-600 text-xs">
    Adat: {indicator.lastUpdated} — frissítés szükséges
  </Badge>
)}
```

**2. Kerületi adat hiányának kezelése**

Ha egy épület kerületéhez nincs `district_indicator_scores` adat egy adott indikátorra, a komponens:
- Budapesti átlagértéket mutat szürke szövegszínnel
- `n/a — kerületi adat nem elérhető` szövegdel jelzi a hiányt
- A rangsornál az adott kerület ki van szürkítve, és nem kap rangszámot

**3. API hibák, offline mód**

```typescript
// app/w/[workspaceId]/varos/page.tsx
export default async function VarosPage({ params }: { params: { workspaceId: string } }) {
  try {
    const res = await fetch(`/api/budapest-indicators?district_id=${districtId}`, {
      next: { revalidate: 86400 }, // 24 órás ISR cache
    });
    if (!res.ok) throw new Error('API hiba');
    const data = await res.json();
    return <Budapest2030Dashboard {...data} />;
  } catch {
    // Graceful fallback: statikus adatokból renderel, figyelmeztetéssel
    return (
      <>
        <DataStalenessWarning message="Nem sikerült az élő adatok betöltése. Statikus 2023-as adatokat mutatunk." />
        <Budapest2030Dashboard indicators={budapest2030Data.indicators} pillars={budapest2030Data.pillars} cityComparison={budapest2030Data.cityComparison} districtId={defaultDistrictId} districtName="Ismeretlen kerület" />
      </>
    );
  }
}
```

**4. Mobilnézet ellenőrzési checklist**

- [ ] Az 11 kártya mobilon 1 oszlopos elrendezésben jelenik meg
- [ ] A RadarChart mobilon is olvasható (min. 280px szélesség)
- [ ] A slider-ek touch-inputra megfelelően reagálnak
- [ ] A timeline chart horizontálisan scrollolható ha szükséges (`overflow-x: auto`)
- [ ] A City Health Score gömb animáció 60fps mobilon is (`will-change: transform`)

**5. Hozzáférhetőség (a11y)**

- Minden Recharts chart rendelkezik `aria-label` attribútummal
- A státuszjelzők (jó/közepes/kritikus) nem csak színnel, hanem szövegesen is kommunikálnak
- A slider-ek billentyűzettel (arrow keys) is kezelhető értékeket adnak
- A „City Health HUD" animációk kikapcsolhatók `prefers-reduced-motion: reduce` esetén

---

## Implementációs lépések

### Fázis 1 — Statikus alapstruktúra (2–3 nap)

1. Létrehozni a `lib/budapest-2030-data.ts` fájlt a teljes statikus adatstruktúrával (mind a 11 indikátor, 5 pillér, 5 városos összehasonlítás)
2. Létrehozni az `app/api/budapest-indicators/route.ts` endpointot, amely kiszolgálja a statikus adatokat (Supabase nélkül is működő fallback)
3. Létrehozni az alapoldalt: `app/w/[workspaceId]/varos/page.tsx`
4. Implementálni a `Budapest2030Dashboard` főkomponenst tabokkal
5. Lokalizáció: `src/i18n/resources/en.ts` és `src/i18n/resources/hu.ts` bővítése a `budapest2030.*` kulcsokkal

### Fázis 2 — Indikátor-kártyák és sparkline-ok (2–3 nap)

6. Implementálni az `EuGreenCapitalIndicatorCard` komponenst a teljes adatmegjelenítéssel
7. Recharts sparkline-ok minden kártyán
8. ResidentActions panel kibontható logikával
9. Progress bar a 2030-as célhoz

### Fázis 3 — Haladtabb vizualizációk (3–4 nap)

10. `CityComparisonRadar` RadarChart implementálása (5 város, 11 dimenzió)
11. `PersonalImpactCalculator` slider-alapú kalkulátor
12. `PillarProgressCard` (5 pillér, al-célokkal)
13. `DistrictRankingPanel` (23 kerület, filterezhető)
14. `IndicatorTimelineChart` (tényleges + projektált adatok, referenciavonal)

### Fázis 4 — Supabase integráció (1–2 nap)

15. Supabase migráció lefuttatása (`budapest_indicator_snapshots`, `district_indicator_scores` táblák)
16. API endpoint frissítése a Supabase snapshot-okból való felülírással
17. ISR cache konfigurálása (86400 másodperc = 24 óra)

### Fázis 5 — City Health HUD (3–5 nap, opcionális)

18. Boot animáció és typewriter effect implementálása Framer Motion-nel
19. EKG vital signs panel CSS animációkkal
20. Budapest SVG hőtérkép kerületi adatokkal
21. Temporal Control Strip idő-szelektor implementálása
22. Holografikus Health Score gömb SVG animációval
23. Teljes a11y audit és `prefers-reduced-motion` kezelés

### Fázis 6 — QA, teljesítmény, tesztelés (1–2 nap)

24. Lighthouse audit (Core Web Vitals): LCP, CLS, FID értékek ellenőrzése
25. Mobilnézet valós eszközön való ellenőrzése
26. Hibaüzenetek és fallback állapotok tesztelése
27. Lokalizáció ellenőrzése: minden szöveg hu.ts-ből érkezik-e, nincs-e hardcoded magyar szöveg
28. CHANGELOG.md és versioning/*.md fájl létrehozása

---

## Lokalizáció — szükséges kulcsok

Az alábbi kulcsokat kell hozzáadni az `src/i18n/resources/en.ts` és `src/i18n/resources/hu.ts` fájlokhoz:

```typescript
// hu.ts (részlet)
budapest2030: {
  title: 'Budapest 2030 — Városi Egészség Monitor',
  subtitle: 'Az Ön kerülete: {{district}} | EU Zöld Főváros nyomkövető',
  cityHealthScore: 'Városegészség-index',
  statusGood: 'jó mutatón',
  statusModerate: 'közepes mutatón',
  statusPoor: 'kritikus mutatón',
  tab: {
    indicators: 'EU Indikátorok',
    pillars: '2030 Pillérek',
    districts: 'Kerületek',
    compare: 'EU Összehasonlítás',
    calculator: 'Hatáskalkulátor',
  },
  trend: {
    improving: 'Javuló',
    stable: 'Stabil',
    worsening: 'Romló',
  },
  progressTo2030: '2030-as cél előrehaladása',
  currentValue: 'Jelenlegi',
  target2030: 'Cél 2030',
  whatCanIDo: 'Mit tehetek?',
  residentActions: 'Lakói cselekvési lehetőségek',
  dataSource: 'Adatforrás',
  cityComparison: {
    title: 'Budapest vs. EU-fővárosok (11 dimenzió)',
    subtitle: 'Normalizált 0–100 pontos skálán (100 = legjobb EU teljesítmény)',
    note: 'Forrás: EEA Smart City profiles, Eurostat Urban Audit, saját számítás (2022–2023)',
  },
  calculator: {
    title: 'Személyes Hatáskalkulátor',
    subtitle: 'Mennyi CO₂-t, vizet és hulladékot termel Ön naponta? Hogyan viszonyul ez a Budapest 2030-as célokhoz?',
  },
},
```

---

## Valós adatforrások és évenkénti frissítési protokoll

| Indikátor | Forrás | Frissítési ciklus | Elérési URL |
|-----------|--------|-------------------|-------------|
| Levegőminőség | OLM / EEA AirBase | Évente (február) | levegominoseg.hu |
| Zajszennyezés | Budapest Zajtérkép (BFKH) | 5 évente (EU direktíva) | budapest.hu/zajterkep |
| Hulladék | KSH Környezetstatisztika | Évente (november) | ksh.hu/stadat |
| Zöldfelület | Lechner Tudásközpont | 2 évente | lechnerkozpont.hu |
| Vízfogyasztás | Fővárosi Vízművek | Évente | vizmuvek.hu |
| Ökoinnovációs fog. | KSH + Eurostat | Évente | ksh.hu / ec.europa.eu/eurostat |
| Helyi közlekedés | BKK Éves Jelentés | Évente (március) | bkk.hu/fejlesztesek |
| CO₂ | EEA Urban Audit | Évente | eea.europa.eu |
| Energia | MEKH | Negyedévente | mekh.hu/statisztikak |
| Területhasználat | CORINE / Lechner | 3 évente | eea.europa.eu/corine |
| Irányítás | Eurostat / OECD | Évente | ec.europa.eu/smartcities |

---

*Prompt fájl vége — Feature 11: Budapest 2030 Stratégiai Indikátorok Dashboard*
