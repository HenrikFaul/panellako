# Executive Summary Prompt — Board-Ready Narrative Generation

> **When to use:** Producing a written summary of BI findings for a board, executive team, investor, or senior leadership audience. Transforms data analysis into decision-oriented narrative.

---

## 1. Executive Summary Design Principles

Executive audiences are time-constrained and decision-focused. Every sentence must either:
- State a material fact (with a number and a comparison).
- Explain a cause or driver.
- Recommend an action or flag a risk.

Remove everything that does not meet one of these three criteria.

---

## 2. Audience Calibration

Before writing, confirm the audience tier:

| Tier | Focus | Vocabulary | Detail level |
|---|---|---|---|
| Board / Investors | Strategic health, risk, return | Business outcomes, capital efficiency | Summary only — no operational detail |
| Executive / C-suite | Strategic + operational | Business outcomes + key operational drivers | 1 level below board |
| Senior management | Operational + performance | Operational metrics, process language | Full operational context |
| Team leads / Operational | Execution detail | Metric definitions, diagnostic data | Detailed |

Write for the stated tier. Do not include operational detail in a board summary. Do not be too abstract for a management summary.

---

## 3. Mandatory Six-Section Structure

Every executive summary produced under this framework uses this structure:

**Section 1 — Period and Version Context**
State the reporting period, the software version in production, and any significant releases during the period.

**Section 2 — Business Position (3 sentences max)**
Where the business stands overall. Use 2–3 of the highest-signal metrics. State direction and magnitude, not just values.

**Section 3 — What Is Working**
1–3 specific positives with numbers. Never vague. ("Feature adoption is up 14% WoW among paying accounts" not "adoption is improving.")

**Section 4 — What Requires Attention**
1–3 specific concerns with numbers, causes where known, and the risk if not addressed. Rank by urgency.

**Section 5 — Decisions Required**
Explicit list of decisions this audience must make. Format: "[Who] must decide [what] by [when] or [consequence]."

**Section 6 — Confidence and Data Quality**
State the confidence level of the analysis, flag any data quality issues, and note any metrics where the definition or source changed during the period.

---

## 4. Handling Bad News

When a metric is materially deteriorating:
- State the number directly. Do not soften with "challenging" or "headwinds."
- State the cause if known.
- State whether it is recoverable, and on what timeline.
- Recommend the action or the decision needed.

Do not bury bad news in positive context. Decision-makers who are surprised by bad news lose trust in the BI system.

---

## 5. Output Format

```
Executive Summary — [Period]
─────────────────────────────────────────────────────────
Prepared for: [audience tier]
Version in production: [version]
Reporting period: [start → end]
Scope: [business unit / segment / whole company]
Data quality: [complete / partial — note if incomplete]

1. Business Position
[2–3 sentences with the 2–3 highest-signal metrics. Direction + magnitude. No filler.]

2. What Is Working
• [Metric]: [value] — [direction vs. baseline] — [why it matters]
• [Metric]: [value] — [direction vs. baseline] — [why it matters]

3. What Requires Attention
• [Metric]: [value] — [direction vs. baseline] — Risk: [consequence if unaddressed]
• [Metric]: [value] — [direction vs. baseline] — Risk: [consequence if unaddressed]

4. Decisions Required
• [Who] must decide [what] by [when] or [consequence].
• [Who] must decide [what] by [when] or [consequence].

5. Confidence and Data Quality
- Overall confidence: [high / medium / low]
- Data completeness: [complete / partial — which metrics are affected]
- Definition changes: [any metric whose definition or source changed this period]
- Version notes: [relevant releases that may affect metric values]
─────────────────────────────────────────────────────────
```
