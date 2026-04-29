import React from 'react';
import { Sandbox } from './Sandbox';
import { GlintHaloMark } from './GlintHaloMark';

interface LockScreenProps {
  htmlContent: string;
  isLoading: boolean;
  isActive: boolean;
  revealPhase: 'idle' | 'blurred' | 'revealing';
  sandboxSessionKey: number;
  /** 当前正在展示的场景名（来自 preset.label 或自定义 prompt 摘要）；空 = 还没生成过 */
  sceneLabel?: string;
  onBack: () => void;
}

const FILTER_STYLES: Record<string, React.CSSProperties> = {
  idle: {},
  blurred: {
    filter: 'blur(14px) saturate(1.6)',
    transition: 'none',
  },
  revealing: {
    filter: 'blur(0px) saturate(1)',
    transition: 'filter 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
  },
};

export const LockScreen: React.FC<LockScreenProps> = ({
  htmlContent,
  isLoading,
  isActive,
  revealPhase,
  sandboxSessionKey,
  sceneLabel,
  onBack,
}) => {
  // Status chip 的右侧文案：
  //   loading 时 → "生成中…"（带呼吸点）
  //   idle + 有场景 → 当前场景标签
  //   idle + 没有场景（首次进入）→ "选择场景"
  const hint = isLoading
    ? '生成中…'
    : sceneLabel && sceneLabel.trim()
      ? sceneLabel
      : '选择场景';

  return (
    <div className={`lock-screen${isActive ? ' lock-screen-active' : ' lock-screen-idle'}`}>
      <div className="lock-sandbox-wrap" style={FILTER_STYLES[revealPhase]}>
        <Sandbox key={sandboxSessionKey} htmlContent={htmlContent} />
      </div>

      {isActive && (
        <button
          type="button"
          className={`lock-back-pill${isLoading ? ' lock-back-pill-loading' : ''}`}
          onClick={onBack}
          aria-label="切换场景"
        >
          <span className="lock-back-brand">
            <GlintHaloMark className="lock-back-mark" size={14} />
            <span className="lock-back-name">GLINT</span>
          </span>
          <span className="lock-back-divider" aria-hidden="true" />
          <span className="lock-back-hint">
            {isLoading && <span className="lock-back-loading-dot" aria-hidden="true" />}
            <span className="lock-back-hint-text">{hint}</span>
          </span>
        </button>
      )}
    </div>
  );
};
