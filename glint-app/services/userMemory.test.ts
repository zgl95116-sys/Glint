import { describe, expect, it } from 'vitest';
import type { ResolvedMoment } from './momentEngine';
import {
  EMPTY_USER_MEMORY,
  applyMomentFeedback,
  applyMomentRendered,
  preferencesFromMemory,
  renderHistoryFromMemory,
} from './userMemory';

const baseMoment: ResolvedMoment = {
  id: 'flight:demo:1',
  type: 'flight',
  title: '航班动态',
  urgency: 'high',
  userNeed: 'action',
  facts: ['延误 55 分钟'],
  actions: [],
  visualMood: '机场雷达屏',
  voice: '差点乱了，但我替你算好了。',
  expiresAt: new Date('2026-05-05T11:00:00.000Z'),
  score: 96,
  source: '航旅纵横',
  rationale: '航班变更属于高焦虑、高行动价值事件。',
};

describe('userMemory', () => {
  it('turns useful feedback into future priority kinds', () => {
    const memory = applyMomentFeedback(
      EMPTY_USER_MEMORY,
      baseMoment,
      'useful',
      new Date('2026-05-05T10:00:00.000Z'),
    );

    expect(memory.momentWeights.flight).toBe(3);
    expect(preferencesFromMemory(memory).priorityKinds).toEqual(['flight']);
  });

  it('penalizes moments marked as wrong priority', () => {
    const liked = applyMomentFeedback(EMPTY_USER_MEMORY, baseMoment, 'useful');
    const corrected = applyMomentFeedback(liked, baseMoment, 'wrong_priority');

    expect(corrected.momentWeights.flight).toBe(-1);
    expect(preferencesFromMemory(corrected).priorityKinds).toEqual([]);
  });

  it('stores tone guidance for noisy or dark renders', () => {
    const quieted = applyMomentFeedback(EMPTY_USER_MEMORY, baseMoment, 'too_noisy');
    const brightened = applyMomentFeedback(quieted, baseMoment, 'too_dark');
    const preferences = preferencesFromMemory(brightened);

    expect(preferences.directness).toBe('calm');
    expect(preferences.visualTone).toContain('brighter');
    expect(preferences.avoidTones).toContain('信息过载');
    expect(preferences.avoidTones).toContain('过暗');
  });

  it('deduplicates render history by moment id', () => {
    const first = applyMomentRendered(
      EMPTY_USER_MEMORY,
      baseMoment,
      new Date('2026-05-05T10:00:00.000Z'),
    );
    const second = applyMomentRendered(
      first,
      { ...baseMoment, visualMood: '更清爽的机场雷达屏' },
      new Date('2026-05-05T10:05:00.000Z'),
    );

    const history = renderHistoryFromMemory(second);
    expect(history).toHaveLength(1);
    expect(history[0].visualMood).toBe('更清爽的机场雷达屏');
  });
});
