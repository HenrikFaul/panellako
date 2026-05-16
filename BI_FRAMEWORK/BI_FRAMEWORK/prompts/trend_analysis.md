# Trend Analysis Prompt — Time-Series Patterns, Direction Confidence, Trend Breaks

> **When to use:** Determining whether a metric is moving in a consistent direction, quantifying trend strength, detecting trend breaks, and separating real signal from normal volatility.

---

## 1. Trend Analysis Protocol

Execute in order. Do not skip signal/noise separation.

### Step 1 — Establish the time series
- Minimum data points required for trend claim: **≥ 6 data points** at the analysis granularity.
- Confirm the metric is measured at consistent intervals (no irregular sampling).
- Confirm no mid-series definition or computation change occurred (check version history).

### Step 2 — Apply signal/noise separation
A trend is a directional claim. Before making it, verify:

| Test | Criterion |
|---|---|
| Directional consistency | ≥ 70% of intervals move in the claimed direction |
| Magnitude | Cumulative change ≥ 2× the average period-to-period volatility |
| Recency | At least the last 3 intervals confirm the direction |
| Version-cleanliness | No software release coincides with the apparent trend break |

If fewer than 3 of 4 tests pass, classify as **volatility**, not a trend.

### Step 3 — Classify the trend type

| Type | Description |
|---|---|
| Linear | Consistent rate of change per period |
| Accelerating | Rate of change is itself increasing |
| Decelerating | Rate of change is slowing (may indicate plateau) |
| Reversal | Direction has changed; prior trend has ended |
| Plateau | Change < noise floor for ≥ 3 consecutive periods |
| Spike/dip | One anomalous period without directional continuation |

### Step 4 — Quantify the trend
- **Slope:** Average change per period (absolute and relative).
- **R² or directional consistency %:** How reliably is the trend maintained?
- **Projection (only if requested):** If the current rate continues, where will the metric be in N periods? Flag as extrapolation, not forecast.

### Step 5 — Check for trend breaks
A trend break is a sustained change in direction or slope. Identify:
- The break point (which period).
- What coincided with the break (version release, scope change, external event, seasonal pattern).
- Whether the pre-break and post-break trends are each individually valid (≥ 6 points, signal/noise tests).

### Step 6 — Apply seasonality correction (if applicable)
- If a seasonal pattern is documented in `prompts/seasonal_pattern_library.md`, apply the correction before interpreting the trend.
- Never claim a seasonal decline is a structural deterioration without first testing for seasonality.

### Step 7 — Produce the output (Section 3 format).

---

## 2. Trend Break Detection Framework

When the time series appears to change direction or slope:

1. **Locate the break point** — which period did the change occur?
2. **Test each sub-series independently** — is each segment a valid trend on its own terms?
3. **Check version history** — did a software or configuration change coincide with the break?
4. **Check scope changes** — did the measured population change?
5. **Check seasonal effects** — is the break a known seasonal inflection?
6. **Check external events** — is there a business or market event that explains the change?

Only after ruling out steps 3–6 should a break be attributed to a genuine underlying business shift.

---

## 3. Output Format

```
Trend Analysis
─────────────────────────────────────────────────────────
BI Context
- Version: [version]
- Metric: [name + definition]
- Time window: [start → end]
- Granularity: [daily / weekly / monthly]
- Scope: [population / segment / tenant]
- Data source: [source]
- Data quality: [complete / partial / uncertain]

Trend Classification
- Type: [linear / accelerating / decelerating / reversal / plateau / spike-dip]
- Direction: [improving / deteriorating / neutral — confirm polarity]
- Slope: [+/- value per period, absolute and relative]
- Directional consistency: [X% of intervals confirm direction]
- Signal/noise verdict: [trend / volatility — reason]

Trend Break Analysis (if applicable)
- Break point: [period]
- Pre-break trend: [direction, slope, N]
- Post-break trend: [direction, slope, N]
- Break candidate causes (ranked):
  1. [cause] — Evidence: [source] — Confidence: [high/medium/low]
  2. [cause] — Evidence: [source] — Confidence: [high/medium/low]

Seasonality
- Pattern applied: [name from seasonal_pattern_library.md / none]
- Correction method: [seasonal index applied / none required]
- Adjusted trend direction: [if different from unadjusted]

Business Interpretation
[2–4 sentences: what the trend means for the business, and what risk or opportunity it represents]

Confidence Assessment
- Overall confidence: [high / medium / low]
- Basis: [what evidence supports the trend classification]
- Caveats: [small N, incomplete period, version contamination, etc.]
- Version notes: [any changelog entries relevant to the analysis period]
- Next step: [what would increase confidence or what decision this informs]
─────────────────────────────────────────────────────────
```
