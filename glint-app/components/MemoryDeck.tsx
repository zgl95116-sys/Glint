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

    useImperativeHandle(ref, () => ({
      async flyPhrases(phrases, targetRect) {
        const animations = phrases.map(({ cardId, text }) => {
          const cardEl = cardRefs.current.get(cardId);
          if (!cardEl) return Promise.resolve();

          const cardRect = cardEl.getBoundingClientRect();
          const startX = cardRect.left + cardRect.width / 2;
          const startY = cardRect.top + cardRect.height / 2;
          const endX = targetRect.left + targetRect.width / 2;
          const endY = targetRect.top + targetRect.height / 2;

          const span = document.createElement('span');
          span.textContent = text;
          span.style.cssText = `
            position: fixed;
            left: ${startX}px;
            top: ${startY}px;
            transform: translate(-50%, -50%) scale(1);
            font-size: 13px;
            font-weight: 400;
            color: rgba(255, 240, 200, 0.95);
            text-shadow: 0 2px 16px rgba(255, 220, 150, 0.6);
            pointer-events: none;
            z-index: 100;
            white-space: nowrap;
            font-family: var(--font-display, -apple-system, sans-serif);
          `;
          document.body.appendChild(span);

          const dx = endX - startX;
          const dy = endY - startY;

          const anim = span.animate(
            [
              { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
              { transform: 'translate(-50%, -50%) scale(1.15)', opacity: 1, offset: 0.15 },
              { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.4)`, opacity: 1, offset: 0.75 },
              { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.6)`, opacity: 0 },
            ],
            { duration: 700, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)', fill: 'forwards' },
          );

          return anim.finished.then(
            () => span.remove(),
            () => span.remove(),
          );
        });

        await Promise.all(animations);
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
