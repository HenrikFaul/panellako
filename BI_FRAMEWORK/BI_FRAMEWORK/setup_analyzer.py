#!/usr/bin/env python3
"""
BI_FRAMEWORK Setup Analyzer
================================
Deep-scans your repository to auto-fill SYSTEM.md Project Context.

Reads from (relative to repo root):
  CHANGELOG.md, README.md, package.json
  app/ or src/    docs/           supabase/migrations/
  versioning/     growth_strategy/  valuation/

Outputs:
  SYSTEM.md              — Section 1 Project Context pre-filled
  setup_report.md        — full scan findings + what still needs review

Usage (run from inside BI_FRAMEWORK/ or anywhere):
  python setup_analyzer.py
  python setup_analyzer.py --repo-root /path/to/your/repo
  python setup_analyzer.py --dry-run      # preview only, writes nothing
"""

import os
import re
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime
from collections import Counter, defaultdict

# ─── Read limits (prevent runaway on huge repos) ──────────────────────────────
MAX_FILE_KB   = 80       # KB per file
MAX_DIR_FILES = 50       # max files examined per directory tree
MAX_LINE_LEN  = 400      # truncate very long lines
MAX_MIGRATION = 20       # max migration SQL files to read

# ─── Signal tables ────────────────────────────────────────────────────────────

DOMAIN_SIGNALS = {
    "HR / workforce management": [
        "shift", "schedul", "absence", "wtd", "employee", "staffing",
        "headcount", "leave", "payroll", "workforce", "working time",
        "rota", "roster", "timesheet", "work hour", "working hour",
    ],
    "SaaS / B2B platform": [
        "tenant", "workspace", "subscription", "onboarding", "churn",
        "mrr", "arr", "plan tier", "license", "seat", "saas",
    ],
    "ecommerce": [
        "order", "product catalog", "inventory", "cart", "checkout",
        "fulfillment", "shipping", "sku", "storefront",
    ],
    "fintech / financial services": [
        "transaction", "payment", "ledger", "accounting",
        "invoice", "settlement", "banking",
    ],
    "healthcare": [
        "patient", "hipaa", "clinical", "appointment", "ehr",
        "health record", "diagnosis", "care pathway",
    ],
    "logistics / supply chain": [
        "delivery", "warehouse", "shipment", "tracking",
        "carrier", "supply chain", "route optimiz",
    ],
}

BUSINESS_MODEL_SIGNALS = {
    "B2B SaaS subscription": [
        "tenant", "workspace", "organization", "subscription",
        "plan tier", "arr", "mrr", "enterprise plan", "license seat",
    ],
    "B2C subscription": [
        "free trial", "monthly plan", "individual plan", "premium plan",
    ],
    "marketplace": [
        "marketplace", "supplier", "buyer", "bid", "listing", "vendor",
    ],
    "transactional": [
        "per transaction", "transaction fee", "pay per use", "usage billing",
    ],
}

REGULATORY_SIGNALS = {
    "GDPR": ["gdpr", "data protection", " eu ", "privacy regulation", "dsgvo", "lawful basis"],
    "HIPAA": ["hipaa", "health data", " phi ", "protected health information"],
    "SOX": ["sox", "sarbanes", "financial reporting compliance", "internal control"],
    "FCA": ["fca", "financial conduct authority", "mifid"],
}

AUDIENCE_SIGNALS = {
    "founders / executives": ["ceo", "founder", "executive", "board", "c-suite", "leadership"],
    "product managers": ["product manager", " pm ", "product team", "product owner", "roadmap"],
    "HR leaders": [" hr ", "human resource", "people team", "people ops", "chro"],
    "finance": ["cfo", "finance team", "financial planning", "controller"],
    "operations": ["operations", "ops team", "operational manager"],
    "investors": ["investor", " vc ", "due diligence", "fundrais", "series"],
}

TECH_SIGNALS = {
    "Supabase (PostgreSQL + Edge Functions)": [
        "supabase", "@supabase/supabase-js", "createClient", "supabase.from",
    ],
    "React / TypeScript": [
        "\"react\"", "typescript", ".tsx", "useState", "useEffect", "React.FC",
    ],
    "Next.js": ["next.js", "nextjs", "next/app", "next/router", "getServerSideProps"],
    "Vue.js / Nuxt": ["\"vue\"", "nuxt", "defineComponent", "ref()", "reactive("],
    "Node.js / Express": ["express()", "fastify", "koa", "\"express\""],
    "Python / FastAPI": ["fastapi", "flask", "django", "sqlalchemy", "pydantic"],
    "PostgreSQL": ["postgres", "pgsql", "pg.", "psql", "CREATE TABLE"],
    "BigQuery": ["bigquery", "google-cloud/bigquery", "dataset.table"],
    "dbt": ["dbt", "data build tool", "dbt run", "dbt test"],
    "Prisma": ["prisma", "prisma.client", "@prisma/client"],
    "Vite": ["vite", "defineConfig", "vite.config"],
    "Capacitor (mobile)": ["capacitor", "@capacitor/core", "capacitor.config"],
}

# Metrics we actively look for in changelogs, docs, and code
METRIC_PATTERNS = [
    (r'\bMAU\b',                           "Monthly Active Users (MAU)"),
    (r'\bDAU\b',                           "Daily Active Users (DAU)"),
    (r'\bWAU\b',                           "Weekly Active Users (WAU)"),
    (r'\bMRR\b',                           "Monthly Recurring Revenue (MRR)"),
    (r'\bARR\b',                           "Annual Recurring Revenue (ARR)"),
    (r'\bNPS\b',                           "Net Promoter Score (NPS)"),
    (r'\bCSAT\b',                          "Customer Satisfaction Score (CSAT)"),
    (r'\bLTV\b|\bCLV\b',                   "Customer Lifetime Value (LTV/CLV)"),
    (r'\bCAC\b',                           "Customer Acquisition Cost (CAC)"),
    (r'\bARPU\b',                          "Average Revenue Per User (ARPU)"),
    (r'\bchurn.?rate\b',                   "Churn rate"),
    (r'\bretention.?rate\b',               "Retention rate"),
    (r'\bconversion.?rate\b',              "Conversion rate"),
    (r'\badoption.?rate\b',                "Feature adoption rate"),
    (r'\babsence.?rate\b',                 "Absence rate"),
    (r'\bturnover.?rate\b',                "Turnover/attrition rate"),
    (r'\bengagement.?score\b',             "Engagement score"),
    (r'\bfill.?rate\b',                    "Fill rate / coverage rate"),
    (r'\bSLA.?breach\b|\bSLA.?complian',  "SLA breach / compliance rate"),
    (r'\berror.?rate\b',                   "Error rate"),
    (r'\bburn.?rate\b',                    "Burn rate"),
    (r'\bgross.?margin\b',                 "Gross margin"),
    (r'\bheadcount\b',                     "Headcount"),
    (r'\boverlap.?rate\b',                 "Overlap rate"),
    (r'\bWTD\b',                           "Working-time directive compliance (WTD)"),
    (r'\btime.to.value\b',                 "Time to value"),
    (r'\bonboarding.?completion\b',        "Onboarding completion rate"),
    (r'\bactive.workspace\b',              "Active workspace count"),
    (r'\bpayroll.?accuracy\b',             "Payroll accuracy rate"),
]

# SQL table extraction
SQL_TABLE_RE = re.compile(
    r'(?:CREATE TABLE|create table)\s+(?:IF NOT EXISTS\s+)?(?:public\.)?(\w+)',
    re.IGNORECASE,
)
SQL_VIEW_RE = re.compile(
    r'(?:CREATE(?:\s+OR\s+REPLACE)?\s+VIEW|create.*view)\s+(?:public\.)?(\w+)',
    re.IGNORECASE,
)


# ─── File reading helpers ──────────────────────────────────────────────────────

def safe_read(path: Path, max_kb: int = MAX_FILE_KB) -> str:
    """Read a file up to max_kb kilobytes, returning text or empty string."""
    try:
        size = path.stat().st_size
        limit = max_kb * 1024
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read(limit)
        if size > limit:
            text += f"\n[...truncated at {max_kb}KB of {size // 1024}KB...]"
        # Truncate crazy-long lines
        lines = [l[:MAX_LINE_LEN] for l in text.splitlines()]
        return "\n".join(lines)
    except Exception:
        return ""


def scan_directory(
    root: Path,
    extensions: tuple = (".md", ".ts", ".tsx", ".js", ".json", ".sql", ".py", ".txt"),
    max_files: int = MAX_DIR_FILES,
    skip_dirs: tuple = ("node_modules", ".git", "dist", "build", ".cache", "__pycache__"),
) -> list[tuple[Path, str]]:
    """Walk a directory and return (path, content) pairs up to max_files."""
    results = []
    if not root.exists():
        return results
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in skip_dirs]
        for fname in filenames:
            if len(results) >= max_files:
                return results
            fpath = Path(dirpath) / fname
            if fpath.suffix.lower() in extensions:
                content = safe_read(fpath)
                if content:
                    results.append((fpath, content))
    return results


# ─── Signal scoring ───────────────────────────────────────────────────────────

def score_signals(text: str, signal_map: dict[str, list[str]]) -> dict[str, int]:
    """Return a score per category based on keyword hits in text."""
    text_lower = text.lower()
    scores: dict[str, int] = {}
    for category, keywords in signal_map.items():
        count = sum(text_lower.count(kw.lower()) for kw in keywords)
        if count > 0:
            scores[category] = count
    return scores


def top_category(scores: dict[str, int], min_score: int = 1) -> str | None:
    """Return the category with the highest score above min_score."""
    if not scores:
        return None
    best = max(scores, key=scores.__getitem__)
    return best if scores[best] >= min_score else None


# ─── Corpus builder ───────────────────────────────────────────────────────────

class RepoCorpus:
    """Reads all target paths and accumulates text + structured findings."""

    def __init__(self, repo_root: Path):
        self.root = repo_root
        self.full_text = ""          # concatenated corpus for signal scoring
        self.changelog_text = ""
        self.package_json: dict = {}
        self.migration_tables: list[str] = []
        self.migration_views: list[str] = []
        self.versioning_files: list[str] = []
        self.doc_files: list[str] = []
        self.source_files: list[str] = []
        self.growth_text = ""
        self.valuation_text = ""
        self.file_summary: list[str] = []   # human-readable scan log
        self.detected_metrics: set[str] = set()
        self.versions_found: list[str] = []

    # ── Individual scanners ──

    def _add(self, label: str, text: str):
        self.full_text += "\n" + text
        self.file_summary.append(label)

    def read_root_files(self):
        for fname in ("CHANGELOG.md", "README.md"):
            fpath = self.root / fname
            if fpath.exists():
                content = safe_read(fpath)
                self._add(f"  ✓ {fname} ({len(content)//1024+1}KB)", content)
                if fname == "CHANGELOG.md":
                    self.changelog_text = content

        pkg = self.root / "package.json"
        if pkg.exists():
            try:
                self.package_json = json.loads(pkg.read_text(encoding="utf-8"))
                self._add("  ✓ package.json", json.dumps(self.package_json))
            except Exception:
                pass

    def read_changelog(self):
        # Also read CHANGELOG from common alternative locations
        for alt in ("docs/CHANGELOG.md", "CHANGES.md", "HISTORY.md"):
            p = self.root / alt
            if p.exists() and not self.changelog_text:
                content = safe_read(p)
                self.changelog_text = content
                self._add(f"  ✓ {alt}", content)

    def read_versioning(self):
        vdir = self.root / "versioning"
        if not vdir.exists():
            self.file_summary.append("  ✗ versioning/ — not found")
            return
        files = scan_directory(vdir, extensions=(".md", ".txt"), max_files=30)
        self.file_summary.append(f"  ✓ versioning/ — {len(files)} files")
        for fpath, content in files:
            self.versioning_files.append(content)
            self._add(f"    {fpath.name}", content)

    def read_supabase(self):
        sdir = self.root / "supabase"
        if not sdir.exists():
            self.file_summary.append("  ✗ supabase/ — not found")
            return

        # Config
        config = sdir / "config.toml"
        if config.exists():
            self._add("  ✓ supabase/config.toml", safe_read(config))

        # Migrations — extract table/view names
        mdir = sdir / "migrations"
        if mdir.exists():
            sql_files = sorted(mdir.glob("*.sql"))[:MAX_MIGRATION]
            self.file_summary.append(f"  ✓ supabase/migrations/ — {len(list(mdir.glob('*.sql')))} files, reading {len(sql_files)}")
            for sf in sql_files:
                content = safe_read(sf, max_kb=60)
                self.full_text += "\n" + content
                for m in SQL_TABLE_RE.findall(content):
                    if m not in ("IF", "EXISTS", "public"):
                        self.migration_tables.append(m)
                for m in SQL_VIEW_RE.findall(content):
                    if m not in ("IF", "EXISTS", "OR", "REPLACE", "public"):
                        self.migration_views.append(m)

        # Edge functions
        fdir = sdir / "functions"
        if fdir.exists():
            files = scan_directory(fdir, extensions=(".ts", ".js"), max_files=20)
            self.file_summary.append(f"  ✓ supabase/functions/ — {len(files)} files")
            for _, content in files:
                self._add("", content)

    def read_source(self):
        # Try app/ first, then src/ — some repos use one or both
        found = False
        for src_name in ("app", "src"):
            sdir = self.root / src_name
            if sdir.exists():
                files = scan_directory(
                    sdir,
                    extensions=(".ts", ".tsx", ".js", ".jsx", ".vue"),
                    max_files=MAX_DIR_FILES,
                )
                self.file_summary.append(f"  ✓ {src_name}/ — {len(files)} source files sampled")
                for fpath, content in files:
                    self.source_files.append(content)
                    self._add(f"    {fpath.relative_to(self.root)}", content)
                found = True
        if not found:
            self.file_summary.append("  ✗ app/ and src/ — neither found")

    def read_docs(self):
        ddir = self.root / "docs"
        if not ddir.exists():
            self.file_summary.append("  ✗ docs/ — not found")
            return
        files = scan_directory(ddir, extensions=(".md", ".txt", ".json"), max_files=30)
        self.file_summary.append(f"  ✓ docs/ — {len(files)} files")
        for fpath, content in files:
            self.doc_files.append(content)
            self._add(f"    {fpath.name}", content)

    def read_growth_strategy(self):
        gdir = self.root / "growth_strategy"
        if not gdir.exists():
            self.file_summary.append("  ✗ growth_strategy/ — not found")
            return
        files = scan_directory(gdir, extensions=(".md", ".txt", ".json"), max_files=20)
        self.file_summary.append(f"  ✓ growth_strategy/ — {len(files)} files")
        for _, content in files:
            self.growth_text += "\n" + content
            self._add("", content)

    def read_valuation(self):
        vdir = self.root / "valuation"
        if not vdir.exists():
            self.file_summary.append("  ✗ valuation/ — not found")
            return
        files = scan_directory(vdir, extensions=(".md", ".txt", ".json"), max_files=20)
        self.file_summary.append(f"  ✓ valuation/ — {len(files)} files")
        for _, content in files:
            self.valuation_text += "\n" + content
            self._add("", content)

    # ── Post-scan extraction ──

    def extract_metrics(self):
        for pattern, label in METRIC_PATTERNS:
            if re.search(pattern, self.full_text, re.IGNORECASE):
                self.detected_metrics.add(label)

    def extract_versions(self):
        version_re = re.compile(r'v(\d+\.\d+\.\d+)', re.IGNORECASE)
        self.versions_found = version_re.findall(self.changelog_text or self.full_text)

    def run_all(self):
        self.file_summary.append("Root files:")
        self.read_root_files()
        self.read_changelog()
        self.file_summary.append("versioning/:")
        self.read_versioning()
        self.file_summary.append("supabase/:")
        self.read_supabase()
        self.file_summary.append("app/ or src/:")
        self.read_source()
        self.file_summary.append("docs/:")
        self.read_docs()
        self.file_summary.append("growth_strategy/:")
        self.read_growth_strategy()
        self.file_summary.append("valuation/:")
        self.read_valuation()
        self.extract_metrics()
        self.extract_versions()


# ─── Inference engine ─────────────────────────────────────────────────────────

class ContextInference:
    """Derives SYSTEM.md Section 1 values from corpus signals."""

    def __init__(self, corpus: RepoCorpus):
        self.c = corpus
        self.inferences: dict[str, tuple[str, str]] = {}  # key → (value, confidence)

    def _infer(self, key: str, value: str, confidence: str):
        self.inferences[key] = (value, confidence)

    def run(self) -> dict[str, tuple[str, str]]:
        corpus = self.c
        text = corpus.full_text

        # ── Project name ──────────────────────────────────────────────────────
        name = None
        if corpus.package_json.get("name"):
            raw = corpus.package_json["name"]
            name = raw.replace("-", " ").replace("_", " ").title()
            self._infer("project_name", name, "high — from package.json")
        else:
            # Try first H1 in README or CHANGELOG
            for m in re.finditer(r'^#\s+(.+)', text, re.MULTILINE):
                candidate = m.group(1).strip()
                if len(candidate) < 80 and "changelog" not in candidate.lower():
                    self._infer("project_name", candidate, "medium — from README/CHANGELOG H1")
                    name = candidate
                    break
        if not name:
            self._infer("project_name", "[YOUR PROJECT NAME]", "low — not detected")

        # ── Domain ────────────────────────────────────────────────────────────
        domain_scores = score_signals(text, DOMAIN_SIGNALS)
        domain = top_category(domain_scores, min_score=3)
        if domain:
            score = domain_scores[domain]
            self._infer("domain", domain, f"high — {score} signal hits")
        else:
            self._infer("domain", "[SaaS / ecommerce / HR / fintech / logistics / healthcare / other]", "low — not detected")

        # ── Business model ────────────────────────────────────────────────────
        bm_scores = score_signals(text, BUSINESS_MODEL_SIGNALS)
        bm = top_category(bm_scores, min_score=2)
        if bm:
            self._infer("business_model", bm, f"high — {bm_scores[bm]} signal hits")
        else:
            self._infer("business_model", "[B2B / B2C / marketplace / subscription / transactional]", "low — not detected")

        # ── Audiences ─────────────────────────────────────────────────────────
        aud_scores = score_signals(text, AUDIENCE_SIGNALS)
        audiences = sorted(aud_scores.items(), key=lambda x: -x[1])[:4]
        if audiences:
            aud_str = " / ".join(a for a, _ in audiences)
            self._infer("primary_audiences", aud_str, f"high — {len(audiences)} detected")
        else:
            self._infer("primary_audiences", "[founders / executives / product / HR / operations / investors]", "low")

        # ── Version history ───────────────────────────────────────────────────
        version_locations = []
        if (corpus.root / "CHANGELOG.md").exists():
            version_locations.append("CHANGELOG.md")
        if (corpus.root / "versioning").exists() and corpus.versioning_files:
            version_locations.append(f"versioning/ folder ({len(corpus.versioning_files)} files)")
        if version_locations:
            self._infer("version_history_location", " + ".join(version_locations), "high — files confirmed present")
        else:
            self._infer("version_history_location", "[CHANGELOG.md / Git tags / release notes / path]", "low")

        # ── Current version ───────────────────────────────────────────────────
        if corpus.versions_found:
            latest = corpus.versions_found[0]
            self._infer("current_version", f"v{latest}", "high — from changelog")
        else:
            pkg_version = corpus.package_json.get("version")
            if pkg_version:
                self._infer("current_version", f"v{pkg_version}", "high — from package.json")
            else:
                self._infer("current_version", "[not detected]", "low")

        # ── Schema / migration history ────────────────────────────────────────
        mig_path = corpus.root / "supabase" / "migrations"
        if mig_path.exists():
            count = len(list(mig_path.glob("*.sql")))
            self._infer("schema_history", f"supabase/migrations/ ({count} SQL migration files)", "high — confirmed")
        elif (corpus.root / "migrations").exists():
            self._infer("schema_history", "migrations/ folder", "high — confirmed")
        elif re.search(r'dbt', text, re.IGNORECASE):
            self._infer("schema_history", "dbt models — check dbt/ folder", "medium")
        else:
            self._infer("schema_history", "[migrations/ folder / DBT / schema files / path]", "low")

        # ── Primary data source ───────────────────────────────────────────────
        tech_scores = score_signals(text, TECH_SIGNALS)
        tech_found = sorted(tech_scores.items(), key=lambda x: -x[1])
        data_source_candidates = []
        for tech, _ in tech_found:
            if any(kw in tech for kw in ("Supabase", "PostgreSQL", "BigQuery", "Prisma")):
                data_source_candidates.append(tech)
        if data_source_candidates:
            self._infer("primary_data_source", data_source_candidates[0], f"high — {tech_scores.get(data_source_candidates[0], 0)} signal hits")
        else:
            self._infer("primary_data_source", "[database type and connection context]", "low")

        # ── Tech stack (full list) ────────────────────────────────────────────
        tech_stack = [t for t, _ in tech_found[:6]]
        if tech_stack:
            self._infer("tech_stack", ", ".join(tech_stack), "medium — from signal detection")

        # ── Dashboard / reporting layer ───────────────────────────────────────
        dashboard_signals = {
            "Metabase": ["metabase"],
            "Looker / LookML": ["looker", "lookml"],
            "Grafana": ["grafana"],
            "Redash": ["redash"],
            "Superset": ["superset"],
            "Custom React dashboard": ["dashboard", "chart", "recharts", "chart.js", "d3"],
            "Tableau": ["tableau"],
        }
        ds_scores = score_signals(text, dashboard_signals)
        ds = top_category(ds_scores, min_score=2)
        if ds:
            self._infer("dashboard_layer", ds, f"medium — {ds_scores[ds]} signal hits")
        else:
            self._infer("dashboard_layer", "[tool or component path — e.g. Metabase / Looker / custom src/components/dashboard/]", "low")

        # ── Regulatory context ────────────────────────────────────────────────
        reg_scores = score_signals(text, REGULATORY_SIGNALS)
        regs = [r for r, s in reg_scores.items() if s >= 2]
        if regs:
            self._infer("regulatory_context", " / ".join(regs), f"high — {sum(reg_scores.values())} signal hits")
        else:
            self._infer("regulatory_context", "none detected — verify manually", "low")

        # ── PII aggregation ───────────────────────────────────────────────────
        if re.search(r'\bGDPR\b|\bDSGVO\b|\bprivacy\b', text, re.IGNORECASE):
            self._infer("pii_aggregation", "team (N ≥ 5 recommended) — verify with legal", "medium")
        else:
            self._infer("pii_aggregation", "[individual / team N≥X / department]", "low")

        # ── Database tables (top unique, meaningful ones) ─────────────────────
        tables = list(dict.fromkeys(corpus.migration_tables))  # deduplicate, preserve order
        # Filter out noise
        skip = {"schema_migrations", "spatial_ref_sys", "ar_internal_metadata",
                 "schema_migration", "migrations", "flyway_schema_history"}
        tables = [t for t in tables if t.lower() not in skip and len(t) > 2]
        self._infer("db_tables_detected", ", ".join(tables[:25]) if tables else "none", "high — from migration SQL")

        views = list(dict.fromkeys(corpus.migration_views))
        self._infer("db_views_detected", ", ".join(views[:15]) if views else "none", "high — from migration SQL")

        # ── Seasonal patterns ─────────────────────────────────────────────────
        seasonal_re = re.compile(r'season|holiday|christmas|summer|winter|quarter.?end|month.?end', re.IGNORECASE)
        if seasonal_re.search(text):
            self._infer("seasonal_patterns", "seasonal effects detected in corpus — populate prompts/seasonal_pattern_library.md", "medium")
        else:
            self._infer("seasonal_patterns", "not yet documented — populate prompts/seasonal_pattern_library.md", "low")

        # ── Multi-tenancy ─────────────────────────────────────────────────────
        if re.search(r'\btenant\b|\bworkspace\b|\borg_id\b|\borganization_id\b', text, re.IGNORECASE):
            self._infer("multi_tenancy", "yes — workspace/tenant scoped (confirm RLS policy)", "high")
        else:
            self._infer("multi_tenancy", "[yes / no — describe scope isolation]", "low")

        return self.inferences


# ─── Output generators ────────────────────────────────────────────────────────

CONTEXT_BLOCK_RE = re.compile(
    r'(## 1\. Project Context\s*\n(?:[^\n]*\n)*?)(```\n)(.*?)(```)',
    re.DOTALL,
)


def build_context_block(inf: dict[str, tuple[str, str]]) -> str:
    """Produce the filled Project Context code block content."""

    def v(key: str, fallback: str = "[not detected]") -> str:
        return inf.get(key, (fallback, ""))[0]

    db_tables = v("db_tables_detected")
    db_views  = v("db_views_detected")
    data_source_detail = v("primary_data_source")
    if db_tables and db_tables != "none":
        data_source_detail += f"\n  Key tables: {db_tables}"
    if db_views and db_views != "none":
        data_source_detail += f"\n  Key views:  {db_views}"

    tech_stack = v("tech_stack", "[not detected]")

    block = f"""Project name: {v("project_name")}
Domain: {v("domain")}
Business model: {v("business_model")}
Primary BI audiences: {v("primary_audiences")}
Multi-tenancy: {v("multi_tenancy")}

Version history location: {v("version_history_location")}
Current version: {v("current_version")}
Schema/migration history: {v("schema_history")}
Primary data source: {data_source_detail}
Tech stack: {tech_stack}
Dashboard/reporting layer: {v("dashboard_layer")}

Regulatory context: {v("regulatory_context")}
PII minimum aggregation: {v("pii_aggregation")}

Seasonal patterns: {v("seasonal_patterns")}
Metric catalog: [populate templates/metric_definition_template.md — detected metrics listed in setup_report.md]
"""
    return block.strip()


def update_system_md(bi_framework_path: Path, context_block: str, dry_run: bool) -> bool:
    """Replace Section 1 code fence in SYSTEM.md with filled context block."""
    system_md = bi_framework_path / "SYSTEM.md"
    if not system_md.exists():
        print(f"  ERROR: {system_md} not found.")
        return False
    original = system_md.read_text(encoding="utf-8")
    match = CONTEXT_BLOCK_RE.search(original)
    if not match:
        print("  WARNING: Could not locate Section 1 code block in SYSTEM.md — skipping update.")
        return False
    new_content = (
        original[: match.start(3)]
        + context_block + "\n"
        + original[match.end(3):]
    )
    if dry_run:
        print("\n── SYSTEM.md Section 1 (would be written) ──────────────────────")
        print(context_block)
        print("────────────────────────────────────────────────────────────────\n")
    else:
        system_md.write_text(new_content, encoding="utf-8")
        print(f"  ✓ SYSTEM.md updated — Section 1 pre-filled.")
    return True


def build_report(
    corpus: RepoCorpus,
    inferences: dict[str, tuple[str, str]],
    context_block: str,
    repo_root: Path,
    bi_framework_path: Path,
) -> str:
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines = [
        f"# BI Framework Setup Report",
        f"",
        f"Generated: {now}",
        f"Repository root: `{repo_root}`",
        f"",
        f"---",
        f"",
        f"## Files Scanned",
        f"",
    ]
    lines += [f"```", *corpus.file_summary, f"```", f""]

    lines += [
        f"---",
        f"",
        f"## Inferences (auto-filled into SYSTEM.md Section 1)",
        f"",
        f"| Field | Detected value | Confidence |",
        f"|---|---|---|",
    ]
    display_keys = [
        "project_name", "domain", "business_model", "primary_audiences",
        "version_history_location", "current_version", "schema_history",
        "primary_data_source", "tech_stack", "dashboard_layer",
        "regulatory_context", "pii_aggregation", "multi_tenancy",
        "seasonal_patterns",
    ]
    for key in display_keys:
        val, conf = inferences.get(key, ("[not detected]", "low"))
        val_short = val[:80] + "..." if len(val) > 80 else val
        lines.append(f"| {key} | {val_short} | {conf} |")

    # DB tables
    val, conf = inferences.get("db_tables_detected", ("none", "low"))
    lines.append(f"| db_tables_detected | {val[:80]}{'...' if len(val)>80 else ''} | {conf} |")
    val, conf = inferences.get("db_views_detected", ("none", "low"))
    lines.append(f"| db_views_detected | {val[:80]}{'...' if len(val)>80 else ''} | {conf} |")

    lines += [
        f"",
        f"---",
        f"",
        f"## Detected Metrics",
        f"",
        f"These metrics were mentioned in the scanned corpus. Create a formal definition",
        f"for each in `templates/metric_definition_template.md`.",
        f"",
    ]
    if corpus.detected_metrics:
        for m in sorted(corpus.detected_metrics):
            lines.append(f"- [ ] {m}")
    else:
        lines.append("_No standard metric keywords detected. Add metrics manually._")

    # DB table list
    tables = list(dict.fromkeys(corpus.migration_tables))
    skip = {"schema_migrations", "spatial_ref_sys", "ar_internal_metadata",
             "schema_migration", "migrations", "flyway_schema_history"}
    tables = [t for t in tables if t.lower() not in skip and len(t) > 2]
    if tables:
        lines += [
            f"",
            f"---",
            f"",
            f"## Database Tables Detected (from migration SQL)",
            f"",
            f"These are potential data sources for your metrics.",
            f"",
        ]
        for t in tables:
            lines.append(f"- `{t}`")
        views = list(dict.fromkeys(corpus.migration_views))
        if views:
            lines += [f"", f"### Views / Computed sources", f""]
            for v in views:
                lines.append(f"- `{v}`")

    lines += [
        f"",
        f"---",
        f"",
        f"## What Still Needs Manual Review",
        f"",
    ]
    manual = []
    for key in display_keys:
        _, conf = inferences.get(key, ("[not detected]", "low"))
        if "low" in conf or "not detected" in conf:
            manual.append(f"- **{key}** — could not be auto-detected; fill in `SYSTEM.md` Section 1 manually")
    if manual:
        lines += manual
    else:
        lines.append("All fields were detected with at least medium confidence.")

    lines += [
        f"",
        f"---",
        f"",
        f"## Next Steps",
        f"",
        f"1. Review `SYSTEM.md` Section 1 — correct any wrong inferences.",
        f"2. Complete `templates/metric_definition_template.md` for each detected metric.",
        f"3. Populate `prompts/seasonal_pattern_library.md` with your domain's seasonal patterns.",
        f"4. Set warning and critical thresholds for each operational metric.",
        f"5. Define your reporting cadence (which metrics are reviewed daily / weekly / monthly).",
        f"",
        f"Then start every BI session with:",
        f"",
        f'> "Read BI_FRAMEWORK/SYSTEM.md first. Apply the discovery protocol before any output."',
    ]

    return "\n".join(lines)


# ─── Entry point ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Auto-fill BI_FRAMEWORK/SYSTEM.md from repository scan.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--repo-root",
        default=None,
        help="Path to repository root. Default: parent directory of this script.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print results without writing any files.",
    )
    args = parser.parse_args()

    # Resolve paths
    script_dir = Path(__file__).parent.resolve()
    if args.repo_root:
        repo_root = Path(args.repo_root).resolve()
    else:
        repo_root = script_dir.parent  # BI_FRAMEWORK/ is one level inside repo

    bi_framework_path = script_dir

    print(f"\nBI Framework Setup Analyzer")
    print(f"════════════════════════════════════════════")
    print(f"Repository root : {repo_root}")
    print(f"BI_FRAMEWORK at : {bi_framework_path}")
    print(f"Mode            : {'DRY RUN (no files written)' if args.dry_run else 'WRITE'}")
    print(f"════════════════════════════════════════════\n")

    # Build corpus
    print("Scanning repository...")
    corpus = RepoCorpus(repo_root)
    corpus.run_all()
    print(f"  Corpus size: {len(corpus.full_text):,} chars from {sum(1 for l in corpus.file_summary if l.strip().startswith('✓'))} sources")

    # Infer values
    print("\nRunning inference engine...")
    engine = ContextInference(corpus)
    inferences = engine.run()

    # Build context block
    context_block = build_context_block(inferences)

    # Update SYSTEM.md
    print("\nUpdating SYSTEM.md...")
    update_system_md(bi_framework_path, context_block, args.dry_run)

    # Write report
    report = build_report(corpus, inferences, context_block, repo_root, bi_framework_path)
    report_path = bi_framework_path / "setup_report.md"
    if args.dry_run:
        print("\n── setup_report.md (preview) ────────────────────────────────────")
        print(report[:2000])
        if len(report) > 2000:
            print(f"  ... [{len(report) - 2000} chars omitted in preview]")
        print("────────────────────────────────────────────────────────────────")
    else:
        report_path.write_text(report, encoding="utf-8")
        print(f"  ✓ setup_report.md written ({len(report):,} chars)")

    # Summary
    print(f"\n── Detection Summary ────────────────────────────────────────────")
    high = sum(1 for _, (_, c) in inferences.items() if "high" in c)
    med  = sum(1 for _, (_, c) in inferences.items() if "medium" in c)
    low  = sum(1 for _, (_, c) in inferences.items() if "low" in c)
    print(f"  High confidence  : {high} fields")
    print(f"  Medium confidence: {med} fields")
    print(f"  Low / manual req : {low} fields")
    print(f"  Metrics detected : {len(corpus.detected_metrics)}")
    print(f"  DB tables found  : {len([t for t in corpus.migration_tables if t.lower() not in {'schema_migrations','spatial_ref_sys'}])}")
    print(f"  DB views found   : {len(corpus.migration_views)}")
    print(f"\nDone. {'Review setup_report.md for details.' if not args.dry_run else 'Run without --dry-run to apply.'}\n")


if __name__ == "__main__":
    main()
