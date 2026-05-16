# Forecasting Methodology Prompt — Rules, Methods, Horizon Limits

> **Read this file before using any forecasting prompt.** It defines the permissible methods, mandatory confidence requirements, horizon discipline, and forecast integrity rules that govern all forecasts produced by this framework.

---

## 1. Forecasting Responsibility Rules

These rules apply to every forecast, without exception.

### Rule 1 — Horizon discipline
Forecast horizon must not exceed what the data supports. Default maximum horizons:

| Data history available | Maximum reliable horizon |
|---|---|
| < 3 months | 2–4 weeks |
| 3–6 months | 1–2 months |
| 6–12 months | 1 quarter |
| 12–24 months | 2 quarters |
| 24+ months with seasonal validation | Up to 12 months |

Exceeding these limits requires explicit justification and a prominently labeled speculative range.

### Rule 2 — Confidence interval requirement
Every point forecast must include a confidence interval. Acceptable formats:
- 80% confidence interval (recommended for operational decisions).
- 90% confidence interval (recommended for planning and budgeting).
- Scenario range (optimistic / base / pessimistic) if statistical intervals are not computable.

A point forecast without uncertainty bounds is not a forecast — it is an estimate presented as certainty.

### Rule 3 — Training window version integrity
Before training any forecast model (even a simple trend extrapolation):
- Check whether the metric definition changed within the training window.
- If a computation or scope change occurred mid-window, either: (a) exclude pre-change data, or (b) apply a correction factor and document it.
- A forecast trained on data that spans a definition change is unreliable without correction.

### Rule 4 — Assumption transparency
Every forecast must state its primary assumptions:
- What behavioral/operational pattern is assumed to continue?
- What external conditions are assumed to remain stable?
- What would cause the forecast to be materially wrong?

Assumptions are not a formality — they are the forecast's failure conditions.

### Rule 5 — Forecast decay declaration
Forecasts have expiry dates. State when the forecast should be replaced:
- **Short-range (< 4 weeks):** Review weekly.
- **Medium-range (1–3 months):** Review monthly or after any significant business event.
- **Long-range (> 3 months):** Review quarterly or after major version/scope changes.

A forecast produced more than one review cycle ago is stale and must be re-run before being cited.

### Rule 6 — Decision-purpose requirement
State the decision this forecast is intended to inform. A forecast disconnected from a decision is an exercise in arithmetic, not analysis.

---

## 2. Permissible Forecasting Methods

| Method | When appropriate | Minimum data requirement | Maximum horizon |
|---|---|---|---|
| M-1: Naive / last-period carryforward | Stable metric with low volatility | 1 period | 1 period |
| M-2: Simple moving average | Stable metric, smoothing noise | 4+ periods | 2 periods |
| M-3: Trend extrapolation (linear) | Consistent directional trend, no seasonality | 6+ periods, R² ≥ 0.75 | 3 periods |
| M-4: Seasonal decomposition | Known seasonal pattern confirmed in data | 2+ full seasonal cycles | 1 full cycle |
| M-5: Regression (external variable) | Confirmed leading indicator with causal mechanism | 20+ paired observations | Horizon of leading indicator |
| M-6: Ensemble / weighted combination | Multiple signals with different lead times | Sufficient for each component | Shortest component horizon |

Never select a method because it produces a more desirable forecast. Select based on the data available.

---

## 3. Forecast Master Block

Every forecast output begins with this block:

```
Forecast Master Block
─────────────────────────────────────────────────────────
Metric: [name + definition]
Forecast period: [start → end]
Granularity: [daily / weekly / monthly]
Method: [M-1 through M-6 — name and justification]
Training window: [start → end, N periods]
Version integrity: [confirmed clean / corrected — describe / compromised — explain]
Primary assumptions: [list]
Decision purpose: [what decision this forecast informs]
Decay date: [when to review or replace this forecast]
Confidence interval: [80% / 90% / scenario range]
─────────────────────────────────────────────────────────
```

---

## 4. Prohibited Forecast Outputs

These outputs are prohibited under this framework:

- A point forecast with no confidence interval or scenario range.
- A forecast horizon that exceeds the data-supported maximum without explicit justification.
- A forecast trained on data spanning a definition change without correction.
- A forecast that does not state its primary assumptions.
- Presenting a forecast as a prediction rather than a probabilistic estimate.
- Using a forecast past its declared decay date without re-running it.
- Attributing forecast error solely to "unexpected events" without examining model assumptions.

---

## 5. Forecast Error Handling

When a prior forecast is reviewed against actual results:
- Compute the forecast error: actual − forecast (absolute and %).
- Determine whether the error was within the stated confidence interval.
- Identify whether any assumption was violated that explains the error.
- Update the method or assumption registry if systematic bias is detected.
- Document forecast accuracy over time to calibrate future confidence intervals.
