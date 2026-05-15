# User Manual

## Metadata
- Generated at: `__GENERATED_AT_ISO__`
- Repository: `__DERIVE_FROM_REPO__`
- Revision: `__DETECT_CURRENT_REVISION__`
- Confidence: `__SET_BY_GENERATOR__`

## Purpose
Explain exactly how users perform the major workflows in the system, screen by screen and click by click.

## Recommended flow format
For every user-facing workflow document:
1. Where to start
2. Menu path
3. Screen or tab name
4. What the user sees
5. What to click
6. What fields to fill in
7. What validations apply
8. What happens after submit
9. Where the result appears
10. Who acts next
11. What statuses can occur
12. How to verify success
13. Troubleshooting notes

## Workflow template
### [Workflow name]
**Start from:**

**Menu path:**

**Route / page:**

**Steps:**
1. 
2. 
3. 

**Required inputs:**
- 

**Validations:**
- 

**Outcome:**

**Where to verify:**

**Next actor actions:**

**Common problems:**
- 

## User-manual evidence rules
User instructions must describe real screens, actions, labels, routes, tabs, dialogs, and outcomes from repository evidence.

For every workflow, include:
- actor and role
- prerequisite state
- entry point
- visible UI surface
- exact action sequence
- expected success state
- recoverable error state
- permission or access-denied state
- where to verify the result
- related process flow and feature catalog entry

If a screen label or flow is uncertain, do not invent a final user-facing instruction. Mark the step as evidence gap and record it in `./DOC_GENERATION_REPORT.md`.

## Repository-relative rule
All route and document references must be repository-relative or application-route-relative. Never include local workstation paths.
