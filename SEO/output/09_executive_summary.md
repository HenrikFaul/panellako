# PanelLakó SEO Audit — Összefoglaló (2026. május 23.)

## Összefoglaló

A panellako.hu egy szilárd alapokra épített, jól strukturált tartalomarchitektúrával rendelkezik: minden nyilvános oldal tartalmaz metaadatot, H1 elemet és strukturált adatot (JSON-LD), a pilléres tartalomstratégia tudatosan épül (7 pillér, ~50 oldal), és a helyi magyar piacon nem létezik egyetlen versenytárs sem, amely az épületkezelési szoftvert az épületkörnyezeti adatokkal (levegőminőség, zaj, klímakockázat, közlekedés) kombinálná. A legnagyobb gyengeségek: (1) hiányoznak az OG képek (mind a 49 oldal social megosztásai megtörnek), (2) az E-E-A-T jelzések kritikusan alulfejlettek (névtelen szerzők, üres sameAs tömbök, nem igazolható marketing számok), (3) a tartalom volumene a Zajszennyezés, Klímakockázat és Tömegközlekedés pillérekben gyenge (2-3 cikk pillérenkénti, szükséges 5-6 helyett), és (4) hiányoznak a legmagasabb konverziós intenzitású BOFU oldalak: /ingyenes-proba, /funkciok/konyveloknek, és a közvetlen versenytársi összehasonlítók.

---

## Kritikus problémák megoldva (v0.9.19-v0.9.20, már commitolva)

- **PILLAR_ARTICLES broken hrefs** — a /zold-tarsashaz 3 törött belső linkje javítva
- **CLUSTER_ARTICLES duplikáció** — a felesleges duplikált szekció eltávolítva
- **robots.ts** — /auth/ és /monitoring tiltólistára kerültek (crawl budget védelem)
- **maximumScale:1** — eltávolítva a viewport konfigból (akadálymentesség + mobil UX jelzés)
- **Globális canonical fallback** — eltávolítva a root layout.tsx-ből (duplicate content kockázat megszüntetve)
- **Relative canonicals** — /, /arak, /gyik abszolút URL-ekre váltva
- **BreadcrumbList** — hozzáadva a /elemzes/budapest-kozlekedes oldalhoz
- **WebSite schema + SearchAction** — hozzáadva a layout.tsx-hez (sitelinks search box eligibility)
- **@id** — hozzáadva a SoftwareApplication és Organization sémákhoz (Knowledge Graph linking)
- **27 Article schema** — datePublished, dateModified, author mezők hozzáadva (rich-result eligibility visszaállítva)
- **HowTo schema** — hozzáadva a /kozgyules-osszehivasa oldalhoz (8 lépéses folyamat)

---

## Legfontosabb nyitott tennivalók (Top 10, prioritás szerint)

1. **[ACT-012] OG képek létrehozása** — `og-image.png` (1200×630px) és `og-elemzes-kozlekedes.png` elhelyezése a `/public/` mappában. Jelenleg minden social megosztás megtört képet ad vissza. *P0, S, Engineering.*

2. **[ACT-024] Szerzői attribúció hozzáadása mind a 27 Article-sémás oldalhoz** — YMYL tartalmak (tarsashazi-jog/*) esetén kötelező. Legalább generikus "Szerkesztette: PanelLakó szerkesztőség" byline + linkelés a /rolunk oldalra, a jogi cikkeknél jogi szakértő lektor megnevezése. *P0, M, Content.*

3. **[ACT-033] /ingyenes-proba landing oldal létrehozása** — a legjobb konverziós intenzitású kulcsszavakra ("ingyenes társasházi szoftver", "közös képviselő program ingyenes próba") nincs dedikált oldal. A verseny közel nulla. *P0, M, Engineering+Content.*

4. **[ACT-034] /funkciok/konyveloknek oldal létrehozása** — a könyvelő persona szorzótényezője: 1 könyvelő = 10-50 épület. A "társasházi könyvelő szoftver" és "kettős könyvelés program" kulcsszavakra nincs tartalom. *P0, M, Content.*

5. **[ACT-036+ACT-035] Versenytársi differenciálás és összehasonlító oldalak** — az eHÁZ (~13 000 épület) az egyetlen közvetlen versenytárs érdemleges SEO jelenléttel. A legfontosabb taktika: az összes termékoldalon (főoldal, /funkciok) a környezeti adat szög előtérbe helyezése, amit az eHÁZ teljesen mellőz. Középtávon: /osszehasonlitas/panellako-vs-ehaz oldal. *P0, L, Content.*

6. **[ACT-037] Közös képviselő feladatai — átfogó útmutató (1500-2000 szó)** — a WHM Cloud jelenleg rankol erre a kifejezésre. 40 szavas definíció-blokk (featured snippet célpont) + FAQPage schema az 5 leggyakoribb PAA kérdéssel. *P0, M, Content.*

7. **[ACT-038] Levegőminőség Budapest — TOFU tartalom befektetés** — egyetlen versenytárs sem ingatlankezelési platform/szoftver ebben a SERP-ben. A panellako.hu adatállománya egyedülálló. Két eszköz: interaktív /elemzes/budapest-levegominoseg adatoldal + 2000 szavas hub cikk kerületenkénti összehasonlítással. *P0, L, Content+Engineering.*

8. **[ACT-039+ACT-045] Hiányzó pillérek: Épületfelújítás/Pályázatok + Társasházi Biztosítás** — az "Otthon Felújítási Program", "panel felújítás pályázat" kulcsszavak keresési volumene magas; a biztosítás jogi kötelezettség (2003. évi CXXXIII. tv.), tehát a keresési igény garantált. *P0, S-L, Content.*

9. **[ACT-013] Cím-tagek rövidítése 35+ oldalon** — a /tarsashazi-jog/szomszed-jog-tarsashazban 99 karakteres, a /tarsashaz-kezeles 79 karakteres, a /zold-tarsashaz 87 karakteres. Minden Google-es SERP csonkol, a CTR csökken. *P1, M, SEO.*

10. **[ACT-046] FAQPage schema hozzáadása mind a 6 pilléroldalhoz** — a pilléroldalak egyikén sem szerepel FAQPage JSON-LD. Ez a leggyorsabb rich-result és CTR-növelő taktika az összes pilléren egyszerre. *P1, M, Engineering+SEO.*

---

## Versenykörnyezet

**Elsődleges versenytárs: eHÁZ**
Az eHÁZ a piacvezető (~13 000 épület, Forbes TOP Cloud 50, FINTECH Awards PropTech Innovation, 2025-ben AI asszisztens). Kizárólag adminisztrációs/könyvelési funkciókra pozícionálta magát — semmiféle környezeti adat, levegőminőség, zöldterület, közlekedési score szempont nincs a kommunikációjában. Ez a panellako.hu legjobb differenciálási ablaka.

**Tartalmi versenytárs: WHM Cloud**
A WHM Cloud rendszeresen publikál oktatási blogcikkeket (közös képviselő, közgyűlés, közös költség), és rankol egyes információs kulcsszavakra. A SEO tartalomtermelési rés kb. 6-12 hónapos ablakot hagy.

**Aggregátor: szoftver.tarsashazaink.hu**
Comparison page-jük már rankol a vásárlói összehasonlítási lekérdezésekre — a panellako.hu-nak saját összehasonlító oldalra van szüksége.

**Niche content site: legszennyezes.hu**
Levegőminőségi tartalmakat publikál, de sem szoftvere, sem épületkezelési szöge nincs — közvetlen partner- vagy linkcsereparner jelölt lehet.

**Kulcs insight:** a Hungarian SERP egyetlen szoftver-versenytársa sem rendelkezik releváns tartalmakkal a környezeti adatok (levegőminőség, zaj, klíma, közlekedés) terén. Ez egy valóban nyitott TOFU moat, amelyet ma még senki nem foglal el.

---

## Várható SEO hatás (ha a Top 10 implementálásra kerül)

| Cél | Jelenlegi állapot | Várható változás (3-6 hónap) |
|-----|------------------|------------------------------|
| Social CTR (OG kép) | ~0% (megtört kép) | Normalizálódik; iparági átlag 2-5% |
| Article rich result eligibility | 0/27 oldal | 27/27 oldal (datePublished + author megvan) |
| Featured snippet célpontok | 0 | 5-10 jelölt oldal (definíció-blokkok) |
| Ingyenes próba konverzió | Nincs dedikált landing | +20-40% konverziónövekedés várható dedikált oldalon |
| Könyvelő persona elérés | Nulla | Új, szorzóeffektusú szegmens megnyitása |
| Pilléroldalak FAQPage rich results | 0/6 pillér | 6/6 pillér eligible |
| Topical authority score (zajszennyezés/klíma) | Gyenge (2-3 cikk) | Közepes-erős (5-6 cikk) |
| LLM/AI Overview citálhatóság | Alacsony (üres sameAs, névtelen szerzők) | Közepes-magas E-E-A-T jelzések után |

---

## Metrikák és mérési terv

**Google Search Console (heti)**
- Átlagos pozíció: target kucsszavak (társasházi kezelő szoftver, közös képviselő feladatai, levegőminőség Budapest)
- CTR változás pilléroldalakra OG képek után
- Rich result impressziók (Article, FAQPage, HowTo, BreadcrumbList)
- Index fedettség (új pilléroldalak és cluster cikkek felvétele)

**Analytics (havi)**
- Organic traffic by landing page — content cluster vs. product pages
- Trial signup conversion rate by traffic source (organic vs. paid vs. direct)
- /gyik oldalon eltöltött idő + exit rate (LLM-extractability proxy)

**Rank tracking (heti)**
- Pozíció 1-10 monitoring: "társasházi kezelő szoftver", "közös képviselő feladatai", "levegőminőség Budapest kerületek", "napelem társasházban"
- Competitor tracking: eHÁZ, WHM Cloud, OnlineHáz, whmcloud.hu/hirek kulcsszó átfedése

**E-E-A-T jelzők (negyedéves)**
- G2/Capterra review count
- Inbound links darabszáma és DA (Ahrefs/Semrush)
- Branded search volume trend (Google Trends "panellako" HU)
- sameAs cross-platform entitás hivatkozások száma
