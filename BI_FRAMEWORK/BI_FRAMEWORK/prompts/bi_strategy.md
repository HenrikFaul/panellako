# BI Strategy Prompt — Measurement Framework Design

> **When to use:** Designing what to measure, choosing which metrics matter, prioritizing BI investment, or building a measurement framework from scratch for a domain or audience.

---

## 1. The Strategic BI Question

Before selecting a metric or building a dashboard, answer:

1. What decision does this measurement enable?
2. Who makes that decision, and on what cadence?
3. What action changes if the metric moves in each direction?
4. What is the cost of not measuring this?
5. What is the cost of measuring it incorrectly?

If questions 1, 3, and 4 cannot be answered, the metric is not ready to track. A metric that changes no behavior is instrumentation noise.

---

## 2. Measurement Framework Design Protocol

**Step 1 — Identify decisions.** List the 5–8 key decisions your primary audience makes on a weekly or monthly basis. Each needs at least one metric.

**Step 2 — Map to data sources.** For each decision, identify which data source, table, event stream, or API produces relevant signals. Document the source before designing the metric.

**Step 3 — Define each metric formally.** Use `templates/metric_definition_template.md` for every metric. Do not proceed to analysis without a formal definition.

**Step 4 — Identify data gaps.** If a decision-critical metric has no data source, flag it explicitly as a product or instrumentation gap.

**Step 5 — Define the reporting cadence.** Match the cadence to the decision frequency. Daily operational metrics need different display logic than monthly strategic metrics.

**Step 6 — Set baselines before targets.** Identify the earliest available data for each metric. Establish a baseline before setting a target. Targets set without baselines are arbitrary.

**Step 7 — Define alert thresholds.** For each operationally critical metric, define a threshold that triggers investigation — not just a report. Document thresholds in the metric definition.

---

## 3. Metric Priority Tiers

Apply this three-tier structure when deciding which metrics to analyze or include in a report.

**Tier 1 — Operational health** (Is anything broken right now?)
Metrics that signal immediate problems. Reviewed daily or in real-time. Examples: error rate, SLA breach count, active coverage gaps, failed transactions.

**Tier 2 — Performance trend** (Are we improving or declining?)
Metrics that show direction over time. Reviewed weekly. Examples: conversion rate, absence rate, churn rate, feature adoption.

**Tier 3 — Strategic health** (Where are we vs. where we need to be?)
Metrics requiring longer time horizons and cross-segment analysis. Reviewed monthly or quarterly. Examples: customer lifetime value, annual retention cohort, market share proxy, platform growth rate.

---

## 4. Leading vs. Lagging Indicator Mapping

For every lagging metric your team tracks, identify at least one leading indicator:

| Lagging metric | Candidate leading indicators |
|---|---|
| Customer churn | Declining login frequency, support ticket spike, feature abandonment |
| Revenue decline | Pipeline drop, trial-to-paid conversion fall, average contract value compression |
| Operational failure | Error rate trend, queue depth growth, SLA near-miss rate |
| Workforce issue | Engagement score decline, absence rate rise, voluntary overtime acceptance fall |
| Compliance failure | Audit trail gaps, policy acknowledgement rate decline, violation frequency rise |

Document confirmed leading indicator relationships in `prompts/predictive_signals.md`.

---

## 5. BI Anti-Patterns to Avoid

- **Denominator blindness.** Measuring counts without accounting for population size changes.
- **Cohort contamination.** Mixing cohorts with different entry conditions in the same analysis.
- **Version-naive trending.** Plotting a metric over time without checking whether a software change affected it during the period.
- **Survey response bias.** Treating engagement or satisfaction scores from < 40% response rates as representative.
- **Vanity metric trap.** Tracking metrics that look impressive but do not connect to decisions.
- **Dashboard sprawl.** Adding metrics without removing obsolete ones — every metric on a dashboard demands attention that should go elsewhere.

---

## 6. Output Format

```
BI Strategy Output
─────────────────────────────────────────────────────────
Scope: [domain / audience / product area]
Version: [software version this was produced against]

Decision inventory:
  [Decision 1]: needs metric(s) — [metric name(s)]
  [Decision 2]: needs metric(s) — [metric name(s)]

Metric priority tiers:
  Tier 1 (operational health): [metrics]
  Tier 2 (performance trend): [metrics]
  Tier 3 (strategic health): [metrics]

Leading indicators mapped:
  [Lagging metric] ← [leading indicator(s)]

Data gaps identified:
  [Decision] requires [metric] — no data source identified — gap type: [instrumentation / access / definition]

Reporting cadence:
  Daily: [metrics]
  Weekly: [metrics]
  Monthly/quarterly: [metrics]

Open questions:
  [What must be resolved before this framework is reliable]
─────────────────────────────────────────────────────────
```
