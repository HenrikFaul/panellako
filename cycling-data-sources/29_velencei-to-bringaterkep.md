# Velencei-tó bringatérkép — Teljes backend terv és adatkinyerési specifikáció

> Forrás: a Magyar Kerékpárosklub (`kerekparosklub.hu`) által hivatkozott Velencei-tavi bringatérkép — egy turisztikai célú, PDF formátumban közzétett kerékpáros térkép, amelyet a Velencei-tó Turisztikai Nonprofit Kft. és helyi partnerek (Velence, Gárdony, Sukoró, Pákozd, Velencefürdő, Agárd) gondoznak. A térkép kerékpárutakat, kerékpárosbarát szálláshelyeket, szervizeket, kilátókat, strandokat, vasútállomásokat és csatlakozó EuroVelo / Balaton-felvidéki kapcsolatokat ábrázol a Velencei-tavi medence körül.

> Cél: a Velencei-tó térségére (bounding box: `18.50, 47.18, 18.70, 47.27`) vonatkozó PDF/KML/GPX állományok automatizált begyűjtése, parszolása, PostGIS-be töltése és publikálása vektor csempék (vector tiles) + REST API formájában.

---

## 1. Forrás áttekintés

A „Velencei-tó bringatérkép" nem egyetlen, gépileg lekérdezhető API, hanem **publikált térképanyag**, amelyet a régió turisztikai szereplői időről időre frissített PDF-ekben és — egyes éveken — KML/GPX kiegészítőkben hoznak nyilvánosságra. A Magyar Kerékpárosklub a `kerekparosklub.hu` „Térképek" / „Régiós térképek" aloldalain hivatkozza, jellemzően ZIP-be vagy közvetlen PDF linkbe csomagolva.

### 1.1 Tipikus tartalom

| Adattípus | Tartalom |
|---|---|
| Kerékpárutak | Tó körüli aszfaltos bicikliút (kb. 30 km), kapcsolódó mellékágak (Pákozd–Sukoró, Dinnyés–Agárd, Velence–Kápolnásnyék) |
| POI-k | Szállás (B&B, panzió, kemping), vendéglátás, kerékpárkölcsönző, szerviz, strand, kilátó, madárrezervátum, vasútállomás |
| Tematikus rétegek | Történelmi emlékhelyek (Pákozdi csata emlékmű), bortúrák, gyermekbarát útszakaszok |
| Csatlakozások | EuroVelo 6 / EuroVelo 14 közeli kapcsolatok, Velencei-hegység MTB ösvények |
| Szöveges leírás | Távolságok, ajánlott haladási irány, biztonsági figyelmeztetések |

### 1.2 Forrásrendszerek

- **Elsődleges**: `kerekparosklub.hu` régiós térképek listája — innen indul a scraping
- **Másodlagos**: `velenceito.hu`, `velencetourism.hu`, `gardony.hu` — turisztikai oldalak, ahol gyakran szerepel ugyanaz vagy frissebb PDF
- **Tartalék**: archive.org pillanatképek korábbi évek anyagáról
- **Kiegészítő**: OSM-ből visszakeresett Velencei-tó körüli `route=bicycle` relációk a koordináták és attribútumok megerősítésére

### 1.3 Frissítési ritmus

A turisztikai PDF-ek általában **évente** vagy **2–3 évente** frissülnek. A pipeline alapból havonta egyszer (hónap első napja, 03:00 CET) ellenőrzi a forrásoldalt, és csak akkor tölt le, ha a fájl `Last-Modified`/`Content-Length` vagy SHA-256 ujjlenyomat változott.

---

## 2. Jogi és licenc helyzet

A Velencei-tavi bringatérkép **nem** áll szabad licenc alatt. A PDF tartalma az adott évi térképkészítőt (általában a Velencei-tó Turisztikai Nonprofit Kft., illetve a Magyar Kerékpárosklub, esetenként magán nyomdai kiadó) illető szerzői jog tárgya. **Magyar szerzői jogi törvény (1999. évi LXXVI.)** szerint:

- A térkép kartográfiai mű, az Szjt. 1. § (2) bekezdés f) pontja szerint védett.
- A PDF egészének továbbközzététele engedély nélkül **tilos**.
- **Idézés joga (Szjt. 34. §)**: rövid részletek (pl. a tó körüli útvonal hossza, néhány POI neve) **tudományos vagy oktatási célból**, forrásmegjelöléssel idézhetők.
- Az **adat mint olyan** (pl. „A Velencei-tó körüli bicikliút hossza 30 km") **nem** áll szerzői jogi védelem alatt — csak konkrét megfogalmazás, ábra, ikonkészlet, layout védett.

### 2.1 Adatbázis sui generis jog

Az **Szjt. 60/A. §** szerinti adatbázis-előállítói jog (sui generis) is alkalmazható, ha a PDF-en alapuló saját adatbázis lényeges részét újrahasznosítjuk. Megoldás:

1. Csak **tényadatokat** (kerékpárút geometria, POI név + koordináta + típus) emelünk át, nem a teljes kartográfiai megjelenítést.
2. Minden importált rekordhoz **forrásmegjelölést** mentünk (`source = 'velencei-to-bringaterkep'`, `source_url`, `retrieved_at`, `pdf_sha256`).
3. A geometriát **OSM-ből** rekonstruáljuk a PDF-en olvasott útvonal mentén (lásd 9. fejezet), így az eredeti kartográfia geometriai pontjait nem másoljuk, csak a tényt, hogy az adott útszakasz kerékpárútként van jelölve.

### 2.2 OSM mint visszaesési licenc

Ahol OSM-ből származó geometriát használunk, az **ODbL 1.0** (Open Database License) érvényes:

- Attribúció kötelező: „© OpenStreetMap contributors"
- Származékos adatbázis is ODbL alatt publikálandó
- Az általunk a forrásra (PDF) hivatkozó metaadat nem érinti az OSM ODbL-jét

### 2.3 GDPR

A térkép és származékos adatbázisunk **nem tartalmaz személyes adatot**. A kerékpáros felhasználók viszont igen — minden olyan végpontunk, amely felhasználói pozíciót kezel, GDPR-megfelelő (lásd 14. fejezet).

### 2.4 Engedélykérés workflow

Mielőtt bármilyen részlet **direkt** újrapublikálásra kerülne (pl. POI ikonok vagy a teljes layout reprodukciója), e-mailes engedélykérés megy a Velencei-tó Turisztikai Nonprofit Kft. és a Magyar Kerékpárosklub felé. Default: csak az általunk extrahált tény-adat + OSM geometria publikus.

---

## 3. Adatkinyerési felület

Nincs hivatalos API. A forrás három csatornán érhető el:

### 3.1 HTTP scraping (kerekparosklub.hu)

A `kerekparosklub.hu/terkepek` oldalon (vagy közvetlenül `/regios-terkepek/velencei-to`) keressük az aktuális PDF/KML/GPX linket. A scraping **udvarias** (lásd 4. fejezet): 1 req/sec, `User-Agent: PanellakoBike/1.0 (+https://panellako.example/contact)`.

### 3.2 Közvetlen PDF letöltés

Ha a HTML scrapelésből kinyertük az aktuális PDF URL-jét, azt egyszerű `GET` kéréssel letöltjük. Tipikus méret: 5–30 MB.

### 3.3 KML/GPX kiegészítők

Egyes években KML/GPX is publikálva van (jellemzően `velenceito.hu/download/`). Ezek a térkép vektoros megfelelői, és ha rendelkezésre állnak, **első helyen** ezeket használjuk a PDF helyett.

### 3.4 Letöltési URL-ek (snapshot, 2024)

```
https://kerekparosklub.hu/regios-terkepek/velencei-to              # HTML listing
https://kerekparosklub.hu/files/terkepek/velencei-to-bringaterkep-2024.pdf
https://www.velencetourism.hu/letoltes/velencei-to-bringaterkep.pdf
https://www.velencetourism.hu/letoltes/velencei-to-kerekpar.kml    # ha létezik
```

> A pontos URL-ek évről évre változhatnak. A pipeline első lépése **mindig** a HTML listing scrapelése, és az ott talált legutolsó link használata. A fenti URL-ek csak példák.

---

## 4. Hitelesítés, rate limit, kvóták

- **Hitelesítés**: nincs. Nyilvános erőforrások.
- **Rate limit**: szerver oldali korlát nincs publikálva, de a `robots.txt` és általános udvariasság alapján:
  - **1 kérés/másodperc** maximum
  - **maximum 20 kérés futtatási ciklusonként** (a scraping kis felület)
  - HTTP 429 vagy 503 esetén exponenciális visszalépés (2 → 4 → 8 → 16 mp)
- **User-Agent**: kötelező, kontakttal: `PanellakoBike/1.0 (+https://panellako.example/contact)`
- **Referer**: a PDF letöltés előtt `Referer: https://kerekparosklub.hu/regios-terkepek/velencei-to` küldése jó gyakorlat
- **Cache-Control**: `If-Modified-Since` és `If-None-Match` (ETag) használata kötelező a felesleges letöltések elkerülésére.

### 4.1 robots.txt ellenőrzés

```python
from urllib.robotparser import RobotFileParser
rp = RobotFileParser()
rp.set_url("https://kerekparosklub.hu/robots.txt")
rp.read()
assert rp.can_fetch("PanellakoBike/1.0", "https://kerekparosklub.hu/regios-terkepek/velencei-to")
```

---

## 5. Adatmodell a forrásból

### 5.1 PDF struktúra

A térkép-PDF jellemzően **vektoros** (Adobe Illustrator-ból exportált), néhány raszteres réteggel (légifotó háttér). A pdfplumber/pdfminer.six segítségével a következő rétegek érhetők el:

| Réteg | Tartalom | Kinyerhetőség |
|---|---|---|
| `text` | POI nevek, távolságjelölők, jelmagyarázat | Igen, koordinátával |
| `lines` | Útvonal vonalak (LineString a PDF saját koordinátarendszerében) | Igen, de PDF-koordináta → WGS84 transzformáció kell |
| `rects` | Jelmagyarázat, info boxok | Igen |
| `images` | POI ikonok, légifotó | Részleges (csak az ikon pozíciója hasznos) |
| `annotations` | Hiperhivatkozások (ritkán) | Igen |

### 5.2 PDF georeferálás

A PDF **nem** GeoPDF — nincs beépített koordináta-referenciarendszer (CRS). A PDF-en belüli koordinátákat **kontroll-pontokkal** kell WGS84-re vetíteni:

1. Vizuálisan azonosítunk 4-6 jól ismert pontot (vasútállomás, ismert kereszteződés).
2. Mindegyikhez beolvassuk a PDF (x_pdf, y_pdf) és OSM-ből a (lon, lat) párját.
3. Affin (6 paraméter) vagy projektív (8 paraméter) transzformációt illesztünk: `lon = a*x_pdf + b*y_pdf + c`, `lat = d*x_pdf + e*y_pdf + f`.
4. Az illesztést rögzítjük `assets/calibration/velencei_to_2024.json` fájlba — ezt verziózzuk.

### 5.3 KML / GPX struktúra

Ha KML/GPX is van:

```xml
<gpx version="1.1" creator="...">
  <trk>
    <name>Velencei-tó körútvonal</name>
    <trkseg>
      <trkpt lat="47.2102" lon="18.6051"><ele>105.0</ele></trkpt>
      ...
    </trkseg>
  </trk>
  <wpt lat="47.2295" lon="18.5613"><name>Pákozdi csata emlékmű</name><type>memorial</type></wpt>
</gpx>
```

KML-ben `Placemark`/`Point`/`LineString` elemek és `ExtendedData`/`Data` attribútumok.

### 5.4 Tipikus POI taxonómia

| Forrás kategória | Cél `poi_type` |
|---|---|
| Szállás, Panzió, Apartman, Kemping | `accommodation` |
| Vendéglő, Étterem, Cukrászda, Bisztró | `food` |
| Kerékpárkölcsönző | `rental` |
| Kerékpárszerviz | `service` |
| Strand, Vízpart | `beach` |
| Kilátó | `viewpoint` |
| Vasútállomás | `train_station` |
| Múzeum, Emlékmű | `attraction` |
| Madárrezervátum | `nature` |

---

## 6. Cél adatmodell (PostGIS DDL)

```sql
-- Séma külön névtérben, hogy könnyen droppolható legyen
CREATE SCHEMA IF NOT EXISTS velencei;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Forrás-revíziók (mely PDF/KML/GPX-ből töltöttünk)
CREATE TABLE velencei.source_revision (
    id              BIGSERIAL PRIMARY KEY,
    source_url      TEXT NOT NULL,
    source_kind     TEXT NOT NULL CHECK (source_kind IN ('pdf','kml','gpx','html')),
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    content_sha256  TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    publisher       TEXT,
    publish_year    INT,
    license_note    TEXT NOT NULL DEFAULT 'kartográfiai mű, Szjt. védett; csak tényadat-extrakció',
    raw_path        TEXT NOT NULL,
    UNIQUE (source_url, content_sha256)
);

CREATE INDEX ix_velencei_source_fetched ON velencei.source_revision (fetched_at DESC);

-- POI-k
CREATE TABLE velencei.poi (
    id              BIGSERIAL PRIMARY KEY,
    revision_id     BIGINT NOT NULL REFERENCES velencei.source_revision(id) ON DELETE CASCADE,
    osm_id          BIGINT,                                -- ha sikerült OSM-ből megerősíteni
    name            TEXT NOT NULL,
    name_normalized TEXT NOT NULL,
    poi_type        TEXT NOT NULL,
    settlement      TEXT,
    description     TEXT,
    geom            geometry(Point, 4326) NOT NULL,
    confidence      NUMERIC(4,3) NOT NULL DEFAULT 0.8,     -- 0.0 - 1.0
    attributes      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_velencei_poi_geom ON velencei.poi USING GIST (geom);
CREATE INDEX ix_velencei_poi_type ON velencei.poi (poi_type);
CREATE INDEX ix_velencei_poi_name_trgm ON velencei.poi USING GIN (name_normalized gin_trgm_ops);

-- Kerékpáros útvonalak
CREATE TABLE velencei.route (
    id              BIGSERIAL PRIMARY KEY,
    revision_id     BIGINT NOT NULL REFERENCES velencei.source_revision(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    network         TEXT,                                  -- 'lcn', 'rcn', 'ncn'
    distance_km     NUMERIC(6,2),
    surface_summary TEXT,                                  -- 'aszfalt','kavics','vegyes'
    difficulty      TEXT,                                  -- 'könnyű','közepes','nehéz'
    description     TEXT,
    geom            geometry(MultiLineString, 4326) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_velencei_route_geom ON velencei.route USING GIST (geom);

-- Szegmens szintű attribútumok (a route felbontása)
CREATE TABLE velencei.route_segment (
    id              BIGSERIAL PRIMARY KEY,
    route_id        BIGINT NOT NULL REFERENCES velencei.route(id) ON DELETE CASCADE,
    seq             INT NOT NULL,
    surface         TEXT,
    smoothness      TEXT,
    geom            geometry(LineString, 4326) NOT NULL,
    length_m        NUMERIC(8,2) NOT NULL,
    UNIQUE (route_id, seq)
);
CREATE INDEX ix_velencei_segment_geom ON velencei.route_segment USING GIST (geom);

-- Kalibráció (PDF -> WGS84 affin transzformáció)
CREATE TABLE velencei.pdf_calibration (
    id              BIGSERIAL PRIMARY KEY,
    revision_id     BIGINT NOT NULL REFERENCES velencei.source_revision(id),
    a NUMERIC, b NUMERIC, c NUMERIC,
    d NUMERIC, e NUMERIC, f NUMERIC,
    rmse_m          NUMERIC,                               -- illesztési hiba méterben
    control_points  JSONB NOT NULL                          -- a 4-6 kontrollpont
);

-- Audit
CREATE TABLE velencei.ingest_log (
    id              BIGSERIAL PRIMARY KEY,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at     TIMESTAMPTZ,
    status          TEXT NOT NULL CHECK (status IN ('running','ok','error')),
    revision_id     BIGINT REFERENCES velencei.source_revision(id),
    rows_poi        INT DEFAULT 0,
    rows_route      INT DEFAULT 0,
    error_text      TEXT
);
```

Egyetlen logikai entitás: a **revision** — ehhez kapcsolódnak a POI és route rekordok, így bármikor visszakövethető, melyik PDF-ből/KML-ből származik az adat, és könnyen archiválható régi revízió.

---

## 7. Backend architektúra (L1–L8 rétegek)

```mermaid
flowchart TB
    L1[L1: Forrás<br/>kerekparosklub.hu, velencetourism.hu] --> L2[L2: Letöltő<br/>polite HTTP, ETag, SHA-256]
    L2 --> L3[L3: Raw store<br/>S3/MinIO: /raw/velencei/YYYY/MM/]
    L3 --> L4[L4: Parser<br/>pdfplumber, fastkml, gpxpy]
    L4 --> L5[L5: Normalizáció<br/>POI taxonómia, név-normalizáció]
    L5 --> L6[L6: PostGIS<br/>velencei.* séma]
    L6 --> L7[L7: API & Tiles<br/>FastAPI + pg_tileserv/Tegola]
    L7 --> L8[L8: Kliens<br/>Panellako frontend, MapLibre GL]
    L4 -.OSM verifikáció.-> OSM[(Overpass /<br/>Geofabrik HU)]
    OSM -.-> L5
```

- **L1 — Forrás**: a Magyar Kerékpárosklub és Velence Turizmus oldalai.
- **L2 — Letöltő**: idempotens Python script (lásd 8. fejezet), `requests` + `tenacity`.
- **L3 — Raw store**: minden letöltött fájl változatlan formában, SHA-256 alapú elnevezéssel, S3-kompatibilis tárolóban (MinIO is mehet). Tartós, csak appendelhető.
- **L4 — Parser**: PDF → pdfplumber, KML → fastkml/lxml, GPX → gpxpy. Külön modul per forrástípus.
- **L5 — Normalizáció**: POI nevek `unidecode` + lowercase + szóköz-trim → `name_normalized`. Típusok mapping table-en keresztül a 9 célkategóriára.
- **L6 — PostGIS**: a 6. fejezet szerinti séma. Tranzakcionálisan, revision-szinten swappelve.
- **L7 — API & Tiles**: FastAPI a strukturált végpontokra, `pg_tileserv` vagy `tegola` a vektor csempékre.
- **L8 — Kliens**: a Panellako frontend MapLibre GL-en jeleníti meg, layer-toggle-okkal.

---

## 8. Automatizált letöltő — Python kód

```python
# scripts/ingest_velencei.py
"""Velencei-tó bringatérkép letöltő.

Polite scraping a kerekparosklub.hu és velencetourism.hu oldalakról,
SHA-256 ujjlenyomat alapú deduplikáció, raw store-ba mentés.
"""
from __future__ import annotations

import hashlib
import logging
import os
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin
from urllib.robotparser import RobotFileParser

import psycopg
import requests
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

LOG = logging.getLogger("velencei.ingest")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

UA = "PanellakoBike/1.0 (+https://panellako.example/contact)"
LISTING_URLS = [
    "https://kerekparosklub.hu/regios-terkepek/velencei-to",
    "https://www.velencetourism.hu/letoltes/",
]
ALLOWED_EXTS = (".pdf", ".kml", ".gpx", ".zip")
RAW_ROOT = Path(os.environ.get("RAW_ROOT", "./raw/velencei"))
PG_DSN = os.environ["PG_DSN"]
RATE_LIMIT_SEC = 1.0


@dataclass(frozen=True)
class DiscoveredFile:
    url: str
    kind: str       # 'pdf' | 'kml' | 'gpx' | 'zip'
    referer: str


def is_allowed(url: str) -> bool:
    rp = RobotFileParser()
    rp.set_url(urljoin(url, "/robots.txt"))
    try:
        rp.read()
    except Exception:
        LOG.warning("robots.txt nem érhető el %s — feltételezünk megengedettséget", url)
        return True
    return rp.can_fetch(UA, url)


@retry(wait=wait_exponential(multiplier=2, min=2, max=30), stop=stop_after_attempt(5))
def http_get(url: str, *, referer: str | None = None, stream: bool = False) -> requests.Response:
    headers = {"User-Agent": UA, "Accept-Language": "hu,en;q=0.5"}
    if referer:
        headers["Referer"] = referer
    resp = requests.get(url, headers=headers, timeout=30, stream=stream)
    if resp.status_code == 429 or resp.status_code >= 500:
        resp.raise_for_status()
    resp.raise_for_status()
    return resp


def discover(listing_url: str) -> Iterable[DiscoveredFile]:
    if not is_allowed(listing_url):
        LOG.warning("robots.txt tiltja: %s", listing_url)
        return
    LOG.info("scrape: %s", listing_url)
    resp = http_get(listing_url)
    soup = BeautifulSoup(resp.text, "html.parser")
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href.lower().endswith(ALLOWED_EXTS):
            continue
        full = urljoin(listing_url, href)
        text = (a.get_text() or "").lower()
        if "velencei" not in text and "velencei" not in full.lower():
            continue
        ext = full.rsplit(".", 1)[-1].lower()
        yield DiscoveredFile(url=full, kind=ext, referer=listing_url)
        time.sleep(RATE_LIMIT_SEC)


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def fetch(file: DiscoveredFile) -> tuple[Path, str, int]:
    today = datetime.now(timezone.utc)
    target_dir = RAW_ROOT / f"{today:%Y/%m}"
    target_dir.mkdir(parents=True, exist_ok=True)
    fname = file.url.rsplit("/", 1)[-1]
    tmp = target_dir / f".{fname}.part"
    final = target_dir / fname
    LOG.info("letöltés: %s", file.url)
    with http_get(file.url, referer=file.referer, stream=True) as resp:
        with tmp.open("wb") as out:
            for chunk in resp.iter_content(1 << 16):
                out.write(chunk)
    tmp.rename(final)
    size = final.stat().st_size
    digest = sha256_of(final)
    return final, digest, size


def register(file: DiscoveredFile, path: Path, digest: str, size: int) -> int | None:
    with psycopg.connect(PG_DSN, autocommit=True) as cx:
        with cx.cursor() as cur:
            cur.execute(
                """
                INSERT INTO velencei.source_revision
                    (source_url, source_kind, content_sha256, file_size_bytes,
                     publisher, publish_year, raw_path)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (source_url, content_sha256) DO NOTHING
                RETURNING id;
                """,
                (
                    file.url, file.kind, digest, size,
                    "Velencei-tó Turisztikai Nonprofit Kft. / Magyar Kerékpárosklub",
                    datetime.utcnow().year,
                    str(path),
                ),
            )
            row = cur.fetchone()
            return row[0] if row else None


def main() -> None:
    RAW_ROOT.mkdir(parents=True, exist_ok=True)
    seen: set[str] = set()
    for listing in LISTING_URLS:
        for df in discover(listing):
            if df.url in seen:
                continue
            seen.add(df.url)
            try:
                path, digest, size = fetch(df)
            except Exception as exc:                       # noqa: BLE001
                LOG.error("letöltés sikertelen %s: %s", df.url, exc)
                continue
            rev_id = register(df, path, digest, size)
            if rev_id is None:
                LOG.info("már ismert revízió (%s, %s) — skip", df.url, digest[:8])
                path.unlink(missing_ok=True)
            else:
                LOG.info("új revízió %s rögzítve id=%s", df.kind, rev_id)
            time.sleep(RATE_LIMIT_SEC)


if __name__ == "__main__":
    main()
```

A scriptet a 16. fejezetbeli Docker image-be építve, a k8s CronJob naponta egyszer futtatja.

---

## 9. Feldolgozó pipeline

### 9.1 PDF parszolás (pdfplumber)

```python
# scripts/parse_velencei_pdf.py
import json
import pdfplumber
from pathlib import Path

def extract_texts(pdf_path: Path) -> list[dict]:
    """Kinyer minden text-elemet és pozícióját a PDF-ben."""
    out = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_idx, page in enumerate(pdf.pages):
            for w in page.extract_words(extra_attrs=["fontname", "size"]):
                out.append({
                    "page": page_idx,
                    "text": w["text"],
                    "x0": w["x0"], "x1": w["x1"],
                    "top": w["top"], "bottom": w["bottom"],
                    "font": w["fontname"], "size": w["size"],
                })
    return out

def pdf_to_wgs84(x_pdf: float, y_pdf: float, cal: dict) -> tuple[float, float]:
    """Affin transzformáció PDF -> WGS84.

    cal['a'..'f'] együtthatókkal:
        lon = a*x + b*y + c
        lat = d*x + e*y + f
    """
    lon = cal["a"]*x_pdf + cal["b"]*y_pdf + cal["c"]
    lat = cal["d"]*x_pdf + cal["e"]*y_pdf + cal["f"]
    return lon, lat
```

A kalibrációs együtthatókat egyszer-egy revízióhoz manuálisan vagy fél-automatikusan állapítjuk meg, és a `velencei.pdf_calibration` táblába mentjük (lásd 6. fejezet). 4-6 kontrollponttal általában 5–15 méter RMSE érhető el — ez elég a POI-k pozicionálásához, de **nem** elég ahhoz, hogy az útvonal-geometriát közvetlenül a PDF-ből vegyük: az útvonalat **OSM-ből** rekonstruáljuk.

### 9.2 OSM rekonstrukció

```python
# scripts/reconstruct_route_osm.py
import requests

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
QUERY = """
[out:json][timeout:60][bbox:47.18,18.50,47.27,18.70];
(
  relation["route"="bicycle"];
  way["highway"~"cycleway|path|track|tertiary|unclassified"]["bicycle"!="no"];
);
out body geom;
"""

def fetch_osm_bike_network() -> dict:
    resp = requests.post(OVERPASS_URL, data={"data": QUERY}, timeout=120)
    resp.raise_for_status()
    return resp.json()
```

Az OSM hálózatból kiszűrjük azokat a way-eket, amelyek **kerékpárútként** vannak jelölve és a Velencei-tó körüli bringaút mentén futnak. A `route=bicycle` relációk közvetlenül adják a hivatalos útvonalakat (pl. `EuroVelo 14` áthúz a környéken).

### 9.3 KML/GPX parszolás

```python
# scripts/parse_velencei_kml.py
from fastkml import kml
from pygeoif.geometry import Point, LineString

def parse_kml(path: str) -> tuple[list[dict], list[dict]]:
    k = kml.KML()
    with open(path, "rb") as f:
        k.from_string(f.read())
    pois, lines = [], []
    for doc in k.features():
        for folder_or_pm in doc.features():
            for pm in (folder_or_pm.features() if hasattr(folder_or_pm, 'features') else [folder_or_pm]):
                g = pm.geometry
                if isinstance(g, Point):
                    pois.append({"name": pm.name, "lon": g.x, "lat": g.y, "desc": pm.description})
                elif isinstance(g, LineString):
                    lines.append({"name": pm.name, "coords": list(g.coords), "desc": pm.description})
    return pois, lines
```

### 9.4 POI taxonómia mappelés

```python
TAXONOMY = {
    r"\bpanzió|szállás|apartman|kemping|hostel\b": "accommodation",
    r"\bvendéglő|étterem|cukrászda|bisztró|kocsma|kávézó|fagyizó\b": "food",
    r"\bkerékpárkölcsönző|bringakölcsönző\b": "rental",
    r"\bszerviz|javító\b": "service",
    r"\bstrand|vízpart|fürdő\b": "beach",
    r"\bkilátó\b": "viewpoint",
    r"\bvasútállomás|MÁV\b": "train_station",
    r"\bmúzeum|emlékmű|kastély|templom\b": "attraction",
    r"\bmadárrezervátum|természetvédelmi|tanösvény\b": "nature",
}

def classify(name: str, desc: str | None) -> str:
    import re
    blob = f"{name} {desc or ''}".lower()
    for pat, label in TAXONOMY.items():
        if re.search(pat, blob, re.IGNORECASE):
            return label
    return "other"
```

### 9.5 Idempotens betöltés (UPSERT swap)

```sql
-- 1) új revízió rögzítése (a 8. fejezet scriptje megtette)
-- 2) staging táblába töltjük az új POI-kat és route-okat
BEGIN;
INSERT INTO velencei.poi (revision_id, name, name_normalized, poi_type, geom, attributes)
SELECT $1, p.name, lower(unaccent(p.name)), p.poi_type,
       ST_SetSRID(ST_MakePoint(p.lon, p.lat), 4326), p.attrs
FROM tmp_poi p;
INSERT INTO velencei.route (revision_id, name, distance_km, geom)
SELECT $1, r.name, r.dist_km, ST_GeomFromGeoJSON(r.geojson)
FROM tmp_route r;
-- 3) régi revízió(k) törlése — kaszkád viszi a poi-t és route-ot is
DELETE FROM velencei.source_revision WHERE id < $1 AND source_kind = $2;
COMMIT;
```

---

## 10. Frissítési stratégia

```mermaid
gantt
    title Velencei-tó ingest ütemezés
    dateFormat HH:mm
    section Napi
    HTML listing scrape :03:00, 5m
    section Havi (1-jén)
    PDF/KML/GPX letöltés ha változott :03:05, 20m
    Parszolás + PostGIS swap :03:30, 30m
    section Negyedéves
    OSM rekonstrukció frissítés :04:00, 1h
```

- **Napi 03:00 CET**: csak `HEAD` kérés a listing oldalakra (ETag/Last-Modified). Ha változott, full GET.
- **Havi**: PDF/KML/GPX újraellenőrzése. Ha új SHA-256 → parszolás + swap.
- **Negyedéves**: OSM rekonstrukció (Overpass query) frissítése — a Velencei-tó körüli hálózat ritkán változik, de új jelzések, új cycleway-k bekerülhetnek.
- **Ad hoc**: a Magyar Kerékpárosklub bejelentésére (RSS, Atom feed figyelése a `kerekparosklub.hu/feed/` címen, ha létezik).

### 10.1 Backfill stratégia

Az archive.org Wayback Machine-ből visszamenőlegesen begyűjthetők a régebbi PDF verziók (2018, 2020, 2022, …). Ezeket revision-ként mind eltároljuk, így a backend lekérdezhető pl. „2020-as adat szerint" is.

---

## 11. Storage és skálázás

### 11.1 Méretbecslés

| Réteg | Méret |
|---|---|
| Egy revízió PDF | 5–30 MB |
| 10 év revízióinak összesített PDF mérete | ~200 MB |
| KML/GPX | < 1 MB / revízió |
| PostGIS POI tábla (1000 sor × 1 KB) | < 5 MB |
| PostGIS route tábla (50 sor × 50 KB geom) | < 5 MB |
| Vektor tile cache (z9-z14, BBox) | < 50 MB |

A tárolási nyomás **elhanyagolható**. Egy szerény (2 vCPU, 4 GB RAM, 50 GB SSD) instance bőven elég.

### 11.2 Skálázási tényezők

- **API olvasás**: max 100 req/sec, FastAPI + 2 worker bőven kiszolgálja.
- **Tile rendering**: pg_tileserv cache 1 órás TTL-lel; a forgalom <5 req/sec várhatóan.
- **Replikáció**: read-replica nem szükséges ekkora datasetre, de a PostGIS streaming replikáció egy soron beállítható.

### 11.3 Backup

- Raw store: S3 versioning + 90 napos lifecycle policy → Glacier
- PostGIS: `pg_basebackup` napi + WAL archív (5 perces RPO)

---

## 12. Monitoring és riasztások

```yaml
# prometheus rules
groups:
- name: velencei
  rules:
  - alert: VelenceiIngestFailed
    expr: increase(velencei_ingest_errors_total[24h]) > 0
    for: 10m
    labels: { severity: warning }
    annotations:
      summary: "Velencei-tó ingest hiba az elmúlt 24h-ban"
  - alert: VelenceiStaleData
    expr: time() - velencei_last_successful_ingest_timestamp > 60*60*24*45
    for: 1h
    labels: { severity: warning }
    annotations:
      summary: "Velencei-tó adat 45+ napja nem frissült"
  - alert: VelenceiPoiCountDrop
    expr: |
      (velencei_poi_total - velencei_poi_total offset 30d) / velencei_poi_total offset 30d < -0.2
    for: 1h
    labels: { severity: warning }
    annotations:
      summary: "Velencei-tó POI szám 20%-kal csökkent az elmúlt 30 napban"
```

Metrikák:
- `velencei_ingest_errors_total{stage}` — counter
- `velencei_last_successful_ingest_timestamp` — gauge
- `velencei_poi_total{poi_type}` — gauge
- `velencei_route_total` — gauge
- `velencei_pdf_calibration_rmse_m` — gauge
- `velencei_http_fetch_duration_seconds{host}` — histogram

Logging: structured (JSON), `loguru` vagy `structlog`, Loki-ba.

---

## 13. Költségbecslés

| Tétel | Havi költség (HUF) |
|---|---|
| 1 vCPU, 2 GB RAM, 20 GB SSD VM (pl. Hetzner CX21) | ~2 500 |
| S3-kompatibilis tárolás (10 GB raw) | ~200 |
| Sávszélesség (kimenő, 10 GB) | beépítve |
| Sentry (free tier) | 0 |
| Prometheus + Grafana (Grafana Cloud free) | 0 |
| **Összesen** | **~2 700** |

Egy év: ~32 400 HUF. Nagyon olcsó forrás, mert a forgalom kicsi és a dataset is kicsi.

---

## 14. Biztonság

### 14.1 Forrás-letöltés biztonság

- HTTPS-only (HTTP → HTTPS redirect követés engedélyezett, de figyelmeztetés).
- Tanúsítvány-validáció **kötelező**, semmi `verify=False`.
- Letöltött PDF-ek mérete maximalizált (50 MB), ha túllép → abort.
- PDF parszolás **izolált** Docker konténerben, no-network, csak read-only mount.
- A PDF-ek (potenciálisan malicious) tartalmát soha nem rendereljük szerveroldalon JavaScript-tel.

### 14.2 PostGIS

- Külön role `velencei_writer` (csak az ingest scriptnek) és `velencei_reader` (az API-nak).
- Row-level security nincs (a séma teljes egészében publikus adat).
- A `geom` mezők WGS84 (SRID 4326) kényszerítve a column-on (`geometry(Point, 4326)`).

### 14.3 API

- Rate limit a publikus REST API-n: 100 req/min/IP.
- CORS: csak a Panellako frontend origin-jei.
- SQL injection: kizárólag `psycopg` parametrizált lekérdezések.

### 14.4 Titkok kezelése

- `PG_DSN`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` csak env változóként, Vault/Sealed Secrets segítségével.
- A GitHub Actions runnerben `secrets.PG_DSN` használata.

---

## 15. Tesztelés — pytest

```python
# tests/test_velencei_parser.py
import json
from pathlib import Path
import pytest

from scripts.parse_velencei_pdf import extract_texts, pdf_to_wgs84
from scripts.parse_velencei_kml import parse_kml
from scripts.ingest_velencei import sha256_of, classify


FIXTURES = Path(__file__).parent / "fixtures" / "velencei"


def test_sha256_stable(tmp_path):
    p = tmp_path / "x.bin"
    p.write_bytes(b"hello")
    assert sha256_of(p) == "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"


@pytest.mark.parametrize("name,expected", [
    ("Velencei Panzió", "accommodation"),
    ("Halászcsárda Étterem", "food"),
    ("Bringakölcsönző Agárd", "rental"),
    ("Pákozdi csata emlékmű", "attraction"),
    ("Madárrezervátum bejárat", "nature"),
    ("Velence vasútállomás", "train_station"),
    ("Valami random", "other"),
])
def test_classify(name, expected):
    assert classify(name, None) == expected


def test_pdf_to_wgs84_affin():
    cal = {"a": 0.0001, "b": 0.0, "c": 18.5, "d": 0.0, "e": -0.00008, "f": 47.27}
    lon, lat = pdf_to_wgs84(1000.0, 500.0, cal)
    assert 18.55 < lon < 18.65
    assert 47.20 < lat < 47.27


def test_kml_parse_smoke():
    sample = FIXTURES / "sample.kml"
    if not sample.exists():
        pytest.skip("nincs KML fixture")
    pois, lines = parse_kml(str(sample))
    assert len(pois) > 0 or len(lines) > 0


def test_integration_db(postgis_db):
    """A teljes pipeline egy mini PDF-en (fixtures/mini.pdf)."""
    from scripts.ingest_velencei import register, DiscoveredFile
    df = DiscoveredFile(url="file:///fixtures/mini.pdf", kind="pdf", referer="")
    rev_id = register(df, FIXTURES / "mini.pdf", "deadbeef" * 8, 1234)
    assert rev_id is not None
```

A `postgis_db` fixture egy `pytest-postgresql` + `pgtap` alapú ephemerális Postgres-t indít minden teszt-szessziónál.

Tesztelési cél:
- Unit coverage > 80%
- Integrációs tesztek: letöltés mock-olt HTTP-vel (`responses` lib).
- Property-based tesztek (`hypothesis`) a koordináta-transzformációra.

---

## 16. Telepítés

### 16.1 Dockerfile

```dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgdal32 gdal-bin libpq5 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY scripts/ ./scripts/
COPY src/ ./src/
COPY config/ ./config/

ENV PYTHONUNBUFFERED=1 \
    RAW_ROOT=/data/raw \
    TZ=Europe/Budapest

ENTRYPOINT ["python", "-m", "scripts.ingest_velencei"]
```

### 16.2 Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: velencei-ingest
  namespace: panellako-data
spec:
  schedule: "0 3 * * *"         # naponta 03:00 CET
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: ingest
            image: registry.example/panellako/velencei-ingest:v1.0.0
            env:
            - name: PG_DSN
              valueFrom:
                secretKeyRef: { name: velencei-secrets, key: pg_dsn }
            - name: S3_ENDPOINT
              value: https://s3.eu-central-1.amazonaws.com
            volumeMounts:
            - { name: raw, mountPath: /data/raw }
            resources:
              requests: { cpu: 100m, memory: 256Mi }
              limits:   { cpu: 500m, memory: 1Gi }
          volumes:
          - name: raw
            persistentVolumeClaim:
              claimName: velencei-raw-pvc
```

### 16.3 GitHub Actions

```yaml
name: velencei-ci
on:
  push: { branches: [main], paths: ['scripts/ingest_velencei.py', 'scripts/parse_velencei_*'] }
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env: { POSTGRES_PASSWORD: postgres, POSTGRES_DB: velencei_test }
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: psql postgresql://postgres:postgres@localhost/velencei_test -f sql/schema.sql
        env: { PGPASSWORD: postgres }
      - run: pytest -v --cov=scripts --cov-report=term-missing
```

---

## 17. Adatpublikálás

### 17.1 REST API (FastAPI)

```python
# src/api/velencei.py
from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter(prefix="/v1/velencei", tags=["velencei"])


class POI(BaseModel):
    id: int
    name: str
    poi_type: str
    lon: float
    lat: float
    attributes: dict


@router.get("/pois", response_model=list[POI])
async def list_pois(
    bbox: str = Query("18.5,47.18,18.7,47.27", description="minLon,minLat,maxLon,maxLat"),
    poi_type: str | None = None,
    limit: int = 500,
):
    min_lon, min_lat, max_lon, max_lat = map(float, bbox.split(","))
    # ... lekérdezés a velencei.poi-ből, ST_MakeEnvelope-pal
    return []


@router.get("/routes")
async def list_routes(): ...


@router.get("/routes/{route_id}.geojson")
async def route_geojson(route_id: int): ...
```

### 17.2 Vector tiles

`pg_tileserv` (Crunchy Data) tiszta SQL-ből szolgáltat Mapbox Vector Tile-okat:

```toml
# pg_tileserv.toml
[server]
http_host = "0.0.0.0"
http_port = 7800

[layers."velencei.poi"]
sql = "SELECT id, name, poi_type, geom FROM velencei.poi"
geometry_column = "geom"
attributes_columns = "id, name, poi_type"
default_srid = 4326

[layers."velencei.route"]
sql = "SELECT id, name, distance_km, geom FROM velencei.route"
```

Tile URL: `https://tiles.panellako.example/velencei.poi/{z}/{x}/{y}.pbf`

### 17.3 GeoJSON dump

Heti GeoJSON export `s3://panellako-public/velencei/snapshot.geojson` címre, hogy harmadik fél is használhassa (forrás megjelölés mellett):

```sql
COPY (
  SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', jsonb_agg(jsonb_build_object(
      'type', 'Feature',
      'geometry', ST_AsGeoJSON(geom)::jsonb,
      'properties', jsonb_build_object('id', id, 'name', name, 'type', poi_type)
    ))
  )
  FROM velencei.poi
) TO PROGRAM 'gzip > /export/velencei.geojson.gz';
```

---

## 18. Runbook

### 18.1 Tipikus incidensek

| Tünet | Diagnózis | Megoldás |
|---|---|---|
| `VelenceiIngestFailed` riasztás | `kubectl logs -l app=velencei-ingest --tail=200` | HTTP 5xx → várj és próbáld újra; HTML változott → új scraper selector |
| `VelenceiStaleData` riasztás | A források nem frissültek 45+ napja | Normális, mert a térkép évente frissül. Csak akkor probléma, ha az utolsó revízió >2 éves. |
| POI szám lecsökkent | Új PDF kevesebb POI-val? | Diff a `velencei.poi` előző és új revíziójához; manuális ellenőrzés |
| Kalibráció romlott (RMSE > 50 m) | Új PDF eltérő crop/scale | Új kontrollpontok felvétele a `pdf_calibration` táblába |

### 18.2 Manuális futtatás

```bash
kubectl create job --from=cronjob/velencei-ingest velencei-ingest-manual-$(date +%s) -n panellako-data
kubectl logs -f -l job-name=velencei-ingest-manual-...
```

### 18.3 Revízió visszagörgetése

```sql
-- törlünk minden, az X-nél újabb revíziót
DELETE FROM velencei.source_revision WHERE id > :X;
-- a poi/route kaszkáddal törlődik
```

---

## 19. Roadmap

| Mérföldkő | Tartalom | Becsült idő |
|---|---|---|
| M1 — Letöltő MVP | Polite scraping, raw S3, revízió tábla | 1 hét |
| M2 — PDF parszolás | pdfplumber pipeline, manuális kalibráció, POI extrakció | 2 hét |
| M3 — OSM rekonstrukció | Overpass + route_segment szegmensek | 1 hét |
| M4 — REST API + tiles | FastAPI végpontok + pg_tileserv | 1 hét |
| M5 — Monitoring | Prometheus metrikák, riasztások | 3 nap |
| M6 — Tesztek + CI | pytest > 80% coverage, GitHub Actions | 1 hét |
| M7 — Backfill | archive.org Wayback Machine snapshot-ok | 1 hét |
| M8 — Dokumentáció | API doc, runbook, ER diagram | 3 nap |
| M9 — Engedélykérés | Hivatalos e-mail a Velencei-tó Turizmusnak és Magyar Kerékpárosklubnak | 2 hét (válaszidő) |

---

## 20. Referenciák

1. Magyar Kerékpárosklub régiós térképek: <https://kerekparosklub.hu/regios-terkepek>
2. Velence Turizmus: <https://www.velencetourism.hu/>
3. Velencei-tó hivatalos turisztikai oldal: <https://www.velenceito.hu/>
4. OpenStreetMap, ODbL 1.0: <https://www.openstreetmap.org/copyright>
5. Overpass API: <https://overpass-api.de/>
6. Szerzői jogi törvény (1999. évi LXXVI.): <https://net.jogtar.hu/jogszabaly?docid=99900076.tv>
7. pdfplumber: <https://github.com/jsvine/pdfplumber>
8. fastkml: <https://github.com/cleder/fastkml>
9. gpxpy: <https://github.com/tkrajina/gpxpy>
10. pg_tileserv: <https://github.com/CrunchyData/pg_tileserv>
11. FastAPI: <https://fastapi.tiangolo.com/>
12. tenacity: <https://github.com/jd/tenacity>
13. Wayback Machine: <https://web.archive.org/>
14. EuroVelo 14: <https://en.eurovelo.com/ev14>
15. Velencei-tavi bringaút (Wikipedia): <https://hu.wikipedia.org/wiki/Velencei-t%C3%B3>

> Verzió: 1.0.0 — Készült a Panellako adatplatform számára. Forrás-anyag szerzői joga a Velencei-tó Turisztikai Nonprofit Kft. és a Magyar Kerékpárosklub szervezeteket illeti; az itt leírt pipeline csak tényadatokat extrahál, OSM (ODbL) alapú geometriai rekonstrukcióval.
