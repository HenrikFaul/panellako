# BI Governance Prompt — Metric Consistency, Definition Lifecycle, Quality Gates

> **When to use:** Auditing BI output quality, managing the metric definition lifecycle, resolving metric disputes, enforcing standards across analysts or teams, or reviewing whether BI outputs meet the framework's quality bar.

---

## 1. BI Governance Principles

BI governance exists to solve three specific problems:
1. **Metric proliferation** — Multiple definitions of the same concept coexist, causing inconsistent reporting.
2. **Definition drift** — Metrics evolve without documentation, making historical comparisons unreliable.
3. **Output quality variance** — Different analysts produce outputs of different standards, eroding trust.

---

## 2. Metric Lifecycle States

Every metric in the catalog must have one of these states:

| State | Meaning | Allowed in production reporting? |
|---|---|---|
| **Draft** | Definition under review; not yet ratified | No — internal use only |
| **Active** | Definition ratified; in use | Yes |
| **Deprecated** | Being phased out; replacement defined | Yes, with disclosure |
| **Retired** | No longer tracked; historical data preserved | No — historical reference only |
| **Contested** | Definition disputed; investigation open | Yes, with prominent disclosure |

**State transition rules:**
- Draft → Active: requires definition review, baseline established, polarity confirmed.
- Active → Deprecated: requires a replacement metric to be Active; transition period stated.
- Deprecated → Retired: requires confirmation that no live reports depend on it.
- Any state → Contested: any analyst can raise a contest; requires a named resolution owner and deadline.

---

## 3. BI Output Quality Gate (Three-Tier)

Apply before any BI output is delivered.

**Tier 1 — Minimum (must pass for any output)**
- [ ] Metric definition is from an authoritative source (not assumed from a label).
- [ ] Time window is explicitly stated.
- [ ] Scope is explicitly stated.
- [ ] Version history was checked for the analysis period.
- [ ] Data quality was assessed and disclosed.
- [ ] No metric values are stated without a verifiable source.

**Tier 2 — Standard (required for regular reporting)**
All Tier 1 checks, plus:
- [ ] Baseline or benchmark exists and is documented.
- [ ] Confidence level is assigned and justified.
- [ ] Statistical validity is addressed (N ≥ 30 or caveat applied).
- [ ] PII rules are applied.
- [ ] Recommended action is stated.

**Tier 3 — Board/Executive (required for senior audience outputs)**
All Tier 1 and Tier 2 checks, plus:
- [ ] Multiple candidate causes are evaluated for any variance.
- [ ] Seasonal adjustment is applied or explicitly ruled out.
- [ ] Version-induced shifts are explicitly assessed.
- [ ] Uncertainty is disclosed with specific remediation path.
- [ ] Next analytical step is stated.

---

## 4. Metric Conflict Resolution Protocol

When two analysts or reports cite different values for the same metric:

**Step 1 — Confirm the conflict is real.**
Are both analysts using the same metric definition? Time window? Scope? Granularity? Many apparent conflicts dissolve when these are aligned.

**Step 2 — Trace each value to its source.**
Every value must be traceable to a specific table, query, or pipeline. If it cannot be traced, it is not valid.

**Step 3 — Check the version context.**
Were the two values produced from data spanning different software versions? A metric can have legitimately different values across a version boundary if the computation changed.

**Step 4 — Identify the authoritative definition.**
The authoritative definition is the one in `templates/metric_definition_template.md` with state = Active. If no Active definition exists, place the metric in Contested state and begin a definition review.

**Step 5 — Resolve and document.**
Once the correct value is established, document the resolution as a BI Decision Record (see `prompts/bi_documentation.md`, Type 2). The resolution document prevents the same conflict recurring.

---

## 5. BI Standards Registry

These standards are non-negotiable across all BI outputs:

| Standard | Rule |
|---|---|
| S-01 Version awareness | Every analysis checks version history before attributing a metric shift to a business cause. |
| S-02 Baseline requirement | No metric is assessed as good or bad without a documented benchmark or target. |
| S-03 Explicit time window | Every output states start date, end date, and granularity. |
| S-04 Explicit scope | Every output states which population, segment, or tenant is in scope. |
| S-05 Source citation | Every metric value cites a verifiable source. |
| S-06 Data quality disclosure | Data quality is disclosed before analysis, not buried after. |
| S-07 Confidence level | Every output assigns and justifies a confidence level. |
| S-08 Statistical validity | N < 30 is always flagged. Partial periods are always disclosed. |
| S-09 PII compliance | Individual-level data in outputs requires explicit authorization. |
| S-10 Actionability | Every output ends with a recommended action or next step. |

---

## 6. Output Format — Governance Audit

```
BI Governance Audit
─────────────────────────────────────────────────────────
Audit date: [date]
Version: [software version]
Artifact audited: [report / dashboard / metric definition]
Audit scope: [which metrics or outputs were reviewed]

Quality Gate Results
Tier 1 (Minimum): [pass / fail — list failing items]
Tier 2 (Standard): [pass / fail / N/A — list failing items]
Tier 3 (Board): [pass / fail / N/A — list failing items]

Metric State Audit
| Metric | Current state | Issue |
| [name] | [state] | [none / describe] |

Standards Violations
| Standard | Violation | Affected output |
| [S-0X] | [describe] | [report/dashboard name] |

Conflicts Identified
[List any metric definition conflicts, with source trace and status]

Remediation Required
- [Action] — Owner: [role] — Deadline: [date]

Overall Governance Assessment: [compliant / non-compliant — summary]
─────────────────────────────────────────────────────────
```
