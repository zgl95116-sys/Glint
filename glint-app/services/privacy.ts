import type { NotificationSignal } from './momentEngine';

const MAX_FACT_CHARS = 90;

function compact(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function redactSensitiveTokens(text: string): string {
  return compact(text)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[邮箱]')
    .replace(/(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/g, '[手机号]')
    .replace(/(?<!\d)\d{6,}(?!\d)/g, '[数字码]')
    .replace(/\b[A-Z]{1,3}\d{3,5}\b/g, '[编号]');
}

export function truncatePrivateFact(text: string, maxChars = MAX_FACT_CHARS): string {
  const redacted = redactSensitiveTokens(text);
  return redacted.length > maxChars ? `${redacted.slice(0, maxChars - 1)}…` : redacted;
}

export function minimizeNotificationSignal(signal: NotificationSignal): NotificationSignal {
  const title = truncatePrivateFact(signal.title, 54);
  const body = signal.kind
    ? truncatePrivateFact(signal.body, 86)
    : '';

  return {
    ...signal,
    title,
    body,
  };
}
