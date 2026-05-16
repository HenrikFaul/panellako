# KPI Analysis Prompt — Metric Interpretation, Performance Assessment, Variance Explanation

> **When to use:** Interpreting what a KPI value means, assessing whether it is healthy, explaining why it changed, or computing variance against a target or prior period.

---

## 1. KPI Analysis Protocol

Execute in order. Do not skip to interpretation before completing definition validation.

### Step 1 — Establish the metric definition
Before evaluating any value, locate its definition from:
- Formal metric catalog (`templates/metric_definition_template.md` if populated).
- Source code, database schema, or pipeline definition.
- Dashboard documentation or data dictionary.

Confirm: Is this a count, rate, ratio, moving average, or composite score? What is included and excluded?

**If the definition cannot be confirmed from an authoritative source: do not produce a performance assessment. State the definition is unverified and stop.**

### Step 2 — Establish the performance baseline
A metric value has no meaning without a baseline. Determine which applies:

| Baseline type | Requirement |
|---|---|
| Target / budget | An explicit target must exist in documentation or configuration |
| Prior period | Same metric, same scope, prior comparable period (WoW, MoM, YoY) |
| Peer / segment | Same metric in a comparable cohort (segment, region, product line) |
| Internal threshold | A documented floor or ceiling from governance rules |

Do not invent a baseline. If none can be established, present the value as a neutral data point only.

### Step 3 — Compute variance
- Absolute change: current − baseline.
- Relative change: (current − baseline) ÷ baseline × 100%.
- Direction: improvement or deterioration — confirm metric polarity first.

### Step 4 — Assess statistical significance
- Is N ≥ 30? If not, apply a caveat.
- Is the variance within normal volatility? (One anomalous period does not constitute a trend.)
- Is the period representative? (A partial-period sample is not comparable to a full period.)

### Step 5 — Check version history for explanation
Before attributing variance to business causes:
- Check version history (CHANGELOG / release notes / migration files) for any change in the analysis period.
- If a schema change, computation fix, or feature gate change occurred, name it as a candidate explanation first.

### Step 6 — Produce the output (Section 4 format).

---

## 2. Variance Explanation Framework

When a KPI shows variance, work through these candidate causes in order:

1. **Version change** — Did a software or configuration change coincide with the metric shift?
2. **Scope change** — Did the denominator population change? (New users, tier change, new product line.)
3. **Seasonality** — Is this a known cyclical pattern? (Reference `prompts/seasonal_pattern_library.md`.)
4. **External event** — Is there a business event that explains the shift?
5. **Data quality** — Is the shift in the data or in the reality? (Missing records, delayed ingestion, bulk import.)
6. **Measurement artifact** — Did a formula, rounding rule, or aggregation method change?

Present the ranked candidate list with supporting evidence and confidence for each.

---

## 3. Polarity Reference

Always confirm metric polarity before assessing direction. Document polarity for each metric in `templates/metric_definition_template.md`.

| Common metric type | Typical polarity |
|---|---|
| Error rate, churn rate, absence rate, cost | Lower = better |
| Conversion rate, retention rate, NPS, adoption | Higher = better |
| Revenue, margin, throughput | Higher = better |
| Response time, time-to-resolve | Lower = better |
| Headcount, inventory | Context-dependent — define explicitly |

---

## 4. Output Format

```
KPI Analysis
─────────────────────────────────────────────────────────
BI Context
- Version: [version]
- KPI: [name + definition]
- Time window: [start → end, granularity]
- Scope: [population / segment / tenant]
- Data source: [source]
- Data quality: [complete / partial / uncertain]

Performance Assessment
- Current value: [value + unit]
- Baseline: [value + type]
- Absolute variance: [+/- value]
- Relative variance: [+/- %]
- Direction: [improvement / deterioration / neutral]
- Statistical validity: [sufficient / weak — N = X]

Variance Explanation (ranked by evidence strength)
1. [Candidate cause] — Evidence: [source] — Confidence: [high/medium/low]
2. [Candidate cause] — Evidence: [source] — Confidence: [high/medium/low]

Business Interpretation
[2–4 sentences connecting metric movement to a business outcome or risk]

Recommended Action
[What should change or be investigated based on this analysis]

Confidence Assessment
- Overall confidence: [high / medium / low]
- Caveats: [list]
- Version notes: [relevant changelog entries]
- Next step: [what to do next]
─────────────────────────────────────────────────────────
```
