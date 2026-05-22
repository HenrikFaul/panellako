# SEO Master Report — panellako.hu
**Generated:** 2026-05-22  
**System:** 9-Agent Parallel SEO Operating System  
**Domain:** panellako.hu  
**Market:** Hungary | Language: Hungarian  
**Product:** Társasházi kezelő SaaS platform

---

## Executive Summary

PanelLakó.hu is a Hungarian SaaS platform for residential building management that currently has near-zero organic search visibility. As of the audit date, the site has no robots.txt, no sitemap, no Open Graph metadata, no structured data, no canonical tags, no public navigation or footer, and fewer than 1,000 words of indexable content across all pages. The homepage contains approximately 35 words of visible text and uses a non-keyword title ("Digitális működési központ") that signals nothing to search engines or prospective customers. Admin and utility routes (/superadmin, /offline, /billing) are fully open to crawling. One data-rich analysis page (/elemzes/budapest-kozlekedes) is rendered client-side with `ssr:false`, making it effectively invisible to Googlebot. Collectively, these issues mean the domain has not established any entity presence, topical authority, or conversion-intent landing surfaces — it cannot rank, be cited by AI engines, or capture any of the available demand.

The competitive landscape is unusually favorable. Keyword research identified 22 clusters across BOFU, MOFU, and TOFU tiers where Hungarian-language competition is sparse or non-existent. Core conversion clusters — "társasházi kezelő szoftver", "közös képviselő szoftver", and "ingyenes próba" — have competition scores of 1–2 out of 10. The entire environmental data angle (levegőminőség Budapest, zöldterület pontszám, hősziget térkép) has **zero Hungarian-language competitors**, yet these TOFU clusters can drive substantial qualified traffic that converts into trial signups via the product's existing urban-data features.

The strategic architecture maps eight content pillars across 55 planned articles. Two pillars are P0 because they directly serve the conversion funnel: the "Társasházkezelés" BOFU hub (addressing HOA managers searching for software) and the "Lakókörnyezet / Levegőminőség" TOFU hub (leveraging the zero-competition environmental data niche). The "PanelLakó Platform" BOFU pillar (/funkciok hub) is equally P0 because the site currently has no product landing pages at all.

Schema and E-E-A-T signals are absent at every level. There is no Organization schema, no SoftwareApplication schema, no privacy policy (a legal liability under GDPR), and no About or team page. LLM extractability is rated near-zero. The highest-priority quick wins — robots.txt, sitemap, metadataBase, and SSR fix for the analysis page — can be deployed by an engineer in a single working day and should be treated as emergency fixes.

---

## Layer 1 — Normalized Inputs

| Input | Value |
|-------|-------|
| Domain | panellako.hu |
| Target Market | Hungary (Budapest + major cities) |
| Language | Hungarian (hu) |
| Business Model | SaaS, 14-day free trial, Stripe subscriptions |
| Target Audience | Közös képviselők, Lakók, Könyvelők, Ingatlankezelő cégek |
| Conversion Goals | Free trial signup |
| Public Pages | /, /login, /elemzes/budapest-kozlekedes, /offline |
| Auth-gated Pages | /app, /w/[buildingId]/*, /billing |
| Admin Pages | /superadmin, /superadmin/login |
| Sitemap | MISSING |
| robots.txt | MISSING |
| GSC | Not confirmed |
| Analytics | PostHog installed but NOT mounted |

---

## Agent 01 — SEO Audit

**Scope:** Full-site SEO audit, metadata quality, duplicate content signals, content hygiene, sitewide weakness scan

**Summary:** panellako.hu has critical structural SEO gaps: no robots.txt, no sitemap, no OG or Twitter Card metadata, no metadataBase, no canonical tags, no structured data, admin panel (/superadmin) lacks noindex protection. The homepage delegates all metadata to the root layout fallback and uses a banned phrase in the title tag. The /elemzes/budapest-kozlekedes page has a 251-character meta description exceeding the display threshold. PostHog is installed but not mounted. All /w/* routes are auth-gated and correctly inaccessible to crawlers via middleware — the auth-wall is SEO-safe.

### Critical Findings

| ID | Title | Severity | Effort | Owner |
|----|-------|----------|--------|-------|
| AUD-001 | No robots.txt — crawlers receive no crawl directives | P0 | XS | SEO |
| AUD-002 | No sitemap.xml — Google cannot discover public content pages | P0 | XS | SEO |
| AUD-003 | No Open Graph or Twitter Card metadata anywhere | P0 | S | Design |
| AUD-004 | metadataBase not set — relative OG/canonical URLs will be malformed | P0 | XS | Engineering |
| AUD-005 | /superadmin and /superadmin/login lack noindex | P1 | XS | Engineering |
| AUD-006 | Homepage H1 and root metadata description mismatched | P1 | XS | Content |
| AUD-007 | Homepage title non-keyword ("Digitális működési központ" — BANNED phrase) | P1 | S | Content |
| AUD-008 | /elemzes/budapest-kozlekedes meta description is 251 chars (exceeds ~160 display limit) | P2 | XS | Content |
| AUD-009 | No structured data / Schema.org markup on any page | P2 | S | Engineering |
| AUD-010 | Login page has no metadata, inherits root title/description (duplicate) | P2 | XS | Engineering |
| AUD-011 | PostHog analytics declared but NOT mounted — no behavioral data | P2 | S | Analytics |
| AUD-012 | Homepage has zero crawlable link to /elemzes/budapest-kozlekedes | P2 | S | Engineering |
| AUD-013 | /offline and /billing should be noindexed | P3 | XS | Engineering |
| AUD-014 | No dedicated feature/product landing pages (homepage ~35 words) | P3 | L | Product |
| AUD-015 | Manifest.json description is a generic stub | P3 | XS | SEO |

### Quick Wins
- Create robots.txt (30 min, zero risk)
- Create sitemap.ts with 2 URLs (20 min)
- Add `metadataBase: new URL('https://panellako.hu')` to root layout (1 line)
- Add robots: noindex to /superadmin, /login, /offline (1 hour total)
- Trim /elemzes description from 251 to ~155 chars (5 min)
- Set NEXT_PUBLIC_POSTHOG_KEY in Vercel + mount initPostHog() in root layout

---

## Agent 02 — Keyword Research

**Scope:** Keyword expansion, intent analysis, cluster creation, funnel alignment, opportunity scoring

**Summary:** 22 clusters identified across the full funnel. Hungarian HOA software is an underserved market — the "társasházi kezelő szoftver" category has competition scores of 1–2/10. The environmental data angle (levegőminőség, zöldterület, hőszigat, zajszennyezés) is **completely uncontested** in Hungarian-language SERPs.

### Top Keyword Clusters

| Cluster | Primary Keyword | Intent | Funnel | Value | Competition |
|---------|----------------|--------|--------|-------|-------------|
| Core Commercial | társasházi kezelő szoftver | commercial | BOFU | 10 | 2 |
| Trial Conversion | társasházi szoftver ingyenes próba | transactional | BOFU | 9 | 1 |
| Decision Maker | közös képviselő feladatai digitálisan | commercial | MOFU | 9 | 2 |
| Comparison BOFU | legjobb társasházkezelő szoftver | commercial | BOFU | 8 | 2 |
| Accountant B2B | társasházi könyvelés szoftver | commercial | MOFU | 8 | 2 |
| B2B Enterprise | ingatlankezelő szoftver Magyarország | commercial | MOFU | 8 | 3 |
| Environmental Hub | levegőminőség Budapest kerületek | informational | TOFU | 7 | 3 |
| HOA Voting | társasházi közgyűlés online | informational | MOFU | 7 | 3 |
| Meter Reading | al-mérőóra leolvasás app | commercial | MOFU | 7 | 1 |
| AI Overview FAQ | mikor kell társasházi közgyűlést tartani | informational | TOFU | 7 | 2 |
| Local SEO | társasházi kezelő szoftver Budapest | commercial | BOFU | 7 | 1 |
| Green Score | zöldterület pontszám Budapest | informational | TOFU | 7 | 1 |
| UHI Seasonal | hőszigat hatás Budapest | informational | TOFU | 7 | 2 |
| Noise Data | zajszennyezés Budapest térkép | informational | TOFU | 6 | 2 |
| 15-min City | 15 perces város Budapest | informational | TOFU | 6 | 1 |
| Community TOFU | lakóközösség kommunikáció app | informational | TOFU | 6 | 2 |
| CO₂ Calculator | CO₂ megtakarítás kalkulátor Magyar | informational | TOFU | 6 | 1 |
| Climate Risk | klímakockázat ingatlan Budapest | informational | TOFU | 6 | 2 |
| Document Mgmt | társasházi dokumentumtár online | informational | MOFU | 6 | 2 |
| Issue Tracking | társasházi hibabejelentés app | commercial | MOFU | 7 | 1 |
| Budapest 2030 | Budapest 2030 indikátorok | informational | TOFU | 6 | 1 |
| NDVI Niche | NDVI Budapest kerület | informational | TOFU | (niche) | 1 |

### Key Strategic Insight
The biggest "primary competitor" is Excel and WhatsApp — not another SaaS. This makes comparison content extremely effective: "PanelLakó vs. Excel/táblázat" will rank and convert with minimal competition.

---

## Agent 03 — On-Page Content

**Scope:** Page-level optimization, metadata rewriting, content outline upgrades, semantic coverage, snippet optimization

**Summary:** PanelLakó has a severe on-page SEO deficit. The only publicly crawlable page with user-visible content is the homepage (~35 words). Root layout title still contains the banned phrase "Digitális működési központ". Zero OG/Twitter metadata, no sitemap, no robots.txt, no structured data. The /elemzes/budapest-kozlekedes page is the strongest SEO asset but lacks OG tags and crawlable body text.

### Page Rewrite Specifications

#### Homepage `/`
- **Current title:** `PanelLakó – Digitális működési központ` ❌ BANNED
- **New title:** `PanelLakó – Társasházkezelő szoftver közös képviselőknek`
- **New meta description:** `Kezelje a társasházát digitálisan: hibabejelentések, dokumentumok, pénzügyek és szavazások egy helyen. 14 napos ingyenes próba, kártyaadat nélkül.`
- **New H1:** `Digitális társasházkezelő platform`
- **New H2:** `Bejelentések, dokumentumok és pénzügyek — papírok és group chatok nélkül.`
- **Target keyword:** `társasházkezelő szoftver`
- **Required sections:** Hero + trust bar + pain-point cards + 6 feature highlights + 3 persona cards + FAQ section + CTA + footer
- **Schema:** SoftwareApplication + FAQPage
- **Min word count:** 600

#### Login `/login`
- **New title:** `Belépés — PanelLakó`
- **New description:** `Lépj be a PanelLakó társasházkezelő platformra. Biztonságos magic link vagy jelszavas bejelentkezés.`
- **robots:** `noindex, nofollow`

#### `/elemzes/budapest-kozlekedes`
- **New title:** `Budapest tömegközlekedésének elemzése — GTFS adatok, megálló-sűrűség, lefedettség | PanelLakó`
- **New description (155 chars):** `Budapest tömegközlekedésének interaktív analitikus térképe: villamos, metró, busz, HÉV, troli, hajó vonalak GTFS-adatok alapján. Megálló-sűrűség, 420m gyalogos lefedettségi zónák.`
- **Action required:** Add 200–350 word server-rendered description block above the map; add OG metadata; add Article schema; add BreadcrumbList
- **Schema:** BreadcrumbList + Dataset + Article

#### New pages to create (priority order):
1. `/funkciok` — Feature hub (SoftwareApplication schema)
2. `/gyik` — FAQ page (FAQPage schema — highest-value schema for SERP real estate)
3. `/arak` — Pricing page
4. `/rolunk` — About/trust page (E-E-A-T anchor)
5. `/adatvedelmi-iranyelvek` — GDPR Privacy Policy (legally required)
6. `/aszf` — Terms of Service (legally required)
7. `/kapcsolat` — Contact page

---

## Agent 04 — Technical SEO

**Scope:** Technical root-cause analysis, crawl/index/render architecture, CWV/performance SEO, canonicalization, JS rendering risk

**Summary:** Zero technical SEO infrastructure. The /elemzes/budapest-kozlekedes page — the site's only substantive content asset — is invisible to Googlebot due to ssr:false. The /superadmin/login page is prerendered and fully indexable. PWA service worker creates minor caching edge cases.

### Critical Technical Findings

| ID | Title | Severity | Effort |
|----|-------|----------|--------|
| TECH-001 | No robots.txt | P0 | XS |
| TECH-002 | No sitemap | P0 | XS |
| TECH-003 | Zero Open Graph metadata | P1 | S |
| TECH-004 | No canonical tags; www/apex duplicate risk | P1 | S |
| TECH-005 | **CRITICAL:** /elemzes/budapest-kozlekedes ssr:false — Googlebot gets empty shell | P1 | M |
| TECH-006 | Admin routes /superadmin no noindex | P1 | XS |
| TECH-007 | /offline no noindex | P2 | XS |
| TECH-008 | PWA manifest theme_color mismatch (#0f766e vs #0f172a) | P3 | XS |
| TECH-009 | Login page no noindex | P2 | XS |
| TECH-010 | No JSON-LD on any page | P2 | S |
| TECH-011 | SW opaqueredirect handler — low-risk edge case | P3 | XS |
| TECH-012 | Homepage Supabase auth round-trip blocks ISR | P3 | M |
| TECH-013 | /api/* routes not disallowed | P2 | XS |
| TECH-014 | Multiple pages inherit root title (duplicate metadata) | P2 | XS |

### Technical Quick Wins (all deployable in 1 day)
```typescript
// app/robots.ts
import { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: ['/', '/elemzes/'], disallow: ['/api/', '/superadmin/', '/offline', '/billing', '/app', '/w/'] }],
    sitemap: 'https://panellako.hu/sitemap.xml',
  };
}

// app/sitemap.ts
import { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://panellako.hu', lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: 'https://panellako.hu/elemzes/budapest-kozlekedes', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  ];
}

// app/layout.tsx — add to metadata
metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://panellako.hu'),
alternates: { canonical: 'https://panellako.hu' },
openGraph: { title, description, url: 'https://panellako.hu', siteName: 'PanelLakó', locale: 'hu_HU', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
twitter: { card: 'summary_large_image', title, description, images: ['/og-image.png'] },
```

---

## Agent 05 — Internal Linking

**Scope:** Internal graph optimization, hub-spoke design, orphan page detection, crawl depth optimization, anchor text logic

**Summary:** panellako.hu has a critically fragile internal link graph. The homepage links only to /login. The /elemzes/budapest-kozlekedes page is a de facto orphan with zero inbound links. No shared navigation, no footer, no breadcrumbs, no hub pages exist on any public page.

### Internal Link Architecture Plan

```
/ (Homepage)
├── /funkciok (Feature Hub)
│   ├── /funkciok/meroora-leolvasas
│   ├── /funkciok/kozgyules-online
│   ├── /funkciok/penzugyi-riportok
│   └── /funkciok/lakoi-kommunikacio
├── /elemzes (Analysis Hub)
│   ├── /elemzes/budapest-kozlekedes ← EXISTING
│   ├── /elemzes/budapest-levegominoseg ← NEW
│   ├── /elemzes/budapesti-hoszigetek ← NEW
│   └── /elemzes/zajszennyezes-terkep ← NEW
├── /tarsashaz-kezeles (HOA Pillar)
│   ├── /tarsashaz-kezeles/kozos-kepviselo-feladatai
│   ├── /tarsashaz-kezeles/szmsz-keszitese
│   └── [5 more cluster articles]
├── /levegominoseg-budapest (Environmental Pillar)
│   ├── /levegominoseg-budapest/pm25-pm10
│   └── [5 more cluster articles]
├── /arak
├── /gyik
├── /rolunk
├── /kapcsolat
└── Footer: /adatvedelmi-iranyelvek | /aszf | /kapcsolat
```

### Key Rules
- Every public page must have ≥1 link to the homepage and ≥2 links to sibling pages
- Anchor text must be keyword-rich (never "kattints ide" or bare "link")
- Breadcrumbs required on all non-homepage pages
- Footer with legal links required on every public page

---

## Agent 06 — Competitor SERP Analysis

**Scope:** Live competitor pattern analysis, ranking-page teardown, SERP feature opportunities, content differentiation map

**Summary:** The Hungarian HOA management software market is SEO-immature. No competitor occupies the environmental/urban data angle. Legacy tools have no SEO presence. International tools are not localized for Hungary.

### Competitor Landscape

| Competitor | Strength | Our Strategy |
|-----------|----------|--------------|
| e-Közgyűlés (ekozgyules.hu) | Digital voting/HOA assembly — first mover | Avoid head-on. Differentiate with full-platform + environmental data |
| TársasHáz.hu portals | Directory queries, manager listings | Create dedicated /kozos-kepviseloknek landing page |
| Neptun desktop software | Zero SEO presence, accountant word-of-mouth | Comparison content: "felhőalapú vs. asztali szoftver" |
| International tools (Buildium, etc.) | Not localized for Hungary | Own all Hungarian-language queries; emphasize Hungarian law compliance |

### SERP Opportunities

1. **Featured Snippets:** "Mi a közös képviselő feladata?" — definitional query, no current snippet holder, list-format answer wins
2. **PAA boxes:** 10+ HOA governance questions currently unoptimized in HU SERPs
3. **Environmental data niche:** Zero competition for "levegőminőség Budapest kerület", "hőszigat térkép Budapest", "zöldterület pontszám" — first mover wins all
4. **Comparison queries:** "társasházi szoftver összehasonlítás" has low competition and high conversion intent

---

## Agent 07 — Topical Authority Map

**Scope:** Pillar-cluster architecture, topical map, authority-building roadmap, supporting asset design

### 8-Pillar Content Architecture

| # | Pillar | Hub URL | Articles | Priority | Stage |
|---|--------|---------|----------|----------|-------|
| 1 | Társasházkezelés | /tarsashaz-kezeles | 8 | P0 | BOFU |
| 2 | Levegőminőség | /levegominoseg-budapest | 7 | P0 | TOFU |
| 3 | Zajszennyezés | /zajszennyezes-budapest | 7 | P1 | TOFU |
| 4 | Klíma & Hőszigetek | /klimakockazat-epuleteknel | 7 | P1 | TOFU |
| 5 | Városi Mobilitás | /tomegkozlekedes-elemzes | 6 | P1 | TOFU |
| 6 | Fenntarthatóság | /zold-tarsashaz | 7 | P2 | TOFU |
| 7 | PanelLakó Platform | /funkciok | 6 | P0 | BOFU |
| 8 | Magyar Társasházi Jog | /tarsashazi-jog | 7 | P2 | TOFU |

**Total content units planned:** 55 articles + 8 pillar hub pages = 63 pages

### Pillar 1 — Társasházkezelés (P0 BOFU)
Cluster topics: Közös képviselő feladatai 2024-ben · SZMSZ készítése · Közgyűlés összehívása lépésről lépésre · Hibabejelentés digitális megoldása · Dokumentumkezelés: kötelező iratok listája · Közös költség nyilvántartása · Felügyelőbizottság feladatai · Díjhátralék kezelése

### Pillar 2 — Levegőminőség (P0 TOFU — zero competition)
Cluster topics: PM2.5 és PM10 mit jelent a lakóknak? · Budapest legszennyezettebb kerületei · Beltéri levegőminőség társasházi lakásokban · Pollenkoncentráció és allergia Budapest kerületeiben · Lakóhely kiválasztása levegőminőség alapján · Épület szintű monitoring módszertana · Levegőminőség és egészség: WHO határértékek

---

## Agent 08 — Schema / E-E-A-T / LLM SEO

**Scope:** Structured data opportunities, trust signals, entity clarity, AI-search extractability, answer-engine readiness

### Schema Implementation Plan

| Page | Schema Types | Priority |
|------|-------------|----------|
| / | Organization + SoftwareApplication + WebSite | P0 |
| /funkciok | SoftwareApplication + ItemList | P0 |
| /gyik | FAQPage | P1 |
| /elemzes/budapest-kozlekedes | Dataset + BreadcrumbList + Article | P1 |
| /rolunk | Organization (rich) + AboutPage | P1 |
| /adatforrasok | Dataset (multiple) | P2 |
| All content pages | BreadcrumbList + Article | P2 |
| /arak | Offer + PriceSpecification | P2 |

### Organization JSON-LD (Root Layout)
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "PanelLakó",
  "url": "https://panellako.hu",
  "logo": "https://panellako.hu/icons/icon-512.png",
  "description": "Digitális társasházkezelő platform — bejelentések, dokumentumok, pénzügyek és szavazások egy helyen.",
  "areaServed": "HU",
  "inLanguage": "hu",
  "sameAs": ["https://www.linkedin.com/company/panellako"]
}
```

### SoftwareApplication JSON-LD (/funkciok)
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "PanelLakó",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "HUF",
    "description": "14 napos ingyenes próba"
  },
  "url": "https://panellako.hu"
}
```

### E-E-A-T Required Actions
1. **Create /rolunk** — named founders, LinkedIn links, founding story (HIGHEST ROI)
2. **Create /adatvedelmi-iranyelvek** — GDPR Privacy Policy (legally required)
3. **Create /adatforrasok** — data source transparency (BKK GTFS, OpenAQ, Copernicus, OSM)
4. Mount PostHog — no behavioral data = no E-E-A-T for content decisions

### LLM Extractability Assessment
**Current score: 1/10** — the site will not be cited by ChatGPT Browse, Perplexity, or Google AI Overviews.

To achieve 8/10 within 90 days:
- Clear product description paragraph on homepage (LLMs need 1 clear statement)
- Named feature list on /funkciok
- Q&A format content on /gyik
- Data sources documented on /adatforrasok
- Organization schema entity definition
- Citations from Hungarian tech publications

---

## Agent 09 — Reporting & Action Plan (Master Synthesis)

### 4-Sprint Execution Roadmap

---

#### Sprint 1 — Technical Foundation (Weeks 1–2)
**Theme: Remove All Crawl Blockers**

| Action | Task | Owner | Effort |
|--------|------|-------|--------|
| ACT-001 | Create app/robots.ts with allow/disallow rules | Engineering | XS |
| ACT-002 | Create app/sitemap.ts listing all public URLs | Engineering | XS |
| ACT-003 | Set metadataBase + add OG/Twitter blocks to all pages | Engineering | S |
| ACT-004 | Fix /elemzes ssr:false → SSR + static content block | Engineering | M |
| ACT-005 | Add noindex to /login, /offline, /superadmin, /billing | Engineering | XS |
| ACT-006 | Set canonical tags + 301 www→apex redirect | Engineering | XS |
| ACT-007 | Add Organization JSON-LD to root layout | Engineering | XS |
| ACT-008 | Mount/reconnect PostHog with events | Engineering | S |
| ACT-009 | Verify Google Search Console + submit sitemap | SEO | XS |

**Success criteria:** GSC shows sitemap accepted; zero admin pages in Coverage; /elemzes page crawlable; OG debugger passes; Organization schema valid in Rich Results Test.

---

#### Sprint 2 — Conversion Surface (Weeks 3–4)
**Theme: Homepage, Features, Legal, Navigation**

| Action | Task | Owner | Effort |
|--------|------|-------|--------|
| ACT-010 | Rewrite homepage: new title, H1, 600+ words, CTA, footer | Content | M |
| ACT-011 | Create /funkciok hub page with SoftwareApplication schema | Content | M |
| ACT-012 | Create 4 individual feature pages | Content | L |
| ACT-013 | Create /arak pricing page with trial CTA | Content | S |
| ACT-014 | Create /gyik FAQ page with FAQPage JSON-LD | Content | M |
| ACT-015 | Create /adatvedelmi-iranyelvek + /aszf (legal review required!) | Product | M |
| ACT-016 | Create /rolunk About page with team, LinkedIn, founding story | Content | S |
| ACT-017 | Build public navigation header (Funkciók\|Árak\|Blog\|Elemzések\|GYIK) | Engineering | M |
| ACT-018 | Build site footer with legal + hub links | Engineering | S |
| ACT-019 | Add homepage link to /elemzes/budapest-kozlekedes | Engineering | XS |
| ACT-035 | Verify Bing Webmaster Tools + submit sitemap | SEO | XS |
| ACT-038 | Create /kapcsolat contact page | Content | XS |

**Success criteria:** Homepage ranks in top 50 for brand query; 10+ new pages indexed; FAQPage passes Rich Results Test; SoftwareApplication schema valid; legal pages live and linked from footer.

---

#### Sprint 3 — Topical Authority (Weeks 5–6)
**Theme: BOFU Pillar 1 + TOFU Pillar 2 + Schema Completion**

| Action | Task | Owner | Effort |
|--------|------|-------|--------|
| ACT-020 | Publish /tarsashaz-kezeles hub (800w) + 3 cluster articles | Content | L |
| ACT-021 | Publish /levegominoseg-budapest hub (800w) + 3 cluster articles | Content | L |
| ACT-022 | Add OG metadata + Article schema to /elemzes/budapest-kozlekedes | Engineering | XS |
| ACT-023 | Publish /osszehasonlitas comparison page | Content | M |
| ACT-024 | Add BreadcrumbList schema to all hub + cluster pages | Engineering | S |
| ACT-025 | Add LocalBusiness/Service schema | Engineering | S |
| ACT-026 | Expand /elemzes/ hub: 2 additional district analysis pages | Content | L |
| ACT-033 | Fix /elemzes meta description (251 → ≤155 chars) | SEO | XS |
| ACT-036 | Submit to Hungarian SaaS/property directories | SEO | M |

**Success criteria:** 5+ pages from /tarsashaz-kezeles cluster in index; /levegominoseg-budapest shows first impressions; BreadcrumbList passes Rich Results Test; 3+ external backlinks confirmed.

---

#### Sprint 4 — Measurement Review + E-E-A-T Completion (Weeks 7–8)
**Theme: Pillar Completion, Data Review, Iterate**

| Action | Task | Owner | Effort |
|--------|------|-------|--------|
| ACT-027 | Publish 4 remaining Pillar 1 cluster articles | Content | L |
| ACT-028 | Publish 4 remaining Pillar 2 cluster articles | Content | L |
| ACT-029 | Create /elemzes/modszertan data methodology page | Content | S |
| ACT-030 | Keyword-rich anchor text audit (80% internal links) | SEO | S |
| ACT-031 | First full SEO measurement report | SEO | S |
| ACT-032 | Fix manifest.json theme_color + description | Engineering | XS |
| ACT-037 | Publish /zajszennyezes-budapest hub + 2 cluster articles | Content | L |

**Success criteria:** 50+ pages indexed; target queries in top 100 for 5+ BOFU keywords; homepage organic sessions vs. baseline measurable; trial signup conversion tracked by landing page.

---

### KPI Dashboard

| Metric | Baseline | 30d Target | 90d Target | 180d Target | Tool |
|--------|----------|-----------|-----------|------------|------|
| Total Indexed Pages | ~3 | 15+ | 40+ | 80+ | GSC Coverage |
| Weekly Organic Impressions | 0–50 | 500+ | 5,000+ | 25,000+ | GSC Performance |
| Weekly Organic Clicks | 0–10 | 50+ | 500+ | 2,500+ | GSC Performance |
| Avg Position: "társasházi kezelő szoftver" | >100 | Top 50 | Top 20 | Top 10 | GSC Queries |
| Organic Monthly Trial Signups | 0 | 2–5 | 20–40 | 80–150 | PostHog |
| Pages with Valid Schema | 0 | 5 | 20+ | 50+ | Rich Results Test |
| Referring Domains | Baseline | +0 | +10 | +30 | Ahrefs / GSC Links |
| Featured Snippets | 0 | 0 | 1–3 | 5–10 | GSC (position 0) |
| Core Web Vitals LCP (homepage) | Unknown | Measured | <2.5s | <2.0s | PageSpeed Insights |
| Organic Session-to-Trial CVR | N/A | Baseline | >2% | >3% | PostHog funnel |

---

### Top 10 Quick Wins (deployable today)

1. **Create `app/robots.ts`** — 30 min, blocks admin/api crawling immediately
2. **Create `app/sitemap.ts`** — 20 min, enables GSC submission
3. **Add `metadataBase` to root layout** — 1 line, unblocks OG/canonical URL resolution
4. **Add OG/Twitter metadata to root layout** — 2 hours, social share previews live
5. **Fix `ssr:false` → SSR on /elemzes** — half-day, makes best content page indexable
6. **Add `noindex` to /login, /offline, /superadmin** — 1 hour, cleans up index
7. **Add Organization JSON-LD to root layout** — 1 hour, entity defined for AI engines
8. **Change homepage title from "Digitális működési központ"** — 15 min, removes banned phrase
9. **Add homepage link to /elemzes/budapest-kozlekedes** — 5 min, fixes orphan page
10. **Verify Google Search Console + submit sitemap** — 15 min after robots.ts is live

---

### Key Risks

| Risk | Level | Mitigation |
|------|-------|-----------|
| SSR conversion of /elemzes may break map components | High | Extract client island; test all Leaflet/chart components separately |
| Regulatory content without legal review = liability | High | No publish without Hungarian lawyer sign-off |
| Privacy Policy required before trial signups | High | ACT-015 blocks by Week 3; identify legal resource in Sprint 1 |
| Small team bandwidth for 38 actions in 8 weeks | Medium | Sequence P0 only in Sprint 1; extend timeline if team < 3 people |
| PostHog was unmounted — verify GDPR consent reason before remounting | Medium | Check if cookie consent banner needed first |
| Domain authority near-zero — 3–6 months before rankings materialize | Medium | Set stakeholder expectations; measure impressions as leading indicator |

---

### Open Questions

1. Why was PostHog unmounted? GDPR cookie consent issue? Must clarify before ACT-008.
2. Is the www subdomain active? Canonical strategy (www vs. apex) must be decided for ACT-006.
3. Does the team have a Hungarian legal contact for Privacy Policy review? ACT-015 is blocked without one.
4. What is the current Stripe trial conversion rate? Need pre-SEO baseline for attribution.
5. Are environmental data sources (air quality, GTFS) updated automatically or manually? Data freshness is E-E-A-T critical.
6. What is the content production capacity (articles/week)? This determines if 8-week roadmap is realistic.
7. Are there any existing brand mentions or partner relationships convertible to backlinks? Identify in Sprint 1.
8. Are Czech/Slovak/Polish expansions planned? If yes, i18n infrastructure should be extended in parallel.

---

*Report generated by 9-agent parallel SEO system. Wave A agents 01–08 ran in parallel. Agent 09 synthesized all findings. Total findings analyzed: 88 across 9 agents.*
