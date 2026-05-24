# Ultra-Brutal Claude Code Prompt for Correct Transit Route and Stop Visualization on Map

## Role

You are an expert **transit data engineer, GTFS parser, route topology resolver, map visualization architect, and route-detail UI designer**. Your job is to read a GTFS-like feed and produce a transit map experience that correctly renders:
- route paths,
- route details,
- stop sequences,
- direction-specific variants,
- stop ordering,
- branch/loop/short-turn structures,
- and route overlays on the map.

You must treat this as a **high-stakes transit visualization correctness task**. Visual beauty is secondary. **Data correctness and directional clarity are the top priority.**

---

## Core Goal

Build a map-based transit route display that correctly shows:
1. The route geometry on the map.
2. The exact stop order for the selected direction.
3. Direction-specific differences in stop sets.
4. Correct route detail lists without duplicate stops.
5. Correct handling of routes where outbound and inbound patterns are not symmetric.
6. Correct handling of routes where the stop system differs by direction.
7. Correct handling of branches, short turns, loops, and split patterns.
8. Correct matching between `trips.txt`, `stop_times.txt`, `shapes.txt`, and `stops.txt`.

The result must **not**:
- duplicate stops because both directions were merged incorrectly,
- show the same stop twice just because it appears in two different directions,
- assume stop sets are identical in both directions,
- assume the shape geometry alone defines stop order,
- collapse distinct directional patterns into one merged list.

---

## Input Files You Must Understand

You will work with the following feed files:

- `calendar_dates.txt`
- `pathways.txt`
- `translations.txt`
- `stop_times.txt`
- `trips.txt`
- `routes.txt`
- `stops.txt`
- `agency.txt`
- `feed_info.txt`
- `shapes.txt`

You must treat these as interconnected datasets, not isolated CSVs.

---

## First Principles You Must Follow

### 1. Route identity is not just route_id
A single `route_id` can have:
- multiple directions,
- multiple patterns,
- multiple branches,
- multiple trip variants,
- short-turn variants,
- branch-specific stop sequences,
- asymmetrical inbound/outbound stops.

Therefore, you must never assume:
- one route = one stop list,
- one route = one shape,
- one route = one direction,
- one route = one unique displayed stop sequence.

You must derive a **route pattern layer** and a **direction layer**.

---

### 2. Direction matters
For each route, you must distinguish:
- `direction_id = 0`
- `direction_id = 1`

But do not stop there. You must also detect when:
- multiple trips share the same direction but still use different stop sequences,
- there are branch variants within the same direction,
- a route is circular or semi-circular,
- a route has different stop systems depending on peak/off-peak service,
- stop order differs even if the route name looks similar.

Never render a merged stop list unless the data proves the sequences are truly identical.

---

### 3. Shapes are not stop lists
`shapes.txt` describes geometry, not semantic stop order by itself.

You must:
- use `shapes.txt` for line geometry,
- use `stop_times.txt` for stop sequence truth,
- use `stops.txt` for stop coordinates and names,
- and reconcile them instead of trusting one source alone.

If shape geometry and stop sequence conflict visually, the stop sequence wins for stop ordering, while shape geometry wins for map path rendering.

---

### 4. Duplicate stop prevention is mandatory
A stop should **not appear duplicated** in the UI just because:
- it is part of both directions,
- it appears once in outbound and once in inbound,
- it has the same name but different stop_id,
- or the route is being shown with both directional variants.

You must implement a **deduplication and grouping logic** that:
- groups by semantic stop identity when appropriate,
- but still preserves distinct physical stops if they are truly different locations,
- and preserves direction-specific stop order without merging everything into one repeated list.

If the same stop appears in both directions:
- show it once in the route summary if the UI is route-wide,
- or show it once per direction if the UI is direction-specific,
- but never show duplicate entries inside the same direction list unless the route truly revisits the same physical stop and the sequence requires it.

---

## Required Data Interpretation Logic

You must build a deterministic route interpretation pipeline with the following stages.

### Stage 1 — Feed inventory
Inspect and summarize:
- route definitions from `routes.txt`,
- agency metadata from `agency.txt`,
- feed metadata from `feed_info.txt`,
- stop catalog from `stops.txt`,
- trip definitions from `trips.txt`,
- schedule and stop order from `stop_times.txt`,
- service validity from `calendar_dates.txt`,
- geometry from `shapes.txt`,
- translations from `translations.txt`,
- pedestrian transfers / pathways from `pathways.txt` if relevant.

### Stage 2 — Trip grouping
Group trips by:
- `route_id`,
- `direction_id`,
- `shape_id`,
- stop sequence signature,
- and, if needed, a pattern hash based on ordered stop_ids.

Trips with the same route and direction may still be different patterns. Detect that.

### Stage 3 — Pattern extraction
For each route and direction:
- extract the canonical ordered stop pattern,
- detect whether there are multiple canonical patterns,
- detect branch variants,
- detect short-turn variants,
- detect loop routes,
- detect expressed / limited-stop variants if they exist,
- detect direction-specific terminal differences.

### Stage 4 — Geometry matching
Match trip patterns to shapes:
- identify which `shape_id` corresponds to which stop sequence,
- map the sequence to the shape polyline,
- detect if a stop is geographically close to the shape path,
- detect if a stop belongs to the displayed trip path or to another branch.

### Stage 5 — UI route detail generation
Generate the route detail list:
- direction-specific,
- stop-order accurate,
- deduplicated,
- branch-aware,
- and visually readable.

---

## The Critical Problem You Must Solve

The current broken behavior is:

- the left-side panels show route details more correctly,
- the map shows a polyline route correctly,
- but the route panel on the right duplicates stops,
- and the system incorrectly merges outbound and inbound stop sets,
- causing repeated stop names and an inaccurate sequence.

You must fix this with a strict interpretation system.

---

## Rules for Asymmetric Routes

You must explicitly support routes where:
- outbound and inbound use different stops,
- outbound and inbound use different stop ordering,
- some stops exist only in one direction,
- transfer stops differ by direction,
- the physical path is not symmetrical,
- one direction may contain detours or slight divergences.

For such routes:
1. Do not force the outbound stop sequence into the inbound sequence.
2. Do not force the inbound stop sequence into the outbound sequence.
3. Show each direction as a separate pattern unless the data proves they are identical.
4. If the route has common stops, preserve them but do not duplicate them inside one direction list.
5. If the two directions share a stop name but not a physical stop, treat them carefully and show them as distinct if coordinates differ meaningfully.

---

## Rules for Branches, Loops, and Short Turns

If the route has:
- branch A / branch B,
- loop segments,
- circular routing,
- short-turn variants,
- partial trips,
- turnback stops,
- deadheading legs that should not be shown,

then you must:
- detect them,
- separate them into patterns,
- annotate them clearly in the UI,
- never flatten them into a single line of stops,
- never silently merge them into one duplicate stop list.

For loops:
- stop order may revisit the same stop.
- That is allowed if and only if the trip sequence requires it.
- But you must explain that this is a loop/return structure, not a duplicate rendering bug.

For short turns:
- show the truncated stop list clearly,
- do not append the full route beyond the short-turn endpoint,
- do not display inaccessible future stops as if they belong to the current trip.

---

## Required Visualization Behavior

### On the map
Render:
- the selected route polyline,
- stop markers along the current direction only,
- direction-specific styling,
- terminal markers,
- branch markers if applicable,
- and a clear visual distinction between route variants.

The map should:
- not become cluttered,
- not show duplicated stop markers for the same direction,
- not mix inbound and outbound stop markers unless the user explicitly requests both,
- not misrepresent asymmetrical stop systems.

### In the sidebar / detail panel
Render:
- route name,
- operator / agency,
- service validity,
- selected direction,
- stop list in exact order,
- direction-specific terminal names,
- any branch / variant labels,
- and any special notes about asymmetry.

The stop list must:
- use a clean order,
- use bullet/step numbering if needed,
- avoid duplicated entries from the opposite direction,
- and show only the relevant stops for the active variant.

---

## Direction-Specific Stop Deduplication Rules

You must implement these exact rules:

1. If the same `stop_id` appears multiple times in the same direction because the route legitimately revisits it, keep it only if the repeated visit is part of the trip structure.
2. If the same `stop_id` appears in both directions, do not merge them into one list when showing a direction-specific view.
3. If the same `stop_name` appears with different `stop_id`s and different coordinates, do not assume they are the same stop.
4. If the same `stop_name` appears in both directions but the coordinates differ only slightly, determine whether they are:
   - the same platform/station complex,
   - or two physically distinct stops.
5. If the UI is showing a route overview, show a deduplicated semantic summary.
6. If the UI is showing a direction detail panel, show the exact direction pattern only.

---

## Required Heuristics for Stop Identity

You must define a practical stop identity logic using:
- `stop_id`,
- `stop_name`,
- `stop_lat`,
- `stop_lon`,
- proximity thresholds,
- trip sequence position,
- and route/direction context.

Important:
- name equality alone is not enough,
- coordinate equality alone is not enough,
- both together are often sufficient,
- but some transit systems have multiple platforms with similar names.

You should build a stop identity hierarchy such as:
- physical stop identity,
- semantic stop identity,
- display stop identity.

---

## Required Use of Each File

### `routes.txt`
Use for:
- route metadata,
- route short/long name,
- route type,
- route color if present,
- branding or descriptor fields if available.

### `trips.txt`
Use for:
- route-to-trip mapping,
- `direction_id`,
- `shape_id`,
- pattern grouping,
- service variant detection.

### `stop_times.txt`
Use for:
- authoritative stop sequence,
- stop order,
- arrival/departure sequence,
- trip-by-trip route pattern extraction.

### `stops.txt`
Use for:
- stop coordinates,
- stop labels,
- stop metadata,
- display name resolution,
- stop identity matching.

### `shapes.txt`
Use for:
- route geometry,
- line drawing,
- map polyline visualization,
- trip/shape matching.

### `calendar_dates.txt`
Use for:
- service availability,
- service exceptions,
- whether a trip is active on the requested service date.

### `pathways.txt`
Use for:
- pedestrian connections,
- station internal circulation,
- multi-platform transfer logic,
- if you are showing detailed station connectivity.

### `translations.txt`
Use for:
- localized route names,
- localized stop names,
- localized UI labels if present.

### `agency.txt`
Use for:
- operator identity,
- branding,
- agency display name.

### `feed_info.txt`
Use for:
- feed validity,
- versioning,
- publisher info.

---

## Rendering Requirements for Claude Code

You must generate code or implementation logic that:
- parses the feed robustly,
- groups trips by route and direction correctly,
- distinguishes patterns,
- prevents stop duplication,
- renders a clean map route,
- renders correct stop details,
- and supports route asymmetry.

The implementation must be defensive:
- if data is incomplete, do not hallucinate a merged stop list,
- if directions differ, preserve that difference,
- if a route has multiple patterns, expose them separately.

---

## UI/UX Requirements

The final UI should support:

- selecting a route,
- switching direction,
- switching variant/pattern,
- viewing exact stops for that direction only,
- and seeing the route on the map without duplicates.

The UI should make it obvious whether the user is viewing:
- full route overview,
- direction 0,
- direction 1,
- branch A,
- branch B,
- short-turn variant,
- or loop variant.

---

## Output Requirements

You must produce:
1. A correct parsing and pattern grouping strategy.
2. A route visualization strategy that respects direction and geometry.
3. A stop rendering strategy that avoids duplicates.
4. A route detail panel strategy that lists stops correctly.
5. A branch/loop/short-turn handling strategy.
6. Clear comments in code explaining how asymmetry is handled.
7. If needed, a small data model proposal for:
   - route,
   - trip pattern,
   - direction pattern,
   - stop list,
   - shape polyline,
   - display variant.

---

## Hard Constraints

Do NOT:
- merge inbound and outbound stop lists into one duplicated list,
- assume symmetric stop systems,
- assume a route has only one canonical stop sequence,
- render the same stop twice in a single direction list unless the sequence truly revisits it,
- ignore `direction_id`,
- ignore `shape_id`,
- ignore `stop_times.txt`,
- ignore route variants,
- silently hide data conflicts.

DO:
- preserve route truth,
- preserve directional differences,
- preserve branch differences,
- preserve route-specific naming,
- preserve stop-order correctness,
- preserve visual clarity,
- and deduplicate only when deduplication is semantically correct.

---

## Final Mental Model You Must Use

Think like this:

> “A transit route is not a single line. It is a family of patterns.
> Each pattern has a direction.
> Each direction has a stop order.
> Each stop order may differ.
> Each shape may differ.
> The UI must show the exact pattern that corresponds to the chosen trip, not a merged fantasy.”

That is the core rule.

---

## Expected Result

I expect you to produce a clean implementation and visualization logic that:
- renders the route line correctly,
- shows the exact stop order for the selected direction,
- does not duplicate stops,
- handles different inbound/outbound stop systems,
- and correctly visualizes route detail data on the map and in the sidebar.

Use the provided GTFS files properly and do not simplify away the hard transit topology problems.

End of prompt.
