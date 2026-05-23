# PanelLakó SEO Implementation Roadmap
**Sprint tervek: 2026. május 23. – 2026. szeptember 30.**

---

## Áttekintés

A v0.9.19–v0.9.20 commitokkal az összes P0 technikai javítás teljesült. A roadmap a következő 4 sprintre (8 hét aktív munka + 4 hét tartalomprodukcióval) az alábbi három növekedési vektorra fókuszál:

1. **Technikai stabilitás** — OG képek, E-E-A-T, schema konszolidáció
2. **Conversion uplift** — hiányzó BOFU oldalak (ingyenes próba, könyvelő persona, versenytársi összehasonlítók)
3. **Topical authority expansion** — hiányzó pillérek, cluster cikkek, FAQPage coverage

---

## Sprint 1 — Azonnali gyorsjavítások (2026. május 26. – június 6.)
**Fókusz: P0 unblocked items, < L effort, no dependencies**

| Ticket | Cím | Owner | Effort | Várható kimenet |
|--------|-----|-------|--------|-----------------|
| ACT-012 | OG képek létrehozása (`og-image.png`, `og-elemzes-kozlekedes.png`) | Engineering | S | Minden social megosztás megtörten jelenik meg → normalizálódik; social CTR helyreáll |
| ACT-014 | /arak pricing schema javítása — price:'0' eltávolítása paid tierekről | Engineering | XS | Google schema policy kockázat megszűnik |
| ACT-015 | Homepage FAQPage schema csökkentése 2-3 kérdésre (/gyik örökli a teljes listát) | SEO | XS | FAQPage rich result jel konszolidálódik a dedikált oldalra |
| ACT-020 | Homepage H1 átírása — 'Társasházkezelő szoftver' front-load | Content | XS | Primary keyword weight növekedés az algoritmusban; várható pozíciójavulás 2-4 hét alatt |
| ACT-021 | /funkciok meta description újraírása (125ch → 155ch, keyword-rich) | Content | XS | SERP snippet CTR javulás a feature hub oldalon |
| ACT-023 | /funkciok belső linkek hozzáadása a tartalmi pillérekhez | Engineering | XS | Bi-directional PageRank flow helyreáll a hub-and-spoke modellben |
| ACT-028 | sameAs tömbök feltöltése LinkedIn + GitHub URL-lel | Engineering | XS | Knowledge Graph entity disambiguation bekapcsol |
| ACT-029 | /kapcsolat telefonszám vagy Calendly link hozzáadása | Content | XS | Trust signal + ContactPoint schema kiegészül |
| ACT-030 | Homepage 'Röviden a PanelLakóról' paragrafus hozzáadása | Content | XS | LLM/AI Overview extractability javul; featured snippet jelölt |
| ACT-051 | ESLint `@next/next/no-img-element` rule bekapcsolása | Engineering | XS | Jövőbeli raster képek kötelezően next/image-gel kerülnek be |
| ACT-053 | eslint-config-next verzió igazítása 14.2.30-ra | Engineering | XS | Build warning megszüntetése |
| ACT-054 | CSP connect-src `https://eu.posthog.com` hozzáadása | Engineering | XS | PostHog feature flags silent failure megszüntetése |

**Sprint 1 összesítő:** 12 ticket, 10×XS + 1×S = 1-2 fejlesztői nap Engineering + 0.5 nap Content

---

## Sprint 2 — Legnagyobb traffic-hatású P0+P1 elemek (2026. június 9. – június 20.)
**Fókusz: BOFU oldalak, E-E-A-T alapok, schema konszolidáció, cím-tagek**

| Ticket | Cím | Owner | Effort | Várható kimenet |
|--------|-----|-------|--------|-----------------|
| ACT-024 | Szerzői attribúció mind a 27 Article-sémás oldalhoz (byline + /rolunk link) | Content | M | YMYL E-E-A-T gap megszűnik; Article rich result jel megerősödik |
| ACT-025 | Trust statistics — citation footnote vagy testimonials hozzáadása | Content | S | Google quality rater és LLM hitelesség javul |
| ACT-026 | /rolunk — 2-3 névvel ellátott csapattag + Person schema | Content | S | E-E-A-T about page signal; LLM entitás felismerés javul |
| ACT-033 | /ingyenes-proba landing oldal létrehozása (conversion-only layout) | Engineering+Content | M | Legmagasabb konverziós intenzitású kulcsszó lefedve; várható trial signup +20-40% |
| ACT-034 | /funkciok/konyveloknek oldal létrehozása | Content | M | Szorzó persona (1 könyvelő = 10-50 épület) elérve; "társasházi könyvelő szoftver" lefedve |
| ACT-013 | Cím-tagek rövidítése a 35+ túlhosszú oldalon | SEO | M | SERP megjelenítési truncation megszűnik; CTR javulás 4-6 hét alatt |
| ACT-046 | FAQPage schema hozzáadása mind a 6 pilléroldalhoz (3-5 Q&A/oldal) | Engineering+SEO | M | 6 pilléroldalon rich result eligible lesz; várható CTR +15-25% |
| ACT-057 | Organization schema duplikáció konszolidálása (layout.tsx vs. rolunk) | Engineering | S | Knowledge Graph entity disambiguation tisztul |
| ACT-058 | FAQPage schema hozzáadása /arak oldalhoz (meglévő payment FAQ szekció) | Engineering | S | Pricing page rich result eligible; konverziós oldal SERP snippet javul |
| ACT-059 | /tarsashaz-kezeles CollectionPage schema hozzáadása | Engineering | S | Hub-cluster schema hierarchy helyes lesz |
| ACT-016 | Sitemap lastModified dátumok — per-page tartalmi dátumokra váltás | Engineering | M | Googlebot crawl prioritizálás informatívvá válik; fresh content signal |
| ACT-018 | SoftwareApplication schema scope korlátozása csak termékoldalakra | Engineering | S | Editorial content oldalak Article-ként értelmezhetők lesznek |

**Sprint 2 összesítő:** 12 ticket, ~4-5 fejlesztői nap Engineering + 3-4 nap Content

---

## Sprint 3 — Content production sprint (2026. június 23. – július 4.)
**Fókusz: új cikkek a meglévő pillérekhez, BOFU konverziós szögek, topical authority**

### Kötelező alapcikkek (existing pillar expansion)

| Ticket | URL cél | Owner | Effort | Kulcsszó fókusz |
|--------|---------|-------|--------|-----------------|
| ACT-037 | `/tarsashaz-kezeles/kozos-kepviselo-feladatai` átírás 1500-2000w-ra | Content | M | "közös képviselő feladatai" — WHM Cloud rankolja jelenleg; featured snippet célpont |
| ACT-050 | `/tarsashaz-kezeles/kozos-koltseg-nyilvantartas` bővítése 1200w-ra | Content | M | "közös költség nyilvántartás" — Novitax HÁZAK jelenleg rankol szoftverrel |
| ACT-048 | `/tarsashaz-kezeles/online-kozgyules-jogszabalyok` (új cikk) | Content | S | "hogyan jogilag érvényes az online közgyűlés" — ekozgyules.com nem fedezi |
| ACT-049 | Közgyűlési meghívó sablon letöltés lead magnet hozzáadása | Content | S | Email capture; link magnet egyedi versenyelőny |
| ACT-045 | `/tarsashaz-kezeles/tarsashazi-biztositas` (új cluster cikk) | Content | S | "társasházi biztosítás" — jogi kötelezettség, garantált keresési igény |
| ACT-056 | `/zold-tarsashaz/napelem-tarsashazban` bővítése 1500w-ra + FAQPage | Content | M | "napelem társasházban 2025" — 2025 szeptembertől kötelező hálózati befogadás |

### Zajszennyezés pillér bővítése

| Ticket | URL cél | Owner | Effort | Kulcsszó fókusz |
|--------|---------|-------|--------|-----------------|
| ACT-040a | `/zajszennyezes-budapest/ejszakai-zaj-belvaros` | Content | M | "éjszakai zaj szabályok Budapest" |
| ACT-040b | `/zajszennyezes-budapest/repuloteri-zaj-budapest` | Content | M | "repülőtéri zaj XVI XVII kerület" |
| ACT-040c | `/zajszennyezes-budapest/zajmeres-modszerek` | Content | M | "zajmérés hogyan" "dB(A) mérés" |

### Társasházi Jog pillér bővítése

| Ticket | URL cél | Owner | Effort | Kulcsszó fókusz |
|--------|---------|-------|--------|-----------------|
| ACT-043a | `/tarsashazi-jog/alberlet-tarsashazban` | Content | M | "albérlet szabályai társasházban" |
| ACT-043b | `/tarsashazi-jog/orokles-tulajdonosvaltas` | Content | M | "öröklés társasházi lakás" |

### Levegőminőség pillér bővítése

| Ticket | URL cél | Owner | Effort | Kulcsszó fókusz |
|--------|---------|-------|--------|-----------------|
| ACT-042a | `/levegominoseg-budapest/legtisztito-valasztas-panellakasba` | Content | M | "legjobb légtisztító panel lakásba" |
| ACT-042b | `/levegominoseg-budapest/futesi-szezon-levegominoseg` | Content | M | "fűtési szezon levegőminőség PM2.5" |

### /gyik bővítése

| Ticket | URL cél | Owner | Effort | Kulcsszó fókusz |
|--------|---------|-------|--------|-----------------|
| ACT-060 | `/gyik` — 20+ FAQ bővítés | Content | M | LLM extractability; árak, funkciók, adatbiztonság, könyvelés |

**Sprint 3 összesítő:** ~14 content ticket, elsősorban Content owner, 12-15 nap tartalomprodukcióval + 1-2 nap Engineering (schema és CTA implementálás)

---

## Sprint 4 — Stratégiai / hosszú futamidejű fejlesztések (2026. július 7. – szeptember 30.)
**Fókusz: új pillérek, TOFU szintézis, versenytársi összehasonlítók, E-E-A-T mélység**

### Új pillérek és TOFU oldalak

| Ticket | Cím | Owner | Effort | Megjegyzés |
|--------|-----|-------|--------|------------|
| ACT-039 | `/finanszirozas-palyazatok` új pillér (4 cluster cikk: OFP 2024-25, EU kohéziós, Zöldhitel, METÁR) | Content | L | TOFU/MOFU mix; "panel felújítás pályázat" high-intent |
| ACT-038 | `/elemzes/budapest-levegominoseg` interaktív adatoldal | Engineering | L | Real-time vagy rendszeresen frissített AQI kerületenként; Dataset + Article schema |
| ACT-047 | `/budapest-keruletek-eletminoseg-osszehasonlitas` szintézis cikk | Content | L | Levegőminőség + zaj + közlekedés + hőszigetek kombináció — egyedülálló |

### Versenytársi összehasonlítók

| Ticket | Cím | Owner | Effort | Megjegyzés |
|--------|-----|-------|--------|------------|
| ACT-022 | `/osszehasonlitas` page rework — cím és tartalom bővítés general comparison intent-re | Content | S | Jelenlegi oldal létezik; framing finomítás |
| ACT-035a | `/osszehasonlitas/panellako-vs-ehaz` | Content | L | Legmagasabb konverziós intenzitású összehasonlító — eHÁZ az elsődleges konkurens |
| ACT-035b | `/osszehasonlitas/panellako-vs-onlinehaz` | Content | M | OnlineHáz "1 éves ingyenes" vs PanelLakó — pricing page kiegészítés |

### Klímakockázat pillér bővítése

| Ticket | URL cél | Owner | Effort | Kulcsszó fókusz |
|--------|---------|-------|--------|-----------------|
| ACT-041a | `/klimakockazat-epuleteknel/futesi-rendszer-korszenitese` | Content | M | "gáz vs hőszivattyú vs távfűtés társasházban" |
| ACT-041b | `/klimakockazat-epuleteknel/legkondi-panel-tarsashazban` | Content | M | "légkondicionálás szabályozás társasházban" |

### Tömegközlekedés pillér bővítése

| Ticket | URL cél | Owner | Effort | Kulcsszó fókusz |
|--------|---------|-------|--------|-----------------|
| ACT-044a | `/tomegkozlekedes-elemzes/kerekpar-infrastruktura-budapest` | Content | M | "BuBi rendszer kerületek" |
| ACT-044b | `/tomegkozlekedes-elemzes/park-and-ride-budapest` | Content | M | "P+R parkolók Budapest" |

### E-E-A-T és infrastrukturális fejlesztések

| Ticket | Cím | Owner | Effort | Megjegyzés |
|--------|-----|-------|--------|------------|
| ACT-027 | G2/Capterra profil igénylés + press outreach (Portfolio.hu, G7.hu) | Content+SEO | L | Domain-independent mentions az E-E-A-T-hez; hosszú futamidő |
| ACT-017 | Homepage auth redirect áthelyezése middleware.ts-be | Engineering | S | TTFB javulás anoním látogatóknak (Googlebot) |
| ACT-019 | next-pwa @ducanh2912/next-pwa migrálás vagy custom service worker | Engineering | M | Karbantarthatóság + bundle overhead csökkentés |
| ACT-052 | Middleware Supabase subscription check cachingje Vercel KV-ban | Engineering | M | Authenticated route TTFB javulás |
| ACT-031 | `/adatforrasok` FAQPage schema + metodológia kiegészítés | Content | S | LLM credibility signal; adatforrás-átláthatóság |

**Sprint 4 összesítő:** 16 ticket, vegyes Engineering/Content/SEO owner, ~20-25 nap összesítve

---

## Összesítő ütemterv

```
Sprint 1  │ Azonnali fixes (2 hét)  │ 12 ticket │ ~2 nap Eng + 0.5 nap Content
Sprint 2  │ BOFU + schema (2 hét)   │ 12 ticket │ ~5 nap Eng + 4 nap Content
Sprint 3  │ Content production (2h) │ 14 ticket │ ~15 nap Content + 2 nap Eng
Sprint 4  │ Strategic (8+ hét)      │ 16 ticket │ ~25 nap vegyes
```

### Kritikus sorrend (nem lehet megcserélni)
- ACT-012 (OG kép) → minden social push előtt kell
- ACT-024 (szerzői attribúció) → ACT-010 (datePublished, már DONE) után jön
- ACT-033 (ingyenes próba oldal) → marketing kampányok indítása előtt kell
- ACT-035 (versenytársi összehasonlítók) → ACT-026 (named team, /rolunk) után javasolt
- ACT-038 (levegőminőség interaktív oldal) → ACT-046 (FAQPage pilléroldalak) előtt ne priorizáljuk

### Versenytársi időablakok
- **WHM Cloud** — ~6-12 hónap SEO gap ablak a tartalomprodukcióra; ha a Sprint 3 tartalmak nem kerülnek ki 2026 Q3-ig, a WHM Cloud utolér
- **eHÁZ AI asszisztens** — az AI differenciálás már piacon van; a panellako.hu egyedi versenyelőnye a környezeti adat maradt, azt kell maximálisan exploitálni (ACT-038, ACT-047)
- **2025 szeptemberi napelemes törvény** — a /napelem-tarsashazban tartalom sürgős; a keresési kereslet már most növekszik (ACT-056)
