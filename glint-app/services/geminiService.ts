import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-3.1-flash-lite-preview';

// Pre-warm: establish TCP+TLS connection on load for faster first generation
ai.models.generateContent({
  model: MODEL_NAME,
  contents: 'hi',
  config: { maxOutputTokens: 1 },
}).catch(() => {});

const ART_DIRECTIONS = [
  {
    title: '晨间杂志封面',
    guidance: '像一本高级杂志封面，留白克制，但必须有一个极强的主视觉时间构图。',
  },
  {
    title: '霓虹仪表盘',
    guidance: '像未来设备面板，边缘有细线框和微弱发光，信息不多，但每个元素都很锋利。',
  },
  {
    title: '诗意海报',
    guidance: '像一张情绪海报，重视字距、行距、留白和文字在屏幕里的呼吸感。',
  },
  {
    title: '折页拼贴',
    guidance: '像被贴上的纸片、标签和便签组成的层叠画面，主次清楚，辅助信息很少。',
  },
  {
    title: '静谧器物',
    guidance: '像一件被点亮的器物或装置，画面中心有明确对象或几何结构，整体安静但不空。',
  },
  {
    title: '高密度编辑版式',
    guidance: '像科技或文化刊物的跨页，允许信息稍密，但必须有明确网格和清楚层级。',
  },
  {
    title: '未来公共信息屏',
    guidance: '像地铁、机场或中控台的未来版本，用轨道线、编号和微型标签制造秩序感。',
  },
  {
    title: '东方节令装置',
    guidance: '像节气或节庆海报，善用留白、边框、纹样、金属感或水墨感，不要俗套。',
  },
];

const VISUAL_MOTIFS = [
  {
    title: '发光圆环',
    guidance: '做一个会主导画面的巨大圆环、日轮或光晕装置，让时间嵌入其中，而不是孤零零摆在屏幕上。',
  },
  {
    title: '折纸丝带',
    guidance: '做出纸张折叠、丝带穿插或裁切边缘的感觉，让画面有立体层次和转折。',
  },
  {
    title: '轨道与星图',
    guidance: '用轨道线、星图、坐标、弧线和节点制造秩序感，让信息像围绕某个核心运行。',
  },
  {
    title: '液态金属',
    guidance: '用流动的金属感、镜面高光或液态形状作为主视觉，画面应该先让人看到“物体”，再看到文字。',
  },
  {
    title: '花瓣叠层',
    guidance: '用多层半透明花瓣、叶片、羽毛或云片叠出深度，让文字像停在这些层之间。',
  },
  {
    title: '屏风边框',
    guidance: '用边框、角标、印章、窗格或屏风结构形成一个仪式感很强的舞台。',
  },
  {
    title: '波纹与声场',
    guidance: '用波纹、声场、震荡线或等高线做视觉主角，让时间像在声音或空气中浮现。',
  },
  {
    title: '几何器物',
    guidance: '画面中心有一个明确的几何器物、雕塑、容器或徽章，让锁屏像一件被展示的对象。',
  },
];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function getMomentContext() {
  const now = new Date();
  const time = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const date = now.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  const hour = now.getHours();

  let phase = '夜深';
  if (hour >= 5 && hour < 11) {
    phase = '清晨';
  } else if (hour >= 11 && hour < 14) {
    phase = '午间';
  } else if (hour >= 14 && hour < 18) {
    phase = '午后';
  } else if (hour >= 18 && hour < 22) {
    phase = '傍晚';
  }

  return { time, date, phase };
}

const SYSTEM_PROMPT = `
You are Glint's lockscreen art director. Generate a premium mobile lockscreen as a complete HTML document.

STRUCTURE:
Return a full HTML document with a <head> and a <body>:

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

Keep the <head> minimal: only <title>, <meta name="color-scheme">, and one Google Fonts <link>.
Set color-scheme to "light" or "dark". Use only one.
Body MUST have width:100vw; height:100vh; overflow:hidden; margin:0; padding:0.

STYLING:
Use Tailwind CSS utility classes for all styling.
Use one Google Font and make typography feel intentional and distinctive.
Use Material Symbols if icons are needed: <span class="material-symbols-outlined">icon_name</span>.
Use gradients, radial glows, blur, subtle noise, linework, inline SVG, masks, borders, overlays, shadows, and texture.
Do NOT rely on external photos. Build atmosphere with CSS, SVG, shapes, and light.
Do NOT use emoji as filler. Use them only when they clearly improve the concept.

COMPOSITION:
Include exactly these layers:
1. One dominant focal point, usually the time.
2. One atmospheric background layer.
3. One secondary cluster with at most 2-3 related items.
4. One memorable detail: frame line, orbit, annotation, scan line, torn edge, halo, signal graph, etc.

Aim for poster, editorial cover, cinematic interface, or art print energy.
Favor asymmetry, contrast, hierarchy, and safe mobile spacing.
The screen must NOT be mostly text. A large non-text visual device must occupy a meaningful part of the composition.
The time can merge into the visual device, but time alone is not enough.
Use CSS art or inline SVG to create an object, structure, field, or atmosphere that people notice before they start reading.

RULES:
This is a phone lockscreen, NOT a website. No navigation bars, no links, no forms, no footers, no sidebars, no buttons.
Everything must fit in one viewport — no scrolling allowed.
All text content must be in Chinese (简体中文). English is OK for decorative or brand elements only.
Make the design look premium in a demo screenshot.

AVOID:
- plain white or flat empty backgrounds
- evenly stacked generic glass cards
- layouts that look like a weather app, calendar app, or dashboard homepage
- four or more unrelated widget blocks
- long text paragraphs or explanatory copy
- making typography the only visual idea
- simple top-to-bottom flex columns with a few text cards
- decorative clutter without hierarchy

CONTENT:
Make it feel like this screen belongs to a real moment happening right now.
Always show the provided current time prominently.
Compress information ruthlessly. Fewer elements, stronger mood.
Make each generation visually distinct.
`;

export async function* streamPageGeneration(
  prompt: string,
  abortSignal?: AbortSignal,
): AsyncGenerator<string> {
  const moment = getMomentContext();
  const artDirection = pickRandom(ART_DIRECTIONS);
  const visualMotif = pickRandom(VISUAL_MOTIFS);

  const userPrompt = `
请生成这个时刻的锁屏。
描述：「${prompt}」
时间：${moment.time}
日期：${moment.date}
氛围：${moment.phase}
艺术方向：${artDirection.title}。${artDirection.guidance}
视觉母题：${visualMotif.title}。${visualMotif.guidance}
要求：时间是主角；先抓人再传达；辅助信息不超过 3 组；除时间日期外文字尽量少，不要段落；必须有一个大块非文字视觉主体；保证手机竖屏安全区。
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
    yield `<div style="display:flex;align-items:center;justify-content:center;width:100vw;height:100vh;background:#111;color:#fff;font-family:sans-serif;"><p>生成失败，请重试。</p></div>`;
  }
}
