# OsmAnd (osmand.net) — Teljes backend terv és adatkinyerési specifikáció

> Forrás: **OsmAnd** — nyílt forráskódú offline OSM-alapú navigációs alkalmazás (Android, iOS, OsmAnd Maps) és a hozzá tartozó **`.obf`** (OsmAnd Binary Format) régiós térképcsomag-szolgáltatás. A `download.osmand.net` szerver országonkénti és régiónkénti `.obf` fájlokat publikál, amelyek tartalmazzák az OSM kerékpáros rétegeit (útvonal-relációk, `route=bicycle`, EuroVelo hálózat, cycleway tag-ek, cikk-cakk hegyi szerpentin „bicycle_road" tag-ek), valamint magassági adatokat, POI-kat és turisztikai jelöléseket.

> Cél: a **Magyarországra vonatkozó** OsmAnd `.obf` csomag rendszeres letöltése, az OSM eredeti adatainak rekonstrukciója (vagy közvetlen Geofabrik `.osm.pbf` használata), PostGIS-be töltése kerékpáros adatmodellbe, és Panellako platformon belüli publikálása.

---

## 1. Forrás áttekintés

Az OsmAnd egy 2010 óta fejlesztett, nyílt forráskódú projekt (lásd `github.com/osmandapp/Osmand`). A térképszolgáltatás központi eleme:

| Komponens | Leírás |
|---|---|
| `.obf` (OsmAnd Binary File) | Proprietary tömörített bináris formátum, ami egyszerre tartalmazza a render-térképet, az útvonal-grafot, a POI-kat és az útvonal-relációkat. |
| `download.osmand.net` | A publikus letöltőszerver, ahonnan a térkép-csomagok elérhetők. |
| `indexes.xml` (vagy `get_indexes.php?gzip=true`) | Az aktuálisan elérhető régió- és világtérképek katalógusa, fájlmérettel és dátummal. |
| `srtm/` | SRTM3 alapú magasság-adatok régiónként. |
| `srtmf/` | Lábban (feet) mért magasság — alternatív letöltés. |
| `voice/`, `fonts/`, `wikivoyage/` | Hangok, betűtípusok, útikönyvek. |

### 1.1 Kerékpáros tartalom az OsmAnd-ban

Az OsmAnd kerékpáros rendelkezései (a `bicycle` profil) az OSM következő tag-jeit használják:

- `highway=cycleway`
- `bicycle=yes|designated|permissive|use_sidepath|no`
- `cycleway=lane|track|opposite|opposite_lane|share_busway`
- `route=bicycle` relációk (`network=icn|ncn|rcn|lcn`)
- `mtb:scale=0..6`, `mtb:scale:uphill=0..5`
- `surface=asphalt|gravel|paved|cobblestone|…`
- `smoothness=excellent|good|…|impassable`
- `cyclestreet=yes`
- `bicycle_road=yes`
- `osmc:symbol`, `colour` — útvonal jelölés

### 1.2 Két lehetséges forrás

A pipeline **két útvonalat** támogat — az ajánlott az (B):

| Stratégia | Előnyök | Hátrányok |
|---|---|---|
| **(A) `.obf` parszolás közvetlenül** | OsmAnd-specifikus „rendered" útvonal-hálózat, gyors offline lookup | Proprietary formátum, korlátozott parser-eszközök (OsmAnd MapCreator, csak JVM-en) |
| **(B) Geofabrik `.osm.pbf` HU extract** | Hivatalos OSM nyersanyag, `osmium`/`pyosmium` natív parser, ODbL átláthatóság | Több OSM-szakértelmet igényel, az OsmAnd-specifikus értelmezést rekonstruálni kell |

Az **alapértelmezett stratégia a (B)**, az OsmAnd `.obf` csak akkor kerül használatba, ha specifikusan OsmAnd-fingerprintet (pl. „OsmAnd POI category" osztályozás) akarunk reprodukálni. A `.obf` letöltést mindenképp végrehajtjuk **archiválási és verzió-összehasonlítási** célból (lásd 9.3 fejezet).

---

## 2. Jogi és licenc helyzet

### 2.1 OSM adat (a `.obf` és `.osm.pbf` tartalma)

- **Licenc**: **Open Database License (ODbL) 1.0** — `opendatacommons.org/licenses/odbl/1-0/`
- **Attribúció kötelező**: „© OpenStreetMap contributors" minden megjelenítés mellett.
- **Share-Alike**: ha származékos adatbázist publikálunk és az **„Produced Work"-nél többet** ad belőle (pl. nyers OSM dump-ot szolgáltatunk vissza), akkor az is ODbL alá kerül.

### 2.2 OsmAnd szoftver

- **OsmAnd 4+ Android app**: GPL v3 (forráskód) + freemium piaci modellben publikálva. Az **app** licence minket nem érint, mert nem az app-ot használjuk, csak a `download.osmand.net` szerver letöltéseit.
- **OsmAnd-tools / OsmAndMapCreator**: GPL v3 — szabadon használható a `.obf` parszolására.

### 2.3 SRTM adat

- **NASA SRTM3**: public domain (US Government work).
- **Copernicus DEM** (alternatíva): „free of charge" Copernicus Programme Service Agreement alatt — szabadon használható nem-kereskedelmi és kereskedelmi célra, attribúcióval.

### 2.4 Saját Panellako adatbázisra vonatkozó kötelezettség

Mivel az ODbL alá tartozó OSM-adatból származékos adatbázist hozunk létre:

1. **Attribúció**: minden olyan felületen, ahol az adatból származó információ megjelenik, „© OpenStreetMap contributors" link az `openstreetmap.org/copyright`-ra.
2. **Share-Alike**: ha publikus **adatbázis-letöltést** is biztosítunk (pl. GeoJSON dump), az ODbL-ként van címkézve.
3. **Produced Work mentesség**: vektor tile-okat (PBF) és REST API válaszokat **nem** kell ODbL-ként publikálnunk — ezek „Produced Work"-nek minősülnek, csak attribúciót igényelnek.

### 2.5 GDPR

Az OSM adatban nincs személyes adat (a contributor nevek aggregát formában, OSM-en kívül nem jelennek meg).

---

## 3. Adatkinyerési felület

### 3.1 OsmAnd letöltőszerver

- **Base URL**: `https://download.osmand.net/`
- **Index API**: `https://download.osmand.net/get_indexes?gzip=true` — gzippelt XML
- **Standard map fájl URL minta**: `https://download.osmand.net/download?standard=yes&file=Hungary_europe_2.obf.zip` (a `_2` rész nem verzióra utal, hanem belső osztályozásra)
- **Direct URL (newer)**: `https://download.osmand.net/download.php?standard=yes&file=Hungary_europe_2.obf.zip`
- **Magyarország tipikus mérete**: 100–180 MB tömörítve, 250–450 MB kicsomagolva
- **SRTM Hungary**: `https://download.osmand.net/download?srtmcountry=yes&file=Hungary_europe.srtm.obf.zip` (~50–80 MB)

### 3.2 Geofabrik (B stratégia)

- **Base URL**: `https://download.geofabrik.de/`
- **Hungary extract**: `https://download.geofabrik.de/europe/hungary-latest.osm.pbf` (~210 MB, 2025)
- **Frissítési ütem**: napi (a `.osm.pbf` 04:00 UTC körül készül a teljes Planet diff-ből)
- **Hashfile**: `hungary-latest.osm.pbf.md5` — verifikáció

### 3.3 Bounding box

Magyarország: `(16.0, 45.7, 22.9, 48.6)` — `minLon, minLat, maxLon, maxLat`. Ezt használjuk minden Overpass/osmium szűrésre.

---

## 4. Hitelesítés, rate limit, kvóták

- **Hitelesítés**: nincs. Nyilvános letöltőszerverek.
- **OsmAnd rate limit**: a `download.osmand.net` csak akkor reagál türelmetlenül, ha másodpercenként sok kérést kap. Mi havi 1-2 letöltést tervezünk a HU fájlokra → bőven a polite zónán belül.
- **Geofabrik rate limit**: a Geofabrik [ToS](https://download.geofabrik.de/technical.html) szerint **1 kérés / 3 mp** ajánlott. Mi napi 1 letöltést tervezünk → szintén OK.
- **User-Agent**: `PanellakoBike/1.0 (+https://panellako.example/contact)` — kötelező Geofabrik-nál is.
- **Range request**: `If-Modified-Since` + `Range: bytes=` — folytatható letöltések támogatottak; nagy fájlnál (180 MB+) érdemes resume-mal letölteni.

### 4.1 Méret-alapú óvatosság

Ha egy letöltés > 1 GB méretet jelez, abort. (Csak a Planet PBF lehet ekkora, és arra nincs szükségünk.)

---

## 5. Adatmodell a forrásból

### 5.1 `.obf` belső struktúrája (egyszerűsített)

```
OBF (Protocol Buffers alapú)
├── MapPart            — render-tile-ok, z-szintenként
├── RoutingPart        — útvonal-grafok (autó, kerékpár, gyalogos)
├── PoiPart            — POI kategória-fa
├── TransportPart      — tömegközlekedési vonalak
└── AddressPart        — címkereső adatok
```

A `.obf` belső szerkezete dokumentált a `github.com/osmandapp/OsmAnd-resources` repóban. Parszer a Java-alapú **OsmAndMapCreator** (https://docs.osmand.net/docs/technical/map-creation/create-offline-maps-yourself), illetve közösségi Python kísérletek (`obf-parser` PyPI csomag — funkcionálisan korlátozott).

### 5.2 `.osm.pbf` struktúra (Geofabrik)

A **PBF (Protocol Buffer Binary Format)** az OSM hivatalos bináris csomagolása:

```
PBF
├── HeaderBlock        — bbox, required_features, source
└── PrimitiveGroup-ok
    ├── nodes          — minden OSM node (id, lat, lon, tags)
    ├── ways           — minden way (id, refs[], tags)
    └── relations      — minden relation (id, members[], tags)
```

Python parser: **pyosmium** (`pip install osmium`) — C++ kernel, ~5 perc alatt feldolgoz egy HU PBF-et.

### 5.3 Releváns OSM elemek

A kerékpáros adatmodellhez:

```
node[bicycle_parking], node[bicycle_rental], node[bicycle_repair_station],
node[shop=bicycle], node[amenity=drinking_water]
way[highway=cycleway],
way[highway~"primary|secondary|tertiary|unclassified|residential"][bicycle~"yes|designated|permissive"],
way[cycleway~"lane|track|opposite|opposite_lane"],
way[mtb:scale=*]
relation[route=bicycle][network~"icn|ncn|rcn|lcn"]
relation[type=route][route=mtb]
```

---

## 6. Cél adatmodell (PostGIS DDL)

```sql
CREATE SCHEMA IF NOT EXISTS osmand;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS hstore;

-- Letöltött forrás-csomagok (mind .obf, mind .osm.pbf)
CREATE TABLE osmand.source_package (
    id              BIGSERIAL PRIMARY KEY,
    package_kind    TEXT NOT NULL CHECK (package_kind IN ('obf_map','obf_srtm','pbf')),
    source_url      TEXT NOT NULL,
    filename        TEXT NOT NULL,
    sha256          TEXT NOT NULL,
    md5             TEXT,
    bytes           BIGINT NOT NULL,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    publisher       TEXT NOT NULL,             -- 'OsmAnd' | 'Geofabrik'
    timestamp_in_data TIMESTAMPTZ,             -- a header-ből kiolvasott OSM timestamp
    raw_s3_key      TEXT NOT NULL,
    UNIQUE (source_url, sha256)
);

-- Egy "snapshot" = egy adott source_package alapján legenerált, teljes adatmodell
CREATE TABLE osmand.snapshot (
    id              BIGSERIAL PRIMARY KEY,
    source_id       BIGINT NOT NULL REFERENCES osmand.source_package(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    status          TEXT NOT NULL CHECK (status IN ('building','active','retired')),
    way_count       BIGINT,
    node_count      BIGINT,
    relation_count  BIGINT
);

-- Kerékpáros way-ek (egyszerűsített OSM-leképezés)
CREATE TABLE osmand.bike_way (
    id              BIGSERIAL PRIMARY KEY,
    snapshot_id     BIGINT NOT NULL REFERENCES osmand.snapshot(id) ON DELETE CASCADE,
    osm_way_id      BIGINT NOT NULL,
    highway         TEXT,
    bicycle         TEXT,
    cycleway        TEXT,
    surface         TEXT,
    smoothness      TEXT,
    mtb_scale       TEXT,
    name            TEXT,
    ref             TEXT,
    tags            HSTORE,
    geom            geometry(LineString, 4326) NOT NULL,
    length_m        NUMERIC(10,2) NOT NULL,
    UNIQUE (snapshot_id, osm_way_id)
);
CREATE INDEX ix_osmand_bike_way_geom    ON osmand.bike_way USING GIST (geom);
CREATE INDEX ix_osmand_bike_way_highway ON osmand.bike_way (highway);
CREATE INDEX ix_osmand_bike_way_snap    ON osmand.bike_way (snapshot_id);

-- Útvonal-relációk (EuroVelo, országos, regionális)
CREATE TABLE osmand.bike_route (
    id              BIGSERIAL PRIMARY KEY,
    snapshot_id     BIGINT NOT NULL REFERENCES osmand.snapshot(id) ON DELETE CASCADE,
    osm_relation_id BIGINT NOT NULL,
    network         TEXT,                      -- 'icn'|'ncn'|'rcn'|'lcn'
    ref             TEXT,                      -- pl. 'EV6'
    name            TEXT,
    operator        TEXT,
    distance_m      NUMERIC(10,2),
    colour          TEXT,
    osmc_symbol     TEXT,
    tags            HSTORE,
    geom            geometry(MultiLineString, 4326) NOT NULL,
    UNIQUE (snapshot_id, osm_relation_id)
);
CREATE INDEX ix_osmand_bike_route_geom ON osmand.bike_route USING GIST (geom);
CREATE INDEX ix_osmand_bike_route_net  ON osmand.bike_route (network, ref);

-- POI-k (kerékpáros relevánsak)
CREATE TABLE osmand.bike_poi (
    id              BIGSERIAL PRIMARY KEY,
    snapshot_id     BIGINT NOT NULL REFERENCES osmand.snapshot(id) ON DELETE CASCADE,
    osm_id          BIGINT NOT NULL,
    osm_type        CHAR(1) NOT NULL CHECK (osm_type IN ('n','w','r')),
    category        TEXT NOT NULL,             -- parking|rental|repair|shop|drinking_water|…
    name            TEXT,
    tags            HSTORE,
    geom            geometry(Point, 4326) NOT NULL,
    UNIQUE (snapshot_id, osm_type, osm_id)
);
CREATE INDEX ix_osmand_bike_poi_geom ON osmand.bike_poi USING GIST (geom);
CREATE INDEX ix_osmand_bike_poi_cat  ON osmand.bike_poi (category);

-- Audit
CREATE TABLE osmand.ingest_log (
    id              BIGSERIAL PRIMARY KEY,
    snapshot_id     BIGINT REFERENCES osmand.snapshot(id),
    stage           TEXT NOT NULL,
    status          TEXT NOT NULL,
    detail          TEXT,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Snapshot-alapú modellben minden új letöltés egy új `snapshot`-ot hoz létre; az API a `status='active'` snapshot-ot olvassa; régi snapshot-ok 90 nap után `retired`, 180 nap után törölve.

---

## 7. Backend architektúra (L1–L8 rétegek)

```mermaid
flowchart TB
    subgraph L1[L1: Forrás]
      OS[download.osmand.net]
      GF[download.geofabrik.de]
    end
    L1 --> L2[L2: Downloader<br/>requests + resume]
    L2 --> L3[L3: Raw S3<br/>obf, pbf, srtm]
    L3 --> L4A[L4A: PBF parser<br/>pyosmium]
    L3 --> L4B[L4B: OBF parser<br/>OsmAndMapCreator JVM]
    L4A --> L5[L5: Filter + normalize<br/>bbox HU, bicycle tags]
    L4B --> L5
    L5 --> L6[L6: Snapshot loader<br/>COPY into PostGIS]
    L6 --> L7[L7: API + Tiles<br/>FastAPI + Tegola]
    L7 --> L8[L8: Panellako kliens]
```

- **L1**: az OsmAnd és Geofabrik letöltőszerverek
- **L2**: idempotens, resume-képes letöltő (lásd 8. fejezet)
- **L3**: raw S3 (vagy MinIO) — minden letöltött fájl változatlan, hash-szerinti elnevezéssel
- **L4A**: pyosmium-alapú PBF parser (alap stratégia)
- **L4B**: OsmAndMapCreator JVM, csak akkor, ha az OsmAnd-specifikus szemantikára szükségünk van
- **L5**: bbox-szűrés, tag-szűrés (bicycle releváns), POI taxonómia mappelés
- **L6**: PostGIS `COPY` (bulk insert) új snapshot-ba
- **L7**: FastAPI + Tegola vektor-tile generálás (PostGIS-alapú, MVT)
- **L8**: a Panellako frontend

---

## 8. Automatizált letöltő — Python kód

```python
# scripts/ingest_osmand.py
"""OsmAnd + Geofabrik letöltő és snapshot manager.

Mindkét forrás (.obf és .osm.pbf) letöltése, MD5/SHA256 verifikáció,
S3-be archiválás, snapshot rekord létrehozása PostGIS-ben.
"""
from __future__ import annotations

import gzip
import hashlib
import logging
import os
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import psycopg
import requests
from tenacity import retry, stop_after_attempt, wait_exponential

LOG = logging.getLogger("osmand.ingest")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

UA = "PanellakoBike/1.0 (+https://panellako.example/contact)"
RAW_ROOT = Path(os.environ.get("RAW_ROOT", "./raw/osmand"))
PG_DSN = os.environ["PG_DSN"]

OSMAND_INDEX_URL = "https://download.osmand.net/get_indexes?gzip=true"
OSMAND_HUNGARY_FILE = "Hungary_europe_2.obf.zip"
OSMAND_HUNGARY_URL = f"https://download.osmand.net/download?standard=yes&file={OSMAND_HUNGARY_FILE}"
OSMAND_HUNGARY_SRTM = "https://download.osmand.net/download?srtmcountry=yes&file=Hungary_europe.srtm.obf.zip"

GEOFABRIK_HU_PBF = "https://download.geofabrik.de/europe/hungary-latest.osm.pbf"
GEOFABRIK_HU_MD5 = "https://download.geofabrik.de/europe/hungary-latest.osm.pbf.md5"


@dataclass(frozen=True)
class Asset:
    kind: str
    url: str
    publisher: str
    expect_md5_url: str | None = None


ASSETS = [
    Asset("pbf",      GEOFABRIK_HU_PBF,         "Geofabrik", GEOFABRIK_HU_MD5),
    Asset("obf_map",  OSMAND_HUNGARY_URL,       "OsmAnd"),
    Asset("obf_srtm", OSMAND_HUNGARY_SRTM,      "OsmAnd"),
]


@retry(wait=wait_exponential(multiplier=2, min=2, max=60), stop=stop_after_attempt(5))
def http_head(url: str) -> requests.Response:
    return requests.head(url, headers={"User-Agent": UA}, allow_redirects=True, timeout=30)


def needs_download(url: str, target: Path) -> bool:
    if not target.exists():
        return True
    r = http_head(url)
    remote_size = int(r.headers.get("Content-Length", "0") or "0")
    if remote_size and remote_size != target.stat().st_size:
        return True
    # Last-Modified összehasonlítás
    lm = r.headers.get("Last-Modified")
    if lm:
        from email.utils import parsedate_to_datetime
        remote_mtime = parsedate_to_datetime(lm).timestamp()
        if remote_mtime > target.stat().st_mtime + 60:
            return True
    return False


def stream_download(url: str, target: Path, *, resume: bool = True) -> tuple[str, int]:
    headers = {"User-Agent": UA}
    mode = "wb"
    start_byte = 0
    if resume and target.exists():
        start_byte = target.stat().st_size
        headers["Range"] = f"bytes={start_byte}-"
        mode = "ab"
    with requests.get(url, headers=headers, stream=True, timeout=300) as r:
        if r.status_code == 416:                 # already complete
            r.close()
        else:
            r.raise_for_status()
            with target.open(mode) as f:
                for chunk in r.iter_content(1 << 20):
                    f.write(chunk)
    h = hashlib.sha256()
    with target.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest(), target.stat().st_size


def verify_md5(target: Path, md5_url: str) -> bool:
    r = requests.get(md5_url, headers={"User-Agent": UA}, timeout=30)
    r.raise_for_status()
    expected = r.text.strip().split()[0]
    h = hashlib.md5()
    with target.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    actual = h.hexdigest()
    if expected != actual:
        LOG.error("MD5 mismatch %s: expected=%s actual=%s", target, expected, actual)
        return False
    return True


def register(asset: Asset, target: Path, sha256: str, md5_value: str | None) -> int | None:
    with psycopg.connect(PG_DSN, autocommit=True) as cx:
        with cx.cursor() as cur:
            cur.execute(
                """
                INSERT INTO osmand.source_package
                  (package_kind, source_url, filename, sha256, md5, bytes, publisher, raw_s3_key)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (source_url, sha256) DO NOTHING
                RETURNING id;
                """,
                (
                    asset.kind, asset.url, target.name, sha256, md5_value,
                    target.stat().st_size, asset.publisher, str(target),
                ),
            )
            row = cur.fetchone()
            return row[0] if row else None


def fetch_index() -> None:
    """OsmAnd index.xml letöltése, csak audit célokra (verziókövetés)."""
    r = requests.get(OSMAND_INDEX_URL, headers={"User-Agent": UA}, timeout=60)
    r.raise_for_status()
    data = gzip.decompress(r.content) if r.headers.get("Content-Encoding") == "gzip" else r.content
    today = datetime.now(timezone.utc)
    folder = RAW_ROOT / f"{today:%Y/%m}"
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / "osmand_indexes.xml"
    target.write_bytes(data)
    LOG.info("indexes.xml letöltve %d byte", len(data))


def main() -> None:
    RAW_ROOT.mkdir(parents=True, exist_ok=True)
    fetch_index()
    today = datetime.now(timezone.utc)
    folder = RAW_ROOT / f"{today:%Y/%m}"
    folder.mkdir(parents=True, exist_ok=True)
    for asset in ASSETS:
        fname = asset.url.rsplit("=", 1)[-1] if "file=" in asset.url else asset.url.rsplit("/", 1)[-1]
        target = folder / fname
        if not needs_download(asset.url, target):
            LOG.info("skip (up-to-date): %s", asset.url)
            continue
        LOG.info("downloading %s -> %s", asset.url, target)
        sha, _bytes = stream_download(asset.url, target)
        md5_value = None
        if asset.expect_md5_url:
            ok = verify_md5(target, asset.expect_md5_url)
            if not ok:
                target.unlink(missing_ok=True)
                LOG.error("verifikáció bukott, retry next run")
                continue
            md5_value = hashlib.md5(target.read_bytes()).hexdigest()
        rev_id = register(asset, target, sha, md5_value)
        if rev_id is None:
            LOG.info("nem új revízió: %s", asset.url)
        else:
            LOG.info("regisztrálva id=%s", rev_id)
        time.sleep(3.0)                                    # Geofabrik polite gap


if __name__ == "__main__":
    main()
```

---

## 9. Feldolgozó pipeline

### 9.1 PBF parszolás (ajánlott út, pyosmium)

```python
# scripts/parse_osmand_pbf.py
import osmium
import psycopg
from psycopg import sql
from shapely.geometry import LineString, Point, MultiLineString
from shapely import wkb
import re

HU_BBOX = (16.0, 45.7, 22.9, 48.6)
BIKE_HIGHWAYS = {"cycleway"}
SHARED_HIGHWAYS = {"primary", "secondary", "tertiary", "unclassified", "residential", "service", "track", "path"}


class BikeHandler(osmium.SimpleHandler):
    def __init__(self, snapshot_id: int, cx):
        super().__init__()
        self.snapshot_id = snapshot_id
        self.cx = cx
        self.way_buf: list[tuple] = []
        self.poi_buf: list[tuple] = []
        self.rel_buf: list[tuple] = []
        self.wkbfab = osmium.geom.WKBFactory()

    def _is_bike_way(self, tags) -> bool:
        hw = tags.get("highway")
        if hw == "cycleway":
            return True
        if hw in SHARED_HIGHWAYS:
            b = tags.get("bicycle")
            cw = tags.get("cycleway")
            if b in ("yes", "designated", "permissive"):
                return True
            if cw in ("lane", "track", "opposite", "opposite_lane", "share_busway"):
                return True
            if tags.get("cyclestreet") == "yes" or tags.get("bicycle_road") == "yes":
                return True
        return False

    def way(self, w):
        if not self._is_bike_way(dict(w.tags)):
            return
        try:
            wkb_hex = self.wkbfab.create_linestring(w)
        except Exception:
            return
        geom = wkb.loads(bytes.fromhex(wkb_hex))
        if not geom.is_valid or geom.is_empty:
            return
        tags = {k: v for k, v in w.tags}
        self.way_buf.append((
            self.snapshot_id, w.id, tags.get("highway"), tags.get("bicycle"),
            tags.get("cycleway"), tags.get("surface"), tags.get("smoothness"),
            tags.get("mtb:scale"), tags.get("name"), tags.get("ref"),
            self._hstore(tags), geom.wkt, geom.length * 111000,
        ))
        if len(self.way_buf) >= 5000:
            self._flush_ways()

    def node(self, n):
        tags = dict(n.tags)
        cat = self._poi_category(tags)
        if not cat:
            return
        self.poi_buf.append((
            self.snapshot_id, n.id, "n", cat, tags.get("name"),
            self._hstore(tags), f"POINT({n.location.lon} {n.location.lat})",
        ))
        if len(self.poi_buf) >= 5000:
            self._flush_pois()

    def relation(self, r):
        tags = dict(r.tags)
        if tags.get("route") != "bicycle" and tags.get("route") != "mtb":
            return
        # geometriát később, area handler-rel rakjuk össze; itt csak metaadat
        self.rel_buf.append((
            self.snapshot_id, r.id, tags.get("network"), tags.get("ref"),
            tags.get("name"), tags.get("operator"), tags.get("colour"),
            tags.get("osmc:symbol"), self._hstore(tags),
        ))
        if len(self.rel_buf) >= 2000:
            self._flush_rels()

    def _poi_category(self, tags) -> str | None:
        if tags.get("amenity") == "bicycle_parking":  return "parking"
        if tags.get("amenity") == "bicycle_rental":   return "rental"
        if tags.get("amenity") == "bicycle_repair_station": return "repair"
        if tags.get("shop") == "bicycle":             return "shop"
        if tags.get("amenity") == "drinking_water":   return "drinking_water"
        if tags.get("tourism") == "viewpoint":        return "viewpoint"
        if tags.get("amenity") in ("restaurant", "cafe", "pub"): return "food"
        return None

    @staticmethod
    def _hstore(tags) -> str:
        return ",".join(f'"{k}"=>"{v.replace(chr(34), chr(92)+chr(34))}"' for k, v in tags.items())

    def _flush_ways(self):
        with self.cx.cursor() as cur:
            cur.executemany(
                """INSERT INTO osmand.bike_way
                   (snapshot_id, osm_way_id, highway, bicycle, cycleway, surface, smoothness,
                    mtb_scale, name, ref, tags, geom, length_m)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, %s::hstore,
                           ST_GeomFromText(%s, 4326), %s)
                   ON CONFLICT DO NOTHING""", self.way_buf,
            )
        self.way_buf.clear()

    def _flush_pois(self):
        with self.cx.cursor() as cur:
            cur.executemany(
                """INSERT INTO osmand.bike_poi
                   (snapshot_id, osm_id, osm_type, category, name, tags, geom)
                   VALUES (%s,%s,%s,%s,%s, %s::hstore, ST_GeomFromText(%s, 4326))
                   ON CONFLICT DO NOTHING""", self.poi_buf,
            )
        self.poi_buf.clear()

    def _flush_rels(self):
        with self.cx.cursor() as cur:
            cur.executemany(
                """INSERT INTO osmand.bike_route
                   (snapshot_id, osm_relation_id, network, ref, name, operator, colour, osmc_symbol, tags, geom)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s, %s::hstore,
                           ST_GeomFromText('MULTILINESTRING EMPTY', 4326))
                   ON CONFLICT DO NOTHING""", self.rel_buf,
            )
        self.rel_buf.clear()

    def flush(self):
        if self.way_buf: self._flush_ways()
        if self.poi_buf: self._flush_pois()
        if self.rel_buf: self._flush_rels()


def parse(pbf_path: str, snapshot_id: int):
    with psycopg.connect(os.environ["PG_DSN"], autocommit=True) as cx:
        h = BikeHandler(snapshot_id, cx)
        h.apply_file(pbf_path, locations=True)
        h.flush()
```

### 9.2 Relation geometriák összeállítása

A PBF parser után külön SQL futás összeállítja a `route=bicycle` reláció `MultiLineString` geometriáját a relation tagjaiból:

```sql
WITH rel_members AS (
  SELECT r.id AS rel_id, m.id AS way_id
  FROM osmand.bike_route r
  JOIN osmand_raw.relation_member m ON m.relation_id = r.osm_relation_id
  WHERE m.member_type = 'w'
)
UPDATE osmand.bike_route br
SET geom = (
  SELECT ST_Multi(ST_LineMerge(ST_Collect(bw.geom)))
  FROM rel_members rm
  JOIN osmand.bike_way bw ON bw.osm_way_id = rm.way_id
  WHERE rm.rel_id = br.id
)
WHERE br.geom IS NULL OR ST_IsEmpty(br.geom);
```

### 9.3 OBF parszolás (csak audit célból)

OsmAndMapCreator JVM-alapú futtatás Docker-konténerben:

```bash
# Dockerfile-osmand-mapcreator
FROM eclipse-temurin:17-jdk
RUN apt-get update && apt-get install -y unzip
WORKDIR /opt
RUN curl -L -o OsmAndMapCreator.zip https://download.osmand.net/latest-night-build/OsmAndMapCreator-main.zip && unzip OsmAndMapCreator.zip
ENTRYPOINT ["bash", "/opt/OsmAndMapCreator/utilities.sh"]
```

```bash
docker run --rm -v /data/raw:/raw osmand-mapcreator obf-statistics /raw/Hungary_europe_2.obf
```

A statisztika kimenetét összevetjük a PBF-ből származó értékekkel — ha jelentős eltérés van (>5%), riasztás.

### 9.4 Snapshot promote (atomic swap)

```sql
BEGIN;
UPDATE osmand.snapshot SET status = 'retired' WHERE status = 'active';
UPDATE osmand.snapshot SET status = 'active'  WHERE id = :new_snapshot_id;
COMMIT;
```

A `pg_tileserv` / Tegola layer-jei az `active` snapshot-ot olvassák egy view-n keresztül:

```sql
CREATE OR REPLACE VIEW osmand.v_active_bike_way AS
SELECT bw.*
FROM osmand.bike_way bw
JOIN osmand.snapshot s ON s.id = bw.snapshot_id AND s.status = 'active';
```

---

## 10. Frissítési stratégia

| Forrás | Frissítési ritmus | OsmAnd / Geofabrik tényleges |
|---|---|---|
| Geofabrik HU PBF | naponta | igen, ~04:00 UTC |
| OsmAnd HU OBF | havi | igen, hónap eleje |
| OsmAnd SRTM HU | ritka (1× / év) | igen |

A pipeline:

```mermaid
sequenceDiagram
    autonumber
    participant Cron as k8s CronJob (napi 05:00 CET)
    participant DL as Downloader
    participant FS as Raw S3
    participant Parser as PBF parser
    participant DB as PostGIS

    Cron->>DL: futtatás
    DL->>FS: HEAD ellenőrzés
    alt új verzió
        DL->>FS: PUT új .pbf
        DL->>DB: source_package INSERT
        DL->>Parser: parse(pbf_path, snapshot_id)
        Parser->>DB: COPY bike_way, bike_poi, bike_route
        Parser->>DB: relation geometry build
        Parser->>DB: snapshot promote (active)
    else nincs változás
        DL-->>Cron: skip
    end
```

A snapshot-promote tranzakcionálisan atomikus, így az API mindig konzisztens állapotot lát.

---

## 11. Storage és skálázás

### 11.1 Méretbecslés

| Komponens | Méret |
|---|---|
| HU .osm.pbf | ~210 MB |
| HU .obf | ~150 MB |
| HU SRTM .obf | ~60 MB |
| 90 napi snapshot raw (90 × 210 MB) | ~19 GB |
| PostGIS — bike_way (kb. 800 ezer sor) | ~600 MB |
| PostGIS — bike_route (kb. 200 sor + geometriák) | ~50 MB |
| PostGIS — bike_poi (kb. 30 000 sor) | ~30 MB |
| Vektor tile cache (HU, z5-z14) | ~5 GB |

### 11.2 Skálázás

- **PostGIS**: dedikált példány, 4 vCPU, 8 GB RAM, 200 GB SSD. Indexek karbantartva (`VACUUM ANALYZE`).
- **Snapshot rotation**: csak az utolsó 3 snapshot teljes adattal; a 4–10. snapshot csak metaadat (raw S3-ban megvan).
- **Vektor tile cache**: Tegola Redis/Postgres cache, 30 napos TTL.
- **Multi-region**: a snapshot rotation lehetővé teszi a hot-cold cluster eltolódást — promote új region-on és csak utána retire.

### 11.3 Backup

- Raw S3: versioning + 365 napos lifecycle → Glacier
- PostGIS: napi `pg_basebackup` + 7 napos WAL archív
- Snapshot metaadat: `pg_dump --schema=osmand` heti S3-ba

---

## 12. Monitoring és riasztások

```yaml
groups:
- name: osmand
  rules:
  - alert: OsmAndDownloadFailed
    expr: increase(osmand_download_errors_total[24h]) > 0
    for: 1h
  - alert: OsmAndStalePbf
    expr: time() - osmand_pbf_last_fetched_timestamp > 60*60*48
    for: 1h
    annotations: { summary: "Geofabrik HU PBF 48+ órája nincs frissítve" }
  - alert: OsmAndSnapshotFailed
    expr: increase(osmand_snapshot_build_errors_total[1h]) > 0
    for: 30m
  - alert: OsmAndBikeWayCountAnomaly
    expr: |
      abs(osmand_bike_way_count - osmand_bike_way_count offset 7d)
        / osmand_bike_way_count offset 7d > 0.15
    for: 2h
    annotations: { summary: "bike_way szám 15%+ változott — vizsgálat" }
  - alert: OsmAndMd5Mismatch
    expr: increase(osmand_md5_mismatch_total[24h]) > 0
    for: 5m
    labels: { severity: critical }
```

Metrikák:
- `osmand_download_errors_total{source}` counter
- `osmand_md5_mismatch_total` counter
- `osmand_pbf_last_fetched_timestamp` gauge
- `osmand_snapshot_build_duration_seconds` histogram
- `osmand_bike_way_count` gauge
- `osmand_bike_route_count` gauge
- `osmand_bike_poi_count` gauge

---

## 13. Költségbecslés

| Tétel | Havi (HUF) |
|---|---|
| PostGIS dedikált (4 vCPU, 8 GB, 200 GB SSD) | 12 000 |
| Parser worker VM (2 vCPU, 4 GB) | 4 000 |
| S3 / MinIO (50 GB) | 1 200 |
| Sávszélesség (havi 10 GB egress) | 800 |
| Tegola tile worker | beleszámítva |
| **Összesen** | **~18 000** |

Egy év: ~216 000 HUF. A pipeline lényegesen drágább, mint a Velencei-tó/Flowcycle, mert a feldolgozott adatmennyiség nagyságrendekkel nagyobb (országos lefedettség).

---

## 14. Biztonság

- **Letöltés**: HTTPS-only, tanúsítvány-validáció. MD5 verifikáció Geofabrik fájlokra; SHA-256 minden fájlra.
- **Resume-támogatás**: Range request, ha közbeszakad → folytatható, nem indul újra.
- **OBF JVM sandbox**: külön Docker konténer, no-network, csak read-only `/raw` mount.
- **PostGIS role-ok**: `osmand_writer` (csak ingest), `osmand_reader` (API olvasás), `osmand_admin` (DDL).
- **PGAudit**: bekapcsolva a `osmand` sémára DDL és role-változások loggolásához.
- **Snapshot retirement**: a `retired` snapshot 90 nap után automata törlés, ne legyen "data hoarding".
- **OSM contributor anonymity**: az `uid`/`user` mezőket a PBF-ből **nem** vesszük át (privacy by design).

---

## 15. Tesztelés — pytest

```python
# tests/test_osmand.py
import os
import pytest
import psycopg
from pathlib import Path

from scripts.parse_osmand_pbf import BikeHandler


FIX = Path(__file__).parent / "fixtures" / "osmand"


@pytest.fixture
def empty_snapshot(postgis_db):
    with psycopg.connect(os.environ["PG_DSN"], autocommit=True) as cx:
        with cx.cursor() as cur:
            cur.execute(
                """INSERT INTO osmand.source_package
                       (package_kind, source_url, filename, sha256, bytes, publisher, raw_s3_key)
                   VALUES ('pbf','test://hu.pbf','hu.pbf','deadbeef',1,'test','test')
                   RETURNING id;"""
            )
            sp_id = cur.fetchone()[0]
            cur.execute(
                """INSERT INTO osmand.snapshot (source_id, status)
                   VALUES (%s,'building') RETURNING id;""", (sp_id,))
            return cur.fetchone()[0]


def test_bike_way_filter():
    # csak cycleway, vagy bicycle=yes/designated
    h = BikeHandler(snapshot_id=0, cx=None)
    assert h._is_bike_way({"highway": "cycleway"}) is True
    assert h._is_bike_way({"highway": "residential", "bicycle": "yes"}) is True
    assert h._is_bike_way({"highway": "primary"}) is False
    assert h._is_bike_way({"highway": "motorway"}) is False


def test_poi_category():
    h = BikeHandler(snapshot_id=0, cx=None)
    assert h._poi_category({"amenity": "bicycle_parking"}) == "parking"
    assert h._poi_category({"shop": "bicycle"}) == "shop"
    assert h._poi_category({"amenity": "bus_station"}) is None


@pytest.mark.integration
def test_parse_mini_pbf(empty_snapshot):
    from scripts.parse_osmand_pbf import parse
    sample = FIX / "mini.pbf"
    if not sample.exists():
        pytest.skip("mini.pbf fixture nincs")
    parse(str(sample), empty_snapshot)
    with psycopg.connect(os.environ["PG_DSN"]) as cx:
        with cx.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM osmand.bike_way WHERE snapshot_id=%s", (empty_snapshot,))
            assert cur.fetchone()[0] > 0
```

Tesztelési cél:
- Unit > 80% (a tag-szűrésekre, kategorizációra).
- Integráció: egy mini (1–2 MB) `osm.pbf` fixture-t használunk; `osmconvert` segítségével kivágható egy bounding boxból.
- Property-based (`hypothesis`): random tag-sorozatok, hogy a kategorizátor robusztus legyen.

---

## 16. Telepítés

### 16.1 Dockerfile (PBF parser)

```dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libosmium2-dev libboost-program-options1.74.0 libexpat1 \
    libbz2-1.0 libsparsehash-dev zlib1g \
    ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt   # tartalmazza: osmium, psycopg, shapely

COPY scripts/ ./scripts/
COPY sql/ ./sql/

ENV PYTHONUNBUFFERED=1 RAW_ROOT=/data/raw TZ=Europe/Budapest
ENTRYPOINT ["python", "-m", "scripts.ingest_osmand"]
```

### 16.2 k8s CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: osmand-ingest
  namespace: panellako-data
spec:
  schedule: "0 5 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 5
  jobTemplate:
    spec:
      backoffLimit: 1
      activeDeadlineSeconds: 7200       # max 2 óra
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: ingest
            image: registry.example/panellako/osmand-ingest:v1.0.0
            envFrom:
            - secretRef: { name: osmand-secrets }
            volumeMounts:
            - { name: raw, mountPath: /data/raw }
            resources:
              requests: { cpu: 1, memory: 2Gi }
              limits:   { cpu: 4, memory: 8Gi }
          volumes:
          - name: raw
            persistentVolumeClaim: { claimName: osmand-raw-pvc }
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata: { name: osmand-raw-pvc, namespace: panellako-data }
spec:
  accessModes: [ReadWriteOnce]
  resources: { requests: { storage: 50Gi } }
  storageClassName: ssd
```

### 16.3 GitHub Actions

```yaml
name: osmand-ci
on:
  push: { branches: [main], paths: ['scripts/*osmand*', 'sql/osmand_schema.sql'] }
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env: { POSTGRES_PASSWORD: postgres, POSTGRES_DB: osmand_test }
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: sudo apt-get update && sudo apt-get install -y libosmium2-dev
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: psql postgresql://postgres:postgres@localhost/osmand_test -f sql/osmand_schema.sql
        env: { PGPASSWORD: postgres }
      - run: pytest tests/test_osmand.py -v
```

---

## 17. Adatpublikálás

### 17.1 REST API

```python
@router.get("/v1/osmand/ways")
async def list_ways(bbox: str, highway: str | None = None, limit: int = 1000):
    """Kerékpáros way-ek az aktív snapshot-ból."""
    min_lon, min_lat, max_lon, max_lat = map(float, bbox.split(","))
    # paraméterezett SQL …

@router.get("/v1/osmand/routes")
async def list_routes(network: str | None = None):
    """EuroVelo, országos, regionális kerékpáros útvonalak."""
    ...

@router.get("/v1/osmand/routes/{relation_id}.geojson")
async def route_geojson(relation_id: int):
    ...
```

### 17.2 Vektor csempék (Tegola)

```toml
# tegola.toml
[[providers]]
name = "osmand_pg"
type = "postgis"
host = "postgres"
port = 5432
database = "panellako"
user = "tegola_reader"
password = "${POSTGRES_PASSWORD}"
srid = 4326

[[providers.layers]]
name = "bike_way"
geometry_fieldname = "geom"
geometry_type = "linestring"
sql = """
SELECT id, osm_way_id, highway, bicycle, cycleway, surface, name, ref, geom AS geom
FROM osmand.v_active_bike_way
WHERE geom && ST_MakeEnvelope(!BBOX!::geometry)
"""

[[providers.layers]]
name = "bike_route"
geometry_fieldname = "geom"
geometry_type = "multilinestring"
sql = """
SELECT id, network, ref, name, colour, geom
FROM osmand.bike_route br
JOIN osmand.snapshot s ON s.id=br.snapshot_id AND s.status='active'
WHERE geom && ST_MakeEnvelope(!BBOX!::geometry)
"""

[[maps]]
name = "osmand_bike"
attribution = "© OpenStreetMap contributors (ODbL)"
[[maps.layers]] { provider_layer="osmand_pg.bike_way",   min_zoom=10, max_zoom=18 }
[[maps.layers]] { provider_layer="osmand_pg.bike_route", min_zoom=6,  max_zoom=18 }
```

Tile URL: `https://tiles.panellako.example/osmand_bike/{z}/{x}/{y}.pbf`

### 17.3 Attribúció kötelező megjelenítése

A frontend (MapLibre GL) `attributionControl`-ban:

```js
new maplibregl.AttributionControl({
  customAttribution: 'Kerékpáros adatok: © OpenStreetMap contributors (ODbL) — OsmAnd / Geofabrik forrásból'
})
```

---

## 18. Runbook

| Tünet | Diagnózis | Megoldás |
|---|---|---|
| `OsmAndDownloadFailed` (Geofabrik) | DNS, 5xx, vagy nincs MD5 | Várj 1 órát; ha tartós, ellenőrizd a Geofabrik statust |
| `OsmAndStalePbf` | Geofabrik nem épült | Megnézni a [Geofabrik build status](https://download.geofabrik.de/status.html) oldalt |
| `OsmAndMd5Mismatch` (kritikus!) | Letöltés sérült, vagy MITM | Újraindítás resume-mal; ha 2× sérült → security incident |
| `OsmAndSnapshotFailed` | Parser lebombázott | Logs alapján; ha új OSM tag-kombináció okozza → handler frissítés |
| `OsmAndBikeWayCountAnomaly` | 15%+ ingadozás | Diff query az előző két snapshot között, manuális spot-check |

```bash
# manuális futás
kubectl create job --from=cronjob/osmand-ingest osmand-manual-$(date +%s) -n panellako-data

# snapshot rollback
psql -c "UPDATE osmand.snapshot SET status='retired' WHERE id=:bad_id;
         UPDATE osmand.snapshot SET status='active'  WHERE id=:prev_good_id;"

# régi snapshot törlése (kaszkáddal)
psql -c "DELETE FROM osmand.snapshot WHERE id=:old_id;"
```

---

## 19. Roadmap

| Mérföldkő | Tartalom | Becsült |
|---|---|---|
| M1 — Downloader | OsmAnd index, OBF, Geofabrik PBF, MD5/SHA verifikáció | 1 hét |
| M2 — PBF parser | pyosmium handler, bike_way + bike_poi | 2 hét |
| M3 — Relation rebuild | route=bicycle MultiLineString | 1 hét |
| M4 — Snapshot rendszer | snapshot tábla, view, promote SQL | 3 nap |
| M5 — Tegola + API | Vektor tile-ok, FastAPI endpoint-ok | 1.5 hét |
| M6 — OBF audit | OsmAndMapCreator Docker, statisztika diff | 1 hét |
| M7 — Monitoring | Prometheus, Grafana dashboard | 3 nap |
| M8 — Backup | pg_basebackup, S3 versioning | 3 nap |
| M9 — Multi-region (V2) | bike-network kiterjesztés más országokra | 2 hét |

---

## 20. Referenciák

1. OsmAnd: <https://osmand.net/>
2. OsmAnd letöltőszerver: <https://download.osmand.net/>
3. OsmAnd indexek: <https://download.osmand.net/get_indexes>
4. OsmAnd MapCreator: <https://docs.osmand.net/docs/technical/map-creation/create-offline-maps-yourself>
5. OsmAnd OBF formátum dokumentáció: <https://docs.osmand.net/docs/technical/osmand-file-formats/osmand-obf>
6. Geofabrik letöltő: <https://download.geofabrik.de/>
7. Geofabrik technikai leírás: <https://download.geofabrik.de/technical.html>
8. OpenStreetMap, ODbL 1.0: <https://www.openstreetmap.org/copyright>
9. pyosmium: <https://osmcode.org/pyosmium/>
10. libosmium: <https://osmcode.org/libosmium/>
11. OSM Wiki — Bicycle: <https://wiki.openstreetmap.org/wiki/Bicycle>
12. OSM Wiki — Tag:route=bicycle: <https://wiki.openstreetmap.org/wiki/Tag:route%3Dbicycle>
13. EuroVelo routes: <https://en.eurovelo.com/>
14. Tegola: <https://tegola.io/>
15. pg_tileserv: <https://github.com/CrunchyData/pg_tileserv>
16. PostGIS: <https://postgis.net/>
17. SRTM3: <https://www2.jpl.nasa.gov/srtm/>
18. Copernicus DEM: <https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model>
19. ODbL FAQ: <https://wiki.openstreetmap.org/wiki/Open_Database_License/Use_Cases>
20. Osmium-tool: <https://osmcode.org/osmium-tool/>

> Verzió: 1.0.0 — Készült a Panellako adatplatform számára. OSM adatok ODbL 1.0 alatt; OsmAnd `.obf` letöltések archív célból, audit és verzió-összehasonlítás céljából használva. Az alap stratégia a Geofabrik HU `.osm.pbf` parszolása pyosmium-mal.
