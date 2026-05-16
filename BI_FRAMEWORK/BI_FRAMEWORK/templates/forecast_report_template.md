# Forecast Report Template — Standard Forecast Output Structure

> Use this template for all forecast outputs. Always complete the Forecast Master Block first. Read `prompts/forecasting_methodology.md` before filling in this template.

---

```
FORECAST REPORT
═══════════════════════════════════════════════════════════════
Report title:      [descriptive title]
Forecast type:     [Demand / Capacity / Financial / Churn / Engagement / Scenario]
Prepared by:       [analyst / role]
Prepared for:      [audience]
Report date:       [YYYY-MM-DD]
═══════════════════════════════════════════════════════════════

SECTION 1 — FORECAST MASTER BLOCK
────────────────────────────────────
[Complete this block before any other section. Do not omit any field.]

Metric:             [name + definition]
Forecast period:    [start → end]
Granularity:        [daily / weekly / monthly]
Method:             [M-1 through M-6 — name and selection rationale]
Training window:    [start → end, N periods]
Version integrity:  [Confirmed clean / Corrected — describe correction /
                     Compromised — explain why and what the impact is]
Primary assumptions:
  1. [Assumption — what would invalidate it?]
  2. [Assumption — what would invalidate it?]
  3. [Assumption — what would invalidate it?]
Decision purpose:   [Explicit: what decision does this forecast inform?]
Decay date:         [Review or replace by: YYYY-MM-DD]
Confidence interval: [80% / 90% / scenario range]

SECTION 2 — HISTORICAL CONTEXT
─────────────────────────────────
Data range available:   [start → end, N periods]
Historical trend:       [direction, slope per period]
Seasonal patterns:      [pattern IDs applied from seasonal_pattern_library.md / none]
Version events in history: [any definition or scope changes in training window — and how handled]
Data quality:           [complete / partial — note any gaps]

Key historical statistics:
  Mean (training period):           [value]
  Standard deviation:               [value]
  Min:                              [value]
  Max:                              [value]
  Most recent N-period average:     [value]

SECTION 3 — FORECAST OUTPUT
──────────────────────────────

Point Forecast with Confidence Interval
| Period | Point forecast | Lower [X%] | Upper [X%] |
| [P+1]  | [value]        | [value]    | [value]    |
| [P+2]  | [value]        | [value]    | [value]    |
| [P+3]  | [value]        | [value]    | [value]    |
| [P+4]  | [value]        | [value]    | [value]    |

[If statistical CI is not available, replace with scenario range:]

Scenario Range
| Period | Optimistic | Base | Pessimistic |
| [P+1]  | [value]    | [v]  | [value]     |

Period-End Summary:
  Base forecast at end of period:   [value ± CI or range]
  Cumulative change from current:   [+/- value and %]
  vs. Target (if applicable):       [+/- value]

SECTION 4 — THRESHOLD ANALYSIS
──────────────────────────────────
[Only complete if documented thresholds exist for this metric]

Warning threshold [value]:    [Date/period when first breached, if applicable]
Critical threshold [value]:   [Date/period when first breached, if applicable]
Intervention window:          [Time between now and breach − lead time required]
Action required by:           [date — "overdue" if window is negative]

SECTION 5 — SCENARIO COMPARISON
──────────────────────────────────
[Complete this section only for scenario modeling outputs; omit for single-path forecasts]

Baseline (do nothing / current trajectory):
  Period-end value: [value]

Alternative scenarios:
| Scenario | Key input change | Period-end value | Delta vs. baseline |
| [name]   | [assumption]     | [value]          | [+/- value]        |
| [name]   | [assumption]     | [value]          | [+/- value]        |

Recommended scenario: [which option and why, based on risk-adjusted outcome]

SECTION 6 — SENSITIVITY ANALYSIS
───────────────────────────────────
[How much does the forecast change for each unit of change in key assumptions?]

| Input variable | ±10% change → | Forecast impact |
| [variable 1]   | [direction]   | [+/- %]        |
| [variable 2]   | [direction]   | [+/- %]        |

Most sensitive assumption: [which variable has the greatest impact on the forecast]

SECTION 7 — CASCADE RISK (if applicable)
──────────────────────────────────────────
[Complete for capacity, demand, or workforce forecasts with downstream consequences]

Primary gap / risk: [what the gap or threshold breach leads to]
Cascade chain:
  [Period X]: [Primary effect]
  [Period Y]: [Secondary effect]
  [Period Z]: [Outcome risk]

Cascade inflection point: [when do secondary effects begin compounding?]

SECTION 8 — RECOMMENDED ACTIONS
───────────────────────────────────
[Specific actions implied by the forecast. Ranked by urgency.]

1. [Action] — Rationale: [why] — Owner: [role] — By: [date]
2. [Action] — Rationale: [why] — Owner: [role] — By: [date]
3. [Action] — Rationale: [why] — Owner: [role] — By: [date]

SECTION 9 — FORECAST VALIDATION RECORD
─────────────────────────────────────────
[Complete this section when the forecast period has elapsed and actuals are available]

Forecast produced: [original date]
Forecast period end: [date]
Actuals:
| Period | Forecast | Actual | Error | Within CI? |
| [P+1]  | [value]  | [value]| [+/-] | [yes/no]   |
| [P+2]  | [value]  | [value]| [+/-] | [yes/no]   |

Systematic bias identified: [yes — direction and cause / no]
Model update required: [yes — describe / no]

SECTION 10 — CONFIDENCE ASSESSMENT
─────────────────────────────────────
Overall confidence:   [High / Medium / Low]
Method fit:           [How well does the selected method match the data pattern?]
Training quality:     [Was the training window sufficient and version-clean?]
Assumption quality:   [Are the primary assumptions well-supported?]
Key caveats:          [Most significant sources of uncertainty]
Version notes:        [Any releases that affect forecast validity]
Decay date confirmed: [YYYY-MM-DD — after this date, re-run before citing]
═══════════════════════════════════════════════════════════════
```
