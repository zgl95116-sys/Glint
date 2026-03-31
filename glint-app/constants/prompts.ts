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
