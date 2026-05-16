# Anomaly Detection Prompt — Outlier Detection, Triage, Classification

> **When to use:** A metric value looks wrong, unexpectedly high or low, or inconsistent with adjacent data. Triage whether it is a real business event, a data quality issue, a version artifact, a seasonal pattern, or a statistical outlier.

---

## 1. Anomaly Detection Protocol

### Step 1 — Confirm the anomaly
Before investigating causes, verify the value is genuinely anomalous:
- What is the value? What would be normal? (State the baseline explicitly.)
- Is the deviation ≥ 2 standard deviations from the recent rolling average, OR ≥ 20% from the prior comparable period?
- Is this a single data point or a sustained shift?

If the value is within normal range, classify as **normal variation** and stop.

### Step 2 — Apply the anomaly taxonomy
Classify before investigating:

| Type | Label | Description |
|---|---|---|
| A | Statistical outlier | Value outside expected range with no evident cause |
| B | Business-logic anomaly | Value that violates a known constraint or rule |
| C | Version-induced artifact | Anomaly coincides with a software or schema change |
| D | Seasonal anomaly | Value matches a known seasonal pattern |
| E | Integration/pipeline anomaly | Likely caused by data ingestion, ETL, or API failure |

One anomaly may fit multiple types. Assign the most likely primary type.

### Step 3 — Triage severity

| Severity | Criteria | Response |
|---|---|---|
| Critical | Metric crosses a documented threshold OR data may be missing entirely | Immediate investigation required |
| High | ≥ 3× normal volatility OR sustained across 2+ periods | Investigate within 24h |
| Medium | ≥ 2× normal volatility, single period | Monitor; investigate if repeats |
| Low | Near threshold, likely explainable | Log and watch |

### Step 4 — Check for version causation (always first)
Before any business explanation:
- Did any release, migration, schema change, or configuration change occur at or before this data point?
- If yes: name this as the primary candidate cause. Do not attribute to a business event until the version explanation is ruled out.

### Step 5 — Investigate by type

**Type A (Statistical):** Check for data entry errors, bulk imports, test data contamination, rounding or unit changes.

**Type B (Business-logic):** Check whether the value is logically possible. (A rate > 100%, a count below zero, a negative revenue figure.) Identify which constraint was violated.

**Type C (Version-induced):** Name the release. Identify the specific schema or logic change. Check whether prior values before the release would look different under the new computation.

**Type D (Seasonal):** Reference `prompts/seasonal_pattern_library.md`. Does the anomaly match a documented pattern? What is the expected seasonal index for this period?

**Type E (Integration):** Check for pipeline failures, delayed ingestion, API errors, duplicate records, or missing partitions.

### Step 6 — Produce the output (Section 3 format).

---

## 2. False Positive Checklist

Before escalating an anomaly, verify it is not one of these:

- [ ] Partial period data (month not yet complete, week has fewer business days)
- [ ] Timezone difference causing records to fall in the wrong bucket
- [ ] New data source or connector added mid-period
- [ ] Backfill of historical records inflating a recent period count
- [ ] Metric scope change (new segment included, old segment excluded)
- [ ] Test or seed data not filtered from production

---

## 3. Output Format

```
Anomaly Detection Report
─────────────────────────────────────────────────────────
BI Context
- Version: [version]
- Metric: [name + definition]
- Anomalous period: [date/period]
- Scope: [population / segment / tenant]
- Data source: [source]
- Data quality: [complete / partial / uncertain]

Anomaly Classification
- Type: [A / B / C / D / E — label]
- Severity: [Critical / High / Medium / Low]
- Anomalous value: [value + unit]
- Normal range: [baseline ± volatility]
- Deviation: [absolute and %]
- Duration: [single period / sustained N periods]

Candidate Causes (ranked by evidence strength)
1. [Cause] — Type: [A/B/C/D/E] — Evidence: [source] — Confidence: [high/medium/low]
2. [Cause] — Type: [A/B/C/D/E] — Evidence: [source] — Confidence: [high/medium/low]
3. [Cause] — Type: [A/B/C/D/E] — Evidence: [source] — Confidence: [high/medium/low]

False Positive Check
- Partial period: [yes / no]
- Timezone issue: [yes / no]
- Backfill: [yes / no]
- Scope change: [yes / no]
- Test data: [yes / no]

Recommended Action
- Immediate: [what to do now]
- Investigate: [what to verify to confirm the cause]
- Escalate to: [if Critical — who needs to know]

Confidence Assessment
- Overall confidence: [high / medium / low]
- Caveats: [what is still uncertain]
- Version notes: [relevant changelog entries]
- Next step: [data pull, query, or check that would resolve uncertainty]
─────────────────────────────────────────────────────────
```
