# Glint Harness — Autonomous Self-Improvement Loop

This harness follows Anthropic's *Effective Harnesses for Long-Running Agents* pattern:
coding agents work in "shifts" with no persistent memory, so we give them structured
handoff files (`features.json`, `claude-progress.md`) to maintain continuity across
sessions. Each iteration does **one** thing, verifies it with real tests, commits,
and yields to the next iteration.

## Design summary

```
┌─────────────────────────────────────────────────────────────┐
│  loop.sh  (cron / manual / GitHub Actions)                  │
│    │                                                         │
│    ▼                                                         │
│  claude --print loop-prompt.md                               │
│    │ 1. read progress + features.json                        │
│    │ 2. pick ONE feature where passes=false                  │
│    │ 3. run init.sh  (build web + cap sync + gradle)         │
│    │ 4. implement                                            │
│    │ 5. run verify-*.sh  (adb / playwright / vitest)         │
│    │ 6. update progress + features.json                      │
│    │ 7. git commit                                           │
│    ▼                                                         │
│  exit condition: all features pass OR max_iter reached       │
└─────────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `features.json` | Source of truth: PRD-derived feature list with verification steps. JSON format (per Anthropic recommendation — harder for agents to silently mutate). |
| `claude-progress.md` | Append-only log. Agents prepend entries each iteration. **"What failed and why"** is the critical field. |
| `blockers.md` | Features blocked after 2+ failed attempts; skipped until unblocked. |
| `deps-added.md` | Any new npm/gradle deps added during iteration (for human review). |
| `init.sh` | Idempotent environment setup (npm install → vite build → cap sync → optional gradle + adb install). |
| `loop.sh` | Main iteration driver. Calls `claude` CLI in non-interactive mode. |
| `prompts/loop-prompt.md` | The prompt the agent reads every iteration. Contains startup/work/finish sequences and hard rules. |
| `verify/verify-*.sh` | Concrete verification scripts used by `verification_steps` in features.json. |
| `screenshots/baseline/` | Visual regression baseline images. |
| `logs/` | Per-iteration stdout/stderr. |

## Feature phasing (from PRD §6.3)

- **P0 (8 features)** — A2UI JSON contract, predefined components, latency, security, offline fallback.
- **P1 (3 features)** — Semi-generative layout, user rhythm memory, feedback loop.
- **P2 (1+ features)** — Fully generative restricted-DSL sandbox.

Agents must finish all P0 before touching P1.

## Running

### One iteration (manual)

```bash
bash harness/init.sh
claude --print "$(cat harness/prompts/loop-prompt.md)"
```

### Continuous loop (unattended, up to 20 iterations)

```bash
MAX_ITERATIONS=20 bash harness/loop.sh
```

### Scheduled (cron example — every 2 hours)

```
0 */2 * * * cd /Users/bytedance/Desktop/Coding/Glint && MAX_ITERATIONS=3 bash harness/loop.sh
```

### As GitHub Actions (sketch)

Use `anthropics/claude-code-action@v1` triggered on schedule or PR comments.
The action invokes the same `loop.sh` in CI, letting the agent open PRs per iteration.

## Prerequisites

- `claude` CLI installed and authenticated (`claude login`)
- `jq` (`brew install jq`)
- Node 20+, npm, JDK 17, Android SDK (for APK build)
- `adb` with device/emulator attached (for device-level verification)
- Playwright (will be added by P0-007 iteration)

## Hard rules (enforced in loop-prompt.md)

1. **One feature per session.** No multi-feature batches.
2. **Never weaken verification_steps** to make tests pass.
3. **Never mark passes=true** without actually running verification end-to-end.
4. **Never commit `.env.local`** or files containing `AIza...` strings.
5. **Stop after 2 attempts** on the same feature; document in blockers.md.
6. **Finish P0 before P1, P1 before P2.**

## Customization

- Add features: append to `features.json` with a new id like `P0-009-...`.
- Tune latency budgets: edit the `target` field in the relevant feature.
- Disable a verification: NEVER — document why in `blockers.md` instead.
- Change prompt: edit `prompts/loop-prompt.md` (keep hard rules intact).

## Reference

- Anthropic: [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Anthropic: [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- Anthropic: [Three-Agent Harness (2026-04)](https://www.infoq.com/news/2026/04/anthropic-three-agent-harness-ai/)
