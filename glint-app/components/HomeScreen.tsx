import React, { useState } from 'react';
import { PRESET_PROMPTS } from '../constants/prompts';
import type { PromptSource } from '../services/geminiService';
import { GlintHaloMark } from './GlintHaloMark';

interface HomeScreenProps {
  onGenerate: (prompt: string, promptSource: PromptSource, prefabHtml?: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onGenerate }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onGenerate(input.trim(), 'custom');
      setInput('');
    }
  };

  return (
    <div className="home-screen">
      <div className="home-brand">
        <div className="home-brand-lockup">
          <GlintHaloMark className="home-brand-mark" size={26} />
          <div className="home-brand-copy">
            <div className="home-brand-name">GLINT</div>
            <div className="home-brand-tag">某个时刻被轻轻点亮</div>
          </div>
        </div>
      </div>
      <div className="home-title">你希望此刻的<br />屏幕是什么样？</div>

      <div className="home-chips">
        {PRESET_PROMPTS.map((p, i) => (
          <button
            key={i}
            className="home-chip"
            onClick={() => onGenerate(p.prompt, 'preset', p.prefabHtml)}
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
          <GlintHaloMark className="home-submit-mark" size={18} />
        </button>
      </form>
    </div>
  );
};
