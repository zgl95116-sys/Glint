import React, { useRef, useEffect } from 'react';

interface SandboxProps {
  htmlContent: string;
}

const SHELL_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; script-src 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: blob:; connect-src https://cdn.tailwindcss.com; frame-src 'none';">
    <script src="https://cdn.tailwindcss.com"><\/script>
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
    <style>
      html, body { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; }
      body { -webkit-font-smoothing: antialiased; }
      .material-symbols-outlined,
      .material-icons {
        font-family: 'Material Symbols Outlined';
        font-weight: normal;
        font-style: normal;
        font-size: 24px;
        line-height: 1;
        display: inline-block;
        white-space: nowrap;
        direction: ltr;
        -webkit-font-smoothing: antialiased;
        font-feature-settings: 'liga';
      }
    </style>
    <script>
      window.addEventListener('message', (e) => {
        if (e.data?.type === 'CONTENT_UPDATE') {
          document.body.innerHTML = e.data.html;
          document.body.className = e.data.bodyClasses || '';
          document.body.setAttribute('style', e.data.bodyStyle || '');
          document.documentElement.style.colorScheme = e.data.colorScheme || 'dark';
          document.head.querySelectorAll('link[data-glint-font]').forEach(el => el.remove());
          (e.data.linkTags || []).forEach(href => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.setAttribute('data-glint-font', 'true');
            document.head.appendChild(link);
          });
        }
      });
      window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');
    <\/script>
  </head>
  <body style="background: #000; width: 100vw; height: 100vh; overflow: hidden; margin: 0;"></body>
</html>`;

export const Sandbox: React.FC<SandboxProps> = ({ htmlContent }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeReadyRef = useRef(false);
  const pendingContentRef = useRef<any>(null);

  const sendContentUpdate = (message: any) => {
    if (iframeReadyRef.current && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, '*');
    } else {
      pendingContentRef.current = message;
    }
  };

  useEffect(() => {
    if (!htmlContent) return;

    const isDark = /<meta\s+name=["']color-scheme["']\s+content=["']dark["']/i.test(htmlContent);

    const headMatch = htmlContent.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const fontHrefs: string[] = [];
    if (headMatch) {
      const linkMatches = headMatch[1].match(/<link[^>]*>/gi);
      if (linkMatches) {
        linkMatches.forEach(tag => {
          const hrefMatch = tag.match(/href="([^"]+)"/i) || tag.match(/href='([^']+)'/i);
          if (hrefMatch && hrefMatch[1].startsWith('https://fonts.googleapis.com/')) {
            fontHrefs.push(hrefMatch[1]);
          }
        });
      }
    }

    const bodyClassMatch = htmlContent.match(/<body[^>]*class="([^"]*)"/i);
    const bodyClasses = bodyClassMatch ? bodyClassMatch[1] : '';
    const bodyStyleMatch = htmlContent.match(/<body[^>]*style="([^"]*)"/i);
    const bodyInlineStyle = bodyStyleMatch ? bodyStyleMatch[1] : '';

    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const cleanContent = bodyMatch
      ? bodyMatch[1]
      : htmlContent.replace(/<\/?html[^>]*>/gi, '').replace(/<head>[\s\S]*?<\/head>/gi, '').replace(/<\/?body[^>]*>/gi, '');

    sendContentUpdate({
      type: 'CONTENT_UPDATE',
      html: cleanContent,
      bodyClasses,
      bodyStyle: `width:100vw;height:100vh;overflow:hidden;margin:0;padding:0;background:${isDark ? '#000' : '#fff'};color:${isDark ? '#e8eaed' : '#1a1a1a'};${bodyInlineStyle}`,
      colorScheme: isDark ? 'dark' : 'light',
      linkTags: fontHrefs,
    });

    if (iframeRef.current) {
      iframeRef.current.style.background = isDark ? '#000' : '#fff';
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
