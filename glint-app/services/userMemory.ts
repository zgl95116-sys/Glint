import type { MomentType, RenderHistoryItem, ResolvedMoment, UserPreferences } from './momentEngine';

const STORAGE_KEY = 'glint.user_memory.v1';
const MAX_FEEDBACK_ITEMS = 40;
const MAX_RENDER_ITEMS = 24;

export type MomentFeedbackKind = 'useful' | 'wrong_priority' | 'too_noisy' | 'too_dark';

export interface MomentFeedbackItem {
  momentId: string;
  type: MomentType;
  kind: MomentFeedbackKind;
  createdAt: string;
}

interface StoredRenderItem {
  momentId: string;
  type: MomentType;
  visualMood: string;
  shownAt: string;
}

export interface UserMemoryState {
  momentWeights: Partial<Record<MomentType, number>>;
  visualTone?: string;
  directness?: UserPreferences['directness'];
  avoidTones: string[];
  feedbackHistory: MomentFeedbackItem[];
  renderHistory: StoredRenderItem[];
}

export const EMPTY_USER_MEMORY: UserMemoryState = {
  momentWeights: {},
  avoidTones: [],
  feedbackHistory: [],
  renderHistory: [],
};

function clampWeight(value: number): number {
  return Math.max(-12, Math.min(12, value));
}

function normalizeMemory(input: Partial<UserMemoryState> | null | undefined): UserMemoryState {
  return {
    ...EMPTY_USER_MEMORY,
    ...input,
    momentWeights: input?.momentWeights ?? {},
    avoidTones: Array.isArray(input?.avoidTones) ? input.avoidTones : [],
    feedbackHistory: Array.isArray(input?.feedbackHistory) ? input.feedbackHistory : [],
    renderHistory: Array.isArray(input?.renderHistory) ? input.renderHistory : [],
  };
}

function readMemory(): UserMemoryState {
  if (typeof window === 'undefined') return EMPTY_USER_MEMORY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_USER_MEMORY;
    return normalizeMemory(JSON.parse(raw));
  } catch {
    return EMPTY_USER_MEMORY;
  }
}

function writeMemory(memory: UserMemoryState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
}

export function loadUserMemory(): UserMemoryState {
  return readMemory();
}

export function saveUserMemory(memory: UserMemoryState): UserMemoryState {
  const normalized = normalizeMemory(memory);
  writeMemory(normalized);
  return normalized;
}

function uniqueAvoidTones(current: string[], additions: string[]): string[] {
  return Array.from(new Set([...current, ...additions])).slice(0, 8);
}

export function applyMomentFeedback(
  memory: UserMemoryState,
  moment: ResolvedMoment,
  kind: MomentFeedbackKind,
  now: Date = new Date(),
): UserMemoryState {
  const normalized = normalizeMemory(memory);
  const currentWeight = normalized.momentWeights[moment.type] ?? 0;
  const delta = kind === 'useful' ? 3 : kind === 'wrong_priority' ? -4 : -1;
  const nextWeight = clampWeight(currentWeight + delta);
  const feedback: MomentFeedbackItem = {
    momentId: moment.id,
    type: moment.type,
    kind,
    createdAt: now.toISOString(),
  };

  return {
    ...normalized,
    momentWeights: {
      ...normalized.momentWeights,
      [moment.type]: nextWeight,
    },
    directness: kind === 'too_noisy' ? 'calm' : normalized.directness,
    visualTone: kind === 'too_dark' ? 'clearer, brighter, lower contrast' : normalized.visualTone,
    avoidTones: kind === 'too_noisy'
      ? uniqueAvoidTones(normalized.avoidTones, ['信息过载', '高刺激'])
      : kind === 'too_dark'
        ? uniqueAvoidTones(normalized.avoidTones, ['过暗', '压抑'])
        : normalized.avoidTones,
    feedbackHistory: [feedback, ...normalized.feedbackHistory].slice(0, MAX_FEEDBACK_ITEMS),
  };
}

export function recordMomentFeedback(
  moment: ResolvedMoment,
  kind: MomentFeedbackKind,
  now: Date = new Date(),
): UserMemoryState {
  return saveUserMemory(applyMomentFeedback(loadUserMemory(), moment, kind, now));
}

export function applyMomentRendered(
  memory: UserMemoryState,
  moment: ResolvedMoment,
  now: Date = new Date(),
): UserMemoryState {
  const normalized = normalizeMemory(memory);
  const nextRender: StoredRenderItem = {
    momentId: moment.id,
    type: moment.type,
    visualMood: moment.visualMood,
    shownAt: now.toISOString(),
  };
  const rest = normalized.renderHistory.filter((item) => item.momentId !== moment.id);
  return {
    ...normalized,
    renderHistory: [nextRender, ...rest].slice(0, MAX_RENDER_ITEMS),
  };
}

export function recordMomentRendered(moment: ResolvedMoment, now: Date = new Date()): UserMemoryState {
  return saveUserMemory(applyMomentRendered(loadUserMemory(), moment, now));
}

export function preferencesFromMemory(memory: UserMemoryState): UserPreferences {
  const normalized = normalizeMemory(memory);
  const priorityKinds = Object.entries(normalized.momentWeights)
    .filter(([, weight]) => (weight ?? 0) > 0)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([type]) => type as MomentType);

  return {
    visualTone: normalized.visualTone,
    directness: normalized.directness,
    priorityKinds,
    avoidTones: normalized.avoidTones,
  };
}

export function renderHistoryFromMemory(memory: UserMemoryState): RenderHistoryItem[] {
  return normalizeMemory(memory).renderHistory.map((item) => ({
    type: item.type,
    visualMood: item.visualMood,
    shownAt: new Date(item.shownAt),
  }));
}

export function clearUserMemory(): UserMemoryState {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return EMPTY_USER_MEMORY;
}
