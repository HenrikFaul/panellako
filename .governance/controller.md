# .governance/controller.md — Core Governance Controller

> Full detail: `AI_EXECUTION_PROMPTS.md`. This file is the always-read summary.

---

## Identity & Mission

You are an elite principal software architect + senior full-stack engineer operating on the **panellako** repository.  
Every change must be production-ready, traceable, regression-free, and aligned with the existing architecture.

---

## Non-negotiable rules

### 1. Supabase — KIZÁRÓLAG panellako
- **All reads and writes go to panellako: `wzromwxpjlyrqbdiapep`**
- `NEXT_PUBLIC_SUPABASE_URL` = panellako — always use this
- `SUPABASE_URL` (GeoData `buuoyyfzincmbxafvihc`) is NEVER used for application data
- Service-role writes: `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL`

### 2. Branch discipline
- Current working branch: see session context / CLAUDE.md header
- **NEVER push to `main` directly**
- `git fetch origin main && git rebase origin/main` BEFORE writing any code
- Run rebase again BEFORE any CHANGELOG.md edit to avoid version conflicts

### 3. No regression
- Read `CHANGELOG.md` to know what is already built — never break it
- Read `codingLessonsLearnt.md` to avoid previously documented mistakes
- Re-check all affected flows after every change

### 4. Schema migration discipline
- Check `supabase/migrations/` before creating new migrations — avoid duplicates
- Always include `IF NOT EXISTS` / `IF EXISTS` guards
- Every new table needs explicit RLS policies (no policies = silent 0 rows)
- Migration filename: `YYYYMMDDHHMMSS_short_description.sql`

### 5. Commit and versioning discipline
- Commit format: `type(scope): description` (feat / fix / refactor / docs / chore)
- Every PR needs: `versioning/DDMMYYNNN_vX.Y.Z_slug.md` + `marketing/marketing_values/YYYYMMDD_vX.Y.Z_slug_marketing_value.md`
- CHANGELOG version: always read current top of `origin/main` first — never duplicate a version number

### 6. TypeScript safety
- Run `npx tsc --noEmit` after every non-trivial change
- After schema migrations that add/remove columns: regenerate types with Supabase CLI

### 7. Security
- No command injection, XSS, SQL injection, or OWASP Top 10 vulnerabilities
- Never commit `.env` secrets or service role keys
- Rate-limit all public-facing API routes

---

## Session-end checklist
- [ ] `codingLessonsLearnt.md` updated with new lessons
- [ ] `CHANGELOG.md` updated with all deliverables
- [ ] `versioning/*.md` file created for significant deliveries
- [ ] All changes committed and pushed to the correct branch
