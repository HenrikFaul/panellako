from __future__ import annotations

import csv
import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOTS = [
    Path(r"C:\Users\Lenovo\Documents\GitHub\governance\gsd"),
    Path(r"C:\Users\Lenovo\Documents\GitHub\governance\AI_PROMPTING_FOLDERSTRUCTURE"),
]
OUT = Path(r"C:\Users\Lenovo\Documents\GitHub\governance\AI_PROMPTING_FOLDERSTRUCTURE\qa-automation\full-stack-e2e-prompt-ecosystem")
OUT_PREFIX = str(OUT).lower()
EXTS = {".md", ".prompt", ".txt", ".json", ".yml", ".yaml", ".jsonl", ".csv"}
GENERATED_AT = "2026-05-20"

CATEGORIES = {
    "frontend": "frontend react vue svelte nextjs next.js component client browser route page form click submit playwright cypress".split(),
    "backend": "backend api endpoint server controller service fastapi express django flask node java go http rest graphql".split(),
    "ui": "ui ux widget button modal toast form field validation aria accessibility".split() + ["screen reader", "design system"],
    "sql": "sql database postgres postgresql mysql sqlite schema migration ddl dml query join index table row transaction null".split(),
    "renderer": "renderer render ssr csr hydration dom canvas screenshot viewport".split() + ["visual regression", "layout shift"],
    "data_feed": "feed ingest ingestion etl pipeline csv jsonl batch sync import export stream".split() + ["data feed"],
    "visualization": "visualization visualisation chart graph map grid dashboard plot d3 recharts echarts".split() + ["table view"],
    "hosting_vercel_aws": "hosting deploy deployment vercel netlify aws lambda s3 cloudfront cloudwatch docker 404 500 timeout healthcheck".split() + ["github actions", "ci/cd"],
    "kafka": "kafka topic broker consumer producer offset partition".split() + ["event stream", "dead letter", "dlq", "schema registry"],
    "data_provider": "provider upstream datasource".split() + ["data provider", "source api", "external api", "third party", "third-party", "file source", "csv source", "api source"],
    "verification": "test tests testing verify verification validation checklist acceptance regression smoke e2e unit integration qa".split(),
    "security": "security auth authorization authentication jwt cookie csrf xss injection rls secret permission".split(),
    "performance": "performance latency load stress throughput timeout cache memory cpu".split() + ["rate limit", "cold start"],
}

SCORING = {
    "edge_cases": "edge edge-case empty blank null undefined invalid boundary min max overflow unicode timezone duplicate race concurrent".split() + ["edge case"],
    "errors": "error exception failure fail timeout 404 500 retry fallback rollback dlq incident crash".split() + ["dead letter"],
    "data_integrity": "integrity consistency schema migration transaction idempotent idempotency duplicate constraint".split() + ["data integrity", "foreign key", "primary key", "referential"],
    "deployment": "deploy deployment hosting vercel aws netlify docker ci cd status rollback dns tls 404 500 timeout".split() + ["github actions", "healthcheck"],
}

EDGE_CASES = [
    "Empty input, missing optional fields, and required-field violations.",
    "Wrong data type, malformed JSON, malformed CSV, and unexpected enum value.",
    "Boundary values: min, max, zero, negative, very long strings, and large payloads.",
    "Unicode, locale, timezone, currency, date parsing, and daylight-saving transitions.",
    "Duplicate submissions, double clicks, refresh during save, and retry after partial success.",
    "Concurrent edits and stale client state.",
    "Slow network, offline transition, rate limit, and request cancellation.",
    "Unauthorized, expired session, permission downgrade, and tenant mismatch.",
    "Missing upstream data, empty dataset, out-of-order events, and late-arriving records.",
    "Renderer stress: small mobile viewport, wide desktop, zoom, long labels, and overflow.",
]

FAILURES = [
    "Backend returns 400/401/403/404/409/422 with a structured error body.",
    "Backend returns 500/502/503 or times out.",
    "SQL migration, constraint, transaction, or query error.",
    "Data provider returns stale, missing, duplicated, or schema-incompatible data.",
    "Kafka producer/consumer lag, duplicate event, out-of-order event, or DLQ route.",
    "Visualization receives empty, partial, negative, NaN, or extremely large values.",
    "Deployment route returns 404, static asset fails, or serverless cold start exceeds budget.",
    "CI/CD check fails, environment variable is absent, or rollback target is unhealthy.",
]

DATA_CHECKS = [
    "Trace a canonical record from input UI/API through database rows, event payloads, derived feeds, and rendered UI.",
    "Verify schema compatibility, required fields, constraints, referential integrity, and migration safety.",
    "Check idempotency, duplicate suppression, ordering guarantees, and retry semantics.",
    "Compare source-provider values with transformed application values and visualized aggregates.",
    "Validate test data generation for valid, invalid, boundary, duplicate, and adversarial records.",
]

DEPLOY_CHECKS = [
    "Verify the deployment URL, preview URL, and route health checks.",
    "Check 404, 500, timeout, DNS/TLS, static asset, and serverless cold-start behavior.",
    "Inspect CI/CD status, build logs, environment variables, and rollback readiness.",
    "Confirm frontend assets and backend/API endpoints point to the same environment.",
    "Capture deployment evidence before marking the flow verified.",
]

CARDINAL = {
    "frontend_e2e_verification.md": ("Frontend E2E Verification", "frontend, UI, backend contract, renderer, data flow, deployment", "frontend-driven user journeys and downstream full-stack effects", [
        "Identify critical UI flows, forms, buttons, links, route transitions, and client validations.",
        "Verify every interaction sends the expected backend request and handles success, validation, auth, and server errors.",
        "Confirm frontend state, URL state, cache state, toasts, empty states, loading states, and accessibility states.",
        "Trace submitted data into SQL/data provider/event stream and back into rendered UI or visualization.",
        "Run browser checks across mobile, tablet, desktop, and degraded network conditions.",
    ]),
    "backend_api_test_strategy.prompt": ("Backend API Test Strategy", "backend, API, validation, SQL, events, deployment", "backend APIs, service logic, persistence, and contract behavior", [
        "Inventory endpoints, methods, request schemas, response schemas, auth rules, and error contracts.",
        "Test success, validation, auth, permission, not-found, conflict, rate-limit, and server-error paths.",
        "Verify generated SQL or ORM behavior against the expected data model and indexes.",
        "Confirm API side effects: database writes, emitted events, cache invalidation, and provider calls.",
        "Run API tests locally and against deployed preview/staging when available.",
    ]),
    "kafka_event_flow_verification.prompt": ("Kafka Event Flow Verification", "Kafka/event stream, backend, data feed, SQL, observability", "event production, consumption, ordering, retries, and downstream state", [
        "Inventory topics, partitions, schemas, producers, consumers, consumer groups, offsets, and DLQ topics.",
        "Verify event schema compatibility, keying strategy, ordering expectations, and idempotency.",
        "Test producer success/failure, consumer retry, poison message, duplicate message, and delayed message behavior.",
        "Trace event-driven state changes into SQL, caches, data feeds, UI, and visualizations.",
        "If Kafka is absent, mark it not applicable and verify any substitute queue, webhook, or event bus.",
    ]),
    "data_provider_integrity_check.prompt": ("Data Provider Integrity Check", "data provider, data feed, API/CSV/DB/file source, backend, SQL", "upstream data providers and transformations into application state", [
        "Inventory provider contracts, authentication, rate limits, pagination, schemas, and freshness guarantees.",
        "Verify API, CSV, DB, file, and batch ingestion paths with valid and invalid source records.",
        "Compare source data with normalized records, derived metrics, and rendered results.",
        "Check missing data, stale data, duplicate data, schema drift, provider outage, and replay behavior.",
        "Validate audit logs, source timestamps, transformation errors, and reconciliation reports.",
    ]),
    "visualization_rendering_verification.prompt": ("Visualization Rendering Verification", "visualization, renderer, UI, data integrity, accessibility", "charts, maps, grids, dashboards, and renderer fidelity", [
        "Inventory charts, maps, tables, grids, dashboards, legends, filters, drilldowns, and export actions.",
        "Verify numeric correctness from raw data to aggregate values, labels, axes, colors, and tooltips.",
        "Test empty, sparse, dense, negative, null, NaN, huge, and long-label datasets.",
        "Check SSR/CSR/hydration behavior, responsive layout, accessibility labels, and visual regression snapshots.",
        "Use screenshot comparison or DOM/canvas pixel checks where visual correctness matters.",
    ]),
    "deployment_and_hosting_check.prompt": ("Deployment And Hosting Check", "hosting/Vercel/AWS, CI/CD, routing, runtime configuration", "deployment, hosting, environment, route, and runtime health", [
        "Inventory hosting target, preview/staging/production URLs, CI/CD workflow, build command, runtime, and env vars.",
        "Verify build, lint, test, typecheck, migration, and deployment checks before claiming readiness.",
        "Check route health for frontend pages, API routes, static assets, serverless functions, and redirects.",
        "Validate environment-specific configuration, secrets presence, CORS, provider endpoints, and rollback path.",
        "Do not deploy to production or change DNS/secrets without explicit approval; verify existing deployments safely.",
    ]),
    "end_to_end_full_stack_verification.prompt": ("End To End Full Stack Verification", "all layers", "complete full-stack product behavior from request to deployed system", [
        "Build a layer map covering frontend, backend, UI, SQL/data model, renderer, data feed, visualization, hosting, Kafka/event stream, data provider, security, and performance.",
        "Define a happy-path, edge-path, failure-path, recovery-path, and deployment-path test matrix for each critical workflow.",
        "Run code, config, database, event, provider, UI, and deployment checks iteratively until each acceptance criterion has evidence.",
        "Score every prompt/test module and improve anything below 80/100 before finalizing.",
        "Produce a final evidence report with commands, results, screenshots/logs, changed files, residual risks, and blocked dependencies.",
    ]),
}

MODULES = {
    "frontend_event_handling.prompt": ("Frontend Event Handling", "frontend/UI/backend contract", "frontend events and backend response handling", ["Map clicks, submits, keyboard actions, route changes, uploads, and filter changes to network calls.", "Assert payloads, debounce, cancellation, loading state, optimistic update, toast, inline error, and retry UX."]),
    "frontend_edge_cases.prompt": ("Frontend Edge Cases", "frontend/UI edge cases", "client-side edge cases before and after backend calls", ["Generate 10-20 UI and data edge cases for every form, list, detail view, and wizard.", "Verify state persistence across reload, navigation, cache invalidation, and session changes."]),
    "frontend_ui_validation.prompt": ("Frontend UI Validation", "UI validation/accessibility", "form and widget validation behavior", ["Check required fields, type validation, length limits, cross-field validation, disabled states, and aria error descriptions.", "Verify validation parity between client and backend."]),
    "backend_api_test.prompt": ("Backend API Test", "backend/API", "HTTP API contracts and behavior", ["Test endpoint status codes, headers, schemas, auth, permissions, pagination, sorting, filtering, and idempotency.", "Verify error payloads are stable and useful for frontend rendering."]),
    "backend_sql_integration.prompt": ("Backend SQL Integration", "backend/SQL", "backend-generated SQL and persisted data", ["Trace API inputs to SQL queries, migrations, constraints, indexes, rows, and rendered output.", "Test transaction boundaries, rollback behavior, null handling, duplicates, and referential integrity."]),
    "backend_validation.prompt": ("Backend Validation", "backend validation", "server-side data validation", ["Verify type, length, enum, range, format, auth, tenant, and business-rule validation.", "Confirm invalid input never reaches unsafe SQL, provider calls, or event emission."]),
    "ui_element_interaction.prompt": ("UI Element Interaction", "UI", "buttons, fields, menus, widgets, and flows", ["Inventory all interactive controls and verify visible, hover, focus, disabled, loading, selected, empty, and error states.", "Check keyboard operation and screen-reader semantics."]),
    "ui_error_handling.prompt": ("UI Error Handling", "UI/backend failures", "error display and recovery UX", ["Verify inline errors, page-level errors, toasts, retry actions, empty states, forbidden states, and not-found states.", "Confirm errors do not hide recovery paths or corrupt local state."]),
    "sql_data_integrity.prompt": ("SQL Data Integrity", "SQL/data model", "database correctness and consistency", ["Check migrations, constraints, indexes, relationships, nullability, seed data, fixture data, and rollback plan.", "Compare API responses and UI renders with persisted canonical rows."]),
    "test_data_generation.prompt": ("Test Data Generation", "test data", "valid, invalid, edge, and adversarial data", ["Generate fixtures for happy path, invalid input, boundary values, duplicates, missing fields, stale provider data, and event replay.", "Keep fixtures deterministic, documented, and safe for local/preview environments."]),
    "sql_edge_cases.prompt": ("SQL Edge Cases", "SQL edge cases", "database edge cases and query safety", ["Test nulls, empty strings, whitespace, unicode, large text, min/max numeric values, duplicate keys, orphaned rows, and transaction conflicts.", "Validate query performance and index usage on realistic data volume."]),
    "rendering_validation.prompt": ("Rendering Validation", "renderer", "SSR/CSR/rendered DOM fidelity", ["Verify SSR, CSR, hydration, loading, error, empty, responsive, overflow, and screenshot states.", "Check layout stability across viewport sizes and slow data loads."]),
    "visualization_validity.prompt": ("Visualization Validity", "visualization", "chart/map/grid correctness", ["Verify chart values, labels, units, axes, legends, tooltips, filtering, drilldowns, colors, and export output.", "Test empty, sparse, dense, negative, huge, null, and NaN datasets."]),
    "deployment_validation.prompt": ("Deployment Validation", "deployment", "deployment health and route status", ["Check build artifacts, route status, API status, asset loading, logs, environment variables, secrets presence, redirects, and rollback readiness.", "Verify 404, 500, timeout, DNS/TLS, cold start, and provider connectivity."]),
    "hosting_edge_cases.prompt": ("Hosting Edge Cases", "hosting", "hosting, CDN, serverless, and CI/CD edge cases", ["Test cache invalidation, CDN stale content, serverless cold start, memory pressure, rate limits, missing env var, region outage, and failed rollback.", "Validate graceful user-facing degradation when hosting or provider layers fail."]),
}


def under(path: Path, parent: Path) -> bool:
    return str(path).lower().startswith(OUT_PREFIX)


def read_text(path: Path):
    data = path.read_bytes()
    if b"\x00" in data[:4096]:
        return None, "binary-null"
    if data:
        sample = data[:8192]
        controls = sum(1 for b in sample if b < 32 and b not in (9, 10, 13))
        if controls / len(sample) > 0.05:
            return None, "binary-control"
    for enc in ("utf-8-sig", "utf-8", "utf-16", "cp1250", "cp1252", "latin-1"):
        try:
            return data.decode(enc), enc
        except UnicodeDecodeError:
            pass
    return None, "decode-failed"


def hits(text: str, terms: list[str]) -> int:
    low = text.lower()
    total = 0
    for term in terms:
        total += low.count(term.lower())
    return total


def relative(path: Path) -> str:
    for root in ROOTS:
        try:
            return root.name + "/" + path.relative_to(root).as_posix()
        except ValueError:
            pass
    return path.as_posix()


def categorize(rel: str, text: str):
    haystack = (rel + "\n" + text[:200000]).lower()
    raw = {cat: hits(haystack, terms) for cat, terms in CATEGORIES.items()}
    max_score = max(raw.values()) if raw else 0
    cats = [cat for cat, value in raw.items() if value > 0 and (value >= 2 or value == max_score)]
    return cats or ["uncategorized"], raw


def score(text: str, cats: list[str]):
    metric = {name: hits(text, terms) for name, terms in SCORING.items()}
    category_count = len([cat for cat in cats if cat != "uncategorized"])
    coverage = min(40, round((category_count / 13) * 40))
    edge = min(20, round(math.log1p(metric["edge_cases"]) / math.log(16) * 20)) if metric["edge_cases"] else 0
    errors = min(15, round(math.log1p(metric["errors"]) / math.log(12) * 15)) if metric["errors"] else 0
    integrity = min(15, round(math.log1p(metric["data_integrity"]) / math.log(12) * 15)) if metric["data_integrity"] else 0
    deployment = min(10, round(math.log1p(metric["deployment"]) / math.log(10) * 10)) if metric["deployment"] else 0
    return {
        "total": min(100, coverage + edge + errors + integrity + deployment),
        "coverage": coverage,
        "edge_cases": edge,
        "errors": errors,
        "data_integrity": integrity,
        "deployment": deployment,
    }


def collect():
    rows, skipped = [], []
    for root in ROOTS:
        for path in root.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in EXTS or under(path, OUT):
                continue
            text, enc = read_text(path)
            rel = relative(path)
            if text is None:
                skipped.append({"path": rel, "reason": enc})
                continue
            cats, cat_scores = categorize(rel, text)
            rows.append({
                "path": rel,
                "extension": path.suffix.lower(),
                "bytes": path.stat().st_size,
                "encoding": enc,
                "line_count": text.count("\n") + 1,
                "categories": cats,
                "category_scores": cat_scores,
                "score": score(text.lower(), cats),
            })
    return rows, skipped


def write(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def table(rows: list[dict], headers: list[str]) -> str:
    out = ["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
    for row in rows:
        out.append("| " + " | ".join(str(row.get(h, "")).replace("|", "\\|") for h in headers) + " |")
    return "\n".join(out)


def bullets(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items)


def header(title: str, layer: str) -> str:
    return f"""# {title}

Generated: {GENERATED_AT}
Layer: {layer}
Minimum score: 80/100 before the prompt may be considered production-ready.
Default iteration budget: 10 iterations, extendable to 100 while defects remain.
Edge-case budget: 10-20 edge cases per impacted layer.
Failure budget: 5-10 failure modes per impacted layer.
Deployment statuses to verify: 200/3xx, 400/401/403, 404, 409, 422, 429, 500, 502/503, timeout, DNS/TLS failure, cold start, rollback state.

Use this as an execution prompt for an AI developer/tester. Do not claim success from inspection only. Record commands, screenshots, API responses, database checks, event-stream checks, and deployment evidence. Do not perform destructive production actions or publish externally without explicit approval.
"""


def body(focus: str, checks: list[str]) -> str:
    return f"""
## Goal
Create, run, and iterate an end-to-end verification plan for {focus}. The verification must connect frontend, backend, UI, SQL/data model, renderer, data feed, visualization, hosting/Vercel/AWS, Kafka/event stream, and data provider behavior whenever those layers exist in the target system.

## Scope Checklist
{bullets(checks)}

## Iterative Loop
1. Discover architecture, routes, APIs, schemas, data feeds, event topics, deployment targets, and verification commands.
2. Map every user-facing workflow to backend calls, persistence, event emission/consumption, renderer behavior, and deployment status.
3. Generate or update tests before changing product code when feasible.
4. Run the narrowest relevant checks first, then the full end-to-end flow.
5. Score the prompt/test plan with the rubric below. If the score is below 80/100, improve the prompt/tests and repeat.
6. Continue until failing evidence is resolved or a blocked dependency is documented with exact reproduction details.

## Required Edge Cases
{bullets(EDGE_CASES)}

## Required Failure Modes
{bullets(FAILURES)}

## Data Integrity Checks
{bullets(DATA_CHECKS)}

## Deployment And Hosting Checks
{bullets(DEPLOY_CHECKS)}

## Scoring Rubric
- Layer coverage: 40 points. Full points require frontend, backend, UI, SQL/data model, renderer, data feed, visualization, hosting, Kafka/event stream, and data provider impacts to be considered or explicitly ruled out.
- Edge cases: 20 points. Full points require 10-20 concrete edge cases for each impacted layer.
- Error and retry behavior: 15 points. Full points require 5-10 failure modes with expected UI/API/data/event behavior.
- Data integrity: 15 points. Full points require persistence, transformations, idempotency, duplicate handling, and cross-layer consistency checks.
- Deployment status: 10 points. Full points require deployment health, route status, API status, asset loading, logs, and timeout behavior to be verified.

## Completion Gate
The work is complete only when evidence shows the code, configuration, tests, data flow, and deployment behave according to specification. If verification cannot be completed, return precise blockers with commands already run, observed results, and the smallest next action.
"""


def main():
    rows, skipped = collect()
    OUT.mkdir(parents=True, exist_ok=True)

    category_index = defaultdict(list)
    ext_counts, score_buckets = Counter(), Counter()
    for row in rows:
        ext_counts[row["extension"]] += 1
        total = row["score"]["total"]
        score_buckets["80-100 strong" if total >= 80 else "60-79 usable" if total >= 60 else "40-59 partial" if total >= 40 else "0-39 weak"] += 1
        for cat in row["categories"]:
            category_index[cat].append(row["path"])

    weakest = sorted(rows, key=lambda r: r["score"]["total"])[:20]
    strongest = sorted(rows, key=lambda r: r["score"]["total"], reverse=True)[:20]
    cat_counts = Counter(cat for row in rows for cat in row["categories"])

    with (OUT / "source_inventory.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["path", "extension", "bytes", "encoding", "line_count", "categories", "score_total", "coverage", "edge_cases", "errors", "data_integrity", "deployment"])
        for row in sorted(rows, key=lambda r: r["path"].lower()):
            s = row["score"]
            writer.writerow([row["path"], row["extension"], row["bytes"], row["encoding"], row["line_count"], ";".join(row["categories"]), s["total"], s["coverage"], s["edge_cases"], s["errors"], s["data_integrity"], s["deployment"]])

    summary = {
        "generated_at": GENERATED_AT,
        "source_roots": [str(root) for root in ROOTS],
        "output_root": str(OUT),
        "included_files": len(rows),
        "skipped_files": len(skipped),
        "extensions": dict(sorted(ext_counts.items())),
        "category_counts": dict(cat_counts.most_common()),
        "score_buckets": dict(score_buckets),
        "weakest_20": [{"path": r["path"], "score": r["score"]["total"], "categories": r["categories"]} for r in weakest],
        "strongest_20": [{"path": r["path"], "score": r["score"]["total"], "categories": r["categories"]} for r in strongest],
        "skipped": skipped[:100],
    }
    write(OUT / "analysis_summary.json", json.dumps(summary, indent=2, ensure_ascii=True))
    write(OUT / "category_index.json", json.dumps({k: sorted(v) for k, v in sorted(category_index.items())}, indent=2, ensure_ascii=True))

    report = [
        "# Prompt Inventory Analysis",
        "",
        f"Generated: {GENERATED_AT}",
        "",
        "## Source Roots",
        *[f"- {root}" for root in ROOTS],
        "",
        "## Scan Result",
        f"- Included text files: {len(rows)}",
        f"- Skipped non-text/binary/decode-failed files: {len(skipped)}",
        f"- Output folder: {OUT}",
        "",
        "## Extension Counts",
        table([{"extension": k, "files": v} for k, v in sorted(ext_counts.items())], ["extension", "files"]),
        "",
        "## Category Counts",
        table([{"category": k, "files": v} for k, v in cat_counts.most_common()], ["category", "files"]),
        "",
        "## Score Buckets",
        table([{"bucket": k, "files": v} for k, v in score_buckets.items()], ["bucket", "files"]),
        "",
        "## What The Existing Corpus Does Well",
        "- Strong governance, execution discipline, prompt structure, QA checklists, and delivery safety language.",
        "- Strong frontend/backend/UI/verification vocabulary across the existing AI prompting structure.",
        "- Useful reusable templates for QA strategy, data integrity checks, accessibility, integration resilience, and performance checks.",
        "- Downloaded GSD repositories add operational, daemon, inbox, documentation, and automation prompt patterns.",
        "",
        "## Main Gaps Found",
        "- Kafka/event-stream verification is underrepresented compared with frontend, backend, UI, and general verification.",
        "- Deployment verification is not always tied to concrete HTTP status, timeout, DNS/TLS, preview URL, log, and rollback evidence gates.",
        "- Data-provider integrity needs stronger source-to-transform-to-render reconciliation prompts.",
        "- Visualization prompts need explicit chart/map/grid correctness, numeric aggregation, empty dataset, NaN, and visual regression checks.",
        "- Weak files are usually narrow notes or raw config/data files; the generated modules can replace them in workflows without overwriting source files.",
        "",
        "## Weakest Scored Files",
        table([{"score": r["score"]["total"], "categories": ", ".join(r["categories"]), "path": r["path"]} for r in weakest], ["score", "categories", "path"]),
        "",
        "## Strongest Scored Files",
        table([{"score": r["score"]["total"], "categories": ", ".join(r["categories"]), "path": r["path"]} for r in strongest], ["score", "categories", "path"]),
    ]
    write(OUT / "prompt_inventory_report.md", "\n".join(report))

    readme = f"""# Full-Stack E2E Prompt Ecosystem

Generated: {GENERATED_AT}

This folder is a generated, replacement-ready AI test prompt ecosystem built from all text prompt/structure files in the requested source roots.

Included source files: {len(rows)}
Skipped non-text/binary files: {len(skipped)}

## Cardinal Prompts
- `frontend_e2e_verification.md`
- `backend_api_test_strategy.prompt`
- `kafka_event_flow_verification.prompt`
- `data_provider_integrity_check.prompt`
- `visualization_rendering_verification.prompt`
- `deployment_and_hosting_check.prompt`
- `end_to_end_full_stack_verification.prompt`

## Analysis Artifacts
- `prompt_inventory_report.md`
- `source_inventory.csv`
- `category_index.json`
- `analysis_summary.json`

Use `end_to_end_full_stack_verification.prompt` as the top-level gate, then call the other cardinal and module prompts as submodules.
"""
    write(OUT / "README.md", readme)

    for filename, spec in CARDINAL.items():
        title, layer, focus, checks = spec
        write(OUT / filename, header(title, layer) + body(focus, checks))

    modules_dir = OUT / "modules"
    for filename, spec in MODULES.items():
        title, layer, focus, checks = spec
        write(modules_dir / filename, header(title, layer) + body(focus, checks))

    controller = f"""# Self Organizing Prompt Ecosystem Controller

Generated: {GENERATED_AT}

## Mission
For every development request, build an end-to-end verification structure that covers frontend, backend, UI, SQL/data model, renderer, data feed, visualization, hosting/Vercel/AWS, Kafka/event stream, data provider, security, and performance layers.

## Iteration Parameters
- Iterations: start with 10, extend up to 100 while defects remain.
- Minimum score: 80/100 for every prompt used as a delivery gate.
- Edge cases: 10-20 per impacted layer.
- Failure modes: 5-10 per impacted layer.
- Deployment states: 200/3xx, 400/401/403, 404, 409, 422, 429, 500, 502/503, timeout, DNS/TLS failure, cold start, rollback state.

## Loop
1. Collect relevant prompts and project files.
2. Categorize each prompt by layer.
3. Score each prompt on coverage, edge cases, errors, data integrity, and deployment.
4. Replace weak prompts in the active workflow with generated module prompts; preserve source files unless explicit overwrite approval exists.
5. Improve strong prompts by adding missing edge cases, exception handling, provider checks, event-stream checks, data-integrity checks, and deployment evidence gates.
6. Run the relevant code/config/test/deployment verification.
7. Repeat until every impacted layer has evidence or a precise blocker is documented.
"""
    write(OUT / "self_organizing_prompt_ecosystem_controller.prompt", controller)

    replacement = f"""# Weak Prompt Replacement Plan

Generated: {GENERATED_AT}

Do not overwrite original source prompts automatically. For active AI delivery work:

- Replace any prompt scoring below 40/100 with the closest module prompt in `modules/`.
- Upgrade any prompt scoring 40-79/100 by merging in missing sections from the relevant cardinal prompt.
- Keep prompts scoring 80/100 or higher, but add project-specific routes, schemas, topics, provider names, and deployment URLs.

## Weakest Files From This Scan
{table([{"score": r["score"]["total"], "categories": ", ".join(r["categories"]), "path": r["path"]} for r in weakest[:15]], ["score", "categories", "path"])}
"""
    write(OUT / "weak_prompt_replacement_plan.md", replacement)

    print(json.dumps({
        "output": str(OUT),
        "included_files": len(rows),
        "skipped_files": len(skipped),
        "score_buckets": dict(score_buckets),
        "generated_files": len([p for p in OUT.rglob("*") if p.is_file()]),
    }, indent=2))


if __name__ == "__main__":
    main()
