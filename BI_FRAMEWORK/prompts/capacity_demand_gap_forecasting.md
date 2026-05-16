# Capacity-Demand Gap Forecasting Prompt — Forward Supply-Demand Gap with Intervention Windows

> **Read `prompts/forecasting_methodology.md` before using this file.**

---

## 1. Capacity-Demand Gap Protocol

### Step 1 — Define capacity and demand

Before computing a gap, define both sides of the equation:

**Supply (capacity):**
- What unit measures available capacity? (Headcount, server throughput, processing time, licensed seats, etc.)
- What is current total supply?
- What is the effective supply after known constraints? (Absence, ramp-up periods, utilization limits, overhead.)
- What changes to supply are already planned? (Hires, churn, contract renewals, infrastructure upgrades.)

**Demand:**
- What unit measures demand? (Volume, requests, users, hours required, etc.)
- What is current demand?
- What is the demand forecast? (Reference `prompts/demand_forecasting.md`.)

### Step 2 — Compute effective supply over the forecast period

```
Effective supply (per period) = 
  Total headcount/capacity
  × Availability rate (1 − absence/maintenance rate)
  × Productive utilization rate (if applicable)
  × Ramp factor (if new capacity is ramping up)
```

**Ramp factor for new capacity (example for headcount):**
- Week 1–4: 50% productive capacity
- Week 5–8: 75% productive capacity
- Week 9+: 100% productive capacity

Adjust ramp curves for your domain (infrastructure scaling may ramp faster; skill-dependent roles may ramp slower).

### Step 3 — Compute the gap

```
Gap (per period) = Demand forecast − Effective supply forecast

Positive gap (+): demand exceeds supply → capacity deficit
Negative gap (−): supply exceeds demand → overcapacity
```

Track the gap over time, not just at the end of the forecast period. The gap may cross thresholds at intermediate points that require earlier action.

### Step 4 — Classify gap severity

Define thresholds appropriate for your domain. Generic starting points:

| Tier | Gap ratio | Status |
|---|---|---|
| Adequate | Supply ≥ demand | No action required |
| Watch | Demand is 1–5% above effective supply | Monitor weekly |
| Elevated | Demand is 6–15% above effective supply | Investigate; prepare contingency |
| Critical | Demand is > 15% above effective supply | Immediate action required |

Adjust these thresholds for your context and configure them in `SYSTEM.md` Section 1.

### Step 5 — Identify the intervention window

The intervention window is the time between now and when the gap will reach a critical or action-triggering threshold — minus the lead time required to close the gap.

```
Intervention window = Time to critical threshold − Lead time to close the gap

If intervention window < 0: action is already overdue
If intervention window < 2 weeks: urgent escalation required
If intervention window 2–6 weeks: schedule intervention now
If intervention window > 6 weeks: monitor; plan intervention
```

**Common lead times by intervention type (calibrate for your domain):**

| Intervention | Typical lead time |
|---|---|
| Internal reallocation | 1–3 days |
| Contractor / temp engagement | 1–3 weeks |
| New hire (external) | 6–12 weeks |
| Training / skill development | 4–8 weeks |
| Infrastructure scaling (cloud) | Hours to days |
| Infrastructure scaling (hardware) | Weeks to months |
| Process change / automation | Weeks to months |

### Step 6 — Model the cascade effect (if applicable)

When capacity is insufficient, downstream effects compound. Model the cascade:

```
Capacity gap → [Primary effect] → [Secondary effect] → [Tertiary effect] → [Business outcome]

Example (generic workforce):
Gap → Overtime → Burnout risk → Engagement decline → Voluntary turnover → Gap worsens

Example (generic infrastructure):
Gap → Queue depth increase → Latency rise → User experience degradation → Churn risk increase
```

Identify the cascade point — the period at which secondary effects start accelerating the primary problem.

---

## 2. Output Format

```
Capacity-Demand Gap Forecast
─────────────────────────────────────────────────────────
Forecast Master Block
- Capacity metric: [definition + current value]
- Demand metric: [definition + current value]
- Forecast period: [start → end]
- Granularity: [weekly / monthly]
- Method: [M-X — name, for demand forecast]
- Training window: [start → end]
- Version integrity: [confirmed clean / corrected — describe]
- Primary assumptions: [list]
- Decision purpose: [what this informs]
- Decay date: [review by date]

Current State
- Effective supply: [value] ([calculation basis])
- Demand: [value]
- Current gap: [+/- value] — Status: [Adequate / Watch / Elevated / Critical]

Capacity Changes Already Planned
| Change | Effective date | Supply impact |
| [change] | [date] | [+/- value] |

Gap Projection
| Period | Demand | Eff. supply | Gap | Status |
| [P+1]  | [v]    | [v]         | [v] | [tier] |
| [P+2]  | [v]    | [v]         | [v] | [tier] |
| [P+3]  | [v]    | [v]         | [v] | [tier] |

Threshold Crossings
- Watch threshold: [period when first crossed, if applicable]
- Critical threshold: [period when first crossed, if applicable]

Intervention Window
- Critical threshold reached: [period]
- Lead time required for fastest intervention: [N weeks]
- Action required by: [date]
- Intervention window: [N weeks — or "overdue"]

Cascade Risk (if applicable)
[Primary effect] at [period] → [Secondary effect] at [period] → [Outcome] at [period]
Cascade inflection point: [the period when secondary effects begin compounding]

Recommended Interventions (ranked by lead time)
1. [Intervention] — Lead time: [N weeks] — Supply impact: [+N] — Cost: [estimate]
2. [Intervention] — Lead time: [N weeks] — Supply impact: [+N] — Cost: [estimate]

Business Interpretation
[2–3 sentences: what the gap means for service delivery, risk, or business outcomes]

Confidence Assessment
- Overall confidence: [high / medium / low]
- Demand forecast confidence: [from demand forecast]
- Supply assumption confidence: [how reliable are planned changes]
- Caveats: [absence volatility, ramp uncertainty, demand model limitations]
- Version notes: [any releases that affect capacity or demand metrics]
- Next step: [intervention decision or monitoring cadence]
─────────────────────────────────────────────────────────
```
