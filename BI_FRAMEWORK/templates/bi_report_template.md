# BI Report Template — Standard Analysis Report Structure

> Use this template for regular BI analysis reports (weekly, monthly, or ad-hoc). For board-level reports, use `templates/board_report_template.md`. For forecast reports, use `templates/forecast_report_template.md`.

---

```
BI ANALYSIS REPORT
═══════════════════════════════════════════════════════════════
Report title:    [descriptive title]
Report type:     [Weekly review / Monthly analysis / Ad-hoc investigation]
Prepared by:     [analyst name or role]
Prepared for:    [audience — team / management / executive]
Report date:     [YYYY-MM-DD]
Version:         [software version at time of report]
Reporting period: [start → end]
Scope:           [business unit / segment / full product / tenant]
═══════════════════════════════════════════════════════════════

SECTION 1 — DATA QUALITY AND SCOPE
───────────────────────────────────
Data completeness:   [Complete / Partial — describe what is missing]
Data sources:        [list]
Version integrity:   [Clean / Version boundary present — describe impact]
Known issues:        [list any data quality flags]
PII handling:        [aggregation level applied]

SECTION 2 — EXECUTIVE SUMMARY
──────────────────────────────
[3–5 sentences maximum. State the most important finding, its magnitude, its cause if known, and the recommended action. Do not lead with data — lead with the finding.]

SECTION 3 — METRIC PERFORMANCE
────────────────────────────────
[Repeat this block for each key metric in scope]

Metric: [name]
Definition: [brief — refer to metric_definition_template.md for full definition]
State: [Active / Deprecated]
─
Current value:    [value + unit]
Baseline:         [value + type (target / prior period / peer)]
Absolute change:  [+/- value]
Relative change:  [+/- %]
Direction:        [Improvement / Deterioration / Neutral]
Polarity:         [Higher = better / Lower = better]
Statistical note: [N = X — sufficient / insufficient — caveat if needed]
─
Interpretation:   [1–2 sentences. What does this value mean?]
Cause (if known): [What drove this movement? Confidence level?]
Action required:  [Yes / No — if yes, describe]

SECTION 4 — VARIANCE ANALYSIS
──────────────────────────────
[For any metric that moved significantly — document the variance investigation]

Metric:             [name]
Observation:        [what changed, magnitude]
Candidate causes:
  1. [cause] — Evidence: [source] — Confidence: [high/medium/low]
  2. [cause] — Evidence: [source] — Confidence: [high/medium/low]
Primary conclusion: [most likely cause — state as hypothesis with confidence]

SECTION 5 — TREND SUMMARY
──────────────────────────
[For metrics with directional movement — summarize the trend]

| Metric | Direction | Trend type | Periods | Signal/noise |
| [name] | [dir]     | [type]     | [N]     | [trend/vol]  |

Notable trend breaks: [describe any break in direction or slope — with version check]
Seasonal effects applied: [pattern ID / none]

SECTION 6 — RECOMMENDED ACTIONS
─────────────────────────────────
[Numbered list of specific actions. Each action states WHO should do WHAT by WHEN.]

1. [Action] — Owner: [role] — Deadline: [date]
2. [Action] — Owner: [role] — Deadline: [date]
3. [Action] — Owner: [role] — Deadline: [date]

SECTION 7 — OPEN QUESTIONS
────────────────────────────
[What could not be answered in this report, and what is needed to answer it?]

1. [Question] — Blocked by: [what data or investigation is needed]
2. [Question] — Blocked by: [what data or investigation is needed]

SECTION 8 — CONFIDENCE ASSESSMENT
────────────────────────────────────
Overall confidence:  [High / Medium / Low]
Basis:               [what evidence supports the analysis]
Key caveats:         [most significant uncertainties]
Version notes:       [changelog entries affecting this period]
Next report:         [date / trigger condition]
═══════════════════════════════════════════════════════════════
```
