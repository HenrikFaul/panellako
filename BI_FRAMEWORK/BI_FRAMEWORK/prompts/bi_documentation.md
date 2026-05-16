# BI Documentation Prompt — Metric Artifacts, Decision Capture, Knowledge Preservation

> **When to use:** Documenting a new metric, recording a BI decision, capturing an analysis finding for institutional memory, or producing a formal BI artifact that will be referenced in future sessions.

---

## 1. BI Documentation Principles

BI knowledge degrades in three ways:
1. **Definition drift** — Metric definitions evolve without being recorded, causing disagreements about what a number means.
2. **Decision amnesia** — The reasoning behind a BI design choice is lost, and future analysts re-litigate settled questions.
3. **Context loss** — Analysis findings are forgotten, and the same investigation is repeated.

The documents produced under this prompt prevent all three failure modes.

---

## 2. Document Types

### Type 1 — Metric Definition Record
Use when: a new metric is being established or an existing one is being formally defined.

Required fields (see `templates/metric_definition_template.md`):
- Metric name (canonical, human-readable)
- Owner (team or role responsible for the definition)
- Version introduced (when this definition became active)
- Definition (formula, source table, inclusion/exclusion rules)
- Polarity (higher = better / lower = better / context-dependent)
- Baseline and target (if established)
- Warning and critical thresholds (if defined)
- Review cadence (when should this definition be revisited?)

### Type 2 — BI Decision Record
Use when: a significant analytical decision was made (e.g., choosing a metric definition over an alternative, deciding to exclude a population, choosing a time window).

Required fields:
- Decision: [what was decided]
- Date: [when]
- Options considered: [what alternatives were evaluated]
- Rationale: [why this option was chosen]
- Trade-offs accepted: [what was sacrificed]
- Who decided: [role or team]
- Review trigger: [what circumstance should cause this decision to be revisited]

### Type 3 — Analysis Finding Record
Use when: a significant BI finding should be preserved for future reference.

Required fields:
- Finding: [concise statement of what was discovered]
- Metric(s): [which metrics were involved]
- Period: [time window of the analysis]
- Evidence: [what data supported the finding]
- Confidence: [high / medium / low — with reason]
- Version context: [software version at time of analysis]
- Implications: [what this means for future analyses or decisions]
- Expiry: [when should this finding be reviewed for continued validity?]

### Type 4 — Data Quality Issue Record
Use when: a data quality problem was found and needs to be tracked.

Required fields:
- Issue: [description of the problem]
- Metric affected: [which metric(s)]
- Period affected: [which time range contains bad data]
- Root cause: [if known]
- Status: [open / in remediation / resolved]
- Workaround: [how to handle this data until resolved]
- Resolution owner: [team or role]

### Type 5 — Version Impact Record
Use when: a software release affected one or more metrics.

Required fields:
- Version: [release version]
- Release date: [when]
- Metrics affected: [list]
- Nature of impact: [definition change / scope change / computation fix / backfill]
- Direction of impact: [metric goes up / down / changes character]
- Historical data affected: [yes — from what date / no]
- Analyst note: [what analysts need to know when interpreting data across this release boundary]

---

## 3. Output Format

```
BI Documentation Record — Type [1/2/3/4/5]
─────────────────────────────────────────────────────────
Document type: [Metric Definition / BI Decision / Analysis Finding / Data Quality Issue / Version Impact]
Created: [date]
Version context: [software version]
Author: [role]

[Content using the required fields for the chosen document type — see Section 2]

Review date: [when this record should be revisited]
Related documents: [other records, changelog entries, or templates this links to]
─────────────────────────────────────────────────────────
```

---

## 4. Naming Convention

Store documentation artifacts with consistent names to enable retrieval:

```
[YYYYMMDD]_[type]_[metric-or-subject-slug].[version].md

Examples:
20260101_metric-def_monthly-active-users_v1.md
20260301_bi-decision_cohort-entry-point.md
20260415_finding_churn-spike-q1.md
20260501_data-quality_billing-table-gap.md
20260601_version-impact_v3.12.0_retention-formula-change.md
```
