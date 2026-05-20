# Organic Maps (organicmaps.app) — Teljes backend terv és adatkinyerési specifikáció

> Forrás: **Organic Maps** — nyílt forráskódú offline OSM-alapú navigációs alkalmazás (Android, iOS, Linux), a **Maps.me** kódbázisának fork-ja. Az app **`.mwm`** (MapsWithMe Map) bináris térkép-csomagokat tölt le országonként/régiónként. A `.mwm` formátum tartalmazza az OSM render-térképet, a routing-grafot (kerékpáros, gyalogos, autós), POI-kat és turisztikai jelöléseket. Az Organic Maps **2.0** óta kerékpárút-renderelést is biztosít (külön rétegként megjeleníthetők az OSM `route=bicycle` relációk).

> Cél: a Magyarországra vonatkozó Organic Maps `.mwm` csomag(ok) automatikus letöltése a hivatalos CDN-ről, archiválás, és — mivel a `.mwm` egy proprietary belső formátum — az **alap stratégia** az upstream **Geofabrik HU `.osm.pbf`** parszolása az `omim-tools` szemantikai szabályaival rekonstruálva. A `.mwm` audit célból párhuzamosan begyűjtve.

---

## 1. Forrás áttekintés

Az Organic Maps a Maps.me 2020-as licencváltása után létrejött közösségi fork. Forráskódja: `github.com/organicmaps/organicmaps`.

| Komponens | Leírás |
|---|---|
| `.mwm` (MapsWithMe Map) | Proprietary bináris térkép-csomag, Protocol Buffers + saját szekciózás. |
| `countries.txt` / `legacy_countries.txt` | Az országtagolás hierarchikus index-fája. |
| `data_version.txt` | A jelenlegi térkép-szervert tükröző verziószám (pl. `220909`). |
| `mwm/`, `world.mwm`, `World.mwm` | Globális alapréteg + per-ország fájlok. |
| `style/` | Render stílus (mapcss-szerű). |
| GitHub Releases | Az **alkalmazás** kiadásai (apk, ipa, deb, AppImage). |

### 1.1 Kerékpáros tartalom

Az Organic Maps a következő OSM-tag-eket renderel kerékpáros rétegként a 2.0+ verziókban:

- `highway=cycleway`, `cycleway=*`
- `bicycle=yes|designated|permissive`
- `route=bicycle` relációk (EuroVelo, ICN/NCN/RCN/LCN)
- `surface=*`, `mtb:scale=*`

A renderelt útvonal-jelölések színe követi az OSM `colour` és `osmc:symbol` tag-eket.

### 1.2 Két stratégia (mint az OsmAnd-nál)

| Stratégia | Magyarázat |
|---|---|
| **(A) `.mwm` parszolás** | Saját formátum, parser csak C++/`omim-tools`-on keresztül stabil |
| **(B) Geofabrik `.osm.pbf`** | Nyílt, pyosmium-mal könnyű, ODbL átláthatóság |

Az **alap stratégia ismét (B)**. A `.mwm` letöltést **kiegészítő, audit jellegű** erőforrásnak kezeljük (verziókövetés, statisztika).

---

## 2. Jogi és licenc helyzet

### 2.1 Organic Maps szoftver

- **Forráskód licenc**: **Apache 2.0** (`LICENSE` a repo gyökerében)
- **Alkalmazás-buildek**: GPL v3 elemekkel (a fonts/icons szublicensei különböznek, lásd `THIRD_PARTY.md`)
- A **letöltő-CDN** működése, az ott elérhető `.mwm` fájlok **felhasználása** az app keretein belül engedélyezett. Az hogy egy harmadik fél (mi) tömegesen letöltsük és parszoljuk, jogi szempontból **nem tiltott** (a fájlok publikusan, hitelesítés nélkül elérhetők és az ODbL alá tartozó adatot tartalmaznak), de:
  - **udvariasság**: a polite scraping szabályait tiszteletben kell tartani
  - **adatfelhasználás**: a `.mwm` belső struktúrájának visszafejtése Apache 2.0 alatt megengedett, de a derivatív kód külön Apache 2.0 attribúcióval

### 2.2 OSM adat (a `.mwm` és `.osm.pbf` tartalma)

- **Licenc**: **ODbL 1.0** — minden korlátozás ugyanaz, mint az OsmAnd specifikációnál (16-os fájl)
- **Attribúció**: „© OpenStreetMap contributors" minden megjelenítés mellett, Organic Maps + OSM hivatkozással

### 2.3 GitHub Releases (app buildek)

- A GitHub Releases-eken keresztül elérhető APK/IPA/AppImage **csak audit / verziókövetési** célból érdekelne minket; ezeket NEM töltjük le rendszeresen
- Ha mégis (pl. új release esetén verzió-tag-et akarunk kinyerni az `assets/styles_clear/` alól), GitHub API-n keresztül történik 60 req/h anonim rate-limittel.

### 2.4 Saját Panellako adatbázisra vonatkozó kötelezettségek

Lásd 16-os fájl (OsmAnd) 2.4 — azonos.

### 2.5 GDPR

Nincs személyes adat.

---

## 3. Adatkinyerési felület

### 3.1 Organic Maps CDN

- **Base URL** (megfigyelt, 2024): `https://cdn-eu1.organicmaps.app/` (és tükrök: `cdn-us1`, `cdn-asia1`)
- **Verzió-katalógus**: `https://cdn-eu1.organicmaps.app/MapsWithMeAndroidPro/{version}/`
- **Country index**: `https://cdn-eu1.organicmaps.app/MapsWithMeAndroidPro/{version}/countries.txt`
- **Per-country `.mwm`**:
  ```
  https://cdn-eu1.organicmaps.app/MapsWithMeAndroidPro/{version}/Hungary.mwm
  ```
- **World map**:
  ```
  https://cdn-eu1.organicmaps.app/MapsWithMeAndroidPro/{version}/World.mwm
  https://cdn-eu1.organicmaps.app/MapsWithMeAndroidPro/{version}/WorldCoasts.mwm
  ```
- **Méret (Hungary)**: ~80–150 MB

> A pontos CDN host és verzió-string idővel változhat. A pipeline **mindig** a GitHub-on publikált `data_version.txt`-ből (`github.com/organicmaps/organicmaps/blob/master/data/external_resources.txt` vagy az app `data_version.txt`) olvassa ki az aktuális verziót.

### 3.2 Geofabrik (B stratégia)

Lásd 16-os fájl 3.2 — azonos URL-ek.

### 3.3 GitHub API (verziókövetés)

```
GET https://api.github.com/repos/organicmaps/organicmaps/releases/latest
GET https://api.github.com/repos/organicmaps/organicmaps/contents/data/data_version.txt
```

### 3.4 Bounding box

Magyarország: `(16.0, 45.7, 22.9, 48.6)`

---

## 4. Hitelesítés, rate limit, kvóták

- **Hitelesítés**: nincs (publikus CDN).
- **Rate limit** (organicmaps CDN): explicit limit nem dokumentált. Vállalt önkorlátozás:
  - max **1 letöltés / 5 perc** (a fájlok nagyok, nincs értelme párhuzamosan)
  - havi 1-2 letöltés a HU `.mwm`-re
- **Rate limit** (GitHub API): 60 req/h anonim, vagy 5000 req/h Personal Access Token-nel. Csak verzió-poll-ra használjuk → 1 req/h elég.
- **User-Agent**: `PanellakoBike/1.0 (+https://panellako.example/contact)` — minden kérésen.
- **Range request**: a CDN támogatja → resume-mal töltünk.
- **CDN cache**: az ETag/Last-Modified beérkezik, használjuk.

---

## 5. Adatmodell a forrásból

### 5.1 `.mwm` belső struktúra (egyszerűsített)

```
MWM
├── header              — version, country code, mwm format version
├── version             — generation timestamp
├── dat                 — feature data (geometry + tags)
├── idx                 — feature index
├── geomN               — zoom-szintenként generalizált geometriák
├── trgN                — háromszögelt geometriák poly-okhoz
├── rgnN                — régió index (postal code területek)
├── search              — geocoder index
├── crmtr               — cross-mwm routing graph
├── routing             — country routing graph
└── ugc                 — user-generated content (Maps.me örökség, üres)
```

A formátum dokumentációja: `github.com/organicmaps/organicmaps/blob/master/docs/MAPS_FORMAT.md`. A parszolás csak C++ binding-on keresztül praktikus (`generator_tool`, `omim-tools`), Python natívan nem támogatott.

### 5.2 Releváns OSM elemek

Ugyanazok, mint a 16-os fájlban (OsmAnd). Az Organic Maps értelmezése egy ponton tér el: a `cycleway=opposite*` esetén jellemzően nem renderel külön kerékpárutat, hanem inline jelöli a way-en.

### 5.3 Country index (`countries.txt`)

```
{
  "id": "World",
  "g": [
    {"id": "Hungary", "s": 89234567, "rs": 4567890, "sha1_base64": "abc...", "g": []},
    {"id": "Slovakia", "s": ...},
    ...
  ]
}
```

A `s` mező a tömörített méret, `rs` a kicsomagolt, `sha1_base64` a fájl SHA-1-je.

---

## 6. Cél adatmodell (PostGIS DDL)

```sql
CREATE SCHEMA IF NOT EXISTS organicmaps;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS hstore;

-- Az Organic Maps CDN-en megfigyelt verziók
CREATE TABLE organicmaps.data_version (
    id              BIGSERIAL PRIMARY KEY,
    version_code    TEXT NOT NULL UNIQUE,            -- pl. '220909'
    detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    countries_txt_sha256 TEXT,
    note            TEXT
);

-- Letöltött .mwm csomagok
CREATE TABLE organicmaps.mwm_package (
    id              BIGSERIAL PRIMARY KEY,
    version_id      BIGINT NOT NULL REFERENCES organicmaps.data_version(id),
    country         TEXT NOT NULL,                   -- 'Hungary', 'Slovakia', stb.
    source_url      TEXT NOT NULL,
    sha1_base64     TEXT,                            -- a countries.txt-ből
    sha256          TEXT NOT NULL,                   -- mi számoljuk
    bytes_compressed   BIGINT NOT NULL,
    bytes_uncompressed BIGINT,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    raw_s3_key      TEXT NOT NULL,
    UNIQUE (version_id, country, sha256)
);

-- Geofabrik letöltések (azonos struktúra mint OsmAnd-nál)
CREATE TABLE organicmaps.pbf_package (
    id              BIGSERIAL PRIMARY KEY,
    source_url      TEXT NOT NULL,
    sha256          TEXT NOT NULL,
    md5             TEXT,
    bytes           BIGINT NOT NULL,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    osm_timestamp   TIMESTAMPTZ,
    raw_s3_key      TEXT NOT NULL,
    UNIQUE (source_url, sha256)
);

CREATE TABLE organicmaps.snapshot (
    id              BIGSERIAL PRIMARY KEY,
    pbf_id          BIGINT NOT NULL REFERENCES organicmaps.pbf_package(id),
    associated_mwm_id BIGINT REFERENCES organicmaps.mwm_package(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    status          TEXT NOT NULL CHECK (status IN ('building','active','retired'))
);

CREATE TABLE organicmaps.bike_way (
    id              BIGSERIAL PRIMARY KEY,
    snapshot_id     BIGINT NOT NULL REFERENCES organicmaps.snapshot(id) ON DELETE CASCADE,
    osm_way_id      BIGINT NOT NULL,
    highway         TEXT,
    bicycle         TEXT,
    cycleway        TEXT,
    surface         TEXT,
    mtb_scale       TEXT,
    name            TEXT,
    ref             TEXT,
    tags            HSTORE,
    geom            geometry(LineString, 4326) NOT NULL,
    length_m        NUMERIC(10,2) NOT NULL,
    UNIQUE (snapshot_id, osm_way_id)
);
CREATE INDEX ix_om_bike_way_geom ON organicmaps.bike_way USING GIST (geom);
CREATE INDEX ix_om_bike_way_hwy  ON organicmaps.bike_way (highway);

CREATE TABLE organicmaps.bike_route (
    id              BIGSERIAL PRIMARY KEY,
    snapshot_id     BIGINT NOT NULL REFERENCES organicmaps.snapshot(id) ON DELETE CASCADE,
    osm_relation_id BIGINT NOT NULL,
    network         TEXT,
    ref             TEXT,
    name            TEXT,
    colour          TEXT,
    osmc_symbol     TEXT,
    tags            HSTORE,
    geom            geometry(MultiLineString, 4326),
    UNIQUE (snapshot_id, osm_relation_id)
);
CREATE INDEX ix_om_bike_route_geom ON organicmaps.bike_route USING GIST (geom);

CREATE TABLE organicmaps.bike_poi (
    id              BIGSERIAL PRIMARY KEY,
    snapshot_id     BIGINT NOT NULL REFERENCES organicmaps.snapshot(id) ON DELETE CASCADE,
    osm_id          BIGINT NOT NULL,
    osm_type        CHAR(1) NOT NULL CHECK (osm_type IN ('n','w','r')),
    category        TEXT NOT NULL,
    name            TEXT,
    tags            HSTORE,
    geom            geometry(Point, 4326) NOT NULL,
    UNIQUE (snapshot_id, osm_type, osm_id)
);
CREATE INDEX ix_om_bike_poi_geom ON organicmaps.bike_poi USING GIST (geom);

CREATE TABLE organicmaps.ingest_log (
    id              BIGSERIAL PRIMARY KEY,
    snapshot_id     BIGINT REFERENCES organicmaps.snapshot(id),
    stage           TEXT NOT NULL,
    status          TEXT NOT NULL,
    detail          TEXT,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

A séma a 16-os fájl (OsmAnd) szerkezetét tükrözi, és néven elkülönül, hogy egyértelműen látható legyen, melyik forrásból származik egy rekord. A `snapshot.associated_mwm_id` köti össze a `.osm.pbf`-alapú adatot a párhuzamosan archivált `.mwm` csomaggal.

---

## 7. Backend architektúra (L1–L8 rétegek)

```mermaid
flowchart TB
    subgraph L1[L1: Forrás]
      OM[cdn-eu1.organicmaps.app]
      GF[download.geofabrik.de]
      GH[api.github.com<br/>organicmaps repo]
    end
    L1 --> L2[L2: Downloader]
    L2 --> L3[L3: Raw S3]
    L3 --> L4A[L4A: PBF parser<br/>pyosmium]
    L3 --> L4B[L4B: MWM audit<br/>omim-tools docker]
    L4A --> L5[L5: Snapshot loader]
    L4B -.-> L5
    L5 --> L6[L6: Bike route geometry build]
    L6 --> L7[L7: API + Tiles<br/>FastAPI + Tegola]
    L7 --> L8[L8: Panellako kliens]
```

A pipeline lényegében azonos az OsmAnd-éval, de **két különbség**:

1. A verzió-felismerés a `data_version.txt` GitHub fájlt olvassa (nem `indexes.xml`-t)
2. A `.mwm` parser opcionális (audit), nem kritikus függőség

---

## 8. Automatizált letöltő — Python kód

```python
# scripts/ingest_organicmaps.py
"""Organic Maps + Geofabrik letöltő.

- GitHub API: data_version.txt → aktuális verzió felfedezése
- CDN: countries.txt + Hungary.mwm letöltés (audit)
- Geofabrik: hungary-latest.osm.pbf (alap adatforrás)
- Mind: SHA-256 és (ha van) SHA-1/MD5 verifikáció
- PostGIS metaadat rögzítés, raw S3 archiválás
"""
from __future__ import annotations

import base64
import hashlib
import json
import logging
import os
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import psycopg
import requests
from tenacity import retry, stop_after_attempt, wait_exponential

LOG = logging.getLogger("organicmaps.ingest")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

UA = "PanellakoBike/1.0 (+https://panellako.example/contact)"
RAW_ROOT = Path(os.environ.get("RAW_ROOT", "./raw/organicmaps"))
PG_DSN = os.environ["PG_DSN"]

GITHUB_DATA_VERSION_URL = (
    "https://raw.githubusercontent.com/organicmaps/organicmaps/master/data/data_version.txt"
)
GITHUB_API_LATEST_RELEASE = "https://api.github.com/repos/organicmaps/organicmaps/releases/latest"

OM_CDN_BASE = "https://cdn-eu1.organicmaps.app/MapsWithMeAndroidPro"
OM_COUNTRY = "Hungary"

GEOFABRIK_HU_PBF = "https://download.geofabrik.de/europe/hungary-latest.osm.pbf"
GEOFABRIK_HU_MD5 = "https://download.geofabrik.de/europe/hungary-latest.osm.pbf.md5"


@retry(wait=wait_exponential(multiplier=2, min=2, max=60), stop=stop_after_attempt(5))
def http_get_text(url: str) -> str:
    r = requests.get(url, headers={"User-Agent": UA}, timeout=30)
    r.raise_for_status()
    return r.text


def discover_data_version() -> str:
    """Az aktuális Organic Maps adatverzió, pl. '230101'."""
    text = http_get_text(GITHUB_DATA_VERSION_URL).strip()
    # Az első sor / első szám a verzió
    for line in text.splitlines():
        line = line.strip()
        if line.isdigit():
            return line
    # fallback
    return text.split()[0]


def fetch_countries_txt(version: str) -> tuple[str, str]:
    """Letölti a countries.txt-t, visszatér a tartalom + sha256."""
    url = f"{OM_CDN_BASE}/{version}/countries.txt"
    text = http_get_text(url)
    sha = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return text, sha


def find_country_meta(countries_text: str, country: str) -> dict | None:
    """countries.txt JSON-szerű — bejárjuk és megkeressük az országot."""
    data = json.loads(countries_text)
    stack = [data]
    while stack:
        node = stack.pop()
        if isinstance(node, dict):
            if node.get("id") == country:
                return node
            for child in node.get("g", []) or []:
                stack.append(child)
    return None


def register_version(version: str, countries_sha: str) -> int:
    with psycopg.connect(PG_DSN, autocommit=True) as cx:
        with cx.cursor() as cur:
            cur.execute(
                """INSERT INTO organicmaps.data_version (version_code, countries_txt_sha256)
                   VALUES (%s,%s)
                   ON CONFLICT (version_code) DO UPDATE SET countries_txt_sha256 = EXCLUDED.countries_txt_sha256
                   RETURNING id;""",
                (version, countries_sha),
            )
            return cur.fetchone()[0]


def stream_download(url: str, target: Path) -> tuple[str, int]:
    headers = {"User-Agent": UA}
    mode = "wb"
    if target.exists():
        headers["Range"] = f"bytes={target.stat().st_size}-"
        mode = "ab"
    with requests.get(url, headers=headers, stream=True, timeout=600) as r:
        if r.status_code == 416:
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


def verify_sha1_base64(target: Path, expected_b64: str) -> bool:
    h = hashlib.sha1()
    with target.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    actual_b64 = base64.b64encode(h.digest()).decode("ascii").rstrip("=")
    return actual_b64.startswith(expected_b64.rstrip("="))


def fetch_mwm(version: str, version_id: int, country: str, meta: dict) -> int | None:
    today = datetime.now(timezone.utc)
    folder = RAW_ROOT / "mwm" / version / f"{today:%Y%m%d}"
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / f"{country}.mwm"
    url = f"{OM_CDN_BASE}/{version}/{country}.mwm"
    LOG.info("MWM letöltés: %s", url)
    sha256, size = stream_download(url, target)
    if meta.get("sha1_base64") and not verify_sha1_base64(target, meta["sha1_base64"]):
        LOG.error("MWM SHA-1 mismatch: %s", target)
        return None
    with psycopg.connect(PG_DSN, autocommit=True) as cx:
        with cx.cursor() as cur:
            cur.execute(
                """INSERT INTO organicmaps.mwm_package
                   (version_id, country, source_url, sha1_base64, sha256,
                    bytes_compressed, bytes_uncompressed, raw_s3_key)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                   ON CONFLICT (version_id, country, sha256) DO NOTHING
                   RETURNING id;""",
                (version_id, country, url, meta.get("sha1_base64"), sha256,
                 size, meta.get("rs"), str(target)),
            )
            row = cur.fetchone()
            return row[0] if row else None


def fetch_pbf() -> int | None:
    today = datetime.now(timezone.utc)
    folder = RAW_ROOT / "pbf" / f"{today:%Y/%m}"
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / "hungary-latest.osm.pbf"
    LOG.info("PBF letöltés: %s", GEOFABRIK_HU_PBF)
    sha256, size = stream_download(GEOFABRIK_HU_PBF, target)
    # MD5 verifikáció
    md5_text = http_get_text(GEOFABRIK_HU_MD5).split()[0]
    h = hashlib.md5()
    with target.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    actual_md5 = h.hexdigest()
    if md5_text != actual_md5:
        LOG.error("PBF MD5 mismatch")
        target.unlink(missing_ok=True)
        return None
    with psycopg.connect(PG_DSN, autocommit=True) as cx:
        with cx.cursor() as cur:
            cur.execute(
                """INSERT INTO organicmaps.pbf_package
                   (source_url, sha256, md5, bytes, raw_s3_key)
                   VALUES (%s,%s,%s,%s,%s)
                   ON CONFLICT (source_url, sha256) DO NOTHING
                   RETURNING id;""",
                (GEOFABRIK_HU_PBF, sha256, actual_md5, size, str(target)),
            )
            row = cur.fetchone()
            return row[0] if row else None


def main() -> None:
    RAW_ROOT.mkdir(parents=True, exist_ok=True)
    # 1) Aktuális Organic Maps adatverzió felfedezése
    version = discover_data_version()
    LOG.info("Organic Maps adatverzió: %s", version)
    countries_text, countries_sha = fetch_countries_txt(version)
    version_id = register_version(version, countries_sha)
    meta = find_country_meta(countries_text, OM_COUNTRY)
    if meta is None:
        LOG.error("Hungary nem található a countries.txt-ben")
    else:
        try:
            mwm_id = fetch_mwm(version, version_id, OM_COUNTRY, meta)
            LOG.info("MWM rögzítve id=%s", mwm_id)
        except Exception as exc:
            LOG.error("MWM letöltés hiba: %s", exc)
    time.sleep(5.0)
    # 2) Geofabrik PBF (alap adatforrás)
    try:
        pbf_id = fetch_pbf()
        LOG.info("PBF rögzítve id=%s", pbf_id)
    except Exception as exc:
        LOG.error("PBF letöltés hiba: %s", exc)


if __name__ == "__main__":
    main()
```

---

## 9. Feldolgozó pipeline

### 9.1 PBF parszolás (azonos a 16-os fájllal, módosított handler)

```python
# scripts/parse_organicmaps_pbf.py
"""Lényegében ugyanaz, mint scripts/parse_osmand_pbf.py, csak az
   organicmaps.* sémába tölt."""
from scripts.parse_osmand_pbf import BikeHandler as _BaseHandler
import psycopg
import os


class OrganicBikeHandler(_BaseHandler):
    """Azonos logika, de az organicmaps.* táblákba ír."""

    def _flush_ways(self):
        if not self.way_buf:
            return
        with self.cx.cursor() as cur:
            cur.executemany(
                """INSERT INTO organicmaps.bike_way
                   (snapshot_id, osm_way_id, highway, bicycle, cycleway, surface,
                    mtb_scale, name, ref, tags, geom, length_m)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s, %s::hstore,
                           ST_GeomFromText(%s, 4326), %s)
                   ON CONFLICT DO NOTHING""",
                [(s, w, h, b, cw, surf, mtb, n, ref, t, geom, length)
                 for (s, w, h, b, cw, surf, _smoothness, mtb, n, ref, t, geom, length) in self.way_buf],
            )
        self.way_buf.clear()

    def _flush_pois(self):
        if not self.poi_buf:
            return
        with self.cx.cursor() as cur:
            cur.executemany(
                """INSERT INTO organicmaps.bike_poi
                   (snapshot_id, osm_id, osm_type, category, name, tags, geom)
                   VALUES (%s,%s,%s,%s,%s, %s::hstore, ST_GeomFromText(%s, 4326))
                   ON CONFLICT DO NOTHING""", self.poi_buf,
            )
        self.poi_buf.clear()

    def _flush_rels(self):
        if not self.rel_buf:
            return
        with self.cx.cursor() as cur:
            cur.executemany(
                """INSERT INTO organicmaps.bike_route
                   (snapshot_id, osm_relation_id, network, ref, name, colour, osmc_symbol, tags, geom)
                   VALUES (%s,%s,%s,%s,%s,%s,%s, %s::hstore,
                           ST_GeomFromText('MULTILINESTRING EMPTY', 4326))
                   ON CONFLICT DO NOTHING""",
                [(s, r, net, ref, n, col, sym, t)
                 for (s, r, net, ref, n, _op, col, sym, t) in self.rel_buf],
            )
        self.rel_buf.clear()


def parse(pbf_path: str, snapshot_id: int):
    with psycopg.connect(os.environ["PG_DSN"], autocommit=True) as cx:
        h = OrganicBikeHandler(snapshot_id, cx)
        h.apply_file(pbf_path, locations=True)
        h.flush()
```

> Megjegyzés: a két forrás (OsmAnd / Organic Maps) PBF-szintű tartalma **azonos** (mindkettő Geofabrik HU PBF). A séma-elválasztás funkcionális redundancia, hogy ha bármelyik upstream pipeline különbözőképp értelmezi az OSM tag-eket (pl. egyikben szigorúbb bicycle szűrés), a Panellako felület eldöntheti, melyik réteget jeleníti meg.

### 9.2 Relation geometriák összeállítása

Azonos SQL, mint a 16-os fájl 9.2 — csak séma-nevet cseréljük: `osmand.*` → `organicmaps.*`.

### 9.3 `.mwm` audit (omim-tools)

A `.mwm` belső statisztikát az `omim-tools` segítségével tudjuk kinyerni:

```dockerfile
# Dockerfile.omim-tools
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y --no-install-recommends \
    git cmake build-essential libqt5gui5 libqt5network5 libqt5xml5 libqt5opengl5 \
    libboost-all-dev libssl-dev libsqlite3-dev libstxxl-dev libstxxl1v5 \
    libluabind-dev liblua5.2-dev libsqliteodbc libtbb-dev libxi-dev libxmu-dev \
    libxrandr-dev libxinerama-dev libxcursor-dev \
    && rm -rf /var/lib/apt/lists/*
RUN git clone --recursive https://github.com/organicmaps/organicmaps.git /opt/organicmaps
RUN cd /opt/organicmaps && cmake -DCMAKE_BUILD_TYPE=Release . && make generator_tool
ENTRYPOINT ["/opt/organicmaps/generator_tool"]
```

Statisztikai futtatás:

```bash
docker run --rm -v /data/raw:/raw omim-tools \
  --intermediate_data_path=/raw/mwm/230101/20260101/ \
  --output=/raw/mwm/230101/20260101/Hungary.stats.json \
  --stats=full Hungary.mwm
```

Az output JSON-t a `mwm_package` rekordhoz hozzákapcsolt mezőként (`stats JSONB`) menthetjük — DDL bővítés szükséges, ha élesítjük:

```sql
ALTER TABLE organicmaps.mwm_package ADD COLUMN IF NOT EXISTS stats JSONB;
```

### 9.4 Snapshot atomic swap

Azonos, mint OsmAnd-nál.

---

## 10. Frissítési stratégia

| Forrás | Ütemezés |
|---|---|
| Geofabrik HU PBF | naponta 05:30 CET |
| Organic Maps `data_version.txt` | naponta 06:00 CET (GitHub poll) |
| Organic Maps HU `.mwm` | csak akkor, ha új `version_code` |
| Organic Maps GitHub release | hetente egyszer (audit, app verzió tracking) |

```mermaid
flowchart LR
    A[06:00 CET<br/>Poll data_version.txt] -->|new version?| B[Fetch countries.txt]
    A -->|no change| Z[Skip]
    B --> C[Fetch HU.mwm]
    C --> D[Register mwm_package]
    D --> E[Geofabrik PBF poll]
    Z --> E
    E -->|new PBF?| F[Download + parse]
    E -->|no change| G[Skip]
    F --> H[Build snapshot]
    H --> I[Promote active]
```

A `.mwm` tipikusan **havi** ritkasággal frissül; a Geofabrik PBF naponta. Tehát napi futás esetén a tipikus napon csak PBF letöltés és új snapshot lesz; havonta egyszer plusz az új `.mwm` is.

---

## 11. Storage és skálázás

| Komponens | Méret |
|---|---|
| HU `.mwm` | ~100 MB |
| HU `.osm.pbf` | ~210 MB |
| countries.txt | ~600 KB |
| 12 hónap mwm verzió raw | ~1.2 GB |
| 90 napi pbf raw | ~19 GB |
| PostGIS bike_way | ~600 MB |
| PostGIS bike_route | ~50 MB |
| PostGIS bike_poi | ~30 MB |
| Vektor tile cache | ~5 GB |

A skálázási megfontolások azonosak a 16-os fájl 11. fejezetével.

---

## 12. Monitoring és riasztások

```yaml
groups:
- name: organicmaps
  rules:
  - alert: OrganicMapsDataVersionStale
    expr: time() - organicmaps_data_version_last_seen_timestamp > 60*60*24*60
    for: 1h
    annotations: { summary: "Organic Maps adatverzió 60+ napja nem változott — még normális, de figyelmeztetés" }
  - alert: OrganicMapsCdnUnreachable
    expr: increase(organicmaps_cdn_fetch_errors_total[24h]) > 3
    for: 30m
  - alert: OrganicMapsMwmSha1Mismatch
    expr: increase(organicmaps_mwm_sha1_mismatch_total[24h]) > 0
    for: 5m
    labels: { severity: critical }
  - alert: OrganicMapsPbfMd5Mismatch
    expr: increase(organicmaps_pbf_md5_mismatch_total[24h]) > 0
    for: 5m
    labels: { severity: critical }
  - alert: OrganicMapsSnapshotBuildFailed
    expr: increase(organicmaps_snapshot_errors_total[1h]) > 0
    for: 30m
  - alert: OrganicMapsBikeWayCountDrop
    expr: |
      (organicmaps_bike_way_count - organicmaps_bike_way_count offset 7d)
       / organicmaps_bike_way_count offset 7d < -0.15
    for: 2h
```

Metrikák:
- `organicmaps_data_version_last_seen_timestamp`
- `organicmaps_cdn_fetch_errors_total{country}`
- `organicmaps_mwm_sha1_mismatch_total`
- `organicmaps_pbf_md5_mismatch_total`
- `organicmaps_snapshot_errors_total`
- `organicmaps_bike_way_count`, `organicmaps_bike_route_count`, `organicmaps_bike_poi_count`

---

## 13. Költségbecslés

| Tétel | Havi (HUF) |
|---|---|
| PostGIS megosztott (osmand-dal) — 50% allokáció | 6 000 |
| Parser worker VM (2 vCPU, 4 GB) | 4 000 |
| S3 (30 GB) | 700 |
| Sávszélesség (havi 10 GB egress) | 800 |
| **Összesen** | **~11 500** |

Egy év: ~138 000 HUF. Olcsóbb, mint a 16-os fájlban a teljes OsmAnd stack, mert a PostGIS-t megosztja vele.

---

## 14. Biztonság

- **CDN letöltés**: HTTPS-only, tanúsítvány-validáció. SHA-1 verifikáció a `countries.txt`-ben szereplő hash alapján.
- **PBF**: MD5 verifikáció (Geofabrik), SHA-256 mi számoljuk.
- **MWM parser sandbox**: a `omim-tools` JVM-mentes, de Docker-konténerben, no-network, read-only `/raw` mount-tal.
- **GitHub API token**: ha használjuk, akkor `read:public_repo` scope-pal, GitHub PAT, Vault-ban.
- **Snapshot retirement**: 90 nap után automatikus törlés.
- **Apache 2.0 attribúció**: ha a generator_tool kódját módosítjuk, a forkunknak meg kell tartania a NOTICE fájlt.

---

## 15. Tesztelés — pytest

```python
# tests/test_organicmaps.py
import base64
import hashlib
import json
import pytest
import psycopg
import os

from scripts.ingest_organicmaps import (
    find_country_meta, verify_sha1_base64, discover_data_version
)
from scripts.parse_organicmaps_pbf import OrganicBikeHandler


def test_find_country_meta_nested():
    txt = json.dumps({
        "id": "World",
        "g": [
            {"id": "Europe", "g": [
                {"id": "Hungary", "s": 1234, "rs": 5678, "sha1_base64": "abc"},
                {"id": "Slovakia", "s": 999}
            ]}
        ]
    })
    m = find_country_meta(txt, "Hungary")
    assert m["s"] == 1234
    assert m["sha1_base64"] == "abc"
    assert find_country_meta(txt, "Nonexistent") is None


def test_sha1_base64_match(tmp_path):
    f = tmp_path / "x"
    f.write_bytes(b"hello")
    h = hashlib.sha1(b"hello").digest()
    expected = base64.b64encode(h).decode("ascii").rstrip("=")
    assert verify_sha1_base64(f, expected) is True
    assert verify_sha1_base64(f, "wrongchecksum") is False


def test_handler_bike_filter():
    h = OrganicBikeHandler(snapshot_id=0, cx=None)
    assert h._is_bike_way({"highway": "cycleway"}) is True
    assert h._is_bike_way({"highway": "track", "bicycle": "designated"}) is True
    assert h._is_bike_way({"highway": "motorway"}) is False


@pytest.mark.integration
def test_full_pipeline(postgis_db, monkeypatch):
    """End-to-end: data_version mock + PBF parse + snapshot promote."""
    # mock the data_version fetcher
    monkeypatch.setattr(
        "scripts.ingest_organicmaps.discover_data_version", lambda: "999999"
    )
    # … apply a tiny PBF fixture, build snapshot, promote, query API
```

Tesztelési cél:
- Unit > 80%
- Integráció: mini PBF fixture (Velence körüli bbox, kb. 2 MB)
- Property-based: random országnevek `countries.txt`-ben

---

## 16. Telepítés

### 16.1 Dockerfile

```dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libosmium2-dev libboost-program-options1.74.0 libexpat1 \
    libbz2-1.0 libsparsehash-dev zlib1g \
    ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY scripts/ ./scripts/
COPY sql/ ./sql/

ENV PYTHONUNBUFFERED=1 RAW_ROOT=/data/raw TZ=Europe/Budapest
ENTRYPOINT ["python", "-m", "scripts.ingest_organicmaps"]
```

### 16.2 k8s CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: organicmaps-ingest
  namespace: panellako-data
spec:
  schedule: "30 5 * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      backoffLimit: 1
      activeDeadlineSeconds: 7200
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: ingest
            image: registry.example/panellako/organicmaps-ingest:v1.0.0
            envFrom:
            - secretRef: { name: organicmaps-secrets }
            volumeMounts:
            - { name: raw, mountPath: /data/raw }
            resources:
              requests: { cpu: 1, memory: 2Gi }
              limits:   { cpu: 4, memory: 8Gi }
          volumes:
          - name: raw
            persistentVolumeClaim: { claimName: organicmaps-raw-pvc }
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata: { name: organicmaps-raw-pvc, namespace: panellako-data }
spec:
  accessModes: [ReadWriteOnce]
  resources: { requests: { storage: 30Gi } }
  storageClassName: ssd
```

### 16.3 GitHub Actions

```yaml
name: organicmaps-ci
on:
  push: { branches: [main], paths: ['scripts/*organicmaps*', 'sql/organicmaps_schema.sql'] }
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env: { POSTGRES_PASSWORD: postgres, POSTGRES_DB: om_test }
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: sudo apt-get update && sudo apt-get install -y libosmium2-dev
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: psql postgresql://postgres:postgres@localhost/om_test -f sql/organicmaps_schema.sql
        env: { PGPASSWORD: postgres }
      - run: pytest tests/test_organicmaps.py -v
```

### 16.4 Docker Compose (lokális fejlesztés)

```yaml
version: "3.9"
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: panellako
    ports: ["5433:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
  organicmaps-ingest:
    build: { context: ., dockerfile: docker/organicmaps.Dockerfile }
    environment:
      PG_DSN: "postgresql://postgres:postgres@postgres/panellako"
      RAW_ROOT: /raw
    volumes: ["raw:/raw"]
    depends_on: [postgres]
volumes:
  pgdata: {}
  raw: {}
```

---

## 17. Adatpublikálás

### 17.1 REST API (FastAPI)

```python
from fastapi import APIRouter, Query

router = APIRouter(prefix="/v1/organicmaps", tags=["organicmaps"])

@router.get("/version")
async def current_version():
    """A jelenleg aktív Organic Maps adatverzió."""
    # SELECT version_code FROM organicmaps.data_version
    # JOIN organicmaps.snapshot s … WHERE s.status='active' …
    ...

@router.get("/ways")
async def list_ways(
    bbox: str = Query(..., description="HU max"),
    highway: str | None = None,
    limit: int = 1000,
):
    ...

@router.get("/routes")
async def list_routes(network: str | None = None):
    ...

@router.get("/routes/{relation_id}.geojson")
async def route_geojson(relation_id: int):
    ...

@router.get("/poi")
async def list_pois(bbox: str, category: str | None = None, limit: int = 500):
    ...
```

### 17.2 Vektor csempék (Tegola)

```toml
[[providers.layers]]
name = "om_bike_way"
sql = """
SELECT bw.id, bw.osm_way_id, bw.highway, bw.bicycle, bw.cycleway, bw.surface, bw.name, bw.ref, bw.geom
FROM organicmaps.bike_way bw
JOIN organicmaps.snapshot s ON s.id = bw.snapshot_id AND s.status = 'active'
WHERE bw.geom && ST_MakeEnvelope(!BBOX!::geometry)
"""

[[providers.layers]]
name = "om_bike_route"
sql = """
SELECT br.id, br.network, br.ref, br.name, br.colour, br.geom
FROM organicmaps.bike_route br
JOIN organicmaps.snapshot s ON s.id = br.snapshot_id AND s.status = 'active'
WHERE br.geom && ST_MakeEnvelope(!BBOX!::geometry)
"""

[[maps]]
name = "om_bike"
attribution = "© OpenStreetMap contributors (ODbL) — Organic Maps / Geofabrik forrás"
```

### 17.3 Attribúció

```
Térkép-adatok: © OpenStreetMap contributors (ODbL)
Forrás-verzió: Organic Maps {version_code} + Geofabrik HU {osm_timestamp}
Renderelő: Tegola / MapLibre GL
Szoftver-licenc: Organic Maps — Apache License 2.0
```

---

## 18. Runbook

| Tünet | Diagnózis | Megoldás |
|---|---|---|
| `OrganicMapsCdnUnreachable` | Az `cdn-eu1` host nem válaszol | Próbáld a tükröket: `cdn-us1`, `cdn-asia1`. Ha mind dead → várj 6 órát. |
| `OrganicMapsMwmSha1Mismatch` (kritikus) | A countries.txt-ben szereplő SHA-1 nem egyezik | Töröld a letöltést, várj 1 órát, próbáld újra. Ha 3× sérült → security incident. |
| `OrganicMapsPbfMd5Mismatch` (kritikus) | Geofabrik build közben futottunk | Várj 30 percet és próbáld újra |
| `OrganicMapsSnapshotBuildFailed` | Új OSM tag-kombináció a kezelőben | Logs, handler frissítés, fixture-be új tag |
| `OrganicMapsBikeWayCountDrop` | 15%+ csökkenés | Diff query: `SELECT highway, COUNT(*) FROM v_active_bike_way GROUP BY highway` → összevetés előző snapshot-tal |

```bash
# manuális futás
kubectl create job --from=cronjob/organicmaps-ingest om-manual-$(date +%s) -n panellako-data

# verzió-keresés a CDN-en
curl -s -A "PanellakoBike/1.0" https://cdn-eu1.organicmaps.app/MapsWithMeAndroidPro/{version}/countries.txt | jq '.g[] | select(.id=="Europe") | .g[] | select(.id=="Hungary")'

# snapshot rollback
psql -c "UPDATE organicmaps.snapshot SET status='retired' WHERE id=:bad;
         UPDATE organicmaps.snapshot SET status='active'  WHERE id=:prev_good;"
```

---

## 19. Roadmap

| Mérföldkő | Tartalom | Becsült |
|---|---|---|
| M1 — Downloader | GitHub data_version poll, CDN fetch, MD5/SHA-1 verifikáció | 1 hét |
| M2 — PBF parser | OrganicBikeHandler, COPY into organicmaps.* | 1 hét |
| M3 — Snapshot | atomic promote SQL, retention | 3 nap |
| M4 — Tegola + API | layer-konfig, FastAPI végpontok | 1 hét |
| M5 — MWM audit | omim-tools Docker build, generator_tool stats | 2 hét |
| M6 — Monitoring | Prometheus rules, Grafana | 3 nap |
| M7 — Egyesített view | `unified.bike_way` view, ami az OsmAnd + Organic Maps + … forrásokból egyesíti | 1 hét |
| M8 — Multi-country | Slovakia, Czech, Poland .mwm + .osm.pbf | 1 hét |
| M9 — App release tracking | GitHub release webhook → audit log | 3 nap |

---

## 20. Referenciák

1. Organic Maps: <https://organicmaps.app/>
2. GitHub repo: <https://github.com/organicmaps/organicmaps>
3. MWM formátum dokumentáció: <https://github.com/organicmaps/organicmaps/blob/master/docs/MAPS_FORMAT.md>
4. data_version.txt: <https://github.com/organicmaps/organicmaps/blob/master/data/data_version.txt>
5. Apache License 2.0: <https://www.apache.org/licenses/LICENSE-2.0>
6. OpenStreetMap, ODbL 1.0: <https://www.openstreetmap.org/copyright>
7. Geofabrik letöltő: <https://download.geofabrik.de/europe/hungary.html>
8. pyosmium: <https://osmcode.org/pyosmium/>
9. libosmium: <https://osmcode.org/libosmium/>
10. OSM Wiki — Bicycle: <https://wiki.openstreetmap.org/wiki/Bicycle>
11. OSM Wiki — Tag:route=bicycle: <https://wiki.openstreetmap.org/wiki/Tag:route%3Dbicycle>
12. EuroVelo: <https://en.eurovelo.com/>
13. Tegola: <https://tegola.io/>
14. PostGIS: <https://postgis.net/>
15. MapLibre GL JS: <https://maplibre.org/maplibre-gl-js/docs/>
16. GitHub API — releases: <https://docs.github.com/en/rest/releases/releases>
17. omim-tools (generator_tool): a `github.com/organicmaps/organicmaps/tree/master/generator` mappában
18. Maps.me örökség (történelmi): <https://github.com/mapsme/omim>
19. Robots Exclusion Protocol (RFC 9309): <https://datatracker.ietf.org/doc/html/rfc9309>
20. ODbL FAQ: <https://wiki.openstreetmap.org/wiki/Open_Database_License/Use_Cases>

> Verzió: 1.0.0 — Készült a Panellako adatplatform számára. Organic Maps szoftver Apache License 2.0; OSM adatok ODbL 1.0. A `.mwm` letöltés audit célból; az alap adatforrás a Geofabrik HU `.osm.pbf`, amelyet `pyosmium` segítségével parszolunk a `organicmaps.bike_*` táblákba.
