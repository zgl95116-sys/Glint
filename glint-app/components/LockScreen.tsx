import React from 'react';
import { Sandbox } from './Sandbox';

interface LockScreenProps {
  htmlContent: string;
  isLoading: boolean;
  onBack: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ htmlContent, isLoading, onBack }) => {
  const showLoading = isLoading && !htmlContent;

  return (
    <div className="lock-screen">
      {/* Loading state — a beautiful placeholder lockscreen */}
      {showLoading && (
        <div className="lock-loading">
          <div className="lock-loading-time">
            {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </div>
          <div className="lock-loading-date">
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
          </div>
          <div className="lock-loading-hint">
            <div className="lock-loading-dot" />
            Glint 正在为你生成...
          </div>
        </div>
      )}

      {/* AI generated content — full screen */}
      <Sandbox htmlContent={htmlContent} />

      {/* Minimal overlay — back pill */}
      <div className="lock-back-pill" onClick={onBack}>
        <span className="lock-back-brand">GLINT</span>
        <span className="lock-back-hint">{isLoading ? '生成中...' : '点击返回'}</span>
      </div>
    </div>
  );
};
