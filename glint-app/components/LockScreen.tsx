import React, { forwardRef } from 'react';
import { Sandbox } from './Sandbox';
import { MemoryDeck, type MemoryDeckHandle } from './MemoryDeck';
import { MEMORY_DECK } from '../constants/memory';

interface LockScreenProps {
  htmlContent: string;
  isLoading: boolean;
  isActive: boolean;
  revealPhase: 'idle' | 'blurred' | 'revealing';
  sandboxSessionKey: number;
  highlightIds: string[];
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

export const LockScreen = forwardRef<MemoryDeckHandle, LockScreenProps>(
  ({ htmlContent, isLoading, isActive, revealPhase, sandboxSessionKey, highlightIds, onBack }, deckRef) => {
    return (
      <div className={`lock-screen${isActive ? ' lock-screen-active' : ' lock-screen-idle'}`}>
        <div className="lock-sandbox-wrap" style={FILTER_STYLES[revealPhase]}>
          <Sandbox key={sandboxSessionKey} htmlContent={htmlContent} />
        </div>

        <MemoryDeck ref={deckRef} cards={MEMORY_DECK} highlightIds={highlightIds} />

        {isActive && (
          <div className="lock-back-pill" onClick={onBack}>
            <span className="lock-back-brand">GLINT</span>
            <span className="lock-back-hint">{isLoading ? '生成中...' : '选择场景'}</span>
          </div>
        )}
      </div>
    );
  },
);

LockScreen.displayName = 'LockScreen';
