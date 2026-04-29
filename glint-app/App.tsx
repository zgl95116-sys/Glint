import React, { startTransition, useState, useCallback, useRef } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { LockScreen } from './components/LockScreen';
import { ApiKeySetup } from './components/ApiKeySetup';
import { streamPageGeneration, resetClient } from './services/geminiService';
import type { PromptSource } from './services/geminiService';
import { hasApiKey, clearApiKey } from './services/apiKeyStore';
import { buildBridgeHtml } from './services/skeleton';
import { PRESET_PROMPTS } from './constants/prompts';
import { FLIGHT_DELAY_DELTA_HTML } from './constants/flightDelta';

// 从 prompt 反查场景标签：preset 直接用 label，custom 截取前 14 字 + …
function labelForPrompt(prompt: string, source: PromptSource): string {
  if (source === 'preset') {
    const hit = PRESET_PROMPTS.find((p) => p.prompt === prompt);
    if (hit) return hit.label;
  }
  const trimmed = prompt.replace(/\s+/g, ' ').trim();
  return trimmed.length > 14 ? trimmed.slice(0, 14) + '…' : trimmed;
}
type Screen = 'home' | 'lockscreen';

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

const App: React.FC = () => {
  const [keyReady, setKeyReady] = useState(() => hasApiKey());
  const [screen, setScreen] = useState<Screen>('lockscreen');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState(() => buildBridgeHtml(''));
  const [isLoading, setIsLoading] = useState(false);
  const [sceneLabel, setSceneLabel] = useState<string>('');
  const [revealPhase, setRevealPhase] = useState<'idle' | 'blurred' | 'revealing'>('idle');
  const [sandboxSessionKey, setSandboxSessionKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const lastSandboxRuntimeRef = useRef<'stream' | 'prefab'>('stream');

  const handleGenerate = useCallback(async (
    prompt: string,
    promptSource: PromptSource,
    prefabHtml?: string,
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
    setSceneLabel(labelForPrompt(prompt, promptSource));

    // ── Prefab path: skip Gemini, render pre-generated HTML directly ──
    if (prefabHtml) {
      setIsLoading(true);
      setHtmlContent(buildBridgeHtml(prompt));
      setTimeout(() => {
        if (controller.signal.aborted) return;
        setRevealPhase('blurred');
        setHtmlContent(prefabHtml);
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
        setRevealPhase('blurred');
        setHtmlContent(FLIGHT_DELAY_DELTA_HTML);
        setTimeout(() => {
          setRevealPhase('revealing');
          setTimeout(() => setRevealPhase('idle'), 700);
        }, 50);
        setIsLoading(false);
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

  const handleResetApiKey = useCallback(() => {
    if (!confirm('要重置 API Key 吗？需要重新输入。')) return;
    if (abortRef.current) abortRef.current.abort();
    clearApiKey();
    resetClient();
    setSheetOpen(false);
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
          onBack={handleBack}
        />
      </div>

      {sheetOpen && (
        <div className="app-sheet" onClick={() => setSheetOpen(false)}>
          <div className="app-sheet-panel" onClick={(e) => e.stopPropagation()}>
            <HomeScreen
              onGenerate={(prompt, source, prefabHtml) => {
                setSheetOpen(false);
                handleGenerate(prompt, source, prefabHtml);
              }}
              onResetApiKey={handleResetApiKey}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
