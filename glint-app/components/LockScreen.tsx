import React from 'react';
import { Sandbox } from './Sandbox';

interface LockScreenProps {
  htmlContent: string;
  isLoading: boolean;
  onBack: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ htmlContent, isLoading, onBack }) => {
  return (
    <div className="lock-screen">
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
