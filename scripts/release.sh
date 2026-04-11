#!/bin/bash
#
# Glint release pipeline — one command to build, tag, and publish a demo APK.
#
# Prerequisites (set up once):
#   - nvm with a v22.x Node installed (`nvm install 22`)
#   - Homebrew openjdk@21 (`brew install openjdk@21`)
#   - ~/.gradle/gradle.properties containing
#     `org.gradle.java.home=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`
#   - gh CLI authenticated to the target repo
#
# Usage:
#   scripts/release.sh <tag> [options]
#
# Example:
#   scripts/release.sh demo-v1-memory-cards \
#     --title "Demo v1 — Visible Memory Cards" \
#     --notes-file docs/releases/demo-v1-memory-cards.md
#
# If you're releasing a historical snapshot, the new release may be marked as
# "Latest" on GitHub. Fix with: gh release edit <existing-tag> --latest

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Config — paths relative to this script
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$REPO_ROOT/glint-app"
ANDROID_DIR="$APP_DIR/android"
APK_SOURCE="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"

# ─────────────────────────────────────────────────────────────────────────────
# Argument parsing
# ─────────────────────────────────────────────────────────────────────────────
DRY_RUN=false
TAG=""
TITLE=""
NOTES_FILE=""

usage() {
  cat <<EOF
Glint release pipeline

Usage: $(basename "$0") <tag> [options]

Arguments:
  tag               Tag name to create (e.g. demo-v1-memory-cards)

Options:
  --title TEXT      Release title. Defaults to the tag name.
  --notes-file FILE Markdown file with release notes. If omitted, a minimal
                    auto-generated note is used (commit SHA + APK info).
  --dry-run         Build and verify everything, but do NOT tag/push/release.
  -h, --help        Show this help.

Examples:
  # Minimal:
  $(basename "$0") demo-v1-memory-cards

  # Full:
  $(basename "$0") demo-v1-memory-cards \\
    --title "Demo v1 — Visible Memory Cards" \\
    --notes-file docs/releases/demo-v1-memory-cards.md

  # Dry-run (build + check, no publish):
  $(basename "$0") demo-v1-test --dry-run
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --title) TITLE="$2"; shift 2 ;;
    --notes-file) NOTES_FILE="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "ERROR: unknown option: $1" >&2; usage >&2; exit 1 ;;
    *)
      if [[ -z "$TAG" ]]; then
        TAG="$1"; shift
      else
        echo "ERROR: unexpected positional argument: $1" >&2
        usage >&2; exit 1
      fi
      ;;
  esac
done

if [[ -z "$TAG" ]]; then
  echo "ERROR: tag is required" >&2
  usage >&2
  exit 1
fi

[[ -z "$TITLE" ]] && TITLE="$TAG"

# ─────────────────────────────────────────────────────────────────────────────
# Preflight
# ─────────────────────────────────────────────────────────────────────────────
echo "==> Preflight checks"
cd "$REPO_ROOT"

# 1. Node 22 via nvm (any v22.x, pick newest)
NODE22_DIR=$(ls -d "$HOME"/.nvm/versions/node/v22.* 2>/dev/null | sort -V | tail -1 || true)
if [[ -z "$NODE22_DIR" || ! -x "$NODE22_DIR/bin/node" ]]; then
  echo "ERROR: no v22.x Node found under ~/.nvm/versions/node/" >&2
  echo "       Install with: nvm install 22" >&2
  exit 1
fi
export PATH="$NODE22_DIR/bin:$PATH"

# 2. gh CLI
if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: gh CLI not found. Install with: brew install gh" >&2
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "ERROR: gh is not authenticated. Run: gh auth login" >&2
  exit 1
fi

# 3. Working tree state
if [[ -n "$(git status --porcelain)" ]]; then
  echo "WARN: working tree has uncommitted changes — the APK will be built"
  echo "      from them, but the tag will point at the clean HEAD commit."
  git status --short
  echo ""
fi

# 4. Tag uniqueness (local + remote)
if git rev-parse "refs/tags/$TAG" >/dev/null 2>&1; then
  echo "ERROR: tag '$TAG' already exists locally" >&2
  exit 1
fi
if git ls-remote --tags origin "refs/tags/$TAG" 2>/dev/null | grep -q "refs/tags/$TAG$"; then
  echo "ERROR: tag '$TAG' already exists on origin" >&2
  exit 1
fi

HEAD_SHA=$(git rev-parse --short HEAD)
echo "    Node:  $(node --version)"
echo "    gh:    $(gh --version | head -1 | awk '{print $3}')"
echo "    HEAD:  $HEAD_SHA"
echo "    Tag:   $TAG"
echo "    Title: $TITLE"
$DRY_RUN && echo "    Mode:  DRY RUN"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Build
# ─────────────────────────────────────────────────────────────────────────────
echo "==> Building web bundle (vite)"
cd "$APP_DIR"
rm -rf dist
npm run build
echo ""

echo "==> Syncing Capacitor to Android"
npx cap sync android
echo ""

echo "==> Building debug APK (gradle)"
cd "$ANDROID_DIR"
./gradlew assembleDebug
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Verify APK + fingerprint
# ─────────────────────────────────────────────────────────────────────────────
if [[ ! -f "$APK_SOURCE" ]]; then
  echo "ERROR: APK not found at $APK_SOURCE" >&2
  exit 1
fi

APK_DEST="/tmp/glint-${TAG}.apk"
cp "$APK_SOURCE" "$APK_DEST"

APK_BYTES=$(stat -f%z "$APK_DEST")
APK_SIZE=$(du -h "$APK_DEST" | cut -f1 | tr -d '[:space:]')
APK_SHA=$(shasum -a 256 "$APK_DEST" | cut -d' ' -f1)

echo "==> Build artifacts"
echo "    APK:    $APK_DEST"
echo "    Size:   ${APK_SIZE} (${APK_BYTES} bytes)"
echo "    SHA256: $APK_SHA"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Release notes
# ─────────────────────────────────────────────────────────────────────────────
if [[ -z "$NOTES_FILE" ]]; then
  NOTES_FILE="/tmp/glint-${TAG}-notes.md"
  cat > "$NOTES_FILE" <<EOF
Built from commit \`${HEAD_SHA}\`.

**APK:** \`glint-${TAG}.apk\` (${APK_SIZE})
**SHA256:** \`${APK_SHA}\`

Built via \`scripts/release.sh\`.
EOF
  echo "==> Using auto-generated release notes at $NOTES_FILE"
else
  if [[ ! -f "$NOTES_FILE" ]]; then
    echo "ERROR: notes file not found: $NOTES_FILE" >&2
    exit 1
  fi
  echo "==> Using release notes from $NOTES_FILE"
fi
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Tag + push + release
# ─────────────────────────────────────────────────────────────────────────────
if $DRY_RUN; then
  echo "==> DRY RUN — skipping publish steps"
  echo "    Would: git tag -a $TAG -m '$TITLE'"
  echo "    Would: git push origin $TAG"
  echo "    Would: gh release create $TAG --title '$TITLE' \\"
  echo "             --notes-file $NOTES_FILE $APK_DEST"
  echo ""
  echo "==> Dry run complete. APK is at $APK_DEST"
  exit 0
fi

cd "$REPO_ROOT"

echo "==> Creating tag $TAG on $HEAD_SHA"
git tag -a "$TAG" -m "$TITLE"

echo "==> Pushing tag to origin"
git push origin "$TAG"
echo ""

echo "==> Creating GitHub Release"
gh release create "$TAG" \
  --title "$TITLE" \
  --notes-file "$NOTES_FILE" \
  "$APK_DEST"
echo ""

echo "==> Done!"
REPO_URL=$(gh repo view --json url --jq .url)
echo "    $REPO_URL/releases/tag/$TAG"
