# Predictive Signals Prompt — Leading Indicators and Early Warning Systems

> **When to use:** Identifying which observable signals predict a future metric movement before it appears in lagging indicators. Building early warning systems that give the business time to act.

---

## 1. Leading Indicator Design Protocol

### Step 1 — Identify the target outcome
State the lagging metric you are trying to predict:
- What is the metric? (Full definition.)
- What constitutes a negative outcome? (Threshold value, direction, magnitude.)
- What is the decision this prediction enables? (If it cannot change a decision, the signal is not useful.)

### Step 2 — Identify candidate leading signals

Work through these signal categories:

| Category | Examples |
|---|---|
| Behavioral frequency | Login frequency, feature usage rate, session depth |
| Engagement quality | Task completion rate, time-to-complete key action, depth of use |
| Support signals | Ticket volume, ticket sentiment, ticket escalation rate |
| Operational health | Error rate, SLA near-miss rate, queue depth trend |
| Financial signals | Invoice dispute rate, payment delay, contract modification frequency |
| Social / relationship | NPS trajectory, response rate to communications, referral activity |
| Platform signals | API call volume, integration health, data freshness |

### Step 3 — Test each candidate signal

A candidate signal is useful only if it meets all four criteria:

| Criterion | Requirement |
|---|---|
| Lead time | Signal changes measurably before the target outcome, with enough lead time to act |
| Directionality | Signal and outcome move in a predictable relationship (positive or inverse correlation) |
| Specificity | Signal predicts the target outcome, not all outcomes generally |
| Observability | Signal can be measured reliably from available data |

### Step 4 — Validate with historical data
- Does the signal have a track record of predicting the outcome in historical data?
- What is the false positive rate? (Signal fires but outcome does not materialize.)
- What is the false negative rate? (Outcome occurs without signal firing.)
- Is N sufficient for the validation? (At least 20 instances of the outcome in history.)

### Step 5 — Define the alert threshold
For each validated leading signal:
- **Warning threshold** — when to begin monitoring (signal has entered a concerning range).
- **Action threshold** — when to intervene (signal has crossed a level where historical data shows high outcome probability).
- **False alarm buffer** — how many consecutive periods the signal must breach before alerting (reduces noise).

### Step 6 — Document in the signal registry
Record validated signals with evidence, lead time, confidence, and review date.

---

## 2. Leading Indicator Map Template

Fill this in for your domain. Examples shown are generic — replace with your specific signals.

| Target outcome | Leading signal | Lead time | Confidence | Threshold |
|---|---|---|---|---|
| Customer churn | Declining login frequency | 30–45 days | [high/med/low] | [define] |
| Revenue decline | Pipeline drop / trial-to-paid fall | 45–60 days | [high/med/low] | [define] |
| Operational failure | Error rate trend upward | 7–14 days | [high/med/low] | [define] |
| Support cost spike | Ticket volume rise | 14–21 days | [high/med/low] | [define] |
| [Your outcome] | [Your signal] | [N days] | [high/med/low] | [define] |

Document confirmed relationships in this file as they are validated.

---

## 3. Early Warning System Design

When multiple signals are combined into a composite early warning system:

**Aggregation rules:**
- Do not average signals with different lead times — they predict different horizons.
- Weight signals by historical predictive accuracy, not by intuition.
- Require ≥ 2 independent signals to fire before escalating to an action alert (reduces false positives).

**Alert escalation tiers:**

| Tier | Criteria | Response |
|---|---|---|
| Watch | 1 signal at warning threshold | Increase monitoring frequency |
| Alert | 2 signals at warning threshold, OR 1 at action threshold | Investigate and prepare intervention |
| Escalate | 2+ signals at action threshold | Activate intervention protocol |

---

## 4. Output Format

```
Predictive Signal Analysis
─────────────────────────────────────────────────────────
BI Context
- Version: [version]
- Target outcome: [lagging metric + threshold]
- Analysis period: [for validation]
- Scope: [population / segment / tenant]
- Data source: [source]
- Data quality: [complete / partial / uncertain]

Signal Assessment
| Signal | Lead time | Correlation | False+ rate | False- rate | Confidence |
| [s1]   | [N days]  | [+/-]       | [%]         | [%]         | [h/m/l]    |
| [s2]   | [N days]  | [+/-]       | [%]         | [%]         | [h/m/l]    |

Validated Signals (ready for production monitoring)
1. [Signal name] — Threshold: warning=[value] / action=[value] — Lead time: [N days]
2. [Signal name] — Threshold: warning=[value] / action=[value] — Lead time: [N days]

Signals Rejected
- [Signal] — Reason: [failed which criterion]

Current Alert Status (if monitoring is live)
- [Signal]: [current value] — Status: [normal / watch / alert / escalate]

Recommended Action
[What to monitor, what to set up, or what to investigate based on current signal state]

Confidence Assessment
- Overall confidence: [high / medium / low]
- Validation basis: [N historical instances used]
- Caveats: [small sample, version changes in history, definition gaps]
- Review date: [when to revalidate these signals]
─────────────────────────────────────────────────────────
```
