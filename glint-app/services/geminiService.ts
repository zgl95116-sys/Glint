import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-3.1-flash-lite-preview';

export type PromptSource = 'preset' | 'custom';

const GENERATION_PROFILE = {
  preset: {
    maxOutputTokens: 3000,
  },
  custom: {
    maxOutputTokens: 3500,
  },
} as const;

// HTTP/2 idle connections to generativelanguage.googleapis.com get closed by
// the server after ~60s. Each re-open burns ~600-900ms on TCP + TLS on mobile.
// We keep the connection warm with lightweight 1-token pings every ~25s while
// the app is visible, and immediately after any real generation finishes.
const KEEPALIVE_INTERVAL_MS = 25_000;
let keepAliveTimer: ReturnType<typeof setTimeout> | null = null;
let keepAliveInFlight = false;

function sendPing() {
  if (keepAliveInFlight) return;
  keepAliveInFlight = true;
  ai.models
    .generateContent({
      model: MODEL_NAME,
      contents: 'hi',
      config: { maxOutputTokens: 1 },
    })
    .catch(() => {})
    .finally(() => {
      keepAliveInFlight = false;
    });
}

function scheduleKeepAlive(delayMs: number = KEEPALIVE_INTERVAL_MS) {
  if (keepAliveTimer) clearTimeout(keepAliveTimer);
  if (typeof document !== 'undefined' && document.hidden) return;
  keepAliveTimer = setTimeout(() => {
    sendPing();
    scheduleKeepAlive(KEEPALIVE_INTERVAL_MS);
  }, delayMs);
}

function stopKeepAlive() {
  if (keepAliveTimer) {
    clearTimeout(keepAliveTimer);
    keepAliveTimer = null;
  }
}

function warmUpModel() {
  sendPing();
  scheduleKeepAlive(KEEPALIVE_INTERVAL_MS);
}

if (typeof window !== 'undefined') {
  // Fire warmup immediately — every ms of prewarming saves TTFB on first gen.
  warmUpModel();

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopKeepAlive();
      } else {
        // Resume quickly — user just came back, connection may already be dead.
        sendPing();
        scheduleKeepAlive(KEEPALIVE_INTERVAL_MS);
      }
    });
  }
}

const SYSTEM_PROMPT = `You are a generative visual artist. Create one-of-a-kind HTML lockscreen artworks.

OUTPUT: Single <!doctype html>. <head>: <meta name="color-scheme" content="dark|light">, <style> for @keyframes. Body inline styles.
CSS vars: var(--font-display) var(--font-serif) var(--font-mono) var(--font-hand).
Pre-built: .g-drift .g-breathe .g-pulse .g-float .g-sweep .g-flicker .g-rise, .g-grain, url(#g-noise). Google Fonts <link> OK. No other external resources.

LAYOUT — follow the user's specified layout:
• RADIAL — content from focal point outward; arcs, rings, blobs
• DIAGONAL — angled bands split screen; content on opposing sides
• IMMERSIVE — full-screen animated visual IS the art; 2-3 floating text anchors
• ASYMMETRIC — one element fills 70%+; text cluster elsewhere
• NEGATIVE SPACE — 80%+ empty; single bold element + whisper

TYPOGRAPHY — CRITICAL, sizes must be large and readable:
- Hero (time/temp/number): font-size clamp(80px, 28-55vw, 320px), font-weight:100-200
- Core message / AI voice: 22-28px, font-weight:300, line-height:1.5-1.8
- Info / schedule items: 15-20px, inside glass cards with flex layout
- Labels / context: 12-16px with letter-spacing
- Brand whisper: 11-12px only for bottom brand line
- ABSOLUTE MINIMUM text size is 12px. Never go below 12px.

DESIGN PATTERNS:
- Animated gradient blobs: 2-3 large radial-gradient circles with different animation durations, wrapped in a container with filter:blur(60-80px)
- Glass morphism cards: background:rgba(255,255,255,0.04-0.1); backdrop-filter:blur(16-24px); border-radius:16-20px; padding:18-20px; border:1px solid rgba(…,0.08-0.15)
- Staggered entrance: each block uses animation:slide-up .8s ease Xs both with X incrementing +0.15s per block
- Data strips: display:flex; justify-content:space-between for info pairs, not line-break lists
- SVG scenes: SMIL <animate> for life — flight arcs, beacon pings, mountain silhouettes, moon glow
- Noise grain: <div class="g-grain"></div> for texture
- AI voice: warm conversational Chinese at 22-28px, integrated into the visual flow — NOT tiny hidden text

CONTENT: 简体中文; English for decorative labels (GLINT · MORNING etc). Pick 2-4 key facts.

VIEWPORT SAFETY — CRITICAL:
- ALL content MUST stay within 100vw × 100vh. No element may visually exceed the screen.
- Body must always have overflow:hidden.
- Decorative layers (gradient blobs, glow) must stay inside a container with inset:0 and overflow:hidden — NEVER use negative inset or width/height > 100%.
- Transforms (translate, scale) must not push visible content outside the viewport. Keep translate values small (< 5%).
- Bottom-positioned elements: use bottom:6-10% minimum to avoid being cut off.
- Right-edge elements: always set right:5%+ or use left+right to auto-center.

ANTI-OVERLAP — CRITICAL:
- Use a SINGLE full-screen flex column container for all text/card content:
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;padding:6% 6% 8%">
- Place content blocks as flex children with appropriate spacing. Use margin-top:auto on the last block to push it to the bottom.
- NEVER use position:absolute on text or card elements — ONLY on background decorative layers (gradients, SVGs, grain).
- This prevents ALL text/content overlap regardless of content length.
- Decorative backgrounds (gradient blobs, SVGs, ambient layers) still use position:absolute with inset:0 containers.
- Glass cards use flex-shrink:0 to maintain their size.

NEVER: text below 12px, card grids, bullet lists, notification layouts, uniform text, elements exceeding viewport bounds, position:absolute on text/card content.`;

const FEW_SHOT_EXAMPLES: Array<{ user: string; model: string }> = [
  {
    // Morning — aurora blob gradient, giant temperature, glass card — FLEX layout
    user: '[Style: Warm aurora mesh. Animated gradient blobs, golden burst. Layout: RADIAL]\n周六早上8:20，26°C多云转晴。老王火锅5人聚餐14:00、京东快递丰巢#327取件码528190、建议下午跑步空气优。',
    model: `<!doctype html><html><head><meta name="color-scheme" content="light"><style>@keyframes blob1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-50px) scale(1.1)}66%{transform:translate(-20px,20px) scale(0.9)}}@keyframes blob2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-40px,30px) scale(1.15)}66%{transform:translate(20px,-40px) scale(0.95)}}@keyframes float-up{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}@keyframes shimmer{0%,100%{opacity:.7}50%{opacity:1}}</style></head><body style="margin:0;overflow:hidden;width:100vw;height:100vh;font-family:var(--font-display);background:#1a0e2e"><div style="position:absolute;inset:0;overflow:hidden;filter:blur(80px);opacity:.85"><div style="position:absolute;top:5%;left:10%;width:50vmin;height:50vmin;border-radius:50%;background:radial-gradient(circle,#ff9a56,#ff6b8a 50%,transparent 70%);animation:blob1 12s ease-in-out infinite"></div><div style="position:absolute;top:30%;left:40%;width:55vmin;height:55vmin;border-radius:50%;background:radial-gradient(circle,#ffd46b,#ffa040 50%,transparent 70%);animation:blob2 15s ease-in-out infinite"></div></div><div class="g-grain"></div><div style="position:absolute;inset:0;display:flex;flex-direction:column;padding:6% 6% 8%"><div style="animation:float-up .6s ease both"><div style="font-size:20px;font-weight:300;color:rgba(255,255,255,0.5)">08:20</div><div style="font-size:14px;color:rgba(255,255,255,0.3)">周六早上</div></div><div style="text-align:center;margin-top:6%;animation:float-up .8s ease both"><div style="font-size:clamp(140px,45vw,280px);font-weight:100;color:rgba(255,255,255,0.9);line-height:.85;letter-spacing:-10px;text-shadow:0 4px 60px rgba(255,100,50,0.3)">26°</div><div style="font-size:18px;color:rgba(255,255,255,0.6);letter-spacing:4px;margin-top:12px">多云转晴 · 午后放晴</div></div><div style="margin-top:auto;animation:float-up .9s ease .2s both"><div style="font-size:26px;font-weight:300;color:rgba(255,255,255,0.85);line-height:1.5;margin-bottom:20px">今天阳光很好，<br>不着急，慢慢来。</div></div><div style="background:rgba(255,255,255,0.1);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-radius:20px;padding:20px;border:1px solid rgba(255,255,255,0.15);flex-shrink:0;animation:float-up 1s ease .4s both"><div style="display:flex;justify-content:space-between;margin-bottom:14px"><span style="font-size:15px;color:rgba(255,255,255,0.5)">今日安排</span><span style="font-size:13px;color:rgba(255,200,100,0.6);animation:shimmer 3s ease infinite">✦ AI 已整理</span></div><div style="font-size:18px;color:rgba(255,255,255,0.85);line-height:1.7"><div style="display:flex;justify-content:space-between"><span>🍽 老王火锅 · 5人聚餐</span><span style="color:rgba(255,255,255,0.4)">14:00</span></div><div style="display:flex;justify-content:space-between;margin-top:2px"><span>📦 京东快递 丰巢#327</span><span style="color:rgba(255,255,255,0.4)">取件码</span></div></div></div><div style="text-align:center;margin-top:16px;animation:float-up 1s ease .5s both"><div style="font-size:12px;color:rgba(255,255,255,0.15);letter-spacing:6px">GLINT · MORNING</div></div></div></body></html>`,
  },
  {
    // Rain storm — dense rain field, lightning, glass info panel — FLEX layout
    user: '[Style: Storm immersion. Dense rain field, lightning flash, glass panel. Layout: IMMERSIVE]\n周三下午2:15暴雨，45分钟后开会B-803，打车到公司约25分钟。Q3汇报摘要已生成3页，参会张总、李明、产品组×4。',
    model: `<!doctype html><html><head><meta name="color-scheme" content="dark"><style>@keyframes fall{from{transform:translateY(-10vh) rotate(8deg)}to{transform:translateY(110vh) rotate(8deg)}}@keyframes flash{0%,100%{opacity:0}49%{opacity:.8}51%{opacity:0}52%{opacity:.4}54%{opacity:0}}@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}@keyframes slide-up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}</style></head><body style="margin:0;overflow:hidden;width:100vw;height:100vh;font-family:var(--font-display);background:#0c1117"><div style="position:absolute;inset:0;overflow:hidden;pointer-events:none"><div style="position:absolute;left:8%;width:2px;height:18vh;background:linear-gradient(transparent,rgba(150,190,255,0.4),transparent);animation:fall .6s linear infinite"></div><div style="position:absolute;left:22%;width:2px;height:22vh;background:linear-gradient(transparent,rgba(150,190,255,0.35),transparent);animation:fall .55s .1s linear infinite"></div><div style="position:absolute;left:38%;width:2px;height:16vh;background:linear-gradient(transparent,rgba(150,190,255,0.45),transparent);animation:fall .5s .25s linear infinite"></div><div style="position:absolute;left:52%;width:2px;height:20vh;background:linear-gradient(transparent,rgba(150,190,255,0.3),transparent);animation:fall .65s .05s linear infinite"></div><div style="position:absolute;left:68%;width:2px;height:24vh;background:linear-gradient(transparent,rgba(150,190,255,0.4),transparent);animation:fall .45s .3s linear infinite"></div><div style="position:absolute;left:82%;width:1px;height:12vh;background:linear-gradient(transparent,rgba(150,190,255,0.2),transparent);animation:fall .9s .4s linear infinite"></div><div style="position:absolute;left:95%;width:1px;height:14vh;background:linear-gradient(transparent,rgba(150,190,255,0.2),transparent);animation:fall .85s .5s linear infinite"></div></div><div style="position:absolute;inset:0;background:rgba(200,210,255,0.15);animation:flash 8s ease-in-out infinite;pointer-events:none"></div><div style="position:absolute;inset:0;display:flex;flex-direction:column;padding:8% 6% 6%"><div style="animation:slide-up .7s ease both"><div style="font-size:clamp(80px,28vw,160px);font-weight:100;color:rgba(255,255,255,0.85);letter-spacing:-5px;line-height:.85;mix-blend-mode:screen">14:15</div><div style="font-size:17px;color:rgba(150,190,255,0.5);margin-top:6px">周三 · 暴雨</div></div><div style="margin-top:16px;animation:slide-up .8s ease .1s both"><div style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,50,40,0.15);border:1px solid rgba(255,50,40,0.3);border-radius:12px;padding:8px 16px;animation:pulse 2s ease infinite"><div style="width:8px;height:8px;border-radius:50%;background:#ff3b30"></div><span style="font-size:16px;color:rgba(255,80,60,0.9);font-weight:500">45 分钟后开会</span></div></div><div style="margin-top:16px;animation:slide-up .9s ease .2s both"><div style="font-size:24px;font-weight:300;color:rgba(255,255,255,0.9);line-height:1.6">外面暴雨，我帮你查了——<br><span style="font-size:20px;color:rgba(150,190,255,0.7)">打车到公司约 25 分钟，<br>现在叫车刚好来得及。</span></div></div><div style="margin-top:auto;background:rgba(255,255,255,0.04);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:18px;padding:18px 20px;border:1px solid rgba(150,190,255,0.08);flex-shrink:0;animation:slide-up 1s ease .35s both"><div style="font-size:16px;color:rgba(255,255,255,0.8);line-height:1.7"><div style="display:flex;justify-content:space-between"><span>📊 Q3 汇报摘要已生成</span><span style="color:rgba(255,255,255,0.35)">3页</span></div><div style="display:flex;justify-content:space-between;margin-top:4px"><span>👥 张总、李明、产品组 ×4</span><span style="color:rgba(255,255,255,0.35)">B-803</span></div></div></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;flex-shrink:0;animation:slide-up 1s ease .5s both"><div style="font-size:36px;font-weight:200;color:rgba(150,190,255,0.4)">18°</div><div style="font-size:12px;color:rgba(255,255,255,0.15);letter-spacing:5px">GLINT · STORM</div></div></div></body></html>`,
  },
  {
    // Night — ink wash, moon, mountain SVG, serif poetry — FLEX layout
    user: '[Style: Ink wash moonscape. Moon as sole light, mountain silhouette, vast emptiness. Layout: NEGATIVE SPACE]\n周日深秋夜10:45，走了12000步做完6件事还剩2件。明早9:00客户拜访记得带合同。',
    model: `<!doctype html><html><head><meta name="color-scheme" content="dark"><style>@keyframes moon-glow{0%,100%{box-shadow:0 0 50px 15px rgba(255,240,200,0.1),0 0 100px 40px rgba(255,240,200,0.05)}50%{box-shadow:0 0 70px 25px rgba(255,240,200,0.15),0 0 140px 60px rgba(255,240,200,0.08)}}@keyframes drift{0%,100%{transform:translate(0,0)}50%{transform:translate(3px,-5px)}}@keyframes ink-appear{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0)}}@keyframes fade-in{from{opacity:0}to{opacity:1}}@keyframes breathe{0%,100%{opacity:.15}50%{opacity:.25}}</style></head><body style="margin:0;overflow:hidden;width:100vw;height:100vh;font-family:var(--font-serif);background:#0a0a0c"><div style="position:absolute;inset:0;background:radial-gradient(ellipse at 30% 70%,rgba(30,25,35,1),#0a0a0c 60%)"></div><div style="position:absolute;top:8%;right:12%;width:clamp(80px,22vmin,130px);height:clamp(80px,22vmin,130px);border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff8e0,#f0e4b8 40%,#d4c48a 80%);animation:moon-glow 6s ease-in-out infinite,drift 10s ease-in-out infinite"></div><div style="position:absolute;top:15%;right:0;width:70vw;height:80vh;background:radial-gradient(ellipse at top right,rgba(255,240,200,0.04),transparent 60%);pointer-events:none"></div><svg style="position:absolute;bottom:25%;left:0;width:100%;height:45%;opacity:.6;animation:ink-appear 3s ease both" viewBox="0 0 1000 400" preserveAspectRatio="none"><path d="M0,350 Q100,200 200,280 Q300,180 420,260 Q500,150 620,240 Q750,160 850,250 Q950,200 1000,280 L1000,400 L0,400Z" fill="rgba(255,255,255,0.04)"/><path d="M0,380 Q80,250 180,310 Q280,180 400,290 Q480,120 600,260 Q720,170 830,280 Q920,220 1000,300 L1000,400 L0,400Z" fill="rgba(255,255,255,0.08)"/></svg><div style="position:absolute;top:20%;left:25%;width:2px;height:2px;background:rgba(255,255,255,0.3);border-radius:50%;animation:breathe 4s ease infinite"></div><div style="position:absolute;top:12%;left:50%;width:1px;height:1px;background:rgba(255,255,255,0.25);border-radius:50%;animation:breathe 5s ease infinite 1s"></div><div style="position:absolute;inset:0;display:flex;flex-direction:column;padding:8% 7% 10%"><div style="animation:fade-in 2s ease .5s both"><div style="font-size:clamp(80px,28vw,160px);font-weight:200;color:rgba(255,250,230,0.8);letter-spacing:-3px;line-height:.85;text-shadow:0 2px 30px rgba(255,240,200,0.1)">22:45</div><div style="font-size:16px;color:rgba(255,250,230,0.25);letter-spacing:5px;margin-top:8px">深秋 · 周日夜</div></div><div style="margin-top:auto;animation:fade-in 2s ease 1s both"><div style="font-size:24px;font-weight:300;color:rgba(255,250,230,0.6);line-height:1.8;letter-spacing:2px">走了一万两千步，<br>做完了六件事。<br><span style="font-size:20px;color:rgba(255,250,230,0.3)">还剩两件，不急，明天再说。</span></div></div><div style="margin-top:24px;flex-shrink:0;animation:fade-in 2s ease 1.5s both"><div style="height:1px;background:linear-gradient(to right,rgba(255,250,230,0.08),transparent);margin-bottom:14px"></div><div style="display:flex;justify-content:space-between;align-items:flex-end"><div><div style="font-size:14px;color:rgba(255,250,230,0.2);margin-bottom:4px">明早</div><div style="font-size:20px;color:rgba(255,250,230,0.55)">09:00 客户拜访</div><div style="font-size:16px;color:rgba(255,250,230,0.25);margin-top:2px">记得带合同。我设了闹钟。</div></div><div style="width:32px;height:32px;border:1px solid rgba(200,60,40,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="font-size:14px;color:rgba(200,60,40,0.4);font-weight:600">灵</span></div></div></div></div></body></html>`,
  },
  {
    // Flight — radar grid, flight arc SVG, data strips, glass panel — FLEX layout
    user: '[Style: Radar flight tracker. Grid + animated flight arc, data strips, scan line. Layout: DIAGONAL]\n下午5:30，CA1502北京→成都延误40分钟，登机口B7步行8分钟到。落地22°C小雨，酒店已改延迟入住。',
    model: `<!doctype html><html><head><meta name="color-scheme" content="dark"><style>@keyframes scan-line{from{top:-5%}to{top:105%}}@keyframes dash{to{stroke-dashoffset:-60}}@keyframes slide-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes glow{0%,100%{text-shadow:0 0 20px rgba(80,170,255,0.2)}50%{text-shadow:0 0 40px rgba(80,170,255,0.4),0 0 80px rgba(80,170,255,0.1)}}@keyframes plane-move{0%{offset-distance:0%;opacity:0}5%{opacity:1}95%{opacity:1}100%{offset-distance:100%;opacity:0}}</style></head><body style="margin:0;overflow:hidden;width:100vw;height:100vh;font-family:var(--font-mono);background:#060a10"><div style="position:absolute;inset:0;background:linear-gradient(rgba(80,170,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(80,170,255,0.03) 1px,transparent 1px);background-size:20% 20%;pointer-events:none"></div><div style="position:absolute;left:0;right:0;height:2px;background:linear-gradient(to right,transparent,rgba(80,170,255,0.15),transparent);animation:scan-line 4s linear infinite;pointer-events:none"></div><svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 390 844"><path d="M320,200 Q195,420 90,700" fill="none" stroke="rgba(255,180,50,0.15)" stroke-width="2" stroke-dasharray="8 6" style="animation:dash 3s linear infinite"/><path d="M320,200 Q195,420 90,700" fill="none" stroke="rgba(255,180,50,0.05)" stroke-width="20"/><circle cx="320" cy="200" r="5" fill="rgba(80,170,255,0.8)"/><circle cx="320" cy="200" fill="none" stroke="rgba(80,170,255,0.3)" stroke-width="1"><animate attributeName="r" values="5;25;5" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0;1" dur="3s" repeatCount="indefinite"/></circle><circle cx="90" cy="700" r="6" fill="rgba(255,180,50,0.9)"/><circle cx="90" cy="700" fill="none" stroke="rgba(255,180,50,0.3)" stroke-width="1"><animate attributeName="r" values="6;30;6" dur="2.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0;1" dur="2.5s" repeatCount="indefinite"/></circle><circle r="3" fill="#fff" style="offset-path:path('M320,200 Q195,420 90,700');animation:plane-move 8s linear infinite"/></svg><div style="position:absolute;top:21%;right:5%;font-size:13px;color:rgba(80,170,255,0.4);letter-spacing:2px">北京 PEK</div><div style="position:absolute;bottom:19%;left:8%;font-size:13px;color:rgba(255,180,50,0.5);letter-spacing:2px">成都 CTU</div><div style="position:absolute;inset:0;display:flex;flex-direction:column;padding:5% 6% 6%"><div style="animation:slide-in .7s ease both"><div style="font-size:clamp(48px,18vw,88px);font-weight:200;color:rgba(255,255,255,0.9);letter-spacing:-2px;animation:glow 4s ease infinite">CA1502</div><div style="display:flex;gap:16px;margin-top:8px;font-size:15px"><span style="color:rgba(255,130,40,0.8);font-weight:500">延误 40 分钟</span><span style="color:rgba(255,255,255,0.3)">预计 18:10 登机</span></div></div><div style="display:flex;gap:0;margin-top:16px;animation:slide-in .8s ease .15s both"><div style="flex:1;border-right:1px solid rgba(80,170,255,0.08);padding:12px 0"><div style="font-size:12px;color:rgba(80,170,255,0.4);letter-spacing:2px;margin-bottom:4px">登机口</div><div style="font-size:28px;font-weight:300;color:rgba(255,180,50,0.9)">B7</div></div><div style="flex:1;border-right:1px solid rgba(80,170,255,0.08);padding:12px 0 12px 16px"><div style="font-size:12px;color:rgba(80,170,255,0.4);letter-spacing:2px;margin-bottom:4px">落地天气</div><div style="font-size:28px;font-weight:300;color:rgba(255,255,255,0.7)">22° 🌧</div></div><div style="flex:1;padding:12px 0 12px 16px"><div style="font-size:12px;color:rgba(80,170,255,0.4);letter-spacing:2px;margin-bottom:4px">到达</div><div style="font-size:28px;font-weight:300;color:rgba(255,255,255,0.7)">19:50</div></div></div><div style="margin-top:auto;animation:slide-in .9s ease .3s both"><div style="background:rgba(255,255,255,0.03);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-radius:16px;padding:18px;border:1px solid rgba(80,170,255,0.06);flex-shrink:0"><div style="font-size:17px;color:rgba(255,255,255,0.8);line-height:1.6">登机口换了，从你现在的位置<br><span style="font-size:22px;color:rgba(80,170,255,0.8);font-weight:500">步行 8 分钟</span> 到 B7</div><div style="margin-top:10px;font-size:15px;color:rgba(255,255,255,0.3)">全季酒店已改延迟入住 · 地铁约55分钟到</div></div></div><div style="text-align:center;margin-top:12px;flex-shrink:0;animation:slide-in 1s ease .45s both"><span style="font-size:12px;color:rgba(80,170,255,0.15);letter-spacing:4px">17:30 · GLINT FLIGHT</span></div></div></body></html>`,
  },
];

// --- Cached content (A4) ---------------------------------------------------
// The SYSTEM_PROMPT + few-shot exemplars are ~1.5k tokens and identical on
// every call. Gemini's caching API lets us upload them once (TTL 1h) and
// replace them with a short cache handle on each request, saving per-call
// tokenization + input-token cost. Preview models may not support caches, and
// small payloads below the 1024-token minimum will also fail — in either case
// we silently fall back to inline contents.
let cachedContentName: string | null = null;
let cacheBootstrapped = false;
let cacheDisabled = false;

async function bootstrapCache(): Promise<void> {
  if (cacheBootstrapped || cacheDisabled) return;
  cacheBootstrapped = true;
  try {
    const cache = await ai.caches.create({
      model: MODEL_NAME,
      config: {
        contents: FEW_SHOT_EXAMPLES.flatMap((ex) => [
          { role: 'user' as const, parts: [{ text: ex.user }] },
          { role: 'model' as const, parts: [{ text: ex.model }] },
        ]),
        systemInstruction: SYSTEM_PROMPT,
        ttl: '3600s',
      },
    });
    cachedContentName = cache.name ?? null;
    if (!cachedContentName) cacheDisabled = true;
  } catch (err) {
    // Most common failures: model doesn't support caches, payload under 1024
    // tokens, or transient server error. Any of these → inline fallback.
    cacheDisabled = true;
    cachedContentName = null;
    console.info('[Glint] cached content unavailable, using inline:', err);
  }
}

if (typeof window !== 'undefined') {
  // Kick off cache creation alongside the first warmup — no delay, available
  // for the 2nd+ generation as soon as possible.
  bootstrapCache();
}

// --- Art direction detection (B) --------------------------------------------
// Maps keywords in the user prompt to a specific visual style + layout type,
// so the model gets explicit creative direction instead of guessing from scene.
interface ArtDirection {
  style: string;
  layout: 'RADIAL' | 'DIAGONAL' | 'IMMERSIVE' | 'ASYMMETRIC' | 'NEGATIVE SPACE';
}

const ART_RULES: Array<{ test: RegExp; style: string; layout: ArtDirection['layout'] }> = [
  // Weather — immersive by default
  { test: /雨|暴雨|雷阵雨|rain/i, style: 'Ink wash rain. Slate/charcoal/mist, animated falling lines as main visual', layout: 'IMMERSIVE' },
  { test: /雪|下雪|snow/i, style: 'Particle snowfield. Deep blue-white, drifting flakes filling the screen', layout: 'IMMERSIVE' },
  { test: /风|大风|台风|wind|storm/i, style: 'Kinetic wind streaks. Diagonal motion lines, turbulent energy', layout: 'DIAGONAL' },

  // Travel
  { test: /航班|机场|飞机|登机|flight|airport/i, style: 'Departure board meets topographic map. Dark + accent, flight path arcs, compass SVG', layout: 'DIAGONAL' },
  { test: /火车|高铁|车站|到站|train/i, style: 'Rail transit arrival. Dark + warm accent, arrival countdown, track lines', layout: 'DIAGONAL' },
  { test: /旅[行途程]|度假|travel|vacation/i, style: 'Travel postcard collage. Warm destination colors, stamp/ticket motifs', layout: 'ASYMMETRIC' },

  // Urgency
  { test: /紧急|倒计时|马上|deadline|urgent|改会/i, style: 'Dark command center. Red/amber accent, scan lines, monospace type', layout: 'RADIAL' },
  { test: /面试|interview/i, style: 'Professional intel dossier. Cool gray-steel, clean sharp typography', layout: 'DIAGONAL' },

  // Time-of-day
  { test: /早[上晨安]|清晨|morning|晨间/i, style: 'Golden hour editorial. Warm cream/gold, light leaks, massive serif time', layout: 'ASYMMETRIC' },
  { test: /深夜|凌晨|睡前|晚安|23[:：]|midnight/i, style: 'Deep void. Single luminous element, vast emptiness, monochrome + warm accent', layout: 'NEGATIVE SPACE' },
  { test: /[晚夜]上|night/i, style: 'Night atmosphere. Deep indigo/navy, soft glowing elements, stillness', layout: 'NEGATIVE SPACE' },
  { test: /午[后间]|下午|afternoon/i, style: 'Clean modernist composition. Warm neutral palette, bold geometric shapes', layout: 'DIAGONAL' },

  // Emotional
  { test: /生日|birthday/i, style: 'Celebration warmth. Soft gold/rose, particle confetti, radiating joy', layout: 'RADIAL' },
  { test: /思念|想念|重逢|miss|纪念/i, style: 'Warm nostalgia. Watercolor washes, soft focus, hand-drawn SVG strokes', layout: 'ASYMMETRIC' },
  { test: /演唱会|开票|concert|music|票/i, style: 'Concert energy. Laser holographic neon, waveform shapes, pulsing countdown', layout: 'IMMERSIVE' },

  // Nature/zen
  { test: /冥想|禅|安静|放松|zen|calm/i, style: 'Ink wash minimalism. Single brushstroke SVG, vast emptiness', layout: 'NEGATIVE SPACE' },
  { test: /星空|银河|宇宙|galaxy|star/i, style: 'Cosmic particle field. Deep purple-blue, constellation SVG, glow points', layout: 'IMMERSIVE' },
  { test: /海[边滩]|沙滩|ocean|beach/i, style: 'Layered wave gradients. Teal/sand palette, undulating SVG wave paths', layout: 'IMMERSIVE' },

  // Tech/data
  { test: /数据|代码|科技|hacker|cyber|赛博/i, style: 'Generative art. Neon on dark, circuit grid patterns, data stream aesthetics', layout: 'RADIAL' },
  { test: /AI|算法|人工智能|机器/i, style: 'Neural network visualization. Dark + electric blue, connected node graph', layout: 'RADIAL' },

  // Work/info
  { test: /快递|外卖|配送|deliver/i, style: 'Tracking pulse. Dark + accent, animated proximity ring, countdown', layout: 'RADIAL' },
  { test: /周会|会议|开会|meeting/i, style: 'Minimal briefing. Clean dark, sharp monospace type, single accent color', layout: 'DIAGONAL' },
  { test: /简报|信息|消息|news|brief/i, style: 'Editorial magazine cover. Bold mixed typography, layered depth', layout: 'ASYMMETRIC' },

  // Food
  { test: /午餐|晚餐|美食|餐厅|food|lunch|dinner/i, style: 'Editorial food spread. Rich warm palette, appetizing warmth, organic shapes', layout: 'ASYMMETRIC' },

  // Season/holiday
  { test: /春节|过年|新年|除夕|cny/i, style: 'Festive red-gold. Lantern glow, paper-cut SVG, celebratory radiance', layout: 'RADIAL' },
  { test: /圣诞|christmas|xmas/i, style: 'Winter holiday. Pine green + gold, soft snow particles, warm glow', layout: 'IMMERSIVE' },
];

function detectArtDirection(prompt: string): ArtDirection {
  for (const rule of ART_RULES) {
    if (rule.test.test(prompt)) {
      return { style: rule.style, layout: rule.layout };
    }
  }
  // Default: bold creative direction with a varied layout
  const layouts: ArtDirection['layout'][] = ['RADIAL', 'DIAGONAL', 'IMMERSIVE', 'ASYMMETRIC', 'NEGATIVE SPACE'];
  const layout = layouts[prompt.length % layouts.length];
  return {
    style: 'Surprise with an unexpected bold art direction. Make it feel like gallery art',
    layout,
  };
}

export async function* streamPageGeneration(
  prompt: string,
  promptSource: PromptSource,
  abortSignal?: AbortSignal,
): AsyncGenerator<string> {
  const generationProfile = GENERATION_PROFILE[promptSource];

  const { style, layout } = detectArtDirection(prompt);
  const userPrompt = `[Style: ${style}. Layout: ${layout}]\n${prompt}`;

  const useCache = !!cachedContentName && !cacheDisabled;
  const contents = useCache
    ? [{ role: 'user' as const, parts: [{ text: userPrompt }] }]
    : [
        ...FEW_SHOT_EXAMPLES.flatMap((ex) => [
          { role: 'user' as const, parts: [{ text: ex.user }] },
          { role: 'model' as const, parts: [{ text: ex.model }] },
        ]),
        { role: 'user' as const, parts: [{ text: userPrompt }] },
      ];

  const config: Record<string, unknown> = {
    maxOutputTokens: generationProfile.maxOutputTokens,
    candidateCount: 1,
    responseMimeType: 'text/plain',
  };
  if (useCache) {
    config.cachedContent = cachedContentName;
  } else {
    config.systemInstruction = SYSTEM_PROMPT;
    // First generation triggers cache bootstrap in background so the 2nd call
    // benefits even if the 600ms timer hasn't fired yet.
    if (!cacheBootstrapped && !cacheDisabled) bootstrapCache();
  }
  if (abortSignal) config.abortSignal = abortSignal;

  try {
    const t0 = performance.now();
    console.log(`[PERF] stream_request_start ts=${t0.toFixed(1)}`);

    const responseStream = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents,
      config: config as any,
    });

    let firstChunk = true;
    let totalChars = 0;
    let chunkCount = 0;

    for await (const chunk of responseStream) {
      if (chunk.text) {
        if (firstChunk) {
          const ttfb = performance.now() - t0;
          console.log(`[PERF] TTFB=${ttfb.toFixed(0)}ms first_chunk_len=${chunk.text.length}`);
          firstChunk = false;
        }
        totalChars += chunk.text.length;
        chunkCount++;
        yield chunk.text;
      }
    }

    const totalMs = performance.now() - t0;
    console.log(`[PERF] stream_complete total=${totalMs.toFixed(0)}ms chars=${totalChars} chunks=${chunkCount} chars_per_sec=${(totalChars / (totalMs / 1000)).toFixed(0)}`);
  } catch (error) {
    console.error('Gemini Stream Error:', error);
    // If the cache handle went stale (expired TTL, deleted server-side), drop
    // it so the next call falls back to inline and, eventually, rebuilds.
    const msg = (error as { message?: string })?.message ?? String(error);
    if (useCache && /cache|not\s*found|expired|invalid/i.test(msg)) {
      cachedContentName = null;
      cacheBootstrapped = false;
    }
    yield `<div style="display:flex;align-items:center;justify-content:center;width:100vw;height:100vh;background:#111;color:#fff;font-family:sans-serif;"><p>Generation failed. Please try again.</p></div>`;
  } finally {
    // Reset the keep-alive clock — the connection is fresh right now, next
    // ping should be a full interval out, not piggybacked on existing timer.
    scheduleKeepAlive(KEEPALIVE_INTERVAL_MS);
  }
}
