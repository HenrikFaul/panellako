#!/usr/bin/env bash
# scripts/check-secrets.sh — local gitleaks scan (optional, no husky dependency).
#
# Install gitleaks once:
#   macOS:    brew install gitleaks
#   Windows:  scoop install gitleaks
#   Linux:    https://github.com/gitleaks/gitleaks/releases
#
# Usage:
#   ./scripts/check-secrets.sh           # scan the whole working tree
#   ./scripts/check-secrets.sh app/      # scan a subtree
#
# CI runs the same .gitleaks.toml config via gitleaks-action — this script just
# lets you catch leaks locally before pushing.

set -euo pipefail

SCAN_PATH="${1:-.}"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks not installed. See https://github.com/gitleaks/gitleaks#installing"
  exit 1
fi

CONFIG_FLAG=()
if [ -f ".gitleaks.toml" ]; then
  CONFIG_FLAG=(--config .gitleaks.toml)
fi

echo "Running gitleaks scan on: ${SCAN_PATH}"
gitleaks detect \
  --source="${SCAN_PATH}" \
  "${CONFIG_FLAG[@]}" \
  --verbose \
  --no-git
