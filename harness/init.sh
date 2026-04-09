#!/usr/bin/env bash
# Glint harness: environment initializer
# Idempotent — safe to run at the start of every agent session.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$REPO_ROOT/glint-app"
ANDROID_DIR="$APP_DIR/android"
HARNESS_DIR="$REPO_ROOT/harness"
LOG_DIR="$HARNESS_DIR/logs"
mkdir -p "$LOG_DIR"

log() { echo "[init.sh $(date +%H:%M:%S)] $*" | tee -a "$LOG_DIR/init.log"; }

log "=== Glint env init ==="
log "repo: $REPO_ROOT"

# 1) Env vars
if [[ ! -f "$APP_DIR/.env.local" ]]; then
  log "WARN: $APP_DIR/.env.local missing. Create it with GEMINI_API_KEY=..."
fi

# 2) Web deps
cd "$APP_DIR"
if [[ ! -d node_modules ]] || [[ package.json -nt node_modules ]]; then
  log "Installing npm deps..."
  npm install --silent
fi

# 3) Web build
log "Running vite build..."
npm run build --silent

# 4) Capacitor sync → Android
log "Syncing capacitor to android..."
npx cap sync android --silent 2>&1 | tail -5

# 5) (Optional) APK build — skip unless agent requests
if [[ "${BUILD_APK:-0}" == "1" ]]; then
  log "Building debug APK..."
  cd "$ANDROID_DIR"
  ./gradlew assembleDebug --quiet
  APK="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
  log "APK at: $APK ($(stat -f%z "$APK" 2>/dev/null || stat -c%s "$APK") bytes)"
fi

# 6) (Optional) Install + launch on connected device
if [[ "${INSTALL_APK:-0}" == "1" ]] && command -v adb >/dev/null; then
  if adb devices | grep -q "device$"; then
    log "Installing APK on device..."
    adb install -r "$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
    adb shell am start -W -n com.glint.app/.MainActivity | tee -a "$LOG_DIR/init.log"
  else
    log "No adb device attached, skipping install"
  fi
fi

log "=== init complete ==="
