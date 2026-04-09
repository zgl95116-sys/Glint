#!/usr/bin/env bash
# Verify P0-001: lockscreen cold-start ≤ 800ms
set -euo pipefail
PKG="com.glint.app"
ACTIVITY="$PKG/.MainActivity"

command -v adb >/dev/null || { echo "adb not installed"; exit 1; }
adb devices | grep -q "device$" || { echo "no device attached"; exit 1; }

adb shell am force-stop "$PKG"
sleep 1
OUT=$(adb shell am start -W -n "$ACTIVITY")
echo "$OUT"
MS=$(echo "$OUT" | awk -F': ' '/TotalTime/ {print $2}' | tr -d '\r')
echo "TotalTime: ${MS}ms (budget 800ms)"
if [[ -z "$MS" ]] || [[ "$MS" -gt 800 ]]; then
  echo "FAIL: cold start ${MS}ms exceeds 800ms budget"
  exit 1
fi
echo "PASS"
