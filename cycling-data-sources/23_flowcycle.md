# Flowcycle (flowcycle.hu) — Teljes backend terv és adatkinyerési specifikáció

> Forrás: **Flowcycle** — a `flowcycle.hu` magyar nyelvű kerékpáros túraportál, amely közösségi és szerkesztőségi gondozású tematikus túraajánlókat, leírásokat, képeket és letölthető **GPX / KML** nyomvonalfájlokat publikál. A tartalom magyarországi és határon átnyúló kerékpártúrákat (országút, MTB, gravel, családi, gyermekbarát) ölel fel, sok esetben részletes szakasz-leírással, lift/transzfer ajánlásokkal és nehézségi besorolással.

> Cél: a `flowcycle.hu` által közzétett **publikus** túrakatalógus polite scrape-elése, a GPX/KML mellékletek letöltése, parszolása, PostGIS-be normalizálása és a Panellako rendszerbe integrálása — POI + útvonal + tematikus túra entitásokként.

---

## 1. Forrás áttekintés

A Flowcycle a magyar kerékpáros túraközlés egyik fő digitális csatornája. A portál jellemző tartalmi struktúrája:

| Egység | Tartalom |
|---|---|
| Tour landing page | Listázás kategória, régió, nehézség, hossz szerint |
| Tour detail page | Cím, szöveges leírás (gyakran több ezer karakter), térkép-embed, képgaléria, letölthető GPX/KML |
| POI markerek | A térkép-embedben jellemzően leaflet/maplibre marker-ek, helyenként külön „nevezetességek" lista |
| Profil grafikon | Magasságprofil, gyakran SVG vagy canvas alapon |
| Metaadatok | Hossz (km), szintemelkedés (m), nehézség (1–5), úttípus arány (aszfalt/földút/sziklás) |

### 1.1 Tartalmi típusok

- **Egynapos túrák** — leggyakoribb
- **Több napos túrák / körutak** — szakaszokra bontva, mindegyik szakasz külön GPX-szel
- **Tematikus túrák** — gasztronómiai, történelmi, borvidéki
- **Bringás eseménybeszámolók** — szöveges narratíva, gyakran a túranyomvonal csak demonstratív

### 1.2 URL struktúra (megfigyelt)

```
https://flowcycle.hu/                                      # landing
https://flowcycle.hu/turak                                  # listing
https://flowcycle.hu/turak?regio=balaton&nehezseg=2         # szűrt listing
https://flowcycle.hu/turak/[slug]                           # detail page
https://flowcycle.hu/turak/[slug]/letoltes/[fajlnev].gpx    # GPX file
```

### 1.3 Frissítési ritmus

Új cikkek/túrák **heti gyakorisággal** jelennek meg. A pipeline napi crawl-t végez, RSS/Atom feed-et (`/feed.xml` vagy `/turak/feed/`) **első körben** próbálva, fallback-ben sitemap.xml-t (`/sitemap.xml`) és csak végszükségben full HTML scrape-et.

---

## 2. Jogi és licenc helyzet

### 2.1 Szerzői jogi besorolás

A Flowcycle tartalma a **flowcycle.hu üzemeltetőjének és a szerzők** szerzői joga alatt áll. Részletesen:

- A **szövegek, képek, design**: az Szjt. (1999. évi LXXVI.) szerint védettek; továbbközzététel engedélyköteles.
- **GPX/KML nyomvonalak**: vita tárgya, hogy GPS-koordináta-sorozat szerzői jogi műnek minősül-e. A német BGH (Bundesgerichtshof) precedens (I ZR 124/05, „Sportbootkarten") szerint **strukturált koordináta-adatbázis** a sui generis adatbázisjog (Szjt. 60/A. §) hatálya alatt áll. Magyar bíróság ezt explicit nem mondta ki, de óvatos megközelítés ajánlott.

### 2.2 Tényadat-extrakció elve

Mint a 29-es forrásnál (Velencei-tó), itt is **csak tényadatokat** (név, hossz, szintemelkedés, kategória, kezdő-/végpont koordináta, OSM-ből rekonstruált útvonal) emelünk át. **Nem** másoljuk a Flowcycle saját szövegezésű leírását, képeit, designját.

### 2.3 ToS / robots.txt megfelelés

A pipeline első lépése a `robots.txt` és (ha létezik) a `Terms of Service` ellenőrzése. Ha a robots.txt tiltja az automatizált crawl-t, **leállunk** és **engedélyt kérünk** e-mailben (lásd 14. fejezet).

### 2.4 OSM rekonstrukció

A 9. fejezetben leírt módon a GPX-ből származó nyers koordinátákat **OSM-re vetítjük** (map-matching, pl. Valhalla `trace_route` vagy GraphHopper `match`). Az így keletkező geometria az OSM ODbL alá esik, megfelelő attribúcióval.

### 2.5 Engedélykérés workflow

1. **Tájékoztató e-mail** a Flowcycle szerkesztőségének (info@flowcycle.hu) a tervezett scrape-elésről, a forrás-megjelölés módjáról, és a polite rate limitről.
2. **Felajánlás**: visszairány-link a Flowcycle eredeti túraoldalára minden Panellako-túra rekord mellett.
3. **API-megállapodás**: ha lehet, megkérdezzük, van-e privát API, hogy ne HTML-t kelljen scrape-elni.

### 2.6 GDPR

A Flowcycle cikkekben szerzők neve / aliasa szerepelhet — ezt **nem** vesszük át. A POI-k és koordináták nem személyes adatok.

---

## 3. Adatkinyerési felület

Nincs publikus REST API a Flowcycle-nél (megfigyelés alapján). A források:

### 3.1 RSS / Atom feed

Általában a WordPress alapú oldalakon `/feed/` vagy `/turak/feed/` címen elérhető. Ha létezik, ez a legudvariasabb csatorna — frissítések figyelésére kiváló.

### 3.2 sitemap.xml

`flowcycle.hu/sitemap.xml` — a tartalmazott `<url>` elemek alapján fésüljük át a túra-oldalakat. Frissítés-figyelésre a `<lastmod>` érték használható.

### 3.3 HTML scraping (utolsó esély)

Listing oldal → detail oldal → GPX link. **CSS szelektorokat** verzionáljuk, mert a CSS osztály-nevek változhatnak (lásd 9.1 fejezet).

### 3.4 GPX/KML letöltés

A detail oldalon található közvetlen letöltési link (gyakran `https://flowcycle.hu/wp-content/uploads/.../*.gpx`). Hitelesítés nincs.

---

## 4. Hitelesítés, rate limit, kvóták

- **Hitelesítés**: nincs (anonim crawl).
- **Rate limit**: explicit szerver oldali korlát nem ismert. Vállalt önkorlátozás:
  - **1 kérés/másodperc** maximum, host-onként.
  - **Maximum 200 kérés / nap** (a teljes katalógus lefedéséhez bőven elég).
  - Inkrementális mód: csak új vagy `lastmod`-ban változott URL-ek.
- **User-Agent**: `PanellakoBike/1.0 (+https://panellako.example/contact)` — kontakt cím kötelező.
- **HTTP retry**: tenacity-vel, 429/5xx esetén exponenciális visszalépés (2, 4, 8, 16, 32 mp), max 5 próba.
- **ETag/Last-Modified**: HTML és GPX letöltésnél is használjuk, hogy felesleges forgalmat ne generáljunk.
- **Crawl-delay**: ha a `robots.txt` `Crawl-delay` direktívát ad, azt tiszteljük.

---

## 5. Adatmodell a forrásból

### 5.1 Túra detail oldal (HTML kinyerés)

A megfigyelt HTML struktúra alapján:

```html
<article class="tour-detail">
  <h1 class="tour-title">Vörös-kő körtúra Pilisben</h1>
  <div class="tour-meta">
    <span class="distance">42.3 km</span>
    <span class="elevation">+780 m</span>
    <span class="difficulty">3 / 5</span>
    <span class="surface">aszfalt 60% / földút 40%</span>
  </div>
  <div class="tour-region">Pilis</div>
  <div class="tour-tags"><a>MTB</a><a>családi</a></div>
  <div class="tour-description">… 2-5 ezer karakter narratíva …</div>
  <div class="tour-downloads">
    <a href=".../voros-ko-kortura.gpx" class="dl-gpx">GPX</a>
    <a href=".../voros-ko-kortura.kml" class="dl-kml">KML</a>
  </div>
  <div class="tour-map" data-tour-id="481" data-bbox="18.85,47.6,18.95,47.72">…</div>
</article>
```

A pontos szelektorok tartós verziókövetést kapnak (`config/flowcycle_selectors.yaml`). Verzióváltozás esetén a parser elegánsan failel és értesít.

### 5.2 GPX struktúra

Tipikus Flowcycle GPX:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Flowcycle">
  <metadata>
    <name>Vörös-kő körtúra</name>
    <author><name>Flowcycle</name></author>
    <link href="https://flowcycle.hu/turak/voros-ko-kortura"/>
  </metadata>
  <trk>
    <name>Vörös-kő körtúra</name>
    <trkseg>
      <trkpt lat="47.682310" lon="18.892450"><ele>185.4</ele><time>2024-05-12T08:00:00Z</time></trkpt>
      ...
    </trkseg>
  </trk>
  <wpt lat="47.701200" lon="18.910300">
    <name>Vörös-kő kilátó</name>
    <type>viewpoint</type>
  </wpt>
</gpx>
```

### 5.3 KML struktúra

Hasonló a Velence-térképnél leírt KML-hez (`Placemark`, `Point`, `LineString`, `ExtendedData`).

### 5.4 Túra-szintű attribútumok

| Mező | Típus | Forrás | Megjegyzés |
|---|---|---|---|
| `external_id` | string | URL slug | natural key |
| `title` | string | `<h1>` | tényadat |
| `distance_km` | numeric | `.distance` meta | GPX-ből ellenőrzött |
| `elevation_gain_m` | numeric | `.elevation` meta | GPX-ből számolt |
| `difficulty` | int (1–5) | `.difficulty` meta | tényadat |
| `surface_breakdown` | json | `.surface` meta | strukturálva |
| `region` | string | `.tour-region` | normalizálva |
| `tags` | string[] | `.tour-tags a` | normalizálva |
| `bbox` | geometry | `.tour-map[data-bbox]` | gyors lookup |
| `start_geom`, `end_geom` | Point | GPX első/utolsó pont | tényadat |
| `geom` | MultiLineString | GPX track | OSM map-match után |

---

## 6. Cél adatmodell (PostGIS DDL)

```sql
CREATE SCHEMA IF NOT EXISTS flowcycle;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Crawl ütemezett futtatások
CREATE TABLE flowcycle.crawl_run (
    id              BIGSERIAL PRIMARY KEY,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at     TIMESTAMPTZ,
    status          TEXT NOT NULL CHECK (status IN ('running','ok','error')),
    pages_seen      INT DEFAULT 0,
    tours_inserted  INT DEFAULT 0,
    tours_updated   INT DEFAULT 0,
    error_text      TEXT
);

-- URL kapocs tábla — minden megismert detail page, lastmod-dal
CREATE TABLE flowcycle.url_seen (
    url             TEXT PRIMARY KEY,
    first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    lastmod         TIMESTAMPTZ,
    etag            TEXT,
    sha256          TEXT,
    fetch_status    SMALLINT,
    parse_status    TEXT
);

-- Túra entitás
CREATE TABLE flowcycle.tour (
    id                  BIGSERIAL PRIMARY KEY,
    external_id         TEXT UNIQUE NOT NULL,        -- URL slug
    source_url          TEXT NOT NULL,
    title               TEXT NOT NULL,
    title_normalized    TEXT NOT NULL,
    distance_km         NUMERIC(7,2),
    elevation_gain_m    NUMERIC(7,1),
    elevation_loss_m    NUMERIC(7,1),
    difficulty          SMALLINT,                     -- 1-5
    surface_breakdown   JSONB NOT NULL DEFAULT '{}'::jsonb,
    region              TEXT,
    tags                TEXT[] NOT NULL DEFAULT '{}',
    description_summary TEXT,                         -- max 280 char teaser
    bbox                geometry(Polygon, 4326),
    start_geom          geometry(Point, 4326),
    end_geom            geometry(Point, 4326),
    geom_raw            geometry(MultiLineString, 4326),     -- GPX-ből
    geom_matched        geometry(MultiLineString, 4326),     -- OSM map-match
    matching_quality    NUMERIC(4,3),                 -- 0-1
    is_loop             BOOLEAN GENERATED ALWAYS AS (ST_DWithin(start_geom, end_geom, 0.0005)) STORED,
    gpx_path            TEXT,                         -- raw store-on belüli relatív útvonal
    kml_path            TEXT,
    license_note        TEXT NOT NULL DEFAULT 'forrás: flowcycle.hu — tényadat-extrakció, OSM (ODbL) geometriával',
    first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX ix_flowcycle_tour_geom  ON flowcycle.tour USING GIST (geom_matched);
CREATE INDEX ix_flowcycle_tour_bbox  ON flowcycle.tour USING GIST (bbox);
CREATE INDEX ix_flowcycle_tour_tags  ON flowcycle.tour USING GIN  (tags);
CREATE INDEX ix_flowcycle_tour_title ON flowcycle.tour USING GIN  (title_normalized gin_trgm_ops);
CREATE INDEX ix_flowcycle_tour_region ON flowcycle.tour (region);

-- Túrához kapcsolt POI-k
CREATE TABLE flowcycle.tour_poi (
    id              BIGSERIAL PRIMARY KEY,
    tour_id         BIGINT NOT NULL REFERENCES flowcycle.tour(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    poi_type        TEXT NOT NULL,
    seq             INT,
    geom            geometry(Point, 4326) NOT NULL,
    attributes      JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ix_flowcycle_tour_poi_geom ON flowcycle.tour_poi USING GIST (geom);

-- Szakaszok (csak több napos túráknál)
CREATE TABLE flowcycle.tour_stage (
    id              BIGSERIAL PRIMARY KEY,
    tour_id         BIGINT NOT NULL REFERENCES flowcycle.tour(id) ON DELETE CASCADE,
    seq             INT NOT NULL,
    title           TEXT NOT NULL,
    distance_km     NUMERIC(7,2),
    elevation_gain_m NUMERIC(7,1),
    geom            geometry(LineString, 4326) NOT NULL,
    UNIQUE (tour_id, seq)
);

-- Raw GPX/KML referencia
CREATE TABLE flowcycle.raw_asset (
    id              BIGSERIAL PRIMARY KEY,
    tour_id         BIGINT NOT NULL REFERENCES flowcycle.tour(id) ON DELETE CASCADE,
    kind            TEXT NOT NULL CHECK (kind IN ('gpx','kml','img')),
    s3_key          TEXT NOT NULL,
    sha256          TEXT NOT NULL,
    bytes           BIGINT NOT NULL,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE flowcycle.ingest_log (
    id              BIGSERIAL PRIMARY KEY,
    crawl_run_id    BIGINT REFERENCES flowcycle.crawl_run(id),
    url             TEXT NOT NULL,
    stage           TEXT NOT NULL,                    -- fetch|parse|match|upsert
    status          TEXT NOT NULL,
    detail          TEXT,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 7. Backend architektúra (L1–L8 rétegek)

```mermaid
flowchart LR
    L1[L1: flowcycle.hu<br/>RSS / sitemap / HTML] --> L2[L2: Crawler<br/>scrapy+playwright opt.]
    L2 --> L3[L3: Raw S3<br/>HTML, GPX, KML]
    L3 --> L4[L4: HTML parser<br/>parsel/BeautifulSoup]
    L3 --> L4b[L4b: GPX parser<br/>gpxpy]
    L4 --> L5[L5: Normalizáció<br/>POI taxonómia, tag normalizálás]
    L4b --> L5
    L5 --> L6[L5b: Map-matching<br/>Valhalla trace_attributes]
    L6 --> L7[L6: PostGIS upsert<br/>flowcycle.* séma]
    L7 --> L8[L7: API + Tiles<br/>FastAPI + pg_tileserv]
    L8 --> L9[L8: Kliens<br/>Panellako frontend]
    L4 -.-> ALERT[Selector drift alarm]
```

- **L1 — Forrás**: `flowcycle.hu`
- **L2 — Crawler**: Python, scrapy keretrendszer; playwright csak akkor, ha kiderül, hogy a navigáció JS-függő.
- **L3 — Raw S3**: minden letöltött dokumentum SHA-256 alapú elnevezéssel (`s3://panellako-raw/flowcycle/2026/05/abc123…html`).
- **L4 — Parser**: külön HTML és külön GPX/KML parser.
- **L5 — Normalizáció**: POI/tag taxonómia, regio név unifikáció (pl. "Pilis" → `region.pilis`).
- **L5b — Map-matching**: lokális Valhalla példány (HU OSM extract-tel), `/trace_attributes` végpont.
- **L6 — PostGIS upsert**: `external_id` alapú UPSERT, ON CONFLICT update.
- **L7 — API + Tiles**: FastAPI + pg_tileserv.
- **L8 — Kliens**: a frontend a Panellako MapLibre GL alapú megjelenítőjén integrálva.

---

## 8. Automatizált letöltő — Python kód

```python
# scripts/ingest_flowcycle.py
"""Flowcycle túra crawler.

Polite scraping: RSS/sitemap-first stratégia, ETag/Last-Modified cache,
GPX/KML letöltés és raw S3-be archiválás.
"""
from __future__ import annotations

import hashlib
import logging
import os
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import psycopg
import requests
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

LOG = logging.getLogger("flowcycle.ingest")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

BASE = "https://flowcycle.hu"
UA = "PanellakoBike/1.0 (+https://panellako.example/contact)"
RAW_ROOT = Path(os.environ.get("RAW_ROOT", "./raw/flowcycle"))
PG_DSN = os.environ["PG_DSN"]
RATE_LIMIT_SEC = 1.0
MAX_PAGES = 500


@dataclass(frozen=True)
class TourURL:
    url: str
    lastmod: str | None
    source: str  # 'rss' | 'sitemap' | 'listing'


def is_allowed(url: str) -> bool:
    rp = RobotFileParser()
    rp.set_url(urljoin(url, "/robots.txt"))
    try:
        rp.read()
    except Exception:
        return True
    return rp.can_fetch(UA, url)


@retry(wait=wait_exponential(multiplier=2, min=2, max=32), stop=stop_after_attempt(5))
def http_get(url: str, *, etag: str | None = None, stream: bool = False) -> requests.Response:
    headers = {"User-Agent": UA, "Accept-Language": "hu,en;q=0.5"}
    if etag:
        headers["If-None-Match"] = etag
    resp = requests.get(url, headers=headers, timeout=30, stream=stream)
    if resp.status_code in (429, 503, 502, 504):
        resp.raise_for_status()
    return resp


def discover_via_rss() -> Iterable[TourURL]:
    rss_candidates = [f"{BASE}/feed/", f"{BASE}/turak/feed/", f"{BASE}/rss"]
    for cand in rss_candidates:
        try:
            r = http_get(cand)
        except Exception:
            continue
        if r.status_code != 200 or "xml" not in r.headers.get("Content-Type", ""):
            continue
        root = ET.fromstring(r.text)
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        # try RSS
        for item in root.iter("item"):
            link = item.findtext("link")
            pub = item.findtext("pubDate")
            if link and "/turak/" in link:
                yield TourURL(link, pub, "rss")
        # try Atom
        for entry in root.iter("{http://www.w3.org/2005/Atom}entry"):
            link_el = entry.find("{http://www.w3.org/2005/Atom}link")
            link = link_el.get("href") if link_el is not None else None
            upd = entry.findtext("{http://www.w3.org/2005/Atom}updated")
            if link and "/turak/" in link:
                yield TourURL(link, upd, "rss")
        return                                                    # csak egy működő RSS-ből olvasunk


def discover_via_sitemap() -> Iterable[TourURL]:
    try:
        r = http_get(f"{BASE}/sitemap.xml")
    except Exception:
        return
    root = ET.fromstring(r.text)
    ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
    # nested sitemapindex esetén
    for sm in root.findall(f"{ns}sitemap"):
        loc = sm.findtext(f"{ns}loc")
        if not loc:
            continue
        try:
            sr = http_get(loc)
            sroot = ET.fromstring(sr.text)
        except Exception:
            continue
        for u in sroot.findall(f"{ns}url"):
            url = u.findtext(f"{ns}loc")
            lm = u.findtext(f"{ns}lastmod")
            if url and "/turak/" in url:
                yield TourURL(url, lm, "sitemap")
        time.sleep(RATE_LIMIT_SEC)
    for u in root.findall(f"{ns}url"):
        url = u.findtext(f"{ns}loc")
        lm = u.findtext(f"{ns}lastmod")
        if url and "/turak/" in url:
            yield TourURL(url, lm, "sitemap")


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def discover_gpx_links(html: str, base_url: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    out = []
    for a in soup.find_all("a", href=True):
        href = a["href"].lower()
        if href.endswith(".gpx") or href.endswith(".kml"):
            out.append(urljoin(base_url, a["href"]))
    return out


def save_raw(content: bytes, key: str) -> tuple[Path, str]:
    today = datetime.now(timezone.utc)
    folder = RAW_ROOT / f"{today:%Y/%m}"
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / key
    target.write_bytes(content)
    return target, sha256_of(target)


def upsert_url(cx, url: str, lastmod: str | None, etag: str | None, status: int, sha: str | None) -> None:
    with cx.cursor() as cur:
        cur.execute(
            """
            INSERT INTO flowcycle.url_seen (url, lastmod, etag, sha256, fetch_status)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (url) DO UPDATE
              SET last_seen_at = now(),
                  lastmod = COALESCE(EXCLUDED.lastmod, flowcycle.url_seen.lastmod),
                  etag    = COALESCE(EXCLUDED.etag,    flowcycle.url_seen.etag),
                  sha256  = COALESCE(EXCLUDED.sha256,  flowcycle.url_seen.sha256),
                  fetch_status = EXCLUDED.fetch_status;
            """,
            (url, lastmod, etag, sha, status),
        )


def crawl() -> None:
    RAW_ROOT.mkdir(parents=True, exist_ok=True)
    if not is_allowed(BASE):
        LOG.error("robots.txt tiltja a crawl-t — abort")
        return
    seen: set[str] = set()
    # 1) RSS prioritás
    candidates: list[TourURL] = list(discover_via_rss())
    if not candidates:
        LOG.info("RSS üres, sitemap fallback")
        candidates = list(discover_via_sitemap())
    LOG.info("felfedezve %d kandidátus URL", len(candidates))

    with psycopg.connect(PG_DSN, autocommit=True) as cx:
        for n, tu in enumerate(candidates):
            if n >= MAX_PAGES or tu.url in seen:
                break
            seen.add(tu.url)
            try:
                resp = http_get(tu.url)
            except Exception as exc:
                LOG.warning("fetch fail %s: %s", tu.url, exc)
                upsert_url(cx, tu.url, tu.lastmod, None, 0, None)
                continue
            html = resp.text
            slug = urlparse(tu.url).path.strip("/").split("/")[-1] or "index"
            html_path, html_sha = save_raw(html.encode("utf-8"), f"{slug}.html")
            upsert_url(cx, tu.url, tu.lastmod, resp.headers.get("ETag"), resp.status_code, html_sha)
            # GPX/KML linkek letöltése
            for asset in discover_gpx_links(html, tu.url):
                try:
                    ar = http_get(asset, stream=True)
                    body = ar.content
                    suffix = asset.rsplit(".", 1)[-1].lower()
                    save_raw(body, f"{slug}.{suffix}")
                except Exception as exc:
                    LOG.warning("asset fail %s: %s", asset, exc)
                time.sleep(RATE_LIMIT_SEC)
            time.sleep(RATE_LIMIT_SEC)


if __name__ == "__main__":
    crawl()
```

---

## 9. Feldolgozó pipeline

### 9.1 HTML parszolás verziózott szelektorokkal

```yaml
# config/flowcycle_selectors.yaml
version: 2
selectors:
  title:            "h1.tour-title"
  distance:         ".tour-meta .distance"
  elevation:        ".tour-meta .elevation"
  difficulty:       ".tour-meta .difficulty"
  surface:          ".tour-meta .surface"
  region:           ".tour-region"
  tags:             ".tour-tags a"
  description:      ".tour-description"
  gpx_link:         "a.dl-gpx[href]"
  kml_link:         "a.dl-kml[href]"
  bbox:             ".tour-map[data-bbox]"
  tour_id:          ".tour-map[data-tour-id]"
fallback_selectors:
  title: ["h1.entry-title", "h1"]
```

```python
# scripts/parse_flowcycle_html.py
import re
import yaml
from bs4 import BeautifulSoup

CFG = yaml.safe_load(open("config/flowcycle_selectors.yaml"))

def first(soup, sel_key: str) -> str | None:
    sel = CFG["selectors"].get(sel_key)
    if sel:
        el = soup.select_one(sel)
        if el:
            return el.get_text(strip=True)
    for fb in CFG.get("fallback_selectors", {}).get(sel_key, []):
        el = soup.select_one(fb)
        if el:
            return el.get_text(strip=True)
    return None

def parse_tour(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    distance_raw = first(soup, "distance") or ""
    elev_raw = first(soup, "elevation") or ""
    diff_raw = first(soup, "difficulty") or ""
    return {
        "title": first(soup, "title"),
        "distance_km": _parse_distance(distance_raw),
        "elevation_gain_m": _parse_elevation(elev_raw),
        "difficulty": _parse_difficulty(diff_raw),
        "surface_breakdown": _parse_surface(first(soup, "surface") or ""),
        "region": first(soup, "region"),
        "tags": [a.get_text(strip=True) for a in soup.select(CFG["selectors"]["tags"])],
        "description_summary": (first(soup, "description") or "")[:280],
    }

def _parse_distance(s: str) -> float | None:
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*km", s, re.I)
    return float(m.group(1).replace(",", ".")) if m else None

def _parse_elevation(s: str) -> float | None:
    m = re.search(r"([+]?\d+(?:[.,]\d+)?)\s*m", s)
    return float(m.group(1).replace(",", ".")) if m else None

def _parse_difficulty(s: str) -> int | None:
    m = re.search(r"(\d)\s*/\s*5", s)
    return int(m.group(1)) if m else None

def _parse_surface(s: str) -> dict:
    out = {}
    for m in re.finditer(r"(aszfalt|földút|sziklás|murva|kavics)\s*(\d{1,3})\s*%", s, re.I):
        out[m.group(1).lower()] = int(m.group(2))
    return out
```

### 9.2 GPX parszolás

```python
# scripts/parse_flowcycle_gpx.py
import gpxpy
from shapely.geometry import LineString, MultiLineString, Point

def parse_gpx(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        gpx = gpxpy.parse(f)
    lines = []
    pois = []
    for trk in gpx.tracks:
        for seg in trk.segments:
            coords = [(p.longitude, p.latitude) for p in seg.points]
            if len(coords) >= 2:
                lines.append(LineString(coords))
    for wpt in gpx.waypoints:
        pois.append({
            "name": wpt.name,
            "type": wpt.type,
            "geom": Point(wpt.longitude, wpt.latitude),
        })
    return {
        "geom_raw": MultiLineString(lines),
        "pois": pois,
        "distance_m": gpx.length_2d(),
        "elevation_gain_m": gpx.get_uphill_downhill().uphill,
        "elevation_loss_m": gpx.get_uphill_downhill().downhill,
    }
```

### 9.3 Map-matching Valhalla-val

```python
# scripts/map_match_valhalla.py
import requests
from typing import Iterable

VALHALLA = "http://valhalla:8002/trace_attributes"

def match(coords: Iterable[tuple[float, float]]) -> dict:
    body = {
        "shape": [{"lon": lon, "lat": lat} for lon, lat in coords],
        "costing": "bicycle",
        "shape_match": "map_snap",
        "filters": {"attributes": ["edge.way_id", "edge.length", "shape"], "action": "include"},
    }
    r = requests.post(VALHALLA, json=body, timeout=60)
    r.raise_for_status()
    return r.json()
```

A `matched_points` és `shape` mezőkből MultiLineString rekonstruálható. A `confidence_score` az illesztés minőségét adja → ezt mentjük `matching_quality`-nek.

### 9.4 POI taxonómia

A Flowcycle waypoint `type` mezője szabadon szöveges. Mapping:

```python
TAXONOMY = {
    "viewpoint":   ["kilátó", "viewpoint", "panorama"],
    "food":        ["étterem", "vendéglő", "kávézó", "büfé"],
    "rest":        ["pihenő", "pad", "rest"],
    "water":       ["forrás", "kút", "water"],
    "accommodation": ["szállás", "panzió", "kemping"],
    "attraction":  ["múzeum", "vár", "templom"],
    "nature":      ["természet", "tanösvény", "barlang"],
    "service":     ["szerviz", "javító"],
}

def classify_poi(name: str, raw_type: str | None) -> str:
    blob = f"{name or ''} {raw_type or ''}".lower()
    for target, words in TAXONOMY.items():
        if any(w in blob for w in words):
            return target
    return "other"
```

### 9.5 UPSERT a PostGIS-be

```sql
INSERT INTO flowcycle.tour (
    external_id, source_url, title, title_normalized,
    distance_km, elevation_gain_m, elevation_loss_m, difficulty,
    surface_breakdown, region, tags,
    description_summary, bbox, start_geom, end_geom,
    geom_raw, geom_matched, matching_quality, gpx_path
) VALUES (
    $1, $2, $3, lower(unaccent($3)),
    $4, $5, $6, $7,
    $8::jsonb, $9, $10,
    $11, ST_GeomFromText($12, 4326),
    ST_GeomFromText($13, 4326), ST_GeomFromText($14, 4326),
    ST_GeomFromText($15, 4326), ST_GeomFromText($16, 4326),
    $17, $18
)
ON CONFLICT (external_id) DO UPDATE SET
    title              = EXCLUDED.title,
    title_normalized   = EXCLUDED.title_normalized,
    distance_km        = EXCLUDED.distance_km,
    elevation_gain_m   = EXCLUDED.elevation_gain_m,
    elevation_loss_m   = EXCLUDED.elevation_loss_m,
    difficulty         = EXCLUDED.difficulty,
    surface_breakdown  = EXCLUDED.surface_breakdown,
    region             = EXCLUDED.region,
    tags               = EXCLUDED.tags,
    description_summary = EXCLUDED.description_summary,
    bbox               = EXCLUDED.bbox,
    start_geom         = EXCLUDED.start_geom,
    end_geom           = EXCLUDED.end_geom,
    geom_raw           = EXCLUDED.geom_raw,
    geom_matched       = EXCLUDED.geom_matched,
    matching_quality   = EXCLUDED.matching_quality,
    gpx_path           = EXCLUDED.gpx_path,
    last_updated_at    = now(),
    last_seen_at       = now();
```

---

## 10. Frissítési stratégia

| Ütemezés | Akció |
|---|---|
| Naponta 04:30 CET | RSS feed lekérés, új URL-ek crawl-olása |
| Hetente vasárnap 04:00 | Teljes sitemap újraellenőrzés, lastmod-alapú frissítés |
| Havonta 1-jén | Teljes re-parszolás (selector változás esetére) |
| Negyedéves | OSM map-match újrafuttatás (új OSM extract után) |

A `flowcycle.url_seen` táblában tartjuk a `last_seen_at`-ot. Ha egy URL 180+ napig nem jelent meg sem RSS-ben sem sitemap-ben, akkor a `tour.is_active = FALSE` lesz (soft delete).

```mermaid
stateDiagram-v2
    [*] --> Discovered
    Discovered --> Fetched: HTTP 200
    Discovered --> Skipped: 304 Not Modified
    Fetched --> Parsed
    Parsed --> Matched
    Matched --> Stored
    Stored --> [*]
    Discovered --> Failed: 4xx/5xx
    Failed --> Retry
    Retry --> Fetched
```

---

## 11. Storage és skálázás

| Réteg | Méret-becslés |
|---|---|
| HTML cache (500 túra × 100 KB) | 50 MB |
| GPX (500 × 200 KB átlag) | 100 MB |
| KML (300 × 80 KB) | 24 MB |
| PostGIS `tour` (500 sor × 30 KB geom) | 15 MB |
| PostGIS `tour_poi` (10 000 sor) | 5 MB |
| Vektor tile cache (HU bbox, z6-z14) | 2 GB |

A storage nyomás kicsi, kivéve a Valhalla példányt (HU OSM extract ~500 MB tile-cache + 2 GB RAM).

Skálázási döntések:
- **PostGIS**: single instance, daily `pg_dump` → S3.
- **Valhalla**: shared instance több data source között (lásd 16., 17. fájlok is használják).
- **API**: 2 FastAPI worker, k8s HPA 2-6 között CPU alapján.

---

## 12. Monitoring és riasztások

```yaml
groups:
- name: flowcycle
  rules:
  - alert: FlowcycleCrawlFailed
    expr: increase(flowcycle_crawl_errors_total[24h]) > 5
    for: 1h
    labels: { severity: warning }
  - alert: FlowcycleSelectorDrift
    expr: increase(flowcycle_parse_missing_title_total[1h]) > 3
    for: 30m
    labels: { severity: critical }
    annotations: { summary: "HTML szelektor változhatott — manuális vizsgálat" }
  - alert: FlowcycleMapMatchPoor
    expr: avg_over_time(flowcycle_matching_quality_avg[24h]) < 0.7
    for: 2h
    labels: { severity: warning }
  - alert: FlowcycleStale
    expr: time() - flowcycle_last_successful_crawl_timestamp > 60*60*48
    for: 1h
    labels: { severity: warning }
```

Metrikák:
- `flowcycle_crawl_errors_total{stage}` counter
- `flowcycle_pages_seen_total` counter
- `flowcycle_tours_total{status}` gauge (active/inactive)
- `flowcycle_parse_missing_title_total` counter (selector drift)
- `flowcycle_matching_quality_avg` gauge
- `flowcycle_last_successful_crawl_timestamp` gauge

---

## 13. Költségbecslés

| Tétel | Havi (HUF) |
|---|---|
| 1 vCPU, 2 GB VM (crawler + parser) | 2 500 |
| Valhalla példány (megosztott, allokáció 30%) | 3 000 |
| S3 (10 GB raw) | 200 |
| PostGIS (megosztott, allokáció 5%) | 500 |
| **Összesen** | **~6 200** |

Egy év: ~75 000 HUF.

---

## 14. Biztonság

- **Polite scraping**: rate limit + robots.txt + ToS megfelelés (lásd 2. fejezet).
- **Tartalomszűrés**: a letöltött GPX-eket validáljuk gpxpy-val; nem-GPX/KML fájlokat eldobunk.
- **Sandbox**: a parser konténer no-network módban fut.
- **Titok-kezelés**: PG_DSN, S3 hozzáférés Vault-ból, OIDC service-account-okkal.
- **Audit log**: minden crawl_run + ingest_log soron át követhető.
- **Visszaélés monitoring**: ha a flowcycle.hu HTTP 403 / 429 sorozatos válaszokat ad, automatikusan **leállunk** és értesítjük a contact e-mailt.

---

## 15. Tesztelés — pytest

```python
# tests/test_flowcycle.py
import pytest
from pathlib import Path
from scripts.parse_flowcycle_html import parse_tour, _parse_surface, _parse_difficulty
from scripts.parse_flowcycle_gpx import parse_gpx

FIX = Path(__file__).parent / "fixtures" / "flowcycle"


def test_distance_extracted():
    html = "<html><h1 class='tour-title'>X</h1><div class='tour-meta'><span class='distance'>42,3 km</span></div></html>"
    t = parse_tour(html)
    assert t["distance_km"] == 42.3


def test_difficulty_extracted():
    assert _parse_difficulty("3 / 5") == 3
    assert _parse_difficulty("nincs") is None


def test_surface_breakdown():
    s = _parse_surface("aszfalt 60% / földút 40%")
    assert s == {"aszfalt": 60, "földút": 40}


def test_gpx_parses(tmp_path):
    sample = FIX / "sample.gpx"
    if not sample.exists():
        pytest.skip("nincs GPX fixture")
    out = parse_gpx(str(sample))
    assert out["distance_m"] > 0
    assert out["geom_raw"].geom_type in ("MultiLineString", "LineString")


@pytest.mark.integration
def test_crawl_dry_run(mock_flowcycle_server):
    from scripts.ingest_flowcycle import crawl
    crawl()
    # assert tables filled
```

Tesztelési cél:
- Unit > 85% (parser-ekre).
- Integráció: mock HTTP server-rel (`responses` + WireMock).
- E2E: heti `staging` crawl egy korlátozott (10 URL) almintán, manuálisan ellenőrizve.

---

## 16. Telepítés

### 16.1 Dockerfile

```dockerfile
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    libxml2 libxslt1.1 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY scripts/ ./scripts/
COPY config/ ./config/
ENV PYTHONUNBUFFERED=1 RAW_ROOT=/data/raw TZ=Europe/Budapest
ENTRYPOINT ["python", "-m", "scripts.ingest_flowcycle"]
```

### 16.2 k8s CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: flowcycle-crawl
  namespace: panellako-data
spec:
  schedule: "30 4 * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: crawler
            image: registry.example/panellako/flowcycle-crawl:v1.0.0
            envFrom:
            - secretRef: { name: flowcycle-secrets }
            resources:
              requests: { cpu: 200m, memory: 512Mi }
              limits:   { cpu: 1, memory: 2Gi }
```

### 16.3 GitHub Actions

```yaml
name: flowcycle-ci
on:
  push: { branches: [main], paths: ['scripts/ingest_flowcycle*.py', 'scripts/parse_flowcycle*.py'] }
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env: { POSTGRES_PASSWORD: postgres, POSTGRES_DB: flowcycle_test }
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: psql postgresql://postgres:postgres@localhost/flowcycle_test -f sql/flowcycle_schema.sql
        env: { PGPASSWORD: postgres }
      - run: pytest tests/test_flowcycle.py -v --cov=scripts/parse_flowcycle_html --cov=scripts/parse_flowcycle_gpx
```

---

## 17. Adatpublikálás

### 17.1 REST API

```python
from fastapi import APIRouter, Query

router = APIRouter(prefix="/v1/flowcycle", tags=["flowcycle"])

@router.get("/tours")
async def list_tours(
    bbox: str | None = None,
    region: str | None = None,
    min_km: float | None = None,
    max_km: float | None = None,
    difficulty: int | None = None,
    tag: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    # paraméterezett SQL lekérdezés
    ...

@router.get("/tours/{external_id}")
async def get_tour(external_id: str): ...

@router.get("/tours/{external_id}.geojson")
async def tour_geojson(external_id: str): ...

@router.get("/tours/{external_id}.gpx")
async def tour_gpx(external_id: str):
    """A Panellako szerveréről NEM szolgáljuk újra a Flowcycle GPX-ét.
    Helyette HTTP 302 redirect a flowcycle.hu eredeti URL-jére (forrás-attribúció)."""
```

### 17.2 Vector tiles

```toml
[layers."flowcycle.tour"]
sql = """
SELECT id, external_id, title, distance_km, difficulty, region, geom_matched AS geom
FROM flowcycle.tour
WHERE is_active = TRUE
"""
geometry_column = "geom"
default_srid = 4326
```

### 17.3 Forrás-attribúció

Minden végpont egy `attribution` mezővel tér vissza:

```json
{
  "id": 481,
  "external_id": "voros-ko-kortura",
  "title": "Vörös-kő körtúra Pilisben",
  "attribution": {
    "source": "flowcycle.hu",
    "source_url": "https://flowcycle.hu/turak/voros-ko-kortura",
    "geometry_source": "OpenStreetMap contributors (ODbL)",
    "license_note": "tényadat-extrakció a forrás-portálról, geometria OSM map-match"
  }
}
```

---

## 18. Runbook

| Tünet | Diagnózis | Megoldás |
|---|---|---|
| `FlowcycleSelectorDrift` riasztás | `kubectl logs -l job-name=flowcycle-crawl --tail=500 \| grep "missing title"` | Manuálisan ellenőrizni a HTML-t, frissíteni a `config/flowcycle_selectors.yaml`-t |
| `FlowcycleMapMatchPoor` riasztás | Az új GPX-ek a tó/folyó közelében vannak? | Valhalla bicycle profil paraméterezést finomítani |
| `FlowcycleCrawlFailed` riasztás | HTTP 5xx? 4xx? | Logs alapján; ha 429 → következő futáskor csökkentett rate; ha 403 → robots.txt re-check |
| Hirtelen 0 új túra | RSS leállt? sitemap üres? | Manuális browser-ellenőrzés, fallback a másik discovery csatornára |

```bash
# manuális futtatás
kubectl create job --from=cronjob/flowcycle-crawl flowcycle-manual-$(date +%s) -n panellako-data
# specifikus URL újraparszolása
docker run --rm registry.example/panellako/flowcycle-crawl:v1 python -m scripts.parse_only --url=https://flowcycle.hu/turak/voros-ko-kortura
```

---

## 19. Roadmap

| Mérföldkő | Tartalom | Becsült |
|---|---|---|
| M1 — Discovery | RSS + sitemap parser, robots.txt ellenőrzés | 1 hét |
| M2 — HTML parser | Verziózott szelektorok, fallback chain | 1.5 hét |
| M3 — GPX/KML parser | gpxpy + fastkml | 3 nap |
| M4 — Map-matching | Valhalla integráció | 1 hét |
| M5 — PostGIS UPSERT | Upsert lekérdezések, audit | 3 nap |
| M6 — API + tiles | FastAPI + pg_tileserv | 1 hét |
| M7 — Monitoring | Prometheus rules, Grafana dashboard | 3 nap |
| M8 — Engedélykérés | E-mail a Flowcycle szerkesztőség felé | 2 hét |
| M9 — i18n + akadálymentesség | hu/en metaadatok | 1 hét |

---

## 20. Referenciák

1. Flowcycle: <https://flowcycle.hu/>
2. Szjt. (1999. évi LXXVI.): <https://net.jogtar.hu/jogszabaly?docid=99900076.tv>
3. OpenStreetMap, ODbL 1.0: <https://www.openstreetmap.org/copyright>
4. Valhalla `trace_attributes`: <https://valhalla.github.io/valhalla/api/map-matching/api-reference/>
5. GraphHopper map-matching: <https://github.com/graphhopper/graphhopper/blob/master/docs/core/map-matching.md>
6. gpxpy: <https://github.com/tkrajina/gpxpy>
7. fastkml: <https://github.com/cleder/fastkml>
8. scrapy: <https://scrapy.org/>
9. parsel / BeautifulSoup
10. pg_tileserv: <https://github.com/CrunchyData/pg_tileserv>
11. FastAPI: <https://fastapi.tiangolo.com/>
12. tenacity: <https://github.com/jd/tenacity>
13. PostGIS: <https://postgis.net/>
14. Sitemaps protokoll: <https://www.sitemaps.org/protocol.html>
15. Robots Exclusion Protocol (RFC 9309): <https://datatracker.ietf.org/doc/html/rfc9309>

> Verzió: 1.0.0 — Készült a Panellako adatplatform számára. A forrás (flowcycle.hu) tartalmának szerzői jogát teljes mértékben tiszteletben tartjuk; a pipeline csak tényadatot extrahál, és minden megjelenítés mellett feltüntetjük az eredeti forrás visszairány-linket.
