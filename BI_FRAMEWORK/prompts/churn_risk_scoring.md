# Churn Risk Scoring Prompt — Customer, User, or Employee Attrition Risk from Signals

> **Read `prompts/forecasting_methodology.md` before using this file.**

---

## 2. Privacy and Data Handling — Read First

Before scoring individuals or accounts for churn risk:

- **Minimum aggregation:** Unless individual-level risk scoring is explicitly authorized and documented, present risk distributions at the segment or cohort level, not individual level.
- **PII handling:** Do not include names, email addresses, or other direct identifiers in BI outputs. Use anonymized IDs only.
- **Purpose limitation:** Churn risk scores must be used for the stated decision purpose only. Define the decision before producing the scores.
- **Transparency:** Where applicable to your regulatory context (GDPR, CCPA, etc.), consult your privacy policy on automated profiling.

Configure your specific privacy rules in `SYSTEM.md` Section 1 (Regulatory context / PII minimum aggregation).

---

## 1. Churn Risk Scoring Protocol

### Step 1 — Define churn for this context
Churn must be defined before signals are selected. Define:
- **Event:** What constitutes churn? (Account cancellation, non-renewal, resignation, inactivity threshold?)
- **Window:** What time horizon is the score predicting? (30-day risk, 90-day risk, next quarter?)
- **Population:** Which accounts, users, or employees are in scope?

### Step 2 — Select behavioral signals

Signals must be validated against historical churn events (see `prompts/predictive_signals.md`). Generic signal categories to investigate:

| Category | Example signals |
|---|---|
| Usage frequency | Declining session count, shrinking active days |
| Depth of engagement | Feature abandonment, reduced action diversity |
| Support behavior | Rising ticket frequency, unresolved issue aging |
| Relationship signals | Declining NPS response, negative sentiment in communications |
| Financial signals | Late payment, contract modification request, scope reduction |
| Onboarding | Incomplete setup, low adoption of key features |
| Inactivity | Last-active date receding |

### Step 3 — Construct the risk score

**Simple scoring approach (for small datasets or early-stage systems):**
- Assign each signal a weight based on its historical predictive strength (from `prompts/predictive_signals.md`).
- Score each entity: sum of (signal value × weight) for all signals.
- Normalize to a 0–100 scale.

**Threshold approach (minimal data requirement):**
- Count the number of warning signals active for each entity.
- Risk tier based on signal count:

| Signal count | Risk tier |
|---|---|
| 0–1 | Low |
| 2–3 | Moderate |
| 4–5 | High |
| 6+ | Critical |

Calibrate thresholds against historical churn rates in your data.

### Step 4 — Project churn volume
Using the risk distribution across the population:

```
Expected churn in period = Σ (entity count in tier × historical churn rate for that tier)
```

State the confidence interval on this projection.

### Step 5 — Identify intervention priorities
- Which entities at High or Critical risk are the highest value? (Revenue, strategic importance.)
- For which is intervention most likely to succeed? (Early warning with time to act vs. already decided.)
- What is the intervention playbook for each risk tier?

---

## 3. Score Validation

Before deploying a churn risk score in production monitoring:
- Backtest on historical data: what would the score have predicted vs. what actually happened?
- Measure precision (of those scored High/Critical, what % actually churned?) and recall (of those who churned, what % were scored High/Critical?).
- State the false positive rate — interventions triggered by false positives have a cost.
- Set a minimum acceptable precision threshold before acting on scores.

---

## 4. Output Format

```
Churn Risk Analysis
─────────────────────────────────────────────────────────
BI Context
- Version: [version]
- Churn definition: [event + window]
- Population: [N accounts / users / employees in scope]
- Scope: [segment / tier / region]
- Scoring period: [when scores were computed]
- Data quality: [complete / partial / uncertain]

Privacy Compliance
- Aggregation level: [individual / cohort N≥X / segment]
- Authorization: [confirmed / state basis]

Risk Distribution
| Risk tier | Count | % of population | Historical churn rate |
| Critical  | [N]   | [%]             | [%]                   |
| High      | [N]   | [%]             | [%]                   |
| Moderate  | [N]   | [%]             | [%]                   |
| Low       | [N]   | [%]             | [%]                   |

Expected Churn Volume (next [window])
- Point estimate: [N] — [confidence interval]
- Revenue at risk: [value, if applicable]

Top Signals Active in High/Critical Population
1. [Signal name] — Active in [X%] of high-risk entities
2. [Signal name] — Active in [X%] of high-risk entities

Intervention Priority
- Highest value at risk: [describe segment or cohort — no individual IDs]
- Best intervention window: [how much lead time exists]
- Recommended action: [playbook for each tier]

Confidence Assessment
- Score validation: [backtest precision and recall, or not yet validated]
- Caveats: [signal availability, definition changes, small N]
- Version notes: [releases that may affect signal quality]
- Next step: [validation run, intervention design, or monitoring cadence]
─────────────────────────────────────────────────────────
```
