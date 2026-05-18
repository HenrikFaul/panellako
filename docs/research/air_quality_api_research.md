# Levegőminőségi API-k kutatása — Panellakó

**Dátum:** 2026-05-18  
**Cél:** Valós idejű levegőminőségi adatok (PM2.5, PM10, NO2, O3, SO2, CO) folyamatos lekérése és megjelenítése Budapest / panel épületek kontextusában.  
**Forrás kontextus:** Szakdolgozat – levegőminőségi fejezet (OLM, OMSZ, EU hálózatok, szennyező anyagok listája).

---

## Összefoglaló — melyik API-t érdemes használni

| Prioritás | API | Miért | Korlátozás |
|-----------|-----|-------|-----------|
| **1. AQICN / WAQI** | Legjobb lefedettség Budapesten, JSON, ingyenes API-kulcs | Rate limit: 1000 req/nap ingyenesen |
| **2. OpenAQ v3** | Nyílt, részletes mérési adatok, magyar állomások | Nem real-time (1–60 perc késés) |
| **3. EEA Air Quality** | Hivatalos EU forrás, OLM adatok | Napok késés, nem alkalmas real-time-ra |
| **4. Copernicus CAMS** | Előrejelzés (forecast) + történeti | Regisztráció szükséges, gridded (nem állomás) |
| **5. OLM közvetlen** | Elsődleges forrás (Magyarország) | Nincs nyilvános REST API, HTML scraping kellene |

**Ajánlott stratégia:** AQICN az élő widget-hez (1–2 perces frissítés), OpenAQ az archív és grafikonos nézethez.

---

## 1. AQICN / WAQI — World Air Quality Index

**Endpoint:** `https://api.waqi.info/feed/{city}/?token={TOKEN}`

### Hozzáférés
- Regisztráció: https://aqicn.org/api/
- Ingyenes kulcs: 1000 req/nap, kereskedelmi: korlátlan
- Regisztráció után azonnal aktív

### Budapest lekérdezés

```
GET https://api.waqi.info/feed/budapest/?token=YOUR_TOKEN
GET https://api.waqi.info/feed/geo:47.497;19.040/?token=YOUR_TOKEN
```

### Válasz struktúra (kulcs mezők)

```json
{
  "status": "ok",
  "data": {
    "aqi": 42,
    "idx": 5765,
    "city": { "name": "Budapest, Hungary", "geo": [47.497, 19.040] },
    "time": { "s": "2026-05-18 14:00:00", "tz": "+02:00", "v": 1747570800 },
    "iaqi": {
      "pm25": { "v": 12.3 },
      "pm10": { "v": 18.7 },
      "no2":  { "v": 31.2 },
      "o3":   { "v": 28.1 },
      "so2":  { "v": 3.4 },
      "co":   { "v": 0.6 },
      "t":    { "v": 22.1 },
      "h":    { "v": 55 },
      "p":    { "v": 1018 }
    },
    "dominentpol": "pm25"
  }
}
```

### Adott állomás lekérdezése (`idx` alapján)

```
GET https://api.waqi.info/feed/@5765/?token=YOUR_TOKEN
```

Budapesti állomások listája (koordináta alapján kereshető):
- `@5765` — Budapest, Csepel
- `@5764` — Budapest, Erzsébet tér (belváros)
- `@7025` — Budapest, Gilice tér
- `@5766` — Budapest, Pesthidegkút

### Frissítési frekvencia
Az állomástól függ: jellemzően 30–60 perc, de az AQI interpolált értékek percenként frissülnek a szerveren.

### Env var
```
AQICN_API_TOKEN=demo   # (a 'demo' token ingyenes, de rate-limited)
```

---

## 2. OpenAQ v3 — Open Air Quality

**Endpoint:** `https://api.openaq.org/v3/`

### Hozzáférés
- Regisztráció: https://explore.openaq.org/register
- API-kulcs: szükséges (ingyenes, e-mailben küldik)
- Rate limit: 60 req/perc ingyenesen

### Legközelebb eső Budapest állomások lekérdezése

```
GET https://api.openaq.org/v3/locations?coordinates=47.497,19.040&radius=10000&limit=10
Headers: X-API-Key: YOUR_KEY
```

### Mérési adatok lekérdezése (location ID alapján)

```
GET https://api.openaq.org/v3/locations/{locationId}/measurements?limit=100&order_by=datetime&sort=desc
Headers: X-API-Key: YOUR_KEY
```

### Válasz mintája

```json
{
  "results": [
    {
      "locationId": 1234,
      "location": "Budapest, Erzsébet tér",
      "parameter": "pm25",
      "value": 12.3,
      "unit": "µg/m³",
      "date": { "utc": "2026-05-18T12:00:00Z", "local": "2026-05-18T14:00:00+02:00" },
      "coordinates": { "latitude": 47.4978, "longitude": 19.0390 }
    }
  ]
}
```

### Magyar paraméterek (`parameter` értékek)
`pm25`, `pm10`, `no2`, `o3`, `so2`, `co`, `bc` (black carbon)

### Legfontosabb korlát
Az adatok **nem real-time** — az OLM/OMSZ adatok jellemzően 30–120 perces késéssel kerülnek be az OpenAQ-ba. Archív grafikonhoz és trend elemzéshez kiváló.

---

## 3. EEA Air Quality e-Reporting (European Environment Agency)

**Endpoint:** `https://eeadmz1-downloads-api-appservice.azurewebsites.net/`

### Hozzáférés
- Nyilvános, kulcs nélkül
- Dokumentáció: https://eeadmz1-downloads-webapp-appservice.azurewebsites.net/

### Állomás keresés

```
GET https://eeadmz1-downloads-api-appservice.azurewebsites.net/stations?countrycode=HU&limit=50
```

### Mérési adat

```
GET https://eeadmz1-downloads-api-appservice.azurewebsites.net/observations?station_eoi=HU0031A&pollutant=PM25&dateFrom=2026-05-01&dateTo=2026-05-18
```

### Értékelés
Az EEA az OLM adatokat közvetíti. A késés **napokban mérhető** (nem óra), ezért real-time widgethez nem alkalmas. Havi/évi áttekintőhöz hasznos.

---

## 4. Copernicus CAMS (EU Atmosphere Monitoring Service)

**Endpoint:** `https://ads.atmosphere.copernicus.eu/api/v2/`

### Hozzáférés
- Regisztráció: https://ads.atmosphere.copernicus.eu/
- API-kulcs: ingyenes regisztráció után
- Python kliens (`cdsapi`) ajánlott

### Használat
CAMS **előrejelzési** (forecast) adatokat ad: 4 napra előre, globális gridden (0.1° felbontás ≈ 10 km).  
Nem állomás-alapú, hanem gridded rács — a Budapest koordinátához legközelebbi grid cella értéke kérhető le.

### Paraméterek
`particulate_matter_2.5um`, `particulate_matter_10um`, `nitrogen_dioxide`, `ozone`, `sulphur_dioxide`, `carbon_monoxide`

### Értékelés
Elsősorban előrejelzéshez alkalmas (pl. "holnap magas lesz az ózon koncentráció"). Nem helyettesíti a mért állomási adatokat.

---

## 5. OLM — Országos Légszennyezettség Mérőhálózat (közvetlen)

**URL:** https://www.levegominoseg.hu/

### Hozzáférés
Az OLM-nek **nincs nyilvános REST API-ja**. Az adatok a weboldalon HTML táblázatban jelennek meg.

### Alternatív elérési lehetőségek
1. **OpenAQ** — az OLM adatokat ingesztálja (30–120 perc késéssel)
2. **EEA** — az OLM adatokat EU-szinten aggregálja (napok késéssel)
3. **HTML scraping** — technikailag lehetséges de törékenyen karbantartható és jogilag kérdéses

### Budapest OLM állomásazonosítók (EEA kódok)
| Állomás | EEI kód | Koordináta |
|---------|---------|-----------|
| Bp. Csepel | HU0031A | 47.4197, 18.9953 |
| Bp. Erzsébet tér | HU0005A | 47.4978, 19.0390 |
| Bp. Gilice tér | HU0032A | 47.4292, 19.0722 |
| Bp. Kosztolányi D. tér | HU0052A | 47.4619, 19.0281 |
| Bp. Pesthidegkút | HU0033A | 47.5572, 18.9800 |

---

## Implementációs terv — Panellakó-ba integrálás

### A) Gyors élő widget (AQICN)

**API route:** `GET /api/air-quality?lat={lat}&lon={lon}`

```typescript
// app/api/air-quality/route.ts
const AQICN_BASE = 'https://api.waqi.info/feed';
const TOKEN = process.env.AQICN_API_TOKEN ?? 'demo';

export interface AirQualityData {
  aqi:          number;           // összetett AQI index
  dominantPol:  string;           // pl. "pm25"
  pm25?:        number;
  pm10?:        number;
  no2?:         number;
  o3?:          number;
  so2?:         number;
  co?:          number;
  stationName:  string;
  updatedAt:    string;           // ISO
  source:       'aqicn' | 'mock';
}

// Cache: 10 perc (az OLM állomások 30-60 percenként frissülnek)
const _cache = new Map<string, { data: AirQualityData; expires: number }>();

async function fetchAQI(lat: number, lon: number): Promise<AirQualityData> {
  const url = `${AQICN_BASE}/geo:${lat};${lon}/?token=${TOKEN}`;
  const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`AQICN HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== 'ok') throw new Error(`AQICN status: ${json.status}`);

  const d = json.data;
  return {
    aqi:         d.aqi,
    dominantPol: d.dominentpol ?? '',
    pm25:        d.iaqi?.pm25?.v,
    pm10:        d.iaqi?.pm10?.v,
    no2:         d.iaqi?.no2?.v,
    o3:          d.iaqi?.o3?.v,
    so2:         d.iaqi?.so2?.v,
    co:          d.iaqi?.co?.v,
    stationName: d.city?.name ?? '',
    updatedAt:   new Date(d.time.v * 1000).toISOString(),
    source:      'aqicn',
  };
}
```

### B) AQI értelmezési skála (WHO / EU)

```typescript
interface AQILevel {
  label: string; color: string; bg: string; description: string;
}

function getAQILevel(aqi: number): AQILevel {
  if (aqi <=  50) return { label: 'Jó',          color: '#22c55e', bg: '#f0fdf4', description: 'Kiváló levegőminőség' };
  if (aqi <= 100) return { label: 'Mérsékelt',   color: '#eab308', bg: '#fefce8', description: 'Érzékenyek számára enyhe hatás' };
  if (aqi <= 150) return { label: 'Gyengék',     color: '#f97316', bg: '#fff7ed', description: 'Érzékeny csoportok óvatosak legyenek' };
  if (aqi <= 200) return { label: 'Egészségtelen', color: '#ef4444', bg: '#fef2f2', description: 'Mindenki érezheti a hatást' };
  if (aqi <= 300) return { label: 'Nagyon rossz', color: '#a855f7', bg: '#faf5ff', description: 'Egészségügyi vészhelyzet' };
  return           { label: 'Veszélyes',        color: '#7c3aed', bg: '#f5f3ff', description: 'Maradjon bent!' };
}
```

### C) Env vars szükségesek (Vercel)

```
AQICN_API_TOKEN=<token az aqicn.org/api/ oldalról>
```

A `demo` token működik fejlesztésben (rate-limited, de tesztelhető).

### D) Megjelenítési javaslat (widget)

A meglévő `AirQualityWidget` component (dashboard overview) frissítendő:
- AQI szám + szöveges minősítés (Jó / Mérsékelt / stb.)
- Kördiagram helyett lineáris skála (mint AQI pályázati ábra)
- PM2.5 és NO2 mint legfontosabb panelépületes mutatók (belső levegőminőség korrelál a külső PM2.5-tel)
- Adatforrás: "Budapest, [állomásnév] · OLM / AQICN"

---

## Jogi és adatforrás megjegyzések

| Forrás | Licenc | Hivatkozás kötelező? |
|--------|--------|---------------------|
| AQICN | CC BY-SA 4.0 | Igen — "Forrás: World Air Quality Index" |
| OpenAQ | CC BY 4.0 | Igen |
| EEA | CC BY 4.0 | Igen |
| OLM (NÉBIH/KvVM) | Közadat | Igen — "Forrás: OLM, Magyarország" |
| Copernicus CAMS | CC BY 4.0 | Igen — "Copernicus Atmosphere Monitoring Service" |

---

## Következő lépések (implementáció sorrendje)

1. **Regisztrálj AQICN API-kulcsot** a https://aqicn.org/api/ oldalon (ingyenes, 5 perc)
2. **Add hozzá `AQICN_API_TOKEN` env var-t** Vercelben
3. **Frissítsd az `/api/air-quality/route.ts`-t** a fenti `fetchAQI` logikával
4. **Frissítsd az `AirQualityWidget` component-et** az AQI szint + PM2.5/NO2 megjelenítéshez
5. **Adj hozzá attribúciót** a widgetbe (AQICN CC BY-SA)
6. Opcionálisan: OpenAQ integráció a 7 napos trendgrafikonhoz (külön feladat)
