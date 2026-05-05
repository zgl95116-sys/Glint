import { describe, expect, it } from 'vitest';
import { isCachedRenderUsable, type CachedRender } from './renderCache';

function cache(overrides: Partial<CachedRender> = {}): CachedRender {
  return {
    momentId: 'flight:demo:1',
    sceneLabel: '航班动态',
    html: '<!doctype html><html><body><main>usable cached lockscreen html content that is long enough</main></body></html>',
    createdAt: '2026-05-05T10:00:00.000Z',
    expiresAt: '2026-05-05T11:00:00.000Z',
    ...overrides,
  };
}

describe('renderCache', () => {
  it('accepts a matching cache item before expiry', () => {
    expect(isCachedRenderUsable(
      cache(),
      { id: 'flight:demo:1' },
      new Date('2026-05-05T10:20:00.000Z'),
    )).toBe(true);
  });

  it('rejects expired cache entries', () => {
    expect(isCachedRenderUsable(
      cache(),
      { id: 'flight:demo:1' },
      new Date('2026-05-05T11:01:00.000Z'),
    )).toBe(false);
  });

  it('rejects entries for a different moment', () => {
    expect(isCachedRenderUsable(
      cache(),
      { id: 'meeting:demo:1' },
      new Date('2026-05-05T10:20:00.000Z'),
    )).toBe(false);
  });
});
