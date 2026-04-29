import React, { useMemo, useRef, useEffect, useState } from 'react';
import { PRESET_PROMPTS } from '../constants/prompts';
import type { PresetPrompt } from '../constants/prompts';
import type { PromptSource } from '../services/geminiService';
import { GlintHaloMark } from './GlintHaloMark';

interface HomeScreenProps {
  onGenerate: (prompt: string, promptSource: PromptSource, prefabHtml?: string) => void;
  onResetApiKey?: () => void;
}

/* ───────────────────────────────────────────────────────────
   Rhythm — 一天 8 个时刻横向时间轴
   ─────────────────────────────────────────────────────────── */

// 每张节律卡的 hue（沿一天色相轮：暖→冷→暗）
const RHYTHM_HUE: Record<number, number> = {
  7: 32,    // 晨光 — 暖琥珀
  8: 60,    // 出门 — 黄
  10: 150,  // 心流 — 绿
  12: 80,   // 午休 — 奶油
  15: 310,  // 提神 — 品红
  18: 25,   // 日落 — 橙红
  19: 250,  // 入夜 — 紫
  23: 240,  // 晚安 — 深蓝
};

function pickActiveHour(items: PresetPrompt[], now: number): number | null {
  const hours = items
    .map((p) => p.hour ?? -1)
    .filter((h) => h >= 0)
    .sort((a, b) => a - b);
  if (!hours.length) return null;
  let active = hours[hours.length - 1];
  for (const h of hours) if (h <= now) active = h;
  return active;
}

function formatHour(h: number): string {
  const ampm = h < 12 ? 'AM' : 'PM';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:00 ${ampm}`;
}

const RhythmRail: React.FC<{
  items: PresetPrompt[];
  activeHour: number | null;
  onPick: (p: PresetPrompt) => void;
}> = ({ items, activeHour, onPick }) => {
  const railRef = useRef<HTMLDivElement>(null);

  // 自动滚到当前时段
  useEffect(() => {
    if (!railRef.current || activeHour == null) return;
    const node = railRef.current.querySelector<HTMLElement>(`[data-hour="${activeHour}"]`);
    if (node) {
      node.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
    }
  }, [activeHour]);

  return (
    <div className="rhythm-rail" ref={railRef}>
      {items.map((p) => {
        const hue = RHYTHM_HUE[p.hour ?? 0] ?? 220;
        const active = p.hour === activeHour;
        return (
          <button
            key={p.hour}
            data-hour={p.hour}
            type="button"
            className={`rhythm-card${active ? ' rhythm-card-active' : ''}`}
            onClick={() => onPick(p)}
            style={{
              ['--card-hue' as any]: String(hue),
            }}
          >
            <div className="rhythm-card-glow" aria-hidden="true" />
            <div className="rhythm-card-time">
              {active && <span className="rhythm-card-now-dot" />}
              <span>{formatHour(p.hour ?? 0)}</span>
            </div>
            <div className="rhythm-card-label">{p.label}</div>
            {active && <div className="rhythm-card-now-tag">现在</div>}
          </button>
        );
      })}
    </div>
  );
};

/* ───────────────────────────────────────────────────────────
   Events — 大行，每行带 AI 摘要句
   ─────────────────────────────────────────────────────────── */

// 从 prompt 里拎出第一句中文短句作为预览摘要（截到第一个句号/换行）
function extractSummary(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, ' ').trim();
  // 取第一个引号里的 AI 语气句优先
  const quoteMatch = cleaned.match(/[「『"]([^」』"]{4,40})[」』"]/);
  if (quoteMatch) return quoteMatch[1];
  // 否则取第一句
  const firstSentence = cleaned.split(/[。！？]/, 1)[0];
  return firstSentence.length > 38 ? firstSentence.slice(0, 38) + '…' : firstSentence;
}

const EVENT_ICON_HUE: Record<string, number> = {
  '💬': 200,
  '🎫': 320,
  '✈️': 215,
  '📦': 30,
  '🌃': 260,
  '☁️': 180,
};

function eventHue(label: string): number {
  const emoji = Array.from(label)[0];
  return EVENT_ICON_HUE[emoji] ?? 220;
}

const EventRow: React.FC<{ p: PresetPrompt; onPick: () => void }> = ({ p, onPick }) => {
  const hue = eventHue(p.label);
  return (
    <button type="button" className="event-row" onClick={onPick} style={{ ['--row-hue' as any]: String(hue) }}>
      <div className="event-row-icon">
        <span>{Array.from(p.label)[0]}</span>
      </div>
      <div className="event-row-text">
        <div className="event-row-title">{p.label.replace(/^\S+\s*/, '')}</div>
        <div className="event-row-sub">{extractSummary(p.prompt)}</div>
      </div>
      <div className="event-row-arrow" aria-hidden="true">›</div>
    </button>
  );
};

/* ───────────────────────────────────────────────────────────
   Ambient — 2 列网格 + 缩略图预览
   ─────────────────────────────────────────────────────────── */

const AMBIENT_THUMB_HUE: Record<string, number> = {
  '🫧': 200,
  '🌊': 250,
  '🪨': 50,
  '📊': 150,
  '📰': 30,
  '💭': 320,
  '🎵': 280,
  '🧲': 25,
  '⭐': 260,
  '🚀': 220,
};

const AmbientThumb: React.FC<{ p: PresetPrompt }> = ({ p }) => {
  const emoji: string = [...p.label][0] ?? '';
  const hue = AMBIENT_THUMB_HUE[emoji] ?? 220;
  // 不同氛围用不同的极简 SVG 缩略图
  return (
    <div className="ambient-thumb" style={{ ['--thumb-hue' as any]: String(hue) }}>
      <svg viewBox="0 0 100 70" preserveAspectRatio="xMidYMid slice" className="ambient-thumb-svg">
        <defs>
          <radialGradient id={`tg-${hue}`} cx="50%" cy="55%" r="60%">
            <stop offset="0%" stopColor={`oklch(0.65 0.14 ${hue})`} stopOpacity="0.85" />
            <stop offset="100%" stopColor={`oklch(0.12 0.04 ${hue})`} stopOpacity="1" />
          </radialGradient>
        </defs>
        <rect width="100" height="70" fill={`url(#tg-${hue})`} />
        {emoji === '🫧' && [[20, 40, 8], [55, 30, 12], [78, 45, 6], [38, 55, 5]].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
        ))}
        {emoji === '🌊' && (
          <circle cx="50" cy="40" r="14" fill={`oklch(0.78 0.12 ${hue} / 0.7)`} />
        )}
        {emoji === '🪨' && (
          <>
            {[15, 28, 41, 54].map((y, i) => (
              <path key={i} d={`M5 ${y} Q 25 ${y - 3} 50 ${y} T 95 ${y}`} stroke="rgba(220,200,170,0.45)" strokeWidth="0.6" fill="none" />
            ))}
            <ellipse cx="35" cy="48" rx="6" ry="3" fill={`oklch(0.32 0.04 ${hue})`} />
            <ellipse cx="68" cy="55" rx="9" ry="4" fill={`oklch(0.28 0.04 ${hue})`} />
          </>
        )}
        {emoji === '📊' && [22, 38, 54, 70, 86].map((x, i) => (
          <rect key={i} x={x} y={15 + i * 2} width="6" height={50 - i * 4} rx="1" fill={`oklch(0.7 0.13 ${hue} / ${0.45 + i * 0.08})`} />
        ))}
        {emoji === '📰' && (
          <>
            <rect x="12" y="10" width="76" height="2" fill="rgba(255,255,255,0.65)" />
            <rect x="12" y="18" width="60" height="14" fill="rgba(255,255,255,0.85)" />
            <rect x="12" y="42" width="40" height="1.4" fill="rgba(255,255,255,0.45)" />
            <rect x="12" y="48" width="55" height="1.4" fill="rgba(255,255,255,0.35)" />
            <rect x="12" y="54" width="30" height="1.4" fill="rgba(255,255,255,0.35)" />
          </>
        )}
        {emoji === '💭' && Array.from({ length: 5 }).map((_, i) => (
          <rect key={i} x={10 + i * 15} y={20 + (i % 2) * 18} width={12 + (i % 3) * 4} height="6" rx="3" fill={`oklch(0.72 0.1 ${hue + i * 8} / 0.7)`} />
        ))}
        {emoji === '🎵' && Array.from({ length: 16 }).map((_, i) => (
          <rect key={i} x={6 + i * 5.5} y={35 - Math.abs(Math.sin(i * 0.9) * 18)} width="2.5" height={Math.abs(Math.sin(i * 0.9) * 36)} rx="1" fill="rgba(255,255,255,0.7)" />
        ))}
        {emoji === '🧲' && ['是', '风', '在', '你', '心', '里'].map((ch, i) => (
          <text key={i} x={15 + (i % 3) * 28} y={25 + Math.floor(i / 3) * 22} fontSize="9" fill="rgba(255,255,255,0.85)" fontFamily="serif">{ch}</text>
        ))}
        {emoji === '⭐' && (
          <>
            {[[15, 18], [32, 30], [50, 22], [68, 35], [82, 18], [40, 50], [70, 55]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="1.3" fill="rgba(255,255,255,0.95)" />
            ))}
            <path d="M15 18 L32 30 L50 22 L68 35 L82 18" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" fill="none" />
          </>
        )}
        {emoji === '🚀' && (
          <>
            <rect width="100" height="70" fill="#06080f" />
            {Array.from({ length: 18 }).map((_, i) => (
              <rect key={i} x={(i * 13.7) % 100} y={(i * 7.3) % 70} width="1" height="1" fill="rgba(255,255,255,0.7)" />
            ))}
            <rect x="48" y="50" width="4" height="6" fill={`oklch(0.85 0.14 ${hue})`} />
          </>
        )}
      </svg>
    </div>
  );
};

const AmbientCard: React.FC<{ p: PresetPrompt; onPick: () => void }> = ({ p, onPick }) => {
  const summary = extractSummary(p.prompt);
  return (
    <button type="button" className="ambient-card" onClick={onPick}>
      <AmbientThumb p={p} />
      <div className="ambient-card-foot">
        <div className="ambient-card-title">{p.label}</div>
        <div className="ambient-card-sub">{summary}</div>
      </div>
    </button>
  );
};

/* ───────────────────────────────────────────────────────────
   HomeScreen — 三段式编辑型布局
   ─────────────────────────────────────────────────────────── */

export const HomeScreen: React.FC<HomeScreenProps> = ({ onGenerate, onResetApiKey }) => {
  const [input, setInput] = useState('');

  const { rhythm, events, ambient } = useMemo(() => ({
    rhythm: PRESET_PROMPTS.filter((p) => p.category === 'rhythm'),
    events: PRESET_PROMPTS.filter((p) => p.category === 'event'),
    ambient: PRESET_PROMPTS.filter((p) => p.category === 'experience'),
  }), []);

  const activeHour = useMemo(() => pickActiveHour(rhythm, new Date().getHours()), [rhythm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onGenerate(input.trim(), 'custom');
      setInput('');
    }
  };

  const pick = (p: PresetPrompt) => onGenerate(p.prompt, 'preset', p.prefabHtml);

  return (
    <div className="home-screen">
      <div className="home-brand">
        <div className="home-brand-lockup">
          <GlintHaloMark className="home-brand-mark" size={32} />
          <div className="home-brand-copy">
            <div className="home-brand-name">GLINT</div>
            <div className="home-brand-tag">某个时刻被轻轻点亮</div>
          </div>
        </div>
        {onResetApiKey && (
          <button
            type="button"
            className="home-brand-settings"
            onClick={onResetApiKey}
            aria-label="重置 API Key"
          >
            重置 Key
          </button>
        )}
      </div>

      <div className="home-title">你希望此刻的<br />屏幕是什么样？</div>

      <div className="home-sections">
        {/* —— 节律 —— */}
        <section className="home-section">
          <div className="home-section-header">
            <span className="home-section-title">此刻</span>
            <span className="home-section-sub">一天里的八个时刻</span>
          </div>
          <RhythmRail items={rhythm} activeHour={activeHour} onPick={pick} />
        </section>

        {/* —— 事件 —— */}
        <section className="home-section">
          <div className="home-section-header">
            <span className="home-section-title">事件</span>
            <span className="home-section-sub">突然发生的、需要被接住的</span>
          </div>
          <div className="event-list">
            {events.map((p, i) => <EventRow key={i} p={p} onPick={() => pick(p)} />)}
          </div>
        </section>

        {/* —— 氛围 —— */}
        <section className="home-section">
          <div className="home-section-header">
            <span className="home-section-title">氛围</span>
            <span className="home-section-sub">只为陪着你</span>
          </div>
          <div className="ambient-grid">
            {ambient.map((p, i) => <AmbientCard key={i} p={p} onPick={() => pick(p)} />)}
          </div>
        </section>
      </div>

      <form className="home-input-bar" onSubmit={handleSubmit}>
        <input
          className="home-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="或者，描述你想看到的..."
        />
        <button className="home-submit" type="submit" aria-label="生成">
          <GlintHaloMark className="home-submit-mark" size={28} />
        </button>
      </form>
    </div>
  );
};
