# Dashboard Interpretation Prompt — Reading Charts, Critiquing Visuals, Misinterpretation Risks

> **When to use:** Reading and explaining what a dashboard or chart is showing, identifying misinterpretation risks, critiquing dashboard design, or translating visual data into a written narrative.

---

## 1. Dashboard Interpretation Protocol

### Step 1 — Establish context before reading values
Before interpreting any chart:
- What metric is displayed? Confirm the definition from `templates/metric_definition_template.md` or the data source.
- What is the time window? Is it current, trailing, or cumulative?
- What is the scope? (Which segment, cohort, tenant, region?)
- What is the granularity? (Daily aggregates vs. hourly vs. weekly?)
- Has the metric definition or data source changed in the displayed period?

### Step 2 — Read the chart type correctly

| Chart type | Common misreading | Correct reading |
|---|---|---|
| Line chart (cumulative) | Mistaken for a trend | Cumulative lines always go up unless reversed; slope shows rate |
| Bar chart (stacked) | Comparing bar tops | Compare segment proportions, not absolute bar heights |
| Pie / donut | Eyeballing small slices | Use the data table; slices < 5% are not visually reliable |
| Heatmap | Treating all colors equally | Confirm the color scale — linear vs. logarithmic matters |
| Funnel | Assuming equal time windows | Verify each stage uses the same cohort entry point |
| KPI tile (single value) | No-context reading | Always compare to the baseline shown or stated |
| Scatter plot | Assuming correlation = causation | Identify confounders; check N before claiming relationship |

### Step 3 — Identify the five most common dashboard misinterpretations

1. **Denominator blindness** — A rising count metric looks good, but if the user base grew faster, the rate declined. Always check rates, not just counts.

2. **Period mismatch** — Comparing a partial current period to a complete prior period makes the current period look worse than it is.

3. **Version-naive trending** — A metric shift coincides with a software release. The dashboard shows a business trend; the real cause is a computation or scope change.

4. **Survivorship bias** — Retention or engagement metrics that exclude churned users look artificially high.

5. **Aggregation masking** — An average metric that looks stable while the distribution is polarizing (high performers up, low performers down).

### Step 4 — Assess dashboard design quality

For each visual on the dashboard:
- Is the baseline visible? (A metric without a comparison is uninformative.)
- Is the time window labeled explicitly?
- Are axes zero-based or truncated? (Truncated axes amplify visual change.)
- Is color used to encode meaning (red = bad, green = good) consistently?
- Are there too many metrics competing for attention? (> 7 primary KPIs is dashboard sprawl.)

### Step 5 — Produce the output (Section 2 format).

---

## 2. Output Format

```
Dashboard Interpretation
─────────────────────────────────────────────────────────
BI Context
- Version: [version]
- Dashboard: [name / component path]
- Time window: [as displayed]
- Scope: [population / segment / tenant]
- Data source: [source]
- Data quality: [complete / partial / uncertain]

Chart-by-Chart Reading
[For each key visual:]
- Chart: [name/type]
- What it shows: [1 sentence, metric + direction]
- Baseline: [what it is compared to]
- Key observation: [the most important data point]
- Misinterpretation risk: [the most likely way this could be misread]

Aggregated Interpretation
[2–4 sentences: what the dashboard as a whole is telling you, and what it is NOT telling you]

Design Critique
- Strengths: [what the dashboard does well]
- Risks: [which metrics lack baselines, which charts could be misread]
- Missing: [what information is absent that would make this more useful]

Recommended Action
[What decision this dashboard should drive, and whether it has the data to drive it]

Confidence Assessment
- Overall confidence: [high / medium / low]
- Caveats: [missing baselines, partial periods, version uncertainty]
- Version notes: [any relevant changelog entries]
- Next step: [what additional context would improve interpretation]
─────────────────────────────────────────────────────────
```
