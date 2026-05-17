# FEATURE PROMPT 01 — Levegőminőség-figyelő Widget és Riasztási Rendszer

## Áttekintés és motiváció (a szakdolgozat alapján)

A panellako.hu webapp elsősorban lakóközösségek számára nyújt digitális megoldásokat. A panelházakban élők életminőségét közvetlenül befolyásolja a közvetlen lakókörnyezetük levegőminősége — ezt a tényt a csatolt geoinformatikai szakdolgozat különösen hangsúlyosan tárgyalja.

A szakdolgozat (SZTE, Természettudományi és Informatikai Kar, 2020) részletesen bemutatja, hogy Budapest 12 automata mérőállomása hogyan méri folyamatosan a levegő összetételét, és ezek az adatok hogyan állnak kapcsolatban a lakóterületek beépítettségével, a forgalmi viszonyokkal és a zöldfelület-arányokkal. A tanulmány kulcskövetkeztetése: *„Ahogy láthattuk mennyi különböző féle légszennyező kerül a levegőbe mind természetes mind mesterséges úton, milyen káros hatást gyakorol mind az élő szervezetre mind az épített környezetünkre, elengedhetetlen a levegőminőség folyamatos megfigyelése, elemzése, és szükség esetén óvintézkedések megtétele."*

A mért fő légszennyező anyagok, amelyeket az OLM (Országos Légszennyezettségi Mérőhálózat) folyamatosan monitoroz:
- **O₃ (Ózon)** — szemirritáló, mérgező a légutakra, főleg napsütéses időben emelkedik
- **NO₂ (Nitrogén-dioxid)** — közlekedéstől eredő, lakott területeken 80%-ban forgalomból
- **SO₂ (Kén-dioxid)** — ipari és dízelmotoros forrásból, savas esőt okoz
- **CO (Szén-monoxid)** — tökéletlen égésből, szagtalan, halálos lehet magas koncentrációban
- **PM10 és PM2.5 (Szálló por)** — szív- és légzőrendszeri betegségek fő okozói
- **VOC (Illékony szerves szénhidrogének)** — benzol, toluol, kankarin, fotokémiai smog prekurzorok

A szakdolgozat különösen kiemeli, hogy *„a hivatalos mérőállomásokon rögzített eredmények bizonyos esetekben nem mérvadóak, mérései nem tükrözik a teljes városra jellemző levegőminőséget"* — például a Blaha Lujza téri buszmegállóban mért NO₂ szintek többszörösei voltak az 1,3 km-re lévő Erzsébet téren mérteknek, a zsúfolt buszmegálló tér közelségéből eredően.

Ez a felismerés közvetlen relevanciával bír a panelházas lakóközösségek számára: egy forgalmas utca melletti lakótömb teljesen más levegőminőségi kihívásokkal szembesül, mint egy park melletti épület — és az ott élő lakóknak joguk van ezt tudni és cselekedni.

---

## A fejlesztendő feature teljes műszaki specifikációja

### Feature neve: **Levegőminőség-figyelő Widget + Riasztási Modul**
### Helye az alkalmazásban: Dashboard overview szekció, és értesítési rendszer
### Prioritás: MAGAS (közvetlen egészségügyi relevanciájú)

---

## 1. Funkcionális követelmények

### 1.1 Dashboard Widget (Fő komponens)

A dashboard overview szekciójában, az időjárás-widget szomszédságában, egy kompakt levegőminőség-widget jelenik meg, amely tartalmazza:

**Aktuális AQI (Air Quality Index) értéket** — magyarul „Levegőminőségi Index" (LMI) — 0–500-as skálán, amelyet a legközelebbi OLM mérőállomás adataiból számítunk. Az AQI számítás az EPA (US Environmental Protection Agency) szabványos módszertanát követi, adaptálva a magyar OLM által mért komponensekre.

AQI kategóriák:
| AQI érték | Kategória | Szín | Magyar megnevezés |
|-----------|-----------|------|-------------------|
| 0–50 | Good | Zöld (#22c55e) | Jó |
| 51–100 | Moderate | Sárga (#eab308) | Mérsékelt |
| 101–150 | Unhealthy for Sensitive Groups | Narancssárga (#f97316) | Érzékenyek számára káros |
| 151–200 | Unhealthy | Vörös (#ef4444) | Egészségtelen |
| 201–300 | Very Unhealthy | Lila (#a855f7) | Nagyon egészségtelen |
| 301–500 | Hazardous | Bíbor (#7f1d1d) | Veszélyes |

**Részletes komponensek** (bővíthető panel):
- PM2.5 (µg/m³)
- PM10 (µg/m³)
- NO₂ (µg/m³)
- O₃ (µg/m³)
- SO₂ (µg/m³)
- CO (mg/m³)

**Forrásállomás információ**:
- Az épület GPS koordinátái alapján a legközelebbi OLM mérőállomás neve és típusa (városi háttér / forgalmi / ipari)
- Légvonalbeli távolság az állomástól (km)
- Mérés időpontja (pl. „frissítve: 14:00-kor")

**Trend mutató**:
- Utolsó 6 óra trendje (javul / romlik / stabil)
- Mini sparkline grafikon (SVG alapú, hasonló az időjárás-widgethez)

### 1.2 Részletes Levegőminőség Panel (kibontható)

Amikor a felhasználó a widgetre kattint, megnyílik egy teljes panel (modal vagy slide-over) az alábbi tartalommal:

**24 órás előzmény grafikon** — minden mért komponensre külön vonal, Chart.js vagy Recharts könyvtárral, időtengelyen.

**7 napos napi átlag** — mini bar chart (napi max AQI értékek)

**Egészségügyi tanácsok** az aktuális AQI-szint alapján:
- `<50`: „Ideális szabadtéri tevékenységre"
- `51–100`: „Érzékenyek számára javasolt a hosszabb szabadtéri tartózkodás csökkentése"
- `101–150`: „Asztmásoknak, szívbetegeknek és gyermekeknek ajánlott maradni benn"
- `151–200`: „Mindenki számára kerülendő a hosszabb szabadtéri tartózkodás. Ablakok csukva tartása ajánlott."
- `>200`: „Veszélyes szint! Maradjanak bent, szellőztetés csak szükség esetén."

**Közelségi összehasonlítás**: A jelenlegi épület közelségi „hátrányait" vagy előnyeit mutató összehasonlítás más mérőállomások értékeivel Budapest területén.

**idokep.hu / levegominoseg.hu** külső link gomb (hasonlóan a jelenlegi időjárás-widgetben lévő idokep linkhez) — az OLM hivatalos oldalára vezet.

### 1.3 Riasztási Modul

**Push-értesítések** (a meglévő WebPush infrastruktúrán keresztül, amely már létezik az alkalmazásban):
- Küszöbértékalapú riasztás: ha az AQI meghaladja a felhasználó által beállított küszöböt (pl. 100-as szint), értesítést kap
- Reggeli összefoglaló értesítés (opcionális, beállítható): „Ma a levegőminőség: Jó (AQI 42)"
- Extrém esemény riasztás: ha AQI > 150, azonnali értesítés minden, az épülethez tartozó felhasználónak

**Házon belüli, közösségi riasztási szint**: Ha elég lakó kapcsolja be az értesítéseket (pl. >50%), az épület kezelője (admin) kap összesítő értesítést heti rendszerességgel az átlagos levegőminőségről.

**Email értesítés** (a meglévő Brevo-alapú email rendszeren keresztül): Heti levegőminőség-összesítő a kezelőnek, amely tartalmaz akciós javaslatokat (pl. szellőztetési időpontok optimalizálása).

---

## 2. Technikai architektúra

### 2.1 Adatforrás és API integráció

**Elsődleges adatforrás: OpenAQ API v3**
- URL: `https://api.openaq.org/v3/`
- Endpoint: `GET /v2/locations?coordinates={lat},{lon}&radius=10000&limit=5&order_by=distance`
- A legközelebbi 5 mérőállomást adja vissza GPS-koordináta alapján
- Ingyenes, nincs API key korlát az alap tier-en (500 req/nap, amely elegendő 30 perces cache-eléssel)
- Visszaadja: location_id, name, coordinates, sensors array (parameter neve, unit, last_value, last_updated)

**Másodlagos adatforrás: levegominoseg.hu (OLM)**
- URL: `http://levegominoseg.hu/automata-merohalozat`
- Az OLM nem rendelkezik nyilvános REST API-val, de scrapelhető JSON végpont létezik:
  `http://www.levegominoseg.hu/app/uploads/data/OLMallomasok.json`
- Tartalmaz: állomás ID, név, koordináták, aktuális mért értékek komponensenként
- Cache idő: 30 perc (ugyanolyan stratégia mint az időjárás-widgetnél)

**Fallback stratégia**: Ha mindkét forrás elérhetetlenné válik, az utolsó sikeres lekérdezés adatait jelenítjük meg megfelelő „Utoljára mért: X perce" jelzéssel.

### 2.2 Next.js API Route

**Fájl**: `app/api/air-quality/route.ts`

```typescript
import { NextResponse } from 'next/server';

const OPENAQ_BASE = 'https://api.openaq.org/v2';

// Cache struktúra (ugyanolyan mint a weather route-ban)
interface CacheEntry<T> { data: T; expires: number; }
let _aqCache: CacheEntry<AirQualityResult> | null = null;

export interface AQMeasurement {
  parameter: 'pm25' | 'pm10' | 'no2' | 'o3' | 'so2' | 'co';
  value: number;
  unit: string;
  lastUpdated: string;
}

export interface AirQualityResult {
  aqi: number;
  aqiCategory: 'good' | 'moderate' | 'unhealthy_sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous';
  aqiLabel: string;         // Magyar label
  color: string;            // Hex szín
  stationName: string;
  stationDistance: number;  // km
  measurements: AQMeasurement[];
  trend: 'improving' | 'worsening' | 'stable';
  fetchedAt: string;
}

// AQI számítás EPA módszertan szerint (adaptálva PM2.5-re mint fő indikátor)
function calculateAQI(pm25: number, pm10: number, no2: number, o3: number): number {
  // Egyszerűsített AQI számítás PM2.5 alapján (fő indikátor városokban)
  // Teljes implementáció: https://aqs.epa.gov/aqsweb/documents/codetables/aqi_breakpoints.html
  if (pm25 <= 12.0) return Math.round((50/12.0) * pm25);
  if (pm25 <= 35.4) return Math.round(50 + (50/23.4) * (pm25 - 12.1));
  if (pm25 <= 55.4) return Math.round(100 + (50/20.0) * (pm25 - 35.5));
  if (pm25 <= 150.4) return Math.round(150 + (50/94.9) * (pm25 - 55.5));
  if (pm25 <= 250.4) return Math.round(200 + (100/99.9) * (pm25 - 150.5));
  if (pm25 <= 500.4) return Math.round(300 + (200/249.9) * (pm25 - 250.5));
  return 500;
}

function getAQICategory(aqi: number) {
  if (aqi <= 50)  return { category: 'good' as const,               label: 'Jó',                    color: '#22c55e' };
  if (aqi <= 100) return { category: 'moderate' as const,           label: 'Mérsékelt',             color: '#eab308' };
  if (aqi <= 150) return { category: 'unhealthy_sensitive' as const, label: 'Érzékenyek számára káros', color: '#f97316' };
  if (aqi <= 200) return { category: 'unhealthy' as const,          label: 'Egészségtelen',         color: '#ef4444' };
  if (aqi <= 300) return { category: 'very_unhealthy' as const,     label: 'Nagyon egészségtelen',  color: '#a855f7' };
  return           { category: 'hazardous' as const,                label: 'Veszélyes',             color: '#7f1d1d' };
}

export async function GET(request: Request) {
  // Ha van érvényes cache, visszaadjuk azt
  if (_aqCache && _aqCache.expires > Date.now()) {
    return NextResponse.json(_aqCache.data);
  }

  // Az épület koordinátái a Supabase-ből jönnének ideálisan,
  // de egyelőre a building_address geocoding-jára alapozunk,
  // fallback: Budapest centrum (47.4979, 19.0402)
  const lat = 47.4979;
  const lon = 19.0402;

  try {
    const res = await fetch(
      `${OPENAQ_BASE}/locations?coordinates=${lat},${lon}&radius=15000&limit=3&order_by=distance`,
      { headers: { 'Accept': 'application/json' }, next: { revalidate: 1800 } }
    );

    if (!res.ok) throw new Error(`OpenAQ error: ${res.status}`);
    const data = await res.json();

    // Feldolgozás... (lásd teljes implementáció lentebb)
    const result = processOpenAQData(data, lat, lon);
    _aqCache = { data: result, expires: Date.now() + 30 * 60 * 1000 };
    return NextResponse.json(result);
  } catch (err) {
    console.error('[air-quality] API error:', err);
    return NextResponse.json(getMockAirQuality());
  }
}
```

**Fontos**: Az API route-ot a `WeatherWidget`-hez hasonlóan kell kialakítani — 30 perces szerver-oldali cache-eléssel, mock adatokkal fallback esetén, és a `WeatherResult`-hoz analóg `AirQualityResult` interface-szel.

### 2.3 Supabase séma kiegészítés

Az épülethez kötött levegőminőség-adatok perzisztálásához és értesítési preferenciák tárolásához az alábbi táblák szükségesek:

```sql
-- Épülethez legközelebbi OLM állomás nyilvántartása
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS nearest_aq_station_id TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS nearest_aq_station_name TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS nearest_aq_station_distance_km NUMERIC(5,2);

-- Felhasználói riasztási preferenciák
CREATE TABLE IF NOT EXISTS air_quality_alert_prefs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  aqi_threshold INTEGER NOT NULL DEFAULT 100,  -- Figyelmeztetési küszöb
  daily_summary BOOLEAN NOT NULL DEFAULT false, -- Reggeli összefoglaló
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, building_id)
);

-- Historikus adatok tárolása (opcionális, jövőbeni analitikához)
CREATE TABLE IF NOT EXISTS air_quality_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id  UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  aqi          INTEGER NOT NULL,
  pm25         NUMERIC(6,2),
  pm10         NUMERIC(6,2),
  no2          NUMERIC(6,2),
  o3           NUMERIC(6,2),
  station_id   TEXT,
  station_name TEXT
);

-- Index a hatékony lekérdezéshez
CREATE INDEX IF NOT EXISTS idx_aq_history_building_time 
  ON air_quality_history(building_id, recorded_at DESC);

-- RLS policy
ALTER TABLE air_quality_alert_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prefs" ON air_quality_alert_prefs
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE air_quality_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Building members can read history" ON air_quality_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      JOIN buildings b ON b.workspace_id = wm.workspace_id
      WHERE b.id = building_id AND wm.user_id = auth.uid()
    )
  );
```

### 2.4 Geocoding az épület koordinátáihoz

Az épület `building_address` mezőjéből koordinátákat kell nyerni a legközelebbi mérőállomás meghatározásához. Ezt a Nominatim (OpenStreetMap) ingyenes geocoding API-val végezzük:

```typescript
// lib/geocoding.ts
export async function geocodeHungarianAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  const encoded = encodeURIComponent(address + ', Magyarország');
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
    { headers: { 'User-Agent': 'panellako.hu/1.0' } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.[0]) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}
```

Ezt az adatot egyszer számítjuk ki (épület létrehozásakor vagy cím módosításakor) és tároljuk a `buildings` táblában `lat`, `lon` oszlopokban. A cache elkerüli a felesleges geocoding hívásokat.

---

## 3. Frontend komponensek

### 3.1 `AirQualityWidget` komponens

**Fájl**: `components/air-quality-widget.tsx`

A komponens szerkezete a `WeatherWidget`-hez hasonló:

```tsx
'use client';

import { useEffect, useState } from 'react';
import type { AirQualityResult } from '@/app/api/air-quality/route';

// AQI category → Tailwind szín osztályok leképezése
const AQI_COLORS = {
  good:               { bg: 'bg-emerald-500',  text: 'text-emerald-400',  ring: 'ring-emerald-500/30' },
  moderate:           { bg: 'bg-yellow-500',   text: 'text-yellow-400',   ring: 'ring-yellow-500/30'  },
  unhealthy_sensitive:{ bg: 'bg-orange-500',   text: 'text-orange-400',   ring: 'ring-orange-500/30'  },
  unhealthy:          { bg: 'bg-red-500',       text: 'text-red-400',      ring: 'ring-red-500/30'     },
  very_unhealthy:     { bg: 'bg-purple-500',   text: 'text-purple-400',   ring: 'ring-purple-500/30'  },
  hazardous:          { bg: 'bg-rose-950',      text: 'text-rose-300',     ring: 'ring-rose-900/30'    },
};

// Egészségügyi tanácsok AQI szint szerint
const HEALTH_ADVICE = {
  good:               'Kiváló levegőminőség. Ideális a szabadtéri tevékenységekhez.',
  moderate:           'Elfogadható. Érzékeny személyek hosszabb szabadtéri tartózkodása nem javasolt.',
  unhealthy_sensitive:'Asztmásoknak, szívbetegeknek és gyermekeknek nem javasolt a hosszabb kint tartózkodás.',
  unhealthy:          'Kerülje a hosszabb szabadtéri tartózkodást! Ablakok csukva tartása ajánlott.',
  very_unhealthy:     'Veszélyes! Maradjanak bent. Szellőztetés csak szükség esetén.',
  hazardous:          'VÉSZHELYZET szintű szennyezettség. Ne hagyja el otthonát!',
};

export default function AirQualityWidget() {
  const [aq, setAq] = useState<AirQualityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/air-quality')
      .then(r => r.json())
      .then(d => { setAq(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 animate-pulse">
        <div className="h-12 w-12 rounded-full bg-white/10" />
        <div className="h-4 w-20 rounded bg-white/10" />
      </div>
    );
  }

  if (!aq) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-slate-500">Levegőminőség nem elérhető</p>
      </div>
    );
  }

  const colors = AQI_COLORS[aq.aqiCategory];
  const advice = HEALTH_ADVICE[aq.aqiCategory];

  return (
    <div className="flex h-full flex-col items-center">
      {/* AQI szám és kategória */}
      <div className={`relative flex h-16 w-16 items-center justify-center rounded-full ring-4 ${colors.ring} mb-2`}>
        <div className={`absolute inset-0 rounded-full ${colors.bg} opacity-20`} />
        <span className={`text-2xl font-black tabular-nums ${colors.text}`}>{aq.aqi}</span>
      </div>

      <p className={`text-[10px] font-bold uppercase tracking-widest ${colors.text} mb-0.5`}>
        {aq.aqiLabel}
      </p>

      {/* Állomás neve + távolsága */}
      <p className="mb-2 text-[8px] text-slate-600 text-center leading-tight">
        {aq.stationName} · {aq.stationDistance.toFixed(1)} km
      </p>

      {/* Egészségügyi tanács */}
      <p className="text-center text-[8px] text-slate-500 leading-tight px-1 mb-2">
        {advice}
      </p>

      {/* Komponensek mini-lista */}
      <div className="w-full grid grid-cols-2 gap-x-2 gap-y-0.5 border-t border-white/10 pt-2">
        {aq.measurements.slice(0, 4).map(m => (
          <div key={m.parameter} className="flex items-center justify-between">
            <span className="text-[8px] text-slate-600 uppercase">{m.parameter}</span>
            <span className="text-[8px] font-bold text-slate-400 tabular-nums">{m.value.toFixed(1)}</span>
          </div>
        ))}
      </div>

      {/* Részletek gomb */}
      <button
        onClick={() => setExpanded(true)}
        className="mt-2 text-[8px] text-slate-600 hover:text-slate-400 transition-colors"
      >
        részletek →
      </button>

      {/* Részletes modal — akkor nyílik, ha expanded=true */}
      {expanded && <AirQualityDetailModal aq={aq} onClose={() => setExpanded(false)} />}
    </div>
  );
}
```

### 3.2 `AirQualityDetailModal` komponens

A modal komponens az összes mért adat részletes megjelenítéséért felelős, beleértve a 24 órás trendgrafikont (Recharts LineChart) és a teljes komponens-táblázatot.

```tsx
function AirQualityDetailModal({ aq, onClose }: { aq: AirQualityResult; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-white/10 p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-500 hover:text-white">✕</button>

        <h2 className="text-lg font-black text-white mb-1">Levegőminőség részletei</h2>
        <p className="text-xs text-slate-500 mb-4">
          Adatforrás: {aq.stationName} · {aq.stationDistance.toFixed(1)} km
          · Frissítve: {new Date(aq.fetchedAt).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
        </p>

        {/* Komponens táblázat */}
        <table className="w-full text-xs mb-4">
          <thead>
            <tr className="text-slate-600 text-[10px] uppercase">
              <th className="text-left pb-1">Komponens</th>
              <th className="text-right pb-1">Mért érték</th>
              <th className="text-right pb-1">Egység</th>
              <th className="text-right pb-1">WHO limit</th>
            </tr>
          </thead>
          <tbody>
            {aq.measurements.map(m => (
              <tr key={m.parameter} className="border-t border-white/5">
                <td className="py-1.5 font-bold text-slate-300">{m.parameter.toUpperCase()}</td>
                <td className="text-right tabular-nums text-white">{m.value.toFixed(2)}</td>
                <td className="text-right text-slate-500">{m.unit}</td>
                <td className="text-right text-slate-600">{WHO_LIMITS[m.parameter] ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Egészségügyi tanács */}
        <div className={`rounded-2xl p-3 ${AQI_COLORS[aq.aqiCategory].ring} ring-1 bg-white/5`}>
          <p className="text-xs text-slate-300 leading-relaxed">
            🫁 {HEALTH_ADVICE[aq.aqiCategory]}
          </p>
        </div>

        {/* Külső link */}
        <a
          href="http://levegominoseg.hu"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block text-center text-[10px] text-slate-600 hover:text-slate-400"
        >
          Részletes adatok → levegominoseg.hu ↗
        </a>
      </div>
    </div>
  );
}
```

### 3.3 Dashboard integrációja

A `dashboard-client.tsx` overview szekciójában az időjárás-widget és a heatmap közé, vagy az időjárás-widget alá (ha szoros a hely) kerül be az `AirQualityWidget`:

```tsx
{/* Right: weather + air quality + ticket heatmap */}
<div className="flex gap-0 border-l border-white/10">

  {/* Weather panel */}
  <div className="w-44 shrink-0 border-r border-white/10 p-3">
    <WeatherWidget city={extractedCity} />
  </div>

  {/* Air Quality panel */}
  <div className="w-36 shrink-0 border-r border-white/10 p-3">
    <AirQualityWidget />
  </div>

  {/* Ticket activity heatmap */}
  <div className="p-4 min-w-[340px]">
    <TicketHeatmap tickets={tickets} />
  </div>
</div>
```

---

## 4. Riasztási modul implementáció

### 4.1 Server Action — értesítési preferencia mentése

```typescript
// app/actions/air-quality-alerts.ts
'use server';

import { createClient } from '@/lib/supabase/server';

export async function saveAirQualityAlertPref(
  buildingId: string,
  enabled: boolean,
  aqiThreshold: number,
  dailySummary: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nem vagy bejelentkezve' };

  const { error } = await supabase
    .from('air_quality_alert_prefs')
    .upsert({
      user_id: user.id,
      building_id: buildingId,
      enabled,
      aqi_threshold: aqiThreshold,
      daily_summary: dailySummary,
    }, { onConflict: 'user_id,building_id' });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
```

### 4.2 Cron Job / Scheduled Function (Supabase Edge Function)

A levegőminőség riasztásokat egy Supabase Edge Function végzi, amely a Supabase Cron-nal óránként fut:

```typescript
// supabase/functions/air-quality-alerts/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Levegőminőség lekérdezése OpenAQ-ról
  const aqRes = await fetch('https://panellako.hu/api/air-quality');
  const aq = await aqRes.json();

  // Felhasználók lekérdezése akiknek engedélyezett a riasztás és elérte a küszöböt
  const { data: prefs } = await supabase
    .from('air_quality_alert_prefs')
    .select('*, users(email)')
    .eq('enabled', true)
    .lte('aqi_threshold', aq.aqi);

  // Email küldés a Brevo rendszeren keresztül
  for (const pref of prefs ?? []) {
    await fetch('https://panellako.hu/api/internal/send-aq-alert', {
      method: 'POST',
      body: JSON.stringify({ userId: pref.user_id, aqi: aq.aqi, label: aq.aqiLabel }),
      headers: { 'Authorization': `Bearer ${Deno.env.get('INTERNAL_API_KEY')}` }
    });
  }

  return new Response('OK');
});
```

---

## 5. UX és vizuális design szempontok

### 5.1 Szín-konzisztencia az alkalmazással

Az alkalmazás jelenlegi dark theme-jébe (slate-950 háttér, white szöveg) illeszkedik a widget. Az AQI szintekhez tartozó színek nem ütköznek a meglévő brand-500 (teal) és rose-500 (jegyrendszer) színekkel.

### 5.2 Hozzáférhetőség (Accessibility)

- Minden szín-kódolt elem rendelkezik szöveges alternatívával (a kategória neve kiírva)
- A tooltip-ek és modal-ok keyboard-accessible módon záródnak (Escape gombra)
- Az ARIA label-ek megfelelőek: `aria-label="Levegőminőségi index: 45, Jó"`

### 5.3 Mobil UX

Mobilon az AQI widget kompakt formában jelenik meg (csak a szám és kategória), a részletes nézet bottom-sheet formájában nyílik (teljes képernyő aljáról felsiklóan).

### 5.4 Loading és error állapotok

- **Loading**: Animált skeleton shimmer (ugyanolyan mint a WeatherWidget betöltési állapota)
- **Hiba / nincs adat**: Halvány hibaüzenet, nem blokkolja az oldal többi részét
- **Régi adat**: „Utoljára frissítve X perce" figyelmeztetés, ha az adat >1 óra régi

---

## 6. Implementációs lépések és sorrend

### Sprint 1 (Backend):
1. `app/api/air-quality/route.ts` létrehozása OpenAQ integráció + cache
2. Supabase séma: `air_quality_alert_prefs` és `air_quality_history` táblák migrálása
3. Geocoding segédfüggvény (`lib/geocoding.ts`)

### Sprint 2 (Frontend alapok):
4. `components/air-quality-widget.tsx` — az alap widget megjelenítése
5. `components/air-quality-detail-modal.tsx` — részletes panel
6. Dashboard integrálás — helyfoglalás az overview szekcióban

### Sprint 3 (Értesítések):
7. Beállítási UI az AQI riasztásokhoz (a meglévő értesítési beállítások mellé)
8. Server Action: preferencia mentése
9. Supabase Edge Function: óránkénti cron ellenőrzés
10. Email sablon a Brevo-ra (react-email sablonnal)

### Sprint 4 (Finomítás):
11. Historikus adatok tárolása `air_quality_history` táblában
12. 24 órás trend grafikon (Recharts)
13. Heti összesítő email az épület kezelőjének

---

## 7. Adatvédelmi és jogi megfontolások

- Az OLM és OpenAQ adatok **nyilvánosan hozzáférhetők és ingyenesen felhasználhatók** nem kereskedelmi és kereskedelmi célra egyaránt.
- Az adatok forrását fel kell tüntetni: „Forrás: levegominoseg.hu / OpenAQ"
- A felhasználók GPS-koordinátái **soha nem kerülnek harmadik félhez** — csak az épület cím-geocodingjából eredő koordináták (nem valós idejű felhasználói pozíció) kerülnek lekérdezésre.
- A push értesítési preferenciák módosíthatók és törölhetők a felhasználói profil oldalán.

---

## 8. Tesztelési kritériumok

### Funkcionális tesztek:
- [ ] Az API route visszaad érvényes AirQualityResult objektumot
- [ ] Ha az OpenAQ API nem elérhető, mock adat kerül visszaadásra
- [ ] Az AQI számítás 100-nál ≤ PM2.5=35.4 esetén pontos
- [ ] A kategória-szín-tanács hármas következetes minden AQI szinten
- [ ] Az értesítési preferencia mentés sikeresen ír a Supabase-be
- [ ] A modal keyboard-accessible (Escape bezár, Tab navigál)

### Vizuális tesztek:
- [ ] A widget illeszkedik a `w-36` széles panelbe desktop nézetben
- [ ] Mobilon a kompakt nézet olvasható
- [ ] A loading skeleton hasonló méretű mint a betöltött tartalom (layout shift nincs)
- [ ] A szín-sémák kontraszta WCAG AA megfelel (min. 4.5:1)

### Integrációs tesztek:
- [ ] A dashboard overview szekció összes eleme (hero text, weather, AQ, heatmap) megfelelően elfér mobilon és desktopon
- [ ] Az értesítési preferencia módosítása után az email riasztás megérkezik a Brevo-n keresztül

---

## 9. Összeköttetés más tervezett featurekkel

Ez a feature szorosan kapcsolódik a következőkhöz:
- **02_zold_pontszam_dashboard.md** — az AQI értéke a Zöld Pontszám egyik fő alkotóeleme
- **05_kozossegi_zold_akciok.md** — a közösség szervezhet akciókat rossz levegőminőség esetén (pl. autóhasználat csökkentése napra)
- **07_kozlekedes_zaj_riporter.md** — a közlekedési zaj és a légszennyezés forrásai azonosak

---

*Prompt fájl vége — Feature 01: Levegőminőség-figyelő Widget és Riasztási Rendszer*
*Karakterszám: kb. 14 500 — kiegészítendő a részletes processOpenAQData implementációval és a Recharts 24h grafikonnal a Sprint 4 előtt.*
*Generálva: panellako.hu geoinformatikai thesis alapján, 2025-05-17*
