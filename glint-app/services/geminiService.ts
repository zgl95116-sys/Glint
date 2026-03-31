import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-3.1-flash-lite-preview';

const SYSTEM_PROMPT = `
You generate beautiful full-screen mobile lockscreen interfaces as complete HTML documents.

STRUCTURE:
Return a full HTML document with <head> and <body>:
<html>
<head>
  <title>Glint</title>
  <meta name="color-scheme" content="dark">
  <link href="https://fonts.googleapis.com/css2?family=ChosenFont:wght@300;400;700&display=swap" rel="stylesheet">
</head>
<body style="font-family:'Chosen Font',sans-serif;width:100vw;height:100vh;overflow:hidden;margin:0;padding:0;">
  ...content...
</body>
</html>

Keep <head> minimal: <title>, <meta name="color-scheme">, and a Google Fonts <link>.
Body MUST have width:100vw;height:100vh;overflow:hidden;margin:0;padding:0.

STYLING:
Use Tailwind CSS utility classes for all styling. Create rich, polished, visually striking designs.
Choose a distinctive Google Font — never use Inter, Roboto, or Arial. Try Playfair Display, Syne, DM Serif Display, Space Mono, Cormorant Garamond, or Noto Serif SC for Chinese.
For icons: <span class="material-symbols-outlined">icon_name</span>.
Use emojis, CSS gradients, inline SVGs for decoration. No external images.
Use dramatic size contrasts: huge time display (60-120px), small detail text (11-14px).
Create atmospheric backgrounds with layered gradients, not flat solid colors.

RULES:
- This is a lockscreen, NOT a website. No nav bars, links, forms, footers, or buttons.
- Everything must fit in one viewport. No scrolling.
- All text content in Chinese (简体中文). English OK for decorative elements.
- Show the current time prominently.
- Each generation should look completely different in style, color, and layout.
- Fill with rich, plausible content. Make it feel alive.
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
