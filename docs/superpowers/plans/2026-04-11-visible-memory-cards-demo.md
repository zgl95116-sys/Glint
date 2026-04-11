# Visible Memory Cards Demo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Glint's three pillars (memory + proactive agent + generative UI) into one physical, observable motion: memory cards glow, phrases detach and fly into the canvas, streaming art embeds them. Plus one scripted mid-stream "AI changes its mind" moment for the flight-delay preset as the demo hero shot.

**Architecture:** A new `MemoryDeck` component renders static glass cards. When a preset is triggered, `App.tsx` resolves the preset's `usedMemoryIds`, passes `highlightIds` to the deck, and in parallel (a) fires the Gemini call with memory phrases injected into the prompt text and (b) animates transient DOM `<span>`s from each lit card toward the sandbox iframe using the Web Animations API. The streaming output paints as the flying phrases land, so perceived latency is unchanged. For the flight preset, a scripted `setTimeout` aborts the in-flight generation at ~5s and pushes a pre-written "delta HTML" through the existing `setHtmlContent` → sandbox double-buffer crossfade, producing the visible mid-stream reversal without any protocol changes.

**Tech Stack:** React 19 + TypeScript 5.8 + Vite 6 + Capacitor 8 + `@google/genai` 1.35. No new runtime dependencies. No test framework (the project has none — verification is manual via Playwright MCP browser tools against the Vite dev server, plus Android APK build for the mid-stream reversal task).

**Spec:** `docs/superpowers/specs/2026-04-11-visible-memory-cards-demo-design.md`

---

## Prerequisites

- [ ] **P1: Confirm working directory and worktree**

This plan is intended to be executed in a dedicated git worktree isolated from the user's current workspace. If you are not already in a worktree, ask the user whether to create one via `superpowers:using-git-worktrees` before starting Task 1. If the user says "just work on main," proceed but commit each task separately so changes can be reverted individually.

- [ ] **P2: Start the Vite dev server in the background**

Run: `cd /Users/bytedance/Desktop/Coding/Glint/glint-app && npm run dev`

Use `run_in_background: true`. Keep this running for the entire plan — every task's verification step will navigate to `http://localhost:5173` via Playwright MCP.

Expected: Vite prints `Local: http://localhost:5173/` within ~2 seconds.

If it fails: check `glint-app/.env.local` for `GEMINI_API_KEY`. The app will render without it but generation will fail — that's acceptable for early tasks; only Tasks 4–8 actually need live generation.

---

## File Structure

```
glint-app/
├── constants/
│   ├── memory.ts             ← NEW. Static MemoryCard data + type.
│   └── prompts.ts             ← MODIFY. Add usedMemoryIds field; no prompt text changes in this plan.
├── components/
│   ├── MemoryDeck.tsx         ← NEW. Deck rendering + fly-out animation.
│   ├── LockScreen.tsx         ← MODIFY. Mount MemoryDeck.
│   └── HomeScreen.tsx         ← MODIFY. Refactor into bottom-sheet form factor.
├── App.tsx                    ← MODIFY. Highlight state, phrase injection, boot-to-lockscreen,
│                                         mid-stream reversal for flight preset.
└── services/
    └── geminiService.ts       ← UNCHANGED. Prompt augmentation happens in App.tsx, not the service.
```

**Boundaries:**
- `constants/memory.ts` — pure data, no React, no side effects.
- `components/MemoryDeck.tsx` — view layer only. Receives props, renders cards, owns the fly-out animation, calls back when complete. Knows nothing about Gemini, presets, or navigation.
- `App.tsx` — orchestration. Owns the highlight state, decides when to fire the animation, decides when to start the Gemini call, decides when to inject the flight delta.
- `services/geminiService.ts` — untouched. The prompt gets its "memory phrases" line prepended at the call site in `App.tsx`.

---

## Task 1: Memory card data and type

**Files:**
- Create: `glint-app/constants/memory.ts`

- [ ] **Step 1: Create `glint-app/constants/memory.ts` with the card type and the static deck**

```ts
/**
 * Memory cards are the visible facts the "AI remembers" about the user in the
 * demo. In the real product these would be derived from phone signals; here
 * they are hand-authored and static. Every PresetPrompt in `prompts.ts`
 * references a subset of these by id through its `usedMemoryIds` field.
 *
 * Design rules:
 *   - `phrase` is the text that visibly flies into the generation. Keep it
 *     short (≤ 10 Chinese characters). It must read well both as a floating
 *     label on the card AND as a fragment embedded in the generated art.
 *   - `label` is the category shown on the card face. One or two characters.
 *   - `icon` is optional but recommended — it gives the card a visual anchor
 *     even when the viewer can't read the phrase from a distance.
 */
export interface MemoryCard {
  id: string;
  icon?: string;
  label: string;
  phrase: string;
}

export const MEMORY_DECK: MemoryCard[] = [
  { id: 'sleep_late',      icon: '🌙', label: '睡眠',  phrase: '昨晚 11:47 才睡' },
  { id: 'review_week',     icon: '📝', label: '工作',  phrase: '方案评审周' },
  { id: 'music_river',     icon: '🎵', label: '听歌',  phrase: '听《河流》到一半' },
  { id: 'flight_regular',  icon: '✈️', label: '出差',  phrase: '常飞北京-上海' },
  { id: 'hotel_preference',icon: '🏨', label: '住宿',  phrase: '每次都住全季' },
  { id: 'coffee_morning',  icon: '☕️', label: '习惯',  phrase: '早上必喝拿铁' },
  { id: 'weekly_report',   icon: '📄', label: '待办',  phrase: '周报拖了一周' },
  { id: 'gym_skipped',     icon: '🏃', label: '运动',  phrase: '三天没跑步了' },
];

export function resolveCards(ids: string[]): MemoryCard[] {
  return ids
    .map((id) => MEMORY_DECK.find((c) => c.id === id))
    .filter((c): c is MemoryCard => c !== undefined);
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd /Users/bytedance/Desktop/Coding/Glint/glint-app && npx tsc --noEmit`

Expected: zero errors. If you see unrelated pre-existing errors, leave them — only fix errors introduced by this task.

- [ ] **Step 3: Commit**

```bash
cd /Users/bytedance/Desktop/Coding/Glint
git add glint-app/constants/memory.ts
git commit -m "$(cat <<'EOF'
feat(memory): add static MemoryCard deck for demo

Eight hand-authored cards backing the new visible-memory-cards demo.
These are the "facts the AI pretends to remember" and will be wired
into preset prompts in the next task.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Extend PresetPrompt with `usedMemoryIds` and wire five presets

**Files:**
- Modify: `glint-app/constants/prompts.ts`

- [ ] **Step 1: Add the `usedMemoryIds` field to the `PresetPrompt` interface**

Open `glint-app/constants/prompts.ts`. Locate the existing interface at the top of the file (lines ~9–20) and add one field. Full updated interface:

```ts
export interface PresetPrompt {
  label: string;
  prompt: string;
  // 数据依据标注，方便后续对照调整
  dataBasis?: string;
  /**
   * 预生成的完整 HTML — 跳过 Gemini，直接交给 Sandbox 渲染。
   * 用于 Canvas 交互/生成式动画等 flash-lite 无法实时生成的场景。
   * 渲染管线会加一个短暂的 bridge→reveal 过渡来保持体验一致。
   */
  prefabHtml?: string;
  /**
   * 触发该 preset 时哪些 MemoryCard 会 "亮起并飞入"。
   * 空 / 未设：不触发记忆卡动画，按原逻辑直出生成。
   * Prefab preset：即使设置也会被忽略（预制 HTML 无法嵌入飞入短语）。
   */
  usedMemoryIds?: string[];
}
```

- [ ] **Step 2: Wire five of the existing presets to memory card ids**

Still in `glint-app/constants/prompts.ts`, inside the `PRESET_PROMPTS` array, add `usedMemoryIds` to exactly these five preset objects. Do not touch any other fields — leave every `prompt`, `label`, `dataBasis` untouched.

Find each by its `label` substring and add the field immediately after `dataBasis`:

1. Preset labeled `'07:00 · 枕边第一眼'` — add:
   ```ts
   usedMemoryIds: ['sleep_late', 'coffee_morning'],
   ```

2. Preset labeled `'10:30 · 工作心流护航'` — add:
   ```ts
   usedMemoryIds: ['review_week', 'weekly_report'],
   ```

3. Preset labeled `'23:00 · 今天的最后一页'` — add:
   ```ts
   usedMemoryIds: ['music_river', 'gym_skipped'],
   ```

4. Preset labeled `'⚡ 航班延误'` — add:
   ```ts
   usedMemoryIds: ['flight_regular', 'hotel_preference'],
   ```

5. Preset labeled `'⚡ 凌晨两点半'` — add:
   ```ts
   usedMemoryIds: ['sleep_late', 'music_river'],
   ```

Leave the other 8 presets (including all `prefabHtml` presets) unchanged — they will render exactly as today.

- [ ] **Step 3: Verify it type-checks**

Run: `cd /Users/bytedance/Desktop/Coding/Glint/glint-app && npx tsc --noEmit`

Expected: zero new errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/bytedance/Desktop/Coding/Glint
git add glint-app/constants/prompts.ts
git commit -m "$(cat <<'EOF'
feat(memory): wire five presets to memory card ids

Adds usedMemoryIds field to PresetPrompt interface and attaches
memory card references to five narratively-relevant presets
(morning, focus, night, flight, 2:30am). Other presets unchanged
and will render via the legacy no-animation path.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Create `MemoryDeck` component with static rendering

**Files:**
- Create: `glint-app/components/MemoryDeck.tsx`
- Modify: `glint-app/components/LockScreen.tsx`

This task produces a visibly mounted deck with zero interactivity. The fly-out animation and highlight state wiring come in later tasks. The goal here is "cards show up on top of the lockscreen at the correct layer and don't break anything."

- [ ] **Step 1: Create `glint-app/components/MemoryDeck.tsx`**

```tsx
import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import type { MemoryCard } from '../constants/memory';

export interface MemoryDeckHandle {
  /**
   * Animate `phrases` from their respective card positions to the given
   * viewport rect (the sandbox iframe center), then resolve. The caller is
   * expected to start its generation in parallel, so perceived latency is
   * just the network TTFB, not network + animation.
   */
  flyPhrases(phrases: { cardId: string; text: string }[], targetRect: DOMRect): Promise<void>;
}

interface MemoryDeckProps {
  cards: MemoryCard[];
  /** Card ids currently lit up. Empty array means all cards are idle. */
  highlightIds: string[];
}

export const MemoryDeck = forwardRef<MemoryDeckHandle, MemoryDeckProps>(
  ({ cards, highlightIds }, ref) => {
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Fly-out animation is implemented in Task 5. For now expose a stub
    // with the full signature so the type contract compiles, but have it
    // resolve immediately so consumers can already await it.
    useImperativeHandle(ref, () => ({
      async flyPhrases(_phrases, _targetRect) {
        // Implemented in Task 5.
      },
    }));

    return (
      <div className="memory-deck" aria-hidden="true">
        {cards.map((card) => {
          const isLit = highlightIds.includes(card.id);
          return (
            <div
              key={card.id}
              ref={(el) => {
                if (el) cardRefs.current.set(card.id, el);
                else cardRefs.current.delete(card.id);
              }}
              className={`memory-card${isLit ? ' memory-card-lit' : ''}`}
            >
              {card.icon && <span className="memory-card-icon">{card.icon}</span>}
              <span className="memory-card-label">{card.label}</span>
              <span className="memory-card-phrase">{card.phrase}</span>
            </div>
          );
        })}
      </div>
    );
  },
);

MemoryDeck.displayName = 'MemoryDeck';
```

- [ ] **Step 2: Add the deck CSS to `glint-app/index.html`**

Open `glint-app/index.html`. Find the existing `<style>` block (Tailwind is loaded via CDN per CLAUDE.md — look for the inline `<style>` section, typically after the Tailwind script). Append these rules at the end of that style block, just before `</style>`:

```css
/* === MemoryDeck === */
.memory-deck {
  position: absolute;
  left: 4%;
  top: 18%;
  bottom: 18%;
  width: 28vw;
  max-width: 160px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: center;
  pointer-events: none;
  z-index: 20;
}
.memory-card {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 8px 10px 10px;
  opacity: 0.42;
  transform: scale(0.96);
  transition: opacity 400ms ease, transform 400ms ease, box-shadow 400ms ease;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.memory-card-lit {
  opacity: 0.92;
  transform: scale(1);
  box-shadow: 0 4px 24px rgba(255, 220, 150, 0.18);
}
.memory-card-icon {
  font-size: 14px;
  line-height: 1;
}
.memory-card-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 1px;
}
.memory-card-phrase {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.3;
  font-weight: 300;
}
```

- [ ] **Step 3: Mount the deck inside `LockScreen.tsx`**

Open `glint-app/components/LockScreen.tsx`. Add the import and render the deck above the back pill but below the content blur wrapper. Full updated file:

```tsx
import React, { forwardRef } from 'react';
import { Sandbox } from './Sandbox';
import { MemoryDeck, type MemoryDeckHandle } from './MemoryDeck';
import { MEMORY_DECK } from '../constants/memory';

interface LockScreenProps {
  htmlContent: string;
  isLoading: boolean;
  isActive: boolean;
  revealPhase: 'idle' | 'blurred' | 'revealing';
  sandboxSessionKey: number;
  highlightIds: string[];
  onBack: () => void;
}

const FILTER_STYLES: Record<string, React.CSSProperties> = {
  idle: {},
  blurred: {
    filter: 'blur(14px) saturate(1.6)',
    transition: 'none',
  },
  revealing: {
    filter: 'blur(0px) saturate(1)',
    transition: 'filter 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
  },
};

export const LockScreen = forwardRef<MemoryDeckHandle, LockScreenProps>(
  ({ htmlContent, isLoading, isActive, revealPhase, sandboxSessionKey, highlightIds, onBack }, deckRef) => {
    return (
      <div className={`lock-screen${isActive ? ' lock-screen-active' : ' lock-screen-idle'}`}>
        <div className="lock-sandbox-wrap" style={FILTER_STYLES[revealPhase]}>
          <Sandbox key={sandboxSessionKey} htmlContent={htmlContent} />
        </div>

        <MemoryDeck ref={deckRef} cards={MEMORY_DECK} highlightIds={highlightIds} />

        {isActive && (
          <div className="lock-back-pill" onClick={onBack}>
            <span className="lock-back-brand">GLINT</span>
            <span className="lock-back-hint">{isLoading ? '生成中...' : '点击返回'}</span>
          </div>
        )}
      </div>
    );
  },
);

LockScreen.displayName = 'LockScreen';
```

- [ ] **Step 4: Update `App.tsx` to pass `highlightIds={[]}` and a ref stub**

Open `glint-app/App.tsx`. Make three changes — import the handle type, create a ref, pass `highlightIds` (always `[]` for now).

At the top of the imports section add:
```tsx
import { MemoryDeckHandle } from './components/MemoryDeck';
```

Inside the `App` component, immediately after the existing `abortRef` declaration (around line 67), add:
```tsx
const deckRef = useRef<MemoryDeckHandle>(null);
```

In the JSX return, find the `<LockScreen ... />` element and add two props: `ref={deckRef}` and `highlightIds={[]}`:

```tsx
<LockScreen
  ref={deckRef}
  htmlContent={htmlContent}
  isLoading={isLoading}
  isActive={screen === 'lockscreen'}
  revealPhase={revealPhase}
  sandboxSessionKey={sandboxSessionKey}
  highlightIds={[]}
  onBack={handleBack}
/>
```

- [ ] **Step 5: Verify it type-checks and the deck renders**

Run: `cd /Users/bytedance/Desktop/Coding/Glint/glint-app && npx tsc --noEmit`

Expected: zero new errors.

Then use Playwright MCP to open the dev server:
1. `mcp__plugin_playwright_playwright__browser_navigate` with `url: "http://localhost:5173"`
2. Tap any preset chip to enter the lockscreen view (the deck only mounts once `isActive`)
3. `mcp__plugin_playwright_playwright__browser_take_screenshot` and visually confirm: 8 dim glass cards stacked along the left edge, none lit up, not covering the hero content.

If the cards overlap the hero text or look too saturated, adjust `left`, `top`, `bottom`, `width` in the CSS — but preserve opacity 0.42 idle.

- [ ] **Step 6: Commit**

```bash
cd /Users/bytedance/Desktop/Coding/Glint
git add glint-app/components/MemoryDeck.tsx glint-app/components/LockScreen.tsx glint-app/App.tsx glint-app/index.html
git commit -m "$(cat <<'EOF'
feat(memory): mount MemoryDeck on LockScreen (static render)

MemoryDeck component renders eight glass cards down the left edge of
the lockscreen. No animation or highlight wiring yet; all cards idle.
The forwardRef handle exposes flyPhrases() as a stub implemented in
a later task.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Wire highlight state + inject memory phrases into the Gemini prompt

**Files:**
- Modify: `glint-app/App.tsx`

This task makes the deck visually react to presets AND makes the generated art reference the memory phrases. Still no fly-out animation (next task) — highlight is via CSS transition only.

- [ ] **Step 1: Add `highlightIds` state to `App.tsx`**

Open `glint-app/App.tsx`. After the existing `sandboxSessionKey` state declaration, add:

```tsx
const [highlightIds, setHighlightIds] = useState<string[]>([]);
```

- [ ] **Step 2: Extend `handleGenerate` to accept and use `usedMemoryIds`**

Change the `handleGenerate` signature and body. Add the import for `resolveCards` at the top:

```tsx
import { resolveCards } from './constants/memory';
```

Change the `handleGenerate` signature to accept a new 4th argument:

```tsx
const handleGenerate = useCallback(async (
  prompt: string,
  promptSource: PromptSource,
  prefabHtml?: string,
  usedMemoryIds?: string[],
) => {
```

At the very top of the `handleGenerate` body (before the existing `if (abortRef.current)` abort logic), resolve the cards and set highlight state:

```tsx
const litCards = usedMemoryIds && usedMemoryIds.length > 0 && !prefabHtml
  ? resolveCards(usedMemoryIds)
  : [];
setHighlightIds(litCards.map((c) => c.id));
```

- [ ] **Step 3: Inject the memory phrases into the prompt text before passing to Gemini**

Still inside `handleGenerate`, locate the line where the Gemini stream is kicked off:

```tsx
const stream = streamPageGeneration(prompt, promptSource, controller.signal);
```

Replace it with a version that augments the prompt when there are lit cards:

```tsx
const augmentedPrompt = litCards.length > 0
  ? `${prompt}\n\n[关于用户的记忆，请让这些事实自然地出现在画面里（hero 文案、AI 语音、数据标签都可以）: ${litCards.map((c) => c.phrase).join('、')}]`
  : prompt;

const stream = streamPageGeneration(augmentedPrompt, promptSource, controller.signal);
```

- [ ] **Step 4: Pass `usedMemoryIds` through `HomeScreen` to `handleGenerate`**

Open `glint-app/components/HomeScreen.tsx`. Update the `HomeScreenProps` interface and the preset click handler:

```tsx
import type { PromptSource } from '../services/geminiService';
import { PRESET_PROMPTS } from '../constants/prompts';

interface HomeScreenProps {
  onGenerate: (
    prompt: string,
    promptSource: PromptSource,
    prefabHtml?: string,
    usedMemoryIds?: string[],
  ) => void;
}
```

Change the preset click:

```tsx
<button
  key={i}
  className="home-chip"
  onClick={() => onGenerate(p.prompt, 'preset', p.prefabHtml, p.usedMemoryIds)}
>
  {p.label}
</button>
```

Custom text input (`handleSubmit`) does not pass `usedMemoryIds` — leave it as `onGenerate(input.trim(), 'custom')`. Custom prompts will still generate, just without a memory highlight.

- [ ] **Step 5: Pass `highlightIds` through to `LockScreen`**

Back in `glint-app/App.tsx`, in the JSX return, change `highlightIds={[]}` to:

```tsx
highlightIds={highlightIds}
```

Also clear the highlight when `handleBack` is called — add `setHighlightIds([])` inside `handleBack`.

- [ ] **Step 6: Verify end-to-end**

Start/reload the dev server. Via Playwright MCP:

1. Navigate to `http://localhost:5173`
2. Click the `07:00 · 枕边第一眼` preset chip
3. Screenshot: two specific cards (`sleep_late` and `coffee_morning`) should be visibly brighter than the others. The other six remain dim.
4. Wait ~10s for generation to finish (or the stream to progress)
5. Screenshot the final lockscreen
6. Inspect the screenshot text. The phrase "11:47" or "拿铁" should appear somewhere in the generated art (Gemini may phrase them slightly differently, but at least one of the two memory facts should visibly appear).

If neither phrase appears: the prompt augmentation may not be compelling enough. Tighten the Chinese instruction in step 3 — e.g. change `请让这些事实自然地出现在画面里` to `必须让这些事实出现在 hero 文案或 AI 语音里`. Re-run.

- [ ] **Step 7: Commit**

```bash
cd /Users/bytedance/Desktop/Coding/Glint
git add glint-app/App.tsx glint-app/components/HomeScreen.tsx
git commit -m "$(cat <<'EOF'
feat(memory): highlight cards and inject phrases into Gemini prompt

handleGenerate now resolves usedMemoryIds into MemoryCards, sets
highlight state on the deck, and augments the prompt with a bracketed
memory clause so the streaming output embeds the facts in the hero
text or AI voice. Custom input prompts are unaffected.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Fly-out animation + race with the Gemini call

**Files:**
- Modify: `glint-app/components/MemoryDeck.tsx`
- Modify: `glint-app/App.tsx`

This is the visual centerpiece. When `handleGenerate` fires, the lit cards' phrases physically fly into the center of the sandbox iframe, and at the same moment the streaming generation begins. The audience sees one continuous motion.

- [ ] **Step 1: Implement `flyPhrases` in `MemoryDeck.tsx`**

Replace the stub `useImperativeHandle` body with the real implementation:

```tsx
useImperativeHandle(ref, () => ({
  async flyPhrases(phrases, targetRect) {
    // For each (cardId, text) pair, create a transient <span> at the card's
    // current viewport position, animate it toward the target rect center,
    // then remove it. Run all animations in parallel and resolve when the
    // last one finishes.
    const animations = phrases.map(({ cardId, text }) => {
      const cardEl = cardRefs.current.get(cardId);
      if (!cardEl) return Promise.resolve();

      const cardRect = cardEl.getBoundingClientRect();
      const startX = cardRect.left + cardRect.width / 2;
      const startY = cardRect.top + cardRect.height / 2;
      const endX = targetRect.left + targetRect.width / 2;
      const endY = targetRect.top + targetRect.height / 2;

      const span = document.createElement('span');
      span.textContent = text;
      span.style.cssText = `
        position: fixed;
        left: ${startX}px;
        top: ${startY}px;
        transform: translate(-50%, -50%) scale(1);
        font-size: 13px;
        font-weight: 400;
        color: rgba(255, 240, 200, 0.95);
        text-shadow: 0 2px 16px rgba(255, 220, 150, 0.6);
        pointer-events: none;
        z-index: 100;
        white-space: nowrap;
        font-family: var(--font-display, -apple-system, sans-serif);
      `;
      document.body.appendChild(span);

      const dx = endX - startX;
      const dy = endY - startY;

      const anim = span.animate(
        [
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
          { transform: 'translate(-50%, -50%) scale(1.15)', opacity: 1, offset: 0.15 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.4)`, opacity: 1, offset: 0.75 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.6)`, opacity: 0 },
        ],
        { duration: 700, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)', fill: 'forwards' },
      );

      return anim.finished.then(
        () => span.remove(),
        () => span.remove(), // also clean up if the animation is cancelled
      );
    });

    await Promise.all(animations);
  },
}));
```

- [ ] **Step 2: Wire the race in `App.tsx`**

The key principle: **the Gemini call starts simultaneously with the fly-out animation**, not after it. Network TTFB and the 700ms animation overlap, so the total perceived latency is `max(TTFB, 700ms)` ≈ current TTFB.

Inside `handleGenerate`, after `setHighlightIds(...)` and before the existing `if (prefabHtml) { ... }` prefab branch, add the fly-out kickoff:

```tsx
// Fire-and-forget the fly-out animation in parallel with generation.
// We do not await it here — the streaming commit pipeline already hides
// the sandbox content behind the bridge until <body> opens, so the flying
// phrases land precisely as the real content paints in.
if (litCards.length > 0 && deckRef.current) {
  // The sandbox center rect is approximately the viewport center.
  const targetRect = new DOMRect(
    window.innerWidth * 0.25,
    window.innerHeight * 0.35,
    window.innerWidth * 0.5,
    window.innerHeight * 0.3,
  );
  void deckRef.current.flyPhrases(
    litCards.map((c) => ({ cardId: c.id, text: c.phrase })),
    targetRect,
  );
}
```

Place this block immediately after the `setHighlightIds(...)` line at the top of `handleGenerate`, BEFORE the existing `if (abortRef.current) { abortRef.current.abort(); }` logic. That way the animation starts at the absolute earliest moment after the click.

- [ ] **Step 3: Verify end-to-end on the web dev server**

Via Playwright MCP:
1. Reload `http://localhost:5173`
2. Click `07:00 · 枕边第一眼`
3. Take screenshot immediately (as fast as you can chain the calls)
4. Take screenshot after ~300ms
5. Take screenshot after ~700ms
6. Take screenshot after ~2s

Expected progression:
- Frame 1: two cards lit, small bright phrase spans near the left rail
- Frame 2: phrase spans mid-flight, approximately at 50% position
- Frame 3: spans near center, fading out; bridge or early generation content appearing
- Frame 4: full generated lockscreen with the phrases embedded in the output

If the spans are invisible: check that `pointer-events: none` isn't suppressing them (they shouldn't receive events, but they must render). Check z-index — they need to sit above the sandbox iframe.

If the animation fires but the generated art never references the phrases: this is a prompt-strength issue from Task 4, not this task. Skip fixing it here.

- [ ] **Step 4: Check first-paint latency has not regressed**

In the browser devtools console (via `mcp__plugin_playwright_playwright__browser_console_messages`), find the `[PERF] first_body_paint=` log line. Verify it is still under 1500ms (target is 800ms per CLAUDE.md but we allow headroom for warm-up). If it has regressed significantly from pre-change, the race is not actually racing — check that the animation kickoff is BEFORE the existing abort/controller setup.

- [ ] **Step 5: Commit**

```bash
cd /Users/bytedance/Desktop/Coding/Glint
git add glint-app/components/MemoryDeck.tsx glint-app/App.tsx
git commit -m "$(cat <<'EOF'
feat(memory): fly-out animation races Gemini streaming

MemoryDeck.flyPhrases creates transient DOM spans that animate from
each lit card's position to the sandbox center via Web Animations API
(700ms, cubic-bezier, opacity+scale+translate). Kickoff happens before
the abort/controller setup so the network request and the animation
run in parallel — perceived latency stays at TTFB, not TTFB+700ms.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Boot directly to lockscreen; HomeScreen becomes a bottom sheet

**Files:**
- Modify: `glint-app/App.tsx`
- Modify: `glint-app/components/HomeScreen.tsx`
- Modify: `glint-app/index.html`

- [ ] **Step 1: Change the initial `screen` state and boot an ambient generation**

In `App.tsx`, change:

```tsx
const [screen, setScreen] = useState<Screen>('home');
```

to:

```tsx
const [screen, setScreen] = useState<Screen>('lockscreen');
const [sheetOpen, setSheetOpen] = useState(false);
```

Add a `useEffect` after the `handleBack` definition that fires an ambient generation exactly once at mount, using a time-appropriate prompt derived from the real current hour:

```tsx
const didBootRef = useRef(false);
useEffect(() => {
  if (didBootRef.current) return;
  didBootRef.current = true;

  // Pick a narratively appropriate preset based on current hour.
  // This is cosmetic — any of the PRESET_PROMPTS would work; we just want
  // the first frame to feel "aware of right now".
  const hour = new Date().getHours();
  const pickLabel =
    hour < 9 ? '07:00 · 枕边第一眼' :
    hour < 12 ? '10:30 · 工作心流护航' :
    hour < 14 ? '12:10 · 午间喘息' :
    hour < 17 ? '15:00 · 下午提神' :
    hour < 20 ? '18:30 · 日落交接' :
    hour < 23 ? '19:30 · 今晚做点什么' :
                '23:00 · 今天的最后一页';

  const ambient = PRESET_PROMPTS.find((p) => p.label === pickLabel);
  if (ambient) {
    handleGenerate(ambient.prompt, 'preset', ambient.prefabHtml, ambient.usedMemoryIds);
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

Add the import:
```tsx
import { PRESET_PROMPTS } from './constants/prompts';
```

- [ ] **Step 2: Change `handleBack` to open the sheet instead of leaving lockscreen**

Replace the existing `handleBack` body with:

```tsx
const handleBack = useCallback(() => {
  setSheetOpen(true);
}, []);
```

The generation is no longer aborted on back — tapping back just reveals the preset picker on top of whatever is already on the lockscreen.

- [ ] **Step 3: Restructure the JSX return**

Replace the existing return block with:

```tsx
return (
  <div className="app-shell">
    <div className="app-layer app-layer-lock">
      <LockScreen
        ref={deckRef}
        htmlContent={htmlContent}
        isLoading={isLoading}
        isActive={true}
        revealPhase={revealPhase}
        sandboxSessionKey={sandboxSessionKey}
        highlightIds={highlightIds}
        onBack={handleBack}
      />
    </div>

    {sheetOpen && (
      <div className="app-layer app-sheet" onClick={() => setSheetOpen(false)}>
        <div className="app-sheet-panel" onClick={(e) => e.stopPropagation()}>
          <HomeScreen
            onGenerate={(prompt, source, prefabHtml, usedMemoryIds) => {
              setSheetOpen(false);
              handleGenerate(prompt, source, prefabHtml, usedMemoryIds);
            }}
          />
        </div>
      </div>
    )}
  </div>
);
```

Note: `isActive={true}` is now hard-coded because we no longer navigate away from the lockscreen.

- [ ] **Step 4: Add bottom-sheet CSS to `glint-app/index.html`**

Append to the same `<style>` block where the MemoryDeck CSS was added in Task 3:

```css
/* === Bottom sheet === */
.app-sheet {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: flex-end;
  animation: sheet-fade 220ms ease both;
}
.app-sheet-panel {
  width: 100%;
  max-height: 80%;
  background: rgba(20, 20, 24, 0.92);
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  padding: 24px 20px 32px;
  animation: sheet-rise 260ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
}
@keyframes sheet-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes sheet-rise {
  from { transform: translateY(60%); }
  to { transform: translateY(0); }
}
```

- [ ] **Step 5: Verify boot + sheet flow**

Via Playwright MCP:
1. Hard-refresh `http://localhost:5173`
2. Screenshot within 800ms of load — expect the lockscreen already streaming an ambient scene (dim at first, sharpening). Do NOT expect to see the HomeScreen brand/chips.
3. Click the back pill (top of screen, labeled `GLINT`)
4. Screenshot — the bottom sheet should rise with the preset chips visible
5. Click a preset chip
6. Screenshot — sheet closes, new generation fires on the same lockscreen surface, memory cards light up, phrases fly

If the boot generation does not fire: check the `useEffect` dependency array — it must be `[]` and the guard `didBootRef` must be used (React 19 StrictMode double-invokes effects in dev).

- [ ] **Step 6: Commit**

```bash
cd /Users/bytedance/Desktop/Coding/Glint
git add glint-app/App.tsx glint-app/components/HomeScreen.tsx glint-app/index.html
git commit -m "$(cat <<'EOF'
feat(boot): boot directly to lockscreen with ambient generation

App now starts on the lockscreen view and fires a time-appropriate
preset at mount, so the first frame the audience sees is already a
streaming generation — not a menu. The back pill now raises a bottom
sheet containing the preset picker instead of unmounting the lockscreen.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Scripted mid-stream reversal for the flight-delay preset

**Files:**
- Modify: `glint-app/App.tsx`
- Create: `glint-app/constants/flightDelta.ts`

This is the hero截图时刻 of the demo and the riskiest task — the visual mid-stream replacement must not flicker on real hardware. The approach is deliberately minimal: abort the in-flight Gemini stream at ~5s and push a pre-written complete HTML document through `setHtmlContent`. The existing sandbox double-buffer crossfade handles the visual transition with no protocol changes.

- [ ] **Step 1: Spike — prove the sandbox accepts a replacement mid-stream**

Before writing the real flight delta HTML, verify the mechanism works end-to-end with a throwaway test. Temporarily edit `handleGenerate` in `App.tsx`:

After the `try { ... }` block's opening stream kickoff line, insert:

```tsx
// SPIKE — remove after verification
if (promptSource === 'preset' && prompt.includes('航班延误')) {
  setTimeout(() => {
    if (controller.signal.aborted) return;
    controller.abort();
    setHtmlContent('<!doctype html><html><head><meta name="color-scheme" content="dark"></head><body style="background:#400;color:#fff;display:flex;align-items:center;justify-content:center;width:100vw;height:100vh;font-family:sans-serif;font-size:80px">DELTA</body></html>');
  }, 3000);
}
```

Via Playwright MCP:
1. Reload the app
2. Open the sheet, tap `⚡ 航班延误`
3. Watch the lockscreen for 4 seconds
4. Screenshot at t=2s (should show partial radar generation)
5. Screenshot at t=4s (should show the red "DELTA" test screen with a visible crossfade, no hard flicker)

If the transition is smooth: the mechanism works. **Remove the spike code before proceeding to Step 2.**

If the transition flickers hard: investigate `Sandbox.tsx` — it may need to force the crossfade. Add a `revealPhase` nudge (`setRevealPhase('blurred')` then `setRevealPhase('revealing')`) around the `setHtmlContent` call in the spike. If it still flickers on real Android in Task 8, this is a known risk flagged in the spec.

- [ ] **Step 2: Create `glint-app/constants/flightDelta.ts` with the real delta HTML**

```ts
/**
 * Scripted "AI changes its mind mid-stream" HTML for the flight-delay preset.
 * This is pushed into the sandbox ~5 seconds after the flight preset is
 * triggered, via App.tsx setHtmlContent. The existing double-buffer crossfade
 * handles the visual transition.
 *
 * Design notes:
 *   - Must be a complete <!doctype html> document with a <body> (Sandbox
 *     extracts body content via regex).
 *   - Must reference the memory phrases "常飞北京-上海" and "每次都住全季"
 *     so the "AI remembers him" narrative lands with the reversal.
 *   - Color scheme: dark (matches the flight preset's default radar aesthetic).
 */
export const FLIGHT_DELAY_DELTA_HTML = `<!doctype html><html><head><meta name="color-scheme" content="dark"><style>
@keyframes pulse-red{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes slide-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes scan{from{top:-5%}to{top:105%}}
@keyframes type-in{from{width:0}to{width:100%}}
</style></head>
<body style="margin:0;overflow:hidden;width:100vw;height:100vh;background:#1a0608;font-family:var(--font-mono,monospace);color:rgba(255,255,255,0.9)">
  <div style="position:absolute;inset:0;background:linear-gradient(rgba(255,60,40,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,60,40,0.04) 1px,transparent 1px);background-size:20% 20%"></div>
  <div style="position:absolute;left:0;right:0;height:2px;background:linear-gradient(to right,transparent,rgba(255,80,60,0.25),transparent);animation:scan 3s linear infinite"></div>
  <svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 390 844">
    <path d="M320,200 Q195,420 90,700" fill="none" stroke="rgba(255,80,60,0.55)" stroke-width="2" stroke-dasharray="8 6"/>
    <circle cx="320" cy="200" r="6" fill="rgba(255,80,60,0.95)"><animate attributeName="opacity" values="1;.4;1" dur="1.4s" repeatCount="indefinite"/></circle>
    <circle cx="90" cy="700" r="6" fill="rgba(255,180,50,0.9)"/>
  </svg>
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;padding:7% 6% 7%">
    <div style="display:inline-flex;align-items:center;gap:10px;background:rgba(255,60,40,0.18);border:1px solid rgba(255,80,60,0.4);border-radius:14px;padding:10px 18px;width:fit-content;animation:pulse-red 2s ease infinite">
      <div style="width:10px;height:10px;border-radius:50%;background:#ff3b30"></div>
      <span style="font-size:16px;color:rgba(255,200,190,0.95);font-weight:500;letter-spacing:1px">延误 55 分钟</span>
    </div>
    <div style="font-size:clamp(72px,26vw,150px);font-weight:200;color:rgba(255,255,255,0.95);letter-spacing:-4px;line-height:.85;margin-top:12px;animation:slide-up .8s ease both">CA1502</div>
    <div style="font-size:14px;color:rgba(255,180,150,0.65);letter-spacing:2px;margin-top:6px;animation:slide-up .8s ease .1s both">新登机口 B23 · 步行 12 分钟</div>
    <div style="font-size:24px;font-weight:300;color:rgba(255,240,230,0.9);line-height:1.55;margin-top:28px;animation:slide-up .9s ease .25s both">
      刚收到延误通知，<br>我重新算了一遍。
    </div>
    <div style="margin-top:auto;background:rgba(255,255,255,0.04);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-radius:16px;padding:18px 20px;border:1px solid rgba(255,100,80,0.15);flex-shrink:0;animation:slide-up 1s ease .4s both">
      <div style="font-size:14px;color:rgba(255,200,180,0.55);letter-spacing:1.5px;margin-bottom:8px">我知道你常飞北京-上海</div>
      <div style="font-size:16px;color:rgba(255,255,255,0.85);line-height:1.6">
        <div style="display:flex;justify-content:space-between"><span>🏨 全季酒店已延后入住</span><span style="color:rgba(255,255,255,0.4)">自动</span></div>
        <div style="display:flex;justify-content:space-between;margin-top:4px"><span>🚕 网约车 18:45 出发</span><span style="color:rgba(255,255,255,0.4)">已预约</span></div>
      </div>
    </div>
    <div style="text-align:center;margin-top:14px;flex-shrink:0;font-size:12px;color:rgba(255,100,80,0.3);letter-spacing:4px">GLINT · DELAY</div>
  </div>
</body></html>`;
```

- [ ] **Step 3: Wire the real delta into `handleGenerate`**

At the top of `App.tsx`, add the import:

```tsx
import { FLIGHT_DELAY_DELTA_HTML } from './constants/flightDelta';
```

Inside `handleGenerate`, after the existing `setIsLoading(true)` call but BEFORE the main `try { ... }` block that starts the stream, add the scheduled reversal (remove the Step 1 spike if you haven't already):

```tsx
// Scripted mid-stream reversal for the flight-delay preset.
// Fires ~5.2s after generation starts, aborts the live stream, and pushes a
// pre-written "AI changed its mind" HTML through the sandbox crossfade.
let flightReversalTimer: ReturnType<typeof setTimeout> | null = null;
if (promptSource === 'preset' && prompt.includes('航班延误')) {
  flightReversalTimer = setTimeout(() => {
    if (controller.signal.aborted) return;
    console.log('[DEMO] flight reversal injected');
    controller.abort();
    setRevealPhase('blurred');
    setHtmlContent(FLIGHT_DELAY_DELTA_HTML);
    // Kick the deck to re-highlight the same cards so the phrases feel
    // "reinforced" on the second phase.
    setHighlightIds(['flight_regular', 'hotel_preference']);
    setTimeout(() => {
      setRevealPhase('revealing');
      setTimeout(() => setRevealPhase('idle'), 700);
    }, 50);
    setIsLoading(false);
  }, 5200);
}
```

Also add a cleanup so the timer is cancelled if generation completes early OR the user aborts manually. At the end of `handleGenerate`'s existing `finally` block, add:

```tsx
if (flightReversalTimer) {
  clearTimeout(flightReversalTimer);
}
```

- [ ] **Step 4: Verify on web**

Via Playwright MCP:
1. Reload
2. Open sheet, tap `⚡ 航班延误`
3. Screenshot at t=2s — partial radar, green flight arc, CA1502 forming
4. Screenshot at t=6s — fully replaced: red radar, "延误 55 分钟" badge, "刚收到延误通知" voice line, the full delta HTML visible
5. The two flight memory cards should be lit in both phases

If the transition flickers (black frame or layout jump): the spike should have caught this. Investigate by enabling a forced `blurred → revealing` transition (already done in the code above via `setRevealPhase`).

- [ ] **Step 5: Verify on Android device**

This task is the one with device-specific risk. Build and install the APK:

```bash
cd /Users/bytedance/Desktop/Coding/Glint/glint-app && npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.glint.demo/.MainActivity  # adjust package name if different — check android/app/build.gradle
```

Manually on the device: open the sheet, tap `⚡ 航班延误`, watch for the reversal. Record the screen (`adb shell screenrecord /sdcard/flight_reversal.mp4`) for 10s and pull it back with `adb pull`. Review the frame-by-frame. If the transition is visible and smooth, the task is complete.

If the device shows a hard flicker or black frame that isn't in the web version: this is the risk flagged in the spec. Mitigation options, in order of preference:
1. Increase the `revealPhase: 'blurred'` hold time from 50ms to 150ms.
2. Pre-warm the back buffer by sending a dummy `CONTENT_UPDATE` a few ms before the real one (requires a small tweak in `Sandbox.tsx`).
3. As a last resort, swap to two stacked iframes and toggle z-index instead of using the double-buffer inside one iframe.

Document any workaround applied in the commit message so the rationale is preserved.

- [ ] **Step 6: Commit**

```bash
cd /Users/bytedance/Desktop/Coding/Glint
git add glint-app/App.tsx glint-app/constants/flightDelta.ts
git commit -m "$(cat <<'EOF'
feat(demo): scripted mid-stream reversal for flight-delay preset

At ~5.2s into the flight-delay generation, abort the live Gemini
stream and push a pre-written delta HTML through the sandbox
crossfade. Visually this is "AI changed its mind mid-draw" — the
green radar becomes a red delay card with delta-specific memory
phrases reinforced. Runs entirely through the existing double-buffer
crossfade primitive; no protocol changes.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Polish pass + full demo script rehearsal

**Files:**
- Modify: various, as needed.

This task has no prescriptive code. It is a review pass guided by the 90-second demo script from the spec. The goal is to walk through the entire script on real hardware, identify anything that feels wrong, and fix it inline. Then capture a final clip.

- [ ] **Step 1: Rehearse the full demo script on the web dev server**

Using Playwright MCP, execute every step of the demo script from the spec:

```
0:00  App opens → ambient generation streams. MemoryDeck visible with ~8 cards.
0:06  Tap back pill → sheet slides up with preset chips.
0:10  Tap "⚡ 航班延误".
0:12  Two memory cards light up; phrases fly into canvas.
0:15  Streaming begins.
0:30  Flight reversal injects.
0:45  Rest on the final delta frame.
1:00  Tap back → sheet → tap "23:00 · 今天的最后一页".
1:02  Different cards light up; fly-in.
1:20  Night lockscreen rests.
1:30  End.
```

Take one screenshot at each timestamp. Build a visual contact sheet for your own review (or just step through them). For each moment, ask: **does this look like a stunning demo, or does it look like software with features?**

- [ ] **Step 2: Fix three things that feel off**

You will find at least three things that feel off. Common issues and their fixes:

| Symptom | Likely fix |
|---|---|
| Cards are too bright idle, competing with hero | Lower idle opacity from 0.42 to 0.32 |
| Cards are too dim lit, viewer can't see highlight | Raise lit opacity from 0.92 to 1.0 and add subtle amber glow |
| Fly-out spans are hard to read against dark bg | Strengthen `text-shadow` on the transient span in `flyPhrases` |
| Fly-out ends too abruptly | Extend duration from 700ms to 900ms and soften the easing |
| Sheet obscures the lockscreen on back-tap | Reduce sheet `background` alpha from 0.45 to 0.30 |
| Flight reversal transition has a micro-flicker | Extend `blurred` hold time from 50ms to 150ms |

Fix at least three things. Do not add new features.

- [ ] **Step 3: Capture the final 90-second clip on a real Android device**

```bash
adb shell screenrecord --time-limit=95 /sdcard/glint_demo.mp4
# Perform the full demo script on the device
adb pull /sdcard/glint_demo.mp4 ~/Desktop/glint_demo_final.mp4
```

Watch it. If it looks stunning, you're done. If not, go back to Step 2.

- [ ] **Step 4: Commit the polish**

```bash
cd /Users/bytedance/Desktop/Coding/Glint
git add -u
git commit -m "$(cat <<'EOF'
polish(demo): tune visuals after end-to-end rehearsal

Adjusts card opacities, fly-out easing, sheet overlay, and mid-stream
blur hold time based on a full 90-second demo script rehearsal on a
real Android device.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Update the progress log**

Append an entry to `harness/claude-progress.md` at the TOP of the "Entries below" section (newest first), following the template at the top of the file. Feature id: `visible-memory-cards-demo`. Include: the mid-stream reversal verification result on real hardware, any workarounds applied, and a note about which presets have `usedMemoryIds` wired.

---

## Success criteria (from the spec)

- [ ] An outside viewer watching a silent 30-second screen recording can state, unprompted, that the phone "remembers things" and those things "influenced the image."
- [ ] The flight-delay mid-stream reversal produces a shareable ≤5s gif/clip.
- [ ] The 90-second demo script runs end-to-end on real hardware without a manual reset.
- [ ] First paint (app icon tap → first visible generated frame at boot) ≤ 800ms.
- [ ] All 13 presets in `prompts.ts` continue to work — no regression in the 8 presets without `usedMemoryIds`.
