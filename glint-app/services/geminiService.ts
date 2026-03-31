import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-3.1-flash-lite-preview';

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
