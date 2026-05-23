#!/bin/bash
# SessionStart hook for panellako
# 1. Installs npm dependencies (async, remote-only)
# 2. Injects ALL mandatory governance files into Claude's context

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# ─── Async dependency install ─────────────────────────────────────────────────
echo '{"async": true, "asyncTimeout": 120000}'

if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  cd "$PROJECT_DIR"
  if [ -f "package-lock.json" ]; then
    npm install --prefer-offline --no-audit --no-fund 2>&1 | tail -3
  fi
fi

# ─── Governance file injection ────────────────────────────────────────────────
cat <<'HEADER'

╔══════════════════════════════════════════════════════════════════════════════╗
║         PANELLAKÓ — KÖTELEZŐ GOVERNANCE FÁJLOK (automatikusan betöltve)    ║
║  Minden fejlesztési kérés előtt ezek az elvárások érvényesek. Nem opcionális║
╚══════════════════════════════════════════════════════════════════════════════╝
HEADER

# ── [1] AI_EXECUTION_PROMPTS.md ───────────────────────────────────────────────
echo "━━━ [1/8] AI_EXECUTION_PROMPTS.md (fő governance vezérlő) ━━━━━━━━━━━━━━━━"
cat "$PROJECT_DIR/AI_EXECUTION_PROMPTS.md" 2>/dev/null || echo "(nem található)"
echo ""

# ── [2] .governance/controller.md ────────────────────────────────────────────
echo "━━━ [2/8] .governance/controller.md ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$PROJECT_DIR/.governance/controller.md" 2>/dev/null || echo "(nem található)"
echo ""

# ── [3] .governance/agent_execution_rules.md ─────────────────────────────────
echo "━━━ [3/8] .governance/agent_execution_rules.md ━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$PROJECT_DIR/.governance/agent_execution_rules.md" 2>/dev/null || echo "(nem található)"
echo ""

# ── [4] .governance/ui_ux_rules.md ───────────────────────────────────────────
echo "━━━ [4/8] .governance/ui_ux_rules.md ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$PROJECT_DIR/.governance/ui_ux_rules.md" 2>/dev/null || echo "(nem található)"
echo ""

# ── [5] AI_PROMPTING_FOLDERSTRUCTURE/SYSTEM.md (Orchestrator master controller)
echo "━━━ [5/8] AI_PROMPTING_FOLDERSTRUCTURE/SYSTEM.md ━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$PROJECT_DIR/AI_PROMPTING_FOLDERSTRUCTURE/SYSTEM.md" 2>/dev/null || echo "(nem található)"
echo ""

# ── [6] codingLessonsLearnt.md ───────────────────────────────────────────────
echo "━━━ [6/8] codingLessonsLearnt.md ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$PROJECT_DIR/codingLessonsLearnt.md" 2>/dev/null || echo "(nem található)"
echo ""

# ── [7] CHANGELOG.md (legfrissebb 150 sor — ne regresszálj) ──────────────────
echo "━━━ [7/8] CHANGELOG.md (legfrissebb bejegyzések) ━━━━━━━━━━━━━━━━━━━━━━━━"
head -150 "$PROJECT_DIR/CHANGELOG.md" 2>/dev/null || echo "(nem található)"
echo ""

# ── [8] Prompt-ökoszisztéma könyvtár (feltételes olvasáshoz) ──────────────────
echo "━━━ [8/8] Elérhető fejlesztési prompt-fájlok (olvasd a relevánsakat) ━━━━"
echo ""
echo "── AI_PROMPTING_FOLDERSTRUCTURE/ (teljes lista) ──"
find "$PROJECT_DIR/AI_PROMPTING_FOLDERSTRUCTURE" \( -name "*.md" -o -name "*.prompt" \) 2>/dev/null | sort | sed "s|$PROJECT_DIR/||"
echo ""
echo "── full-stack-e2e-prompt-ecosystem/ ──"
find "$PROJECT_DIR/full-stack-e2e-prompt-ecosystem" -maxdepth 2 \( -name "*.md" -o -name "*.prompt" \) 2>/dev/null | sort | sed "s|$PROJECT_DIR/||"
echo ""
echo "── doc creation/ ──"
find "$PROJECT_DIR/doc creation" -maxdepth 1 -name "*.md" 2>/dev/null | sort | sed "s|$PROJECT_DIR/||"
echo ""
echo "── BI_FRAMEWORK/ ──"
find "$PROJECT_DIR/BI_FRAMEWORK" -maxdepth 2 -name "*.md" 2>/dev/null | sort | sed "s|$PROJECT_DIR/||" | head -25
echo ""
echo "── versioning/ (legfrissebb 15 fájl) ──"
ls -t "$PROJECT_DIR/versioning/"*.md 2>/dev/null | head -15 | sed "s|$PROJECT_DIR/||"
echo ""

cat <<'FOOTER'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  MINDEN FEJLESZTÉSI KÉRÉS ELŐTT KÖTELEZŐ:
  1. git fetch origin main && git rebase origin/main
  2. Olvasd a fenti fájlokat — különösen codingLessonsLearnt.md + CHANGELOG.md
  3. Supabase: KIZÁRÓLAG panellako (wzromwxpjlyrqbdiapep)
  4. UI: lokalizáció (hu.ts + en.ts), Back button pushState, RLS policy-k
  5. Minden PR: versioning/*.md + marketing/marketing_values/*.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOOTER
