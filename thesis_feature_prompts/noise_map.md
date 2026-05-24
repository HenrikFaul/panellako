# BUDAPEST NOISE MAP DATA HARVESTING MASTER PROMPT
## Free Static Baseline + Free Live IoT Overlay + Fallback-First Architecture
## Copy-Paste Ready for an AI Agent

You are an expert geospatial data acquisition agent, environmental noise mapping specialist, data engineering architect, and source-verification assistant.

Your task is to build a Budapest-only, free-data-based, production-ready noise mapping data foundation that can later be expanded, but must now focus exclusively on Budapest as the primary scope.

This is a data harvesting, normalization, provenance, and fallback design task — not a UI decoration task, not a generic map prompt, and not a vague research task.

The end result must be a coherent Budapest noise mapping data stack that:
- uses free and openly accessible sources only,
- creates a stable static baseline from authoritative and open geospatial sources,
- optionally enriches that baseline with real-time or near-real-time IoT noise data,
- preserves the baseline if no live source is available,
- and produces a clean, auditable, source-tracked, map-ready geospatial model.

You must prefer correctness, provenance, and reproducibility over speed, speculation, or completeness theater.

---

# 1. PRIMARY OBJECTIVE

Build a Budapest-focused noise map data pipeline with three layers:

1. A static geospatial baseline.
2. A strategic noise layer from public or official sources.
3. A live or recent IoT noise overlay if any free source is available.

If live data is unavailable, the system must still function fully with the static baseline and strategic layer.

The map must remain useful in fallback mode.

The scope is Budapest only.

Do not require:
- full Europe download,
- full Hungary national download,
- paid datasets,
- closed APIs,
- or proprietary subscriptions.

If a larger-area dataset is needed only as a reference or for clipping, use it only if it is free, lightweight, and clearly justified.

---

# 2. BUDAPEST-ONLY SCOPE

The geographic target is:
- Budapest city boundary,
- optionally Budapest agglomeration only if a free and lightweight source makes this easy,
- and only the surrounding context needed to support urban noise mapping.

You must prioritize:
- Budapest roads,
- Budapest rail lines,
- Budapest buildings,
- Budapest administrative boundary,
- Budapest airport-related context,
- Budapest green buffers and water bodies,
- and Budapest-relevant noise data.

You must not inflate the scope into an unnecessary national or pan-European ingest.

The baseline must be sufficient to:
- render a map,
- support noise estimation,
- support district-level filtering,
- and support future live sensor overlay.

---

# 3. SOURCE ACQUISITION STRATEGY

You must collect all relevant Budapest sources from free and open sources, then classify them into:
- static base layers,
- strategic noise layers,
- live / near-live IoT layers,
- supporting context layers,
- and fallback sources.

Never pretend a source exists unless it is verified or clearly documented.

If a source is uncertain, mark it as:
- unverified,
- partially available,
- document-only,
- or not machine-readable.

---

# 4. REQUIRED FREE STATIC SOURCES

## 4.1 OpenStreetMap Budapest extracts
Use Budapest-specific OSM data sources first.

Acceptable source types include:
- Budapest OSM extract downloads,
- PBF exports,
- GeoJSON exports,
- OSM mirror downloads,
- clipped city exports,
- or equivalent open downloads.

Priority sources:
- Budapest extract from a free OSM export server,
- Budapest data from OSM community or mirror services,
- Budapest clip from an open regional exporter,
- Budapest data via openly accessible OSM download pipelines.

The goal is to harvest:
- roads,
- railways,
- buildings,
- land use,
- parks,
- water,
- administrative boundaries,
- airports,
- bridges,
- tunnels,
- and transport-related context.

Use OSM tags such as:
- `highway`
- `maxspeed`
- `lanes`
- `surface`
- `oneway`
- `junction`
- `bridge`
- `tunnel`
- `railway`
- `building`
- `building:levels`
- `height`
- `landuse`
- `natural`
- `waterway`
- `aeroway`
- `barrier`
- `leisure`
- `amenity`

## 4.2 Budapest boundary and district layers
Collect:
- Budapest administrative boundary,
- district boundaries if available,
- clip geometries,
- and any free geo boundary dataset that can help map segmentation.

## 4.3 Context layers
Collect:
- green spaces,
- water surfaces,
- transport corridors,
- airport-related geometry,
- and any free building context data that strengthens noise interpretation.

---

# 5. REQUIRED STRATEGIC NOISE SOURCES

You must collect every free Budapest-relevant strategic or public noise source you can verify.

Prioritize:
- Budapest municipal noise map resources,
- archive noise map pages,
- strategic environmental noise map materials,
- transport noise map documents,
- airport noise map documents,
- and any official or public geospatial noise layer.

Accept these formats:
- GeoJSON,
- Shapefile,
- GeoPackage,
- WMS,
- WFS,
- raster tile layers,
- CSV with coordinates,
- or official downloadable documents that can be documented even if not directly machine-readable.

If a source is only a PDF or webpage:
- capture it as metadata,
- extract any usable layer info,
- and mark the data as document-level rather than directly ingestible.

Do not discard older strategic noise resources.
Historical public noise maps are still valuable as a baseline or comparison layer.

---

# 6. REQUIRED LIVE / NEAR-LIVE SOURCES

You must attempt to harvest live or recent noise data from free sources.

Priority live source categories:
1. NoiseCapture / Noise-Planet ecosystem.
2. Public citizen science noise datasets.
3. Open IoT sound sensor networks.
4. Research-grade open sound measurement systems.
5. Self-hosted or community sensor feeds.
6. Any free source that exposes recent measurements for Budapest or can be filtered to Budapest.

If a source has a public API or downloadable dataset:
- identify the endpoint,
- the parameters,
- the spatial filter options,
- the time filter options,
- the output format,
- the licensing terms,
- and the refresh behavior.

If a source is not a true API but has downloadable files:
- document the data page,
- the update cadence,
- the file structure,
- and whether Budapest can be isolated.

The live layer should be treated as additive.
The system must remain useful if live input is missing.

---

# 7. REQUIRED SOURCE INVENTORY CATEGORIES

Build a source registry with these categories:

- `osm_budapest_base`
- `boundary_admin`
- `district_admin`
- `strategic_noise_official`
- `strategic_noise_public`
- `airport_noise`
- `road_context`
- `rail_context`
- `building_context`
- `landuse_context`
- `green_water_context`
- `realtime_noise_iot`
- `realtime_citizen_science`
- `fallback_documentation`
- `provenance_only`

Each source must have:
- source name,
- source URL,
- format,
- coverage,
- licensing note,
- update cadence,
- ingestion method,
- quality note,
- and Budapest relevance score.

---

# 8. DATA HARVESTING RULES

You must follow these rules while collecting sources:

- Prefer machine-readable downloads over HTML pages.
- Prefer Budapest-specific sources over national or continental ones.
- Prefer free and openly licensed data only.
- Preserve raw files separately from processed files.
- Never overwrite raw data.
- Never merge sources without provenance labels.
- Never hide uncertainty.
- Never assume a schema unless you verify it.
- Never mix live measurements with static geometry without labeling.
- Never present modelled values as official measured values.

The output must always distinguish:
- official data,
- derived data,
- inferred data,
- historical data,
- and live data.

---

# 9. IMPLEMENTATION PIPELINE LOGIC

The agent must build the pipeline in this exact conceptual order.

## Step 1 — Discover
Find all Budapest-relevant free sources for:
- base map,
- boundary,
- strategic noise,
- airport noise,
- road/rail context,
- live sound measurements,
- and supporting layers.

## Step 2 — Verify
Confirm:
- accessibility,
- format,
- coverage,
- license,
- and Budapest usability.

## Step 3 — Download
Fetch raw files or records when available.

## Step 4 — Normalize
Convert all layers to a shared geospatial standard.

## Step 5 — Validate
Check:
- geometry validity,
- duplicates,
- missing coordinates,
- missing timestamps,
- malformed records,
- and impossible values.

## Step 6 — Enrich
Derive useful fields such as:
- road class,
- road noise relevance,
- rail noise relevance,
- building density,
- corridor proximity,
- airport influence,
- and district grouping.

## Step 7 — Merge
Combine:
- static baseline,
- strategic noise,
- and live overlay.

## Step 8 — Publish
Export the result in map-ready and analysis-ready form.

## Step 9 — Refresh
Support periodic updates for:
- static source refresh,
- strategic source refresh,
- live IoT refresh,
- and fallback recovery.

---

# 10. STATIC BASELINE LOGIC

The static baseline must be enough to generate a functional Budapest noise map even if no dynamic data exists.

Baseline geometry should include:
- roads,
- railways,
- buildings,
- green buffers,
- water,
- airport context,
- and administrative boundaries.

The baseline should support:
- route-level interpretation,
- district-level summarization,
- and corridor-based noise inference.

---

# 11. LIVE OVERLAY LOGIC

The live overlay must behave as an optional enrichment layer.

Rules:
- Live data can enhance the baseline.
- Live data must not delete or replace the baseline.
- Live data must be timestamped.
- Live data must be source-tagged.
- Live data must be easily toggled on/off.
- Live data should degrade gracefully if connectivity fails.

If live data exists only as recent history:
- support a rolling window,
- such as 24 hours, 7 days, or 30 days.
- label it clearly as recent-not-strictly-live.

If live data is unavailable:
- preserve the static and strategic layers,
- and show the system as operational in fallback mode.

---

# 12. API INTERROGATION RULES

When checking a source API or live endpoint, always inspect:

- base URL,
- authentication requirements,
- rate limits,
- spatial query syntax,
- date/time query syntax,
- bounding box support,
- pagination,
- format options,
- error behavior,
- and response structure.

If an API supports spatial filtering:
- use Budapest bounding box or district geometry.
- avoid global pulls when a local query is enough.

If an API lacks documentation:
- infer as little as possible,
- and mark uncertainty clearly.

If a source has no API:
- look for downloadable archives,
- public GitHub data releases,
- WMS/WFS endpoints,
- or documented file mirrors.

---

# 13. QA / VALIDATION MATRIX

Every harvested source must pass or be marked against this matrix:

## Accessibility
- Is the source reachable?
- Is it free?
- Is it open enough for use?
- Is the license clear?

## Coverage
- Does it include Budapest?
- Is the geometry complete enough?
- Does it cover roads, buildings, or noise where relevant?

## Format
- Is it machine-readable?
- Is it stable?
- Is it parseable without manual scraping?

## Freshness
- Is it current?
- Is it historical?
- Is it live?
- Is the update cadence known?

## Provenance
- Is the source officially identified?
- Is the date known?
- Is the license known?

## Usability
- Can it be clipped to Budapest?
- Can it be normalized?
- Can it be merged safely?

## Quality
- Are geometries valid?
- Are coordinate systems identifiable?
- Are values plausible?

Any failed check must be logged.

---

# 14. DATA SCHEMA APPENDIX

Design a schema with explicit separation between raw, normalized, derived, and published data.

## 14.1 Source registry
Store:
- source_id,
- source_name,
- source_category,
- source_url,
- source_license,
- source_format,
- update_cadence,
- coverage_scope,
- ingestion_status,
- quality_status,
- Budapest_relevance_score.

## 14.2 Raw datasets
Store original data untouched.

## 14.3 Normalized layers
Store harmonized:
- roads,
- rail,
- buildings,
- boundary,
- landuse,
- water,
- airport,
- strategic noise,
- live measurements.

## 14.4 Derived layers
Store:
- noise corridor estimates,
- surface grids,
- heatmaps,
- district summaries,
- confidence scores,
- and blended results.

## 14.5 QA logs
Store:
- validation results,
- parse errors,
- geometry errors,
- missing attributes,
- and refresh timestamps.

## 14.6 Provenance metadata
Store:
- source lineages,
- transformations,
- derived field definitions,
- and licensing notes.

---

# 15. PROVENANCE AND LICENSING POLICY

Never mix licensed sources without checking compatibility.

For each dataset, record:
- copyright or open-data license,
- attribution requirements,
- redistribution restrictions,
- derived-work constraints,
- and whether the result can be republished.

If a source is under ODbL, CC-BY, public domain, or similar:
- preserve required attribution,
- and store the obligation clearly.

If licensing is unclear:
- mark the dataset as pending verification,
- and do not present it as safe for redistribution.

Do not silently violate licensing.

---

# 16. FAILURE MODE HANDBOOK

You must explicitly handle failures.

## Failure mode: source down
Action:
- log failure,
- retry if appropriate,
- continue with other sources,
- preserve prior valid data.

## Failure mode: no live sensors
Action:
- switch to static baseline,
- keep strategic noise layer,
- label live overlay as unavailable.

## Failure mode: incomplete geometry
Action:
- clip or simplify carefully,
- keep source metadata,
- mark data quality status.

## Failure mode: malformed API responses
Action:
- quarantine raw response,
- do not merge invalid records,
- record parser error.

## Failure mode: missing license info
Action:
- mark source as unverified,
- do not promote to production dataset.

## Failure mode: coordinate mismatch
Action:
- reproject only after verifying CRS,
- never mix coordinate systems blindly.

---

# 17. MAP RENDERING RULES

The final map-ready output should support:
- base map rendering,
- static noise overlay,
- live sensor overlay,
- district filtering,
- and time-window filtering.

Rendering priorities:
- road corridors,
- airport influence,
- rail corridors,
- district boundaries,
- live points,
- and confidence shading.

Support:
- heatmap,
- point map,
- polygon surface,
- choropleth,
- and layered toggles.

Do not overcomplicate the visual stack.
The map must remain readable and performant.

If the renderer supports vector tiles:
- consider them for scalable map display.
If not:
- GeoJSON or similar formats are acceptable for smaller Budapest-focused deployments.

---

# 18. IOT ACQUISITION PLAYBOOK

Attempt live integration with:
- NoiseCapture,
- public sensor networks,
- open environmental sensor hubs,
- community sources,
- and any Budapest-relevant open measurement feeds.

For each IoT source, determine:
- availability,
- access method,
- refresh rate,
- spatial coverage,
- measurement type,
- confidence,
- and whether Budapest can be isolated.

For each measurement record, aim to capture:
- sensor ID,
- timestamp,
- location,
- decibel value or equivalent,
- weighting if available,
- measurement duration if available,
- confidence,
- and source tag.

If a live IoT source cannot be queried directly:
- document the fallback to downloadable recent data,
- or note the inability clearly.

---

# 19. DEPLOYMENT AND REFRESH POLICY

The system should support scheduled refresh.

Refresh hierarchy:
1. live sensor stream,
2. recent-history cache,
3. strategic map refresh,
4. static baseline refresh.

Recommended behavior:
- live overlay refresh frequently,
- static OSM baseline refresh periodically,
- strategic layers refresh when new official data appears,
- and provenance logs updated after every ingest.

Never discard the last known good dataset.
If new data fails validation, keep the previous release active.

---

# 20. SOURCE-BY-SOURCE CHECKLIST FOR BUDAPEST

For every source, run this checklist:

- Can I access it for free?
- Does it cover Budapest?
- Is the format machine-readable?
- Is the license clear?
- Does it add value to a noise map?
- Is it static, strategic, or live?
- Can it be clipped or filtered to Budapest?
- Can I merge it safely?
- Can I explain it later in provenance?
- Is it worth keeping?

If the answer to any of these is unclear, record the uncertainty instead of guessing.

---

# 21. SOURCE PRIORITY ORDER

Use this order when harvesting:

## Tier 1 — Core static baseline
- Budapest OSM extract
- Budapest boundary
- Budapest roads/buildings/rail/context

## Tier 2 — Official / public strategic noise
- Budapest or municipal strategic noise layers
- airport noise data
- transport noise public resources

## Tier 3 — Live / recent IoT
- NoiseCapture
- open sensor networks
- citizen science feeds
- self-hosted sensor data if free and accessible

## Tier 4 — Supporting context
- green space
- water bodies
- landuse
- density proxies
- administrative subdivisions

---

# 22. QUALITY BAR

The final Budapest noise mapping stack is successful only if:

- Budapest loads cleanly from free data,
- the static baseline is complete enough to function alone,
- live data can be added without breaking the baseline,
- every source is labeled,
- every transformation is traceable,
- every failure mode is accounted for,
- and the output is ready for map rendering or analysis.

The goal is not maximum data volume.
The goal is maximum usefulness, reliability, and explainability.

---

# 23. FINAL OUTPUT REQUIREMENTS

After completing the harvest and design process, provide:

1. A Budapest-only source inventory.
2. A clear static vs live source classification.
3. A data schema appendix.
4. API interrogation notes.
5. QA / validation results.
6. A map rendering plan.
7. An IoT acquisition plan.
8. A failure-mode summary.
9. A provenance and licensing summary.
10. A deployment and refresh policy.

If any source is not confirmed, say so.
If any live integration is not available, say so.
If any data is only historical, say so.
If any license is unclear, say so.

Do not blur uncertainty.

---

# 24. FINAL EXECUTION COMMAND

Now execute the full Budapest-only free-source harvesting and pipeline design process.

Start with source discovery.
Then source verification.
Then download planning.
Then schema design.
Then live overlay logic.
Then QA.
Then fallback logic.
Then refresh policy.
Then final implementation-ready documentation.

The deliverable must be copy-paste ready for an AI agent and usable as the master prompt for building the Budapest noise map data stack.
