# Glint — Project Conventions for Claude Agents

**Project:** Glint 灵犀 — AI generative lockscreen for Android (Doubao assistant sub-product).
**Stack:** React 19 + TypeScript + Vite + Capacitor 8 + `@google/genai` (Gemini).
**PRD:** `Glint-灵犀-PRD-v3.0.docx` at repo root. Read before architectural changes.

## Repo layout

```
Glint/
├── glint-app/                   # Capacitor-wrapped web app (THE product)
│   ├── App.tsx
│   ├── components/              # HomeScreen / LockScreen / Sandbox
│   ├── services/geminiService.ts
│   └── android/                 # Capacitor Android shell
├── flash-lite-browser/          # Precursor project (reference only, do not edit)
├── docs/                        # Design specs and plans
├── harness/                     # Autonomous iteration harness (see harness/README.md)
└── CLAUDE.md                    # This file
```

## Architecture commitments (from PRD)

- **Phase gating**: P0 → P1 → P2. Finish all P0 features before P1 work.
- **Latency budget**: first paint < 800ms from lockscreen trigger.
- **Safety**: AI-generated content renders inside sandboxed iframe — no `allow-same-origin`.
- **A2UI contract**: Agent outputs declarative JSON, client renders with fixed component palette (ArtCanvas / GlassCard / MediaPlayer / ContentFeed).
- **Unified API layer**: do not hard-code Gemini specifics outside `services/geminiService.ts`.

## Coding conventions

- TypeScript strict mode; no `any` without a `// TODO(type)` comment.
- React 19 idioms (use `useActionState`, `use()`, etc. where natural).
- No new runtime dependencies without an entry in `harness/deps-added.md`.
- Tailwind via CDN in `index.html` — do not add a build-time Tailwind pipeline.
- All prompts sent to Gemini live in `glint-app/services/prompts/` (create if missing).

## Security

- `GEMINI_API_KEY` lives in `glint-app/.env.local` — NEVER commit.
- Always check `git diff --cached | grep -i AIza` before committing.
- Sandbox iframe: `sandbox="allow-scripts"` only. Never add same-origin/forms/popups.

## Running things

- Web dev: `cd glint-app && npm run dev`
- Build web: `cd glint-app && npm run build`
- Sync Android: `cd glint-app && npx cap sync android`
- Build APK: `cd glint-app/android && ./gradlew assembleDebug`
- Full pipeline: `bash harness/init.sh` (with `BUILD_APK=1 INSTALL_APK=1` for device)

## Testing

- Unit: Vitest (to be set up — see feature P0-005).
- Visual regression: Playwright (MCP available, screenshots in `harness/screenshots/`).
- Android E2E: UI Automator + `adb exec-out screencap`.
- Performance: macrobenchmark or `adb shell am start -W`.

## When in doubt

Read `harness/features.json` and `harness/claude-progress.md` to understand current
priority and what's been tried. The harness is the source of truth for "what to do next".
