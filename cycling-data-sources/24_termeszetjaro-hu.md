# Természetjáró.hu (termeszetjaro.hu) — Teljes backend terv és adatkinyerési specifikáció

> **Forrás kódja a belső katalógusban:** `24_termeszetjaro-hu`
> **Domain:** `termeszetjaro.hu`
> **Adattípus:** túraajánlók (gyalogos + kerékpáros), GPX letöltés, POI-k, fényképek, leírások
> **Lefedettség:** Magyarország teljes területe (kiemelten az Országos Kéktúra, valamint a regionális kéktúrák, és a Magyar Természetjáró Szövetség által gondozott útvonalak)
> **Verzió:** 1.0 (2026-05-19)

---

## 1. Forrás áttekintés

A **Természetjáró.hu** a **Magyar Természetjáró Szövetség (MTSZ)** hivatalos online platformja, amely 2015 után épült ki a meglévő hagyatéki adatok (Kéktúra Atlasz, Turistautak.hu adatbázis) és új közösségi feltöltések kombinációjából. A portál a magyar természetjárás központi referencia-pontja, és különösen a következő útvonal-családokra ad strukturált adatot:

- **Országos Kéktúra (OKT)** — ~1.180 km, ~120 szakasz, gyalogosan, részben kerékpározható
- **Dél-dunántúli Kéktúra (DDK)**, **Alföldi Kéktúra (AK)**, **Rockenbauer Pál Dél-dunántúli Kéktúra (RPDDK)**
- **EuroVelo 6 / 14 / 13** magyar szakaszai
- Regionális MTB és gravel ajánlók (~2.000–3.000 db, közösségi feltöltésből)
- **POI-k**: forrás/kút, esőbeálló, kilátó, turistaház, kerékpárszervíz

### 1.1 A kerékpáros sub-section sajátosságai

A portálnak külön kerékpáros aloldala van (`/utvonalak?tipus=bicikli` vagy hasonló slug). Itt jelennek meg a kifejezetten bringás ajánlók. **Fontos átfedés:** a gyalogos Kéktúra-szakaszok közül kb. 35–40% **fizikailag kerékpárral is járható** (forrás: MTSZ "Kéktúrázz biciklivel" 2023 ajánlás), de az MTSZ ezeket NEM ajánlja külön kerékpáros túraként. Ezt a downstream útvonaltervezőben **két flag-gel** különböztetjük meg:

- `source_is_cycling_route` (BOOL) — a forrás kifejezetten bringásnak jelölte
- `derived_is_cycle_passable` (BOOL) — saját, OSM-alapú elemzéssel megállapított

### 1.2 Adatkategóriák

| Kategória | Forma | Mennyiség (becsült) | Frissítési ütem |
|---|---|---|---|
| Túraajánlók (gyalog + bringa) | HTML + GPX | 6.000–9.000 db | Lassú (~20–50 új/hó) |
| OKT/DDK/AK hivatalos szakaszok | GPX (kanonikus) | ~250 db | Nagyon ritka |
| POI-k | JSON API (belső) + HTML | 25.000+ db | Lassú |
| Fényképek | JPG | 100.000+ | Statikus |
| Felhasználói „pecsétpont" jegyek | HTML stat | — | Napi (csak metaadat) |
| Eseménynaptár (túra-meghirdetések) | HTML/JSON | 1.000+/év | Heti |

### 1.3 MTSZ adatállomány státusza

A Magyar Természetjáró Szövetség adatait **a Természetjáró.hu publikálja**; az MTSZ nem üzemeltet külön nyilvános adat-API-t. Az OKT és társainak hivatalos nyomvonalát az MTSZ **GPX formátumban** is közzéteszi, de **csak a portálon keresztül**, **közvetlen letöltéssel** (PDF + GPX bundle), nem géppel olvasható feedben. Ezt a GPX bundle-t **félévente egyszer** ellenőrizzük újra (a hivatalos nyomvonal-felülvizsgálatok ritkán történnek).

### 1.4 Üzleti és felhasználói érték

A Természetjáró.hu a **legmagasabb minőségű és legtöbbet karbantartott** magyar útvonal-forrás. Várt felhasználás:

- A **kanonikus OKT** nyomvonal pontos megadása a felhasználói térképen
- **Megbízható POI-réteg** (kút, kilátó), magas frissítettségi szinttel
- **Cross-validation** referenciaként a többi forrással szemben
- Útvonal-ajánló motor magas-megbízhatóság szegmense
- Eseménynaptár adat marketing-tartalomhoz

---

## 2. Jogi és licenc helyzet

### 2.1 Felhasználói feltételek

A Természetjáró.hu ÁSZF szövege szerint a tartalom **„magáncélra korlátozottan letölthető, kereskedelmi vagy újrapublikálási célra csak az MTSZ írásos engedélye alapján használható"**. Ez egyértelműen kizárja a tartalom **közvetlen újraközlését**.

> **Konzervatív álláspont:** A scraping során nyert GPX-eket és POI-kat **belső analitikai és származékos termékként** használjuk:
> - Térképen csak az **OSM-re map-matchelt** változatot jelenítjük meg, nem a nyers GPX-et
> - POI-koordinátákat csak akkor jelenítjük meg, ha **OSM-mel cross-validate-elt** és OSM-ben is létezik (akkor effektíve OSM-tartalmat publikálunk)
> - Szöveges leírást **soha nem közlünk szóról szóra**; csak embeddinget tárolunk

### 2.2 MTSZ kapcsolatfelvétel

**Erősen ajánlott** — még a scraping megkezdése előtt — hivatalos email az MTSZ-nek (`info@termeszetjaro.hu`), amelyben:

1. Bemutatkozás (cég, projekt)
2. Adatfelhasználási szándék részletes leírása
3. Származékos publikálás kérdésében együttműködési kérelem
4. Esetleges partnerségi/adatlicenc-megállapodás felajánlása

Ez nem törvényi kötelezettség, de **etikus** és gyakorlatilag is kifizetődő (gyakran kapnak az érdeklődők direkt API-hozzáférést vagy CSV-csomagot).

### 2.3 GDPR

A POI-knál és túrajegyeknél megjelenhet a feltöltő/teljesítő felhasználói neve. Erre ugyanaz a `redact_pii()` szabály érvényes mint a 07-es forrásnál: **csak hash-elt formában** tároljuk.

### 2.4 robots.txt és Crawl-Delay

A `termeszetjaro.hu/robots.txt` (vizsgálat időpontjában) jellemzően:

```
User-agent: *
Disallow: /admin/
Disallow: /api/internal/
Allow: /
Crawl-delay: 5
```

A **Crawl-delay 5** értelmében másodpercenként legfeljebb **0.2 req/sec** a megengedett ráta — ennél lassabban scrape-elünk! Ez **lényegesen szigorúbb**, mint a Bringamánia.

---

## 3. Adatkinyerési felület

A Természetjáró.hu három csatornán keresztül szolgáltat adatot:

### 3.1 Per-túra GPX letöltés

Minden túra-oldalon (`/utvonal/<slug>` vagy `/tura/<id>`) GPX letöltő link. A pattern jellemzően:

```
https://www.termeszetjaro.hu/api/v1/route/<id>/gpx
https://www.termeszetjaro.hu/utvonal/<slug>.gpx
```

A GPX **tipikusan tartalmaz**:
- Nyomvonal pontokat (lat/lon/ele/time)
- Waypoint-okat (POI-k)
- `<extensions>` blokkban a Természetjáró-specifikus metaadatokat (`tj:difficulty`, `tj:surface`, `tj:season`)

### 3.2 Belső JSON API

A portál egy **belső REST API**-t használ a frontend SPA-jához. Bár nem dokumentált, gyakran felfedezhető a böngésző DevTools-szal:

```
GET https://www.termeszetjaro.hu/api/v1/tour/list?page=1&type=cycling&limit=50
GET https://www.termeszetjaro.hu/api/v1/tour/<id>
GET https://www.termeszetjaro.hu/api/v1/poi/list?bbox=...
```

> **Etikus megfontolás:** Egy nem dokumentált, nem nyilvánosan deklarált API használata **szürke zóna**. Mi a **megengedő értelmezést** alkalmazzuk, mivel:
> 1. Az endpoint **nincs auth mögött**
> 2. Az endpoint **nincs `Disallow` szabállyal letiltva**
> 3. A `Crawl-delay`-t **fokozottan tartjuk** (0.2 rps)
>
> Ha az MTSZ jelez, **azonnal lemegyünk csak HTML-scraping-re**.

### 3.3 HTML scraping (fallback)

Ha a JSON API megszűnik vagy auth-ot kap, a HTML scraping a fallback. A HTML jellemzően jól strukturált (`<meta property="og:...">` Open Graph mezők), és a Schema.org `TouristTrip` típusú JSON-LD blokkok is gyakran beágyazottak:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TouristTrip",
  "name": "Pilis kerékpártúra",
  "subjectOf": { "@type": "URL", "url": "..." },
  "geo": { ... }
}
</script>
```

### 3.4 Sitemap-alapú felfedezés

```
https://www.termeszetjaro.hu/sitemap.xml
https://www.termeszetjaro.hu/sitemap-tour.xml
https://www.termeszetjaro.hu/sitemap-poi.xml
```

A sitemap-eket **prioritáskategóriák** szerint dolgozzuk fel: először tour, aztán POI.

---

## 4. Hitelesítés, rate limit, kvóták (polite scraping)

### 4.1 Hitelesítés

A publikus tartalom **bejelentkezés nélkül** elérhető. Egyes funkciók (saját túranapló, Kéktúra-pecsétek, premium GPX) igényelnek bejelentkezést. **Nem hozunk létre tesztfiókot** — csak a teljesen publikus tartalmat fogyasztjuk.

### 4.2 Polite scraping policy

| Paraméter | Érték | Indoklás |
|---|---|---|
| `User-Agent` | `EffectimeRouteBot/1.0 (+mailto:data@effectime.hu)` | Kontaktcímmel |
| `Accept-Language` | `hu-HU,hu;q=0.9,en;q=0.5` | |
| Lekérési ráta | **0.2 req/sec** (Crawl-delay 5) | `robots.txt` előírja |
| Burst | max 1 párhuzamos | Crawl-delay alatt szekvenciális |
| Backoff | exponenciális, 5×, max 120s | Konzervatív |
| Heti kvóta | 10.000 req | Crawl-delay × 7 nap × 8 óra/nap |
| `robots.txt` cache | 6 h | Gyakrabban refresh, mert szigorú |

### 4.3 Időzítés

A scraping **éjfél után** (00:30 CET) indul, mivel ekkor a legkisebb az élő forgalom. Egy teljes site-scan ~6.000 tour × 5 sec ≈ **8 óra** futási idő — ezt **éjszaka indítjuk és reggelre kell befejeződnie**.

### 4.4 Etikus jelzések

- **Soha** nem kerüljük meg a Cloudflare/Recaptcha védelmet
- Ha a `User-Agent`-ünk blokkolódik, az **azonnal STOP** állapot
- Az MTSZ panaszára **24 órán belül** válaszolunk

---

## 5. Adatmodell a forrásból

A nyers adat a `stage_termeszetjaro` sémában.

### 5.1 `stage_termeszetjaro.tour_raw`

```text
tour_id           : BIGINT      -- forrás-specifikus
slug              : TEXT
title             : TEXT
tour_type         : TEXT        -- hiking / cycling / mtb / family
official_route    : BOOLEAN     -- OKT, DDK, RPDDK
official_code     : TEXT        -- "OKT-12" pl.
length_km         : NUMERIC(7,3)
ascent_m          : INTEGER
descent_m         : INTEGER
duration_h        : NUMERIC(4,1)
difficulty_text   : TEXT
difficulty_code   : SMALLINT    -- 1..5
season_str        : TEXT        -- "egész évben","csak nyáron",...
surface_str       : TEXT
start_locality    : TEXT
end_locality      : TEXT
start_lat         : DOUBLE PRECISION
start_lon         : DOUBLE PRECISION
end_lat           : DOUBLE PRECISION
end_lon           : DOUBLE PRECISION
mtsz_segment_id   : TEXT        -- ha OKT/DDK szakasz, ennek hivatalos azonosítója
photo_count       : INTEGER
gpx_url           : TEXT
gpx_sha256        : TEXT
schema_org_json   : JSONB       -- ha volt JSON-LD a HTML-ben
fetched_at        : TIMESTAMPTZ
http_status       : SMALLINT
```

### 5.2 `stage_termeszetjaro.poi_raw`

```text
poi_id            : BIGINT
name              : TEXT
poi_type          : TEXT      -- "forras","kut","kilato","turistahaz","kerekparservice",...
lat               : DOUBLE PRECISION
lon               : DOUBLE PRECISION
elevation_m       : INTEGER
description_short : TEXT
official          : BOOLEAN   -- MTSZ által hitelesített
last_check_date   : DATE
photo_url         : TEXT
fetched_at        : TIMESTAMPTZ
```

### 5.3 `stage_termeszetjaro.gpx_track_raw`

```text
track_id          : SERIAL PK
tour_id           : BIGINT FK
gpx_blob_s3       : TEXT
n_points          : INTEGER
geom_linestring   : geometry(LineStringZ, 4326)
mtsz_extensions   : JSONB     -- a <tj:*> XML elemek strukturálva
```

### 5.4 `stage_termeszetjaro.official_route` (kanonikus OKT/DDK)

```text
route_code        : TEXT PK     -- "OKT"
segment_code      : TEXT PK     -- "12"
segment_name      : TEXT        -- "Bélapátfalva — Szilvásvárad"
length_km         : NUMERIC(7,3)
official_geom     : geometry(LineStringZ, 4326)
last_official_update : DATE
```

---

## 6. Cél adatmodell (PostGIS DDL)

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS cycling;
CREATE SCHEMA IF NOT EXISTS hiking;            -- a gyalogos rész is bekerül
CREATE SCHEMA IF NOT EXISTS stage_termeszetjaro;

INSERT INTO cycling.data_source (source_id, source_code, display_name, base_url, polite_rps)
VALUES (24, 'termeszetjaro', 'Természetjáró.hu (MTSZ)',
        'https://www.termeszetjaro.hu', 0.2)
ON CONFLICT (source_code) DO NOTHING;

-- Kerékpáros vagy bringával is járható tour
CREATE TABLE IF NOT EXISTS cycling.route_tj (
    route_uuid         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_route_id    TEXT NOT NULL,
    title              TEXT NOT NULL,
    tour_type          TEXT NOT NULL CHECK (tour_type IN ('cycling','mtb','family','dual_use')),
    source_is_cycling_route  BOOLEAN NOT NULL,
    derived_is_cycle_passable BOOLEAN,
    official_route     BOOLEAN NOT NULL DEFAULT FALSE,
    official_code      TEXT,         -- pl. "OKT-12"
    length_km          NUMERIC(7,3),
    ascent_m           INTEGER,
    descent_m          INTEGER,
    duration_h         NUMERIC(4,1),
    difficulty_code    SMALLINT CHECK (difficulty_code BETWEEN 1 AND 5),
    season_codes       TEXT[],
    surface_breakdown  JSONB,
    start_point        geometry(PointZ, 4326),
    end_point          geometry(PointZ, 4326),
    track              geometry(LineStringZ, 4326),
    bbox               geometry(Polygon, 4326)
                          GENERATED ALWAYS AS (ST_Envelope(track::geometry)) STORED,
    mtsz_segment_id    TEXT,
    summary_embedding  VECTOR(384),
    source_fetched_at  TIMESTAMPTZ NOT NULL,
    deleted_at         TIMESTAMPTZ,
    UNIQUE (source_route_id)
);

CREATE INDEX route_tj_track_gix    ON cycling.route_tj USING GIST (track);
CREATE INDEX route_tj_bbox_gix     ON cycling.route_tj USING GIST (bbox);
CREATE INDEX route_tj_official_idx ON cycling.route_tj (official_code) WHERE official_route;
CREATE INDEX route_tj_type_idx     ON cycling.route_tj (tour_type);

-- Hivatalos OKT/DDK kanonikus szakaszok (külön tábla, ritka frissítés)
CREATE TABLE IF NOT EXISTS cycling.official_long_distance_segment (
    route_code       TEXT NOT NULL,
    segment_code     TEXT NOT NULL,
    segment_name     TEXT NOT NULL,
    length_km        NUMERIC(7,3),
    geom             geometry(LineStringZ, 4326) NOT NULL,
    last_updated     DATE NOT NULL,
    PRIMARY KEY (route_code, segment_code)
);
CREATE INDEX olds_geom_gix ON cycling.official_long_distance_segment USING GIST (geom);

-- POI a Természetjáró-ból (az általános cycling.poi-ba csatolva forrásdiszkriminátorral)
CREATE TABLE IF NOT EXISTS cycling.poi_tj (
    poi_uuid         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_poi_id    TEXT NOT NULL,
    name             TEXT,
    poi_type         TEXT NOT NULL,
    geom             geometry(PointZ, 4326) NOT NULL,
    official         BOOLEAN NOT NULL DEFAULT FALSE,
    last_check_date  DATE,
    osm_cross_check  BOOLEAN,        -- van-e OSM-ben matching POI 50m-en belül
    osm_node_id      BIGINT,
    source_fetched_at TIMESTAMPTZ NOT NULL,
    UNIQUE(source_poi_id)
);
CREATE INDEX poi_tj_geom_gix ON cycling.poi_tj USING GIST (geom);
CREATE INDEX poi_tj_type_idx ON cycling.poi_tj (poi_type);

-- Eseménynaptár (külön rendszer)
CREATE TABLE IF NOT EXISTS cycling.tj_event (
    event_uuid   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_event_id TEXT UNIQUE NOT NULL,
    title        TEXT NOT NULL,
    start_at     TIMESTAMPTZ NOT NULL,
    end_at       TIMESTAMPTZ,
    geom         geometry(Point, 4326),
    organizer    TEXT,
    tour_type    TEXT,
    fetched_at   TIMESTAMPTZ NOT NULL
);
```

---

## 7. Backend architektúra (L1-L8 rétegek)

```mermaid
flowchart LR
    subgraph L1 [Discovery]
        SM[sitemap-tour.xml]
        SP[sitemap-poi.xml]
        EV[event-feed]
    end
    subgraph L2 [Fetch]
        SM --> F[polite fetcher 0.2rps]
        SP --> F
        EV --> F
    end
    subgraph L3 [Raw]
        F --> S3[(S3 raw)]
    end
    subgraph L4 [Parse]
        S3 --> HP[HTML / JSON-LD parser]
        S3 --> GP[GPX parser \n+ tj-extensions]
        S3 --> JP[JSON API parser]
    end
    subgraph L5 [Stage]
        HP & GP & JP --> STG[(stage_termeszetjaro)]
    end
    subgraph L6 [Canonical]
        STG --> CAN[(cycling.route_tj,\n cycling.poi_tj,\n cycling.official_long_distance_segment)]
    end
    subgraph L7 [Enrich]
        CAN --> OSM[OSM cross-validate POI]
        CAN --> CYCL[cycle-passability OSM tag scan]
    end
    subgraph L8 [Publish]
        OSM & CYCL --> API[REST + vector tiles \n+ "official OKT" layer]
    end
```

### 7.1 L1 — Discovery

- `discover_sitemap_tj.py` — három sitemap (tour, poi, event) párhuzamos olvasása.
- Output: `redis stream` URL-listák.

### 7.2 L2 — Fetch (0.2 rps)

- 1 worker, szekvenciális futás.
- `aiolimiter` 1 token / 5 sec.
- Ha 429 érkezik, `backoff = 60s` minimum.

### 7.3 L3 — Storage raw

- S3 `cycling-raw/termeszetjaro/<yyyy/mm/dd>/<sha1>.{html,gpx,json}.gz`
- Lifecycle: **180 nap** standard (mert az audit fontosabb itt), aztán Glacier.

### 7.4 L4 — Parse

- **HTML + JSON-LD**: ha van `<script type="application/ld+json">` TouristTrip blokk, az az elsődleges forrás
- **GPX + tj-extensions**: a `<tj:difficulty>`, `<tj:surface>` XML elemeket külön extractor
- **JSON API**: szigorú schema-validation `pydantic`-kal

### 7.5 L5 — Stage DB

- Postgres + PostGIS
- Idempotens upsert `(source_route_id)` természetes kulcson

### 7.6 L6 — Canonical

- dbt modellek
- Külön kezeli az `official_route = TRUE` táblát (csak ha az MTSZ-csomag is megerősíti)

### 7.7 L7 — Enrich

- **OSM POI cross-check**: minden TJ POI-ra futtatunk egy `ST_DWithin(poi, osm.amenity, 50m)` queryt, ha találunk azonos típusú OSM csomópontot 50 m-en belül → `osm_cross_check = TRUE`. Ha nem találunk → `osm_cross_check = FALSE` (alapértelmezetten NEM publikáljuk, kivéve ha hivatalos)
- **Cycle-passability**: Valhalla `/route` próbát futtatunk bringás profilon a tour `start → end` pontra; ha az átlagos eltérés az eredeti GPX-től < 200 m, akkor `derived_is_cycle_passable = TRUE`

### 7.8 L8 — Publish

- `cycling/official-okt` külön endpoint a hivatalos OKT geometria szolgáltatására
- Vector tile layer: `routes_tj_cycling`, `routes_tj_official`, `pois_tj_validated`

---

## 8. Automatizált letöltő — Python kód (Scrapy)

A Természetjáró-ra **Scrapy**-t használunk, mivel:
1. A `CONCURRENT_REQUESTS = 1` + `DOWNLOAD_DELAY = 5` natívan támogatja a strict crawl-delay-t
2. A `RobotsTxtMiddleware` automatikusan respektálja a `robots.txt`-t
3. A `HttpCacheMiddleware` lehetővé teszi az idempotens dev-futtatást

```python
# spiders/termeszetjaro.py
# -*- coding: utf-8 -*-
"""
Scrapy spider for termeszetjaro.hu — polite (0.2 rps),
robots.txt aware, idempotent against stage_termeszetjaro.
"""
from __future__ import annotations
import hashlib
import json
import gzip
import logging
import re
from datetime import datetime, timezone
from urllib.parse import urljoin

import scrapy
from scrapy.http import Response
from scrapy.exceptions import IgnoreRequest

logger = logging.getLogger("tj.spider")

ALLOWED_DOMAINS = ["termeszetjaro.hu", "www.termeszetjaro.hu"]
SITEMAPS = [
    "https://www.termeszetjaro.hu/sitemap.xml",
    "https://www.termeszetjaro.hu/sitemap-tour.xml",
    "https://www.termeszetjaro.hu/sitemap-poi.xml",
]
TOUR_RX  = re.compile(r"/(?:utvonal|tura)/([\w\-]+)")
POI_RX   = re.compile(r"/(?:poi|pont)/([\w\-]+)")
JSON_API_TOUR = "https://www.termeszetjaro.hu/api/v1/tour/{id}"


class TermeszetjaroSpider(scrapy.Spider):
    name = "termeszetjaro"
    allowed_domains = ALLOWED_DOMAINS
    custom_settings = {
        "USER_AGENT": "EffectimeRouteBot/1.0 (+mailto:data@effectime.hu)",
        "ROBOTSTXT_OBEY": True,
        "CONCURRENT_REQUESTS": 1,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
        "DOWNLOAD_DELAY": 5.0,
        "AUTOTHROTTLE_ENABLED": True,
        "AUTOTHROTTLE_TARGET_CONCURRENCY": 1.0,
        "AUTOTHROTTLE_MAX_DELAY": 30.0,
        "RETRY_TIMES": 4,
        "RETRY_HTTP_CODES": [429, 500, 502, 503, 504],
        "DOWNLOAD_TIMEOUT": 30,
        "HTTPCACHE_ENABLED": True,
        "HTTPCACHE_EXPIRATION_SECS": 86400,
        "HTTPCACHE_DIR": "/var/cache/scrapy/tj",
        "HTTPCACHE_IGNORE_HTTP_CODES": [400, 401, 403, 404, 500, 502, 503, 504],
        "LOG_LEVEL": "INFO",
        "DEFAULT_REQUEST_HEADERS": {
            "Accept-Language": "hu-HU,hu;q=0.9,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
        },
        "FEEDS": {
            "items/%(name)s/%(time)s.jsonl.gz": {
                "format": "jsonlines",
                "encoding": "utf-8",
                "store_empty": False,
                "postprocessing": ["scrapy.extensions.postprocessing.GzipPlugin"],
            }
        },
        "ITEM_PIPELINES": {
            "pipelines.S3RawStoragePipeline": 300,
            "pipelines.StageDBWriterPipeline": 400,
        },
    }

    def start_requests(self):
        for sm in SITEMAPS:
            yield scrapy.Request(sm, callback=self.parse_sitemap, dont_filter=True)

    def parse_sitemap(self, response: Response):
        urls = re.findall(r"<loc>([^<]+)</loc>", response.text)
        logger.info("sitemap %s yields %d URLs", response.url, len(urls))
        for u in urls:
            if "/sitemap" in u:
                yield response.follow(u, callback=self.parse_sitemap)
            elif TOUR_RX.search(u):
                yield response.follow(u, callback=self.parse_tour_html, meta={"kind": "tour"})
            elif POI_RX.search(u):
                yield response.follow(u, callback=self.parse_poi_html, meta={"kind": "poi"})

    def parse_tour_html(self, response: Response):
        # JSON-LD priority
        ld = self._extract_json_ld(response)
        # Visible fields fallback
        title = (response.css("h1::text").get() or "").strip() or (ld or {}).get("name")
        if not title:
            logger.warning("no title at %s", response.url)
            return

        # find gpx
        gpx_href = None
        for href in response.css("a::attr(href)").getall():
            if href and (href.endswith(".gpx") or "/gpx" in href):
                gpx_href = response.urljoin(href)
                break

        tour_id = self._tour_id_from_url(response.url)
        item = {
            "kind": "tour",
            "source_route_id": tour_id,
            "url": response.url,
            "title": title,
            "tour_type": self._infer_type(response, ld),
            "official_route": self._is_official(response, ld),
            "official_code": self._official_code(response, ld),
            "length_km": self._extract_length_km(response, ld),
            "ascent_m": self._extract_ascent(response, ld),
            "difficulty_text": (response.css(".difficulty::text").get() or "").strip(),
            "gpx_url": gpx_href,
            "schema_org_json": ld,
            "raw_html_sha256": hashlib.sha256(response.body).hexdigest(),
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "http_status": response.status,
        }
        yield item

        # Also try the JSON API for richer data
        if tour_id and tour_id.isdigit():
            yield scrapy.Request(
                JSON_API_TOUR.format(id=tour_id),
                callback=self.parse_tour_json,
                meta={"tour_id": tour_id},
                errback=self._silent_errback,
            )
        # Fetch GPX
        if gpx_href:
            yield scrapy.Request(gpx_href, callback=self.parse_gpx_blob,
                                 meta={"tour_id": tour_id},
                                 errback=self._silent_errback)

    def parse_tour_json(self, response: Response):
        try:
            payload = json.loads(response.text)
        except json.JSONDecodeError:
            logger.warning("json decode failed %s", response.url)
            return
        payload["_kind"] = "tour_json"
        payload["_source_route_id"] = response.meta["tour_id"]
        payload["_fetched_at"] = datetime.now(timezone.utc).isoformat()
        yield {"kind": "tour_json", **payload}

    def parse_gpx_blob(self, response: Response):
        yield {
            "kind": "gpx",
            "source_route_id": response.meta["tour_id"],
            "gpx_sha256": hashlib.sha256(response.body).hexdigest(),
            "gpx_bytes_gz": gzip.compress(response.body, compresslevel=6),
            "url": response.url,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }

    def parse_poi_html(self, response: Response):
        ld = self._extract_json_ld(response)
        name = (response.css("h1::text").get() or (ld or {}).get("name") or "").strip()
        lat = response.css("meta[itemprop=latitude]::attr(content)").get()
        lon = response.css("meta[itemprop=longitude]::attr(content)").get()
        if not (lat and lon):
            # fallback: leaflet init coords from inline script
            m = re.search(r"L\.map\([^)]+\)\.setView\(\[([0-9.\-]+),\s*([0-9.\-]+)\]", response.text)
            if m:
                lat, lon = m.group(1), m.group(2)
        if not (lat and lon and name):
            return
        yield {
            "kind": "poi",
            "source_poi_id": self._poi_id_from_url(response.url),
            "name": name,
            "poi_type": (response.css(".poi-type::text").get() or "unknown").strip(),
            "lat": float(lat),
            "lon": float(lon),
            "official": bool(response.css(".badge-mtsz")),
            "url": response.url,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }

    # ---- helpers ----

    def _silent_errback(self, failure):
        logger.warning("request failed: %s", failure.request.url)
        raise IgnoreRequest()

    def _extract_json_ld(self, response: Response):
        for blk in response.css("script[type='application/ld+json']::text").getall():
            try:
                obj = json.loads(blk)
                if isinstance(obj, dict) and obj.get("@type") in {"TouristTrip", "Place"}:
                    return obj
            except json.JSONDecodeError:
                continue
        return None

    def _tour_id_from_url(self, url: str) -> str | None:
        m = TOUR_RX.search(url)
        return m.group(1) if m else None

    def _poi_id_from_url(self, url: str) -> str | None:
        m = POI_RX.search(url)
        return m.group(1) if m else None

    def _infer_type(self, response, ld):
        body = response.text.lower()
        if "kerékpár" in body or "bringa" in body or "bicikli" in body:
            return "cycling"
        if "túra" in body:
            return "hiking"
        return "unknown"

    def _is_official(self, response, ld):
        body = response.text
        return any(t in body for t in ("OKT", "Országos Kéktúra", "DDK", "RPDDK", "AK"))

    def _official_code(self, response, ld):
        m = re.search(r"(OKT|DDK|RPDDK|AK)[-\s]?(\d+)", response.text)
        if m:
            return f"{m.group(1)}-{m.group(2)}"
        return None

    def _extract_length_km(self, response, ld):
        m = re.search(r"hossz[a-z]*[:\s]*([\d,.]+)\s*km", response.text, re.I)
        if m:
            return float(m.group(1).replace(",", "."))
        return None

    def _extract_ascent(self, response, ld):
        m = re.search(r"szintemelked[a-z]*[:\s]*([\d]+)\s*m", response.text, re.I)
        if m:
            return int(m.group(1))
        return None
```

### 8.1 Pipeline a stage DB-be

```python
# pipelines.py
import json
import boto3
import psycopg
from scrapy.exceptions import DropItem

class S3RawStoragePipeline:
    def __init__(self, bucket, prefix):
        self.s3 = boto3.client("s3")
        self.bucket = bucket
        self.prefix = prefix

    @classmethod
    def from_crawler(cls, crawler):
        s = crawler.settings
        return cls(s.get("RAW_S3_BUCKET", "cycling-raw"),
                   s.get("RAW_S3_PREFIX", "termeszetjaro"))

    def process_item(self, item, spider):
        if item.get("kind") == "gpx":
            key = f"{self.prefix}/gpx/{item['gpx_sha256']}.gpx.gz"
            self.s3.put_object(Bucket=self.bucket, Key=key, Body=item["gpx_bytes_gz"],
                               ContentEncoding="gzip", ContentType="application/gpx+xml")
            item["gpx_s3_key"] = key
            item.pop("gpx_bytes_gz", None)
        return item


class StageDBWriterPipeline:
    def __init__(self, dsn):
        self.conn = psycopg.connect(dsn, autocommit=False)

    @classmethod
    def from_crawler(cls, crawler):
        return cls(crawler.settings["PG_DSN"])

    def close_spider(self, spider):
        try:
            self.conn.commit()
        finally:
            self.conn.close()

    def process_item(self, item, spider):
        with self.conn.cursor() as cur:
            if item["kind"] == "tour":
                cur.execute("""
                  INSERT INTO stage_termeszetjaro.tour_raw
                    (tour_id, slug, title, tour_type, official_route, official_code,
                     length_km, ascent_m, difficulty_text, gpx_url, schema_org_json,
                     fetched_at, http_status)
                  VALUES (%(tid)s,%(slug)s,%(title)s,%(ttype)s,%(off)s,%(ocode)s,
                          %(len)s,%(asc)s,%(diff)s,%(gpx)s,%(jld)s::jsonb,
                          %(fa)s,%(http)s)
                  ON CONFLICT (tour_id) DO UPDATE SET
                     title = EXCLUDED.title,
                     length_km = COALESCE(EXCLUDED.length_km, stage_termeszetjaro.tour_raw.length_km),
                     fetched_at = EXCLUDED.fetched_at
                """, dict(
                    tid=item["source_route_id"], slug=item["source_route_id"],
                    title=item["title"], ttype=item["tour_type"],
                    off=item["official_route"], ocode=item.get("official_code"),
                    len=item.get("length_km"), asc=item.get("ascent_m"),
                    diff=item.get("difficulty_text"), gpx=item.get("gpx_url"),
                    jld=json.dumps(item.get("schema_org_json")),
                    fa=item["fetched_at"], http=item["http_status"]))
            elif item["kind"] == "poi":
                cur.execute("""
                  INSERT INTO stage_termeszetjaro.poi_raw
                    (poi_id, name, poi_type, lat, lon, official, fetched_at)
                  VALUES (%(pid)s,%(n)s,%(pt)s,%(la)s,%(lo)s,%(off)s,%(fa)s)
                  ON CONFLICT (poi_id) DO UPDATE SET
                     name = EXCLUDED.name, lat = EXCLUDED.lat,
                     lon = EXCLUDED.lon, fetched_at = EXCLUDED.fetched_at
                """, dict(pid=item["source_poi_id"], n=item["name"], pt=item["poi_type"],
                          la=item["lat"], lo=item["lon"], off=item["official"],
                          fa=item["fetched_at"]))
        return item
```

---

## 9. Feldolgozó pipeline (HTML + GPX + JSON API parsing)

### 9.1 GPX `<tj:*>` extension parser

```python
# parser_gpx_tj.py
from lxml import etree
import gpxpy
from shapely.geometry import LineString

TJ_NS = {"tj": "http://termeszetjaro.hu/gpx/extensions/1"}

def parse_gpx_with_tj(blob: bytes) -> dict:
    g = gpxpy.parse(blob.decode("utf-8", "ignore"))
    pts = []
    for t in g.tracks:
        for s in t.segments:
            for p in s.points:
                if p.latitude is None or p.longitude is None: continue
                pts.append((p.longitude, p.latitude, p.elevation or 0))
    if len(pts) < 2:
        raise ValueError("too few points")
    line = LineString(pts)

    # Parse raw XML for tj:extensions
    root = etree.fromstring(blob)
    tj_ext = {}
    for elem in root.iter():
        for k in ("difficulty","surface","season","cycling_passable"):
            for e in elem.iterfind(f"./{{http://termeszetjaro.hu/gpx/extensions/1}}{k}"):
                tj_ext[k] = e.text.strip() if e.text else None

    return {
        "wkt": line.wkt,
        "n_points": len(pts),
        "start_lon": pts[0][0], "start_lat": pts[0][1],
        "end_lon":   pts[-1][0], "end_lat":   pts[-1][1],
        "tj_extensions": tj_ext,
    }
```

### 9.2 JSON-LD parser

```python
# parser_jsonld.py
def normalize_tourist_trip(jsonld: dict) -> dict:
    geo = jsonld.get("geo") or {}
    return {
        "name": jsonld.get("name"),
        "description": (jsonld.get("description") or "")[:512],  # truncated for storage
        "duration_iso": jsonld.get("duration"),
        "start_lat": float(geo.get("latitude")) if geo.get("latitude") else None,
        "start_lon": float(geo.get("longitude")) if geo.get("longitude") else None,
    }
```

### 9.3 Cycle-passability check

```python
# enrich/cycle_passability.py
import httpx

VALHALLA = "http://valhalla:8002/route"

def is_cycle_passable(start_lat, start_lon, end_lat, end_lon, gpx_length_km):
    body = {
        "locations": [
            {"lat": start_lat, "lon": start_lon},
            {"lat": end_lat,   "lon": end_lon},
        ],
        "costing": "bicycle",
        "costing_options": {"bicycle": {"bicycle_type": "Hybrid"}},
        "directions_options": {"units": "kilometers"},
    }
    try:
        r = httpx.post(VALHALLA, json=body, timeout=30)
        if r.status_code != 200:
            return False
        km = r.json()["trip"]["summary"]["length"]
        # Within ±25% of original GPX length → reasonable cycle alternative
        return abs(km - gpx_length_km) / max(gpx_length_km, 0.1) < 0.25
    except Exception:
        return False
```

---

## 10. Frissítési stratégia

A Természetjáró frissítési ritmusa **alacsony, de nem nulla**. Frissítési mátrix:

| Adat | Mit | Mikor | Hogyan |
|---|---|---|---|
| Tour-listák | sitemap delta | Naponta 00:30 CET | `<lastmod>` alapján |
| Tour HTML/JSON | módosultak | Heti | ETag/Last-Modified |
| GPX blob | hash változás | Heti | SHA-256 összevetés |
| Hivatalos OKT/DDK | félévente teljes | Jan / Júl | manuális trigger + MTSZ email |
| POI | havi delta | Havi | sitemap-poi delta |
| Esemény | folyamatosan | Heti | Külön CronJob |

### 10.1 OKT speciális kezelés

A hivatalos Országos Kéktúra **kanonikus reprezentáció**. A `cycling.official_long_distance_segment` táblába csak akkor kerül új sor, ha:

1. Az MTSZ hivatalos GPX bundle-je tartalmazza
2. A `last_official_update` mező legalább 6 hónapot mutat előrébb
3. Manuális ellenőrzés zöld lámpa (`official_review.md` PR a repóban)

---

## 11. Storage és skálázás

### 11.1 Méretbecslés

| Komponens | Méret |
|---|---|
| HTML raw (gzip) | 8.000 tour × 100 kB ≈ 800 MB |
| GPX raw | 6.000 × 30 kB ≈ 180 MB |
| JSON API raw | ~50 MB |
| POI raw | 25.000 × 5 kB ≈ 125 MB |
| Postgres stage | ~3 GB |
| Postgres canonical (TJ kontribúció) | ~1.2 GB |

### 11.2 Skálázás

- 1 worker (Scrapy nem skálázódik, a crawl-delay miatt értelmetlen)
- Postgres ugyanaz az instance, mint a többi forrás (`db.t4g.medium`)
- S3 standard 180 napig, aztán Glacier

---

## 12. Monitoring és riasztások

### 12.1 Metrikák

```
tj_scrapy_items_total{kind="tour|poi|gpx|tour_json"}
tj_scrapy_response_status_total{code}
tj_scrapy_download_latency_seconds_bucket
tj_official_segments_count
tj_poi_osm_crosscheck_rate
tj_stage_freshness_hours
```

### 12.2 Alertek

```yaml
groups:
- name: termeszetjaro
  rules:
  - alert: TJScrapyStuck
    expr: time() - tj_last_item_timestamp > 7200
    for: 30m
    labels: { severity: warning }
  - alert: TJOfficialCountDropped
    expr: tj_official_segments_count < 200
    for: 10m
    labels: { severity: critical }
    annotations:
      summary: "OKT/DDK official segment count below threshold — possible data corruption"
  - alert: TJPoiCrossCheckLow
    expr: tj_poi_osm_crosscheck_rate < 0.5
    for: 1h
    labels: { severity: warning }
    annotations:
      summary: "Less than 50% of TJ POIs have an OSM cross-check"
```

### 12.3 Grafana dashboard

Egy `TJ Spider` dashboard:
- Crawl-progress (URL/h)
- Response status distribution
- Stage table row counts
- Last successful sync (timestamp)
- OSM POI cross-check ratio (tendencia)

---

## 13. Költségbecslés (HUF/EUR)

| Tétel | Mennyiség | EUR/hó | HUF/hó (400 árf.) |
|---|---|---|---|
| Worker EC2 `t4g.small` (8h/nap) | 240 h | 2,02 | 808 |
| Postgres (megosztott arány) | — | 5,00 | 2.000 |
| S3 raw | 1,2 GB | 0,03 | 12 |
| S3 PUT | 50.000 | 0,25 | 100 |
| S3 GET | 8.000 | 0,01 | 5 |
| Valhalla self-host (megosztott) | — | 3,00 | 1.200 |
| **Összesen** | | **~10,3 €** | **~4.125 HUF** |

> A Valhalla saját üzemeltetésű, mert sok forrás használja a `cycle-passability` check-hez. Ennek a forrásnak nagyjából 30%-a tudható be.

---

## 14. Biztonság

### 14.1 Titkok

- `RAW_S3_BUCKET`, `PG_DSN`, `ALERT_WEBHOOK_URL`, `MTSZ_CONTACT_EMAIL`
- AWS Secrets Manager-ben tárolva, K8s Secret-ként mountolva

### 14.2 Adatvédelem

- HTTPS-only (`scrapy` `download_handlers` `https`)
- Postgres at-rest titkosítás
- `redact_pii()` pipeline lépés a `uploader_name` mezőre

### 14.3 Hálózati biztonság

- Worker külön VPC-ben
- Csak kimenő 443/80 engedélyezett
- A belső Valhalla service mesh VPC-belül

### 14.4 Etikus konfiguráció

- `ROBOTSTXT_OBEY = True` (Scrapy default, de explicit beállítva)
- `AUTOTHROTTLE_ENABLED = True` (adaptív lassítás magas válaszidő esetén)
- Soha nem submitolunk form-okat (csak GET)
- Soha nem próbáljuk a logged-in tartalmakat

---

## 15. Tesztelés — pytest + VCR

```python
# tests/test_tj_parsers.py
import pytest
from pathlib import Path
from termeszetjaro.parser_gpx_tj import parse_gpx_with_tj
from termeszetjaro.parser_jsonld import normalize_tourist_trip

FIX = Path(__file__).parent / "fixtures"

def test_gpx_with_tj_extensions():
    blob = (FIX / "okt-12.gpx").read_bytes()
    r = parse_gpx_with_tj(blob)
    assert r["n_points"] > 100
    assert "difficulty" in r["tj_extensions"]

def test_jsonld_tourist_trip():
    import json
    ld = json.loads((FIX / "tourist_trip.json").read_text(encoding="utf-8"))
    n = normalize_tourist_trip(ld)
    assert n["name"]
    assert 0 < n["start_lat"] < 90 if n["start_lat"] else True
```

```python
# tests/test_tj_spider.py
import pytest
from scrapy.http import HtmlResponse, Request
from termeszetjaro.spiders.termeszetjaro import TermeszetjaroSpider

def _make_response(url: str, body: bytes):
    return HtmlResponse(url=url, body=body, encoding="utf-8",
                        request=Request(url=url))

def test_parse_tour_html_extracts_title():
    s = TermeszetjaroSpider()
    body = (b"<html><head><title>Test tour</title></head>"
            b"<body><h1>Kétbükki tour</h1>"
            b"<a href='/api/v1/route/12/gpx'>GPX</a>"
            b"<span>hossz: 42,3 km</span>"
            b"<span>szintemelkedés: 850 m</span>"
            b"</body></html>")
    response = _make_response("https://www.termeszetjaro.hu/utvonal/ketbukki-tour-42", body)
    items = list(s.parse_tour_html(response))
    tour = next(i for i in items if isinstance(i, dict) and i.get("kind") == "tour")
    assert tour["title"] == "Kétbükki tour"
    assert tour["length_km"] == 42.3
    assert tour["ascent_m"] == 850
    assert tour["gpx_url"].endswith("/gpx")
```

### 15.1 VCR cassette

```yaml
# tests/cassettes/tour_okt12.yaml
interactions:
- request:
    method: GET
    uri: https://www.termeszetjaro.hu/utvonal/okt-12
  response:
    status:
      code: 200
      message: OK
    headers:
      Content-Type: ["text/html; charset=utf-8"]
    body:
      string: "<html>...</html>"
```

---

## 16. Telepítés (Docker, k8s CronJob, GitHub Actions)

### 16.1 Dockerfile

```dockerfile
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    libxml2-dev libxslt-dev libpq-dev gcc curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . ./
USER 1000:1000
ENTRYPOINT ["scrapy", "crawl", "termeszetjaro"]
```

### 16.2 k8s CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: tj-spider
  namespace: cycling
spec:
  schedule: "30 0 * * *"
  timeZone: Europe/Budapest
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 1
      activeDeadlineSeconds: 36000      # 10 h (long because of 5s crawl-delay)
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: spider
              image: registry.local/cycling/termeszetjaro:1.0.0
              args: ["-s", "JOBDIR=/state/jobs"]
              envFrom:
                - secretRef: { name: tj-secrets }
              resources:
                requests: { cpu: "200m", memory: "512Mi" }
                limits:   { cpu: "1",    memory: "2Gi" }
              volumeMounts:
                - { name: state, mountPath: /state }
          volumes:
            - name: state
              persistentVolumeClaim: { claimName: tj-spider-state }
```

A `JOBDIR` állapotot ad a Scrapy-nek a részleges visszanyerésre, ha az előző futás megszakadt.

### 16.3 GitHub Actions

```yaml
name: tj-ci
on:
  push: { paths: [ "sources/termeszetjaro/**" ] }
  pull_request: { paths: [ "sources/termeszetjaro/**" ] }

jobs:
  lint:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install ruff mypy
      - run: ruff check sources/termeszetjaro
      - run: mypy --strict sources/termeszetjaro/termeszetjaro

  test:
    runs-on: ubuntu-22.04
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r sources/termeszetjaro/requirements.txt
      - run: pytest sources/termeszetjaro/tests -v --cov

  e2e-vcr:
    runs-on: ubuntu-22.04
    needs: test
    steps:
      - uses: actions/checkout@v4
      - run: |
          scrapy crawl termeszetjaro -s CLOSESPIDER_PAGECOUNT=5 \
            -s HTTPCACHE_ENABLED=False \
            -L INFO
        env:
          VCR_MODE: replay
```

---

## 17. Adatpublikálás (REST API, vector tiles)

### 17.1 Endpoint-ek

```
GET /api/v1/tj/tours?bbox=...&type=cycling
GET /api/v1/tj/tours/{route_uuid}
GET /api/v1/tj/official?code=OKT
GET /api/v1/tj/pois?bbox=...&type=well&osm_validated=true
GET /api/v1/tj/events?from=...&to=...
```

### 17.2 Az „official OKT" speciális layer

A `cycling.official_long_distance_segment` táblát **külön, lassan változó vektorrétegként** publikáljuk, hetente egyszer újragenerálva (tile package). Ezt a CDN sokáig cache-elheti.

```sql
CREATE OR REPLACE FUNCTION cycling.tile_official(z int, x int, y int)
RETURNS bytea AS $$
WITH bounds AS (SELECT ST_TileEnvelope(z,x,y) AS env)
SELECT ST_AsMVT(t.*, 'official_routes', 4096, 'geom')
FROM (
  SELECT route_code, segment_code, segment_name, length_km,
         ST_AsMVTGeom(geom, b.env, 4096, 32, true) AS geom
  FROM cycling.official_long_distance_segment, bounds b
  WHERE geom && b.env
) t WHERE geom IS NOT NULL;
$$ LANGUAGE sql STABLE PARALLEL SAFE;
```

### 17.3 GraphQL alternatíva (opcionális)

```graphql
type OfficialSegment {
  routeCode: String!
  segmentCode: String!
  name: String!
  lengthKm: Float!
  geometry: GeoJSON!
}
type Query {
  officialSegments(routeCode: String!): [OfficialSegment!]!
  tjTours(bbox: BBox!, type: TourType): [Tour!]!
}
```

### 17.4 Forrás-attribúció

**Minden** TJ-eredetű elemen a kliens oldalon kötelező attribúció:

```
Forrás: Természetjáró.hu / Magyar Természetjáró Szövetség (MTSZ)
```

Ezt az API válaszában `meta.attribution` mezőként mindig visszaadjuk, és a frontend `<MapAttribution />` komponens megjeleníti a térkép sarkában.

---

## 18. Runbook

### 18.1 Indikációk

| Tünet | Diagnózis | Tennivaló |
|---|---|---|
| `TJScrapyStuck` alert | Spider akadt (network or CSS változás) | `kubectl logs cronjob/tj-spider`; rebuild & redeploy |
| `TJOfficialCountDropped` | Hivatalos szakaszok eltűntek | **Soft revert** a `cycling.official_long_distance_segment` előző snapshot-jára |
| Crawl-delay vita | MTSZ panaszt jelez | Azonnal `kubectl scale cronjob tj-spider --suspend`; email válasz |
| OSM cross-check rate esik | OSM Overpass instance leállt | Másik Overpass mirror |
| JSON API 401-et ad | A belső API auth-ot kapott | Spider degradál: csak HTML fallback útvonalon |

### 18.2 OKT félévi review

```bash
# Letöltjük a hivatalos GPX csomagot (manuálisan, böngészőből)
# Átkonvertáljuk shapefile-lá:
ogr2ogr -f "ESRI Shapefile" /tmp/okt.shp /tmp/okt.gpx tracks
# Beimportáljuk staging-be:
shp2pgsql -s 4326 -I /tmp/okt.shp cycling.staging_okt | \
  psql $PG_DSN
# Diff-eljük a meglévővel:
psql $PG_DSN -c "
  SELECT segment_code, ST_HausdorffDistance(a.geom, b.geom) AS hausdorff_m
  FROM cycling.official_long_distance_segment a
  JOIN cycling.staging_okt b USING (segment_code)
  WHERE ST_HausdorffDistance(a.geom, b.geom) > 50;
"
```

Ha minden diff < 50 m → no-op.
Ha valamelyik > 50 m → PR-t nyitunk `official_review.md` template-tel.

### 18.3 Takedown / data removal

Ugyanaz a folyamat, mint a 07-es forrásnál: soft delete + S3 + CDN purge.

---

## 19. Roadmap

| Verzió | Cél | ETA |
|---|---|---|
| 1.0 | Spider + parser + OKT first import | Q2 2026 |
| 1.1 | Valhalla cycle-passability enrich | Q2 2026 |
| 1.2 | POI OSM cross-validation rendszer | Q3 2026 |
| 1.3 | Eseménynaptár integráció | Q3 2026 |
| 1.4 | „Bringával is járható" gyalogtúra-flag motor | Q4 2026 |
| 2.0 | MTSZ partnerségi adatfeed (direkt) | Q1 2027, függőség: MTSZ válasza |
| 2.1 | Multi-day route stitching (OKT teljes vonal) | Q2 2027 |

---

## 20. Referenciák

- Természetjáró.hu: <https://www.termeszetjaro.hu>
- Magyar Természetjáró Szövetség: <https://mtsz.org/>
- Országos Kéktúra: <https://www.kektura.hu> (gondnokság: MTSZ)
- Scrapy: <https://scrapy.org/>
- Valhalla routing engine: <https://valhalla.github.io/valhalla/>
- OSM Overpass API: <https://overpass-api.de>
- Schema.org TouristTrip: <https://schema.org/TouristTrip>
- Belső dokumentáció: `cycling-data-sources/07_bringamania.md`, `cycling-data-sources/11_balatonbringa-club.md`

---

*Vége a Természetjáró.hu / MTSZ spec dokumentumának. Verzió 1.0 — 2026-05-19 — Effectime cycling data platform.*
