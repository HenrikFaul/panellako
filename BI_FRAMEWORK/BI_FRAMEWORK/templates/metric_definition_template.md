# Metric Definition Template

> Complete one entry per metric. Do not proceed with analysis of a metric that lacks a completed definition here.

---

## Metric Definition Record

```
Metric name: [Canonical human-readable name]
Short name / alias: [Used in dashboards or code, if different]
Owner: [Team or role responsible for maintaining this definition]
State: [Draft / Active / Deprecated / Retired / Contested]

Version history:
  - v[X.Y.Z] [date]: [Definition first established / changed — describe what changed]

---

DEFINITION

What this metric measures:
[1–2 sentences. What business activity or outcome does this number represent?]

Formula:
[Write out the formula explicitly. No black boxes.]

Numerator:
[What is counted / summed / measured in the numerator?]
[Inclusion criteria: what records are included?]
[Exclusion criteria: what is explicitly excluded? (test accounts, deleted records, partial periods)]

Denominator (if a rate or ratio):
[What is the population or base?]
[Inclusion criteria:]
[Exclusion criteria:]

Unit:
[Count / percentage / ratio / currency / duration / score / other]

Granularity:
[At what level is this computed? Daily / weekly / monthly / per user / per account / other]

---

DATA SOURCE

Primary data source: [Table name / view / API endpoint / file]
Key field(s): [Which columns produce the numerator and denominator]
Schema version: [Version where this schema was introduced or last changed]
Query reference: [Link to canonical query or pipeline, if available]

---

POLARITY AND THRESHOLDS

Polarity: [Higher = better / Lower = better / Context-dependent — explain]

Baseline (earliest available): [value, date range]
Current target: [value, or "not yet set"]

Warning threshold: [value — when to start paying attention]
Critical threshold: [value — when to escalate or act]

---

COMPARABILITY

Prior period comparability: [Yes — definition unchanged / No — changed at v[X.Y.Z] on [date]]
Segment comparability: [Is this metric comparable across segments? Any caveats?]
Multi-tenant scope: [Is this per-tenant / per-segment / aggregate only?]

---

KNOWN ISSUES AND CAVEATS

[List any known data quality issues, historical periods with bad data, or interpretation caveats]

---

REVIEW

Reporting cadence: [Daily / Weekly / Monthly / Quarterly]
Review cadence: [When should this definition be revisited — e.g., each major release, annually]
Last reviewed: [date]
Next review: [date]
```

---

## How to Complete This Template

1. **Name the metric canonically.** The name here is the source of truth. Dashboard labels, code variable names, and analyst references should all trace back to this name.

2. **Write the formula before anything else.** If you cannot write the formula, the metric is not ready to track.

3. **State inclusions and exclusions explicitly.** "All users" is not a complete definition. "All users who have completed at least one successful action, excluding test accounts and accounts created less than 24 hours ago, in the reporting period" is.

4. **Confirm polarity before assessing performance.** A metric where "higher = better" and one where "lower = better" require opposite interpretations of the same direction of movement.

5. **Set a warning threshold before a crisis.** Thresholds set under pressure are arbitrary. Set them while the metric is healthy.

6. **Record every definition change.** When the formula changes, the history must record when and why. Without this, comparisons across the change boundary are unreliable.
