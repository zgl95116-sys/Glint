# Glint 灵犀

AI-generative lockscreen — every glance is a one-of-a-kind poster, generated on the fly by Gemini and rendered inside a sandboxed iframe.

- **Stack:** React 19 + TypeScript + Vite + Capacitor 8 + `@google/genai` (Gemini)
- **Target:** Android (Capacitor WebView). Also runs as a regular web app for development.
- **Architecture:** the model returns a single `<!doctype html>` document; the client renders it in a sandboxed iframe. No native UI is generated.

## Quick start

Requires **Node.js >= 22** (Capacitor 8 requirement) and Android SDK + an emulator/device for the APK build.

```bash
git clone <this-repo> glint
cd glint/glint-app
npm install
npm run dev
```

Open http://localhost:3000. On first run the app asks for your **Gemini API key** — get a free one at https://aistudio.google.com/apikey. The key is stored in your browser's `localStorage` and is never sent anywhere except directly to Google's API.

To reset the key later: open the bottom sheet from the lockscreen and tap **重置 Key** in the top-right.

## Build for Android

```bash
cd glint-app
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

The APK lands at `glint-app/android/app/build/outputs/apk/debug/app-debug.apk`. APK files are gitignored — **never commit a build that has a key burned in**.

## Security model

- **The key lives only on the device.** This repo's bundle contains no key. The user enters it on first launch; it is persisted in WebView `localStorage` and read at runtime by `services/apiKeyStore.ts`.
- **No backend.** The client talks directly to `generativelanguage.googleapis.com`. If you want a backend-mediated setup, swap `services/geminiService.ts` for one that hits your relay.
- **AI output is sandboxed.** Generated HTML renders inside `<iframe sandbox="allow-scripts">` — no `allow-same-origin`, no parent-page access. The model cannot read your key or any app state.

## Project layout

```
glint/
├── glint-app/                 # Capacitor-wrapped web app (the product)
│   ├── App.tsx
│   ├── components/
│   │   ├── HomeScreen.tsx     # Bottom sheet — preset + custom prompts
│   │   ├── LockScreen.tsx     # The generated artwork
│   │   ├── Sandbox.tsx        # Sandboxed iframe renderer
│   │   └── ApiKeySetup.tsx    # First-run key entry
│   ├── services/
│   │   ├── apiKeyStore.ts     # localStorage-backed key store
│   │   ├── geminiService.ts   # Streaming + caching + warmup
│   │   └── skeleton.ts        # Bridge HTML shown while streaming
│   ├── constants/prompts.ts   # Built-in scene presets
│   └── android/               # Capacitor Android shell
├── lockscreen-demos/          # Static HTML reference designs
├── docs/                      # Specs and brief
└── CLAUDE.md                  # Agent-facing project conventions
```

## License

MIT — see [LICENSE](./LICENSE).
