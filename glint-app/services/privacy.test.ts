import { describe, expect, it } from 'vitest';
import { minimizeNotificationSignal, redactSensitiveTokens, truncatePrivateFact } from './privacy';
import type { NotificationSignal } from './momentEngine';

describe('privacy minimization', () => {
  it('redacts emails, phone numbers, and long numeric codes', () => {
    const text = '联系 test@example.com 或 13800138000，取件码 528190，订单 1234567890';

    expect(redactSensitiveTokens(text)).toBe('联系 [邮箱] 或 [手机号]，取件码 [数字码]，订单 [数字码]');
  });

  it('truncates long private facts after redaction', () => {
    const text = '这是一条很长的通知内容，用来验证进入 prompt 前会被截断，避免把完整原始通知内容直接送入生成链路。';

    expect(truncatePrivateFact(text, 24)).toHaveLength(24);
    expect(truncatePrivateFact(text, 24).endsWith('…')).toBe(true);
  });

  it('drops body text for unknown notification kinds', () => {
    const signal: NotificationSignal = {
      app: 'Chat',
      title: '普通通知',
      body: '这里可能有完整聊天内容 13800138000',
      receivedAt: new Date('2026-05-05T10:00:00.000Z'),
    };

    expect(minimizeNotificationSignal(signal).body).toBe('');
  });

  it('keeps recognized high-value notification facts but redacts secrets', () => {
    const signal: NotificationSignal = {
      app: '京东',
      title: '快递已到附近驿站',
      body: '预计 5 分钟可取，取件码 528190。',
      receivedAt: new Date('2026-05-05T10:00:00.000Z'),
      kind: 'delivery',
    };

    expect(minimizeNotificationSignal(signal).body).toBe('预计 5 分钟可取，取件码 [数字码]。');
  });
});
