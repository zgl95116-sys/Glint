#!/usr/bin/env bash
# Glint harness: main autonomous iteration loop (Ralph-style)
# Invokes Claude Code with the loop prompt, commits after each iteration,
# exits when all features pass or MAX_ITERATIONS reached.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HARNESS_DIR="$REPO_ROOT/harness"
LOG_DIR="$HARNESS_DIR/logs"
mkdir -p "$LOG_DIR"

MAX_ITERATIONS="${MAX_ITERATIONS:-20}"
PROMPT_FILE="$HARNESS_DIR/prompts/loop-prompt.md"

log() { echo "[loop.sh $(date +%H:%M:%S)] $*" | tee -a "$LOG_DIR/loop.log"; }

# Pre-flight
command -v claude >/dev/null || { echo "claude CLI not installed"; exit 1; }
command -v jq >/dev/null || { echo "jq required (brew install jq)"; exit 1; }
[[ -f "$PROMPT_FILE" ]] || { echo "missing $PROMPT_FILE"; exit 1; }
[[ -f "$HARNESS_DIR/features.json" ]] || { echo "missing features.json"; exit 1; }

cd "$REPO_ROOT"

for i in $(seq 1 "$MAX_ITERATIONS"); do
  log "===== Iteration $i / $MAX_ITERATIONS ====="

  # Exit condition: all features pass
  remaining=$(jq '[.[] | select(.passes==false)] | length' "$HARNESS_DIR/features.json")
  log "Features remaining: $remaining"
  if [[ "$remaining" == "0" ]]; then
    log "All features pass. Stopping."
    break
  fi

  # Run Claude Code (non-interactive, auto-accept edits)
  # --dangerously-skip-permissions required for unattended runs
  claude --dangerously-skip-permissions \
         --print "$(cat "$PROMPT_FILE")" \
         2>&1 | tee -a "$LOG_DIR/iter-$i.log" || {
    log "Claude invocation failed on iter $i, continuing"
  }

  # Commit whatever the agent produced this round
  git add -A
  if ! git diff --cached --quiet; then
    git commit -m "harness iter $i: auto" | tee -a "$LOG_DIR/loop.log" || true
  else
    log "No changes this iteration"
  fi

  # Optional: push to remote
  # git push origin HEAD 2>&1 | tee -a "$LOG_DIR/loop.log" || true
done

log "Loop complete. Summary:"
jq -r '[.[] | {id, phase, passes}] | group_by(.phase) | map({phase: .[0].phase, total: length, passed: [.[] | select(.passes==true)] | length})' "$HARNESS_DIR/features.json" | tee -a "$LOG_DIR/loop.log"
