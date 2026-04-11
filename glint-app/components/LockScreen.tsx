import React from 'react';
import { Sandbox } from './Sandbox';

interface LockScreenProps {
  htmlContent: string;
  isLoading: boolean;
  isActive: boolean;
  revealPhase: 'idle' | 'blurred' | 'revealing';
  sandboxSessionKey: number;
  onBack: () => void;
}

const FILTER_STYLES: Record<string, React.CSSProperties> = {
  idle: {},
  // Instant blur — no transition, hides the content swap
  blurred: {
    filter: 'blur(14px) saturate(1.6)',
    transition: 'none',
  },
  // Slow deblur — content "develops" like a photograph
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
  onBack,
}) => {
  return (
    <div className={`lock-screen${isActive ? ' lock-screen-active' : ' lock-screen-idle'}`}>
      <div className="lock-sandbox-wrap" style={FILTER_STYLES[revealPhase]}>
        <Sandbox key={sandboxSessionKey} htmlContent={htmlContent} />
      </div>

      {isActive && (
        <div className="lock-back-pill" onClick={onBack}>
          <span className="lock-back-brand">GLINT</span>
          <span className="lock-back-hint">{isLoading ? '生成中...' : '点击返回'}</span>
        </div>
      )}
    </div>
  );
};
