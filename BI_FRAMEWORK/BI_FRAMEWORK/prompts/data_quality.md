# Data Quality Prompt — Trust Assessment, Completeness, Confidence Scoring

> **When to use:** Assessing whether a data source or metric can be trusted, determining completeness of a dataset, diagnosing why data looks wrong, or producing a formal data quality report before analysis.

---

## 1. Data Quality Assessment Protocol

### Step 1 — Identify the data source and pipeline
- What table, view, API endpoint, or file produces this data?
- What is the ingestion method and frequency? (Real-time, batch, manual upload?)
- What transformations occur between source and reporting layer?
- Is there a known data dictionary or schema definition?

### Step 2 — Score across five quality dimensions

Rate each dimension: **High / Medium / Low / Unknown**

| Dimension | Definition | How to assess |
|---|---|---|
| Completeness | Are all expected records present? | Row count vs. expected; null rate in key fields |
| Consistency | Are values consistent across time, segments, or sources? | Cross-source reconciliation; duplicate check |
| Currency | Is data up-to-date for the requested period? | Last-updated timestamp vs. required freshness |
| Validity | Do values conform to expected ranges and formats? | Outlier check; domain validation (e.g., rates > 100%) |
| Provenance | Can the data be traced to its source? | Audit trail; lineage documentation |

### Step 3 — Check for known quality patterns

Common data quality failure modes:

| Pattern | Indicator | Investigation |
|---|---|---|
| Missing records | Row count below expected | Check ETL logs, source system |
| Duplicate records | Count > expected, metric inflated | Deduplication query |
| Delayed ingestion | Data available but stale | Check pipeline last-run timestamp |
| Bulk import contamination | Spike in a historical period | Check for backfill or migration event |
| Test data in production | Records with test/seed identifiers | Filter on known test account IDs |
| Timezone mismatch | Records falling in wrong day bucket | Check timezone handling at ingestion |
| Schema drift | Field type or name changed | Compare current schema to historical DDL |

### Step 4 — Assign an overall data quality score

| Score | Criteria |
|---|---|
| Reliable | All 5 dimensions High; no known issues |
| Usable with caveats | 3–4 dimensions High; issues documented and bounded |
| Unreliable | ≥ 2 dimensions Low or Unknown; significant gaps |
| Do not use | Data is known to be wrong or incomplete in ways that cannot be quantified |

### Step 5 — State what the quality score means for analysis
- At **Reliable**: proceed with analysis.
- At **Usable with caveats**: proceed, but prominently disclose caveats in output.
- At **Unreliable**: do not proceed until the specific issue is resolved. State what resolution requires.
- At **Do not use**: halt analysis. State what data is needed instead.

### Step 6 — Produce the output (Section 2 format).

---

## 2. Output Format

```
Data Quality Assessment
─────────────────────────────────────────────────────────
BI Context
- Version: [version]
- Data source: [table / view / API / file]
- Pipeline: [ingestion method and frequency]
- Assessment period: [start → end]
- Scope: [segment / tenant / full dataset]

Quality Dimension Scores
- Completeness: [High / Medium / Low / Unknown] — [evidence]
- Consistency: [High / Medium / Low / Unknown] — [evidence]
- Currency: [High / Medium / Low / Unknown] — [evidence]
- Validity: [High / Medium / Low / Unknown] — [evidence]
- Provenance: [High / Medium / Low / Unknown] — [evidence]

Known Issues
1. [Issue type] — [description] — [impact on analysis] — [resolution status]
2. [Issue type] — [description] — [impact on analysis] — [resolution status]

Overall Quality Score: [Reliable / Usable with caveats / Unreliable / Do not use]

Recommendation
- Proceed: [yes / yes with caveats / no]
- Required disclosures: [what must be stated in any analysis using this data]
- Resolution path: [what must be fixed, and how, before quality improves]

Confidence Assessment
- Overall confidence: [high / medium / low]
- Blocking issues: [what prevents full-confidence analysis]
- Version notes: [any releases that affect data quality for this period]
- Next step: [what to investigate or fix first]
─────────────────────────────────────────────────────────
```
