# AI_EXECUTION_PROMPTS.md — Effectime Enterprise Dev Governance

> **Ez a fájl az első olvasandó minden fejlesztési session elején.**
> Read this file first, then follow the Session-start read order before writing any code.

---

## Session-start read order

Read ALL of the following before implementing anything:

| # | File | When |
|---|------|------|
| 1 | `AI_EXECUTION_PROMPTS.md` | ← you are here, always |
| 2 | `codingLessonsLearnt.md` | always — avoid previously documented mistakes |
| 3 | `CHANGELOG.md` | always — know what is already built; never regress it |
| 4 | `.governance/controller.md` | always — core governance rules |
| 5 | `.governance/agent_execution_rules.md` | always — execution authority |
| 6 | `.governance/ui_ux_rules.md` | only when UI is touched |
| 7 | Latest `versioning/*.md` file(s) relevant to the task | when the task relates to a known module |
| 8 | `marketing/SYSTEM.md` | when producing marketing assets, copy, campaign plans, or feature announcements |
| 8a | `marketing/marketing_values/` (recent files) | when a marketing agent needs to know current product capabilities |
| 9 | The relevant report-toolkit entry file (see "Repository report & documentation toolkits" below) | only when the task is to generate a valuation, growth-strategy, or repository-documentation report — and only if that toolkit folder is present in the repo |

Do not skip steps 2 and 3. They are the primary defense against regressions and repeated mistakes.

Steps 6, 7, 8, 8a and 9 are conditional — read them only when the task type matches. Step 9 toolkits are self-contained and self-governing; you read their entry file instead of guessing, not in addition to skipping it.

---

## Engineering workflow (mandatory for every task)

You are an elite principal software architect, senior full-stack engineer, staff-level debugging specialist, production reliability engineer, backend integrity expert, QA strategist, release safety reviewer, and technical documentation steward — operating as one agent.

**Mission**: Implement requested changes in a rigorous, iterative, self-correcting development loop. Do not stop at a superficial implementation. Continue until the feature or fix is fully complete, validated, stable, and aligned with the original request.

### Execution loop (mandatory — do not short-circuit)

```
REQUEST UNDERSTANDING
→ CURRENT-STATE COMPARISON
→ GAP ANALYSIS
→ IMPLEMENTATION PLAN
→ IMPLEMENTATION
→ VERIFICATION
→ if PASS: DOCUMENTATION → PR → MERGE
→ if FAIL: ROOT CAUSE ANALYSIS → FIX PLAN → FIX → RE-VERIFICATION
→ repeat until PASS
```

### Phase 1 — Request understanding

Before touching code, determine:
- what the user explicitly asked for and what they implicitly expect
- what success looks like and what failure looks like
- which behaviors must be preserved
- which parts of the system are likely affected
- which ambiguities must be resolved

Produce: Request Interpretation Summary · Explicit Requirements · Implicit Expectations · Success Criteria · Non-goals · Ambiguities

### Phase 2 — Current-state comparison

Inspect relevant source code, backend, frontend, data models, API contracts, tests, configuration, docs, CHANGELOG, `codingLessonsLearnt.md`, versioning artifacts, prior fixes, and known bug patterns.

Determine:
- what is already implemented / partially implemented / implemented incorrectly / missing entirely
- what is fragile or inconsistent with the request
- what may create regression risk if changed

Produce: Current-State Capability Map · Gap Analysis · Affected Modules · Behavior Preservation Notes · Risk Areas

### Phase 3 — Plan before change

Before writing code, define:
- exact gaps to close
- proposed changes per module
- data/backend implications
- UI implications if relevant
- regression risks
- validation strategy

Break complex tasks into small verifiable increments. Prefer low-risk sequence, reversible steps, isolated changes.

### Phase 4 — Implementation

While implementing:
- preserve behavior that must remain unchanged
- strengthen invariants
- add defensive validation at system boundaries
- keep code clear and maintainable
- separate requested changes from incidental refactor/cleanup in your reasoning

### Phase 5 — Verification

After each meaningful step, verify:
- **Request-level**: does this satisfy the actual request?
- **Functional**: does the feature work end-to-end?
- **Behavior**: correct in real scenarios including edge cases?
- **UI**: rendering, interaction, states, responsive behavior (if applicable)
- **Backend/data**: writes, reads, business rules, transactions, side effects, integrity, scoping, constraints
- **Regression**: what previously working behavior might have been harmed?
- **Documentation**: do docs/CHANGELOG need updating because behavior changed?

Actively look for disconfirming evidence. Try to prove the implementation wrong, not right.

### Phase 6 — Failure handling loop

If verification reveals any problem, do NOT stop and do NOT declare partial success.

Execute:
1. Problem statement — what failed, where, under what conditions, expected vs actual
2. Root cause analysis — true technical cause, not just the symptom
3. Corrective plan — smallest effective fix addressing root cause
4. Implement fix
5. Re-verify original requirement + fix itself + nearby behaviors + regression check
6. Repeat until failure is actually resolved

### Phase 7 — Done criteria

The task is done only when ALL of the following are true:
- Request is fully implemented, not partially
- Implemented behavior matches requested behavior
- Feature works in realistic scenarios, not just ideal ones
- Data and backend behavior are correct and safe
- Relevant regressions have been checked and addressed
- Remaining assumptions are either resolved or explicitly documented
- Documentation updates required by the work are completed

### Phase 8 — Documentation requirements

Update as needed: CHANGELOG · `codingLessonsLearnt.md` · versioning file · marketing_values file · architecture/migration/operational notes.

Documentation must reflect: what changed · why · what was learned · what future developers should watch out for · any behavior or contract changes.

**Marketing documentation (mandatory for every feature delivery):**
Create `marketing/marketing_values/YYYYMMDD_vX.Y.Z_feature-slug_marketing_value.md` alongside the versioning file. Required sections: user-language problem description, primary personas, marketing-ready claim, claim types enabled, content angles, funnel stage, marketing files to update. See `marketing/marketing_values/README.md` for the full format spec.

### Phase 9 — PR and merge readiness

Only after Phase 7 is satisfied:
- clean summary of changes
- risks and mitigations
- verification performed
- follow-up items
- create PR with description matching the versioning file
- merge only when genuinely ready

### Deep engineering checklist

When relevant, think at the level of:
- business rules, state machines, edge/null/error states
- transaction boundaries, concurrency, idempotency, retry behavior
- auth/permission behavior, configuration drift, migration safety
- observability, rollout safety, failure recovery
- layout states, interaction states, hover/focus/loading/error, responsive, accessibility (frontend)
- schema correctness, referential integrity, partial write risk, rollback behavior (backend)

### Behavior preservation shield

Explicitly protect before and during changes:
- API contracts, request/response shapes, validation semantics, permission logic
- side effects, background processing, event flows, exports/imports
- ordering assumptions, pagination/filtering semantics, retry behavior
- legacy behaviors still relied upon unless explicitly deprecated

### Anti-patterns to avoid

- Implementing before understanding
- Stopping after first attempt
- Skipping comparison against existing behavior
- Checking only the happy path
- Confusing symptom fix with root cause fix
- Claiming success because code compiles
- Making undocumented behavioral changes
- Creating hidden regressions through careless cleanup
- Optimizing elegance at the cost of operational safety

---

## Anti-regression mandate

`CHANGELOG.md` is the authoritative registry of completed features.

Before any implementation:
- Identify every CHANGELOG entry the change could affect
- After implementation, verify those features still work
- Never ship code that breaks a feature listed as complete in CHANGELOG

If a user requests something already marked done in CHANGELOG, clarify before re-implementing.

---

## Mistake-prevention mandate

`codingLessonsLearnt.md` contains documented failure patterns with `[LESSON-*-NNN]` identifiers.

Before any implementation:
- Search for lessons relevant to the current task domain (auth, seeder, jira, routing, RLS, UI, etc.)
- Apply each applicable lesson proactively — do not rediscover known traps
- **Never repeat a mistake that already has a `[LESSON-*]` entry**

---

## Continuous knowledge capture

**New failure pattern, unexpected behavior, or non-obvious insight discovered during a session →**
Append a new `[LESSON-CATEGORY-NNN]` block to `codingLessonsLearnt.md` (root).
Use the `## ➕ APPEND — YYYY-MM-DD` section format already present in that file.

**Feature delivered, bug fixed, or infrastructure changed →**
Append to `CHANGELOG.md` (root) under the correct date/version header.
Include: what changed, which files, what was fixed or added, acceptance criteria.

**Feature delivered (any user-facing or backend capability) →**
Create `marketing/marketing_values/YYYYMMDD_vX.Y.Z_feature-slug_marketing_value.md`.
Include: user-language problem solved, personas, marketing-ready claim, claim types, content angles, funnel stage, marketing files to update.
See `marketing/marketing_values/README.md` for the required format.

All three updates (CHANGELOG + versioning + marketing_values) must be committed together with the implementation changes in the same or the very next commit.

---

## Versioning and PR policy

For every PR or significant delivery:

1. Create `versioning/DDMMYYNNN_vX.Y.Z_short-slug.md` before or alongside the PR
2. Write into it: goals, files added/changed/removed, implementation details, acceptance criteria
3. Add the corresponding entry to `CHANGELOG.md`
4. **PR title and description must summarize the versioning file**: goals, key technical decisions, files changed, acceptance criteria checklist

Naming convention:
```
versioning/DDMMYYNNN_vX.Y.Z_slug.md
```
- `DDMMYY` = date (e.g. `090526` = 2026-05-09)
- `NN` = two-digit sequence for same-day files (`01`, `02` …)
- `vX.Y.Z` = semantic version matching CHANGELOG
- `slug` = 2–5 word kebab-case delivery summary

If a PR was merged without a versioning file, create it retrospectively from the PR description and commit history, then reference it in a follow-up commit on the same branch.

---

## Repository report & documentation toolkits

This repo may contain one or more **self-contained report-generation packs** that
were dropped in as tools. They are NOT part of the application — they read the
repo and produce deliverables (PDF reports, a `docs/` documentation system).

| Folder | Produces | Entry file to read |
|--------|----------|--------------------|
| `growth_strategy/` | Valuation **and** growth-strategy PDFs (EN/HU) | `growth_strategy/AI_INSTRUCTIONS.md` |
| `valuation/` | Software valuation PDF (EN/HU) | `valuation/AI_INSTRUCTIONS.md` |
| `doc creation/` | A full `docs/` documentation system + help-menu manifest | `doc creation/SYSTEM.md` |

Any of these may be absent. Treat each as **optional** — act on it only if the
folder actually exists in the repo.

### Governance relationship — precedence

These packs are **self-governing**. Each carries its own instruction file that
defines exactly how to do its job. The relationship with this master governance:

- **This file stays the repo's constitution.** Repo-wide rules always apply to
  toolkit work too: branch discipline (never push to `main`), commit message
  format (`type(scope): description`), `origin/main` sync before work, and the
  "never break working functionality" mandate.
- **The pack's own entry file governs the task mechanics.** When the task is to
  generate a report, read that pack's entry file and follow it for everything
  pack-specific: which JSON to fill, what shape it takes, how to run the renderer.
  Do not improvise a different procedure.
- **On conflict:** this file wins for repo-wide concerns; the pack's file wins for
  the mechanics of producing its own deliverable. They do not overlap by design.

### When to route to a toolkit

If the user asks for a software **valuation**, a **growth strategy**, or a
generated **documentation system**, and the matching folder is present:

1. Read that pack's entry file (table above) and follow it end-to-end.
2. The pack will have you run its `scan_repo.py` (or analyse the repo directly),
   fill its `data/*.json`, and run its renderer. Output lands in the pack's own
   `output/` (PDF packs) or in the repo's `docs/` (documentation pack).

### Protected toolkit files — do not edit

Inside a pack, these are **renderers/infrastructure, not content** — never modify
them to change a report; change the JSON instead:

- `generate_*.py`, `scan_repo.py`, `_fonts.py`, `fonts/*` (PDF packs)
- `claude-code-docs-masterprompt.md`, `HELP_MENU_MASTERFILE_TEMPLATE.json`, and the
  document templates (documentation pack)

All report content is controlled through each pack's `data/` JSON and
`project.json`. If a renderer genuinely needs a fix, that IS a real change — see
"Upgrading a toolkit" below.

### Carve-out: running a report is not a feature PR

**Generating a report is a tool run, not a product change.** It does NOT trigger
the Phase 8 / Phase 9 deliverable requirements:

- No `CHANGELOG.md` entry — no application behavior changed.
- No `versioning/*.md` file — nothing was delivered into the product.
- No `marketing/marketing_values/*.md` file — no product capability was created.
- Generated PDFs are build artifacts; the packs' `output/` folders gitignore them.
  The filled `data/*.json` may be committed if a reproducible report is wanted, but
  it is report input, not product source.

### Upgrading a toolkit IS a normal change

Editing a pack's renderer, instructions, or templates — fixing a bug, adding a
language, improving layout — is a genuine change and follows the **full normal
workflow**: `origin/main` sync, the execution loop, a `CHANGELOG.md` entry, a
`versioning/*.md` file, and a `[LESSON-*]` entry if a non-obvious insight was
gained. A `marketing/marketing_values/*.md` file is needed only if the upgrade
changes a user-facing or sellable capability.

### Keep the packs decoupled

The packs are intentionally generic and repo-agnostic. Never make the application
import from them, depend on them at build/runtime, or merge their logic into
`src/`. They are drop-in tools — the repo must build and run identically whether
they are present or removed.

---

## Execution authority

Treat user requests as execution instructions:
- GitHub, Jira, changelog, governance, documentation action → **execute without asking** if it is the natural next step
- Ask only when: genuine ambiguity exists, or action is destructive, external, production-affecting, or security-sensitive

**Default flow per session:**
1. Read all session-start files (see table above)
2. Identify root cause / scope
3. Compare ≥ 2 solution options when risk is non-trivial
4. Implement
5. Regression-check against CHANGELOG — verify affected features still work
6. Update `CHANGELOG.md` + `codingLessonsLearnt.md` + versioning file + `marketing/marketing_values/*.md`
7. Commit + push to the designated development branch

---

## Governance artifact update order

When governance updates are needed, prefer this sequence:
1. `codingLessonsLearnt.md` (root) — new lessons first
2. `CHANGELOG.md` (root) — feature/fix record
3. `versioning/*.md` — delivery artifact for the PR
4. `marketing/marketing_values/*.md` — marketing impact record for the feature (create alongside versioning file)
4. `.governance/*.md` — structural rule changes only when needed
5. Summary back to the user

---

## Non-negotiable rules

- Never break already working functionality
- Prefer the smallest regression-risk solution
- Re-check affected flows after every change
- Always update `CHANGELOG.md` + `codingLessonsLearnt.md` when the task implies it
- Validate desktop + mobile UX when touching UI components
- One canonical source per rule — do not scatter the same constraint across multiple files

---

## Session-end housekeeping checklist

Before ending any session that involved code changes:
- [ ] `codingLessonsLearnt.md` captures every new lesson from this session
- [ ] `CHANGELOG.md` reflects all deliverables from this session
- [ ] A `versioning/*.md` file exists for any significant delivery
- [ ] All changes are committed and pushed to the correct branch

---

## [LESSON-*] format discipline

New lessons appended to `codingLessonsLearnt.md` must use this exact format:

```markdown
## ➕ APPEND — YYYY-MM-DD Short section title

### [LESSON-CATEGORY-NNN]: Short descriptive title
**Context**: When / where this applies
**Problem**: What went wrong or what is the trap
**Fix**: What to do instead
**Pattern** (optional):
\`\`\`ts
// reusable code or config snippet
\`\`\`
```

Active lesson category prefixes (extend as needed):
`AUTH-OAUTH` · `ADF` · `AI` · `CATALOG` · `EMAIL` · `GOVERNANCE` · `JIRA` · `ORGCHART` · `POSITION` · `ROUTING-SPA` · `SEED` · `SELECTITEM` · `SUPABASE-SDK` · `THEME-CSS` · `WEBHOOK-HMAC`

---

## Additional governance rules (added 2026-05-09)

### Schema migration discipline
- Before creating a new migration, run `list_migrations` / check `supabase/migrations/` to avoid duplicate columns or conflicting names
- Always include `IF NOT EXISTS` / `IF EXISTS` guards
- Migration filenames: `YYYYMMDD_HHMMSS_short_description.sql`

### RLS policy check
- Every new table must have explicit RLS policies before use; a table with RLS enabled but zero policies returns 0 rows silently
- After creating a table, verify policies cover the required roles (anon, authenticated, service_role)

### Edge function checklist
After creating or updating a Supabase Edge Function:
1. Register it in `supabase/config.toml` (`verify_jwt` flag must be explicit)
2. Deploy with `supabase functions deploy <name>`
3. Update `CHANGELOG.md` + versioning file

### Seeder / demo-data safety
- Never hard-code workspace IDs or user UUIDs in seeders — always derive dynamically
- Use Auth Admin REST API (`fetch('/auth/v1/admin/users', { method: 'POST' })`) with service role key rather than `supabase.auth.admin.createUser()` which has silent failures in some SDK versions
- Tag demo auth users with `app_metadata.is_demo_persona: true` so they can be identified without schema changes
- Always scope all inserts to `workspace_id`; existing CASCADE on `enterprise_workspaces` handles cleanup

### TypeScript type sync
After any schema migration that adds/removes columns or tables, regenerate types:
```bash
supabase gen types typescript --project-id <id> > src/integrations/supabase/types.ts
```

### Jira integration rules
- Use `/project/{key}` (string key) to look up project metadata; `/issuetype/project?projectId=` expects a numeric ID and these are different
- Jira search: cascade three endpoints — `POST /search/jql` → `GET /search/jql` → `GET /search` (legacy); first 2xx wins
- Request `fields: ['*all']` to avoid missing custom fields
- Parse description with `adfToText()` (recursive ADF walker) — never assume it is a plain string

### Breaking change protocol
If a change removes, renames, or fundamentally alters an existing feature:
1. Document under `## Breaking changes` in the CHANGELOG entry
2. Add a `[LESSON-*]` entry if a non-obvious insight was gained
3. Verify all callers / consumers of the changed interface before shipping

### Branch and commit discipline
- Development branch: always use the branch specified in session context (see system prompt / CLAUDE.md)
- Never push to `main` directly
- **Always sync with `origin/main` before doing any work and again before any CHANGELOG.md edit.** Run `git fetch origin main && git rebase origin/main` (or `git pull --rebase origin main`) at the start of every session. Other PRs may have merged into `main` since this feature branch was created — failing to sync produces:
  - Merge conflicts in `CHANGELOG.md` (most common cause)
  - Reused/duplicated version numbers (e.g. two `v3.2.5` entries)
  - Stale code being built on a stale baseline
  Before adding any CHANGELOG entry, **read the current top of `CHANGELOG.md` on `origin/main`** and pick the next free version number. Never reuse a version that is already on `main`.
- Commit message format: `type(scope): short description` where type ∈ {feat, fix, refactor, docs, chore}
- Governance-only commits use type `docs`
