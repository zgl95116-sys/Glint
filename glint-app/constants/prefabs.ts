/**
 * 预生成锁屏 HTML — 用于 Canvas 交互 / 生成式动画等
 * flash-lite 无法实时生成的高复杂度场景。
 *
 * 格式：完整 <!doctype html>，与 Gemini 实时输出格式一致，
 * 直接交给 Sandbox 渲染。不要写固定 width/height，sandbox 自带全屏。
 */

// ─────────────────────────────────────────────
// 0. 开机首帧 — 电影感暗色锁屏（实时取时间）
// ─────────────────────────────────────────────
export const PREFAB_AMBIENT_BOOT = `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="color-scheme" content="dark">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{overflow:hidden;background:#080810;font-family:var(--font-display,-apple-system,"Helvetica Neue","PingFang SC",system-ui,sans-serif)}
@keyframes b1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(25px,-45px) scale(1.12)}66%{transform:translate(-18px,22px) scale(.92)}}
@keyframes b2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-35px,28px) scale(1.15)}66%{transform:translate(15px,-35px) scale(.9)}}
@keyframes b3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20px,15px) scale(1.08)}}
@keyframes rise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes breathe{0%,100%{opacity:.4}50%{opacity:.7}}
@keyframes sweep{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.bg{position:absolute;inset:0;overflow:hidden;filter:blur(80px);opacity:.7}
.b1{position:absolute;top:-10%;left:-5%;width:55vmin;height:55vmin;border-radius:50%;background:radial-gradient(circle,#c97832,#a04a2e 50%,transparent 70%);animation:b1 14s ease-in-out infinite}
.b2{position:absolute;top:25%;left:45%;width:50vmin;height:50vmin;border-radius:50%;background:radial-gradient(circle,#4a3a8a,#2a1a5a 50%,transparent 70%);animation:b2 18s ease-in-out infinite}
.b3{position:absolute;bottom:-5%;right:-10%;width:45vmin;height:45vmin;border-radius:50%;background:radial-gradient(circle,#1a4a6a,#0a2a4a 50%,transparent 70%);animation:b3 20s ease-in-out infinite}
.ring{position:absolute;top:12%;right:10%;width:clamp(60px,18vmin,100px);height:clamp(60px,18vmin,100px);border-radius:50%;border:1px solid rgba(255,255,255,.06);animation:sweep 40s linear infinite}
.ring::after{content:'';position:absolute;top:-2px;left:50%;width:4px;height:4px;border-radius:50%;background:rgba(255,200,150,.5)}
.dot{position:absolute;border-radius:50%;background:rgba(255,255,255,.15);animation:breathe 4s ease-in-out infinite}
.ct{position:absolute;inset:0;display:flex;flex-direction:column;padding:8% 8% 10%}
.time{font-size:clamp(100px,36vw,240px);font-weight:100;color:rgba(255,255,255,.88);line-height:.85;letter-spacing:-6px;text-shadow:0 4px 40px rgba(200,120,50,.12);animation:rise 1.2s ease both}
.day{font-size:15px;color:rgba(255,255,255,.35);letter-spacing:5px;margin-top:10px;animation:rise 1.2s ease .2s both}
.voice{font-size:clamp(20px,5vw,26px);font-weight:300;color:rgba(255,255,255,.75);line-height:1.6;margin-top:auto;animation:rise 1.2s ease .5s both;max-width:80%}
.card{background:rgba(255,255,255,.04);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:16px;padding:16px 18px;border:1px solid rgba(255,255,255,.08);margin-top:20px;flex-shrink:0;animation:rise 1.2s ease .7s both}
.card-row{display:flex;justify-content:space-between;font-size:15px;color:rgba(255,255,255,.7);line-height:1.7}
.card-dim{color:rgba(255,255,255,.3)}
.brand{text-align:center;margin-top:14px;font-size:11px;color:rgba(255,255,255,.1);letter-spacing:6px;animation:rise 1.2s ease .9s both}
.grain{position:absolute;inset:0;opacity:.025;pointer-events:none;filter:url(#gn)}
</style>
</head><body>
<svg style="position:absolute;width:0;height:0"><defs><filter id="gn"><feTurbulence baseFrequency=".65" numOctaves="4" stitchTiles="stitch"/></filter></defs></svg>
<div class="bg"><div class="b1"></div><div class="b2"></div><div class="b3"></div></div>
<div class="grain"></div>
<div class="ring"></div>
<div class="dot" style="top:20%;left:30%;width:2px;height:2px;animation-delay:0s"></div>
<div class="dot" style="top:35%;left:65%;width:1.5px;height:1.5px;animation-delay:1.5s"></div>
<div class="dot" style="top:55%;left:22%;width:1px;height:1px;animation-delay:3s"></div>
<div class="ct">
  <div class="time" id="t"></div>
  <div class="day" id="d"></div>
  <div class="voice" id="v"></div>
  <div class="card">
    <div class="card-row"><span id="c1"></span><span class="card-dim" id="c1r"></span></div>
    <div class="card-row" style="margin-top:2px"><span id="c2"></span><span class="card-dim" id="c2r"></span></div>
  </div>
  <div class="brand">GLINT · AMBIENT</div>
</div>
<script>
(function(){
  var now=new Date(),h=now.getHours(),m=String(now.getMinutes()).padStart(2,'0');
  var days=['周日','周一','周二','周三','周四','周五','周六'];
  var month=now.getMonth()+1,date=now.getDate();
  document.getElementById('t').textContent=h+':'+m;
  document.getElementById('d').textContent=month+'月'+date+'日 '+days[now.getDay()];
  var voices=[
    '夜还长，不着急。',
    '新的一天，从容开始。',
    '上午过半了，\\n一切都在轨道上。',
    '午后的光线变软了，\\n歇一口气。',
    '下午的时间，\\n慢慢用。',
    '日落前最好的光，\\n留给自己。',
    '晚上好，\\n今天辛苦了。',
    '夜晚是自己的，\\n不用赶。'
  ];
  var vi=h<5?0:h<9?1:h<12?2:h<14?3:h<17?4:h<19?5:h<22?6:7;
  document.getElementById('v').innerHTML=voices[vi].replace('\\\\n','<br>');
  var cards=[
    ['深夜的安静陪着你',''],
    ['☀ 今天天气晴 22°C','适合出门'],
    ['📅 下一个会 14:00','还有时间'],
    ['☕ 午后一杯咖啡','充充电'],
    ['📋 今日待办完成 3/7','继续'],
    ['🌅 日落 18:42','值得看'],
    ['📖 今天屏幕时间 4.2h','比昨天少'],
    ['🌙 闹钟 7:00','还能睡一会']
  ];
  document.getElementById('c1').textContent=cards[vi][0];
  document.getElementById('c1r').textContent=cards[vi][1];
  var c2i=(vi+3)%8;
  document.getElementById('c2').textContent=cards[c2i][0];
  document.getElementById('c2r').textContent=cards[c2i][1];
})();
</script>
</body></html>`;


// ─────────────────────────────────────────────
// 1. 戳泡泡解压
// ─────────────────────────────────────────────
export const PREFAB_BUBBLE_GAME = `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="color-scheme" content="dark">
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-user-select:none;user-select:none}
body{overflow:hidden;font-family:var(--font-display);background:#0a0a12;touch-action:none;cursor:pointer}
canvas{position:absolute;inset:0}
.ov{position:absolute;inset:0;display:flex;flex-direction:column;padding:12% 7% 6%;pointer-events:none;z-index:10}
.ct{font-size:min(28vw,120px);font-weight:100;color:rgba(255,255,255,0.9);line-height:.85;letter-spacing:-4px;text-shadow:0 0 60px rgba(120,200,255,0.15);transition:transform .15s ease}
.ct.pop{transform:scale(1.05)}
.lb{font-size:14px;color:rgba(255,255,255,0.4);letter-spacing:4px;margin-top:8px}
.mg{font-size:22px;font-weight:300;color:rgba(255,255,255,0.85);line-height:1.6;text-shadow:0 1px 8px rgba(0,0,0,0.5);transition:opacity .5s ease}
.ht{position:absolute;bottom:6%;left:0;right:0;text-align:center;font-size:13px;color:rgba(255,255,255,0.25);letter-spacing:3px;animation:fh 3s ease infinite}
@keyframes fh{0%,100%{opacity:.25}50%{opacity:.5}}
</style>
</head><body>
<canvas id="c"></canvas>
<div class="ov">
<div><div class="ct" id="count">0</div><div class="lb">BUBBLES POPPED</div></div>
<div style="flex:1"></div>
<div class="mg" id="msg">点任意泡泡。<br>每一颗，都是一个小烦恼。</div>
</div>
<div class="ht" id="hint">TAP A BUBBLE · 戳一下试试</div>
<script>
const C=document.getElementById('c'),X=C.getContext('2d');
const W=()=>window.innerWidth,H=()=>window.innerHeight;
function resize(){C.width=W();C.height=H()}
resize();window.addEventListener('resize',resize);
let bubs=[],parts=[],rips=[],pop=0;
const cE=document.getElementById('count'),mE=document.getElementById('msg'),hE=document.getElementById('hint');
const msgs=[
{at:0,t:'点任意泡泡。<br>每一颗，都是一个小烦恼。'},
{at:3,t:'对，就是这样。戳破它。'},
{at:8,t:'有些烦恼，戳一下就散了。'},
{at:15,t:'呼——<br>感觉好一点了吧？'},
{at:25,t:'世界清净了一些。'},
{at:40,t:'你已经戳了 40 个泡泡。<br>差不多可以放下手机了。'},
];
class Bub{
constructor(x,y,r){this.x=x??Math.random()*W();this.y=y??H()+Math.random()*100;this.r=r||(W()*0.04+Math.random()*W()*0.06);this.vy=-(0.3+Math.random()*0.5);this.vx=(Math.random()-0.5)*0.3;this.wb=Math.random()*Math.PI*2;this.ws=0.01+Math.random()*0.02;this.op=0;this.top=0.15+Math.random()*0.25;this.hue=180+Math.random()*80;this.alive=true}
update(){this.y+=this.vy;this.x+=this.vx+Math.sin(this.wb)*0.3;this.wb+=this.ws;if(this.op<this.top)this.op+=0.005;if(this.y<-this.r*2)this.alive=false}
draw(){X.beginPath();X.arc(this.x,this.y,this.r,0,Math.PI*2);const g=X.createRadialGradient(this.x-this.r*.3,this.y-this.r*.3,this.r*.1,this.x,this.y,this.r);g.addColorStop(0,'hsla('+this.hue+',80%,80%,'+this.op*.8+')');g.addColorStop(.5,'hsla('+this.hue+',60%,50%,'+this.op*.4+')');g.addColorStop(1,'hsla('+this.hue+',50%,40%,'+this.op*.1+')');X.fillStyle=g;X.fill();X.beginPath();X.arc(this.x-this.r*.25,this.y-this.r*.25,this.r*.2,0,Math.PI*2);X.fillStyle='rgba(255,255,255,'+this.op*.5+')';X.fill();X.beginPath();X.arc(this.x,this.y,this.r,0,Math.PI*2);X.strokeStyle='hsla('+this.hue+',60%,70%,'+this.op*.3+')';X.lineWidth=1;X.stroke()}
hit(px,py){const dx=px-this.x,dy=py-this.y;return dx*dx+dy*dy<(this.r+10)*(this.r+10)}
pop(chain){if(!this.alive)return;this.alive=false;const n=8+Math.floor(Math.random()*8);for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=1+Math.random()*3;parts.push({x:this.x,y:this.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:1.5+Math.random()*2.5,life:1,dc:.015+Math.random()*.02,hue:this.hue})}rips.push({x:this.x,y:this.y,r:this.r,mx:this.r*3,op:.4,hue:this.hue});if(!chain){const cr=this.r*1.2;let cd=false;for(const b of bubs){if(cd)break;if(b!==this&&b.alive){const dx=b.x-this.x,dy=b.y-this.y;if(Math.sqrt(dx*dx+dy*dy)<cr+b.r){cd=true;const t=b;setTimeout(()=>{if(t.alive){t.pop(true);pop++;uc()}},120+Math.random()*150)}}}}}
}
function uc(){cE.textContent=pop;cE.classList.add('pop');setTimeout(()=>cE.classList.remove('pop'),150);for(let i=msgs.length-1;i>=0;i--)if(pop>=msgs[i].at){mE.innerHTML=msgs[i].t;break}if(pop>3)hE.style.display='none'}
function spawn(){if(bubs.length<25)bubs.push(new Bub())}
setInterval(spawn,500);
for(let i=0;i<10;i++)bubs.push(new Bub(Math.random()*W(),H()*.25+Math.random()*H()*.55));
C.addEventListener('pointerdown',e=>{e.preventDefault();const rect=C.getBoundingClientRect();const sx=C.width/rect.width,sy=C.height/rect.height;const px=(e.clientX-rect.left)*sx,py=(e.clientY-rect.top)*sy;for(const b of bubs){if(b.alive&&b.hit(px,py)){b.pop(false);pop++;uc();break}}});
function loop(){X.clearRect(0,0,C.width,C.height);const bg=X.createLinearGradient(0,0,0,C.height);bg.addColorStop(0,'#0a0a14');bg.addColorStop(1,'#0e0a18');X.fillStyle=bg;X.fillRect(0,0,C.width,C.height);rips=rips.filter(r=>{r.r+=(r.mx-r.r)*.08;r.op*=.92;X.beginPath();X.arc(r.x,r.y,r.r,0,Math.PI*2);X.strokeStyle='hsla('+r.hue+',60%,70%,'+r.op+')';X.lineWidth=2;X.stroke();return r.op>.01});bubs=bubs.filter(b=>{if(!b.alive)return false;b.update();b.draw();return b.alive});parts=parts.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.03;p.vx*=.99;p.life=Math.max(0,p.life-p.dc);X.beginPath();X.arc(p.x,p.y,Math.max(0,p.r*p.life),0,Math.PI*2);X.fillStyle='hsla('+p.hue+',70%,70%,'+p.life*.6+')';X.fill();return p.life>0});requestAnimationFrame(loop)}
loop();
</script>
</body></html>`;

// ─────────────────────────────────────────────
// 2. 呼吸生物
// ─────────────────────────────────────────────
export const PREFAB_BREATHING = `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="color-scheme" content="dark">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{overflow:hidden;font-family:var(--font-serif);background:#060610;display:flex;align-items:center;justify-content:center}
canvas{position:absolute;inset:0;z-index:1}
.tl{position:absolute;inset:0;z-index:10;pointer-events:none;display:flex;flex-direction:column;padding:12% 8% 6%}
.ph{font-size:32px;font-weight:200;color:rgba(255,255,255,0.9);letter-spacing:8px;text-align:center;text-shadow:0 0 30px rgba(120,180,255,0.2);transition:opacity 1s ease}
.gd{font-size:16px;color:rgba(200,220,255,0.5);text-align:center;margin-top:8px;letter-spacing:2px;transition:opacity 1s ease}
.bt{font-size:20px;font-weight:200;color:rgba(255,255,255,0.75);text-align:center;line-height:1.8;text-shadow:0 1px 10px rgba(0,0,0,0.5)}
.ft{font-size:11px;color:rgba(150,180,220,0.15);letter-spacing:6px;text-align:center;margin-top:16px}
</style>
</head><body>
<canvas id="c"></canvas>
<div class="tl">
<div style="margin-top:10%"><div class="ph" id="phase">吸</div><div class="gd" id="guide">跟着它呼吸</div></div>
<div style="flex:1"></div>
<div><div class="bt">你不需要做任何事。<br>只需要呼吸。</div><div class="ft">GLINT · BREATHE</div></div>
</div>
<script>
const C=document.getElementById('c'),X=C.getContext('2d');
function resize(){C.width=window.innerWidth;C.height=window.innerHeight}
resize();window.addEventListener('resize',resize);
const pE=document.getElementById('phase'),gE=document.getElementById('guide');
const CY=14000,INH=4000,H1=2000,EXH=6000;
let t=0,lt=0;
function bp(t){const c=t%CY;if(c<INH)return{p:c/INH,l:'吸',g:'慢慢吸气 4 秒'};if(c<INH+H1)return{p:1,l:'屏',g:'屏住 2 秒'};if(c<INH+H1+EXH)return{p:1-(c-INH-H1)/EXH,l:'呼',g:'缓缓呼出 6 秒'};return{p:0,l:'静',g:'放空 2 秒'}}
function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
let fps=[];for(let i=0;i<50;i++)fps.push({a:Math.random()*Math.PI*2,d:100+Math.random()*180,s:.0003+Math.random()*.001,sz:1+Math.random()*2.5,ph:Math.random()*Math.PI*2,bs:.001+Math.random()*.002});
function draw(ts){if(!lt)lt=ts;t+=ts-lt;lt=ts;const w=C.width,h=C.height;X.clearRect(0,0,w,h);const bg=X.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.max(w,h)*.6);bg.addColorStop(0,'#0c0c1a');bg.addColorStop(1,'#050508');X.fillStyle=bg;X.fillRect(0,0,w,h);
const b=bp(t),br=ease(b.p),cx=w/2,cy=h*.47;pE.textContent=b.l;gE.textContent=b.g;
const glR=80+br*120,gl=X.createRadialGradient(cx,cy,0,cx,cy,glR*1.5);gl.addColorStop(0,'hsla('+(200+br*30)+','+(50+br*20)+'%,'+(30+br*25)+'%,0.08)');gl.addColorStop(1,'transparent');X.fillStyle=gl;X.fillRect(0,0,w,h);
[[50+br*70,8+br*12,6,.15,40],[40+br*55,6+br*10,7,.3,20],[25+br*40,4+br*6,8,.6,8]].forEach(([rb,amp,loops,a,blur])=>{X.save();X.filter='blur('+blur+'px)';X.beginPath();for(let i=0;i<=120;i++){const an=i/120*Math.PI*2,wb=Math.sin(an*loops+t*.001)*amp+Math.cos(an*(loops-2)+t*.0007)*amp*.5,r=rb+wb;const px=cx+Math.cos(an)*r,py=cy+Math.sin(an)*r;i===0?X.moveTo(px,py):X.lineTo(px,py)}X.closePath();X.fillStyle='hsla('+(210+br*30)+','+(40+br*20)+'%,'+(20+br*15)+'%,'+a+')';X.fill();X.restore()});
const cr=15+br*25,cg=X.createRadialGradient(cx,cy,0,cx,cy,cr);cg.addColorStop(0,'rgba(255,255,255,'+(0.15+br*.15)+')');cg.addColorStop(1,'transparent');X.fillStyle=cg;X.beginPath();X.arc(cx,cy,cr,0,Math.PI*2);X.fill();
for(const p of fps){p.a+=p.s;const bob=Math.sin(t*p.bs+p.ph)*15,d=p.d*(.8+br*.4)+bob,px=cx+Math.cos(p.a)*d,py=cy+Math.sin(p.a)*d,al=Math.max(0,.2+br*.3+Math.sin(t*.002+p.ph)*.1);X.beginPath();X.arc(px,py,p.sz,0,Math.PI*2);X.fillStyle='hsla('+(180+br*50)+',70%,70%,'+al+')';X.fill()}
for(let i=0;i<3;i++){const rp=(t*.0005+i*.33)%1,rr=(60+br*80)*(.5+rp),ra=(1-rp)*.08;X.beginPath();X.arc(cx,cy,rr,0,Math.PI*2);X.strokeStyle='rgba(150,200,255,'+ra+')';X.lineWidth=1;X.stroke()}
requestAnimationFrame(draw)}
requestAnimationFrame(draw);
</script>
</body></html>`;

// ─────────────────────────────────────────────
// 3. 禅意枯山水（生成式）
// ─────────────────────────────────────────────
export const PREFAB_ZEN_GARDEN = `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="color-scheme" content="dark">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{overflow:hidden;font-family:var(--font-display);background:#0c0b10}
canvas{position:absolute;inset:0;z-index:1}
.ft{position:absolute;bottom:5%;left:0;right:0;text-align:center;font-size:11px;color:rgba(200,180,140,0.15);letter-spacing:6px;z-index:10;pointer-events:none}
</style>
</head><body>
<canvas id="c"></canvas>
<div class="ft">GLINT · GENERATIVE</div>
<script>
const C=document.getElementById('c'),X=C.getContext('2d');
function resize(){C.width=window.innerWidth;C.height=window.innerHeight}
resize();window.addEventListener('resize',resize);
let t=0,stones=[];
class Stone{
constructor(){const w=C.width,h=C.height;this.x=w*.15+Math.random()*w*.7;this.y=h*.12+Math.random()*h*.76;this.type=Math.floor(Math.random()*4);this.sz=w*.05+Math.random()*w*.1;this.rot=Math.random()*Math.PI*2;this.rs=(Math.random()-.5)*.002;this.ph=Math.random()*Math.PI*2;this.hue=30+Math.random()*30;this.sat=10+Math.random()*20;this.birth=t;this.life=15000+Math.random()*20000;this.op=0}
get age(){return t-this.birth}get alive(){return this.age<this.life}
get alpha(){return Math.min(1,this.age/2000)*Math.max(0,1-(this.age-this.life+2000)/2000)*.6}
}
for(let i=0;i<8;i++){const s=new Stone();s.birth=-Math.random()*10000;stones.push(s)}
function drawRipples(s){const a=s.alpha;if(a<=0)return;const rings=3+Math.floor(s.sz/20);for(let i=1;i<=rings;i++){const r=s.sz+i*12+Math.sin(t*.0005+i)*3,sa=s.rot+Math.sin(t*.0003+s.ph)*.3,arc=Math.PI*(.6+Math.sin(t*.0004+i*.5)*.3);X.beginPath();X.arc(s.x,s.y,r,sa,sa+arc);X.strokeStyle='hsla('+s.hue+','+s.sat+'%,60%,'+a*.12*(1-i/rings)+')';X.lineWidth=1;X.stroke()}}
function drawStone(s){const a=s.alpha;if(a<=0)return;X.save();X.translate(s.x,s.y);X.rotate(s.rot+t*s.rs);
switch(s.type){case 0:const gap=.4+Math.sin(t*.0003+s.ph)*.15;X.beginPath();X.arc(0,0,s.sz,gap,Math.PI*2-gap);X.strokeStyle='hsla('+s.hue+','+s.sat+'%,70%,'+a*.4+')';X.lineWidth=2+s.sz*.05;X.lineCap='round';X.stroke();X.beginPath();X.arc(0,0,3,0,Math.PI*2);X.fillStyle='hsla('+s.hue+','+s.sat+'%,80%,'+a*.3+')';X.fill();break;
case 1:const h=s.sz*1.2,w=s.sz;X.beginPath();X.moveTo(0,-h/2);X.lineTo(w/2,h/2);X.lineTo(-w/2,h/2);X.closePath();X.fillStyle='hsla('+s.hue+','+(s.sat-5)+'%,30%,'+a*.2+')';X.fill();X.strokeStyle='hsla('+s.hue+','+s.sat+'%,65%,'+a*.3+')';X.lineWidth=1;X.stroke();break;
case 2:X.beginPath();for(let i=-3;i<=3;i++){const wx=i*s.sz*.4,wy=Math.sin(i*.8+t*.002+s.ph)*s.sz*.25;i===-3?X.moveTo(wx,wy):X.lineTo(wx,wy)}X.strokeStyle='hsla('+s.hue+','+s.sat+'%,65%,'+a*.35+')';X.lineWidth=2;X.lineCap='round';X.stroke();break;
case 3:const dots=5+Math.floor(s.sz/10);for(let i=0;i<dots;i++){const da=i/dots*Math.PI*2+t*.0003,dr=s.sz*.3*(.5+Math.sin(t*.001+i)*.5),dx=Math.cos(da)*dr,dy=Math.sin(da)*dr;X.beginPath();X.arc(dx,dy,1.5+Math.sin(t*.002+i)*.5,0,Math.PI*2);X.fillStyle='hsla('+s.hue+','+s.sat+'%,75%,'+a*.4+')';X.fill();if(i>0){const pa=(i-1)/dots*Math.PI*2+t*.0003,pr=s.sz*.3*(.5+Math.sin(t*.001+(i-1))*.5);X.beginPath();X.moveTo(Math.cos(pa)*pr,Math.sin(pa)*pr);X.lineTo(dx,dy);X.strokeStyle='hsla('+s.hue+','+s.sat+'%,60%,'+a*.08+')';X.lineWidth=.5;X.stroke()}}break}
X.restore();drawRipples(s)}
function drawRake(){const w=C.width,h=C.height,lc=Math.floor(h/14);for(let i=0;i<lc;i++){const y=14*i+Math.sin(t*.0002+i*.3)*4;if(y<0||y>h)continue;X.beginPath();for(let x=0;x<w;x+=3){let d=0;for(const s of stones){if(s.alpha<=0)continue;const dx=x-s.x,dy=y-s.y,dist=Math.sqrt(dx*dx+dy*dy),inf=s.sz*1.5;if(dist<inf)d+=(1-dist/inf)*20*(dy>0?1:-1)}const fy=y+d+Math.sin(x*.02+t*.0003)*1.5;x===0?X.moveTo(x,fy):X.lineTo(x,fy)}X.strokeStyle='rgba(200,180,140,'+(0.04+Math.sin(i*.5)*.01)+')';X.lineWidth=.5;X.stroke()}}
function loop(ts){t=ts||0;const w=C.width,h=C.height;const g=X.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.max(w,h)*.6);g.addColorStop(0,'#12110a');g.addColorStop(1,'#0a0908');X.fillStyle=g;X.fillRect(0,0,w,h);drawRake();stones=stones.filter(s=>s.alive);if(stones.length<10&&Math.random()<.02)stones.push(new Stone());for(const s of stones)drawStone(s);requestAnimationFrame(loop)}
requestAnimationFrame(loop);
</script>
</body></html>`;

// ─────────────────────────────────────────────
// 4. 数据河流（纯 HTML/SVG — 这个 Gemini 能生成，
//    但预置一个高质量版本作为保底 / 示范）
// ─────────────────────────────────────────────
export const PREFAB_DATA_RIVER = `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="color-scheme" content="light">
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@100;300;400;700;900&family=Noto+Serif+SC:wght@200;400&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{overflow:hidden;font-family:'Noto Sans SC',var(--font-display);background:#faf7f0}
.bg{position:absolute;inset:0;background:linear-gradient(180deg,#faf7f0 0%,#f5f0e5 40%,#f0ebe0 100%)}
.ct{position:absolute;inset:0;display:flex;flex-direction:column;padding:6% 7% 5%;z-index:10}
@keyframes fi{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
@keyframes ng{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
@keyframes ld{from{stroke-dashoffset:600}to{stroke-dashoffset:0}}
</style>
</head><body>
<div class="bg"></div>
<svg style="position:absolute;inset:0;width:100%;height:100%;z-index:2" viewBox="0 0 390 844">
<path d="M75,40 C75,120 75,130 78,180 S82,260 75,320 S68,400 75,460 S85,540 75,600 S65,680 75,740 S75,800 75,840" fill="none" stroke="rgba(180,150,100,0.2)" stroke-width="2" stroke-dasharray="600" style="animation:ld 3s ease forwards"/>
<circle cx="75" cy="120" r="0" fill="#e85d3a"><animate attributeName="r" from="0" to="5" dur="0.5s" begin="0.8s" fill="freeze"/></circle>
<circle cx="78" cy="260" r="0" fill="#4a90d9"><animate attributeName="r" from="0" to="5" dur="0.5s" begin="1.2s" fill="freeze"/></circle>
<circle cx="75" cy="400" r="0" fill="#2ecc71"><animate attributeName="r" from="0" to="4" dur="0.5s" begin="1.6s" fill="freeze"/></circle>
<circle cx="72" cy="540" r="0" fill="#f39c12"><animate attributeName="r" from="0" to="6" dur="0.5s" begin="2.0s" fill="freeze"/></circle>
<circle cx="75" cy="680" r="0" fill="#9b59b6"><animate attributeName="r" from="0" to="4" dur="0.5s" begin="2.4s" fill="freeze"/></circle>
<circle cx="72" cy="540" r="6" fill="none" stroke="rgba(243,156,18,0.3)" stroke-width="1"><animate attributeName="r" values="6;20;6" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite"/></circle>
</svg>
<div class="ct">
<div style="animation:ng 1s ease .5s both"><div style="font-size:min(40vw,160px);font-weight:900;color:rgba(40,35,25,0.88);line-height:.8;letter-spacing:-8px">4<span style="font-size:min(15vw,60px);font-weight:300;color:rgba(180,150,100,0.6);vertical-align:super;letter-spacing:0">/6</span></div><div style="font-size:15px;color:rgba(120,100,70,0.5);letter-spacing:3px;margin-top:8px;margin-left:4px">今天的事做完四件了</div></div>
<div style="margin-top:5%;padding-left:46px">
<div style="animation:fi .6s ease 1s both;margin-bottom:22px;opacity:.5"><div style="font-size:13px;color:rgba(180,150,100,0.6);letter-spacing:1px">09:30</div><div style="font-size:17px;color:rgba(40,35,25,0.5);text-decoration:line-through;text-decoration-color:rgba(180,150,100,0.3)">产品方案评审</div></div>
<div style="animation:fi .6s ease 1.3s both;margin-bottom:22px;opacity:.5"><div style="font-size:13px;color:rgba(180,150,100,0.6);letter-spacing:1px">11:00</div><div style="font-size:17px;color:rgba(40,35,25,0.5);text-decoration:line-through;text-decoration-color:rgba(180,150,100,0.3)">给运营回数据需求</div></div>
<div style="animation:fi .6s ease 1.6s both;margin-bottom:22px;opacity:.5"><div style="font-size:13px;color:rgba(180,150,100,0.6);letter-spacing:1px">12:30</div><div style="font-size:17px;color:rgba(40,35,25,0.5);text-decoration:line-through;text-decoration-color:rgba(180,150,100,0.3)">取快递 · 丰巢 #218</div></div>
<div style="animation:fi .6s ease 2s both;margin-bottom:22px;padding:14px 16px;background:rgba(243,156,18,0.08);border-left:3px solid rgba(243,156,18,0.6);border-radius:0 12px 12px 0;margin-left:-16px;padding-left:32px"><div style="font-size:13px;color:rgba(243,156,18,0.7);letter-spacing:1px;font-weight:500">15:00 · 进行中</div><div style="font-size:19px;color:rgba(40,35,25,0.88);font-weight:500">写周报</div><div style="font-size:14px;color:rgba(120,100,70,0.5);margin-top:4px">已经在做了，别切出去</div></div>
<div style="animation:fi .6s ease 2.3s both;margin-bottom:22px"><div style="font-size:13px;color:rgba(180,150,100,0.5);letter-spacing:1px">17:30</div><div style="font-size:17px;color:rgba(40,35,25,0.65)">和设计对 UI 稿</div></div>
<div style="animation:fi .6s ease 2.6s both;margin-bottom:22px"><div style="font-size:13px;color:rgba(180,150,100,0.5);letter-spacing:1px">19:00</div><div style="font-size:17px;color:rgba(40,35,25,0.65)">健身 · 推日</div></div>
</div>
<div style="flex:1"></div>
<div style="animation:fi .8s ease 3s both"><div style="font-family:'Noto Serif SC',serif;font-size:22px;font-weight:200;color:rgba(40,35,25,0.75);line-height:1.7;text-shadow:0 1px 4px rgba(255,255,255,0.5)">三分之二了。<br>按这个节奏，六点前能收工。</div></div>
<div style="text-align:right;margin-top:16px;animation:fi .6s ease 3.3s both"><span style="font-size:11px;color:rgba(180,150,100,0.2);letter-spacing:6px">GLINT · FLOW</span></div>
</div>
</body></html>`;

// ─────────────────────────────────────────────
// 5. 杂志封面（纯排版即视觉）
// ─────────────────────────────────────────────
export const PREFAB_EDITORIAL = `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="color-scheme" content="light">
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@100;300;400;700;900&family=Noto+Serif+SC:wght@200;400;600;900&family=Playfair+Display:ital,wght@0,400;0,900;1,400&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{overflow:hidden;background:#f5f0e8}
.pg{position:absolute;inset:0;display:flex;flex-direction:column;padding:5% 6% 4%}
@keyframes su{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes sr{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
@keyframes wi{from{transform:scaleX(0)}to{transform:scaleX(1)}}
</style>
</head><body>
<div style="position:absolute;top:-100px;right:-60px;width:250px;height:500px;background:linear-gradient(160deg,rgba(200,60,30,0.06),rgba(200,60,30,0.12));transform:rotate(-15deg);border-radius:60px"></div>
<div style="position:absolute;top:0;left:6%;width:4px;height:100%;background:linear-gradient(to bottom,transparent,#c83c1e 10%,#c83c1e 90%,transparent);opacity:.15"></div>
<div class="pg">
<div style="display:flex;justify-content:space-between;align-items:center;animation:su .6s ease .2s both"><div style="font-family:'Playfair Display',serif;font-size:13px;color:rgba(40,30,20,0.35);letter-spacing:4px;font-style:italic">GLINT DAILY</div><div style="font-size:12px;color:rgba(40,30,20,0.3);letter-spacing:2px">四月九日 · 周三</div></div>
<div style="height:1px;background:rgba(40,30,20,0.1);margin:12px 0;animation:wi .8s ease .4s both;transform-origin:left"></div>
<div style="animation:su .8s ease .5s both"><div style="font-family:'Noto Serif SC',serif;font-size:min(13vw,52px);font-weight:900;color:rgba(30,25,15,0.92);line-height:1.15;letter-spacing:-1px">你今天<br>走了<span style="font-family:'Playfair Display',serif;font-size:min(18vw,72px);color:#c83c1e;font-weight:900;font-style:italic;letter-spacing:-3px">12,847</span>步</div></div>
<div style="height:1px;background:rgba(40,30,20,0.1);margin:16px 0;animation:wi .8s ease .8s both;transform-origin:left"></div>
<div style="animation:su .7s ease 1s both"><div style="font-family:'Noto Serif SC',serif;font-size:18px;font-weight:200;color:rgba(60,50,35,0.65);line-height:1.6;font-style:italic;border-left:3px solid #c83c1e;padding-left:16px;margin-left:-2px">"比昨天多了 3,200 步。<br>你可能没注意到，<br>但你的身体注意到了。"</div></div>
<div style="display:flex;gap:16px;margin-top:20px;animation:su .7s ease 1.3s both">
<div style="flex:1;border-right:1px solid rgba(40,30,20,0.06);padding-right:14px"><div style="font-family:'Playfair Display',serif;font-size:min(11vw,44px);font-weight:900;color:rgba(30,25,15,0.85);line-height:1">467</div><div style="font-size:12px;color:rgba(100,85,60,0.5);letter-spacing:2px;margin-top:4px">千卡消耗</div><div style="width:100%;height:4px;background:rgba(40,30,20,0.04);border-radius:2px;margin-top:6px"><div style="width:72%;height:100%;background:linear-gradient(90deg,#c83c1e,rgba(200,60,30,0.4));border-radius:2px"></div></div><div style="font-size:11px;color:rgba(100,85,60,0.4);margin-top:4px">目标 650 · 72%</div></div>
<div style="flex:1;border-right:1px solid rgba(40,30,20,0.06);padding-right:14px"><div style="font-family:'Playfair Display',serif;font-size:min(11vw,44px);font-weight:900;color:rgba(30,25,15,0.85);line-height:1">6.2</div><div style="font-size:12px;color:rgba(100,85,60,0.5);letter-spacing:2px;margin-top:4px">小时站立</div><div style="width:100%;height:4px;background:rgba(40,30,20,0.04);border-radius:2px;margin-top:6px"><div style="width:89%;height:100%;background:linear-gradient(90deg,#2e7d32,rgba(46,125,50,0.4));border-radius:2px"></div></div><div style="font-size:11px;color:rgba(100,85,60,0.4);margin-top:4px">目标 7h · 89%</div></div>
<div style="flex:1"><div style="font-family:'Playfair Display',serif;font-size:min(11vw,44px);font-weight:900;color:rgba(30,25,15,0.85);line-height:1">82</div><div style="font-size:12px;color:rgba(100,85,60,0.5);letter-spacing:2px;margin-top:4px">心率均值</div><div style="width:100%;height:4px;background:rgba(40,30,20,0.04);border-radius:2px;margin-top:6px"><div style="width:60%;height:100%;background:linear-gradient(90deg,#1565c0,rgba(21,101,192,0.4));border-radius:2px"></div></div><div style="font-size:11px;color:rgba(100,85,60,0.4);margin-top:4px">静息区间 · 正常</div></div>
</div>
<div style="height:1px;background:rgba(40,30,20,0.08);margin:18px 0;animation:wi .6s ease 1.6s both;transform-origin:left"></div>
<div style="animation:sr .8s ease 1.8s both"><div style="font-size:11px;color:rgba(100,85,60,0.4);letter-spacing:2px;margin-bottom:8px">本周步数</div>
<svg viewBox="0 0 342 50" style="width:100%;height:50px"><rect x="0" y="30" width="42" height="20" rx="3" fill="rgba(40,30,20,0.06)"/><rect x="50" y="22" width="42" height="28" rx="3" fill="rgba(40,30,20,0.06)"/><rect x="100" y="15" width="42" height="35" rx="3" fill="rgba(40,30,20,0.06)"/><rect x="150" y="25" width="42" height="25" rx="3" fill="rgba(40,30,20,0.06)"/><rect x="200" y="18" width="42" height="32" rx="3" fill="rgba(40,30,20,0.06)"/><rect x="250" y="28" width="42" height="22" rx="3" fill="rgba(40,30,20,0.06)"/><rect x="300" y="5" width="42" height="45" rx="3" fill="rgba(200,60,30,0.2)"/><text x="21" y="48" text-anchor="middle" font-size="9" fill="rgba(100,85,60,0.3)">一</text><text x="71" y="48" text-anchor="middle" font-size="9" fill="rgba(100,85,60,0.3)">二</text><text x="121" y="48" text-anchor="middle" font-size="9" fill="rgba(100,85,60,0.3)">三</text><text x="171" y="48" text-anchor="middle" font-size="9" fill="rgba(100,85,60,0.3)">四</text><text x="221" y="48" text-anchor="middle" font-size="9" fill="rgba(100,85,60,0.3)">五</text><text x="271" y="48" text-anchor="middle" font-size="9" fill="rgba(100,85,60,0.3)">六</text><text x="321" y="48" text-anchor="middle" font-size="9" fill="rgba(200,60,30,0.6)" font-weight="bold">今</text></svg></div>
<div style="flex:1"></div>
<div style="animation:su .6s ease 2.2s both"><div style="display:flex;justify-content:space-between;align-items:flex-end"><div><div style="font-family:'Noto Serif SC',serif;font-size:16px;color:rgba(60,50,35,0.55);line-height:1.6">今天状态不错。<br>晚上轻松一下就好。</div></div><div style="text-align:right"><div style="font-family:'Playfair Display',serif;font-size:36px;font-weight:900;color:rgba(30,25,15,0.15);line-height:.9;letter-spacing:-2px">22°</div><div style="font-size:11px;color:rgba(100,85,60,0.3);margin-top:2px">多云</div></div></div></div>
<div style="height:1px;background:rgba(40,30,20,0.06);margin-top:12px;animation:wi .5s ease 2.5s both;transform-origin:right"></div>
<div style="text-align:center;margin-top:8px;animation:su .5s ease 2.6s both"><span style="font-family:'Playfair Display',serif;font-size:10px;color:rgba(40,30,20,0.15);letter-spacing:6px;font-style:italic">VOL. 99 · GLINT EDITORIAL</span></div>
</div>
</body></html>`;
