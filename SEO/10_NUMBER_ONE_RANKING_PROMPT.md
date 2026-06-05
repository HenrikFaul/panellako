# Effectime — #1 Google Ranking Master Prompt

> **Status:** Living document. Last updated 2026-06-03 (v3.49.4).
> **Owner:** SEO orchestration agents (see `00_MASTER_CONTROLLER_PROMPT.md`).
> **Mission:** Effectime must rank **#1 on google.hu** for the head terms in its category, and appear in **AI Overviews** and **LLM answers** (ChatGPT, Perplexity, Gemini) when Hungarian users ask about műszakbeosztás, szabadságkezelés, kapacitástervezés.

---

## 1. Mission statement

Treat every SEO-touching change as a vote toward this single goal:

> *When a Hungarian decision-maker (HR vezető, ops manager, kkv-tulajdonos) searches Google for any term in Tier 1 below, the first organic result — and the AI Overview citation — is Effectime.*

If a proposed change does not measurably help that goal, deprioritize it.

---

## 2. Target keyword tiers

These keywords are the **acceptance contract**. Every landing page revision, every schema change, every blog post must be checked against this list.

### Tier 1 — Head terms (must rank #1 on google.hu)

| Keyword | Intent | Current target page |
|---|---|---|
| `műszakbeosztó program` | Commercial / category | `/` (Landing) |
| `szabadságkezelő rendszer` | Commercial / category | `/` (Landing) |
| `kapacitástervező szoftver` | Commercial / category | `/` (Landing) |
| `műszakbeosztás szoftver` | Commercial | `/` (Landing) |
| `beosztáskészítő program` | Commercial | `/` (Landing) |

### Tier 2 — Mid-tail (top 3 on google.hu within 6 months)

- `workforce management magyar`
- `csapatnaptár szoftver`
- `távollétkezelő rendszer`
- `jelenlétkezelő szoftver`
- `HR szoftver kkv`
- `szabadság nyilvántartó program`
- `műszakbeosztó Excel helyett`
- `online beosztás készítő`

### Tier 3 — Long-tail / AI Overview triggers (own the answer)

- `hogyan készítsek műszakbeosztást Excel helyett`
- `legjobb műszakbeosztó program 2026`
- `ingyenes szabadságkezelő kkv-knak`
- `Microsoft 365 csapatnaptár integráció`
- `műszakbeosztó CRM-be ágyazva`
- `hány órát dolgozhat egy munkavállaló műszakban`
- `szabadság felhalmozási szabályok`
- `mennyibe kerül egy workforce management szoftver`

### Tier 4 — International (later, when EN route ships)

- `workforce management software Hungary`
- `absence management for SMEs`
- `Microsoft 365 shift scheduling`

---

## 3. Competitive landscape (benchmark)

Direct and adjacent competitors whose SERP positions we must beat:

| Competitor | Threat level | Why they rank |
|---|---|---|
| **Absentify** | High | Strong Microsoft 365 integration story, content marketing |
| **Vacation Tracker** | High | Heavy SEO investment on `vacation tracker` long-tail |
| **Resource Guru** | Medium | Capacity planning vertical, strong DA |
| **Humanforce** | Medium | Enterprise workforce, EN content |
| **Nexum / Nexon** (HU) | Medium | HU enterprise HR brand recognition |
| **Excel templates / blog tutorials** | Low–Medium | Steal long-tail "how-to" intents |

**Differentiation moat to amplify in every page:**
1. **Hungarian-first** (felület + ügyfélszolgálat + DPA + Hungarian case studies).
2. **CRM-embeddable** (iframe SDK — no competitor offers this).
3. **Unified surface** (műszak + szabadság + kapacitás one tool, not three).
4. **Microsoft 365 SSO + Outlook** out of the box.
5. **GDPR EU adatközpont** (vs US-hosted competitors).

---

## 4. The #1 Ranking Playbook (8-pillar checklist)

Every SEO-touching PR MUST tick these. An unchecked pillar blocks ranking gains.

### 4.1 On-page (per target page)

- [ ] `<title>` 50–60 chars, primary keyword in first 30 chars, brand at end
- [ ] `<meta description>` 140–160 chars, primary keyword + USP + CTA
- [ ] Single `<h1>` with exact-match primary keyword
- [ ] Primary keyword in first 100 words of visible body
- [ ] Keyword density 1–2% (natural; never stuff)
- [ ] LSI / semantic variants in H2/H3 (synonyms, plurals, related entities)
- [ ] All images have descriptive `alt` (keyword + concept, not stuffed)
- [ ] Internal links to ≥3 cluster pages with descriptive anchors
- [ ] Outbound link to 1–2 high-authority sources (gov, research, schema.org)

### 4.2 Schema (JSON-LD in `index.html` — sitewide minimum)

- [x] `Organization` with address, contactPoint, sameAs
- [x] `SoftwareApplication` with `AggregateRating` + `Offer`
- [x] `FAQPage` (8+ Q&A blocks)
- [x] `HowTo` (Excel → Effectime migration — AI Overview trigger)
- [x] `Service` with `areaServed` (HU + CEE)
- [x] `BreadcrumbList`
- [x] `WebSite` (Sitelinks Searchbox eligibility)
- [ ] `Article` schema per blog post (Helmet, when blog ships)
- [ ] `Product` + `Review` schema per case study (Helmet)

### 4.3 E-E-A-T (Experience / Expertise / Authority / Trust)

- [ ] Author bio with credentials on every long-form page
- [ ] "Frissítve: YYYY-MM-DD" timestamp on every content page
- [ ] At least 3 Hungarian customer case studies with named companies
- [ ] Real customer testimonials with photo + role + company
- [ ] Public roadmap or changelog accessible from footer
- [ ] About page with founder bio, registered company info, address

### 4.4 Topical authority (pillar–cluster)

**Pillar pages to build (in order of priority):**
1. `/muszakbeosztas` — pillar for shift scheduling
2. `/szabadsagkezeles` — pillar for absence management
3. `/kapacitastervezes` — pillar for capacity planning

**Cluster article seed list (5 per pillar minimum):**
- *Műszakbeosztás Excel helyett: 5 ok a váltásra*
- *Hány órát dolgozhat egy munkavállaló műszakban? — Mt. összefoglaló 2026*
- *Forgó műszakbeosztás minták (3 példa kkv-knak)*
- *Szabadság felhalmozási szabályok a magyar Mt. szerint*
- *Hogyan integrálható a csapatnaptár Microsoft 365-be*
- *Kapacitástervezés agilis csapatoknak — keret és sablonok*

### 4.5 Internal linking architecture

- Hub-spoke: every cluster article links to its pillar with primary anchor
- Every pillar links down to all its clusters
- Landing → 3 pillars (primary anchor) in hero + footer
- Breadcrumbs on every non-landing page
- No orphan pages (sitemap audit monthly)

### 4.6 Core Web Vitals (technical SEO floor)

| Metric | Target | Source of truth |
|---|---|---|
| LCP | < 2.5s mobile, < 1.8s desktop | PageSpeed Insights |
| INP | < 200ms | PageSpeed Insights |
| CLS | < 0.1 | PageSpeed Insights |
| TTFB | < 800ms | WebPageTest |
| Bundle (initial JS) | < 2.5 MB | Vite build report |

Currently mitigated via code splitting (v3.48.0); re-verify after every layout change.

### 4.7 Off-page (backlinks + brand mentions)

**Year 1 link-building priorities (Hungarian-first):**
- HVG Tech, Forbes HU, hrportal.hu, kkv-portál guest posts
- HRMagazin, Profession.hu thought leadership
- ITBusiness.hu, Computerworld.hu product feature
- Startup ökoszisztéma: Startup Hungary, Bridge Budapest
- Microsoft Partner Network listing
- G2, Capterra, Software Advice (international DA carry-over)

**Tactic:** ship 1 datapoint-led press piece per quarter ("HU workforce admin survey 2026", etc.) — repeatable backlink magnet.

### 4.8 AI search / LLM readiness (GEO — Generative Engine Optimization)

- [x] `/llms.txt` published and current
- [x] Definitional opening sentence on landing: *"Az Effectime egy magyar fejlesztésű workforce management platform…"*
- [x] FAQPage schema with conversational Q&A
- [x] HowTo schema with explicit steps
- [ ] Factoid-friendly structure in pillar articles (one fact per sentence, bulleted lists, definitions)
- [ ] Comparison pages: *"Effectime vs Absentify"*, *"Effectime vs Vacation Tracker"* (LLM citation magnets)
- [ ] Public statistics page with shareable numbers (LLMs love numerical sources)

---

## 5. Acceptance criteria (per release)

Before any release that touches `index.html`, landing copy, schema, or routes:

1. **All 8 pillars above ticked** (or explicit waiver with reason in `versioning/*.md`).
2. **Title + description regression check** — manually grep `<title>` and `description` to confirm Tier 1 keyword presence.
3. **Schema validation** — paste into <https://validator.schema.org/> and confirm 0 errors.
4. **Rich Results test** — <https://search.google.com/test/rich-results> shows ≥3 eligible result types.
5. **Lighthouse SEO score ≥ 95**.
6. **No regression in Tier 1 keyword density** (compare diff of visible HU copy on landing).

---

## 6. Verification & monitoring protocol

| Cadence | Action | Tool |
|---|---|---|
| Weekly | Position check Tier 1 keywords (HU) | Google Search Console + manual SERP |
| Bi-weekly | Competitor SERP diff | `semrush--serp_analysis` per Tier 1 |
| Monthly | Domain trend snapshot | `semrush--domain_analysis` + `seo_trend` |
| Monthly | Keyword volume refresh | `semrush--keyword_research` on Tier 1+2 |
| Quarterly | Full competitor re-audit | `semrush--competitive_analysis` |
| Quarterly | Backlink profile review | `semrush--backlink_analysis` |
| On every release | Lighthouse + Rich Results test | manual |

**Always set Semrush `database=hu`** for HU-targeting queries. Always name Semrush as the data source when reporting numbers.

---

## 7. Anti-patterns (do NOT do)

- ❌ Keyword stuffing in title/description/H1 (Google penalty + lower CTR)
- ❌ Hidden text, white-on-white, doorway pages
- ❌ Duplicate `<link rel="canonical">` (one in `index.html`, another via Helmet)
- ❌ Hreflang pointing two locales to the same URL without `x-default`
- ❌ AggregateRating without real underlying reviews (Google manual action risk)
- ❌ Generic `og-image.png` placeholder — replace with branded asset
- ❌ Adding `noindex` to landing
- ❌ Migrating sitemap mechanism without confirmation
- ❌ Hardcoding english strings in pages targeting HU market

---

## 8. Update protocol for this prompt

This document is the source of truth. Update it when:
- A Tier 1 keyword hits #1 (move to "won" appendix, promote a Tier 2)
- A new competitor enters SERP top 10 (add to §3)
- A new schema type ships in `index.html` (tick §4.2)
- A pillar page launches (tick §4.4 and add to internal linking matrix)
- Core Web Vitals targets change (Google announcement)

Every update bumps the "Last updated" header and creates a `versioning/*.md` entry.

---

## 9. Quick-reference one-liner for AI agents

> *"You are working on Effectime. Every SEO change must move us toward #1 on google.hu for `műszakbeosztó program`, `szabadságkezelő rendszer`, and `kapacitástervező szoftver`. Read `SEO/10_NUMBER_ONE_RANKING_PROMPT.md` before acting. Tick all 8 pillars or explain the waiver."*
