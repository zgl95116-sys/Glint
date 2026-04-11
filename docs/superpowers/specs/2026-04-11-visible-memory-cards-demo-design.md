# Glint Demo — "Visible Memory Cards" Design

**Date:** 2026-04-11
**Status:** Draft, awaiting implementation plan
**Author:** brainstorming session with @loganzhao

---

## Problem

Glint's demo currently communicates its three-pillar thesis (memory + proactive agent + generative UI) through prose baked into preset prompts. Each preset, viewed alone, is a beautiful one-off scene — but the three pillars are not *visibly connected*. An audience sees "a nice lockscreen gallery," not "an AI that knows me and decided to show me this."

User's own diagnosis: *"三条都弱，但连起来更弱"* — none of the pillars is fatally weak on its own, but the closed loop between them is invisible.

This is a demo, not the product. Pre-baked "memory" is acceptable and in fact correct for this scope — the real product will connect to phone signals later. The work is **staging and visual narrative**, not architecture.

## Goal

Turn the three pillars into *one physical, observable motion on screen*, so a viewer watching for 30 seconds with no narration walks away thinking:

1. "It remembers things about me."
2. "Those memories influenced what it showed me."
3. "The art was generated, not picked from a library."

Success = an outside viewer reaches all three conclusions without anyone having to explain.

## Core design — memory as a physical prop

### The central motion

One continuous physical motion replaces the current "tap button → generate" flow:

```
card glows  →  phrase detaches  →  phrase flies into canvas  →  streaming draws it into final art
```

On the lockscreen surface:
- **3–5 memory cards** float on one side of the screen (left rail or corner cluster). Each card is small (~120×60px), semi-transparent glass, holding one short fact:
  - "你 11:47 才睡"
  - "方案评审周"
  - "昨晚听《河流》听到一半"
  - "常飞北京→上海"
  - "每次都住全季"
- When a generation is triggered, **1–2 relevant cards light up** (opacity 0.5 → 0.9, subtle glow).
- Their key phrases visibly **detach** from the card, float across the screen, and **land in the generation surface** at the moment streaming begins.
- The flown-in phrases then **become part of the streaming output** — the prompt sent to Gemini explicitly includes those phrases, so the model embeds them prominently (hero text, voice line, data label).

The audience sees one continuous motion from "static floating facts" to "art that speaks those facts." No architecture diagram needed.

### Component breakdown

**`MemoryDeck`** — new React component rendering the floating card cluster.

Props:
```ts
interface MemoryDeckProps {
  cards: MemoryCard[];
  highlightIds: string[];       // which cards are currently "lit up"
  onFlightComplete: () => void; // fired when fly-out animation finishes
}
```

**`MemoryCard`** type (new file `constants/memory.ts`):
```ts
interface MemoryCard {
  id: string;
  icon?: string;   // e.g. 🌙 ☕️ 📝 ✈️
  label: string;   // short category label, e.g. "睡眠"
  phrase: string;  // the text that visibly flies into the generation
}
```

**Deck ↔ preset binding** — each `PresetPrompt` in `constants/prompts.ts` gets a new optional field `usedMemoryIds: string[]`. When the user triggers that preset:
1. `App.tsx` resolves the ids → card objects
2. Passes `highlightIds` to `MemoryDeck`
3. MemoryDeck runs the fly-out animation
4. On `onFlightComplete`, `App.tsx` begins the generation, injecting the resolved phrases into the prompt template so Gemini naturally references them

**Fallbacks:**
- **Preset with no `usedMemoryIds`:** no cards light up, animation skipped, generation runs immediately (current behavior preserved).
- **Prefab presets** (Canvas animations that bypass Gemini — bubble game, zen garden, etc.): animation is also skipped, since pre-baked HTML cannot embed flown-in phrases. The memory deck stays idle and the prefab renders as today.

**Fly-out animation** — no new dependency. On highlight:
1. Create a transient absolutely-positioned `<span>` copied from the card's phrase text
2. Animate `transform: translate() scale()` from the card's rect toward the sandbox iframe's center
3. Use Web Animations API (`element.animate(...)`) — ~400ms duration, ease-out
4. On animation end, fire `onFlightComplete`

**Latency hiding** — the fly-out adds ~400ms on the front. To stay within the 800ms first-paint budget from `CLAUDE.md`, the Gemini request is **fired in parallel** with the fly-out start. The streaming content becomes visible the moment the flying phrase lands, not 400ms later.

### App first-frame change

Instead of `HomeScreen` as the landing view, the app boots directly into the lockscreen view:
- `MemoryDeck` visible
- An "ambient" generation already streaming, driven by the real current device time (and a default memory card set)
- No brand splash, no button menu

The existing `HomeScreen` (preset picker + custom input) becomes a **bottom sheet** revealed by an upward swipe gesture (or a small pill handle at the bottom edge).

First impression shifts from "I opened an app" to "this thing is already alive."

### Scripted mid-stream reversal (截图时刻)

One preset — `⚡ 航班延误` — is wired with a scripted "event injection" to demonstrate that the lockscreen is a live canvas, not a still image:

1. Generation begins normally: radar grid draws, flight arc in green, "准点".
2. At ~60% of the stream (measured by elapsed time from generation start, default ~5s; the exact threshold is an implementation tunable), the client injects a scripted "new SMS received" event.
3. A pre-written "delta HTML" is applied directly via the sandbox's existing crossfade primitive — no second Gemini round-trip. The delta replaces the in-flight generation with a conflicting state: radar re-renders red, countdown flips, voice line types in: *"刚收到延误通知，我重新算了一遍"*. (A second Gemini call was considered and rejected: too slow to feel like a reaction, too non-deterministic for a scripted demo moment.)
4. Two relevant memory cards ("出差常客", "每次去上海住全季") glow during the second phase and fly phrases into the updated layout.

This is the single most shareable moment of the demo — a thing nobody else is doing with LLM-generated UIs.

## Demo script (90 seconds)

```
0:00  App opens. Lockscreen already showing a live-generating ambient scene
      based on real current time. MemoryDeck visible with 4-5 cards.
0:06  Presenter swipes up → bottom sheet with preset picker slides in.
0:10  Presenter taps "⚡ 航班延误".
0:12  Two memory cards light up ("出差常客", "每次住全季").
      Phrases detach and fly into the canvas.
0:15  Streaming begins — radar grid draws, flight arc in green, "准点".
0:30  Scripted SMS event injected. Radar re-renders red mid-stream,
      countdown flips, new voice line types in.
0:45  Final frame rests. Presenter points at the two lit cards, says
      "it knew he flies this route and stays at All Seasons" — no code
      explanation needed because the fly-in already showed it.
1:00  Presenter swipes up, taps "23:00 · 今天的最后一页".
1:02  Different cards light up ("听歌入睡习惯", "周报拖延一周了").
      Fly-in animation, streaming begins.
1:20  Final dark, intimate night lockscreen with memory-referenced voice line.
1:30  End.
```

## What this reuses

Nothing that already works gets thrown away.

- **`constants/prompts.ts`** — the 13 richly-written presets stay. Each gets a new `usedMemoryIds` field. Prompt text may be lightly edited so the flown-in phrases have a natural home.
- **`services/geminiService.ts`** — streaming path is untouched except for a small scripted "event injection" hook used only by the flight scenario.
- **`components/Sandbox.tsx`** — the double-buffer crossfade is already the right primitive for mid-stream reversal. It needs to accept a secondary HTML frame; no rewrite.
- **`App.tsx`** streaming commit pipeline — a `memoryPhraseFlight` pre-phase is added before `setIsLoading(true)`. The rest of the commit logic is unchanged.
- **Visual language** (glass cards, gradients, hero typography) — the `MemoryDeck` cards inherit the same glass-morphism vocabulary used inside generated content, so they feel native to the surface.

## Out of scope (explicit YAGNI)

These are all interesting but deliberately deferred. They do not go into this spec or the resulting plan.

- **Real memory store.** Cards live in `constants/memory.ts` as static data.
- **Feedback loop** (tap/dwell writes back to memory). Demo shows the forward arrow only.
- **Real sensor signals.** Current device time is the only live signal used at boot.
- **Ambient clock mode** (generation evolving on its own over time). Defer.
- **Dual-persona side-by-side view.** Defer.
- **User-editable memory cards.** Defer — cards are static for this demo.
- **Generalizing mid-stream reversal to all presets.** Only the flight preset gets it.

## Files touched (anticipated)

- **new** `glint-app/constants/memory.ts` — memory card data + preset↔card mapping
- **new** `glint-app/components/MemoryDeck.tsx` — card cluster rendering + fly-out animation
- **modified** `glint-app/components/HomeScreen.tsx` — refactored into a bottom-sheet surface
- **modified** `glint-app/components/LockScreen.tsx` — now the default boot surface, hosts `MemoryDeck`
- **modified** `glint-app/App.tsx` — boot directly to lockscreen; ambient first-generation; flight-delay mid-stream event injection hook
- **modified** `glint-app/constants/prompts.ts` — add `usedMemoryIds` field; light prompt edits so phrases land naturally
- **modified** `glint-app/services/geminiService.ts` — expose a minimal hook for scripted mid-stream HTML fragment injection (used only by the flight preset)

## Risks

- **Mid-stream reversal flicker.** The existing double-buffer handles frame replacement at generation boundaries. Mid-stream replacement has not been tested. Mitigation: first implementation iteration must verify on a real Android device before the rest of the spec is built on top of it.
- **Fly-out adds latency.** The animation is ~400ms. If the Gemini request is not fired in parallel, it directly violates the 800ms first-paint budget from `CLAUDE.md`. Mitigation: the generation call MUST start on `onHighlight`, not on `onFlightComplete` — the fly-out and the network request race, and the streaming content paints as the phrase lands.
- **Deck visual noise.** If `MemoryDeck` is too loud, it competes with the hero visual. Rule: idle opacity ≤ 0.5; only lit cards go to ~0.9; the deck never uses saturated colors; it always sits below the hero element in the visual hierarchy.
- **Real device unfamiliar-user mode.** Since the demo is also shipped as a real APK for strangers to poke, the MemoryDeck must always have a reasonable default set so nothing is empty on first boot. Static data in `constants/memory.ts` handles this trivially.

## Success criteria

1. An outside viewer watching a silent 30-second screen recording can state, unprompted, that the phone "remembers things" and those things "influenced the image."
2. The flight-delay mid-stream reversal moment produces a shareable ≤5s gif/clip.
3. The 90-second demo script runs end-to-end without a single manual reset on real hardware.
4. First paint (from app icon tap to first visible generated frame on the ambient boot screen) remains ≤ 800ms, matching the existing budget.
5. All 13 presets in `prompts.ts` continue to work — no regression in the non-flight scenarios.
