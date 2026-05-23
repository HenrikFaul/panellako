#!/bin/bash
# SessionStart hook for panellako
# 1. Installs npm dependencies
# 2. Injects mandatory governance files into Claude's context

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# ─── Dependency install (async so session starts quickly) ────────────────────
echo '{"async": true, "asyncTimeout": 120000}'

# Only run in remote/web environments
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  cd "$PROJECT_DIR"
  if [ -f "package-lock.json" ]; then
    npm install --prefer-offline --no-audit --no-fund 2>&1 | tail -5
  fi
fi

# ─── Governance file injection ────────────────────────────────────────────────
# The following files are printed to stdout so they are in Claude's context
# from the very first token of the session. Do NOT skip or summarise them.

cat <<'GOVERNANCE_HEADER'

╔══════════════════════════════════════════════════════════════════════════════╗
║  MANDATORY SESSION-START GOVERNANCE FILES — READ BEFORE WRITING ANY CODE   ║
║  These files were injected automatically. Follow every instruction in them. ║
╚══════════════════════════════════════════════════════════════════════════════╝

GOVERNANCE_HEADER

# ── 1. AI_EXECUTION_PROMPTS.md ────────────────────────────────────────────────
echo "━━━ [1/4] AI_EXECUTION_PROMPTS.md ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$PROJECT_DIR/AI_EXECUTION_PROMPTS.md" 2>/dev/null || echo "(fájl nem található)"
echo ""

# ── 2. codingLessonsLearnt.md ─────────────────────────────────────────────────
echo "━━━ [2/4] codingLessonsLearnt.md ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$PROJECT_DIR/codingLessonsLearnt.md" 2>/dev/null || echo "(fájl nem található)"
echo ""

# ── 3. CHANGELOG.md (legfrissebb 120 sor) ────────────────────────────────────
echo "━━━ [3/4] CHANGELOG.md (legfrissebb bejegyzések) ━━━━━━━━━━━━━━━━━━━━━━━━━"
head -120 "$PROJECT_DIR/CHANGELOG.md" 2>/dev/null || echo "(fájl nem található)"
echo ""

# ── 4. Prompt-ökoszisztéma könyvtárlista (feltételes olvasáshoz) ──────────────
echo "━━━ [4/4] Elérhető fejlesztési prompt-fájlok (olvasd a relevánsakat) ━━━━━"
echo ""
echo "── AI_PROMPTING_FOLDERSTRUCTURE/ ──"
find "$PROJECT_DIR/AI_PROMPTING_FOLDERSTRUCTURE" -name "*.md" -o -name "*.prompt" 2>/dev/null | sort | sed "s|$PROJECT_DIR/||"
echo ""
echo "── full-stack-e2e-prompt-ecosystem/ ──"
find "$PROJECT_DIR/full-stack-e2e-prompt-ecosystem" -maxdepth 2 -name "*.md" -o -name "*.prompt" 2>/dev/null | sort | sed "s|$PROJECT_DIR/||"
echo ""
echo "── versioning/ (legfrissebb 10 fájl) ──"
ls -t "$PROJECT_DIR/versioning/"*.md 2>/dev/null | head -10 | sed "s|$PROJECT_DIR/||"
echo ""
echo "── BI_FRAMEWORK/ ──"
find "$PROJECT_DIR/BI_FRAMEWORK" -maxdepth 2 -name "*.md" 2>/dev/null | sort | sed "s|$PROJECT_DIR/||" | head -20
echo ""

cat <<'GOVERNANCE_FOOTER'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KÖTELEZŐ EMLÉKEZTETŐ:
 • Soha ne fejlessz, amíg fentiek alapján nem ismered az aktuális állapotot.
 • Minden PR-hoz: versioning/*.md + marketing/marketing_values/*.md fájl.
 • Minden UI-változáshoz: localization (hu.ts + en.ts), back button, RLS.
 • Minden Supabase írás/olvasás: KIZÁRÓLAG panellako (wzromwxpjlyrqbdiapep).
 • git fetch origin main && git rebase origin/main — MIELŐTT kódot írsz.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GOVERNANCE_FOOTER
