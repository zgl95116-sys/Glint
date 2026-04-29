# Glint 灵犀

> 某个时刻被轻轻点亮。
> *A moment, gently lit up.*

**Glint** is an experiment in what a phone lockscreen could be when an AI agent is the one drawing it.

Today's lockscreens are static — a clock, some notifications, a wallpaper that doesn't know what kind of day you're having. Glint flips this. The lockscreen becomes **a canvas the agent paints fresh for this exact moment**, given what it knows about you. Every glance is a one-of-a-kind composition: a sweeping flight arc when your plane is delayed, an ink-wash moonscape at 23:00, a quiet quote on the Sunday morning you have nothing planned.

This repo is an **open-source demo** of the rendering side of that idea. The end-to-end vision is bigger; see [Vision](#vision) below.

> ⚠️ Demo, not a product. The on-device experience here is a working proof-of-concept for *how* a generative lockscreen could feel. The full system — memory, proactive triggers, system-level integration — is roadmap, not shipped. See [Today vs. tomorrow](#today-vs-tomorrow).

---

## Vision

Three pillars. Glint only matters if all three are real.

### 1. Real-time UI generation

The agent doesn't pick from templates. It writes a complete `<!doctype html>` document — layout, motion, typography, color palette — tuned to the moment, and streams it into a sandboxed iframe. The first body paint lands inside ~800 ms; the full piece arrives in 2-4 s.

The output isn't a "card" or a "notification panel." It's a **single composed frame** — closer to editorial design or a generative poster than to a UI. We use a fixed component palette only as a safety net; the model is free to compose layouts the designer never thought of.

**Today**: working. Generated content streams from `gemini-3.1-flash-lite-preview`, renders in `<iframe sandbox="allow-scripts">`, with a faithful "bridge" lockscreen shown during the ~1 s before AI output arrives.

### 2. Memory

The lockscreen has to know you. Not "your name and birthday" — your *patterns*.

That you check your phone first thing on Saturday for nothing in particular and shouldn't be hit with notifications. That "周三下午" usually means meeting prep. That you care more about flight delays than weather forecasts. That you've already seen this kind of poster three times this week and want something different.

Memory is what turns a generative lockscreen from a parlor trick into a relationship. Without it, every render is a stranger.

**Today**: not implemented. Each render is stateless. Presets simulate context the agent should infer.
**Roadmap**: a small on-device memory layer (rhythms, recurring entities, recent history, explicit preferences) feeding into the prompt. Likely a hybrid of structured slots + a vector store for episodic recall.

### 3. Proactive agent

The agent shouldn't wait to be asked. It should watch — your calendar, your packages, your flights, your health rings, the weather, the unread queue — and decide *when* to surface something to the lockscreen, *what* to highlight, and *what visual language* to use for it.

A delayed flight isn't "show flight delay notification." It's: pre-empt the panic, foreground the new gate + walking time, soften the urgency by giving you a clear next action, and present it as a radar-style visual that matches the situation's energy.

Proactivity is the bridge between memory ("she has a flight at 6 PM") and generation ("draw the flight tracker right now").

**Today**: not implemented. The user picks a preset and the agent generates from that prompt. No autonomous triggering, no event subscription.
**Roadmap**: a trigger layer that subscribes to relevant signals (calendar, parcels, flights, weather, ambient sensors) and posts moments to the lockscreen asynchronously.

---

## Today vs. tomorrow

| | Today (this repo) | Tomorrow (vision) |
|---|---|---|
| **Rendering** | ✅ Streaming generation in sandbox iframe | Same, but driven by upstream events instead of taps |
| **Latency** | ✅ <800 ms bridge → 2-4 s full piece | ✅ Same |
| **Scenes** | 23 prefab prompts (rhythm / event / ambient) | Open-ended; library grows from observed patterns |
| **Memory** | ❌ Stateless per render | On-device patterns + recent history feeding the prompt |
| **Proactive** | ❌ User-triggered only | Calendar / parcel / flight / weather / health subscribers |
| **System integration** | Capacitor app you launch | True OS lockscreen replacement (Android first) |
| **API key** | User-supplied at first run | Same; or backend relay with per-user quota |

---

## Quick start

Requires **Node.js ≥ 22** (Capacitor 8 requirement). For Android builds you'll also need the Android SDK + an emulator or a connected device.

```bash
git clone https://github.com/zgl95116-sys/Glint.git
cd Glint/glint-app
npm install
npm run dev
```

Open http://localhost:3000. On first run you'll be asked for your **Gemini API key** — grab a free one at https://aistudio.google.com/apikey. It's stored in `localStorage` and only ever sent directly to Google's API.

> The free tier of `gemini-3.1-flash-lite` does **not** include cached-content storage. The first generation per session re-sends the full system prompt + few-shots inline (~12 K tokens), so TTFB is multi-second on free tier. Enabling billing on your Google Cloud project unlocks `caches.create()` and drops TTFB to ~1 s. The code falls back to inline automatically when cache creation fails.

To reset the key later, open the bottom sheet from the lockscreen and tap **重置 Key** in the top-right.

## Build for Android

```bash
cd glint-app
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

APK lands at `glint-app/android/app/build/outputs/apk/debug/app-debug.apk`. APKs are gitignored — never commit a build that has a key burned in. (The current build process doesn't bake one in — see [Security model](#security-model) — but the rule still stands as defense in depth.)

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Capacitor WebView (Android) / Browser                       │
│                                                              │
│  ┌────────────────┐    ┌────────────────────────────────┐    │
│  │  React shell   │───▶│  Sandboxed iframe              │    │
│  │  (HomeScreen,  │    │  sandbox="allow-scripts"       │    │
│  │   LockScreen,  │    │                                │    │
│  │   ApiKeySetup) │    │   ⟵ generated HTML stream     │    │
│  └────────────────┘    └────────────────────────────────┘    │
│         │                                                    │
│         ▼                                                    │
│  ┌────────────────────────────────────────────────────┐      │
│  │  geminiService.ts                                  │      │
│  │  • Streams `generateContentStream(...)`            │      │
│  │  • Bridge HTML rendered <800 ms before AI lands    │      │
│  │  • Cache content (system prompt + few-shots)       │      │
│  │  • HTTP/2 keepalive ping every 25 s                │      │
│  └────────────────────────────────────────────────────┘      │
│         │                                                    │
└─────────┼────────────────────────────────────────────────────┘
          │
          ▼  HTTPS (only outgoing connection)
   generativelanguage.googleapis.com
```

**The agent never gets parent-page access.** Generated HTML runs in `<iframe sandbox="allow-scripts">` — no `allow-same-origin`, no `allow-forms`, no `allow-popups`. The model cannot read your API key, your other state, or anything outside the iframe.

## Project layout

```
Glint/
├── glint-app/                  # The Capacitor-wrapped web app
│   ├── App.tsx                 # Top-level routing (setup ⇄ lockscreen ⇄ sheet)
│   ├── components/
│   │   ├── ApiKeySetup.tsx     # First-run key entry
│   │   ├── HomeScreen.tsx      # Bottom sheet: rhythm / events / ambient
│   │   ├── LockScreen.tsx      # The artwork surface
│   │   └── Sandbox.tsx         # Sandboxed iframe renderer
│   ├── services/
│   │   ├── apiKeyStore.ts      # localStorage-backed key store
│   │   ├── geminiService.ts    # Streaming, cache, warmup, art-direction routing
│   │   └── skeleton.ts         # Bridge HTML shown during the first ~1 s
│   ├── constants/
│   │   ├── prompts.ts          # Built-in scene presets (23 categorized)
│   │   └── prefabs.ts          # Pre-rendered HTML for instant-display scenes
│   └── android/                # Capacitor Android shell
├── lockscreen-demos/           # 23 static HTML reference designs
├── examples/                   # Early HTML mockups (design references)
├── scripts/release.sh          # Build + tag + publish APK
└── README.md
```

## Security model

- **No API key in the repo or in any built artifact.** The bundle is key-free; users enter their own at first launch via `ApiKeySetup`. `vite.config.ts` does not inject env vars at compile time.
- **No backend.** The client talks directly to `generativelanguage.googleapis.com`. To add a relay (so end users don't bring their own key), swap `services/geminiService.ts` for one that hits your relay endpoint.
- **AI output is sandboxed.** `<iframe sandbox="allow-scripts">` only — no same-origin access, no forms, no popups, no parent DOM.
- **Pre-commit check:** `git diff --cached | grep -iE 'AIza[A-Za-z0-9_-]{20,}'` before pushing.

## Roadmap

The demo's job is to prove the rendering loop is fast and good enough that it's worth building the rest. The rest:

1. **Memory layer** — On-device store for rhythms, entities, preferences, recent renders. Probably a `Capacitor Preferences` + lightweight vector index.
2. **Trigger system** — Pluggable subscribers for calendar / parcels / flights / weather / health / unread queue. Each trigger emits a structured "moment" the agent can decide to render.
3. **Render policy** — Decide *when* a trigger deserves a fresh render vs. an update vs. silence. Probably a small classifier, or just rules to start.
4. **Better caching** — Embedding-based recall of similar past moments for visual consistency over time.
5. **OS-level integration** — Move from "Capacitor app you open" to a true Android lockscreen replacement (likely an `Activity` with `WindowManager.LayoutParams.TYPE_KEYGUARD_DIALOG` + boot-receiver wiring).

Issues and PRs welcome. The most useful contribution at this stage is probably **new prefabs** (in `lockscreen-demos/`) and **art-direction rules** (in `geminiService.ts` `ART_RULES`) — both expand what the agent can compose without changing the architecture.

## License

MIT — see [LICENSE](./LICENSE).

---

*Built with React 19, Vite, Capacitor 8, and `@google/genai`. The poetry is human; the lockscreens are not.*
