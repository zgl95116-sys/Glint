#!/usr/bin/env bash
# Verify P0-006: APK size budget
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT/glint-app/android"

./gradlew assembleRelease --quiet || { echo "release build failed"; exit 1; }
APK="app/build/outputs/apk/release/app-release-unsigned.apk"
[[ -f "$APK" ]] || APK="app/build/outputs/apk/release/app-release.apk"

SIZE=$(stat -f%z "$APK" 2>/dev/null || stat -c%s "$APK")
BUDGET=8388608  # 8 MB
echo "Release APK size: ${SIZE} bytes (budget ${BUDGET})"
if [[ "$SIZE" -gt "$BUDGET" ]]; then
  echo "FAIL: APK exceeds 8MB budget"
  exit 1
fi
echo "PASS"
