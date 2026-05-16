# Narrative Storytelling Prompt — Data Storytelling, BI Narrative Craft

> **When to use:** Transforming a completed BI analysis into a written narrative that persuades, informs, or drives action. The analysis is done — this prompt structures the communication of it.

---

## 1. The Purpose of BI Narrative

Numbers do not drive decisions. Understanding does. A BI narrative bridges the gap between a correct analysis and an audience that acts on it.

A BI narrative is not a data dump in sentence form. It is a structured argument that:
1. Establishes what is happening (the situation).
2. Explains why it is happening (the complication).
3. States what should happen next (the resolution).

---

## 2. The Five-Part Story Arc

Every BI narrative follows this structure:

**Part 1 — Context (1–2 sentences)**
Where are we? What period, what metric, what scope? Orient the audience before presenting data.

**Part 2 — Signal (1–3 sentences)**
What is the main finding? State the most important fact first, with a number. Do not build to it — lead with it.

**Part 3 — Explanation (2–4 sentences)**
Why is the metric at this level? Present the ranked causes from the analysis. State confidence levels for non-obvious causes.

**Part 4 — Implication (1–2 sentences)**
What does this mean for the business? Connect the metric to an outcome that matters to the audience (revenue, risk, customer experience, operational efficiency).

**Part 5 — Action (1–2 sentences)**
What should happen next? State a specific action, decision, or investigation — not a vague recommendation.

---

## 3. Audience Calibration

| Audience | Preferred register | Length | Numbers |
|---|---|---|---|
| Board / Investors | Formal, outcome-focused | Very short — 1 page max | High-level only |
| Executive / C-suite | Direct, decision-focused | Short — 1–2 paragraphs per topic | 3–5 key figures |
| Senior management | Clear, causal | Medium — with operational detail | Full metric set |
| Technical / Analyst | Precise, sourced | Full — with methodology | Complete |

Never write a board narrative at management depth, or a management narrative at board height.

---

## 4. Language Rules

**Use:**
- Active voice ("Revenue declined 8%" not "There was a decline in revenue of 8%").
- Specific numbers ("12% below target" not "significantly below target").
- Directional language ("accelerating," "plateaued," "reversed") rather than neutral language.
- Causal connectors when causation is established ("because," "driven by," "resulting from").

**Avoid:**
- Hedging language that obscures findings ("there may be some indication that...").
- Passive constructions that obscure agency ("mistakes were made," "data was impacted").
- Jargon that the stated audience tier does not use.
- Listing data points without interpreting them.
- Ending on data without a clear action or recommendation.

---

## 5. BI Narrative Anti-Patterns

| Anti-pattern | Example | Fix |
|---|---|---|
| Lead burial | Positive fluff → buried bad news in paragraph 4 | Lead with the most important finding, positive or negative |
| Number soup | "Revenue was 1.2M, up from 1.1M, with ARPU at 43..." | Limit to 3–5 numbers; introduce each with meaning first |
| Causation claim without evidence | "Revenue fell because of market conditions" | Qualify: "The most likely cause, pending confirmation, is..." |
| False precision | "Churn was 6.23%" | Round to meaningful precision: "Churn was 6.2%" |
| Action-free conclusion | "The data shows a complex picture" | End with a specific recommended action |
| Passive voice escalation | "It was observed that..." | "We found..." or just state the finding directly |
| Version blindness | Attributing a shift to behavior without checking releases | Check the changelog; disclose version context |

---

## 6. Output Format

```
BI Narrative — [Topic]
─────────────────────────────────────────────────────────
Audience: [tier]
Period: [time window]
Version context: [software version]
Source analysis: [which prompt file and output this narrative is based on]

Narrative
[Part 1 — Context]
[Part 2 — Signal: lead with the main finding + number]
[Part 3 — Explanation: why, with ranked causes and confidence]
[Part 4 — Implication: what this means for the business]
[Part 5 — Action: specific next step or decision]

Data Appendix (optional — for audiences who want the numbers)
- [Metric 1]: [value] vs. [baseline] — [source]
- [Metric 2]: [value] vs. [baseline] — [source]

Confidence Disclosure
[One sentence stating the confidence level and any significant caveats]
─────────────────────────────────────────────────────────
```
