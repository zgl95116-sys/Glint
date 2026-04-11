import React, { useRef, useEffect } from 'react';

interface SandboxProps {
  htmlContent: string;
}

interface SandboxMessage {
  type: 'CONTENT_UPDATE';
  html: string;
  bodyClasses: string;
  bodyStyle: string;
  colorScheme: 'dark' | 'light';
  headCss: string;
  linkTags: string[];
}

function stripCodeFences(html: string) {
  let cleaned = html.trim();
  cleaned = cleaned.replace(/^```(?:html)?\s*\n?/i, '');
  cleaned = cleaned.replace(/\n?```\s*$/i, '');
  return cleaned.trim();
}

function extractSandboxMessage(htmlContent: string): SandboxMessage | null {
  const cleaned = stripCodeFences(htmlContent);
  if (!cleaned) return null;

  const headMatch = cleaned.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headContent = headMatch ? headMatch[1] : '';

  const fontHrefs: string[] = [];
  const linkMatches = headContent.match(/<link[^>]*>/gi);
  if (linkMatches) {
    linkMatches.forEach((tag) => {
      const hrefMatch = tag.match(/href="([^"]+)"/i) || tag.match(/href='([^']+)'/i);
      if (hrefMatch && hrefMatch[1].startsWith('https://fonts.googleapis.com/')) {
        fontHrefs.push(hrefMatch[1]);
      }
    });
  }

  // Extract <style> from head OR body (body-first format may place styles inline)
  const allStyleMatches = [...cleaned.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  const headCss = allStyleMatches.map((match) => match[1].trim()).filter(Boolean).join('\n');

  const isDark = /<meta\s+name=["']color-scheme["']\s+content=["'][^"']*dark/i.test(cleaned);
  const bodyClassMatch = cleaned.match(/<body[^>]*class="([^"]*)"/i);
  const bodyClasses = bodyClassMatch ? bodyClassMatch[1] : '';
  const bodyStyleMatch = cleaned.match(/<body[^>]*style="([^"]*)"/i);
  const bodyInlineStyle = bodyStyleMatch ? bodyStyleMatch[1] : '';

  const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const cleanContent = bodyMatch
    ? bodyMatch[1]
    : cleaned
        .replace(/<\/?html[^>]*>/gi, '')
        .replace(/<head[\s\S]*?<\/head>/gi, '')
        .replace(/<\/?body[^>]*>/gi, '')
        .trim();

  const hasRenderableMarkup = /<(main|section|div|article|img|svg|h1|h2|p|span)\b/i.test(cleanContent);
  if (!hasRenderableMarkup && cleanContent.length < 80) {
    return null;
  }

  return {
    type: 'CONTENT_UPDATE',
    html: cleanContent,
    bodyClasses,
    bodyStyle: `overflow:hidden;margin:0;padding:0;background:${isDark ? '#000' : '#fff'};color:${isDark ? '#e8eaed' : '#1a1a1a'};${bodyInlineStyle}`,
    colorScheme: isDark ? 'dark' : 'light',
    headCss,
    linkTags: fontHrefs,
  };
}

const SHELL_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src data: https://fonts.gstatic.com; img-src data: blob: https:; frame-src 'none';">
    <style>
      :root {
        --font-display: "SF Pro Display", -apple-system, "Helvetica Neue", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
        --font-serif: "Source Han Serif SC", "Songti SC", "Noto Serif CJK SC", Georgia, "Times New Roman", serif;
        --font-mono: "SF Mono", "JetBrains Mono", "Roboto Mono", Menlo, Consolas, monospace;
        --font-hand: "Kaiti SC", "STKaiti", "Ma Shan Zheng", cursive;
      }
      html, body { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; }
      body { -webkit-font-smoothing: antialiased; font-family: var(--font-display); }
      /* Pre-built animations — AI-generated content references these */
      @keyframes g-drift{0%{transform:translate(0,0) scale(1)}50%{transform:translate(2%,-1.5%) scale(1.05)}100%{transform:translate(0,0) scale(1)}}
      @keyframes g-breathe{0%,100%{opacity:var(--g-lo,.4)}50%{opacity:var(--g-hi,.8)}}
      @keyframes g-pulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.03);opacity:1}}
      @keyframes g-float{0%{transform:translateY(0)}50%{transform:translateY(-8px)}100%{transform:translateY(0)}}
      @keyframes g-sweep{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      @keyframes g-flicker{0%,90%,100%{opacity:1}95%{opacity:.6}}
      @keyframes g-rise{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      @keyframes g-rain{0%{transform:translateY(-100vh)}100%{transform:translateY(100vh)}}
      .g-drift{animation:g-drift 12s ease-in-out infinite}
      .g-breathe{animation:g-breathe 4s ease-in-out infinite}
      .g-pulse{animation:g-pulse 2s ease-in-out infinite}
      .g-float{animation:g-float 6s ease-in-out infinite}
      .g-sweep{animation:g-sweep 30s linear infinite}
      .g-flicker{animation:g-flicker 3s step-end infinite}
      .g-rise{animation:g-rise .8s ease both}
      .g-grain{position:absolute;inset:0;opacity:.03;pointer-events:none;filter:url(#g-noise)}
    </style>
    <script>
      const __t0 = performance.now();
      let pendingUpdate = null;
      let frameScheduled = false;

      const ensureGeneratedStyle = () => {
        let style = document.head.querySelector('style[data-glint-generated]');
        if (!style) {
          style = document.createElement('style');
          style.setAttribute('data-glint-generated', 'true');
          document.head.appendChild(style);
        }
        return style;
      };

      const syncFontLinks = (links) => {
        const nextKey = JSON.stringify(links || []);
        if (window.__glintFontKey === nextKey) return;
        window.__glintFontKey = nextKey;
        document.head.querySelectorAll('link[data-glint-font]').forEach(el => el.remove());
        (links || []).forEach(href => {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = href;
          link.setAttribute('data-glint-font', 'true');
          document.head.appendChild(link);
        });
      };

      // Double-buffer: two absolutely-positioned wrappers stacked via z-index.
      // New content is written to the hidden (back) buffer while the old content
      // stays visible on the front buffer. After seeking animations to the
      // correct phase, z-indices swap — the fresh buffer appears without a
      // visible DOM-destruction flash.
      let _wA = null, _wB = null, _active = 'A';
      const getWraps = () => {
        if (_wA) return;
        _wA = document.createElement('div');
        _wA.id = 'gw-a';
        _wA.style.cssText = 'position:absolute;inset:0;overflow:hidden;z-index:2;';
        _wB = document.createElement('div');
        _wB.id = 'gw-b';
        _wB.style.cssText = 'position:absolute;inset:0;overflow:hidden;z-index:1;';
        document.body.appendChild(_wA);
        document.body.appendChild(_wB);
      };

      let _pScheme = '';

      const applyUpdate = (payload) => {
        getWraps();
        const front = _active === 'A' ? _wA : _wB;
        const back  = _active === 'A' ? _wB : _wA;

        // 1. Update generated CSS (shared, in <head>)
        const styleEl = ensureGeneratedStyle();
        const nextCss = payload.headCss || '';
        if (window.__glintCss !== nextCss) {
          window.__glintCss = nextCss;
          styleEl.textContent = nextCss;
        }

        // 2. Prepare back buffer style BEFORE content so canvas/elements
        //    have correct containing-block dimensions when scripts execute.
        back.style.cssText = 'position:absolute;inset:0;z-index:2;opacity:0;' + (payload.bodyStyle || '') + ';overflow:hidden;max-width:100vw;max-height:100vh;';
        back.className = payload.bodyClasses || '';

        // 2b. Generation-gated rAF & setInterval — old prefab animation
        //     loops self-terminate when __glintGen changes.
        if (!window.__origRAF) {
          window.__origRAF = requestAnimationFrame.bind(window);
          window.__origSI  = setInterval.bind(window);
          window.__origCI  = clearInterval.bind(window);
        }
        window.__glintGen = (window.__glintGen || 0) + 1;
        const _gen = window.__glintGen;
        window.requestAnimationFrame = function(fn) {
          return window.__origRAF(function(t) {
            if (window.__glintGen === _gen) fn(t);
          });
        };
        window.setInterval = function(fn, ms) {
          const id = window.__origSI(function() {
            if (window.__glintGen !== _gen) { window.__origCI(id); return; }
            fn();
          }, ms);
          return id;
        };
        document.querySelectorAll('script[data-glint-dyn]').forEach(s => s.remove());

        // 2c. Inject content — createContextualFragment natively executes
        //     <script> tags on appendChild (innerHTML does NOT execute them).
        back.innerHTML = '';
        const _html = payload.html || '';
        if (_html) {
          try {
            const _r = document.createRange();
            _r.selectNodeContents(back);
            back.appendChild(_r.createContextualFragment(_html));
          } catch(_e) {
            back.innerHTML = _html;
            const _codes = [];
            back.querySelectorAll('script').forEach(old => {
              _codes.push(old.textContent);
              old.remove();
            });
            if (_codes.length) {
              const _ns = document.createElement('script');
              _ns.setAttribute('data-glint-dyn', '1');
              _ns.textContent = _codes.join(';');
              document.body.appendChild(_ns);
            }
          }
        }

        // 3. Color scheme — only when changed
        const scheme = payload.colorScheme || 'dark';
        if (_pScheme !== scheme) {
          _pScheme = scheme;
          document.documentElement.style.colorScheme = scheme;
          document.body.style.background = scheme === 'dark' ? '#000' : '#fff';
        }

        syncFontLinks(payload.linkTags);

        // 4. Seek animations in the back buffer to the correct phase so they
        //    appear continuous despite the DOM rebuild.
        try {
          const elapsed = performance.now() - __t0;
          for (const a of document.getAnimations()) {
            const el = a.effect?.target;
            if (el && back.contains(el)) {
              a.currentTime = elapsed;
            }
          }
        } catch (_) {}

        // 5. Crossfade: reveal new content smoothly over old
        front.style.zIndex = '1';
        void back.offsetHeight;
        back.style.transition = 'opacity 80ms ease-out';
        back.style.opacity = '1';
        _active = _active === 'A' ? 'B' : 'A';
      };

      window.addEventListener('message', (e) => {
        if (e.data?.type === 'CONTENT_UPDATE') {
          pendingUpdate = e.data;
          if (!frameScheduled) {
            frameScheduled = true;
            requestAnimationFrame(() => {
              frameScheduled = false;
              if (pendingUpdate) {
                applyUpdate(pendingUpdate);
                pendingUpdate = null;
              }
            });
          }
        }
      });
      window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');
    <\/script>
  </head>
  <body style="background: #000; width: 100vw; height: 100vh; overflow: hidden; margin: 0;"><svg style="position:absolute;width:0;height:0"><defs><filter id="g-noise"><feTurbulence baseFrequency=".65" numOctaves="4" stitchTiles="stitch"/></filter></defs></svg></body>
</html>`;

export const Sandbox: React.FC<SandboxProps> = ({ htmlContent }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeReadyRef = useRef(false);
  const pendingContentRef = useRef<SandboxMessage | null>(null);

  const sendContentUpdate = (message: SandboxMessage) => {
    if (iframeReadyRef.current && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, '*');
    } else {
      pendingContentRef.current = message;
    }
  };

  useEffect(() => {
    if (!htmlContent) return;

    const message = extractSandboxMessage(htmlContent);
    if (!message) return;

    sendContentUpdate(message);

    if (iframeRef.current) {
      iframeRef.current.style.background = message.colorScheme === 'dark' ? '#000' : '#fff';
    }
  }, [htmlContent]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === 'SANDBOX_READY') {
        iframeReadyRef.current = true;
        if (pendingContentRef.current) {
          iframeRef.current?.contentWindow?.postMessage(pendingContentRef.current, '*');
          pendingContentRef.current = null;
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      style={{ width: '100vw', height: '100vh', border: 'none', display: 'block' }}
      srcDoc={SHELL_HTML}
      sandbox="allow-scripts"
    />
  );
};
