# Segment & Cohort Analysis Prompt — Segmentation, Cohort Tracking, Funnel Analysis

> **When to use:** Comparing performance across groups, tracking a cohort over time, analyzing a multi-step funnel, or identifying which segment is driving an aggregate metric movement.

---

## 1. Segmentation Analysis Protocol

### Step 1 — Define the segmentation clearly
Before comparing, confirm:
- What is the segmentation variable? (Industry, plan tier, geography, acquisition channel, signup cohort, etc.)
- How are segments defined? Are the boundaries stable or do they change over time?
- Can a record belong to multiple segments? If so, how is attribution handled?
- Did the segment definition change in any version during the analysis period?

### Step 2 — Verify segment comparability

Segments are comparable only if:
- They share the same metric definition (same numerator and denominator logic).
- They cover the same time window.
- Sample sizes are sufficient in each segment (N ≥ 30 per segment; flag if not).
- No confounders distinguish them that are not part of the analysis (e.g., comparing new vs. tenured segments when the metric is correlated with tenure).

### Step 3 — Apply segment analysis

For each segment:
- State the metric value.
- Compare to the overall population average.
- State the sample size.
- Identify whether this segment is driving or lagging the aggregate.

If one segment is driving the aggregate movement: isolate it and re-run the aggregate without that segment to measure its contribution.

---

## 2. Cohort Analysis Protocol

A cohort is a group of records that share the same entry point (signup date, first transaction, first event) tracked over time.

### Step 1 — Define cohort entry and window
- Entry event: [what event defines entry into the cohort?]
- Entry window: [which period? — a week, a month, a quarter?]
- Observation window: [how far out are you tracking? 30d, 90d, 1y?]
- Exit event: [what defines leaving the cohort? — churn, conversion, deletion?]

### Step 2 — Construct the retention/conversion table
Track the metric at each time interval from entry:

| Cohort | T+0 | T+30d | T+60d | T+90d | T+180d |
|---|---|---|---|---|---|
| [Entry period 1] | 100% | [%] | [%] | [%] | [%] |
| [Entry period 2] | 100% | [%] | [%] | [%] | [%] |

### Step 3 — Identify cohort divergence
- Are newer cohorts performing better or worse than older ones at the same time interval?
- If divergence exists: did a product change, a go-to-market change, or a data collection change coincide with the shift?
- Are all cohorts visible for the full observation window? (Newer cohorts may have incomplete data — flag as partial.)

---

## 3. Funnel Analysis Protocol

A funnel tracks conversion from stage to stage through a defined sequential process.

### Step 1 — Define the funnel
- Name each stage in sequence.
- Define the entry condition for each stage.
- Define whether the funnel is strict (must complete all prior stages) or loose (can enter mid-funnel).
- State the time window for each stage.

### Step 2 — Compute stage-by-stage conversion
- Entry → Stage 2: [N entering, N converting, conversion rate]
- Stage 2 → Stage 3: [N entering, N converting, conversion rate]
- Repeat for each stage.
- Overall funnel conversion: first-stage entrants who reach the final stage.

### Step 3 — Identify the highest-drop-off stage
- The stage with the lowest conversion is the constraint.
- Check whether the drop-off is consistent across segments or concentrated.
- Check whether it has changed over time.

---

## 4. Output Format

```
Segment / Cohort / Funnel Analysis
─────────────────────────────────────────────────────────
BI Context
- Version: [version]
- Analysis type: [segmentation / cohort / funnel]
- Metric: [name + definition]
- Time window: [start → end]
- Scope: [population]
- Data source: [source]
- Data quality: [complete / partial / uncertain]

[SEGMENTATION ANALYSIS if applicable]
Segment Breakdown
| Segment | Value | vs. Average | N | Driver? |
| [seg 1] | [val] | [+/-] | [N] | [yes/no] |
| [seg 2] | [val] | [+/-] | [N] | [yes/no] |

Key finding: [which segment is driving the aggregate and why it matters]

[COHORT ANALYSIS if applicable]
Cohort Performance
| Cohort | T+0 | T+30d | T+60d | ... |
| [C1] | 100% | [%] | [%] | |
| [C2] | 100% | [%] | [%] | |

Cohort trend: [improving / deteriorating / stable — with evidence]

[FUNNEL ANALYSIS if applicable]
Funnel Conversion
| Stage | Entered | Converted | Rate | Change vs. prior |
| [S1→S2] | [N] | [N] | [%] | [+/-] |
| [S2→S3] | [N] | [N] | [%] | [+/-] |

Constraint stage: [highest drop-off — segment breakdown if available]

Business Interpretation
[2–4 sentences connecting the segmentation/cohort/funnel finding to a business outcome]

Recommended Action
[What should change based on this analysis]

Confidence Assessment
- Overall confidence: [high / medium / low]
- Small-N segments flagged: [list any segment with N < 30]
- Caveats: [partial cohorts, segment definition changes, version contamination]
- Version notes: [relevant changelog entries]
- Next step: [what analysis would deepen this finding]
─────────────────────────────────────────────────────────
```
