import React, { useState } from 'react';
import { setApiKey } from '../services/apiKeyStore';
import { validateApiKey, onApiKeyReady } from '../services/geminiService';
import { GlintHaloMark } from './GlintHaloMark';

interface ApiKeySetupProps {
  onReady: () => void;
}

type Phase = 'idle' | 'validating' | 'error';

export const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onReady }) => {
  const [value, setValue] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = value.trim();
    if (!key) return;
    setPhase('validating');
    setError('');
    try {
      await validateApiKey(key);
      setApiKey(key);
      onApiKeyReady();
      onReady();
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? String(err);
      setPhase('error');
      // Translate the most common cause to something the user can act on.
      if (/api[_\s]?key|invalid|permission|403|400/i.test(msg)) {
        setError('这个 key 无法访问 Gemini API，检查一下是否拷贝完整、是否在 Google AI Studio 启用了 API。');
      } else if (/network|fetch|failed to/i.test(msg)) {
        setError('网络请求失败，确认下网络后重试。');
      } else {
        setError(msg.slice(0, 200));
      }
    }
  };

  return (
    <div className="apikey-setup">
      <div className="apikey-card">
        <div className="apikey-brand">
          <GlintHaloMark className="apikey-brand-mark" size={36} />
          <div className="apikey-brand-name">GLINT</div>
        </div>
        <div className="apikey-title">先填一下 Gemini API Key</div>
        <div className="apikey-sub">
          Glint 直接调用你自己的 Gemini API。Key 只保存在这台设备上，不会上传任何服务器。
        </div>

        <form onSubmit={handleSubmit} className="apikey-form">
          <input
            className="apikey-input"
            type="password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (phase === 'error') setPhase('idle');
            }}
            placeholder="AIza..."
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={phase === 'validating'}
          />
          <button
            type="submit"
            className="apikey-submit"
            disabled={!value.trim() || phase === 'validating'}
          >
            {phase === 'validating' ? '验证中…' : '开始'}
          </button>
        </form>

        {phase === 'error' && (
          <div className="apikey-error">{error}</div>
        )}

        <div className="apikey-help">
          <span>没有 key？</span>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="apikey-help-link"
          >
            到 Google AI Studio 免费申请 →
          </a>
        </div>
      </div>
    </div>
  );
};
