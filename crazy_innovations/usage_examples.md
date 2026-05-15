# Crazy Innovations — Usage Examples

This file contains practical examples for invoking the Crazy Innovations system in a controlled way.

Core rule:
Always specify the exact UI area.
Do not ask it to “make the whole app futuristic.”
The system works best when the target area, the purpose, the data, and the constraints are clearly described.

Recommended invocation pattern:
- reference `crazy_innovations/system.md`
- reference `crazy_innovations/frontend_innovation_prompt.md`
- specify the exact target area
- explain what the area currently does
- explain the user goal
- explain the relevant data
- explain constraints
- optionally specify the desired intensity level

---

## Example 1 — Agile board filter sidebar

Use `crazy_innovations/system.md` and `crazy_innovations/frontend_innovation_prompt.md`.

Target area:
Resources > Agile > Board filter sidebar

What it currently does:
Users choose filters for task display on the board.

Goal:
Transform this sidebar into a brutally powerful futuristic filtering surface that helps users understand and manipulate task visibility faster and more intuitively.

Data involved:
Task fields, field types, selected filters, available filter values, saved presets, board columns.

Constraints:
- Keep the rest of the page unchanged.
- Must remain understandable for normal business users.
- Must be React-friendly.
- Must not break existing filtering logic.
- Must remain aligned with the actual task data.

What I want:
Invent a radically new, cyberpunk, high-utility filtering experience that goes far beyond standard checkbox groups and dropdowns, but still feels practical and fast.

---

## Example 2 — Dashboard KPI overview

Use `crazy_innovations/system.md` and `crazy_innovations/frontend_innovation_prompt.md`.

Target area:
Executive dashboard > KPI summary section

What it currently does:
Shows static KPI cards and a few trend indicators.

Goal:
Turn this into a futuristic command-center style decision surface that makes trends, anomalies, and urgency much more visible and actionable.

Data involved:
KPI values, trend data, deltas, thresholds, status signals, date range comparisons.

Constraints:
- Do not redesign the whole dashboard.
- Keep the summary scannable in under 5 seconds.
- Preserve business seriousness.
- Avoid useless visual noise.
- Must work on desktop and tablet.

What I want:
Invent a cyberpunk command layer that makes KPI comprehension dramatically more powerful, while still staying executive-friendly and data-truthful.

---

## Example 3 — Table row details panel

Use `crazy_innovations/system.md` and `crazy_innovations/frontend_innovation_prompt.md`.

Target area:
Project list > Row details drawer

What it currently does:
A row click opens a standard side drawer with fields and actions.

Goal:
Evolve it into an ultra-futuristic data-inspection experience that makes entity understanding, anomaly spotting, and quick action dramatically better.

Data involved:
Project metadata, owner, status, dates, risks, tags, comments, activity history.

Constraints:
- Preserve core actions.
- Do not change navigation patterns outside the drawer.
- Must remain accessible.
- Must not overload small screens.

What I want:
Create an inspection-drawer concept that feels like a sci-fi forensic console but is still useful for real business decisions.

---

## Example 4 — Empty state innovation

Use `crazy_innovations/system.md` and `crazy_innovations/frontend_innovation_prompt.md`.

Target area:
Resources > Integrations > Empty state

What it currently does:
Shows a simple “no integrations yet” message with a button.

Goal:
Turn the empty state into a futuristic activation experience that motivates setup and teaches the product value at the same time.

Data involved:
No real data yet, but conceptually it relates to integrations, sync sources, and future imported work items.

Constraints:
- Must stay simple.
- Must not become a marketing page.
- Should improve onboarding clarity.
- Must still convert users toward the primary action.

What I want:
Invent an ultra-original empty-state experience that feels alive, intelligent, and futuristic, while pushing setup completion.

---

## Example 5 — Advanced search area

Use `crazy_innovations/system.md` and `crazy_innovations/frontend_innovation_prompt.md`.

Target area:
Global task search panel

What it currently does:
Allows users to search tasks by text and some standard filters.

Goal:
Transform it into a future-grade search and discovery system that feels like an intelligent command interface.

Data involved:
Task title, type, status, assignee, creator, dates, tags, project, custom fields.

Constraints:
- Must remain fast.
- Must not confuse keyboard users.
- Must support structured filtering.
- Must remain realistic for implementation.

What I want:
Go far beyond a normal search bar and invent a cyberpunk-grade discovery interface for finding the right tasks with much less cognitive effort.

---

## Example 6 — Form builder section

Use `crazy_innovations/system.md` and `crazy_innovations/frontend_innovation_prompt.md`.

Target area:
Admin > Form builder > Field arrangement area

What it currently does:
Users drag and drop form fields into sections.

Goal:
Make the builder feel like a futuristic schema-composition environment, not just a drag-and-drop list.

Data involved:
Field definitions, field types, grouping, validation rules, conditional logic, section layout.

Constraints:
- Do not break existing builder functionality.
- Must stay editable with mouse and keyboard.
- Must remain understandable for admins.
- Should support dense configuration.

What I want:
Invent a radically better interface for composing structured forms, with futuristic layout intelligence and deeper field awareness.

---

## Example 7 — Timeline or activity feed

Use `crazy_innovations/system.md` and `crazy_innovations/frontend_innovation_prompt.md`.

Target area:
Entity details > Activity timeline

What it currently does:
Shows events in a standard chronological list.

Goal:
Turn the feed into a futuristic temporal intelligence surface that helps users understand sequence, causality, bursts of change, and unusual activity.

Data involved:
Timestamps, actor, event type, field changes, comments, attachments, status changes.

Constraints:
- Must remain truthful to the event order.
- Must not distort audit data.
- Must remain readable.
- Avoid visual chaos.

What I want:
Design a cyberpunk-but-useful timeline experience that reveals patterns, not just logs.

---

## Example 8 — Board card redesign

Use `crazy_innovations/system.md` and `crazy_innovations/frontend_innovation_prompt.md`.

Target area:
Agile board > Task card component

What it currently does:
Shows a standard card with title and a few metadata badges.

Goal:
Create a next-generation task card that exposes meaning, urgency, dependency, and change risk much more effectively.

Data involved:
Title, status, type, assignee, creator, created date, tags, priority, blockers, linked tasks, custom fields.

Constraints:
- Must still fit in a board layout.
- Must not make cards too tall.
- Must preserve scanability.
- Must remain performant with many cards on screen.

What I want:
Invent a radically more intelligent card concept with cyberpunk energy and real information density.

---

## Example 9 — Highly serious page, toned-down mode

Use `crazy_innovations/system.md` and `crazy_innovations/frontend_innovation_prompt.md`.

Target area:
Financial approval screen > Decision summary panel

What it currently does:
Shows amount, approver, due date, and decision actions.

Goal:
Enhance the clarity and decision confidence of this panel with a future-facing interaction model, but keep it visually restrained and serious.

Data involved:
Approval status, amount, dates, owner, risk flags, rule outcomes, comments.

Constraints:
- This is a high-trust enterprise context.
- Avoid playful or overly flashy effects.
- Maintain accessibility and auditability.
- Keep tone serious.

What I want:
Use the crazy innovation system in controlled mode: futuristic, sharp, differentiated, but less neon and less theatrical. Prioritize clarity and authority over spectacle.

---

## Example 10 — Max-intensity mode

Use `crazy_innovations/system.md` and `crazy_innovations/frontend_innovation_prompt.md`.

Target area:
Landing page > Interactive hero section

What it currently does:
A conventional product hero with title, subtitle, CTA, and a screenshot.

Goal:
Turn this into an absolutely unforgettable, hyper-futuristic, cyberpunk, impossible-to-ignore interface moment that still communicates the product clearly.

Data involved:
Product value proposition, main features, user pain points, visual demo states.

Constraints:
- Must still communicate the product.
- Must remain responsive.
- Should not destroy load performance.
- Should still lead to CTA action.

What I want:
Go full intensity here. I want a creative explosion. Use the maximum innovation mode and push the concept to the edge of what is still practical.

---

## Reusable short template

Use this template whenever you want to target a new area:

Use `crazy_innovations/system.md` and `crazy_innovations/frontend_innovation_prompt.md`.

Target area:
[exact page / submenu / component / section]

What it currently does:
[current behavior]

Goal:
[what should become much stronger, more useful, more futuristic]

Data involved:
[relevant entities, fields, states, signals]

Constraints:
- [constraint 1]
- [constraint 2]
- [constraint 3]

Intensity:
[low / medium / high / maximum]

What I want:
[describe the type of innovation you want]

---

## Intensity guide

Low:
- restrained innovation
- mostly serious
- only subtle futurism
- suitable for enterprise and backoffice screens

Medium:
- clear visual differentiation
- more advanced interactions
- still conservative enough for most business apps

High:
- bold interaction patterns
- stronger motion and stronger visual identity
- obvious futuristic character

Maximum:
- extreme originality
- cyberpunk / sci-fi / command-center energy
- only for places where spectacle and memorability are welcome

---

## Best practices

- Always target one specific area.
- Always explain the real purpose of that area.
- Always name the data involved.
- Always define what must not break.
- Use “toned-down mode” for serious business screens.
- Use “maximum mode” only where extreme differentiation is actually useful.
- Ask for implementation-ready output if you want build instructions, not just ideas.
- Ask for one winning concept if you do not want too many directions.

---

## Strong one-line invocation

Use `crazy_innovations/system.md` and `crazy_innovations/frontend_innovation_prompt.md`, and redesign only the exact target area below with maximum originality, maximum usefulness, maximum product fit, and at least 5 rounds of creativity escalation.

---

## Strong implementation-oriented invocation

Use `crazy_innovations/system.md` and `crazy_innovations/frontend_innovation_prompt.md`.

Target area:
[exact area]

I do not want broad ideation only.
I want:
- one winning concept,
- detailed UX/UI behavior,
- interaction model,
- state logic,
- frontend component breakdown,
- animation guidance,
- responsive rules,
- accessibility notes,
- implementation-ready instructions for a coding AI.