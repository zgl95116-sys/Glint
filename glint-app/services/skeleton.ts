// Bridge: real lockscreen screenshot as background + mock notification overlay.
// Shows a faithful lockscreen while Glint generates AI content behind a blur.

import { LOCKSCREEN_BG } from './lockscreen-bg';

// ── Hashing ──────────────────────────────────────────────

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) & 0xffffffff;
  return h >>> 0;
}

// ── Time / dark-mode helpers ─────────────────────────────

function extractTime(prompt: string): string {
  const m = prompt.match(/(\d{1,2})[::：](\d{2})/);
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function detectDark(prompt: string): boolean {
  if (/cyber|赛博|深夜/.test(prompt)) return true;
  const m = prompt.match(/(\d{1,2})[::：]\d{2}/);
  if (m) { const h = parseInt(m[1]); return h >= 19 || h < 6; }
  return /夜|晚/.test(prompt);
}

// ── Palettes ─────────────────────────────────────────────

interface Palette { colors: [string, string, string]; accent: string }

const LIGHT_PALETTES: Palette[] = [
  { colors: ['#f5e6d3', '#e8c49a', '#fef3e2'], accent: '#c9a55a' },
  { colors: ['#fde2c0', '#f8d0a0', '#fef8f0'], accent: '#e8a87c' },
  { colors: ['#e8f0e4', '#d5e3cf', '#f0ebe3'], accent: '#7da47a' },
  { colors: ['#e6e0f0', '#d8d0e8', '#f0ecf5'], accent: '#9b8ec4' },
  { colors: ['#ddeef5', '#c8e2ee', '#f0f6fa'], accent: '#5c9ab5' },
];

const DARK_PALETTES: Palette[] = [
  { colors: ['#0a0d1a', '#1a1040', '#0d2040'], accent: '#4a8cff' },
  { colors: ['#1a1025', '#2d1b40', '#0f1a30'], accent: '#b388ff' },
  { colors: ['#0a0a14', '#0d1b2a', '#1b2838'], accent: '#00e5ff' },
  { colors: ['#1a0a0a', '#2d1515', '#1a0d1a'], accent: '#ff5252' },
  { colors: ['#0d1a14', '#0a1a10', '#1a2a1a'], accent: '#69f0ae' },
];

function pickPalette(prompt: string, dark: boolean): Palette {
  const palettes = dark ? DARK_PALETTES : LIGHT_PALETTES;
  if (/杂志|金|magazine|晨|早安/.test(prompt)) return (dark ? DARK_PALETTES : LIGHT_PALETTES)[0];
  if (/cyber|赛博|霓虹|科技/.test(prompt)) return DARK_PALETTES[2];
  if (/雨|水|蓝/.test(prompt)) return dark ? DARK_PALETTES[0] : LIGHT_PALETTES[4];
  if (/紧急|改会|截止|航班/.test(prompt)) return DARK_PALETTES[3];
  if (/生日|温暖|贺卡|重逢/.test(prompt)) return (dark ? DARK_PALETTES : LIGHT_PALETTES)[1];
  if (/禅|极简|水墨/.test(prompt)) return dark ? DARK_PALETTES[1] : LIGHT_PALETTES[3];
  return palettes[hash(prompt) % palettes.length];
}

// ── Scene detection ──────────────────────────────────────

function detectScene(prompt: string): string {
  if (/晨间|早安/.test(prompt) || (/简报/.test(prompt) && /早|晨|[67]:/.test(prompt))) return '晨间简报';
  if (/通勤|上班路/.test(prompt)) return '通勤导航';
  if (/面试/.test(prompt)) return '面试准备';
  if (/生日/.test(prompt)) return '生日提醒';
  if (/午餐|午饭|午间/.test(prompt)) return '午餐推荐';
  if (/改会|临时.*会|会议.*提前/.test(prompt)) return '会议速报';
  if (/雨天|下.*雨|大雨/.test(prompt)) return '天气提醒';
  if (/速览|筛选|浏览/.test(prompt)) return '信息速览';
  if (/快递|配送|物流|送达/.test(prompt)) return '快递追踪';
  if (/航班|机场|起飞|登机/.test(prompt)) return '航班动态';
  if (/到站|重逢|接.*人/.test(prompt)) return '到站提醒';
  if (/开票|抢票|演唱|巡演|预售/.test(prompt)) return '开票倒计时';
  if (/假期|旅行|度假|年假/.test(prompt)) return '假期倒计时';
  if (/offer/i.test(prompt)) return 'Offer 决策';
  if (/睡|晚安|回顾/.test(prompt)) return '今日回顾';
  if (/资讯|新闻|热议/.test(prompt)) return '资讯速览';

  // ── Custom prompt: extract a descriptive label from the input ──
  const styleTags: [RegExp, string][] = [
    [/赛博朋克/, '赛博朋克'], [/蒸汽波/, '蒸汽波'], [/极简|简约/, '极简风格'],
    [/水墨|国风|中国风/, '国风水墨'], [/复古|怀旧/, '复古风格'], [/日式|和风/, '和风美学'],
    [/ins风/, 'INS 美学'], [/科技感|未来感/, '未来科技'], [/像素风/, '像素风格'],
    [/杂志风/, '杂志排版'], [/电影感|胶片/, '电影色调'], [/涂鸦/, '涂鸦风格'],
    [/毛玻璃|玻璃/, '毛玻璃'], [/霓虹/, '霓虹灯光'], [/3[dD]|立体/, '3D 立体'],
    [/卡通|插画/, '插画风格'], [/渐变/, '渐变色彩'], [/暗黑|哥特/, '暗黑风格'],
    [/星空|银河/, '星空夜景'], [/海洋|大海/, '海洋主题'], [/森林|树林/, '森林秘境'],
    [/城市|都市/, '都市夜景'], [/山水|山脉/, '山水意境'],
    [/春天|春日/, '春日物语'], [/夏天|盛夏/, '盛夏时光'], [/秋天|金秋/, '金秋时节'],
    [/冬天|冬日/, '冬日暖阳'], [/樱花/, '樱花季'], [/日出|日落|夕阳/, '光影时刻'],
    [/温暖|温馨/, '温馨时刻'], [/清新/, '清新自然'], [/浪漫/, '浪漫氛围'],
    [/治愈/, '治愈系'], [/禅|冥想/, '禅意空间'], [/梦幻/, '梦幻世界'],
    [/黑白/, '黑白光影'], [/音乐/, '音乐律动'], [/猫|喵/, '猫咪日常'],
    [/花/, '花语'], [/雨|雪/, '天气意境'], [/月亮|月色/, '月色清辉'],
  ];
  for (const [pat, label] of styleTags) {
    if (pat.test(prompt)) return label;
  }

  // Last resort: take first few meaningful chars from the prompt
  const trimmed = prompt.replace(/给我|帮我|我想要?|我要|一个|来个|做一个/g, '').replace(/[锁屏壁纸风格主题背景设计的了个着，。、！？\s]/g, '').slice(0, 6);
  return trimmed || '灵感创作';
}

function extractDayPrefix(prompt: string): string {
  const m = prompt.match(/周[一二三四五六日天]/);
  return m ? m[0] + ' · ' : '';
}

// ── Keyword extraction ───────────────────────────────────

interface BridgeKeyword { icon: string; text: string }

function extractKeywords(prompt: string): BridgeKeyword[] {
  const kws: BridgeKeyword[] = [];
  const usedIcons = new Set<string>();

  const add = (icon: string, text: string) => {
    if (!usedIcons.has(icon) && kws.length < 5) {
      usedIcons.add(icon);
      kws.push({ icon, text });
    }
  };

  let m: RegExpMatchArray | null;

  // ── Specific data ──

  // Temperature
  m = prompt.match(/(\d+)°C/);
  if (m) add('🌡', `${m[1]}°C`);

  // Subway line
  m = prompt.match(/(\d+)号线/);
  if (m) add('🚇', `${m[1]}号线`);

  // Flight delay
  m = prompt.match(/延误(\d+)分/);
  if (m) add('⚠️', `延误${m[1]}min`);

  // Gate change
  m = prompt.match(/([A-Z]\d+).*登机/);
  if (m) add('🚪', `→ ${m[1]}`);

  // Countdown (天/分钟)
  m = prompt.match(/(?:还有|距\S{0,6}?)(\d+)(天|分钟|分)/);
  if (m) add('⏳', `${m[1]}${m[2] === '分' ? '分钟' : m[2]}`);

  // Steps
  m = prompt.match(/走了?(\d+)步/);
  if (m) add('🚶', `${m[1]}步`);

  // Screen time
  m = prompt.match(/屏幕(\d+)小时(\d+)分/);
  if (m) add('📱', `${m[1]}h${m[2]}m`);

  // Percentage lift
  m = prompt.match(/(?:提升|增长)了?(\d+)%/);
  if (m) add('📊', `+${m[1]}%`);

  // Rating
  m = prompt.match(/(\d\.\d)分/);
  if (m) add('⭐', `${m[1]}分`);

  // N messages/updates
  m = prompt.match(/(\d+)条/);
  if (m && parseInt(m[1]) > 1) add('📬', `${m[1]}条待处理`);

  // Minutes until arrival
  m = prompt.match(/(\d+)分钟(?:到|后)/);
  if (m) add('⏱', `${m[1]}分钟`);

  // Days apart
  m = prompt.match(/(\d+)天没见/);
  if (m) add('💕', `${m[1]}天未见`);

  // Friend / person name
  m = prompt.match(/好友(\S{2,4})/);
  if (m) add('💫', m[1]);

  // Specific person title (张总, 王老师, etc.) — require common surname as first char
  m = prompt.match(/([赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳酆鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄][\u4e00-\u9fa5]?(?:总|老师|导师))/);
  if (m && !usedIcons.has('👤')) add('👤', m[1]);

  // Product name
  m = prompt.match(/(AirPods\s*\w*)/i);
  if (m) add('🎧', m[1].trim());

  // Band / artist
  m = prompt.match(/告五人|周杰伦|Taylor Swift/i);
  if (m) add('🎤', m[0]);

  // Location
  m = prompt.match(/大理|上海|北京|三里屯|洱海/);
  if (m) add('📍', m[0]);

  // ── Category fallbacks ──

  const cats: [RegExp, string, string][] = [
    [/晴|阳光/, '☀️', '晴天'],
    [/雨/, '🌧', '有雨'],
    [/航班|飞机|机场/, '✈️', '航班'],
    [/高铁|列车/, '🚄', '列车'],
    [/面试/, '🎯', '面试'],
    [/快递|配送|送达/, '📦', '快递'],
    [/offer/i, '💼', 'Offer'],
    [/会议|周会|项目会|评审/, '📋', '会议'],
    [/播客/, '🎵', '播客'],
    [/健身|运动/, '🏃', '运动'],
    [/午餐|美食|餐厅/, '🍽', '美食'],
    [/假期|旅行|度假/, '🏖', '假期'],
    [/脉脉|资讯|热议/, '📰', '资讯'],
    [/决策|选择|比较/, '⚖️', '决策'],
    [/睡|回顾|日记/, '🌙', '回顾'],
    [/日程|日历|待办/, '📅', '日程'],
    [/紧急|临时/, '⚡', '紧急'],
    [/消息|微信|飞书/, '💬', '消息'],
    [/倒计时/, '⏳', '倒计时'],
    [/重逢|想念/, '💫', '重逢'],
    [/伞|外套/, '🧥', '穿搭建议'],
    [/优惠|满减|折扣/, '🏷', '优惠'],
    [/古诗|诗/, '📜', '诗句'],
  ];

  for (const [pat, icon, text] of cats) {
    if (kws.length >= 5) break;
    if (pat.test(prompt) && !usedIcons.has(icon)) add(icon, text);
  }

  // ── Pass 3: Display-word extraction (covers custom/short prompts) ──
  // Users typing "赛博朋克风格" or "简约黑白锁屏" need their words shown back.

  if (kws.length < 3) {
    const displayWords: [RegExp, string][] = [
      // Styles
      [/赛博朋克/, '🌃'], [/蒸汽波/, '🌈'], [/极简|简约/, '◻️'],
      [/水墨|国风|中国风/, '🎨'], [/复古|怀旧/, '📷'], [/日式|和风/, '🏮'],
      [/ins风|潮流/, '✨'], [/科技感|未来感/, '🔮'], [/像素风/, '👾'],
      [/杂志风/, '📰'], [/电影感|胶片/, '🎬'], [/涂鸦/, '🖍'],
      [/渐变/, '🌈'], [/玻璃|毛玻璃/, '💎'], [/霓虹/, '💡'],
      [/3[dD]|立体/, '🧊'], [/卡通|插画/, '🖼'],
      // Nature / Theme
      [/星空|银河/, '🌌'], [/海洋|大海/, '🌊'], [/森林|树林/, '🌲'],
      [/城市|都市/, '🏙'], [/山水|山脉/, '⛰️'],
      [/春天|春日/, '🌸'], [/夏天|盛夏/, '☀️'], [/秋天|金秋/, '🍂'], [/冬天|冬日/, '❄️'],
      [/樱花/, '🌸'], [/落叶/, '🍂'], [/雪景/, '🌨'],
      [/日出|日落|夕阳/, '🌅'], [/月亮|月色/, '🌙'], [/彩虹/, '🌈'],
      // Mood
      [/温暖|温馨/, '🔥'], [/清新/, '🍃'], [/浪漫/, '💫'],
      [/治愈/, '💚'], [/安静|宁静|禅/, '🧘'], [/梦幻/, '🦋'],
      [/活力|能量/, '⚡'], [/高级感/, '✦'],
      // Color
      [/黑白/, '⚫'], [/蓝色|蓝调/, '🔵'], [/粉色|粉红/, '🩷'],
      [/金色/, '🥇'], [/绿色/, '🟢'], [/紫色/, '🟣'], [/红色/, '🔴'],
      // Content
      [/锁屏/, '🔒'], [/壁纸/, '🖼'], [/早安/, '🌅'], [/晚安/, '🌙'],
      [/生日/, '🎂'], [/音乐/, '🎵'], [/花/, '🌺'], [/猫|喵/, '🐱'],
      [/天气/, '🌤'], [/时钟|时间/, '🕐'],
    ];

    const usedTexts = new Set(kws.map((k) => k.text));
    for (const [pat, icon] of displayWords) {
      if (kws.length >= 5) break;
      const dm = prompt.match(pat);
      if (dm && !usedTexts.has(dm[0]) && !usedIcons.has(icon)) {
        add(icon, dm[0]);
        usedTexts.add(dm[0]);
      }
    }
  }

  // ── Pass 4: Split user input into word segments as keywords ──
  // Whatever the user typed is inherently relevant — show their words back.
  if (kws.length < 3) {
    const usedTexts = new Set(kws.map((k) => k.text));
    // Strip filler phrases, then grammatical particles (的了个着得过)
    const stripped = prompt
      .replace(/给我|帮我|请给|我想要?|我要|一个|来个|做一个|想看到?|看一下|可以吗/g, '')
      .replace(/[的了个着得过把被和与，。、！？：；\s]/g, '');
    // Chinese: 2-char segments (most Chinese words are 2 chars)
    // English: whole words
    const zhSegs = stripped.match(/[\u4e00-\u9fa5]{2}/g) || [];
    const enSegs = stripped.match(/[A-Za-z][A-Za-z0-9]+/g) || [];
    const segments = [...zhSegs, ...enSegs];
    // Filter out generic/meaningless segments
    const boring = new Set(['的了', '这个', '那个', '什么', '怎么', '比较', '非常', '特别']);
    const genericIcons = ['✦', '◆', '▸', '●', '◇'];
    let iconIdx = 0;
    for (const seg of segments) {
      if (kws.length >= 5) break;
      if (usedTexts.has(seg) || boring.has(seg)) continue;
      usedTexts.add(seg);
      add(genericIcons[iconIdx % genericIcons.length], seg);
      iconIdx++;
    }
  }

  return kws;
}

// ── Date line helper ────────────────────────────────────

function getDateLine(prompt: string): string {
  const d = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  let line = `${d.getMonth() + 1}月${d.getDate()}日 周${weekdays[d.getDay()]}`;

  let weather = '☁';
  if (/暴雨|雷/.test(prompt)) weather = '⛈';
  else if (/雨/.test(prompt)) weather = '🌧';
  else if (/雪/.test(prompt)) weather = '❄';
  else if (/晴/.test(prompt)) weather = '☀';
  else if (/多云/.test(prompt)) weather = '⛅';

  const tempMatch = prompt.match(/(-?\d+)\s*°C?/);
  line += ` ${weather}`;
  if (tempMatch) line += ` ${tempMatch[1]}°`;

  return line;
}

// ── Mock notifications ──────────────────────────────────

interface MockNotif {
  iconBg: string;
  iconText: string;
  appName: string;
  time: string;
  content: string;
}

function generateMockNotifs(prompt: string): MockNotif[] {
  const notifs: MockNotif[] = [];
  const used = new Set<string>();

  const add = (n: MockNotif) => {
    if (!used.has(n.appName) && notifs.length < 2) {
      used.add(n.appName);
      notifs.push(n);
    }
  };

  const pool: { test: RegExp; notif: MockNotif }[] = [
    { test: /会议|开会|周会|评审|日程/, notif: { iconBg: '#3370ff', iconText: '飞', appName: '飞书', time: '10分钟前', content: '【会议提醒】你有一个会议即将开始，请提前做好准备' } },
    { test: /快递|包裹|丰巢|物流|取件/, notif: { iconBg: '#e4393c', iconText: '京', appName: '京东', time: '25分钟前', content: '您的快递正在派送中，预计今天内送达' } },
    { test: /航班|飞机|登机|机场/, notif: { iconBg: '#1a6dff', iconText: '航', appName: '航旅纵横', time: '5分钟前', content: '航班动态更新，请注意登机口变化' } },
    { test: /外卖|餐厅|美团|午餐|晚餐|火锅/, notif: { iconBg: '#ffd000', iconText: '美', appName: '美团', time: '刚刚', content: '骑手已取餐出发，预计15分钟送达' } },
    { test: /淘宝|天猫|购物|优惠/, notif: { iconBg: '#ff5000', iconText: '淘', appName: '淘宝', time: '1小时前', content: '等你来抢！至高减5元，限时优惠中' } },
    { test: /雨|暴雨|台风|大风|降温/, notif: { iconBg: '#4a90d9', iconText: '天', appName: '天气', time: '15分钟前', content: '预计2小时后有降雨，出门记得带伞' } },
    { test: /高铁|火车|车站|列车/, notif: { iconBg: '#1890ff', iconText: '铁', appName: '铁路12306', time: '8分钟前', content: '您的列车即将发车，请提前检票进站' } },
    { test: /运动|步数|跑步|健身/, notif: { iconBg: '#34c759', iconText: '♥', appName: '健康', time: '20分钟前', content: '今日运动目标已完成80%，继续加油' } },
    { test: /音乐|歌|演唱会|开票/, notif: { iconBg: '#ff3b30', iconText: '♪', appName: '网易云音乐', time: '刚刚', content: '你关注的歌手发布了新专辑' } },
    { test: /支付|转账|交易|余额/, notif: { iconBg: '#1677ff', iconText: '支', appName: '支付宝', time: '30分钟前', content: '交易提醒：你有一笔16.30元支出' } },
    { test: /微信|消息|聊天/, notif: { iconBg: '#07c160', iconText: '微', appName: '微信', time: '3分钟前', content: '你收到了新的消息，点击查看详情' } },
    { test: /b站|bilibili|视频/, notif: { iconBg: '#fb7299', iconText: 'B', appName: '哔哩哔哩', time: '2小时前', content: '你关注的UP主发布了新视频' } },
  ];

  for (const item of pool) {
    if (item.test.test(prompt)) add(item.notif);
  }

  // Fill with defaults if less than 2 matched
  if (notifs.length < 2) add({ iconBg: '#07c160', iconText: '微', appName: '微信', time: '3分钟前', content: '你收到了 2 条新消息' });
  if (notifs.length < 2) add({ iconBg: '#3370ff', iconText: '飞', appName: '飞书', time: '15分钟前', content: '你今日还有 3 项待办需要处理' });

  return notifs;
}

// ── Build the bridge HTML ────────────────────────────────

export function buildBridgeHtml(prompt: string): string {
  const dark = detectDark(prompt);
  const time = extractTime(prompt);
  const seed = hash(prompt);
  const pal = pickPalette(prompt, dark);
  const scene = extractDayPrefix(prompt) + detectScene(prompt);
  const keywords = extractKeywords(prompt);
  const dateLine = getDateLine(prompt);
  const notifs = generateMockNotifs(prompt);

  // Colors — always dark since we're on a dark lockscreen photo
  const cardBg = 'rgba(28,32,48,0.72)';
  const cardText = 'rgba(255,255,255,0.85)';
  const cardDim = 'rgba(255,255,255,0.4)';
  const glintBorder = 'rgba(102,126,234,0.25)';

  // ── Notification cards ──
  const notifCards = notifs.map((n, i) => {
    const delay = (0.35 + i * 0.12).toFixed(2);
    return (
      `<div style="background:${cardBg};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);` +
      `border-radius:16px;padding:12px 14px;animation:slideUp .45s ease ${delay}s both">` +
      `<div style="display:flex;align-items:flex-start;gap:10px">` +
      `<div style="width:34px;height:34px;border-radius:9px;background:${n.iconBg};` +
      `display:flex;align-items:center;justify-content:center;` +
      `font-size:15px;color:#fff;font-weight:700;flex-shrink:0">${n.iconText}</div>` +
      `<div style="flex:1;min-width:0">` +
      `<div style="display:flex;justify-content:space-between;align-items:center">` +
      `<span style="font-size:14px;font-weight:600;color:${cardText}">${n.appName}</span>` +
      `<span style="font-size:12px;color:${cardDim}">${n.time}</span>` +
      `</div>` +
      `<div style="font-size:13px;color:${cardDim};line-height:1.45;margin-top:4px;` +
      `overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${n.content}</div>` +
      `</div></div></div>`
    );
  }).join('');

  // ── Glint card with keywords + loading ──
  const glintDelay = (0.35 + notifs.length * 0.12).toFixed(2);
  const kwSep = `<span style="color:${cardDim};margin:0 3px">·</span>`;
  const kwLine = keywords.slice(0, 4).map((kw, i) => {
    const d = (parseFloat(glintDelay) + 0.3 + i * 0.15).toFixed(2);
    return `<span style="opacity:0;animation:fadeIn .4s ease ${d}s forwards">${kw.icon}\u2009${kw.text}</span>`;
  }).join(kwSep);

  const glintCardBg = 'linear-gradient(135deg,rgba(60,70,130,0.85),rgba(70,45,100,0.85))';

  const glintCard =
    `<div style="background:${glintCardBg};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);` +
    `border:1px solid ${glintBorder};border-radius:16px;padding:12px 14px;animation:slideUp .45s ease ${glintDelay}s both">` +
    `<div style="display:flex;align-items:flex-start;gap:10px">` +
    `<div style="width:34px;height:34px;border-radius:9px;` +
    `background:linear-gradient(135deg,#667eea,#764ba2);` +
    `display:flex;align-items:center;justify-content:center;` +
    `font-size:16px;color:#fff;flex-shrink:0">✦</div>` +
    `<div style="flex:1;min-width:0">` +
    `<div style="display:flex;justify-content:space-between;align-items:center">` +
    `<span style="font-size:14px;font-weight:600;color:${cardText}">Glint 灵犀</span>` +
    `<span style="font-size:12px;color:rgba(180,190,255,0.95);animation:shimmer 2s ease infinite">创作中</span>` +
    `</div>` +
    `<div style="font-size:13px;color:rgba(255,255,255,0.95);line-height:1.45;margin-top:4px">正在为你创作「${scene}」...</div>` +
    (kwLine ? `<div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:6px;line-height:1.6;display:flex;flex-wrap:wrap;align-items:center;gap:2px">${kwLine}</div>` : '') +
    `<div style="margin-top:8px;height:2px;border-radius:1px;background:rgba(255,255,255,0.12);overflow:hidden">` +
    `<div style="height:100%;width:30%;border-radius:1px;background:${pal.accent};animation:loadBar 2s ease-in-out infinite"></div>` +
    `</div>` +
    `</div></div></div>`;

  return (
    `<!doctype html><html><head><meta name="color-scheme" content="dark">` +
    `<style>` +
    `*{margin:0;padding:0;box-sizing:border-box}` +
    `@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}` +
    `@keyframes fadeIn{from{opacity:0}to{opacity:1}}` +
    `@keyframes shimmer{0%,100%{opacity:.5}50%{opacity:1}}` +
    `@keyframes loadBar{0%{width:0%;margin-left:0}50%{width:60%;margin-left:20%}100%{width:0%;margin-left:100%}}` +
    `</style></head>` +

    `<body style="overflow:hidden;margin:0;padding:0;background:#000;font-family:var(--font-display)">` +

    // Real lockscreen screenshot — force-fill entire viewport (slight stretch OK for wallpaper)
    `<img src="${LOCKSCREEN_BG}" style="position:absolute;top:0;left:0;width:100%;height:100%;display:block" />` +

    // ── Notification stack — overlaid on the real lockscreen photo ──
    `<div style="position:absolute;top:30%;left:4%;right:4%;display:flex;flex-direction:column;gap:8px;` +
    `animation:fadeIn .3s ease both">` +
    notifCards +
    glintCard +
    `</div>` +

    `</body></html>`
  );
}
