# Root Cause Analysis Prompt — Driver Identification, Causal Reasoning

> **When to use:** A metric has moved and you need to understand why. Systematic identification of causes, ruling out non-causes, and producing an evidence-ranked explanation.

---

## 1. Root Cause Analysis Protocol

### Step 1 — Precisely define the observation
Before investigating causes, state the observation with precision:
- Which metric? (Full definition, not just label.)
- What changed? (Absolute and relative magnitude.)
- When? (Start of change, duration, is it continuing?)
- In which scope? (Is this company-wide or isolated to a segment, cohort, region?)

Vague observations produce vague analyses. "Revenue went down" is not a starting point. "Paying customer count declined by 8% MoM in the mid-market segment during March" is.

### Step 2 — Apply the six-cause-category framework

Work through every category. Do not skip to the most obvious explanation.

| Category | What to check |
|---|---|
| 1. Version / software change | Did a release, schema migration, or configuration change coincide with the shift? |
| 2. Scope change | Did the measured population change? (New accounts, excluded segment, tier change.) |
| 3. Seasonality | Is this a known pattern? (Reference `prompts/seasonal_pattern_library.md`.) |
| 4. External event | Business event, market condition, or calendar effect (holiday, campaign, news)? |
| 5. Data quality | Is the shift in the data or in reality? (Missing records, delayed ingestion, bulk import.) |
| 6. Behavioral / operational change | Did user behavior, a process, or a team action change? |

### Step 3 — Test each candidate cause

For each candidate, apply the four-test confirmation protocol:

1. **Timing test** — Does the candidate coincide with the metric change? (Required but not sufficient.)
2. **Scope test** — Does the candidate affect the same population as the metric change? (A change affecting all users cannot explain a change only in one segment.)
3. **Magnitude test** — Is the candidate large enough to explain the observed change?
4. **Counterfactual test** — Would the metric have moved without this candidate? (What was the control condition?)

A candidate must pass all four tests to be classified as a confirmed cause.

### Step 4 — Rank by evidence strength

| Confidence | Criteria |
|---|---|
| High | Passes all 4 tests; direct evidence available |
| Medium | Passes 3 of 4 tests; circumstantial evidence supports |
| Low | Passes 1–2 tests; plausible but unverified |
| Ruled out | Fails timing or scope test |

### Step 5 — Distinguish correlation from causation

Do not present correlation as causation without at least one of:
- A plausible mechanism (A causes B through what pathway?).
- Elimination of confounders.
- Precedence (A changes before B, not simultaneously).
- Replication (the same pattern has appeared before under similar conditions).

### Step 6 — Produce the output (Section 2 format).

---

## 2. Output Format

```
Root Cause Analysis
─────────────────────────────────────────────────────────
BI Context
- Version: [version]
- Metric: [name + definition]
- Observation: [what changed, magnitude, period]
- Scope: [population / segment / tenant]
- Data source: [source]
- Data quality: [complete / partial / uncertain]

Candidate Causes (ranked by evidence strength)

1. [Candidate cause — category]
   - Evidence: [source and data point]
   - Timing test: [pass / fail]
   - Scope test: [pass / fail]
   - Magnitude test: [pass / fail]
   - Counterfactual: [pass / fail / untestable]
   - Confidence: [high / medium / low]

2. [Candidate cause — category]
   [same structure]

3. [Candidate cause — category]
   [same structure]

Ruled Out
- [Candidate] — Reason ruled out: [which test failed and why]

Primary Conclusion
[1–2 sentences: the most evidence-supported cause, stated as a hypothesis with confidence level]

Causal Mechanism
[If confidence is High: explain the causal pathway — how does cause A produce effect B?]

Recommended Action
- To confirm: [what investigation would elevate this to High confidence if not already there]
- To resolve: [what operational action addresses the root cause]
- To prevent: [what change would reduce recurrence]

Confidence Assessment
- Overall confidence: [high / medium / low]
- Caveats: [what remains uncertain]
- Version notes: [relevant changelog entries]
- Next step: [specific next analytical or operational action]
─────────────────────────────────────────────────────────
```
