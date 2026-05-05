import React, { startTransition, useState, useCallback, useRef, useEffect } from 'react';
import { LockScreen } from './components/LockScreen';
import { ApiKeySetup } from './components/ApiKeySetup';
import type { PromptSource } from './services/geminiService';
import { hasApiKey, clearApiKey } from './services/apiKeyStore';
import { buildBridgeHtml } from './services/skeleton';
import { buildMomentPrompt, createDemoSignalSnapshot, resolveMoment } from './services/momentEngine';
import type { ResolvedMoment } from './services/momentEngine';
import { clearRenderCache, getCachedRender, saveCachedRender } from './services/renderCache';
import {
  clearUserMemory,
  loadUserMemory,
  preferencesFromMemory,
  recordMomentFeedback,
  recordMomentRendered,
  renderHistoryFromMemory,
} from './services/userMemory';
import type { MomentFeedbackKind, UserMemoryState } from './services/userMemory';
import {
  getNativeSignalStatus,
  loadNativeSignals,
  openNotificationSignalSettings,
  requestCalendarSignalPermission,
  UNAVAILABLE_SIGNAL_STATUS,
} from './services/nativeSignals';

// 从 prompt 反查场景标签：preset 直接用 label，custom 截取前 14 字 + …
function labelForPrompt(prompt: string, source: PromptSource): string {
  if (source === 'preset') {
    return '预设场景';
  }
  const trimmed = prompt.replace(/\s+/g, ' ').trim();
  return trimmed.length > 14 ? trimmed.slice(0, 14) + '…' : trimmed;
}
type Screen = 'home' | 'lockscreen';

const HomeScreen = React.lazy(() => (
  import('./components/HomeScreen').then((module) => ({ default: module.HomeScreen }))
));

const STREAM_COMMIT_INTERVAL_MS = 100;
const STREAM_COMMIT_MIN_DELTA = 100;

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'source', 'track', 'wbr',
  'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'stop', 'use',
]);

function hasRenderableMarkup(html: string) {
  return /<body[^>]*>|<(main|section|div|article|img|svg|h1|h2|p|span)\b/i.test(html);
}

function repairStreamingHtml(partial: string): string {
  const lastLt = partial.lastIndexOf('<');
  const lastGt = partial.lastIndexOf('>');
  let s = lastLt > lastGt ? partial.slice(0, lastLt) : partial;

  const bodyOpen = s.match(/<body[^>]*>/i);
  if (!bodyOpen) return s;
  if (/<\/body>/i.test(s)) return s;

  const bodyContentStart = s.indexOf(bodyOpen[0]) + bodyOpen[0].length;
  const bodyContent = s.slice(bodyContentStart);

  const stack: string[] = [];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)[^>]*?(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(bodyContent)) !== null) {
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    const selfClose = m[3] === '/';
    if (VOID_TAGS.has(tag) || selfClose) continue;
    if (closing) {
      const idx = stack.lastIndexOf(tag);
      if (idx >= 0) stack.length = idx;
    } else {
      stack.push(tag);
    }
  }

  const closers = stack.reverse().map((t) => `</${t}>`).join('');
  return s + closers + '</body></html>';
}

function attachMemoryToSnapshot(snapshot: ReturnType<typeof createDemoSignalSnapshot>, memory: UserMemoryState) {
  const memoryPreferences = preferencesFromMemory(memory);
  const defaultPriorities = snapshot.preferences?.priorityKinds ?? [];
  const memoryPriorities = memoryPreferences.priorityKinds ?? [];

  return {
    ...snapshot,
    preferences: {
      ...snapshot.preferences,
      ...memoryPreferences,
      priorityKinds: Array.from(new Set([...memoryPriorities, ...defaultPriorities])),
      avoidTones: Array.from(new Set([
        ...(snapshot.preferences?.avoidTones ?? []),
        ...(memoryPreferences.avoidTones ?? []),
      ])),
    },
    recentRenders: renderHistoryFromMemory(memory),
  };
}

function resolveSmartMomentFallback(memory: UserMemoryState): ResolvedMoment {
  return resolveMoment(attachMemoryToSnapshot(createDemoSignalSnapshot(), memory));
}

async function resolveSmartMomentFromMemory(memory: UserMemoryState): Promise<ResolvedMoment> {
  const baseSnapshot = createDemoSignalSnapshot();
  const nativeSignals = await loadNativeSignals(baseSnapshot.now);
  const snapshot = nativeSignals
    ? {
      ...baseSnapshot,
      ...nativeSignals,
      upcomingCalendar: nativeSignals.upcomingCalendar?.length
        ? nativeSignals.upcomingCalendar
        : baseSnapshot.upcomingCalendar,
      notifications: nativeSignals.notifications?.length
        ? nativeSignals.notifications
        : baseSnapshot.notifications,
    }
    : baseSnapshot;

  return resolveMoment(attachMemoryToSnapshot(snapshot, memory));
}

const App: React.FC = () => {
  const [keyReady, setKeyReady] = useState(() => hasApiKey());
  const [screen, setScreen] = useState<Screen>('lockscreen');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState(() => buildBridgeHtml(''));
  const [isLoading, setIsLoading] = useState(false);
  const [sceneLabel, setSceneLabel] = useState<string>('');
  const [revealPhase, setRevealPhase] = useState<'idle' | 'blurred' | 'revealing'>('idle');
  const [sandboxSessionKey, setSandboxSessionKey] = useState(0);
  const [userMemory, setUserMemory] = useState(() => loadUserMemory());
  const [smartMoment, setSmartMoment] = useState(() => resolveSmartMomentFallback(loadUserMemory()));
  const [activeMoment, setActiveMoment] = useState<ResolvedMoment | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string>('');
  const [signalStatus, setSignalStatus] = useState(UNAVAILABLE_SIGNAL_STATUS);
  const abortRef = useRef<AbortController | null>(null);
  const lastSandboxRuntimeRef = useRef<'stream' | 'prefab'>('stream');

  const handleGenerate = useCallback(async (
    prompt: string,
    promptSource: PromptSource,
    prefabHtml?: string,
    cacheMoment?: ResolvedMoment,
    sceneLabelOverride?: string,
  ) => {
    console.log('[DEBUG] handleGenerate called, prefabHtml:', typeof prefabHtml, prefabHtml ? 'HAS_CONTENT_len=' + prefabHtml.length : 'UNDEFINED', 'prompt:', prompt.slice(0, 30));
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    const nextSandboxRuntime = prefabHtml ? 'prefab' : 'stream';
    const needsFreshSandbox =
      nextSandboxRuntime === 'prefab' || lastSandboxRuntimeRef.current === 'prefab';

    if (needsFreshSandbox) {
      setSandboxSessionKey((current) => current + 1);
    }
    lastSandboxRuntimeRef.current = nextSandboxRuntime;
    setScreen('lockscreen');
    const nextSceneLabel = sceneLabelOverride ?? cacheMoment?.title ?? labelForPrompt(prompt, promptSource);
    setSceneLabel(nextSceneLabel);
    setActiveMoment(cacheMoment ?? null);

    // ── Prefab path: skip Gemini, render pre-generated HTML directly ──
    if (prefabHtml) {
      setIsLoading(true);
      setHtmlContent(buildBridgeHtml(prompt));
      setTimeout(() => {
        if (controller.signal.aborted) return;
        setRevealPhase('blurred');
        setHtmlContent(prefabHtml);
        if (cacheMoment) saveCachedRender(cacheMoment, prefabHtml, nextSceneLabel);
        if (cacheMoment) {
          setUserMemory(recordMomentRendered(cacheMoment));
        }
        setTimeout(() => {
          setRevealPhase('revealing');
          setTimeout(() => setRevealPhase('idle'), 700);
        }, 50);
        setIsLoading(false);
        if (abortRef.current === controller) abortRef.current = null;
      }, 1200);
      return;
    }

    // ── Standard Gemini streaming path ──
    setIsLoading(true);
    setHtmlContent(buildBridgeHtml(prompt));

    // Scripted mid-stream reversal for the flight-delay preset.
    let flightReversalTimer: ReturnType<typeof setTimeout> | null = null;
    if (promptSource === 'preset' && prompt.includes('航班延误')) {
      flightReversalTimer = setTimeout(() => {
        if (controller.signal.aborted) return;
        console.log('[DEMO] flight reversal injected');
        controller.abort();
        void import('./constants/flightDelta').then(({ FLIGHT_DELAY_DELTA_HTML }) => {
          setRevealPhase('blurred');
          setHtmlContent(FLIGHT_DELAY_DELTA_HTML);
          setTimeout(() => {
            setRevealPhase('revealing');
            setTimeout(() => setRevealPhase('idle'), 700);
          }, 50);
          setIsLoading(false);
        });
      }, 5200);
    }

    const genStartTime = performance.now();
    console.log(`[PERF] generation_start ts=${genStartTime.toFixed(1)} prompt_len=${prompt.length} source=${promptSource}`);

    let fullHtml = '';
    let lastCommittedLen = 0;
    let lastCommittedAt = 0;
    let wasAborted = false;
    let bodyFirstSeen = false;
    let bridgeActive = true;
    let fadeInProgress = false;
    let pendingSwitch: string | null = null;
    let switchTimerSet = false;

    const BRIDGE_BODY_THRESHOLD = 150;
    const BRIDGE_MIN_DURATION_MS = 1800;

    const doSwitch = (html: string) => {
      bridgeActive = false;
      fadeInProgress = true;
      const repaired = repairStreamingHtml(html);
      lastCommittedLen = html.length;
      lastCommittedAt = performance.now();
      console.log(`[PERF] bridge_switch at ${(performance.now() - genStartTime).toFixed(0)}ms`);

      setRevealPhase('blurred');
      setHtmlContent(repaired);

      setTimeout(() => {
        fadeInProgress = false;
        setRevealPhase('revealing');
        setTimeout(() => setRevealPhase('idle'), 700);
      }, 50);
    };

    const commitHtml = (nextHtml: string, force = false) => {
      if (bridgeActive) {
        const bodyMatch = nextHtml.match(/<body[^>]*>([\s\S]*)/i);
        const bodyLen = bodyMatch ? bodyMatch[1].length : 0;

        if (bodyLen >= BRIDGE_BODY_THRESHOLD || force) {
          const elapsed = performance.now() - genStartTime;

          if (elapsed < BRIDGE_MIN_DURATION_MS) {
            pendingSwitch = nextHtml;
            if (!switchTimerSet) {
              switchTimerSet = true;
              const remaining = BRIDGE_MIN_DURATION_MS - elapsed;
              setTimeout(() => {
                if (bridgeActive && pendingSwitch) doSwitch(pendingSwitch);
              }, remaining);
            }
            return;
          }

          doSwitch(nextHtml);
          return;
        }

        return;
      }

      if (fadeInProgress && !force) return;

      if (!force) {
        if (!hasRenderableMarkup(nextHtml)) return;
        if (nextHtml.length - lastCommittedLen < STREAM_COMMIT_MIN_DELTA) {
          const now = performance.now();
          if (now - lastCommittedAt < STREAM_COMMIT_INTERVAL_MS) {
            return;
          }
        }
      }

      const repaired = repairStreamingHtml(nextHtml);
      lastCommittedLen = nextHtml.length;
      lastCommittedAt = performance.now();
      startTransition(() => {
        setHtmlContent(repaired);
      });
    };

    try {
      const { streamPageGeneration } = await import('./services/geminiService');
      const stream = streamPageGeneration(prompt, promptSource, controller.signal);

      for await (const chunk of stream) {
        if (controller.signal.aborted) {
          wasAborted = true;
          break;
        }
        fullHtml += chunk;

        const justOpenedBody = !bodyFirstSeen && /<body[^>]*>/i.test(fullHtml);
        if (justOpenedBody) {
          bodyFirstSeen = true;
          const firstPaint = performance.now() - genStartTime;
          console.log(`[PERF] first_body_paint=${firstPaint.toFixed(0)}ms html_len=${fullHtml.length}`);
        }

        const shouldForceCommit =
          (justOpenedBody && !bridgeActive) ||
          /<\/body>|<\/html>/i.test(fullHtml) ||
          chunk.includes('```');

        commitHtml(fullHtml, shouldForceCommit);
      }

      if (!wasAborted) {
        commitHtml(fullHtml, true);
        if (cacheMoment && !/Generation failed/i.test(fullHtml)) {
          saveCachedRender(cacheMoment, fullHtml, nextSceneLabel);
          setUserMemory(recordMomentRendered(cacheMoment));
        }
        const totalGen = performance.now() - genStartTime;
        console.log(`[PERF] generation_complete total=${totalGen.toFixed(0)}ms final_html_len=${fullHtml.length}`);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError' || controller.signal.aborted) return;
      console.error('Generation failed', e);
    } finally {
      if (flightReversalTimer) {
        clearTimeout(flightReversalTimer);
      }
      if (abortRef.current === controller) {
        setIsLoading(false);
        abortRef.current = null;
      }
    }
  }, []);

  const handleBack = useCallback(() => {
    setSheetOpen(true);
  }, []);

  const didBootRef = useRef(false);

  const refreshSignalStatus = useCallback(async () => {
    const nextStatus = await getNativeSignalStatus();
    setSignalStatus(nextStatus);
    return nextStatus;
  }, []);

  const refreshSmartMoment = useCallback(async () => {
    const next = await resolveSmartMomentFromMemory(userMemory);
    setSmartMoment(next);
    return next;
  }, [userMemory]);

  const generateSmartMoment = useCallback(async () => {
    const next = await refreshSmartMoment();
    const cached = getCachedRender(next);
    if (cached) {
      if (abortRef.current) abortRef.current.abort();
      setScreen('lockscreen');
      setSceneLabel(cached.sceneLabel);
      setHtmlContent(cached.html);
      setIsLoading(false);
      setActiveMoment(next);
      setUserMemory(recordMomentRendered(next));
      return Promise.resolve();
    }
    return handleGenerate(buildMomentPrompt(next), 'custom', undefined, next);
  }, [handleGenerate, refreshSmartMoment]);

  const handleMomentFeedback = useCallback((kind: MomentFeedbackKind) => {
    if (!activeMoment) return;
    const nextMemory = recordMomentFeedback(activeMoment, kind);
    setUserMemory(nextMemory);
    void resolveSmartMomentFromMemory(nextMemory).then(setSmartMoment);
    if (kind !== 'useful') clearRenderCache();
    setFeedbackNotice(kind === 'useful' ? '已记住：这类内容更有用' : '已记住：下次会调低这类呈现');
    setTimeout(() => setFeedbackNotice(''), 1800);
  }, [activeMoment]);

  useEffect(() => {
    if (!keyReady || didBootRef.current) return;
    didBootRef.current = true;
    const timer = setTimeout(() => {
      void generateSmartMoment();
    }, 350);
    void refreshSignalStatus();
    return () => clearTimeout(timer);
  }, [generateSmartMoment, keyReady, refreshSignalStatus]);

  useEffect(() => {
    if (!keyReady) return;

    const refreshOnForeground = () => {
      if (document.visibilityState !== 'visible') return;
      void refreshSignalStatus();
      const now = new Date();
      const hasFreshMoment = activeMoment && activeMoment.expiresAt.getTime() > now.getTime();
      if (!hasFreshMoment) {
        void generateSmartMoment();
      }
    };

    document.addEventListener('visibilitychange', refreshOnForeground);
    window.addEventListener('focus', refreshOnForeground);
    return () => {
      document.removeEventListener('visibilitychange', refreshOnForeground);
      window.removeEventListener('focus', refreshOnForeground);
    };
  }, [activeMoment, generateSmartMoment, keyReady, refreshSignalStatus]);

  const handleRequestCalendar = useCallback(async () => {
    setSignalStatus(await requestCalendarSignalPermission());
    setSmartMoment(await resolveSmartMomentFromMemory(userMemory));
  }, [userMemory]);

  const handleOpenNotificationSettings = useCallback(async () => {
    setSignalStatus(await openNotificationSignalSettings());
  }, []);

  const handleResetApiKey = useCallback(() => {
    if (!confirm('要重置 API Key 吗？需要重新输入。')) return;
    if (abortRef.current) abortRef.current.abort();
    clearApiKey();
    clearRenderCache();
    clearUserMemory();
    void import('./services/geminiService').then(({ resetClient }) => resetClient());
    didBootRef.current = false;
    setSheetOpen(false);
    setSceneLabel('');
    setActiveMoment(null);
    setFeedbackNotice('');
    setUserMemory(loadUserMemory());
    setHtmlContent(buildBridgeHtml(''));
    setKeyReady(false);
  }, []);

  if (!keyReady) {
    return <ApiKeySetup onReady={() => setKeyReady(true)} />;
  }

  return (
    <div className="app-shell">
      <div className="app-layer app-layer-lock">
        <LockScreen
          htmlContent={htmlContent}
          isLoading={isLoading}
          isActive={true}
          revealPhase={revealPhase}
          sandboxSessionKey={sandboxSessionKey}
          sceneLabel={sceneLabel}
          canGiveFeedback={Boolean(activeMoment) && !isLoading}
          feedbackNotice={feedbackNotice}
          onFeedback={handleMomentFeedback}
          onBack={handleBack}
        />
      </div>

      {sheetOpen && (
        <div className="app-sheet" onClick={() => setSheetOpen(false)}>
          <div className="app-sheet-panel" onClick={(e) => e.stopPropagation()}>
            <React.Suspense fallback={null}>
              <HomeScreen
                smartMoment={smartMoment}
                signalStatus={signalStatus}
                onRequestCalendar={handleRequestCalendar}
                onOpenNotificationSettings={handleOpenNotificationSettings}
                onRefreshSignalStatus={() => void refreshSignalStatus()}
                onSmartGenerate={() => {
                  setSheetOpen(false);
                  void generateSmartMoment();
                }}
                onGenerate={(prompt, source, prefabHtml, label) => {
                  setSheetOpen(false);
                  handleGenerate(prompt, source, prefabHtml, undefined, label);
                }}
                onResetApiKey={handleResetApiKey}
              />
            </React.Suspense>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
