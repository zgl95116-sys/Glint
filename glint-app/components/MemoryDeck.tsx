import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import type { MemoryCard } from '../constants/memory';

export interface MemoryDeckHandle {
  /**
   * Animate `phrases` from their respective card positions to the given
   * viewport rect (the sandbox iframe center), then resolve. The caller is
   * expected to start its generation in parallel, so perceived latency is
   * just the network TTFB, not network + animation.
   */
  flyPhrases(phrases: { cardId: string; text: string }[], targetRect: DOMRect): Promise<void>;
}

interface MemoryDeckProps {
  cards: MemoryCard[];
  /** Card ids currently lit up. Empty array means all cards are idle. */
  highlightIds: string[];
}

export const MemoryDeck = forwardRef<MemoryDeckHandle, MemoryDeckProps>(
  ({ cards, highlightIds }, ref) => {
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Fly-out animation is implemented in Task 5. For now expose a stub
    // with the full signature so the type contract compiles, but have it
    // resolve immediately so consumers can already await it.
    useImperativeHandle(ref, () => ({
      async flyPhrases(_phrases, _targetRect) {
        // Implemented in Task 5.
      },
    }));

    return (
      <div className="memory-deck" aria-hidden="true">
        {cards.map((card) => {
          const isLit = highlightIds.includes(card.id);
          return (
            <div
              key={card.id}
              ref={(el) => {
                if (el) cardRefs.current.set(card.id, el);
                else cardRefs.current.delete(card.id);
              }}
              className={`memory-card${isLit ? ' memory-card-lit' : ''}`}
            >
              {card.icon && <span className="memory-card-icon">{card.icon}</span>}
              <span className="memory-card-label">{card.label}</span>
              <span className="memory-card-phrase">{card.phrase}</span>
            </div>
          );
        })}
      </div>
    );
  },
);

MemoryDeck.displayName = 'MemoryDeck';
