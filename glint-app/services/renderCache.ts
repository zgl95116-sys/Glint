import type { ResolvedMoment } from './momentEngine';

const STORAGE_KEY = 'glint.render_cache.v1';
const MAX_CACHE_ITEMS = 12;

export interface CachedRender {
  momentId: string;
  sceneLabel: string;
  html: string;
  createdAt: string;
  expiresAt: string;
}

function readCache(): CachedRender[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCache(items: CachedRender[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_CACHE_ITEMS)));
}

export function isCachedRenderUsable(
  item: CachedRender,
  moment: Pick<ResolvedMoment, 'id'>,
  now: Date = new Date(),
): boolean {
  return (
    item.momentId === moment.id &&
    item.html.trim().length > 80 &&
    new Date(item.expiresAt).getTime() > now.getTime()
  );
}

export function getCachedRender(moment: ResolvedMoment, now: Date = new Date()): CachedRender | null {
  return readCache().find((item) => isCachedRenderUsable(item, moment, now)) ?? null;
}

export function saveCachedRender(
  moment: ResolvedMoment,
  html: string,
  sceneLabel: string,
  now: Date = new Date(),
): void {
  if (!html.trim() || html.length < 80) return;
  const next: CachedRender = {
    momentId: moment.id,
    sceneLabel,
    html,
    createdAt: now.toISOString(),
    expiresAt: moment.expiresAt.toISOString(),
  };

  const rest = readCache().filter((item) => item.momentId !== moment.id);
  writeCache([next, ...rest]);
}

export function clearRenderCache(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
