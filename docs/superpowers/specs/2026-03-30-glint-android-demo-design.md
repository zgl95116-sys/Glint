# Glint Android Demo — Design Spec

## Overview

将现有 Flash-Lite Browser（React/Vite Web 应用）改造为 Android APK，模拟 AI 生成式锁屏的概念 Demo。用户输入场景描述，Gemini 3.1 Flash-Lite 实时流式生成全屏锁屏界面。

**定位**：效果展示 Demo，不需要替换系统锁屏，在 App 内全屏沉浸体验。

## Design Principles

1. **AI 内容 = 整个屏幕** — 零 chrome，不模拟状态栏、解锁条等传统锁屏元素。每个像素都由 AI 决定。
2. **实时流式渲染** — 保留 Flash-Lite Browser 的核心体验，用户看着界面逐步「长」出来。这是核心 wow factor。
3. **风格自由** — AI 完全自由发挥视觉风格，每次生成都不同。不套路化。
4. **App 壳极简** — 输入界面只做引导和输入，不抢 AI 内容的风头。

## UI Design

### Two States

App 只有两个状态，无需复杂导航。

#### State 1: HomeScreen（输入态）

- 深色全屏背景，微妙的渐变氛围
- 顶部左侧极小的 "GLINT" 品牌标识
- 引导文字："你希望此刻的屏幕是什么样？"
- 中间区域：预设 prompt 标签云（胶囊形 chips），可滚动
- 底部：自由输入框 + 生成按钮
- 点击预设 chip 或提交输入 → 切换到 LockScreen 态

**预设 Prompts（初始集）**:
- 早晨 · 日出与今日计划
- 雨天 · 窗外的雨和一杯咖啡
- 深夜 · 星空与今日回顾
- 科技资讯 · 今日 AI 大事件
- 春节 · 红色喜庆倒计时
- 音乐 · 正在听的歌词可视化
- 极简 · 只有时间和一句诗
- 赛博朋克 · 霓虹信息矩阵

#### State 2: LockScreen（全屏 AI 生成态）

- AI 生成的 HTML 占满全屏（100vw × 100vh）
- 通过 iframe 沙箱渲染（复用 Flash-Lite Browser 的 Sandbox 机制）
- 流式渲染实时可见——HTML 逐步出现，界面逐步成型
- 唯一的 overlay：底部居中一个极小的半透明胶囊 "GLINT · 点击返回"
- 点击胶囊 → 返回 HomeScreen

## Technical Architecture

### Tech Stack

- **前端框架**: React 19 + TypeScript + Vite
- **AI 模型**: Gemini 3.1 Flash-Lite (via @google/genai SDK)
- **打包工具**: Capacitor (Web → Android)
- **样式**: Tailwind CSS (在 iframe 沙箱内加载)

### Component Architecture

```
├── index.html               — Vite 入口（项目根目录，保持 Vite 标准结构）
├── index.css                — 全局样式（项目根目录）
├── index.tsx                — React 入口
├── App.tsx                  — 状态路由：HomeScreen ↔ LockScreen
├── components/
│   ├── HomeScreen.tsx       — 输入态：品牌 + 引导 + prompt chips + 输入框
│   ├── LockScreen.tsx       — 全屏态：Sandbox + 返回胶囊 overlay
│   └── Sandbox.tsx          — iframe 沙箱渲染（从原项目简化）
├── services/
│   └── geminiService.ts     — Gemini API 调用（替换 system prompt）
└── constants/
    └── prompts.ts           — 预设 prompt 列表
```

注：`index.html` 和 `index.css` 保持在项目根目录（Vite 标准结构），其余 `.tsx/.ts` 文件放在根目录（与原项目一致，无 `src/` 子目录）。HomeScreen 也使用 Tailwind CSS（通过 CDN 在 `index.html` 中加载）。

### Removed from Flash-Lite Browser

- `OuterFrame.tsx` — 浏览器头部/尾部/token 计数
- `BrowserShell.tsx` — 标签栏、地址栏、导航按钮
- `AddressBar.tsx` — 地址栏
- `NewTab.tsx` — 新标签页
- 多标签、历史记录、前进后退功能
- `types.ts` 中的 Tab、Breadcrumb 等浏览器相关类型

### Sandbox Simplification

复用原 `Sandbox.tsx` 的 iframe + postMessage 机制，简化：
- 去掉 `FlashLiteAPI.navigate()` 链接拦截（锁屏不需要页面导航）
- 去掉 `FlashLiteAPI.performAction()` 表单交互
- 保留 `CONTENT_UPDATE` postMessage 通道用于流式内容更新
- 保留 Tailwind CSS 和 Google Fonts 加载
- 保留 Material Symbols Icons
- 保留深色/浅色 color-scheme 检测

### System Prompt Redesign

原 prompt 引导生成「完整网页」，新 prompt 引导生成「手机锁屏视觉作品」：

**核心变化**:
- **尺寸约束**: 强制 `100vw × 100vh`，`overflow: hidden`，所有内容必须一屏展示
- **视觉语言**: 鼓励大胆排版、渐变背景、inline SVG 图形、情绪化配色
- **风格多样性**: 明确要求每次创造不同风格——极简、赛博朋克、杂志、海报、水墨、像素艺术等
- **去掉 web 元素**: 不要导航栏、链接、表单、页脚、侧边栏
- **保留工具链**: Tailwind CSS、Google Fonts、Material Symbols、emoji、CSS 渐变、inline SVG

### Gemini API

- **Model**: `gemini-3.1-flash-lite-preview`
- **API Key**: 保留现有 `process.env.GEMINI_API_KEY` 模式（通过 `vite.config.ts` 的 `define` 注入），在 `.env.local` 中设置 `GEMINI_API_KEY=AIzaSyC3kWLeCJDvv_4vG8x2qhFFzks6-kZF5i0`
- **Streaming**: 保留 `generateContentStream` 流式生成
- **Token counting**: 可简化或去掉（Demo 不需要展示 token 数）

### Capacitor Integration

- `@capacitor/core` + `@capacitor/android`
- `capacitor.config.ts`: 配置 app name "Glint"、WebView 全屏
- Android `MainActivity`: 设置 `SYSTEM_UI_FLAG_IMMERSIVE_STICKY` 隐藏系统栏
- 构建流程: `vite build` → `npx cap sync` → Android Studio 生成 APK

### Android Configuration

- **最低版本**: API 24 (Android 7.0)
- **全屏模式**: Immersive Sticky（隐藏状态栏 + 导航栏）
- **网络权限**: 需要 INTERNET permission（调用 Gemini API）
- **屏幕方向**: 锁定竖屏
- **APK 大小**: 预计 ~5-8MB

## Data Flow

```
用户选择/输入 Prompt
       │
       ▼
锁屏 System Prompt + 用户 Prompt
       │
       ▼
Gemini 3.1 Flash-Lite (streaming)
       │  逐 chunk 返回 HTML
       ▼
postMessage → iframe Sandbox
       │  实时渲染
       ▼
用户看到全屏锁屏界面
       │
       ▼
点击返回胶囊 → 回到 HomeScreen
```

## Constraints

- 需要网络连接（Gemini API 在线调用）
- WebView 性能比 Chrome 略低，但流式 HTML 渲染足够
- iframe 沙箱在 Android WebView 中正常工作
- 硬编码 API Key 仅限 Demo 用途，不适合发布

## Out of Scope

- 真实系统锁屏替换
- 用户行为学习 / 记忆
- 多模态生成（音乐、视频）
- 后台预取 / 缓存
- 离线模式
- API Key 管理 / 用户认证
