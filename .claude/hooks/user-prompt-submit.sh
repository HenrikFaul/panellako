#!/bin/bash
# UserPromptSubmit hook — fires before EVERY user message is processed
# Outputs a brief but firm governance reminder so Claude never forgets
# the non-negotiables mid-session

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
BRANCH=$(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null || echo "unknown")

cat <<REMINDER
┌─────────────────────────────────────────────────────────────────────────────┐
│  PANELLAKÓ GOVERNANCE REMINDER — minden kérés előtt érvényes               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Branch    : $BRANCH
│  Supabase  : KIZÁRÓLAG panellako (wzromwxpjlyrqbdiapep) — sosem GeoData   │
│  Rebase    : git fetch origin main && git rebase origin/main (kód előtt)   │
│  Lessons   : codingLessonsLearnt.md — ismert hibák elkerülése              │
│  CHANGELOG : ne regresszálj meglévő funkciókat                             │
│  UI string : useI18n() → hu.ts + en.ts ugyanabban a commitban              │
│  Back btn  : navigate() pushState — soha { replace: true } user-eventnél  │
│  PR csomag : versioning/*.md + marketing/marketing_values/*.md             │
│  RLS       : minden új táblához explicit policy-k kellenek                 │
│  TypeScript: npx tsc --noEmit — minden nem-triviális változás után        │
└─────────────────────────────────────────────────────────────────────────────┘
REMINDER
