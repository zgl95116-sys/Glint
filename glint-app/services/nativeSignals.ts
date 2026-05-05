import { Capacitor, registerPlugin } from '@capacitor/core';
import type { CalendarSignal, NotificationSignal, SignalSnapshot } from './momentEngine';
import { minimizeNotificationSignal } from './privacy';

interface NativeCalendarSignal {
  title?: string;
  startsAt?: string;
  location?: string;
}

interface NativeNotificationSignal {
  app?: string;
  title?: string;
  body?: string;
  receivedAt?: string;
  kind?: NotificationSignal['kind'];
}

interface NativeContextSnapshot {
  calendarPermission?: 'granted' | 'denied';
  notificationAccess?: 'granted' | 'denied';
  upcomingCalendar?: NativeCalendarSignal[];
  notifications?: NativeNotificationSignal[];
}

type PermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';

export interface NativeSignalStatus {
  isNative: boolean;
  calendar: PermissionState | 'unavailable';
  notificationAccess: 'granted' | 'denied' | 'unavailable';
  calendarCount: number;
  notificationCount: number;
}

interface GlintContextPlugin {
  getSnapshot(): Promise<NativeContextSnapshot>;
  checkPermissions(): Promise<{ calendar?: PermissionState }>;
  requestPermissions(options?: { permissions?: string[] }): Promise<{ calendar?: PermissionState }>;
  openNotificationSettings(): Promise<void>;
}

const GlintContext = registerPlugin<GlintContextPlugin>('GlintContext');

export const UNAVAILABLE_SIGNAL_STATUS: NativeSignalStatus = {
  isNative: false,
  calendar: 'unavailable',
  notificationAccess: 'unavailable',
  calendarCount: 0,
  notificationCount: 0,
};

function toCalendarSignal(item: NativeCalendarSignal): CalendarSignal | null {
  if (!item.title || !item.startsAt) return null;
  const startsAt = new Date(item.startsAt);
  if (Number.isNaN(startsAt.getTime())) return null;
  return {
    title: item.title,
    startsAt,
    location: item.location,
  };
}

function inferNotificationKind(item: NativeNotificationSignal): NotificationSignal['kind'] | undefined {
  if (item.kind) return item.kind;
  const text = `${item.title ?? ''} ${item.body ?? ''}`;
  if (/航班|延误|登机口|flight|gate/i.test(text)) return 'flight_delay';
  if (/快递|包裹|驿站|取件|delivery/i.test(text)) return 'delivery';
  if (/暴雨|大风|降温|预警|weather/i.test(text)) return 'weather_alert';
  if (/客户|老板|紧急|urgent/i.test(text)) return 'important_message';
  return undefined;
}

function toNotificationSignal(item: NativeNotificationSignal, now: Date): NotificationSignal | null {
  if (!item.title && !item.body) return null;
  const receivedAt = item.receivedAt ? new Date(item.receivedAt) : now;
  return minimizeNotificationSignal({
    app: item.app ?? 'Android',
    title: item.title ?? '',
    body: item.body ?? '',
    receivedAt: Number.isNaN(receivedAt.getTime()) ? now : receivedAt,
    kind: inferNotificationKind(item),
  });
}

export async function loadNativeSignals(now: Date = new Date()): Promise<Partial<SignalSnapshot> | null> {
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const snapshot = await GlintContext.getSnapshot();
    const upcomingCalendar = (snapshot.upcomingCalendar ?? [])
      .map(toCalendarSignal)
      .filter((item): item is CalendarSignal => Boolean(item));
    const notifications = (snapshot.notifications ?? [])
      .map((item) => toNotificationSignal(item, now))
      .filter((item): item is NotificationSignal => Boolean(item));

    return {
      upcomingCalendar,
      notifications,
      locationKind: 'unknown',
    };
  } catch (error) {
    console.warn('[GlintContext] native signals unavailable', error);
    return null;
  }
}

export async function getNativeSignalStatus(): Promise<NativeSignalStatus> {
  if (!Capacitor.isNativePlatform()) return UNAVAILABLE_SIGNAL_STATUS;

  try {
    const [permissions, snapshot] = await Promise.all([
      GlintContext.checkPermissions(),
      GlintContext.getSnapshot(),
    ]);

    return {
      isNative: true,
      calendar: permissions.calendar ?? snapshot.calendarPermission ?? 'unavailable',
      notificationAccess: snapshot.notificationAccess ?? 'denied',
      calendarCount: snapshot.upcomingCalendar?.length ?? 0,
      notificationCount: snapshot.notifications?.length ?? 0,
    };
  } catch (error) {
    console.warn('[GlintContext] native signal status unavailable', error);
    return { ...UNAVAILABLE_SIGNAL_STATUS, isNative: Capacitor.isNativePlatform() };
  }
}

export async function requestCalendarSignalPermission(): Promise<NativeSignalStatus> {
  if (!Capacitor.isNativePlatform()) return UNAVAILABLE_SIGNAL_STATUS;
  try {
    await GlintContext.requestPermissions({ permissions: ['calendar'] });
  } catch (error) {
    console.warn('[GlintContext] calendar permission request failed', error);
  }
  return getNativeSignalStatus();
}

export async function openNotificationSignalSettings(): Promise<NativeSignalStatus> {
  if (!Capacitor.isNativePlatform()) return UNAVAILABLE_SIGNAL_STATUS;
  try {
    await GlintContext.openNotificationSettings();
  } catch (error) {
    console.warn('[GlintContext] notification settings unavailable', error);
  }
  return getNativeSignalStatus();
}
