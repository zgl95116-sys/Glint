# Glint Harness — Coding Agent Iteration Prompt

You are a coding agent iterating on the **Glint** Android app — a generative AI lockscreen built on React 19 + Vite + Capacitor 8 + Gemini (`@google/genai`). The project is at the repo root; the web app lives in `glint-app/`, Android shell in `glint-app/android/`.

## Your one job this session

Pick ONE feature from `harness/features.json` where `passes=false`, implement it, verify it, and update state. **Never attempt more than one feature per session.**

---

## Startup sequence (do these in order, every time)

1. `pwd` and `git log --oneline -10` — confirm you know where you are.
2. Read `harness/claude-progress.md` — understand what previous iterations did, what failed and why.
3. Read `harness/blockers.md` — avoid re-attempting items marked blocked without new info.
4. Read `CLAUDE.md` at repo root — project conventions.
5. Read `harness/features.json` — select the **highest-priority** feature where `passes=false` AND id is not in blockers.md.
6. Run `bash harness/init.sh` to ensure env is built and synced.

---

## Work sequence

7. Implement the selected feature's requirements in `glint-app/`.
8. Run the feature's `verification_steps` exactly as listed. Capture the metric in `metric_field`.
9. If using Android verification, use `adb` commands. If web-level, use Playwright (MCP available) or Vitest.
10. Capture evidence to `harness/screenshots/iter-{timestamp}-{feature-id}.png` when relevant.

---

## Finish sequence

11. Update `harness/claude-progress.md` with a new entry at the TOP containing:
    - Iteration timestamp
    - Feature id worked on
    - What you changed (files + short description)
    - Metric captured (actual value vs. target)
    - **What failed and WHY** (this is the most important field — prevents future loops from repeating mistakes)
12. If verification passed, set `passes=true` on that feature in `features.json` and record the metric value.
13. If you hit a hard blocker after 2 attempts, write an entry to `harness/blockers.md` explaining the blocker and pick a DIFFERENT feature.
14. `git add -A && git commit -m "feat({feature-id}): {short summary}"` — commit messages should reference the feature id.

---

## HARD RULES (from Anthropic long-running harness best practices)

- **It is unacceptable to remove, weaken, or edit verification_steps in features.json to make tests pass.** Tests define success — if a test is wrong, document it in blockers.md with justification, do not silently change it.
- **One feature per session.** Even if a fix is trivial, stop after committing and let the next iteration pick the next feature.
- **Never mark `passes=true` without actually running the verification_steps end-to-end.** No self-certification from reading code.
- **Never commit `.env.local` or any file containing `GEMINI_API_KEY`.** Check with `git diff --cached | grep -i AIza` before commit.
- **Never add new npm dependencies without appending them to `harness/deps-added.md`** with justification.
- **If blocked > 2 attempts on the same feature, stop and document.** Do not loop indefinitely.

---

## Project-specific guardrails

- The app targets `minSdk` defined in `glint-app/android/variables.gradle` — do not raise it.
- `components/Sandbox.tsx` is the security boundary for AI-generated content — NEVER add `allow-same-origin` to its iframe sandbox attribute.
- Lockscreen latency budget is **800ms first paint** (PRD §6.3). Any change that regresses `P0-001-lockscreen-cold-start` must be reverted.
- Preserve the A2UI declarative JSON contract — agents output JSON, client renders with predefined components (ArtCanvas, GlassCard, MediaPlayer, ContentFeed).
- This is a phased architecture (P0 → P1 → P2). Do not skip ahead — finish all P0 items before starting P1, finish P1 before P2.

---

## When uncertain

Prefer smaller, reversible changes. If you're not sure whether a refactor is safe, leave a TODO comment and pick a simpler feature. Progress comes from many small verified wins, not one big unverified rewrite.
