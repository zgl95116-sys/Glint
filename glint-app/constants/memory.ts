/**
 * Memory cards are the visible facts the "AI remembers" about the user in the
 * demo. In the real product these would be derived from phone signals; here
 * they are hand-authored and static. Every PresetPrompt in `prompts.ts`
 * references a subset of these by id through its `usedMemoryIds` field.
 *
 * Design rules:
 *   - `phrase` is the text that visibly flies into the generation. Keep it
 *     short (≤ 10 Chinese characters). It must read well both as a floating
 *     label on the card AND as a fragment embedded in the generated art.
 *   - `label` is the category shown on the card face. One or two characters.
 *   - `icon` is optional but recommended — it gives the card a visual anchor
 *     even when the viewer can't read the phrase from a distance.
 */
export interface MemoryCard {
  id: string;
  icon?: string;
  label: string;
  phrase: string;
}

export const MEMORY_DECK: MemoryCard[] = [
  { id: 'sleep_late',      icon: '🌙', label: '睡眠',  phrase: '昨晚 11:47 才睡' },
  { id: 'review_week',     icon: '📝', label: '工作',  phrase: '方案评审周' },
  { id: 'music_river',     icon: '🎵', label: '听歌',  phrase: '听《河流》到一半' },
  { id: 'flight_regular',  icon: '✈️', label: '出差',  phrase: '常飞北京-上海' },
  { id: 'hotel_preference',icon: '🏨', label: '住宿',  phrase: '每次都住全季' },
  { id: 'coffee_morning',  icon: '☕️', label: '习惯',  phrase: '早上必喝拿铁' },
  { id: 'weekly_report',   icon: '📄', label: '待办',  phrase: '周报拖了一周' },
  { id: 'gym_skipped',     icon: '🏃', label: '运动',  phrase: '三天没跑步了' },
];

export function resolveCards(ids: string[]): MemoryCard[] {
  return ids
    .map((id) => MEMORY_DECK.find((c) => c.id === id))
    .filter((c): c is MemoryCard => c !== undefined);
}
