# .governance/ui_ux_rules.md — UI/UX Non-negotiable Rules

> Authoritative detail: `AI_PROMPTING_FOLDERSTRUCTURE/localization_controller.md` (localization workflow)  
> Also: `AI_PROMPTING_FOLDERSTRUCTURE/ui/` folder (tokens, components, accessibility, typography)

---

## Core principle: Full localization (non-negotiable from v3.7.2)

- **Every new user-facing string** must be added to ALL locale files in the same commit
- Current locale files: `src/i18n/resources/hu.ts` (Hungarian) and `src/i18n/resources/en.ts` (English)
- Czech, Slovak, Polish will be added later — the pattern must support them without refactoring
- **NEVER hardcode text in components** — always use `useI18n()` → `t('namespace.key')`
- Workflow: read `AI_PROMPTING_FOLDERSTRUCTURE/localization_controller.md` before any feature with user-facing copy

### Localization checklist per feature
- [ ] All new strings have a `namespace.key` identifier
- [ ] Key added to `hu.ts` with Hungarian text
- [ ] Key added to `en.ts` with English text
- [ ] No hardcoded Hungarian or English strings in component JSX/TSX
- [ ] Existing keys not modified (breaking change if you do)

---

## Core principle: Browser Back button (non-negotiable from v3.7.2)

- Tab/view navigation MUST use `pushState` — **omit `{ replace: true }`** from `setSearchParams` and `navigate` for user-initiated transitions
- The Back button must return to the previous tab/page — never drop the user to the landing page
- URLs must NOT expose: user IDs, session tokens, workspace-internal IDs (except workspace UUID — see below), or PII
- Route changes triggered by the user = push; route changes triggered by the system (redirect, auth guard) = replace

---

## Core principle: Workspace identifier in URL (non-negotiable from v3.16.0)

- Every workspace-scoped route: `/w/<workspaceId>/<rest>`
- Picker: `/app` | Dashboard: `/w/:workspaceId`
- Workspace UUIDs are an **explicit exception** to the "no internal IDs in URLs" rule — deep-link sharing is a product feature
- Picking a workspace: `navigate('/w/<id>')` — **never `replace`** (Back button must work)

---

## Core principle: Workspace tier persistence (non-negotiable from v3.17.0)

- A workspace's tier (`tenant_subscriptions.tier_id`) is set ONCE at creation
- Changed ONLY via: `public.superadmin_change_workspace_tier(_workspace_id, _tier_key, _reason)` RPC
- This RPC writes a permanent `platform_audit_events` row — no other code path may modify `tier_id`
- Current tier MUST be visible: dashboard header + picker card (`WorkspaceTierBadge`, reading `public.workspace_active_tier`)

---

## UI component rules

- Daylight application theme: warm canvas `#f4f7f4` / `#edf3ee`, white cards,
  border `#dbe5df`, primary ink `#17231e`, restrained teal brand accents
- Full-screen dark workspace backgrounds are prohibited; dark surfaces are
  reserved for true overlays, map chrome, media and exceptional high-contrast context
- Typography scale: see `AI_PROMPTING_FOLDERSTRUCTURE/ui/typography.md`
- Component library: see `AI_PROMPTING_FOLDERSTRUCTURE/ui/components.md`
- Accessibility: WCAG 2.1 AA minimum — see `AI_PROMPTING_FOLDERSTRUCTURE/ui/accessibility.md`
- No emojis in UI unless explicitly requested
- Mobile-first — validate both 375px and 1440px viewports

---

## RLS rules (every new table)

- Every new table needs explicit RLS policies before use
- A table with RLS enabled but zero policies silently returns 0 rows
- Required roles: `anon`, `authenticated`, `service_role`
- Test with both anon and authenticated Supabase clients after creating policies
