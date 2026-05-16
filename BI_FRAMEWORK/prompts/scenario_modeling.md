# Scenario Modeling Prompt — What-If Analysis, Decision Impact, Scenario Comparison

> **Read `prompts/forecasting_methodology.md` before using this file.**

---

## 1. Scenario Modeling Principles

Scenario modeling answers a different question than forecasting. Forecasting asks: "What will happen?" Scenario modeling asks: "What happens if we do X?" or "What if condition Y occurs?"

A scenario model is valid only if:
1. Each scenario has a defined, specific set of input assumptions.
2. Each input assumption is connected to the output metric through a stated causal mechanism.
3. The uncertainty of each assumption is acknowledged.
4. Scenarios are compared on a common baseline, not against each other.

---

## 2. Scenario Modeling Protocol

### Step 1 — Define the decision or condition being modeled
State the scenario question precisely:
- **Decision scenarios:** "What happens to [metric] if we [take action]?"
- **Risk scenarios:** "What happens to [metric] if [condition] occurs?"
- **Sensitivity scenarios:** "How sensitive is [metric] to changes in [variable]?"

### Step 2 — Establish the baseline
The baseline is the "do nothing" or "current trajectory" scenario. Every other scenario is measured as a delta from the baseline. Without a defined baseline, scenario comparison is meaningless.

### Step 3 — Define each scenario's assumptions explicitly

For each scenario:
- Name the scenario (Optimistic / Base / Pessimistic, or scenario-specific names).
- State the specific input change (quantified, not directional).
- State the causal mechanism: how does input change A produce output change B?
- State the probability or plausibility (if assessable).
- State what would have to be true for this scenario to materialize.

### Step 4 — Map decision impact chains

For complex decisions with multiple downstream effects, map the chain:

```
Decision → Primary impact → Secondary impact → Tertiary impact

Example (generic):
Headcount reduction → Coverage reduction → Service quality decline → Customer churn risk increase

Example (generic):
Price increase → Volume reduction (price elasticity) → Revenue net change → Customer LTV impact
```

Identify which links in the chain are well-evidenced vs. assumed. The weakest link determines the overall scenario confidence.

### Step 5 — Compute each scenario's output

For each scenario:
- Apply the input changes to the baseline model.
- Compute the output metric at each time step in the forecast period.
- Compute the cumulative impact at the end of the period.
- Compute the break-even point (when does the decision pay off, if applicable?).

### Step 6 — Apply uncertainty stacking warning

When multiple uncertain assumptions are stacked (Assumption A AND Assumption B AND Assumption C must all hold), the joint probability compounds. If each assumption has 70% confidence, three stacked assumptions produce 0.7³ = 34% confidence. Flag this prominently when scenarios depend on multiple independent assumptions.

---

## 3. Decision-Type Impact Templates

Use these generic templates as starting points for common decision types:

**Capacity / staffing decision:**
```
Input: Headcount change (N)
→ Capacity change: capacity × (N / current headcount)
→ Throughput impact: demand ÷ new capacity = coverage ratio
→ Quality impact: [if coverage < threshold → quality risk]
→ Cost impact: headcount cost × N
```

**Pricing decision:**
```
Input: Price change (%)
→ Volume impact: volume × price elasticity × price change %
→ Revenue impact: (new price × new volume) − (old price × old volume)
→ Margin impact: revenue change − variable cost change
```

**Product launch:**
```
Input: New feature / segment
→ Addressable market expansion: [estimate]
→ Adoption rate: [historical analogy or assumption]
→ Revenue uplift: [at stated adoption rate × price]
→ Cost: [development + operational]
```

---

## 4. Output Format

```
Scenario Model
─────────────────────────────────────────────────────────
BI Context
- Version: [version]
- Decision / condition modeled: [question]
- Output metric(s): [what is being measured]
- Forecast horizon: [how far out]
- Baseline: [definition of the baseline scenario]
- Data source: [source]
- Data quality: [complete / partial / uncertain]

Baseline Projection
| Period | Baseline value |
| [P+1]  | [value]        |
| [P+2]  | [value]        |

Scenario Comparison
| Scenario | Key assumption | [P+1] | [P+2] | Period-end | Delta vs. baseline |
| [S1]     | [assumption]   | [v]   | [v]   | [v]        | [+/-]              |
| [S2]     | [assumption]   | [v]   | [v]   | [v]        | [+/-]              |
| [S3]     | [assumption]   | [v]   | [v]   | [v]        | [+/-]              |

Impact Chain (for primary scenario)
[Decision] → [Primary impact] → [Secondary impact] → [Output metric change]
Weakest link: [most uncertain step in the chain]

Uncertainty Assessment
- Stacked assumptions: [N independent assumptions — combined confidence estimate]
- Uncertainty stacking warning: [flag if combined confidence < 50%]

Sensitivity Analysis (if applicable)
- [Variable]: ±[X%] change → ±[Y%] output change
- [Variable]: ±[X%] change → ±[Y%] output change

Decision Recommendation
[Based on the scenario comparison, which option produces the best risk-adjusted outcome — and why]

Confidence Assessment
- Overall confidence: [high / medium / low]
- Caveats: [which causal links are most uncertain]
- Version notes: [any releases that affect the baseline]
- Next step: [what data or analysis would reduce decision uncertainty]
─────────────────────────────────────────────────────────
```
