#!/usr/bin/env bash
# Verify P0-008: no API key leaks in git history or APK
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

echo "Scanning git history for API keys..."
if git log --all -p | grep -E "AIza[0-9A-Za-z_-]{35}" ; then
  echo "FAIL: API key found in git history"
  exit 1
fi

echo "Checking .gitignore..."
grep -q "\.env\.local" glint-app/.gitignore 2>/dev/null || \
  grep -q "\.env\.local" .gitignore || \
  { echo "FAIL: .env.local not in .gitignore"; exit 1; }

APK="glint-app/android/app/build/outputs/apk/debug/app-debug.apk"
if [[ -f "$APK" ]]; then
  echo "Scanning APK for API key literals..."
  if unzip -p "$APK" | strings | grep -E "AIza[0-9A-Za-z_-]{35}" ; then
    echo "FAIL: API key baked into APK"
    exit 1
  fi
fi

echo "PASS: no leaks detected"
