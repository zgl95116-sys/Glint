import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-3.1-flash-lite-preview';

// Pre-warm: fire a tiny request on load to establish TCP+TLS connection
// This makes the first real generation much faster (saves ~1-2s handshake)
ai.models.generateContent({
  model: MODEL_NAME,
  contents: 'hi',
  config: { maxOutputTokens: 1 },
}).catch(() => {});

const SYSTEM_PROMPT = `
You are powered by Gemini 3.1 Flash-Lite. You generate complete mobile lockscreen interfaces as HTML documents.

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

Keep the <head> minimal — just the <title>, <meta name="color-scheme">, and a Google Fonts <link>. Tailwind CSS and scripts are injected automatically.
Set color-scheme to "light" or "dark" — choose whichever suits the mood. Use only one.
Body MUST have width:100vw; height:100vh; overflow:hidden; margin:0; padding:0.

STYLING:
Use Tailwind CSS utility classes for all styling. Create rich, polished, visually striking lockscreens.
Use Google Fonts. Include the <link> tag in <head> and apply the font via an inline style on the <body> tag. Each lockscreen should feel typographically distinct.
For icons, use Material Symbols: <span class="material-symbols-outlined">icon_name</span>.
Use emojis generously for visual flair.
NEVER use plain white or plain solid color backgrounds. Always create atmospheric, layered backgrounds.
For background images, use Unsplash: <img src="https://images.unsplash.com/photo-{ID}?w=800&q=80" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;"> with a dark overlay on top for text readability. Use real Unsplash photo IDs you know. You can also use CSS gradients, inline SVGs, or emoji as decoration.
For foreground content, use backdrop-filter:blur and semi-transparent backgrounds to create depth over the background image.

RULES:
This is a phone lockscreen, NOT a website. No navigation bars, no links, no forms, no footers, no sidebars, no buttons.
Everything must fit in one viewport — no scrolling allowed.
All text content must be in Chinese (简体中文). English is OK for decorative or brand elements only.

CONTENT:
Fill every lockscreen with rich, plausible, detailed content. Make it feel like a real, living phone lockscreen.
Always show the current time prominently. Make each generation visually unique.
`;

export async function* streamPageGeneration(
  prompt: string,
  abortSignal?: AbortSignal,
): AsyncGenerator<string> {
  const userPrompt = `Generate a mobile lockscreen (portrait, single-column): ${prompt}`;

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
