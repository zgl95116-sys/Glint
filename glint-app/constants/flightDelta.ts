/**
 * Scripted "AI changes its mind mid-stream" HTML for the flight-delay preset.
 * This is pushed into the sandbox ~5 seconds after the flight preset is
 * triggered, via App.tsx setHtmlContent. The existing double-buffer crossfade
 * handles the visual transition.
 */
export const FLIGHT_DELAY_DELTA_HTML = `<!doctype html><html><head><meta name="color-scheme" content="dark"><style>
@keyframes pulse-red{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes slide-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes scan{from{top:-5%}to{top:105%}}
</style></head>
<body style="margin:0;overflow:hidden;width:100vw;height:100vh;background:#1a0608;font-family:var(--font-mono,monospace);color:rgba(255,255,255,0.9)">
  <div style="position:absolute;inset:0;background:linear-gradient(rgba(255,60,40,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,60,40,0.04) 1px,transparent 1px);background-size:20% 20%"></div>
  <div style="position:absolute;left:0;right:0;height:2px;background:linear-gradient(to right,transparent,rgba(255,80,60,0.25),transparent);animation:scan 3s linear infinite"></div>
  <svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 390 844">
    <path d="M320,200 Q195,420 90,700" fill="none" stroke="rgba(255,80,60,0.55)" stroke-width="2" stroke-dasharray="8 6"/>
    <circle cx="320" cy="200" r="6" fill="rgba(255,80,60,0.95)"><animate attributeName="opacity" values="1;.4;1" dur="1.4s" repeatCount="indefinite"/></circle>
    <circle cx="90" cy="700" r="6" fill="rgba(255,180,50,0.9)"/>
  </svg>
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;padding:7% 6% 7%">
    <div style="display:inline-flex;align-items:center;gap:10px;background:rgba(255,60,40,0.18);border:1px solid rgba(255,80,60,0.4);border-radius:14px;padding:10px 18px;width:fit-content;animation:pulse-red 2s ease infinite">
      <div style="width:10px;height:10px;border-radius:50%;background:#ff3b30"></div>
      <span style="font-size:16px;color:rgba(255,200,190,0.95);font-weight:500;letter-spacing:1px">延误 55 分钟</span>
    </div>
    <div style="font-size:clamp(72px,26vw,150px);font-weight:200;color:rgba(255,255,255,0.95);letter-spacing:-4px;line-height:.85;margin-top:12px;animation:slide-up .8s ease both">CA1502</div>
    <div style="font-size:14px;color:rgba(255,180,150,0.65);letter-spacing:2px;margin-top:6px;animation:slide-up .8s ease .1s both">新登机口 B23 · 步行 12 分钟</div>
    <div style="font-size:24px;font-weight:300;color:rgba(255,240,230,0.9);line-height:1.55;margin-top:28px;animation:slide-up .9s ease .25s both">
      刚收到延误通知，<br>我重新算了一遍。
    </div>
    <div style="margin-top:auto;background:rgba(255,255,255,0.04);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-radius:16px;padding:18px 20px;border:1px solid rgba(255,100,80,0.15);flex-shrink:0;animation:slide-up 1s ease .4s both">
      <div style="font-size:14px;color:rgba(255,200,180,0.55);letter-spacing:1.5px;margin-bottom:8px">我知道你常飞北京-上海</div>
      <div style="font-size:16px;color:rgba(255,255,255,0.85);line-height:1.6">
        <div style="display:flex;justify-content:space-between"><span>🏨 全季酒店已延后入住</span><span style="color:rgba(255,255,255,0.4)">自动</span></div>
        <div style="display:flex;justify-content:space-between;margin-top:4px"><span>🚕 网约车 18:45 出发</span><span style="color:rgba(255,255,255,0.4)">已预约</span></div>
      </div>
    </div>
    <div style="text-align:center;margin-top:14px;flex-shrink:0;font-size:12px;color:rgba(255,100,80,0.3);letter-spacing:4px">GLINT · DELAY</div>
  </div>
</body></html>`;
