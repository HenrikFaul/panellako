# Demand Forecasting Prompt — Demand, Volume, and Load Projection

> **Read `prompts/forecasting_methodology.md` before using this file.** All forecasts must comply with the methodology rules defined there (horizon limits, confidence intervals, training window integrity, assumption transparency).

---

## 1. Demand Forecasting Protocol

### Step 1 — Define what is being forecast
Specify:
- **Metric:** What volume, count, or load metric is being forecast? (Full definition.)
- **Granularity:** At what level? (Daily, weekly, monthly?)
- **Scope:** Which population, segment, or channel?
- **Decision:** What business decision does this forecast inform?

### Step 2 — Select the forecasting method

Reference `prompts/forecasting_methodology.md` Section 2 for method definitions.

| Scenario | Recommended method |
|---|---|
| Stable, low-volatility demand | M-2 (moving average) or M-3 (trend extrapolation) |
| Strong consistent trend | M-3 (trend extrapolation, confirm R² ≥ 0.75) |
| Clear seasonal pattern in data | M-4 (seasonal decomposition) |
| Known leading indicator | M-5 (regression against leading indicator) |
| Multiple contributing signals | M-6 (ensemble) |

### Step 3 — Validate the training window
- Confirm the training window is version-clean (no metric definition changes mid-window).
- Confirm the metric definition has not changed in the forecast period.
- Apply correction if a scope change occurred (e.g., new segment added).

### Step 4 — Decompose demand (for M-4 or M-6)

When seasonal or trend components are present, decompose before forecasting:

```
Observed demand = Trend component × Seasonal index × Residual noise

Procedure:
1. Calculate the trend using a centered moving average.
2. Divide observed values by trend to isolate seasonal × residual.
3. Average seasonal factors by period across all cycles to get the seasonal index.
4. Apply indices from seasonal_pattern_library.md if documented; derive from data if not.
5. Forecast the trend, then multiply by the seasonal index for each forecast period.
```

### Step 5 — Compute the forecast and confidence interval
- Produce the point forecast for each period.
- Compute the 80% confidence interval (operational) and/or 90% interval (planning).
- Apply seasonal adjustments from `prompts/seasonal_pattern_library.md` if available.
- Flag the decay date (when this forecast must be reviewed or replaced).

### Step 6 — Produce the output (Section 2 format).

---

## 2. Output Format

```
Demand Forecast
─────────────────────────────────────────────────────────
Forecast Master Block
- Metric: [name + definition]
- Forecast period: [start → end]
- Granularity: [daily / weekly / monthly]
- Method: [M-X — name]
- Training window: [start → end, N periods]
- Version integrity: [confirmed clean / corrected — describe]
- Primary assumptions: [list]
- Decision purpose: [what decision this informs]
- Decay date: [review by date]
- Confidence interval: [80% / 90% / scenario range]

Historical Context
- Trailing [N] period average: [value]
- Recent trend: [direction, slope per period]
- Seasonal pattern applied: [pattern ID / none]

Forecast
| Period | Point forecast | Lower bound | Upper bound |
| [P+1]  | [value]        | [value]     | [value]     |
| [P+2]  | [value]        | [value]     | [value]     |
| [P+3]  | [value]        | [value]     | [value]     |

Scenario Range (if statistical intervals not available)
- Optimistic: [assumption + projected value]
- Base: [assumption + projected value]
- Pessimistic: [assumption + projected value]

Key Assumptions
1. [Assumption] — Invalidated by: [what would break this assumption]
2. [Assumption] — Invalidated by: [what would break this assumption]

Business Interpretation
[2–3 sentences: what this forecast means for capacity, staffing, budget, or planning]

Confidence Assessment
- Overall confidence: [high / medium / low]
- Method fit: [how well the selected method matches the data pattern]
- Caveats: [seasonal uncertainty, version issues, small N]
- Version notes: [any releases that affect forecast validity]
- Next step: [what would improve forecast accuracy]
─────────────────────────────────────────────────────────
```
