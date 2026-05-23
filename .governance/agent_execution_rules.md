# .governance/agent_execution_rules.md — Agent Execution Authority

> Full execution loop: `AI_EXECUTION_PROMPTS.md` §§ "Execution loop", "Phase 1–8".

---

## When to act vs. when to ask

| Situation | Action |
|---|---|
| Task is clear, reversible, local | Act immediately |
| Task affects shared infra (DB schema, RLS, cron, edge functions) | State intent, then act |
| Task is destructive (drop table, force-push, delete branch) | **Ask first** |
| Task touches production data directly | **Ask first** |
| Requirement is ambiguous | Ask one focused clarifying question |

---

## Mandatory execution loop (do not short-circuit)

```
REQUEST UNDERSTANDING
→ CURRENT-STATE COMPARISON (read CHANGELOG + codingLessonsLearnt first)
→ GAP ANALYSIS
→ IMPLEMENTATION PLAN
→ IMPLEMENTATION
→ VERIFICATION (tsc --noEmit, review diffs)
→ if PASS → DOCUMENTATION → COMMIT → PUSH
→ if FAIL → ROOT CAUSE → FIX → RE-VERIFY
→ repeat until PASS
```

---

## Scope discipline

- Do not add features, abstractions, or refactoring beyond what the task requires
- Do not add comments that describe WHAT the code does — only WHY (non-obvious constraints)
- Do not add error handling for impossible scenarios — trust framework guarantees
- Three similar lines is better than a premature abstraction
- No half-finished implementations

---

## Tool use discipline

- Read files before editing them
- Run TypeScript check after non-trivial changes
- Prefer `Edit` over `Write` for modifying existing files
- Parallel tool calls for independent operations
- Never use `--no-verify` or skip git hooks without explicit user instruction

---

## Research before coding

For any task spanning > 3 file lookups: use the `Explore` subagent to map the codebase first.  
For DB verification: use `mcp__supabase-panellako__execute_sql` (panellako project only).

---

## Subagent governance

When spawning Agent subagents:
- Give them the exact file paths and context — never let them guess
- Do not duplicate work already delegated to a running subagent
- Background agents: use `run_in_background=true` for independent work
- Verify subagent results — "intended to do" ≠ "actually did"
