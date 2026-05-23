#!/bin/bash
# PreToolUse hook — minden tool-hívás ELŐTT fut
# Stdin: JSON { tool_name, tool_input }
# Ha exit 2-vel tér vissza + JSON { "decision": "block" } → blokkolja a tool-t

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
INPUT=$(cat)

TOOL=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null || echo "")
COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")

# ── 1. git commit előtt: TypeScript ellenőrzés ────────────────────────────────
if [ "$TOOL" = "Bash" ] && echo "$COMMAND" | grep -q "git commit"; then
  if echo "$COMMAND" | grep -q "\-\-no-verify"; then
    # --no-verify szándékosan kerüli meg a hookot — engedélyezzük
    exit 0
  fi

  cd "$PROJECT_DIR"
  TSC_OUT=$(npx tsc --noEmit 2>&1 || true)
  TSC_ERRORS=$(echo "$TSC_OUT" | grep -c "error TS" || true)

  if [ "$TSC_ERRORS" -gt 0 ]; then
    echo '{"decision":"block","reason":"TypeScript hibák vannak — commit blokkolva. Futtasd: npx tsc --noEmit\n\n'"$(echo "$TSC_OUT" | head -20 | sed 's/"/\\"/g')"'"}'
    exit 2
  fi
fi

# ── 2. Supabase kliens létrehozásnál: projekt ellenőrzés ──────────────────────
if [ "$TOOL" = "Edit" ] || [ "$TOOL" = "Write" ]; then
  NEW_CONTENT=$(echo "$INPUT" | python3 -c "
import sys,json
d=json.load(sys.stdin)
ti=d.get('tool_input',{})
print(ti.get('new_string','') or ti.get('content',''))
" 2>/dev/null || echo "")

  # Ha a kód tartalmazza a GeoData project URL-t
  if echo "$NEW_CONTENT" | grep -q "buuoyyfzincmbxafvihc"; then
    echo '{"decision":"block","reason":"TILOS: GeoData projekt (buuoyyfzincmbxafvihc) használata! Csak panellako (wzromwxpjlyrqbdiapep) megengedett. Cseréld NEXT_PUBLIC_SUPABASE_URL-re."}'
    exit 2
  fi

  # Ha SUPABASE_URL-t használ NEXT_PUBLIC nélkül Supabase kliens létrehozásban
  if echo "$NEW_CONTENT" | grep -qE "createClient\b" && echo "$NEW_CONTENT" | grep -q "process\.env\.SUPABASE_URL" && ! echo "$NEW_CONTENT" | grep -q "NEXT_PUBLIC_SUPABASE_URL"; then
    echo '{"decision":"block","reason":"FIGYELEM: process.env.SUPABASE_URL (GeoData) kerülhet használatra. Használd NEXT_PUBLIC_SUPABASE_URL-t (panellako) vagy NEXT_PUBLIC_SUPABASE_URL ?? SUPABASE_URL sorrendben."}'
    exit 2
  fi
fi

# ── 3. git push --force main-re: blokk ────────────────────────────────────────
# Csak direkt git push parancsot ellenőriz (nem commit message szövegét)
if [ "$TOOL" = "Bash" ]; then
  FIRST_CMD=$(echo "$COMMAND" | grep -oE "(^|&&\s*)git push[^&]*" | head -1 || true)
  if echo "$FIRST_CMD" | grep -qE "(--force|-f )" && echo "$FIRST_CMD" | grep -qE "\b(main|master)\b"; then
    echo '{"decision":"block","reason":"TILOS: force push main/master branchre! Soha ne force push-olj a fő ágra."}'
    exit 2
  fi
fi

exit 0
