# CLAUDE.md

**Read `AI_EXECUTION_PROMPTS.md` first.** It contains the full session-start read order, anti-regression mandate, mistake-prevention rules, versioning/PR policy, and all non-negotiable governance rules.

## Quick reference (see AI_EXECUTION_PROMPTS.md for full detail)

Read order every session:
1. `AI_EXECUTION_PROMPTS.md` ← start here
2. `codingLessonsLearnt.md` — avoid documented mistakes
3. `CHANGELOG.md` — do not regress completed features
4. `.governance/controller.md`
5. `.governance/agent_execution_rules.md`
6. `.governance/ui_ux_rules.md` when UI is affected
7. Latest `versioning/*.md` relevant to the task
8. `marketing/SYSTEM.md` — when the task has user-facing, positioning, or feature-announcement implications
9. The relevant report-toolkit entry file — only when the task is to generate a valuation, growth-strategy, or documentation report (see "Repository report toolkits" below)

Required behavior:
- **ALWAYS fetch + rebase on `origin/main` BEFORE writing code or editing CHANGELOG.md.** Other PRs may have merged into `main` since the feature branch was created — failing to rebase causes CHANGELOG conflicts and version-number collisions. Run `git fetch origin main && git rebase origin/main` (or `git pull --rebase origin main`) at the start of every session, and again before any CHANGELOG edit. Resolve conflicts manually; never force-push without verifying nothing was lost.
- When adding a CHANGELOG entry, first read the **current top of `CHANGELOG.md` on `origin/main`** to pick the next free version number (do not duplicate an existing version).
- Preserve existing working features
- Prefer minimal-risk fixes
- Update `CHANGELOG.md` + `codingLessonsLearnt.md` when naturally implied by the task
- Validate desktop/mobile UX when touching UI
- Create a `versioning/*.md` file for every PR or significant delivery
- **Create a `marketing/marketing_values/*.md` file for every PR or significant delivery** alongside the `versioning/*.md` file. See `marketing/marketing_values/README.md` for required format and naming convention. Document: the user-language problem solved, which personas benefit, what marketing claims it enables, what content angles it suggests, and which marketing library files to update.
- **LOCALIZATION (non-negotiable from v3.7.2):** Every new user-facing string MUST be added to ALL existing locale resources in the same commit (currently `src/i18n/resources/en.ts` and `src/i18n/resources/hu.ts`; Czech, Slovak, Polish will be added later). Never hardcode text in components — use `useI18n()` → `t('namespace.key')`. **Authoritative controller:** `AI_PROMPTING_FOLDERSTRUCTURE/localization_controller.md` — read it before any feature work involving user-facing copy. It defines the discovery → authoring → terminology → translation → self-review → QA workflow and the per-feature deliverable format. See also `.governance/ui_ux_rules.md` § "Core principle: Full localization".
- **BROWSER BACK BUTTON (non-negotiable from v3.7.2):** Tab/view navigation MUST use pushState (omit `{ replace: true }` from `setSearchParams` and `navigate` for user-initiated transitions). Back button must return to the previous tab/page, never drop the user to the landing page. URLs must not expose user IDs, session tokens, or PII. See `.governance/ui_ux_rules.md` § "Core principle: Browser Back button".
- **WORKSPACE UUID IN URL (non-negotiable from v3.16.0):** Every workspace-scoped route uses the path shape `/w/<workspaceId>/<rest>`. The picker is at `/app`; the dashboard is at `/w/:workspaceId`. Workspace UUIDs are an explicit exception to the "no internal IDs in URLs" rule (deep-link sharing is a product feature). Picking a workspace MUST be a real `navigate('/w/<id>')` push, never a `replace`, so the Back button works. See `.governance/ui_ux_rules.md` § "Core principle: Workspace identifier in URL".
- **WORKSPACE TIER PERSISTENCE (non-negotiable from v3.17.0):** A workspace's tier (`tenant_subscriptions.tier_id`) is set ONCE at creation and CHANGED only by the platform-admin RPC `public.superadmin_change_workspace_tier(_workspace_id, _tier_key, _reason)`, which writes a permanent `platform_audit_events` row. No other code path may modify `tenant_subscriptions.tier_id`. The current tier MUST be visible in the workspace dashboard header AND on each picker card (`WorkspaceTierBadge`, reading `public.workspace_active_tier`). See `.governance/ui_ux_rules.md` § "Core principle: Workspace tier persistence".

## Marketing system

The `marketing/` folder contains a complete marketing prompt library for Effectime. It is governed by `marketing/SYSTEM.md`.

**When a feature is delivered:**
1. Create `versioning/DDMMYYNNN_vX.Y.Z_slug.md` (engineering record — always required)
2. Create `marketing/marketing_values/YYYYMMDD_vX.Y.Z_feature-slug_marketing_value.md` (marketing record — always required)
3. Commit both in the same release

**The marketing_values/ folder** is the bridge between product development and marketing. Marketing AI agents read it to understand what has been built and what claims can be made. See `marketing/marketing_values/README.md` for the required file format.

**When producing marketing assets** (copy, campaigns, content, visuals), route through `marketing/SYSTEM.md` first, then use the specialist file from the routing table there.

## Repository report toolkits

The repo may contain one or more **self-contained, drop-in report packs**. They are tools, not part of the application — they read the repo and produce deliverables.

| Folder | Produces | Entry file |
|--------|----------|-----------|
| `growth_strategy/` | Valuation + growth-strategy PDFs (EN/HU) | `growth_strategy/AI_INSTRUCTIONS.md` |
| `valuation/` | Software valuation PDF (EN/HU) | `valuation/AI_INSTRUCTIONS.md` |
| `doc creation/` | A full `docs/` documentation system | `doc creation/SYSTEM.md` |

Each folder is optional and **self-governing** — when the task is to generate one of these reports, read that pack's entry file and follow it. Key rules (full detail in `AI_EXECUTION_PROMPTS.md` § "Repository report & documentation toolkits"):

- **Routing:** if the user asks for a valuation / growth strategy / documentation system and the matching folder exists, read its entry file and follow it end-to-end.
- **Precedence:** this governance stays the repo constitution (branch discipline, commit format, no-regression); the pack's own file governs the task mechanics. They do not overlap.
- **Protected files:** never edit a pack's renderers/infrastructure (`generate_*.py`, `scan_repo.py`, `_fonts.py`, `fonts/`, doc templates) to change a report — change the pack's `data/` JSON instead.
- **Carve-out:** *running* a report is a tool run, not a feature PR — no `CHANGELOG.md` / `versioning/` / `marketing_values/` entry. *Upgrading* a pack (bug fix, new language, layout change) IS a normal change and follows the full workflow.
- **Decoupling:** never make the application import from or depend on these packs; the repo must build identically with or without them.
