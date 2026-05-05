export type MomentType =
  | 'morning'
  | 'commute'
  | 'focus'
  | 'meeting'
  | 'flight'
  | 'delivery'
  | 'weather'
  | 'evening'
  | 'sleep'
  | 'idle';

export type MomentUrgency = 'low' | 'medium' | 'high';
export type UserNeed = 'reassurance' | 'action' | 'focus' | 'companionship';

export interface CalendarSignal {
  title: string;
  startsAt: Date;
  location?: string;
  attendees?: string[];
}

export interface NotificationSignal {
  app: string;
  title: string;
  body: string;
  receivedAt: Date;
  kind?: 'flight_delay' | 'delivery' | 'important_message' | 'weather_alert';
}

export interface WeatherSignal {
  condition: string;
  temperatureC?: number;
  highC?: number;
  lowC?: number;
  alert?: string;
}

export interface BehaviorSignal {
  recentWakeCount?: number;
  repeatedGlances?: number;
  lastUnlockSecondsAgo?: number;
}

export interface UserPreferences {
  visualTone?: string;
  directness?: 'calm' | 'direct' | 'poetic';
  priorityKinds?: MomentType[];
  avoidTones?: string[];
}

export interface RenderHistoryItem {
  type: MomentType;
  visualMood: string;
  shownAt: Date;
}

export interface SignalSnapshot {
  now: Date;
  locationKind?: 'home' | 'work' | 'airport' | 'transit' | 'unknown';
  weather?: WeatherSignal;
  upcomingCalendar?: CalendarSignal[];
  notifications?: NotificationSignal[];
  behavior?: BehaviorSignal;
  preferences?: UserPreferences;
  recentRenders?: RenderHistoryItem[];
}

export interface MomentAction {
  label: string;
  intent: 'open_app' | 'draft_reply' | 'navigate' | 'book_ride' | 'reschedule' | 'none';
}

export interface ResolvedMoment {
  id: string;
  type: MomentType;
  title: string;
  urgency: MomentUrgency;
  userNeed: UserNeed;
  facts: string[];
  actions: MomentAction[];
  visualMood: string;
  voice: string;
  expiresAt: Date;
  score: number;
  source: string;
  rationale: string;
}

interface CandidateMoment extends ResolvedMoment {
  baseScore: number;
}

const HOUR_MS = 60 * 60 * 1000;

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function minutesUntil(now: Date, future: Date): number {
  return Math.round((future.getTime() - now.getTime()) / 60_000);
}

function makeId(type: MomentType, now: Date, source: string): string {
  const bucket = Math.floor(now.getTime() / (15 * 60_000));
  return `${type}:${source}:${bucket}`;
}

function lineTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function firstCalendarEvent(snapshot: SignalSnapshot): CalendarSignal | undefined {
  const events = [...(snapshot.upcomingCalendar ?? [])]
    .filter((event) => event.startsAt.getTime() >= snapshot.now.getTime())
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return events[0];
}

function candidateFromNotifications(snapshot: SignalSnapshot): CandidateMoment[] {
  const now = snapshot.now;
  return (snapshot.notifications ?? []).flatMap((n): CandidateMoment[] => {
    const body = `${n.title} ${n.body}`;
    if (n.kind === 'flight_delay' || /航班|延误|登机口|flight|gate/i.test(body)) {
      return [{
        id: makeId('flight', now, n.app),
        type: 'flight',
        title: '航班动态',
        urgency: 'high',
        userNeed: 'action',
        facts: [n.title, n.body].filter(Boolean).slice(0, 3),
        actions: [
          { label: '查可改签航班', intent: 'reschedule' },
          { label: '联系酒店延迟入住', intent: 'open_app' },
        ],
        visualMood: '机场雷达屏，冷蓝网格，航线弧线和扫描线，强调局面仍可控',
        voice: '差点乱了，但我替你算好了。',
        expiresAt: addMinutes(now, 45),
        score: 0,
        baseScore: 96,
        source: n.app,
        rationale: '航班变更属于高焦虑、高行动价值事件，应该覆盖普通节律锁屏。',
      }];
    }

    if (n.kind === 'delivery' || /快递|包裹|驿站|取件|delivery/i.test(body)) {
      return [{
        id: makeId('delivery', now, n.app),
        type: 'delivery',
        title: '快递到了',
        urgency: 'medium',
        userNeed: 'action',
        facts: [n.title, n.body].filter(Boolean).slice(0, 3),
        actions: [{ label: '导航去驿站', intent: 'navigate' }],
        visualMood: '声呐同心圆，中心是发光包裹，数字和距离做成接近感',
        voice: '快到了。顺手拿一下就好。',
        expiresAt: addMinutes(now, 90),
        score: 0,
        baseScore: 72,
        source: n.app,
        rationale: '快递是短时效事件，适合在下一次亮屏给出最短路径。',
      }];
    }

    if (n.kind === 'important_message' || /客户|老板|张总|王磊|紧急|urgent/i.test(body)) {
      return [{
        id: makeId('meeting', now, n.app),
        type: 'meeting',
        title: '消息分诊',
        urgency: 'high',
        userNeed: 'action',
        facts: [n.title, n.body].filter(Boolean).slice(0, 2),
        actions: [{ label: '草拟回复', intent: 'draft_reply' }],
        visualMood: '信息分诊图，红色脉冲只突出一条最该处理的消息，其余噪音降到背景',
        voice: '先处理这一条就够了。',
        expiresAt: addMinutes(now, 30),
        score: 0,
        baseScore: 88,
        source: n.app,
        rationale: '重要消息需要分诊，不应该把所有通知平铺给用户。',
      }];
    }

    return [];
  });
}

function candidateFromCalendar(snapshot: SignalSnapshot): CandidateMoment[] {
  const event = firstCalendarEvent(snapshot);
  if (!event) return [];

  const now = snapshot.now;
  const mins = minutesUntil(now, event.startsAt);
  if (mins < 0 || mins > 120) return [];

  const facts = [
    `${lineTime(event.startsAt)} ${event.title}`,
    event.location ? `地点：${event.location}` : '',
    event.attendees?.length ? `参会：${event.attendees.slice(0, 4).join('、')}` : '',
  ].filter(Boolean);

  return [{
    id: makeId('meeting', now, event.title),
    type: 'meeting',
    title: mins <= 20 ? '会议马上开始' : '下一场会议',
    urgency: mins <= 20 ? 'high' : 'medium',
    userNeed: 'focus',
    facts,
    actions: [{ label: '打开会议资料', intent: 'open_app' }],
    visualMood: '极简 briefing slate，深色磨砂背景，单一琥珀强调，像会议前的情报卡',
    voice: mins <= 20 ? '别急，最重要的我放好了。' : '下一场已经替你捋过一遍。',
    expiresAt: addMinutes(event.startsAt, 15),
    score: 0,
    baseScore: mins <= 20 ? 86 : 62,
    source: 'calendar',
    rationale: `距离下一场会议 ${mins} 分钟，适合提前进入准备状态。`,
  }];
}

function candidateFromWeather(snapshot: SignalSnapshot): CandidateMoment[] {
  const weather = snapshot.weather;
  if (!weather?.alert) return [];

  const now = snapshot.now;
  return [{
    id: makeId('weather', now, weather.alert),
    type: 'weather',
    title: '天气变化',
    urgency: 'medium',
    userNeed: 'reassurance',
    facts: [
      weather.alert,
      weather.temperatureC == null ? weather.condition : `${weather.temperatureC}°C ${weather.condition}`,
    ],
    actions: [{ label: '查看出行建议', intent: 'open_app' }],
    visualMood: '沉浸式天气场，雨线或风线成为主视觉，信息只保留一条出行建议',
    voice: '外面变天了，我帮你把重点留在这。',
    expiresAt: addMinutes(now, 90),
    score: 0,
    baseScore: 68,
    source: 'weather',
    rationale: '天气预警会改变出门决策，优先级高于普通氛围锁屏。',
  }];
}

function candidateFromRhythm(snapshot: SignalSnapshot): CandidateMoment {
  const now = snapshot.now;
  const hour = now.getHours();

  if (hour >= 6 && hour < 9) {
    return {
      id: makeId('morning', now, 'rhythm'),
      type: 'morning',
      title: '晨间第一眼',
      urgency: 'low',
      userNeed: 'reassurance',
      facts: [
        snapshot.weather?.temperatureC == null
          ? '今天整体是稳的'
          : `${snapshot.weather.temperatureC}°C ${snapshot.weather.condition}`,
        firstCalendarEvent(snapshot)?.title ? `下一件事：${firstCalendarEvent(snapshot)?.title}` : '没有立刻要处理的事',
      ],
      actions: [],
      visualMood: '窗帘缝透进第一道光，暖琥珀渐变，极慢呼吸动画，低信息密度',
      voice: '先醒过来，今天不用一开始就紧绷。',
      expiresAt: addMinutes(now, 90),
      score: 0,
      baseScore: 54,
      source: 'rhythm',
      rationale: '早晨第一次亮屏需要安心感，而不是任务堆叠。',
    };
  }

  if (hour >= 9 && hour < 12) {
    return {
      id: makeId('focus', now, 'rhythm'),
      type: 'focus',
      title: '专注保护',
      urgency: 'low',
      userNeed: 'focus',
      facts: ['没有需要立刻处理的事', '继续当前工作'],
      actions: [],
      visualMood: '大面积留白，三个绿色状态点，屏幕像在替用户守住边界',
      voice: '没有急事。继续。',
      expiresAt: addMinutes(now, 75),
      score: 0,
      baseScore: 50,
      source: 'rhythm',
      rationale: '上午专注时段应该低打扰。',
    };
  }

  if (hour >= 17 && hour < 20) {
    return {
      id: makeId('evening', now, 'rhythm'),
      type: 'evening',
      title: '晚间选择',
      urgency: 'low',
      userNeed: 'companionship',
      facts: ['工作模式正在收尾', '给今晚留一个轻选择'],
      actions: [],
      visualMood: '深蓝城市夜色，三个发光节点像星座一样展开可能性',
      voice: '或者什么都不做也行。',
      expiresAt: addMinutes(now, 120),
      score: 0,
      baseScore: 58,
      source: 'rhythm',
      rationale: '晚间迷茫高峰需要给选择，而不是继续催任务。',
    };
  }

  if (hour >= 22 || hour < 6) {
    return {
      id: makeId('sleep', now, 'rhythm'),
      type: 'sleep',
      title: '深夜陪伴',
      urgency: 'low',
      userNeed: 'companionship',
      facts: ['降低亮度和信息密度', '避免继续刷手机'],
      actions: [],
      visualMood: '极暗月光，唯一冷光源，所有动画慢到像呼吸',
      voice: '还能再睡一会儿。',
      expiresAt: addMinutes(now, 90),
      score: 0,
      baseScore: 56,
      source: 'rhythm',
      rationale: '深夜场景要减少刺激，提供陪伴而不是增长使用时长。',
    };
  }

  return {
    id: makeId('idle', now, 'rhythm'),
    type: 'idle',
    title: '此刻速览',
    urgency: 'low',
    userNeed: 'reassurance',
    facts: ['挑一件当前最值得知道的事', '其余保持安静'],
    actions: [],
    visualMood: '克制的生成海报，少量数据成为视觉材料，大面积安静空间',
    voice: '我只把重要的留下。',
    expiresAt: addMinutes(now, 60),
    score: 0,
    baseScore: 44,
    source: 'rhythm',
    rationale: '没有强事件时，展示轻量的一眼界面。',
  };
}

function applyBehaviorBoost(moment: CandidateMoment, snapshot: SignalSnapshot): number {
  const repeated = snapshot.behavior?.repeatedGlances ?? 0;
  if (repeated < 2) return 0;
  if (moment.type === 'evening' || moment.type === 'idle') return 12;
  if (moment.urgency === 'high') return 4;
  return 0;
}

function applyPreferenceBoost(moment: CandidateMoment, snapshot: SignalSnapshot): number {
  const priorities = snapshot.preferences?.priorityKinds ?? [];
  return priorities.includes(moment.type) ? 8 : 0;
}

function applyRecentRenderPenalty(moment: CandidateMoment, snapshot: SignalSnapshot): number {
  const recent = snapshot.recentRenders ?? [];
  const sixHoursAgo = snapshot.now.getTime() - 6 * HOUR_MS;
  const sameType = recent.some((item) => item.type === moment.type && item.shownAt.getTime() >= sixHoursAgo);
  const sameMood = recent.some((item) => item.visualMood === moment.visualMood && item.shownAt.getTime() >= sixHoursAgo);
  return (sameType ? 7 : 0) + (sameMood ? 5 : 0);
}

export function resolveMoment(snapshot: SignalSnapshot): ResolvedMoment {
  const candidates: CandidateMoment[] = [
    ...candidateFromNotifications(snapshot),
    ...candidateFromCalendar(snapshot),
    ...candidateFromWeather(snapshot),
    candidateFromRhythm(snapshot),
  ];

  const scored = candidates.map((candidate) => {
    const score =
      candidate.baseScore +
      applyBehaviorBoost(candidate, snapshot) +
      applyPreferenceBoost(candidate, snapshot) -
      applyRecentRenderPenalty(candidate, snapshot);
    return { ...candidate, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const { baseScore: _baseScore, ...moment } = scored[0];
  return moment;
}

export function buildMomentPrompt(moment: ResolvedMoment): string {
  const actions = moment.actions.length
    ? moment.actions.map((action) => `- ${action.label}`).join('\n')
    : '- 不需要动作按钮，保持安静';

  return `Glint Moment 内核已经选出当前最值得展示的锁屏。

Moment 类型：${moment.type}
标题：${moment.title}
紧急度：${moment.urgency}
用户此刻需要：${moment.userNeed}
为什么现在出现：${moment.rationale}

关键信息，只能挑 1-2 个进入画面：
${moment.facts.map((fact) => `- ${fact}`).join('\n')}

可执行动作：
${actions}

视觉方向：${moment.visualMood}
AI 语气：${moment.voice}

请生成一张完整的 Glint 锁屏 HTML：它应该像一张为此刻定制的动态海报，而不是通知列表。第一眼要能知道重点；文字要少；如果有动作按钮，按钮要融入画面。`;
}

export function createDemoSignalSnapshot(now: Date = new Date()): SignalSnapshot {
  const hour = now.getHours();
  const upcoming: CalendarSignal[] = [];
  const notifications: NotificationSignal[] = [];

  if (hour >= 8 && hour < 11) {
    upcoming.push({
      title: '产品评审',
      startsAt: addMinutes(now, 45),
      location: 'B-803',
      attendees: ['张总', '李明', '产品组'],
    });
  }

  if (hour >= 16 && hour < 18) {
    notifications.push({
      app: '航旅纵横',
      title: 'CA1893 航班动态更新',
      body: '航班延误 55 分钟，登机口从 G12 改到 H23。',
      receivedAt: addMinutes(now, -3),
      kind: 'flight_delay',
    });
  }

  if (hour >= 12 && hour < 14) {
    notifications.push({
      app: '京东',
      title: '快递已到附近驿站',
      body: '预计 5 分钟可取，取件码 528190。',
      receivedAt: addMinutes(now, -8),
      kind: 'delivery',
    });
  }

  return {
    now,
    locationKind: hour >= 8 && hour < 19 ? 'work' : 'home',
    weather: {
      condition: hour >= 18 || hour < 6 ? '微风' : '晴',
      temperatureC: hour >= 18 || hour < 6 ? 18 : 22,
      highC: 24,
      lowC: 12,
      alert: hour >= 7 && hour < 9 ? '下午温差大，出门带件外套' : undefined,
    },
    upcomingCalendar: upcoming,
    notifications,
    behavior: {
      recentWakeCount: hour >= 19 ? 5 : 2,
      repeatedGlances: hour >= 19 ? 3 : 0,
      lastUnlockSecondsAgo: 180,
    },
    preferences: {
      directness: hour >= 16 && hour < 18 ? 'direct' : 'calm',
      priorityKinds: ['flight', 'meeting', 'commute'],
      avoidTones: ['鸡汤', '信息流'],
    },
    recentRenders: [],
  };
}
