# Seasonal Pattern Library — Framework for Documenting Seasonal Patterns

> **This file is a template and documentation framework, not a pre-populated pattern library.** Populate it with your project's actual observed seasonal patterns before use. Until populated, seasonal corrections cannot be applied.

---

## 1. Purpose

This file stores named, quantified seasonal patterns for your domain. When a metric shows a movement that could be seasonal, reference this library before attributing the movement to a business or operational cause.

A seasonal pattern is only valid if it meets all three criteria:
1. **Documented** — it is recorded in this file with a source and evidence.
2. **Quantified** — a seasonal index or expected range is defined, not just a directional observation.
3. **Verified** — it has been observed in ≥ 2 independent cycles.

Do not apply a seasonal correction based on intuition or industry assumption. Document it here first.

---

## 2. Pattern Record Format

Each pattern entry uses this format:

```
Pattern ID: [domain prefix]-[sequence number]  (e.g., US-01, EU-01, Q4-01)
Name: [human-readable name]
Metric(s) affected: [list of metrics where this pattern applies]
Period: [which months / weeks / quarters / days]
Expected direction: [higher / lower than baseline]
Seasonal index: [ratio vs. annual average — e.g., 1.20 = 20% above baseline]
Confidence: [high / medium / low]
Source: [how was this pattern identified — N cycles of data, external benchmark, etc.]
Jurisdiction / segment: [where does this apply — global / region / product / customer type]
Analyst note: [anything that qualifies or complicates this pattern]
Last validated: [date of last confirmation against real data]
```

---

## 3. How to Add a Pattern

**Step 1 — Observe a recurring movement.**
The metric moves in the same direction, at approximately the same time, in ≥ 2 separate years or cycles.

**Step 2 — Quantify it.**
Calculate the seasonal index for the affected period:
```
Seasonal index = Period average ÷ Annual average
```
An index of 1.15 means this period is typically 15% above the annual average. An index of 0.80 means it is typically 20% below.

**Step 3 — Verify it is seasonal, not structural.**
A structural decline appears every year but gets worse each year. A seasonal pattern returns to baseline after the affected period. Confirm the metric recovers to pre-pattern levels.

**Step 4 — Record it using the format in Section 2.**

**Step 5 — Set a validation date.**
Revisit every pattern annually to confirm it still holds. Patterns can change — a business model shift, geographic expansion, or product change can eliminate or alter a prior pattern.

---

## 4. Pattern Catalog

*(This section is empty until you populate it for your project. Add entries below using the format in Section 2.)*

---

### Your Patterns Go Here

```
Pattern ID: [YOUR-01]
Name: [Pattern name]
Metric(s) affected: [list]
Period: [e.g., December–January]
Expected direction: [higher / lower]
Seasonal index: [e.g., 0.75]
Confidence: [high / medium / low]
Source: [N cycles observed, date range]
Jurisdiction / segment: [global / describe]
Analyst note: []
Last validated: [YYYY-MM-DD]
```

*(Copy the block above for each additional pattern.)*

---

## 5. Domain Starter Prompts

If you are unsure where to begin, here are common patterns by domain that you may want to investigate in your own data:

| Domain | Common seasonal effects to investigate |
|---|---|
| SaaS / software | Q4 enterprise spending spikes, January churn (budget resets), summer low engagement |
| Ecommerce | Holiday demand peaks, post-holiday return spikes, mid-year promotional events |
| HR / workforce | Holiday absence peaks, January hiring surge, summer recruitment slowdown |
| Financial services | Month-end transaction spikes, quarter-end close volume, tax-season activity |
| Healthcare | Flu season volume, holiday staffing pressure, benefits reset periods |
| Consumer apps | Weekend vs. weekday usage cycles, school holiday engagement changes |
| B2B platforms | Fiscal year-end purchasing, conference season activity, summer budget freeze |

These are starting hypotheses, not documented patterns. Each must be tested against your actual data before being added to this library.

---

## 6. Applying a Pattern

When referencing a pattern in analysis:

```
Seasonal adjustment applied: [Pattern ID] — [Pattern name]
Expected index for this period: [value]
Unadjusted metric: [value]
Seasonally adjusted metric: [value ÷ seasonal index]
Adjustment confidence: [high / medium / low]
Pattern last validated: [date]
```

If the pattern has not been validated in the current year, apply it with Medium confidence at most.

---

## 7. Cross-Reference

- `prompts/trend_analysis.md` — Apply seasonal correction in Step 6 before concluding a trend.
- `prompts/anomaly_detection.md` — Check Type D (seasonal anomaly) against this library.
- `prompts/kpi_analysis.md` — Apply seasonal adjustment in Step 2 when selecting a baseline.
- `prompts/demand_forecasting.md` — Use seasonal indices as decomposition inputs.
