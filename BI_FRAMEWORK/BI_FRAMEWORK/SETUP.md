# SETUP.md — Configure This Framework for Your Project

Complete this setup before using any prompt file. It takes 10–30 minutes and makes every subsequent AI session dramatically more accurate and useful. Without it, the AI will ask clarifying questions constantly and produce generic outputs.

---

## Step 1 — Define your project context

Edit `SYSTEM.md` Section 1 (Project Context block) and fill in:

```
Project name: [your product or system name]
Domain: [SaaS / ecommerce / HR / fintech / logistics / healthcare / other]
Business model: [B2B / B2C / marketplace / subscription / transactional]
Primary users of BI outputs: [founders / executives / product managers / HR leaders / operations / investors]
Regulatory context: [GDPR / HIPAA / SOX / FCA / none / describe your compliance obligations]
```

---

## Step 2 — Map your data sources

In `SYSTEM.md` Section 2 (Data Source Map), replace the placeholders with your actual sources:

| Data category | Your source (table / API / file / tool) |
|---|---|
| Primary metrics database | [PostgreSQL / BigQuery / Snowflake / Redshift / other] |
| Version/changelog history | [CHANGELOG.md / Git tags / release notes / Jira] |
| Schema definitions | [migrations folder / DBT models / ERD / schema.sql] |
| Dashboard/reporting layer | [Metabase / Looker / Grafana / custom / component path] |
| Event tracking | [Mixpanel / Segment / Amplitude / custom events table] |
| Financial data | [accounting system / data warehouse / your billing table] |

---

## Step 3 — Build your metric catalog

For every metric your team currently tracks, complete one entry in `templates/metric_definition_template.md`. You do not need all metrics on day 1 — start with your top 10 decision-driving metrics.

A metric without a formal definition cannot be reliably analyzed by this system. The AI will flag undefined metrics rather than guessing.

Priority order for cataloguing:
1. Metrics that appear in board reports or investor updates.
2. Metrics that trigger operational decisions (thresholds, alerts).
3. Metrics that appear on dashboards used daily.
4. Metrics used in any compliance or regulatory reporting.

---

## Step 4 — Configure your version-awareness trigger

The most powerful feature of this framework is version-aware analysis: the AI checks whether a software change (schema migration, feature rollout, computation fix) could explain a metric shift before attributing it to a business cause.

Tell the AI where to find your version history:

```
My version history is located at: [CHANGELOG.md / Git log / release notes location]
My schema migrations are at: [migrations/ folder / DBT / schema files]
My deployment dates are tracked in: [CI/CD pipeline / tag history / manual log]
```

If you do not have a structured changelog: the minimum is a list of deployment dates. Even that enables the AI to check whether a metric shift coincides with a release.

---

## Step 5 — Document your seasonal patterns

Open `prompts/seasonal_pattern_library.md` and add your domain's known seasonal patterns.

Every business has at least 3–5 recurring patterns. Examples by domain:

| Domain | Common patterns |
|---|---|
| SaaS / software | End-of-quarter pipeline spikes, January churn risk, summer low engagement |
| Ecommerce | Holiday season demand, post-holiday return spikes, Black Friday/Cyber Monday |
| HR / workforce | Holiday absence peaks, January hire surge, summer recruitment slowdown |
| Financial services | Month-end/quarter-end transaction spikes, tax season activity |
| Healthcare | Flu season patient volume, holiday staffing pressure |

If you have 12+ months of metric history, you can derive your own seasonal indices from data rather than using intuition.

---

## Step 6 — Set your metric polarity and thresholds

For each metric in your catalog, define:
- **Polarity**: Is higher better, or lower better? (Some metrics are neutral — context-dependent.)
- **Target or benchmark**: What is the expected/goal value?
- **Warning threshold**: When should someone start paying attention?
- **Critical threshold**: When should someone escalate or act immediately?

Without these, the AI can describe metric values but cannot assess whether they are good, bad, or require action.

---

## Step 7 — Define your reporting audiences

In `SYSTEM.md` Section 3 (Audience Registry), define who receives BI outputs from this system:

```
Audience 1: [title] — Level: [board / executive / management / operational] — Cadence: [weekly / monthly / quarterly]
Audience 2: [title] — Level: [...]
```

This configuration enables `prompts/executive_summary.md` and `prompts/narrative_storytelling.md` to automatically calibrate depth and vocabulary for the stated audience.

---

## Step 8 — PII and privacy rules

State your privacy constraints explicitly. The framework applies conservative defaults, but your specific rules override them:

```
Minimum aggregation level: [individual / team (N ≥ X) / department / company]
Data access scope: [who can see individual-level data vs. aggregates only]
PII fields excluded from BI outputs: [list]
Regulatory framework: [GDPR / HIPAA / other — key constraint for BI outputs]
```

---

## Minimum viable setup (if you are in a hurry)

If you want to start now without completing all steps, at minimum do:

1. Fill in the Project Context block in `SYSTEM.md` (5 minutes).
2. Define 3–5 core metrics using `templates/metric_definition_template.md` (15 minutes).
3. Tell the AI where your version history is located (1 minute).

Everything else can be completed iteratively as you use the system.

---

## When setup is complete

Give the AI this instruction at the start of every BI session:

> "Read BI_FRAMEWORK/SYSTEM.md first. Then read the relevant specialist prompt file. Apply the discovery protocol before producing any output."

Or if you have already configured the project context in SYSTEM.md, you can use a shorter session opener:

> "Read BI_FRAMEWORK/SYSTEM.md and route to [specialist file]. Apply to [metric / question / dataset]."
