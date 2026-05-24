# Budapest Noise Map — Architecture & Data Provenance

## Overview

The noise map system provides two complementary data layers for Budapest:

1. **Strategic baseline (WMS)** — EU Environmental Noise Directive (END) 2002/49/EC modelled maps, served via a server-side proxy that cascades through three sources.
2. **IoT overlay (optional)** — Citizen-science real-time measurements from the NoiseCapture/Noise-Planet platform, fetched on demand and rendered as circle markers.

The system is designed **fallback-first**: every layer degrades gracefully. If all WMS upstreams fail, the map still renders with base tiles and a clear error notice. If the IoT endpoint is unavailable, the toggle simply shows "unavailable" — the strategic layer is unaffected.

---

## 1. WMS Strategic Layer

### Source inventory

| Priority | Name | URL base | Coverage | License |
|----------|------|----------|----------|---------|
| 1 | HungaroMet OMSZ | `https://geoportal.met.hu/geoserver/zajterkep/wms` | Hungary (END maps) | Hungarian gov open data |
| 2 | NIF Zrt. | `https://zajterkepek.hu/geoserver/wms` | Hungary (END maps) | Hungarian gov open data |
| 3 | EEA Discomap | `https://noise.discomap.eea.europa.eu/arcgis/services/NoiseData/EUSNoise_MapViewer_WMS/MapServer/WMSServer` | Europe (END aggregate) | CC BY 4.0 |

### Available layers

| Layer key | WMS layer name | Description |
|-----------|---------------|-------------|
| `kozut_lden` | `KOZUT_LDEN` | Road traffic — L_den (day-evening-night indicator) |
| `kozut_lnight` | `KOZUT_LNIGHT` | Road traffic — L_night |
| `vasut_lden` | `VASUT_LDEN` | Railway — L_den |
| `ipari_lden` | `IPARI_LDEN` | Industrial — L_den |

### Proxy route

**`/api/noise/wms-tile`** (`app/api/noise/wms-tile/route.ts`)

- Accepts all standard WMS query parameters from Leaflet's `L.tileLayer.wms()`
- Tries upstream sources in priority order; on HTTP error or non-image response, falls back to next
- Caches successful tile responses in-memory for **30 minutes** (LRU max 4000 entries)
- Returns `X-Noise-Source` response header identifying which upstream served the tile (e.g. `HungaroMet`, `NIF`, `EEA`)
- Returns HTTP 503 only when all three sources fail

### Source identification

After the first tile loads, `probeWmsSource()` in `noise-map-inner.tsx` fires a minimal 1×1 pixel WMS request to `/api/noise/wms-tile` and reads the `X-Noise-Source` header. The result is displayed in the attribution badge (bottom-right).

---

## 2. IoT Overlay

### Source inventory

| Name | Platform | Endpoint status | License |
|------|----------|----------------|---------|
| NoiseCapture REST API | Noise-Planet / IFSTTAR | **Unverified** — endpoint path requires confirmation | CC BY-SA 4.0 |
| Noise-Planet GeoServer WFS | Noise-Planet / IFSTTAR | **Unverified** — fallback endpoint | CC BY-SA 4.0 |

**Status note:** Both Noise-Planet endpoints are marked `unverified` because the exact API path has not been confirmed against their published documentation. The system attempts both in sequence; if neither responds, the IoT layer is silently unavailable and the strategic WMS layer continues to function normally.

See: https://noise-planet.org/ and https://data.noise-planet.org/

### Proxy route

**`/api/noise/iot-measurements`** (`app/api/noise/iot-measurements/route.ts`)

- Budapest bounding box: `minLon=18.9, minLat=47.3497, maxLon=19.3347, maxLat=47.6167`
- Tries endpoints in order with 12s timeout each
- Normalizes response to GeoJSON FeatureCollection regardless of upstream shape (handles: existing FC, array of measurement objects)
- In-memory cache: **1 hour TTL**
- Response shape:

```json
{
  "source":       "noisecapture" | "none",
  "status":       "ok" | "unavailable",
  "reason":       "(optional, populated when unavailable)",
  "retrieved_at": "2026-05-24T10:00:00.000Z",
  "bbox":         { "minLat": 47.3497, "maxLat": 47.6167, "minLon": 18.9, "maxLon": 19.3347 },
  "data": {
    "type": "FeatureCollection",
    "features": [{
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [lon, lat] },
      "properties": { "laeq": 63.5, "time": "2026-05-24T09:12:00Z", "source": "noisecapture" }
    }]
  }
}
```

### GeoJSON normalization

`toGeoJSON()` handles two upstream shapes:

1. **GeoJSON FeatureCollection** — validates coordinates, extracts `laeq`/`db`/`level`/`noise_level`/`leq`, drops features with non-finite values
2. **Array of measurement objects** — reads `lat`/`latitude`/`y`, `lon`/`longitude`/`x`, same `laeq` aliases

---

## 3. React Component Architecture

**`components/noise-map-inner.tsx`** uses **three independent React effects** to avoid map re-initialization when switching layers or toggling IoT.

### Effect 1 — Map init
**Deps:** `[buildingLat, buildingLon, theme.id]`

Creates the Leaflet map, base tile layer, empty IoT layer group, and building marker. Sets `mapReady = true`. Cleanup removes the entire map instance.

### Effect 2 — WMS layer swap
**Deps:** `[mapReady, wmsLayer]`

Removes the old WMS tile layer, adds the new one, wires `tileload`/`tileerror` events to update `tileStatus`, then fires `probeWmsSource()` after the first successful tile to populate `wmsSourceId`.

### Effect 3 — IoT toggle / fetch
**Deps:** `[mapReady, iotEnabled]`

When `iotEnabled` is `false`: clears the IoT layer group, resets status.
When `true`: fetches `/api/noise/iot-measurements`, renders `L.circleMarker` for each feature using `dbToColor()`, binds tooltip with dB value + timestamp.

### State variables

| Variable | Type | Description |
|----------|------|-------------|
| `mapReady` | `boolean` | True after Leaflet map fully initialized |
| `wmsLayer` | `WmsLayerKey` | Currently selected WMS layer |
| `iotEnabled` | `boolean` | Whether the IoT overlay is toggled on |
| `tileStatus` | `loading \| ok \| error` | WMS tile load outcome |
| `wmsSourceId` | `string \| null` | Which upstream served the WMS tiles |
| `iotStatus` | `idle \| loading \| ok \| unavailable \| error` | IoT fetch lifecycle |
| `iotCount` | `number` | Number of IoT circle markers rendered |

---

## 4. dB Color Scale

EU END Directive 2002/49/EC standard color encoding:

| Range | Color | Hex |
|-------|-------|-----|
| < 55 dB | Green | `#22c55e` |
| 55–60 dB | Yellow-green | `#a3e635` |
| 60–65 dB | Yellow | `#facc15` |
| 65–70 dB | Orange | `#f97316` |
| 70–75 dB | Red | `#ef4444` |
| > 75 dB | Dark red | `#7f1d1d` |

Used in both the dB legend (static UI) and `dbToColor()` (IoT marker coloring).

---

## 5. QA Validation Matrix

| Test | Expected result |
|------|----------------|
| WMS layer selector — switch kozut_lden → vasut_lden | Map re-tiles without map re-init; building marker stays |
| WMS source probe | `X-Noise-Source` header appears in attribution badge |
| IoT toggle ON (endpoint available) | Circle markers appear; count shown in button and attribution |
| IoT toggle ON (endpoint unavailable) | "NoiseCapture adatok jelenleg nem elérhetők" notice; WMS layer unaffected |
| IoT toggle OFF | Markers cleared; status reset to idle |
| All WMS sources fail | Error panel with links to HungaroMet / NIF / EEA appears |
| prefers-reduced-motion | Animated pulse dots do not animate |

---

## 6. Failure Mode Handbook

| Failure | System response |
|---------|----------------|
| HungaroMet WMS down | Proxy falls through to NIF automatically |
| NIF WMS down | Proxy falls through to EEA automatically |
| All WMS sources down | HTTP 503 from proxy; map shows error panel with direct links |
| NoiseCapture endpoint unverified/404 | Second endpoint tried; if both fail: `status: unavailable` |
| IoT fetch timeout (>15s) | `iotStatus: error`; WMS layer unaffected |
| Partial IoT data (some features malformed) | `toGeoJSON()` silently drops invalid features via `flatMap(→[])` |

---

## 7. IoT Acquisition Plan

Current status: **pending endpoint verification**

Next steps:
1. Confirm Noise-Planet API path against https://data.noise-planet.org/ documentation
2. Test both endpoints with `curl` for Budapest bbox
3. Verify response schema matches `toGeoJSON()` normalizer expectations
4. If neither endpoint is production-grade, evaluate:
   - Direct NoiseCapture database dumps (CC BY-SA, periodic batch)
   - OpenSenseMaps API (alternative citizen-science platform)
   - Budapest Smart City open data portal (if available)

Until endpoints are verified, the IoT toggle shows "unavailable" but the strategic WMS layer provides full baseline coverage.

---

## 8. Deployment & Refresh Policy

| Layer | Cache TTL | Refresh trigger |
|-------|-----------|----------------|
| WMS tiles | 30 min (in-memory) | Next request after TTL expiry |
| IoT measurements | 1 hour (in-memory) | Next request after TTL expiry |
| Base map tiles | Leaflet default (browser cache) | N/A |

In-memory caches are process-local. On serverless cold start, both caches are empty and will re-populate on first request. This is acceptable given the data update frequency (strategic maps: annual; IoT: hourly batch).

---

## 9. Data Licensing Summary

| Source | License | Attribution required |
|--------|---------|---------------------|
| HungaroMet strategic maps | Hungarian government open data | Yes — "HungaroMet OMSZ" |
| NIF Zrt. strategic maps | Hungarian government open data | Yes — "NIF Zrt." |
| EEA Discomap | CC BY 4.0 | Yes — "© EEA" |
| Noise-Planet / NoiseCapture | CC BY-SA 4.0 | Yes — "Noise-Planet / IFSTTAR" |

Attribution is rendered in the Leaflet map's built-in attribution control via the WMS layer's `attribution` parameter.

---

*Last updated: 2026-05-24 | Branch: claude/fix-cron-null-values-uDCqd*
