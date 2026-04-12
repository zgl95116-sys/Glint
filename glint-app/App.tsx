import React, { startTransition, useState, useCallback, useRef } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { LockScreen } from './components/LockScreen';
import { MemoryDeckHandle } from './components/MemoryDeck';
import { streamPageGeneration } from './services/geminiService';
import type { PromptSource } from './services/geminiService';
import { buildBridgeHtml } from './services/skeleton';
import { resolveCards } from './constants/memory';

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

// Close unterminated tags so a mid-stream HTML fragment is renderable in the
// sandbox. Sandbox.extractSandboxMessage() needs a closing </body> to pull body
// content out; without this, partial streams either render nothing or fall
// through the generic strip-path. This keeps first paint under ~500ms instead
// of waiting for the full document.
function repairStreamingHtml(partial: string): string {
  // Drop a dangling partial tag at the tail (e.g. stream cut mid-`<di`).
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
  const [screen, setScreen] = useState<Screen>('home');
  const [htmlContent, setHtmlContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [revealPhase, setRevealPhase] = useState<'idle' | 'blurred' | 'revealing'>('idle');
  const [sandboxSessionKey, setSandboxSessionKey] = useState(0);
  const [highlightIds, setHighlightIds] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const deckRef = useRef<MemoryDeckHandle>(null);
  const lastSandboxRuntimeRef = useRef<'stream' | 'prefab'>('stream');

  const handleGenerate = useCallback(async (
    prompt: string,
    promptSource: PromptSource,
    prefabHtml?: string,
    usedMemoryIds?: string[],
  ) => {
    const litCards = usedMemoryIds && usedMemoryIds.length > 0 && !prefabHtml
      ? resolveCards(usedMemoryIds)
      : [];
    setHighlightIds(litCards.map((c) => c.id));

    console.log('[DEBUG] handleGenerate called, prefabHtml:', typeof prefabHtml, prefabHtml ? 'HAS_CONTENT_len=' + prefabHtml.length : 'UNDEFINED', 'prompt:', prompt.slice(0, 30));
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    const nextSandboxRuntime = prefabHtml ? 'prefab' : 'stream';
    const needsFreshSandbox =
      nextSandboxRuntime === 'prefab' || lastSandboxRuntimeRef.current === 'prefab';

    // Script-heavy presets leave timers, rAF loops, and global bindings behind.
    // Recreate the iframe only when entering/exiting that runtime class so
    // normal stream->stream generations keep the existing low-latency path.
    if (needsFreshSandbox) {
      setSandboxSessionKey((current) => current + 1);
    }
    lastSandboxRuntimeRef.current = nextSandboxRuntime;
    setScreen('lockscreen');

    // ── Prefab path: skip Gemini, render pre-generated HTML directly ──
    if (prefabHtml) {
      setIsLoading(true);
      setHtmlContent(buildBridgeHtml(prompt));
      // Hold bridge briefly then crossfade to prefab content
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
    // Paint an instant skeleton derived from the prompt (time + motif). The
    // sandbox shows it within a frame; once the stream opens its own <body>
    // with real content, commitHtml replaces it. Empty-body partial commits
    // are filtered by Sandbox.extractSandboxMessage, so the skeleton is held
    // until there is real content to show.
    setHtmlContent(buildBridgeHtml(prompt));

    const genStartTime = performance.now();
    console.log(`[PERF] generation_start ts=${genStartTime.toFixed(1)} prompt_len=${prompt.length} source=${promptSource}`);

    let fullHtml = '';
    let lastCommittedLen = 0;
    let lastCommittedAt = 0;
    let wasAborted = false;
    let bodyFirstSeen = false;
    let bridgeActive = true;
    let fadeInProgress = false;
    let pendingSwitch: string | null = null; // buffered HTML if content arrives before min bridge time
    let switchTimerSet = false;

    const BRIDGE_BODY_THRESHOLD = 150;
    const BRIDGE_MIN_DURATION_MS = 1800; // let keyword animation play through

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
            // Content ready but bridge animation still playing — buffer it
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

        // Not enough content yet — keep bridge
        return;
      }

      // Suppress commits during the brief crossfade
      if (fadeInProgress && !force) return;

      // Throttled streaming commits — lower frequency to reduce animation resets
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
      const augmentedPrompt = litCards.length > 0
        ? `${prompt}\n\n[关于用户的记忆，请让这些事实自然地出现在画面里（hero 文案、AI 语音、数据标签都可以）: ${litCards.map((c) => c.phrase).join('、')}]`
        : prompt;

      const stream = streamPageGeneration(augmentedPrompt, promptSource, controller.signal);

      for await (const chunk of stream) {
        if (controller.signal.aborted) {
          wasAborted = true;
          break;
        }
        fullHtml += chunk;

        // First paint: commit as soon as <body> opens, even if below delta.
        const justOpenedBody = !bodyFirstSeen && /<body[^>]*>/i.test(fullHtml);
        if (justOpenedBody) {
          bodyFirstSeen = true;
          const firstPaint = performance.now() - genStartTime;
          console.log(`[PERF] first_body_paint=${firstPaint.toFixed(0)}ms html_len=${fullHtml.length}`);
        }

        // When bridge is active, don't force on body-open — let bridge
        // stay until enough real content accumulates for a smooth crossfade.
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
      if (abortRef.current === controller) {
        setIsLoading(false);
        abortRef.current = null;
      }
    }
  }, []);

  const handleBack = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setScreen('home');
    setIsLoading(false);
    setHtmlContent('');
    setHighlightIds([]);
  }, []);

  return (
    <div className="app-shell">
      <div className="app-layer app-layer-lock">
        <LockScreen
          ref={deckRef}
          htmlContent={htmlContent}
          isLoading={isLoading}
          isActive={screen === 'lockscreen'}
          revealPhase={revealPhase}
          sandboxSessionKey={sandboxSessionKey}
          highlightIds={highlightIds}
          onBack={handleBack}
        />
      </div>

      {screen === 'home' && (
        <div className="app-layer app-layer-home">
          <HomeScreen onGenerate={handleGenerate} />
        </div>
      )}
    </div>
  );
};

export default App;
