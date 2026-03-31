import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-3.1-flash-lite-preview';

// Pre-warm: establish TCP+TLS connection on load for faster first generation
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
For background images, use this URL pattern with keywords: <img src="https://source.unsplash.com/featured/720x1280/?keyword" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;"> Replace "keyword" with a relevant English word like sunrise, rain, night-sky, coffee, city, stars, forest, ocean, etc. Always add a dark semi-transparent overlay div on top of the image for text readability. You can also use CSS gradients, inline SVGs, or emoji as decoration.
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
