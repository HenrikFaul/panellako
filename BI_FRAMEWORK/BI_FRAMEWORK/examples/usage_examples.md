# Usage Examples — Copy-Paste Invocation Patterns

> Copy these prompts to start a BI session. Replace bracketed placeholders with your project specifics. Always read `SYSTEM.md` first.

---

## Session Opener (use at the start of every BI session)

```
Read BI_FRAMEWORK/SYSTEM.md first. Apply the 6-step discovery protocol before producing any output. 
Then route to the correct specialist prompt from the routing table.
```

---

## 1. KPI Analysis

### "Is this metric good or bad?"

```
Read BI_FRAMEWORK/SYSTEM.md and route to prompts/kpi_analysis.md.

Analyze the following KPI:
- Metric: [metric name]
- Current value: [value]
- Time window: [e.g., "Week ending 2026-05-16, weekly granularity"]
- Scope: [e.g., "All paying customers, excluding trial accounts"]
- Data source: [e.g., "analytics.weekly_active_users view"]
- Baseline for comparison: [e.g., "Prior week" or "Monthly target of 500"]
- Version history location: [e.g., "CHANGELOG.md" or "releases/ folder"]
```

### "Why did this metric change?"

```
Read BI_FRAMEWORK/SYSTEM.md and route to prompts/root_cause_analysis.md.

The following metric changed. Investigate the cause:
- Metric: [name + definition]
- Change: [e.g., "Declined 14% from 520 to 447 between March and April 2026"]
- Scope: [segment or population]
- Data source: [source]
- Version history: [location]
- Known events during this period: [describe any releases, campaigns, or business events]
```

---

## 2. Trend Analysis

### "Is this trend real or noise?"

```
Read BI_FRAMEWORK/SYSTEM.md and route to prompts/trend_analysis.md.

Analyze whether the following represents a real trend:
- Metric: [name + definition]
- Data (time series): [list values with dates, e.g., "Week 1: 100, Week 2: 103, Week 3: 98, Week 4: 106, Week 5: 110, Week 6: 108"]
- Granularity: [weekly]
- Scope: [population]
- Seasonal patterns documented: [yes — see BI_FRAMEWORK/prompts/seasonal_pattern_library.md / no]
- Version history: [location]
```

---

## 3. Anomaly Detection

### "This number looks wrong — investigate it"

```
Read BI_FRAMEWORK/SYSTEM.md and route to prompts/anomaly_detection.md.

Investigate the following anomaly:
- Metric: [name + definition]
- Anomalous value: [value]
- Period: [date / week / month]
- Normal range for this metric: [approximate normal range or recent average]
- Data source: [source]
- Recent software releases: [yes — describe / no / unknown]
- Possible explanations I have already considered: [list]
```

---

## 4. Executive Summary

### "Turn this analysis into a board-ready summary"

```
Read BI_FRAMEWORK/SYSTEM.md and route to prompts/executive_summary.md.

Produce an executive summary for:
- Audience: [Board / C-suite / Senior management]
- Reporting period: [start → end]
- Scope: [business unit or whole company]
- Source analysis: [paste or reference the completed BI analysis to be summarized]
- Version in production: [version]
- Known data quality issues: [describe or "none"]
```

---

## 5. Dashboard Interpretation

### "Explain what this dashboard is showing"

```
Read BI_FRAMEWORK/SYSTEM.md and route to prompts/dashboard_interpretation.md.

Interpret the following dashboard:
- Dashboard name: [name]
- Time window displayed: [as shown in dashboard]
- Audience it is designed for: [team / management / executive]
- Charts present: [list the key charts/tiles and their metric labels]
- Version in production: [version]
- Question I want answered: [what specific aspect needs interpretation?]
```

---

## 6. Data Quality Assessment

### "Can I trust this data?"

```
Read BI_FRAMEWORK/SYSTEM.md and route to prompts/data_quality.md.

Assess data quality for:
- Data source: [table / view / API / file]
- Metric(s) it produces: [list]
- Assessment period: [date range]
- Known concerns: [describe anything already suspected]
- Pipeline description: [how data flows from source to reporting layer]
- Last known good state: [when was this data confirmed reliable?]
```

---

## 7. Segment and Cohort Analysis

### "Which segment is driving this movement?"

```
Read BI_FRAMEWORK/SYSTEM.md and route to prompts/segment_cohort_analysis.md.

Analyze metric performance by segment:
- Metric: [name + definition]
- Segmentation variable: [e.g., "plan tier" / "acquisition channel" / "geography"]
- Segments to analyze: [list segments]
- Time window: [start → end]
- Data source: [source]
- Question: [e.g., "Which segment is responsible for the 14% aggregate decline?"]
```

---

## 8. Forecasting

### "Forecast the next 3 months of [metric]"

```
Read BI_FRAMEWORK/SYSTEM.md and route to prompts/forecasting_methodology.md first, 
then route to prompts/demand_forecasting.md.

Produce a demand forecast:
- Metric: [name + definition]
- Historical data: [paste values with dates, or specify the data source]
- Forecast period: [start → end]
- Granularity: [weekly / monthly]
- Decision this forecast informs: [be specific — e.g., "Headcount planning for Q3"]
- Known seasonal patterns: [documented in seasonal_pattern_library.md / not documented]
- Version history: [location — for training window validation]
```

---

## 9. Churn Risk

### "Which customers are most at risk of churning?"

```
Read BI_FRAMEWORK/SYSTEM.md and route to prompts/churn_risk_scoring.md.

Score churn risk for:
- Population: [N accounts / users in scope]
- Churn definition: [what constitutes churn in your context]
- Risk window: [next 30 / 60 / 90 days]
- Available signals: [list signals you can observe — login frequency, support tickets, etc.]
- Privacy constraint: [individual-level scoring authorized / cohort-level only]
- Historical churn data available: [yes — N events over N months / no]
```

---

## 10. Scenario Modeling

### "What happens if we raise prices by 10%?"

```
Read BI_FRAMEWORK/SYSTEM.md and route to prompts/scenario_modeling.md.

Model the following scenario:
- Decision: [describe the change being considered]
- Output metric(s) to model: [what you want to predict]
- Baseline: [current metric value and trend]
- Scenario assumptions: 
  - Optimistic: [specific input assumption]
  - Base: [specific input assumption]
  - Pessimistic: [specific input assumption]
- Known causal mechanisms: [how does the decision affect the output?]
- Forecast horizon: [N months]
- Version: [current software version]
```

---

## 11. Capacity-Demand Gap

### "Will we have enough capacity to meet demand next quarter?"

```
Read BI_FRAMEWORK/SYSTEM.md and route to prompts/capacity_demand_gap_forecasting.md.

Analyze the capacity-demand gap:
- Capacity metric: [definition + current value, e.g., "10 FTE capable of processing 500 units/week"]
- Demand metric: [definition + current value, e.g., "current weekly volume: 420 units"]
- Planned capacity changes: [hires, departures, infrastructure changes scheduled]
- Demand forecast: [available or to be computed — specify method/data]
- Forecast period: [next N weeks / months]
- Critical threshold: [what capacity ratio triggers action in your context]
- Intervention types available: [hiring / contractors / automation / etc.]
```

---

## 12. BI Strategy Design

### "What should we be measuring?"

```
Read BI_FRAMEWORK/SYSTEM.md and route to prompts/bi_strategy.md.

Design a measurement framework for:
- Domain: [the area being measured — product / HR / operations / finance / other]
- Audience: [who receives BI outputs and makes decisions]
- Decisions this audience makes: [list 3–5 weekly/monthly decisions]
- Data sources available: [list existing data sources]
- Metrics currently tracked: [list existing metrics — or "none established yet"]
- Known data gaps: [list areas where data is missing]
```
