# Financial Forecasting Prompt — Cost Projection, Budget Variance, Financial Trends

> **Read `prompts/forecasting_methodology.md` before using this file.**

---

## 1. Financial Forecasting Protocol

### Step 1 — Define the financial metric being forecast
State precisely:
- **Metric:** Revenue / cost / margin / burn rate / budget variance / unit cost / other?
- **Scope:** Which business unit, product line, or cost center?
- **Granularity:** Monthly / quarterly / annual?
- **Decision:** What financial or operational decision does this forecast inform?

### Step 2 — Identify cost/revenue drivers

Before forecasting the aggregate, decompose into drivers:

**Cost decomposition example:**
```
Total cost = Fixed cost + Variable cost
Variable cost = Volume × Unit cost
Unit cost = Labor cost per unit + Infrastructure cost per unit + Other
```

**Revenue decomposition example:**
```
Revenue = Volume × Price
Volume = New customers + Retained customers − Churned customers
Price = Base price × (1 − discount rate)
```

Forecast each driver separately, then aggregate. This produces more accurate forecasts and makes assumptions explicit.

### Step 3 — Classify variances

When a financial metric deviates from plan, classify the variance:

| Variance type | Definition | Implication |
|---|---|---|
| Volume variance | Actual volume ≠ planned volume | Demand or operational throughput issue |
| Rate/price variance | Actual unit cost/price ≠ planned rate | Pricing, procurement, or efficiency issue |
| Mix variance | Actual product/segment mix ≠ planned mix | Portfolio shift; high-margin vs. low-margin |
| Timing variance | Revenue/cost recognized in wrong period | Accounting or pipeline timing issue |
| One-time variance | Non-recurring item not in plan | Identify and exclude from run-rate analysis |

Present variance decomposition before concluding on run rate.

### Step 4 — Compute burn rate index (for cost or cash forecasts)
```
Burn rate index = Actual spend this period ÷ Budgeted spend this period

> 1.0 = overspending relative to plan
< 1.0 = underspending relative to plan
= 1.0 = on plan
```

Track the index over time to identify acceleration or deceleration in variance.

### Step 5 — Assess run rate vs. trend

- **Run rate:** If this period's spending/revenue continues unchanged, what is the annualized value?
- **Trend rate:** If the current trend continues, where will the metric land at year-end / quarter-end?
- **Budget path:** What trajectory is required to meet the stated budget target?

Present all three alongside each other.

### Step 6 — Produce the output (Section 2 format).

---

## 2. Driver Classification for Cost Forecasting

When forecasting costs, classify each driver as:

| Driver type | Characteristic | Forecasting approach |
|---|---|---|
| Fixed | Does not vary with volume | Carry forward with known escalation |
| Volume-linked | Scales with demand or throughput | Forecast volume first, apply unit rate |
| Headcount-linked | Scales with team size | Forecast headcount first, apply per-head cost |
| Event-driven | Triggered by a specific action | Identify trigger probability; apply expected cost |
| One-time | Non-recurring | Exclude from run-rate; note separately |

---

## 3. Output Format

```
Financial Forecast
─────────────────────────────────────────────────────────
Forecast Master Block
- Metric: [financial metric name + definition]
- Forecast period: [start → end]
- Granularity: [monthly / quarterly]
- Method: [M-X — name]
- Training window: [start → end, N periods]
- Version integrity: [confirmed clean / corrected — describe]
- Primary assumptions: [list]
- Decision purpose: [what decision this informs]
- Decay date: [review by date]
- Confidence interval: [80% / 90% / scenario range]

Current Period Context
- Actual [metric] this period: [value]
- Budget this period: [value]
- Variance: [absolute and %]
- Burn rate index: [value]
- Variance classification: [volume / rate / mix / timing / one-time]

Forecast
| Period | Point forecast | Lower bound | Upper bound | vs. Budget |
| [P+1]  | [value]        | [value]     | [value]     | [+/-]      |
| [P+2]  | [value]        | [value]     | [value]     | [+/-]      |
| [P+3]  | [value]        | [value]     | [value]     | [+/-]      |

Full-Year / Full-Period Projection
- Run rate: [annualized value if current period continues]
- Trend rate: [year-end estimate if current trend continues]
- Budget target: [stated target]
- Gap to target: [trend rate vs. budget target]

Scenario Range
- Optimistic: [assumption + year-end / period-end value]
- Base: [assumption + year-end / period-end value]
- Pessimistic: [assumption + year-end / period-end value]

Key Assumptions
1. [Assumption] — Invalidated by: [condition]
2. [Assumption] — Invalidated by: [condition]

Business Interpretation
[2–3 sentences: what this means for financial health, budget management, or investment decisions]

Recommended Action
[Specific financial or operational action implied by this forecast]

Confidence Assessment
- Overall confidence: [high / medium / low]
- Caveats: [seasonality, one-time items, driver uncertainty]
- Version notes: [any releases that changed cost accounting or revenue recognition]
- Next step: [what data or investigation would improve this forecast]
─────────────────────────────────────────────────────────
```
