# BI Framework — Drop-In Business Intelligence Prompt System

A portable, project-agnostic Business Intelligence prompt architecture for AI assistants (Claude, GPT-4, Gemini, or any LLM). Drop this folder into any repository and the AI gains structured, rigorous BI reasoning capabilities — metric interpretation, trend analysis, anomaly detection, forecasting, executive summaries, and more.

---

## What this is

A complete BI prompt ecosystem. Not a collection of vague analytics prompts. A disciplined, multi-layered system that:

- Forces evidence-grounding before any output (no hallucinated metric values).
- Enforces version-aware reasoning (software changes explain metric shifts before business causes are assumed).
- Requires explicit data quality assessment before analysis.
- Produces outputs with mandatory confidence levels, time windows, and scope declarations.
- Covers the full BI lifecycle: strategy → definition → analysis → forecasting → narrative → documentation.

---

## How to use it

### Step 1 — Configure for your project
Read `SETUP.md`. It takes 10–30 minutes. Do it before using any prompt file.

### Step 2 — Read SYSTEM.md first in every AI session
`SYSTEM.md` is the master controller. Give it to the AI before any BI question. It defines the discovery protocol, routing table, anti-hallucination rules, and output contracts.

### Step 3 — Route to the specialist prompt
Use the routing table in `SYSTEM.md` or `README.md` to find the right prompt file for your task.

### Step 4 — Provide your context
Each prompt file has bracketed placeholders like `[your metric]`, `[your data source]`, `[your CHANGELOG or version history]`. Fill these in or instruct the AI to find them in your repository.

---

## Folder structure

```
BI_FRAMEWORK/
├── README.md                           This file
├── SETUP.md                            How to configure this framework for your project
├── SYSTEM.md                           Master controller — give this to AI first, every session
├── prompts/
│   ├── bi_strategy.md                  What to measure and why — measurement framework design
│   ├── kpi_analysis.md                 KPI interpretation, performance assessment, variance
│   ├── trend_analysis.md               Time-series patterns, direction confidence, trend breaks
│   ├── anomaly_detection.md            Outlier detection, triage, classification
│   ├── dashboard_interpretation.md     Dashboard reading, chart critique, misinterpretation risks
│   ├── executive_summary.md            Board-ready narrative generation
│   ├── data_quality.md                 Trust assessment, completeness, confidence scoring
│   ├── root_cause_analysis.md          Driver identification, causal reasoning
│   ├── segment_cohort_analysis.md      Segmentation, cohort tracking, funnel analysis
│   ├── bi_documentation.md             BI artifact generation and knowledge capture
│   ├── bi_governance.md                Metric consistency, definition lifecycle, quality gates
│   ├── narrative_storytelling.md       Data storytelling, BI narrative craft
│   ├── predictive_signals.md           Leading indicators and early warning systems
│   ├── forecasting_methodology.md      Forecasting rules, methods, horizon limits (read first)
│   ├── seasonal_pattern_library.md     Framework for documenting your seasonal patterns
│   ├── demand_forecasting.md           Demand / volume / load projection
│   ├── churn_risk_scoring.md           Customer / user / employee churn risk from signals
│   ├── engagement_trajectory_forecasting.md  Engagement score projection, risk timeline
│   ├── financial_forecasting.md        Cost projection, budget variance, financial trends
│   ├── scenario_modeling.md            What-if analysis, decision impact, scenario comparison
│   └── capacity_demand_gap_forecasting.md   Forward supply-demand gap with intervention windows
├── templates/
│   ├── metric_definition_template.md   Canonical metric definition format
│   ├── bi_report_template.md           Standard BI report structure
│   ├── board_report_template.md        Formal board-level report structure
│   └── forecast_report_template.md     Standard forecast output structure
└── examples/
    └── usage_examples.md               Copy-paste invocation patterns
```

---

## Quick routing

| Task | File |
|---|---|
| Configure this framework | `SETUP.md` |
| Understand the full system | `SYSTEM.md` |
| Design what to measure | `prompts/bi_strategy.md` |
| Analyze a KPI | `prompts/kpi_analysis.md` |
| Investigate a trend | `prompts/trend_analysis.md` |
| Investigate an anomaly | `prompts/anomaly_detection.md` |
| Read a dashboard | `prompts/dashboard_interpretation.md` |
| Write an executive summary | `prompts/executive_summary.md` |
| Assess data quality | `prompts/data_quality.md` |
| Find what caused a metric change | `prompts/root_cause_analysis.md` |
| Compare segments, cohorts, funnels | `prompts/segment_cohort_analysis.md` |
| Document a metric or BI decision | `prompts/bi_documentation.md` |
| Audit BI output quality | `prompts/bi_governance.md` |
| Turn analysis into narrative | `prompts/narrative_storytelling.md` |
| Identify leading indicators | `prompts/predictive_signals.md` |
| **Read before any forecasting** | `prompts/forecasting_methodology.md` |
| Look up seasonal patterns | `prompts/seasonal_pattern_library.md` |
| Forecast demand or volume | `prompts/demand_forecasting.md` |
| Score churn or attrition risk | `prompts/churn_risk_scoring.md` |
| Project engagement trajectory | `prompts/engagement_trajectory_forecasting.md` |
| Forecast cost or budget | `prompts/financial_forecasting.md` |
| Model what-if scenarios | `prompts/scenario_modeling.md` |
| Forecast capacity-demand gap | `prompts/capacity_demand_gap_forecasting.md` |
| Define a metric formally | `templates/metric_definition_template.md` |
| Structure a BI report | `templates/bi_report_template.md` |
| Structure a board report | `templates/board_report_template.md` |
| Structure a forecast | `templates/forecast_report_template.md` |
| Copy-paste prompt examples | `examples/usage_examples.md` |

---

## Compatibility

This framework is model-agnostic. It has been designed for Claude but works with any capable LLM. The prompt files are plain Markdown — no special syntax, no API dependencies, no tooling required.

Copy the folder. Read SETUP.md. Start with SYSTEM.md in your AI session.
