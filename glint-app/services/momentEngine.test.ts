import { describe, expect, it } from 'vitest';
import {
  buildMomentPrompt,
  createDemoSignalSnapshot,
  resolveMoment,
  type SignalSnapshot,
} from './momentEngine';

function at(hour: number, minute = 0): Date {
  return new Date(2026, 4, 5, hour, minute, 0);
}

describe('momentEngine', () => {
  it('prioritizes a flight delay over daily rhythm', () => {
    const moment = resolveMoment(createDemoSignalSnapshot(at(17, 20)));

    expect(moment.type).toBe('flight');
    expect(moment.urgency).toBe('high');
    expect(moment.facts.join(' ')).toContain('延误 55 分钟');
    expect(moment.actions.map((a) => a.intent)).toContain('reschedule');
  });

  it('selects a meeting briefing before a near calendar event', () => {
    const now = at(10, 10);
    const snapshot: SignalSnapshot = {
      now,
      upcomingCalendar: [{
        title: '客户复盘',
        startsAt: new Date(now.getTime() + 15 * 60_000),
        location: 'A-12',
        attendees: ['王磊', '客户团队'],
      }],
    };

    const moment = resolveMoment(snapshot);

    expect(moment.type).toBe('meeting');
    expect(moment.title).toBe('会议马上开始');
    expect(moment.facts).toContain('地点：A-12');
    expect(moment.userNeed).toBe('focus');
  });

  it('uses evening companionship when repeated glances have no urgent event', () => {
    const moment = resolveMoment({
      now: at(19, 10),
      behavior: { repeatedGlances: 3, recentWakeCount: 6 },
    });

    expect(moment.type).toBe('evening');
    expect(moment.userNeed).toBe('companionship');
    expect(moment.rationale).toContain('晚间');
  });

  it('turns the chosen moment into a focused generation prompt', () => {
    const moment = resolveMoment(createDemoSignalSnapshot(at(17, 20)));
    const prompt = buildMomentPrompt(moment);

    expect(prompt).toContain('Moment 类型：flight');
    expect(prompt).toContain('关键信息，只能挑 1-2 个进入画面');
    expect(prompt).toContain('查可改签航班');
    expect(prompt).toContain('动态海报，而不是通知列表');
  });
});
