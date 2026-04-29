# Glint — Project Conventions for Claude Agents

**Project:** Glint 灵犀 — AI generative lockscreen for Android.
**Stack:** React 19 + TypeScript + Vite + Capacitor 8 + `@google/genai` (Gemini).

## Repo layout

```
Glint/
├── glint-app/                   # Capacitor-wrapped web app (THE product)
│   ├── App.tsx
│   ├── components/              # HomeScreen / LockScreen / Sandbox / ApiKeySetup
│   ├── services/                # geminiService, apiKeyStore, skeleton
│   └── android/                 # Capacitor Android shell
├── lockscreen-demos/            # Static prefab HTML lockscreens
├── examples/                    # Early HTML design references
├── docs/                        # Public-facing design notes
├── scripts/release.sh           # Build + tag + publish APK
└── CLAUDE.md                    # This file
```

## Architecture commitments

- **Latency budget**: first paint < 800ms from lockscreen trigger.
- **Safety**: AI-generated content renders inside sandboxed iframe — no `allow-same-origin`.
- **Unified API layer**: do not hard-code Gemini specifics outside `services/geminiService.ts`.

## Coding conventions

- TypeScript strict mode; no `any` without a `// TODO(type)` comment.
- React 19 idioms (use `useActionState`, `use()`, etc. where natural).
- Tailwind via CDN in `index.html` — do not add a build-time Tailwind pipeline.

## Security

- **No API key in the repo or build artifacts.** The user enters their Gemini API key on first launch; it persists in WebView `localStorage` via `services/apiKeyStore.ts`. `vite.config.ts` does NOT inject any key at compile time.
- Before committing, sanity-check no key snuck in: `git diff --cached | grep -iE 'AIza[A-Za-z0-9_-]{20,}'`.
- APKs are gitignored — never commit a built APK; it would embed whatever key was in localStorage at build time only if `vite define` is reintroduced (don't).
- Sandbox iframe: `sandbox="allow-scripts"` only. Never add same-origin/forms/popups.

## Running things

- Web dev: `cd glint-app && npm run dev`
- Build web: `cd glint-app && npm run build`
- Sync Android: `cd glint-app && npx cap sync android`
- Build APK: `cd glint-app/android && ./gradlew assembleDebug`

## Testing

- Visual regression: Playwright (MCP available).
- Android E2E: UI Automator + `adb exec-out screencap`.
- Performance: `adb shell am start -W` and `[PERF]` console traces in `services/geminiService.ts`.
