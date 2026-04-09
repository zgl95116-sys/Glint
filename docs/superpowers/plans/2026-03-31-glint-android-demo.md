# Glint Android Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Flash-Lite Browser into an Android APK that demos AI-generated lockscreens — full-screen, real-time streaming, no traditional lockscreen chrome.

**Architecture:** Rewrite the App shell (HomeScreen + LockScreen replacing browser UI), simplify Sandbox (strip navigation/form APIs), replace system prompt for lockscreen generation, wrap with Capacitor for Android.

**Tech Stack:** React 19, TypeScript, Vite, @google/genai, Capacitor, Tailwind CSS (CDN)

**Spec:** `docs/superpowers/specs/2026-03-30-glint-android-demo-design.md`

---

### Task 1: Project Setup — Copy and Clean

**Files:**
- Copy from: `flash-lite-browser/*`
- Create: `glint-app/` (new project directory)
- Delete: `glint-app/components/OuterFrame.tsx`, `glint-app/components/BrowserShell.tsx`, `glint-app/components/AddressBar.tsx`, `glint-app/components/NewTab.tsx`, `glint-app/utils/urlHelpers.ts`

- [ ] **Step 1: Copy flash-lite-browser to glint-app**

```bash
cp -r flash-lite-browser glint-app
```

- [ ] **Step 2: Delete browser-specific files**

```bash
rm glint-app/components/OuterFrame.tsx
rm glint-app/components/BrowserShell.tsx
rm glint-app/components/AddressBar.tsx
rm glint-app/components/NewTab.tsx
rm glint-app/utils/urlHelpers.ts
rm -rf glint-app/utils  # directory now empty
```

- [ ] **Step 3: Create .env.local with API key**

Create `glint-app/.env.local`:
```
GEMINI_API_KEY=AIzaSyC3kWLeCJDvv_4vG8x2qhFFzks6-kZF5i0
```

- [ ] **Step 4: Install dependencies and verify build**

```bash
cd glint-app && npm install && npm run build
```

Expected: Build will fail (missing imports in App.tsx). That's fine — we'll rewrite it next.

- [ ] **Step 5: Commit**

```bash
git add glint-app/
git commit -m "chore: scaffold glint-app from flash-lite-browser, remove browser UI files"
```

---

### Task 2: Preset Prompts Constant

**Files:**
- Create: `glint-app/constants/prompts.ts`

- [ ] **Step 1: Create constants directory and prompts file**

Create `glint-app/constants/prompts.ts`:
```typescript
export interface PresetPrompt {
  label: string;
  prompt: string;
}

export const PRESET_PROMPTS: PresetPrompt[] = [
  {
    label: '早晨 · 日出与今日计划',
    prompt: 'A sunrise morning lockscreen. Show the current time prominently, a beautiful dawn gradient sky with subtle cloud SVGs, today\'s date, a warm greeting, weather info (22°C, sunny), and 2-3 upcoming schedule items. Calm, fresh, optimistic mood.',
  },
  {
    label: '雨天 · 窗外的雨和一杯咖啡',
    prompt: 'A rainy day lockscreen. Cool blue-grey palette with animated-feeling rain streaks (CSS), a cozy coffee cup illustration via SVG, current time in a soft serif font, a short poetic line about rain, and maybe today\'s reading recommendation. Warm and introspective mood.',
  },
  {
    label: '深夜 · 星空与今日回顾',
    prompt: 'A late night lockscreen under a starry sky. Deep navy/purple gradient with small star dots (CSS), the time in thin elegant font, a "today in review" section with 2-3 highlights, tomorrow\'s first event as a gentle reminder. Peaceful, reflective mood.',
  },
  {
    label: '科技资讯 · 今日 AI 大事件',
    prompt: 'A tech news lockscreen. Dark futuristic design with accent colors (cyan/electric blue), bold headline typography, 3-4 fictional but realistic AI news headlines with one-line summaries, current time, a "trending" indicator. Sharp, information-dense, editorial feel.',
  },
  {
    label: '春节 · 红色喜庆倒计时',
    prompt: 'A Chinese New Year celebration lockscreen. Rich red and gold palette, decorative SVG patterns (lanterns, fireworks, cloud motifs), a large countdown or greeting text, the time in a decorative font, a short blessing phrase. Festive, joyous, culturally rich.',
  },
  {
    label: '音乐 · 正在听的歌词可视化',
    prompt: 'A music visualization lockscreen. Abstract sound wave patterns via CSS/SVG, a fictional song title and artist prominently displayed, 2-3 lines of lyrics floating on screen, album-art-like gradient background, the time subtly placed. Immersive, artistic, rhythmic.',
  },
  {
    label: '极简 · 只有时间和一句诗',
    prompt: 'An ultra-minimal lockscreen. Almost entirely blank with a single elegant background color or very subtle gradient. Only two elements: the current time in a beautiful typeface (large, centered), and one short poetic line below it. Nothing else. Maximum whitespace. Zen-like calm.',
  },
  {
    label: '赛博朋克 · 霓虹信息矩阵',
    prompt: 'A cyberpunk lockscreen. Black background with neon magenta/cyan/yellow accents, glitch-style text effects via CSS, a matrix of fictional data readouts (battery, network, location coordinates, system status), the time in a monospace font, scan-line overlay effect. High-tech, edgy, dense.',
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add glint-app/constants/
git commit -m "feat: add preset lockscreen prompt definitions"
```

---

### Task 3: Rewrite System Prompt for Lockscreen

**Files:**
- Modify: `glint-app/services/geminiService.ts`

- [ ] **Step 1: Replace SYSTEM_PROMPT**

Replace the entire `SYSTEM_PROMPT` constant in `geminiService.ts` with:

```typescript
const SYSTEM_PROMPT = `
You are an AI lockscreen designer. You generate stunning, full-screen mobile lockscreen interfaces as HTML documents.

CRITICAL CONSTRAINTS:
- The entire design MUST fit in exactly one viewport: 100vw × 100vh. Set html and body to width:100vw; height:100vh; overflow:hidden; margin:0; padding:0.
- NEVER generate scrollable content. Everything must be visible at once.
- This is a LOCKSCREEN, not a website. No navigation bars, no links, no forms, no footers, no sidebars, no buttons, no menus.

STRUCTURE:
Return a full HTML document:

<html>
<head>
  <title>Glint Lockscreen</title>
  <meta name="color-scheme" content="dark">
  <link href="https://fonts.googleapis.com/css2?family=ChosenFont:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Chosen Font', sans-serif; width: 100vw; height: 100vh; overflow: hidden; margin: 0; padding: 0;">
  ...lockscreen content...
</body>
</html>

Keep <head> minimal: <title>, <meta name="color-scheme">, and one Google Fonts <link>.
Set color-scheme to "light" or "dark" — choose what fits the mood.

STYLING:
Use Tailwind CSS utility classes. Create visually striking, emotionally evocative designs.
Use a Google Font that matches the mood. Each lockscreen should feel typographically distinct.
For icons: <span class="material-symbols-outlined">icon_name</span>.
Use emojis, CSS gradients, radial gradients, inline SVGs, and CSS art generously.
No external images — everything must be CSS, SVG, or emoji.

DESIGN PHILOSOPHY:
You are creating a VISUAL EXPERIENCE, not an information display. Think of each lockscreen as:
- A poster, not a dashboard
- A mood, not a layout
- An art piece that also carries information

EVERY generation must have a COMPLETELY DIFFERENT visual style. Vary:
- Typography scale and weight (thin 100 to black 900, 12px to 120px)
- Color palette (monochrome, complementary, analogous, neon, pastel, earth tones)
- Layout approach (centered, asymmetric, edge-to-edge, diagonal, layered)
- Visual density (ultra-minimal to information-rich)
- Artistic direction (Swiss design, Japanese minimalism, cyberpunk, editorial, organic, geometric)

CONTENT:
Fill with rich, plausible, creative content that matches the prompt.
Include the current time prominently (use a realistic time like 9:41 or 22:30).
Make it feel alive — this screen exists for THIS moment.
`;
```

- [ ] **Step 2: Simplify the streamPageGeneration function**

Remove the following from the `streamPageGeneration` function:
- The `formState` parameter and all form state handling
- The `isGrounded` references (grounding/search feature)
- The grounding tools config, grounding metadata extraction
- The `isMobile` parameter (we're always mobile now)

Replace the function signature and body. The simplified function:

```typescript
export async function* streamPageGeneration(
  prompt: string,
  abortSignal?: AbortSignal,
): AsyncGenerator<string> {
  const userPrompt = `
Generate a lockscreen based on this description:
"${prompt}"

Create a complete, visually stunning, full-screen lockscreen. Remember: 100vw × 100vh, no scroll, no web UI elements. This is art that informs.

IMPORTANT: Design for a MOBILE phone screen (portrait, narrow viewport). Use a single-column layout. Keep text readable at phone scale.
`;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        ...(abortSignal ? { abortSignal } : {}),
      },
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error('Gemini Stream Error:', error);
    yield `<div style="display:flex;align-items:center;justify-content:center;width:100vw;height:100vh;background:#111;color:#fff;font-family:sans-serif;"><p>Generation failed. Please try again.</p></div>`;
  }
}
```

- [ ] **Step 3: Remove unused imports and exports**

Remove the `TokenCount` import/type usage, `GenerationResult` interface, and `GroundingSource`-related code from the file. Keep only:

```typescript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-3.1-flash-lite-preview';
```

- [ ] **Step 4: Commit**

```bash
git add glint-app/services/geminiService.ts
git commit -m "feat: rewrite system prompt and simplify geminiService for lockscreen generation"
```

---

### Task 4: Simplify Sandbox Component

**Files:**
- Modify: `glint-app/components/Sandbox.tsx`

- [ ] **Step 1: Rewrite Sandbox.tsx**

Strip out navigation and action APIs, keep only content rendering. Replace `glint-app/components/Sandbox.tsx` with:

```typescript
import React, { useRef, useEffect } from 'react';

interface SandboxProps {
  htmlContent: string;
}

const SHELL_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; script-src 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: blob:; connect-src 'none'; frame-src 'none';">
    <script src="https://cdn.tailwindcss.com"><\/script>
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
    <style>
      html, body { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; }
      body { -webkit-font-smoothing: antialiased; }
      .material-symbols-outlined,
      .material-icons {
        font-family: 'Material Symbols Outlined';
        font-weight: normal;
        font-style: normal;
        font-size: 24px;
        line-height: 1;
        display: inline-block;
        white-space: nowrap;
        direction: ltr;
        -webkit-font-smoothing: antialiased;
        font-feature-settings: 'liga';
      }
    </style>
    <script>
      window.addEventListener('message', (e) => {
        if (e.data?.type === 'CONTENT_UPDATE') {
          document.body.innerHTML = e.data.html;
          document.body.className = e.data.bodyClasses || '';
          document.body.setAttribute('style', e.data.bodyStyle || '');
          document.documentElement.style.colorScheme = e.data.colorScheme || 'dark';
          // Inject Google Fonts links
          document.head.querySelectorAll('link[data-glint-font]').forEach(el => el.remove());
          (e.data.linkTags || []).forEach(href => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.setAttribute('data-glint-font', 'true');
            document.head.appendChild(link);
          });
        }
      });
      window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');
    <\/script>
  </head>
  <body style="background: #000; width: 100vw; height: 100vh; overflow: hidden; margin: 0;"></body>
</html>`;

export const Sandbox: React.FC<SandboxProps> = ({ htmlContent }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeReadyRef = useRef(false);
  const pendingContentRef = useRef<any>(null);

  const sendContentUpdate = (message: any) => {
    if (iframeReadyRef.current && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, '*');
    } else {
      pendingContentRef.current = message;
    }
  };

  // Stream content updates
  useEffect(() => {
    if (!htmlContent) return;

    const isDark = /<meta\s+name=["']color-scheme["']\s+content=["']dark["']/i.test(htmlContent);

    // Extract Google Fonts links
    const headMatch = htmlContent.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const fontHrefs: string[] = [];
    if (headMatch) {
      const linkMatches = headMatch[1].match(/<link[^>]*>/gi);
      if (linkMatches) {
        linkMatches.forEach(tag => {
          const hrefMatch = tag.match(/href="([^"]+)"/i) || tag.match(/href='([^']+)'/i);
          if (hrefMatch && hrefMatch[1].startsWith('https://fonts.googleapis.com/')) {
            fontHrefs.push(hrefMatch[1]);
          }
        });
      }
    }

    // Extract body attributes
    const bodyClassMatch = htmlContent.match(/<body[^>]*class="([^"]*)"/i);
    const bodyClasses = bodyClassMatch ? bodyClassMatch[1] : '';
    const bodyStyleMatch = htmlContent.match(/<body[^>]*style="([^"]*)"/i);
    const bodyInlineStyle = bodyStyleMatch ? bodyStyleMatch[1] : '';

    // Extract body content
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const cleanContent = bodyMatch
      ? bodyMatch[1]
      : htmlContent.replace(/<\/?html[^>]*>/gi, '').replace(/<head>[\s\S]*?<\/head>/gi, '').replace(/<\/?body[^>]*>/gi, '');

    sendContentUpdate({
      type: 'CONTENT_UPDATE',
      html: cleanContent,
      bodyClasses,
      bodyStyle: `width:100vw;height:100vh;overflow:hidden;margin:0;padding:0;background:${isDark ? '#000' : '#fff'};color:${isDark ? '#e8eaed' : '#1a1a1a'};${bodyInlineStyle}`,
      colorScheme: isDark ? 'dark' : 'light',
      linkTags: fontHrefs,
    });

    if (iframeRef.current) {
      iframeRef.current.style.background = isDark ? '#000' : '#fff';
    }
  }, [htmlContent]);

  // Handle sandbox ready message
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === 'SANDBOX_READY') {
        iframeReadyRef.current = true;
        if (pendingContentRef.current) {
          iframeRef.current?.contentWindow?.postMessage(pendingContentRef.current, '*');
          pendingContentRef.current = null;
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      style={{ width: '100vw', height: '100vh', border: 'none', display: 'block' }}
      srcDoc={SHELL_HTML}
      sandbox="allow-scripts"
    />
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add glint-app/components/Sandbox.tsx
git commit -m "feat: simplify Sandbox for lockscreen-only rendering, strip navigation/action APIs"
```

---

### Task 5: Create HomeScreen Component

**Files:**
- Create: `glint-app/components/HomeScreen.tsx`

- [ ] **Step 1: Create HomeScreen.tsx**

Create `glint-app/components/HomeScreen.tsx`:

```typescript
import React, { useState } from 'react';
import { PRESET_PROMPTS } from '../constants/prompts';

interface HomeScreenProps {
  onGenerate: (prompt: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onGenerate }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onGenerate(input.trim());
      setInput('');
    }
  };

  return (
    <div className="home-screen">
      <div className="home-brand">GLINT</div>
      <div className="home-title">你希望此刻的<br />屏幕是什么样？</div>

      <div className="home-chips">
        {PRESET_PROMPTS.map((p, i) => (
          <button
            key={i}
            className="home-chip"
            onClick={() => onGenerate(p.prompt)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <form className="home-input-bar" onSubmit={handleSubmit}>
        <input
          className="home-input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="或者，描述你想看到的..."
        />
        <button className="home-submit" type="submit">
          <span>✦</span>
        </button>
      </form>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add glint-app/components/HomeScreen.tsx
git commit -m "feat: create HomeScreen component with preset prompts and free input"
```

---

### Task 6: Create LockScreen Component

**Files:**
- Create: `glint-app/components/LockScreen.tsx`

- [ ] **Step 1: Create LockScreen.tsx**

Create `glint-app/components/LockScreen.tsx`:

```typescript
import React from 'react';
import { Sandbox } from './Sandbox';

interface LockScreenProps {
  htmlContent: string;
  isLoading: boolean;
  onBack: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ htmlContent, isLoading, onBack }) => {
  return (
    <div className="lock-screen">
      {/* AI generated content — full screen */}
      <Sandbox htmlContent={htmlContent} />

      {/* Minimal overlay — back pill */}
      <div className="lock-back-pill" onClick={onBack}>
        <span className="lock-back-brand">GLINT</span>
        <span className="lock-back-hint">{isLoading ? '生成中...' : '点击返回'}</span>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add glint-app/components/LockScreen.tsx
git commit -m "feat: create LockScreen component with full-screen sandbox and back pill"
```

---

### Task 7: Rewrite App.tsx

**Files:**
- Modify: `glint-app/App.tsx`

- [ ] **Step 1: Rewrite App.tsx**

Replace `glint-app/App.tsx` entirely:

```typescript
import React, { useState, useCallback, useRef } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { LockScreen } from './components/LockScreen';
import { streamPageGeneration } from './services/geminiService';

type Screen = 'home' | 'lockscreen';

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('home');
  const [htmlContent, setHtmlContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = useCallback(async (prompt: string) => {
    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setScreen('lockscreen');
    setIsLoading(true);
    setHtmlContent('');

    let fullHtml = '';

    try {
      const stream = streamPageGeneration(prompt, controller.signal);

      for await (const chunk of stream) {
        if (controller.signal.aborted) break;
        fullHtml += chunk;
        setHtmlContent(fullHtml);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError' || controller.signal.aborted) return;
      console.error('Generation failed', e);
    } finally {
      if (abortRef.current === controller) {
        setIsLoading(false);
        abortRef.current = null;
      }
    }
  }, []);

  const handleBack = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setScreen('home');
    setIsLoading(false);
    setHtmlContent('');
  }, []);

  return screen === 'home' ? (
    <HomeScreen onGenerate={handleGenerate} />
  ) : (
    <LockScreen
      htmlContent={htmlContent}
      isLoading={isLoading}
      onBack={handleBack}
    />
  );
};

export default App;
```

- [ ] **Step 2: Commit**

```bash
git add glint-app/App.tsx
git commit -m "feat: rewrite App.tsx with HomeScreen/LockScreen state routing"
```

---

### Task 8: Rewrite Styles and HTML Entry

**Files:**
- Modify: `glint-app/index.css`
- Modify: `glint-app/index.html`
- Delete: `glint-app/types.ts` (no longer needed)
- Delete: `glint-app/metadata.json`
- Delete: `glint-app/README.md`

- [ ] **Step 1: Replace index.css**

Replace `glint-app/index.css` entirely with lockscreen-app styles:

```css
/* Glint — AI Lockscreen Demo */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
  font-family: -apple-system, 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ==========================================
   HOME SCREEN
   ========================================== */

.home-screen {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: #fff;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(80, 50, 150, 0.3) 0%, transparent 60%),
    radial-gradient(ellipse at 70% 80%, rgba(40, 80, 160, 0.2) 0%, transparent 50%),
    #080810;
  overflow: hidden;
}

.home-brand {
  padding: 60px 28px 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 3px;
  color: rgba(255, 255, 255, 0.25);
  text-transform: uppercase;
  flex-shrink: 0;
}

.home-title {
  padding: 24px 28px 0;
  font-size: 28px;
  font-weight: 300;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.85);
  flex-shrink: 0;
}

.home-chips {
  flex: 1;
  padding: 32px 28px 0;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-content: flex-start;
  -webkit-overflow-scrolling: touch;
}

.home-chips::-webkit-scrollbar {
  display: none;
}

.home-chip {
  padding: 10px 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  font-family: inherit;
  line-height: 1.4;
}

.home-chip:active {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.25);
}

.home-input-bar {
  padding: 16px 28px 40px;
  flex-shrink: 0;
  display: flex;
  gap: 12px;
  align-items: center;
}

.home-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 28px;
  padding: 14px 20px;
  font-size: 15px;
  color: #fff;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.home-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.home-input:focus {
  border-color: rgba(255, 255, 255, 0.3);
}

.home-submit {
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.2s;
}

.home-submit:active {
  opacity: 0.8;
}

/* ==========================================
   LOCK SCREEN
   ========================================== */

.lock-screen {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: #000;
}

.lock-screen iframe {
  width: 100vw;
  height: 100vh;
  border: none;
  display: block;
}

.lock-back-pill {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: 24px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  cursor: pointer;
  z-index: 9999;
  transition: background 0.2s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.lock-back-pill:active {
  background: rgba(0, 0, 0, 0.6);
}

.lock-back-brand {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 1.5px;
  font-weight: 600;
}

.lock-back-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
}

/* ==========================================
   SCROLLBAR
   ========================================== */

::-webkit-scrollbar {
  width: 0;
  height: 0;
}
```

- [ ] **Step 2: Replace index.html**

Replace `glint-app/index.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="description" content="Glint — AI 生成式锁屏 Demo" />
    <title>Glint</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="/index.css">
    <style>
      body { margin: 0; overflow: hidden; background: #000; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Clean up unused files**

```bash
rm glint-app/types.ts glint-app/metadata.json glint-app/README.md
```

- [ ] **Step 4: Verify dev server runs**

```bash
cd glint-app && npm run dev
```

Open `http://localhost:3000` in browser. Expected: HomeScreen renders with prompt chips and input bar. Clicking a chip should trigger generation and show the LockScreen with streaming AI content.

- [ ] **Step 5: Commit**

```bash
git add -A glint-app/
git commit -m "feat: complete Glint web app — new styles, HTML entry, cleanup unused files"
```

---

### Task 9: Web App Smoke Test and Polish

**Files:**
- Potentially any file in `glint-app/` for bug fixes

- [ ] **Step 1: Run dev server and test core flow**

```bash
cd glint-app && npm run dev
```

Test in browser (preferably Chrome DevTools mobile viewport 390×844):
1. HomeScreen loads with prompt chips and input
2. Click a preset chip → switches to LockScreen, streaming starts, HTML appears progressively
3. Generated content fills full screen (100vw × 100vh, no scroll)
4. Back pill visible at bottom center
5. Click back pill → returns to HomeScreen
6. Type custom prompt → submit → generates lockscreen
7. Verify different prompts produce different visual styles

- [ ] **Step 2: Fix any issues found**

Address bugs discovered during smoke test.

- [ ] **Step 3: Verify production build**

```bash
cd glint-app && npm run build && npm run preview
```

Expected: preview server starts, app works same as dev.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A glint-app/
git commit -m "fix: polish and bug fixes from smoke test"
```

---

### Task 10: Capacitor Integration

**Prerequisites:** Android Studio installed, Android SDK configured, `ANDROID_HOME` / `JAVA_HOME` environment variables set. If not installed: download Android Studio from https://developer.android.com/studio, open it once to install SDK components.

**Files:**
- Create: `glint-app/capacitor.config.ts`
- Modify: `glint-app/package.json` (add capacitor deps)
- Create: `glint-app/android/` (generated by Capacitor)

- [ ] **Step 1: Install Capacitor**

```bash
cd glint-app && npm install @capacitor/core @capacitor/android && npm install -D @capacitor/cli
```

- [ ] **Step 2: Create capacitor.config.ts**

Create `glint-app/capacitor.config.ts`:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.glint.lockscreen',
  appName: 'Glint',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#000000',
  },
};

export default config;
```

- [ ] **Step 3: Initialize Android project**

```bash
cd glint-app && npm run build && npx cap add android
```

Expected: creates `android/` directory with Android project.

- [ ] **Step 4: Commit**

```bash
git add glint-app/capacitor.config.ts glint-app/package.json glint-app/package-lock.json glint-app/android/
git commit -m "feat: add Capacitor and Android project scaffold"
```

---

### Task 11: Android Immersive Mode Configuration

**Files:**
- Modify: `glint-app/android/app/src/main/java/.../MainActivity.java`
- Modify: `glint-app/android/app/src/main/res/values/styles.xml`

- [ ] **Step 1: Configure MainActivity for immersive mode**

Edit `glint-app/android/app/src/main/java/com/glint/lockscreen/MainActivity.java`. Add immersive mode setup:

```java
package com.glint.lockscreen;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hideSystemUI();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    private void hideSystemUI() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.systemBars());
                controller.setSystemBarsBehavior(
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
}
```

- [ ] **Step 2: Set portrait-only and fullscreen theme in styles.xml**

Edit `glint-app/android/app/src/main/res/values/styles.xml` — ensure the app theme uses no action bar and black background:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.NoActionBar">
        <item name="android:background">#000000</item>
        <item name="android:windowBackground">#000000</item>
        <item name="android:navigationBarColor">#000000</item>
        <item name="android:statusBarColor">#00000000</item>
        <item name="android:windowTranslucentStatus">true</item>
        <item name="android:windowTranslucentNavigation">true</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="AppTheme">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
    </style>
</resources>
```

- [ ] **Step 3: Lock to portrait in AndroidManifest.xml**

Ensure the `<activity>` tag in `glint-app/android/app/src/main/AndroidManifest.xml` has:

```xml
android:screenOrientation="portrait"
```

- [ ] **Step 4: Sync and commit**

```bash
cd glint-app && npm run build && npx cap sync
git add glint-app/android/
git commit -m "feat: configure Android immersive mode, portrait lock, fullscreen theme"
```

---

### Task 12: Build APK

**Files:**
- Build output: `glint-app/android/app/build/outputs/apk/debug/app-debug.apk`

- [ ] **Step 1: Sync web assets**

```bash
cd glint-app && npm run build && npx cap sync android
```

- [ ] **Step 2: Build debug APK via Gradle**

```bash
cd glint-app/android && ./gradlew assembleDebug
```

Expected: BUILD SUCCESSFUL. APK at `app/build/outputs/apk/debug/app-debug.apk`.

- [ ] **Step 3: Verify APK exists and note size**

```bash
ls -lh glint-app/android/app/build/outputs/apk/debug/app-debug.apk
```

Expected: ~5-8MB.

- [ ] **Step 4: Copy APK to project root for easy access**

```bash
cp glint-app/android/app/build/outputs/apk/debug/app-debug.apk ./Glint-demo.apk
```

- [ ] **Step 5: Commit**

```bash
git add glint-app/
git commit -m "feat: build Glint demo APK"
```

---

### Task 13: Final Verification on Device/Emulator

- [ ] **Step 1: Install on Android device or emulator**

```bash
adb install Glint-demo.apk
```

- [ ] **Step 2: Full test checklist**

Verify on device:
1. App launches full-screen (no status bar, no navigation bar)
2. HomeScreen shows with dark gradient background, brand, title, prompt chips, input bar
3. Tapping a preset chip immediately starts generation
4. AI content streams in real-time — visible progressive rendering
5. Generated lockscreen fills entire screen edge-to-edge
6. Back pill is visible and tappable at bottom
7. Tapping back pill returns to HomeScreen
8. Free text input works: type → submit → generates
9. Different prompts produce visually distinct lockscreens
10. No scrolling in generated lockscreen content
11. Screen stays on during use (FLAG_KEEP_SCREEN_ON)

- [ ] **Step 3: Fix any issues and rebuild if needed**

If bugs found: fix → `npm run build` → `npx cap sync` → `./gradlew assembleDebug` → re-install.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Glint v0.1 — AI lockscreen demo APK complete"
```
