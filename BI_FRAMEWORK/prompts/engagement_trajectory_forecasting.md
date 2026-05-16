# Engagement Trajectory Forecasting Prompt — Engagement Score Projection, Risk Timeline

> **Read `prompts/forecasting_methodology.md` before using this file.**

---

## 1. Engagement Trajectory Protocol

### Step 1 — Define engagement for this context
Engagement must have a specific, measurable definition. Specify:
- **What is being measured?** (Session frequency, feature usage depth, task completion rate, survey score, content consumption, etc.)
- **What is the composite score (if applicable)?** (How are multiple signals weighted into a single score?)
- **What is the measurement cadence?** (Daily, weekly, monthly?)
- **What is the minimum data requirement?** (How many observations are needed to establish a trajectory?)

A score computed differently across versions is not comparable. Check version history before computing trajectory.

### Step 2 — Data sufficiency check

| Minimum data required | Condition |
|---|---|
| 4 consecutive observations | To compute a direction |
| 6 consecutive observations | To compute a trend with moderate confidence |
| 12+ observations | To compute a trend with high confidence and apply seasonality |
| 2+ full seasonal cycles | To apply a seasonal correction |

If data is below the minimum for the required confidence level, state the limitation and cap the forecast horizon accordingly.

### Step 3 — Compute the trajectory

**Velocity (rate of change per period):**
```
Velocity = (Latest value − Oldest value in window) ÷ Number of periods
```

**Acceleration (is velocity itself changing?):**
```
Acceleration = (Recent velocity) − (Prior velocity)
Positive acceleration: rate of change is increasing
Negative acceleration (deceleration): rate of change is slowing
```

**Trajectory classification:**

| Classification | Criteria |
|---|---|
| Strongly improving | Velocity positive, acceleration positive or neutral |
| Improving | Velocity positive, deceleration present (slowing improvement) |
| Stable | Velocity near zero, low volatility |
| Declining | Velocity negative |
| Rapidly declining | Velocity negative, acceleration negative (worsening rate) |
| Recovering | Prior decline, now reversing — confirm ≥ 3 consecutive improving periods |

### Step 4 — Apply proxy signal adjustment (if direct data is limited)
When direct engagement measurement is sparse, augment with proxy signals:
- Login/session frequency as a proxy for engagement depth.
- Feature breadth (number of distinct features used) as a proxy for platform value realization.
- Support ticket volume as an inverse proxy (rising tickets correlate with engagement friction).

State any proxy signals used and their relationship to the direct measure.

### Step 5 — Project the trajectory

Using the Forecast Master Block from `prompts/forecasting_methodology.md`:
- Project the engagement score at each future period using the current velocity and acceleration.
- Compute a confidence interval based on recent volatility.
- Flag the period at which the projected score crosses a documented threshold (warning or critical).

### Step 6 — Assign a risk tier

| Tier | Criteria |
|---|---|
| Monitoring | Score > warning threshold; trajectory stable or improving |
| Elevated | Score approaching warning threshold OR declining trajectory |
| High | Score below warning threshold OR rapidly declining trajectory |
| Critical | Score below critical threshold OR projected to cross critical threshold within [N periods] |

State which threshold values apply for each tier in your project's configuration (`SYSTEM.md` Section 1).

---

## 2. Output Format

```
Engagement Trajectory Forecast
─────────────────────────────────────────────────────────
Forecast Master Block
- Metric: [engagement score / measure name + definition]
- Forecast period: [start → end]
- Granularity: [daily / weekly / monthly]
- Method: [M-X — name]
- Training window: [start → end, N observations]
- Version integrity: [confirmed clean / corrected — describe]
- Primary assumptions: [list]
- Decision purpose: [what decision this informs]
- Decay date: [review by date]
- Confidence interval: [80% / scenario range]

Current State
- Latest score: [value]
- Trend: [direction + velocity per period]
- Acceleration: [positive / neutral / negative]
- Classification: [Strongly improving / Improving / Stable / Declining / Rapidly declining / Recovering]
- Risk tier: [Monitoring / Elevated / High / Critical]

Trajectory Projection
| Period | Projected score | Lower bound | Upper bound |
| [P+1]  | [value]         | [value]     | [value]     |
| [P+2]  | [value]         | [value]     | [value]     |
| [P+3]  | [value]         | [value]     | [value]     |

Threshold Crossings (if projected)
- Warning threshold [value]: projected breach at [period]
- Critical threshold [value]: projected breach at [period]
- Action required by: [period − intervention lead time]

Proxy Signals (if used)
- [Signal name]: [current value] — [trend direction]

Business Interpretation
[2–3 sentences: what the trajectory means for user/customer/employee outcomes]

Recommended Action
- Immediate: [if Critical or High — what to do now]
- Monitor: [if Elevated — what to watch]
- Investigate: [what would confirm or refute the trajectory]

Confidence Assessment
- Overall confidence: [high / medium / low]
- Data sufficiency: [N observations available vs. minimum required]
- Caveats: [version shifts, proxy reliance, definition changes]
- Version notes: [relevant releases]
- Next step: [review trigger or investigation target]
─────────────────────────────────────────────────────────
```
